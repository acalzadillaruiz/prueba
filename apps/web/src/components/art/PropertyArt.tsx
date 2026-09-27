"use client";

import { useId } from "react";
import type { Scene } from "@/types/domain";

/**
 * Brand illustrations used as placeholder "photos" in the prototype.
 * The sandbox network blocks stock-photo CDNs, so every image is a deterministic SVG scene
 * in the Caracas Night palette. Real listings will use uploaded photos (StorageProvider).
 */

const WALLS = ["#EDE6DB", "#E9E2D6", "#E4E0D8", "#EFE9E1", "#E7DED2", "#DCE3E6"];
const ACCENTS = ["#F26B4D", "#D4AF77", "#8AA4B5", "#2F6F4E", "#C9862A", "#6B7FA3"];
const SOFAS = ["#1F2A3F", "#8AA4B5", "#C9B79C", "#3D4B63", "#B9725E", "#6E7C6B"];

function pick<T>(arr: T[], seed: number, salt = 0): T {
  return arr[(seed * 7 + salt * 13) % arr.length];
}

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function Sky({ id, dusk }: { id: string; dusk: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          {dusk ? (
            <>
              <stop offset="0" stopColor="#0B1220" />
              <stop offset="0.45" stopColor="#1E2B4A" />
              <stop offset="0.78" stopColor="#8C5A6E" />
              <stop offset="1" stopColor="#F29A6B" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#9EC3D8" />
              <stop offset="0.7" stopColor="#D8E6EC" />
              <stop offset="1" stopColor="#F7F4EF" />
            </>
          )}
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id}-sky)`} />
    </>
  );
}

function Avila({ dusk, y = 170 }: { dusk: boolean; y?: number }) {
  return (
    <>
      <path
        d={`M0 ${y} L40 ${y - 38} L80 ${y - 60} L120 ${y - 48} L165 ${y - 78} L210 ${y - 62} L250 ${y - 88} L300 ${y - 58} L340 ${y - 70} L400 ${y - 40} L400 ${y + 40} L0 ${y + 40} Z`}
        fill={dusk ? "#1A2540" : "#7E9C8C"}
        opacity={dusk ? 1 : 0.85}
      />
      <path
        d={`M0 ${y + 10} L60 ${y - 18} L120 ${y - 6} L180 ${y - 30} L240 ${y - 12} L300 ${y - 34} L360 ${y - 16} L400 ${y - 22} L400 ${y + 40} L0 ${y + 40} Z`}
        fill={dusk ? "#141D33" : "#5F7F6E"}
      />
    </>
  );
}

function Palm({ x, y, s = 1, dark }: { x: number; y: number; s?: number; dark: boolean }) {
  const c = dark ? "#0A0F1B" : "#2F5A45";
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C 3 -30 -2 -60 4 -90" stroke={dark ? "#0A0F1B" : "#6B5840"} strokeWidth="4" fill="none" />
      {[-60, -25, 10, 45, 80, 150, 200].map((a) => (
        <path key={a} d="M4 -90 q 18 -8 34 6 q -18 -2 -34 -6" fill={c} transform={`rotate(${a} 4 -90)`} />
      ))}
    </g>
  );
}

function Windows({ x, y, w, h, cols, rows, seed, dusk }: { x: number; y: number; w: number; h: number; cols: number; rows: number; seed: number; dusk: boolean }) {
  const cells = [];
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const lit = ((seed + r * 31 + c * 17) * 2654435761) % 10 < (dusk ? 5 : 0);
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={x + c * cw + cw * 0.18}
          y={y + r * ch + ch * 0.2}
          width={cw * 0.64}
          height={ch * 0.6}
          rx="1"
          fill={dusk ? (lit ? "#F2C57C" : "#22314F") : "#9FB6C6"}
          opacity={dusk ? (lit ? 0.95 : 0.9) : 0.8}
        />,
      );
    }
  return <>{cells}</>;
}

function TowerScene({ id, seed, dusk }: { id: string; seed: number; dusk: boolean }) {
  const body = dusk ? ["#243453", "#2A3350", "#1F3048"][seed % 3] : ["#EDE6DB", "#E4D5C3", "#DCE1E4", "#F1E8DA"][seed % 4];
  const side = dusk ? "#1A2742" : ["#D8CFC2", "#CDBBA5", "#C3CBD1", "#DDD1BF"][seed % 4];
  return (
    <>
      <Sky id={id} dusk={dusk} />
      {dusk && <circle cx={320} cy={70} r={2} fill="#F7F4EF" opacity=".6" />}
      <Avila dusk={dusk} y={180} />
      {/* background towers */}
      {[20, 70, 300, 350].map((x, i) => (
        <g key={x}>
          <rect x={x} y={120 + (i % 2) * 20} width={42} height={180} fill={dusk ? "#18233B" : "#CFC6B8"} />
          <Windows x={x} y={125 + (i % 2) * 20} w={42} h={170} cols={3} rows={10} seed={seed + i} dusk={dusk} />
        </g>
      ))}
      {/* hero tower */}
      <rect x={130} y={48} width={120} height={252} fill={body} />
      <rect x={250} y={60} width={34} height={240} fill={side} />
      <rect x={126} y={42} width={128} height={8} fill={dusk ? "#2E4066" : "#FFFFFF"} />
      <Windows x={134} y={58} w={112} h={235} cols={5} rows={14} seed={seed} dusk={dusk} />
      {[0, 1, 2, 3, 4, 5, 6].map((r) => (
        <rect key={r} x={128} y={86 + r * 30} width={124} height={3} fill={dusk ? "#33466E" : "#FFFFFF"} opacity=".8" />
      ))}
      {/* ground */}
      <rect y={272} width={400} height={28} fill={dusk ? "#0B1220" : "#B7B0A2"} />
      <Palm x={100} y={285} s={0.9} dark={dusk} />
      <Palm x={300} y={290} s={1.05} dark={dusk} />
      {dusk && <rect x={180} y={276} width={40} height={3} fill="#F26B4D" opacity=".7" />}
    </>
  );
}

function HouseScene({ id, dusk, pool }: { id: string; seed: number; dusk: boolean; pool?: boolean }) {
  const wall = dusk ? "#E9E1D4" : "#F4EFE7";
  const glow = dusk ? `url(#${id}-glow)` : "#8FB0C4";
  const roof = dusk ? "#23272E" : "#3A3F46";
  const wood = dusk ? "#7A5638" : "#A7774F";
  return (
    <>
      <defs>
        <linearGradient id={`${id}-glow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7D39A" />
          <stop offset="1" stopColor="#E9A866" />
        </linearGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dusk ? "#2D8BA3" : "#6FD0E0"} />
          <stop offset="1" stopColor={dusk ? "#1B5B72" : "#3BA7C2"} />
        </linearGradient>
      </defs>
      <Sky id={id} dusk={dusk} />
      {dusk && [30, 90, 150, 240, 330, 370, 60, 200].map((x, i) => <circle key={x} cx={x} cy={20 + ((i * 37) % 70)} r={1.1} fill="#F7F4EF" opacity={0.7} />)}
      <Avila dusk={dusk} y={175} />
      <rect y={196} width={400} height={104} fill={dusk ? "#1B2E23" : "#6F9A6A"} />
      {/* upper volume */}
      <rect x={176} y={86} width={190} height={78} fill={wall} />
      <rect x={168} y={78} width={206} height={9} fill={roof} />
      <rect x={190} y={98} width={132} height={54} fill={glow} opacity={dusk ? 1 : 0.85} />
      {[222, 256, 290].map((x) => <rect key={x} x={x} y={98} width={2} height={54} fill={dusk ? "#8A6A3C" : "#5E6A73"} />)}
      <rect x={332} y={98} width={24} height={54} fill={wood} />
      {[336, 342, 348].map((x) => <rect key={x} x={x} y={98} width={1.5} height={54} fill="#000" opacity=".25" />)}
      {dusk && <path d="M200 152 l12 -14 h18 l10 14 Z" fill="#8A6A3C" opacity=".45" />}
      {/* lower volume */}
      <rect x={40} y={128} width={250} height={92} fill={wall} />
      <rect x={32} y={120} width={266} height={9} fill={roof} />
      <rect x={56} y={142} width={160} height={70} fill={glow} opacity={dusk ? 1 : 0.85} />
      {[96, 136, 176].map((x) => <rect key={x} x={x} y={142} width={2} height={70} fill={dusk ? "#8A6A3C" : "#5E6A73"} />)}
      {dusk && (
        <>
          <rect x={70} y={186} width={60} height={16} rx={4} fill="#5B4632" opacity=".55" />
          <circle cx={165} cy={160} r={9} fill="#FFF3D6" opacity=".6" />
        </>
      )}
      <rect x={228} y={142} width={48} height={78} fill={wood} />
      {[234, 242, 250, 258, 266].map((x) => <rect key={x} x={x} y={142} width={1.5} height={78} fill="#000" opacity=".22" />)}
      <rect x={290} y={164} width={76} height={56} fill={dusk ? "#D8CEBF" : "#E7DFD3"} />
      <rect x={300} y={174} width={56} height={40} fill={dusk ? "#2B3A55" : "#9FB6C6"} />
      {pool ? (
        <>
          <rect x={10} y={228} width={380} height={50} rx={3} fill={`url(#${id}-water)`} />
          <rect x={56} y={230} width={160} height={14} fill={dusk ? "#F7D39A" : "#FFFFFF"} opacity={dusk ? 0.35 : 0.3} />
          <rect x={190} y={232} width={130} height={8} fill={dusk ? "#F7D39A" : "#FFFFFF"} opacity=".22" />
          {[252, 262, 270].map((y, i) => <rect key={y} x={40 + i * 90} y={y} width={80} height={2} fill="#FFFFFF" opacity=".3" />)}
          <rect x={0} y={278} width={400} height={22} fill={dusk ? "#CBBFAE" : "#E9E1D4"} />
          <rect x={60} y={283} width={46} height={8} rx={3} fill="#F7F4EF" />
          <rect x={120} y={283} width={46} height={8} rx={3} fill="#F7F4EF" />
          <rect x={290} y={280} width={40} height={12} rx={6} fill="#F26B4D" />
        </>
      ) : (
        <>
          <path d="M150 300 L178 220 L204 220 L222 300 Z" fill={dusk ? "#8C8577" : "#D9D1C3"} />
          {dusk && [120, 250, 300, 80].map((x) => <circle key={x} cx={x} cy={238} r={2.2} fill="#F7D39A" />)}
        </>
      )}
      <Palm x={24} y={232} s={0.95} dark={dusk} />
      <Palm x={378} y={238} s={1.05} dark={dusk} />
    </>
  );
}

