import { firebaseConfig, GEMINI_API_KEY } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDocs, writeBatch, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Initialize Firebase services globally using the original config
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * CRUNCHTIME - CORE APPLICATION LOGIC
 * Includes: Task Management, Tickers, Statistics, Form Validation, AI Chat Simulator,
 * and integration hooks for Firebase & Gemini.
 */

// ==========================================
// 1. STATE INITIALIZATION & LOCAL STORAGE
// ==========================================

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

// Sample Tasks to display if no tasks exist
const DEFAULT_TASKS = [
  {
    id: "sample-task-1",
    name: "Design CrunchTime Presentation Slide Deck",
    description: "Refine typography, color contrast, and structure slides detailing the value proposition, user journey, and technical design.",
    deadline: getFutureTimeISO(2.5), // 2 hours 30 mins from now
    priority: "high",
    completed: false,
    createdAt: getFutureTimeISO(-1.5) // created 1.5 hours ago
  },
  {
    id: "sample-task-2",
    name: "Audit Firebase Security Rules & DB Snapshot",
    description: "Run weekly backups of development database and verify that security rules restrict unauthorized read/writes.",
    deadline: getFutureTimeISO(27), // 1 day and 3 hours from now
    priority: "medium",
    completed: false,
    createdAt: getFutureTimeISO(-25) // created 25 hours ago
  }
];

// Helper to generate future time
function getFutureTimeISO(hoursInFuture) {
  const now = new Date();
  now.setMilliseconds(now.getMilliseconds() + (hoursInFuture * 60 * 60 * 1000));
  return now.toISOString();
}

// Load tasks from LocalStorage
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
    // Inject defaults
    tasks = [...DEFAULT_TASKS];
    saveToLocalStorage();
  }
}

