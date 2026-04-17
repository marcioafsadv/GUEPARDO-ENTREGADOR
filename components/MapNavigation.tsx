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
    onUpdateMetrics?: (metrics: { time: string; distance: string, progress: number, distanceValue?: number }) => void;
    preloadedDestination?: { lat: number; lng: number } | null;
    isMissionOverlayExpanded?: boolean;
    theme?: 'dark' | 'light';
    onShowSOS?: () => void;
    onShowFilters?: () => void;
    delivererName?: string;
}

export const MapNavigation: React.FC<MapNavigationProps> = ({
    status,
    destinationAddress,
    currentLocation,
    onArrived,
    onUpdateMetrics,
    preloadedDestination,
    isMissionOverlayExpanded = false,
    theme = 'dark',
    onShowSOS,
    onShowFilters,
    delivererName = 'Entregador'
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
    const [hideSpeedometer, setHideSpeedometer] = useState<boolean>(false);
    const lastSmoothedBearing = useRef<number | null>(null);
    const lastBearingPos = useRef<{ lat: number; lng: number } | null>(null);
    const [currentStreet, setCurrentStreet] = useState<string>('Buscando localização...');
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

    // Voice Discovery - Select the best pt-BR voice
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                // Priority: Gabriela (System) > Daniel (Online) > Maria (Online) > Any Google pt-BR > Any pt-BR
                const ptVoices = voices.filter(v => v.lang.startsWith('pt'));
                const preferred = ptVoices.find(v => v.name.includes('Gabriela')) ||
                                  ptVoices.find(v => v.name.includes('Daniel') && v.name.includes('Online')) ||
                                  ptVoices.find(v => v.name.includes('Maria') && v.name.includes('Online')) ||
                                  ptVoices.find(v => v.name.includes('Google') && v.lang.includes('BR')) ||
                                  ptVoices[0];
                
                if (preferred) setSelectedVoice(preferred);
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const playNotificationSound = () => {
        const audio = new Audio('/sounds/beep-notification.mp3');
        audio.volume = 0.4;
        audio.play().catch(e => console.log('Audio play blocked:', e));
    };

    const speak = (text: string) => {
        if (!voiceEnabled || !window.speechSynthesis) return;
        if (text === lastAnnouncedText.current) return;
        
        lastAnnouncedText.current = text;
        window.speechSynthesis.cancel();
        
        playNotificationSound();

        // Slight delay to speak after the beep
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            if (selectedVoice) utterance.voice = selectedVoice;
            utterance.lang = 'pt-BR';
            utterance.rate = 1.0; // More natural rate
            utterance.pitch = 1.1; // Slightly more premium pitch
            window.speechSynthesis.speak(utterance);
        }, 300);
    };

    // NLP Helper for natural phrasing
    const getNaturalPhrase = (distValue: number, action: string, street: string) => {
        let naturalDist = "";
        if (distValue < 50) {
            return `Vire agora à ${action.includes('esquerda') ? 'esquerda' : 'direita'} na ${street}`;
        } else if (distValue < 1000) {
            naturalDist = `Em ${Math.round(distValue / 10) * 10} metros`;
        } else {
            const km = (distValue / 1000).toFixed(1).replace('.', ',');
            naturalDist = `Em ${km} quilômetros`;
        }

        const cleanAction = action.replace('Vire à ', '').replace('Siga em ', '');
        return `${naturalDist}, ${action} na ${street}`;
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
                    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .navigation-marker svg {
                    width: 100%;
                    height: 100%;
                    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
                }
                @keyframes pulse-gold {
                    0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(212, 175, 55, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
                }
                .marker-pulse {
                    animation: pulse-gold 2s infinite !important;
                }
                .destination-marker-wrapper {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .destination-marker-svg {
                    filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.9));
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
            center: currentLocation ? [currentLocation.lng, currentLocation.lat] : (destinationCoords ? [destinationCoords.lng, destinationCoords.lat] : [-46.6333, -23.5505]),
            zoom: 18,
            pitch: 0,
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
            <div class="marker-wrapper" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div class="marker-container" style="position: relative; display: flex; align-items: center; justify-content: center; width: 52px; height: 52px;">
                    <!-- Main Circle -->
                    <div style="width: 48px; height: 48px; background: rgba(13, 5, 2, 0.8); border: 3.5px solid #FF6B00; border-radius: 50%; box-shadow: 0 0 30px rgba(255, 107, 0, 0.4), inset 0 0 15px rgba(212, 175, 55, 0.3); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px); outline: 1px solid rgba(212, 175, 55, 0.5);">
                        <!-- Inner Arrow -->
                        <svg viewBox="0 0 64 64" style="width: 32px; height: 32px; filter: drop-shadow(0 0 5px #FF6B00);">
                            <path d="M32 8L54 52L32 40L10 52L32 8Z" fill="#D4AF37" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <!-- Pulse Effect -->
                    <div class="marker-pulse" style="position: absolute; width: 52px; height: 52px; border-radius: 50%; border: 3.5px solid #D4AF37; opacity: 0;"></div>
                </div>
                
                <!-- Attached Street Pill -->
                <div class="street-pill-attached" style="margin-top: 12px; background: rgba(13, 5, 2, 0.95); border: 1.5px solid rgba(212, 175, 55, 0.3); backdrop-filter: blur(12px); border-radius: 50px; padding: 6px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); display: flex; align-items: center; gap: 8px; white-space: nowrap;">
                    <div style="width: 6px; height: 6px; border-radius: 50%; background: #D4AF37; box-shadow: 0 0 8px #D4AF37;"></div>
                    <span id="marker-street-name" style="color: #F5E6D3; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; font-family: system-ui, -apple-system, sans-serif;">${currentStreet}</span>
                </div>
            </div>
        `;
        
        marker.current = new mapboxgl.Marker({
            element: el,
            rotationAlignment: 'viewport', // Marker always points relative to screen top
            pitchAlignment: 'map'
        })
            .setLngLat(currentLocation ? [currentLocation.lng, currentLocation.lat] : (destinationCoords ? [destinationCoords.lng, destinationCoords.lat] : [-46.6333, -23.5505]))
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

    // Update Marker Street Name in HTML dynamically
    useEffect(() => {
        if (!marker.current) return;
        const streetEl = marker.current.getElement().querySelector('#marker-street-name');
        if (streetEl) {
            streetEl.textContent = currentStreet;
        }
    }, [currentStreet]);

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

        // Calculate Bearing (Direction) with Smoothing and Thresholds
        if (lastLocation.current) {
            const distMoved = getDistance(
                lastLocation.current.lat, lastLocation.current.lng,
                currentLocation.lat, currentLocation.lng
            ) * 1000; // in meters

            // Speed in km/h
            const speedKmh = currentLocation.speed != null ? currentLocation.speed * 3.6 : (distMoved / 1) * 3.6;

            // Only update bearing if we moved significantly (e.g. > 1.5m) or are moving at decent speed
            // This prevents "dancing" while stopped or moving very slowly with GPS jitter
            if (distMoved > 1.5 && speedKmh > 1.5) {
                const rawBearing = getBearing(
                    lastLocation.current.lat, lastLocation.current.lng,
                    currentLocation.lat, currentLocation.lng
                );
                
                let targetBearing = rawBearing;

                // Smooth the bearing using EMA (Exponential Moving Average)
                if (lastSmoothedBearing.current !== null) {
                    let diff = rawBearing - lastSmoothedBearing.current;
                    
                    // Handle 0/360 wrap-around
                    if (diff > 180) diff -= 360;
                    if (diff < -180) diff += 360;
                    
                    // alpha = 0.6 (increased from 0.3 for snappier rotations)
                    targetBearing = (lastSmoothedBearing.current + diff * 0.6 + 360) % 360;
                }

                lastSmoothedBearing.current = targetBearing;
                
                // Position the marker in the lower-third dynamically based on container height
                const containerHeight = map.current.getContainer().getBoundingClientRect().height;
                const dynamicTopPadding = containerHeight * (isMissionOverlayExpanded ? 0.52 : 0.38);

                // Rotate MAP and center on location with dynamic padding
                map.current.easeTo({
                    center: [currentLocation.lng, currentLocation.lat],
                    bearing: targetBearing,
                    duration: 500, // Reduced from 1200ms to eliminate rotation lag
                    padding: { top: dynamicTopPadding, bottom: 80 }, 
                    pitch: 0,
                    easing: (t) => t
                });
            } else {
                const containerHeight = map.current.getContainer().getBoundingClientRect().height;
                const dynamicTopPadding = containerHeight * (isMissionOverlayExpanded ? 0.52 : 0.38);

                // If not moving fast enough to change bearing, just update center smoothly
                map.current.easeTo({
                    center: [currentLocation.lng, currentLocation.lat],
                    padding: { top: dynamicTopPadding, bottom: 80 },
                    pitch: 0,
                    duration: 1000,
                    easing: (t) => t
                });
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
    
    // Track distance checkpoints to avoid repetitive announcements
    const lastCheckPoint = useRef<number>(0);

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
                    distanceValue: route.distance,
                    progress: progressPct
                });

                // Proximity-based UI refinement: Hide speedometer within 500m
                setHideSpeedometer(route.distance < 500);

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
                    
                    // Return to top-down mode
                    map.current?.easeTo({
                        pitch: 0,
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

                    // Update current street based on the first step of the leg
                    if (route.legs[0].steps[0]?.name) {
                        setCurrentStreet(route.legs[0].steps[0].name.toUpperCase());
                    }

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

                    // Voice Guidance: Refined checkpoints (500m, 200m, 50m)
                    const normalizedSimplified = simplified.toLowerCase();
                    const checkKey = `${normalizedSimplified}-${distText}`;
                    
                    if (nextStep.distance <= 500 && nextStep.distance > 450 && lastCheckPoint.current !== 500) {
                         lastCheckPoint.current = 500;
                         const phrase = getNaturalPhrase(nextStep.distance, simplified, roadName);
                         speak(phrase);
                    } else if (nextStep.distance <= 200 && nextStep.distance > 150 && lastCheckPoint.current !== 200) {
                        lastCheckPoint.current = 200;
                        const phrase = getNaturalPhrase(nextStep.distance, simplified, roadName);
                        speak(phrase);
                    } else if (nextStep.distance <= 50 && lastCheckPoint.current !== 50) {
                        lastCheckPoint.current = 50;
                        const phrase = getNaturalPhrase(nextStep.distance, simplified, roadName);
                        speak(phrase);
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

            {/* Print 3 style Header Instructions */}
            <div className="absolute top-0 left-0 right-0 z-20">
                <div className="bg-[#0D0502]/95 backdrop-blur-xl rounded-b-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.9)] pb-4 pt-8 px-6 flex flex-col uppercase border-b border-[#D4AF37]/20">
                    <div className="flex items-center">
                        <div className="mr-5 text-white flex-shrink-0 flex items-center justify-center relative w-12 h-12 bg-zinc-900/50 rounded-2xl border border-[#D4AF37]/30 shadow-[inset_0_0_15px_rgba(212,175,55,0.1)]">
                             {instruction?.modifier.includes('left') ? (
                                <i className="fas fa-arrow-up rotate-[-90deg] text-3xl text-[#FF6B00] drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]"></i>
                            ) : instruction?.modifier.includes('right') ? (
                                <i className="fas fa-arrow-up rotate-[90deg] text-3xl text-[#FF6B00] drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]"></i>
                            ) : (
                                <i className="fas fa-arrow-up text-3xl text-[#FF6B00] drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]"></i>
                            )}
                        </div>
                        <div className="flex flex-col flex-1">
                            <h1 className="text-[#F5E6D3] text-3xl font-[900] leading-none tracking-tighter italic">
                                {instruction?.distanceText || '0 M'}
                            </h1>
                            <p className="text-[#D4AF37] text-[10px] font-black leading-tight tracking-[0.25em] mt-1.5 line-clamp-1 opacity-90">
                                {instruction?.roadName || 'SIGA EM FRENTE'}
                            </p>
                        </div>
                        {/* Speaker Button on the right (Print 3 style) */}
                         <button 
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${voiceEnabled ? 'bg-orange-600/20 text-orange-500 border border-orange-500/30 shadow-[0_0_15px_rgba(255,107,0,0.2)]' : 'bg-white/5 border border-white/10 text-white/20'}`}
                        >
                            <i className={`fas ${voiceEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-sm`}></i>
                        </button>
                    </div>

                    {/* Lower bar for secondary instructions - Compacted */}
                    <div className="flex items-center mt-3 pt-2 border-t border-white/5 space-x-3 opacity-40">
                         <i className="fas fa-location-arrow text-[8px] text-orange-500 rotate-45"></i>
                         <p className="text-[8px] font-black tracking-[0.3em] overflow-hidden truncate">
                             {instruction?.nextRoadName || `GUEPARDO MAPS • ${delivererName.toUpperCase()}`}
                         </p>
                    </div>
                </div>
            </div>

            {/* Arrival Alert Overlay */}
            {isArriving && !['ARRIVED_AT_STORE', 'READY_FOR_PICKUP', 'PICKING_UP', 'ARRIVED_AT_CUSTOMER', 'RETURNING'].includes(status) && (
                <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-700">
                    <div className="bg-gradient-to-br from-[#FF6B00] to-[#CC5200] text-white px-12 py-7 rounded-[40px] shadow-[0_0_60px_rgba(255,107,0,0.5),0_0_20px_rgba(212,175,55,0.3)] border-4 border-[#D4AF37]/40 animate-bounce flex flex-col items-center gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-1 italic transform -skew-x-6">{delivererName}</p>
                        <i className="fas fa-location-dot text-5xl text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]"></i>
                        <span className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                            {status === 'GOING_TO_STORE' ? 'chegando na loja' : 'chegando no cliente'}
                        </span>
                    </div>
                </div>
            )}

            {/* Ready for Pickup Alert Overlay - Floating at top map area (not covering footer) */}
            {status === 'READY_FOR_PICKUP' && (
                <>
                    <div className="absolute top-[150px] left-5 right-5 z-[10005] flex items-start justify-center animate-in slide-in-from-top duration-700 pointer-events-none">
                        <div className="w-full max-w-[360px] bg-gradient-to-br from-[#FFD700] to-[#D4AF37] text-black p-6 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.4)] border-2 border-black/10 flex items-center space-x-5 pointer-events-auto active:scale-95 transition-transform">
                            <div className="bg-black/10 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-black/5 shadow-inner">
                                <i className="fas fa-box-open text-3xl"></i>
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-xl font-black uppercase tracking-tighter leading-tight italic">Retirar no Balcão</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70 leading-tight mt-1">O lojista marcou como pronto!</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Left Side: Shield + Speedometer - DYNAMIC POSITIONING & PROXIMITY HIDING */}
            {(!hideSpeedometer) && (
                <div className={`absolute left-4 ${isMissionOverlayExpanded ? 'bottom-[480px]' : 'bottom-[220px]'} z-[1000] flex flex-col gap-4 items-center transition-all duration-500`}>
                    <div className="bg-zinc-950/90 border border-white/5 rounded-full flex flex-col items-center justify-center w-20 h-20 shadow-[0_20px_40px_rgba(0,0,0,0.9)] backdrop-blur-3xl ring-1 ring-white/5">
                        <span className="text-3xl font-black text-white leading-none italic">{currentSpeed}</span>
                        <span className="text-[8px] text-zinc-500 font-black tracking-widest pt-1 uppercase">km/h</span>
                    </div>
                    <button 
                        className="w-14 h-14 rounded-full bg-zinc-950/90 border border-white/5 shadow-2xl flex items-center justify-center text-blue-400 backdrop-blur-3xl active:scale-95 transition-transform ring-1 ring-white/5"
                    >
                        <i className="fas fa-shield-halved text-xl"></i>
                    </button>
                </div>
            )}

            {/* Right Side: Floating Actions (SOS & Settings) */}
            <div className={`absolute right-4 ${isMissionOverlayExpanded ? 'bottom-[480px]' : 'bottom-[220px]'} z-[1000] flex flex-col gap-4 items-center transition-all duration-500`}>
                <button 
                    onClick={onShowSOS}
                    className="w-14 h-14 rounded-full bg-zinc-950/90 border border-white/5 shadow-2xl flex items-center justify-center text-red-500 backdrop-blur-3xl active:scale-90 transition-all hover:bg-black group ring-1 ring-white/5"
                >
                    <div className="absolute inset-0 bg-red-500/5 rounded-full animate-pulse"></div>
                    <i className="fas fa-triangle-exclamation text-xl group-hover:scale-110 transition-transform"></i>
                </button>

                <button 
                    onClick={onShowFilters}
                    className="w-14 h-14 rounded-full bg-zinc-950/90 border border-white/5 shadow-2xl flex items-center justify-center text-[#FF6B00] backdrop-blur-3xl active:scale-90 transition-all hover:bg-black group ring-1 ring-white/5"
                >
                    <i className="fas fa-route text-xl group-hover:scale-110 transition-transform"></i>
                </button>
            </div>

            {/* Right Edge: Vertical Progress Bar - REFINED */}
            <div className="absolute right-1.5 top-[30%] bottom-[220px] w-[5px] bg-zinc-900/50 backdrop-blur-sm rounded-full overflow-visible z-[100] border border-white/5">
                <div className="absolute bottom-0 left-0 w-full bg-[#FF6B00] transition-all duration-1000 rounded-full" style={{ height: `${progressPct}%` }}></div>
                <div className="absolute left-1/2 -ml-[8px] w-4 h-4 bg-white border-2 border-[#FF6B00] rounded-full shadow-[0_0_15px_rgba(255,107,0,0.5)] transition-all duration-1000 flex items-center justify-center" style={{ bottom: `calc(${progressPct}% - 8px)` }}>
                    <div className="w-1 h-1 bg-[#FF6B00] rounded-full"></div>
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
