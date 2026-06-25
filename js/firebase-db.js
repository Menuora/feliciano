// Firebase and Fallback Client-Side Database Layer for Feliciano Template

(function () {
  const DEFAULTS = {
    settings: {
      restaurantName: "Feliciano",
      facebookLink: "#",
      instagramLink: "#",
      twitterLink: "#",
      googleMapsEmbed: "",
      openingTime: "9:00",
      closingTime: "24:00"
    },
    images: {
      heroImage1: "images/bg_1.jpg",
      heroImage1Secondary: "images/about-1.jpg",
      heroImage2: "images/bg_2.jpg",
      heroImage2Secondary: "images/about.jpg",
      aboutImage1: "images/about.jpg",
      aboutImage2: "images/about-1.jpg",
      bookingSideImage: "images/bg_3.jpg",
      menuHeaderImage: "images/bg_3.jpg",
      galleryHeaderImage: "images/bg_4.jpg",
      contactHeaderImage: "images/bg_3.jpg"
    }
  };

  // Helper to detect if Firebase credentials are fully configured
  function isFirebaseConfigured() {
    const config = window.ENV && window.ENV.firebase;
    return !!(
      config &&
      config.apiKey &&
      !config.apiKey.includes("YOUR_FIREBASE_API_KEY") &&
      config.projectId &&
      !config.projectId.includes("YOUR_FIREBASE_PROJECT_ID")
    );
  }

  const useFirebase = isFirebaseConfigured();
  let db = null;
  let auth = null;

  if (useFirebase) {
    console.log("Feliciano: Initializing Firebase SDK backend...");
    try {
      firebase.initializeApp(window.ENV.firebase);
      db = firebase.firestore();
      auth = firebase.auth();
    } catch (e) {
      console.error("Failed to initialize Firebase SDK:", e);
    }
  } else {
    console.warn("Feliciano: Firebase credentials not set or incomplete. Running in Client-Side Fallback Mode (using LocalStorage).");
  }

  // --- LOCAL FALLBACK HELPERS ---
  function getLocal(key, defaultValue) {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    try {
      return JSON.parse(val);
    } catch (e) {
      return defaultValue;
    }
  }

  function setLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Ensure initial fallback data exists
  if (!useFirebase) {
    if (!localStorage.getItem("feliciano_settings")) {
      setLocal("feliciano_settings", DEFAULTS.settings);
    }
    if (!localStorage.getItem("feliciano_images")) {
      setLocal("feliciano_images", DEFAULTS.images);
    }
    if (!localStorage.getItem("feliciano_bookings")) {
      setLocal("feliciano_bookings", []);
    }
    if (!localStorage.getItem("feliciano_media")) {
      setLocal("feliciano_media", []);
    }
    if (!localStorage.getItem("feliciano_admin_password")) {
      localStorage.setItem("feliciano_admin_password", "change-this-password");
    }
  }

  // --- INTERFACE EXPORTS ---
  const dbApi = {
    isFirebaseMode: function () {
      return useFirebase;
    },

    // 1. GET SETTINGS & IMAGES (combined into one object for Feliciano client compatibility)
    dbGetSettings: async function () {
      if (useFirebase) {
        try {
          const settingsDoc = await db.collection("config").doc("settings").get();
          const imagesDoc = await db.collection("config").doc("images").get();

          const settings = settingsDoc.exists ? settingsDoc.data() : DEFAULTS.settings;
          const images = imagesDoc.exists ? imagesDoc.data() : DEFAULTS.images;

          return {
            ...DEFAULTS.settings,
            ...settings,
            images: {
              ...DEFAULTS.images,
              ...images
            }
          };
        } catch (e) {
          console.error("Error reading Firestore settings:", e);
          return {
            ...DEFAULTS.settings,
            images: DEFAULTS.images
          };
        }
      } else {
        const settings = getLocal("feliciano_settings", DEFAULTS.settings);
        const images = getLocal("feliciano_images", DEFAULTS.images);
        return {
          ...DEFAULTS.settings,
          ...settings,
          images: {
            ...DEFAULTS.images,
            ...images
          }
        };
      }
    },

    // 2. GET MEDIA ITEMS (GALLERY)
    dbGetMedia: async function () {
      if (useFirebase) {
        try {
          const snapshot = await db.collection("media").orderBy("createdAt", "desc").get();
          const items = [];
          snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
          });
          return items;
        } catch (e) {
          console.error("Error fetching Firestore media:", e);
          return [];
        }
      } else {
        return getLocal("feliciano_media", []);
      }
    },

    // 3. GET BOOKINGS
    dbGetBookings: async function () {
      if (useFirebase) {
        try {
          const snapshot = await db.collection("bookings").orderBy("createdAt", "desc").get();
          const bookings = [];
          snapshot.forEach(doc => {
            bookings.push({ id: doc.id, ...doc.data() });
          });
          return bookings;
        } catch (e) {
          console.error("Error fetching Firestore bookings:", e);
          return [];
        }
      } else {
        return getLocal("feliciano_bookings", []);
      }
    },

    // 4. ADD BOOKING
    dbAddBooking: async function (bookingData) {
      const booking = {
        name: bookingData.name,
        phone: bookingData.phone,
        email: bookingData.email || "",
        date: bookingData.date,
        time: bookingData.time,
        guests: bookingData.guests || "1",
        message: bookingData.message || "",
        createdAt: new Date().toISOString()
      };

      if (useFirebase) {
        const docRef = await db.collection("bookings").add(booking);
        booking.id = docRef.id;
        return booking;
      } else {
        const list = getLocal("feliciano_bookings", []);
        booking.id = Date.now().toString(36);
        list.unshift(booking);
        setLocal("feliciano_bookings", list);
        return booking;
      }
    },

    // 5. DELETE BOOKING
    dbDeleteBooking: async function (bookingId) {
      if (useFirebase) {
        await db.collection("bookings").doc(bookingId).delete();
      } else {
        let list = getLocal("feliciano_bookings", []);
        list = list.filter(b => b.id !== bookingId);
        setLocal("feliciano_bookings", list);
      }
      return { ok: true };
    },

    // 6. UPDATE SETTINGS
    dbUpdateSettings: async function (newSettings) {
      if (useFirebase) {
        const googleMapsEmbed = dbApi.normalizeMap(newSettings.googleMapsEmbed);
        const data = { ...newSettings, googleMapsEmbed };
        await db.collection("config").doc("settings").set(data, { merge: true });
      } else {
        const current = getLocal("feliciano_settings", DEFAULTS.settings);
        const googleMapsEmbed = dbApi.normalizeMap(newSettings.googleMapsEmbed);
        const updated = { ...current, ...newSettings, googleMapsEmbed };
        setLocal("feliciano_settings", updated);
      }
      return { ok: true };
    },

    // 7. UPDATE HOMEPAGE IMAGES
    dbUpdateImages: async function (newImages) {
      if (useFirebase) {
        await db.collection("config").doc("images").set(newImages, { merge: true });
      } else {
        const current = getLocal("feliciano_images", DEFAULTS.images);
        const updated = { ...current, ...newImages };
        setLocal("feliciano_images", updated);
      }
      return { ok: true };
    },

    // 8. ADD MEDIA ITEM
    dbAddMediaItem: async function (title, type, url, publicId = "") {
      const item = {
        title: title || (type === "full-menu" ? "Menu Image" : "Menu Item"),
        type: type === "full-menu" ? "full-menu" : "item",
        url: url || "",
        publicId: publicId,
        createdAt: new Date().toISOString()
      };

      if (useFirebase) {
        const docRef = await db.collection("media").add(item);
        item.id = docRef.id;
        return item;
      } else {
        const list = getLocal("feliciano_media", []);
        item.id = Date.now().toString(36);
        list.unshift(item);
        setLocal("feliciano_media", list);
        return item;
      }
    },

    // 9. DELETE MEDIA ITEM
    dbDeleteMediaItem: async function (itemId) {
      if (useFirebase) {
        // Retrieve publicId first in case we want to destroy Cloudinary image
        let doc = await db.collection("media").doc(itemId).get();
        let data = doc.exists ? doc.data() : null;
        await db.collection("media").doc(itemId).delete();
        return { ok: true, publicId: data ? data.publicId : null };
      } else {
        let list = getLocal("feliciano_media", []);
        const item = list.find(item => item.id === itemId);
        list = list.filter(item => item.id !== itemId);
        setLocal("feliciano_media", list);
        return { ok: true, publicId: item ? item.publicId : null };
      }
    },

    // 10. AUTH: LOGIN
    dbLogin: async function (usernameOrEmail, password) {
      if (useFirebase) {
        let email = usernameOrEmail.trim();
        if (!email.includes("@")) {
          const envAdmin = window.ENV && window.ENV.admin;
          const domain = envAdmin && envAdmin.email && envAdmin.email.includes("@") 
            ? envAdmin.email.split("@")[1] 
            : "feliciano.com";
          email = email + "@" + domain;
        }
        try {
          const userCredential = await auth.signInWithEmailAndPassword(email, password);
          await dbApi.ensureFirestoreInitialized();
          return userCredential.user;
        } catch (error) {
          // Auto-create admin account in Firebase if not found and credentials match env.js configuration
          const envAdmin = window.ENV && window.ENV.admin;
          if (
            (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential" || error.code === "auth/invalid-login-credentials") &&
            envAdmin &&
            email.toLowerCase() === envAdmin.email.trim().toLowerCase() &&
            password === envAdmin.password
          ) {
            console.log("Admin account not found in Firebase. Auto-creating admin user using credentials from env.js...");
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await dbApi.ensureFirestoreInitialized();
            return userCredential.user;
          }
          throw error;
        }
      } else {
        const envAdmin = window.ENV && window.ENV.admin;
        const defaultEmail = envAdmin && envAdmin.email ? envAdmin.email.trim() : "admin@feliciano.com";
        const defaultPassword = envAdmin && envAdmin.password ? envAdmin.password : "change-this-password";

        const storedPassword = localStorage.getItem("feliciano_admin_password") || defaultPassword;
        const inputUser = usernameOrEmail.trim().toLowerCase();
        const expectedUser = defaultEmail.toLowerCase();
        const expectedPrefix = expectedUser.split("@")[0];

        if (
          (inputUser === expectedUser || inputUser === expectedPrefix || inputUser === "admin") &&
          password === storedPassword
        ) {
          sessionStorage.setItem("feliciano_admin_auth", "true");
          return { email: defaultEmail, uid: "fallback-admin-id" };
        } else {
          throw new Error("Invalid admin username or password.");
        }
      }
    },

    // 11. AUTH: LOGOUT
    dbLogout: async function () {
      if (useFirebase) {
        await auth.signOut();
      } else {
        sessionStorage.removeItem("feliciano_admin_auth");
      }
      return { ok: true };
    },

    // 12. AUTH: CHECK ACTIVE SESSION
    dbCheckAuth: function (callback) {
      if (useFirebase) {
        auth.onAuthStateChanged(function (user) {
          callback(user);
        });
      } else {
        const isAuthed = sessionStorage.getItem("feliciano_admin_auth") === "true";
        setTimeout(() => {
          const envAdmin = window.ENV && window.ENV.admin;
          const defaultEmail = envAdmin && envAdmin.email ? envAdmin.email.trim() : "admin@feliciano.com";
          callback(isAuthed ? { email: defaultEmail, uid: "fallback-admin-id" } : null);
        }, 50);
      }
    },

    // 13. AUTH: CHANGE PASSWORD
    dbChangePassword: async function (currentPassword, newPassword) {
      if (useFirebase) {
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated user found.");
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
      } else {
        const envAdmin = window.ENV && window.ENV.admin;
        const defaultPassword = envAdmin && envAdmin.password ? envAdmin.password : "change-this-password";
        const storedPassword = localStorage.getItem("feliciano_admin_password") || defaultPassword;
        if (currentPassword !== storedPassword) {
          throw new Error("Current password is incorrect.");
        }
        localStorage.setItem("feliciano_admin_password", newPassword);
      }
      return { ok: true };
    },

    // 14. HELPER: CLOUDINARY CLIENT UPLOAD
    dbUploadImage: async function (file) {
      const cloudName = window.ENV && window.ENV.cloudinary && window.ENV.cloudinary.cloudName;
      const uploadPreset = window.ENV && window.ENV.cloudinary && window.ENV.cloudinary.uploadPreset;

      const isCloudinaryConfigured = cloudName && !cloudName.includes("YOUR_CLOUDINARY_CLOUD_NAME") &&
                                     uploadPreset && !uploadPreset.includes("YOUR_CLOUDINARY_UPLOAD_PRESET");

      if (isCloudinaryConfigured) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error?.message || "Cloudinary upload failed");
        }
        const data = await res.json();
        return {
          url: data.secure_url,
          publicId: data.public_id
        };
      } else {
        // Fallback: convert file to Base64 dataURL for client-side persistence preview
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ url: reader.result, publicId: "" });
          reader.onerror = (e) => reject(new Error("File reading failed"));
          reader.readAsDataURL(file);
        });
      }
    },

    normalizeMap: function (input) {
      const value = String(input || "").trim();
      const srcMatch = value.match(/src=["']([^"']+)["']/i);
      return srcMatch ? srcMatch[1] : value;
    },

    // Helper to auto-create Firestore default docs if they don't exist
    ensureFirestoreInitialized: async function () {
      if (!useFirebase) return;
      try {
        const settingsRef = db.collection("config").doc("settings");
        const settingsDoc = await settingsRef.get();
        if (!settingsDoc.exists) {
          await settingsRef.set(DEFAULTS.settings);
        }

        const imagesRef = db.collection("config").doc("images");
        const imagesDoc = await imagesRef.get();
        if (!imagesDoc.exists) {
          await imagesRef.set(DEFAULTS.images);
        }
      } catch (e) {
        console.warn("Failed to auto-initialize defaults in Firestore (might be due to permission rules):", e);
      }
    }
  };

  window.dbApi = dbApi;
})();
