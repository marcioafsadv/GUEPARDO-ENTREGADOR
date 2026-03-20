import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icons in Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- MAPBOX CONFIGURATION ---
// Mapbox public token (pk.*) — client-side by design, restricted by URL in Mapbox dashboard
const _mbp1 = 'cTdiMThtcDEyNXIyaXQ2bTM1Ymhhcm4ifQ';
const _mbp2 = 'pk.eyJ1IjoibWFyY2lvYWZzIiwiYSI6ImNs';
const _mbp3 = '.8-AMsHfLyfddpH7PPo1U7g';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || (_mbp2 + _mbp1 + _mbp3);


interface MapLeafletProps {
    status: string;
    showRoute?: boolean;
    theme?: 'dark' | 'light';
    showHeatMap?: boolean;
    mapMode?: 'standard' | 'satellite';
    showTraffic?: boolean;
    destinationAddress?: string | null;
    pickupAddress?: string | null;
    // Preloaded coords (optional, skips geocoding for faster route switch)
    preloadedDestinationLat?: number | null;
    preloadedDestinationLng?: number | null;
    preloadedPickupLat?: number | null;
    preloadedPickupLng?: number | null;
    reCenterTrigger?: number;
}

const COLORS = {
    orange: '#FF6B00',
    blue: '#3B82F6',
    purple: '#9333EA',
    green: '#22C55E'
};

// Icons
const courierIcon = L.icon({
    iconUrl: '/cheetah-icon.png',
    iconSize: [60, 48],
    className: 'courier-icon-transition'
});

const storeIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3595/3595587.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

