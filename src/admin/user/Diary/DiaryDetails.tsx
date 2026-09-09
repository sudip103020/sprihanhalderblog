import { useEffect, useMemo, useState } from "react";
import {
 
  Button,
 
  Col,
  Container,
  Image,
  Row,
  Spinner,
} from "react-bootstrap";
import {
  FiArrowLeft,

  FiBookOpen,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
  FiHome,
  FiImage,
  FiX,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../../../firebase/config";

import "./DiaryDetails.css";

// ======================================================
// TYPES
// ======================================================

interface Diary {
  id: string;
  title: string;
  date: string;
  content: string;
  coverImage?: string;
  images?: string[];
  status?: "published" | "draft";
  createdAt?: unknown;
  updatedAt?: unknown;
}

// ======================================================
// HELPERS
// ======================================================

const formatDate = (dateString: string) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getShortDate = (dateString: string) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ======================================================
// COMPONENT
// ======================================================

const DiaryDetails = () => {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();

  // ====================================================
  // STATES
  // ====================================================

  const [diary, setDiary] = useState<Diary | null>(null);

  const [allDiaries, setAllDiaries] = useState<Diary[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [activeImage, setActiveImage] = useState<
    string | null
  >(null);

  // ====================================================
  // LOAD DIARY
  // ====================================================

  useEffect(() => {
    if (!id) {
      setError("Diary not found.");
      setLoading(false);
      return;
    }

    const loadDiary = async () => {
      try {
        setLoading(true);
        setError("");

        const diaryRef = doc(db, "diaries", id);

        const diarySnap = await getDoc(diaryRef);

        if (!diarySnap.exists()) {
          setError("Diary not found.");
          setDiary(null);
          return;
        }

        const data = diarySnap.data();

        const loadedDiary: Diary = {
          id: diarySnap.id,

          title: data.title || "",

          date: data.date || "",

          content: data.content || "",

          coverImage: data.coverImage || "",

          images: Array.isArray(data.images)
            ? data.images
            : [],

          status:
            data.status === "draft"
              ? "draft"
              : "published",

          createdAt: data.createdAt,

          updatedAt: data.updatedAt,
        };

        // ----------------------------------------------
        // Don't show drafts publicly
        // ----------------------------------------------

        if (loadedDiary.status === "draft") {
          setError(
            "This diary is currently saved as a draft."
          );

          setDiary(null);

          return;
        }

        setDiary(loadedDiary);
      } catch (err) {
        console.error(
          "Diary details loading error:",
          err
        );

        setError(
          "Failed to load diary. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDiary();
  }, [id]);

  // ====================================================
  // LOAD ALL PUBLISHED DIARIES
  // Used for Previous / Next
  // ====================================================

  useEffect(() => {
    const diariesQuery = query(
      collection(db, "diaries"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      diariesQuery,
      (snapshot) => {
        const diaryList: Diary[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          // Only public diaries
          if (data.status === "draft") {
            return;
          }

          diaryList.push({
            id: docSnap.id,

            title: data.title || "",

            date: data.date || "",

            content: data.content || "",

            coverImage: data.coverImage || "",

            images: Array.isArray(data.images)
              ? data.images
              : [],

            status:
              data.status === "draft"
                ? "draft"
                : "published",

            createdAt: data.createdAt,

            updatedAt: data.updatedAt,
          });
        });

        setAllDiaries(diaryList);
      },
      (err) => {
        console.error(
          "Diary list loading error:",
          err
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // ====================================================
  // CURRENT DIARY INDEX
  // ====================================================

  const currentIndex = useMemo(() => {
    if (!id) return -1;

    return allDiaries.findIndex(
      (item) => item.id === id
    );
  }, [allDiaries, id]);

  // ====================================================
  // PREVIOUS DIARY
  // ====================================================

  const previousDiary =
    currentIndex >= 0 &&
    currentIndex < allDiaries.length - 1
      ? allDiaries[currentIndex + 1]
      : null;

  // ====================================================
  // NEXT DIARY
  // ====================================================

  const nextDiary =
    currentIndex > 0
      ? allDiaries[currentIndex - 1]
      : null;

  // ====================================================
  // NAVIGATION
  // ====================================================

  const goToPrevious = () => {
    if (!previousDiary) return;

   navigate(`/user/diary/${previousDiary.id}`);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const goToNext = () => {
    if (!nextDiary) return;

    navigate(`/user/diary/${nextDiary.id}`);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="diary-loading-page">

        <div className="text-center">

          <div className="diary-loading-book">
            <FiBookOpen size={45} />
          </div>

          <Spinner
            animation="border"
            className="mt-4"
          />

          <p className="text-muted mt-3 mb-0">
            Opening your diary...
          </p>

        </div>

      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (error || !diary) {
    return (
      <div className="diary-error-page">

        <Container>

          <div className="diary-error-card text-center">

            <FiBookOpen
              size={55}
              className="mb-4 text-muted"
            />

            <h2 className="fw-bold">
              Diary not available
            </h2>

            <p className="text-muted">
              {error ||
                "The diary you are looking for could not be found."}
            </p>

            <Button
              variant="dark"
              onClick={() => navigate("/")}
            >
              <FiHome className="me-2" />

              Go Home
            </Button>

          </div>

        </Container>

      </div>
    );
  }

  // ====================================================
  // CONTENT PARAGRAPHS
  // ====================================================

  const paragraphs = diary.content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  // ====================================================
  // GALLERY
  // ====================================================

  const galleryImages = diary.images || [];

  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <div className="diary-details-page">

      {/* =================================================
          TOP NAVIGATION
      ================================================= */}

      <Container>

        <div className="diary-top-navigation">

          <Button
            variant="link"
            className="diary-back-button"
            onClick={() => navigate("/user/diary")}
          >
            <FiArrowLeft className="me-2" />

            Back
          </Button>

          <div className="diary-top-center">

            <FiBookOpen size={20} />

            <span>
              Personal Diary
            </span>

          </div>

        

        </div>

      </Container>

      {/* =================================================
          BOOK
      ================================================= */}

      <Container className="diary-book-container">

        <div className="diary-book">

          {/* =================================================
              COVER
          ================================================= */}

          <section className="diary-cover">

            <div className="diary-cover-inner">

              {/* Cover image */}

              {diary.coverImage ? (
                <div className="diary-cover-image-wrapper">

                  <Image
                    src={diary.coverImage}
                    alt={diary.title}
                    className="diary-cover-image"
                  />

                  <div className="diary-cover-overlay" />

                </div>
              ) : (
                <div className="diary-cover-placeholder">

                  <FiBookOpen
                    size={80}
                  />

                </div>
              )}

              {/* Cover content */}

              <div className="diary-cover-content">

                <div className="diary-cover-small-title">
                  MY PERSONAL DIARY
                </div>

                <div className="diary-cover-line" />

                <h1 className="diary-cover-title">
                  {diary.title}
                </h1>

                <div className="diary-cover-date">
                  <FiCalendar className="me-2" />

                  {formatDate(diary.date)}
                </div>

                <div className="diary-cover-bottom">

                  <span>
                    A memory worth keeping
                  </span>

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              BOOK PAGE
          ================================================= */}

          <section className="diary-paper">

            <div className="diary-paper-inner">

              {/* PAGE HEADER */}

              <div className="diary-page-header">

                <div>
                  <small>
                    MY DIARY
                  </small>
                </div>

                <div className="diary-page-number">
                  {currentIndex >= 0
                    ? currentIndex + 1
                    : ""}
                </div>

              </div>

              {/* TITLE */}

              <div className="diary-entry-header">

                <div className="diary-entry-date">

                  <FiCalendar />

                  <span>
                    {formatDate(
                      diary.date
                    )}
                  </span>

                </div>

                <h1>
                  {diary.title}
                </h1>

                <div className="diary-title-decoration">
                  <span />
                  <span />
                  <span />
                </div>

              </div>

              {/* CONTENT */}

              <div className="diary-content">

                {paragraphs.map(
                  (paragraph, index) => (
                    <p
                      key={`paragraph-${index}`}
                      className={
                        index === 0
                          ? "diary-first-paragraph"
                          : ""
                      }
                    >
                      {paragraph}
                    </p>
                  )
                )}

              </div>

              {/* =================================================
                  GALLERY
              ================================================= */}

              {galleryImages.length > 0 && (
                <div className="diary-gallery-section">

                  <div className="diary-section-title">

                    <FiImage />

                    <span>
                      Memories
                    </span>

                  </div>

                  <Row className="g-3">

                    {galleryImages.map(
                      (image, index) => (
                        <Col
                          xs={6}
                          md={4}
                          key={`${image}-${index}`}
                        >

                          <button
                            type="button"
                            className="diary-gallery-item"
                            onClick={() =>
                              setActiveImage(
                                image
                              )
                            }
                          >

                            <Image
                              src={image}
                              alt={`${diary.title} memory ${
                                index + 1
                              }`}
                              fluid
                            />

                            <div className="diary-gallery-overlay">
                              <FiImage />
                            </div>

                          </button>

                        </Col>
                      )
                    )}

                  </Row>

                </div>
              )}

              {/* =================================================
                  END OF PAGE
              ================================================= */}

              <div className="diary-page-end">

                <span>♥</span>

                <span>
                  End of this memory
                </span>

                <span>♥</span>

              </div>

              {/* PAGE FOOTER */}

              <div className="diary-page-footer">

                <span>
                  {getShortDate(diary.date)}
                </span>

                <span>
                  {currentIndex >= 0
                    ? `Page ${
                        currentIndex + 1
                      }`
                    : ""}
                </span>

              </div>

            </div>

          </section>

        </div>

      </Container>

      {/* =================================================
          PREVIOUS / NEXT
      ================================================= */}

      <Container>

        <div className="diary-navigation">

          {/* PREVIOUS */}

          <button
            type="button"
            className={`diary-nav-card ${
              !previousDiary
                ? "disabled"
                : ""
            }`}
            onClick={goToPrevious}
            disabled={!previousDiary}
          >

            <div className="diary-nav-icon">
              <FiChevronLeft />
            </div>

            <div className="diary-nav-content">

              <small>
                PREVIOUS
              </small>

              <strong>
                {previousDiary
                  ? previousDiary.title
                  : "No previous diary"}
              </strong>

            </div>

          </button>

          {/* CENTER */}

          <div className="diary-nav-center">

            <FiBookOpen />

            <span>
              {currentIndex >= 0
                ? `${currentIndex + 1} / ${
                    allDiaries.length
                  }`
                : ""}
            </span>

          </div>

          {/* NEXT */}

          <button
            type="button"
            className={`diary-nav-card diary-nav-next ${
              !nextDiary
                ? "disabled"
                : ""
            }`}
            onClick={goToNext}
            disabled={!nextDiary}
          >

            <div className="diary-nav-content text-end">

              <small>
                NEXT
              </small>

              <strong>
                {nextDiary
                  ? nextDiary.title
                  : "No next diary"}
              </strong>

            </div>

            <div className="diary-nav-icon">
              <FiChevronRight />
            </div>

          </button>

        </div>

      </Container>

      {/* =================================================
          EDIT BUTTON
      ================================================= */}

      <Container>

        <div className="diary-bottom-actions">

          <Button
            variant="dark"
            className="diary-edit-button"
            onClick={() =>
              navigate(
                `/user/diary/add?edit=${diary.id}`
              )
            }
          >
            <FiEdit3 className="me-2" />

            Edit Diary
          </Button>

        </div>

      </Container>

      {/* =================================================
          IMAGE LIGHTBOX
      ================================================= */}

      {activeImage && (
        <div
          className="diary-lightbox"
          onClick={() =>
            setActiveImage(null)
          }
        >

          <button
            type="button"
            className="diary-lightbox-close"
            onClick={(event) => {
              event.stopPropagation();

              setActiveImage(null);
            }}
          >
            <FiX />
          </button>

          <img
            src={activeImage}
            alt="Diary memory"
            className="diary-lightbox-image"
            onClick={(event) =>
              event.stopPropagation()
            }
          />

        </div>
      )}

    </div>
  );
};

export default DiaryDetails;