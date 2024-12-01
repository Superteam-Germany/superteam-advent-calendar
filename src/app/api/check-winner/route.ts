import { NextResponse } from 'next/server';
import { db } from '@/db';
import { registrations, prizeWinners, prizes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';

export async function POST(request: Request) {
  try {
    const { doorNumber, publicKey, signature, message } = await request.json();

    if (!publicKey || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing authentication parameters' },
        { status: 400 }
      );
    }

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
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }

    // Get current date in Berlin timezone
    const berlinTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' });
    const currentDate = new Date(berlinTime);
    const currentDay = currentDate.getDate();

    // Check if trying to open a future door
    if (doorNumber > currentDay) {
      return NextResponse.json(
        { error: "This door cannot be opened yet!" },
        { status: 403 }
      );
    }
    
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