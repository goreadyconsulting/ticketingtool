const defaultIncidents = [
  {
    id: "INC-2048",
    title: "Payment gateway latency affecting checkout",
    priority: "P1",
    priorityLabel: "Critical",
    status: "Investigating",
    owner: "Priya Shah",
    service: "Customer Payments",
    sla: "18 min",
    slaState: "risk",
    created: "Today, 14:12",
    updated: "6 min ago",
    description: "Customers are experiencing elevated response times during card authorisation. Checkout remains available, but approximately 28% of payment attempts are taking longer than the expected threshold.",
    impact: "High",
    urgency: "Critical",
    users: "1,240+",
    timeline: [
      ["Major incident declared", "Incident Manager · 14:19"],
      ["Payments engineering engaged", "Priya Shah · 14:16"],
      ["Incident created from monitoring alert", "System · 14:12"]
    ]
  },
  {
    id: "INC-2047",
    title: "Intermittent SSO failures for remote employees",
    priority: "P2",
    priorityLabel: "High",
    status: "Investigating",
    owner: "Daniel Reed",
    service: "Identity & Access",
    sla: "46 min",
    slaState: "risk",
    created: "Today, 13:38",
    updated: "11 min ago",
    description: "A subset of remote users are receiving authentication timeout messages when signing in through the corporate identity provider.",
    impact: "Medium",
    urgency: "High",
    users: "186",
    timeline: [
      ["Identity provider logs collected", "Daniel Reed · 14:01"],
      ["Network team asked to validate routing", "Service Desk · 13:49"],
      ["Incident created", "Service Desk · 13:38"]
    ]
  },
  {
    id: "INC-2046",
    title: "Customer portal reports loading slowly",
    priority: "P3",
    priorityLabel: "Medium",
    status: "Monitoring",
    owner: "Maya Patel",
    service: "Customer Portal",
    sla: "2h 14m",
    slaState: "good",
    created: "Today, 12:55",
    updated: "18 min ago",
    description: "Report pages are loading above the standard performance baseline. A database query optimisation has been deployed and the service is being monitored.",
    impact: "Medium",
    urgency: "Medium",
    users: "74",
    timeline: [
      ["Performance returned to baseline", "Maya Patel · 13:52"],
      ["Query optimisation deployed", "Data Platform · 13:36"],
      ["Incident created", "Service Desk · 12:55"]
    ]
  },
  {
    id: "INC-2045",
    title: "Finance shared drive unavailable",
    priority: "P2",
    priorityLabel: "High",
    status: "New",
    owner: "Service Desk",
    service: "Employee Technology",
    sla: "1h 05m",
    slaState: "good",
    created: "Today, 12:21",
    updated: "22 min ago",
    description: "Finance users cannot access the shared departmental drive. Other departmental shares appear unaffected.",
    impact: "Medium",
    urgency: "High",
    users: "52",
    timeline: [
      ["Storage team notified", "Service Desk · 12:33"],
      ["Incident created from user calls", "Service Desk · 12:21"]
    ]
  },
  {
    id: "INC-2044",
    title: "Data warehouse scheduled refresh failed",
    priority: "P3",
    priorityLabel: "Medium",
    status: "Investigating",
    owner: "Alex Morgan",
    service: "Data Platform",
    sla: "3h 08m",
    slaState: "good",
    created: "Today, 11:45",
    updated: "29 min ago",
    description: "The scheduled warehouse refresh failed during the transformation stage. Business dashboards currently display the previous successful load.",
    impact: "Low",
    urgency: "Medium",
    users: "31",
    timeline: [
      ["Failed job restarted with additional logging", "Alex Morgan · 12:17"],
      ["Incident raised by monitoring", "System · 11:45"]
    ]
  },
  {
    id: "INC-2043",
    title: "VPN client update causing connection drops",
    priority: "P4",
    priorityLabel: "Low",
    status: "Monitoring",
    owner: "Daniel Reed",
    service: "Employee Technology",
    sla: "5h 22m",
    slaState: "good",
    created: "Today, 10:58",
    updated: "41 min ago",
    description: "A small number of devices on the latest VPN client version report brief connection drops. A workaround has been published.",
    impact: "Low",
    urgency: "Low",
    users: "19",
    timeline: [
      ["Workaround published to knowledge base", "Daniel Reed · 11:44"],
      ["Vendor case opened", "Daniel Reed · 11:16"],
      ["Incident created", "Service Desk · 10:58"]
    ]
  },
  {
    id: "INC-2042",
    title: "Password reset emails delayed",
    priority: "P3",
    priorityLabel: "Medium",
    status: "Resolved",
    owner: "Maya Patel",
    service: "Identity & Access",
    sla: "Met",
    slaState: "good",
    created: "Today, 09:41",
    updated: "1h ago",
    description: "Password reset emails were delayed by a mail queue backlog. The queue has cleared and delivery times are back within normal thresholds.",
    impact: "Medium",
    urgency: "Medium",
    users: "93",
    timeline: [
      ["Incident resolved", "Maya Patel · 12:09"],
      ["Mail queue cleared", "Messaging Team · 11:52"],
      ["Incident created", "Service Desk · 09:41"]
    ]
  },
  {
    id: "INC-2041",
    title: "Meeting room booking panels offline",
    priority: "P4",
    priorityLabel: "Low",
    status: "Resolved",
    owner: "Alex Morgan",
    service: "Employee Technology",
    sla: "Met",
    slaState: "good",
    created: "Today, 08:56",
    updated: "2h ago",
    description: "Several meeting room booking displays were offline after an overnight network change. Devices were reconnected successfully.",
    impact: "Low",
    urgency: "Low",
    users: "12 rooms",
    timeline: [
      ["Incident resolved", "Alex Morgan · 11:02"],
      ["Panels reconnected", "Workplace Tech · 10:38"],
      ["Incident created", "Service Desk · 08:56"]
    ]
  }
];

