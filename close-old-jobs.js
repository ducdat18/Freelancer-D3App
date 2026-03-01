const { Connection, PublicKey, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Job accounts to close (923 bytes)
const JOB_ACCOUNTS = [
  'DPncVwQG9UsQ1G6TG4h5snWdAz7eu2FznTCpvKX4633G',
  '7D15XUX4JtBpgCGeV25AqNZVZNqZkYAnugjyx1Ty5Hx5',
  '3hbpKagMr9LRi9cq5g4N65DpKwZWHHp5qgFZmjg7VptL',
  'FAwSHnompZNSKt5qfZzq5hy6YtABQ5hUPtrHDvY9nx97',
  'HWDuFAYDUayxMFkr9WV8hsZVuvyHpuuTxQdxcsAov6pL',
  '2LKVvVX2fDTX73MsZ1z49A66ZN1BuvKMcaLYJkLcBkmw',
  '5uwXMVca8bax4NX1uUfNxwmC6mJzdVLcb938uDX75mdZ',
  'BvXQVnMAkGMRnPj2xccmXdkNgghrN8iWtRBb1ng7aa6q',
  'G43NzuGi3o3d8YvLsW2jiVxeLRK4U4dvqAwVnCHTWMM',
  '8hKXGCuwYBjEjeUkcPxCzcYN3MXkqL8MS3gmFd9u6WUo',
  '3mT3hiAVTK5fxKfsdbF6q7SrtSNmPTJN9AGu3oiDsXeA'
];

async function closeAccounts() {
  try {
    // Load deployer keypair
    const deployerJson = JSON.parse(fs.readFileSync('.keys/deployer.json', 'utf8'));
    const deployer = Keypair.fromSecretKey(new Uint8Array(deployerJson));

    console.log('Deployer:', deployer.publicKey.toBase58());
    console.log('Closing', JOB_ACCOUNTS.length, 'old job accounts...\n');

    let successCount = 0;
    let failCount = 0;

    for (const accountPubkeyStr of JOB_ACCOUNTS) {
      try {
        const accountPubkey = new PublicKey(accountPubkeyStr);

        // Get account info
        const accountInfo = await connection.getAccountInfo(accountPubkey);

        if (!accountInfo) {
          console.log(`❌ Account ${accountPubkeyStr} not found, skipping...`);
          failCount++;
          continue;
        }

        // Note: This will only work if the account can be closed via a direct SOL transfer
        // For PDA accounts, you need to use the program's close instruction
        console.log(`Attempting to close ${accountPubkeyStr}...`);

        // We can't directly close PDA accounts this way
        // We need to use the program's instruction if it has one
        console.log(`⚠️  Cannot close PDA account ${accountPubkeyStr} - program must have close instruction`);
        failCount++;

      } catch (error) {
        console.error(`❌ Error closing ${accountPubkeyStr}:`, error.message);
        failCount++;
      }
    }

    console.log(`\n✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('\n⚠️  Note: These are PDA (Program Derived Address) accounts.');
    console.log('They can only be closed if the program has a specific close instruction.');
    console.log('Since we redeployed the program, the best solution is to:');
    console.log('1. Use solana program close-buffer to reclaim buffer accounts');
    console.log('2. Start fresh and create new jobs with the updated program');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

closeAccounts();
