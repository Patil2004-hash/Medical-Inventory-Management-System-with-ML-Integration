import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MedicineModel } from '../models/Medicine.js';
import { SaleModel } from '../models/Sale.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const OUTPUT_DIR = fileURLToPath(new URL('../../ml-service/data/', import.meta.url));
const RXNORM_DRUGS_URL = 'https://rxnav.nlm.nih.gov/REST/allconcepts.json?tty=SCD';
const CATALOG_COLUMNS = [
  'id', 'name', 'category', 'sku', 'stock', 'reorderLevel', 'unit',
  'price', 'expiryDate', 'catalogSource',
];

const MEDICINE_FAMILIES = [
  { name: 'Acetaminophen', category: 'Analgesic', unit: 'tablets', suffix: 'mg', strengths: [325, 500, 650, 1000] },
  { name: 'Aspirin', category: 'Anti-inflammatory', unit: 'tablets', suffix: 'mg', strengths: [75, 150, 325, 500] },
  { name: 'Ibuprofen', category: 'Anti-inflammatory', unit: 'tablets', suffix: 'mg', strengths: [200, 400, 600, 800] },
  { name: 'Diclofenac', category: 'Anti-inflammatory', unit: 'tablets', suffix: 'mg', strengths: [50, 75, 100] },
  { name: 'Naproxen', category: 'Anti-inflammatory', unit: 'tablets', suffix: 'mg', strengths: [250, 500] },
  { name: 'Paracetamol', category: 'Analgesic', unit: 'tablets', suffix: 'mg', strengths: [500, 650] },
  { name: 'Amlodipine', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [2.5, 5, 10] },
  { name: 'Atorvastatin', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [10, 20, 40, 80] },
  { name: 'Losartan', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [25, 50, 100] },
  { name: 'Metoprolol', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [25, 50, 100] },
  { name: 'Telmisartan', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [20, 40, 80] },
  { name: 'Amoxicillin', category: 'Antibiotic', unit: 'capsules', suffix: 'mg', strengths: [125, 250, 500, 875] },
  { name: 'Azithromycin', category: 'Antibiotic', unit: 'tablets', suffix: 'mg', strengths: [125, 250, 500] },
  { name: 'Cefixime', category: 'Antibiotic', unit: 'capsules', suffix: 'mg', strengths: [200, 400] },
  { name: 'Ciprofloxacin', category: 'Antibiotic', unit: 'tablets', suffix: 'mg', strengths: [250, 500, 750] },
  { name: 'Doxycycline', category: 'Antibiotic', unit: 'capsules', suffix: 'mg', strengths: [50, 100] },
  { name: 'Clarithromycin', category: 'Antibiotic', unit: 'tablets', suffix: 'mg', strengths: [250, 500] },
  { name: 'Metformin', category: 'Diabetes', unit: 'tablets', suffix: 'mg', strengths: [500, 850, 1000] },
  { name: 'Glimepiride', category: 'Diabetes', unit: 'tablets', suffix: 'mg', strengths: [1, 2, 3, 4] },
  { name: 'Glyburide', category: 'Diabetes', unit: 'tablets', suffix: 'mg', strengths: [2.5, 5] },
  { name: 'Insulin', category: 'Diabetes', unit: 'vials', suffix: 'IU', strengths: [100, 200, 300] },
  { name: 'Pantoprazole', category: 'Gastrointestinal', unit: 'tablets', suffix: 'mg', strengths: [20, 40] },
  { name: 'Omeprazole', category: 'Gastrointestinal', unit: 'capsules', suffix: 'mg', strengths: [10, 20, 40] },
  { name: 'Ranitidine', category: 'Gastrointestinal', unit: 'tablets', suffix: 'mg', strengths: [150, 300] },
  { name: 'Domperidone', category: 'Gastrointestinal', unit: 'tablets', suffix: 'mg', strengths: [10, 30] },
  { name: 'Cetirizine', category: 'Antiallergic', unit: 'tablets', suffix: 'mg', strengths: [5, 10] },
  { name: 'Fexofenadine', category: 'Antiallergic', unit: 'tablets', suffix: 'mg', strengths: [120, 180] },
  { name: 'Levocetirizine', category: 'Antiallergic', unit: 'tablets', suffix: 'mg', strengths: [5, 10] },
  { name: 'Montelukast', category: 'Respiratory', unit: 'tablets', suffix: 'mg', strengths: [4, 5, 10] },
  { name: 'Salbutamol', category: 'Respiratory', unit: 'inhalers', suffix: 'mcg', strengths: [100, 200] },
  { name: 'Budesonide', category: 'Respiratory', unit: 'inhalers', suffix: 'mcg', strengths: [100, 200, 400] },
  { name: 'Theophylline', category: 'Respiratory', unit: 'tablets', suffix: 'mg', strengths: [100, 200, 300, 400] },
  { name: 'Vitamin D3', category: 'Supplements', unit: 'capsules', suffix: 'IU', strengths: [2000, 60000] },
  { name: 'Vitamin B12', category: 'Supplements', unit: 'capsules', suffix: 'mcg', strengths: [500, 1000] },
  { name: 'Folic Acid', category: 'Supplements', unit: 'tablets', suffix: 'mcg', strengths: [400, 800, 1000] },
  { name: 'Calcium', category: 'Supplements', unit: 'tablets', suffix: 'mg', strengths: [500, 600, 1000] },
  { name: 'Omega 3', category: 'Supplements', unit: 'capsules', suffix: 'mg', strengths: [1000, 2000] },
  { name: 'Prednisolone', category: 'Steroid', unit: 'tablets', suffix: 'mg', strengths: [5, 10, 20, 40] },
  { name: 'Hydrocortisone', category: 'Steroid', unit: 'creams', suffix: 'mg', strengths: [10, 20] },
  { name: 'Baclofen', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [10, 20] },
  { name: 'Gabapentin', category: 'Neurology', unit: 'capsules', suffix: 'mg', strengths: [100, 300, 400] },
  { name: 'Levodopa', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [100, 250, 500] },
  { name: 'Sertraline', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [25, 50, 100] },
  { name: 'Fluoxetine', category: 'Neurology', unit: 'capsules', suffix: 'mg', strengths: [10, 20, 40] },
  { name: 'Clonazepam', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [0.25, 0.5, 1, 2] },
  { name: 'Atenolol', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [25, 50, 100] },
  { name: 'Lisinopril', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [2.5, 5, 10, 20] },
  { name: 'Valsartan', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [40, 80, 160] },
  { name: 'Candesartan', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [4, 8, 16] },
  { name: 'Clopidogrel', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [75, 150] },
  { name: 'Allopurinol', category: 'Endocrine', unit: 'tablets', suffix: 'mg', strengths: [100, 300] },
  { name: 'Levothyroxine', category: 'Endocrine', unit: 'tablets', suffix: 'mcg', strengths: [25, 50, 75, 100, 125] },
  { name: 'Prednisone', category: 'Steroid', unit: 'tablets', suffix: 'mg', strengths: [5, 10, 20, 40] },
  { name: 'Methylprednisolone', category: 'Steroid', unit: 'tablets', suffix: 'mg', strengths: [4, 8, 16, 32] },
  { name: 'Propranolol', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [10, 20, 40] },
  { name: 'Nebivolol', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [2.5, 5, 10] },
  { name: 'Warfarin', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [1, 2, 3, 5] },
  { name: 'Enalapril', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [2.5, 5, 10, 20] },
  { name: 'Carvedilol', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [6.25, 12.5, 25] },
  { name: 'Hydrochlorothiazide', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [12.5, 25] },
  { name: 'Spironolactone', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [25, 50, 100] },
  { name: 'Simvastatin', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [10, 20, 40, 80] },
  { name: 'Rosuvastatin', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [5, 10, 20, 40] },
  { name: 'Fenofibrate', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [67, 145, 160] },
  { name: 'Ezetimibe', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [10] },
  { name: 'Diltiazem', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [30, 60, 90, 120] },
  { name: 'Verapamil', category: 'Cardiovascular', unit: 'tablets', suffix: 'mg', strengths: [40, 80, 120] },
  { name: 'Risperidone', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [1, 2, 4, 6] },
  { name: 'Olanzapine', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [2.5, 5, 7.5, 10] },
  { name: 'Quetiapine', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [25, 50, 100, 200] },
  { name: 'Escitalopram', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [5, 10, 20] },
  { name: 'Bupropion', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [150, 300] },
  { name: 'Buspirone', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [5, 10, 15] },
  { name: 'Lorazepam', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [0.5, 1, 2] },
  { name: 'Albuterol', category: 'Respiratory', unit: 'inhalers', suffix: 'mcg', strengths: [90, 180] },
  { name: 'Ipratropium', category: 'Respiratory', unit: 'inhalers', suffix: 'mcg', strengths: [20, 40] },
  { name: 'Tiotropium', category: 'Respiratory', unit: 'inhalers', suffix: 'mcg', strengths: [18, 36] },
  { name: 'Salmeterol', category: 'Respiratory', unit: 'inhalers', suffix: 'mcg', strengths: [50, 100] },
  { name: 'Pseudoephedrine', category: 'Respiratory', unit: 'capsules', suffix: 'mg', strengths: [30, 60] },
  { name: 'Lansoprazole', category: 'Gastrointestinal', unit: 'capsules', suffix: 'mg', strengths: [15, 30] },
  { name: 'Rabeprazole', category: 'Gastrointestinal', unit: 'tablets', suffix: 'mg', strengths: [10, 20] },
  { name: 'Cimetidine', category: 'Gastrointestinal', unit: 'tablets', suffix: 'mg', strengths: [200, 400, 800] },
  { name: 'Sodium Bicarbonate', category: 'Gastrointestinal', unit: 'tablets', suffix: 'mg', strengths: [500, 1000] },
  { name: 'Sucralfate', category: 'Gastrointestinal', unit: 'tablets', suffix: 'mg', strengths: [500, 1000] },
  { name: 'Acyclovir', category: 'Antiviral', unit: 'tablets', suffix: 'mg', strengths: [200, 400, 800] },
  { name: 'Oseltamivir', category: 'Antiviral', unit: 'capsules', suffix: 'mg', strengths: [30, 45, 75] },
  { name: 'Valacyclovir', category: 'Antiviral', unit: 'tablets', suffix: 'mg', strengths: [500, 1000] },
  { name: 'Loperamide', category: 'Gastrointestinal', unit: 'capsules', suffix: 'mg', strengths: [2] },
  { name: 'Orlistat', category: 'Weight Management', unit: 'capsules', suffix: 'mg', strengths: [120] },
  { name: 'Metronidazole', category: 'Antibiotic', unit: 'tablets', suffix: 'mg', strengths: [200, 400, 500] },
  { name: 'Tinidazole', category: 'Antibiotic', unit: 'tablets', suffix: 'mg', strengths: [300, 500] },
  { name: 'Miconazole', category: 'Antifungal', unit: 'tablets', suffix: 'mg', strengths: [150, 200] },
  { name: 'Fluconazole', category: 'Antifungal', unit: 'capsules', suffix: 'mg', strengths: [50, 150, 200] },
  { name: 'Ketoconazole', category: 'Antifungal', unit: 'tablets', suffix: 'mg', strengths: [200] },
  { name: 'Terbinafine', category: 'Antifungal', unit: 'tablets', suffix: 'mg', strengths: [250] },
  { name: 'Loratadine', category: 'Antiallergic', unit: 'tablets', suffix: 'mg', strengths: [10] },
  { name: 'Desloratadine', category: 'Antiallergic', unit: 'tablets', suffix: 'mg', strengths: [5] },
  { name: 'Methylcobalamin', category: 'Supplements', unit: 'tablets', suffix: 'mcg', strengths: [1500] },
  { name: 'Magnesium', category: 'Supplements', unit: 'tablets', suffix: 'mg', strengths: [250, 400] },
  { name: 'Iron', category: 'Supplements', unit: 'tablets', suffix: 'mg', strengths: [60, 100] },
  { name: 'Zinc', category: 'Supplements', unit: 'tablets', suffix: 'mg', strengths: [15, 25] },
  { name: 'Cough Syrup', category: 'Respiratory', unit: 'bottles', suffix: 'ml', strengths: [100, 200] },
  { name: 'Sildenafil', category: 'Urology', unit: 'tablets', suffix: 'mg', strengths: [25, 50, 100] },
  { name: 'Tadalafil', category: 'Urology', unit: 'tablets', suffix: 'mg', strengths: [2.5, 5, 10, 20] },
  { name: 'Finasteride', category: 'Urology', unit: 'tablets', suffix: 'mg', strengths: [1, 5] },
  { name: 'Oxybutynin', category: 'Urology', unit: 'tablets', suffix: 'mg', strengths: [2.5, 5] },
  { name: 'Topical Steroid', category: 'Dermatology', unit: 'tubes', suffix: 'g', strengths: [15, 30] },
  { name: 'Retinoic Acid', category: 'Dermatology', unit: 'capsules', suffix: 'mg', strengths: [5, 10] },
  { name: 'Clotrimazole', category: 'Dermatology', unit: 'tablets', suffix: 'mg', strengths: [100, 200] },
  { name: 'Amitriptyline', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [10, 25, 50] },
  { name: 'Citalopram', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [10, 20, 40] },
  { name: 'Paroxetine', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [10, 20, 30] },
  { name: 'Donepezil', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [5, 10] },
  { name: 'Memantine', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [5, 10] },
  { name: 'Dapsone', category: 'Antibiotic', unit: 'tablets', suffix: 'mg', strengths: [25, 100] },
  { name: 'Trimethoprim', category: 'Antibiotic', unit: 'tablets', suffix: 'mg', strengths: [100, 200] },
  { name: 'Nitrofurantoin', category: 'Antibiotic', unit: 'capsules', suffix: 'mg', strengths: [50, 100] },
  { name: 'Mupirocin', category: 'Antibiotic', unit: 'tubes', suffix: 'g', strengths: [2, 5] },
  { name: 'Aminophylline', category: 'Respiratory', unit: 'tablets', suffix: 'mg', strengths: [100, 200] },
  { name: 'Erythromycin', category: 'Antibiotic', unit: 'tablets', suffix: 'mg', strengths: [250, 500] },
  { name: 'Levofloxacin', category: 'Antibiotic', unit: 'tablets', suffix: 'mg', strengths: [250, 500] },
  { name: 'Lansoprazole', category: 'Gastrointestinal', unit: 'tablets', suffix: 'mg', strengths: [15, 30] },
  { name: 'Magnesium Oxide', category: 'Supplements', unit: 'tablets', suffix: 'mg', strengths: [400, 800] },
  { name: 'Sodium Valproate', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [200, 500] },
  { name: 'Lamotrigine', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [25, 50, 100] },
  { name: 'Topiramate', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [25, 50, 100] },
  { name: 'Aripiprazole', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [5, 10, 15] },
  { name: 'Benzodiazepine', category: 'Neurology', unit: 'tablets', suffix: 'mg', strengths: [2, 5] },
];

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(columns, rows) {
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\n') + '\n';
}

