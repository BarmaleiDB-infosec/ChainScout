/**
 * Web3 Surface Scanner — Detect wallet integrations and security risks
 */

function analyzeWeb3Surface(html, url) {
  const findings = [];
  
  // Wallet SDK detection
  const wallets = {
    metamask: /(ethereum|isMetaMask|window\.ethereum)/i,
    walletconnect: /(WalletConnect|@walletconnect|wc:|bridge\.walletconnect)/i,
    coinbase: /(coinbaseWallet|isCoinbaseWallet|@coinbase\/wallet)/i,
    trustwallet: /(trustWallet|isTrustWallet)/i,
    phantom: /(phantom|solana)/i,
    rainbow: /(RainbowWallet|rainbowkit)/i
  };
  
  const detectedWallets = [];
  for (const [name, pattern] of Object.entries(wallets)) {
    if (pattern.test(html)) {
      detectedWallets.push(name);
    }
  }
  
  if (detectedWallets.length > 0) {
    findings.push({
      category: 'Web3 Integration',
      severity: 'info',
      description: `Detected wallet SDKs: ${detectedWallets.join(', ')}`,
      location: url,
      recommendation: 'Verify signature requests, chain validation, and phishing protection.'
    });
  }
  
  // Risky patterns
  const riskyPatterns = [
    { pattern: /personal_sign/, risk: 'Eth sign phishing', severity: 'medium' },
    { pattern: /eth_signTypedData/, risk: 'Structured data signing', severity: 'medium' },
    { pattern: /wallet_watchAsset/, risk: 'Token spoofing', severity: 'low' },
    { pattern: /wallet_addEthereumChain/, risk: 'Chain switching attack', severity: 'medium' },
    { pattern: /ethereum\.request.*method/, risk: 'Wallet permission request', severity: 'info' }
  ];
  
  for (const item of riskyPatterns) {
    if (item.pattern.test(html)) {
      const lineIndex = html.split('\n').findIndex(line => item.pattern.test(line)) + 1;
      findings.push({
        category: 'Web3 Risk',
        severity: item.severity,
        description: `${item.risk} detected`,
        location: `${url}:${lineIndex || 'unknown'}`,
        recommendation: `Review ${item.risk.toLowerCase()} implementation.`
      });
    }
  }
  
  // Check for chain validation
  if (!html.includes('chainId') && !html.includes('chain_id')) {
    findings.push({
      category: 'Chain Validation',
      severity: 'medium',
      description: 'Missing chainId validation',
      location: url,
      recommendation: 'Always validate chainId before sending transactions.'
    });
  }
  
  // Check for phishing protection
  if (!html.includes('domain') && !html.includes('origin')) {
    findings.push({
      category: 'Phishing Protection',
      severity: 'low',
      description: 'No domain/origin validation for signatures',
      location: url,
      recommendation: 'Add domain validation to signing requests.'
    });
  }
  
  return { findings, detectedWallets, url };
}

module.exports = { analyzeWeb3Surface };
