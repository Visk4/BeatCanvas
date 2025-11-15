import threading
from pymongo import MongoClient
from bson import ObjectId, errors
import madmom
import numpy as np
import cv2
import datetime
import os
import random
from dotenv import load_dotenv

# --- Load Env ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

# --- MongoDB ---
def get_db():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.server_info()  # Force connection check
        db = client["transition_studio_db"]
        return db
    except Exception as e:
        print("❌ MongoDB connection error in tasks.py:", e)
        raise

# --- Helper: Run background task in thread ---
def start_background_task(fn, *args):
    thread = threading.Thread(target=fn, args=args)
    thread.daemon = True
    thread.start()

# --- Beat Analysis ---
def run_madmom_beat_analysis(task_id: str, file_path: str):
    print(f"[Task {task_id}] Starting beat analysis...")
    db = get_db()
    col = db["BeatAnalysis"]

    try:
        FPS = 100
        rnn = madmom.features.beats.RNNBeatProcessor()
        activations = rnn(file_path)
        dbn = madmom.features.beats.DBNBeatTrackingProcessor(fps=FPS)
        beats = dbn(activations)

        tempo_proc = madmom.features.tempo.TempoEstimationProcessor(fps=FPS)
        tempo = int(tempo_proc(activations)[0][0]) if len(beats) else 0

        duration = madmom.audio.signal.Signal(file_path).length / 44100

        updates = {
            "analysis_status": "completed",
            "duration": duration,
            "beats": [{"timestamp": float(b)} for b in beats],
            "tempo": tempo,
            "processed_at": datetime.datetime.now(datetime.timezone.utc)
        }
        col.update_one({"_id": ObjectId(task_id)}, {"$set": updates})
        print(f"[Task {task_id}] Beat analysis done, {len(beats)} beats found.")

    except Exception as e:
        print(f"❌ Beat analysis failed for {task_id}: {e}")
        col.update_one({"_id": ObjectId(task_id)}, {"$set": {"analysis_status": "failed", "error": str(e)}})


# --- Transition Analysis ---
def run_transition_analysis(task_id: str, file_path: str):
    print(f"[Task {task_id}] Starting transition analysis...")
    db = get_db()
    col = db["VideoAnalysis"]

    try:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise IOError(f"Cannot open video file: {file_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps

        frame_analysis = []
        frame_skip = max(1, int(fps // 10))
        frame_num = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if frame_num % frame_skip == 0:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                brightness = np.mean(gray)
                frame_analysis.append({"timestamp": frame_num / fps, "brightness": brightness})
            frame_num += 1
        cap.release()

        transitions = []
        for i in range(1, len(frame_analysis)):
            diff = abs(frame_analysis[i]["brightness"] - frame_analysis[i-1]["brightness"])
            if diff > 30:
                transitions.append({
                    "timestamp": frame_analysis[i]["timestamp"],
                    "type": "cut",
                    "confidence": min(1.0, diff / 100)
                })

        updates = {
            "analysis_status": "completed",
            "duration": duration,
            "transitions": transitions,
            "processed_at": datetime.datetime.now(datetime.timezone.utc)
        }
        col.update_one({"_id": ObjectId(task_id)}, {"$set": updates})
        print(f"[Task {task_id}] Transition analysis done, {len(transitions)} transitions found.")

    except Exception as e:
        print(f"❌ Transition analysis failed for {task_id}: {e}")
        col.update_one({"_id": ObjectId(task_id)}, {"$set": {"analysis_status": "failed", "error": str(e)}})
