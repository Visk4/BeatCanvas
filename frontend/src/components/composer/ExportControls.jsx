import React, { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Download, Sparkles } from "lucide-react";
import { base44 } from "@/api/client";
import { motion } from "framer-motion";

export default function ExportControls({ template, content, beatAnalysis, onComposeStart, onComposeEnd, composedVideoUrl, isComposing }) {

    // This is a complex client-side video renderer.
    // It will be simple for now and just use the first image.
    // A full implementation would use a library like remotion or ffmpeg.wasm.
    const composeVideo = async () => {
        onComposeStart();

        try {
            // Create canvas for video composition
            const canvas = document.createElement('canvas');
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');

            // Setup video recording
            const stream = canvas.captureStream(30); // 30 FPS

            let audioStream = null;
            let audioElement = null;

            // Add audio if provided
            if (content.audio) {
                audioElement = new Audio(content.audio);
                audioElement.crossOrigin = "anonymous";
                await audioElement.play(); // Start playing to load

                const audioContext = new AudioContext();
                const source = audioContext.createMediaElementSource(audioElement);
                const destination = audioContext.createMediaStreamDestination();
                source.connect(destination);
                source.connect(audioContext.destination); // Play audio out loud

                audioStream = destination.stream;
                audioStream.getAudioTracks().forEach(track => {
                    stream.addTrack(track);
                });
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const file = new File([blob], 'composed-video.webm', { type: 'video/webm' });

                try {
                    // Upload the new video to our backend
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    onComposeEnd(file_url); // Pass the new URL
                } catch (uploadError) {
                    console.error("Failed to upload composed video:", uploadError);
                    onComposeEnd(null); // Signal failure
                }

                // Stop audio
                if (audioElement) {
                    audioElement.pause();
                }
                if (audioStream) {
                    audioStream.getTracks().forEach(track => track.stop());
                }
            };

            // Start recording
            mediaRecorder.start();

            // --- Simple Animation Loop ---
            // This loop draws images based on the template's transition times

            const images = [];
            for (const imgSrc of content.images) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = imgSrc;
                await new Promise(resolve => { img.onload = resolve; });
                images.push(img);
            }

            if (images.length === 0) {
                throw new Error("No images loaded to compose video.");
            }

            const drawImage = (img) => {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const hRatio = canvas.width / img.width;
                const vRatio = canvas.height / img.height;
                const ratio = Math.min(hRatio, vRatio);
                const centerShift_x = (canvas.width - img.width * ratio) / 2;
                const centerShift_y = (canvas.height - img.height * ratio) / 2;
                ctx.drawImage(img, 0, 0, img.width, img.height,
                    centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
            };

            let currentImageIndex = 0;
            let lastTimestamp = 0;

            // Add the final duration as a "stop" point
            const allTransitions = [...(template.transitions || [])];
            const finalDuration = beatAnalysis?.duration || 10; // Default 10s
            allTransitions.push({ timestamp: finalDuration });

            for (const transition of allTransitions) {
                const timestamp = transition.timestamp;
                const duration = timestamp - lastTimestamp;

                if (duration > 0 && images[currentImageIndex]) {
                    const img = images[currentImageIndex];

                    // Hold this image for its duration
                    const frameCount = Math.floor(duration * 30); // 30 FPS
                    for (let i = 0; i < frameCount; i++) {
                        drawImage(img);
                        // This is a simple way to "wait" - a real app would use requestAnimationFrame
                        await new Promise(r => setTimeout(r, 1000 / 30));
                    }
                }

                currentImageIndex++;
                lastTimestamp = timestamp;
            }

            // Stop recording
            mediaRecorder.stop();

        } catch (error) {
            console.error('Error composing video:', error);
            onComposeEnd(null); // Signal failure
        }
    };

    const downloadVideo = () => {
        if (!composedVideoUrl) return;

        const a = document.createElement('a');
        a.href = composedVideoUrl;
        a.download = `composed-video-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const canCompose = (content.images.length > 0 || content.video) && !isComposing;

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {!composedVideoUrl ? (
                        <Button
                            onClick={composeVideo}
                            disabled={!canCompose}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 text-white"
                        >
                            {isComposing ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                                    />
                                    Composing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Compose Video
                                </>
                            )}
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={downloadVideo}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Video
                            </Button>
                            <Button
                                onClick={() => window.location.reload()} // Simple reset
                                variant="outline"
                                className="border-white/20 hover:bg-white/5 text-white"
                            >
                                Create Another
                            </Button>
                        </>
                    )}
                </div>

                <p className="text-gray-400 text-sm mt-4 text-center">
                    {!composedVideoUrl
                        ? 'Your video will be rendered with the selected transitions'
                        : 'Video ready! Download or create another composition'
                    }
                </p>
            </CardContent>
        </Card>
    );
}