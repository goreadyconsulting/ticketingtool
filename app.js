const API_URL = String(
  (window.RESOLVEOPS_CONFIG && window.RESOLVEOPS_CONFIG.API_URL) || ""
).trim();

let incidents = [];
let activity = [];
let currentUser = null;
let activeIncidentId = null;
let activeView = "overview";
let sessionToken = sessionStorage.getItem("resolveOpsToken") || "";

const els = {
  loginScreen: document.getElementById("loginScreen"),
  appShell: document.getElementById("appShell"),
  loginForm: document.getElementById("loginForm"),
  loginButton: document.getElementById("loginButton"),
  loginError: document.getElementById("loginError"),
  table: document.getElementById("incidentTable"),
  empty: document.getElementById("emptyState"),
  search: document.getElementById("incidentSearch"),
  globalSearch: document.getElementById("globalSearch"),
  priority: document.getElementById("priorityFilter"),
  status: document.getElementById("statusFilter"),
  drawer: document.getElementById("incidentDrawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  form: document.getElementById("incidentForm"),
  toast: document.getElementById("toast")
};

function apiConfigured() {
  return API_URL && !API_URL.includes("PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE");
}

async function api(action, payload) {
  if (!apiConfigured()) {
    throw new Error("Backend connection is not configured.");
  }

  const body = Object.assign({ action: action }, payload || {});
  if (action !== "login") body.token = sessionToken;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error("Unable to reach the backend.");
  }

  const data = await response.json();

  if (data.authError) {
    clearSession();
    showLogin("Your session has expired. Please sign in again.");
    throw new Error(data.error || "Session expired.");
  }

  if (!data.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

async function handleLogin(event) {
  event.preventDefault();
  setLoginLoading(true);
  els.loginError.textContent = "";

  const data = new FormData(els.loginForm);

  try {
    const result = await api("login", {
      username: data.get("username"),
      password: data.get("password")
    });

    sessionToken = result.token;
    sessionStorage.setItem("resolveOpsToken", sessionToken);
    await loadWorkspace();
    els.loginForm.querySelector('input[name="password"]').value = "";
  } catch (error) {
    els.loginError.textContent = error.message;
  } finally {
    setLoginLoading(false);
  }
}

function setLoginLoading(loading) {
  els.loginButton.classList.toggle("loading", loading);
  els.loginButton.disabled = loading;
}

async function loadWorkspace() {
  const result = await api("bootstrap");
  incidents = Array.isArray(result.incidents) ? result.incidents : [];
  activity = Array.isArray(result.activity) ? result.activity : [];
  currentUser = result.user || { username: "Admin", displayName: "Operations Admin", role: "Admin" };

  updateProfile();
  renderIncidents();
  renderActivity();
  showApp();
}

async function refreshWorkspace() {
  const result = await api("bootstrap");
  incidents = Array.isArray(result.incidents) ? result.incidents : [];
  activity = Array.isArray(result.activity) ? result.activity : [];
  currentUser = result.user || currentUser;
  updateProfile();
  renderIncidents();
  renderActivity();
}

function showApp() {
  els.loginScreen.classList.add("is-hidden");
  els.appShell.classList.remove("is-hidden");
}

function showLogin(message) {
  els.appShell.classList.add("is-hidden");
  els.loginScreen.classList.remove("is-hidden");
  els.loginError.textContent = message || "";
  setTimeout(function() {
    const username = els.loginForm.querySelector('input[name="username"]');
    if (username) username.focus();
  }, 50);
}

function clearSession() {
  sessionToken = "";
  currentUser = null;
  sessionStorage.removeItem("resolveOpsToken");
}

async function logout() {
  try {
    if (sessionToken && apiConfigured()) {
      await api("logout");
    }
  } catch (error) {
    console.warn(error);
  } finally {
    clearSession();
    incidents = [];
    activity = [];
    closeIncident();
    closeModal();
    showLogin("");
  }
}

function updateProfile() {
  const name = currentUser && currentUser.displayName ? currentUser.displayName : "Operations Admin";
  const role = currentUser && currentUser.role ? currentUser.role : "Admin";
  document.getElementById("profileName").textContent = name;
  document.getElementById("profileRole").textContent = role;
  document.getElementById("profileAvatar").textContent = initials(name);
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map(function(part) { return part[0]; })
    .join("")
    .slice(0, 2)
    .toUpperCase() || "RO";
}

function priorityClass(priority) {
  return String(priority || "P3").toLowerCase();
}

function statusClass(status) {
  return String(status || "New").toLowerCase().replace(/\s+/g, "-");
}

function renderIncidents() {
  const query = els.search.value.trim().toLowerCase();
  const globalQuery = els.globalSearch.value.trim().toLowerCase();
  const priority = els.priority.value;
  const status = els.status.value;

  let rows = incidents.filter(function(item) {
    const searchable = [
      item.id, item.title, item.owner, item.service, item.status, item.priority
    ].join(" ").toLowerCase();

    const matchesLocal = !query || searchable.indexOf(query) >= 0;
    const matchesGlobal = !globalQuery || searchable.indexOf(globalQuery) >= 0;
    const matchesPriority = priority === "all" || item.priority === priority;
    const matchesStatus = status === "all" || item.status === status;

    const myName = currentUser && currentUser.displayName ? currentUser.displayName : "";
    const matchesView = activeView !== "myqueue" ||
      item.owner === myName ||
      item.owner === "Service Desk";

    return matchesLocal && matchesGlobal && matchesPriority && matchesStatus && matchesView;
  });

  if (activeView === "overview") rows = rows.slice(0, 6);

  els.table.innerHTML = rows.map(function(item) {
    return '<tr data-id="' + escapeHtml(item.id) + '">' +
      '<td class="incident-cell"><strong>' + escapeHtml(item.title) + '</strong><span>' +
      escapeHtml(item.id) + ' · ' + escapeHtml(item.service) + '</span></td>' +
      '<td><span class="priority-pill ' + priorityClass(item.priority) + '">' +
      escapeHtml(item.priority) + ' ' + escapeHtml(item.priorityLabel) + '</span></td>' +
      '<td><span class="status-pill ' + statusClass(item.status) + '">' +
      escapeHtml(item.status) + '</span></td>' +
      '<td><div class="owner"><span class="owner-avatar">' + initials(item.owner) +
      '</span><span>' + escapeHtml(item.owner) + '</span></div></td>' +
      '<td><span class="sla ' + escapeHtml(item.slaState) + '">' + escapeHtml(item.sla) + '</span></td>' +
      '<td><button class="row-action" aria-label="Open ' + escapeHtml(item.id) + '">›</button></td>' +
      '</tr>';
  }).join("");

  els.empty.hidden = rows.length !== 0;

  Array.prototype.forEach.call(els.table.querySelectorAll("tr"), function(row) {
    row.addEventListener("click", function() {
      openIncident(row.dataset.id);
    });
  });

  updateStats();
}

function updateStats() {
  const open = incidents.filter(function(i) { return i.status !== "Resolved"; }).length;
  const critical = incidents.filter(function(i) {
    return i.status !== "Resolved" && i.priority === "P1";
  }).length;
  const risk = incidents.filter(function(i) {
    return i.status !== "Resolved" && (i.slaState === "risk" || i.slaState === "breached");
  }).length;
  const resolved = incidents.filter(function(i) { return i.status === "Resolved"; }).length;

  document.getElementById("statOpen").textContent = open;
  document.getElementById("statCritical").textContent = critical;
  document.getElementById("statRisk").textContent = risk;
  document.getElementById("statResolved").textContent = resolved;
  document.getElementById("navOpenCount").textContent = open;

  const major = incidents.find(function(i) {
    return i.priority === "P1" && i.status !== "Resolved";
  });

  const banner = document.getElementById("priorityBanner");

  if (major) {
    banner.style.display = "flex";
    document.getElementById("majorIncidentTitle").textContent = major.title;
    document.getElementById("majorIncidentMeta").textContent =
      major.id + " · " + major.service + " · " + major.priority + " " + major.priorityLabel;
    document.getElementById("majorSla").textContent =
      major.sla === "Breached" ? "SLA breached" : major.sla + " remaining";
    document.getElementById("openMajorButton").dataset.id = major.id;
  } else {
    banner.style.display = "none";
  }

  const active = incidents.filter(function(i) { return i.status !== "Resolved"; });
  const breached = active.filter(function(i) { return i.slaState === "breached"; }).length;
  const atRisk = active.filter(function(i) { return i.slaState === "risk"; }).length;
  const within = active.filter(function(i) { return i.slaState === "good"; }).length;
  const total = Math.max(active.length, 1);
  const percent = Math.round(((total - breached) / total) * 100);

  document.getElementById("slaPercent").textContent = percent + "%";
  document.getElementById("slaWithin").textContent = within;
  document.getElementById("slaAtRisk").textContent = atRisk;
  document.getElementById("slaBreached").textContent = breached;
  document.getElementById("slaDonut").style.background =
    "conic-gradient(var(--success) 0 " + percent + "%,#e8edf3 " + percent + "% 100%)";
}

function renderActivity() {
  const list = document.getElementById("activityList");
  const latest = activity.slice(0, 5);

  if (!latest.length) {
    list.innerHTML = '<div class="empty-state"><strong>No recent activity</strong></div>';
    return;
  }

  list.innerHTML = latest.map(function(item) {
    const label = item.username || "System";
    return '<div class="activity-item">' +
      '<div class="activity-badge">' + initials(label) + '</div>' +
      '<div class="activity-copy"><strong>' + escapeHtml(label + " · " + item.action) + '</strong>' +
      '<p>' + escapeHtml(item.incidentId + " · " + item.detail) +
      ' <time>· ' + escapeHtml(timeAgo(item.timestamp)) + '</time></p></div>' +
      '</div>';
  }).join("");
}

function timeAgo(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  return Math.floor(seconds / 86400) + "d ago";
}

function openIncident(id) {
  const item = incidents.find(function(i) { return i.id === id; });
  if (!item) return;

  activeIncidentId = id;

  document.getElementById("drawerId").textContent = item.id;
  document.getElementById("drawerTitle").textContent = item.title;
  document.getElementById("drawerPriority").textContent = item.priority + " " + item.priorityLabel;
  document.getElementById("drawerPriority").className = "priority-pill " + priorityClass(item.priority);
  document.getElementById("drawerStatus").textContent = item.status;
  document.getElementById("drawerStatus").className = "status-pill " + statusClass(item.status);
  document.getElementById("drawerService").textContent = item.service;
  document.getElementById("drawerOwner").textContent = item.owner;
  document.getElementById("drawerCreated").textContent = item.created;
  document.getElementById("drawerSla").textContent = item.sla;
  document.getElementById("drawerDescription").textContent = item.description;
  document.getElementById("drawerImpact").textContent = item.impact;
  document.getElementById("drawerUrgency").textContent = item.urgency;
  document.getElementById("drawerUsers").textContent = item.users;
  document.getElementById("drawerUpdated").textContent = "Updated " + item.updated;
  document.getElementById("drawerStatusSelect").value = item.status;

  const timeline = Array.isArray(item.timeline) ? item.timeline : [];
  document.getElementById("drawerTimeline").innerHTML = timeline.length
    ? timeline.map(function(entry) {
        return '<div class="timeline-item"><strong>' + escapeHtml(entry[0]) +
          '</strong><span>' + escapeHtml(entry[1]) + '</span></div>';
      }).join("")
    : '<div class="timeline-item"><strong>No activity yet</strong></div>';

  els.drawer.classList.add("open");
  els.drawerBackdrop.classList.add("open");
  els.drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeIncident() {
  els.drawer.classList.remove("open");
  els.drawerBackdrop.classList.remove("open");
  els.drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  activeIncidentId = null;
}

async function saveIncidentUpdate() {
  const item = incidents.find(function(i) { return i.id === activeIncidentId; });
  if (!item) return;

  const button = document.getElementById("saveIncidentButton");
  button.disabled = true;

  try {
    await api("updateIncident", {
      incident: {
        id: item.id,
        status: document.getElementById("drawerStatusSelect").value
      }
    });

    const id = item.id;
    await refreshWorkspace();
    openIncident(id);
    showToast("Incident updated", id + " has been saved.");
  } catch (error) {
    showToast("Update failed", error.message);
  } finally {
    button.disabled = false;
  }
}

function openModal() {
  els.modalBackdrop.classList.add("open");
  document.body.classList.add("modal-open");

  setTimeout(function() {
    const input = els.form.querySelector('input[name="title"]');
    if (input) input.focus();
  }, 100);
}

function closeModal() {
  els.modalBackdrop.classList.remove("open");
  if (!els.drawer.classList.contains("open")) {
    document.body.classList.remove("modal-open");
  }
}

async function createIncident(event) {
  event.preventDefault();

  const data = new FormData(els.form);
  const submit = els.form.querySelector('button[type="submit"]');
  submit.disabled = true;

  try {
    const result = await api("createIncident", {
      incident: {
        title: data.get("title"),
        service: data.get("service"),
        priority: data.get("priority"),
        description: data.get("description"),
        owner: data.get("owner"),
        users: data.get("users")
      }
    });

    els.form.reset();
    closeModal();
    await refreshWorkspace();
    showToast("Incident created", result.incident.id + " has been added to the queue.");
    setTimeout(function() { openIncident(result.incident.id); }, 200);
  } catch (error) {
    showToast("Create failed", error.message);
  } finally {
    submit.disabled = false;
  }
}

function showToast(title, message) {
  const toast = els.toast;
  toast.querySelector("strong").textContent = title;
  toast.querySelector("small").textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function() {
    toast.classList.remove("show");
  }, 3200);
}

function setView(view) {
  activeView = view;

  Array.prototype.forEach.call(document.querySelectorAll(".nav-item"), function(button) {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  const map = {
    overview: ["Incident Management", "Monitor active incidents, service health and response performance."],
    incidents: ["All Incidents", "Review and manage incidents across services and support teams."],
    myqueue: ["My Queue", "Incidents currently owned by you or awaiting service desk action."],
    changes: ["Change Overview", "Track service changes and their operational impact."],
    knowledge: ["Knowledge", "Search support guidance, runbooks and known errors."],
    reports: ["Service Reports", "Review incident trends, SLA performance and operational health."]
  };

  title.textContent = map[view][0];
  subtitle.textContent = map[view][1];

  if (view === "changes" || view === "knowledge" || view === "reports") {
    showToast(map[view][0], "This area is ready for the next module.");
  }

  renderIncidents();
  document.getElementById("sidebar").classList.remove("open");
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/[&<>"']/g, function(match) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[match];
    });
}

els.loginForm.addEventListener("submit", handleLogin);
els.search.addEventListener("input", renderIncidents);
els.globalSearch.addEventListener("input", renderIncidents);
els.priority.addEventListener("change", renderIncidents);
els.status.addEventListener("change", renderIncidents);
document.getElementById("closeDrawer").addEventListener("click", closeIncident);
els.drawerBackdrop.addEventListener("click", closeIncident);
document.getElementById("saveIncidentButton").addEventListener("click", saveIncidentUpdate);
document.getElementById("newIncidentButton").addEventListener("click", openModal);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);
document.getElementById("logoutButton").addEventListener("click", logout);
els.modalBackdrop.addEventListener("click", function(event) {
  if (event.target === els.modalBackdrop) closeModal();
});
els.form.addEventListener("submit", createIncident);
document.getElementById("openMajorButton").addEventListener("click", function(event) {
  openIncident(event.currentTarget.dataset.id);
});
document.getElementById("viewAllButton").addEventListener("click", function() {
  setView("incidents");
});
document.getElementById("menuButton").addEventListener("click", function() {
  document.getElementById("sidebar").classList.toggle("open");
});

Array.prototype.forEach.call(document.querySelectorAll(".nav-item"), function(button) {
  button.addEventListener("click", function() {
    setView(button.dataset.view);
  });
});

document.addEventListener("keydown", function(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !els.appShell.classList.contains("is-hidden")) {
    event.preventDefault();
    els.globalSearch.focus();
  }

  if (event.key === "Escape") {
    closeIncident();
    closeModal();
    document.getElementById("sidebar").classList.remove("open");
  }
});

(async function initialise() {
  if (!sessionToken) {
    showLogin("");
    return;
  }

  try {
    await loadWorkspace();
  } catch (error) {
    clearSession();
    showLogin(error.message);
  }
})();