/**
 * ChainScout Security Engine
 * Detects 7 critical Solidity vulnerability categories
 * 
 * Categories:
 * 1. Reentrancy attacks (call stack depth/state manipulation)
 * 2. Integer overflow/underflow
 * 3. tx.origin misuse (authorization bypass)
 * 4. Unchecked calls (ignored return values)
 * 5. Delegatecall misuse (code injection)
 * 6. Access control issues
 * 7. Timestamp dependence (block time manipulation)
 */

const fs = require('fs');
const path = require('path');

// Regex patterns for vulnerability detection
const PATTERNS = {
  // 1. Reentrancy
  reentrancy: [
    /\.call\s*(\{[^}]*\})?\s*\(\s*\)/,  // .call()
    /\.call\.value\s*\(/,                 // .call.value()
    /\.transfer\s*\(.*\)\s*;[^}]*\1/,     // transfer but then use state
    /\.send\s*\(/,                        // .send()
    /require\s*\(\s*[a-zA-Z_][a-zA-Z0-9_]*\.call/,  // require().call
  ],
  
  // 2. Integer overflow/underflow
  integerArithmetic: [
    /[a-zA-Z_][a-zA-Z0-9_]*\s*\+=\s*[a-zA-Z_]/,      // += non-constant
    /[a-zA-Z_][a-zA-Z0-9_]*\s*-=\s*[a-zA-Z_]/,      // -= non-constant
    /[a-zA-Z_][a-zA-Z0-9_]*\s*\*=\s*[a-zA-Z_]/,     // *= non-constant
    /[a-zA-Z_][a-zA-Z0-9_]*\s*\/=\s*[a-zA-Z_]/,     // /= non-constant
    /require\s*\([^)]*<\s*[a-zA-Z_]/,               // underflow check
    /require\s*\([^)]*>\s*[a-zA-Z_]/,               // overflow check
  ],
  
  // 3. tx.origin misuse
  txOrigin: [
    /tx\.origin/,                                     // Direct tx.origin use
    /require\s*\(\s*tx\.origin\s*==\s*msg\.sender/,  // tx.origin == msg.sender
    /if\s*\(\s*tx\.origin\s*!=\s*msg\.sender/,       // Conditional on tx.origin
  ],
  
  // 4. Unchecked calls
  uncheckedCalls: [
    /\.call\s*(\{[^}]*\})?\s*\(\s*\);(?!\s*require|\s*assert)/,  // .call() not checked
    /\.send\s*\([^)]*\);(?!\s*require|\s*assert)/,               // .send() not checked
    /\.transfer\s*\([^)]*\);(?!\s*require|\s*assert)/,           // transfer could fail
    /address\s*\([a-zA-Z_][a-zA-Z0-9_]*\)\.call\(/,             // Unchecked delegatecall
  ],
  
  // 5. Delegatecall misuse
  delegatecall: [
    /delegatecall\s*\(/,                             // delegatecall usage
    /delegatecall\s*\([^)]*\)(?!\s*require|\s*assert)/,  // unchecked delegatecall
    /assembly\s*{[^}]*delegatecall/,                 // delegatecall in assembly
  ],
  
  // 6. Access control issues
  accessControl: [
    /public\s+function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*(?!internal|private|external)/,  // public functions
    /function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*(?:public|external)\s*{[^}]*selfdestruct/,  // public selfdestruct
    /function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*(?:public|external)\s*{[^}]*\.call\s*\{value:/,  // public payable
  ],
  
  // 7. Timestamp dependence
  timestampDependence: [
    /require\s*\(\s*block\.timestamp\s*[<>]=?\s*\d+/,  // timestamp comparison
    /if\s*\(\s*block\.timestamp/,                        // conditional on timestamp
    /now\s*[<>=!]+/,                                     // 'now' comparisons (deprecated but used)
  ],
};

/**
 * Analyze Solidity source code for vulnerabilities
 * @param {string} sourceCode - Raw Solidity code
 * @param {string} filename - Original filename
 * @returns {Array} Array of findings
 */
function analyzeSolidityCode(sourceCode, filename) {
  const findings = [];
  const lines = sourceCode.split('\n');
  
  // Check for each vulnerability category
  findings.push(...detectReentrancy(sourceCode, lines, filename));
  findings.push(...detectIntegerArithmetic(sourceCode, lines, filename));
  findings.push(...detectTxOrigin(sourceCode, lines, filename));
  findings.push(...detectUncheckedCalls(sourceCode, lines, filename));
  findings.push(...detectDelegatecall(sourceCode, lines, filename));
  findings.push(...detectAccessControl(sourceCode, lines, filename));
  findings.push(...detectTimestampDependence(sourceCode, lines, filename));
  
  // Deduplicate and score findings
  return deduplicateFindings(findings);
}

/**
 * 1. Detect Reentrancy vulnerabilities
 */
function detectReentrancy(sourceCode, lines, filename) {
  const findings = [];
  let lineNum = 0;
  let inFunction = false;
  let callStack = [];
  
  lines.forEach((line, index) => {
    lineNum = index + 1;
    
    // Track function boundaries
    if (/function\s+\w+\s*\(/.test(line)) inFunction = true;
    if (inFunction && /^\s*}/.test(line)) inFunction = false;
    
    // Check for dangerous patterns
    PATTERNS.reentrancy.forEach(pattern => {
      if (pattern.test(line)) {
        // Check if state is modified after call
        const remainingCode = lines.slice(index).join('\n');
        const stateModification = /\w+\s*[+\-*/=]+|require|assert|revert/;
        
        if (stateModification.test(remainingCode.substring(0, 500))) {
          findings.push({
            id: `reentrancy-${lineNum}`,
            title: 'Potential Reentrancy Vulnerability',
            category: 'reentrancy',
            severity: 'high',
            confidence: 'medium',
            confidenceScore: 0.75,
            description: 'Function performs external call (.call, .send, .transfer) and may modify state. Vulnerable to reentrancy attacks if state is not properly protected.',
            evidence: `Line ${lineNum}: ${line.trim()}`,
            location: `${filename}:${lineNum}`,
            tool: 'chainscout-engine',
            recommendation: 'Use Checks-Effects-Interactions pattern. Check state before external calls, update effects after.',
            references: ['https://solidity-by-example.org/hacks/re-entrancy/'],
          });
        }
      }
    });
  });
  
  return findings;
}

/**
 * 2. Detect Integer Overflow/Underflow
 */
function detectIntegerArithmetic(sourceCode, lines, filename) {
  const findings = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for arithmetic without SafeMath or Solidity 0.8+
    const arithmeticPatterns = [
      { pattern: /uint\d*\s+\w+\s*=[^;]*[+\-*/]/,  op: 'arithmetic' },
      { pattern: /\w+\s+\+=\s*\w+/, op: '+=' },
      { pattern: /\w+\s+-=\s*\w+/, op: '-=' },
      { pattern: /\w+\s+\*=\s*\w+/, op: '*=' },
      { pattern: /\w+\s+\/=\s*\w+/, op: '/=' },
    ];
    
    arithmeticPatterns.forEach(({ pattern, op }) => {
      if (pattern.test(line)) {
        // Check if using SafeMath or pragma >= 0.8
        if (!/SafeMath|solidity\s+>=\s*0\.8/.test(sourceCode)) {
          findings.push({
            id: `integer-arithmetic-${lineNum}`,
            title: `Potential Integer ${op === '+=' ? 'Overflow' : 'Underflow'} (${op})`,
            category: 'integer-arithmetic',
            severity: 'high',
            confidence: 'medium',
            confidenceScore: 0.72,
            description: `Arithmetic operation ${op} detected without SafeMath library or Solidity >= 0.8.0. Vulnerable to over/underflow attacks.`,
            evidence: `Line ${lineNum}: ${line.trim()}`,
            location: `${filename}:${lineNum}`,
            tool: 'chainscout-engine',
            recommendation: 'Use Solidity >= 0.8.0 (automatic overflow protection) or SafeMath library for older versions.',
            references: ['https://docs.soliditylang.org/en/latest/080-breaking-changes.html'],
          });
        }
      }
    });
  });
  
  return findings;
}

/**
 * 3. Detect tx.origin misuse
 */
function detectTxOrigin(sourceCode, lines, filename) {
  const findings = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    if (/tx\.origin/.test(line)) {
      findings.push({
        id: `tx-origin-${lineNum}`,
        title: 'Use of tx.origin for Authorization',
        category: 'tx-origin-misuse',
        severity: 'high',
        confidence: 'high',
        confidenceScore: 0.95,
        description: 'tx.origin should never be used for authentication or authorization. It refers to the original transaction sender, not the immediate caller. Vulnerable to phishing attacks.',
        evidence: `Line ${lineNum}: ${line.trim()}`,
        location: `${filename}:${lineNum}`,
        tool: 'chainscout-engine',
        recommendation: 'Use msg.sender for authorization instead of tx.origin. tx.origin is only safe for logging.',
        references: ['https://solidity-by-example.org/hacks/phishing-with-tx-origin/'],
      });
    }
  });
  
  return findings;
}

