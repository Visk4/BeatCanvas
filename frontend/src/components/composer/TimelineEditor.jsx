import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

const TRANSITION_TYPES = [
    { id: 'fade', name: 'Fade', icon: '🌫️' },
    { id: 'slide-left', name: 'Slide Left', icon: '⬅️' },
    { id: 'slide-right', name: 'Slide Right', icon: '➡️' },
    { id: 'slide-up', name: 'Slide Up', icon: '⬆️' },
    { id: 'slide-down', name: 'Slide Down', icon: '⬇️' },
    { id: 'zoom-in', name: 'Zoom In', icon: '🔍' },
    { id: 'zoom-out', name: 'Zoom Out', icon: '🔎' },
    { id: 'dissolve', name: 'Dissolve', icon: '✨' },
    { id: 'wipe', name: 'Wipe', icon: '🧹' },
    { id: 'none', name: 'Cut (No Transition)', icon: '✂️' }
];

export default function TimelineEditor({ template, content, onSegmentsChange }) {
    const [segments, setSegments] = useState([]);
    const [selectedSegment, setSelectedSegment] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [showTransitionEditor, setShowTransitionEditor] = useState(false);
    const timelineRef = useRef(null);
    const audioRef = useRef(null);

    const duration = template?.duration || 20;

    // Initialize segments from template transitions
    useEffect(() => {
        if (template && template.transitions && segments.length === 0) {
            const initialSegments = template.transitions.map((t, i) => ({
                id: `seg-${i}`,
                name: `Clip ${i + 1}`,
                start: t.timestamp,
                end: template.transitions[i + 1]?.timestamp || duration,
                color: ['#667eea', '#764ba2', '#f093fb', '#43e97b'][i % 4],
                type: 'image',
                file: content.images[i] || null,
                transition: {
                    type: t.transition_type || 'fade',
                    duration: t.transition_duration || 0.5
                }
            }));
            setSegments(initialSegments);
        }
    }, [template, content.images, duration, segments.length]);

    // Update segments when content changes
    useEffect(() => {
        if (content.images.length > 0) {
            setSegments(prev => prev.map((seg, i) => ({
                ...seg,
                file: content.images[i] || seg.file
            })));
        }
    }, [content.images]);

    // Notify parent of segment changes
    useEffect(() => {
        if (onSegmentsChange) {
            onSegmentsChange(segments);
        }
    }, [segments, onSegmentsChange]);

    // Audio playback controls
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !content.audio) return;

        const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
        };
    }, [content.audio]);

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            await audio.play();
        } else {
            audio.pause();
        }
    };

    const handleTimelineClick = (e) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickedTime = (x / rect.width) * duration;
        if (audioRef.current) {
            audioRef.current.currentTime = clickedTime;
        }
        setCurrentTime(clickedTime);
    };

    const formatTime = (time) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 10);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    };

    const updateSegmentTransition = (segmentId, transitionType, transitionDuration) => {
        setSegments(prev => prev.map(seg =>
            seg.id === segmentId
                ? { ...seg, transition: { type: transitionType, duration: transitionDuration } }
                : seg
        ));
    };

    const selectedSegmentData = segments.find(s => s.id === selectedSegment);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '20px'
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    color: '#e5e7eb',
                    margin: 0
                }}>
                    Timeline Editor
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        fontSize: '13px',
                        color: '#9ca3af',
                        fontFamily: 'monospace'
                    }}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                            style={{
                                padding: '6px 10px',
                                backgroundColor: '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#e5e7eb',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            −
                        </button>
                        <span style={{ fontSize: '12px', color: '#9ca3af', minWidth: '50px', textAlign: 'center' }}>
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                            style={{
                                padding: '6px 10px',
                                backgroundColor: '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#e5e7eb',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* Transition Editor Panel */}
            {selectedSegment && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                        backgroundColor: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '20px'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            color: '#e5e7eb',
                            margin: 0
                        }}>
                            🎬 Transition Settings
                        </h4>
                        <button
                            onClick={() => setSelectedSegment(null)}
                            style={{
                                padding: '4px 8px',
                                backgroundColor: '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{
                        fontSize: '13px',
                        color: '#9ca3af',
                        marginBottom: '15px'
                    }}>
                        Editing transition for <strong style={{ color: '#a78bfa' }}>{selectedSegmentData?.name}</strong>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 200px',
                        gap: '20px'
                    }}>
                        {/* Transition Type Selector */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: '#d1d5db',
                                marginBottom: '10px'
                            }}>
                                Transition Type
                            </label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: '8px'
                            }}>
                                {TRANSITION_TYPES.map(transition => {
                                    const isActive = selectedSegmentData?.transition?.type === transition.id;
                                    return (
                                        <button
                                            key={transition.id}
                                            onClick={() => updateSegmentTransition(
                                                selectedSegment,
                                                transition.id,
                                                selectedSegmentData?.transition?.duration || 0.5
                                            )}
                                            style={{
                                                padding: '10px 12px',
                                                backgroundColor: isActive ? '#667eea' : '#374151',
                                                border: isActive ? '2px solid #a78bfa' : '1px solid #4b5563',
                                                borderRadius: '6px',
                                                color: '#e5e7eb',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s',
                                                transform: isActive ? 'scale(1.02)' : 'scale(1)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) e.currentTarget.style.backgroundColor = '#4b5563';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) e.currentTarget.style.backgroundColor = '#374151';
                                            }}
                                        >
                                            <span>{transition.icon}</span>
                                            <span>{transition.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Transition Duration */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: '#d1d5db',
                                marginBottom: '10px'
                            }}>
                                Duration
                            </label>
                            <div style={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '6px',
                                padding: '15px'
                            }}>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: '#a78bfa',
                                    textAlign: 'center',
                                    marginBottom: '10px'
                                }}>
                                    {selectedSegmentData?.transition?.duration?.toFixed(2)}s
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="2"
                                    step="0.1"
                                    value={selectedSegmentData?.transition?.duration || 0.5}
                                    onChange={(e) => updateSegmentTransition(
                                        selectedSegment,
                                        selectedSegmentData?.transition?.type || 'fade',
                                        parseFloat(e.target.value)
                                    )}
                                    style={{
                                        width: '100%',
                                        accentColor: '#667eea',
                                        cursor: 'pointer'
                                    }}
                                />
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '10px',
                                    color: '#6b7280',
                                    marginTop: '5px'
                                }}>
                                    <span>0.1s</span>
                                    <span>2.0s</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Description */}
                    <div style={{
                        marginTop: '15px',
                        padding: '12px',
                        backgroundColor: '#1f2937',
                        borderRadius: '6px',
                        border: '1px solid #374151'
                    }}>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            <strong style={{ color: '#a78bfa' }}>Preview: </strong>
                            {(() => {
                                const type = selectedSegmentData?.transition?.type;
                                switch (type) {
                                    case 'fade': return 'Smooth opacity transition between clips';
                                    case 'slide-left': return 'Next clip slides in from right';
                                    case 'slide-right': return 'Next clip slides in from left';
                                    case 'slide-up': return 'Next clip slides in from bottom';
                                    case 'slide-down': return 'Next clip slides in from top';
                                    case 'zoom-in': return 'Current clip zooms in, revealing next';
                                    case 'zoom-out': return 'Current clip zooms out to next';
                                    case 'dissolve': return 'Gradual pixel-by-pixel blend';
                                    case 'wipe': return 'Linear reveal of next clip';
                                    case 'none': return 'Instant cut with no transition';
                                    default: return 'Select a transition type';
                                }
                            })()}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Preview Window */}
            <div style={{
                backgroundColor: '#111827',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
                minHeight: '250px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: selectedSegment ? '2px solid #667eea' : '1px solid #374151',
                transition: 'border 0.2s'
            }}>
                {selectedSegment ? (
                    (() => {
                        const segment = segments.find(s => s.id === selectedSegment);
                        return segment?.file ? (
                            <div style={{ width: '100%', textAlign: 'center' }}>
                                <img
                                    src={segment.file}
                                    alt="Preview"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '350px',
                                        borderRadius: '8px',
                                        objectFit: 'contain',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                    }}
                                />
                                <div style={{
                                    marginTop: '15px',
                                    fontSize: '14px',
                                    color: '#9ca3af',
                                    fontWeight: '500'
                                }}>
                                    {segment.name} • {formatTime(segment.start)} - {formatTime(segment.end)}
                                </div>
                                <div style={{
                                    marginTop: '8px',
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}>
                                    <span>Transition: </span>
                                    <span style={{
                                        color: '#a78bfa',
                                        fontWeight: '600',
                                        backgroundColor: '#374151',
                                        padding: '2px 8px',
                                        borderRadius: '4px'
                                    }}>
                                        {TRANSITION_TYPES.find(t => t.id === segment.transition?.type)?.name || 'Fade'}
                                    </span>
                                    <span>({segment.transition?.duration || 0.5}s)</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                                <div style={{ fontSize: '64px', marginBottom: '15px' }}>📷</div>
                                <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '5px' }}>{segment?.name}</p>
                                <p style={{ fontSize: '13px', color: '#6b7280' }}>
                                    {formatTime(segment?.start || 0)} - {formatTime(segment?.end || 0)}
                                </p>
                                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>
                                    Upload an image to preview
                                </p>
                            </div>
                        );
                    })()
                ) : (
                    <div style={{ textAlign: 'center', color: '#6b7280' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎬</div>
                        <p style={{ fontSize: '15px', color: '#9ca3af' }}>Click on a timeline segment to preview</p>
                        {segments.length > 0 && (
                            <p style={{ fontSize: '12px', marginTop: '5px' }}>
                                {segments.length} segments available
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Playback Controls */}
            {content.audio && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '15px',
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#111827',
                    borderRadius: '8px'
                }}>
                    <audio ref={audioRef} src={content.audio} />
                    <button
                        onClick={() => {
                            if (audioRef.current) audioRef.current.currentTime = 0;
                            setCurrentTime(0);
                        }}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#e5e7eb',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        ⏮
                    </button>
                    <button
                        onClick={togglePlay}
                        style={{
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '18px',
                            fontWeight: '600'
                        }}
                    >
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button
                        onClick={() => {
                            if (audioRef.current) audioRef.current.currentTime = duration;
                            setCurrentTime(duration);
                        }}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#e5e7eb',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        ⏭
                    </button>
                </div>
            )}

            {/* Timeline */}
            <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                style={{
                    position: 'relative',
                    height: '100px',
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer'
                }}
            >
                {/* Time markers */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0 5px',
                    fontSize: '10px',
                    color: '#6b7280'
                }}>
                    {[...Array(11)].map((_, i) => (
                        <span key={i}>{formatTime((duration / 10) * i)}</span>
                    ))}
                </div>

                {/* Segments */}
                <div style={{
                    position: 'absolute',
                    top: '25px',
                    left: 0,
                    width: '100%',
                    height: '60px',
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        transform: `scaleX(${zoom})`,
                        transformOrigin: 'left center',
                        pointerEvents: 'auto'
                    }}>
                        {segments.map(segment => {
                            const left = (segment.start / duration) * 100;
                            const width = ((segment.end - segment.start) / duration) * 100;
                            const isSelected = selectedSegment === segment.id;
                            return (
                                <div
                                    key={segment.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSegment(segment.id);
                                        console.log('Segment clicked:', segment.name, segment.id);
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        height: '100%',
                                        backgroundColor: segment.color,
                                        border: isSelected ? '3px solid white' : '1px solid rgba(0,0,0,0.3)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        boxShadow: isSelected ? '0 4px 12px rgba(255,255,255,0.3)' : 'none',
                                        transform: isSelected ? 'translateY(-2px)' : 'translateY(0)'
                                    }}
                                >
                                    {segment.file ? (
                                        <img
                                            src={segment.file}
                                            alt={segment.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                opacity: 0.7
                                            }}
                                        />
                                    ) : (
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            color: 'white',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                        }}>
                                            {segment.name}
                                        </span>
                                    )}

                                    {/* Transition indicator */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '2px',
                                        right: '2px',
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        padding: '2px 5px',
                                        borderRadius: '3px',
                                        fontSize: '9px',
                                        color: '#a78bfa',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}>
                                        <span>{TRANSITION_TYPES.find(t => t.id === segment.transition?.type)?.icon || '🌫️'}</span>
                                        <span>{segment.transition?.duration?.toFixed(1)}s</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Playhead */}
                <div style={{
                    position: 'absolute',
                    left: `${(currentTime / duration) * 100}%`,
                    top: '20px',
                    width: '2px',
                    height: 'calc(100% - 20px)',
                    backgroundColor: '#f87171',
                    zIndex: 10,
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '-5px',
                        left: '-5px',
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#f87171',
                        borderRadius: '50%',
                        border: '2px solid white'
                    }} />
                </div>
            </div>

            <div style={{
                marginTop: '10px',
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center'
            }}>
                {selectedSegment ? (
                    <span style={{ color: '#a78bfa', fontWeight: '500' }}>
                        ✓ Selected: {segments.find(s => s.id === selectedSegment)?.name}
                    </span>
                ) : segments.length > 0 ? (
                    'Click on timeline segments to select and preview'
                ) : (
                    'Waiting for template data...'
                )}
            </div>
        </motion.div>
    );
}
