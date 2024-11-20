import { pgTable, text, timestamp, integer, boolean, primaryKey, unique } from "drizzle-orm/pg-core";

export const mints = pgTable('mints', {
  id: text('id').primaryKey(), // UUID for the mint
  walletAddress: text('wallet_address').notNull(),
  doorNumber: integer('door_number').notNull(),
  mintedAt: timestamp('minted_at').defaultNow().notNull(),
  nftAddress: text('nft_address').notNull(),
  isEligibleForRaffle: boolean('is_eligible_for_raffle').default(true).notNull(),
}, (table) => ({
  uniqWalletDoor: unique('uniq_wallet_door').on(table.walletAddress, table.doorNumber),
}));

export const raffles = pgTable('raffles', {
  id: text('id').primaryKey(), // UUID for the raffle
  doorNumber: integer('door_number').notNull(),
  drawDate: timestamp('draw_date').notNull(),
  prize: text('prize').notNull(),
  winnerWalletAddress: text('winner_wallet_address'),
  isDrawn: boolean('is_drawn').default(false).notNull(),
});

// Junction table for raffle entries
export const raffleEntries = pgTable('raffle_entries', {
  mintId: text('mint_id').notNull().references(() => mints.id),
  raffleId: text('raffle_id').notNull().references(() => raffles.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.mintId, table.raffleId] }),
})); 