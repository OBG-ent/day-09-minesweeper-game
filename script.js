/* =====================================================================
   Minesweeper — game logic
   Concepts practiced here:
   - 2D grids in JS (array of arrays of cell objects)
   - flood-fill reveal (a simple stack-based algorithm)
   - random mine placement AFTER the first click (so it never kills you)
   - Fisher–Yates shuffle for fair randomness
   - event delegation: one listener on the board instead of one per cell
   ===================================================================== */

const DIFFS = {
  beginner:     { rows: 9,  cols: 9,  mines: 10, label: "Beginner" },
  intermediate: { rows: 16, cols: 16, mines: 40, label: "Intermediate" },
  expert:       { rows: 16, cols: 30, mines: 99, label: "Expert" },
};
const BEST_KEY = "minesweeper-best-v1";

const boardEl    = document.getElementById("board");
const mineCountEl = document.getElementById("mine-count");
const timerEl    = document.getElementById("timer");
const resetBtn   = document.getElementById("reset");
const statusEl   = document.getElementById("status");
const flagModeBtn = document.getElementById("flag-mode");
const bestListEl = document.getElementById("best-list");

let diff = "beginner";
let grid = [];        // grid[r][c] = { mine, revealed, flagged, hit, wrongFlag, adjacent }
let cellEls = [];     // parallel 2D array of the <button> elements
let rows, cols, minesTotal;
let minesLeft, revealedCount;
let firstClick, gameOver, won;
let timerId = null, seconds = 0;
let flagMode = false;
let suppressClick = false; // set after a long-press flag so the tap doesn't also reveal

/* ---------------- setup ---------------- */

function newGame() {
  const cfg = DIFFS[diff];
  rows = cfg.rows; cols = cfg.cols; minesTotal = cfg.mines;
  minesLeft = minesTotal;
  revealedCount = 0;
  firstClick = true; gameOver = false; won = false;
  seconds = 0;
  stopTimer(); updateHud();
  statusEl.textContent = "";
  resetBtn.textContent = "🙂";
  setFlagMode(false);

  boardEl.style.gridTemplateColumns = "repeat(" + cols + ", var(--cell))";
  grid = [];
  cellEls = [];
  boardEl.innerHTML = "";

  for (let r = 0; r < rows; r++) {
    grid.push([]);
    cellEls.push([]);
    for (let c = 0; c < cols; c++) {
      grid[r].push({ mine: false, revealed: false, flagged: false,
                     hit: false, wrongFlag: false, adjacent: 0 });
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      btn.dataset.r = r; btn.dataset.c = c;
      btn.setAttribute("aria-label", "row " + (r + 1) + ", column " + (c + 1));
      boardEl.appendChild(btn);
      cellEls[r].push(btn);
    }
  }
  renderBest();
}

/* ---------------- mine placement ---------------- */

function neighbors(r, c) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
    }
  }
  return out;
}

// Mines are placed only after the first click, and the clicked cell is
// excluded — so the first click is guaranteed safe.
function placeMines(safeR, safeC) {
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!(r === safeR && c === safeC)) cells.push([r, c]);

  // Fisher–Yates shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (let i = 0; i < minesTotal; i++) {
    const [r, c] = cells[i];
    grid[r][c].mine = true;
  }

  // Precompute the hint number for every cell.
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      grid[r][c].adjacent =
        neighbors(r, c).filter(([nr, nc]) => grid[nr][nc].mine).length;
}

/* ---------------- actions ---------------- */

function reveal(r, c) {
  if (gameOver || won) return;
  const cell = grid[r][c];
  if (cell.revealed || cell.flagged) return;

  if (firstClick) {
    placeMines(r, c);
    firstClick = false;
    startTimer();
  }
  if (cell.mine) { lose(r, c); return; }

  // Flood fill: reveal this cell, and if it's a 0, keep spreading
  // to every neighbor (iterative stack, so big boards can't overflow).
  const stack = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    const cur = grid[cr][cc];
    if (cur.revealed || cur.flagged) continue;
    cur.revealed = true;
    revealedCount++;
    if (cur.adjacent === 0 && !cur.mine) {
      for (const [nr, nc] of neighbors(cr, cc))
        if (!grid[nr][nc].revealed) stack.push([nr, nc]);
    }
  }
  drawBoard();

  if (revealedCount === rows * cols - minesTotal) win();
}