function BeachScene({ id, dusk }: { id: string; dusk: boolean }) {
  return (
    <>
      <Sky id={id} dusk={dusk} />
      <circle cx={290} cy={dusk ? 150 : 70} r={dusk ? 26 : 20} fill={dusk ? "#F6A26F" : "#FFF3D6"} opacity=".95" />
      <rect y={150} width={400} height={80} fill={dusk ? "#23446A" : "#3FA6C0"} />
      <rect y={150} width={400} height={8} fill="#FFFFFF" opacity=".25" />
      {[170, 188, 205].map((y, i) => (
        <rect key={y} x={30 + i * 60} y={y} width={180} height={2} fill="#FFFFFF" opacity=".25" />
      ))}
      <path d="M0 225 Q 200 200 400 228 L400 300 L0 300 Z" fill={dusk ? "#C9A57E" : "#EFDDBC"} />
      <path d="M0 232 Q 200 210 400 236" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity=".6" />
      <rect x={250} y={190} width={110} height={50} fill="#F7F4EF" />
      <rect x={245} y={184} width={120} height={8} fill="#0B1220" />
      <rect x={262} y={202} width={40} height={30} fill={dusk ? "#F2C57C" : "#8FB0C4"} />
      <rect x={310} y={202} width={40} height={30} fill={dusk ? "#F2C57C" : "#8FB0C4"} />
      <Palm x={60} y={270} s={1.3} dark={dusk} />
      <Palm x={200} y={265} s={0.9} dark={dusk} />
      <rect x={110} y={255} width={36} height={6} rx="3" fill="#F26B4D" />
      <rect x={150} y={258} width={36} height={6} rx="3" fill="#F7F4EF" />
    </>
  );
}

