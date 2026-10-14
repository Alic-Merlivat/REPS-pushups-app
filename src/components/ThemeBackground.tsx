import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

// --- Night: Fireflies & Bokeh ---
interface NightBokeh {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  vy: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  color: string;
  maxAlpha: number;
}

interface NightFirefly {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  vy: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  pulsePhase: number;
  pulseSpeed: number;
  coreColor: string;
  glowColor: string;
  outerGlowColor: string;
}

interface NightSpore {
  x: number;
  y: number;
  radius: number;
  vy: number;
  alpha: number;
  alphaSpeed: number;
  color: string;
}

// --- Aurora: Plasma, Stars, Meteors ---
interface AuroraParticle {
  x: number;
  y: number;
  radius: number;
  vy: number;
  alpha: number;
  alphaSpeed: number;
  color: string;
  hasFlare?: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  active: boolean;
}

// --- Inferno: Rising embers, sparks ---
interface InfernoEmber {
  x: number;
  y: number;
  radius: number;
  vy: number;
  vx: number;
  life: number;
  maxLife: number;
  heat: number;
  turbulence: number;
}

interface InfernoSpark {
  x: number;
  y: number;
  length: number;
  vy: number;
  vx: number;
  alpha: number;
  color: string;
}

// --- Holopop: 3D bubbles & sparkles ---
interface HolopopBubble {
  x: number;
  y: number;
  radius: number;
  vy: number;
  vx: number;
  bobPhase: number;
  bobSpeed: number;
  tint: string;
  rimColor: string;
  opacity: number;
}

interface HolopopSparkle {
  x: number;
  y: number;
  size: number;
  rot: number;
  rotSpeed: number;
  alpha: number;
  alphaSpeed: number;
  color: string;
}

