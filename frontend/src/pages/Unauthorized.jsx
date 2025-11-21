import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../miniproject/styles/global.css';

export default function Unauthorized() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                maxWidth: '500px',
                width: '90%'
            }}>
                <div style={{
                    marginBottom: '2rem'
                }}>
                    <img
                        src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png"
                        alt="Unauthorized"
                        style={{
                            width: '180px',
                            height: 'auto',
                            margin: '0 auto'
                        }}
                    />
                </div>

                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#1a1a1a',
                    marginBottom: '1rem'
                }}>
                    Hold Up!
                </h1>

                <p style={{
                    fontSize: '1.1rem',
                    color: '#666',
                    marginBottom: '0.5rem'
                }}>
                    Error 401: Unauthorized
                </p>

                <p style={{
                    fontSize: '1rem',
                    color: '#888',
                    marginBottom: '2rem',
                    lineHeight: '1.5'
                }}>
                    You need to be logged in to access this page.
                    Please sign in to continue.
                </p>

                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <Link
                        to="/login"
                        style={{
                            padding: '0.75rem 2rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '1rem',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                        }}
                    >
                        🔐 Login
                    </Link>

                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            padding: '0.75rem 2rem',
                            background: 'white',
                            color: '#667eea',
                            border: '2px solid #667eea',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = '#f0f0f0';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = 'white';
                        }}
                    >
                        ← Go Back
                    </button>
                </div>

                <p style={{
                    fontSize: '0.9rem',
                    color: '#999',
                    marginTop: '2rem'
                }}>
                    Don't have an account? <Link to="/register" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '600' }}>Sign up here</Link>
                </p>
            </div>
        </div>
    );
}
