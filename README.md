# 🎭 Controlled Anonymity

**Privacy-focused anonymous chat application with AI verification and karma system.**

> Chat freely. Stay safe. Remain anonymous.

## ✨ Features

### Core Features
- **🔒 No PII Required** - No email, phone number, or personal data needed
- **📷 AI Gender Verification** - Real-time camera verification (images deleted immediately)
- **⭐ Karma System** - Reputation tracking for abuse prevention
- **💬 Ephemeral Chat** - Messages are never stored permanently
- **🔄 Smart Matching** - Queue-based matching with filters
- **🎫 Freemium Limits** - 5 specific gender filters per day

### Privacy Guarantees
- Images are processed in-memory and **deleted immediately** after verification
- Only the gender result is stored, never the image
- Chat messages are not persisted to any database
- Device ID is a random UUID with no link to personal identity

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Landing │→ │ Verification │→ │ Profile → Dashboard → Chat│ │
│  └─────────┘  └─────────────┘  └─────────────────────────┘  │
│         ↓              ↓                    ↓                │
│    Device ID      Camera API           WebSocket             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Auth Router  │  │Reports Router│  │ WebSocket Chat  │   │
│  │ - Register   │  │ - Submit     │  │ - Queue         │   │
│  │ - Verify     │  │ - Karma      │  │ - Match         │   │
│  │ - Profile    │  │              │  │ - Message Relay │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
│         ↓                 ↓                   ↓             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Services Layer                          │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  │   │
│  │  │Verification│  │   Karma     │  │   Matching   │  │   │
│  │  │ (DeepFace) │  │  (Points)   │  │ (Queue/Redis)│  │   │
│  │  └────────────┘  └─────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│         ↓                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           SQLite / PostgreSQL                        │   │
│  │   - UserSession (device_id, gender, karma, limits)  │   │
│  │   - Report (reporter, reported, status)             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
 - This project requires Python 3.10. Python 3.13 is not supported due to TensorFlow and pydantic-core compatibility.

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

Simply open `frontend/index.html` in a modern browser, or serve it:

```bash
# Using Python's built-in server
cd frontend
python -m http.server 3000
```

Then open http://localhost:3000

## 🔧 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register device |
| POST | `/api/auth/verify-gender` | Verify gender with image |
| PUT | `/api/auth/profile` | Update nickname/bio |
| GET | `/api/auth/me` | Get current user |

### Reports & Karma
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports/submit` | Submit a report |
| GET | `/api/reports/karma` | Get karma score |
| POST | `/api/reports/chat-complete` | Award karma for chat |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://localhost:8000/ws/chat/{device_id}` | Real-time chat |

## ⭐ Karma System

| Event | Karma Change |
|-------|--------------|
| Initial Registration | +100 |
| Complete chat without reports | +2 |
| Get reported | -15 |
| Report verified (abuse confirmed) | -30 |
| Submit false report | -10 |
| Daily login | +1 |

### Access Levels
- **100+**: Full access, priority matching
- **50-99**: Standard access
- **25-49**: Warning state, limited filters
- **<25**: Temporary 24h ban
- **0**: Permanent device ban

## 📁 Project Structure

```
controlled-anonymity/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI app entry
│   │   ├── config.py         # Configuration
│   │   ├── database.py       # SQLAlchemy setup
│   │   ├── models.py         # Database models
│   │   ├── routers/
│   │   │   ├── auth.py       # Auth endpoints
│   │   │   ├── reports.py    # Karma/reports endpoints
│   │   │   └── ws_chat.py    # WebSocket chat
│   │   └── services/
│   │       ├── karma.py      # Karma logic
│   │       ├── matching.py   # Queue matching
│   │       └── verification.py # AI gender verification
│   └── requirements.txt
├── frontend/
│   ├── index.html            # Main HTML
│   ├── styles.css            # Styles
│   ├── device-fingerprint.js # Device ID
│   ├── api.js                # API client
│   └── app.js                # Main app logic
└── README.md
```

## 🔒 Privacy & Security

### Image Handling
1. User captures selfie via browser Camera API
2. Image is sent to backend as multipart form data
3. Image is written to a **temporary file** (required by DeepFace)
4. DeepFace analyzes the image for gender
5. **Temporary file is immediately deleted**
6. Only the gender result ("Man"/"Woman") is stored

### Device Fingerprinting
- Uses browser's `crypto.randomUUID()` or fallback
- UUID stored in `localStorage`
- Hashed (SHA-256) before sending to server
- No correlation to real identity

### Chat Data
- Messages relayed in real-time via WebSocket
- **No messages are stored in any database**
- Chat history cleared on session end

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details.

---

Built with ❤️ for privacy-conscious communication.
