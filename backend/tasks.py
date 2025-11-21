import threading
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from bson import ObjectId, errors
import madmom
import numpy as np
import cv2
import datetime
import os
import random
import tempfile
import io
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

# --- Extract transition clip from video ---
def extract_transition_clip(video_path: str, start_time: float, end_time: float) -> str:
    """Extract a transition segment from video and save to temp file using FFmpeg."""
    try:
        import subprocess
        
        # Create temp output file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
        temp_path = temp_file.name
        temp_file.close()
        
        # Calculate duration
        clip_duration = end_time - start_time
        
        # Use FFmpeg to extract clip - much more reliable than OpenCV
        cmd = [
            'ffmpeg',
            '-y',  # Overwrite output
            '-ss', str(start_time),  # Start time
            '-i', video_path,  # Input file
            '-t', str(clip_duration),  # Duration
            '-c:v', 'libx264',  # Video codec
            '-c:a', 'aac',  # Audio codec (preserve audio if present)
            '-preset', 'fast',  # Encoding speed
            '-crf', '23',  # Quality
            temp_path
        ]
        
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        if result.returncode != 0:
            print(f"❌ FFmpeg extraction failed: {result.stderr}")
            return None
        
        # Verify output file exists and has content
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            print(f"  ✓ Extracted clip: {start_time:.2f}s - {end_time:.2f}s ({clip_duration:.2f}s)")
            return temp_path
        else:
            print(f"❌ Extracted file is empty or missing")
            return None
            
    except Exception as e:
        print(f"❌ Error extracting transition clip: {e}")
        import traceback
        traceback.print_exc()
        return None


# --- Extract and upload audio from video ---
def extract_and_upload_audio(db, video_path: str) -> str:
    """Extract audio from video and upload to GridFS."""
    try:
        import subprocess
        
        # Create temp audio file
        temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        temp_audio.close()
        
        # Extract audio using ffmpeg
        cmd = [
            'ffmpeg', '-i', video_path,
            '-vn',  # No video
            '-acodec', 'libmp3lame',  # MP3 codec
            '-q:a', '2',  # High quality
            '-y',  # Overwrite
            temp_audio.name
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"⚠️ FFmpeg audio extraction warning: {result.stderr}")
            # Check if file was created anyway
            if not os.path.exists(temp_audio.name) or os.path.getsize(temp_audio.name) == 0:
                return None
        
        # Upload to GridFS
        from gridfs import GridFSBucket
        fs = GridFSBucket(db)
        
        with open(temp_audio.name, 'rb') as f:
            file_data = f.read()
        
        if len(file_data) == 0:
            return None
        
        filename = f"extracted_audio_{datetime.datetime.now().timestamp()}.mp3"
        file_id = fs.upload_from_stream(
            filename,
            io.BytesIO(file_data),
            metadata={
                "content_type": "audio/mpeg",
                "extracted_from": "video_analysis",
                "upload_date": datetime.datetime.utcnow()
            }
        )
        
        # Cleanup
        try:
            os.unlink(temp_audio.name)
        except:
            pass
        
        return str(file_id)
        
    except Exception as e:
        print(f"❌ Error extracting audio: {e}")
        return None


