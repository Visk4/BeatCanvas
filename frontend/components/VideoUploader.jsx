import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Upload, Video, X, Sparkles } from "lucide-react";
import client from "@/api/client"; // Use the raw client

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

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Upload and start backend analysis
            const { data: analysis } = await client.post("/analyze-video", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            onVideoUploaded(analysis);
        } catch (error) {
            console.error("Analysis process failed:", error);
            setIsProcessing(false);
        } finally {
            // Let progress components handle state updates
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
                        <p className="text-gray-400">Backend AI transition detection</p>
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
                                Supports MP4, MOV, AVI, WebM
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
                            ? "Uploading & Analyzing..."
                            : "Start Backend Analysis"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
