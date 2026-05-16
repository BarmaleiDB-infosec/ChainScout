const axios = require('axios');
const dns = require('dns/promises');
const fs = require('fs');
const fsp = require('fs/promises');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const unzipper = require('unzipper');
const { appendScanDatasetEntry, loadRecentDatasetEntries } = require('./feedback-store');
const { analyzeSolidityCode } = require('./security-engine');
const { getContractSourceCode, normalizeAddress } = require('./etherscan-client');

const MAX_DOWNLOAD_BYTES = Number(process.env.MAX_DOWNLOAD_BYTES || 10 * 1024 * 1024);
const MAX_ARCHIVE_BYTES = Number(process.env.MAX_ARCHIVE_BYTES || 25 * 1024 * 1024);
const MAX_ARCHIVE_ENTRY_BYTES = Number(process.env.MAX_ARCHIVE_ENTRY_BYTES || 10 * 1024 * 1024);
const MAX_ARCHIVE_TOTAL_BYTES = Number(process.env.MAX_ARCHIVE_TOTAL_BYTES || 60 * 1024 * 1024);
const MAX_ARCHIVE_FILES = Number(process.env.MAX_ARCHIVE_FILES || 500);
const MAX_ARCHIVE_DEPTH = Number(process.env.MAX_ARCHIVE_DEPTH || 12);
const MAX_FINDINGS = 100;
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^::1$/i,
  /^fc/i,
  /^fd/i,
  /^fe80:/i,
];
const KNOWN_SCANNERS = {
  slither: process.env.SLITHER_BINARY || 'slither',
  mythril: process.env.MYTHRIL_BINARY || 'myth',
};

function normalizeLevel(level) {
  const value = String(level || '').toLowerCase();
  if (['passive', 'basic', 'standard', 'aggressive', 'comprehensive', 'deep'].includes(value)) {
    return value;
  }
  return 'standard';
}

function normalizeTargetType(targetType) {
  const value = String(targetType || '').toLowerCase();
  const map = {
    website: 'website_url',
    repository: 'github_repo',
    'smart-contract': 'contract_address',
    blockchain: 'web3_project',
    github_repo: 'github_repo',
    contract_address: 'contract_address',
    website_url: 'website_url',
    file_upload: 'file_upload',
    zip_upload: 'zip_upload',
    web3_project: 'web3_project',
  };
  return map[value] || 'website_url';
}

function classifySource({ targetType, targetUrl, uploadedFilePath }) {
  const normalizedType = normalizeTargetType(targetType);
  if (uploadedFilePath) {
    return uploadedFilePath.endsWith('.zip') ? 'zip_upload' : 'file_upload';
  }
  if (normalizedType === 'github_repo') return 'github_repo';
  if (normalizedType === 'contract_address') return 'contract_address';
  if (normalizedType === 'web3_project') return 'web3_project';
  if (looksLikeGitHubRepo(targetUrl)) return 'github_repo';
  if (looksLikeContractAddress(targetUrl)) return 'contract_address';
  return 'website_url';
}

function looksLikeGitHubRepo(value) {
  return /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+/i.test(String(value || ''));
}

function looksLikeContractAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());
}

function assertSafeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Некорректный URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Разрешены только http/https URL');
  }

  const normalizedHostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(normalizedHostname))) {
    throw new Error('Запрещён доступ к локальным или приватным адресам');
  }

  return parsed;
}

async function assertSafeResolvedUrl(rawUrl) {
  const parsed = assertSafeUrl(rawUrl);
  const normalizedHostname = parsed.hostname.replace(/^\[|\]$/g, '');
  const records = await dns.lookup(normalizedHostname, { all: true, verbatim: true });

  if (!records.length) {
    throw new Error('Не удалось разрешить адрес цели');
  }

  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new Error('Цель резолвится во внутренний или loopback IP');
    }
  }

  return parsed;
}

function isPrivateIp(address) {
  const normalized = String(address || '').replace(/^\[|\]$/g, '').toLowerCase();
  if (net.isIP(normalized) === 0) {
    return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
  }
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}

function severityOrder(level) {
  return { critical: 4, high: 3, medium: 2, low: 1, info: 0 }[level] ?? 0;
}

