import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './layout/main.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateVideo from './pages/CreateVideo.jsx';
import History from './pages/History.jsx';
import Templates from './pages/Templates.jsx';

// This simple helper can live inside App.jsx
const createPageUrl = (pageName) => {
    switch (pageName) {
        case 'Dashboard':
            return '/dashboard';
        case 'CreateVideo':
            return '/createvideo';
        case 'Templates':
            return '/templates';
        case 'History':
            return '/history';
        default:
            return '/';
    }
};

function App() {
    const location = useLocation();

    const getPageName = (pathname) => {
        if (pathname.startsWith('/createvideo')) return 'CreateVideo';
        if (pathname.startsWith('/templates')) return 'Templates';
        if (pathname.startsWith('/history')) return 'History';
        return 'Dashboard';
    };

    return (
        <Layout currentPageName={getPageName(location.pathname)} createPageUrl={createPageUrl}>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/createvideo" element={<CreateVideo />} />
                <Route path="/history" element={<History />} />
                <Route path="/templates" element={<Templates />} />
            </Routes>
        </Layout>
    );
}

export default App;