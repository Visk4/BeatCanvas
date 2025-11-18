import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils/index';
import { setToken } from '@/api/client';

export default function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (token) {
            // Store the token using the same key as the client
            setToken(token);

            // Redirect to dashboard
            navigate(createPageUrl('Dashboard'));
        } else if (error) {
            // Redirect to login with error message
            navigate(createPageUrl('Login') + '?error=oauth_failed');
        } else {
            // No token or error, redirect to login
            navigate(createPageUrl('Login'));
        }
    }, [searchParams, navigate]); return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white text-lg">Completing sign in...</p>
            </div>
        </div>
    );
}
