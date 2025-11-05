import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import client from "@/api/client"; // Use the raw client
import { Brain, Zap, Eye, Volume2 } from "lucide-react";

export default function AnalysisProgress({ analysis, onComplete }) {
    const [progress, setProgress] = useState(10); // Start at 10%
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        { icon: Brain, label: "Processing video", description: "Analyzing video content" },
        { icon: Eye, label: "Detecting visuals", description: "Identifying visual transitions" },
        { icon: Volume2, label: "Analyzing audio", description: "Processing audio cues" },
        { icon: Zap, label: "Finalizing results", description: "Compiling transition data" }
    ];

    useEffect(() => {
        if (!analysis?.id) return;

        // This polls the backend for the real status
        const interval = setInterval(async () => {
            try {
                const { data: updatedAnalysis } = await client.get(`/analyses/${analysis.id}`);

                // Update mock progress
                setProgress(prev => Math.min(prev + 10, 95));

                if (updatedAnalysis.analysis_status === 'completed' || updatedAnalysis.analysis_status === 'failed') {
                    setProgress(100);
                    setCurrentStep(3);
                    clearInterval(interval);
                    setTimeout(() => onComplete(updatedAnalysis), 1000);
                }
            } catch (error) {
                console.error('Error checking analysis status:', error);
                clearInterval(interval);
                onComplete({ ...analysis, analysis_status: 'failed' });
            }
        }, 2500); // Check every 2.5 seconds

        return () => clearInterval(interval);
    }, [analysis?.id, onComplete]);

    // Update step based on progress
    useEffect(() => {
        if (progress > 75) setCurrentStep(3);
        else if (progress > 50) setCurrentStep(2);
        else if (progress > 25) setCurrentStep(1);
        else setCurrentStep(0);
    }, [progress]);

    if (!analysis) {
        return (
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardContent className="p-6 text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 mx-auto mb-4 border-2 border-purple-400 border-t-transparent rounded-full"
                    />
                    <p className="text-gray-300">Preparing analysis...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                        <Brain className="w-5 h-5 text-purple-400" />
                    </motion.div>
                    AI Analysis in Progress
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Progress</span>
                        <span className="text-white font-mono">{Math.round(progress)}%</span>
                    </div>
                    <Progress
                        value={progress}
                        className="h-2" // Removed bg-white/10 to use default
                    />
                </div>

                <div className="space-y-4">
                    {steps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep || progress === 100;

                        return (
                            <motion.div
                                key={index}
                                className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-purple-500/20 border border-purple-500/30' :
                                        isCompleted ? 'bg-green-500/10 border border-green-500/20 opacity-70' :
                                            'bg-white/5 border border-white/10 opacity-50'
                                    }`}
                                animate={isActive ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                                transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-purple-500/30 text-purple-300' :
                                        isCompleted ? 'bg-green-500/30 text-green-300' :
                                            'bg-white/10 text-gray-400'
                                    }`}>
                                    <StepIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className={`font-medium ${isActive ? 'text-purple-300' :
                                            isCompleted ? 'text-green-300' :
                                                'text-gray-300'
                                        }`}>
                                        {step.label}
                                    </p>
                                    <p className="text-sm text-gray-400">{step.description}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}