function countBySeverity(findings) {
  return findings.reduce(
    (acc, finding) => {
      const key = String(finding.severity || 'info').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  );
}

function computeRiskScore(findings) {
  const score = findings.reduce((acc, finding) => {
    const severity = String(finding.severity || 'info').toLowerCase();
    const confidence = Number(finding.confidenceScore || 0.5);
    const weight = { critical: 25, high: 16, medium: 8, low: 3, info: 1 }[severity] || 1;
    return acc + weight * Math.max(confidence, 0.35);
  }, 0);

  return Math.min(100, Math.round(score));
}

async function runAnalysis(input) {
  const normalizedType = normalizeTargetType(input.targetType);
  const normalizedLevel = normalizeLevel(input.level);
  const sourceKind = classifySource({
    targetType: normalizedType,
    targetUrl: input.targetUrl,
    uploadedFilePath: input.uploadedFilePath,
  });
  const workspaceDir = await prepareWorkspace();

  try {
    const artifact = await prepareArtifact({
      sourceKind,
      targetUrl: input.targetUrl,
      uploadedFilePath: input.uploadedFilePath,
      originalFilename: input.originalFilename,
      workspaceDir,
    });

    const findings = await analyzeArtifact({
      artifact,
      sourceKind,
      targetUrl: input.targetUrl,
      level: normalizedLevel,
      workspaceDir,
    });

    const limitedFindings = findings
      .sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity))
      .slice(0, MAX_FINDINGS);
    const vulnerabilities = countBySeverity(limitedFindings);
    const toolsUsed = Array.from(new Set(limitedFindings.map((finding) => finding.tool).filter(Boolean)));
    const aiAnalysis = await buildAiAnalysis({
      targetType: normalizedType,
      targetUrl: input.targetUrl,
      sourceKind,
      level: normalizedLevel,
      findings: limitedFindings,
      vulnerabilities,
      toolsUsed,
      artifact,
    });

    const report = {
      target: {
        type: normalizedType,
        sourceKind,
        url: input.targetUrl || null,
        originalFilename: input.originalFilename || null,
        analyzedPath: artifact.entryPath,
        chain: artifact.chain || null,
        repository: artifact.repository || null,
      },
      summary: {
        riskScore: computeRiskScore(limitedFindings),
        totalFindings: limitedFindings.length,
        severityBreakdown: vulnerabilities,
        confidenceAverage: averageConfidence(limitedFindings),
        toolsUsed,
        scannerCoverage: describeCoverage(sourceKind, artifact),
      },
      findings: limitedFindings,
      ai_analysis: aiAnalysis,
      limitations: buildLimitations(sourceKind, artifact, toolsUsed),
      metadata: {
        generatedAt: new Date().toISOString(),
        level: normalizedLevel,
        workspaceKind: artifact.kind,
      },
    };

    appendScanDatasetEntry({
      timestamp: new Date().toISOString(),
      targetType: normalizedType,
      sourceKind,
      targetUrl: input.targetUrl || null,
      severityBreakdown: vulnerabilities,
      topFindings: limitedFindings.slice(0, 10).map((finding) => ({
        title: finding.title,
        severity: finding.severity,
        category: finding.category,
      })),
      ai_analysis: aiAnalysis.executiveSummary,
    });

    return report;
  } finally {
    await cleanupWorkspace(workspaceDir);
  }
}

function averageConfidence(findings) {
  if (!findings.length) return 0;
  const total = findings.reduce((acc, finding) => acc + Number(finding.confidenceScore || 0), 0);
  return Number((total / findings.length).toFixed(2));
}

async function prepareWorkspace() {
  const baseTmpDir = path.join(__dirname, '.tmp');
  await fsp.mkdir(baseTmpDir, { recursive: true });
  const workspaceDir = await fsp.mkdtemp(path.join(baseTmpDir, 'chainscout-'));
  return workspaceDir;
}

async function cleanupWorkspace(workspaceDir) {
  if (!workspaceDir) return;
  try {
    await fsp.rm(workspaceDir, { recursive: true, force: true, maxRetries: 2 });
  } catch {
    // Best-effort cleanup: analysis result is more important than temp deletion.
  }
}

