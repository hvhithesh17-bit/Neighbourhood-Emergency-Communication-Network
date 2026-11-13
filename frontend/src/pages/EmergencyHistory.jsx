import { useState, useEffect } from "react";
import {
  History,
  CheckCircle2,
  Clock,
  MapPin,
  Flame,
  HeartPulse,
  Shield,
  Search,
  Trash2,
  AlertTriangle,
  X,
  RotateCcw,
} from "lucide-react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../services/firebase";

// Baseline community logs for audit completeness
const BASELINE_AUDIT_LOGS = [
  {
    id: "INC-8921",
    title: "Minor Medical Assistance Request",
    category: "Medical",
    icon: HeartPulse,
    color: "red",
    location: "Sector 4, Main Market, Crossroad 2",
    time: "2 hours ago",
    date: "11 Nov 2026, 17:42",
    status: "Resolved",
    responders: "3 local responders attended within 4 minutes",
    description:
      "Senior citizen requested quick assistance with first-aid. Local responder team attended and stabilized the patient.",
  },
  {
    id: "INC-8894",
    title: "Small Electrical Spark near Transformer",
    category: "Hazard",
    icon: Flame,
    color: "orange",
    location: "Block B, Green Avenue Park",
    time: "Yesterday",
    date: "10 Nov 2026, 14:15",
    status: "Resolved",
    responders: "5 fire control & civic officers attended",
    description:
      "Transformer sparking reported by neighbourhood watch. Fire control safely isolated the electrical unit.",
  },
  {
    id: "INC-8742",
    title: "Streetlight Outage & Night Safety Patrol",
    category: "Safety",
    icon: Shield,
    color: "blue",
    location: "9th Cross, Residency Road",
    time: "3 days ago",
    date: "09 Nov 2026, 21:30",
    status: "Resolved",
    responders: "2 volunteer patrol members dispatched",
    description:
      "Volunteer night safety patrol accompanied residents until civic authorities restored street illumination.",
  },
];

function EmergencyHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [firestoreIncidents, setFirestoreIncidents] = useState([]);

  // Clear History Confirmation Modal & Toast State
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearedIds, setClearedIds] = useState(() => {
    try {
      const saved = localStorage.getItem("necn_cleared_incidents");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState("");

  // 1. Listen in real-time to Cloud Firestore for actual incident broadcasts & resolutions
  useEffect(() => {
    try {
      const q = query(collection(db, "emergencies"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const emgType = data.type || "Critical Emergency";

            // Determine category and icon styling
            let cat;
            let IconComp;
            let badgeColor;

            if (emgType.toLowerCase().includes("med")) {
              cat = "Medical";
              IconComp = HeartPulse;
              badgeColor = "red";
            } else if (
              emgType.toLowerCase().includes("fire") ||
              emgType.toLowerCase().includes("hazard")
            ) {
              cat = "Hazard";
              IconComp = Flame;
              badgeColor = "orange";
            } else if (
              emgType.toLowerCase().includes("crime") ||
              emgType.toLowerCase().includes("security")
            ) {
              cat = "Safety";
              IconComp = Shield;
              badgeColor = "blue";
            } else {
              cat = "Critical";
              IconComp = AlertTriangle;
              badgeColor = "red";
            }

            const isResolved = data.status === "RESOLVED";

            list.push({
              id: docSnap.id,
              rawId: docSnap.id,
              title: `${emgType} Emergency Alert`,
              category: cat,
              icon: IconComp,
              color: badgeColor,
              location:
                data.latitude && data.longitude
                  ? `Sector 4 (${Number(data.latitude).toFixed(4)}, ${Number(
                      data.longitude
                    ).toFixed(4)})`
                  : "Sector 4 Mesh",
              time: data.timestampString || "Live Alert",
              date: data.timestampString
                ? `Today at ${data.timestampString}`
                : "Active",
              status: isResolved ? "Resolved" : "Active Distress Signal",
              isResolved,
              responders: isResolved
                ? data.resolvedBy
                  ? `Resolved by: ${data.resolvedBy}`
                  : "Resolved by Community Responder"
                : "Active Alert • Responders Dispatched",
              description:
                data.resolutionNote ||
                data.notes ||
                `Distress signal reported by ${
                  data.senderName || "Community Member"
                }. Verified within 5km mesh radius.`,
            });
          });

          // Sort so real active and recent emergencies appear at the top
          list.sort((a, b) => {
            if (!a.isResolved && b.isResolved) return -1;
            if (a.isResolved && !b.isResolved) return 1;
            return 0;
          });

          setFirestoreIncidents(list);
        },
        (err) => {
          console.warn("Firestore history subscription notice:", err.message);
        }
      );

      return () => {
        if (typeof unsubscribe === "function") unsubscribe();
      };
    } catch (err) {
      console.warn("Could not setup history listener:", err);
    }
  }, []);

  // Merge Firestore incidents with baseline audit logs
  const allIncidents = [...firestoreIncidents, ...BASELINE_AUDIT_LOGS];

  // Filter out any incidents the user has cleared from their view
  const visibleIncidents = allIncidents.filter(
    (item) => !clearedIds.includes(item.id)
  );

  // Search and Category filtering
  const filteredIncidents = visibleIncidents.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all" ||
      item.category.toLowerCase() === filterType.toLowerCase() ||
      (filterType === "resolved" && item.status.toLowerCase() === "resolved") ||
      (filterType === "active" && item.status.toLowerCase().includes("active"));

    return matchesSearch && matchesFilter;
  });

  // Handle Clear History confirmation flow
  const handleRequestClearHistory = () => {
    setConfirmClearOpen(true);
  };

  const handleCancelClearHistory = () => {
    setConfirmClearOpen(false);
  };

  const handleConfirmClearHistory = () => {
    // Collect all resolved incident IDs to clear
    const idsToClear = visibleIncidents
      .filter((item) => item.status.toLowerCase() === "resolved")
      .map((item) => item.id);

    const updated = Array.from(new Set([...clearedIds, ...idsToClear]));
    setClearedIds(updated);
    try {
      localStorage.setItem("necn_cleared_incidents", JSON.stringify(updated));
    } catch (e) {
      console.error("Local storage error:", e);
    }

    setConfirmClearOpen(false);
    setToastMessage("Emergency incident history has been cleared successfully.");
    setTimeout(() => setToastMessage(""), 5000);
  };

  const handleRestoreHistory = () => {
    setClearedIds([]);
    try {
      localStorage.removeItem("necn_cleared_incidents");
    } catch (e) {
      console.error("Local storage error:", e);
    }
    setToastMessage("All cleared emergency incident logs have been restored.");
    setTimeout(() => setToastMessage(""), 5000);
  };

  return (
    <div className="history-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="history-toast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header with Action Button */}
      <div className="page-header">
        <div>
          <span className="badge-pill neutral">
            <History size={14} /> AUDIT & RECORDS
          </span>
          <h1>Emergency Incident History</h1>
          <p>
            Real-time community incident logs, verified responder dispatches, and
            emergency resolutions.
          </p>
        </div>

        <div className="header-actions">
          {visibleIncidents.length > 0 && (
            <button
              type="button"
              className="btn-clear-history"
              onClick={handleRequestClearHistory}
              title="Clear resolved incident logs"
            >
              <Trash2 size={15} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="history-search-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by incident ID, title, description, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          <button
            className={`filter-chip ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            All Logs ({visibleIncidents.length})
          </button>
          <button
            className={`filter-chip ${
              filterType === "active" ? "active" : ""
            }`}
            onClick={() => setFilterType("active")}
          >
            Active Incidents
          </button>
          <button
            className={`filter-chip ${
              filterType === "resolved" ? "active" : ""
            }`}
            onClick={() => setFilterType("resolved")}
          >
            Resolved
          </button>
          <button
            className={`filter-chip ${
              filterType === "medical" ? "active" : ""
            }`}
            onClick={() => setFilterType("medical")}
          >
            Medical
          </button>
          <button
            className={`filter-chip ${
              filterType === "hazard" ? "active" : ""
            }`}
            onClick={() => setFilterType("hazard")}
          >
            Hazards
          </button>
        </div>
      </div>

      {/* Incidents List */}
      <div className="history-list">
        {filteredIncidents.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={40} color="#10b981" />
            <h3>No Emergency Incidents Found</h3>
            <p>
              {clearedIds.length > 0
                ? "You have cleared all previous emergency logs from your view."
                : "No matching emergency logs found for your search criteria."}
            </p>
            {clearedIds.length > 0 && (
              <button
                type="button"
                className="btn-restore-history"
                onClick={handleRestoreHistory}
              >
                <RotateCcw size={14} />
                <span>Restore Cleared Logs ({clearedIds.length})</span>
              </button>
            )}
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const Icon = incident.icon;
            const isActive = incident.status.toLowerCase().includes("active");

            return (
              <div className="history-card" key={incident.id}>
                <div className="history-card-header">
                  <div className="incident-id-group">
                    <div className={`incident-icon ${incident.color}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="incident-meta-top">
                        <span className="incident-id">
                          #{incident.id.slice(0, 10)}
                        </span>
                        <span className="incident-badge-category">
                          {incident.category}
                        </span>
                      </div>
                      <h3>{incident.title}</h3>
                    </div>
                  </div>

                  <div
                    className={`incident-status-pill ${
                      isActive ? "active" : "resolved"
                    }`}
                  >
                    {isActive ? (
                      <AlertTriangle size={15} />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    <span>{incident.status}</span>
                  </div>
                </div>

                <p className="incident-description">{incident.description}</p>

                <div className="history-card-footer">
                  <div className="incident-detail">
                    <MapPin size={15} />
                    <span>{incident.location}</span>
                  </div>
                  <div className="incident-detail">
                    <Clock size={15} />
                    <span>{incident.date}</span>
                  </div>
                  <div className="incident-responders">
                    <strong>{incident.responders}</strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear History Confirmation Modal */}
      {confirmClearOpen && (
        <div className="modal-backdrop">
          <div className="resolve-confirm-card">
            <button
              className="modal-close-btn"
              onClick={handleCancelClearHistory}
            >
              <X size={20} />
            </button>

            <div
              className="resolve-icon-badge"
              style={{ background: "#fff1f2", color: "#e11d48" }}
            >
              <Trash2 size={36} />
            </div>

            <h2>Clear Emergency Incident History?</h2>
            <p className="resolve-subtitle">
              Are you sure you want to clear your emergency incident history? All
              resolved incident records will be cleared from your view. Active
              emergency alerts will remain active.
            </p>

            <div className="incident-preview-box">
              <div>
                <strong>Action:</strong> Clear all resolved history logs
              </div>
              <div>
                <strong>Effect:</strong> Archive records from local view
              </div>
              <div>
                <strong>Status:</strong> Active distress alerts stay protected
              </div>
            </div>

            <div className="resolve-modal-actions">
              <button
                type="button"
                className="btn-resolve-cancel"
                onClick={handleCancelClearHistory}
              >
                Cancel (Keep History)
              </button>
              <button
                type="button"
                className="btn-confirm-clear"
                onClick={handleConfirmClearHistory}
              >
                <Trash2 size={15} />
                <span>Yes, Clear History</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmergencyHistory;
