import { soundFX } from './soundEffects.js';
import { gradeAnswerSmart } from './semanticGrader.js';

const AVATARS = ['⚖️', '🏛️', '🦁', '🦅', '🐉', '🛡️', '⚔️', '👑', '🦉', '🔥'];
const HISTORY_STORAGE_KEY = 'lawgame_asked_question_ids_v1';
const SETTINGS_STORAGE_KEY = 'lawgame_settings_v1';

const DEFAULT_SETTINGS = {
  teamAName: 'Đội Công Lý (A)',
  teamAAvatar: '⚖️',
  teamBName: 'Đội Thượng Tôn (B)',
  teamBAvatar: '🏛️',
  teamAKey: 'F',
  teamBKey: 'J',
  questionCount: 10,
  defaultAnswerMode: 'VOICE', // 'VOICE' (cố định 30s) | 'TEXT' (mặc định 120s hoặc tùy chọn)
  voiceTimeLimit: 30,
  textTimePreset: 'DEFAULT', // 'DEFAULT' (120s) | 'CUSTOM' (tùy chọn giây/phút)
  textCustomValue: 2,
  textCustomUnit: 'MINUTES', // 'SECONDS' | 'MINUTES'
  textTimeLimit: 120, // Mặc định 120s khi chọn nhập văn bản (0 = Không giới hạn)
  soundEnabled: true,
  difficultyFilter: 'ALL'
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generate deterministic stars for Van Gogh Starry Night background
const STARS = Array.from({ length: 85 }, (_, i) => ({
  id: i,
  x: (i * 37.3 + 13) % 100,
  y: (i * 61.7 + 7) % 88,
  r: (i % 5 === 0) ? 3.2 : (i % 3 === 0 ? 2.1 : 1.3),
  halo: (i % 7 === 0) ? 11 : (i % 4 === 0 ? 6 : 0),
  color: i % 4 === 0 ? '#F4D35E' : i % 6 === 0 ? '#EE964B' : '#FFF8D6',
  delay: `${(i * 0.27).toFixed(2)}s`,
  duration: `${(2.4 + (i % 5) * 0.65).toFixed(2)}s`
}));

function renderStarryNightHTML(spotlightTeam) {
  const starsSvg = STARS.map(s => `
    <g class="starry-star" style="animation-delay:${s.delay};animation-duration:${s.duration}">
      ${s.halo > 0 ? `<circle cx="${s.x}%" cy="${s.y}%" r="${s.halo}" fill="${s.color}" opacity="0.16"/>` : ''}
      <circle cx="${s.x}%" cy="${s.y}%" r="${s.r}" fill="${s.color}"/>
    </g>
  `).join('');

  let spotlightHtml = '';
  if (spotlightTeam === 'A') {
    spotlightHtml = `<div class="arena-spotlight spotlight-left"></div>`;
  } else if (spotlightTeam === 'B') {
    spotlightHtml = `<div class="arena-spotlight spotlight-right"></div>`;
  }

  return `
    <div class="starry-bg-wrapper" aria-hidden="true">
      <svg class="starry-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="moonGlow" cx="85%" cy="16%" r="18%">
            <stop offset="0%" stop-color="#F4D35E" stop-opacity="0.95" />
            <stop offset="35%" stop-color="#EE964B" stop-opacity="0.45" />
            <stop offset="70%" stop-color="#3A506B" stop-opacity="0.15" />
            <stop offset="100%" stop-color="#0B132B" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="swirlGlow1" cx="32%" cy="28%" r="35%">
            <stop offset="0%" stop-color="#3A506B" stop-opacity="0.55" />
            <stop offset="60%" stop-color="#1C2541" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#0B132B" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="goldBrush" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#3A506B" stop-opacity="0.1" />
            <stop offset="50%" stop-color="#F4D35E" stop-opacity="0.45" />
            <stop offset="85%" stop-color="#EE964B" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#1C2541" stop-opacity="0" />
          </linearGradient>
        </defs>
        <circle cx="1220" cy="145" r="240" fill="url(#moonGlow)" />
        <circle cx="1220" cy="145" r="46" fill="#F4D35E" opacity="0.9" />
        <circle cx="1238" cy="132" r="38" fill="#0B132B" opacity="0.88" />
        <ellipse cx="460" cy="260" rx="480" ry="220" fill="url(#swirlGlow1)" />
        <g class="van-gogh-swirls" fill="none" stroke-linecap="round">
          <path d="M-80,220 C180,100 420,340 720,200 C980,80 1160,280 1520,170" stroke="url(#goldBrush)" stroke-width="5" stroke-dasharray="18 14" opacity="0.65" />
          <path d="M-40,260 C220,140 450,380 750,240 C1010,120 1190,310 1540,210" stroke="#3A506B" stroke-width="8" stroke-dasharray="28 18" opacity="0.5" />
          <path d="M80,420 C340,310 590,510 910,370 C1150,260 1310,430 1540,350" stroke="#3A506B" stroke-width="6" stroke-dasharray="22 16" opacity="0.4" />
          <path d="M460,210 C520,160 610,180 620,240 C630,300 540,330 480,280 C430,240 450,140 550,130" stroke="#F4D35E" stroke-width="3.5" stroke-dasharray="10 12" opacity="0.5" />
          <path d="M880,290 C940,240 1020,260 1030,315 C1040,370 960,395 905,350" stroke="#EE964B" stroke-width="3" stroke-dasharray="9 11" opacity="0.45" />
        </g>
        ${starsSvg}
        <path d="M0,900 L0,790 Q180,735 380,775 T780,740 T1180,780 T1440,735 L1440,900 Z" fill="#070C1D" opacity="0.92" />
        <path d="M110,900 C115,760 130,640 142,520 C152,640 168,760 178,900 Z" fill="#050915" opacity="0.95" />
      </svg>
      ${spotlightHtml}
    </div>
  `;
}

// State store
const state = {
  allQuestions: [],
  loading: true,
  settings: (() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  })(),
  askedHistory: (() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),
  showSettingsModal: false,
  showBankModal: false,
  bankSearch: '',
  bankDiffFilter: 'ALL',

  // Match state
  phase: 'WELCOME', // WELCOME | SETUP | TRANSITION | BUZZER_OPEN | ANSWERING | GRADING | ROUND_RESULT | VICTORY
  matchQuestions: [],
  currentIndex: 0,
  teamAScore: 0,
  teamBScore: 0,
  matchHistory: [],

  // Turn state
  buzzedTeam: null, // 'A' | 'B' | null
  stealAvailable: true,
  failedTeamInRound: null,
  answerMode: 'VOICE', // 'VOICE' | 'TEXT'
  answerText: '',
  interimTranscript: '',
  isRecording: false,
  voiceError: '',
  timeLeft: 30,
  totalTime: 30,
  currentGrade: null
};

let timerInterval = null;
let transitionTimeout = null;
let recognitionInstance = null;
let confettiCleanup = null;

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));
  } catch (e) {
    console.warn(e);
  }
  soundFX.setEnabled(state.settings.soundEnabled);
}

function saveAskedHistory() {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.askedHistory));
  } catch (e) {
    console.warn(e);
  }
}

function getCurrentQuestion() {
  return state.matchQuestions[state.currentIndex] || null;
}

function getUnaskedCount() {
  const pool = state.settings.difficultyFilter === 'ALL'
    ? state.allQuestions
    : state.allQuestions.filter(q => q.difficulty === state.settings.difficultyFilter);
  const askedSet = new Set(state.askedHistory);
  return {
    totalPool: pool.length,
    remaining: pool.filter(q => !askedSet.has(q.id)).length
  };
}

function clearTimers() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (transitionTimeout) {
    clearTimeout(transitionTimeout);
    transitionTimeout = null;
  }
}

function stopVoiceRecognition() {
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch {}
    recognitionInstance = null;
  }
  state.isRecording = false;
  state.interimTranscript = '';
}

