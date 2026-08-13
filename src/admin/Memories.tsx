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
} from "react-bootstrap";
import {
  FaTrash,
  FaSave,
  FaArrowLeft,
  FaGlobe,
  FaLock,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

interface SelectedImage {
  file: File;
  preview: string;
  visibility: "public" | "private";
}

interface UploadedImage {
  url: string;
  publicId: string;
  visibility: "public" | "private";
  name: string;
}

const Memories = () => {
  const navigate = useNavigate();

  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");

  const [images, setImages] = useState<SelectedImage[]>([]);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Image select
  const handleImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files) return;

    const selectedFiles = Array.from(files);

    const newImages: SelectedImage[] = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      visibility: "public",
    }));

    setImages((prev) => [...prev, ...newImages]);

    // Same file আবার select করার সুবিধার জন্য
    event.target.value = "";
  };

  // Remove selected image
  const removeImage = (index: number) => {
    setImages((prev) => {
      const image = prev[index];

      URL.revokeObjectURL(image.preview);

      return prev.filter((_, i) => i !== index);
    });
  };

  // Change Public / Private
  const changeVisibility = (
    index: number,
    visibility: "public" | "private"
  ) => {
    setImages((prev) =>
      prev.map((image, i) =>
        i === index
          ? { ...image, visibility }
          : image
      )
    );
  };

  // Upload image to Cloudinary
  const uploadToCloudinary = async (
    image: SelectedImage
  ): Promise<UploadedImage> => {
    const cloudName =
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary configuration পাওয়া যায়নি। .env file check করুন।"
      );
    }

    const formData = new FormData();

    formData.append("file", image.file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Cloudinary upload failed.");
    }

    const data = await response.json();

    return {
      url: data.secure_url,
      publicId: data.public_id,
      visibility: image.visibility,
      name: image.file.name,
    };
  };

  // Save Memory
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

    if (images.length === 0) {
      setError("কমপক্ষে একটি ছবি নির্বাচন করুন।");
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      const uploadedImages: UploadedImage[] = [];

      for (let i = 0; i < images.length; i++) {
        const uploaded = await uploadToCloudinary(images[i]);

        uploadedImages.push(uploaded);

        const currentProgress = Math.round(
          ((i + 1) / images.length) * 100
        );

        setProgress(currentProgress);
      }

      await addDoc(collection(db, "memories"), {
        date,
        type,
        description: description.trim(),
        comment: comment.trim(),
        images: uploadedImages,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess("Memory সফলভাবে যোগ হয়েছে।");

      // Form reset
      setDate("");
      setType("");
      setDescription("");
      setComment("");
      setImages([]);
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
            onClick={() => navigate("/admin/dashboard")}
          >
            <FaArrowLeft className="me-2" />
            Dashboard
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

                {/* Date */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Date <span className="text-danger">*</span>
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
                      <span className="text-danger">*</span>
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
                      placeholder="Write something about this memory..."
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value)
                      }
                    />
                  </Form.Group>
                </Col>

                {/* Images */}
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Photos{" "}
                      <span className="text-danger">*</span>
                    </Form.Label>

                    <Form.Control
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                    />

                    <Form.Text className="text-muted">
                      একসাথে একাধিক ছবি নির্বাচন করতে পারবেন।
                    </Form.Text>
                  </Form.Group>
                </Col>

                {/* Image Preview */}
                {images.length > 0 && (
                  <Col xs={12}>
                    <div className="mt-2">
                      <h6 className="fw-bold mb-3">
                        Selected Photos ({images.length})
                      </h6>

                      <Row className="g-3">
                        {images.map((image, index) => (
                          <Col
                            xs={12}
                            sm={6}
                            md={4}
                            lg={3}
                            key={`${image.file.name}-${index}`}
                          >
                            <Card className="h-100 border shadow-sm">
                              <div
                                style={{
                                  height: "180px",
                                  overflow: "hidden",
                                }}
                              >
                                <Image
                                  src={image.preview}
                                  className="w-100 h-100"
                                  style={{
                                    objectFit: "cover",
                                  }}
                                />
                              </div>

                              <Card.Body className="p-3">
                                <div
                                  className="small text-truncate mb-2"
                                  title={image.file.name}
                                >
                                  {image.file.name}
                                </div>

                                {/* Visibility */}
                                <div className="d-flex gap-2 mb-3">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                      image.visibility ===
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
                                      image.visibility ===
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
                                    removeImage(index)
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
                    </div>
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
                      placeholder="Any additional comment..."
                      value={comment}
                      onChange={(e) =>
                        setComment(e.target.value)
                      }
                    />
                  </Form.Group>
                </Col>

                {/* Upload Progress */}
                {uploading && (
                  <Col xs={12}>
                    <div>
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">
                          Uploading images...
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

                {/* Submit */}
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