import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/client';
import { createPageUrl } from '@/utils/index';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import BlobCursor from '@/components/BlobCursor';

export default function Register() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const backgroundRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (backgroundRef.current) {
                const rect = backgroundRef.current.getBoundingClientRect();
                setMousePosition({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const result = await base44.auth.register({ email, password });
            if (result?.access_token) {
                navigate(createPageUrl('Dashboard'));
            }
        } catch (err) {
            setError(err?.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <BlobCursor
                blobType="circle"
                fillColor="#ffffff"
                trailCount={3}
                sizes={[50, 100, 65]}
                innerSizes={[15, 30, 20]}
                innerColor="rgba(0,0,0,0.3)"
                opacities={[0.8, 0.6, 0.4]}
                shadowColor="rgba(255,255,255,0.3)"
                shadowBlur={10}
                shadowOffsetX={0}
                shadowOffsetY={0}
                filterStdDeviation={25}
                useFilter={true}
                fastDuration={0.1}
                slowDuration={0.5}
                zIndex={1}
            />
            <div
                ref={backgroundRef}
                className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950"
            >
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(100, 100, 120, 0.15), transparent 40%)`
                    }}
                />
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-slate-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-slate-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-slate-700 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
                </div>
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }}
                />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 w-full max-w-md"
                >
                    <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                        <motion.div className="text-center mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Sparkles className="w-6 h-6 text-white" />
                                <h1 className="text-3xl font-bold text-white">BeatCanvas</h1>
                            </div>
                            <p className="text-sm text-gray-400 mt-2">Create your account</p>
                        </motion.div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="pl-11 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all h-12 rounded-xl" />
                                </div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="pl-11 pr-11 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all h-12 rounded-xl" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                                    <Input type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="••••••••" className="pl-11 pr-11 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all h-12 rounded-xl" />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </motion.div>
                            {error && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"><p className="text-sm text-red-400 text-center">{error}</p></motion.div>}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                                <Button type="submit" disabled={loading} className="w-full h-12 bg-white hover:bg-gray-200 text-black font-semibold rounded-xl transition-all duration-300 group relative overflow-hidden">
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Creating...</> : <>Create Account<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                                    </span>
                                </Button>
                            </motion.div>
                        </form>

                        {/* OAuth Section */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-6">
                            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900/80 px-2 text-gray-500">Or continue with</span></div></div>
                            <button onClick={() => window.location.href = 'http://localhost:8000/api/v1/auth/google'} className="mt-4 w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-3 group">
                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                <span>Continue with Google</span>
                            </button>
                        </motion.div>

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8">
                            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900/80 px-2 text-gray-500">Already have an account?</span></div></div>
                            <p className="mt-4 text-sm text-gray-400 text-center">Sign in to your account{' '}<Link to={createPageUrl('Login')} className="text-white font-semibold hover:text-gray-300 transition-all underline">Login</Link></p>
                        </motion.div>
                    </div>
                </motion.div>
                <style>{`@keyframes blob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-50px) scale(1.1)}66%{transform:translate(-20px,20px) scale(0.9)}}.animate-blob{animation:blob 7s infinite}.animation-delay-2000{animation-delay:2s}.animation-delay-4000{animation-delay:4s}`}</style>
            </div>
        </>
    );
}
