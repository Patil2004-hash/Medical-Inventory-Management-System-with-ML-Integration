from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from fastapi import Body, FastAPI
from pydantic import BaseModel, Field

MODEL_PATH = Path(__file__).with_name('demand_model.pkl')
MODEL_BUNDLE = joblib.load(MODEL_PATH) if MODEL_PATH.is_file() else None

app = FastAPI(title='MIMS ML Service')


class MedicineSignal(BaseModel):
    medicine: str
    category: str = 'Other'
    currentStock: int = Field(default=0, ge=0)
    reorderLevel: int = Field(default=0, ge=0)
    recentDemand: int = Field(default=0, ge=0)
    daysToExpiry: int | None = None
    batch: str | None = None
    expiryDate: str | None = None


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'service': 'mims-ml',
        'demandModel': 'loaded' if MODEL_BUNDLE else 'baseline',
        'trainingData': MODEL_BUNDLE['metadata']['data_source'] if MODEL_BUNDLE else None,
    }


@app.post('/forecast/demand')
def demand(signals: list[MedicineSignal] = Body(default_factory=list)):
    items = []
    for signal in signals:
        if MODEL_BUNDLE:
            features = pd.DataFrame([{
                'category': signal.category,
                'currentStock': signal.currentStock,
                'reorderLevel': signal.reorderLevel,
                'recentDemand': signal.recentDemand,
            }])
            predicted = max(
                0,
                round(float(MODEL_BUNDLE['pipeline'].predict(features)[0])),
            )
            model_name = MODEL_BUNDLE['metadata']['model_name']
            data_source = MODEL_BUNDLE['metadata']['data_source']
        else:
            predicted = max(signal.recentDemand, signal.reorderLevel)
            model_name = 'mims-demand-local-baseline'
            data_source = 'live-sales-and-stock'

        items.append({
            'medicine': signal.medicine,
            'currentStock': signal.currentStock,
            'predictedDemand': predicted,
            'suggestedOrder': max(0, predicted - signal.currentStock),
            'confidence': None,
        })

    return {
        'model': model_name if signals else (
            MODEL_BUNDLE['metadata']['model_name'] if MODEL_BUNDLE
            else 'mims-demand-local-baseline'
        ),
        'dataSource': data_source if signals else (
            MODEL_BUNDLE['metadata']['data_source'] if MODEL_BUNDLE
            else 'live-sales-and-stock'
        ),
        'horizon': 'Next 30 days',
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'items': items,
    }


@app.post('/forecast/expiry')
def expiry(signals: list[MedicineSignal] = Body(default_factory=list)):
    items = []
    for signal in signals:
        days = signal.daysToExpiry if signal.daysToExpiry is not None else 365
        items.append({
            'medicine': signal.medicine,
            'batch': signal.batch,
            'expiryDate': signal.expiryDate,
            'daysUntilExpiry': days,
            'risk': 'Critical' if days <= 30 else 'Watch' if days <= 90 else 'Low',
            'stock': signal.currentStock,
        })
    return {
        'model': 'mims-expiry-baseline',
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'items': items,
    }


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host='127.0.0.1', port=8000)
