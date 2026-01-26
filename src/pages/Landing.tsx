import { Link } from 'react-router-dom';
import {
    MapPin,
    Zap,
    Target,
    CheckCircle,
    Sparkles,
    ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-slate-900/80 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-slate-900" />
                            </div>
                            <span className="text-xl font-bold text-white">CommuPath</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            {isAuthenticated ? (
                                <Link
                                    to="/map"
                                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 text-slate-900 font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="px-5 py-2 rounded-lg text-white hover:text-green-400 transition-colors"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        to="/signup"
                                        className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 text-slate-900 font-semibold hover:opacity-90 transition-opacity"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-4xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/10 border border-green-400/20 mb-8">
                            <Sparkles className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-medium text-green-400">AI-Powered Community Impact</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                            Transform Resolutions Into{' '}
                            <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text">
                                Community Impact
                            </span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                            AI-powered platform that turns your New Year's goals into real-world community quests.
                            Get location-specific missions, verify with AI, and compete on the leaderboard.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to={isAuthenticated ? '/map' : '/signup'}
                                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-slate-900 font-bold text-lg hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
                            >
                                {isAuthenticated ? 'Go to Dashboard' : 'Start Making Impact'}
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <a
                                href="#how-it-works"
                                className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-white/20 text-white font-bold text-lg hover:bg-white/10 transition-colors"
                            >
                                Learn More
                            </a>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        {[
                            { label: 'Active Users', value: '500+' },
                            { label: 'Quests Completed', value: '2,000+' },
                            { label: 'Communities', value: '25+' },
                            { label: 'Impact Score', value: '98%' },
                        ].map((stat, idx) => (
                            <div key={idx} className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
                                <div className="text-3xl md:text-4xl font-bold text-green-400 mb-2">{stat.value}</div>
                                <div className="text-sm text-gray-400">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
                        <p className="text-xl text-gray-300">Four simple steps to make real community impact</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                icon: Target,
                                step: '01',
                                title: 'Set Your Goal',
                                description: 'Share your New Year\'s resolution and let our AI understand your commitment.',
                            },
                            {
                                icon: MapPin,
                                step: '02',
                                title: 'Find Local Needs',
                                description: 'AI scans your area to discover community impact opportunities near you.',
                            },
                            {
                                icon: Zap,
                                step: '03',
                                title: 'Complete Quests',
                                description: 'Take action on real-world missions that make a difference locally.',
                            },
                            {
                                icon: CheckCircle,
                                step: '04',
                                title: 'Verify & Earn',
                                description: 'AI verifies your impact with photo proof and awards you points.',
                            },
                        ].map((step, idx) => {
                            const Icon = step.icon;
                            return (
                                <div key={idx} className="relative">
                                    <div className="h-full p-8 rounded-2xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition-colors">
                                        <div className="absolute -top-4 left-8 px-3 py-1 rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 text-slate-900 font-bold text-sm">
                                            {step.step}
                                        </div>
                                        <div className="w-14 h-14 rounded-xl bg-green-400/10 flex items-center justify-center mb-6 mt-4">
                                            <Icon className="w-7 h-7 text-green-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                                        <p className="text-gray-400 leading-relaxed">{step.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                                Powered by Advanced AI
                            </h2>
                            <p className="text-xl text-gray-300 mb-8">
                                Our intelligent agents understand your goals, discover local opportunities,
                                and verify your impact with cutting-edge multimodal AI.
                            </p>
                            <div className="space-y-4">
                                {[
                                    'Geo-aware quest discovery',
                                    'Multimodal verification (photo + text)',
                                    'Real-time impact tracking',
                                    'Community leaderboards',
                                    'Smart mission generation',
                                ].map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                        </div>
                                        <span className="text-lg text-gray-200">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { icon: MapPin, label: 'Location Smart', color: 'from-blue-400 to-cyan-500' },
                                { icon: Sparkles, label: 'AI Powered', color: 'from-purple-400 to-pink-500' },
                                { icon: CheckCircle, label: 'Verified Impact', color: 'from-green-400 to-emerald-500' },
                                { icon: Zap, label: 'Real-time', color: 'from-yellow-400 to-orange-500' },
                            ].map((item, idx) => {
                                const Icon = item.icon;
                                return (
                                    <div key={idx} className="p-8 rounded-2xl bg-white/5 backdrop-blur border border-white/10 flex flex-col items-center justify-center text-center gap-4 hover:bg-white/10 transition-colors">
                                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center`}>
                                            <Icon className="w-8 h-8 text-white" />
                                        </div>
                                        <span className="text-white font-semibold">{item.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-400/10 to-emerald-500/10 border border-green-400/20 p-12 text-center">
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                                Ready to Make a Difference?
                            </h2>
                            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                                Join thousands of community heroes transforming their resolutions into real impact.
                            </p>
                            <Link
                                to={isAuthenticated ? '/map' : '/signup'}
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-slate-900 font-bold text-lg hover:opacity-90 transition-opacity"
                            >
                                {isAuthenticated ? 'Start Your Quest' : 'Join CommuPath'}
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-slate-900" />
                                </div>
                                <span className="text-lg font-bold text-white">CommuPath</span>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Turning resolutions into community impact through AI.
                            </p>
                        </div>

                        {[
                            {
                                title: 'Product',
                                links: ['Features', 'How it Works', 'Pricing'],
                            },
                            {
                                title: 'Company',
                                links: ['About', 'Blog', 'Careers'],
                            },
                            {
                                title: 'Support',
                                links: ['Help Center', 'Community', 'Contact'],
                            },
                        ].map((col, idx) => (
                            <div key={idx}>
                                <h3 className="text-white font-semibold mb-4">{col.title}</h3>
                                <ul className="space-y-2">
                                    {col.links.map((link, lidx) => (
                                        <li key={lidx}>
                                            <a href="#" className="text-gray-400 hover:text-green-400 text-sm transition-colors">
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-gray-400 text-sm">
                            © 2026 CommuPath. Making resolutions count.
                        </p>
                        <div className="flex gap-6">
                            <a href="#" className="text-gray-400 hover:text-green-400 text-sm transition-colors">Twitter</a>
                            <a href="#" className="text-gray-400 hover:text-green-400 text-sm transition-colors">Discord</a>
                            <a href="#" className="text-gray-400 hover:text-green-400 text-sm transition-colors">GitHub</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
