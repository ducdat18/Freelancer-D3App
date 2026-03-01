/**
 * Script to create sample jobs on Solana devnet
 * Run with: npx ts-node scripts/create-sample-jobs.ts
 */

import { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const NETWORK = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i');
const DEPLOYER_KEYPAIR_PATH = '.keys/deployer.json';

// Sample jobs to create
const SAMPLE_JOBS = [
  {
    title: 'Build DeFi Dashboard',
    description: 'Need React developer for DeFi dashboard with real-time charts and Web3 integration',
    budget: 1.5, // SOL
    metadataUri: 'ipfs://QmDefiDashboard123',
  },
  {
    title: 'NFT Marketplace Logo',
    description: 'Looking for creative designer to create modern logo for NFT marketplace',
    budget: 0.5, // SOL
    metadataUri: 'ipfs://QmNFTLogo456',
  },
  {
    title: 'Smart Contract Audit',
    description: 'Security audit needed for Solana program with escrow mechanism',
    budget: 2.0, // SOL
    metadataUri: 'ipfs://QmAudit789',
  },
  {
    title: 'Technical Whitepaper',
    description: 'Write comprehensive whitepaper for DeFi lending protocol on Solana',
    budget: 0.8, // SOL
    metadataUri: 'ipfs://QmWhitepaper101',
  },
  {
    title: 'Community Management',
    description: 'Experienced community manager needed for DAO Discord and Twitter',
    budget: 1.2, // SOL
    metadataUri: 'ipfs://QmCommunity202',
  },
];

async function main() {
  console.log('🚀 Creating sample jobs on Solana Devnet...\n');

  // Load deployer keypair
  const keypairData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), DEPLOYER_KEYPAIR_PATH), 'utf-8')
  );
  const deployer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('📍 Deployer:', deployer.publicKey.toString());

  // Setup connection and provider
  const connection = new Connection(NETWORK, 'confirmed');
  const wallet = new Wallet(deployer);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

  // Check balance
  const balance = await connection.getBalance(deployer.publicKey);
  console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.error('❌ Insufficient balance. Please airdrop SOL first.');
    console.log('Run: solana airdrop 2 --url devnet');
    process.exit(1);
  }

  // Note: Since we don't have IDL, we'll use direct instruction building
  // For now, let's create a simpler version that just demonstrates the jobs

  console.log('📝 Jobs to create:\n');

  let jobCounter = 0;
  for (const job of SAMPLE_JOBS) {
    console.log(`${jobCounter + 1}. ${job.title}`);
    console.log(`   Budget: ${job.budget} SOL`);
    console.log(`   Description: ${job.description.substring(0, 50)}...`);

    // Derive PDA for job account
    const jobSeed = `job-${deployer.publicKey.toString()}-${Date.now()}-${jobCounter}`;
    const [jobPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('job'),
        deployer.publicKey.toBuffer(),
        Buffer.from(jobSeed.substring(0, 32)), // Limit seed length
      ],
      PROGRAM_ID
    );

    console.log(`   Job PDA: ${jobPda.toString()}`);

    jobCounter++;
    console.log('');
  }

  console.log('\n⚠️  Note: To actually create these jobs, you need to:');
  console.log('1. Generate the IDL from your Anchor program');
  console.log('2. Use the frontend UI to create jobs via wallet connection');
  console.log('3. Or implement the full instruction building here\n');

  console.log('💡 Alternative: Use the frontend application');
  console.log('   1. Start the dev server: npm run dev');
  console.log('   2. Connect your wallet (with the deployer keys imported)');
  console.log('   3. Click "Post a Job" and fill in the details');
  console.log('   4. Initialize reputation first if needed\n');

  // Create a reference file with the sample jobs
  const jobsReference = {
    programId: PROGRAM_ID.toString(),
    network: NETWORK,
    deployer: deployer.publicKey.toString(),
    timestamp: new Date().toISOString(),
    jobs: SAMPLE_JOBS.map((job, index) => ({
      ...job,
      index,
      status: 'pending_creation',
    })),
  };

  fs.writeFileSync(
    'sample-jobs-reference.json',
    JSON.stringify(jobsReference, null, 2)
  );

  console.log('✅ Sample jobs reference saved to: sample-jobs-reference.json');
  console.log('📋 Use this file as reference when creating jobs via the UI\n');
}

main()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
