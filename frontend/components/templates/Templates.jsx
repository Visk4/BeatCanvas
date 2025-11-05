import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Scissors, Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";

export default function TemplateEditorModal({ template, onSave, onClose }) {
    const [editedTemplate, setEditedTemplate] = useState({
        ...template,
        transitions: [...template.transitions]
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [selectedTransition, setSelectedTransition] = useState(null);
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = currentTime;
        }
    }, [currentTime]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
        }
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds < 0) seconds = 0;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, "0")}.${ms
            .toString()
            .padStart(2, "0")}`;
    };

    const handleTimelineClick = (e) => {
        if (!duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newTime = (x / rect.width) * duration;
        setCurrentTime(newTime);
        if (videoRef.current) videoRef.current.currentTime = newTime;
    };

    const addTransitionAtCurrentTime = () => {
        const newTransition = {
            timestamp: currentTime,
            type: "cut",
            confidence: 1.0,
            visual_cue: "Manual transition added",
            audio_cue: "Manual audio transition"
        };
        const newTransitions = [...editedTemplate.transitions, newTransition].sort(
            (a, b) => a.timestamp - b.timestamp
        );
        setEditedTemplate({ ...editedTemplate, transitions: newTransitions });
    };

    const updateTransition = (index, field, value) => {
        const newTransitions = [...editedTemplate.transitions];
        const updatedTimestamp =
            field === "timestamp" ? parseFloat(value) : newTransitions[index][field];
        newTransitions[index] = {
            ...newTransitions[index],
            [field]: field === "timestamp" ? updatedTimestamp : value
        };
        setEditedTemplate({
            ...editedTemplate,
            transitions:
                field === "timestamp"
                    ? newTransitions.sort((a, b) => a.timestamp - b.timestamp)
                    : newTransitions
        });
    };

    const deleteTransition = (index) => {
        const newTransitions = editedTemplate.transitions.filter((_, i) => i !== index);
        setEditedTemplate({ ...editedTemplate, transitions: newTransitions });
        setSelectedTransition(null);
    };

    const jumpToTransition = (timestamp) => {
        setCurrentTime(timestamp);
        if (videoRef.current) videoRef.current.currentTime = timestamp;
    };

    const handleSave = () => onSave(editedTemplate);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-1">Edit Template</h2>
                        <Input
                            value={editedTemplate.video_name}
                            onChange={(e) =>
                                setEditedTemplate({ ...editedTemplate, video_name: e.target.value })
                            }
                            className="bg-slate-800 border-slate-700 text-white mt-2"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setEditedTemplate(template)}
                            variant="outline"
                            className="border-slate-700 hover:bg-slate-800 text-white"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="icon"
                            className="hover:bg-slate-800 text-white"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Video Player */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                <video
                                    ref={videoRef}
                                    src={template.video_url}
                                    className="w-full h-full"
                                    onTimeUpdate={() =>
                                        setCurrentTime(videoRef.current?.currentTime || 0)
                                    }
                                    onLoadedMetadata={() =>
                                        setDuration(videoRef.current?.duration || 0)
                                    }
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    onEnded={() => setIsPlaying(false)}
                                    preload="metadata"
                                />

                                {/* Play/Pause Overlay */}
                                <div
                                    onClick={togglePlay}
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    {isPlaying ? (
                                        <Pause className="w-16 h-16 text-white" />
                                    ) : (
                                        <Play className="w-16 h-16 text-white ml-2" />
                                    )}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="bg-slate-800 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-white font-mono text-sm">
                                        {formatTime(currentTime)}
                                    </span>
                                    <Button
                                        onClick={addTransitionAtCurrentTime}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Cut Here
                                    </Button>
                                    <span className="text-slate-400 font-mono text-sm">
                                        {formatTime(duration)}
                                    </span>
                                </div>

                                <div
                                    onClick={handleTimelineClick}
                                    className="relative h-16 bg-slate-700 rounded-lg cursor-pointer overflow-hidden"
                                >
                                    <div
                                        className="absolute top-0 left-0 h-full bg-blue-600/30"
                                        style={{ width: `${(currentTime / duration) * 100}%` }}
                                    />

                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none"
                                        style={{ left: `${(currentTime / duration) * 100}%` }}
                                    >
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full" />
                                    </div>

                                    {editedTemplate.transitions.map((transition, index) => (
                                        <div
                                            key={index}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                jumpToTransition(transition.timestamp);
                                                setSelectedTransition(index);
                                            }}
                                            className={`absolute top-0 bottom-0 cursor-pointer transition-all ${selectedTransition === index
                                                    ? "bg-yellow-400 w-2 z-10"
                                                    : "bg-white/60 hover:bg-white hover:w-1.5"
                                                }`}
                                            style={{
                                                left: `${(transition.timestamp / duration) * 100}%`
                                            }}
                                        >
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] bg-slate-900 px-1 rounded whitespace-nowrap text-white capitalize">
                                                {transition.type}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2 mt-3">
                                    <Button
                                        onClick={togglePlay}
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-700 hover:bg-slate-700 text-white"
                                    >
                                        {isPlaying ? (
                                            <Pause className="w-4 h-4" />
                                        ) : (
                                            <Play className="w-4 h-4 ml-0.5" />
                                        )}
                                    </Button>
                                    <span className="text-slate-400 text-sm">
                                        {editedTemplate.transitions.length} transitions
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Transitions List */}
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            <h3 className="text-white font-medium flex items-center gap-2 sticky top-0 bg-slate-900 py-2 z-10">
                                <Scissors className="w-4 h-4" />
                                Transitions
                            </h3>

                            <AnimatePresence>
                                {editedTemplate.transitions.map((transition, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        onClick={() => {
                                            setSelectedTransition(index);
                                            jumpToTransition(transition.timestamp);
                                        }}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedTransition === index
                                                ? "border-blue-500 bg-blue-500/10"
                                                : "border-slate-800 bg-slate-800/50 hover:border-slate-700"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={transition.timestamp.toFixed(2)}
                                                onChange={(e) =>
                                                    updateTransition(index, "timestamp", e.target.value)
                                                }
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-white font-mono text-sm w-24 bg-slate-700 border-slate-600"
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteTransition(index);
                                                }}
                                                className="h-7 w-7 hover:bg-red-500/10 hover:text-red-400 text-slate-400"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>

                                        <Select
                                            value={transition.type}
                                            onValueChange={(value) =>
                                                updateTransition(index, "type", value)
                                            }
                                        >
                                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                                <SelectValue placeholder="Select transition" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cut">Cut</SelectItem>
                                                <SelectItem value="fade">Fade</SelectItem>
                                                <SelectItem value="dissolve">Dissolve</SelectItem>
                                                <SelectItem value="wipe">Wipe</SelectItem>
                                                <SelectItem value="zoom">Zoom</SelectItem>
                                                <SelectItem value="pan">Pan</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <div className="mt-2">
                                            <Badge className="bg-slate-700 text-slate-300">
                                                {Math.round(transition.confidence * 100)}% confidence
                                            </Badge>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
