from pymongo import MongoClient
from bson import ObjectId
import madmom
import numpy as np
import os
import cv2 # OpenCV
import datetime
import random

# --- Configuration ---
# Load from environment variable for security, with a fallback for local dev
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")

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
def calculate_frame_stats(frame):
    """Calculates comprehensive stats for a single frame."""
    # Color averages
    avg_color = np.mean(frame, axis=(0, 1)) # Avg B, G, R

    # Brightness
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    avg_brightness = np.mean(gray)

    # Edge detection
    edge_strength = np.mean(cv2.Canny(gray, 50, 150))

    # Color histogram (16 bins per channel)
    hist_b = cv2.calcHist([frame], [0], None, [16], [0, 256])
    hist_g = cv2.calcHist([frame], [1], None, [16], [0, 256])
    hist_r = cv2.calcHist([frame], [2], None, [16], [0, 256])

    # Normalize histograms (sum to 1)
    cv2.normalize(hist_b, hist_b)
    cv2.normalize(hist_g, hist_g)
    cv2.normalize(hist_r, hist_r)
    
    return {
        "avgBrightness": avg_brightness,
        "avgB": avg_color[0],
        "avgG": avg_color[1],
        "avgR": avg_color[2],
        "edgeStrength": edge_strength,
        "colorHistogram": {
            "b": hist_b,
            "g": hist_g,
            "r": hist_r
        }
    }

def calculate_histogram_diff(hist1, hist2):
    """Calculates the difference between two color histograms."""
    if not hist1 or not hist2:
        return 0
    # Use Chi-Squared distance for better histogram comparison
    diff_b = cv2.compareHist(hist1["b"], hist2["b"], cv2.HISTCMP_CHISQR)
    diff_g = cv2.compareHist(hist1["g"], hist2["g"], cv2.HISTCMP_CHISQR)
    diff_r = cv2.compareHist(hist1["r"], hist2["r"], cv2.HISTCMP_CHISQR)
    return diff_b + diff_g + diff_r

def detect_transitions(frame_analysis, duration):
    """
    Detects transitions in a video based on frame analysis data.
    This is a Python translation of the user's JS logic.
    """
    transitions = []

    if not frame_analysis:
        return []

    # Adaptive thresholds
    brightnesses = [f["avgBrightness"] for f in frame_analysis if f.get("avgBrightness")]
    if not brightnesses: return []

    avg_brightness = np.mean(brightnesses)
    brightness_std_dev = np.std(brightnesses)

    # ULTRA-LOW thresholds for maximum sensitivity
    base_brightness_threshold = max(8, brightness_std_dev * 0.4)
    base_color_threshold = max(25, brightness_std_dev * 1.2)

    for i in range(1, len(frame_analysis)):
        prev = frame_analysis[i-1]
        curr = frame_analysis[i]

        brightness_diff = abs(curr["avgBrightness"] - prev["avgBrightness"])
        total_color_diff = abs(curr["avgR"] - prev["avgR"]) + abs(curr["avgG"] - prev["avgG"]) + abs(curr["avgB"] - prev["avgB"])
        edge_diff = abs(curr["edgeStrength"] - prev["edgeStrength"])
        hist_diff = calculate_histogram_diff(prev.get("colorHistogram"), curr.get("colorHistogram"))

        # Normalized scores
        brightness_score = brightness_diff / 255
        color_score = total_color_diff / (255 * 3)
        edge_score = edge_diff / 100
        hist_score = hist_diff / 10 # Chi-squared values are smaller, adjust denominator

        # Combined detection score
        detection_score = (brightness_score * 0.35) + (color_score * 0.35) + (edge_score * 0.15) + (hist_score * 0.15)

        if detection_score > 0.06 or brightness_diff > base_brightness_threshold or total_color_diff > base_color_threshold or hist_diff > 3.0:
            type = "cut"
            confidence = 0.65

            # Classify transition type
            if brightness_diff > base_brightness_threshold * 3.5:
                type = "fade"
                confidence = 0.88
            elif hist_diff > 8.0 or total_color_diff > base_color_threshold * 4:
                type = "cut"
                confidence = 0.94
            elif brightness_diff > base_brightness_threshold * 1.5 and total_color_diff > base_color_threshold * 1.5:
                type = "dissolve"
                confidence = 0.80
            elif edge_diff > 4 or abs(curr["avgR"] - prev["avgR"]) > base_color_threshold * 0.8:
                type = random.choice(["wipe", "pan"])
                confidence = 0.75
            else:
                type = random.choice(["zoom", "pan", "dissolve"])
                confidence = 0.68 + random.uniform(0, 0.12)

            confidence = min(0.98, confidence + detection_score * 0.4)

            transitions.append({
                "timestamp": curr["timestamp"],
                "type": type,
                "confidence": confidence,
                "detectionScore": detection_score,
                "visual_cue": f"Detected {type} with score {detection_score:.2f}",
                "audio_cue": "Audio change may be present."
            })

    # Filter duplicates
    filtered = []
    last_timestamp = -1
    for t in sorted(transitions, key=lambda x: x["timestamp"]):
        if t["timestamp"] - last_timestamp > 0.25:
            filtered.append(t)
            last_timestamp = t["timestamp"]

    return filtered

def run_transition_analysis(task_id: str, file_path: str):
    print(f"[Task {task_id}] Starting advanced transition analysis...")
    db = get_db()
    analysis_collection = db["VideoAnalysis"]
    
    try:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise IOError(f"Cannot open video file {file_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        
        # High sampling rate: 10 frames per second
        sample_rate_hz = 10
        frame_skip = max(1, int(fps / sample_rate_hz))

        frame_analysis = []
        current_frame_num = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            if current_frame_num % frame_skip == 0:
                stats = calculate_frame_stats(frame)
                stats["timestamp"] = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
                frame_analysis.append(stats)
            
            current_frame_num += 1
        
        cap.release()

        # Detect transitions using the new advanced logic
        transitions = detect_transitions(frame_analysis, duration)

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
        print(f"[Task {task_id}] Advanced transition analysis complete. Found {len(transitions)} transitions.")
        
    except Exception as e:
        print(f"ERROR: Advanced transition analysis failed for {task_id}: {e}")
        analysis_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {"analysis_status": "failed", "error": str(e)}}
        )
    finally:
        # File is NOT deleted to allow for viewing/re-analysis
        print(f"[Task {task_id}] File processing finished. File was NOT deleted.")