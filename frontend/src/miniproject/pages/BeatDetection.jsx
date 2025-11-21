import React, { useState, useRef } from "react";
import "../styles/BeatDetection.css";
import UserProfile from "../../components/UserProfile";
import Particles from "../../components/Particles";
import PillNav from "../../components/PillNav";
import { useNavigate, Link, useLocation } from "react-router-dom";

export default function BeatDetection() {
    const [audioFile, setAudioFile] = useState(null);
    const [audioURL, setAudioURL] = useState(null);
    const [beatData, setBeatData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [blockImages, setBlockImages] = useState({});
    const fileInputs = useRef({});
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { label: 'Home', href: '/' },
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Templates', href: '/template-extraction' },
        { label: 'Beat Detect', href: '/beat-detection' },
        { label: 'Composer', href: '/composer' },
        { label: 'History', href: '/history' }
    ];

    const handleAudioUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAudioFile(file);
            setAudioURL(URL.createObjectURL(file));
        }
    };

    const handleBeatDetection = async () => {
        if (!audioFile) {
            alert("Please upload an audio file first!");
            return;
        }
        setLoading(true);
        try {
            // Uncomment to call a live backend endpoint
            // const formData = new FormData();
            // formData.append("file", audioFile);
            // const res = await fetch("http://127.0.0.1:8000/detect-beats", {
            //   method: "POST",
            //   body: formData,
            // });
            // if (!res.ok) throw new Error("Failed to detect beats");
            // const data = await res.json();
            // setBeatData(data);

            // Fallback mock beats to demonstrate UI
            await new Promise((r) => setTimeout(r, 800));
            setBeatData({ beats: [0.5, 1.4, 2.8, 3.6, 5.0, 7.2, 9.1], duration: 10.0, tempo: 120 });
        } catch (err) {
            console.error(err);
            alert("Error detecting beats. Check backend.");
        } finally {
            setLoading(false);
        }
    };

    const handleBlockImageUpload = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const newImages = {};
            files.forEach((file, i) => {
                newImages[Object.keys(blockImages).length + i] = URL.createObjectURL(file);
            });
            setBlockImages((prev) => ({ ...prev, ...newImages }));
        }
    };

    const handleGoToEditor = async () => {
        if (!beatData) return;

        try {
            setLoading(true);

            // Create a VideoAnalysis template from beat data with varied transitions
            const transitionTypes = ['fade', 'dissolve', 'wipeleft', 'wiperight', 'slideup', 'slidedown'];
            const transitions = beatData.beats.map((beat, i) => {
                const randomType = transitionTypes[i % transitionTypes.length];
                return {
                    timestamp: beat,
                    transition_type: randomType,
                    transition_duration: 0.5,
                    type: randomType,  // Keep for backwards compat
                    confidence: 0.95
                };
            });

            const response = await fetch('http://localhost:8000/api/v1/video-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    video_url: audioURL,
                    video_name: audioFile.name,
                    analysis_status: 'completed',
                    duration: beatData.duration,
                    transitions: transitions
                })
            });

            if (!response.ok) throw new Error('Failed to create template');

            const template = await response.json();
            console.log('✅ Created template:', template.id);

            // Navigate to composer with templateId and pass images/audio through state
            const imageUrls = Object.values(blockImages);
            navigate(`/composer?templateId=${template.id}`, {
                state: {
                    beats: beatData.beats,
                    preloadedImages: imageUrls,
                    photos: blockImages,
                    audioURL,
                    tempo: beatData.tempo,
                    duration: beatData.duration
                }
            });
        } catch (err) {
            console.error('❌ Error creating template:', err);
            alert('Failed to create template. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
            {/* PillNav */}
            <PillNav
                logo="/logo.svg"
                items={navItems}
                activeHref={location.pathname}
                baseColor="rgba(0, 0, 0, 0.9)"
                pillColor="rgba(20, 20, 30, 0.95)"
                hoveredPillTextColor="#ffffff"
                pillTextColor="rgba(255, 255, 255, 0.7)"
                rightContent={<UserProfile />}
            />

            {/* Particles Background */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0
            }}>
                <Particles
                    particleColors={['#5227FF', '#ffffff', '#8b5cf6']}
                    particleCount={200}
                    particleSpread={10}
                    speed={0.1}
                    particleBaseSize={100}
                    moveParticlesOnHover={true}
                    alphaParticles={false}
                    disableRotation={false}
                />
            </div>

            {/* Content */}
            <div className="beat-detection-page" style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
                <div className="beat-header" style={{ pointerEvents: 'auto', marginTop: '100px' }}>
                    <h1>Beat Detection</h1>
                    <p>
                        Upload an audio file to detect cinematic beats and create timestamped photo blocks for video syncing.
                    </p>
                </div>

                <div className="upload-section">
                    <label htmlFor="audioUpload" className="upload-label">
                        {audioFile ? "Replace Audio File" : "Upload Audio File"}
                    </label>
                    <input id="audioUpload" type="file" accept="audio/*" onChange={handleAudioUpload} />
                    {audioFile && <p className="file-name">🎵 {audioFile.name}</p>}
                </div>

                <div className="action-buttons">
                    <button className="btn-black" onClick={handleBeatDetection}>
                        {loading ? "Analyzing..." : "Detect Beats"}
                    </button>
                    {beatData && (
                        <button className="btn-outline" onClick={handleGoToEditor}>
                            Proceed to Composer →
                        </button>
                    )}
                </div>

                {beatData && (
                    <div className="beat-blocks-section" style={{ pointerEvents: 'auto' }}>
                        <h2>Detected Beat Blocks</h2>
                        <div className="beat-blocks-container">
                            {beatData.beats.map((beat, idx) => (
                                <div key={idx} className="beat-block" onClick={() => fileInputs.current[idx]?.click()}>
                                    {blockImages[idx] ? (
                                        <img src={blockImages[idx]} alt={`Block ${idx}`} />
                                    ) : (
                                        <span className="add-icon">+</span>
                                    )}
                                    <p className="timestamp">{beat.toFixed(2)}s</p>
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        ref={(el) => (fileInputs.current[idx] = el)}
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const imageUrl = URL.createObjectURL(file);
                                                setBlockImages((prev) => ({ ...prev, [idx]: imageUrl }));
                                            }
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div style={{ textAlign: 'center', marginTop: 12 }}>
                            <label htmlFor="allPhotos" className="add-all-btn">Add Photos to Pool</label>
                            <input id="allPhotos" type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleBlockImageUpload} />
                        </div>
                    </div>
                )}

                <div className="beat-footer" style={{ pointerEvents: 'auto' }}>© 2025 BeatCanvas | Audio Sync Engine</div>
            </div>
        </div>
    );
}
