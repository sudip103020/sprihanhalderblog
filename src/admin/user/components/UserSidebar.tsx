import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import {
  FaHome,
  FaComments,
  FaHeartbeat,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaTachometerAlt,
  FaTimes,
} from "react-icons/fa";

import { auth } from "../../../firebase/config";

interface UserSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSidebar = ({
  isOpen,
  onClose,
}: UserSidebarProps) => {
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);

  // =====================================================
  // Current User
  // =====================================================

 

  let storedUser: any = null;

  try {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      storedUser = JSON.parse(savedUser);
    }
  } catch (error) {
    console.error(
      "Unable to read stored user:",
      error,
    );
  }


  const userRole =
    storedUser?.role ||
    "user";

  // =====================================================
  // Logout
  // =====================================================

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      await signOut(auth);

      localStorage.removeItem("user");

      navigate("/admin/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Logout error:",
        error,
      );

      setLoggingOut(false);
    }
  };

  // =====================================================
  // Navigation
  // =====================================================

  const handleNavigation = () => {
    onClose();
  };

  // =====================================================
  // Menu
  // =====================================================

  const menuItems = [
    {
      label: "Dashboard",
      path: "/user/dashboard",
      icon: <FaHome />,
    },
    {
      label: "Messages",
      path: "/user/messages",
      icon: <FaComments />,
    },
    {
      label: "Medical",
      path: "/user/medical",
      icon: <FaHeartbeat />,
    },
    {
      label: "My Profile",
      path: "/user/profile",
      icon: <FaUser />,
    },

     {
      label: "My Diary",
      path: "/user/diary",
      icon: <FaUser />,
    },

     {
      label: "My Books",
      path: "/user/diary/book",
      icon: <FaUser />,
    },


    {
      label: "Settings",
      path: "/user/settings",
      icon: <FaCog />,
    },
  ];

  return (
    <>
      {/* =================================================
          Mobile Overlay
      ================================================= */}

      {isOpen && (
        <div
          className="user-sidebar-overlay"
          onClick={onClose}
        />
      )}

      {/* =================================================
          Sidebar
      ================================================= */}

      <aside
        className={`user-sidebar ${
          isOpen ? "user-sidebar-open" : ""
        }`}
      >
        {/* =================================================
            Brand
        ================================================= */}

        <div className="user-sidebar-brand">
          <div>
            <img
     src="/logo.png"
    alt="Logo"
    className="user-header-logo"
  />
          </div>

          <div className="user-brand-text">
            <div className="user-brand-title">
              Your Portal
            </div>

            <div className="user-brand-subtitle">
             Provide By Sprihan Blog
            </div>
          </div>

          {/* Mobile Close */}

          <button
            type="button"
            className="user-sidebar-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>


  

        <nav className="user-sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavigation}
              className={({ isActive }) =>
                `user-sidebar-link ${
                  isActive
                    ? "user-sidebar-link-active"
                    : ""
                }`
              }
            >
              <span className="user-sidebar-link-icon">
                {item.icon}
              </span>

              <span className="user-sidebar-link-label">
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* =================================================
            Bottom Section
        ================================================= */}

        <div className="user-sidebar-bottom">
          {/* Admin Dashboard */}

          {userRole === "admin" && (
            <button
              type="button"
              className="user-sidebar-admin-button"
              onClick={() => {
                onClose();

                navigate(
                  "/admin/dashboard",
                );
              }}
            >
              <span className="user-sidebar-link-icon">
                <FaTachometerAlt />
              </span>

              <span>
                Admin Dashboard
              </span>
            </button>
          )}

          {/* Logout */}

          <button
            type="button"
            className="user-sidebar-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <span className="user-sidebar-link-icon">
              <FaSignOutAlt />
            </span>

            <span>
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default UserSidebar;