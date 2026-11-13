
import {
  ShieldAlert,
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  History,
  User,
  LogOut,
  X,
} from "lucide-react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

function Sidebar({ mobileMenuOpen = false, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Emergency Map",
      path: "/emergency-map",
      icon: MapPin,
    },
    {
      name: "Report Emergency",
      path: "/report-emergency",
      icon: AlertTriangle,
    },
    {
      name: "Emergency History",
      path: "/emergency-history",
      icon: History,
    },
    {
      name: "My Profile",
      path: "/profile",
      icon: User,
    },
  ];

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
      <div className="sidebar-logo">
        <ShieldAlert size={30} />
        <h2>NECN</h2>
        {onClose && (
          <button
            className="mobile-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={active ? "active" : ""}
              onClick={() => onClose?.()}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <button
        className="logout-button"
        onClick={handleLogout}
      >
        <LogOut size={20} />
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
