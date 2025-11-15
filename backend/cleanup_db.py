#!/usr/bin/env python3
"""Clean up MongoDB analyses with missing video files."""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client["beatcanvas"]

# Get all analyses
analyses = list(db["VideoAnalysis"].find())
print(f"Found {len(analyses)} total analyses")

deleted_count = 0
for analysis in analyses:
    video_url = analysis.get("video_url", "")
    # Extract filename from URL (e.g., "http://localhost:8000/uploads/file.mp4" -> "file.mp4")
    if "/uploads/" in video_url:
        filename = video_url.split("/uploads/")[-1]
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            print(f"🗑️  Deleting analysis with missing file: {filename}")
            db["VideoAnalysis"].delete_one({"_id": analysis["_id"]})
            deleted_count += 1

print(f"\n✅ Cleanup complete! Deleted {deleted_count} analyses with missing files.")
print(f"📊 Remaining analyses: {db['VideoAnalysis'].count_documents({})}")
