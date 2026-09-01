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
  FaGift,
  FaSearch,
  FaTimes,
  FaUpload,
  FaEye,
  FaEyeSlash,
  FaMoneyBillWave,
  FaBoxOpen,
} from "react-icons/fa";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";

import { useNavigate } from "react-router-dom";

// =====================================================
// Interface
// =====================================================

interface GiftRecord {
  id: string;
  date: string;
  event: string;
  giverName: string;
  giverPhoto: string;
  giftType: "Money" | "Item";
  amount: number;
  giftItem: string;
  comment: string;
  showOnHome: boolean;
  order: number;
}

// =====================================================
// Component
// =====================================================

const GiftCorner = () => {
  const navigate = useNavigate();

  // ===================================================
  // States
  // ===================================================

  const [gifts, setGifts] = useState<GiftRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  // ===================================================
  // Modal
  // ===================================================

  const [showModal, setShowModal] = useState(false);

  const [editingGift, setEditingGift] =
    useState<GiftRecord | null>(null);

  // ===================================================
  // Form States
  // ===================================================

  const [date, setDate] = useState("");

  const [event, setEvent] = useState("");

  const [giverName, setGiverName] = useState("");

  const [giverPhoto, setGiverPhoto] = useState("");

  const [giftType, setGiftType] =
    useState<"Money" | "Item">("Money");

  const [amount, setAmount] = useState<number>(0);

  const [giftItem, setGiftItem] = useState("");

  const [comment, setComment] = useState("");

  // IMPORTANT:
  // Default is FALSE
  const [showOnHome, setShowOnHome] = useState(false);

  const [displayOrder, setDisplayOrder] = useState(1);

  // ===================================================
  // Cloudinary
  // ===================================================

  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // ===================================================
  // Load Gifts
  // ===================================================

  const loadGifts = async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * IMPORTANT:
       *
       * এখানে orderBy() ব্যবহার করছি না।
       *
       * কারণ Firestore-এর order field-এর উপর নির্ভর করলে
       * কিছু record missing/incorrect order হলে সমস্যা হতে পারে।
       *
       * আগে পুরো collection load করছি।
       * তারপর JavaScript দিয়ে date অনুযায়ী sort করছি।
       *
       * ফলে database-এ 14টা record থাকলে 14টাই আসবে।
       */

      const snapshot = await getDocs(
        collection(db, "giftCorner")
      );

      const data: GiftRecord[] = snapshot.docs.map(
        (item) => {
          const raw = item.data();

          return {
            id: item.id,

            date:
              typeof raw.date === "string"
                ? raw.date
                : "",

            event:
              typeof raw.event === "string"
                ? raw.event
                : "",

            giverName:
              typeof raw.giverName === "string"
                ? raw.giverName
                : "",

            giverPhoto:
              typeof raw.giverPhoto === "string"
                ? raw.giverPhoto
                : "",

            giftType:
              raw.giftType === "Item"
                ? "Item"
                : "Money",

            amount:
              typeof raw.amount === "number"
                ? raw.amount
                : Number(raw.amount) || 0,

            giftItem:
              typeof raw.giftItem === "string"
                ? raw.giftItem
                : "",

            comment:
              typeof raw.comment === "string"
                ? raw.comment
                : "",

            /*
             * IMPORTANT:
             *
             * Database-এ showOnHome না থাকলেও
             * default FALSE হবে।
             */
            showOnHome:
              raw.showOnHome === true,

            order:
              typeof raw.order === "number"
                ? raw.order
                : Number(raw.order) || 1,
          };
        }
      );

      // =================================================
      // Latest Date First
      // =================================================

      data.sort((a, b) => {
        const dateA = a.date
          ? new Date(a.date).getTime()
          : 0;

        const dateB = b.date
          ? new Date(b.date).getTime()
          : 0;

        return dateB - dateA;
      });

      setGifts(data);

      console.log(
        `Gift records loaded: ${data.length}`
      );
    } catch (error) {
      console.error(
        "Load gifts error:",
        error
      );

      setError(
        "Gift Corner load করতে সমস্যা হয়েছে। Firestore rules check করুন।"
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // Initial Load
  // ===================================================

  useEffect(() => {
    loadGifts();
  }, []);

  // ===================================================
  // Reset Form
  // ===================================================

  const resetForm = () => {
    setDate("");

    setEvent("");

    setGiverName("");

    setGiverPhoto("");

    setGiftType("Money");

    setAmount(0);

    setGiftItem("");

    setComment("");

    // Default FALSE
    setShowOnHome(false);

    setDisplayOrder(gifts.length + 1);

    setEditingGift(null);
  };

  // ===================================================
  // Add
  // ===================================================

  const handleAdd = () => {
    resetForm();

    setShowModal(true);
  };

  // ===================================================
  // Edit
  // ===================================================

  const handleEdit = (gift: GiftRecord) => {
    setEditingGift(gift);

    setDate(gift.date);

    setEvent(gift.event);

    setGiverName(gift.giverName);

    setGiverPhoto(gift.giverPhoto);

    setGiftType(gift.giftType);

    setAmount(gift.amount);

    setGiftItem(gift.giftItem);

    setComment(gift.comment);

    /*
     * Existing record-এর value থাকবে।
     * যদি পুরোনো database record-এ field না থাকে,
     * তাহলে false হবে।
     */
    setShowOnHome(gift.showOnHome === true);

    setDisplayOrder(gift.order);

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
  // Upload Giver Photo
  // ===================================================

  const handlePhotoUpload = async (
    file: File
  ) => {
    if (!file) return;

    // =================================================
    // File Size
    // =================================================

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Photo size maximum 5MB হতে পারবে।"
      );

      return;
    }

    // =================================================
    // File Type
    // =================================================

    if (!file.type.startsWith("image/")) {
      setError(
        "শুধু image file upload করা যাবে।"
      );

      return;
    }

    // =================================================
    // Cloudinary Config
    // =================================================

    if (!cloudName || !uploadPreset) {
      setError(
        "Cloudinary configuration পাওয়া যায়নি। .env file check করুন।"
      );

      return;
    }

    try {
      setUploading(true);

      setError("");

      setSuccess("");

      const formData = new FormData();

      formData.append("file", file);

      formData.append(
        "upload_preset",
        uploadPreset
      );

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            "Cloudinary upload failed."
        );
      }

      if (!data.secure_url) {
        throw new Error(
          "Cloudinary থেকে image URL পাওয়া যায়নি।"
        );
      }

      setGiverPhoto(data.secure_url);

      setSuccess(
        "Giver photo successfully uploaded."
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
  // Submit
  // ===================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    setSuccess("");

    // =================================================
    // Validation
    // =================================================

    if (!date) {
      setError(
        "Gift দেওয়ার date নির্বাচন করুন।"
      );

      return;
    }

    if (!event) {
      setError("Event নির্বাচন করুন।");

      return;
    }

    if (!giverName.trim()) {
      setError(
        "Who Gave Gift নাম দিন।"
      );

      return;
    }

    if (
      giftType === "Money" &&
      amount <= 0
    ) {
      setError(
        "Money amount সঠিকভাবে দিন।"
      );

      return;
    }

    if (
      giftType === "Item" &&
      !giftItem.trim()
    ) {
      setError(
        "Gift item-এর নাম দিন।"
      );

      return;
    }

    if (
      !displayOrder ||
      displayOrder < 1
    ) {
      setError(
        "Display order সঠিকভাবে দিন।"
      );

      return;
    }

    try {
      setSaving(true);

      // =================================================
      // Gift Data
      // =================================================

      const giftData = {
        date,

        event: event.trim(),

        giverName: giverName.trim(),

        giverPhoto: giverPhoto.trim(),

        giftType,

        amount:
          giftType === "Money"
            ? Number(amount)
            : 0,

        giftItem:
          giftType === "Item"
            ? giftItem.trim()
            : "",

        comment: comment.trim(),

        /*
         * Explicit boolean.
         *
         * New record-এ switch OFF থাকলে false save হবে।
         */
        showOnHome: showOnHome === true,

        order: Number(displayOrder),
      };

      // =================================================
      // Update
      // =================================================

      if (editingGift) {
        await updateDoc(
          doc(
            db,
            "giftCorner",
            editingGift.id
          ),
          {
            ...giftData,

            updatedAt:
              serverTimestamp(),
          }
        );

        setSuccess(
          "Gift record updated successfully."
        );
      }

      // =================================================
      // Add
      // =================================================

      else {
        await addDoc(
          collection(db, "giftCorner"),
          {
            ...giftData,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );

        setSuccess(
          "Gift record added successfully."
        );
      }

      // =================================================
      // Close + Reload
      // =================================================

      setShowModal(false);

      resetForm();

      await loadGifts();
    } catch (error) {
      console.error(
        "Save gift error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gift record save করতে সমস্যা হয়েছে।"
      );
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // Delete
  // ===================================================

  const handleDelete = async (
    gift: GiftRecord
  ) => {
    const confirmDelete =
      window.confirm(
        `Are you sure you want to delete "${gift.giverName}" এর gift record?`
      );

    if (!confirmDelete) return;

    try {
      setDeletingId(gift.id);

      setError("");

      await deleteDoc(
        doc(
          db,
          "giftCorner",
          gift.id
        )
      );

      setGifts((prev) =>
        prev.filter(
          (item) =>
            item.id !== gift.id
        )
      );

      setSuccess(
        "Gift record deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete gift error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gift record delete করতে সমস্যা হয়েছে।"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ===================================================
  // Search
  // ===================================================

  const filteredGifts =
    gifts.filter((gift) => {
      const searchText =
        search.toLowerCase().trim();

      if (!searchText) return true;

      return (
        gift.giverName
          .toLowerCase()
          .includes(searchText) ||

        gift.event
          .toLowerCase()
          .includes(searchText) ||

        gift.giftItem
          .toLowerCase()
          .includes(searchText) ||

        gift.comment
          .toLowerCase()
          .includes(searchText)
      );
    });

  // ===================================================
  // Total Money
  // ===================================================

  const totalMoney = gifts.reduce(
    (total, gift) =>
      total +
      (gift.giftType === "Money"
        ? gift.amount
        : 0),
    0
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
              <FaGift className="me-2" />
              Gift Corner
            </h4>

            <p className="text-muted mb-0">
              Manage Sprihan's gifts and memories
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
              onClick={handleAdd}
            >
              <FaPlus className="me-2" />
              Add Gift
            </Button>

          </div>

        </div>

        {/* =================================================
            Alerts
        ================================================= */}

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
          <Alert
            variant="success"
            dismissible
            onClose={() =>
              setSuccess("")
            }
          >
            {success}
          </Alert>
        )}

        {/* =================================================
            Search / Stats
        ================================================= */}

        <Card className="border-0 shadow-sm mb-4">

          <Card.Body>

            <Row className="align-items-center">

              <Col md={6} lg={5}>

                <Form.Label className="fw-semibold">
                  <FaSearch className="me-2" />
                  Search Gift
                </Form.Label>

                <div className="position-relative">

                  <Form.Control
                    type="text"
                    placeholder="Search giver, event, item..."
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    className={
                      search
                        ? "pe-5"
                        : ""
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

                  <FaGift className="me-2" />

                  Total Gifts:{" "}

                  <strong>
                    {gifts.length}
                  </strong>

                  {" | "}

                  <FaMoneyBillWave className="me-2" />

                  Total Money:{" "}

                  <strong>
                    ৳
                    {totalMoney.toLocaleString()}
                  </strong>

                </div>

              </Col>

            </Row>

          </Card.Body>

        </Card>

        {/* =================================================
            Table
        ================================================= */}

        <Card className="border-0 shadow-sm">

          <Card.Body className="p-0">

            {loading ? (

              <div className="text-center py-5">

                <Spinner animation="border" />

                <p className="text-muted mt-3 mb-0">
                  Loading gifts...
                </p>

              </div>

            ) : filteredGifts.length === 0 ? (

              <div className="text-center py-5 px-3">

                <FaGift className="fs-1 text-muted mb-3" />

                <h5 className="fw-bold">
                  No Gifts Found
                </h5>

                <p className="text-muted">
                  এখনো কোনো gift record যোগ করা হয়নি।
                </p>

                <Button
                  variant="dark"
                  onClick={handleAdd}
                >
                  <FaPlus className="me-2" />
                  Add Gift
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
                        Event
                      </th>

                      <th>
                        Who Gave Gift
                      </th>

                      <th>
                        Gift
                      </th>

                      <th>
                        Comment
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

                    {filteredGifts.map(
                      (gift) => (

                        <tr
                          key={gift.id}
                        >

                          {/* Date */}

                          <td className="px-4">

                            <div className="fw-semibold">
                              {gift.date || "-"}
                            </div>

                          </td>

                          {/* Event */}

                          <td>

                            <Badge bg="secondary">
                              {gift.event || "-"}
                            </Badge>

                          </td>

                          {/* Giver */}

                          <td>

                            <div className="d-flex align-items-center gap-2">

                              {gift.giverPhoto ? (

                                <Image
                                  src={
                                    gift.giverPhoto
                                  }
                                  roundedCircle
                                  width={45}
                                  height={45}
                                  style={{
                                    objectFit:
                                      "cover",
                                  }}
                                  alt={
                                    gift.giverName
                                  }
                                />

                              ) : (

                                <div
                                  className="rounded-circle bg-light border d-flex align-items-center justify-content-center"
                                  style={{
                                    width:
                                      "45px",
                                    height:
                                      "45px",
                                  }}
                                >
                                  <FaGift className="text-muted" />
                                </div>

                              )}

                              <div>

                                <div className="fw-semibold">
                                  {
                                    gift.giverName
                                  }
                                </div>

                                <small className="text-muted">
                                  Gift Giver
                                </small>

                              </div>

                            </div>

                          </td>

                          {/* Gift */}

                          <td>

                            {gift.giftType ===
                            "Money" ? (

                              <Badge
                                bg="success"
                                className="px-3 py-2"
                              >

                                <FaMoneyBillWave className="me-1" />

                                ৳
                                {gift.amount.toLocaleString()}

                              </Badge>

                            ) : (

                              <Badge
                                bg="primary"
                                className="px-3 py-2"
                              >

                                <FaBoxOpen className="me-1" />

                                {
                                  gift.giftItem
                                }

                              </Badge>

                            )}

                          </td>

                          {/* Comment */}

                          <td
                            style={{
                              maxWidth:
                                "250px",
                            }}
                          >

                            <div className="text-truncate">

                              {gift.comment ||
                                "-"}

                            </div>

                          </td>

                          {/* Home */}

                          <td>

                            {gift.showOnHome ? (

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
                              #{gift.order}
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
                                    gift
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
                                  gift.id
                                }
                                onClick={() =>
                                  handleDelete(
                                    gift
                                  )
                                }
                              >

                                {deletingId ===
                                gift.id ? (

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

        <Form
          onSubmit={handleSubmit}
        >

          <Modal.Header closeButton>

            <Modal.Title className="fw-bold">

              <FaGift className="me-2" />

              {editingGift
                ? "Edit Gift"
                : "Add Gift"}

            </Modal.Title>

          </Modal.Header>

          <Modal.Body>

            <Row className="g-4">

              {/* =================================================
                  Giver Photo
              ================================================= */}

              <Col
                md={4}
                className="text-center"
              >

                <Form.Label className="fw-semibold d-block">
                  Who Gave Gift
                </Form.Label>

                <div
                  className="border rounded-3 bg-light d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{
                    width: "170px",
                    height: "170px",
                    overflow: "hidden",
                  }}
                >

                  {giverPhoto ? (

                    <Image
                      src={giverPhoto}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit:
                          "cover",
                      }}
                      alt="Giver"
                    />

                  ) : (

                    <div className="text-muted">

                      <FaGift className="fs-1 mb-2" />

                      <div>
                        No Photo
                      </div>

                    </div>

                  )}

                </div>

                <Form.Label
                  htmlFor="giver-photo"
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
                  id="giver-photo"
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

                {giverPhoto && (

                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="mt-2"
                    type="button"
                    onClick={() =>
                      setGiverPhoto("")
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

                {/* Date */}

                <Form.Group className="mb-3">

                  <Form.Label className="fw-semibold">

                    Date{" "}

                    <span className="text-danger">
                      *
                    </span>

                  </Form.Label>

                  <Form.Control
                    type="date"
                    value={date}
                    onChange={(e) =>
                      setDate(
                        e.target.value
                      )
                    }
                    required
                  />

                </Form.Group>

                {/* Event */}

                <Form.Group className="mb-3">

                  <Form.Label className="fw-semibold">

                    Event{" "}

                    <span className="text-danger">
                      *
                    </span>

                  </Form.Label>

                  <Form.Select
                    value={event}
                    onChange={(e) =>
                      setEvent(
                        e.target.value
                      )
                    }
                    required
                  >

                    <option value="">
                      Select Event
                    </option>

                    <option value="Birth">
                      Birth
                    </option>

                    <option value="Birthday">
                      Birthday
                    </option>

                    <option value="Annaprashan">
                      Annaprashan
                    </option>

                    <option value="Naming Ceremony">
                      Naming Ceremony
                    </option>

                    <option value="Eid">
                      Eid
                    </option>

                    <option value="Puja">
                      Puja
                    </option>

                    <option value="Festival">
                      Festival
                    </option>

                    <option value="Family Visit">
                      Family Visit
                    </option>

                    <option value="Special Occasion">
                      Special Occasion
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </Form.Select>

                </Form.Group>

                {/* Giver Name */}

                <Form.Group className="mb-3">

                  <Form.Label className="fw-semibold">

                    Who Gave Gift{" "}

                    <span className="text-danger">
                      *
                    </span>

                  </Form.Label>

                  <Form.Control
                    type="text"
                    placeholder="Enter gift giver name"
                    value={giverName}
                    onChange={(e) =>
                      setGiverName(
                        e.target.value
                      )
                    }
                    required
                  />

                </Form.Group>

                {/* Gift Type */}

                <Form.Group className="mb-3">

                  <Form.Label className="fw-semibold">

                    Gift Type{" "}

                    <span className="text-danger">
                      *
                    </span>

                  </Form.Label>

                  <div className="d-flex gap-3">

                    <Form.Check
                      type="radio"
                      id="gift-money"
                      name="giftType"
                      label={
                        <>
                          <FaMoneyBillWave className="me-1 text-success" />
                          Money
                        </>
                      }
                      checked={
                        giftType ===
                        "Money"
                      }
                      onChange={() => {
                        setGiftType(
                          "Money"
                        );
                        setGiftItem("");
                      }}
                    />

                    <Form.Check
                      type="radio"
                      id="gift-item"
                      name="giftType"
                      label={
                        <>
                          <FaBoxOpen className="me-1 text-primary" />
                          Item
                        </>
                      }
                      checked={
                        giftType ===
                        "Item"
                      }
                      onChange={() => {
                        setGiftType(
                          "Item"
                        );
                        setAmount(0);
                      }}
                    />

                  </div>

                </Form.Group>

                {/* Money */}

                {giftType ===
                  "Money" && (

                  <Form.Group className="mb-3">

                    <Form.Label className="fw-semibold">
                      Money Amount
                    </Form.Label>

                    <div className="input-group">

                      <span className="input-group-text">
                        ৳
                      </span>

                      <Form.Control
                        type="number"
                        min={1}
                        placeholder="Enter amount"
                        value={
                          amount || ""
                        }
                        onChange={(e) =>
                          setAmount(
                            Number(
                              e.target.value
                            )
                          )
                        }
                      />

                    </div>

                  </Form.Group>

                )}

                {/* Item */}

                {giftType ===
                  "Item" && (

                  <Form.Group className="mb-3">

                    <Form.Label className="fw-semibold">
                      Gift Item
                    </Form.Label>

                    <Form.Control
                      type="text"
                      placeholder="Example: Gold chain, Toy, Dress..."
                      value={giftItem}
                      onChange={(e) =>
                        setGiftItem(
                          e.target.value
                        )
                      }
                    />

                  </Form.Group>

                )}

                {/* Comment */}

                <Form.Group className="mb-3">

                  <Form.Label className="fw-semibold">
                    Comment
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Write a short memory or comment about this gift..."
                    value={comment}
                    onChange={(e) =>
                      setComment(
                        e.target.value
                      )
                    }
                  />

                  <Form.Text className="text-muted">
                    এই gift-এর সাথে কোনো special memory থাকলে এখানে লিখতে পারেন।
                  </Form.Text>

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
                        value={
                          displayOrder
                        }
                        onChange={(e) =>
                          setDisplayOrder(
                            Number(
                              e.target.value
                            )
                          )
                        }
                      />

                      <Form.Text className="text-muted">
                        Table-এ date অনুযায়ী display হবে।
                      </Form.Text>

                    </Form.Group>

                  </Col>

                  {/* Home */}

                  <Col md={6}>

                    <Form.Group className="mb-3">

                      <Form.Label className="fw-semibold d-block">
                        Home Page
                      </Form.Label>

                      <Form.Check
                        type="switch"
                        id="gift-show-home"
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

                      <Form.Text className="text-muted">
                        Default: Hidden from Home
                      </Form.Text>

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
                  {editingGift
                    ? "Update Gift"
                    : "Add Gift"}
                </>

              )}

            </Button>

          </Modal.Footer>

        </Form>

      </Modal>

    </div>
  );
};

export default GiftCorner;