function toCatalogRow(medicine) {
  return {
    id: String(medicine.id),
    name: String(medicine.name),
    category: String(medicine.category || 'Other'),
    sku: String(medicine.sku || ''),
    stock: Number(medicine.stock || 0),
    reorderLevel: Number(medicine.reorderLevel || 0),
    unit: String(medicine.unit || ''),
    price: Number(medicine.price || 0),
    expiryDate: String(medicine.expiryDate || ''),
    catalogSource: 'database',
  };
}

function formatStrength(value) {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value).toFixed(1)).replace(/\.0$/, '');
}

function buildGeneratedCatalog(existingNames) {
  const rows = [];
  const seenNames = new Set(existingNames);
  const today = new Date();
  let runningIndex = 1;

  for (const entry of MEDICINE_FAMILIES) {
    for (const strength of entry.strengths) {
      const name = `${entry.name} ${formatStrength(strength)}${entry.suffix}`;
      if (seenNames.has(name.toLowerCase())) continue;

      const sku = `${entry.name.slice(0, 3).toUpperCase()}-${String(runningIndex).padStart(4, '0')}`;
      const stock = 18 + ((runningIndex * 19) % 430);
      const reorderLevel = Math.max(10, Math.round(stock * 0.32));
      const price = Number((Math.max(2.5, (strength * 0.12) + (runningIndex % 15) * 0.8)).toFixed(2));
      const expiryDate = new Date(today.getFullYear() + 1, (runningIndex % 12), (runningIndex % 27) + 1)
        .toISOString()
        .slice(0, 10);

      rows.push({
        id: `m${runningIndex + 1}`,
        name,
        category: entry.category,
        sku,
        stock,
        reorderLevel,
        unit: entry.unit,
        price,
        expiryDate,
        catalogSource: 'database',
      });

      seenNames.add(name.toLowerCase());
      runningIndex += 1;
      if (rows.length >= 1985) break;
    }
    if (rows.length >= 1985) break;
  }

  return rows;
}

