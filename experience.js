// Витрина не перехватывает прокрутку. Переключение доступно мышью, касанием и клавиатурой.
(() => {
  const experience = document.querySelector('.experience');
  if (!experience) return;
  const choices = [...experience.querySelectorAll('[data-scene-choice]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const counter = experience.querySelector('[data-scene-count]');
  function selectScene(button) {
    const scene = button.dataset.sceneChoice;
    if (scene === experience.dataset.scene) return;
    experience.dataset.scene = scene;
    const headlines = { sound:['Большой звук.', 'Твой ритм.'], work:['Больше места', 'для идей.'], connect:['Твой взгляд.', 'Твоя история.'] };
    experience.querySelector('.scene-headline').textContent = headlines[scene][0];
    experience.querySelector('.scene-subheadline').textContent = headlines[scene][1];
    experience.querySelectorAll('[data-art]').forEach(item => { item.hidden = item.dataset.art !== scene; });
    experience.querySelectorAll('[data-info]').forEach(item => { item.hidden = item.dataset.info !== scene; });
    choices.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    counter.textContent = String(choices.indexOf(button) + 1).padStart(2, '0');
    const info = experience.querySelector(`[data-info="${scene}"]`);
    if (!motion.matches) info.animate([{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'cubic-bezier(.22,1,.36,1)'});
  }
  function step(direction) {
    const index = choices.findIndex(item => item.dataset.sceneChoice === experience.dataset.scene);
    selectScene(choices[(index + direction + choices.length) % choices.length]);
  }
  experience.querySelector('[data-scene-prev]').addEventListener('click', () => step(-1));
  experience.querySelector('[data-scene-next]').addEventListener('click', () => step(1));
  choices.forEach((button, index) => {
    button.addEventListener('click', () => selectScene(button));
    button.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + choices.length) % choices.length;
      choices[next].focus(); selectScene(choices[next]);
    });
  });
  experience.classList.add('is-ready');
})();
