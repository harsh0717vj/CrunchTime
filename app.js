// ==========================================
// CENTRALIZED CONFIGURATION (No external config.js needed)
// ==========================================
export const firebaseConfig = {
  apiKey: "AIzaSyDxval4eTEYGPttDaEF2PrKjaCi6Z9ZABM",
  authDomain: "crunchtime-57e84.firebaseapp.com",
  projectId: "crunchtime-57e84",
  storageBucket: "crunchtime-57e84.firebasestorage.app",
  messagingSenderId: "220460702653",
  appId: "1:220460702653:web:a6193a97e389999b6a50d4"
};

export const GEMINI_API_KEY = "AQ.Ab8RN6KchYUFU-77ebneOnZFsrdGYZYKWZJ-ouLkHJlAYhCisw"; // 🔑 Paste your real Gemini key string here

// ==========================================
// CORE PLATFORM INITIALIZATION
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDocs, writeBatch, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * CRUNCHTIME - APPLICATION ENGINE
 */

let tasks = [];
let customSections = [];

const DAILY_QUOTES = [
  "The secret of getting ahead is getting started.",
  "Done is better than perfect.",
  "Focus on progress, not perfection.",
  "One task at a time. That is enough.",
  "Deadlines are not threats, they are finish lines.",
  "Small steps every day lead to massive results.",
  "You do not have to be great to start.",
  "Discipline is choosing between what you want now and what you want most.",
  "The best time to start was yesterday. The next best time is now.",
  "Pressure makes diamonds.",
  "Ship it. Improve it. Repeat.",
  "Your future self is watching you right now.",
  "Consistency beats intensity every single time.",
  "Start before you are ready.",
  "Momentum is everything. Keep moving.",
  "Every expert was once a beginner who refused to quit.",
  "Do the hard thing first. Everything else gets easier.",
  "You are one task away from a better day.",
  "Procrastination is the thief of dreams.",
  "The clock is ticking. Make it count.",
  "Great things are done by a series of small things.",
  "Not all tasks are equal. Prioritize ruthlessly.",
  "Action cures fear. Start now.",
  "Your goals do not care about your mood.",
  "Clarity comes from action, not thought.",
  "A year from now you will wish you had started today.",
  "Work hard in silence. Let results make the noise.",
  "The only way out is through.",
  "Be so productive they cannot ignore you.",
  "Every completed task is a victory. Celebrate it."
];

function initCustomSections() {
  const stored = localStorage.getItem("crunchtime_custom_sections");
  if (stored) {
    try {
      customSections = JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse custom sections", e);
      customSections = [];
    }
  } else {
    customSections = [];
  }
}

function saveCustomSections() {
  localStorage.setItem("crunchtime_custom_sections", JSON.stringify(customSections));
}

const DEFAULT_TASKS = [
  {
    id: "sample-task-1",
    name: "Design CrunchTime Presentation Slide Deck",
    description: "Refine typography, color contrast, and structure slides detailing the value proposition, user journey, and technical design.",
    deadline: getFutureTimeISO(2.5), 
    priority: "high",
    completed: false,
    createdAt: getFutureTimeISO(-1.5) 
  },
  {
    id: "sample-task-2",
    name: "Audit Firebase Security Rules & DB Snapshot",
    description: "Run weekly backups of development database and verify that security rules restrict unauthorized read/writes.",
    deadline: getFutureTimeISO(27), 
    priority: "medium",
    completed: false,
    createdAt: getFutureTimeISO(-25) 
  }
];

function getFutureTimeISO(hoursInFuture) {
  const now = new Date();
  now.setMilliseconds(now.getMilliseconds() + (hoursInFuture * 60 * 60 * 1000));
  return now.toISOString();
}

function initTasks() {
  initCustomSections();
  const stored = localStorage.getItem("crunchtime_tasks");
  if (stored) {
    try {
      tasks = JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored tasks, reverting to defaults", e);
      tasks = [...DEFAULT_TASKS];
      saveToLocalStorage();
    }
  } else {
    tasks = [...DEFAULT_TASKS];
    saveToLocalStorage();
  }
}

function saveToLocalStorage() {
  localStorage.setItem("crunchtime_tasks", JSON.stringify(tasks));
  syncTasksToFirebase(); 
}

