/* =================================================================
   1. المتغيرات الأساسية وحالة الكتاب
   ================================================================= */
let currentPage = 1;
const totalPages = 11;
let hungerLevel = 0;
let correctMatches = 0;
let selectedCardId = null;
let emergeStep = 0;

// حالة النجوم المكتسبة
const earnedStars = {
  feed: false,
  color: false,
  quiz: false,
  game: false,
};

// حالة لعبة التلوين والاختبار
let activeBrushColor = "#EF4444";
let coloredPartsCount = 0;
const quizSolved = { 1: false, 2: false };

/* =================================================================
   2. نظام النجوم والمؤثرات الصوتية وتشغيل الصوت (عربي MP3 + إنجليزي تلقائي)
   ================================================================= */
function awardStar(key, rewardMsg) {
  if (earnedStars[key]) return;
  earnedStars[key] = true;
  const starEl = document.getElementById(`star-${key}`);
  if (starEl) {
    starEl.classList.remove("opacity-30", "grayscale");
    starEl.classList.add("star-earned");
  }
  playCelebrationFanfare();
  showToast(rewardMsg);

  // احتفال خاص عند جمع كل النجوم الأربعة
  if (Object.values(earnedStars).every(Boolean)) {
    setTimeout(() => {
      showToast("👑 أحسنت! جمعت كل النجوم الأربعة! 🦋");
    }, 2600);
  }
}

function playCelebrationFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    setTimeout(() => playChime(freq), i * 110);
  });
}

function playNavTone(isForward = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    const startFreq = isForward ? 440 : 523.25;
    const endFreq = isForward ? 587.33 : 392.0;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (e) {}
}

function playChime(freq = 587.33) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      freq * 1.35,
      ctx.currentTime + 0.22,
    );
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {}
}

function showToast(msg) {
  const toast = document.getElementById("toast-box");
  toast.textContent = msg;
  toast.classList.remove("opacity-0");
  setTimeout(() => toast.classList.add("opacity-0"), 2400);
}

// متغير لحفظ الصوت الشغال حالياً
let currentAudio = null;

// دالة ذكية: لو اللغة عربي بتشغل ملف MP3 من فولدر audio، ولو اتغيرت لإنجليزي بتقرا تلقائي من المتصفح
function playAudio(fileName, englishText = "") {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  // التأكد هل المستخدم فعلاً فعل ترجمة جوجل للإنجليزي ولا لأ
  const htmlEl = document.documentElement;
  const isTranslatedToEnglish =
    htmlEl.classList.contains("translated-ltr") ||
    htmlEl.lang.toLowerCase().startsWith("en");

  if (isTranslatedToEnglish) {
    let textToSpeak = englishText;
    if (
      !textToSpeak &&
      typeof event !== "undefined" &&
      event &&
      event.currentTarget
    ) {
      textToSpeak = event.currentTarget.innerText.trim();
      if (!textToSpeak) {
        const container = event.currentTarget.closest("div")?.parentElement;
        const speakableEl = container
          ? container.querySelector(".speakable")
          : null;
        if (speakableEl) textToSpeak = speakableEl.innerText.trim();
      }
    }
    speakEnglishAuto(textToSpeak);
    return;
  }

  // الوضع الافتراضي الثابت: تشغيل ملفات الصوت العربية المسجلة
  currentAudio = new Audio(`audio/${fileName}.mp3`);
  currentAudio.play().catch((err) => {
    console.warn("لم يتم العثور على ملف الصوت:", `audio/${fileName}.mp3`, err);
  });
}

// دالة النطق الآلي للإنجليزي (بدون الحاجة لأي ملفات صوت)
function speakEnglishAuto(text) {
  if (!text || !("speechSynthesis" in window)) return;
  const cleanText = text.replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim();
  if (!cleanText) return;
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
}

// دالة احتياطية للتوافق مع أي استدعاء قديم لـ speakText
function speakText(text) {
  speakEnglishAuto(text);
}

/* =================================================================
   3. التنقل بين الصفحات وإعادة فتح الكتاب
   ================================================================= */
