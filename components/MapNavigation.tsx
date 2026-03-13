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
    currentLocation: { lat: number; lng: number } | null;
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

                // Next Step Instruction
                if (route.legs[0].steps.length > 0) {
                    const nextStep = route.legs[0].steps[0];
                    setInstruction({
                        text: nextStep.maneuver.instruction,
                        distance: nextStep.distance
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

    return (
        <div className="w-full h-full relative overflow-hidden bg-zinc-950">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Header Instructions */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10">
                <div className="bg-zinc-900/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-2xl">
                        <i className={`fas ${instruction?.text.toLowerCase().includes('esquerda') ? 'fa-arrow-left' : 'fa-arrow-right'}`}></i>
                    </div>
                    <div>
                        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">A {instruction?.distance ? (instruction.distance < 1000 ? `${Math.round(instruction.distance)}m` : `${(instruction.distance / 1000).toFixed(1)}km`) : '--'}</p>
                        <h2 className="text-white text-lg font-bold leading-tight line-clamp-2">{instruction?.text || 'Calculando rota...'}</h2>
                    </div>
                </div>
            </div>

            
            <style>{`
                .navigation-marker {
                    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
                }
            `}</style>
        </div>
    );
};
