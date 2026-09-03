import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  onAuthStateChanged,
 
} from "firebase/auth";

import { useNavigate } from "react-router-dom";

import {
  Container,
  Card,
  Button,
  Spinner,
  Alert,
  Badge,
} from "react-bootstrap";

import {
  FaUser,
  FaComments,
} from "react-icons/fa";

import { auth, db } from "../../../firebase/config";

// =====================================================
// Interfaces
// =====================================================

interface UserData {
  uid: string;
  name: string;
  email: string;
  photo?: string;
  role?: string;
}

interface ConversationData {
  participants: string[];
  lastMessage?: string;
  updatedAt?: any;
}

// =====================================================
// Component
// =====================================================

const UserList = () => {
  const navigate = useNavigate();

  // =====================================================
  // States
  // =====================================================

  const [users, setUsers] = useState<UserData[]>([]);

  const [currentUser, setCurrentUser] =
    useState<UserData | null>(null);

  const [unreadCounts, setUnreadCounts] =
    useState<Record<string, number>>({});

  const [lastMessages, setLastMessages] =
    useState<Record<string, string>>({});

  const [lastMessageTimes, setLastMessageTimes] =
    useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // =====================================================
  // Load Auth + Users
  // =====================================================

  useEffect(() => {
    let unsubscribeUsers:
      | (() => void)
      | undefined;

    const unsubscribeAuth =
      onAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser) {
          navigate("/admin/login", {
            replace: true,
          });

          return;
        }

        unsubscribeUsers = onSnapshot(
          collection(db, "users"),

          (snapshot) => {
            const userList: UserData[] = [];

            let loggedInUser:
              | UserData
              | null = null;

            snapshot.forEach((userDoc) => {
              const data = userDoc.data();

              const uid =
                data.uid || userDoc.id;

              const userData: UserData = {
                uid,

                name:
                  data.name ||
                  "Unknown User",

                email:
                  data.email || "",

                photo:
                  data.photo || "",

                role:
                  data.role || "user",
              };

              // Current logged-in user
              if (uid === firebaseUser.uid) {
                loggedInUser = userData;
              } else {
                userList.push(userData);
              }
            });

            setCurrentUser(loggedInUser);

            setUsers(userList);

            setLoading(false);
          },

          (snapshotError) => {
            console.error(
              "Users listener error:",
              snapshotError,
            );

            if (
              snapshotError.code ===
              "permission-denied"
            ) {
              setError(
                "You do not have permission to view users.",
              );
            } else {
              setError(
                "Unable to load users.",
              );
            }

            setLoading(false);
          },
        );
      });

    return () => {
      unsubscribeAuth();

      if (unsubscribeUsers) {
        unsubscribeUsers();
      }
    };
  }, [navigate]);

  // =====================================================
  // Conversations + Unread Messages
  // =====================================================

  useEffect(() => {
    if (!currentUser) {
      setUnreadCounts({});
      setLastMessages({});
      setLastMessageTimes({});

      return;
    }

    const conversationsQuery = query(
      collection(db, "conversations"),

      where(
        "participants",
        "array-contains",
        currentUser.uid,
      ),
    );

    const messageUnsubscribers:
      (() => void)[] = [];

    const unsubscribeConversations =
      onSnapshot(
        conversationsQuery,

        (snapshot) => {
          const latestMessages: Record<
            string,
            string
          > = {};

          const latestMessageTimes: Record<
            string,
            number
          > = {};

          snapshot.forEach(
            (conversationDoc) => {
              const data =
                conversationDoc.data() as ConversationData;

              // Find other user
              const otherUserId =
                data.participants?.find(
                  (id) =>
                    id !==
                    currentUser.uid,
                );

              if (!otherUserId) return;

              // =================================================
              // Last Message
              // =================================================

              latestMessages[otherUserId] =
                data.lastMessage || "";

              // =================================================
              // Last Message Time
              // =================================================

              let messageTime = 0;

              if (
                data.updatedAt?.toMillis
              ) {
                messageTime =
                  data.updatedAt.toMillis();
              } else if (
                data.updatedAt?.seconds
              ) {
                messageTime =
                  data.updatedAt.seconds *
                  1000;
              }

              latestMessageTimes[
                otherUserId
              ] = messageTime;

              // =================================================
              // Unread Messages
              // =================================================

              const messagesQuery =
                query(
                  collection(
                    db,
                    "conversations",
                    conversationDoc.id,
                    "messages",
                  ),

                  where(
                    "receiverId",
                    "==",
                    currentUser.uid,
                  ),

                  where(
                    "seen",
                    "==",
                    false,
                  ),
                );

              const unsubscribeMessages =
                onSnapshot(
                  messagesQuery,

                  (messageSnapshot) => {
                    setUnreadCounts(
                      (prev) => ({
                        ...prev,

                        [otherUserId]:
                          messageSnapshot.size,
                      }),
                    );
                  },

                  (messageError) => {
                    if (
                      messageError.code !==
                      "permission-denied"
                    ) {
                      console.error(
                        "Message listener error:",
                        messageError,
                      );
                    }
                  },
                );

              messageUnsubscribers.push(
                unsubscribeMessages,
              );
            },
          );

          setLastMessages(
            latestMessages,
          );

          setLastMessageTimes(
            latestMessageTimes,
          );
        },

        (conversationError) => {
          if (
            conversationError.code !==
            "permission-denied"
          ) {
            console.error(
              "Conversation listener error:",
              conversationError,
            );
          }
        },
      );

    return () => {
      unsubscribeConversations();

      messageUnsubscribers.forEach(
        (unsubscribe) => {
          unsubscribe();
        },
      );
    };
  }, [currentUser]);

  // =====================================================
  // Sort Users
  // Latest Message First
  // =====================================================

  const sortedUsers = [...users].sort(
    (a, b) => {
      const timeA =
        lastMessageTimes[a.uid] || 0;

      const timeB =
        lastMessageTimes[b.uid] || 0;

      return timeB - timeA;
    },
  );

 
  // =====================================================
  // Open Chat
  // =====================================================

 const handleMessage = (
  userId: string,
) => {
  navigate(`/user/messages/${userId}`);
};

  // =====================================================
  // Loading
  // =====================================================

  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{
          background: "#f8f9fa",
        }}
      >
        <div className="text-center">
          <Spinner animation="border" />

          <p className="text-muted mt-3 mb-0">
            Loading users...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="min-vh-100 py-4 py-md-5"
      style={{
        background:
          "linear-gradient(180deg, #f8f9fa 0%, #eef1f4 100%)",
      }}
    >
      <Container>
        {/* =================================================
            Top Header
        ================================================= */}

        

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

        {/* =================================================
     

  
        {/* =================================================
            Messages Header
        ================================================= */}

        <div className="d-flex justify-content-between align-items-end mb-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <h4 className="fw-bold mb-1">
                Messages
              </h4>

              <Badge
                bg="dark"
                pill
              >
                {users.length}
              </Badge>
            </div>

            <p className="text-muted mb-0">
              Connect and chat with other users.
            </p>
          </div>
        </div>

        {/* =================================================
            User List
        ================================================= */}

        {users.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="text-center py-5">
              <FaUser
                size={45}
                className="text-muted mb-3"
              />

              <h5 className="fw-bold">
                No other users found
              </h5>

              <p className="text-muted mb-0">
                Once other users register,
                they will appear here.
              </p>
            </Card.Body>
          </Card>
        ) : (
          <Card
            className="border-0 shadow-sm overflow-hidden"
            style={{
              borderRadius: "24px",
              background: "#fff",
            }}
          >
            <Card.Body className="p-0">
              {sortedUsers.map(
                (user, index) => {
                  const unread =
                    unreadCounts[
                      user.uid
                    ] || 0;

                  const lastMessage =
                    lastMessages[
                      user.uid
                    ] || "";

                  return (
                    <div
                      key={user.uid}
                      onClick={() =>
                        handleMessage(
                          user.uid,
                        )
                      }
                      style={{
                        cursor:
                          "pointer",

                        padding:
                          "16px 20px",

                        borderBottom:
                          index !==
                          sortedUsers.length -
                            1
                            ? "1px solid #edf0f2"
                            : "none",

                        background:
                          unread > 0
                            ? "#fff8f8"
                            : "#fff",

                        transition:
                          "all 0.2s ease",
                      }}
                      onMouseEnter={(
                        e,
                      ) => {
                        e.currentTarget.style.background =
                          unread > 0
                            ? "#fff1f1"
                            : "#f8f9fa";

                        e.currentTarget.style.transform =
                          "translateX(3px)";
                      }}
                      onMouseLeave={(
                        e,
                      ) => {
                        e.currentTarget.style.background =
                          unread > 0
                            ? "#fff8f8"
                            : "#fff";

                        e.currentTarget.style.transform =
                          "translateX(0)";
                      }}
                    >
                      <div className="d-flex align-items-center">

                        {/* =================================================
                            Profile Photo
                        ================================================= */}

                        <div
                          className="flex-shrink-0"
                          style={{
                            width:
                              "58px",
                            height:
                              "58px",
                          }}
                        >
                          <div
                            className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center"
                            style={{
                              width:
                                "58px",
                              height:
                                "58px",

                              background:
                                "#f1f3f5",

                              border:
                                unread >
                                0
                                  ? "3px solid #dc3545"
                                  : "3px solid #e9ecef",

                              transition:
                                "all 0.2s ease",
                            }}
                          >
                            {user.photo ? (
                              <img
                                src={
                                  user.photo
                                }
                                alt={
                                  user.name
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
                                size={
                                  24
                                }
                                className="text-secondary"
                              />
                            )}
                          </div>
                        </div>

                        {/* =================================================
                            Name + Last Message
                        ================================================= */}

                        <div
                          className="flex-grow-1 ms-3"
                          style={{
                            minWidth:
                              0,
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between gap-2">
                            <h6
                              className={
                                unread >
                                0
                                  ? "mb-0 fw-bold"
                                  : "mb-0 fw-semibold"
                              }
                              style={{
                                whiteSpace:
                                  "nowrap",

                                overflow:
                                  "hidden",

                                textOverflow:
                                  "ellipsis",
                              }}
                            >
                              {
                                user.name
                              }
                            </h6>

                            {/* Unread Count */}

                            {unread >
                              0 && (
                              <Badge
                                bg="danger"
                                pill
                                className="flex-shrink-0"
                              >
                                {
                                  unread
                                }
                              </Badge>
                            )}
                          </div>

                          <div
                            className={`small mt-1 ${
                              unread >
                              0
                                ? "fw-semibold text-dark"
                                : "text-muted"
                            }`}
                            style={{
                              overflow:
                                "hidden",

                              textOverflow:
                                "ellipsis",

                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {lastMessage ||
                              "Start a conversation"}
                          </div>
                        </div>

                        {/* =================================================
                            Message Button
                        ================================================= */}

                        <div className="ms-3 flex-shrink-0">
                          <Button
                            variant={
                              unread >
                              0
                                ? "danger"
                                : "outline-dark"
                            }
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={(
                              e,
                            ) => {
                              e.stopPropagation();

                              handleMessage(
                                user.uid,
                              );
                            }}
                          >
                            <FaComments />

                            <span className="d-none d-md-inline ms-1">
                              {unread >
                              0
                                ? "Reply"
                                : "Message"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </Card.Body>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default UserList;