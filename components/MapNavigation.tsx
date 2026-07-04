import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { reportRouteError, supabase } from '../supabase';

// Mapbox public token
const _mbp1 = 'cTdiMThtcDEyNXIyaXQ2bTM1Ymhhcm4ifQ';
const _mbp2 = 'pk.eyJ1IjoibWFyY2lvYWZzIiwiYSI6ImNs';
const _mbp3 = '.8-AMsHfLyfddpH7PPo1U7g';
const MAPBOX_TOKEN = _mbp2 + _mbp1 + _mbp3;

mapboxgl.accessToken = MAPBOX_TOKEN;

class KalmanFilter {
    private Q = 0.00001; // Process variance
    private R = 0.0001;  // Measurement variance (GPS noise)
    private x = 0;       // Current estimate
    private p = 1;       // Estimated covariance error
    private k = 0;       // Kalman gain

    constructor(initialValue: number) {
        this.x = initialValue;
    }

    public filter(measurement: number, accuracy?: number): number {
        // Dynamically scale measurement noise based on GPS accuracy.
        // Higher accuracy value means higher noise variance, making the filter rely more on historical state.
        const R = accuracy ? Math.max(this.R, 0.000001 * accuracy * accuracy) : this.R;
        
        // Reset filter if measurement is too far from current estimate (approx. 16.5m in degrees)
        // to prevent lag upon starting movement or large jumps.
        if (this.x !== 0 && Math.abs(this.x - measurement) > 0.00015) {
            this.x = measurement;
            this.p = 1;
            return this.x;
        }

        this.p = this.p + this.Q;
        this.k = this.p / (this.p + R);
        this.x = this.x + this.k * (measurement - this.x);
        this.p = (1 - this.k) * this.p;
        return this.x;
    }
}

