const WORKER_URL =
  "https://bgweb-snail-leaderboard.pedro-b54.workers.dev/leaderboard?count=20";

async function fetchLeaderboard() {
  const status = document.getElementById("leaderboard-status");
  const table = document.getElementById("leaderboard");
  const tbody = table.querySelector("tbody");

  try {
    status.textContent = "Loading leaderboard…";

    const res = await fetch(WORKER_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const entries = await res.json();
    console.log("ENTRIES RAW:", entries);

    if (!Array.isArray(entries)) {
      throw new Error("Worker did not return an array");
    }

    tbody.innerHTML = "";

    if (!entries.length) {
      status.textContent = "No entries yet.";
      return;
    }

    entries.forEach((entry, idx) => {
      const tr = document.createElement("tr");

      // Rank
      const rankCell = document.createElement("td");
      rankCell.textContent = entry.rank ?? idx + 1;

      // Player (avatar + name)
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

      // Score
      const scoreCell = document.createElement("td");
      scoreCell.textContent = entry.score ?? "0";

      tr.appendChild(rankCell);
      tr.appendChild(nameCell);
      tr.appendChild(scoreCell);
      tbody.appendChild(tr);
    });

    status.style.display = "none";
    table.style.display = "table";
  } catch (err) {
    console.error("Leaderboard fetch failed:", err);
    status.textContent = "Could not load leaderboard 😢";
  }
}

fetchLeaderboard();
