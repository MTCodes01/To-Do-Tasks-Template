// Google Sheets Configuration
const CONFIG = {
  GOOGLE_SCRIPT_URL:
    "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
};

// Global variables
let currentView = "form";
let tasks = [];
let filteredTasks = [];
let isLoggedIn = false;
let currentFilters = {
  category: 'all',
  priority: 'all',
  status: 'all',
  sort: 'latest'
};

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeForm();
  showFormView();
});

// Form initialization
function initializeForm() {
  const form = document.getElementById("task-form");

  // Add timestamp on form submission
  form.addEventListener("submit", function (e) {
    document.getElementById("timestamp").value = new Date().toISOString();
    handleFormSubmission(e);
  });

  // Set minimum date to today for deadline field
  const deadlineInput = document.getElementById("deadline");
  const today = new Date().toISOString().split("T")[0];
  deadlineInput.min = today;
}

// Submit to Google Sheets
async function handleFormSubmission(e) {
  e.preventDefault();

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "⏳ Submitting...";
  showStatus("loading", "Submitting your task...", "form-status");

  try {
    const formData = new FormData(e.target);
    const taskData = {
      action: "submit",
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      category: formData.get("category"),
      deadline: formData.get("deadline") || "--",
      submitter: formData.get("submitter") || "Anonymous",
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(taskData),
    });

    const result = await response.json();

    if (result.success) {
      showStatus("success", "✅ Task submitted successfully!", "form-status");
      e.target.reset();
    } else {
      throw new Error(result.error || "Submission failed");
    }
  } catch (error) {
    console.error("Error:", error);
    showStatus(
      "error",
      "❌ Failed to submit task. Please try again.",
      "form-status"
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "🚀 Submit Task";
  }
}

// Toggle between form and admin views
function toggleView() {
  if (currentView === "form") {
    showAdminView();
  } else {
    showFormView();
  }
}

function showFormView() {
  currentView = "form";
  document.getElementById("form-section").classList.add("active");
  document.getElementById("admin-section").classList.remove("active");
  isLoggedIn = false;
}

function showAdminView() {
  currentView = "admin";
  document.getElementById("form-section").classList.remove("active");
  document.getElementById("admin-section").classList.add("active");

  if (!isLoggedIn) {
    document.getElementById("password-section").style.display = "block";
    document.getElementById("task-viewer").classList.remove("active");
  }
}

// Check admin password via server
async function checkPassword() {
  const password = document.getElementById("admin-password").value;

  if (!password.trim()) {
    showStatus("error", "❌ Please enter a password.", "admin-status");
    return;
  }

  showStatus("loading", "🔐 Verifying password...", "admin-status");

  try {
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "authenticate",
        password: password,
      }),
    });

    const result = await response.json();

    if (result.success) {
      isLoggedIn = true;
      document.getElementById("password-section").style.display = "none";
      document.getElementById("task-viewer").classList.add("active");
      document.getElementById("admin-password").value = ""; // Clear password field
      loadTasks();
    } else {
      showStatus(
        "error",
        "❌ Invalid password. Please try again.",
        "admin-status"
      );
      document.getElementById("admin-password").value = ""; // Clear password field
    }
  } catch (error) {
    console.error("Authentication error:", error);
    showStatus(
      "error",
      "❌ Authentication failed. Please try again.",
      "admin-status"
    );
  }
}

