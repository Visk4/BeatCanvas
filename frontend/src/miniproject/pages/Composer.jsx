import React, { useState, useEffect, useRef } from "react";
import { base44 } from "../../api/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import TemplateSelector from "../../components/composer/TemplateSelector";
import ContentUploader from "../../components/composer/ContentUploader";
import BeatDetector from "../../components/composer/BeatDetector";
import TransitionCorrelation from "../../components/composer/TransitionCorrelation";
import VideoPreview from "../../components/composer/VideoPreview";
import ExportControls from "../../components/composer/ExportControls";
import TimelineEditor from "../../components/composer/TimelineEditor";
import UserProfile from "../../components/UserProfile";
import PillNav from "../../components/PillNav";
import "../styles/VideoEditor.css";
import "../styles/Dashboard.css";

export default function Composer() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const templateId = searchParams.get('templateId');

    // Get beat detection data from navigation state
    const { beats = [], duration: stateDuration = 20, tempo = null, photos = {}, audioURL: stateAudioURL = null, preloadedImages = [] } = location.state || {};

    // Debug logging
    useEffect(() => {
        console.log('🎵 Composer received location.state:', location.state);
        console.log('📊 Beats:', beats);
        console.log('🖼️ Photos:', photos);
        console.log('🎧 Audio URL:', stateAudioURL);
        console.log('📷 Preloaded Images:', preloadedImages);
    }, [location.state, beats, photos, stateAudioURL, preloadedImages]);

    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [uploadedContent, setUploadedContent] = useState({
        images: preloadedImages.length > 0 ? preloadedImages : [],
        imageFiles: [],
        video: null,
        videoFile: null,
        audio: stateAudioURL || null,
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
    const duration = activeTemplate?.duration || beatAnalysis?.duration || stateDuration || 20;

    const navItems = [
        { label: 'Home', href: '/' },
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Templates', href: '/template-extraction' },
        { label: 'Beat Detect', href: '/beat-detection' },
        { label: 'Composer', href: '/composer' },
        { label: 'History', href: '/history' }
    ];

    // Initialize audio from beat detection if available
    useEffect(() => {
        if (stateAudioURL && !uploadedContent.audio) {
            setUploadedContent(prev => ({
                ...prev,
                audio: stateAudioURL
            }));
        }
    }, [stateAudioURL]);

    // Load audio from selected template if it has extracted audio
    useEffect(() => {
        if (selectedTemplate?.audio_file_id && !uploadedContent.audio) {
            const audioUrl = `http://localhost:8000/api/v1/files/${selectedTemplate.audio_file_id}`;
            console.log('🎵 Loading audio from template:', audioUrl);
            setUploadedContent(prev => ({
                ...prev,
                audio: audioUrl
            }));
        }
    }, [selectedTemplate]);

    // Create segments from template OR from beat detection data
    useEffect(() => {
        console.log('🔄 Segment creation effect triggered. Beats:', beats.length, 'activeTemplate:', activeTemplate);

        // If we have beat detection data (from beat detection page)
        if (beats.length > 0 && !activeTemplate) {
            console.log('✅ Creating beat-based segments');
            const beatSegments = beats.map((beat, i) => {
                const nextBeat = beats[i + 1];
                const start = Number(beat);
                const end = nextBeat ? Number(nextBeat) : Math.min(Number(beat) + 1.5, stateDuration || Number(beat) + 1.5);
                const segmentDuration = end - start;
                const imageUrl = photos[i] || null;

                return {
                    id: `beat-seg-${i}`,
                    name: `Clip ${i + 1}`,
                    start: start,
                    end: end,
                    duration: segmentDuration,
                    color: ["#4a90e2", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"][i % 5],
                    imageUrl: imageUrl,
                    type: "image",
                    transition: {
                        type: 'fade',
                        duration: Math.min(segmentDuration, 2.0) // Use segment duration but cap at 2.0s max
                    }
                };
            });

            console.log('📦 Beat segments created:', beatSegments);
            setSegments(beatSegments);

            // Also populate uploaded content with beat photos
            if (Object.keys(photos).length > 0) {
                const imageArray = Object.values(photos);
                setUploadedContent(prev => ({
                    ...prev,
                    images: imageArray
                }));
            }
            return;
        }

        // If we have template (from template extraction page)
        if (!activeTemplate) return;

        const newSegments = activeTemplate.transitions.map((t, i) => {
            const nextTransition = activeTemplate.transitions[i + 1];
            const start = t.timestamp;
            // End clip 0.3s before next transition to avoid overlap
            const end = nextTransition ? Math.max(start + 0.5, nextTransition.timestamp - 0.3) : (activeTemplate.duration || start + 2);
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
    }, [activeTemplate, uploadedContent.images, beats, photos, stateDuration]);

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
        console.log('📊 Segments changed:', segments);

        // Update template with transition settings from Timeline Editor
        const baseTemplate = optimizedTemplate || selectedTemplate;
        if (!baseTemplate) return;

        const updatedTransitions = baseTemplate.transitions.map((t, index) => {
            const segment = segments[index];
            console.log(`Mapping transition ${index}:`, {
                segment_transition: segment?.transition,
                original_type: t.transition_type,
                new_type: segment?.transition?.type
            });
            return {
                ...t,
                transition_type: segment?.transition?.type || t.transition_type || 'fade',
                transition_duration: segment?.transition?.duration || t.transition_duration || 0.5
            };
        });

        console.log('✅ Updated transitions:', updatedTransitions);

        setEditedTemplate({
            ...baseTemplate,
            transitions: updatedTransitions
        });

        // Also update segments state
        setSegments(segments);
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
            {/* PillNav */}
            <PillNav
                logo="/logo.svg"
                items={navItems}
                activeHref={location.pathname}
                baseColor="rgba(0, 0, 0, 0.9)"
                pillColor="rgba(20, 20, 30, 0.95)"
                hoveredPillTextColor="#ffffff"
                pillTextColor="rgba(255, 255, 255, 0.7)"
                rightContent={<UserProfile />}
            />

            <div style={{ padding: '2rem', width: '100%', margin: '0', marginTop: '80px' }}>
                {/* Template Selector */}
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
                        {(activeTemplate || beats.length > 0) && (
                            <div style={{ marginTop: '20px' }}>
                                <TimelineEditor
                                    template={activeTemplate}
                                    content={uploadedContent}
                                    onSegmentsChange={handleSegmentsChange}
                                    initialSegments={beats.length > 0 && !activeTemplate ? segments : null}
                                />
                            </div>
                        )}

                        {/* Export Controls */}
                        {(uploadedContent.images.length === requiredImages || uploadedContent.video) && (
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
            </div>
        </div>
    );
}
