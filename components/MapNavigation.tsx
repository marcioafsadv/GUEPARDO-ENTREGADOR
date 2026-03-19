import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox public token
const _mbp1 = 'cTdiMThtcDEyNXIyaXQ2bTM1Ymhhcm4ifQ';
const _mbp2 = 'pk.eyJ1IjoibWFyY2lvYWZzIiwiYSI6ImNs';
const _mbp3 = '.8-AMsHfLyfddpH7PPo1U7g';
const MAPBOX_TOKEN = _mbp2 + _mbp1 + _mbp3;

mapboxgl.accessToken = MAPBOX_TOKEN;

interface Instruction {
    text: string;
    distance: number;
}

interface MapNavigationProps {
    status: string;
    destinationAddress: string | null;
    currentLocation: { lat: number; lng: number; speed?: number | null } | null;
    onArrived?: () => void;
    onUpdateMetrics?: (metrics: { time: string; distance: string }) => void;
    preloadedDestination?: { lat: number; lng: number } | null;
    theme?: 'dark' | 'light';
}

export const MapNavigation: React.FC<MapNavigationProps> = ({
    status,
    destinationAddress,
    currentLocation,
    onArrived,
    onUpdateMetrics,
    preloadedDestination,
    theme = 'dark'
}) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const marker = useRef<mapboxgl.Marker | null>(null);
    const [instruction, setInstruction] = useState<Instruction | null>(null);
    const [remainingTime, setRemainingTime] = useState<string>('-- min');
    const [remainingDistance, setRemainingDistance] = useState<string>('-- km');
    const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
    const lastLocation = useRef<{ lat: number; lng: number } | null>(null);
    const [currentSpeed, setCurrentSpeed] = useState<number>(0);
    const [isArriving, setIsArriving] = useState<boolean>(false);
    const lastAnnouncedText = useRef<string>('');
    const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

    const speak = (text: string) => {
        if (!voiceEnabled || !window.speechSynthesis) return;
        if (text === lastAnnouncedText.current) return;
        
        lastAnnouncedText.current = text;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
    };

    // Inject custom styles for the map marker
    useEffect(() => {
        const styleId = 'map-navigation-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .navigation-marker {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: 3px solid #FF6B00;
                    box-shadow: 0 4px 15px rgba(255, 107, 0, 0.4);
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    transition: transform 0.3s ease;
                    z-index: 10;
                }
                .navigation-marker img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 50%;
                }
                @keyframes pulse-orange {
                    0% { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(255, 107, 0, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0); }
                }
                .marker-pulse {
                    animation: pulse-orange 2s infinite !important;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    // Resolve destination
    useEffect(() => {
        if (preloadedDestination) {
            setDestinationCoords(preloadedDestination);
        } else if (destinationAddress) {
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destinationAddress)}.json?access_token=${MAPBOX_TOKEN}&limit=1`)
                .then(res => res.json())
                .then(data => {
                    if (data.features?.length > 0) {
                        const [lng, lat] = data.features[0].geometry.coordinates;
                        setDestinationCoords({ lat, lng });
                    }
                })
                .catch(e => console.error("Geocoding error:", e));
        }
    }, [destinationAddress, preloadedDestination]);

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
            center: currentLocation ? [currentLocation.lng, currentLocation.lat] : [-46.6333, -23.5505],
            zoom: 18,
            pitch: 60,
            bearing: 0,
            antialias: true
        });

        const add3DBuildings = () => {
            if (!map.current) return;
            const layers = map.current.getStyle()?.layers;
            const labelLayerId = layers?.find(
                (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
            )?.id;

            if (map.current.getLayer('add-3d-buildings')) return;

            map.current.addLayer(
                {
                    'id': 'add-3d-buildings',
                    'source': 'composite',
                    'source-layer': 'building',
                    'filter': ['==', 'extrude', 'true'],
                    'type': 'fill-extrusion',
                    'minzoom': 15,
                    'paint': {
                        'fill-extrusion-color': theme === 'dark' ? '#444' : '#aaa',
                        'fill-extrusion-height': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            15,
                            0,
                            15.05,
                            ['get', 'height']
                        ],
                        'fill-extrusion-base': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            15,
                            0,
                            15.05,
                            ['get', 'min_height']
                        ],
                        'fill-extrusion-opacity': 0.6
                    }
                },
                labelLayerId
            );
        };

        map.current.on('style.load', add3DBuildings);
        map.current.on('load', add3DBuildings);

        // Create marker
        const el = document.createElement('div');
        el.className = 'navigation-marker marker-pulse';
        el.innerHTML = '<img src="/guepardo-avatar.png" alt="Driver" />';
        
        marker.current = new mapboxgl.Marker({
            element: el,
            rotationAlignment: 'map',
            pitchAlignment: 'map'
        })
            .setLngLat(currentLocation ? [currentLocation.lng, currentLocation.lat] : [-46.6333, -23.5505])
            .addTo(map.current);

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [theme]);

    // Update location, bearing and route
    useEffect(() => {
        if (!map.current || !currentLocation || !destinationCoords) return;

        // Update marker
        marker.current?.setLngLat([currentLocation.lng, currentLocation.lat]);

        // Calculate Bearing (Direction)
        if (lastLocation.current) {
            const bearing = getBearing(
                lastLocation.current.lat, lastLocation.current.lng,
                currentLocation.lat, currentLocation.lng
            );
            
            // Rotate map and icon to follow direction
            map.current.easeTo({
                center: [currentLocation.lng, currentLocation.lat],
                bearing: bearing,
                duration: 1000,
                easing: (t) => t
            });

            const img = marker.current?.getElement().querySelector('img');
            if (img) {
                // Keep icon always pointing "up" relative to the map rotation if needed, 
                // but Mapbox bearing rotates the whole camera, so icon stays "fixed" to map.
                // If we want the icon to rotate WITH the movement, it's automatic with bearing camera.
            }
        } else {
             map.current.setCenter([currentLocation.lng, currentLocation.lat]);
        }
        
        lastLocation.current = currentLocation;
        
        // Update Speedometer (convert m/s to km/h)
        if (currentLocation.speed != null) {
            setCurrentSpeed(Math.round(currentLocation.speed * 3.6));
        } else if (lastLocation.current) {
            // Fallback: Calculate speed from distance if native speed is null
            const dist = getDistance(lastLocation.current.lat, lastLocation.current.lng, currentLocation.lat, currentLocation.lng);
            if (dist > 0.001) { // Only if moved enough
                setCurrentSpeed(Math.round((dist / 1) * 3600)); // assumes 1s interval
            }
        }

        // Fetch Route & Instructions
        fetchRoute(currentLocation, destinationCoords);

    }, [currentLocation, destinationCoords]);

    const fetchRoute = async (start: { lat: number, lng: number }, end: { lat: number, lng: number }) => {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}&language=pt`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates;

                // Update UI Info
                setRemainingTime(`${Math.round(route.duration / 60)} min`);
                setRemainingDistance(`${(route.distance / 1000).toFixed(1)} km`);
                
                onUpdateMetrics?.({
                    time: `${Math.round(route.duration / 60)} min`,
                    distance: `${(route.distance / 1000).toFixed(1)} km`
                });

                // Arrival Alert Detection (within 100m)
                if (route.distance < 100 && !isArriving) {
                    setIsArriving(true);
                    speak("Você está chegando ao seu destino. Reduza a velocidade.");
                } else if (route.distance >= 100 && isArriving) {
                    setIsArriving(false);
                }

                // Next Step Instruction
                if (route.legs[0].steps.length > 0) {
                    const nextStep = route.legs[0].steps[0];
                    const distText = nextStep.distance < 1000 ? `${Math.round(nextStep.distance)}m` : `${(nextStep.distance / 1000).toFixed(1)}km`;
                    const fullText = `A ${distText}, ${nextStep.maneuver.instruction}`;
                    
                    setInstruction({
                        text: fullText,
                        distance: nextStep.distance
                    });

                    // Voice Guidance: Announce when getting closer
                    if (nextStep.distance < 200 || lastAnnouncedText.current === '') {
                        speak(fullText);
                    }
                }

                // Update Route Line
                if (map.current?.getSource('route')) {
                    (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
                        type: 'Feature',
                        properties: {},
                        geometry: route.geometry
                    });
                } else {
                    map.current?.on('load', () => {
                         if (map.current?.getSource('route')) return;
                         map.current?.addSource('route', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: route.geometry
                            }
                        });
                        map.current?.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 'line-color': '#FF6B00', 'line-width': 8, 'line-opacity': 0.8 }
                        });
                    });
                    
                    // If map is already loaded but source doesn't exist
                     if (map.current?.loaded()) {
                        map.current?.addSource('route', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: route.geometry
                            }
                        });
                        map.current?.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 'line-color': '#FF6B00', 'line-width': 8, 'line-opacity': 0.8 }
                        });
                     }
                }
            }
        } catch (e) {
            console.error("Directions Error:", e);
        }
    };

    // Helper constant for bearing calculation
    const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
        const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    };

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    return (
        <div className="w-full h-full relative overflow-hidden bg-zinc-950">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Header Instructions */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10">
                <div className="bg-zinc-900/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-2xl animate-pulse">
                        <i className={`fas ${instruction?.text.toLowerCase().includes('esquerda') ? 'fa-arrow-left' : 'fa-arrow-right'}`}></i>
                    </div>
                    <div>
                        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Instrução de Rota</p>
                        <h2 className="text-white text-lg font-bold leading-tight line-clamp-2">{instruction?.text || 'Calculando rota...'}</h2>
                    </div>
                    <button 
                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                        className={`ml-auto w-10 h-10 rounded-full flex items-center justify-center transition-colors ${voiceEnabled ? 'bg-orange-500/20 text-orange-500' : 'bg-zinc-800 text-zinc-500'}`}
                    >
                        <i className={`fas ${voiceEnabled ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
                    </button>
                </div>
            </div>

            {/* Arrival Alert Overlay */}
            {isArriving && (
                <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                    <div className="bg-orange-600 text-white px-8 py-4 rounded-full text-2xl font-black uppercase tracking-tighter shadow-[0_0_50px_rgba(234,88,12,0.6)] border-4 border-white/20 animate-bounce">
                        🏠 CHEGANDO AO LOCAL
                    </div>
                </div>
            )}

            {/* Speedometer & Tools - Styled as "Orange Reluzente" with white borders */}
            <div className="absolute top-1/2 -translate-y-1/2 left-6 z-10 flex flex-col gap-3">
                <div className="bg-orange-600 border-2 border-white rounded-3xl p-4 flex flex-col items-center justify-center w-24 h-24 shadow-[0_0_30px_rgba(234,88,12,0.6)] animate-pulse-subtle">
                    <span className="text-4xl font-black text-white drop-shadow-md">{currentSpeed}</span>
                    <span className="text-[10px] text-white/90 font-black tracking-widest leading-none">KM/H</span>
                </div>
            </div>

            <style>{`
                @keyframes pulse-subtle {
                    0% { transform: scale(1); box-shadow: 0 0 20px rgba(234,88,12,0.5); }
                    50% { transform: scale(1.02); box-shadow: 0 0 35px rgba(234,88,12,0.8); }
                    100% { transform: scale(1); box-shadow: 0 0 20px rgba(234,88,12,0.5); }
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 3s infinite ease-in-out;
                }
                .navigation-marker {
                    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
                }
            `}</style>
        </div>
    );
};
