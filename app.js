// ---- Clips --------------------------------------------------------------
// Placeholders. Replace `src` with real hosted audio once ragas are locked in.
// `melakarta`, `raga`, `phrase` are stored as metadata for analysis, never shown.

const CLIPS = [
  { id: "clip1", src: "audio/placeholder_clip1.wav", melakarta: "kharaharapriya", raga: "ragaA", phrase: "p1" },
  { id: "clip2", src: "audio/placeholder_clip2.wav", melakarta: "kharaharapriya", raga: "ragaB", phrase: "p1" },
  { id: "clip3", src: "audio/placeholder_clip3.wav", melakarta: "kharaharapriya", raga: "ragaA", phrase: "p2" },
  { id: "clip4", src: "audio/placeholder_clip4.wav", melakarta: "kharaharapriya", raga: "ragaB", phrase: "p2" },
];

const FAMILIARISATION_SRC = "audio/familiarisation.wav";
const LISTEN_THRESHOLD = 0.75; // fraction of a clip that must play before Continue/Next appears

// ---- State --------------------------------------------------------------
// Steps: 0 = background question, 1 = familiarisation, 2..(1+N) = clip i-2.

const state = {
  respondentId: crypto.randomUUID(),
  demoAnswer: null,
  famListened: false,
  clipOrder: shuffle([...CLIPS]),
  clipListened: CLIPS.map(() => false),
  clipAnswers: CLIPS.map(() => ({})), // {valence, arousal, free_text} per clip, by presentation order
  responses: [],
  currentStep: -1,
  maxStep: -1,
};

const TOTAL_STEPS = 2 + CLIPS.length; // demo, fam, one per clip

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Progress bar + step indicator ----------------------------------------

function setProgress(step) {
  const pct = Math.min(100, Math.max(0, Math.round((step / TOTAL_STEPS) * 100)));
  document.getElementById("progress-fill").style.width = pct + "%";
}

const stepIndicator = document.getElementById("step-indicator");
const stepCurrentEl = document.getElementById("step-current");
const stepTotalEl = document.getElementById("step-total");
stepTotalEl.textContent = TOTAL_STEPS;

function updateStepIndicator(step) {
  stepIndicator.classList.remove("hidden");
  stepCurrentEl.textContent = step + 1;
  stepIndicator.classList.remove("bump");
  void stepIndicator.offsetWidth; // restart animation
  stepIndicator.classList.add("bump");
}

function hideStepChrome() {
  stepIndicator.classList.add("hidden");
  bottomNav.classList.add("hidden");
}

// ---- Bottom nav (back / forward through answered steps) -------------------

const bottomNav = document.getElementById("bottom-nav");
const navBack = document.getElementById("nav-back");
const navForward = document.getElementById("nav-forward");

function updateBottomNav(step) {
  bottomNav.classList.remove("hidden");
  navBack.disabled = step <= 0;
  navForward.disabled = step >= state.maxStep;
}

navBack.addEventListener("click", () => {
  if (state.currentStep > 0) goToStep(state.currentStep - 1, { validate: false });
});
navForward.addEventListener("click", () => {
  if (state.currentStep < state.maxStep) goToStep(state.currentStep + 1, { validate: false });
});

function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  window.scrollTo(0, 0);
}

// ---- Step router ------------------------------------------------------------

function goToStep(step, { validate = true } = {}) {
  if (validate && step > state.maxStep + 1) return;
  state.currentStep = step;
  state.maxStep = Math.max(state.maxStep, step);
  renderStep(step);
}

function renderStep(step) {
  updateStepIndicator(step);
  updateBottomNav(step);
  setProgress(step);
  if (step === 0) renderDemo();
  else if (step === 1) renderFam();
  else renderClip(step - 2);
}

// ---- Reusable audio player ------------------------------------------------

function makePlayer({ playBtn, seekFill, timeEl, replayBtn, onEnded, onThreshold, thresholdPct = LISTEN_THRESHOLD }) {
  const audio = new Audio();
  audio.preload = "metadata";
  let thresholdFired = false;

  function fmt(s) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  playBtn.addEventListener("click", () => {
    if (audio.paused) audio.play(); else audio.pause();
  });
  audio.addEventListener("play", () => playBtn.classList.add("playing"));
  audio.addEventListener("pause", () => playBtn.classList.remove("playing"));
  audio.addEventListener("timeupdate", () => {
    const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
    seekFill.style.width = (ratio * 100) + "%";
    timeEl.textContent = fmt(audio.currentTime);
    if (!thresholdFired && ratio >= thresholdPct) {
      thresholdFired = true;
      if (onThreshold) onThreshold();
    }
  });
  audio.addEventListener("ended", () => {
    playBtn.classList.remove("playing");
    if (onEnded) onEnded();
  });

  // click-to-seek
  seekFill.parentElement.addEventListener("click", (e) => {
    const r = seekFill.parentElement.getBoundingClientRect();
    const ratio = (e.clientX - r.left) / r.width;
    if (audio.duration) audio.currentTime = ratio * audio.duration;
  });

  if (replayBtn) replayBtn.addEventListener("click", () => {
    audio.currentTime = 0;
    audio.play();
  });

  return {
    load(src) {
      audio.pause();
      audio.src = src;
      audio.currentTime = 0;
      thresholdFired = false;
      seekFill.style.width = "0%";
      timeEl.textContent = "0:00";
    },
    stop() { audio.pause(); },
  };
}

