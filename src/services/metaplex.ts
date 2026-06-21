import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { Achievement } from '../config/achievements';
import { getIPFSUrl } from './ipfs';

interface AchievementNFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    category: string;
    creators: Array<{
      address: string;
      share: number;
    }>;
  };
}

/**
 * Create NFT metadata for an achievement.
 * `imageUrl` should be a resolvable URL (typically an IPFS gateway URL produced
 * by uploadAchievementImage). Falls back to the local asset path if omitted.
 */
export function createAchievementMetadata(
  achievement: Achievement,
  userAddress: string,
  imageUrl?: string
): AchievementNFTMetadata {
  return {
    name: achievement.name,
    symbol: achievement.symbol,
    description: achievement.description,
    image: imageUrl || getAchievementImageUrl(achievement.type),
    attributes: [
      {
        trait_type: 'Achievement Type',
        value: achievement.name
      },
      {
        trait_type: 'Earned By',
        value: userAddress.slice(0, 8) + '...' + userAddress.slice(-4)
      },
      {
        trait_type: 'Earned At',
        value: new Date().toISOString()
      },
      {
        trait_type: 'Requirement',
        value: achievement.requirement
      },
      {
        trait_type: 'Rarity',
        value: getRarity(achievement.type)
      }
    ],
    properties: {
      category: 'achievement',
      creators: [
        {
          address: userAddress,
          share: 100
        }
      ]
    }
  };
}

/**
 * Get rarity level based on achievement type
 */
function getRarity(achievementType: number): string {
  switch (achievementType) {
    case 0: return 'Common'; // FirstJob
    case 1: return 'Uncommon'; // TenJobs
    case 2: return 'Rare'; // FiftyJobs
    case 3: return 'Epic'; // HundredJobs
    case 4: return 'Legendary'; // TopRated
    case 5: return 'Epic'; // HighEarner
    case 6: return 'Legendary'; // TrustedArbitrator
    default: return 'Common';
  }
}

/**
 * Upload metadata to IPFS (or other storage)
 */
export async function uploadMetadataToIPFS(
  metadata: AchievementNFTMetadata,
  uploadFunction: (data: any) => Promise<string>
): Promise<string> {
  try {
    // Upload metadata JSON to IPFS
    const metadataUri = await uploadFunction(metadata);
    return metadataUri;
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error);
    throw new Error('Failed to upload metadata');
  }
}

/**
 * Create Achievement NFT using Metaplex
 *
 * This is a simplified version. Full implementation requires:
 * - Installing Metaplex SDK
 * - Proper wallet adapter integration
 * - Image hosting setup
 */
export async function createAchievementNFT(
  connection: Connection,
  wallet: any, // WalletAdapter
  achievement: Achievement,
  userAddress: string,
  uploadToIPFS: (data: any) => Promise<string>,
  uploadFile?: (file: File) => Promise<string>
): Promise<{ nftMint: PublicKey; metadataUri: string }> {
  try {
    // 1. Generate the badge image and upload it to IPFS (falls back to the
    //    local asset path if no file uploader was provided or the upload fails).
    let imageUrl: string | undefined;
    if (uploadFile) {
      try {
        imageUrl = await uploadAchievementImage(achievement, userAddress, uploadFile);
      } catch (imgErr) {
        console.warn('Achievement image upload failed, using fallback:', imgErr);
      }
    }

    // 2. Build metadata referencing the IPFS image, then upload it to IPFS.
    const metadata = createAchievementMetadata(achievement, userAddress, imageUrl);
    const metadataCid = await uploadMetadataToIPFS(metadata, uploadToIPFS);
    const metadataUri = getIPFSUrl(metadataCid);

    // 3. Mint the NFT on-chain via Metaplex (umi + Token Metadata program).
    const umi = createUmi(connection.rpcEndpoint)
      .use(mplTokenMetadata())
      .use(walletAdapterIdentity(wallet));

    const mint = generateSigner(umi);

    await createNft(umi, {
      mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
      isMutable: false,
    }).sendAndConfirm(umi);

    return {
      nftMint: new PublicKey(mint.publicKey.toString()),
      metadataUri,
    };
  } catch (error) {
    console.error('Error creating achievement NFT:', error);
    throw new Error('Failed to create achievement NFT');
  }
}

/**
 * Mock function for testing without Metaplex
 * Remove this when real implementation is ready
 */
export async function mockCreateAchievementNFT(
  achievement: Achievement,
  userAddress: string
): Promise<{ nftMint: PublicKey; metadataUri: string }> {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    nftMint: Keypair.generate().publicKey,
    metadataUri: `ipfs://QmMock${Date.now()}`
  };
}

/**
 * Get achievement image URL (local fallback when no IPFS image is available).
 */
export function getAchievementImageUrl(achievementType: number): string {
  return `/achievements/${achievementType}.png`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string)
  );
}

/**
 * Generate a self-contained SVG badge for an achievement using its icon, color
 * and rarity. No external assets required, so it can be minted as the NFT image.
 */
export function generateAchievementSvg(achievement: Achievement, userAddress: string): string {
  const rarity = getRarity(achievement.type).toUpperCase();
  const shortAddr = `${userAddress.slice(0, 4)}…${userAddress.slice(-4)}`;
  const color = achievement.color;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#0a0a0a"/>
  <rect x="16" y="16" width="480" height="480" rx="32" fill="url(#bg)" opacity="0.18"/>
  <rect x="16" y="16" width="480" height="480" rx="32" fill="none" stroke="${color}" stroke-width="3"/>
  <circle cx="256" cy="188" r="96" fill="${color}" opacity="0.15"/>
  <circle cx="256" cy="188" r="96" fill="none" stroke="${color}" stroke-width="2"/>
  <text x="256" y="226" font-size="110" text-anchor="middle">${escapeXml(achievement.icon)}</text>
  <text x="256" y="356" font-size="32" font-family="Orbitron, Arial, sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(achievement.name)}</text>
  <text x="256" y="398" font-size="22" font-family="Arial, sans-serif" fill="${color}" text-anchor="middle" letter-spacing="3">${escapeXml(rarity)}</text>
  <text x="256" y="452" font-size="18" font-family="monospace" fill="#9aa0a6" text-anchor="middle">${escapeXml(shortAddr)}</text>
</svg>`;
}

/**
 * Generate an achievement badge image and upload it to IPFS.
 * Returns a resolvable gateway URL for use as the NFT image.
 */
export async function uploadAchievementImage(
  achievement: Achievement,
  userAddress: string,
  uploadFile: (file: File) => Promise<string>
): Promise<string> {
  const svg = generateAchievementSvg(achievement, userAddress);
  const file = new File([svg], `achievement-${achievement.type}.svg`, { type: 'image/svg+xml' });
  const cid = await uploadFile(file);
  if (!cid) throw new Error('Failed to upload achievement image to IPFS');
  return getIPFSUrl(cid);
}
