import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeoLocationData, HotspotCluster, Ticket, TicketSeverity } from '../../types/civiclens';
import { CATEGORY_LABELS } from '../../data/seedData';

const SEVERITY_COLORS: Record<TicketSeverity, string> = {
  critical: '#DC2626',
  high: '#C2410C',
  medium: '#D97706',
  low: '#475569',
};

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; OpenStreetMap contributors';

interface LocationPickerMapProps {
  location: GeoLocationData;
  onSelectLocation: (coords: { latitude: number; longitude: number }) => void;
  heightClass?: string;
}

export function LocationPickerMap({
  location,
  onSelectLocation,
  heightClass = 'h-72',
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const onSelectRef = useRef(onSelectLocation);
  onSelectRef.current = onSelectLocation;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [location.latitude, location.longitude],
      zoom: 15,
      scrollWheelZoom: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 19,
    }).addTo(map);

    const accuracyCircle = L.circle([location.latitude, location.longitude], {
      radius: Math.max(12, Math.min(location.accuracy_m, 250)),
      color: '#1D4ED8',
      fillColor: '#3B82F6',
      fillOpacity: 0.12,
      weight: 1,
    }).addTo(map);

    const marker = L.circleMarker([location.latitude, location.longitude], {
      radius: 9,
      color: '#FFFFFF',
      weight: 2.5,
      fillColor: '#1D4ED8',
      fillOpacity: 1,
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      onSelectRef.current({
        latitude: Number(e.latlng.lat.toFixed(6)),
        longitude: Number(e.latlng.lng.toFixed(6)),
      });
    });

    mapRef.current = map;
    markerRef.current = marker;
    accuracyCircleRef.current = accuracyCircle;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      accuracyCircleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !accuracyCircleRef.current) return;
    const latLng: L.LatLngExpression = [location.latitude, location.longitude];
    markerRef.current.setLatLng(latLng);
    accuracyCircleRef.current.setLatLng(latLng);
    accuracyCircleRef.current.setRadius(Math.max(12, Math.min(location.accuracy_m, 250)));
    mapRef.current.panTo(latLng, { animate: true });
  }, [location.latitude, location.longitude, location.accuracy_m]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-lg border border-slate-200 overflow-hidden bg-slate-100`}
      aria-label="Interactive complaint location picker map"
    />
  );
}

interface OfficerOperationsMapProps {
  tickets: Ticket[];
  selectedTicketCode: string | null;
  onSelectTicket: (ticketCode: string) => void;
  heightClass?: string;
}

export function OfficerOperationsMap({
  tickets,
  selectedTicketCode,
  onSelectTicket,
  heightClass = 'h-[480px]',
}: OfficerOperationsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelectTicket);
  onSelectRef.current = onSelectTicket;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const centerLat = tickets[0]?.latitude ?? 12.9716;
    const centerLng = tickets[0]?.longitude ?? 77.5946;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: 14,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const selected = tickets.find((t) => t.ticket_code === selectedTicketCode);
    if (selected) {
      // Visualize 250m PostGIS duplicate search radius around focused ticket
      L.circle([selected.latitude, selected.longitude], {
        radius: 250,
        color: '#1D4ED8',
        dashArray: '4 4',
        weight: 1.5,
        fillColor: '#3B82F6',
        fillOpacity: 0.08,
      }).addTo(group);
      map.panTo([selected.latitude, selected.longitude], { animate: true });
    }

    for (const ticket of tickets) {
      const isSelected = ticket.ticket_code === selectedTicketCode;
      const color = SEVERITY_COLORS[ticket.severity];
      const marker = L.circleMarker([ticket.latitude, ticket.longitude], {
        radius: isSelected ? 11 : ticket.severity === 'critical' ? 9 : 7,
        color: isSelected ? '#0F172A' : '#FFFFFF',
        weight: isSelected ? 3 : 2,
        fillColor: color,
        fillOpacity: ticket.status === 'CLOSED' ? 0.45 : 0.92,
      });

      marker.bindTooltip(
        `<div style="font-size:12px;line-height:1.35">
          <strong>${ticket.ticket_code}</strong> · ${ticket.severity.toUpperCase()}<br/>
          ${CATEGORY_LABELS[ticket.category]} · ${ticket.status}<br/>
          <span>${ticket.location_label}</span>
        </div>`,
        { direction: 'top', offset: [0, -6] }
      );

      marker.on('click', () => {
        onSelectRef.current(ticket.ticket_code);
      });

      marker.addTo(group);
    }
  }, [tickets, selectedTicketCode]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-lg border border-slate-200 overflow-hidden bg-slate-100`}
      aria-label="Interactive officer operations map"
    />
  );
}

export function HotspotAnalyticsMap({
  hotspots,
  heightClass = 'h-80',
}: {
  hotspots: HotspotCluster[];
  heightClass?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const centerLat = hotspots[0]?.latitude ?? 12.9716;
    const centerLng = hotspots[0]?.longitude ?? 77.5946;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: 14,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    for (const hs of hotspots) {
      const hasHigh = hs.critical_or_high_count > 0;
      const color = hasHigh ? '#DC2626' : '#D97706';
      const circle = L.circle([hs.latitude, hs.longitude], {
        radius: 140 + hs.incident_count * 45,
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: Math.min(0.45, 0.16 + hs.incident_count * 0.06),
      });

      circle.bindTooltip(
        `<div style="font-size:12px;line-height:1.35">
          <strong>${hs.area_name}</strong><br/>
          Reports: ${hs.incident_count} · Critical/High: ${hs.critical_or_high_count}<br/>
          Dominant: ${CATEGORY_LABELS[hs.dominant_category]}
        </div>`
      );
      circle.addTo(group);
    }
  }, [hotspots]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-lg border border-slate-200 overflow-hidden bg-slate-100`}
      aria-label="Geographic complaint hotspots map"
    />
  );
}
