import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VideoUploader from "../../components/VideoUploader";
import VideoPlayer from "../../components/VideoPlayer";
import TransitionResults from "../../components/TransitionResults";
import AnalysisProgress from "../../components/AnalysisProgress";
import UserProfile from "../../components/UserProfile";
import "../styles/Dashboard.css";

export default function TemplateExtraction() {
    const [currentAnalysis, setCurrentAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedTimestamp, setSelectedTimestamp] = useState(null);

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
        <div style={{ minHeight: '100vh', padding: '20px', backgroundColor: '#111827', color: '#e5e7eb' }}>
            <nav style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 40px',
                borderBottom: '1px solid #374151',
                marginBottom: '20px'
            }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white' }}>Template Extraction</h2>
                <UserProfile />
            </nav>

            <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
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
                        {!currentAnalysis && (
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
                                    {isAnalyzing && currentAnalysis ? (
                                        <AnalysisProgress
                                            analysis={currentAnalysis}
                                            onComplete={handleAnalysisComplete}
                                        />
                                    ) : (
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
                                                Upload a video to extract templates
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
