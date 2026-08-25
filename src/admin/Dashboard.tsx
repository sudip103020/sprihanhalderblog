import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";

import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Modal,
  Form,
  Image,
  Alert,
} from "react-bootstrap";

import {
  FaImages,
  FaPen,
  FaSignOutAlt,
  FaVideo,
  FaPlane,
  FaHeart,
  FaFileMedical,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCamera,
  FaBlog,
  FaUserPlus,
  FaComments,
} from "react-icons/fa";

import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";

interface CategoryCard {
  type: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  bg: string;
}

const Dashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [blogCount, setBlogCount] = useState(0);

  const [counts, setCounts] = useState({
    prescription: 0,
    travel: 0,
    general: 0,
    video: 0,
    program: 0,
    other: 0,
  });

  // Profile
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileName, setProfileName] = useState("Admin");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [documentCount, setDocumentCount] = useState(0);

  // =========================
  // Load Profile
  // =========================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/admin/login");
        return;
      }

      setProfileEmail(user.email || "");

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          setProfileName(
            data.name ||
              user.displayName ||
              user.email?.split("@")[0] ||
              "Admin",
          );

          setProfilePhoto(data.photoURL || "");
        } else {
          setProfileName(
            user.displayName || user.email?.split("@")[0] || "Admin",
          );
        }
      } catch (error) {
        console.error("Profile load error:", error);
      } finally {
        setProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // =========================
  // Load Dashboard Stats
  // =========================
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);

        const memorySnapshot = await getDocs(collection(db, "memories"));

        const newCounts = {
          prescription: 0,
          travel: 0,
          general: 0,
          video: 0,
          program: 0,
          other: 0,
        };

        const documentSnapshot = await getDocs(collection(db, "documents"));

        setDocumentCount(documentSnapshot.size);

        memorySnapshot.docs.forEach((item) => {
          const data = item.data();
          const type = data.type;

          if (Object.prototype.hasOwnProperty.call(newCounts, type)) {
            newCounts[type as keyof typeof newCounts]++;
          }
        });

        setCounts(newCounts);

        // Blog count
        const blogSnapshot = await getDocs(collection(db, "blogPosts"));

        setBlogCount(blogSnapshot.size);
      } catch (error) {
        console.error("Dashboard stats error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  // =========================
  // Logout
  // =========================
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // =========================
  // Profile File Select
  // =========================
  const handleProfileFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("শুধু image file নির্বাচন করুন।");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Profile photo সর্বোচ্চ 5MB হতে পারবে।");
      return;
    }

    setProfileError("");
    setProfileFile(file);

    const preview = URL.createObjectURL(file);
    setProfilePreview(preview);

    event.target.value = "";
  };

  // =========================
  // Upload Profile Photo
  // =========================
  const handleProfileUpload = async () => {
    if (!profileFile) {
      setProfileError("একটি ছবি নির্বাচন করুন।");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setProfileError("Admin login পাওয়া যায়নি।");
      return;
    }

    try {
      setUploadingProfile(true);
      setProfileError("");
      setProfileSuccess("");

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary configuration পাওয়া যায়নি।");
      }

      // =========================
      // Cloudinary Upload
      // =========================

      const formData = new FormData();

      formData.append("file", profileFile);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Profile photo upload failed.");
      }

      const data = await response.json();

      const photoURL = data.secure_url;

      // =========================
      // Save Public Profile Photo
      // =========================

      await setDoc(
        doc(db, "siteSettings", "profile"),
        {
          photoURL,
          updatedAt: new Date(),
        },
        {
          merge: true,
        },
      );

      // =========================
      // Also Save Admin Profile
      // =========================

      await setDoc(
        doc(db, "users", user.uid),
        {
          name: profileName || user.email?.split("@")[0] || "Admin",
          email: user.email || "",
          photoURL,
          updatedAt: new Date(),
        },
        {
          merge: true,
        },
      );

      // =========================
      // Update UI
      // =========================

      setProfilePhoto(photoURL);
      setProfileFile(null);

      if (profilePreview) {
        URL.revokeObjectURL(profilePreview);
      }

      setProfilePreview("");

      setProfileSuccess("Profile photo সফলভাবে পরিবর্তন হয়েছে।");
    } catch (error) {
      console.error("Profile photo upload error:", error);

      setProfileError(
        error instanceof Error
          ? error.message
          : "Profile photo upload করতে সমস্যা হয়েছে।",
      );
    } finally {
      setUploadingProfile(false);
    }
  };

  // =========================
  // Close Profile Modal
  // =========================
  const closeProfileModal = () => {
    if (profilePreview) {
      URL.revokeObjectURL(profilePreview);
    }

    setProfilePreview("");
    setProfileFile(null);
    setProfileError("");
    setProfileSuccess("");
    setShowProfileModal(false);
  };

  const totalMemories = Object.values(counts).reduce((a, b) => a + b, 0);

  // =========================
  // Categories
  // =========================
  const categories: CategoryCard[] = [
    {
      type: "prescription",
      title: "Prescription",
      icon: <FaFileMedical />,
      description: "Medical memories",
      bg: "danger",
    },
    {
      type: "travel",
      title: "Travel",
      icon: <FaPlane />,
      description: "Travel memories",
      bg: "primary",
    },
    {
      type: "general",
      title: "General",
      icon: <FaHeart />,
      description: "Beautiful moments",
      bg: "success",
    },
    {
      type: "video",
      title: "Videos",
      icon: <FaVideo />,
      description: "Video memories",
      bg: "dark",
    },
    {
      type: "program",
      title: "Programs",
      icon: <FaCalendarAlt />,
      description: "Events & programs",
      bg: "warning",
    },
    {
      type: "other",
      title: "Others",
      icon: <FaMapMarkerAlt />,
      description: "Other memories",
      bg: "secondary",
    },
  ];

  const getCount = (type: string) => {
    return counts[type as keyof typeof counts] || 0;
  };

  const displayPhoto = profilePreview || profilePhoto;

  return (
    <div className="min-vh-100 bg-light">
      {/* =========================
          Header
      ========================== */}
      <div className="bg-white shadow-sm sticky-top">
        <Container>
          <div className="d-flex justify-content-between align-items-center py-3">
            {/* Logo */}
            <div className="d-flex align-items-center">
              <div>
                <small className="fw-bold mb-0">Welcome ! Sprihan Halder</small>
              </div>
            </div>

            {/* Right */}
            <div className="d-flex align-items-center gap-2">
              {/* Messages */}
              <Button
                variant="light"
                className="dashboard-header-btn"
                onClick={() => navigate("/users")}
                title="Messages"
              >
                <FaComments />
              </Button>
              {/* Profile */}
              <Button
                variant="light"
                className="rounded-circle p-0 border"
                style={{
                  width: "44px",
                  height: "44px",
                  overflow: "hidden",
                }}
                onClick={() => setShowProfileModal(true)}
                title="Profile"
              >
                {profileLoading ? (
                  <Spinner animation="border" size="sm" />
                ) : displayPhoto ? (
                  <Image
                    src={displayPhoto}
                    className="w-100 h-100"
                    style={{
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "20px" }}>👤</span>
                )}
              </Button>

              {/* Logout */}
              <Button
                variant="outline-danger"
                className="rounded-pill px-3"
                onClick={handleLogout}
              >
                <FaSignOutAlt className="me-2" />
                <span className="d-none d-sm-inline">Logout</span>
              </Button>
            </div>
          </div>
        </Container>
      </div>

      {/* =========================
          Main
      ========================== */}
      <Container className="py-4 dashboard-container">
        {/* Welcome */}

        {/* =========================
            Overview
        ========================== */}
        <Row className="g-4 mb-5">
          <Col xs={6} md={4}>
            <Card
              className="dashboard-stat-card h-100"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/admin/memories")}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-center">
                  <div className="dashboard-stat-icon bg-dark text-white me-3">
                    <FaImages />
                  </div>

                  <div>
                    <div className="dashboard-stat-label">Total Memories</div>

                    <h2 className="dashboard-stat-number">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        totalMemories
                      )}
                    </h2>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} md={4}>
            <Card
              className="dashboard-stat-card h-100"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/admin/blogs")}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: "60px",
                      height: "60px",
                      fontSize: "26px",
                    }}
                  >
                    <FaBlog />
                  </div>

                  <div>
                    <div className="dashboard-stat-label">Total Blog Posts</div>

                    <h2 className="dashboard-stat-number">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        blogCount
                      )}
                    </h2>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} md={4}>
            <Card
              className="dashboard-stat-card h-100"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/admin/documents")}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-3 bg-danger text-white d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: "60px",
                      height: "60px",
                      fontSize: "26px",
                    }}
                  >
                    📄
                  </div>

                  <div>
                    <div className="dashboard-stat-label"> Total Documents</div>

                    <h2 className="dashboard-stat-number">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        documentCount
                      )}
                    </h2>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* =========================
            Categories
        ========================== */}
        <div className="mb-4">
          <h4 className="fw-bold mb-1">Memories by Category</h4>

          
        </div>

        <Row className="g-4">
          {categories.map((category) => (
            <Col xs={6} sm={6} lg={3} key={category.type}>
              <Card
                className="dashboard-category-card h-100"
                style={{
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onClick={() =>
                  navigate(`/admin/memories?type=${category.type}`)
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 25px rgba(0,0,0,0.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div
                      className={`dashboard-category-icon bg-${category.bg} text-white`}
                    >
                      {category.icon}
                    </div>

                    <div className="text-end">
                      <h2 className="dashboard-category-count">
                        {loading ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          getCount(category.type)
                        )}
                      </h2>

                      <small className="text-muted">Memories</small>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="fw-bold mb-1">{category.title}</h5>

                    <p className="text-muted mb-0">{category.description}</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* =========================
            Quick Actions
        ========================== */}
        <div className="mt-5">
          <h4 className="fw-bold mb-3">Add Task Section</h4>

          <Row className="g-3">
            <Col xs={6} md={3}>
              <Button
                variant="dark"
                className="w-100 py-3"
                onClick={() => navigate("/admin/memories/add")}
              >
                <FaImages className="me-2" />
                Add New Memory
              </Button>
            </Col>

           

            <Col xs={6} md={3}>
              <Button
                variant="primary"
                className="w-100 py-3"
                onClick={() => navigate("/admin/blogs/add")}
              >
                <FaPen className="me-2" />
                Write Blog Post
              </Button>
            </Col>

            <Col xs={6} md={3}>
              <Button
                variant="danger"
                className="w-100 py-3"
                onClick={() => navigate("/admin/documents/add")}
              >
                📄
                <span className="ms-2">Add Doc</span>
              </Button>
            </Col>
            {/* Register User */}
            <Col xs={6} md={3}>
              <Button
                variant="success"
                className="w-100 py-3"
                onClick={() => navigate("/admin/users/register")}
              >
                <FaUserPlus className="me-2" />
                Register User
              </Button>
            </Col>
          </Row>
        </div>

        {/* =========================
            Profile Card
        ========================== */}
      </Container>

      {/* =========================
          Profile Modal
      ========================== */}
      <Modal show={showProfileModal} onHide={closeProfileModal} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Admin Profile</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {profileError && (
            <Alert
              variant="danger"
              dismissible
              onClose={() => setProfileError("")}
            >
              {profileError}
            </Alert>
          )}

          {profileSuccess && <Alert variant="success">{profileSuccess}</Alert>}

          <div className="text-center mb-4">
            <div
              className="rounded-circle border mx-auto mb-3 d-flex align-items-center justify-content-center"
              style={{
                width: "140px",
                height: "140px",
                overflow: "hidden",
                fontSize: "50px",
                background: "#f8f9fa",
              }}
            >
              {displayPhoto ? (
                <Image
                  src={displayPhoto}
                  className="w-100 h-100"
                  style={{
                    objectFit: "cover",
                  }}
                />
              ) : (
                "👤"
              )}
            </div>

            <small className="text-muted">{profileEmail}</small>
          </div>

          <Form.Group>
            <Form.Label className="fw-semibold">Profile Photo</Form.Label>

            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleProfileFile}
              disabled={uploadingProfile}
            />

            <Form.Text className="text-muted">
              JPG, PNG অথবা WebP. Maximum 5MB.
            </Form.Text>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={closeProfileModal}
            disabled={uploadingProfile}
          >
            Close
          </Button>

          <Button
            variant="dark"
            onClick={handleProfileUpload}
            disabled={uploadingProfile || !profileFile}
          >
            {uploadingProfile ? (
              <>
                <Spinner size="sm" className="me-2" />
                Uploading...
              </>
            ) : (
              <>
                <FaCamera className="me-2" />
                Save Photo
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Dashboard;