async function prepareArtifact({ sourceKind, targetUrl, uploadedFilePath, originalFilename, workspaceDir }) {
  if (uploadedFilePath) {
    const destination = path.join(workspaceDir, sanitizeFilename(originalFilename || path.basename(uploadedFilePath)));
    await fsp.copyFile(uploadedFilePath, destination);
    if (destination.endsWith('.zip')) {
      await enforceMaxSize(destination, MAX_ARCHIVE_BYTES, 'Архив слишком большой');
      await assertZipArchiveIsSafe(destination);
      const extractedDir = path.join(workspaceDir, 'uploaded-archive');
      await unzipArchive(destination, extractedDir);
      return {
        kind: 'archive',
        entryPath: extractedDir,
        repository: null,
        chain: null,
      };
    }

    await enforceMaxSize(destination, MAX_DOWNLOAD_BYTES, 'Файл слишком большой');
    return {
      kind: 'file',
      entryPath: destination,
      repository: null,
      chain: inferChainFromFilename(destination),
    };
  }

  if (sourceKind === 'github_repo') {
    const parsed = await assertSafeResolvedUrl(targetUrl);
    const repoDir = path.join(workspaceDir, 'repository');
    await downloadGithubRepository(parsed, repoDir);
    return {
      kind: 'repository',
      entryPath: repoDir,
      repository: parsed.toString(),
      chain: null,
    };
  }

  if (sourceKind === 'contract_address') {
    const contractDir = path.join(workspaceDir, 'contract');
    await fsp.mkdir(contractDir, { recursive: true });
    const chain = inferChainFromUrlOrAddress(targetUrl);
    
    // Use new Etherscan client for source code retrieval
    let sourceResult;
    try {
      const etherscanResult = await getContractSourceCode(targetUrl, chain);
      sourceResult = {
        filename: `${etherscanResult.name || 'contract'}.sol`,
	source: typeof etherscanResult.sourceCode === 'string' ? etherscanResult.sourceCode : String(etherscanResult.sourceCode?.['Contract.sol'] || ''),      };
    } catch (error) {
      console.warn(`Failed to fetch from Etherscan for ${targetUrl}:`, error.message);
      // Fallback to placeholder
      sourceResult = {
        filename: 'contract.sol',
        source: `pragma solidity ^0.8.20;\n\n// Failed to fetch from explorer, address: ${targetUrl}\ncontract TargetContract {\n  address public immutable target = ${JSON.stringify(targetUrl)};\n}\n`,
      };
    }
    
    const contractPath = path.join(contractDir, sourceResult.filename);
	if (!sourceResult.source) throw new Error('Empty source code from Etherscan');
	await fsp.writeFile(contractPath, sourceResult.source, 'utf8');    return {
      kind: 'contract',
      entryPath: contractDir,
      repository: null,
      chain,
    };
  }

  if (sourceKind === 'website_url' || sourceKind === 'web3_project') {
    const parsed = await assertSafeResolvedUrl(targetUrl);
    return {
      kind: 'url',
      entryPath: parsed.toString(),
      repository: null,
      chain: null,
    };
  }

  throw new Error('Неподдерживаемый тип источника');
}

async function enforceMaxSize(filePath, maxBytes, message) {
  const stat = await fsp.stat(filePath);
  if (stat.size > maxBytes) {
    throw new Error(message);
  }
}

async function unzipArchive(archivePath, outputDir) {
  await fsp.mkdir(outputDir, { recursive: true });
  await fs.createReadStream(archivePath).pipe(unzipper.Extract({ path: outputDir })).promise();
}

async function assertZipArchiveIsSafe(archivePath) {
  const directory = await unzipper.Open.file(archivePath);
  let totalUncompressed = 0;

  if (directory.files.length > MAX_ARCHIVE_FILES) {
    throw new Error('Архив содержит слишком много файлов');
  }

  for (const entry of directory.files) {
    const entryPath = String(entry.path || '').replace(/\\/g, '/');
    const uncompressedSize = Number(entry.uncompressedSize || 0);

    if (
      entryPath.startsWith('/') ||
      entryPath.includes('../') ||
      /^[a-zA-Z]:/.test(entryPath)
    ) {
      throw new Error('Архив содержит небезопасные пути');
    }

    if (entryPath.split('/').length > MAX_ARCHIVE_DEPTH) {
      throw new Error('Архив слишком глубоко вложен');
    }

    if (entry.type === 'SymbolicLink' || entry.type === 'DirectoryLink') {
      throw new Error('Архивы с symlink не поддерживаются');
    }

    if (uncompressedSize > MAX_ARCHIVE_ENTRY_BYTES) {
      throw new Error('Файл внутри архива превышает допустимый размер');
    }

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_ARCHIVE_TOTAL_BYTES) {
      throw new Error('Суммарный размер распаковки превышает лимит');
    }
  }
}

