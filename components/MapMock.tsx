import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsService, DirectionsRenderer, Circle, TrafficLayer } from '@react-google-maps/api';
import { DriverStatus } from '../types';

interface MapMockProps {
  status: string;
  showRoute?: boolean;
  theme?: 'dark' | 'light';
  showHeatMap?: boolean;
  mapMode?: 'standard' | 'satellite';
  showTraffic?: boolean;
  destinationAddress?: string | null;
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
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
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
  destinationAddress
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyBIttodmc3z2FrmG4rBFgD_Xct7UYt43es",
    language: 'pt-BR',
    libraries: LIBRARIES
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  // Determine Destination (Deprecated Mock Logic removed)
  // Now we rely on destinationAddress passed from parent or extracted from Directions

  // Reset destination if no address
  useEffect(() => {
    if (!destinationAddress) {
      setDestinationLocation(null);
      setDirectionsResponse(null);
      setDistance('');
      setDuration('');
    }
  }, [destinationAddress]);

  // Fit Bounds happens automatically with DirectionsRenderer or manual bounds
  useEffect(() => {
    if (map && currentLocation && !directionsResponse) {
      map.panTo(currentLocation);
      map.setZoom(16);
    }
  }, [map, currentLocation, directionsResponse]);


  // Styles & Options
  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    mapTypeId: mapMode === 'satellite' ? 'satellite' : 'roadmap',
    styles: (theme === 'dark' && mapMode !== 'satellite') ? darkMapStyle : []
  }), [theme, mapMode]);

  // Directions Callback
  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    if (status === 'OK' && result) {
      // Only update if checks pass to avoid infinite loop
      if (countRef.current === 0 || !directionsResponse) {
        setDirectionsResponse(result);

        if (result.routes[0]?.legs[0]) {
          setDistance(result.routes[0].legs[0].distance?.text || '');
          setDuration(result.routes[0].legs[0].duration?.text || '');

          // Set Marker Destination from Route Result
          if (result.routes[0].legs[0].end_location) {
            const endLoc = result.routes[0].legs[0].end_location;
            setDestinationLocation({ lat: endLoc.lat(), lng: endLoc.lng() });
          }
        }
      }
    } else {
      console.error(`Directions request failed due to ${status}`);
    }
  }, [directionsResponse]);

  // Reset count when route points change
  useEffect(() => {
    countRef.current = 0;
    setDirectionsResponse(null);
  }, [currentLocation?.lat, currentLocation?.lng, destinationLocation?.lat, destinationLocation?.lng]);


  // Heatmap Data (Mock Circles)
  const renderHeatmap = () => {
    if (!showHeatMap || !map || !currentLocation) return null;
    const items = [];
    const center = currentLocation;
    for (let i = 0; i < 5; i++) {
      const lat = center.lat + (Math.random() - 0.5) * 0.02;
      const lng = center.lng + (Math.random() - 0.5) * 0.02;
      items.push(
        <Circle
          key={`heat-${i}`}
          center={{ lat, lng }}
          radius={300 + Math.random() * 200}
          options={{
            strokeColor: 'transparent',
            fillColor: i % 2 === 0 ? '#FF6B00' : '#FFD700',
            fillOpacity: 0.3
          }}
        />
      );
    }
    return items;
  };

  if (!isLoaded) return <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">Carregando Mapa...</div>;

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentLocation || { lat: -23.5505, lng: -46.6333 }} // Default SP
        zoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* DRIVER MARKER */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={{
              url: '/cheetah-icon.png', // Local Asset (Cheetah)
              scaledSize: new google.maps.Size(60, 48),
              anchor: new google.maps.Point(30, 24)
            }}
            zIndex={2}
          />
        )}

        {/* DESTINATION MARKER */}
        {destinationLocation && (
          <Marker
            position={destinationLocation}
            icon={{
              url: (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE)
                ? 'https://cdn-icons-png.flaticon.com/512/3595/3595587.png' // Store
                : 'https://cdn-icons-png.flaticon.com/512/25/25694.png', // Home
              scaledSize: new google.maps.Size(40, 40)
            }}
            zIndex={1}
          />
        )}

        {/* REAL DIRECTIONS ROUTE */}
        {currentLocation && destinationAddress && showRoute && (
          <DirectionsService
            options={{
              destination: destinationAddress,
              origin: currentLocation,
              travelMode: 'DRIVING' as google.maps.TravelMode
            }}
            callback={directionsCallback}
          />
        )}

        {directionsResponse && (
          <DirectionsRenderer
            options={{
              directions: directionsResponse,
              suppressMarkers: true, // Use our custom markers
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
