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
  orderByChild,
  limitToLast,
  endBefore,
  equalTo,
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

export const fetchImageFromExplore = async (take, lastCreateTime = null) => {
  const exploreRef = dbRef(database, "explore");

  try {
    let imagesQuery;
    if (lastCreateTime) {
      imagesQuery = query(
        exploreRef,
        orderByChild("create_time"),
        endBefore(lastCreateTime),
        limitToLast(take)
      );
    } else {
      imagesQuery = query(
        exploreRef,
        orderByChild("create_time"),
        limitToLast(take)
      );
    }

    const snapshot = await get(imagesQuery);
    if (snapshot.exists()) {
      let images = [];
      snapshot.forEach((childSnapshot) => {
        images.push(childSnapshot.val());
      });
      images.reverse();
      return images;
    } else {
      console.log("No images found.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching images:", error);
    throw error;
  }
};

export const fetchImageFromCreate = async (email) => {
  const userRef = dbRef(database, "users");

  try {
    const userQuery = query(userRef, orderByChild("email"), equalTo(email));
    const snapshot = await get(userQuery);
    let images = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        images = user.images;
      });
      return images.reverse();
    }
    return [];
  } catch (error) {
    console.error("Error fetching images:", error);
    throw error;
  }
};

export const checkUserExist = async (email) => {
  const userRef = dbRef(database, "users");

  try {
    const userQuery = query(userRef, orderByChild("email"), equalTo(email));
    const snapshot = await get(userQuery);
    return snapshot.exists();
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};
