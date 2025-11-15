import React, { useState, useRef, useEffect } from "react";
import "../styles/VideoEditor.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function VideoEditor() {
    const location = useLocation();
    const navigate = useNavigate();
    const { beats = [], duration = 20, tempo = null, photos = {}, audioURL = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_cadf26aaf0.mp3" } = location.state || {};

    const audioRef = useRef(null);
    const timelineRef = useRef(null);
    const fileInputRef = useRef(null);
    const audioInputRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [safeDuration, setSafeDuration] = useState(duration || 20);
    const [selectedSegment, setSelectedSegment] = useState(null);
    const [draggedSegment, setDraggedSegment] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [segPhotoPool, setSegPhotoPool] = useState(photos || {});
    const [segments, setSegments] = useState(() => {
        if (beats.length) {
            return beats.map((b, i) => ({
                id: Date.now() + i,
                name: `Clip ${i + 1}`,
                start: Number(b),
                end: Number(beats[i + 1] ?? Math.min(Number(b) + 1.5, duration || Number(b) + 1.5)),
                color: ["#4a90e2", "#e74c3c", "#2ecc71", "#f39c12"][i % 4],
                type: "image",
                file: segPhotoPool[i] || null,
            }));
        }
        return [
            { id: 1, name: "Intro", start: 0, end: 5, color: "#4a90e2", file: null, type: "image" },
            { id: 2, name: "Main", start: 5, end: 15, color: "#e74c3c", file: null, type: "image" },
            { id: 3, name: "Outro", start: 15, end: 20, color: "#2ecc71", file: null, type: "image" },
        ];
    });

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onLoaded = () => {
            const d = Number.isFinite(audio.duration) ? audio.duration : safeDuration;
            setSafeDuration(d || safeDuration);
        };
        const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);

        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        audio.addEventListener("ended", onEnded);
        if (audio.readyState >= 1) onLoaded();
        return () => {
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("pause", onPause);
            audio.removeEventListener("ended", onEnded);
        };
    }, [audioURL]);

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            await audio.play();
            setIsPlaying(true);
        } else {
            audio.pause();
            setIsPlaying(false);
        }
    };

    const handleTimelineClick = (e) => {
        if (!timelineRef.current || safeDuration <= 0) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clampedX = Math.max(0, Math.min(x, rect.width));
        const clickedTime = (clampedX / rect.width) * safeDuration;
        audioRef.current.currentTime = clickedTime;
        setCurrentTime(clickedTime);
    };

    const handleDragStart = (e, segment) => {
        setDraggedSegment(segment);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = (e) => {
        e.preventDefault();
        if (!draggedSegment || !timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newStart = Math.max(0, (x / rect.width) * safeDuration);
        const segDur = draggedSegment.end - draggedSegment.start;
        const newEnd = Math.min(safeDuration, newStart + segDur);
        setSegments((prev) => prev.map((s) => (s.id === draggedSegment.id ? { ...s, start: newStart, end: newEnd } : s)));
        setDraggedSegment(null);
    };

    const splitSegment = () => {
        if (!selectedSegment) return;
        const seg = segments.find((s) => s.id === selectedSegment);
        if (!seg) return;
        const splitAt = (seg.start + seg.end) / 2;
        const newSeg = { id: Date.now(), name: `${seg.name} (2)`, start: splitAt, end: seg.end, color: seg.color, file: seg.file, type: seg.type };
        setSegments((prev) => [...prev.map((s) => (s.id === selectedSegment ? { ...s, end: splitAt } : s)), newSeg].sort((a, b) => a.start - b.start));
        setSelectedSegment(null);
    };

    const deleteSegment = () => {
        if (!selectedSegment) return;
        setSegments((prev) => prev.filter((s) => s.id !== selectedSegment));
        setSelectedSegment(null);
    };

    const handleAddClip = () => fileInputRef.current?.click();

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fileURL = URL.createObjectURL(file);
        const isImage = file.type.startsWith("image");
        const start = Math.min(currentTime, safeDuration);
        if (isImage) {
            const newSeg = { id: Date.now(), name: file.name, start, end: Math.min(start + 3, safeDuration + 3), color: "#" + Math.floor(Math.random() * 16777215).toString(16), file: fileURL, type: "image" };
            setSegments((prev) => [...prev, newSeg]);
            e.target.value = "";
        } else {
            const tempVideo = document.createElement("video");
            tempVideo.src = fileURL;
            tempVideo.preload = "metadata";
            tempVideo.onloadedmetadata = () => {
                const vidDuration = tempVideo.duration || 5;
                const newSeg = { id: Date.now(), name: file.name, start, end: Math.min(start + vidDuration, safeDuration + vidDuration), color: "#" + Math.floor(Math.random() * 16777215).toString(16), file: fileURL, type: "video" };
                setSegments((prev) => [...prev, newSeg]);
                e.target.value = "";
            };
        }
    };

    const handleAudioUploadClick = () => audioInputRef.current?.click();
    const handleAudioFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
        audioRef.current.src = url;
        e.target.value = "";
    };

    const formatTime = (time) => {
        if (!Number.isFinite(time) || time <= 0) return "0:00.0";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 10);
        return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
    };

    return (
        <div className="editor-container">
            <nav className="editor-navbar">
                <h2 className="editor-title">Beat Canvas Editor</h2>
                <div className="nav-actions">
                    <button className="btn-outline" onClick={handleAudioUploadClick}>🎵 Upload Audio</button>
                    <button className="btn-outline" onClick={() => navigate(-1)}>🔙 Back</button>
                </div>
            </nav>

            <div className="editor-workspace">
                <aside className="editor-sidebar">
                    <h3 className="sidebar-title">Tools</h3>
                    <button className={`tool-btn ${!selectedSegment ? "active" : ""}`} onClick={() => setSelectedSegment(null)}>⬚ Select</button>
                    <button className="tool-btn" onClick={handleAddClip}>➕ Add Clip</button>
                    <div className="divider"></div>
                    <h3 className="sidebar-title">Actions</h3>
                    <button className="action-btn" onClick={splitSegment} disabled={!selectedSegment}>⚡ Split</button>
                    <button className="action-btn" onClick={deleteSegment} disabled={!selectedSegment}>🗑 Delete</button>
                    <div className="divider"></div>
                    <h3 className="sidebar-title">Zoom</h3>
                    <div className="zoom-controls">
                        <button className="zoom-btn" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>−</button>
                        <span className="zoom-text">{Math.round(zoom * 100)}%</span>
                        <button className="zoom-btn" onClick={() => setZoom(Math.min(3, zoom + 0.25))}>+</button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="video/*,image/*" style={{ display: "none" }} onChange={handleVideoUpload} />
                    <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleAudioFileUpload} />
                </aside>

                <main className="editor-main">
                    <section className="preview-section">
                        <div className="preview-box">
                            <div className="preview-content">
                                {selectedSegment && segments.find((s) => s.id === selectedSegment)?.file ? (
                                    segments.find((s) => s.id === selectedSegment)?.type === "image" ? (
                                        <img src={segments.find((s) => s.id === selectedSegment)?.file} alt="Preview" style={{ width: "100%", borderRadius: 10 }} />
                                    ) : (
                                        <video src={segments.find((s) => s.id === selectedSegment)?.file} width="100%" height="auto" controls />
                                    )
                                ) : (
                                    <>
                                        <div className="waveform">🎧</div>
                                        <p className="preview-text">Preview Window</p>
                                        <p className="preview-subtext">{selectedSegment ? `Selected: ${segments.find((s) => s.id === selectedSegment)?.name}` : "Select or upload a clip"}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="controls">
                            <audio ref={audioRef} src={audioURL}></audio>
                            <button className="ctrl-btn" onClick={() => { audioRef.current.currentTime = 0; setCurrentTime(0); }}>⏮</button>
                            <button className="btn-play" onClick={togglePlay}>{isPlaying ? "⏸" : "▶"}</button>
                            <button className="ctrl-btn" onClick={() => { audioRef.current.currentTime = safeDuration; setCurrentTime(safeDuration); }}>⏭</button>
                            <span className="time-display">{formatTime(currentTime)} / {formatTime(safeDuration)}</span>
                        </div>
                    </section>

                    <section className="timeline-section">
                        <div className="timeline-header">
                            <h3 className="timeline-title">Timeline</h3>
                            <div className="timeline-info">
                                {selectedSegment && (
                                    <span className="selected-info">✓ {segments.find((s) => s.id === selectedSegment)?.name}</span>
                                )}
                            </div>
                        </div>

                        <div ref={timelineRef} className="timeline-container" onClick={handleTimelineClick} onDragOver={handleDragOver} onDrop={handleDrop}>
                            <div className="timeline-ruler">
                                {[...Array(11)].map((_, i) => (
                                    <div key={i} className="ruler-mark">
                                        <span className="ruler-label">{formatTime((safeDuration / 10) * i)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="timeline-track" style={{ transform: `scaleX(${zoom})`, transformOrigin: "left center" }}>
                                {segments.map((segment) => {
                                    const left = (segment.start / (safeDuration || 1)) * 100;
                                    const width = ((segment.end - segment.start) / (safeDuration || 1)) * 100;
                                    return (
                                        <div
                                            key={segment.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, segment)}
                                            onClick={(e) => { e.stopPropagation(); setSelectedSegment(segment.id); }}
                                            className={`segment ${selectedSegment === segment.id ? "selected" : ""}`}
                                            style={{ left: `${left}%`, width: `${width}%`, backgroundColor: segment.color, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >
                                            {segment.file ? (
                                                segment.type === "image" ? (
                                                    <img src={segment.file} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
                                                ) : (
                                                    <video src={segment.file} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} muted loop playsInline />
                                                )
                                            ) : (
                                                <span className="segment-name">{segment.name}</span>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="playhead" style={{ left: `${Math.max(0, Math.min((currentTime / (safeDuration || 1)) * 100, 100))}%` }}>
                                    <div className="playhead-line"></div>
                                    <div className="playhead-top"></div>
                                </div>
                            </div>
                        </div>

                        <div className="track-labels">
                            <div className="track-label">🎵 Audio Track</div>
                            <div className="track-label">🎬 Video Track</div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
