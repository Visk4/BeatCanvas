import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Keep auth pages available
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import OAuthCallback from './pages/OAuthCallback.jsx';
import Unauthorized from './pages/Unauthorized.jsx';

// Protected Route wrapper
import ProtectedRoute from './components/ProtectedRoute.jsx';

// New MiniProject UI (now the primary app UI)
import MPHome from './miniproject/pages/Home.jsx';
import MPDashboard from './miniproject/pages/Dashboard.jsx';
import MPTemplateExtraction from './miniproject/pages/TemplateExtraction.jsx';
import MPBeatDetection from './miniproject/pages/BeatDetection.jsx';
import MPVideoEditor from './miniproject/pages/VideoEditor.jsx';
import MPHistory from './miniproject/pages/History.jsx';
import MPComposer from './miniproject/pages/Composer.jsx';

export default function App() {
    // Override previous UI: wire the new MiniProject pages as the primary routes
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<MPHome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected MiniProject app routes */}
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <MPDashboard />
                </ProtectedRoute>
            } />
            <Route path="/template-extraction" element={
                <ProtectedRoute>
                    <MPTemplateExtraction />
                </ProtectedRoute>
            } />
            <Route path="/beat-detection" element={
                <ProtectedRoute>
                    <MPBeatDetection />
                </ProtectedRoute>
            } />
            <Route path="/video-editor" element={
                <ProtectedRoute>
                    <MPVideoEditor />
                </ProtectedRoute>
            } />
            <Route path="/history" element={
                <ProtectedRoute>
                    <MPHistory />
                </ProtectedRoute>
            } />
            <Route path="/composer" element={
                <ProtectedRoute>
                    <MPComposer />
                </ProtectedRoute>
            } />
        </Routes>
    );
}