from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv
from typing import List
import os
import opik
from contextlib import asynccontextmanager

from models import QuestRequest, ImpactQuest, StatusUpdate
from agents import CommunityArchitect
from evaluators import SafetyEvaluator, AppropriatenessEvaluator
from vision_agent import VisionVerifier
from database import get_db, init_db, close_db
from db_models import User, Quest
from auth import (
    create_access_token,
    get_current_active_user,
    authenticate_user,
    get_password_hash
)
import crud
from file_utils import init_upload_directory, validate_image_file, save_upload_file
from pydantic import BaseModel, EmailStr

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Logic ---
    # Everything before 'yield' runs when the server starts
    await init_db()
    init_upload_directory()
    print("🚀 CommuPath API started successfully")
    
    yield  # The application runs while this is suspended
    
    # --- Shutdown Logic ---
    # Everything after 'yield' runs when the server stops
    await close_db()
    print("👋 CommuPath API shut down gracefully")

# Initialize FastAPI app
app = FastAPI(
    title="CommuPath API",
    description="AI-powered community impact quest platform with vision verification",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agents
architect = CommunityArchitect()
verifier = VisionVerifier()


# ==================== STARTUP / SHUTDOWN ====================

# @app.on_event("startup")
# async def startup_event():
#     """Initialize database and upload directory on startup"""
#     await init_db()
#     init_upload_directory()
#     print("🚀 CommuPath API started successfully")


# @app.on_event("shutdown")
# async def shutdown_event():
#     """Close database connections on shutdown"""
#     await close_db()
#     print("👋 CommuPath API shut down gracefully")


# ==================== PYDANTIC MODELS ====================

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str | None = None


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str | None
    impact_level: str
    points: int
    completed_quests: int


class Token(BaseModel):
    access_token: str
    token_type: str


# ==================== ROOT ENDPOINTS ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "CommuPath API - AI-Powered Community Impact with Vision Verification",
        "version": "2.0.0",
        "features": [
            "AI Quest Generation (Gemini 2.5 Pro)",
            "Image Verification (Gemini Vision)",
            "User Authentication (JWT)",
            "Quest Persistence",
            "Leaderboard System"
        ],
        "docs": "/docs"
    }


@app.get("/api/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint with database connectivity test"""
    try:
        # Test database connection
        await db.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "service": "CommuPath API",
        "database": db_status,
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY"))
    }


# ==================== AUTHENTICATION ====================

