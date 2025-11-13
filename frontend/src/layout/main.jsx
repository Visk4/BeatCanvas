import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Film, Scissors, History, Settings } from "lucide-react";
import { getToken, clearToken } from "@/api/client";

export default function Layout({ children, currentPageName, createPageUrl }) {
    const location = useLocation();

    const navigationItems = [
        {
            title: "Analyze",
            url: createPageUrl("Dashboard"),
            icon: Film,
        },
        {
            title: "Compose",
            url: createPageUrl("CreateVideo"),
            icon: Scissors,
        },
        {
            title: "Templates",
            url: createPageUrl("Templates"),
            icon: Settings,
        },
        {
            title: "History",
            url: createPageUrl("History"),
            icon: History,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Professional Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link
                            to={createPageUrl("Dashboard")}
                            className="flex items-center gap-3 group"
                        >
                            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Film className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-white">
                                    TransitionStudio
                                </h1>
                            </div>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            {navigationItems.map((item) => (
                                <Link
                                    key={item.title}
                                    to={item.url}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${location.pathname === item.url
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{item.title}</span>
                                </Link>
                            ))}
                        </nav>

                        <div className="flex items-center gap-3">
                            {getToken() ? (
                                <button
                                    onClick={() => { clearToken(); window.location.href = createPageUrl('Login'); }}
                                    className="px-3 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-sm"
                                >
                                    Logout
                                </button>
                            ) : (
                                <>
                                    <Link to={createPageUrl('Login')} className="px-3 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-sm flex items-center">Login</Link>
                                    <Link to={createPageUrl('Register')} className="px-3 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all text-sm flex items-center">Register</Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="min-h-[calc(100vh-4rem)]">
                {children}
            </main>
        </div>
    );
}