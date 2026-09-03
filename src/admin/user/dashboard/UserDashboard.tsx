import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  FaComments,
  FaHeartbeat,
  FaUser,
  FaFileAlt,
  FaBell,
  FaPhoneAlt,
  FaArrowRight,
  FaUserEdit,
  FaCog,
  FaShieldAlt,
  FaCalendarAlt,
} from "react-icons/fa";

import { auth, db } from "../../../firebase/config";

interface UserData {
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  photo?: string;
  role?: string;
  designation?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  country?: string;
  bloodGroup?: string;
  bio?: string;
}

const UserDashboard = () => {
  const navigate = useNavigate();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [medicalAvailable, setMedicalAvailable] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          navigate("/admin/login");
          return;
        }

        // --------------------------------------------------
        // LOAD USER DATA
        // --------------------------------------------------

        const storedUser = localStorage.getItem("user");

        let localUser: UserData = {};

        if (storedUser) {
          try {
            localUser = JSON.parse(storedUser);
          } catch {
            localUser = {};
          }
        }

        let finalUser: UserData = {
          ...localUser,
          uid: currentUser.uid,
          email: currentUser.email || localUser.email,
        };

        // --------------------------------------------------
        // LOAD USER FROM FIRESTORE
        // --------------------------------------------------

        try {
          const userQuery = query(
            collection(db, "users"),
            where("uid", "==", currentUser.uid)
          );

          const userSnapshot = await getDocs(userQuery);

          if (!userSnapshot.empty) {
            const firestoreUser = userSnapshot.docs[0].data();

            finalUser = {
              ...finalUser,
              ...firestoreUser,
              uid: currentUser.uid,
              email:
                firestoreUser.email ||
                currentUser.email ||
                finalUser.email,
            };
          }
        } catch (error) {
          console.log("User data loading skipped:", error);
        }

        setUserData(finalUser);

        // --------------------------------------------------
        // PROFILE COMPLETION
        // --------------------------------------------------

        const profileFields = [
          finalUser.name,
          finalUser.email,
          finalUser.phone,
          finalUser.photo,
          finalUser.dob,
          finalUser.gender,
          finalUser.address,
          finalUser.city,
          finalUser.country,
          finalUser.bio,
        ];

        const completedFields = profileFields.filter(
          (field) =>
            field !== undefined &&
            field !== null &&
            String(field).trim() !== ""
        ).length;

        const completion = Math.round(
          (completedFields / profileFields.length) * 100
        );

        setProfileCompletion(completion);

        // --------------------------------------------------
        // UNREAD MESSAGES
        // --------------------------------------------------

        try {
          const conversationsQuery = query(
            collection(db, "conversations"),
            where("participants", "array-contains", currentUser.uid)
          );

          const conversationsSnapshot = await getDocs(
            conversationsQuery
          );

          let unreadTotal = 0;

          for (const conversationDoc of conversationsSnapshot.docs) {
            try {
              const messagesQuery = query(
                collection(
                  db,
                  "conversations",
                  conversationDoc.id,
                  "messages"
                ),
                where("receiverId", "==", currentUser.uid),
                where("seen", "==", false)
              );

              const messagesSnapshot = await getDocs(messagesQuery);

              unreadTotal += messagesSnapshot.size;
            } catch (error) {
              console.log(
                "Unread message check skipped:",
                error
              );
            }
          }

          setUnreadMessages(unreadTotal);
        } catch (error) {
          console.log("Messages loading skipped:", error);
          setUnreadMessages(0);
        }

        // --------------------------------------------------
        // DOCUMENTS
        // --------------------------------------------------

        try {
          const documentsQuery = query(
            collection(db, "documents"),
            where("userId", "==", currentUser.uid)
          );

          const documentsSnapshot = await getDocs(
            documentsQuery
          );

          setDocumentsCount(documentsSnapshot.size);
        } catch (error) {
          console.log("Documents loading skipped:", error);
          setDocumentsCount(0);
        }

        // --------------------------------------------------
        // MEDICAL INFORMATION
        // --------------------------------------------------

        try {
          const medicalQuery = query(
            collection(db, "medicalInfo"),
            where("userId", "==", currentUser.uid)
          );

          const medicalSnapshot = await getDocs(medicalQuery);

          setMedicalAvailable(!medicalSnapshot.empty);
        } catch (error) {
          console.log("Medical information check skipped:", error);

          // Fallback: try medical collection
          try {
            const medicalQuery = query(
              collection(db, "medical"),
              where("userId", "==", currentUser.uid)
            );

            const medicalSnapshot = await getDocs(medicalQuery);

            setMedicalAvailable(!medicalSnapshot.empty);
          } catch {
            setMedicalAvailable(false);
          }
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="user-dashboard-loading">
        <div className="user-dashboard-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  // --------------------------------------------------
  // USER DISPLAY
  // --------------------------------------------------

  const displayName =
    userData?.name ||
    auth.currentUser?.displayName ||
    "User";

  const firstName =
    displayName.split(" ")[0] || "User";

  const userPhoto =
    userData?.photo ||
    auth.currentUser?.photoURL ||
    "";

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  return (
    <div className="user-dashboard">
      {/* ================================================
          WELCOME SECTION
      ================================================= */}

      <section className="user-welcome-card">
        <div className="user-welcome-content">
          <div className="user-welcome-avatar">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={displayName}
              />
            ) : (
              <FaUser />
            )}
          </div>

          <div className="user-welcome-text">
            <span className="user-welcome-small">
              Welcome back 👋
            </span>

            <h1>
              Hello, {firstName}!
            </h1>

            <p>
              Manage your profile, messages, medical
              information and account from here.
            </p>
          </div>
        </div>

        

        <div className="d-flex align-items-center gap-2 flex-wrap">
  {/* Admin Dashboard - Only Admin */}
  {userData?.role === "admin" && (
    <button
      className="user-welcome-profile-btn"
      onClick={() =>
        navigate("/admin/dashboard")
      }
    >
      <FaShieldAlt />
      Admin Dashboard
    </button>
  )}

  {/* Edit Profile */}
  <button
    className="user-welcome-profile-btn"
    onClick={() =>
      navigate("/user/profile")
    }
  >
    <FaUserEdit />
    Edit Profile
  </button>
