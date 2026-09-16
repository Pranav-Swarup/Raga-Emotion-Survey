// Content (CLIPS, FAMILIARISATION_SRC, LISTEN_THRESHOLD, GEMS9_ITEMS,
// DEMOGRAPHICS_CONFIG) lives in survey-config.js. Backend keys live in config.js.

// ---- State --------------------------------------------------------------
// Steps: 0 = familiarisation, 1..N = clip (step-1), N+1 = demographics.

const state = {
  respondentId: crypto.randomUUID(),
  famListened: false,
  clipOrder: shuffle([...CLIPS]),
  clipListened: CLIPS.map(() => false),
  clipAnswers: CLIPS.map(() => ({ gems: {} })), // {gems: {key: 0-4}, free_text, timeSpentMs}
  demographics: { training: null, listening_frequency: null, familiar: null, course_student: null, roll_number: null, name: null },
  responses: [],
  currentStep: -1,
  maxStep: -1,
};

// The step indicator/progress bar only count familiarisation + clips — they
// reach "full" once the respondent is on the last clip. Demographics is a
// final, uncounted screen after that, with its own chrome hidden.
const TOTAL_STEPS = CLIPS.length + 1;
const DEMOGRAPHICS_STEP = CLIPS.length + 1;
const THRESHOLD_PCT = Math.round(LISTEN_THRESHOLD * 100);
const NOTICE_SECONDS = 15;

