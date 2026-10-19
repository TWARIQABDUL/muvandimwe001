import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';

// Records who did what. Never throws: a failed log must not fail the action it describes.
export async function logAction(req, { action, entityType = null, entityId = null, details = null, gymId, user }) {
  try {
    const actor = user || req?.user || {};
    const gym = gymId !== undefined ? gymId : (actor.gym_id_override || actor.gym_id || null);
    if (req?.res?.locals) req.res.locals.audited = true;
    await getDatabase().run(
      `INSERT INTO audit_logs (id, gym_id, user_id, username, role, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        gym === 'all' ? null : gym,
        actor.id || null,
        actor.username || null,
        actor.role || null,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : null,
        new Date().toISOString()
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// Catch-all so that no write goes unrecorded: any successful non-GET request that did
// not log itself with a meaningful description is recorded by method and path.
export function auditFallback(req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();
  res.on('finish', () => {
    if (res.locals.audited || res.statusCode >= 400 || !req.user) return;
    const path = req.originalUrl.split('?')[0];
    logAction(req, {
      action: `${req.method} ${path}`,
      entityType: path.split('/')[2] || null
    });
  });
  next();
}
