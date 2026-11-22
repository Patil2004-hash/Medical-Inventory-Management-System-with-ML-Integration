import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'data'
CATALOG_PATH = DATA_DIR / 'medicine_catalog.csv'
TRAIN_PATH = DATA_DIR / 'training_data.csv'
TEST_PATH = DATA_DIR / 'testing_data.csv'
MODEL_PATH = BASE_DIR / 'demand_model.pkl'
METRICS_PATH = DATA_DIR / 'training_metrics.json'

FEATURE_COLUMNS = ['category', 'currentStock', 'reorderLevel', 'recentDemand']
TARGET_COLUMN = 'targetDemand30d'
SAMPLES_PER_MEDICINE = 24
RANDOM_SEED = 42

CATEGORY_DEMAND_RATES = {
    'Antibiotic': 44,
    'Diabetes': 54,
    'Analgesic': 92,
    'Cardiovascular': 68,
    'Gastrointestinal': 58,
    'Antiallergic': 38,
    'Respiratory': 42,
    'Supplements': 48,
    'Anti-inflammatory': 52,
}


def build_synthetic_dataset(catalog: pd.DataFrame) -> pd.DataFrame:
    rng = np.random.default_rng(RANDOM_SEED)
    rows = []

    for medicine in catalog.to_dict(orient='records'):
        category = str(medicine.get('category') or 'Other')
        category_rate = CATEGORY_DEMAND_RATES.get(category, 40)
        item_rate = category_rate * rng.lognormal(mean=0, sigma=0.28)

        for _ in range(SAMPLES_PER_MEDICINE):
            reorder_level = max(1, round(category_rate * rng.uniform(0.55, 1.5)))
            current_stock = max(
                0,
                round(rng.uniform(0, max(1, category_rate * 3))),
            )
            recent_demand = int(rng.poisson(item_rate))
            future_rate = item_rate * rng.uniform(0.8, 1.2)
            target_demand = int(rng.poisson(future_rate))
            rows.append({
                'medicineId': str(medicine['id']),
                'medicine': str(medicine['name']),
                'category': category,
                'currentStock': current_stock,
                'reorderLevel': reorder_level,
                'recentDemand': recent_demand,
                'targetDemand30d': target_demand,
                'dataSource': 'synthetic-demo',
            })

    return pd.DataFrame(rows)


def train_model() -> dict:
    if not CATALOG_PATH.is_file():
        raise FileNotFoundError(
            f'{CATALOG_PATH} is missing; run the server ML data export first.'
        )

    catalog = pd.read_csv(CATALOG_PATH)
    if catalog.empty or not {'id', 'name', 'category'}.issubset(catalog.columns):
        raise ValueError('The medicine catalog CSV is empty or missing required columns.')

    dataset = build_synthetic_dataset(catalog)
    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.2,
        random_state=RANDOM_SEED,
    )
    train_indices, test_indices = next(splitter.split(
        dataset,
        groups=dataset['medicineId'],
    ))
    training = dataset.iloc[train_indices].reset_index(drop=True)
    testing = dataset.iloc[test_indices].reset_index(drop=True)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    training.to_csv(TRAIN_PATH, index=False)
    testing.to_csv(TEST_PATH, index=False)

    preprocessing = ColumnTransformer(
        transformers=[
            ('category', OneHotEncoder(handle_unknown='ignore'), ['category']),
            ('numeric', 'passthrough', ['currentStock', 'reorderLevel', 'recentDemand']),
        ],
    )
    pipeline = Pipeline([
        ('preprocessing', preprocessing),
        ('regressor', RandomForestRegressor(
            n_estimators=100,
            min_samples_leaf=2,
            random_state=RANDOM_SEED,
            n_jobs=-1,
        )),
    ])
    pipeline.fit(training[FEATURE_COLUMNS], training[TARGET_COLUMN])

    predictions = pipeline.predict(testing[FEATURE_COLUMNS])
    metrics = {
        'data_source': 'synthetic-demo',
        'split_strategy': 'medicine-level holdout',
        'random_seed': RANDOM_SEED,
        'training_rows': len(training),
        'testing_rows': len(testing),
        'medicine_count': int(catalog['id'].nunique()),
        'mae_units': round(float(mean_absolute_error(
            testing[TARGET_COLUMN], predictions,
        )), 3),
        'rmse_units': round(float(np.sqrt(mean_squared_error(
            testing[TARGET_COLUMN], predictions,
        ))), 3),
        'note': 'Synthetic demo metrics are not a measure of real-world forecast accuracy.',
    }
    bundle = {
        'pipeline': pipeline,
        'metadata': {
            'model_name': 'mims-demand-random-forest-demo',
            'data_source': 'synthetic-demo',
            'features': FEATURE_COLUMNS,
            'target': TARGET_COLUMN,
            'metrics': metrics,
        },
    }

    joblib.dump(bundle, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding='utf-8')
    return metrics


if __name__ == '__main__':
    result = train_model()
    print(json.dumps(result, indent=2))
