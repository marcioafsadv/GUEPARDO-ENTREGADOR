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
    unreadCount?: number;
    onChatClick?: () => void;
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
    delivererName = 'Entregador',
    unreadCount = 0,
    onChatClick
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
    
    // Internal fallback location used only when App.tsx hasn't delivered currentLocation yet
    const [selfLocation, setSelfLocation] = useState<{ lat: number; lng: number; speed?: number | null } | null>(null);
    // Effective location: prefer prop (updated by App.tsx watchPosition), fallback to self-fetched
    const effectiveLocation = currentLocation ?? selfLocation;

    // --- CONFIGURAÇÃO DO MOTOR DE NAVEGAÇÃO (PARÂMETROS RIGOROSOS) ---
    const [navigationMode, setNavigationMode] = useState<'heading_up' | 'north_up'>('heading_up');
    const [instructionTolerance, setInstructionTolerance] = useState<number>(45); // angle_threshold
    const [voiceBargeInEnabled, setVoiceBargeInEnabled] = useState<boolean>(false);
    const [maneuverBuffers, setManeuverBuffers] = useState<number[]>([200, 50]);
    
    // Gênero de voz (Masculino por padrão, conforme solicitado)
    const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('male');

    // Métodos do protocolo do motor de navegação
    const set_navigation_mode = (mode: 'heading_up' | 'north_up') => {
        console.log(`🔧 [NavEngine] set_navigation_mode: ${mode}`);
        setNavigationMode(mode);
    };

    const set_instruction_tolerance = (angle_threshold: number) => {
        console.log(`🔧 [NavEngine] set_instruction_tolerance: ${angle_threshold}`);
        setInstructionTolerance(angle_threshold);
    };

    const enable_voice_barge_in = (enabled: boolean) => {
        console.log(`🔧 [NavEngine] enable_voice_barge_in: ${enabled}`);
        setVoiceBargeInEnabled(enabled);
    };

    const set_maneuver_buffer = (meters: number | number[]) => {
        console.log(`🔧 [NavEngine] set_maneuver_buffer: ${JSON.stringify(meters)}`);
        if (Array.isArray(meters)) {
            setManeuverBuffers(meters);
        } else {
            setManeuverBuffers([meters, 50]);
        }
    };

    // Inicialização do protocolo de navegação rigoroso
    useEffect(() => {
        set_navigation_mode('heading_up');
        set_instruction_tolerance(45);
        enable_voice_barge_in(false);
        set_maneuver_buffer([200, 50]);
    }, []);

    // Refs adicionais para controle de rota
    const routeCoordinates = useRef<[number, number][]>([]);
    const nextManeuverCoords = useRef<{ lat: number; lng: number } | null>(null);
    const lastFetchTime = useRef<number>(0);
    const lastFetchLocation = useRef<{ lat: number; lng: number } | null>(null);

    // Self-bootstrap GPS: when the component mounts without a location, grab one immediately.
    useEffect(() => {
        if (currentLocation) return;
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                console.log('⚡ [MapNavigation] Self-bootstrap fast fix:', pos.coords.latitude, pos.coords.longitude);
                setSelfLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    speed: pos.coords.speed
                });
            },
            (err) => {
                console.warn('[MapNavigation] Fast self-fetch failed, trying high-accuracy...', err.message);
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setSelfLocation({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            speed: pos.coords.speed
                        });
                    },
                    (err2) => console.error('[MapNavigation] Self-bootstrap failed entirely:', err2.message),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            },
            { enableHighAccuracy: false, timeout: 3000, maximumAge: 30000 }
        );
    }, []);

    // Descobrir voz pt-BR baseado no gênero selecionado
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const ptVoices = voices.filter(v => v.lang.startsWith('pt'));
                let preferred: SpeechSynthesisVoice | undefined;

                if (voiceGender === 'male') {
                    // Prioriza vozes masculinas pt-BR conhecidas
                    preferred = ptVoices.find(v => v.name.toLowerCase().includes('daniel')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('felipe')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('helio')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('ricardo')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('male')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('masculino')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('homem')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('i-local')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('gft-local')) ||
                                // Se não achar nenhuma explicitamente masculina, pega qualquer uma que NÃO seja explicitamente feminina
                                ptVoices.find(v => !v.name.toLowerCase().includes('maria') && 
                                                   !v.name.toLowerCase().includes('luciana') && 
                                                   !v.name.toLowerCase().includes('gabriela') &&
                                                   !v.name.toLowerCase().includes('heloisa') &&
                                                   !v.name.toLowerCase().includes('female') &&
                                                   !v.name.toLowerCase().includes('mulher') &&
                                                   !v.name.toLowerCase().includes('afs-local') &&
                                                   !v.name.toLowerCase().includes('d-local')) ||
                                ptVoices[0];
                } else {
                    // Prioriza vozes femininas pt-BR comuns
                    preferred = ptVoices.find(v => v.name.toLowerCase().includes('gabriela')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('maria')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('luciana')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('heloisa')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('afs-local')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('d-local')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('female')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('mulher')) ||
                                ptVoices.find(v => v.name.toLowerCase().includes('google')) ||
                                ptVoices[0];
                }
                
                if (preferred) setSelectedVoice(preferred);
            }
        };

        loadVoices();
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, [voiceGender]);


    const playNotificationSound = () => {
        const audio = new Audio('/sounds/beep-notification.mp3');
        audio.volume = 0.4;
        audio.play().catch(e => console.log('Audio play blocked:', e));
    };

    // --- AUDIO QUEUE MANAGER (GERENCIADOR DE FILA DE ÁUDIO COM PRIORIDADE) ---
    interface SpeechItem {
        text: string;
        priority: number; // 3 = execução de manobra, 2 = antecipação/recálculo, 1 = outros avisos
        isManeuver: boolean;
    }

    const speechQueue = useRef<SpeechItem[]>([]);
    const isSpeaking = useRef<boolean>(false);
    const currentSpeechItem = useRef<SpeechItem | null>(null);

    const enqueueSpeech = (item: SpeechItem) => {
        if (!voiceEnabled || !window.speechSynthesis) return;
        if (item.text === lastAnnouncedText.current) return;

        console.log(`🔊 [AudioQueue] Enfileirando: "${item.text}" (Prioridade: ${item.priority}, Manobra: ${item.isManeuver})`);

        // Regra de Barge-in: se estiver falando uma manobra e barge-in for false, NÃO interromper
        // Se o item atual em reprodução for manobra, e voiceBargeInEnabled for falso, não cancelamos
        const currentIsManeuver = currentSpeechItem.current?.isManeuver || false;
        
        const canInterrupt = 
            !isSpeaking.current || 
            (!voiceBargeInEnabled && !currentIsManeuver && item.isManeuver) ||
            (voiceBargeInEnabled && (!currentIsManeuver || item.priority > (currentSpeechItem.current?.priority || 0)));

        if (canInterrupt && isSpeaking.current) {
            console.log(`⚡ [AudioQueue] Interrompendo áudio atual para reproduzir instrução com prioridade`);
            window.speechSynthesis.cancel();
            isSpeaking.current = false;
            currentSpeechItem.current = null;
        }

        // Insere na fila
        speechQueue.current.push(item);
        
        // Ordena por prioridade (maior primeiro)
        speechQueue.current.sort((a, b) => b.priority - a.priority);

        if (!isSpeaking.current) {
            processQueue();
        }
    };

    const processQueue = () => {
        if (!window.speechSynthesis || speechQueue.current.length === 0) {
            isSpeaking.current = false;
            currentSpeechItem.current = null;
            return;
        }

        isSpeaking.current = true;
        const nextItem = speechQueue.current.shift()!;
        currentSpeechItem.current = nextItem;
        lastAnnouncedText.current = nextItem.text;

        playNotificationSound();

        // Aguarda som de notificação
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(nextItem.text);
            if (selectedVoice) utterance.voice = selectedVoice;
            utterance.lang = 'pt-BR';
            utterance.rate = 1.0;
            utterance.pitch = voiceGender === 'male' ? 0.82 : 1.05;

            utterance.onend = () => {
                isSpeaking.current = false;
                currentSpeechItem.current = null;
                processQueue();
            };

            utterance.onerror = (e) => {
                console.error('[AudioQueue] Erro no TTS:', e);
                isSpeaking.current = false;
                currentSpeechItem.current = null;
                processQueue();
            };

            window.speechSynthesis.speak(utterance);
        }, 300);
    };

    // Wrapper de compatibilidade
    const speak = (text: string, priority = 1, isManeuver = false) => {
        enqueueSpeech({ text, priority, isManeuver });
    };


    // Convert Mapbox modifier (English) to Portuguese action label
    const getActionLabel = (modifier: string): string => {
        switch (modifier) {
            case 'left':         return 'Vire à esquerda';
            case 'right':        return 'Vire à direita';
            case 'sharp left':   return 'Vire acentuadamente à esquerda';
            case 'sharp right':  return 'Vire acentuadamente à direita';
            case 'slight left':  return 'Mantenha-se à esquerda';
            case 'slight right': return 'Mantenha-se à direita';
            case 'uturn':        return 'Faça o retorno';
            case 'straight':     return 'Siga em frente';
            default:             return 'Siga em frente';
        }
    };

    // NLP Helper for natural phrasing — uses modifier directly to avoid wrong directions
    const getNaturalPhrase = (distValue: number, modifier: string, street: string, isExecution = false): string => {
        const action = getActionLabel(modifier);
        const hasStreet = street && street.trim().length > 0
            && !street.toLowerCase().startsWith('vire')
            && !street.toLowerCase().startsWith('siga')
            && !street.toLowerCase().startsWith('mantenha');

        const streetSuffix = hasStreet ? ` na ${street}` : '';

        if (isExecution || distValue < 50) {
            return `${action} agora.`;
        } else if (distValue < 1000) {
            const roundedM = Math.round(distValue / 10) * 10;
            return `Em ${roundedM} metros, ${action.toLowerCase()}${streetSuffix}.`;
        } else {
            const km = (distValue / 1000).toFixed(1).replace('.', ',');
            return `Em ${km} quilômetros, ${action.toLowerCase()}${streetSuffix}.`;
        }
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
            center: effectiveLocation ? [effectiveLocation.lng, effectiveLocation.lat] : (destinationCoords ? [destinationCoords.lng, destinationCoords.lat] : [-46.6333, -23.5505]),
            zoom: 18,
            pitch: 55,
            bearing: 0,
            antialias: true
        });

        const add3DBuildings = () => {
            if (!map.current) return;

            // Add Sky Layer for realistic horizon in 3D
            if (!map.current.getLayer('sky')) {
                map.current.addLayer({
                    'id': 'sky',
                    'type': 'sky',
                    'paint': {
                        'sky-type': 'atmosphere',
                        'sky-atmosphere-sun': [0.0, 0.0],
                        'sky-atmosphere-sun-intensity': 15
                    }
                });
            }

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
                        'fill-extrusion-color': theme === 'dark' ? '#333' : '#ddd',
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
                        'fill-extrusion-opacity': 0.8
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
            rotationAlignment: 'viewport', 
            pitchAlignment: 'viewport'
        })
            .setLngLat(effectiveLocation ? [effectiveLocation.lng, effectiveLocation.lat] : (destinationCoords ? [destinationCoords.lng, destinationCoords.lat] : [-46.6333, -23.5505]))
            .addTo(map.current);

        // Create Destination Marker
        const destEl = document.createElement('div');
        destEl.className = 'destination-marker-wrapper';
        destEl.innerHTML = `
            <svg width="50" height="50" viewBox="0 0 50 50" class="destination-marker-svg">
                <!-- Pulse Effect around the pin base -->
                <circle cx="25" cy="40" r="10" fill="rgba(204, 255, 0, 0.4)">
                    <animate attributeName="r" values="8;15;8" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
                <!-- Pin Shape -->
                <path d="M25 42C25 42 38 28 38 18C38 10.8203 32.1797 5 25 5C17.8203 5 12 10.8203 12 18C12 28 25 42 25 42Z" fill="#7B3F00" stroke="#CCFF00" stroke-width="2.5" />
                <!-- Inner Dot -->
                <circle cx="25" cy="18" r="5" fill="#CCFF00" />
            </svg>
        `;

        destinationMarker.current = new mapboxgl.Marker({
            element: destEl,
            rotationAlignment: 'viewport',
            pitchAlignment: 'viewport'
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

    // Helper to calculate distance from current position to nearest point on route
    const getDistanceToRoute = (lat: number, lng: number, routeCoords: [number, number][]) => {
        if (routeCoords.length === 0) return 0;
        let minD = Infinity;
        for (let i = 0; i < routeCoords.length; i++) {
            const d = getDistance(lat, lng, routeCoords[i][1], routeCoords[i][0]) * 1000; // in meters
            if (d < minD) minD = d;
        }
        return minD;
    };

    // Helper to find the bearing of the closest active route segment
    const getRouteSegmentBearing = (lat: number, lng: number, routeCoords: [number, number][]) => {
        if (routeCoords.length < 2) return 0;
        let minD = Infinity;
        let closestSegmentIndex = 0;
        
        for (let i = 0; i < routeCoords.length - 1; i++) {
            const ptLat = routeCoords[i][1];
            const ptLng = routeCoords[i][0];
            const d = getDistance(lat, lng, ptLat, ptLng) * 1000;
            if (d < minD) {
                minD = d;
                closestSegmentIndex = i;
            }
        }
        
        const p1 = routeCoords[closestSegmentIndex];
        const p2 = routeCoords[closestSegmentIndex + 1];
        return getBearing(p1[1], p1[0], p2[1], p2[0]);
    };

    // Off-route detection with 45 degrees instruction tolerance and API throttle
    const shouldRecalculateRoute = (lat: number, lng: number, bearing: number) => {
        const now = Date.now();
        if (lastFetchTime.current === 0) return true;
        
        // Force recalculate if we moved a lot (e.g. > 100m)
        if (lastFetchLocation.current) {
            const dMoved = getDistance(lastFetchLocation.current.lat, lastFetchLocation.current.lng, lat, lng) * 1000;
            if (dMoved > 100) return true;
        }

        // Force recalculate if we are very close to the turn point (within 15m) to advance the steps
        if (nextManeuverCoords.current) {
            const distToTurn = getDistance(lat, lng, nextManeuverCoords.current.lat, nextManeuverCoords.current.lng) * 1000;
            if (distToTurn < 15) {
                console.log("🎯 [NavEngine] Close to turn point. Recalculating route for next step...");
                return true;
            }
        }

        // Off-Route Detection: distance > 35m and bearing difference > instructionTolerance (45 deg)
        if (routeCoordinates.current.length > 0) {
            const dToRoute = getDistanceToRoute(lat, lng, routeCoordinates.current);
            const segBearing = getRouteSegmentBearing(lat, lng, routeCoordinates.current);
            let aDiff = Math.abs(bearing - segBearing);
            if (aDiff > 180) aDiff = 360 - aDiff;

            if (dToRoute > 35 && aDiff > instructionTolerance) {
                console.log(`⚠️ [NavEngine] Off-route: dist=${dToRoute.toFixed(1)}m, angleDiff=${aDiff.toFixed(1)}°. Recalculating...`);
                
                // Speak standard recalculation phrase
                const recalculatePhrase = `Rota recalculada. Siga na via à frente.`;
                enqueueSpeech({
                    text: recalculatePhrase,
                    priority: 2,
                    isManeuver: true
                });
                return true;
            }
        }

        // Throttled recalculation: once every 6 seconds to update distance/time
        if (now - lastFetchTime.current > 6000) {
            return true;
        }

        return false;
    };

    // Update location, bearing and route
    useEffect(() => {
        if (!map.current || !effectiveLocation || !destinationCoords) return;

        // Update markers
        marker.current?.setLngLat([effectiveLocation.lng, effectiveLocation.lat]);
        destinationMarker.current?.setLngLat([destinationCoords.lng, destinationCoords.lat]);
        
        // Add destination marker if it's not on the map yet
        if (map.current && destinationMarker.current && !destinationMarker.current.getElement().parentElement) {
            destinationMarker.current.addTo(map.current);
        }

        // Calculate Bearing (Direction) with Smoothing, Heading-Up and fallback to Route segment
        let targetBearing = lastSmoothedBearing.current || 0;
        let hasNewBearing = false;

        const distMoved = lastLocation.current ? getDistance(
            lastLocation.current.lat, lastLocation.current.lng,
            effectiveLocation.lat, effectiveLocation.lng
        ) * 1000 : 0; // in meters

        // Speed in km/h
        const speedKmh = effectiveLocation.speed != null ? effectiveLocation.speed * 3.6 : (distMoved / 1) * 3.6;

        if (distMoved > 1.5 && speedKmh > 1.5 && lastLocation.current) {
            const rawBearing = getBearing(
                lastLocation.current.lat, lastLocation.current.lng,
                effectiveLocation.lat, effectiveLocation.lng
            );
            targetBearing = rawBearing;
            hasNewBearing = true;
        } else if (routeCoordinates.current.length > 1) {
            // Stationary/Initial alignment: orient towards the route segment ahead
            let nextCoordIndex = 1;
            for (let i = 1; i < routeCoordinates.current.length; i++) {
                const ptLng = routeCoordinates.current[i][0];
                const ptLat = routeCoordinates.current[i][1];
                const dist = getDistance(effectiveLocation.lat, effectiveLocation.lng, ptLat, ptLng) * 1000;
                if (dist > 8) {
                    nextCoordIndex = i;
                    break;
                }
            }
            const nextPt = routeCoordinates.current[nextCoordIndex];
            targetBearing = getBearing(effectiveLocation.lat, effectiveLocation.lng, nextPt[1], nextPt[0]);
            hasNewBearing = true;
        }

        if (hasNewBearing) {
            // Smooth the bearing using EMA (Exponential Moving Average)
            if (lastSmoothedBearing.current !== null) {
                let diff = targetBearing - lastSmoothedBearing.current;
                
                // Handle 0/360 wrap-around
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                
                // alpha = 0.6
                targetBearing = (lastSmoothedBearing.current + diff * 0.6 + 360) % 360;
            }
            lastSmoothedBearing.current = targetBearing;
        }

        // Apply constant Heading-Up map orientation
        const containerHeight = map.current.getContainer().getBoundingClientRect().height;
        const dynamicTopPadding = containerHeight * (isMissionOverlayExpanded ? 0.52 : 0.38);

        map.current.easeTo({
            center: [effectiveLocation.lng, effectiveLocation.lat],
            bearing: navigationMode === 'heading_up' ? targetBearing : 0,
            duration: distMoved > 1.5 ? 500 : 1000,
            padding: { top: dynamicTopPadding, bottom: 80 },
            pitch: isArriving ? 0 : 55,
            easing: (t) => t
        });

        // Compute local distance to the next maneuver step and trigger voice alerts
        if (nextManeuverCoords.current && instruction) {
            const localDist = getDistance(
                effectiveLocation.lat, effectiveLocation.lng,
                nextManeuverCoords.current.lat, nextManeuverCoords.current.lng
            ) * 1000; // in meters

            const distText = localDist < 1000
                ? `${Math.round(localDist)}m`
                : `${(localDist / 1000).toFixed(1)}km`;

            // Update instruction distance in real-time (every 1s)
            setInstruction(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    distance: localDist,
                    distanceText: distText.replace('m', ' m').replace('km', ' km'),
                    fullText: prev.roadName ? `A ${distText}, ${getActionLabel(prev.modifier)} na ${prev.roadName}` : `A ${distText}, ${getActionLabel(prev.modifier)}`
                };
            });

            // Voice Guidance checkpoints: 200m (Anticipation) and 50m (Execution)
            if (localDist <= maneuverBuffers[0] && localDist > (maneuverBuffers[0] - 50) && lastCheckPoint.current !== maneuverBuffers[0]) {
                lastCheckPoint.current = maneuverBuffers[0];
                const phrase = getNaturalPhrase(localDist, instruction.modifier, instruction.roadName, false);
                enqueueSpeech({
                    text: phrase,
                    priority: 2, // Medium priority for anticipation
                    isManeuver: true
                });
            } else if (localDist <= maneuverBuffers[1] && lastCheckPoint.current !== maneuverBuffers[1]) {
                lastCheckPoint.current = maneuverBuffers[1];
                const phrase = getNaturalPhrase(localDist, instruction.modifier, instruction.roadName, true); // Execution
                enqueueSpeech({
                    text: phrase,
                    priority: 3, // High priority for execution
                    isManeuver: true
                });
            }

            // Reset checkpoint counter when moving to a new step
            if (localDist > maneuverBuffers[0] + 50) {
                lastCheckPoint.current = 0;
            }
        }

        // Update Speedometer (convert m/s to km/h)
        if (effectiveLocation.speed != null) {
            setCurrentSpeed(Math.round(effectiveLocation.speed * 3.6));
        } else if (lastLocation.current) {
            const dist = getDistance(lastLocation.current.lat, lastLocation.current.lng, effectiveLocation.lat, effectiveLocation.lng);
            if (dist > 0.001) { // Only if moved enough
                setCurrentSpeed(Math.round((dist / 1) * 3600)); // assumes 1s interval
            }
        }

        lastLocation.current = effectiveLocation;

        // Fetch Route & Instructions (with off-route detection and throttling)
        if (shouldRecalculateRoute(effectiveLocation.lat, effectiveLocation.lng, targetBearing)) {
            fetchRoute(effectiveLocation, destinationCoords);
        }

        // Calculate progress if we have the total distance tracked
        if (totalRouteDistance > 0 && map.current?.getSource('route')) {
             const currentDist = getDistance(effectiveLocation.lat, effectiveLocation.lng, destinationCoords.lat, destinationCoords.lng) * 1000;
             const rawPct = ((totalRouteDistance - currentDist) / totalRouteDistance) * 100;
             setProgressPct(Math.min(100, Math.max(0, rawPct)));
        }

    }, [effectiveLocation, destinationCoords]);

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
        lastFetchTime.current = Date.now();
        lastFetchLocation.current = start;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}&language=pt`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates;

                // Salva coordenadas da rota para o alinhamento Heading-Up e detecção de desvios
                routeCoordinates.current = coords;

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


                // Arrival Alert Detection (within 100m)
                if (route.distance < 100 && !isArriving) {
                    setIsArriving(true);
                    speak("Você chegou ao destino.", 3, true);
                    
                    // Exit 3D mode and zoom in
                    map.current?.easeTo({
                        pitch: 0,
                        zoom: 19,
                        duration: 1500
                    });
                } else if (route.distance >= 100 && isArriving) {
                    setIsArriving(false);
                    
                    // Return to top-down mode
                    map.current?.easeTo({
                        pitch: 55,
                        zoom: 18,
                        duration: 1500
                    });
                }

                // Next Step Instruction
                if (route.legs[0].steps.length > 0) {
                    const nextStep = route.legs[0].steps[0];
                    const distText = nextStep.distance < 1000
                        ? `${Math.round(nextStep.distance)}m`
                        : `${(nextStep.distance / 1000).toFixed(1)}km`;

                    // Use modifier (English) from Mapbox — source of truth for direction
                    const modifier = nextStep.maneuver.modifier || 'straight';
                    const actionLabel = getActionLabel(modifier);

                    // Road name: prefer the step name, but never use the instruction text as name
                    const rawName = nextStep.name?.trim() || '';
                    const roadName = rawName.length > 0 ? rawName : '';

                    const fullText = roadName.length > 0
                        ? `A ${distText}, ${actionLabel} na ${roadName}`
                        : `A ${distText}, ${actionLabel}`;

                    // Update current street pill on the map marker
                    if (rawName.length > 0) {
                        setCurrentStreet(rawName.toUpperCase());
                    }

                    const nextNextStep = route.legs[0].steps[1];
                    const secondaryRoad = nextNextStep?.name?.trim() || '';

                    // Salva as coordenadas do próximo ponto de manobra para cálculos locais em tempo real
                    if (nextStep.maneuver?.location) {
                        nextManeuverCoords.current = {
                            lng: nextStep.maneuver.location[0],
                            lat: nextStep.maneuver.location[1]
                        };
                    }

                    setInstruction({
                        fullText: fullText,
                        distance: nextStep.distance,
                        distanceText: distText.replace('m', ' m').replace('km', ' km'),
                        modifier: modifier,
                        roadName: roadName || actionLabel,
                        nextRoadName: secondaryRoad
                    });
                }


                // Update Route Line
                if (map.current?.getSource('route')) {
                    (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
                        type: 'Feature',
                        properties: {},
                        geometry: route.geometry
                    });
                } else {
                    const addRouteLayers = () => {
                        if (!map.current || map.current.getSource('route')) return;
                        
                        map.current.addSource('route', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: route.geometry
                            }
                        });

                        // Route Shadow Layer for "Elevated" look
                        map.current.addLayer({
                            id: 'route-shadow',
                            type: 'line',
                            source: 'route',
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 
                                'line-color': '#000', 
                                'line-width': 8, 
                                'line-opacity': 0.3,
                                'line-translate': [3, 3] 
                            }
                        });

                        map.current.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 'line-color': '#FF6B00', 'line-width': 8, 'line-opacity': 1.0 }
                        });
                    };

                    if (map.current?.loaded()) {
                        addRouteLayers();
                    } else {
                        map.current?.on('load', addRouteLayers);
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
                        {/* Audio Controls */}
                        <div className="flex items-center space-x-2">
                             {/* Gender Toggle Button */}
                             <button 
                                onClick={() => setVoiceGender(prev => prev === 'male' ? 'female' : 'male')}
                                className="w-10 h-10 rounded-full flex flex-col items-center justify-center bg-white/5 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-white/10 transition-all font-black text-[9px] tracking-wide"
                                title="Alternar voz Masculina / Feminina"
                             >
                                <span className="leading-none text-[8px] text-[#F5E6D3]/60 mb-0.5 font-bold uppercase">Voz</span>
                                <span className="leading-none font-black">{voiceGender === 'male' ? 'MASC' : 'FEM'}</span>
                             </button>
                             {/* Speaker Button */}
                             <button 
                                onClick={() => setVoiceEnabled(!voiceEnabled)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${voiceEnabled ? 'bg-orange-600/20 text-orange-500 border border-orange-500/30 shadow-[0_0_15px_rgba(255,107,0,0.2)]' : 'bg-white/5 border border-white/10 text-white/20'}`}
                            >
                                <i className={`fas ${voiceEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-sm`}></i>
                            </button>
                        </div>

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

                {/* BOTÃO DE CHAT COM NOTIFICAÇÃO */}
                <button 
                    onClick={onChatClick}
                    className={`w-14 h-14 rounded-full bg-zinc-950/90 border border-white/5 shadow-2xl flex items-center justify-center text-white backdrop-blur-3xl active:scale-90 transition-all hover:bg-black group ring-1 ring-white/5 relative ${unreadCount > 0 ? 'animate-pulse-subtle border-[#FF6B00]/40' : ''}`}
                >
                    <i className="fas fa-comments text-xl group-hover:scale-110 transition-transform"></i>
                    {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B00] rounded-full border-2 border-[#0D0502] flex items-center justify-center animate-bounce">
                            <span className="text-[10px] font-black text-white">{unreadCount}</span>
                        </div>
                    )}
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