</div>
      </section>

      {/* ================================================
          STAT CARDS
      ================================================= */}

      <section className="user-dashboard-stats">

        {/* Messages */}
        <div
          className="user-stat-card clickable"
          onClick={() => navigate("/user/messages")}
        >
          <div className="user-stat-icon messages">
            <FaComments />
          </div>

          <div className="user-stat-info">
            <span>Unread Messages</span>
            <strong>{unreadMessages}</strong>
            <small>
              {unreadMessages > 0
                ? "You have new messages"
                : "You're all caught up"}
            </small>
          </div>

          <FaArrowRight className="user-stat-arrow" />
        </div>

        {/* Profile */}
        <div
          className="user-stat-card clickable"
          onClick={() => navigate("/user/profile")}
        >
          <div className="user-stat-icon profile">
            <FaUser />
          </div>

          <div className="user-stat-info">
            <span>Profile Completion</span>
            <strong>{profileCompletion}%</strong>

            <div className="user-progress">
              <div
                className="user-progress-bar"
                style={{
                  width: `${profileCompletion}%`,
                }}
              ></div>
            </div>
          </div>

          <FaArrowRight className="user-stat-arrow" />
        </div>

        {/* Medical */}
        <div
          className="user-stat-card clickable"
          onClick={() => navigate("/user/medical")}
        >
          <div className="user-stat-icon medical">
            <FaHeartbeat />
          </div>

          <div className="user-stat-info">
            <span>Medical Information</span>

            <strong>
              {medicalAvailable
                ? "Available"
                : "Not Added"}
            </strong>

            <small>
              {medicalAvailable
                ? "Your medical information is saved"
                : "Add your medical information"}
            </small>
          </div>

          <FaArrowRight className="user-stat-arrow" />
        </div>

        {/* Documents */}
        <div
          className="user-stat-card clickable"
          onClick={() => navigate("/user/documents")}
        >
          <div className="user-stat-icon documents">
            <FaFileAlt />
          </div>

          <div className="user-stat-info">
            <span>My Documents</span>
            <strong>{documentsCount}</strong>
            <small>
              {documentsCount === 1
                ? "Document available"
                : "Documents available"}
            </small>
          </div>

          <FaArrowRight className="user-stat-arrow" />
        </div>
      </section>

      {/* ================================================
          MAIN GRID
      ================================================= */}

      <section className="user-dashboard-grid">

        {/* ============================================
            QUICK ACTIONS
        ============================================= */}

        <div className="user-dashboard-panel quick-actions-panel">
          <div className="user-panel-header">
            <div>
              <span className="user-panel-label">
                SHORTCUTS
              </span>

              <h2>Quick Actions</h2>
            </div>

            <div className="user-panel-header-icon">
              <FaShieldAlt />
            </div>
          </div>

          <div className="user-quick-actions">

            <button
              onClick={() =>
                navigate("/user/messages")
              }
              className="user-quick-action"
            >
              <span className="quick-action-icon messages">
                <FaComments />
              </span>

              <span>
                <strong>Messages</strong>
                <small>Chat with members</small>
              </span>

              <FaArrowRight />
            </button>

            <button
              onClick={() =>
                navigate("/user/profile")
              }
              className="user-quick-action"
            >
              <span className="quick-action-icon profile">
                <FaUser />
              </span>

              <span>
                <strong>My Profile</strong>
                <small>View & edit profile</small>
              </span>

              <FaArrowRight />
            </button>

            <button
              onClick={() =>
                navigate("/user/medical")
              }
              className="user-quick-action"
            >
              <span className="quick-action-icon medical">
                <FaHeartbeat />
              </span>

              <span>
                <strong>Medical</strong>
                <small>Manage health information</small>
              </span>

              <FaArrowRight />
            </button>

            <button
              onClick={() =>
                navigate("/user/settings")
              }
              className="user-quick-action"
            >
              <span className="quick-action-icon settings">
                <FaCog />
              </span>

              <span>
                <strong>Settings</strong>
                <small>Manage account settings</small>
              </span>

              <FaArrowRight />
            </button>
          </div>
        </div>

        {/* ============================================
            PROFILE OVERVIEW
        ============================================= */}

        <div className="user-dashboard-panel profile-overview-panel">
          <div className="user-panel-header">
            <div>
              <span className="user-panel-label">
                ACCOUNT
              </span>

              <h2>Profile Overview</h2>
            </div>

            <button
              className="user-panel-action"
              onClick={() =>
                navigate("/user/profile")
              }
            >
              Edit
            </button>
          </div>

          <div className="profile-overview">

            <div className="profile-overview-top">
              <div className="profile-overview-avatar">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={displayName}
                  />
                ) : (
                  <FaUser />
                )}
              </div>

              <div>
                <h3>{displayName}</h3>

                <p>
                  {userData?.designation ||
                    "User"}
                </p>
              </div>
            </div>

            <div className="profile-details">

              <div className="profile-detail">
                <span>Email</span>
                <strong>
                  {userData?.email ||
                    auth.currentUser?.email ||
                    "Not added"}
                </strong>
              </div>

              <div className="profile-detail">
                <span>Phone</span>
                <strong>
                  {userData?.phone ||
                    "Not added"}
                </strong>
              </div>

              <div className="profile-detail">
                <span>Gender</span>
                <strong>
                  {userData?.gender ||
                    "Not added"}
                </strong>
              </div>

              <div className="profile-detail">
                <span>Blood Group</span>
                <strong>
                  {userData?.bloodGroup ||
                    "Not added"}
                </strong>
              </div>
            </div>

            <div className="profile-completion-box">
              <div className="profile-completion-header">
                <span>Profile completion</span>
                <strong>
                  {profileCompletion}%
                </strong>
              </div>

              <div className="user-progress large">
                <div
                  className="user-progress-bar"
                  style={{
                    width: `${profileCompletion}%`,
                  }}
                ></div>
              </div>

              {profileCompletion < 100 && (
                <button
                  onClick={() =>
                    navigate("/user/profile")
                  }
                  className="complete-profile-btn"
                >
                  Complete your profile
                  <FaArrowRight />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          BOTTOM CARDS
      ================================================= */}

      <section className="user-bottom-grid">

        {/* Notifications */}
        <div className="user-info-card">
          <div className="user-info-card-icon">
            <FaBell />
          </div>

          <div className="user-info-card-content">
            <span>Notifications</span>
            <h3>Stay updated</h3>
            <p>
              Important updates and announcements
              will appear here.
            </p>
          </div>

          <button
            onClick={() =>
              navigate("/user/settings")
            }
            className="user-info-card-btn"
          >
            View
            <FaArrowRight />
          </button>
        </div>

        {/* Emergency */}
        <div className="user-info-card emergency-card">
          <div className="user-info-card-icon">
            <FaPhoneAlt />
          </div>

          <div className="user-info-card-content">
            <span>Emergency</span>
            <h3>Emergency Contacts</h3>
            <p>
              Keep important emergency contacts
              easily accessible.
            </p>
          </div>

          <button
            onClick={() =>
              navigate("/user/medical")
            }
            className="user-info-card-btn"
          >
            Open
            <FaArrowRight />
          </button>
        </div>

        {/* Events */}
        <div className="user-info-card">
          <div className="user-info-card-icon">
            <FaCalendarAlt />
          </div>

          <div className="user-info-card-content">
            <span>Community</span>
            <h3>Events & Activities</h3>
            <p>
              Stay connected with upcoming
              community activities.
            </p>
          </div>

          <button
            onClick={() =>
              navigate("/user/dashboard")
            }
            className="user-info-card-btn"
          >
            Explore
            <FaArrowRight />
          </button>
        </div>
      </section>

      {/* ================================================
          FOOTER MESSAGE
      ================================================= */}

      <div className="user-dashboard-footer">
        <div className="user-dashboard-footer-icon">
          <FaShieldAlt />
        </div>

        <div>
          <strong>Your information is secure</strong>
          <p>
            Your account information and personal
            data are protected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;