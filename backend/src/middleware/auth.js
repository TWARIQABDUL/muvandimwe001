import { verifyToken } from '../utils/jwt.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach user to request
  req.user = decoded;
  next();
}

// Middleware to ensure user's gym_id matches request gym_id
export function gymIsolationMiddleware(req, res, next) {
  const requestGymId = req.body.gym_id || req.query.gym_id || req.params.gym_id;
  
  // If gym_id is provided in request, it must match user's gym_id
  if (requestGymId && requestGymId !== req.user.gym_id) {
    return res.status(403).json({ error: 'Unauthorized: gym_id mismatch' });
  }

  // Ensure gym_id is in request body for multi-tenant isolation
  if (!req.body.gym_id && req.method !== 'GET') {
    req.body.gym_id = req.user.gym_id;
  }

  next();
}

// Middleware to check user role
export function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `This action requires one of: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}