function changePage(delta) {
  const targetPage = currentPage + delta;
  if (targetPage < 1 || targetPage > totalPages) return;

  playNavTone(delta > 0);
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  const oldPageEl = document.getElementById(`page-${currentPage}`);
  oldPageEl.classList.add("hidden");
  oldPageEl.classList.remove("grid", "flex");

  currentPage = targetPage;

  const newPageEl = document.getElementById(`page-${currentPage}`);
  newPageEl.classList.remove("hidden");
  if ([1, 8, 9, 10, 11].includes(currentPage)) {
    newPageEl.classList.add("flex");
  } else {
    newPageEl.classList.add("grid");
  }

  updateNavigationUI();
}

function updateNavigationUI() {
  const pct = (currentPage / totalPages) * 100;
  document.getElementById("progress-fill").style.width = `${pct}%`;
  document.getElementById("progress-caterpillar").style.right = `${pct}%`;
  document.getElementById("progress-text").textContent =
    `الصفحة ${currentPage} من ${totalPages}`;

  // إظهار خط منتصف الكتاب على الشاشات الكبيرة فقط في صفحات القصة 2 إلى 7
  const centerSpine = document.getElementById("book-center-spine");
  if (currentPage >= 2 && currentPage <= 7) {
    centerSpine.classList.add("md:flex");
  } else {
    centerSpine.classList.remove("md:flex");
  }

  const wrapper = document.getElementById("book-wrapper");
  if (currentPage === totalPages) {
    wrapper.classList.add("back-cover-style");
  } else {
    wrapper.classList.remove("back-cover-style");
  }

  const dots = document.querySelectorAll(".page-dot");
  dots.forEach((dot, idx) => {
    if (idx + 1 === currentPage) {
      dot.classList.remove("bg-gray-200");
      dot.classList.add("bg-emerald-600", "scale-125");
    } else {
      dot.classList.remove("bg-emerald-600", "scale-125");
      dot.classList.add("bg-gray-200");
    }
  });

  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const btnNextLabel = document.getElementById("btn-next-label");
  const btnNextIcon = document.getElementById("btn-next-icon");

  if (currentPage === 1) {
    btnPrev.classList.add("opacity-50", "pointer-events-none", "text-gray-400");
    btnPrev.classList.remove("text-gray-700");
  } else {
    btnPrev.classList.remove(
      "opacity-50",
      "pointer-events-none",
      "text-gray-400",
    );
    btnPrev.classList.add("text-gray-700");
  }

  if (currentPage === totalPages - 1) {
    btnNext.classList.remove("invisible");
    btnNextLabel.textContent = "أغلق الكتاب 📕";
    btnNextIcon.className = "fa-solid fa-book";
    document.getElementById("corner-curl").classList.remove("hidden");
  } else if (currentPage === totalPages) {
    btnNext.classList.add("invisible");
    document.getElementById("corner-curl").classList.add("hidden");
  } else {
    btnNext.classList.remove("invisible");
    btnNextLabel.textContent = "التالي";
    btnNextIcon.className = "fa-solid fa-arrow-left";
    document.getElementById("corner-curl").classList.remove("hidden");
  }
}

