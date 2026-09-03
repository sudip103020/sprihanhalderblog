import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../firebase/config";

import {
  Container,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Modal,
} from "react-bootstrap";

import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaCheckCircle,
  FaShieldAlt,
} from "react-icons/fa";

const ChangePassword = () => {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleChangePassword = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    const user = auth.currentUser;

    if (!user) {
      setError("You are not logged in. Please login again.");
      return;
    }

    if (!user.email) {
      setError("Your account email could not be found.");
      return;
    }

    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!newPassword) {
      setError("Please enter your new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError(
        "New password must be different from your current password."
      );
      return;
    }

    try {
      setLoading(true);

      // -----------------------------------------
      // RE-AUTHENTICATE USER
      // -----------------------------------------

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);

      // -----------------------------------------
      // UPDATE PASSWORD
      // -----------------------------------------

      await updatePassword(user, newPassword);

      // Clear fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Show success modal
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Password change error:", error);

      switch (error?.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
          setError("Current password is incorrect.");
          break;

        case "auth/too-many-requests":
          setError(
            "Too many attempts. Please wait a while and try again."
          );
          break;

        case "auth/weak-password":
          setError("Your new password is too weak.");
          break;

        case "auth/requires-recent-login":
          setError(
            "For security, please logout and login again before changing your password."
          );
          break;

        default:
          setError(
            error?.message ||
              "Failed to change password. Please try again."
          );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessOk = () => {
    setShowSuccessModal(false);
    navigate("/user/settings");
  };

  return (
    <>
      <Container
        fluid
        className="py-4 px-3 px-md-4"
        style={{ maxWidth: "900px" }}
      >
        {/* -----------------------------------------
            HEADER
        ----------------------------------------- */}

        <div className="d-flex align-items-center mb-4">
          <Button
            variant="light"
            className="rounded-circle me-3 shadow-sm"
            style={{
              width: "42px",
              height: "42px",
            }}
            onClick={() => navigate("/user/settings")}
          >
            <FaArrowLeft />
          </Button>

          <div>
            <h3 className="fw-bold mb-1">
              Change Password
            </h3>

            <p className="text-muted mb-0">
              Update your account password securely
            </p>
          </div>
        </div>

        {/* -----------------------------------------
            CARD
        ----------------------------------------- */}

        <Card
          className="border-0 shadow-sm"
          style={{
            borderRadius: "18px",
          }}
        >
          <Card.Body className="p-4 p-md-5">

            {/* Security Header */}

            <div className="text-center mb-4">
              <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{
                  width: "75px",
                  height: "75px",
                  borderRadius: "50%",
                  background: "#f1f3f5",
                  color: "#212529",
                  fontSize: "30px",
                }}
              >
                <FaShieldAlt />
              </div>

              <h4 className="fw-bold">
                Account Security
              </h4>

              <p className="text-muted mb-0">
                Keep your account secure with a strong password.
              </p>
            </div>

            {error && (
              <Alert
                variant="danger"
                className="rounded-3"
              >
                {error}
              </Alert>
            )}

            <Form onSubmit={handleChangePassword}>

              {/* Current Password */}

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">
                  Current Password
                </Form.Label>

                <div className="position-relative">
                  <FaLock
                    className="position-absolute text-muted"
                    style={{
                      left: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />

                  <Form.Control
                    type={
                      showCurrent
                        ? "text"
                        : "password"
                    }
                    value={currentPassword}
                    onChange={(e) =>
                      setCurrentPassword(e.target.value)
                    }
                    placeholder="Enter current password"
                    className="py-3 ps-5 pe-5 rounded-3"
                    autoComplete="current-password"
                  />

                  <Button
                    type="button"
                    variant="link"
                    className="position-absolute text-muted p-0"
                    style={{
                      right: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                    onClick={() =>
                      setShowCurrent(!showCurrent)
                    }
                  >
                    {showCurrent ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </Button>
                </div>
              </Form.Group>

              {/* New Password */}

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">
                  New Password
                </Form.Label>

                <div className="position-relative">
                  <FaLock
                    className="position-absolute text-muted"
                    style={{
                      left: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />

                  <Form.Control
                    type={
                      showNew
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    placeholder="Enter new password"
                    className="py-3 ps-5 pe-5 rounded-3"
                    autoComplete="new-password"
                  />

                  <Button
                    type="button"
                    variant="link"
                    className="position-absolute text-muted p-0"
                    style={{
                      right: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                    onClick={() =>
                      setShowNew(!showNew)
                    }
                  >
                    {showNew ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </Button>
                </div>

                <Form.Text className="text-muted">
                  Password must be at least 6 characters.
                </Form.Text>
              </Form.Group>

              {/* Confirm Password */}

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">
                  Confirm New Password
                </Form.Label>

                <div className="position-relative">
                  <FaLock
                    className="position-absolute text-muted"
                    style={{
                      left: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />

                  <Form.Control
                    type={
                      showConfirm
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Confirm new password"
                    className="py-3 ps-5 pe-5 rounded-3"
                    autoComplete="new-password"
                  />

                  <Button
                    type="button"
                    variant="link"
                    className="position-absolute text-muted p-0"
                    style={{
                      right: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                    onClick={() =>
                      setShowConfirm(!showConfirm)
                    }
                  >
                    {showConfirm ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </Button>
                </div>
              </Form.Group>

              {/* Buttons */}

              <div className="d-flex gap-2 flex-column flex-sm-row">
                <Button
                  type="button"
                  variant="light"
                  className="py-3 rounded-3 fw-semibold flex-fill"
                  onClick={() =>
                    navigate("/user/settings")
                  }
                  disabled={loading}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="dark"
                  className="py-3 rounded-3 fw-semibold flex-fill"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner
                        animation="border"
                        size="sm"
                        className="me-2"
                      />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <FaLock className="me-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>

      {/* -----------------------------------------
          SUCCESS MODAL
      ----------------------------------------- */}

      <Modal
        show={showSuccessModal}
        onHide={() => setShowSuccessModal(false)}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Body className="text-center p-5">

          <div
            className="mx-auto d-flex align-items-center justify-content-center mb-4"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#d1e7dd",
              color: "#198754",
              fontSize: "38px",
            }}
          >
            <FaCheckCircle />
          </div>

          <h3 className="fw-bold mb-2">
            Password Changed!
          </h3>

          <p className="text-muted mb-4">
            Your password has been changed successfully.
          </p>

          <Button
            variant="dark"
            className="px-5 py-2 rounded-pill fw-semibold"
            onClick={handleSuccessOk}
          >
            OK
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ChangePassword;