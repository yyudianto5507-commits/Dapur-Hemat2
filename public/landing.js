/* Landing page: tombol "Dengarkan penjelasan" memakai suara bawaan HP (Web Speech API, bahasa Indonesia). */
(function () {
  const btn = document.getElementById("listenBtn");
  const note = document.getElementById("listenNote");
  const video = document.getElementById("demoVideo");
  if (!btn) return;
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
    btn.hidden = true;
    note.textContent = "Putar videonya untuk melihat cara kerja Dapur Hemat.";
    return;
  }
  const TEXT = [
    "Bingung mau masak apa? Uang belanja mepet? Pakai Dapur Hemat.",
    "Pertama, isi budget harian dan jumlah orang di rumah.",
    "Kedua, centang bahan yang masih ada di kulkas, misalnya tempe, telur, atau bayam.",
    "Ketiga, tekan Susun Menu. Menu lauk dan sayur untuk beberapa hari langsung jadi, lengkap dengan cara masak dan perkiraan belanjanya.",
    "Daftar belanjanya tinggal dicentang, atau dikirim ke WhatsApp.",
    "Dapur Hemat gratis dicoba, tanpa daftar akun, dan bisa dipasang di HP. Untuk rencana tiga puluh hari dan ide MPASI, ada pilihan Premium."
  ];
  let speaking = false;
  const pickVoice = () => {
    const voices = synth.getVoices();
    return voices.find((v) => /^id(-|_|$)/i.test(v.lang)) || voices.find((v) => /indonesia/i.test(v.name)) || null;
  };
  const stop = () => { synth.cancel(); speaking = false; btn.textContent = "▶ Dengarkan penjelasan"; btn.setAttribute("aria-pressed", "false"); };
  btn.addEventListener("click", () => {
    if (speaking) { stop(); return; }
    if (video && !video.paused) video.pause();
    const voice = pickVoice();
    if (!voice && synth.getVoices().length) note.textContent = "HP ini belum punya suara bahasa Indonesia, jadi logat bacaan bisa terdengar asing.";
    synth.cancel();
    TEXT.forEach((t, i) => {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "id-ID"; if (voice) u.voice = voice; u.rate = 0.95;
      if (i === TEXT.length - 1) u.onend = stop;
      u.onerror = stop;
      synth.speak(u);
    });
    speaking = true; btn.textContent = "■ Hentikan"; btn.setAttribute("aria-pressed", "true");
  });
  if (video) video.addEventListener("play", () => { if (speaking) stop(); });
  window.addEventListener("pagehide", () => synth.cancel());
})();
