import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "../api/client";

export default function UserProfile() {
    const [user, setUser] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const navigate = useNavigate();
    const menuRef = useRef(null);

    useEffect(() => {
        // Load user data
        base44.auth.me().then(userData => {
            setUser(userData);
        }).catch(() => {
            setUser(null);
        });
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleLogout = () => {
        base44.auth.logout();
        navigate('/login');
    };

    if (!user) return null;

    const getInitials = (email) => {
        return email.substring(0, 2).toUpperCase();
    };

    const getAvatarColor = (email) => {
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#4facfe',
            '#43e97b', '#fa709a', '#fee140', '#30cfd0'
        ];
        const index = email.charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <div style={{ position: 'relative' }} ref={menuRef}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.2)',
                    background: `linear-gradient(135deg, ${getAvatarColor(user.email)} 0%, ${getAvatarColor(user.email)}dd 100%)`,
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                }}
            >
                {getInitials(user.email)}
            </button>

            {showMenu && (
                <div style={{
                    position: 'absolute',
                    top: '50px',
                    right: '0',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    minWidth: '220px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '15px',
                        borderBottom: '1px solid #374151'
                    }}>
                        <div style={{
                            fontSize: '13px',
                            color: '#9ca3af',
                            marginBottom: '4px'
                        }}>
                            Signed in as
                        </div>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#e5e7eb',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {user.email}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setShowMenu(false);
                            navigate('/dashboard');
                        }}
                        style={{
                            width: '100%',
                            padding: '12px 15px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#e5e7eb',
                            fontSize: '14px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <span>🏠</span>
                        <span>Dashboard</span>
                    </button>

                    <button
                        onClick={() => {
                            setShowMenu(false);
                            navigate('/history');
                        }}
                        style={{
                            width: '100%',
                            padding: '12px 15px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#e5e7eb',
                            fontSize: '14px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <span>📜</span>
                        <span>History</span>
                    </button>

                    <div style={{ borderTop: '1px solid #374151' }}>
                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                padding: '12px 15px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                fontSize: '14px',
                                fontWeight: '500',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            <span>🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
