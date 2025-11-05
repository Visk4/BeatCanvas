from pymongo import MongoClient
from bson import ObjectId
import madmom
import numpy as np
import os
import cv2 # OpenCV
import datetime

# --- Configuration ---
MONGO_URI = "mongodb://localhost:27017/"

# --- Database Connection ---
# Tasks run in a separate process, so they need their own sync client
def get_db():
    client = MongoClient(MONGO_URI)
    db = client["transition_studio_db"]
    return db

# --- AI Task 1: Beat Detection (madmom) ---
def run_madmom_beat_analysis(task_id: str, file_path: str):
    print(f"[Task {task_id}] Starting beat analysis...")
    db = get_db()
    analysis_collection = db["BeatAnalysis"]
    
    try:
        # 1. Run Madmom
        FPS = 100
        rnn_proc = madmom.features.beats.RNNBeatProcessor()
        activations = rnn_proc(file_path)
        dbn_proc = madmom.features.beats.DBNBeatTrackingProcessor(fps=FPS)
        all_beats = dbn_proc(activations)

        if len(all_beats) == 0:
            print(f"[Task {task_id}] No beats found.")
            all_beats = np.array([])
            prominent_beats_data = np.array([])
            tempo = 0
        else:
            beat_frames = (all_beats * FPS).astype(int)
            beat_frames = np.clip(beat_frames, 0, len(activations) - 1)
            beat_activations = activations[beat_frames]

            mean_activation = np.mean(beat_activations)
            std_dev_activation = np.std(beat_activations)
            threshold = mean_activation + (1.5 * std_dev_activation) # Prominence factor

            prominent_indices = np.where(beat_activations >= threshold)[0]
            prominent_beats_data = all_beats[prominent_indices]
            tempo = int(madmom.features.tempo.TempoEstimationProcessor(fps=FPS)(activations)[0][0])
        
        # Get duration
        sig = madmom.audio.signal.Signal(file_path)
        duration = sig.length / sig.sample_rate

        # 2. Update MongoDB
        updates = {
            "analysis_status": "completed",
            "duration": duration,
            "beats": [{"timestamp": t} for t in all_beats.tolist()],
            "strongBeats": [{"timestamp": t, "type": "hook"} for t in prominent_beats_data.tolist()],
            "totalBeats": len(all_beats),
            "totalStrongBeats": len(prominent_beats_data),
            "tempo": tempo,
            "processed_at": datetime.datetime.now(datetime.timezone.utc)
        }
        analysis_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": updates}
        )
        print(f"[Task {task_id}] Beat analysis complete.")
        
    except Exception as e:
        print(f"ERROR: Beat analysis failed for {task_id}: {e}")
        analysis_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {"analysis_status": "failed", "error": str(e)}}
        )
    finally:
        # THE FIX: We are REMOVING the 'os.remove(file_path)' line
        # so the video file is NOT deleted.
        #
        # if os.path.exists(file_path):
        #     os.remove(file_path) 
        print(f"[Task {task_id}] File processing finished. File was NOT deleted.")


# --- AI Task 2: Transition Detection (OpenCV) ---
def get_frame_stats(frame):
    avg_color = np.mean(frame, axis=(0, 1)) # Avg B, G, R
    avg_brightness = np.mean(avg_color)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edge_strength = np.mean(cv2.Canny(gray, 50, 150)) # Canny edge detection
    
    return {
        "avgBrightness": avg_brightness,
        "avgB": avg_color[0],
        "avgG": avg_color[1],
        "avgR": avg_color[2],
        "edgeStrength": edge_strength
    }

def run_transition_analysis(task_id: str, file_path: str):
    print(f"[Task {task_id}] Starting transition analysis...")
    db = get_db()
    analysis_collection = db["VideoAnalysis"]
    transitions = []
    
    try:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
             raise IOError(f"Cannot open video file {file_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps == 0:
            fps = 30 # Default if metadata is missing
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        
        sample_rate_hz = 10 # 10 FPS
        frame_skip = int(fps / sample_rate_hz)
        if frame_skip == 0: frame_skip = 1

        current_frame_num = 0
        prev_stats = None

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            if current_frame_num % frame_skip == 0:
                stats = get_frame_stats(frame)
                stats["timestamp"] = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
                
                if prev_stats:
                    brightness_diff = abs(stats["avgBrightness"] - prev_stats["avgBrightness"])
                    total_color_diff = abs(stats["avgR"] - prev_stats["avgR"]) + abs(stats["avgG"] - prev_stats["avgG"]) + abs(stats["avgB"] - prev_stats["avgB"])
                    
                    if brightness_diff > 30 or total_color_diff > 80:
                        if total_color_diff > 150:
                            type = "cut"
                            confidence = 0.9
                        elif brightness_diff > 40:
                            type = "fade"
                            confidence = 0.8
                        else:
                            type = "dissolve"
                            confidence = 0.7
                        
                        transitions.append({
                            "timestamp": stats["timestamp"],
                            "type": type,
                            "confidence": confidence,
                            "visual_cue": f"Detected {type} based on brightness/color change.",
                            "audio_cue": "Audio change likely."
                        })
                
                prev_stats = stats
            
            current_frame_num += 1
        
        cap.release()

        # Update MongoDB
        updates = {
            "analysis_status": "completed",
            "duration": duration,
            "transitions": transitions,
            "processed_at": datetime.datetime.now(datetime.timezone.utc)
        }
        analysis_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": updates}
        )
        print(f"[Task {task_id}] Transition analysis complete. Found {len(transitions)} transitions.")
        
    except Exception as e:
        print(f"ERROR: Transition analysis failed for {task_id}: {e}")
        analysis_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {"analysis_status": "failed", "error": str(e)}}
        )
    finally:
        # THE FIX: We are REMOVING the 'os.remove(file_path)' line
        # so the video file is NOT deleted.
        #
        # if os.path.exists(file_path):
        #     os.remove(file_path)
        print(f"[Task {task_id}] File processing finished. File was NOT deleted.")