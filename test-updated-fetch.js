const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');
const IDL = require('./src/idl/freelance_marketplace.json');

const PROGRAM_ID = new PublicKey('FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const dummyKeypair = web3.Keypair.generate();
const provider = new AnchorProvider(
  connection,
  {
    publicKey: dummyKeypair.publicKey,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  },
  { commitment: 'confirmed' }
);

const program = new Program(IDL, provider);

async function testFetch() {
  try {
    console.log('Testing updated fetch logic with fallback...\n');

    // First try standard fetch (will likely fail with old accounts)
    try {
      const jobs = await program.account.job.all();
      console.log(`✅ Standard fetch succeeded: ${jobs.length} jobs`);
      return;
    } catch (err) {
      console.log('❌ Standard fetch failed (expected):', err.message);
    }

    // Fall back to manual decode
    console.log('\nTrying manual decode with error handling...');

    const allAccounts = await program.provider.connection.getProgramAccounts(
      program.programId
    );

    console.log(`Found ${allAccounts.length} total program accounts`);

    const validJobs = [];

    for (const { pubkey, account } of allAccounts) {
      try {
        const decoded = program.account.job.coder.accounts.decode(
          'Job',
          account.data
        );
        validJobs.push({ pubkey, decoded });
        console.log(`✅ Decoded job: ${pubkey.toBase58()}`);
      } catch (decodeError) {
        console.log(`⚠️  Skipped account: ${pubkey.toBase58()} (${decodeError.message})`);
      }
    }

    console.log(`\n✅ Successfully decoded ${validJobs.length} valid jobs out of ${allAccounts.length} total accounts`);

    if (validJobs.length === 0) {
      console.log('\n📝 No valid jobs found yet. This is expected if you haven\'t created any jobs with the updated program.');
      console.log('   Try creating a new job through the web UI to test!');
    } else {
      console.log('\nValid jobs:');
      validJobs.forEach(({ pubkey, decoded }) => {
        console.log(`  - ${decoded.title} (${pubkey.toBase58()})`);
      });
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

testFetch();
