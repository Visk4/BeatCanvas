import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Music, Upload, Zap, X, Activity } from "lucide-react";
import { motion } from "framer-motion";
import client from "@/api/client"; // Use the raw client

export default function BeatDetector({ onBeatsDetected, onAudioFileChange }) {
    const [audioFile, setAudioFile] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [beatAnalysis, setBeatAnalysis] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("audio/")) {
            setAudioFile(file);
            onAudioFileChange(file); // Pass file to parent
            setBeatAnalysis(null);
        }
    };

    const analyzeBeat = async () => {
        if (!audioFile) return;

        setIsAnalyzing(true);

        try {
            const formData = new FormData();
            formData.append("file", audioFile);

            // Call backend endpoint to upload and start analysis
            const { data: analysis } = await client.post("/analyze-audio", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            // Start polling for results
            checkCompletion(analysis.id);
        } catch (error) {
            console.error("Beat detection failed:", error);
            setIsAnalyzing(false);
        }
    };

    const checkCompletion = (analysisId) => {
        const interval = setInterval(async () => {
            try {
                const { data: updatedAnalysis } = await client.get(`/analyses/${analysisId}`);
                if (
                    updatedAnalysis.analysis_status === "completed" ||
                    updatedAnalysis.analysis_status === "failed"
                ) {
                    clearInterval(interval);
                    if (updatedAnalysis.analysis_status === "completed") {
                        setBeatAnalysis(updatedAnalysis);
                        onBeatsDetected(updatedAnalysis);
                    } else {
                        console.error("Beat analysis failed on backend");
                    }
                    setIsAnalyzing(false);
                }
            } catch (error) {
                console.error("Error polling for beat analysis:", error);
                clearInterval(interval);
                setIsAnalyzing(false);
            }
        }, 3000); // Poll every 3 seconds
    };

    const formatTime = (seconds) => {
        if (typeof seconds !== "number" || seconds < 0) return "0:00.00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
    };

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Music className="w-5 h-5 text-green-400" />
                    Advanced Beat Detection (madmom)
                </CardTitle>
                <p className="text-gray-400 text-sm">
                    Detect beats, hooks, and drops to sync with transitions
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Upload section */}
                {!audioFile ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-white/30 transition-colors"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center">
                            <Upload className="w-8 h-8 text-green-400" />
                        </div>
                        <p className="text-white font-medium mb-2">Upload Audio File</p>
                        <p className="text-gray-400 text-sm">MP3, WAV, OGG - Identify hooks & drops</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* File info */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                                    <Music className="w-5 h-5 text-green-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-medium truncate">{audioFile.name}</p>
                                    <p className="text-gray-400 text-sm">
                                        {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                    setAudioFile(null);
                                    setBeatAnalysis(null);
                                    onBeatsDetected(null);
                                    onAudioFileChange(null);
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Analyze / Results */}
                        {!beatAnalysis ? (
                            <Button
                                onClick={analyzeBeat}
                                disabled={isAnalyzing}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                                        />
                                        Analyzing Audio...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 mr-2" />
                                        Analyze Beats & Hooks
                                    </>
                                )}
                            </Button>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-4"
                            >
                                {/* Summary */}
                                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4" />
                                        Analysis Complete
                                    </h4>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-400">Tempo (BPM)</p>
                                            <p className="text-green-300 font-semibold text-lg">{beatAnalysis.tempo}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Total Beats</p>
                                            <p className="text-green-300 font-semibold text-lg">
                                                {beatAnalysis.totalBeats}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Strong Beats</p>
                                            <p className="text-yellow-300 font-semibold text-lg">
                                                {beatAnalysis.totalStrongBeats}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Duration</p>
                                            <p className="text-green-300 font-semibold text-lg">
                                                {Math.floor(beatAnalysis.duration)}s
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Strong Beats / Hooks */}
                                {beatAnalysis.strongBeats && beatAnalysis.strongBeats.length > 0 && (
                                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-yellow-400" />
                                            Detected Hooks & Drops
                                        </h4>

                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                            {beatAnalysis.strongBeats.map((beat, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-2 bg-black/20 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Badge
                                                            className={`${beat.type === "bass_drop"
                                                                    ? "bg-red-500/20 text-red-300 border-red-500/30"
                                                                    : beat.type === "buildup"
                                                                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                                                        : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                                                } capitalize text-xs`}
                                                        >
                                                            {beat.type.replace("_", " ")}
                                                        </Badge>
                                                        <span className="text-white font-mono text-sm">
                                                            {formatTime(beat.timestamp)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-white/20 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                                                                style={{ width: `${beat.confidence * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-gray-400 text-xs">
                                                            {Math.round(beat.confidence * 100)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </CardContent>
        </Card>
    );
}
