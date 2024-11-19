import { NextRequest, NextResponse } from 'next/server';
import { isValidMintingDate, getMonthName } from '@/utils/dateUtils';

export async function POST(req: NextRequest) {
  try {
    const { doorNumber } = await req.json();

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

    // Add your minting logic here
    console.log(`Minting NFT for door ${doorNumber}...`);

    return NextResponse.json({ 
      success: true, 
      doorNumber,
      message: `Successfully minted NFT for door ${doorNumber}!`
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to mint NFT' },
      { status: 500 }
    );
  }
}