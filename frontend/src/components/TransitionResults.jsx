import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Play, Eye, Volume2, Download, Zap } from "lucide-react";
import { cn } from "@/utils";

export default function TransitionResults({
    analysis,
    onTimestampSelect,
    selectedTimestamp,
}) {
    const [filter, setFilter] = useState("all");

    const getTransitionIcon = (type) => {
        switch (type) {
            case "cut":
                return "✂️";
            case "fade":
                return "🌅";
            case "dissolve":
                return "💫";
            case "wipe":
                return "↔️";
            case "zoom":
                return "🔍";
            case "pan":
                return "↩️";
            default:
                return "⚡";
        }
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8)
            return "text-green-400 bg-green-400/20 border-green-400/30";
        if (confidence >= 0.6)
            return "text-yellow-400 bg-yellow-400/20 border-yellow-400/30";
        return "text-red-400 bg-red-400/20 border-red-400/30";
    };

    const formatTime = (seconds) => {
        if (typeof seconds !== "number" || seconds < 0) return "0:00.00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, "0")}.${ms
            .toString()
            .padStart(2, "0")}`;
    };

    const filteredTransitions =
        analysis.transitions
            ?.filter((t) => filter === "all" || t.type === filter)
            .sort((a, b) => a.timestamp - b.timestamp) || [];

    const exportResults = () => {
        const exportData = filteredTransitions.map((t) => ({
            timestamp: formatTime(t.timestamp),
            type: t.type,
            confidence: `${Math.round(t.confidence * 100)}%`,
            visual_cue: t.visual_cue,
            audio_cue: t.audio_cue,
        }));

        const csv = [
            "Timestamp,Type,Confidence,Visual Cue,Audio Cue",
            ...exportData.map(
                (row) =>
                    `"${row.timestamp}","${row.type}","${row.confidence}","${row.visual_cue}","${row.audio_cue}"`
            ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${analysis.video_name}_transitions.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const transitionTypes = [
        "all",
        ...new Set(analysis.transitions?.map((t) => t.type) || []),
    ];

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-purple-400" />
                        Detected Transitions
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                            {filteredTransitions.length} found
                        </Badge>
                    </CardTitle>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportResults}
                        className="border-white/20 hover:bg-white/5 text-white"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap mt-4">
                    {transitionTypes.map((type) => (
                        <Button
                            key={type}
                            variant={filter === type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter(type)}
                            className={cn(
                                "capitalize",
                                filter === type
                                    ? "bg-purple-500 hover:bg-purple-600 text-white"
                                    : "border-white/20 hover:bg-white/5 text-white"
                            )}
                        >
                            {type}
                        </Button>
                    ))}
                </div>
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-96">
                    <div className="space-y-3">
                        {filteredTransitions.map((transition, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={cn(
                                    "p-4 rounded-xl border transition-all duration-300 cursor-pointer",
                                    selectedTimestamp === transition.timestamp
                                        ? "border-purple-500 bg-purple-500/10"
                                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                                )}
                                onClick={() => onTimestampSelect(transition.timestamp)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">
                                            {getTransitionIcon(transition.type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-mono font-semibold">
                                                    {formatTime(transition.timestamp)}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="border-cyan-500/30 text-cyan-300 capitalize text-xs"
                                                >
                                                    {transition.type}
                                                </Badge>
                                            </div>

                                            <Badge
                                                className={cn(
                                                    "text-xs border mt-1",
                                                    getConfidenceColor(transition.confidence)
                                                )}
                                            >
                                                {Math.round(transition.confidence * 100)}% confidence
                                            </Badge>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTimestampSelect(transition.timestamp);
                                        }}
                                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-0"
                                    >
                                        <Play className="w-3 h-3" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-start gap-2">
                                        <Eye className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-cyan-300 font-medium mb-1">
                                                Visual Cue
                                            </p>
                                            <p className="text-gray-300">{transition.visual_cue}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <Volume2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-green-300 font-medium mb-1">
                                                Audio Cue
                                            </p>
                                            <p className="text-gray-300">{transition.audio_cue}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
