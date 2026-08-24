import { useEffect, useRef, useState } from "react";

import {
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Badge,
} from "react-bootstrap";

import {
  FaUser,
  FaCamera,
  FaSave,
  FaArrowLeft,
  FaTrash,
  FaEnvelope,
} from "react-icons/fa";

import { auth, db } from "../firebase/config";

interface UserData {
  uid: string;
  name: string;
  email: string;
  photo: string;
  role: string;
}

const UserProfile = () => {
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState("");
  const [role, setRole] = useState("user");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // Load Current User
  // =====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/admin/login", {
          replace: true,
        });
        return;
      }

      setFirebaseUser(user);

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data() as Partial<UserData>;

          setName(data.name || user.displayName || "");
          setEmail(data.email || user.email || "");
          setPhoto(data.photo || user.photoURL || "");
          setRole(data.role || "user");
        } else {
          // Create Firestore user document if missing
          await setDoc(
            userRef,
            {
              uid: user.uid,
              name: user.displayName || "",
              email: user.email || "",
              photo: user.photoURL || "",
              role: "user",
              createdAt: new Date(),
            },
            {
              merge: true,
            }
          );

          setName(user.displayName || "");
          setEmail(user.email || "");
          setPhoto(user.photoURL || "");
          setRole("user");
        }
      } catch (err) {
        console.error("Profile load error:", err);
        setError("Unable to load profile.");
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  // =====================================================
  // Select Image
  // =====================================================

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError("");
    setSuccess("");

    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    // Maximum 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    // Remove previous preview URL
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const objectUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreview(objectUrl);
  };

  // =====================================================
  // Upload Image To Cloudinary
  // =====================================================

  const uploadToCloudinary = async (
    file: File
  ): Promise<string> => {
    const cloudName =
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary configuration is missing."
      );
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Cloudinary upload failed.");
    }

    const data = await response.json();

    if (!data.secure_url) {
      throw new Error("Image URL was not returned.");
    }

    return data.secure_url as string;
  };

  // =====================================================
  // Save Profile
  // =====================================================

  const handleSave = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!firebaseUser) {
      setError("User authentication not found.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSaving(true);

    try {
      let finalPhoto = photo;

      // Upload new photo
      if (selectedFile) {
        setUploading(true);

        finalPhoto = await uploadToCloudinary(selectedFile);

        setUploading(false);
      }

      // Update Firebase Authentication profile
      await updateProfile(firebaseUser, {
        displayName: name.trim(),
        photoURL: finalPhoto || null,
      });

      // Update Firestore
      const userRef = doc(
        db,
        "users",
        firebaseUser.uid
      );

      await setDoc(
        userRef,
        {
          uid: firebaseUser.uid,
          name: name.trim(),
          email: firebaseUser.email || email,
          photo: finalPhoto || "",
          role: role || "user",
        },
        {
          merge: true,
        }
      );

      // Update local state
      setName(name.trim());
      setPhoto(finalPhoto);
      setSelectedFile(null);

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      setPreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccess(
        "Profile updated successfully."
      );
    } catch (err: any) {
      console.error("Profile update error:", err);

      if (
        err?.message?.toLowerCase().includes("cloudinary")
      ) {
        setError(
          "Image upload failed. Please check your Cloudinary settings."
        );
      } else {
        setError(
          err?.message ||
            "Unable to update profile. Please try again."
        );
      }
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  // =====================================================
  // Remove Photo
  // =====================================================

  const handleRemovePhoto = async () => {
    if (!firebaseUser) return;

    setError("");
    setSuccess("");

    try {
      setSaving(true);

      const userRef = doc(
        db,
        "users",
        firebaseUser.uid
      );

      await setDoc(
        userRef,
        {
          photo: "",
        },
        {
          merge: true,
        }
      );

      await updateProfile(firebaseUser, {
        photoURL: null,
      });

      setPhoto("");
      setPreview("");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccess(
        "Profile photo removed successfully."
      );
    } catch (err) {
      console.error("Remove photo error:", err);

      setError(
        "Unable to remove profile photo."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // Cancel Selected Photo
  // =====================================================

  const handleCancelPhoto = () => {
    setSelectedFile(null);

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =====================================================
  // Loading
  // =====================================================

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" />
      </div>
    );
  }

  // =====================================================
  // Current Image
  // =====================================================

  const currentImage = preview || photo;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="min-vh-100 py-5"
      style={{
        background: "#f8f9fa",
      }}
    >
      <Container>

        {/* Header */}

        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              My Profile
            </h2>

            <p className="text-muted mb-0">
              Update your profile information
            </p>
          </div>

          <Button
            variant="outline-dark"
            className="rounded-pill"
            onClick={() => navigate("/users")}
          >
            <FaArrowLeft className="me-2" />
            Back
          </Button>
        </div>

        {/* Error */}

        {error && (
          <Alert
            variant="danger"
            className="rounded-3"
          >
            {error}
          </Alert>
        )}

        {/* Success */}

        {success && (
          <Alert
            variant="success"
            className="rounded-3"
          >
            {success}
          </Alert>
        )}

        <Row className="justify-content-center">
          <Col
            xs={12}
            md={10}
            lg={8}
            xl={7}
          >
            <Card
              className="border-0 shadow-sm"
              style={{
                borderRadius: "24px",
                overflow: "hidden",
              }}
            >

              {/* Cover */}

              <div
                style={{
                  background:
                    "linear-gradient(135deg, #212529, #495057)",
                  height: "150px",
                }}
              />

              <Card.Body className="px-4 px-md-5 pb-5">

                {/* Avatar */}

                <div
                  className="text-center"
                  style={{
                    marginTop: "-70px",
                  }}
                >
                  <div
                    className="mx-auto d-flex align-items-center justify-content-center overflow-hidden"
                    style={{
                      width: "140px",
                      height: "140px",
                      borderRadius: "50%",
                      background: "#e9ecef",
                      border: "6px solid #fff",
                      boxShadow:
                        "0 5px 20px rgba(0,0,0,0.15)",
                    }}
                  >
                    {currentImage ? (
                      <img
                        src={currentImage}
                        alt={name || "User"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <FaUser
                        size={55}
                        className="text-secondary"
                      />
                    )}
                  </div>

                  {/* Photo Buttons */}

                  <div className="mt-3">

                    <Button
                      variant="dark"
                      size="sm"
                      className="rounded-pill me-2"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={saving}
                    >
                      <FaCamera className="me-2" />
                      Change Photo
                    </Button>

                    {photo && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="rounded-pill"
                        onClick={handleRemovePhoto}
                        disabled={saving}
                      >
                        <FaTrash className="me-2" />
                        Remove
                      </Button>
                    )}

                  </div>

                  {/* File Input */}

                  <Form.Control
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="d-none"
                  />

                  {/* Selected File */}

                  {selectedFile && (
                    <div className="mt-3">

                      <Badge
                        bg="success"
                        className="me-2"
                      >
                        New photo selected
                      </Badge>

                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger text-decoration-none"
                        onClick={handleCancelPhoto}
                      >
                        Cancel
                      </Button>

                    </div>
                  )}
                </div>

                <hr className="my-4" />

                {/* Form */}

                <Form onSubmit={handleSave}>

                  {/* Name */}

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Full Name
                    </Form.Label>

                    <div className="position-relative">

                      <FaUser
                        className="position-absolute"
                        style={{
                          left: "16px",
                          top: "50%",
                          transform:
                            "translateY(-50%)",
                          color: "#6c757d",
                          zIndex: 2,
                        }}
                      />

                      <Form.Control
                        type="text"
                        value={name}
                        onChange={(e) =>
                          setName(e.target.value)
                        }
                        className="ps-5 py-3 rounded-3"
                        placeholder="Enter your name"
                        required
                      />

                    </div>
                  </Form.Group>

                  {/* Email */}

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Email Address
                    </Form.Label>

                    <div className="position-relative">

                      <FaEnvelope
                        className="position-absolute"
                        style={{
                          left: "16px",
                          top: "50%",
                          transform:
                            "translateY(-50%)",
                          color: "#6c757d",
                          zIndex: 2,
                        }}
                      />

                      <Form.Control
                        type="email"
                        value={email}
                        disabled
                        className="ps-5 py-3 rounded-3 bg-light"
                      />

                    </div>

                    <Form.Text className="text-muted">
                      Email address cannot be changed here.
                    </Form.Text>
                  </Form.Group>

                  {/* Role */}

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      Account Role
                    </Form.Label>

                    <Form.Control
                      type="text"
                      value={
                        role === "admin"
                          ? "Administrator"
                          : "User"
                      }
                      disabled
                      className="py-3 rounded-3 bg-light"
                    />
                  </Form.Group>

                  {/* Save */}

                  <Button
                    type="submit"
                    variant="dark"
                    className="w-100 py-3 rounded-3 fw-semibold"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner
                          size="sm"
                          className="me-2"
                        />

                        {uploading
                          ? "Uploading Photo..."
                          : "Saving Profile..."}
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" />
                        Save Changes
                      </>
                    )}
                  </Button>

                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UserProfile;