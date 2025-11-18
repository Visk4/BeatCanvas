import React, { useState, useEffect, useRef } from "react";
import { base44 } from "../../api/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import TemplateSelector from "../../components/composer/TemplateSelector";
import ContentUploader from "../../components/composer/ContentUploader";
import BeatDetector from "../../components/composer/BeatDetector";
import TransitionCorrelation from "../../components/composer/TransitionCorrelation";
import VideoPreview from "../../components/composer/VideoPreview";
import ExportControls from "../../components/composer/ExportControls";
import TimelineEditor from "../../components/composer/TimelineEditor";
import UserProfile from "../../components/UserProfile";
import "../styles/VideoEditor.css";
import "../styles/Dashboard.css";

export default function Composer() {
    const [searchParams] = useSearchParams();
    const templateId = searchParams.get('templateId');

    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [uploadedContent, setUploadedContent] = useState({
        images: [],
        imageFiles: [],
        video: null,
        videoFile: null,
        audio: null,
        audioFile: null
    });
    const [beatAnalysis, setBeatAnalysis] = useState(null);
    const [isComposing, setIsComposing] = useState(false);
    const [composedVideoUrl, setComposedVideoUrl] = useState(null);
    const [optimizedTemplate, setOptimizedTemplate] = useState(null);
    const [editedTemplate, setEditedTemplate] = useState(null);

    // VideoEditor-style state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [selectedSegment, setSelectedSegment] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [segments, setSegments] = useState([]);

    const audioRef = useRef(null);
    const timelineRef = useRef(null);
    const fileInputRef = useRef(null);

    const { data: analyses } = useQuery({
        queryKey: ['completed-analyses'],
        queryFn: async () => {
            const all = await base44.entities.VideoAnalysis.list('-created_date', 50);
            return all.filter(a => a.analysis_status === 'completed' && a.transitions?.length > 0);
        },
        initialData: [],
    });

    // Auto-select template if templateId is in URL
    useEffect(() => {
        if (templateId && analyses && analyses.length > 0 && !selectedTemplate) {
            const template = analyses.find(a => a.id === templateId);
            if (template) {
                setSelectedTemplate(template);
            }
        }
    }, [templateId, analyses, selectedTemplate]);

    const requiredImages = selectedTemplate ? selectedTemplate.transitions.length + 1 : 0;
    const activeTemplate = editedTemplate || optimizedTemplate || selectedTemplate;
    const duration = activeTemplate?.duration || beatAnalysis?.duration || 20;

    // Create segments from template and uploaded content
    useEffect(() => {
        if (!activeTemplate) return;

        const newSegments = activeTemplate.transitions.map((t, i) => {
            const nextTransition = activeTemplate.transitions[i + 1];
            const start = t.timestamp;
            const end = nextTransition ? nextTransition.timestamp : (activeTemplate.duration || start + 2);
            const imageUrl = uploadedContent.images[i] || null;

            return {
                id: `seg-${i}`,
                name: `Clip ${i + 1}`,
                start: start,
                end: end,
                duration: end - start,
                color: ["#4a90e2", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"][i % 5],
                imageUrl: imageUrl,
                type: "image",
                transition: {
                    type: t.transition_type || t.type || 'fade',
                    duration: t.transition_duration || 0.5
                }
            };
        });

        setSegments(newSegments);
    }, [activeTemplate, uploadedContent.images]);

    // Audio playback controls
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);

        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        audio.addEventListener("ended", onEnded);

        return () => {
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("pause", onPause);
            audio.removeEventListener("ended", onEnded);
        };
    }, [uploadedContent.audio]);

    const handleApplySuggestions = (suggestions) => {
        const optimized = {
            ...selectedTemplate,
            transitions: selectedTemplate.transitions.map((t, index) => ({
                ...t,
                timestamp: suggestions[index]?.suggestedTimestamp || t.timestamp,
                syncedWithBeat: true
            }))
        };
        setOptimizedTemplate(optimized);
    };

    const handleSegmentsChange = (segments) => {
        // Update template with transition settings from Timeline Editor
        const baseTemplate = optimizedTemplate || selectedTemplate;
        if (!baseTemplate) return;

        const updatedTransitions = baseTemplate.transitions.map((t, index) => {
            const segment = segments[index];
            return {
                ...t,
                transition_type: segment?.transition?.type || t.transition_type || 'fade',
                transition_duration: segment?.transition?.duration || t.transition_duration || 0.5
            };
        });

        setEditedTemplate({
            ...baseTemplate,
            transitions: updatedTransitions
        });
    };

    // VideoEditor-style functions
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
        if (!timelineRef.current || !activeTemplate?.duration) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickedTime = (x / rect.width) * activeTemplate.duration;
        if (audioRef.current) {
            audioRef.current.currentTime = clickedTime;
            setCurrentTime(clickedTime);
        }
    };

    const handleAddClip = () => fileInputRef.current?.click();

    const handleMediaUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileURL = URL.createObjectURL(file);
        const isImage = file.type.startsWith("image");

        if (isImage) {
            // Add to uploaded content
            setUploadedContent(prev => ({
                ...prev,
                images: [...prev.images, fileURL],
                imageFiles: [...prev.imageFiles, file]
            }));
        }
        e.target.value = "";
    };

    const deleteSegment = () => {
        if (!selectedSegment) return;
        const segIndex = segments.findIndex(s => s.id === selectedSegment);
        if (segIndex === -1) return;

        // Remove from uploaded content
        setUploadedContent(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== segIndex),
            imageFiles: prev.imageFiles.filter((_, i) => i !== segIndex)
        }));
        setSelectedSegment(null);
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
            {/* Navbar */}
            <nav className="editor-navbar">
                <h2 className="editor-title">🎬 Beat Canvas Composer</h2>
                <div className="nav-actions">
                    <UserProfile />
                    <Link to="/dashboard">
                        <button className="btn-outline">🔙 Dashboard</button>
                    </Link>
                </div>
            </nav>

            <div className="editor-workspace">
                {/* Sidebar */}
                <aside className="editor-sidebar">
                    <h3 className="sidebar-title">Template</h3>
                    <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#888' }}>
                        {selectedTemplate ? (
                            <div>
                                <div style={{ color: '#4a90e2', marginBottom: '0.5rem' }}>
                                    ✓ {selectedTemplate.video_name?.substring(0, 20) || 'Template Selected'}
                                </div>
                                <div style={{ fontSize: '0.75rem' }}>
                                    {selectedTemplate.transitions?.length || 0} transitions
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: '#666' }}>No template selected</div>
                        )}
                    </div>

                    <div className="divider"></div>

                    <h3 className="sidebar-title">Tools</h3>
                    <button className="tool-btn" onClick={handleAddClip}>
                        ➕ Add Media
                    </button>
                    <button
                        className="action-btn"
                        onClick={deleteSegment}
                        disabled={!selectedSegment}
                        style={{ opacity: selectedSegment ? 1 : 0.5 }}
                    >
                        🗑 Delete Clip
                    </button>

                    <div className="divider"></div>

                    <h3 className="sidebar-title">Zoom</h3>
                    <div className="zoom-controls">
                        <button className="zoom-btn" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>−</button>
                        <span className="zoom-text">{Math.round(zoom * 100)}%</span>
                        <button className="zoom-btn" onClick={() => setZoom(Math.min(3, zoom + 0.25))}>+</button>
                    </div>

                    <div className="divider"></div>

                    <h3 className="sidebar-title">Content</h3>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                        <div>Images: {uploadedContent.images.length}/{requiredImages}</div>
                        <div>Audio: {uploadedContent.audio ? '✓' : '✗'}</div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        style={{ display: "none" }}
                        onChange={handleMediaUpload}
                    />
                </aside>

                {/* Main Content */}
                <main className="editor-main">
                    {/* Preview Section */}
                    <section className="preview-section">
                        <div className="preview-box">
                            <div className="preview-content">
                                {selectedSegment && segments.find(s => s.id === selectedSegment)?.imageUrl ? (
                                    <img
                                        src={segments.find(s => s.id === selectedSegment)?.imageUrl}
                                        alt="Preview"
                                        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }}
                                    />
                                ) : composedVideoUrl ? (
                                    <video src={composedVideoUrl} controls style={{ width: "100%", borderRadius: 10 }} />
                                ) : (
                                    <>
                                        <div className="waveform">🎬</div>
                                        <p className="preview-text">Video Composer</p>
                                        <p className="preview-subtext">
                                            {selectedSegment
                                                ? `Selected: ${segments.find(s => s.id === selectedSegment)?.name}`
                                                : selectedTemplate
                                                    ? "Upload content to start composing"
                                                    : "Select a template to begin"}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Audio Controls */}
                        <div className="controls">
                            <audio ref={audioRef} src={uploadedContent.audio || beatAnalysis?.audio_url}></audio>
                            <button className="ctrl-btn" onClick={() => {
                                if (audioRef.current) {
                                    audioRef.current.currentTime = 0;
                                    setCurrentTime(0);
                                }
                            }}>⏮</button>
                            <button className="btn-play" onClick={togglePlay}>
                                {isPlaying ? "⏸" : "▶"}
                            </button>
                            <button className="ctrl-btn" onClick={() => {
                                if (audioRef.current) {
                                    audioRef.current.currentTime = duration;
                                    setCurrentTime(duration);
                                }
                            }}>⏭</button>
                            <span className="time-display">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>
                    </section>

                    {/* Timeline Section */}
                    <section className="timeline-section">
                        <div className="timeline-header">
                            <h3 className="timeline-title">Timeline</h3>
                            <div className="timeline-info">
                                {selectedSegment && (
                                    <span className="selected-info">
                                        ✓ {segments.find(s => s.id === selectedSegment)?.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div
                            ref={timelineRef}
                            className="timeline-container"
                            onClick={handleTimelineClick}
                        >
                            {/* Ruler */}
                            <div className="timeline-ruler">
                                {[...Array(11)].map((_, i) => (
                                    <div key={i} className="ruler-mark">
                                        <span className="ruler-label">
                                            {formatTime((duration / 10) * i)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Timeline Track */}
                            <div
                                className="timeline-track"
                                style={{
                                    transform: `scaleX(${zoom})`,
                                    transformOrigin: "left center"
                                }}
                            >
                                {/* Segments */}
                                {segments.map((segment) => {
                                    const left = (segment.start / (duration || 1)) * 100;
                                    const width = ((segment.end - segment.start) / (duration || 1)) * 100;
                                    return (
                                        <div
                                            key={segment.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSegment(segment.id);
                                            }}
                                            className={`segment ${selectedSegment === segment.id ? "selected" : ""}`}
                                            style={{
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                backgroundColor: segment.color,
                                            }}
                                        >
                                            {segment.imageUrl ? (
                                                <div className="segment-media-preview">
                                                    <img src={segment.imageUrl} alt="" />
                                                </div>
                                            ) : (
                                                <span className="segment-name">{segment.name}</span>
                                            )}
                                            <div className="segment-times">
                                                {formatTime(segment.start)} - {formatTime(segment.end)}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Playhead */}
                                <div
                                    className="playhead"
                                    style={{
                                        left: `${Math.max(0, Math.min((currentTime / (duration || 1)) * 100, 100))}%`
                                    }}
                                >
                                    <div className="playhead-line"></div>
                                    <div className="playhead-top"></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Template Selector & Content Upload - Collapsible */}
                    {!selectedTemplate && (
                        <section style={{ padding: '2rem', borderTop: '1px solid #2a2a2a' }}>
                            <TemplateSelector
                                analyses={analyses}
                                selectedTemplate={selectedTemplate}
                                onSelectTemplate={setSelectedTemplate}
                            />
                        </section>
                    )}

                    {selectedTemplate && (
                        <section style={{ padding: '2rem', borderTop: '1px solid #2a2a2a' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <ContentUploader
                                    requiredImages={requiredImages}
                                    uploadedContent={uploadedContent}
                                    onContentChange={setUploadedContent}
                                />

                                <BeatDetector
                                    template={selectedTemplate}
                                    onBeatsDetected={(analysis) => {
                                        setBeatAnalysis(analysis);
                                        setUploadedContent(prev => ({
                                            ...prev,
                                            audio: analysis.audio_url,
                                            audioFile: prev.audioFile
                                        }));
                                    }}
                                    onAudioFileChange={(file) => {
                                        setUploadedContent(prev => ({ ...prev, audioFile: file }));
                                    }}
                                />
                            </div>

                            {/* Transition Correlation */}
                            {beatAnalysis && (
                                <TransitionCorrelation
                                    template={selectedTemplate}
                                    beatAnalysis={beatAnalysis}
                                    onApplySuggestions={handleApplySuggestions}
                                />
                            )}

                            {/* Timeline Editor with Transition Controls */}
                            {activeTemplate && (
                                <div style={{ marginTop: '20px' }}>
                                    <TimelineEditor
                                        template={activeTemplate}
                                        content={uploadedContent}
                                        onSegmentsChange={handleSegmentsChange}
                                    />
                                </div>
                            )}

                            {/* Export Controls */}
                            {activeTemplate && (uploadedContent.images.length === requiredImages || uploadedContent.video) && (
                                <div style={{ marginTop: '20px' }}>
                                    <ExportControls
                                        template={activeTemplate}
                                        content={uploadedContent}
                                        beatAnalysis={beatAnalysis}
                                        onComposeStart={() => setIsComposing(true)}
                                        onComposeEnd={(videoUrl) => {
                                            setComposedVideoUrl(videoUrl);
                                            setIsComposing(false);
                                        }}
                                        composedVideoUrl={composedVideoUrl}
                                        isComposing={isComposing}
                                    />
                                </div>
                            )}
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}
