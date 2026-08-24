import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
} from "react-bootstrap";

import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaBaby,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
} from "react-icons/fa";

import { auth, db } from "../firebase/config";

const UserRegister = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Create Firebase Authentication user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const user = userCredential.user;

      // Update Firebase profile
      await updateProfile(user, {
        displayName: name,
      });

      // Save user information in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        photo: "",
        role: "user",
        createdAt: serverTimestamp(),
      });

   navigate("/admin/dashboard");
    } catch (error: any) {
      console.error(error);

      switch (error.code) {
        case "auth/email-already-in-use":
          setError("An account already exists with this email.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/weak-password":
          setError("Password is too weak. Use at least 6 characters.");
          break;

        default:
          setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        background:
          "linear-gradient(135deg, #f8f9fa 0%, #eef1f5 50%, #e8ecf1 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circle */}
      <div
        style={{
          position: "absolute",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "rgba(13, 110, 253, 0.06)",
          top: "-150px",
          left: "-120px",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "rgba(25, 135, 84, 0.06)",
          bottom: "-130px",
          right: "-100px",
        }}
      />

      <Container
        className="py-5"
        style={{
          position: "relative",
          zIndex: 2,
        }}
      >
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={7} lg={5} xl={4}>
            <Card
              className="border-0 shadow-lg"
              style={{
                borderRadius: "24px",
                overflow: "hidden",
              }}
            >
              <Card.Body className="p-4 p-md-5">
                {/* Logo */}
                <div className="text-center mb-4">
                  <div
                    className="mx-auto d-flex align-items-center justify-content-center shadow-sm"
                    style={{
                      width: "82px",
                      height: "82px",
                      borderRadius: "24px",
                      background: "linear-gradient(135deg, #212529, #495057)",
                      color: "#fff",
                    }}
                  >
                    <FaBaby size={38} />
                  </div>

                  <h2 className="fw-bold mt-4 mb-1">Create Account</h2>

                  <p className="text-muted mb-0">Join Sprihan Halder Blog</p>
                </div>

                {/* Error */}
                {error && (
                  <Alert variant="danger" className="rounded-3 small">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleRegister}>
                  {/* Name */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Full Name</Form.Label>

                    <div className="position-relative">
                      <FaUser
                        className="position-absolute"
                        style={{
                          left: "16px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6c757d",
                          zIndex: 2,
                        }}
                      />

                      <Form.Control
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="ps-5 py-3 rounded-3"
                        style={{
                          background: "#f8f9fa",
                        }}
                        required
                      />
                    </div>
                  </Form.Group>

                  {/* Email */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      Email Address
                    </Form.Label>

                    <div className="position-relative">
                      <FaEnvelope
                        className="position-absolute"
                        style={{
                          left: "16px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6c757d",
                          zIndex: 2,
                        }}
                      />

                      <Form.Control
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="ps-5 py-3 rounded-3"
                        style={{
                          background: "#f8f9fa",
                        }}
                        required
                      />
                    </div>
                  </Form.Group>

                  {/* Password */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Password</Form.Label>

                    <div className="position-relative">
                      <FaLock
                        className="position-absolute"
                        style={{
                          left: "16px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6c757d",
                          zIndex: 2,
                        }}
                      />

                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="ps-5 pe-5 py-3 rounded-3"
                        style={{
                          background: "#f8f9fa",
                        }}
                        required
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          background: "transparent",
                          color: "#6c757d",
                        }}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </Form.Group>

                  {/* Confirm Password */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Confirm Password
                    </Form.Label>

                    <div className="position-relative">
                      <FaLock
                        className="position-absolute"
                        style={{
                          left: "16px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6c757d",
                          zIndex: 2,
                        }}
                      />

                      <Form.Control
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="ps-5 pe-5 py-3 rounded-3"
                        style={{
                          background: "#f8f9fa",
                        }}
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        style={{
                          position: "absolute",
                          right: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          background: "transparent",
                          color: "#6c757d",
                        }}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </Form.Group>

                  {/* Register */}
                  <Button
                    type="submit"
                    variant="dark"
                    className="w-100 py-3 rounded-3 fw-semibold border-0"
                    disabled={loading}
                    style={{
                      background: "linear-gradient(135deg, #212529, #343a40)",
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <FaArrowRight className="ms-2" />
                      </>
                    )}
                  </Button>
                </Form>

                {/* Login */}
                {/* Back to Dashboard */}
                <div className="text-center mt-4">
                  <Button
                    variant="link"
                    className="text-decoration-none fw-semibold"
                    onClick={() => navigate("/admin/dashboard")}
                  >
                    ← Back to Dashboard
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UserRegister;
