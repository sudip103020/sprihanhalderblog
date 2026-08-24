import { useEffect, useState } from "react";

import { collection, onSnapshot, query, where } from "firebase/firestore";

import { onAuthStateChanged, signOut } from "firebase/auth";

import { useNavigate } from "react-router-dom";

import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Badge,
} from "react-bootstrap";

import { FaUser, FaComments, FaSignOutAlt, FaEdit } from "react-icons/fa";

import { auth, db } from "../firebase/config";

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
}

const UserList = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // Load Auth + Users
  // =====================================================

  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
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
          let loggedInUser: UserData | null = null;

          snapshot.forEach((userDoc) => {
            const data = userDoc.data();

            const uid = data.uid || userDoc.id;

            const userData: UserData = {
              uid,
              name: data.name || "Unknown User",
              email: data.email || "",
              photo: data.photo || "",
              role: data.role || "user",
            };

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
          console.error("Users listener error:", snapshotError);

          if (snapshotError.code === "permission-denied") {
            setError("You do not have permission to view users.");
          } else {
            setError("Unable to load users.");
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
      return;
    }

    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
    );

    const messageUnsubscribers: (() => void)[] = [];

    const unsubscribeConversations = onSnapshot(
      conversationsQuery,
      (snapshot) => {
        const latestMessages: Record<string, string> = {};

        snapshot.forEach((conversationDoc) => {
          const data = conversationDoc.data() as ConversationData;

          const otherUserId = data.participants?.find(
            (id) => id !== currentUser.uid,
          );

          if (!otherUserId) return;

          latestMessages[otherUserId] = data.lastMessage || "";

          const messagesQuery = query(
            collection(db, "conversations", conversationDoc.id, "messages"),
            where("receiverId", "==", currentUser.uid),
            where("seen", "==", false),
          );

          const unsubscribeMessages = onSnapshot(
            messagesQuery,
            (messageSnapshot) => {
              setUnreadCounts((prev) => ({
                ...prev,
                [otherUserId]: messageSnapshot.size,
              }));
            },
            (messageError) => {
              if (messageError.code !== "permission-denied") {
                console.error("Message listener error:", messageError);
              }
            },
          );

          messageUnsubscribers.push(unsubscribeMessages);
        });

        setLastMessages(latestMessages);
      },
      (conversationError) => {
        if (conversationError.code !== "permission-denied") {
          console.error("Conversation listener error:", conversationError);
        }
      },
    );

    return () => {
      unsubscribeConversations();

      messageUnsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUser]);

  // =====================================================
  // Logout
  // =====================================================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      navigate("/admin/login", {
        replace: true,
      });
    } catch (logoutError) {
      console.error("Logout error:", logoutError);

      setError("Logout failed. Please try again.");
    }
  };

  // =====================================================
  // Open Chat
  // =====================================================

  const handleMessage = (userId: string) => {
    navigate(`/messages/${userId}`);
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

        {/* =================================================
    Premium Header
================================================= */}

        <div className="d-flex justify-content-between align-items-center mb-4">
  <div>
    

   
  </div>

  <Button
    variant="outline-danger"
    className="rounded-pill px-4"
    onClick={handleLogout}
  >
    <FaSignOutAlt className="me-2" />
    Logout
  </Button>
</div>

        {/* Error */}

        {error && <Alert variant="danger">{error}</Alert>}

        {/* =================================================
            My Profile
        ================================================= */}

        {/* =================================================
    My Profile
================================================= */}

{currentUser && (
  <Card
    className="border-0 shadow-lg mb-5"
    style={{
      borderRadius: "24px",
      background:
        "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
      color: "#fff",
      overflow: "hidden",
    }}
  >
    <Card.Body className="p-4 p-md-5">
      <Row className="align-items-center g-4">

        {/* Profile Image */}
        <Col xs="auto">
          <div
            className="d-flex align-items-center justify-content-center overflow-hidden"
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              background: "#fff",
              border: "4px solid rgba(255,255,255,0.25)",
              boxShadow:
                "0 8px 25px rgba(0,0,0,0.25)",
            }}
          >
            {currentUser.photo ? (
              <img
                src={currentUser.photo}
                alt={currentUser.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <FaUser
                size={35}
                className="text-secondary"
              />
            )}
          </div>
        </Col>

        {/* Profile Info */}
        <Col>
          <div className="d-flex align-items-center flex-wrap gap-2 mb-2">

            <h4 className="fw-bold mb-0">
              {currentUser.name}
            </h4>

            <Badge
              bg="light"
              text="dark"
              pill
            >
              You
            </Badge>

            {currentUser.role === "admin" && (
              <Badge
                bg="warning"
                text="dark"
                pill
              >
                Administrator
              </Badge>
            )}

          </div>

          <p className="mb-1 opacity-75">
            {currentUser.email}
          </p>

          <small className="opacity-75">
            <FaUser className="me-1" />
            Logged in account
          </small>
        </Col>

        {/* Actions */}
        <Col
          xs={12}
          md="auto"
        >
          <div className="d-flex flex-wrap gap-2">

            {/* Edit Profile */}
            <Button
              variant="light"
              className="rounded-pill px-4 fw-semibold"
              onClick={() =>
                navigate("/user/profile")
              }
            >
              <FaEdit className="me-2" />
              Edit Profile
            </Button>

            {/* Dashboard - Admin Only */}
            {currentUser.role === "admin" && (
              <Button
                variant="outline-light"
                className="rounded-pill px-4 fw-semibold"
                onClick={() =>
                  navigate("/admin/dashboard")
                }
              >
                Dashboard
              </Button>
            )}

          </div>
        </Col>

      </Row>
    </Card.Body>
  </Card>
)}
        {/* =================================================
            Other Users
        ================================================= */}

        <div className="mb-3">
          <h4 className="fw-bold mb-1">Other Users</h4>

          <p className="text-muted">Select a user to start chatting.</p>
        </div>

        {users.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="text-center py-5">
              <FaUser size={45} className="text-muted mb-3" />

              <h5>No other users found</h5>

              <p className="text-muted mb-0">
                Once other users register, they will appear here.
              </p>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-4">
            {users.map((user) => {
              const unread = unreadCounts[user.uid] || 0;

              const lastMessage = lastMessages[user.uid] || "";

              return (
                <Col key={user.uid} xs={12} sm={6} md={4} lg={3}>
                  <Card
                    className="border-0 shadow-sm h-100"
                    style={{
                      borderRadius: "20px",
                    }}
                  >
                    <Card.Body className="text-center p-4">
                      {/* Avatar */}

                      <div
                        className="mx-auto mb-3 d-flex align-items-center justify-content-center overflow-hidden"
                        style={{
                          width: "80px",
                          height: "80px",
                          borderRadius: "50%",
                          background: "#e9ecef",
                        }}
                      >
                        {user.photo ? (
                          <img
                            src={user.photo}
                            alt={user.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <FaUser size={32} className="text-secondary" />
                        )}
                      </div>

                      {/* Name */}

                      <div className="d-flex justify-content-center align-items-center gap-2">
                        <h5 className="fw-bold mb-1">{user.name}</h5>

                        {unread > 0 && (
                          <Badge bg="danger" pill>
                            {unread}
                          </Badge>
                        )}
                      </div>

                      {/* Email */}

                      <p
                        className="text-muted small mb-2"
                        style={{
                          wordBreak: "break-word",
                        }}
                      >
                        {user.email}
                      </p>

                      {/* Last Message */}

                      {lastMessage && (
                        <div
                          className={`small mb-2 ${
                            unread > 0 ? "fw-semibold text-dark" : "text-muted"
                          }`}
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {lastMessage}
                        </div>
                      )}

                      {/* Role */}

                      <Badge
                        bg={user.role === "admin" ? "dark" : "light"}
                        text={user.role === "admin" ? "light" : "dark"}
                        className="mb-3"
                      >
                        {user.role === "admin" ? "Administrator" : "User"}
                      </Badge>

                      {/* Message */}

                      <Button
                        variant={unread > 0 ? "danger" : "dark"}
                        className="w-100 rounded-pill"
                        onClick={() => handleMessage(user.uid)}
                      >
                        <FaComments className="me-2" />

                        {unread > 0 ? `${unread} New Message` : "Message"}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>
    </div>
  );
};

export default UserList;
