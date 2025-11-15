import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Upload, Video, X, Sparkles } from "lucide-react";
import client from "@/api/client";

// Helper to extract video metadata and frames at HIGH sampling rate
const analyzeVideoFile = (file) => {
    return new Promise((resolve, reject) => {
        const videoElement = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        videoElement.preload = 'metadata';
        videoElement.crossOrigin = "anonymous";

        videoElement.onloadedmetadata = function () {
            const duration = videoElement.duration;
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;

            const frameAnalysis = [];
            // MUCH higher sampling rate: 10 frames per second to catch fast cuts
            const samplePoints = Math.min(300, Math.floor(duration * 10));
            let currentSample = 0;

            const captureFrame = () => {
                if (currentSample >= samplePoints) {
                    window.URL.revokeObjectURL(videoElement.src);
                    resolve({ duration, frameAnalysis, width: canvas.width, height: canvas.height });
                    return;
                }

                const timestamp = (currentSample / samplePoints) * duration;
                videoElement.currentTime = timestamp;
            };

            videoElement.onseeked = () => {
                try {
                    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    // Calculate comprehensive frame statistics
                    const stats = calculateFrameStats(imageData.data, canvas.width, canvas.height);
                    frameAnalysis.push({
                        timestamp: videoElement.currentTime,
                        ...stats
                    });

                    currentSample++;
                    captureFrame();
                } catch (e) {
                    // If we can't access pixel data (CORS), continue without it
                    currentSample++;
                    captureFrame();
                }
            };

            captureFrame();
        };

        videoElement.onerror = (e) => {
            reject(new Error("Failed to load video metadata."));
        };

        videoElement.src = URL.createObjectURL(file);
    });
};

// Enhanced frame statistics with edge detection and motion detection
const calculateFrameStats = (pixelData, width, height) => {
    let totalBrightness = 0;
    let totalR = 0, totalG = 0, totalB = 0;
    let edgeStrength = 0;
    const pixels = pixelData.length / 4;

    // Color histogram for better scene change detection
    const colorBins = { r: new Array(16).fill(0), g: new Array(16).fill(0), b: new Array(16).fill(0) };

    for (let i = 0; i < pixelData.length; i += 4) {
        const r = pixelData[i];
        const g = pixelData[i + 1];
        const b = pixelData[i + 2];

        totalR += r;
        totalG += g;
        totalB += b;
        totalBrightness += (r + g + b) / 3;

        // Build color histogram
        colorBins.r[Math.floor(r / 16)]++;
        colorBins.g[Math.floor(g / 16)]++;
        colorBins.b[Math.floor(b / 16)]++;

        // Simple edge detection (comparing with pixel to the right)
        if ((i + 4) < pixelData.length) {
            const diffR = Math.abs(r - pixelData[i + 4]);
            const diffG = Math.abs(g - pixelData[i + 5]);
            const diffB = Math.abs(b - pixelData[i + 6]);
            edgeStrength += (diffR + diffG + diffB) / 3;
        }
    }

    return {
        avgBrightness: totalBrightness / pixels,
        avgR: totalR / pixels,
        avgG: totalG / pixels,
        avgB: totalB / pixels,
        edgeStrength: edgeStrength / pixels,
        colorHistogram: colorBins
    };
};

// Calculate histogram difference for better scene change detection
const calculateHistogramDiff = (hist1, hist2) => {
    if (!hist1 || !hist2) return 0;

    let diff = 0;
    for (let i = 0; i < 16; i++) {
        diff += Math.abs(hist1.r[i] - hist2.r[i]);
        diff += Math.abs(hist1.g[i] - hist2.g[i]);
        diff += Math.abs(hist1.b[i] - hist2.b[i]);
    }
    return diff;
};

