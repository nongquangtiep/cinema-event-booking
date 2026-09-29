/**
 * CineWave Seat Selection & Hold Logic
 * Phase 1: Skeleton configuration
 */

let selectedSeats = [];
let holdTimer = null;
let holdTimeRemaining = 300; // 5 minutes in seconds

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

console.log('[CineWave] Seat selection script loaded');
