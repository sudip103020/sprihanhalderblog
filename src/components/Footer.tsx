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
} from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="footer">
      <Container>
        <Row className="gy-4">
          {/* About */}
          <Col xs={12} md={6} lg={4}>
            <div className="footer-brand">
              <h4>
                ✍️ <span>SprihanBlog</span>
              </h4>

              <p>
                A personal blog where memories, technology, projects, and
                experiences are shared beautifully.
              </p>
            </div>
          </Col>

          {/* Quick Links */}
          <Col xs={12} sm={6} lg={3}>
            <h5 className="footer-title ">Quick Links</h5>

            <ul className="footer-links">
              <li>
                <NavLink to="/">Home</NavLink>
              </li>

              <li>
                <NavLink to="/about">About</NavLink>
              </li>

              <li>
                <NavLink to="/memory-album">Memory Album</NavLink>
              </li>

              <li>
                <NavLink to="/contact">Contact</NavLink>
              </li>
            </ul>
          </Col>

          {/* Contact */}
          <Col xs={12} sm={6} lg={3}>
            <h5 className="footer-title">Contact</h5>

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
            © 2026 Sprihan Halder. Made with{" "}
            <FaHeart className="small-heart" /> By Family.
          </small>

          <div className="mt-2">
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
