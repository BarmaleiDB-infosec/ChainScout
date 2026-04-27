const { randomUUID } = require('crypto');

const scans = new Map();
const scanOrder = [];
const MAX_SCANS = 100;

function createScanJob(payload) {
  const id = `scan_${randomUUID()}`;
  const now = new Date().toISOString();
  const job = {
    id,
    status: 'queued',
    progress: 0,
    createdAt: now,
    updatedAt: now,
    payload,
    report: null,
    error: null,
    warnings: [],
  };

  scans.set(id, job);
  scanOrder.unshift(id);
  trimStore();
  return job;
}

function updateScanJob(id, updates) {
  const current = scans.get(id);
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  scans.set(id, next);
  return next;
}

function appendWarning(id, warning) {
  const current = scans.get(id);
  if (!current) {
    return null;
  }

  current.warnings = [...(current.warnings || []), warning];
  current.updatedAt = new Date().toISOString();
  scans.set(id, current);
  return current;
}

function getScanJob(id) {
  return scans.get(id) || null;
}

function listRecentScans(limit = 20, userId = null) {
  return scanOrder
    .map((id) => scans.get(id))
    .filter(Boolean)
    .filter((job) => !userId || job.payload.userId === userId)
    .slice(0, limit)
    .map(toPublicScan);
}

function toPublicScan(job) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    targetType: job.payload.targetType,
    targetUrl: job.payload.targetUrl || null,
    sourceKind: job.payload.sourceKind,
    report: job.report,
    error: job.error,
    warnings: job.warnings || [],
  };
}

function trimStore() {
  while (scanOrder.length > MAX_SCANS) {
    const id = scanOrder.pop();
    if (id) {
      scans.delete(id);
    }
  }
}

module.exports = {
  createScanJob,
  updateScanJob,
  appendWarning,
  getScanJob,
  listRecentScans,
  toPublicScan,
};
