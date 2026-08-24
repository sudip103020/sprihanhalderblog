import { useEffect, useRef, useState } from "react";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Container,
  Card,
  Form,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";

import {
  FaArrowLeft,
  FaPaperPlane,
  FaUser,
  FaImage,
  FaTimes,
} from "react-icons/fa";

import { auth, db } from "../firebase/config";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  imageUrl?: string;
  type?: "text" | "image";
  createdAt?: any;
  seen?: boolean;
}

interface ChatUser {
  uid: string;
  name: string;
  email: string;
  photo?: string;
}

const Chat = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [chatUser, setChatUser] =
    useState<ChatUser | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [message, setMessage] =
    useState("");

  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [error, setError] =
    useState("");

  // =========================
  // Current User
  // =========================

 useEffect(() => {
  const unsubscribe = onAuthStateChanged(
    auth,
    (user) => {
      if (!user) {
        navigate("/admin/login", {
          replace: true,
        });
        return;
      }

      setCurrentUserId(user.uid);
    }
  );

  return () => unsubscribe();
}, [navigate]);
  // =========================
  // Load Chat User
  // =========================

  useEffect(() => {
    if (!userId) return;

    const loadUser = async () => {
      try {
        const userRef = doc(
          db,
          "users",
          userId
        );

        const userSnap =
          await getDoc(userRef);

        if (!userSnap.exists()) {
          setError("User not found.");
          setLoading(false);
          return;
        }

        const data =
          userSnap.data();

        setChatUser({
          uid: data.uid,
          name:
            data.name ||
            "Unknown User",
          email:
            data.email || "",
          photo:
            data.photo || "",
        });
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load user."
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  // =========================
  // Conversation ID
  // =========================

  const getConversationId = () => {
    if (
      !currentUserId ||
      !userId
    ) {
      return "";
    }

    return [
      currentUserId,
      userId,
    ]
      .sort()
      .join("_");
  };

  // =========================
  // Mark Messages as Seen
  // =========================

  const markMessagesAsSeen = async (
    messageList: Message[]
  ) => {
    if (!currentUserId || !userId) {
      return;
    }

    const conversationId =
      getConversationId();

    if (!conversationId) return;

    try {
      const unreadMessages =
        messageList.filter(
          (msg) =>
            msg.receiverId ===
              currentUserId &&
            msg.seen === false
        );

      if (
        unreadMessages.length === 0
      ) {
        return;
      }

      await Promise.all(
        unreadMessages.map(
          (msg) =>
            updateDoc(
              doc(
                db,
                "conversations",
                conversationId,
                "messages",
                msg.id
              ),
              {
                seen: true,
              }
            )
        )
      );
    } catch (err) {
      console.error(
        "Unable to mark messages as seen:",
        err
      );
    }
  };

  // =========================
  // Real-time Messages
  // =========================

  useEffect(() => {
    if (
      !currentUserId ||
      !userId
    ) {
      return;
    }

    const conversationId =
      getConversationId();

    if (!conversationId) return;

    const messagesRef =
      collection(
        db,
        "conversations",
        conversationId,
        "messages"
      );

    const messagesQuery =
      query(
        messagesRef,
        orderBy(
          "createdAt",
          "asc"
        )
      );

    const unsubscribe =
      onSnapshot(
        messagesQuery,
        (snapshot) => {
          const messageList: Message[] =
            [];

          snapshot.forEach(
            (messageDoc) => {
              const data =
                messageDoc.data();

              messageList.push({
                id: messageDoc.id,

                senderId:
                  data.senderId,

                receiverId:
                  data.receiverId,

                text:
                  data.text || "",

                imageUrl:
                  data.imageUrl || "",

                type:
                  data.type ||
                  "text",

                createdAt:
                  data.createdAt,

                // Important
                seen:
                  data.seen ??
                  false,
              });
            }
          );

          setMessages(
            messageList
          );

          // Automatically mark
          // received unread messages
          // as seen
          markMessagesAsSeen(
            messageList
          );
        },
        (err) => {
          console.error(err);

          setError(
            "Unable to load messages."
          );
        }
      );

    return () => unsubscribe();
  }, [
    currentUserId,
    userId,
  ]);

  // =========================
  // Auto Scroll
  // =========================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  // =========================
  // Select Image
  // =========================

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    // Maximum 5MB
    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Image size must be less than 5MB."
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    // Only image
    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select an image file."
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    setError("");

    setSelectedImage(file);

    setImagePreview(
      URL.createObjectURL(file)
    );
  };

  // =========================
  // Remove Selected Image
  // =========================

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };

  // =========================
  // Upload Image Cloudinary
  // =========================

  const uploadImage = async (
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
        "Image upload failed."
      );
    }

    const data =
      await response.json();

    return data.secure_url;
  };

  // =========================
  // Send Message
  // =========================

  const handleSendMessage =
    async (
      e: React.FormEvent<HTMLFormElement>
    ) => {
      e.preventDefault();

      const text =
        message.trim();

      if (
        !text &&
        !selectedImage
      ) {
        return;
      }

      if (
        !currentUserId ||
        !userId
      ) {
        return;
      }

      setSending(true);
      setError("");

      try {
        const conversationId =
          getConversationId();

        const conversationRef =
          doc(
            db,
            "conversations",
            conversationId
          );

        let imageUrl = "";

        // =========================
        // Upload Image
        // =========================

        if (selectedImage) {
          setUploadingImage(
            true
          );

          imageUrl =
            await uploadImage(
              selectedImage
            );

          setUploadingImage(
            false
          );
        }

        // =========================
        // Conversation
        // =========================

        await setDoc(
          conversationRef,
          {
            participants: [
              currentUserId,
              userId,
            ],

            lastMessage:
              text ||
              "📷 Image",

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        // =========================
        // Message
        // =========================

        await addDoc(
          collection(
            db,
            "conversations",
            conversationId,
            "messages"
          ),
          {
            senderId:
              currentUserId,

            receiverId:
              userId,

            text: text,

            imageUrl:
              imageUrl,

            type: imageUrl
              ? "image"
              : "text",

            createdAt:
              serverTimestamp(),

            // IMPORTANT
            // New message is unread
            seen: false,
          }
        );

        // =========================
        // Reset
        // =========================

        setMessage("");

        removeSelectedImage();
      } catch (err) {
        console.error(err);

        setUploadingImage(
          false
        );

        setError(
          "Message could not be sent."
        );
      } finally {
        setSending(false);
      }
    };

  // =========================
  // Loading
  // =========================

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" />
      </div>
    );
  }

  // =========================
  // User Not Found
  // =========================

  if (!chatUser) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          {error ||
            "User not found."}
        </Alert>

        <Button
          variant="dark"
          onClick={() =>
            navigate("/users")
          }
        >
          <FaArrowLeft className="me-2" />
          Back to Users
        </Button>
      </Container>
    );
  }

  // =========================
  // UI
  // =========================

  return (
    <div
      className="min-vh-100 py-4"
      style={{
        background: "#f8f9fa",
      }}
    >
      <Container>

        <Card
          className="border-0 shadow-sm overflow-hidden"
          style={{
            height:
              "calc(100vh - 50px)",
            borderRadius:
              "20px",
          }}
        >

          {/* =========================
              Header
          ========================== */}

          <Card.Header
            className="bg-white border-0 d-flex align-items-center"
            style={{
              padding:
                "16px 20px",
            }}
          >

            <Button
              variant="light"
              className="rounded-circle me-3"
              onClick={() =>
                navigate("/users")
              }
            >
              <FaArrowLeft />
            </Button>

            {/* Profile */}

            <div
              className="d-flex align-items-center justify-content-center overflow-hidden me-3"
              style={{
                width: "48px",
                height: "48px",
                borderRadius:
                  "50%",
                background:
                  "#e9ecef",
              }}
            >
              {chatUser.photo ? (
                <img
                  src={
                    chatUser.photo
                  }
                  alt={
                    chatUser.name
                  }
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit:
                      "cover",
                  }}
                />
              ) : (
                <FaUser className="text-secondary" />
              )}
            </div>

            <div>
              <h6 className="fw-bold mb-0">
                {chatUser.name}
              </h6>

              <small className="text-muted">
                {chatUser.email}
              </small>
            </div>

          </Card.Header>

          {/* =========================
              Messages
          ========================== */}

          <Card.Body
            className="overflow-auto"
            style={{
              background:
                "#f1f3f5",
            }}
          >

            {messages.length ===
            0 ? (

              <div className="h-100 d-flex align-items-center justify-content-center">

                <div className="text-center text-muted">

                  <FaPaperPlane
                    size={35}
                    className="mb-3"
                  />

                  <p className="mb-0">
                    No messages yet.
                  </p>

                  <small>
                    Start the conversation 👋
                  </small>

                </div>

              </div>

            ) : (

              messages.map(
                (msg) => {

                  const isMine =
                    msg.senderId ===
                    currentUserId;

                  return (
                    <div
                      key={msg.id}
                      className={`d-flex mb-3 ${
                        isMine
                          ? "justify-content-end"
                          : "justify-content-start"
                      }`}
                    >

                      <div
                        style={{
                          maxWidth:
                            "75%",

                          padding:
                            "10px 15px",

                          borderRadius:
                            isMine
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",

                          background:
                            isMine
                              ? "#212529"
                              : "#ffffff",

                          color:
                            isMine
                              ? "#ffffff"
                              : "#212529",

                          boxShadow:
                            "0 2px 5px rgba(0,0,0,0.05)",
                        }}
                      >

                        {/* Image */}

                        {msg.imageUrl && (
                          <img
                            src={
                              msg.imageUrl
                            }
                            alt="Sent image"
                            style={{
                              display:
                                "block",

                              width:
                                "100%",

                              maxWidth:
                                "300px",

                              maxHeight:
                                "350px",

                              objectFit:
                                "cover",

                              borderRadius:
                                "12px",

                              marginBottom:
                                msg.text
                                  ? "8px"
                                  : "0",
                            }}
                          />
                        )}

                        {/* Text */}

                        {msg.text && (
                          <div
                            style={{
                              whiteSpace:
                                "pre-wrap",

                              wordBreak:
                                "break-word",
                            }}
                          >
                            {msg.text}
                          </div>
                        )}

                        {/* Seen status */}

                        {isMine && (
                          <div
                            className="text-end mt-1"
                            style={{
                              fontSize:
                                "10px",
                              opacity:
                                0.7,
                            }}
                          >
                            {msg.seen
                              ? "Seen"
                              : "Sent"}
                          </div>
                        )}

                      </div>

                    </div>
                  );
                }
              )

            )}

            <div
              ref={
                messagesEndRef
              }
            />

          </Card.Body>

          {/* =========================
              Input
          ========================== */}

          <Card.Footer
            className="bg-white border-0 p-3"
          >

            {error && (
              <Alert
                variant="danger"
                className="py-2 small"
              >
                {error}
              </Alert>
            )}

            {/* Image Preview */}

            {imagePreview && (
              <div
                className="mb-3 position-relative"
                style={{
                  width:
                    "100px",
                }}
              >

                <img
                  src={
                    imagePreview
                  }
                  alt="Preview"
                  style={{
                    width:
                      "100px",
                    height:
                      "100px",
                    objectFit:
                      "cover",
                    borderRadius:
                      "12px",
                  }}
                />

                <button
                  type="button"
                  onClick={
                    removeSelectedImage
                  }
                  className="position-absolute d-flex align-items-center justify-content-center"
                  style={{
                    top:
                      "-8px",
                    right:
                      "-8px",
                    width:
                      "25px",
                    height:
                      "25px",
                    borderRadius:
                      "50%",
                    border:
                      "none",
                    background:
                      "#dc3545",
                    color:
                      "#fff",
                  }}
                >
                  <FaTimes
                    size={12}
                  />
                </button>

              </div>
            )}

            <Form
              onSubmit={
                handleSendMessage
              }
            >

              <div className="d-flex gap-2 align-items-center">

                {/* Image Button */}

                <Button
                  type="button"
                  variant="light"
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width:
                      "52px",
                    minWidth:
                      "52px",
                    height:
                      "52px",
                  }}
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    sending
                  }
                >
                  <FaImage />
                </Button>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={
                    handleImageSelect
                  }
                />

                {/* Text */}

                <Form.Control
                  type="text"
                  placeholder="Write a message..."
                  value={
                    message
                  }
                  onChange={(
                    e
                  ) =>
                    setMessage(
                      e.target
                        .value
                    )
                  }
                  className="py-3 rounded-pill"
                  disabled={
                    sending
                  }
                />

                {/* Send */}

                <Button
                  type="submit"
                  variant="dark"
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width:
                      "52px",
                    minWidth:
                      "52px",
                    height:
                      "52px",
                  }}
                  disabled={
                    sending ||
                    uploadingImage ||
                    (!message.trim() &&
                      !selectedImage)
                  }
                >
                  {sending ? (
                    <Spinner
                      size="sm"
                    />
                  ) : (
                    <FaPaperPlane />
                  )}
                </Button>

              </div>

              {uploadingImage && (
                <small className="text-muted d-block mt-2">
                  Uploading image...
                </small>
              )}

            </Form>

          </Card.Footer>

        </Card>

      </Container>
    </div>
  );
};

export default Chat;