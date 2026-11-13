import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";

// Track IDs of emergencies that have already fired a system notification on this device
const notifiedEmergencyIds = new Set();

/**
 * Checks whether the Web Notification API is supported by the current browser.
 */
export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Gets the current notification permission status ("default", "granted", "denied", or "unsupported").
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Requests permission from the user to display real OS-level notifications.
 * @returns {Promise<string>} Permission result ('granted', 'denied', or 'default')
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    console.warn("Notifications are not supported in this browser environment.");
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();

    // Register Service Worker if supported for background push
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((reg) => {
          console.log("NECN Emergency Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("Service Worker registration notice:", err.message);
        });
    }

    return permission;
  } catch (error) {
    console.error("Failed to request notification permission:", error);
    return "denied";
  }
}

/**
 * Synthesizes an emergency alarm siren using the Web Audio API.
 * Operates purely in-memory with zero external audio assets.
 */
export function playEmergencyAlertSound() {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    const now = ctx.currentTime;

    // Siren frequency alternation: 880Hz <-> 587Hz (Two-tone emergency chirp)
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(587, now + 0.22);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.45);
    osc.frequency.exponentialRampToValueAtTime(587, now + 0.68);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.9);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.15);
  } catch (err) {
    console.warn("Audio alarm playback error:", err.message);
  }
}

/**
 * Registers the user's current GPS location and device status in Firestore
 * so the backend and network know who is registered within 5km.
 * @param {Object} coords { latitude, longitude, accuracy }
 */
export async function registerUserDeviceLocation(coords) {
  const user = auth.currentUser;
  if (!user || !coords) return;

  try {
    const userRef = doc(db, "registered_users", user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email,
        displayName:
          user.displayName || user.email?.split("@")[0] || "Community Member",
        latitude: Number(coords.latitude),
        longitude: Number(coords.longitude),
        accuracy: Number(coords.accuracy || 50),
        notificationPermission: getNotificationPermission(),
        isOnline: true,
        lastActive: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Could not register user device location:", error.message);
  }
}

/**
 * Fires a REAL OS-level notification and audio siren on this device
 * when an emergency occurs within 5km range.
 * @param {Object} emergency Emergency object
 */
export function sendRealNotification(emergency) {
  if (!emergency || !emergency.id) return;

  // Prevent duplicate notification alerts for the same incident ID
  if (notifiedEmergencyIds.has(emergency.id)) {
    return;
  }
  notifiedEmergencyIds.add(emergency.id);

  // 1. Play audible siren chirp
  playEmergencyAlertSound();

  // 2. Fire OS-level Desktop / Mobile notification if permission granted
  if (isNotificationSupported() && Notification.permission === "granted") {
    try {
      const distanceDisplay =
        emergency.distanceKm != null
          ? `${emergency.distanceKm} km away`
          : "within 5km sector";

      const title = `🚨 NECN EMERGENCY: ${emergency.type || "Distress Signal"}`;
      const body = `CRITICAL ALERT: ${emergency.type} reported ${distanceDisplay} by ${
        emergency.senderName || "Neighbour"
      }. Tap to view location on radar map.`;

      const notification = new Notification(title, {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: `necn-alert-${emergency.id}`,
        renotify: true,
        requireInteraction: true, // Persists on screen until user clicks/dismisses
        vibrate: [300, 100, 300, 100, 300],
      });

      notification.onclick = () => {
        window.focus();
        const mapElem = document.getElementById("radar-map-card");
        if (mapElem) {
          mapElem.scrollIntoView({ behavior: "smooth" });
        } else {
          window.location.href = "/emergency-map";
        }
        notification.close();
      };
    } catch (err) {
      console.warn("Native Notification trigger error:", err);
    }
  }
}

