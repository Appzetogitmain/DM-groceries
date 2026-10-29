import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { createPortal } from "react-dom";
import { GoogleMap, useJsApiLoader, Marker, OverlayView } from "@react-google-maps/api";
import { Loader2, Play, Pause, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import customerPin from "@/assets/customer-pin.png";
import { deliveryApi } from "../services/deliveryApi";
import deliveryIcon from "@/assets/deliveryIcon.png";
import storePin from "@/assets/store-pin.png";
import {
  getCachedDeliveryPartnerLocation,
  saveDeliveryPartnerLocation,
} from "../utils/deliveryLastLocation";

const libraries = ["geometry"];
const ROUTE_REFRESH_THRESHOLD_M = 150;
const ROUTE_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const RECENTER_INTERVAL_MS = 15000;
const RIDER_FOCUS_RADIUS_M = 500;
const LOCATION_POST_INTERVAL_MS = 5000;

// Container style will be 100% to fill parent
const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "200px",
};

/** GeoJSON [lng, lat] → { lat, lng } */
function coordsToLatLng(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function distanceMeters(from, to) {
  if (!from || !to) return null;
  if (
    typeof from.lat !== "number" ||
    typeof from.lng !== "number" ||
    typeof to.lat !== "number" ||
    typeof to.lng !== "number" ||
    !Number.isFinite(from.lat) ||
    !Number.isFinite(from.lng) ||
    !Number.isFinite(to.lat) ||
    !Number.isFinite(to.lng)
  ) {
    return null;
  }

  const r = 6371000;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeBearing(from, to) {
  if (!from || !to) return 0;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function getClosestPointOnSegment(p, p1, p2) {
  const dx = p2.lng - p1.lng;
  const dy = p2.lat - p1.lat;
  if (dx === 0 && dy === 0) return p1;
  const u = ((p.lng - p1.lng) * dx + (p.lat - p1.lat) * dy) / (dx * dx + dy * dy);
  if (u < 0) return p1;
  if (u > 1) return p2;
  return { lat: p1.lat + u * dy, lng: p1.lng + u * dx };
}

/** Pure JavaScript polyline decoder (no dependency on Google Maps SDK) */
function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== "string") return [];
  const points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      lat: Math.round(lat * 1e-5 * 1e6) / 1e6,
      lng: Math.round(lng * 1e-5 * 1e6) / 1e6,
    });
  }
  return points;
}

function destinationForPhase(order, phase) {
  const isReturn = order?.returnStatus && order.returnStatus !== "none";
  if (phase === "pickup") {
    if (isReturn) {
      const loc = order?.address?.location;
      if (
        loc &&
        typeof loc.lat === "number" &&
        typeof loc.lng === "number" &&
        Number.isFinite(loc.lat) &&
        Number.isFinite(loc.lng)
      ) {
        return { lat: loc.lat, lng: loc.lng };
      }
      return null;
    }
    return coordsToLatLng(order?.seller?.location?.coordinates);
  }
  if (isReturn) {
    return coordsToLatLng(order?.seller?.location?.coordinates);
  }
  const loc = order?.address?.location;
  if (
    loc &&
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng)
  ) {
    return { lat: loc.lat, lng: loc.lng };
  }
  return null;
}

/**
 * Live tracking map: rider + route.
 */