function formatDrugName(conceptName) {
  const activeIngredients = conceptName
    .replace(/^\s*\d+\s*(?:HR|HOUR)\s+/i, '')
    .replace(/\s+(?:Extended Release|Delayed Release|Oral|Intramuscular|Intravenous|Injection|Tablet|Capsule|Solution|Suspension|Syrup|Chewable|Disintegrating|Topical|Cream|Ointment|Inhalant|Inhalation|Spray|Patch|Suppository|Granules|Powder|Pill|Lozenge|Film|Drops|Gel|Lotion|Kit|Device)\b.*$/i, '')
    .trim();
  const components = activeIngredients.split(/\s+\/\s+/);
  const formattedComponents = [];

  for (const component of components) {
    const match = component.match(
      /^(.+?)\s+(\d+(?:\.\d+)?\s*(?:MG|MCG|G|ML|UNIT|UNITS|MEQ|%))$/i,
    );
    if (!match || /^\d/.test(match[1])) return null;

    const ingredient = match[1]
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
    const strength = match[2].replace(/\s+/g, '').toLowerCase();
    formattedComponents.push(`${ingredient} ${strength}`);
  }

  return formattedComponents.length ? formattedComponents.join(' / ') : null;
}

function getCategory(name) {
  const value = name.toLowerCase();
  const categories = [
    ['Antibiotic', ['amoxicillin', 'azithromycin', 'cephalexin', 'cefixime', 'ciprofloxacin', 'doxycycline', 'penicillin', 'clavulanate', 'erythromycin', 'levofloxacin', 'metronidazole', 'trimethoprim', 'sulfamethoxazole']],
    ['Diabetes', ['metformin', 'insulin', 'glimepiride', 'glyburide', 'glipizide', 'sitagliptin', 'empagliflozin', 'liraglutide']],
    ['Analgesic', ['acetaminophen', 'paracetamol', 'aspirin', 'tramadol', 'morphine', 'codeine']],
    ['Anti-inflammatory', ['ibuprofen', 'naproxen', 'diclofenac', 'meloxicam', 'celecoxib', 'indomethacin']],
    ['Cardiovascular', ['amlodipine', 'atorvastatin', 'losartan', 'metoprolol', 'telmisartan', 'lisinopril', 'valsartan', 'atenolol', 'clopidogrel', 'warfarin', 'simvastatin']],
    ['Gastrointestinal', ['pantoprazole', 'omeprazole', 'lansoprazole', 'famotidine', 'ranitidine', 'ondansetron', 'domperidone']],
    ['Antiallergic', ['cetirizine', 'fexofenadine', 'loratadine', 'levocetirizine', 'diphenhydramine']],
    ['Respiratory', ['montelukast', 'salbutamol', 'albuterol', 'budesonide', 'theophylline', 'ipratropium']],
    ['Supplements', ['vitamin', 'calcium', 'folic acid', 'iron', 'zinc', 'cyanocobalamin', 'cholecalciferol']],
    ['Antiviral', ['acyclovir', 'oseltamivir', 'valacyclovir', 'remdesivir']],
    ['Antifungal', ['fluconazole', 'ketoconazole', 'terbinafine', 'clotrimazole']],
  ];
  return categories.find(([, ingredients]) =>
    ingredients.some((ingredient) => value.includes(ingredient)),
  )?.[0] || 'Other';
}

