let listName = '';
let currentList = [];
let currentIndex = 0;
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
  document.getElementById('mode-badge').textContent = random ? 'Random Spelling' : 'Normal Spelling';
  document.getElementById('spelling-input').addEventListener('keypress', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      checkSpellingAnswer();
    }
  });
  document.querySelectorAll('input[name="spellingPlayMode"]').forEach(radio => {
    radio.addEventListener('change', () => { applySpellingMode(true); if (typeof trackFeature === 'function') trackFeature('spelling_mode_changed', { playMode: getSpellingPlayMode() }); });
  });
  loadWord();
  if (typeof trackFeature === 'function') trackFeature('spelling_session_started', { random: !!random, words: currentList.length });
});

function loadWord() {
  stopSpeech();
  attemptCountForCurrentWord = 0;
  usedHintForCurrentWord = false;
  revealedAnswerForCurrentWord = false;
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = 'feedback';
  document.getElementById('progress').textContent = `${currentIndex + 1} / ${currentList.length}`;
  document.getElementById('spelling-input').value = '';
  renderHelperPanel(currentList[currentIndex]);
  setTimeout(() => applySpellingMode(false), 300);
}

function getSpellingPlayMode() {
  const selected = document.querySelector('input[name="spellingPlayMode"]:checked');
  return selected ? selected.value : 'audio';
}

function applySpellingMode(showMessage) {
  const mode = getSpellingPlayMode();
  const helper = document.getElementById('helper-panel');
  helper.classList.toggle('quiet-hidden', mode === 'audio');
  if (mode === 'audio' || mode === 'both') pronounceWord();
  if (showMessage) {
    const feedback = document.getElementById('feedback');
    feedback.className = 'feedback';
    feedback.textContent = mode === 'quiet'
      ? '👀 Quiet mode: use the helper clues below.'
      : mode === 'both'
        ? '🔁 Both mode: sound and helper clues are on.'
        : '🎧 Audio mode: listen and spell.';
  }
  document.getElementById('spelling-input').focus();
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

function pronounceWord() {
  const settings = getSettings();
  speakText(currentList[currentIndex].w, settings.voiceRateWord, 1, 1);
}

function showSpellingHint() {
  if (typeof trackFeature === 'function') trackFeature('spelling_hint_used');
  const item = currentList[currentIndex];
  usedHintForCurrentWord = true;
  const feedback = document.getElementById('feedback');
  const pattern = item.w.split('').map((ch, index) => {
    if (ch === ' ') return ' / ';
    if (index === 0 || index === item.w.length - 1) return ch.toLowerCase();
    return '_';
  }).join(' ');
  feedback.textContent = `💡 Hint: ${pattern}`;
  feedback.className = 'feedback warning-text';
  document.getElementById('spelling-input').focus();
}

function showSpellingAnswer() {
  if (typeof trackFeature === 'function') trackFeature('spelling_show_answer_used');
  const item = currentList[currentIndex];
  usedHintForCurrentWord = true;
  revealedAnswerForCurrentWord = true;
  const feedback = document.getElementById('feedback');
  feedback.textContent = `👀 The answer is “${item.w}”. Try typing it once.`;
  feedback.className = 'feedback warning-text';
  document.getElementById('spelling-input').value = item.w;
  document.getElementById('spelling-input').focus();
}

function skipSpellingWord() {
  if (typeof trackFeature === 'function') trackFeature('spelling_word_skipped');
  const item = currentList[currentIndex];
  skippedWords.push(item.w);
  attempts.push({ word: item.w, attempts: attemptCountForCurrentWord || 1, firstAttemptCorrect: false, skipped: true, stars: 0 });
  const feedback = document.getElementById('feedback');
  feedback.textContent = '🐊 No problem. Let’s try the next word!';
  feedback.className = 'feedback';
  setTimeout(nextWordOrFinish, 650);
}

function checkSpellingAnswer() {
  const input = document.getElementById('spelling-input');
  const typed = input.value.toLowerCase().trim();
  const item = currentList[currentIndex];
  const correct = item.w.toLowerCase().trim();
  const feedback = document.getElementById('feedback');
  attemptCountForCurrentWord++;

  if (typed === correct) {
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
    feedback.textContent = `🎉 Correct! You earned ${stars} ⭐`;
    feedback.className = 'feedback success-text';
    setTimeout(nextWordOrFinish, 850);
  } else {
    feedback.textContent = '🐊 Snap! Try again.';
    feedback.className = 'feedback error-text';
    input.value = '';
    if (getSpellingPlayMode() !== 'quiet') pronounceWord();
    input.focus();
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
    mode: 'Spelling',
    random,
    total: currentList.length,
    attempts,
    startedAt,
    endedAt: new Date().toISOString()
  });
  record.stars = starCount;
  record.skippedWords = skippedWords;
  addHistoryRecord(record);
  if (typeof trackFeature === 'function') trackFeature('spelling_session_completed', { words: record.total, stars: record.stars || 0, skipped: (record.skippedWords || []).length });
  showResult(record);
}

function showResult(record) {
  document.getElementById('spelling-screen').classList.add('hidden');
  const result = document.getElementById('result-screen');
  result.classList.remove('hidden');
  const weak = record.weakWords.length ? record.weakWords.join(', ') : 'None';
  const skipped = record.skippedWords && record.skippedWords.length ? record.skippedWords.join(', ') : 'None';
  result.innerHTML = `
    <h2>🎉 Spelling Completed</h2>
    <div class="result-box">
      <strong>List:</strong> ${record.listName}<br>
      <strong>Mode:</strong> ${record.random ? 'Random Spelling' : 'Spelling'}<br>
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
  document.getElementById('spelling-screen').classList.remove('hidden');
  loadWord();
}

function shareResult() {
  const record = getHistory()[0];
  const text = `SpellMaster Kids Result\nList: ${record.listName}\nMode: ${record.random ? 'Random Spelling' : 'Spelling'}\nStars: ${record.stars || 0}\nFirst-try score: ${record.correctFirstTry}/${record.total}\nWeak words: ${record.weakWords.length ? record.weakWords.join(', ') : 'None'}\nSkipped: ${record.skippedWords && record.skippedWords.length ? record.skippedWords.join(', ') : 'None'}\nTime: ${formatDuration(record.durationMs)}`;
  if (navigator.share) navigator.share({ text });
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
