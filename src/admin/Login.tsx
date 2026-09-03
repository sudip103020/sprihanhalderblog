import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
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
  FaLock,
  FaEnvelope,
  FaBaby,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  
} from "react-icons/fa";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (
  e: React.FormEvent<HTMLFormElement>
) => {
  e.preventDefault();

  setError("");
  setLoading(true);

  try {
    // Firebase Authentication Login
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const firebaseUser = userCredential.user;

    // Firestore থেকে user data আনবে
    const userQuery = query(
      collection(db, "users"),
      where("uid", "==", firebaseUser.uid)
    );

    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      setError(
        "User profile not found. Please contact administrator."
      );

      await auth.signOut();
      return;
    }

    const userData = userSnapshot.docs[0].data();

    const role = userData.role?.toLowerCase();

    // LocalStorage এ user data save
    localStorage.setItem(
      "user",
      JSON.stringify({
        uid: firebaseUser.uid,
        name:
          userData.name ||
          firebaseUser.displayName ||
          "User",
        email: firebaseUser.email,
        photo:
          userData.photo ||
          firebaseUser.photoURL ||
          "",
        role: role,
        phone: userData.phone || "",
        designation: userData.designation || "",
      })
    );

    // =========================
    // ROLE BASED REDIRECT
    // =========================

    if (role === "admin") {
      navigate("/admin/dashboard", {
        replace: true,
      });
    } else if (role === "user") {
      navigate("/user/dashboard", {
        replace: true,
      });
    } else {
      setError(
        "Your account role is not configured. Please contact administrator."
      );

      await auth.signOut();
      localStorage.removeItem("user");
    }
  } catch (error: any) {
    console.error(error);

    switch (error.code) {
      case "auth/invalid-credential":
        setError("Invalid email or password.");
        break;

      case "auth/user-not-found":
        setError("No account found with this email.");
        break;

      case "auth/wrong-password":
        setError("Incorrect password.");
        break;

      case "auth/too-many-requests":
        setError(
          "Too many attempts. Please try again later."
        );
        break;

      default:
        setError(
          "Login failed. Please check your details and try again."
        );
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
      {/* Decorative circles */}
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
          <Col
            xs={12}
            sm={10}
            md={7}
            lg={5}
            xl={4}
          >
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
                      background:
                        "linear-gradient(135deg, #212529, #495057)",
                      color: "#fff",
                    }}
                  >
                    <FaBaby size={38} />
                  </div>

                  <h2 className="fw-bold mt-4 mb-1">
                    Welcome!
                  </h2>

                  <p className="text-muted mb-0">
                    Sprihan Halder Blog
                  </p>
                </div>

                {/* Small badge */}
                <div className="text-center mb-4">
                  <span
                    className="d-inline-flex align-items-center px-3 py-2 rounded-pill"
                    style={{
                      background: "#f1f3f5",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    <FaLock className="me-2" />
                    Secure Admin Login
                  </span>
                </div>

                {/* Error */}
                {error && (
                  <Alert
                    variant="danger"
                    className="rounded-3 small"
                  >
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleLogin}>

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
                          transform:
                            "translateY(-50%)",
                          color: "#6c757d",
                          zIndex: 2,
                        }}
                      />

                      <Form.Control
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) =>
                          setEmail(e.target.value)
                        }
                        className="ps-5 py-3 rounded-3 border"
                        style={{
                          background: "#f8f9fa",
                        }}
                        required
                      />
                    </div>
                  </Form.Group>

                  {/* Password */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Password
                    </Form.Label>

                    <div className="position-relative">

                      <FaLock
                        className="position-absolute"
                        style={{
                          left: "16px",
                          top: "50%",
                          transform:
                            "translateY(-50%)",
                          color: "#6c757d",
                          zIndex: 2,
                        }}
                      />

                      <Form.Control
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) =>
                          setPassword(e.target.value)
                        }
                        className="ps-5 pe-5 py-3 rounded-3 border"
                        style={{
                          background: "#f8f9fa",
                        }}
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            !showPassword
                          )
                        }
                        style={{
                          position: "absolute",
                          right: "14px",
                          top: "50%",
                          transform:
                            "translateY(-50%)",
                          border: "none",
                          background: "transparent",
                          color: "#6c757d",
                          cursor: "pointer",
                        }}
                      >
                        {showPassword ? (
                          <FaEyeSlash />
                        ) : (
                          <FaEye />
                        )}
                      </button>

                    </div>
                  </Form.Group>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    variant="dark"
                    className="w-100 py-3 rounded-3 fw-semibold border-0"
                    disabled={loading}
                    style={{
                      background:
                        "linear-gradient(135deg, #212529, #343a40)",
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          size="sm"
                          className="me-2"
                        />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Login to Admin
                        <FaArrowRight className="ms-2" />
                      </>
                    )}
                  </Button>
                </Form>

               

              </Card.Body>
            </Card>

            {/* Bottom text */}
           

          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;