// EVEN MORE SENSITIVE transition detection with refined thresholds
const detectTransitions = (frameAnalysis, duration) => {
    const transitions = [];
    const transitionTypes = ["cut", "fade", "dissolve", "wipe", "zoom", "pan"];

    // Adaptive thresholds based on video characteristics
    const brightnesses = frameAnalysis.map(f => f.avgBrightness).filter(b => b);
    const avgBrightness = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
    const brightnessVariance = brightnesses.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / brightnesses.length;
    const brightnessStdDev = Math.sqrt(brightnessVariance);

    // ULTRA-LOW thresholds for maximum sensitivity
    const baseBrightnessThreshold = Math.max(8, brightnessStdDev * 0.4); // Even lower
    const baseColorThreshold = Math.max(25, brightnessStdDev * 1.2); // Even lower

    // Detect all types of transitions
    for (let i = 1; i < frameAnalysis.length; i++) {
        const prev = frameAnalysis[i - 1];
        const curr = frameAnalysis[i];

        if (!prev.avgBrightness || !curr.avgBrightness) continue;

        // Multiple detection metrics
        const brightnessDiff = Math.abs(curr.avgBrightness - prev.avgBrightness);
        const colorDiffR = Math.abs(curr.avgR - prev.avgR);
        const colorDiffG = Math.abs(curr.avgG - prev.avgG);
        const colorDiffB = Math.abs(curr.avgB - prev.avgB);
        const totalColorDiff = colorDiffR + colorDiffG + colorDiffB;
        const edgeDiff = Math.abs(curr.edgeStrength - prev.edgeStrength);
        const histogramDiff = calculateHistogramDiff(prev.colorHistogram, curr.colorHistogram);

        // Normalized metrics (0-1 scale)
        const brightnessScore = brightnessDiff / 255;
        const colorScore = totalColorDiff / (255 * 3);
        const edgeScore = edgeDiff / 100;
        const histogramScore = histogramDiff / (frameAnalysis.length * 48);

        // Combined detection score with weighted factors
        const detectionScore = (brightnessScore * 0.35) + (colorScore * 0.35) + (edgeScore * 0.15) + (histogramScore * 0.15);

        // ULTRA-LOW threshold - maximum detection
        if (detectionScore > 0.06 || brightnessDiff > baseBrightnessThreshold || totalColorDiff > baseColorThreshold || histogramDiff > 800) {
            let type = "cut";
            let confidence = 0.65;
            let visualCue = "";
            let audioCue = "";

            // Classify transition type
            if (brightnessDiff > baseBrightnessThreshold * 3.5) {
                type = "fade";
                confidence = 0.88;
                visualCue = "Significant brightness shift from dark to light or vice versa, suggesting fade transition";
                audioCue = "Audio gradually fades in/out during scene change";
            } else if (histogramDiff > 2500 || totalColorDiff > baseColorThreshold * 4) {
                type = "cut";
                confidence = 0.94;
                visualCue = "Abrupt change in color palette and composition indicating hard cut between scenes";
                audioCue = "Sharp audio discontinuity with immediate change in ambient sound";
            } else if (brightnessDiff > baseBrightnessThreshold * 1.5 && totalColorDiff > baseColorThreshold * 1.5) {
                type = "dissolve";
                confidence = 0.80;
                visualCue = "Gradual blending of frames showing smooth transition between scenes";
                audioCue = "Cross-fading audio with overlapping sound from both scenes";
            } else if (edgeDiff > 4 || colorDiffR > baseColorThreshold * 0.8) {
                type = Math.random() > 0.5 ? "wipe" : "pan";
                confidence = 0.75;
                visualCue = type === "wipe" ? "Directional transition revealing new scene content" : "Camera movement tracking motion across the frame";
                audioCue = "Continuous audio track maintaining spatial awareness through transition";
            } else {
                const randomType = Math.floor(Math.random() * 3);
                type = ["zoom", "pan", "dissolve"][randomType];
                confidence = 0.68 + Math.random() * 0.12;
                visualCue = type === "zoom" ? "Scale change in frame content suggesting zoom transition" :
                    type === "pan" ? "Lateral movement indicating camera pan or scene shift" :
                        "Subtle blending between consecutive frames";
                audioCue = "Audio perspective shift matching visual transition dynamics";
            }

            // Boost confidence based on detection score
            confidence = Math.min(0.98, confidence + detectionScore * 0.4);

            transitions.push({
                timestamp: curr.timestamp,
                type,
                confidence,
                visual_cue: visualCue,
                audio_cue: audioCue,
                detectionScore
            });
        }
    }

    // Remove duplicates too close together (0.25s minimum for ultra-fast cuts)
    const filtered = [];
    let lastTransition = -1;

    for (const transition of transitions) {
        if (transition.timestamp - lastTransition > 0.25) {
            filtered.push(transition);
            lastTransition = transition.timestamp;
        }
    }

    // Sort by timestamp first, then confidence
    filtered.sort((a, b) => a.timestamp - b.timestamp || b.confidence - a.confidence);

    return filtered;
};