async function syncTasksToFirebase() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const tasksColRef = collection(db, "users", user.uid, "tasks");
    const existingSnapshot = await getDocs(tasksColRef);

    const currentTaskIds = new Set(tasks.map(t => t.id));
    const batch = writeBatch(db);

    existingSnapshot.docs.forEach(docSnap => {
      if (!currentTaskIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    tasks.forEach(task => {
      const taskDocRef = doc(db, "users", user.uid, "tasks", task.id);
      batch.set(taskDocRef, task);
    });

    await batch.commit();
    console.log("✓ Firestore synced:", tasks.length, "tasks");

  } catch (err) {
    console.error("Firestore sync error:", err);
  }
}

// ==========================================
// DOM MANAGEMENT & EVENT BINDINGS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  initTasks();

  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      setTimeout(() => {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 150);
    }
  }

  function showCustomConfirm(title, message, onConfirm) {
    const overlay = document.getElementById("custom-confirm-overlay");
    const titleEl = document.getElementById("confirm-title");
    const messageEl = document.getElementById("confirm-message");
    const okBtn = document.getElementById("confirm-ok-btn");
    const cancelBtn = document.getElementById("confirm-cancel-btn");

    if (!overlay) return;

    titleEl.textContent = title;
    messageEl.textContent = message;
    overlay.classList.remove("hidden");

    const handleOk = () => {
      overlay.classList.add("hidden");
      okBtn.removeEventListener("click", handleOk);
      cancelBtn.removeEventListener("click", handleCancel);
      onConfirm();
    };

    const handleCancel = () => {
      overlay.classList.add("hidden");
      okBtn.removeEventListener("click", handleOk);
      cancelBtn.removeEventListener("click", handleCancel);
    };

    okBtn.addEventListener("click", handleOk);
    cancelBtn.addEventListener("click", handleCancel);
  }

  function showCustomPrompt(title, desc, placeholder, onConfirm) {
    const overlay = document.getElementById("custom-input-overlay");
    const titleEl = document.getElementById("input-modal-title");
    const descEl = document.getElementById("input-modal-desc");
    const field = document.getElementById("input-modal-field");
    const okBtn = document.getElementById("input-modal-ok");
    const cancelBtn = document.getElementById("input-modal-cancel");

    if (!overlay) return;

    titleEl.textContent = title;
    descEl.textContent = desc;
    field.placeholder = placeholder;
    field.value = "";
    overlay.classList.remove("hidden");

    setTimeout(() => field.focus(), 50);

    const handleOk = () => {
      const value = field.value.trim();
      if (!value) {
        field.style.borderColor = "var(--color-red)";
        field.focus();
        return;
      }
      cleanup();
      onConfirm(value);
    };

    const handleCancel = () => {
      cleanup();
    };

    const handleKeydown = (e) => {
      if (e.key === "Enter") handleOk();
      if (e.key === "Escape") handleCancel();
    };

    const cleanup = () => {
      overlay.classList.add("hidden");
      field.style.borderColor = "";
      okBtn.removeEventListener("click", handleOk);
      cancelBtn.removeEventListener("click", handleCancel);
      field.removeEventListener("keydown", handleKeydown);
    };

    okBtn.addEventListener("click", handleOk);
    cancelBtn.addEventListener("click", handleCancel);
    field.addEventListener("keydown", handleKeydown);
  }

  const addTaskForm = document.getElementById("add-task-form");
  const taskNameInput = document.getElementById("task-name");
  const taskDescInput = document.getElementById("task-desc");
  const taskDeadlineInput = document.getElementById("task-deadline");
  const taskPrioritySelect = document.getElementById("task-priority");
  
  const tasksContainer = document.getElementById("tasks-container");
  const emptyState = document.getElementById("empty-state");
  const sidebarItems = document.querySelectorAll(".sidebar-nav-item");
  
  const totalStatEl = document.getElementById("stat-count-total");
  const completedStatEl = document.getElementById("stat-count-completed");
  const urgentStatEl = document.getElementById("stat-count-urgent");
  const overdueStatEl = document.getElementById("stat-count-overdue");
  
  const chatDrawer = document.getElementById("ai-chat-drawer");
  const chatToggleBtn = document.getElementById("chat-toggle-btn");
  const chatInputForm = document.getElementById("chat-input-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const chatUnreadBadge = document.getElementById("chat-unread-badge");

  const sidebarToggle = document.getElementById("sidebar-logo-toggle");
  const pageSidebar = document.getElementById("page-sidebar");
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  const taskNoDeadline = document.getElementById("task-no-deadline");
  const deadlineInputRow = document.getElementById("deadline-input-row");

  let activeFilter = "all"; 
  let unreadCount = 0;

  const minDateTime = new Date();
  minDateTime.setMinutes(minDateTime.getMinutes() - minDateTime.getTimezoneOffset());
  taskDeadlineInput.min = minDateTime.toISOString().slice(0, 16);

  const googleSigninBtn = document.getElementById("google-signin-btn");
  if (googleSigninBtn) googleSigninBtn.addEventListener("click", signInWithGoogle);

  const signoutBtn = document.getElementById("signout-btn");
  if (signoutBtn) signoutBtn.addEventListener("click", signOutUser);

  function updateSectionDropdown() {
    const select = document.getElementById("task-section");
    if (!select) return;
    
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    customSections.forEach(section => {
      const opt = document.createElement("option");
      opt.value = section.id;
      opt.textContent = section.name;
      select.appendChild(opt);
    });
  }

  function createCustomSection(name) {
    const id = "custom-" + Date.now();
    customSections.push({ id, name });
    saveCustomSections();
    updateSectionDropdown();
    renderTasks();
  }

  updateSectionDropdown();
  renderTasks();
  updateStats();
  updateProductivityReport();
  
  setInterval(() => {
    updateSystemClock();
    updateCountdownTickers();
    updateStats();
  }, 1000);

  updateSystemClock();

  const statCardsList = [totalStatEl, completedStatEl, urgentStatEl, overdueStatEl].map(el => el ? el.closest(".stat-card") : null);

  function setFilter(filterName) {
    activeFilter = filterName;
    sidebarItems.forEach(item => {
      if (item.getAttribute("data-filter") === filterName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
    renderTasks();
  }

  if (sidebarToggle && pageSidebar) {
    sidebarToggle.addEventListener("click", () => {
      pageSidebar.classList.toggle("sidebar-collapsed");
    });
  }

  if (mobileMenuBtn && pageSidebar && sidebarBackdrop) {
    mobileMenuBtn.addEventListener("click", () => {
      pageSidebar.classList.add("open");
      sidebarBackdrop.classList.add("active");
    });
    sidebarBackdrop.addEventListener("click", () => {
      pageSidebar.classList.remove("open");
      sidebarBackdrop.classList.remove("active");
    });
  }

  if (taskNoDeadline && deadlineInputRow) {
    taskNoDeadline.addEventListener("change", () => {
      if (taskNoDeadline.checked) {
        deadlineInputRow.classList.add("hidden");
        taskDeadlineInput.value = "";
      } else {
        deadlineInputRow.classList.remove("hidden");
        const reMinDateTime = new Date();
        reMinDateTime.setMinutes(reMinDateTime.getMinutes() - reMinDateTime.getTimezoneOffset());
        taskDeadlineInput.min = reMinDateTime.toISOString().slice(0, 16);
      }
    });
  }

  if (tasksContainer) {
    tasksContainer.addEventListener("click", (e) => {
      const header = e.target.closest(".section-group-header");
      if (header) {
        if (e.target.closest(".btn-add-section-inline") || e.target.closest(".btn-delete-section-inline")) return;
        const section = header.closest(".task-section");
        if (section) {
          section.classList.toggle("collapsed");
          if (!section.classList.contains("collapsed")) {
            setTimeout(() => {
              section.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 150);
          }
        }
      }
    });
  }

  document.addEventListener("click", (e) => {
    const mainAddBtn = e.target.closest(".btn-add-section");
    if (mainAddBtn) {
      e.preventDefault();
      e.stopPropagation();
      showCustomPrompt(
        "Create New Section",
        "Organize your tasks by giving this section a name.",
        "e.g. Work, College, Side Projects...",
        (sectionName) => { createCustomSection(sectionName); }
      );
      return;
    }

    const inlineAddBtn = e.target.closest(".btn-add-section-inline");
    if (inlineAddBtn) {
      e.preventDefault();
      e.stopPropagation();

      const sectionEl = inlineAddBtn.closest(".task-section");
      if (sectionEl) {
        const sectionIdAttr = sectionEl.id;

        if (sectionIdAttr === "section-today") {
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 0, 0);
          const localISO = new Date(endOfToday.getTime() - endOfToday.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          if (document.getElementById("task-no-deadline")) document.getElementById("task-no-deadline").checked = false;
          if (document.getElementById("deadline-input-row")) document.getElementById("deadline-input-row").classList.remove("hidden");
          if (document.getElementById("task-deadline")) document.getElementById("task-deadline").value = localISO;
          if (document.getElementById("task-section")) document.getElementById("task-section").value = "auto";

        } else if (sectionIdAttr === "section-upcoming") {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(12, 0, 0, 0);
          const localISO = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          if (document.getElementById("task-no-deadline")) document.getElementById("task-no-deadline").checked = false;
          if (document.getElementById("deadline-input-row")) document.getElementById("deadline-input-row").classList.remove("hidden");
          if (document.getElementById("task-deadline")) document.getElementById("task-deadline").value = localISO;
          if (document.getElementById("task-section")) document.getElementById("task-section").value = "auto";

        } else if (sectionIdAttr === "section-someday") {
          if (document.getElementById("task-no-deadline")) document.getElementById("task-no-deadline").checked = true;
          if (document.getElementById("deadline-input-row")) document.getElementById("deadline-input-row").classList.add("hidden");
          if (document.getElementById("task-deadline")) document.getElementById("task-deadline").value = "";
          if (document.getElementById("task-section")) document.getElementById("task-section").value = "auto";

        } else if (sectionIdAttr && sectionIdAttr.startsWith("section-custom-")) {
          const customId = sectionIdAttr.replace("section-custom-", "");
          if (document.getElementById("task-section")) document.getElementById("task-section").value = customId;
          if (document.getElementById("task-no-deadline")) document.getElementById("task-no-deadline").checked = true;
          if (document.getElementById("deadline-input-row")) document.getElementById("deadline-input-row").classList.add("hidden");
        }
      }

      const formSection = document.querySelector(".form-section");
      if (formSection) formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => { if (taskNameInput) taskNameInput.focus(); }, 400);
    }
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-delete-section-inline");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    
    const sectionId = btn.getAttribute("data-id");
    if (!sectionId) return;
    
    const section = customSections.find(s => s.id === sectionId);
    if (!section) return;

    showCustomConfirm(
      `Delete "${section.name}"?`,
      `Tasks inside will move to No Deadline Tasks.`,
      () => {
        tasks.forEach(t => {
          if (t.section === sectionId) {
            t.section = "auto";
            t.deadline = null;
          }
        });
        customSections = customSections.filter(s => s.id !== sectionId);
        saveToLocalStorage();
        saveCustomSections();
        updateSectionDropdown();
        renderTasks();
        updateStats();
      }
    );
  });

  sidebarItems.forEach(item => {
    item.addEventListener("click", (e) => {
      statCardsList.forEach(c => c && c.classList.remove("active"));
      tasksContainer.classList.remove("focus-completed", "focus-urgent", "focus-overdue");

      sidebarItems.forEach(t => t.classList.remove("active"));
      item.classList.add("active");
      activeFilter = item.getAttribute("data-filter");
      
      if (activeFilter === "today") {
        if (document.getElementById("section-today")) document.getElementById("section-today").classList.remove("collapsed");
      } else if (activeFilter === "completed") {
        if (document.getElementById("section-completed")) document.getElementById("section-completed").classList.remove("collapsed");
      }

      renderTasks();

      if (activeFilter === "all" || activeFilter === "active" || activeFilter === "today") {
        scrollToSection("section-today");
      } else if (activeFilter === "completed") {
        scrollToSection("section-completed");
      }

      if (window.innerWidth <= 768 && pageSidebar && sidebarBackdrop) {
        pageSidebar.classList.remove("open");
        sidebarBackdrop.classList.remove("active");
      }
    });
  });

  statCardsList.forEach(card => {
    if (!card) return;
    card.addEventListener("click", () => {
      const isAlreadyActive = card.classList.contains("active");
      statCardsList.forEach(c => c && c.classList.remove("active"));
      tasksContainer.classList.remove("focus-completed", "focus-urgent", "focus-overdue");

      if (isAlreadyActive) return;

      if (card.id === "stat-total") {
        card.classList.add("active");
        setFilter("all");
      } else {
        setFilter("all");
        card.classList.add("active");

        if (card.id === "stat-completed") {
          tasksContainer.classList.add("focus-completed");
          if (document.getElementById("section-completed")) document.getElementById("section-completed").classList.remove("collapsed");
        } else if (card.id === "stat-urgent") {
          tasksContainer.classList.add("focus-urgent");
          if (document.getElementById("section-today")) document.getElementById("section-today").classList.remove("collapsed");
          if (document.getElementById("section-upcoming")) document.getElementById("section-upcoming").classList.remove("collapsed");
        } else if (card.id === "stat-overdue") {
          tasksContainer.classList.add("focus-overdue");
          if (document.getElementById("section-today")) document.getElementById("section-today").classList.remove("collapsed");
        }
      }

      if (card.id === "stat-total" || card.id === "stat-urgent" || card.id === "stat-overdue") {
        scrollToSection("section-today");
      } else if (card.id === "stat-completed") {
        scrollToSection("section-completed");
      }
    });
  });

  addTaskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    let isValid = true;
    const name = taskNameInput.value.trim();
    const desc = taskDescInput.value.trim();
    const deadlineVal = taskDeadlineInput.value;
    const priority = taskPrioritySelect.value;
    const noDeadline = taskNoDeadline && taskNoDeadline.checked;
    const sectionVal = document.getElementById("task-section") ? document.getElementById("task-section").value : "auto";
    
    document.getElementById("name-error").style.display = "none";
    document.getElementById("deadline-error").style.display = "none";
    taskNameInput.parentElement.classList.remove("has-error");
    taskDeadlineInput.parentElement.classList.remove("has-error");
    
    if (!name) {
      document.getElementById("name-error").style.display = "block";
      taskNameInput.parentElement.classList.add("has-error");
      isValid = false;
    }
    
    if (!noDeadline) {
      if (!deadlineVal) {
        document.getElementById("deadline-error").textContent = "Please set a valid deadline.";
        document.getElementById("deadline-error").style.display = "block";
        taskDeadlineInput.parentElement.classList.add("has-error");
        isValid = false;
      } else {
        const selectedDate = new Date(deadlineVal);
        if (selectedDate <= new Date()) {
          document.getElementById("deadline-error").textContent = "Deadline must be in the future.";
          document.getElementById("deadline-error").style.display = "block";
          taskDeadlineInput.parentElement.classList.add("has-error");
          isValid = false;
        }
      }
    }
    
    if (!isValid) return;

    const newTask = {
      id: "task-" + Date.now(),
      name,
      description: desc,
      deadline: noDeadline ? null : new Date(deadlineVal).toISOString(),
      priority,
      completed: false,
      section: sectionVal,
      createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveToLocalStorage();
    
    renderTasks();
    updateStats();
    updateProductivityReport();
    addTaskForm.reset();

    if (deadlineInputRow) deadlineInputRow.classList.remove("hidden");
    
    const reMinDateTime = new Date();
    reMinDateTime.setMinutes(reMinDateTime.getMinutes() - reMinDateTime.getTimezoneOffset());
    taskDeadlineInput.min = reMinDateTime.toISOString().slice(0, 16);
  });

  tasksContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    
    const card = btn.closest(".task-card");
    const taskId = card.getAttribute("data-id");
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) return;
    const task = tasks[taskIndex];

    if (btn.classList.contains("btn-complete")) {
      task.completed = !task.completed;
      if (task.completed) {
        task.completedAt = new Date().toISOString();
      } else {
        delete task.completedAt;
      }
      saveToLocalStorage();
      renderTasks();
      updateStats();
      updateProductivityReport();
    } else if (btn.classList.contains("btn-delete")) {
      showCustomConfirm(
        "Delete Task?",
        `Remove "${task.name}" from operations?`,
        () => {
          tasks.splice(taskIndex, 1);
          saveToLocalStorage();
          renderTasks();
          updateStats();
          updateProductivityReport();
        }
      );
    } else if (btn.classList.contains("btn-ai-help")) {
      requestAIHelpForTask(task);
    }
  });

  chatToggleBtn.addEventListener("click", () => {
    const isExpanded = chatDrawer.classList.toggle("is-expanded");
    chatToggleBtn.setAttribute("aria-expanded", isExpanded);
    if (isExpanded) {
      unreadCount = 0;
      chatUnreadBadge.classList.add("hidden");
      chatUnreadBadge.textContent = "0";
      setTimeout(() => chatInput.focus(), 300);
      scrollToBottom();
    }
  });

  chatInputForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query) return;

    appendChatMessage("outgoing", query);
    chatInput.value = "";
    scrollToBottom();

    simulateAIResponse(query);
  });

  chatMessages.addEventListener("click", (e) => {
    const pill = e.target.closest(".suggest-pill");
    if (!pill) return;
    const prompt = pill.getAttribute("data-prompt");
    if (prompt) {
      appendChatMessage("outgoing", prompt);
      scrollToBottom();
      simulateAIResponse(prompt);
    }
  });

  // ==========================================
  // VIEW SWITCHERS & DATA VISUALIZATION
  // ==========================================

  function switchView(viewName) {
    const mainGrid = document.querySelector(".main-grid");
    const dashboardStrip = document.querySelector(".dashboard-strip");
    const productivityView = document.getElementById("productivity-view");
    const appContainer = document.querySelector(".app-container");
    const streakBanner = document.getElementById("streak-banner");

    if (viewName === "productivity") {
      if (mainGrid) mainGrid.classList.add("view-hidden");
      if (streakBanner) streakBanner.classList.add("view-hidden");
      if (productivityView) {
        productivityView.classList.remove("view-hidden", "hidden");
        if (dashboardStrip) productivityView.insertBefore(dashboardStrip, productivityView.firstChild);
      }
    } else {
      if (productivityView) productivityView.classList.add("view-hidden");
      if (mainGrid) {
        mainGrid.classList.remove("view-hidden", "hidden");
        if (streakBanner) {
          streakBanner.classList.remove("view-hidden");
          updateStreakBanner();
        }
        if (dashboardStrip && appContainer) {
          appContainer.insertBefore(dashboardStrip, streakBanner || mainGrid);
        }
      }
    }
  }

  function calculateStreak() {
    const completedTasks = tasks.filter(t => t.completed && t.completedAt);
    if (completedTasks.length === 0) return { current: 0, hasCompletedToday: false };

    const completedDates = new Set();
    completedTasks.forEach(t => {
      const date = new Date(t.completedAt);
      completedDates.add(getLocalDateStr(date));
    });

    const todayStr = getLocalDateStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    let streak = 0;
    let hasCompletedToday = completedDates.has(todayStr);
    let checkDate = new Date();

    if (hasCompletedToday) {
      while (true) {
        if (completedDates.has(getLocalDateStr(checkDate))) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      }
    } else if (completedDates.has(yesterdayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        if (completedDates.has(getLocalDateStr(checkDate))) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      }
    }

    return { current: streak, hasCompletedToday };
  }

  function getLocalDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getBestStreak() {
    const stored = localStorage.getItem("crunchtime_best_streak");
    return stored ? parseInt(stored, 10) : 0;
  }

  function saveBestStreak(val) {
    localStorage.setItem("crunchtime_best_streak", val);
  }

  function updateStreakBanner() {
    const banner = document.getElementById("streak-banner");
    if (!banner) return;

    if (activeFilter === "productivity") {
      banner.classList.add("view-hidden");
      return;
    }

    const { current, hasCompletedToday } = calculateStreak();
    const best = getBestStreak();

    let newBest = best;
    if (current > best) {
      newBest = current;
      saveBestStreak(current);
    }

    if (document.getElementById("streak-count")) document.getElementById("streak-count").textContent = current;
    if (document.getElementById("streak-best-count")) document.getElementById("streak-best-count").textContent = newBest;

    const flame = document.getElementById("streak-flame");
    if (flame) {
      flame.className = "flame";
      if (current === 0) flame.classList.add("static-gray");
      else if (!hasCompletedToday) flame.classList.add("dimmed");
    }

    const motivationMsgEl = document.getElementById("streak-motivation-msg");
    if (motivationMsgEl) {
      if (current === 0) motivationMsgEl.textContent = "Complete a task today to ignite your streak! 🎯";
      else if (current <= 2) motivationMsgEl.textContent = "You are just getting started! Keep it up! ⚡";
      else if (current <= 6) motivationMsgEl.textContent = "You are on fire! Don't break the chain! 🔥";
      else if (current <= 13) motivationMsgEl.textContent = "One week strong! You are unstoppable! 💪";
      else motivationMsgEl.textContent = "Legendary streak! You are a productivity beast! 👑";
    }

    const centerEl = banner.querySelector(".streak-center");
    if (centerEl) {
      let quoteEl = document.getElementById("streak-quote");
      if (!quoteEl) {
        quoteEl = document.createElement("p");
        quoteEl.id = "streak-quote";
        quoteEl.className = "streak-quote";
        centerEl.appendChild(quoteEl);
      }
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now - start;
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
      quoteEl.textContent = `"${DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]}"`;
    }
  }

  function renderTasks() {
    if (activeFilter === "productivity") switchView("productivity");
    else { switchView("home"); updateStreakBanner(); }

    updateStreakChart();
    updatePriorityBreakdown();

    if (activeFilter === "productivity") {
      updateProductivityReport();
      updateStats();
      return;
    }

    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    const todayTasks = [];
    const upcomingTasks = [];
    const somedayTasks = [];
    const completedTasks = [];

    const customSectionTasks = {};
    customSections.forEach(sec => { customSectionTasks[sec.id] = []; });

    tasks.forEach(task => {
      if (task.completed) { completedTasks.push(task); return; }
      if (task.section && task.section !== "auto" && customSectionTasks[task.section]) {
        customSectionTasks[task.section].push(task);
      } else {
        if (!task.deadline) somedayTasks.push(task);
        else {
          if (new Date(task.deadline) <= endOfToday) todayTasks.push(task);
          else upcomingTasks.push(task);
        }
      }
    });

    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const sortByPriority = (a, b) => priorityWeight[b.priority] - priorityWeight[a.priority];

    todayTasks.sort(sortByPriority);
    upcomingTasks.sort(sortByPriority);
    somedayTasks.sort(sortByPriority);
    completedTasks.sort((a, b) => b.completedAt && a.completedAt ? new Date(b.completedAt) - new Date(a.completedAt) : priorityWeight[b.priority] - priorityWeight[a.priority]);

    if (document.querySelector("#section-today .count-badge")) document.querySelector("#section-today .count-badge").textContent = todayTasks.length;
    if (document.querySelector("#section-upcoming .count-badge")) document.querySelector("#section-upcoming .count-badge").textContent = upcomingTasks.length;
    if (document.querySelector("#section-someday .count-badge")) document.querySelector("#section-someday .count-badge").textContent = somedayTasks.length;
    if (document.querySelector("#section-completed .count-badge")) document.querySelector("#section-completed .count-badge").textContent = completedTasks.length;

    const sectionToday = document.getElementById("section-today");
    const sectionUpcoming = document.getElementById("section-upcoming");
    const sectionSomeday = document.getElementById("section-someday");
    const sectionCompleted = document.getElementById("section-completed");

    tasksContainer.querySelectorAll(".task-section").forEach(sec => sec.classList.remove("focused-section"));

    if (sectionToday) {
      if (activeFilter === "all" || activeFilter === "active" || activeFilter === "today") {
        sectionToday.classList.remove("hidden");
        if (activeFilter === "today") sectionToday.classList.add("focused-section");
      } else sectionToday.classList.add("hidden");
    }
    if (sectionUpcoming) sectionUpcoming.className = (activeFilter === "all" || activeFilter === "active") ? "task-section" : "task-section hidden";
    if (sectionSomeday) sectionSomeday.className = (activeFilter === "all" || activeFilter === "active") ? "task-section" : "task-section hidden";
    if (sectionCompleted) {
      if (activeFilter === "all" || activeFilter === "completed") {
        sectionCompleted.classList.remove("hidden");
        if (activeFilter === "completed") sectionCompleted.classList.add("focused-section");
      } else sectionCompleted.classList.add("hidden");
    }

    tasksContainer.querySelectorAll(".task-section-custom").forEach(el => el.remove());
    const showCustomSections = (activeFilter === "all" || activeFilter === "active");

    customSections.forEach(section => {
      const secEl = document.createElement("div");
      secEl.className = "task-section task-section-custom";
      secEl.id = `section-custom-${section.id}`;
      if (!showCustomSections) secEl.classList.add("hidden");

      const tasksForSec = customSectionTasks[section.id] || [];
      secEl.innerHTML = `
        <header class="section-group-header">
          <span class="toggle-arrow">▼</span>
          <span class="section-group-title">${escapeHTML(section.name)}</span>
          <button type="button" class="btn-add-section-inline" title="Create Custom Section">+</button>
          <button type="button" class="btn-delete-section-inline" data-id="${section.id}" title="Delete Section">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 7L18.1327 19.1422C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1422L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="count-badge custom-badge">${tasksForSec.length}</span>
        </header>
        <div class="section-cards-wrapper"></div>
      `;

      if (sectionCompleted) tasksContainer.insertBefore(secEl, sectionCompleted);
      else tasksContainer.appendChild(secEl);

      tasksForSec.sort(sortByPriority);
      tasksForSec.forEach(task => secEl.querySelector(".section-cards-wrapper").appendChild(createTaskCardDOM(task)));
    });

    const todayWrapper = document.querySelector("#section-today .section-cards-wrapper");
    const upcomingWrapper = document.querySelector("#section-upcoming .section-cards-wrapper");
    const somedayWrapper = document.querySelector("#section-someday .section-cards-wrapper");
    const completedWrapper = document.querySelector("#section-completed .section-cards-wrapper");

    if (todayWrapper) todayWrapper.innerHTML = "";
    if (upcomingWrapper) upcomingWrapper.innerHTML = "";
    if (somedayWrapper) somedayWrapper.innerHTML = "";
    if (completedWrapper) completedWrapper.innerHTML = "";

    todayTasks.forEach(task => todayWrapper && todayWrapper.appendChild(createTaskCardDOM(task)));
    upcomingTasks.forEach(task => upcomingWrapper && upcomingWrapper.appendChild(createTaskCardDOM(task)));
    somedayTasks.forEach(task => somedayWrapper && somedayWrapper.appendChild(createTaskCardDOM(task)));
    completedTasks.forEach(task => completedWrapper && completedWrapper.appendChild(createTaskCardDOM(task)));

    let totalVisible = todayTasks.length + upcomingTasks.length + somedayTasks.length + completedTasks.length;
    if (activeFilter === "completed") totalVisible = completedTasks.length;
    if (activeFilter === "today") totalVisible = todayTasks.length;

    if (totalVisible === 0) {
      emptyState.classList.remove("hidden");
      emptyState.querySelector("h3").textContent = activeFilter === "today" ? "No Tasks Due Today" : activeFilter === "completed" ? "No Completed Tasks" : "No Tasks Registered";
    } else emptyState.classList.add("hidden");

    updateCountdownTickers();
  }

  function createTaskCardDOM(task) {
    const div = document.createElement("div");
    div.className = `task-card card-glass priority-${task.priority}`;
    div.setAttribute("data-id", task.id);
    div.setAttribute("data-deadline", task.deadline || "");
    
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.completed;
    const isUrgent = task.deadline && (new Date(task.deadline) - new Date() < 24*60*60*1000) && (new Date(task.deadline) - new Date() > 0) && !task.completed;

    if (task.completed) div.classList.add("is-completed");
    else {
      if (isOverdue) div.classList.add("is-overdue");
      if (isUrgent) div.classList.add("is-urgent");
    }
    
    div.innerHTML = `
      <div class="task-card-header">
        <div class="task-title-group"><h3 class="task-title">${escapeHTML(task.name)}</h3></div>
        <div class="task-badges">
          ${isOverdue ? '<span class="overdue-banner">Overdue</span>' : ''}
          ${task.completed ? '<span class="completed-banner">Done</span>' : ''}
          ${!task.deadline ? '<span class="badge no-deadline-badge">No Deadline</span>' : ''}
          <span class="badge priority-${task.priority}-badge">${task.priority}</span>
        </div>
      </div>
      <p class="task-desc">${escapeHTML(task.description || "No description provided.")}</p>
      <div class="task-card-footer">
        <div class="countdown-box"><span class="countdown-timer">${task.deadline ? 'Ticking...' : 'No Deadline'}</span></div>
        <div class="task-actions">
          ${!task.completed ? `<button class="btn-card btn-ai-help">AI Plan</button>` : ''}
          <button class="btn-card btn-complete">${task.completed ? "Reopen" : "Complete"}</button>
          <button class="btn-card btn-delete">🗑️</button>
        </div>
      </div>
    `;
    return div;
  }

  function updateSystemClock() {
    const clock = document.getElementById("live-clock");
    if (!clock) return;
    const now = new Date();
    clock.textContent = now.toLocaleTimeString();
  }

  function updateCountdownTickers() {
    const cards = tasksContainer.querySelectorAll(".task-card");
    cards.forEach(card => {
      const timerSpan = card.querySelector(".countdown-timer");
      const deadlineAttr = card.getAttribute("data-deadline");
      if (!timerSpan || !deadlineAttr) return;

      const diffMs = new Date(deadlineAttr) - new Date();
      if (diffMs <= 0) {
        timerSpan.textContent = "OVERDUE";
        timerSpan.className = "countdown-timer timer-overdue";
        return;
      }
      const diffSecs = Math.floor(diffMs / 1000);
      timerSpan.textContent = `${Math.floor(diffSecs / 3600)}h ${Math.floor((diffSecs % 3600) / 60)}m ${diffSecs % 60}s`;
    });
  }

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && !t.completed).length;

    if (totalStatEl) totalStatEl.textContent = total;
    if (completedStatEl) completedStatEl.textContent = completed;
    if (overdueStatEl) overdueStatEl.textContent = overdue;
  }

  function requestAIHelpForTask(task) {
    if (!chatDrawer.classList.contains("is-expanded")) chatDrawer.classList.add("is-expanded");
    const query = `Help me break down the task: "${task.name}".`;
    appendChatMessage("outgoing", query);
    simulateAIResponse(query, task);
  }

  function appendChatMessage(type, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `<div class="msg-bubble"><p>${formatMarkdown(text)}</p></div>`;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
  }

  function simulateAIResponse(userQuery, associatedTask = null) {
    showTypingIndicator();
    fetchGeminiAIHelp(userQuery, associatedTask).then(aiText => {
      hideTypingIndicator();
      appendChatMessage("incoming", aiText);
    }).catch(() => {
      hideTypingIndicator();
      appendChatMessage("incoming", "Execution failure. Verify your credentials.");
    });
  }

  function showTypingIndicator() {
    if (typingIndicatorEl) return;
    typingIndicatorEl = document.createElement("div");
    typingIndicatorEl.className = "message incoming typing-node";
    typingIndicatorEl.innerHTML = `<div class="msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    chatMessages.appendChild(typingIndicatorEl);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    if (typingIndicatorEl) { typingIndicatorEl.remove(); typingIndicatorEl = null; }
  }

  function scrollToBottom() { chatMessages.scrollTop = chatMessages.scrollHeight; }
  function escapeHTML(str) { return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }
  function formatMarkdown(text) { return escapeHTML(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }

  function updateProductivityReport() {
    const added = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pct = added > 0 ? Math.round((completed / added) * 100) : 0;
    if (document.querySelector(".progress-bar")) document.querySelector(".progress-bar").style.width = `${pct}%`;
    if (document.querySelector(".percentage")) document.querySelector(".percentage").textContent = `${pct}%`;
  }

  function updateStreakChart() {}
  function updatePriorityBreakdown() {}
  let typingIndicatorEl = null;
});

// ==========================================
// OUTBOUND COMMUNICATIONS & BACKEND SYNC
// ==========================================

async function signInWithGoogle() {
  try { await signInWithPopup(auth, googleProvider); } catch (error) { console.error("Identity reconciliation error:", error); }
}

async function signOutUser() {
  try { await signOut(auth); } catch (error) { console.error("Session termination failure:", error); }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (document.getElementById("login-screen")) document.getElementById("login-screen").style.display = "none";
    await loadTasksFromFirebase(user.uid);
  } else {
    if (document.getElementById("login-screen")) document.getElementById("login-screen").style.display = "flex";
  }
});

async function loadTasksFromFirebase(userId) {
  try {
    const tasksColRef = collection(db, "users", userId, "tasks");
    const snapshot = await getDocs(tasksColRef);
    if (!snapshot.empty) {
      tasks = snapshot.docs.map(doc => doc.data());
      localStorage.setItem("crunchtime_tasks", JSON.stringify(tasks));
    }
    if (typeof window.renderTasks === "function") window.renderTasks();
  } catch (err) {
    console.error("Firebase fetch exception:", err);
  }
}

async function fetchGeminiAIHelp(prompt, task = null) {
  const tasksSummary = tasks.map(t => ({ id: t.id, name: t.name, priority: t.priority, completed: t.completed }));
  const systemPrompt = `You are CrunchTime AI. User tasks: ${JSON.stringify(tasksSummary)}. Respond in structural schema: {"action": "CHAT", "data": {}, "message": "Text"}`;

  try {
    let finalPrompt = task ? `Task context: ${task.name}. Prompt: ${prompt}` : prompt;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    });

    if (!response.ok) throw new Error(`Status exception: ${response.status}`);
    const result = await response.json();
    let cleanText = result.candidates[0].content.parts[0].text.trim();
    
    if (cleanText.startsWith("```")) cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```\s*$/s, "").trim();
    const parsed = JSON.parse(cleanText.substring(cleanText.indexOf("{"), cleanText.lastIndexOf("}") + 1));
    return await executeAgentAction(parsed, prompt);
  } catch (err) {
    return "Communication breakdown. Check console diagnostics.";
  }
}

async function executeAgentAction(parsed, originalPrompt) {
  const action = parsed.action;
  const data = parsed.data;
  const message = parsed.message || "Processed.";

  if (action === "ADD_TASK") {
    const newTask = { id: "task-" + Date.now(), name: data.name || "AI Task", priority: data.priority || "medium", completed: false, createdAt: new Date().toISOString() };
    tasks.unshift(newTask);
    saveToLocalStorage();
    return `✅ **Task Created!** \n\n${message}`;
  }
  return parsed.message || "Analysis complete.";
}