/**
 * 4. Detect Unchecked Calls
 */
function detectUncheckedCalls(sourceCode, lines, filename) {
  const findings = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for call/send/transfer without require/assert
    const uncheckedPatterns = [
      { pattern: /\.call\s*(\{[^}]*\})?\s*\(\s*\)\s*;/, method: '.call()' },
      { pattern: /\.send\s*\([^)]*\)\s*;/, method: '.send()' },
      { pattern: /\.transfer\s*\([^)]*\)\s*;/, method: '.transfer()' },
    ];
    
    uncheckedPatterns.forEach(({ pattern, method }) => {
      if (pattern.test(line)) {
        // Check if wrapped in require/assert
        const isChecked = /require|assert/.test(line);
        if (!isChecked) {
          findings.push({
            id: `unchecked-call-${lineNum}`,
            title: `Unchecked ${method} Return Value`,
            category: 'unchecked-calls',
            severity: 'high',
            confidence: 'high',
            confidenceScore: 0.9,
            description: `${method} return value is not checked. External call failure will be silently ignored, potentially leading to unexpected behavior.`,
            evidence: `Line ${lineNum}: ${line.trim()}`,
            location: `${filename}:${lineNum}`,
            tool: 'chainscout-engine',
            recommendation: `Always wrap ${method} in require() or assert() to handle failure cases.`,
            references: ['https://solidity-by-example.org/call/'],
          });
        }
      }
    });
  });
  
  return findings;
}

