const TOP_WORKER_URL =
  "https://snail-d1-website.pedro-b54.workers.dev/leaderboard";
const BOT_WORKER_URL =
  "https://snail-d1-website.pedro-b54.workers.dev/leaderboard_bottom";

const SEARCH_URL = "https://snail-d1-website.pedro-b54.workers.dev/search";

const PAGE_SIZE = 10;

// Shown when a player has no Steam avatar (e.g. cron backfill hasn't
// reached them yet, or Steam returned no avatar). Each avatar-less
// player is assigned one of these deterministically from their
// steamID, so the same player always shows the same snail.
const DEFAULT_AVATARS = [
  "/snail/SnailProfiles/purpleSnail.png",
  "/snail/SnailProfiles/Snail_EmailIcon.png",
  "/snail/SnailProfiles/Snail_EmailIcon2.png",
  "/snail/SnailProfiles/Snail_EmailIcon4.png",
];

// Stable DJB2 hash of the seed → an index into DEFAULT_AVATARS.
// Deterministic so a player's snail never changes across pagination,
// tab switches, or re-searches.
function pickDefaultAvatar(seed) {
  const key = String(seed ?? "");
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  }
  return DEFAULT_AVATARS[Math.abs(h) % DEFAULT_AVATARS.length];
}

// Steam serves these generic silhouettes to players who never set an
// avatar. Steam still returns a (non-empty) URL for them, so treat
// these like "no avatar" and show the snail instead. Match on the
// image hash only — the steamstatic CDN domain and the size suffix
// (_medium / _full) both change over time.
const STEAM_DEFAULT_AVATAR_HASHES = [
  "fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb",
];

function avatarSrc(url, seed) {
  if (!url || STEAM_DEFAULT_AVATAR_HASHES.some((h) => url.includes(h))) {
    return pickDefaultAvatar(seed);
  }
  return url;
}

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

  const format = (value, singular, plural) =>
    `≈${value}${value === 1 ? singular : plural}`;

  if (s < minute) {
    const v = Math.round(s);
    return format(v, "s", "s"); // seconds can stay "s"
  }

  if (s < hour) {
    const v = Math.round(s / minute);
    return format(v, "min", "min");
  }

  if (s < day) {
    const v = Math.round(s / hour);
    return format(v, "hr", "hrs");
  }

  if (s < year) {
    const v = Math.round(s / day);
    return format(v, "d", "d");
  }

  const v = Math.round(s / year);
  return format(v, "yr", "yrs");
}

function renderPage({
  entries,
  page,
  tbody,
  pageLabel,
  prevBtn,
  nextBtn,
  formatScore,
  highlightID,
}) {
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  page = clamp(page, 0, totalPages - 1);

  tbody.innerHTML = "";

  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, entries.length);
  const slice = entries.slice(start, end);

  slice.forEach((entry, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.steamId = entry.steamID ?? "";
    if (highlightID != null && entry.steamID === highlightID) {
      tr.classList.add("lb-row-highlight");
    }

    const rankCell = document.createElement("td");
    rankCell.textContent = start + idx + 1;

    const nameCell = document.createElement("td");

    const avatar = document.createElement("img");
    avatar.src = avatarSrc(entry.avatar, entry.steamID);
    avatar.alt = entry.personaName || "Player avatar";
    avatar.width = 32;
    avatar.height = 32;
    avatar.style.borderRadius = "50%";
    avatar.style.verticalAlign = "middle";
    avatar.style.marginRight = "8px";
    nameCell.appendChild(avatar);

    const nameSpan = document.createElement("span");
    nameSpan.textContent = entry.personaName || entry.steamID || "Unknown";
    nameCell.appendChild(nameSpan);

    const scoreCell = document.createElement("td");
    scoreCell.textContent = formatScore
      ? formatScore(entry.score ?? 0, entry)
      : String(entry.score ?? 0);

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
  if (!Array.isArray(entries))
    throw new Error(`Worker did not return an array for ${url}`);
  return entries;
}

const state = {
  topEntries: [],
  botEntries: [],
  rankByID: new Map(), // steamID → rank within its leaderboard
  active: "top", // "top" | "bot"
  page: 0,
  highlightID: null, // steamID of a searched player to flag in the table
};

function rebuildRankMap() {
  state.rankByID.clear();
  state.topEntries.forEach((e, i) => state.rankByID.set(e.steamID, i + 1));
  state.botEntries.forEach((e, i) => state.rankByID.set(e.steamID, i + 1));
}

function applyTabUI(active) {
  const tabTop = document.getElementById("tab-top");
  const tabBot = document.getElementById("tab-bot");

  tabTop.classList.toggle("active", active === "top");
  tabBot.classList.toggle("active", active === "bot");
  tabTop.setAttribute("aria-selected", active === "top");
  tabBot.setAttribute("aria-selected", active === "bot");
}

// Manual tab click: reset to the first page and drop any search highlight.
function setActiveTab(active) {
  state.active = active;
  state.page = 0;
  state.highlightID = null;
  applyTabUI(active);
  draw();
}

// Jump straight to the page a searched player is on, switching tabs
// (Cemetery vs Living) as needed, and highlight their row.
function goToPlayer(p) {
  if (!p || !p.steamID) return;

  const target = p.isDead ? "top" : "bot";
  const entries = target === "top" ? state.topEntries : state.botEntries;
  const idx = entries.findIndex((e) => e.steamID === p.steamID);

  state.active = target;
  applyTabUI(target);

  if (idx === -1) {
    // Matched by search but not on the rendered board (e.g. a dead
    // player whose score is <= 0, filtered out of the Cemetery).
    state.page = 0;
    state.highlightID = null;
    draw();
    return;
  }

  state.page = Math.floor(idx / PAGE_SIZE);
  state.highlightID = p.steamID;
  draw();

  const row = document
    .getElementById("leaderboard")
    .querySelector(`tbody tr[data-steam-id="${CSS.escape(String(p.steamID))}"]`);
  if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
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
    highlightID: state.highlightID,
  });
}

