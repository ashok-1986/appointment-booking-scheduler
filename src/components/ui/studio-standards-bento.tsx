"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode, TouchEvent } from "react";
import {
  ShieldCheck,
  Sparkles,
  Droplets,
  HeartHandshake,
  Feather,
  Flower2,
  PenTool,
  Palette,
  Compass,
  Layers,
  Flame,
  CheckCircle2,
  Clock,
  Award,
} from "lucide-react";

/* ==========================================================================
   Types
   ========================================================================== */

type Accent = "lime" | "emerald" | "amber" | "rose" | "cyan";
type LineType = "prep" | "ok" | "info" | "spec";

interface TattooCraft {
  id: string;
  name: string;
  gauge: string;
  desc: string;
  rgb: string;
  icon: ReactNode;
}

interface ProtocolLine {
  type: LineType;
  tag: string;
  text: string;
}

/* ==========================================================================
   Constants & Studio Data
   ========================================================================== */

// Spotlight colors, as "r, g, b"
const ACCENTS: Record<Accent, string> = {
  lime: "196, 255, 97", // Electric Lime #C4FF61
  emerald: "52, 211, 153",
  amber: "251, 191, 36",
  rose: "244, 114, 182",
  cyan: "56, 189, 248",
};

const GRID_IMAGE =
  "linear-gradient(rgba(196,255,97,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(196,255,97,0.06) 1px, transparent 1px)";

const SERIES_LENGTH = 36;
const TICK_MS = 1400;

// Skin Healing Recovery Phases (Days 1 - 30)
const HEALING_STAGES = [
  { name: "Day 1–3 (Barrier)", retention: 99 },
  { name: "Day 4–7 (Hydrate)", retention: 96 },
  { name: "Day 8–14 (Regen)", retention: 98 },
  { name: "Day 15–30 (True Ink)", retention: 99.4 },
];

// Clinical Hygiene & Session Protocol Stream
const PROTOCOL_SCRIPT: ProtocolLine[] = [
  { type: "prep", tag: "AUTOCLAVE", text: "Medical autoclave sterilization cycle verified (134°C, 30 PSI)" },
  { type: "ok", tag: "STERILE", text: "Single-use Kwadron/Cheyenne cartridge opened in client view" },
  { type: "spec", tag: "ORGANIC", text: "100% Raw vegan carbon black & dynamic pigments dispensed" },
  { type: "info", tag: "ANATOMY", text: "Dermal depth calibration: 1.5mm precise layer mapping" },
  { type: "ok", tag: "BARRIER", text: "Hospital-grade Cavicide surface sanitation & drape complete" },
  { type: "prep", tag: "ERGONOMICS", text: "Artist posture & memory foam collector armrest locked" },
  { type: "spec", tag: "PRECISION", text: "Single-needle 0401RL micro-realism pass in progress" },
  { type: "ok", tag: "SEAL", text: "Hypoallergenic breathable SecondSkin protective seal applied" },
  { type: "info", tag: "AFTERCARE", text: "Personalized botanical balm & healing protocol booklet issued" },
];

const PROTOCOL_VISIBLE = 9;

const LINE_STYLES: Record<LineType, { markClass: string; textClass: string }> = {
  prep: { markClass: "text-[#C4FF61]", textClass: "text-zinc-200" },
  ok: { markClass: "text-emerald-300", textClass: "text-zinc-300" },
  info: { markClass: "text-amber-300", textClass: "text-zinc-400" },
  spec: { markClass: "text-cyan-300", textClass: "text-cyan-200 font-medium" },
};

const STUDIO_METRICS = [
  { label: "Hygiene", score: 100, unit: "%", sub: "Hospital Grade" },
  { label: "Vegan Ink", score: 100, unit: "%", sub: "Cruelty Free" },
  { label: "Retention", score: 98, unit: "%", sub: "Healed True" },
  { label: "Rating", score: 5.0, unit: "★", sub: "Collector Score" },
];

/* ==========================================================================
   Crafts & Styles Data
   ========================================================================== */

