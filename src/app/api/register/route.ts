import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { db } from '@/db';
import { registrations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  publicKey as metaplexPublicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import fs from "fs";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import {
    findLeafAssetIdPda,
    mintV1,
    mplBubblegum,
    parseLeafFromMintV1Transaction,
} from "@metaplex-foundation/mpl-bubblegum";
import { Umi } from "@metaplex-foundation/umi";
import { getRegistrationImageUrl, getCollectionMetadataUrl } from '@/utils/imageUtils';
import { isWalletWhitelisted } from '@/utils/whitelisting';

const NFT_NAME = 'Registration NFT'

/**
 * Mint NFT
 * @param umi 
 * @param nftMetadataUri 
 * @param userPublicKey 
 * @returns 
 */
const mintNft = async (umi: Umi, userPublicKey: string) => {
    try{
      const newOwner = metaplexPublicKey(userPublicKey)
  
      const merkleTreeString = process.env.MERKLE_TREE_PUBLIC_KEY;
      if (!merkleTreeString) {
        throw new Error('MERKLE_TREE_PUBLIC_KEY is not set');
      }
  
      const merkleTreePubkey = metaplexPublicKey(merkleTreeString);
  
      const collectionPubkey = process.env.COLLECTION_PUBLIC_KEY;
      if (!collectionPubkey) {
        throw new Error('COLLECTION_PUBLIC_KEY is not set');
      }
  
      const collectionKey = metaplexPublicKey(collectionPubkey);
      const metadataUrl = getCollectionMetadataUrl();
  
      const { signature } = await mintV1(umi, {
        leafOwner: newOwner,
        merkleTree: merkleTreePubkey,
        metadata: {
          name: `${NFT_NAME}`,
          symbol: "STDE2024", 
          uri: metadataUrl,
          sellerFeeBasisPoints: 0, 
          collection: { key: collectionKey, verified: false },
          creators: [
            { address: umi.identity.publicKey, verified: true, share: 100 },
          ],
        },
      }).sendAndConfirm(umi, { 
        send: { commitment: 'finalized' },
        confirm: { commitment: 'finalized' }
      });
  
      // Add delay to ensure transaction is processed
      await new Promise(resolve => setTimeout(resolve, 2000));
  
      const leaf = await parseLeafFromMintV1Transaction(umi, signature);
      const assetId = findLeafAssetIdPda(umi, {
        merkleTree: merkleTreePubkey,
        leafIndex: leaf.nonce,
      })
  
      return assetId;
  
    }catch (error) {
      throw error;
    }
  }

const mint = async (imageUrl: string, publicKey: string): Promise<string> => {
    const umi = createUmi('https://api.devnet.solana.com')
      .use(mplBubblegum())
      .use(mplTokenMetadata())
      .use(dasApi())
      .use(
        irysUploader({
            address: 'https://devnet.irys.xyz',
        })
    );
    const walletFile = fs.readFileSync('./.keys/adventcalendar-wallet.json', 'utf8');
    const walletData = JSON.parse(walletFile);

    // Decode the Base64-encoded private key
    const secretKeyBuffer = Buffer.from(walletData.privateKey, 'base64');
    const secretKeyUint8Array = new Uint8Array(secretKeyBuffer);

    // Create the keypair from the secret key
    const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyUint8Array);

    // Set the keypair as the signer
    umi.use(keypairIdentity(keypair));

    const assetId = await mintNft(umi, publicKey);
    return assetId.toString();
}

export async function POST(request: Request) {
  try {
    const { publicKey, message, signature } = await request.json();

    if (!publicKey || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify signature
    try {
      const publicKeyBytes = new PublicKey(publicKey).toBytes();
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = Buffer.from(signature, 'base64');
      
      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      if (!verified) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: `Signature verification failed: ${error}` },
        { status: 401 }
      );
    }

    // Check whitelist first
    const isWhitelisted = await isWalletWhitelisted(publicKey);
    
    if (!isWhitelisted) {
      return NextResponse.json(
        { error: 'Please use the same wallet you used to mint your Superteam Germany Membership NFT.' },
        { status: 403 }
      );
    }

    // Check if already registered
    const existing = await db.query.registrations.findFirst({
      where: eq(registrations.walletAddress, publicKey)
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Wallet already registered' },
        { status: 400 }
      );
    }

    const imageUrl = getRegistrationImageUrl();

    // Mint registration NFT
    const registrationTx = await mint(imageUrl, publicKey);

    // Save registration
    await db.insert(registrations).values({
      walletAddress: publicKey,
      registrationTx,
      isActive: true
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to register: ${error}` },
      { status: 500 }
    );
  }
} 