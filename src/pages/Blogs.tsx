import { useEffect, useState } from "react";

import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Badge,
  Image,
} from "react-bootstrap";

import {
  FaBlog,
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
} from "react-icons/fa";

import {
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";

import { Link } from "react-router-dom";

import { db } from "../firebase/config";

// =====================================================
// Interface
// =====================================================

interface BlogPost {
  id: string;
  title: string;
  description: string;
  content: string;
  image: string;
  status: "published" | "draft";
  createdAt?: Timestamp;
}

// =====================================================
// Component
// =====================================================

const Blogs = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ===================================================
  // Load Published Blogs
  // ===================================================

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        setError("");

        // =============================================
        // Get all blog posts
        // =============================================

        const snapshot = await getDocs(
          collection(db, "blogPosts")
        );

        // =============================================
        // Convert Firestore data
        // =============================================

        const blogData: BlogPost[] = snapshot.docs
          .map((item): BlogPost => {
            const data = item.data();

            return {
              id: item.id,

              title: data.title || "",

              description:
                data.description || "",

              content:
                data.content || "",

              image:
                data.image || "",

              status:
                data.status === "draft"
                  ? "draft"
                  : "published",

              createdAt:
                data.createdAt,
            };
          })

          // =========================================
          // Only Published Blogs
          // =========================================

          .filter(
            (blog) =>
              blog.status === "published"
          )

          // =========================================
          // Latest Blog First
          // =========================================

          .sort((a, b) => {
            const dateA =
              a.createdAt
                ?.toDate()
                .getTime() || 0;

            const dateB =
              b.createdAt
                ?.toDate()
                .getTime() || 0;

            return dateB - dateA;
          });

        setBlogs(blogData);
      } catch (error) {
        console.error(
          "Blogs load error:",
          error
        );

        setError(
          "Blogs load করতে সমস্যা হয়েছে।"
        );
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, []);

  // ===================================================
  // Format Date
  // ===================================================

  const formatDate = (
    timestamp?: Timestamp
  ) => {
    if (!timestamp) {
      return "";
    }

    return timestamp
      .toDate()
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
  };

  // ===================================================
  // Loading
  // ===================================================

  if (loading) {
    return (
      <section className="py-5">
        <Container>
          <div className="text-center py-5">

            <Spinner animation="border" />

            <p className="text-muted mt-3">
              Loading blogs...
            </p>

          </div>
        </Container>
      </section>
    );
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <section
      className="py-5"
      style={{
        background: "#f8f9fa",
        minHeight: "80vh",
      }}
    >
      <Container>

        {/* =========================================
            Header
        ========================================== */}

        <div className="text-center mb-5">

          <p className="section-subtitle">
            My thoughts & stories
          </p>

          <h1 className="section-title">
            My <span>Blogs</span>
          </h1>

          <p className="text-muted">
            Little stories, experiences, and
            beautiful moments from my journey.
          </p>

        </div>

        {/* =========================================
            Error
        ========================================== */}

        {error && (
          <Alert
            variant="danger"
            className="text-center"
          >
            {error}
          </Alert>
        )}

        {/* =========================================
            No Blogs
        ========================================== */}

        {!error &&
          blogs.length === 0 && (
            <div className="text-center py-5">

              <FaBlog
                size={55}
                className="text-muted mb-3"
              />

              <h5 className="fw-bold">
                No blogs available
              </h5>

              <p className="text-muted">
                Beautiful stories will appear here.
              </p>

            </div>
          )}

        {/* =========================================
            Blog Cards
        ========================================== */}

        {blogs.length > 0 && (
          <Row className="g-4">

            {blogs.map((blog) => (
              <Col
                xs={12}
                md={6}
                lg={4}
                key={blog.id}
              >

                <Card
                  className="h-100 border-0 shadow-sm"
                  style={{
                    overflow: "hidden",
                  }}
                >

                  {/* =================================
                      Image
                  ================================== */}

                  {blog.image ? (
                    <Image
                      src={blog.image}
                      alt={blog.title}
                      style={{
                        width: "100%",
                        height: "230px",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        height: "230px",
                        background: "#e9ecef",
                        color: "#999",
                      }}
                    >
                      <FaBlog size={55} />
                    </div>
                  )}

                  {/* =================================
                      Body
                  ================================== */}

                  <Card.Body className="p-4">

                    {/* Date */}

                    <div className="d-flex justify-content-between align-items-center mb-2">

                      <Badge bg="success">
                        Published
                      </Badge>

                      {blog.createdAt && (
                        <small className="text-muted">
                          <FaCalendarAlt className="me-1" />

                          {formatDate(
                            blog.createdAt
                          )}
                        </small>
                      )}

                    </div>

                    {/* Title */}

                    <Card.Title
                      className="fw-bold mt-3"
                      style={{
                        display:
                          "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient:
                          "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {blog.title}
                    </Card.Title>

                    {/* Description */}

                    <Card.Text
                      className="text-muted"
                      style={{
                        display:
                          "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient:
                          "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {blog.description}
                    </Card.Text>

                    {/* =================================
                        Read More
                    ================================== */}

                    <Link
                      to={`/blog/${blog.id}`}
                      className="btn btn-outline-dark mt-2"
                    >
                      Read More

                      <FaArrowRight className="ms-2" />
                    </Link>

                  </Card.Body>

                </Card>

              </Col>
            ))}

          </Row>
        )}

        {/* =========================================
            Back Home
        ========================================== */}

        <div className="text-center mt-5">

          <Link
            to="/"
            className="btn btn-outline-dark"
          >
            <FaArrowLeft className="me-2" />

            Back to Home
          </Link>

        </div>

      </Container>
    </section>
  );
};

export default Blogs;