/**
 * Utilidades de alertas sonoras y respuesta háptica (vibración)
 * Diseñado especialmente para PWAs móviles en entornos de bodega.
 */

// Reproduce una respuesta háptica en dispositivos móviles compatibles
export function triggerHaptic(pattern: number | number[] = 40) {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignorar si el navegador bloquea la vibración
    }
  }
}

// Sonido sutil de clic/confirmación táctil al marcar un ítem
export function playTactileClick() {
  triggerHaptic(40);
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // Silencioso en caso de restricciones de autoplay
  }
}

// Melodía de alerta / campanada cuando se asigna un pedido o se agrega un nuevo ítem
export function playWarehouseAlertChime() {
  // Patrón de vibración doble: Alerta llamativa
  triggerHaptic([300, 120, 300]);
  
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const notes = [
      { freq: 523.25, time: 0, duration: 0.15 },    // C5
      { freq: 659.25, time: 0.15, duration: 0.15 }, // E5
      { freq: 783.99, time: 0.30, duration: 0.35 }  // G5
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + duration);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration);
    });
  } catch {
    // Autoplay policy fallback
  }
}

// Melodía de éxito al completar la preparación o crear un pedido
export function playSuccessChime() {
  triggerHaptic([80, 50, 120]);
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notes = [
      { freq: 587.33, time: 0, duration: 0.12 }, // D5
      { freq: 880.00, time: 0.12, duration: 0.25 } // A5
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + duration);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration);
    });
  } catch {}
}
