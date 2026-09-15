// Single source of truth for survey content: clips, the GEMS-9 instrument,
// and the demographics form. Nothing else in the app should hardcode these.

// ---- Clips ----------------------------------------------------------------
// `melakarta` / `raga` are stored as metadata with each response, never shown
// to the respondent (the study is a blind comparison of ragas sharing a scale).

const CLIPS = [
  { id: "abheri", label: "Lalgudi Violin — Abheri", src: "audio/Smt Lalgudi Violin Abheri.wav", melakarta: "kharaharapriya", raga: "Abheri" },
  { id: "reethigowla", label: "Lalgudi Violin — Reethigowla", src: "audio/Smt Lalgudi Violin Reethigowla.wav", melakarta: "kharaharapriya", raga: "Reethigowla" },
];

const FAMILIARISATION_SRC = "audio/familiarisation.wav";

// Fraction of a clip that must play before its rating controls unlock and
// the Continue/Next button can appear. Only enforced on a clip's first listen
// — replaying afterwards never re-locks the ratings.
const LISTEN_THRESHOLD = 0.85;

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
