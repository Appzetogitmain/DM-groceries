import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleMap, useJsApiLoader, Marker, Polyline, OverlayView } from "@react-google-maps/api";
import {
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  Shield,
  Clock,
  Star,
  Search,
  Loader2,
} from "lucide-react";
import customerPin from "@/assets/customer-pin.png";
import deliveryIcon from "@/assets/deliveryIcon.png";
import storePin from "@/assets/store-pin.png";

const libraries = ["places", "geometry"];

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "350px",
};
const RECENTER_INTERVAL_MS = 15000;
const RIDER_FOCUS_RADIUS_M = 500;

/** Delivery / rider search — not the same as waiting for seller acceptance */
const SEARCHING_STATUSES = [
  "pending",
  "confirmed",
  "delivery_search",
  "DELIVERY_SEARCH",
  "seller_accepted",
  "SELLER_ACCEPTED",
  "created",
  "CREATED",
];

function hasValidLatLng(location) {
  return (
    location &&
    typeof location.lat === "number" &&
    typeof location.lng === "number" &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng)
  );
}

function distanceMeters(from, to) {
  if (
    !from ||
    !to ||
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

const LiveTrackingMap = memo(({
  status = "out for delivery",
  eta = "8 mins",
  riderName,
  riderPlate,
  riderPhone,
  riderImage,
  riderRating,
  riderLocation,
  sellerLocation,
  destinationLocation,
  routePhase = "pickup",
  routePolyline,
  onOpenInMaps,
}) => {
  const mapRef = useRef(null);
  const initialFitDoneRef = useRef(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [clientRoadPath, setClientRoadPath] = useState(null);
  const roadFetchInProgressRef = useRef(false);
  const isSearching = SEARCHING_STATUSES.includes(status?.toLowerCase());
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState("");

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const cleanRiderPhone = useMemo(() => {
    if (!riderPhone) return "";
    const s = String(riderPhone).trim();
    const hasPlus = s.startsWith("+");
    const digits = s.replace(/[^\d]/g, "");
    if (!digits) return "";
    return hasPlus ? `+${digits}` : digits;
  }, [riderPhone]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries,
  });

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapInstance(map);
  }, []);

  const focusOnRider500m = useCallback((map, rider) => {
    if (!map || !window.google || !hasValidLatLng(rider)) return;
    const center = new window.google.maps.LatLng(rider.lat, rider.lng);
    const bounds = new window.google.maps.LatLngBounds();
    const offsets = [0, 90, 180, 270];
    offsets.forEach((heading) => {
      const point = window.google.maps.geometry.spherical.computeOffset(
        center,
        RIDER_FOCUS_RADIUS_M,
        heading,
      );
      bounds.extend(point);
    });
    map.fitBounds(bounds, 24);
  }, []);

  const activeTargetLocation = routePhase === "delivery" ? destinationLocation : sellerLocation;
  const shouldShowStoreMarker =
    routePhase === "pickup" && hasValidLatLng(sellerLocation);
  const shouldShowCustomerMarker =
    routePhase === "delivery" && hasValidLatLng(destinationLocation);

  // Decode polyline from Firebase
  const decodedPath = useMemo(() => {
    if (!routePolyline?.polyline) return null;
    const pts = decodePolyline(routePolyline.polyline);
    return pts && pts.length > 2 ? pts : null;
  }, [routePolyline?.polyline]);

  const effectivePath = useMemo(() => {
    if (clientRoadPath && clientRoadPath.length >= 2) return clientRoadPath;
    if (decodedPath && decodedPath.length >= 2) return decodedPath;
    return null;
  }, [clientRoadPath, decodedPath]);

  // Client-side road router: direct Google Routes API v2 fallback if backend polyline is not available
  useEffect(() => {
    if (!activeTargetLocation) return;
    if (decodedPath && decodedPath.length >= 2) return;
    const from = sellerLocation || (riderLocation && hasValidLatLng(riderLocation) ? riderLocation : null);
    const to = activeTargetLocation;
    if (!from || !to) return;
    if (roadFetchInProgressRef.current) return;

    roadFetchInProgressRef.current = true;

    if (apiKey) {
      fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
          destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
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
          fallbackOsrm(from, to);
        })
        .catch(() => {
          fallbackOsrm(from, to);
        })
        .finally(() => {
          roadFetchInProgressRef.current = false;
        });
      return;
    }

    fallbackOsrm(from, to);

    function fallbackOsrm(originPt, destPt) {
      fetch(
        `https://router.project-osrm.org/route/v1/driving/${originPt.lng},${originPt.lat};${destPt.lng},${destPt.lat}?overview=full&geometries=polyline`
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
  }, [apiKey, decodedPath, activeTargetLocation, sellerLocation]);

  // Stable road route polyline: stays completely fixed along the road & strictly anchored
  const routePath = useMemo(() => {
    let basePath = null;
    if (decodedPath && decodedPath.length >= 2) {
      basePath = decodedPath;
    } else if (clientRoadPath && clientRoadPath.length >= 2) {
      basePath = clientRoadPath;
    }

    if (!basePath || basePath.length < 2) {
      const from = sellerLocation || riderLocation;
      const to = activeTargetLocation;
      if (from && to && hasValidLatLng(from) && hasValidLatLng(to)) {
        return [
          { lat: Number(from.lat), lng: Number(from.lng) },
          { lat: Number(to.lat), lng: Number(to.lng) },
        ];
      }
      return [];
    }

    const pts = basePath.map((p) => ({
      lat: typeof p?.lat === "function" ? p.lat() : Number(p?.lat),
      lng: typeof p?.lng === "function" ? p.lng() : Number(p?.lng),
    })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (pts.length < 2) return [];

    // Direction check towards active target
    if (activeTargetLocation) {
      const d0To = distanceMeters(pts[0], activeTargetLocation) || 0;
      const dLastTo = distanceMeters(pts[pts.length - 1], activeTargetLocation) || 0;
      if (d0To < dLastTo) {
        pts.reverse();
      }
    }

    return pts;
  }, [decodedPath, clientRoadPath, sellerLocation, activeTargetLocation]);

  // Snapped rider along the polyline with proper heading
  const snappedRider = useMemo(() => {
    if (!riderLocation || !hasValidLatLng(riderLocation)) return null;
    if (!routePath || routePath.length < 2) return riderLocation;

    let closestPt = routePath[0];
    let closestIdx = 0;
    let minD = Infinity;

    for (let i = 0; i < routePath.length - 1; i++) {
      const pA = routePath[i];
      const pB = routePath[i + 1];
      const pSeg = getClosestPointOnSegment(riderLocation, pA, pB);
      const d = distanceMeters(riderLocation, pSeg);
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
      heading: heading || riderLocation.heading || 0,
    };
  }, [riderLocation, routePath]);

  // Smooth gliding interpolation so rider glides along road between 1.5s-3s location pings
  const [animatedRider, setAnimatedRider] = useState(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!snappedRider) {
      setAnimatedRider(null);
      return;
    }

    if (!animatedRider) {
      setAnimatedRider(snappedRider);
      return;
    }

    const startTime = performance.now();
    const startLat = animatedRider.lat;
    const startLng = animatedRider.lng;
    const targetLat = snappedRider.lat;
    const targetLng = snappedRider.lng;
    const duration = 800; // 800ms smooth gliding transition

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      setAnimatedRider({
        lat: startLat + (targetLat - startLat) * ease,
        lng: startLng + (targetLng - startLng) * ease,
        heading: snappedRider.heading,
      });

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [snappedRider?.lat, snappedRider?.lng, snappedRider?.heading]);

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

  // Calculate map center and bounds
  const mapCenter = useMemo(() => {
    if (riderLocation) return riderLocation;
    if (hasValidLatLng(activeTargetLocation)) return activeTargetLocation;
    return { lat: 20.5937, lng: 78.9629 };
  }, [activeTargetLocation, riderLocation]);

  // Fit bounds ONCE when locations or route change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || initialFitDoneRef.current) return;

    if (hasValidLatLng(riderLocation)) {
      focusOnRider500m(map, riderLocation);
      initialFitDoneRef.current = true;
      return;
    }
    
    try {
      const bounds = new window.google.maps.LatLngBounds();
      let hasPoints = false;
      
      // Add route points if available
      if (decodedPath && decodedPath.length > 0) {
        decodedPath.forEach((point) => bounds.extend(point));
        hasPoints = true;
      } else {
        // Fallback to rider and current phase destination
        if (riderLocation) {
          bounds.extend(riderLocation);
          hasPoints = true;
        }
        if (hasValidLatLng(activeTargetLocation)) {
          bounds.extend(activeTargetLocation);
          hasPoints = true;
        }
      }
      
      if (hasPoints) {
        map.fitBounds(bounds, 60);
        initialFitDoneRef.current = true;
      }
    } catch (err) {
      console.error("Error fitting bounds:", err);
    }
  }, [activeTargetLocation, riderLocation, decodedPath, focusOnRider500m]);

  // Keep rider centered during live tracking with a smooth map pan without altering user's zoom level!
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !hasValidLatLng(riderLocation)) return undefined;

    mapRef.current.panTo(riderLocation);

    const intervalId = setInterval(() => {
      const map = mapRef.current;
      if (!map || !hasValidLatLng(riderLocation)) return;
      map.panTo(riderLocation);
    }, RECENTER_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isLoaded, riderLocation?.lat, riderLocation?.lng]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev + 0.5) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isSearching]);

  const norm = status?.toLowerCase?.() || "";
  if (norm === "cancelled" || norm === "canceled") {
    return (
      <div className="relative w-full min-h-[220px] bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden rounded-b-[2rem] flex flex-col items-center justify-center gap-3 px-6 py-10 border-b border-slate-200">
        <div className="h-14 w-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
          <Clock size={28} />
        </div>
        <h3 className="text-lg font-black text-slate-800 text-center">
          Order cancelled
        </h3>
        <p className="text-sm text-slate-500 text-center max-w-sm font-medium">
          This order is closed. If payment was reserved, any applicable refund
          follows your store policy.
        </p>
      </div>
    );
  }

  if (norm === "seller_pending") {
    return (
      <div className="relative w-full min-h-[260px] bg-gradient-to-br from-[#f0faf4] to-[#e8f5e9] overflow-hidden rounded-b-[2rem] flex flex-col items-center justify-center gap-3 px-6 py-10 border-b border-brand-100">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-16 w-16 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-brand-200">
          <Clock size={30} className="text-white" />
        </motion.div>
        <h3 className="text-lg font-black text-gray-800 text-center">
          Waiting for seller to accept
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-sm font-medium">
          The store has up to 5 minutes to confirm. If they don&apos;t, your
          order will be cancelled automatically.
        </p>
      </div>
    );
  }

  // ─── DELIVERY PARTNER UNAVAILABLE STATE ───────────────────────────────
  if (norm === "delivery_partner_unavailable") {
    return (
      <div className="relative w-full min-h-[280px] bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden rounded-b-[2rem] flex flex-col items-center justify-center gap-4 px-6 py-10 border-b border-amber-100">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="h-16 w-16 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center shadow-lg">
          <Loader2 size={30} className="text-amber-600 animate-spin" />
        </motion.div>
        <h3 className="text-lg font-black text-gray-800 text-center">
          Delivery partner unavailable
        </h3>
        <p className="text-sm text-gray-600 text-center max-w-sm font-medium leading-relaxed">
          Delivery partner is currently unavailable. We are trying to assign a delivery partner. Please try again after some time.
        </p>
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-white px-4 py-2 rounded-full shadow-md border border-amber-200 flex items-center gap-2">
          <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Awaiting Assignment
          </span>
        </motion.div>
      </div>
    );
  }

  // ─── SEARCHING STATE ───────────────────────────────────────────────────
  if (isSearching) {
    return (
      <div className="relative w-full h-[320px] bg-gradient-to-br from-[#f0faf4] to-[#e8f5e9] overflow-hidden rounded-b-[2rem] flex flex-col items-center justify-center gap-4">
        {/* Animated radar rings */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 border-primary/20"
            initial={{ width: 60, height: 60, opacity: 0.8 }}
            animate={{ width: 60 + i * 70, height: 60 + i * 70, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Center dot */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="relative z-10 h-16 w-16 bg-primary rounded-full flex items-center justify-center shadow-xl shadow-brand-200">
          <Search size={28} className="text-white" />
        </motion.div>

        {/* Text */}
        <div className="relative z-10 text-center px-6">
          <h3 className="text-lg font-black text-gray-800">
            Searching for delivery partner{dots}
          </h3>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Hang tight! We're finding the best rider near you.
          </p>
        </div>

        {/* Status pill */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative z-10 bg-white px-4 py-2 rounded-full shadow-md border border-brand-100 flex items-center gap-2">
          <div className="h-2 w-2 bg-brand-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            {status === "confirmed"
              ? "Order Confirmed · Assigning Rider"
              : "Order Placed · Finding Rider"}
          </span>
        </motion.div>
      </div>
    );
  }

  // ─── LIVE TRACKING STATE ───────────────────────────────────────────────
  
  // If Google Maps is not loaded or no API key
  if (!apiKey) {
    return (
      <div className="relative w-full h-[350px] bg-slate-100 rounded-b-[2rem] flex items-center justify-center text-center px-4">
        <p className="text-xs text-slate-500">
          Set <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to show live tracking.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="relative w-full h-[350px] bg-rose-50 rounded-b-[2rem] flex items-center justify-center text-xs text-rose-700 px-4">
        Map failed to load. Check the API key and billing.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative w-full h-[350px] bg-slate-50 rounded-b-[2rem] flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[350px] bg-[#E5E3DF] overflow-hidden rounded-b-[2rem] shadow-md border-b border-gray-200">
      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={14}
        onLoad={onMapLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Rider Location Marker (Centered on Polyline & Rotating) */}
        {(animatedRider || snappedRider || riderLocation) && (
          <OverlayView
            position={animatedRider || snappedRider || riderLocation}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({
              x: -20,
              y: -20,
            })}
          >
            <div
              style={{
                transform: `rotate(${
                  (animatedRider || snappedRider)?.heading ?? riderHeading ?? 0
                }deg)`,
                transition: "transform 0.15s linear",
                transformOrigin: "center center",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={deliveryIcon}
                style={{
                  width: 40,
                  height: 40,
                  objectFit: "contain",
                  display: "block",
                }}
                alt="Delivery Partner"
              />
            </div>
          </OverlayView>
        )}

        {/* Store Marker */}
        {shouldShowStoreMarker && (
          <Marker
            position={sellerLocation}
            title="Store Location"
            icon={storeMarkerIcon}
          />
        )}

        {/* Destination Marker */}
        {shouldShowCustomerMarker && (
          <Marker
            position={destinationLocation}
            title="Your Location"
            icon={customerMarkerIcon}
          />
        )}

        {/* Single authentic road polyline strictly following the street */}
        {routePath && routePath.length > 1 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: "#2563eb",
              strokeOpacity: 0.95,
              strokeWeight: 5,
              geodesic: true,
            }}
          />
        )}
      </GoogleMap>

      {/* 3. Floating Overlay Cards */}
      <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-start">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-white/50 flex items-center gap-3">
          <div className="h-10 w-10 bg-brand-50 rounded-xl flex items-center justify-center text-primary">
            <Clock size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Arriving in
            </p>
            <h2 className="text-xl font-black text-gray-900 leading-none">
              {eta}
            </h2>
          </div>
        </motion.div>
        <button
          type="button"
          className="bg-white/90 backdrop-blur-md rounded-full px-3 py-2 shadow-lg border border-white/50 cursor-pointer hover:bg-white transition-colors flex items-center gap-1.5 text-[10px] font-bold text-slate-700"
          onClick={() => {
            if (typeof onOpenInMaps === "function") {
              onOpenInMaps({ riderLocation, destinationLocation });
            }
          }}
        >
          <MapPin size={14} className="text-primary" />
          Open in Maps
        </button>
      </div>

      {/* 4. Rider Info Card (Compact Bottom) */}
      {riderName && (
        <div className="absolute bottom-2 left-2 right-2 z-40">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-white/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm">
                  <img
                    src={riderImage || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&auto=format&fit=crop&q=60"}
                    alt="Rider"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground text-[7px] font-bold px-1 py-0.5 rounded-full flex items-center gap-0.5">
                  {riderRating > 0 ? riderRating : 'New'} <Star size={5} fill="white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-xs truncate">{riderName}</h3>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Shield size={8} />
                  Vaccinated {riderPlate ? `• ${riderPlate}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={cleanRiderPhone ? `tel:${cleanRiderPhone}` : "#"}
                  onClick={(e) => {
                    if (!cleanRiderPhone) {
                      e.preventDefault();
                    }
                  }}
                  title={cleanRiderPhone ? `Call ${riderName || 'rider'}` : "Phone number not available"}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                    cleanRiderPhone
                      ? "bg-brand-50 text-primary hover:bg-brand-100"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Phone size={14} />
                </a>
                <a
                  href={cleanRiderPhone ? `sms:${cleanRiderPhone}` : "#"}
                  onClick={(e) => {
                    if (!cleanRiderPhone) {
                      e.preventDefault();
                    }
                  }}
                  title={cleanRiderPhone ? `Message ${riderName || 'rider'}` : "Phone number not available"}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                    cleanRiderPhone
                      ? "bg-brand-50 text-brand-600 hover:bg-brand-100"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <MessageSquare size={14} />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Location status indicator */}
      {!riderLocation && riderName && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-amber-50/95 text-amber-900 text-[11px] px-3 py-1.5 rounded-full border border-amber-200 shadow-sm font-bold flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Connecting to rider GPS...
        </div>
      )}

      {/* Route cache indicator */}
      {routePolyline && (
        <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur px-2 py-1 rounded-md text-[10px] text-slate-600 font-bold border border-slate-200 shadow-sm">
          Route cached • Reduced API cost
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Only re-render if these props actually change
  return (
    prevProps.status === nextProps.status &&
    prevProps.eta === nextProps.eta &&
    prevProps.riderName === nextProps.riderName &&
    prevProps.riderPhone === nextProps.riderPhone &&
    prevProps.riderPlate === nextProps.riderPlate &&
    prevProps.riderImage === nextProps.riderImage &&
    prevProps.riderRating === nextProps.riderRating &&
    prevProps.riderLocation?.lat === nextProps.riderLocation?.lat &&
    prevProps.riderLocation?.lng === nextProps.riderLocation?.lng &&
    prevProps.sellerLocation?.lat === nextProps.sellerLocation?.lat &&
    prevProps.sellerLocation?.lng === nextProps.sellerLocation?.lng &&
    prevProps.destinationLocation?.lat === nextProps.destinationLocation?.lat &&
    prevProps.destinationLocation?.lng === nextProps.destinationLocation?.lng &&
    prevProps.routePhase === nextProps.routePhase &&
    prevProps.routePolyline?.phase === nextProps.routePolyline?.phase &&
    prevProps.routePolyline?.polyline === nextProps.routePolyline?.polyline &&
    prevProps.routePolyline?.cachedAt === nextProps.routePolyline?.cachedAt
  );
});

LiveTrackingMap.displayName = 'LiveTrackingMap';

export default LiveTrackingMap;