function reopenBook() {
  playCelebrationFanfare();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  // إعادة ضبط النجوم
  Object.keys(earnedStars).forEach((key) => {
    earnedStars[key] = false;
    const starEl = document.getElementById(`star-${key}`);
    if (starEl) {
      starEl.classList.remove("star-earned");
      starEl.classList.add("opacity-30", "grayscale");
    }
  });

  // إعادة ضبط تفاعل البيضة (صفحة 3)
  const eggBox = document.getElementById("egg-circle-box");
  const eggHint = document.getElementById("egg-tap-hint");
  if (eggBox) eggBox.classList.remove("ring-4", "ring-lime-300");
  if (eggHint) {
    eggHint.textContent = "👆 المس البيضة لتسمع صوتها";
    eggHint.className =
      "mt-3 inline-block bg-lime-100 text-lime-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-lime-300";
  }

  // إعادة ضبط إطعام اليرقة (صفحة 4)
  hungerLevel = 0;
  const avatar = document.getElementById("caterpillar-avatar");
  if (avatar) avatar.style.transform = "scale(1)";
  const feedStatus = document.getElementById("feed-status");
  if (feedStatus)
    feedStatus.textContent = "أطعم اليرقة أوراق الشجر لتكبر! (0/3)";
  document.querySelectorAll(".leaf-btn").forEach((btn) => {
    btn.classList.remove("opacity-30", "pointer-events-none");
  });

  // إعادة ضبط الشرنقة (صفحة 5)
  isCocoonBuilt = false;
  const cocoonStageImg = document.getElementById("cocoon-stage-img");
  const cocoonBox = document.getElementById("cocoon-box");
  const cocoonHint = document.getElementById("cocoon-hint");
  if (cocoonStageImg) {
    cocoonStageImg.src = "images/caterpillar2.png";
    cocoonStageImg.classList.remove("cocoon-revealed");
    cocoonStageImg.classList.add("cocoon-swing");
  }
  if (cocoonBox)
    cocoonBox.classList.remove("ring-4", "ring-yellow-400", "scale-105");
  if (cocoonHint)
    cocoonHint.textContent = "👆 اضغط لتساعد الدودة على بناء الشرنقة";

  // إعادة ضبط خروج الفراشة (صفحة 6)
  emergeStep = 0;
  const butterflyStageImg = document.getElementById("butterfly-stage-img");
  const emergeHint = document.getElementById("emerge-hint");
  if (butterflyStageImg) {
    butterflyStageImg.src = "images/emerge1.png";
    butterflyStageImg.classList.remove("flutter-active");
  }
  if (emergeHint) emergeHint.textContent = "👆 اضغط لتساعد الفراشة على الخروج";

  // إعادة ضبط التلوين والاختبار ولعبة الترتيب
  resetColoring();
  quizSolved[1] = false;
  quizSolved[2] = false;
  [1, 2].forEach((qNum) => {
    document.querySelectorAll(`.quiz-btn-${qNum}`).forEach((b) => {
      b.classList.remove(
        "border-emerald-500",
        "bg-emerald-100",
        "scale-105",
        "border-red-400",
        "bg-red-50",
      );
    });
    const fb = document.getElementById(`quiz-feedback-${qNum}`);
    if (fb) fb.textContent = "";
  });
  resetGame();

  // العودة للغلاف (صفحة 1)
  const oldPageEl = document.getElementById(`page-${currentPage}`);
  oldPageEl.classList.add("hidden");
  oldPageEl.classList.remove("grid", "flex");

  currentPage = 1;
  const firstPageEl = document.getElementById("page-1");
  firstPageEl.classList.remove("hidden");
  firstPageEl.classList.add("flex");

  updateNavigationUI();
  showToast("📖 أهلاً بك من جديد! ابدأ مغامرتك واجمع النجوم الأربعة ⭐");
}

/* =================================================================
   4. تفاعلات صفحات القصة (الغلاف - البيضة - اليرقة - الشرنقة - الخروج)
   ================================================================= */
function flutterCoverButterfly() {
  const img = document.getElementById("cover-butterfly-img");
  if (!img) return;
  playChime(783.99);
  img.classList.remove("flutter-active");
  void img.offsetWidth;
  img.classList.add("flutter-active");
  showToast("🦋 أهلاً بك في عالم الفراشات الجميل!");
}

function tapEggToHatch() {
  const box = document.getElementById("egg-circle-box");
  const hint = document.getElementById("egg-tap-hint");
  if (!box || !hint) return;

  box.classList.remove("animate-shake");
  void box.offsetWidth;
  box.classList.add("animate-shake", "ring-4", "ring-lime-300");

  playChime(523.25);
  setTimeout(() => playChime(659.25), 110);

  hint.textContent =
    "🔊 تيك.. تاك! هناك حركة بالداخل! اقلب الصفحة لترى المفاجأة ⬅️";
  hint.className =
    "mt-3 inline-block bg-lime-100 text-lime-900 text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-lime-400";
}

function feedCaterpillar(btn) {
  if (btn.classList.contains("opacity-30")) return;
  btn.classList.add("opacity-30", "pointer-events-none");
  hungerLevel++;
  playChime(523.25 + hungerLevel * 100);

  const avatar = document.getElementById("caterpillar-avatar");
  if (avatar) {
    avatar.style.transform = `scale(${1 + hungerLevel * 0.08})`;
  }

  const status = document.getElementById("feed-status");
  if (hungerLevel < 3) {
    status.textContent = `لذيذة جداً! استمر في إطعامها (${hungerLevel}/3) 🍃`;
  } else {
    status.textContent = "🎉 شبعت اليرقة وكبرت وأصبحت مستعدة للشرنقة! ✨";
    awardStar("feed", "⭐ رائع! حصلت على نجمة إطعام اليرقة!");
  }
}

