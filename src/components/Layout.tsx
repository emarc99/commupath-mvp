import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { MapPinIcon, ClipboardDocumentListIcon, TrophyIcon, ArrowRightOnRectangleIcon, GlobeAltIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { user } = useApp();
    const { logout } = useAuth();
    const navigate = useNavigate();

    const navItems = [
        { to: '/map', icon: MapPinIcon, label: 'Impact Map', emoji: '📍' },
        { to: '/quests', icon: ClipboardDocumentListIcon, label: 'Quest Hub', emoji: '📋' },
        { to: '/community', icon: GlobeAltIcon, label: 'Community Board', emoji: '🌍' },
        { to: '/creator', icon: SparklesIcon, label: 'Creator Dashboard', emoji: '✨' },
        { to: '/leaderboard', icon: TrophyIcon, label: 'Leaderboard', emoji: '🏆' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 glass-dark border-r border-white/10 flex flex-col animate-slide-down">
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-3xl font-bold gradient-text mb-2">CommuPath</h1>
                    <p className="text-gray-400 text-sm">Transforming Resolutions into Impact</p>
                </div>

                {/* User Profile */}
                <div className="p-6 border-b border-white/10">
                    <div className="glass rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center text-xl font-bold">
                                {user.username[0]}
                            </div>
                            <div>
                                <h3 className="font-semibold">{user.username}</h3>
                                <p className="text-sm text-accent-400">{user.impactLevel}</p>
                            </div>
                        </div>
                        <div className="flex justify-between text-sm">
                            <div>
                                <p className="text-gray-400">Points</p>
                                <p className="font-bold text-primary-400">{user.points}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Quests</p>
                                <p className="font-bold text-accent-400">{user.completedQuests}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive
                                    ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-primary-500/30'
                                    : 'hover:bg-white/5'
                                }`
                            }
                        >
                            <span className="text-2xl">{item.emoji}</span>
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 glass hover:bg-red-500/20 rounded-lg transition-all duration-300 text-red-400 hover:text-red-300"
                    >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <p className="text-xs text-center text-gray-500">
                        Built for You, the Community Hero
                    </p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