function sanitizeFilename(filename) {
  return String(filename || 'artifact').replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function downloadGithubRepository(parsedUrl, outputDir) {
  const parts = parsedUrl.pathname.replace(/^\/+/, '').split('/');
  const owner = parts[0];
  const repo = parts[1]?.replace(/\.git$/, '');
  if (!owner || !repo) {
    throw new Error('Не удалось определить owner/repo из GitHub URL');
  }

  const archiveUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${process.env.DEFAULT_GITHUB_BRANCH || 'main'}`;
  const archivePath = path.join(outputDir, '..', `${repo}.zip`);
  await fsp.mkdir(path.dirname(archivePath), { recursive: true });
  await downloadFile(archiveUrl, archivePath, MAX_ARCHIVE_BYTES);
  await assertZipArchiveIsSafe(archivePath);

  try {
    await unzipArchive(archivePath, outputDir);
  } catch {
    const fallbackUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/master`;
    await downloadFile(fallbackUrl, archivePath, MAX_ARCHIVE_BYTES);
    await assertZipArchiveIsSafe(archivePath);
    await unzipArchive(archivePath, outputDir);
  }
}

async function downloadFile(url, destination, maxBytes) {
  const parsed = await assertSafeResolvedUrl(url);
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 30000,
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
    headers: {
      'User-Agent': 'ChainScout/0.1 security-scanner',
      Host: parsed.host,
    },
  });

  let downloaded = 0;
  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(destination);
    response.data.on('data', (chunk) => {
      downloaded += chunk.length;
      if (downloaded > maxBytes) {
        response.data.destroy(new Error('Превышен лимит размера'));
      }
    });
    response.data.on('error', reject);
    stream.on('error', reject);
    stream.on('finish', resolve);
    response.data.pipe(stream);
  });
}

async function fetchVerifiedContractSource(address, chain) {
  const apiKeyByChain = {
    ethereum: process.env.ETHERSCAN_API_KEY,
    bsc: process.env.BSCSCAN_API_KEY,
    polygon: process.env.POLYGONSCAN_API_KEY,
  };
  const hostByChain = {
    ethereum: 'https://api.etherscan.io/api',
    bsc: 'https://api.bscscan.com/api',
    polygon: 'https://api.polygonscan.com/api',
  };

  const apiKey = apiKeyByChain[chain];
  const host = hostByChain[chain];
  if (!apiKey || !host) {
    return {
      filename: 'contract.sol',
      source: `pragma solidity ^0.8.20;\n\n// Explorer API key is missing, so only the raw address was received.\ncontract TargetContract {\n  address public immutable target = ${JSON.stringify(address)};\n}\n`,
    };
  }

  const response = await axios.get(host, {
    params: {
      module: 'contract',
      action: 'getsourcecode',
      address,
      apikey: apiKey,
    },
    timeout: 15000,
    maxRedirects: 0,
    headers: {
      'User-Agent': 'ChainScout/0.1 security-scanner',
    },
  });

  const entry = response.data?.result?.[0];
  const source = entry?.SourceCode;
  if (!source) {
    throw new Error('Не удалось получить исходник контракта из explorer API');
  }

  return {
    filename: `${sanitizeFilename(entry.ContractName || 'contract')}.sol`,
    source: unwrapSourceCode(source),
  };
}

function unwrapSourceCode(source) {
  const value = String(source || '');
  if (value.startsWith('{{') && value.endsWith('}}')) {
    try {
      const parsed = JSON.parse(value.slice(1, -1));
      const sources = parsed.sources || {};
      return Object.values(sources)
        .map((entry) => entry.content)
        .filter(Boolean)
        .join('\n\n');
    } catch {
      return value;
    }
  }
  return value;
}

function inferChainFromUrlOrAddress(targetUrl) {
  const value = String(targetUrl || '').toLowerCase();
  if (value.includes('bsc')) return 'bsc';
  if (value.includes('polygon') || value.includes('matic')) return 'polygon';
  return 'ethereum';
}

