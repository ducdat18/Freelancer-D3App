import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3, Idl } from "@coral-xyz/anchor";
import { PROGRAM_ID, PROGRAM_ID_STRING } from "../config/solana";
import IDL from "../idl/freelance_marketplace.json";

// Use PublicKey from Anchor to ensure same class instance
const { PublicKey, SystemProgram } = web3;

type FreelanceMarketplace = any;

export function useSolanaProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    // If wallet is connected, create a normal provider
    if (wallet.publicKey && wallet.signTransaction && wallet.signAllTransactions) {
      return new AnchorProvider(
        connection,
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction.bind(wallet),
          signAllTransactions: wallet.signAllTransactions.bind(wallet),
        },
        { commitment: "confirmed" }
      );
    }

    // Otherwise, create a read-only provider using a dummy wallet
    // This allows fetching data from the blockchain without a wallet connection
    const dummyKeypair = web3.Keypair.generate();
    return new AnchorProvider(
      connection,
      {
        publicKey: dummyKeypair.publicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      },
      { commitment: "confirmed" }
    );
  }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

  const program = useMemo(() => {
    if (!provider) return null;

    try {
      // Create PublicKey using Anchor's web3 to ensure class consistency
      const programId = new PublicKey(PROGRAM_ID_STRING);

      console.log('Creating program with ID:', programId.toBase58());

      // Use full IDL from the JSON file
      // @ts-ignore - IDL type compatibility
      return new Program(
        IDL as any,
        provider
      ) as Program<FreelanceMarketplace>;
    } catch (error) {
      console.error('Error creating program instance:', error);
      console.error('Program ID string:', PROGRAM_ID_STRING);
      console.error('Provider:', provider);
      return null;
    }
  }, [provider]);

  return {
    program,
    provider,
    programId: PROGRAM_ID,
    wallet: wallet.publicKey,
    connection,
  };
}
