import React, { useState, useEffect } from "react";
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
    }, [templateId, analyses, selectedTemplate]); const requiredImages = selectedTemplate ? selectedTemplate.transitions.length + 1 : 0;

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

    const activeTemplate = optimizedTemplate || selectedTemplate;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', color: 'white', padding: '20px' }}>
            <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: '40px' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <Link to="/dashboard">
                                <button style={{
                                    width: '40px',
                                    height: '40px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    backgroundColor: 'transparent',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    transition: 'background 0.2s'
                                }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    ←
                                </button>
                            </Link>
                            <div>
                                <h1 style={{
                                    fontSize: '2.5rem',
                                    fontWeight: 'bold',
                                    background: 'linear-gradient(to right, #a78bfa, #22d3ee, #4ade80)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    marginBottom: '5px'
                                }}>
                                    Video Composer
                                </h1>
                                <p style={{ color: '#aaa', fontSize: '1rem' }}>
                                    Apply transition templates synced with audio beats
                                </p>
                            </div>
                        </div>
                        <UserProfile />
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: selectedTemplate ? '1fr 2fr' : '1fr',
                    gap: '25px',
                    marginBottom: '30px'
                }}>
                    {/* Template Selector */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <TemplateSelector
                            analyses={analyses}
                            selectedTemplate={selectedTemplate}
                            onSelectTemplate={setSelectedTemplate}
                        />
                    </motion.div>

                    {/* Content Uploader & Beat Detector */}
                    {selectedTemplate && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                        >
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
                        </motion.div>
                    )}
                </div>

                {/* Transition Correlation */}
                {selectedTemplate && beatAnalysis && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        style={{ marginBottom: '25px' }}
                    >
                        <TransitionCorrelation
                            template={selectedTemplate}
                            beatAnalysis={beatAnalysis}
                            onApplySuggestions={handleApplySuggestions}
                        />
                    </motion.div>
                )}

                {/* Timeline Editor - Show when template is selected */}
                {activeTemplate && (
                    <TimelineEditor
                        template={activeTemplate}
                        content={uploadedContent}
                        onSegmentsChange={(segments) => {
                            // Can be used to track timeline changes
                            console.log('Timeline segments updated:', segments);
                        }}
                    />
                )}

                {/* Video Preview & Export */}
                {activeTemplate && (uploadedContent.images.length === requiredImages || uploadedContent.video) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                    >
                        <VideoPreview
                            template={activeTemplate}
                            content={uploadedContent}
                            beatAnalysis={beatAnalysis}
                            composedVideoUrl={composedVideoUrl}
                            isComposing={isComposing}
                        />

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
                    </motion.div>
                )}

                {/* Empty State */}
                {(!selectedTemplate && !analyses) || (!selectedTemplate && analyses.length === 0) ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ textAlign: 'center', padding: '80px 20px' }}
                    >
                        <div style={{
                            width: '100px',
                            height: '100px',
                            margin: '0 auto 25px',
                            background: 'linear-gradient(to right, rgba(167, 139, 250, 0.2), rgba(34, 211, 238, 0.2))',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '48px'
                        }}>
                            ✨
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white', marginBottom: '10px' }}>
                            No Templates Available
                        </h3>
                        <p style={{ color: '#888', marginBottom: '25px', fontSize: '1rem' }}>
                            Analyze a video first to create transition templates
                        </p>
                        <Link to="/template-extraction">
                            <button style={{
                                padding: '12px 28px',
                                background: 'linear-gradient(to right, #a78bfa, #22d3ee)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontWeight: '600',
                                fontSize: '15px',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                            >
                                Analyze Video
                            </button>
                        </Link>
                    </motion.div>
                ) : null}
            </div>
        </div>
    );
}
