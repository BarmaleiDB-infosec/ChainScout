require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 4000;
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '1mb';
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:8080,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const apiRequireAuth = process.env.API_REQUIRE_AUTH !== 'false';
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 30);
const requestBuckets = new Map();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) { callback(null, true); return; }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: false, limit: requestBodyLimit }));

function scanLimiter(req, res, next) {
  const now = Date.now();
  const key = req.user?.id || req.ip || 'anonymous';
  const bucket = requestBuckets.get(key);
  if (!bucket || now - bucket.startedAt > rateLimitWindowMs) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
    next();
    return;
  }
  if (bucket.count >= rateLimitMax) {
    res.setHeader('Retry-After', String(Math.ceil((rateLimitWindowMs - (now - bucket.startedAt)) / 1000)));
    res.status(429).json({ ok: false, error: 'Too many requests' });
    return;
  }
  bucket.count += 1;
  requestBuckets.set(key, bucket);
  next();
}

function uploadFileFilter(req, file, cb) {
  if (!/\.(sol|zip|json|txt)$/i.test(file.originalname || '')) {
    cb(new Error('Only .sol, .zip, .json and .txt files supported'));
    return;
  }
  cb(null, true);
}

const upload = multer({
  dest: uploadsDir,
  fileFilter: uploadFileFilter,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024), files: 1 },
});

async function requireAuth(req, res, next) {
  if (!apiRequireAuth) { req.user = null; next(); return; }
  if (!supabaseAdmin) { return res.status(500).json({ ok: false, error: 'Supabase auth not configured on server' }); }
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) { return res.status(401).json({ ok: false, error: 'Bearer token required' }); }
  try {
    const token = authHeader.slice('Bearer '.length).trim();
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) { return res.status(401).json({ ok: false, error: 'Invalid user session' }); }
    req.user = { id: data.user.id, email: data.user.email || null };
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Failed to verify user session' });
  }
}

app.get('/health', (req, res) => { res.json({ status: 'ok', service: 'chainscout-api' }); });

const { runAnalysis, classifySource, normalizeLevel, normalizeTargetType } = require('./analyzer');
const { createScanJob, updateScanJob, getScanJob, listRecentScans, toPublicScan } = require('./scan-store');
const { analyzeSolanaProgram } = require('./security-engine');

function validateScanRequest(body, file) {
  const targetType = normalizeTargetType(body.targetType);
  const level = normalizeLevel(body.level);
  const targetUrl = typeof body.targetUrl === 'string' ? body.targetUrl.trim() : '';
  if (!file && !targetUrl) { return { error: 'Provide a link or upload a file/archive' }; }
  return { targetType, level, targetUrl, sourceKind: classifySource({ targetType, targetUrl, uploadedFilePath: file?.path }) };
}

async function processScan(jobId) {
  const job = getScanJob(jobId);
  if (!job) return;
  updateScanJob(jobId, { status: 'running', progress: 15 });
  try {
    const report = await runAnalysis(job.payload);
    await supabaseAdmin.from('scans').upsert({
      id: jobId,
      user_id: job.payload.userId,
      target_type: job.payload.targetType,
      target_url: job.payload.targetUrl,
      status: 'completed',
      risk_score: report?.summary?.riskScore || 0,
      vulnerabilities: report?.findings || [],
      report: report || {},
      updated_at: new Date().toISOString(),
    });
    updateScanJob(jobId, { status: 'completed', progress: 100, report, error: null });
  } catch (error) {
    await supabaseAdmin.from('scans').upsert({
      id: jobId,
      user_id: job.payload.userId,
      target_type: job.payload.targetType,
      target_url: job.payload.targetUrl,
      status: 'failed',
      error_message: error?.message || 'Analysis failed',
      updated_at: new Date().toISOString(),
    });
    updateScanJob(jobId, { status: 'failed', progress: 100, error: error?.message || 'Analysis failed', report: null });
  } finally {
    if (job.payload.uploadedFilePath) { fs.rm(job.payload.uploadedFilePath, { force: true }, () => {}); }
  }
}

