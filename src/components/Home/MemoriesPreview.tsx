import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner } from "react-bootstrap";
import { FaCamera, FaArrowRight } from "react-icons/fa";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";

interface MemoryImage {
  url: string;
  publicId: string;
  visibility: "public" | "private";
  name: string;
}

interface Memory {
  id: string;
  date: string;
  type: string;
  description: string;
  comment: string;
  images: MemoryImage[];
}

const MemoriesPreview = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPublicMemories = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "memories")
        );

        const publicMemories: Memory[] = [];

        snapshot.docs.forEach((item) => {
          const data = item.data();

          const images: MemoryImage[] = data.images || [];

          // শুধুমাত্র Public ছবি
          const publicImages = images.filter(
            (image) => image.visibility === "public"
          );

          // Private ছবি বাদ দেওয়ার পর যদি কোনো Public ছবি থাকে
          if (publicImages.length > 0) {
            publicMemories.push({
              id: item.id,
              date: data.date || "",
              type: data.type || "",
              description: data.description || "",
              comment: data.comment || "",
              images: publicImages,
            });
          }
        });

        // Date অনুযায়ী latest আগে
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

  const getTypeName = (type: string) => {
    switch (type) {
      case "prescription":
        return "Prescription";

      case "travel":
        return "Travel";

      case "general":
        return "General Memory";

      case "other":
        return "Other";

      default:
        return type;
    }
  };

  return (
    <section
      className="memories-section"
      id="memories"
    >
      <Container>
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

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />

            <p className="text-muted mt-3">
              Loading memories...
            </p>
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-5">
            <FaCamera className="fs-1 text-muted mb-3" />

            <p className="text-muted mb-0">
              No public memories available.
            </p>
          </div>
        ) : (
          <Row className="g-4 mt-2">
            {memories.slice(0, 3).map((memory) => (
              <Col
                md={4}
                key={memory.id}
              >
                <Card className="memory-card h-100">
                  {/* First public image */}
                  <div className="memory-image">
                    <img
                      src={memory.images[0].url}
                      alt={
                        memory.description ||
                        "Sprihan Memory"
                      }
                      className="w-100 h-100"
                      style={{
                        objectFit: "cover",
                      }}
                    />
                  </div>

                  <Card.Body>
                    <small className="text-muted">
                      {memory.date}
                    </small>

                    <Card.Title className="mt-2">
                      {getTypeName(memory.type)}
                    </Card.Title>

                    <Card.Text>
                      {memory.description ||
                        "A beautiful memory from my journey."}
                    </Card.Text>

                    <a
                      href="#memories"
                      className="memory-link"
                    >
                      View Memories{" "}
                      <FaArrowRight />
                    </a>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </section>
  );
};

export default MemoriesPreview;