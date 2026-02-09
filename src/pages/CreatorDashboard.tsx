import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../context/AuthContext';
import { SparklesIcon, GlobeAltIcon, LockClosedIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Quest {
    quest_id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    location: { lat: number; lng: number };
    impact_metric: string;
    estimated_time: string;
    status: string;
    created_by: string;
    assigned_to: string | null;
}

const CreatorDashboard = () => {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCreatedQuests();
    }, []);

    const fetchCreatedQuests = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/quests/created-by-me');
            setQuests(response.data);
        } catch (error) {
            console.error('Error fetching created quests:', error);
            toast.error('Failed to load your created quests');
        } finally {
            setLoading(false);
        }
    };

    const togglePublic = async (questId: string, makePublic: boolean) => {
        const toastId = toast.loading(
            makePublic ? 'Making quest public...' : 'Making quest private...'
        );

        try {
            const response = await apiClient.post(`/api/quests/${questId}/toggle-public`, {
                make_public: makePublic
            });

            console.log('Toggle response:', response.data);

            toast.success(makePublic ? 'Quest is now public! 🌍' : 'Quest is now private 🔒', {
                id: toastId,
                description: makePublic
                    ? 'Community members can now claim this quest'
                    : 'Only you can complete this quest'
            });

            // Refresh the list
            await fetchCreatedQuests();
        } catch (error: any) {
            console.error('Toggle error:', error);
            console.error('Error response:', error.response?.data);

            toast.error('Failed to update quest', {
                id: toastId,
                description: error.response?.data?.detail || error.message || 'Please try again'
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

    const publicQuests = quests.filter(q => q.assigned_to === null);
    const privateQuests = quests.filter(q => q.assigned_to !== null);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 glass-dark border-b border-white/10 animate-slide-down">
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-8 h-8 text-primary-400" />
                    Creator Dashboard
                </h2>
                <p className="text-gray-400">Track quests you've created for the community</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="glass rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-primary-400">{quests.length}</div>
                        <div className="text-sm text-gray-400">Total Created</div>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-accent-400">{publicQuests.length}</div>
                        <div className="text-sm text-gray-400">Public Quests</div>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-blue-400">{privateQuests.length}</div>
                        <div className="text-sm text-gray-400">Private Quests</div>
                    </div>
                </div>
            </div>

            {/* Quest List */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="glass rounded-xl p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading your quests...</p>
                    </div>
                ) : quests.length === 0 ? (
                    <div className="glass rounded-xl p-12 text-center">
                        <SparklesIcon className="w-20 h-20 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg mb-2">No quests created yet</p>
                        <p className="text-gray-500 text-sm">
                            Go to the Impact Map to generate your first community quest!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {quests.map((quest, index) => (
                            <div
                                key={quest.quest_id}
                                className="glass rounded-xl p-6 card-hover animate-fade-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Public/Private Badge */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-3xl">{getCategoryIcon(quest.category)}</span>
                                        <div>
                                            <h3 className="font-bold text-lg">{quest.title}</h3>
                                            <span className="text-sm text-gray-400">{quest.category}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getDifficultyColor(quest.difficulty)}`}>
                                            {quest.difficulty}
                                        </span>
                                        {quest.assigned_to === null ? (
                                            <span className="px-2 py-1 bg-primary-500 rounded text-xs font-bold flex items-center gap-1">
                                                <GlobeAltIcon className="w-3 h-3" />
                                                Public
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-600 rounded text-xs font-bold flex items-center gap-1">
                                                <LockClosedIcon className="w-3 h-3" />
                                                Private
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
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
                                    {quest.assigned_to && quest.assigned_to !== quest.created_by && (
                                        <div className="text-sm">
                                            <span className="text-gray-400">Status: </span>
                                            <span className="text-accent-400 font-medium">
                                                Claimed by community member
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Toggle Button */}
                                <button
                                    onClick={() => togglePublic(
                                        quest.quest_id,
                                        quest.assigned_to !== null
                                    )}
                                    className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-300 ${quest.assigned_to === null
                                        ? 'bg-gray-600 hover:bg-gray-700'
                                        : 'bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600'
                                        }`}
                                    disabled={quest.assigned_to !== null && quest.assigned_to !== quest.created_by}
                                >
                                    {quest.assigned_to === null ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <LockClosedIcon className="w-4 h-4" />
                                            Make Private
                                        </span>
                                    ) : quest.assigned_to === quest.created_by ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <GlobeAltIcon className="w-4 h-4" />
                                            Make Public
                                        </span>
                                    ) : (
                                        <span className="text-sm">Quest Claimed</span>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatorDashboard;
