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
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
 
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../../firebase/config";

// ======================================================
// CLOUDINARY CONFIG
// ======================================================

const CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

const UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// ======================================================
// TYPES
// ======================================================

interface CloudinaryResponse {
  secure_url: string;
}

interface DiaryPageData {
  bookId: string;
  pageNumber: number;
  title: string;
  date: string;
  content: string;
  images: string[];
}

interface DiaryBook {
  id: string;
  title: string;
  coverImage: string;
  pageCount: number;
}

// ======================================================
// COMPONENT
// ======================================================

const AddDiaryPage = () => {
  const navigate = useNavigate();

  const { bookId } = useParams<{
    bookId: string;
  }>();

  const [searchParams] = useSearchParams();

  const editId = searchParams.get("edit");

  const isEditMode = Boolean(editId);

  // ====================================================
  // BOOK
  // ====================================================

  const [book, setBook] =
    useState<DiaryBook | null>(null);

  const [loadingBook, setLoadingBook] =
    useState(true);

  // ====================================================
  // FORM STATES
  // ====================================================

  const [title, setTitle] = useState("");

  const [date, setDate] = useState("");

  const [content, setContent] =
    useState("");

  const [images, setImages] =
    useState<string[]>([]);

  const [imagePreviews, setImagePreviews] =
    useState<string[]>([]);

  // ====================================================
  // PAGE NUMBER
  // ====================================================

  const [pageNumber, setPageNumber] =
    useState(1);

  // ====================================================
  // LOADING STATES
  // ====================================================

  const [loadingPage, setLoadingPage] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  // ====================================================
  // MESSAGES
  // ====================================================

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ====================================================
  // LOAD BOOK
  // ====================================================

  useEffect(() => {
    if (!bookId) {
      setError(
        "Diary book ID is missing."
      );

      setLoadingBook(false);

      return;
    }

    const loadBook = async () => {
      try {
        setLoadingBook(true);
        setError("");

        const bookRef = doc(
          db,
          "diaryBooks",
          bookId
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

        const loadedBook: DiaryBook =
          {
            id: bookSnap.id,

            title:
              data.title || "",

            coverImage:
              data.coverImage || "",

            pageCount:
              typeof data.pageCount ===
              "number"
                ? data.pageCount
                : 0,
          };

        setBook(loadedBook);

        // New page gets next number
        setPageNumber(
          loadedBook.pageCount + 1
        );
      } catch (err) {
        console.error(
          "Book loading error:",
          err
        );

        setError(
          "Failed to load diary book."
        );
      } finally {
        setLoadingBook(false);
      }
    };

    loadBook();
  }, [bookId]);

  // ====================================================
  // LOAD PAGE FOR EDIT
  // ====================================================

  useEffect(() => {
    if (!editId) {
      setLoadingPage(false);
      return;
    }

    const loadPage = async () => {
      try {
        setLoadingPage(true);
        setError("");

        const pageRef = doc(
          db,
          "diaryPages",
          editId
        );

        const pageSnap =
          await getDoc(pageRef);

        if (!pageSnap.exists()) {
          setError(
            "Diary page not found."
          );

          return;
        }

        const data =
          pageSnap.data();

        // Make sure page belongs
        // to current book
        if (
          data.bookId &&
          data.bookId !== bookId
        ) {
          setError(
            "This page does not belong to this book."
          );

          return;
        }

        setTitle(
          data.title || ""
        );

        setDate(
          data.date || ""
        );

        setContent(
          data.content || ""
        );

        const pageImages =
          Array.isArray(
            data.images
          )
            ? data.images
            : [];

        setImages(
          pageImages
        );

        setImagePreviews(
          pageImages
        );

        if (
          typeof data.pageNumber ===
          "number"
        ) {
          setPageNumber(
            data.pageNumber
          );
        }
      } catch (err) {
        console.error(
          "Diary page loading error:",
          err
        );

        setError(
          "Failed to load diary page."
        );
      } finally {
        setLoadingPage(false);
      }
    };

    loadPage();
  }, [editId, bookId]);

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
  // ADD IMAGES
  // ====================================================

  const handleImagesChange =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const files =
        event.target.files;

      if (
        !files ||
        files.length === 0
      ) {
        return;
      }

      setError("");
      setSuccess("");

      const selectedFiles =
        Array.from(files);

      // =================================================
      // FILE SIZE CHECK
      // =================================================

      const invalidFile =
        selectedFiles.find(
          (file) =>
            file.size >
            5 * 1024 * 1024
        );

      if (invalidFile) {
        setError(
          "Each image must be smaller than 5MB."
        );

        event.target.value = "";

        return;
      }

      try {
        setSaving(true);

        // =================================================
        // LOCAL PREVIEWS
        // =================================================

        const localPreviews =
          selectedFiles.map(
            (file) =>
              URL.createObjectURL(
                file
              )
          );

        setImagePreviews(
          (prev) => [
            ...prev,
            ...localPreviews,
          ]
        );

        // =================================================
        // UPLOAD
        // =================================================

        const uploadedImages: string[] =
          [];

        for (
          const file of selectedFiles
        ) {
          const uploadedUrl =
            await uploadToCloudinary(
              file
            );

          uploadedImages.push(
            uploadedUrl
          );
        }

        // =================================================
        // SAVE URLS TO STATE
        // =================================================

        setImages(
          (prev) => [
            ...prev,
            ...uploadedImages,
          ]
        );

        // Replace temporary previews
        setImagePreviews(
          (prev) => {
            const oldCount =
              prev.length -
              localPreviews.length;

            return [
              ...prev.slice(
                0,
                oldCount
              ),
              ...uploadedImages,
            ];
          }
        );
      } catch (err) {
        console.error(
          "Diary page image upload error:",
          err
        );

        setError(
          "Failed to upload one or more images."
        );

        setImagePreviews(
          images
        );
      } finally {
        setSaving(false);

        event.target.value = "";
      }
    };

  // ====================================================
  // REMOVE IMAGE
  // ====================================================

  const removeImage = (
    index: number
  ) => {
    setImages(
      (prev) =>
        prev.filter(
          (_, imageIndex) =>
            imageIndex !== index
        )
    );

    setImagePreviews(
      (prev) =>
        prev.filter(
          (_, imageIndex) =>
            imageIndex !== index
        )
    );
  };

  // ====================================================
  // SAVE PAGE
  // ====================================================

  const handleSubmit =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      // =================================================
      // VALIDATION
      // =================================================

      if (!bookId) {
        setError(
          "Diary book ID is missing."
        );

        return;
      }

      if (!title.trim()) {
        setError(
          "Please enter a page title."
        );

        return;
      }

      if (!date) {
        setError(
          "Please select a date."
        );

        return;
      }

      if (!content.trim()) {
        setError(
          "Please write something on this page."
        );

        return;
      }

      try {
        setSaving(true);

        // =================================================
        // EDIT PAGE
        // =================================================

        if (editId) {
          const pageRef =
            doc(
              db,
              "diaryPages",
              editId
            );

          const pageData: DiaryPageData =
            {
              bookId,

              pageNumber,

              title:
                title.trim(),

              date,

              content:
                content.trim(),

              images,
            };

          await updateDoc(
            pageRef,
            {
              ...pageData,

              updatedAt:
                serverTimestamp(),
            }
          );

          setSuccess(
            "Diary page updated successfully."
          );

          setTimeout(() => {
            navigate(
              `/user/diary/book/${bookId}`
            );
          }, 700);

          return;
        }

        // =================================================
        // CREATE PAGE
        // =================================================

        // We use transaction so pageNumber
        // and pageCount stay synchronized.
        await runTransaction(
          db,
          async (transaction) => {
            const bookRef =
              doc(
                db,
                "diaryBooks",
                bookId
              );

            const bookSnap =
              await transaction.get(
                bookRef
              );

            if (
              !bookSnap.exists()
            ) {
              throw new Error(
                "Diary book not found."
              );
            }

            const bookData =
              bookSnap.data();

            const currentPageCount =
              typeof bookData.pageCount ===
              "number"
                ? bookData.pageCount
                : 0;

            const newPageNumber =
              currentPageCount + 1;

            const pageRef =
              doc(
                collection(
                  db,
                  "diaryPages"
                )
              );

            transaction.set(
              pageRef,
              {
                bookId,

                pageNumber:
                  newPageNumber,

                title:
                  title.trim(),

                date,

                content:
                  content.trim(),

                images,

                createdAt:
                  serverTimestamp(),

                updatedAt:
                  serverTimestamp(),
              }
            );

            transaction.update(
              bookRef,
              {
                pageCount:
                  increment(1),

                updatedAt:
                  serverTimestamp(),
              }
            );
          }
        );

        setSuccess(
          "Diary page created successfully."
        );

        setTimeout(() => {
          navigate(
            `/user/diary/book/${bookId}`
          );
        }, 700);
      } catch (err) {
        console.error(
          "Diary page save error:",
          err
        );

        setError(
          isEditMode
            ? "Failed to update diary page. Please try again."
            : "Failed to create diary page. Please try again."
        );
      } finally {
        setSaving(false);
      }
    };

  // ====================================================
  // LOADING
  // ====================================================

  if (
    loadingBook ||
    loadingPage
  ) {
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
  // BOOK NOT FOUND
  // ====================================================

  if (!book) {
    return (
      <div className="container-fluid py-5">

        <Alert variant="danger">
          {error ||
            "Diary book not found."}
        </Alert>

        <Button
          variant="outline-secondary"
          onClick={() =>
            navigate(
              "/user/diary"
            )
          }
        >
          <FiArrowLeft className="me-2" />

          Back to Books
        </Button>

      </div>
    );
  }

  // ====================================================
  // UI
  // ====================================================

  return (
    <div className="container-fluid py-4">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">

        <div>

          <div className="d-flex align-items-center gap-2 mb-1">

            <FiBookOpen size={28} />

            <h2 className="fw-bold mb-0">

              {isEditMode
                ? "Edit Diary Page"
                : "Add Diary Page"}

            </h2>

          </div>

          <p className="text-muted mb-0">

            <strong>
              {book.title}
            </strong>

            {" "}•
            {" "}
            Page{" "}
            {pageNumber}

          </p>

        </div>

        <Button
          variant="outline-secondary"
          onClick={() =>
            navigate(
              `/user/diary/book/${bookId}`
            )
          }
        >

          <FiArrowLeft className="me-2" />

          Back to Book

        </Button>

      </div>

      {/* ==================================================
          ALERTS
      ================================================== */}

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

      {/* ==================================================
          FORM
      ================================================== */}

      <Form
        onSubmit={
          handleSubmit
        }
      >

        <Row className="g-4">

          {/* ==================================================
              LEFT SIDE
          ================================================== */}

          <Col lg={8}>

            {/* ==================================================
                PAGE INFORMATION
            ================================================== */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <div className="d-flex justify-content-between align-items-center mb-4">

                  <div>

                    <h5 className="fw-bold mb-1">
                      Diary Page
                    </h5>

                    <small className="text-muted">
                      Write the memory you
                      want to keep forever.
                    </small>

                  </div>

                  <Badge
                    bg="primary"
                    className="px-3 py-2"
                  >
                    Page {pageNumber}
                  </Badge>

                </div>

                {/* =================================================
                    DATE
                ================================================= */}

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

                {/* =================================================
                    TITLE
                ================================================= */}

                <Form.Group className="mb-4">

                  <Form.Label className="fw-semibold">
                    Page Title
                  </Form.Label>

                  <Form.Control
                    type="text"
                    size="lg"
                    placeholder="Example: My First Smile"
                    value={title}
                    onChange={(e) =>
                      setTitle(
                        e.target.value
                      )
                    }
                  />

                </Form.Group>

                {/* =================================================
                    CONTENT
                ================================================= */}

                <Form.Group>

                  <Form.Label className="fw-semibold">
                    Memory
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={20}
                    placeholder="Write your memory here..."
                    value={content}
                    onChange={(e) =>
                      setContent(
                        e.target.value
                      )
                    }
                    style={{
                      resize:
                        "vertical",
                      lineHeight:
                        "1.9",
                      fontSize:
                        "16px",
                    }}
                  />

                  <Form.Text className="text-muted">
                    Write your story,
                    feelings, memories,
                    conversations or
                    anything you want to
                    remember.
                  </Form.Text>

                </Form.Group>

              </Card.Body>

            </Card>

            {/* ==================================================
                PHOTOS
            ================================================== */}

            <Card className="border-0 shadow-sm">

              <Card.Body className="p-4">

                <div className="d-flex justify-content-between align-items-center mb-4">

                  <div>

                    <h5 className="fw-bold mb-1">

                      <FiImage className="me-2" />

                      Page Photos

                    </h5>

                    <small className="text-muted">
                      Add photos related to
                      this memory.
                    </small>

                  </div>

                  <Badge bg="secondary">
                    {images.length}{" "}
                    {images.length === 1
                      ? "Photo"
                      : "Photos"}
                  </Badge>

                </div>

                {/* =================================================
                    UPLOAD
                ================================================= */}

                <div className="mb-4">

                  <label
                    htmlFor="page-images"
                    className="btn btn-outline-primary"
                  >

                    <FiUpload className="me-2" />

                    Add Photos

                  </label>

                  <input
                    id="page-images"
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={
                      handleImagesChange
                    }
                  />

                  <div className="small text-muted mt-2">
                    Maximum 5MB per image.
                  </div>

                </div>

                {/* =================================================
                    PREVIEW
                ================================================= */}

                {imagePreviews.length >
                0 ? (
                  <Row className="g-3">

                    {imagePreviews.map(
                      (
                        image,
                        index
                      ) => (
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
                              alt={`Page photo ${
                                index +
                                1
                              }`}
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
                              type="button"
                              className="position-absolute top-0 end-0 m-2 rounded-circle"
                              onClick={() =>
                                removeImage(
                                  index
                                )
                              }
                            >
                              <FiTrash2 />
                            </Button>

                          </div>

                        </Col>
                      )
                    )}

                  </Row>
                ) : (
                  <div
                    className="border rounded text-center text-muted py-5"
                  >

                    <FiImage
                      size={45}
                      className="mb-3"
                    />

                    <div>
                      No photos added
                      yet
                    </div>

                  </div>
                )}

              </Card.Body>

            </Card>

          </Col>

          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <Col lg={4}>

            {/* ==================================================
                BOOK INFO
            ================================================== */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <h5 className="fw-bold mb-3">
                  Book
                </h5>

                {/* BOOK COVER */}

                {book.coverImage ? (
                  <Image
                    src={
                      book.coverImage
                    }
                    fluid
                    rounded
                    className="w-100 mb-3"
                    style={{
                      maxHeight:
                        "300px",
                      objectFit:
                        "cover",
                    }}
                  />
                ) : (
                  <div
                    className="border rounded d-flex justify-content-center align-items-center text-muted mb-3"
                    style={{
                      height:
                        "220px",
                    }}
                  >
                    <FiBookOpen
                      size={45}
                    />
                  </div>
                )}

                <h5 className="fw-bold">
                  {book.title}
                </h5>

                <div className="small text-muted">

                  <FiBookOpen className="me-2" />

                  {book.pageCount} existing{" "}
                  {book.pageCount === 1
                    ? "page"
                    : "pages"}

                </div>

              </Card.Body>

            </Card>

            {/* ==================================================
                PAGE DETAILS
            ================================================== */}

            <Card className="border-0 shadow-sm mb-4">

              <Card.Body className="p-4">

                <h5 className="fw-bold mb-3">
                  Page Details
                </h5>

                <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">

                  <span className="text-muted">
                    Page Number
                  </span>

                  <Badge bg="primary">
                    {pageNumber}
                  </Badge>

                </div>

                <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">

                  <span className="text-muted">
                    Photos
                  </span>

                  <strong>
                    {images.length}
                  </strong>

                </div>

                <div className="d-flex justify-content-between align-items-center">

                  <span className="text-muted">
                    Status
                  </span>

                  <Badge bg="success">
                    Ready
                  </Badge>

                </div>

              </Card.Body>

            </Card>

            {/* ==================================================
                SAVE
            ================================================== */}

            <Card className="border-0 shadow-sm">

              <Card.Body className="p-4">

                <strong>
                  {isEditMode
                    ? "Ready to update?"
                    : "Ready to add this page?"}
                </strong>

                <p className="small text-muted mt-1 mb-3">

                  {isEditMode
                    ? "Your diary page will be updated."
                    : "This page will be added to the book."}

                </p>

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
                        ? "Update Page"
                        : "Add Page"}
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

export default AddDiaryPage;