import { Container, Row, Col, Card } from "react-bootstrap";
import { FaCamera, FaArrowRight } from "react-icons/fa";

const memories = [
  {
    id: 1,
    title: "My First Days",
    description: "The beginning of my beautiful journey.",
  },
  {
    id: 2,
    title: "Growing Up",
    description: "Little moments that made everyone smile.",
  },
  {
    id: 3,
    title: "Happy Moments",
    description: "Special memories with my family.",
  },
];

const MemoriesPreview = () => {
  return (
    <section className="memories-section" id="memories">
      <Container>
        <div className="section-heading text-center">
          <p className="section-subtitle">Beautiful moments</p>

          <h2 className="section-title">
            My <span>Memories</span>
          </h2>

          <p>Some little moments from my journey.</p>
        </div>

        <Row className="g-4 mt-2">
          {memories.map((memory) => (
            <Col md={4} key={memory.id}>
              <Card className="memory-card">
                <div className="memory-image">
                  <FaCamera />
                </div>

                <Card.Body>
                  <Card.Title>{memory.title}</Card.Title>

                  <Card.Text>{memory.description}</Card.Text>

                  <a href="#memories" className="memory-link">
                    View Memories <FaArrowRight />
                  </a>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default MemoriesPreview;