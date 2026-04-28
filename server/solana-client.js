/**
 * Solana RPC Client for ChainScout
 * Fetches program code, accounts, and transactions from Solana blockchain
 */

const axios = require('axios');

// Public RPC endpoints
const SOLANA_RPC_URLS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

async function solanaRpcCall(method, params = [], network = 'mainnet') {
  const rpcUrl = SOLANA_RPC_URLS[network];
  if (!rpcUrl) throw new Error(`Unsupported Solana network: ${network}`);

  try {
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }, { timeout: 15000 });

    if (response.data?.error) {
      throw new Error(`Solana RPC Error: ${response.data.error.message}`);
    }
    return response.data.result;
  } catch (error) {
    throw new Error(`Solana RPC call failed: ${error.message}`);
  }
}

async function getProgramInfo(programId, network = 'mainnet') {
  try {
    const accountInfo = await solanaRpcCall('getAccountInfo', [
      programId,
      { encoding: 'base64' },
    ], network);

    if (!accountInfo?.value) {
      throw new Error(`Program not found: ${programId}`);
    }

    return {
      programId,
      network,
      owner: accountInfo.value.owner,
      executable: accountInfo.value.executable,
      lamports: accountInfo.value.lamports,
      dataSize: accountInfo.value.data?.length || 0,
      rentEpoch: accountInfo.value.rentEpoch,
    };
  } catch (error) {
    throw new Error(`Failed to get Solana program info: ${error.message}`);
  }
}

async function getMultiplePrograms(programIds, network = 'mainnet') {
  const results = {};
  for (const programId of programIds) {
    try {
      results[programId] = await getProgramInfo(programId, network);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      results[programId] = { error: error.message };
    }
  }
  return results;
}

async function programExists(programId, network = 'mainnet') {
  try {
    const info = await getProgramInfo(programId, network);
    return info.executable === true;
  } catch {
    return false;
  }
}

async function getCurrentSlot(network = 'mainnet') {
  return await solanaRpcCall('getSlot', [], network);
}

async function getTransaction(signature, network = 'mainnet') {
  return await solanaRpcCall('getTransaction', [
    signature,
    { encoding: 'json', maxSupportedTransactionVersion: 0 },
  ], network);
}

module.exports = {
  solanaRpcCall,
  getProgramInfo,
  getMultiplePrograms,
  programExists,
  getCurrentSlot,
  getTransaction,
  SOLANA_RPC_URLS,
};
