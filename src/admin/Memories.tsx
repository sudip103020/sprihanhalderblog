import { useState } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Row,
  Col,
  Image,
  ProgressBar,
  Alert,
  Badge,
} from "react-bootstrap";

import {
  FaTrash,
  FaSave,
  FaArrowLeft,
  FaGlobe,
  FaLock,
  FaVideo,
  FaImage,
  FaHome,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";

interface SelectedMedia {
  file: File;
  preview: string;
  visibility: "public" | "private";
  mediaType: "image" | "video";
}

interface UploadedMedia {
  url: string;
  publicId: string;
  visibility: "public" | "private";
  name: string;
  mediaType: "image" | "video";
}

const Memories = () => {
  const navigate = useNavigate();

  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");

  // ⭐ Show on Home
  const [showOnHome, setShowOnHome] = useState(false);

  const [media, setMedia] = useState<SelectedMedia[]>([]);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // Select Image + Video
  // =====================================================

  const handleMediaSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files) return;

    const selectedFiles = Array.from(files);

    const newMedia: SelectedMedia[] = selectedFiles
      .filter((file) => {
        return (
          file.type.startsWith("image/") ||
          file.type.startsWith("video/")
        );
      })
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        visibility: "public",
        mediaType: file.type.startsWith("video/")
          ? "video"
          : "image",
      }));

    setMedia((prev) => [...prev, ...newMedia]);

    event.target.value = "";
  };

  // =====================================================
  // Remove Selected Media
  // =====================================================

  const removeMedia = (index: number) => {
    setMedia((prev) => {
      const item = prev[index];

      if (item) {
        URL.revokeObjectURL(item.preview);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  // =====================================================
  // Change Visibility
  // =====================================================

  const changeVisibility = (
    index: number,
    visibility: "public" | "private"
  ) => {
    setMedia((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, visibility }
          : item
      )
    );
  };

  // =====================================================
  // Upload to Cloudinary
  // =====================================================

  const uploadToCloudinary = async (
    item: SelectedMedia
  ): Promise<UploadedMedia> => {
    const cloudName =
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary configuration পাওয়া যায়নি। .env file check করুন।"
      );
    }

    const resourceType =
      item.mediaType === "video"
        ? "video"
        : "image";

    const formData = new FormData();

    formData.append("file", item.file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Cloudinary ${resourceType} upload failed.`
      );
    }

    const data = await response.json();

    return {
      url: data.secure_url,
      publicId: data.public_id,
      visibility: item.visibility,
      name: item.file.name,
      mediaType: item.mediaType,
    };
  };

  // =====================================================
  // Save Memory
  // =====================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!date) {
      setError("তারিখ নির্বাচন করুন।");
      return;
    }

    if (!type) {
      setError("Memory-এর ধরন নির্বাচন করুন।");
      return;
    }

    if (media.length === 0) {
      setError(
        "কমপক্ষে একটি ছবি অথবা ভিডিও নির্বাচন করুন।"
      );
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      const uploadedMedia: UploadedMedia[] = [];

      for (let i = 0; i < media.length; i++) {
        const uploaded =
          await uploadToCloudinary(media[i]);

        uploadedMedia.push(uploaded);

        const currentProgress = Math.round(
          ((i + 1) / media.length) * 100
        );

        setProgress(currentProgress);
      }

      // =================================================
      // Save Firestore
      // =================================================

      await addDoc(collection(db, "memories"), {
        date,
        type,
        description: description.trim(),
        comment: comment.trim(),

        // ⭐ Home Page Control
        showOnHome,

        // Media
        media: uploadedMedia,

        // Compatibility
        images: uploadedMedia.filter(
          (item) => item.mediaType === "image"
        ),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(
        showOnHome
          ? "Memory সফলভাবে যোগ হয়েছে এবং Home page-এ দেখানো হবে।"
          : "Memory সফলভাবে যোগ হয়েছে।"
      );

      // Revoke previews
      media.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });

      // Reset
      setDate("");
      setType("");
      setDescription("");
      setComment("");
      setShowOnHome(false);
      setMedia([]);
      setProgress(0);
    } catch (error) {
      console.error("Memory save error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Memory save করতে সমস্যা হয়েছে।"
      );
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-vh-100 bg-light py-4">
      <Container>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">

          <div>
            <h2 className="fw-bold mb-1">
              Add Memory
            </h2>

            <p className="text-muted mb-0">
              Add Sprihan's beautiful memories
            </p>
          </div>

          <Button
            variant="outline-dark"
            onClick={() =>
              navigate("/admin/dashboard")
            }
          >
            <FaArrowLeft className="me-2" />
            Dashboard
          </Button>

        </div>

        {/* Error */}
        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        {/* Success */}
        {success && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}

        <Card className="border-0 shadow-sm">

          <Card.Body className="p-4">

            <Form onSubmit={handleSubmit}>

              <Row className="g-4">

                {/* =========================
                    Date
                ========================== */}

                <Col md={6}>
                  <Form.Group>

                    <Form.Label className="fw-semibold">
                      Date{" "}
                      <span className="text-danger">
                        *
                      </span>
                    </Form.Label>

                    <Form.Control
                      type="date"
                      value={date}
                      onChange={(e) =>
                        setDate(e.target.value)
                      }
                      required
                    />

                  </Form.Group>
                </Col>

                {/* =========================
                    Type
                ========================== */}

                <Col md={6}>
                  <Form.Group>

                    <Form.Label className="fw-semibold">
                      Type{" "}
                      <span className="text-danger">
                        *
                      </span>
                    </Form.Label>

                    <Form.Select
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value)
                      }
                      required
                    >

                      <option value="">
                        Select Memory Type
                      </option>

                      <option value="prescription">
                        💊 Prescription
                      </option>

                      <option value="travel">
                        ✈️ Travel
                      </option>

                      <option value="general">
                        ❤️ General Memory
                      </option>

                      <option value="video">
                        🎬 Video
                      </option>

                      <option value="program">
                        🎉 Program / Event
                      </option>

                      <option value="other">
                        📌 Other
                      </option>

                    </Form.Select>

                  </Form.Group>
                </Col>

                {/* =========================
                    Description
                ========================== */}

                <Col xs={12}>
                  <Form.Group>

                    <Form.Label className="fw-semibold">
                      Description
                    </Form.Label>

                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Write something about this memory..."
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value)
                      }
                    />

                  </Form.Group>
                </Col>

                {/* =========================
                    Photos + Videos
                ========================== */}

                <Col xs={12}>
                  <Form.Group>

                    <Form.Label className="fw-semibold">
                      Photos & Videos{" "}
                      <span className="text-danger">
                        *
                      </span>
                    </Form.Label>

                    <Form.Control
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaSelect}
                    />

                    <Form.Text className="text-muted">
                      একসাথে একাধিক ছবি ও ভিডিও নির্বাচন
                      করতে পারবেন।
                    </Form.Text>

                  </Form.Group>
                </Col>

                {/* =========================
                    Preview
                ========================== */}

                {media.length > 0 && (
                  <Col xs={12}>

                    <h6 className="fw-bold mb-3">
                      Selected Media ({media.length})
                    </h6>

                    <Row className="g-3">

                      {media.map((item, index) => (

                        <Col
                          xs={12}
                          sm={6}
                          md={4}
                          lg={3}
                          key={`${item.file.name}-${index}`}
                        >

                          <Card className="h-100 border shadow-sm">

                            <div
                              style={{
                                height: "190px",
                                overflow: "hidden",
                                background: "#111",
                              }}
                            >

                              {item.mediaType ===
                              "video" ? (
                                <video
                                  src={item.preview}
                                  className="w-100 h-100"
                                  style={{
                                    objectFit: "cover",
                                  }}
                                  controls
                                />
                              ) : (
                                <Image
                                  src={item.preview}
                                  className="w-100 h-100"
                                  style={{
                                    objectFit: "cover",
                                  }}
                                />
                              )}

                            </div>

                            <Card.Body className="p-3">

                              <div className="mb-2">

                                <Badge
                                  bg={
                                    item.mediaType ===
                                    "video"
                                      ? "primary"
                                      : "secondary"
                                  }
                                >

                                  {item.mediaType ===
                                  "video" ? (
                                    <>
                                      <FaVideo className="me-1" />
                                      Video
                                    </>
                                  ) : (
                                    <>
                                      <FaImage className="me-1" />
                                      Image
                                    </>
                                  )}

                                </Badge>

                              </div>

                              <div
                                className="small text-truncate mb-2"
                                title={item.file.name}
                              >
                                {item.file.name}
                              </div>

                              <div className="d-flex gap-2 mb-3">

                                <Button
                                  type="button"
                                  size="sm"
                                  variant={
                                    item.visibility ===
                                    "public"
                                      ? "success"
                                      : "outline-success"
                                  }
                                  onClick={() =>
                                    changeVisibility(
                                      index,
                                      "public"
                                    )
                                  }
                                >
                                  <FaGlobe className="me-1" />
                                  Public
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant={
                                    item.visibility ===
                                    "private"
                                      ? "dark"
                                      : "outline-dark"
                                  }
                                  onClick={() =>
                                    changeVisibility(
                                      index,
                                      "private"
                                    )
                                  }
                                >
                                  <FaLock className="me-1" />
                                  Private
                                </Button>

                              </div>

                              <Button
                                type="button"
                                variant="outline-danger"
                                size="sm"
                                className="w-100"
                                onClick={() =>
                                  removeMedia(index)
                                }
                              >
                                <FaTrash className="me-1" />
                                Remove
                              </Button>

                            </Card.Body>

                          </Card>

                        </Col>

                      ))}

                    </Row>

                  </Col>
                )}

                {/* =========================
                    Show On Home
                ========================== */}

                <Col xs={12}>

                  <Card className="border bg-light">

                    <Card.Body>

                      <Form.Check
                        type="switch"
                        id="show-on-home"
                        checked={showOnHome}
                        onChange={(e) =>
                          setShowOnHome(
                            e.target.checked
                          )
                        }
                        label={
                          <span className="fw-semibold">
                            <FaHome className="me-2" />
                            Show this Memory on Home page
                          </span>
                        }
                      />

                      <Form.Text className="text-muted ms-4">
                        চালু করলে এই Memory Home page-এর
                        Featured Memories section-এ দেখা যাবে।
                      </Form.Text>

                    </Card.Body>

                  </Card>

                </Col>

                {/* =========================
                    Comment
                ========================== */}

                <Col xs={12}>

                  <Form.Group>

                    <Form.Label className="fw-semibold">
                      Comment
                    </Form.Label>

                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Any additional comment..."
                      value={comment}
                      onChange={(e) =>
                        setComment(e.target.value)
                      }
                    />

                  </Form.Group>

                </Col>

                {/* =========================
                    Progress
                ========================== */}

                {uploading && (
                  <Col xs={12}>

                    <div>

                      <div className="d-flex justify-content-between mb-1">

                        <small className="text-muted">
                          Uploading media...
                        </small>

                        <small className="fw-bold">
                          {progress}%
                        </small>

                      </div>

                      <ProgressBar
                        now={progress}
                        label={`${progress}%`}
                      />

                    </div>

                  </Col>
                )}

                {/* =========================
                    Submit
                ========================== */}

                <Col xs={12}>

                  <div className="d-flex justify-content-end">

                    <Button
                      type="submit"
                      variant="dark"
                      size="lg"
                      disabled={uploading}
                    >

                      <FaSave className="me-2" />

                      {uploading
                        ? "Uploading..."
                        : "Save Memory"}

                    </Button>

                  </div>

                </Col>

              </Row>

            </Form>

          </Card.Body>

        </Card>

      </Container>
    </div>
  );
};

export default Memories;