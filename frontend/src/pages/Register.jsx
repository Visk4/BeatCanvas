import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/client';
import { createPageUrl } from '@/utils/index';

export default function Register() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
            <Card className="w-full max-w-md bg-black/40 border-white/10">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Create Account</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-300">Email</label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="mt-1 bg-slate-800 border-slate-700 text-white" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-300">Password</label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="mt-1 bg-slate-800 border-slate-700 text-white" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-300">Confirm Password</label>
                            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="••••••••" className="mt-1 bg-slate-800 border-slate-700 text-white" />
                        </div>
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600">
                            {loading ? 'Creating...' : 'Register'}
                        </Button>
                    </form>
                    <p className="mt-6 text-sm text-gray-400 text-center">
                        Already have an account? <Link to={createPageUrl('Login')} className="text-cyan-400 hover:underline">Login</Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