function ChaletScene({ id, dusk }: { id: string; dusk: boolean }) {
  return (
    <>
      <Sky id={id} dusk={dusk} />
      <path d="M0 190 L90 70 L140 120 L220 40 L300 130 L350 90 L400 140 L400 300 L0 300 Z" fill={dusk ? "#26345A" : "#7D8FA6"} />
      <path d="M72 94 L90 70 L108 94 L98 90 L90 98 L80 90 Z M200 66 L220 40 L240 66 L228 60 L220 70 L210 60 Z M338 104 L350 90 L362 104 L350 100 Z" fill="#F7F4EF" />
      <path d="M0 220 Q 120 180 240 210 T 400 200 L400 300 L0 300 Z" fill={dusk ? "#1C3A2C" : "#557F52"} />
      {[30, 55, 330, 360].map((x, i) => (
        <path key={x} d={`M${x} ${250 - i * 4} l14 -48 l14 48 Z`} fill={dusk ? "#0F241A" : "#2E5237"} />
      ))}
      <rect x={140} y={200} width={130} height={70} fill={dusk ? "#8A6446" : "#A77A55"} />
      <path d="M125 204 L205 150 L285 204 Z" fill={dusk ? "#3B2A22" : "#5A3B2C"} />
      <rect x={160} y={220} width={30} height={26} fill={dusk ? "#F2C57C" : "#CFE0EA"} />
      <rect x={220} y={220} width={30} height={26} fill={dusk ? "#F2C57C" : "#CFE0EA"} />
      <rect x={196} y={235} width={20} height={35} fill="#3B2A22" />
      <rect x={240} y={160} width={12} height={26} fill="#3B2A22" />
      {dusk && <path d="M246 150 q 6 -10 0 -20 q -6 -10 2 -20" stroke="#8AA4B5" strokeWidth="3" fill="none" opacity=".5" />}
    </>
  );
}

