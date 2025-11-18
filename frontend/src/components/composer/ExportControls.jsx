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

            // Transition rendering functions
            const applyTransition = (prevImg, nextImg, progress, transitionType) => {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const drawImageCentered = (img, alpha = 1, offsetX = 0, offsetY = 0, scale = 1) => {
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    const hRatio = canvas.width / img.width;
                    const vRatio = canvas.height / img.height;
                    const ratio = Math.min(hRatio, vRatio) * scale;
                    const centerShift_x = (canvas.width - img.width * ratio) / 2 + offsetX;
                    const centerShift_y = (canvas.height - img.height * ratio) / 2 + offsetY;
                    ctx.drawImage(img, 0, 0, img.width, img.height,
                        centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
                    ctx.restore();
                };

                switch (transitionType) {
                    case 'fade':
                        drawImageCentered(prevImg, 1 - progress);
                        drawImageCentered(nextImg, progress);
                        break;

                    case 'slide-left':
                        drawImageCentered(prevImg, 1, -canvas.width * progress, 0);
                        drawImageCentered(nextImg, 1, canvas.width * (1 - progress), 0);
                        break;

                    case 'slide-right':
                        drawImageCentered(prevImg, 1, canvas.width * progress, 0);
                        drawImageCentered(nextImg, 1, -canvas.width * (1 - progress), 0);
                        break;

                    case 'slide-up':
                        drawImageCentered(prevImg, 1, 0, -canvas.height * progress);
                        drawImageCentered(nextImg, 1, 0, canvas.height * (1 - progress));
                        break;

                    case 'slide-down':
                        drawImageCentered(prevImg, 1, 0, canvas.height * progress);
                        drawImageCentered(nextImg, 1, 0, -canvas.height * (1 - progress));
                        break;

                    case 'zoom-in':
                        drawImageCentered(prevImg, 1 - progress, 0, 0, 1 + progress);
                        drawImageCentered(nextImg, progress);
                        break;

                    case 'zoom-out':
                        drawImageCentered(prevImg, 1 - progress, 0, 0, 1 - progress * 0.5);
                        drawImageCentered(nextImg, progress);
                        break;

                    case 'dissolve':
                        // Pixelated dissolve effect
                        const gridSize = 20;
                        const threshold = progress;
                        for (let y = 0; y < canvas.height; y += gridSize) {
                            for (let x = 0; x < canvas.width; x += gridSize) {
                                const random = Math.random();
                                if (random < threshold) {
                                    ctx.save();
                                    ctx.beginPath();
                                    ctx.rect(x, y, gridSize, gridSize);
                                    ctx.clip();
                                    drawImageCentered(nextImg);
                                    ctx.restore();
                                } else {
                                    ctx.save();
                                    ctx.beginPath();
                                    ctx.rect(x, y, gridSize, gridSize);
                                    ctx.clip();
                                    drawImageCentered(prevImg);
                                    ctx.restore();
                                }
                            }
                        }
                        break;

                    case 'wipe':
                        // Left to right wipe
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(0, 0, canvas.width * (1 - progress), canvas.height);
                        ctx.clip();
                        drawImageCentered(prevImg);
                        ctx.restore();

                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(canvas.width * (1 - progress), 0, canvas.width * progress, canvas.height);
                        ctx.clip();
                        drawImageCentered(nextImg);
                        ctx.restore();
                        break;

                    case 'none':
                    default:
                        // Instant cut
                        drawImageCentered(nextImg);
                        break;
                }
            };

            let currentImageIndex = 0;
            let lastTimestamp = 0;

            // Add the final duration as a "stop" point
            const allTransitions = [...(template.transitions || [])];
            const finalDuration = beatAnalysis?.duration || template?.duration || 10; // Default 10s
            allTransitions.push({ timestamp: finalDuration });

            for (let i = 0; i < allTransitions.length; i++) {
                const transition = allTransitions[i];
                const timestamp = transition.timestamp;
                const duration = timestamp - lastTimestamp;
                const transitionType = transition.transition_type || transition.type || 'fade';
                const transitionDuration = transition.transition_duration || 0.5; // Default 0.5s

                if (duration > 0 && images[currentImageIndex]) {
                    const currentImg = images[currentImageIndex];
                    const nextImg = images[currentImageIndex + 1];

                    // Calculate frames for holding the current image (before transition)
                    const holdDuration = Math.max(0, duration - transitionDuration);
                    const holdFrames = Math.floor(holdDuration * 30);

                    // Hold current image
                    for (let j = 0; j < holdFrames; j++) {
                        ctx.fillStyle = 'black';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        const hRatio = canvas.width / currentImg.width;
                        const vRatio = canvas.height / currentImg.height;
                        const ratio = Math.min(hRatio, vRatio);
                        const centerShift_x = (canvas.width - currentImg.width * ratio) / 2;
                        const centerShift_y = (canvas.height - currentImg.height * ratio) / 2;
                        ctx.drawImage(currentImg, 0, 0, currentImg.width, currentImg.height,
                            centerShift_x, centerShift_y, currentImg.width * ratio, currentImg.height * ratio);
                        await new Promise(r => setTimeout(r, 1000 / 30));
                    }

                    // Apply transition to next image (if exists)
                    if (nextImg && transitionType !== 'none') {
                        const transitionFrames = Math.floor(transitionDuration * 30);
                        for (let j = 0; j < transitionFrames; j++) {
                            const progress = j / transitionFrames;
                            applyTransition(currentImg, nextImg, progress, transitionType);
                            await new Promise(r => setTimeout(r, 1000 / 30));
                        }
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