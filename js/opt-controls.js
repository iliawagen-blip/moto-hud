/**
 * Stepper для числовых настроек и краткие tooltip «?».
 */
import { $ } from './util.js';

const STEPPER_IDS = [
  'opt-limit', 'opt-cam-speed-tol', 'opt-tol',
  'opt-elev-profile-h', 'opt-elev-profile-len', 'opt-elev-exag',
  'opt-fuel-count', 'opt-chevron-max'
];

const HELP_TEXTS = {
  'opt-voice': 'Голосовые подсказки манёвров и камер. Работает через синтез речи браузера.',
  'opt-path': 'Прогноз-дорожка на HUD: рельеф, шевроны, контекст перекрёстков.',
  'opt-limit': 'Лимит скорости для предупреждений камер. Подстройте под свой мотоцикл и стиль.',
  'opt-back-only': 'Предупреждать только о камерах «в спину» — встречный поток.',
  'opt-cam-speed-tol': 'Допуск превышения лимита (км/ч) перед срабатыванием предупреждения.',
  'opt-tol': 'Допуск угла направления камеры относительно вашего курса (градусы).',
  'opt-fuel-proxy': 'Прокси Cloudflare Workers для запросов топлива с телефона.',
  'opt-hud-status-mode': 'Строка GPS/CAM/T+ на HUD: всегда, по тапу 15 с или скрыта.',
  'opt-hud-finish-mode': 'Нижняя строка «осталось/ETA»: всегда, по тапу или скрыта.'
};

let activeTip = null;

function closeTip(){
  activeTip?.remove();
  activeTip = null;
}

function showTip(anchor, text){
  closeTip();
  const tip = document.createElement('div');
  tip.className = 'opt-tooltip-pop';
  tip.innerHTML = '<p>' + text + '</p><a href="#drawer-help" class="opt-tooltip-more">Подробнее →</a>';
  document.body.appendChild(tip);
  const r = anchor.getBoundingClientRect();
  tip.style.left = Math.max(8, Math.min(r.left, window.innerWidth - tip.offsetWidth - 8)) + 'px';
  tip.style.top = (r.bottom + 6) + 'px';
  activeTip = tip;
  tip.querySelector('.opt-tooltip-more')?.addEventListener('click', () => {
    closeTip();
    $('drawer-help').open = true;
    $('drawer-help')?.scrollIntoView({ behavior: 'smooth' });
  });
}

function wrapStepper(input){
  if(!input || input.dataset.stepper) return;
  input.dataset.stepper = '1';
  input.type = 'text';
  input.inputMode = 'numeric';
  input.readOnly = true;
  input.classList.add('opt-stepper-val');

  const wrap = document.createElement('div');
  wrap.className = 'opt-stepper';
  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'opt-stepper-btn';
  minus.textContent = '−';
  minus.setAttribute('aria-label', 'Уменьшить');
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'opt-stepper-btn';
  plus.textContent = '+';
  plus.setAttribute('aria-label', 'Увеличить');

  const parent = input.parentNode;
  parent.insertBefore(wrap, input);
  wrap.append(minus, input, plus);

  const step = parseFloat(input.getAttribute('step')) || 1;
  const min = parseFloat(input.getAttribute('min'));
  const max = parseFloat(input.getAttribute('max'));

  function bump(dir){
    let v = parseFloat(input.value);
    if(!isFinite(v)) v = 0;
    v += dir * step;
    if(isFinite(min)) v = Math.max(min, v);
    if(isFinite(max)) v = Math.min(max, v);
    if(step >= 1) v = Math.round(v);
    else v = Math.round(v * 10) / 10;
    input.value = String(v);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  let repeatTimer = null;
  function startRepeat(dir){
    bump(dir);
    repeatTimer = setInterval(() => bump(dir), 120);
  }
  function stopRepeat(){
    if(repeatTimer){ clearInterval(repeatTimer); repeatTimer = null; }
  }

  minus.addEventListener('pointerdown', e => { e.preventDefault(); startRepeat(-1); });
  plus.addEventListener('pointerdown', e => { e.preventDefault(); startRepeat(1); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => {
    minus.addEventListener(ev, stopRepeat);
    plus.addEventListener(ev, stopRepeat);
  });
  minus.addEventListener('click', e => e.preventDefault());
  plus.addEventListener('click', e => e.preventDefault());
}

function addHelpButtons(){
  Object.entries(HELP_TEXTS).forEach(([id, text]) => {
    const el = $(id);
    if(!el) return;
    const row = el.closest('.opt-row');
    if(!row || row.querySelector('.opt-help-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'opt-help-btn';
    btn.textContent = '?';
    btn.setAttribute('aria-label', 'Подсказка');
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if(activeTip?.dataset.for === id){ closeTip(); return; }
      showTip(btn, text);
      if(activeTip) activeTip.dataset.for = id;
    });
    row.appendChild(btn);
  });
}

export function initOptControls(){
  STEPPER_IDS.forEach(id => wrapStepper($(id)));
  addHelpButtons();
  document.addEventListener('click', e => {
    if(!e.target.closest('.opt-help-btn') && !e.target.closest('.opt-tooltip-pop')) closeTip();
  });
}
