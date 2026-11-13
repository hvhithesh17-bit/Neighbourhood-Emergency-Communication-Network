import { useState, useEffect } from "react";
import {
  Navigation,
  Shield,
  AlertTriangle,
  Layers,
  PhoneCall,
  CheckCircle2,
  X,
} from "lucide-react";
import UserLocationMap from "../components/UserLocationMap";
import { getCurrentLocation } from "../services/locationService";
import {
  subscribeToActiveEmergencies,
  resolveEmergency,
} from "../services/emergencyService";

function EmergencyMap() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [userLocation, setUserLocation] = useState(null);
  const [emergencies, setEmergencies] = useState([]);

  // Confirmation Modal State
  const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false);
  const [resolvingTarget, setResolvingTarget] = useState(null);
  const [resolutionNote, setResolutionNote] = useState(
    "Situation verified and resolved safe."
  );
  const [resolvingInProgress, setResolvingInProgress] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  const handleRequestResolve = (emgId, fullEmg = null) => {
    const target =
      fullEmg ||
      emergencies.find((e) => e.id === emgId) || {
        id: emgId,
        type: "Distress Alert",
        senderName: "Community Member",
      };
    setResolvingTarget(target);
    setResolveConfirmOpen(true);
  };

  const handleCancelResolve = () => {
    setResolveConfirmOpen(false);
    setResolvingTarget(null);
  };

  const handleConfirmResolve = async () => {
    if (!resolvingTarget?.id) return;
    setResolvingInProgress(true);
    try {
      await resolveEmergency(resolvingTarget.id, { resolutionNote });
      setSuccessToast("Emergency resolved for all devices across the 5km network.");
      setTimeout(() => setSuccessToast(""), 5000);
    } catch (e) {
      console.error("Resolve emergency error:", e);
    } finally {
      setResolvingInProgress(false);
      setResolveConfirmOpen(false);
      setResolvingTarget(null);
    }
  };

  useEffect(() => {
    getCurrentLocation()
      .then((loc) => setUserLocation(loc))
      .catch((err) => {
        console.warn("Using default sector location:", err.message);
        setUserLocation({
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 50,
        });
      });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToActiveEmergencies(
      userLocation,
      5, // 5km radius
      (activeList) => setEmergencies(activeList),
      (err) => console.warn("Emergency map sync notice:", err.message)
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [userLocation]);

  return (
    <div className="emergency-map-page">
      {successToast && (
        <div className="resolve-success-toast">
          <CheckCircle2 size={20} />
          <span>{successToast}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <span className="badge-pill live">
            <span className="live-dot"></span> LIVE GPS RADAR (5KM MESH)
          </span>
          <h1>Community Emergency Map</h1>
          <p>
            Real-time sector overview, cross-device incident markers, and active
            responder alerts within 5km.
          </p>
        </div>

        <div className="map-quick-actions">
          <a href="tel:112" className="btn-emergency-call">
            <PhoneCall size={18} />
            <span>Emergency 112</span>
          </a>
        </div>
      </div>

      <div className="map-control-bar">
        <div className="filter-chips">
          <button
            className={`filter-chip ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            <Layers size={15} /> All Sectors ({emergencies.length})
          </button>
          <button
            className={`filter-chip ${activeFilter === "safe" ? "active" : ""}`}
            onClick={() => setActiveFilter("safe")}
          >
            <Shield size={15} /> Safe Havens
          </button>
          <button
            className={`filter-chip ${
              activeFilter === "alerts" ? "active" : ""
            }`}
            onClick={() => setActiveFilter("alerts")}
          >
            <AlertTriangle size={15} /> Active Alerts ({emergencies.length})
          </button>
        </div>

        <div className="radar-status">
          <Navigation size={15} />
          <span>
            Active Radius: <strong>5 km radius</strong>
          </span>
        </div>
      </div>

      <div className="map-view-card">
        <UserLocationMap
          emergencies={emergencies}
          onResolve={handleRequestResolve}
        />
      </div>

      <div className="map-legend-grid">
        <div className="legend-item">
          <span className="legend-indicator blue"></span>
          <div>
            <h4>Your GPS Location</h4>
            <p>High-accuracy device position</p>
          </div>
        </div>
        <div className="legend-item">
          <span className="legend-indicator green"></span>
          <div>
            <h4>Safe Zone</h4>
            <p>Verified medical & police stations</p>
          </div>
        </div>
        <div className="legend-item">
          <span className="legend-indicator red"></span>
          <div>
            <h4>Active SOS Perimeter ({emergencies.length})</h4>
            <p>Incidents broadcasted by nearby devices</p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Modal Before Resolving */}
      {resolveConfirmOpen && resolvingTarget && (
        <div className="modal-backdrop">
          <div className="resolve-confirm-card">
            <button className="modal-close-btn" onClick={handleCancelResolve}>
              <X size={20} />
            </button>

            <div className="resolve-icon-badge">
              <CheckCircle2 size={38} />
            </div>

            <h2>Confirm Emergency Resolution</h2>
            <p className="resolve-subtitle">
              Are you sure you want to mark this emergency as <strong>RESOLVED</strong>?
              This will clear the distress beacon for <strong>all community members and responders</strong> across the 5km network.
            </p>

            <div className="incident-preview-box">
              <div>
                <strong>Incident:</strong>{" "}
                {resolvingTarget.type || "Distress Alert"}
              </div>
              <div>
                <strong>Reported By:</strong>{" "}
                {resolvingTarget.senderName || "Community Member"}
              </div>
              <div>
                <strong>Location:</strong>{" "}
                {resolvingTarget.distanceKm != null
                  ? `${resolvingTarget.distanceKm} km away`
                  : "Within 5km Sector"}
              </div>
              {resolvingTarget.timestamp && (
                <div>
                  <strong>Reported At:</strong> {resolvingTarget.timestamp}
                </div>
              )}
            </div>

            <label
              className="resolution-options-label"
              htmlFor="map-resolution-note-select"
            >
              Select Resolution Reason:
            </label>
            <select
              id="map-resolution-note-select"
              className="resolution-select"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
            >
              <option value="Situation verified and resolved safe.">
                ✅ Situation Handled & Verified Safe
              </option>
              <option value="Medical assistance / responders attended.">
                🚑 Medical Team / First Responders Attended
              </option>
              <option value="Emergency services (112) arrived on scene.">
                🚓 Official Emergency Services (112) on Scene
              </option>
              <option value="False alarm / test resolved safely.">
                ⚠️ False Alarm / Cleared Safely
              </option>
            </select>

            <div className="resolve-modal-actions">
              <button
                type="button"
                className="btn-resolve-cancel"
                onClick={handleCancelResolve}
                disabled={resolvingInProgress}
              >
                Cancel (Keep Active)
              </button>
              <button
                type="button"
                className="btn-resolve-confirm"
                onClick={handleConfirmResolve}
                disabled={resolvingInProgress}
              >
                <CheckCircle2 size={16} />
                <span>
                  {resolvingInProgress
                    ? "Resolving for All..."
                    : "Yes, Resolve for Everyone"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmergencyMap;