const DeliveryTrackingMapComponent = ({
  orderId,
  phase,
  order,
  onRouteStatsChange,
}) => {
  const mapRef = useRef(null);
  const routePolylineRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [rider, setRider] = useState(() => {
    const c = getCachedDeliveryPartnerLocation();
    return c ? { lat: c.lat, lng: c.lng } : null;
  });
  // Initialize riderRef from cache so fetchRoute works immediately on mount
  const riderRef = useRef((() => {
    const c = getCachedDeliveryPartnerLocation();
    return c ? { lat: c.lat, lng: c.lng } : null;
  })());
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [clientRoadPath, setClientRoadPath] = useState(null);
  const roadFetchInProgressRef = useRef(false);
  const lastFetchRef = useRef({ at: 0, phase: null, orderId: null });
  const routeOriginRef = useRef(null);
  const initialFitDoneRef = useRef(false);
  const watchIdRef = useRef(null);
  const lastLocationPostRef = useRef(0);
  const locationInFlightRef = useRef(false);
  const locationAbortRef = useRef(null);

  // ─── LOCAL DEV GPS SIMULATOR STATE ──────────────────────────────────────
  const [simRunning, setSimRunning] = useState(false);
  const [simProgress, setSimProgress] = useState(0); // 0 to 1
  const [simSpeed, setSimSpeed] = useState(2); // 1x, 2x, 5x
  const [simMinimized, setSimMinimized] = useState(false);
  const simIntervalRef = useRef(null);
  const lastSimPostRef = useRef(0);
  const lastStorageSaveRef = useRef(0);
  const lastPanRef = useRef(0);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: "delivery-tracking-map",
    googleMapsApiKey: apiKey,
    libraries,
  });

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // If developer is actively running simulator, pause real GPS overrides
        if (simRunning) return;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        let heading = pos.coords.heading;
        const speed = pos.coords.speed;
        
        if (heading === null || isNaN(heading)) {
          if (riderRef.current && (riderRef.current.lat !== lat || riderRef.current.lng !== lng) && window.google?.maps?.geometry?.spherical) {
            const prev = new window.google.maps.LatLng(riderRef.current.lat, riderRef.current.lng);
            const curr = new window.google.maps.LatLng(lat, lng);
            heading = window.google.maps.geometry.spherical.computeHeading(prev, curr);
          } else {
            heading = riderRef.current?.heading || 0;
          }
        }

        saveDeliveryPartnerLocation(lat, lng);
        setRider({ lat, lng, heading });
        riderRef.current = { lat, lng, heading };
        
        // Throttle location POSTs to once every 5s and skip if one is already in-flight
        const now = Date.now();
        if (now - lastLocationPostRef.current < LOCATION_POST_INTERVAL_MS) return;
        if (locationInFlightRef.current) return;
        lastLocationPostRef.current = now;
        locationInFlightRef.current = true;

        // Abort any previous stale request
        if (locationAbortRef.current) locationAbortRef.current.abort();
        const controller = new AbortController();
        locationAbortRef.current = controller;

        deliveryApi.postLocation(
          { lat, lng, accuracy, heading, speed, orderId: orderId || null },
          { signal: controller.signal, timeout: 8000 },
        ).catch(() => {}).finally(() => {
          locationInFlightRef.current = false;
          if (locationAbortRef.current === controller) locationAbortRef.current = null;
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (locationAbortRef.current) {
        locationAbortRef.current.abort();
        locationAbortRef.current = null;
      }
      locationInFlightRef.current = false;
    };
  }, [orderId, simRunning]);

  const routeAbortRef = useRef(null);
  const routeInFlightRef = useRef(false);

  const fetchRoute = useCallback(async () => {
    const currentRider = riderRef.current;
    if (!orderId || !currentRider) return;
    if (routeInFlightRef.current) return;
    const now = Date.now();
    const sameRouteContext =
      lastFetchRef.current.phase === phase &&
      lastFetchRef.current.orderId === orderId;
    const originDrift =
      routeOriginRef.current && currentRider
        ? distanceMeters(routeOriginRef.current, currentRider)
        : null;

    if (
      sameRouteContext &&
      lastFetchRef.current.at &&
      now - lastFetchRef.current.at < ROUTE_REFRESH_INTERVAL_MS &&
      (originDrift === null || originDrift < ROUTE_REFRESH_THRESHOLD_M)
    ) {
      return;
    }

    lastFetchRef.current = { at: now, phase, orderId };
    routeInFlightRef.current = true;

    if (routeAbortRef.current) routeAbortRef.current.abort();
    const controller = new AbortController();
    routeAbortRef.current = controller;

    setRouteLoading(true);
    try {
      const res = await deliveryApi.getOrderRoute(orderId, {
        phase,
        originLat: currentRider.lat,
        originLng: currentRider.lng,
        _t: now,
      }, { signal: controller.signal });
      if (res.data?.success) {
        const nextRoute = res.data.result || res.data.data || null;
        if (nextRoute?.degraded) {
          console.warn("[DeliveryTrackingMap] Distance calculation unavailable. Verify GOOGLE_MAPS_API_KEY in the backend .env, enable Distance Matrix API, then restart the API server.");
        }
        setRouteData(nextRoute);
        routeOriginRef.current = { lat: currentRider.lat, lng: currentRider.lng };
      }
    } catch {
      console.warn("[DeliveryTrackingMap] Failed to fetch route, using degraded/haversine fallback.");
      setRouteData((prev) => prev || { degraded: true });
    } finally {
      routeInFlightRef.current = false;
      if (routeAbortRef.current === controller) routeAbortRef.current = null;
      setRouteLoading(false);
    }
  }, [orderId, phase]);

  useEffect(() => {
    setRouteData((prev) => (prev?.phase === phase ? prev : null));
    lastFetchRef.current = { at: 0, phase: null, orderId: null };
    routeOriginRef.current = null;
    initialFitDoneRef.current = false;
    setClientRoadPath(null);
    roadFetchInProgressRef.current = false;
  }, [orderId, phase]);

  useEffect(() => {
    if (!rider) return undefined;
    fetchRoute();
    const iv = setInterval(fetchRoute, ROUTE_REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(iv);
      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
        routeAbortRef.current = null;
      }
      routeInFlightRef.current = false;
    };
  }, [!!rider, fetchRoute, phase, orderId]);

  const isReturn = order?.returnStatus && order.returnStatus !== "none";
  const dest = useMemo(() => {
    const fromOrder = destinationForPhase(order, phase);
    if (fromOrder) return fromOrder;
    const rd = routeData?.destination;
    if (rd && typeof rd.lat === "number" && typeof rd.lng === "number") {
      return { lat: rd.lat, lng: rd.lng };
    }
    return null;
  }, [order, phase, routeData]);

  useEffect(() => {
    if (typeof onRouteStatsChange !== "function") return undefined;
    onRouteStatsChange({
      phase,
      rider,
      destination: dest,
      routeDurationSeconds: Number(routeData?.duration) || null,
      routeDistanceMeters:
        Number(routeData?.distanceMeters ?? routeData?.distance) || null,
    });
    return undefined;
  }, [onRouteStatsChange, phase, rider, dest, routeData]);

  const decodedPath = useMemo(() => {
    const encoded = routeData?.polyline;
    if (!encoded) return null;
    const pts = decodePolyline(encoded);
    return pts && pts.length > 2 ? pts : null;
  }, [routeData?.polyline]);

  const effectivePath = useMemo(() => {
    if (clientRoadPath && clientRoadPath.length >= 2) return clientRoadPath;
    if (decodedPath && decodedPath.length >= 2) return decodedPath;
    return null;
  }, [clientRoadPath, decodedPath]);

  // Client-side road router: direct Google Routes API v2 fallback if backend route is delayed
  useEffect(() => {
    if (!dest) return;
    if (decodedPath && decodedPath.length >= 2) return;
    const originPt = routeOriginRef.current || riderRef.current || rider;
    if (!originPt) return;
    if (roadFetchInProgressRef.current) return;

    roadFetchInProgressRef.current = true;

    if (apiKey) {
      fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: { latitude: originPt.lat, longitude: originPt.lng },
            },
          },
          destination: {
            location: { latLng: { latitude: dest.lat, longitude: dest.lng } },
          },
          travelMode: "DRIVE",
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          const enc = data?.routes?.[0]?.polyline?.encodedPolyline;
          if (enc) {
            const pts = decodePolyline(enc);
            if (pts && pts.length >= 2) {
              setClientRoadPath(pts);
              return;
            }
          }
          fallbackOsrm(originPt, dest);
        })
        .catch(() => {
          fallbackOsrm(originPt, dest);
        })
        .finally(() => {
          roadFetchInProgressRef.current = false;
        });
      return;
    }

    fallbackOsrm(originPt, dest);

    function fallbackOsrm(from, to) {
      fetch(
        `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data?.code === "Ok" && data?.routes?.[0]?.geometry) {
            const rawPts = decodePolyline(data.routes[0].geometry);
            if (rawPts && rawPts.length >= 2) {
              setClientRoadPath(rawPts);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          roadFetchInProgressRef.current = false;
        });
    }
  }, [apiKey, dest, decodedPath]);

  // Stable road route polyline: stays completely fixed along the road & strictly anchored
  const routePath = useMemo(() => {
    let basePath = null;
    if (decodedPath && decodedPath.length >= 2) {
      basePath = decodedPath;
    } else if (clientRoadPath && clientRoadPath.length >= 2) {
      basePath = clientRoadPath;
    }

    if (!basePath || basePath.length < 2) {
      const currentOrigin =
        routeOriginRef.current || riderRef.current || rider;
      if (currentOrigin && dest) {
        return [
          { lat: Number(currentOrigin.lat), lng: Number(currentOrigin.lng) },
          { lat: Number(dest.lat), lng: Number(dest.lng) },
        ];
      }
      return [];
    }

    const pts = basePath
      .map((p) => ({
        lat: typeof p?.lat === "function" ? p.lat() : Number(p?.lat),
        lng: typeof p?.lng === "function" ? p.lng() : Number(p?.lng),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (pts.length < 2) return [];

    // Ensure the points flow towards destination
    if (dest) {
      const d0Dest = distanceMeters(pts[0], dest) || 0;
      const dLastDest = distanceMeters(pts[pts.length - 1], dest) || 0;
      if (d0Dest < dLastDest) {
        pts.reverse();
      }
    }

    return pts;
  }, [decodedPath, clientRoadPath, dest]);

  // ─── LOCAL DEV GPS SIMULATOR ENGINE ──────────────────────────────────────
  const simBaselinePoints = useMemo(() => {
    if (routePath && routePath.length >= 2) {
      return routePath;
    }
    const origin = routeOriginRef.current || rider;
    if (origin && dest) {
      return [
        { lat: Number(origin.lat), lng: Number(origin.lng) },
        { lat: Number(dest.lat), lng: Number(dest.lng) },
      ];
    }
    return [];
  }, [routePath, dest, rider]);

  const simPoints = useMemo(() => {
    return simBaselinePoints;
  }, [simBaselinePoints]);

  // Place delivery rider on the start of the polyline with proper orientation before simulator starts
  useEffect(() => {
    if (simPoints.length >= 2 && !simRunning && simProgress === 0) {
      const startPt = simPoints[0];
      const nextPt = simPoints[1];
      const initialHeading = computeBearing(startPt, nextPt);
      setRider((prev) => {
        if (!prev || distanceMeters(prev, startPt) > 1) {
          riderRef.current = { ...startPt, heading: initialHeading };
          return { ...startPt, heading: initialHeading };
        }
        return prev;
      });
    }
  }, [simPoints, simRunning, simProgress]);

  const snappedRider = useMemo(() => {
    if (!rider) return null;
    if (!routePath || routePath.length < 2) return rider;

    // When simulator is not running or at 0, lock rider EXACTLY to routePath[0]
    if (!simRunning && simProgress === 0) {
      const p0 = routePath[0];
      const p1 = routePath[1] || routePath[0];
      const heading = computeBearing(p0, p1);
      return { lat: p0.lat, lng: p0.lng, heading };
    }

    // When simulator has reached the destination, lock rider to the final point
    if (simProgress >= 1) {
      const pLast = routePath[routePath.length - 1];
      const pPrev = routePath[routePath.length - 2] || pLast;
      const heading = computeBearing(pPrev, pLast);
      return { lat: pLast.lat, lng: pLast.lng, heading };
    }

    // When simulator is running, find closest segment on routePath and attach rider to that segment
    let closestPt = routePath[0];
    let closestIdx = 0;
    let minD = Infinity;

    for (let i = 0; i < routePath.length - 1; i++) {
      const pA = routePath[i];
      const pB = routePath[i + 1];
      const pSeg = getClosestPointOnSegment(rider, pA, pB);
      const d = distanceMeters(rider, pSeg);
      if (d != null && d < minD) {
        minD = d;
        closestPt = pSeg;
        closestIdx = i;
      }
    }

    const nextPt = routePath[Math.min(closestIdx + 1, routePath.length - 1)];
    const heading = computeBearing(closestPt, nextPt);

    return {
      lat: closestPt.lat,
      lng: closestPt.lng,
      heading: heading || rider.heading || 0,
    };
  }, [rider, routePath, simRunning, simProgress]);

  const simSegments = useMemo(() => {
    if (simPoints.length < 2) return { cumulative: [0], total: 0 };
    const cumulative = [0];
    let total = 0;
    for (let i = 0; i < simPoints.length - 1; i++) {
      const d = distanceMeters(simPoints[i], simPoints[i + 1]) || 1;
      total += d;
      cumulative.push(total);
    }
    return { cumulative, total: Math.max(1, total) };
  }, [simPoints]);

  const getPointAtProgress = useCallback((progress) => {
    const { cumulative, total } = simSegments;
    if (simPoints.length < 2 || total <= 0) return null;

    const clamped = Math.max(0, Math.min(1, progress));
    const targetDist = clamped * total;

    let segIdx = 0;
    for (let i = 0; i < cumulative.length - 1; i++) {
      if (targetDist <= cumulative[i + 1]) {
        segIdx = i;
        break;
      }
      segIdx = i;
    }

    const pA = simPoints[segIdx];
    const pB = simPoints[Math.min(segIdx + 1, simPoints.length - 1)];
    const segStartDist = cumulative[segIdx];
    const segEndDist = cumulative[Math.min(segIdx + 1, cumulative.length - 1)];
    const segLen = segEndDist - segStartDist;

    const fraction = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;
    const lat = pA.lat + fraction * (pB.lat - pA.lat);
    const lng = pA.lng + fraction * (pB.lng - pA.lng);
    const heading = computeBearing(pA, pB);

    return { lat, lng, heading };
  }, [simPoints, simSegments]);

  const applySimPosition = useCallback((newProgress) => {
    const pt = getPointAtProgress(newProgress);
    if (!pt) return;

    setRider(pt);
    riderRef.current = pt;

    const now = Date.now();
    if (now - lastStorageSaveRef.current > 1000 || newProgress >= 1) {
      lastStorageSaveRef.current = now;
      saveDeliveryPartnerLocation(pt.lat, pt.lng);
    }

    // Throttle server update to every 1.5s so customer tracking updates live too
    if (now - lastSimPostRef.current > 1500) {
      lastSimPostRef.current = now;
      deliveryApi.postLocation({
        lat: pt.lat,
        lng: pt.lng,
        heading: pt.heading,
        speed: 25 * simSpeed,
        orderId: orderId || null,
      }).catch(() => {});
    }
  }, [getPointAtProgress, simSpeed, orderId]);

  // 60 FPS buttery smooth animation loop using requestAnimationFrame
  useEffect(() => {
    if (!simRunning) return undefined;

    let lastTime = performance.now();
    let frameId;

    const tick = (currentTime) => {
      const deltaSec = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      setSimProgress((prev) => {
        const { total } = simSegments;
        if (total <= 0) return prev;

        // ~35 km/h driving speed = ~9.72 m/s
        const speedMps = 9.72 * simSpeed;
        const distStep = speedMps * deltaSec;
        const nextProgress = Math.min(1, prev + distStep / total);

        applySimPosition(nextProgress);

        if (nextProgress >= 1) {
          setSimRunning(false);
          return 1;
        }

        return nextProgress;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [simRunning, simSegments, simSpeed, applySimPosition]);

  const handleSimReset = useCallback(() => {
    setSimRunning(false);
    setSimProgress(0);
    applySimPosition(0);
  }, [applySimPosition]);

  const handleSliderChange = useCallback((e) => {
    const val = parseFloat(e.target.value);
    setSimProgress(val);
    applySimPosition(val);
  }, [applySimPosition]);

  const customerMarkerIcon = useMemo(() => {
    if (!isLoaded || !window.google?.maps) return undefined;

    return {
      url: customerPin,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 40),
    };
  }, [isLoaded]);

  const storeMarkerIcon = useMemo(() => {
    if (!isLoaded || !window.google?.maps) return undefined;

    return {
      url: storePin,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 40),
    };
  }, [isLoaded]);

  const mapCenter = useMemo(() => {
    if (rider) return rider;
    if (dest) return dest;
    return { lat: 20.5937, lng: 78.9629 };
  }, [rider, dest]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapInstance(map);
  }, []);

  const focusOnRider500m = useCallback((map, riderLocation) => {
    if (!map || !window.google?.maps?.geometry?.spherical || !riderLocation) return;

    const center = new window.google.maps.LatLng(riderLocation.lat, riderLocation.lng);
    const bounds = new window.google.maps.LatLngBounds();
    [0, 90, 180, 270].forEach((heading) => {
      const edge = window.google.maps.geometry.spherical.computeOffset(
        center,
        RIDER_FOCUS_RADIUS_M,
        heading,
      );
      bounds.extend(edge);
    });
    map.fitBounds(bounds, 24);
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapInstance || !window.google?.maps) return undefined;

    // Clear previous polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    if (!routePath || routePath.length < 2) return undefined;

    const pl = new window.google.maps.Polyline({
      path: routePath,
      strokeColor: "#2563eb",
      strokeOpacity: 0.95,
      strokeWeight: 5,
      map: mapInstance,
      zIndex: 10,
    });
    routePolylineRef.current = pl;

    return () => {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
    };
  }, [isLoaded, mapInstance, routePath]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !rider) return;

    if (!initialFitDoneRef.current) {
      focusOnRider500m(map, rider);
      initialFitDoneRef.current = true;
    } else {
      const now = Date.now();
      // Gently pan camera at smooth intervals without stuttering Google Maps
      if (now - lastPanRef.current > 750) {
        lastPanRef.current = now;
        map.panTo({ lat: rider.lat, lng: rider.lng });
      }
    }
  }, [rider, focusOnRider500m]);

  if (!apiKey) {
    return (
      <div className="relative w-full h-48 bg-slate-100 rounded-2xl flex items-center justify-center text-center px-4">
        <p className="text-xs text-slate-500">
          Set <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to show live
          tracking.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="relative w-full h-48 bg-rose-50 rounded-2xl flex items-center justify-center text-xs text-rose-700 px-4">
        Map failed to load. Check the API key and billing.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative w-full h-48 bg-slate-50 rounded-2xl flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={14}
        onLoad={onMapLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {snappedRider && (
          <OverlayView
            position={snappedRider}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({
              x: -20,
              y: -20,
            })}
          >
            <div style={{
              transform: `rotate(${snappedRider.heading || 0}deg)`,
              transition: 'transform 0.15s linear',
              transformOrigin: 'center center',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img src={deliveryIcon} style={{ width: 40, height: 40, objectFit: 'contain', display: 'block' }} alt="rider" />
            </div>
          </OverlayView>
        )}
        {dest && (
          <Marker
            position={dest}
            title={
              phase === "pickup"
                ? isReturn
                  ? "Pickup (customer)"
                  : "Pickup (store)"
                : isReturn
                  ? "Drop (seller)"
                  : "Drop (customer)"
            }
            icon={
              phase === "pickup"
                ? isReturn
                  ? customerMarkerIcon
                  : storeMarkerIcon
                : isReturn
                  ? storeMarkerIcon
                  : customerMarkerIcon
            }
          />
        )}
      </GoogleMap>
      <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur px-2 py-1 rounded-md text-[10px] text-slate-600 font-bold border border-slate-200 shadow-sm">
        {routeLoading ? "Updating route…" : "Tracking View"}
      </div>


      {/* ── LOCAL DEV GPS SIMULATOR (DEV ONLY - RENDERED OUTSIDE MOBILE SCREEN VIA PORTAL) ── */}
      {import.meta.env.DEV &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-6 right-6 z-[99999] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-3 max-w-[280px] w-full text-xs font-sans transition-all duration-200">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Dev GPS Simulator</span>
              </div>
              <button
                type="button"
                onClick={() => setSimMinimized(!simMinimized)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                title={simMinimized ? "Expand simulator" : "Minimize simulator"}
              >
                {simMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {!simMinimized && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSimRunning(!simRunning)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl font-bold transition-all shadow-sm cursor-pointer ${
                      simRunning
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {simRunning ? <Pause size={12} /> : <Play size={12} />}
                    <span>{simRunning ? "Pause" : simProgress >= 1 ? "Replay" : "Drive"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSimReset}
                    title="Reset to start"
                    className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <div className="flex bg-slate-100 rounded-xl p-0.5">
                    {[1, 2, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSimSpeed(s)}
                        className={`px-1.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                          simSpeed === s ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1">
                    <span>Route progress</span>
                    <span className="font-bold text-slate-700">{Math.round(simProgress * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.005"
                    value={simProgress}
                    onChange={handleSliderChange}
                    className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="text-[9px] text-slate-400 font-mono text-center">
                  Dev only • Floating outside mobile frame
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

// Memoized export to prevent unnecessary re-renders and reduce Google Maps API costs
const DeliveryTrackingMap = memo(DeliveryTrackingMapComponent, (prevProps, nextProps) => {
  const destPrev = destinationForPhase(prevProps.order, prevProps.phase);
  const destNext = destinationForPhase(nextProps.order, nextProps.phase);
  
  return (
    prevProps.orderId === nextProps.orderId &&
    prevProps.phase === nextProps.phase &&
    destPrev?.lat === destNext?.lat &&
    destPrev?.lng === destNext?.lng
  );
});

DeliveryTrackingMap.displayName = 'DeliveryTrackingMap';

export default DeliveryTrackingMap;
