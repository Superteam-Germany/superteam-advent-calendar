import { NextRequest, NextResponse } from 'next/server';
import { isValidMintingDate, getMonthName } from '@/utils/dateUtils';
import { getDoorImageUrl } from '@/utils/imageUtils';
import {
  createTree,
  findLeafAssetIdPda,
  getAssetWithProof,
  mintV1,
  mplBubblegum,
  parseLeafFromMintV1Transaction,
  verifyCollection,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createGenericFile,
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
  sol,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import fs from "fs";
import { Umi, Pda, PublicKey } from "@metaplex-foundation/umi";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";

// https://devnet.irys.xyz/ 

const NFT_NAME = 'SuperteamDE Door '

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

    // Add your minting logic here, using the imageUrl for the NFT metadata
    console.log(`Minting NFT for door ${doorNumber} with image: ${imageUrl}`);
    console.log(`Minting to wallet: ${publicKey}`);

    const nftMetadataUri = await createNftMetadata(doorNumber, imageUrl);
    console.log("🚀 ~ POST ~ nftMetadataUri:", nftMetadataUri)

    const res = await mintNft(umi, nftMetadataUri, publicKey, doorNumber);
    console.log("🚀 ~ POST ~ res:", res)

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
const createNftMetadata = async (doorNumber: number, imageUrl: string) => {    

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

  const nftMetadata = {
    name: `${NFT_NAME} ${doorNumber}`,
    symbol: "STDE",
    description: `SuperteamDE Advent Calendar NFT for Door ${doorNumber}`,
    image: imageUrl,
    external_url: 'https://superteamde.fun',
    attributes: [
      { trait_type: "Year", value: "2024" },
      { trait_type: "Day", value: `${doorNumber}` }
    ],
    properties: {
      files: [
          {
              uri: imageUrl,
              type: 'image/png',
          }
      ],
      category: "image", // Add this if required for compatibility
      creators: [
          {
              address: umi.identity.publicKey.toString(),
              share: 100,
          },
      ],
    },
  };          
      
  console.log("🚀 ~ createNftMetadata ~ nftMetadata:", nftMetadata)

  try{
    const nftMetadataUri = await umi.uploader.uploadJson(nftMetadata)
    console.log("🚀 ~ createNftMetadata ~ nftMetadataUri:", nftMetadataUri)

    return nftMetadataUri;
  } catch (error) {
    console.error("🚀 ~ createNftMetadata ~ error:", error)
    throw error;
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
        uri: nftMetadataUri, 
        sellerFeeBasisPoints: 0, 
        collection: { key: collectionKey, verified: false },
        creators: [
          { address: umi.identity.publicKey, verified: true, share: 100 },
        ],
      },
    }).sendAndConfirm(umi, { send: { commitment: 'finalized' } })

    //
    // ** Fetching Asset **
    //

    //
    // Here we find the asset ID of the compressed NFT using the leaf index of the mint transaction
    // and then log the asset information.
    //
    console.log('Finding Asset ID...')
    const leaf = await parseLeafFromMintV1Transaction(umi, signature)
    const assetId = findLeafAssetIdPda(umi, {
      merkleTree: merkleTreePubkey,
      leafIndex: leaf.nonce,
    })

    console.log('Compressed NFT Asset ID:', assetId.toString())

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