import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { FiDownload } from "react-icons/fi";

import {
  Alert,
  Button,
  Container,
  Modal,
  Spinner,
} from "react-bootstrap";

import {
  FiArrowLeft,
  FiBookOpen,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiFileText,
  FiImage,
  FiList,
  FiPlus,
  FiTrash2,
  FiX,
  FiZoomIn,
} from "react-icons/fi";

import { useNavigate, useParams } from "react-router-dom";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../firebase/config";

interface DiaryBook {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  author: string;
  startDate: string;
  endDate: string;
  status: "published" | "draft";
  pageCount: number;
}

interface DiaryPage {
  id: string;
  bookId: string;
  pageNumber: number;
  title: string;
  date: string;
  content: string;
  images: string[];
}

const DiaryBookDetails = () => {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();

  const [book, setBook] = useState<DiaryBook | null>(null);
  const [pages, setPages] = useState<DiaryPage[]>([]);

  const [loading, setLoading] = useState(true);
  const [deletingPage, setDeletingPage] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPage, setSelectedPage] =
    useState<DiaryPage | null>(null);

  const [showBook, setShowBook] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const [showContents, setShowContents] = useState(false);

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  /*
   * ==========================================
   * DRAG & DROP STATES
   * ==========================================
   */

  const [draggedPageId, setDraggedPageId] =
    useState<string | null>(null);

  const [dragOverPageId, setDragOverPageId] =
    useState<string | null>(null);

  const [savingPageOrder, setSavingPageOrder] =
    useState(false);

  /*
   * ==========================================
   * LOAD BOOK + PAGES
   * ==========================================
   */

  const loadBook = async () => {
    if (!bookId) {
      setError("Book ID পাওয়া যায়নি।");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      /*
       * ----------------------------------------
       * Load Book
       * ----------------------------------------
       */

      const bookRef = doc(db, "diaryBooks", bookId);
      const bookSnap = await getDoc(bookRef);

      if (!bookSnap.exists()) {
        setError("Diary book পাওয়া যায়নি।");
        setBook(null);
        setLoading(false);
        return;
      }

      const bookData = bookSnap.data();

      const loadedBook: DiaryBook = {
        id: bookSnap.id,
        title: bookData.title || "",
        description: bookData.description || "",
        coverImage: bookData.coverImage || "",
        author: bookData.author || "",
        startDate: bookData.startDate || "",
        endDate: bookData.endDate || "",
        status:
          bookData.status === "published"
            ? "published"
            : "draft",
        pageCount: Number(bookData.pageCount || 0),
      };

      setBook(loadedBook);

      /*
       * ----------------------------------------
       * Load Pages
       * ----------------------------------------
       */

      const pagesQuery = query(
        collection(db, "diaryPages"),
        where("bookId", "==", bookId)
      );

      const pagesSnapshot = await getDocs(pagesQuery);

      const loadedPages: DiaryPage[] = pagesSnapshot.docs
        .map((pageDoc) => {
          const data = pageDoc.data();

          return {
            id: pageDoc.id,
            bookId: data.bookId || bookId,
            pageNumber: Number(data.pageNumber || 0),
            title: data.title || "",
            date: data.date || "",
            content: data.content || "",
            images: Array.isArray(data.images)
              ? data.images
              : [],
          };
        })
        .sort(
          (a, b) => a.pageNumber - b.pageNumber
        );

      setPages(loadedPages);

      if (loadedPages.length > 0) {
        setCurrentPage(0);
      } else {
        setCurrentPage(0);
      }
    } catch (err) {
      console.error(
        "Diary book loading error:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Diary book load করতে সমস্যা হয়েছে।";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBook();
  }, [bookId]);

  /*
   * ==========================================
   * ADD PAGE
   * ==========================================
   */

  const handleAddPage = () => {
    if (!bookId) return;

    navigate(
      `/user/diary/book/${bookId}/page/add`
    );
  };

  /*
   * ==========================================
   * DRAG & DROP PAGE REORDER
   * ==========================================
   */

  const startPageDrag = (
    event: React.DragEvent<HTMLDivElement>,
    pageId: string
  ) => {
    setDraggedPageId(pageId);
    setDragOverPageId(null);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      pageId
    );
  };

  const handlePageDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    pageId: string
  ) => {
    event.preventDefault();

    event.dataTransfer.dropEffect = "move";

    if (pageId !== draggedPageId) {
      setDragOverPageId(pageId);
    }
  };

  const handlePageDrop = (
    event: React.DragEvent<HTMLDivElement>,
    targetPageId: string
  ) => {
    event.preventDefault();

    const sourcePageId =
      event.dataTransfer.getData("text/plain") ||
      draggedPageId;

    if (
      !sourcePageId ||
      sourcePageId === targetPageId
    ) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    const sourceIndex = pages.findIndex(
      (page) => page.id === sourcePageId
    );

    if (sourceIndex === -1) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    /*
     * Copy current pages
     */

    const updatedPages = [...pages];

    /*
     * Remove dragged page first.
     */

    const [movedPage] =
      updatedPages.splice(
        sourceIndex,
        1
      );

    /*
     * Find target AFTER removing
     * dragged page.
     */

    const targetIndex =
      updatedPages.findIndex(
        (page) =>
          page.id === targetPageId
      );

    if (targetIndex === -1) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    /*
     * Insert dragged page before target.
     */

    updatedPages.splice(
      targetIndex,
      0,
      movedPage
    );

    /*
     * Re-number locally.
     */

    const numberedPages =
      updatedPages.map(
        (page, index) => ({
          ...page,
          pageNumber: index + 1,
        })
      );

    setPages(numberedPages);

    /*
     * Keep currently opened page
     * selected after reorder.
     */

    const activePageId =
      activePage?.id;

    if (activePageId) {
      const newCurrentIndex =
        numberedPages.findIndex(
          (page) =>
            page.id === activePageId
        );

      if (newCurrentIndex !== -1) {
        setCurrentPage(
          newCurrentIndex
        );
      }
    }

    setDraggedPageId(null);
    setDragOverPageId(null);
  };

  const handlePageDragEnd = () => {
    setDraggedPageId(null);
    setDragOverPageId(null);
  };

  /*
   * ==========================================
   * EDIT BOOK
   * ==========================================
   */

  const handleEditBook = () => {
    if (!book) return;

    navigate(
      `/user/diary/book/add?edit=${book.id}`
    );
  };

  /*
   * ==========================================
   * EDIT PAGE
   * ==========================================
   */

  const handleEditPage = (
    page: DiaryPage
  ) => {
    if (!bookId) return;

    navigate(
      `/user/diary/book/${bookId}/page/add?edit=${page.id}`
    );
  };

  /*
   * ==========================================
   * DELETE CONFIRMATION
   * ==========================================
   */

  const handleAskDelete = (
    page: DiaryPage
  ) => {
    setSelectedPage(page);
    setShowDeleteModal(true);
  };

  /*
   * ==========================================
   * DELETE PAGE
   * ==========================================
   */

  const handleDeletePage = async () => {
    if (!bookId || !selectedPage) {
      return;
    }

    try {
      setDeletingPage(true);
      setError("");
      setSuccess("");

      const pagesQuery = query(
        collection(db, "diaryPages"),
        where("bookId", "==", bookId)
      );

      const pagesSnapshot =
        await getDocs(pagesQuery);

      const remainingPages =
        pagesSnapshot.docs
          .filter(
            (pageDoc) =>
              pageDoc.id !==
              selectedPage.id
          )
          .map((pageDoc) => ({
            id: pageDoc.id,
            ref: pageDoc.ref,
            data: pageDoc.data(),
            pageNumber: Number(
              pageDoc.data().pageNumber ||
                0
            ),
          }))
          .sort(
            (a, b) =>
              a.pageNumber -
              b.pageNumber
          );

      const batch = writeBatch(db);

      /*
       * Delete selected page
       */

      batch.delete(
        doc(
          db,
          "diaryPages",
          selectedPage.id
        )
      );

      /*
       * Renumber remaining pages
       */

      remainingPages.forEach(
        (page, index) => {
          batch.update(page.ref, {
            pageNumber: index + 1,
            updatedAt:
              serverTimestamp(),
          });
        }
      );

      /*
       * Update book page count
       */

      batch.update(
        doc(
          db,
          "diaryBooks",
          bookId
        ),
        {
          pageCount:
            remainingPages.length,
          updatedAt:
            serverTimestamp(),
        }
      );

      await batch.commit();

      const updatedPages: DiaryPage[] =
        remainingPages.map(
          (page, index) => ({
            id: page.id,
            bookId,
            pageNumber: index + 1,
            title:
              page.data.title || "",
            date:
              page.data.date || "",
            content:
              page.data.content || "",
            images:
              Array.isArray(
                page.data.images
              )
                ? page.data.images
                : [],
          })
        );

      setPages(updatedPages);

      setBook((previous) =>
        previous
          ? {
              ...previous,
              pageCount:
                updatedPages.length,
            }
          : previous
      );

      /*
       * Keep current page valid
       */

      if (updatedPages.length === 0) {
        setCurrentPage(0);
      } else if (
        currentPage >=
        updatedPages.length
      ) {
        setCurrentPage(
          updatedPages.length - 1
        );
      } else if (
        selectedPage.pageNumber - 1 <=
          currentPage &&
        currentPage > 0
      ) {
        setCurrentPage(
          (previous) =>
            Math.max(
              0,
              previous - 1
            )
        );
      }

      setShowDeleteModal(false);
      setSelectedPage(null);

      setSuccess(
        "Diary page সফলভাবে delete হয়েছে।"
      );

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error(
        "Diary page delete error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Diary page delete করতে সমস্যা হয়েছে।"
      );
    } finally {
      setDeletingPage(false);
    }
  };

  /*
   * ==========================================
   * DATE RANGE
   * ==========================================
   */

  const dateRange = useMemo(() => {
    if (!book) return "";

    if (
      book.startDate &&
      book.endDate
    ) {
      return `${book.startDate} → ${book.endDate}`;
    }

    if (book.startDate) {
      return book.startDate;
    }

    if (book.endDate) {
      return book.endDate;
    }

    return "Date not set";
  }, [book]);

  /*
   * ==========================================
   * EXPORT DIARY TO PDF
   * ==========================================
   */

  const exportDiaryToPDF =
    async () => {
      if (
        !book ||
        pages.length === 0
      ) {
        alert(
          "There are no diary pages to export."
        );
        return;
      }

      try {
        setLoading(true);

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = 210;
        const pdfHeight = 297;

        /*
         * Temporary PDF container
         */

        const pdfContainer =
          document.createElement(
            "div"
          );

        pdfContainer.style.position =
          "fixed";
        pdfContainer.style.left =
          "-100000px";
        pdfContainer.style.top = "0";
        pdfContainer.style.width =
          "794px";
        pdfContainer.style.background =
          "#f5efe4";
        pdfContainer.style.padding =
          "0";
        pdfContainer.style.zIndex =
          "-9999";

        document.body.appendChild(
          pdfContainer
        );

        /*
         * ====================================
         * COVER PAGE
         * ====================================
         */

        const cover =
          document.createElement(
            "div"
          );

        cover.style.width = "794px";
        cover.style.height = "1123px";
        cover.style.background =
          "#1f1b18";
        cover.style.color = "#f5e9d3";
        cover.style.display = "flex";
        cover.style.flexDirection =
          "column";
        cover.style.alignItems =
          "center";
        cover.style.justifyContent =
          "center";
        cover.style.textAlign =
          "center";
        cover.style.padding = "80px";
        cover.style.boxSizing =
          "border-box";
        cover.style.fontFamily =
          "Georgia, serif";

        if (book.coverImage) {
          const coverImg =
            document.createElement(
              "img"
            );

          coverImg.src =
            book.coverImage;

          coverImg.style.width =
            "520px";
          coverImg.style.height =
            "320px";
          coverImg.style.objectFit =
            "cover";
          coverImg.style.borderRadius =
            "8px";
          coverImg.style.marginBottom =
            "60px";

          cover.appendChild(
            coverImg
          );

          await new Promise<void>(
            (resolve) => {
              coverImg.onload = () =>
                resolve();
              coverImg.onerror = () =>
                resolve();
            }
          );
        }

        const coverSmall =
          document.createElement(
            "div"
          );

        coverSmall.innerText =
          "PERSONAL DIARY";

        coverSmall.style.fontSize =
          "18px";
        coverSmall.style.letterSpacing =
          "8px";
        coverSmall.style.marginBottom =
          "30px";
        coverSmall.style.opacity =
          "0.8";

        cover.appendChild(
          coverSmall
        );

        const coverTitle =
          document.createElement(
            "div"
          );

        coverTitle.innerText =
          book.title;

        coverTitle.style.fontSize =
          "48px";
        coverTitle.style.fontWeight =
          "bold";
        coverTitle.style.marginBottom =
          "25px";
        coverTitle.style.lineHeight =
          "1.2";

        cover.appendChild(
          coverTitle
        );

        if (book.description) {
          const description =
            document.createElement(
              "div"
            );

          description.innerText =
            book.description;

          description.style.fontSize =
            "20px";
          description.style.lineHeight =
            "1.7";
          description.style.maxWidth =
            "600px";
          description.style.opacity =
            "0.8";
          description.style.marginBottom =
            "50px";

          cover.appendChild(
            description
          );
        }

        const author =
          document.createElement(
            "div"
          );

        author.innerText = `By ${
          book.author || "Me"
        }`;

        author.style.fontSize =
          "20px";
        author.style.marginBottom =
          "15px";

        cover.appendChild(author);

        const dates =
          document.createElement(
            "div"
          );

        dates.innerText = `${
          book.startDate || ""
        } ${
          book.endDate
            ? `— ${book.endDate}`
            : ""
        }`;

        dates.style.fontSize =
          "16px";
        dates.style.opacity =
          "0.7";

        cover.appendChild(dates);

        pdfContainer.appendChild(
          cover
        );

        const coverCanvas =
          await html2canvas(cover, {
            scale: 2,
            useCORS: true,
            backgroundColor:
              "#1f1b18",
            logging: false,
          });

        const coverImage =
          coverCanvas.toDataURL(
            "image/jpeg",
            0.95
          );

        pdf.addImage(
          coverImage,
          "JPEG",
          0,
          0,
          pdfWidth,
          pdfHeight
        );

        /*
         * ====================================
         * DIARY PAGES
         * ====================================
         */

        for (
          let i = 0;
          i < pages.length;
          i++
        ) {
          const page = pages[i];

          const pageElement =
            document.createElement(
              "div"
            );

          pageElement.style.width =
            "794px";
          pageElement.style.minHeight =
            "1123px";
          pageElement.style.background =
            "#fdf8ee";
          pageElement.style.color =
            "#302820";
          pageElement.style.padding =
            "75px 70px";
          pageElement.style.boxSizing =
            "border-box";
          pageElement.style.fontFamily =
            "Georgia, serif";
          pageElement.style.position =
            "relative";

          /*
           * Page Header
           */

          const header =
            document.createElement(
              "div"
            );

          header.style.display =
            "flex";
          header.style.justifyContent =
            "space-between";
          header.style.alignItems =
            "center";
          header.style.borderBottom =
            "1px solid #d8cbb8";
          header.style.paddingBottom =
            "18px";
          header.style.marginBottom =
            "40px";

          const diaryName =
            document.createElement(
              "div"
            );

          diaryName.innerText =
            book.title;

          diaryName.style.fontSize =
            "15px";
          diaryName.style.letterSpacing =
            "2px";
          diaryName.style.opacity =
            "0.6";

          header.appendChild(
            diaryName
          );

          const pageDate =
            document.createElement(
              "div"
            );

          pageDate.innerText =
            page.date || "";

          pageDate.style.fontSize =
            "14px";
          pageDate.style.opacity =
            "0.6";

          header.appendChild(
            pageDate
          );

          pageElement.appendChild(
            header
          );

          /*
           * Page Title
           */

          if (page.title) {
            const title =
              document.createElement(
                "h1"
              );

            title.innerText =
              page.title;

            title.style.fontSize =
              "34px";
            title.style.marginBottom =
              "30px";
            title.style.color =
              "#241e19";
            title.style.lineHeight =
              "1.25";

            pageElement.appendChild(
              title
            );
          }

          /*
           * Content
           */

          if (page.content) {
            const content =
              document.createElement(
                "div"
              );

            content.innerHTML =
              page.content;

            content.style.fontSize =
              "18px";
            content.style.lineHeight =
              "1.9";
            content.style.color =
              "#443b32";
            content.style.marginBottom =
              "35px";

            pageElement.appendChild(
              content
            );
          }

          /*
           * Images
           */

          if (
            page.images &&
            page.images.length > 0
          ) {
            const imageGrid =
              document.createElement(
                "div"
              );

            imageGrid.style.display =
              "grid";

            imageGrid.style.gridTemplateColumns =
              page.images.length === 1
                ? "1fr"
                : "1fr 1fr";

            imageGrid.style.gap =
              "20px";

            imageGrid.style.marginTop =
              "30px";

            for (
              const imageUrl of page.images
            ) {
              const wrapper =
                document.createElement(
                  "div"
                );

              wrapper.style.background =
                "#fff";

              wrapper.style.padding =
                "12px";

              wrapper.style.border =
                "1px solid #ded3c4";

              wrapper.style.boxShadow =
                "0 8px 20px rgba(60,40,20,0.12)";

              const img =
                document.createElement(
                  "img"
                );

              img.src = imageUrl;

              img.style.width =
                "100%";

              img.style.height =
                page.images.length ===
                1
                  ? "380px"
                  : "240px";

              img.style.objectFit =
                "cover";

              img.style.display =
                "block";

              wrapper.appendChild(
                img
              );

              imageGrid.appendChild(
                wrapper
              );

              await new Promise<void>(
                (resolve) => {
                  img.onload = () =>
                    resolve();
                  img.onerror = () =>
                    resolve();
                }
              );
            }

            pageElement.appendChild(
              imageGrid
            );
          }

          /*
           * Page Footer
           */

          const footer =
            document.createElement(
              "div"
            );

          footer.innerText =
            `${i + 1}`;

          footer.style.position =
            "absolute";
          footer.style.bottom =
            "30px";
          footer.style.left = "0";
          footer.style.right = "0";
          footer.style.textAlign =
            "center";
          footer.style.fontSize =
            "14px";
          footer.style.color =
            "#8c7d6b";

          pageElement.appendChild(
            footer
          );

          pdfContainer.appendChild(
            pageElement
          );

          const canvas =
            await html2canvas(
              pageElement,
              {
                scale: 2,
                useCORS: true,
                backgroundColor:
                  "#fdf8ee",
                logging: false,
              }
            );

          const imageData =
            canvas.toDataURL(
              "image/jpeg",
              0.95
            );

          pdf.addPage();

          pdf.addImage(
            imageData,
            "JPEG",
            0,
            0,
            pdfWidth,
            pdfHeight
          );

          pdfContainer.removeChild(
            pageElement
          );
        }

        /*
         * Remove temporary container
         */

        if (
          document.body.contains(
            pdfContainer
          )
        ) {
          document.body.removeChild(
            pdfContainer
          );
        }

        /*
         * File name
         */

        const safeTitle =
          book.title
            .replace(
              /[^a-z0-9]/gi,
              "_"
            )
            .replace(
              /_+/g,
              "_"
            );

        pdf.save(
          `${
            safeTitle || "My_Diary"
          }.pdf`
        );
      } catch (error) {
        console.error(
          "PDF export error:",
          error
        );

        alert(
          "Something went wrong while creating the PDF. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * ==========================================
   * CURRENT PAGE
   * ==========================================
   */

  const activePage =
    pages.length > 0
      ? pages[currentPage]
      : null;

  /*
   * ==========================================
   * CONTENT HTML
   * ==========================================
   */

  const createMarkup = (
    content: string
  ) => {
    return {
      __html: content || "",
    };
  };

  /*
   * ==========================================
   * SAVE PAGE ORDER
   * ==========================================
   */

  const savePageOrder = async () => {
    if (
      !bookId ||
      pages.length === 0
    ) {
      return;
    }

    try {
      setSavingPageOrder(true);
      setError("");
      setSuccess("");

      const batch =
        writeBatch(db);

      /*
       * Save page numbers
       */

      pages.forEach(
        (page, index) => {
          const pageRef = doc(
            db,
            "diaryPages",
            page.id
          );

          batch.update(pageRef, {
            pageNumber:
              index + 1,
            updatedAt:
              serverTimestamp(),
          });
        }
      );

      /*
       * Update book page count
       */

      const bookRef = doc(
        db,
        "diaryBooks",
        bookId
      );

      batch.update(bookRef, {
        pageCount: pages.length,
        updatedAt:
          serverTimestamp(),
      });

      await batch.commit();

      /*
       * Clean local numbering
       */

      const cleanPages =
        pages.map(
          (page, index) => ({
            ...page,
            pageNumber:
              index + 1,
          })
        );

      setPages(cleanPages);

      /*
       * Update local book count
       */

      setBook((previous) =>
        previous
          ? {
              ...previous,
              pageCount:
                cleanPages.length,
            }
          : previous
      );

      /*
       * Keep same active page
       */

      if (activePage) {
        const activePageId =
          activePage.id;

        const newIndex =
          cleanPages.findIndex(
            (page) =>
              page.id ===
              activePageId
          );

        if (newIndex !== -1) {
          setCurrentPage(
            newIndex
          );
        }
      }

      setSuccess(
        "Page order successfully saved."
      );

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error(
        "Save page order error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Page order save করতে সমস্যা হয়েছে।"
      );
    } finally {
      setSavingPageOrder(false);
    }
  };

  /*
   * ==========================================
   * PAGE NAVIGATION
   * ==========================================
   */

  const goNextPage = () => {
    if (
      currentPage <
      pages.length - 1
    ) {
      setCurrentPage(
        (previous) =>
          previous + 1
      );
    }
  };

  const goPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(
        (previous) =>
          previous - 1
      );
    }
  };

  /*
   * ==========================================
   * OPEN SPECIFIC PAGE
   * ==========================================
   */

  const openPage = (
    index: number
  ) => {
    setCurrentPage(index);
    setShowContents(false);
    setShowBook(true);
  };

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <>
        <style>
          {premiumStyles}
        </style>

        <div className="premium-diary-background">
          <Container>
            <div className="premium-loading">
              <div className="premium-loading-book">
                <FiBookOpen size={45} />
              </div>

              <Spinner animation="border" />

              <div className="mt-3">
                Opening your diary...
              </div>
            </div>
          </Container>
        </div>
      </>
    );
  }

  /*
   * ==========================================
   * ERROR / NO BOOK
   * ==========================================
   */

  if (!book) {
    return (
      <>
        <style>
          {premiumStyles}
        </style>

        <div className="premium-diary-background min-vh-100">
          <Container className="py-5">
            <Alert variant="danger">
              {error ||
                "Diary book পাওয়া যায়নি।"}
            </Alert>

            <Button
              variant="dark"
              onClick={() =>
                navigate(
                  "/user/diary"
                )
              }
            >
              <FiArrowLeft className="me-2" />
              Back to Diary Books
            </Button>
          </Container>
        </div>
      </>
    );
  }

  /*
   * ==========================================
   * MAIN
   * ==========================================
   */

  return (
    <>
      <style>
        {premiumStyles}
      </style>

      <div className="premium-diary-background">
        <Container
          fluid
          className="premium-container"
        >
          {/* =====================================
              TOP NAVIGATION
          ===================================== */}

          <div className="premium-topbar">
            <Button
              variant="light"
              className="premium-back-button"
              onClick={() =>
                navigate(
                  "/user/diary/book"
                )
              }
            >
              <FiArrowLeft className="me-2" />
              All Books
            </Button>

            <div className="premium-top-title">
              <FiBookOpen className="me-2" />
              My Diary
            </div>

            <div className="d-flex gap-2">
              <Button
                variant="light"
                className="premium-icon-button"
                onClick={() =>
                  setShowContents(true)
                }
                title="Table of Contents"
              >
                <FiList />
              </Button>

              <Button
                variant="light"
                className="premium-edit-button"
                onClick={
                  handleEditBook
                }
              >
                <FiEdit className="me-2" />
                Edit Book
              </Button>
            </div>
          </div>

          {/* =====================================
              ALERTS
          ===================================== */}

          {error && (
            <Alert
              variant="danger"
              dismissible
              onClose={() =>
                setError("")
              }
              className="premium-alert"
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              variant="success"
              dismissible
              onClose={() =>
                setSuccess("")
              }
              className="premium-alert"
            >
              {success}
            </Alert>
          )}

          {/* =====================================
              BOOK COVER
          ===================================== */}

          {!showBook && (
            <div className="book-cover-section">
              <div className="book-cover-wrapper">
                <div className="book-cover-shadow" />

                <div className="book-cover">
                  <div className="book-spine" />

                  {book.coverImage ? (
                    <img
                      src={
                        book.coverImage
                      }
                      alt={book.title}
                      className="book-cover-image"
                    />
                  ) : (
                    <div className="book-cover-placeholder">
                      <FiBookOpen
                        size={75}
                      />
                    </div>
                  )}

                  <div className="book-cover-overlay" />

                  <div className="book-cover-content">
                    <div className="book-cover-small">
                      PERSONAL DIARY
                    </div>

                    <div className="book-cover-line" />

                    <h1>
                      {book.title}
                    </h1>

                    {book.description && (
                      <p>
                        {
                          book.description
                        }
                      </p>
                    )}

                    <div className="book-cover-bottom">
                      <div>
                        <span className="cover-label">
                          WRITTEN BY
                        </span>

                        <strong>
                          {book.author ||
                            "Me"}
                        </strong>
                      </div>

                      <div className="cover-date">
                        <span className="cover-label">
                          {dateRange}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="book-cover-status">
                    {book.status ===
                    "published"
                      ? "PUBLISHED"
                      : "DRAFT"}
                  </div>
                </div>
              </div>

              {/* Cover information */}

              <div className="cover-info">
                <div className="cover-eyebrow">
                  A COLLECTION OF MEMORIES
                </div>

                <h2>
                  {book.title}
                </h2>

                <p>
                  {book.description ||
                    "Your personal collection of memories, moments and stories."}
                </p>

                <div className="cover-meta">
                  <div>
                    <FiCalendar />
                    <span>
                      {dateRange}
                    </span>
                  </div>

                  <div>
                    <FiFileText />
                    <span>
                      {pages.length}{" "}
                      {pages.length ===
                      1
                        ? "Page"
                        : "Pages"}
                    </span>
                  </div>

                  <div>
                    <FiEdit />
                    <span>
                      {book.author ||
                        "Personal Diary"}
                    </span>
                  </div>
                </div>

                <div className="cover-actions">
                  <Button
                    className="open-book-button"
                    onClick={() => {
                      setCurrentPage(
                        0
                      );
                      setShowBook(
                        true
                      );
                    }}
                  >
                    <FiBookOpen className="me-2" />

                    {pages.length >
                    0
                      ? "Open My Diary"
                      : "Start My Diary"}
                  </Button>

                  <Button
                    variant="outline-dark"
                    className="contents-button"
                    onClick={() =>
                      setShowContents(
                        true
                      )
                    }
                  >
                    <FiList className="me-2" />
                    Contents
                  </Button>
                </div>

                <div className="cover-note">
                  <span>✦</span>
                  Every page holds a memory.
                </div>
              </div>
            </div>
          )}

          {/* =====================================
              BOOK READER
          ===================================== */}

          {showBook && (
            <div className="reader-section">
              <div className="reader-heading">
                <div>
                  <div className="reader-eyebrow">
                    {book.title}
                  </div>

                  <h2>
                    {activePage?.title ||
                      "My Diary"}
                  </h2>
                </div>

                <Button
                  variant="light"
                  className="close-book-button"
                  onClick={() =>
                    setShowBook(
                      false
                    )
                  }
                >
                  <FiX className="me-2" />
                  Close Book
                </Button>
              </div>

              {pages.length === 0 ? (
                <div className="empty-book">
                  <div className="empty-book-icon">
                    <FiBookOpen
                      size={55}
                    />
                  </div>

                  <h3>
                    Your diary is waiting.
                  </h3>

                  <p>
                    এই বইয়ের প্রথম
                    page তৈরি করে
                    তোমার memories
                    লেখা শুরু করো।
                  </p>

                  <Button
                    className="open-book-button"
                    onClick={
                      handleAddPage
                    }
                  >
                    <FiPlus className="me-2" />
                    Create First Page
                  </Button>
                </div>
              ) : (
                <>
                  {/* BOOK */}

                  <div className="real-book-area">
                    <div className="real-book-shadow" />

                    <div className="real-book">
                      <div className="book-page-edge left-edge" />

                      <div className="diary-paper">
                        <div className="paper-top">
                          <span>
                            {book.title}
                          </span>

                          <span>
                            {activePage?.date ||
                              ""}
                          </span>
                        </div>

                        <div className="paper-decoration">
                          <span />
                          <FiBookOpen />
                          <span />
                        </div>

                        {activePage?.date && (
                          <div className="diary-date">
                            <FiCalendar className="me-2" />
                            {
                              activePage.date
                            }
                          </div>
                        )}

                        <h1 className="diary-page-title">
                          {activePage?.title ||
                            "Untitled Memory"}
                        </h1>

                        <div
                          className="diary-content"
                          dangerouslySetInnerHTML={createMarkup(
                            activePage?.content ||
                              ""
                          )}
                        />

                        {activePage &&
                          activePage.images
                            .length >
                            0 && (
                            <div className="diary-photo-section">
                              <div className="photo-section-title">
                                <span />

                                <span>
                                  <FiImage className="me-1" />
                                  Memories
                                </span>

                                <span />
                              </div>

                              <div
                                className={`diary-photo-grid ${
                                  activePage
                                    .images
                                    .length ===
                                  1
                                    ? "single-photo"
                                    : activePage
                                        .images
                                        .length ===
                                      2
                                    ? "two-photo"
                                    : ""
                                }`}
                              >
                                {activePage.images.map(
                                  (
                                    image,
                                    imageIndex
                                  ) => (
                                    <div
                                      className="diary-photo-frame"
                                      key={`${image}-${imageIndex}`}
                                      onClick={() =>
                                        setSelectedImage(
                                          image
                                        )
                                      }
                                    >
                                      <img
                                        src={
                                          image
                                        }
                                        alt={`${activePage.title} ${
                                          imageIndex +
                                          1
                                        }`}
                                      />

                                      <div className="photo-zoom">
                                        <FiZoomIn />
                                      </div>

                                      <div className="photo-number">
                                        {imageIndex +
                                          1}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {!activePage?.content &&
                          activePage?.images
                            .length ===
                            0 && (
                            <div className="empty-page-content">
                              <FiFileText
                                size={35}
                              />

                              <div>
                                এই page-এ
                                এখনো কোনো
                                content
                                নেই।
                              </div>
                            </div>
                          )}

                        <div className="paper-bottom">
                          <div className="paper-author">
                            {book.author
                              ? `— ${book.author}`
                              : ""}
                          </div>

                          <div className="paper-page-number">
                            {
                              activePage?.pageNumber
                            }
                          </div>
                        </div>
                      </div>

                      <div className="book-page-edge right-edge" />
                    </div>
                  </div>

                  {/* READER CONTROLS */}

                  <div className="reader-controls">
                    <Button
                      className="page-navigation previous"
                      disabled={
                        currentPage ===
                        0
                      }
                      onClick={
                        goPreviousPage
                      }
                    >
                      <FiChevronLeft
                        size={22}
                      />
                      <span>
                        Previous
                      </span>
                    </Button>

                    <div className="page-counter">
                      <strong>
                        {currentPage +
                          1}
                      </strong>

                      <span>/</span>

                      <span>
                        {pages.length}
                      </span>
                    </div>

                    <Button
                      className="page-navigation next"
                      disabled={
                        currentPage ===
                        pages.length -
                          1
                      }
                      onClick={
                        goNextPage
                      }
                    >
                      <span>
                        Next
                      </span>

                      <FiChevronRight
                        size={22}
                      />
                    </Button>
                  </div>

                  {/* PAGE ACTIONS */}

                  {activePage && (
                    <div className="page-actions">
                      <Button
                        variant="light"
                        onClick={() =>
                          handleEditPage(
                            activePage
                          )
                        }
                      >
                        <FiEdit className="me-2" />
                        Edit Page
                      </Button>

                      <Button
                        variant="light"
                        className="text-danger"
                        onClick={() =>
                          handleAskDelete(
                            activePage
                          )
                        }
                      >
                        <FiTrash2 className="me-2" />
                        Delete Page
                      </Button>

                      <Button
                        className="add-page-action"
                        onClick={
                          handleAddPage
                        }
                      >
                        <FiPlus className="me-2" />
                        Add Page
                      </Button>
                    </div>
                  )}

                  {/* PAGE DOTS */}

                  <div className="page-dots">
                    {pages.map(
                      (
                        page,
                        index
                      ) => (
                        <button
                          key={
                            page.id
                          }
                          className={
                            index ===
                            currentPage
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setCurrentPage(
                              index
                            )
                          }
                          title={`Page ${page.pageNumber}`}
                        >
                          {index + 1}
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* =====================================
              BOTTOM ADD PAGE
          ===================================== */}

          {!showBook && (
            <div className="bottom-add-page">
              <Button
                variant="dark"
                onClick={
                  handleAddPage
                }
              >
                <FiPlus className="me-2" />
                Add New Diary Page
              </Button>
            </div>
          )}
        </Container>
      </div>

      {/* ==========================================
          EXPORT PDF
      ========================================== */}

      <Button
        variant="outline-light"
        onClick={
          exportDiaryToPDF
        }
        disabled={
          loading ||
          pages.length === 0
        }
        className="premium-pdf-button"
      >
        <FiDownload className="me-2" />

        {loading
          ? "Creating PDF..."
          : "Export PDF"}
      </Button>

      {/* ==========================================
          TABLE OF CONTENTS MODAL
      ========================================== */}

      <Modal
        show={showContents}
        onHide={() =>
          setShowContents(false)
        }
        centered
        size="lg"
        className="premium-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FiBookOpen className="me-2" />
            {book.title}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="contents-header">
            <div>
              <small>
                TABLE OF CONTENTS
              </small>

              <h4>
                {pages.length}{" "}
                {pages.length === 1
                  ? "Memory"
                  : "Memories"}
              </h4>
            </div>

            <div className="d-flex gap-2">
              <Button
                size="sm"
                variant="outline-dark"
                onClick={
                  savePageOrder
                }
                disabled={
                  savingPageOrder ||
                  pages.length < 2
                }
              >
                {savingPageOrder ? (
                  <>
                    <Spinner
                      size="sm"
                      animation="border"
                      className="me-1"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiList className="me-1" />
                    Save Order
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="dark"
                onClick={() => {
                  setShowContents(
                    false
                  );
                  handleAddPage();
                }}
              >
                <FiPlus className="me-1" />
                Add
              </Button>
            </div>
          </div>

          {pages.length === 0 ? (
            <div className="contents-empty">
              <FiBookOpen
                size={45}
              />

              <p className="mt-3 mb-0">
                এখনো কোনো page নেই।
              </p>
            </div>
          ) : (
            <div className="contents-list">
              {pages.map(
                (
                  page,
                  index
                ) => {
                  const isDragging =
                    draggedPageId ===
                    page.id;

                  const isDragOver =
                    dragOverPageId ===
                    page.id;

                  return (
                    <div
                      key={page.id}
                      className={[
                        "contents-drag-item",
                        isDragging
                          ? "is-dragging"
                          : "",
                        isDragOver
                          ? "is-drag-over"
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(" ")}
                      draggable
                      onDragStart={(
                        event
                      ) =>
                        startPageDrag(
                          event,
                          page.id
                        )
                      }
                      onDragOver={(
                        event
                      ) =>
                        handlePageDragOver(
                          event,
                          page.id
                        )
                      }
                      onDrop={(event) =>
                        handlePageDrop(
                          event,
                          page.id
                        )
                      }
                      onDragEnd={
                        handlePageDragEnd
                      }
                    >
                      {/* Drag Handle */}

                      <div
                        className="drag-handle"
                        title="Drag to reorder"
                      >
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>

                      {/* Page Number */}

                      <div className="contents-number">
                        {(index + 1)
                          .toString()
                          .padStart(
                            2,
                            "0"
                          )}
                      </div>

                      {/* Page Content */}

                      <button
                        type="button"
                        className="contents-page-button"
                        onClick={() =>
                          openPage(
                            index
                          )
                        }
                      >
                        <div className="contents-main">
                          <strong>
                            {page.title ||
                              "Untitled Memory"}
                          </strong>

                          {page.date && (
                            <small>
                              <FiCalendar className="me-1" />
                              {
                                page.date
                              }
                            </small>
                          )}
                        </div>

                        <div className="contents-photo-count">
                          {page.images
                            .length >
                            0 && (
                            <>
                              <FiImage />

                              {
                                page
                                  .images
                                  .length
                              }
                            </>
                          )}

                          <FiChevronRight />
                        </div>
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* ==========================================
          IMAGE LIGHTBOX
      ========================================== */}

      <Modal
        show={!!selectedImage}
        onHide={() =>
          setSelectedImage(null)
        }
        centered
        fullscreen
        className="image-lightbox-modal"
      >
        <div className="image-lightbox">
          <button
            className="lightbox-close"
            onClick={() =>
              setSelectedImage(null)
            }
          >
            <FiX size={30} />
          </button>

          {selectedImage && (
            <img
              src={selectedImage}
              alt="Diary memory"
            />
          )}
        </div>
      </Modal>

      {/* ==========================================
          DELETE MODAL
      ========================================== */}

      <Modal
        show={showDeleteModal}
        onHide={() => {
          if (!deletingPage) {
            setShowDeleteModal(
              false
            );
            setSelectedPage(null);
          }
        }}
        centered
      >
        <Modal.Header
          closeButton={
            !deletingPage
          }
        >
          <Modal.Title>
            <FiTrash2 className="me-2 text-danger" />
            Delete Diary Page
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="text-center py-3">
            <div className="delete-icon">
              <FiTrash2
                size={40}
              />
            </div>

            <h5 className="fw-bold mt-3">
              Page{" "}
              {
                selectedPage?.pageNumber
              }{" "}
              delete করবেন?
            </h5>

            <p className="text-muted mb-0">
              {selectedPage?.title ||
                "এই diary page"}{" "}
              permanently delete
              হয়ে যাবে।
            </p>

            <div className="alert alert-warning mt-4 mb-0">
              Page delete করার পর
              বাকি pages automatically
              আবার 1, 2, 3... হিসেবে
              সাজানো হবে।
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            disabled={
              deletingPage
            }
            onClick={() => {
              setShowDeleteModal(
                false
              );
              setSelectedPage(null);
            }}
          >
            Cancel
          </Button>

          <Button
            variant="danger"
            disabled={
              deletingPage
            }
            onClick={
              handleDeletePage
            }
          >
            {deletingPage ? (
              <>
                <Spinner
                  size="sm"
                  animation="border"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              <>
                <FiTrash2 className="me-2" />
                Delete Page
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

/*
 * ==========================================================
 * PREMIUM DIARY STYLES
 * ==========================================================
 */

const premiumStyles = `
  .premium-diary-background {
    min-height: 100vh;
    background:
      radial-gradient(
        circle at 15% 10%,
        rgba(212, 175, 55, 0.08),
        transparent 28%
      ),
      radial-gradient(
        circle at 85% 90%,
        rgba(120, 90, 40, 0.08),
        transparent 30%
      ),
      #f3efe7;
    color: #25221d;
  }

  .premium-container {
    max-width: 1450px;
    margin: 0 auto;
    padding: 25px 35px 70px;
  }

  /* ================================
     TOP BAR
  ================================= */

  .premium-topbar {
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 30px;
  }

  .premium-top-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .premium-back-button,
  .premium-icon-button,
  .premium-edit-button {
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    background: rgba(255, 255, 255, 0.75) !important;
    color: #25221d !important;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(10px);
  }

  .premium-icon-button {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .premium-alert {
    border-radius: 14px;
    border: none;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
  }

  /* ================================
     COVER SECTION
  ================================= */

  .book-cover-section {
    min-height: 680px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 90px;
    padding: 45px 30px 80px;
  }

  .book-cover-wrapper {
    width: min(430px, 90vw);
    position: relative;
    perspective: 1400px;
  }

  .book-cover-shadow {
    position: absolute;
    inset: 20px -20px -25px 25px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.25);
    filter: blur(25px);
    transform: rotate(2deg);
  }

  .book-cover {
    position: relative;
    width: 100%;
    aspect-ratio: 0.70;
    overflow: hidden;
    border-radius: 5px 13px 13px 5px;
    background: #29251e;
    box-shadow:
      -12px 0 0 #171511,
      -15px 0 20px rgba(0, 0, 0, 0.25),
      20px 30px 45px rgba(0, 0, 0, 0.28),
      inset -5px 0 10px rgba(255,255,255,0.08);
    transform: rotateY(-5deg) rotateX(2deg);
    transition: transform 0.5s ease;
  }

  .book-cover:hover {
    transform: rotateY(0deg) rotateX(0deg) translateY(-8px);
  }

  .book-cover-image,
  .book-cover-placeholder {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .book-cover-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      linear-gradient(
        135deg,
        #2d2a25,
        #554c3e
      );
    color: rgba(255,255,255,0.8);
  }

  .book-cover-overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        180deg,
        rgba(0,0,0,0.48),
        rgba(0,0,0,0.1) 35%,
        rgba(0,0,0,0.78)
      );
  }

  .book-cover-content {
    position: absolute;
    inset: 45px 40px 40px;
    color: white;
    display: flex;
    flex-direction: column;
    text-align: center;
    z-index: 3;
  }

  .book-cover-small {
    font-size: 11px;
    letter-spacing: 0.35em;
    opacity: 0.85;
  }

  .book-cover-line {
    width: 65px;
    height: 1px;
    background: rgba(255,255,255,0.7);
    margin: 18px auto;
  }

  .book-cover-content h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(34px, 5vw, 52px);
    line-height: 1.08;
    margin: 0;
    font-weight: 700;
    text-shadow: 0 4px 15px rgba(0,0,0,0.35);
  }

  .book-cover-content p {
    margin: 18px 0 0;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 15px;
    line-height: 1.7;
    opacity: 0.9;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .book-cover-bottom {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 20px;
    text-align: left;
  }

  .cover-label {
    display: block;
    font-size: 9px;
    letter-spacing: 0.18em;
    opacity: 0.65;
    margin-bottom: 5px;
  }

  .book-cover-bottom strong {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 15px;
    font-weight: 500;
  }

  .cover-date {
    text-align: right;
  }

  .book-cover-status {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 5;
    font-size: 9px;
    letter-spacing: 0.15em;
    color: rgba(255,255,255,0.8);
    border: 1px solid rgba(255,255,255,0.4);
    padding: 7px 10px;
    border-radius: 3px;
    backdrop-filter: blur(4px);
  }

  .book-spine {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 13px;
    z-index: 10;
    background:
      linear-gradient(
        90deg,
        rgba(0,0,0,0.45),
        rgba(255,255,255,0.1),
        rgba(0,0,0,0.25)
      );
  }

  /* ================================
     COVER INFO
  ================================= */

  .cover-info {
    max-width: 520px;
  }

  .cover-eyebrow {
    font-size: 11px;
    letter-spacing: 0.3em;
    color: #81765f;
    font-weight: 700;
    margin-bottom: 15px;
  }

  .cover-info h2 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(38px, 5vw, 65px);
    line-height: 1;
    margin-bottom: 25px;
    color: #28231c;
  }

  .cover-info p {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 17px;
    line-height: 1.9;
    color: #6f675b;
  }

  .cover-meta {
    margin-top: 30px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: #60584c;
  }

  .cover-meta div {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cover-meta svg {
    color: #86765a;
  }

  .cover-actions {
    margin-top: 35px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .open-book-button {
    background: #25221d !important;
    border-color: #25221d !important;
    padding: 13px 25px !important;
    border-radius: 10px !important;
    box-shadow: 0 12px 30px rgba(37,34,29,0.18);
  }

  .contents-button {
    border-color: #25221d !important;
    color: #25221d !important;
    padding: 13px 22px !important;
    border-radius: 10px !important;
  }

  .cover-note {
    margin-top: 25px;
    color: #938775;
    font-family: Georgia, "Times New Roman", serif;
    font-style: italic;
  }

  .cover-note span {
    margin-right: 8px;
  }

  .bottom-add-page {
    text-align: center;
    margin-top: 15px;
  }

  /* ================================
     READER
  ================================= */

  .reader-section {
    max-width: 1150px;
    margin: 0 auto;
    padding: 15px 0 40px;
  }

  .reader-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 25px;
  }

  .reader-eyebrow {
    font-size: 10px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: #8a806f;
    margin-bottom: 7px;
  }

  .reader-heading h2 {
    margin: 0;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(25px, 4vw, 38px);
  }

  .close-book-button {
    border: 1px solid rgba(0,0,0,0.1) !important;
    background: white !important;
    color: #28231c !important;
    border-radius: 10px !important;
  }

  /* ================================
     REAL BOOK
  ================================= */

  .real-book-area {
    position: relative;
    padding: 15px 25px 35px;
  }

  .real-book-shadow {
    position: absolute;
    left: 7%;
    right: 7%;
    bottom: 20px;
    height: 40px;
    background: rgba(0,0,0,0.22);
    filter: blur(22px);
    border-radius: 50%;
  }

  .real-book {
    position: relative;
    max-width: 930px;
    min-height: 700px;
    margin: 0 auto;
    display: flex;
    filter: drop-shadow(0 25px 30px rgba(0,0,0,0.15));
  }

  .book-page-edge {
    width: 25px;
    flex-shrink: 0;
    background:
      repeating-linear-gradient(
        90deg,
        #e3ded1 0px,
        #e3ded1 2px,
        #c8c0b0 3px,
        #eee9de 5px
      );
  }

  .left-edge {
    border-radius: 8px 0 0 8px;
    transform: skewY(1deg);
  }

  .right-edge {
    border-radius: 0 8px 8px 0;
    transform: skewY(-1deg);
  }

  .diary-paper {
    position: relative;
    flex: 1;
    min-height: 700px;
    padding: 50px 75px 35px;
    background:
      radial-gradient(
        circle at 20% 20%,
        rgba(120,90,40,0.025),
        transparent 25%
      ),
      radial-gradient(
        circle at 80% 70%,
        rgba(120,90,40,0.025),
        transparent 25%
      ),
      #fffdf7;
    box-shadow:
      inset 0 0 40px rgba(92,76,50,0.035),
      inset 0 0 3px rgba(0,0,0,0.1);
    overflow: hidden;
  }

  .diary-paper::before {
    content: "";
    position: absolute;
    inset: 14px;
    border: 1px solid rgba(119,99,69,0.13);
    pointer-events: none;
  }

  .diary-paper::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 35px;
    background:
      linear-gradient(
        90deg,
        rgba(0,0,0,0.06),
        transparent
      );
    pointer-events: none;
  }

  .paper-top {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    color: #9a8e7b;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    position: relative;
    z-index: 2;
  }

  .paper-decoration {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 22px 0 20px;
    color: #9a8e7b;
  }

  .paper-decoration span {
    width: 75px;
    height: 1px;
    background: #d7cebd;
  }

  .diary-date {
    text-align: center;
    color: #9a8e7b;
    font-size: 12px;
    letter-spacing: 0.12em;
    margin-top: 5px;
  }

  .diary-page-title {
    font-family: Georgia, "Times New Roman", serif;
    text-align: center;
    font-size: clamp(30px, 4vw, 47px);
    line-height: 1.15;
    color: #29251f;
    margin: 16px 0 30px;
    font-weight: 600;
  }

  .diary-content {
    position: relative;
    z-index: 2;
    max-width: 760px;
    margin: 0 auto;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 17px;
    line-height: 2;
    color: #484238;
    min-height: 100px;
  }

  .diary-content p {
    margin-bottom: 16px;
  }

  .diary-content h1,
  .diary-content h2,
  .diary-content h3 {
    font-family: Georgia, "Times New Roman", serif;
    color: #302a22;
  }

  .diary-content img {
    max-width: 100%;
    border-radius: 10px;
  }

  .diary-content blockquote {
    margin: 25px 0;
    padding: 15px 20px;
    border-left: 3px solid #a89573;
    background: rgba(168,149,115,0.07);
    font-style: italic;
  }

  .empty-page-content {
    text-align: center;
    color: #aaa091;
    padding: 40px 0;
    font-family: Georgia, "Times New Roman", serif;
    font-style: italic;
  }

  /* ================================
     PHOTOS
  ================================= */

  .diary-photo-section {
    margin: 35px auto 10px;
    max-width: 760px;
    position: relative;
    z-index: 3;
  }

  .photo-section-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #9b8e79;
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 18px;
  }

  .photo-section-title span {
    height: 1px;
    width: 55px;
    background: #ddd4c5;
  }

  .diary-photo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
    align-items: start;
  }

  .diary-photo-grid.single-photo {
    grid-template-columns: minmax(180px, 520px);
    justify-content: center;
  }

  .diary-photo-grid.two-photo {
    grid-template-columns: repeat(2, minmax(150px, 1fr));
  }

  .diary-photo-frame {
    position: relative;
    padding: 8px;
    background: #fff;
    box-shadow:
      0 8px 20px rgba(0,0,0,0.12);
    cursor: zoom-in;
    transition: transform 0.3s ease;
  }

  .diary-photo-frame:nth-child(odd) {
    transform: rotate(-1.2deg);
  }

  .diary-photo-frame:nth-child(even) {
    transform: rotate(1.2deg);
  }

  .diary-photo-frame:hover {
    transform: rotate(0deg) translateY(-5px) scale(1.015);
    z-index: 5;
  }

  .diary-photo-frame img {
    width: 100%;
    max-height: 360px;
    object-fit: cover;
    display: block;
  }

  .photo-zoom {
    position: absolute;
    right: 16px;
    top: 16px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(0,0,0,0.55);
    color: white;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .diary-photo-frame:hover .photo-zoom {
    opacity: 1;
  }

  .photo-number {
    position: absolute;
    bottom: 15px;
    right: 15px;
    min-width: 23px;
    height: 23px;
    padding: 0 6px;
    border-radius: 20px;
    background: rgba(0,0,0,0.55);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
  }

  /* ================================
     PAPER BOTTOM
  ================================= */

  .paper-bottom {
    position: relative;
    z-index: 4;
    margin-top: 40px;
    padding-top: 15px;
    border-top: 1px solid rgba(140,125,100,0.14);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #9b8e7b;
  }

  .paper-author {
    font-family: Georgia, "Times New Roman", serif;
    font-style: italic;
  }

  .paper-page-number {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14px;
  }

  /* ================================
     CONTROLS
  ================================= */

  .reader-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 30px;
    margin: 15px auto 0;
  }

  .page-navigation {
    min-width: 125px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border-radius: 9px !important;
    border: 1px solid #d6cebf !important;
    background: rgba(255,255,255,0.85) !important;
    color: #332e27 !important;
  }

  .page-navigation:disabled {
    opacity: 0.35;
  }

  .page-counter {
    min-width: 80px;
    display: flex;
    justify-content: center;
    gap: 7px;
    color: #8a7e6c;
    font-family: Georgia, "Times New Roman", serif;
  }

  .page-counter strong {
    color: #302b24;
  }

  .page-actions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 9px;
    margin-top: 22px;
  }

  .page-actions .btn {
    border-radius: 8px;
    border: 1px solid #d7cfbf;
  }

  .add-page-action {
    background: #28241e !important;
    border-color: #28241e !important;
    color: white !important;
  }

  .page-dots {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 5px;
    max-width: 700px;
    margin: 22px auto 0;
  }

  .page-dots button {
    border: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: transparent;
    color: #9b907f;
    font-size: 10px;
    transition: all 0.2s ease;
  }

  .page-dots button:hover {
    background: #e5ddcf;
  }

  .page-dots button.active {
    background: #29251f;
    color: white;
  }

  /* ================================
     PDF BUTTON
  ================================= */

  .premium-pdf-button {
    position: fixed;
    right: 25px;
    bottom: 25px;
    z-index: 1000;
    background: #29251f !important;
    border-color: #29251f !important;
    color: white !important;
    border-radius: 10px !important;
    padding: 11px 18px !important;
    box-shadow: 0 12px 30px rgba(0,0,0,0.2);
  }

  /* ================================
     EMPTY BOOK
  ================================= */

  .empty-book {
    max-width: 700px;
    margin: 60px auto;
    text-align: center;
    padding: 90px 30px;
    background: #fffdf8;
    border: 1px solid #e1d9ca;
    box-shadow: 0 20px 50px rgba(0,0,0,0.08);
    font-family: Georgia, "Times New Roman", serif;
  }

  .empty-book-icon {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 25px;
    background: #f0e9dc;
    color: #766951;
  }

  .empty-book h3 {
    font-size: 32px;
  }

  .empty-book p {
    color: #7d7468;
    margin: 15px auto 25px;
  }

  /* ================================
     CONTENTS
  ================================= */

  .contents-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e5dfd4;
  }

  .contents-header small {
    color: #968a78;
    letter-spacing: 0.2em;
    font-size: 9px;
  }

  .contents-header h4 {
    font-family: Georgia, "Times New Roman", serif;
    margin: 5px 0 0;
  }

  .contents-list {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .contents-item {
    width: 100%;
    border: none;
    background: #faf8f2;
    padding: 13px 15px;
    display: flex;
    align-items: center;
    gap: 15px;
    text-align: left;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .contents-item:hover,
  .contents-item.active {
    background: #eee8dc;
    transform: translateX(3px);
  }

  .contents-number {
    width: 45px;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 16px;
    color: #9a8c76;
  }

  .contents-main {
    flex: 1;
    min-width: 0;
  }

  .contents-main strong {
    display: block;
    font-family: Georgia, "Times New Roman", serif;
    color: #332e27;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .contents-main small {
    display: block;
    margin-top: 4px;
    color: #918676;
  }

  .contents-photo-count {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #978a78;
  }

  .contents-empty {
    text-align: center;
    padding: 60px 20px;
    color: #968a78;
  }

  /* ================================
     DRAG & DROP CONTENTS
  ================================= */

  .contents-drag-item {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #faf8f2;
    border: 1px solid transparent;
    border-radius: 9px;
    transition:
      transform 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .contents-drag-item:hover {
    background: #f3eee4;
  }

  .contents-drag-item.is-dragging {
    opacity: 0.45;
    transform: scale(0.98);
  }

  .contents-drag-item.is-drag-over {
    border-color: #8f8067;
    background: #eee7d9;
    box-shadow:
      0 -3px 0 #8f8067 inset;
  }

  .drag-handle {
    width: 34px;
    min-width: 34px;
    display: grid;
    grid-template-columns: repeat(2, 4px);
    grid-auto-rows: 4px;
    justify-content: center;
    align-content: center;
    gap: 3px;
    cursor: grab;
    opacity: 0.4;
    padding: 10px 0;
    touch-action: none;
    user-select: none;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .drag-handle span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #766b5b;
  }

  .contents-drag-item:hover .drag-handle {
    opacity: 0.8;
  }

  .contents-page-button {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    padding: 13px 15px 13px 3px;
    display: flex;
    align-items: center;
    gap: 15px;
    text-align: left;
    color: inherit;
    cursor: pointer;
  }

  .contents-page-button:hover {
    background: transparent;
  }

  .contents-page-button .contents-main {
    flex: 1;
    min-width: 0;
  }

  .contents-page-button .contents-main strong {
    display: block;
    font-family: Georgia, "Times New Roman", serif;
    color: #332e27;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .contents-page-button .contents-main small {
    display: block;
    margin-top: 4px;
    color: #918676;
  }

  .contents-drag-item .contents-number {
    width: 42px;
    min-width: 42px;
    text-align: center;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 16px;
    color: #9a8c76;
  }

  .contents-drag-item .contents-photo-count {
    min-width: 65px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
    color: #978a78;
  }

  /* ================================
     LIGHTBOX
  ================================= */

  .image-lightbox {
    min-height: 100vh;
    width: 100%;
    background: rgba(13,12,10,0.96);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 50px;
  }

  .image-lightbox img {
    max-width: 95vw;
    max-height: 90vh;
    object-fit: contain;
    box-shadow: 0 25px 70px rgba(0,0,0,0.45);
  }

  .lightbox-close {
    position: fixed;
    top: 22px;
    right: 25px;
    z-index: 10;
    border: none;
    background: rgba(255,255,255,0.12);
    color: white;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ================================
     DELETE
  ================================= */

  .delete-icon {
    width: 75px;
    height: 75px;
    border-radius: 50%;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff0f0;
    color: #dc3545;
  }

  /* ================================
     LOADING
  ================================= */

  .premium-loading {
    min-height: 75vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #756b5d;
    font-family: Georgia, "Times New Roman", serif;
  }

  .premium-loading-book {
    width: 90px;
    height: 90px;
    border-radius: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 25px;
    background: #29251f;
    color: white;
    box-shadow: 0 20px 40px rgba(0,0,0,0.18);
  }

  /* ================================
     RESPONSIVE
  ================================= */

  @media (max-width: 991px) {
    .premium-container {
      padding-left: 20px;
      padding-right: 20px;
    }

    .book-cover-section {
      flex-direction: column;
      gap: 55px;
      padding-top: 25px;
    }

    .cover-info {
      text-align: center;
      max-width: 700px;
    }

    .cover-meta {
      align-items: center;
    }

    .cover-actions {
      justify-content: center;
    }

    .cover-note {
      text-align: center;
    }

    .real-book {
      min-height: 620px;
    }

    .diary-paper {
      min-height: 620px;
      padding: 45px 55px 30px;
    }
  }

  @media (max-width: 767px) {
    .premium-container {
      padding: 15px 12px 50px;
    }

    .premium-topbar {
      margin-bottom: 20px;
      min-height: 55px;
    }

    .premium-top-title {
      display: none;
    }

    .premium-edit-button {
      font-size: 0;
      width: 44px;
      height: 44px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .premium-edit-button svg {
      margin: 0 !important;
      font-size: 17px;
    }

    .book-cover-section {
      min-height: auto;
      padding: 25px 10px 50px;
    }

    .book-cover-wrapper {
      width: min(360px, 88vw);
    }

    .book-cover-content {
      inset: 35px 28px 30px;
    }

    .book-cover-content h1 {
      font-size: 38px;
    }

    .cover-info h2 {
      font-size: 40px;
    }

    .cover-info p {
      font-size: 15px;
    }

    .reader-heading {
      align-items: flex-start;
    }

    .reader-heading h2 {
      font-size: 25px;
    }

    .close-book-button {
      font-size: 0;
      width: 43px;
      height: 43px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-book-button svg {
      margin: 0 !important;
      font-size: 18px;
    }

    .real-book-area {
      padding: 5px 0 25px;
    }

    .real-book {
      min-height: 620px;
    }

    .book-page-edge {
      width: 8px;
    }

    .diary-paper {
      min-height: 620px;
      padding: 35px 25px 25px;
    }

    .diary-paper::before {
      inset: 8px;
    }

    .diary-paper::after {
      width: 20px;
    }

    .paper-top {
      font-size: 8px;
    }

    .paper-top span:last-child {
      text-align: right;
    }

    .paper-decoration span {
      width: 30px;
    }

    .diary-page-title {
      font-size: 29px;
      margin-bottom: 22px;
    }

    .diary-content {
      font-size: 15px;
      line-height: 1.85;
    }

    .diary-photo-grid,
    .diary-photo-grid.two-photo {
      grid-template-columns: 1fr;
    }

    .diary-photo-grid.single-photo {
      grid-template-columns: 1fr;
    }

    .diary-photo-frame img {
      max-height: 320px;
    }

    .reader-controls {
      gap: 10px;
    }

    .page-navigation {
      min-width: 50px;
      width: 50px;
      height: 44px;
      padding: 0 !important;
    }

    .page-navigation span {
      display: none;
    }

    .page-counter {
      min-width: 70px;
    }

    .page-actions {
      padding: 0 5px;
    }

    .page-actions .btn {
      font-size: 13px;
    }

    .image-lightbox {
      padding: 25px 10px;
    }

    .image-lightbox img {
      max-width: 100%;
      max-height: 85vh;
    }

    /* Drag & Drop mobile */

    .contents-drag-item {
      gap: 3px;
    }

    .drag-handle {
      width: 28px;
      min-width: 28px;
    }

    .contents-drag-item .contents-number {
      width: 30px;
      min-width: 30px;
      font-size: 13px;
    }

    .contents-page-button {
      padding-right: 8px;
      gap: 8px;
    }

    .contents-drag-item .contents-photo-count {
      min-width: 35px;
    }

    .contents-photo-count svg:first-child {
      display: none;
    }

    .premium-pdf-button {
      right: 12px;
      bottom: 12px;
      padding: 9px 13px !important;
      font-size: 13px;
    }

    .contents-header {
      align-items: flex-start;
      gap: 10px;
    }

    .contents-header .d-flex {
      flex-shrink: 0;
    }
  }

  @media (max-width: 420px) {
    .book-cover-wrapper {
      width: 300px;
    }

    .book-cover-content h1 {
      font-size: 32px;
    }

    .book-cover-content p {
      font-size: 13px;
    }

    .cover-info h2 {
      font-size: 34px;
    }

    .real-book {
      min-height: 570px;
    }

    .diary-paper {
      min-height: 570px;
      padding: 30px 18px 20px;
    }

    .diary-page-title {
      font-size: 25px;
    }

    .diary-content {
      font-size: 14px;
    }

    .paper-bottom {
      margin-top: 25px;
    }

    .contents-header {
      flex-direction: column;
    }

    .contents-header .d-flex {
      width: 100%;
      justify-content: flex-end;
    }

    .premium-pdf-button {
      font-size: 12px;
      padding: 8px 11px !important;
    }
  }
`;

export default DiaryBookDetails;