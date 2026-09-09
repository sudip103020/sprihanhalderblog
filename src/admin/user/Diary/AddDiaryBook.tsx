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

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../../firebase/config";

// ======================================================
// CLOUDINARY
// ======================================================

const CLOUD_NAME =
  import.meta.env
    .VITE_CLOUDINARY_CLOUD_NAME;

const UPLOAD_PRESET =
  import.meta.env
    .VITE_CLOUDINARY_UPLOAD_PRESET;

// ======================================================
// TYPES
// ======================================================

interface CloudinaryResponse {
  secure_url: string;
}

type DiaryBookStatus =
  | "published"
  | "draft";

interface DiaryBookData {
  userId: string;
  title: string;
  description: string;
  coverImage: string;
  author: string;
  startDate: string;
  endDate: string;
  status: DiaryBookStatus;
  pageCount: number;
}

// ======================================================
// COMPONENT
// ======================================================

const AddDiaryBook = () => {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const editId =
    searchParams.get("edit");

  const isEditMode =
    Boolean(editId);

  // ====================================================
  // STATES
  // ====================================================

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [author, setAuthor] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [coverImage, setCoverImage] =
    useState("");

  const [coverPreview, setCoverPreview] =
    useState("");

  const [status, setStatus] =
    useState<DiaryBookStatus>(
      "published"
    );

  const [pageCount, setPageCount] =
    useState(0);

  const [loadingBook, setLoadingBook] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ====================================================
  // LOAD BOOK FOR EDIT
  // ====================================================

  useEffect(() => {
    if (!editId) {
      setLoadingBook(false);
      return;
    }

    const loadBook = async () => {
      try {
        setLoadingBook(true);
        setError("");

        const currentUser =
          auth.currentUser;

        if (!currentUser) {
          setError(
            "Please login again."
          );
          return;
        }

        const bookRef = doc(
          db,
          "diaryBooks",
          editId
        );

        const bookSnap =
          await getDoc(bookRef);

        if (!bookSnap.exists()) {
          setError(
            "Diary book not found."
          );
          return;
        }

        const data =
          bookSnap.data();

        // OWNER CHECK

        if (
          data.userId !==
          currentUser.uid
        ) {
          setError(
            "You do not have permission to edit this diary book."
          );
          return;
        }

        setTitle(
          data.title || ""
        );

        setDescription(
          data.description || ""
        );

        setAuthor(
          data.author || ""
        );

        setStartDate(
          data.startDate || ""
        );

        setEndDate(
          data.endDate || ""
        );

        setCoverImage(
          data.coverImage || ""
        );

        setCoverPreview(
          data.coverImage || ""
        );

        setStatus(
          data.status === "draft"
            ? "draft"
            : "published"
        );

        setPageCount(
          typeof data.pageCount ===
            "number"
            ? data.pageCount
            : 0
        );

      } catch (err) {
        console.error(
          "Diary book loading error:",
          err
        );

        setError(
          "Failed to load diary book. Please try again."
        );

      } finally {
        setLoadingBook(false);
      }
    };

    loadBook();
  }, [editId]);

  // ====================================================
  // CLOUDINARY UPLOAD
  // ====================================================

  const uploadToCloudinary =
    async (
      file: File
    ): Promise<string> => {

      if (
        !CLOUD_NAME ||
        !UPLOAD_PRESET
      ) {
        throw new Error(
          "Cloudinary configuration is missing. Please check your .env file."
        );
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "upload_preset",
        UPLOAD_PRESET
      );

      const response =
        await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

      if (!response.ok) {
        throw new Error(
          "Image upload failed."
        );
      }

      const data =
        (await response.json()) as CloudinaryResponse;

      return data.secure_url;
    };

  // ====================================================
  // COVER CHANGE
  // ====================================================

  const handleCoverChange =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      setError("");
      setSuccess("");

      // 5MB LIMIT

      if (
        file.size >
        5 * 1024 * 1024
      ) {

        setError(
          "Cover image must be smaller than 5MB."
        );

        event.target.value = "";

        return;
      }

      try {

        setSaving(true);

        const localPreview =
          URL.createObjectURL(
            file
          );

        setCoverPreview(
          localPreview
        );

        const uploadedUrl =
          await uploadToCloudinary(
            file
          );

        setCoverImage(
          uploadedUrl
        );

        setCoverPreview(
          uploadedUrl
        );

      } catch (err) {

        console.error(
          "Cover image upload error:",
          err
        );

        setError(
          "Failed to upload cover image."
        );

        setCoverPreview(
          coverImage
        );

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
  // SUBMIT
  // ====================================================

  const handleSubmit =
    async (
      event: React.FormEvent
    ) => {

      event.preventDefault();

      setError("");
      setSuccess("");

      // =================================================
      // AUTH
      // =================================================

      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        setError(
          "You must be logged in to manage diary books."
        );
        return;
      }

      // =================================================
      // VALIDATION
      // =================================================

      if (!title.trim()) {
        setError(
          "Please enter a book title."
        );
        return;
      }

      if (
        startDate &&
        endDate &&
        endDate < startDate
      ) {
        setError(
          "End date cannot be earlier than start date."
        );
        return;
      }

      try {

        setSaving(true);

        // =================================================
        // BOOK DATA
        // =================================================

        const bookData: DiaryBookData =
          {
            userId:
              currentUser.uid,

            title:
              title.trim(),

            description:
              description.trim(),

            coverImage:
              coverImage || "",

            author:
              author.trim(),

            startDate,

            endDate,

            status,

            pageCount,
          };

        // =================================================
        // UPDATE
        // =================================================

        if (editId) {

          const bookRef =
            doc(
              db,
              "diaryBooks",
              editId
            );

          // Check existing book

          const existingBook =
            await getDoc(
              bookRef
            );

          if (
            !existingBook.exists()
          ) {
            setError(
              "Diary book not found."
            );
            return;
          }

          const existingData =
            existingBook.data();

          // SECURITY CHECK

          if (
            existingData.userId !==
            currentUser.uid
          ) {
            setError(
              "You do not have permission to update this diary book."
            );
            return;
          }

          await updateDoc(
            bookRef,
            {
              ...bookData,

              // Don't change owner

              userId:
                currentUser.uid,

              updatedAt:
                serverTimestamp(),
            }
          );

          setSuccess(
            "Diary book updated successfully."
          );

          setTimeout(() => {
            navigate(
              "/user/diary/book"
            );
          }, 700);

          return;
        }

        // =================================================
        // CREATE
        // =================================================

        const bookRef =
          await addDoc(
            collection(
              db,
              "diaryBooks"
            ),
            {
              ...bookData,

              userId:
                currentUser.uid,

              pageCount: 0,

              createdAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),
            }
          );

        setSuccess(
          "Diary book created successfully."
        );

        // Open newly created book

        setTimeout(() => {

          navigate(
            `/user/diary/book/${bookRef.id}`
          );

        }, 700);

      } catch (err) {

        console.error(
          "Diary book save error:",
          err
        );

        setError(
          isEditMode
            ? "Failed to update diary book. Please try again."
            : "Failed to create diary book. Please try again."
        );

      } finally {

        setSaving(false);

      }
    };

  // ====================================================
  // LOADING
  // ====================================================

  if (loadingBook) {

    return (
      <div className="container py-5">

        <div className="text-center">

          <Spinner animation="border" />

          <div className="mt-3 text-muted">
            Loading diary book...
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

      {/* HEADER */}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">

        <div>

          <div className="d-flex align-items-center gap-2 mb-1">

            <FiBookOpen size={28} />

            <h2 className="fw-bold mb-0">

              {isEditMode
                ? "Edit Diary Book"
                : "Create Diary Book"}

            </h2>

          </div>

          <p className="text-muted mb-0">

            {isEditMode
              ? "Update your memory book cover and information"
              : "Create a new memory book"}

          </p>

        </div>

        <Button
          variant="outline-secondary"
          onClick={() =>
            navigate(
              "/user/diary/book"
            )
          }
        >

          <FiArrowLeft className="me-2" />

          Back to Books

        </Button>

      </div>

      {/* ALERTS */}

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

      {success && (

        <Alert variant="success">

          <FiCheck className="me-2" />

          {success}

        </Alert>

      )}

      {/* FORM */}

      <Form
        onSubmit={
          handleSubmit
        }
      >

        <Row className="g-4">

          {/* ==================================================
              LEFT
          ================================================== */}

          <Col lg={8}>

            {/* BOOK INFORMATION */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <h5 className="fw-bold mb-4">
                  Book Information
                </h5>

                {/* TITLE */}

                <Form.Group className="mb-4">

                  <Form.Label className="fw-semibold">
                    Book Title
                  </Form.Label>

                  <Form.Control
                    type="text"
                    size="lg"
                    placeholder="Example: Sprihan's First Year"
                    value={title}
                    onChange={(e) =>
                      setTitle(
                        e.target.value
                      )
                    }
                  />

                  <Form.Text className="text-muted">
                    This title will appear on the book cover.
                  </Form.Text>

                </Form.Group>

                {/* DESCRIPTION */}

                <Form.Group className="mb-4">

                  <Form.Label className="fw-semibold">
                    Book Description
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Example: Beautiful memories from Sprihan's first year..."
                    value={
                      description
                    }
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    style={{
                      resize:
                        "vertical",
                      lineHeight:
                        "1.7",
                    }}
                  />

                  <Form.Text className="text-muted">
                    A short description about this memory book.
                  </Form.Text>

                </Form.Group>

                {/* AUTHOR */}

                <Form.Group className="mb-4">

                  <Form.Label className="fw-semibold">
                    Author
                  </Form.Label>

                  <Form.Control
                    type="text"
                    placeholder="Example: Baba"
                    value={author}
                    onChange={(e) =>
                      setAuthor(
                        e.target.value
                      )
                    }
                  />

                  <Form.Text className="text-muted">
                    Optional. This can appear on the cover.
                  </Form.Text>

                </Form.Group>

                {/* DATES */}

                <Row className="g-3">

                  <Col md={6}>

                    <Form.Group>

                      <Form.Label className="fw-semibold">

                        <FiCalendar className="me-2" />

                        Start Date

                      </Form.Label>

                      <Form.Control
                        type="date"
                        value={
                          startDate
                        }
                        onChange={(
                          e
                        ) =>
                          setStartDate(
                            e.target.value
                          )
                        }
                      />

                    </Form.Group>

                  </Col>

                  <Col md={6}>

                    <Form.Group>

                      <Form.Label className="fw-semibold">

                        <FiCalendar className="me-2" />

                        End Date

                      </Form.Label>

                      <Form.Control
                        type="date"
                        value={
                          endDate
                        }
                        onChange={(
                          e
                        ) =>
                          setEndDate(
                            e.target.value
                          )
                        }
                      />

                      <Form.Text className="text-muted">
                        Optional
                      </Form.Text>

                    </Form.Group>

                  </Col>

                </Row>

              </Card.Body>

            </Card>

            {/* BOOK PREVIEW */}

            <Card className="border-0 shadow-sm">

              <Card.Body className="p-4">

                <div className="d-flex justify-content-between align-items-center mb-4">

                  <div>

                    <h5 className="fw-bold mb-1">
                      Book Preview
                    </h5>

                    <small className="text-muted">
                      This is approximately how your cover will look.
                    </small>

                  </div>

                  <Badge bg="secondary">
                    Cover
                  </Badge>

                </div>

                <div className="d-flex justify-content-center">

                  <div
                    className="shadow"
                    style={{
                      width:
                        "min(100%, 360px)",
                      aspectRatio:
                        "3 / 4",
                      borderRadius:
                        "8px",
                      overflow:
                        "hidden",
                      position:
                        "relative",
                      background:
                        "#f5f5f5",
                    }}
                  >

                    {coverPreview ? (

                      <Image
                        src={
                          coverPreview
                        }
                        className="w-100 h-100"
                        style={{
                          objectFit:
                            "cover",
                        }}
                      />

                    ) : (

                      <div className="w-100 h-100 d-flex flex-column justify-content-center align-items-center text-muted">

                        <FiBookOpen
                          size={60}
                          className="mb-3"
                        />

                        <strong>
                          Your Cover
                        </strong>

                        <small className="mt-2">
                          Upload a cover image
                        </small>

                      </div>

                    )}

                    <div
                      className="position-absolute bottom-0 start-0 end-0 p-4 text-white"
                      style={{
                        background:
                          "linear-gradient(transparent, rgba(0,0,0,0.8))",
                        paddingTop:
                          "80px",
                      }}
                    >

                      <h3 className="fw-bold mb-1">
                        {title ||
                          "Book Title"}
                      </h3>

                      {description && (

                        <div
                          className="small"
                          style={{
                            opacity:
                              0.9,
                          }}
                        >
                          {description}
                        </div>

                      )}

                      {author && (

                        <div className="small mt-2">

                          By{" "}
                          {author}

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              </Card.Body>

            </Card>

          </Col>

          {/* ==================================================
              RIGHT
          ================================================== */}

          <Col lg={4}>

            {/* COVER IMAGE */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <h5 className="fw-bold mb-2">

                  <FiImage className="me-2" />

                  Book Cover

                </h5>

                <p className="text-muted small">
                  This image will be used as the main cover of your diary book.
                </p>

                {coverPreview ? (

                  <div className="position-relative mb-3">

                    <Image
                      src={
                        coverPreview
                      }
                      fluid
                      rounded
                      className="w-100"
                      style={{
                        maxHeight:
                          "420px",
                        objectFit:
                          "cover",
                      }}
                    />

                    <Button
                      variant="danger"
                      size="sm"
                      className="position-absolute top-0 end-0 m-2"
                      type="button"
                      onClick={
                        removeCover
                      }
                    >

                      <FiTrash2 className="me-1" />

                      Remove

                    </Button>

                  </div>

                ) : (

                  <div
                    className="border rounded d-flex flex-column justify-content-center align-items-center text-muted mb-3"
                    style={{
                      height:
                        "320px",
                    }}
                  >

                    <FiImage
                      size={50}
                      className="mb-3"
                    />

                    <span>
                      No cover image
                    </span>

                  </div>

                )}

                <label
                  htmlFor="book-cover"
                  className="btn btn-outline-primary w-100"
                >

                  <FiUpload className="me-2" />

                  {coverPreview
                    ? "Change Cover"
                    : "Upload Cover"}

                </label>

                <input
                  id="book-cover"
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

            {/* STATUS */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <h5 className="fw-bold mb-3">
                  Publication Status
                </h5>

                <Form.Check
                  type="radio"
                  id="book-published"
                  name="book-status"
                  className="mb-3"
                  checked={
                    status ===
                    "published"
                  }
                  onChange={() =>
                    setStatus(
                      "published"
                    )
                  }
                  label={
                    <span>

                      <strong>
                        Published
                      </strong>

                      <br />

                      <small className="text-muted">
                        Show this book publicly
                      </small>

                    </span>
                  }
                />

                <Form.Check
                  type="radio"
                  id="book-draft"
                  name="book-status"
                  checked={
                    status ===
                    "draft"
                  }
                  onChange={() =>
                    setStatus(
                      "draft"
                    )
                  }
                  label={
                    <span>

                      <strong>
                        Draft
                      </strong>

                      <br />

                      <small className="text-muted">
                        Keep this book private
                      </small>

                    </span>
                  }
                />

              </Card.Body>

            </Card>

            {/* BOOK STRUCTURE */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <h5 className="fw-bold mb-3">
                  Book Structure
                </h5>

                <div className="d-flex align-items-center gap-3 mb-3">

                  <div
                    className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex justify-content-center align-items-center"
                    style={{
                      width: 42,
                      height: 42,
                    }}
                  >
                    <FiBookOpen />
                  </div>

                  <div>

                    <strong>
                      Cover
                    </strong>

                    <div className="small text-muted">
                      1 Cover Page
                    </div>

                  </div>

                </div>

                <div className="d-flex align-items-center gap-3">

                  <div
                    className="rounded-circle bg-secondary bg-opacity-10 text-secondary d-flex justify-content-center align-items-center"
                    style={{
                      width: 42,
                      height: 42,
                    }}
                  >
                    {pageCount}
                  </div>

                  <div>

                    <strong>
                      Diary Pages
                    </strong>

                    <div className="small text-muted">
                      Pages will be added after creating the book.
                    </div>

                  </div>

                </div>

              </Card.Body>

            </Card>

            {/* SAVE */}

            <Card className="border-0 shadow-sm">

              <Card.Body className="p-4">

                <div className="mb-3">

                  <strong>

                    {isEditMode
                      ? "Ready to update?"
                      : "Ready to create?"}

                  </strong>

                  <p className="small text-muted mb-0 mt-1">

                    {isEditMode
                      ? "Your book information will be updated."
                      : "After creating the book, you can start adding diary pages."}

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
                        : "Creating..."}

                    </>

                  ) : (

                    <>

                      <FiSave className="me-2" />

                      {isEditMode
                        ? "Update Book"
                        : "Create Book"}

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

export default AddDiaryBook;