export const ThemeBackground: React.FC = () => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let cssWidth = window.innerWidth;
    let cssHeight = window.innerHeight;

    const resize = () => {
      if (!canvas) return;
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
    };

    resize();
    window.addEventListener('resize', resize);

    // ==========================================
    // 1. NIGHT PARTICLES (Exactly matching user's video)
    // ==========================================
    // Deep Bokeh Orbs (large, soft, luminous out-of-focus background discs)
    const bokehColors = [
      'rgba(52, 211, 153, 0.16)', // Emerald
      'rgba(163, 230, 53, 0.14)', // Lime
      'rgba(190, 242, 100, 0.12)', // Chartreuse
      'rgba(110, 231, 183, 0.13)', // Mint
      'rgba(34, 197, 94, 0.12)',  // Forest Green
    ];

    const nightBokeh: NightBokeh[] = [];
    for (let i = 0; i < 22; i++) {
      const baseR = 30 + Math.random() * 55;
      nightBokeh.push({
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        radius: baseR,
        baseRadius: baseR,
        vy: -(0.18 + Math.random() * 0.35),
        swayAmp: 18 + Math.random() * 25,
        swayFreq: 0.0008 + Math.random() * 0.0012,
        phase: Math.random() * Math.PI * 2,
        color: bokehColors[Math.floor(Math.random() * bokehColors.length)],
        maxAlpha: 0.45 + Math.random() * 0.45,
      });
    }

    // Glowing Fireflies (Vibrant, pulsating, rich green & lime motes)
    const fireflyPresets = [
      {
        core: '#fef08a',
        glow: 'rgba(254, 240, 138, 0.95)',
        outer: 'rgba(163, 230, 53, 0.35)',
      },
      {
        core: '#bef264',
        glow: 'rgba(190, 242, 100, 0.95)',
        outer: 'rgba(16, 185, 129, 0.35)',
      },
      {
        core: '#a3e635',
        glow: 'rgba(163, 230, 53, 0.95)',
        outer: 'rgba(34, 197, 94, 0.35)',
      },
      {
        core: '#34d399',
        glow: 'rgba(52, 211, 153, 0.98)',
        outer: 'rgba(16, 185, 129, 0.38)',
      },
      {
        core: '#6ee7b7',
        glow: 'rgba(110, 231, 183, 0.95)',
        outer: 'rgba(52, 211, 153, 0.35)',
      },
    ];

    const nightFireflies: NightFirefly[] = [];
    for (let i = 0; i < 48; i++) {
      const preset = fireflyPresets[Math.floor(Math.random() * fireflyPresets.length)];
      const baseR = 2.8 + Math.random() * 3.8;
      nightFireflies.push({
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        radius: baseR,
        baseRadius: baseR,
        vy: -(0.35 + Math.random() * 0.65),
        swayAmp: 14 + Math.random() * 22,
        swayFreq: 0.0015 + Math.random() * 0.002,
        swayPhase: Math.random() * Math.PI * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.018 + Math.random() * 0.032,
        coreColor: preset.core,
        glowColor: preset.glow,
        outerGlowColor: preset.outer,
      });
    }

    // Fairy Dust / Shimmering Spores
    const nightSpores: NightSpore[] = [];
    for (let i = 0; i < 30; i++) {
      nightSpores.push({
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        radius: 0.9 + Math.random() * 1.6,
        vy: -(0.4 + Math.random() * 0.6),
        alpha: Math.random(),
        alphaSpeed: (0.015 + Math.random() * 0.025) * (Math.random() > 0.5 ? 1 : -1),
        color: Math.random() > 0.5 ? '#bef264' : '#6ee7b7',
      });
    }

    // ==========================================
    // 2. AURORA PARTICLES & METEORS
    // ==========================================
    const auroraParticles: AuroraParticle[] = [];
    const auroraColors = ['#22d3ee', '#38bdf8', '#c084fc', '#f472b6', '#a7f3d0', '#ffffff'];
    for (let i = 0; i < 65; i++) {
      auroraParticles.push({
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        radius: 0.9 + Math.random() * 2.2,
        vy: -(0.12 + Math.random() * 0.28),
        alpha: 0.2 + Math.random() * 0.8,
        alphaSpeed: (0.01 + Math.random() * 0.02) * (Math.random() > 0.5 ? 1 : -1),
        color: auroraColors[Math.floor(Math.random() * auroraColors.length)],
        hasFlare: Math.random() < 0.2,
      });
    }

    let shootingStar: ShootingStar = {
      x: 0,
      y: 0,
      length: 0,
      speed: 0,
      angle: 0,
      opacity: 0,
      active: false,
    };
    let nextShootingStarTime = Date.now() + 1800;

    // ==========================================
    // 3. INFERNO EMBERS & CRACKLING SPARKS
    // ==========================================
    const infernoEmbers: InfernoEmber[] = [];
    const createInfernoEmber = (initialY?: number): InfernoEmber => {
      const maxL = 110 + Math.random() * 140;
      return {
        x: Math.random() * cssWidth,
        y: initialY !== undefined ? initialY : cssHeight + 15 + Math.random() * 30,
        radius: 1.4 + Math.random() * 2.8,
        vy: -(1.4 + Math.random() * 2.2),
        vx: (Math.random() - 0.5) * 0.9,
        life: 0,
        maxLife: maxL,
        heat: 1.0,
        turbulence: (Math.random() - 0.5) * 0.09,
      };
    };

    for (let i = 0; i < 55; i++) {
      infernoEmbers.push(createInfernoEmber(Math.random() * cssHeight));
    }

    const infernoSparks: InfernoSpark[] = [];
    for (let i = 0; i < 28; i++) {
      infernoSparks.push({
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        length: 6 + Math.random() * 12,
        vy: -(2.5 + Math.random() * 3.5),
        vx: (Math.random() - 0.5) * 1.5,
        alpha: 0.3 + Math.random() * 0.7,
        color: Math.random() > 0.4 ? '#fef08a' : '#fb923c',
      });
    }

    // ==========================================
    // 4. HOLOPOP BUBBLES & SPARKLE STARS
    // ==========================================
    const holopopBubbles: HolopopBubble[] = [];
    const holoTints = [
      { tint: 'rgba(244, 114, 182, 0.45)', rim: 'rgba(255, 255, 255, 0.9)' },
      { tint: 'rgba(167, 139, 250, 0.45)', rim: 'rgba(255, 255, 255, 0.9)' },
      { tint: 'rgba(56, 189, 248, 0.45)', rim: 'rgba(255, 255, 255, 0.9)' },
      { tint: 'rgba(251, 191, 36, 0.45)', rim: 'rgba(255, 255, 255, 0.9)' },
      { tint: 'rgba(52, 211, 153, 0.45)', rim: 'rgba(255, 255, 255, 0.9)' },
    ];

    for (let i = 0; i < 28; i++) {
      const t = holoTints[Math.floor(Math.random() * holoTints.length)];
      const y = Math.random() * cssHeight;
      holopopBubbles.push({
        x: Math.random() * cssWidth,
        y,
        radius: 6 + Math.random() * 16,
        vy: -(0.25 + Math.random() * 0.45),
        vx: (Math.random() - 0.5) * 0.3,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 0.016 + Math.random() * 0.024,
        tint: t.tint,
        rimColor: t.rim,
        opacity: 0.55 + Math.random() * 0.4,
      });
    }

    const holopopSparkles: HolopopSparkle[] = [];
    for (let i = 0; i < 22; i++) {
      holopopSparkles.push({
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        size: 5 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        rotSpeed: (0.01 + Math.random() * 0.02) * (Math.random() > 0.5 ? 1 : -1),
        alpha: Math.random(),
        alphaSpeed: (0.012 + Math.random() * 0.024) * (Math.random() > 0.5 ? 1 : -1),
        color: Math.random() > 0.5 ? '#f472b6' : '#fbbf24',
      });
    }

    // ==========================================
    // RENDER LOOP
    // ==========================================
    let frame = 0;

    const render = () => {
      frame++;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // ========================================
      // STYLE 1: NIGHT (Fireflies & Glowing Bokeh)
      // ========================================
      if (theme === 'night') {
        const time = frame;

        // 1. Large Deep Bokeh Orbs (soft out-of-focus background glow)
        for (const b of nightBokeh) {
          b.phase += b.swayFreq;
          b.y += b.vy;
          const currentX = b.x + Math.sin(b.phase) * b.swayAmp;

          if (b.y < -b.radius * 2) {
            b.y = cssHeight + b.radius * 2;
            b.x = Math.random() * cssWidth;
          }

          const pulse = (Math.sin(b.phase * 2) + 1) / 2;
          const currentAlpha = (0.25 + pulse * 0.5) * b.maxAlpha;
          const r = b.baseRadius * (0.9 + pulse * 0.2);

          const grad = ctx.createRadialGradient(currentX, b.y, 0, currentX, b.y, r);
          grad.addColorStop(0, b.color);
          grad.addColorStop(0.5, b.color.replace('0.', '0.04'));
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.save();
          ctx.globalAlpha = currentAlpha;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(currentX, b.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 2. Glowing Fireflies (Vivid, pulsating, rich lime & emerald motes)
        for (const f of nightFireflies) {
          f.swayPhase += f.swayFreq;
          f.pulsePhase += f.pulseSpeed;
          f.y += f.vy;
          const currentX = f.x + Math.sin(f.swayPhase) * f.swayAmp;

          if (f.y < -30) {
            f.y = cssHeight + 30;
            f.x = Math.random() * cssWidth;
          }

          const pulse = (Math.sin(f.pulsePhase) + 1) / 2; // 0 to 1
          const alpha = 0.4 + pulse * 0.6;
          const currentRadius = f.baseRadius * (0.8 + pulse * 0.4);

          ctx.save();

          // A. Outer soft ambient halo
          const outerHaloR = currentRadius * 5.8;
          const outerGrad = ctx.createRadialGradient(currentX, f.y, 0, currentX, f.y, outerHaloR);
          outerGrad.addColorStop(0, f.outerGlowColor);
          outerGrad.addColorStop(0.6, f.outerGlowColor.replace('0.3', '0.08'));
          outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.globalAlpha = alpha * 0.85;
          ctx.fillStyle = outerGrad;
          ctx.beginPath();
          ctx.arc(currentX, f.y, outerHaloR, 0, Math.PI * 2);
          ctx.fill();

          // B. Vibrant inner glowing halo with shadow blur
          ctx.globalAlpha = alpha;
          ctx.shadowBlur = 14 * pulse + 8;
          ctx.shadowColor = f.glowColor;
          ctx.fillStyle = f.glowColor;
          ctx.beginPath();
          ctx.arc(currentX, f.y, currentRadius * 1.8, 0, Math.PI * 2);
          ctx.fill();

          // C. Crisp, incandescent core
          ctx.globalAlpha = Math.min(1, alpha + 0.2);
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#ffffff';
          ctx.fillStyle = f.coreColor;
          ctx.beginPath();
          ctx.arc(currentX, f.y, currentRadius, 0, Math.PI * 2);
          ctx.fill();

          // D. Bright white center glint
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(currentX, f.y, currentRadius * 0.35, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // 3. Shimmering Fairy Spores (fast twinkling fairy dust)
        for (const s of nightSpores) {
          s.alpha += s.alphaSpeed;
          if (s.alpha > 0.95 || s.alpha < 0.1) {
            s.alphaSpeed = -s.alphaSpeed;
          }
          s.y += s.vy;
          if (s.y < -10) {
            s.y = cssHeight + 10;
            s.x = Math.random() * cssWidth;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0.1, Math.min(1, s.alpha));
          ctx.shadowBlur = 6;
          ctx.shadowColor = s.color;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // ========================================
      // STYLE 2: AURORA (Northern Lights Ribbons & Shooting Stars)
      // ========================================
      else if (theme === 'aurora') {
        const time = frame * 0.014;

        // Animated Wavy Polar Plasma Curtains
        const drawAuroraRibbon = (
          yBase: number,
          colorTop: string,
          colorMid: string,
          colorBot: string,
          amplitude: number,
          frequency: number,
          speed: number
        ) => {
          const grad = ctx.createLinearGradient(0, yBase - 190, 0, yBase + 200);
          grad.addColorStop(0, colorTop);
          grad.addColorStop(0.45, colorMid);
          grad.addColorStop(0.8, colorBot);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0, cssHeight);
          ctx.lineTo(0, yBase);

          for (let x = 0; x <= cssWidth; x += 18) {
            const y =
              yBase +
              Math.sin(x * frequency + time * speed) * amplitude +
              Math.cos(x * 0.003 - time * 0.7) * (amplitude * 0.45) +
              Math.sin(x * 0.009 + time * 0.4) * (amplitude * 0.2);
            ctx.lineTo(x, y);
          }

          ctx.lineTo(cssWidth, cssHeight);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.38;
          ctx.fill();
          ctx.restore();
        };

        // Layer 1: High Cyan & Aqua wave
        drawAuroraRibbon(
          cssHeight * 0.22,
          'rgba(34, 211, 238, 0.7)',
          'rgba(20, 184, 166, 0.45)',
          'rgba(6, 182, 212, 0.15)',
          85,
          0.0032,
          1.0
        );
        // Layer 2: Mid Magenta & Deep Violet wave
        drawAuroraRibbon(
          cssHeight * 0.4,
          'rgba(236, 72, 153, 0.55)',
          'rgba(168, 85, 247, 0.45)',
          'rgba(147, 51, 234, 0.15)',
          100,
          0.0026,
          0.85
        );
        // Layer 3: Lower Emerald & Turquoise wave
        drawAuroraRibbon(
          cssHeight * 0.55,
          'rgba(52, 211, 153, 0.5)',
          'rgba(16, 185, 129, 0.35)',
          'rgba(4, 120, 87, 0.1)',
          75,
          0.0038,
          1.2
        );

        // Cosmic Starfield with 4-Point diffraction spikes
        for (const p of auroraParticles) {
          p.alpha += p.alphaSpeed;
          if (p.alpha > 0.95 || p.alpha < 0.15) {
            p.alphaSpeed = -p.alphaSpeed;
          }
          p.y += p.vy;
          if (p.y < 0) p.y = cssHeight;

          ctx.save();
          ctx.globalAlpha = Math.max(0.1, Math.min(1, p.alpha));
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          if (p.hasFlare && p.alpha > 0.6) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 0.8;
            const flareLen = p.radius * 4;
            ctx.beginPath();
            ctx.moveTo(p.x - flareLen, p.y);
            ctx.lineTo(p.x + flareLen, p.y);
            ctx.moveTo(p.x, p.y - flareLen);
            ctx.lineTo(p.x, p.y + flareLen);
            ctx.stroke();
          }

          ctx.restore();
        }

        // Shooting Star Meteor Generator
        const now = Date.now();
        if (!shootingStar.active && now > nextShootingStarTime) {
          shootingStar = {
            x: Math.random() * (cssWidth * 0.75),
            y: Math.random() * (cssHeight * 0.4),
            length: 100 + Math.random() * 90,
            speed: 16 + Math.random() * 10,
            angle: Math.PI / 4 + (Math.random() - 0.5) * 0.25,
            opacity: 1.0,
            active: true,
          };
          nextShootingStarTime = now + 3500 + Math.random() * 4500;
        }

        if (shootingStar.active) {
          ctx.save();
          const tailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length;
          const tailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length;

          const shootGrad = ctx.createLinearGradient(tailX, tailY, shootingStar.x, shootingStar.y);
          shootGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          shootGrad.addColorStop(0.65, 'rgba(236, 72, 153, 0.65)');
          shootGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');

          ctx.strokeStyle = shootGrad;
          ctx.lineWidth = 2.2;
          ctx.shadowBlur = 14;
          ctx.shadowColor = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(shootingStar.x, shootingStar.y);
          ctx.stroke();

          // Meteor incandescent tip
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(shootingStar.x, shootingStar.y, 2.5, 0, Math.PI * 2);
          ctx.fill();

          shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
          shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
          shootingStar.opacity -= 0.024;

          if (shootingStar.opacity <= 0) {
            shootingStar.active = false;
          }
          ctx.restore();
        }
      }

      // ========================================
      // STYLE 3: INFERNO (Volcanic Embers, Sparks & Fire Breath)
      // ========================================
      else if (theme === 'inferno') {
        const time = frame * 0.035;

        // Pulsating Magma Firelight at bottom screen
        const flameHeight = 240 + Math.sin(time * 2) * 25 + Math.cos(time * 3.2) * 18;
        const heatGrad = ctx.createLinearGradient(0, cssHeight, 0, cssHeight - flameHeight);
        heatGrad.addColorStop(0, 'rgba(234, 88, 12, 0.55)');
        heatGrad.addColorStop(0.35, 'rgba(220, 38, 38, 0.35)');
        heatGrad.addColorStop(0.7, 'rgba(185, 28, 28, 0.15)');
        heatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = heatGrad;
        ctx.fillRect(0, cssHeight - flameHeight, cssWidth, flameHeight);

        // Rising embers with thermodynamic cooling physics
        for (let i = 0; i < infernoEmbers.length; i++) {
          const e = infernoEmbers[i];
          e.life++;
          e.y += e.vy;
          e.x += e.vx + Math.sin(e.life * 0.08) * 0.7;
          e.vx += e.turbulence;

          e.heat = Math.max(0.1, 1 - e.life / e.maxLife);

          if (e.life >= e.maxLife || e.y < -20) {
            infernoEmbers[i] = createInfernoEmber();
            continue;
          }

          let color = '#ea580c';
          let glow = 'rgba(234, 88, 12, 0.85)';
          if (e.heat > 0.72) {
            color = '#fef08a'; // White-yellow incandescent
            glow = 'rgba(254, 240, 138, 0.95)';
          } else if (e.heat > 0.42) {
            color = '#f97316'; // Flaming orange
            glow = 'rgba(249, 115, 22, 0.88)';
          } else {
            color = '#dc2626'; // Deep smoldering ruby red
            glow = 'rgba(220, 38, 38, 0.65)';
          }

          const alpha = e.heat * (0.45 + Math.random() * 0.55);

          ctx.save();
          ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
          ctx.shadowBlur = 16;
          ctx.shadowColor = glow;
          ctx.fillStyle = color;

          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius * e.heat + 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Rapid Crackling Micro-Sparks
        for (const sp of infernoSparks) {
          sp.y += sp.vy;
          sp.x += sp.vx;
          if (sp.y < -20) {
            sp.y = cssHeight + 20;
            sp.x = Math.random() * cssWidth;
          }

          ctx.save();
          ctx.globalAlpha = sp.alpha * (0.6 + Math.random() * 0.4);
          ctx.strokeStyle = sp.color;
          ctx.lineWidth = 1.4;
          ctx.shadowBlur = 8;
          ctx.shadowColor = sp.color;
          ctx.beginPath();
          ctx.moveTo(sp.x, sp.y);
          ctx.lineTo(sp.x - sp.vx * 2, sp.y - sp.length);
          ctx.stroke();
          ctx.restore();
        }
      }

      // ========================================
      // STYLE 4: HOLOPOP (3D Iridescent Bubbles & Star Sparkles)
      // ========================================
      else if (theme === 'holopop') {
        // Floating 3D Spherical Iridescent Bubbles
        for (const b of holopopBubbles) {
          b.bobPhase += b.bobSpeed;
          b.y += b.vy;
          b.x += b.vx + Math.sin(b.bobPhase) * 0.4;

          if (b.y < -b.radius * 2) {
            b.y = cssHeight + b.radius * 2;
            b.x = Math.random() * cssWidth;
          }

          ctx.save();
          ctx.globalAlpha = b.opacity;

          // 3D Spherical Radial Highlight
          const grad = ctx.createRadialGradient(
            b.x - b.radius * 0.35,
            b.y - b.radius * 0.35,
            b.radius * 0.08,
            b.x,
            b.y,
            b.radius
          );
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
          grad.addColorStop(0.3, b.tint);
          grad.addColorStop(0.85, b.tint.replace('0.45', '0.12'));
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.7)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();

          // Glossy rainbow rim stroke
          ctx.strokeStyle = b.rimColor;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Top-Left Primary Specular Glint
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.beginPath();
          ctx.arc(b.x - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.22, 0, Math.PI * 2);
          ctx.fill();

          // Bottom-Right Bounce Light
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.arc(b.x + b.radius * 0.32, b.y + b.radius * 0.32, b.radius * 0.14, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // 4-Point Rotating Diamond Star Sparkles
        for (const s of holopopSparkles) {
          s.alpha += s.alphaSpeed;
          s.rot += s.rotSpeed;

          if (s.alpha > 0.95 || s.alpha < 0.08) {
            s.alphaSpeed = -s.alphaSpeed;
          }

          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          ctx.globalAlpha = Math.max(0.1, Math.min(1, s.alpha));
          ctx.fillStyle = s.color;
          ctx.shadowBlur = 12;
          ctx.shadowColor = s.color;

          ctx.beginPath();
          ctx.moveTo(0, -s.size);
          ctx.quadraticCurveTo(0, 0, s.size, 0);
          ctx.quadraticCurveTo(0, 0, 0, s.size);
          ctx.quadraticCurveTo(0, 0, -s.size, 0);
          ctx.quadraticCurveTo(0, 0, 0, -s.size);
          ctx.fill();

          ctx.restore();
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. NIGHT AMBIENT GRADIENTS */}
      {theme === 'night' && (
        <div className="absolute inset-0 bg-zinc-950 transition-colors duration-500">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px] animate-pulse duration-[6000ms]" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-lime-500/10 rounded-full blur-[140px] animate-pulse duration-[8000ms]" />
          <div className="absolute bottom-10 -right-20 w-[350px] h-[350px] bg-emerald-400/15 rounded-full blur-[120px]" />
        </div>
      )}

      {/* 2. AURORA AMBIENT GRADIENTS */}
      {theme === 'aurora' && (
        <div className="absolute inset-0 bg-[#08091a] transition-colors duration-500">
          <div className="absolute top-0 inset-x-0 h-[480px] bg-gradient-to-b from-cyan-900/35 via-purple-900/30 to-transparent blur-3xl animate-pulse duration-[7000ms]" />
          <div className="absolute top-1/3 -left-20 w-[420px] h-[420px] bg-cyan-500/20 rounded-full blur-[130px] animate-pulse duration-[5000ms]" />
          <div className="absolute top-1/2 -right-20 w-[420px] h-[420px] bg-pink-500/20 rounded-full blur-[130px] animate-pulse duration-[6000ms]" />
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[350px] bg-emerald-500/15 rounded-full blur-[140px]" />
        </div>
      )}

      {/* 3. INFERNO AMBIENT GRADIENTS */}
      {theme === 'inferno' && (
        <div className="absolute inset-0 bg-[#0d0603] transition-colors duration-500">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[480px] h-[320px] bg-orange-600/20 rounded-full blur-[120px] animate-pulse duration-[4000ms]" />
          <div className="absolute bottom-0 inset-x-0 h-[400px] bg-gradient-to-t from-red-950/50 via-orange-950/35 to-transparent blur-2xl animate-pulse duration-[3000ms]" />
          <div className="absolute top-1/2 right-0 w-[350px] h-[350px] bg-amber-500/15 rounded-full blur-[100px]" />
        </div>
      )}

      {/* 4. HOLOPOP AMBIENT GRADIENTS */}
      {theme === 'holopop' && (
        <div className="absolute inset-0 bg-gradient-to-tr from-[#f3e8ff] via-[#ffe4e6] to-[#e0f2fe] transition-colors duration-500">
          <div className="absolute top-12 left-10 w-80 h-80 bg-pink-300/45 rounded-full blur-3xl animate-pulse duration-[5000ms]" />
          <div className="absolute top-1/3 right-8 w-88 h-88 bg-purple-300/40 rounded-full blur-3xl animate-pulse duration-[6000ms]" />
          <div className="absolute bottom-16 left-1/4 w-96 h-96 bg-cyan-200/50 rounded-full blur-3xl animate-pulse duration-[7000ms]" />
        </div>
      )}

      {/* 60FPS Hardware-Accelerated Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
};