// AFTER
function saveToLocalStorage() {
  localStorage.setItem("crunchtime_tasks", JSON.stringify(tasks));
  syncTasksToFirebase(); // now safe — errors are caught inside
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
// 2. DOM ELEMENTS & LISTENERS SETUP
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  initTasks();

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

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
    const overlay = document.getElementById(
      "custom-confirm-overlay"
    );
    const titleEl = document.getElementById(
      "confirm-title"
    );
    const messageEl = document.getElementById(
      "confirm-message"
    );
    const okBtn = document.getElementById(
      "confirm-ok-btn"
    );
    const cancelBtn = document.getElementById(
      "confirm-cancel-btn"
    );

    if (!overlay) return;

    titleEl.textContent = title;
    messageEl.textContent = message;
    overlay.classList.remove("hidden");

    const handleOk = () => {
      overlay.classList.add("hidden");
      okBtn.removeEventListener("click", handleOk);
      cancelBtn.removeEventListener(
        "click", handleCancel
      );
      onConfirm();
    };

    const handleCancel = () => {
      overlay.classList.add("hidden");
      okBtn.removeEventListener("click", handleOk);
      cancelBtn.removeEventListener(
        "click", handleCancel
      );
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

  // DOM Nodes
  const addTaskForm = document.getElementById("add-task-form");
  const taskNameInput = document.getElementById("task-name");
  const taskDescInput = document.getElementById("task-desc");
  const taskDeadlineInput = document.getElementById("task-deadline");
  const taskPrioritySelect = document.getElementById("task-priority");
  
  const tasksContainer = document.getElementById("tasks-container");
  const emptyState = document.getElementById("empty-state");
  
  const sidebarItems = document.querySelectorAll(".sidebar-nav-item");
  
  // Stats DOM Elements
  const totalStatEl = document.getElementById("stat-count-total");
  const completedStatEl = document.getElementById("stat-count-completed");
  const urgentStatEl = document.getElementById("stat-count-urgent");
  const overdueStatEl = document.getElementById("stat-count-overdue");
  
  // AI Chat DOM Elements
  const chatDrawer = document.getElementById("ai-chat-drawer");
  const chatToggleBtn = document.getElementById("chat-toggle-btn");
  const chatInputForm = document.getElementById("chat-input-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const chatUnreadBadge = document.getElementById("chat-unread-badge");

  // Collapsible Sidebar & No-deadline Elements
  const sidebarToggle = document.getElementById("sidebar-logo-toggle");
  const pageSidebar = document.getElementById("page-sidebar");
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  const taskNoDeadline = document.getElementById("task-no-deadline");
  const deadlineInputRow = document.getElementById("deadline-input-row");

  let activeFilter = "all"; // all | active | completed | today
  let unreadCount = 0;

  // Set default minimum date-time for deadline picker to today/now
  const minDateTime = new Date();
  minDateTime.setMinutes(minDateTime.getMinutes() - minDateTime.getTimezoneOffset());
  taskDeadlineInput.min = minDateTime.toISOString().slice(0, 16);

  // Auth button bindings
  const googleSigninBtn = document.getElementById("google-signin-btn");
  if (googleSigninBtn) {
    googleSigninBtn.addEventListener("click", signInWithGoogle);
  }

  const signoutBtn = document.getElementById("signout-btn");
  if (signoutBtn) {
    signoutBtn.addEventListener("click", signOutUser);
  }

  // Custom Section UI Helpers
  function updateSectionDropdown() {
    const select = document.getElementById("task-section");
    if (!select) return;
    
    // Clear custom options (keep first option: "Automatic (By Deadline)")
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // Append custom sections
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

  // Initialize display
  updateSectionDropdown();
  renderTasks();
  updateStats();
  updateProductivityReport();
  
  // Start Ticker Loop (Every 1 second)
  setInterval(() => {
    updateSystemClock();
    updateCountdownTickers();
    // Periodically update statistics (needed if a task deadline passes silently)
    updateStats();
  }, 1000);

  // System time initial call
  updateSystemClock();

  // Stat Cards List for Clickable Filters
  const statCardsList = [totalStatEl, completedStatEl, urgentStatEl, overdueStatEl].map(el => el ? el.closest(".stat-card") : null);

  // Helper to set filter state programmatically
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

  // Collapsible Sidebar Desktop Toggle
  if (sidebarToggle && pageSidebar) {
    sidebarToggle.addEventListener("click", () => {
      pageSidebar.classList.toggle("sidebar-collapsed");
    });
  }

  // Mobile Sidebar Toggles
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

  // No Deadline Checkbox change listener
  if (taskNoDeadline && deadlineInputRow) {
    taskNoDeadline.addEventListener("change", () => {
      if (taskNoDeadline.checked) {
        deadlineInputRow.classList.add("hidden");
        taskDeadlineInput.value = "";
      } else {
        deadlineInputRow.classList.remove("hidden");
        // Re-establish min date-time
        const reMinDateTime = new Date();
        reMinDateTime.setMinutes(reMinDateTime.getMinutes() - reMinDateTime.getTimezoneOffset());
        taskDeadlineInput.min = reMinDateTime.toISOString().slice(0, 16);
      }
    });
  }

  // Section group headers expand/collapse toggles via event delegation
  if (tasksContainer) {
    tasksContainer.addEventListener("click", (e) => {
      const header = e.target.closest(".section-group-header");
      if (header) {
        // Ignore click if it's on the add-section or delete-section button
        if (e.target.closest(".btn-add-section-inline") || e.target.closest(".btn-delete-section-inline")) return;
        const section = header.closest(".task-section");
        if (section) {
          section.classList.toggle("collapsed");
          
          // Only scroll if we are expanding not collapsing
          if (!section.classList.contains("collapsed")) {
            setTimeout(() => {
              section.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            }, 150);
          }
        }
      }
    });
  }

  document.addEventListener("click", (e) => {
    // Only the main + button (next to "Live Operations" title)
    // should create a new custom section
    const mainAddBtn = e.target.closest(".btn-add-section");
    if (mainAddBtn) {
      e.preventDefault();
      e.stopPropagation();
      showCustomPrompt(
        "Create New Section",
        "Organize your tasks by giving this section a name.",
        "e.g. Work, College, Side Projects...",
        (sectionName) => {
          createCustomSection(sectionName);
        }
      );
      return;
    }

    // The inline + button inside each section header
    // should scroll to the form and pre-select that section
    const inlineAddBtn = e.target.closest(".btn-add-section-inline");
    if (inlineAddBtn) {
      e.preventDefault();
      e.stopPropagation();

      // Find which section this + button belongs to
      const sectionEl = inlineAddBtn.closest(".task-section");
      let sectionId = "auto";
      let sectionLabel = "Automatic (By Deadline)";

      if (sectionEl) {
        const sectionIdAttr = sectionEl.id;

        if (sectionIdAttr === "section-today") {
          // For Today — set deadline to end of today
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 0, 0);
          const localISO = new Date(
            endOfToday.getTime() - 
            endOfToday.getTimezoneOffset() * 60000
          ).toISOString().slice(0, 16);

          const deadlineInput = document.getElementById("task-deadline");
          const noDeadlineCheck = document.getElementById("task-no-deadline");
          const deadlineRow = document.getElementById("deadline-input-row");

          if (noDeadlineCheck) noDeadlineCheck.checked = false;
          if (deadlineRow) deadlineRow.classList.remove("hidden");
          if (deadlineInput) deadlineInput.value = localISO;

          const sectionSelect = document.getElementById("task-section");
          if (sectionSelect) sectionSelect.value = "auto";

        } else if (sectionIdAttr === "section-upcoming") {
          // For Upcoming — set deadline to tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(12, 0, 0, 0);
          const localISO = new Date(
            tomorrow.getTime() - 
            tomorrow.getTimezoneOffset() * 60000
          ).toISOString().slice(0, 16);

          const deadlineInput = document.getElementById("task-deadline");
          const noDeadlineCheck = document.getElementById("task-no-deadline");
          const deadlineRow = document.getElementById("deadline-input-row");

          if (noDeadlineCheck) noDeadlineCheck.checked = false;
          if (deadlineRow) deadlineRow.classList.remove("hidden");
          if (deadlineInput) deadlineInput.value = localISO;

          const sectionSelect = document.getElementById("task-section");
          if (sectionSelect) sectionSelect.value = "auto";

        } else if (sectionIdAttr === "section-someday") {
          // For No Deadline — check the no deadline checkbox
          const noDeadlineCheck = document.getElementById("task-no-deadline");
          const deadlineRow = document.getElementById("deadline-input-row");
          const deadlineInput = document.getElementById("task-deadline");

          if (noDeadlineCheck) noDeadlineCheck.checked = true;
          if (deadlineRow) deadlineRow.classList.add("hidden");
          if (deadlineInput) deadlineInput.value = "";

          const sectionSelect = document.getElementById("task-section");
          if (sectionSelect) sectionSelect.value = "auto";

        } else if (sectionIdAttr === "section-completed") {
          // Completed section — just scroll to form, no preset
          const sectionSelect = document.getElementById("task-section");
          if (sectionSelect) sectionSelect.value = "auto";

        } else if (sectionIdAttr && sectionIdAttr.startsWith("section-custom-")) {
          // Custom section — pre-select it in the dropdown
          const customId = sectionIdAttr.replace("section-custom-", "");
          const sectionSelect = document.getElementById("task-section");
          if (sectionSelect) {
            sectionSelect.value = customId;
          }

          const noDeadlineCheck = document.getElementById("task-no-deadline");
          const deadlineRow = document.getElementById("deadline-input-row");
          if (noDeadlineCheck) noDeadlineCheck.checked = true;
          if (deadlineRow) deadlineRow.classList.add("hidden");
        }
      }

      // Scroll to the Add Task form and focus task name
      const formSection = document.querySelector(".form-section");
      if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setTimeout(() => {
        const taskNameInput = document.getElementById("task-name");
        if (taskNameInput) taskNameInput.focus();
      }, 400);
    }
  });

  // Handle Custom Section Deletion clicks
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(
      ".btn-delete-section-inline"
    );
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    
    const sectionId = btn.getAttribute("data-id");
    console.log("Delete clicked for:", sectionId);
    console.log("Custom sections:", customSections);
    
    if (!sectionId) {
      console.error("No section ID found on button");
      return;
    }
    
    const section = customSections.find(
      s => s.id === sectionId
    );
    
    if (!section) {
      console.error("Section not found:", sectionId);
      return;
    }

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
        customSections = customSections.filter(
          s => s.id !== sectionId
        );
        saveToLocalStorage();
        saveCustomSections();
        updateSectionDropdown();
        renderTasks();
        updateStats();
      }
    );
  });

  // Sidebar Navigation click handler
  sidebarItems.forEach(item => {
    item.addEventListener("click", (e) => {
      // Clear stat card active classes and container focuses when manual tabs are clicked
      statCardsList.forEach(c => c && c.classList.remove("active"));
      tasksContainer.classList.remove("focus-completed", "focus-urgent", "focus-overdue");

      sidebarItems.forEach(t => t.classList.remove("active"));
      item.classList.add("active");
      activeFilter = item.getAttribute("data-filter");
      
      // Automatically expand their sections if selected
      if (activeFilter === "today") {
        const sectionToday = document.getElementById("section-today");
        if (sectionToday) sectionToday.classList.remove("collapsed");
      } else if (activeFilter === "completed") {
        const sectionCompleted = document.getElementById("section-completed");
        if (sectionCompleted) sectionCompleted.classList.remove("collapsed");
      }

      renderTasks();

      if (activeFilter === "all") {
        scrollToSection("section-today");
      } else if (activeFilter === "active") {
        scrollToSection("section-today");
      } else if (activeFilter === "completed") {
        scrollToSection("section-completed");
      } else if (activeFilter === "today") {
        scrollToSection("section-today");
      }

      // Close mobile drawer if open
      if (window.innerWidth <= 768 && pageSidebar && sidebarBackdrop) {
        pageSidebar.classList.remove("open");
        sidebarBackdrop.classList.remove("active");
      }
    });
  });

  // Clickable Stat Card Filters handlers
  statCardsList.forEach(card => {
    if (!card) return;
    card.addEventListener("click", () => {
      const isAlreadyActive = card.classList.contains("active");

      // Reset all stat cards active states
      statCardsList.forEach(c => c && c.classList.remove("active"));
      
      // Reset all highlights on the tasks container
      tasksContainer.classList.remove("focus-completed", "focus-urgent", "focus-overdue");

      // Clicking the same stat card again deselects it and removes all highlights
      if (isAlreadyActive) {
        return;
      }

      // 1. Clicking "Total Tasks" shows all tasks, removes any highlight
      if (card.id === "stat-total") {
        card.classList.add("active");
        setFilter("all");
      } else {
        // For other cards, first set filter to "all" to ensure all cards are rendered
        setFilter("all");
        card.classList.add("active");

        // 2-4. Highlight matching cards with CSS classes
        if (card.id === "stat-completed") {
          tasksContainer.classList.add("focus-completed");
          const secCompleted = document.getElementById("section-completed");
          if (secCompleted) secCompleted.classList.remove("collapsed");
        } else if (card.id === "stat-urgent") {
          tasksContainer.classList.add("focus-urgent");
          const secToday = document.getElementById("section-today");
          const secUpcoming = document.getElementById("section-upcoming");
          if (secToday) secToday.classList.remove("collapsed");
          if (secUpcoming) secUpcoming.classList.remove("collapsed");
        } else if (card.id === "stat-overdue") {
          tasksContainer.classList.add("focus-overdue");
          const secToday = document.getElementById("section-today");
          if (secToday) secToday.classList.remove("collapsed");
        }
      }

      if (card.id === "stat-total") {
        scrollToSection("section-today");
      } else if (card.id === "stat-completed") {
        scrollToSection("section-completed");
      } else if (card.id === "stat-urgent") {
        scrollToSection("section-today");
      } else if (card.id === "stat-overdue") {
        scrollToSection("section-today");
      }
    });
  });

  // Task Form submit
  addTaskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    // Validate
    let isValid = true;
    const name = taskNameInput.value.trim();
    const desc = taskDescInput.value.trim();
    const deadlineVal = taskDeadlineInput.value;
    const priority = taskPrioritySelect.value;
    const noDeadline = taskNoDeadline && taskNoDeadline.checked;
    const sectionVal = document.getElementById("task-section") ? document.getElementById("task-section").value : "auto";
    
    // Clear errors
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

    // Create task
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
    
    // Rerender and Reset
    renderTasks();
    updateStats();
    updateProductivityReport();
    addTaskForm.reset();

    // Ensure deadline row is visible after reset
    if (deadlineInputRow) {
      deadlineInputRow.classList.remove("hidden");
    }
    
    // Set minimal date again
    const reMinDateTime = new Date();
    reMinDateTime.setMinutes(reMinDateTime.getMinutes() - reMinDateTime.getTimezoneOffset());
    taskDeadlineInput.min = reMinDateTime.toISOString().slice(0, 16);
  });

  // Task Actions Event Delegation
  tasksContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    
    const card = btn.closest(".task-card");
    const taskId = card.getAttribute("data-id");
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) return;
    const task = tasks[taskIndex];

    if (btn.classList.contains("btn-complete")) {
      // Toggle complete status
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
      // Delete task
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
      // Get AI assistance
      requestAIHelpForTask(task);
    }
  });

  // AI Chat Panel - Toggle Expand
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

  // AI Chat Panel - Send custom messages
  chatInputForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query) return;

    appendChatMessage("outgoing", query);
    chatInput.value = "";
    scrollToBottom();

    simulateAIResponse(query);
  });

  // AI Chat Panel - Click suggestion pills
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
  // 3. CORE LOGIC & RENDER FUNCTIONS
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
        if (dashboardStrip) {
          productivityView.insertBefore(dashboardStrip, productivityView.firstChild);
        }
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
    if (completedTasks.length === 0) {
      return { current: 0, hasCompletedToday: false };
    }

    const completedDates = new Set();
    completedTasks.forEach(t => {
      const date = new Date(t.completedAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      completedDates.add(`${year}-${month}-${day}`);
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
        const dateStr = getLocalDateStr(checkDate);
        if (completedDates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else if (completedDates.has(yesterdayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const dateStr = getLocalDateStr(checkDate);
        if (completedDates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      streak = 0;
    }

    return { current: streak, hasCompletedToday: hasCompletedToday };
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

    const countEl = document.getElementById("streak-count");
    const bestCountEl = document.getElementById("streak-best-count");
    if (countEl) countEl.textContent = current;
    if (bestCountEl) bestCountEl.textContent = newBest;

    const flame = document.getElementById("streak-flame");
    if (flame) {
      flame.className = "flame";
      if (current === 0) {
        flame.classList.add("static-gray");
      } else if (!hasCompletedToday) {
        flame.classList.add("dimmed");
      }
    }

    const motivationMsgEl = document.getElementById("streak-motivation-msg");
    if (motivationMsgEl) {
      if (current === 0) {
        motivationMsgEl.textContent = "Complete a task today to ignite your streak! 🎯";
      } else if (current <= 2) {
        motivationMsgEl.textContent = "You are just getting started! Keep it up! ⚡";
      } else if (current <= 6) {
        motivationMsgEl.textContent = "You are on fire! Don't break the chain! 🔥";
      } else if (current <= 13) {
        motivationMsgEl.textContent = "One week strong! You are unstoppable! 💪";
      } else {
        motivationMsgEl.textContent = "Legendary streak! You are a productivity beast! 👑";
      }
    }

    // Dynamic Quote Injection
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
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      
      const quoteIndex = dayOfYear % DAILY_QUOTES.length;
      const quote = DAILY_QUOTES[quoteIndex];
      quoteEl.textContent = `"${quote}"`;
    }
  }

  function renderTasks() {
    if (activeFilter === "productivity") {
      switchView("productivity");
    } else {
      switchView("home");
      updateStreakBanner();
    }

    // Always update productivity streak and breakdown in the background
    updateStreakChart();
    updatePriorityBreakdown();

    if (activeFilter === "productivity") {
      // Refresh reports/stats and return since tasks home grid is hidden
      updateProductivityReport();
      updateStats();
      return;
    }

    // Categorize tasks
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    const todayTasks = [];
    const upcomingTasks = [];
    const somedayTasks = [];
    const completedTasks = [];

    // Custom section task containers
    const customSectionTasks = {};
    customSections.forEach(sec => {
      customSectionTasks[sec.id] = [];
    });

    tasks.forEach(task => {
      if (task.completed) {
        completedTasks.push(task);
        return;
      }

      // Check if task is assigned to a valid custom section
      if (task.section && task.section !== "auto" && customSectionTasks[task.section]) {
        customSectionTasks[task.section].push(task);
      } else {
        // Automatic grouping
        if (!task.deadline) {
          somedayTasks.push(task);
        } else {
          const taskDate = new Date(task.deadline);
          if (taskDate <= endOfToday) {
            todayTasks.push(task);
          } else {
            upcomingTasks.push(task);
          }
        }
      }
    });

    // Sort arrays by priority weight
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const sortByPriority = (a, b) => priorityWeight[b.priority] - priorityWeight[a.priority];

    todayTasks.sort(sortByPriority);
    upcomingTasks.sort(sortByPriority);
    somedayTasks.sort(sortByPriority);
    completedTasks.sort((a, b) => {
      if (a.completedAt && b.completedAt) {
        return new Date(b.completedAt) - new Date(a.completedAt);
      }
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });

    // Update section header badges
    const todayBadge = document.querySelector("#section-today .count-badge");
    const upcomingBadge = document.querySelector("#section-upcoming .count-badge");
    const somedayBadge = document.querySelector("#section-someday .count-badge");
    const completedBadge = document.querySelector("#section-completed .count-badge");

    if (todayBadge) todayBadge.textContent = todayTasks.length;
    if (upcomingBadge) upcomingBadge.textContent = upcomingTasks.length;
    if (somedayBadge) somedayBadge.textContent = somedayTasks.length;
    if (completedBadge) completedBadge.textContent = completedTasks.length;

    // Toggle Section visibility based on the active sidebar filter
    const sectionToday = document.getElementById("section-today");
    const sectionUpcoming = document.getElementById("section-upcoming");
    const sectionSomeday = document.getElementById("section-someday");
    const sectionCompleted = document.getElementById("section-completed");

    // Remove focused-section class from all sections first
    tasksContainer.querySelectorAll(".task-section").forEach(sec => {
      sec.classList.remove("focused-section");
    });

    if (sectionToday) {
      if (activeFilter === "all" || activeFilter === "active" || activeFilter === "today") {
        sectionToday.classList.remove("hidden");
        if (activeFilter === "today") {
          sectionToday.classList.add("focused-section");
        }
      } else {
        sectionToday.classList.add("hidden");
      }
    }

    if (sectionUpcoming) {
      if (activeFilter === "all" || activeFilter === "active") {
        sectionUpcoming.classList.remove("hidden");
      } else {
        sectionUpcoming.classList.add("hidden");
      }
    }

    if (sectionSomeday) {
      if (activeFilter === "all" || activeFilter === "active") {
        sectionSomeday.classList.remove("hidden");
      } else {
        sectionSomeday.classList.add("hidden");
      }
    }

    if (sectionCompleted) {
      if (activeFilter === "all" || activeFilter === "completed") {
        sectionCompleted.classList.remove("hidden");
        if (activeFilter === "completed") {
          sectionCompleted.classList.add("focused-section");
        }
      } else {
        sectionCompleted.classList.add("hidden");
      }
    }

    // Remove any dynamically added custom section elements first
    const existingCustomSections = tasksContainer.querySelectorAll(".task-section-custom");
    existingCustomSections.forEach(el => el.remove());

    // Render custom sections dynamically before `#section-completed`
    const showCustomSections = (activeFilter === "all" || activeFilter === "active");

    customSections.forEach(section => {
      const existingSec = document.getElementById(`section-custom-${section.id}`);
      const isCollapsed = existingSec ? existingSec.classList.contains("collapsed") : false;

      const secEl = document.createElement("div");
      secEl.className = "task-section task-section-custom";
      secEl.id = `section-custom-${section.id}`;
      if (!showCustomSections) {
        secEl.classList.add("hidden");
      }
      if (isCollapsed) {
        secEl.classList.add("collapsed");
      }

      const tasksForSec = customSectionTasks[section.id] || [];
      secEl.innerHTML = `
        <header class="section-group-header">
          <span class="toggle-arrow">▼</span>
          <span class="section-group-title">${escapeHTML(section.name)}</span>
          <button type="button" class="btn-add-section-inline" title="Create Custom Section">+</button>
          <button type="button" 
            class="btn-delete-section-inline" 
            data-id="${section.id}"
            title="Delete Section">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 7L18.1327 19.1422C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1422L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="count-badge custom-badge">${tasksForSec.length}</span>
        </header>
        <div class="section-cards-wrapper"></div>
      `;

      const sectionCompletedEl = document.getElementById("section-completed");
      if (sectionCompletedEl) {
        tasksContainer.insertBefore(secEl, sectionCompletedEl);
      } else {
        tasksContainer.appendChild(secEl);
      }

      // Sort and render custom section task cards
      tasksForSec.sort(sortByPriority);
      const wrapper = secEl.querySelector(".section-cards-wrapper");
      tasksForSec.forEach(task => {
        wrapper.appendChild(createTaskCardDOM(task));
      });
    });

    // Empty default card wrappers
    const todayCardsWrapper = document.querySelector("#section-today .section-cards-wrapper");
    const upcomingCardsWrapper = document.querySelector("#section-upcoming .section-cards-wrapper");
    const somedayCardsWrapper = document.querySelector("#section-someday .section-cards-wrapper");
    const completedCardsWrapper = document.querySelector("#section-completed .section-cards-wrapper");

    if (todayCardsWrapper) todayCardsWrapper.innerHTML = "";
    if (upcomingCardsWrapper) upcomingCardsWrapper.innerHTML = "";
    if (somedayCardsWrapper) somedayCardsWrapper.innerHTML = "";
    if (completedCardsWrapper) completedCardsWrapper.innerHTML = "";

    // Append cards to respective wrappers
    todayTasks.forEach(task => {
      if (todayCardsWrapper) todayCardsWrapper.appendChild(createTaskCardDOM(task));
    });
    upcomingTasks.forEach(task => {
      if (upcomingCardsWrapper) upcomingCardsWrapper.appendChild(createTaskCardDOM(task));
    });
    somedayTasks.forEach(task => {
      if (somedayCardsWrapper) somedayCardsWrapper.appendChild(createTaskCardDOM(task));
    });
    completedTasks.forEach(task => {
      if (completedCardsWrapper) completedCardsWrapper.appendChild(createTaskCardDOM(task));
    });

    // Check empty state across visible sections
    let totalVisibleTasks = 0;
    if (activeFilter === "all") {
      totalVisibleTasks = todayTasks.length + upcomingTasks.length + somedayTasks.length + completedTasks.length;
      customSections.forEach(sec => {
        totalVisibleTasks += (customSectionTasks[sec.id] || []).length;
      });
    } else if (activeFilter === "active") {
      totalVisibleTasks = todayTasks.length + upcomingTasks.length + somedayTasks.length;
      customSections.forEach(sec => {
        totalVisibleTasks += (customSectionTasks[sec.id] || []).length;
      });
    } else if (activeFilter === "completed") {
      totalVisibleTasks = completedTasks.length;
    } else if (activeFilter === "today") {
      totalVisibleTasks = todayTasks.length;
    }

    if (totalVisibleTasks === 0) {
      emptyState.classList.remove("hidden");
      const emptyTitle = emptyState.querySelector("h3");
      const emptyDesc = emptyState.querySelector("p");
      if (activeFilter === "today") {
        emptyTitle.textContent = "No Tasks Due Today";
        emptyDesc.textContent = "Take a breather. You have no objectives ending today.";
      } else if (activeFilter === "completed") {
        emptyTitle.textContent = "No Completed Tasks";
        emptyDesc.textContent = "No tasks completed yet. Start checking off your objectives!";
      } else {
        emptyTitle.textContent = "No Tasks Registered";
        emptyDesc.textContent = "Your schedule is clean. Initialize a task to start ticking down your objectives.";
      }
    } else {
      emptyState.classList.add("hidden");
    }

    updateCountdownTickers();
  }

  function createTaskCardDOM(task) {
    const div = document.createElement("div");
    div.className = `task-card card-glass priority-${task.priority}`;
    div.setAttribute("data-id", task.id);
    div.setAttribute("data-deadline", task.deadline || "");
    
    const hasDeadline = !!task.deadline;
    const isOverdue = hasDeadline && new Date(task.deadline) < new Date() && !task.completed;
    const diffMs = hasDeadline ? (new Date(task.deadline) - new Date()) : 0;
    const isUrgent = hasDeadline && diffMs > 0 && diffMs < 24 * 60 * 60 * 1000 && !task.completed;

    if (task.completed) {
      div.classList.add("is-completed");
    } else {
      if (isOverdue) {
        div.classList.add("is-overdue");
      }
      if (isUrgent) {
        div.classList.add("is-urgent");
      }
    }

    const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    
    div.innerHTML = `
      <div class="task-card-header">
        <div class="task-title-group">
          <h3 class="task-title">${escapeHTML(task.name)}</h3>
        </div>
        <div class="task-badges">
          ${isOverdue ? '<span class="overdue-banner">Overdue</span>' : ''}
          ${task.completed ? '<span class="completed-banner">Done</span>' : ''}
          ${!hasDeadline ? '<span class="badge no-deadline-badge">No Deadline</span>' : ''}
          <span class="badge priority-${task.priority}-badge">${priorityLabel}</span>
        </div>
      </div>
      <p class="task-desc">${escapeHTML(task.description || "No description provided.")}</p>
      <div class="task-card-footer">
        <div class="countdown-box">
          <span class="countdown-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12L14 14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="countdown-timer">${hasDeadline ? 'Ticking...' : 'No Deadline'}</span>
        </div>
        <div class="task-actions">
          ${!task.completed ? `
            <button class="btn-card btn-ai-help" title="Analyze objective with AI assistant">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
              </svg>
              AI Plan
            </button>
          ` : ''}
          <button class="btn-card btn-complete" title="${task.completed ? 'Reactivate task' : 'Complete task'}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${task.completed ? "Reopen" : "Complete"}
          </button>
          <button class="btn-card btn-delete" title="Remove task from Operations" style="color: var(--text-muted); border-color: transparent; background: transparent;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 7L18.1327 19.1422C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1422L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    return div;
  }

  function updateSystemClock() {
    const clock = document.getElementById("live-clock");
    if (!clock) return;
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    clock.textContent = `${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
  }

  function updateCountdownTickers() {
    const cards = tasksContainer.querySelectorAll(".task-card");
    const now = new Date();
    
    cards.forEach(card => {
      const taskId = card.getAttribute("data-id");
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      const task = tasks[taskIndex];
      const timerSpan = card.querySelector(".countdown-timer");
      if (!timerSpan) return;

      if (task.completed) {
        timerSpan.textContent = "Task Completed";
        timerSpan.className = "countdown-timer timer-normal";
        return;
      }

      if (!task.deadline) {
        timerSpan.textContent = "No Deadline";
        timerSpan.className = "countdown-timer timer-normal";
        return;
      }

      const deadline = new Date(task.deadline);
      const diffMs = deadline - now;

      if (diffMs <= 0) {
        timerSpan.textContent = "OVERDUE";
        timerSpan.className = "countdown-timer timer-overdue";
        
        if (!card.classList.contains("is-overdue")) {
          card.classList.add("is-overdue");
          renderTasks();
          updateStats();
        }
        return;
      }

      const diffSecs = Math.floor(diffMs / 1000);
      const secs = diffSecs % 60;
      const mins = Math.floor(diffSecs / 60) % 60;
      const hours = Math.floor(diffSecs / 3600) % 24;
      const days = Math.floor(diffSecs / (3600 * 24));

      let timerText = "";
      if (days > 0) {
        timerText += `${days}d ${hours}h ${mins}m`;
      } else if (hours > 0) {
        timerText += `${hours}h ${mins}m ${secs}s`;
      } else {
        timerText += `${mins}m ${secs}s`;
      }

      timerSpan.textContent = timerText;

      if (diffMs < 60 * 60 * 1000) {
        timerSpan.className = "countdown-timer timer-critical";
      } else if (diffMs < 24 * 60 * 60 * 1000) {
        timerSpan.className = "countdown-timer timer-soon";
      } else {
        timerSpan.className = "countdown-timer timer-normal";
      }
    });
  }

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    
    const urgent = tasks.filter(t => {
      if (t.completed || !t.deadline) return false;
      const diffMs = new Date(t.deadline) - new Date();
      return diffMs > 0 && diffMs < 24 * 60 * 60 * 1000;
    }).length;

    const overdue = tasks.filter(t => {
      if (t.completed || !t.deadline) return false;
      return new Date(t.deadline) < new Date();
    }).length;

    if (totalStatEl) totalStatEl.textContent = total;
    if (completedStatEl) completedStatEl.textContent = completed;
    if (urgentStatEl) urgentStatEl.textContent = urgent;
    if (overdueStatEl) overdueStatEl.textContent = overdue;

    // Update replicated stats in Productivity View
    const prodTotalEl = document.getElementById("prod-stat-count-total");
    const prodCompletedEl = document.getElementById("prod-stat-count-completed");
    const prodUrgentEl = document.getElementById("prod-stat-count-urgent");
    const prodOverdueEl = document.getElementById("prod-stat-count-overdue");

    if (prodTotalEl) prodTotalEl.textContent = total;
    if (prodCompletedEl) prodCompletedEl.textContent = completed;
    if (prodUrgentEl) prodUrgentEl.textContent = urgent;
    if (prodOverdueEl) prodOverdueEl.textContent = overdue;

    // Run streak calculations and update the streak banner
    calculateStreak();
    updateStreakBanner();
  }


  // ==========================================
  // 4. AI CHAT ASSISTANT SIMULATION
  // ==========================================

  function requestAIHelpForTask(task) {
    if (!chatDrawer.classList.contains("is-expanded")) {
      chatDrawer.classList.add("is-expanded");
      chatToggleBtn.setAttribute("aria-expanded", "true");
      unreadCount = 0;
      chatUnreadBadge.classList.add("hidden");
    }

    const query = `Help me break down the task: "${task.name}". It is a ${task.priority} priority objective.`;
    
    appendChatMessage("outgoing", query);
    scrollToBottom();
    
    simulateAIResponse(query, task);
  }

  function appendChatMessage(type, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    
    const isIncoming = type === "incoming";
    const iconHTML = isIncoming 
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
         </svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M20 21V19C20 17.94 19.1 17 18 17H6C4.9 17 4 17.94 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <circle cx="12" cy="9" r="4" stroke="currentColor" stroke-width="2"/>
         </svg>`;

    messageDiv.innerHTML = `
      <div class="msg-avatar">${iconHTML}</div>
      <div class="msg-bubble">
        <p>${formatMarkdown(text)}</p>
      </div>
    `;

    chatMessages.appendChild(messageDiv);
  }

  let typingIndicatorEl = null;

  function showTypingIndicator() {
    if (typingIndicatorEl) return;
    
    typingIndicatorEl = document.createElement("div");
    typingIndicatorEl.className = "message incoming";
    typingIndicatorEl.innerHTML = `
      <div class="msg-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
        </svg>
      </div>
      <div class="msg-bubble">
        <div class="typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    `;
    chatMessages.appendChild(typingIndicatorEl);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    if (typingIndicatorEl) {
      typingIndicatorEl.remove();
      typingIndicatorEl = null;
    }
  }

  function simulateAIResponse(userQuery, associatedTask = null) {
    showTypingIndicator();

    fetchGeminiAIHelp(userQuery, associatedTask).then(aiText => {
      hideTypingIndicator();
      appendChatMessage("incoming", aiText);
      scrollToBottom();
      
      if (!chatDrawer.classList.contains("is-expanded")) {
        unreadCount++;
        chatUnreadBadge.classList.remove("hidden");
        chatUnreadBadge.textContent = unreadCount;
      }
    }).catch(err => {
      hideTypingIndicator();
      appendChatMessage("incoming", 
        "Sorry, I had a small hiccup. Please try again!"
      );
      scrollToBottom();
    });
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  function formatMarkdown(text) {
    let html = escapeHTML(text);
    
    html = html.replace(/\*\*(.*?)\*\//g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    html = html.replace(/^-\s+(.*?)$/gm, '• $1');
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }

  // 6. Productivity Report Renderer
  function updateProductivityReport() {
    const now = new Date();

    // 1. Setup Time Windows in Local Time
    // Today (Midnight to Midnight)
    const startOfToday = new Date(now);
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23,59,59,999);

    // This Week (Sunday Midnight to Saturday 11:59:59 PM)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // This Month (1st 00:00 to Last Day 23:59:59)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Date checker helpers
    const isToday = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= startOfToday && d <= endOfToday;
    };

    const isThisWeek = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= startOfWeek && d <= endOfWeek;
    };

    const isThisMonth = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= startOfMonth && d <= endOfMonth;
    };

    // 2. Count Added and Completed Tasks
    const dailyAdded = tasks.filter(t => isToday(t.createdAt)).length;
    const dailyCompleted = tasks.filter(t => t.completed && isToday(t.completedAt)).length;

    const weeklyAdded = tasks.filter(t => isThisWeek(t.createdAt)).length;
    const weeklyCompleted = tasks.filter(t => t.completed && isThisWeek(t.completedAt)).length;

    const monthlyAdded = tasks.filter(t => isThisMonth(t.createdAt)).length;
    const monthlyCompleted = tasks.filter(t => t.completed && isThisMonth(t.completedAt)).length;

    // 3. Helper to update card DOM
    const updateCard = (cardId, completed, added) => {
      const cards = document.querySelectorAll(`#${cardId}, #prod-${cardId}`);
      cards.forEach(card => {
        const compCountEl = card.querySelector(`span[id$="-completed-count"]`);
        const addCountEl = card.querySelector(`span[id$="-added-count"]`);
        const barEl = card.querySelector(".progress-bar");
        const pctEl = card.querySelector(".percentage");
        const statusEl = card.querySelector(".status-badge");

        if (compCountEl) compCountEl.textContent = completed;
        if (addCountEl) addCountEl.textContent = added;

        // Productivity percentage = completed/added * 100
        let pct = 0;
        if (added > 0) {
          pct = Math.round((completed / added) * 100);
        } else if (completed > 0) {
          pct = 100; // If completed > 0 and added == 0, consider it 100% velocity
        }

        const pctClamped = Math.min(100, pct);
        if (pctEl) pctEl.textContent = `${pct}%`;
        if (barEl) barEl.style.width = `${pctClamped}%`;

        // Status labels: Excellent (>80%), Good (>50%), Needs Work (<=50%)
        if (statusEl) {
          statusEl.className = "status-badge"; // Reset classes
          if (pct > 80) {
            statusEl.textContent = "Excellent";
            statusEl.classList.add("status-excellent");
          } else if (pct > 50) {
            statusEl.textContent = "Good";
            statusEl.classList.add("status-good");
          } else {
            statusEl.textContent = "Needs Work";
            statusEl.classList.add("status-needswork");
          }
        }
      });

      // Update circular indicators in collapsed mode
      let prefix = "";
      if (cardId === "report-daily") prefix = "daily";
      if (cardId === "report-weekly") prefix = "weekly";
      if (cardId === "report-monthly") prefix = "monthly";

      if (prefix) {
        const circleBar = document.getElementById(`${prefix}-circle-bar`);
        const circlePct = document.getElementById(`${prefix}-circle-pct`);
        const circleWrapper = document.getElementById(`${prefix}-circle-wrapper`);

        let pct = 0;
        if (added > 0) {
          pct = Math.round((completed / added) * 100);
        } else if (completed > 0) {
          pct = 100;
        }
        const pctClamped = Math.min(100, pct);

        if (circleBar) {
          circleBar.setAttribute("stroke-dasharray", `${pctClamped}, 100`);
        }
        if (circlePct) {
          circlePct.textContent = `${pct}%`;
        }
        if (circleWrapper) {
          const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
          circleWrapper.setAttribute("title", `${capitalized} Performance: ${completed}/${added} completed (${pct}%)`);
        }
      }
    };

    // 4. Update Daily, Weekly, Monthly Cards
    updateCard("report-daily", dailyCompleted, dailyAdded);
    updateCard("report-weekly", weeklyCompleted, weeklyAdded);
    updateCard("report-monthly", monthlyCompleted, monthlyAdded);
  }

  // 8. 7-Day Streak chart in Productivity View
  function updateStreakChart() {
    const chartContainer = document.getElementById("streak-bar-chart");
    if (!chartContainer) return;

    chartContainer.innerHTML = "";

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();

    // Last 7 days ending today
    const completionsCount = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const count = tasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const compDate = new Date(t.completedAt);
        return compDate >= startOfDay && compDate <= endOfDay;
      }).length;

      completionsCount.push({
        dayLabel: daysOfWeek[d.getDay()],
        count: count
      });
    }

    const maxCompletions = Math.max(...completionsCount.map(c => c.count), 1);

    completionsCount.forEach(data => {
      const col = document.createElement("div");
      col.className = "chart-bar-container";

      const valSpan = document.createElement("span");
      valSpan.className = "chart-bar-val";
      valSpan.textContent = data.count;

      const fillWrapper = document.createElement("div");
      fillWrapper.className = "chart-bar-fill-wrapper";

      const fill = document.createElement("div");
      fill.className = "chart-bar-fill";
      
      if (data.count === 0) {
        fill.classList.add("empty");
        fill.style.height = "100%";
      } else {
        const heightPercent = (data.count / maxCompletions) * 100;
        const displayHeight = Math.max(8, heightPercent);
        fill.style.height = `${displayHeight}%`;
      }

      const label = document.createElement("span");
      label.className = "chart-bar-label";
      label.textContent = data.dayLabel;

      fillWrapper.appendChild(fill);
      col.appendChild(valSpan);
      col.appendChild(fillWrapper);
      col.appendChild(label);
      
      chartContainer.appendChild(col);
    });
  }

  // 9. Priority breakdown card in Productivity View
  function updatePriorityBreakdown() {
    const priorities = ["high", "medium", "low"];
    priorities.forEach(p => {
      const total = tasks.filter(t => t.priority === p).length;
      const completed = tasks.filter(t => t.priority === p && t.completed).length;

      let elementPrefix = p;
      if (p === "medium") elementPrefix = "med";

      const countEl = document.getElementById(`${elementPrefix}-priority-counts`);
      const progressEl = document.getElementById(`${elementPrefix}-priority-progress`);

      if (countEl) {
        countEl.textContent = `${completed} / ${total}`;
      }

      if (progressEl) {
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        progressEl.style.width = `${pct}%`;
      }
    });
  }

  window.renderTasks = renderTasks;
  window.updateStats = updateStats;
  window.updateProductivityReport = updateProductivityReport;
});


