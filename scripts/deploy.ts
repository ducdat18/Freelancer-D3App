import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FreelanceMarketplace } from "../target/types/freelance_marketplace";
import fs from "fs";

async function main() {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FreelanceMarketplace as Program<FreelanceMarketplace>;

  console.log("🚀 Deploying Freelance Marketplace to Solana Devnet");
  console.log("Program ID:", program.programId.toString());
  console.log("Deployer:", provider.wallet.publicKey.toString());

  // Get deployer balance
  const balance = await provider.connection.getBalance(provider.wallet.publicKey);
  console.log(`Deployer Balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.5 * anchor.web3.LAMPORTS_PER_SOL) {
    console.warn("⚠️ Warning: Low balance. Please airdrop some SOL:");
    console.log(`solana airdrop 2 ${provider.wallet.publicKey.toString()} --url devnet`);
    process.exit(1);
  }

  console.log("\n✅ Program deployed successfully!");
  console.log("\nProgram Details:");
  console.log("================");
  console.log("Program ID:", program.programId.toString());
  console.log("Network: Devnet");
  console.log(`Explorer: https://explorer.solana.com/address/${program.programId.toString()}?cluster=devnet`);

  // Save deployment info
  const deploymentInfo = {
    programId: program.programId.toString(),
    network: "devnet",
    deployedAt: new Date().toISOString(),
    deployer: provider.wallet.publicKey.toString(),
  };

  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📝 Deployment info saved to deployment-info.json");
}

main()
  .then(() => {
    console.log("\n✨ Deployment completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
