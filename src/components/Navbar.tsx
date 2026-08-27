import {
  Container,
  Nav,
  Navbar as BootstrapNavbar,
} from "react-bootstrap";

import { FaHeart } from "react-icons/fa";

import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <BootstrapNavbar
      expand="lg"
      className="main-navbar"
      sticky="top"
    >
      <Container>

        {/* Logo */}
        <BootstrapNavbar.Brand
          as={Link}
          to="/"
          className="brand"
        >
          <FaHeart className="brand-icon" />
          Sprihan Halder
        </BootstrapNavbar.Brand>

        {/* Mobile Toggle */}
        <BootstrapNavbar.Toggle
          aria-controls="main-navbar"
        />

        {/* Menu */}
        <BootstrapNavbar.Collapse id="main-navbar">
          <Nav className="ms-auto">

            <Nav.Link as={Link} to="/">
              Home
            </Nav.Link>

           <Nav.Link
  onClick={() => {
    if (window.location.pathname !== "/") {
      window.location.href = "/#family";
    } else {
      document.getElementById("family")?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }}
>
  Family
</Nav.Link>
            <Nav.Link as={Link} to="/memories">
              Memories
            </Nav.Link>

            <Nav.Link as={Link} to="/blogs">
              Blogs
            </Nav.Link>

          </Nav>
        </BootstrapNavbar.Collapse>

      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;