/**
 * 5. Detect Delegatecall Misuse
 */
function detectDelegatecall(sourceCode, lines, filename) {
  const findings = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    if (/delegatecall/.test(line)) {
      const isChecked = /require|assert/.test(line);
      
      findings.push({
        id: `delegatecall-${lineNum}`,
        title: 'delegatecall() Usage Detected',
        category: 'delegatecall-misuse',
        severity: isChecked ? 'medium' : 'high',
        confidence: 'high',
        confidenceScore: 0.88,
        description: 'delegatecall() is a powerful but dangerous feature. It executes code in the caller\'s context. Vulnerable to code injection if untrusted addresses are delegated to.',
        evidence: `Line ${lineNum}: ${line.trim()}`,
        location: `${filename}:${lineNum}`,
        tool: 'chainscout-engine',
        recommendation: 'Only delegatecall to trusted, audited contracts. Verify that delegated contracts cannot modify storage unexpectedly.',
        references: ['https://solidity-by-example.org/delegatecall/'],
      });
    }
  });
  
  return findings;
}

/**
 * 6. Detect Access Control Issues
 */
function detectAccessControl(sourceCode, lines, filename) {
  const findings = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for public functions without access modifiers
    if (/function\s+\w+\s*\([^)]*\)\s*public\s*{/.test(line) && !/onlyOwner|onlyAdmin|require/.test(line)) {
      findings.push({
        id: `access-control-${lineNum}`,
        title: 'Missing Access Control on Public Function',
        category: 'access-control',
        severity: 'medium',
        confidence: 'medium',
        confidenceScore: 0.65,
        description: 'Public function lacks access control modifiers. Any address can call this function, potentially leading to unauthorized actions.',
        evidence: `Line ${lineNum}: ${line.trim()}`,
        location: `${filename}:${lineNum}`,
        tool: 'chainscout-engine',
        recommendation: 'Add onlyOwner, onlyAdmin, or similar access control modifiers to sensitive functions.',
        references: ['https://docs.openzeppelin.com/contracts/4.x/access-control'],
      });
    }
    
    // Check for selfdestruct in public functions
    if (/selfdestruct/.test(line) && /function/.test(sourceCode.split('\n')[index - 5] || '')) {
      findings.push({
        id: `access-control-selfdestruct-${lineNum}`,
        title: 'selfdestruct() in Accessible Function',
        category: 'access-control',
        severity: 'critical',
        confidence: 'high',
        confidenceScore: 0.9,
        description: 'selfdestruct() can destroy the entire contract without permission checking. This could be catastrophic.',
        evidence: `Line ${lineNum}: ${line.trim()}`,
        location: `${filename}:${lineNum}`,
        tool: 'chainscout-engine',
        recommendation: 'Restrict selfdestruct with onlyOwner modifier. Consider if contract destruction is really necessary.',
        references: ['https://solidity-by-example.org/selfdestruct/'],
      });
    }
  });
  
  return findings;
}

/**
 * 7. Detect Timestamp Dependence
 */
