/**
 * AppZeto JS Bridge
 *
 * Bidirectional channel between the React seller/customer/delivery UI and a
 * Flutter WebView wrapper. Supports both:
 *   - webview_flutter `JavascriptChannel`  → window.Flutter.postMessage
 *   - flutter_inappwebview                  → window.flutter_inappwebview.callHandler
 *
 * Flutter can also push events into the page with:
 *   window.AppZetoNative.dispatch({ type: "push_received", data: { ... } })
 *   window.dispatchEvent(new CustomEvent("appzeto:native-push", { detail }))
 */

export const NATIVE_PUSH_EVENT = "appzeto:native-push";
export const APP_RESUME_EVENT = "appzeto:app-resume";

const listeners = new Set();
const pendingByType = new Map();
let hookInstalled = false;

function hasFlutterChannel() {
  return typeof window !== "undefined" && Boolean(window.Flutter);
}

function hasInAppWebView() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.flutter_inappwebview && window.flutter_inappwebview.callHandler)
  );
}

function notifyListeners(message) {
  listeners.forEach((callback) => {
    try {
      callback(message);
    } catch {
      /* ignore listener errors */
    }
  });

  if (typeof window === "undefined" || !message) return;

  const type = String(message.type || message.event || "").toLowerCase();
  window.dispatchEvent(new CustomEvent(NATIVE_PUSH_EVENT, { detail: message }));

  if (type === "app_resume" || type === "resume") {
    window.dispatchEvent(new CustomEvent(APP_RESUME_EVENT, { detail: message }));
  }
}

function resolvePending(type, data) {
  const key = String(type || "");
  const resolvers = pendingByType.get(key);
  if (!resolvers?.length) return;
  pendingByType.delete(key);
  resolvers.forEach((resolve) => {
    try {
      resolve(data);
    } catch {
      /* ignore */
    }
  });
}

export function dispatchNativeMessage(message) {
  if (!message || typeof message !== "object") return;
  const type = message.type || message.event;
  if (type) {
    resolvePending(type, message.data !== undefined ? message.data : message);
  }
  notifyListeners(message);
}

function installNativeHook() {
  if (hookInstalled || typeof window === "undefined") return;
  hookInstalled = true;

  const previous = window.onFlutterResponse;
  window.onFlutterResponse = (response) => {
    dispatchNativeMessage(response && typeof response === "object" ? response : { type: "unknown", data: response });
    if (typeof previous === "function" && previous !== window.onFlutterResponse) {
      try {
        previous(response);
      } catch {
        /* ignore */
      }
    }
  };

  window.AppZetoNative = {
    dispatch: dispatchNativeMessage,
  };
}

if (typeof window !== "undefined") {
  installNativeHook();
}

const AppZetoBridge = {
  isFlutterApp: () => hasFlutterChannel() || hasInAppWebView(),

  send: (action, payload) => {
    const body =
      payload === undefined
        ? action
        : JSON.stringify({ action, ...payload });

    if (hasFlutterChannel()) {
      window.Flutter.postMessage(typeof body === "string" ? body : String(action));
      return;
    }

    if (hasInAppWebView()) {
      const handlerName = typeof action === "string" ? action : "postMessage";
      window.flutter_inappwebview.callHandler(handlerName, payload || action);
      return;
    }

    console.warn("Flutter context not found. Are you running inside the Flutter app?");
  },

  onResponse: (callback) => {
    if (typeof callback !== "function") return () => {};
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  subscribe: (callback) => AppZetoBridge.onResponse(callback),

  getFcmToken: () => {
    return new Promise((resolve) => {
      if (hasInAppWebView()) {
        window.flutter_inappwebview
          .callHandler("getFcmToken")
          .then((token) => resolve(token || null))
          .catch(() => resolve(null));
        return;
      }

      if (!hasFlutterChannel()) {
        resolve(null);
        return;
      }

      const resolvers = pendingByType.get("fcm_token_response") || [];
      resolvers.push(resolve);
      pendingByType.set("fcm_token_response", resolvers);

      window.Flutter.postMessage("get_fcm_token");

      setTimeout(() => {
        const stillWaiting = pendingByType.get("fcm_token_response");
        if (!stillWaiting?.includes(resolve)) return;
        pendingByType.set(
          "fcm_token_response",
          stillWaiting.filter((fn) => fn !== resolve),
        );
        resolve(null);
      }, 10000);
    });
  },

  getLocation: () => {
    return new Promise((resolve) => {
      if (hasInAppWebView()) {
        window.flutter_inappwebview
          .callHandler("getLocation")
          .then((coords) => resolve(coords || null))
          .catch(() => resolve(null));
        return;
      }

      if (!hasFlutterChannel()) {
        resolve(null);
        return;
      }

      const resolvers = pendingByType.get("location_response") || [];
      resolvers.push(resolve);
      pendingByType.set("location_response", resolvers);

      window.Flutter.postMessage("get_location");

      setTimeout(() => {
        const stillWaiting = pendingByType.get("location_response");
        if (!stillWaiting?.includes(resolve)) return;
        pendingByType.set(
          "location_response",
          stillWaiting.filter((fn) => fn !== resolve),
        );
        resolve(null);
      }, 15000);
    });
  },

  showNativeNotification: ({ title, body, data, image } = {}) => {
    const imageUrl = String(image || data?.imageUrl || data?.image || "").trim();
    AppZetoBridge.send("show_notification", {
      title: title || "Notification",
      body: body || "",
      image: imageUrl,
      imageUrl,
      data: {
        ...(data || {}),
        ...(imageUrl ? { image: imageUrl, imageUrl } : {}),
      },
    });
  },
};

export default AppZetoBridge;
