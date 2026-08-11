import { Container, Row, Col } from "react-bootstrap";
import { FaHeart, FaStar } from "react-icons/fa";

const Welcome = () => {
  return (
    <section className="welcome-section" id="about">
      <Container>
        <Row className="justify-content-center text-center">
          <Col lg={8}>
            <div className="section-icon">
              <FaHeart />
            </div>

            <p className="section-subtitle">
              A little story about me
            </p>

            <h2 className="section-title">
              Welcome to <span>Sprihan's World</span>
            </h2>

            <p className="section-text">
              This little website is a collection of my childhood memories,
              special moments, photographs, and beautiful milestones. Every
              little moment is a precious part of my journey.
            </p>

            <div className="welcome-note">
              <FaStar />
              <span>Growing every day, surrounded by love.</span>
              <FaStar />
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default Welcome;