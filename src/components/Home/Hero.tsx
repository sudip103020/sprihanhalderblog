import { Container, Row, Col, Button } from "react-bootstrap";
import { FaHeart, FaCamera } from "react-icons/fa";

const Hero = () => {
  return (
    <section className="hero-section">
      <Container>
        <Row className="align-items-center min-vh-75">
          <Col lg={6} className="hero-content">
            <p className="hero-small-text">
              Welcome to my little world
            </p>

            <h1>
              Hello, I'm <span>Sprihan</span>
            </h1>

            <p className="hero-description">
              A little collection of my precious moments, beautiful memories,
              and my journey of growing up with love.
            </p>

            <div className="hero-buttons">
              <Button href="#memories" className="primary-btn">
                <FaCamera /> Explore Memories
              </Button>

              <Button href="#about" className="secondary-btn">
                <FaHeart /> My Story
              </Button>
            </div>
          </Col>

          <Col lg={6} className="hero-image-wrapper">
            <div className="hero-image-box">
              <div className="image-placeholder">
                <FaHeart />
                <span>Sprihan's Photo</span>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default Hero;