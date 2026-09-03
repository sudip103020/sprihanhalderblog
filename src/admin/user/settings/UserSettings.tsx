import { useEffect, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  Button,
  Spinner,
  Modal,
} from "react-bootstrap";

import {
  FaLock,
  FaUser,
  FaEnvelope,
  FaShieldAlt,
  FaSignOutAlt,
  FaChevronRight,
  FaArrowLeft,
} from "react-icons/fa";

import { auth, db } from "../../../firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

interface UserData {
  uid: string;
  name?: string;
  email?: string;
  photo?: string;
  photoURL?: string;
  role?: string;
  designation?: string;
}

const UserSettings = () => {
  const navigate = useNavigate();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/admin/login", { replace: true });
        return;
      }

      try {
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", firebaseUser.uid)
        );

        const snapshot = await getDocs(userQuery);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();

          setUserData({
            uid: firebaseUser.uid,
            name:
              data.name ||
              firebaseUser.displayName ||
              "User",
            email:
              data.email ||
              firebaseUser.email ||
              "",
            photo:
              data.photo ||
              data.photoURL ||
              firebaseUser.photoURL ||
              "",
            photoURL:
              data.photoURL ||
              data.photo ||
              firebaseUser.photoURL ||
              "",
            role: data.role || "user",
            designation: data.designation || "",
          });
        } else {
          setUserData({
            uid: firebaseUser.uid,
            name:
              firebaseUser.displayName ||
              "User",
            email:
              firebaseUser.email ||
              "",
            photo:
              firebaseUser.photoURL ||
              "",
            role: "user",
          });
        }
      } catch (error) {
        console.error(
          "Error loading user settings:",
          error
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await signOut(auth);

      localStorage.removeItem("user");

      navigate("/admin/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "70vh" }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  const isAdmin =
    userData?.role?.toLowerCase() === "admin";

  const profilePhoto =
    userData?.photoURL ||
    userData?.photo ||
    "";

  return (
    <>
      <Container
        fluid
        className="py-4 px-3 px-md-4"
        style={{
          maxWidth: "1000px",
        }}
      >
        {/* =========================================
            HEADER
        ========================================= */}

        <div className="d-flex align-items-center mb-4">
          <Button
            variant="light"
            className="rounded-circle me-3 shadow-sm"
            style={{
              width: "42px",
              height: "42px",
            }}
            onClick={() => {
              if (isAdmin) {
                navigate("/admin/dashboard");
              } else {
                navigate("/user/dashboard");
              }
            }}
          >
            <FaArrowLeft />
          </Button>

          <div>
            <h3 className="fw-bold mb-1">
              Settings
            </h3>

            <p className="text-muted mb-0">
              Manage your account and security
            </p>
          </div>
        </div>

        {/* =========================================
            PROFILE CARD
        ========================================= */}

        <Card
          className="border-0 shadow-sm mb-4"
          style={{
            borderRadius: "18px",
          }}
        >
          <Card.Body className="p-4">
            <div className="d-flex align-items-center">
              {/* Avatar */}

              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={userData?.name || "User"}
                  style={{
                    width: "75px",
                    height: "75px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: "75px",
                    height: "75px",
                    borderRadius: "50%",
                    background: "#f1f3f5",
                    fontSize: "30px",
                  }}
                >
                  <FaUser />
                </div>
              )}

              {/* User Info */}

              <div className="ms-3">
                <h5 className="fw-bold mb-1">
                  {userData?.name || "User"}
                </h5>

                <div className="text-muted small mb-1">
                  <FaEnvelope className="me-2" />
                  {userData?.email || "No email"}
                </div>

                <span
                  className={`badge ${
                    isAdmin
                      ? "text-bg-dark"
                      : "text-bg-secondary"
                  }`}
                >
                  {isAdmin ? (
                    <>
                      <FaShieldAlt className="me-1" />
                      Admin
                    </>
                  ) : (
                    "User"
                  )}
                </span>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* =========================================
            ACCOUNT SETTINGS
        ========================================= */}

        <Card
          className="border-0 shadow-sm mb-4"
          style={{
            borderRadius: "18px",
          }}
        >
          <Card.Body className="p-0">

            <div className="p-4 border-bottom">
              <h5 className="fw-bold mb-1">
                Account Settings
              </h5>

              <p className="text-muted small mb-0">
                Manage your account preferences
              </p>
            </div>

            {/* Profile */}

            <button
              type="button"
              className="w-100 border-0 bg-white text-start"
              style={{
                padding: "20px 24px",
              }}
              onClick={() =>
                navigate("/user/profile")
              }
            >
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "45px",
                    height: "45px",
                    borderRadius: "12px",
                    background: "#f1f3f5",
                  }}
                >
                  <FaUser />
                </div>

                <div className="flex-grow-1">
                  <div className="fw-semibold">
                    Profile
                  </div>

                  <div className="text-muted small">
                    Update your personal information
                  </div>
                </div>

                <FaChevronRight className="text-muted" />
              </div>
            </button>

            {/* Password */}

            <button
              type="button"
              className="w-100 border-0 border-top bg-white text-start"
              style={{
                padding: "20px 24px",
              }}
              onClick={() =>
                navigate(
                  "/user/settings/password"
                )
              }
            >
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "45px",
                    height: "45px",
                    borderRadius: "12px",
                    background: "#f1f3f5",
                  }}
                >
                  <FaLock />
                </div>

                <div className="flex-grow-1">
                  <div className="fw-semibold">
                    Change Password
                  </div>

                  <div className="text-muted small">
                    Update your account password
                  </div>
                </div>

                <FaChevronRight className="text-muted" />
              </div>
            </button>

          </Card.Body>
        </Card>

        {/* =========================================
            SECURITY
        ========================================= */}

        <Card
          className="border-0 shadow-sm mb-4"
          style={{
            borderRadius: "18px",
          }}
        >
          <Card.Body className="p-4">
            <div className="d-flex align-items-center mb-3">
              <FaShieldAlt className="me-2" />

              <h5 className="fw-bold mb-0">
                Security
              </h5>
            </div>

            <p className="text-muted small mb-0">
              Your account is protected by Firebase
              Authentication. Never share your password
              with anyone.
            </p>
          </Card.Body>
        </Card>

        {/* =========================================
            LOGOUT
        ========================================= */}

        <Card
          className="border-0 shadow-sm"
          style={{
            borderRadius: "18px",
          }}
        >
          <Card.Body className="p-4">
            <Button
              variant="outline-danger"
              className="w-100 py-3 rounded-3 fw-semibold"
              onClick={() =>
                setShowLogoutModal(true)
              }
              disabled={loggingOut}
            >
              <FaSignOutAlt className="me-2" />
              Logout
            </Button>
          </Card.Body>
        </Card>
      </Container>

      {/* =========================================
          LOGOUT MODAL
      ========================================= */}

      <Modal
        show={showLogoutModal}
        onHide={() =>
          !loggingOut &&
          setShowLogoutModal(false)
        }
        centered
      >
        <Modal.Body className="text-center p-5">

          <div
            className="mx-auto d-flex align-items-center justify-content-center mb-4"
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              background: "#f8d7da",
              color: "#dc3545",
              fontSize: "28px",
            }}
          >
            <FaSignOutAlt />
          </div>

          <h4 className="fw-bold mb-2">
            Logout?
          </h4>

          <p className="text-muted mb-4">
            Are you sure you want to logout from your
            account?
          </p>

          <div className="d-flex gap-2 justify-content-center">
            <Button
              variant="light"
              className="px-4 py-2 rounded-pill"
              onClick={() =>
                setShowLogoutModal(false)
              }
              disabled={loggingOut}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              className="px-4 py-2 rounded-pill fw-semibold"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <>
                  <Spinner
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Logging out...
                </>
              ) : (
                <>
                  <FaSignOutAlt className="me-2" />
                  Logout
                </>
              )}
            </Button>
          </div>

        </Modal.Body>
      </Modal>
    </>
  );
};

export default UserSettings;