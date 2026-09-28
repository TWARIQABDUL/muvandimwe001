/**
 * One-off script to expire all overdue subscriptions RIGHT NOW.
 * 
 * Usage:  node backend/src/scripts/expire-now.js
 */
import { initializeDatabase, getDatabase, closeDatabase } from '../db/init.js';

try {
  await initializeDatabase();
  const db = getDatabase();
  const todayStr = new Date().toISOString().split('T')[0];

  console.log(`\nExpiring subscriptions as of ${todayStr}...\n`);

  // Show what will be expired (preview)
  const timeBound = await db.all(
    `SELECT ms.id, m.name, ms.next_renewal_date
     FROM member_subscriptions ms
     JOIN members m ON ms.member_id = m.id
     WHERE ms.status = 'active' AND ms.is_card = 0 AND ms.next_renewal_date < $1`,
    [todayStr]
  );

  const cardBased = await db.all(
    `SELECT ms.id, m.name, ms.remaining_taps
     FROM member_subscriptions ms
     JOIN members m ON ms.member_id = m.id
     WHERE ms.status = 'active' AND ms.is_card = 1 AND ms.remaining_taps <= 0`
  );

  if (timeBound.length > 0) {
    console.log(`Time-bound subscriptions to expire (${timeBound.length}):`);
    timeBound.forEach(s => console.log(`  - ${s.name} (renewal was ${s.next_renewal_date})`));
  }

  if (cardBased.length > 0) {
    console.log(`\nCard-based subscriptions to expire (${cardBased.length}):`);
    cardBased.forEach(s => console.log(`  - ${s.name} (${s.remaining_taps} taps left)`));
  }

  if (timeBound.length === 0 && cardBased.length === 0) {
    console.log('No subscriptions need expiring. All good!');
    await closeDatabase();
    process.exit(0);
  }

  // Execute the updates
  const timeResult = await db.run(
    `UPDATE member_subscriptions
     SET status = 'expired'
     WHERE status = 'active'
       AND is_card = 0
       AND next_renewal_date < $1`,
    [todayStr]
  );

  const cardResult = await db.run(
    `UPDATE member_subscriptions
     SET status = 'expired'
     WHERE status = 'active'
       AND is_card = 1
       AND remaining_taps <= 0`
  );

  console.log(`\n✓ Done! Expired ${timeResult.changes || 0} time-bound and ${cardResult.changes || 0} card-based subscriptions.`);

  await closeDatabase();
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  await closeDatabase();
  process.exit(1);
}
