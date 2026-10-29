import axios from "axios";
import { Client } from "@googlemaps/google-maps-services-js";
import polyline from "@mapbox/polyline";
import { getRedisClient } from "../config/redis.js";
import { writeRoutePolyline, getRoutePolyline } from "./firebaseService.js";
import { distanceMeters } from "../utils/geoUtils.js";

const client = new Client({});

const ROUTE_CACHE_TTL_SEC = () =>
  parseInt(process.env.ROUTE_CACHE_TTL_SEC || "900", 10);
const ROUTE_CACHE_MATCH_THRESHOLD_M = () =>
  parseInt(process.env.ROUTE_CACHE_MATCH_THRESHOLD_METERS || "150", 10);

function roundCoord(n) {
  return Math.round(n * 1e5) / 1e5;
}

/** Cache key for route results */
function cacheKey(origin, dest, mode) {
  return `route:v2:${roundCoord(origin.lat)},${roundCoord(origin.lng)}:${roundCoord(dest.lat)},${roundCoord(dest.lng)}:${mode}`;
}

function degradedPayload() {
  return { polyline: null, bounds: null, distanceMeters: null, duration: null, degraded: true };
}

function hasValidPoint(point) {
  return (
    point &&
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );
}

function isRouteCacheCompatible(cached, origin, dest, phase, mode) {
  if (cached?.distance == null && cached?.distanceMeters == null) return false;
  if ((cached.phase || "pickup") !== phase) return false;
  if ((cached.mode || "driving") !== mode) return false;
  if (!hasValidPoint(origin) || !hasValidPoint(dest)) return false;
  if (!hasValidPoint(cached.origin) || !hasValidPoint(cached.destination)) {
    return false;
  }
  if (cached?.source === 'haversine_fallback' || cached?.source === 'distance_matrix_api') {
    return false;
  }
  // If the cached polyline has 2 points or fewer, it's a straight line, not a road route! Reject it!
  try {
    const pts = polyline.decode(cached.polyline);
    if (!pts || pts.length <= 2) {
      return false;
    }
  } catch {
    return false;
  }

  const originDrift = distanceMeters(
    origin.lat,
    origin.lng,
    cached.origin.lat,
    cached.origin.lng,
  );
  const destDrift = distanceMeters(
    dest.lat,
    dest.lng,
    cached.destination.lat,
    cached.destination.lng,
  );

  const threshold = Math.max(25, ROUTE_CACHE_MATCH_THRESHOLD_M());
  return originDrift <= threshold && destDrift <= threshold;
}

/**
 * 1. Google Routes API v2 - modern Google Directions API recommended by Google
 */
async function fetchGoogleRoutes(origin, dest, mode, apiKey) {
  try {
    const travelMode =
      mode === "walking" ? "WALK" : mode === "bicycling" ? "BICYCLE" : "DRIVE";
    const resp = await axios.post(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        origin: {
          location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
        },
        destination: {
          location: { latLng: { latitude: dest.lat, longitude: dest.lng } },
        },
        travelMode,
        routingPreference: "TRAFFIC_UNAWARE",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.viewport",
        },
        timeout: 8000,
      }
    );

    const route = resp.data?.routes?.[0];
    if (route?.polyline?.encodedPolyline) {
      const durSec = route.duration
        ? parseInt(String(route.duration).replace("s", ""), 10)
        : null;
      return {
        polyline: route.polyline.encodedPolyline,
        bounds: route.viewport || null,
        distanceMeters: route.distanceMeters ?? null,
        duration: durSec,
        source: "google_routes_v2",
      };
    }
    return null;
  } catch (err) {
    console.warn(
      `[Google Routes API Error]: ${err.response?.data?.error?.message || err.message}`
    );
    return null;
  }
}

/**
 * 2. Google Directions API - legacy fallback
 */
async function fetchGoogleDirections(origin, dest, mode, apiKey) {
  try {
    const resp = await client.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${dest.lat},${dest.lng}`,
        mode,
        key: apiKey,
      },
      timeout: 8000,
    });

    const route = resp.data?.routes?.[0];
    const leg = route?.legs?.[0];
    if (resp.data?.status === "OK" && route?.overview_polyline?.points) {
      return {
        polyline: route.overview_polyline.points,
        bounds: route.bounds || null,
        distanceMeters: leg?.distance?.value ?? null,
        duration: leg?.duration?.value ?? null,
        source: "google_directions",
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * 3. OSRM Road Router - real road network fallback
 */
async function fetchOsrmRoute(origin, dest) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=polyline`;
    const resp = await axios.get(url, { timeout: 7000 });
    const route = resp.data?.routes?.[0];
    if (resp.data?.code === "Ok" && route?.geometry) {
      return {
        polyline: route.geometry,
        bounds: null,
        distanceMeters: Math.round(route.distance),
        duration: Math.round(route.duration),
        source: "osrm_roads",
      };
    }
    return null;
  } catch (err) {
    console.warn(`[OSRM Road Router Error]: ${err.message}`);
    return null;
  }
}

