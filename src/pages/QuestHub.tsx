import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../context/AuthContext';
import { CloudArrowUpIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { Quest } from '../context/AppContext';

const QuestHub = () => {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Active' | 'In Progress' | 'Completed'>('Active');
    const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [proofText, setProofText] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Fetch quests from backend
    useEffect(() => {
        fetchQuests();
    }, []);

    const fetchQuests = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/quests/my');
            setQuests(response.data);
        } catch (error) {
            console.error('Error fetching quests:', error);
            toast.error('Failed to load quests', {
                description: 'Please try refreshing the page'
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredQuests = quests.filter(q => q.status === activeTab);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProofImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitProof = async () => {
        if (!selectedQuest || !proofImage) {
            toast.error('Missing required information', {
                description: 'Please select an image to upload'
            });
            return;
        }

        setIsVerifying(true);
        const toastId = toast.loading('Verifying with AI...', {
            description: 'Analyzing your proof of completion'
        });

        try {
            // Create form data for image upload
            const formData = new FormData();
            formData.append('quest_id', selectedQuest.quest_id);
            formData.append('image', proofImage);
            formData.append('description', proofText || 'Quest completion proof');

            // Call the vision verification API
            const response = await apiClient.post('/api/verify-quest-proof', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const result = response.data;

            // Update local quest status
            setQuests(prevQuests =>
                prevQuests.map(q =>
                    q.quest_id === selectedQuest.quest_id
                        ? { ...q, status: result.verification_result === 'Verified' ? 'Completed' : 'In Progress' }
                        : q
                )
            );

            // Clear form
            setSelectedQuest(null);
            setProofImage(null);
            setProofText('');
            setImagePreview(null);

            // Show result
            if (result.verification_result === 'Verified') {
                toast.success(`Quest verified! 🎉`, {
                    id: toastId,
                    description: `You earned ${result.suggested_points} points! Confidence: ${(result.confidence_score * 100).toFixed(0)}%`
                });
            } else {
                toast.warning('Verification inconclusive', {
                    id: toastId,
                    description: result.reasoning || 'Please try submitting clearer proof'
                });
            }
        } catch (error: any) {
            console.error('Error verifying quest:', error);
            toast.error('Verification failed', {
                id: toastId,
                description: error.response?.data?.detail || 'Please try again later'
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const updateQuestStatus = async (quest_id: string, newStatus: 'Active' | 'In Progress' | 'Completed') => {
        try {
            // Update backend
            await apiClient.put(`/api/quests/${quest_id}/status`, {
                status: newStatus
            });

            // Update local state
            setQuests(prevQuests =>
                prevQuests.map(q =>
                    q.quest_id === quest_id ? { ...q, status: newStatus } : q
                )
            );

            toast.success('Quest status updated', {
                description: `Quest is now ${newStatus}`
            });
        } catch (error) {
            console.error('Error updating quest status:', error);
            toast.error('Failed to update status', {
                description: 'Please try again'
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

    const getCategoryEmoji = (category: string) => {
        switch (category) {
            case 'Environment': return '🌍';
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
                <h2 className="text-3xl font-bold mb-2">📋 Quest Hub</h2>
                <p className="text-gray-400">Manage your community impact quests</p>
            </div>

            {/* Tabs */}
            <div className="p-6 pb-4">
                <div className="flex space-x-2 glass rounded-lg p-1">
                    {(['Active', 'In Progress', 'Completed'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-300 ${activeTab === tab
                                ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quest Grid */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                {loading ? (
                    <div className="glass rounded-xl p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading quests...</p>
                    </div>
                ) : filteredQuests.length === 0 ? (
                    <div className="glass rounded-xl p-12 text-center">
                        <p className="text-gray-400 text-lg">No {activeTab.toLowerCase()} quests yet</p>
                        <p className="text-gray-500 text-sm mt-2">
                            {activeTab === 'Active' ? 'Generate a new quest from the Impact Map!' : 'Start working on an active quest!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredQuests.map((quest) => (
                            <div
                                key={quest.quest_id}
                                className="glass rounded-xl p-6 card-hover animate-fade-in"
                            >
                                {/* Quest Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-3xl">{getCategoryEmoji(quest.category)}</span>
                                        <div>
                                            <h3 className="font-bold text-lg">{quest.title}</h3>
                                            <span className="text-sm text-gray-400">{quest.category}</span>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 ${getDifficultyColor(quest.difficulty)} text-white text-xs rounded-full font-medium`}>
                                        {quest.difficulty}
                                    </span>
                                </div>

                                {/* Quest Description */}
                                <p className="text-gray-300 text-sm mb-4">{quest.description}</p>

                                {/* Quest Metrics */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center space-x-2 text-sm">
                                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                                        <span className="text-gray-400">Impact:</span>
                                        <span className="text-green-400 font-medium">{quest.impact_metric}</span>
                                    </div>
                                    {quest.estimated_time && (
                                        <div className="flex items-center space-x-2 text-sm">
                                            <ClockIcon className="w-4 h-4 text-blue-400" />
                                            <span className="text-gray-400">Time:</span>
                                            <span className="text-blue-400 font-medium">{quest.estimated_time}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Button */}
                                {quest.status === 'Active' && (
                                    <button
                                        onClick={() => {
                                            updateQuestStatus(quest.quest_id, 'In Progress');
                                        }}
                                        className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-all duration-300"
                                    >
                                        Start Quest
                                    </button>
                                )}

                                {quest.status === 'In Progress' && (
                                    <button
                                        onClick={() => setSelectedQuest(quest)}
                                        className="w-full px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 rounded-lg font-medium transition-all duration-300"
                                    >
                                        Submit Proof
                                    </button>
                                )}

                                {quest.status === 'Completed' && (
                                    <div className="flex items-center justify-center space-x-2 text-green-400">
                                        <CheckCircleIcon className="w-5 h-5" />
                                        <span className="font-medium">Completed</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Proof Submission Modal */}
            {selectedQuest && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
                    <div className="glass-dark rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-auto animate-slide-up">
                        <h3 className="text-2xl font-bold mb-4">Submit Proof of Impact</h3>
                        <p className="text-gray-400 mb-6">Quest: {selectedQuest.title}</p>

                        {/* Image Upload */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Upload Photo Evidence</label>
                            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary-500 transition-all duration-300">
                                {imagePreview ? (
                                    <div className="relative">
                                        <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                                        <button
                                            onClick={() => {
                                                setProofImage(null);
                                                setImagePreview(null);
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer">
                                        <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                        <p className="text-gray-400">Click to upload or drag and drop</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Text Description */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Description (optional)</label>
                            <textarea
                                value={proofText}
                                onChange={(e) => setProofText(e.target.value)}
                                placeholder="Describe what you did and the impact you made..."
                                rows={4}
                                className="w-full px-4 py-3 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-400 resize-none"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex space-x-4">
                            <button
                                onClick={() => {
                                    setSelectedQuest(null);
                                    setProofImage(null);
                                    setProofText('');
                                    setImagePreview(null);
                                }}
                                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-all duration-300"
                                disabled={isVerifying}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitProof}
                                disabled={!proofImage || isVerifying}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 rounded-lg font-medium transition-all duration-300 disabled:opacity-50"
                            >
                                {isVerifying ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="w-5 h-5 spinner" />
                                        <span>Verifying...</span>
                                    </div>
                                ) : (
                                    'Submit for Verification'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestHub;
