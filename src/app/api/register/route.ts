import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { db } from '@/db';
import { registrations } from '@/db/schema';
import {
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  publicKey as metaplexPublicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import {
    mintV1,
    mplBubblegum,
} from "@metaplex-foundation/mpl-bubblegum";
import { Umi } from "@metaplex-foundation/umi";
import { getRegistrationMetaUrl } from '@/utils/imageUtils';

const NFT_NAME = 'Super Ticket';
const MINT_TIMEOUT = 60000; 

async function verifySignature(publicKey: string, message: string, signature: string): Promise<boolean> {
  try {
    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, 'base64');
    
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

const mintNft = async (umi: Umi, userPublicKey: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Minting operation timed out'));
    }, MINT_TIMEOUT);

    try {
      console.log('Starting NFT mint for wallet:', userPublicKey);
      const newOwner = metaplexPublicKey(userPublicKey);

      const merkleTreeString = process.env.MERKLE_TREE_PUBLIC_KEY;
      if (!merkleTreeString) {
        clearTimeout(timeoutId);
        throw new Error('MERKLE_TREE_PUBLIC_KEY is not set');
      }

      const merkleTreePubkey = metaplexPublicKey(merkleTreeString);
      console.log('Using merkle tree:', merkleTreeString);

      const collectionPubkey = process.env.COLLECTION_PUBLIC_KEY;
      if (!collectionPubkey) {
        clearTimeout(timeoutId);
        throw new Error('COLLECTION_PUBLIC_KEY is not set');
      }

      const collectionKey = metaplexPublicKey(collectionPubkey);
      const metadataUrl = getRegistrationMetaUrl();
      console.log('Using metadata URL:', metadataUrl);

      console.log('Initiating mint transaction...');
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
        send: { commitment: 'processed' },
        confirm: { commitment: 'processed' }
      });

      console.log('Mint transaction completed with signature:', signature);
      clearTimeout(timeoutId);
      resolve(Buffer.from(signature).toString('base64'));
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Mint operation failed:', error);
      reject(error);
    }
  });
}

const mint = async (publicKey: string): Promise<string> => {
  console.log('Initializing minting process...');
  const network = process.env.NETWORK;
  if (!network) {
    throw new Error('NETWORK environment variable is not set');
  }

  const umi = createUmi(network)
    .use(mplBubblegum())
    .use(mplTokenMetadata())
    .use(dasApi());

  const privateKey = process.env.PAYER_PRIV;
  if (!privateKey) {
    throw new Error('PAYER_PRIV environment variable is not set');
  }

  const secretKeyBuffer = Buffer.from(privateKey, 'base64');
  const secretKeyUint8Array = new Uint8Array(secretKeyBuffer);
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyUint8Array);
  umi.use(keypairIdentity(keypair));

  return await mintNft(umi, publicKey);
}

async function saveRegistration(publicKey: string) {
  try {
    await db.insert(registrations).values({
      walletAddress: publicKey,
      isActive: true
    });
    console.log('Registration saved for wallet:', publicKey);
  } catch (error) {
    console.error('Failed to save registration:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  console.log('Starting registration process...');
  try {
    const { publicKey, message, signature } = await request.json();

    if (!publicKey || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Verifying signature for wallet:', publicKey);
    const isValidSignature = await verifySignature(publicKey, message, signature);
    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('Signature verified, proceeding with mint...');
    const mintSignature = await mint(publicKey);
    
    console.log('NFT minted successfully, saving registration...');
    await saveRegistration(publicKey);

    return NextResponse.json({ 
      success: true,
      signature: mintSignature
    });
  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register' },
      { status: 500 }
    );
  }
} 
