import { useEffect, useState } from "react";
import {
  Container,
  Card,
  Table,
  Button,
  Badge,
  Spinner,
  Alert,
  Modal,
  Row,
  Col,
  Image,
  Form,
} from "react-bootstrap";

import {
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaImages,
  FaArrowLeft,
  FaGlobe,
  FaLock,
  FaVideo,
  FaFilter,
  FaDownload,
} from "react-icons/fa";

import { useNavigate, useSearchParams } from "react-router-dom";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../firebase/config";

import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";

interface MemoryMedia {
  url: string;
  publicId: string;
  visibility: "public" | "private";
  name: string;
  mediaType: "image" | "video";
}

interface Memory {
  id: string;
  date: string;
  type: string;
  description: string;
  comment: string;
  media: MemoryMedia[];
}

const MemoryList = () => {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const categoryFromUrl =
    searchParams.get("type") || "all";

  const [memories, setMemories] = useState<Memory[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showDetails, setShowDetails] =
    useState(false);

  const [selectedMemory, setSelectedMemory] =
    useState<Memory | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  // Full media preview
  const [showMediaPreview, setShowMediaPreview] =
    useState(false);

  const [selectedMedia, setSelectedMedia] =
    useState<MemoryMedia | null>(null);

  // ==========================================
  // Load Memories
  // ==========================================

  const loadMemories = async () => {
    try {
      setLoading(true);
      setError("");

      const memoriesQuery = query(
        collection(db, "memories"),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(memoriesQuery);

      const data: Memory[] = snapshot.docs.map(
        (item) => {
          const raw = item.data();

          let media: MemoryMedia[] = [];

          // New media structure
          if (
            Array.isArray(raw.media) &&
            raw.media.length > 0
          ) {
            media = raw.media.map((item: any) => ({
              ...item,
              mediaType:
                item.mediaType || "image",
            }));
          }

          // Old images compatibility
          else if (Array.isArray(raw.images)) {
            media = raw.images.map(
              (image: any) => ({
                ...image,
                mediaType: "image",
              })
            );
          }

          return {
            id: item.id,
            date: raw.date || "",
            type: raw.type || "",
            description: raw.description || "",
            comment: raw.comment || "",
            media,
          };
        }
      );

      setMemories(data);
    } catch (error) {
      console.error(
        "Load memories error:",
        error
      );

      setError(
        "Memory load করতে সমস্যা হয়েছে। Firestore index/rules check করুন।"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  // ==========================================
  // Format Date
  // ==========================================

  const formatDate = (date: string) => {
    if (!date) return "-";

    const parsedDate = new Date(
      `${date}T00:00:00`
    );

    return parsedDate.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ==========================================
  // Type Name
  // ==========================================

  const getTypeName = (type: string) => {
    switch (type) {
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
        return type || "-";
    }
  };

  // ==========================================
  // Type Icon
  // ==========================================

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "prescription":
        return "💊";

      case "travel":
        return "✈️";

      case "general":
        return "❤️";

      case "video":
        return "🎬";

      case "program":
        return "🎉";

      case "other":
        return "📌";

      default:
        return "📁";
    }
  };

  // ==========================================
  // Category Change
  // ==========================================

  const handleCategoryChange = (
    value: string
  ) => {
    if (value === "all") {
      setSearchParams({});
    } else {
      setSearchParams({
        type: value,
      });
    }
  };

  // ==========================================
  // Filter Memories
  // ==========================================

  const filteredMemories = memories.filter(
    (memory) => {
      const categoryMatch =
        categoryFromUrl === "all" ||
        memory.type === categoryFromUrl;

      const fromDateMatch =
        !fromDate ||
        memory.date >= fromDate;

      const toDateMatch =
        !toDate ||
        memory.date <= toDate;

      return (
        categoryMatch &&
        fromDateMatch &&
        toDateMatch
      );
    }
  );

  // ==========================================
  // View Memory Details
  // ==========================================

  const handleView = (memory: Memory) => {
    setSelectedMemory(memory);
    setShowDetails(true);
  };

  // ==========================================
  // Open Full Media Preview
  // ==========================================

  const handleMediaPreview = (
    media: MemoryMedia
  ) => {
    setSelectedMedia(media);
    setShowMediaPreview(true);
  };

  // ==========================================
  // Close Media Preview
  // ==========================================

  const handleCloseMediaPreview = () => {
    setShowMediaPreview(false);
    setSelectedMedia(null);
  };

  // ==========================================
  // Delete Memory
  // ==========================================

  const handleDelete = async (
    memory: Memory
  ) => {
    const confirmDelete =
      window.confirm(
        `Are you sure you want to delete this memory?\n\n${formatDate(
          memory.date
        )} - ${getTypeName(memory.type)}`
      );

    if (!confirmDelete) return;

    try {
      setDeletingId(memory.id);

      await deleteDoc(
        doc(db, "memories", memory.id)
      );

      setMemories((prev) =>
        prev.filter(
          (item) =>
            item.id !== memory.id
        )
      );

      if (
        selectedMemory?.id ===
        memory.id
      ) {
        setSelectedMemory(null);
        setShowDetails(false);
      }
    } catch (error) {
      console.error(
        "Delete memory error:",
        error
      );

      setError(
        "Memory delete করতে সমস্যা হয়েছে।"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================
  // Download Media
  // ==========================================

  const handleDownload = async (
    media: MemoryMedia
  ) => {
    try {
      const response = await fetch(
        media.url
      );

      const blob =
        await response.blob();

      const blobUrl =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = blobUrl;

      link.download =
        media.name ||
        (media.mediaType === "video"
          ? "sprihan-video"
          : "sprihan-memory");

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(
        blobUrl
      );
    } catch (error) {
      console.error(
        "Download error:",
        error
      );

      // Fallback
      window.open(
        media.url,
        "_blank"
      );
    }
  };

  return (
    <div className="min-vh-100 bg-light py-4">
      <Container>

        {/* ========================================
            Header
        ======================================== */}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">
              Sprihan's Memories
            </h4>
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
                  "/admin/memories/add"
                )
              }
            >
              <FaPlus className="me-2" />
              Add Memory
            </Button>

          </div>
        </div>

        {/* ========================================
            Error
        ======================================== */}

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

        {/* ========================================
            Filter
        ======================================== */}

        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>

            <Row className="align-items-end g-3">

              {/* Category */}

              <Col md={4}>
                <Form.Label className="fw-semibold">
                  <FaFilter className="me-2" />
                  Memory Category
                </Form.Label>

                <Form.Select
                  value={
                    categoryFromUrl
                  }
                  onChange={(e) =>
                    handleCategoryChange(
                      e.target.value
                    )
                  }
                >
                  <option value="all">
                    All Memories
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
              </Col>

              {/* From Date */}

              <Col md={3}>
                <Form.Label className="fw-semibold">
                  From Date
                </Form.Label>

                <Form.Control
                  type="date"
                  value={fromDate}
                  onChange={(e) =>
                    setFromDate(
                      e.target.value
                    )
                  }
                />
              </Col>

              {/* To Date */}

              <Col md={3}>
                <Form.Label className="fw-semibold">
                  To Date
                </Form.Label>

                <Form.Control
                  type="date"
                  value={toDate}
                  min={
                    fromDate ||
                    undefined
                  }
                  onChange={(e) =>
                    setToDate(
                      e.target.value
                    )
                  }
                />
              </Col>

              {/* Clear */}

              <Col md={2}>
                <Button
                  variant="outline-secondary"
                  className="w-100"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setSearchParams({});
                  }}
                  disabled={
                    categoryFromUrl ===
                      "all" &&
                    !fromDate &&
                    !toDate
                  }
                >
                  Clear Filter
                </Button>
              </Col>

            </Row>

            {/* Filter Result */}

            {(fromDate ||
              toDate ||
              categoryFromUrl !==
                "all") && (
              <div className="mt-3 pt-3 border-top">
                <small className="text-muted">

                  Showing{" "}
                  <strong>
                    {
                      filteredMemories.length
                    }
                  </strong>{" "}
                  memories

                  {fromDate && (
                    <>
                      {" "}
                      from{" "}
                      <strong>
                        {formatDate(
                          fromDate
                        )}
                      </strong>
                    </>
                  )}

                  {toDate && (
                    <>
                      {" "}
                      to{" "}
                      <strong>
                        {formatDate(
                          toDate
                        )}
                      </strong>
                    </>
                  )}

                </small>
              </div>
            )}

          </Card.Body>
        </Card>

        {/* ========================================
            Memory Table
        ======================================== */}

        <Card className="border-0 shadow-sm">

          <Card.Body className="p-0">

            {loading ? (
              <div className="text-center py-5">

                <Spinner animation="border" />

                <p className="text-muted mt-3 mb-0">
                  Loading memories...
                </p>

              </div>
            ) : filteredMemories.length ===
              0 ? (

              <div className="text-center py-5 px-3">

                <FaImages className="fs-1 text-muted mb-3" />

                <h5 className="fw-bold">
                  No Memories Found
                </h5>

                <p className="text-muted">
                  এই category-তে কোনো
                  Memory নেই।
                </p>

                <Button
                  variant="dark"
                  onClick={() =>
                    navigate(
                      "/admin/memories/add"
                    )
                  }
                >
                  <FaPlus className="me-2" />
                  Add Memory
                </Button>

              </div>
            ) : (

              <div className="table-responsive">

                <Table
                  hover
                  className="mb-0 align-middle"
                >

                  <thead className="table-light">
                    <tr>

                      <th className="px-4">
                        Date
                      </th>

                      <th>
                        Type
                      </th>

                      <th>
                        Description
                      </th>

                      <th>
                        Media
                      </th>

                      <th>
                        Visibility
                      </th>

                      <th className="text-end px-4">
                        Action
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {filteredMemories.map(
                      (memory) => {

                        const publicCount =
                          memory.media.filter(
                            (item) =>
                              item.visibility ===
                              "public"
                          ).length;

                        const privateCount =
                          memory.media.filter(
                            (item) =>
                              item.visibility ===
                              "private"
                          ).length;

                        const videoCount =
                          memory.media.filter(
                            (item) =>
                              item.mediaType ===
                              "video"
                          ).length;

                        return (
                          <tr
                            key={
                              memory.id
                            }
                          >

                            {/* Date */}

                            <td className="px-4 fw-semibold">
                              {formatDate(
                                memory.date
                              )}
                            </td>

                            {/* Type */}

                            <td>
                              <Badge bg="secondary">
                                {getTypeIcon(
                                  memory.type
                                )}{" "}
                                {getTypeName(
                                  memory.type
                                )}
                              </Badge>
                            </td>

                            {/* Description */}

                            <td
                              style={{
                                maxWidth:
                                  "280px",
                              }}
                            >
                              <div className="text-truncate">
                                {memory.description ||
                                  "-"}
                              </div>
                            </td>

                            {/* Media */}

                            <td>

                              <span className="fw-semibold">
                                {
                                  memory.media
                                    .length
                                }{" "}
                                Items
                              </span>

                              {videoCount >
                                0 && (
                                <Badge
                                  bg="primary"
                                  className="ms-2"
                                >
                                  <FaVideo className="me-1" />
                                  {
                                    videoCount
                                  }
                                </Badge>
                              )}

                            </td>

                            {/* Visibility */}

                            <td>

                              <div className="d-flex gap-1 flex-wrap">

                                {publicCount >
                                  0 && (
                                  <Badge bg="success">
                                    <FaGlobe className="me-1" />
                                    {
                                      publicCount
                                    }
                                  </Badge>
                                )}

                                {privateCount >
                                  0 && (
                                  <Badge bg="dark">
                                    <FaLock className="me-1" />
                                    {
                                      privateCount
                                    }
                                  </Badge>
                                )}

                              </div>

                            </td>

                            {/* Actions */}

                            <td className="text-end px-4">

                              <div className="d-flex justify-content-end gap-2">

                                {/* View */}

                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  title="View"
                                  onClick={() =>
                                    handleView(
                                      memory
                                    )
                                  }
                                >
                                  <FaEye />
                                </Button>

                                {/* Edit */}

                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  title="Edit"
                                  onClick={() =>
                                    navigate(
                                      `/admin/memories/edit/${memory.id}`
                                    )
                                  }
                                >
                                  <FaEdit />
                                </Button>

                                {/* Delete */}

                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  title="Delete"
                                  disabled={
                                    deletingId ===
                                    memory.id
                                  }
                                  onClick={() =>
                                    handleDelete(
                                      memory
                                    )
                                  }
                                >
                                  {deletingId ===
                                  memory.id ? (
                                    <Spinner
                                      animation="border"
                                      size="sm"
                                    />
                                  ) : (
                                    <FaTrash />
                                  )}
                                </Button>

                              </div>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </Table>

              </div>

            )}

          </Card.Body>

        </Card>

      </Container>

      {/* ==========================================
          Memory Details Modal
      ========================================== */}

      <Modal
        show={showDetails}
        onHide={() =>
          setShowDetails(false)
        }
        size="xl"
        centered
      >

        <Modal.Header closeButton>

          <Modal.Title className="fw-bold">
            Memory Details
          </Modal.Title>

        </Modal.Header>

        <Modal.Body>

          {selectedMemory && (
            <>

              {/* Basic Info */}

              <Row className="g-3 mb-4">

                <Col md={4}>

                  <small className="text-muted">
                    Date
                  </small>

                  <div className="fw-semibold">
                    {formatDate(
                      selectedMemory.date
                    )}
                  </div>

                </Col>

                <Col md={4}>

                  <small className="text-muted">
                    Type
                  </small>

                  <div>

                    <Badge bg="secondary">
                      {getTypeIcon(
                        selectedMemory.type
                      )}{" "}
                      {getTypeName(
                        selectedMemory.type
                      )}
                    </Badge>

                  </div>

                </Col>

                <Col md={4}>

                  <small className="text-muted">
                    Media
                  </small>

                  <div className="fw-semibold">
                    {
                      selectedMemory
                        .media.length
                    }{" "}
                    Items
                  </div>

                </Col>

              </Row>

              {/* Description */}

              {selectedMemory.description && (
                <div className="mb-4">

                  <h6 className="fw-bold">
                    Description
                  </h6>

                  <p className="text-muted mb-0">
                    {
                      selectedMemory.description
                    }
                  </p>

                </div>
              )}

              {/* Comment */}

              {selectedMemory.comment && (
                <div className="mb-4">

                  <h6 className="fw-bold">
                    Comment
                  </h6>

                  <p className="text-muted mb-0">
                    {
                      selectedMemory.comment
                    }
                  </p>

                </div>
              )}

              {/* Media Title */}

              <h6 className="fw-bold mb-3">
                Photos & Videos
              </h6>

              {/* Media Grid */}

              <Row className="g-3">

                {selectedMemory.media.map(
                  (item, index) => (

                    <Col
                      xs={12}
                      sm={6}
                      md={4}
                      lg={3}
                      key={`${item.publicId}-${index}`}
                    >

                      <Card className="border shadow-sm h-100">

                        {/* Media Preview Area */}

                        <div
                          style={{
                            height:
                              "190px",
                            overflow:
                              "hidden",
                            background:
                              "#111",
                          }}
                        >

                          {item.mediaType ===
                          "video" ? (

                            <video
                              src={
                                item.url
                              }
                              className="w-100 h-100"
                              style={{
                                objectFit:
                                  "cover",
                                cursor:
                                  "pointer",
                              }}
                              controls
                              onClick={() =>
                                handleMediaPreview(
                                  item
                                )
                              }
                            />

                          ) : (

                            <Image
                              src={
                                item.url
                              }
                              className="w-100 h-100"
                              style={{
                                objectFit:
                                  "cover",
                                cursor:
                                  "pointer",
                              }}
                              onClick={() =>
                                handleMediaPreview(
                                  item
                                )
                              }
                            />

                          )}

                        </div>

                        {/* Card Body */}

                        <Card.Body className="p-2">

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
                                "Image"
                              )}

                            </Badge>

                          </div>

                          <div className="small text-truncate mb-2">
                            {item.name}
                          </div>

                          {item.visibility ===
                          "public" ? (

                            <Badge bg="success">
                              <FaGlobe className="me-1" />
                              Public
                            </Badge>

                          ) : (

                            <Badge bg="dark">
                              <FaLock className="me-1" />
                              Private
                            </Badge>

                          )}

                        </Card.Body>

                      </Card>

                    </Col>

                  )
                )}

              </Row>

            </>
          )}

        </Modal.Body>

        {/* Details Footer */}

        <Modal.Footer>

          {selectedMemory && (

            <Button
              variant="warning"
              onClick={() => {
                setShowDetails(false);

                navigate(
                  `/admin/memories/edit/${selectedMemory.id}`
                );
              }}
            >
              <FaEdit className="me-2" />
              Edit Memory
            </Button>

          )}

          <Button
            variant="secondary"
            onClick={() =>
              setShowDetails(false)
            }
          >
            Close
          </Button>

        </Modal.Footer>

      </Modal>

      {/* ==========================================
          FULL IMAGE / VIDEO PREVIEW MODAL
      ========================================== */}

      <Modal
        show={showMediaPreview}
        onHide={
          handleCloseMediaPreview
        }
        centered
        size="xl"
        fullscreen="lg-down"
        contentClassName="border-0"
      >

        <Modal.Header
          closeButton
          className="bg-dark text-white border-0"
        >

          <Modal.Title className="fw-bold">

            {selectedMedia?.mediaType ===
            "video"
              ? "Video Preview"
              : "Image Preview"}

          </Modal.Title>

        </Modal.Header>

        <Modal.Body
          className="p-0"
          style={{
            background: "#111",
            minHeight: "70vh",
            overflow: "hidden",
          }}
        >

          {selectedMedia && (

            selectedMedia.mediaType ===
            "video" ? (

              /* ==========================
                 VIDEO PREVIEW
              ========================== */

              <div
                className="w-100 d-flex justify-content-center align-items-center"
                style={{
                  minHeight: "70vh",
                  background: "#111",
                }}
              >

                <video
                  src={
                    selectedMedia.url
                  }
                  controls
                  autoPlay
                  playsInline
                  style={{
                    maxWidth:
                      "100%",
                    maxHeight:
                      "80vh",
                    width:
                      "auto",
                    height:
                      "auto",
                    objectFit:
                      "contain",
                  }}
                />

              </div>

            ) : (

              /* ==========================
                 IMAGE ZOOM PREVIEW
              ========================== */

              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={5}
                centerOnInit
                doubleClick={{
                  mode: "zoomIn",
                }}
                pinch={{
                  disabled: false,
                }}
                wheel={{
                  step: 0.2,
                }}
              >

                <TransformComponent
                  wrapperStyle={{
                    width:
                      "100%",
                    height:
                      "75vh",
                    minHeight:
                      "70vh",
                    display:
                      "flex",
                    justifyContent:
                      "center",
                    alignItems:
                      "center",
                    background:
                      "#111",
                  }}
                  contentStyle={{
                    display:
                      "flex",
                    justifyContent:
                      "center",
                    alignItems:
                      "center",
                  }}
                >

                  <img
                    src={
                      selectedMedia.url
                    }
                    alt={
                      selectedMedia.name ||
                      "Sprihan Memory"
                    }
                    style={{
                      maxWidth:
                        "100%",
                      maxHeight:
                        "75vh",
                      width:
                        "auto",
                      height:
                        "auto",
                      objectFit:
                        "contain",
                      display:
                        "block",
                      userSelect:
                        "none",
                    }}
                    draggable={
                      false
                    }
                  />

                </TransformComponent>

              </TransformWrapper>

            )

          )}

        </Modal.Body>

        {/* ==================================
            Preview Footer
        ================================== */}

        <Modal.Footer className="bg-light">

          {selectedMedia && (

            <Button
              variant="primary"
              onClick={() =>
                handleDownload(
                  selectedMedia
                )
              }
            >
              <FaDownload className="me-2" />
              Download
            </Button>

          )}

          <Button
            variant="secondary"
            onClick={
              handleCloseMediaPreview
            }
          >
            Close
          </Button>

        </Modal.Footer>

      </Modal>

    </div>
  );
};

export default MemoryList;