function LandScene({ id, dusk }: { id: string; dusk: boolean }) {
  return (
    <>
      <Sky id={id} dusk={dusk} />
      <path d="M0 170 L70 110 L130 150 L200 80 L270 140 L330 100 L400 150 L400 300 L0 300 Z" fill={dusk ? "#26345A" : "#8C9DB0"} />
      <path d="M200 80 L215 95 L205 92 L200 98 L193 92 L186 94 Z" fill="#F7F4EF" />
      <path d="M0 210 Q 100 170 200 200 T 400 190 L400 300 L0 300 Z" fill={dusk ? "#2B4A33" : "#8DB36F"} />
      <path d="M0 240 Q 150 220 400 245 L400 300 L0 300 Z" fill={dusk ? "#223C2A" : "#77A05C"} />
      {[40, 90, 140, 190, 240, 290, 340].map((x) => (
        <g key={x}>
          <rect x={x} y={250} width={4} height={24} fill="#6B5840" />
        </g>
      ))}
      <path d="M40 256 L344 256 M40 266 L344 266" stroke="#6B5840" strokeWidth="1.5" />
      <rect x={300} y={206} width={60} height={30} rx="3" fill="#F26B4D" />
      <rect x={328} y={236} width={4} height={20} fill="#6B5840" />
      <text x={330} y={226} textAnchor="middle" fontSize="11" fontFamily="var(--font-display)" fill="#F7F4EF" fontWeight="700">
        NP
      </text>
    </>
  );
}

function WindowView({ x, y, w, h, id, dusk }: { x: number; y: number; w: number; h: number; id: string; dusk: boolean }) {
  return (
    <g>
      <clipPath id={`${id}-win`}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#${id}-win)`}>
        <rect x={x} y={y} width={w} height={h} fill={dusk ? "#2A3A5E" : "#B9D3E0"} />
        <rect x={x} y={y + h * 0.55} width={w} height={h * 0.45} fill={dusk ? "#F29A6B" : "#E8EEF0"} opacity=".45" />
        <path
          d={`M${x} ${y + h * 0.7} L${x + w * 0.2} ${y + h * 0.42} L${x + w * 0.45} ${y + h * 0.55} L${x + w * 0.7} ${y + h * 0.35} L${x + w} ${y + h * 0.6} L${x + w} ${y + h} L${x} ${y + h} Z`}
          fill={dusk ? "#18233B" : "#7E9C8C"}
        />
        {[0.1, 0.3, 0.55, 0.78].map((f, i) => (
          <rect key={f} x={x + w * f} y={y + h * (0.72 - (i % 2) * 0.08)} width={w * 0.1} height={h * 0.4} fill={dusk ? "#1A2742" : "#D8CFC2"} />
        ))}
      </g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#2B2F36" strokeWidth="4" />
      <rect x={x + w / 2 - 1.5} y={y} width={3} height={h} fill="#2B2F36" />
    </g>
  );
}

function Interior({ id, seed, children, wall, floor = "#C9A77E", dusk }: { id: string; seed: number; children: React.ReactNode; wall?: string; floor?: string; dusk?: boolean }) {
  const w = wall ?? pick(WALLS, seed);
  return (
    <>
      <defs>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={floor} />
          <stop offset="1" stopColor={floor} stopOpacity=".75" />
        </linearGradient>
        <radialGradient id={`${id}-light`} cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={dusk ? 0.05 : 0.35} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={w} />
      <rect y="226" width="400" height="74" fill={`url(#${id}-floor)`} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} d={`M${i * 60 - 40} 300 L${i * 50 + 20} 226`} stroke="#000" strokeOpacity=".06" />
      ))}
      <rect y="222" width="400" height="5" fill="#FFFFFF" opacity=".6" />
      {children}
      <rect width="400" height="300" fill={`url(#${id}-light)`} />
    </>
  );
}

