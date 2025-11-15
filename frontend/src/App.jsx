import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Keep auth pages available
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

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
            {/* New default landing page */}
            <Route path="/" element={<MPHome />} />

            {/* MiniProject app routes */}
            <Route path="/dashboard" element={<MPDashboard />} />
            <Route path="/template-extraction" element={<MPTemplateExtraction />} />
            <Route path="/beat-detection" element={<MPBeatDetection />} />
            <Route path="/video-editor" element={<MPVideoEditor />} />
            <Route path="/history" element={<MPHistory />} />
            <Route path="/composer" element={<MPComposer />} />

            {/* Keep auth routes accessible */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
        </Routes>
    );
}