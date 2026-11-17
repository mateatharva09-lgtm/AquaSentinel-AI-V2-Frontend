# AquaSentinel AI 💧

**Water-quality screening, visualisation and education for UN Sustainable Development Goal 6 — Clean Water and Sanitation.**

AquaSentinel AI is a student sustainability-technology project. You type in five field measurements
(pH, turbidity, dissolved oxygen, electrical conductivity and water temperature) and the app:

- calculates a documented **water-quality indicator index (0–100)** and classification,
- shows **which parameters drove the result** and flags **unusual readings**,
- gives a **confidence indicator** based on measurement-error simulation,
- writes a **plain-language report** with suggested further laboratory tests, downloadable as a **PDF**,
- shows samples on an **interactive map**, keeps a **history** with trend charts and side-by-side comparison,
- includes a **Water Education Centre** on pollution, contamination, sanitation, conservation and SDG 6.

> ⚠️ **Important:** AquaSentinel AI never says water is safe to drink. Five physical/chemical indicators cannot
> detect bacteria, viruses, heavy metals, arsenic, nitrate, pesticides or most other harmful substances.
> Only accredited laboratory testing can determine drinking-water safety.

> 🔬 **About the "AI":** the app uses two separate methods:
> 1. A **real Isolation Forest machine-learning model**, hosted on the project's Python FastAPI backend
>    (`https://aquasentinel-ai-5ssp.onrender.com`, endpoint `POST /predict`). It receives conductivity, turbidity and
>    temperature and answers **Normal** (prediction = 1) or **Anomaly** (prediction = -1). The app shows this answer exactly
>    as received; if the server cannot be reached, **no result is shown and nothing is simulated**.
> 2. A **transparent, rule-based indicator index** with statistical checks (all five readings). Every rule, weight and
>    threshold is listed on the in-app *Methodology* page and in `src/lib/water/model.ts`.
>
> An "Anomaly" is **not proof of contamination**, and "Normal" does **not certify drinking-water safety**.

---

## 1. What you need (Windows 10 / 11)

| Item | Why | Where |
|---|---|---|
| **Node.js 20 or 22 (LTS)** | Runs the app | https://nodejs.org → download the "LTS" Windows installer (.msi) |
| A modern browser | Shows the app | Chrome, Edge or Firefox |
| Internet | Downloads the libraries during installation, and reaches the machine-learning backend when you analyse a sample | — |

You do **not** need any account, API key, database server or paid service.

---

## 2. Install and run — step by step

1. **Install Node.js.** Run the installer from nodejs.org and accept the default options.
2. **Check Node.js works.** Press the Windows key, type `cmd`, press Enter. In the black window type:
   ```
   node -v
   npm -v
   ```
   Both should print a version number (for example `v22.11.0`). If you see "not recognized", restart
   your computer and try again.
3. **Unzip the project.** Right-click the downloaded `AquaSentinel-AI.zip` → *Extract All…* → choose a
   simple folder such as `C:\Projects\AquaSentinel-AI`.
4. **Open a terminal in the project folder.** Open the extracted folder in File Explorer, click the address
   bar, type `cmd` and press Enter. A Command Prompt opens already inside the folder
   (you should see `package.json` if you type `dir`).
5. **Install the libraries** (needs internet, takes 1–3 minutes):
   ```
   npm install
   ```
6. **Start the app:**
   ```
   npm run dev
   ```
7. **Open your browser** at **http://localhost:8080**
8. **To stop the app**, go back to the Command Prompt and press `Ctrl + C`.

Next time you only need steps 4, 6 and 7.

### Optional: run the optimised (production) version locally
```
npm run build:local
npm run start:local
```
Then open **http://localhost:3000**.

### Optional: run the automated tests
```
npm test
```
The tests check the scoring rules, form validation and demo-data labelling.

---

## 3. Configuration

No configuration is required. There are **no secrets or API keys** to set up.

