import { Container, Nav, Navbar as BootstrapNavbar } from "react-bootstrap";
import { FaHeart } from "react-icons/fa";

const Navbar = () => {
  return (
    <BootstrapNavbar expand="lg" className="main-navbar" sticky="top">
      <Container>
        <BootstrapNavbar.Brand href="/" className="brand">
          <FaHeart className="brand-icon" />
          Sprihan Halder
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="main-navbar" />

        <BootstrapNavbar.Collapse id="main-navbar">
          <Nav className="ms-auto">
            <Nav.Link href="/">Home</Nav.Link>
            <Nav.Link href="#about">About</Nav.Link>
            <Nav.Link href="#memories">Memories</Nav.Link>
            <Nav.Link href="#milestones">Milestones</Nav.Link>
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;