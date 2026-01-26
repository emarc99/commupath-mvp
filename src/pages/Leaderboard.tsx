import { useApp } from '../context/AppContext';
import { TrophyIcon, FireIcon, SparklesIcon } from '@heroicons/react/24/solid';

const Leaderboard = () => {
    const { leaderboard, user } = useApp();

    const getRankEmoji = (rank: number) => {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return '📍';
        }
    };

    const getImpactLevelColor = (level: string) => {
        switch (level) {
            case 'Legend': return 'text-yellow-400';
            case 'Hero': return 'text-purple-400';
            case 'Rising Star': return 'text-blue-400';
            case 'Novice': return 'text-green-400';
            default: return 'text-gray-400';
        }
    };

    // Calculate global impact stats
    const globalStats = {
        totalPoints: leaderboard.reduce((sum, entry) => sum + entry.points, 0),
        totalQuests: leaderboard.reduce((sum, entry) => sum + entry.completedQuests, 0),
        totalHeroes: leaderboard.length,
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 glass-dark border-b border-white/10 animate-slide-down">
                <h2 className="text-3xl font-bold mb-2">🏆 Hero Leaderboard</h2>
                <p className="text-gray-400">Top community champions making real impact</p>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
                {/* Global Impact Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
                    <div className="glass rounded-xl p-6 card-hover">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-3 bg-yellow-500/20 rounded-lg">
                                <TrophyIcon className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Community Points</p>
                                <p className="text-2xl font-bold text-yellow-400">{globalStats.totalPoints.toLocaleString()}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">Total impact generated</p>
                    </div>

                    <div className="glass rounded-xl p-6 card-hover">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-3 bg-green-500/20 rounded-lg">
                                <FireIcon className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Quests Completed</p>
                                <p className="text-2xl font-bold text-green-400">{globalStats.totalQuests}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">Across all categories</p>
                    </div>

                    <div className="glass rounded-xl p-6 card-hover">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-3 bg-purple-500/20 rounded-lg">
                                <SparklesIcon className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Active Heroes</p>
                                <p className="text-2xl font-bold text-purple-400">{globalStats.totalHeroes}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">Making a difference</p>
                    </div>
                </div>

                {/* Weekly Impact Story */}
                <div className="glass rounded-xl p-6 animate-fade-in">
                    <h3 className="text-xl font-bold mb-3 flex items-center space-x-2">
                        <SparklesIcon className="w-5 h-5 text-accent-400" />
                        <span>This Week's Impact Story</span>
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                        This week, the <span className="text-primary-400 font-semibold">Ibadan community</span> came together to complete{' '}
                        <span className="text-green-400 font-semibold">{globalStats.totalQuests} impact quests</span>,
                        earning <span className="text-yellow-400 font-semibold">{globalStats.totalPoints.toLocaleString()} points</span> in total.
                        Together, we improved local parks, mentored students, and created lasting positive change.{' '}
                        <span className="text-accent-400 font-semibold">{leaderboard[0]?.username}</span> led the charge
                        with exceptional dedication! 🌟
                    </p>
                </div>

                {/* Leaderboard Table */}
                <div className="glass rounded-xl overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-white/10 bg-gradient-to-r from-primary-500/10 to-accent-500/10">
                        <h3 className="text-xl font-bold">Top Community Heroes</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr className="text-left">
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-400">Rank</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-400">Hero</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-400">Impact Level</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-400">Points</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-400">Quests</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((entry, index) => {
                                    const isCurrentUser = entry.username === user.username;
                                    return (
                                        <tr
                                            key={entry.username}
                                            className={`border-b border-white/5 transition-all duration-300 ${isCurrentUser ? 'bg-primary-500/10 border-primary-500/30' : 'hover:bg-white/5'
                                                } ${index < 3 ? 'animate-slide-up' : ''}`}
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-2xl">{getRankEmoji(entry.rank)}</span>
                                                    <span className="font-bold text-lg">{entry.rank}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${entry.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                                                            entry.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                                                                entry.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                                                                    'bg-gradient-to-r from-primary-500 to-accent-500'
                                                        }`}>
                                                        {entry.username[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{entry.username}</p>
                                                        {isCurrentUser && (
                                                            <p className="text-xs text-primary-400 font-medium">You</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-semibold ${getImpactLevelColor(entry.impactLevel)}`}>
                                                    {entry.impactLevel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <TrophyIcon className="w-4 h-4 text-yellow-400" />
                                                    <span className="font-bold text-yellow-400">{entry.points.toLocaleString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <FireIcon className="w-4 h-4 text-green-400" />
                                                    <span className="font-bold text-green-400">{entry.completedQuests}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Motivational Footer */}
                <div className="text-center p-6 glass rounded-xl animate-float">
                    <p className="text-lg text-gray-300 mb-2">
                        Keep making an impact! Every quest brings positive change to your community. 💪
                    </p>
                    <p className="text-sm text-gray-500">
                        Leaderboard updates in real-time as heroes complete quests
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