const CRAFTS: TattooCraft[] = [
  {
    id: "micro-realism",
    name: "Micro-Realism",
    gauge: "0401RL (0.15mm)",
    desc: "Ultra-fine portraiture, architectural landmarks, and photographic miniature details with surgical depth control.",
    rgb: "196, 255, 97", // Lime
    icon: <Sparkles className="w-6 h-6 stroke-[1.8]" />,
  },
  {
    id: "fine-line",
    name: "Fine-Line Flora",
    gauge: "0601RL (0.20mm)",
    desc: "Delicate botanical silhouettes, wildflower anatomy, and flowing stems engineered to age gracefully without blurring.",
    rgb: "244, 114, 182", // Rose
    icon: <Flower2 className="w-6 h-6 stroke-[1.8]" />,
  },
  {
    id: "minimalist-script",
    name: "Bespoke Script",
    gauge: "0801RL",
    desc: "Handcrafted typography, emotional cursive scripts, and subtle coordinate markings drafted to skin contours.",
    rgb: "251, 191, 36", // Amber
    icon: <Feather className="w-6 h-6 stroke-[1.8]" />,
  },
  {
    id: "black-grey",
    name: "Black & Grey Wash",
    gauge: "0803RS",
    desc: "Multi-step pigment dilutions producing velvety atmospheric shadows, sculpture textures, and timeless contrast.",
    rgb: "203, 213, 225", // Slate
    icon: <Palette className="w-6 h-6 stroke-[1.8]" />,
  },
  {
    id: "geometric",
    name: "Sacred Geometry",
    gauge: "0803RL",
    desc: "Rigorous optical symmetry, mathematical mandalas, and stippling dotwork gradients positioned along body flow.",
    rgb: "56, 189, 248", // Cyan
    icon: <Compass className="w-6 h-6 stroke-[1.8]" />,
  },
  {
    id: "coverup",
    name: "Cover-up Alchemy",
    gauge: "1007M1",
    desc: "Clever anatomical redesign and structural camouflage that transforms older tattoos or scars into fresh art.",
    rgb: "168, 85, 247", // Purple
    icon: <Layers className="w-6 h-6 stroke-[1.8]" />,
  },
  {
    id: "touchup",
    name: "Healed Tune-up",
    gauge: "Custom",
    desc: "Complimentary fine-line precision pass once settled to guarantee lifelong clarity, crispness, and depth.",
    rgb: "52, 211, 153", // Emerald
    icon: <CheckCircle2 className="w-6 h-6 stroke-[1.8]" />,
  },
  {
    id: "consultation",
    name: "1:1 Concepting",
    gauge: "Digital Mockup",
    desc: "Private consultative session to test stencil sizes, skin placement flow, and anatomy dynamics before inking.",
    rgb: "255, 255, 255", // White
    icon: <PenTool className="w-6 h-6 stroke-[1.8]" />,
  },
];

/* ==========================================================================
   Helpers
   ========================================================================== */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

function useAnimatedNumber(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setValue(target);
      return;
    }

    const from = current.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function initialSeries(): number[] {
  return Array.from({ length: SERIES_LENGTH }, (_, i) => 96 + Math.sin(i * 0.4) * 2.5 + ((i * 11) % 4) * 0.4);
}

function toSmoothPath(points: Array<{ x: number; y: number }>): string {
  return points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const mid = (prev.x + p.x) / 2;
    return `${d} C ${mid} ${prev.y}, ${mid} ${p.y}, ${p.x} ${p.y}`;
  }, "");
}

/* ==========================================================================
   GlowCard Shell
   ========================================================================== */

