import { useEffect, useState } from "react";

import {
  Container,
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
} from "react-icons/fa";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { Link, useNavigate, useParams } from "react-router-dom";

import { db } from "../firebase/config";

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

const MemoryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [memory, setMemory] = useState<Memory | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ===================================================
  // Load Memory
  // ===================================================

  useEffect(() => {
    const loadMemory = async () => {
      if (!id) {
        setError("Memory not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const memoryRef = doc(db, "memories", id);

        const snapshot = await getDoc(memoryRef);

        if (!snapshot.exists()) {
          setError("Memory not found.");
          return;
        }

        const data = snapshot.data();

        // =============================================
        // New media field
        // =============================================

        let media: MemoryMedia[] = [];

        if (Array.isArray(data.media)) {
          media = data.media;
        }

        // =============================================
        // Old images field compatibility
        // =============================================

        else if (Array.isArray(data.images)) {
          media = data.images;
        }

        // =============================================
        // Only public media
        // =============================================

        const publicMedia = media.filter(
          (item) => item.visibility === "public"
        );

        setMemory({
          id: snapshot.id,

          date: data.date || "",

          type: data.type || "",

          description: data.description || "",

          comment: data.comment || "",

          media: publicMedia,
        });
      } catch (error) {
        console.error(
          "Memory details error:",
          error
        );

        setError(
          "Memory details load করতে সমস্যা হয়েছে।"
        );
      } finally {
        setLoading(false);
      }
    };

    loadMemory();
  }, [id]);

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
      <section className="py-5">
        <Container>
          <div className="text-center py-5">
            <Spinner animation="border" />

            <p className="text-muted mt-3">
              Loading memory...
            </p>
          </div>
        </Container>
      </section>
    );
  }

  // ===================================================
  // Error
  // ===================================================

  if (error || !memory) {
    return (
      <section className="py-5">
        <Container>
          <Alert
            variant="danger"
            className="text-center"
          >
            {error || "Memory not found."}
          </Alert>

          <div className="text-center mt-4">
            <ButtonBack />
          </div>
        </Container>
      </section>
    );
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <section
      className="py-5"
      style={{
        background: "#f8f9fa",
        minHeight: "80vh",
      }}
    >
      <Container>

        {/* Back Button */}

        <div className="mb-4">
          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="me-2" />
            Back
          </button>
        </div>

        {/* Memory */}

        <Card className="border-0 shadow-sm">

          {/* Media */}

          {memory.media.length > 0 && (
            <div
              style={{
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

                      {media.mediaType ===
                      "video" ? (
                        <video
                          src={media.url}
                          className="d-block w-100"
                          style={{
                            maxHeight: "600px",
                            objectFit: "contain",
                            background: "#111",
                          }}
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={media.url}
                          alt={
                            memory.description ||
                            `Memory ${
                              index + 1
                            }`
                          }
                          className="d-block w-100"
                          style={{
                            maxHeight: "600px",
                            objectFit: "contain",
                            background: "#111",
                          }}
                        />
                      )}

                    </Carousel.Item>
                  )
                )}
              </Carousel>
            </div>
          )}

          {/* Content */}

          <Card.Body className="p-4 p-md-5">

            {/* Type + Media Count */}

            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">

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
                <Badge
                  bg="light"
                  text="dark"
                  className="border"
                >
                  <FaImages className="me-1" />

                  {memory.media.length} Media
                </Badge>
              )}

            </div>

            {/* Date */}

            {memory.date && (
              <p className="text-muted mb-2">
                {memory.date}
              </p>
            )}

            {/* Title */}

            <h1 className="fw-bold mb-4">
              {getTypeName(memory.type)}
            </h1>

            {/* Description */}

            {memory.description && (
              <div className="mb-4">
                <h5 className="fw-bold">
                  Description
                </h5>

                <p
                  className="text-muted"
                  style={{
                    whiteSpace: "pre-line",
                  }}
                >
                  {memory.description}
                </p>
              </div>
            )}

            {/* Comment */}

            {memory.comment && (
              <div className="mb-4">
                <h5 className="fw-bold">
                  Comment
                </h5>

                <p
                  className="text-muted"
                  style={{
                    whiteSpace: "pre-line",
                  }}
                >
                  {memory.comment}
                </p>
              </div>
            )}

          </Card.Body>
        </Card>

        {/* Bottom Navigation */}

        <div className="d-flex justify-content-center gap-2 mt-4 flex-wrap">

          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="me-2" />
            Back to Memories
          </button>

          <Link
            to="/"
            className="btn btn-dark"
          >
            Back to Home
          </Link>

        </div>

      </Container>
    </section>
  );
};

// =====================================================
// Back Button Component
// =====================================================

const ButtonBack = () => {
  return (
    <Link
      to="/memories"
      className="btn btn-outline-dark"
    >
      <FaArrowLeft className="me-2" />
      Back to Memories
    </Link>
  );
};

export default MemoryDetails;