import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";
import { Container, Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { FaLock, FaEnvelope } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Successful login
      navigate("/admin/dashboard");
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
          setError("Too many attempts. Please try again later.");
          break;

        default:
          setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center"
      style={{
        background: "linear-gradient(135deg, #f8f9fa, #e9ecef)",
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={6} lg={4}>
            <Card className="border-0 shadow-lg rounded-4">
              <Card.Body className="p-4 p-md-5">

                {/* Logo / Title */}
                <div className="text-center mb-4">
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: "70px",
                      height: "70px",
                      background: "#f1f3f5",
                    }}
                  >
                    <FaLock size={28} />
                  </div>

                  <h3 className="fw-bold mb-1">
                    Admin Login
                  </h3>

                  <p className="text-muted mb-0">
                    Sprihan Halder Blog
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <Alert variant="danger" className="small">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleLogin}>

                  {/* Email */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      Email
                    </Form.Label>

                    <div className="position-relative">
                      <FaEnvelope
                        className="position-absolute"
                        style={{
                          left: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6c757d",
                        }}
                      />

                      <Form.Control
                        type="email"
                        placeholder="Enter admin email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="py-2 ps-5 rounded-3"
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
                          left: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6c757d",
                        }}
                      />

                      <Form.Control
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="py-2 ps-5 rounded-3"
                        required
                      />
                    </div>
                  </Form.Group>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    className="w-100 py-2 rounded-3 fw-semibold"
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Login"}
                  </Button>

                </Form>

              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;