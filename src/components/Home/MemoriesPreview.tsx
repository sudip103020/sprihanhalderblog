import { useEffect, useState } from "react";

import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Carousel,
  Badge,
  Button,
} from "react-bootstrap";

import {
  FaCamera,
  FaArrowRight,
} from "react-icons/fa";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase/config";

import { Link } from "react-router-dom";

// =====================================================
// Interface
// =====================================================

interface MemoryImage {
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
  images: MemoryImage[];
}

// =====================================================
// Component
// =====================================================

const MemoriesPreview = () => {
  const [memories, setMemories] = useState<Memory[]>([]);

  const [loading, setLoading] = useState(true);

  // =====================================================
  // Load Public Memories
  // =====================================================

  useEffect(() => {
    const loadPublicMemories = async () => {
      try {
        setLoading(true);

        const snapshot = await getDocs(
          collection(db, "memories")
        );

        const publicMemories: Memory[] = [];

        snapshot.docs.forEach((item) => {
          const data = item.data();

          // ============================================
          // New media structure
          // ============================================

          const media: MemoryImage[] = Array.isArray(
            data.media
          )
            ? data.media
            : [];

          // ============================================
          // Old images structure
          // ============================================

          const oldImages: MemoryImage[] = Array.isArray(
            data.images
          )
            ? data.images
            : [];

          // media থাকলে media ব্যবহার করবে
          // না থাকলে পুরোনো images ব্যবহার করবে
          const allImages =
            media.length > 0
              ? media
              : oldImages;

          // ============================================
          // Only Public Images
          // ============================================

          const publicImages = allImages.filter(
            (image) =>
              image.visibility === "public"
          );

          // ============================================
          // Public image থাকলেই memory দেখাবে
          // ============================================

          if (publicImages.length > 0) {
            publicMemories.push({
              id: item.id,

              date: data.date || "",

              type: data.type || "",

              description:
                data.description || "",

              comment:
                data.comment || "",

              images: publicImages,
            });
          }
        });

        // ============================================
        // Latest Memory First
        // ============================================

        publicMemories.sort((a, b) =>
          b.date.localeCompare(a.date)
        );

        setMemories(publicMemories);
      } catch (error) {
        console.error(
          "Load public memories error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadPublicMemories();
  }, []);

  // =====================================================
  // Memory Type
  // =====================================================

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

  // =====================================================
  // Loading
  // =====================================================

  if (loading) {
    return (
      <section
        className="memories-section"
        id="memories"
      >
        <Container>
          <div className="text-center py-5">

            <Spinner animation="border" />

            <p className="text-muted mt-3 mb-0">
              Loading memories...
            </p>

          </div>
        </Container>
      </section>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <section
      className="memories-section"
      id="memories"
    >
      <Container>

        {/* =========================================
            Section Heading
        ========================================== */}

        <div className="section-heading text-center">

          <p className="section-subtitle">
            Beautiful moments
          </p>

          <h2 className="section-title">
            My <span>Memories</span>
          </h2>

          <p>
            Some little moments from my journey.
          </p>

        </div>

        {/* =========================================
            No Memories
        ========================================== */}

        {memories.length === 0 ? (

          <div className="text-center py-5">

            <FaCamera className="fs-1 text-muted mb-3" />

            <p className="text-muted mb-0">
              No public memories available.
            </p>

          </div>

        ) : (

          <>
            {/* =========================================
                Latest 3 Memories
            ========================================== */}

            <Row className="g-4 mt-2">

              {memories
                .slice(0, 3)
                .map((memory) => (

                  <Col
                    xs={12}
                    sm={6}
                    lg={4}
                    key={memory.id}
                  >

                    <Card
                      className="memory-card h-100 border-0 shadow-sm"
                    >

                      {/* =================================
                          Public Images Carousel
                      ================================= */}

                      <div
                        className="memory-image"
                        style={{
                          height: "280px",
                          background: "#111",
                          overflow: "hidden",
                        }}
                      >

                        <Carousel
                          interval={null}
                          indicators={
                            memory.images.length > 1
                          }
                          controls={
                            memory.images.length > 1
                          }
                          fade
                        >

                          {memory.images.map(
                            (image, index) => (

                              <Carousel.Item
                                key={
                                  image.publicId ||
                                  `${memory.id}-${index}`
                                }
                              >

                                {image.mediaType ===
                                "video" ? (

                                  <video
                                    src={image.url}
                                    className="d-block w-100"
                                    style={{
                                      height: "280px",
                                      objectFit: "cover",
                                    }}
                                    controls
                                  />

                                ) : (

                                  <img
                                    src={image.url}
                                    alt={
                                      memory.description ||
                                      `Sprihan Memory ${
                                        index + 1
                                      }`
                                    }
                                    className="d-block w-100"
                                    style={{
                                      height: "280px",
                                      objectFit: "cover",
                                    }}
                                  />

                                )}

                              </Carousel.Item>

                            )
                          )}

                        </Carousel>

                      </div>

                      {/* =================================
                          Card Content
                      ================================= */}

                   {/* =================================
    Card Content
================================= */}

<Card.Body>

  <div className="d-flex justify-content-between align-items-center mb-2">

    <small className="text-muted">
      {memory.date}
    </small>

    {memory.images.length > 1 && (
      <Badge
        bg="light"
        text="dark"
        className="border"
      >
        {memory.images.length}{" "}
        {memory.images.length === 1
          ? "Photo"
          : "Photos"}
      </Badge>
    )}

  </div>

  <Card.Title>
    {getTypeName(memory.type)}
  </Card.Title>

  <Card.Text
    style={{
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    }}
  >
    {memory.description ||
      "A beautiful memory from my journey."}
  </Card.Text>

  {/* =================================
      Read More
  ================================== */}

  <Link
    to={`/memory/${memory.id}`}
    className="btn btn-outline-dark btn-sm mt-2"
  >
    Read More
    <FaArrowRight className="ms-2" />
  </Link>

</Card.Body>

                    </Card>

                  </Col>

                ))}

            </Row>

            {/* =========================================
                View All Memories Button
            ========================================== */}

            <div className="text-center mt-5">

              <Link
               
                to="/memories"
                
                className="px-4 py-2"
              >
                View All Memories
                <FaArrowRight className="ms-2" />
              </Link>

            </div>
          </>
        )}

      </Container>
    </section>
  );
};

export default MemoriesPreview;