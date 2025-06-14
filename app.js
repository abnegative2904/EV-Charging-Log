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

// Global variables
let userId = localStorage.getItem("userId") || null;
let startTime = null;

// ---------------- SIGNUP ------------------
window.signup = async function () {
  const name = document.getElementById("signup-name").value;
  const contact = document.getElementById("signup-contact").value;
  const uid = document.getElementById("signup-uid").value;
  const password = document.getElementById("signup-password").value;

  if (!name || !contact || !uid || !password) {
    alert("Please fill in all fields.");
    return;
  }

  const q = query(collection(db, "accounts"), where("uid", "==", uid));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    alert("User ID already exists!");
    return;
  }

  await addDoc(collection(db, "accounts"), {
    name,
    contact,
    uid,
    password,
    timestamp: serverTimestamp()
  });

  alert("Sign up successful! Please login.");
  window.location.href = "login.html";
};

// ---------------- LOGIN ------------------
window.login = async function () {
  const uid = document.getElementById("login-uid").value;
  const password = document.getElementById("login-password").value;

  const q = query(collection(db, "accounts"), where("uid", "==", uid));
  const querySnapshot = await getDocs(q);

  if (
    querySnapshot.empty ||
    querySnapshot.docs[0].data().password !== password
  ) {
    alert("Invalid credentials.");
    return;
  }

  userId = querySnapshot.docs[0].id;
  localStorage.setItem("userId", userId);

  alert("Login successful!");
  window.location.href = "dashboard.html";
};

// ---------------- ADMIN LOGIN ------------------
window.adminLogin = function () {
  const adminId = document.getElementById("admin-id").value;
  const adminPass = document.getElementById("admin-pass").value;

  if (adminId === "admin" && adminPass === "admin123") {
    document.getElementById("admin-section").style.display = "block";
    loadAllLogs();
  } else {
    alert("Invalid admin credentials.");
  }
};

// ---------------- START CHARGING ------------------
window.startCharging = async function () {
  if (!userId) {
    alert("Please login first.");
    return;
  }

  // Check if a session already exists
  const q = query(
    collection(db, "charging_logs"),
    where("userId", "==", userId),
    where("endTime", "==", null)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    alert("Charging already in progress.");
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

  document.getElementById("status").textContent =
    "Charging started at " + start.toLocaleTimeString();
};

// ---------------- STOP CHARGING ------------------
window.stopCharging = async function () {
  const q = query(
    collection(db, "charging_logs"),
    where("userId", "==", userId),
    where("endTime", "==", null)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    alert("No active session found.");
    return;
  }

  const docRef = querySnapshot.docs[0].ref;
  const data = querySnapshot.docs[0].data();
  const start = data.startTime.toDate();
  const end = new Date();

  const duration = (end - start) / 1000; // in seconds
  const rate = 15 / 3600; // ₹15 per hour = ₹0.0041667 per second
  const amount = duration * rate;

  await updateDoc(docRef, {
    endTime: end,
    duration,
    amount
  });

  document.getElementById("status").textContent =
    `Charging stopped at ${end.toLocaleTimeString()}`;
  document.getElementById("amount").textContent =
    `Total Amount: ₹${amount.toFixed(2)}`;

  startTime = null;
  loadUserHistory();
};

// ---------------- LOAD USER HISTORY ------------------
window.loadUserHistory = async function () {
  if (!userId) return;

  const q = query(collection(db, "charging_logs"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const list = document.getElementById("history");
  if (!list) return;

  list.innerHTML = "";
  const groupedLogs = {};

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.startTime) return;

    const date = data.startTime.toDate();
    const dateStr = date.toDateString();
    if (!groupedLogs[dateStr]) groupedLogs[dateStr] = [];

    groupedLogs[dateStr].push({
      time: date.toLocaleTimeString(),
      amount: data.amount ? data.amount.toFixed(2) : "--"
    });
  });

  for (const date in groupedLogs) {
    const dateHeader = document.createElement("h4");
    dateHeader.textContent = `📅 ${date}`;
    list.appendChild(dateHeader);

    groupedLogs[date].forEach((log) => {
      const li = document.createElement("li");
      li.textContent = `• Start: ${log.time} | Amount: ₹${log.amount}`;
      list.appendChild(li);
    });
  }
};

// ---------------- LOAD ALL LOGS FOR ADMIN ------------------
window.loadAllLogs = async function () {
  const logsRef = collection(db, "charging_logs");
  const q = query(logsRef, orderBy("startTime", "desc"));
  const querySnapshot = await getDocs(q);

  const adminList = document.getElementById("admin-logs");
  adminList.innerHTML = "";

  const groupedLogs = {};

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    if (!data.startTime) continue;
    const date = data.startTime.toDate();
    const dateStr = date.toDateString();

    const userDoc = await getDoc(doc(db, "accounts", data.userId));
    const username = userDoc.exists() ? userDoc.data().name : data.userId;

    if (!groupedLogs[dateStr]) groupedLogs[dateStr] = [];
    groupedLogs[dateStr].push({
      name: username,
      time: date.toLocaleTimeString(),
      amount: data.amount ? data.amount.toFixed(2) : "--"
    });
  }

  for (const date in groupedLogs) {
    const dateHeader = document.createElement("h4");
    dateHeader.textContent = `📅 ${date}`;
    adminList.appendChild(dateHeader);

    groupedLogs[date].forEach((log) => {
      const li = document.createElement("li");
      li.textContent = `• ${log.name} | Start: ${log.time} | Amount: ₹${log.amount}`;
      adminList.appendChild(li);
    });
  }
};

// ---------------- SHOW WELCOME NAME ------------------
async function showWelcomeName() {
  const userDoc = await getDoc(doc(db, "accounts", userId));
  if (userDoc.exists()) {
    const name = userDoc.data().name;
    const welcomeEl = document.getElementById("welcome-msg");
    if (welcomeEl) welcomeEl.textContent = `Welcome, ${name}!`;

    // Check for ongoing session
    const q = query(
      collection(db, "charging_logs"),
      where("userId", "==", userId),
      where("endTime", "==", null)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const start = querySnapshot.docs[0].data().startTime.toDate();
      const ageMs = new Date() - start;
      if (ageMs < 8 * 60 * 60 * 1000) {
        document.getElementById("status").textContent =
          "Charging started at " + start.toLocaleTimeString();
      } else {
        // Auto-expire session
        await updateDoc(querySnapshot.docs[0].ref, {
          endTime: start,
          duration: 0,
          amount: 0
        });
      }
    }
  }
}

// ---------------- AUTO LOAD ON DASHBOARD ------------------
if (window.location.pathname.includes("dashboard.html")) {
  if (!userId) {
    alert("Please login first.");
    window.location.href = "login.html";
  } else {
    showWelcomeName();
    loadUserHistory();
  }
}
