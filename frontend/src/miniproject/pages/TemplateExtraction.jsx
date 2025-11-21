import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useLocation } from "react-router-dom";
import VideoUploader from "../../components/VideoUploader";
import VideoPlayer from "../../components/VideoPlayer";
import TransitionResults from "../../components/TransitionResults";
import AnalysisProgress from "../../components/AnalysisProgress";
import UserProfile from "../../components/UserProfile";
import Particles from "../../components/Particles";
import PillNav from "../../components/PillNav";
import { base44 } from "../../api/client";
import "../styles/Dashboard.css";

export default function TemplateExtraction() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const analysisId = searchParams.get('analysisId');

    const [currentAnalysis, setCurrentAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedTimestamp, setSelectedTimestamp] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const navItems = [
        { label: 'Home', href: '/' },
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Templates', href: '/template-extraction' },
        { label: 'Beat Detect', href: '/beat-detection' },
        { label: 'Composer', href: '/composer' },
        { label: 'History', href: '/history' }
    ];

    // Load existing analysis from URL parameter
    useEffect(() => {
        if (analysisId && !currentAnalysis) {
            setIsLoading(true);
            base44.entities.VideoAnalysis.get(analysisId)
                .then(analysis => {
                    setCurrentAnalysis(analysis);
                    // Set analyzing state based on status
                    if (analysis.analysis_status === 'processing') {
                        setIsAnalyzing(true);
                    } else {
                        setIsAnalyzing(false);
                    }
                })
                .catch(error => {
                    console.error('Failed to load analysis:', error);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [analysisId, currentAnalysis]);

    const handleVideoUploaded = (analysis) => {
        setCurrentAnalysis(analysis);
        setIsAnalyzing(true);
    };

    const handleAnalysisComplete = (updatedAnalysis) => {
        setCurrentAnalysis(updatedAnalysis);
        setIsAnalyzing(false);
    };

    const handleTimestampSelect = (timestamp) => {
        setSelectedTimestamp(timestamp);
    };

    return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>
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

            {/* Particles Background */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0
            }}>
                <Particles
                    particleColors={['#5227FF', '#ffffff', '#8b5cf6']}
                    particleCount={200}
                    particleSpread={10}
                    speed={0.1}
                    particleBaseSize={100}
                    moveParticlesOnHover={true}
                    alphaParticles={false}
                    disableRotation={false}
                />
            </div>

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
                <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', pointerEvents: 'auto', marginTop: '100px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>
                            Extract Transition Templates
                        </h1>
                        <p style={{ fontSize: '1.1rem', color: '#999', maxWidth: '700px', margin: '0 auto' }}>
                            Upload your video and let AI identify every transition to create reusable templates
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
                        {/* Left Column - Upload & Controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '12px',
                                        padding: '40px',
                                        textAlign: 'center'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        border: '3px solid #374151',
                                        borderTop: '3px solid #667eea',
                                        borderRadius: '50%',
                                        margin: '0 auto 15px',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    <p style={{ color: '#9ca3af' }}>Loading analysis...</p>
                                </motion.div>
                            )}

                            {!currentAnalysis && !isLoading && (
                                <VideoUploader
                                    onVideoUploaded={handleVideoUploaded}
                                    onAnalysisStart={() => setIsAnalyzing(true)}
                                />
                            )}

                            {isAnalyzing && currentAnalysis && (
                                <AnalysisProgress
                                    analysis={currentAnalysis}
                                    onComplete={handleAnalysisComplete}
                                />
                            )}

                            {currentAnalysis && !isAnalyzing && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '12px',
                                        padding: '20px'
                                    }}
                                >
                                    <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '8px' }}>
                                        Analysis Complete!
                                    </h3>
                                    <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>
                                        Found {currentAnalysis.transitions?.length || 0} transitions
                                    </p>
                                    <button
                                        onClick={() => {
                                            setCurrentAnalysis(null);
                                            setIsAnalyzing(false);
                                            setSelectedTimestamp(null);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            backgroundColor: '#2563eb',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Analyze Another Video
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Right Column - Video & Results */}
                        <div>
                            <AnimatePresence mode="wait">
                                {currentAnalysis && !isAnalyzing ? (
                                    <motion.div
                                        key="results-view"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                                    >
                                        <VideoPlayer
                                            analysis={currentAnalysis}
                                            selectedTimestamp={selectedTimestamp}
                                            onTimestampSelect={handleTimestampSelect}
                                        />

                                        {currentAnalysis.analysis_status === 'completed' && currentAnalysis.transitions?.length > 0 && (
                                            <TransitionResults
                                                analysis={currentAnalysis}
                                                onTimestampSelect={handleTimestampSelect}
                                                selectedTimestamp={selectedTimestamp}
                                            />
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="placeholder"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '400px',
                                            border: '2px dashed #374151',
                                            borderRadius: '16px'
                                        }}
                                    >
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                margin: '0 auto 20px',
                                                backgroundColor: '#1f2937',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <div style={{
                                                    width: '30px',
                                                    height: '30px',
                                                    border: '3px solid #333',
                                                    borderTop: '3px solid transparent',
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite'
                                                }} />
                                            </div>
                                            <p style={{ color: '#888', fontSize: '1.1rem' }}>
                                                {isAnalyzing ? 'Analyzing video...' : 'Upload a video to extract templates'}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
