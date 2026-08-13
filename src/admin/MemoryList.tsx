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
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase/config";

interface MemoryImage {
  url: string;
  publicId: string;
  visibility: "public" | "private";
  name: string;
}

interface Memory {
  id: string;
  date: string;
  type: string;
  description: string;
  comment: string;
  images: MemoryImage[];
}

const MemoryList = () => {
  const navigate = useNavigate();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showDetails, setShowDetails] = useState(false);
  const [selectedMemory, setSelectedMemory] =
    useState<Memory | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const loadMemories = async () => {
    try {
      setLoading(true);
      setError("");

      const memoriesQuery = query(
        collection(db, "memories"),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(memoriesQuery);

      const data: Memory[] = snapshot.docs.map((item) => {
        const raw = item.data();

        return {
          id: item.id,
          date: raw.date || "",
          type: raw.type || "",
          description: raw.description || "",
          comment: raw.comment || "",
          images: raw.images || [],
        };
      });

      setMemories(data);
    } catch (error) {
      console.error("Load memories error:", error);

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

  const formatDate = (date: string) => {
    if (!date) return "-";

    const parsedDate = new Date(`${date}T00:00:00`);

    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "prescription":
        return "Prescription";

      case "travel":
        return "Travel";

      case "general":
        return "General Memory";

      case "other":
        return "Other";

      default:
        return type || "-";
    }
  };

  const handleView = (memory: Memory) => {
    setSelectedMemory(memory);
    setShowDetails(true);
  };

  const handleDelete = async (memory: Memory) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this memory?\n\n${formatDate(
        memory.date
      )} - ${getTypeName(memory.type)}`
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(memory.id);

      await deleteDoc(doc(db, "memories", memory.id));

      setMemories((prev) =>
        prev.filter((item) => item.id !== memory.id)
      );

      if (selectedMemory?.id === memory.id) {
        setSelectedMemory(null);
        setShowDetails(false);
      }
    } catch (error) {
      console.error("Delete memory error:", error);

      setError("Memory delete করতে সমস্যা হয়েছে।");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-vh-100 bg-light py-4">
      <Container>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              Memories
            </h2>

            <p className="text-muted mb-0">
              Manage Sprihan's memories
            </p>
          </div>

          <div className="d-flex gap-2">
            <Button
              variant="outline-dark"
              onClick={() =>
                navigate("/admin/dashboard")
              }
            >
              <FaArrowLeft className="me-2" />
              Dashboard
            </Button>

            <Button
              variant="dark"
              onClick={() =>
                navigate("/admin/memories/add")
              }
            >
              <FaPlus className="me-2" />
              Add Memory
            </Button>
          </div>
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

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />

                <p className="text-muted mt-3 mb-0">
                  Loading memories...
                </p>
              </div>
            ) : memories.length === 0 ? (
              <div className="text-center py-5 px-3">
                <FaImages className="fs-1 text-muted mb-3" />

                <h5 className="fw-bold">
                  No Memories Found
                </h5>

                <p className="text-muted">
                  এখনো কোনো Memory যোগ করা হয়নি।
                </p>

                <Button
                  variant="dark"
                  onClick={() =>
                    navigate("/admin/memories/add")
                  }
                >
                  <FaPlus className="me-2" />
                  Add First Memory
                </Button>
              </div>
            ) : (
              <div className="table-responsive">
                <Table
                  hover
                  responsive
                  className="mb-0 align-middle"
                >
                  <thead className="table-light">
                    <tr>
                      <th className="px-4">Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Photos</th>
                      <th>Visibility</th>
                      <th className="text-end px-4">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {memories.map((memory) => {
                      const publicCount =
                        memory.images.filter(
                          (image) =>
                            image.visibility === "public"
                        ).length;

                      const privateCount =
                        memory.images.filter(
                          (image) =>
                            image.visibility === "private"
                        ).length;

                      return (
                        <tr key={memory.id}>
                          <td className="px-4 fw-semibold">
                            {formatDate(memory.date)}
                          </td>

                          <td>
                            <Badge bg="secondary">
                              {getTypeName(memory.type)}
                            </Badge>
                          </td>

                          <td
                            style={{
                              maxWidth: "280px",
                            }}
                          >
                            <div className="text-truncate">
                              {memory.description || "-"}
                            </div>
                          </td>

                          <td>
                            <span className="fw-semibold">
                              <FaImages className="me-1" />
                              {memory.images.length}
                            </span>
                          </td>

                          <td>
                            <div className="d-flex gap-1 flex-wrap">
                              {publicCount > 0 && (
                                <Badge bg="success">
                                  <FaGlobe className="me-1" />
                                  {publicCount}
                                </Badge>
                              )}

                              {privateCount > 0 && (
                                <Badge bg="dark">
                                  <FaLock className="me-1" />
                                  {privateCount}
                                </Badge>
                              )}
                            </div>
                          </td>

                          <td className="text-end px-4">
                            <div className="d-flex justify-content-end gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                title="View"
                                onClick={() =>
                                  handleView(memory)
                                }
                              >
                                <FaEye />
                              </Button>

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

                              <Button
                                variant="outline-danger"
                                size="sm"
                                title="Delete"
                                disabled={
                                  deletingId === memory.id
                                }
                                onClick={() =>
                                  handleDelete(memory)
                                }
                              >
                                {deletingId === memory.id ? (
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
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Details Modal */}
      <Modal
        show={showDetails}
        onHide={() => setShowDetails(false)}
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
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <small className="text-muted">
                    Date
                  </small>

                  <div className="fw-semibold">
                    {formatDate(selectedMemory.date)}
                  </div>
                </Col>

                <Col md={4}>
                  <small className="text-muted">
                    Type
                  </small>

                  <div>
                    <Badge bg="secondary">
                      {getTypeName(selectedMemory.type)}
                    </Badge>
                  </div>
                </Col>

                <Col md={4}>
                  <small className="text-muted">
                    Photos
                  </small>

                  <div className="fw-semibold">
                    {selectedMemory.images.length} Photos
                  </div>
                </Col>
              </Row>

              {selectedMemory.description && (
                <div className="mb-4">
                  <h6 className="fw-bold">
                    Description
                  </h6>

                  <p className="text-muted mb-0">
                    {selectedMemory.description}
                  </p>
                </div>
              )}

              {selectedMemory.comment && (
                <div className="mb-4">
                  <h6 className="fw-bold">
                    Comment
                  </h6>

                  <p className="text-muted mb-0">
                    {selectedMemory.comment}
                  </p>
                </div>
              )}

              <h6 className="fw-bold mb-3">
                Photos
              </h6>

              <Row className="g-3">
                {selectedMemory.images.map(
                  (image, index) => (
                    <Col
                      xs={12}
                      sm={6}
                      md={4}
                      lg={3}
                      key={`${image.publicId}-${index}`}
                    >
                      <Card className="border shadow-sm h-100">
                        <div
                          style={{
                            height: "190px",
                            overflow: "hidden",
                          }}
                        >
                          <Image
                            src={image.url}
                            className="w-100 h-100"
                            style={{
                              objectFit: "cover",
                            }}
                          />
                        </div>

                        <Card.Body className="p-2">
                          <div className="small text-truncate mb-2">
                            {image.name}
                          </div>

                          {image.visibility ===
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
            onClick={() => setShowDetails(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MemoryList;