import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { db } from "./firebase-config.js";

// Spinner Helper
function showLoading(show) {
  const spinner = document.getElementById("spinner") || document.getElementById("loading-popup");
  if (spinner) spinner.style.display = show ? "flex" : "none";
}

let userId = localStorage.getItem("userId") || null;
let startTime = null;

// -------- SIGNUP --------
window.signup = async function () {
  const name = document.getElementById("signup-name").value.trim();
  const contact = document.getElementById("signup-contact").value.trim();
  const uid = document.getElementById("signup-uid").value.trim();
  const password = document.getElementById("signup-password").value.trim();
  const confirmPassword = document.getElementById("signup-confirm").value.trim();
  const status = document.getElementById("status");

  // Basic field check
  if (!name || !contact || !uid || !password || !confirmPassword) {
    status.textContent = "Please fill all fields.";
    status.style.color = "#e74c3c";
    return;
  }

  // Password match check
  if (password !== confirmPassword) {
    status.textContent = "Passwords do not match.";
    status.style.color = "#e74c3c";
    return;
  }

  try {
    showLoading(true);
    const q = query(collection(db, "accounts"), where("uid", "==", uid));
    const result = await getDocs(q);

    if (!result.empty) {
      status.textContent = "User ID already exists.";
      status.style.color = "#e74c3c";
      return;
    }

    await addDoc(collection(db, "accounts"), {
      name, contact, uid, password,
      timestamp: serverTimestamp()
    });

    status.textContent = "Signup successful!";
    status.style.color = "#27ae60";
    setTimeout(() => window.location.href = "login.html", 1000);
  } catch (err) {
    console.error("Signup error:", err);
    status.textContent = "Error during signup.";
    status.style.color = "#e74c3c";
  } finally {
    showLoading(false);
  }
};


