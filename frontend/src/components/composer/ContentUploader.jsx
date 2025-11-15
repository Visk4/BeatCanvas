import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Upload, Image, Video, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserImageGallery from "../UserImageGallery";

export default function ContentUploader({ requiredImages, uploadedContent, onContentChange }) {
    const [uploadMode, setUploadMode] = useState("images"); // 'images' or 'video'
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const imageUrls = files.map((file) => URL.createObjectURL(file));
        onContentChange({
            ...uploadedContent,
            images: [...uploadedContent.images, ...imageUrls].slice(0, requiredImages),
            imageFiles: [...(uploadedContent.imageFiles || []), ...files].slice(0, requiredImages),
        });
    };

    const handleGalleryImageSelect = (imageUrl) => {
        onContentChange({
            ...uploadedContent,
            images: [...uploadedContent.images, imageUrl].slice(0, requiredImages),
        });
    };

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            onContentChange({
                ...uploadedContent,
                video: URL.createObjectURL(file),
                videoFile: file,
            });
        }
    };

    const removeImage = (index) => {
        const newImages = uploadedContent.images.filter((_, i) => i !== index);
        const newFiles = (uploadedContent.imageFiles || []).filter((_, i) => i !== index);
        onContentChange({ ...uploadedContent, images: newImages, imageFiles: newFiles });
    };

    const removeVideo = () => {
        onContentChange({ ...uploadedContent, video: null, videoFile: null });
    };

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-cyan-400" />
                    Upload Content
                </CardTitle>
                <p className="text-gray-400 text-sm">
                    {uploadMode === "images"
                        ? `Upload ${requiredImages} images (${uploadedContent.images.length}/${requiredImages})`
                        : "Upload a video to apply transitions"}
                </p>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Mode selector */}
                <div className="flex gap-2">
                    <Button
                        variant={uploadMode === "images" ? "default" : "outline"}
                        onClick={() => setUploadMode("images")}
                        className={
                            uploadMode === "images"
                                ? "bg-purple-500 hover:bg-purple-600 text-white"
                                : "border-white/20 hover:bg-white/5 text-white"
                        }
                    >
                        <Image className="w-4 h-4 mr-2" />
                        Images
                    </Button>

                    <Button
                        variant={uploadMode === "video" ? "default" : "outline"}
                        onClick={() => setUploadMode("video")}
                        className={
                            uploadMode === "video"
                                ? "bg-purple-500 hover:bg-purple-600 text-white"
                                : "border-white/20 hover:bg-white/5 text-white"
                        }
                    >
                        <Video className="w-4 h-4 mr-2" />
                        Video
                    </Button>
                </div>

                {/* Images upload */}
                {uploadMode === "images" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={() => imageInputRef.current?.click()}
                                disabled={uploadedContent.images.length >= requiredImages}
                                className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 text-white"
                            >
                                <Image className="w-4 h-4 mr-2" />
                                Upload Images
                            </Button>

                            <UserImageGallery onSelectImage={handleGalleryImageSelect} />
                        </div>

                        <div className="text-center text-sm text-white/70">
                            {uploadedContent.images.length}/{requiredImages} images selected
                        </div>

                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                        />

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <AnimatePresence>
                                {uploadedContent.images.map((img, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="relative aspect-video rounded-lg overflow-hidden border border-white/20 group"
                                    >
                                        <img
                                            src={img}
                                            alt={`Upload ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2 left-2">
                                            <Badge className="bg-black/60 text-white text-xs">
                                                #{index + 1}
                                            </Badge>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 h-6 w-6 bg-black/60 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>

                                        {/* Show transition label under image */}
                                        {index < requiredImages - 1 && (
                                            <div className="absolute bottom-2 right-2 text-xs bg-purple-500/80 text-white px-2 py-0.5 rounded">
                                                Transition {index + 1}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* Video upload */}
                {uploadMode === "video" && (
                    <div className="space-y-4">
                        {!uploadedContent.video ? (
                            <div
                                onClick={() => videoInputRef.current?.click()}
                                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-white/30 transition-colors"
                            >
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full flex items-center justify-center">
                                    <Video className="w-8 h-8 text-cyan-400" />
                                </div>
                                <p className="text-white font-medium mb-2">Upload Video</p>
                                <p className="text-gray-400 text-sm">
                                    Transitions will be applied to your video
                                </p>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative rounded-xl overflow-hidden border border-white/20 group"
                            >
                                <video
                                    src={uploadedContent.video}
                                    className="w-full aspect-video bg-black"
                                    controls
                                />
                                <Button
                                    size="icon"
                                    onClick={removeVideo}
                                    className="absolute top-4 right-4 bg-black/60 hover:bg-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                                <div className="absolute top-4 left-4">
                                    <Badge className="bg-green-500/80 text-white flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Video Ready
                                    </Badge>
                                </div>
                            </motion.div>
                        )}

                        <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleVideoUpload}
                            className="hidden"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
