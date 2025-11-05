import React, { useState } from "react";
import { base44 } from "../api/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import TemplateSelector from "../../components/composer/TemplateSelector";
import ContentUploader from "../../components/composer/ContentUploader";
import BeatDetector from "../../components/composer/BeatDetector";
import TransitionCorrelation from "../../components/composer/TransitionCorrelation";
import VideoPreview from "../../components/composer/VideoPreview";
import ExportControls from "../../components/composer/ExportControls";

export default function CreateVideo() {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [uploadedContent, setUploadedContent] = useState({ images: [], imageFiles: [], video: null, videoFile: null, audio: null, audioFile: null });
    const [beatAnalysis, setBeatAnalysis] = useState(null);
    const [isComposing, setIsComposing] = useState(false);
    const [composedVideoUrl, setComposedVideoUrl] = useState(null);
    const [optimizedTemplate, setOptimizedTemplate] = useState(null);

    const { data: analyses } = useQuery({
        queryKey: ['completed-analyses'],
        queryFn: async () => {
            const all = await base44.entities.VideoAnalysis.list('-created_date', 50);
            // Make sure to check for analysis_status
            return all.filter(a => a.analysis_status === 'completed' && a.transitions?.length > 0);
        },
        initialData: [],
    });

    const requiredImages = selectedTemplate ? selectedTemplate.transitions.length + 1 : 0;

    const handleApplySuggestions = (suggestions) => {
        const optimized = {
            ...selectedTemplate,
            transitions: selectedTemplate.transitions.map((t, index) => ({
                ...t,
                // Ensure suggestions[index] exists before accessing timestamp
                timestamp: suggestions[index]?.suggestedTimestamp || t.timestamp,
                syncedWithBeat: true
            }))
        };
        setOptimizedTemplate(optimized);
    };

    const activeTemplate = optimizedTemplate || selectedTemplate;

    return (
        <div className="min-h-screen p-4 md:p-8 text-white">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <Link to={createPageUrl("Dashboard")}>
                            <Button variant="outline" size="icon" className="border-white/20 hover:bg-white/5 text-white">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-green-400 bg-clip-text text-transparent">
                                Video Composer
                            </h1>
                            <p className="text-gray-300 mt-1">Apply transition templates synced with audio beats</p>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`relative ${selectedTemplate ? 'lg:col-span-1' : 'lg:col-span-3'}`}
                    >
                        <TemplateSelector
                            analyses={analyses}
                            selectedTemplate={selectedTemplate}
                            onSelectTemplate={setSelectedTemplate}
                        />
                    </motion.div>

                    {selectedTemplate && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="lg:col-span-2 space-y-6"
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
                                    // Update content with the new audio URL from our backend
                                    setUploadedContent(prev => ({ ...prev, audio: analysis.audio_url, audioFile: prev.audioFile }));
                                }}
                                onAudioFileChange={(file) => {
                                    setUploadedContent(prev => ({ ...prev, audioFile: file }));
                                }}
                            />
                        </motion.div>
                    )}
                </div>

                {selectedTemplate && beatAnalysis && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6"
                    >
                        <TransitionCorrelation
                            template={selectedTemplate}
                            beatAnalysis={beatAnalysis}
                            onApplySuggestions={handleApplySuggestions}
                        />
                    </motion.div>
                )}

                {activeTemplate && (uploadedContent.images.length === requiredImages || uploadedContent.video) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-6"
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

                {(!selectedTemplate && !analyses) || (!selectedTemplate && analyses.length === 0) ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full flex items-center justify-center">
                            <Sparkles className="w-12 h-12 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No Templates Available</h3>
                        <p className="text-gray-400 mb-6">Analyze a video first to create transition templates</p>
                        <Link to={createPageUrl("Dashboard")}>
                            s       <Button className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white">
                                Analyze Video
                            </Button>
                        </Link>
                    </motion.div>
                ) : null}
            </div>
        </div>
    );
}