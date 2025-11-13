import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './layout/main.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateVideo from './pages/CreateVideo.jsx';
import History from './pages/History.jsx';
import Templates from './pages/Templates.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

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
        case 'Login':
            return '/login';
        case 'Register':
            return '/register';
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
        if (pathname.startsWith('/login')) return 'Login';
        if (pathname.startsWith('/register')) return 'Register';
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
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Routes>
        </Layout>
    );
}

export default App;