import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';

export function useDevnetVerification() {
  const { publicKey, wallet, connected } = useWallet();
  const { connection } = useConnection();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (!connected || !publicKey || !wallet) {
        setShowNetworkWarning(false);
        setIsCorrectNetwork(true);
        return;
      }

      try {
        // Get the genesis hash to determine which network we're on
        const genesisHash = await connection.getGenesisHash();

        // Devnet genesis hash
        const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';

        const onDevnet = genesisHash === DEVNET_GENESIS;
        setIsCorrectNetwork(onDevnet);

        if (!onDevnet) {
          setShowNetworkWarning(true);
          console.warn('⚠️ Wallet is not connected to Solana Devnet!');
          console.warn('Please switch your wallet to Devnet:');
          console.warn('  1. Open your wallet (Phantom/Solflare)');
          console.warn('  2. Go to Settings');
          console.warn('  3. Change Network to "Devnet"');
          console.warn('  4. Reconnect your wallet');

          // Show browser alert
          alert(
            '⚠️ Wrong Network Detected!\n\n' +
            'Your wallet is not connected to Solana Devnet.\n\n' +
            'To use this application:\n' +
            '1. Open your wallet (Phantom/Solflare)\n' +
            '2. Go to Settings\n' +
            '3. Change Network to "Devnet"\n' +
            '4. Refresh the page and reconnect\n\n' +
            'This dApp only works on Devnet for testing purposes.'
          );
        } else {
          console.log('✅ Wallet connected to Devnet');
          setShowNetworkWarning(false);
        }
      } catch (error) {
        console.error('Error checking network (RPC unreachable):', error);
        // Don't show a wrong-network warning for connectivity failures —
        // the wallet may be on the correct network but the RPC is simply down.
        setIsCorrectNetwork(true);
        setShowNetworkWarning(false);
      }
    };

    // Check network when wallet connects
    if (connected) {
      checkNetwork();
    }
  }, [connected, publicKey, wallet, connection]);

  return {
    isCorrectNetwork,
    showNetworkWarning,
  };
}
