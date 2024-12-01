import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { prizeWinners, registrations, prizes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'edge';

interface PrizeInfo {
  id: string;
  doorNumber: number;
  quantity: number;
}

interface Winner {
  walletAddress: string;
  prizeId: string;
  doorNumber: number;
}

async function isValidRequest(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;
  
  return authHeader === `Bearer ${process.env.RAFFLE_SECRET_TOKEN}`;
}

async function getDay() {
  // const today = new Date();
const today = new Date('2024-12-02');
  // Only run between Dec 1 and Dec 24
  if (today.getMonth() !== 11 || today.getDate() > 24 || today.getDate() < 1) {
    throw new Error('Raffle only runs during December 1-24');
  }
  return today.getDate();
}

async function getDailyPrizes(doorNumber: number): Promise<PrizeInfo[]> {
  const dailyPrizes = await db.select({
    id: prizes.id,
    doorNumber: prizes.doorNumber,
    quantity: prizes.quantity,
  })
  .from(prizes)
  .where(eq(prizes.doorNumber, doorNumber));

  if (dailyPrizes.length === 0) {
    throw new Error(`No prizes found for door ${doorNumber}`);
  }

  return dailyPrizes;
}

async function selectWinners(doorNumber: number): Promise<Winner[]> {
  // Get all prizes for the day
  const dailyPrizes = await getDailyPrizes(doorNumber);
  
  // Get all registered participants
  const participants = await db.select()
    .from(registrations)
    .where(eq(registrations.isActive, true));

  if (participants.length === 0) {
    throw new Error('No registered participants found');
  }

  // Get existing winners for this door/day
  const existingWinners = await db.select()
    .from(prizeWinners)
    .where(
      and(
        eq(prizeWinners.doorNumber, doorNumber),
      )
    );

  // Create a set of all wallets that have already won today
  const todaysWinnerWallets = new Set(existingWinners.map(winner => winner.walletAddress));

  // Filter out participants who already won today
  let availableParticipants = participants.filter(
    participant => !todaysWinnerWallets.has(participant.walletAddress)
  );

  const selectedWinners: Winner[] = [];
  
  // Process each prize
  for (const prize of dailyPrizes) {
    // Check how many winners we already have for this prize
    const existingWinnersForPrize = existingWinners.filter(w => w.prizeId === prize.id);
    const remainingQuantity = prize.quantity - existingWinnersForPrize.length;

    if (remainingQuantity <= 0) continue;

    // If we don't have enough eligible participants, stop the raffle
    if (availableParticipants.length === 0) {
      break; // Exit the prize loop if we run out of eligible participants
    }

    // Select winners for this prize
    for (let i = 0; i < remainingQuantity && availableParticipants.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      const winner = availableParticipants[randomIndex];
      
      selectedWinners.push({
        walletAddress: winner.walletAddress,
        prizeId: prize.id,
        doorNumber
      });

      // Remove selected winner from available participants
      availableParticipants = availableParticipants.filter(p => p.walletAddress !== winner.walletAddress);
    }
  }

  return selectedWinners;
}

export async function POST(req: Request) {
  try {
    // Validate request
    if (!await isValidRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const day = await getDay();
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have ANY winners for this day/door combination
    const existingCount = await db
      .select({ 
        count: sql<number>`count(*)`
      })
      .from(prizeWinners)
      .where(
        and(
          eq(prizeWinners.doorNumber, day),
        )
      );

    if (existingCount[0].count > 0) {
      return NextResponse.json({ 
        message: 'Winners have already been selected for this day',
        day
      }, { status: 400 });
    }

    const selectedWinners = await selectWinners(day);

    if (selectedWinners.length === 0) {
      return NextResponse.json({ message: 'No new winners to select' });
    }

    // Insert all winners at once to reduce database calls
    await db.insert(prizeWinners).values(
      selectedWinners.map(winner => ({
        walletAddress: winner.walletAddress,
        doorNumber: winner.doorNumber,
        prizeId: winner.prizeId,
        dayDate: today,
        claimed: false
      }))
    );

    return NextResponse.json({ 
      success: true, 
      day,
      winnersCount: selectedWinners.length,
      winners: selectedWinners.map(w => ({
        walletAddress: w.walletAddress,
        doorNumber: w.doorNumber,
        prizeId: w.prizeId
      }))
    });

  } catch (error) {
    console.error('Raffle error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process raffle' }, 
      { status: 500 }
    );
  }
} 