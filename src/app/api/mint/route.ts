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
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import fs from "fs";
import { Umi, } from "@metaplex-foundation/umi";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { isWalletWhitelisted } from '@/utils/whitelisting';
import { db } from '@/db';
import { mints } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

// https://devnet.irys.xyz/ 

const NFT_NAME = '[test]SuperteamDE Door '

export async function POST(req: NextRequest) {
  try {
    const { publicKey, doorNumber } = await req.json();

    if (!publicKey) {
      return NextResponse.json(
        { error: 'No wallet connected' },
        { status: 400 }
      );
    }

    console.log(`Minting request from wallet: ${publicKey}`);

    const isWhitelisted = await isWalletWhitelisted(publicKey);
    if (!isWhitelisted) {
      return NextResponse.json(
        { error: 'Please use the same wallet you used to mint your Superteam Germany Membership NFT.' },
        { status: 403 }
      );
    }
 
    if (!doorNumber || doorNumber < 1 || doorNumber > 24) {
      return NextResponse.json(
        { error: 'Invalid door number' },
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

    // Get the correct image URL for this door
    const imageUrl = getDoorImageUrl(doorNumber);

    // const nftMetadataUri = await createNftMetadata(doorNumber, imageUrl);

    const assetId = await mintNft(umi, "nftMetadataUri", publicKey, doorNumber);
    console.log("🚀 ~ POST ~ assetId:", assetId.toString())

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
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to mint NFT' },
      { status: 500 }
    );
  }
}

/**
 * Create NFT metadata
 * @param doorNumber 
 * @param imageUrl 
 * @returns 
 */
// const createNftMetadata = async (doorNumber: number, imageUrl: string) => {   
  
//   const collectionPubkey = process.env.COLLECTION_PUBLIC_KEY;
//   console.log("🚀 ~ createNftMetadata ~ collectionPubkey:", collectionPubkey)
//   if (!collectionPubkey) {
//     throw new Error('COLLECTION_PUBLIC_KEY is not set');
//   }

//   const umi = createUmi('https://api.devnet.solana.com')
//     .use(mplBubblegum())
//     .use(mplTokenMetadata())
//     .use(dasApi())
//     .use(
//       irysUploader({
//           address: 'https://devnet.irys.xyz',
//       })
//   );

//   const walletFile = fs.readFileSync('./.keys/adventcalendar-wallet.json', 'utf8');
//   const walletData = JSON.parse(walletFile);

//   // Decode the Base64-encoded private key
//   const secretKeyBuffer = Buffer.from(walletData.privateKey, 'base64');
//   const secretKeyUint8Array = new Uint8Array(secretKeyBuffer);

//   // Create the keypair from the secret key
//   const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyUint8Array);

//     // Set the keypair as the signer
//   umi.use(keypairIdentity(keypair));

//   const name = `${NFT_NAME} ${doorNumber}`;

//   const nftMetadata = {
//     name,
//     symbol: "STDE",
//     description: "SuperteamDE Advent Calendar NFT",
//     image: imageUrl,
//     external_url: 'https://superteamde.fun',
//     attributes: [
//       {
//         "trait_type": "Year",
//         "value": "2024"
//       },
//       {
//         "trait_type": "Day",
//         "value": doorNumber.toString()
//       }
//     ],
//     properties: {
//       files: [
//         {
//           uri: imageUrl,
//           type: 'image/png',
//         },
//       ],
//       category: "image",
//       creators: [
//         {
//           address: umi.identity.publicKey.toString(),
//           share: 100
//         }
//       ]
//     },
//     seller_fee_basis_points: 0,
//     collection: null
//   };


//   console.log("🚀 ~ createNftMetadata ~ nftMetadata:", nftMetadata)

//   try{
//     const nftMetadataUri = await umi.uploader.uploadJson(nftMetadata)
//     console.log("🚀 ~ createNftMetadata ~ nftMetadataUri:", nftMetadataUri)

//     return nftMetadataUri;
//   } catch (error) {
//     console.error("🚀 ~ createNftMetadata ~ error:", error)
//     throw error;
//   }
// }

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

    console.log('Minting Compressed NFT to Merkle Tree...')

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

    console.log('Finding Asset ID...');
    const leaf = await parseLeafFromMintV1Transaction(umi, signature);
    const assetId = findLeafAssetIdPda(umi, {
      merkleTree: merkleTreePubkey,
      leafIndex: leaf.nonce,
    })

    console.log('Compressed NFT Asset ID:', assetId.toString())

    return assetId;

    // // Fetch the asset using umi rpc with DAS.
    // const asset = await umi.rpc.getAccount(assetId[0]);

    // console.log({ asset })

    // //
    // // ** Verify cNFT to Collection **
    // //
    
    // console.log('verifying Collection')
    // const assetWithProof = await getAssetWithProof(, assetId[0])
    // await verifyCollection(umi, {
    //   ...assetWithProof,
    //   collectionMint: collectionKey,
    //   collectionAuthority: umi.identity,
    // }).sendAndConfirm(umi)
  }catch (error) {
    console.error("🚀 ~ mintNft ~ error:", error)
    throw error;
  }
}