const activitySeed = [
  { badge: "PS", title: "Priya updated INC-2048", detail: "Payments engineering is reviewing gateway traces.", time: "6m" },
  { badge: "DR", title: "Daniel updated INC-2047", detail: "Authentication logs attached for analysis.", time: "11m" },
  { badge: "MP", title: "Maya moved INC-2046 to Monitoring", detail: "Performance has returned to baseline.", time: "18m" },
  { badge: "SD", title: "New incident INC-2045", detail: "Finance shared drive unavailable.", time: "22m" }
];

let incidents = loadIncidents();
let activeIncidentId = null;
let activeView = "overview";

const els = {
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

function loadIncidents() {
  try {
    const stored = localStorage.getItem("resolveOpsIncidents");
    return stored ? JSON.parse(stored) : defaultIncidents.slice();
  } catch (error) {
    return defaultIncidents.slice();
  }
}

function saveIncidents() {
  localStorage.setItem("resolveOpsIncidents", JSON.stringify(incidents));
}

function initials(name) {
  return name.split(" ").map(function(part){ return part[0]; }).join("").slice(0,2).toUpperCase();
}

function priorityClass(priority) {
  return priority.toLowerCase();
}

function statusClass(status) {
  return status.toLowerCase().replace(/\s+/g,"-");
}

function getPriorityLabel(priority) {
  return {P1:"Critical",P2:"High",P3:"Medium",P4:"Low"}[priority] || "";
}

function renderIncidents() {
  const query = els.search.value.trim().toLowerCase();
  const globalQuery = els.globalSearch.value.trim().toLowerCase();
  const priority = els.priority.value;
  const status = els.status.value;

  let rows = incidents.filter(function(item) {
    const searchable = [item.id,item.title,item.owner,item.service,item.status,item.priority].join(" ").toLowerCase();
    const matchesLocal = !query || searchable.indexOf(query) >= 0;
    const matchesGlobal = !globalQuery || searchable.indexOf(globalQuery) >= 0;
    const matchesPriority = priority === "all" || item.priority === priority;
    const matchesStatus = status === "all" || item.status === status;
    const matchesView = activeView !== "myqueue" || item.owner === "Operations User" || item.owner === "Service Desk";
    return matchesLocal && matchesGlobal && matchesPriority && matchesStatus && matchesView;
  });

  if (activeView === "overview") rows = rows.slice(0,6);

  els.table.innerHTML = rows.map(function(item) {
    return '<tr data-id="' + item.id + '">' +
      '<td class="incident-cell"><strong>' + escapeHtml(item.title) + '</strong><span>' + item.id + ' · ' + escapeHtml(item.service) + '</span></td>' +
      '<td><span class="priority-pill ' + priorityClass(item.priority) + '">' + item.priority + ' ' + item.priorityLabel + '</span></td>' +
      '<td><span class="status-pill ' + statusClass(item.status) + '">' + item.status + '</span></td>' +
      '<td><div class="owner"><span class="owner-avatar">' + initials(item.owner) + '</span><span>' + escapeHtml(item.owner) + '</span></div></td>' +
      '<td><span class="sla ' + item.slaState + '">' + item.sla + '</span></td>' +
      '<td><button class="row-action" aria-label="Open ' + item.id + '">›</button></td>' +
      '</tr>';
  }).join("");

  els.empty.hidden = rows.length !== 0;

  Array.prototype.forEach.call(els.table.querySelectorAll("tr"), function(row) {
    row.addEventListener("click", function() { openIncident(row.dataset.id); });
  });

  updateStats();
}

function updateStats() {
  const open = incidents.filter(function(i){ return i.status !== "Resolved"; }).length;
  const critical = incidents.filter(function(i){ return i.status !== "Resolved" && i.priority === "P1"; }).length;
  const risk = incidents.filter(function(i){ return i.status !== "Resolved" && (i.slaState === "risk" || i.slaState === "breached"); }).length;
  const resolved = incidents.filter(function(i){ return i.status === "Resolved"; }).length;

  document.getElementById("statOpen").textContent = open;
  document.getElementById("statCritical").textContent = critical;
  document.getElementById("statRisk").textContent = risk;
  document.getElementById("statResolved").textContent = resolved;
  document.getElementById("navOpenCount").textContent = open;

  const major = incidents.find(function(i){ return i.priority === "P1" && i.status !== "Resolved"; });
  const banner = document.getElementById("priorityBanner");
  if (major) {
    banner.style.display = "flex";
    document.getElementById("majorIncidentTitle").textContent = major.title;
    document.getElementById("majorIncidentMeta").textContent = major.id + " · " + major.service + " · " + major.priority + " " + major.priorityLabel;
    document.getElementById("majorSla").textContent = major.sla === "Breached" ? "SLA breached" : major.sla + " remaining";
    document.getElementById("openMajorButton").dataset.id = major.id;
  } else {
    banner.style.display = "none";
  }

  const active = incidents.filter(function(i){ return i.status !== "Resolved"; });
  const breached = active.filter(function(i){ return i.slaState === "breached"; }).length;
  const atRisk = active.filter(function(i){ return i.slaState === "risk"; }).length;
  const within = active.filter(function(i){ return i.slaState === "good"; }).length;
  const total = Math.max(active.length,1);
  const percent = Math.round(((total - breached) / total) * 100);

  document.getElementById("slaPercent").textContent = percent + "%";
  document.getElementById("slaWithin").textContent = within;
  document.getElementById("slaAtRisk").textContent = atRisk;
  document.getElementById("slaBreached").textContent = breached;
  document.getElementById("slaDonut").style.background = "conic-gradient(var(--success) 0 " + percent + "%,#e8edf3 " + percent + "% 100%)";
}

function renderActivity() {
  const list = document.getElementById("activityList");
  list.innerHTML = activitySeed.map(function(item) {
    return '<div class="activity-item">' +
      '<div class="activity-badge">' + item.badge + '</div>' +
      '<div class="activity-copy"><strong>' + item.title + '</strong><p>' + item.detail + ' <time>· ' + item.time + ' ago</time></p></div>' +
      '</div>';
  }).join("");
}

function openIncident(id) {
  const item = incidents.find(function(i){ return i.id === id; });
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
  document.getElementById("drawerTimeline").innerHTML = item.timeline.map(function(entry) {
    return '<div class="timeline-item"><strong>' + escapeHtml(entry[0]) + '</strong><span>' + escapeHtml(entry[1]) + '</span></div>';
  }).join("");

  els.drawer.classList.add("open");
  els.drawerBackdrop.classList.add("open");
  els.drawer.setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");
}

function closeIncident() {
  els.drawer.classList.remove("open");
  els.drawerBackdrop.classList.remove("open");
  els.drawer.setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");
  activeIncidentId = null;
}

function saveIncidentUpdate() {
  const item = incidents.find(function(i){ return i.id === activeIncidentId; });
  if (!item) return;

  const nextStatus = document.getElementById("drawerStatusSelect").value;
  if (nextStatus !== item.status) {
    item.status = nextStatus;
    item.updated = "just now";
    if (nextStatus === "Resolved") {
      item.sla = "Met";
      item.slaState = "good";
    }
    item.timeline.unshift(["Status changed to " + nextStatus, "Operations User · just now"]);
  }

  saveIncidents();
  renderIncidents();
  openIncident(item.id);
  showToast("Incident updated", item.id + " is now " + item.status + ".");
}

function openModal() {
  els.modalBackdrop.classList.add("open");
  document.body.classList.add("modal-open");
  setTimeout(function(){
    const input = els.form.querySelector('input[name="title"]');
    if (input) input.focus();
  },100);
}

function closeModal() {
  els.modalBackdrop.classList.remove("open");
  document.body.classList.remove("modal-open");
}

function createIncident(event) {
  event.preventDefault();
  const data = new FormData(els.form);
  const priority = data.get("priority");
  const maxNumber = incidents.reduce(function(max,item){
    const number = Number(item.id.replace("INC-",""));
    return Math.max(max,number);
  },2048);
  const id = "INC-" + (maxNumber + 1);
  const now = new Date();
  const time = now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

  const item = {
    id: id,
    title: String(data.get("title")),
    priority: priority,
    priorityLabel: getPriorityLabel(priority),
    status: "New",
    owner: String(data.get("owner")),
    service: String(data.get("service")),
    sla: priority === "P1" ? "15 min" : priority === "P2" ? "1h 00m" : priority === "P3" ? "4h 00m" : "8h 00m",
    slaState: priority === "P1" ? "risk" : "good",
    created: "Today, " + time,
    updated: "just now",
    description: String(data.get("description")),
    impact: priority === "P1" ? "High" : priority === "P2" ? "Medium" : "Low",
    urgency: getPriorityLabel(priority),
    users: String(data.get("users") || "1"),
    timeline: [["Incident created", "Operations User · just now"]]
  };

  incidents.unshift(item);
  saveIncidents();
  els.form.reset();
  closeModal();
  renderIncidents();
  showToast("Incident created", id + " has been added to the queue.");
  setTimeout(function(){ openIncident(id); },250);
}

function showToast(title, message) {
  const toast = els.toast;
  toast.querySelector("strong").textContent = title;
  toast.querySelector("small").textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function(){ toast.classList.remove("show"); },3000);
}