// ==========================================
// 5. INTEGRATION PLACEHOLDERS (TODOs)
// ==========================================

// SIGN IN WITH GOOGLE
// SIGN IN WITH GOOGLE
async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Signed in as:", user.displayName);
  } catch (error) {
    console.error("Sign in error:", error);
  }
}

// SIGN OUT
async function signOutUser() {
  try {
    await signOut(auth);
    console.log("Signed out successfully");
  } catch (error) {
    console.error("Sign out error:", error);
  }
}

// WATCH AUTH STATE
onAuthStateChanged(auth, async (user) => {
  const loginScreen = document.getElementById("login-screen");
  const userProfile = document.getElementById("user-profile");
  const userAvatar = document.getElementById("user-avatar");
  const userName = document.getElementById("user-name");

  if (user) {
    if (loginScreen) loginScreen.style.display = "none";
    if (userProfile) userProfile.style.display = "flex";
    if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
    if (userName) userName.textContent = user.displayName;

    await loadTasksFromFirebase(user.uid);

  } else {
    if (loginScreen) loginScreen.style.display = "flex";
    if (userProfile) userProfile.style.display = "none";
  }
});

async function loadTasksFromFirebase(userId) {
  try {
    console.log("Loading tasks from Firestore...");

    const tasksColRef = collection(db, "users", userId, "tasks");
    const snapshot = await getDocs(tasksColRef);

    if (!snapshot.empty) {
      tasks = snapshot.docs.map(doc => doc.data());
      console.log("✓ Loaded", tasks.length, "tasks from Firestore");
      localStorage.setItem(
        "crunchtime_tasks", JSON.stringify(tasks)
      );
    } else {
      const stored = localStorage.getItem("crunchtime_tasks");
      if (stored) {
        try {
          tasks = JSON.parse(stored);
          console.log(
            "✓ Loaded", tasks.length, "tasks from localStorage"
          );
          await syncTasksToFirebase();
        } catch (e) {
          tasks = [];
        }
      } else {
        tasks = [];
      }
    }

    // Wait for DOM to be ready before rendering
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        if (typeof renderTasks === "function") renderTasks();
        if (typeof updateStats === "function") updateStats();
        if (typeof updateProductivityReport === "function") {
          updateProductivityReport();
        }
      });
    } else {
      if (typeof renderTasks === "function") renderTasks();
      if (typeof updateStats === "function") updateStats();
      if (typeof updateProductivityReport === "function") {
        updateProductivityReport();
      }
    }

  } catch (err) {
    console.error("Failed to load from Firestore:", err);
    const stored = localStorage.getItem("crunchtime_tasks");
    if (stored) {
      try { tasks = JSON.parse(stored); } catch (e) { tasks = []; }
    }
    if (document.readyState !== "loading") {
      if (typeof renderTasks === "function") renderTasks();
      if (typeof updateStats === "function") updateStats();
    }
  }
}

