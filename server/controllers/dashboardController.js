import { getAllMedicines, getAllSales } from '../services/dataAccess.js';
import { publicMedicine } from '../middleware/auth.js';

export async function getDashboard(_req, res) {
  const medicines = await getAllMedicines();
  const sales = await getAllSales();

  const inventoryValue = medicines.reduce((sum, item) => sum + (item.stock * item.price), 0);
  const revenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const lowStock = medicines.filter((item) => item.stock <= item.reorderLevel);
  const expiring = medicines.filter((item) => item.expiryDate && new Date(item.expiryDate) <= new Date('2026-11-30'));

  const alerts = lowStock.map((item) => ({
    id: item.id,
    type: item.stock <= item.reorderLevel / 2 ? 'critical' : 'warning',
    title: `${item.name} needs attention`,
    detail: `${item.stock} ${item.unit} remaining`,
    action: 'Review inventory'
  }));

  res.json({
    metrics: {
      inventoryValue,
      revenue,
      lowStock: lowStock.length,
      expiring: expiring.length
    },
    medicines: medicines.map(publicMedicine),
    sales,
    alerts
  });
}

export async function getReportsSummary(_req, res) {
  const medicines = await getAllMedicines();
  const sales = await getAllSales();

  const inventoryUnits = medicines.reduce((sum, item) => sum + item.stock, 0);
  const inventoryValue = medicines.reduce((sum, item) => sum + (item.stock * item.price), 0);
  const salesCount = sales.length;
  const revenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const lowStock = medicines.filter((item) => item.stock <= item.reorderLevel);

  res.json({
    inventoryUnits,
    inventoryValue,
    salesCount,
    revenue,
    lowStock: lowStock.map(publicMedicine)
  });
}
