import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from bson import ObjectId
import datetime
import os
import shutil
from typing import List, Dict, Any
from fastapi.staticfiles import StaticFiles
import tasks # Import your tasks file

# --- Configuration ---
MONGO_URI = "mongodb://localhost:27017/"
# Get the absolute path of the directory where main.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Create an absolute path for the 'uploads' directory
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
# Define the URL path that the frontend will use
UPLOAD_URL_PATH = "/uploads" 
BASE_URL = "http://localhost:8000" # How the frontend can access files

# --- App Initialization ---
app = FastAPI(title="TransitionStudio Local Backend")

# --- Database Connection ---
app.mongodb_client = AsyncIOMotorClient(MONGO_URI)
app.mongodb = app.mongodb_client["transition_studio_db"]
# Create a synchronous client for simple GET routes
sync_client = MongoClient(MONGO_URI)
sync_db = sync_client["transition_studio_db"]

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], # Allow Vite/React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static File Serving ---
# Create the directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
# Mount the static directory using the absolute path
app.mount(UPLOAD_URL_PATH, StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --- Helper to convert MongoDB doc ---
def mongo_doc_to_json(doc: dict) -> dict:
    if not doc:
        return None
    # Convert _id to string and add it as 'id'
    doc["id"] = str(doc["_id"])
    doc.pop("_id")
    # Convert datetime objects to string
    if "created_date" in doc and isinstance(doc["created_date"], datetime.datetime):
        doc["created_date"] = doc["created_date"].isoformat()
    if "processed_at" in doc and isinstance(doc["processed_at"], datetime.datetime):
        doc["processed_at"] = doc["processed_at"].isoformat()
    return doc

# --- API ENDPOINTS ---
API_PREFIX = "/api/v1"

@app.post(f"{API_PREFIX}/analyze-video")
async def analyze_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        file_name = f"{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        # Use the absolute path to save the file
        file_path = os.path.join(UPLOAD_DIR, file_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Use the URL path constant to build the URL
        file_url = f"{BASE_URL}{UPLOAD_URL_PATH}/{file_name}"
        
        analysis_doc = {
            "video_url": file_url,
            "video_name": file.filename,
            "analysis_status": "processing",
            "duration": 0,
            "transitions": [],
            "created_date": datetime.datetime.now(datetime.timezone.utc)
        }
        result = await app.mongodb["VideoAnalysis"].insert_one(analysis_doc)
        # Fetch the newly created doc to return it
        new_doc = await app.mongodb["VideoAnalysis"].find_one({"_id": result.inserted_id})
        
        # Pass the absolute file_path to the task
        background_tasks.add_task(tasks.run_transition_analysis, str(new_doc["_id"]), file_path)
        
        return mongo_doc_to_json(new_doc)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@app.post(f"{API_PREFIX}/analyze-audio")
async def analyze_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        file_name = f"{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        # Use the absolute path to save the file
        file_path = os.path.join(UPLOAD_DIR, file_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Use the URL path constant to build the URL
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
        
        # Pass the absolute file_path to the task
        background_tasks.add_task(tasks.run_madmom_beat_analysis, str(new_doc["_id"]), file_path)
        
        return mongo_doc_to_json(new_doc)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


# This is a new endpoint your app will need for general file uploads
@app.post("/core/uploadfile") 
async def core_upload_file(file: UploadFile = File(...)):
    try:
        file_name = f"{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_url = f"{BASE_URL}{UPLOAD_URL_PATH}/{file_name}"
        return {"file_url": file_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Core file upload failed: {str(e)}")


@app.get(f"{API_PREFIX}/analyses/{{id}}")
async def get_analysis_status(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    doc = await app.mongodb["VideoAnalysis"].find_one({"_id": ObjectId(id)})
    if doc:
        return mongo_doc_to_json(doc)
    
    doc = await app.mongodb["BeatAnalysis"].find_one({"_id": ObjectId(id)})
    if doc:
        return mongo_doc_to_json(doc)
        
    raise HTTPException(status_code=404, detail="Document not found")

@app.get(f"{API_PREFIX}/analyses")
def list_analyses():
    docs = []
    # Query mongo synchronously for this simple GET request
    query = {"analysis_status": "completed"}
    for doc in sync_db["VideoAnalysis"].find(query).sort("created_date", -1).limit(100):
        docs.append(mongo_doc_to_json(doc))
    return docs

@app.delete(f"{API_PREFIX}/analyses/{{id}}")
async def delete_analysis(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Try deleting from both collections
    result_video = await app.mongodb["VideoAnalysis"].delete_one({"_id": ObjectId(id)})
    result_beat = await app.mongodb["BeatAnalysis"].delete_one({"_id": ObjectId(id)})
    
    if result_video.deleted_count == 1 or result_beat.deleted_count == 1:
        return {"success": True, "id": id}
        
    raise HTTPException(status_code=404, detail="Document not found")

@app.post(f"{API_PREFIX}/analyses/{{id}}")
async def update_analysis(id: str, updates: Dict[str, Any] = Body(...)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    # Don't allow changing the ID
    updates.pop('id', None)
    
    # Try updating in VideoAnalysis
    result = await app.mongodb["VideoAnalysis"].update_one({"_id": ObjectId(id)}, {"$set": updates})
    
    if result.matched_count == 0:
        # If not found, try updating in BeatAnalysis
        result = await app.mongodb["BeatAnalysis"].update_one({"_id": ObjectId(id)}, {"$set": updates})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
        
    updated_doc = await app.mongodb["VideoAnalysis"].find_one({"_id": ObjectId(id)})
    if not updated_doc:
        updated_doc = await app.mongodb["BeatAnalysis"].find_one({"_id": ObjectId(id)})

    return mongo_doc_to_json(updated_doc)

# --- Run the server ---
if __name__ == "__main__":
    print(f"--- Starting TransitionStudio Backend on http://localhost:8000 ---")
    print(f"--- Serving media files from: {UPLOAD_DIR} ---")
    print(f"--- URL path for media: {UPLOAD_URL_PATH} ---")
    print(f"--- Connecting to MongoDB at: {MONGO_URI} ---")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)