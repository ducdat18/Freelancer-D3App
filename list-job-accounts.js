const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');

const PROGRAM_ID = new PublicKey('FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function listAccounts() {
  try {
    console.log('Fetching all accounts for program:', PROGRAM_ID.toBase58());

    // Get all accounts owned by this program
    const accounts = await connection.getProgramAccounts(PROGRAM_ID);

    console.log(`\nFound ${accounts.length} total accounts owned by this program\n`);

    if (accounts.length === 0) {
      console.log('✅ No accounts found. The jobs page should be empty because there are no jobs on the blockchain.');
    } else {
      console.log('Account details:');
      accounts.forEach((account, i) => {
        console.log(`\nAccount ${i + 1}:`);
        console.log('  Public Key:', account.pubkey.toBase58());
        console.log('  Data length:', account.account.data.length, 'bytes');
        console.log('  Owner:', account.account.owner.toBase58());
        console.log('  Lamports:', account.account.lamports);
      });

      console.log('\n⚠️  There are old job accounts that were created with a previous program version.');
      console.log('These accounts cannot be decoded with the new IDL.');
      console.log('\nSolution: You need to either:');
      console.log('1. Close/delete these old accounts (if you have authority)');
      console.log('2. Create new jobs with the updated program');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listAccounts();
