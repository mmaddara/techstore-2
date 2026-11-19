/* Меню доступно и без JS; JS добавляет закрытие по Escape и после выбора ссылки. */
(() => {
 const menu = document.querySelector('.mobile-menu');
 if (menu) {
  menu.addEventListener('keydown', event => {
   if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
  matchMedia('(min-width: 769px)').addEventListener('change', event => { if (event.matches) menu.open = false; });
 }
 const player = document.querySelector('[data-player]');
 if (!player) return;
 const video = player.querySelector('video');
 const controls = player.querySelector('.player-controls');
 const play = player.querySelector('[data-play]');
 const mute = player.querySelector('[data-mute]');
 const progress = player.querySelector('[data-progress]');
 const volume = player.querySelector('[data-volume]');
 const time = player.querySelector('[data-time]');
 const status = player.querySelector('[data-video-status]');
 const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
 const updateTime = () => {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  progress.disabled = duration === 0;
  progress.value = duration ? video.currentTime / duration * 100 : 0;
  progress.setAttribute('aria-valuetext', `${format(video.currentTime)} из ${format(duration)}`);
  time.textContent = `${format(video.currentTime)} / ${format(duration)}`;
 };
 play.addEventListener('click', async () => {
  if (video.paused) {
   try { await video.play(); status.textContent = ''; }
   catch { status.textContent = 'Не удалось воспроизвести видео. Проверьте наличие файла assets/techstore-film.mp4.'; }
  } else video.pause();
 });
 for (const event of ['play','pause','ended']) video.addEventListener(event, () => { play.textContent = video.paused ? 'Воспроизвести' : 'Пауза'; });
 for (const event of ['loadedmetadata','durationchange','timeupdate']) video.addEventListener(event, updateTime);
 progress.addEventListener('input', () => { if (Number.isFinite(video.duration)) video.currentTime = Number(progress.value) / 100 * video.duration; });
 volume.addEventListener('input', () => { video.volume = Number(volume.value); video.muted = video.volume === 0; });
 mute.addEventListener('click', () => { video.muted = !video.muted; if (!video.muted && video.volume === 0) video.volume = .5; });
 video.addEventListener('volumechange', () => {
  const silent = video.muted || video.volume === 0;
  mute.textContent = silent ? 'Без звука' : 'Звук';
  mute.setAttribute('aria-label', silent ? 'Включить звук' : 'Выключить звук');
  mute.setAttribute('aria-pressed', String(silent));
  volume.value = video.muted ? 0 : video.volume;
 });
 video.addEventListener('error', () => { status.textContent = 'Видео недоступно. Проверьте файл assets/techstore-film.mp4 в папке проекта.'; video.controls = true; controls.hidden = true; });
 video.volume = .5;
 video.controls = false;
 controls.hidden = false;
 updateTime();
})();
