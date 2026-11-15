import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  FileText,
  Flame,
  Home,
  Layers3,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
  Shuffle,
  AlertCircle,
  CheckCheck,
  RefreshCw
} from "lucide-react";
import {
  GeneratedStudySetSchema
} from "../shared/study";
import { useLocalStorageState } from "./lib/storage";
import { demoStudySet } from "./lib/demo";
import { calculateQuizScore, getIncorrectQuestionIds } from "./lib/quiz";
function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function getRelativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 864e5));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}
function App() {
  const [sets, setSets] = useLocalStorageState("recall-ai:study-sets:v1", []);
  const [view, setView] = useState("dashboard");
  const [activeSetId, setActiveSetId] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [mode, setMode] = useState("both");
  const [difficulty, setDifficulty] = useState("medium");
  const [flashcardCount, setFlashcardCount] = useState(8);
  const [questionCount, setQuestionCount] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const requestRef = useRef(null);
  const requestSequenceRef = useRef(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [quizMode, setQuizMode] = useState("full");
  const [quizQuestionIds, setQuizQuestionIds] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [lastAttempt, setLastAttempt] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeSet = sets.find((set) => set.id === activeSetId) ?? null;
  const quizQuestions = useMemo(() => {
    if (!activeSet) return [];
    if (quizMode === "full") return activeSet.quiz;
    const selectedIds = new Set(quizQuestionIds);
    return activeSet.quiz.filter((question) => selectedIds.has(question.id));
  }, [activeSet, quizMode, quizQuestionIds]);
  const currentQuestion = quizQuestions[quizIndex];
  const currentCard = activeSet?.flashcards[cardIndex];
  const stats = {
    sessions: sets.length,
    totalCards: sets.reduce((sum, set) => sum + set.flashcards.length, 0),
    reviewed: sets.reduce((sum, set) => sum + set.reviewedCardIds.length, 0),
    known: sets.reduce((sum, set) => sum + set.knownCardIds.length, 0)
  };
  useEffect(() => () => requestRef.current?.abort(), []);
  function navigate(next) {
    setView(next);
    setMobileMenuOpen(false);
  }
  function openSet(setId) {
    setActiveSetId(setId);
    setCardIndex(0);
    setFlipped(false);
    navigate("flashcards");
  }
  function openCreate() {
    setGenerationError("");
    navigate("create");
  }
  async function handleGenerate(event) {
    event.preventDefault();
    setGenerationError("");
    const trimmed = sourceText.trim();
    if (trimmed.length < 10) {
      setGenerationError("Add a little more detail (at least 10 characters) so Recall can create useful material.");
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const requestSequence = ++requestSequenceRef.current;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ content: trimmed, mode, difficulty, flashcardCount, questionCount })
      });
      const payload = await response.json().catch(() => null);
      if (requestSequence !== requestSequenceRef.current) return;
      if (!response.ok) throw new Error(payload?.error?.message || `Request failed (${response.status}). Please retry.`);
      const parsed = GeneratedStudySetSchema.safeParse(payload?.data);
      if (!parsed.success) throw new Error("The server returned study material in an unexpected format. Please retry.");
      const generated = {
        ...parsed.data,
        id: makeId(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        sourceText: trimmed,
        mode,
        difficulty,
        knownCardIds: [],
        difficultCardIds: [],
        reviewedCardIds: []
      };
      setSets((current) => [generated, ...current]);
      setActiveSetId(generated.id);
      setCardIndex(0);
      setFlipped(false);
      if (generated.flashcards.length > 0) navigate("flashcards");
      else startQuizFor(generated, "full");
    } catch (error) {
      if (controller.signal.aborted) return;
      if (requestSequence === requestSequenceRef.current) {
        setGenerationError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) setIsGenerating(false);
    }
  }
  function updateSet(setId, updater) {
    setSets((current) => current.map((set) => set.id === setId ? updater(set) : set));
  }
  function markCard(kind) {
    if (!activeSet || !currentCard) return;
    updateSet(activeSet.id, (set) => {
      const known = new Set(set.knownCardIds);
      const difficult = new Set(set.difficultCardIds);
      const reviewed = new Set(set.reviewedCardIds);
      reviewed.add(currentCard.id);
      if (kind === "known") {
        known.add(currentCard.id);
        difficult.delete(currentCard.id);
      } else {
        difficult.add(currentCard.id);
        known.delete(currentCard.id);
      }
      return { ...set, knownCardIds: [...known], difficultCardIds: [...difficult], reviewedCardIds: [...reviewed] };
    });
    goToCard(cardIndex + 1);
  }
  function goToCard(index) {
    if (!activeSet) return;
    setCardIndex(Math.min(Math.max(0, index), Math.max(0, activeSet.flashcards.length - 1)));
    setFlipped(false);
  }
  function shuffleCards() {
    if (!activeSet) return;
    const shuffled = [...activeSet.flashcards];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    updateSet(activeSet.id, (set) => ({ ...set, flashcards: shuffled }));
    setCardIndex(0);
    setFlipped(false);
  }
  function startQuizFor(set, nextMode, questionIds) {
    setActiveSetId(set.id);
    setQuizMode(nextMode);
    setQuizQuestionIds(questionIds ?? set.quiz.map((question) => question.id));
    setQuizIndex(0);
    setQuizAnswers([]);
    setSelectedOption(null);
    setAnswerSubmitted(false);
    setLastAttempt(null);
    navigate("quiz");
  }
  function submitAnswer() {
    if (!currentQuestion || selectedOption === null || answerSubmitted || !activeSet) return;
    const answer = {
      questionId: currentQuestion.id,
      selectedOptionIndex: selectedOption,
      isCorrect: selectedOption === currentQuestion.correctOptionIndex
    };
    const nextAnswers = [...quizAnswers, answer];
    setQuizAnswers(nextAnswers);
    setAnswerSubmitted(true);
  }
  function nextQuestion() {
    if (!activeSet || !currentQuestion) return;
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex((index) => index + 1);
      setSelectedOption(null);
      setAnswerSubmitted(false);
      return;
    }
    const attempt = {
      id: makeId(),
      studySetId: activeSet.id,
      mode: quizMode,
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      questions: quizQuestions,
      answers: quizAnswers,
      score: calculateQuizScore(quizAnswers, quizQuestions.length)
    };
    setLastAttempt(attempt);
    navigate("results");
  }
  function retryWrongAnswers() {
    if (!activeSet || !lastAttempt) return;
    const wrongIds = getIncorrectQuestionIds(lastAttempt.answers);
    if (wrongIds.length) startQuizFor(activeSet, "revision", wrongIds);
  }
  function removeSet(setId) {
    setSets((current) => current.filter((set) => set.id !== setId));
    if (activeSetId === setId) {
      setActiveSetId(null);
      navigate("dashboard");
    }
  }
  function addDemo() {
    if (sets.some((set) => set.id === demoStudySet.id)) {
      setActiveSetId(demoStudySet.id);
      navigate("dashboard");
      return;
    }
    const demo = { ...demoStudySet, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    setSets((current) => [demo, ...current]);
  }
  const pageTitle = view === "dashboard" ? "Your study space" : view === "create" ? "Create a study set" : view === "flashcards" ? "Flashcard study" : view === "quiz" ? "Knowledge check" : "Session complete";
  return /* @__PURE__ */ jsxs("div", { className: "app-shell", children: [
    /* @__PURE__ */ jsxs("aside", { className: `sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`, children: [
      /* @__PURE__ */ jsxs("div", { className: "brand-lockup", children: [
        /* @__PURE__ */ jsx("div", { className: "brand-mark", children: /* @__PURE__ */ jsx(BookOpen, { size: 18, strokeWidth: 2.2 }) }),
        /* @__PURE__ */ jsxs("div", { className: "brand-name", children: [
          "recall",
          /* @__PURE__ */ jsx("span", { children: "." }),
          /* @__PURE__ */ jsx("small", { children: "STUDY WORKSPACE" })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "icon-button sidebar-close", onClick: () => setMobileMenuOpen(false), "aria-label": "Close menu", children: /* @__PURE__ */ jsx(X, { size: 18 }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "sidebar-label", children: "WORKSPACE" }),
      /* @__PURE__ */ jsxs("nav", { className: "main-nav", "aria-label": "Main navigation", children: [
        /* @__PURE__ */ jsxs("button", { className: `nav-item ${view === "dashboard" ? "active" : ""}`, onClick: () => navigate("dashboard"), children: [
          /* @__PURE__ */ jsx(Home, { size: 18 }),
          " ",
          /* @__PURE__ */ jsx("span", { children: "Overview" })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: `nav-item ${view === "create" ? "active" : ""}`, onClick: openCreate, children: [
          /* @__PURE__ */ jsx(Plus, { size: 18 }),
          " ",
          /* @__PURE__ */ jsx("span", { children: "Create study set" }),
          /* @__PURE__ */ jsx("span", { className: "nav-plus", children: "+" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "sidebar-label library-label", children: [
        "YOUR LIBRARY ",
        /* @__PURE__ */ jsx("span", { children: sets.length.toString().padStart(2, "0") })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "library-list", children: [
        sets.slice(0, 5).map((set) => /* @__PURE__ */ jsxs("button", { className: `library-item ${activeSetId === set.id ? "selected" : ""}`, onClick: () => openSet(set.id), children: [
          /* @__PURE__ */ jsx("span", { className: "library-dot" }),
          " ",
          /* @__PURE__ */ jsx("span", { className: "library-title", children: set.title })
        ] }, set.id)),
        sets.length === 0 && /* @__PURE__ */ jsx("p", { className: "library-empty", children: "Your saved study sets will appear here." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "sidebar-bottom", children: [
        /* @__PURE__ */ jsxs("div", { className: "sidebar-tip", children: [
          /* @__PURE__ */ jsx("div", { className: "tip-icon", children: /* @__PURE__ */ jsx(Lightbulb, { size: 16 }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Small sessions add up." }),
            /* @__PURE__ */ jsx("p", { children: "Even 10 minutes of active recall can make a difference." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "profile-row", children: [
          /* @__PURE__ */ jsx("div", { className: "avatar", children: "S" }),
          /* @__PURE__ */ jsxs("div", { className: "profile-copy", children: [
            /* @__PURE__ */ jsx("strong", { children: "Student workspace" }),
            /* @__PURE__ */ jsx("span", { children: "Personal account" })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "icon-button muted-icon", title: "Settings are not part of this demo", children: /* @__PURE__ */ jsx(Settings2, { size: 17 }) })
        ] })
      ] })
    ] }),
    mobileMenuOpen && /* @__PURE__ */ jsx("button", { className: "mobile-scrim", onClick: () => setMobileMenuOpen(false), "aria-label": "Close navigation" }),
    /* @__PURE__ */ jsxs("main", { className: "main-panel", children: [
      /* @__PURE__ */ jsxs("header", { className: "topbar", children: [
        /* @__PURE__ */ jsxs("div", { className: "topbar-left", children: [
          /* @__PURE__ */ jsx("button", { className: "icon-button menu-trigger", onClick: () => setMobileMenuOpen(true), "aria-label": "Open menu", children: /* @__PURE__ */ jsx(Menu, { size: 20 }) }),
          /* @__PURE__ */ jsxs("div", { className: "breadcrumb", children: [
            /* @__PURE__ */ jsx("span", { children: "Workspace" }),
            /* @__PURE__ */ jsx("span", { className: "breadcrumb-slash", children: "/" }),
            /* @__PURE__ */ jsx("strong", { children: pageTitle })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "topbar-actions", children: [
          /* @__PURE__ */ jsxs("div", { className: "saved-indicator", children: [
            /* @__PURE__ */ jsx("span", {}),
            " Saved locally"
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "top-create-button", onClick: openCreate, children: [
            /* @__PURE__ */ jsx(Plus, { size: 16 }),
            " New study set"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "page-content", children: [
        view === "dashboard" && /* @__PURE__ */ jsx(
          Dashboard,
          {
            sets,
            stats,
            onCreate: openCreate,
            onOpen: (set) => openSet(set.id),
            onQuiz: (set) => startQuizFor(set, "full"),
            onDemo: addDemo,
            onDelete: removeSet
          }
        ),
        view === "create" && /* @__PURE__ */ jsx(
          CreateStudySet,
          {
            sourceText,
            setSourceText,
            mode,
            setMode,
            difficulty,
            setDifficulty,
            flashcardCount,
            setFlashcardCount,
            questionCount,
            setQuestionCount,
            isGenerating,
            error: generationError,
            onSubmit: handleGenerate,
            onBack: () => navigate("dashboard")
          }
        ),
        view === "flashcards" && activeSet && currentCard && /* @__PURE__ */ jsx(
          Flashcards,
          {
            studySet: activeSet,
            index: cardIndex,
            card: currentCard,
            flipped,
            onFlip: () => setFlipped((value) => !value),
            onPrevious: () => goToCard(cardIndex - 1),
            onNext: () => goToCard(cardIndex + 1),
            onMarkKnown: () => markCard("known"),
            onMarkDifficult: () => markCard("difficult"),
            onQuiz: () => startQuizFor(activeSet, "full"),
            onShuffle: shuffleCards,
            onDashboard: () => navigate("dashboard"),
            canPrevious: cardIndex > 0,
            canNext: cardIndex < activeSet.flashcards.length - 1
          }
        ),
        view === "flashcards" && activeSet && !currentCard && /* @__PURE__ */ jsx(EmptyPanel, { title: "No flashcards in this set", description: "This study set was generated in quiz-only mode.", onAction: () => startQuizFor(activeSet, "full"), actionLabel: "Start quiz" }),
        view === "quiz" && activeSet && currentQuestion && /* @__PURE__ */ jsx(
          Quiz,
          {
            set: activeSet,
            question: currentQuestion,
            index: quizIndex,
            total: quizQuestions.length,
            mode: quizMode,
            selected: selectedOption,
            submitted: answerSubmitted,
            onSelect: setSelectedOption,
            onSubmit: submitAnswer,
            onNext: nextQuestion,
            onExit: () => navigate("dashboard")
          }
        ),
        view === "quiz" && activeSet && !currentQuestion && /* @__PURE__ */ jsx(EmptyPanel, { title: "No quiz questions available", description: "This study set does not contain quiz questions.", onAction: () => navigate("dashboard"), actionLabel: "Back to overview" }),
        view === "results" && lastAttempt && activeSet && /* @__PURE__ */ jsx(
          Results,
          {
            attempt: lastAttempt,
            set: activeSet,
            onRetry: retryWrongAnswers,
            onRetake: () => startQuizFor(activeSet, "full"),
            onDashboard: () => navigate("dashboard"),
            onStudy: () => openSet(activeSet.id)
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("footer", { className: "app-footer", children: [
        /* @__PURE__ */ jsx("span", { children: "Recall" }),
        /* @__PURE__ */ jsx("span", { children: "Learn actively. Remember longer." }),
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx(ShieldCheck, { size: 13 }),
          " Your notes stay in this workspace"
        ] })
      ] })
    ] })
  ] });
}
function Dashboard({ sets, stats, onCreate, onOpen, onQuiz, onDemo, onDelete }) {
  const [query, setQuery] = useState("");
  const filteredSets = sets.filter((set) => set.title.toLowerCase().includes(query.toLowerCase()));
  return /* @__PURE__ */ jsxs("div", { className: "dashboard-page page-enter", children: [
    /* @__PURE__ */ jsxs("section", { className: "welcome-row", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "eyebrow", children: [
          /* @__PURE__ */ jsx(BookOpen, { size: 14 }),
          " YOUR STUDY WORKSPACE"
        ] }),
        /* @__PURE__ */ jsxs("h1", { children: [
          "Make what you learn ",
          /* @__PURE__ */ jsx("span", { children: "stick." })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "Turn your notes into focused practice, one small session at a time." })
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "primary-button", onClick: onCreate, children: [
        /* @__PURE__ */ jsx(Plus, { size: 17 }),
        " Create study set"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "stats-grid", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Study sets", value: stats.sessions.toString(), detail: "Your saved collections", icon: /* @__PURE__ */ jsx(BookOpen, { size: 18 }), tone: "violet" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Flashcards", value: stats.totalCards.toString(), detail: "Ready to be reviewed", icon: /* @__PURE__ */ jsx(Layers3, { size: 18 }), tone: "blue" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Cards reviewed", value: stats.reviewed.toString(), detail: "Keep the momentum", icon: /* @__PURE__ */ jsx(CheckCheck, { size: 18 }), tone: "green" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Marked as known", value: stats.known.toString(), detail: "Concepts getting stronger", icon: /* @__PURE__ */ jsx(Trophy, { size: 18 }), tone: "amber" })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "library-section", children: [
      /* @__PURE__ */ jsxs("div", { className: "section-heading", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "section-overline", children: "PICK UP WHERE YOU LEFT OFF" }),
          /* @__PURE__ */ jsxs("h2", { children: [
            "Your study sets ",
            /* @__PURE__ */ jsx("span", { className: "count-pill", children: sets.length })
          ] })
        ] }),
        sets.length > 0 && /* @__PURE__ */ jsxs("div", { className: "search-box", children: [
          /* @__PURE__ */ jsx(Search, { size: 15 }),
          /* @__PURE__ */ jsx("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "Search study sets" })
        ] })
      ] }),
      sets.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "empty-library", children: [
        /* @__PURE__ */ jsxs("div", { className: "empty-illustration", children: [
          /* @__PURE__ */ jsx("div", { className: "empty-sheet", children: /* @__PURE__ */ jsx(FileText, { size: 26 }) }),
          /* @__PURE__ */ jsx("div", { className: "empty-spark", children: "\u2726" })
        ] }),
        /* @__PURE__ */ jsx("h3", { children: "Your next study session starts here." }),
        /* @__PURE__ */ jsx("p", { children: "Create a study set from your notes or explore a sample to see how Recall works." }),
        /* @__PURE__ */ jsxs("div", { className: "empty-actions", children: [
          /* @__PURE__ */ jsxs("button", { className: "primary-button", onClick: onCreate, children: [
            /* @__PURE__ */ jsx(Plus, { size: 16 }),
            " Create your first set"
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "secondary-button", onClick: onDemo, children: [
            "Explore sample set ",
            /* @__PURE__ */ jsx(ArrowRight, { size: 15 })
          ] })
        ] })
      ] }) : filteredSets.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "no-results", children: [
        /* @__PURE__ */ jsx(Search, { size: 20 }),
        /* @__PURE__ */ jsx("strong", { children: "No matching study sets" }),
        /* @__PURE__ */ jsx("span", { children: "Try a different search term." })
      ] }) : /* @__PURE__ */ jsx("div", { className: "study-set-grid", children: filteredSets.map((set, index) => /* @__PURE__ */ jsx(StudySetCard, { set, index, onOpen: () => onOpen(set), onQuiz: () => onQuiz(set), onDelete: () => onDelete(set.id) }, set.id)) })
    ] })
  ] });
}
function StatCard({ label, value, detail, icon, tone }) {
  return /* @__PURE__ */ jsxs("div", { className: "stat-card", children: [
    /* @__PURE__ */ jsx("div", { className: `stat-icon ${tone}`, children: icon }),
    /* @__PURE__ */ jsx("div", { className: "stat-label", children: label }),
    /* @__PURE__ */ jsx("div", { className: "stat-value", children: value }),
    /* @__PURE__ */ jsx("div", { className: "stat-detail", children: detail })
  ] });
}
function StudySetCard({ set, index, onOpen, onQuiz, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const palettes = ["set-violet", "set-peach", "set-blue", "set-mint"];
  const progress = set.flashcards.length ? Math.round(set.knownCardIds.length / set.flashcards.length * 100) : 0;
  return /* @__PURE__ */ jsxs("article", { className: "study-card", children: [
    /* @__PURE__ */ jsxs("div", { className: `study-card-art ${palettes[index % palettes.length]}`, children: [
      /* @__PURE__ */ jsx("div", { className: "study-card-art-icon", children: index % 3 === 0 ? /* @__PURE__ */ jsx(Brain, { size: 25 }) : index % 3 === 1 ? /* @__PURE__ */ jsx(BookOpen, { size: 25 }) : /* @__PURE__ */ jsx(Layers3, { size: 25 }) }),
      /* @__PURE__ */ jsx("span", { className: "art-spark", children: "\u2733" }),
      /* @__PURE__ */ jsx("span", { className: "art-line" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "study-card-body", children: [
      /* @__PURE__ */ jsxs("div", { className: "study-card-meta", children: [
        /* @__PURE__ */ jsx("span", { children: set.isDemo ? "SAMPLE SET" : set.mode.toUpperCase() }),
        /* @__PURE__ */ jsx("span", { children: getRelativeDate(set.createdAt) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "study-card-title-row", children: [
        /* @__PURE__ */ jsx("h3", { children: set.title }),
        /* @__PURE__ */ jsxs("div", { className: "card-menu-wrap", children: [
          /* @__PURE__ */ jsx("button", { className: "icon-button card-menu-button", "aria-label": "Study set options", onClick: () => setMenuOpen((value) => !value), children: /* @__PURE__ */ jsx(ChevronDown, { size: 16 }) }),
          menuOpen && /* @__PURE__ */ jsx("div", { className: "card-menu", children: /* @__PURE__ */ jsxs("button", { onClick: () => {
            setMenuOpen(false);
            onDelete();
          }, children: [
            /* @__PURE__ */ jsx(Trash2, { size: 14 }),
            " Remove set"
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "study-card-summary", children: set.summary }),
      /* @__PURE__ */ jsxs("div", { className: "study-card-details", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx(Layers3, { size: 14 }),
          " ",
          set.flashcards.length,
          " cards"
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx(CircleHelp, { size: 14 }),
          " ",
          set.quiz.length,
          " questions"
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx(Clock3, { size: 14 }),
          " ",
          set.difficulty
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "study-card-progress", children: [
        /* @__PURE__ */ jsxs("div", { className: "progress-caption", children: [
          /* @__PURE__ */ jsx("span", { children: "Cards mastered" }),
          /* @__PURE__ */ jsxs("b", { children: [
            progress,
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "progress-track", children: /* @__PURE__ */ jsx("div", { style: { width: `${progress}%` } }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "study-card-actions", children: [
        /* @__PURE__ */ jsxs("button", { onClick: onOpen, disabled: !set.flashcards.length, children: [
          /* @__PURE__ */ jsx(BookOpen, { size: 15 }),
          " Study cards"
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "quiz-action", onClick: onQuiz, disabled: !set.quiz.length, children: [
          /* @__PURE__ */ jsx(Zap, { size: 14 }),
          " Take quiz ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 14 })
        ] })
      ] })
    ] })
  ] });
}
function CreateStudySet(props) {
  const { sourceText, setSourceText, mode, setMode, difficulty, setDifficulty, flashcardCount, setFlashcardCount, questionCount, setQuestionCount, isGenerating, error, onSubmit, onBack } = props;
  const samples = ["The OSI model and TCP/IP", "Photosynthesis and cellular respiration", "Fundamentals of database normalization"];
  return /* @__PURE__ */ jsxs("div", { className: "create-page page-enter", children: [
    /* @__PURE__ */ jsxs("button", { className: "back-link", onClick: onBack, children: [
      /* @__PURE__ */ jsx(ArrowLeft, { size: 15 }),
      " Back to overview"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "create-heading", children: [
      /* @__PURE__ */ jsxs("div", { className: "eyebrow", children: [
        /* @__PURE__ */ jsx(BookOpen, { size: 14 }),
        " CREATE A STUDY SET"
      ] }),
      /* @__PURE__ */ jsxs("h1", { children: [
        "What are we ",
        /* @__PURE__ */ jsx("span", { children: "learning today?" })
      ] }),
      /* @__PURE__ */ jsx("p", { children: "Drop in your notes or a topic. We'll turn them into a practice set that's ready to use." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "create-layout", children: [
      /* @__PURE__ */ jsxs("form", { className: "create-form panel", onSubmit, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-section-title", children: [
          /* @__PURE__ */ jsx("div", { className: "number-dot", children: "01" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { children: "Add your study material" }),
            /* @__PURE__ */ jsx("p", { children: "Paste class notes, a reading excerpt, or just a topic." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "textarea-wrap", children: [
          /* @__PURE__ */ jsx("textarea", { value: sourceText, onChange: (event) => setSourceText(event.target.value), placeholder: "Paste your notes here, or enter a topic you want to understand better...", rows: 9, maxLength: 12e3, disabled: isGenerating }),
          /* @__PURE__ */ jsxs("div", { className: "textarea-footer", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx(FileText, { size: 14 }),
              " Your content is used to create this study set"
            ] }),
            /* @__PURE__ */ jsxs("span", { children: [
              sourceText.length.toLocaleString(),
              " / 12,000"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sample-topics", children: [
          /* @__PURE__ */ jsx("span", { children: "Need inspiration?" }),
          samples.map((sample) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setSourceText(sample), children: sample }, sample))
        ] }),
        /* @__PURE__ */ jsx("div", { className: "form-divider" }),
        /* @__PURE__ */ jsxs("div", { className: "form-section-title", children: [
          /* @__PURE__ */ jsx("div", { className: "number-dot", children: "02" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { children: "Choose your practice" }),
            /* @__PURE__ */ jsx("p", { children: "Pick the format that works for your session." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mode-options", children: [
          /* @__PURE__ */ jsxs("button", { type: "button", className: `mode-option ${mode === "both" ? "selected" : ""}`, onClick: () => setMode("both"), children: [
            /* @__PURE__ */ jsx("span", { className: "mode-icon mode-purple", children: /* @__PURE__ */ jsx(Layers3, { size: 19 }) }),
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("b", { children: "Both" }),
              /* @__PURE__ */ jsx("small", { children: "Cards + quiz" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "mode-radio" })
          ] }),
          /* @__PURE__ */ jsxs("button", { type: "button", className: `mode-option ${mode === "flashcards" ? "selected" : ""}`, onClick: () => setMode("flashcards"), children: [
            /* @__PURE__ */ jsx("span", { className: "mode-icon mode-blue", children: /* @__PURE__ */ jsx(BookOpen, { size: 19 }) }),
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("b", { children: "Flashcards" }),
              /* @__PURE__ */ jsx("small", { children: "Learn concepts" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "mode-radio" })
          ] }),
          /* @__PURE__ */ jsxs("button", { type: "button", className: `mode-option ${mode === "quiz" ? "selected" : ""}`, onClick: () => setMode("quiz"), children: [
            /* @__PURE__ */ jsx("span", { className: "mode-icon mode-peach", children: /* @__PURE__ */ jsx(Target, { size: 19 }) }),
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("b", { children: "Quiz" }),
              /* @__PURE__ */ jsx("small", { children: "Test knowledge" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "mode-radio" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "options-row", children: [
          /* @__PURE__ */ jsxs("label", { className: "field-label", children: [
            "DIFFICULTY",
            /* @__PURE__ */ jsxs("select", { value: difficulty, onChange: (event) => setDifficulty(event.target.value), children: [
              /* @__PURE__ */ jsx("option", { value: "easy", children: "Easy" }),
              /* @__PURE__ */ jsx("option", { value: "medium", children: "Medium" }),
              /* @__PURE__ */ jsx("option", { value: "hard", children: "Hard" })
            ] })
          ] }),
          mode !== "quiz" && /* @__PURE__ */ jsxs("label", { className: "field-label", children: [
            "FLASHCARDS",
            /* @__PURE__ */ jsx("select", { value: flashcardCount, onChange: (event) => setFlashcardCount(Number(event.target.value)), children: [5, 8, 10, 12, 15, 20].map((count) => /* @__PURE__ */ jsxs("option", { value: count, children: [
              count,
              " cards"
            ] }, count)) })
          ] }),
          mode !== "flashcards" && /* @__PURE__ */ jsxs("label", { className: "field-label", children: [
            "QUIZ QUESTIONS",
            /* @__PURE__ */ jsx("select", { value: questionCount, onChange: (event) => setQuestionCount(Number(event.target.value)), children: [5, 8, 10, 12, 15, 20].map((count) => /* @__PURE__ */ jsxs("option", { value: count, children: [
              count,
              " questions"
            ] }, count)) })
          ] })
        ] }),
        error && /* @__PURE__ */ jsxs("div", { className: "error-banner", children: [
          /* @__PURE__ */ jsx(AlertCircle, { size: 17 }),
          /* @__PURE__ */ jsx("span", { children: error })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "generate-button", type: "submit", disabled: isGenerating || sourceText.trim().length < 10, children: isGenerating ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(LoaderCircle, { className: "spin", size: 18 }),
          " Creating your study set..."
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(BookOpen, { size: 17 }),
          " Generate study material ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "secure-note", children: [
          /* @__PURE__ */ jsx(LockKeyhole, { size: 13 }),
          " Organised practice material from your notes"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("aside", { className: "create-aside", children: [
        /* @__PURE__ */ jsxs("div", { className: "aside-preview", children: [
          /* @__PURE__ */ jsxs("div", { className: "preview-top", children: [
            /* @__PURE__ */ jsx("span", { className: "preview-dot" }),
            /* @__PURE__ */ jsx("span", { children: "YOUR STUDY SET" }),
            /* @__PURE__ */ jsx("span", { className: "preview-live", children: "LIVE PREVIEW" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "preview-visual", children: [
            /* @__PURE__ */ jsx("div", { className: "preview-card preview-card-back" }),
            /* @__PURE__ */ jsxs("div", { className: "preview-card preview-card-front", children: [
              /* @__PURE__ */ jsx("div", { className: "preview-chip", children: "FLASHCARD 01" }),
              /* @__PURE__ */ jsxs("div", { className: "preview-question", children: [
                "What will you",
                /* @__PURE__ */ jsx("br", {}),
                "remember today?"
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "preview-flip", children: [
                /* @__PURE__ */ jsx(RotateCcw, { size: 13 }),
                " Flip to reveal"
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "preview-orbit", children: "\u2726" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "preview-footer", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "preview-count", children: mode === "quiz" ? questionCount : mode === "flashcards" ? flashcardCount : flashcardCount + questionCount }),
              /* @__PURE__ */ jsx("span", { children: "learning items" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "preview-footer-icon", children: /* @__PURE__ */ jsx(BookOpen, { size: 19 }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "how-it-works", children: [
          /* @__PURE__ */ jsxs("h3", { children: [
            /* @__PURE__ */ jsx(BookOpen, { size: 16 }),
            " How it works"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "how-step", children: [
            /* @__PURE__ */ jsx("span", { children: "1" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("b", { children: "Share your notes" }),
              /* @__PURE__ */ jsx("p", { children: "Paste material or enter a topic." })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "how-step", children: [
            /* @__PURE__ */ jsx("span", { children: "2" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("b", { children: "Your study set is prepared" }),
              /* @__PURE__ */ jsx("p", { children: "We validate the generated learning data." })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "how-step", children: [
            /* @__PURE__ */ jsx("span", { children: "3" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("b", { children: "Practice and improve" }),
              /* @__PURE__ */ jsx("p", { children: "Review cards, take quizzes, retry misses." })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function Flashcards({ studySet, index, card, flipped, onFlip, onPrevious, onNext, onMarkKnown, onMarkDifficult, onQuiz, onShuffle, onDashboard, canPrevious, canNext }) {
  const known = studySet.knownCardIds.includes(card.id);
  const difficult = studySet.difficultCardIds.includes(card.id);
  const progress = (index + 1) / studySet.flashcards.length * 100;
  return /* @__PURE__ */ jsxs("div", { className: "study-page page-enter", children: [
    /* @__PURE__ */ jsxs("button", { className: "back-link", onClick: onDashboard, children: [
      /* @__PURE__ */ jsx(ArrowLeft, { size: 15 }),
      " Back to overview"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "study-title-row", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "eyebrow", children: [
          /* @__PURE__ */ jsx(BookOpen, { size: 14 }),
          " FLASHCARD SESSION"
        ] }),
        /* @__PURE__ */ jsx("h1", { children: studySet.title }),
        /* @__PURE__ */ jsx("p", { children: studySet.summary })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "study-title-actions", children: [
        /* @__PURE__ */ jsxs("button", { className: "secondary-button", onClick: onShuffle, children: [
          /* @__PURE__ */ jsx(Shuffle, { size: 14 }),
          " Shuffle"
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "secondary-button quiz-top-button", onClick: onQuiz, disabled: !studySet.quiz.length, children: [
          /* @__PURE__ */ jsx(Zap, { size: 15 }),
          " Take quiz"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "session-progress", children: [
      /* @__PURE__ */ jsxs("div", { className: "session-progress-top", children: [
        /* @__PURE__ */ jsx("span", { children: "YOUR PROGRESS" }),
        /* @__PURE__ */ jsxs("b", { children: [
          index + 1,
          " ",
          /* @__PURE__ */ jsx("i", { children: "/" }),
          " ",
          studySet.flashcards.length
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "progress-track", children: /* @__PURE__ */ jsx("div", { style: { width: `${progress}%` } }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flashcard-stage", children: [
      /* @__PURE__ */ jsxs("div", { className: "flashcard-topline", children: [
        /* @__PURE__ */ jsxs("span", { className: "card-difficulty", children: [
          card.difficulty.toUpperCase(),
          " LEVEL"
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "card-hint", children: [
          /* @__PURE__ */ jsx(Command, { size: 13 }),
          " Click card to flip"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("button", { className: `flashcard ${flipped ? "is-flipped" : ""}`, onClick: onFlip, "aria-label": flipped ? "Show question" : "Reveal answer", children: [
        /* @__PURE__ */ jsxs("span", { className: "flashcard-face flashcard-front", children: [
          /* @__PURE__ */ jsxs("span", { className: "flashcard-label", children: [
            "QUESTION ",
            /* @__PURE__ */ jsx("span", { children: String(index + 1).padStart(2, "0") })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "flashcard-main-text", children: card.front }),
          /* @__PURE__ */ jsxs("span", { className: "flashcard-bottom", children: [
            /* @__PURE__ */ jsx("span", { className: "flip-symbol", children: /* @__PURE__ */ jsx(RotateCcw, { size: 15 }) }),
            " Click anywhere to reveal answer"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "flashcard-face flashcard-back", children: [
          /* @__PURE__ */ jsxs("span", { className: "flashcard-label", children: [
            "ANSWER ",
            /* @__PURE__ */ jsx(CheckCircle2, { size: 15 })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "flashcard-main-text answer-text", children: card.back }),
          /* @__PURE__ */ jsxs("span", { className: "flashcard-bottom", children: [
            /* @__PURE__ */ jsx("span", { className: "flip-symbol", children: /* @__PURE__ */ jsx(RotateCcw, { size: 15 }) }),
            " Click anywhere to see question"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flashcard-actions", children: [
        /* @__PURE__ */ jsxs("button", { className: `mark-button mark-difficult ${difficult ? "marked" : ""}`, onClick: onMarkDifficult, children: [
          /* @__PURE__ */ jsx(Flame, { size: 16 }),
          " Difficult"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flashcard-nav", children: [
          /* @__PURE__ */ jsx("button", { className: "icon-button nav-round", onClick: onPrevious, disabled: !canPrevious, "aria-label": "Previous card", children: /* @__PURE__ */ jsx(ArrowLeft, { size: 18 }) }),
          /* @__PURE__ */ jsx("button", { className: "icon-button nav-round", onClick: onNext, disabled: !canNext, "aria-label": "Next card", children: /* @__PURE__ */ jsx(ArrowRight, { size: 18 }) })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: `mark-button mark-known ${known ? "marked" : ""}`, onClick: onMarkKnown, children: [
          /* @__PURE__ */ jsx(Check, { size: 16 }),
          " Got it"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flashcard-session-bottom", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          studySet.knownCardIds.length,
          " mastered ",
          /* @__PURE__ */ jsx("i", { children: "\xB7" }),
          " ",
          studySet.difficultCardIds.length,
          " to revisit"
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Use ",
          /* @__PURE__ */ jsx("kbd", { children: "\u2190" }),
          " ",
          /* @__PURE__ */ jsx("kbd", { children: "\u2192" }),
          " to navigate"
        ] })
      ] })
    ] })
  ] });
}
function Quiz({ set, question, index, total, mode, selected, submitted, onSelect, onSubmit, onNext, onExit }) {
  const letters = ["A", "B", "C", "D"];
  const progress = (index + (submitted ? 1 : 0)) / total * 100;
  return /* @__PURE__ */ jsxs("div", { className: "quiz-page page-enter", children: [
    /* @__PURE__ */ jsxs("button", { className: "back-link", onClick: onExit, children: [
      /* @__PURE__ */ jsx(ArrowLeft, { size: 15 }),
      " Exit quiz"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "quiz-heading", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "eyebrow", children: [
          /* @__PURE__ */ jsx(Target, { size: 14 }),
          " ",
          mode === "revision" ? "FOCUSED REVISION" : "KNOWLEDGE CHECK"
        ] }),
        /* @__PURE__ */ jsx("h1", { children: mode === "revision" ? "Let's strengthen the tricky bits." : "Let's see what you know." }),
        /* @__PURE__ */ jsx("p", { children: set.title })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "quiz-counter", children: [
        /* @__PURE__ */ jsx("span", { children: "QUESTION" }),
        /* @__PURE__ */ jsxs("b", { children: [
          String(index + 1).padStart(2, "0"),
          /* @__PURE__ */ jsxs("i", { children: [
            " / ",
            String(total).padStart(2, "0")
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "quiz-progress", children: /* @__PURE__ */ jsx("div", { style: { width: `${progress}%` } }) }),
    /* @__PURE__ */ jsxs("div", { className: "quiz-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "quiz-card-top", children: [
        /* @__PURE__ */ jsxs("span", { className: "question-tag", children: [
          "QUESTION ",
          index + 1
        ] }),
        /* @__PURE__ */ jsx("span", { className: "card-difficulty", children: question.difficulty.toUpperCase() })
      ] }),
      /* @__PURE__ */ jsx("h2", { children: question.question }),
      /* @__PURE__ */ jsx("div", { className: "answer-options", children: question.options.map((option, optionIndex) => {
        const isCorrect = optionIndex === question.correctOptionIndex;
        const isSelected = selected === optionIndex;
        let stateClass = isSelected ? "option-selected" : "";
        if (submitted && isCorrect) stateClass = "option-correct";
        else if (submitted && isSelected && !isCorrect) stateClass = "option-wrong";
        return /* @__PURE__ */ jsxs("button", { className: `answer-option ${stateClass}`, onClick: () => !submitted && onSelect(optionIndex), disabled: submitted, children: [
          /* @__PURE__ */ jsx("span", { className: "option-letter", children: letters[optionIndex] }),
          /* @__PURE__ */ jsx("span", { children: option }),
          submitted && isCorrect && /* @__PURE__ */ jsx(CheckCircle2, { size: 18, className: "option-state-icon" }),
          submitted && isSelected && !isCorrect && /* @__PURE__ */ jsx(X, { size: 18, className: "option-state-icon" })
        ] }, `${question.id}-${optionIndex}`);
      }) }),
      submitted && /* @__PURE__ */ jsxs("div", { className: `answer-explanation ${selected === question.correctOptionIndex ? "explanation-correct" : "explanation-wrong"}`, children: [
        /* @__PURE__ */ jsx("div", { className: "explanation-icon", children: selected === question.correctOptionIndex ? /* @__PURE__ */ jsx(CheckCircle2, { size: 18 }) : /* @__PURE__ */ jsx(Lightbulb, { size: 18 }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: selected === question.correctOptionIndex ? "That's right!" : "Not quite \u2014 learn from it." }),
          /* @__PURE__ */ jsx("p", { children: question.explanation })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "quiz-card-footer", children: [
        /* @__PURE__ */ jsx("span", { children: submitted ? "Answer recorded" : "Choose one answer to continue" }),
        !submitted ? /* @__PURE__ */ jsxs("button", { className: "primary-button", disabled: selected === null, onClick: onSubmit, children: [
          "Check answer ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
        ] }) : /* @__PURE__ */ jsxs("button", { className: "primary-button", onClick: onNext, children: [
          index === total - 1 ? "See my results" : "Next question",
          " ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "quiz-footnote", children: [
      /* @__PURE__ */ jsx(ShieldCheck, { size: 14 }),
      " Take your time. Understanding matters more than speed."
    ] })
  ] });
}
function Results({ attempt, set, onRetry, onRetake, onDashboard, onStudy }) {
  const correct = attempt.answers.filter((answer) => answer.isCorrect).length;
  const wrong = attempt.answers.filter((answer) => !answer.isCorrect).length;
  const retryAvailable = wrong > 0;
  const tone = attempt.score >= 80 ? "great" : attempt.score >= 50 ? "okay" : "keep-going";
  return /* @__PURE__ */ jsxs("div", { className: "results-page page-enter", children: [
    /* @__PURE__ */ jsx("div", { className: "results-back", children: /* @__PURE__ */ jsxs("button", { className: "back-link", onClick: onDashboard, children: [
      /* @__PURE__ */ jsx(ArrowLeft, { size: 15 }),
      " Back to overview"
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "results-hero", children: [
      /* @__PURE__ */ jsx("div", { className: `result-score-ring ${tone}`, children: /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("strong", { children: [
          attempt.score,
          /* @__PURE__ */ jsx("small", { children: "%" })
        ] }),
        /* @__PURE__ */ jsx("span", { children: "YOUR SCORE" })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "results-message", children: [
        /* @__PURE__ */ jsxs("div", { className: "eyebrow", children: [
          /* @__PURE__ */ jsx(Trophy, { size: 14 }),
          " ",
          attempt.mode === "revision" ? "REVISION COMPLETE" : "SESSION COMPLETE"
        ] }),
        /* @__PURE__ */ jsx("h1", { children: attempt.score >= 80 ? "You really know your stuff." : attempt.score >= 50 ? "Good progress. Keep going." : "Every attempt is progress." }),
        /* @__PURE__ */ jsx("p", { children: attempt.score >= 80 ? "Strong recall. Keep these concepts fresh with a quick review later." : "Reviewing what you missed is where the real learning happens. You have got this." }),
        /* @__PURE__ */ jsx("span", { className: "result-set-name", children: set.title })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "result-stats", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "result-stat-icon correct-icon", children: /* @__PURE__ */ jsx(Check, { size: 16 }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: correct }),
          /* @__PURE__ */ jsx("span", { children: "Correct answers" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "result-stat-icon wrong-icon", children: /* @__PURE__ */ jsx(X, { size: 16 }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: wrong }),
          /* @__PURE__ */ jsx("span", { children: "Needs another look" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "result-stat-icon total-icon", children: /* @__PURE__ */ jsx(CircleHelp, { size: 16 }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: attempt.questions.length }),
          /* @__PURE__ */ jsx("span", { children: "Total questions" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "review-section", children: [
      /* @__PURE__ */ jsxs("div", { className: "section-heading", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "section-overline", children: "LEARN FROM THE SESSION" }),
          /* @__PURE__ */ jsx("h2", { children: "Answer review" })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "review-count", children: [
          wrong,
          " to revisit"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "review-list", children: attempt.questions.map((question, index) => {
        const answer = attempt.answers.find((item) => item.questionId === question.id);
        const isCorrect = Boolean(answer?.isCorrect);
        return /* @__PURE__ */ jsxs("div", { className: "review-item", children: [
          /* @__PURE__ */ jsx("div", { className: `review-status ${isCorrect ? "review-correct" : "review-wrong"}`, children: isCorrect ? /* @__PURE__ */ jsx(Check, { size: 15 }) : /* @__PURE__ */ jsx(X, { size: 15 }) }),
          /* @__PURE__ */ jsxs("div", { className: "review-copy", children: [
            /* @__PURE__ */ jsxs("b", { children: [
              index + 1,
              ". ",
              question.question
            ] }),
            /* @__PURE__ */ jsx("p", { children: isCorrect ? `Your answer: ${question.options[answer.selectedOptionIndex]}` : `Your answer: ${answer ? question.options[answer.selectedOptionIndex] : "Not answered"} \xB7 Correct: ${question.options[question.correctOptionIndex]}` }),
            /* @__PURE__ */ jsx("span", { children: question.explanation })
          ] })
        ] }, question.id);
      }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "results-actions", children: [
      /* @__PURE__ */ jsx("button", { className: "primary-button", onClick: retryAvailable ? onRetry : onRetake, children: retryAvailable ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(RefreshCw, { size: 16 }),
        " Retry wrong answers"
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(RotateCcw, { size: 16 }),
        " Take another quiz"
      ] }) }),
      /* @__PURE__ */ jsxs("button", { className: "secondary-button", onClick: onRetake, children: [
        /* @__PURE__ */ jsx(RotateCcw, { size: 15 }),
        " Retake full quiz"
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "text-button", onClick: onStudy, children: [
        /* @__PURE__ */ jsx(BookOpen, { size: 15 }),
        " Review flashcards"
      ] })
    ] })
  ] });
}
function EmptyPanel({ title, description, onAction, actionLabel }) {
  return /* @__PURE__ */ jsxs("div", { className: "empty-panel page-enter", children: [
    /* @__PURE__ */ jsx("div", { className: "empty-panel-icon", children: /* @__PURE__ */ jsx(BookOpen, { size: 27 }) }),
    /* @__PURE__ */ jsx("h2", { children: title }),
    /* @__PURE__ */ jsx("p", { children: description }),
    /* @__PURE__ */ jsxs("button", { className: "primary-button", onClick: onAction, children: [
      actionLabel,
      " ",
      /* @__PURE__ */ jsx(ArrowRight, { size: 15 })
    ] })
  ] });
}
var App_default = App;
export {
  App_default as default
};
