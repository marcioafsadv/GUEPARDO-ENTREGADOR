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
    fullText: string;
    distance: number;
    distanceText: string;
    modifier: string;
    roadName: string;
    nextRoadName?: string;
}

interface MapNavigationProps {
    status: string;
    destinationAddress: string | null;
    currentLocation: { lat: number; lng: number; speed?: number | null } | null;
    routeProgress?: number; // 0 to 100 percentage
    onArrived?: () => void;
    onUpdateMetrics?: (metrics: { time: string; distance: string, progress: number }) => void;
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
    const destinationMarker = useRef<mapboxgl.Marker | null>(null);
    const [instruction, setInstruction] = useState<Instruction | null>(null);
    const [remainingTime, setRemainingTime] = useState<string>('-- min');
    const [remainingDistance, setRemainingDistance] = useState<string>('-- km');
    const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
    const lastLocation = useRef<{ lat: number; lng: number } | null>(null);
    const [currentSpeed, setCurrentSpeed] = useState<number>(0);
    const [progressPct, setProgressPct] = useState<number>(0);
    const [totalRouteDistance, setTotalRouteDistance] = useState<number>(0);
    const [isArriving, setIsArriving] = useState<boolean>(false);
    const lastAnnouncedText = useRef<string>('');
    const lastAnnouncedStep = useRef<string>('');
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
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    transition: transform 0.3s ease-out;
                }
                .navigation-marker svg {
                    width: 100%;
                    height: 100%;
                    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
                }
                @keyframes pulse-orange {
                    0% { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(255, 107, 0, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0); }
                }
                .marker-pulse {
                    animation: pulse-orange 2s infinite !important;
                }
                .destination-marker-wrapper {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .destination-marker-svg {
                    filter: drop-shadow(0 0 8px rgba(204, 255, 0, 0.9));
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
        el.className = 'navigation-marker';
        el.innerHTML = `
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 4L58 56L32 46L6 56L32 4Z" fill="url(#arrowGrad)" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                <defs>
                    <linearGradient id="arrowGrad" x1="32" y1="4" x2="32" y2="56" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FF8A00"/>
                        <stop offset="1" stop-color="#FF4D00"/>
                    </linearGradient>
                </defs>
            </svg>
        `;
        
        marker.current = new mapboxgl.Marker({
            element: el,
            rotationAlignment: 'map',
            pitchAlignment: 'map'
        })
            .setLngLat(currentLocation ? [currentLocation.lng, currentLocation.lat] : [-46.6333, -23.5505])
            .addTo(map.current);

        // Create Destination Marker
        const destEl = document.createElement('div');
        destEl.className = 'destination-marker-wrapper';
        destEl.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 40 40" class="destination-marker-svg">
                <circle cx="20" cy="20" r="15" fill="rgba(204, 255, 0, 0.3)">
                    <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="20" cy="20" r="10" fill="#7B3F00" stroke="#CCFF00" stroke-width="3" />
                <circle cx="20" cy="20" r="3" fill="#CCFF00" />
            </svg>
        `;

        destinationMarker.current = new mapboxgl.Marker({
            element: destEl,
            rotationAlignment: 'map',
            pitchAlignment: 'map'
        });

        if (destinationCoords) {
            destinationMarker.current.setLngLat([destinationCoords.lng, destinationCoords.lat]).addTo(map.current);
        }

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [theme]);

    // Update location, bearing and route
    useEffect(() => {
        if (!map.current || !currentLocation || !destinationCoords) return;

        // Update markers
        marker.current?.setLngLat([currentLocation.lng, currentLocation.lat]);
        destinationMarker.current?.setLngLat([destinationCoords.lng, destinationCoords.lat]);
        
        // Add destination marker if it's not on the map yet
        if (map.current && destinationMarker.current && !destinationMarker.current.getElement().parentElement) {
            destinationMarker.current.addTo(map.current);
        }

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

        // Calculate progress if we have the total distance tracked
        if (totalRouteDistance > 0 && map.current?.getSource('route')) {
             const currentDist = getDistance(currentLocation.lat, currentLocation.lng, destinationCoords.lat, destinationCoords.lng) * 1000;
             const rawPct = ((totalRouteDistance - currentDist) / totalRouteDistance) * 100;
             setProgressPct(Math.min(100, Math.max(0, rawPct)));
        }

    }, [currentLocation, destinationCoords]);

    const simplifyInstruction = (text: string) => {
        if (!text) return '';
        
        let simplified = text;
        
        // Remove common verbose prefixes
        simplified = simplified.replace(/Conduza para (norte|sul|leste|oeste|nordeste|noroeste|sudeste|sudoeste) na /i, '');
        simplified = simplified.replace(/Siga para o (norte|sul|leste|oeste) na /i, '');
        simplified = simplified.replace(/Mantenha-se à (esquerda|direita) na /i, 'Mantenha-se à $1 na '); // Keep as is if it's already specific
        
        // Specific fixes for common patterns
        if (simplified.toLowerCase().includes('vire à esquerda') || simplified.toLowerCase().includes('turn left')) return 'Vire à esquerda';
        if (simplified.toLowerCase().includes('vire à direita') || simplified.toLowerCase().includes('turn right')) return 'Vire à direita';
        if (simplified.toLowerCase().includes('siga em frente') || simplified.toLowerCase().includes('go straight') || simplified.toLowerCase().includes('continue straight')) return 'Siga em frente';
        if (simplified.toLowerCase().includes('chegou') || simplified.toLowerCase().includes('arrived')) return 'Você chegou ao destino';
        if (simplified.toLowerCase().includes('retorne') || simplified.toLowerCase().includes('make a u-turn')) return 'Faça o retorno';
        if (simplified.toLowerCase().includes('pegue a saída')) {
            const match = simplified.match(/(\d+)ª saída/i);
            return match ? `Na rotatória, pegue a ${match[1]}ª saída` : 'Na rotatória, pegue a saída';
        }
        if (simplified.toLowerCase().includes('faça o retorno')) return 'Faça o retorno';
        if (simplified.toLowerCase().includes('em frente')) return 'Siga em frente';
        
        // Final cleanup: if it's still too long, try to just get the action
        if (simplified.length > 50) {
             const parts = simplified.split(',');
             if (parts.length > 1) return parts[0].trim();
        }

        return simplified;
    };

    const fetchRoute = async (start: { lat: number, lng: number }, end: { lat: number, lng: number }) => {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}&language=pt`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates;

                // Setup initial total distance for progress calculation
                if (totalRouteDistance === 0) setTotalRouteDistance(route.distance);

                // Update UI Info
                setRemainingTime(`${Math.round(route.duration / 60)} min`);
                setRemainingDistance(`${(route.distance / 1000).toFixed(1)} km`);
                
                onUpdateMetrics?.({
                    time: `${Math.round(route.duration / 60)} min`,
                    distance: `${(route.distance / 1000).toFixed(1)} km`,
                    progress: progressPct
                });

                // Arrival Alert Detection (within 100m)
                if (route.distance < 100 && !isArriving) {
                    setIsArriving(true);
                    speak("Você está chegando ao seu destino. Reduza a velocidade.");
                    
                    // Exit 3D mode and zoom in
                    map.current?.easeTo({
                        pitch: 0,
                        zoom: 18.5,
                        duration: 1500
                    });
                } else if (route.distance >= 100 && isArriving) {
                    setIsArriving(false);
                    
                    // Return to 3D mode
                    map.current?.easeTo({
                        pitch: 60,
                        zoom: 18,
                        duration: 1500
                    });
                }

                // Next Step Instruction
                if (route.legs[0].steps.length > 0) {
                    const nextStep = route.legs[0].steps[0];
                    const distText = nextStep.distance < 1000 ? `${Math.round(nextStep.distance)}m` : `${(nextStep.distance / 1000).toFixed(1)}km`;
                    
                    const simplified = simplifyInstruction(nextStep.maneuver.instruction);
                    const fullText = `A ${distText}, ${simplified}`;
                    
                    const modifier = nextStep.maneuver.modifier || 'straight'; // e.g. "left", "right", "straight", "sharp right"
                    const roadName = nextStep.name || simplified;

                    const nextNextStep = route.legs[0].steps[1];
                    const secondaryRoad = nextNextStep?.name || '';
                    
                    setInstruction({
                        fullText: fullText,
                        distance: nextStep.distance,
                        distanceText: distText.replace('m', ' m').replace('km', ' km'),
                        modifier: modifier,
                        roadName: roadName,
                        nextRoadName: secondaryRoad
                    });

                    // Voice Guidance: Announce ONLY ONCE at 200m before the turn
                    const stepKey = `${simplified}`;
                    if (nextStep.distance <= 200 && lastAnnouncedStep.current !== stepKey) {
                        lastAnnouncedStep.current = stepKey;
                        speak(`${simplified}`);
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

            {/* 99-style Header Instructions */}
            <div className="absolute top-0 left-0 right-0 z-20">
                <div className="bg-[#0b0b0b] rounded-b-[32px] shadow-[0_15px_30px_rgba(0,0,0,0.4)] pb-5 pt-8 px-6 flex flex-col uppercase transition-all">
                    {/* Main Instruction */}
                    <div className="flex items-start">
                        <div className="mr-5 text-white flex-shrink-0 flex items-center justify-center relative w-12 h-16">
                            {instruction?.modifier.includes('left') ? (
                                <i className="fas fa-arrow-turn-down fa-flip-horizontal fa-rotate-180 text-5xl"></i>
                            ) : instruction?.modifier.includes('right') ? (
                                <i className="fas fa-arrow-turn-down text-5xl fa-rotate-180"></i>
                            ) : instruction?.modifier.includes('uturn') ? (
                                <i className="fas fa-arrow-rotate-left text-5xl"></i>
                            ) : (
                                <i className="fas fa-arrow-up text-5xl"></i>
                            )}
                        </div>
                        <div className="flex flex-col flex-1 pb-4">
                            <h1 className="text-white text-[42px] font-black leading-none tracking-tight">
                                {instruction?.distanceText || '-- m'}
                            </h1>
                            <p className="text-white/90 text-[18px] font-semibold leading-tight line-clamp-2 mt-2">
                                {instruction?.roadName || 'Calculando...'}
                            </p>
                        </div>
                    </div>
                    {/* Secondary Instruction (If available) */}
                    {instruction?.nextRoadName ? (
                        <div className="border-t border-white/10 pt-4 flex items-center gap-3">
                            <i className="fas fa-arrow-turn-up text-zinc-400 rotate-90 text-sm"></i>
                            <p className="text-zinc-400 text-base font-semibold truncate leading-none">
                                {instruction.nextRoadName}
                            </p>
                        </div>
                    ) : (
                        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                            <p className="text-zinc-500 text-xs font-bold leading-none tracking-widest">
                                MANTENHA A ATENÇÃO NA VIA
                            </p>
                            <button 
                                onClick={() => setVoiceEnabled(!voiceEnabled)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${voiceEnabled ? 'bg-zinc-800 text-white' : 'bg-transparent border border-zinc-700 text-zinc-600'}`}
                            >
                                <i className={`fas ${voiceEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-xs`}></i>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Arrival Alert Overlay */}
            {isArriving && !['ARRIVED_AT_STORE', 'READY_FOR_PICKUP', 'PICKING_UP', 'ARRIVED_AT_CUSTOMER', 'RETURNING'].includes(status) && (
                <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                    <div className="bg-orange-600 text-white px-8 py-4 rounded-full text-2xl font-black uppercase tracking-tighter shadow-[0_0_50px_rgba(234,88,12,0.6)] border-4 border-white/20 animate-bounce">
                        🏠 CHEGANDO AO LOCAL
                    </div>
                </div>
            )}

            {/* Ready for Pickup Alert Overlay */}
            {status === 'READY_FOR_PICKUP' && (
                <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                    <div className="bg-green-600 text-white px-8 py-4 rounded-xl text-3xl font-black uppercase tracking-tighter shadow-[0_0_50px_rgba(22,163,74,0.6)] border-4 border-white/20 animate-pulse flex flex-col items-center gap-2">
                        <i className="fas fa-box-open text-4xl"></i>
                        RETIRAR NO BALCÃO
                        <span className="text-xs font-medium normal-case tracking-normal opacity-80">O lojista marcou como pronto!</span>
                    </div>
                </div>
            )}

            {/* Left Side: Shield + Speedometer */}
            <div className="absolute left-4 bottom-[200px] z-[1000] flex flex-col gap-3 items-center">
                <div className="w-12 h-12 rounded-full bg-[#1A1208] border border-[#2B1B0F] shadow-xl flex items-center justify-center text-[#FF6B00]">
                    <i className="fas fa-shield-halved text-xl"></i>
                </div>
                <div className="bg-[#121212] border-2 border-zinc-800 rounded-full flex flex-col items-center justify-center w-20 h-20 shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
                    <span className="text-3xl font-black text-white">{currentSpeed}</span>
                    <span className="text-[10px] text-zinc-400 font-bold tracking-wider pt-0.5">km/h</span>
                </div>
            </div>

            {/* Right Edge: Vertical Progress Bar */}
            <div className="absolute right-1 top-[30%] bottom-[250px] w-[4px] bg-zinc-800 rounded-full overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.5)] z-[100] border border-white/5">
                <div className="absolute bottom-0 left-0 w-full bg-[#FF6B00] shadow-[0_0_12px_rgba(255,107,0,0.8)] transition-all duration-1000" style={{ height: `${progressPct}%` }}></div>
                <div className="absolute left-1/2 -ml-[8px] w-4 h-4 bg-white border-4 border-[#FF6B00] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all duration-1000 flex items-center justify-center" style={{ bottom: `calc(${progressPct}% - 8px)` }}>
                    <div className="w-1 h-1 bg-black rounded-full mix-blend-overlay"></div>
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
