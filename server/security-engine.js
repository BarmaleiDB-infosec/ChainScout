/**
 * ChainScout Security Engine
 * Static analysis for Solidity smart contracts
 */

function detectReentrancy(sourceCode, lines, filename) {
  const findings = [];
  const patterns = [
    /\.call\.value\s*\(/g,
    /\.send\s*\(/g,
    /\.transfer\s*\(/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sourceCode)) !== null) {
      const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
      findings.push({
        category: 'Reentrancy',
        severity: 'high',
        description: `External call detected in ${filename}:${lineIndex}. Ensure CEI pattern.`,
        location: `${filename}:${lineIndex}`,
        recommendation: 'Use Checks-Effects-Interactions or ReentrancyGuard.',
      });
    }
  }
  return findings;
}

function detectIntegerArithmetic(sourceCode, lines, filename) {
  const findings = [];
  const patterns = [/(\+\+|--|\+=|-=|\*=|\/=)/g, /(\+\s*\d+|\-\s*\d+|\*\s*\d+)/g];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sourceCode)) !== null) {
      if (!sourceCode.includes('SafeMath') && !sourceCode.includes('unchecked')) {
        const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
        findings.push({
          category: 'Integer Overflow/Underflow',
          severity: 'medium',
          description: `Arithmetic without SafeMath in ${filename}:${lineIndex}`,
          location: `${filename}:${lineIndex}`,
          recommendation: 'Use Solidity 0.8+ built-in overflow checks.',
        });
      }
    }
  }
  return findings;
}

function detectTxOrigin(sourceCode, lines, filename) {
  const findings = [];
  if (sourceCode.includes('tx.origin')) {
    const lineNum = sourceCode.substring(0, sourceCode.indexOf('tx.origin')).split('\n').length;
    findings.push({
      category: 'tx.origin Misuse',
      severity: 'high',
      description: `tx.origin used in ${filename}:${lineNum}. Vulnerable to phishing.`,
      location: `${filename}:${lineNum}`,
      recommendation: 'Use msg.sender instead of tx.origin.',
    });
  }
  return findings;
}

function detectUncheckedCalls(sourceCode, lines, filename) {
  const findings = [];
  const patterns = [/\.call\s*\{/g, /\.delegatecall\s*\{/g, /\.staticcall\s*\{/g];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sourceCode)) !== null) {
      const context = sourceCode.substring(Math.max(0, match.index - 50), match.index + 100);
      if (!context.includes('require(') && !context.includes('if (')) {
        const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
        findings.push({
          category: 'Unchecked Call',
          severity: 'high',
          description: `Low-level call without check in ${filename}:${lineIndex}`,
          location: `${filename}:${lineIndex}`,
          recommendation: 'Check return values with require(success).',
        });
      }
    }
  }
  return findings;
}

function detectDelegatecall(sourceCode, lines, filename) {
  const findings = [];
  if (sourceCode.includes('delegatecall')) {
    const lineNum = sourceCode.substring(0, sourceCode.indexOf('delegatecall')).split('\n').length;
    findings.push({
      category: 'Delegatecall Misuse',
      severity: 'critical',
      description: `delegatecall in ${filename}:${lineNum}. Target must be trusted.`,
      location: `${filename}:${lineNum}`,
      recommendation: 'Use libraries or ensure delegatecall target is immutable.',
    });
  }
  return findings;
}