// -------- LOGIN --------
window.login = async function () {
  const uid = document.getElementById("login-uid").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const status = document.getElementById("status");

  if (!uid || !password) {
    status.textContent = "Enter credentials.";
    return;
  }

  try {
    showLoading(true);
    const q = query(collection(db, "accounts"), where("uid", "==", uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      status.textContent = "User not found!";
      return;
    }

    const userDoc = snap.docs[0];
    const user = userDoc.data();

    if (user.password === password) {
      userId = userDoc.id;
      localStorage.setItem("userId", userId);
      status.textContent = "Login successful!";
      setTimeout(() => window.location.href = "dashboard.html", 1000);
    } else {
      status.textContent = "Invalid password.";
    }
  } catch (err) {
    console.error("Login error:", err);
    status.textContent = "Login failed.";
  } finally {
    showLoading(false);
  }
};

// -------- ADMIN LOGIN --------
window.adminLogin = function () {
  const id = document.getElementById("admin-id").value;
  const pass = document.getElementById("admin-pass").value;
  const status = document.getElementById("status");

  if (id === "admin" && pass === "admin123") {
    document.getElementById("login-container").style.display = "none";
    document.getElementById("admin-section").style.display = "block";
    status.textContent = "Admin login successful.";
    showLoading(true);
    loadAllLogs().then(() => showLoading(false));
  } else {
    status.textContent = "Invalid credentials.";
  }
};

// -------- ADMIN LOGOUT --------
window.adminLogout = function () {
  document.getElementById("login-container").style.display = "block";
  document.getElementById("admin-section").style.display = "none";
  document.getElementById("status").textContent = "";
};

// -------- START CHARGING --------
window.startCharging = async function () {
  const status = document.getElementById("status");
  if (!userId) {
    status.textContent = "❌ Please login.";
    return;
  }

  showLoading(true); // Show loader at start

  try {
    const q = query(collection(db, "charging_logs"), where("userId", "==", userId), where("endTime", "==", null));
    const result = await getDocs(q);

    if (!result.empty) {
      status.textContent = "⚡ Charging already started.";
      return;
    }

    const start = new Date();
    startTime = start;

    await addDoc(collection(db, "charging_logs"), {
      userId,
      startTime: start,
      endTime: null,
      duration: null,
      amount: null,
      timestamp: serverTimestamp()
    });

    status.textContent = "⚡ Charging started at " + start.toLocaleTimeString();
  } catch (err) {
    console.error("Start charging error:", err);
    status.textContent = "Error starting charging.";
  } finally {
    showLoading(false); // Hide loader
  }
};


// -------- STOP CHARGING --------
window.stopCharging = async function () {
  const status = document.getElementById("status");
  const amountBox = document.getElementById("amount");

  showLoading(true); // Show loader at start

  try {
    const q = query(collection(db, "charging_logs"), where("userId", "==", userId), where("endTime", "==", null));
    const result = await getDocs(q);

    if (result.empty) {
      status.textContent = "No active session.";
      return;
    }

    const ref = result.docs[0].ref;
    const data = result.docs[0].data();
    const start = data.startTime.toDate();
    const end = new Date();
    const duration = (end - start) / 1000;
    const rate = 15 / 3600;
    const cost = duration * rate;

    await updateDoc(ref, {
      endTime: end,
      duration,
      amount: cost
    });

    status.textContent = ` Charging stopped. ₹${cost.toFixed(2)} charged.`;
    if (amountBox) amountBox.textContent = `Total: ₹${cost.toFixed(2)}`;

    loadUserHistory();
  } catch (err) {
    console.error("Stop charging error:", err);
    status.textContent = "Error stopping charging.";
  } finally {
    showLoading(false); // Hide loader
  }
};


// -------- USER HISTORY --------
window.loadUserHistory = async function () {
  const list = document.getElementById("history");
  if (!list || !userId) return;

  list.innerHTML = "";

  const q = query(collection(db, "charging_logs"), where("userId", "==", userId));
  const snap = await getDocs(q);

  const logsByDate = {};

  snap.forEach(doc => {
    const data = doc.data();
    if (!data.startTime) return;

    const date = data.startTime.toDate();
    const key = date.toDateString();
    if (!logsByDate[key]) logsByDate[key] = [];

    logsByDate[key].push({
      time: date.toLocaleTimeString(),
      amount: data.amount ? data.amount.toFixed(2) : "--"
    });
  });

  for (const date in logsByDate) {
    const dateHeader = document.createElement("h4");
    dateHeader.textContent = `📅 ${date}`;
    list.appendChild(dateHeader);

    logsByDate[date].forEach(entry => {
      const li = document.createElement("li");
      li.textContent = `• Start: ${entry.time} | Amount: ₹${entry.amount}`;
      list.appendChild(li);
    });
  }
};

// -------- ADMIN LOGS --------
window.loadAllLogs = async function () {
  const list = document.getElementById("admin-logs");
  if (!list) return;

  list.innerHTML = "";
  const q = query(collection(db, "charging_logs"), orderBy("startTime", "desc"));
  const snap = await getDocs(q);

  const grouped = {};

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (!data.startTime) continue;

    const date = data.startTime.toDate();
    const dateKey = date.toDateString();
    if (!grouped[dateKey]) grouped[dateKey] = [];

    const userRef = doc(db, "accounts", data.userId);
    const userDoc = await getDoc(userRef);
    const username = userDoc.exists() ? userDoc.data().name : "Unknown";

    grouped[dateKey].push({
      name: username,
      time: date.toLocaleTimeString(),
      amount: data.amount ? data.amount.toFixed(2) : "--"
    });
  }

  for (const date in grouped) {
    const dateHeader = document.createElement("h4");
    dateHeader.textContent = `📅 ${date}`;
    list.appendChild(dateHeader);

    grouped[date].forEach(log => {
      const li = document.createElement("li");
      li.textContent = `• ${log.name} | Start: ${log.time} | Amount: ₹${log.amount}`;
      list.appendChild(li);
    });
  }
};

// -------- AUTO INIT ON DASHBOARD --------
if (window.location.pathname.includes("dashboard.html")) {
  if (!userId) {
    alert("Please login first.");
    window.location.href = "login.html";
  } else {
    (async () => {
      const userDoc = await getDoc(doc(db, "accounts", userId));
      if (userDoc.exists()) {
        const name = userDoc.data().name;
        const welcome = document.getElementById("welcome-msg");
        if (welcome) welcome.textContent = `Welcome, ${name}!`;
      }

      await loadUserHistory();
    })();
  }
}
