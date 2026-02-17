import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, Circle, TrafficLayer } from '@react-google-maps/api';
import { DriverStatus } from '../types';

interface MapMockProps {
  status: string;
  showRoute?: boolean;
  theme?: 'dark' | 'light';
  showHeatMap?: boolean;
  mapMode?: 'standard' | 'satellite';
  showTraffic?: boolean;
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
  showTraffic = false
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyBIttodmc3z2FrmG4rBFgD_Xct7UYt43es",
    libraries: LIBRARIES
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  // Determine Destination
  useEffect(() => {
    if (showRoute && currentLocation) {
      if (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE) {
        setDestinationLocation({ lat: currentLocation.lat + 0.005, lng: currentLocation.lng + 0.005 });
      } else {
        setDestinationLocation({ lat: currentLocation.lat - 0.003, lng: currentLocation.lng - 0.003 });
      }
    } else {
      setDestinationLocation(null);
    }
  }, [showRoute, status, currentLocation]);

  // Fit Bounds
  useEffect(() => {
    if (map && currentLocation) {
      if (destinationLocation) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(currentLocation);
        bounds.extend(destinationLocation);
        map.fitBounds(bounds, 50);
      } else {
        map.panTo(currentLocation);
        map.setZoom(16);
      }
    }
  }, [map, currentLocation, destinationLocation]);


  // Styles & Options
  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    mapTypeId: mapMode === 'satellite' ? 'satellite' : 'roadmap',
    styles: (theme === 'dark' && mapMode !== 'satellite') ? darkMapStyle : []
  }), [theme, mapMode]);

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
            url: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png', // Motorcycle Icon (or use local asset)
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20)
          }}
        />
      )}

      {/* DESTINATION MARKER */}
      {destinationLocation && (
        <Marker
          position={destinationLocation}
          icon={{
            // Store or Home based on status logic (simplified here)
            url: (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE)
              ? 'https://cdn-icons-png.flaticon.com/512/3595/3595587.png' // Store
              : 'https://cdn-icons-png.flaticon.com/512/25/25694.png', // Home
            scaledSize: new google.maps.Size(40, 40)
          }}
        />
      )}

      {/* ROUTE */}
      {currentLocation && destinationLocation && (
        <Polyline
          path={[currentLocation, destinationLocation]}
          options={{
            strokeColor: '#FF6B00',
            strokeOpacity: 0.8,
            strokeWeight: 6,
            geodesic: true,
          }}
        />
      )}

      {/* TRAFFIC */}
      {showTraffic && <TrafficLayer />}

      {/* HEATMAP */}
      {renderHeatmap()}

    </GoogleMap>
  );
};