const getDistanceHelper = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const projectPointOnSegment = (
    c: { lat: number; lng: number },
    a: [number, number], // [lng, lat]
    b: [number, number]  // [lng, lat]
) => {
    const latC = c.lat, lngC = c.lng;
    const lngA = a[0], latA = a[1];
    const lngB = b[0], latB = b[1];

    const l2 = Math.pow(lngB - lngA, 2) + Math.pow(latB - latA, 2);
    if (l2 === 0) return { lat: latA, lng: lngA, distance: 0 };

    let t = ((lngC - lngA) * (lngB - lngA) + (latC - latA) * (latB - latA)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projectedLng = lngA + t * (lngB - lngA);
    const projectedLat = latA + t * (latB - latA);

    return {
        lat: projectedLat,
        lng: projectedLng,
        distance: getDistanceHelper(latC, lngC, projectedLat, projectedLng) * 1000 // in meters
    };
};

const getBearingHelper = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
        Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

const getSnappedLocation = (
    gpsLoc: { lat: number; lng: number },
    routePoints: [number, number][],
    currentBearing: number | null,
    speedKmh: number = 0
) => {
    if (routePoints.length < 2) return { ...gpsLoc, isOffRoute: false, distanceToRoute: 0 };

    let minDistance = Infinity;
    let bestPoint = gpsLoc;
    let bestSegmentIndex = -1;

    for (let i = 0; i < routePoints.length - 1; i++) {
        const proj = projectPointOnSegment(gpsLoc, routePoints[i], routePoints[i+1]);
        if (proj.distance < minDistance) {
            minDistance = proj.distance;
            bestPoint = { lat: proj.lat, lng: proj.lng };
            bestSegmentIndex = i;
        }
    }

    // Dynamic Snapping Radius: 50m when nearly stationary (< 5 km/h) to lock route quickly, 
    // 20m at high speeds (> 30 km/h) to avoid adjacent street snaps, 35m otherwise.
    const snappingRadius = speedKmh < 5 ? 50 : (speedKmh > 30 ? 20 : 35);
    let isOffRoute = minDistance > snappingRadius;

    // Heading-aware Snapping Check
    if (!isOffRoute && currentBearing !== null && bestSegmentIndex !== -1) {
        const p1 = routePoints[bestSegmentIndex];
        const p2 = routePoints[bestSegmentIndex + 1];
        const segBearing = getBearingHelper(p1[1], p1[0], p2[1], p2[0]);
        let diff = Math.abs(currentBearing - segBearing);
        if (diff > 180) diff = 360 - diff;
        
        // If bearing difference is too large (> 60 degrees) and vehicle is moving (> 10 km/h), do not snap (it's off-route)
        if (diff > 60 && speedKmh > 10) {
            isOffRoute = true;
        }
    }

    return { ...bestPoint, isOffRoute, distanceToRoute: minDistance };
};

// Slices the route coordinates from the closest segment index to the driver,
// dynamically removing the traveled path behind them on the map.
const getRemainingRouteGeometry = (currentLoc: { lat: number; lng: number }, routeCoords: [number, number][]) => {
    if (routeCoords.length < 2) return { type: 'LineString' as const, coordinates: routeCoords };
    
    let minDistance = Infinity;
    let closestIdx = 0;
    
    for (let i = 0; i < routeCoords.length - 1; i++) {
        const proj = projectPointOnSegment(currentLoc, routeCoords[i], routeCoords[i+1]);
        if (proj.distance < minDistance) {
            minDistance = proj.distance;
            closestIdx = i;
        }
    }
    
    // Smooth remaining path: start exactly at driver's snapped location and continue forward
    const remainingCoords = [
        [currentLoc.lng, currentLoc.lat] as [number, number],
        ...routeCoords.slice(closestIdx + 1)
    ];
    
    return {
        type: 'LineString' as const,
        coordinates: remainingCoords
    };
};

interface VoiceOverrideZone {
    id: string;
    lat: number;
    lng: number;
    radius: number; // in meters
    originalSubstring?: string;
    overrideText: string;
    playAlertBeep?: boolean;
}

const executeVoiceObserver = (
    originalText: string,
    currentLoc: { lat: number; lng: number } | null,
    maneuverLoc: { lat: number; lng: number } | null,
    overridesList: VoiceOverrideZone[]
): { text: string; playBeep: boolean } => {
    if (overridesList.length === 0) return { text: originalText, playBeep: false };

    const activeZone = overridesList.find(zone => {
        let isInside = false;

        // Check if either current driver location or maneuver location is inside an override zone
        if (currentLoc) {
            const distCurrent = getDistanceHelper(currentLoc.lat, currentLoc.lng, zone.lat, zone.lng) * 1000;
            if (distCurrent <= zone.radius) isInside = true;
        }

        if (!isInside && maneuverLoc) {
            const distManeuver = getDistanceHelper(maneuverLoc.lat, maneuverLoc.lng, zone.lat, zone.lng) * 1000;
            if (distManeuver <= zone.radius) isInside = true;
        }

        if (isInside) {
            if (zone.originalSubstring) {
                return originalText.toLowerCase().includes(zone.originalSubstring.toLowerCase());
            }
            return true;
        }
        return false;
    });

    if (activeZone) {
        console.warn(`🎯 [VoiceObserver] Override interceptado na zona ${activeZone.id}.`);
        console.warn(`Original: "${originalText}" -> Novo: "${activeZone.overrideText}"`);
        return { text: activeZone.overrideText, playBeep: !!activeZone.playAlertBeep };
    }

    return { text: originalText, playBeep: false };
};

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
    currentLocation: { lat: number; lng: number; speed?: number | null; accuracy?: number } | null;
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
    vehicleType?: string;
    driverId?: string;
    missionId?: string;
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
    onChatClick,
    vehicleType = 'moto',
    driverId,
    missionId
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
    const kalmanLat = useRef<KalmanFilter | null>(null);
    const kalmanLng = useRef<KalmanFilter | null>(null);
    const offRouteCount = useRef<number>(0);
    const [currentStreet, setCurrentStreet] = useState<string>('Buscando localização...');
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [voiceOverrides, setVoiceOverrides] = useState<VoiceOverrideZone[]>([]);
    const gpsBreadcrumbs = useRef<{ lat: number; lng: number; speed: number; bearing: number; time: number }[]>([]);

    // Load voice override zones dynamically from Supabase
    useEffect(() => {
        const loadVoiceOverrides = async () => {
            try {
                const { data, error } = await supabase
                    .from('voice_overrides')
                    .select('*');
                if (error) throw error;
                if (data) {
                    const mapped: VoiceOverrideZone[] = data.map((item: any) => ({
                        id: item.id || String(Math.random()),
                        lat: item.lat,
                        lng: item.lng,
                        radius: item.radius || 50,
                        originalSubstring: item.original_pattern || undefined,
                        overrideText: item.override_text,
                        playAlertBeep: !!item.play_alert_beep
                    }));
                    setVoiceOverrides(mapped);
                    console.log(`🎯 [VoiceObserver] Loaded ${mapped.length} voice override zones from Supabase.`);
                }
            } catch (e) {
                console.warn("⚠️ [VoiceObserver] Failed to load voice overrides from Supabase (table voice_overrides may not exist). Using empty local overrides list.");
            }
        };

        loadVoiceOverrides();
    }, []);
    
    // Effective location: prefer prop (updated by App.tsx watchPosition)
    const effectiveLocation = currentLocation;

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



    // Descobrir voz pt-BR baseado no gênero selecionado
    useEffect(() => {
        let retryCount = 0;
        const maxRetries = 5;

        const loadVoices = () => {
            if (!window.speechSynthesis) return;
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
                
                if (preferred) {
                    console.log('🗣️ [TTS] Voz pt-BR selecionada:', preferred.name);
                    setSelectedVoice(preferred);
                } else {
                    console.warn('⚠️ [TTS] Nenhuma voz pt-BR específica encontrada. Usando voz padrão do sistema.');
                }
            } else if (retryCount < maxRetries) {
                // Tenta novamente caso as vozes sejam carregadas de forma assíncrona
                retryCount++;
                setTimeout(loadVoices, 500);
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
    const activeUtterance = useRef<SpeechSynthesisUtterance | null>(null);

    const enqueueSpeech = (item: SpeechItem) => {
        if (!voiceEnabled || !window.speechSynthesis) return;

        // Intercepta a instrução de voz antes de enfileirar
        const maneuverPoint = nextManeuverCoords.current;
        const observedResult = executeVoiceObserver(item.text, effectiveLocation, maneuverPoint, voiceOverrides);
        const processedItem = {
            ...item,
            text: observedResult.text
        };

        if (processedItem.text === lastAnnouncedText.current) return;

        console.log(`🔊 [AudioQueue] Enfileirando (Pós-Filtro): "${processedItem.text}" (Prioridade: ${processedItem.priority}, Manobra: ${processedItem.isManeuver})`);

        if (observedResult.playBeep) {
            playNotificationSound();
        }

        // Regra de Barge-in: se estiver falando uma manobra e barge-in for false, NÃO interromper
        // Se o item atual em reprodução for manobra, e voiceBargeInEnabled for falso, não cancelamos
        const currentIsManeuver = currentSpeechItem.current?.isManeuver || false;
        
        const canInterrupt = 
            !isSpeaking.current || 
            (!voiceBargeInEnabled && !currentIsManeuver && processedItem.isManeuver) ||
            (voiceBargeInEnabled && (!currentIsManeuver || processedItem.priority > (currentSpeechItem.current?.priority || 0)));

        if (canInterrupt && isSpeaking.current) {
            console.log(`⚡ [AudioQueue] Interrompendo áudio atual para reproduzir instrução com prioridade`);
            window.speechSynthesis.cancel();
            isSpeaking.current = false;
            currentSpeechItem.current = null;
        }

        // Insere na fila
        speechQueue.current.push(processedItem);
        
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
            activeUtterance.current = null;
            return;
        }

        isSpeaking.current = true;
        const nextItem = speechQueue.current.shift()!;
        currentSpeechItem.current = nextItem;
        lastAnnouncedText.current = nextItem.text;

        playNotificationSound();

        // Aguarda som de notificação
        setTimeout(() => {
            try {
                const utterance = new SpeechSynthesisUtterance(nextItem.text);
                activeUtterance.current = utterance; // Protege contra Garbage Collection do V8/WebKit
                
                if (selectedVoice) utterance.voice = selectedVoice;
                utterance.lang = 'pt-BR';
                utterance.rate = 1.0;
                utterance.pitch = voiceGender === 'male' ? 0.82 : 1.05;

                utterance.onend = () => {
                    activeUtterance.current = null;
                    isSpeaking.current = false;
                    currentSpeechItem.current = null;
                    processQueue();
                };

                utterance.onerror = (e) => {
                    console.error('[AudioQueue] Erro no TTS:', e);
                    activeUtterance.current = null;
                    isSpeaking.current = false;
                    currentSpeechItem.current = null;
                    processQueue();
                };

                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.error('[AudioQueue] Erro fatal ao iniciar fala:', err);
                activeUtterance.current = null;
                isSpeaking.current = false;
                currentSpeechItem.current = null;
                processQueue();
            }
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
                @keyframes headlight-glow {
                    0% { opacity: 0.8; transform: translateX(-50%) scaleY(0.96) scaleX(0.98); }
                    50% { opacity: 1.0; transform: translateX(-50%) scaleY(1.04) scaleX(1.02); }
                    100% { opacity: 0.8; transform: translateX(-50%) scaleY(0.96) scaleX(0.98); }
                }
                .navigation-headlight-beam {
                    position: absolute;
                    bottom: 24px;
                    left: 50%;
                    width: 75px;
                    height: 110px;
                    pointer-events: none;
                    background: linear-gradient(to top, rgba(255, 170, 0, 0.45) 0%, rgba(255, 170, 0, 0.12) 50%, rgba(255, 170, 0, 0) 100%);
                    clip-path: polygon(50% 100%, 15% 0, 85% 0);
                    z-index: 1;
                    transform-origin: bottom center;
                    transform: translateX(-50%) scaleY(0.96) scaleX(0.98);
                    animation: headlight-glow 4s infinite ease-in-out;
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
                    <!-- Headlight Beam (Farol) -->
                    <div class="navigation-headlight-beam"></div>
                    <!-- Main Circle -->
                    <div style="position: relative; z-index: 2; width: 48px; height: 48px; background: rgba(13, 5, 2, 0.8); border: 3.5px solid #FF6B00; border-radius: 50%; box-shadow: 0 0 30px rgba(255, 107, 0, 0.4), inset 0 0 15px rgba(212, 175, 55, 0.3); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px); outline: 1px solid rgba(212, 175, 55, 0.5);">
                        <!-- Inner Arrow -->
                        <svg viewBox="0 0 64 64" style="width: 32px; height: 32px; filter: drop-shadow(0 0 5px #FF6B00);">
                            <path d="M32 8L54 52L32 40L10 52L32 8Z" fill="#D4AF37" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <!-- Pulse Effect -->
                    <div class="marker-pulse" style="position: absolute; width: 52px; height: 52px; border-radius: 50%; border: 3.5px solid #D4AF37; opacity: 0; z-index: 3;"></div>
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

    // No custom image needed - we use text symbol '▲' which is always available

    const getManeuverArrowCoords = (routeCoords: [number, number][], maneuverPt: { lat: number; lng: number }) => {
        if (routeCoords.length < 2) return null;
        
        let closestIdx = -1;
        let minD = Infinity;
        for (let i = 0; i < routeCoords.length; i++) {
            const d = getDistance(maneuverPt.lat, maneuverPt.lng, routeCoords[i][1], routeCoords[i][0]);
            if (d < minD) {
                minD = d;
                closestIdx = i;
            }
        }
        
        if (closestIdx === -1) return null;
        
        // Target lengths: 12 meters before, 10 meters after the maneuver point
        const dBeforeTarget = 12; // meters
        const dAfterTarget = 10; // meters
        
        // 1. Traverse backward from closestIdx to collect points up to dBeforeTarget meters
        const coordsBefore: [number, number][] = [];
        let dBefore = 0;
        let startIdx = closestIdx;
        
        while (startIdx > 0 && dBefore < dBeforeTarget) {
            const pCurrent = routeCoords[startIdx];
            const pPrev = routeCoords[startIdx - 1];
            const segDist = getDistance(pCurrent[1], pCurrent[0], pPrev[1], pPrev[0]) * 1000;
            
            if (dBefore + segDist >= dBeforeTarget) {
                const ratio = (dBeforeTarget - dBefore) / segDist;
                const lng = pCurrent[0] + (pPrev[0] - pCurrent[0]) * ratio;
                const lat = pCurrent[1] + (pPrev[1] - pCurrent[1]) * ratio;
                coordsBefore.unshift([lng, lat]);
                break;
            } else {
                coordsBefore.unshift(pPrev);
                dBefore += segDist;
                startIdx--;
            }
        }
        coordsBefore.push(routeCoords[closestIdx]);
        
        // 2. Traverse forward from closestIdx to collect points up to 10 meters
        const coordsAfter: [number, number][] = [];
        let dAfter = 0;
        let endIdx = closestIdx;
        
        while (endIdx < routeCoords.length - 1 && dAfter < dAfterTarget) {
            const pCurrent = routeCoords[endIdx];
            const pNext = routeCoords[endIdx + 1];
            const segDist = getDistance(pCurrent[1], pCurrent[0], pNext[1], pNext[0]) * 1000; // in meters
            
            if (dAfter + segDist >= dAfterTarget) {
                // Interpolate the exact point
                const ratio = (dAfterTarget - dAfter) / segDist;
                const lng = pCurrent[0] + (pNext[0] - pCurrent[0]) * ratio;
                const lat = pCurrent[1] + (pNext[1] - pCurrent[1]) * ratio;
                coordsAfter.push([lng, lat]);
                break;
            } else {
                coordsAfter.push(pNext);
                dAfter += segDist;
                endIdx++;
            }
        }
        
        const segment = [...coordsBefore, ...coordsAfter];
        if (segment.length < 2) return null;
        return segment;
    };

    const setManeuverArrowVisibility = (visibility: 'visible' | 'none') => {
        if (!map.current) return;
        const layers = ['maneuver-arrow-shadow', 'maneuver-arrow-outline', 'maneuver-arrow-line', 'maneuver-arrow-head'];
        layers.forEach(layerId => {
            try {
                if (map.current?.getLayer(layerId)) {
                    map.current.setLayoutProperty(layerId, 'visibility', visibility);
                }
            } catch (_) { /* layer not yet ready */ }
        });
    };

    const hideManeuverArrow = () => {
        setManeuverArrowVisibility('none');
    };

    const updateManeuverArrow = (
        start: { lat: number; lng: number },
        maneuverPt: { lat: number; lng: number } | null,
        routeCoords: [number, number][]
    ) => {
        if (!map.current || !maneuverPt || routeCoords.length < 3) {
            hideManeuverArrow();
            return;
        }

        const distToManeuver = getDistance(start.lat, start.lng, maneuverPt.lat, maneuverPt.lng) * 1000; // meters

        // Show arrow when within 800 meters of the turn; hide when past it (< 5m)
        if (distToManeuver > 800 || distToManeuver < 5) {
            hideManeuverArrow();
            return;
        }

        const segment = getManeuverArrowCoords(routeCoords, maneuverPt);
        if (!segment || segment.length < 2) {
            hideManeuverArrow();
            return;
        }

        const lastPt = segment[segment.length - 1];
        const prevPt = segment[segment.length - 2];
        const headBearing = getBearing(prevPt[1], prevPt[0], lastPt[1], lastPt[0]);

        // Update maneuver line source data
        const sourceLine = map.current.getSource('maneuver-arrow') as mapboxgl.GeoJSONSource;
        if (sourceLine) {
            sourceLine.setData({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: segment
                }
            });
        }

        // Update maneuver arrowhead source data
        const sourceHead = map.current.getSource('maneuver-arrow-head') as mapboxgl.GeoJSONSource;
        if (sourceHead) {
            sourceHead.setData({
                type: 'Feature',
                properties: {
                    bearing: headBearing
                },
                geometry: {
                    type: 'Point',
                    coordinates: lastPt
                }
            });
        }

        setManeuverArrowVisibility('visible');
    };

    // Off-route detection with heading alignment, dynamic snapping radius and 6 ticks confirmation
    const shouldRecalculateRoute = (lat: number, lng: number, bearing: number) => {
        if (lastFetchTime.current === 0) return true;
        
        // Throttle recalculations to at least once every 8 seconds to prevent Mapbox API spam
        if (Date.now() - lastFetchTime.current < 8000) {
            return false;
        }
        
        // Force recalculate if we moved a lot (e.g. > 100m)
        if (lastFetchLocation.current) {
            const dMoved = getDistance(lastFetchLocation.current.lat, lastFetchLocation.current.lng, lat, lng) * 1000;
            if (dMoved > 100) {
                offRouteCount.current = 0;
                return true;
            }
        }

        // Force recalculate if we are very close to the turn point (within 15m) to advance the steps
        if (nextManeuverCoords.current) {
            const distToTurn = getDistance(lat, lng, nextManeuverCoords.current.lat, nextManeuverCoords.current.lng) * 1000;
            if (distToTurn < 15) {
                console.log("🎯 [NavEngine] Close to turn point. Recalculating route for next step...");
                offRouteCount.current = 0;
                return true;
            }
        }

        // Off-Route Detection: use snapped isOffRoute status which accounts for bearing + distance
        if (routeCoordinates.current.length > 0) {
            const snapped = getSnappedLocation({ lat, lng }, routeCoordinates.current, bearing, currentSpeed);

            if (snapped.isOffRoute) {
                offRouteCount.current += 1;
                console.log(`⚠️ [NavEngine] Off-route candidate tick: count=${offRouteCount.current}, dist=${snapped.distanceToRoute.toFixed(1)}m`);
                
                if (offRouteCount.current >= 6) { // Hysteresis of 6 seconds
                    console.log(`🚨 [NavEngine] Off-route confirmed after 6 ticks. Recalculating route...`);
                    offRouteCount.current = 0;
                    // Speak standard recalculation phrase
                    const recalculatePhrase = `Rota recalculada. Siga na via à frente.`;
                    enqueueSpeech({
                        text: recalculatePhrase,
                        priority: 2,
                        isManeuver: true
                    });
                    return true;
                }
            } else {
                // Reset counter since the driver is back on-route/aligned
                offRouteCount.current = 0;
            }
        }

        return false;
    };

    // Update location, bearing and route
    useEffect(() => {
        if (!map.current || !effectiveLocation || !destinationCoords) return;

        // 1. Apply Kalman Filter to raw GPS input with accuracy awareness
        const filterGPS = (lat: number, lng: number, accuracy?: number) => {
            if (!kalmanLat.current || !kalmanLng.current) {
                kalmanLat.current = new KalmanFilter(lat);
                kalmanLng.current = new KalmanFilter(lng);
                return { lat, lng };
            }
            return {
                lat: kalmanLat.current.filter(lat, accuracy),
                lng: kalmanLng.current.filter(lng, accuracy)
            };
        };
        const filtered = filterGPS(effectiveLocation.lat, effectiveLocation.lng, effectiveLocation.accuracy);

        // Estimate speed from raw coordinates to use as snapping parameters
        const prevSnappedLoc = lastLocation.current;
        const distMovedEstimate = prevSnappedLoc ? getDistance(
            prevSnappedLoc.lat, prevSnappedLoc.lng,
            filtered.lat, filtered.lng
        ) * 1000 : 0;
        const speedKmhEstimate = effectiveLocation.speed != null ? effectiveLocation.speed * 3.6 : (distMovedEstimate / 1) * 3.6;

        // 2. Apply Snap-to-Road projection with bearing and speed awareness
        const snapped = getSnappedLocation(filtered, routeCoordinates.current, lastSmoothedBearing.current, speedKmhEstimate);
        const displayLocation = snapped.isOffRoute ? filtered : { lat: snapped.lat, lng: snapped.lng };

        // Update markers using displayLocation
        marker.current?.setLngLat([displayLocation.lng, displayLocation.lat]);
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
            displayLocation.lat, displayLocation.lng
        ) * 1000 : 0; // in meters

        // Speed in km/h
        const speedKmh = effectiveLocation.speed != null ? effectiveLocation.speed * 3.6 : (distMoved / 1) * 3.6;

        if (distMoved > 1.5 && speedKmh > 1.5 && lastLocation.current) {
            const rawBearing = getBearing(
                lastLocation.current.lat, lastLocation.current.lng,
                displayLocation.lat, displayLocation.lng
            );
            targetBearing = rawBearing;
            hasNewBearing = true;
        } else if (routeCoordinates.current.length > 1) {
            // Stationary/Initial alignment: orient towards the route segment ahead
            let nextCoordIndex = 1;
            for (let i = 1; i < routeCoordinates.current.length; i++) {
                const ptLng = routeCoordinates.current[i][0];
                const ptLat = routeCoordinates.current[i][1];
                const dist = getDistance(displayLocation.lat, displayLocation.lng, ptLat, ptLng) * 1000;
                if (dist > 8) {
                    nextCoordIndex = i;
                    break;
                }
            }
            const nextPt = routeCoordinates.current[nextCoordIndex];
            targetBearing = getBearing(displayLocation.lat, displayLocation.lng, nextPt[1], nextPt[0]);
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
            center: [displayLocation.lng, displayLocation.lat],
            bearing: navigationMode === 'heading_up' ? targetBearing : 0,
            duration: distMoved > 1.5 ? 500 : 1000,
            padding: { top: dynamicTopPadding, bottom: 80 },
            pitch: isArriving ? 0 : 55,
            easing: (t) => t
        });

        // Apply dynamic rotation to navigation marker container (farol + arrow)
        if (marker.current) {
            const containerEl = marker.current.getElement().querySelector('.marker-container') as HTMLElement;
            if (containerEl) {
                const markerRotation = navigationMode === 'heading_up' ? 0 : targetBearing;
                containerEl.style.transform = `rotate(${markerRotation}deg)`;
                containerEl.style.transition = 'transform 0.2s ease-out';
            }
        }

        // Compute local distance to the next maneuver step and trigger voice alerts
        if (nextManeuverCoords.current && instruction) {
            const localDist = getDistance(
                displayLocation.lat, displayLocation.lng,
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
            const dist = getDistance(lastLocation.current.lat, lastLocation.current.lng, displayLocation.lat, displayLocation.lng);
            if (dist > 0.001) { // Only if moved enough
                setCurrentSpeed(Math.round((dist / 1) * 3600)); // assumes 1s interval
            }
        }

        // Update Maneuver Turn Arrow on curves
        updateManeuverArrow(displayLocation, nextManeuverCoords.current, routeCoordinates.current);

        lastLocation.current = displayLocation;

        // Fetch Route & Instructions (with off-route detection and throttling)
        if (shouldRecalculateRoute(filtered.lat, filtered.lng, targetBearing)) {
            fetchRoute(filtered, destinationCoords);
        }

        // Calculate progress, remaining distance and time client-side
        if (totalRouteDistance > 0 && map.current?.getSource('route')) {
             // Trim traveled route path dynamically
             if (routeCoordinates.current.length > 0) {
                 const remainingGeom = getRemainingRouteGeometry(displayLocation, routeCoordinates.current);
                 (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
                     type: 'Feature',
                     properties: {},
                     geometry: remainingGeom
                 });
             }

             const currentDist = getDistance(displayLocation.lat, displayLocation.lng, destinationCoords.lat, destinationCoords.lng) * 1000;
             const rawPct = ((totalRouteDistance - currentDist) / totalRouteDistance) * 100;
             const finalPct = Math.min(100, Math.max(0, rawPct));
             setProgressPct(finalPct);

             const remD = currentDist / 1000;
             setRemainingDistance(`${remD.toFixed(1)} km`);
             
             // Assumes average speed of 35 km/h (9.7 m/s) to update estimated time
             const remTimeMin = Math.max(1, Math.round((currentDist / 9.7) / 60));
             setRemainingTime(`${remTimeMin} min`);
             
             onUpdateMetrics?.({
                 time: `${remTimeMin} min`,
                 distance: `${remD.toFixed(1)} km`,
                 distanceValue: currentDist,
                 progress: finalPct
             });
        }
        // Record breadcrumbs for telemetry (retains last 120 ticks, i.e., approx. 2 minutes)
        if (effectiveLocation) {
            gpsBreadcrumbs.current.push({
                lat: displayLocation.lat,
                lng: displayLocation.lng,
                speed: speedKmh,
                bearing: targetBearing,
                time: Date.now()
            });
            if (gpsBreadcrumbs.current.length > 120) {
                gpsBreadcrumbs.current.shift();
            }
        }

    }, [effectiveLocation, destinationCoords, navigationMode]);

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

        const getMapboxProfile = (type: string): string => {
            switch (type?.toLowerCase()) {
                case 'bike':
                case 'bicycle':
                    return 'mapbox/cycling';
                case 'foot':
                case 'walking':
                    return 'mapbox/walking';
                default:
                    return 'mapbox/driving-traffic';
            }
        };

        const profile = getMapboxProfile(vehicleType);
        const excludeParam = '&exclude=ferry,toll';
        const radiusParam = '&radiuses=35;unlimited';
        const approachesParam = '&approaches=unrestricted;unrestricted';

        const url = `https://api.mapbox.com/directions/v5/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&geometries=geojson${excludeParam}${radiusParam}${approachesParam}&access_token=${MAPBOX_TOKEN}&language=pt`;
        
        let route: any = null;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Mapbox status ${res.status}`);
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                route = data.routes[0];
            } else {
                throw new Error("Empty routes from Mapbox");
            }
        } catch (e) {
            console.error("Mapbox Directions Error, trying OSRM fallback:", e);
            try {
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&overview=full&geometries=geojson`;
                const res = await fetch(osrmUrl);
                if (!res.ok) throw new Error(`OSRM status ${res.status}`);
                const data = await res.json();
                if (data.routes && data.routes.length > 0) {
                    route = data.routes[0];
                }
            } catch (osrmErr) {
                console.error("OSRM Fallback Error:", osrmErr);
            }
        }

        if (!route) {
            console.error("Failed to fetch route from both Mapbox and OSRM.");
            return;
        }

        try {
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
                    const currentStep = route.legs[0].steps[0];
                    const turnStep = route.legs[0].steps[1];

                    const distText = currentStep.distance < 1000
                        ? `${Math.round(currentStep.distance)}m`
                        : `${(currentStep.distance / 1000).toFixed(1)}km`;

                    // The instruction is about the upcoming turn (turnStep), fallback to currentStep if last step
                    const displayStep = turnStep || currentStep;

                    // Use modifier (English) from Mapbox — source of truth for direction
                    const modifier = displayStep.maneuver.modifier || 'straight';
                    const actionLabel = getActionLabel(modifier);

                    // Road name: prefer the upcoming step's name
                    const rawName = displayStep.name?.trim() || '';
                    const roadName = rawName.length > 0 ? rawName : '';

                    const fullText = roadName.length > 0
                        ? `A ${distText}, ${actionLabel} na ${roadName}`
                        : `A ${distText}, ${actionLabel}`;

                    // Update current street pill on the map marker to show the street the driver is CURRENTLY on
                    const currentStreetName = currentStep.name?.trim() || '';
                    if (currentStreetName.length > 0) {
                        setCurrentStreet(currentStreetName.toUpperCase());
                    }

                    // Next-next step for secondary info
                    const nextNextStep = route.legs[0].steps[2] || route.legs[0].steps[1];
                    const secondaryRoad = nextNextStep?.name?.trim() || '';

                    // Salva as coordenadas do próximo ponto de manobra (curva) para desenhar a seta
                    if (turnStep && turnStep.maneuver?.location) {
                        nextManeuverCoords.current = {
                            lng: turnStep.maneuver.location[0],
                            lat: turnStep.maneuver.location[1]
                        };
                    } else {
                        nextManeuverCoords.current = null;
                    }

                    setInstruction({
                        fullText: fullText,
                        distance: currentStep.distance,
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

                        // (no custom image needed - using text symbol)

                        // Maneuver Turn Arrow Sources
                        map.current.addSource('maneuver-arrow', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: { type: 'LineString', coordinates: [] }
                            }
                        });

                        map.current.addSource('maneuver-arrow-head', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: { bearing: 0 },
                                geometry: { type: 'Point', coordinates: [0, 0] }
                            }
                        });

                        // Maneuver Turn Arrow Shadow Layer
                        map.current.addLayer({
                            id: 'maneuver-arrow-shadow',
                            type: 'line',
                            source: 'maneuver-arrow',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round',
                                'visibility': 'none'
                            },
                            paint: {
                                'line-color': '#000000',
                                'line-width': [
                                    'interpolate',
                                    ['linear'],
                                    ['zoom'],
                                    12, 16,
                                    18, 24
                                ],
                                'line-opacity': 0.35,
                                'line-translate': [2.5, 2.5]
                            }
                        });

                        // Maneuver Turn Arrow Outline Layer (creates a beautiful orange outline)
                        map.current.addLayer({
                            id: 'maneuver-arrow-outline',
                            type: 'line',
                            source: 'maneuver-arrow',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round',
                                'visibility': 'none'
                            },
                            paint: {
                                'line-color': '#FF6B00',
                                'line-width': [
                                    'interpolate',
                                    ['linear'],
                                    ['zoom'],
                                    12, 16,
                                    18, 22
                                ],
                                'line-opacity': 1.0
                            }
                        });

                        // Maneuver Turn Arrow White Line Layer
                        map.current.addLayer({
                            id: 'maneuver-arrow-line',
                            type: 'line',
                            source: 'maneuver-arrow',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round',
                                'visibility': 'none'
                            },
                            paint: {
                                'line-color': '#FFFFFF',
                                'line-width': [
                                    'interpolate',
                                    ['linear'],
                                    ['zoom'],
                                    12, 10,
                                    18, 14
                                ],
                                'line-opacity': 1.0
                            }
                        });

                        // Maneuver Turn Arrow Head Layer — simple white triangle with orange outline
                        map.current.addLayer({
                            id: 'maneuver-arrow-head',
                            type: 'symbol',
                            source: 'maneuver-arrow-head',
                            layout: {
                                'text-field': '▲',
                                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                                'text-size': [
                                    'interpolate',
                                    ['linear'],
                                    ['zoom'],
                                    14, 16,
                                    18, 24
                                ],
                                'text-rotate': ['get', 'bearing'],
                                'text-rotation-alignment': 'map',
                                'text-allow-overlap': true,
                                'text-ignore-placement': true,
                                'visibility': 'none',
                                'text-offset': [0, 0]
                            },
                            paint: {
                                'text-color': '#FFFFFF',
                                'text-halo-color': '#FF6B00',
                                'text-halo-width': 2.5
                            }
                        });
                    };

                    if (map.current?.loaded()) {
                        addRouteLayers();
                    } else {
                        map.current?.on('load', addRouteLayers);
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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1 min-w-0">
                            <div className="mr-5 text-white flex-shrink-0 flex items-center justify-center relative w-12 h-12 bg-zinc-900/50 rounded-2xl border border-[#D4AF37]/30 shadow-[inset_0_0_15px_rgba(212,175,55,0.1)]">
                                 {instruction?.modifier.includes('left') ? (
                                    <i className="fas fa-arrow-up rotate-[-90deg] text-3xl text-[#FF6B00] drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]"></i>
                                ) : instruction?.modifier.includes('right') ? (
                                    <i className="fas fa-arrow-up rotate-[90deg] text-3xl text-[#FF6B00] drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]"></i>
                                ) : (
                                    <i className="fas fa-arrow-up text-3xl text-[#FF6B00] drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]"></i>
                                )}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <h1 className="text-[#F5E6D3] text-3xl font-[900] leading-none tracking-tighter italic">
                                    {instruction?.distanceText || '0 M'}
                                </h1>
                                <p className="text-[#D4AF37] text-[10px] font-black leading-tight tracking-[0.25em] mt-1.5 line-clamp-1 opacity-90">
                                    {instruction?.roadName || 'SIGA EM FRENTE'}
                                </p>
                            </div>
                        </div>

                        {/* Audio & Voice Controls in the right corner */}
                        <div className="flex flex-col items-center space-y-2 ml-4 flex-shrink-0">
                            {/* Gender Toggle Button */}
                            <button 
                                onClick={() => {
                                    const nextGender = voiceGender === 'male' ? 'female' : 'male';
                                    setVoiceGender(nextGender);
                                    if (voiceEnabled) {
                                        setTimeout(() => {
                                            speak(nextGender === 'male' ? 'Voz masculina selecionada' : 'Voz feminina selecionada', 1, false);
                                        }, 100);
                                    }
                                }}
                                className="w-10 h-10 rounded-full flex flex-col items-center justify-center bg-white/5 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-white/10 transition-all font-black text-[9px] tracking-wide"
                                title="Alternar voz Masculina / Feminina"
                            >
                                <span className="leading-none text-[8px] text-[#F5E6D3]/60 mb-0.5 font-bold uppercase">Voz</span>
                                <span className="leading-none font-black">{voiceGender === 'male' ? 'MASC' : 'FEM'}</span>
                            </button>
                            {/* Speaker Button */}
                            <button 
                                onClick={() => {
                                    const nextEnabled = !voiceEnabled;
                                    setVoiceEnabled(nextEnabled);
                                    if (nextEnabled) {
                                        setTimeout(() => {
                                            speak('Navegação por voz ativada', 1, false);
                                        }, 100);
                                    }
                                }}
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

                {/* BOTÃO DE REPORTAR ERRO DE ROTA */}
                <button 
                    onClick={async () => {
                        if (!effectiveLocation || !destinationCoords || !driverId || !missionId) {
                            alert("Não foi possível reportar o erro neste momento. Certifique-se de que a localização e a rota estão ativas.");
                            return;
                        }
                        
                        try {
                            playNotificationSound();
                            const breadcrumbsJson = JSON.stringify(gpsBreadcrumbs.current);
                            const enrichedComment = `[BREADCRUMBS_TELEMETRY]: ${breadcrumbsJson}\n[VEHICLE_TYPE]: ${vehicleType}\nComentário: Reportado pelo entregador via botão de pânico de rota`;

                            await reportRouteError({
                                driverId,
                                deliveryId: missionId,
                                driverLat: effectiveLocation.lat,
                                driverLng: effectiveLocation.lng,
                                destinationLat: destinationCoords.lat,
                                destinationLng: destinationCoords.lng,
                                currentInstruction: instruction?.fullText || '',
                                routeGeojson: { coordinates: routeCoordinates.current },
                                comment: enrichedComment
                            });
                            alert("Obrigado! A coordenada foi registrada e nossa equipe irá auditar este trecho no OpenStreetMap.");
                        } catch (e) {
                            console.error("Erro ao enviar relatório de rota:", e);
                            alert("Erro ao enviar relatório para o servidor. Tente novamente mais tarde.");
                        }
                    }}
                    className="w-14 h-14 rounded-full bg-zinc-950/90 border border-white/5 shadow-2xl flex items-center justify-center text-yellow-500 backdrop-blur-3xl active:scale-90 transition-all hover:bg-black group ring-1 ring-white/5 relative"
                    title="Reportar Erro de Navegação"
                >
                    <i className="fas fa-map-pin text-xl group-hover:scale-110 transition-transform"></i>
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
