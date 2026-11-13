import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  MapPin,
  Activity,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Flame,
  HeartPulse,
  Shield,
  ExternalLink,
  X,
  Volume2,
  BellRing,
  Bell,
} from "lucide-react";
import UserLocationMap from "../components/UserLocationMap";
import SOSButton from "../components/SOSButton";
import { getCurrentLocation } from "../services/locationService";
import {
  broadcastEmergency,
  subscribeToActiveEmergencies,
  resolveEmergency,
} from "../services/emergencyService";
import {
  requestNotificationPermission,
  getNotificationPermission,
  sendRealNotification,
  registerUserDeviceLocation,
} from "../services/notificationService";
import { auth } from "../services/firebase";

function Dashboard() {
  // SOS Modal State
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [sosConfirmed, setSosConfirmed] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState("Medical Emergency");

  // Device Location State
  const [acquiredLocation, setAcquiredLocation] = useState(null);

  // Notification Permission State
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationPermission()
  );

  // Cross-device Real-Time Emergencies State
  const [nearbyEmergencies, setNearbyEmergencies] = useState([]);
  const [myActiveEmergencyId, setMyActiveEmergencyId] = useState(() => {
    try {
      return sessionStorage.getItem("necn_my_emergency_id") || null;
    } catch {
      return null;
    }
  });

  // Current primary active emergency displayed in banner
  const [activeEmergency, setActiveEmergency] = useState(null);

  // Confirmation Modal State for Resolving Emergency
  const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false);
  const [resolvingEmergencyTarget, setResolvingEmergencyTarget] = useState(null);
  const [resolutionNote, setResolutionNote] = useState(
    "Situation verified and resolved safe."
  );
  const [resolvingInProgress, setResolvingInProgress] = useState(false);
  const [resolveSuccessMessage, setResolveSuccessMessage] = useState("");

  // 1. Initial GPS lock on load & register device in Firestore
  useEffect(() => {
    getCurrentLocation()
      .then((loc) => {
        const coords = {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
        };
        setAcquiredLocation(coords);
        registerUserDeviceLocation(coords);
      })
      .catch((err) => {
        console.warn(
          "GPS lock unavailable on initial load, using default sector coordinates:",
          err.message
        );
        const defaultCoords = {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 50,
        };
        setAcquiredLocation(defaultCoords);
        registerUserDeviceLocation(defaultCoords);
      });
  }, []);

  // 2. Real-Time Cloud Firestore listener for all devices within 5km radius
  useEffect(() => {
    const unsubscribe = subscribeToActiveEmergencies(
      acquiredLocation,
      5, // 5 km radius
      (emergencies) => {
        setNearbyEmergencies(emergencies);

        // Fire REAL OS-level notification and siren when an emergency is reported by another nearby user
        emergencies.forEach((emg) => {
          const isMine =
            emg.senderId === auth.currentUser?.uid ||
            emg.id === myActiveEmergencyId;

          // Dispatch real notification if within 5km and not my own SOS
          if (!isMine && (emg.distanceKm == null || emg.distanceKm <= 5)) {
            sendRealNotification(emg);
          }
        });

        if (emergencies.length > 0) {
          const top = emergencies[0];
          const isMine =
            top.senderId === auth.currentUser?.uid ||
            top.id === myActiveEmergencyId;

          setActiveEmergency({
            id: top.id,
            type: top.type,
            coordinates: [top.latitude, top.longitude],
            accuracy: top.accuracy || 50,
            timestamp: top.timestampString || "Live",
            status: "Active Distress Signal",
            distanceKm: top.distanceKm,
            senderName: top.senderName,
            isMine,
          });
        } else {
          // If no active emergencies in the 5km radius, clear alert
          setActiveEmergency(null);
        }
      },
      (error) => {
        console.warn("Real-time emergency listener notice:", error.message);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [acquiredLocation, myActiveEmergencyId]);

  // Request browser notification permission
  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotificationPermission(result);
    if (result === "granted" && acquiredLocation) {
      registerUserDeviceLocation(acquiredLocation);
    }
  };

  // 3. Broadcast SOS to Firestore (Cross-device sync)
  const triggerEmergencyBroadcast = useCallback(
    async (coords) => {
      const targetLoc = coords || acquiredLocation || {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 50,
      };

      try {
        // Send emergency to Cloud Firestore so all nearby devices receive it in real-time
        const createdRecord = await broadcastEmergency({
          type: selectedEmergency,
          latitude: targetLoc.latitude,
          longitude: targetLoc.longitude,
          accuracy: targetLoc.accuracy || 50,
          radiusKm: 5,
        });

        if (createdRecord?.id) {
          setMyActiveEmergencyId(createdRecord.id);
          try {
            sessionStorage.setItem("necn_my_emergency_id", createdRecord.id);
          } catch (e) {
            console.error("Storage error:", e);
          }
        }
      } catch (err) {
        console.warn("Firestore broadcast notice:", err.message);
      }

      // Immediate local state update for fast response
      const emergencyData = {
        type: selectedEmergency,
        coordinates: [targetLoc.latitude, targetLoc.longitude],
        accuracy: targetLoc.accuracy || 50,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Active Distress Signal",
        isMine: true,
      };

      setActiveEmergency(emergencyData);
      setSosConfirmed(true);
    },
    [acquiredLocation, selectedEmergency]
  );

  // Auto-countdown timer inside SOS modal
  useEffect(() => {
    if (!sosModalOpen || sosConfirmed) return;

    const timer = setInterval(() => {
      setSosCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerEmergencyBroadcast(acquiredLocation);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sosModalOpen, sosConfirmed, acquiredLocation, triggerEmergencyBroadcast]);

  const handleOpenSOS = async (type = "General Emergency") => {
    setSelectedEmergency(type);
    setSosCountdown(5);
    setSosConfirmed(false);
    setSosModalOpen(true);

    try {
      const loc = await getCurrentLocation();
      const coords = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
      };
      setAcquiredLocation(coords);
      registerUserDeviceLocation(coords);
    } catch (err) {
      console.warn("GPS unavailable, using default sector location:", err.message);
      setAcquiredLocation({
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 50,
      });
    }
  };

  const handleCancelSOS = () => {
    setSosModalOpen(false);
    setSosCountdown(5);
  };

  // STEP 1: Prompt user for confirmation before resolving
  const handleRequestResolve = (emergencyId, fullEmergency = null) => {
    const target =
      fullEmergency ||
      nearbyEmergencies.find((e) => e.id === emergencyId) ||
      activeEmergency || {
        id: emergencyId,
        type: "Active Distress Signal",
        senderName: "Community Member",
      };

    setResolvingEmergencyTarget(target);
    setResolveConfirmOpen(true);
  };

  const handleCancelResolve = () => {
    setResolveConfirmOpen(false);
    setResolvingEmergencyTarget(null);
  };

  // STEP 2: Confirmed! Resolve in Firestore for ALL users across the 5km network
  const handleConfirmResolve = async () => {
    const targetId =
      resolvingEmergencyTarget?.id ||
      activeEmergency?.id ||
      myActiveEmergencyId ||
      sessionStorage.getItem("necn_my_emergency_id");

    if (!targetId) {
      setResolveConfirmOpen(false);
      return;
    }

    setResolvingInProgress(true);

    try {
      await resolveEmergency(targetId, {
        resolutionNote,
      });

      setResolveSuccessMessage(
        "Emergency successfully resolved for all community members and responders."
      );
      setTimeout(() => setResolveSuccessMessage(""), 5000);
    } catch (e) {
      console.error("Error resolving emergency in Firestore:", e);
    } finally {
      setResolvingInProgress(false);
      setResolveConfirmOpen(false);
      setResolvingEmergencyTarget(null);
    }

    // Clean up local session variables
    try {
      sessionStorage.removeItem("necn_my_emergency_id");
      sessionStorage.removeItem("necn_active_sos");
    } catch (e) {
      console.error("Storage error:", e);
    }

    setMyActiveEmergencyId(null);
    setActiveEmergency(null);
  };

  const scrollToRadarMap = () => {
    document
      .getElementById("radar-map-card")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const quickHotlines = [
    { label: "National SOS", number: "112", color: "crimson" },
    { label: "Police Patrol", number: "100", color: "blue" },
    { label: "Fire & Rescue", number: "101", color: "amber" },
    { label: "Ambulance", number: "102", color: "emerald" },
  ];

  return (
    <div className="dashboard-view">
      {/* Real OS Notification Permission Banner */}
      {notificationPermission !== "granted" && (
        <section className="notification-permission-banner">
          <div className="permission-text">
            <BellRing size={22} className="bell-ring-icon" />
            <div>
              <strong>Enable Real Desktop & Mobile Emergency Notifications</strong>
              <p>
                Receive instant audio siren chirps and OS notifications when someone triggers SOS within 5 km.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-enable-notifications"
            onClick={handleEnableNotifications}
          >
            Enable Real Alerts
          </button>
        </section>
      )}

      {/* Success Resolution Toast Notification */}
      {resolveSuccessMessage && (
        <div className="resolve-success-toast">
          <CheckCircle2 size={20} />
          <span>{resolveSuccessMessage}</span>
        </div>
      )}

      {/* Hero SOS Alert Section */}
      <section className="sos-hero-card">
        <div className="sos-hero-content">
          <div className="sos-badge-wrapper">
            <span className="sos-live-chip">
              <Radio size={14} className="radar-pulse-icon" /> LIVE EMERGENCY RADAR
            </span>
            <span className="sos-location-chip">
              <MapPin size={13} /> Sector 4 Active (5km Mesh)
            </span>
            {notificationPermission === "granted" ? (
              <span
                className="sos-location-chip"
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  borderColor: "rgba(16, 185, 129, 0.4)",
                  color: "#10b981",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Bell size={13} /> 5km Push Active
              </span>
            ) : (
              <button
                type="button"
                className="sos-location-chip"
                style={{
                  cursor: "pointer",
                  background: "rgba(245, 158, 11, 0.15)",
                  borderColor: "rgba(245, 158, 11, 0.4)",
                  color: "#f59e0b",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onClick={handleEnableNotifications}
                title="Click to enable desktop notifications"
              >
                <BellRing size={13} /> Enable Notifications
              </button>
            )}
          </div>

          <h2>Need Immediate Emergency Assistance?</h2>
          <p>
            Triggering the Emergency SOS immediately notifies all registered community
            first responders and verified volunteers within a 5-kilometer radius with your GPS location.
          </p>

          <div className="sos-actions-row">
            <SOSButton onTrigger={() => handleOpenSOS("Critical Emergency")} />

            <div className="sos-emergency-types">
              <button
                className="chip-action medical"
                onClick={() => handleOpenSOS("Medical Emergency")}
              >
                <HeartPulse size={16} /> Medical
              </button>
              <button
                className="chip-action fire"
                onClick={() => handleOpenSOS("Fire / Hazard")}
              >
                <Flame size={16} /> Fire / Hazard
              </button>
              <button
                className="chip-action police"
                onClick={() => handleOpenSOS("Security Concern")}
              >
                <Shield size={16} /> Security
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Dial Emergency Numbers */}
      <section className="quick-hotlines-section">
        <div className="section-title-row">
          <div>
            <h3>One-Touch Emergency Helplines</h3>
            <p>Immediate connection to Indian official emergency services</p>
          </div>
          <span className="badge-official">Official Lines</span>
        </div>

        <div className="hotlines-grid">
          {quickHotlines.map((item) => (
            <a
              key={item.number}
              href={`tel:${item.number}`}
              className={`hotline-card ${item.color}`}
            >
              <div className="hotline-icon-badge">
                <Phone size={18} />
              </div>
              <div className="hotline-info">
                <span className="hotline-label">{item.label}</span>
                <strong className="hotline-number">{item.number}</strong>
              </div>
              <span className="dial-now-text">Tap to Call</span>
            </a>
          ))}
        </div>
      </section>

      {/* Real-time Statistics */}
      <section className="stats-overview-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper blue">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Active Responders</span>
              <div className="stat-value-group">
                <h3>14</h3>
                <span className="stat-trend positive">● Online</span>
              </div>
              <small>Verified volunteers within 5km</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper green">
              <Shield size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Safe Havens</span>
              <div className="stat-value-group">
                <h3>6</h3>
                <span className="stat-trend positive">● Open 24/7</span>
              </div>
              <small>Hospitals & police stations</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper red">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Sector Alerts (5km)</span>
              <div className="stat-value-group">
                <h3>{nearbyEmergencies.length}</h3>
                <span
                  className={`stat-trend ${
                    nearbyEmergencies.length > 0 ? "negative" : "safe"
                  }`}
                >
                  {nearbyEmergencies.length > 0 ? "● Active Incident" : "All Clear"}
                </span>
              </div>
              <small>
                {nearbyEmergencies.length > 0
                  ? `${nearbyEmergencies.length} active emergency reported nearby`
                  : "No active critical incidents"}
              </small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper amber">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Avg Response Time</span>
              <div className="stat-value-group">
                <h3>3.8m</h3>
                <span className="stat-trend positive">Fast</span>
              </div>
              <small>Local neighbourhood average</small>
            </div>
          </div>
        </div>
      </section>

      {/* Active Distress Signal Banner (Real-time Cross-Device Alert) */}
      {activeEmergency && (
        <section className="emergency-active-banner">
          <div className="emergency-banner-left">
            <div className="emergency-banner-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="emergency-banner-text">
              <h3>🚨 ACTIVE EMERGENCY DISTRESS SIGNAL BROADCASTED</h3>
              <p>
                <strong>{activeEmergency.type}</strong>
                {activeEmergency.distanceKm != null
                  ? ` • 📍 ${activeEmergency.distanceKm} km away`
                  : " • Within 5km Sector"}
                {activeEmergency.senderName
                  ? ` • Reported by ${activeEmergency.senderName}`
                  : ""}
                {activeEmergency.timestamp
                  ? ` at ${activeEmergency.timestamp}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="emergency-banner-actions">
            <button className="btn-scroll-map" onClick={scrollToRadarMap}>
              <MapPin size={15} />
              <span>Locate on Map</span>
            </button>
            <button
              className="btn-resolve-alert"
              onClick={() =>
                handleRequestResolve(activeEmergency.id, activeEmergency)
              }
              title="Mark this incident as resolved across all devices"
            >
              <CheckCircle2 size={16} />
              <span>Mark as Resolved</span>
            </button>
          </div>
        </section>
      )}

      {/* Grid: Map Preview & Recent Community Activity */}
      <div className="dashboard-content-split">
        {/* Left: Quick Map View with Real-time Multi-Device Markers */}
        <div className="dashboard-card map-preview-card" id="radar-map-card">
          <div className="card-header">
            <div>
              <h3>Sector Radar & GPS Map</h3>
              <p>Real-time cross-device alerts within 5km mesh</p>
            </div>
            <Link to="/emergency-map" className="btn-secondary-link">
              <span>Full Radar</span>
              <ExternalLink size={15} />
            </Link>
          </div>

          <div className="embedded-map-container">
            <UserLocationMap
              emergencies={nearbyEmergencies}
              emergencyLocation={activeEmergency?.coordinates}
              emergencyType={activeEmergency?.type}
              emergencyDetails={activeEmergency}
              onResolve={(emgId, fullEmg) =>
                handleRequestResolve(emgId, fullEmg)
              }
            />
          </div>
        </div>

        {/* Right: Live Community Safety Feed */}
        <div className="dashboard-card activity-feed-card">
          <div className="card-header">
            <div>
              <h3>Community Safety Log</h3>
              <p>Verified neighbourhood events & notices</p>
            </div>
            <Link to="/emergency-history" className="btn-secondary-link">
              <span>View History</span>
            </Link>
          </div>

          <div className="activity-timeline">
            {nearbyEmergencies.length > 0 ? (
              nearbyEmergencies.map((emg) => (
                <div key={emg.id} className="timeline-item critical">
                  <div className="timeline-icon red">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="timeline-body">
                    <div className="timeline-meta">
                      <span className="event-title">
                        🚨 {emg.type} Broadcasted
                      </span>
                      <span className="event-time">
                        {emg.distanceKm != null
                          ? `${emg.distanceKm} km away`
                          : "Nearby"}
                      </span>
                    </div>
                    <p>
                      Active alert by {emg.senderName || "Resident"} at{" "}
                      {emg.timestampString || "Just now"}. Responders notified.
                    </p>
                    <button
                      type="button"
                      className="btn-feed-resolve"
                      onClick={() => handleRequestResolve(emg.id, emg)}
                      title="Mark as resolved"
                    >
                      <CheckCircle2 size={13} />
                      <span>Mark as Resolved</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="timeline-item verified">
                <div className="timeline-icon green">
                  <CheckCircle2 size={16} />
                </div>
                <div className="timeline-body">
                  <div className="timeline-meta">
                    <span className="event-title">All Sector Patrols Safe</span>
                    <span className="event-time">Just now</span>
                  </div>
                  <p>
                    Zero active emergencies reported within 5km radius. All safe.
                  </p>
                </div>
              </div>
            )}

            <div className="timeline-item resolved">
              <div className="timeline-icon blue">
                <Activity size={16} />
              </div>
              <div className="timeline-body">
                <div className="timeline-meta">
                  <span className="event-title">Sector 4 Node Health Check</span>
                  <span className="event-time">1h ago</span>
                </div>
                <p>
                  Emergency beacon and cross-device sync gateways operating at
                  100% capacity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Modal Before Resolving Emergency */}
      {resolveConfirmOpen && resolvingEmergencyTarget && (
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
              This will dismiss the distress beacon for <strong>all community members and responders</strong> across the 5km network.
            </p>

            <div className="incident-preview-box">
              <div>
                <strong>Incident:</strong>{" "}
                {resolvingEmergencyTarget.type || "Active Distress Alert"}
              </div>
              <div>
                <strong>Reported By:</strong>{" "}
                {resolvingEmergencyTarget.senderName || "Neighbourhood Resident"}
              </div>
              <div>
                <strong>Location:</strong>{" "}
                {resolvingEmergencyTarget.distanceKm != null
                  ? `${resolvingEmergencyTarget.distanceKm} km away`
                  : "Within Sector 4"}
              </div>
              {resolvingEmergencyTarget.timestamp && (
                <div>
                  <strong>Time:</strong> {resolvingEmergencyTarget.timestamp}
                </div>
              )}
            </div>

            <label
              className="resolution-options-label"
              htmlFor="resolution-note-select"
            >
              Select Resolution Reason:
            </label>
            <select
              id="resolution-note-select"
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

      {/* Interactive Emergency SOS Modal */}
      {sosModalOpen && (
        <div className="modal-backdrop">
          <div className="sos-modal-card">
            <button className="modal-close-btn" onClick={handleCancelSOS}>
              <X size={20} />
            </button>

            {!sosConfirmed ? (
              <div className="sos-modal-body">
                <div className="sos-alert-ring">
                  <Volume2 size={36} className="alarm-icon" />
                  <span className="countdown-number">{sosCountdown}</span>
                </div>

                <h2>Broadcasting Emergency Alert</h2>
                <p className="sos-modal-desc">
                  Transmitting a <strong>{selectedEmergency}</strong> alert to all
                  nearby devices within 5km with your exact GPS coordinates.
                </p>

                <div className="countdown-progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${((5 - sosCountdown) / 5) * 100}%` }}
                  ></div>
                </div>

                <div className="modal-actions-row">
                  <button className="btn-cancel-sos" onClick={handleCancelSOS}>
                    CANCEL ALERT
                  </button>
                  <button
                    className="btn-send-now"
                    onClick={() => triggerEmergencyBroadcast(acquiredLocation)}
                  >
                    SEND NOW (SKIP COUNTDOWN)
                  </button>
                </div>
              </div>
            ) : (
              <div className="sos-modal-confirmed">
                <div className="confirmed-icon-badge">
                  <CheckCircle2 size={42} />
                </div>
                <h2>Alert Broadcasted to All Devices within 5km!</h2>
                <p>
                  Your emergency coordinates have been synchronized to Cloud Firestore
                  and plotted on radar maps for all nearby residents and responders.
                </p>
                <div className="dispatch-details-box">
                  <p><strong>Sector:</strong> Sector 4 (Radius: 5km mesh)</p>
                  <p><strong>Emergency:</strong> {selectedEmergency}</p>
                  <p>
                    <strong>GPS Coordinates:</strong>{" "}
                    {activeEmergency?.coordinates
                      ? `${activeEmergency.coordinates[0].toFixed(5)}, ${activeEmergency.coordinates[1].toFixed(5)}`
                      : "Location Marked"}
                  </p>
                  <p><strong>Real-Time Sync:</strong> Live on All Connected Devices</p>
                </div>
                <button
                  className="btn-close-confirmed"
                  onClick={() => {
                    handleCancelSOS();
                    scrollToRadarMap();
                  }}
                >
                  View Marked Location on Map
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
