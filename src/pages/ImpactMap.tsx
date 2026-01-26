import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useApp } from '../context/AppContext';
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');

    const categories = ['Environment', 'Social', 'Education', 'Health'];

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
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to get your location. Using default (Ibadan).');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    };

    const handleAskArchitect = async () => {
        setIsGenerating(true);

        try {
            // Call backend API to generate quest
            const response = await fetch('http://localhost:8000/api/generate-quest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coordinates: {
                        lat: center[0],
                        lng: center[1],
                    },
                    resolution_category: selectedCategory,
                    user_preferences: null,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate quest');
            }

            const quest: Quest = await response.json();

            // Update quest status to Active
            const questWithStatus = {
                ...quest,
                status: 'Active' as const,
            };

            addQuest(questWithStatus);
            setIsGenerating(false);
            alert('Quest generated! Check Quest Hub for details.');
        } catch (error) {
            console.error('Error generating quest:', error);
            setIsGenerating(false);
            alert('Failed to generate quest. Make sure the backend server is running on port 8000.');
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

                        {quests.map((quest) => (
                            <Marker
                                key={quest.quest_id}
                                position={[quest.location.lat, quest.location.lng]}
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
                        ))}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default ImpactMap;
