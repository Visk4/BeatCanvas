import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Activity, Link as LinkIcon, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

// Correlate video transitions with audio beats
const correlateTransitionsWithBeats = (transitions, beats, strongBeats) => {
    const correlations = [];

    const validTransitions = Array.isArray(transitions) ? transitions : [];
    const validBeats = Array.isArray(beats) ? beats : [];
    const validStrongBeats = Array.isArray(strongBeats) ? strongBeats : [];

    for (const transition of validTransitions) {
        let closestBeat = null;
        let minDistance = Infinity;
        let isStrong = false;

        for (const beat of validStrongBeats) {
            const distance = Math.abs(beat.timestamp - transition.timestamp);
            if (distance < minDistance && distance < 2.0) {
                minDistance = distance;
                closestBeat = beat;
                isStrong = true;
            }
        }

        if (!closestBeat) {
            for (const beat of validBeats) {
                const distance = Math.abs(beat.timestamp - transition.timestamp);
                if (distance < minDistance && distance < 1.0) {
                    minDistance = distance;
                    closestBeat = beat;
                    isStrong = false;
                }
            }
        }

        correlations.push({
            transition,
            beat: closestBeat,
            distance: minDistance,
            isStrong,
            quality:
                minDistance < 0.5
                    ? "excellent"
                    : minDistance < 1.0
                        ? "good"
                        : minDistance < 2.0
                            ? "fair"
                            : "poor",
            needsAdjustment: minDistance > 0.5,
        });
    }

    return correlations;
};

// Suggest optimal transition timings based on beats
const suggestOptimalTimings = (transitions, strongBeats) => {
    const suggestions = [];

    if (!Array.isArray(transitions) || !Array.isArray(strongBeats) || strongBeats.length === 0) {
        return [];
    }

    const numTransitions = transitions.length;
    const numStrongBeats = strongBeats.length;

    if (numStrongBeats >= numTransitions) {
        const interval = Math.floor(numStrongBeats / numTransitions);
        for (let i = 0; i < numTransitions; i++) {
            const beatIndex = i * interval;
            if (strongBeats[beatIndex]) {
                suggestions.push({
                    originalTimestamp: transitions[i].timestamp,
                    suggestedTimestamp: strongBeats[beatIndex].timestamp,
                    beatType: strongBeats[beatIndex].type || "strong",
                    confidence: strongBeats[beatIndex].confidence || 0.8,
                    transitionType: transitions[i].type,
                });
            }
        }
    } else {
        for (let i = 0; i < numTransitions; i++) {
            const beatIndex = Math.floor((i / numTransitions) * numStrongBeats);
            suggestions.push({
                originalTimestamp: transitions[i].timestamp,
                suggestedTimestamp: strongBeats[beatIndex]?.timestamp || transitions[i].timestamp,
                beatType: strongBeats[beatIndex]?.type || "regular",
                confidence: strongBeats[beatIndex]?.confidence || 0.5,
                transitionType: transitions[i].type,
            });
        }
    }

    return suggestions;
};

