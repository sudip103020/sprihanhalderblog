import { useEffect, useState, type ChangeEvent } from "react";

import {
  Container,
  Card,
  Table,
  Button,
  Badge,
  Spinner,
  Alert,
  Modal,
  Form,
  Row,
  Col,
  Image,
} from "react-bootstrap";

import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaUsers,
  FaHome,
  FaEye,
  FaEyeSlash,
  FaUpload,
  FaSearch,
  FaTimes,
} from "react-icons/fa";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";

import { useNavigate } from "react-router-dom";

// =====================================================
// Interface
// =====================================================

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  photoURL: string;
  description: string;
  showOnHome: boolean;
  order: number;
}

// =====================================================
// Component
// =====================================================

const FamilyMembers = () => {
  const navigate = useNavigate();

  // ===================================================
  // States
  // ===================================================

  const [members, setMembers] = useState<FamilyMember[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  // ===================================================
  // Modal
  // ===================================================

  const [showModal, setShowModal] = useState(false);

  const [editingMember, setEditingMember] =
    useState<FamilyMember | null>(null);

  // ===================================================
  // Form States
  // ===================================================

  const [name, setName] = useState("");

  const [relation, setRelation] = useState("");

  const [photoURL, setPhotoURL] = useState("");

  const [description, setDescription] = useState("");

  const [showOnHome, setShowOnHome] = useState(true);

  const [displayOrder, setDisplayOrder] = useState(1);

  // ===================================================
  // Cloudinary Config
  // ===================================================

  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // ===================================================
  // Load Members
  // ===================================================

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError("");

      const membersQuery = query(
        collection(db, "familyMembers"),
        orderBy("order", "asc")
      );

      const snapshot = await getDocs(membersQuery);

      const data: FamilyMember[] = snapshot.docs.map((item) => {
        const raw = item.data();

        return {
          id: item.id,
          name: raw.name || "",
          relation: raw.relation || "",
          photoURL: raw.photoURL || "",
          description: raw.description || "",
          showOnHome: raw.showOnHome ?? true,
          order: Number(raw.order) || 1,
        };
      });

      setMembers(data);
    } catch (error) {
      console.error(
        "Load family members error:",
        error
      );

      setError(
        "Family Members load করতে সমস্যা হয়েছে। Firestore rules/index check করুন।"
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // Initial Load
  // ===================================================

  useEffect(() => {
    loadMembers();
  }, []);

  // ===================================================
  // Reset Form
  // ===================================================

  const resetForm = () => {
    setName("");
    setRelation("");
    setPhotoURL("");
    setDescription("");
    setShowOnHome(true);
    setDisplayOrder(members.length + 1);
    setEditingMember(null);
  };

  // ===================================================
  // Open Add Modal
  // ===================================================

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  // ===================================================
  // Open Edit Modal
  // ===================================================

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);

    setName(member.name);

    setRelation(member.relation);

    setPhotoURL(member.photoURL);

    setDescription(member.description);

    setShowOnHome(member.showOnHome);

    setDisplayOrder(member.order);

    setShowModal(true);
  };

  // ===================================================
  // Close Modal
  // ===================================================

  const handleCloseModal = () => {
    if (saving || uploading) return;

    setShowModal(false);

    resetForm();
  };

  // ===================================================
  // Upload Photo to Cloudinary
  // ===================================================

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;

    // -------------------------------------------------
    // File Size Validation
    // -------------------------------------------------

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Photo size maximum 5MB হতে পারবে।"
      );

      return;
    }

    // -------------------------------------------------
    // File Type Validation
    // -------------------------------------------------

    if (!file.type.startsWith("image/")) {
      setError(
        "শুধু image file upload করা যাবে।"
      );

      return;
    }

    // -------------------------------------------------
    // Cloudinary Config Validation
    // -------------------------------------------------

    if (!cloudName || !uploadPreset) {
      setError(
        "Cloudinary configuration পাওয়া যায়নি। .env file check করুন।"
      );

      console.error(
        "Cloudinary configuration missing:",
        {
          cloudName: !!cloudName,
          uploadPreset: !!uploadPreset,
        }
      );

      return;
    }

    try {
      setUploading(true);

      setError("");

      setSuccess("");

      // -------------------------------------------------
      // Form Data
      // -------------------------------------------------

      const formData = new FormData();

      formData.append("file", file);

      formData.append(
        "upload_preset",
        uploadPreset
      );

      // -------------------------------------------------
      // Cloudinary Upload
      // -------------------------------------------------

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      // -------------------------------------------------
      // Read Response
      // -------------------------------------------------

      const data = await response.json();

      // -------------------------------------------------
      // Error Handling
      // -------------------------------------------------

      if (!response.ok) {
        console.error(
          "Cloudinary error response:",
          data
        );

        throw new Error(
          data?.error?.message ||
            "Cloudinary upload failed."
        );
      }

      // -------------------------------------------------
      // Save URL
      // -------------------------------------------------

      if (!data.secure_url) {
        throw new Error(
          "Cloudinary থেকে image URL পাওয়া যায়নি।"
        );
      }

      setPhotoURL(data.secure_url);

      setSuccess(
        "Photo successfully uploaded."
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error(
        "Photo upload error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Photo upload করতে সমস্যা হয়েছে।"
      );
    } finally {
      setUploading(false);
    }
  };

  // ===================================================
  // Save Member
  // ===================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    setSuccess("");

    // -------------------------------------------------
    // Validation
    // -------------------------------------------------

    if (!name.trim()) {
      setError("Member name দিন.");
      return;
    }

    if (!relation.trim()) {
      setError("Relation নির্বাচন করুন।");
      return;
    }

    if (!displayOrder || displayOrder < 1) {
      setError(
        "Display order সঠিকভাবে দিন।"
      );
      return;
    }

    try {
      setSaving(true);

      // -------------------------------------------------
      // Member Data
      // -------------------------------------------------

      const memberData = {
        name: name.trim(),

        relation: relation.trim(),

        photoURL: photoURL.trim(),

        description: description.trim(),

        showOnHome,

        order: Number(displayOrder),
      };

      // -------------------------------------------------
      // Update Existing Member
      // -------------------------------------------------

      if (editingMember) {
        await updateDoc(
          doc(
            db,
            "familyMembers",
            editingMember.id
          ),
          {
            ...memberData,

            updatedAt: serverTimestamp(),
          }
        );

        setSuccess(
          "Family member updated successfully."
        );
      }

      // -------------------------------------------------
      // Add New Member
      // -------------------------------------------------

      else {
        await addDoc(
          collection(db, "familyMembers"),
          {
            ...memberData,

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp(),
          }
        );

        setSuccess(
          "Family member added successfully."
        );
      }

      // -------------------------------------------------
      // Close Modal
      // -------------------------------------------------

      setShowModal(false);

      resetForm();

      // -------------------------------------------------
      // Reload Members
      // -------------------------------------------------

      await loadMembers();
    } catch (error) {
      console.error(
        "Save family member error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Family member save করতে সমস্যা হয়েছে।"
      );
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // Delete Member
  // ===================================================

  const handleDelete = async (
    member: FamilyMember
  ) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${member.name}"?`
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(member.id);

      setError("");

      await deleteDoc(
        doc(
          db,
          "familyMembers",
          member.id
        )
      );

      setMembers((prev) =>
        prev.filter(
          (item) => item.id !== member.id
        )
      );

      setSuccess(
        "Family member deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete family member error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Family member delete করতে সমস্যা হয়েছে।"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ===================================================
  // Search
  // ===================================================

  const filteredMembers = members.filter(
    (member) => {
      const searchText =
        search.toLowerCase().trim();

      if (!searchText) return true;

      return (
        member.name
          .toLowerCase()
          .includes(searchText) ||
        member.relation
          .toLowerCase()
          .includes(searchText)
      );
    }
  );

  // ===================================================
  // Render
  // ===================================================

  return (
    <div className="min-vh-100 bg-light py-4">
      <Container>

        {/* =================================================
            Header
        ================================================= */}

        <div className="d-flex justify-content-between align-items-center mb-4">

          <div>
            <h4 className="fw-bold mb-1">
              Family Members
            </h4>

            <p className="text-muted mb-0">
              Manage Sprihan's family information
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
              onClick={handleAdd}
            >
              <FaPlus className="me-2" />
              Add Member
            </Button>

          </div>
        </div>

        {/* =================================================
            Error
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

        {/* =================================================
            Success
        ================================================= */}

        {success && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}

        {/* =================================================
            Search
        ================================================= */}

        <Card className="border-0 shadow-sm mb-4">

          <Card.Body>

            <Row className="align-items-center">

              <Col md={6} lg={5}>

                <Form.Label className="fw-semibold">
                  <FaSearch className="me-2" />
                  Search Member
                </Form.Label>

                <div className="position-relative">

                  <Form.Control
                    type="text"
                    placeholder="Search by name or relation..."
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    className={
                      search ? "pe-5" : ""
                    }
                  />

                  {search && (
                    <Button
                      type="button"
                      variant="link"
                      className="position-absolute top-50 end-0 translate-middle-y text-muted p-2"
                      onClick={() =>
                        setSearch("")
                      }
                    >
                      <FaTimes />
                    </Button>
                  )}

                </div>

              </Col>

              <Col
                md={6}
                lg={7}
                className="mt-3 mt-md-0 text-md-end"
              >

                <div className="text-muted">

                  <FaUsers className="me-2" />

                  Total Members:{" "}
                  <strong>
                    {members.length}
                  </strong>

                  {" | "}

                  <FaHome className="me-2" />

                  Home:{" "}

                  <strong>
                    {
                      members.filter(
                        (item) =>
                          item.showOnHome
                      ).length
                    }
                  </strong>

                </div>

              </Col>

            </Row>

          </Card.Body>

        </Card>

        {/* =================================================
            Members Table
        ================================================= */}

        <Card className="border-0 shadow-sm">

          <Card.Body className="p-0">

            {loading ? (

              <div className="text-center py-5">

                <Spinner animation="border" />

                <p className="text-muted mt-3 mb-0">
                  Loading family members...
                </p>

              </div>

            ) : filteredMembers.length === 0 ? (

              <div className="text-center py-5 px-3">

                <FaUsers className="fs-1 text-muted mb-3" />

                <h5 className="fw-bold">
                  No Family Members Found
                </h5>

                <p className="text-muted">
                  এখনো কোনো family member যোগ করা হয়নি।
                </p>

                <Button
                  variant="dark"
                  onClick={handleAdd}
                >
                  <FaPlus className="me-2" />
                  Add Family Member
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
                        Photo
                      </th>

                      <th>
                        Name
                      </th>

                      <th>
                        Relation
                      </th>

                      <th>
                        Description
                      </th>

                      <th>
                        Home
                      </th>

                      <th>
                        Order
                      </th>

                      <th className="text-end px-4">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredMembers.map(
                      (member) => (

                        <tr key={member.id}>

                          {/* Photo */}

                          <td className="px-4">

                            {member.photoURL ? (

                              <Image
                                src={member.photoURL}
                                roundedCircle
                                width={55}
                                height={55}
                                style={{
                                  objectFit:
                                    "cover",
                                }}
                                alt={
                                  member.name
                                }
                              />

                            ) : (

                              <div
                                className="rounded-circle bg-light border d-flex align-items-center justify-content-center"
                                style={{
                                  width: "55px",
                                  height: "55px",
                                }}
                              >
                                <FaUsers className="text-muted" />
                              </div>

                            )}

                          </td>

                          {/* Name */}

                          <td>

                            <div className="fw-semibold">
                              {member.name}
                            </div>

                          </td>

                          {/* Relation */}

                          <td>

                            <Badge bg="secondary">
                              {member.relation}
                            </Badge>

                          </td>

                          {/* Description */}

                          <td
                            style={{
                              maxWidth: "300px",
                            }}
                          >

                            <div className="text-truncate">
                              {member.description ||
                                "-"}
                            </div>

                          </td>

                          {/* Home */}

                          <td>

                            {member.showOnHome ? (

                              <Badge bg="success">
                                <FaEye className="me-1" />
                                Show
                              </Badge>

                            ) : (

                              <Badge bg="dark">
                                <FaEyeSlash className="me-1" />
                                Hidden
                              </Badge>

                            )}

                          </td>

                          {/* Order */}

                          <td>

                            <Badge
                              bg="light"
                              text="dark"
                            >
                              #{member.order}
                            </Badge>

                          </td>

                          {/* Actions */}

                          <td className="text-end px-4">

                            <div className="d-flex justify-content-end gap-2">

                              <Button
                                variant="outline-warning"
                                size="sm"
                                title="Edit"
                                onClick={() =>
                                  handleEdit(
                                    member
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
                                  deletingId ===
                                  member.id
                                }
                                onClick={() =>
                                  handleDelete(
                                    member
                                  )
                                }
                              >

                                {deletingId ===
                                member.id ? (

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

                      )
                    )}

                  </tbody>

                </Table>

              </div>

            )}

          </Card.Body>

        </Card>

      </Container>

      {/* =================================================
          Add / Edit Modal
      ================================================= */}

      <Modal
        show={showModal}
        onHide={handleCloseModal}
        centered
        size="lg"
      >

        <Form onSubmit={handleSubmit}>

          <Modal.Header closeButton>

            <Modal.Title className="fw-bold">

              {editingMember
                ? "Edit Family Member"
                : "Add Family Member"}

            </Modal.Title>

          </Modal.Header>

          <Modal.Body>

            <Row className="g-4">

              {/* =================================================
                  Photo
              ================================================= */}

              <Col
                md={4}
                className="text-center"
              >

                <Form.Label className="fw-semibold d-block">
                  Profile Photo
                </Form.Label>

                <div
                  className="border rounded-3 bg-light d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{
                    width: "180px",
                    height: "180px",
                    overflow: "hidden",
                  }}
                >

                  {photoURL ? (

                    <Image
                      src={photoURL}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      alt="Preview"
                    />

                  ) : (

                    <div className="text-muted">

                      <FaUsers className="fs-1 mb-2" />

                      <div>
                        No Photo
                      </div>

                    </div>

                  )}

                </div>

                {/* Choose Photo */}

                <Form.Label
                  htmlFor="family-photo"
                  className="btn btn-outline-primary"
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

                      Choose Photo
                    </>

                  )}

                </Form.Label>

                <Form.Control
                  id="family-photo"
                  type="file"
                  accept="image/*"
                  className="d-none"
                  disabled={
                    uploading ||
                    saving
                  }
                  onChange={(
                    e: ChangeEvent<HTMLInputElement>
                  ) => {

                    const file =
                      e.target.files?.[0];

                    if (file) {
                      handlePhotoUpload(
                        file
                      );
                    }

                    e.target.value = "";

                  }}
                />

                {/* Remove Photo */}

                {photoURL && (

                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="mt-2"
                    type="button"
                    onClick={() =>
                      setPhotoURL("")
                    }
                    disabled={
                      uploading ||
                      saving
                    }
                  >
                    <FaTrash className="me-1" />
                    Remove Photo
                  </Button>

                )}

                <div className="small text-muted mt-2">
                  Maximum 5MB
                </div>

              </Col>

              {/* =================================================
                  Information
              ================================================= */}

              <Col md={8}>

                {/* Name */}

                <Form.Group className="mb-3">

                  <Form.Label className="fw-semibold">

                    Name{" "}

                    <span className="text-danger">
                      *
                    </span>

                  </Form.Label>

                  <Form.Control
                    type="text"
                    placeholder="Enter member name"
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target.value
                      )
                    }
                    required
                  />

                </Form.Group>

                {/* Relation */}

                <Form.Group className="mb-3">

                  <Form.Label className="fw-semibold">

                    Relation{" "}

                    <span className="text-danger">
                      *
                    </span>

                  </Form.Label>

                  <Form.Select
                    value={relation}
                    onChange={(e) =>
                      setRelation(
                        e.target.value
                      )
                    }
                    required
                  >

                    <option value="">
                      Select Relation
                    </option>

                    <option value="Father">
                      Father
                    </option>

                    <option value="Mother">
                      Mother
                    </option>

                    <option value="Brother">
                      Brother
                    </option>

                    <option value="Sister">
                      Sister
                    </option>

                    <option value="Maternal Grandfather">
                      Maternal Grandfather
                    </option>

                    <option value="Maternal Grandmother">
                      Maternal Grandmother
                    </option>

                    <option value="Paternal Grandfather">
                      Paternal Grandfather
                    </option>

                    <option value="Paternal Grandmother">
                      Paternal Grandmother
                    </option>

                    <option value="Maternal Uncle">
                      Maternal Uncle
                    </option>

                    <option value="Maternal Aunt">
                      Maternal Aunt
                    </option>

                    <option value="Paternal Uncle">
                      Paternal Uncle
                    </option>

                    <option value="Paternal Aunt">
                      Paternal Aunt
                    </option>

                    <option value="Cousin">
                      Cousin
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </Form.Select>

                </Form.Group>

                {/* Description */}

                <Form.Group className="mb-3">

                  <Form.Label className="fw-semibold">
                    Description
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Write something about this family member..."
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                  />

                </Form.Group>

                <Row>

                  {/* Display Order */}

                  <Col md={6}>

                    <Form.Group className="mb-3">

                      <Form.Label className="fw-semibold">
                        Display Order
                      </Form.Label>

                      <Form.Control
                        type="number"
                        min={1}
                        value={displayOrder}
                        onChange={(e) =>
                          setDisplayOrder(
                            Number(
                              e.target.value
                            )
                          )
                        }
                      />

                      <Form.Text className="text-muted">
                        ছোট number আগে দেখাবে।
                      </Form.Text>

                    </Form.Group>

                  </Col>

                  {/* Show Home */}

                  <Col md={6}>

                    <Form.Group className="mb-3">

                      <Form.Label className="fw-semibold d-block">
                        Home Page
                      </Form.Label>

                      <Form.Check
                        type="switch"
                        id="family-show-on-home"
                        label={
                          showOnHome
                            ? "Show on Home"
                            : "Hidden from Home"
                        }
                        checked={
                          showOnHome
                        }
                        onChange={(e) =>
                          setShowOnHome(
                            e.target.checked
                          )
                        }
                      />

                    </Form.Group>

                  </Col>

                </Row>

              </Col>

            </Row>

          </Modal.Body>

          <Modal.Footer>

            <Button
              variant="secondary"
              type="button"
              onClick={
                handleCloseModal
              }
              disabled={
                saving ||
                uploading
              }
            >
              Cancel
            </Button>

            <Button
              variant="dark"
              type="submit"
              disabled={
                saving ||
                uploading
              }
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
                  {editingMember
                    ? "Update Member"
                    : "Add Member"}
                </>

              )}

            </Button>

          </Modal.Footer>

        </Form>

      </Modal>

    </div>
  );
};

export default FamilyMembers;