function inferChainFromFilename(filename) {
  const normalized = String(filename || '').toLowerCase();
  if (normalized.endsWith('.sol')) return 'ethereum';
  return null;
}

async function analyzeArtifact({ artifact, sourceKind, targetUrl, level, workspaceDir }) {
  const findings = [];

  if (artifact.kind === 'url') {
    findings.push(...(await analyzeWebsite(targetUrl)));
    return findings;
  }

  const solidityFiles = await collectFiles(artifact.entryPath, ['.sol']);
  const webFiles = await collectFiles(artifact.entryPath, ['.ts', '.tsx', '.js', '.jsx', '.json']);

  if (solidityFiles.length) {
    // Try external tools first (Slither, Mythril)
    if (level === "comprehensive" || level === "deep") { findings.push(...(await runSlitherAnalysis(artifact.entryPath))); }
    findings.push(...(await runMythrilAnalysis(solidityFiles[0], level)));
    
    // Always run built-in Security Engine for 7 vulnerability categories
    for (const solidityFile of solidityFiles) {
      try {
        const code = await fsp.readFile(solidityFile, 'utf-8');
        const engineFindings = await analyzeSolidityCode(code, solidityFile);
        findings.push(...engineFindings.findings);
      } catch (error) {
        console.warn(`Failed to analyze ${solidityFile}:`, error?.message || error);
      }
    }
    
    findings.push(...(await runStaticHeuristics({ files: solidityFiles, targetKind: sourceKind })));
  }

  if (webFiles.length) {
    findings.push(...(await runWeb3Heuristics(webFiles)));
  }

  if (!findings.length) {
    findings.push({
      id: 'coverage-limited',
      title: 'Ограниченное покрытие сканирования',
      category: 'coverage',
      severity: 'low',
      confidence: 'medium',
      confidenceScore: 0.6,
      description: 'Автоматический пайплайн не нашёл поддерживаемые артефакты для глубокого security-анализа.',
      evidence: 'No Solidity files or web3 integration markers were discovered in the supplied artifact.',
      location: artifact.entryPath,
      tool: 'chainscout',
      recommendation: 'Проверьте, что вы передали репозиторий, архив или контракт с исходниками.',
      references: [],
    });
  }

  return dedupeFindings(findings);
}

async function analyzeWebsite(targetUrl) {
  const parsed = await assertSafeResolvedUrl(targetUrl);
  const response = await axios.get(parsed.toString(), {
    timeout: 12000,
    maxContentLength: MAX_DOWNLOAD_BYTES,
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 500,
    headers: {
      'User-Agent': 'ChainScout/0.1 security-scanner',
    },
  });
  const html = String(response.data || '');
  const findings = [];

  if (/window\.ethereum|wagmi|web3modal|walletconnect/i.test(html)) {
    findings.push({
      id: 'web3-surface-detected',
      title: 'Обнаружена web3-интеграция на клиенте',
      category: 'web3-surface',
      severity: 'info',
      confidence: 'high',
      confidenceScore: 0.9,
      description: 'Страница использует wallet/web3 SDK, поэтому требуется ручная проверка цепочки авторизации и обработки подписи.',
      evidence: 'HTML contains Ethereum provider or wallet SDK markers.',
      location: parsed.toString(),
      tool: 'chainscout-web',
      recommendation: 'Проверьте сообщения для подписи, сетевые ограничения, проверку chainId и защиту от фишинга.',
      references: [],
    });
  }

  if (!/content-security-policy/i.test(JSON.stringify(response.headers || {}))) {
    findings.push({
      id: 'missing-csp-header',
      title: 'Отсутствует явный Content-Security-Policy',
      category: 'headers',
      severity: 'medium',
      confidence: 'medium',
      confidenceScore: 0.68,
      description: 'Для browser-first web3 приложения отсутствие CSP повышает риск XSS и подмены wallet-инъекций.',
      evidence: 'HTTP response headers do not expose a content-security-policy directive.',
      location: parsed.toString(),
      tool: 'chainscout-web',
      recommendation: 'Добавьте строгий CSP с ограничением script-src, frame-src и connect-src для wallet/provider доменов.',
      references: [],
    });
  }

  return findings;
}

