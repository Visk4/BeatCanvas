import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "../src/utils"; // Adjust relative path if needed

// Helper: get confidence color for badge styling
const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9)
        return "text-green-400 border-green-500/30 bg-green-500/10";
    if (confidence >= 0.7)
        return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
};

// Helper: format seconds → mm:ss
const formatTime = (time) => {
    if (isNaN(time) || time < 0) time = 0;
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Helper: convert confidence → color for markers
const confidenceToBgColor = (confidence) => {
    if (confidence >= 0.9) return "#22c55e"; // green
    if (confidence >= 0.7) return "#facc15"; // yellow
    return "#f87171"; // red
};

export default function VideoPlayer({
    analysis,
    selectedTimestamp,
    onTimestampSelect,
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef(null);

    // Seek to a selected timestamp
    useEffect(() => {
        if (selectedTimestamp !== null && videoRef.current) {
            videoRef.current.currentTime = selectedTimestamp;
            setCurrentTime(selectedTimestamp);
            if (!isPlaying && videoRef.current.paused) {
                videoRef.current.play();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTimestamp]);

    // Handle mute/volume updates
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    const togglePlay = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (e) => {
        e.stopPropagation();
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (newVolume > 0 && isMuted) setIsMuted(false);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            videoRef.current.volume = isMuted ? 0 : volume;
            videoRef.current.muted = isMuted;
        }
    };

    const handleTimelineClick = (e) => {
        if (!videoRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / rect.width) * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleTimelineMarkerClick = (timestamp) => {
        if (videoRef.current) {
            videoRef.current.currentTime = timestamp;
            setCurrentTime(timestamp);
            if (!isPlaying) videoRef.current.play();
        }
        if (onTimestampSelect) onTimestampSelect(timestamp);
    };

    const getTransitionAtTime = (time) => {
        if (!analysis?.transitions) return null;
        const windowSize = 0.5;
        return analysis.transitions.find(
            (t) => time >= t.timestamp - windowSize && time < t.timestamp + windowSize
        );
    };

    const currentTransition = getTransitionAtTime(currentTime);

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden w-full">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2 text-sm md:text-base">
                        <div
                            className={`w-3 h-3 ${isPlaying ? "bg-green-400 animate-pulse" : "bg-gray-400"
                                } rounded-full transition-colors`}
                        ></div>
                        {analysis?.video_name || "Video Player"}
                    </CardTitle>

                    {currentTransition && (
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-xs capitalize",
                                getConfidenceColor(currentTransition.confidence)
                            )}
                        >
                            {currentTransition.type} transition nearby
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Video Container */}
                <div
                    className="relative group cursor-pointer aspect-video bg-black rounded-lg overflow-hidden"
                    onClick={togglePlay}
                >
                    <video
                        ref={videoRef}
                        src={analysis?.video_url}
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        playsInline
                        preload="metadata"
                        key={analysis?.video_url}
                    />

                    {/* Overlay Play Button */}
                    <div
                        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 flex items-center justify-center pointer-events-none ${!isPlaying
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                    >
                        <div
                            className="bg-black/70 text-white rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center pointer-events-auto"
                            onClick={togglePlay}
                        >
                            {isPlaying ? (
                                <Pause className="w-5 h-5 md:w-6 md:h-6" />
                            ) : (
                                <Play className="w-5 h-5 md:w-6 md:h-6 ml-1" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Timeline + Controls */}
                <div className="p-4 space-y-3 bg-gradient-to-t from-black/50 to-transparent">
                    {/* Timeline Bar */}
                    <div
                        className="relative w-full h-2 bg-white/20 rounded-full cursor-pointer group/timeline"
                        onClick={handleTimelineClick}
                    >
                        <motion.div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full z-10"
                            style={{
                                width:
                                    duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />

                        {/* Transition Markers */}
                        {analysis?.transitions?.map((transition, index) => (
                            <motion.div
                                key={`marker-${index}-${transition.timestamp}`}
                                className={cn(
                                    "absolute top-1/2 w-2.5 h-2.5 rounded-full transform -translate-y-1/2 -translate-x-1/2 cursor-pointer border border-black/50 z-20",
                                    selectedTimestamp === transition.timestamp
                                        ? "ring-2 ring-white ring-offset-2 ring-offset-black/50 scale-125"
                                        : ""
                                )}
                                style={{
                                    left:
                                        duration > 0
                                            ? `${(transition.timestamp / duration) * 100}%`
                                            : "0%",
                                    backgroundColor: confidenceToBgColor(transition.confidence),
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleTimelineMarkerClick(transition.timestamp);
                                }}
                                whileHover={{ scale: 1.5, zIndex: 30 }}
                                whileTap={{ scale: 1.3 }}
                                title={`${transition.type} at ${formatTime(
                                    transition.timestamp
                                )} (Conf: ${Math.round(transition.confidence * 100)}%)`}
                            />
                        ))}
                    </div>

                    {/* Time display */}
                    <div className="flex items-center justify-between text-white text-xs font-mono opacity-80">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    {/* Volume Controls */}
                    <div className="flex items-center gap-2 pt-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMute}
                            className="text-white hover:bg-white/10 p-1"
                        >
                            {isMuted || volume === 0 ? (
                                <VolumeX className="w-4 h-4" />
                            ) : (
                                <Volume2 className="w-4 h-4" />
                            )}
                        </Button>

                        <input
                            type="range"
                            max="1"
                            step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            onClick={(e) => e.stopPropagation()}
                            className="w-24 accent-purple-500"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