function getUnit(conceptName) {
  const value = conceptName.toLowerCase();
  if (value.includes('capsule')) return 'capsules';
  if (value.includes('inhaler') || value.includes('inhalation')) return 'inhalers';
  if (value.includes('injection') || value.includes('injectable')) return 'vials';
  if (value.includes('cream') || value.includes('ointment') || value.includes('gel')) return 'tubes';
  if (value.includes('solution') || value.includes('suspension') || value.includes('syrup')) return 'bottles';
  return 'tablets';
}

function createSampleInventory(name, conceptName, index, category, unit) {
  const strengthValue = Number(name.match(/\d+(?:\.\d+)?/)?.[0] || 1);
  const stock = 25 + ((index * 37) % 476);
  const reorderLevel = 10 + ((index * 11) % Math.max(12, Math.floor(stock / 2)));
  const price = Number(Math.max(1, Math.min(250, strengthValue * 0.08 + (index % 23) * 0.7)).toFixed(2));
  const expiryDate = new Date(
    new Date().getFullYear() + 1 + (index % 3),
    index % 12,
    (index % 27) + 1,
  ).toISOString().slice(0, 10);
  const prefix = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'MED';

  return {
    id: `m${index}`,
    name,
    category: category || getCategory(name),
    sku: `${prefix}-${String(index).padStart(4, '0')}`,
    stock,
    reorderLevel,
    unit: unit || getUnit(conceptName),
    price,
    expiryDate,
    catalogSource: 'generated-sample',
  };
}

