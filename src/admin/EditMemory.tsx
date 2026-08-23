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
  ProgressBar,
} from "react-bootstrap";
import {
  FaArrowLeft,
  FaSave,
  FaTrash,
  FaGlobe,
  FaLock,
  FaVideo,
  FaImage,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

interface MemoryMedia {
  url: string;
  publicId: string;
  visibility: "public" | "private";
  name: string;
  mediaType: "image" | "video";
}

interface NewMedia {
  file: File;
  preview: string;
  visibility: "public" | "private";
  mediaType: "image" | "video";
}

const EditMemory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");

  const [existingMedia, setExistingMedia] =
    useState<MemoryMedia[]>([]);

  const [newMedia, setNewMedia] = useState<NewMedia[]>(
    []
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState(0);

  // Load Memory
  useEffect(() => {
    const loadMemory = async () => {
      if (!id) {
        setError("Memory ID পাওয়া যায়নি।");
        setLoading(false);
        return;
      }

      try {
        const memoryRef = doc(db, "memories", id);
        const memorySnap = await getDoc(memoryRef);

        if (!memorySnap.exists()) {
          setError("Memory পাওয়া যায়নি।");
          setLoading(false);
          return;
        }

        const data = memorySnap.data();

        setDate(data.date || "");
        setType(data.type || "");
        setDescription(data.description || "");
        setComment(data.comment || "");

        // New media structure
        if (
          Array.isArray(data.media) &&
          data.media.length > 0
        ) {
          setExistingMedia(data.media);
        } else {
          // Old images structure support
          const oldImages =
            Array.isArray(data.images)
              ? data.images.map((image: any) => ({
                  ...image,
                  mediaType: "image",
                }))
              : [];

          setExistingMedia(oldImages);
        }
      } catch (error) {
        console.error("Load memory error:", error);
        setError("Memory load করতে সমস্যা হয়েছে।");
      } finally {
        setLoading(false);
      }
    };

    loadMemory();
  }, [id]);

  // Existing media visibility
  const changeExistingVisibility = (
    index: number,
    visibility: "public" | "private"
  ) => {
    setExistingMedia((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, visibility }
          : item
      )
    );
  };

  // Remove existing media
  const removeExistingMedia = (index: number) => {
    const confirmDelete = window.confirm(
      "এই media-টি Memory থেকে remove করতে চান?"
    );

    if (!confirmDelete) return;

    setExistingMedia((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  // Select new image/video
  const handleNewMedia = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files) return;

    const selected = Array.from(files);

    const items: NewMedia[] = selected
      .filter(
        (file) =>
          file.type.startsWith("image/") ||
          file.type.startsWith("video/")
      )
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        visibility: "public",
        mediaType: file.type.startsWith("video/")
          ? "video"
          : "image",
      }));

    setNewMedia((prev) => [...prev, ...items]);

    event.target.value = "";
  };

  // Remove new media
  const removeNewMedia = (index: number) => {
    setNewMedia((prev) => {
      const item = prev[index];

      if (item) {
        URL.revokeObjectURL(item.preview);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  // New media visibility
  const changeNewVisibility = (
    index: number,
    visibility: "public" | "private"
  ) => {
    setNewMedia((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, visibility }
          : item
      )
    );
  };

  // Upload to Cloudinary
  const uploadToCloudinary = async (
    item: NewMedia
  ): Promise<MemoryMedia> => {
    const cloudName =
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary configuration পাওয়া যায়নি।"
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

  // Update Memory
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!id) {
      setError("Memory ID পাওয়া যায়নি।");
      return;
    }

    setError("");
    setSuccess("");

    if (!date) {
      setError("তারিখ নির্বাচন করুন।");
      return;
    }

    if (!type) {
      setError("Memory type নির্বাচন করুন।");
      return;
    }

    if (
      existingMedia.length === 0 &&
      newMedia.length === 0
    ) {
      setError(
        "কমপক্ষে একটি ছবি অথবা ভিডিও থাকতে হবে।"
      );
      return;
    }

    try {
      setSaving(true);
      setProgress(0);

      const uploadedMedia: MemoryMedia[] = [];

      for (let i = 0; i < newMedia.length; i++) {
        const uploaded =
          await uploadToCloudinary(newMedia[i]);

        uploadedMedia.push(uploaded);

        const currentProgress = Math.round(
          ((i + 1) / newMedia.length) * 100
        );

        setProgress(currentProgress);
      }

      const finalMedia = [
        ...existingMedia,
        ...uploadedMedia,
      ];

      await updateDoc(doc(db, "memories", id), {
        date,
        type,
        description: description.trim(),
        comment: comment.trim(),

        media: finalMedia,

        // Compatibility
        images: finalMedia.filter(
          (item) => item.mediaType === "image"
        ),

        updatedAt: serverTimestamp(),
      });

      setSuccess("Memory সফলভাবে update হয়েছে।");

      newMedia.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });

      setNewMedia([]);

      setTimeout(() => {
        navigate("/admin/memories");
      }, 1000);
    } catch (error) {
      console.error("Update memory error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Memory update করতে সমস্যা হয়েছে।"
      );
    } finally {
      setSaving(false);
    }
  };

  const getTypeName = (value: string) => {
    switch (value) {
      case "prescription":
        return "Prescription";
      case "travel":
        return "Travel";
      case "general":
        return "General Memory";
      case "video":
        return "Video";
      case "program":
        return "Program / Event";
      case "other":
        return "Other";
      default:
        return value;
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <Spinner animation="border" />

          <p className="text-muted mt-3 mb-0">
            Loading memory...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light py-4">
      <Container>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              Edit Memory
            </h2>

            <p className="text-muted mb-0">
              Update memory information and media
            </p>
          </div>

          <Button
            variant="outline-dark"
            onClick={() =>
              navigate("/admin/memories")
            }
          >
            <FaArrowLeft className="me-2" />
            Back
          </Button>
        </div>

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

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <Form onSubmit={handleSubmit}>
              <Row className="g-4">
                {/* Date */}
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

                {/* Type */}
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

                {/* Description */}
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Description
                    </Form.Label>

                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value)
                      }
                      placeholder="Write something about this memory..."
                    />
                  </Form.Group>
                </Col>

                {/* Existing Media */}
                <Col xs={12}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0">
                      Existing Media
                    </h5>

                    <Badge bg="secondary">
                      {existingMedia.length} Items
                    </Badge>
                  </div>

                  {existingMedia.length === 0 ? (
                    <Alert variant="light">
                      কোনো existing media নেই।
                    </Alert>
                  ) : (
                    <Row className="g-3">
                      {existingMedia.map(
                        (item, index) => (
                          <Col
                            xs={12}
                            sm={6}
                            md={4}
                            lg={3}
                            key={`${item.publicId}-${index}`}
                          >
                            <Card className="border shadow-sm h-100">
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
                                    src={item.url}
                                    className="w-100 h-100"
                                    style={{
                                      objectFit: "cover",
                                    }}
                                    controls
                                  />
                                ) : (
                                  <Image
                                    src={item.url}
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

                                <div className="small text-truncate mb-2">
                                  {item.name}
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
                                      changeExistingVisibility(
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
                                      changeExistingVisibility(
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
                                    removeExistingMedia(
                                      index
                                    )
                                  }
                                >
                                  <FaTrash className="me-1" />
                                  Remove
                                </Button>
                              </Card.Body>
                            </Card>
                          </Col>
                        )
                      )}
                    </Row>
                  )}
                </Col>

                {/* Add New Media */}
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Add New Photos & Videos
                    </Form.Label>

                    <Form.Control
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleNewMedia}
                    />

                    <Form.Text className="text-muted">
                      নতুন ছবি এবং ভিডিও যোগ করতে
                      পারবেন।
                    </Form.Text>
                  </Form.Group>
                </Col>

                {/* New Media */}
                {newMedia.length > 0 && (
                  <Col xs={12}>
                    <h6 className="fw-bold mb-3">
                      New Media ({newMedia.length})
                    </h6>

                    <Row className="g-3">
                      {newMedia.map((item, index) => (
                        <Col
                          xs={12}
                          sm={6}
                          md={4}
                          lg={3}
                          key={`${item.file.name}-${index}`}
                        >
                          <Card className="border shadow-sm h-100">
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
                                  "video"
                                    ? "Video"
                                    : "Image"}
                                </Badge>
                              </div>

                              <div className="small text-truncate mb-2">
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
                                    changeNewVisibility(
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
                                    changeNewVisibility(
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
                                  removeNewMedia(index)
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

                {/* Comment */}
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Comment
                    </Form.Label>

                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={comment}
                      onChange={(e) =>
                        setComment(e.target.value)
                      }
                      placeholder="Any additional comment..."
                    />
                  </Form.Group>
                </Col>

                {/* Progress */}
                {saving && newMedia.length > 0 && (
                  <Col xs={12}>
                    <div className="mb-2 d-flex justify-content-between">
                      <small className="text-muted">
                        Uploading new media...
                      </small>

                      <small className="fw-bold">
                        {progress}%
                      </small>
                    </div>

                    <ProgressBar
                      now={progress}
                      label={`${progress}%`}
                    />
                  </Col>
                )}

                {/* Buttons */}
                <Col xs={12}>
                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() =>
                        navigate("/admin/memories")
                      }
                      disabled={saving}
                    >
                      Cancel
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
                          Updating...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" />
                          Update Memory
                        </>
                      )}
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

export default EditMemory;