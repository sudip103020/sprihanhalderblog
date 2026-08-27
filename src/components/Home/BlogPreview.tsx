import { useEffect, useState } from "react";


import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Button,
} from "react-bootstrap";

import {
  FaBlog,
  FaArrowRight,
  FaCalendarAlt,
} from "react-icons/fa";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase/config";

import { Link } from "react-router-dom";

interface Blog {
  id: string;
  title: string;
  description: string;
  content: string;
  image: string;
  status: "published" | "draft";
  showOnHome: boolean;
  createdAt?: {
    toDate: () => Date;
  };
}

const BlogPreview = () => {
  const [blogs, setBlogs] =
    useState<Blog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =========================
  // Load Home Blogs
  // =========================

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        setError("");

        const snapshot =
          await getDocs(
            collection(
              db,
              "blogPosts"
            )
          );

        const homeBlogs: Blog[] = [];

        snapshot.docs.forEach(
          (item) => {
            const data =
              item.data();

            // শুধু Published + Show on Home
            if (
              data.status !==
                "published" ||
              data.showOnHome !== true
            ) {
              return;
            }

            homeBlogs.push({
              id: item.id,

              title:
                data.title || "",

              description:
                data.description || "",

              content:
                data.content || "",

              image:
                data.image || "",

              status: "published",

              showOnHome: true,

              createdAt:
                data.createdAt,
            });
          }
        );

        // =========================
        // Latest first
        // =========================

        homeBlogs.sort(
          (a, b) => {
            const dateA =
              a.createdAt?.toDate()
                ?.getTime() || 0;

            const dateB =
              b.createdAt?.toDate()
                ?.getTime() || 0;

            return dateB - dateA;
          }
        );

        // সর্বোচ্চ 3টা
        setBlogs(
          homeBlogs.slice(0, 3)
        );
      } catch (error) {
        console.error(
          "Home blogs load error:",
          error
        );

        setError(
          "Blog load করতে সমস্যা হয়েছে।"
        );
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, []);

  // =========================
  // Format Date
  // =========================

  const formatDate = (
    timestamp?: {
      toDate: () => Date;
    }
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
          month: "short",
          year: "numeric",
        }
      );
  };

  // =========================
  // Loading
  // =========================

  if (loading) {
    return (
      <section className="blog-section">

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

  return (
    <section
      className="blog-section"
      id="blog"
    >

      <Container>

        {/* =========================
            Heading
        ========================= */}

        <div className="section-heading text-center">

          <p className="section-subtitle">
            From my little journal
          </p>

          <h2 className="section-title">
            My <span>Blog</span>
          </h2>

          <p>
            Little stories, experiences,
            and beautiful moments from
            my journey.
          </p>

        </div>

        {/* =========================
            Error
        ========================= */}

        {error && (
          <div className="text-center py-4">

            <p className="text-danger">
              {error}
            </p>

          </div>
        )}

        {/* =========================
            No Blogs
        ========================= */}

        {!error &&
          blogs.length === 0 && (
            <div className="text-center py-5">

              <FaBlog
                className="text-muted mb-3"
                size={50}
              />

              <h5 className="fw-bold">
                No blog posts yet
              </h5>

              <p className="text-muted">
                Beautiful stories will
                appear here soon.
              </p>

            </div>
          )}

        {/* =========================
            Blog Cards
        ========================= */}

        {blogs.length > 0 && (
          <Row className="g-4 mt-2">

            {blogs.map((blog) => (

              <Col
                xs={12}
                md={6}
                lg={4}
                key={blog.id}
              >

                <Card
                  className="blog-card h-100 border-0 shadow-sm"
                  style={{
                    overflow: "hidden",
                  }}
                >

                  {/* Image */}

                  {blog.image ? (

                    <img
                      src={blog.image}
                      alt={blog.title}
                      className="w-100"
                      style={{
                        height: "230px",
                        objectFit: "cover",
                      }}
                    />

                  ) : (

                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        height: "230px",
                        background:
                          "#f1f3f5",
                        color: "#999",
                      }}
                    >

                      <FaBlog size={50} />

                    </div>

                  )}

                  {/* Content */}

                  <Card.Body className="p-4">

                    {/* Date */}

                    <small className="text-muted d-flex align-items-center mb-2">

                      <FaCalendarAlt className="me-2" />

                      {formatDate(
                        blog.createdAt
                      )}

                    </small>

                    {/* Title */}

                    <Card.Title
                      className="fw-bold"
                      style={{
                        display:
                          "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient:
                          "vertical",
                        overflow:
                          "hidden",
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
                        overflow:
                          "hidden",
                      }}
                    >
                      {blog.description}
                    </Card.Text>

                    {/* Read More */}

                    <Link
                      to={`/blog/${blog.id}`}
                      className="text-decoration-none"
                    >

                      <Button
                        variant="outline-dark"
                        size="sm"
                      >
                        Read More
                        <FaArrowRight className="ms-2" />
                      </Button>

                    </Link>

                  </Card.Body>

                </Card>

              </Col>

            ))}

          </Row>
        )}

        {/* =========================
            View All Blogs
        ========================= */}

        {blogs.length > 0 && (
          <div className="text-center mt-5">

            <Link
              to="/blogs"
              className="btn btn-dark px-4 py-2"
            >
              View All Blogs
              <FaArrowRight className="ms-2" />
            </Link>

          </div>
        )}

      </Container>

    </section>
  );
};

export default BlogPreview;