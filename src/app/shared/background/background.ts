import { Component } from '@angular/core';

/** Deterministic pseudo-random so drops/stars are stable between renders. */
const rand = (() => {
  let s = 7;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
})();

interface Drop { id: number; x: number; len: number; w: number; dur: number; delay: number; o: number; }
interface Star { id: number; x: number; y: number; size: number; o: number; dur: number; delay: number; c: string; }

const DROPS: Drop[] = Array.from({ length: 90 }, (_, id) => ({
  id,
  x: rand() * 120 - 10,           // % across the screen (slight overshoot because the rain slants)
  len: 40 + rand() * 60,          // px streak length
  w: rand() > 0.75 ? 2 : 1,       // px streak width
  dur: 0.7 + rand() * 0.6,        // s per fall
  delay: -rand() * 2,             // negative: drops are already mid-fall on load
  o: 0.25 + rand() * 0.45,
}));

const TINTS = ['#ffffff', '#ffffff', '#cfe0ff', '#ffe9c7'];
const STARS: Star[] = Array.from({ length: 150 }, (_, id) => {
  const r = rand();
  return {
    id,
    x: rand() * 100,
    y: rand() * 85,                                  // keep the lowest part of the sky clearer
    size: r > 0.93 ? 3 : r > 0.65 ? 2 : 1.3,         // a few bright ones, many faint ones
    o: 0.4 + rand() * 0.6,
    dur: 2.5 + rand() * 4.5,
    delay: -rand() * 7,
    c: TINTS[Math.floor(rand() * TINTS.length)],
  };
});

