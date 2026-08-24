import { useEffect, useState } from "react";

import {
  Container,
  Card,
  Row,
  Col,
  Button,
  Spinner,
  Alert,
  Badge,
  Modal,
} from "react-bootstrap";

import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaArrowLeft,
  FaFileAlt,
  FaDownload,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";

interface DocumentItem {
  id: string;

  title: string;
  description: string;

  documentUrl?: string;
  documentPublicId?: string;
  documentName?: string;
  documentType?: string;
  documentSize?: string;

  status?: "published" | "draft";

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const DocumentList = () => {
  const navigate = useNavigate();

  const [documents, setDocuments] =
    useState<DocumentItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [deleteLoading, setDeleteLoading] =
    useState("");

  const [selectedDocument, setSelectedDocument] =
    useState<DocumentItem | null>(null);

  const [showPreview, setShowPreview] =
    useState(false);

  // =========================
  // Load Documents
  // =========================
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const q = query(
        collection(db, "documents"),
        orderBy("createdAt", "desc")
      );

      const snapshot =
        await getDocs(q);

      const data: DocumentItem[] =
        snapshot.docs.map((item) => {
          const document =
            item.data();

          return {
            id: item.id,

            title:
              document.title || "",

            description:
              document.description ||
              "",

            documentUrl:
              document.documentUrl ||
              "",

            documentPublicId:
              document.documentPublicId ||
              "",

            documentName:
              document.documentName ||
              "",

            documentType:
              document.documentType ||
              "",

            documentSize:
              document.documentSize ||
              "",

            status:
              document.status ===
              "draft"
                ? "draft"
                : "published",

            createdAt:
              document.createdAt,

            updatedAt:
              document.updatedAt,
          };
        });

      setDocuments(data);
    } catch (error) {
      console.error(
        "Document list error:",
        error
      );

      setError(
        "Document list load করতে সমস্যা হয়েছে।"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // =========================
  // Delete
  // =========================
  const handleDelete = async (
    documentItem: DocumentItem
  ) => {
    const confirmDelete =
      window.confirm(
        `"${documentItem.title}" document delete করতে চান?`
      );

    if (!confirmDelete) return;

    try {
      setDeleteLoading(
        documentItem.id
      );

      setError("");

      await deleteDoc(
        doc(
          db,
          "documents",
          documentItem.id
        )
      );

      setDocuments((prev) =>
        prev.filter(
          (item) =>
            item.id !==
            documentItem.id
        )
      );
    } catch (error) {
      console.error(
        "Delete document error:",
        error
      );

      setError(
        "Document delete করতে সমস্যা হয়েছে।"
      );
    } finally {
      setDeleteLoading("");
    }
  };

  // =========================
  // Format Date
  // =========================
  const formatDate = (
    timestamp?: Timestamp
  ) => {
    if (!timestamp) {
      return "Date unavailable";
    }

    return timestamp
      .toDate()
      .toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
  };

  // =========================
  // Loading
  // =========================
  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{
          background: "#f5f6f8",
        }}
      >
        <div className="text-center">
          <Spinner animation="border" />

          <p className="text-muted mt-3">
            Loading documents...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-vh-100 py-4"
      style={{
        background: "#f5f6f8",
      }}
    >
      <Container>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              Documents
            </h2>

            <p className="text-muted mb-0">
              Manage Sprihan's documents
            </p>
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
                  "/admin/documents/add"
                )
              }
            >
              <FaPlus className="me-2" />
              Add Document
            </Button>
          </div>
        </div>

        {/* Error */}
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

        {/* Empty */}
        {documents.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center py-5">
              <FaFileAlt
                size={60}
                className="text-muted mb-3"
              />

              <h4 className="fw-bold">
                No Documents Yet
              </h4>

              <p className="text-muted">
                আপনার প্রথম document
                upload করুন।
              </p>

              <Button
                variant="dark"
                onClick={() =>
                  navigate(
                    "/admin/documents/add"
                  )
                }
              >
                <FaPlus className="me-2" />
                Add First Document
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-4">
            {documents.map(
              (documentItem) => (
                <Col
                  xs={12}
                  md={6}
                  lg={4}
                  key={
                    documentItem.id
                  }
                >
                  <Card
                    className="border-0 shadow-sm h-100"
                    style={{
                      overflow:
                        "hidden",
                    }}
                  >
                    {/* File Header */}
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        height: "220px",
                        background:
                          "linear-gradient(135deg,#f1f3f5,#ffffff)",
                        borderBottom:
                          "1px solid #eee",
                      }}
                    >
                      <div className="text-center">
                        <FaFileAlt
                          size={70}
                          className="text-secondary"
                        />

                        <div className="mt-3 fw-semibold px-3">
                          {documentItem
                            .documentName ||
                            "Document"}
                        </div>
                      </div>
                    </div>

                    <Card.Body className="p-4">
                      {/* Status + Date */}
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <Badge
                          bg={
                            documentItem.status ===
                            "published"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {documentItem.status ||
                            "published"}
                        </Badge>

                        <small className="text-muted">
                          {formatDate(
                            documentItem.createdAt
                          )}
                        </small>
                      </div>

                      {/* Title */}
                      <h5 className="fw-bold mb-2">
                        {
                          documentItem.title
                        }
                      </h5>

                      {/* Description */}
                      <p
                        className="text-muted mb-3"
                        style={{
                          display:
                            "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient:
                            "vertical",
                          overflow:
                            "hidden",
                        }}
                      >
                        {
                          documentItem.description
                        }
                      </p>

                      {/* File Info */}
                      <div className="small text-muted mb-3">
                        <div>
                          <strong>
                            File:
                          </strong>{" "}
                          {documentItem
                            .documentName ||
                            "N/A"}
                        </div>

                        <div>
                          <strong>
                            Size:
                          </strong>{" "}
                          {documentItem
                            .documentSize ||
                            "N/A"}
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-dark"
                          size="sm"
                          className="flex-grow-1"
                          onClick={() => {
                            setSelectedDocument(
                              documentItem
                            );

                            setShowPreview(
                              true
                            );
                          }}
                        >
                          <FaEye className="me-1" />
                          View
                        </Button>

                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/admin/documents/edit/${documentItem.id}`
                            )
                          }
                        >
                          <FaEdit />
                        </Button>

                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() =>
                            handleDelete(
                              documentItem
                            )
                          }
                          disabled={
                            deleteLoading ===
                            documentItem.id
                          }
                        >
                          {deleteLoading ===
                          documentItem.id ? (
                            <Spinner
                              animation="border"
                              size="sm"
                            />
                          ) : (
                            <FaTrash />
                          )}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )
            )}
          </Row>
        )}
      </Container>

      {/* =========================
          Preview Modal
      ========================= */}
      <Modal
        show={showPreview}
        onHide={() =>
          setShowPreview(false)
        }
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            Document Preview
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedDocument && (
            <div className="text-center py-3">
              <FaFileAlt
                size={80}
                className="text-secondary mb-4"
              />

              <div className="mb-3">
                <Badge
                  bg={
                    selectedDocument.status ===
                    "published"
                      ? "success"
                      : "secondary"
                  }
                >
                  {
                    selectedDocument.status
                  }
                </Badge>
              </div>

              <h3 className="fw-bold mb-3">
                {
                  selectedDocument.title
                }
              </h3>

              <p className="text-muted">
                {
                  selectedDocument.description
                }
              </p>

              <hr />

              <div className="small text-muted mb-4">
                <div>
                  <strong>
                    File:
                  </strong>{" "}
                  {
                    selectedDocument.documentName
                  }
                </div>

                <div className="mt-1">
                  <strong>
                    Size:
                  </strong>{" "}
                  {
                    selectedDocument.documentSize
                  }
                </div>
              </div>

              {selectedDocument.documentUrl && (
                <Button
                  variant="dark"
                  href={
                    selectedDocument.documentUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <FaDownload className="me-2" />
                  Open / Download
                </Button>
              )}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          {selectedDocument && (
            <Button
              variant="outline-primary"
              onClick={() => {
                setShowPreview(false);

                navigate(
                  `/admin/documents/edit/${selectedDocument.id}`
                );
              }}
            >
              <FaEdit className="me-2" />
              Edit Document
            </Button>
          )}

          <Button
            variant="dark"
            onClick={() =>
              setShowPreview(false)
            }
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DocumentList;