function clipIndexForStep(step) {
  return (step >= 1 && step <= CLIPS.length) ? step - 1 : null;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Progress bar + step indicator ----------------------------------------

function setProgress(step) {
  const pct = Math.min(100, Math.max(0, Math.round(((step + 1) / TOTAL_STEPS) * 100)));
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
  stepNav.classList.add("hidden");
}

// ---- Bottom nav (back / forward through answered steps) -------------------

const stepNav = document.getElementById("step-nav");
const navBack = document.getElementById("nav-back");
const navForward = document.getElementById("nav-forward");

function updateStepNav(step) {
  stepNav.classList.remove("hidden");
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

// ---- Step router + per-clip time tracking ----------------------------------

let stepEnteredAt = null;

function recordTimeOnCurrentStep() {
  if (stepEnteredAt == null) return;
  const elapsed = Date.now() - stepEnteredAt;
  stepEnteredAt = null;
  const idx = clipIndexForStep(state.currentStep);
  if (idx != null) {
    const a = state.clipAnswers[idx];
    a.timeSpentMs = (a.timeSpentMs || 0) + elapsed;
  }
}

function goToStep(step, { validate = true } = {}) {
  if (validate && step > state.maxStep + 1) return;
  recordTimeOnCurrentStep();
  state.currentStep = step;
  state.maxStep = Math.max(state.maxStep, step);
  renderStep(step);
}

function renderStep(step) {
  stepEnteredAt = Date.now();
  if (step === DEMOGRAPHICS_STEP) {
    // Final, uncounted screen: no step pill, no progress movement, no nav arrows.
    hideStepChrome();
    renderDemographics();
    return;
  }
  updateStepIndicator(step);
  updateStepNav(step);
  setProgress(step);
  if (step === 0) renderFam();
  else renderClip(clipIndexForStep(step));
}

// ---- Reusable audio player ------------------------------------------------

function makePlayer({ playBtn, seekFill, timeEl, replayBtn, visualizerCanvas, onEnded, onThreshold, thresholdPct = LISTEN_THRESHOLD }) {
  const audio = new Audio();
  audio.preload = "metadata";
  audio.crossOrigin = "anonymous";
  let thresholdFired = false;
  let seekLocked = true; // no scrubbing ahead on the first listen — that would bypass the listen gate

  function fmt(s) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  // ---- subtle waveform visualizer, driven by the Web Audio API ----
  let analyser = null, freqData = null, visRafId = null;
  function setupVisualizer() {
    if (!visualizerCanvas || analyser) return; // createMediaElementSource can only run once per <audio>
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      freqData = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      analyser = null; // e.g. Web Audio unsupported — visualizer just stays empty
    }
  }
  function drawVisualizer() {
    if (!analyser) return;
    const canvasCtx = visualizerCanvas.getContext("2d");
    const w = visualizerCanvas.width, h = visualizerCanvas.height;
    analyser.getByteFrequencyData(freqData);
    canvasCtx.clearRect(0, 0, w, h);
    const barCount = freqData.length;
    const gap = 2;
    const barWidth = (w - gap * (barCount - 1)) / barCount;
    canvasCtx.fillStyle = "rgba(107, 31, 42, 0.55)";
    for (let i = 0; i < barCount; i++) {
      const barH = Math.max(2, (freqData[i] / 255) * h);
      canvasCtx.fillRect(i * (barWidth + gap), h - barH, barWidth, barH);
    }
    visRafId = requestAnimationFrame(drawVisualizer);
  }
  function sizeVisualizerCanvas() {
    if (!visualizerCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    visualizerCanvas.width = visualizerCanvas.clientWidth * dpr;
    visualizerCanvas.height = visualizerCanvas.clientHeight * dpr;
  }

  playBtn.addEventListener("click", () => {
    if (audio.paused) audio.play(); else audio.pause();
  });
  audio.addEventListener("play", () => {
    playBtn.classList.add("playing");
    sizeVisualizerCanvas();
    setupVisualizer();
    if (analyser && analyser.context.state === "suspended") analyser.context.resume();
    cancelAnimationFrame(visRafId);
    drawVisualizer();
  });
  audio.addEventListener("pause", () => {
    playBtn.classList.remove("playing");
    cancelAnimationFrame(visRafId);
  });
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
    cancelAnimationFrame(visRafId);
    if (onEnded) onEnded();
  });

  // click-to-seek — locked until the first-listen threshold is reached
  seekFill.parentElement.addEventListener("click", (e) => {
    if (seekLocked) return;
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
      seekLocked = true;
      seekFill.parentElement.classList.add("seek-locked");
      seekFill.style.width = "0%";
      timeEl.textContent = "0:00";
    },
    unlockSeek() {
      seekLocked = false;
      seekFill.parentElement.classList.remove("seek-locked");
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
  show("screen-fam-intro");
});

document.getElementById("btn-fam-intro-proceed").addEventListener("click", () => {
  goToStep(0);
});

// ---- Familiarisation ------------------------------------------------------

document.getElementById("fam-hint").textContent =
  `Continue button will appear once you've heard ${THRESHOLD_PCT}% of the clip.`;

const famNext = document.getElementById("btn-fam-next");
const famPlayer = makePlayer({
  playBtn: document.getElementById("fam-play"),
  seekFill: document.getElementById("fam-seek"),
  timeEl: document.getElementById("fam-time"),
  replayBtn: null,
  visualizerCanvas: document.getElementById("fam-visualizer"),
  onThreshold: () => {
    state.famListened = true;
    famPlayer.unlockSeek();
    setButtonRevealed(famNext, true);
  },
});

function renderFam() {
  show("screen-fam");
  famPlayer.load(FAMILIARISATION_SRC);
  if (state.famListened) famPlayer.unlockSeek();
  setButtonRevealed(famNext, state.famListened);
}

famNext.addEventListener("click", () => {
  famPlayer.stop();
  showPreClipNotice("5", () => goToStep(1), { seconds: 10 });
});

// ---- Clips ------------------------------------------------------------------

const nextBtn = document.getElementById("btn-next-clip");
const freeText = document.getElementById("free-text");
const gemsContainer = document.getElementById("gems-items");
const ratingLocked = document.getElementById("clip-rating-locked");
const ratingBlock = document.getElementById("clip-rating");

document.getElementById("clip-locked-msg").textContent =
  `${THRESHOLD_PCT}% of the clip has to be heard before the ratings and Next button appear.`;

// Build the nine GEMS-9 rows once, from config.
GEMS9_ITEMS.forEach(item => {
  const row = document.createElement("div");
  row.className = "sam";
  row.dataset.key = item.key;

  const labelEl = document.createElement("p");
  labelEl.className = "sam-label";
  labelEl.innerHTML = `<strong>${item.label}</strong> ${item.desc}`;
  row.appendChild(labelEl);

  const scale = document.createElement("div");
  scale.className = "sam-scale";

  const lo = document.createElement("span");
  lo.className = "sam-end";
  lo.textContent = "Not at all";
  scale.appendChild(lo);

  const dots = document.createElement("div");
  dots.className = "dots";
  for (let v = 0; v <= 4; v++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "dot";
    dot.dataset.v = String(v);
    dot.setAttribute("aria-label", `${item.label}: ${v}`);
    dot.addEventListener("click", () => {
      const idx = clipIndexForStep(state.currentStep);
      if (idx == null) return;
      dots.querySelectorAll(".dot").forEach(d => d.classList.remove("selected"));
      dot.classList.add("selected");
      state.clipAnswers[idx].gems[item.key] = v;
      row.classList.remove("pending");
      updateClipNextButton(idx);
    });
    dots.appendChild(dot);
  }
  scale.appendChild(dots);

  const hi = document.createElement("span");
  hi.className = "sam-end";
  hi.textContent = "Extremely";
  scale.appendChild(hi);

  row.appendChild(scale);
  gemsContainer.appendChild(row);
});

const clipPlayer = makePlayer({
  playBtn: document.getElementById("clip-play"),
  seekFill: document.getElementById("clip-seek"),
  timeEl: document.getElementById("clip-time"),
  replayBtn: document.getElementById("clip-replay"),
  visualizerCanvas: document.getElementById("clip-visualizer"),
  onThreshold: () => {
    const idx = clipIndexForStep(state.currentStep);
    if (idx == null) return;
    state.clipListened[idx] = true;
    clipPlayer.unlockSeek();
    unlockRating();
    updateClipNextButton(idx);
  },
});

function unlockRating() {
  ratingLocked.classList.add("hidden");
  ratingBlock.classList.remove("hidden");
  autoResizeTextarea(freeText); // element is only visible now — scrollHeight would read 0 before this
}
function lockRating() {
  ratingLocked.classList.remove("hidden");
  ratingBlock.classList.add("hidden");
}

function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

freeText.addEventListener("input", () => {
  autoResizeTextarea(freeText);
  const idx = clipIndexForStep(state.currentStep);
  if (idx == null) return;
  state.clipAnswers[idx].free_text = freeText.value;
  freeText.classList.remove("pending");
  updateClipNextButton(idx);
});

function allGemsAnswered(idx) {
  const gems = state.clipAnswers[idx].gems;
  return GEMS9_ITEMS.every(item => gems[item.key] !== undefined);
}

function descriptionAnswered(idx) {
  return !!(state.clipAnswers[idx].free_text || "").trim();
}

function updateClipNextButton(idx) {
  const revealed = !!state.clipListened[idx];
  nextBtn.classList.toggle("show", revealed);
  nextBtn.disabled = !(revealed && allGemsAnswered(idx) && descriptionAnswered(idx));
}

let preloadAudio = null;
function preloadNextClip(afterIdx) {
  const next = state.clipOrder[afterIdx + 1];
  if (!next) { preloadAudio = null; return; }
  preloadAudio = new Audio();
  preloadAudio.preload = "auto";
  preloadAudio.src = next.src;
}

function renderClip(idx) {
  const clip = state.clipOrder[idx];
  clipPlayer.load(clip.src);
  if (state.clipListened[idx]) clipPlayer.unlockSeek();
  preloadNextClip(idx);

  const saved = state.clipAnswers[idx];
  gemsContainer.querySelectorAll(".sam").forEach(row => {
    const key = row.dataset.key;
    row.classList.remove("pending");
    row.querySelectorAll(".dot").forEach(d => {
      d.classList.toggle("selected", saved.gems[key] !== undefined && String(saved.gems[key]) === d.dataset.v);
    });
  });
  freeText.value = saved.free_text || "";
  freeText.classList.remove("pending");

  show("screen-clip");
  if (state.clipListened[idx]) unlockRating(); else lockRating();
  updateClipNextButton(idx);
}

nextBtn.addEventListener("click", () => {
  clipPlayer.stop();
  const idx = clipIndexForStep(state.currentStep);
  if (idx == null) return;
  // Gently flag anything still unanswered (shouldn't normally reach here, button is disabled until complete).
  let allDone = true;
  gemsContainer.querySelectorAll(".sam").forEach(row => {
    const answered = state.clipAnswers[idx].gems[row.dataset.key] !== undefined;
    row.classList.toggle("pending", !answered);
    if (!answered) allDone = false;
  });
  if (!descriptionAnswered(idx)) {
    freeText.classList.add("pending");
    allDone = false;
  }
  if (!allDone) return;

  if (idx < state.clipOrder.length - 1) {
    const nextStep = state.currentStep + 1;
    showPreClipNotice("2", () => goToStep(nextStep), { showInstructions: false });
  } else {
    goToStep(DEMOGRAPHICS_STEP);
  }
});

// ---- Pre-clip notice (shown before clip 1, and between clips; not a navigable step) --

let noticeTimer = null;
const noticeMinutesEl = document.getElementById("notice-minutes");
const noticeCountdownEl = document.getElementById("notice-countdown");
const noticeProceedBtn = document.getElementById("btn-notice-proceed");
const noticeListEl = document.getElementById("notice-list");
const noticeJustifyEl = document.getElementById("notice-justify");
const noticeTimerLineEl = document.getElementById("notice-timer-line");

function showPreClipNotice(minutesLabel, onProceed, { showInstructions = true, seconds = NOTICE_SECONDS } = {}) {
  recordTimeOnCurrentStep();
  hideStepChrome();
  noticeListEl.classList.toggle("hidden", !showInstructions);
  noticeJustifyEl.classList.toggle("hidden", showInstructions);
  noticeMinutesEl.textContent = minutesLabel;
  let remaining = seconds;
  noticeCountdownEl.textContent = remaining;
  noticeTimerLineEl.classList.remove("hidden");
  setButtonRevealed(noticeProceedBtn, false);
  show("screen-notice");

  clearInterval(noticeTimer);
  noticeTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(noticeTimer);
      noticeTimerLineEl.classList.add("hidden");
      setButtonRevealed(noticeProceedBtn, true);
    } else {
      noticeCountdownEl.textContent = remaining;
    }
  }, 1000);

  noticeProceedBtn.onclick = () => {
    clearInterval(noticeTimer);
    onProceed();
  };
}

