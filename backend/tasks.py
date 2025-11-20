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

        print(f"[Task {task_id}] Video: {fps:.2f} FPS, {frame_count} frames, {duration:.2f}s")

        # Analyze every Nth frame for performance (5 frames per second for higher accuracy)
        frame_skip = max(1, int(fps // 5))
        frame_analysis = []
        frame_num = 0
        prev_frame_gray = None

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_num % frame_skip == 0:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                
                # Calculate histogram for better comparison
                hist = cv2.calcHist([gray], [0], None, [64], [0, 256])
                hist = cv2.normalize(hist, hist).flatten()
                
                # Calculate multiple metrics
                brightness = np.mean(gray)
                contrast = np.std(gray)
                
                # Calculate frame difference if we have previous frame
                frame_diff = 0
                if prev_frame_gray is not None:
                    # Structural difference using absolute pixel differences
                    frame_diff = np.mean(np.abs(gray.astype(float) - prev_frame_gray.astype(float)))
                
                frame_analysis.append({
                    "timestamp": frame_num / fps,
                    "frame_num": frame_num,
                    "brightness": float(brightness),
                    "contrast": float(contrast),
                    "histogram": hist.tolist(),
                    "frame_diff": float(frame_diff)
                })
                
                prev_frame_gray = gray.copy()
            
            frame_num += 1
        
        cap.release()
        print(f"[Task {task_id}] Analyzed {len(frame_analysis)} sample frames")

        # Detect transitions using multiple techniques
        transitions = []
        
        # 1. Hard cuts - sudden brightness/histogram changes
        for i in range(1, len(frame_analysis)):
            curr = frame_analysis[i]
            prev = frame_analysis[i-1]
            
            # Calculate histogram difference (Chi-square distance)
            hist_diff = np.sum((np.array(curr["histogram"]) - np.array(prev["histogram"])) ** 2)
            brightness_diff = abs(curr["brightness"] - prev["brightness"])
            
            # Hard cut detection: significant histogram change OR high frame difference (stricter thresholds)
            if hist_diff > 0.5 or curr["frame_diff"] > 35:
                confidence = min(1.0, (hist_diff + curr["frame_diff"] / 50) / 2)
                transitions.append({
                    "timestamp": curr["timestamp"],
                    "type": "cut",
                    "confidence": float(confidence),
                    "metrics": {
                        "hist_diff": float(hist_diff),
                        "frame_diff": curr["frame_diff"],
                        "brightness_diff": float(brightness_diff)
                    }
                })
        
        # 2. Fade detection - gradual brightness changes
        fade_window = 5  # Check 5 frames for fades
        for i in range(fade_window, len(frame_analysis) - fade_window):
            # Check for fade to black (brightness decreasing)
            fade_out = True
            fade_in = True
            
            for j in range(1, fade_window):
                if frame_analysis[i-j]["brightness"] < frame_analysis[i-j-1]["brightness"]:
                    fade_out = False
                if frame_analysis[i+j]["brightness"] < frame_analysis[i+j-1]["brightness"]:
                    fade_in = False
            
            # Fade out detected (brightness decreasing over window)
            if fade_out and frame_analysis[i]["brightness"] < 40:
                brightness_drop = frame_analysis[i-fade_window+1]["brightness"] - frame_analysis[i]["brightness"]
                if brightness_drop > 30:
                    # Check if not already detected as cut
                    if not any(abs(t["timestamp"] - frame_analysis[i]["timestamp"]) < 0.5 for t in transitions):
                        transitions.append({
                            "timestamp": frame_analysis[i]["timestamp"],
                            "type": "fade",
                            "confidence": min(1.0, brightness_drop / 100),
                            "metrics": {"brightness_drop": float(brightness_drop)}
                        })
        
        # 3. Dissolve detection - gradual histogram changes with low frame diff variance
        dissolve_window = 6
        for i in range(dissolve_window, len(frame_analysis) - dissolve_window):
            # Check for consistent gradual changes (not sudden)
            frame_diffs = [frame_analysis[i+j]["frame_diff"] for j in range(-dissolve_window//2, dissolve_window//2)]
            
            if len(frame_diffs) > 0:
                avg_diff = np.mean(frame_diffs)
                variance = np.std(frame_diffs)
                
                # Dissolve: moderate consistent change (not sudden, not static)
                if 8 < avg_diff < 20 and variance < 5:
                    # Check if not already detected
                    if not any(abs(t["timestamp"] - frame_analysis[i]["timestamp"]) < 0.5 for t in transitions):
                        transitions.append({
                            "timestamp": frame_analysis[i]["timestamp"],
                            "type": "dissolve",
                            "confidence": min(1.0, avg_diff / 20),
                            "metrics": {
                                "avg_frame_diff": float(avg_diff),
                                "variance": float(variance)
                            }
                        })

        # Sort by timestamp and remove very close duplicates
        transitions.sort(key=lambda x: x["timestamp"])
        filtered_transitions = []
        min_gap = 1.0  # Minimum 1.0 seconds between transitions for cleaner segmentation
        
        for t in transitions:
            if not filtered_transitions or (t["timestamp"] - filtered_transitions[-1]["timestamp"]) >= min_gap:
                filtered_transitions.append(t)
            else:
                # Keep the one with higher confidence
                if t["confidence"] > filtered_transitions[-1]["confidence"]:
                    filtered_transitions[-1] = t

        print(f"[Task {task_id}] Detected {len(filtered_transitions)} transitions:")
        for t in filtered_transitions:
            print(f"  - {t['timestamp']:.2f}s: {t['type']} (confidence: {t['confidence']:.2f})")

        updates = {
            "analysis_status": "completed",
            "duration": duration,
            "transitions": filtered_transitions,
            "processed_at": datetime.datetime.now(datetime.timezone.utc)
        }
        col.update_one({"_id": ObjectId(task_id)}, {"$set": updates})
        print(f"[Task {task_id}] Transition analysis complete!")

    except Exception as e:
        print(f"❌ Transition analysis failed for {task_id}: {e}")
        import traceback
        traceback.print_exc()
        col.update_one({"_id": ObjectId(task_id)}, {"$set": {"analysis_status": "failed", "error": str(e)}})
