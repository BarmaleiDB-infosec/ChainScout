const UPGRADEABLE_LOADER = 'BPFLoaderUpgradeab1e11111111111111111111111';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';

function detectUpgradeableAnchorProgram(info) {
  if (info.owner === UPGRADEABLE_LOADER && info.executable) {
    return [
      {
        category: 'Upgradeable Anchor Program',
        severity: 'medium',
        description: 'This Solana program is deployed with the upgradeable loader, which is common for Anchor programs.',
        location: `Program ${info.programId}`,
        recommendation: 'Verify the upgrade authority and consider using a non-upgradeable deployment for production-critical contracts.',
      },
    ];
  }
  return [];
}

function detectNonExecutableProgram(info) {
  if (!info.executable) {
    return [
      {
        category: 'Non-Executable Program',
        severity: 'high',
        description: 'The provided program account is not executable. It may not be a valid deployed Solana program.',
        location: `Program ${info.programId}`,
        recommendation: 'Confirm the program ID points to an actual executable program account on the selected network.',
      },
    ];
  }
  return [];
}

function detectSystemOwnedProgram(info) {
  if (info.owner === SYSTEM_PROGRAM) {
    return [
      {
        category: 'System Program Owner',
        severity: 'high',
        description: 'Program account is owned by the Solana System Program, which is not valid for executable BPF programs.',
        location: `Program ${info.programId}`,
        recommendation: 'Verify the program ID and ensure it points to a real deployed BPF program account.',
      },
    ];
  }
  return [];
}

function detectLargeProgramSize(info) {
  if (info.dataSize > 200000) {
    return [
      {
        category: 'Large Program Size',
        severity: 'medium',
        description: 'The program account data is unusually large, which can increase deployment cost and attack surface.',
        location: `Program ${info.programId}`,
        recommendation: 'Audit the program for unused code, optimize binary size, or split logic into smaller programs.',
      },
    ];
  }
  return [];
}

function detectLowLamportsBalance(info) {
  if (info.lamports !== null && info.lamports < 1000) {
    return [
      {
        category: 'Low Program Balance',
        severity: 'low',
        description: 'The program account has a very low lamports balance, which may indicate a stale or inactive deployment.',
        location: `Program ${info.programId}`,
        recommendation: 'Check whether the program is still active and funded correctly for rent exemption.',
      },
    ];
  }
  return [];
}

const detectors = [
  detectUpgradeableAnchorProgram,
  detectNonExecutableProgram,
  detectSystemOwnedProgram,
  detectLargeProgramSize,
  detectLowLamportsBalance,
];

function runSolanaDetectors(info) {
  return detectors.flatMap((detector) => detector(info));
}

module.exports = {
  detectors,
  runSolanaDetectors,
};
