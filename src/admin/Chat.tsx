import { useEffect, useRef, useState } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
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
  Dropdown,
} from "react-bootstrap";

import {
  FaArrowLeft,
  FaPaperPlane,
  FaUser,
  FaImage,
  FaTimes,
  FaSmile,
  FaTrash,
} from "react-icons/fa";

import EmojiPicker from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";

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

  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);

  const [deletingMessageId, setDeletingMessageId] =
    useState<string | null>(null);

  // =========================
  // Current User
  // =========================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          navigate("/admin/login", {
            replace: true,
          });

          return;
        }

        setCurrentUserId(user.uid);
      });

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
          uid: data.uid || userId,
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
  // Mark Messages Seen
  // =========================

  const markMessagesAsSeen = async (
    messageList: Message[]
  ) => {
    if (
      !currentUserId ||
      !userId
    ) {
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

                seen:
                  data.seen ??
                  false,
              });
            }
          );

          setMessages(
            messageList
          );

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
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // =========================
  // Emoji
  // =========================

  const handleEmojiClick = (
    emojiData: EmojiClickData
  ) => {
    setMessage(
      (prev) =>
        prev + emojiData.emoji
    );
  };

  // =========================
  // Select Image
  // =========================

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

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
  // Remove Image
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
  // Upload Image
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

        if (selectedImage) {
          setUploadingImage(true);

          imageUrl =
            await uploadImage(
              selectedImage
            );

          setUploadingImage(false);
        }

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

            text,

            imageUrl,

            type: imageUrl
              ? "image"
              : "text",

            createdAt:
              serverTimestamp(),

            seen: false,
          }
        );

        setMessage("");

        removeSelectedImage();

        setShowEmojiPicker(
          false
        );
      } catch (err) {
        console.error(err);

        setUploadingImage(false);

        setError(
          "Message could not be sent."
        );
      } finally {
        setSending(false);
      }
    };

  // =========================
  // Delete Message
  // =========================

  const handleDeleteMessage =
    async (
      messageId: string
    ) => {
      if (
        !currentUserId ||
        !userId
      ) {
        return;
      }

      const confirmDelete =
        window.confirm(
          "Are you sure you want to delete this message?"
        );

      if (!confirmDelete) {
        return;
      }

      try {
        setDeletingMessageId(
          messageId
        );

        const conversationId =
          getConversationId();

        await deleteDoc(
          doc(
            db,
            "conversations",
            conversationId,
            "messages",
            messageId
          )
        );
      } catch (err) {
        console.error(
          "Delete message error:",
          err
        );

        setError(
          "Message could not be deleted."
        );
      } finally {
        setDeletingMessageId(
          null
        );
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
      className="min-vh-100"
      style={{
        background:
          "linear-gradient(135deg, #f8fafc, #eef1f5)",
        padding: "20px 0",
      }}
    >
      <Container>
        <Card
          className="border-0 shadow-lg overflow-hidden"
          style={{
            height:
              "calc(100vh - 40px)",
            minHeight:
              "600px",
            borderRadius:
              "24px",
          }}
        >

          {/* =========================
              Premium Header
          ========================== */}

          <Card.Header
            className="border-0 d-flex align-items-center"
            style={{
              padding:
                "15px 20px",
              background:
                "rgba(255,255,255,0.96)",
              borderBottom:
                "1px solid #eee",
            }}
          >

            {/* Back */}

            <Button
              variant="light"
              className="rounded-circle d-flex align-items-center justify-content-center me-3"
              style={{
                width: "44px",
                height: "44px",
              }}
              onClick={() =>
                navigate("/users")
              }
            >
              <FaArrowLeft />
            </Button>

            {/* Profile */}

            <div
              className="position-relative me-3"
              style={{
                width: "50px",
                height: "50px",
              }}
            >
              <div
                className="d-flex align-items-center justify-content-center overflow-hidden"
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius:
                    "50%",
                  background:
                    "#e9ecef",
                  border:
                    "2px solid #fff",
                  boxShadow:
                    "0 3px 12px rgba(0,0,0,0.15)",
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
                    className="text-secondary"
                    size={22}
                  />
                )}
              </div>

              {/* Online Dot */}

              <span
                style={{
                  position:
                    "absolute",
                  right: "1px",
                  bottom: "1px",
                  width: "13px",
                  height: "13px",
                  borderRadius:
                    "50%",
                  background:
                    "#22c55e",
                  border:
                    "2px solid #fff",
                }}
              />
            </div>

            {/* Name */}

            <div className="flex-grow-1">
              <h6
                className="fw-bold mb-0"
                style={{
                  fontSize:
                    "16px",
                }}
              >
                {chatUser.name}
              </h6>

              <small
                className="text-success"
                style={{
                  fontSize:
                    "12px",
                }}
              >
                ● Active
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
                "linear-gradient(180deg, #f8fafc 0%, #eef1f5 100%)",
              padding:
                "20px",
            }}
          >

            {messages.length === 0 ? (
              <div className="h-100 d-flex align-items-center justify-content-center">

                <div className="text-center text-muted">

                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{
                      width:
                        "70px",
                      height:
                        "70px",
                      borderRadius:
                        "50%",
                      background:
                        "#fff",
                      boxShadow:
                        "0 5px 20px rgba(0,0,0,0.08)",
                    }}
                  >
                    <FaPaperPlane
                      size={25}
                    />
                  </div>

                  <h6 className="fw-bold">
                    Start a conversation
                  </h6>

                  <small>
                    Send a message to{" "}
                    {chatUser.name} 👋
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
                          position:
                            "relative",
                        }}
                      >

                        {/* Message Bubble */}

                        <div
                          style={{
                            padding:
                              "10px 14px",
                            borderRadius:
                              isMine
                                ? "18px 18px 5px 18px"
                                : "18px 18px 18px 5px",

                            background:
                              isMine
                                ? "linear-gradient(135deg, #111827, #374151)"
                                : "#ffffff",

                            color:
                              isMine
                                ? "#fff"
                                : "#212529",

                            boxShadow:
                              "0 3px 12px rgba(0,0,0,0.07)",
                          }}
                        >

                          {/* Image */}

                          {msg.imageUrl && (
                            <img
                              src={
                                msg.imageUrl
                              }
                              alt="Sent"
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
                                paddingRight:
                                  isMine
                                    ? "5px"
                                    : "0",
                              }}
                            >
                              {
                                msg.text
                              }
                            </div>
                          )}

                          {/* Bottom */}

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

                        {/* Message Menu */}

                        {isMine && (
                          <Dropdown
                            className="position-absolute"
                            style={{
                              right:
                                "-10px",
                              top:
                                "-10px",
                            }}
                          >
                            <Dropdown.Toggle
                              variant="light"
                              size="sm"
                              className="rounded-circle border-0 shadow-sm d-flex align-items-center justify-content-center"
                              style={{
                                width:
                                  "30px",
                                height:
                                  "30px",
                                fontSize:
                                  "16px",
                                padding:
                                  "0",
                              }}
                              disabled={
                                deletingMessageId ===
                                msg.id
                              }
                            >
                              ⋮
                            </Dropdown.Toggle>

                            <Dropdown.Menu
                              align="end"
                              className="border-0 shadow"
                            >
                              <Dropdown.Item
                                className="text-danger"
                                onClick={() =>
                                  handleDeleteMessage(
                                    msg.id
                                  )
                                }
                              >
                                {deletingMessageId ===
                                msg.id ? (
                                  <Spinner
                                    animation="border"
                                    size="sm"
                                    className="me-2"
                                  />
                                ) : (
                                  <FaTrash className="me-2" />
                                )}

                                Delete
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
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
              Footer
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
                      "14px",
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
                      "26px",
                    height:
                      "26px",
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

            {/* Emoji Picker */}

            {showEmojiPicker && (
              <div
                className="position-absolute"
                style={{
                  bottom:
                    "90px",
                  zIndex:
                    1000,
                }}
              >
                <EmojiPicker
                  onEmojiClick={
                    handleEmojiClick
                  }
                  width={
                    320
                  }
                  height={
                    400
                  }
                />
              </div>
            )}

            <Form
              onSubmit={
                handleSendMessage
              }
            >

              <div className="d-flex gap-2 align-items-center">

                {/* Emoji */}

                <Button
                  type="button"
                  variant="light"
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width:
                      "48px",
                    minWidth:
                      "48px",
                    height:
                      "48px",
                  }}
                  onClick={() =>
                    setShowEmojiPicker(
                      (prev) =>
                        !prev
                    )
                  }
                  disabled={
                    sending
                  }
                >
                  <FaSmile
                    size={19}
                  />
                </Button>

                {/* Image */}

                <Button
                  type="button"
                  variant="light"
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width:
                      "48px",
                    minWidth:
                      "48px",
                    height:
                      "48px",
                  }}
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    sending
                  }
                >
                  <FaImage
                    size={18}
                  />
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

                {/* Message */}

                <Form.Control
                  type="text"
                  placeholder="Write a message..."
                  value={
                    message
                  }
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  className="py-3 px-4 rounded-pill border-0"
                  style={{
                    background:
                      "#f1f3f5",
                  }}
                  disabled={
                    sending
                  }
                  onFocus={() =>
                    setShowEmojiPicker(
                      false
                    )
                  }
                />

                {/* Send */}

                <Button
                  type="submit"
                  variant="dark"
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width:
                      "50px",
                    minWidth:
                      "50px",
                    height:
                      "50px",
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