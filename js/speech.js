function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
function speakText(text, rate = 0.65, pitch = 1, volume = 1) {
  stopSpeech();
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'en-US';
  msg.rate = rate;
  msg.pitch = pitch;
  msg.volume = volume;
  window.speechSynthesis.speak(msg);
}
