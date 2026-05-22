const TOP_WORKER_URL =
  "https://snail-d1-website.pedro-b54.workers.dev/leaderboard";
const BOT_WORKER_URL =
  "https://snail-d1-website.pedro-b54.workers.dev/leaderboard_bottom";

const SEARCH_URL = "https://snail-d1-website.pedro-b54.workers.dev/search";
const RANK_URL = "https://snail-d1-website.pedro-b54.workers.dev/rank";
const RANKS_URL = "https://snail-d1-website.pedro-b54.workers.dev/ranks";

const PAGE_SIZE = 10;
// Must match LEADERBOARD_CAP in worker.js. Each leaderboard fetch
// returns up to CHUNK_SIZE rows; the client keeps them in a sparse
// buffer indexed by rank-1 and lazily fetches more chunks as the user
// paginates past the loaded set or jumps to a player whose rank is in
// an unloaded chunk.
const CHUNK_SIZE = 200;

// Status marker shown next to each leaderboard entry.
const EMOJI_DEAD = "☠️"; // Cemetery — final run is over
const EMOJI_ALIVE = "🐌"; // Living — snail still going

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

// Renders the rows for one page of one side. `entries` is a sparse
// array indexed by rank-1; only filled slots in [start, end) get drawn.
// If a slot is empty the row is just skipped (the caller should have
// called ensureChunkLoaded first, but a missed chunk just shows a gap
// rather than crashing).
function renderPage({
  entries,
  total,
  page,
  tbody,
  pageLabel,
  prevBtn,
  nextBtn,
  formatScore,
  isDead,
  highlightID,
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = clamp(page, 0, totalPages - 1);

  tbody.innerHTML = "";

  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);

  for (let i = start; i < end; i++) {
    const entry = entries[i];
    if (!entry) continue;

    const tr = document.createElement("tr");
    tr.dataset.steamId = entry.steamID ?? "";
    if (highlightID != null && entry.steamID === highlightID) {
      tr.classList.add("lb-row-highlight");
    }

    const rankCell = document.createElement("td");
    const rankEmoji = document.createElement("span");
    rankEmoji.className = "lb-status-emoji";
    rankEmoji.textContent = isDead ? EMOJI_DEAD : EMOJI_ALIVE;
    rankEmoji.title = isDead ? "Dead" : "Alive";
    rankCell.appendChild(rankEmoji);
    rankCell.appendChild(document.createTextNode(` ${i + 1}`));

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
  }

  pageLabel.textContent = `${start + 1}-${end} of ${total} (Page ${page + 1}/${totalPages})`;
  prevBtn.disabled = page === 0;
  nextBtn.disabled = page === totalPages - 1;

  return page;
}

const state = {
  // Sparse arrays — entries[rank - 1] = player. Holes are unloaded
  // ranks; ensureChunkLoaded fills them on demand.
  topEntries: [],
  botEntries: [],
  // Server-reported total for each side, captured from the initial
  // /leaderboard?offset=0 fetch. Drives "Page N of M" and end-of-list
  // detection.
  topTotal: 0,
  botTotal: 0,
  // Which CHUNK_SIZE-aligned offsets we've already fetched, so repeat
  // visits are free and we don't refetch on every pagination click.
  topLoaded: new Set(),
  botLoaded: new Set(),
  rankByID: new Map(), // steamID → rank, only for loaded entries
  active: "top", // "top" | "bot"
  page: 0,
  highlightID: null, // steamID of a searched player to flag in the table
};

// Dedup concurrent fetches for the same chunk (rapid Next clicks, or
// a search-click landing in a chunk we just started loading). Maps
// "side:offset" → in-flight Promise.
const inFlightChunks = new Map();

