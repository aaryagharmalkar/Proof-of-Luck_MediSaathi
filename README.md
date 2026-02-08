# MediSaathi

**Proof-of-Luck**

**Live app:** [https://medi-saathi-fawn.vercel.app/](https://medi-saathi-fawn.vercel.app/)

MediSaathi is an AI-driven healthcare companion (app and web) that centralizes medical records, appointments, prescriptions, and emergency information. It summarizes reports and doctor–patient conversations, improves medication adherence with smart reminders, and provides proactive monitoring, chatbot support, and emergency assistance.

---

## Resources

| Resource | Link |
|----------|------|
| **Presentation (PDF)** | [Medisaathi.pdf](https://drive.google.com/file/d/1efmUbq0-JE87vi5LnsMSyuly4ltIw7ZC/view?usp=sharing) |
| **Demo video** | [Google Drive](https://drive.google.com/file/d/1ua8xfadCKwKJaYQkmwdAVxEoKrEgVqIc/view?usp=drive_link) |

---

## Problem statement

Healthcare today is fragmented, reactive, and hard for patients to manage. People face:

- **Fragmented records** — Medical data scattered across hospitals, apps, and paper
- **Complex information** — Unclear terminology and unstructured reports
- **Missed medicines** — Poor adherence due to lack of reminders and tracking
- **Delayed care** — Difficulty finding the right doctor by symptoms and location
- **Inefficient booking** — No integration with patient health data
- **Limited monitoring** — Important health trends go unnoticed
- **Emergency readiness** — No quick way to alert doctors and family
- **Low engagement** — Limited guidance and health awareness

Relevant SDGs: better healthcare access and understanding (SDG 3), digital and AI-driven healthcare (SDG 9), accessibility for diverse users (SDG 10), and responsive digital health systems.

---

## Proposed solution

A unified platform that:

- Centralizes **family health data** — reports, prescriptions, appointments, emergency contacts — in one place
- **Summarizes** medical reports, prescriptions, and doctor–patient conversations so complex data becomes clear and actionable
- Uses **smart reminders**, progress tracking, and health insights to improve **medication adherence**
- Monitors health indicators and provides **alerts**, **chatbot support**, and **emergency assistance**

---

## Features

| Feature | Description |
|--------|-------------|
| **Family profile management** | One place for the whole family’s health data, prescriptions, reports, and appointments |
| **AI-based prescription processing (OCR)** | Digitizes handwritten/printed prescriptions, medicine info, and ordering |
| **Smart health assistance** | Medicine reminders, treatment adherence, nearest doctor and pharmacy locator |
| **Medical report summary & analysis** | Upload reports → AI summaries, key metrics, health risk severity scores |
| **Medical conversation summarization** | Upload doctor–patient conversations → clear, structured insights and instructions |
| **Doctor appointment scheduling** | Symptom-based matching (NLP), availability, and seamless booking |
| **Emergency support** | One-tap alerts and notifications to emergency contacts and doctors |

**User flow:** Onboarding (profile, questions, emergency contacts) → **Dashboard** with Appointment Scheduler, Medical Summarizer, Prescription Analyzer, Medicine Reminder & Tracker, and Emergency Button.

---

## Architecture (high level)

- **API gateway & security:** JWT auth, RBAC, request routing, rate limiting
- **Microservices:** Medical summarization (documents + conversations, RAG); OCR prescription reader + medicine reminders; context-aware RAG chatbot
- **Databases:** Users & profiles; medical data (reports, prescriptions, summaries, metrics); care & intelligence (appointments, reminders, alerts, AI insights)

---

## Tech stack & partners

| Layer | Technology |
|-------|------------|
| **Frontend** | React (Vite) — web app |
| **Backend** | FastAPI (Python) |
| **Database & auth** | Supabase (Postgres + Auth) |
| **AI / LLM** | Mistral, LLMs, RAG |
| **Voice / TTS** | ElevenLabs |
| **OCR** | Tesseract OCR (prescription extraction) |
| **Hosting / infra** | Vultr, Vercel |
| **Auth & security** | JWT, RBAC |

Additional integrations and APIs are used for NLP, embeddings, and medical understanding as needed.

---

## Innovation & benefits

- **End-to-end health management** for families: reports → doctors → medicines → emergencies in one platform
- **Context-aware AI** using full patient history for summaries and guidance
- **Doctor-grade summaries in seconds** — complex reports and conversations turned into clear, actionable insights
- **Human-like medical conversations** — contextual, empathetic chatbot (not a generic bot)
- **Multi-modal** — PDFs, images, prescriptions, voice, and text in one workflow
- **Built for real-world use** — simple navigation and quick understanding for patients and families

**Target audience:** Patients, doctors, family members, caregivers, hospitals and clinics.

---

## Project structure

```
MediSaathi/
├── frontend/
│   ├── website/          # Vite + React web app
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── api/
│   │   └── package.json
│   ├── package.json
│   └── README.md
├── backend/
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   ├── config.py
│   │   ├── supabase_client.py
│   │   └── main.py
│   ├── requirements.txt
│   └── README.md
├── Makefile
├── package.json
└── README.md
```

---

## Getting started

### Prerequisites

- **Node.js 18+** and npm  
- **Python 3.9+**  
- **Supabase project** (auth and database)

### 1. Clone and install

```bash
git clone <repository-url>
cd MediSaathi

make setup          # Mac/Linux
# or
npm run setup       # Windows / cross-platform
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your Supabase URL/keys and any API keys (e.g. Groq, Gemini, Mistral, ElevenLabs). See `backend/.env.example` for required variables.

### 3. Run the app (two terminals)

**Terminal 1 — Backend (port 5050):**
```bash
make backend          # Mac/Linux
npm run backend       # Windows
```

**Terminal 2 — Frontend (port 5173):**
```bash
make frontend-website     # Mac/Linux
npm run frontend:website # Windows
```

- **API docs:** [http://localhost:5050/docs](http://localhost:5050/docs)  
- **Web app:** [http://localhost:5173](http://localhost:5173)

### Commands reference

| Action           | Mac/Linux           | Windows / all      |
|------------------|---------------------|--------------------|
| Full setup       | `make setup`        | `npm run setup`    |
| Run backend      | `make backend`      | `npm run backend`  |
| Run website      | `make frontend-website` | `npm run frontend:website` |
| Clean deps/cache | `make clean`        | `npm run clean`    |
| List commands    | `make help`         | `npm run help`     |

---

## Deployment

- **Web app:** [https://medi-saathi-fawn.vercel.app/](https://medi-saathi-fawn.vercel.app/) (Vercel)  
- Backend is deployed separately (e.g. Vultr, Railway, Render); configure the frontend to use the production API URL.

---

## Impact & future scope

- Improves understanding of reports, prescriptions, and doctor instructions  
- Reduces missed medications via reminders and adherence tracking  
- Enables faster access to the right healthcare professionals  

**Future:** Wearables integration, insurance and hospital integrations, advanced AI-driven predictive insights and personalized care planning.

---

## Demo & resources

- **Live site:** [https://medi-saathi-fawn.vercel.app/](https://medi-saathi-fawn.vercel.app/)  
- **Presentation (PDF):** [Medisaathi.pdf](https://drive.google.com/file/d/1efmUbq0-JE87vi5LnsMSyuly4ltIw7ZC/view?usp=sharing)  
- **Demo video:** [Google Drive](https://drive.google.com/file/d/1ua8xfadCKwKJaYQkmwdAVxEoKrEgVqIc/view?usp=drive_link)

---

## Troubleshooting

- **Backend won’t start** — Ensure `backend/.env` has valid Supabase and API credentials. Check port 5050 is free: `lsof -i :5050` (Mac/Linux) or `netstat -ano | findstr :5050` (Windows).  
- **Frontend can’t reach backend** — Start the backend first; for local dev, set the API base URL (e.g. `frontend/website/src/api/baseUrl.js`) to `http://localhost:5050`.

---

## License & disclaimer

This project is for educational and hackathon use. MediSaathi supports understanding and adherence but **does not replace professional medical diagnosis or treatment**. Always consult qualified healthcare providers for medical decisions.
