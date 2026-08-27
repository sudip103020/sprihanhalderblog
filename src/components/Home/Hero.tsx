import { Container, Row, Col, Button, Badge } from "react-bootstrap";
import { FaHeart, FaCamera, FaBirthdayCake } from "react-icons/fa";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

const Hero = () => {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // Calculate Age
  // ==========================================

  const calculateAge = (dob: string) => {
    if (!dob) return "";

    const birthDate = new Date(dob);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (today.getDate() < birthDate.getDate()) {
      months--;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years === 0) {
      return `${months} month${months !== 1 ? "s" : ""} old`;
    }

    if (months === 0) {
      return `${years} year${years !== 1 ? "s" : ""} old`;
    }

    return `${years} year${years !== 1 ? "s" : ""} ${months} month${
      months !== 1 ? "s" : ""
    } old`;
  };

  // ==========================================
  // Load Profile
  // ==========================================

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileRef = doc(db, "siteSettings", "profile");

        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();

          console.log("Profile data:", data);

          // Profile Photo
          if (data.photoURL) {
            setProfilePhoto(data.photoURL);
          }

          // Date of Birth
          if (data.dateOfBirth) {
            setDateOfBirth(data.dateOfBirth);
          }
        } else {
          console.log("siteSettings/profile document not found");
        }
      } catch (error) {
        console.error("Profile load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // ==========================================
  // Format Birthday
  // ==========================================

  const formatBirthday = (dob: string) => {
    const date = new Date(dob);

    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
  <section className="hero-section">
    <Container>
      <Row className="align-items-center py-4 py-lg-5">

        {/* Hero Content */}
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

          {!loading && dateOfBirth && (
            <div className="hero-info mt-3">
              <div className="d-flex flex-wrap gap-2">
                <Badge bg="light" text="dark" className="p-2 border">
                  <FaBirthdayCake className="me-2" />
                  Birthday: {formatBirthday(dateOfBirth)}
                </Badge>

                <Badge bg="light" text="dark" className="p-2 border">
                  🎂 {calculateAge(dateOfBirth)}
                </Badge>
              </div>
            </div>
          )}

          <div className="hero-buttons mt-4">
            <Button href="#memories" className="primary-btn">
              <FaCamera className="me-2" />
              Explore Memories
            </Button>

            <Button href="#family" className="secondary-btn">
              <FaHeart className="me-2" />
              My Family
            </Button>
          </div>
        </Col>

        {/* Hero Image */}
        <Col lg={6} className="hero-image-wrapper">
          <div className="hero-image-box">
            <div className="image-placeholder">
              {loading ? (
                <div className="profile-loading">Loading...</div>
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