@app.post("/api/auth/register", response_model=UserResponse)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    
    # Check if username already exists
    existing_user = await crud.get_user_by_username(db, user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = await crud.get_user_by_email(db, user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = await crud.create_user(
        db=db,
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name
    )
    
    return UserResponse(**user.to_dict())


@app.post("/api/auth/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login and receive JWT token"""
    
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current authenticated user information"""
    return UserResponse(**current_user.to_dict())


# ==================== QUEST GENERATION ====================

@app.post("/api/generate-quest", response_model=ImpactQuest)
async def generate_quest(
    request: QuestRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a community impact quest using AI and save to database
    Now powered by Google Maps for accurate location data
    """
    try:
        # Generate quest with AI (returns Dict with quest + location metadata)
        result = await architect.generate_quest(
            coordinates=request.coordinates,
            resolution_category=request.resolution_category,
            user_preferences=request.user_preferences
        )
        
        # Extract quest and location data
        quest = result["quest"]
        location_name = result.get("location_name")
        location_address = result.get("location_address")
        
        print(f"✅ Quest generated: {quest.title}")
        if location_name:
            print(f"   📍 Location: {location_name}")
        
        # Save to database with location metadata
        db_quest = await crud.create_quest(
            db=db,
            quest_id=quest.quest_id,
            title=quest.title,
            description=quest.description,
            category=quest.category,
            difficulty=quest.difficulty,
            location_lat=quest.location.lat,
            location_lng=quest.location.lng,
            impact_metric=quest.impact_metric,
            estimated_time=quest.estimated_time,
            community_benefit=quest.community_benefit,
            created_by=current_user.id,
            assigned_to=None if request.make_public else current_user.id,
            location_name=location_name,  # NEW
            location_address=location_address  # NEW
        )
        
        print(f"✅ Quest saved to database: {quest.quest_id}")
        
        return quest
        
    except Exception as e:
        print(f"❌ Quest generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quest: {str(e)}"
        )


# ==================== QUEST MANAGEMENT ====================

@app.get("/api/quests/my")
async def get_my_quests(
    status: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get quests assigned to current user"""
    quests = await crud.get_quests_by_user(db, current_user.id, status)
    return [quest.to_dict() for quest in quests]


# ==================== COMMUNITY QUEST MARKETPLACE ====================
# NOTE: These specific routes MUST come before /api/quests/{quest_id}
# to prevent the path parameter from catching them!

@app.get("/api/quests/community")
async def get_community_quests(
    category: str | None = None,
    difficulty: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get public quests available for the community to claim"""
    quests = await crud.get_community_quests(db, category, difficulty)
    return [quest.to_dict() for quest in quests]


@app.get("/api/quests/created-by-me")
async def get_my_created_quests(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get quests created by current user (to track your impact as creator)"""
    quests = await crud.get_quests_created_by_user(db, current_user.id)
    return [quest.to_dict() for quest in quests]


@app.get("/api/quests/all")
async def get_all_quests_for_map(
    category: str | None = None,
    difficulty: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get ALL quests from all users (for community map visualization)
    
    Note: This shows all quests but only public quests (assigned_to=NULL) can be claimed.
    Private quests are visible but locked to their creator.
    """
    quests = await crud.get_all_quests(db, category, difficulty)
    return [quest.to_dict() for quest in quests]


# ==================== QUEST MANAGEMENT (Generic Routes) ====================

@app.get("/api/quests/{quest_id}")
async def get_quest(
    quest_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific quest by ID"""
    quest = await crud.get_quest_by_id(db, quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    return quest.to_dict()


@app.put("/api/quests/{quest_id}/status")
async def update_quest_status(
    quest_id: str,
    update_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update quest status (Active, In Progress, Completed)"""
    new_status = update_data.get("status")
    if not new_status:
        raise HTTPException(status_code=422, detail="Status is required in request body")
        
    quest = await crud.update_quest_status(
        db, quest_id, new_status, assigned_to=current_user.id
    )
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    return quest.to_dict()




@app.post("/api/quests/{quest_id}/claim")
async def claim_quest(
    quest_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Claim a community quest (assign it to yourself)"""
    quest = await crud.get_quest_by_id(db, quest_id)
    
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    if quest.assigned_to is not None:
        raise HTTPException(status_code=400, detail="Quest already claimed")
    
    # Assign quest to current user
    quest.assigned_to = current_user.id
    quest.status = "Active"
    await db.commit()
    await db.refresh(quest)
    
    return {
        "message": "Quest claimed successfully!",
        "quest": quest.to_dict()
    }


@app.post("/api/quests/{quest_id}/toggle-public")
async def toggle_quest_public(
    quest_id: str,
    request_body: dict,  # Accept entire body as dict
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle quest between personal and community (public)"""
    # Extract make_public from request body
    make_public = request_body.get('make_public', False)
    
    quest = await crud.get_quest_by_id(db, quest_id)
    
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    # Only creator can toggle visibility
    if quest.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only quest creator can change visibility")
    
    if make_public:
        # Make public - remove assignment
        quest.assigned_to = None
        quest.status = "Active"
    else:
        # Make private - assign to creator
        quest.assigned_to = current_user.id
    
    await db.commit()
    await db.refresh(quest)
    
    return {
        "message": f"Quest is now {'public' if make_public else 'private'}",
        "quest": quest.to_dict()
    }


# ==================== IMAGE VERIFICATION ====================

@app.post("/api/verify-quest-proof")
async def verify_quest_proof(
    quest_id: str = Form(...),
    image: UploadFile = File(...),
    description: str = Form(""),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify quest completion using image analysis with Gemini Vision
    """
    try:
        # Validate image file
        await validate_image_file(image)
        
        # Get quest details
        quest = await crud.get_quest_by_id(db, quest_id)
        if not quest:
            raise HTTPException(status_code=404, detail="Quest not found")
        
        # Save uploaded image
        file_path, relative_path = await save_upload_file(image, quest_id, current_user.id)
        
        # Verify with AI
        verification_result = await verifier.verify_quest_proof(
            image_path=file_path,
            quest_title=quest.title,
            quest_description=quest.description,
            quest_category=quest.category,
            user_description=description
        )
        
        # Create submission record
        submission = await crud.create_submission(
            db=db,
            quest_id=quest_id,
            user_id=current_user.id,
            image_path=relative_path,
            description=description,
            confidence_score=verification_result["confidence_score"],
            verification_result=verification_result["verification_result"],
            ai_reasoning=verification_result["reasoning"],
            points_awarded=verification_result["suggested_points"]
        )
        
        # Award points if verified
        if verification_result["verification_result"] == "Verified":
            await crud.update_user_points(
                db,
                current_user.id,
                verification_result["suggested_points"],
                increment_quests=True
            )
            
            # Update quest status to completed
            await crud.update_quest_status(db, quest_id, "Completed")
        
        return {
            **submission.to_dict(),
            "key_observations": verification_result.get("key_observations", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify quest proof: {str(e)}"
        )


# ==================== SUBMISSIONS ====================

@app.get("/api/submissions/my")
async def get_my_submissions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all submissions by current user"""
    submissions = await crud.get_submissions_by_user(db, current_user.id)
    return [sub.to_dict() for sub in submissions]


@app.get("/api/quests/{quest_id}/submissions")
async def get_quest_submissions(
    quest_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all submissions for a specific quest"""
    submissions = await crud.get_submissions_by_quest(db, quest_id)
    return [sub.to_dict() for sub in submissions]


# ==================== LEADERBOARD ====================

@app.get("/api/leaderboard")
async def get_leaderboard(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get top users by points"""
    users = await crud.get_leaderboard(db, limit)
    return [user.to_dict() for user in users]


# ==================== LEGACY EVALUATION ENDPOINT ====================

@app.post("/api/evaluate-quest")
async def evaluate_quest(quest: ImpactQuest):
    """
    Evaluate a quest using LLM-as-a-judge for safety and appropriateness
    (Legacy endpoint - kept for backward compatibility)
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


# ==================== SERVER ENTRY POINT ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
