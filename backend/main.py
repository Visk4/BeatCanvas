import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from bson import ObjectId
from dotenv import load_dotenv
from typing import Dict, Any, Optional
import datetime
import os
import shutil
from tasks import start_background_task, run_transition_analysis, run_madmom_beat_analysis
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from fastapi import Request

# --- Load Environment ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# --- Configuration ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
BASE_URL = "http://localhost:8000"
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
UPLOAD_URL_PATH = "/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Auth configuration
JWT_SECRET = os.getenv("JWT_SECRET", "devsecret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    id: str
    email: EmailStr
    created_date: datetime.datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request):
    """Extract and validate user from Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token_value = auth_header.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token_value, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_doc = await app.mongodb["Users"].find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return mongo_doc_to_json(user_doc)

# --- App Initialization ---
app = FastAPI(title="TransitionStudio Backend")

# --- Database Connections ---
app.mongodb_client = AsyncIOMotorClient(MONGO_URI)
app.mongodb = app.mongodb_client["transition_studio_db"]
sync_db = MongoClient(MONGO_URI)["transition_studio_db"]

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Serve Uploaded Files ---
app.mount(UPLOAD_URL_PATH, StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --- Helper ---
def mongo_doc_to_json(doc: dict) -> dict:
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    doc.pop("_id")
    for field in ["created_date", "processed_at"]:
        if field in doc and isinstance(doc[field], datetime.datetime):
            doc[field] = doc[field].isoformat()
    return doc

# --- API PREFIX ---
API_PREFIX = "/api/v1"


# --- ROUTES ---

@app.post(f"{API_PREFIX}/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    try:
        existing = await app.mongodb["Users"].find_one({"email": user.email.lower()})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        now = datetime.datetime.now(datetime.timezone.utc)
        user_doc = {
            "email": user.email.lower(),
            "hashed_password": hash_password(user.password),
            "created_date": now,
        }
        result = await app.mongodb["Users"].insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        public = mongo_doc_to_json(user_doc)
        token = create_access_token({"sub": public["id"]})
        return TokenResponse(access_token=token, user=UserPublic(**public))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

@app.post(f"{API_PREFIX}/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user_doc = await app.mongodb["Users"].find_one({"email": credentials.email.lower()})
    if not user_doc or not verify_password(credentials.password, user_doc.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    public = mongo_doc_to_json(user_doc)
    token = create_access_token({"sub": public["id"]})
    return TokenResponse(access_token=token, user=UserPublic(**public))

@app.get(f"{API_PREFIX}/auth/me", response_model=UserPublic)
async def me(request: Request):
    current_user = await get_current_user(request)
    return UserPublic(**current_user)

@app.post(f"{API_PREFIX}/analyze-video")
async def analyze_video(file: UploadFile = File(...), request: Request = None):
    """Upload video, store in Mongo, and start background analysis."""
    try:
        # Get current user
        current_user = await get_current_user(request) if request else None
        
        file_name = f"{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, file_name)

        # Save uploaded video asynchronously
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        file_url = f"{BASE_URL}{UPLOAD_URL_PATH}/{file_name}"

        # Insert base record with user_id
        analysis_doc = {
            "video_url": file_url,
            "video_name": file.filename,
            "analysis_status": "processing",
            "duration": 0,
            "transitions": [],
            "user_id": current_user["id"] if current_user else None,
            "created_date": datetime.datetime.now(datetime.timezone.utc)
        }

        result = await app.mongodb["VideoAnalysis"].insert_one(analysis_doc)
        new_doc = await app.mongodb["VideoAnalysis"].find_one({"_id": result.inserted_id})

        # Start background task safely in a new thread
        start_background_task(run_transition_analysis, str(new_doc["_id"]), file_path)

        return mongo_doc_to_json(new_doc)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Video upload failed: {str(e)}")


@app.post(f"{API_PREFIX}/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)):
    """Upload audio, store in Mongo, and start beat detection."""
    try:
        file_name = f"{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, file_name)

        # Read file asynchronously
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        file_url = f"{BASE_URL}{UPLOAD_URL_PATH}/{file_name}"

        beat_doc = {
            "audio_url": file_url,
            "audio_name": file.filename,
            "analysis_status": "processing",
            "duration": 0,
            "beats": [],
            "strongBeats": [],
            "tempo": 0,
            "created_date": datetime.datetime.now(datetime.timezone.utc)
        }

        result = await app.mongodb["BeatAnalysis"].insert_one(beat_doc)
        new_doc = await app.mongodb["BeatAnalysis"].find_one({"_id": result.inserted_id})

        start_background_task(run_madmom_beat_analysis, str(new_doc["_id"]), file_path)

        return mongo_doc_to_json(new_doc)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Audio upload failed: {str(e)}")


@app.post("/core/uploadfile")
@app.post(f"{API_PREFIX}/upload-file")
async def core_upload_file(file: UploadFile = File(...)):
    """Basic upload endpoint (used by frontend directly)."""
    try:
        file_name = f"{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, file_name)

        # Read file content asynchronously
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        file_url = f"{BASE_URL}{UPLOAD_URL_PATH}/{file_name}"
        return {"file_url": file_url}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Core file upload failed: {str(e)}")


@app.post(f"{API_PREFIX}/upload-image")
async def upload_user_image(file: UploadFile = File(...), request: Request = None):
    """Upload image and save to user's gallery in DB."""
    try:
        current_user = await get_current_user(request) if request else None
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_id = current_user["id"]
        file_name = f"{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, file_name)

        # Save file
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        file_url = f"{BASE_URL}{UPLOAD_URL_PATH}/{file_name}"
        
        # Save to database
        image_doc = {
            "user_id": user_id,
            "file_name": file_name,
            "file_url": file_url,
            "original_name": file.filename,
            "uploaded_date": datetime.datetime.now(datetime.timezone.utc)
        }
        
        result = await app.mongodb["UserImages"].insert_one(image_doc)
        image_doc["_id"] = result.inserted_id
        
        return mongo_doc_to_json(image_doc)
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")


