import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MagnifyingGlassIcon, SparklesIcon, MapIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { apiClient } from '../context/AuthContext';
import type { Quest } from '../context/AppContext';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Map container style
const mapContainerStyle = {
    width: '100%',
    height: '100%'
};

// Default center (Ibadan, Nigeria)
const defaultCenter = {
    lat: 7.3775,
    lng: 3.9470
};

const ImpactMap = () => {
    const { quests, addQuest } = useApp();

    // Load Google Maps script
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        id: 'google-map-script'
    });

    const [center, setCenter] = useState(defaultCenter);
    const [selectedCategory, setSelectedCategory] = useState<string>('Environment');
    const [isGenerating, setIsGenerating] = useState(false);
    const [apiQuests, setApiQuests] = useState<Quest[]>([]);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
    const [clickedPosition, setClickedPosition] = useState<{ lat: number; lng: number } | null>(null);

    // Map options for better styling (defined as function to avoid google namespace issues)
    const getMapOptions = useCallback(() => ({
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: window.google?.maps?.MapTypeControlStyle?.DROPDOWN_MENU,
            position: window.google?.maps?.ControlPosition?.TOP_RIGHT,
            mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
        },
        scaleControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        styles: [
            {
                featureType: 'poi.business',
                stylers: [{ visibility: 'on' }]
            }
        ]
    }), []);

    // Fetch ALL quests from all users
    useEffect(() => {
        const fetchQuests = async () => {
            try {
                const response = await apiClient.get('/api/quests/all');
                setApiQuests(response.data);
            } catch (error) {
                console.error('Error fetching quests:', error);
            }
        };

        fetchQuests();
    }, []);

    // Combine API and context quests
    const allQuests = [...apiQuests, ...quests];

    const handleMapClick = (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            setClickedPosition({ lat, lng });
            setCenter({ lat, lng });
        }
    };

    const handleScanArea = () => {
        if (map) {
            const currentCenter = map.getCenter();
            if (currentCenter) {
                setCenter({
                    lat: currentCenter.lat(),
                    lng: currentCenter.lng()
                });
                toast.success(`Scanning area around (${currentCenter.lat().toFixed(4)}, ${currentCenter.lng().toFixed(4)})`);
            }
        }
    };

    const handleAskArchitect = async () => {
        if (isGenerating) return;

        setIsGenerating(true);

        // Show loading toast
        const toastId = toast.loading('Generating quest...', {
            description: 'Community Architect is creating a personalized community quest'
        });

        try {
            const mapCenter = map?.getCenter();
            const coords = mapCenter ? { lat: mapCenter.lat(), lng: mapCenter.lng() } : center;

            const response = await apiClient.post('/api/generate-quest', {
                coordinates: coords,
                resolution_category: selectedCategory,
                make_public: true
            });

            const newQuest = response.data;
            addQuest(newQuest);

            // Update toast to success
            if (newQuest.location?.name) {
                toast.success(`✨ Quest generated at ${newQuest.location.name}!`, {
                    id: toastId,
                    description: 'Check the map to see your new quest marker, and go to the Community Board to claim it'
                });
            } else {
                toast.success('✨ Quest generated successfully!', {
                    id: toastId,
                    description: 'Check the map to see your new quest marker, and go to the Community Board to claim it'
                });
            }

            // Center map on new quest
            if (newQuest.location) {
                setCenter({
                    lat: newQuest.location.lat,
                    lng: newQuest.location.lng
                });
            }

        } catch (error: any) {
            console.error('Error generating quest:', error);
            toast.error(error.response?.data?.detail || 'Failed to generate quest', {
                id: toastId,
                description: 'Please try again or select a different location'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Handle loading error
    if (loadError) {
        return (
            <div className="flex items-center justify-center h-screen bg-dark-900">
                <div className="text-center">
                    <p className="text-red-500 text-xl">❌ Error loading Google Maps</p>
                    <p className="text-gray-400 mt-2">Please check your API key and try again</p>
                </div>
            </div>
        );
    }

    // Handle missing API key
    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div className="flex items-center justify-center h-screen bg-dark-900">
                <div className="text-center">
                    <p className="text-red-500 text-xl">❌ Google Maps API key not configured</p>
                    <p className="text-gray-400 mt-2">Please add VITE_GOOGLE_MAPS_API_KEY to your .env file</p>
                </div>
            </div>
        );
    }

    // Show loading state
    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-screen bg-dark-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-primary-400 text-lg">Loading Google Maps...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-dark-900 text-white">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-dark-800/50 backdrop-blur-sm border-b border-white/10">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                        Impact Map
                    </h1>
                    <p className="text-gray-400 mt-1">Discover community impact opportunities near you</p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Active Quests:</span>
                    <span className="px-4 py-2 bg-primary-500/20 border border-primary-500/30 rounded-lg font-bold text-primary-400">
                        {allQuests.length}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="px-8 mb-5 py-6 bg-dark-800/30 backdrop-blur-sm border-b border-white/10">
                <div className="flex flex-wrap items-center justify-center gap-8 max-w-6xl mx-auto">
                    {/* Category Selector - Brutalist Style */}
                    <div className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-lg border-2 border-white/20">
                        <label className="text-sm font-bold tracking-wider uppercase text-gray-200">
                            CATEGORY:
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="brutalist-select"
                        >
                            <option value="Environment">🌿 ENVIRONMENT</option>
                            <option value="Education">📚 EDUCATION</option>
                            <option value="Health">❤️ HEALTH</option>
                            <option value="Social">🤝 SOCIAL</option>
                        </select>
                    </div>

                    {/* Action Buttons Container */}
                    <div className="flex gap-6 p-4 bg-dark-800/50 rounded-lg border-2 border-white/20">
                        {/* Scan Area Button */}
                        <button
                            onClick={handleScanArea}
                            className="brutalist-btn brutalist-btn-secondary group relative"
                        >
                            <MagnifyingGlassIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="font-bold tracking-wider">SCAN AREA</span>
                        </button>

                        {/* Ask Architect Button */}
                        <button
                            onClick={handleAskArchitect}
                            disabled={isGenerating}
                            className="brutalist-btn brutalist-btn-primary group relative disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 spinner" />
                                    <span className="font-bold tracking-wider">GENERATING...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                    <span className="font-bold tracking-wider">ASK ARCHITECT</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 px-6 py-3">
                <div className="h-full rounded-xl overflow-hidden shadow-2xl border border-white/10">
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={center}
                        zoom={13}
                        onLoad={onLoad}
                        onUnmount={onUnmount}
                        onClick={handleMapClick}
                        options={getMapOptions()}
                    >
                        {/* Quest Markers */}
                        {allQuests.map((quest) => (
                            <Marker
                                key={quest.quest_id}
                                position={{
                                    lat: quest.location.lat,
                                    lng: quest.location.lng
                                }}
                                onClick={() => setSelectedQuest(quest)}
                                icon={{
                                    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
                                    scaledSize: { width: 25, height: 41 },
                                    anchor: { x: 12, y: 41 }
                                }}
                            />
                        ))}

                        {/* Clicked Position Marker */}
                        {clickedPosition && (
                            <Marker
                                position={clickedPosition}
                                icon={{
                                    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                    scaledSize: { width: 25, height: 41 },
                                    anchor: { x: 12, y: 41 }
                                }}
                            />
                        )}

                        {/* Info Window for Selected Quest */}
                        {selectedQuest && (
                            <InfoWindow
                                position={{
                                    lat: selectedQuest.location.lat,
                                    lng: selectedQuest.location.lng
                                }}
                                onCloseClick={() => setSelectedQuest(null)}
                            >
                                <div className="p-2 min-w-[250px]" style={{ color: '#1f2937' }}>
                                    <h3 className="font-bold text-lg mb-1">{selectedQuest.title}</h3>

                                    {/* Location Name (NEW!) */}
                                    {selectedQuest.location?.name && (
                                        <div className="flex items-center gap-1 mb-2 text-blue-600">
                                            <MapIcon className="w-4 h-4" />
                                            <span className="text-sm font-medium">{selectedQuest.location.name}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center mb-1">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded">
                                            {selectedQuest.category}
                                        </span>
                                        <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded">
                                            {selectedQuest.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-sm mb-2">{selectedQuest.description}</p>
                                    <p className="text-xs">
                                        <strong>Impact:</strong> {selectedQuest.impact_metric}
                                    </p>
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                </div>
            </div>

            {/* Quick Tips Section */}
            <div className="px-6 py-5 bg-gradient-to-r from-dark-800/50 via-dark-800/30 to-dark-800/50 backdrop-blur-sm border-t border-white/10">
                <div className="max-w-6xl mx-auto">
                    {/* Section Header */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary-500"></div>
                        <h3 className="text-sm font-bold tracking-wider uppercase text-primary-400 flex items-center gap-2">
                            <span className="text-xl">💡</span>
                            QUICK TIPS
                        </h3>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary-500"></div>
                    </div>

                    {/* Tips Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
                        {/* Tip 1 */}
                        <div className="group flex items-start gap-3 p-3 rounded-lg bg-dark-700/30 border border-white/5 hover:border-cyan-500/30 hover:bg-dark-700/50 transition-all duration-300">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <MapIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-300 mb-1">Select Location</p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Click on the map to set a location, select a category from dropdown menu
                                </p>
                            </div>
                        </div>

                        {/* Tip 2 - Generate Quest */}
                        <div className="group flex items-start gap-3 p-3 rounded-lg bg-dark-700/30 border border-white/5 hover:border-amber-500/30 hover:bg-dark-700/50 transition-all duration-300">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-300 mb-1">Generate Quest</p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Click "ASK ARCHITECT" to create a new AI-powered quest at your selected location
                                </p>
                            </div>
                        </div>

                        {/* Tip 3 */}
                        <div className="group flex items-start gap-3 p-3 rounded-lg bg-dark-700/30 border border-white/5 hover:border-purple-500/30 hover:bg-dark-700/50 transition-all duration-300">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <GlobeAltIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-300 mb-1">View Quest Markers</p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Purple markers show existing quests from the community across the map
                                </p>
                            </div>
                        </div>

                        {/* Tip 4 */}
                        <div className="group flex items-start gap-3 p-3 rounded-lg bg-dark-700/30 border border-white/5 hover:border-green-500/30 hover:bg-dark-700/50 transition-all duration-300">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <MagnifyingGlassIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-300 mb-1">Toggle Map Views</p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Switch between roadmap, satellite, hybrid, and terrain views using controls
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImpactMap;