function setButtonRevealed(btn, revealed) {
  btn.classList.toggle("show", revealed);
  btn.disabled = !revealed;
}

// ---- Consent --------------------------------------------------------------

document.getElementById("btn-start").addEventListener("click", () => {
  goToStep(0);
});

// ---- Background (one tap advances) ----------------------------------------

document.querySelectorAll("#training-choices .choice").forEach(btn => {
  btn.addEventListener("click", () => {
    state.demoAnswer = btn.dataset.value;
    document.querySelectorAll("#training-choices .choice").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    goToStep(1);
  });
});

function renderDemo() {
  show("screen-demo");
  document.querySelectorAll("#training-choices .choice").forEach(b => {
    b.classList.toggle("selected", b.dataset.value === state.demoAnswer);
  });
}

// ---- Familiarisation ------------------------------------------------------

const famNext = document.getElementById("btn-fam-next");
const famPlayer = makePlayer({
  playBtn: document.getElementById("fam-play"),
  seekFill: document.getElementById("fam-seek"),
  timeEl: document.getElementById("fam-time"),
  replayBtn: null,
  onThreshold: () => {
    state.famListened = true;
    setButtonRevealed(famNext, true);
  },
});

function renderFam() {
  show("screen-fam");
  famPlayer.load(FAMILIARISATION_SRC);
  setButtonRevealed(famNext, state.famListened);
}

famNext.addEventListener("click", () => {
  famPlayer.stop();
  goToStep(2);
});

// ---- Clips ----------------------------------------------------------------

const nextBtn = document.getElementById("btn-next-clip");
const freeText = document.getElementById("free-text");

const clipPlayer = makePlayer({
  playBtn: document.getElementById("clip-play"),
  seekFill: document.getElementById("clip-seek"),
  timeEl: document.getElementById("clip-time"),
  replayBtn: document.getElementById("clip-replay"),
  onThreshold: () => {
    const idx = state.currentStep - 2;
    state.clipListened[idx] = true;
    updateClipNextButton(idx);
  },
});

function selectDot(name, value) {
  const sam = document.querySelector(`.sam[data-name="${name}"]`);
  sam.querySelectorAll(".dot").forEach(d => d.classList.toggle("selected", d.dataset.v === String(value)));
}

document.querySelectorAll(".sam").forEach(sam => {
  const name = sam.dataset.name;
  sam.querySelectorAll(".dot").forEach(dot => {
    dot.addEventListener("click", () => {
      const idx = state.currentStep - 2;
      sam.querySelectorAll(".dot").forEach(d => d.classList.remove("selected"));
      dot.classList.add("selected");
      state.clipAnswers[idx][name] = dot.dataset.v;
      updateClipNextButton(idx);
    });
  });
});
freeText.addEventListener("input", () => {
  const idx = state.currentStep - 2;
  state.clipAnswers[idx].free_text = freeText.value;
});

function updateClipNextButton(idx) {
  const revealed = !!state.clipListened[idx];
  const answers = state.clipAnswers[idx];
  nextBtn.classList.toggle("show", revealed);
  nextBtn.disabled = !(revealed && answers.valence && answers.arousal);
}

function renderClip(idx) {
  const clip = state.clipOrder[idx];
  clipPlayer.load(clip.src);
  const saved = state.clipAnswers[idx];
  document.querySelectorAll(".sam .dot").forEach(d => d.classList.remove("selected"));
  if (saved.valence) selectDot("valence", saved.valence);
  if (saved.arousal) selectDot("arousal", saved.arousal);
  freeText.value = saved.free_text || "";
  updateClipNextButton(idx);
  show("screen-clip");
}

nextBtn.addEventListener("click", () => {
  clipPlayer.stop();
  const idx = state.currentStep - 2;
  if (idx < state.clipOrder.length - 1) {
    goToStep(state.currentStep + 1);
  } else {
    finish();
  }
});

// ---- Done -----------------------------------------------------------------

function buildResponses() {
  return state.clipOrder.map((clip, idx) => {
    const r = state.clipAnswers[idx] || {};
    return {
      respondent_id: state.respondentId,
      training_background: state.demoAnswer,
      clip_id: clip.id,
      melakarta: clip.melakarta,
      raga: clip.raga,
      phrase: clip.phrase,
      presentation_order: idx + 1,
      valence: r.valence,
      arousal: r.arousal,
      free_text: (r.free_text || "").trim(),
      created_at: new Date().toISOString(),
    };
  });
}

async function finish() {
  hideStepChrome();
  setProgress(TOTAL_STEPS);
  state.responses = buildResponses();
  show("screen-done");
  const status = document.getElementById("save-status");
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(state.responses),
      });
      if (!res.ok) throw new Error(await res.text());
      status.textContent = "Saved.";
    } catch (e) {
      console.error(e);
      status.textContent = "Couldn't reach the server — your responses are still available below.";
    }
  } else {
    status.textContent = "No backend configured yet — download below.";
  }
}

document.getElementById("btn-download-csv").addEventListener("click", () => {
  const rows = state.responses;
  if (!rows.length) return;
  const h = Object.keys(rows[0]);
  const csv = [h.join(","), ...rows.map(r => h.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = `raga-survey_${state.respondentId}.csv`; a.click();
  URL.revokeObjectURL(url);
});
