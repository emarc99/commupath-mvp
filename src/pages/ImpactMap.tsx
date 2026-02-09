import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MagnifyingGlassIcon, SparklesIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { apiClient } from '../context/AuthContext';
import type { Quest } from '../context/AppContext';

// Custom marker icon
const questIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to change map view
function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    map.setView(center, 13);
    return null;
}

const ImpactMap = () => {
    const { quests, addQuest } = useApp();
    const [center, setCenter] = useState<[number, number]>([7.3775, 3.9470]); // Ibadan
    const [selectedCategory, setSelectedCategory] = useState<string>('Environment');
    const [makePublic, setMakePublic] = useState<boolean>(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');
    const [apiQuests, setApiQuests] = useState<Quest[]>([]);

    const categories = ['Environment', 'Social', 'Education', 'Health'];

    // Fetch ALL quests from all users for community map
    useEffect(() => {
        const fetchQuests = async () => {
            try {
                // Fetch ALL quests from all users (public + private)
                // Note: Seeing a quest doesn't mean you can claim it!
                // Only public quests (assigned_to=NULL) can be claimed
                const response = await apiClient.get('/api/quests/all');

                setApiQuests(response.data);
            } catch (error) {
                console.error('Error fetching quests:', error);
            }
        };

        fetchQuests();
    }, []);

    // Combine AppContext quests (newly generated) with API quests (from database)
    // Remove duplicates based on quest_id
    const questMap = new Map();
    [...quests, ...apiQuests].forEach(quest => {
        questMap.set(quest.quest_id, quest);
    });
    const allQuests = Array.from(questMap.values());



    const handleScanQuests = () => {
        // Get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newCenter: [number, number] = [
                        position.coords.latitude,
                        position.coords.longitude
                    ];
                    setCenter(newCenter);
                    toast.success('Location updated!', {
                        description: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`
                    });
                },
                (error) => {
                    console.error('Error getting location:', error);
                    toast.warning('Unable to get your location', {
                        description: 'Using default location (Ibadan)'
                    });
                }
            );
        } else {
            toast.error('Geolocation not supported', {
                description: 'Your browser doesn\'t support geolocation'
            });
        }
    };

    const handleAskArchitect = async () => {
        setIsGenerating(true);
        const toastId = toast.loading('Generating quest...', {
            description: 'AI is creating a personalized community quest'
        });

        try {
            // Call backend API to generate quest (with authentication)
            const response = await apiClient.post('/api/generate-quest', {
                coordinates: {
                    lat: center[0],
                    lng: center[1],
                },
                resolution_category: selectedCategory,
                user_preferences: null,
                make_public: makePublic,
            });

            const quest: Quest = response.data;

            // Update quest status to Active
            const questWithStatus = {
                ...quest,
                status: 'Active' as const,
            };

            addQuest(questWithStatus);
            // Also add to API quests so it shows immediately
            setApiQuests(prev => [...prev, questWithStatus]);

            toast.success('Quest generated! 🎯', {
                id: toastId,
                description: `Check Quest Hub for "${quest.title}"`
            });
        } catch (error) {
            console.error('Error generating quest:', error);
            toast.error('Failed to generate quest', {
                id: toastId,
                description: 'Please check your connection and try again'
            });
        } finally {
            setIsGenerating(false);
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

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'Environment': return 'text-green-400';
            case 'Social': return 'text-blue-400';
            case 'Education': return 'text-purple-400';
            case 'Health': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 glass-dark border-b border-white/10 animate-slide-down">
                <h2 className="text-3xl font-bold mb-2">📍 Impact Map</h2>
                <p className="text-gray-400">Discover community impact quests near you</p>
            </div>

            {/* Controls */}
            <div className="p-6 space-y-4">
                {/* Location Search */}
                <div className="flex space-x-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-2 text-gray-300">
                            Search Location
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                                placeholder="e.g., Bodija, Ibadan"
                                className="w-full px-4 py-3 pl-10 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-400"
                            />
                            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">
                            Category
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-3 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Make Public Checkbox */}
                <div className="mb-4 p-4 glass rounded-lg">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={makePublic}
                            onChange={(e) => setMakePublic(e.target.checked)}
                            className="w-5 h-5 rounded border-2 border-primary-500 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 bg-gray-800 cursor-pointer"
                        />
                        <div className="flex items-center space-x-2">
                            <GlobeAltIcon className="w-5 h-5 text-primary-400" />
                            <span className="font-medium text-white">Make this quest public for the community</span>
                        </div>
                    </label>
                    <p className="text-sm text-gray-400 mt-2 ml-8">
                        {makePublic
                            ? '🌍 This quest will be available for anyone in the community to claim and complete'
                            : '🔒 This quest will be private and assigned only to you'
                        }
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                    <button
                        onClick={handleScanQuests}
                        className="flex items-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300 glass border border-white/20"
                    >
                        <MagnifyingGlassIcon className="w-5 h-5" />
                        <span className="font-medium">Scan for Quests</span>
                    </button>

                    <button
                        onClick={handleAskArchitect}
                        disabled={isGenerating}
                        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 rounded-lg transition-all duration-300 shadow-lg disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 spinner" />
                                <span className="font-medium">Generating...</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                <span className="font-medium">Ask Architect for Quest</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 p-6 pt-0">
                <div className="h-full rounded-xl overflow-hidden shadow-2xl border border-white/10">
                    <MapContainer
                        center={center}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                    >
                        <ChangeView center={center} />
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {allQuests.map((quest, index) => {
                            // Add small offset if multiple quests share same coordinates
                            // This prevents markers from stacking on top of each other
                            const offsetLat = (index * 0.002) - 0.007; // Spread vertically
                            const offsetLng = ((index % 3) * 0.002) - 0.002; // Spread horizontally

                            const position: [number, number] = [
                                quest.location.lat + offsetLat,
                                quest.location.lng + offsetLng
                            ];

                            return (
                                <Marker
                                    key={quest.quest_id}
                                    position={position}
                                    icon={questIcon}
                                >
                                    <Popup className="custom-popup">
                                        <div className="p-2 min-w-[250px]">
                                            <h3 className="font-bold text-lg mb-1 text-gray-800">{quest.title}</h3>
                                            <div className="flex items-center space-x-2 mb-2">
                                                <span className={`px-2 py-1 ${getDifficultyColor(quest.difficulty)} text-white text-xs rounded font-medium`}>
                                                    {quest.difficulty}
                                                </span>
                                                <span className={`text-sm font-medium ${getCategoryColor(quest.category)}`}>
                                                    {quest.category}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{quest.description}</p>
                                            <p className="text-xs text-gray-500">
                                                <strong>Impact:</strong> {quest.impact_metric}
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default ImpactMap;
