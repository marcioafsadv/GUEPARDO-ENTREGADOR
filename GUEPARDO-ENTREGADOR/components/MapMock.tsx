
import React, { useEffect, useRef } from 'react';
import { DriverStatus } from '../types';

interface MapMockProps {
  status: string;
  showRoute?: boolean;
  theme?: 'dark' | 'light';
  showHeatMap?: boolean;
  mapMode?: 'standard' | 'satellite';
  showTraffic?: boolean;
}

export const MapMock: React.FC<MapMockProps> = ({ 
  status, 
  showRoute = false, 
  theme = 'dark',
  showHeatMap = false,
  mapMode = 'standard',
  showTraffic = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const heatMapLayerRef = useRef<any>(null); // LayerGroup for heat circles
  const trafficLayerRef = useRef<any>(null); // LayerGroup for traffic lines

  // Tile Provider URLs
  const getTileUrl = (t: string, mode: string) => {
    if (mode === 'satellite') {
       // Esri World Imagery (Satellite)
       return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    
    // Standard Mode (Dark or Voyager)
    return t === 'dark' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-23.5505, -46.6333], 15);

    tileLayerRef.current = L.tileLayer(getTileUrl(theme, mapMode), {
      maxZoom: 19
    }).addTo(mapRef.current);

    navigator.geolocation.getCurrentPosition((position) => {
      if (!mapRef.current) return;
      
      const { latitude, longitude } = position.coords;
      mapRef.current.setView([latitude, longitude], 16);
      
      const driverIcon = L.divIcon({
        className: 'driver-marker-icon',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-10 h-10 bg-[#FF6B00] rounded-full border-2 border-white flex items-center justify-center shadow-lg relative z-10">
              <i class="fas fa-motorcycle text-white text-sm"></i>
            </div>
            <div class="absolute w-12 h-12 bg-[#FF6B00] rounded-full opacity-30 animate-ping"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      driverMarkerRef.current = L.marker([latitude, longitude], { icon: driverIcon }).addTo(mapRef.current);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Base Tile Layer when theme or mode changes
  useEffect(() => {
    if (tileLayerRef.current && mapRef.current) {
      tileLayerRef.current.setUrl(getTileUrl(theme, mapMode));
    }
  }, [theme, mapMode]);

  // Handle Heatmap Visualization
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    
    // Clear existing heat layer
    if (heatMapLayerRef.current) {
      mapRef.current.removeLayer(heatMapLayerRef.current);
      heatMapLayerRef.current = null;
    }

    if (showHeatMap) {
      // Simulate High Demand Zones with Circles
      const center = mapRef.current.getCenter();
      const circles = [];
      
      // Create 5 random "hotspots" near the center
      for (let i = 0; i < 5; i++) {
        const lat = center.lat + (Math.random() - 0.5) * 0.02;
        const lng = center.lng + (Math.random() - 0.5) * 0.02;
        
        circles.push(
           L.circle([lat, lng], {
             color: 'transparent',
             fillColor: '#FF6B00',
             fillOpacity: 0.3,
             radius: 300 + Math.random() * 200
           })
        );
         circles.push(
           L.circle([lat, lng], {
             color: 'transparent',
             fillColor: '#FFD700',
             fillOpacity: 0.4,
             radius: 100 + Math.random() * 50
           })
        );
      }
      
      heatMapLayerRef.current = L.layerGroup(circles).addTo(mapRef.current);
    }
  }, [showHeatMap, mapRef.current]);

  // Handle Traffic Visualization
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    
    // Clear existing traffic layer
    if (trafficLayerRef.current) {
      mapRef.current.removeLayer(trafficLayerRef.current);
      trafficLayerRef.current = null;
    }

    if (showTraffic) {
      // Simulate Traffic with Polylines (Mocking congested streets)
      const center = mapRef.current.getCenter();
      const lines = [];

      // Create random "streets"
      for(let i=0; i<8; i++) {
         const startLat = center.lat + (Math.random() - 0.5) * 0.03;
         const startLng = center.lng + (Math.random() - 0.5) * 0.03;
         const endLat = startLat + (Math.random() - 0.5) * 0.01;
         const endLng = startLng + (Math.random() - 0.5) * 0.01;

         lines.push(
            L.polyline([[startLat, startLng], [endLat, endLng]], {
               color: 'red',
               weight: 5,
               opacity: 0.6,
               smoothFactor: 1
            })
         );
      }

      trafficLayerRef.current = L.layerGroup(lines).addTo(mapRef.current);
    }
  }, [showTraffic, mapRef.current]);


  // Handle Route and Markers Logic (Existing)
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (destinationMarkerRef.current) {
      mapRef.current.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

    if (showRoute) {
      navigator.geolocation.getCurrentPosition((pos) => {
        if (!mapRef.current) return;
        
        const { latitude, longitude } = pos.coords;
        let destCoords: [number, number];
        let iconHtml = '';
        
        if (status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE) {
          destCoords = [latitude + 0.005, longitude + 0.005];
          iconHtml = `
            <div class="w-10 h-10 bg-white rounded-full border-4 border-[#FF6B00] flex items-center justify-center shadow-lg">
              <i class="fas fa-store text-[#FF6B00]"></i>
            </div>
          `;
        } else {
          destCoords = [latitude - 0.003, longitude - 0.003];
          iconHtml = `
            <div class="w-10 h-10 bg-[#FFD700] rounded-full border-4 border-white flex items-center justify-center shadow-lg">
              <i class="fas fa-home text-black"></i>
            </div>
          `;
        }

        const destIcon = L.divIcon({
          className: 'dest-marker-icon',
          html: iconHtml,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        destinationMarkerRef.current = L.marker(destCoords, { icon: destIcon }).addTo(mapRef.current);
        
        const markers = [];
        if (driverMarkerRef.current) markers.push(driverMarkerRef.current);
        if (destinationMarkerRef.current) markers.push(destinationMarkerRef.current);
        
        if (markers.length > 0) {
          const group = L.featureGroup(markers);
          mapRef.current.fitBounds(group.getBounds(), { padding: [100, 100] });
        }
      });
    } else {
       if (driverMarkerRef.current && mapRef.current) {
         mapRef.current.setView(driverMarkerRef.current.getLatLng(), 16);
       }
    }
  }, [status, showRoute]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="leaflet-vignette absolute inset-0 pointer-events-none"></div>
    </div>
  );
};