async function runSlitherAnalysis(entryPath) {
  const binaryAvailable = await commandExists(KNOWN_SCANNERS.slither, ['--version']);
  if (!binaryAvailable) {
    return [];
  }

  const args = [entryPath, '--json', '-'];
  const result = await spawnCommand(KNOWN_SCANNERS.slither, args, { cwd: entryPath });
  const payload = safeJsonParse(result.stdout);
  const detectors = payload?.results?.detectors || [];

  return detectors.map((detector, index) => ({
    id: `slither-${index}-${sanitizeFilename(detector.check || 'finding')}`,
    title: detector.check || detector.impact || 'Slither finding',
    category: detector.impact || 'slither',
    severity: mapSeverity(detector.impact),
    confidence: detector.confidence || 'medium',
    confidenceScore: mapConfidence(detector.confidence),
    description: detector.description || detector.markdown || 'Slither detected a potential security issue.',
    evidence: detector.markdown || detector.description || '',
    location: detector.elements?.[0]?.source_mapping?.filename_absolute || detector.elements?.[0]?.name || entryPath,
    tool: 'slither',
    recommendation: detector.recommendation || 'Проведите ручную валидацию finding и исправьте небезопасную логику.',
    references: [],
  }));
}

async function runMythrilAnalysis(solidityFile) {
  const binaryAvailable = await commandExists(KNOWN_SCANNERS.mythril, ['--version']);
  if (!binaryAvailable) {
    return [];
  }

  const result = await spawnCommand(KNOWN_SCANNERS.mythril, ['analyze', solidityFile, '--execution-timeout', '45', '-o', 'json'], {
    cwd: path.dirname(solidityFile),
  });
  const payload = safeJsonParse(result.stdout);
  const issues = payload?.issues || [];

  return issues.map((issue, index) => ({
    id: `mythril-${index}-${sanitizeFilename(issue.swcID || 'issue')}`,
    title: issue.title || 'Mythril issue',
    category: issue.swcTitle || 'mythril',
    severity: mapSeverity(issue.severity),
    confidence: issue.extra?.discovery_mode || 'medium',
    confidenceScore: mapConfidence(issue.extra?.discovery_mode),
    description: issue.description || issue.extra?.description || 'Mythril found a potential execution-path issue.',
    evidence: issue.code || issue.description || '',
    location: `${issue.filename || solidityFile}:${issue.lineno || '?'}`,
    tool: 'mythril',
    recommendation: issue.extra?.recommendation || 'Проверьте execution path вручную и добавьте тест на уязвимый сценарий.',
    references: issue.swcID ? [`SWC-${issue.swcID}`] : [],
  }));
}

