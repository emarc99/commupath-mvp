import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPinIcon, LockClosedIcon, UserIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();

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
            await login(username, password);
            toast.success('Welcome back! 👋', {
                description: `Logged in as ${username}`
            });
            navigate('/map');
        } catch (err: any) {
            const errorMsg = err.message || 'Login failed';
            setError(errorMsg);
            toast.error('Login failed', {
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
                    <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
                    <p className="text-gray-400">Sign in to continue making impact</p>
                </div>

                {/* Login Form */}
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
                                    placeholder="Enter your username"
                                    required
                                    disabled={loading}
                                    className="w-full px-4 py-3 pl-11 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-400 disabled:opacity-50"
                                />
                                <UserIcon className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
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
                                    placeholder="Enter your password"
                                    required
                                    minLength={6}
                                    disabled={loading}
                                    className="w-full px-4 py-3 pl-11 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-400 disabled:opacity-50"
                                />
                                <LockClosedIcon className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                            {!loading && <ArrowRightIcon className="w-5 h-5" />}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400 text-sm">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium">
                                Sign up
                            </Link>
                        </p>
                    </div>

                    <div className="mt-6 text-center">
                        <Link to="/" className="text-gray-500 hover:text-gray-400 text-sm">
                            ← Back to home
                        </Link>
                    </div>
                </div>

                {/* Info Message */}
                <div className="mt-6 glass rounded-lg p-4 text-sm text-gray-400 text-center">
                    💡 Tip: Enter your registered username<br />and password to get started!
                </div>
            </div>
        </div>
    );
};

export default Login;