function startAnsweringTimer(seconds) {
  clearTimers();
  const total = seconds > 0 ? seconds : 0;
  state.timeLeft = total;
  state.totalTime = total > 0 ? total : 1;
  updateTimerDOM();
  if (total <= 0) return; // Unlimited

  timerInterval = setInterval(() => {
    if (state.phase !== 'ANSWERING' && state.phase !== 'BUZZER_OPEN') {
      clearTimers();
      return;
    }
    if (state.timeLeft <= 1) {
      clearTimers();
      state.timeLeft = 0;
      updateTimerDOM();
      soundFX.playTimeUp();
      handleTimeExpired();
      return;
    }
    state.timeLeft -= 1;
    if (state.timeLeft <= 5 && state.timeLeft > 0) {
      soundFX.playTick(state.timeLeft <= 2);
    }
    updateTimerDOM();
  }, 1000);
}

function getActiveModeTimeLimit(mode) {
  const m = mode || state.settings.defaultAnswerMode || 'VOICE';
  if (m === 'VOICE') return 30;
  return state.settings.textTimeLimit !== undefined ? Number(state.settings.textTimeLimit) : 120;
}

function renderTimerMarkup() {
  const isUnlimited = state.phase === 'ANSWERING' && state.answerMode === 'TEXT' && Number(state.settings.textTimeLimit) === 0;
  const isCritical = !isUnlimited && state.timeLeft <= 5 && state.timeLeft > 0 && (state.phase === 'ANSWERING' || state.phase === 'BUZZER_OPEN');
  const pct = isUnlimited ? 100 : Math.max(0, Math.min(100, Math.round((state.timeLeft / Math.max(1, state.totalTime)) * 100)));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;
  const phaseLabel = state.phase === 'BUZZER_OPEN'
    ? '⏳ Đếm ngược bấm chuông'
    : state.phase === 'ANSWERING'
      ? (state.answerMode === 'VOICE' ? '🎙️ Trả lời Voice (30s)' : `⌨️ Nhập văn bản (${isUnlimited ? '∞' : state.totalTime + 's'})`)
      : '⏱️ Đồng hồ trận đấu';

  return `
    <div class="countdown-widget ${isCritical ? 'timer-critical' : ''}">
      <div class="countdown-ring-wrap">
        <svg class="countdown-svg" width="88" height="88" viewBox="0 0 88 88">
          <circle class="countdown-track" cx="44" cy="44" r="${radius}" fill="none" stroke-width="6"></circle>
          <circle
            class="countdown-progress"
            cx="44"
            cy="44"
            r="${radius}"
            fill="none"
            stroke-width="6"
            stroke-dasharray="${circumference.toFixed(1)}"
            stroke-dashoffset="${dashOffset.toFixed(1)}"
          ></circle>
        </svg>
        <div class="countdown-center-text">
          ${isUnlimited ? '∞' : `${state.timeLeft}s`}
        </div>
      </div>
      <div class="countdown-phase-label">${phaseLabel}</div>
      <div class="countdown-bar-outer">
        <div class="countdown-bar-inner" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

function updateTimerDOM() {
  const timerEl = document.getElementById('live-timer-box');
  if (timerEl) {
    timerEl.innerHTML = renderTimerMarkup();
  }
}

async function startMatch() {
  stopVoiceRecognition();
  clearTimers();
  if (confettiCleanup) {
    confettiCleanup();
    confettiCleanup = null;
  }

  const pool = state.settings.difficultyFilter === 'ALL'
    ? state.allQuestions
    : state.allQuestions.filter(q => q.difficulty === state.settings.difficultyFilter);

  const askedSet = new Set(state.askedHistory);
  let unasked = pool.filter(q => !askedSet.has(q.id));
  let historyToSave = [...state.askedHistory];

  if (unasked.length < state.settings.questionCount) {
    const freshIds = new Set(pool.map(q => q.id));
    historyToSave = historyToSave.filter(id => !freshIds.has(id));
    unasked = [...pool];
  }

  const shuffled = [...unasked].sort(() => Math.random() - 0.5);
  const selectedMeta = shuffled.slice(0, Math.min(state.settings.questionCount, shuffled.length));

  // Load individual per-question JSON files (data/questions/qXXX.json) for any selected item without full IRAC loaded yet
  const selected = await Promise.all(
    selectedMeta.map(async (item) => {
      if (item.irac && item.question) return item;
      const fileName = item.file || `q${String(item.id).padStart(3, '0')}.json`;
      try {
        const r = await fetch(`./data/questions/${fileName}`);
        if (r.ok) return await r.json();
      } catch (e) {
        console.warn('Fallback for question file', fileName, e);
      }
      return item;
    })
  );

  const newAsked = Array.from(new Set([...historyToSave, ...selected.map(q => q.id)]));
  state.askedHistory = newAsked;
  saveAskedHistory();

  state.matchQuestions = selected;
  state.currentIndex = 0;
  state.teamAScore = 0;
  state.teamBScore = 0;
  state.matchHistory = [];
  state.buzzedTeam = null;
  state.failedTeamInRound = null;
  state.stealAvailable = true;
  state.currentGrade = null;
  state.phase = 'TRANSITION';
  render();

  soundFX.playRoundTransition();
  transitionTimeout = setTimeout(() => {
    state.phase = 'BUZZER_OPEN';
    render();
    startAnsweringTimer(30);
  }, 1300);
}

function triggerBuzzer(team) {
  if (state.phase !== 'BUZZER_OPEN') return;
  if (state.failedTeamInRound === team) return;

  if (team === 'A') {
    soundFX.playBuzzerA();
  } else {
    soundFX.playBuzzerB();
  }

  const chosenMode = state.settings.defaultAnswerMode === 'TEXT' ? 'TEXT' : 'VOICE';
  state.buzzedTeam = team;
  state.phase = 'ANSWERING';
  state.answerText = '';
  state.interimTranscript = '';
  state.voiceError = '';
  state.answerMode = chosenMode;
  render();
  startAnsweringTimer(getActiveModeTimeLimit(chosenMode));
}

function switchAnswerMode(mode) {
  stopVoiceRecognition();
  state.answerMode = mode;
  state.voiceError = '';
  const limit = getActiveModeTimeLimit(mode);
  render();
  startAnsweringTimer(limit);
}

function toggleVoiceRecording() {
  if (state.isRecording) {
    stopVoiceRecognition();
    renderAnsweringAreaOnly();
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    state.voiceError = 'Trình duyệt không hỗ trợ Web Speech API. Hệ thống tự động chuyển sang chế độ Nhập bàn phím dự phòng.';
    switchAnswerMode('TEXT');
    return;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      state.isRecording = true;
      state.voiceError = '';
      renderAnsweringAreaOnly();
    };

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += transcript + ' ';
        } else {
          interimChunk += transcript;
        }
      }
      if (finalChunk) {
        state.answerText = (state.answerText ? state.answerText.trim() + ' ' : '') + finalChunk.trim();
        const textarea = document.getElementById('answer-textarea');
        if (textarea) textarea.value = state.answerText;
      }
      state.interimTranscript = interimChunk;
      const interimEl = document.getElementById('voice-interim-box');
      if (interimEl) {
        interimEl.textContent = state.interimTranscript ? `Đang nghe: "${state.interimTranscript}"` : '';
        interimEl.style.display = state.interimTranscript ? 'block' : 'none';
      }
    };

    recognition.onerror = (err) => {
      state.isRecording = false;
      state.voiceError = `Lỗi Micro (${err.error}). Bạn có thể nhập trực tiếp bằng bàn phím bên dưới hoặc chuyển sang Chế độ Bàn phím.`;
      renderAnsweringAreaOnly();
    };

    recognition.onend = () => {
      state.isRecording = false;
      state.interimTranscript = '';
      renderAnsweringAreaOnly();
    };

    recognitionInstance = recognition;
    recognition.start();
  } catch {
    state.voiceError = 'Không thể khởi động Micro. Vui lòng sử dụng bàn phím.';
    renderAnsweringAreaOnly();
  }
}

function handleTimeExpired() {
  stopVoiceRecognition();
  const fullAnswer = `${state.answerText} ${state.interimTranscript}`.trim();
  if (fullAnswer.length >= 8) {
    submitAnswer(fullAnswer);
    return;
  }

  const currentQuestion = getCurrentQuestion();
  if (state.phase === 'ANSWERING' && state.stealAvailable && !state.failedTeamInRound) {
    state.failedTeamInRound = state.buzzedTeam;
    state.stealAvailable = false;
    state.buzzedTeam = null;
    state.phase = 'BUZZER_OPEN';
    render();
    startAnsweringTimer(state.settings.voiceTimeLimit || 30);
  } else {
    state.currentGrade = {
      accuracyPercent: 0,
      earnedPoints: 0,
      maxPoints: currentQuestion.points,
      feedback: 'Hết thời gian đếm ngược! Không đội nào ghi được điểm ở câu hỏi này.',
      breakdown: { issueScore: 0, ruleScore: 0, applicationScore: 0, conclusionScore: 0 },
      canonicalIRAC: currentQuestion.irac,
      playerAnswer: '(Hết thời gian - Không có câu trả lời)',
      team: state.buzzedTeam
    };
    state.phase = 'ROUND_RESULT';
    render();
  }
}

async function submitAnswer(overrideText) {
  clearTimers();
  stopVoiceRecognition();
  const currentQuestion = getCurrentQuestion();
  const finalSubmitted = (overrideText !== undefined ? overrideText : `${state.answerText} ${state.interimTranscript}`).trim();

  state.phase = 'GRADING';
  render();

  const result = await gradeAnswerSmart({
    question: currentQuestion,
    playerAnswer: finalSubmitted
  });

  const gradeRecord = {
    ...result,
    playerAnswer: finalSubmitted || '(Bỏ trống)',
    team: state.buzzedTeam,
    questionId: currentQuestion.id,
    questionNumber: currentQuestion.questionNumber
  };

  if (state.buzzedTeam === 'A') {
    state.teamAScore = Number((state.teamAScore + result.earnedPoints).toFixed(1));
  } else if (state.buzzedTeam === 'B') {
    state.teamBScore = Number((state.teamBScore + result.earnedPoints).toFixed(1));
  }

  state.matchHistory.push(gradeRecord);
  state.currentGrade = gradeRecord;
  soundFX.playScoreReveal();
  state.phase = 'ROUND_RESULT';
  render();
}

function nextQuestionOrFinish() {
  clearTimers();
  state.buzzedTeam = null;
  state.failedTeamInRound = null;
  state.stealAvailable = true;
  state.currentGrade = null;
  state.answerText = '';
  state.interimTranscript = '';

  if (state.currentIndex + 1 >= state.matchQuestions.length) {
    state.phase = 'VICTORY';
    soundFX.playVictoryFanfare();
    render();
    startVictoryConfetti();
  } else {
    state.currentIndex += 1;
    state.phase = 'TRANSITION';
    render();
    soundFX.playRoundTransition();
    transitionTimeout = setTimeout(() => {
      state.phase = 'BUZZER_OPEN';
      render();
      startAnsweringTimer(state.settings.voiceTimeLimit || 30);
    }, 1250);
  }
}

function resetAskedHistory() {
  state.askedHistory = [];
  saveAskedHistory();
  fetch('/api/history/reset', { method: 'POST' }).catch(() => {});
  render();
}

function startVictoryConfetti() {
  if (confettiCleanup) confettiCleanup();
  const canvas = document.getElementById('victory-confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let animId;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const colors = ['#F4D35E', '#EE964B', '#3A506B', '#60A5FA', '#34D399', '#FBBF24', '#FFF8D6'];
  const particles = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: 7 + Math.random() * 8,
    h: 4 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 3.5,
    vy: 2.2 + Math.random() * 4.2,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.14
  }));

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    animId = requestAnimationFrame(draw);
  };
  draw();

  confettiCleanup = () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
  };
}

// Keyboard Buzzer listener
window.addEventListener('keydown', (e) => {
  if (state.phase !== 'BUZZER_OPEN' || state.showSettingsModal || state.showBankModal) return;
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const pressed = e.key.toUpperCase();
  const keyA = (state.settings.teamAKey || 'F').toUpperCase();
  const keyB = (state.settings.teamBKey || 'J').toUpperCase();

  if (pressed === keyA && state.failedTeamInRound !== 'A') {
    e.preventDefault();
    triggerBuzzer('A');
  } else if (pressed === keyB && state.failedTeamInRound !== 'B') {
    e.preventDefault();
    triggerBuzzer('B');
  }
});

function renderHeaderHTML() {
  const { remaining, totalPool } = getUnaskedCount();
  return `
    <header class="top-nav">
      <div class="brand-logo" id="btn-home-logo" role="button" tabindex="0">
        <span class="brand-emblem">⚖️</span>
        <div>
          <h1 class="brand-title">SÀN ĐẤU TRANH BIỆN</h1>
          <p class="brand-subtitle">Pháp Luật Đấu Thầu • The Starry Night Edition</p>
        </div>
      </div>

      <div class="nav-actions">
        <div class="history-pill" title="Số câu hỏi chưa xuất hiện trong các ván trước">
          <span>📚 Kho đề: <strong>${remaining}/${totalPool}</strong></span>
          ${state.askedHistory.length > 0 ? `<button class="btn-mini-reset" id="btn-nav-reset-history" title="Reset lịch sử câu hỏi đã hỏi">↺ Reset (${state.askedHistory.length})</button>` : ''}
        </div>
        <button class="btn-secondary" id="btn-toggle-bgm" title="Bật/Tắt nhạc nền và âm thanh">
          ${state.settings.soundEnabled ? '🎵 Nhạc: Bật' : '🔇 Nhạc: Tắt'}
        </button>
        <button class="btn-secondary" id="btn-open-bank">📖 Ngân hàng 237 câu</button>
        <button class="btn-secondary" id="btn-open-settings">⚙️ Cài đặt</button>
      </div>
    </header>
  `;
}

function renderWelcomeHTML() {
  const { remaining, totalPool } = getUnaskedCount();
  return `
    <main class="welcome-screen">
      <section class="welcome-hero-box">
        <div class="welcome-crest-ring">
          <span class="welcome-crest-icon">⚖️</span>
        </div>
        <div class="hero-badge">✨ TRÒ CHƠI ĐỐI KHÁNG PHÁP LUẬT ĐẤU THẦU • THE STARRY NIGHT EDITION ✨</div>
        <h2 class="welcome-game-title">Sàn Đấu Tranh Biện</h2>
        <p class="welcome-game-tagline">
          2 Đội Đối Kháng • Bấm Chuông Giành Quyền • Chấm Điểm AI Theo Chuẩn IRAC (${remaining}/${totalPool} câu sẵn sàng)
        </p>

        <div class="welcome-cta-group">
          <button type="button" class="btn-enter-game" id="btn-enter-setup" ${state.loading ? 'disabled' : ''}>
            ${state.loading ? '⏳ ĐANG TẢI DỮ LIỆU...' : '🎮 VÀO CHƠI NGAY'}
          </button>
        </div>

        <div class="welcome-quick-links">
          <button type="button" class="btn-secondary" id="btn-welcome-settings">⚙️ Thiết lập &amp; Cài đặt</button>
          <button type="button" class="btn-secondary" id="btn-welcome-bank">📖 Xem 237 Câu Hỏi IRAC</button>
        </div>
      </section>

      <footer class="landing-credits">
        Một sản phẩm của Nguyễn Quốc Đạt, Đỗ Hoàng Gia Bảo, Trần Võ Đăng Khoa
      </footer>
    </main>
  `;
}

function renderLandingHTML() {
  const { remaining, totalPool } = getUnaskedCount();
  const s = state.settings;

  const avatarButtonsA = AVATARS.map(av => `
    <button type="button" class="avatar-btn ${s.teamAAvatar === av ? 'avatar-selected' : ''}" data-team="A" data-avatar="${av}">${av}</button>
  `).join('');

  const avatarButtonsB = AVATARS.map(av => `
    <button type="button" class="avatar-btn ${s.teamBAvatar === av ? 'avatar-selected' : ''}" data-team="B" data-avatar="${av}">${av}</button>
  `).join('');

  return `
    <main class="landing-container">
      <section class="hero-card">
        <div class="setup-top-bar">
          <button type="button" class="btn-secondary" id="btn-back-welcome">← Màn hình chính</button>
          <div class="hero-badge" style="margin-bottom:0">⚔️ PHÒNG CHUẨN BỊ TRẬN ĐẤU (${remaining}/${totalPool} câu chưa hỏi)</div>
          <div style="width:110px"></div>
        </div>
        <h2 class="hero-heading">Sàn Đấu Tranh Biện</h2>
        <p class="hero-desc">
          Thiết lập tên 2 đội, chọn biểu tượng và cấu hình ván đấu trước khi bước vào sàn đấu.
        </p>

        <div class="teams-setup-grid">
          <div class="team-setup-box team-a-box">
            <div class="team-box-header">
              <span class="team-avatar-large" id="preview-avatar-a">${escapeHtml(s.teamAAvatar)}</span>
              <div>
                <span class="team-tag">CHIẾN TUYẾN A</span>
                <h3>Thiết lập Đội A</h3>
              </div>
              <div class="buzzer-badge">Phím chuông: <kbd>${escapeHtml(s.teamAKey)}</kbd></div>
            </div>
            <label class="field-label">Tên Đội A</label>
            <input type="text" autocomplete="off" data-lpignore="true" data-form-type="other" class="text-input" id="input-team-a-name" value="${escapeHtml(s.teamAName)}" placeholder="Nhập tên Đội A..." />
            <label class="field-label">Chọn Biểu Tượng</label>
            <div class="avatar-picker">${avatarButtonsA}</div>
          </div>

          <div class="vs-divider">
            <div class="vs-circle">VS</div>
            <span class="vs-caption">Tranh quyền bấm chuông</span>
          </div>

          <div class="team-setup-box team-b-box">
            <div class="team-box-header">
              <span class="team-avatar-large" id="preview-avatar-b">${escapeHtml(s.teamBAvatar)}</span>
              <div>
                <span class="team-tag">CHIẾN TUYẾN B</span>
                <h3>Thiết lập Đội B</h3>
              </div>
              <div class="buzzer-badge">Phím chuông: <kbd>${escapeHtml(s.teamBKey)}</kbd></div>
            </div>
            <label class="field-label">Tên Đội B</label>
            <input type="text" autocomplete="off" data-lpignore="true" data-form-type="other" class="text-input" id="input-team-b-name" value="${escapeHtml(s.teamBName)}" placeholder="Nhập tên Đội B..." />
            <label class="field-label">Chọn Biểu Tượng</label>
            <div class="avatar-picker">${avatarButtonsB}</div>
          </div>
        </div>

        <div class="quick-match-bar">
          <div class="quick-option">
            <span>Số câu hỏi mỗi ván:</span>
            <div class="segmented-control">
              ${[10, 20, 30].map(cnt => `
                <button type="button" class="seg-btn ${s.questionCount === cnt ? 'seg-active' : ''}" data-qcount="${cnt}">${cnt} câu</button>
              `).join('')}
            </div>
          </div>

          <div class="quick-option">
            <span>Mức độ câu hỏi:</span>
            <div class="segmented-control">
              ${[
                { id: 'ALL', label: 'Tất cả (20-50đ)' },
                { id: 'EASY', label: 'Dễ (20đ)' },
                { id: 'MEDIUM', label: 'Trung bình (30đ)' },
                { id: 'HARD', label: 'Khó (50đ)' }
              ].map(d => `
                <button type="button" class="seg-btn ${s.difficultyFilter === d.id ? 'seg-active' : ''}" data-diff="${d.id}">${d.label}</button>
              `).join('')}
            </div>
          </div>

          <div class="quick-option">
            <span>Hình thức trả lời:</span>
            <div class="segmented-control">
              <button type="button" class="seg-btn ${(s.defaultAnswerMode || 'VOICE') === 'VOICE' ? 'seg-active' : ''}" data-ansmode="VOICE">🎙️ Voice (Mặc định 30s)</button>
              <button type="button" class="seg-btn ${s.defaultAnswerMode === 'TEXT' ? 'seg-active' : ''}" data-ansmode="TEXT">⌨️ Nhập văn bản (${s.textTimeLimit === 0 ? '∞' : `${s.textTimeLimit || 120}s`})</button>
            </div>
          </div>
        </div>

        <div class="hero-cta-row">
          <button class="btn-primary-gold" id="btn-start-match" ${state.loading ? 'disabled' : ''}>
            ${state.loading ? 'Đang tải ngân hàng câu hỏi...' : '⚔️ BẮT ĐẦU TRẬN ĐẤU TRANH BIỆN'}
          </button>
        </div>

        <div class="rules-grid">
          <div class="rule-mini-card">
            <h4>🔔 1. Giành quyền trả lời</h4>
            <p>Đội A nhấn phím <kbd>${escapeHtml(s.teamAKey)}</kbd>, Đội B nhấn phím <kbd>${escapeHtml(s.teamBKey)}</kbd>. Mỗi đội có âm thanh còi báo hiệu và đèn Spotlight riêng.</p>
          </div>
          <div class="rule-mini-card">
            <h4>🎙️ 2. Trả lời Voice &amp; Bàn phím</h4>
            <p>Hỗ trợ nhận diện giọng nói tiếng Việt (30s) hoặc nhập văn bản từ bàn phím (120s / Không giới hạn thời gian).</p>
          </div>
          <div class="rule-mini-card">
            <h4>🧠 3. Chấm điểm AI theo IRAC</h4>
            <p><code>Điểm = Điểm tối đa × (% Độ chính xác)</code>. Đối chiếu chi tiết Issue, Rule, Application, Conclusion sau mỗi câu.</p>
          </div>
        </div>
      </section>

      <footer class="landing-credits">
        Một sản phẩm của Nguyễn Quốc Đạt, Đỗ Hoàng Gia Bảo, Trần Võ Đăng Khoa
      </footer>
    </main>
  `;
}

function renderAnsweringBoxHTML() {
  const s = state.settings;
  const activeTeamName = state.buzzedTeam === 'A' ? s.teamAName : s.teamBName;
  const activeAvatar = state.buzzedTeam === 'A' ? s.teamAAvatar : s.teamBAvatar;

  return `
    <div class="answering-panel" id="answering-panel-container">
      <div class="answering-banner">
        <div class="answering-team-info">
          <span class="spotlight-icon">🌟</span>
          <div>
            <strong>${escapeHtml(activeAvatar)} ${escapeHtml(activeTeamName)} đang nắm quyền trả lời!</strong>
            <p>Hãy trình bày theo cấu trúc IRAC (Vấn đề pháp lý - Căn cứ Điều/Khoản - Phân tích - Kết luận)</p>
          </div>
        </div>

        <div class="mode-switcher">
          <button type="button" class="mode-btn ${state.answerMode === 'VOICE' ? 'mode-active' : ''}" id="btn-mode-voice">
            🎙️ Giọng nói (30s)
          </button>
          <button type="button" class="mode-btn ${state.answerMode === 'TEXT' ? 'mode-active' : ''}" id="btn-mode-text">
            ⌨️ Nhập văn bản (${s.textTimeLimit === 0 ? '∞' : `${s.textTimeLimit || 120}s`})
          </button>
        </div>
      </div>

      ${state.answerMode === 'VOICE' ? `
        <div class="voice-controls-box">
          <button type="button" class="btn-mic ${state.isRecording ? 'mic-recording' : ''}" id="btn-toggle-mic">
            ${state.isRecording ? '⏹️ Đang thu âm tiếng Việt... (Nhấn để dừng)' : '🎙️ Nhấn để bắt đầu nói (Voice-to-Text Tiếng Việt)'}
          </button>
          <div id="voice-interim-box" class="interim-transcript" style="display:${state.interimTranscript ? 'block' : 'none'}">
            ${state.interimTranscript ? `Đang nghe: "${escapeHtml(state.interimTranscript)}"` : ''}
          </div>
          ${state.voiceError ? `<div class="voice-error-msg">⚠️ ${escapeHtml(state.voiceError)}</div>` : ''}
        </div>
      ` : ''}

      <textarea
        id="answer-textarea"
        class="answer-textarea"
        rows="5"
        placeholder="Nhập hoặc chỉnh sửa câu trả lời tại đây... (Gợi ý: Nêu rõ Điều/Khoản của Luật Đấu thầu 2023 hoặc Nghị định 214/2025/NĐ-CP và kết luận rõ ràng)"
      >${escapeHtml(state.answerText)}</textarea>

      <div class="answering-actions">
        <button type="button" class="btn-primary-gold" id="btn-submit-answer">
          ⚖️ NỘP CÂU TRẢ LỜI &amp; CHẤM ĐIỂM AI
        </button>
      </div>
    </div>
  `;
}

function renderArenaHTML() {
  const s = state.settings;
  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) return '';

  return `
    <main class="arena-container">
      <section class="arena-hud">
        <div class="hud-team hud-team-a ${state.buzzedTeam === 'A' ? 'hud-active-spotlight' : ''}">
          <div class="hud-team-meta">
            <span class="hud-avatar">${escapeHtml(s.teamAAvatar)}</span>
            <div>
              <div class="hud-name">${escapeHtml(s.teamAName)}</div>
              <div class="hud-key-hint">Phím chuông: <kbd>${escapeHtml(s.teamAKey)}</kbd></div>
            </div>
          </div>
          <div class="hud-score">${state.teamAScore} <small>đ</small></div>
        </div>

        <div class="hud-center">
          <div class="round-pill">
            CÂU HỎI ${state.currentIndex + 1} / ${state.matchQuestions.length}
          </div>
          <div id="live-timer-box" class="timer-box">
            ${renderTimerMarkup()}
          </div>
          <button type="button" class="btn-quit-match" id="btn-quit-match">✕ Kết thúc sớm</button>
        </div>

        <div class="hud-team hud-team-b ${state.buzzedTeam === 'B' ? 'hud-active-spotlight' : ''}">
          <div class="hud-score">${state.teamBScore} <small>đ</small></div>
          <div class="hud-team-meta hud-right">
            <div>
              <div class="hud-name">${escapeHtml(s.teamBName)}</div>
              <div class="hud-key-hint">Phím chuông: <kbd>${escapeHtml(s.teamBKey)}</kbd></div>
            </div>
            <span class="hud-avatar">${escapeHtml(s.teamBAvatar)}</span>
          </div>
        </div>
      </section>

      ${state.phase === 'TRANSITION' ? `
        <div class="stage-transition-card">
          <div class="swirl-spinner"></div>
          <h2>CHẶNG ${state.currentIndex + 1} / ${state.matchQuestions.length}</h2>
          <p class="transition-diff">
            Mức độ: <strong>${escapeHtml(currentQuestion.difficultyLabel)}</strong> • Điểm tối đa: <strong>${currentQuestion.points} điểm</strong>
          </p>
        </div>
      ` : `
        <section class="question-arena-card">
          <div class="question-card-header">
            <span class="q-number-badge">Câu số ${currentQuestion.questionNumber} (Bộ đề gốc)</span>
            <span class="q-diff-badge diff-${currentQuestion.difficulty.toLowerCase()}">
              ${escapeHtml(currentQuestion.difficultyLabel)} • ${currentQuestion.points} điểm
            </span>
          </div>

          <h2 class="question-verbatim-text">${escapeHtml(currentQuestion.question)}</h2>

          ${state.phase === 'BUZZER_OPEN' ? `
            <div class="buzzer-arena-zone">
              ${state.failedTeamInRound ? `
                <div class="steal-alert">
                  ⚠️ Đội ${state.failedTeamInRound === 'A' ? escapeHtml(s.teamAName) : escapeHtml(s.teamBName)} đã hết giờ! Cơ hội giành quyền trả lời thuộc về đội còn lại!
                </div>
              ` : ''}
              <div class="buzzer-buttons-row">
                <button
                  type="button"
                  class="buzzer-big-btn buzzer-a ${state.failedTeamInRound === 'A' ? 'buzzer-disabled' : ''}"
                  id="btn-buzz-a"
                  ${state.failedTeamInRound === 'A' ? 'disabled' : ''}
                >
                  <span class="buzzer-icon">${escapeHtml(s.teamAAvatar)}</span>
                  <span class="buzzer-team-title">${escapeHtml(s.teamAName)}</span>
                  <span class="buzzer-key-Prompt">Nhấn phím <kbd>${escapeHtml(s.teamAKey)}</kbd> hoặc Click</span>
                </button>

                <button
                  type="button"
                  class="buzzer-big-btn buzzer-b ${state.failedTeamInRound === 'B' ? 'buzzer-disabled' : ''}"
                  id="btn-buzz-b"
                  ${state.failedTeamInRound === 'B' ? 'disabled' : ''}
                >
                  <span class="buzzer-icon">${escapeHtml(s.teamBAvatar)}</span>
                  <span class="buzzer-team-title">${escapeHtml(s.teamBName)}</span>
                  <span class="buzzer-key-Prompt">Nhấn phím <kbd>${escapeHtml(s.teamBKey)}</kbd> hoặc Click</span>
                </button>
              </div>
            </div>
          ` : ''}

          ${state.phase === 'ANSWERING' ? renderAnsweringBoxHTML() : ''}

          ${state.phase === 'GRADING' ? `
            <div class="grading-loading-box">
              <div class="swirl-spinner"></div>
              <p>Hệ thống AI đang phân tích ngữ nghĩa &amp; căn cứ pháp lý theo cấu trúc IRAC...</p>
            </div>
          ` : ''}

          ${state.phase === 'ROUND_RESULT' && state.currentGrade ? `
            <div class="round-result-panel">
              <div class="score-summary-banner">
                <div class="score-circle">
                  <span class="accuracy-big">${state.currentGrade.accuracyPercent}%</span>
                  <span class="accuracy-label">Độ chính xác</span>
                </div>

                <div class="score-formula-box">
                  <div class="formula-title">
                    ${state.currentGrade.team === 'A' ? `${escapeHtml(s.teamAAvatar)} ${escapeHtml(s.teamAName)}` : `${escapeHtml(s.teamBAvatar)} ${escapeHtml(s.teamBName)}`} nhận được:
                    <strong class="earned-points-highlight"> +${state.currentGrade.earnedPoints} / ${state.currentGrade.maxPoints} điểm</strong>
                  </div>
                  <div class="formula-math">
                    Công thức: <code>${state.currentGrade.maxPoints}đ × ${state.currentGrade.accuracyPercent}% = ${state.currentGrade.earnedPoints} điểm</code>
                  </div>
                  <p class="ai-feedback-text">${escapeHtml(state.currentGrade.feedback)}</p>
                </div>

                <div class="irac-pillar-bars">
                  <div class="pillar-item"><span>Issue:</span> <strong>${state.currentGrade.breakdown?.issueScore ?? 0}%</strong></div>
                  <div class="pillar-item"><span>Rule:</span> <strong>${state.currentGrade.breakdown?.ruleScore ?? 0}%</strong></div>
                  <div class="pillar-item"><span>Application:</span> <strong>${state.currentGrade.breakdown?.applicationScore ?? 0}%</strong></div>
                  <div class="pillar-item"><span>Conclusion:</span> <strong>${state.currentGrade.breakdown?.conclusionScore ?? 0}%</strong></div>
                </div>
              </div>

              <div class="comparison-table-wrapper">
                <h3 class="comparison-heading">📋 BẢNG ĐỐI CHIẾU CÂU TRẢ LỜI &amp; ĐÁP ÁN CHUẨN IRAC</h3>
                <div class="comparison-grid">
                  <div class="player-answer-col">
                    <h4>💬 Câu trả lời của đội chơi</h4>
                    <div class="player-answer-box">${escapeHtml(state.currentGrade.playerAnswer)}</div>
                  </div>

                  <div class="canonical-irac-col">
                    <h4>⚖️ Đáp án chuẩn IRAC (Trích xuất từ tài liệu gốc)</h4>
                    <div class="irac-blocks">
                      <div class="irac-block">
                        <span class="irac-tag tag-i">I — Issue (Vấn đề pháp lý)</span>
                        <p>${escapeHtml(currentQuestion.irac.issue)}</p>
                      </div>
                      <div class="irac-block">
                        <span class="irac-tag tag-r">R — Rule (Quy định pháp luật)</span>
                        <p>${escapeHtml(currentQuestion.irac.rule)}</p>
                      </div>
                      <div class="irac-block">
                        <span class="irac-tag tag-a">A — Application (Phân tích &amp; Áp dụng)</span>
                        <p>${escapeHtml(currentQuestion.irac.application)}</p>
                      </div>
                      <div class="irac-block">
                        <span class="irac-tag tag-c">C — Conclusion (Kết luận)</span>
                        <p>${escapeHtml(currentQuestion.irac.conclusion)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="next-round-row">
                <button type="button" class="btn-primary-gold" id="btn-next-round">
                  ${state.currentIndex + 1 >= state.matchQuestions.length
                    ? '🏆 XEM KẾT QUẢ CHUNG CUỘC & VINH DANH'
                    : '➡️ CÂU HỎI TIẾP THEO'}
                </button>
              </div>
            </div>
          ` : ''}
        </section>
      `}
    </main>
  `;
}

function renderVictoryHTML() {
  const s = state.settings;
  const isTie = Math.abs(state.teamAScore - state.teamBScore) < 0.01;
  const winnerIsA = state.teamAScore > state.teamBScore;

  return `
    <main class="victory-container">
      <canvas id="victory-confetti-canvas" class="confetti-canvas"></canvas>
      <section class="victory-card">
        <div class="victory-crown">👑</div>
        <div class="victory-subtitle">KẾT THÚC TRẬN ĐẤU TRANH BIỆN PHÁP LUẬT ĐẤU THẦU</div>
        <h2 class="victory-title">
          ${isTie
            ? '🤝 HAI ĐỘI HÒA NHAU XUẤT SẮC!'
            : winnerIsA
              ? `🏆 VINH DANH ĐỘI CHIẾN THẮNG: ${escapeHtml(s.teamAName.toUpperCase())}!`
              : `🏆 VINH DANH ĐỘI CHIẾN THẮNG: ${escapeHtml(s.teamBName.toUpperCase())}!`}
        </h2>

        <div class="final-scoreboard">
          <div class="final-team-card ${winnerIsA || isTie ? 'winner-glow' : ''}">
            <span class="final-avatar">${escapeHtml(s.teamAAvatar)}</span>
            <h3>${escapeHtml(s.teamAName)}</h3>
            <div class="final-points">${state.teamAScore} điểm</div>
          </div>

          <div class="final-vs">VS</div>

          <div class="final-team-card ${!winnerIsA || isTie ? 'winner-glow' : ''}">
            <span class="final-avatar">${escapeHtml(s.teamBAvatar)}</span>
            <h3>${escapeHtml(s.teamBName)}</h3>
            <div class="final-points">${state.teamBScore} điểm</div>
          </div>
        </div>

        <div class="authors-honor-plaque">
          <div class="plaque-header">✨ ĐỘI NGŨ THỰC HIỆN DỰ ÁN ✨</div>
          <div class="authors-names">
            <span>Nguyễn Quốc Đạt</span>
            <span class="author-dot">•</span>
            <span>Đỗ Hoàng Gia Bảo</span>
            <span class="author-dot">•</span>
            <span>Trần Võ Đăng Khoa</span>
          </div>
          <p class="plaque-sub">Môn học: Pháp luật Đấu thầu • Đại học Công nghệ Thông tin (UIT - ĐHQG TP.HCM)</p>
        </div>

        <div class="victory-actions">
          <button type="button" class="btn-primary-gold" id="btn-play-again">
            🔄 ĐẤU VÁN MỚI (KHÔNG LẶP CÂU HỎI CŨ)
          </button>
          <button type="button" class="btn-secondary" id="btn-back-landing">
            🏠 Về Trang Chủ
          </button>
        </div>
      </section>
    </main>
  `;
}

function renderSettingsModalHTML() {
  if (!state.showSettingsModal) return '';
  const s = state.settings;
  return `
    <div class="modal-backdrop" id="settings-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3>⚙️ Cài Đặt Trò Chơi &amp; Điều Khiển</h3>
          <button type="button" class="btn-close" id="btn-close-settings">✕</button>
        </div>

        <div class="modal-body">
          <div class="settings-row">
            <label>Số lượng câu hỏi mỗi ván</label>
            <select id="select-qcount">
              <option value="10" ${s.questionCount === 10 ? 'selected' : ''}>10 câu hỏi</option>
              <option value="20" ${s.questionCount === 20 ? 'selected' : ''}>20 câu hỏi</option>
              <option value="30" ${s.questionCount === 30 ? 'selected' : ''}>30 câu hỏi</option>
            </select>
          </div>

          <div class="settings-row">
            <label>Phím bấm chuông Đội A (Mặc định: F)</label>
            <input class="key-input" id="input-key-a" maxlength="1" value="${escapeHtml(s.teamAKey)}" />
          </div>

          <div class="settings-row">
            <label>Phím bấm chuông Đội B (Mặc định: J)</label>
            <input class="key-input" id="input-key-b" maxlength="1" value="${escapeHtml(s.teamBKey)}" />
          </div>

          <div class="settings-row">
            <label>Hình thức trả lời khi bấm chuông</label>
            <div class="segmented-control">
              <button type="button" class="seg-btn ${(s.defaultAnswerMode || 'VOICE') === 'VOICE' ? 'seg-active' : ''}" id="btn-setting-mode-voice">
                🎙️ Giọng nói (Voice)
              </button>
              <button type="button" class="seg-btn ${s.defaultAnswerMode === 'TEXT' ? 'seg-active' : ''}" id="btn-setting-mode-text">
                ⌨️ Nhập văn bản
              </button>
            </div>
          </div>

          ${(s.defaultAnswerMode || 'VOICE') === 'VOICE' ? `
            <div class="settings-row">
              <label>Thời gian trả lời Giọng nói (Voice)</label>
              <span class="config-summary-pill">🎙️ Mặc định cố định: <strong>30 giây (30s)</strong></span>
            </div>
          ` : `
            <div class="settings-row">
              <label>Thời gian Nhập văn bản</label>
              <div class="segmented-control">
                <button
                  type="button"
                  class="seg-btn ${(s.textTimePreset || 'DEFAULT') === 'DEFAULT' ? 'seg-active' : ''}"
                  id="btn-text-preset-default"
                >
                  Mặc định (120s)
                </button>
                <button
                  type="button"
                  class="seg-btn ${s.textTimePreset === 'CUSTOM' ? 'seg-active' : ''}"
                  id="btn-text-preset-custom"
                >
                  Tùy chọn
                </button>
              </div>
            </div>

            ${s.textTimePreset === 'CUSTOM' ? `
              <div class="settings-row settings-subrow">
                <label>Nhập thời gian tùy chọn (0 = Không giới hạn)</label>
                <div class="text-time-customizer">
                  <input
                    type="number"
                    id="input-text-custom-val"
                    class="key-input"
                    style="width:90px"
                    min="0"
                    max="600"
                    step="1"
                    autocomplete="off"
                    value="${Number(s.textCustomValue ?? (s.textCustomUnit === 'SECONDS' ? (s.textTimeLimit || 120) : 2))}"
                  />
                  <select id="select-text-custom-unit">
                    <option value="MINUTES" ${(s.textCustomUnit || 'MINUTES') === 'MINUTES' ? 'selected' : ''}>phút</option>
                    <option value="SECONDS" ${s.textCustomUnit === 'SECONDS' ? 'selected' : ''}>giây</option>
                  </select>
                  <span class="config-summary-pill" id="custom-time-computed-pill">
                    ${Number(s.textTimeLimit) === 0
                      ? '∞ Không giới hạn'
                      : `= <strong>${Number(s.textTimeLimit || 120)} giây</strong>`}
                  </span>
                </div>
              </div>
            ` : ''}
          `}

          <div class="settings-row">
            <label>Hiệu ứng âm thanh (Web Audio Synthesizer)</label>
            <input type="checkbox" id="check-sound" ${s.soundEnabled ? 'checked' : ''} />
          </div>

          <div class="settings-row">
            <label>Lịch sử câu hỏi đã hỏi (${state.askedHistory.length} câu)</label>
            <button type="button" class="btn-secondary" id="btn-modal-reset-history">↺ Xóa lịch sử câu hỏi đã hỏi</button>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-primary-gold" id="btn-save-settings">Lưu &amp; Đóng</button>
        </div>
      </div>
    </div>
  `;
}

function renderBankModalHTML() {
  if (!state.showBankModal) return '';
  const search = state.bankSearch.trim().toLowerCase();
  const filtered = state.allQuestions.filter(q => {
    const matchDiff = state.bankDiffFilter === 'ALL' || q.difficulty === state.bankDiffFilter;
    const matchSearch = !search ||
      q.question.toLowerCase().includes(search) ||
      String(q.questionNumber).includes(search) ||
      q.irac.rule.toLowerCase().includes(search);
    return matchDiff && matchSearch;
  });

  const itemsHtml = filtered.map(q => `
    <div class="bank-item-card">
      <div class="bank-item-header">
        <strong>Câu ${q.questionNumber}: ${escapeHtml(q.question)}</strong>
        <span class="q-diff-badge diff-${q.difficulty.toLowerCase()}">${escapeHtml(q.difficultyLabel)} (${q.points}đ)</span>
      </div>
      <div class="bank-irac-grid">
        <div><strong>Issue:</strong> ${escapeHtml(q.irac.issue)}</div>
        <div><strong>Rule:</strong> ${escapeHtml(q.irac.rule)}</div>
        <div><strong>Application:</strong> ${escapeHtml(q.irac.application)}</div>
        <div><strong>Conclusion:</strong> ${escapeHtml(q.irac.conclusion)}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="modal-backdrop" id="bank-backdrop">
      <div class="modal-card modal-wide">
        <div class="modal-header">
          <h3>📖 Ngân Hàng 237 Câu Hỏi &amp; Đáp Án Chuẩn IRAC</h3>
          <button type="button" class="btn-close" id="btn-close-bank">✕</button>
        </div>

        <div class="bank-filter-bar">
          <input
            class="text-input"
            id="input-bank-search"
            placeholder="Tìm kiếm theo số câu hoặc từ khóa pháp lý..."
            value="${escapeHtml(state.bankSearch)}"
          />
          <select id="select-bank-diff">
            <option value="ALL" ${state.bankDiffFilter === 'ALL' ? 'selected' : ''}>Tất cả mức độ (${state.allQuestions.length})</option>
            <option value="EASY" ${state.bankDiffFilter === 'EASY' ? 'selected' : ''}>Dễ - 20đ</option>
            <option value="MEDIUM" ${state.bankDiffFilter === 'MEDIUM' ? 'selected' : ''}>Trung bình - 30đ</option>
            <option value="HARD" ${state.bankDiffFilter === 'HARD' ? 'selected' : ''}>Khó - 50đ</option>
          </select>
        </div>

        <div class="bank-list" id="bank-list-container">
          ${itemsHtml}
        </div>
      </div>
    </div>
  `;
}

function renderAnsweringAreaOnly() {
  const container = document.getElementById('answering-panel-container');
  if (!container) {
    render();
    return;
  }
  const currentTextareaVal = document.getElementById('answer-textarea')?.value;
  if (currentTextareaVal !== undefined) {
    state.answerText = currentTextareaVal;
  }
  container.outerHTML = renderAnsweringBoxHTML();
  bindAnsweringEvents();
}

function bindAnsweringEvents() {
  document.getElementById('btn-mode-voice')?.addEventListener('click', () => switchAnswerMode('VOICE'));
  document.getElementById('btn-mode-text')?.addEventListener('click', () => switchAnswerMode('TEXT'));
  document.getElementById('btn-toggle-mic')?.addEventListener('click', () => toggleVoiceRecording());

  const textarea = document.getElementById('answer-textarea');
  if (textarea) {
    textarea.addEventListener('input', (e) => {
      state.answerText = e.target.value;
    });
  }

  document.getElementById('btn-submit-answer')?.addEventListener('click', () => {
    const val = document.getElementById('answer-textarea')?.value ?? state.answerText;
    state.answerText = val;
    submitAnswer();
  });
}

function bindEvents() {
  document.getElementById('btn-home-logo')?.addEventListener('click', () => {
    clearTimers();
    stopVoiceRecognition();
    if (confettiCleanup) {
      confettiCleanup();
      confettiCleanup = null;
    }
    state.phase = 'WELCOME';
    state.buzzedTeam = null;
    render();
  });

  document.getElementById('btn-toggle-bgm')?.addEventListener('click', () => {
    state.settings.soundEnabled = !state.settings.soundEnabled;
    saveSettings();
    render();
  });

  document.getElementById('btn-nav-reset-history')?.addEventListener('click', resetAskedHistory);
  document.getElementById('btn-open-bank')?.addEventListener('click', () => {
    state.showBankModal = true;
    render();
  });
  document.getElementById('btn-open-settings')?.addEventListener('click', () => {
    state.showSettingsModal = true;
    render();
  });

  if (state.phase === 'WELCOME') {
    document.getElementById('btn-enter-setup')?.addEventListener('click', () => {
      soundFX.playEnterGame();
      state.phase = 'SETUP';
      render();
    });
    document.getElementById('btn-welcome-settings')?.addEventListener('click', () => {
      soundFX.startBGM();
      state.showSettingsModal = true;
      render();
    });
    document.getElementById('btn-welcome-bank')?.addEventListener('click', () => {
      soundFX.startBGM();
      state.showBankModal = true;
      render();
    });
  }

  if (state.phase === 'SETUP' || state.phase === 'LANDING') {
    document.getElementById('btn-back-welcome')?.addEventListener('click', () => {
      state.phase = 'WELCOME';
      render();
    });
    document.getElementById('input-team-a-name')?.addEventListener('input', (e) => {
      state.settings.teamAName = e.target.value;
      saveSettings();
    });
    document.getElementById('input-team-b-name')?.addEventListener('input', (e) => {
      state.settings.teamBName = e.target.value;
      saveSettings();
    });

    document.querySelectorAll('.avatar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const team = btn.getAttribute('data-team');
        const avatar = btn.getAttribute('data-avatar');
        if (team === 'A') state.settings.teamAAvatar = avatar;
        else state.settings.teamBAvatar = avatar;
        saveSettings();
        render();
      });
    });

    document.querySelectorAll('[data-qcount]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.settings.questionCount = Number(btn.getAttribute('data-qcount'));
        saveSettings();
        render();
      });
    });

    document.querySelectorAll('[data-diff]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.settings.difficultyFilter = btn.getAttribute('data-diff');
        saveSettings();
        render();
      });
    });

    document.querySelectorAll('[data-ansmode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-ansmode');
        state.settings.defaultAnswerMode = mode;
        state.settings.voiceTimeLimit = 30;
        if (mode === 'TEXT' && state.settings.textTimeLimit === undefined) {
          state.settings.textTimeLimit = 120;
        }
        saveSettings();
        if (mode === 'TEXT') {
          state.showSettingsModal = true;
        }
        render();
      });
    });

    document.getElementById('btn-start-match')?.addEventListener('click', startMatch);
  }

  if (state.phase !== 'WELCOME' && state.phase !== 'SETUP' && state.phase !== 'LANDING' && state.phase !== 'VICTORY') {
    document.getElementById('btn-quit-match')?.addEventListener('click', () => {
      clearTimers();
      stopVoiceRecognition();
      state.phase = 'SETUP';
      state.buzzedTeam = null;
      render();
    });

    document.getElementById('btn-buzz-a')?.addEventListener('click', () => triggerBuzzer('A'));
    document.getElementById('btn-buzz-b')?.addEventListener('click', () => triggerBuzzer('B'));
    bindAnsweringEvents();
    document.getElementById('btn-next-round')?.addEventListener('click', nextQuestionOrFinish);
  }

  if (state.phase === 'VICTORY') {
    document.getElementById('btn-play-again')?.addEventListener('click', startMatch);
    document.getElementById('btn-back-landing')?.addEventListener('click', () => {
      if (confettiCleanup) {
        confettiCleanup();
        confettiCleanup = null;
      }
      state.phase = 'WELCOME';
      render();
    });
  }

  if (state.showSettingsModal) {
    const closeSettings = () => {
      state.showSettingsModal = false;
      render();
    };
    document.getElementById('btn-close-settings')?.addEventListener('click', closeSettings);
    document.getElementById('btn-save-settings')?.addEventListener('click', closeSettings);
    document.getElementById('settings-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'settings-backdrop') closeSettings();
    });

    document.getElementById('select-qcount')?.addEventListener('change', (e) => {
      state.settings.questionCount = Number(e.target.value);
      saveSettings();
    });
    document.getElementById('input-key-a')?.addEventListener('input', (e) => {
      state.settings.teamAKey = (e.target.value || 'F').toUpperCase();
      saveSettings();
    });
    document.getElementById('input-key-b')?.addEventListener('input', (e) => {
      state.settings.teamBKey = (e.target.value || 'J').toUpperCase();
      saveSettings();
    });
    document.getElementById('btn-setting-mode-voice')?.addEventListener('click', () => {
      state.settings.defaultAnswerMode = 'VOICE';
      state.settings.voiceTimeLimit = 30;
      saveSettings();
      render();
    });
    document.getElementById('btn-setting-mode-text')?.addEventListener('click', () => {
      state.settings.defaultAnswerMode = 'TEXT';
      if (!state.settings.textTimePreset) {
        state.settings.textTimePreset = 'DEFAULT';
      }
      if (state.settings.textTimePreset === 'DEFAULT') {
        state.settings.textTimeLimit = 120;
      }
      saveSettings();
      render();
    });
    document.getElementById('btn-text-preset-default')?.addEventListener('click', () => {
      state.settings.textTimePreset = 'DEFAULT';
      state.settings.textTimeLimit = 120;
      saveSettings();
      render();
    });
    document.getElementById('btn-text-preset-custom')?.addEventListener('click', () => {
      state.settings.textTimePreset = 'CUSTOM';
      const unit = state.settings.textCustomUnit || 'MINUTES';
      const val = state.settings.textCustomValue !== undefined ? Number(state.settings.textCustomValue) : 2;
      state.settings.textCustomUnit = unit;
      state.settings.textCustomValue = val;
      state.settings.textTimeLimit = unit === 'MINUTES' ? Math.round(val * 60) : Math.round(val);
      saveSettings();
      render();
    });
    const recomputeCustomTime = () => {
      const valInp = document.getElementById('input-text-custom-val');
      const unitSel = document.getElementById('select-text-custom-unit');
      const rawVal = Math.max(0, Math.min(600, Number(valInp?.value ?? state.settings.textCustomValue ?? 2)));
      const unit = unitSel?.value || state.settings.textCustomUnit || 'MINUTES';
      state.settings.textCustomValue = rawVal;
      state.settings.textCustomUnit = unit;
      state.settings.textTimeLimit = unit === 'MINUTES' ? Math.round(rawVal * 60) : Math.round(rawVal);
      saveSettings();
      const pill = document.getElementById('custom-time-computed-pill');
      if (pill) {
        pill.innerHTML = state.settings.textTimeLimit === 0
          ? '∞ Không giới hạn'
          : `= <strong>${state.settings.textTimeLimit} giây</strong>`;
      }
    };
    document.getElementById('input-text-custom-val')?.addEventListener('input', recomputeCustomTime);
    document.getElementById('select-text-custom-unit')?.addEventListener('change', recomputeCustomTime);
    document.getElementById('check-sound')?.addEventListener('change', (e) => {
      state.settings.soundEnabled = e.target.checked;
      saveSettings();
    });
    document.getElementById('btn-modal-reset-history')?.addEventListener('click', resetAskedHistory);
  }

  if (state.showBankModal) {
    const closeBank = () => {
      state.showBankModal = false;
      render();
    };
    document.getElementById('btn-close-bank')?.addEventListener('click', closeBank);
    document.getElementById('bank-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'bank-backdrop') closeBank();
    });

    document.getElementById('input-bank-search')?.addEventListener('input', (e) => {
      state.bankSearch = e.target.value;
      const listEl = document.getElementById('bank-list-container');
      if (listEl) {
        const search = state.bankSearch.trim().toLowerCase();
        const filtered = state.allQuestions.filter(q => {
          const matchDiff = state.bankDiffFilter === 'ALL' || q.difficulty === state.bankDiffFilter;
          const matchSearch = !search ||
            q.question.toLowerCase().includes(search) ||
            String(q.questionNumber).includes(search) ||
            q.irac.rule.toLowerCase().includes(search);
          return matchDiff && matchSearch;
        });
        listEl.innerHTML = filtered.map(q => `
          <div class="bank-item-card">
            <div class="bank-item-header">
              <strong>Câu ${q.questionNumber}: ${escapeHtml(q.question)}</strong>
              <span class="q-diff-badge diff-${q.difficulty.toLowerCase()}">${escapeHtml(q.difficultyLabel)} (${q.points}đ)</span>
            </div>
            <div class="bank-irac-grid">
              <div><strong>Issue:</strong> ${escapeHtml(q.irac.issue)}</div>
              <div><strong>Rule:</strong> ${escapeHtml(q.irac.rule)}</div>
              <div><strong>Application:</strong> ${escapeHtml(q.irac.application)}</div>
              <div><strong>Conclusion:</strong> ${escapeHtml(q.irac.conclusion)}</div>
            </div>
          </div>
        `).join('');
      }
    });

    document.getElementById('select-bank-diff')?.addEventListener('change', (e) => {
      state.bankDiffFilter = e.target.value;
      render();
    });
  }
}

function render() {
  const root = document.getElementById('root');
  if (!root) return;

  let mainContent = '';
  if (state.phase === 'WELCOME') {
    mainContent = renderWelcomeHTML();
  } else if (state.phase === 'SETUP' || state.phase === 'LANDING') {
    mainContent = renderLandingHTML();
  } else if (state.phase === 'VICTORY') {
    mainContent = renderVictoryHTML();
  } else {
    mainContent = renderArenaHTML();
  }

  root.innerHTML = `
    <div class="app-shell">
      ${renderStarryNightHTML(state.buzzedTeam)}
      ${renderHeaderHTML()}
      ${mainContent}
      ${renderSettingsModalHTML()}
      ${renderBankModalHTML()}
    </div>
  `;

  bindEvents();
}

async function initApp() {
  soundFX.setEnabled(state.settings.soundEnabled);
  render();

  try {
    // 1. Fast load from per-question manifest index.json first
    const idxRes = await fetch('./data/questions/index.json');
    if (idxRes.ok) {
      const idxData = await idxRes.json();
      if (Array.isArray(idxData.index) && idxData.index.length > 0) {
        state.allQuestions = idxData.index;
        state.loading = false;
        render();
      }
    }
    // 2. Background hydrate full IRAC bank for instant search modal
    const res = await fetch('./data/questions_irac.json');
    if (res.ok) {
      const data = await res.json();
      state.allQuestions = Array.isArray(data) ? data : (data.questions || []);
    }
  } catch (err) {
    console.error('Failed to load questions:', err);
  } finally {
    state.loading = false;
    render();
  }
}

initApp();
