import { Component } from '@angular/core';

/** Fluid day/night backdrop. Colours come from CSS variables set per theme in styles.scss. */
@Component({
  selector: 'app-background',
  template: `
    <i class="blob a"></i><i class="blob b"></i><i class="blob c"></i>
    <i class="orb sun"></i><i class="orb moon"></i>
    <i class="stars"></i>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
    .blob { position: absolute; width: 55vmax; height: 55vmax; border-radius: 50%;
      filter: blur(80px); opacity: .7; will-change: transform;
      animation: drift 26s ease-in-out infinite alternate; }
    .a { background: var(--blob-a); top: -15vmax; left: -10vmax; }
    .b { background: var(--blob-b); bottom: -20vmax; right: -12vmax; animation-duration: 32s; animation-delay: -8s; }
    .c { background: var(--blob-c); top: 25%; left: 35%; width: 40vmax; height: 40vmax;
      animation-duration: 38s; animation-delay: -15s; }
    @keyframes drift {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(8vmax, -6vmax) scale(1.15); }
      100% { transform: translate(-6vmax, 8vmax) scale(.95); }
    }
    .orb { position: absolute; top: 9%; right: 12%; width: 110px; height: 110px; border-radius: 50%;
      transition: opacity 1.2s ease; animation: float 12s ease-in-out infinite alternate; }
    .sun { opacity: var(--day); box-shadow: 0 0 90px 40px #ffd27a88;
      background: radial-gradient(circle at 35% 35%, #fff6c9, #ffc94d 60%, #ff9f43); }
    .moon { opacity: var(--night); box-shadow: 0 0 80px 30px #8ea0ff55;
      background: radial-gradient(circle at 35% 35%, #fff, #dfe6ff 60%, #aab6ff); }
    @keyframes float { to { transform: translateY(18px); } }
    .stars { position: absolute; inset: 0; opacity: var(--night); transition: opacity 1.2s ease;
      animation: twinkle 5s ease-in-out infinite alternate; background-size: 260px 220px;
      background-image:
        radial-gradient(1.5px 1.5px at 20px 30px, #fff, transparent),
        radial-gradient(1px 1px at 90px 120px, #fff, transparent),
        radial-gradient(1.5px 1.5px at 160px 60px, #fff, transparent),
        radial-gradient(1px 1px at 230px 180px, #fff, transparent); }
    @keyframes twinkle { to { filter: brightness(.6); } }
  `,
})
export class Background {}
