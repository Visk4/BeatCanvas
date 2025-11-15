import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "../../api/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import UserProfile from "../../components/UserProfile";
import "../styles/Dashboard.css";

export default function Dashboard() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAnalysisForWaveform, setSelectedAnalysisForWaveform] = useState(null);
    const queryClient = useQueryClient();
    const waveformCanvasRef = useRef(null);
    const heatmapCanvasRef = useRef(null);

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

    const handleDelete = async (id) => {
        if (window.confirm('Delete this template? This cannot be undone.')) {
            await base44.entities.VideoAnalysis.delete(id);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['completed-analyses'] });
        }
    };

    // Draw waveform visualization
    useEffect(() => {
        const canvas = waveformCanvasRef.current;
        if (!canvas || !selectedAnalysisForWaveform?.transitions) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2; // Retina display
        const height = canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);

        const displayWidth = width / 2;
        const displayHeight = height / 2;

        // Clear canvas
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        const transitions = selectedAnalysisForWaveform.transitions;
        const duration = selectedAnalysisForWaveform.duration || 1;

        // Draw waveform bars based on transitions
        transitions.forEach((transition, idx) => {
            const x = (transition.timestamp / duration) * displayWidth;
            const barHeight = (transition.confidence || 0.5) * displayHeight * 0.8;
            const y = displayHeight / 2 - barHeight / 2;

            // Gradient color based on confidence
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');

            ctx.fillStyle = gradient;
            ctx.fillRect(x - 1, y, 2, barHeight);
        });

        // Draw timeline
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, displayHeight / 2);
        ctx.lineTo(displayWidth, displayHeight / 2);
        ctx.stroke();

    }, [selectedAnalysisForWaveform]);

    // Draw heatmap
    useEffect(() => {
        const canvas = heatmapCanvasRef.current;
        if (!canvas || analyses.length === 0) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);

        const displayWidth = width / 2;
        const displayHeight = height / 2;

        ctx.clearRect(0, 0, displayWidth, displayHeight);

        // Calculate max duration across all analyses
        const maxDuration = Math.max(...analyses.map(a => a.duration || 0), 1);
        const buckets = 50; // Number of time buckets
        const bucketSize = maxDuration / buckets;
        const heatmap = new Array(buckets).fill(0);

        // Count transitions in each time bucket
        analyses.forEach(analysis => {
            (analysis.transitions || []).forEach(t => {
                const bucket = Math.floor(t.timestamp / bucketSize);
                if (bucket >= 0 && bucket < buckets) {
                    heatmap[bucket]++;
                }
            });
        });

        const maxCount = Math.max(...heatmap, 1);

        // Draw heatmap bars
        const barWidth = displayWidth / buckets;
        heatmap.forEach((count, idx) => {
            const intensity = count / maxCount;
            const barHeight = displayHeight * 0.8;
            const y = displayHeight - barHeight;
            const x = idx * barWidth;

            // Color based on intensity
            const r = Math.floor(102 + intensity * 16); // #667eea to lighter
            const g = Math.floor(126 - intensity * 50);
            const b = Math.floor(234 - intensity * 72);

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
            ctx.fillRect(x, y + (1 - intensity) * barHeight, barWidth - 1, intensity * barHeight);
        });

        // Draw axis
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, displayHeight);
        ctx.lineTo(displayWidth, displayHeight);
        ctx.stroke();

    }, [analyses]);

    // Auto-select first analysis for waveform
    useEffect(() => {
        if (analyses.length > 0 && !selectedAnalysisForWaveform) {
            setSelectedAnalysisForWaveform(analyses[0]);
        }
    }, [analyses, selectedAnalysisForWaveform]);

    return (
        <div className="dashboard">
            {/* Navigation Bar */}
            <nav className="dashboard-nav">
                <h2>Dashboard</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    <div className="dashboard-links">
                        <Link to="/template-extraction">Template Extraction</Link>
                        <Link to="/beat-detection">Beat Detection</Link>
                        <Link to="/composer">Composer</Link>
                        <Link to="/history">History</Link>
                    </div>
                    <UserProfile />
                </div>
            </nav>

            {/* Search Bar */}
            <section className="featured" style={{ paddingBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '10px 15px',
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px'
                    }}
                />
            </section>

            {/* Beat History Section */}
            <section className="beat-history">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>Beat History Timeline</h3>
                    {analyses.length > 0 && (
                        <select
                            value={selectedAnalysisForWaveform?.id || ''}
                            onChange={(e) => {
                                const selected = analyses.find(a => a.id === e.target.value);
                                setSelectedAnalysisForWaveform(selected);
                            }}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '6px',
                                color: '#e5e7eb',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            {analyses.map(analysis => (
                                <option key={analysis.id} value={analysis.id}>
                                    {analysis.video_name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="waveform-container" style={{ position: 'relative' }}>
                    {selectedAnalysisForWaveform ? (
                        <>
                            <canvas
                                ref={waveformCanvasRef}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0
                                }}
                            />
                            <div style={{
                                position: 'absolute',
                                top: '10px',
                                left: '10px',
                                fontSize: '11px',
                                color: '#9ca3af',
                                backgroundColor: 'rgba(31, 41, 55, 0.8)',
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}>
                                {selectedAnalysisForWaveform.transitions?.length || 0} transitions • {formatDuration(selectedAnalysisForWaveform.duration)}
                            </div>
                        </>
                    ) : (
                        <div className="waveform-placeholder">No data available</div>
                    )}
                </div>
                <div className="heatmap-container" style={{ position: 'relative' }}>
                    {analyses.length > 0 ? (
                        <>
                            <canvas
                                ref={heatmapCanvasRef}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0
                                }}
                            />
                            <div style={{
                                position: 'absolute',
                                top: '10px',
                                left: '10px',
                                fontSize: '11px',
                                color: '#9ca3af',
                                backgroundColor: 'rgba(31, 41, 55, 0.8)',
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}>
                                Transition density across all templates
                            </div>
                        </>
                    ) : (
                        <div className="heatmap-placeholder">No data available</div>
                    )}
                </div>
            </section>

            {/* Template Library Section */}
            <section className="template-library">
                <h3>Template Library</h3>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid #374151',
                            borderTop: '3px solid #6b7280',
                            borderRadius: '50%',
                            margin: '0 auto',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                    </div>
                ) : filteredAnalyses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        <p>No templates found. Analyze a video to create templates.</p>
                        <Link to="/template-extraction" style={{ color: '#9ca3af', textDecoration: 'underline', marginTop: '10px', display: 'inline-block' }}>
                            Go to Template Extraction
                        </Link>
                    </div>
                ) : (
                    <div className="template-grid">
                        {filteredAnalyses.map((analysis) => (
                            <div key={analysis.id} className="template-card">
                                <div className="rhythm-block" style={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: 'linear-gradient(90deg, #374151 20%, #1f2937 40%, #374151 60%)'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        color: '#9ca3af'
                                    }}>
                                        {analysis.transitions.length} cuts • {formatDuration(analysis.duration)}
                                    </div>
                                </div>
                                <p style={{ fontWeight: '500', marginBottom: '5px', color: '#ddd' }}>
                                    {analysis.video_name}
                                </p>
                                <p style={{ fontSize: '11px', color: '#777', marginBottom: '8px' }}>
                                    {format(new Date(analysis.created_date), 'MMM d, yyyy')}
                                </p>
                                <div style={{ display: 'flex', gap: '5px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                    <Link
                                        to={`/composer?templateId=${analysis.id}`}
                                        style={{
                                            flex: 1,
                                            minWidth: '70px',
                                            padding: '6px 10px',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            border: 'none',
                                            borderRadius: '5px',
                                            color: 'white',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            textDecoration: 'none',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                    >
                                        Compose
                                    </Link>
                                    <Link
                                        to={`/template-extraction?analysisId=${analysis.id}`}
                                        style={{
                                            flex: 1,
                                            minWidth: '50px',
                                            padding: '6px 10px',
                                            backgroundColor: '#374151',
                                            border: 'none',
                                            borderRadius: '5px',
                                            color: '#d1d5db',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            textDecoration: 'none',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#374151'}
                                    >
                                        View
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(analysis.id)}
                                        style={{
                                            padding: '6px 10px',
                                            backgroundColor: '#441111',
                                            border: 'none',
                                            borderRadius: '5px',
                                            color: '#ff6666',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#661111'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#441111'}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
