
const STORAGE_KEY = "checklist_tasks_v1";

/** @type {Array<Task>} */
let tasks = loadTasks();
let currentFilter = "all";   // "all" | "active" | "completed"
let searchTerm = "";


const taskInput = document.getElementById("task-input");
const categoryInput = document.getElementById("category-input");
const timeInput = document.getElementById("time-input");
const repeatInput = document.getElementById("repeat-input");
const priorityInput = document.getElementById("priority-input");
const addBtn = document.getElementById("add-btn");

const searchInput = document.getElementById("search-input");
const filtersBar = document.getElementById("filters");

const taskListEl = document.getElementById("task-list");
const emptyStateEl = document.getElementById("empty-state");

const counterActiveEl = document.getElementById("counter-active");
const counterTotalEl = document.getElementById("counter-total");


function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to load tasks from storage:", err);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error("Failed to save tasks to storage:", err);
  }
}


function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function createTask({ text, category, time, repeat, priority }) {
  return {
    id: makeId(),
    text: text.trim(),
    category,
    time: time || "",       // ISO datetime-local string or ""
    repeat,                 // none | daily | weekly | monthly | yearly
    priority,                // low | medium | high
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

function isOverdue(task) {
  if (task.completed || !task.time) return false;
  return new Date(task.time).getTime() < Date.now();
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function repeatLabel(repeat) {
  const map = {
    none: "",
    daily: "↻ Daily",
    weekly: "↻ Weekly",
    monthly: "↻ Monthly",
    yearly: "↻ Yearly",
  };
  return map[repeat] || "";
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    taskInput.classList.add("task-edit-input"); // reuse style as a subtle error border
    return;
  }

  const task = createTask({
    text,
    category: categoryInput.value,
    time: timeInput.value,
    repeat: repeatInput.value,
    priority: priorityInput.value,
  });

  tasks.unshift(task);
  saveTasks();
  render();

  taskInput.value = "";
  timeInput.value = "";
  taskInput.focus();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
}

function editTask(id, newText) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const trimmed = newText.trim();
  if (trimmed) task.text = trimmed;
  saveTasks();
  render();
}


function getVisibleTasks() {
  return tasks.filter((t) => {
    if (currentFilter === "active" && t.completed) return false;
    if (currentFilter === "completed" && !t.completed) return false;
    if (searchTerm && !t.text.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
}


function render() {
  const visible = getVisibleTasks();

  taskListEl.innerHTML = "";

  visible.forEach((task) => {
    taskListEl.appendChild(buildTaskElement(task));
  });

  emptyStateEl.classList.toggle("show", visible.length === 0);
  if (tasks.length === 0) {
    emptyStateEl.textContent = "No tasks yet — add your first one above.";
  } else if (visible.length === 0) {
    emptyStateEl.textContent = "No tasks match your search / filter.";
  }

  updateCounter();
}

function buildTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task" + (task.completed ? " completed" : "");
  li.dataset.priority = task.priority;
  if (isOverdue(task)) li.classList.add("overdue");
  li.dataset.id = task.id;


  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", "Toggle completed for: " + task.text);
  checkbox.addEventListener("change", () => toggleComplete(task.id));


  const body = document.createElement("div");
  body.className = "task-body";

  const textEl = document.createElement("p");
  textEl.className = "task-text";
  textEl.textContent = task.text;
  textEl.title = "Click to toggle complete";
  textEl.addEventListener("click", () => toggleComplete(task.id));

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.appendChild(makeBadge(task.category));
  if (task.time) meta.appendChild(makeBadge(formatTime(task.time)));
  if (task.repeat && task.repeat !== "none") meta.appendChild(makeBadge(repeatLabel(task.repeat)));
  meta.appendChild(makeBadge(task.priority.toUpperCase(), "badge-priority-" + task.priority));
  if (isOverdue(task)) meta.appendChild(makeBadge("OVERDUE", "badge-overdue"));

  body.appendChild(textEl);
  body.appendChild(meta);


  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "icon-btn edit";
  editBtn.type = "button";
  editBtn.title = "Edit task";
  editBtn.textContent = "✎";
  editBtn.addEventListener("click", () => enterEditMode(li, task));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "icon-btn delete";
  deleteBtn.type = "button";
  deleteBtn.title = "Delete task";
  deleteBtn.textContent = "✕";
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  li.appendChild(checkbox);
  li.appendChild(body);
  li.appendChild(actions);

  return li;
}

function makeBadge(text, extraClass) {
  const span = document.createElement("span");
  span.className = "badge" + (extraClass ? " " + extraClass : "");
  span.textContent = text;
  return span;
}

function enterEditMode(li, task) {
  const body = li.querySelector(".task-body");
  const textEl = body.querySelector(".task-text");

  const input = document.createElement("input");
  input.type = "text";
  input.className = "task-edit-input";
  input.value = task.text;
  input.maxLength = 120;

  body.replaceChild(input, textEl);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  function commit() {
    editTask(task.id, input.value);
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") render();
  });
  input.addEventListener("blur", commit);
}

function updateCounter() {
  const total = tasks.length;
  const active = tasks.filter((t) => !t.completed).length;
  counterTotalEl.textContent = total;
  counterActiveEl.textContent = active;
}

addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

taskInput.addEventListener("input", () => {
  taskInput.classList.remove("task-edit-input");
});

searchInput.addEventListener("input", (e) => {
  searchTerm = e.target.value;
  render();
});

filtersBar.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  [...filtersBar.querySelectorAll(".filter-btn")].forEach((b) =>
    b.classList.toggle("active", b === btn)
  );
  render();
});

setInterval(render, 30000);

render();