function Living({ id, seed }: { id: string; seed: number }) {
  const sofa = pick(SOFAS, seed, 1);
  const dusk = seed % 3 === 0;
  return (
    <Interior id={id} seed={seed} dusk={dusk}>
      <WindowView x={200} y={40} w={170} h={150} id={id} dusk={dusk} />
      <rect x={30} y={60} width={70} height={54} fill={pick(ACCENTS, seed, 2)} opacity=".85" />
      <rect x={30} y={60} width={70} height={54} fill="none" stroke="#D4AF77" strokeWidth="3" />
      <path d="M142 0 L142 60" stroke="#2B2F36" strokeWidth="1.5" />
      <path d="M126 60 L158 60 L150 76 L134 76 Z" fill="#D4AF77" />
      {dusk && <circle cx={142} cy={80} r={30} fill="#F2C57C" opacity=".18" />}
      <rect x={20} y={168} width={220} height={52} rx="10" fill={sofa} />
      <rect x={20} y={150} width={220} height={34} rx="10" fill={sofa} />
      <rect x={34} y={156} width={50} height={26} rx="6" fill="#FFFFFF" opacity=".18" />
      <rect x={96} y={156} width={50} height={26} rx="6" fill="#FFFFFF" opacity=".12" />
      <rect x={30} y={218} width={8} height={12} fill="#2B2F36" />
      <rect x={222} y={218} width={8} height={12} fill="#2B2F36" />
      <ellipse cx={170} cy={262} rx={150} ry={22} fill={pick(ACCENTS, seed, 3)} opacity=".25" />
      <rect x={110} y={236} width={110} height={10} rx="4" fill="#3A3F46" />
      <rect x={122} y={246} width={6} height={16} fill="#3A3F46" />
      <rect x={202} y={246} width={6} height={16} fill="#3A3F46" />
      <rect x={140} y={228} width={24} height={8} rx="2" fill="#D4AF77" />
      <rect x={330} y={180} width={34} height={44} rx="4" fill="#B99C79" />
      <path d="M347 180 C 320 150 330 120 347 110 C 364 120 374 150 347 180" fill="#2F6F4E" />
      <path d="M347 180 C 340 150 355 130 368 128" stroke="#2F6F4E" strokeWidth="6" fill="none" />
    </Interior>
  );
}

function Kitchen({ id, seed }: { id: string; seed: number }) {
  const cab = seed % 2 ? "#1F2A3F" : "#F7F4EF";
  const counter = "#E9E6E1";
  return (
    <Interior id={id} seed={seed} floor="#B8A38A">
      <WindowView x={250} y={40} w={120} h={90} id={id} dusk={false} />
      <rect x={20} y={30} width={210} height={70} fill={cab} stroke="#00000014" />
      {[20, 90, 160].map((x) => (
        <rect key={x} x={x + 30} y={60} width={10} height={3} fill="#D4AF77" />
      ))}
      <rect x={20} y={100} width={210} height={46} fill="#DCE3E6" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={20 + i * 30} y={100} width={30} height={46} fill="none" stroke="#FFFFFF" strokeOpacity=".7" />
      ))}
      <rect x={20} y={146} width={350} height={10} fill={counter} />
      <rect x={20} y={156} width={350} height={70} fill={cab} stroke="#00000014" />
      <rect x={190} y={130} width={40} height={16} rx="3" fill="#3A3F46" />
      {/* island */}
      <rect x={70} y={200} width={240} height={14} fill={counter} />
      <rect x={80} y={214} width={220} height={50} fill={seed % 2 ? "#C9A77E" : "#1F2A3F"} />
      {[110, 170, 230].map((x) => (
        <g key={x}>
          <path d={`M${x} 0 L${x} 64`} stroke="#2B2F36" strokeWidth="1.5" />
          <path d={`M${x - 14} 64 L${x + 14} 64 L${x + 8} 80 L${x - 8} 80 Z`} fill="#D4AF77" />
          <rect x={x - 12} y={262} width={24} height={6} rx="2" fill="#F26B4D" />
          <rect x={x - 2} y={268} width={4} height={26} fill="#2B2F36" />
        </g>
      ))}
      <path d="M140 196 C 140 186 160 186 160 196 Z" fill="#2F6F4E" />
      <circle cx={260} cy={194} r={7} fill="#F26B4D" />
      <circle cx={272} cy={196} r={6} fill="#C9862A" />
    </Interior>
  );
}