async function fetchRxNormDrugs() {
  const response = await fetch(RXNORM_DRUGS_URL, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`RxNorm drug catalog request failed with HTTP ${response.status}.`);
  }
  const payload = await response.json();
  const concepts = payload?.minConceptGroup?.minConcept;
  if (!Array.isArray(concepts)) {
    throw new Error('RxNorm response did not contain a clinical drug list.');
  }
  return concepts;
}

async function exportData() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI or MONGODB_URI must be configured in server/.env.');
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  try {
    const medicines = await MedicineModel.find({}).sort({ id: 1 }).lean();
    if (!medicines.length) {
      throw new Error('No medicines were found in MongoDB; refusing to create an empty catalog.');
    }

    const catalog = medicines.map(toCatalogRow);
    const knownNames = new Set(catalog.map((medicine) => medicine.name.trim().toLowerCase()));
    const knownIds = new Set(catalog.map((medicine) => medicine.id));
    const knownSkus = new Set(catalog.map((medicine) => medicine.sku.trim().toLowerCase()));
    let nextId = medicines.reduce((maximum, medicine) => {
      const match = String(medicine.id).match(/^m(\d+)$/i);
      return match ? Math.max(maximum, Number(match[1])) : maximum;
    }, 0) + 1;

    for (const medicine of buildGeneratedCatalog(knownNames)) {
      if (catalog.length >= 2000) break;
      const sample = createSampleInventory(
        medicine.name,
        medicine.name,
        nextId,
        medicine.category,
        medicine.unit,
      );
      while (knownIds.has(sample.id)) {
        nextId += 1;
        sample.id = `m${nextId}`;
      }
      while (knownSkus.has(sample.sku.toLowerCase())) {
        nextId += 1;
        sample.sku = `${sample.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${String(nextId).padStart(4, '0')}`;
      }
      catalog.push(sample);
      knownNames.add(sample.name.toLowerCase());
      knownIds.add(sample.id);
      knownSkus.add(sample.sku.toLowerCase());
      nextId += 1;
    }

    if (catalog.length < 2000) {
      const concepts = await fetchRxNormDrugs();
      for (const concept of concepts) {
        if (catalog.length >= 2000) break;
        const name = formatDrugName(String(concept.name || ''));
        if (!name || knownNames.has(name.toLowerCase())) continue;

        const sample = createSampleInventory(name, String(concept.name), nextId);
        while (knownIds.has(sample.id)) {
          nextId += 1;
          sample.id = `m${nextId}`;
        }
        while (knownSkus.has(sample.sku.toLowerCase())) {
          nextId += 1;
          sample.sku = `${name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${String(nextId).padStart(4, '0')}`;
        }
        catalog.push(sample);
        knownNames.add(name.toLowerCase());
        knownIds.add(sample.id);
        knownSkus.add(sample.sku.toLowerCase());
        nextId += 1;
      }
    }

    if (catalog.length !== 2000) {
      throw new Error(`Expected 2,000 medicine rows, but collected ${catalog.length}.`);
    }

    const sales = await SaleModel.find({}, { lineItems: 1, createdAt: 1, paidAt: 1 }).lean();
    const dailyDemand = new Map();
    for (const sale of sales) {
      const timestamp = Date.parse(sale.createdAt || sale.paidAt || '');
      if (!Number.isFinite(timestamp)) {
        console.warn(`Skipping sale ${sale.id || '(unknown id)'} with an invalid date.`);
        continue;
      }
      const date = new Date(timestamp).toISOString().slice(0, 10);
      for (const line of sale.lineItems || []) {
        const medicineId = String(line.medicineId || '');
        if (!medicineId) continue;
        const key = `${medicineId}\t${date}`;
        const current = dailyDemand.get(key) || {
          medicineId,
          medicine: String(line.name || ''),
          date,
          units: 0,
        };
        current.units += Number(line.quantity || 0);
        dailyDemand.set(key, current);
      }
    }

    await mkdir(OUTPUT_DIR, { recursive: true });
    await Promise.all([
      writeFile(
        join(OUTPUT_DIR, 'medicine_catalog.csv'),
        toCsv(CATALOG_COLUMNS, catalog),
        'utf8',
      ),
      writeFile(
        join(OUTPUT_DIR, 'sales_history.csv'),
        toCsv(
          ['medicineId', 'medicine', 'date', 'units'],
          [...dailyDemand.values()].sort((a, b) =>
            a.date.localeCompare(b.date) || a.medicineId.localeCompare(b.medicineId),
          ),
        ),
        'utf8',
      ),
    ]);

    console.log(`Exported ${medicines.length} database medicines and ${catalog.length - medicines.length} generated sample records to ${OUTPUT_DIR}.`);
    console.log(`Exported ${dailyDemand.size} anonymized medicine/day sales records.`);
  } finally {
    await mongoose.disconnect();
  }
}

exportData().catch((error) => {
  console.error('ML data export failed:', error.message);
  process.exitCode = 1;
});