**Machine-learning backend address.** By default the app uses `https://aquasentinel-ai-5ssp.onrender.com`.
To use another copy of the backend (for example one running on your own PC with
`uvicorn main:app --port 8000`), stop the app and start it again from Command Prompt like this:
```
set AQUASENTINEL_API_URL=http://127.0.0.1:8000
npm run dev
```
(In PowerShell use `$env:AQUASENTINEL_API_URL="http://127.0.0.1:8000"` instead of the `set` line.)

**How the connection works.** The backend does not accept requests directly from web browsers (it sends no CORS
headers), so the browser asks the app's own small server step (`src/lib/water/ml.functions.ts`), which forwards
the three readings to `POST /predict` and returns the model's real answer. This server step runs automatically as part
of `npm run dev` / `npm run start:local`.

To use a different port for the development server: `npx vite dev --port 5173`.

---

## 4. External services used

| Service | Used for | Needs key? | If offline |
|---|---|---|---|
| **AquaSentinel FastAPI backend** (`aquasentinel-ai-5ssp.onrender.com`) | Isolation Forest anomaly prediction (`POST /predict`) | No | Model check fails with a clear message; you can retry or save without a model result. The first request after the server has been idle may take up to a minute (free hosting wakes up). |
| **OpenStreetMap tile servers** (`tile.openstreetmap.org`) | Background map images on the Map page | No | Map background is blank; sample circles and all data still work |
| **Google Fonts** | Sora, IBM Plex Sans, IBM Plex Mono typefaces | No | Falls back to system fonts |
| **npm registry** | Downloading libraries during `npm install` | No | Needed only once |

No generative-AI service, cloud database, analytics or tracking is used. The app does not connect to real sensors.

---

## 5. Database