function Bedroom({ id, seed }: { id: string; seed: number }) {
  const dusk = seed % 2 === 1;
  const throwC = pick(ACCENTS, seed, 5);
  return (
    <Interior id={id} seed={seed + 3} floor="#C4A585" dusk={dusk}>
      <WindowView x={290} y={40} w={90} h={140} id={id} dusk={dusk} />
      <path d="M284 36 q 8 80 -2 150 L276 186 L276 36 Z" fill="#F7F4EF" opacity=".9" />
      <rect x={70} y={96} width={200} height={70} rx="6" fill={pick(SOFAS, seed, 2)} />
      <rect x={60} y={160} width={220} height={60} rx="8" fill="#F7F4EF" />
      <rect x={60} y={190} width={220} height={36} rx="6" fill={throwC} opacity=".85" />
      <rect x={82} y={140} width={70} height={28} rx="10" fill="#FFFFFF" />
      <rect x={188} y={140} width={70} height={28} rx="10" fill="#FFFFFF" />
      <rect x={20} y={176} width={34} height={46} fill="#B99C79" />
      <rect x={286} y={176} width={34} height={46} fill="#B99C79" />
      <path d="M30 150 L44 150 L48 170 L26 170 Z" fill="#D4AF77" />
      <path d="M296 150 L310 150 L314 170 L292 170 Z" fill="#D4AF77" />
      {dusk && (
        <>
          <circle cx={37} cy={165} r={22} fill="#F2C57C" opacity=".22" />
          <circle cx={303} cy={165} r={22} fill="#F2C57C" opacity=".22" />
        </>
      )}
      <rect x={130} y={40} width={80} height={44} fill="#0B1220" />
      <path d="M134 80 L160 58 L176 70 L192 54 L206 80 Z" fill="#8AA4B5" />
      <circle cx={194} cy={52} r={5} fill="#F26B4D" />
    </Interior>
  );
}

function Bath({ id, seed }: { id: string; seed: number }) {
  return (
    <Interior id={id} seed={seed} wall="#E8E4DE" floor="#9BA5AC">
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={0} y={i * 23} width={400} height={1} fill="#FFFFFF" opacity=".7" />
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={i} x={i * 30} y={0} width={1} height={226} fill="#FFFFFF" opacity=".5" />
      ))}
      <rect x={60} y={40} width={120} height={90} rx="45" fill="#D6E2EA" stroke="#D4AF77" strokeWidth="4" />
      <rect x={40} y={150} width={160} height={14} fill="#F7F4EF" />
      <rect x={50} y={164} width={140} height={60} fill={seed % 2 ? "#1F2A3F" : "#B99C79"} />
      <ellipse cx={120} cy={152} rx={34} ry={6} fill="#FFFFFF" />
      <rect x={117} y={132} width={6} height={16} fill="#D4AF77" />
      <rect x={230} y={170} width={150} height={56} rx="26" fill="#FFFFFF" />
      <rect x={236} y={176} width={138} height={20} rx="10" fill="#CFE2EA" />
      <path d="M370 170 L370 120 L352 120" stroke="#D4AF77" strokeWidth="4" fill="none" />
      <path d="M270 130 C 262 104 276 90 288 100 C 300 90 312 110 300 130 Z" fill="#2F6F4E" />
      <rect x={278} y={130} width={16} height={20} fill="#F7F4EF" />
    </Interior>
  );
}

function Terrace({ id, seed }: { id: string; seed: number }) {
  const dusk = seed % 2 === 0;
  return (
    <>
      <Sky id={id} dusk={dusk} />
      <Avila dusk={dusk} y={150} />
      {[10, 60, 110, 170, 230, 290, 340].map((x, i) => (
        <g key={x}>
          <rect x={x} y={150 + (i % 3) * 12} width={40} height={100} fill={dusk ? "#1A2742" : "#CFC6B8"} />
          <Windows x={x} y={154 + (i % 3) * 12} w={40} h={80} cols={3} rows={6} seed={seed + i} dusk={dusk} />
        </g>
      ))}
      <rect y={206} width={400} height={94} fill={dusk ? "#5E4A3A" : "#B99373"} />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={0} y={210 + i * 8} width={400} height={1} fill="#000" opacity=".12" />
      ))}
      <rect y={170} width={400} height={40} fill="#BFD6E2" opacity=".25" />
      <rect y={168} width={400} height={3} fill="#D4AF77" />
      {dusk && (
        <path d="M0 40 Q 100 70 200 44 T 400 50" stroke="#2B2F36" fill="none" strokeWidth="1" />
      )}
      {dusk && [30, 80, 130, 180, 230, 280, 330, 380].map((x, i) => <circle key={x} cx={x} cy={50 + Math.sin(i) * 8} r={3} fill="#F2C57C" />)}
      <rect x={60} y={236} width={90} height={18} rx="6" fill="#F7F4EF" />
      <rect x={60} y={222} width={30} height={20} rx="6" fill="#F7F4EF" transform="rotate(-20 75 232)" />
      <rect x={200} y={236} width={90} height={18} rx="6" fill="#F7F4EF" />
      <rect x={165} y={244} width={24} height={14} rx="7" fill={pick(ACCENTS, seed)} />
      <path d="M350 250 C 330 210 340 180 356 170 C 372 184 378 214 360 250 Z" fill="#2F6F4E" />
      <rect x={338} y={246} width={40} height={30} rx="4" fill="#F26B4D" />
    </>
  );
}

