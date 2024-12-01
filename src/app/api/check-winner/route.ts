import { NextResponse } from 'next/server';
import { db } from '@/db';
import { registrations, prizeWinners, prizes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { doorNumber, publicKey } = await request.json();
    console.log("🚀 ~ POST ~ publicKey:", publicKey)
    console.log("🚀 ~ POST ~ doorNumber:", doorNumber)
    
    // Check if user is registered
    const registration = await db.query.registrations.findFirst({
      where: and(
        eq(registrations.walletAddress, publicKey),
        eq(registrations.isActive, true)
      )
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Wallet not registered' },
        { status: 400 }
      );
    }

    // Convert Date to YYYY-MM-DD format
    // const today = new Date().toISOString().split('T')[0];

    const winner = await db.query.prizeWinners.findFirst({
      where: and(
        eq(prizeWinners.walletAddress, publicKey),
        eq(prizeWinners.doorNumber, doorNumber),
      )
    });
    

    if (winner) {
      if(!winner.prizeId) {
        console.error("Winner has no prize assigned")
        return NextResponse.json({
          isWinner: false,
          prize: null,
          alreadyClaimed: winner.claimed
        });
      }
      const prize = await db.query.prizes.findFirst({
        where: eq(prizes.id, winner.prizeId)
      });
      console.log("🚀 ~ POST ~ prize:", prize)
      console.log("🚀 ~ POST ~ winner:", winner)
      return NextResponse.json({
        isWinner: true,
        prize: prize,
        alreadyClaimed: winner.claimed
      });
    }
    else {
      return NextResponse.json({
        isWinner: false,
        prize: null,
        alreadyClaimed: false
      });
    }
  } catch (error) {
    console.error("🚀 ~ POST ~ error:", error)
    return NextResponse.json(
      { error: `Failed to check winner: ${error}` },
      { status: 500 }
    );
  }
} 