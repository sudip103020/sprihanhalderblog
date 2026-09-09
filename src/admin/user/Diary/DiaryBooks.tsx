import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Dropdown,
  Form,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";

import {
  FiBookOpen,
  FiCalendar,
  FiChevronRight,
  FiClock,
  FiEdit,
  FiEye,
  FiGrid,
  FiList,
  FiMoreVertical,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "../../../firebase/config";

// ======================================================
// TYPES
// ======================================================

type DiaryBookStatus = "published" | "draft";

interface DiaryBook {
  id: string;
  userId: string;
  title: string;
  description: string;
  coverImage: string;
  author: string;
  startDate: string;
  endDate: string;
  status: DiaryBookStatus;
  pageCount: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// ======================================================
// COMPONENT
// ======================================================

const DiaryBooks = () => {
  const navigate = useNavigate();

  // ====================================================
  // STATES
  // ====================================================

  const [books, setBooks] = useState<DiaryBook[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | DiaryBookStatus>("all");

  const [viewMode, setViewMode] =
    useState<"grid" | "list">("grid");

  const [deleteBook, setDeleteBook] =
    useState<DiaryBook | null>(null);

  const [deleting, setDeleting] = useState(false);

  // ====================================================
  // LOAD USER BOOKS
  // ====================================================

  useEffect(() => {
    setLoading(true);
    setError("");

    let unsubscribeBooks: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser) {
          setBooks([]);
          setError(
            "Please login to view your diary books."
          );
          setLoading(false);
          return;
        }

        const booksRef = collection(
          db,
          "diaryBooks"
        );

        /*
         * IMPORTANT:
         *
         * No orderBy() here.
         *
         * This avoids the composite index error:
         *
         * userId ASC + createdAt DESC
         *
         * We sort locally after receiving the data.
         */

        const booksQuery = query(
          booksRef,
          where(
            "userId",
            "==",
            currentUser.uid
          )
        );

        unsubscribeBooks = onSnapshot(
          booksQuery,
          (snapshot) => {
            const loadedBooks: DiaryBook[] =
              snapshot.docs.map((item) => {
                const data = item.data();

                return {
                  id: item.id,

                  userId:
                    data.userId ||
                    currentUser.uid,

                  title:
                    data.title || "",

                  description:
                    data.description || "",

                  coverImage:
                    data.coverImage || "",

                  author:
                    data.author || "",

                  startDate:
                    data.startDate || "",

                  endDate:
                    data.endDate || "",

                  status:
                    data.status === "draft"
                      ? "draft"
                      : "published",

                  pageCount:
                    typeof data.pageCount ===
                    "number"
                      ? data.pageCount
                      : 0,

                  createdAt:
                    data.createdAt || null,

                  updatedAt:
                    data.updatedAt || null,
                };
              });

            // Newest books first
            loadedBooks.sort((a, b) => {
              const aTime =
                a.createdAt?.toMillis?.() || 0;

              const bTime =
                b.createdAt?.toMillis?.() || 0;

              return bTime - aTime;
            });

            setBooks(loadedBooks);
            setLoading(false);
          },
          (err) => {
            console.error(
              "Diary books loading error:",
              err
            );

            setError(
              "Failed to load diary books. Please check your Firebase permissions."
            );

            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeBooks) {
        unsubscribeBooks();
      }
    };
  }, []);

  // ====================================================
  // FILTER BOOKS
  // ====================================================

  const filteredBooks = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    return books.filter((book) => {
      const matchesSearch =
        !searchText ||
        book.title
          .toLowerCase()
          .includes(searchText) ||
        book.description
          .toLowerCase()
          .includes(searchText) ||
        book.author
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        book.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    books,
    search,
    statusFilter,
  ]);

  // ====================================================
  // STATISTICS
  // ====================================================

  const totalBooks = books.length;

  const publishedBooks = books.filter(
    (book) =>
      book.status === "published"
  ).length;

  const draftBooks = books.filter(
    (book) =>
      book.status === "draft"
  ).length;

  const totalPages = books.reduce(
    (total, book) =>
      total + book.pageCount,
    0
  );

  // ====================================================
  // DELETE BOOK
  // ====================================================

  const handleDelete = async () => {
    if (!deleteBook) {
      return;
    }

    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      setError(
        "Please login again."
      );
      return;
    }

    try {
      setDeleting(true);
      setError("");

      await deleteDoc(
        doc(
          db,
          "diaryBooks",
          deleteBook.id
        )
      );

      setDeleteBook(null);
    } catch (err) {
      console.error(
        "Diary book delete error:",
        err
      );

      setError(
        "Failed to delete diary book. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ====================================================
  // FORMAT DATE
  // ====================================================

  const formatDate = (
    date: string
  ) => {
    if (!date) {
      return "";
    }

    const parsedDate =
      new Date(
        `${date}T00:00:00`
      );

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-US",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ====================================================
  // OPEN BOOK
  // ====================================================

  const openBook = (
    bookId: string
  ) => {
    navigate(
      `/user/diary/book/${bookId}`
    );
  };

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <>
        <style>
          {`
            .diary-loading {
              min-height: 70vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background:
                radial-gradient(
                  circle at top,
                  rgba(0,0,0,0.03),
                  transparent 45%
                );
            }

            .diary-loader {
              width: 54px;
              height: 54px;
              border-width: 3px;
            }
          `}
        </style>

        <div className="diary-loading">
          <div className="text-center">
            <Spinner
              animation="border"
              className="diary-loader"
            />

            <div className="mt-3 text-muted fw-semibold">
              Opening your library...
            </div>
          </div>
        </div>
      </>
    );
  }

  // ====================================================
  // UI
  // ====================================================

  return (
    <>
      <style>
        {`
          /* ==========================================
             PAGE
          ========================================== */

          .diary-library {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at 10% 0%,
                rgba(0,0,0,0.035),
                transparent 30%
              ),
              radial-gradient(
                circle at 90% 10%,
                rgba(0,0,0,0.025),
                transparent 28%
              ),
              #fafafa;
          }

          /* ==========================================
             HEADER
          ========================================== */

          .diary-library-header {
            position: relative;
            padding: 28px;
            border-radius: 24px;
            background:
              linear-gradient(
                135deg,
                #111 0%,
                #252525 55%,
                #101010 100%
              );
            color: #fff;
            overflow: hidden;
            box-shadow:
              0 18px 45px rgba(0,0,0,0.14);
          }

          .diary-library-header::before {
            content: "";
            position: absolute;
            width: 280px;
            height: 280px;
            border-radius: 50%;
            right: -100px;
            top: -130px;
            background: rgba(255,255,255,0.06);
          }

          .diary-library-header::after {
            content: "";
            position: absolute;
            width: 180px;
            height: 180px;
            border-radius: 50%;
            left: 42%;
            bottom: -130px;
            background: rgba(255,255,255,0.04);
          }

          .diary-header-content {
            position: relative;
            z-index: 2;
          }

          .diary-header-icon {
            width: 58px;
            height: 58px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.12);
            backdrop-filter: blur(10px);
          }

          /* ==========================================
             STAT CARDS
          ========================================== */

          .diary-stat-card {
            border: 0;
            border-radius: 18px;
            background: rgba(255,255,255,0.9);
            box-shadow:
              0 8px 30px rgba(0,0,0,0.06);
            transition:
              transform 0.25s ease,
              box-shadow 0.25s ease;
          }

          .diary-stat-card:hover {
            transform: translateY(-3px);
            box-shadow:
              0 14px 34px rgba(0,0,0,0.09);
          }

          .diary-stat-icon {
            width: 44px;
            height: 44px;
            border-radius: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f1f1;
          }

          /* ==========================================
             FILTER
          ========================================== */

          .diary-filter-card {
            border: 1px solid rgba(0,0,0,0.06);
            border-radius: 18px;
            background: rgba(255,255,255,0.94);
            box-shadow:
              0 8px 28px rgba(0,0,0,0.045);
          }

          .diary-search {
            border-radius: 13px;
            border: 1px solid #e2e2e2;
            min-height: 46px;
            background: #fafafa;
          }

          .diary-search:focus {
            background: #fff;
            border-color: #777;
            box-shadow:
              0 0 0 3px rgba(0,0,0,0.06);
          }

          .diary-filter-select {
            border-radius: 13px;
            min-height: 46px;
            border-color: #e2e2e2;
            background-color: #fafafa;
          }

          .view-toggle {
            border: 1px solid #e2e2e2;
            border-radius: 13px;
            padding: 4px;
            background: #fafafa;
          }

          .view-toggle button {
            border: 0;
            width: 38px;
            height: 38px;
            border-radius: 9px;
            background: transparent;
            color: #777;
          }

          .view-toggle button.active {
            background: #111;
            color: #fff;
            box-shadow:
              0 4px 12px rgba(0,0,0,0.15);
          }

          /* ==========================================
             BOOK CARD
          ========================================== */

          .premium-book-card {
            border: 0 !important;
            border-radius: 22px !important;
            overflow: hidden;
            background: #fff;
            box-shadow:
              0 10px 32px rgba(0,0,0,0.07);
            transition:
              transform 0.3s ease,
              box-shadow 0.3s ease;
          }

          .premium-book-card:hover {
            transform: translateY(-7px);
            box-shadow:
              0 20px 48px rgba(0,0,0,0.12);
          }

          /* ==========================================
             BOOK COVER
          ========================================== */

          .premium-book-cover {
            position: relative;
            height: 360px;
            overflow: hidden;
            background:
              linear-gradient(
                135deg,
                #eeeeee,
                #dcdcdc
              );
          }

          .premium-book-cover::after {
            content: "";
            position: absolute;
            inset: 0;
            background:
              linear-gradient(
                to bottom,
                rgba(0,0,0,0.04) 0%,
                transparent 38%,
                rgba(0,0,0,0.68) 100%
              );
            pointer-events: none;
          }

          .premium-book-cover img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition:
              transform 0.6s ease;
          }

          .premium-book-card:hover
          .premium-book-cover img {
            transform: scale(1.045);
          }

          /* ==========================================
             BOOK SPINE
          ========================================== */

          .book-spine {
            position: absolute;
            z-index: 3;
            left: 0;
            top: 0;
            bottom: 0;
            width: 13px;
            background:
              linear-gradient(
                to right,
                rgba(0,0,0,0.38),
                rgba(255,255,255,0.08),
                rgba(0,0,0,0.16)
              );
            box-shadow:
              3px 0 8px rgba(0,0,0,0.14);
          }

          /* ==========================================
             STATUS
          ========================================== */

          .book-status {
            position: absolute;
            z-index: 5;
            top: 15px;
            right: 15px;
            border-radius: 30px;
            padding: 7px 12px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.3px;
            backdrop-filter: blur(8px);
          }

          /* ==========================================
             COVER TEXT
          ========================================== */

          .book-cover-info {
            position: absolute;
            z-index: 5;
            left: 24px;
            right: 24px;
            bottom: 22px;
            color: #fff;
          }

          .book-cover-title {
            font-size: 23px;
            line-height: 1.2;
            font-weight: 800;
            margin-bottom: 8px;
            text-shadow:
              0 2px 12px rgba(0,0,0,0.4);
          }

          .book-cover-author {
            font-size: 13px;
            opacity: 0.88;
          }

          /* ==========================================
             BOOK BODY
          ========================================== */

          .premium-book-body {
            padding: 18px;
          }

          .book-description {
            color: #777;
            font-size: 13px;
            line-height: 1.65;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 42px;
          }

          .book-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .book-meta-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 10px;
            border-radius: 10px;
            background: #f7f7f7;
            color: #666;
            font-size: 11px;
            font-weight: 600;
          }

          /* ==========================================
             BUTTONS
          ========================================== */

          .premium-open-btn {
            border-radius: 12px !important;
            min-height: 42px;
            font-weight: 700 !important;
            letter-spacing: 0.1px;
          }

          .premium-action-btn {
            border-radius: 11px !important;
            min-height: 40px;
          }

          /* ==========================================
             LIST VIEW
          ========================================== */

          .premium-list-card {
            border: 0;
            border-radius: 18px;
            background: #fff;
            overflow: hidden;
            box-shadow:
              0 8px 28px rgba(0,0,0,0.06);
            transition:
              transform 0.25s ease,
              box-shadow 0.25s ease;
          }

          .premium-list-card:hover {
            transform: translateY(-3px);
            box-shadow:
              0 15px 36px rgba(0,0,0,0.1);
          }

          .premium-list-cover {
            width: 115px;
            height: 145px;
            object-fit: cover;
            border-radius: 13px;
          }

          /* ==========================================
             EMPTY STATE
          ========================================== */

          .premium-empty {
            border: 1px dashed #d7d7d7;
            border-radius: 24px;
            background: #fff;
          }

          .premium-empty-icon {
            width: 84px;
            height: 84px;
            border-radius: 25px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f4f4f4;
          }

          /* ==========================================
             RESPONSIVE
          ========================================== */

          @media (max-width: 767px) {
            .diary-library-header {
              padding: 22px;
              border-radius: 20px;
            }

            .premium-book-cover {
              height: 390px;
            }

            .book-cover-title {
              font-size: 21px;
            }

            .diary-stat-card {
              border-radius: 15px;
            }
          }
        `}
      </style>

      <div className="diary-library">
        <Container
          fluid
          className="py-4 py-lg-5 px-3 px-lg-4"
        >
          {/* =========================================
              PREMIUM HEADER
          ========================================= */}

          <div className="diary-library-header mb-4">
            <div className="diary-header-content">
              <Row className="align-items-center g-4">
                <Col>
                  <div className="d-flex align-items-center gap-3">
                    <div className="diary-header-icon">
                      <FiBookOpen size={29} />
                    </div>

                    <div>
                      <div
                        className="small text-uppercase fw-semibold"
                        style={{
                          letterSpacing:
                            "2px",
                          opacity: 0.65,
                        }}
                      >
                        My Collection
                      </div>

                      <h1 className="fw-bold mb-1">
                        Diary Library
                      </h1>

                      <p
                        className="mb-0"
                        style={{
                          opacity: 0.68,
                        }}
                      >
                        Your memories, stories
                        and beautiful moments.
                      </p>
                    </div>
                  </div>
                </Col>

                <Col
                  xs={12}
                  lg="auto"
                >
                  <Button
                    variant="light"
                    size="lg"
                    className="rounded-pill px-4 fw-bold"
                    onClick={() =>
                      navigate(
                        "/user/diary/book/add"
                      )
                    }
                  >
                    <FiPlus className="me-2" />
                    Create New Book
                  </Button>
                </Col>
              </Row>
            </div>
          </div>

          {/* =========================================
              STATISTICS
          ========================================= */}

          <Row className="g-3 mb-4">
            <Col xs={6} md={3}>
              <Card className="diary-stat-card h-100">
                <Card.Body className="p-3 p-lg-4">
                  <div className="d-flex align-items-center gap-3">
                    <div className="diary-stat-icon">
                      <FiBookOpen size={21} />
                    </div>

                    <div>
                      <div className="text-muted small">
                        Total Books
                      </div>

                      <div className="fs-4 fw-bold">
                        {totalBooks}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} md={3}>
              <Card className="diary-stat-card h-100">
                <Card.Body className="p-3 p-lg-4">
                  <div className="d-flex align-items-center gap-3">
                    <div className="diary-stat-icon">
                      <FiEye size={21} />
                    </div>

                    <div>
                      <div className="text-muted small">
                        Published
                      </div>

                      <div className="fs-4 fw-bold">
                        {publishedBooks}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} md={3}>
              <Card className="diary-stat-card h-100">
                <Card.Body className="p-3 p-lg-4">
                  <div className="d-flex align-items-center gap-3">
                    <div className="diary-stat-icon">
                      <FiClock size={21} />
                    </div>

                    <div>
                      <div className="text-muted small">
                        Drafts
                      </div>

                      <div className="fs-4 fw-bold">
                        {draftBooks}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} md={3}>
              <Card className="diary-stat-card h-100">
                <Card.Body className="p-3 p-lg-4">
                  <div className="d-flex align-items-center gap-3">
                    <div className="diary-stat-icon">
                      <FiFileTextIcon />
                    </div>

                    <div>
                      <div className="text-muted small">
                        Total Pages
                      </div>

                      <div className="fs-4 fw-bold">
                        {totalPages}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* =========================================
              ERROR
          ========================================= */}

          {error && (
            <Alert
              variant="danger"
              dismissible
              onClose={() =>
                setError("")
              }
              className="rounded-4 border-0 shadow-sm"
            >
              {error}
            </Alert>
          )}

          {/* =========================================
              FILTER BAR
          ========================================= */}

          <Card className="diary-filter-card mb-4">
            <Card.Body className="p-3">
              <Row className="g-3 align-items-center">
                <Col
                  xs={12}
                  lg={6}
                >
                  <div className="position-relative">
                    <FiSearch
                      className="position-absolute text-muted"
                      style={{
                        left: "15px",
                        top: "50%",
                        transform:
                          "translateY(-50%)",
                      }}
                    />

                    <Form.Control
                      type="search"
                      className="diary-search ps-5"
                      placeholder="Search your books, stories or authors..."
                      value={search}
                      onChange={(e) =>
                        setSearch(
                          e.target.value
                        )
                      }
                    />
                  </div>
                </Col>

                <Col
                  xs={12}
                  sm={6}
                  lg={3}
                >
                  <Form.Select
                    className="diary-filter-select"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as
                          | "all"
                          | DiaryBookStatus
                      )
                    }
                  >
                    <option value="all">
                      All Books
                    </option>

                    <option value="published">
                      Published
                    </option>

                    <option value="draft">
                      Draft
                    </option>
                  </Form.Select>
                </Col>

                <Col
                  xs={12}
                  sm={6}
                  lg={3}
                  className="d-flex justify-content-sm-end"
                >
                  <div className="view-toggle">
                    <button
                      type="button"
                      className={
                        viewMode === "grid"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setViewMode(
                          "grid"
                        )
                      }
                      title="Grid view"
                    >
                      <FiGrid />
                    </button>

                    <button
                      type="button"
                      className={
                        viewMode === "list"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setViewMode(
                          "list"
                        )
                      }
                      title="List view"
                    >
                      <FiList />
                    </button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* =========================================
              RESULT INFO
          ========================================= */}

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <span className="fw-bold">
                {filteredBooks.length}
              </span>{" "}
              <span className="text-muted">
                {filteredBooks.length === 1
                  ? "book"
                  : "books"}{" "}
                found
              </span>
            </div>

            {(search ||
              statusFilter !==
                "all") && (
              <Button
                variant="link"
                size="sm"
                className="text-decoration-none text-muted"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "all"
                  );
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* =========================================
              EMPTY STATE
          ========================================= */}

          {filteredBooks.length === 0 ? (
            <Card className="premium-empty border-0">
              <Card.Body className="text-center py-5 px-4">
                <div className="premium-empty-icon mb-4">
                  <FiBookOpen
                    size={38}
                    className="text-muted"
                  />
                </div>

                <h4 className="fw-bold mb-2">
                  {books.length === 0
                    ? "Your library is empty"
                    : "No books found"}
                </h4>

                <p className="text-muted mb-4 mx-auto"
                  style={{
                    maxWidth: "480px",
                  }}
                >
                  {books.length === 0
                    ? "Create your first diary book and start collecting your favorite memories, stories and moments."
                    : "Try a different search keyword or change the book status filter."}
                </p>

                {books.length === 0 && (
                  <Button
                    variant="dark"
                    size="lg"
                    className="rounded-pill px-4"
                    onClick={() =>
                      navigate(
                        "/user/diary/book/add"
                      )
                    }
                  >
                    <FiPlus className="me-2" />
                    Create Your First Book
                  </Button>
                )}
              </Card.Body>
            </Card>
          ) : viewMode === "grid" ? (
            /* =========================================
               GRID VIEW
            ========================================= */

            <Row className="g-4">
              {filteredBooks.map(
                (book) => (
                  <Col
                    key={book.id}
                    xs={12}
                    sm={6}
                    lg={4}
                    xl={3}
                  >
                    <Card className="premium-book-card h-100">
                      {/* COVER */}

                      <div className="premium-book-cover">
                        <div className="book-spine" />

                        {book.coverImage ? (
                          <img
                            src={
                              book.coverImage
                            }
                            alt={
                              book.title
                            }
                          />
                        ) : (
                          <div className="w-100 h-100 d-flex flex-column justify-content-center align-items-center text-muted">
                            <FiBookOpen
                              size={65}
                              className="mb-3"
                            />

                            <span className="small">
                              No Cover
                            </span>
                          </div>
                        )}

                        {/* STATUS */}

                        <Badge
                          bg={
                            book.status ===
                            "published"
                              ? "success"
                              : "warning"
                          }
                          text={
                            book.status ===
                            "draft"
                              ? "dark"
                              : undefined
                          }
                          className="book-status"
                        >
                          {book.status ===
                          "published"
                            ? "PUBLISHED"
                            : "DRAFT"}
                        </Badge>

                        {/* COVER INFO */}

                        <div className="book-cover-info">
                          <div className="book-cover-title">
                            {book.title ||
                              "Untitled Book"}
                          </div>

                          {book.author && (
                            <div className="book-cover-author">
                              By{" "}
                              {book.author}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* BODY */}

                      <Card.Body className="premium-book-body d-flex flex-column">
                        {book.description && (
                          <p className="book-description mb-3">
                            {
                              book.description
                            }
                          </p>
                        )}

                        <div className="book-meta mb-3">
                          <span className="book-meta-item">
                            <FiBookOpen
                              size={13}
                            />
                            {
                              book.pageCount
                            }{" "}
                            {book.pageCount ===
                            1
                              ? "Page"
                              : "Pages"}
                          </span>

                          {(book.startDate ||
                            book.endDate) && (
                            <span className="book-meta-item">
                              <FiCalendar
                                size={13}
                              />

                              {formatDate(
                                book.startDate ||
                                  book.endDate
                              )}
                            </span>
                          )}
                        </div>

                        {/* OPEN */}

                        <Button
                          variant="dark"
                          className="premium-open-btn w-100 mb-2"
                          onClick={() =>
                            openBook(
                              book.id
                            )
                          }
                        >
                          <FiEye className="me-2" />
                          Open Book
                          <FiChevronRight className="ms-1" />
                        </Button>

                        {/* ACTIONS */}

                        <div className="d-flex gap-2">
                          <Button
                            variant="light"
                            className="premium-action-btn flex-grow-1 border"
                            onClick={() =>
                              navigate(
                                `/user/diary/book/add?edit=${book.id}`
                              )
                            }
                          >
                            <FiEdit className="me-1" />
                            Edit
                          </Button>

                          <Dropdown>
                            <Dropdown.Toggle
                              variant="light"
                              className="premium-action-btn border px-3"
                              id={`book-actions-${book.id}`}
                            >
                              <FiMoreVertical />
                            </Dropdown.Toggle>

                            <Dropdown.Menu align="end">
                              <Dropdown.Item
                                onClick={() =>
                                  openBook(
                                    book.id
                                  )
                                }
                              >
                                <FiEye className="me-2" />
                                Open Book
                              </Dropdown.Item>

                              <Dropdown.Item
                                onClick={() =>
                                  navigate(
                                    `/user/diary/book/add?edit=${book.id}`
                                  )
                                }
                              >
                                <FiEdit className="me-2" />
                                Edit Book
                              </Dropdown.Item>

                              <Dropdown.Divider />

                              <Dropdown.Item
                                className="text-danger"
                                onClick={() =>
                                  setDeleteBook(
                                    book
                                  )
                                }
                              >
                                <FiTrash2 className="me-2" />
                                Delete Book
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                )
              )}
            </Row>
          ) : (
            /* =========================================
               LIST VIEW
            ========================================= */

            <div className="d-flex flex-column gap-3">
              {filteredBooks.map(
                (book) => (
                  <Card
                    key={book.id}
                    className="premium-list-card"
                  >
                    <Card.Body className="p-3 p-md-4">
                      <Row className="align-items-center g-3">
                        <Col
                          xs="auto"
                        >
                          {book.coverImage ? (
                            <img
                              src={
                                book.coverImage
                              }
                              alt={
                                book.title
                              }
                              className="premium-list-cover"
                            />
                          ) : (
                            <div
                              className="premium-list-cover d-flex align-items-center justify-content-center bg-light"
                            >
                              <FiBookOpen
                                size={35}
                                className="text-muted"
                              />
                            </div>
                          )}
                        </Col>

                        <Col>
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                            <h5 className="fw-bold mb-0">
                              {book.title ||
                                "Untitled Book"}
                            </h5>

                            <Badge
                              bg={
                                book.status ===
                                "published"
                                  ? "success"
                                  : "warning"
                              }
                              text={
                                book.status ===
                                "draft"
                                  ? "dark"
                                  : undefined
                              }
                            >
                              {
                                book.status
                              }
                            </Badge>
                          </div>

                          {book.author && (
                            <div className="small text-muted mb-2">
                              Author:{" "}
                              <strong>
                                {
                                  book.author
                                }
                              </strong>
                            </div>
                          )}

                          {book.description && (
                            <p className="text-muted small mb-3">
                              {
                                book.description
                              }
                            </p>
                          )}

                          <div className="book-meta">
                            <span className="book-meta-item">
                              <FiBookOpen
                                size={13}
                              />
                              {
                                book.pageCount
                              }{" "}
                              Pages
                            </span>

                            {(book.startDate ||
                              book.endDate) && (
                              <span className="book-meta-item">
                                <FiCalendar
                                  size={13}
                                />
                                {formatDate(
                                  book.startDate ||
                                    book.endDate
                                )}
                              </span>
                            )}
                          </div>
                        </Col>

                        <Col
                          xs={12}
                          md="auto"
                        >
                          <div className="d-flex flex-wrap justify-content-md-end gap-2">
                            <Button
                              variant="dark"
                              className="premium-action-btn"
                              onClick={() =>
                                openBook(
                                  book.id
                                )
                              }
                            >
                              <FiEye className="me-2" />
                              Open
                            </Button>

                            <Button
                              variant="light"
                              className="premium-action-btn border"
                              onClick={() =>
                                navigate(
                                  `/user/diary/book/add?edit=${book.id}`
                                )
                              }
                            >
                              <FiEdit className="me-1" />
                              Edit
                            </Button>

                            <Button
                              variant="outline-danger"
                              className="premium-action-btn"
                              onClick={() =>
                                setDeleteBook(
                                  book
                                )
                              }
                            >
                              <FiTrash2 />
                            </Button>
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )
              )}
            </div>
          )}

          {/* =========================================
              FOOTER
          ========================================= */}

          {filteredBooks.length >
            0 && (
            <div className="text-center mt-5 pt-2">
              <div className="text-muted small">
                <FiBookOpen className="me-2" />
                Showing{" "}
                <strong>
                  {
                    filteredBooks.length
                  }
                </strong>{" "}
                of{" "}
                <strong>
                  {books.length}
                </strong>{" "}
                books
              </div>
            </div>
          )}
        </Container>
      </div>

      {/* =========================================
          DELETE MODAL
      ========================================= */}

      <Modal
        show={Boolean(deleteBook)}
        onHide={() =>
          !deleting &&
          setDeleteBook(null)
        }
        centered
      >
        <Modal.Header
          closeButton={!deleting}
          className="border-0"
        >
          <Modal.Title className="fw-bold">
            Delete Diary Book
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="pt-0">
          <div className="text-center py-2">
            <div
              className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: "70px",
                height: "70px",
                background:
                  "#fff0f0",
              }}
            >
              <FiTrash2
                size={30}
                className="text-danger"
              />
            </div>

            <h5 className="fw-bold">
              Delete this book?
            </h5>

            <p className="text-muted mb-1">
              You are about to delete:
            </p>

            <div className="fw-bold fs-5">
              {deleteBook?.title}
            </div>

            <Alert
              variant="warning"
              className="mt-3 mb-0 text-start rounded-3"
            >
              <strong>Important:</strong>{" "}
              Deleting the book will remove
              the book itself. Existing diary
              pages are not automatically
              deleted by this action.
            </Alert>
          </div>
        </Modal.Body>

        <Modal.Footer className="border-0">
          <Button
            variant="light"
            className="border rounded-3"
            onClick={() =>
              setDeleteBook(null)
            }
            disabled={deleting}
          >
            Cancel
          </Button>

          <Button
            variant="danger"
            className="rounded-3 px-4"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Spinner
                  animation="border"
                  size="sm"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              <>
                <FiTrash2 className="me-2" />
                Delete Book
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

// ======================================================
// SMALL ICON COMPONENT
// ======================================================

const FiFileTextIcon = () => {
  return (
    <FiBookOpen size={21} />
  );
};

export default DiaryBooks;