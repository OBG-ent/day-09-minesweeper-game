# 💣 Minesweeper

**The timeless classic, rebuilt from scratch in plain JavaScript.** Three difficulties, a guaranteed-safe first click, flag mode, and best-time tracking.

> Day 9 (featured build) of my daily coding journey — two projects a day, every day.

## ✨ Features

- 🎚️ **Three difficulties** — Beginner (9×9, 10 mines), Intermediate (16×16, 40), Expert (30×16, 99)
- 🛡️ **First click is always safe** — mines are placed *after* your first reveal, excluding that cell
- 🌊 **Flood-fill reveal** — click a `0` and the whole empty region opens up, just like the original
- 🚩 **Flagging** — right-click on desktop, Flag mode toggle, or long-press on mobile
- 💥 **Classic endgame** — mines explode on loss (wrong flags get ❌), auto-flag on victory
- ⏱️ **Live timer + mine counter** in retro red-on-black style
- 🏆 **Best times** per difficulty, saved in your browser
- 📱 **Touch-friendly** with smaller cells on narrow screens

## 👀 What you'll see

A dark page with the title *Minesweeper*, difficulty tabs (Beginner / Intermediate / Expert), and a
Flag-mode toggle. Below that, the classic HUD: a red digital mine counter, the 🙂 reset smiley,
and a timer — all framing a beveled gray board in true Windows-95 spirit. Numbers appear in the
traditional colors (blue 1s, green 2s, red 3s…), and a "Best times" card plus a How-to-play section
round out the page.

## ⚡ Run it in 30 seconds

No build tools, no dependencies — just open it:

```bash
# Option 1: double-click index.html
# Option 2: serve it locally
cd day-09-minesweeper-game
python3 -m http.server 8000
# then open http://localhost:8000
```

## 🧠 What I practiced (Day 9 — featured build)

- Modeling a game board as a 2D array of cell objects
- **Flood fill** — a stack-based region reveal algorithm (iterative, so big boards can't overflow)
- **Fisher–Yates shuffle** for fair, unbiased mine placement
- Guaranteeing a safe first click by deferring mine placement
- **Event delegation** — one listener on the board instead of hundreds per cell
- Touch input: long-press detection with click suppression
- Persisting best times with `localStorage`

## 🛠️ Tech

HTML · CSS · Vanilla JavaScript (zero libraries)
