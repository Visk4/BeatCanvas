import React from "react";
import { base44 } from "../../api/client";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import UserProfile from "../../components/UserProfile";
import "../styles/Dashboard.css";

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
            case 'completed': return { bg: '#114411', color: '#66ff66', border: '#226622' };
            case 'processing': return { bg: '#443311', color: '#ffcc66', border: '#665522' };
            case 'pending': return { bg: '#443311', color: '#ffcc66', border: '#665522' };
            case 'failed': return { bg: '#441111', color: '#ff6666', border: '#662222' };
            default: return { bg: '#2e2e33', color: '#888', border: '#3e3e43' };
        }
    };

    const formatDuration = (seconds) => {
        if (typeof seconds !== 'number' || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this analysis? This cannot be undone.')) {
            await base44.entities.VideoAnalysis.delete(id);
            queryClient.invalidateQueries({ queryKey: ['analyses-history'] });
            queryClient.invalidateQueries({ queryKey: ['all-analyses'] });
            queryClient.invalidateQueries({ queryKey: ['completed-analyses'] });
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid #333',
                    borderTop: '4px solid #888',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', padding: '40px 20px', color: '#e5e7eb', backgroundColor: '#111827' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                        <div>
                            <h1 style={{
                                fontSize: '2.5rem',
                                fontWeight: 'bold',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                marginBottom: '10px'
                            }}>
                                Analysis History
                            </h1>
                            <p style={{ color: '#9ca3af' }}>View and manage your previous video analyses</p>
                        </div>
                        <UserProfile />
                    </div>
                </div>

                {analyses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto 20px',
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '40px'
                        }}>
                            ⚡
                        </div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '600', color: 'white', marginBottom: '10px' }}>
                            No analyses yet
                        </h3>
                        <p style={{ color: '#888', marginBottom: '20px' }}>
                            Start by uploading your first video for analysis
                        </p>
                        <Link to="/template-extraction">
                            <button style={{
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}>
                                Start Analysis
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '20px'
                    }}>
                        {analyses.map((analysis) => {
                            const statusStyle = getStatusColor(analysis.analysis_status);
                            return (
                                <div
                                    key={analysis.id}
                                    style={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#6b7280';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#374151';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <div style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <h3 style={{
                                                color: 'white',
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                flex: 1,
                                                marginRight: '10px'
                                            }}>
                                                {analysis.video_name}
                                            </h3>
                                            <span style={{
                                                padding: '4px 10px',
                                                backgroundColor: statusStyle.bg,
                                                color: statusStyle.color,
                                                border: `1px solid ${statusStyle.border}`,
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {analysis.analysis_status}
                                            </span>
                                        </div>
                                        <p style={{ color: '#777', fontSize: '13px', marginBottom: '15px' }}>
                                            {format(new Date(analysis.created_date), 'MMM d, yyyy • h:mm a')}
                                        </p>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', fontSize: '13px' }}>
                                            <div style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                🕒 {analysis.duration ? formatDuration(analysis.duration) : 'Unknown'}
                                            </div>
                                            {analysis.transitions && (
                                                <div style={{ color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    ⚡ {analysis.transitions.length} transitions
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {analysis.analysis_status === 'completed' && (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/composer?templateId=${analysis.id}`)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px',
                                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            color: 'white',
                                                            fontWeight: '500',
                                                            fontSize: '13px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        🎬 Compose
                                                    </button>
                                                    <button
                                                        style={{
                                                            padding: '10px',
                                                            backgroundColor: '#2e2e33',
                                                            border: '1px solid #3e3e43',
                                                            borderRadius: '6px',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            fontSize: '13px'
                                                        }}
                                                    >
                                                        ⬇
                                                    </button>
                                                </>
                                            )}
                                            {analysis.analysis_status !== 'completed' && (
                                                <button
                                                    disabled
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        backgroundColor: '#333',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        color: '#888',
                                                        fontSize: '13px',
                                                        cursor: 'not-allowed'
                                                    }}
                                                >
                                                    {analysis.analysis_status}...
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(analysis.id)}
                                                style={{
                                                    padding: '10px',
                                                    backgroundColor: '#441111',
                                                    border: '1px solid #662222',
                                                    borderRadius: '6px',
                                                    color: '#ff6666',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#661111'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#441111'}
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