async function fetchGeminiAIHelp(prompt, task = null) {
  const tasksSummary = tasks.map(t => ({
    id: t.id,
    name: t.name,
    priority: t.priority,
    deadline: t.deadline,
    completed: t.completed,
    description: t.description || ""
  }));

  const now = new Date();
  const systemPrompt = `
You are CrunchTime AI — an agentic task management assistant.
Current date and time: ${now.toISOString()}
Current day: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

The user has these tasks currently:
${JSON.stringify(tasksSummary, null, 2)}

You must analyze the user message and return a JSON response.
Return ONLY valid JSON. No markdown. No explanation. No code blocks.

Respond with exactly this structure:
{
  "action": "ACTION_NAME",
  "data": {},
  "message": "Friendly confirmation message to show user"
}

Available actions: ADD_TASK, COMPLETE_TASK, DELETE_TASK, SUGGEST_FOCUS, BREAKDOWN_TASK, SHOW_TASKS, PRODUCTIVITY_REPORT, CHAT
`;

  try {
    // 1. Properly define finalPrompt so it doesn't throw a ReferenceError
    let finalPrompt = prompt;
    if (task) {
      finalPrompt = `Context: This query is related to the task: "${task.name}" (Priority: ${task.priority}, Deadline: ${task.deadline || "No Deadline"}).\n\nUser Message: ${prompt}`;
    }

    // 2. Clean URL endpoint — keys are passed securely via standard headers instead
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini Server HTTP Error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    const rawText = result.candidates[0].content.parts[0].text;

    let cleanText = rawText.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```\s*$/s, "").trim();
    }

    // Extract JSON object if there's any surrounding conversational text
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleanText);
    return await executeAgentAction(parsed, prompt);

  } catch (err) {
    console.error("Gemini Direct Bridge Error:", err);
    if (err.message && err.message.includes("429")) {
      return "⏳ **Rate Limit Hit:** Gemini is cooling down. Please wait 10 seconds before testing another prompt.";
    }
    return "Sorry, I had trouble communicating with the AI platform. Please check your setup.";
  }
}
async function executeAgentAction(parsed, originalPrompt) {
  const action = parsed.action;
  const data = parsed.data;
  const message = parsed.message || "Done!";

  if (action === "ADD_TASK") {
    const newTask = {
      id: "task-" + Date.now(),
      name: data.name || "Untitled Task",
      description: data.description || "",
      deadline: data.deadline || null,
      priority: data.priority || "medium",
      completed: false,
      section: data.section || "auto",
      createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveToLocalStorage();
    renderTasks();
    updateStats();
    updateProductivityReport();

    return `✅ **Task Created!**\n\n**${newTask.name}**\nPriority: ${newTask.priority}\nDeadline: ${newTask.deadline ? new Date(newTask.deadline).toLocaleString() : "No Deadline"}\n\n${message}`;
  }

  if (action === "COMPLETE_TASK") {
    const taskIndex = tasks.findIndex(t => t.id === data.id);
    if (taskIndex !== -1) {
      tasks[taskIndex].completed = true;
      tasks[taskIndex].completedAt = new Date().toISOString();
      saveToLocalStorage();
      renderTasks();
      updateStats();
      updateProductivityReport();
      return `✅ **Marked Complete!**\n\n"${tasks[taskIndex].name}" is done. Great work! 🎉\n\n${message}`;
    }
    return `❌ Could not find that task. Try being more specific about the task name.`;
  }

  if (action === "DELETE_TASK") {
    const taskIndex = tasks.findIndex(t => t.id === data.id);
    if (taskIndex !== -1) {
      const taskName = tasks[taskIndex].name;
      tasks.splice(taskIndex, 1);
      saveToLocalStorage();
      renderTasks();
      updateStats();
      return `🗑️ **Deleted!**\n\n"${taskName}" has been removed.\n\n${message}`;
    }
    return `❌ Could not find that task to delete.`;
  }

  if (action === "SUGGEST_FOCUS") {
    const focusTask = tasks.find(t => t.id === data.taskId);
    const taskName = focusTask ? focusTask.name : "your most urgent task";
    return `🎯 **Focus on this first:**\n\n**${taskName}**\n\n${data.reason}\n\n${message}`;
  }

  if (action === "BREAKDOWN_TASK") {
    const targetTask = tasks.find(t => t.id === data.taskId);
    const taskName = targetTask ? targetTask.name : "your task";
    const steps = (data.steps || [])
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n");
    return `📋 **Action Plan: ${taskName}**\n\n${steps}\n\n${message}`;
  }

  if (action === "SHOW_TASKS") {
    const taskList = (data.tasks || [])
      .map(t => `• **${t.name}** (${t.priority}) — ${t.deadline}`)
      .join("\n");
    return `📌 **${data.filter} Tasks:**\n\n${taskList || "No tasks found."}\n\n${message}`;
  }

  if (action === "PRODUCTIVITY_REPORT") {
    return `📊 **Your Productivity Report:**\n\nTotal Tasks: ${data.total}\nCompleted: ${data.completed}\nUrgent: ${data.urgent}\nOverdue: ${data.overdue}\n\n💡 ${data.insight}\n\n${message}`;
  }

  if (action === "CHAT") {
    return data.response || message;
  }

  return message;
}
// ✅ URL stays clean, key is securely passed in the headers dictionary
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": "GEMINI_API_KEY" // 🔑 Passes the modern Auth Key safely here
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    });