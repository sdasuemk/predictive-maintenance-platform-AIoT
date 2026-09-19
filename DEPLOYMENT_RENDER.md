# Deploying PMP AIoT to Render

This repository contains a full **Render Blueprint (`render.yaml`)** configured to automatically deploy all three microservices with a single click.

---

## Architecture Overview on Render

| Service | Render Type | Root Directory | Build Command | Start Command / Output |
|---|---|---|---|---|
| **`pmp-sensor-simulator`** | Web Service (Node) | `sensor_simulator` | `npm install --include=dev && npm run build` | `npm start` |
| **`pmp-ai-backend`** | Web Service (Python) | `ai_backend` | `pip install -r requirements.txt` | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **`pmp-frontend`** | Static Site | `pmp_FE` | `npm install && npm run build` | `dist` |

---

## Method 1: One-Click Blueprint Deployment (Recommended)

1. **Commit and push your changes to your Git repository** (GitHub or GitLab):
   ```bash
   git add .
   git commit -m "Configure Render deployment blueprint and environment variables"
   git push origin main
   ```

2. **Log into [Render](https://dashboard.render.com/)**.

3. **Create a Blueprint Instance**:
   - Click **New +** at the top right of your Render Dashboard.
   - Select **Blueprint**.
   - Connect your GitHub repository.
   - Render will detect `render.yaml` and display the 3 services:
     - `pmp-sensor-simulator`
     - `pmp-ai-backend`
     - `pmp-frontend`
   - Click **Apply**.

4. **Add Secret / Custom Environment Variables** (Optional):
   - Under `pmp-sensor-simulator` in the Render dashboard:
     - If using MongoDB Atlas, set `MONGO_ENABLED = true` and add your `MONGO_URI` connection string.

---

## Method 2: Manual Dashboard Setup (Step-by-Step)

If you prefer to configure each service manually in the Render dashboard:

### 1. Telemetry & Sensor Simulator (`pmp-sensor-simulator`)
- **New +** > **Web Service**
- Connect your repository
- **Root Directory**: `sensor_simulator`
- **Runtime**: `Node`
- **Build Command**: `npm install --include=dev && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `USE_EMBEDDED_MQTT`: `true`
  - `MONGO_ENABLED`: `false` (or `true` with `MONGO_URI`)

### 2. AI Backend Microservice (`pmp-ai-backend`)
- **New +** > **Web Service**
- Connect your repository
- **Root Directory**: `ai_backend`
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/health`

### 3. Frontend Dashboard (`pmp-frontend`)
- **New +** > **Static Site**
- Connect your repository
- **Root Directory**: `pmp_FE`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_BACKEND_URL`: `https://<your-pmp-sensor-simulator-name>.onrender.com`
  - `VITE_AI_BACKEND_URL`: `https://<your-pmp-ai-backend-name>.onrender.com`
- **Redirects / Rewrites**:
  - Source: `/*`
  - Destination: `/index.html`
  - Action: `Rewrite`
