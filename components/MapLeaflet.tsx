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

interface MapLeafletProps {
    status: string;
    showRoute?: boolean;
    theme?: 'dark' | 'light';
    showHeatMap?: boolean;
    mapMode?: 'standard' | 'satellite';
    showTraffic?: boolean;
    destinationAddress?: string | null;
    pickupAddress?: string | null;
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
    iconAnchor: [30, 24],
});

const storeIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3595/3595587.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

const destIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
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

export const MapLeaflet: React.FC<MapLeafletProps> = ({
    status,
    showRoute = false,
    theme = 'dark',
    showHeatMap = false,
    mapMode = 'standard',
    showTraffic = false,
    destinationAddress,
    pickupAddress,
    reCenterTrigger
}) => {
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [route, setRoute] = useState<[number, number][] | null>(null);

    // Sync Location
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

    // Geocoding helper
    const geocode = async (address: string) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
        } catch (e) {
            console.error("Geocoding Error:", e);
        }
        return null;
    };

    // Geocode addresses
    useEffect(() => {
        const performGeocoding = async () => {
            if (destinationAddress) {
                const loc = await geocode(destinationAddress);
                if (loc) setDestinationLocation(loc);
            } else {
                setDestinationLocation(null);
            }

            if (pickupAddress) {
                const loc = await geocode(pickupAddress);
                if (loc) setPickupLocation(loc);
            } else {
                setPickupLocation(null);
            }
        };
        performGeocoding();
    }, [destinationAddress, pickupAddress]);

    // OSRM Routing
    useEffect(() => {
        if (!currentLocation) return;

        const fetchRoute = async () => {
            const start = [currentLocation.lng, currentLocation.lat];
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

            try {
                const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end.lng},${end.lat}?overview=full&geometries=geojson`);
                const data = await res.json();
                if (data.routes && data.routes.length > 0) {
                    const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
                    setRoute(coords);
                }
            } catch (e) {
                console.error("OSRM Error:", e);
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

    const tileUrl = theme === 'dark' || mapMode === 'satellite'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

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
                <TileLayer url={tileUrl} attribution='&copy; OpenStreetMap' />
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
                            opacity: 0.8
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