function Office({ id, seed }: { id: string; seed: number }) {
  return (
    <Interior id={id} seed={seed} wall="#E4E0D8" floor="#8C8F94">
      <WindowView x={20} y={30} w={360} h={150} id={id} dusk={seed % 2 === 0} />
      {[60, 180, 300].map((x) => (
        <g key={x}>
          <rect x={x - 50} y={200} width={100} height={8} fill="#F7F4EF" />
          <rect x={x - 46} y={208} width={4} height={40} fill="#2B2F36" />
          <rect x={x + 42} y={208} width={4} height={40} fill="#2B2F36" />
          <rect x={x - 22} y={172} width={44} height={28} rx="2" fill="#0B1220" />
          <rect x={x - 18} y={176} width={36} height={20} fill="#223252" />
          <rect x={x - 14} y={182} width={18} height={3} fill="#F26B4D" />
          <rect x={x - 14} y={188} width={26} height={2} fill="#8AA4B5" />
          <rect x={x - 16} y={236} width={32} height={30} rx="6" fill="#1F2A3F" />
        </g>
      ))}
    </Interior>
  );
}

function Retail({ seed }: { id: string; seed: number }) {
  return (
    <>
      <rect width="400" height="300" fill="#E9E2D6" />
      <rect x={0} y={0} width={400} height={50} fill="#D8CFC2" />
      <rect x={30} y={60} width={340} height={30} fill="#F26B4D" />
      {Array.from({ length: 10 }).map((_, i) => (
        <path key={i} d={`M${30 + i * 34} 90 q 17 16 34 0`} fill="#F26B4D" />
      ))}
      <rect x={40} y={100} width={320} height={150} fill="#1F2A3F" />
      <rect x={46} y={106} width={150} height={138} fill="#F2E3C9" opacity=".9" />
      <rect x={204} y={106} width={150} height={138} fill="#F2E3C9" opacity=".9" />
      {[130, 170, 210].map((y) => (
        <g key={y}>
          <rect x={56} y={y} width={130} height={4} fill="#8A6A3C" />
          <rect x={214} y={y} width={130} height={4} fill="#8A6A3C" />
          {[62, 88, 114, 150, 222, 250, 280, 316].map((x, i) => (
            <rect key={x} x={x} y={y - 16} width={16} height={16} fill={pick(ACCENTS, seed + i)} />
          ))}
        </g>
      ))}
      <rect x={0} y={250} width={400} height={50} fill="#B7B0A2" />
      <text x={200} y={82} textAnchor="middle" fontSize="16" fontWeight="700" fontFamily="var(--font-display)" fill="#F7F4EF">
        LOCAL DISPONIBLE
      </text>
    </>
  );
}

function Warehouse({ id, seed }: { id: string; seed: number }) {
  return (
    <>
      <Sky id={id} dusk={seed % 2 === 0} />
      <rect y={230} width={400} height={70} fill="#8C8F94" />
      <path d="M30 110 L200 70 L370 110 L370 240 L30 240 Z" fill="#DCE3E6" />
      <path d="M30 110 L200 70 L370 110" stroke="#8AA4B5" strokeWidth="5" fill="none" />
      {Array.from({ length: 16 }).map((_, i) => (
        <rect key={i} x={30 + i * 21.25} y={110} width={1.5} height={130} fill="#AEBBC4" />
      ))}
      <rect x={70} y={150} width={90} height={90} fill="#3A3F46" />
      {Array.from({ length: 9 }).map((_, i) => (
        <rect key={i} x={70} y={150 + i * 10} width={90} height={1.5} fill="#5B616B" />
      ))}
      <rect x={200} y={150} width={90} height={90} fill="#3A3F46" />
      <rect x={60} y={230} width={240} height={14} fill="#F26B4D" />
      <rect x={300} y={130} width={50} height={30} fill="#8FB0C4" />
      <rect x={220} y={200} width={120} height={50} fill="#F7F4EF" />
      <rect x={340} y={214} width={40} height={36} fill="#0B1220" />
      <circle cx={250} cy={254} r={9} fill="#0B1220" />
      <circle cx={360} cy={254} r={9} fill="#0B1220" />
    </>
  );
}

