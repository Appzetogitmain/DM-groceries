/**
 * Device / WebView helpers.
 *
 * Flutter wrappers (InAppWebView, webview_flutter) look like a browser to the
 * React app, but they do not support Web Push, often report
 * document.visibilityState === "hidden" while the user is looking at the app,
 * and frequently freeze or drop WebSocket upgrades.
 */

const WEBVIEW_FLAG_KEY = "appzeto:webview";

function readUserAgent() {
  if (typeof navigator === "undefined") return "";
  return String(navigator.userAgent || "");
}

function readQueryFlag() {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = String(params.get("nativeApp") || params.get("webview") || "").toLowerCase();
    return flag === "1" || flag === "true" || flag === "yes";
  } catch {
    return false;
  }
}

function readStoredWebViewFlag() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage?.getItem(WEBVIEW_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function persistWebViewFlag() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage?.setItem(WEBVIEW_FLAG_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

function hasIosNativeBridge() {
  if (typeof window === "undefined") return false;
  const handlers = window.webkit?.messageHandlers;
  if (!handlers || typeof handlers !== "object") return false;
  return Boolean(
    handlers.Flutter ||
      handlers.flutter_inappwebview ||
      handlers.AppZeto,
  );
}

/**
 * True when a native JS channel is actually present (not just a WebView UA).
 */
export function hasNativeFlutterBridge() {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.Flutter ||
      window.flutter_inappwebview?.callHandler ||
      hasIosNativeBridge(),
  );
}

/**
 * True when the MERN UI is running inside a Flutter (or generic Android) WebView.
 */
export function isFlutterWebView() {
  if (typeof window === "undefined") return false;

  if (hasNativeFlutterBridge()) {
    persistWebViewFlag();
    return true;
  }
  if (readQueryFlag() || readStoredWebViewFlag()) {
    persistWebViewFlag();
    return true;
  }

  const ua = readUserAgent();
  // Android System WebView identifies itself with "; wv)" in the UA.
  if (/; wv\)/i.test(ua) || /\bwv\b/.test(ua)) {
    persistWebViewFlag();
    return true;
  }
  if (/Flutter/i.test(ua)) {
    persistWebViewFlag();
    return true;
  }

  return false;
}

/**
 * Flutter injects its JS channel after the first page paint. Subscribe so
 * sockets / FCM can switch to the native path as soon as the bridge appears.
 */
export function subscribeNativeBridgeReady(callback) {
  if (typeof window === "undefined" || typeof callback !== "function") {
    return () => {};
  }

  let cancelled = false;
  let timer = 0;
  let stop = 0;

  const cleanup = () => {
    cancelled = true;
    window.removeEventListener("flutterInAppWebViewPlatformReady", fire);
    window.removeEventListener("flutter-first-frame", fire);
    if (timer) window.clearInterval(timer);
    if (stop) window.clearTimeout(stop);
  };

  const fire = () => {
    if (cancelled) return;
    if (!hasNativeFlutterBridge()) return;
    persistWebViewFlag();
    cleanup();
    callback();
  };

  if (hasNativeFlutterBridge()) {
    fire();
    return () => {
      cancelled = true;
    };
  }

  window.addEventListener("flutterInAppWebViewPlatformReady", fire);
  window.addEventListener("flutter-first-frame", fire);

  timer = window.setInterval(fire, 400);
  stop = window.setTimeout(() => {
    if (timer) window.clearInterval(timer);
  }, 20000);

  return cleanup;
}

export const isMobileOrWebView = () => {
  if (typeof window === "undefined") return false;

  return (
    window.innerWidth < 768 ||
    isFlutterWebView() ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(readUserAgent())
  );
};

/**
 * Browser Notification / Web Push are not available in Flutter WebViews.
 * Native FCM (via the JS bridge) is the only OS-notification path there.
 */
export function canUseBrowserNotifications() {
  if (typeof window === "undefined") return false;
  if (isFlutterWebView() || hasNativeFlutterBridge()) return false;
  return typeof Notification !== "undefined";
}

/**
 * Android WebView often keeps visibilityState === "hidden" even in the
 * foreground, which would skip polling and socket wakeups. Treat Flutter
 * as visible so the seller alert / notification fallbacks keep running.
 */
export function shouldTreatDocumentAsVisible() {
  if (typeof document === "undefined") return true;
  if (isFlutterWebView() || hasNativeFlutterBridge()) return true;
  return document.visibilityState !== "hidden";
}
