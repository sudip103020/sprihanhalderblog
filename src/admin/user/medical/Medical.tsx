import { useEffect, useRef, useState } from "react";
import { auth, db } from "../../../firebase/config";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Modal,
  Badge,
} from "react-bootstrap";

import {
  FaHeartbeat,
  FaTint,
  FaWeight,
  FaRulerVertical,
  FaLungs,
  FaStethoscope,
  FaFileMedical,
  FaFilePdf,
  FaImage,
  FaEye,
  FaDownload,
  FaTrash,
  FaUpload,
  FaPlus,
  FaTimes,
  FaArrowLeft,
  FaCalendarAlt,
  FaUserMd,
  FaNotesMedical,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

interface MedicalData {
  id?: string;
  userId: string;
  bloodGroup: string;
  weight: string;
  height: string;
  bloodPressure: string;
  pulse: string;
  oxygen: string;
  note: string;
  updatedAt?: any;
}

interface MedicalDocument {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  category: string;
  doctorName: string;
  date: string;
  note: string;
  publicId?: string;
  createdAt?: any;
}

const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const Medical = () => {
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [medicalData, setMedicalData] =
    useState<MedicalData | null>(null);

  const [documents, setDocuments] = useState<
    MedicalDocument[]
  >([]);

  // Medical information
  const [bloodGroup, setBloodGroup] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bloodPressure, setBloodPressure] =
    useState("");
  const [pulse, setPulse] = useState("");
  const [oxygen, setOxygen] = useState("");
  const [medicalNote, setMedicalNote] = useState("");

  // Upload form
  const [category, setCategory] =
    useState("Prescription");

  const [doctorName, setDoctorName] =
    useState("");

  const [documentDate, setDocumentDate] =
    useState("");

  const [documentNote, setDocumentNote] =
    useState("");

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  // Modal
  const [showUploadModal, setShowUploadModal] =
    useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [selectedDocument, setSelectedDocument] =
    useState<MedicalDocument | null>(null);

  // =========================================
  // LOAD DATA
  // =========================================

  useEffect(() => {
    loadMedicalData();
  }, []);

  const loadMedicalData = async () => {
    try {
      setLoading(true);
      setError("");

      const user = auth.currentUser;

      if (!user) {
        navigate("/admin/login");
        return;
      }

      // -----------------------------------------
      // MEDICAL INFORMATION
      // -----------------------------------------

      const medicalQuery = query(
        collection(db, "medicalInfo"),
        where("userId", "==", user.uid)
      );

      const medicalSnapshot =
        await getDocs(medicalQuery);

      if (!medicalSnapshot.empty) {
        const medicalDoc =
          medicalSnapshot.docs[0];

        const data =
          medicalDoc.data() as MedicalData;

        setMedicalData({
          ...data,
          id: medicalDoc.id,
        });

        setBloodGroup(data.bloodGroup || "");
        setWeight(data.weight || "");
        setHeight(data.height || "");
        setBloodPressure(
          data.bloodPressure || ""
        );
        setPulse(data.pulse || "");
        setOxygen(data.oxygen || "");
        setMedicalNote(data.note || "");
      }

      // -----------------------------------------
      // MEDICAL DOCUMENTS
      // -----------------------------------------

      const documentsQuery = query(
        collection(db, "medicalDocuments"),
        where("userId", "==", user.uid)
      );

      const documentsSnapshot =
        await getDocs(documentsQuery);

      const documentList =
        documentsSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as MedicalDocument[];

      // Newest first
      documentList.sort((a, b) => {
        const aTime =
          a.createdAt?.seconds || 0;

        const bTime =
          b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setDocuments(documentList);
    } catch (err: any) {
      console.error(
        "Medical loading error:",
        err
      );

      setError(
        "Failed to load medical information."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // SAVE MEDICAL INFORMATION
  // =========================================

  const handleSaveMedical = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const user = auth.currentUser;

      if (!user) {
        setError("Please login again.");
        return;
      }

      const medicalPayload = {
        userId: user.uid,
        bloodGroup,
        weight,
        height,
        bloodPressure,
        pulse,
        oxygen,
        note: medicalNote,
        updatedAt: serverTimestamp(),
      };

      if (medicalData?.id) {
        const medicalRef = doc(
          db,
          "medicalInfo",
          medicalData.id
        );

        const { setDoc } = await import(
          "firebase/firestore"
        );

        await setDoc(
          medicalRef,
          medicalPayload,
          { merge: true }
        );
      } else {
        const newMedical = await addDoc(
          collection(db, "medicalInfo"),
          {
            ...medicalPayload,
            createdAt: serverTimestamp(),
          }
        );

        setMedicalData({
          ...medicalPayload,
          id: newMedical.id,
        });
      }

      setSuccess(
        "Medical information saved successfully."
      );
    } catch (err: any) {
      console.error(
        "Save medical error:",
        err
      );

      setError(
        "Failed to save medical information."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================
  // FILE SELECT
  // =========================================

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      e.target.files || []
    );

    if (!files.length) return;

    setError("");

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    const invalidFile = files.find(
      (file) =>
        !allowedTypes.includes(file.type)
    );

    if (invalidFile) {
      setError(
        `${invalidFile.name} is not a supported file. Only PDF, JPG, JPEG, PNG and WEBP are allowed.`
      );

      return;
    }

    const maxSize = 10 * 1024 * 1024;

    const largeFile = files.find(
      (file) => file.size > maxSize
    );

    if (largeFile) {
      setError(
        `${largeFile.name} is larger than 10MB.`
      );

      return;
    }

    setSelectedFiles(files);
  };

  // =========================================
  // UPLOAD DOCUMENTS
  // =========================================

  const handleUploadDocuments = async () => {
    try {
      setError("");
      setSuccess("");

      const user = auth.currentUser;

      if (!user) {
        setError("Please login again.");
        return;
      }

      if (!selectedFiles.length) {
        setError(
          "Please select at least one document."
        );

        return;
      }

      if (!CLOUDINARY_CLOUD_NAME) {
        setError(
          "Cloudinary cloud name is missing."
        );

        return;
      }

      if (!CLOUDINARY_UPLOAD_PRESET) {
        setError(
          "Cloudinary upload preset is missing."
        );

        return;
      }

      setUploading(true);

      // Upload multiple files one by one
      for (const file of selectedFiles) {
        const formData = new FormData();

        formData.append("file", file);

        formData.append(
          "upload_preset",
          CLOUDINARY_UPLOAD_PRESET
        );

        // Auto resource type
        const resourceType =
          file.type === "application/pdf"
            ? "raw"
            : "image";

        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

        const response = await fetch(
          uploadUrl,
          {
            method: "POST",
            body: formData,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error(
            "Cloudinary error:",
            result
          );

          throw new Error(
            result?.error?.message ||
              "Cloudinary upload failed."
          );
        }

        // -----------------------------------------
        // SAVE FIRESTORE DOCUMENT
        // -----------------------------------------

        await addDoc(
          collection(db, "medicalDocuments"),
          {
            userId: user.uid,
            fileName: file.name,
            fileUrl: result.secure_url,
            fileType: file.type,
            category,
            doctorName,
            date: documentDate,
            note: documentNote,
            publicId: result.public_id,
            resourceType,
            createdAt: serverTimestamp(),
          }
        );
      }

      setSuccess(
        `${selectedFiles.length} document${
          selectedFiles.length > 1
            ? "s"
            : ""
        } uploaded successfully.`
      );

      setSelectedFiles([]);
      setDoctorName("");
      setDocumentDate("");
      setDocumentNote("");
      setCategory("Prescription");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setShowUploadModal(false);

      await loadMedicalData();
    } catch (err: any) {
      console.error(
        "Document upload error:",
        err
      );

      setError(
        err?.message ||
          "Failed to upload medical document."
      );
    } finally {
      setUploading(false);
    }
  };

  // =========================================
  // DELETE DOCUMENT
  // =========================================

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    try {
      setError("");

      await deleteDoc(
        doc(
          db,
          "medicalDocuments",
          selectedDocument.id
        )
      );

      setDocuments((prev) =>
        prev.filter(
          (item) =>
            item.id !== selectedDocument.id
        )
      );

      setShowDeleteModal(false);
      setSelectedDocument(null);

      setSuccess(
        "Medical document deleted successfully."
      );
    } catch (err: any) {
      console.error(
        "Delete document error:",
        err
      );

      setError(
        "Failed to delete medical document."
      );
    }
  };

  // =========================================
  // VIEW DOCUMENT
  // =========================================

  const handleViewDocument = (
    document: MedicalDocument
  ) => {
    window.open(
      document.fileUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================
  // DOWNLOAD DOCUMENT
  // =========================================

  const handleDownloadDocument = async (
    document: MedicalDocument
  ) => {
    try {
      const response = await fetch(
        document.fileUrl
      );

      const blob = await response.blob();

      const blobUrl =
        window.URL.createObjectURL(blob);

      const link =
        window.document.createElement("a");

      link.href = blobUrl;
      link.download = document.fileName;

      window.document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(
        "Download error:",
        err
      );

      // Fallback
      window.open(
        document.fileUrl,
        "_blank"
      );
    }
  };

  // =========================================
  // OPEN UPLOAD MODAL
  // =========================================

  const openUploadModal = () => {
    setError("");
    setShowUploadModal(true);
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          minHeight: "70vh",
        }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  // =========================================
  // UI
  // =========================================

  return (
    <>
      <Container
        fluid
        className="py-4 px-3 px-md-4"
        style={{
          maxWidth: "1200px",
        }}
      >
        {/* =====================================
            HEADER
        ====================================== */}

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center">
            <Button
              variant="light"
              className="rounded-circle me-3 shadow-sm"
              style={{
                width: "42px",
                height: "42px",
              }}
              onClick={() =>
                navigate("/user/dashboard")
              }
            >
              <FaArrowLeft />
            </Button>

            <div>
              <h3 className="fw-bold mb-1">
                Medical
              </h3>

              <p className="text-muted mb-0">
                Manage medical information and
                documents
              </p>
            </div>
          </div>
        </div>

        {/* =====================================
            ALERTS
        ====================================== */}

        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setError("")}
            className="rounded-3"
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSuccess("")}
            className="rounded-3"
          >
            {success}
          </Alert>
        )}

        {/* =====================================
            MEDICAL INFORMATION
        ====================================== */}

        <Card
          className="border-0 shadow-sm mb-4"
          style={{
            borderRadius: "18px",
          }}
        >
          <Card.Body className="p-4 p-md-5">
            <div className="d-flex align-items-center mb-4">
              <div
                className="d-flex align-items-center justify-content-center me-3"
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "14px",
                  background: "#f1f3f5",
                  fontSize: "22px",
                }}
              >
                <FaHeartbeat />
              </div>

              <div>
                <h5 className="fw-bold mb-1">
                  Medical Information
                </h5>

                <p className="text-muted small mb-0">
                  Keep your latest health information
                  updated
                </p>
              </div>
            </div>

            <Row className="g-3">
              {/* Blood Group */}

              <Col
                xs={12}
                sm={6}
                md={4}
              >
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    <FaTint className="me-2" />
                    Blood Group
                  </Form.Label>

                  <Form.Select
                    value={bloodGroup}
                    onChange={(e) =>
                      setBloodGroup(
                        e.target.value
                      )
                    }
                    className="py-2 rounded-3"
                  >
                    <option value="">
                      Select Blood Group
                    </option>

                    <option value="A+">
                      A+
                    </option>

                    <option value="A-">
                      A-
                    </option>

                    <option value="B+">
                      B+
                    </option>

                    <option value="B-">
                      B-
                    </option>

                    <option value="AB+">
                      AB+
                    </option>

                    <option value="AB-">
                      AB-
                    </option>

                    <option value="O+">
                      O+
                    </option>

                    <option value="O-">
                      O-
                    </option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* Weight */}

              <Col
                xs={12}
                sm={6}
                md={4}
              >
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    <FaWeight className="me-2" />
                    Weight
                  </Form.Label>

                  <Form.Control
                    type="text"
                    placeholder="e.g. 12 kg"
                    value={weight}
                    onChange={(e) =>
                      setWeight(e.target.value)
                    }
                    className="py-2 rounded-3"
                  />
                </Form.Group>
              </Col>

              {/* Height */}

              <Col
                xs={12}
                sm={6}
                md={4}
              >
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    <FaRulerVertical className="me-2" />
                    Height
                  </Form.Label>

                  <Form.Control
                    type="text"
                    placeholder="e.g. 85 cm"
                    value={height}
                    onChange={(e) =>
                      setHeight(e.target.value)
                    }
                    className="py-2 rounded-3"
                  />
                </Form.Group>
              </Col>

              {/* Blood Pressure */}

              <Col
                xs={12}
                sm={6}
                md={4}
              >
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    <FaHeartbeat className="me-2" />
                    Blood Pressure
                  </Form.Label>

                  <Form.Control
                    type="text"
                    placeholder="e.g. 120/80"
                    value={bloodPressure}
                    onChange={(e) =>
                      setBloodPressure(
                        e.target.value
                      )
                    }
                    className="py-2 rounded-3"
                  />
                </Form.Group>
              </Col>

              {/* Pulse */}

              <Col
                xs={12}
                sm={6}
                md={4}
              >
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    <FaHeartbeat className="me-2" />
                    Pulse
                  </Form.Label>

                  <Form.Control
                    type="text"
                    placeholder="e.g. 72 bpm"
                    value={pulse}
                    onChange={(e) =>
                      setPulse(e.target.value)
                    }
                    className="py-2 rounded-3"
                  />
                </Form.Group>
              </Col>

              {/* Oxygen */}

              <Col
                xs={12}
                sm={6}
                md={4}
              >
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    <FaLungs className="me-2" />
                    Oxygen / SpO₂
                  </Form.Label>

                  <Form.Control
                    type="text"
                    placeholder="e.g. 98%"
                    value={oxygen}
                    onChange={(e) =>
                      setOxygen(e.target.value)
                    }
                    className="py-2 rounded-3"
                  />
                </Form.Group>
              </Col>

              {/* Note */}

              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    <FaNotesMedical className="me-2" />
                    Medical Note
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Write any important medical notes..."
                    value={medicalNote}
                    onChange={(e) =>
                      setMedicalNote(
                        e.target.value
                      )
                    }
                    className="rounded-3"
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="text-end mt-4">
              <Button
                variant="dark"
                className="px-4 py-2 rounded-3 fw-semibold"
                onClick={handleSaveMedical}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Spinner
                      animation="border"
                      size="sm"
                      className="me-2"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaStethoscope className="me-2" />
                    Save Medical Information
                  </>
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* =====================================
            MEDICAL DOCUMENTS
        ====================================== */}

        <Card
          className="border-0 shadow-sm"
          style={{
            borderRadius: "18px",
          }}
        >
          <Card.Body className="p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "14px",
                    background: "#f1f3f5",
                    fontSize: "22px",
                  }}
                >
                  <FaFileMedical />
                </div>

                <div>
                  <h5 className="fw-bold mb-1">
                    Medical Documents
                  </h5>

                  <p className="text-muted small mb-0">
                    Prescriptions, reports and medical
                    documents
                  </p>
                </div>
              </div>

              <Button
                variant="dark"
                className="rounded-3 fw-semibold"
                onClick={openUploadModal}
              >
                <FaPlus className="me-2" />
                Add Documents
              </Button>
            </div>

            {/* Empty */}

            {documents.length === 0 ? (
              <div
                className="text-center py-5"
                style={{
                  border: "2px dashed #dee2e6",
                  borderRadius: "16px",
                }}
              >
                <FaFileMedical
                  size={45}
                  className="text-muted mb-3"
                />

                <h6 className="fw-bold">
                  No medical documents
                </h6>

                <p className="text-muted small mb-3">
                  Upload prescriptions, test reports
                  or other medical documents.
                </p>

                <Button
                  variant="outline-dark"
                  className="rounded-3"
                  onClick={openUploadModal}
                >
                  <FaUpload className="me-2" />
                  Upload Document
                </Button>
              </div>
            ) : (
             <Row className="g-3">
  {documents.map((document) => {
    const isPdf =
      document.fileType === "application/pdf" ||
      document.fileName.toLowerCase().endsWith(".pdf");

    return (
      <Col
        xs={12}
        sm={6}
        lg={4}
        key={document.id}
      >
        <Card
          className="h-100 border-0 shadow-sm overflow-hidden"
          style={{
            borderRadius: "16px",
          }}
        >

          {/* FILE PREVIEW */}
          <div
            style={{
              height: "180px",
              background: "#f8f9fa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {isPdf ? (
              <div className="text-center">
                <FaFilePdf
                  size={65}
                  className="text-danger mb-2"
                />

                <div className="fw-bold text-danger">
                  PDF DOCUMENT
                </div>
              </div>
            ) : (
              <img
                src={document.fileUrl}
                alt={document.fileName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>

          <Card.Body className="p-3">

            {/* FILE NAME */}
            <h6
              className="fw-bold mb-2 text-truncate"
              title={document.fileName}
            >
              {document.fileName}
            </h6>

            {/* CATEGORY */}
            <div className="mb-3">
              <Badge bg="secondary">
                {document.category || "Other"}
              </Badge>
            </div>

            {/* DOCTOR */}
            {document.doctorName && (
              <div className="small text-muted mb-2">
                <FaUserMd className="me-2" />
                {document.doctorName}
              </div>
            )}

            {/* DATE */}
            {document.date && (
              <div className="small text-muted mb-2">
                <FaCalendarAlt className="me-2" />
                {document.date}
              </div>
            )}

            {/* NOTE */}
            {document.note && (
              <div
                className="small text-muted mb-3"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {document.note}
              </div>
            )}

            {/* ACTIONS */}
            <div className="d-flex gap-2 mt-3">

              <Button
                variant="outline-primary"
                className="flex-fill rounded-3"
                onClick={() =>
                  handleViewDocument(document)
                }
              >
                <FaEye className="me-1" />
                View
              </Button>

              <Button
                variant="outline-success"
                className="flex-fill rounded-3"
                onClick={() =>
                  handleDownloadDocument(document)
                }
              >
                <FaDownload className="me-1" />
                Download
              </Button>

              <Button
                variant="outline-danger"
                className="rounded-3"
                onClick={() => {
                  setSelectedDocument(document);
                  setShowDeleteModal(true);
                }}
              >
                <FaTrash />
              </Button>

            </div>

          </Card.Body>
        </Card>
      </Col>
    );
  })}
</Row>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* =========================================
          UPLOAD MODAL
      ========================================== */}

      <Modal
        show={showUploadModal}
        onHide={() =>
          !uploading &&
          setShowUploadModal(false)
        }
        centered
        size="lg"
      >
        <Modal.Header closeButton={!uploading}>
          <Modal.Title className="fw-bold">
            <FaUpload className="me-2" />
            Upload Medical Documents
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          <Row className="g-3">
            {/* Category */}

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Document Type
                </Form.Label>

                <Form.Select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value)
                  }
                  className="rounded-3 py-2"
                >
                  <option value="Prescription">
                    Prescription
                  </option>

                  <option value="Blood Test">
                    Blood Test
                  </option>

                  <option value="X-Ray">
                    X-Ray
                  </option>

                  <option value="Ultrasound">
                    Ultrasound
                  </option>

                  <option value="Medical Report">
                    Medical Report
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Doctor */}

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  <FaUserMd className="me-2" />
                  Doctor Name
                </Form.Label>

                <Form.Control
                  type="text"
                  placeholder="Enter doctor name"
                  value={doctorName}
                  onChange={(e) =>
                    setDoctorName(
                      e.target.value
                    )
                  }
                  className="rounded-3 py-2"
                />
              </Form.Group>
            </Col>

            {/* Date */}

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  <FaCalendarAlt className="me-2" />
                  Document Date
                </Form.Label>

                <Form.Control
                  type="date"
                  value={documentDate}
                  onChange={(e) =>
                    setDocumentDate(
                      e.target.value
                    )
                  }
                  className="rounded-3 py-2"
                />
              </Form.Group>
            </Col>

            {/* Note */}

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Note
                </Form.Label>

                <Form.Control
                  type="text"
                  placeholder="Short note"
                  value={documentNote}
                  onChange={(e) =>
                    setDocumentNote(
                      e.target.value
                    )
                  }
                  className="rounded-3 py-2"
                />
              </Form.Group>
            </Col>

            {/* File */}

            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Select Documents
                </Form.Label>

                <Form.Control
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  className="rounded-3 py-2"
                />

                <Form.Text className="text-muted">
                  You can select multiple PDF or image
                  files. Maximum 10MB per file.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Selected Files */}

            {selectedFiles.length > 0 && (
              <Col xs={12}>
                <div
                  className="p-3"
                  style={{
                    background: "#f8f9fa",
                    borderRadius: "12px",
                  }}
                >
                  <div className="fw-semibold mb-2">
                    Selected Files (
                    {selectedFiles.length})
                  </div>

                  {selectedFiles.map(
                    (file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="d-flex align-items-center justify-content-between py-2 border-bottom"
                      >
                        <div className="text-truncate me-2">
                          {file.type ===
                          "application/pdf" ? (
                            <FaFilePdf className="me-2" />
                          ) : (
                            <FaImage className="me-2" />
                          )}

                          {file.name}
                        </div>

                        <Button
                          variant="link"
                          className="text-danger p-0"
                          onClick={() =>
                            setSelectedFiles(
                              (prev) =>
                                prev.filter(
                                  (_, i) =>
                                    i !== index
                                )
                            )
                          }
                        >
                          <FaTimes />
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </Col>
            )}
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="light"
            className="rounded-3"
            onClick={() =>
              setShowUploadModal(false)
            }
            disabled={uploading}
          >
            Cancel
          </Button>

          <Button
            variant="dark"
            className="rounded-3 fw-semibold"
            onClick={handleUploadDocuments}
            disabled={
              uploading ||
              selectedFiles.length === 0
            }
          >
            {uploading ? (
              <>
                <Spinner
                  animation="border"
                  size="sm"
                  className="me-2"
                />
                Uploading...
              </>
            ) : (
              <>
                <FaUpload className="me-2" />
                Upload Documents
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* =========================================
          DELETE MODAL
      ========================================== */}

      <Modal
        show={showDeleteModal}
        onHide={() =>
          setShowDeleteModal(false)
        }
        centered
      >
        <Modal.Body className="text-center p-5">
          <div
            className="mx-auto d-flex align-items-center justify-content-center mb-4"
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              background: "#f8d7da",
              fontSize: "28px",
            }}
          >
            <FaTrash />
          </div>

          <h4 className="fw-bold mb-2">
            Delete Document?
          </h4>

          <p className="text-muted mb-4">
            Are you sure you want to delete this
            medical document?
          </p>

          <div className="d-flex gap-2 justify-content-center">
            <Button
              variant="light"
              className="px-4 rounded-pill"
              onClick={() =>
                setShowDeleteModal(false)
              }
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              className="px-4 rounded-pill fw-semibold"
              onClick={handleDeleteDocument}
            >
              <FaTrash className="me-2" />
              Delete
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Medical;