The app uses **IndexedDB**, a database built into every modern browser, through the
[Dexie](https://dexie.org) library (`src/lib/db.ts`). Data is saved **on your computer, in the browser you use**.

- Different browsers (or another computer) have their own separate data.
- Clearing your browser's site data for `localhost` deletes saved samples.
- *History → Export CSV* downloads all your samples as a spreadsheet file.
- *History → Restore / Remove demo data* manages the demonstration samples.

### Schema (table `samples`, version 1)

| Field | Type | Description |
|---|---|---|
| `id` | number (auto) | Primary key |
| `label` | text | Sample name |
| `siteName` | text | Location name (indexed) |
| `waterSource` | text | river, lake, canal, groundwater, tap, rainwater, other |
| `latitude`, `longitude` | number or null | Decimal degrees (optional) |
| `collectedAt` | text `YYYY-MM-DD` | Collection date (indexed) |
| `ph` | number | pH units, 0–14 |
| `turbidity` | number | NTU, 0–4000 |
| `dissolvedOxygen` | number | mg/L, 0–25 |
| `conductivity` | number | µS/cm, 0–100 000 |
| `temperature` | number | °C, 0–50 |
| `notes` | text | Free notes (≤ 500 characters) |
| `isDemo` | boolean | `true` for synthetic demonstration data |
| `createdAt` | ISO timestamp | When the record was saved (indexed) |
| `mlResult` | object or empty | The backend's real answer: `status` (Normal/Anomaly), `prediction` (1/-1), `model`, `warning`, the `input` sent, `checkedAt`, `latencyMs`, `endpoint`. Empty = not checked. |

Rule-based assessments are **not stored**; they are recalculated from the measurements every time, so the results always
match the current model version.

### Demonstration data
On first start the app creates **56 synthetic samples** (8 fictional sites × 7 months) generated by a seeded
pseudo-random process (`src/lib/water/demo-data.ts`). They are labelled "Demo data" everywhere and are **not real
measurements**.

---

## 6. How the analysis works (summary)

**Machine-learning check (backend):** `POST /predict` with `{"conductivity": 309, "turbidity": 85.1, "temperature": 29}`
returns e.g. `{"prediction": -1, "status": "Anomaly", "model": "Isolation Forest", "warning": "..."}`. The app validates the
reply (and rejects contradictory or malformed replies) before showing or storing it. Demo samples start unchecked;
use **Run model check** on a sample page to send them to the model.

**Rule-based indicator index:**

Full details: in-app **Methodology** page and `src/lib/water/model.ts`.

1. **Sub-indices** — each reading becomes a 0–100 score using published-guidance-based breakpoints
   (WHO GDWQ 2022, BIS IS 10500:2012). Dissolved oxygen is scored as **% saturation**, calculated from temperature
   with the Benson & Krause (1984) equation used in APHA Standard Methods 4500-O.
2. **Weighted index** — weights: pH 22 %, turbidity 25 %, dissolved oxygen 25 %, conductivity 18 %, temperature 10 %.
3. **Severity guard** — any sub-index < 25 caps the class at "Poor"; < 50 caps it at "Fair".
4. **Confidence** — 1 000 Monte-Carlo re-measurements with typical meter error; the share keeping the same class.
5. **Outlier detection** — modified z-score (Iglewicz & Hoaglin, 1993) against earlier samples; |z| > 3.5 is unusual.
6. **Pattern rules** — documented combinations (e.g. high turbidity + low oxygen) suggest possible causes.
7. **Report** — rule-based text templates explain each reading and recommend follow-up tests
   (microbiological testing is always recommended).

---

## 7. Project structure

```
src/
  routes/                 One file per page
    index.tsx             Dashboard
    analysis.tsx          Water analysis form
    samples.$id.tsx       Assessment result for one sample
    reports.index.tsx     Report generator (list)
    reports.$id.tsx       Full report + PDF download
    map.tsx               Interactive map
    history.tsx           History, trends, comparison, CSV export
    education.tsx         Water Education Centre
    methodology.tsx       Model documentation
    __root.tsx            Page shell, fonts, sidebar
  lib/
    db.ts                 Local database (Dexie / IndexedDB)
    water/model.ts        Assessment model
    water/parameters.ts   Parameter definitions, units, ranges
    water/validation.ts   Form validation rules (zod)
    water/report.ts       Report text generator
    water/pdf.ts          PDF builder (jsPDF)
    water/ml.ts           Isolation Forest result types, response checks, disclaimer
    water/ml.functions.ts Server step that calls the FastAPI /predict endpoint
    water/demo-data.ts    Synthetic demonstration data
    water/hooks.ts        Data-loading helpers
  components/             Layout, charts, map and UI pieces
  test/                   Automated tests (Vitest)
  styles.css              Design system (colours, fonts)
package.json              Dependencies and scripts
```

**Technology:** React 19, TanStack Start/Router, TypeScript, Vite, Tailwind CSS v4, Dexie, Recharts, Leaflet,
jsPDF, zod, Vitest. No Python is required.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `'node' is not recognized` | Install Node.js LTS, then close and reopen the Command Prompt (or restart Windows). |
| PowerShell says "running scripts is disabled" | Use **Command Prompt** (`cmd`) instead, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in PowerShell. |
| `Port 8080 is already in use` | Close the other program or run `npx vite dev --port 5173` and open http://localhost:5173 |
| `npm install` fails with network errors | Check your internet connection / school proxy and try again. |
| Saved samples disappeared | They are stored per browser. Use the same browser, and don't clear site data. |
| Map is grey | The map background needs internet; data and markers still work. |
| "Model check failed" / "did not answer within 75 seconds" | The backend may be waking up or offline. Wait a minute and press **Try again**, or choose **Save without model check**. |

---

## 9. Credits & references

- WHO (2022). *Guidelines for Drinking-water Quality*, 4th ed. incorporating the 1st and 2nd addenda.
- Bureau of Indian Standards (2012). *IS 10500: Drinking Water – Specification*.
- Horton (1965); Brown et al. (1970) — water quality index methods.
- Benson & Krause (1984) — oxygen solubility; APHA *Standard Methods* 4500-O.
- Iglewicz & Hoaglin (1993) — modified z-score outlier detection.
- UN *Sustainable Development Goals Report 2024* — SDG 6 statistics.
- Map data © OpenStreetMap contributors. Hero photograph generated for this project.