function GlowCard({
  accent,
  className = "",
  children,
}: {
  accent: Accent;
  className?: string;
  children: ReactNode;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const rgb = ACCENTS[accent];

  const update = (clientX: number, clientY: number) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: clientX - r.left, y: clientY - r.top });
  };

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => update(e.clientX, e.clientY);
  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) update(e.touches[0].clientX, e.touches[0].clientY);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onTouchStart={() => setActive(true)}
      onTouchEnd={() => setActive(false)}
      className={cx(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0d0e14]/90 p-5 sm:p-6 backdrop-blur-md transition-all duration-300",
        className
      )}
    >
      {/* Spotlight following cursor */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-500 ease-out"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(350px circle at ${pos.x}px ${pos.y}px, rgba(${rgb}, 0.16), transparent 75%)`,
        }}
        aria-hidden="true"
      />

      {/* Grid pattern revealed near mouse */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          opacity: active ? 0.35 : 0,
          backgroundImage: GRID_IMAGE,
          backgroundSize: "24px 24px",
          maskImage: `radial-gradient(220px circle at ${pos.x}px ${pos.y}px, black 30%, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(220px circle at ${pos.x}px ${pos.y}px, black 30%, transparent 80%)`,
        }}
        aria-hidden="true"
      />

      {/* Outer subtle glow on card borders */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-500 ease-out"
        style={{
          opacity: active ? 1 : 0,
          boxShadow: `inset 0 0 0 1px rgba(${rgb}, 0.35)`,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/5 pb-3">
      <h3 className="font-cormorant text-xl font-medium tracking-wide text-zinc-100 sm:text-2xl">{children}</h3>
      {right}
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4FF61]/30 bg-[#C4FF61]/10 px-2.5 py-0.5 font-montserrat text-[11px] font-semibold uppercase tracking-wider text-[#C4FF61]">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C4FF61]" />
      {label}
    </span>
  );
}

/* ==========================================================================
   Card 1: Skin Healing & Retention Curve
   ========================================================================== */

function HealingRecoveryCard() {
  const [data, setData] = useState<number[]>(initialSeries);
  const [selectedStage, setSelectedStage] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setData((prev) => {
        const last = prev[prev.length - 1];
        const next = clamp(last + (Math.random() - 0.48) * 0.8, 95.5, 99.8);
        return [...prev.slice(1), next];
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const latest = data[data.length - 1];
  const animatedScore = useAnimatedNumber(latest, 500);

  const w = 480;
  const h = 130;
  const min = 94;
  const max = 100;
  const pad = 12;

  const points = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - ((v - min) / (max - min)) * (h - pad * 2),
  }));

  const linePath = toSmoothPath(points);
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${w - pad} ${h} L ${pad} ${h} Z`;

  return (
    <GlowCard accent="lime" className="min-h-[260px] sm:col-span-2 lg:col-span-2">
      <CardTitle right={<StatusPill label="Optimal Healing" />}>Skin Healing & Pigment Retention</CardTitle>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-montserrat text-3xl font-semibold text-white [font-variant-numeric:tabular-nums]">
            {animatedScore.toFixed(1)}%
          </span>
          <span className="font-montserrat text-xs text-zinc-400">Pigment Stability Index</span>
        </div>
        <div className="font-montserrat text-xs text-[#C4FF61]">Zero Scabbing · Clean Epidermal Seal</div>
      </div>

      {/* SVG Chart */}
      <div className="relative mt-3 h-[130px] w-full">
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="mp-healing-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C4FF61" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#C4FF61" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill="url(#mp-healing-fill)" />
          <path d={linePath} fill="none" stroke="#C4FF61" strokeWidth="2.5" strokeLinecap="round" />

          {/* Pulsing head point */}
          <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill="#C4FF61" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="9" fill="none" stroke="#C4FF61" strokeWidth="1.5" className="animate-ping" opacity="0.6" />
        </svg>
      </div>

      {/* Timeline stages selector */}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4">
        {HEALING_STAGES.map((st, i) => (
          <button
            key={st.name}
            type="button"
            onClick={() => setSelectedStage(i)}
            className={cx(
              "flex flex-col rounded-xl border p-2 text-left transition-all",
              selectedStage === i
                ? "border-[#C4FF61]/60 bg-[#C4FF61]/10 text-white"
                : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/20"
            )}
          >
            <span className="font-montserrat text-[11px] font-semibold">{st.name}</span>
            <span className="font-montserrat text-[10px] text-zinc-400">{st.retention}% Target</span>
          </button>
        ))}
      </div>
    </GlowCard>
  );
}

/* ==========================================================================
   Card 2: Clinical Sterilization Protocol Stream
   ========================================================================== */

function SterilizationTerminalCard() {
  const [printed, setPrinted] = useState(4);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (printed >= PROTOCOL_SCRIPT.length) {
      const resetId = window.setTimeout(() => {
        setPrinted(1);
        setKey((k) => k + 1);
      }, 5000);
      return () => window.clearTimeout(resetId);
    }

    const nextId = window.setTimeout(() => {
      setPrinted((n) => n + 1);
    }, 1300);

    return () => window.clearTimeout(nextId);
  }, [printed, key]);

  const visible = PROTOCOL_SCRIPT.slice(0, printed);
  const first = Math.max(0, visible.length - PROTOCOL_VISIBLE);
  const slice = visible.slice(first);

  return (
    <GlowCard accent="cyan" className="min-h-[260px] sm:col-span-2 lg:col-span-2 lg:row-span-2">
      <CardTitle right={<span className="font-mono text-[11px] uppercase tracking-wider text-cyan-300">Class-B Autoclave</span>}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#C4FF61]" />
          <span>Sterile Session Protocol</span>
        </div>
      </CardTitle>

      <div
        role="region"
        aria-label="Clinical Sterilization Protocol Stream"
        aria-live="off"
        className="flex flex-1 flex-col justify-end space-y-2.5 overflow-hidden rounded-2xl border border-white/5 bg-black/50 p-4 font-mono text-[12px] leading-relaxed backdrop-blur-sm sm:text-[13px]"
      >
        {slice.map((line, i) => {
          const style = LINE_STYLES[line.type];
          const isLast = first + i === printed - 1;
          return (
            <div key={first + i} className="flex items-start gap-2.5">
              <span className={cx("shrink-0 font-bold tracking-wider", style.markClass)}>
                [{line.tag}]
              </span>
              <span className={cx("min-w-0 break-words", style.textClass)}>
                {line.text}
                {isLast && printed < PROTOCOL_SCRIPT.length && (
                  <span className="tb-blink ml-1.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-[#C4FF61]" />
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          Single-use needle barrier verification
        </span>
        <span className="font-montserrat text-[11px] text-zinc-400">Live Clinical Log</span>
      </div>
    </GlowCard>
  );
}

/* ==========================================================================
   Card 3: Studio Safety & Quality Index
   ========================================================================== */

function QualityMetersCard() {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;

  return (
    <GlowCard accent="emerald" className="min-h-[220px]">
      <CardTitle right={<Award className="h-4 w-4 text-emerald-400" />}>
        Studio Standards
      </CardTitle>

      <div className="grid grid-cols-2 gap-3 pt-2">
        {STUDIO_METRICS.map((item) => (
          <div key={item.label} className="group flex flex-col items-center rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-center transition-all hover:border-emerald-400/40 hover:bg-emerald-400/5">
            <div className="relative h-14 w-14">
              <svg viewBox="0 0 54 54" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="27" cy="27" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle
                  cx="27"
                  cy="27"
                  r={radius}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  className="tb-ring transition-all duration-500 group-hover:[filter:drop-shadow(0_0_6px_#34d399)]"
                  style={
                    {
                      "--from": `${circumference}`,
                      "--to": `${circumference * (1 - (item.score > 5 ? item.score / 100 : 1))}`,
                    } as CSSProperties
                  }
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-montserrat text-xs font-bold text-white">
                {item.score}
                <span className="text-[10px] text-emerald-300">{item.unit}</span>
              </div>
            </div>
            <span className="mt-2 font-montserrat text-xs font-medium text-zinc-200">{item.label}</span>
            <span className="font-montserrat text-[10px] text-zinc-400">{item.sub}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}

/* ==========================================================================
   Card 4: Needle Hours & Experience
   ========================================================================== */

function NeedleHoursCard() {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: 14 }, (_, i) => 120 + Math.sin(i * 0.9) * 45 + ((i * 17) % 15))
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setBars((prev) => [...prev.slice(1), clamp(prev[prev.length - 1] + (Math.random() - 0.46) * 25, 80, 180)]);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const animatedHours = useAnimatedNumber(1450, 800);
  const max = Math.max(...bars);

  return (
    <GlowCard accent="amber" className="min-h-[220px]">
      <CardTitle right={<Clock className="h-4 w-4 text-[#C4FF61]" />}>
        Needle Experience
      </CardTitle>

      <div className="flex flex-col">
        <div className="font-montserrat text-3xl font-bold tracking-tight text-white [font-variant-numeric:tabular-nums] sm:text-4xl">
          {Math.round(animatedHours).toLocaleString()}+ <span className="text-xl font-normal text-[#C4FF61]">hrs</span>
        </div>
        <p className="font-montserrat text-xs text-zinc-400 mt-0.5">
          Dedicated skin focus & custom fine-line craftsmanship
        </p>
      </div>

      {/* Dynamic monthly intensity bars */}
      <div className="mt-auto flex h-14 items-end gap-1.5 pt-4" aria-hidden="true">
        {bars.map((v, i) => (
          <span
            key={i}
            className={cx(
              "tb-bar flex-1 rounded-sm transition-all duration-700 ease-out",
              i === bars.length - 1
                ? "bg-[#C4FF61] shadow-[0_0_10px_rgba(196,255,97,0.8)]"
                : "bg-[#C4FF61]/30 hover:bg-[#C4FF61]/60"
            )}
            style={{ height: `${Math.max((v / max) * 100, 12)}%` }}
          />
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
        <span>Collector Retention</span>
        <span className="font-semibold text-[#C4FF61]">98.4% Return Rate</span>
      </div>
    </GlowCard>
  );
}

/* ==========================================================================
   Card 5: Signature Styles & Craft Explorer
   ========================================================================== */

function StyleCraftCard() {
  const [hoveredId, setHoveredId] = useState<string | null>("micro-realism");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const activeId = hoveredId ?? focusedId;
  const active = CRAFTS.find((c) => c.id === activeId) ?? CRAFTS[0];

  return (
    <GlowCard accent="lime" className="min-h-[240px] sm:col-span-2 lg:col-span-4">
      <CardTitle
        right={
          <span className="font-montserrat text-xs text-zinc-400 hidden sm:inline-block">
            Hover or tap to inspect needles & technique
          </span>
        }
      >
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-[#C4FF61]" />
          <span>Signature Tattoo Crafts & Needle Gauges</span>
        </div>
      </CardTitle>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {CRAFTS.map((craft) => {
          const on = craft.id === activeId;
          return (
            <li key={craft.id}>
              <button
                type="button"
                onMouseEnter={() => setHoveredId(craft.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setFocusedId(craft.id)}
                onBlur={() => setFocusedId(null)}
                aria-label={`${craft.name} ${craft.gauge}`}
                className="tb-tech-btn flex w-full flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4FF61]"
                style={{
                  color: on ? `rgb(${craft.rgb})` : "#94a3b8",
                  borderColor: on ? `rgba(${craft.rgb}, 0.65)` : "rgba(255,255,255,0.08)",
                  background: on ? `rgba(${craft.rgb}, 0.12)` : "rgba(255,255,255,0.03)",
                  transform: on ? "translateY(-4px)" : "translateY(0)",
                  boxShadow: on ? `0 10px 25px -8px rgba(${craft.rgb}, 0.5)` : "none",
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                  {craft.icon}
                </div>
                <span className="font-montserrat text-xs font-semibold text-white tracking-wide text-center">
                  {craft.name}
                </span>
                <span className="font-mono text-[10px] text-zinc-400">{craft.gauge}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Live Description Card */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1.5">
          <span className="font-cormorant text-lg font-medium text-white flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: `rgb(${active.rgb})` }}
            />
            {active.name} · <span className="font-mono text-xs text-[#C4FF61]">{active.gauge}</span>
          </span>
          <span className="font-montserrat text-[11px] text-zinc-400 uppercase tracking-wider">
            Custom Consultation Recommended
          </span>
        </div>
        <p className="font-montserrat text-xs text-zinc-300 leading-relaxed">
          {active.desc}
        </p>
      </div>
    </GlowCard>
  );
}

/* ==========================================================================
   Main Studio Standards Bento Component
   ========================================================================== */

interface StudioStandardsBentoProps {
  onBookClick?: () => void;
  className?: string;
}

export default function StudioStandardsBento({ onBookClick, className = "" }: StudioStandardsBentoProps) {
  return (
    <>
      <style jsx global>{`
        /* Blinking stream cursor */
        @keyframes tb-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .tb-blink { animation: tb-blink 1s steps(2, start) infinite; }

        /* Score rings fill up */
        @keyframes tb-ring {
          from { stroke-dashoffset: var(--from); }
          to { stroke-dashoffset: var(--to); }
        }
        .tb-ring { animation: tb-ring 1.2s cubic-bezier(0.4, 0, 0.2, 1) both; }

        /* Reduced motion: clean static presentation */
        @media (prefers-reduced-motion: reduce) {
          .tb-blink, .tb-ring { animation: none !important; }
          .tb-bar, .tb-tech-btn { transition: none !important; }
        }
      `}</style>

      <section className={cx("w-full bg-[#12131a] px-4 py-12 text-zinc-200 sm:px-6 sm:py-16 rounded-3xl border border-white/10 shadow-2xl", className)}>
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-white/10 pb-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C4FF61]/30 bg-[#C4FF61]/10 px-3 py-1 font-montserrat text-xs font-semibold uppercase tracking-widest text-[#C4FF61] mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Meet Prerna • Private Studio</span>
              </div>
              <h2 className="font-cormorant text-3xl font-medium tracking-tight text-white sm:text-5xl">
                Bespoke Artistry & Clinical Standards
              </h2>
              <p className="mt-3 font-montserrat text-sm text-zinc-400 leading-relaxed sm:text-base">
                Every piece is executed under hospital-grade sterilization protocols using 100% vegan organic pigments, single-use surgical cartridges, and customized skin-depth mapping.
              </p>
            </div>

            {onBookClick && (
              <button
                type="button"
                onClick={onBookClick}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#C4FF61] px-6 font-montserrat text-sm font-semibold text-[#1A1A1A] shadow-lg shadow-[#C4FF61]/20 transition-all hover:bg-[#EAFF27] hover:scale-105 active:scale-95"
              >
                <span>Jump to Enquiry Form</span>
                <span aria-hidden="true">↓</span>
              </button>
            )}
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-min lg:grid-cols-4">
            <HealingRecoveryCard />
            <SterilizationTerminalCard />
            <QualityMetersCard />
            <NeedleHoursCard />
            <StyleCraftCard />
          </div>
        </div>
      </section>
    </>
  );
}

export { StudioStandardsBento };
