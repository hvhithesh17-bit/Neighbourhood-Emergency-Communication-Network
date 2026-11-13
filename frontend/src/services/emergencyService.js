import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";

/**
 * Calculates the great-circle distance between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Broadcasts an emergency distress signal to Cloud Firestore so all nearby devices receive it.
 * @param {Object} data Emergency payload
 * @returns {Promise<Object>} Created emergency record
 */
export async function broadcastEmergency({
  type = "Critical Emergency",
  latitude,
  longitude,
  accuracy = 50,
  notes = "",
  radiusKm = 5,
}) {
  const user = auth.currentUser;
  const payload = {
    type,
    latitude: Number(latitude),
    longitude: Number(longitude),
    accuracy: Number(accuracy || 50),
    notes: notes || "",
    radiusKm: Number(radiusKm || 5),
    status: "ACTIVE",
    senderId: user ? user.uid : "anonymous",
    senderEmail: user ? user.email : "Resident",
    senderName:
      user?.displayName ||
      (user?.email ? user.email.split("@")[0] : "Community Resident"),
    createdAt: serverTimestamp(),
    timestampString: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  try {
    const docRef = await addDoc(collection(db, "emergencies"), payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error("Failed to broadcast emergency to Firestore:", error);
    throw error;
  }
}

/**
 * Subscribes to all active emergencies in real-time and filters them within a radius.
 * @param {Object|null} userCoords { latitude, longitude } of current user
 * @param {number} maxRadiusKm Filter radius in km (default 5km)
 * @param {Function} onUpdate Callback when nearby emergencies change
 * @param {Function} onError Optional error callback
 * @returns {Function} Unsubscribe function to stop listening
 */
export function subscribeToActiveEmergencies(
  userCoords,
  maxRadiusKm = 5,
  onUpdate,
  onError
) {
  try {
    const q = query(
      collection(db, "emergencies"),
      where("status", "==", "ACTIVE")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const emergencies = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const emgLat = Number(data.latitude);
          const emgLon = Number(data.longitude);

          let distanceKm = null;
          if (
            userCoords &&
            userCoords.latitude != null &&
            userCoords.longitude != null
          ) {
            const d = calculateDistanceKm(
              userCoords.latitude,
              userCoords.longitude,
              emgLat,
              emgLon
            );
            distanceKm = d != null ? Number(d.toFixed(2)) : null;
          }

          emergencies.push({
            id: docSnap.id,
            ...data,
            latitude: emgLat,
            longitude: emgLon,
            distanceKm,
            coordinates: [emgLat, emgLon],
          });
        });

        // Filter by 5km radius if user coordinates are known
        const filtered = emergencies.filter((emg) => {
          if (emg.distanceKm == null) return true; // Show until GPS locks on
          return emg.distanceKm <= maxRadiusKm;
        });

        // Sort closest first
        filtered.sort((a, b) => {
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });

        onUpdate(filtered);
      },
      (error) => {
        console.error("Firestore real-time subscription error:", error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error("Error setting up Firestore listener:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Resolves / Cancels an active emergency distress signal for ALL users across the network.
 * @param {string} emergencyId Document ID in Firestore
 * @param {Object} resolverData Optional resolver notes and metadata
 */
export async function resolveEmergency(emergencyId, resolverData = {}) {
  if (!emergencyId) return;
  try {
    const user = auth.currentUser;
    const ref = doc(db, "emergencies", emergencyId);
    await updateDoc(ref, {
      status: "RESOLVED",
      resolvedAt: serverTimestamp(),
      resolvedBy:
        user?.displayName ||
        (user?.email ? user.email.split("@")[0] : "Community Responder"),
      resolverEmail: user?.email || "verified_member",
      resolverUid: user?.uid || "anonymous",
      resolutionNote:
        resolverData.resolutionNote || "Situation verified and resolved safe.",
    });
  } catch (error) {
    console.error("Failed to resolve emergency:", error);
    throw error;
  }
}
