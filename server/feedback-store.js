const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const datasetPath = path.join(dataDir, 'scan-feedback.jsonl');

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function appendScanDatasetEntry(entry) {
  ensureDataDir();
  fs.appendFileSync(datasetPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

function loadRecentDatasetEntries(limit = 5) {
  try {
    ensureDataDir();
    if (!fs.existsSync(datasetPath)) {
      return [];
    }

    const lines = fs
      .readFileSync(datasetPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .slice(-limit);

    return lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = {
  appendScanDatasetEntry,
  loadRecentDatasetEntries,
};