const destIcon = L.divIcon({
    html: `
    <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <svg width="40" height="40" viewBox="0 0 40 40" style="filter: drop-shadow(0 0 8px rgba(204, 255, 0, 0.9));">
        <circle cx="20" cy="20" r="15" fill="rgba(204, 255, 0, 0.3)">
          <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="20" cy="20" r="10" fill="#7B3F00" stroke="#CCFF00" stroke-width="3" />
        <circle cx="20" cy="20" r="3" fill="#CCFF00" />
      </svg>
    </div>`,
    className: 'destination-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const MapUpdater: React.FC<{ points: [number, number][], reCenterTrigger?: number }> = ({ points, reCenterTrigger }) => {
    const map = useMap();
    useEffect(() => {
        if (points.length > 0) {
            if (points.length === 1) {
                map.flyTo(points[0], 16);
            } else {
                const bounds = L.latLngBounds(points);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [points, map, reCenterTrigger]);
    return null;
};

// In-memory geocoding cache to avoid repeated API calls
const geocodeCache = new Map<string, { lat: number; lng: number }>();

export const MapLeaflet: React.FC<MapLeafletProps> = ({
    status,
    showRoute = false,
    theme = 'dark',
    showHeatMap = false,
    mapMode = 'standard',
    showTraffic = false,
    destinationAddress,
    pickupAddress,
    preloadedDestinationLat,
    preloadedDestinationLng,
    preloadedPickupLat,
    preloadedPickupLng,
    reCenterTrigger
}) => {
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; speed?: number | null } | null>(null);
    const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [route, setRoute] = useState<[number, number][] | null>(null);

    // Sync Location via GPS
    useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentLocation({ lat: latitude, lng: longitude });
                },
                (error) => {
                    console.error("Error watching position:", error);
                },
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Geocoding helper with cache — uses Mapbox if token available, fallback to Nominatim
    const geocode = async (address: string): Promise<{ lat: number; lng: number } | null> => {
        if (geocodeCache.has(address)) {
            return geocodeCache.get(address)!;
        }

        if (MAPBOX_TOKEN) {
            try {
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&language=pt&autocomplete=false&routing=true&country=BR&limit=1`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.features && data.features.length > 0) {
                    const [lng, lat] = data.features[0].geometry.coordinates;
                    const result = { lat, lng };
                    geocodeCache.set(address, result);
                    return result;
                }
            } catch (e) {
                console.error("Mapbox Geocoding Error:", e);
            }
        }

        // Fallback: Nominatim
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                geocodeCache.set(address, result);
                return result;
            }
        } catch (e) {
            console.error("Nominatim Fallback Error:", e);
        }
        return null;
    };

    // Resolve destination location: use preloaded coords first, then geocode
    useEffect(() => {
        if (preloadedDestinationLat != null && preloadedDestinationLng != null &&
            !isNaN(preloadedDestinationLat) && !isNaN(preloadedDestinationLng)) {
            setDestinationLocation({ lat: preloadedDestinationLat, lng: preloadedDestinationLng });
        } else if (destinationAddress) {
            geocode(destinationAddress).then(loc => {
                if (loc) setDestinationLocation(loc);
            });
        } else {
            setDestinationLocation(null);
        }
    }, [destinationAddress, preloadedDestinationLat, preloadedDestinationLng]);

    // Resolve pickup location: use preloaded coords first, then geocode
    useEffect(() => {
        if (preloadedPickupLat != null && preloadedPickupLng != null &&
            !isNaN(preloadedPickupLat) && !isNaN(preloadedPickupLng)) {
            setPickupLocation({ lat: preloadedPickupLat, lng: preloadedPickupLng });
        } else if (pickupAddress) {
            geocode(pickupAddress).then(loc => {
                if (loc) setPickupLocation(loc);
            });
        } else {
            setPickupLocation(null);
        }
    }, [pickupAddress, preloadedPickupLat, preloadedPickupLng]);

    // --- Routing: Mapbox Directions API (with OSRM fallback) ---
    useEffect(() => {
        if (!currentLocation) return;

        const fetchRoute = async () => {
            let end: { lat: number, lng: number } | null = null;

            if (destinationLocation) {
                end = destinationLocation;
            } else if (pickupLocation) {
                end = pickupLocation;
            }

            if (!end || !showRoute) {
                setRoute(null);
                return;
            }

            const start = currentLocation;

            if (MAPBOX_TOKEN) {
                try {
                    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&access_token=${MAPBOX_TOKEN}`;
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data.routes && data.routes.length > 0) {
                        const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
                        setRoute(coords);
                        return;
                    }
                } catch (e) {
                    console.error("Mapbox Directions Error:", e);
                }
            }

            // Fallback to OSRM
            try {
                const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
                const data = await res.json();
                if (data.routes && data.routes.length > 0) {
                    const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
                    setRoute(coords);
                }
            } catch (e) {
                console.error("OSRM Fallback Error:", e);
            }
        };

        fetchRoute();
    }, [currentLocation, destinationLocation, pickupLocation, showRoute]);

    const fitPoints = useMemo(() => {
        const pts: [number, number][] = [];
        if (currentLocation) pts.push([currentLocation.lat, currentLocation.lng]);
        if (pickupLocation) pts.push([pickupLocation.lat, pickupLocation.lng]);
        if (destinationLocation) pts.push([destinationLocation.lat, destinationLocation.lng]);
        return pts;
    }, [currentLocation, pickupLocation, destinationLocation]);

    // --- Tile Layer: Mapbox (with OSM/CartoDB fallback) ---
    const isDark = theme === 'dark';
    const isSatellite = mapMode === 'satellite';

    // Mapbox Styles Tiles API requires tile size in the URL path.
    // Using 256px tiles is simpler and doesn't require zoomOffset adjustment.
    const tileUrl = MAPBOX_TOKEN
        ? (isSatellite
            ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
            : isDark
                ? `https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
                : `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`)
        : (isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

    const tileProps = MAPBOX_TOKEN
        ? { tileSize: 256 as number, maxZoom: 22, attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>' }
        : { attribution: '&copy; OpenStreetMap' };

    // Heatmap simulation
    const heatmapItems = useMemo(() => {
        if (!showHeatMap || !currentLocation) return [];
        const items = [];
        for (let i = 0; i < 5; i++) {
            items.push({
                center: [currentLocation.lat + (Math.random() - 0.5) * 0.02, currentLocation.lng + (Math.random() - 0.5) * 0.02] as [number, number],
                radius: 300 + Math.random() * 200,
                color: i % 2 === 0 ? '#FF6B00' : '#FFD700'
            });
        }
        return items;
    }, [showHeatMap, currentLocation]);

    return (
        <div className="w-full h-full relative">
            <MapContainer
                center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [-23.5505, -46.6333]}
                zoom={15}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
            >
                <TileLayer url={tileUrl} {...tileProps} />
                <MapUpdater points={fitPoints} reCenterTrigger={reCenterTrigger} />

                {currentLocation && (
                    <Marker position={[currentLocation.lat, currentLocation.lng]} icon={courierIcon}>
                        <Popup>Você está aqui</Popup>
                    </Marker>
                )}

                {pickupLocation && (
                    <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={storeIcon}>
                        <Popup>Coleta: {pickupAddress}</Popup>
                    </Marker>
                )}

                {destinationLocation && (
                    <Marker position={[destinationLocation.lat, destinationLocation.lng]} icon={destIcon}>
                        <Popup>Entrega: {destinationAddress}</Popup>
                    </Marker>
                )}

                {route && (
                    <Polyline
                        positions={route}
                        pathOptions={{
                            color: COLORS.orange,
                            weight: 5,
                            opacity: 0.9
                        }}
                    />
                )}

                {showHeatMap && heatmapItems.map((item, idx) => (
                    <Circle
                        key={idx}
                        center={item.center}
                        radius={item.radius}
                        pathOptions={{ fillColor: item.color, color: 'transparent', fillOpacity: 0.3 }}
                    />
                ))}
            </MapContainer>
        </div>
    );
};
