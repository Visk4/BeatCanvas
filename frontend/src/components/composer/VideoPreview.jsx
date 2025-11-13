import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Eye } from "lucide-react";
import { motion } from "framer-motion";

export default function VideoPreview({ template, content, composedVideoUrl, isComposing }) {
    const canvasRef = useRef(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        if (!canvasRef.current || !content?.images || content.images.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Set canvas size
        canvas.width = 1280;
        canvas.height = 720;

        // Draw current image
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            // Clear canvas
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Scale image to fit
            const hRatio = canvas.width / img.width;
            const vRatio = canvas.height / img.height;
            const ratio = Math.min(hRatio, vRatio);
            const centerShiftX = (canvas.width - img.width * ratio) / 2;
            const centerShiftY = (canvas.height - img.height * ratio) / 2;

            ctx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                centerShiftX,
                centerShiftY,
                img.width * ratio,
                img.height * ratio
            );
        };

        if (content.images[currentSlide]) {
            img.src = content.images[currentSlide];
        }
    }, [content.images, currentSlide]);

    const formatTime = (seconds) => {
        if (typeof seconds !== "number" || seconds < 0) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-400" />
                    Preview
                </CardTitle>
                <p className="text-gray-400 text-sm">
                    Preview your video with applied transitions
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                {composedVideoUrl ? (
                    // ✅ Show composed video if ready
                    <div className="relative rounded-xl overflow-hidden">
                        <video
                            src={composedVideoUrl}
                            controls
                            className="w-full aspect-video bg-black"
                        />
                        <div className="absolute top-4 left-4">
                            <Badge className="bg-green-500/80 text-white">
                                Composed Video Ready
                            </Badge>
                        </div>
                    </div>
                ) : isComposing ? (
                    // ✅ Show loading spinner while composing
                    <div className="aspect-video bg-black rounded-xl flex items-center justify-center">
                        <div className="text-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-12 h-12 mx-auto mb-4 border-2 border-purple-400 border-t-transparent rounded-full"
                            />
                            <p className="text-white font-medium">Composing Video...</p>
                            <p className="text-gray-400 text-sm mt-2">
                                Applying transitions and rendering
                            </p>
                        </div>
                    </div>
                ) : (
                    // ✅ Image preview mode before video is composed
                    <>
                        <div className="relative rounded-xl overflow-hidden border border-white/20">
                            <canvas ref={canvasRef} className="w-full aspect-video bg-black" />

                            {content.images.length > 0 && (
                                <div className="absolute bottom-4 left-4 right-4">
                                    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
                                        <p className="text-white text-sm mb-2">
                                            Slide {currentSlide + 1} of {content.images.length}
                                        </p>
                                        <div className="flex gap-2">
                                            {content.images.map((_, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentSlide(index)}
                                                    className={`flex-1 h-2 rounded-full transition-colors ${index === currentSlide
                                                            ? "bg-gradient-to-r from-purple-500 to-cyan-500"
                                                            : "bg-white/20"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ✅ Transition timeline display */}
                        {template?.transitions?.length > 0 && (
                            <div className="bg-white/5 rounded-xl p-4">
                                <h4 className="text-white font-medium mb-3">
                                    Transition Timeline
                                </h4>
                                <div className="space-y-2">
                                    {template.transitions.map((transition, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/10"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant="outline"
                                                    className="border-purple-500/30 text-purple-300 capitalize text-xs"
                                                >
                                                    {transition.type}
                                                </Badge>
                                                <span className="text-gray-300 text-sm">
                                                    Slide {index + 1} → {index + 2}
                                                </span>
                                            </div>
                                            <div className="text-gray-400 text-sm font-mono">
                                                {formatTime(transition.timestamp)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
