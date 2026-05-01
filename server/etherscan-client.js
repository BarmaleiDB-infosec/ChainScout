/**
 * Etherscan API Integration
 * Retrieves smart contract source code, ABI, and metadata from blockchain explorer
 */

const axios = require('axios');

const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';
const ETHERSCAN_TESTNET_URLS = {
  sepolia: 'https://api-sepolia.etherscan.io/api',
  goerli: 'https://api-goerli.etherscan.io/api',
};

/**
 * Get contract source code from Etherscan
 * @param {string} address - Contract address (0x...)
 * @param {string} chain - Blockchain (mainnet, sepolia, goerli)
 * @returns {Object} Contract source code and metadata
 */
async function getContractSourceCode(address, chain = 'mainnet') {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  
  // Enhanced error handling for missing API key
  if (!apiKey || apiKey === 'YOUR_ETHERSCAN_API_KEY' || apiKey.trim() === '') {
    throw new Error(
      'Etherscan API key not configured. Set ETHERSCAN_API_KEY environment variable. ' +
      'Get one from: https://etherscan.io/apis'
    );
  }

  // Normalize address
  const normalizedAddress = normalizeAddress(address);
  const baseUrl = ETHERSCAN_TESTNET_URLS[chain] || ETHERSCAN_API_URL;

  try {
    const response = await axios.get(baseUrl, {
      params: {
        module: 'contract',
        action: 'getsourcecode',
        address: normalizedAddress,
        apikey: apiKey,
        chainid: chain === "mainnet" ? 1 : chain === "sepolia" ? 11155111 : chain === "goerli" ? 5 : 1,
      },
      timeout: 30000,
    });

	const result = response.data?.result?.[0] || {};    
    // Enhanced error handling for unverified contracts
    if (!result) {
      throw new Error(
        `Contract ${normalizedAddress} not found on ${chain}. ` +
        'Verify it exists and is deployed on the correct network.'
      );
    }
    
    if (result.SourceCode === '') {
      throw new Error(
        `Contract ${normalizedAddress} is not verified on ${chain}. ` +
        'Only verified contracts can be analyzed. ' +
        'Please verify it on Etherscan first.'
      );
    }

    return {
      address: normalizedAddress,
      chain,
      name: result.ContractName,
      sourceCode: result.SourceCode ? parseSourceCode(result.SourceCode) : {},
      abi: result.ABI ? JSON.parse(result.ABI) : null,
      compilerVersion: result.CompilerVersion,
      isOptimized: result.OptimizationUsed === '1',
      constructorArguments: result.ConstructorArguments || '',
      proxy: result.Proxy === '1',
      implementation: result.Implementation || null,
      verifiedAt: result.TimeStamp ? new Date(result.TimeStamp * 1000).toISOString() : null,
    };
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error(
        'Etherscan API rate limit exceeded. The free tier allows limited requests. ' +
        'Try again in a moment or upgrade your API key.'
      );
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Etherscan API request timeout. Network may be slow. Try again.');
    }
    // Re-throw with enhanced context
    throw error instanceof Error ? error : 
      new Error(`Failed to fetch contract from Etherscan: ${error.message}`);
  }
}

/**
 * Get contract ABI
 */
async function getContractABI(address, chain = 'mainnet') {
  const contract = await getContractSourceCode(address, chain);
  return contract.abi;
}

/**
 * Get multiple contracts' source code
 */
async function getMultipleContracts(addresses, chain = 'mainnet') {
  const results = {};
  
  for (const address of addresses) {
    try {
      results[address] = await getContractSourceCode(address, chain);
      // Rate limit: Etherscan allows ~5 requests/sec for free tier
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      results[address] = { error: error.message };
    }
  }
  
  return results;
}

/**
 * Parse source code (handles multi-file JSON format)
 */
function parseSourceCode(sourceCode) {
  // Handle multi-file format from newer compiler versions
  if (sourceCode.startsWith('{{') || sourceCode.startsWith('{')) {
    try {
      const parsed = JSON.parse(sourceCode.slice(1, -1));
      if (parsed.sources && typeof parsed.sources === 'object') {
        // Multi-file format
        const files = {};
        for (const [filename, data] of Object.entries(parsed.sources)) {
          files[filename] = data.content || data;
        }
        return files;
      }
    } catch (e) {
      // Fall through to single file
    }
  }
  
  // Single file format
  return { 'Contract.sol': sourceCode };
}

/**
 * Normalize Ethereum address
 */
function normalizeAddress(address) {
  if (!address) throw new Error('Empty address');
  if (!address.startsWith('0x') || address.length !== 42) {
    throw new Error('Invalid Ethereum address');
  }
  return address.toLowerCase();
}

/**
 * Detect blockchain from address using multiple RPCs
 */
async function detectChainFromAddress(address) {
  const normalizedAddress = normalizeAddress(address);
  
  // Try common RPC endpoints
  const rpcEndpoints = {
    mainnet: 'https://eth.rpc.blxrbdn.com',
    sepolia: 'https://rpc.sepolia.org',
  };

  for (const [chain, rpcUrl] of Object.entries(rpcEndpoints)) {
    try {
      const response = await axios.post(
        rpcUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getCode',
          params: [normalizedAddress, 'latest'],
        },
        { timeout: 5000 }
      );

      if (response.data?.result && response.data.result !== '0x') {
        return chain; // Contract exists on this chain
      }
    } catch (error) {
      // RPC failed, try next
    }
  }

  throw new Error('Could not detect chain from address');
}

/**
 * Batch verify multiple addresses are contracts
 */
async function verifyContracts(addresses, chain = 'mainnet') {
  const verified = {};
  const rpcUrl = chain === 'mainnet'
    ? 'https://eth.rpc.blxrbdn.com'
    : `https://rpc.${chain}.org`;

  for (const address of addresses) {
    try {
      const response = await axios.post(
        rpcUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getCode',
          params: [normalizeAddress(address), 'latest'],
        },
        { timeout: 5000 }
      );

      verified[address] = response.data?.result !== '0x';
    } catch (error) {
      verified[address] = null; // Unknown
    }
  }

  return verified;
}

module.exports = {
  getContractSourceCode,
  getContractABI,
  getMultipleContracts,
  normalizeAddress,
  detectChainFromAddress,
  verifyContracts,
  parseSourceCode,
  ETHERSCAN_API_URL,
  ETHERSCAN_TESTNET_URLS,
};
