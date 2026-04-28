/**
 * Infura RPC Client for ChainScout
 * Provides JSON-RPC access to Ethereum, Polygon, and other networks
 */

const axios = require('axios');

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const INFURA_RPC_URLS = {
  mainnet: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
  sepolia: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
  polygon: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
};

async function rpcCall(method, params = [], chain = 'mainnet') {
  const rpcUrl = INFURA_RPC_URLS[chain];
  if (!rpcUrl) throw new Error(`Unsupported chain: ${chain}`);

  try {
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }, { timeout: 15000 });

    if (response.data?.error) {
      throw new Error(`RPC Error: ${response.data.error.message}`);
    }
    return response.data.result;
  } catch (error) {
    throw new Error(`Infura RPC call failed: ${error.message}`);
  }
}

async function getContractBytecode(address, chain = 'mainnet') {
  const bytecode = await rpcCall('eth_getCode', [address, 'latest'], chain);
  if (!bytecode || bytecode === '0x') {
    throw new Error(`No contract found at ${address} on ${chain}`);
  }
  return bytecode;
}

async function getBalance(address, chain = 'mainnet') {
  return await rpcCall('eth_getBalance', [address, 'latest'], chain);
}

async function getBlockNumber(chain = 'mainnet') {
  return await rpcCall('eth_blockNumber', [], chain);
}

async function contractExists(address, chain = 'mainnet') {
  try {
    const bytecode = await getContractBytecode(address, chain);
    return bytecode !== '0x' && bytecode.length > 2;
  } catch {
    return false;
  }
}

module.exports = {
  rpcCall,
  getContractBytecode,
  getBalance,
  getBlockNumber,
  contractExists,
  INFURA_RPC_URLS,
};
