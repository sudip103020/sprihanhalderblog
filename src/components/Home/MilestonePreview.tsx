import { Container, Card } from "react-bootstrap";
import { FaMapMarkerAlt, FaHeart, FaExternalLinkAlt } from "react-icons/fa";

const MemoriesPreview = () => {
  const mapUrl =
    "https://www.google.com/maps?q=23.6920001,90.4320026&z=17&output=embed";

  const googleMapsUrl =
    "https://maps.app.goo.gl/quDzaLatVXTgGY9D6";

  return (
    <section
      className="memories-section"
      id="memories"
    >
      <Container>

        {/* ================================
            Heading
        ================================= */}

        <div className="section-heading text-center">

          <p className="section-subtitle">
            Where my journey began
          </p>

          <h2 className="section-title">
            My <span>Birthplace</span>
          </h2>

          <p>
            A special place where my beautiful journey began.
          </p>

        </div>

        {/* ================================
            Birthplace Card
        ================================= */}

        <Card
          className="border-0 shadow-sm overflow-hidden mt-4"
          style={{
            borderRadius: "20px",
          }}
        >

          {/* ================================
              Map
          ================================= */}

          <div
            style={{
              width: "100%",
              height: "400px",
              overflow: "hidden",
            }}
          >

            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{
                border: 0,
              }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title="Sprihan's Birthplace"
            />

          </div>

          {/* ================================
              Content
          ================================= */}

          <div className="p-4 text-center">

            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
              style={{
                width: "55px",
                height: "55px",
                background: "#fff0f3",
                color: "#e63956",
              }}
            >
              <FaMapMarkerAlt size={22} />
            </div>

            <h4 className="fw-bold mb-2">
              <FaHeart
                className="me-2"
                style={{ color: "#e63956" }}
              />

              My Birthplace
            </h4>

            <p className="text-muted mb-3">
              This is the special place where my beautiful
              journey began. A place that will always remain
              close to my heart.
            </p>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-dark px-4"
            >
              <FaMapMarkerAlt className="me-2" />

              Open in Google Maps

              <FaExternalLinkAlt
                className="ms-2"
                size={12}
              />
            </a>

          </div>

        </Card>

      </Container>
    </section>
  );
};

export default MemoriesPreview;