function Lobby({ id, seed }: { id: string; seed: number }) {
  return (
    <Interior id={id} seed={seed} wall="#1F2A3F" floor="#E9E6E1" dusk>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={40 + i * 90} y={40} width={60} height={180} fill="#152033" stroke="#D4AF77" strokeWidth="2" />
      ))}
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={150 + i * 90} y={100} width={40} height={120} fill="#8AA4B5" opacity=".5" />
          <rect x={169 + i * 90} y={100} width={2} height={120} fill="#152033" />
        </g>
      ))}
      <rect x={20} y={196} width={120} height={36} fill="#D4AF77" />
      <rect x={20} y={192} width={120} height={6} fill="#F7F4EF" />
      <path d="M330 222 C 310 180 320 150 336 140 C 352 154 360 184 342 222 Z" fill="#2F6F4E" />
      <rect x={322} y={218} width={30} height={20} fill="#D4AF77" />
      <circle cx={200} cy={20} r={16} fill="#F2C57C" opacity=".6" />
      <path d="M0 300 L400 300 L400 280 Q 200 262 0 280 Z" fill="#FFFFFF" opacity=".3" />
    </Interior>
  );
}

export function PropertyArt({
  scene,
  seed = "np",
  className,
  label,
  photo,
}: {
  scene: Scene;
  seed?: string;
  className?: string;
  label?: string;
  /** AI-generated photo URL. When present it replaces the illustration. */
  photo?: string;
}) {
  // Unique per instance: two illustrations of the same listing on one page must not share gradient ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (photo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={label ?? scene} loading="lazy" decoding="async" className={`${className ?? ""} object-cover`} />;
  const n = hashStr(seed + scene);
  const id = `pa${n.toString(36)}${uid}`;
  let content: React.ReactNode;
  switch (scene) {
    case "tower-dusk":
      content = <TowerScene id={id} seed={n} dusk />;
      break;
    case "tower-day":
      content = <TowerScene id={id} seed={n} dusk={false} />;
      break;
    case "house-dusk":
      content = <HouseScene id={id} seed={n} dusk={n % 3 !== 0} />;
      break;
    case "villa-pool":
      content = <HouseScene id={id} seed={n} dusk={n % 2 === 0} pool />;
      break;
    case "beach":
      content = <BeachScene id={id} dusk={n % 2 === 0} />;
      break;
    case "chalet":
      content = <ChaletScene id={id} dusk={n % 2 === 0} />;
      break;
    case "land":
      content = <LandScene id={id} dusk={false} />;
      break;
    case "living":
      content = <Living id={id} seed={n} />;
      break;
    case "kitchen":
      content = <Kitchen id={id} seed={n} />;
      break;
    case "bedroom":
      content = <Bedroom id={id} seed={n} />;
      break;
    case "bath":
      content = <Bath id={id} seed={n} />;
      break;
    case "terrace":
      content = <Terrace id={id} seed={n} />;
      break;
    case "office":
      content = <Office id={id} seed={n} />;
      break;
    case "retail":
      content = <Retail id={id} seed={n} />;
      break;
    case "warehouse":
      content = <Warehouse id={id} seed={n} />;
      break;
    case "lobby":
      content = <Lobby id={id} seed={n} />;
      break;
  }
  const mirror = n % 2 === 1 && scene !== "retail" && scene !== "land";
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={label ?? scene}
    >
      {mirror ? <g transform="translate(400 0) scale(-1 1)">{content}</g> : content}
    </svg>
  );
}

export function Floorplan({ seed = "np", beds = 3, className }: { seed?: string; beds?: number; className?: string }) {
  const n = hashStr(seed);
  const rooms = Math.max(1, Math.min(beds, 4));
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Plano">
      <rect width="400" height="300" fill="#F7F4EF" />
      <g stroke="#0B1220" strokeWidth="4" fill="none">
        <rect x={30} y={30} width={340} height={240} />
        <path d="M200 30 L200 150 M30 150 L370 150" />
        {rooms > 2 && <path d="M285 150 L285 270" />}
        {rooms > 1 && <path d="M115 150 L115 270" />}
        <path d="M200 150 L200 270" />
      </g>
      <g fill="#F7F4EF">
        <rect x={80} y={146} width={26} height={8} />
        <rect x={240} y={146} width={26} height={8} />
        <rect x={150} y={266} width={30} height={8} />
      </g>
      <g fontFamily="var(--font-body)" fontSize="11" fill="#111827" textAnchor="middle">
        <text x={115} y={90}>Sala · Comedor</text>
        <text x={115} y={104} fill="#8AA4B5">{28 + (n % 12)} m²</text>
        <text x={285} y={90}>Cocina</text>
        <text x={285} y={104} fill="#8AA4B5">{10 + (n % 5)} m²</text>
        <text x={72} y={214}>Hab. 1</text>
        {rooms > 1 && <text x={157} y={214}>Hab. 2</text>}
        <text x={242} y={214}>Baño</text>
        {rooms > 2 && <text x={327} y={214}>Hab. 3</text>}
      </g>
      <rect x={30} y={30} width={170} height={6} fill="#F26B4D" opacity=".8" />
    </svg>
  );
}
