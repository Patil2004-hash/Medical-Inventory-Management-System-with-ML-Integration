import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import medicineRoutes from './routes/medicineRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import intelligenceRoutes from './routes/intelligenceRoutes.js';
import customerRoutes from './routes/customerRoutes.js';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

const app = express();
const port = Number(process.env.PORT || 5000);

// Connect to MongoDB if MONGO_URI is configured
connectDB();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/team', teamRoutes);
app.use('/api', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api', intelligenceRoutes);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`MIMS API listening on http://localhost:${port}`));
}

export { app };
