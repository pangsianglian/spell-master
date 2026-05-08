let listName = '';
let currentList = [];
let currentIndex = 0;
let lockedChars = [];
let attemptCountForCurrentWord = 0;
let attempts = [];
let startedAt = new Date().toISOString();
let random = false;
let usedHintForCurrentWord = false;
let revealedAnswerForCurrentWord = false;
let skippedWords = [];
let starCount = 0;

window.addEventListener('load', () => {
  renderVersion();
  listName = getSelectedListNameFromUrl();
  random = isRandomMode();
  const original = getListByName(listName);
  currentList = random ? shuffleList(original) : [...original];
  document.getElementById('list-title').textContent = listName;
  document.getElementById('mode-badge').textContent = random ? 'Random Practice' : 'Normal Practice';
  document.getElementById('practice-input').addEventListener('keypress', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      checkPracticeAnswer();
    }
  });
  document.querySelectorAll('input[name="practicePlayMode"]').forEach(radio => {
    radio.addEventListener('change', () => applyPracticeMode(true));
  });
  loadWord();
});

function loadWord() {
  stopSpeech();
  attemptCountForCurrentWord = 0;
  usedHintForCurrentWord = false;
  revealedAnswerForCurrentWord = false;
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = 'feedback';
  document.getElementById('progress').textContent = `${currentIndex + 1} / ${currentList.length}`;
  const item = currentList[currentIndex];
  lockedChars = Array.from(item.w).map(ch => ch === ' ' ? ' ' : '');
  const regex = new RegExp(`\\b${escapeRegExp(item.w)}\\b`, 'gi');
  const blank = Array.from(item.w).map(ch => ch === ' ' ? ' ' : '＿').join(' ');
  document.getElementById('hint-box').textContent = item.s.replace(regex, blank);
  document.getElementById('practice-input').value = '';
  renderSlots();
  renderHelperPanel(item);
  setTimeout(() => applyPracticeMode(false), 300);
}

function getPracticePlayMode() {
  const selected = document.querySelector('input[name="practicePlayMode"]:checked');
  return selected ? selected.value : 'audio';
}

function applyPracticeMode(showMessage) {
  const mode = getPracticePlayMode();
  const helper = document.getElementById('helper-panel');
  helper.classList.toggle('quiet-hidden', mode === 'audio');
  if (mode === 'audio' || mode === 'both') pronounceSentence();
  if (showMessage) {
    const feedback = document.getElementById('feedback');
    feedback.className = 'feedback';
    feedback.textContent = mode === 'quiet'
      ? '👀 Quiet mode: use the helper clues below.'
      : mode === 'both'
        ? '🔁 Both mode: sound and helper clues are on.'
        : '🎧 Audio mode: listen and spell.';
  }
  focusInput();
}

function renderSlots() {
  const slots = document.getElementById('practice-slots');
  slots.innerHTML = '';
  lockedChars.forEach(ch => {
    const span = document.createElement('span');
    span.className = ch === ' ' ? 'slot space' : 'slot';
    span.textContent = ch === ' ' ? '' : ch;
    slots.appendChild(span);
  });
}

function renderHelperPanel(item) {
  document.getElementById('sentence-helper').textContent = hideWordInSentence(item.w, item.s);
  document.getElementById('letter-helper').textContent = shuffleLetters(item.w);
  document.getElementById('croc-helper').textContent = `Starts with “${item.w[0].toUpperCase()}” and has ${item.w.replace(/\s/g, '').length} letters.`;
}

function hideWordInSentence(word, sentence) {
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
  return sentence.replace(regex, '______');
}

function shuffleLetters(word) {
  const letters = word.replace(/\s/g, '').toLowerCase().split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join('  ');
}

function focusInput() { document.getElementById('practice-input').focus(); }
function pronounceSentence() {
  const settings = getSettings();
  speakText(currentList[currentIndex].s, settings.voiceRateSentence, 1, 1);
}

function showPracticeHint() {
  const item = currentList[currentIndex];
  usedHintForCurrentWord = true;
  const word = item.w.toLowerCase();
  for (let i = 0; i < word.length; i++) {
    if (word[i] === ' ') { lockedChars[i] = ' '; continue; }
    if (!lockedChars[i]) { lockedChars[i] = word[i]; break; }
  }
  renderSlots();
  const feedback = document.getElementById('feedback');
  feedback.textContent = '💡 A helper letter appeared. Keep going!';
  feedback.className = 'feedback';
  focusInput();
}

function showPracticeAnswer() {
  const item = currentList[currentIndex];
  revealedAnswerForCurrentWord = true;
  usedHintForCurrentWord = true;
  lockedChars = Array.from(item.w.toLowerCase());
  renderSlots();
  const feedback = document.getElementById('feedback');
  feedback.textContent = `👀 The answer is “${item.w}”. Try typing it once.`;
  feedback.className = 'feedback warning-text';
  document.getElementById('practice-input').value = item.w;
  focusInput();
}