// ---- Demographics -----------------------------------------------------------

const btnFinish = document.getElementById("btn-finish");

function buildChoiceRow(container, options, key, { onSelect } = {}) {
  container.innerHTML = "";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill";
    btn.textContent = opt;
    btn.dataset.value = opt;
    btn.addEventListener("click", () => {
      container.querySelectorAll(".pill").forEach(p => p.classList.remove("selected"));
      btn.classList.add("selected");
      state.demographics[key] = opt;
      if (onSelect) onSelect(opt);
      updateFinishButton();
    });
    container.appendChild(btn);
  });
}

const trainingRow = document.getElementById("demo-training");
const frequencyRow = document.getElementById("demo-frequency");
const familiarRow = document.getElementById("demo-familiar");
const courseRow = document.getElementById("demo-course");
const yearsField = document.getElementById("demo-years-field");
const courseDetailsField = document.getElementById("demo-course-details");
const ageInput = document.getElementById("demo-age");
const yearsInput = document.getElementById("demo-years");
const rollInput = document.getElementById("demo-roll");
const nameInput = document.getElementById("demo-name");

buildChoiceRow(trainingRow, DEMOGRAPHICS_CONFIG.trainingOptions, "training", {
  onSelect: (val) => yearsField.classList.toggle("hidden", val === "None"),
});
buildChoiceRow(frequencyRow, DEMOGRAPHICS_CONFIG.listeningFrequencyOptions, "listening_frequency");
buildChoiceRow(familiarRow, DEMOGRAPHICS_CONFIG.familiarityOptions, "familiar");
buildChoiceRow(courseRow, ["Yes", "No"], "course_student", {
  onSelect: (val) => courseDetailsField.classList.toggle("hidden", val !== "Yes"),
});

