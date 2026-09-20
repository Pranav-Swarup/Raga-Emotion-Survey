// Single source of truth for survey content: clips, the GEMS-9 instrument,
// and the demographics form. Nothing else in the app should hardcode these.

// ---- Clips ----------------------------------------------------------------
// `melakarta` / `raga` are stored as metadata with each response, never shown
// to the respondent (the study is a blind comparison of ragas sharing a scale).

// `traditionalEmotion` is a broad, commonly-cited rasa association for the
// debrief screen — rasa attribution varies between musicians/treatises and
// isn't a fixed scientific label, which the debrief text says explicitly.
const CLIPS = [
  {
    id: "abheri",
    label: "Lalgudi Violin — Abheri",
    src: "audio/Abheri Smt Lalgudi Vijayalakshmi.mp3",
    melakarta: "kharaharapriya",
    raga: "Abheri",
    traditionalEmotion: "compassion and tender longing (karuna rasa)",
    sourceUrl: "https://soundcloud.com/lalgudivijayalakshmi/abheri",
  },
  {
    id: "reethigowla",
    label: "Lalgudi Violin — Reethigowla",
    src: "audio/Reethigowla Smt Lalgudi Vijayalakshmi.mp3",
    melakarta: "kharaharapriya",
    raga: "Reethigowla",
    traditionalEmotion: "devotion and quiet reverence (bhakti / shanta rasa)",
    sourceUrl: "https://www.facebook.com/lalgudivijayalakshmi/videos/reetigowla-healing-ragas-with-lalgudi-vijayalakshmi/262962975046544/",
  },
];

const FAMILIARISATION_SRC = "audio/Brindavani Smt Lalgudi Vijayalakshmi.mp3";
const FAMILIARISATION_RAGA = "Brindavani";
const FAMILIARISATION_MELAKARTA = "kharaharapriya";
const FAMILIARISATION_SOURCE_URL = "https://www.facebook.com/lalgudivijayalakshmi/videos/brindavani-raga-healing-ragas-by-lalgudi-vijayalakshmi/222614522502102/";

const PERFORMER_NAME = "Smt. Lalgudi Vijayalakshmi";
const GITHUB_REPO_URL = "https://github.com/Pranav-Swarup/Raga-Emotion-Survey";

// Fraction of a clip that must play before its rating controls unlock and
// the Continue/Next button can appear. Only enforced on a clip's first listen
// — replaying afterwards never re-locks the ratings.
const LISTEN_THRESHOLD = 0.9;

// ---- GEMS-9 -----------------------------------------------------------------
// Fixed order and wording. Each item is rated 0 (not at all) to 4 (extremely).

const GEMS9_ITEMS = [
  { key: "wonder", label: "Wonder", desc: "filled with wonder / amazed" },
  { key: "transcendence", label: "Transcendence", desc: "a sense of transcendence or spirituality" },
  { key: "tenderness", label: "Tenderness", desc: "tender, affectionate" },
  { key: "nostalgia", label: "Nostalgia", desc: "nostalgic, sentimental, dreamy" },
  { key: "peacefulness", label: "Peacefulness", desc: "calm, serene, at ease" },
  { key: "power", label: "Power", desc: "powerful, strong, triumphant" },
  { key: "joyful_activation", label: "Joyful activation", desc: "joyful, bouncy, wanting to move" },
  { key: "tension", label: "Tension", desc: "tense, agitated, uneasy" },
  { key: "sadness", label: "Sadness", desc: "sad, sorrowful" },
];

// ---- Demographics -----------------------------------------------------------

const DEMOGRAPHICS_CONFIG = {
  trainingOptions: ["None", "Some", "Trained"],
  listeningFrequencyOptions: ["Never", "Rarely", "Sometimes", "Often"],
  familiarityOptions: ["Yes", "No", "Unsure"],
};
