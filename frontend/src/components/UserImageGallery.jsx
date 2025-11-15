import React, { useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "../api/client";

export default function UserImageGallery({ onSelectImage }) {
    const [showGallery, setShowGallery] = useState(false);
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();

    const { data: images = [], isLoading } = useQuery({
        queryKey: ['user-images'],
        queryFn: async () => {
            const response = await base44.client.get('/user-images');
            return response.data || [];
        },
        enabled: showGallery
    });

    const uploadMutation = useMutation({
        mutationFn: async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await base44.client.post('/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-images'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (imageId) => {
            await base44.client.delete(`/user-images/${imageId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-images'] });
        }
    });

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadMutation.mutate(file);
        }
        e.target.value = '';
    };

    const handleImageClick = (image) => {
        if (onSelectImage) {
            onSelectImage(image.file_url);
        }
        setShowGallery(false);
    };

    return (
        <>
            <button
                onClick={() => setShowGallery(true)}
                style={{
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                <span>🖼️</span>
                <span>My Gallery</span>
            </button>

            <AnimatePresence>
                {showGallery && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowGallery(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                backgroundColor: '#1f2937',
                                borderRadius: '12px',
                                maxWidth: '900px',
                                width: '100%',
                                maxHeight: '80vh',
                                overflow: 'auto',
                                border: '1px solid #374151'
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '20px',
                                borderBottom: '1px solid #374151',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                position: 'sticky',
                                top: 0,
                                backgroundColor: '#1f2937',
                                zIndex: 1
                            }}>
                                <h2 style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '600',
                                    color: '#e5e7eb',
                                    margin: 0
                                }}>
                                    My Image Gallery
                                </h2>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadMutation.isPending}
                                        style={{
                                            padding: '8px 16px',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: 'white',
                                            fontWeight: '500',
                                            cursor: uploadMutation.isPending ? 'not-allowed' : 'pointer',
                                            fontSize: '13px',
                                            opacity: uploadMutation.isPending ? 0.6 : 1
                                        }}
                                    >
                                        {uploadMutation.isPending ? 'Uploading...' : '+ Upload'}
                                    </button>
                                    <button
                                        onClick={() => setShowGallery(false)}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: '#374151',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: '#e5e7eb',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />

                            {/* Gallery Grid */}
                            <div style={{ padding: '20px' }}>
                                {isLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            border: '3px solid #374151',
                                            borderTop: '3px solid #667eea',
                                            borderRadius: '50%',
                                            margin: '0 auto 15px',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        Loading images...
                                    </div>
                                ) : images.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                                        <div style={{ fontSize: '64px', marginBottom: '15px' }}>📷</div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#9ca3af', marginBottom: '8px' }}>
                                            No images yet
                                        </h3>
                                        <p style={{ fontSize: '14px', marginBottom: '20px' }}>
                                            Upload your first image to start building your gallery
                                        </p>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                padding: '10px 20px',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'white',
                                                fontWeight: '500',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Upload Image
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                        gap: '15px'
                                    }}>
                                        {images.map((image) => (
                                            <motion.div
                                                key={image.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                style={{
                                                    position: 'relative',
                                                    aspectRatio: '1',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    border: '1px solid #374151',
                                                    transition: 'transform 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                onClick={() => handleImageClick(image)}
                                            >
                                                <img
                                                    src={image.file_url}
                                                    alt={image.original_name}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm('Delete this image?')) {
                                                            deleteMutation.mutate(image.id);
                                                        }
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                                        border: 'none',
                                                        color: 'white',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        opacity: 0,
                                                        transition: 'opacity 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                    className="delete-btn"
                                                >
                                                    🗑
                                                </button>
                                                <style>{`
                                                    .delete-btn:hover { opacity: 1 !important; }
                                                    div:hover .delete-btn { opacity: 1; }
                                                `}</style>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
