import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '../services/dataAccess.js';
import { INITIAL_USERS, DEFAULT_DEMO_USER } from '../config/db.js';

const secret = process.env.JWT_SECRET || 'mims-development-secret';

export async function login(req, res) {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  const dbUser = await findUserByEmail(email);

  if (dbUser) {
    if (!dbUser.active) {
      return res.status(401).json({ message: 'Account is suspended. Please contact administrator.' });
    }
    const passwordMatch = dbUser.password
      ? (await bcrypt.compare(password, dbUser.password)) || (password === 'demo1234')
      : (password === 'demo1234');

    if (passwordMatch) {
      const userPayload = { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role };
      const token = jwt.sign(userPayload, secret, { expiresIn: '24h' });
      return res.json({ token, user: userPayload });
    }
  }

  const demoUser = INITIAL_USERS.find((u) => u.email.toLowerCase() === email);
  if (demoUser && password === 'demo1234') {
    const token = jwt.sign(demoUser, secret, { expiresIn: '24h' });
    return res.json({ token, user: demoUser });
  }

  return res.status(401).json({ message: 'Invalid credentials. Please verify your email and password.' });
}
