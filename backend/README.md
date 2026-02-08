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

Copy `.env.example` to `.env` and set all required values:

```bash
cp .env.example .env
# Edit .env with your Supabase URL/keys, SECRET_KEY, REPORT_ENCRYPTION_KEY, etc.
```

Required: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `SECRET_KEY`, `REPORT_ENCRYPTION_KEY`.  
Optional (for AI features): `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`.

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
| POST | `/auth/register-doctor` | Register user as doctor (requires Auth) |
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
| **Doctors** | | |
| POST | `/doctors/verify-license` | Verify medical license (mock) |
| GET | `/doctors/me` | Get current doctor profile |
| PATCH | `/doctors/me` | Update doctor profile |
| POST | `/doctors/me/complete-onboarding` | Complete doctor onboarding |
| GET | `/doctors/me/availability` | Get doctor's availability |
| PUT | `/doctors/me/availability` | Set doctor's availability |
| GET | `/doctors/me/appointments` | List doctor's appointments |
| GET | `/doctors/me/patients` | List doctor's patients |
| GET | `/doctors/me/patients/{id}` | Get patient details |
| **Appointments** | | |
| GET | `/doctors/{id}/availability` | Get slots for doctor + date |
| POST | `/appointments` | Book appointment |
| **Chat** | | |
| POST | `/chat` | Chat (streaming, Ollama) |
| POST | `/chat/stream` | Chat (alias for streaming) |
| GET | `/chat/agent-status` | Agent status (background extraction) |
| GET | `/chat/pending-clarifications` | Pending clarifications |
| POST | `/chat/answer-clarification/{id}` | Answer or dismiss clarification |
| GET | `/chat/agent-log` | Agent execution log |
| POST | `/chat/reset-agent` | Reset agent state |

## Supabase Setup

### Database Schema

1. Go to your [Supabase dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor** → **New query**
3. Copy the entire contents of `supabase_schema.sql` and run it
4. This will create the following tables with Row Level Security (RLS) enabled:
   - **user_profiles**: User authentication and role tracking (patient/doctor)
   - **profiles**: Patient profiles and onboarding data
   - **members**: Family/household members
   - **medicines**: Medicine tracking and schedules
   - **health_records**: Health metrics (BP, sugar, weight, etc.)
   - **doctors**: Doctor profiles with license verification
   - **doctor_availability**: Weekly availability slots for doctors
   - **appointments**: Patient appointments with doctors
   - **medical_reports**: Medical reports uploaded by patients

### API Keys

Get your API keys from **Project Settings → API**:
- `SUPABASE_URL`: Your project URL
- `SUPABASE_KEY`: The `anon` public key (for client-side)
- `SUPABASE_SERVICE_ROLE_KEY`: The service role key (server-side, bypasses RLS)

⚠️ **Important**: The backend uses the service role key for DB access so RLS does not block server-side inserts (e.g., medicines, health_records).

### Verification

After setup, verify connectivity:
- Start the backend server and visit `http://localhost:5050/api/v1/health/db`
- Should return `{"status": "healthy", "database": "supabase"}`

## Production

- Set `ENV_NAME=production` and `DEBUG=false` in `.env`.
- Set `CORS_ORIGINS` to your frontend URL(s), comma-separated (e.g. `https://app.example.com`). Do not use `*` in production.
- Run with a process manager (e.g. gunicorn with uvicorn workers) and put a reverse proxy (e.g. nginx) in front for TLS and rate limiting.
- Health: use `GET /api/v1/health` for liveness and `GET /api/v1/health/db` for readiness (e.g. load balancer checks).
- Never commit `.env` or any file containing real keys; use `.env.example` as a template only.

## Security

- All secrets (Supabase keys, `SECRET_KEY`, `REPORT_ENCRYPTION_KEY`, API keys) must be provided via environment; there are no default secrets in code.
- Report files are encrypted at rest using `REPORT_ENCRYPTION_KEY`; use a strong 32-byte key (e.g. 64 hex chars).
- The backend uses Supabase **service role** key for server-side DB access so RLS does not block API operations; keep this key server-side only.

## Development

- All routes under `app/routers/` are mounted with prefix `API_V1_PREFIX` (`/api/v1`).
- Protected routes use `get_current_user` (Bearer token from Supabase Auth).
- CORS defaults include `localhost:5173` and `localhost:8081`; override with `CORS_ORIGINS` for production.
