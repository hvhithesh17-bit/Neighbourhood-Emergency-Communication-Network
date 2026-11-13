import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  History,
  User,
  Bell,
  Menu,
  Activity,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Lock body scroll when mobile drawer is open to prevent background scrolling
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Map", path: "/emergency-map", icon: MapPin },
    { name: "Report", path: "/report-emergency", icon: AlertTriangle },
    { name: "History", path: "/emergency-history", icon: History },
    { name: "Profile", path: "/profile", icon: User },
  ];

  // Dynamic page title based on current path
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/dashboard":
        return {
          title: "Safety Dashboard",
          subtitle: "Live sector overview & community safety network",
        };
      case "/emergency-map":
      case "/map":
        return {
          title: "Emergency Radar Map",
          subtitle: "Live GPS tracking and neighbourhood safe havens",
        };
      case "/report-emergency":
        return {
          title: "Report Emergency",
          subtitle: "Submit incident details to notify nearby responders",
        };
      case "/emergency-history":
      case "/history":
        return {
          title: "Incident History",
          subtitle: "Verified community incident reports & resolutions",
        };
      case "/profile":
        return {
          title: "User Profile",
          subtitle: "Personal credentials, location permissions & security",
        };
      default:
        return {
          title: "NECN Safety Network",
          subtitle: "Neighbourhood Emergency Communication Network",
        };
    }
  };

  const { title, subtitle } = getPageTitle();

  const userInitial = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <div className="app-shell">
      {/* Reusable Sidebar Navigation (Desktop + Mobile Drawer) */}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="app-main-wrapper">
        {/* Top Navigation Bar */}
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="topbar-headings">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>

          <div className="topbar-right">
            <div className="live-status-pill">
              <span className="live-dot"></span>
              <span className="status-text">Sector Online</span>
            </div>

            <div className="notifications-wrapper">
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="View notifications"
              >
                <Bell size={19} />
                <span className="badge-notification">2</span>
              </button>

              {notificationsOpen && (
                <div className="notifications-dropdown">
                  <div className="dropdown-header">
                    <h4>Notifications</h4>
                    <span className="badge-count">2 New</span>
                  </div>
                  <div className="notification-list">
                    <div className="notification-item">
                      <div className="noti-icon green">
                        <CheckCircle size={16} />
                      </div>
                      <div>
                        <p>
                          <strong>System Online:</strong> Your GPS sector node
                          is operational.
                        </p>
                        <small>Just now</small>
                      </div>
                    </div>
                    <div className="notification-item">
                      <div className="noti-icon blue">
                        <Activity size={16} />
                      </div>
                      <div>
                        <p>
                          <strong>Safe Haven Check:</strong> 3 medical stations
                          active near you.
                        </p>
                        <small>15m ago</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="topbar-profile-btn"
              onClick={() => navigate("/profile")}
              title="View Profile"
            >
              <div className="avatar-chip">{userInitial}</div>
              <span className="user-name-label">
                {user?.displayName
                  ? user.displayName.split(" ")[0]
                  : "Profile"}
              </span>
            </button>
          </div>
        </header>

        {/* Page Content Rendered Here */}
        <main className="app-page-body">
          <Outlet />
        </main>

        <footer className="app-global-footer">
          <p>
            NECN © 2026 · Neighbourhood Emergency Communication Network ·
            High-Reliability Safety Architecture
          </p>
        </footer>
      </div>

      {/* Mobile Backdrop Overlay - closes drawer on touch/click */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `mobile-nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>
                {item.name
                  .replace("Emergency ", "")
                  .replace("Incident ", "")
                  .replace("My ", "")}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export default Layout;
