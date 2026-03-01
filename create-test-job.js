const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, web3, BN } = require('@coral-xyz/anchor');
const IDL = require('./src/idl/freelance_marketplace.json');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function createTestJob() {
  try {
    // Load deployer keypair as the wallet
    const deployerJson = JSON.parse(fs.readFileSync('.keys/deployer.json', 'utf8'));
    const deployer = Keypair.fromSecretKey(new Uint8Array(deployerJson));

    console.log('Using wallet:', deployer.publicKey.toBase58());

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: deployer.publicKey,
        signTransaction: async (tx) => {
          tx.sign(deployer);
          return tx;
        },
        signAllTransactions: async (txs) => {
          txs.forEach(tx => tx.sign(deployer));
          return txs;
        },
      },
      { commitment: 'confirmed' }
    );

    const program = new Program(IDL, provider);

    // Job parameters
    const jobId = Date.now();
    const title = "Test Job " + jobId;
    const description = "This is a test job created via CLI";
    const budget = new BN(1_000_000_000); // 1 SOL in lamports
    const metadataUri = "https://example.com/job/" + jobId;

    // Derive PDA
    const [jobPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('job'),
        deployer.publicKey.toBuffer(),
        new BN(jobId).toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    console.log('\nCreating job with:');
    console.log('  Job ID:', jobId);
    console.log('  Job PDA:', jobPda.toBase58());
    console.log('  Title:', title);
    console.log('  Budget:', budget.toString(), 'lamports (1 SOL)');
    console.log('  Metadata URI:', metadataUri);
    console.log();

    // Create job transaction
    const tx = await program.methods
      .createJob(
        new BN(jobId),
        title,
        description,
        budget,
        metadataUri,
        null // No token mint, using SOL
      )
      .accounts({
        job: jobPda,
        client: deployer.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Job created successfully!');
    console.log('   Transaction:', tx);
    console.log('   Job PDA:', jobPda.toBase58());

    // Wait a bit for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to fetch the job
    console.log('\nFetching created job...');
    try {
      const job = await program.account.job.fetch(jobPda);
      console.log('✅ Job fetched successfully!');
      console.log('   Title:', job.title);
      console.log('   Status:', job.status);
      console.log('   Budget:', job.budget.toString());
    } catch (fetchError) {
      console.log('❌ Failed to fetch job:', fetchError.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.logs) {
      console.log('\nProgram logs:');
      error.logs.forEach(log => console.log('  ', log));
    }
  }
}

createTestJob();
