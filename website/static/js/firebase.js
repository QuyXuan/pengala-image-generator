import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getStorage,
  ref,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import {
  getDatabase,
  ref as dbRef,
  get,
  query,
  orderByKey,
  startAt,
  limitToFirst,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBfPQWrDk5OCgOGPjmEAGVXaeskQ2zAcBs",
  authDomain: "pengala-image-generator.firebaseapp.com",
  databaseURL:
    "https://pengala-image-generator-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pengala-image-generator",
  storageBucket: "pengala-image-generator.appspot.com",
  messagingSenderId: "229224215636",
  appId: "1:229224215636:web:28351e15be9eb4c810e9c1",
  measurementId: "G-XHMY2XZ5EZ",
};

initializeApp(firebaseConfig);

export const storage = getStorage();
export const database = getDatabase();

export const fetchImageURL = (imagePath) => {
  return getDownloadURL(ref(storage, imagePath));
};

export const fetchImageFromExplore = async (take, lastKey) => {
  const exploreRef = dbRef(database, "explore");

  try {
    const imagesQuery = lastKey
      ? query(
          exploreRef,
          orderByKey(),
          startAt(lastKey),
          limitToFirst(take + 1)
        )
      : query(exploreRef, orderByKey(), limitToFirst(take));
    const snapshot = await get(imagesQuery);

    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.log("No images found.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching images:", error);
    throw error;
  }
};
