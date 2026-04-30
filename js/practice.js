let listName = '';
let currentList = [];
let currentIndex = 0;
let lockedChars = [];
let attemptCountForCurrentWord = 0;
let attempts = [];
let startedAt = new Date().toISOString();
let random = false;

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
  loadWord();
});

function loadWord() {
  stopSpeech();
  attemptCountForCurrentWord = 0;
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
  setTimeout(() => { pronounceSentence(); focusInput(); }, 300);
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

function focusInput() { document.getElementById('practice-input').focus(); }
function pronounceSentence() {
  const settings = getSettings();
  speakText(currentList[currentIndex].s, settings.voiceRateSentence, 1, 1);
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
    attempts.push({ word: item.w, attempts: attemptCountForCurrentWord, firstAttemptCorrect: attemptCountForCurrentWord === 1 });
    feedback.textContent = 'Correct! ✨';
    feedback.className = 'feedback success-text';
    setTimeout(nextWordOrFinish, 850);
  } else {
    feedback.textContent = 'Some letters are correct. Try the missing letters again.';
    feedback.className = 'feedback error-text';
    focusInput();
  }
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
  addHistoryRecord(record);
  showResult(record);
}

function showResult(record) {
  document.getElementById('practice-screen').classList.add('hidden');
  const result = document.getElementById('result-screen');
  result.classList.remove('hidden');
  const weak = record.weakWords.length ? record.weakWords.join(', ') : 'None';
  result.innerHTML = `
    <h2>🎉 Practice Completed</h2>
    <div class="result-box">
      <strong>List:</strong> ${record.listName}<br>
      <strong>Mode:</strong> ${record.random ? 'Random Practice' : 'Practice'}<br>
      <strong>First-try score:</strong> ${record.correctFirstTry} / ${record.total}<br>
      <strong>Weak words:</strong> ${weak}<br>
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
  startedAt = new Date().toISOString();
  document.getElementById('result-screen').classList.add('hidden');
  document.getElementById('practice-screen').classList.remove('hidden');
  loadWord();
}

function shareResult() {
  const record = getHistory()[0];
  const text = `SpellMaster Result\nList: ${record.listName}\nMode: ${record.random ? 'Random Practice' : 'Practice'}\nFirst-try score: ${record.correctFirstTry}/${record.total}\nWeak words: ${record.weakWords.length ? record.weakWords.join(', ') : 'None'}\nTime: ${formatDuration(record.durationMs)}`;
  if (navigator.share) navigator.share({ text });
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