/**
 * Returns road-following route { polyline, bounds, distanceMeters, duration, degraded }
 * using Google Directions API (primary) -> OSRM Road Router (fallback) -> Haversine (last resort).
 * 
 * @param {Object} origin - { lat, lng }
 * @param {Object} dest - { lat, lng }
 * @param {string} mode - "driving" | "walking" | "bicycling" | "transit"
 * @param {string} orderId - Optional order ID for Firebase caching
 * @param {string} phase - "pickup" | "delivery"
 */
export async function getCachedRoute(origin, dest, mode = "driving", orderId = null, phase = "pickup") {
  if (!hasValidPoint(origin) || !hasValidPoint(dest)) {
    return degradedPayload();
  }

  // 1. Try Firebase cache first if orderId is provided
  if (orderId) {
    try {
      const firebaseRoute = await getRoutePolyline(orderId);
      const cachedPhase = firebaseRoute?.phase || "pickup";
      if (isRouteCacheCompatible(firebaseRoute, origin, dest, phase, mode)) {
        return {
          polyline: firebaseRoute.polyline,
          bounds: firebaseRoute.bounds,
          distanceMeters: firebaseRoute.distance ?? firebaseRoute.distanceMeters,
          duration: firebaseRoute.duration,
          degraded: false,
          source: 'firebase',
          phase: cachedPhase,
        };
      }
    } catch {
      /* ignore firebase cache errors */
    }
  }

  // 2. Try Redis cache
  const redis = getRedisClient();
  const key = cacheKey(origin, dest, mode);
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          parsed?.distanceMeters != null &&
          !parsed.degraded &&
          parsed.source !== 'haversine_fallback'
        ) {
          try {
            const pts = polyline.decode(parsed.polyline);
            if (pts && pts.length > 2) {
              return { ...parsed, source: 'redis', phase };
            }
          } catch {
            /* ignore invalid polyline in redis */
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_KEY?.trim();

  let routeResult = null;

  // Step A: Try Google Routes API v2 first using the Google Maps API key
  if (apiKey) {
    routeResult = await fetchGoogleRoutes(origin, dest, mode, apiKey);
  }

  // Step B: Legacy Google Directions fallback
  if (!routeResult && apiKey) {
    routeResult = await fetchGoogleDirections(origin, dest, mode, apiKey);
  }

  // Step C: If Google fails (e.g. quota/network), query OSRM road router to follow real streets
  if (!routeResult) {
    routeResult = await fetchOsrmRoute(origin, dest);
  }

  const isDegraded = !routeResult || routeResult.source === "haversine_fallback";

  // Step C: If both road network queries failed, straight-line fallback
  if (!routeResult) {
    const haversineM = distanceMeters(origin.lat, origin.lng, dest.lat, dest.lng);
    const durationEst = Math.round((haversineM / 1000) * 120);
    const directPolyline = polyline.encode([[origin.lat, origin.lng], [dest.lat, dest.lng]]);
    routeResult = {
      polyline: directPolyline,
      bounds: null,
      distanceMeters: Math.round(haversineM),
      duration: durationEst,
      source: "haversine_fallback",
    };
  }

  const payload = {
    polyline: routeResult.polyline,
    bounds: routeResult.bounds || null,
    distanceMeters: routeResult.distanceMeters,
    duration: routeResult.duration,
    degraded: isDegraded,
    source: routeResult.source,
    phase,
  };

  // Only cache valid road routes (do not cache straight line fallbacks)
  if (!isDegraded) {
    if (redis) {
      try {
        await redis.set(key, JSON.stringify(payload), "EX", ROUTE_CACHE_TTL_SEC());
      } catch {
        /* ignore */
      }
    }

    if (orderId) {
      try {
        await writeRoutePolyline(orderId, {
          polyline: payload.polyline,
          phase,
          origin,
          destination: dest,
          mode,
          bounds: payload.bounds,
          distance: payload.distanceMeters,
          duration: payload.duration,
        });
      } catch {
        /* ignore firebase write errors */
      }
    }
  }

  return payload;
}

export default { getCachedRoute };
