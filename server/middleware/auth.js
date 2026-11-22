import jwt from 'jsonwebtoken';
import { DEFAULT_DEMO_USER } from '../config/db.js';

const secret = process.env.JWT_SECRET || 'mims-development-secret';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  if (token === 'demo-token') {
    req.user = DEFAULT_DEMO_USER;
    return next();
  }
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (roles.includes(req.user?.role)) {
      return next();
    }
    res.status(403).json({ message: 'Insufficient permissions.' });
  };
}

export function publicMedicine(medicine) {
  const stock = Number(medicine.stock || 0);
  const reorderLevel = Number(medicine.reorderLevel || 0);
  const status = stock <= reorderLevel / 2 ? 'Critical' : stock <= reorderLevel ? 'Low stock' : 'In stock';
  return { ...medicine, status };
}

export function validPositiveQuantity(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}
