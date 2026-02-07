# MediSaathi - Developer Setup

Quick setup guide to get MediSaathi running on your machine.

## Prerequisites

- **Node.js 18+** and npm
- **Python 3.9+** (Python 3.13 recommended)
- **Expo Go app** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- MongoDB Atlas credentials (provided separately)

---

## Setup Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MediSaathi
```

### 2. Configure Environment Variables

Create the backend `.env` file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your credentials:

```env
# MongoDB
MONGODB_URL=mongodb+srv://koturupavani_db_user:m0LFVUspJ0nTjksc@medisaathi.wsc4h5q.mongodb.net/?appName=MediSaathi
MONGODB_DB_NAME=medisaathi

# APIs
GROQ_API_KEY=your_groq_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
```

**Get your API keys:**
- **GROQ_API_KEY**: [groq.com/console/keys](https://console.groq.com/keys)
- **HUGGINGFACE_API_KEY**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
- **GEMINI_API_KEY**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) (used for prescription extraction)

### 3. Install Dependencies

**Option A: Using Make (Mac/Linux/WSL)**
```bash
make setup
```

**Option B: Using npm (All Platforms)**
```bash
npm run setup
```

---

## Running the App

Open **two separate terminals** and run:

**Terminal 1 - Backend (port 5050):**
```bash
make backend          # Mac/Linux
npm run backend       # Windows/Cross-platform
```

**Terminal 2 - Frontend (port 5173):**
```bash
make frontend-website  # Website (Vite) - Mac/Linux
make frontend-mobile   # Mobile (Expo) - Mac/Linux
npm run frontend:website   # Website - Windows/Cross-platform
npm run frontend:mobile    # Mobile - Windows/Cross-platform
```

All backend services (API, reports, prescription extraction) run on **port 5050**.

### 4. Connect Your Phone

1. **Open Expo Go** app on your phone
2. **Scan the QR code** from Terminal 2
3. Wait for the app to load

**Important:** Your phone and computer must be on the same WiFi network.

---

## Verify Everything Works

1. **Backend**: Visit [http://localhost:8000/docs](http://localhost:8000/docs) - you should see API documentation
2. **Frontend**: Open Expo Go and scan the QR code - you should see a blue screen with "✅ App is Working!"
3. **Database**: The backend will test the MongoDB connection on startup

---

## Common Issues

**Backend won't start?**
- Make sure `.env` file exists with valid MongoDB credentials
- Check if port 8000 is available: `lsof -i :8000` (Mac/Linux) or `netstat -ano | findstr :8000` (Windows)

**Frontend can't connect to backend?**
- Make sure both devices are on the same WiFi
- Update the IP address in `frontend/mobile/app.json` → `extra.apiBaseUrl` to your computer's IP (if used)
- Find your IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)

**Metro bundler crashes?**
- Install Watchman: `brew install watchman` (Mac)
- Try tunnel mode: `cd frontend/mobile && npx expo start --tunnel` (requires Expo account)

---

## Available Commands

Run `make help` (Mac/Linux) or `npm run help` (All platforms) to see all available commands.

**Key commands:**
- `make setup` / `npm run setup` - Install all dependencies
- `make backend` / `npm run backend` - Start backend server
- `make frontend-website` / `npm run frontend:website` - Start website (Vite)
- `make frontend-mobile` / `npm run frontend:mobile` - Start mobile (Expo)
- `make clean` / `npm run clean` - Clean all dependencies and caches

---

## Next Steps

Once the app is running, you're ready to start developing! Check out:
- `backend/README.md` - Backend architecture and API docs
- `frontend/README.md` - Frontend structure (website + mobile)
- `frontend/website/` - Web app (Vite + React)
- `frontend/mobile/` - Mobile app (Expo)
- `README.md` - Project overview and features

Happy coding! 🚀
