/**
 * ChainScout Security Engine v5 - Fixed auth detection for MakerDAO
 */

function detectReentrancy(sourceCode, lines, filename) {
  const findings = [];
  if (sourceCode.includes('ReentrancyGuard') || sourceCode.includes('nonReentrant')) {
    return findings;
  }
  
  const callPattern = /(\.call|\.transfer|\.send)\s*\{/g;
  let callMatch;
  
  while ((callMatch = callPattern.exec(sourceCode)) !== null) {
    const afterCall = sourceCode.substring(callMatch.index, callMatch.index + 400);
    const hasStateAfter = /(balances?\[|_\w+\[|approve|transferFrom)/.test(afterCall);
    const hasStateBefore = sourceCode.substring(Math.max(0, callMatch.index - 300), callMatch.index)
      .includes('balances');
    
    if (hasStateAfter && !hasStateBefore && !afterCall.includes('ReentrancyGuard')) {
      const lineIndex = sourceCode.substring(0, callMatch.index).split('\n').length;
      findings.push({
        category: 'Reentrancy',
        severity: 'high',
        description: `External call before state update at ${filename}:${lineIndex}`,
        location: `${filename}:${lineIndex}`,
        recommendation: 'Move state updates before external calls.',
      });
      break;
    }
  }
  return findings;
}

function detectIntegerArithmetic(sourceCode, lines, filename) {
  const findings = [];
  
  const safeMathImports = [
    /import\s+["']ds-math["']/,
    /import\s+["'].*math\.sol["']/,
    /using\s+SafeMath\s+for/,
    /SafeMathLib/,
    /DSMath/
  ];
  
  for (const pattern of safeMathImports) {
    if (pattern.test(sourceCode)) return findings;
  }
  
  const versionMatch = sourceCode.match(/pragma solidity [\^]?(\d+\.\d+)/);
  const version = versionMatch ? parseFloat(versionMatch[1]) : 0;
  if (version >= 0.8) return findings;
  
  const dangerousOps = [/\+\s*=/g, /\-\s*=/g, /\*\s*=/g];
  
  for (const op of dangerousOps) {
    let match;
    while ((match = op.exec(sourceCode)) !== null) {
      const beforeOp = sourceCode.substring(Math.max(0, match.index - 100), match.index);
      if (beforeOp.includes('unchecked')) continue;
      
      const funcStart = sourceCode.lastIndexOf('function ', match.index);
      if (funcStart === -1) continue;
      
      const funcSignature = sourceCode.substring(funcStart, sourceCode.indexOf('{', funcStart));
      const funcName = funcSignature.match(/function\s+(\w+)/)?.[1];
      if (!funcName || funcName.startsWith('_')) continue;
      
      const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
      findings.push({
        category: 'Integer Overflow/Underflow',
        severity: 'medium',
        description: `Arithmetic in ${funcName} without overflow protection at ${filename}:${lineIndex}`,
        location: `${filename}:${lineIndex}`,
        recommendation: 'Use Solidity 0.8+ or SafeMath.',
      });
      break;
    }
  }
  return findings;
}

function detectTxOrigin(sourceCode, lines, filename) {
  const findings = [];
  const pattern = /\btx\.origin\b/g;
  let match;
  while ((match = pattern.exec(sourceCode)) !== null) {
    const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
    findings.push({
      category: 'tx.origin Misuse',
      severity: 'high',
      description: `tx.origin used at ${filename}:${lineIndex}`,
      location: `${filename}:${lineIndex}`,
      recommendation: 'Use msg.sender instead.',
    });
  }
  return findings;
}

function detectUncheckedCalls(sourceCode, lines, filename) {
  const findings = [];
  
  if (sourceCode.includes('Proxy') || sourceCode.includes('delegatecall')) {
    return findings;
  }
  
  const patterns = [/(\.call|\.delegatecall|\.staticcall)\s*\{/g];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sourceCode)) !== null) {
      const after = sourceCode.substring(match.index, match.index + 200);
      if (!after.includes('require(') && !after.includes('if (')) {
        const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
        findings.push({
          category: 'Unchecked Call',
          severity: 'high',
          description: `Low-level call without return check at ${filename}:${lineIndex}`,
          location: `${filename}:${lineIndex}`,
          recommendation: 'Check return value with require(success).',
        });
      }
    }
  }
  return findings;
}

function detectDelegatecall(sourceCode, lines, filename) {
  const findings = [];
  
  const proxyIdentifiers = [
    'FiatTokenProxy', 'AdminUpgradeabilityProxy', 'TransparentUpgradeableProxy',
    'UUPSUpgradeable', 'ERC1967Proxy', 'Proxy', '_IMPLEMENTATION_SLOT',
    'implementation()', 'upgradeTo('
  ];
  
  for (const identifier of proxyIdentifiers) {
    if (sourceCode.includes(identifier)) return findings;
  }
  
  const pattern = /\bdelegatecall\b/g;
  let match;
  while ((match = pattern.exec(sourceCode)) !== null) {
    const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
    findings.push({
      category: 'Delegatecall',
      severity: 'high',
      description: `delegatecall detected at ${filename}:${lineIndex}. Verify target is trusted.`,
      location: `${filename}:${lineIndex}`,
      recommendation: 'Use proxy pattern with immutable implementation address.',
    });
  }
  return findings;
}

function detectAccessControl(sourceCode, lines, filename) {
  const findings = [];
  
  // MakerDAO auth patterns
  const makerPatterns = ['auth', 'ward', 'rely', 'deny', 'hope', 'nope'];
  const hasMakerAuth = makerPatterns.some(p => sourceCode.includes(p));
  
  const sensitiveFunctions = [
    { name: 'mint', critical: true },
    { name: 'burn', critical: true },
    { name: 'withdraw', critical: true },
    { name: 'setOwner', critical: true },
    { name: 'transferOwnership', critical: true },
    { name: 'pause', critical: false },
    { name: 'unpause', critical: false }
  ];
  
  for (const func of sensitiveFunctions) {
    const funcRegex = new RegExp(`function\\s+${func.name}\\s*\\([^)]*\\)\\s*(public|external)`, 'g');
    let match;
    
    while ((match = funcRegex.exec(sourceCode)) !== null) {
      const funcStart = match.index;
      const funcEnd = sourceCode.indexOf('{', funcStart);
      const funcSignature = sourceCode.substring(funcStart, funcEnd);
      const funcBody = sourceCode.substring(funcStart, sourceCode.indexOf('}', funcStart) + 500);
      
      let isProtected = false;
      
      // Стандартные модификаторы
      if (/onlyOwner|onlyAdmin|onlyRole/.test(funcSignature)) isProtected = true;
      
      // MakerDAO auth модификатор
      if (hasMakerAuth && /auth\s*\(/.test(funcBody)) isProtected = true;
      
      // Явная проверка
      if (/require\s*\(\s*msg\.sender\s*==/.test(funcBody)) isProtected = true;
      
      // Проверка на зависимость от другой функции с защитой
      if (funcBody.includes('_mint') || funcBody.includes('_burn')) {
        const calledFunc = funcBody.includes('_mint') ? '_mint' : '_burn';
        const calledFuncRegex = new RegExp(`function\\s+${calledFunc}\\s*\\([^)]*\\)\\s*(public|external|internal|private)`, 'g');
        let calledMatch;
        while ((calledMatch = calledFuncRegex.exec(sourceCode)) !== null) {
          const calledBody = sourceCode.substring(calledMatch.index, sourceCode.indexOf('}', calledMatch.index) + 500);
          if (/auth\s*\(/.test(calledBody)) {
            isProtected = true;
            break;
          }
        }
      }
      
      if (!isProtected && func.critical) {
        const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
        findings.push({
          category: 'Access Control',
          severity: func.critical ? 'critical' : 'medium',
          description: `${func.name} without access control at ${filename}:${lineIndex}`,
          location: `${filename}:${lineIndex}`,
          recommendation: `Add onlyOwner modifier or auth modifier to ${func.name}.`,
        });
      }
    }
  }
  return findings;
}

function detectTimestampDependence(sourceCode, lines, filename) {
  const findings = [];
  const pattern = /\b(block\.timestamp|now)\b/g;
  let match;
  
  while ((match = pattern.exec(sourceCode)) !== null) {
    const context = sourceCode.substring(Math.max(0, match.index - 200), match.index + 200);
    
    const safePatterns = [
      /block\.timestamp\s*[+>]\s*\d+/,
      /require\s*\(\s*block\.timestamp\s*[<>]/,
      /deadline|expiry|timeout/i
    ];
    
    let isSafe = false;
    for (const safe of safePatterns) {
      if (safe.test(context)) {
        isSafe = true;
        break;
      }
    }
    
    if (!isSafe && /require|if|assert/.test(context)) {
      const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
      findings.push({
        category: 'Timestamp Dependence',
        severity: 'low',
        description: `block.timestamp in logic at ${filename}:${lineIndex}`,
        location: `${filename}:${lineIndex}`,
        recommendation: 'Use block.number for longer timeframes.',
      });
    }
  }
  return findings;
}

function detectVersionPragma(sourceCode, lines, filename) {
  const findings = [];
  const versionMatch = sourceCode.match(/pragma solidity [\^]?(\d+\.\d+)/);
  const version = versionMatch ? parseFloat(versionMatch[1]) : 0;
  
  if (version > 0 && version < 0.8) {
    findings.push({
      category: 'Outdated Compiler',
      severity: 'medium',
      description: `Using Solidity ${version} (<0.8.0) without overflow protection`,
      location: `${filename}:1`,
      recommendation: 'Update to Solidity 0.8+ for built-in overflow checks.',
    });
  }
  return findings;
}

function deduplicate(findings) {
  const seen = new Set();
  const unique = [];
  for (const finding of findings) {
    const key = `${finding.category}:${finding.location}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(finding);
    }
  }
  return unique;
}

const timeout = (prom, ms) => Promise.race([
  prom,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
]);

async function analyzeSolidityCode(sourceCode, filename = 'Contract.sol') {
  const lines = sourceCode.split('\n');
  let findings = [];
  
  const detectorFns = [
    detectVersionPragma,
    detectReentrancy,
    detectIntegerArithmetic,
    detectTxOrigin,
    detectUncheckedCalls,
    detectDelegatecall,
    detectAccessControl,
    detectTimestampDependence,
  ];

  const detectorPromises = detectorFns.map((fn) =>
    timeout(Promise.resolve(fn(sourceCode, lines, filename)), 5000)
  );

  const settled = await Promise.allSettled(detectorPromises);
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      findings.push(...result.value);
    } else {
      console.warn(`Solidity detector failed: ${detectorFns[index].name} - ${result.reason?.message || result.reason}`);
    }
  });

  findings = deduplicate(findings);
  
  const severityScore = { critical: 25, high: 15, medium: 10, low: 5 };
  const riskScore = Math.min(100, findings.reduce((sum, f) => sum + (severityScore[f.severity] || 1), 0));
  
  return { filename, findings, totalFindings: findings.length, riskScore };
}

// ============================================
// INFURA INTEGRATION
// ============================================
const { getContractBytecode } = require('./infura-client');
const solanaDetectors = require('./solana-detectors');

async function analyzeBytecodeViaInfura(address, chain = 'mainnet') {
  const bytecode = await getContractBytecode(address, chain);
  const findings = [];
  
  if (/(f4|F4)/.test(bytecode) && !bytecode.includes('6080604052')) {
    findings.push({ category: 'Delegatecall', severity: 'medium', description: 'Contract uses delegatecall.' });
  }
  
  if (/(ff|FF)/.test(bytecode)) {
    findings.push({ category: 'Selfdestruct', severity: 'high', description: 'Contract contains selfdestruct.' });
  }
  
  return { address, chain, bytecodeSize: bytecode.length / 2 - 1, findings };
}

// ============================================
// SOLANA INTEGRATION
// ============================================
const { getProgramInfo } = require('./solana-client');

async function analyzeSolanaProgram(programId, network = 'mainnet') {
  const info = await getProgramInfo(programId, network);
  const findings = [];

  const detectorPromises = solanaDetectors.detectors.map((detector) =>
    timeout(Promise.resolve(detector(info)), 5000)
  );

  const settled = await Promise.allSettled(detectorPromises);
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      findings.push(...result.value);
    } else {
      console.warn(`Solana detector failed: ${solanaDetectors.detectors[index].name || 'anonymous'} - ${result.reason?.message || result.reason}`);
    }
  });

  const riskScore = findings.reduce((sum, f) => sum + (f.severity === 'medium' ? 10 : 5), 0);
  return { programId, network, executable: info.executable, findings, riskScore };
}

module.exports = {
  analyzeSolidityCode,
  analyzeBytecodeViaInfura,
  analyzeSolanaProgram,
};
