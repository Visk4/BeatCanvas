import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import VideoUploader from "@/components/VideoUploader";
import VideoPlayer from "@/components/VideoPlayer";
import TransitionResults from "@/components/TransitionResults";
import AnalysisProgress from "@/components/AnalysisProgress";
import HeadphonesScene from "@/components/HeadphonesScene";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
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
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Discover Video Transitions
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Upload your video and let our backend AI identify every transition
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Upload & Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        {!currentAnalysis && (
                            <>
                                <VideoUploader
                                    onVideoUploaded={handleVideoUploaded}
                                    onAnalysisStart={() => setIsAnalyzing(true)}
                                />
                                <HeadphonesScene />
                            </>
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
                                className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                            >
                                <h3 className="text-white font-semibold mb-2">Analysis Complete!</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    Found {currentAnalysis.transitions?.length || 0} transitions
                                </p>
                                <Button
                                    onClick={() => {
                                        setCurrentAnalysis(null);
                                        setIsAnalyzing(false);
                                        setSelectedTimestamp(null);
                                    }}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Analyze Another Video
                                </Button>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Column - Video & Results */}
                    <div className="lg:col-span-2 space-y-6">
                        <AnimatePresence mode="wait">
                            {currentAnalysis && !isAnalyzing ? (
                                <motion.div
                                    key="results-view"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="space-y-6"
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
                                >
                                    {isAnalyzing && currentAnalysis ? (
                                        <AnalysisProgress
                                            analysis={currentAnalysis}
                                            onComplete={handleAnalysisComplete}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-96 border-2 border-dashed border-slate-800 rounded-2xl">
                                            <div className="text-center">
                                                <div className="w-20 h-20 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
                                                    <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                                                </div>
                                                <p className="text-slate-400 text-lg">Upload a video to get started</p>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}