@app.get(f"{API_PREFIX}/user-images")
async def get_user_images(request: Request):
    """Get all images uploaded by current user."""
    try:
        current_user = await get_current_user(request)
        user_id = current_user["id"]
        
        images = []
        for doc in sync_db["UserImages"].find({"user_id": user_id}).sort("uploaded_date", -1):
            images.append(mongo_doc_to_json(doc))
        return images
    except HTTPException:
        return []


@app.delete(f"{API_PREFIX}/user-images/{id}")
async def delete_user_image(id: str, request: Request):
    """Delete user's image from DB and filesystem."""
    try:
        current_user = await get_current_user(request)
        user_id = current_user["id"]
        
        # Find image
        image = sync_db["UserImages"].find_one({"_id": ObjectId(id), "user_id": user_id})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Delete from filesystem
        file_path = os.path.join(UPLOAD_DIR, image["file_name"])
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete from database
        sync_db["UserImages"].delete_one({"_id": ObjectId(id)})
        
        return {"success": True, "id": id}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post(f"{API_PREFIX}/video-analysis")
async def create_video_analysis(data: dict, request: Request):
    """Create a new video analysis record."""
    try:
        current_user = await get_current_user(request)
        user_id = current_user["id"]  # Already converted by mongo_doc_to_json
        
        # Prepare document
        analysis_doc = {
            "user_id": user_id,
            "video_url": data.get("video_url"),
            "video_name": data.get("video_name"),
            "analysis_status": data.get("analysis_status", "pending"),
            "duration": data.get("duration"),
            "transitions": data.get("transitions", []),
            "created_date": datetime.datetime.utcnow()
        }
        
        result = await app.mongodb["VideoAnalysis"].insert_one(analysis_doc)
        new_doc = await app.mongodb["VideoAnalysis"].find_one({"_id": result.inserted_id})
        return mongo_doc_to_json(new_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create analysis: {str(e)}")


@app.get(f"{API_PREFIX}/analyses")
async def list_analyses(request: Request):
    """List video analyses for current user."""
    try:
        current_user = await get_current_user(request)
        user_id = current_user["id"]
        
        docs = []
        # Filter by user_id
        for doc in sync_db["VideoAnalysis"].find({"user_id": user_id}).sort("created_date", -1).limit(100):
            docs.append(mongo_doc_to_json(doc))
        return docs
    except HTTPException:
        # If no auth, return empty list
        return []


@app.get(f"{API_PREFIX}/analyses/{{id}}")
async def get_analysis_status(id: str, request: Request):
    """Check status of analysis by ID (user-owned only)."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    try:
        current_user = await get_current_user(request)
        user_id = current_user["id"]
    except HTTPException:
        user_id = None

    # Check VideoAnalysis
    query = {"_id": ObjectId(id)}
    if user_id:
        query["user_id"] = user_id
    
    doc = await app.mongodb["VideoAnalysis"].find_one(query)
    if doc:
        return mongo_doc_to_json(doc)

    doc = await app.mongodb["BeatAnalysis"].find_one(query)
    if doc:
        return mongo_doc_to_json(doc)

    raise HTTPException(status_code=404, detail="Document not found")


@app.post(f"{API_PREFIX}/analyses/{{id}}")
@app.put(f"{API_PREFIX}/video-analysis/{{id}}")
async def update_analysis(id: str, updates: dict, request: Request):
    """Update an analysis document (user-owned only)."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    try:
        current_user = await get_current_user(request)
        user_id = current_user["id"]
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Remove _id and id from updates if present
    updates.pop("_id", None)
    updates.pop("id", None)
    
    result = await app.mongodb["VideoAnalysis"].update_one(
        {"_id": ObjectId(id), "user_id": user_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found or not owned by user")
    
    # Return updated document
    doc = await app.mongodb["VideoAnalysis"].find_one({"_id": ObjectId(id)})
    return mongo_doc_to_json(doc)


@app.delete(f"{API_PREFIX}/analyses/{{id}}")
async def delete_analysis(id: str, request: Request):
    """Delete an analysis (user-owned only)."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    try:
        current_user = await get_current_user(request)
        user_id = current_user["id"]
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    result = await app.mongodb["VideoAnalysis"].delete_one({"_id": ObjectId(id), "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found or not owned by user")
    
    return {"success": True, "id": id}


# --- Run Server ---
if __name__ == "__main__":
    print(f"✅ Starting backend on {BASE_URL}")
    print(f"📂 Upload directory: {UPLOAD_DIR}")
    print(f"🌐 MongoDB URI: {MONGO_URI}")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
