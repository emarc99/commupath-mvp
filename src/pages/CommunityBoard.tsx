import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../context/AuthContext';
import { GlobeAltIcon, MapPinIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface Quest {
    quest_id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    location: { lat: number; lng: number };
    impact_metric: string;
    estimated_time: string;
    community_benefit: string;
    created_by: string;
    assigned_to: string | null;
}

const CommunityBoard = () => {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('');

    const categories = [
        { name: 'All', value: '', icon: '🌍' },
        { name: 'Environment', value: 'Environment', icon: '🌿' },
        { name: 'Social', value: 'Social', icon: '🤝' },
        { name: 'Education', value: 'Education', icon: '📚' },
        { name: 'Health', value: 'Health', icon: '❤️' },
    ];

    const difficulties = [
        { name: 'All', value: '' },
        { name: 'Easy', value: 'Easy', color: 'text-green-400' },
        { name: 'Medium', value: 'Medium', color: 'text-yellow-400' },
        { name: 'Hard', value: 'Hard', color: 'text-red-400' },
    ];

    useEffect(() => {
        fetchCommunityQuests();
    }, [categoryFilter, difficultyFilter]);

    const fetchCommunityQuests = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (categoryFilter) params.category = categoryFilter;
            if (difficultyFilter) params.difficulty = difficultyFilter;

            const response = await apiClient.get('/api/quests/community', { params });
            setQuests(response.data);
        } catch (error) {
            console.error('Error fetching community quests:', error);
            toast.error('Failed to load community quests');
        } finally {
            setLoading(false);
        }
    };

    const claimQuest = async (questId: string, questTitle: string) => {
        const toastId = toast.loading('Claiming quest...');

        try {
            await apiClient.post(`/api/quests/${questId}/claim`);
            toast.success('Quest claimed! 🎯', {
                id: toastId,
                description: `"${questTitle}" is now in your Quest Hub`
            });
            fetchCommunityQuests(); // Refresh the list
        } catch (error: any) {
            toast.error('Failed to claim quest', {
                id: toastId,
                description: error.response?.data?.detail || 'Please try again'
            });
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return 'bg-green-500';
            case 'Medium': return 'bg-yellow-500';
            case 'Hard': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Environment': return '🌿';
            case 'Social': return '🤝';
            case 'Education': return '📚';
            case 'Health': return '❤️';
            default: return '📋';
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 glass-dark border-b border-white/10 animate-slide-down">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
                            <GlobeAltIcon className="w-8 h-8 text-primary-400" />
                            Community Quest Board
                        </h2>
                        <p className="text-gray-400">Claim quests created by the community</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-primary-400">{quests.length}</div>
                        <div className="text-sm text-gray-400">Available Quests</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 flex-wrap">
                    {/* Category Filter */}
                    <div className="flex gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setCategoryFilter(cat.value)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${categoryFilter === cat.value
                                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white'
                                        : 'glass text-gray-400 hover:text-white'
                                    }`}
                            >
                                <span className="mr-2">{cat.icon}</span>
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Difficulty Filter */}
                    <div className="flex gap-2">
                        {difficulties.map(diff => (
                            <button
                                key={diff.value}
                                onClick={() => setDifficultyFilter(diff.value)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${difficultyFilter === diff.value
                                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white'
                                        : 'glass text-gray-400 hover:text-white'
                                    }`}
                            >
                                {diff.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quest Grid */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="glass rounded-xl p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading community quests...</p>
                    </div>
                ) : quests.length === 0 ? (
                    <div className="glass rounded-xl p-12 text-center">
                        <UserGroupIcon className="w-20 h-20 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg mb-2">No community quests available</p>
                        <p className="text-gray-500 text-sm">
                            Be the first to create a public quest for the community!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {quests.map((quest, index) => (
                            <div
                                key={quest.quest_id}
                                className="glass rounded-xl p-6 card-hover animate-fade-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Quest Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-3xl">{getCategoryIcon(quest.category)}</span>
                                        <div>
                                            <h3 className="font-bold text-lg">{quest.title}</h3>
                                            <span className="text-sm text-gray-400">{quest.category}</span>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getDifficultyColor(quest.difficulty)}`}>
                                        {quest.difficulty}
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                                    {quest.description}
                                </p>

                                {/* Quest Details */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center text-sm text-gray-400">
                                        <ClockIcon className="w-4 h-4 mr-2" />
                                        <span>{quest.estimated_time}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-400">
                                        <MapPinIcon className="w-4 h-4 mr-2" />
                                        <span>
                                            {quest.location.lat.toFixed(4)}, {quest.location.lng.toFixed(4)}
                                        </span>
                                    </div>
                                </div>

                                {/* Impact Metric */}
                                {quest.impact_metric && (
                                    <div className="mb-4 p-3 glass-dark rounded-lg">
                                        <div className="text-xs text-gray-500 mb-1">Impact Goal</div>
                                        <div className="text-sm font-medium text-primary-400">
                                            {quest.impact_metric}
                                        </div>
                                    </div>
                                )}

                                {/* Community Benefit */}
                                {quest.community_benefit && (
                                    <div className="mb-4 p-3 glass-dark rounded-lg">
                                        <div className="text-xs text-gray-500 mb-1">Community Benefit</div>
                                        <div className="text-sm text-gray-300 line-clamp-2">
                                            {quest.community_benefit}
                                        </div>
                                    </div>
                                )}

                                {/* Claim Button */}
                                <button
                                    onClick={() => claimQuest(quest.quest_id, quest.title)}
                                    className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-2"
                                >
                                    <UserGroupIcon className="w-5 h-5" />
                                    <span>Claim Quest</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityBoard;
