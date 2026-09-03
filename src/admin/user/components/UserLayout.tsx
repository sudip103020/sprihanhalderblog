import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  FaSpinner,
} from "react-icons/fa";

import { auth } from "../../../firebase/config";

import UserSidebar from "./UserSidebar";
import UserHeader from "./UserHeader";

import "../styles.css";

// =====================================================
// Props
// =====================================================

interface UserLayoutProps {
  children: ReactNode;
}

// =====================================================
// Component
// =====================================================

const UserLayout = ({
  children,
}: UserLayoutProps) => {
  const navigate = useNavigate();

  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  // =====================================================
  // Authentication
  // =====================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (firebaseUser) => {
          if (!firebaseUser) {
            navigate(
              "/admin/login",
              {
                replace: true,
              },
            );

            return;
          }

          setCheckingAuth(false);
        },
      );

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  // =====================================================
  // Close Sidebar When Route Changes
  // =====================================================

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // =====================================================
  // Prevent Body Scroll When Mobile Sidebar Open
  // =====================================================

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "";
    }

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [sidebarOpen]);

  // =====================================================
  // Loading
  // =====================================================

  if (checkingAuth) {
    return (
      <div className="user-layout-loading">
        <div className="user-loading-card">
          <FaSpinner
            className="user-loading-spinner"
          />

          <h6>
            Loading User Portal...
          </h6>

          <p>
            Please wait a moment
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="user-layout">
      {/* =================================================
          Sidebar
      ================================================= */}

      <UserSidebar
        isOpen={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      {/* =================================================
          Main Area
      ================================================= */}

      <div className="user-main">
        {/* Header */}

        <UserHeader
          onMenuClick={() =>
            setSidebarOpen(true)
          }
        />

        {/* Page Content */}

        <main className="user-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default UserLayout;