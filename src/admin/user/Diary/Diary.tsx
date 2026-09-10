import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Image,
  Row,
  Spinner,
} from "react-bootstrap";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCalendar,
  FiCheck,
  FiImage,
  FiSave,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import { migrateDiariesToDiaryPages } from "../migrateDiariesToDiaryPages";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../../firebase/config";

// ======================================================
// CLOUDINARY CONFIG
// ======================================================

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// ======================================================
// TYPES
// ======================================================

interface CloudinaryResponse {
  secure_url: string;
}

type DiaryStatus = "published" | "draft";

interface DiaryData {
  title: string;
  date: string;
  content: string;
  coverImage: string;
  images: string[];
  status: DiaryStatus;
}

// ======================================================
// COMPONENT
// ======================================================

const Diary = () => {
  const navigate = useNavigate();

  // ====================================================
  // QUERY PARAM
  // /user/diary/add
  // /user/diary/add?edit=DIARY_ID
  // ====================================================

  const [searchParams] = useSearchParams();

  const editId = searchParams.get("edit");

  const isEditMode = Boolean(editId);

  // ====================================================
  // STATES
  // ====================================================

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");

  const [coverImage, setCoverImage] = useState("");
  const [coverPreview, setCoverPreview] = useState("");

  const [images, setImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [status, setStatus] =
    useState<DiaryStatus>("published");

  const [loadingDiary, setLoadingDiary] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ====================================================
  // LOAD EXISTING DIARY FOR EDIT
  // ====================================================

  useEffect(() => {
    if (!editId) {
      setLoadingDiary(false);
      return;
    }

    const loadDiary = async () => {
      try {
        setLoadingDiary(true);
        setError("");

        const diaryRef = doc(db, "diaries", editId);

        const diarySnap = await getDoc(diaryRef);

        if (!diarySnap.exists()) {
          setError("Diary not found.");

          setLoadingDiary(false);

          return;
        }

        const data = diarySnap.data();

        // -----------------------------
        // Basic fields
        // -----------------------------

        setTitle(data.title || "");

        setDate(data.date || "");

        setContent(data.content || "");

        // -----------------------------
        // Cover image
        // -----------------------------

        setCoverImage(data.coverImage || "");

        setCoverPreview(data.coverImage || "");

        // -----------------------------
        // Gallery images
        // -----------------------------

        const diaryImages = Array.isArray(data.images)
          ? data.images
          : [];

        setImages(diaryImages);

        setImagePreviews(diaryImages);

        // -----------------------------
        // Status
        // -----------------------------

        setStatus(
          data.status === "draft"
            ? "draft"
            : "published"
        );
      } catch (err) {
        console.error("Diary loading error:", err);

        setError(
          "Failed to load diary. Please try again."
        );
      } finally {
        setLoadingDiary(false);
      }
    };

    loadDiary();
  }, [editId]);

  // ====================================================
  // CLOUDINARY UPLOAD
  // ====================================================

  const uploadToCloudinary = async (
    file: File
  ): Promise<string> => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error(
        "Cloudinary configuration is missing. Please check your .env file."
      );
    }

    const formData = new FormData();

    formData.append("file", file);

    formData.append(
      "upload_preset",
      UPLOAD_PRESET
    );

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Image upload failed.");
    }

    const data =
      (await response.json()) as CloudinaryResponse;

    return data.secure_url;
  };

  // ====================================================
  // COVER IMAGE CHANGE
  // ====================================================

  const handleCoverChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Cover image must be smaller than 5MB."
      );

      event.target.value = "";

      return;
    }

    try {
      setSaving(true);

      // Local preview first
      const previewUrl =
        URL.createObjectURL(file);

      setCoverPreview(previewUrl);

      // Upload
      const uploadedUrl =
        await uploadToCloudinary(file);

      setCoverImage(uploadedUrl);

      setCoverPreview(uploadedUrl);
    } catch (err) {
      console.error(
        "Cover image upload error:",
        err
      );

      setError(
        "Failed to upload cover image."
      );

      // Restore old cover in edit mode
      if (isEditMode) {
        setCoverPreview(coverImage);
      } else {
        setCoverPreview("");
      }
    } finally {
      setSaving(false);

      event.target.value = "";
    }
  };

  // ====================================================
  // GALLERY IMAGE CHANGE
  // ====================================================

  const handleImagesChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    setError("");

    try {
      setSaving(true);

      const selectedFiles = Array.from(files);

      // Check size
      const invalidFile =
        selectedFiles.find(
          (file) =>
            file.size > 5 * 1024 * 1024
        );

      if (invalidFile) {
        setError(
          "Each image must be smaller than 5MB."
        );

        event.target.value = "";

        setSaving(false);

        return;
      }

      // Local previews
      const localPreviews =
        selectedFiles.map((file) =>
          URL.createObjectURL(file)
        );

      setImagePreviews((prev) => [
        ...prev,
        ...localPreviews,
      ]);

      // Upload images
      const uploadedImages: string[] = [];

      for (const file of selectedFiles) {
        const uploadedUrl =
          await uploadToCloudinary(file);

        uploadedImages.push(uploadedUrl);
      }

      setImages((prev) => [
        ...prev,
        ...uploadedImages,
      ]);

      // Replace temporary previews
      setImagePreviews((prev) => {
        const existingCount =
          prev.length - localPreviews.length;

        return [
          ...prev.slice(0, existingCount),
          ...uploadedImages,
        ];
      });
    } catch (err) {
      console.error(
        "Gallery upload error:",
        err
      );

      setError(
        "Failed to upload one or more images."
      );

      // Reload previews from saved images
      setImagePreviews(images);
    } finally {
      setSaving(false);

      event.target.value = "";
    }
  };

  // ====================================================
  // REMOVE COVER
  // ====================================================

  const removeCover = () => {
    setCoverImage("");

    setCoverPreview("");
  };

  // ====================================================
  // REMOVE GALLERY IMAGE
  // ====================================================

  const removeImage = (index: number) => {
    setImages((prev) =>
      prev.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )
    );

    setImagePreviews((prev) =>
      prev.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )
    );
  };

  // ====================================================
  // SAVE / UPDATE DIARY
  // ====================================================

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError("");

    setSuccess("");

    // -----------------------------
    // Validation
    // -----------------------------

    if (!title.trim()) {
      setError("Please enter diary title.");

      return;
    }

    if (!date) {
      setError("Please select a date.");

      return;
    }

    if (!content.trim()) {
      setError("Please write something in your diary.");

      return;
    }

    try {
      setSaving(true);

      const diaryData: DiaryData = {
        title: title.trim(),

        date,

        content: content.trim(),

        coverImage: coverImage || "",

        images,

        status,
      };

      // =================================================
      // UPDATE
      // =================================================

      if (editId) {
        const diaryRef = doc(
          db,
          "diaries",
          editId
        );

        await updateDoc(diaryRef, {
          ...diaryData,

          updatedAt: serverTimestamp(),
        });

        setSuccess(
          "Diary updated successfully."
        );
      }

      // =================================================
      // CREATE
      // =================================================

      else {
        await addDoc(
          collection(db, "diaries"),
          {
            ...diaryData,

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp(),
          }
        );

        setSuccess(
          "Diary created successfully."
        );
      }

      // Small delay so success message can show
      setTimeout(() => {
        navigate("/user/diary");
      }, 700);
    } catch (err) {
      console.error(
        "Diary save error:",
        err
      );

      setError(
        isEditMode
          ? "Failed to update diary. Please try again."
          : "Failed to create diary. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ====================================================
  // LOADING EXISTING DIARY
  // ====================================================

  if (loadingDiary) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <Spinner animation="border" />

          <div className="mt-3 text-muted">
            Loading diary...
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // UI
  // ====================================================

  return (
    <div className="container-fluid py-4">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">

        <div>
          <div className="d-flex align-items-center gap-2 mb-1">

            <FiBookOpen
              size={28}
            />

            <h2 className="fw-bold mb-0">
              {isEditMode
                ? "Edit Diary"
                : "Add Diary"}
            </h2>

          </div>

          <p className="text-muted mb-0">
            {isEditMode
              ? "Update your diary memory"
              : "Write and save a new memory"}
          </p>
        </div>

        <Button
          variant="outline-secondary"
          onClick={() =>
            navigate("/user/diary")
          }
        >
          <FiArrowLeft className="me-2" />

          Back to Diary
        </Button>

        <Button
  onClick={async () => {
    await migrateDiariesToDiaryPages();
  }}
>
  Migrate Diaries
</Button>

      </div>

      {/* =================================================
          ALERTS
      ================================================= */}

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
          <FiCheck className="me-2" />

          {success}
        </Alert>
      )}

      {/* =================================================
          FORM
      ================================================= */}

      <Form onSubmit={handleSubmit}>

        <Row className="g-4">

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <Col lg={8}>

            {/* =================================================
                BASIC INFORMATION
            ================================================= */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <h5 className="fw-bold mb-4">
                  Diary Information
                </h5>

                {/* TITLE */}

                <Form.Group className="mb-4">

                  <Form.Label className="fw-semibold">
                    Diary Title
                  </Form.Label>

                  <Form.Control
                    type="text"
                    placeholder="Example: A beautiful day with Sprihan"
                    value={title}
                    onChange={(e) =>
                      setTitle(
                        e.target.value
                      )
                    }
                    size="lg"
                  />

                </Form.Group>

                {/* DATE */}

                <Form.Group className="mb-4">

                  <Form.Label className="fw-semibold">
                    <FiCalendar className="me-2" />

                    Date
                  </Form.Label>

                  <Form.Control
                    type="date"
                    value={date}
                    onChange={(e) =>
                      setDate(
                        e.target.value
                      )
                    }
                  />

                </Form.Group>

                {/* CONTENT */}

                <Form.Group>

                  <Form.Label className="fw-semibold">
                    Diary Content
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={18}
                    placeholder="Write your memory here..."
                    value={content}
                    onChange={(e) =>
                      setContent(
                        e.target.value
                      )
                    }
                    style={{
                      resize: "vertical",
                      lineHeight: "1.8",
                    }}
                  />

                  <Form.Text className="text-muted">
                    Write your memory, feelings,
                    stories or anything you want
                    to remember.
                  </Form.Text>

                </Form.Group>

              </Card.Body>

            </Card>

            {/* =================================================
                GALLERY
            ================================================= */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <div className="d-flex justify-content-between align-items-center mb-4">

                  <div>

                    <h5 className="fw-bold mb-1">
                      <FiImage className="me-2" />

                      Diary Photos
                    </h5>

                    <small className="text-muted">
                      Add multiple photos to
                      your diary
                    </small>

                  </div>

                  <Badge bg="secondary">
                    {images.length} Photos
                  </Badge>

                </div>

                {/* UPLOAD */}

                <div className="mb-4">

                  <label
                    htmlFor="diary-images"
                    className="btn btn-outline-primary"
                  >
                    <FiUpload className="me-2" />

                    Add Photos
                  </label>

                  <input
                    id="diary-images"
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={
                      handleImagesChange
                    }
                  />

                </div>

                {/* GALLERY PREVIEW */}

                {imagePreviews.length > 0 && (
                  <Row className="g-3">

                    {imagePreviews.map(
                      (image, index) => (
                        <Col
                          xs={6}
                          md={4}
                          key={`${image}-${index}`}
                        >

                          <div
                            className="position-relative"
                            style={{
                              aspectRatio:
                                "1 / 1",
                            }}
                          >

                            <Image
                              src={image}
                              fluid
                              rounded
                              className="w-100 h-100"
                              style={{
                                objectFit:
                                  "cover",
                              }}
                            />

                            <Button
                              variant="danger"
                              size="sm"
                              className="position-absolute top-0 end-0 m-2 rounded-circle"
                              onClick={() =>
                                removeImage(
                                  index
                                )
                              }
                              type="button"
                            >
                              <FiTrash2 />
                            </Button>

                          </div>

                        </Col>
                      )
                    )}

                  </Row>
                )}

                {imagePreviews.length === 0 && (
                  <div
                    className="text-center text-muted py-5 border rounded"
                  >
                    <FiImage
                      size={40}
                      className="mb-3"
                    />

                    <div>
                      No photos added yet
                    </div>
                  </div>
                )}

              </Card.Body>

            </Card>

          </Col>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <Col lg={4}>

            {/* =================================================
                COVER IMAGE
            ================================================= */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <h5 className="fw-bold mb-3">
                  Cover Image
                </h5>

                <p className="text-muted small">
                  This image will appear on
                  the diary book cover.
                </p>

                {/* COVER PREVIEW */}

                {coverPreview ? (
                  <div className="position-relative mb-3">

                    <Image
                      src={coverPreview}
                      fluid
                      rounded
                      className="w-100"
                      style={{
                        maxHeight:
                          "400px",
                        objectFit:
                          "cover",
                      }}
                    />

                    <Button
                      variant="danger"
                      size="sm"
                      className="position-absolute top-0 end-0 m-2"
                      onClick={removeCover}
                      type="button"
                    >
                      <FiTrash2 className="me-1" />

                      Remove
                    </Button>

                  </div>
                ) : (
                  <div
                    className="border rounded d-flex flex-column justify-content-center align-items-center text-muted mb-3"
                    style={{
                      height: "300px",
                    }}
                  >

                    <FiImage
                      size={45}
                      className="mb-3"
                    />

                    <span>
                      No cover image
                    </span>

                  </div>
                )}

                {/* COVER UPLOAD */}

                <label
                  htmlFor="cover-image"
                  className="btn btn-outline-primary w-100"
                >
                  <FiUpload className="me-2" />

                  {coverPreview
                    ? "Change Cover"
                    : "Upload Cover"}
                </label>

                <input
                  id="cover-image"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={
                    handleCoverChange
                  }
                />

                <div className="small text-muted mt-2">
                  Maximum size: 5MB
                </div>

              </Card.Body>

            </Card>

            {/* =================================================
                STATUS
            ================================================= */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <h5 className="fw-bold mb-3">
                  Publication Status
                </h5>

                <Form.Check
                  type="radio"
                  id="status-published"
                  name="status"
                  label={
                    <span>
                      <strong>
                        Published
                      </strong>

                      <br />

                      <small className="text-muted">
                        Show this diary publicly
                      </small>
                    </span>
                  }
                  checked={
                    status === "published"
                  }
                  onChange={() =>
                    setStatus("published")
                  }
                  className="mb-3"
                />

                <Form.Check
                  type="radio"
                  id="status-draft"
                  name="status"
                  label={
                    <span>
                      <strong>
                        Draft
                      </strong>

                      <br />

                      <small className="text-muted">
                        Keep this diary hidden
                      </small>
                    </span>
                  }
                  checked={
                    status === "draft"
                  }
                  onChange={() =>
                    setStatus("draft")
                  }
                />

              </Card.Body>

            </Card>

            {/* =================================================
                SAVE
            ================================================= */}

            <Card className="border-0 shadow-sm">

              <Card.Body className="p-4">

                <div className="mb-3">

                  <strong>
                    {isEditMode
                      ? "Ready to update?"
                      : "Ready to save?"}
                  </strong>

                  <p className="small text-muted mb-0 mt-1">
                    Your diary will be saved
                    securely.
                  </p>

                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-100"
                  disabled={saving}
                >

                  {saving ? (
                    <>
                      <Spinner
                        animation="border"
                        size="sm"
                        className="me-2"
                      />

                      {isEditMode
                        ? "Updating..."
                        : "Saving..."}
                    </>
                  ) : (
                    <>
                      <FiSave className="me-2" />

                      {isEditMode
                        ? "Update Diary"
                        : "Save Diary"}
                    </>
                  )}

                </Button>

              </Card.Body>

            </Card>

          </Col>

        </Row>

      </Form>

    </div>
  );
};

export default Diary;