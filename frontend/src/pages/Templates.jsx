import React, { useState } from "react";
import { base44 } from "../api/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Edit, Trash2, Clock, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import TemplateEditorModal from "@/components/templates/Templates";

export default function Templates() {
    const [searchQuery, setSearchQuery] = useState("");
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: analyses, refetch, isLoading } = useQuery({
        queryKey: ['all-analyses'],
        queryFn: async () => {
            const all = await base44.entities.VideoAnalysis.list('-created_date', 100);
            return all.filter(a => a.analysis_status === 'completed' && a.transitions?.length > 0);
        },
        initialData: [],
    });

    const filteredAnalyses = (analyses || []).filter(a =>
        a.video_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDuration = (seconds) => {
        if (typeof seconds !== 'number' || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEdit = (analysis) => {
        setEditingTemplate(analysis);
        setIsEditorOpen(true);
    };

    const handleDelete = async (id) => {
        // eslint-disable-next-line no-restricted-globals
        if (confirm('Delete this template? This cannot be undone.')) {
            await base44.entities.VideoAnalysis.delete(id);
            refetch(); // Refetch the list
            queryClient.invalidateQueries({ queryKey: ['completed-analyses'] }); // Invalidate composer list
        }
    };

    const handleSaveTemplate = async (updatedTemplate) => {
        await base44.entities.VideoAnalysis.update(updatedTemplate.id, {
            transitions: updatedTemplate.transitions,
            video_name: updatedTemplate.video_name
        });
        setIsEditorOpen(false);
        setEditingTemplate(null);
        refetch(); // Refetch this page
        queryClient.invalidateQueries({ queryKey: ['completed-analyses'] }); // Invalidate composer list
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6 text-white">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Transition Templates
                    </h1>
                    <p className="text-slate-400">
                        Manage and edit your extracted transition templates
                    </p>
                </div>

                {/* Search and Filters */}
                <div className="mb-6 flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search templates..."
                            className="pl-10 bg-slate-900 border-slate-800 text-white"
                        />
                    </div>
                    <Link to={createPageUrl("Dashboard")}>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            New Template
                        </Button>
                    </Link>
                </div>

                {/* Templates Grid */}
                {isLoading ? (
                    <div className="text-center py-16">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-12 h-12 border-2 border-purple-400 border-t-transparent rounded-full mx-auto"
                        />
                    </div>
                ) : filteredAnalyses.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                            <Zap className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
                        <p className="text-slate-400 mb-6">Analyze a video to create your first template</p>
                        <Link to={createPageUrl("Dashboard")}>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                Analyze Video
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAnalyses.map((analysis, index) => (
                            <motion.div
                                key={analysis.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all group">
                                    <CardContent className="p-0">
                                        {/* Video Thumbnail */}
                                        <div className="relative aspect-video bg-slate-800 rounded-t-lg overflow-hidden">
                                            <video
                                                src={analysis.video_url}
                                                className="w-full h-full object-cover"
                                                muted
                                                preload="metadata"
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleEdit(analysis)}
                                                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(analysis.id)}
                                                    className="bg-red-500/10 hover:bg-red-500/20 backdrop-blur-sm text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="p-4">
                                            <h3 className="text-white font-medium mb-2 truncate">
                                                {analysis.video_name}
                                            </h3>

                                            <div className="flex items-center justify-between text-sm mb-3">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Clock className="w-4 h-4" />
                                                    {formatDuration(analysis.duration)}
                                                </div>
                                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                                                    {analysis.transitions.length} cuts
                                                </Badge>
                                            </div>

                                            <p className="text-xs text-slate-500">
                                                {format(new Date(analysis.created_date), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {isEditorOpen && editingTemplate && (
                <TemplateEditorModal
                    template={editingTemplate}
                    onSave={handleSaveTemplate}
                    onClose={() => {
                        setIsEditorOpen(false);
                        setEditingTemplate(null);
                    }}
                />
            )}
        </div>
    );
}