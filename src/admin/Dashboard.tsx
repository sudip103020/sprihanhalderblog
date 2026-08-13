import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { FaImages, FaPen, FaBaby, FaSignOutAlt } from "react-icons/fa";
import { auth } from "../firebase/config";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <Container>
          <div className="d-flex justify-content-between align-items-center py-3">
            <div>
              <h4 className="fw-bold mb-0">Sprihan Admin</h4>
              <small className="text-muted">Sprihan Halder Blog</small>
            </div>

            <Button variant="outline-danger" size="sm" onClick={handleLogout}>
              <FaSignOutAlt className="me-2" />
              Logout
            </Button>
          </div>
        </Container>
      </div>

      {/* Dashboard */}
      <Container className="py-4">
        <div className="mb-4">
          <h2 className="fw-bold">Dashboard</h2>

          <p className="text-muted">
            Welcome to Sprihan Halder Blog Admin Panel
          </p>
        </div>

        {/* Statistics */}
        <Row className="g-4">
          <Col xs={12} md={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center">
                  <div className="fs-2 me-3">
                    <FaImages />
                  </div>

                  <div>
                    <h6 className="text-muted mb-1">Memories</h6>

                    <h3 className="fw-bold mb-0">0</h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center">
                  <div className="fs-2 me-3">
                    <FaPen />
                  </div>

                  <div>
                    <h6 className="text-muted mb-1">Blog Posts</h6>

                    <h3 className="fw-bold mb-0">0</h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center">
                  <div className="fs-2 me-3">
                    <FaBaby />
                  </div>

                  <div>
                    <h6 className="text-muted mb-1">Monthly Growth</h6>

                    <h3 className="fw-bold mb-0">0</h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <div className="mt-5">
          <h5 className="fw-bold mb-3">Quick Actions</h5>

          <Row className="g-3">
            <Col xs={12} md={4}>
              <Button
                variant="dark"
                className="w-100 py-3"
                onClick={() => navigate("/admin/memories/add")}
              >
                <FaImages className="me-2" />
                Add Memory
              </Button>
            </Col>

            <Col xs={12} md={4}>
  <Button
    variant="outline-dark"
    className="w-100 py-3"
    onClick={() => navigate("/admin/memories")}
  >
    <FaImages className="me-2" />
    View Memories
  </Button>
</Col>

            <Col xs={12} md={4}>
              <Button variant="dark" className="w-100 py-3">
                <FaBaby className="me-2" />
                Add Monthly Growth
              </Button>
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
};

export default Dashboard;