export default function TransitionCorrelation({ template, beatAnalysis, onApplySuggestions }) {
    const [correlations, setCorrelations] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (template?.transitions && beatAnalysis?.beats) {
            const corr = correlateTransitionsWithBeats(
                template.transitions,
                beatAnalysis.beats,
                beatAnalysis.strongBeats
            );
            setCorrelations(corr);

            if (beatAnalysis.strongBeats?.length > 0) {
                const sugg = suggestOptimalTimings(template.transitions, beatAnalysis.strongBeats);
                setSuggestions(sugg);
            }
        }
    }, [template, beatAnalysis]);

    const formatTime = (seconds) => {
        if (typeof seconds !== "number" || seconds < 0) return "0:00.00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
    };

    const getQualityColor = (quality) => {
        switch (quality) {
            case "excellent":
                return "bg-green-500/20 text-green-300 border-green-500/30";
            case "good":
                return "bg-blue-500/20 text-blue-300 border-blue-500/30";
            case "fair":
                return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
            case "poor":
                return "bg-red-500/20 text-red-300 border-red-500/30";
            default:
                return "bg-gray-500/20 text-gray-300 border-gray-500/30";
        }
    };

    const avgQuality =
        correlations.length > 0
            ? correlations.filter((c) => c.quality === "excellent" || c.quality === "good").length /
            correlations.length
            : 0;

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        Audio-Visual Correlation
                    </CardTitle>
                    <Badge
                        className={`${avgQuality > 0.7
                                ? "bg-green-500/20 text-green-300 border-green-500/30"
                                : avgQuality > 0.4
                                    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                    : "bg-red-500/20 text-red-300 border-red-500/30"
                            } text-xs`}
                    >
                        {Math.round(avgQuality * 100)}% Match
                    </Badge>
                </div>
                <p className="text-gray-400 text-sm">
                    Correlation between video transitions and audio beats
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Correlation List */}
                <ScrollArea className="h-64">
                    <div className="space-y-3 pr-4">
                        {correlations.map((corr, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-4 rounded-xl border ${corr.quality === "excellent" || corr.quality === "good"
                                        ? "border-green-500/30 bg-green-500/5"
                                        : "border-yellow-500/30 bg-yellow-500/5"
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${corr.isStrong
                                                    ? "bg-yellow-500/20 text-yellow-300"
                                                    : "bg-cyan-500/20 text-cyan-300"
                                                }`}
                                        >
                                            <LinkIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <Badge
                                                variant="outline"
                                                className="border-purple-500/30 text-purple-300 mb-1 capitalize text-xs"
                                            >
                                                {corr.transition.type}
                                            </Badge>
                                            <p className="text-white font-mono text-sm">
                                                {formatTime(corr.transition.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className={`${getQualityColor(corr.quality)} text-xs capitalize`}>
                                        {corr.quality}
                                    </Badge>
                                </div>

                                {corr.beat ? (
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            {corr.quality === "excellent" || corr.quality === "good" ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                                            )}
                                            <span className="text-gray-300">
                                                Beat at {formatTime(corr.beat.timestamp)}
                                            </span>
                                        </div>
                                        <span className="text-gray-400">Δ {corr.distance.toFixed(2)}s</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-red-300">
                                        <AlertCircle className="w-4 h-4" />
                                        No nearby beat found
                                    </div>
                                )}

                                {corr.beat && corr.isStrong && (
                                    <Badge className="mt-2 bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs capitalize">
                                        Strong Beat: {corr.beat.type?.replace("_", " ")}
                                    </Badge>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </ScrollArea>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <h4 className="text-white font-medium flex items-center gap-2">
                                Suggested Optimizations
                            </h4>
                            <Button
                                size="sm"
                                variant={showSuggestions ? "outline" : "default"}
                                onClick={() => setShowSuggestions(!showSuggestions)}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                {showSuggestions ? "Hide" : "Show"}
                            </Button>
                        </div>

                        {showSuggestions && (
                            <div className="space-y-2">
                                {suggestions.map((s, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="p-3 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="text-gray-300 text-sm">
                                                <span className="text-purple-400 capitalize">{s.transitionType}</span>{" "}
                                                → {formatTime(s.suggestedTimestamp)}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                Beat type: {s.beatType} · Confidence: {(s.confidence * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                                            Δ {(s.suggestedTimestamp - s.originalTimestamp).toFixed(2)}s
                                        </Badge>
                                    </motion.div>
                                ))}

                                <div className="pt-2 text-right">
                                    <Button
                                        size="sm"
                                        onClick={() => onApplySuggestions?.(suggestions)}
                                        className="bg-cyan-600 hover:bg-cyan-700 text-white"
                                    >
                                        Apply Suggestions
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
