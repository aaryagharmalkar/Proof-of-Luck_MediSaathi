# MediSaathi Backend API

FastAPI backend for the MediSaathi healthcare management system. **Database: Supabase only** (no MongoDB).

## Tech Stack

- **Framework**: FastAPI
- **Database / Auth**: Supabase (PostgreSQL + Auth)
- **AI**: Groq, Google Gemini (prescription extraction)
- **Vector store**: ChromaDB (reports)

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings (env)
│   ├── supabase_client.py   # Supabase client singleton
│   ├── appointments_store.py # In-memory appointments (doctors/slots)
│   ├── controllers/
│   │   └── auth_controller.py  # Signup, signin, get_current_user
│   └── routers/
│       ├── __init__.py
│       ├── health.py         # Health + Supabase connectivity
│       ├── auth.py           # Auth, members, profile/onboarding
│       ├── health_records.py # Health records (Supabase)
│       ├── reports.py        # Report upload/summarize/query (ChromaDB + Groq)
│       ├── medicines.py      # Prescription extraction (Gemini)
│       ├── chat.py           # Chat (Ollama/Mistral)
│       └── appointments.py  # Doctors, availability, booking
├── requirements.txt
├── .env
└── README.md
```

## Setup

### 1. Install dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment variables

Create `.env` in the backend directory. Required:

```env
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-jwt-secret

# Server
HOST=127.0.0.1
PORT=5050
DEBUG=true

# Security
SECRET_KEY=your-secret-key

# API
API_V1_PREFIX=/api/v1
PROJECT_NAME=MediSaathi API

# AI (optional for full features)
GROQ_API_KEY=...      # Reports summarization
GEMINI_API_KEY=...    # Prescription extraction
```

### 3. Run the app

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 5050
```

Or from repo root (e.g. via npm script):

```bash
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 5050
```

- **API**: http://localhost:5050
- **Docs**: http://localhost:5050/docs

## API Endpoints (prefix: `/api/v1`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Health** | | |
| GET | `/health` | Basic health check |
| GET | `/health/db` | Supabase connectivity check |
| **Auth** | | |
| POST | `/auth/signup` | Sign up |
| POST | `/auth/signin` | Sign in |
| POST | `/auth/logout` | Logout (requires Auth header) |
| GET | `/auth/me` | Current user (requires Auth header) |
| POST | `/auth/profile/setup` | Profile setup (requires Auth header) |
| POST | `/auth/complete-onboarding` | Mark onboarding complete |
| POST | `/auth/onboarding-step` | Save onboarding step |
| **Members** | | |
| POST | `/members` | Add family member |
| GET | `/members` | List members |
| **Health records** | | |
| POST | `/health/records` | Create health record |
| GET | `/health/records` | List records (optional `?metric=`) |
| GET | `/health/records/{id}` | Get one record |
| **Reports** | | |
| POST | `/reports/upload` | Upload report (ChromaDB) |
| POST | `/reports/{id}/summarize` | Summarize report (Groq) |
| POST | `/reports/{id}/query` | Q&A on report |
| **Medicines** | | |
| POST | `/medicines/extract-file` | Extract medicines from image/PDF (Gemini) |
| **Appointments** | | |
| GET | `/doctors/{id}/availability` | Get slots for doctor + date |
| POST | `/appointments` | Book appointment |
| **Chat** | | |
| POST | `/chat` | Chat (streaming, Ollama) |

## Supabase

- Use the [Supabase dashboard](https://app.supabase.com) to create the project and get `SUPABASE_URL` and `SUPABASE_KEY` (anon key).
- Ensure tables exist as expected: `user_profiles`, `profiles`, `members`, `health_records` (with columns matching the API). The `/health/db` check runs a minimal query on `user_profiles` to verify connectivity.

## Development

- All routes under `app/routers/` are mounted with prefix `API_V1_PREFIX` (`/api/v1`).
- Protected routes use `get_current_user` (Bearer token from Supabase Auth).
- CORS is set for `http://localhost:5173` and `http://127.0.0.1:5173`.
