import { useState, useEffect, Fragment } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { CheckCircle2, LocateFixed, Radio } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { resolveEmergency } from "../services/emergencyService";

// Fix default Leaflet user marker images in Vite
const userIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// High-visibility Red Emergency Marker
const emergencyIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapUpdater({ position, emergencyPosition }) {
  const map = useMap();

  useEffect(() => {
    if (emergencyPosition) {
      map.setView(emergencyPosition, 15, { animate: true });
    } else if (position) {
      map.setView(position, 15, { animate: true });
    }
  }, [map, position, emergencyPosition]);

  return null;
}

function UserLocationMap({
  emergencyLocation = null,
  emergencyType = "Emergency SOS",
  emergencyDetails = null,
  emergencies = [],
  onResolve = null,
}) {
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(0);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState(null);

  // Determine list of emergencies to display on map
  let activeEmergenciesList = [];

  if (Array.isArray(emergencies) && emergencies.length > 0) {
    activeEmergenciesList = emergencies.map((item) => {
      const lat = item.latitude != null ? item.latitude : item.coordinates?.[0];
      const lng = item.longitude != null ? item.longitude : item.coordinates?.[1];
      return {
        id: item.id || `${lat}-${lng}`,
        type: item.type || "Distress Alert",
        coordinates: [lat, lng],
        accuracy: item.accuracy || 50,
        distanceKm: item.distanceKm,
        senderName: item.senderName || "Community Member",
        timestamp: item.timestampString || item.timestamp || "Active",
        radiusKm: item.radiusKm || 0.5,
      };
    });
  } else if (emergencyLocation) {
    activeEmergenciesList = [
      {
        id: emergencyDetails?.id || "local-sos",
        type: emergencyType,
        coordinates: emergencyLocation,
        accuracy: emergencyDetails?.accuracy || 50,
        distanceKm: emergencyDetails?.distanceKm || null,
        senderName: emergencyDetails?.senderName || "You",
        timestamp: emergencyDetails?.timestamp || "Just now",
        radiusKm: 0.5,
      },
    ];
  } else {
    try {
      const saved = sessionStorage.getItem("necn_active_sos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.coordinates) {
          activeEmergenciesList = [
            {
              id: parsed.id || "saved-sos",
              type: parsed.type || "Distress Alert",
              coordinates: parsed.coordinates,
              accuracy: parsed.accuracy || 50,
              distanceKm: null,
              senderName: parsed.senderName || "Local Session",
              timestamp: parsed.timestamp || "Active",
              radiusKm: 0.5,
            },
          ];
        }
      }
    } catch {
      // ignore JSON parse errors
    }
  }

  function findMyLocation() {
    if (!navigator.geolocation) {
      setError("GPS is not supported by this browser.");
      return;
    }

    setError("");

    navigator.geolocation.getCurrentPosition(
      (result) => {
        const coordinates = [
          result.coords.latitude,
          result.coords.longitude,
        ];

        setPosition(coordinates);
        setAccuracy(result.coords.accuracy);
      },
      () => {
        setError("Unable to access your location. Check GPS permission.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  const handleResolveClick = async (emgId) => {
    setResolvingId(emgId);
    try {
      if (onResolve) {
        const fullEmg = activeEmergenciesList.find((e) => e.id === emgId);
        await onResolve(emgId, fullEmg);
      } else if (emgId) {
        await resolveEmergency(emgId);
      }
    } catch (err) {
      console.error("Resolve click failed:", err);
    } finally {
      setResolvingId(null);
    }
  };

  // Focus on first emergency or user's position
  const primaryEmergencyCoords =
    activeEmergenciesList.length > 0
      ? activeEmergenciesList[0].coordinates
      : null;

  const initialCenter = primaryEmergencyCoords || position || [12.9716, 77.5946];
  const initialZoom = primaryEmergencyCoords || position ? 15 : 13;

  return (
    <div className="user-location-map">
      <div className="map-toolbar">
        <div className="map-toolbar-status">
          {activeEmergenciesList.length > 0 ? (
            <span className="map-status-pill active-alert">
              🚨 {activeEmergenciesList.length} Active Emergency Signal
              {activeEmergenciesList.length > 1 ? "s" : ""} in 5km Sector
            </span>
          ) : (
            <span className="map-status-pill">
              <Radio size={14} color="#10b981" />
              <span>GPS Sector Mesh: All Clear</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={findMyLocation}
          className="btn-find-location"
          title="Center map on your device coordinates"
        >
          <LocateFixed size={15} />
          <span>Find My Location</span>
        </button>
      </div>

      {error && <p className="location-error">{error}</p>}

      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={true}
        style={{ height: "450px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater
          position={position}
          emergencyPosition={primaryEmergencyCoords}
        />

        {/* User Standard Location Marker (Blue) */}
        {position && (
          <Fragment key="user-marker-group">
            <Marker position={position} icon={userIcon}>
              <Popup>
                <div style={{ textAlign: "center", padding: "4px" }}>
                  <strong>Your Device Position</strong>
                  <br />
                  <small>Accuracy: ±{Math.round(accuracy)}m</small>
                </div>
              </Popup>
            </Marker>

            <Circle
              center={position}
              radius={accuracy || 50}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#3b82f6",
                fillOpacity: 0.15,
              }}
            />
          </Fragment>
        )}

        {/* Real-time Emergency Markers across all devices */}
        {activeEmergenciesList.map((emg) => (
          <Fragment key={emg.id}>
            <Marker position={emg.coordinates} icon={emergencyIcon}>
              <Popup>
                <div
                  style={{
                    textAlign: "center",
                    padding: "6px",
                    minWidth: "175px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      background: "#ffe4e6",
                      color: "#e11d48",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: "800",
                      marginBottom: "4px",
                    }}
                  >
                    🚨 ACTIVE EMERGENCY
                  </span>
                  <h4
                    style={{
                      margin: "4px 0",
                      color: "#0f172a",
                      fontSize: "14px",
                    }}
                  >
                    {emg.type}
                  </h4>
                  {emg.distanceKm != null && (
                    <p
                      style={{
                        margin: "3px 0",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#e11d48",
                      }}
                    >
                      📍 {emg.distanceKm} km from you
                    </p>
                  )}
                  <p
                    style={{
                      margin: "2px 0",
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    By: {emg.senderName}
                  </p>
                  <p
                    style={{
                      margin: "2px 0",
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    Time: {emg.timestamp}
                  </p>
                  <small
                    style={{
                      display: "block",
                      color: "#94a3b8",
                      fontSize: "10px",
                      marginBottom: "6px",
                    }}
                  >
                    {emg.coordinates[0].toFixed(5)},{" "}
                    {emg.coordinates[1].toFixed(5)}
                  </small>

                  {/* Resolved Button inside Marker Popup */}
                  <button
                    type="button"
                    className="btn-map-resolve"
                    disabled={resolvingId === emg.id}
                    onClick={() => handleResolveClick(emg.id)}
                    title="Mark this emergency as resolved"
                  >
                    <CheckCircle2 size={13} />
                    <span>
                      {resolvingId === emg.id ? "Resolving..." : "Mark as Resolved"}
                    </span>
                  </button>
                </div>
              </Popup>
            </Marker>

            {/* Red Alert Perimeter Circle (500m radius) */}
            <Circle
              center={emg.coordinates}
              radius={500}
              pathOptions={{
                color: "#e11d48",
                fillColor: "#f43f5e",
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          </Fragment>
        ))}
      </MapContainer>
    </div>
  );
}

export default UserLocationMap;