app.get('/api/scans/recent', requireAuth, scanLimiter, async (req, res) => {
  try {
    const { data: scans, error } = await supabaseAdmin.from('scans').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    res.json({ ok: true, scans });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

app.get('/api/scans/:id', requireAuth, scanLimiter, async (req, res) => {
  try {
    const { data: scan, error } = await supabaseAdmin.from('scans').select('*').eq('id', req.params.id).single();
    if (error || !scan) { return res.status(404).json({ ok: false, error: 'Scan not found' }); }
    if (req.user?.id && scan.user_id !== req.user.id) { return res.status(403).json({ ok: false, error: 'Access denied' }); }
    res.json({ ok: true, scan });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

app.get('/api/scans/:id/report', requireAuth, scanLimiter, async (req, res) => {
  try {
    const { data: scan, error } = await supabaseAdmin.from('scans').select('*').eq('id', req.params.id).single();
    if (error || !scan) { return res.status(404).json({ ok: false, error: 'Scan not found' }); }
    if (req.user?.id && scan.user_id !== req.user.id) { return res.status(403).json({ ok: false, error: 'Access denied' }); }
    if (!scan.report) { return res.status(409).json({ ok: false, error: 'Report is not ready yet' }); }
    res.json({ ok: true, report: scan.report });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

app.post('/api/scans', requireAuth, scanLimiter, upload.single('file'), async (req, res) => {
  const validation = validateScanRequest(req.body || {}, req.file);
  if (validation.error) {
    if (req.file?.path) fs.rm(req.file.path, { force: true }, () => {});
    return res.status(400).json({ ok: false, error: validation.error });
  }
  const payload = {
    userId: req.user?.id || null,
    targetType: validation.targetType,
    targetUrl: validation.targetUrl || null,
    level: validation.level,
    sourceKind: validation.sourceKind,
    uploadedFilePath: req.file?.path || null,
    originalFilename: req.file?.originalname || null,
  };
  const job = createScanJob(payload);
  
  // Сохранить в Supabase СРАЗУ
  await supabaseAdmin.from('scans').insert({
    id: job.id,
    user_id: payload.userId,
    target_type: payload.targetType,
    target_url: payload.targetUrl || '',
    status: 'pending',
    risk_score: 0,
    vulnerabilities: [],
    created_at: new Date().toISOString(),
  });
  
  processScan(job.id);
  return res.status(202).json({ ok: true, scan: toPublicScan(job) });
});

// ============================================
// SOLANA SCAN ENDPOINT
// ============================================
app.post("/api/solana/scan", requireAuth, scanLimiter, async (req, res) => {
  try {
    const { programId, network = "mainnet" } = req.body;
    if (!programId) { return res.status(400).json({ ok: false, error: "Program ID is required" }); }
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(programId)) { return res.status(400).json({ ok: false, error: "Invalid Solana program address" }); }
    const result = await analyzeSolanaProgram(programId, network);
    const report = {
      target: { type: "solana_program", url: programId, network },
      summary: {
        riskScore: result.riskScore,
        totalFindings: result.findings.length,
        severityBreakdown: {
          critical: result.findings.filter(f => f.severity === "critical").length,
          high: result.findings.filter(f => f.severity === "high").length,
          medium: result.findings.filter(f => f.severity === "medium").length,
          low: result.findings.filter(f => f.severity === "low").length,
          info: result.findings.filter(f => f.severity === "info").length,
        },
      },
      findings: result.findings,
    };
    const { data: scan, error } = await supabaseAdmin.from("scans").insert({
      user_id: req.user.id,
      target_type: "solana_program",
      target_url: programId,
      status: "completed",
      risk_score: result.riskScore,
      vulnerabilities: result.findings,
      report: report,
    }).select().single();
    if (error) throw error;
    res.json({ ok: true, scan, result });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

// ============================================
// AUTH ROUTES
// ============================================
app.post('/api/auth/register', scanLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) { return res.status(400).json({ ok: false, error: 'Email and password are required' }); }
    const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    console.log("DEBUG login result keys:", Object.keys(result)); console.log("DEBUG access_token exists:", !!result.access_token);
    console.log("DEBUG login result keys:", Object.keys(result)); console.log("DEBUG access_token exists:", !!result.access_token);
    if (!response.ok) { return res.status(400).json({ ok: false, error: result.msg || 'Registration failed' }); }
    res.json({ ok: true, user: result.user, access_token: result.access_token, token: result.access_token, refresh_token: result.refresh_token });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

app.post('/api/auth/login', scanLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) { return res.status(400).json({ ok: false, error: 'Email and password are required' }); }
    const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    console.log("DEBUG login result keys:", Object.keys(result)); console.log("DEBUG access_token exists:", !!result.access_token);
    console.log("DEBUG login result keys:", Object.keys(result)); console.log("DEBUG access_token exists:", !!result.access_token);
    if (!response.ok) { return res.status(400).json({ ok: false, error: result.error_description || 'Login failed' }); }
    res.json({ ok: true, user: result.user, access_token: result.access_token, token: result.access_token, refresh_token: result.refresh_token });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) { return res.status(400).json({ ok: false, error: 'File upload error' }); }
  if (error?.message === 'Origin not allowed by CORS') { return res.status(403).json({ ok: false, error: error.message }); }
  if (error) { return res.status(400).json({ ok: false, error: error.message || 'Bad request' }); }
  next();
});

app.listen(port, () => { console.log(`ChainScout server listening on ${port}`); });
