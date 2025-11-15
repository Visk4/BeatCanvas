import React, { useState, useRef } from "react";
import "../styles/BeatDetection.css";
import UserProfile from "../../components/UserProfile";
import { useNavigate, Link } from "react-router-dom";

export default function BeatDetection() {
    const [audioFile, setAudioFile] = useState(null);
    const [audioURL, setAudioURL] = useState(null);
    const [beatData, setBeatData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [blockImages, setBlockImages] = useState({});
    const fileInputs = useRef({});
    const navigate = useNavigate();

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

    const handleGoToEditor = () => {
        if (!beatData) return;
        navigate("/video-editor", {
            state: {
                beats: beatData.beats,
                duration: beatData.duration,
                tempo: beatData.tempo,
                photos: blockImages,
                audioURL,
            },
        });
    };

    return (
        <div className="beat-detection-page">
            <nav style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 60px',
                borderBottom: '1px solid #374151',
                backgroundColor: '#111827'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white', margin: 0 }}>Beat Detection</h2>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <Link to="/dashboard" style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: '500' }}>Dashboard</Link>
                        <Link to="/template-extraction" style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: '500' }}>Templates</Link>
                        <Link to="/composer" style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: '500' }}>Composer</Link>
                    </div>
                </div>
                <UserProfile />
            </nav>

            <div className="beat-header">
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
                        Proceed to Video Editor →
                    </button>
                )}
            </div>

            {beatData && (
                <div className="beat-blocks-section">
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

            <div className="beat-footer">© 2025 BeatCanvas | Audio Sync Engine</div>
        </div>
    );
}