function skipPracticeWord() {
  const item = currentList[currentIndex];
  skippedWords.push(item.w);
  attempts.push({ word: item.w, attempts: attemptCountForCurrentWord || 1, firstAttemptCorrect: false, skipped: true, stars: 0 });
  const feedback = document.getElementById('feedback');
  feedback.textContent = '🐊 That is okay. Let’s try the next word!';
  feedback.className = 'feedback';
  setTimeout(nextWordOrFinish, 650);
}

function checkPracticeAnswer() {
  const item = currentList[currentIndex];
  const word = item.w.toLowerCase();
  const typed = document.getElementById('practice-input').value.toLowerCase().trim();
  const feedback = document.getElementById('feedback');
  attemptCountForCurrentWord++;

  for (let i = 0; i < word.length; i++) {
    if (word[i] === ' ') { lockedChars[i] = ' '; continue; }
    if (lockedChars[i]) continue;
    if (typed[i] === word[i]) lockedChars[i] = word[i];
  }

  renderSlots();
  document.getElementById('practice-input').value = '';

  if (lockedChars.join('').toLowerCase() === word) {
    const stars = calculateStars();
    starCount += stars;
    attempts.push({
      word: item.w,
      attempts: attemptCountForCurrentWord,
      firstAttemptCorrect: attemptCountForCurrentWord === 1 && !usedHintForCurrentWord && !revealedAnswerForCurrentWord,
      usedHint: usedHintForCurrentWord,
      revealedAnswer: revealedAnswerForCurrentWord,
      stars
    });
    feedback.textContent = `🎉 Correct! Crocodile is happy. +${stars} ⭐`;
    feedback.className = 'feedback success-text';
    setTimeout(nextWordOrFinish, 850);
  } else {
    feedback.textContent = '🐊 Snap! Some letters are correct. Try the missing letters again.';
    feedback.className = 'feedback error-text';
    focusInput();
  }
}

function calculateStars() {
  if (revealedAnswerForCurrentWord) return 1;
  if (usedHintForCurrentWord) return 2;
  if (attemptCountForCurrentWord === 1) return 3;
  return 1;
}

function nextWordOrFinish() {
  currentIndex++;
  if (currentIndex < currentList.length) loadWord();
  else finishSession();
}

function finishSession() {
  stopSpeech();
  const record = createSessionRecord({
    listName,
    mode: 'Practice',
    random,
    total: currentList.length,
    attempts,
    startedAt,
    endedAt: new Date().toISOString()
  });
  record.stars = starCount;
  record.skippedWords = skippedWords;
  addHistoryRecord(record);
  showResult(record);
}

function showResult(record) {
  document.getElementById('practice-screen').classList.add('hidden');
  const result = document.getElementById('result-screen');
  result.classList.remove('hidden');
  const weak = record.weakWords.length ? record.weakWords.join(', ') : 'None';
  const skipped = record.skippedWords && record.skippedWords.length ? record.skippedWords.join(', ') : 'None';
  result.innerHTML = `
    <h2>🎉 Practice Completed</h2>
    <div class="result-box">
      <strong>List:</strong> ${record.listName}<br>
      <strong>Mode:</strong> ${record.random ? 'Random Practice' : 'Practice'}<br>
      <strong>Stars earned:</strong> ${record.stars || 0} ⭐<br>
      <strong>First-try score:</strong> ${record.correctFirstTry} / ${record.total}<br>
      <strong>Weak words:</strong> ${weak}<br>
      <strong>Skipped words:</strong> ${skipped}<br>
      <strong>Time taken:</strong> ${formatDuration(record.durationMs)}
    </div>
    ${record.weakWords.length ? '<button onclick="retryWeakWords()" class="warning">Retry Weak Words</button>' : ''}
    <button onclick="shareResult()" class="success">Share Result</button>
    <button onclick="window.location.href='index.html'" class="secondary">Back to Menu</button>
  `;
}

function retryWeakWords() {
  const last = getHistory()[0];
  currentList = getListByName(last.listName).filter(item => last.weakWords.includes(item.w));
  currentIndex = 0;
  attempts = [];
  skippedWords = [];
  starCount = 0;
  startedAt = new Date().toISOString();
  document.getElementById('result-screen').classList.add('hidden');
  document.getElementById('practice-screen').classList.remove('hidden');
  loadWord();
}

function shareResult() {
  const record = getHistory()[0];
  const text = `SpellMaster Kids Result\nList: ${record.listName}\nMode: ${record.random ? 'Random Practice' : 'Practice'}\nStars: ${record.stars || 0}\nFirst-try score: ${record.correctFirstTry}/${record.total}\nWeak words: ${record.weakWords.length ? record.weakWords.join(', ') : 'None'}\nSkipped: ${record.skippedWords && record.skippedWords.length ? record.skippedWords.join(', ') : 'None'}\nTime: ${formatDuration(record.durationMs)}`;
  if (navigator.share) navigator.share({ text });
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
