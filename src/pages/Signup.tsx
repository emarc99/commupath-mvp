import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPinIcon, EnvelopeIcon, UserIcon, ArrowRightIcon, SparklesIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { register, isAuthenticated } = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/map');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register(username, email, password, fullName);
            toast.success('Account created! 🎉', {
                description: `Welcome to CommuPath, ${username}!`
            });
            navigate('/map');
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to create account';
            setError(errorMsg);
            toast.error('Signup failed', {
                description: errorMsg
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-6">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8 animate-slide-down">
                    <Link to="/" className="inline-flex items-center space-x-2 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                            <MapPinIcon className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-3xl font-bold gradient-text">CommuPath</span>
                    </Link>
                    <h1 className="text-3xl font-bold mb-2">Join CommuPath</h1>
                    <p className="text-gray-400">Start making community impact today</p>
                </div>

                {/* Signup Form */}
                <div className="glass-dark rounded-2xl p-8 animate-slide-up">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                Username
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Choose a username"
                                    required
                                    minLength={3}
                                    disabled={loading}
                                    className="w-full px-4 py-3 pl-11 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-400 disabled:opacity-50"
                                />
                                <UserIcon className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">This will be your community hero name!</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                Full Name (Optional)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Your full name"
                                    disabled={loading}
                                    className="w-full px-4 py-3 pl-11 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-400 disabled:opacity-50"
                                />
                                <UserIcon className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                Email
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    disabled={loading}
                                    className="w-full px-4 py-3 pl-11 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-400 disabled:opacity-50"
                                />
                                <EnvelopeIcon className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password"
                                    required
                                    minLength={6}
                                    disabled={loading}
                                    className="w-full px-4 py-3 pl-11 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-400 disabled:opacity-50"
                                />
                                <LockClosedIcon className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                            {!loading && <ArrowRightIcon className="w-5 h-5" />}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>

                    <div className="mt-6 text-center">
                        <Link to="/" className="text-gray-500 hover:text-gray-400 text-sm">
                            ← Back to home
                        </Link>
                    </div>
                </div>

                {/* Benefits */}
                <div className="mt-6 space-y-3">
                    <div className="glass rounded-lg p-4 text-sm animate-fade-in" style={{ animationDelay: '200ms' }}>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <span className="text-lg">🌍</span>
                            </div>
                            <span className="text-gray-300">Get AI-generated quests for your location</span>
                        </div>
                    </div>
                    <div className="glass rounded-lg p-4 text-sm animate-fade-in" style={{ animationDelay: '300ms' }}>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                <span className="text-lg">🏆</span>
                            </div>
                            <span className="text-gray-300">Earn points and compete on the leaderboard</span>
                        </div>
                    </div>
                    <div className="glass rounded-lg p-4 text-sm animate-fade-in" style={{ animationDelay: '400ms' }}>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <span className="text-lg">✨</span>
                            </div>
                            <span className="text-gray-300">AI verifies your impact automatically</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