ageInput.addEventListener("input", () => { state.demographics.age = ageInput.value; });
yearsInput.addEventListener("input", () => { state.demographics.years_of_training = yearsInput.value; });
rollInput.addEventListener("input", () => { state.demographics.roll_number = rollInput.value; updateFinishButton(); });
nameInput.addEventListener("input", () => { state.demographics.name = nameInput.value; updateFinishButton(); });

function updateFinishButton() {
  const d = state.demographics;
  const courseOk = d.course_student !== "Yes" || (d.roll_number && d.roll_number.trim() && d.name && d.name.trim());
  btnFinish.disabled = !(d.training && courseOk);
}

function renderDemographics() {
  show("screen-demographics");
  updateFinishButton();
}

btnFinish.addEventListener("click", () => {
  finish();
});

// ---- Done -----------------------------------------------------------------

function buildResponses() {
  const d = state.demographics;
  return state.clipOrder.map((clip, idx) => {
    const a = state.clipAnswers[idx] || { gems: {} };
    const row = {
      respondent_id: state.respondentId,
      clip_id: clip.id,
      melakarta: clip.melakarta,
      raga: clip.raga,
      presentation_order: idx + 1,
      free_text: (a.free_text || "").trim(),
      time_spent_ms: a.timeSpentMs || 0,
      age: d.age || null,
      training: d.training,
      years_of_training: d.years_of_training || null,
      listening_frequency: d.listening_frequency,
      familiar: d.familiar,
      course_student: d.course_student,
      roll_number: d.course_student === "Yes" ? (d.roll_number || "").trim() : null,
      name: d.course_student === "Yes" ? (d.name || "").trim() : null,
      created_at: new Date().toISOString(),
    };
    GEMS9_ITEMS.forEach(item => { row[item.key] = a.gems[item.key]; });
    return row;
  });
}