async function runStaticHeuristics({ files, targetKind }) {
  const findings = [];
  for (const filePath of files.slice(0, 50)) {
    const content = await fsp.readFile(filePath, 'utf8');

    if (/tx\.origin/.test(content)) {
      findings.push(buildHeuristicFinding(filePath, 'tx-origin-auth', 'Используется tx.origin для авторизации', 'high', 'Использование tx.origin вместо msg.sender может позволить phishing/proxy атаки.', 'Используйте msg.sender и role-based access control.'));
    }

    if (/delegatecall\s*\(/.test(content)) {
      findings.push(buildHeuristicFinding(filePath, 'delegatecall-detected', 'Обнаружен delegatecall', 'high', 'delegatecall требует ручного аудита из-за риска storage collision и arbitrary execution.', 'Минимизируйте delegatecall, валидируйте target и ограничьте набор вызываемых функций.'));
    }

    if (/call\.value\s*\(|\.call\s*\{\s*value:/m.test(content)) {
      findings.push(buildHeuristicFinding(filePath, 'ether-send-pattern', 'Найден низкоуровневый перевод ETH', 'medium', 'Низкоуровневые вызовы value/send требуют защиты от reentrancy и проверки результата.', 'Используйте Checks-Effects-Interactions и ReentrancyGuard.'));
    }

    if (/pragma solidity \^0\.4|pragma solidity \^0\.5/.test(content)) {
      findings.push(buildHeuristicFinding(filePath, 'old-solidity-version', 'Используется устаревшая версия Solidity', 'medium', 'Старые версии компилятора часто содержат известные footgun-сценарии и худшую диагностику.', 'Обновите pragma и прогоните тесты/статический анализ на новой версии.'));
    }

    if (targetKind === 'github_repo' && !/openzeppelin/i.test(content) && /owner\s*=/.test(content)) {
      findings.push(buildHeuristicFinding(filePath, 'custom-access-control', 'Кастомная access-control логика требует ручной валидации', 'low', 'Самописные owner/admin паттерны часто пропускают edge-cases при transferOwnership и emergency flow.', 'Сравните логику с battle-tested OpenZeppelin Ownable/AccessControl.'));
    }
  }

  return findings;
}

async function runWeb3Heuristics(files) {
  const findings = [];
  for (const filePath of files.slice(0, 80)) {
    const content = await fsp.readFile(filePath, 'utf8');
    const normalized = content.toLowerCase();

    if (normalized.includes('dangerouslysetinnerhtml')) {
      findings.push(buildHeuristicFinding(filePath, 'dangerouslysetinnerhtml', 'Используется dangerouslySetInnerHTML рядом с web3 UI', 'medium', 'XSS в wallet-connected интерфейсе может привести к подмене адресов, approval flow и phishing UX.', 'Избегайте raw HTML или пропускайте контент через санитайзер.'));
    }

    if (/eth_sendTransaction|personal_sign|eth_sign/i.test(content) && !/chainId|switchNetwork|switchChain/i.test(content)) {
      findings.push(buildHeuristicFinding(filePath, 'missing-network-check', 'Подпись/транзакция без явной проверки сети', 'medium', 'Пользователь может подписывать действия в неверной сети или на поддельном RPC.', 'Перед запросом подписи валидируйте chainId и expected RPC environment.'));
    }

    if (/localStorage\.(setItem|getItem)\(.+(privateKey|mnemonic|seed)/i.test(content)) {
      findings.push(buildHeuristicFinding(filePath, 'secret-in-localstorage', 'Секреты хранятся в localStorage', 'critical', 'Хранение приватных ключей, seed phrase или чувствительных токенов в localStorage неприемлемо.', 'Никогда не сохраняйте ключи/seed в браузерном storage. Используйте кошелёк пользователя или защищённый backend KMS.'));
    }
  }
  return findings;
}

function buildHeuristicFinding(filePath, id, title, severity, description, recommendation) {
  return {
    id,
    title,
    category: 'heuristic',
    severity,
    confidence: 'medium',
    confidenceScore: 0.72,
    description,
    evidence: `Pattern match inside ${path.basename(filePath)}`,
    location: filePath,
    tool: 'chainscout-heuristics',
    recommendation,
    references: [],
  };
}

async function collectFiles(entryPath, extensions) {
  const results = [];
  async function walk(currentPath) {
    const stat = await fsp.stat(currentPath);
    if (stat.isDirectory()) {
      const entries = await fsp.readdir(currentPath);
      for (const entry of entries.slice(0, 200)) {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry)) {
          continue;
        }
        await walk(path.join(currentPath, entry));
      }
      return;
    }

    if (extensions.some((extension) => currentPath.toLowerCase().endsWith(extension))) {
      results.push(currentPath);
    }
  }

  if (entryPath && fs.existsSync(entryPath)) {
    await walk(entryPath);
  }

  return results;
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.title}|${finding.location}|${finding.tool}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function mapSeverity(input) {
  const value = String(input || '').toLowerCase();
  if (value.includes('critical')) return 'critical';
  if (value.includes('high')) return 'high';
  if (value.includes('medium')) return 'medium';
  if (value.includes('low')) return 'low';
  return 'info';
}

function mapConfidence(input) {
  const value = String(input || '').toLowerCase();
  if (value.includes('high')) return 0.92;
  if (value.includes('medium')) return 0.72;
  if (value.includes('low')) return 0.55;
  return 0.6;
}

function describeCoverage(sourceKind, artifact) {
  if (artifact.kind === 'url') {
    return 'HTTP headers + client-side web3 footprint heuristics';
  }
  if (sourceKind === 'contract_address') {
    return 'Explorer-retrieved contract source + Solidity heuristics';
  }
  if (artifact.kind === 'repository' || artifact.kind === 'archive') {
    return 'Repository/archive traversal, Solidity heuristics, optional Slither/Mythril';
  }
  return 'Single artifact scan';
}

function buildLimitations(sourceKind, artifact, toolsUsed) {
  const limitations = [];
  if (!toolsUsed.includes('slither')) {
    limitations.push('Slither не найден в окружении сервера, поэтому использованы эвристики вместо полного AST-анализа.');
  }
  if (!toolsUsed.includes('mythril')) {
    limitations.push('Mythril не найден в окружении сервера, поэтому symbolic execution coverage ограничено.');
  }
  if (artifact.kind === 'url') {
    limitations.push('Для URL-режима анализируется только доступный браузеру surface, без полноценного backend pentest.');
  }
  limitations.push('Архивы с symlink, path traversal и чрезмерной глубиной блокируются защитным pre-check перед распаковкой.');
  if (sourceKind === 'contract_address' && !process.env.ETHERSCAN_API_KEY && !process.env.BSCSCAN_API_KEY && !process.env.POLYGONSCAN_API_KEY) {
    limitations.push('Explorer API ключ не настроен, поэтому адрес контракта анализируется без полного verified source.');
  }
  return limitations;
}

const { generateAiAnalysis } = require('./ai/report-generator');

async function buildAiAnalysis({ targetType, targetUrl, sourceKind, level, findings, vulnerabilities, toolsUsed, artifact }) {
  const datasetExamples = loadRecentDatasetEntries(3);
  const fallback = buildFallbackAiAnalysis({ targetType, targetUrl, sourceKind, findings, vulnerabilities, toolsUsed, artifact });

  try {
    const aiAnalysis = await generateAiAnalysis({
      targetType,
      targetUrl,
      sourceKind,
      level,
      findings,
      vulnerabilities,
      toolsUsed,
      artifact,
      datasetExamples,
      language: process.env.AI_LANGUAGE || "ru",
    });

    if (aiAnalysis?.executiveSummary) {
      return {
        executiveSummary: aiAnalysis.executiveSummary,
        criticalRisks: aiAnalysis.criticalRisks || fallback.criticalRisks,
        remediationRoadmap: aiAnalysis.remediationRoadmap || fallback.remediationRoadmap,
        trainingSignals: aiAnalysis.trainingSignals || fallback.trainingSignals,
      };
    }
  } catch (error) {
    console.warn('AI analysis failed, using fallback summary:', error?.message || error);
  }

  return fallback;
}

function buildFallbackAiAnalysis({ targetType, targetUrl, findings, vulnerabilities, toolsUsed }) {
  const topFindings = findings.slice(0, 5).map((finding) => `${finding.title} (${finding.severity})`);
  const criticalRisks = findings
    .filter((finding) => ['critical', 'high'].includes(String(finding.severity)))
    .slice(0, 3)
    .map((finding) => ({
      title: finding.title,
      severity: finding.severity,
      recommendation: finding.recommendation,
    }));

  return {
    executiveSummary: `ChainScout завершил анализ ${targetUrl || 'загруженного артефакта'} как ${targetType}. Найдено ${findings.length} findings. Критичные: ${vulnerabilities.critical || 0}, высокие: ${vulnerabilities.high || 0}. Главные сигналы риска: ${topFindings.join(', ') || 'существенных подтвержденных уязвимостей не найдено'}.`,
    criticalRisks,
    remediationRoadmap: [
      'Сначала исправить critical/high findings и добавить regression tests на exploit path.',
      'После фиксов повторно прогнать статический анализ и сверить diff отчётов.',
      'Для web3 UI отдельно проверить chain gating, signature prompts и approve flow.',
    ],
    trainingSignals: [
      'Structured findings сохранены для retrieval и последующего quality benchmarking.',
      'False-positive review стоит собирать вручную, а не дообучать модель автоматически на собственных выводах.',
      `Использованные движки: ${toolsUsed.join(', ') || 'heuristics only'}.`,
    ],
  };
}

async function commandExists(command, args) {
  try {
    await spawnCommand(command, args, { timeoutMs: 15000 });
    return true;
  } catch {
    return false;
  }
}

async function spawnCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: process.env,
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timeoutMs = options.timeoutMs || 60000;
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Команда ${command} завершилась по таймауту`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr || stdout || `Command ${command} failed with code ${code}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

module.exports = {
  runAnalysis,
  normalizeLevel,
  normalizeTargetType,
  classifySource,
};
