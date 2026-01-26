from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import opik

from models import QuestRequest, ImpactQuest
from agents import CommunityArchitect
from evaluators import SafetyEvaluator, AppropriatenessEvaluator

# Load environment variables
load_dotenv()

# Configure Opik (only if API key is present)
if os.getenv("OPIK_API_KEY"):
    try:
        opik.configure(
            api_key=os.getenv("OPIK_API_KEY"),
            workspace=os.getenv("OPIK_WORKSPACE"), 
            url=os.getenv("OPIK_URL_OVERRIDE", "https://www.comet.com/opik/api")
        )
        print("✅ Opik configured successfully")
    except Exception as e:
        print(f"⚠️  Opik configuration failed: {e}")
        print("   Server will continue without Opik tracing")
else:
    print("ℹ️  Opik API key not found - running without observability")

# Initialize FastAPI app
app = FastAPI(
    title="CommuPath API",
    description="AI-powered community impact quest platform",
    version="1.0.0"
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the Community Architect agent
architect = CommunityArchitect()

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "CommuPath API - AI-Powered Community Impact",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "CommuPath API",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY"))
    }

@app.post("/api/generate-quest", response_model=ImpactQuest)
async def generate_quest(request: QuestRequest):
    """
    Generate a community impact quest using AI
    
    Args:
        request: QuestRequest with coordinates, category, and preferences
        
    Returns:
        ImpactQuest: Generated quest with all details
    """
    try:
        quest = await architect.generate_quest(
            coordinates=request.coordinates,
            resolution_category=request.resolution_category,
            user_preferences=request.user_preferences
        )
        return quest
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quest: {str(e)}"
        )

@app.post("/api/evaluate-quest")
async def evaluate_quest(quest: ImpactQuest):
    """
    Evaluate a quest using LLM-as-a-judge for safety and appropriateness
    
    Args:
        quest: ImpactQuest to evaluate
        
    Returns:
        Evaluation scores and reasons
    """
    try:
        # Initialize evaluators
        safety_eval = SafetyEvaluator()
        appropriateness_eval = AppropriatenessEvaluator()
        
        # Convert quest to JSON string for evaluation
        quest_json = quest.model_dump_json(indent=2)
        
        # Run evaluations
        safety_score = safety_eval.score(quest_json)
        appropriateness_score = appropriateness_eval.score(quest_json)
        
        return {
            "quest_id": quest.quest_id,
            "evaluations": {
                "safety": {
                    "score": safety_score.value,
                    "reason": safety_score.reason
                },
                "appropriateness": {
                    "score": appropriateness_score.value,
                    "reason": appropriateness_score.reason
                }
            },
            "overall_score": (safety_score.value + appropriateness_score.value) / 2,
            "passed": (safety_score.value >= 0.7 and appropriateness_score.value >= 0.7)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate quest: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
