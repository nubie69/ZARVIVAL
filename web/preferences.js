const defaults = { sound:false, weather:true, effects:true, volume:.5 };
export function loadPreferences(storage=globalThis.localStorage) {
  try {
    const saved=JSON.parse(storage.getItem('zarvival-settings'))||{};
    return {
      sound:typeof saved.sound==='boolean'?saved.sound:defaults.sound,
      weather:typeof saved.weather==='boolean'?saved.weather:defaults.weather,
      effects:typeof saved.effects==='boolean'?saved.effects:defaults.effects,
      volume:Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):defaults.volume,
    };
  } catch { return {...defaults}; }
}
export function savePreferences(preferences,storage=globalThis.localStorage) {
  try {storage.setItem('zarvival-settings',JSON.stringify(preferences));}catch{/* Private browsing can disable storage. */}
}