function toggleFlag(r, c) {
  if (gameOver || won || firstClick) return;
  const cell = grid[r][c];
  if (cell.revealed) return;
  cell.flagged = !cell.flagged;
  minesLeft += cell.flagged ? -1 : 1;
  drawBoard();
  updateHud();
}

function win() {
  won = true;
  stopTimer();
  resetBtn.textContent = "😎";
  statusEl.textContent = "🎉 You cleared the field in " + seconds + "s!";
  // Flag the remaining mines for the classic victory look.
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c].mine) grid[r][c].flagged = true;
  minesLeft = 0;
  drawBoard();
  updateHud();
  saveBest();
}

function lose(hr, hc) {
  gameOver = true;
  stopTimer();
  grid[hr][hc].hit = true;
  resetBtn.textContent = "😵";
  statusEl.textContent = "💥 Boom! Hit the smiley for a new game.";
  // Reveal every mine; mark flags that were wrong.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell.mine && !cell.flagged) cell.revealed = true;
      if (!cell.mine && cell.flagged) cell.wrongFlag = true;
    }
  }
  drawBoard();
}

/* ---------------- rendering ---------------- */

function drawBoard() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      const el = cellEls[r][c];
      el.className = "cell";
      el.textContent = "";
      el.disabled = false;
      if (cell.revealed) {
        el.disabled = true;
        if (cell.mine) {
          el.classList.add("revealed");
          if (cell.hit) el.classList.add("mine-hit");
          el.textContent = "💣";
        } else {
          el.classList.add("revealed");
          if (cell.adjacent > 0) {
            el.textContent = cell.adjacent;
            el.classList.add("n" + cell.adjacent);
          }
        }
      } else if (cell.wrongFlag) {
        el.textContent = "❌";
      } else if (cell.flagged) {
        el.textContent = "🚩";
      }
    }
  }
}

function pad3(n) {
  return String(Math.max(-99, Math.min(999, n))).padStart(3, "0");
}

function updateHud() {
  mineCountEl.textContent = "💣 " + pad3(minesLeft);
  timerEl.textContent = "⏱ " + pad3(seconds);
}

/* ---------------- timer ---------------- */

function startTimer() {
  timerId = setInterval(() => {
    seconds = Math.min(seconds + 1, 999);
    updateHud();
  }, 1000);
}
function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

/* ---------------- best times ---------------- */

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY)) || {};
  } catch {
    return {};
  }
}
function saveBest() {
  const best = loadBest();
  if (best[diff] == null || seconds < best[diff]) {
    best[diff] = seconds;
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  }
}
function renderBest() {
  const best = loadBest();
  bestListEl.innerHTML = Object.entries(DIFFS)
    .map(([key, cfg]) => {
      const t = best[key];
      return `<li>${cfg.label} (${cfg.rows}×${cfg.cols}, ${cfg.mines} 💣): ` +
             (t != null ? `<b>${t}s</b>` : "—") + "</li>";
    })
    .join("");
}

/* ---------------- input wiring (event delegation) ---------------- */

function setFlagMode(on) {
  flagMode = on;
  flagModeBtn.textContent = "🚩 Flag mode: " + (on ? "on" : "off");
  flagModeBtn.classList.toggle("on", on);
}

boardEl.addEventListener("click", (e) => {
  if (suppressClick) { suppressClick = false; return; } // came from a long-press
  const btn = e.target.closest(".cell");
  if (!btn) return;
  const r = +btn.dataset.r, c = +btn.dataset.c;
  if (flagMode) toggleFlag(r, c); else reveal(r, c);
});

boardEl.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // keep the browser menu from popping up
  const btn = e.target.closest(".cell");
  if (!btn) return;
  toggleFlag(+btn.dataset.r, +btn.dataset.c);
});

// Long-press a cell on touch screens to flag it.
let pressTimer = null;
boardEl.addEventListener("touchstart", (e) => {
  const btn = e.target.closest(".cell");
  if (!btn) return;
  const r = +btn.dataset.r, c = +btn.dataset.c;
  pressTimer = setTimeout(() => {
    suppressClick = true;
    toggleFlag(r, c);
  }, 450);
}, { passive: true });
boardEl.addEventListener("touchend", () => {
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = null;
});

resetBtn.addEventListener("click", newGame);
flagModeBtn.addEventListener("click", () => setFlagMode(!flagMode));

document.getElementById("diff").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-diff]");
  if (!btn) return;
  diff = btn.dataset.diff;
  document.querySelectorAll("#diff button").forEach((b) =>
    b.classList.toggle("active", b === btn));
  newGame();
});

newGame();
