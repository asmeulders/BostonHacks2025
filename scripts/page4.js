// ---------- CLOSE BUTTON ----------
document.getElementById("closeBtn")?.addEventListener("click", () => {
    // Tell popup.js to close iframe and show grid
    parent.postMessage({ type: "closePanel" }, "*");
});

// ---------- CHROME STORAGE HELPERS ----------
function storageGet(key) {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get(key, (res) => {
                if (chrome.runtime?.lastError) return resolve(undefined);
                resolve(res?.[key]);
            });
        } catch {
            resolve(undefined);
        }
    });
}

function storageSet(obj) {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.set(obj, () => resolve());
        } catch {
            resolve();
        }
    });
}

// ---------- ELEMENTS ----------
const KEY = "tasks_page4";
const inputEl = document.getElementById("taskInput");
const addBtn  = document.getElementById("addBtn");
const listEl  = document.getElementById("list");
const emptyEl = document.getElementById("empty");

let tasks = [];

// ---------- LOAD & SAVE ----------
async function loadTasks() {
    const data = await storageGet(KEY);
    tasks = Array.isArray(data) ? data : [];
    render();
}

async function saveTasks() {
    await storageSet({ [KEY]: tasks });
    render();
}

// ---------- RENDER ----------
function render() {
    listEl.innerHTML = "";
    if (!tasks.length) {
        emptyEl.style.display = "block";
        return;
    }
    emptyEl.style.display = "none";

    tasks.forEach((task, i) => {
        const row = document.createElement("div");
        row.className = "item" + (task.done ? " done" : "");
        row.setAttribute("role", "listitem");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!task.done;
        cb.addEventListener("change", () => {
            tasks[i].done = cb.checked;
            saveTasks();
        });

        const label = document.createElement("div");
        label.className = "label";
        label.textContent = task.text;

        const del = document.createElement("button");
        del.className = "del-btn";
        del.type = "button";
        del.textContent = "Delete";
        del.addEventListener("click", () => {
            tasks.splice(i, 1);
            saveTasks();
        });

        row.appendChild(cb);
        row.appendChild(label);
        row.appendChild(del);
        listEl.appendChild(row);
    });
}

// ---------- ADD TASK ----------
function addTask() {
    const text = (inputEl.value || "").trim();
    if (!text) return;
    tasks.push({ text, done: false, ts: Date.now() });
    inputEl.value = "";
    saveTasks();
}

addBtn?.addEventListener("click", addTask);
inputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
});

// ---------- INIT ----------
loadTasks();
