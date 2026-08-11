import { Container } from "react-bootstrap";
import { FaHeart } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="footer">
      <Container className="text-center">
        <FaHeart className="footer-heart" />

        <h5>Sprihan Halder</h5>

        <p>
          A little world full of love, memories and beautiful moments.
        </p>

        <div className="footer-line" />

        <small>
          © {new Date().getFullYear()} Sprihan Halder. Made with{" "}
          <FaHeart className="small-heart" /> by family.
        </small>
      </Container>
    </footer>
  );
};

export default Footer;