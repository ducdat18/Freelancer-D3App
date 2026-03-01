const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');
const IDL = require('./src/idl/freelance_marketplace.json');

const PROGRAM_ID = new PublicKey('FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Create a dummy wallet for read-only operations
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

async function fetchJobs() {
  try {
    console.log('Fetching all jobs from the blockchain...');
    console.log('Program ID:', PROGRAM_ID.toBase58());

    const jobs = await program.account.job.all();

    console.log(`\nFound ${jobs.length} jobs on the blockchain\n`);

    if (jobs.length === 0) {
      console.log('❌ No jobs found! This is why the jobs page is empty.');
      console.log('\nPossible reasons:');
      console.log('1. Jobs were not successfully created on the blockchain');
      console.log('2. Transaction failed but UI showed success');
      console.log('3. Using wrong network (devnet vs localnet)');
    } else {
      console.log('✅ Jobs found on blockchain:');
      jobs.forEach((job, i) => {
        console.log(`\nJob ${i + 1}:`);
        console.log('  Public Key:', job.publicKey.toBase58());
        console.log('  Title:', job.account.title);
        console.log('  Status:', job.account.status);
        console.log('  Budget:', job.account.budget.toString(), 'lamports');
        console.log('  Client:', job.account.client.toBase58());
      });
    }
  } catch (error) {
    console.error('❌ Error fetching jobs:', error.message);
    console.error('\nFull error:', error);
  }
}

fetchJobs();
