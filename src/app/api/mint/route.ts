import { NextRequest, NextResponse } from 'next/server';
import { isValidMintingDate, getMonthName } from '@/utils/dateUtils';
import { getDoorImageUrl } from '@/utils/imageUtils';
import {
  findLeafAssetIdPda,
  mintV1,
  mplBubblegum,
  parseLeafFromMintV1Transaction,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  publicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Umi, } from "@metaplex-foundation/umi";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { isWalletWhitelisted } from '@/utils/whitelisting';
import { db } from '@/db';
import { mints } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

const NFT_NAME = 'SuperteamDE Door '

export const runtime = 'nodejs'
export const maxDuration = 60  // 60 seconds for Pro tier

export async function POST(req: NextRequest) {
  try {
    // Longer timeout for Pro tier
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout - operation took too long'));
      }, 55000); // 55 seconds (leaving some buffer)
    });

    // Your existing mint logic wrapped in a promise
    const mintPromise = async () => {
      const { publicKey, doorNumber } = await req.json();
      const network = process.env.NETWORK;

      if (!publicKey) {
        return NextResponse.json(
          { error: 'No wallet connected' },
          { status: 400 }
        );
      }

      const isWhitelisted = await isWalletWhitelisted(publicKey);
      if (!isWhitelisted) {
        return NextResponse.json(
          { error: "Please use the same wallet you used to mint your Superteam Germany Membership NFT." },
          { status: 403 }
        );
      }

      if (!doorNumber || doorNumber < 1 || doorNumber > 24) {
        return NextResponse.json(
          { error: "Invalid door number" },
          { status: 400 }
        );
      }

      if (!isValidMintingDate(doorNumber)) {
        const month = getMonthName();
        return NextResponse.json(
          {
            error: `Door #${doorNumber} can only be opened on ${month} ${doorNumber}. Please come back then!`
          },
          { status: 403 }
        );
      }

      const existingMint = await db.query.mints.findFirst({
        where: (mints, { and, eq }) => and(
          eq(mints.walletAddress, publicKey),
          eq(mints.doorNumber, doorNumber)
        )
      });

      if (existingMint) {
        return NextResponse.json(
          { error: `You have already minted Door #${doorNumber}` },
          { status: 400 }
        );
      }

      if (!network) {
        throw new Error('NETWORK environment variable is not set');
      }
      
      const umi = createUmi(network)
        .use(mplBubblegum())
        .use(mplTokenMetadata())
        .use(dasApi()
        // .use(
        //   irysUploader({
        //       address: 'https://devnet.irys.xyz',
        //   })
      );
      // const walletFile = fs.readFileSync('./.keys/adventcalendar-wallet.json', 'utf8');
      // const walletData = JSON.parse(walletFile);

      const privateKey = process.env.PAYER_PRIV;
      if (!privateKey) {
        throw new Error('PAYER_PRIV environment variable is not set');
      }

      // Decode the Base64-encoded private key
      const secretKeyBuffer = Buffer.from(privateKey, 'base64');
      const secretKeyUint8Array = new Uint8Array(secretKeyBuffer);

      // Create the keypair from the secret key
      const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyUint8Array);

      // Set the keypair as the signer
      umi.use(keypairIdentity(keypair));

      // Get the correct image URL for this door
      const imageUrl = getDoorImageUrl(doorNumber);

      const assetId = await mintNft(umi, "nftMetadataUri", publicKey, doorNumber);

      // Record the mint in the database
      try {
        await db.insert(mints).values({
          id: uuidv4(),
          walletAddress: publicKey,
          doorNumber,
          nftAddress: assetId.toString(),
          isEligibleForRaffle: true,
        });
      } catch (error: any) {
        console.error("🚀 ~ mintNft ~ error:", error)
        // Handle unique constraint violation
        if (error.code === 'ER_DUP_ENTRY') {
          return NextResponse.json(
            { error: `You have already minted Door #${doorNumber}` },
            { status: 400 }
          );
        }
        throw error;
      }

      return NextResponse.json({ 
        success: true, 
        doorNumber,
        imageUrl,
        publicKey,
        message: `Successfully minted NFT for door ${doorNumber}!`
      });
    };

    // Race between timeout and mint
    const result = await Promise.race([
      mintPromise(),
      timeoutPromise
    ]);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Operation timed out after 55 seconds. Please try again.' },
        { status: 504 }
      );
    }
    console.error("Mint error:", error);
    return NextResponse.json(
      { error: `Failed to mint NFT: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Mint NFT
 * @param umi 
 * @param nftMetadataUri 
 * @param userPublicKey 
 * @param doorNumber 
 * @returns 
 */
const mintNft = async (umi: Umi, nftMetadataUri: string, userPublicKey: string, doorNumber: number) => {
  try{

    const newOwner = publicKey(userPublicKey)

    const merkleTreeString = process.env.MERKLE_TREE_PUBLIC_KEY;
    if (!merkleTreeString) {
      throw new Error('MERKLE_TREE_PUBLIC_KEY is not set');
    }

    const merkleTreePubkey = publicKey(merkleTreeString);

    const collectionPubkey = process.env.COLLECTION_PUBLIC_KEY;
    if (!collectionPubkey) {
      throw new Error('COLLECTION_PUBLIC_KEY is not set');
    }

    const collectionKey = publicKey(collectionPubkey);

    const { signature } = await mintV1(umi, {
      leafOwner: newOwner,
      merkleTree: merkleTreePubkey,
      metadata: {
        name: `${NFT_NAME} ${doorNumber}`,
        symbol: "STDE2024", 
        uri: `https://gateway.pinata.cloud/ipfs/QmWg4AVE88EmPvd8wPgcm6gVwEJAkJUYuMgFDbL1J1jytE/door${doorNumber}.png`,  // TODO: Replace with dynamic URL
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
    console.error("🚀 ~ mintNft ~ error:", error)
    throw error;
  }
}