/**
 * Воронка UX телеметрии: локальные счётчики + события в активной JSONL-сессии.
 * @module telemetry-funnel
 */
import telemetry from './telemetry.js';

export const FUNNEL_STORAGE_KEY = 'moto-hud-telemetry-funnel-v1';

/** @typedef {'telemetry_opt_in'|'telemetry_opt_out'|'ride_start'|'mark_placed'|'ride_stop'|'share_prompt_shown'|'share_prompt_skipped_short'|'share_prompt_dismissed_later'|'share_prompt_dismissed_never'|'share_prompt_skip_per_ride'|'share_sheet_opened'|'share_download'|'share_email'|'share_telegram_chat'|'share_note_nonempty'|'share_pending_confirm'} FunnelStage */

function readStore(){
  try{
    const raw = localStorage.getItem(FUNNEL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { counts: {}, last: {} };
  }catch(e){
    return { counts: {}, last: {} };
  }
}

function writeStore(st){
  try{ localStorage.setItem(FUNNEL_STORAGE_KEY, JSON.stringify(st)); }catch(e){}
}

/**
 * @param {FunnelStage} stage
 * @param {object} [detail]
 */
export function logFunnel(stage, detail = {}){
  const st = readStore();
  st.counts[stage] = (st.counts[stage] || 0) + 1;
  st.last[stage] = { ts: Date.now(), ...detail };
  writeStore(st);

  if(telemetry.isActive?.()){
    telemetry.log('meta', { sub: 'funnel', stage, ...detail });
  }
}

export function getFunnelStats(){
  return readStore();
}

export function resetFunnelStats(){
  try{ localStorage.removeItem(FUNNEL_STORAGE_KEY); }catch(e){}
}
