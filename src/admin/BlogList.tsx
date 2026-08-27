import { useEffect, useState } from "react";

import {
  Container,
  Card,
  Row,
  Col,
  Button,
  Spinner,
  Alert,
  Image,
  Badge,
  Modal,
} from "react-bootstrap";

import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaArrowLeft,
  FaBlog,
  FaHome,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";

interface BlogPostItem {
  id: string;
  title: string;
  description: string;
  content: string;
  image?: string;
  imagePublicId?: string;
  imageName?: string;
  status?: "published" | "draft";
  showOnHome?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const BlogList = () => {
  const navigate = useNavigate();

  const [blogs, setBlogs] =
    useState<BlogPostItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [deleteLoading, setDeleteLoading] =
    useState("");

  const [homeLoading, setHomeLoading] =
    useState("");

  const [selectedBlog, setSelectedBlog] =
    useState<BlogPostItem | null>(null);

  const [showPreview, setShowPreview] =
    useState(false);

  // =========================
  // Load Blogs
  // =========================

  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError("");

      const q = query(
        collection(db, "blogPosts"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const data: BlogPostItem[] =
        snapshot.docs.map((item) => {
          const blog = item.data();

          return {
            id: item.id,
            title: blog.title || "",
            description:
              blog.description || "",
            content:
              blog.content || "",
            image:
              blog.image || "",
            imagePublicId:
              blog.imagePublicId || "",
            imageName:
              blog.imageName || "",

            status:
              blog.status === "draft"
                ? "draft"
                : "published",

            showOnHome:
              blog.showOnHome === true,

            createdAt:
              blog.createdAt,

            updatedAt:
              blog.updatedAt,
          };
        });

      setBlogs(data);
    } catch (error) {
      console.error(
        "Blog list error:",
        error
      );

      setError(
        "Blog list load করতে সমস্যা হয়েছে।"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  // =========================
  // Toggle Home
  // =========================

  const handleToggleHome = async (
    blog: BlogPostItem
  ) => {
    if (blog.status === "draft") {
      return;
    }

    try {
      setHomeLoading(blog.id);
      setError("");

      const newValue =
        !blog.showOnHome;

      await updateDoc(
        doc(
          db,
          "blogPosts",
          blog.id
        ),
        {
          showOnHome: newValue,
        }
      );

      setBlogs((prev) =>
        prev.map((item) =>
          item.id === blog.id
            ? {
                ...item,
                showOnHome: newValue,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Toggle home error:",
        error
      );

      setError(
        "Home visibility update করতে সমস্যা হয়েছে।"
      );
    } finally {
      setHomeLoading("");
    }
  };

  // =========================
  // Delete Blog
  // =========================

  const handleDelete = async (
    blog: BlogPostItem
  ) => {
    const confirmDelete =
      window.confirm(
        `"${blog.title}" blog post delete করতে চান?`
      );

    if (!confirmDelete) return;

    try {
      setDeleteLoading(blog.id);
      setError("");

      await deleteDoc(
        doc(
          db,
          "blogPosts",
          blog.id
        )
      );

      setBlogs((prev) =>
        prev.filter(
          (item) =>
            item.id !== blog.id
        )
      );
    } catch (error) {
      console.error(
        "Delete blog error:",
        error
      );

      setError(
        "Blog delete করতে সমস্যা হয়েছে।"
      );
    } finally {
      setDeleteLoading("");
    }
  };

  // =========================
  // Format Date
  // =========================

  const formatDate = (
    timestamp?: Timestamp
  ) => {
    if (!timestamp) {
      return "Date unavailable";
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
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{
          background: "#f5f6f8",
        }}
      >
        <div className="text-center">

          <Spinner animation="border" />

          <p className="text-muted mt-3">
            Loading blogs...
          </p>

        </div>
      </div>
    );
  }

  return (
    <div
      className="min-vh-100 py-4"
      style={{
        background: "#f5f6f8",
      }}
    >

      <Container>

        {/* Header */}

        <div className="d-flex justify-content-between align-items-center mb-4">

          <div>

            <h2 className="fw-bold mb-1">
              Blog Posts
            </h2>

            <p className="text-muted mb-0">
              Manage Sprihan's blog posts
            </p>

          </div>

          <div className="d-flex gap-2">

            <Button
              variant="outline-dark"
              onClick={() =>
                navigate(
                  "/admin/dashboard"
                )
              }
            >
              <FaArrowLeft className="me-2" />
              Dashboard
            </Button>

            <Button
              variant="dark"
              onClick={() =>
                navigate(
                  "/admin/blogs/add"
                )
              }
            >
              <FaPlus className="me-2" />
              Write Blog
            </Button>

          </div>

        </div>

        {/* Error */}

        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() =>
              setError("")
            }
          >
            {error}
          </Alert>
        )}

        {/* Empty */}

        {blogs.length === 0 ? (

          <Card className="border-0 shadow-sm">

            <Card.Body className="text-center py-5">

              <FaBlog
                size={55}
                className="text-muted mb-3"
              />

              <h4 className="fw-bold">
                No Blog Posts Yet
              </h4>

              <p className="text-muted">
                আপনার প্রথম blog post লিখুন।
              </p>

              <Button
                variant="dark"
                onClick={() =>
                  navigate(
                    "/admin/blogs/add"
                  )
                }
              >
                <FaPlus className="me-2" />
                Write First Blog
              </Button>

            </Card.Body>

          </Card>

        ) : (

          <Row className="g-4">

            {blogs.map((blog) => (

              <Col
                xs={12}
                md={6}
                lg={4}
                key={blog.id}
              >

                <Card
                  className="border-0 shadow-sm h-100"
                  style={{
                    overflow: "hidden",
                  }}
                >

                  {/* Image */}

                  {blog.image ? (

                    <Image
                      src={blog.image}
                      style={{
                        height: "220px",
                        width: "100%",
                        objectFit: "cover",
                      }}
                    />

                  ) : (

                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        height: "220px",
                        background: "#e9ecef",
                        color: "#999",
                      }}
                    >
                      <FaBlog size={50} />
                    </div>

                  )}

                  <Card.Body className="p-4">

                    {/* Status + Date */}

                    <div className="d-flex justify-content-between align-items-center mb-2">

                      <Badge
                        bg={
                          blog.status ===
                          "published"
                            ? "success"
                            : "secondary"
                        }
                      >
                        {blog.status}
                      </Badge>

                      <small className="text-muted">
                        {formatDate(
                          blog.createdAt
                        )}
                      </small>

                    </div>

                    {/* Home Status */}

                    <div className="mb-3">

                      {blog.showOnHome &&
                      blog.status ===
                        "published" ? (

                        <Badge bg="primary">
                          <FaHome className="me-1" />
                          Showing on Home
                        </Badge>

                      ) : (

                        <Badge
                          bg="light"
                          text="dark"
                          className="border"
                        >
                          <FaHome className="me-1" />
                          Hidden from Home
                        </Badge>

                      )}

                    </div>

                    {/* Title */}

                    <h5 className="fw-bold mb-2">
                      {blog.title}
                    </h5>

                    {/* Description */}

                    <p
                      className="text-muted mb-3"
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
                    </p>

                    {/* Home Toggle */}

                    <Button
                      variant={
                        blog.showOnHome
                          ? "outline-primary"
                          : "outline-secondary"
                      }
                      size="sm"
                      className="w-100 mb-3"
                      disabled={
                        blog.status ===
                          "draft" ||
                        homeLoading ===
                          blog.id
                      }
                      onClick={() =>
                        handleToggleHome(
                          blog
                        )
                      }
                    >

                      {homeLoading ===
                      blog.id ? (

                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />

                      ) : (

                        <FaHome className="me-2" />

                      )}

                      {blog.status ===
                      "draft"
                        ? "Draft - Hidden"
                        : blog.showOnHome
                        ? "Remove from Home"
                        : "Show on Home"}

                    </Button>

                    {/* Buttons */}

                    <div className="d-flex gap-2">

                      <Button
                        variant="outline-dark"
                        size="sm"
                        className="flex-grow-1"
                        onClick={() => {
                          setSelectedBlog(
                            blog
                          );

                          setShowPreview(
                            true
                          );
                        }}
                      >
                        <FaEye className="me-1" />
                        Preview
                      </Button>

                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/admin/blogs/edit/${blog.id}`
                          )
                        }
                      >
                        <FaEdit />
                      </Button>

                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() =>
                          handleDelete(
                            blog
                          )
                        }
                        disabled={
                          deleteLoading ===
                          blog.id
                        }
                      >
                        {deleteLoading ===
                        blog.id ? (
                          <Spinner
                            animation="border"
                            size="sm"
                          />
                        ) : (
                          <FaTrash />
                        )}
                      </Button>

                    </div>

                  </Card.Body>

                </Card>

              </Col>

            ))}

          </Row>

        )}

      </Container>

      {/* Preview Modal */}

      <Modal
        show={showPreview}
        onHide={() =>
          setShowPreview(false)
        }
        size="lg"
        centered
        scrollable
      >

        <Modal.Header closeButton>

          <Modal.Title className="fw-bold">
            Blog Preview
          </Modal.Title>

        </Modal.Header>

        <Modal.Body>

          {selectedBlog?.image && (
            <Image
              src={selectedBlog.image}
              className="w-100 rounded mb-4"
              style={{
                maxHeight: "450px",
                objectFit: "cover",
              }}
            />
          )}

          {selectedBlog && (
            <>

              <div className="mb-3">

                <Badge
                  bg={
                    selectedBlog.status ===
                    "published"
                      ? "success"
                      : "secondary"
                  }
                >
                  {selectedBlog.status}
                </Badge>

                {selectedBlog.showOnHome &&
                  selectedBlog.status ===
                    "published" && (
                    <Badge
                      bg="primary"
                      className="ms-2"
                    >
                      <FaHome className="me-1" />
                      Home
                    </Badge>
                  )}

              </div>

              <h1 className="fw-bold mb-3">
                {selectedBlog.title}
              </h1>

              <p className="lead text-muted">
                {selectedBlog.description}
              </p>

              <hr />

              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.9,
                  fontSize: "17px",
                }}
              >
                {selectedBlog.content}
              </div>

            </>
          )}

        </Modal.Body>

        <Modal.Footer>

          {selectedBlog && (
            <Button
              variant="outline-primary"
              onClick={() => {
                setShowPreview(false);

                navigate(
                  `/admin/blogs/edit/${selectedBlog.id}`
                );
              }}
            >
              <FaEdit className="me-2" />
              Edit Blog
            </Button>
          )}

          <Button
            variant="dark"
            onClick={() =>
              setShowPreview(false)
            }
          >
            Close
          </Button>

        </Modal.Footer>

      </Modal>

    </div>
  );
};

export default BlogList;