/** Fluid day / night / cloudy backdrop. Colours and layer visibility come from CSS variables set per theme in styles.scss. */
@Component({
  selector: 'app-background',
  template: `
    <i class="blob a"></i><i class="blob b"></i><i class="blob c"></i>

    <!-- NIGHT: milky way, stars, shooting star -->
    <div class="starfield">
      <i class="galaxy"></i>
      @for (s of stars; track s.id) {
        <i class="star"
           [style.left.%]="s.x" [style.top.%]="s.y"
           [style.--s]="s.size + 'px'" [style.--o]="s.o"
           [style.--dur]="s.dur + 's'" [style.--delay]="s.delay + 's'" [style.--c]="s.c"></i>
      }
      <i class="shoot"></i><i class="shoot s2"></i>
    </div>

    <!-- DAY: sun with slow rotating rays; NIGHT: moon -->
    <div class="orb sun"><i class="rays"></i><i class="disc"></i></div>
    <div class="orb moon"><i class="disc"></i></div>

    <i class="haze"></i>

    <div class="clouds">
      <i class="cloud far c1"></i><i class="cloud far c3"></i><i class="cloud mid c5"></i>
      <div class="overcast">
        <i class="cloud far c2"></i>
        <i class="cloud mid c4"></i><i class="cloud mid c6"></i>
        <i class="cloud near c7"></i><i class="cloud near c8"></i>
      </div>
    </div>

    <div class="rain">
      @for (d of drops; track d.id) {
        <i class="drop"
           [style.left.%]="d.x"
           [style.--len]="d.len + 'px'"
           [style.--w]="d.w + 'px'"
           [style.--dur]="d.dur + 's'"
           [style.--delay]="d.delay + 's'"
           [style.--o]="d.o"></i>
      }
    </div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }

    /* Soft colour blobs */
    .blob { position: absolute; width: 55vmax; height: 55vmax; border-radius: 50%;
      filter: blur(80px); opacity: var(--blob-o, .7); transition: opacity 1.2s ease; will-change: transform;
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

    /* Sun / moon share a spot and float gently */
    .orb { position: absolute; top: 9%; right: 12%; width: 110px; height: 110px; border-radius: 50%;
      transition: opacity 1.2s ease; animation: float 12s ease-in-out infinite alternate; }
    @keyframes float { to { transform: translateY(18px); } }
    .disc { position: absolute; inset: 0; border-radius: 50%; }

    .sun { opacity: var(--day); }
    .sun .disc {
      background: radial-gradient(circle at 38% 36%, #fffdf0, #ffe58a 45%, #ffc23d 80%, #ffa726);
      box-shadow: 0 0 60px 28px #fff3b8cc, 0 0 160px 90px #ffd77a77, 0 0 380px 200px #ffffff40; }
    .rays { position: absolute; left: 50%; top: 50%; width: 820px; height: 820px; margin: -410px 0 0 -410px;
      border-radius: 50%; animation: spin 140s linear infinite;
      background: repeating-conic-gradient(from 0deg, rgba(255,255,255,.22) 0 3deg, transparent 3deg 12deg);
      -webkit-mask-image: radial-gradient(circle, #000 4%, transparent 66%);
              mask-image: radial-gradient(circle, #000 4%, transparent 66%); }
    @keyframes spin { to { transform: rotate(360deg); } }

    .moon { opacity: var(--night); width: 96px; height: 96px; }
    .moon .disc {
      background:
        radial-gradient(circle at 62% 30%, rgba(120,130,160,.35) 0 7%, transparent 8%),
        radial-gradient(circle at 36% 58%, rgba(120,130,160,.30) 0 11%, transparent 12%),
        radial-gradient(circle at 68% 68%, rgba(120,130,160,.28) 0 6%, transparent 7%),
        radial-gradient(circle at 28% 28%, rgba(120,130,160,.25) 0 5%, transparent 6%),
        radial-gradient(circle at 35% 32%, #fffdf4, #e9ecf7 55%, #c4cbe3);
      box-shadow: 0 0 40px 10px #aebcff55, 0 0 120px 50px #6f86ff2e,
        inset -16px -8px 22px rgba(6, 10, 36, .55); }

    /* Horizon glow */
    .haze { position: absolute; left: 0; right: 0; bottom: 0; height: 40%; opacity: var(--haze, 0);
      transition: opacity 1.2s ease; background: linear-gradient(to top, rgba(255,255,255,.7), transparent); }

    /* Night sky */
    .starfield { position: absolute; inset: 0; opacity: var(--night); transition: opacity 1.2s ease; }
    .galaxy { position: absolute; inset: -25%; filter: blur(34px);
      background: linear-gradient(118deg, transparent 36%, rgba(130,150,255,.10) 45%, rgba(225,205,255,.16) 50%,
        rgba(130,150,255,.10) 55%, transparent 64%); }
    .star { position: absolute; display: block; width: var(--s); height: var(--s); border-radius: 50%;
      background: var(--c); box-shadow: 0 0 calc(var(--s) * 3) var(--c); opacity: var(--o);
      animation: tw var(--dur) ease-in-out var(--delay) infinite; }
    @keyframes tw { 50% { opacity: calc(var(--o) * .25); transform: scale(.8); } }
    .shoot { position: absolute; top: 14%; left: 78%; width: 130px; height: 1.5px; opacity: 0;
      background: linear-gradient(90deg, #fff, rgba(255,255,255,0));
      animation: shoot 13s linear infinite; }
    .s2 { top: 32%; left: 42%; width: 90px; animation-duration: 19s; animation-delay: -7s; }
    @keyframes shoot {
      0%, 92% { opacity: 0; transform: translate(0, 0) rotate(-35deg); }
      93% { opacity: 1; }
      100% { opacity: 0; transform: translate(-320px, 210px) rotate(-35deg); }
    }

    /* Clouds: tinted per theme via --cloud-hi/mid/lo. Day = a few bright clouds, cloudy = full overcast. */
    .clouds { position: absolute; inset: 0; opacity: var(--cloud, 0); transition: opacity 1.2s ease; }
    .overcast { position: absolute; inset: 0; opacity: var(--overcast, 0); transition: opacity 1.2s ease; }
    .cloud { position: absolute; display: block; border-radius: 50%; filter: blur(38px); will-change: transform;
      background: radial-gradient(ellipse at 50% 50%, var(--cloud-hi) 0%, var(--cloud-mid) 45%, transparent 72%);
      animation: cloud-drift 120s linear infinite alternate; }
    .far  { opacity: .55; animation-duration: 160s; }
    .mid  { opacity: .7;  animation-duration: 105s; animation-direction: alternate-reverse; }
    .near { opacity: .85; animation-duration: 70s;
      background: radial-gradient(ellipse, var(--cloud-hi) 0%, var(--cloud-lo) 50%, transparent 75%); }
    .c1 { width: 420px; height: 160px; top: 8%;  left: 5%; }
    .c2 { width: 520px; height: 190px; top: 22%; left: 45%; }
    .c3 { width: 380px; height: 150px; top: 14%; left: 78%; }
    .c4 { width: 640px; height: 240px; top: 30%; left: 12%; }
    .c5 { width: 700px; height: 260px; top: 46%; left: 52%; }
    .c6 { width: 560px; height: 220px; top: 38%; left: 85%; }
    .c7 { width: 900px; height: 340px; top: 60%; left: 8%; }
    .c8 { width: 980px; height: 360px; top: 68%; left: 58%; }
    @keyframes cloud-drift {
      from { transform: translateX(-8vw); }
      to   { transform: translateX(8vw); }
    }

    /* Rain: fades in with --rain. Streaks fall slanted, each with its own speed/delay. */
    .rain { position: absolute; inset: 0; opacity: var(--rain, 0); transition: opacity 1.2s ease; }
    .drop { position: absolute; top: -120px; display: block;
      width: var(--w); height: var(--len); opacity: var(--o); border-radius: 2px;
      background: linear-gradient(to bottom, rgba(220,230,245,0), rgba(220,230,245,.85));
      transform: translate3d(0, 0, 0) rotate(8deg);
      animation: fall var(--dur) linear var(--delay) infinite; will-change: transform; }
    @keyframes fall {
      to { transform: translate3d(-17vh, 125vh, 0) rotate(8deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      .cloud, .blob, .star, .shoot, .rays { animation: none; }
      .rain, .shoot { display: none; }
    }
  `,
})
export class Background {
  protected readonly drops = DROPS;
  protected readonly stars = STARS;
}