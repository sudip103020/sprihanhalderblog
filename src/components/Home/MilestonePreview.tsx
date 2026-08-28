import { Container, Card } from "react-bootstrap";
import {
  FaMapMarkerAlt,
  FaExternalLinkAlt,
} from "react-icons/fa";

const MemoriesPreview = () => {
  const mapUrl =
    "https://www.google.com/maps?q=23.6920001,90.4320026&z=17&output=embed";

  const googleMapsUrl =
    "https://maps.app.goo.gl/quDzaLatVXTgGY9D6";

  return (
    <section
      className="memories-section birthplace-section"
      id="memories"
    >
      <Container>

        {/* ================================
            Heading
        ================================= */}

        <div className="section-heading text-center">

            <h2 className="section-title">
                        <FaMapMarkerAlt />  My <span>Birthplace</span>
                      </h2>

          

          <p>
            This is the special place where my beautiful
              journey began. A place that will always remain
              close to my heart.
          </p>

        </div>

        {/* ================================
            Birthplace Card
        ================================= */}

        <Card className="birthplace-card border-0 shadow-sm">

          {/* ================================
              Map
          ================================= */}

          <div className="birthplace-map">

            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title="Sprihan's Birthplace"
            />

          </div>

          {/* ================================
              Content
          ================================= */}

          <div className="birthplace-content text-center">

          

            

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-dark birthplace-button"
            >

              <FaMapMarkerAlt className="me-2" />

              Open in Google Maps

              <FaExternalLinkAlt
                className="ms-2"
                size={11}
              />

            </a>

          </div>

        </Card>

      </Container>
    </section>
  );
};

export default MemoriesPreview;

