import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";

import {
  FaBookOpen,
  FaEdit,
  FaEye,
  FaFilter,
  FaPlus,
  FaSearch,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaImages,
  FaPenFancy,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../../../firebase/config";

interface DiaryItem {
  id: string;
  title: string;
  date: string;
  content: string;
  coverImage?: string;
  images?: string[];
  status?: "published" | "draft";
  createdAt?: unknown;
}

const ITEMS_PER_PAGE = 6;

const DiaryList = () => {
  const navigate = useNavigate();

  const [diaries, setDiaries] = useState<DiaryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // SEARCH / FILTER
  // ==========================================

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");

  const [currentPage, setCurrentPage] = useState(1);

  // ==========================================
  // DELETE MODAL
  // ==========================================

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [selectedDiary, setSelectedDiary] =
    useState<DiaryItem | null>(null);

  const [deleting, setDeleting] = useState(false);

  // ==========================================
  // LOAD DIARIES
  // ==========================================

  useEffect(() => {
    setLoading(true);

    const diariesQuery = query(
      collection(db, "diaries"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      diariesQuery,
      (snapshot) => {
        const list: DiaryItem[] = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...(item.data() as Omit<
              DiaryItem,
              "id"
            >),
          })
        );

        setDiaries(list);
        setLoading(false);
      },
      (err) => {
        console.error(
          "Diary loading error:",
          err
        );

        setError(
          "Failed to load diary entries. Please check your Firebase permissions."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date: string) => {
    if (!date) return "No date";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
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

  // ==========================================
  // FILTER DIARIES
  // ==========================================

  const filteredDiaries = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    return diaries.filter((diary) => {
      const matchesSearch =
        !search ||
        diary.title
          .toLowerCase()
          .includes(search) ||
        diary.content
          .toLowerCase()
          .includes(search);

      const diaryStatus =
        diary.status || "published";

      const matchesStatus =
        statusFilter === "all" ||
        diaryStatus === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    diaries,
    searchTerm,
    statusFilter,
  ]);

  // ==========================================
  // PAGINATION
  // ==========================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredDiaries.length /
        ITEMS_PER_PAGE
    )
  );

  const paginatedDiaries =
    filteredDiaries.slice(
      (currentPage - 1) *
        ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

  // ==========================================
  // RESET PAGE WHEN FILTER CHANGES
  // ==========================================

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const totalDiaries = diaries.length;

  const publishedCount = diaries.filter(
    (diary) =>
      (diary.status || "published") ===
      "published"
  ).length;

  const draftCount = diaries.filter(
    (diary) =>
      diary.status === "draft"
  ).length;

  // ==========================================
  // OPEN DELETE MODAL
  // ==========================================

  const openDeleteModal = (
    diary: DiaryItem
  ) => {
    setSelectedDiary(diary);
    setShowDeleteModal(true);
  };

  // ==========================================
  // CLOSE DELETE MODAL
  // ==========================================

  const closeDeleteModal = () => {
    if (deleting) return;

    setShowDeleteModal(false);
    setSelectedDiary(null);
  };

  // ==========================================
  // DELETE DIARY
  // ==========================================

  const handleDelete = async () => {
    if (!selectedDiary) return;

    try {
      setDeleting(true);
      setError("");

      await deleteDoc(
        doc(
          db,
          "diaries",
          selectedDiary.id
        )
      );

      setShowDeleteModal(false);
      setSelectedDiary(null);
    } catch (err) {
      console.error(
        "Diary delete error:",
        err
      );

      setError(
        "Failed to delete diary. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================
  // PAGE CHANGE
  // ==========================================

  const goToPage = (page: number) => {
    if (
      page < 1 ||
      page > totalPages
    ) {
      return;
    }

    setCurrentPage(page);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================
  // PAGE NUMBERS
  // ==========================================

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      <Container
        fluid
        className="py-4"
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #faf8f5 0%, #f4efe8 100%)",
        }}
      >
        {/* ======================================
            HEADER
        ======================================= */}

        <div className="mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div
                className="d-flex align-items-center mb-2"
                style={{
                  color: "#6b4f35",
                }}
              >
                <FaBookOpen
                  size={25}
                  className="me-2"
                />

                <span
                  className="small fw-semibold"
                  style={{
                    letterSpacing:
                      "1.5px",
                  }}
                >
                  SPRIHAN'S JOURNAL
                </span>
              </div>

              <h2
                className="fw-bold mb-1"
                style={{
                  fontFamily:
                    "Georgia, serif",
                  color: "#30261f",
                }}
              >
                My Diary
              </h2>

              <p className="text-muted mb-0">
                Manage beautiful memories,
                stories and special moments.
              </p>
            </div>

            <Button
              variant="dark"
              className="px-4 py-2"
              style={{
                borderRadius: "12px",
              }}
              onClick={() =>
                navigate(
                  "/user/diary/add"
                )
              }
            >
              <FaPlus className="me-2" />
              New Diary 
            </Button>
          </div>
        </div>

        {/* ======================================
            ERROR
        ======================================= */}

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

        {/* ======================================
            STATISTICS
        ======================================= */}

        <Row className="g-3 mb-4">
          <Col xs={12} md={4}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "18px",
                background:
                  "rgba(255,255,255,0.85)",
              }}
            >
              <Card.Body className="p-3">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: "50px",
                      height: "50px",
                      background:
                        "#eee7df",
                      color: "#6b4f35",
                    }}
                  >
                    <FaBookOpen
                      size={20}
                    />
                  </div>

                  <div>
                    <div className="text-muted small">
                      Total Diaries
                    </div>

                    <div
                      className="fw-bold fs-4"
                      style={{
                        color:
                          "#30261f",
                      }}
                    >
                      {totalDiaries}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={4}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "18px",
                background:
                  "rgba(255,255,255,0.85)",
              }}
            >
              <Card.Body className="p-3">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: "50px",
                      height: "50px",
                      background:
                        "#e6f4ea",
                      color: "#287a45",
                    }}
                  >
                    <FaEye size={20} />
                  </div>

                  <div>
                    <div className="text-muted small">
                      Published
                    </div>

                    <div
                      className="fw-bold fs-4"
                      style={{
                        color:
                          "#287a45",
                      }}
                    >
                      {publishedCount}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={4}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "18px",
                background:
                  "rgba(255,255,255,0.85)",
              }}
            >
              <Card.Body className="p-3">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: "50px",
                      height: "50px",
                      background:
                        "#eeeeee",
                      color: "#666",
                    }}
                  >
                    <FaPenFancy
                      size={20}
                    />
                  </div>

                  <div>
                    <div className="text-muted small">
                      Drafts
                    </div>

                    <div
                      className="fw-bold fs-4"
                      style={{
                        color:
                          "#555",
                      }}
                    >
                      {draftCount}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ======================================
            SEARCH & FILTER
        ======================================= */}

        <Card
          className="border-0 shadow-sm mb-4"
          style={{
            borderRadius: "18px",
            background:
              "rgba(255,255,255,0.9)",
          }}
        >
          <Card.Body className="p-3">
            <Row className="g-3 align-items-center">
              <Col md={7}>
                <div className="position-relative">
                  <FaSearch
                    className="position-absolute"
                    style={{
                      left: "15px",
                      top: "50%",
                      transform:
                        "translateY(-50%)",
                      color: "#999",
                    }}
                  />

                  <Form.Control
                    type="text"
                    value={searchTerm}
                    onChange={(e) =>
                      setSearchTerm(
                        e.target.value
                      )
                    }
                    placeholder="Search diary by title or content..."
                    className="py-2 ps-5"
                    style={{
                      borderRadius:
                        "12px",
                      border:
                        "1px solid #e3ddd5",
                    }}
                  />
                </div>
              </Col>

              <Col md={5}>
                <div className="d-flex align-items-center gap-2">
                  <FaFilter
                    className="text-muted"
                  />

                  <Form.Select
                    value={
                      statusFilter
                    }
                    onChange={(e) =>
                      setStatusFilter(
                        e.target
                          .value as
                          | "all"
                          | "published"
                          | "draft"
                      )
                    }
                    style={{
                      borderRadius:
                        "12px",
                      border:
                        "1px solid #e3ddd5",
                    }}
                  >
                    <option value="all">
                      All Diaries
                    </option>

                    <option value="published">
                      Published
                    </option>

                    <option value="draft">
                      Draft
                    </option>
                  </Form.Select>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ======================================
            LOADING
        ======================================= */}

        {loading ? (
          <Card
            className="border-0 shadow-sm"
            style={{
              borderRadius: "20px",
            }}
          >
            <Card.Body className="py-5 text-center">
              <Spinner />

              <p className="text-muted mt-3 mb-0">
                Opening the diary...
              </p>
            </Card.Body>
          </Card>
        ) : filteredDiaries.length ===
          0 ? (
          /* ====================================
             EMPTY
          ===================================== */

          <Card
            className="border-0 shadow-sm text-center"
            style={{
              borderRadius: "22px",
              background:
                "linear-gradient(145deg, #fffdf9, #f5efe7)",
            }}
          >
            <Card.Body className="py-5 px-4">
              <div
                className="mx-auto mb-4 d-flex align-items-center justify-content-center"
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius:
                    "50%",
                  background:
                    "#eee6dc",
                  color: "#795548",
                }}
              >
                <FaBookOpen
                  size={38}
                />
              </div>

              <h4
                className="fw-bold"
                style={{
                  fontFamily:
                    "Georgia, serif",
                  color: "#30261f",
                }}
              >
                {searchTerm ||
                statusFilter !== "all"
                  ? "No diary found"
                  : "No diary entries yet"}
              </h4>

              <p className="text-muted mb-4">
                {searchTerm ||
                statusFilter !== "all"
                  ? "Try changing your search or filter."
                  : "Start writing Sprihan's first beautiful memory."}
              </p>

              {!searchTerm &&
                statusFilter ===
                  "all" && (
                  <Button
                    variant="dark"
                    className="px-4"
                    style={{
                      borderRadius:
                        "12px",
                    }}
                    onClick={() =>
                      navigate(
                        "/user/diary/add"
                      )
                    }
                  >
                    <FaPlus className="me-2" />
                    Write First Diary
                  </Button>
                )}
            </Card.Body>
          </Card>
        ) : (
          <>
            {/* ==================================
                RESULT INFO
            =================================== */}

            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="text-muted small">
                Showing{" "}
                <strong>
                  {Math.min(
                    (currentPage -
                      1) *
                      ITEMS_PER_PAGE +
                      1,
                    filteredDiaries.length
                  )}
                </strong>{" "}
                –{" "}
                <strong>
                  {Math.min(
                    currentPage *
                      ITEMS_PER_PAGE,
                    filteredDiaries.length
                  )}
                </strong>{" "}
                of{" "}
                <strong>
                  {
                    filteredDiaries.length
                  }
                </strong>{" "}
                diaries
              </div>

              {searchTerm && (
                <div className="small text-muted">
                  Search:{" "}
                  <strong>
                    "{searchTerm}"
                  </strong>
                </div>
              )}
            </div>

            {/* ==================================
                DESKTOP TABLE
            =================================== */}

            <Card
              className="border-0 shadow-sm d-none d-md-block overflow-hidden"
              style={{
                borderRadius: "20px",
              }}
            >
              <Card.Body className="p-0">
                <Table
                  hover
                  responsive
                  className="mb-0 align-middle"
                >
                  <thead
                    style={{
                      background:
                        "#eee7df",
                    }}
                  >
                    <tr>
                      <th
                        className="py-3 ps-4"
                        style={{
                          color:
                            "#5d4939",
                        }}
                      >
                        Cover
                      </th>

                      <th
                        style={{
                          color:
                            "#5d4939",
                        }}
                      >
                        Diary
                      </th>

                      <th
                        style={{
                          color:
                            "#5d4939",
                        }}
                      >
                        Date
                      </th>

                      <th
                        style={{
                          color:
                            "#5d4939",
                        }}
                      >
                        Status
                      </th>

                      <th
                        style={{
                          color:
                            "#5d4939",
                        }}
                      >
                        Photos
                      </th>

                      <th
                        className="text-end pe-4"
                        style={{
                          color:
                            "#5d4939",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedDiaries.map(
                      (diary) => (
                        <tr
                          key={diary.id}
                        >
                          {/* COVER */}

                          <td className="ps-4 py-3">
                            <div
                              style={{
                                width:
                                  "72px",
                                height:
                                  "82px",
                                borderRadius:
                                  "6px",
                                overflow:
                                  "hidden",
                                background:
                                  "#eee8e0",
                                boxShadow:
                                  "2px 3px 8px rgba(0,0,0,0.12)",
                                border:
                                  "3px solid #fff",
                              }}
                            >
                              {diary.coverImage ? (
                                <img
                                  src={
                                    diary.coverImage
                                  }
                                  alt={
                                    diary.title
                                  }
                                  style={{
                                    width:
                                      "100%",
                                    height:
                                      "100%",
                                    objectFit:
                                      "cover",
                                  }}
                                />
                              ) : (
                                <div
                                  className="h-100 d-flex flex-column align-items-center justify-content-center"
                                  style={{
                                    color:
                                      "#795548",
                                  }}
                                >
                                  <FaBookOpen
                                    size={
                                      25
                                    }
                                  />

                                  <small
                                    className="mt-1"
                                    style={{
                                      fontSize:
                                        "9px",
                                    }}
                                  >
                                    DIARY
                                  </small>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* TITLE */}

                          <td>
                            <div
                              style={{
                                maxWidth:
                                  "320px",
                              }}
                            >
                              <div
                                className="fw-bold mb-1"
                                style={{
                                  fontFamily:
                                    "Georgia, serif",
                                  fontSize:
                                    "17px",
                                  color:
                                    "#30261f",
                                }}
                              >
                                {
                                  diary.title
                                }
                              </div>

                              <div
                                className="text-muted small"
                                style={{
                                  lineHeight:
                                    "1.5",
                                }}
                              >
                                {diary.content.slice(
                                  0,
                                  90
                                )}
                                {diary.content
                                  .length >
                                90
                                  ? "..."
                                  : ""}
                              </div>
                            </div>
                          </td>

                          {/* DATE */}

                          <td>
                            <div className="d-flex align-items-center gap-2 text-muted">
                              <FaCalendarAlt
                                size={
                                  13
                                }
                              />

                              <span>
                                {formatDate(
                                  diary.date
                                )}
                              </span>
                            </div>
                          </td>

                          {/* STATUS */}

                          <td>
                            {(diary.status ||
                              "published") ===
                            "published" ? (
                              <Badge
                                bg="success"
                                className="px-3 py-2"
                                style={{
                                  borderRadius:
                                    "20px",
                                  fontWeight:
                                    500,
                                }}
                              >
                                Published
                              </Badge>
                            ) : (
                              <Badge
                                bg="secondary"
                                className="px-3 py-2"
                                style={{
                                  borderRadius:
                                    "20px",
                                  fontWeight:
                                    500,
                                }}
                              >
                                Draft
                              </Badge>
                            )}
                          </td>

                          {/* PHOTOS */}

                          <td>
                            <div className="d-flex align-items-center gap-1 text-muted">
                              <FaImages />

                              <span>
                                {diary
                                  .images
                                  ?.length ||
                                  0}
                              </span>
                            </div>
                          </td>

                          {/* ACTIONS */}

                          <td className="pe-4">
                            <div className="d-flex justify-content-end gap-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                title="View"
                                style={{
                                  borderRadius:
                                    "8px",
                                }}
                                onClick={() =>
                                  navigate(
                                    `/user/diary/${diary.id}`
                                  )
                                }
                              >
                                <FaEye />
                              </Button>

                          <Button
  size="sm"
  variant="outline-dark"
  title="Edit"
  style={{
    borderRadius: "8px",
  }}
  onClick={() =>
    navigate(
      `/user/diary/add?edit=${diary.id}`
    )
  }
>
  <FaEdit />
</Button>

                              <Button
                                size="sm"
                                variant="outline-danger"
                                title="Delete"
                                style={{
                                  borderRadius:
                                    "8px",
                                }}
                                onClick={() =>
                                  openDeleteModal(
                                    diary
                                  )
                                }
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

            {/* ==================================
                MOBILE BOOK CARDS
            =================================== */}

            <Row className="g-3 d-md-none">
              {paginatedDiaries.map(
                (diary) => (
                  <Col
                    xs={12}
                    key={diary.id}
                  >
                    <Card
                      className="border-0 shadow-sm overflow-hidden"
                      style={{
                        borderRadius:
                          "18px",
                        background:
                          "#fffdf9",
                      }}
                    >
                      <Row className="g-0">
                        <Col
                          xs={4}
                          style={{
                            minHeight:
                              "190px",
                          }}
                        >
                          {diary.coverImage ? (
                            <img
                              src={
                                diary.coverImage
                              }
                              alt={
                                diary.title
                              }
                              style={{
                                width:
                                  "100%",
                                height:
                                  "100%",
                                minHeight:
                                  "190px",
                                objectFit:
                                  "cover",
                              }}
                            />
                          ) : (
                            <div
                              className="h-100 d-flex flex-column align-items-center justify-content-center"
                              style={{
                                minHeight:
                                  "190px",
                                background:
                                  "#eee7df",
                                color:
                                  "#795548",
                              }}
                            >
                              <FaBookOpen
                                size={
                                  35
                                }
                              />

                              <small className="mt-2">
                                Diary
                              </small>
                            </div>
                          )}
                        </Col>

                        <Col xs={8}>
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <h5
                                className="fw-bold mb-1"
                                style={{
                                  fontFamily:
                                    "Georgia, serif",
                                  color:
                                    "#30261f",
                                }}
                              >
                                {
                                  diary.title
                                }
                              </h5>
                            </div>

                            <div className="small text-muted mb-2">
                              <FaCalendarAlt className="me-1" />

                              {formatDate(
                                diary.date
                              )}
                            </div>

                            <div className="mb-2">
                              {(diary.status ||
                                "published") ===
                              "published" ? (
                                <Badge
                                  bg="success"
                                  style={{
                                    borderRadius:
                                      "15px",
                                  }}
                                >
                                  Published
                                </Badge>
                              ) : (
                                <Badge
                                  bg="secondary"
                                  style={{
                                    borderRadius:
                                      "15px",
                                  }}
                                >
                                  Draft
                                </Badge>
                              )}
                            </div>

                            <p
                              className="text-muted small mb-2"
                              style={{
                                lineHeight:
                                  "1.5",
                              }}
                            >
                              {diary.content.slice(
                                0,
                                90
                              )}
                              {diary.content
                                .length >
                              90
                                ? "..."
                                : ""}
                            </p>

                            <div className="small text-muted mb-3">
                              <FaImages className="me-1" />

                              {diary.images
                                ?.length ||
                                0}{" "}
                              photos
                            </div>

                            <div className="d-flex gap-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() =>
                                  navigate(
                                    `/user/diary/${diary.id}`
                                  )
                                }
                              >
                                <FaEye />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline-dark"
                                onClick={() =>
                                  navigate(
                                    `/user/diary/edit/${diary.id}`
                                  )
                                }
                              >
                                <FaEdit />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() =>
                                  openDeleteModal(
                                    diary
                                  )
                                }
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </Card.Body>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                )
              )}
            </Row>

            {/* ==================================
                PAGINATION
            =================================== */}

            {totalPages > 1 && (
              <div className="d-flex justify-content-center align-items-center mt-4">
                <div
                  className="d-flex align-items-center gap-2 p-2 shadow-sm"
                  style={{
                    background:
                      "rgba(255,255,255,0.9)",
                    borderRadius:
                      "14px",
                  }}
                >
                  <Button
                    size="sm"
                    variant="light"
                    disabled={
                      currentPage ===
                      1
                    }
                    onClick={() =>
                      goToPage(
                        currentPage -
                          1
                      )
                    }
                    style={{
                      borderRadius:
                        "9px",
                    }}
                  >
                    <FaChevronLeft />
                  </Button>

                  {pageNumbers.map(
                    (page) => (
                      <Button
                        key={page}
                        size="sm"
                        variant={
                          currentPage ===
                          page
                            ? "dark"
                            : "light"
                        }
                        onClick={() =>
                          goToPage(
                            page
                          )
                        }
                        style={{
                          minWidth:
                            "36px",
                          borderRadius:
                            "9px",
                        }}
                      >
                        {page}
                      </Button>
                    )
                  )}

                  <Button
                    size="sm"
                    variant="light"
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onClick={() =>
                      goToPage(
                        currentPage +
                          1
                      )
                    }
                    style={{
                      borderRadius:
                        "9px",
                    }}
                  >
                    <FaChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Container>

      {/* ========================================
          DELETE CONFIRMATION MODAL
      ========================================= */}

      <Modal
        show={showDeleteModal}
        onHide={closeDeleteModal}
        centered
      >
        <Modal.Body
          className="text-center p-4"
          style={{
            borderRadius: "20px",
          }}
        >
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center"
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              background: "#fbe9e7",
              color: "#c62828",
            }}
          >
            <FaTrash size={27} />
          </div>

          <h4
            className="fw-bold mb-2"
            style={{
              fontFamily:
                "Georgia, serif",
              color: "#30261f",
            }}
          >
            Delete this diary?
          </h4>

          <p className="text-muted mb-3">
            Are you sure you want to delete
            this diary entry?
          </p>

          {selectedDiary && (
            <div
              className="p-3 mb-4 text-start"
              style={{
                background:
                  "#faf8f5",
                borderRadius:
                  "12px",
                border:
                  "1px solid #eee5dc",
              }}
            >
              <div
                className="fw-bold"
                style={{
                  fontFamily:
                    "Georgia, serif",
                }}
              >
                {selectedDiary.title}
              </div>

              <div className="small text-muted mt-1">
                <FaCalendarAlt className="me-1" />

                {formatDate(
                  selectedDiary.date
                )}
              </div>
            </div>
          )}

          <div className="d-flex justify-content-center gap-2">
            <Button
              variant="light"
              className="px-4"
              disabled={deleting}
              onClick={
                closeDeleteModal
              }
              style={{
                borderRadius:
                  "10px",
              }}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              className="px-4"
              disabled={deleting}
              onClick={
                handleDelete
              }
              style={{
                borderRadius:
                  "10px",
              }}
            >
              {deleting ? (
                <>
                  <Spinner
                    size="sm"
                    className="me-2"
                  />
                  Deleting...
                </>
              ) : (
                <>
                  <FaTrash className="me-2" />
                  Delete Diary
                </>
              )}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default DiaryList;