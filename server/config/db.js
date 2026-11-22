import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.js';
import { MedicineModel } from '../models/Medicine.js';
import { NotificationModel } from '../models/Notification.js';

export const INITIAL_USERS = [
  {
  id: 'admin',
  name: 'Vaibhav Maurya (Admin)',
  email: 'vaibhav.maurya.mims@gmail.com',
  role: 'Administrator',
  active: true,
  lastActive: 'Just now'
},
{
  id: 'pharmacist',
  name: 'Sneha Sharma (Pharmacist)',
  email: 'sneha.sharma.mims@gmail.com',
  role: 'Pharmacist',
  active: true,
  lastActive: 'Just now'
},
{
  id: 'staff',
  name: 'Vikram Yadav (Staff)',
  email: 'vikram.yadav.mims@gmail.com',
  role: 'Staff',
  active: true,
  lastActive: 'Just now'
}
];

export const DEFAULT_DEMO_USER = INITIAL_USERS[0];

export const INITIAL_MEDICINES = [
  {
    id: 'm1',
    name: 'Amoxicillin 500mg',
    category: 'Antibiotic',
    sku: 'AMX-500',
    stock: 248,
    reorderLevel: 80,
    unit: 'capsules',
    price: 8.4,
    expiryDate: '2026-11-14',
    status: 'In stock',
    batches: [{ batch: 'AMX-24A', quantity: 248, expiryDate: '2026-11-14' }]
  },
  {
    id: 'm2',
    name: 'Metformin 500mg',
    category: 'Diabetes',
    sku: 'MET-500',
    stock: 42,
    reorderLevel: 60,
    unit: 'tablets',
    price: 3.2,
    expiryDate: '2027-03-08',
    status: 'Low stock',
    batches: [{ batch: 'MET-11B', quantity: 42, expiryDate: '2027-03-08' }]
  },
  {
    id: 'm3',
    name: 'Insulin Glargine',
    category: 'Diabetes',
    sku: 'INS-GLA',
    stock: 9,
    reorderLevel: 18,
    unit: 'vials',
    price: 42.0,
    expiryDate: '2026-09-28',
    status: 'Critical',
    batches: [{ batch: 'INS-04C', quantity: 9, expiryDate: '2026-09-28' }]
  },
  {
    id: 'm4',
    name: 'Azithromycin 250mg',
    category: 'Antibiotic',
    sku: 'AZI-250',
    stock: 150,
    reorderLevel: 50,
    unit: 'tablets',
    price: 12.5,
    expiryDate: '2027-01-20',
    status: 'In stock',
    batches: [{ batch: 'AZI-18D', quantity: 150, expiryDate: '2027-01-20' }]
  },
  {
    id: 'm5',
    name: 'Paracetamol 650mg',
    category: 'Analgesic',
    sku: 'PCM-650',
    stock: 520,
    reorderLevel: 120,
    unit: 'tablets',
    price: 2.1,
    expiryDate: '2027-08-15',
    status: 'In stock',
    batches: [{ batch: 'PCM-99E', quantity: 520, expiryDate: '2027-08-15' }]
  },
  {
    id: 'm6',
    name: 'Atorvastatin 20mg',
    category: 'Cardiovascular',
    sku: 'ATR-020',
    stock: 35,
    reorderLevel: 50,
    unit: 'tablets',
    price: 9.8,
    expiryDate: '2026-12-10',
    status: 'Low stock',
    batches: [{ batch: 'ATR-33F', quantity: 35, expiryDate: '2026-12-10' }]
  },
  {
    id: 'm7',
    name: 'Amlodipine 5mg',
    category: 'Cardiovascular',
    sku: 'AML-005',
    stock: 180,
    reorderLevel: 60,
    unit: 'tablets',
    price: 4.5,
    expiryDate: '2027-05-18',
    status: 'In stock',
    batches: [{ batch: 'AML-21G', quantity: 180, expiryDate: '2027-05-18' }]
  },
  {
    id: 'm8',
    name: 'Pantoprazole 40mg',
    category: 'Gastrointestinal',
    sku: 'PAN-040',
    stock: 210,
    reorderLevel: 70,
    unit: 'tablets',
    price: 7.2,
    expiryDate: '2027-04-12',
    status: 'In stock',
    batches: [{ batch: 'PAN-14H', quantity: 210, expiryDate: '2027-04-12' }]
  },
  {
    id: 'm9',
    name: 'Cetirizine 10mg',
    category: 'Antiallergic',
    sku: 'CET-010',
    stock: 310,
    reorderLevel: 80,
    unit: 'tablets',
    price: 2.8,
    expiryDate: '2027-09-30',
    status: 'In stock',
    batches: [{ batch: 'CET-07J', quantity: 310, expiryDate: '2027-09-30' }]
  },
  {
    id: 'm10',
    name: 'Montelukast 10mg',
    category: 'Respiratory',
    sku: 'MON-010',
    stock: 15,
    reorderLevel: 40,
    unit: 'tablets',
    price: 14.0,
    expiryDate: '2026-11-05',
    status: 'Critical',
    batches: [{ batch: 'MON-55K', quantity: 15, expiryDate: '2026-11-05' }]
  },
  {
    id: 'm11',
    name: 'Ibuprofen 400mg',
    category: 'Anti-inflammatory',
    sku: 'IBU-400',
    stock: 85,
    reorderLevel: 50,
    unit: 'tablets',
    price: 3.6,
    expiryDate: '2027-06-25',
    status: 'In stock',
    batches: [{ batch: 'IBU-82L', quantity: 85, expiryDate: '2027-06-25' }]
  },
  {
    id: 'm12',
    name: 'Ciprofloxacin 500mg',
    category: 'Antibiotic',
    sku: 'CIP-500',
    stock: 28,
    reorderLevel: 45,
    unit: 'tablets',
    price: 11.0,
    expiryDate: '2026-10-31',
    status: 'Low stock',
    batches: [{ batch: 'CIP-19M', quantity: 28, expiryDate: '2026-10-31' }]
  },
  {
    id: 'm13',
    name: 'Salbutamol Inhaler 100mcg',
    category: 'Respiratory',
    sku: 'SAL-100',
    stock: 14,
    reorderLevel: 25,
    unit: 'inhalers',
    price: 28.5,
    expiryDate: '2026-12-01',
    status: 'Critical',
    batches: [{ batch: 'SAL-02N', quantity: 14, expiryDate: '2026-12-01' }]
  },
  {
    id: 'm14',
    name: 'Vitamin D3 60,000 IU',
    category: 'Supplements',
    sku: 'VIT-D60',
    stock: 140,
    reorderLevel: 40,
    unit: 'capsules',
    price: 18.0,
    expiryDate: '2027-07-20',
    status: 'In stock',
    batches: [{ batch: 'VIT-77P', quantity: 140, expiryDate: '2027-07-20' }]
  },
  {
    id: 'm15',
    name: 'Losartan Potassium 50mg',
    category: 'Cardiovascular',
    sku: 'LOS-050',
    stock: 95,
    reorderLevel: 50,
    unit: 'tablets',
    price: 6.5,
    expiryDate: '2027-02-14',
    status: 'In stock',
    batches: [{ batch: 'LOS-41R', quantity: 95, expiryDate: '2027-02-14' }]
  }
];

