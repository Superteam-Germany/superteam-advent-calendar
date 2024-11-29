import { NextResponse } from 'next/server';
import { db } from '@/db';
import { registrations, prizeWinners } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { doorNumber, publicKey } = await request.json();
    
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
    const today = new Date().toISOString().split('T')[0];

    const winner = await db.query.prizeWinners.findFirst({
      where: and(
        eq(prizeWinners.walletAddress, publicKey),
        eq(prizeWinners.doorNumber, doorNumber),
      )
    });

    if (winner) {
      return NextResponse.json({
        isWinner: true,
        prize: winner.prizeId,
        alreadyClaimed: winner.claimed
      });
    }

    // TODO: Implement actual winner selection logic
    const isWinner = Math.random() > 0.5;
    const prize = "1 SOL";

    if (isWinner) {
      await db.insert(prizeWinners).values({
        walletAddress: publicKey,
        doorNumber,
        prizeId: prize
      });
    }

    return NextResponse.json({ isWinner, prize });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to check winner: ${error}` },
      { status: 500 }
    );
  }
} 