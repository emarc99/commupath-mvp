# CommuPath Backend Setup Guide

## Milestone 1: The Architect Core ✅

Backend API with Gemini 2.5 Pro integration for AI-powered quest generation.

---

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy your API key

### 3. Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
# GEMINI_API_KEY=your_actual_api_key_here
```

### 4. Run the Backend Server

```bash
python main.py
```

The server will start on **http://localhost:8000**

---

## 📖 API Documentation

Once the server is running, visit:
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc

---

## 🧪 Test the API

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Generate a Quest
```bash
curl -X POST http://localhost:8000/api/generate-quest \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": {"lat": 7.3775, "lng": 3.9470},
    "resolution_category": "Environment",
    "user_preferences": "I prefer outdoor activities"
  }'
```

---

## 📁 Backend Structure

```
backend/
├── main.py           # FastAPI app and endpoints
├── agents.py         # CommunityArchitect AI agent
├── models.py         # Pydantic data models
├── requirements.txt  # Python dependencies
├── .env.example      # Environment template
├── .env              # Your API keys (gitignored)
└── .gitignore        # Git ignore rules
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key |  Yes |
| `OPIK_API_KEY` | Opik observability key |  Yes |
| `OPIK_WORKSPACE` | Opik workspace name | Yes |

---

## 🎯 Features Implemented

### CommunityArchitect Agent (`agents.py`)

✅ **Gemini 2.5 Integration**
- Uses official `google-genai` SDK
- Structured JSON output mode
- Automatic schema validation

✅ **Location-Aware Prompting**
- Reverse geocoding simulation
- Location-specific quest suggestions
- Real community needs identification

✅ **Fallback System**
- Graceful degradation if API fails
- Category-specific fallback quests
- Error handling and logging

### API Endpoints (`main.py`)

✅ **POST /api/generate-quest**
- Accepts coordinates + category
- Returns structured ImpactQuest
- CORS enabled for frontend

✅ **GET /api/health**
- Server health status
- Gemini configuration check

### Data Models (`models.py`)

✅ **Pydantic Validation**
- Type-safe request/response
- Field constraints (lat/lng ranges)
- Auto-generated OpenAPI docs

---

## 🔗 Frontend Integration

The React frontend (`ImpactMap.tsx`) now calls the backend API:

```typescript
const response = await fetch('http://localhost:8000/api/generate-quest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    coordinates: { lat: 7.3775, lng: 3.9470 },
    resolution_category: 'Environment'
  })
});

const quest = await response.json();
```

---

## ⚙️ How It Works

1. **User clicks "Ask Architect for Quest"** on Impact Map
2. **Frontend sends POST request** to `/api/generate-quest` with:
   - GPS coordinates
   - Resolution category (Environment/Social/Education/Health)
   - Optional user preferences
3. **CommunityArchitect agent**:
   - Analyzes location context
   - Builds specialized prompt for Gemini
   - Requests structured JSON output
   - Validates response against schema
4. **Gemini 2.5 generates**:
   - Location-specific quest title
   - Detailed actionable description
   - Difficulty level (Easy/Medium/Hard)
   - Measurable impact metric
   - Estimated time and community benefit
5. **Backend returns ImpactQuest** to frontend
6. **Quest appears on map** and in Quest Hub

---

## 🐛 Troubleshooting

### "GEMINI_API_KEY environment variable not set"
- Make sure you created `.env` file (not just `.env.example`)
- Add your actual API key to `.env`
- Restart the server

### "Failed to generate quest"
- Check your API key is valid
- Verify you have internet connection
- The fallback system should still work

### CORS errors from frontend
- Make sure backend is running on port 8000
- Check CORS settings in `main.py`

### Import errors
- Activate virtual environment: `.\venv\Scripts\activate` (Windows)
- Install requirements: `pip install -r requirements.txt`

---

## 🚀 Next Steps

**Milestone 2**: Add Opik observability
- `@track` decorators on agent methods
- LLM-as-a-judge for safety evaluation
- Dashboard for tracing AI decisions

**Milestone 3**: Multimodal verification
- Gemini Vision for photo proof
- Confidence scoring
- Point awarding system

**Milestone 4**: Database persistence
- SQLAlchemy integration
- User and quest storage
- Real-time leaderboard

---

## 📝 Verified Working (Quest Generated)

### Backend API 

Linux/MacOS

```bash
# Test quest generation
curl -X POST http://localhost:8000/api/generate-quest \
  -H "Content-Type: application/json" \
  -d '{"coordinates": {"lat": 7.3775, "lng": 3.9470}, "resolution_category": "Environment"}'
```

Windows

```powershell
$body = @{
    coordinates = @{
        lat = 7.3775
        lng = 3.9470
    }
    resolution_category = "Environment"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/generate-quest" -Method Post -Body $body -ContentType "application/json"
```


### Response
```json
{
"quest_id"          : "quest_5aacd48b"
"title"             : "Combat Plastic Pollution in Ibadan Markets"
"description"       : "Organize a community initiative to reduce plastic waste in Bodija Market,
                    Ibadan's largest open-air market. The project involves distributing reusable shopping bags to vendors and customers, setting up designated plastic collection points, and conducting a workshop on recycling and waste management for market traders. Partner with local NGOs and Ibadan Waste Management Authority.",
"difficulty"        : "Medium",
"impact_metric"     : "Distribute 500 reusable bags, collect 200kg of recyclable plastic per   
                    week, train 50 market traders",
"location"          : "@{lat=7.3775; lng=3.947}",
"category"          : "Environment",
"estimated_time"    : "5 hours (over two days)",
"community_benefit" : "Reduced plastic waste in market environment, healthier environment for
                    2000+ daily shoppers and traders, promotion of recycling practices.",
}

```

---

**Backend is almsost ready!** 🎉
