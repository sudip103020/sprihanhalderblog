import { useEffect, useState } from "react";

import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Badge,
  Carousel,
} from "react-bootstrap";

import {
  FaCamera,
  FaVideo,
  FaArrowLeft,
  FaImages,
    FaArrowRight,
} from "react-icons/fa";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase/config";

import { Link } from "react-router-dom";

// =====================================================
// Interface
// =====================================================

interface MemoryMedia {
  url: string;
  publicId?: string;
  visibility: "public" | "private";
  name?: string;
  mediaType?: "image" | "video";
}

interface Memory {
  id: string;
  date: string;
  type: string;
  description: string;
  comment: string;
  media: MemoryMedia[];
}

// =====================================================
// Component
// =====================================================

const Memories = () => {
  const [memories, setMemories] = useState<Memory[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ===================================================
  // Load Memories
  // ===================================================

  useEffect(() => {
    const loadMemories = async () => {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "memories")
        );

        const publicMemories: Memory[] = [];

        snapshot.docs.forEach((item) => {
          const data = item.data();

          // =========================================
          // New media field
          // =========================================

          let media: MemoryMedia[] = [];

          if (Array.isArray(data.media)) {
            media = data.media;
          }

          // =========================================
          // Old images field compatibility
          // =========================================

          else if (Array.isArray(data.images)) {
            media = data.images;
          }

          // =========================================
          // Only Public Media
          // =========================================

          const publicMedia = media.filter(
            (item) => item.visibility === "public"
          );

          // No public media হলে Memory দেখাবে না
          if (publicMedia.length === 0) {
            return;
          }

          publicMemories.push({
            id: item.id,

            date: data.date || "",

            type: data.type || "",

            description:
              data.description || "",

            comment:
              data.comment || "",

            media: publicMedia,
          });
        });

        // =========================================
        // Latest first
        // =========================================

        publicMemories.sort((a, b) =>
          b.date.localeCompare(a.date)
        );

        setMemories(publicMemories);
      } catch (error) {
        console.error(
          "Load memories error:",
          error
        );

        setError(
          "Memories load করতে সমস্যা হয়েছে।"
        );
      } finally {
        setLoading(false);
      }
    };

    loadMemories();
  }, []);

  // ===================================================
  // Type Name
  // ===================================================

  const getTypeName = (type: string) => {
    switch (type) {
      case "prescription":
        return "Prescription";

      case "travel":
        return "Travel";

      case "general":
        return "General Memory";

      case "video":
        return "Video";

      case "program":
        return "Program / Event";

      case "other":
        return "Other";

      default:
        return type || "Memory";
    }
  };

  // ===================================================
  // Loading
  // ===================================================

  if (loading) {
    return (
      <section className="memories-page py-5">
        <Container>
          <div className="text-center py-5">

            <Spinner animation="border" />

            <p className="text-muted mt-3">
              Loading memories...
            </p>

          </div>
        </Container>
      </section>
    );
  }

  // ===================================================
  // Render
  // ===================================================

  return (
    <section className="memories-page py-5">

      <Container>

        {/* ============================================
            Header
        ============================================= */}

        <div className="text-center mb-5">

          <p className="section-subtitle">
            Beautiful moments
          </p>

          <h1 className="section-title">
            My <span>Memories</span>
          </h1>

          <p className="text-muted">
            A collection of beautiful moments
            from Sprihan's journey.
          </p>

        </div>

        {/* ============================================
            Error
        ============================================= */}

        {error && (
          <Alert variant="danger">
            {error}
          </Alert>
        )}

        {/* ============================================
            No Memories
        ============================================= */}

        {!error &&
          memories.length === 0 && (
            <div className="text-center py-5">

              <FaCamera
                className="fs-1 text-muted mb-3"
              />

              <h5 className="fw-bold">
                No memories available
              </h5>

              <p className="text-muted">
                Beautiful memories will appear here.
              </p>

            </div>
          )}

        {/* ============================================
            Memories
        ============================================= */}

        {memories.length > 0 && (
          <Row className="g-4">

            {memories.map((memory) => (

              <Col
                xs={12}
                sm={6}
                lg={4}
                key={memory.id}
              >

                <Card
                  className="memory-card h-100 border-0 shadow-sm"
                >

                  {/* ==================================
                      Media Carousel
                  =================================== */}

                  <div
                    style={{
                      height: "250px",
                      overflow: "hidden",
                      background: "#111",
                    }}
                  >

                    <Carousel
                      interval={null}
                      indicators={
                        memory.media.length > 1
                      }
                      controls={
                        memory.media.length > 1
                      }
                      fade
                    >

                      {memory.media.map(
                        (media, index) => (

                          <Carousel.Item
                            key={
                              media.publicId ||
                              `${memory.id}-${index}`
                            }
                          >

                            {/* ========================
                                Video
                            ========================= */}

                            {media.mediaType ===
                            "video" ? (

                              <video
                                src={media.url}
                                className="d-block w-100"
                                style={{
                                  height: "250px",
                                  objectFit: "cover",
                                }}
                                controls
                                preload="metadata"
                              />

                            ) : (

                              /* ========================
                                 Image
                              ========================= */

                              <img
                                src={media.url}
                                alt={
                                  memory.description ||
                                  `Sprihan Memory ${
                                    index + 1
                                  }`
                                }
                                className="d-block w-100"
                                style={{
                                  height: "250px",
                                  objectFit: "cover",
                                }}
                              />

                            )}

                          </Carousel.Item>

                        )
                      )}

                    </Carousel>

                  </div>

                  {/* ==================================
                      Content
                  =================================== */}

                  <Card.Body>

                    {/* Media count */}

                    <div className="d-flex justify-content-between align-items-center mb-2">

                      <Badge
                        bg="light"
                        text="dark"
                        className="border"
                      >

                        {memory.media.some(
                          (item) =>
                            item.mediaType ===
                            "video"
                        ) ? (
                          <FaVideo className="me-1" />
                        ) : (
                          <FaCamera className="me-1" />
                        )}

                        {getTypeName(memory.type)}

                      </Badge>

                      {memory.media.length > 1 && (
                        <small className="text-muted">

                          <FaImages className="me-1" />

                          {memory.media.length}{" "}
                          Media

                        </small>
                      )}

                    </div>

                    {/* Date */}

                    <small className="text-muted">
                      {memory.date}
                    </small>

                    {/* Title */}

                    <Card.Title className="mt-2">
                      {getTypeName(memory.type)}
                    </Card.Title>

                    {/* Description */}

                    <Card.Text>
                      {memory.description ||
                        "A beautiful memory from Sprihan's journey."}
                    </Card.Text>

                    {/* Comment */}

                    {memory.comment && (
                      <p className="small text-muted mb-0">
                        {memory.comment}
                      </p>
                    )}

                    {/* Read More */}

<div className="mt-3">
  <Link
    to={`/memory/${memory.id}`}
    className="btn btn-outline-dark btn-sm"
  >
    Read More
    <FaArrowRight className="ms-2" />
  </Link>
</div>

                  </Card.Body>

                </Card>

              </Col>

            ))}

          </Row>
        )}

        {/* ============================================
            Back Home
        ============================================= */}

        <div className="text-center mt-5">

          <Link
            to="/"
            className="btn btn-outline-dark"
          >

            <FaArrowLeft className="me-2" />

            Back to Home

          </Link>

        </div>

      </Container>

    </section>
  );
};

export default Memories;