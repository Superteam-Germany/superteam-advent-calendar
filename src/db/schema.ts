import { pgTable, text, timestamp, boolean, integer, serial, date, unique } from 'drizzle-orm/pg-core';

export const mints = pgTable('mints', {
  id: text('id').primaryKey(),
  walletAddress: text('wallet_address').notNull(),
  doorNumber: integer('door_number').notNull(),
  mintedAt: timestamp('minted_at').defaultNow().notNull(),
  nftAddress: text('nft_address').notNull(),
  isEligibleForRaffle: boolean('is_eligible_for_raffle').default(true).notNull(),
}, (table) => ({
  uniqWalletDoor: unique('uniq_wallet_door').on(table.walletAddress, table.doorNumber),
}));

export const registrations = pgTable('registrations', {
  walletAddress: text('wallet_address').primaryKey(),
  registrationDate: timestamp('registration_date').defaultNow(),
  registrationTx: text('registration_tx'),
  isActive: boolean('is_active').default(true)
});

export const winners = pgTable('winners', {
  id: serial('id').primaryKey(),
  walletAddress: text('wallet_address').references(() => registrations.walletAddress),
  doorNumber: integer('door_number'),
  dayDate: date('day_date'),
  prize: text('prize'),
  claimed: boolean('claimed').default(false),
  claimedTx: text('claimed_tx'),
}, (table) => {
  return {
    dayDoorUnique: unique().on(table.dayDate, table.doorNumber)
  };
}); 