"""
CRUD (Create, Read, Update, Delete) operations for database models.
Async functions for interacting with Users, Quests, and QuestSubmissions.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from typing import List, Optional

from db_models import User, Quest, QuestSubmission
from auth import get_password_hash


# ==================== USER CRUD ====================

async def create_user(
    db: AsyncSession,
    username: str,
    email: str,
    password: str,
    full_name: Optional[str] = None
) -> User:
    """Create a new user with hashed password"""
    hashed_password = get_password_hash(password)
    
    user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        full_name=full_name
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    """Get user by username"""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get user by email"""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    """Get user by ID"""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def update_user_points(
    db: AsyncSession,
    user_id: str,
    points_to_add: int,
    increment_quests: bool = False
) -> Optional[User]:
    """Update user points and optionally increment completed quests"""
    user = await get_user_by_id(db, user_id)
    if not user:
        return None
    
    user.points += points_to_add
    
    if increment_quests:
        user.completed_quests += 1
    
    # Update impact level based on points
    if user.points >= 1000:
        user.impact_level = "Legend"
    elif user.points >= 500:
        user.impact_level = "Hero"
    elif user.points >= 200:
        user.impact_level = "Rising Star"
    else:
        user.impact_level = "Novice"
    
    await db.commit()
    await db.refresh(user)
    
    return user


async def get_leaderboard(db: AsyncSession, limit: int = 10) -> List[User]:
    """Get top users by points for leaderboard"""
    result = await db.execute(
        select(User)
        .order_by(desc(User.points))
        .limit(limit)
    )
    return result.scalars().all()


# ==================== QUEST CRUD ====================

async def create_quest(
    db: AsyncSession,
    quest_id: str,
    title: str,
    description: str,
    category: str,
    difficulty: str,
    location_lat: float,
    location_lng: float,
    impact_metric: Optional[str] = None,
    estimated_time: Optional[str] = None,
    community_benefit: Optional[str] = None,
    created_by: Optional[str] = None,
    assigned_to: Optional[str] = None
) -> Quest:
    """Create a new quest
    
    Args:
        assigned_to: If None, quest is public (community board)
                     If user_id, quest is private/assigned
    """
    # No auto-assignment - let caller explicitly control assigned_to
    # assigned_to=None means public quest (community board)
    # assigned_to=user_id means private/assigned quest
    
    quest = Quest(
        quest_id=quest_id,
        title=title,
        description=description,
        category=category,
        difficulty=difficulty,
        location_lat=location_lat,
        location_lng=location_lng,
        impact_metric=impact_metric,
        estimated_time=estimated_time,
        community_benefit=community_benefit,
        created_by=created_by,
        assigned_to=assigned_to
    )
    
    db.add(quest)
    await db.commit()
    await db.refresh(quest)
    
    return quest


async def get_quest_by_id(db: AsyncSession, quest_id: str) -> Optional[Quest]:
    """Get quest by ID"""
    result = await db.execute(select(Quest).where(Quest.quest_id == quest_id))
    return result.scalar_one_or_none()


async def get_quests_by_user(
    db: AsyncSession,
    user_id: str,
    status: Optional[str] = None
) -> List[Quest]:
    """Get quests assigned to a user, optionally filtered by status"""
    query = select(Quest).where(Quest.assigned_to == user_id)
    
    if status:
        query = query.where(Quest.status == status)
    
    query = query.order_by(desc(Quest.created_at))
    result = await db.execute(query)
    
    return result.scalars().all()


async def get_all_quests(
    db: AsyncSession,
    status: Optional[str] = None,
    limit: int = 100
) -> List[Quest]:
    """Get all quests, optionally filtered by status"""
    query = select(Quest)
    
    if status:
        query = query.where(Quest.status == status)
    
    query = query.order_by(desc(Quest.created_at)).limit(limit)
    result = await db.execute(query)
    
    return result.scalars().all()


async def update_quest_status(
    db: AsyncSession,
    quest_id: str,
    new_status: str,
    assigned_to: Optional[str] = None
) -> Optional[Quest]:
    """Update quest status and optionally assign to a user"""
    quest = await get_quest_by_id(db, quest_id)
    if not quest:
        return None
    
    quest.status = new_status
    
    if assigned_to:
        quest.assigned_to = assigned_to
    
    if new_status == "Completed":
        from datetime import datetime
        quest.completed_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(quest)
    
    return quest


async def get_community_quests(
    db: AsyncSession,
    category: Optional[str] = None,
    difficulty: Optional[str] = None
) -> List[Quest]:
    """Get public quests (assigned_to is NULL) available for community to claim"""
    query = select(Quest).where(Quest.assigned_to.is_(None))
    
    if category:
        query = query.where(Quest.category == category)
    
    if difficulty:
        query = query.where(Quest.difficulty == difficulty)
    
    query = query.order_by(desc(Quest.created_at))
    result = await db.execute(query)
    
    return result.scalars().all()


async def get_quests_created_by_user(
    db: AsyncSession,
    user_id: str
) -> List[Quest]:
    """Get quests created by a specific user (for tracking impact as creator)"""
    result = await db.execute(
        select(Quest)
        .where(Quest.created_by == user_id)
        .order_by(desc(Quest.created_at))
    )
    return result.scalars().all()


async def get_all_quests(
    db: AsyncSession,
    category: Optional[str] = None,
    difficulty: Optional[str] = None
) -> List[Quest]:
    """Get ALL quests from all users (for community map visualization)"""
    query = select(Quest)
    
    if category:
        query = query.where(Quest.category == category)
    
    if difficulty:
        query = query.where(Quest.difficulty == difficulty)
    
    query = query.order_by(desc(Quest.created_at))
    result = await db.execute(query)
    
    return result.scalars().all()


# ==================== QUEST SUBMISSION CRUD ====================

async def create_submission(
    db: AsyncSession,
    quest_id: str,
    user_id: str,
    image_path: str,
    description: Optional[str] = None,
    confidence_score: float = 0.0,
    verification_result: str = "Pending",
    ai_reasoning: Optional[str] = None,
    points_awarded: int = 0
) -> QuestSubmission:
    """Create a new quest submission"""
    submission = QuestSubmission(
        quest_id=quest_id,
        user_id=user_id,
        image_path=image_path,
        description=description,
        confidence_score=confidence_score,
        verification_result=verification_result,
        ai_reasoning=ai_reasoning,
        points_awarded=points_awarded
    )
    
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    
    return submission


async def get_submissions_by_quest(
    db: AsyncSession,
    quest_id: str
) -> List[QuestSubmission]:
    """Get all submissions for a specific quest"""
    result = await db.execute(
        select(QuestSubmission)
        .where(QuestSubmission.quest_id == quest_id)
        .order_by(desc(QuestSubmission.submitted_at))
    )
    return result.scalars().all()


async def get_submissions_by_user(
    db: AsyncSession,
    user_id: str
) -> List[QuestSubmission]:
    """Get all submissions by a specific user"""
    result = await db.execute(
        select(QuestSubmission)
        .where(QuestSubmission.user_id == user_id)
        .order_by(desc(QuestSubmission.submitted_at))
    )
    return result.scalars().all()


async def get_submission_by_id(
    db: AsyncSession,
    submission_id: str
) -> Optional[QuestSubmission]:
    """Get submission by ID"""
    result = await db.execute(
        select(QuestSubmission).where(QuestSubmission.id == submission_id)
    )
    return result.scalar_one_or_none()