function detectTimestampDependence(sourceCode, lines, filename) {
  const findings = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for block.timestamp or 'now' usage
    if (/block\.timestamp|now\s*[<>=!]/.test(line)) {
      // Check if it's a simple comparison or used for critical logic
      const isCritical = /require\s*\([^)]*block\.timestamp|if\s*\([^)]*block\.timestamp/.test(line);
      
      findings.push({
        id: `timestamp-dependence-${lineNum}`,
        title: 'Timestamp Dependence Detected',
        category: 'timestamp-dependence',
        severity: isCritical ? 'medium' : 'low',
        confidence: 'medium',
        confidenceScore: 0.7,
        description: 'Contract logic depends on block.timestamp. Miners can manipulate timestamps within ~15 seconds. Safe for timescales > 15 minutes, but risky for shorter intervals.',
        evidence: `Line ${lineNum}: ${line.trim()}`,
        location: `${filename}:${lineNum}`,
        tool: 'chainscout-engine',
        recommendation: 'Use block.timestamp only for coarse-grained timescales (> 15 minutes). For precise timing, use alternative mechanisms.',
        references: ['https://solidity-by-example.org/hacks/block-timestamp-manipulation/'],
      });
    }
  });
  
  return findings;
}

/**
 * Remove duplicate findings and consolidate similar issues
 */
function deduplicateFindings(findings) {
  const seen = new Set();
  const deduplicated = [];
  
  findings.forEach(finding => {
    const key = `${finding.category}-${finding.location}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(finding);
    }
  });
  
  return deduplicated;
}

// Export functions
module.exports = { analyzeBytecodeViaInfura, contractExists, analyzeSolanaProgram, programExists,
  analyzeSolidityCode,
  detectReentrancy,
  detectIntegerArithmetic,
  detectTxOrigin,
  detectUncheckedCalls,
  detectDelegatecall,
  detectAccessControl,
  detectTimestampDependence,
};

// ============================================
// INFURA INTEGRATION — Bytecode-based analysis
// ============================================
const { getContractBytecode, contractExists } = require("./infura-client");

async function analyzeBytecodeViaInfura(address, chain = "mainnet") {
  const bytecode = await getContractBytecode(address, chain);
  const findings = [];
  
  if (bytecode.includes("f4") || bytecode.includes("F4")) {
    findings.push({
      category: "Delegatecall Detected",
      severity: "medium",
      description: "Contract uses delegatecall (detected in bytecode). Verify target addresses are trusted.",
    });
  }
  
  if (bytecode.includes("ff") || bytecode.includes("FF")) {
    findings.push({
      category: "Selfdestruct Detected",
      severity: "high",
      description: "Contract contains selfdestruct opcode. Review authorization logic.",
    });
  }
  
  if (bytecode.includes("42") && bytecode.includes("43")) {
    findings.push({
      category: "Timestamp Usage",
      severity: "low",
      description: "Contract uses block.timestamp or block.number. Verify no critical logic depends on them.",
    });
  }
  
  return {
    address,
    chain,
    bytecodeSize: bytecode.length / 2 - 1,
    findings,
    hasDelegatecall: bytecode.includes("f4") || bytecode.includes("F4"),
    hasSelfdestruct: bytecode.includes("ff") || bytecode.includes("FF"),
  };
}
// ============================================
// SOLANA INTEGRATION — Program analysis
// ============================================
const { getProgramInfo, programExists } = require("./solana-client");

async function analyzeSolanaProgram(programId, network = "mainnet") {
  const info = await getProgramInfo(programId, network);
  const findings = [];
  
  const UPGRADEABLE_LOADER = "BPFLoaderUpgradeab1e11111111111111111111111";
  if (info.owner === UPGRADEABLE_LOADER) {
    findings.push({
      category: "Upgradeable Program",
      severity: "medium",
      description: "Program is upgradeable. Verify the upgrade authority is secure (multi-sig or governance).",
      recommendation: "Use a multi-sig or governance-controlled upgrade authority.",
    });
  }
  
  if (info.dataSize < 1000 && info.executable) {
    findings.push({
      category: "Small Program Size",
      severity: "low",
      description: "Program bytecode is very small. It might be a proxy pointing to another program.",
      recommendation: "Verify the proxy destination is trusted.",
    });
  }
  
  if (!info.executable) {
    findings.push({
      category: "Not Executable",
      severity: "info",
      description: "This account is not an executable program. It might be a regular account or data account.",
    });
  }
  
  return {
    programId,
    network,
    executable: info.executable,
    owner: info.owner,
    dataSize: info.dataSize,
    findings,
    riskScore: findings.reduce((sum, f) => {
      if (f.severity === "critical") return sum + 25;
      if (f.severity === "high") return sum + 15;
      if (f.severity === "medium") return sum + 10;
      if (f.severity === "low") return sum + 5;
      return sum + 1;
    }, 0),
  };
}
