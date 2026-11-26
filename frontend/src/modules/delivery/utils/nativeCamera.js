/**
 * Native camera capture for proof-of-delivery / pickup photos.
 *
 * WHY: Inside the Flutter InAppWebView wrapper, `<input type="file" capture>`
 * hands control to the external system Camera app. While that (memory-heavy)
 * app is in the foreground, Android's low-memory killer frequently kills our
 * backgrounded Flutter + WebView process. When the rider returns, Android
 * cold-starts the app — the "auto restart" — and the captured photo is lost.
 *
 * The wrapper already exposes an in-app `openCamera` JS handler (used by the
 * delivery/seller signup and customer profile flows) that returns the photo as
 * base64 without the WebView file-chooser round-trip. Use it when available.
 *
 * Returns:
 *   { handled: false }               → no native bridge (or bridge call failed):
 *                                      caller should fall back to the <input>.
 *   { handled: true, file }          → photo captured.
 *   { handled: true, error }         → native side reported an error.
 *   { handled: true }                → user cancelled.
 */
export async function captureFromNativeCamera() {
  if (
    typeof window === "undefined" ||
    !window.flutter_inappwebview ||
    typeof window.flutter_inappwebview.callHandler !== "function"
  ) {
    return { handled: false };
  }

  let response;
  try {
    response = await window.flutter_inappwebview.callHandler("openCamera");
  } catch (err) {
    console.error("Native camera handler error:", err);
    return { handled: false };
  }

  if (response && response.success && response.base64) {
    const mimeType = response.mimeType || "image/jpeg";
    const byteString = atob(response.base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    const file = new File([bytes], response.fileName || `proof_${Date.now()}.jpg`, {
      type: mimeType,
    });
    return { handled: true, file };
  }

  if (response && response.error) {
    return { handled: true, error: String(response.error) };
  }

  return { handled: true };
}
