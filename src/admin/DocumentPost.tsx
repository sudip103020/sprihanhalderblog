import { useEffect, useState } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Row,
  Col,
  Spinner,
  Alert,
  Badge,
  Modal,
} from "react-bootstrap";

import {
  FaArrowLeft,
  FaSave,
  FaEye,
  FaTrash,
  FaFileAlt,
  FaDownload,
} from "react-icons/fa";

import { useNavigate, useParams } from "react-router-dom";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";

const DocumentPost = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditMode = Boolean(id);

  // =========================
  // Loading
  // =========================
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // =========================
  // Document Fields
  // =========================
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [documentUrl, setDocumentUrl] = useState("");
  const [documentPublicId, setDocumentPublicId] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentSize, setDocumentSize] = useState("");

  const [status, setStatus] = useState<
    "published" | "draft"
  >("published");

  // =========================
  // File
  // =========================
  const [documentFile, setDocumentFile] =
    useState<File | null>(null);

  // =========================
  // Messages
  // =========================
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================
  // Preview
  // =========================
  const [showPreview, setShowPreview] = useState(false);

  // =========================
  // Load Document
  // =========================
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError("");

        const documentRef = doc(
          db,
          "documents",
          id
        );

        const documentSnap =
          await getDoc(documentRef);

        if (!documentSnap.exists()) {
          setError("Document পাওয়া যায়নি।");
          return;
        }

        const data = documentSnap.data();

        setTitle(data.title || "");
        setDescription(data.description || "");

        setDocumentUrl(data.documentUrl || "");
        setDocumentPublicId(
          data.documentPublicId || ""
        );
        setDocumentName(
          data.documentName || ""
        );
        setDocumentType(
          data.documentType || ""
        );
        setDocumentSize(
          data.documentSize || ""
        );

        setStatus(
          data.status === "draft"
            ? "draft"
            : "published"
        );
      } catch (error) {
        console.error(
          "Document load error:",
          error
        );

        setError(
          "Document load করতে সমস্যা হয়েছে।"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [id]);

  // =========================
  // Select Document
  // =========================
  const handleDocumentSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ];

    if (
      !allowedTypes.includes(file.type)
    ) {
      setError(
        "শুধু PDF, Word, Excel, PowerPoint অথবা TXT file নির্বাচন করুন।"
      );
      return;
    }

    // 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError(
        "Document সর্বোচ্চ 10MB হতে পারবে।"
      );
      return;
    }

    setError("");
    setDocumentFile(file);

    setDocumentName(file.name);
    setDocumentType(file.type);

    const size =
      file.size / (1024 * 1024);

    setDocumentSize(
      size < 1
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${size.toFixed(2)} MB`
    );

    event.target.value = "";
  };

  // =========================
  // Upload Cloudinary
  // =========================
  // =========================
// Upload Document to Cloudinary
// =========================
const uploadToCloudinary = async (file: File) => {
  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary configuration পাওয়া যায়নি।"
    );
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  // Document/PDF এর জন্য raw upload
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    console.error(
      "Cloudinary upload error:",
      errorData
    );

    throw new Error(
      errorData?.error?.message ||
        "Cloudinary document upload failed."
    );
  }

  const data = await response.json();

  console.log("Cloudinary document:", data);

  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
  };
};

  // =========================
  // Save Document
  // =========================
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Document title লিখুন।");
      return;
    }

    if (!description.trim()) {
      setError(
        "Short description লিখুন।"
      );
      return;
    }

    // New document হলে file অবশ্যই লাগবে
    if (!isEditMode && !documentFile) {
      setError(
        "একটি document নির্বাচন করুন।"
      );
      return;
    }

    try {
      setSaving(true);

      let finalUrl = documentUrl;
      let finalPublicId =
        documentPublicId;
      let finalName = documentName;
      let finalType = documentType;
      let finalSize = documentSize;

      // =========================
      // Upload New Document
      // =========================
      if (documentFile) {
        setUploading(true);

        const uploaded =
          await uploadToCloudinary(
            documentFile
          );

        finalUrl = uploaded.url;
        finalPublicId =
          uploaded.publicId;

        finalName =
          documentFile.name;

        finalType =
          documentFile.type;

        const size =
          documentFile.size /
          (1024 * 1024);

        finalSize =
          size < 1
            ? `${(
                documentFile.size /
                1024
              ).toFixed(1)} KB`
            : `${size.toFixed(2)} MB`;

        setUploading(false);
      }

      // =========================
      // Add Document
      // =========================
      if (!isEditMode) {
        await addDoc(
          collection(db, "documents"),
          {
            title: title.trim(),

            description:
              description.trim(),

            documentUrl: finalUrl,

            documentPublicId:
              finalPublicId,

            documentName: finalName,

            documentType: finalType,

            documentSize: finalSize,

            status,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );

        setSuccess(
          "Document সফলভাবে তৈরি হয়েছে।"
        );
      }

      // =========================
      // Update Document
      // =========================
      else {
        await updateDoc(
          doc(
            db,
            "documents",
            id as string
          ),
          {
            title: title.trim(),

            description:
              description.trim(),

            documentUrl: finalUrl,

            documentPublicId:
              finalPublicId,

            documentName: finalName,

            documentType: finalType,

            documentSize: finalSize,

            status,

            updatedAt:
              serverTimestamp(),
          }
        );

        setSuccess(
          "Document সফলভাবে update হয়েছে।"
        );
      }

      setDocumentFile(null);

      setTimeout(() => {
        navigate("/admin/documents");
      }, 1000);
    } catch (error) {
      console.error(
        "Save document error:",
        error
      );

      setUploading(false);

      setError(
        error instanceof Error
          ? error.message
          : "Document save করতে সমস্যা হয়েছে।"
      );
    } finally {
      setSaving(false);
    }
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
            Loading document...
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
              {isEditMode
                ? "Edit Document"
                : "Add Document"}
            </h2>

            <p className="text-muted mb-0">
              {isEditMode
                ? "Update your document"
                : "Upload a new document"}
            </p>
          </div>

          <Button
            variant="outline-dark"
            onClick={() =>
              navigate(
                "/admin/documents"
              )
            }
          >
            <FaArrowLeft className="me-2" />
            Back
          </Button>
        </div>

        {/* Alerts */}
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

        <Row className="g-4">
          {/* Editor */}
          <Col lg={8}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <Form
                  onSubmit={handleSubmit}
                >
                  {/* Title */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Document Title
                    </Form.Label>

                    <Form.Control
                      type="text"
                      value={title}
                      onChange={(e) =>
                        setTitle(
                          e.target.value
                        )
                      }
                      placeholder="যেমন: Sprihan Medical Report"
                      size="lg"
                    />
                  </Form.Group>

                  {/* Description */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Short Description
                    </Form.Label>

                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={description}
                      onChange={(e) =>
                        setDescription(
                          e.target.value
                        )
                      }
                      placeholder="Document সম্পর্কে ছোট description লিখুন..."
                    />
                  </Form.Group>

                  {/* File */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Document File
                    </Form.Label>

                    <Form.Control
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      onChange={
                        handleDocumentSelect
                      }
                      disabled={saving}
                    />

                    <Form.Text className="text-muted">
                      PDF, Word, Excel,
                      PowerPoint অথবা TXT.
                      Maximum 10MB.
                    </Form.Text>
                  </Form.Group>

                  {/* Selected File */}
                  {documentName && (
                    <Card className="mb-4 border">
                      <Card.Body>
                        <div className="d-flex align-items-center">
                          <div
                            className="rounded-3 bg-dark text-white d-flex align-items-center justify-content-center me-3"
                            style={{
                              width: "55px",
                              height: "55px",
                            }}
                          >
                            <FaFileAlt
                              size={24}
                            />
                          </div>

                          <div className="flex-grow-1">
                            <div className="fw-semibold">
                              {documentName}
                            </div>

                            <small className="text-muted">
                              {documentSize ||
                                "Document"}
                            </small>
                          </div>

                          {documentUrl && (
                            <Button
                              variant="outline-dark"
                              size="sm"
                              href={
                                documentUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FaEye />
                            </Button>
                          )}

                          {documentFile && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="ms-2"
                              type="button"
                              onClick={() => {
                                setDocumentFile(
                                  null
                                );

                                if (
                                  !isEditMode
                                ) {
                                  setDocumentName(
                                    ""
                                  );
                                  setDocumentType(
                                    ""
                                  );
                                  setDocumentSize(
                                    ""
                                  );
                                }
                              }}
                            >
                              <FaTrash />
                            </Button>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Status */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Status
                    </Form.Label>

                    <Form.Select
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target
                            .value as
                            | "published"
                            | "draft"
                        )
                      }
                    >
                      <option value="published">
                        Published
                      </option>

                      <option value="draft">
                        Draft
                      </option>
                    </Form.Select>
                  </Form.Group>

                  {/* Buttons */}
                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() =>
                        navigate(
                          "/admin/documents"
                        )
                      }
                      disabled={saving}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      variant="outline-dark"
                      onClick={() =>
                        setShowPreview(true)
                      }
                      disabled={saving}
                    >
                      <FaEye className="me-2" />
                      Preview
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

                          {uploading
                            ? "Uploading..."
                            : "Saving..."}
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" />

                          {isEditMode
                            ? "Update Document"
                            : "Save Document"}
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Preview */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0">
                    Document Preview
                  </h5>

                  <Badge
                    bg={
                      status ===
                      "published"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {status}
                  </Badge>
                </div>

                <div
                  className="rounded-4 d-flex align-items-center justify-content-center mb-4"
                  style={{
                    height: "180px",
                    background:
                      "linear-gradient(135deg,#f1f3f5,#ffffff)",
                    border:
                      "1px solid #e9ecef",
                  }}
                >
                  <div className="text-center">
                    <FaFileAlt
                      size={65}
                      className="text-secondary"
                    />

                    <div className="mt-3 fw-semibold">
                      {documentName ||
                        "No document selected"}
                    </div>
                  </div>
                </div>

                <h4 className="fw-bold">
                  {title ||
                    "Document Title"}
                </h4>

                <p className="text-muted">
                  {description ||
                    "Short description will appear here..."}
                </p>

                {documentName && (
                  <>
                    <hr />

                    <div className="small">
                      <div className="mb-2">
                        <strong>
                          File:
                        </strong>{" "}
                        {documentName}
                      </div>

                      <div>
                        <strong>
                          Size:
                        </strong>{" "}
                        {documentSize ||
                          "N/A"}
                      </div>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Preview Modal */}
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
          <div className="text-center py-4">
            <FaFileAlt
              size={80}
              className="text-secondary mb-3"
            />

            <h3 className="fw-bold">
              {title ||
                "Document Title"}
            </h3>

            <p className="text-muted">
              {description ||
                "Document description..."}
            </p>

            {documentName && (
              <div className="small text-muted mb-4">
                {documentName}{" "}
                • {documentSize}
              </div>
            )}

            {documentUrl && (
              <Button
                variant="dark"
                href={documentUrl}
                target="_blank"
                rel="noreferrer"
              >
                <FaDownload className="me-2" />
                Open Document
              </Button>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="dark"
            onClick={() =>
              setShowPreview(false)
            }
          >
            Close Preview
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DocumentPost;