import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Zap, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function TemplateSelector({ analyses, selectedTemplate, onSelectTemplate }) {
    const formatDuration = (seconds) => {
        if (typeof seconds !== 'number' || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl h-full">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    Select Template
                </CardTitle>
                <p className="text-gray-400 text-sm">Choose a transition template to apply</p>
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-96">
                    <div className="space-y-3 pr-2">
                        {analyses.map((analysis, index) => (
                            <motion.div
                                key={analysis.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => onSelectTemplate(analysis)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${selectedTemplate?.id === analysis.id
                                        ? 'border-purple-500 bg-purple-500/20 ring-1 ring-purple-500'
                                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-medium mb-1 truncate">{analysis.video_name}</h4>
                                        <p className="text-gray-400 text-xs">
                                            {format(new Date(analysis.created_date), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                    {selectedTemplate?.id === analysis.id && (
                                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 ml-2" />
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1 text-gray-300">
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(analysis.duration)}
                                    </div>
                                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                                        {analysis.transitions.length} transitions
                                    </Badge>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}