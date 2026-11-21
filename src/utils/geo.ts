import exifr from 'exifr';
import { GeoLocationData } from '../types/civiclens';

export const DEFAULT_CITY_CENTER = {
  latitude: 12.9716,
  longitude: 77.5946,
};

export async function extractExifLocation(file: File): Promise<GeoLocationData | null> {
  try {
    const gps = await exifr.gps(file);
    if (
      gps &&
      typeof gps.latitude === 'number' &&
      typeof gps.longitude === 'number' &&
      !Number.isNaN(gps.latitude) &&
      !Number.isNaN(gps.longitude)
    ) {
      return {
        latitude: Number(gps.latitude.toFixed(6)),
        longitude: Number(gps.longitude.toFixed(6)),
        accuracy_m: 8,
        source: 'exif',
        address_label: `Photo EXIF (${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)})`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function detectBrowserLocation(): Promise<GeoLocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser geolocation is not supported on this device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy_m: Math.round(position.coords.accuracy || 20),
          source: 'browser_gps',
          address_label: `Device GPS (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
        });
      },
      (error) => {
        reject(new Error(error.message || 'Unable to retrieve device GPS coordinates.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      }
    );
  });
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
