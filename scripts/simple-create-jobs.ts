/**
 * Simple script to create jobs using Solana CLI
 * This generates the commands you need to run
 */

const SAMPLE_JOBS = [
  {
    title: 'Build DeFi Dashboard',
    description: 'Need React developer for DeFi dashboard',
    budget: 0.002,
  },
  {
    title: 'NFT Logo Design',
    description: 'Creative designer for NFT logo',
    budget: 0.002,
  },
  {
    title: 'Smart Contract Audit',
    description: 'Security audit for Solana program',
    budget: 0.002,
  },
  {
    title: 'Technical Whitepaper',
    description: 'Write DeFi protocol whitepaper',
    budget: 0.002,
  },
  {
    title: 'Community Manager',
    description: 'Manage DAO community',
    budget: 0.002,
  },
];

console.log('📝 Sample Jobs to Create\n');
console.log('Since wallet connection is not working, here are your options:\n');

console.log('═══════════════════════════════════════════════════\n');
console.log('OPTION 1: Fix Wallet Connection (Recommended)\n');
console.log('═══════════════════════════════════════════════════\n');

console.log('1. Install Phantom Wallet:');
console.log('   https://phantom.app/download\n');

console.log('2. Create/Import wallet in Phantom\n');

console.log('3. Switch to Devnet:');
console.log('   Settings > Developer Settings > Change Network > Devnet\n');

console.log('4. Import your deployer key to Phantom:');
console.log('   - Get private key: cat .keys/deployer.json');
console.log('   - In Phantom: Add Account > Import Private Key\n');

console.log('5. Get SOL:');
console.log('   solana airdrop 1\n');

console.log('6. Refresh browser and try connecting again\n');

console.log('═══════════════════════════════════════════════════\n');
console.log('OPTION 2: Jobs Data Reference\n');
console.log('═══════════════════════════════════════════════════\n');

SAMPLE_JOBS.forEach((job, index) => {
  console.log(`Job ${index + 1}:`);
  console.log(`  Title: ${job.title}`);
  console.log(`  Description: ${job.description}`);
  console.log(`  Budget: ${job.budget} SOL`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════\n');
console.log('OPTION 3: Debug Wallet Connection\n');
console.log('═══════════════════════════════════════════════════\n');

console.log('1. Open browser console (F12)');
console.log('2. Look for errors related to wallet');
console.log('3. Make sure you have Phantom installed');
console.log('4. Try refreshing the page');
console.log('5. Check if Phantom is unlocked\n');

console.log('═══════════════════════════════════════════════════\n');
console.log('Common Issues:\n');
console.log('═══════════════════════════════════════════════════\n');

console.log('❌ "Wallet not connected"');
console.log('   → Click "Select Wallet" button in the UI');
console.log('   → Select Phantom from the list');
console.log('   → Approve connection in Phantom popup\n');

console.log('❌ "Phantom not detected"');
console.log('   → Install Phantom extension');
console.log('   → Refresh browser after installation\n');

console.log('❌ "Wrong network"');
console.log('   → Open Phantom');
console.log('   → Settings > Change Network > Devnet\n');

console.log('═══════════════════════════════════════════════════\n');
console.log('Quick Test:\n');
console.log('═══════════════════════════════════════════════════\n');

console.log('Run in terminal to check if wallet has funds:');
console.log('solana address');
console.log('solana balance\n');

console.log('If balance is 0:');
console.log('solana airdrop 1\n');