async function init() {
  const status = document.getElementById("leaderboard-status");
  status.textContent = "Loading leaderboard…";

  // hook up tab clicks
  document
    .getElementById("tab-top")
    .addEventListener("click", () => setActiveTab("top"));
  document
    .getElementById("tab-bot")
    .addEventListener("click", () => setActiveTab("bot"));

  // hook up pagination buttons
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
    const topEntries = topRaw.filter((e) => (e?.score ?? 0) > 0);

    // BOT: keep score <= 0 (most-negative = longest alive = #1)
    const botEntries = botRaw.filter((e) => (e?.score ?? 0) <= 0);

    state.topEntries = topEntries;
    state.botEntries = botEntries;
    rebuildRankMap();

    // default view
    setActiveTab("top");
  } catch (err) {
    console.error("Leaderboard init failed:", err);
    status.textContent = "Could not load leaderboard…";
  }

  setupSearch();
}

document.addEventListener("DOMContentLoaded", init);

// GPT AAAAAAAAAAAAAAH SEARCH_URL
function renderSearchResults(items, list, input) {
  list.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "lb-result-none";
    empty.textContent = "No players found.";
    list.appendChild(empty);
    list.hidden = false;
    return;
  }

  items.forEach((p) => {
    const li = document.createElement("li");
    li.className = "lb-result-item";
    li.tabIndex = 0;
    li.setAttribute("role", "option");
    const choose = () => selectResult(p, input, list);
    li.addEventListener("click", choose);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose();
      }
    });

    const rank = state.rankByID.get(p.steamID);
    const rankEl = document.createElement("span");
    rankEl.className = "lb-result-rank";
    rankEl.textContent = rank ? `#${rank}` : "—";
    li.appendChild(rankEl);

    const img = document.createElement("img");
    img.src = avatarSrc(p.avatar, p.steamID);
    img.alt = "";
    li.appendChild(img);

    const name = document.createElement("span");
    name.className = "lb-result-name";
    name.textContent = p.personaName || p.steamID || "Unknown";
    li.appendChild(name);

    const score = document.createElement("span");
    score.className = "lb-result-score";
    score.textContent = p.isDead
      ? formatTopScore(p.score)
      : formatBotScore(p.score);
    li.appendChild(score);

    list.appendChild(li);
  });

  list.hidden = false;
}

// A search result was clicked / activated: close the dropdown, reflect
// the chosen name in the box, and jump to that player on the board.
function selectResult(p, input, list) {
  if (list) list.hidden = true;
  if (input) input.value = p.personaName || p.steamID || "";
  goToPlayer(p);
}

function setupSearch() {
  const input = document.getElementById("lb-search");
  const list = document.getElementById("lb-search-results");
  if (!input || !list) return;

  list.setAttribute("role", "listbox");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-controls", "lb-search-results");
  input.setAttribute("aria-autocomplete", "list");

  let debounceTimer = null;
  let inFlightToken = null;

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 2) {
      list.hidden = true;
      return;
    }

    debounceTimer = setTimeout(async () => {
      const myToken = (inFlightToken = Symbol("search"));
      try {
        const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(q)}`);
        if (inFlightToken !== myToken) return; // stale
        if (!res.ok) {
          list.hidden = true;
          return;
        }
        const items = await res.json();
        if (inFlightToken !== myToken) return; // stale
        renderSearchResults(items, list, input);
      } catch (err) {
        console.error("Search failed:", err);
        list.hidden = true;
      }
    }, 250);
  });

  // Click outside → close
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.hidden = true;
    }
  });

  // Escape → clear + close. Arrow keys → move through results.
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      list.hidden = true;
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const opts = list.querySelectorAll(".lb-result-item");
      if (list.hidden || opts.length === 0) return;
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      let i = Array.prototype.indexOf.call(opts, document.activeElement);
      i = (i + dir + opts.length) % opts.length;
      opts[i].focus();
    }
  });

  // Arrow keys while a result is focused: keep moving through the list.
  list.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const opts = list.querySelectorAll(".lb-result-item");
    if (opts.length === 0) return;
    e.preventDefault();
    const dir = e.key === "ArrowDown" ? 1 : -1;
    let i = Array.prototype.indexOf.call(opts, document.activeElement);
    if (i === -1) {
      opts[0].focus();
      return;
    }
    i = (i + dir + opts.length) % opts.length;
    opts[i].focus();
  });

  // Refocus → reopen if still has results
  input.addEventListener("focus", () => {
    if (list.children.length > 0 && input.value.trim().length >= 2) {
      list.hidden = false;
    }
  });
}
