import cron from 'node-cron';
import { getDatabase } from '../db/init.js';

/**
 * Cron job: Deactivate expired subscriptions
 * 
 * Runs every day at midnight (00:00).
 * 
 * Marks member_subscriptions as 'expired' when:
 *   1. Time-bound subscriptions whose next_renewal_date is in the past
 *   2. Card-based subscriptions with 0 remaining taps
 */
export function startExpirationCron() {
  // Run at midnight every day: '0 0 * * *'
  cron.schedule('0 0 * * *', async () => {
    console.log(`[CRON] ${new Date().toISOString()} — Running subscription expiration check...`);

    try {
      const db = getDatabase();
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Expire time-bound subscriptions past their renewal date
      const timeResult = await db.run(
        `UPDATE member_subscriptions
         SET status = 'expired'
         WHERE status = 'active'
           AND is_card = 0
           AND next_renewal_date < ?`,
        [todayStr]
      );

      // 2. Expire card-based subscriptions with 0 remaining taps
      const cardResult = await db.run(
        `UPDATE member_subscriptions
         SET status = 'expired'
         WHERE status = 'active'
           AND is_card = 1
           AND remaining_taps <= 0`
      );

      const timeExpired = timeResult.changes || 0;
      const cardExpired = cardResult.changes || 0;

      if (timeExpired > 0 || cardExpired > 0) {
        console.log(`[CRON] Expired ${timeExpired} time-bound and ${cardExpired} card-based subscriptions.`);
      } else {
        console.log(`[CRON] No subscriptions to expire.`);
      }
    } catch (err) {
      console.error('[CRON] Subscription expiration error:', err.message);
    }
  }, {
    timezone: 'Africa/Kigali'
  });

  console.log('✓ Subscription expiration cron job scheduled (daily at midnight, Africa/Kigali)');
}
