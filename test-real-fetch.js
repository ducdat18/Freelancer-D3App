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

async function testRealFetch() {
  try {
    console.log('Testing REAL fetch method (same as frontend)...\n');

    // First try standard fetch
    try {
      const jobs = await program.account.job.all();
      console.log(`✅ Standard fetch succeeded: ${jobs.length} jobs`);
      jobs.forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.account.title} (${job.publicKey.toBase58()})`);
      });
      return;
    } catch (err) {
      console.log('❌ Standard fetch failed:', err.message);
    }

    // Fall back to manual decode
    console.log('\nFalling back to manual decode...');

    const allAccounts = await program.provider.connection.getProgramAccounts(
      program.programId
    );

    console.log(`Found ${allAccounts.length} total program accounts\n`);

    const validJobs = [];

    for (const { pubkey, account } of allAccounts) {
      try {
        // Use program.coder.accounts.decode() with lowercase 'job'
        const decoded = program.coder.accounts.decode(
          'job',
          account.data
        );
        validJobs.push({ pubkey, decoded });
        console.log(`✅ Decoded: ${decoded.title} (${pubkey.toBase58()})`);
      } catch (decodeError) {
        // Silent skip - just try next account
      }
    }

    console.log(`\n✅ Successfully decoded ${validJobs.length} valid jobs out of ${allAccounts.length} total accounts`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

testRealFetch();
