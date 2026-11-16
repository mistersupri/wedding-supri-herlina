import { describe, expect, it } from 'vitest';
import { distanceMeters, formatDistance, parseCoordinates } from '../../shared/geo.js';

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters({ lat: -6.2088, lng: 106.8456 }, { lat: -6.2088, lng: 106.8456 })).toBeCloseTo(0, 3);
  });

  it('matches known distances closely', () => {
    // One degree of latitude is about 111.2 km.
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeGreaterThan(111_000);
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeLessThan(111_400);
    // Monas to Bundaran HI is roughly 2 km.
    const d = distanceMeters({ lat: -6.1754, lng: 106.8272 }, { lat: -6.1951, lng: 106.8230 });
    expect(d).toBeGreaterThan(2000);
    expect(d).toBeLessThan(2400);
  });

  it('resolves tens of metres', () => {
    // 0.0005 degrees of latitude is about 55 m.
    const d = distanceMeters({ lat: -6.2, lng: 106.8 }, { lat: -6.2005, lng: 106.8 });
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(60);
  });
});

describe('parseCoordinates', () => {
  it('reads a plain pair in several separators', () => {
    expect(parseCoordinates('-6.2088, 106.8456')).toEqual({ lat: -6.2088, lng: 106.8456 });
    expect(parseCoordinates('-6.2088 106.8456')).toEqual({ lat: -6.2088, lng: 106.8456 });
    expect(parseCoordinates('  -6.2088;106.8456 ')).toEqual({ lat: -6.2088, lng: 106.8456 });
  });

  it('reads Google Maps links', () => {
    expect(parseCoordinates('https://www.google.com/maps/place/Monas/@-6.1753924,106.8271528,17z/data=abc')).toEqual({ lat: -6.1753924, lng: 106.8271528 });
    expect(parseCoordinates('https://www.google.com/maps/place/X/data=!3d-6.2!4d106.8!16s')).toEqual({ lat: -6.2, lng: 106.8 });
    expect(parseCoordinates('https://maps.google.com/?q=-6.2088,106.8456')).toEqual({ lat: -6.2088, lng: 106.8456 });
  });

  it('refuses things that hold no usable coordinates', () => {
    expect(parseCoordinates('https://maps.app.goo.gl/abc123')).toBeNull();
    expect(parseCoordinates('')).toBeNull();
    expect(parseCoordinates('95, 200')).toBeNull();
    expect(parseCoordinates('Jalan Merdeka 12')).toBeNull();
  });
});

describe('formatDistance', () => {
  it('uses metres below a kilometre and kilometres above', () => {
    expect(formatDistance(148)).toBe('150 m');
    expect(formatDistance(1234)).toBe('1,2 km');
  });
});