// Load from Google Sheets
async function loadTasks() {
  showStatus("loading", "⏳ Loading tasks...", "admin-status");

  try {
    const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=fetch`);
    const data = await response.json();

    if (data.success) {
      tasks = data.tasks.map(task => ({
        ...task,
        status: task.status || 'new' // Default status if not set
      }));

      if (tasks.length > 0) {
        displayTaskStats();
        displayAllTasks();
        setupFilterListeners();
        showStatus(
          "success",
          `✅ Loaded ${tasks.length} task(s).`,
          "admin-status"
        );
      } else {
        showEmptyTasksMessage();
        showStatus("error", "📭 No tasks found.", "admin-status");
      }
    } else {
      throw new Error(data.error || "Failed to load tasks");
    }
  } catch (error) {
    console.error("Error:", error);
    showStatus("error", "❌ Failed to load tasks.", "admin-status");
  }
}

// Display task statistics
function displayTaskStats() {
  const statsContainer = document.getElementById("task-stats");
  
  const totalTasks = tasks.length;
  const statusCounts = tasks.reduce((acc, task) => {
    const status = task.status || 'new';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  const priorityCounts = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {});

  statsContainer.innerHTML = `
    <div class="stat-card">
      <h4>${totalTasks}</h4>
      <p>Total Tasks</p>
    </div>
    <div class="stat-card">
      <h4>${statusCounts.new || 0}</h4>
      <p>New</p>
    </div>
    <div class="stat-card">
      <h4>${statusCounts['in progress'] || 0}</h4>
      <p>In Progress</p>
    </div>
    <div class="stat-card">
      <h4>${statusCounts.completed || 0}</h4>
      <p>Completed</p>
    </div>
    <div class="stat-card">
      <h4>${priorityCounts.high || 0}</h4>
      <p>High Priority</p>
    </div>
  `;
}

// Toggle filter visibility
function toggleFilters() {
  const filterBar = document.getElementById("filter-bar");
  filterBar.classList.toggle("active");
}

// Display all tasks with proper filtering setup
function displayAllTasks() {
  if (tasks.length === 0) {
    showEmptyTasksMessage();
    return;
  }

  // Apply current filters
  applyFilters();
}

// Apply filters and display filtered tasks
function applyFilters() {
  const categoryFilter = document.getElementById("filter-category")?.value || currentFilters.category;
  const priorityFilter = document.getElementById("filter-priority")?.value || currentFilters.priority;
  const statusFilter = document.getElementById("filter-status")?.value || currentFilters.status;
  const sortFilter = document.getElementById("filter-sort")?.value || currentFilters.sort;

  // Update current filters
  currentFilters = {
    category: categoryFilter,
    priority: priorityFilter,
    status: statusFilter,
    sort: sortFilter
  };

  let filtered = [...tasks];

  // Apply filters
  if (categoryFilter !== "all") {
    filtered = filtered.filter(task => task.category === categoryFilter);
  }
  if (priorityFilter !== "all") {
    filtered = filtered.filter(task => task.priority === priorityFilter);
  }
  if (statusFilter !== "all") {
    filtered = filtered.filter(task => (task.status || 'new') === statusFilter);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return sortFilter === "latest" ? bTime - aTime : aTime - bTime;
  });

  filteredTasks = filtered;
  displayFilteredTasks(filtered);
}

// Display filtered tasks
function displayFilteredTasks(filtered) {
  const container = document.getElementById("tasks-container");

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-tasks">
        <h3>🔍 No tasks match your filters</h3>
        <p>Try adjusting your filter criteria to see more tasks.</p>
        <button onclick="clearFilters()" class="refresh-btn">Clear Filters</button>
      </div>
    `;
    return;
  }

  const tasksHtml = filtered
    .map((task, originalIndex) => {
      // Find the original index in the tasks array
      const taskIndex = tasks.findIndex(t => t.timestamp === task.timestamp);
      const priorityClass = `priority-${task.priority}`;
      const statusClass = `status-${(task.status || 'new').replace(' ', '-')}`;
      
      const deadlineText = task.deadline && task.deadline !== "--"
        ? `📅 Deadline: ${new Date(task.deadline).toLocaleDateString("en-GB", { 
            day: "2-digit", month: "long", year: "numeric" 
          })}`
        : "📅 No deadline set";

      const submitterText = task.submitter && task.submitter !== "Anonymous"
        ? `👤 Submitted by: ${task.submitter}`
        : "👤 Anonymous submission";

      return `
        <div class="task-card" data-task-index="${taskIndex}">
          <div class="task-meta">
            <div class="task-timestamp">🕒 ${new Date(task.timestamp).toLocaleString()}</div>
            <div class="task-badges">
              <span class="priority-badge ${priorityClass}">
                ${task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'} 
                ${task.priority.toUpperCase()}
              </span>
              <span class="status-badge ${statusClass}">
                ${(task.status || 'new').toUpperCase()}
              </span>
            </div>
          </div>
          
          <div class="task-content">
            <h3>${task.title}</h3>
            
            <div class="task-info">
              <div class="task-info-item">
                <span>📂</span>
                <span>${task.category}</span>
              </div>
              <div class="task-info-item">
                <span>📅</span>
                <span>${task.deadline && task.deadline !== "--" ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</span>
              </div>
            </div>
            
            <div class="task-description">
              ${task.description}
            </div>
            
            <div class="task-submitter">
              ${submitterText}
            </div>
            
            <div class="status-selector">
              <label>📌 Status:</label>
              <select onchange="updateTaskStatus(${taskIndex}, this.value)" class="status-dropdown">
                <option value="new" ${(task.status || 'new') === 'new' ? 'selected' : ''}>🆕 New</option>
                <option value="in progress" ${task.status === 'in progress' ? 'selected' : ''}>⚡ In Progress</option>
                <option value="on hold" ${task.status === 'on hold' ? 'selected' : ''}>⏸️ On Hold</option>
                <option value="testing" ${task.status === 'testing' ? 'selected' : ''}>🧪 Testing</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                <option value="rejected" ${task.status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
              </select>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="tasks-grid">
      ${tasksHtml}
    </div>
  `;
}

// Setup filter event listeners
function setupFilterListeners() {
  const filterIds = ["filter-category", "filter-priority", "filter-status", "filter-sort"];
  
  filterIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.removeEventListener("change", applyFilters); // Remove existing listener
      element.addEventListener("change", applyFilters);
    }
  });
}

