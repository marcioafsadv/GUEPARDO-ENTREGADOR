import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DriverStatus } from '../types';

// Fix for default Leaflet marker icons in Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const storeIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3595/3595587.png', // Store
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const clientIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png', // Home
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const cheetahIcon = L.icon({
  iconUrl: '/cheetah-icon.png',
  iconSize: [60, 48],
  iconAnchor: [30, 24],
});

interface MapMockProps {
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

const MapController: React.FC<{
  currentLocation: { lat: number; lng: number } | null;
  reCenterTrigger?: number;
  isUserInteracting: boolean;
}> = ({ currentLocation, reCenterTrigger, isUserInteracting }) => {
  const map = useMap();
  const prevRecenterRef = useRef<number>(0);

  useEffect(() => {
    if (currentLocation && !isUserInteracting) {
      map.panTo([currentLocation.lat, currentLocation.lng]);
    }
  }, [currentLocation, map, isUserInteracting]);

  useEffect(() => {
    if (reCenterTrigger && reCenterTrigger > prevRecenterRef.current && currentLocation) {
      prevRecenterRef.current = reCenterTrigger;
      map.flyTo([currentLocation.lat, currentLocation.lng], 16);
    }
  }, [reCenterTrigger, currentLocation, map]);

  return null;
};

export const MapMock: React.FC<MapMockProps> = ({
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
  const [routePolyline, setRoutePolyline] = useState<[number, number][] | null>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

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

  const geocodeAddress = async (address: string) => {
    if (!address) return null;
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await resp.json();
      if (data && data[0]) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.error("Geocoding error", e);
    }
    return null;
  };

  const calculateRoute = async (points: { lat: number; lng: number }[]) => {
    if (points.length < 2) return null;
    try {
      const query = points.map(p => `${p.lng},${p.lat}`).join(';');
      const resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${query}?overview=full&geometries=geojson`);
      const data = await resp.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        return {
          coords,
          distance: route.distance,
          duration: route.duration
        };
      }
    } catch (e) {
      console.error("Routing error", e);
    }
    return null;
  };

  useEffect(() => {
    const processRoute = async () => {
      if (!showRoute || !currentLocation) {
        setRoutePolyline(null);
        setDistance('');
        setDuration('');
        return;
      }

      const points = [currentLocation];
      let pLoc = null;
      let dLoc = null;

      if (pickupAddress) {
        pLoc = await geocodeAddress(pickupAddress);
        if (pLoc) {
          points.push(pLoc);
          setPickupLocation(pLoc);
        }
      } else {
        setPickupLocation(null);
      }

      if (destinationAddress) {
        dLoc = await geocodeAddress(destinationAddress);
        if (dLoc) {
          points.push(dLoc);
          setDestinationLocation(dLoc);
        }
      } else {
        setDestinationLocation(null);
      }

      if (points.length >= 2) {
        const routeData = await calculateRoute(points);
        if (routeData) {
          setRoutePolyline(routeData.coords);
          setDistance(`${(routeData.distance / 1000).toFixed(1)} km`);
          setDuration(`${Math.ceil(routeData.duration / 60)} min`);
        }
      }
    };

    processRoute();
  }, [currentLocation?.lat, currentLocation?.lng, destinationAddress, pickupAddress, showRoute]);

  // Heatmap Logic
  const heatmapItems = useMemo(() => {
    if (!showHeatMap || !currentLocation) return [];
    const seed = currentLocation.lat + currentLocation.lng;
    const pseudoRandom = (n: number) => Math.abs(Math.sin(seed + n));
    const items = [];
    for (let i = 0; i < 5; i++) {
      items.push({
        id: `heat-${i}`,
        center: {
          lat: currentLocation.lat + (pseudoRandom(i) - 0.5) * 0.02,
          lng: currentLocation.lng + (pseudoRandom(i + 10) - 0.5) * 0.02
        },
        radius: 300 + pseudoRandom(i + 20) * 200,
        color: i % 2 === 0 ? '#FF6B00' : '#FFD700'
      });
    }
    return items;
  }, [showHeatMap, currentLocation?.lat, currentLocation?.lng]);

  const tileUrl = mapMode === 'satellite'
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = mapMode === 'satellite'
    ? 'Esri'
    : '&copy; OpenStreetMap & CARTO';

  return (
    <div className="relative w-full h-full bg-gray-900">
      <MapContainer
        center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [-23.55, -46.63]}
        zoom={15}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        whenReady={() => setIsUserInteracting(false)}
      >
        <TileLayer url={tileUrl} attribution={attribution} />

        <MapController
          currentLocation={currentLocation}
          reCenterTrigger={reCenterTrigger}
          isUserInteracting={isUserInteracting}
        />

        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={cheetahIcon} />
        )}

        {pickupLocation && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={storeIcon} />
        )}

        {destinationLocation && (
          <Marker position={[destinationLocation.lat, destinationLocation.lng]} icon={clientIcon} />
        )}

        {routePolyline && (
          <Polyline
            positions={routePolyline}
            pathOptions={{ color: '#FF6B00', weight: 6, opacity: 0.8 }}
          />
        )}

        {heatmapItems.map(item => (
          <Circle
            key={item.id}
            center={[item.center.lat, item.center.lng]}
            radius={item.radius}
            pathOptions={{ fillColor: item.color, fillOpacity: 0.3, stroke: false }}
          />
        ))}
      </MapContainer>

      {routePolyline && (distance || duration) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-xl flex items-center gap-4 z-[1000] animate-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tempo</span>
            <span className="text-xl font-black text-white">{duration}</span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Distância</span>
            <span className="text-xl font-black text-orange-500">{distance}</span>
          </div>
        </div>
      )}
    </div>
  );
};