# --- Upload transition clip to GridFS ---
def upload_transition_to_gridfs(db, file_path: str, transition_info: dict) -> str:
    """Upload transition clip to GridFS and return file_id."""
    try:
        # Get GridFS bucket
        client = MongoClient(MONGO_URI)
        motor_client = AsyncIOMotorClient(MONGO_URI)
        motor_db = motor_client["transition_studio_db"]
        
        # Read file
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Upload to GridFS (using sync version for background task)
        from gridfs import GridFSBucket
        fs = GridFSBucket(db)
        
        filename = f"transition_{transition_info['type']}_{transition_info['timestamp']:.2f}s.mp4"
        file_id = fs.upload_from_stream(
            filename,
            io.BytesIO(file_data),
            metadata={
                "content_type": "video/mp4",
                "transition_type": transition_info['type'],
                "timestamp": transition_info['timestamp'],
                "duration": transition_info['duration'],
                "upload_date": datetime.datetime.utcnow()
            }
        )
        
        print(f"✅ Uploaded transition clip to GridFS: {filename} → {file_id}")
        return str(file_id)
    except Exception as e:
        print(f"❌ Error uploading to GridFS: {e}")
        return None
    finally:
        # Clean up temp file
        try:
            os.unlink(file_path)
        except:
            pass

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

        # Analyze every Nth frame for performance (10 frames per second for maximum accuracy)
        frame_skip = max(1, int(fps // 10))
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
            
            # Hard cut detection: balanced thresholds for real scene changes
            # Requires significant change in histogram AND frame difference
            if hist_diff > 0.5 and curr["frame_diff"] > 35:
                # Detect transition end - look ahead for stabilization
                transition_end_idx = i
                for j in range(i + 1, min(i + 10, len(frame_analysis))):
                    next_frame = frame_analysis[j]
                    next_diff = np.sum((np.array(next_frame["histogram"]) - np.array(curr["histogram"])) ** 2)
                    if next_diff < 0.1:  # Stabilized
                        transition_end_idx = j
                        break
                
                transition_duration = frame_analysis[transition_end_idx]["timestamp"] - curr["timestamp"]
                confidence = min(1.0, (hist_diff + curr["frame_diff"] / 50) / 2)
                transitions.append({
                    "timestamp": curr["timestamp"],
                    "end_timestamp": frame_analysis[transition_end_idx]["timestamp"],
                    "duration": float(transition_duration),
                    "transition_duration": float(transition_duration),  # For composition
                    "type": "cut",
                    "transition_type": "cut",  # For composition
                    "confidence": float(confidence),
                    "metrics": {
                        "hist_diff": float(hist_diff),
                        "frame_diff": curr["frame_diff"],
                        "brightness_diff": float(brightness_diff)
                    }
                })

        # Sort by timestamp and remove very close duplicates
        transitions.sort(key=lambda x: x["timestamp"])
        filtered_transitions = []
        min_gap = 2.0  # Minimum 2 seconds between transitions
        
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

        # Extract audio from video and store in GridFS
        audio_file_id = None
        try:
            print(f"[Task {task_id}] Extracting audio from video...")
            audio_file_id = extract_and_upload_audio(db, file_path)
            if audio_file_id:
                print(f"  ✓ Extracted audio (file_id: {audio_file_id})")
        except Exception as e:
            print(f"  ⚠️ Could not extract audio: {e}")
        
        # Extract and upload transition clips to GridFS
        print(f"[Task {task_id}] Extracting transition clips...")
        for t in filtered_transitions:
            try:
                # Extract transition clip using OpenCV
                temp_path = extract_transition_clip(
                    file_path, 
                    t["timestamp"], 
                    t["end_timestamp"]
                )
                
                # Upload to GridFS
                file_id = upload_transition_to_gridfs(
                    db,
                    temp_path,
                    transition_info=t
                )
                
                # Add file_id to transition metadata
                t["clip_file_id"] = file_id
                print(f"  ✓ Extracted {t['type']} clip at {t['timestamp']:.2f}s (file_id: {file_id})")
                
            except Exception as e:
                print(f"  ✗ Failed to extract {t['type']} clip at {t['timestamp']:.2f}s: {e}")
                # Continue even if extraction fails - we can still use synthetic transitions
                t["clip_file_id"] = None

        updates = {
            "analysis_status": "completed",
            "duration": duration,
            "transitions": filtered_transitions,
            "audio_file_id": audio_file_id,
            "processed_at": datetime.datetime.now(datetime.timezone.utc)
        }
        col.update_one({"_id": ObjectId(task_id)}, {"$set": updates})
        print(f"[Task {task_id}] Transition analysis complete!")

    except Exception as e:
        print(f"❌ Transition analysis failed for {task_id}: {e}")
        import traceback
        traceback.print_exc()
        col.update_one({"_id": ObjectId(task_id)}, {"$set": {"analysis_status": "failed", "error": str(e)}})


# --- FFmpeg Video Composition with Transitions ---
def compose_video_with_ffmpeg(images: list, audio_path: str, transitions: list, duration: float, output_path: str) -> bool:
    """
    Compose video from images with transitions using FFmpeg.
    
    Args:
        images: List of image file paths
        audio_path: Path to audio file
        transitions: List of transition dicts with {timestamp, transition_type, transition_duration, clip_file_id}
        duration: Total video duration in seconds
        output_path: Where to save the composed video
    
    Returns:
        True if successful, False otherwise
    """
    try:
        import ffmpeg
        import shutil
        
        # Check if ffmpeg is installed
        if not shutil.which('ffmpeg'):
            raise RuntimeError(
                "FFmpeg is not installed or not in PATH. "
                "Install it with: sudo apt-get install ffmpeg (Ubuntu/WSL) "
                "or choco install ffmpeg (Windows) "
                "or download from https://ffmpeg.org/download.html"
            )
        
        print(f"🎬 Starting FFmpeg composition...")
        print(f"   Images: {len(images)}")
        print(f"   Audio: {'Yes (' + audio_path + ')' if audio_path else 'No'}")
        print(f"   Transitions: {len(transitions)}")
        if transitions:
            print(f"   Transition types: {[t.get('transition_type', 'unknown') for t in transitions]}")
        print(f"   Duration: {duration}s")
        
        # If only one image, create simple video
        if len(images) == 1:
            print("📸 Creating single image video")
            TARGET_WIDTH = 1280
            TARGET_HEIGHT = 720
            stream = ffmpeg.input(images[0], loop=1, t=duration, framerate=30)
            # Scale to standard size with padding
            stream = ffmpeg.filter(stream, 'scale', f'{TARGET_WIDTH}:{TARGET_HEIGHT}', force_original_aspect_ratio='decrease')
            stream = ffmpeg.filter(stream, 'pad', TARGET_WIDTH, TARGET_HEIGHT, '(ow-iw)/2', '(oh-ih)/2', color='black')
            if audio_path:
                print(f"🎵 Adding audio track from: {audio_path}")
                audio = ffmpeg.input(audio_path)
                stream = ffmpeg.output(
                    stream, 
                    audio, 
                    output_path, 
                    vcodec='libx264',
                    acodec='aac',
                    audio_bitrate='192k',
                    strict='experimental',
                    t=duration
                )
            else:
                stream = ffmpeg.output(stream, output_path, vcodec='libx264', t=duration)
            ffmpeg.run(stream, overwrite_output=True, quiet=False)
            return True
        
        # If no transitions provided, create automatic transitions between images
        if len(transitions) == 0:
            print("📸 No transitions provided - creating automatic slideshow with fade transitions")
            segment_duration = duration / len(images)
            transitions = []
            for i in range(len(images)):
                transitions.append({
                    'timestamp': (i + 1) * segment_duration,
                    'transition_type': 'fade',
                    'transition_duration': 0.5
                })
            print(f"   Auto-generated {len(transitions)} transitions")
        
        # Build segment timeline - distribute images evenly across video
        segments = []
        
        print(f"📋 Building timeline from {len(transitions)} transitions and {len(images)} images")
        
        # Calculate timing: each image gets equal time, transitions happen between them
        images_to_use = min(len(images), len(transitions) + 1)  # n transitions need n+1 images
        segment_duration = duration / images_to_use
        
        print(f"   Using {images_to_use} images, each displayed for ~{segment_duration:.2f}s")
        
        for i in range(images_to_use):
            # Get corresponding transition (if exists)
            transition = transitions[i] if i < len(transitions) else None
            
            seg = {
                'image': images[i % len(images)],  # Loop images if needed
                'duration': segment_duration,
                'transition_type': transition.get('transition_type', 'fade') if transition else 'none',
                'transition_duration': transition.get('transition_duration', 0.5) if transition else 0,
                'clip_file_id': transition.get('clip_file_id') if transition else None
            }
            segments.append(seg)
            trans_type = seg['transition_type']
            print(f"  Segment {i}: image={os.path.basename(seg['image'])}, duration={segment_duration:.2f}s, transition={trans_type}")
        
        print(f"📊 Total segments created: {len(segments)}")
        
        # Create temp video files - mix of image segments and actual transition clips
        # First, determine target dimensions (use 1280x720 for consistency)
        TARGET_WIDTH = 1280
        TARGET_HEIGHT = 720
        
        temp_videos = []
        transition_clips = []  # Track which videos are actual transition clips vs images
        
        for idx, segment in enumerate(segments):
            # Create video segment from image
            temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=f'_seg{idx}.mp4')
            temp_video.close()
            
            img_duration = segment['duration']
            if idx < len(segments) - 1:
                # Subtract transition duration from segment (transition overlaps)
                img_duration = max(0.1, img_duration - segment['transition_duration'])
            
            stream = ffmpeg.input(segment['image'], loop=1, t=img_duration, framerate=30)
            stream = ffmpeg.filter(stream, 'scale', w=TARGET_WIDTH, h=TARGET_HEIGHT, force_original_aspect_ratio='decrease')
            stream = ffmpeg.filter(stream, 'pad', w=TARGET_WIDTH, h=TARGET_HEIGHT, x='(ow-iw)/2', y='(oh-ih)/2', color='black')
            stream = ffmpeg.output(stream, temp_video.name, vcodec='libx264', pix_fmt='yuv420p')
            ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
            temp_videos.append(temp_video.name)
            transition_clips.append(False)
            print(f"  ✓ Image segment {idx}: {img_duration:.2f}s at {TARGET_WIDTH}x{TARGET_HEIGHT}")
            
            # If this segment has an actual transition clip, add it to the timeline
            if segment.get('clip_path') and os.path.exists(segment['clip_path']):
                print(f"  🎬 Adding extracted transition clip from original video")
                
                # Scale transition clip to match target dimensions
                temp_trans = tempfile.NamedTemporaryFile(delete=False, suffix=f'_trans{idx}.mp4')
                temp_trans.close()
                
                trans_stream = ffmpeg.input(segment['clip_path'])
                trans_stream = ffmpeg.filter(trans_stream, 'scale', w=TARGET_WIDTH, h=TARGET_HEIGHT, force_original_aspect_ratio='decrease')
                trans_stream = ffmpeg.filter(trans_stream, 'pad', w=TARGET_WIDTH, h=TARGET_HEIGHT, x='(ow-iw)/2', y='(oh-ih)/2', color='black')
                trans_stream = ffmpeg.output(trans_stream, temp_trans.name, vcodec='libx264', pix_fmt='yuv420p')
                ffmpeg.run(trans_stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
                
                temp_videos.append(temp_trans.name)
                transition_clips.append(True)
                print(f"  ✓ Transition clip {idx}: scaled to {TARGET_WIDTH}x{TARGET_HEIGHT}")
        
        # Now concatenate all videos (images + transition clips)
        print(f"🎬 Concatenating {len(temp_videos)} video segments...")
        
        if len(temp_videos) == 1:
            # Just one segment, add audio and output
            video_stream = ffmpeg.input(temp_videos[0])
            if audio_path:
                print(f"🎵 Adding audio track from: {audio_path}")
                audio_stream = ffmpeg.input(audio_path)
                output = ffmpeg.output(
                    video_stream, 
                    audio_stream, 
                    output_path, 
                    vcodec='libx264',
                    acodec='aac',
                    audio_bitrate='192k',
                    strict='experimental'
                )
            else:
                output = ffmpeg.output(video_stream, output_path, vcodec='libx264')
            ffmpeg.run(output, overwrite_output=True, capture_stdout=True, capture_stderr=True)
        else:
            # Check if we have any actual transition clips
            has_transition_clips = any(transition_clips)
            
            if has_transition_clips:
                # Simple concatenation - just stitch all videos together in order
                print("🎬 Using concat demuxer (original transition clips included)")
                
                # Create concat file list
                concat_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt')
                for video_path in temp_videos:
                    concat_file.write(f"file '{video_path}'\n")
                concat_file.close()
                
                # Use concat demuxer for lossless concatenation - concatenate video first
                concat_output = tempfile.NamedTemporaryFile(delete=False, suffix='_concat.mp4')
                concat_output.close()
                
                concat_stream = ffmpeg.input(concat_file.name, format='concat', safe=0)
                concat_video = ffmpeg.output(concat_stream, concat_output.name, c='copy')
                ffmpeg.run(concat_video, overwrite_output=True, capture_stdout=True, capture_stderr=True)
                
                print(f"  ✓ Concatenated {len(temp_videos)} video segments")
                
                # Now add audio to the concatenated video
                if audio_path:
                    print(f"🎵 Adding audio track from: {audio_path}")
                    video_input = ffmpeg.input(concat_output.name)
                    audio_input = ffmpeg.input(audio_path)
                    output = ffmpeg.output(
                        video_input,
                        audio_input,
                        output_path,
                        vcodec='copy',  # Copy video stream (already encoded)
                        acodec='aac',
                        audio_bitrate='192k',
                        shortest=None
                    )
                    ffmpeg.run(output, overwrite_output=True, capture_stdout=True, capture_stderr=True)
                    os.unlink(concat_output.name)
                else:
                    # No audio, just rename concat output
                    import shutil
                    shutil.move(concat_output.name, output_path)
                
                # Cleanup concat file
                os.unlink(concat_file.name)
            else:
                # Use xfade transitions between image segments
                print("🎬 Using xfade transitions (synthetic)")
                current_stream = ffmpeg.input(temp_videos[0])
                offset = 0
                
                for i in range(1, len(temp_videos)):
                    next_video = ffmpeg.input(temp_videos[i])
                    transition_info = segments[min(i-1, len(segments)-1)]
                    trans_type = transition_info['transition_type']
                    trans_duration = transition_info['transition_duration']
                    
                    # Get segment duration from video file
                    probe = ffmpeg.probe(temp_videos[i-1])
                    seg_duration = float(probe['streams'][0]['duration'])
                    offset += seg_duration - trans_duration
                    
                    # Map transition types to ffmpeg xfade transitions
                    xfade_map = {
                        'fade': 'fade',
                        'fadeblack': 'fadeblack',
                        'fadewhite': 'fadewhite',
                        'dissolve': 'dissolve',
                        'wipe': 'wiperight',
                        'wipeleft': 'wipeleft',
                        'wiperight': 'wiperight',
                        'wipeup': 'wipeup',
                        'wipedown': 'wipedown',
                        'slideleft': 'slideleft',
                        'slideright': 'slideright',
                        'slideup': 'slideup',
                        'slidedown': 'slidedown',
                        'zoomin': 'fadefast',
                        'zoomout': 'fadefast',
                        'original': 'fade',
                        'none': 'fade'
                    }
                    
                    xfade_transition = xfade_map.get(trans_type, 'fade')
                    print(f"  🎞️ Transition {i}: {trans_type} ({xfade_transition}) at {offset:.2f}s, duration {trans_duration:.2f}s")
                    
                    # Apply xfade filter
                    current_stream = ffmpeg.filter(
                        [current_stream, next_video],
                        'xfade',
                        transition=xfade_transition,
                        duration=trans_duration,
                        offset=offset
                    )
                
                # Add audio if provided
                if audio_path:
                    print(f"🎵 Adding audio track from: {audio_path}")
                    audio_stream = ffmpeg.input(audio_path)
                    output = ffmpeg.output(
                        current_stream, 
                        audio_stream, 
                        output_path, 
                        vcodec='libx264',
                        acodec='aac',
                        audio_bitrate='192k',
                        strict='experimental'
                    )
                else:
                    output = ffmpeg.output(current_stream, output_path, vcodec='libx264')
                
                print(f"🎬 Running FFmpeg composition...")
                ffmpeg.run(output, overwrite_output=True, capture_stdout=True, capture_stderr=True)
        
        # Cleanup temp videos
        for temp_video in temp_videos:
            try:
                os.unlink(temp_video)
            except:
                pass
        
        print(f"✅ Video composition complete: {output_path}")
        return True
        
    except ffmpeg.Error as e:
        print(f"❌ FFmpeg composition failed!")
        print(f"FFmpeg stdout: {e.stdout.decode() if e.stdout else 'N/A'}")
        print(f"FFmpeg stderr: {e.stderr.decode() if e.stderr else 'N/A'}")
        print(f"⚠️ Falling back to MoviePy for composition...")
        
        # Fallback to MoviePy
        try:
            return compose_video_with_moviepy(images, audio_path, transitions, duration, output_path)
        except Exception as fallback_error:
            print(f"❌ MoviePy fallback also failed: {fallback_error}")
            import traceback
            traceback.print_exc()
            return False
    except Exception as e:
        print(f"❌ FFmpeg composition failed: {e}")
        import traceback
        traceback.print_exc()
        return False


# --- MoviePy Fallback Composition ---
def compose_video_with_moviepy(images: list, audio_path: str, transitions: list, duration: float, output_path: str) -> bool:
    """
    Fallback video composition using MoviePy when FFmpeg fails.
    """
    try:
        from moviepy.editor import ImageClip, concatenate_videoclips, CompositeVideoClip, AudioFileClip
        from moviepy.video.fx import all as vfx
        
        print(f"🎬 Starting MoviePy composition (FFmpeg fallback)...")
        print(f"   Images: {len(images)}")
        print(f"   Transitions: {len(transitions)}")
        print(f"   Duration: {duration}s")
        
        # Auto-generate transitions if none provided
        if len(transitions) == 0 and len(images) > 1:
            segment_duration = duration / len(images)
            transitions = []
            for i in range(len(images)):
                transitions.append({
                    'timestamp': (i + 1) * segment_duration,
                    'transition_type': 'fade',
                    'transition_duration': 0.5
                })
        
        # Create clips from images
        clips = []
        last_timestamp = 0
        
        for i, image_path in enumerate(images):
            if i < len(transitions):
                timestamp = transitions[i]['timestamp']
                clip_duration = timestamp - last_timestamp
                last_timestamp = timestamp
            else:
                clip_duration = duration - last_timestamp
            
            if clip_duration > 0:
                clip = ImageClip(image_path).set_duration(clip_duration)
                clip = clip.resize(height=720)  # Standardize size
                clips.append(clip)
        
        # Concatenate with crossfade transitions
        if len(clips) > 1:
            transition_duration = transitions[0].get('transition_duration', 0.5) if transitions else 0.5
            final_clip = concatenate_videoclips(clips, method="compose", padding=-transition_duration)
        else:
            final_clip = clips[0]
        
        # Add audio if provided
        if audio_path:
            audio = AudioFileClip(audio_path)
            final_clip = final_clip.set_audio(audio)
        
        # Write output
        final_clip.write_videofile(
            output_path,
            fps=30,
            codec='libx264',
            audio_codec='aac' if audio_path else None,
            logger=None
        )
        
        print(f"✅ MoviePy composition complete: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ MoviePy composition failed: {e}")
        import traceback
        traceback.print_exc()
        return False
