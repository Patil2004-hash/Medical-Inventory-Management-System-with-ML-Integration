import { getAllMedicines, getAllSales } from '../services/dataAccess.js';

export async function getDemandForecast(_req, res) {
  const [medicines, sales] = await Promise.all([getAllMedicines(), getAllSales()]);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const demandByMedicine = new Map();

  for (const sale of sales) {
    const soldAt = Date.parse(sale.createdAt || sale.paidAt || '');
    if (!Number.isFinite(soldAt) || soldAt < cutoff || soldAt > Date.now()) continue;
    for (const line of sale.lineItems || []) {
      const medicineId = String(line.medicineId || '');
      if (!medicineId) continue;
      demandByMedicine.set(
        medicineId,
        (demandByMedicine.get(medicineId) || 0) + Number(line.quantity || 0),
      );
    }
  }

  const signals = medicines.map((medicine) => ({
    medicine: medicine.name,
    category: medicine.category || 'Other',
    currentStock: Number(medicine.stock || 0),
    reorderLevel: Number(medicine.reorderLevel || 0),
    recentDemand: demandByMedicine.get(String(medicine.id)) || 0,
  }));

  if (process.env.ML_SERVICE_URL) {
    try {
      const baseUrl = process.env.ML_SERVICE_URL.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/forecast/demand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signals),
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return res.json(await response.json());
      console.warn(`ML demand forecast returned HTTP ${response.status}; using local fallback.`);
    } catch (error) {
      console.warn(`ML demand forecast unavailable; using local fallback: ${error.message}`);
    }
  }

  res.json({
    model: 'local-planning-fallback',
    dataSource: 'live-sales-and-stock',
    horizon: 'Next 30 days',
    generatedAt: new Date().toISOString(),
    items: signals.map((signal) => ({
      medicine: signal.medicine,
      currentStock: signal.currentStock,
      predictedDemand: Math.max(signal.recentDemand, signal.reorderLevel),
      suggestedOrder: Math.max(
        0,
        Math.max(signal.recentDemand, signal.reorderLevel) - signal.currentStock,
      ),
      confidence: null,
    }))
  });
}

export async function getExpiryForecast(_req, res) {
  const medicines = await getAllMedicines();
  const today = Date.now();

  const signals = medicines.flatMap((medicine) =>
    (medicine.batches || []).map((batch) => ({
      medicine: medicine.name,
      batch: batch.batch,
      expiryDate: batch.expiryDate,
      currentStock: Number(batch.quantity || 0),
      daysToExpiry: Math.ceil((new Date(batch.expiryDate).getTime() - today) / 86400000),
    }))
  );

  if (process.env.ML_SERVICE_URL && signals.length) {
    try {
      const baseUrl = process.env.ML_SERVICE_URL.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/forecast/expiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signals),
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const forecast = await response.json();
        if (Array.isArray(forecast.items) && forecast.items.length === signals.length) {
          return res.json(forecast);
        }
        console.warn('ML expiry forecast returned an invalid item list; using local fallback.');
      } else {
        console.warn(`ML expiry forecast returned HTTP ${response.status}; using local fallback.`);
      }
    } catch (error) {
      console.warn(`ML expiry forecast unavailable; using local fallback: ${error.message}`);
    }
  }

  const items = signals.map((signal) => ({
    medicine: signal.medicine,
    batch: signal.batch,
    expiryDate: signal.expiryDate,
    daysUntilExpiry: signal.daysToExpiry,
    risk: signal.daysToExpiry <= 30 ? 'Critical' : signal.daysToExpiry <= 90 ? 'Watch' : 'Low',
    stock: signal.currentStock,
  })).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  res.json({
    model: 'local-expiry-risk',
    dataSource: 'live-batch-and-expiry-data',
    generatedAt: new Date().toISOString(),
    items
  });
}

export async function getIntelligenceHealth(_req, res) {
  if (!process.env.ML_SERVICE_URL) {
    return res.json({
      ml: 'fallback',
      demandModel: 'fallback',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'fallback'
    });
  }
  try {
    const baseUrl = process.env.ML_SERVICE_URL.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const serviceHealth = response.ok ? await response.json() : null;
    return res.json({
      ml: response.ok ? 'connected' : 'unavailable',
      demandModel: serviceHealth?.demandModel || 'unavailable',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'fallback'
    });
  } catch (error) {
    console.warn(`ML health check unavailable: ${error.message}`);
    return res.json({
      ml: 'unavailable',
      demandModel: 'unavailable',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'fallback'
    });
  }
}
