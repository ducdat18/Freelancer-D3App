/**
 * Create 10 diverse demo jobs for the freelance marketplace
 * Run: npx ts-node scripts/create-demo-jobs.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, web3, BN } from "@coral-xyz/anchor";
import { FreelanceMarketplace } from "../target/types/freelance_marketplace";
import fs from "fs";

const DEMO_JOBS = [
  {
    title: "Build a Solana NFT Minting dApp",
    description: "Create a modern NFT minting platform with Candy Machine v3 integration. Must include wallet connection, minting UI, and collection display. Requires React, TypeScript, and Solana Web3.js experience.",
    budget: 5.5, // SOL
    category: "Web Development",
    skills: ["React", "Solana", "TypeScript", "Web3.js"],
  },
  {
    title: "Design Modern Landing Page for DeFi Protocol",
    description: "Need a sleek, professional landing page design for our DeFi yield aggregator. Should include hero section, features, tokenomics, roadmap, and team sections. Figma deliverable required.",
    budget: 2.8,
    category: "UI/UX Design",
    skills: ["Figma", "Web Design", "DeFi", "Branding"],
  },
  {
    title: "Smart Contract Security Audit",
    description: "Professional security audit needed for Solana program handling escrow and token transfers. Must provide detailed report with vulnerability assessment and recommendations. Experienced auditors only.",
    budget: 8.0,
    category: "Blockchain",
    skills: ["Solana", "Rust", "Security", "Anchor"],
  },
  {
    title: "Write Technical Documentation for API",
    description: "Create comprehensive API documentation for our marketplace platform. Include endpoint descriptions, request/response examples, authentication flow, and integration guides. Experience with Swagger/OpenAPI preferred.",
    budget: 1.5,
    category: "Content Writing",
    skills: ["Technical Writing", "API Documentation", "Markdown"],
  },
  {
    title: "Build Mobile App with React Native",
    description: "Develop cross-platform mobile app for job browsing and bidding. Must integrate with existing Solana backend, implement wallet connection, and provide smooth UX. iOS and Android support required.",
    budget: 7.2,
    category: "Mobile Development",
    skills: ["React Native", "Mobile UI", "Solana", "TypeScript"],
  },
  {
    title: "Create 3D Logo Animation",
    description: "Design and animate a modern 3D logo for blockchain project. Need 5-second loop animation suitable for website hero section and social media. Deliver in multiple formats (MP4, GIF, Lottie).",
    budget: 1.8,
    category: "Graphic Design",
    skills: ["3D Animation", "Blender", "After Effects", "Motion Graphics"],
  },
  {
    title: "SEO Optimization for Crypto Platform",
    description: "Optimize our DeFi platform for search engines. Includes keyword research, on-page SEO, technical SEO audit, backlink strategy, and content optimization. Must have crypto/Web3 SEO experience.",
    budget: 3.5,
    category: "Marketing",
    skills: ["SEO", "Content Strategy", "Crypto Marketing", "Analytics"],
  },
  {
    title: "Implement Real-time Chat with WebSocket",
    description: "Add real-time messaging feature to freelance platform. Need WebSocket integration, message persistence, online status, typing indicators, and notification system. Backend in Node.js/TypeScript.",
    budget: 4.2,
    category: "Web Development",
    skills: ["WebSocket", "Node.js", "Real-time", "MongoDB"],
  },
  {
    title: "Data Analysis for Token Metrics",
    description: "Analyze on-chain data for token launch strategy. Need Python scripts for data extraction, visualization, and insights. Deliverables: Jupyter notebooks, charts, and strategic recommendations.",
    budget: 2.5,
    category: "Data Science",
    skills: ["Python", "Data Analysis", "Blockchain Data", "Visualization"],
  },
  {
    title: "Community Management for DAO",
    description: "Manage Discord and Twitter communities for Web3 project. Responsibilities: daily engagement, event coordination, content moderation, and growth strategies. Part-time, 20 hours/week for 1 month.",
    budget: 3.0,
    category: "Marketing",
    skills: ["Community Management", "Discord", "Twitter", "Web3"],
  },
];

async function main() {
  console.log("🚀 Creating 10 Demo Jobs for Freelance Marketplace\n");

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program
  const programId = new web3.PublicKey("FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i");
  const idl = JSON.parse(
    fs.readFileSync("target/idl/freelance_marketplace.json", "utf-8")
  );
  const program = new Program(idl, programId, provider) as Program<FreelanceMarketplace>;

  const client = provider.wallet.publicKey;
  console.log(`📋 Client wallet: ${client.toBase58()}\n`);

  // Check balance
  const balance = await provider.connection.getBalance(client);
  console.log(`💰 Balance: ${balance / web3.LAMPORTS_PER_SOL} SOL\n`);

  if (balance < web3.LAMPORTS_PER_SOL * 0.5) {
    console.log("⚠️  Low balance! Run: solana airdrop 1\n");
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < DEMO_JOBS.length; i++) {
    const jobData = DEMO_JOBS[i];
    
    try {
      console.log(`\n📝 [${i + 1}/10] Creating: "${jobData.title}"`);
      console.log(`   Budget: ${jobData.budget} SOL`);
      console.log(`   Category: ${jobData.category}`);

      // Create job keypair
      const job = web3.Keypair.generate();

      // Create metadata (simplified - you can upload to IPFS in production)
      const metadataUri = `demo-metadata-${i + 1}`;

      // Convert budget to lamports
      const budgetLamports = new BN(jobData.budget * web3.LAMPORTS_PER_SOL);

      // Create job
      const tx = await program.methods
        .createJob(
          jobData.title,
          jobData.description,
          budgetLamports,
          metadataUri
        )
        .accounts({
          job: job.publicKey,
          client: client,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([job])
        .rpc();

      console.log(`   ✅ Success! Job ID: ${job.publicKey.toBase58().slice(0, 8)}...`);
      console.log(`   📋 TX: ${tx.slice(0, 16)}...`);
      
      successCount++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Success: ${successCount}/10 jobs created`);
  console.log(`❌ Failed: ${failCount}/10 jobs`);
  console.log(`\n🎉 Demo data ready! Visit http://localhost:3000/jobs to see them.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

