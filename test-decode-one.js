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

async function testDecodeOne() {
  try {
    console.log('Fetching a single job account to debug...\n');

    const jobPubkey = new PublicKey('DPncVwQG9UsQ1G6TG4h5snWdAz7eu2FznTCpvKX4633G');

    // Fetch raw account data
    const accountInfo = await connection.getAccountInfo(jobPubkey);

    if (!accountInfo) {
      console.log('❌ Account not found');
      return;
    }

    console.log('Account info:');
    console.log('  Data length:', accountInfo.data.length, 'bytes');
    console.log('  Owner:', accountInfo.owner.toBase58());
    console.log('  Discriminator:', Array.from(accountInfo.data.slice(0, 8)));
    console.log();

    // Try different decode methods
    console.log('Method 1: Using program.account.job.fetch()');
    try {
      const job = await program.account.job.fetch(jobPubkey);
      console.log('✅ SUCCESS!');
      console.log('Job:', job);
    } catch (err) {
      console.log('❌ FAILED:', err.message);
      console.log('Full error:', err);
    }

    console.log('\nMethod 2: Using coder.accounts.decode()');
    try {
      const decoded = program.account.job.coder.accounts.decode(
        'Job',
        accountInfo.data
      );
      console.log('✅ SUCCESS!');
      console.log('Job:', JSON.stringify(decoded, null, 2));
    } catch (err) {
      console.log('❌ FAILED:', err.message);
    }

    console.log('\nMethod 3: Using program.coder.accounts.decode()');
    try {
      const decoded = program.coder.accounts.decode(
        'job',
        accountInfo.data
      );
      console.log('✅ SUCCESS!');
      console.log('Job:', JSON.stringify(decoded, null, 2));
    } catch (err) {
      console.log('❌ FAILED:', err.message);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

testDecodeOne();
