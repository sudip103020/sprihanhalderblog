import {
  FaBars,
  FaBell,
  FaUser,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

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

  const firebaseUser =
    JSON.parse(
      localStorage.getItem("user") || "null",
    );

  const userName =
    firebaseUser?.name ||
    "User";

  const userPhoto =
    firebaseUser?.photo ||
    "";

  return (
    <header className="user-header">
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

        {/* Page Brand */}

        <div className="user-header-title-area">
          <h5 className="user-header-title">
            User Portal
          </h5>

          <span className="user-header-subtitle">
            Manage your account
          </span>
        </div>
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
      </div>
    </header>
  );
};

export default UserHeader;