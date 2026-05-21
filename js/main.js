/* ============================================================
   N8iV — shared site behaviour
   ============================================================ */

const TWEAKS_KEY = "n8iv_site_tweaks_v1";
const DEFAULT_TWEAKS = {
  accent:     "purple",
  display:    "anton",
  stat1Num:   "240+",
  stat1Label: "Attribution reports delivered",
  stat2Num:   "$48M",
  stat2Label: "Tracked revenue under management",
  stat3Num:   "42%",
  stat3Label: "Average CPA reduction",
  stat4Num:   "3.5x",
  stat4Label: "ROAS growth across cohort",
};

function readTweaks() {
  try {
    const raw = localStorage.getItem(TWEAKS_KEY);
    if (!raw) return { ...DEFAULT_TWEAKS };
    return { ...DEFAULT_TWEAKS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_TWEAKS }; }
}
function writeTweaks(t) {
  try { localStorage.setItem(TWEAKS_KEY, JSON.stringify(t)); } catch {}
}
function applyTweaks(t) {
  const root = document.documentElement;
  root.setAttribute("data-accent",  t.accent);
  root.setAttribute("data-display", t.display);
  document.querySelectorAll("[data-stat-num]").forEach(el => {
    const k = el.getAttribute("data-stat-num");
    if (t[k]) el.textContent = t[k];
  });
  document.querySelectorAll("[data-stat-label]").forEach(el => {
    const k = el.getAttribute("data-stat-label");
    if (t[k]) el.textContent = t[k];
  });
}

window.__applyInitialTweaks = function () {
  const t = readTweaks();
  document.documentElement.setAttribute("data-accent",  t.accent);
  document.documentElement.setAttribute("data-display", t.display);
};

window.addEventListener("DOMContentLoaded", () => {
  applyTweaks(readTweaks());

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px" });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  // Active nav link
  const path = location.pathname.split("/").pop().toLowerCase();
  document.querySelectorAll(".nav-links a").forEach(a => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href && href === path) a.classList.add("active");
  });

  // Custom cursor
  const cursor = document.createElement("div");
  cursor.className = "cursor";
  document.body.appendChild(cursor);
  let cx = 0, cy = 0, tx = 0, ty = 0;
  window.addEventListener("mousemove", e => { tx = e.clientX; ty = e.clientY; });
  (function loop() {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll("a, button, .service-row, .case, .circle-arrow").forEach(el => {
    el.addEventListener("mouseenter", () => cursor.classList.add("lg"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("lg"));
  });

  // Page intro wipe — once per page per session
  if (!sessionStorage.getItem("n8iv_intro_played_" + path)) {
    sessionStorage.setItem("n8iv_intro_played_" + path, "1");
    const intro = document.createElement("div");
    intro.className = "page-intro";
    const word = document.createElement("div");
    word.className = "word";
    word.textContent = document.body.getAttribute("data-page-name") || "N8iV";
    intro.appendChild(word);
    document.body.appendChild(intro);
    setTimeout(() => intro.remove(), 1000);
  }
});

// Tweaks API for the embedded React panel
window.__siteTweaks = {
  read:     readTweaks,
  write:    writeTweaks,
  apply:    applyTweaks,
  defaults: DEFAULT_TWEAKS,
};
