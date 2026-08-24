import { Container, Row, Col } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import {
  FaHeart,
  FaUser,
  FaBirthdayCake,
  FaEnvelope,
  FaFacebookF,
  FaGithub,
  FaGlobe,
  FaArrowRight,
} from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="footer">
      <Container>
        <Row className="gy-4">
          {/* Brand / About */}
          <Col xs={12} md={6} lg={4}>
            <div className="footer-brand">
              <h4 className="footer-logo">
                ✍️ <span>SprihanBlog</span>
              </h4>

              <p className="footer-description">
                A little place filled with precious memories, beautiful
                moments, family stories, and the journey of our little one.
              </p>

              
            </div>
          </Col>

          {/* Quick Links */}
          <Col xs={12} sm={6} lg={3}>
            <h5 className="footer-title">Quick Links</h5>

            <ul className="footer-links">
              <li>
                <NavLink to="/">
                  <FaArrowRight /> Home
                </NavLink>
              </li>

              <li>
                <NavLink to="/about">
                  <FaArrowRight /> About
                </NavLink>
              </li>

              <li>
                <NavLink to="/memory-album">
                  <FaArrowRight /> Memory Album
                </NavLink>
              </li>

              <li>
                <NavLink to="/contact">
                  <FaArrowRight /> Contact
                </NavLink>
              </li>
            </ul>
          </Col>

          {/* Contact */}
          <Col xs={12} sm={6} lg={3}>
            <h5 className="footer-title">Little One</h5>

            <div className="footer-contact">
              <p>
                <FaUser />
                <span>Sprihan Halder</span>
              </p>

              <p>
                <FaBirthdayCake />
                <span>30 October 2025</span>
              </p>

              <p>
                <FaEnvelope />
                <span>sprihanhalder@gmail.com</span>
              </p>
            </div>
          </Col>

          {/* Social */}
          <Col xs={12} lg={2}>
            <h5 className="footer-title">Follow Us</h5>

            <p className="footer-social-text">
              Follow Sprihan's journey and memories.
            </p>

            <div className="footer-social">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>

              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <FaGithub />
              </a>

              <NavLink to="/" aria-label="Website">
                <FaGlobe />
              </NavLink>
            </div>
          </Col>
        </Row>

        {/* Divider */}
        <div className="footer-line"></div>

        {/* Bottom */}
        <div className="footer-bottom">
          <small>
            © {new Date().getFullYear()} <strong>Sprihan Halder</strong>. All
            rights reserved.
          </small>

          <div className="footer-bottom-right">
            <span>
              Made with <FaHeart className="small-heart" /> by Family
            </span>

            <NavLink to="/admin/login" className="admin-login-link">
              Admin Login
            </NavLink>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;