async function finish() {
  recordTimeOnCurrentStep();
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

// ---- Info / debrief screen (reveals what was actually heard, hypothesis, credits) --

document.getElementById("performer-name").textContent = PERFORMER_NAME;
document.getElementById("github-link").href = GITHUB_REPO_URL;

const creditsList = document.getElementById("credits-links");
[
  { raga: FAMILIARISATION_RAGA, url: FAMILIARISATION_SOURCE_URL },
  ...CLIPS.map(c => ({ raga: c.raga, url: c.sourceUrl })),
].forEach(({ raga, url }) => {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = `${raga}: original recording`;
  li.appendChild(a);
  creditsList.appendChild(li);
});

function renderInfoHeard() {
  const container = document.getElementById("info-heard");
  container.innerHTML = "";
  const famP = document.createElement("p");
  famP.textContent = `Warm-up clip: ${FAMILIARISATION_RAGA} (not rated).`;
  container.appendChild(famP);
  state.clipOrder.forEach((clip, idx) => {
    const p = document.createElement("p");
    p.innerHTML = `Clip ${idx + 1} you rated: <strong>${clip.raga}</strong>, traditionally associated with ${clip.traditionalEmotion}.`;
    container.appendChild(p);
  });
  const caveat = document.createElement("p");
  caveat.className = "fine";
  caveat.textContent = "These rasa associations are broad cultural touchpoints passed down through performers and treatises, not a fixed rule, which is part of what this study is putting to the test.";
  container.appendChild(caveat);
}

document.getElementById("btn-know-more").addEventListener("click", () => {
  renderInfoHeard();
  show("screen-info");
});
document.getElementById("btn-info-back").addEventListener("click", () => {
  show("screen-done");
});

// ---- Share -----------------------------------------------------------------

async function shareSurvey(statusEl) {
  const url = location.origin + location.pathname;
  const shareData = {
    title: "Beyond the Scale: Carnatic Rāga Listening Survey",
    text: "A quick ~5 minute study on how Carnatic ragas make listeners feel:",
    url,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (e) {
      // user cancelled the share sheet — not an error worth reporting
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    statusEl.textContent = "Link copied to clipboard.";
  } catch (e) {
    statusEl.textContent = url;
  }
}

document.getElementById("btn-share").addEventListener("click", () => {
  shareSurvey(document.getElementById("share-status"));
});
document.getElementById("btn-share-info").addEventListener("click", () => {
  shareSurvey(document.getElementById("share-status-info"));
});
