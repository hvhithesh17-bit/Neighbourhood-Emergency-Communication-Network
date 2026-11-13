/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker for NECN
// Handles real background push notifications when the tab is backgrounded or closed.

importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyBGdUoDSCkZffUpf0W-x7VbFG4t-K5940E",
  authDomain: "necn-emergency-network.firebaseapp.com",
  projectId: "necn-emergency-network",
  storageBucket: "necn-emergency-network.firebasestorage.app",
  messagingSenderId: "427069580424",
  appId: "1:427069580424:web:a713f38efede2777c56b3d",
};

firebase.initializeApp(firebaseConfig);

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background push:", payload);
    const notificationTitle =
      payload.notification?.title || "🚨 NECN 5KM EMERGENCY ALERT";
    const notificationOptions = {
      body:
        payload.notification?.body ||
        "An emergency has been reported within your 5km sector. Immediate response required!",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: payload.data?.emergencyId || "necn-emergency",
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn("FCM messaging background initialization notice:", err);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/emergency-map");
      }
    })
  );
});

