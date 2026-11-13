
// Get the user's current location only after permission is granted.
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Location permission was denied."));
            break;

          case error.POSITION_UNAVAILABLE:
            reject(new Error("Your location is currently unavailable."));
            break;

          case error.TIMEOUT:
            reject(new Error("Location request timed out."));
            break;

          default:
            reject(new Error("Unable to retrieve your location."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}