async function ensureChunkLoaded(side, offset) {
  const loaded = side === "top" ? state.topLoaded : state.botLoaded;
  if (loaded.has(offset)) return;

  const key = `${side}:${offset}`;
  const existing = inFlightChunks.get(key);
  if (existing) return existing;

  const baseUrl = side === "top" ? TOP_WORKER_URL : BOT_WORKER_URL;
  const promise = (async () => {
    const res = await fetch(`${baseUrl}?offset=${offset}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${baseUrl}?offset=${offset}`);
    const data = await res.json();
    const entries = data?.entries ?? [];

    const arr = side === "top" ? state.topEntries : state.botEntries;
    for (let i = 0; i < entries.length; i++) {
      arr[offset + i] = entries[i];
      state.rankByID.set(entries[i].steamID, offset + i + 1);
    }
    loaded.add(offset);
  })();

  inFlightChunks.set(key, promise);
  try {
    await promise;
  } finally {
    inFlightChunks.delete(key);
  }
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
// (Cemetery vs Living) as needed, and highlight their row. Rank
// resolution prefers (1) the value embedded in the /search payload —
// the common path, no extra round-trip; (2) state.rankByID if the
// player is already visible in a loaded chunk; (3) /rank as a last
// resort for callers that synthesize their own `p` without rank.
async function goToPlayer(p) {
  if (!p || !p.steamID) return;

  const target = p.isDead ? "top" : "bot";
  state.active = target;
  applyTabUI(target);

  let rank = p.rank ?? state.rankByID.get(p.steamID);

  if (!rank) {
    try {
      const res = await fetch(
        `${RANK_URL}?steamId=${encodeURIComponent(p.steamID)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.rank === "number") {
          rank = data.rank;
        }
      }
    } catch (err) {
      console.error("Rank lookup failed:", err);
    }
  }

  if (!rank) {
    // Search match but no leaderboard rank (e.g. alive with score ≥ 0,
    // or /rank returned null). Show the first page with no highlight.
    state.page = 0;
    state.highlightID = null;
    draw();
    return;
  }

  state.rankByID.set(p.steamID, rank);
  state.page = Math.floor((rank - 1) / PAGE_SIZE);
  state.highlightID = p.steamID;
  await draw(); // draw() awaits ensureChunkLoaded for state.page internally

  const row = document
    .getElementById("leaderboard")
    .querySelector(`tbody tr[data-steam-id="${CSS.escape(String(p.steamID))}"]`);
  if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
}

function getActiveConfig() {
  if (state.active === "top") {
    return {
      entries: state.topEntries,
      total: state.topTotal,
      side: "top",
      formatScore: formatTopScore,
      isDead: true,
    };
  }
  return {
    entries: state.botEntries,
    total: state.botTotal,
    side: "bot",
    formatScore: formatBotScore,
    isDead: false,
  };
}

async function draw() {
  const status = document.getElementById("leaderboard-status");
  const table = document.getElementById("leaderboard");
  const tbody = table.querySelector("tbody");

  const controls = document.getElementById("leaderboard-controls");
  const prevBtn = document.getElementById("leaderboard-prev");
  const nextBtn = document.getElementById("leaderboard-next");
  const pageLabel = document.getElementById("leaderboard-page-label");

  const { entries, total, side, formatScore, isDead } = getActiveConfig();

  if (!total) {
    status.style.display = "block";
    status.textContent = "No entries yet.";
    table.style.display = "none";
    controls.style.display = "none";
    return;
  }

  status.style.display = "none";
  table.style.display = "table";
  controls.style.display = "flex";

  // Make sure the chunk for the current page is loaded before drawing.
  // The previous page stays visible during the fetch (we don't clear
  // tbody until renderPage runs), which is preferable to flashing
  // empty rows. If the chunk isn't loaded yet, show a brief loading
  // hint in the page label so search-jumps to far-away ranks feel
  // responsive instead of "did nothing happen?"
  const start = state.page * PAGE_SIZE;
  const chunkOffset = Math.floor(start / CHUNK_SIZE) * CHUNK_SIZE;
  const loadedSet = side === "top" ? state.topLoaded : state.botLoaded;
  if (!loadedSet.has(chunkOffset)) {
    pageLabel.textContent = `Loading rank ${start + 1}…`;
  }
  try {
    await ensureChunkLoaded(side, chunkOffset);
  } catch (err) {
    console.error("Chunk load failed:", err);
    // Fall through and render whatever's loaded; if nothing's loaded
    // for this page the row will just be empty.
  }

  state.page = renderPage({
    entries,
    total,
    page: state.page,
    tbody,
    pageLabel,
    prevBtn,
    nextBtn,
    formatScore,
    isDead,
    highlightID: state.highlightID,
  });
}

// The Steam widget is a fixed 646×190 design shrunk via transform:
// scale(). Pick the scale that makes its box exactly fill the
// available column width, clamped so it never exceeds the desktop
// size (0.75) — so desktop renders identically and only mobile
// shrinks to fit the gutter.
function sizeSteamWidget() {
  const widget = document.querySelector(".steam-widget");
  if (!widget) return;

  const container = widget.closest("main") || widget.parentElement;
  if (!container) return;

  const cs = getComputedStyle(container);
  const avail =
    container.clientWidth -
    parseFloat(cs.paddingLeft || "0") -
    parseFloat(cs.paddingRight || "0");

  // The card fills `avail`; its inner area is avail - 24 (10px
  // padding ×2 + 2px border ×2). Size the widget ~2px under that so
  // sub-pixel rounding can never clip an edge — the whole widget
  // always shows — while staying inside the column (no h-scroll).
  let scale = (avail - 24 - 2) / 646;
  scale = Math.max(0.3, Math.min(0.75, scale));
  widget.style.setProperty("--scale", String(scale));
}

async function init() {
  const status = document.getElementById("leaderboard-status");
  status.textContent = "Loading leaderboard…";

  sizeSteamWidget();
  let steamResizeRaf = null;
  window.addEventListener("resize", () => {
    if (steamResizeRaf) cancelAnimationFrame(steamResizeRaf);
    steamResizeRaf = requestAnimationFrame(sizeSteamWidget);
  });

  // hook up tab clicks
  document
    .getElementById("tab-top")
    .addEventListener("click", () => setActiveTab("top"));
  document
    .getElementById("tab-bot")
    .addEventListener("click", () => setActiveTab("bot"));

  // hook up pagination buttons. draw() is async but we deliberately
  // don't await it here — the click handler fires-and-forgets, and any
  // chunk fetch errors are logged inside draw().
  document.getElementById("leaderboard-prev").addEventListener("click", () => {
    state.page -= 1;
    draw();
  });
  document.getElementById("leaderboard-next").addEventListener("click", () => {
    state.page += 1;
    draw();
  });

  try {
    // First fetch of each side: returns { entries, total }. We seed
    // the sparse buffers from these chunks and trust the server's
    // total for "Page N of M" — totals refresh organically as the
    // edge cache expires.
    const [topRes, botRes] = await Promise.all([
      fetch(`${TOP_WORKER_URL}?offset=0`).then((r) => r.json()),
      fetch(`${BOT_WORKER_URL}?offset=0`).then((r) => r.json()),
    ]);

    const topEntries = topRes?.entries ?? [];
    const botEntries = botRes?.entries ?? [];
    topEntries.forEach((e, i) => {
      state.topEntries[i] = e;
      state.rankByID.set(e.steamID, i + 1);
    });
    botEntries.forEach((e, i) => {
      state.botEntries[i] = e;
      state.rankByID.set(e.steamID, i + 1);
    });
    state.topTotal = topRes?.total ?? topEntries.length;
    state.botTotal = botRes?.total ?? botEntries.length;
    state.topLoaded.add(0);
    state.botLoaded.add(0);

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

  // Initial render: instant. Rank starts as either a cached value
  // from a loaded chunk (or a previous /ranks/rank call) or "—". The
  // dropdown appears immediately, then fillSearchRanks fires below
  // to fetch any unknowns in the background and patch the chips in
  // place.
  items.forEach((p) => {
    const li = document.createElement("li");
    li.className = "lb-result-item";
    li.tabIndex = 0;
    li.setAttribute("role", "option");
    li.dataset.steamId = p.steamID ?? "";
    const choose = () => selectResult(p, input, list);
    li.addEventListener("click", choose);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose();
      }
    });

    const cachedRank = state.rankByID.get(p.steamID);
    const emoji = p.isDead ? EMOJI_DEAD : EMOJI_ALIVE;
    const rankEl = document.createElement("span");
    rankEl.className = "lb-result-rank";
    rankEl.textContent = cachedRank ? `${emoji} #${cachedRank}` : `${emoji} —`;
    rankEl.title = p.isDead ? "Dead" : "Alive";
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

  // Unhide the populated list. Earlier `input` events with q<2 set
  // hidden=true to clear the dropdown while the user is mid-type, so
  // we have to explicitly reopen it on every successful render —
  // otherwise the list is fully populated but invisible until something
  // else triggers a re-show (refocus, etc.).
  list.hidden = false;

  // Fire-and-forget: resolve ranks for any results we don't already
  // know about, then patch the rank chips in-place. Off the typing
  // critical path so a slow rank computation can't hide the dropdown.
  fillSearchRanks(items, list);
}

// Lookup table of player isDead state for the current search render,
// so we can pick the right emoji when patching rank chips later.
async function fillSearchRanks(items, list) {
  const missing = items
    .map((p) => p.steamID)
    .filter((id) => id && !state.rankByID.has(id));
  if (missing.length === 0) return;

  let ranks;
  try {
    const res = await fetch(
      `${RANKS_URL}?steamIds=${missing.map(encodeURIComponent).join(",")}`,
    );
    if (!res.ok) return;
    ranks = await res.json();
  } catch (err) {
    console.error("Batched rank lookup failed:", err);
    return;
  }
  if (!Array.isArray(ranks)) return;

  // Stash so subsequent searches / clicks are free.
  for (const r of ranks) {
    if (r && r.steamID && typeof r.rank === "number") {
      state.rankByID.set(r.steamID, r.rank);
    }
  }

  // Patch the chips for whichever results are still rendered in the
  // dropdown. If the user has typed more characters and the list has
  // since rerendered with different items, the data-steam-id query
  // simply misses and we no-op.
  const isDeadById = new Map(items.map((p) => [p.steamID, !!p.isDead]));
  for (const r of ranks) {
    if (!r || typeof r.rank !== "number") continue;
    const li = list.querySelector(
      `li[data-steam-id="${CSS.escape(String(r.steamID))}"]`,
    );
    if (!li) continue;
    const chip = li.querySelector(".lb-result-rank");
    if (!chip) continue;
    const emoji = isDeadById.get(r.steamID) ? EMOJI_DEAD : EMOJI_ALIVE;
    chip.textContent = `${emoji} #${r.rank}`;
  }
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

    // 120ms debounce balances typing burst protection against
    // perceived responsiveness — 250ms felt sluggish in testing.
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
    }, 120);
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
