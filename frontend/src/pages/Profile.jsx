import { useState } from "react";
import {
  MapPin,
  User,
  Mail,
  Navigation,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  LogOut,
  Radio,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import { getCurrentLocation } from "../services/locationService";

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleShareLocation = async () => {
    setLoading(true);
    setError("");
    setLocation(null);

    try {
      const result = await getCurrentLocation();
      setLocation(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCoords = () => {
    if (location) {
      navigator.clipboard.writeText(`${location.latitude}, ${location.longitude}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const userInitial = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <div className="profile-container">
      {/* Profile Overview Header Card */}
      <div className="profile-banner-card">
        <div className="banner-left">
          <div className="profile-big-avatar">{userInitial}</div>
          <div className="profile-titles">
            <div className="name-badge-row">
              <h2>{user?.displayName || "Community Member"}</h2>
              <span className={`status-pill ${user?.emailVerified ? "verified" : "unverified"}`}>
                {user?.emailVerified ? (
                  <>
                    <CheckCircle2 size={13} /> Verified Citizen
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} /> Unverified
                  </>
                )}
              </span>
            </div>
            <p className="profile-email-text">{user?.email}</p>
            <div className="profile-meta-tags">
              <span>● Role: Community Responder</span>
              <span>● Sector: Sector 4 (5km Node)</span>
            </div>
          </div>
        </div>

        <button className="btn-profile-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="profile-grid">
        {/* Account Details Card */}
        <div className="profile-card">
          <div className="card-header-styled">
            <div className="icon-header-badge blue">
              <User size={20} />
            </div>
            <div>
              <h3>Account Credentials</h3>
              <p>Your authentication and identity profile</p>
            </div>
          </div>

          <div className="details-list">
            <div className="detail-row">
              <div className="row-label">
                <User size={16} /> Full Name
              </div>
              <div className="row-value">{user?.displayName || "Not specified"}</div>
            </div>

            <div className="detail-row">
              <div className="row-label">
                <Mail size={16} /> Registered Email
              </div>
              <div className="row-value">{user?.email}</div>
            </div>

            <div className="detail-row">
              <div className="row-label">
                <ShieldCheck size={16} /> Account Status
              </div>
              <div className="row-value">
                <span className="badge-tag green">Active & Protected</span>
              </div>
            </div>

            <div className="detail-row">
              <div className="row-label">
                <Radio size={16} /> Dispatch Access
              </div>
              <div className="row-value">
                <span className="badge-tag blue">Direct Sector Alerts</span>
              </div>
            </div>
          </div>
        </div>

        {/* GPS Location Services Card */}
        <div className="profile-card">
          <div className="card-header-styled">
            <div className="icon-header-badge red">
              <MapPin size={20} />
            </div>
            <div>
              <h3>GPS Location Calibration</h3>
              <p>Ensure accuracy for emergency response dispatches</p>
            </div>
          </div>

          <p className="location-info-paragraph">
            Your GPS coordinates are securely encrypted. They are shared with verified nearby emergency responders only when you trigger a distress signal.
          </p>

          <button
            className="btn-calibrate-location"
            onClick={handleShareLocation}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Calibrating GPS Position...</span>
              </>
            ) : (
              <>
                <Navigation size={18} />
                <span>Calibrate & Test GPS Location</span>
              </>
            )}
          </button>

          {error && (
            <div className="profile-error-box">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {location && (
            <div className="gps-results-box">
              <div className="gps-header">
                <div className="gps-status-chip">
                  <CheckCircle2 size={15} /> Position Acquired
                </div>
                <span className="accuracy-label">
                  Accuracy: ±{Math.round(location.accuracy)} meters
                </span>
              </div>

              <div className="coords-display-grid">
                <div className="coord-item">
                  <small>LATITUDE</small>
                  <strong>{location.latitude.toFixed(6)}</strong>
                </div>
                <div className="coord-item">
                  <small>LONGITUDE</small>
                  <strong>{location.longitude.toFixed(6)}</strong>
                </div>
              </div>

              <div className="gps-actions-row">
                <button className="btn-copy-coords" onClick={handleCopyCoords}>
                  <Copy size={14} />
                  <span>{copied ? "Copied to clipboard!" : "Copy Coordinates"}</span>
                </button>

                <a
                  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-maps-link"
                >
                  <span>Google Maps</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
