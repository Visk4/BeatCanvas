import React from "react";
import { base44 } from "../api/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Clock, Zap, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/index";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function History() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: analyses, isLoading: loading, refetch } = useQuery({
        queryKey: ['analyses-history'],
        queryFn: () => base44.entities.VideoAnalysis.list({ sort: '-created_date', limit: 20 }),
        initialData: [],
        refetchOnWindowFocus: true,
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'processing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const formatDuration = (seconds) => {
        if (typeof seconds !== 'number' || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDelete = async (id) => {
        // eslint-disable-next-line no-restricted-globals
        if (confirm('Delete this analysis? This cannot be undone.')) {
            await base44.entities.VideoAnalysis.delete(id);
            // Invalidate queries to force a refetch across the app
            queryClient.invalidateQueries({ queryKey: ['analyses-history'] });
            queryClient.invalidateQueries({ queryKey: ['all-analyses'] });
            queryClient.invalidateQueries({ queryKey: ['completed-analyses'] });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 md:p-8 flex items-center justify-center text-white">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-2 border-purple-400 border-t-transparent rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 text-white">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                        Analysis History
                    </h1>
                    <p className="text-gray-300">View and manage your previous video analyses</p>
                </motion.div>

                {analyses.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full flex items-center justify-center">
                            <Zap className="w-12 h-12 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No analyses yet</h3>
                        <p className="text-gray-400 mb-6">Start by uploading your first video for analysis</p>
                        <Link to={createPageUrl("Dashboard")}>
                            <Button className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white">
                                Start Analysis
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {analyses.map((analysis, index) => (
                            <motion.div
                                key={analysis.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="bg-black/40 border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-white text-lg font-semibold truncate">
                                                {analysis.video_name}
                                            </CardTitle>
                                            <Badge className={`${getStatusColor(analysis.analysis_status)} border text-xs`}>
                                                {analysis.analysis_status}
                                            </Badge>
                                        </div>
                                        <p className="text-gray-400 text-sm">
                                            {format(new Date(analysis.created_date), 'MMM d, yyyy • h:mm a')}
                                        </p>
                                    </CardHeader>
                                    <CardContent className="space-y-4 p-4 pt-0">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <Clock className="w-4 h-4" />
                                                {analysis.duration ? formatDuration(analysis.duration) : 'Unknown'}
                                            </div>
                                            {analysis.transitions && (
                                                <div className="flex items-center gap-2 text-cyan-400">
                                                    <Zap className="w-4 h-4" />
                                                    {analysis.transitions.length} transitions
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {analysis.analysis_status === 'completed' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white"
                                                        onClick={() => navigate(createPageUrl('Dashboard', { analysisId: analysis.id }))}
                                                    >
                                                        <Play className="w-4 h-4 mr-2" />
                                                        View
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="border-white/20 hover:bg-white/5 text-white">
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {analysis.analysis_status !== 'completed' && (
                                                <Button size="sm" disabled className="flex-1 bg-gray-600 text-white">
                                                    {analysis.analysis_status}...
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500/70 hover:bg-red-500/10 hover:text-red-400"
                                                onClick={() => handleDelete(analysis.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}