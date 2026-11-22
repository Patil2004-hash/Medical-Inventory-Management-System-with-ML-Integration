# MIMS Deployment

## Services

- `server`: Node.js and Express API on port `5000`.
- `client`: Vite production bundle served by a static host.
- `ml-service`: FastAPI service on port `8000`.
- MongoDB or MongoDB Atlas for production persistence.

## Environment

Copy `server/.env.example` to `server/.env` and set a strong `JWT_SECRET`. Configure `MONGO_URI` for persistence, `ML_SERVICE_URL` for the ML service, and `GEMINI_API_KEY` only on the server.
The Operations Assistant uses `GEMINI_MODEL` when set and otherwise defaults to `gemini-3.8-flash`. Its request timeout defaults to 60 seconds and can be changed with `GEMINI_TIMEOUT_MS` (minimum 1,000 ms). It reads MIMS records through the server and sends a minimized, role-scoped operational summary to Gemini; customer names, phone numbers, email addresses, notes, credentials, and API keys are excluded from the prompt.

Copy `client/.env.example` to `client/.env` and set `VITE_API_URL` to the deployed API origin.

## Build and run

```powershell
npm install --prefix server
npm install --prefix client
npm run build
node server/index.js
```

Run the ML service separately when enabled:

```powershell
python -m venv ml-service/.venv
ml-service/.venv/Scripts/pip install -r ml-service/requirements.txt
node server/scripts/exportMlData.js
python ml-service/train.py
ml-service/.venv/Scripts/uvicorn main:app --app-dir ml-service --port 8000
```

The export writes `ml-service/data/medicine_catalog.csv` and an anonymized,
medicine/day `sales_history.csv`. It combines up to 2,000 actual database
medicines with normalized generic medicine names from the RxNorm clinical drug
catalog (`https://rxnav.nlm.nih.gov/REST/allconcepts.json?tty=SCD`) to reach
2,000 distinct medicine/strength rows. Database records retain actual values.
Additional rows have complete, generated sample inventory values, are marked
`generated-sample` in `catalogSource`, and are never inserted into MongoDB.
Treat sample stock, prices, and expiry dates as synthetic, not pharmacy facts.
The client calls only the authenticated Node API; Node sends live database and
sales signals to FastAPI for demand forecasts and live batch/expiry signals for
expiry risk. If FastAPI is unavailable, the Node API returns its local
forecast fallback.
Training writes separate `training_data.csv` and `testing_data.csv` files plus
`demand_model.pkl`. The current model is trained on synthetic demand examples
because the demo database does not contain enough sales history for a reliable
supervised forecast. Its predictions are labeled as demo-only in the client.
Re-train after exporting once sufficient real sales history is available.

## Release checks

```powershell
npm run build
node --check server/index.js
python -m py_compile ml-service/main.py
npm test
```

`GET /api/health` is the API liveness check. `GET /api/intelligence/health` reports ML and Gemini availability for an authenticated session. The client falls back to browser printing if Web Bluetooth is unavailable.