function setView(view) {
  activeView = view;
  Array.prototype.forEach.call(document.querySelectorAll(".nav-item"), function(button){
    button.classList.toggle("active", button.dataset.view === view);
  });

  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  const map = {
    overview: ["Incident Management","Monitor active incidents, service health and response performance."],
    incidents: ["All Incidents","Review and manage incidents across services and support teams."],
    myqueue: ["My Queue","Incidents currently owned by you or awaiting service desk action."],
    changes: ["Change Overview","Track service changes and their operational impact."],
    knowledge: ["Knowledge","Search support guidance, runbooks and known errors."],
    reports: ["Service Reports","Review incident trends, SLA performance and operational health."]
  };
  title.textContent = map[view][0];
  subtitle.textContent = map[view][1];

  if (view === "changes" || view === "knowledge" || view === "reports") {
    showToast(map[view][0], "This navigation area is ready for the next module.");
  }

  renderIncidents();
  document.getElementById("sidebar").classList.remove("open");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function(match) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[match];
  });
}

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
els.modalBackdrop.addEventListener("click", function(event){ if (event.target === els.modalBackdrop) closeModal(); });
els.form.addEventListener("submit", createIncident);
document.getElementById("openMajorButton").addEventListener("click", function(event){ openIncident(event.currentTarget.dataset.id); });
document.getElementById("viewAllButton").addEventListener("click", function(){ setView("incidents"); });
document.getElementById("menuButton").addEventListener("click", function(){ document.getElementById("sidebar").classList.toggle("open"); });

Array.prototype.forEach.call(document.querySelectorAll(".nav-item"), function(button){
  button.addEventListener("click", function(){ setView(button.dataset.view); });
});

document.addEventListener("keydown", function(event){
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    els.globalSearch.focus();
  }
  if (event.key === "Escape") {
    closeIncident();
    closeModal();
    document.getElementById("sidebar").classList.remove("open");
  }
});

renderActivity();
renderIncidents();