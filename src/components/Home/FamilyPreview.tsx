import { useEffect, useState } from "react";

import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Badge,
} from "react-bootstrap";

import {
  FaHeart,
  FaUsers,
  FaUser,
} from "react-icons/fa";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../firebase/config";

// =====================================================
// Interface
// =====================================================

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  photoURL: string;
  description: string;
  showOnHome: boolean;
  order: number;
}

// =====================================================
// Component
// =====================================================

const FamilyPreview = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ===================================================
  // Load Family Members
  // ===================================================

  useEffect(() => {
    const loadFamilyMembers = async () => {
      try {
        setLoading(true);
        setError("");

        // -----------------------------------------------
        // IMPORTANT:
        // এখানে orderBy ব্যবহার করছি না।
        // তাই Composite Index লাগবে না।
        // -----------------------------------------------

        const familyQuery = query(
          collection(db, "familyMembers"),
          where("showOnHome", "==", true)
        );

        const snapshot = await getDocs(familyQuery);

        // -----------------------------------------------
        // Convert Firestore Data
        // -----------------------------------------------

        const data: FamilyMember[] = snapshot.docs.map(
          (item) => {
            const raw = item.data();

            return {
              id: item.id,

              name: raw.name || "",

              relation: raw.relation || "",

              photoURL: raw.photoURL || "",

              description: raw.description || "",

              showOnHome: raw.showOnHome ?? true,

              order: Number(raw.order) || 1,
            };
          }
        );

        // -----------------------------------------------
        // Sort by Display Order
        // -----------------------------------------------

        data.sort((a, b) => a.order - b.order);

        setMembers(data);
      } catch (error) {
        console.error(
          "Family members load error:",
          error
        );

        setError(
          "Family information load করতে সমস্যা হয়েছে।"
        );
      } finally {
        setLoading(false);
      }
    };

    loadFamilyMembers();
  }, []);

  // ===================================================
  // Loading
  // ===================================================

  if (loading) {
    return (
      <section className="family-section">
        <Container>
          <div className="text-center py-5">

            <Spinner animation="border" />

            <p className="text-muted mt-3 mb-0">
              Loading family...
            </p>

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
      className="family-section"
      id="family"
    >
      <Container>

        {/* ============================================
            Section Header
        ============================================= */}

        <Row className="justify-content-center text-center">

          <Col lg={8}>

            <h2 className="section-title">
              <FaHeart />  My <span>Family</span>
            </h2>

            <p className="section-text">
              The people who fill my little world
              with love, care, happiness, and
              beautiful memories.
            </p>

          </Col>

        </Row>

        {/* ============================================
            Error
        ============================================= */}

        {error && (
          <Row className="justify-content-center mt-4">

            <Col lg={8}>

              <Alert
                variant="danger"
                className="text-center"
              >
                {error}
              </Alert>

            </Col>

          </Row>
        )}

        {/* ============================================
            No Family Members
        ============================================= */}

        {!error && members.length === 0 && (
          <Row className="justify-content-center mt-4">

            <Col
              lg={6}
              className="text-center"
            >

              <FaUsers
                className="fs-1 text-muted mb-3"
              />

              <h5 className="fw-bold">
                Family information coming soon
              </h5>

              <p className="text-muted">
                Beautiful family members and
                moments will appear here.
              </p>

            </Col>

          </Row>
        )}

        {/* ============================================
            Family Cards
        ============================================= */}

        {members.length > 0 && (
          <Row
            className="
              g-4
              mt-3
              justify-content-center
            "
          >

            {members.map((member) => (
              <Col
                key={member.id}
                xs={12}
                sm={6}
                md={4}
                lg={3}
              >

                <Card
                  className="
                    family-card
                    h-100
                    border-0
                    shadow-sm
                  "
                >

                  {/* ==================================
                      Photo
                  =================================== */}

                  <div className="family-photo-box">

                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.name}
                        className="family-photo"
                        loading="lazy"
                      />
                    ) : (
                      <div className="family-photo-placeholder">

                        <FaUser />

                      </div>
                    )}

                  </div>

                  {/* ==================================
                      Content
                  =================================== */}

                  <Card.Body className="text-center p-3">

                    {/* Relation */}

                    {member.relation && (
                      <Badge
                        bg="light"
                        text="dark"
                        className="
                          family-relation
                          mb-2
                          border
                        "
                      >
                        {member.relation}
                      </Badge>
                    )}

                    {/* Name */}

                    <h5 className="family-name fw-bold mb-2">
                      {member.name}
                    </h5>

                    {/* Description */}

                    {member.description && (
                      <p className="family-description text-muted small mb-0">
                        {member.description}
                      </p>
                    )}

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

export default FamilyPreview;