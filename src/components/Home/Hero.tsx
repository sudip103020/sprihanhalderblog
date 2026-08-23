import { Container, Row, Col, Button } from "react-bootstrap";
import { FaHeart, FaCamera } from "react-icons/fa";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

const Hero = () => {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfilePhoto = async () => {
      try {
        // Public profile document
        const profileRef = doc(
          db,
          "siteSettings",
          "profile"
        );

        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();

          console.log("Profile data:", data);
          console.log("Profile photo:", data.photoURL);

          if (data.photoURL) {
            setProfilePhoto(data.photoURL);
          }
        } else {
          console.log(
            "siteSettings/profile document not found"
          );
        }
      } catch (error) {
        console.error(
          "Profile image load error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfilePhoto();
  }, []);

  return (
    <section className="hero-section">
      <Container>
        <Row className="align-items-center min-vh-75">

          {/* =========================
              Hero Content
          ========================== */}

          <Col lg={6} className="hero-content">
            <p className="hero-small-text">
              Welcome to my little world
            </p>

            <h1>
              Hello, I'm <span>Sprihan</span>
            </h1>

            <p className="hero-description">
              A little collection of my precious moments,
              beautiful memories, and my journey of growing
              up with love.
            </p>

            <div className="hero-buttons">
              <Button
                href="#memories"
                className="primary-btn"
              >
                <FaCamera className="me-2" />
                Explore Memories
              </Button>

              <Button
                href="#about"
                className="secondary-btn"
              >
                <FaHeart className="me-2" />
                My Story
              </Button>
            </div>
          </Col>

          {/* =========================
              Hero Image
          ========================== */}

          <Col
            lg={6}
            className="hero-image-wrapper"
          >
            <div className="hero-image-box">

              <div className="image-placeholder">

                {loading ? (
                  <div className="profile-loading">
                    Loading...
                  </div>
                ) : profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Sprihan"
                    className="profile-image"
                  />
                ) : (
                  <div className="profile-loading">
                    No Profile Image
                  </div>
                )}

              </div>

              {/* Decorative Heart */}
              <div className="hero-heart">
                <FaHeart />
              </div>

            </div>
          </Col>

        </Row>
      </Container>
    </section>
  );
};

export default Hero;