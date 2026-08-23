import { useEffect, useState } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Row,
  Col,
  Image,
  Spinner,
  Alert,
  Badge,
  Modal,
} from "react-bootstrap";

import {
  FaArrowLeft,
  FaSave,
  FaImage,
  FaEye,
  FaCloudUploadAlt,
  FaTrash,
} from "react-icons/fa";

import { useNavigate, useParams } from "react-router-dom";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";

const BlogPost = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditMode = Boolean(id);

  // =========================
  // Loading
  // =========================
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // =========================
  // Blog fields
  // =========================
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const [image, setImage] = useState("");
  const [imagePublicId, setImagePublicId] = useState("");
  const [imageName, setImageName] = useState("");

  const [status, setStatus] = useState<
    "published" | "draft"
  >("published");

  // =========================
  // Image
  // =========================
  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState("");

  // =========================
  // Messages
  // =========================
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================
  // Preview modal
  // =========================
  const [showPreview, setShowPreview] = useState(false);

  // =========================
  // Load Blog
  // =========================
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const loadBlog = async () => {
      try {
        setLoading(true);
        setError("");

        const blogRef = doc(
          db,
          "blogPosts",
          id
        );

        const blogSnap = await getDoc(blogRef);

        if (!blogSnap.exists()) {
          setError("Blog post পাওয়া যায়নি।");
          return;
        }

        const data = blogSnap.data();

        setTitle(data.title || "");
        setDescription(data.description || "");
        setContent(data.content || "");

        setImage(data.image || "");
        setImagePublicId(
          data.imagePublicId || ""
        );
        setImageName(data.imageName || "");

        setStatus(
          data.status === "draft"
            ? "draft"
            : "published"
        );
      } catch (error) {
        console.error(
          "Blog load error:",
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

  // =========================
  // Select Image
  // =========================
  const handleImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("শুধু image file নির্বাচন করুন।");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image সর্বোচ্চ 5MB হতে পারবে।"
      );
      return;
    }

    setError("");

    setImageFile(file);

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const preview = URL.createObjectURL(file);

    setImagePreview(preview);

    event.target.value = "";
  };

  // =========================
  // Remove New Image
  // =========================
  const removeSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview("");
    setImageFile(null);
  };

  // =========================
  // Upload Cloudinary
  // =========================
  const uploadToCloudinary = async (
    file: File
  ) => {
    const cloudName =
      import.meta.env
        .VITE_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      import.meta.env
        .VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary configuration পাওয়া যায়নি।"
      );
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append(
      "upload_preset",
      uploadPreset
    );

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(
        "Cloudinary image upload failed."
      );
    }

    const data = await response.json();

    return {
      url: data.secure_url as string,
      publicId: data.public_id as string,
    };
  };

  // =========================
  // Save Blog
  // =========================
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // Validation
    if (!title.trim()) {
      setError("Blog title লিখুন।");
      return;
    }

    if (!description.trim()) {
      setError(
        "Short description লিখুন।"
      );
      return;
    }

    if (!content.trim()) {
      setError("Blog content লিখুন।");
      return;
    }

    try {
      setSaving(true);

      let finalImage = image;
      let finalPublicId = imagePublicId;
      let finalImageName = imageName;

      // =========================
      // Upload New Image
      // =========================
      if (imageFile) {
        setUploading(true);

        const uploaded =
          await uploadToCloudinary(
            imageFile
          );

        finalImage = uploaded.url;
        finalPublicId =
          uploaded.publicId;
        finalImageName =
          imageFile.name;

        setUploading(false);
      }

      // =========================
      // Add New Blog
      // =========================
      if (!isEditMode) {
        await addDoc(
          collection(db, "blogPosts"),
          {
            title: title.trim(),
            description:
              description.trim(),
            content: content.trim(),

            image: finalImage,
            imagePublicId:
              finalPublicId,
            imageName:
              finalImageName,

            status,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );

        setSuccess(
          "Blog post সফলভাবে তৈরি হয়েছে।"
        );
      }

      // =========================
      // Update Existing Blog
      // =========================
      else {
        await updateDoc(
          doc(
            db,
            "blogPosts",
            id as string
          ),
          {
            title: title.trim(),
            description:
              description.trim(),
            content: content.trim(),

            image: finalImage,
            imagePublicId:
              finalPublicId,
            imageName:
              finalImageName,

            status,

            updatedAt:
              serverTimestamp(),
          }
        );

        setSuccess(
          "Blog post সফলভাবে update হয়েছে।"
        );
      }

      // Cleanup
      if (imagePreview) {
        URL.revokeObjectURL(
          imagePreview
        );
      }

      setImageFile(null);
      setImagePreview("");

      // Redirect
      setTimeout(() => {
        navigate("/admin/blogs");
      }, 1000);
    } catch (error) {
      console.error(
        "Save blog error:",
        error
      );

      setUploading(false);

      setError(
        error instanceof Error
          ? error.message
          : "Blog save করতে সমস্যা হয়েছে।"
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // Preview Image
  // =========================
  const displayImage =
    imagePreview || image;

  // =========================
  // Loading Screen
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

          <p className="text-muted mt-3 mb-0">
            Loading blog...
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
        {/* =========================
            Header
        ========================= */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              {isEditMode
                ? "Edit Blog Post"
                : "Write Blog Post"}
            </h2>

            <p className="text-muted mb-0">
              {isEditMode
                ? "Update your blog post"
                : "Create a new beautiful blog post"}
            </p>
          </div>

          <Button
            variant="outline-dark"
            onClick={() =>
              navigate("/admin/blogs")
            }
          >
            <FaArrowLeft className="me-2" />
            Back
          </Button>
        </div>

        {/* =========================
            Alerts
        ========================= */}
        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            {success}
          </Alert>
        )}

        <Row className="g-4">
          {/* =========================
              Editor
          ========================= */}
          <Col lg={8}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <Form
                  onSubmit={handleSubmit}
                >
                  {/* Title */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Blog Title
                    </Form.Label>

                    <Form.Control
                      type="text"
                      value={title}
                      onChange={(e) =>
                        setTitle(
                          e.target.value
                        )
                      }
                      placeholder="যেমন: Sprihan-এর প্রথম ভ্রমণ"
                      size="lg"
                    />
                  </Form.Group>

                  {/* Description */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Short Description
                    </Form.Label>

                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={description}
                      onChange={(e) =>
                        setDescription(
                          e.target.value
                        )
                      }
                      placeholder="Blog সম্পর্কে ছোট একটি description লিখুন..."
                    />
                  </Form.Group>

                  {/* Content */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Blog Content
                    </Form.Label>

                    <Form.Control
                      as="textarea"
                      rows={14}
                      value={content}
                      onChange={(e) =>
                        setContent(
                          e.target.value
                        )
                      }
                      placeholder="এখানে আপনার blog লিখুন..."
                      style={{
                        lineHeight: 1.8,
                      }}
                    />

                    <Form.Text className="text-muted">
                      Paragraph আলাদা করতে
                      Enter ব্যবহার করুন।
                    </Form.Text>
                  </Form.Group>

                  {/* Image */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Featured Image
                    </Form.Label>

                    <Form.Control
                      type="file"
                      accept="image/*"
                      onChange={
                        handleImageSelect
                      }
                      disabled={saving}
                    />

                    <Form.Text className="text-muted">
                      JPG, PNG অথবা WebP.
                      Maximum 5MB.
                    </Form.Text>
                  </Form.Group>

                  {/* Selected Image */}
                  {imagePreview && (
                    <Card className="mb-4 border">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <small className="fw-semibold">
                            New Image
                          </small>

                          <Button
                            variant="outline-danger"
                            size="sm"
                            type="button"
                            onClick={
                              removeSelectedImage
                            }
                          >
                            <FaTrash />
                          </Button>
                        </div>

                        <Image
                          src={imagePreview}
                          fluid
                          rounded
                          style={{
                            maxHeight: "350px",
                            width: "100%",
                            objectFit:
                              "cover",
                          }}
                        />
                      </Card.Body>
                    </Card>
                  )}

                  {/* Status */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Status
                    </Form.Label>

                    <Form.Select
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target
                            .value as
                            | "published"
                            | "draft"
                        )
                      }
                    >
                      <option value="published">
                        Published
                      </option>

                      <option value="draft">
                        Draft
                      </option>
                    </Form.Select>
                  </Form.Group>

                  {/* Buttons */}
                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() =>
                        navigate(
                          "/admin/blogs"
                        )
                      }
                      disabled={saving}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      variant="outline-dark"
                      onClick={() =>
                        setShowPreview(true)
                      }
                      disabled={saving}
                    >
                      <FaEye className="me-2" />
                      Preview
                    </Button>

                    <Button
                      type="submit"
                      variant="dark"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Spinner
                            size="sm"
                            className="me-2"
                          />

                          {uploading
                            ? "Uploading..."
                            : "Saving..."}
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" />

                          {isEditMode
                            ? "Update Blog"
                            : "Publish Blog"}
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* =========================
              Side Preview
          ========================= */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0">
                    Blog Preview
                  </h5>

                  <Badge
                    bg={
                      status ===
                      "published"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {status}
                  </Badge>
                </div>

                {displayImage ? (
                  <Image
                    src={displayImage}
                    className="w-100 rounded mb-3"
                    style={{
                      height: "220px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    className="rounded d-flex align-items-center justify-content-center mb-3"
                    style={{
                      height: "220px",
                      background:
                        "#f1f3f5",
                      color: "#999",
                    }}
                  >
                    <div className="text-center">
                      <FaImage
                        size={45}
                      />

                      <div className="mt-2">
                        No image
                      </div>
                    </div>
                  </div>
                )}

                <h4 className="fw-bold">
                  {title ||
                    "Blog Title"}
                </h4>

                <p className="text-muted">
                  {description ||
                    "Short description will appear here..."}
                </p>

                <hr />

                <div
                  style={{
                    whiteSpace:
                      "pre-wrap",
                    lineHeight: 1.8,
                  }}
                >
                  {content ||
                    "Blog content will appear here..."}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* =========================
          Preview Modal
      ========================= */}
      <Modal
        show={showPreview}
        onHide={() =>
          setShowPreview(false)
        }
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            Blog Preview
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {displayImage && (
            <Image
              src={displayImage}
              className="w-100 rounded mb-4"
              style={{
                maxHeight: "450px",
                objectFit: "cover",
              }}
            />
          )}

          <div className="mb-2">
            <Badge
              bg={
                status === "published"
                  ? "success"
                  : "secondary"
              }
            >
              {status}
            </Badge>
          </div>

          <h1 className="fw-bold mb-3">
            {title ||
              "Blog Title"}
          </h1>

          <p className="lead text-muted">
            {description ||
              "Short description..."}
          </p>

          <hr />

          <div
            style={{
              whiteSpace:
                "pre-wrap",
              lineHeight: 1.9,
              fontSize: "17px",
            }}
          >
            {content ||
              "Blog content..."}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="dark"
            onClick={() =>
              setShowPreview(false)
            }
          >
            Close Preview
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BlogPost;