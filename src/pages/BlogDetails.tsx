import { useEffect, useState } from "react";

import {
  Container,
  Card,
  Spinner,
  Alert,
  Badge,
  Button,
  Image,
} from "react-bootstrap";

import {
  FaArrowLeft,
  FaCalendarAlt,
  FaBlog,
} from "react-icons/fa";

import {
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

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
  updatedAt?: Timestamp;
}

// =====================================================
// Component
// =====================================================

const BlogDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [blog, setBlog] =
    useState<BlogPost | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ===================================================
  // Load Blog
  // ===================================================

  useEffect(() => {
    const loadBlog = async () => {
      if (!id) {
        setError("Blog post পাওয়া যায়নি।");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const blogRef = doc(
          db,
          "blogPosts",
          id
        );

        const blogSnap = await getDoc(
          blogRef
        );

        // Blog not found
        if (!blogSnap.exists()) {
          setError(
            "এই blog post পাওয়া যায়নি।"
          );
          return;
        }

        const data = blogSnap.data();

        // =========================================
        // Only Published Blog
        // =========================================

        if (data.status === "draft") {
          setError(
            "এই blog post বর্তমানে প্রকাশিত নয়।"
          );
          return;
        }

        setBlog({
          id: blogSnap.id,

          title:
            data.title || "",

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

          updatedAt:
            data.updatedAt,
        });
      } catch (error) {
        console.error(
          "Blog details load error:",
          error
        );

        setError(
          "Blog post load করতে সমস্যা হয়েছে।"
        );
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [id]);

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
      .toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );
  };

  // ===================================================
  // Loading
  // ===================================================

  if (loading) {
    return (
      <section
        className="py-5"
        style={{
          minHeight: "80vh",
          background: "#f8f9fa",
        }}
      >
        <Container>
          <div className="text-center py-5">
            <Spinner animation="border" />

            <p className="text-muted mt-3">
              Loading blog...
            </p>
          </div>
        </Container>
      </section>
    );
  }

  // ===================================================
  // Error
  // ===================================================

  if (error || !blog) {
    return (
      <section
        className="py-5"
        style={{
          minHeight: "80vh",
          background: "#f8f9fa",
        }}
      >
        <Container>
          <div
            className="text-center"
            style={{
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            <Alert variant="danger">
              {error ||
                "Blog post পাওয়া যায়নি।"}
            </Alert>

            <Button
              variant="outline-dark"
              onClick={() =>
                navigate("/blogs")
              }
            >
              <FaArrowLeft className="me-2" />
              Back to Blogs
            </Button>
          </div>
        </Container>
      </section>
    );
  }

  // ===================================================
  // Blog Details
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
            Back Button
        ========================================== */}

        <div className="mb-4">
          <Button
            variant="outline-dark"
            onClick={() =>
              navigate("/blogs")
            }
          >
            <FaArrowLeft className="me-2" />
            Back to Blogs
          </Button>
        </div>

        {/* =========================================
            Blog Card
        ========================================== */}

        <Card
          className="border-0 shadow-sm"
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            overflow: "hidden",
          }}
        >
          {/* =======================================
              Featured Image
          ======================================== */}

          {blog.image ? (
            <Image
              src={blog.image}
              alt={blog.title}
              style={{
                width: "100%",
                maxHeight: "550px",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                height: "350px",
                background: "#e9ecef",
                color: "#999",
              }}
            >
              <FaBlog size={70} />
            </div>
          )}

          {/* =======================================
              Content
          ======================================== */}

          <Card.Body
            className="p-4 p-md-5"
          >
            {/* Status + Date */}

            <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
              <Badge
                bg="success"
                className="px-3 py-2"
              >
                Published
              </Badge>

              {blog.createdAt && (
                <span className="text-muted">
                  <FaCalendarAlt className="me-2" />

                  {formatDate(
                    blog.createdAt
                  )}
                </span>
              )}
            </div>

            {/* Title */}

            <h1
              className="fw-bold mb-3"
              style={{
                lineHeight: 1.3,
              }}
            >
              {blog.title}
            </h1>

            {/* Description */}

            {blog.description && (
              <p
                className="lead text-muted mb-4"
                style={{
                  lineHeight: 1.7,
                }}
              >
                {blog.description}
              </p>
            )}

            <hr />

            {/* ===================================
                Full Content
            ==================================== */}

            <div
              className="blog-content mt-4"
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.9,
                fontSize: "17px",
              }}
            >
              {blog.content}
            </div>

            {/* ===================================
                Bottom Back Button
            ==================================== */}

            <div className="text-center mt-5 pt-4 border-top">
              <Button
                variant="outline-dark"
                onClick={() =>
                  navigate("/blogs")
                }
              >
                <FaArrowLeft className="me-2" />
                Back to All Blogs
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </section>
  );
};

export default BlogDetails;