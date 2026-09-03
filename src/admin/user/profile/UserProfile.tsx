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
  FaPhone,
  FaBirthdayCake,
  FaVenusMars,
  FaMapMarkerAlt,
  FaCity,
  FaGlobe,
  FaInfoCircle,
} from "react-icons/fa";

import { auth, db } from "../../../firebase/config";

interface UserData {
  uid: string;
  name: string;
  email: string;
  photo: string;
  role: string;

  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  country?: string;
  bio?: string;
}

const UserProfile = () => {
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // =====================================================
  // Profile Fields
  // =====================================================

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState("");
  const [role, setRole] = useState("user");

  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Bangladesh");
  const [bio, setBio] = useState("");

  // =====================================================
  // Image
  // =====================================================

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  // =====================================================
  // States
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // Load Current User
  // =====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          navigate("/admin/login", {
            replace: true,
          });

          return;
        }

        setFirebaseUser(user);

        try {
          const userRef = doc(
            db,
            "users",
            user.uid
          );

          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data =
              userSnap.data() as Partial<UserData>;

            setName(
              data.name ||
                user.displayName ||
                ""
            );

            setEmail(
              data.email ||
                user.email ||
                ""
            );

            setPhoto(
              data.photo ||
                user.photoURL ||
                ""
            );

            setRole(
              data.role ||
                "user"
            );

            setPhone(
              data.phone ||
                ""
            );

            setDob(
              data.dob ||
                ""
            );

            setGender(
              data.gender ||
                ""
            );

            setAddress(
              data.address ||
                ""
            );

            setCity(
              data.city ||
                ""
            );

            setCountry(
              data.country ||
                "Bangladesh"
            );

            setBio(
              data.bio ||
                ""
            );
          } else {
            // Create Firestore user document
            await setDoc(
              userRef,
              {
                uid: user.uid,
                name:
                  user.displayName ||
                  "",
                email:
                  user.email ||
                  "",
                photo:
                  user.photoURL ||
                  "",
                role: "user",

                phone: "",
                dob: "",
                gender: "",
                address: "",
                city: "",
                country: "Bangladesh",
                bio: "",

                createdAt: new Date(),
              },
              {
                merge: true,
              }
            );

            setName(
              user.displayName ||
                ""
            );

            setEmail(
              user.email ||
                ""
            );

            setPhoto(
              user.photoURL ||
                ""
            );

            setRole("user");
            setCountry("Bangladesh");
          }
        } catch (err) {
          console.error(
            "Profile load error:",
            err
          );

          setError(
            "Unable to load profile."
          );
        } finally {
          setLoading(false);
        }
      }
    );

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

    const file =
      e.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid image file."
      );

      return;
    }

    // Maximum 5MB
    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Image size must be less than 5MB."
      );

      return;
    }

    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    const objectUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setPreview(objectUrl);
  };

  // =====================================================
  // Upload To Cloudinary
  // =====================================================

  const uploadToCloudinary = async (
    file: File
  ): Promise<string> => {
    const cloudName =
      import.meta.env
        .VITE_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      import.meta.env
        .VITE_CLOUDINARY_UPLOAD_PRESET;

    if (
      !cloudName ||
      !uploadPreset
    ) {
      throw new Error(
        "Cloudinary configuration is missing."
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "upload_preset",
      uploadPreset
    );

    const response =
      await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

    if (!response.ok) {
      throw new Error(
        "Cloudinary upload failed."
      );
    }

    const data =
      await response.json();

    if (!data.secure_url) {
      throw new Error(
        "Image URL was not returned."
      );
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
      setError(
        "User authentication not found."
      );

      return;
    }

    if (!name.trim()) {
      setError(
        "Please enter your name."
      );

      return;
    }

    setSaving(true);

    try {
      let finalPhoto = photo;

      // Upload new photo
      if (selectedFile) {
        setUploading(true);

        finalPhoto =
          await uploadToCloudinary(
            selectedFile
          );

        setUploading(false);
      }

      // =================================================
      // Update Firebase Authentication
      // =================================================

      await updateProfile(
        firebaseUser,
        {
          displayName:
            name.trim(),

          photoURL:
            finalPhoto || null,
        }
      );

      // =================================================
      // Update Firestore
      // =================================================

      const userRef = doc(
        db,
        "users",
        firebaseUser.uid
      );

      await setDoc(
        userRef,
        {
          uid:
            firebaseUser.uid,

          name:
            name.trim(),

          email:
            firebaseUser.email ||
            email,

          photo:
            finalPhoto || "",

          role:
            role || "user",

          phone:
            phone.trim(),

          dob:
            dob || "",

          gender:
            gender || "",

          address:
            address.trim(),

          city:
            city.trim(),

          country:
            country.trim(),

          bio:
            bio.trim(),

          updatedAt:
            new Date(),
        },
        {
          merge: true,
        }
      );

      // =================================================
      // Update Local State
      // =================================================

      setName(
        name.trim()
      );

      setPhoto(
        finalPhoto
      );

      setSelectedFile(
        null
      );

      if (preview) {
        URL.revokeObjectURL(
          preview
        );
      }

      setPreview("");

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      setSuccess(
        "Profile updated successfully."
      );
    } catch (err: any) {
      console.error(
        "Profile update error:",
        err
      );

      if (
        err?.message
          ?.toLowerCase()
          .includes("cloudinary")
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

  const handleRemovePhoto =
    async () => {
      if (!firebaseUser) return;

      setError("");
      setSuccess("");

      try {
        setSaving(true);

        const userRef =
          doc(
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

        await updateProfile(
          firebaseUser,
          {
            photoURL: null,
          }
        );

        setPhoto("");
        setPreview("");
        setSelectedFile(null);

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }

        setSuccess(
          "Profile photo removed successfully."
        );
      } catch (err) {
        console.error(
          "Remove photo error:",
          err
        );

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

  const handleCancelPhoto =
    () => {
      setSelectedFile(null);

      if (preview) {
        URL.revokeObjectURL(
          preview
        );
      }

      setPreview("");

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    };

  // =====================================================
  // Loading
  // =====================================================

  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{
          background:
            "#f8f9fa",
        }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  // =====================================================
  // Current Image
  // =====================================================

  const currentImage =
    preview || photo;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="user-profile-page min-vh-100 py-4 py-md-5"
      style={{
        background:
          "#f8f9fa",
      }}
    >
      <Container>
        {/* =================================================
            Header
        ================================================= */}

        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
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
            className="rounded-pill px-4"
            onClick={() =>
              navigate(
                "/user/dashboard"
              )
            }
          >
            <FaArrowLeft className="me-2" />
            Back
          </Button>
        </div>

        {/* =================================================
            Error
        ================================================= */}

        {error && (
          <Alert
            variant="danger"
            className="rounded-3"
            dismissible
            onClose={() =>
              setError("")
            }
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
            className="rounded-3"
            dismissible
            onClose={() =>
              setSuccess("")
            }
          >
            {success}
          </Alert>
        )}

        <Row className="justify-content-center">
          <Col
            xs={12}
            lg={10}
            xl={9}
          >
            <Card
              className="border-0 shadow-sm"
              style={{
                borderRadius:
                  "24px",
                overflow:
                  "hidden",
              }}
            >
              {/* =================================================
                  Cover
              ================================================= */}

              <div
                style={{
                  background:
                    "linear-gradient(135deg, #212529, #495057)",
                  height:
                    "150px",
                }}
              />

              <Card.Body className="px-3 px-md-5 pb-5">
                {/* =================================================
                    Avatar
                ================================================= */}

                <div
                  className="text-center"
                  style={{
                    marginTop:
                      "-70px",
                  }}
                >
                  <div
                    className="mx-auto d-flex align-items-center justify-content-center overflow-hidden"
                    style={{
                      width:
                        "140px",
                      height:
                        "140px",
                      borderRadius:
                        "50%",
                      background:
                        "#e9ecef",
                      border:
                        "6px solid #fff",
                      boxShadow:
                        "0 5px 20px rgba(0,0,0,0.15)",
                    }}
                  >
                    {currentImage ? (
                      <img
                        src={
                          currentImage
                        }
                        alt={
                          name ||
                          "User"
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
                      className="rounded-pill me-2 mb-2"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={
                        saving
                      }
                    >
                      <FaCamera className="me-2" />
                      Change Photo
                    </Button>

                    {photo && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="rounded-pill mb-2"
                        onClick={
                          handleRemovePhoto
                        }
                        disabled={
                          saving
                        }
                      >
                        <FaTrash className="me-2" />
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* File Input */}

                  <Form.Control
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept="image/*"
                    onChange={
                      handleFileChange
                    }
                    className="d-none"
                  />

                  {/* Selected File */}

                  {selectedFile && (
                    <div className="mt-2">
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
                        onClick={
                          handleCancelPhoto
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                <hr className="my-4" />

                {/* =================================================
                    Profile Form
                ================================================= */}

                <Form
                  onSubmit={
                    handleSave
                  }
                >
                  <Row>
                    {/* Full Name */}

                    <Col
                      xs={12}
                      md={6}
                    >
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          Full Name
                        </Form.Label>

                        <div className="position-relative">
                          <FaUser
                            className="position-absolute"
                            style={{
                              left:
                                "16px",
                              top:
                                "50%",
                              transform:
                                "translateY(-50%)",
                              color:
                                "#6c757d",
                              zIndex: 2,
                            }}
                          />

                          <Form.Control
                            type="text"
                            value={
                              name
                            }
                            onChange={(
                              e
                            ) =>
                              setName(
                                e
                                  .target
                                  .value
                              )
                            }
                            className="ps-5 py-3 rounded-3"
                            placeholder="Enter your full name"
                            required
                          />
                        </div>
                      </Form.Group>
                    </Col>

                    {/* Email */}

                    <Col
                      xs={12}
                      md={6}
                    >
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          Email Address
                        </Form.Label>

                        <div className="position-relative">
                          <FaEnvelope
                            className="position-absolute"
                            style={{
                              left:
                                "16px",
                              top:
                                "50%",
                              transform:
                                "translateY(-50%)",
                              color:
                                "#6c757d",
                              zIndex: 2,
                            }}
                          />

                          <Form.Control
                            type="email"
                            value={
                              email
                            }
                            disabled
                            className="ps-5 py-3 rounded-3 bg-light"
                          />
                        </div>

                        <Form.Text className="text-muted">
                          Email address cannot be changed here.
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    {/* Phone */}

                    <Col
                      xs={12}
                      md={6}
                    >
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          Phone Number
                        </Form.Label>

                        <div className="position-relative">
                          <FaPhone
                            className="position-absolute"
                            style={{
                              left:
                                "16px",
                              top:
                                "50%",
                              transform:
                                "translateY(-50%)",
                              color:
                                "#6c757d",
                              zIndex: 2,
                            }}
                          />

                          <Form.Control
                            type="tel"
                            value={
                              phone
                            }
                            onChange={(
                              e
                            ) =>
                              setPhone(
                                e
                                  .target
                                  .value
                              )
                            }
                            className="ps-5 py-3 rounded-3"
                            placeholder="Enter phone number"
                          />
                        </div>
                      </Form.Group>
                    </Col>

                    {/* Date of Birth */}

                    <Col
                      xs={12}
                      md={6}
                    >
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          Date of Birth
                        </Form.Label>

                        <div className="position-relative">
                          <FaBirthdayCake
                            className="position-absolute"
                            style={{
                              left:
                                "16px",
                              top:
                                "50%",
                              transform:
                                "translateY(-50%)",
                              color:
                                "#6c757d",
                              zIndex: 2,
                            }}
                          />

                          <Form.Control
                            type="date"
                            value={
                              dob
                            }
                            onChange={(
                              e
                            ) =>
                              setDob(
                                e
                                  .target
                                  .value
                              )
                            }
                            className="ps-5 py-3 rounded-3"
                          />
                        </div>
                      </Form.Group>
                    </Col>

                    {/* Gender */}

                    <Col
                      xs={12}
                      md={6}
                    >
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          Gender
                        </Form.Label>

                        <div className="position-relative">
                          <FaVenusMars
                            className="position-absolute"
                            style={{
                              left:
                                "16px",
                              top:
                                "50%",
                              transform:
                                "translateY(-50%)",
                              color:
                                "#6c757d",
                              zIndex: 2,
                            }}
                          />

                          <Form.Select
                            value={
                              gender
                            }
                            onChange={(
                              e
                            ) =>
                              setGender(
                                e
                                  .target
                                  .value
                              )
                            }
                            className="ps-5 py-3 rounded-3"
                          >
                            <option value="">
                              Select Gender
                            </option>

                            <option value="Male">
                              Male
                            </option>

                            <option value="Female">
                              Female
                            </option>

                            <option value="Other">
                              Other
                            </option>
                          </Form.Select>
                        </div>
                      </Form.Group>
                    </Col>

                    {/* Role */}

                    <Col
                      xs={12}
                      md={6}
                    >
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          Account Role
                        </Form.Label>

                        <Form.Control
                          type="text"
                          value={
                            role ===
                            "admin"
                              ? "Administrator"
                              : "User"
                          }
                          disabled
                          className="py-3 rounded-3 bg-light"
                        />
                      </Form.Group>
                    </Col>

                    {/* Address */}

                    <Col
                      xs={12}
                    >
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          Address
                        </Form.Label>

                        <div className="position-relative">
                          <FaMapMarkerAlt
                            className="position-absolute"
                            style={{
                              left:
                                "16px",
                              top:
                                "20px",
                              color:
                                "#6c757d",
                              zIndex: 2,
                            }}
                          />

                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={
                              address
                            }
                            onChange={(
                              e
                            ) =>
                              setAddress(
                                e
                                  .target
                                  .value
                              )
                            }
                            className="ps-5 py-3 rounded-3"
                            placeholder="Enter your full address"
                          />
                        </div>
                      </Form.Group>
                    </Col>

                    {/* City */}

                    <Col
                      xs={12}
                      md={6}
                    >
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          City
                        </Form.Label>

                        <div className="position-relative">
                          <FaCity
                            className="position-absolute"
                            style={{
                              left:
                                "16px",
                              top:
                                "50%",
                              transform:
                                "translateY(-50%)",
                              color:
                                "#6c757d",
                              zIndex: 2,
                            }}
                          />

                          <Form.Control
                            type="text"
                            value={
                              city
                            }
                            onChange={(
                              e
                            ) =>
                              setCity(
                                e
                                  .target
                                  .value
                              )
                            }
                            className="ps-5 py-3 rounded-3"
                            placeholder="Enter city"
                          />
                        </div>
                      </Form.Group>
                    </Col>

                    {/* Country */}

                    <Col
                      xs={12}
                      md={6}
                    >
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          Country
                        </Form.Label>

                        <div className="position-relative">
                          <FaGlobe
                            className="position-absolute"
                            style={{
                              left:
                                "16px",
                              top:
                                "50%",
                              transform:
                                "translateY(-50%)",
                              color:
                                "#6c757d",
                              zIndex: 2,
                            }}
                          />

                          <Form.Control
                            type="text"
                            value={
                              country
                            }
                            onChange={(
                              e
                            ) =>
                              setCountry(
                                e
                                  .target
                                  .value
                              )
                            }
                            className="ps-5 py-3 rounded-3"
                            placeholder="Enter country"
                          />
                        </div>
                      </Form.Group>
                    </Col>

                    {/* Bio */}

                    <Col
                      xs={12}
                    >
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          About Me
                        </Form.Label>

                        <div className="position-relative">
                          <FaInfoCircle
                            className="position-absolute"
                            style={{
                              left:
                                "16px",
                              top:
                                "20px",
                              color:
                                "#6c757d",
                              zIndex: 2,
                            }}
                          />

                          <Form.Control
                            as="textarea"
                            rows={4}
                            maxLength={500}
                            value={
                              bio
                            }
                            onChange={(
                              e
                            ) =>
                              setBio(
                                e
                                  .target
                                  .value
                              )
                            }
                            className="ps-5 py-3 rounded-3"
                            placeholder="Write something about yourself..."
                          />
                        </div>

                        <Form.Text className="text-muted">
                          Maximum 500 characters.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* =================================================
                      Save Button
                  ================================================= */}

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