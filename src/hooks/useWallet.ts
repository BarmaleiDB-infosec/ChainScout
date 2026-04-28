import { useCallback, useMemo, useState } from 'react';

type WalletChain = 'ethereum' | 'solana';

type WalletState = {
  address: string | null;
  chain: WalletChain | null;
  isConnecting: boolean;
  error: string | null;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chain: null,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async (chain: WalletChain) => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));

    try {
      if (chain === 'ethereum') {
        const eth = (window as any).ethereum as
          | { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
          | undefined;

        if (!eth?.request) {
          throw new Error('Ethereum wallet not found');
        }

        const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[] | unknown;
        const address = Array.isArray(accounts) ? accounts[0] : null;
        if (!address) {
          throw new Error('No Ethereum account returned');
        }

        setState({ address, chain: 'ethereum', isConnecting: false, error: null });
        return address;
      }

      const sol = (window as any).solana as
        | { connect: () => Promise<{ publicKey?: { toString: () => string } }> }
        | undefined;

      if (!sol?.connect) {
        throw new Error('Solana wallet not found');
      }

      const res = await sol.connect();
      const address = res?.publicKey?.toString?.() || null;
      if (!address) {
        throw new Error('No Solana public key returned');
      }

      setState({ address, chain: 'solana', isConnecting: false, error: null });
      return address;
    } catch (err) {
      const message = getErrorMessage(err);
      setState((s) => ({ ...s, isConnecting: false, error: message }));
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, chain: null, isConnecting: false, error: null });
  }, []);

  return useMemo(
    () => ({
      address: state.address,
      chain: state.chain,
      connect,
      disconnect,
      isConnecting: state.isConnecting,
      error: state.error,
    }),
    [connect, disconnect, state.address, state.chain, state.error, state.isConnecting]
  );
}