function detectAccessControl(sourceCode, lines, filename) {
  const findings = [];
  const sensitiveFunctions = [
    /function\s+withdraw\s*\(/g,
    /function\s+mint\s*\(/g,
    /function\s+burn\s*\(/g,
    /function\s+setOwner\s*\(/g,
    /function\s+transferOwnership\s*\(/g,
  ];
  
  for (const pattern of sensitiveFunctions) {
    let match;
    while ((match = pattern.exec(sourceCode)) !== null) {
      const funcStart = match.index;
      const funcEnd = sourceCode.indexOf('{', funcStart);
      const funcBody = sourceCode.substring(funcStart, funcEnd + 1);
      
      if (!funcBody.includes('onlyOwner') && !funcBody.includes('require(')) {
        const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
        findings.push({
          category: 'Access Control',
          severity: 'critical',
          description: `Sensitive function without modifier in ${filename}:${lineIndex}`,
          location: `${filename}:${lineIndex}`,
          recommendation: 'Add onlyOwner, RBAC, or require(msg.sender == owner).',
        });
      }
    }
  }
  return findings;
}

function detectTimestampDependence(sourceCode, lines, filename) {
  const findings = [];
  if (sourceCode.includes('block.timestamp') || sourceCode.includes('now')) {
    const patterns = [/block\.timestamp/g, /\bnow\b/g];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(sourceCode)) !== null) {
        const context = sourceCode.substring(Math.max(0, match.index - 100), match.index + 100);
        if (context.includes('require(') || context.includes('if (') || context.includes('assert(')) {
          const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
          findings.push({
            category: 'Timestamp Dependence',
            severity: 'low',
            description: `block.timestamp in critical logic in ${filename}:${lineIndex}`,
            location: `${filename}:${lineIndex}`,
            recommendation: 'Avoid block.timestamp for exact timing.',
          });
        }
      }
    }
  }
  return findings;
}

function deduplicate(findings) {
  const seen = new Set();
  const deduplicated = [];
  for (const finding of findings) {
    const key = `${finding.category}:${finding.location}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(finding);
    }
  }
  return deduplicated;
}

function analyzeSolidityCode(sourceCode, filename = 'Contract.sol') {
  const lines = sourceCode.split('\n');
  let findings = [];
  
  findings.push(...detectReentrancy(sourceCode, lines, filename));
  findings.push(...detectIntegerArithmetic(sourceCode, lines, filename));
  findings.push(...detectTxOrigin(sourceCode, lines, filename));
  findings.push(...detectUncheckedCalls(sourceCode, lines, filename));
  findings.push(...detectDelegatecall(sourceCode, lines, filename));
  findings.push(...detectAccessControl(sourceCode, lines, filename));
  findings.push(...detectTimestampDependence(sourceCode, lines, filename));
  
  findings = deduplicate(findings);
  
  const severityScore = { critical: 25, high: 15, medium: 10, low: 5, info: 1 };
  const riskScore = Math.min(100, findings.reduce((sum, f) => sum + (severityScore[f.severity] || 1), 0));
  
  return { filename, findings, totalFindings: findings.length, riskScore };
}

// ============================================
// INFURA INTEGRATION — Bytecode-based analysis
// ============================================
const { getContractBytecode, contractExists } = require('./infura-client');

async function analyzeBytecodeViaInfura(address, chain = 'mainnet') {
  const bytecode = await getContractBytecode(address, chain);
  const findings = [];
  
  if (bytecode.includes('f4') || bytecode.includes('F4')) {
    findings.push({ category: 'Delegatecall Detected', severity: 'medium', description: 'Contract uses delegatecall. Verify target addresses are trusted.' });
  }
  
  if (bytecode.includes('ff') || bytecode.includes('FF')) {
    findings.push({ category: 'Selfdestruct Detected', severity: 'high', description: 'Contract contains selfdestruct opcode. Review authorization.' });
  }
  
  return { address, chain, bytecodeSize: bytecode.length / 2 - 1, findings };
}

// ============================================
// SOLANA INTEGRATION — Program analysis
// ============================================
const { getProgramInfo, programExists } = require('./solana-client');

async function analyzeSolanaProgram(programId, network = 'mainnet') {
  const info = await getProgramInfo(programId, network);
  const findings = [];
  
  const UPGRADEABLE_LOADER = 'BPFLoaderUpgradeab1e11111111111111111111111';
  if (info.owner === UPGRADEABLE_LOADER) {
    findings.push({ category: 'Upgradeable Program', severity: 'medium', description: 'Program is upgradeable. Verify upgrade authority is secure.' });
  }
  
  if (info.dataSize < 1000 && info.executable) {
    findings.push({ category: 'Small Program', severity: 'low', description: 'Program bytecode is very small. Might be a proxy.' });
  }
  
  return { programId, network, executable: info.executable, findings, riskScore: findings.reduce((sum, f) => sum + (f.severity === 'medium' ? 10 : 5), 0) };
}

module.exports = {
  analyzeSolidityCode,
  analyzeBytecodeViaInfura,
  analyzeSolanaProgram,
};
