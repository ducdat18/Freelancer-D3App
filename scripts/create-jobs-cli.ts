/**
 * CLI Script to create sample jobs directly on blockchain
 * No need for browser wallet connection
 * Run: npx ts-node scripts/create-jobs-cli.ts
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { BN } from '@coral-xyz/anchor';

// Configuration
const NETWORK = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i');
const DEPLOYER_KEYPAIR_PATH = '.keys/deployer.json';

// Sample jobs with low budget (0.002 SOL each)
const SAMPLE_JOBS = [
  {
    title: 'Build DeFi Dashboard',
    description: 'Need React developer for DeFi dashboard with charts and Web3 integration',
    budget: 0.002, // SOL
    metadataUri: 'ipfs://QmDefiDashboard',
  },
  {
    title: 'NFT Logo Design',
    description: 'Creative designer needed for modern NFT marketplace logo',
    budget: 0.002,
    metadataUri: 'ipfs://QmNFTLogo',
  },
  {
    title: 'Smart Contract Audit',
    description: 'Security audit for Solana program with escrow mechanism',
    budget: 0.002,
    metadataUri: 'ipfs://QmAudit',
  },
  {
    title: 'Technical Whitepaper',
    description: 'Write whitepaper for DeFi lending protocol on Solana',
    budget: 0.002,
    metadataUri: 'ipfs://QmWhitepaper',
  },
  {
    title: 'Community Manager',
    description: 'Manage DAO community on Discord, Twitter, and Telegram',
    budget: 0.002,
    metadataUri: 'ipfs://QmCommunity',
  },
];

// Helper to create job PDA
function deriveJobPda(client: PublicKey, jobCounter: number): [PublicKey, number] {
  const seeds = [
    Buffer.from('job'),
    client.toBuffer(),
    new BN(jobCounter).toArrayLike(Buffer, 'le', 8),
  ];

  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
}

// Create job instruction data
function createJobInstructionData(
  title: string,
  description: string,
  budgetLamports: number,
  metadataUri: string
): Buffer {
  // Instruction discriminator for create_job (you'll need to get the actual one from IDL)
  // For now, we'll use a placeholder
  // In Anchor, the discriminator is the first 8 bytes (sighash of "global:create_job")

  // This is a simplified version - actual implementation needs proper borsh serialization
  const titleBuf = Buffer.from(title);
  const descBuf = Buffer.from(description);
  const uriBuf = Buffer.from(metadataUri);
  const budgetBuf = new BN(budgetLamports).toArrayLike(Buffer, 'le', 8);

  // Create instruction data (simplified - needs proper Anchor encoding)
  const data = Buffer.concat([
    Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]), // Discriminator (placeholder)
    Buffer.from([titleBuf.length]), titleBuf,
    Buffer.from([descBuf.length]), descBuf,
    budgetBuf,
    Buffer.from([uriBuf.length]), uriBuf,
  ]);

  return data;
}

async function main() {
  console.log('🚀 Creating sample jobs on Solana Devnet via CLI...\n');

  // Load deployer keypair
  const keypairPath = path.join(process.cwd(), DEPLOYER_KEYPAIR_PATH);
  if (!fs.existsSync(keypairPath)) {
    console.error(`❌ Keypair not found at: ${keypairPath}`);
    process.exit(1);
  }

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const deployer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('📍 Deployer:', deployer.publicKey.toString());

  // Setup connection
  const connection = new Connection(NETWORK, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(deployer.publicKey);
  console.log(`💰 Balance: ${(balance / 1e9).toFixed(4)} SOL\n`);

  if (balance < 0.05 * 1e9) {
    console.error('❌ Insufficient balance. Need at least 0.05 SOL for gas fees.');
    console.log('Run: solana airdrop 1');
    process.exit(1);
  }

  console.log('📝 Creating jobs:\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < SAMPLE_JOBS.length; i++) {
    const job = SAMPLE_JOBS[i];
    console.log(`${i + 1}. ${job.title}`);
    console.log(`   Budget: ${job.budget} SOL`);

    try {
      // Derive job PDA
      const [jobPda, jobBump] = deriveJobPda(deployer.publicKey, i);
      console.log(`   Job PDA: ${jobPda.toString()}`);

      // Since we don't have the IDL, we'll use a simpler approach
      // Just log what would be created
      console.log(`   ✓ Would create (need IDL for actual transaction)`);
      console.log(`   Description: ${job.description.substring(0, 50)}...`);
      console.log(`   Metadata: ${job.metadataUri}\n`);

      successCount++;

      // Small delay between jobs
      if (i < SAMPLE_JOBS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(`   ✗ Failed: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Failed: ${failCount}\n`);

  console.log('⚠️  Note: This script needs the IDL to create actual transactions.');
  console.log('📋 Alternative solution: Use the "Initialize & Create Jobs" script below.\n');

  // Write a simpler script that can be used
  console.log('💡 Quick Solution: Run this command instead:');
  console.log('   npx ts-node scripts/simple-create-jobs.ts\n');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
