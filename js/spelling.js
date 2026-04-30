let listName = '';
let currentList = [];
let currentIndex = 0;
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
  document.getElementById('mode-badge').textContent = random ? 'Random Spelling' : 'Normal Spelling';
  document.getElementById('spelling-input').addEventListener('keypress', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      checkSpellingAnswer();
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
  document.getElementById('spelling-input').value = '';
  setTimeout(() => { pronounceWord(); document.getElementById('spelling-input').focus(); }, 300);
}

function pronounceWord() {
  const settings = getSettings();
  speakText(currentList[currentIndex].w, settings.voiceRateWord, 1, 1);
}

function checkSpellingAnswer() {
  const input = document.getElementById('spelling-input');
  const typed = input.value.toLowerCase().trim();
  const item = currentList[currentIndex];
  const correct = item.w.toLowerCase().trim();
  const feedback = document.getElementById('feedback');
  attemptCountForCurrentWord++;

  if (typed === correct) {
    attempts.push({ word: item.w, attempts: attemptCountForCurrentWord, firstAttemptCorrect: attemptCountForCurrentWord === 1 });
    feedback.textContent = 'Correct! ✨';
    feedback.className = 'feedback success-text';
    setTimeout(nextWordOrFinish, 850);
  } else {
    feedback.textContent = 'Try again!';
    feedback.className = 'feedback error-text';
    input.value = '';
    pronounceWord();
    input.focus();
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
    mode: 'Spelling',
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
  document.getElementById('spelling-screen').classList.add('hidden');
  const result = document.getElementById('result-screen');
  result.classList.remove('hidden');
  const weak = record.weakWords.length ? record.weakWords.join(', ') : 'None';
  result.innerHTML = `
    <h2>🎉 Spelling Completed</h2>
    <div class="result-box">
      <strong>List:</strong> ${record.listName}<br>
      <strong>Mode:</strong> ${record.random ? 'Random Spelling' : 'Spelling'}<br>
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
  document.getElementById('spelling-screen').classList.remove('hidden');
  loadWord();
}

function shareResult() {
  const record = getHistory()[0];
  const text = `SpellMaster Result\nList: ${record.listName}\nMode: ${record.random ? 'Random Spelling' : 'Spelling'}\nFirst-try score: ${record.correctFirstTry}/${record.total}\nWeak words: ${record.weakWords.length ? record.weakWords.join(', ') : 'None'}\nTime: ${formatDuration(record.durationMs)}`;
  if (navigator.share) navigator.share({ text });
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