// Clear all filters
function clearFilters() {
  document.getElementById("filter-category").value = "all";
  document.getElementById("filter-priority").value = "all";
  document.getElementById("filter-status").value = "all";
  document.getElementById("filter-sort").value = "latest";
  
  currentFilters = {
    category: 'all',
    priority: 'all',
    status: 'all',
    sort: 'latest'
  };
  
  applyFilters();
}

// Update task status
async function updateTaskStatus(taskIndex, newStatus) {
  const task = tasks[taskIndex];
  if (!task) {
    showStatus("error", "❌ Task not found", "admin-status");
    return;
  }

  const oldStatus = task.status;
  task.status = newStatus; // Optimistically update

  try {
    showStatus("loading", "⏳ Updating status...", "admin-status");
    
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "updateStatus",
        timestamp: task.timestamp,
        newStatus: newStatus,
      }),
    });

    const result = await response.json();

    if (result.success) {
      showStatus(
        "success",
        `✅ Status updated to "${newStatus}"`,
        "admin-status"
      );
      
      // Refresh the display to show updated stats and apply current filters
      displayTaskStats();
      applyFilters();
    } else {
      // Revert the optimistic update
      task.status = oldStatus;
      throw new Error(result.error || "Failed to update status");
    }
  } catch (error) {
    // Revert the optimistic update
    task.status = oldStatus;
    showStatus("error", "❌ Failed to update status", "admin-status");
    console.error("Status update error:", error);
    
    // Refresh the display to show the reverted status
    applyFilters();
  }
}

// Show message when no tasks are available
function showEmptyTasksMessage() {
  const container = document.getElementById("tasks-container");
  container.innerHTML = `
    <div class="empty-tasks">
      <h3>📭 No tasks available</h3>
      <p>Tasks will appear here once they are submitted through the form.</p>
      <button onclick="refreshTasks()" class="refresh-btn">🔄 Refresh</button>
    </div>
  `;
}

// Refresh tasks
function refreshTasks() {
  if (isLoggedIn) {
    loadTasks();
  }
}

// Utility function to show status messages
function showStatus(type, message, elementId) {
  const statusDiv = document.getElementById(elementId);
  if (statusDiv) {
    statusDiv.innerHTML = `<div class="status-message ${type}">${message}</div>`;

    // Auto-hide success messages after 5 seconds
    if (type === "success") {
      setTimeout(() => {
        statusDiv.innerHTML = "";
      }, 5000);
    }
  }
}

// Handle Enter key in password field
document.addEventListener("keypress", function (e) {
  if (e.target.id === "admin-password" && e.key === "Enter") {
    checkPassword();
  }
});

// Export functions for global access
window.toggleView = toggleView;
window.checkPassword = checkPassword;
window.toggleFilters = toggleFilters;
window.refreshTasks = refreshTasks;
window.updateTaskStatus = updateTaskStatus;
window.clearFilters = clearFilters;
