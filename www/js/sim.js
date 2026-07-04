(function initSim(){
  const params = new URLSearchParams(location.search);
  if(params.get('sim') !== '1') return;

  // Демо-маршрут по Москве: ЗАМКНУТЫЙ контур с поворотами РАЗНОЙ крутизны
  // и разворотом. Строим из «ног» (курс, длина): курс каждой следующей ноги
  // отличается на заданный угол поворота. Последняя нога добирается обратно
  // к старту (вектор = −сумма остальных), поэтому контур замыкается точно —
  // зацикленная симуляция идёт без телепорта и «пропаданий» дороги.
  const START = [55.75700, 37.61600];
  // Реальный финиш для демо: ВДНХ, Москва (OSRM строит настоящий маршрут)
  const DEMO_FINISH = [55.827099, 37.632066];
  const TURN_LEGS = [
    // угол поворота В НАЧАЛЕ ноги (° , + вправо), длина ноги (м)
    { turn: 0,    len: 380 },   // старт прямо
    { turn: 30,   len: 300 },   // пологий вправо
    { turn: -45,  len: 320 },   // средний влево
    { turn: 90,   len: 300 },   // резкий вправо (90°)
    { turn: -120, len: 340 },   // очень резкий влево
    { turn: 175,  len: 260 },   // разворот
    { turn: -60,  len: 320 },   // средний влево
    { turn: 40,   len: 300 }    // пологий вправо
  ];
  function legsToWaypoints(start, legs){
    const rad = Math.PI / 180;
    const kLat = 111320, kLon = 111320 * Math.cos(start[0] * rad);
    // проходим ноги в метровых ENU-координатах
    let hdg = 0, x = 0, y = 0;      // x — восток, y — север (м)
    const enu = [[0, 0]];
    let sumX = 0, sumY = 0;
    for(const leg of legs){
      hdg += leg.turn;
      const h = hdg * rad;
      const dx = Math.sin(h) * leg.len, dy = Math.cos(h) * leg.len;
      x += dx; y += dy; sumX += dx; sumY += dy;
      enu.push([x, y]);
    }
    // замыкающая нога: вектор обратно в старт
    enu.push([0, 0]);
    return enu.map(p => [start[0] + p[1] / kLat, start[1] + p[0] / kLon]);
  }
  const WP = legsToWaypoints(START, TURN_LEGS);

  // Плотный полилайн (шаг ~25 м) для маршрута и движения
  function densify(pts, stepM){
    const R = 6371000, r = Math.PI / 180;
    const out = [];
    for(let i = 0; i < pts.length - 1; i++){
      const a = pts[i], b = pts[i + 1];
      const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
      const la = a[0] * r;
      const dx = dLon * Math.cos(la) * R, dy = dLat * R;
      const seg = Math.hypot(dx, dy);
      const n = Math.max(1, Math.round(seg / stepM));
      for(let k = 0; k < n; k++){
        const t = k / n;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  let PATH = [[START[0], START[1]], [START[0], START[1]]];

  function setPathFromCoords(coords, loop){
    if(!coords || coords.length < 2) return;
    PATH = coords.length > 80 ? coords : densify(coords, 25);
    sim.idx = 0;
    sim.frac = 0;
    sim.loop = !!loop;
    sim.running = true;
    emit();
  }

  // Демо-АЗС: две «по маршруту» (впереди, в коридоре) и две в стороне (ближайшие вообще).
  // status повторяет семантику ГдеБЕНЗ: yes/queue/low/no → цвет символа.
  const _fp = fr => {
    const p = PATH[Math.max(0, Math.min(PATH.length - 1, Math.floor(PATH.length * fr)))];
    return p || START;
  };
  const SIM_FUEL = [
    { id: 'sim_f1', lat: _fp(0.20)[0] + 0.0006, lon: _fp(0.20)[1] + 0.0004, brand: 'Лукойл',        status: 'yes' },
    { id: 'sim_f2', lat: _fp(0.55)[0] + 0.0005, lon: _fp(0.55)[1] - 0.0004, brand: 'Газпромнефть',  status: 'low' },
    { id: 'sim_f3', lat: START[0] + 0.0045,     lon: START[1] + 0.0060,     brand: 'Роснефть',      status: 'queue' },
    { id: 'sim_f4', lat: START[0] - 0.0050,     lon: START[1] + 0.0030,     brand: 'Татнефть',      status: 'no' }
  ];

  function bearingLL(a, b){
    const r = Math.PI / 180, d = 180 / Math.PI;
    const f1 = a[0] * r, f2 = b[0] * r, dl = (b[1] - a[1]) * r;
    const y = Math.sin(dl) * Math.cos(f2);
    const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return (Math.atan2(y, x) * d + 360) % 360;
  }
  function distLL(a, b){
    const R = 6371000, r = Math.PI / 180;
    const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  // Состояние симулятора
  const sim = {
    idx: 0, frac: 0, speed: 14, running: true, loop: true,
    cb: null, err: null, timer: null
  };

  function curPos(){
    const a = PATH[Math.min(sim.idx, PATH.length - 1)];
    const b = PATH[Math.min(sim.idx + 1, PATH.length - 1)];
    const lat = a[0] + (b[0] - a[0]) * sim.frac;
    const lon = a[1] + (b[1] - a[1]) * sim.frac;
    const hdg = bearingLL(a, b);
    return { lat, lon, hdg };
  }
  function advance(dt){
    if(!sim.running) return;
    let move = sim.speed * dt; // метры
    while(move > 0 && sim.idx < PATH.length - 1){
      const a = PATH[sim.idx], b = PATH[sim.idx + 1];
      const seg = distLL(a, b) || 0.01;
      const remain = seg * (1 - sim.frac);
      if(move < remain){ sim.frac += move / seg; move = 0; }
      else { move -= remain; sim.idx++; sim.frac = 0; }
    }
    // зацикливаем демо-маршрут, чтобы движение (и регулировка скорости) не останавливалось
    if(sim.idx >= PATH.length - 1){
      if(sim.loop){ sim.idx = 0; sim.frac = 0; }
      else { sim.running = false; }
    }
  }
  function emit(){
    if(!sim.cb) return;
    const p = curPos();
    sim.cb({
      coords: {
        latitude: p.lat, longitude: p.lon,
        accuracy: 5, altitude: null, altitudeAccuracy: null,
        heading: sim.running ? p.hdg : null,
        speed: sim.running ? sim.speed : 0
      },
      timestamp: Date.now()
    });
  }

  // Подмена геолокации
  const geo = {
    watchPosition(cb, err){
      sim.cb = cb; sim.err = err;
      emit();
      if(sim.timer) clearInterval(sim.timer);
      sim.timer = setInterval(() => { advance(0.5); emit(); }, 500);
      return 1;
    },
    clearWatch(){ if(sim.timer){ clearInterval(sim.timer); sim.timer = null; } },
    getCurrentPosition(cb){ const p = curPos(); cb({ coords: { latitude: p.lat, longitude: p.lon, accuracy: 5, heading: p.hdg, speed: sim.speed }, timestamp: Date.now() }); }
  };
  try{ Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true }); }
  catch(e){ navigator.geolocation = geo; }

  // Сеть: реальный OSRM / Overpass / Nominatim. Мок только ГдеБЕНЗ (нет CORS в браузере).
  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function(url, opts){
    const u = String(url);
    if(u.includes('gdebenz.ru/api/nearby')){
      return Promise.resolve(new Response(JSON.stringify({
        summary: { yes: 1, queue: 1, low: 1, no: 1 },
        stations: SIM_FUEL.map(f => ({
          osm_id: f.id, brand: f.brand, name: f.brand,
          lat: f.lat, lon: f.lon, status: f.status,
          confirmations: 40, confirmed: true, last_at: '2026-07-04 00:00:00'
        }))
      }), { headers: { 'Content-Type': 'application/json' } }));
    }
    return realFetch ? realFetch(url, opts) : Promise.reject(new Error('no fetch'));
  };

  // Управление симулятором из родительского окна (sim.html)
  window.__SIM__ = {
    get path(){ return PATH; },
    setSpeed(v){ sim.speed = Math.max(0, v); },
    setRoutePath(coords){ setPathFromCoords(coords, false); },
    play(){ sim.running = sim.idx < PATH.length - 1 || sim.loop; },
    pause(){ sim.running = false; },
    reset(){ sim.idx = 0; sim.frac = 0; sim.running = true; emit(); },
    isRunning(){ return sim.running; },
    boot(){
      const inp = document.getElementById('finish-input');
      if(inp){ inp.value = DEMO_FINISH[0].toFixed(5) + ', ' + DEMO_FINISH[1].toFixed(5); }
      if(window.__motoHUD?.applyCoordsOrLink) window.__motoHUD.applyCoordsOrLink();
      let tries = 0;
      const t = setInterval(() => {
        tries++;
        const st = window.__motoHUD?.S ?? null;
        if(st && st.gps && st.finish){
          clearInterval(t);
          const go = async () => {
            try{
              if(window.__motoHUD?.doBuildRoute) await window.__motoHUD.doBuildRoute();
            }catch(e){
              console.warn('sim boot: маршрут не построен', e);
            }
            if(window.__motoHUD?.startHud && !document.getElementById('hud').classList.contains('on')){
              window.__motoHUD.startHud();
            }
          };
          go();
        }
        if(tries > 60) clearInterval(t);
      }, 250);
    }
  };
  document.documentElement.setAttribute('data-sim', '1');
})();