let isCocoonBuilt = false;
function transformCocoon() {
  const img = document.getElementById("cocoon-stage-img");
  const box = document.getElementById("cocoon-box");
  const hint = document.getElementById("cocoon-hint");
  if (!img || !box || !hint) return;

  if (!isCocoonBuilt) {
    isCocoonBuilt = true;

    playChime(523.25);
    img.classList.remove("cocoon-swing");
    img.classList.add("silk-spinning");
    box.classList.add("ring-4", "ring-amber-300");
    hint.textContent = "🕸️ تغزل الدودة خيوط الحرير حول نفسها...";

    setTimeout(() => {
      playChime(783.99);
      img.classList.remove("silk-spinning");
      img.src = "images/cocoon1.png";
      img.alt = "الشرنقة المكتملة";
      img.classList.add("cocoon-revealed");

      box.classList.remove("ring-amber-300");
      box.classList.add("ring-yellow-400", "scale-105");
      hint.textContent = "✨ رائع! اكتملت الشرنقة وتنام اليرقة بأمان داخلها!";
    }, 600);
  } else {
    playChime(880);
    box.classList.remove("animate-shake");
    void box.offsetWidth;
    box.classList.add("animate-shake");
    showToast("💤 اليرقة نائمة بهدوء داخل الشرنقة!");
  }
}

function progressButterflyEmergence() {
  const img = document.getElementById("butterfly-stage-img");
  const hint = document.getElementById("emerge-hint");
  if (!img || !hint) return;

  emergeStep++;
  playChime(659.25 + emergeStep * 110);

  if (emergeStep === 1) {
    img.src = "images/cocoon2.png";
    img.classList.remove("animate-shake");
    void img.offsetWidth;
    img.classList.add("animate-shake");
    hint.textContent = "✨ اقتربت من الخروج! اضغط مرة أخرى لتفرد أجنحتها!";
  } else if (emergeStep === 2) {
    img.src = "images/fly2.png";
    img.classList.add("flutter-active");
    hint.textContent = "🎉 خرجت الفراشة الجميلة بأجنحتها الملونة!";
  } else {
    img.classList.remove("flutter-active");
    void img.offsetWidth;
    img.classList.add("flutter-active");
    showToast("🦋 ترفرف الفراشة بسعادة في الحديقة!");
  }
}

/* =================================================================
   5. مرسم تلوين الفراشة (صفحة 8)
   ================================================================= */
function selectColor(hex, btnEl) {
  activeBrushColor = hex;
  document.querySelectorAll(".color-swatch").forEach((b) => {
    b.classList.remove("ring-2", "ring-purple-600", "scale-110");
  });
  btnEl.classList.add("ring-2", "ring-purple-600", "scale-110");
  playChime(587.33);
}

function paintWing(pathEl) {
  if (!pathEl.dataset.painted) {
    pathEl.dataset.painted = "true";
    coloredPartsCount++;
  }
  pathEl.setAttribute("fill", activeBrushColor);
  playChime(698.46);

  if (coloredPartsCount >= 4) {
    awardStar("color", "⭐ مبدع! حصلت على نجمة تلوين الفراشة!");
  }
}

function resetColoring() {
  document.querySelectorAll("#coloring-butterfly .wing-part").forEach((el) => {
    const defaultFill =
      el.tagName.toLowerCase() === "circle" ? "#E5E7EB" : "#F3F4F6";
    el.setAttribute("fill", defaultFill);
    delete el.dataset.painted;
  });
  coloredPartsCount = 0;
  playChime(440);
}

/* =================================================================
   6. الاختبار السريع (صفحة 9)
   ================================================================= */
function checkQuizAnswer(qNum, isCorrect, btnEl) {
  const feedbackEl = document.getElementById(`quiz-feedback-${qNum}`);
  if (isCorrect) {
    quizSolved[qNum] = true;
    document.querySelectorAll(`.quiz-btn-${qNum}`).forEach((b) => {
      b.classList.remove("border-red-400", "bg-red-50");
    });
    btnEl.classList.add("border-emerald-500", "bg-emerald-100", "scale-105");
    feedbackEl.textContent = "🎉 إجابة صحيحة يا بطل! أحسنت!";
    feedbackEl.className = "text-xs font-extrabold mt-2 text-emerald-700";
    playChime(783.99);

    if (quizSolved[1] && quizSolved[2]) {
      awardStar("quiz", "⭐ عبقري! حصلت على نجمة الاختبار السريع!");
    }
  } else {
    btnEl.classList.add("animate-shake", "border-red-400", "bg-red-50");
    setTimeout(() => btnEl.classList.remove("animate-shake"), 400);
    feedbackEl.textContent = "🤔 فكّر مرة أخرى يا صديقي!";
    feedbackEl.className = "text-xs font-extrabold mt-2 text-amber-700";
  }
}