export const INITIAL_CUSTOMERS = [
  {
    id: 'cust-1',
    name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    email: 'rahul.sharma@gmail.com',
    type: 'Regular',
    notes: 'Prefers monthly refills for Metformin and Atorvastatin.',
    createdBy: 'u1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-2',
    name: 'Shree Sai Multispeciality Clinic',
    phone: '+91 98765 12345',
    email: 'shreesaiclinic@gmail.com',
    type: 'Wholesale',
    notes: 'Bulk orders every fortnight. Requires GST invoice.',
    createdBy: 'u1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-3',
    name: 'Priya Patil',
    phone: '+91 97654 32109',
    email: 'priya.patil@gmail.com',
    type: 'Regular',
    notes: 'Cash on delivery. Reported penicillin allergy; verify allergy before dispensing related antibiotics.',
    createdBy: 'u2',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-4',
    name: 'Vallabh Patil',
    phone: '+91 98123 45670',
    email: 'vallabh.patil@gmail.com',
    type: 'Regular',
    notes: 'Prefers digital payments and timely prescription refills.',
    createdBy: 'u1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-5',
    name: 'Khushi Singh',
    phone: '+91 98234 56701',
    email: 'khushi.singh@gmail.com',
    type: 'Regular',
    notes: 'Prefers SMS reminders for medicine refills.',
    createdBy: 'u1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-6',
    name: 'Rahul Kumar',
    phone: '+91 98345 67812',
    email: 'rahul.kumar@gmail.com',
    type: 'Regular',
    notes: 'Prefers monthly medicine purchases.',
    createdBy: 'u2',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-7',
    name: 'Maharajashiv Som Dutt',
    phone: '+91 98456 78923',
    email: 'maharajashiv.dutt@gmail.com',
    type: 'Regular',
    notes: 'Prefers digital receipts for pharmacy purchases.',
    createdBy: 'u1',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Critical Stock Notice',
    message: 'Insulin Glargine is critically low (9 vials left).',
    type: 'critical',
    read: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'notif-2',
    title: 'Low Stock Alert',
    message: 'Montelukast 10mg and Salbutamol Inhaler are below threshold.',
    type: 'warning',
    read: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'notif-3',
    title: 'Expiry Watch',
    message: 'Ciprofloxacin batch CIP-19M expires in late October 2026.',
    type: 'info',
    read: false,
    createdAt: new Date().toISOString()
  }
];

let isMongoConnected = false;

export async function connectDB() {
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_WITH_MONGO) {
    isMongoConnected = false;
    return false;
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
  if (!mongoUri) {
    isMongoConnected = false;
    return false;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    isMongoConnected = true;
    console.log('Connected to MongoDB.');
    await seedDatabaseIfNeeded();
    return true;
  } catch (err) {
    console.warn(`MongoDB connection error (${err.message}). Using memory fallback mode.`);
    isMongoConnected = false;
    return false;
  }
}

export function isDbConnected() {
  return isMongoConnected || mongoose.connection.readyState === 1;
}

async function seedDatabaseIfNeeded() {
  if (!isDbConnected()) return;
  try {
    const hashedPassword = await bcrypt.hash('demo1234', 10);

    for (const user of INITIAL_USERS) {
      const existing = await UserModel.findOne({ email: user.email });
      if (!existing) {
        await UserModel.create({
          ...user,
          password: hashedPassword
        });
        console.log(`Seeded user ${user.email} (${user.role}) in MongoDB.`);
      }
    }

    for (const med of INITIAL_MEDICINES) {
      const existing = await MedicineModel.findOne({ id: med.id });
      if (!existing) {
        await MedicineModel.create(med);
      }
    }

    const notifCount = await NotificationModel.countDocuments();
    if (notifCount === 0) {
      await NotificationModel.insertMany(INITIAL_NOTIFICATIONS);
      console.log('Seeded default notifications in MongoDB.');
    }
  } catch (err) {
    console.error('Database seeding error:', err);
  }
}
