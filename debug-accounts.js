const { Connection, PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey('FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Job discriminator from IDL: [75, 124, 80, 203, 161, 180, 202, 80]
const JOB_DISCRIMINATOR = Buffer.from([75, 124, 80, 203, 161, 180, 202, 80]);

async function debugAccounts() {
  try {
    console.log('Fetching all program accounts...\n');

    const allAccounts = await connection.getProgramAccounts(PROGRAM_ID);

    console.log(`Found ${allAccounts.length} total accounts\n`);

    // Separate by discriminator
    const byDiscriminator = new Map();

    for (const { pubkey, account } of allAccounts) {
      const discriminator = account.data.slice(0, 8);
      const discriminatorHex = discriminator.toString('hex');

      if (!byDiscriminator.has(discriminatorHex)) {
        byDiscriminator.set(discriminatorHex, []);
      }
      byDiscriminator.get(discriminatorHex).push({
        pubkey: pubkey.toBase58(),
        dataLength: account.data.length,
        discriminator: Array.from(discriminator),
      });
    }

    console.log('Accounts grouped by discriminator:\n');

    const expectedJobDiscHex = JOB_DISCRIMINATOR.toString('hex');
    console.log(`Expected Job discriminator: [${Array.from(JOB_DISCRIMINATOR).join(', ')}] (${expectedJobDiscHex})\n`);

    for (const [discHex, accounts] of byDiscriminator.entries()) {
      const isJobDisc = discHex === expectedJobDiscHex;
      console.log(`${isJobDisc ? '✅ JOB' : '❌ OTHER'} Discriminator: ${discHex} (${accounts.length} accounts)`);
      console.log(`   Array: [${accounts[0].discriminator.join(', ')}]`);
      console.log(`   Data length: ${accounts[0].dataLength} bytes`);
      accounts.slice(0, 3).forEach(acc => {
        console.log(`   - ${acc.pubkey}`);
      });
      if (accounts.length > 3) {
        console.log(`   ... and ${accounts.length - 3} more`);
      }
      console.log();
    }

    // Count job accounts
    const jobAccounts = byDiscriminator.get(expectedJobDiscHex) || [];
    console.log(`\n📊 Summary: ${jobAccounts.length} Job accounts found`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAccounts();