/* =================================================================
   7. لعبة ترتيب المراحل (صفحة 10)
   ================================================================= */
function allowDrop(ev) {
  ev.preventDefault();
}

function dragStage(ev) {
  ev.dataTransfer.setData("text/plain", ev.target.id);
}

function selectCard(cardEl) {
  document
    .querySelectorAll(".stage-card")
    .forEach((c) => c.classList.remove("ring-2", "ring-emerald-500"));
  selectedCardId = cardEl.id;
  cardEl.classList.add("ring-2", "ring-emerald-500");
  showToast("الآن اضغط على المربع المرقّم المناسب لها! 👆");
}

function handleSlotClick(zoneEl) {
  if (!selectedCardId) return;
  const cardEl = document.getElementById(selectedCardId);
  if (cardEl) {
    evaluatePlacement(cardEl, zoneEl);
    selectedCardId = null;
  }
}

function dropStage(ev) {
  ev.preventDefault();
  const cardId = ev.dataTransfer.getData("text/plain");
  const cardEl = document.getElementById(cardId);
  const zoneEl = ev.currentTarget;
  if (cardEl && zoneEl) {
    evaluatePlacement(cardEl, zoneEl);
  }
}

function evaluatePlacement(cardEl, zoneEl) {
  if (zoneEl.classList.contains("completed")) return;

  if (cardEl.getAttribute("data-step") === zoneEl.getAttribute("data-step")) {
    playChime(659.25);
    zoneEl.classList.add(
      "completed",
      "bg-emerald-50",
      "border-solid",
      "border-emerald-500",
    );
    const label = zoneEl.querySelector(".slot-label");
    if (label) label.remove();

    cardEl.classList.remove("ring-2", "ring-emerald-500", "cursor-grab");
    cardEl.setAttribute("draggable", "false");
    zoneEl.appendChild(cardEl);

    correctMatches++;

    if (correctMatches === 4) {
      playChime(880);
      document.getElementById("game-celebration").classList.remove("hidden");
      awardStar("game", "⭐ بطل الأبطال! حصلت على نجمة الترتيب!");
    }
  } else {
    zoneEl.classList.add("animate-shake", "border-red-400");
    setTimeout(
      () => zoneEl.classList.remove("animate-shake", "border-red-400"),
      400,
    );
    showToast("حاول مرة أخرى يا بطل! 🤔");
  }
}

function resetGame() {
  correctMatches = 0;
  selectedCardId = null;
  document.getElementById("game-celebration").classList.add("hidden");
  const pool = document.getElementById("cards-pool");
  const zones = document.querySelectorAll(".drop-zone");
  const labels = ["الأولى", "الثانية", "الثالثة", "الرابعة"];

  zones.forEach((zone, idx) => {
    zone.classList.remove(
      "completed",
      "bg-emerald-50",
      "border-solid",
      "border-emerald-500",
    );
    const card = zone.querySelector(".stage-card");
    if (card) {
      card.setAttribute("draggable", "true");
      card.classList.add("cursor-grab");
      pool.appendChild(card);
    }
    if (!zone.querySelector(".slot-label")) {
      const span = document.createElement("span");
      span.className = "text-xs font-bold text-gray-400 slot-label";
      span.textContent = labels[idx];
      zone.appendChild(span);
    }
  });
}

window.onload = function () {
  updateNavigationUI();
};

// إيقاف الفيديو تلقائياً عند مغادرة صفحة 7 أو الضغط على أزرار التنقل
document.addEventListener("click", function (e) {
  const localVideo = document.getElementById("butterfly-local-video");
  const page7 = document.getElementById("page-7");
  if (!localVideo || !page7) return;

  setTimeout(() => {
    if (page7.classList.contains("hidden") && !localVideo.paused) {
      localVideo.pause();
    }
  }, 50);
});
