import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";

import { db } from "./../../firebase/config";

const BOOK_ID = "hUjPKUoLaDs60zrp3JIe";

export const migrateDiariesToDiaryPages = async () => {
  try {
    console.log("Starting diary migration...");

    // --------------------------------------------------
    // 1. Get all diaries
    // --------------------------------------------------

    const diariesSnapshot = await getDocs(
      collection(db, "diaries")
    );

    console.log(
      `Found ${diariesSnapshot.size} diaries`
    );

    if (diariesSnapshot.empty) {
      console.log("No diaries found.");
      return;
    }

    // --------------------------------------------------
    // 2. Get existing diaryPages for this book
    // --------------------------------------------------

    const pagesQuery = query(
      collection(db, "diaryPages"),
      where("bookId", "==", BOOK_ID)
    );

    const pagesSnapshot = await getDocs(pagesQuery);

    console.log(
      `Found ${pagesSnapshot.size} existing pages`
    );

    // --------------------------------------------------
    // 3. Find next page number
    // --------------------------------------------------

    let maxPageNumber = 0;

    pagesSnapshot.forEach((pageDoc) => {
      const pageData = pageDoc.data();

      const pageNumber = Number(pageData.pageNumber);

      if (
        Number.isFinite(pageNumber) &&
        pageNumber > maxPageNumber
      ) {
        maxPageNumber = pageNumber;
      }
    });

    let nextPageNumber = maxPageNumber + 1;

    console.log(
      `Next page number will start from: ${nextPageNumber}`
    );

    // --------------------------------------------------
    // 4. Create signatures of existing pages
    // --------------------------------------------------

    const existingSignatures = new Set<string>();

    pagesSnapshot.forEach((pageDoc) => {
      const pageData = pageDoc.data();

      const signature = createDiarySignature({
        title: pageData.title,
        date: pageData.date,
        content: pageData.content,
        images: pageData.images,
      });

      existingSignatures.add(signature);
    });

    // --------------------------------------------------
    // 5. Prepare diaries for migration
    // --------------------------------------------------

    const diariesToMigrate: {
      id: string;
      data: any;
    }[] = [];

    diariesSnapshot.forEach((diaryDoc) => {
      const data = diaryDoc.data();

      const signature = createDiarySignature({
        title: data.title,
        date: data.date,
        content: data.content,
        images: data.images,
      });

      // Duplicate check
      if (existingSignatures.has(signature)) {
        console.log(
          `Skipping duplicate diary: ${diaryDoc.id} - ${data.title}`
        );

        return;
      }

      // Prevent duplicate inside current migration
      existingSignatures.add(signature);

      diariesToMigrate.push({
        id: diaryDoc.id,
        data,
      });
    });

    // --------------------------------------------------
    // 6. Nothing to migrate
    // --------------------------------------------------

    if (diariesToMigrate.length === 0) {
      console.log(
        "Nothing to migrate. All diaries already exist in diaryPages."
      );

      return;
    }

    console.log(
      `${diariesToMigrate.length} diaries will be migrated.`
    );

    // --------------------------------------------------
    // 7. Create diaryPages
    // --------------------------------------------------

    let batch = writeBatch(db);
    let batchCount = 0;

    for (const diary of diariesToMigrate) {
      const data = diary.data;

      const pageRef = doc(
        collection(db, "diaryPages")
      );

      batch.set(pageRef, {
        bookId: BOOK_ID,

        title: data.title || "",

        date: data.date || "",

        content: data.content || "",

        images: Array.isArray(data.images)
          ? data.images
          : [],

        createdAt: data.createdAt || null,

        updatedAt: data.updatedAt || null,

        pageNumber: nextPageNumber,
      });

      console.log(
        `Creating Page ${nextPageNumber}: ${data.title}`
      );

      nextPageNumber++;
      batchCount++;

      // Firestore batch maximum = 500 operations
      if (batchCount === 500) {
        await batch.commit();

        console.log(
          "Committed batch of 500 pages."
        );

        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    // --------------------------------------------------
    // 8. Commit remaining pages
    // --------------------------------------------------

    if (batchCount > 0) {
      await batch.commit();

      console.log(
        `Committed final batch of ${batchCount} pages.`
      );
    }

    // --------------------------------------------------
    // 9. Done
    // --------------------------------------------------

    console.log(
      "========================================"
    );

    console.log(
      "Diary migration completed successfully!"
    );

    console.log(
      `Migrated: ${diariesToMigrate.length}`
    );

    console.log(
      `Skipped duplicates: ${
        diariesSnapshot.size - diariesToMigrate.length
      }`
    );

    console.log(
      `Last page number: ${nextPageNumber - 1}`
    );

    console.log(
      "========================================"
    );
  } catch (error) {
    console.error(
      "Diary migration failed:",
      error
    );

    throw error;
  }
};

// --------------------------------------------------
// Create a unique signature for duplicate detection
// --------------------------------------------------

function createDiarySignature({
  title,
  date,
  content,
  images,
}: {
  title: any;
  date: any;
  content: any;
  images: any;
}) {
  const imageList = Array.isArray(images)
    ? images
    : [];

  return JSON.stringify({
    title: title || "",
    date: date || "",
    content: content || "",
    images: imageList,
  });
}