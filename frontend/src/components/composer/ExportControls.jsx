import React, { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Download, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ExportControls({ template, content, beatAnalysis, onComposeStart, onComposeEnd, composedVideoUrl, isComposing }) {

    const composeVideo = async () => {
        console.log('🎥 Starting composition with template:', template);
        console.log('Template transitions:', template?.transitions);
        onComposeStart();

        try {
            // Prepare images
            const images = content.images || [];
            if (images.length === 0) {
                alert('Please upload images first');
                onComposeEnd(null);
                return;
            }

            // Prepare transitions data
            let transitions = template?.transitions || [];
            const duration = beatAnalysis?.duration || template?.duration || 10;

            // If no template transitions but we have beat analysis, create transitions from beats
            if (transitions.length === 0 && beatAnalysis?.strongBeats?.length > 0) {
                console.log('📊 Creating transitions from beat analysis');
                transitions = beatAnalysis.strongBeats.slice(0, images.length).map((beat, i) => ({
                    timestamp: beat,
                    transition_type: 'fade',
                    transition_duration: 0.5
                }));
            }

            console.log('📦 Preparing composition request:');
            console.log('  Images:', images.length);
            console.log('  Audio:', content.audio ? 'Yes' : 'No');
            console.log('  Transitions:', transitions.length);
            console.log('  Transition details:', transitions);
            console.log('  Duration:', duration);

            // Create FormData for multipart upload
            const formData = new FormData();

            // Add images - fetch and convert to File objects
            for (let i = 0; i < images.length; i++) {
                const imageUrl = images[i];
                console.log(`  Fetching image ${i + 1}:`, imageUrl);

                const response = await fetch(imageUrl);
                const blob = await response.blob();
                formData.append('images', blob, `image_${i}.jpg`);
            }

            // Add audio if available
            if (content.audio) {
                console.log('  Fetching audio:', content.audio);
                const audioResponse = await fetch(content.audio);
                const audioBlob = await audioResponse.blob();
                formData.append('audio', audioBlob, 'audio.mp3');
            }

            // Add transitions as JSON
            formData.append('transitions_json', JSON.stringify(transitions));
            formData.append('duration', duration.toString());

            console.log('🚀 Sending composition request to backend...');

            // Call backend API
            const response = await fetch('http://localhost:8000/api/v1/compose-video', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Composition failed');
            }

            const result = await response.json();
            console.log('✅ Composition successful:', result);

            onComposeEnd(result.video_url);

        } catch (error) {
            console.error('❌ Composition error:', error);
            alert(`Video composition failed: ${error.message}`);
            onComposeEnd(null);
        }
    };

    const downloadVideo = () => {
        if (!composedVideoUrl) return;

        const a = document.createElement('a');
        a.href = composedVideoUrl;
        a.download = `composed-video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const canCompose = (content.images.length > 0 || content.video) && !isComposing;

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardContent className="p-6">
                {/* Video Preview */}
                {composedVideoUrl && (
                    <div className="mb-6">
                        <h3 className="text-white text-lg font-semibold mb-3">✅ Composed Video</h3>
                        <div className="bg-black rounded-lg overflow-hidden">
                            <video
                                src={composedVideoUrl}
                                controls
                                className="w-full max-h-[600px]"
                                style={{ display: 'block' }}
                            />
                        </div>
                    </div>
                )}

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
                        <Button
                            onClick={downloadVideo}
                            className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Video
                        </Button>
                    )}
                </div>

                <p className="text-white/60 text-sm mt-4 text-center">
                    {!composedVideoUrl
                        ? "Click Compose to create your video with professional FFmpeg transitions"
                        : "Your video is ready! Download or share it."}
                </p>
            </CardContent>
        </Card>
    );
}
