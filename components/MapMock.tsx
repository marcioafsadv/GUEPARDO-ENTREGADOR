import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsService, DirectionsRenderer, TrafficLayer, Circle } from '@react-google-maps/api';
import { DriverStatus } from '../types';

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

const containerStyle = {
  width: '100%',
  height: '100%'
};

const LIBRARIES: ("places" | "geometry")[] = ["geometry"];

// --- MAP STYLES ---
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  }
];

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
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    language: 'pt-BR',
    libraries: LIBRARIES
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Directions State
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  // Prevent infinite loop in callback
  const countRef = useRef(0);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

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

  // Reset states when addresses change
  useEffect(() => {
    if (!destinationAddress && !pickupAddress) {
      setDestinationLocation(null);
      setPickupLocation(null);
      setDirectionsResponse(null);
      setDistance('');
      setDuration('');
      setIsUserInteracting(false);
    }
  }, [destinationAddress, pickupAddress]);

  // Handle auto-panning with interaction check
  useEffect(() => {
    if (map && currentLocation && !directionsResponse && !isUserInteracting) {
      map.panTo(currentLocation);
      map.setZoom(16);
    }
  }, [map, currentLocation, directionsResponse, isUserInteracting]);

  // Global Re-center Trigger (from Sidebar Button)
  useEffect(() => {
    if (reCenterTrigger && map && currentLocation) {
      console.log("Global re-center triggered");
      setIsUserInteracting(false);
      map.panTo(currentLocation);
      map.setZoom(16);
    }
  }, [reCenterTrigger]);

  // Styles & Options
  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    mapTypeId: mapMode === 'satellite' ? 'satellite' : 'roadmap',
    styles: (theme === 'dark' && mapMode !== 'satellite') ? darkMapStyle : []
  }), [theme, mapMode]);

  // Directions Callback
  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    if (status === 'OK' && result) {
      if (countRef.current === 0 || !directionsResponse) {
        setDirectionsResponse(result);

        if (result.routes[0]?.legs) {
          // Sum up total stats if multiple legs
          let totalDist = 0;
          let totalDur = 0;
          result.routes[0].legs.forEach(leg => {
            totalDist += leg.distance?.value || 0;
            totalDur += leg.duration?.value || 0;
          });

          setDistance(`${(totalDist / 1000).toFixed(1)} km`);
          setDuration(`${Math.ceil(totalDur / 60)} min`);

          // Extract locations for markers
          const legs = result.routes[0].legs;
          if (legs.length > 0) {
            const lastLegEnd = legs[legs.length - 1].end_location;
            setDestinationLocation({ lat: lastLegEnd.lat(), lng: lastLegEnd.lng() });

            if (legs.length > 1) {
              const firstLegEnd = legs[0].end_location;
              setPickupLocation({ lat: firstLegEnd.lat(), lng: firstLegEnd.lng() });
            }
          }
        }
      }
    }
  }, [directionsResponse]);

  // Reset count when route points change
  useEffect(() => {
    countRef.current = 0;
    setDirectionsResponse(null);
  }, [currentLocation?.lat, currentLocation?.lng, destinationLocation?.lat, destinationLocation?.lng, pickupLocation?.lat, pickupLocation?.lng, destinationAddress, pickupAddress]);

  // Heatmap Data (Stabilized Mock Circles)
  const heatmapItems = useMemo(() => {
    if (!showHeatMap || !currentLocation) return [];

    // Stabilize by rounding coordinates to avoid flickering on micro-movements
    const stableLat = Math.round(currentLocation.lat * 1000) / 1000;
    const stableLng = Math.round(currentLocation.lng * 1000) / 1000;

    // Use a deterministic seed based on stable location
    const seed = stableLat + stableLng;
    const pseudoRandom = (n: number) => {
      const x = Math.sin(seed + n) * 10000;
      return x - Math.floor(x);
    };

    const items = [];
    for (let i = 0; i < 5; i++) {
      const lat = stableLat + (pseudoRandom(i) - 0.5) * 0.02;
      const lng = stableLng + (pseudoRandom(i + 10) - 0.5) * 0.02;
      items.push({
        id: `heat-${i}`,
        center: { lat, lng },
        radius: 300 + pseudoRandom(i + 20) * 200,
        fillColor: i % 2 === 0 ? '#FF6B00' : '#FFD700'
      });
    }
    return items;
  }, [showHeatMap, currentLocation?.lat, currentLocation?.lng]);

  const renderHeatmap = () => {
    return heatmapItems.map(item => (
      <Circle
        key={item.id}
        center={item.center}
        radius={item.radius}
        options={{
          strokeColor: 'transparent',
          fillColor: item.fillColor,
          fillOpacity: 0.3
        }}
      />
    ));
  };

  // Initial center state to avoid snapping when currentLocation updates
  const [initialCenter] = useState(currentLocation || { lat: -23.5505, lng: -46.6333 });

  // Interaction Handlers
  const handleInteraction = useCallback(() => {
    if (!isUserInteracting) {
      console.log("Map interaction detected - stopping auto-centering");
      setIsUserInteracting(true);
    }
  }, [isUserInteracting]);

  if (!isLoaded) return <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">Carregando Mapa...</div>;

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        // Use initialCenter to avoid snapping back when currentLocation updates
        center={initialCenter}
        zoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
        onDragStart={handleInteraction}
        onDrag={handleInteraction}
        onMouseDown={handleInteraction}
        onZoomChanged={() => {
          if (map) handleInteraction();
        }}
      >
        {/* DRIVER MARKER */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={{
              url: '/cheetah-icon.png',
              scaledSize: new google.maps.Size(60, 48),
              anchor: new google.maps.Point(30, 24)
            }}
            zIndex={10}
          />
        )}

        {/* PICKUP MARKER */}
        {pickupLocation && (
          <Marker
            position={pickupLocation}
            icon={{
              url: 'https://cdn-icons-png.flaticon.com/512/3595/3595587.png', // Store
              scaledSize: new google.maps.Size(40, 40)
            }}
            zIndex={5}
          />
        )}

        {/* DESTINATION MARKER */}
        {destinationLocation && (
          <Marker
            position={destinationLocation}
            icon={{
              url: 'https://cdn-icons-png.flaticon.com/512/25/25694.png', // Home
              scaledSize: new google.maps.Size(40, 40)
            }}
            zIndex={5}
          />
        )}

        {/* REAL DIRECTIONS ROUTE */}
        {currentLocation && (destinationAddress || pickupAddress) && showRoute && (
          <DirectionsService
            options={{
              origin: currentLocation,
              destination: destinationAddress || pickupAddress || currentLocation,
              waypoints: (pickupAddress && destinationAddress) ? [
                { location: pickupAddress, stopover: true }
              ] : [],
              travelMode: 'DRIVING' as google.maps.TravelMode
            }}
            callback={directionsCallback}
          />
        )}

        {directionsResponse && (
          <DirectionsRenderer
            options={{
              directions: directionsResponse,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#FF6B00',
                strokeOpacity: 0.8,
                strokeWeight: 6
              }
            }}
          />
        )}

        {/* TRAFFIC */}
        {showTraffic && <TrafficLayer />}

        {/* HEATMAP */}
        {renderHeatmap()}

      </GoogleMap>

      {/* NAVIGATION INFO OVERLAY */}
      {directionsResponse && (distance || duration) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-xl flex items-center gap-4 z-10 animate-in slide-in-from-top-4 duration-500">
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
