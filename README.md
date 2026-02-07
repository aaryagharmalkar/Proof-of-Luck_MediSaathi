# MediSaathi

MediSaathi is an AI-powered healthcare companion designed to simplify, organize, and enhance personal healthcare management. It centralizes medical records, prescriptions, doctor appointments, emergency support, and AI-driven health insights into a single unified platform, enabling proactive, informed, and timely healthcare decisions.

---

## Overview

Healthcare today is fragmented, reactive, and difficult for patients to manage effectively. Medical data is often scattered across hospitals, applications, and paper records, making it hard for individuals to understand reports, follow treatments, and take timely action.

MediSaathi addresses these challenges by acting as a digital healthcare assistant that transforms complex medical data into clear, actionable insights while supporting continuous monitoring, adherence, and early risk detection.

---

## Problem Statement

Patients commonly face the following challenges:
- Fragmented medical records across multiple platforms
- Complex medical terminology and unstructured reports
- Missed medications due to lack of reminders and tracking
- Delayed access to appropriate doctors
- Inefficient appointment scheduling
- Limited proactive health monitoring
- Poor emergency readiness and communication
- Low patient engagement and health awareness

These issues often lead to delayed care, poor adherence, and suboptimal health outcomes.

---

## Proposed Solution

MediSaathi is an AI-driven healthcare companion available as a web and mobile application that:
- Centralizes patient health data into a single digital platform
- Uses AI to summarize medical reports and doctor–patient conversations
- Digitizes and analyzes prescriptions using OCR
- Tracks medication adherence with intelligent reminders
- Detects health risks early using AI-driven analysis
- Recommends doctors based on symptoms and location
- Provides emergency alerts and support

---

## Key Features

### Centralized Health Profile
- Unified dashboard for medical reports, prescriptions, appointments, and emergency contacts
- Secure storage and structured access to health data

### AI-Based Medical Report Summarization
- Upload medical reports in PDF or image format
- AI-generated summaries with key findings
- Visualization of health metrics and trend analysis
- Risk severity scoring for early intervention

### OCR-Based Prescription Processing
- Digitization of handwritten and printed prescriptions
- Medicine name, dosage, and duration extraction
- Structured prescription storage
- Integration with medicine reminders and tracking

### Medicine Reminder and Adherence Tracking
- Automated reminder scheduling
- Intake tracking (taken/missed)
- Missed-dose detection
- Emergency alerts for repeated non-adherence

### Medical Conversation Summarization
- Upload recorded doctor–patient conversations
- Speech-to-text conversion and speaker diarization
- Extraction of key medical instructions
- Structured AI summaries for patient reference

### Doctor Appointment Scheduling
- Symptom-based clinical intent analysis using NLP
- Location-aware specialist recommendations
- Doctor availability matching
- Seamless appointment booking and calendar integration

### Anemia Detection and Risk Assessment
- AI-based analysis to detect potential anemia indicators
- Uses medical reports, hemoglobin values, and health data patterns
- Classifies anemia risk levels (low, moderate, high)
- Provides early alerts and recommendations for medical follow-up
- Supports proactive screening and preventive healthcare

### Emergency Support System
- One-tap emergency alert mechanism
- Automatic notification to emergency contacts and doctors
- Fast access to critical patient information during emergencies

---

## Technical Architecture

### API Gateway and Security Layer
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Request routing and rate limiting

### Microservices Architecture
- Medical Report and Conversation Summarization (LLM + RAG)
- OCR-Based Prescription Reader and Medicine Tracker
- Anemia Detection and Health Risk Analysis Service
- Doctor Appointment Scheduler
- Notification and Alert Service

### Database Structure
- Users and Profiles Database  
  Stores user details, health profiles, and emergency contacts  

- Medical Data Database  
  Stores reports, prescriptions, summaries, and extracted health metrics  

- Care and Intelligence Database  
  Stores appointments, reminders, alerts, AI insights, and risk assessments  

---

## Tech Stack

- **Frontend**: React Native (iOS & Android)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI and NLP**: Large Language Models, Retrieval-Augmented Generation (RAG), SpaCy
- **OCR**: Tesseract OCR
- **Authentication**: JWT, RBAC
- **Infrastructure**: Docker, Cloud Deployment  

---

## Target Audience

- Patients  
- Doctors  
- Caregivers  
- Family members  
- Hospitals and clinics  

---

## Impact

- Improves patient understanding of medical reports and prescriptions
- Reduces missed medications through intelligent reminders
- Enables early detection of health risks such as anemia
- Provides faster access to appropriate healthcare professionals
- Supports proactive, preventive, and personalized healthcare

---

## Scalability and Future Scope

- Integration with wearable devices for continuous health monitoring
- Expansion into diagnostics, insurance, and hospital system integrations
- Advanced AI-driven predictive health insights
- Personalized healthcare planning and recommendations

---

## Innovation and Uniqueness

- End-to-end healthcare management in a single platform
- Context-aware AI using complete patient health history
- Combines reports, prescriptions, appointments, anemia detection, and emergencies seamlessly
- Focus on proactive care rather than reactive treatment

---

## Demo

Demo Video:  
https://drive.google.com/drive/folders/1BfWLpA-fjq_OEyO6bgrHbeS3sKxbQNWQ

---

## Project Structure

```
MediSaathi/
├── frontend/               # Frontends
│   ├── website/            # Web app (Vite + React)
│   └── mobile/             # Mobile app (Expo / React Native)
│   ├── src/
│   │   ├── screens/       # App screens
│   │   ├── services/      # API integration
│   │   ├── styles/        # Styling and theme
│   │   └── App.tsx        # Main app component
│   ├── package.json
│   └── README.md
│
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   ├── models/       # Data models
│   │   ├── services/     # Business logic
│   │   ├── config.py     # Configuration
│   │   ├── database.py   # MongoDB connection
│   │   └── main.py       # FastAPI app
│   ├── requirements.txt
│   └── README.md
│
└── README.md             # This file
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account (free tier available)
- **Smartphone with Expo Go app** (iOS/Android) - [Get it here!](https://expo.dev/client)
- **No Android Studio or Xcode needed!** 🎉

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd MediSaathi

# Setup everything
make setup          # Mac/Linux
npm run setup       # Windows/Cross-platform

# Configure MongoDB
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Run the app (2 separate terminals)
make backend        # Terminal 1
make frontend-website   # Terminal 2 (web), or make frontend-mobile (Expo)
```

**📖 For detailed setup instructions, see [SETUP.md](SETUP.md)**

### Available Commands

| Command | Mac/Linux | Windows/All Platforms |
|---------|-----------|----------------------|
| Setup project | `make setup` | `npm run setup` |
| Run backend | `make backend` | `npm run backend` |
| Run website | `make frontend-website` | `npm run frontend:website` |
| Run mobile | `make frontend-mobile` | `npm run frontend:mobile` |
| Clean dependencies | `make clean` | `npm run clean` |
| See all commands | `make help` | `npm run help` |

---

## License

This project is developed for educational and hackathon purposes. It is not intended to replace professional medical diagnosis or treatment.
