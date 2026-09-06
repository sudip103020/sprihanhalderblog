import {
  FaBars,
  FaBell,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebase/config";

interface UserHeaderProps {
  onMenuClick: () => void;
}

const UserHeader = ({
  onMenuClick,
}: UserHeaderProps) => {
  const navigate = useNavigate();

  // =====================================================
  // Current User
  // =====================================================

  const firebaseUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const userName =
    firebaseUser?.name || "User";

  const userPhoto =
    firebaseUser?.photo || "";

  // =====================================================
  // Logout
  // =====================================================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      localStorage.removeItem("user");

      navigate("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="user-header">

      {/* =================================================
          Left Side
      ================================================= */}

      <div className="user-header-left">

        {/* Mobile Menu */}

        <button
          type="button"
          className="user-header-menu-button"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <FaBars />
        </button>

      </div>

      {/* =================================================
          Right Side
      ================================================= */}

      <div className="user-header-right">

        {/* Notification */}

        <button
          type="button"
          className="user-header-icon-button"
          onClick={() => {
            // Notification system will be added later
          }}
          aria-label="Notifications"
        >
          <FaBell />

          <span className="user-notification-dot" />
        </button>

        {/* Divider */}

        <div className="user-header-divider" />

        {/* Profile */}

        <button
          type="button"
          className="user-header-profile"
          onClick={() =>
            navigate("/user/profile")
          }
        >
          <div className="user-header-avatar">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={userName}
              />
            ) : (
              <FaUser />
            )}
          </div>

          <div className="user-header-user-info">

            <span className="user-header-user-name">
              {userName}
            </span>

            <span className="user-header-user-role">
              User
            </span>

          </div>
        </button>

        {/* Logout */}

        <button
          type="button"
          className="user-header-logout-button"
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
          <FaSignOutAlt />

          <span>Logout</span>
        </button>

      </div>
    </header>
  );
};

export default UserHeader;