"""
File upload utilities for secure image handling.
Implements best practices for file validation and storage.
"""

import os
import uuid
from pathlib import Path
from typing import Tuple, Optional
import magic  # python-magic-bin
from fastapi import UploadFile, HTTPException, status

# Allowed image MIME types
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif"
}

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes

# Upload directory
UPLOAD_DIR = Path("uploads")


def init_upload_directory():
    """Create uploads directory if it doesn't exist"""
    UPLOAD_DIR.mkdir(exist_ok=True)
    print(f"✅ Upload directory ready: {UPLOAD_DIR.absolute()}")


async def validate_image_file(file: UploadFile) -> None:
    """
    Validate uploaded image file.
    Checks file size and MIME type using magic numbers (not just extension).
    
    Args:
        file: Uploaded file from FastAPI
        
    Raises:
        HTTPException: If file is invalid
    """
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to start
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size / 1024 / 1024:.2f}MB) exceeds maximum allowed size (10MB)"
        )
    
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty"
        )
    
    # Read first chunk for MIME type detection
    chunk = await file.read(2048)
    file.file.seek(0)  # Reset for later use
    
    # Detect MIME type using magic numbers
    try:
        mime = magic.from_buffer(chunk, mime=True)
    except Exception as e:
        # Fallback: check extension
        extension = file.filename.split(".")[-1].lower() if file.filename else ""
        if extension in ["jpg", "jpeg", "png", "webp", "gif"]:
            mime = f"image/{extension}"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not determine file type: {str(e)}"
            )
    
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{mime}' not allowed. Supported types: {', '.join(ALLOWED_MIME_TYPES)}"
        )


async def save_upload_file(
    file: UploadFile,
    quest_id: str,
    user_id: str
) -> Tuple[str, str]:
    """
    Save uploaded file to disk with secure filename.
    
    Args:
        file: Uploaded file from FastAPI
        quest_id: Quest ID for organization
        user_id: User ID for security
        
    Returns:
        Tuple of (file_path, relative_path)
        - file_path: Absolute path to saved file
        - relative_path: Relative path from backend root (for DB storage)
    """
    # Generate secure filename: UUID + original extension
    file_extension = Path(file.filename).suffix if file.filename else ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # Create quest-specific subdirectory
    quest_dir = UPLOAD_DIR / quest_id
    quest_dir.mkdir(exist_ok=True, parents=True)
    
    # Full path
    file_path = quest_dir / unique_filename
    relative_path = str(file_path.relative_to(Path.cwd()))
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        print(f"✅ File saved: {relative_path}")
        print(f"   Size: {len(contents) / 1024:.2f} KB")
        
        return str(file_path), relative_path
        
    except Exception as e:
        # Clean up on error
        if file_path.exists():
            file_path.unlink()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )
    finally:
        await file.close()


def get_file_path(relative_path: str) -> Optional[Path]:
    """
    Get absolute file path from relative path stored in DB.
    Validates that file exists.
    
    Args:
        relative_path: Relative path from database
        
    Returns:
        Path object if file exists, None otherwise
    """
    try:
        file_path = Path(relative_path)
        if file_path.exists() and file_path.is_file():
            return file_path
        return None
    except Exception:
        return None


def delete_file(relative_path: str) -> bool:
    """
    Delete a file given its relative path.
    
    Args:
        relative_path: Relative path from database
        
    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        file_path = Path(relative_path)
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            print(f"✅ File deleted: {relative_path}")
            return True
        return False
    except Exception as e:
        print(f"❌ Error deleting file {relative_path}: {e}")
        return False