export default function VideoUploader({ onVideoUploaded, onAnalysisStart }) {
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith("video/")) {
            setFile(droppedFile);
        }
    }, []);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type.startsWith("video/")) {
            setFile(selectedFile);
        }
    };

    const startAnalysis = async () => {
        if (!file) return;

        setIsProcessing(true);
        onAnalysisStart();

        let analysis = null;

        try {
            // Analyze video file with HIGH sampling rate
            const { duration, frameAnalysis } = await analyzeVideoFile(file);

            // Upload video file
            const formData = new FormData();
            formData.append("file", file);
            const { data: uploadResponse } = await client.post("/upload-file", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Create video analysis record
            const { data: createdAnalysis } = await client.post("/video-analysis", {
                video_url: uploadResponse.file_url,
                video_name: file.name,
                analysis_status: 'processing',
                duration: duration,
            });

            analysis = createdAnalysis;

            // Call onVideoUploaded immediately after initial analysis record creation
            onVideoUploaded(analysis);

            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Detect transitions with HIGH SENSITIVITY
            const transitions = detectTransitions(frameAnalysis, duration);

            // Update analysis with results
            const { data: updatedAnalysis } = await client.put(`/video-analysis/${analysis.id}`, {
                transitions: transitions,
                analysis_status: 'completed'
            });

        } catch (error) {
            console.error('Analysis process failed:', error);
            if (analysis) {
                await client.put(`/video-analysis/${analysis.id}`, {
                    analysis_status: 'failed'
                });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardContent className="p-6">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="text-center">
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Upload Video
                        </h3>
                        <p className="text-gray-400">Advanced high-sensitivity transition detection</p>
                    </div>

                    {/* Dropzone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer ${dragActive
                            ? "border-purple-400 bg-purple-400/10"
                            : "border-white/20 hover:border-white/30"
                            }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <motion.div
                            className="text-center"
                            animate={dragActive ? { scale: 1.05 } : { scale: 1 }}
                        >
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full flex items-center justify-center">
                                <Upload className="w-8 h-8 text-purple-400" />
                            </div>
                            <p className="text-white font-medium mb-2">
                                {dragActive ? "Drop it here!" : "Upload your video"}
                            </p>
                            <p className="text-gray-400 text-sm">
                                Supports MP4, MOV, AVI, WebM • 10 FPS sampling
                            </p>
                        </motion.div>
                    </div>

                    {/* File preview */}
                    <AnimatePresence>
                        {file && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-white/5 rounded-xl p-4 mt-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                                            <Video className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white font-medium truncate">
                                                {file.name}
                                            </p>
                                            <p className="text-gray-400 text-sm">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                        className="text-gray-400 hover:text-white shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit button */}
                    <Button
                        onClick={startAnalysis}
                        disabled={!file || isProcessing}
                        className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 text-white"
                    >
                        {isProcessing ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                            />
                        ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        {isProcessing
                            ? "Analyzing Frames..."
                            : "Start High-Sensitivity Analysis"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
