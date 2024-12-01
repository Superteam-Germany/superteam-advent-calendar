import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mints } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  try {
    const mintedDoors = await db
      .select({ 
        doorNumber: mints.doorNumber,
        isEligibleForRaffle: mints.isEligibleForRaffle,
        nftAddress: mints.nftAddress
      })
      .from(mints)
      .where(eq(mints.walletAddress, wallet));

    return NextResponse.json({
      openedDoors: mintedDoors
    });
  } catch (error) {
    console.error('Error fetching minted doors:', error);
    return NextResponse.json({ error: 'Failed to fetch minted doors' }, { status: 500 });
  }
} 