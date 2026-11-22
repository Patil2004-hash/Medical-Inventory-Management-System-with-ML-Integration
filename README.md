# Medical Inventory Management System with AI/ML Integration (MIMS)

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18.3-blue.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-orange.svg)](https://ai.google.dev/)

> **Project Report Title:** *MIMS: An Integrated MERN, Generative-AI, and Machine-Learning Platform for Intelligent Medical Inventory Management*  
> **Institution:** Chhatrapati Shivaji Maharaj University (CSMU), Panvel, Navi Mumbai  
> **Department:** Department of Computer Science and Information Technology  
> **Project Guide:** Dr. Shamsul Haque  
> **Team Members:** Maharajashiv Som Dutt, Khushi Singh, Vallabh Patil, Vaibhav Maurya, Rahul Kumar  

---

## 📌 Overview

**MIMS (Medical Inventory Management System)** is an enterprise-grade medical inventory, procurement, sales, and predictive management platform designed specifically for pharmacies, clinics, and hospital medical stores. 

Traditional pharmacies suffer from stock shortages, overstocking, manual billing mistakes, expired medicine wastage, and a lack of intelligent analytics. MIMS resolves these problems by pairing core operational workflows with an intelligent decision-support layer:
1. **Machine Learning Microservice**: Predicts 30-day medicine demand using Random Forest regression and assesses batch-level expiry risks.
2. **Generative AI Assistant (Google Gemini)**: Natural language queries grounded directly against live MongoDB store data using intent-driven retrieval (RAG).
3. **FEFO Inventory Strategy**: First-Expiry-First-Out stock deduction automatically prioritizes the oldest active batches to minimize medicine waste.
4. **Bluetooth Thermal Receipt Printing**: Direct POS printing via the Web Bluetooth API with ESC/POS standards and browser print fallbacks.
5. **Modern Multi-Theme Experience**: 12 custom runtime UI themes.

---

## 🏗️ System Architecture

```
                    ┌─────────────────────────┐
                    │    React Single Page    │
                    │   Application (Vite)    │
                    └────────────┬────────────┘
                                 │ HTTPS / JWT
                                 ▼
                    ┌─────────────────────────┐
                    │   Node.js / Express     │
                    │   (Central Backend)     │
                    └─────┬───────────┬───────┘
         Mongoose / ODM   │           │ REST API
      ┌───────────────────┘           └────────────────────┐
      ▼                                                    ▼
┌──────────────┐         ┌────────────────────┐     ┌──────────────┐
│   MongoDB    │         │  Google Gemini AI  │     │   FastAPI    │
│    Atlas     │         │ (Grounded Context) │     │ (ML Service) │
└──────────────┘         └────────────────────┘     └──────────────┘
```

The **Node.js backend** acts as the single orchestrator and trust boundary:
- Authentication & Role-Based Access Control (**Admin, Pharmacist, Staff**).
- All external API keys (Gemini, DB credentials) remain strictly on the backend.
- **Graceful Degradation**: Core sales, inventory, and billing operations continue functioning seamlessly even if AI or ML services are offline.

---

## 🔬 Machine Learning Demand Forecasting Results

The ML service trains on an extensive 2,000-medicine catalog (derived from database inventory and normalized clinical generic concepts from RxNorm) across 48,000 data points.

### Evaluation Metrics (Holdout Test Set)
- **Model:** `RandomForestRegressor` with `ColumnTransformer` & `OneHotEncoder`
- **Train/Test Strategy:** `GroupShuffleSplit` (medicine-level holdout, 80% train / 20% test)
- **Input Features:** `category`, `currentStock`, `reorderLevel`, `recentDemand`
- **Target:** `targetDemand30d` (30-day projected demand)

| Metric | Training Set | Testing Set (Unseen Medicines) |
|---|:---:|:---:|
| **Mean Absolute Error (MAE)** | **5.247** units | **9.841** units |
| **Root Mean Squared Error (RMSE)** | **6.942** units | **12.889** units |
| **Coefficient of Determination ($R^2$)** | **0.9330** (93.3%) | **0.8026** (80.3%) |

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, Recharts, Lucide React, Axios |
| **Backend** | Node.js, Express.js, Mongoose, JWT, bcryptjs, express-validator |
| **Database** | MongoDB / MongoDB Atlas |
| **AI Layer** | Google Gemini API (`@google/genai` SDK) with Grounded DB Aggregations |
| **ML Microservice** | Python 3.10+, FastAPI, Uvicorn, Scikit-learn, Pandas, NumPy, Joblib |
| **Hardware** | Web Bluetooth API (BLE 4.0+/5.0+) with ESC/POS Thermal Printing |

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.10 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster URI)

---

### 2. Environment Configuration

#### Backend (`server/.env`):
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_google_gemini_api_key
ML_SERVICE_URL=http://127.0.0.1:8000
GEMINI_MODEL=gemini-1.5-flash
```

#### Frontend (`client/.env`):
```env
VITE_API_URL=http://localhost:5000
```

---

### 3. Installation & Running the Services

#### A. Backend Server
```bash
cd server
npm install
node index.js
```
*Backend runs on port `5000`.*

#### B. Machine Learning Service
```bash
cd ml-service
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
*FastAPI microservice runs on port `8000` (Interactive Docs: `http://127.0.0.1:8000/docs`).*

#### C. Frontend Client
```bash
cd client
npm install
npm run dev
```
*Vite client runs on port `5173` (`http://localhost:5173`).*

---

## 👥 Authors & Acknowledgments

- **Maharajashiv Som Dutt** (Enrollment: F233204)
- **Khushi Singh** (Enrollment: F233200)
- **Vallabh Patil** (Enrollment: F233293)
- **Vaibhav Maurya** (Enrollment: F233292)
- **Rahul Kumar** (Enrollment: F233235)

**Under the Guidance of:**  
Dr. Shamsul Haque  
*Department of Computer Science & Information Technology*  
*Chhatrapati Shivaji Maharaj University (CSMU), Panvel, Navi Mumbai*
