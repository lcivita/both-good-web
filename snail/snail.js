const TOP_WORKER_URL =
  "https://bgweb-snail-leaderboard.pedro-b54.workers.dev/leaderboard?count=50";
const BOT_WORKER_URL =
  "https://bgweb-snail-leaderboard.pedro-b54.workers.dev/leaderboard_bottom?count=50";

const PAGE_SIZE = 10;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTopScore(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));

  const YEAR = 31536000;
  const DAY = 86400;
  const HOUR = 3600;
  const MIN = 60;

  const years = Math.floor(s / YEAR);
  const days = Math.floor((s % YEAR) / DAY);
  const hours = Math.floor((s % DAY) / HOUR);
  const minutes = Math.floor((s % HOUR) / MIN);
  const secs = s % MIN;

  if (years === 0) {
    return `${days}:${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`;
  }

  return `${years}:${String(days).padStart(3, "0")}:${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`;
}

function formatBotScore(seconds) {
  const s = Math.abs(Math.floor(Number(seconds) || 0));

  const minute = 60;
  const hour = 3600;
  const day = 86400;
  const year = 31536000;

  if (s < minute) return `≈${Math.round(s)}s`;
  if (s < hour) return `≈${Math.round(s / minute)}min`;
  if (s < day) return `≈${Math.round(s / hour)}hrs`;
  if (s < year) return `≈${Math.round(s / day)}d`;
  return `≈${Math.round(s / year)}yrs`;
}

function renderPage({ entries, page, tbody, pageLabel, prevBtn, nextBtn, formatScore }) {
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  page = clamp(page, 0, totalPages - 1);

  tbody.innerHTML = "";

  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, entries.length);
  const slice = entries.slice(start, end);

  slice.forEach((entry, idx) => {
    const tr = document.createElement("tr");

    const rankCell = document.createElement("td");
    rankCell.textContent = start + idx + 1;

    const nameCell = document.createElement("td");

    if (entry.avatar) {
      const avatar = document.createElement("img");
      avatar.src = entry.avatar;
      avatar.alt = entry.personaName || "Player avatar";
      avatar.width = 32;
      avatar.height = 32;
      avatar.style.borderRadius = "50%";
      avatar.style.verticalAlign = "middle";
      avatar.style.marginRight = "8px";
      nameCell.appendChild(avatar);
    }

    const nameSpan = document.createElement("span");
    nameSpan.textContent = entry.personaName || entry.steamID || "Unknown";
    nameCell.appendChild(nameSpan);

    const scoreCell = document.createElement("td");
    scoreCell.textContent = formatScore ? formatScore(entry.score ?? 0, entry) : String(entry.score ?? 0);

    tr.appendChild(rankCell);
    tr.appendChild(nameCell);
    tr.appendChild(scoreCell);
    tbody.appendChild(tr);
  });

  pageLabel.textContent = `${start + 1}-${end} of ${entries.length} (Page ${page + 1}/${totalPages})`;
  prevBtn.disabled = page === 0;
  nextBtn.disabled = page === totalPages - 1;

  return page;
}

async function fetchJsonArray(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const entries = await res.json();
  if (!Array.isArray(entries)) throw new Error(`Worker did not return an array for ${url}`);
  return entries;
}

// ----- TABBED LEADERBOARD STATE -----

const state = {
  topEntries: [],
  botEntries: [],
  active: "top", // "top" | "bot"
  page: 0,
};

function setActiveTab(active) {
  state.active = active;
  state.page = 0;

  const tabTop = document.getElementById("tab-top");
  const tabBot = document.getElementById("tab-bot");

  tabTop.classList.toggle("active", active === "top");
  tabBot.classList.toggle("active", active === "bot");
  tabTop.setAttribute("aria-selected", active === "top");
  tabBot.setAttribute("aria-selected", active === "bot");

  draw();
}

function getActiveConfig() {
  if (state.active === "top") {
    return { entries: state.topEntries, formatScore: formatTopScore };
  }
  return { entries: state.botEntries, formatScore: formatBotScore };
}

function draw() {
  const status = document.getElementById("leaderboard-status");
  const table = document.getElementById("leaderboard");
  const tbody = table.querySelector("tbody");

  const controls = document.getElementById("leaderboard-controls");
  const prevBtn = document.getElementById("leaderboard-prev");
  const nextBtn = document.getElementById("leaderboard-next");
  const pageLabel = document.getElementById("leaderboard-page-label");

  const { entries, formatScore } = getActiveConfig();

  if (!entries || entries.length === 0) {
    status.style.display = "block";
    status.textContent = "No entries yet.";
    table.style.display = "none";
    controls.style.display = "none";
    return;
  }

  status.style.display = "none";
  table.style.display = "table";
  controls.style.display = "flex";

  state.page = renderPage({
    entries,
    page: state.page,
    tbody,
    pageLabel,
    prevBtn,
    nextBtn,
    formatScore,
  });
}

async function init() {
  const status = document.getElementById("leaderboard-status");
  status.textContent = "Loading leaderboard…";

  // Hook up tab clicks
  document.getElementById("tab-top").addEventListener("click", () => setActiveTab("top"));
  document.getElementById("tab-bot").addEventListener("click", () => setActiveTab("bot"));

  // Hook up pagination buttons (shared)
  document.getElementById("leaderboard-prev").addEventListener("click", () => {
    state.page -= 1;
    draw();
  });
  document.getElementById("leaderboard-next").addEventListener("click", () => {
    state.page += 1;
    draw();
  });

  try {
    const [topRaw, botRaw] = await Promise.all([
      fetchJsonArray(TOP_WORKER_URL),
      fetchJsonArray(BOT_WORKER_URL),
    ]);

    // TOP: keep score > 0
    const topEntries = topRaw.filter(e => (e?.score ?? 0) > 0);

    // BOT: keep score <= 0, reverse so "last place is #1"
    const botEntries = botRaw
      .filter(e => (e?.score ?? 0) <= 0)
      .reverse();

    state.topEntries = topEntries;
    state.botEntries = botEntries;

    // default view
    setActiveTab("top");
  } catch (err) {
    console.error("Leaderboard init failed:", err);
    status.textContent = "Could not load leaderboard…";
  }
}

document.addEventListener("DOMContentLoaded", init);
