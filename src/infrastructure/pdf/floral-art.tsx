import React from "react";
import { Svg, G, Circle, Ellipse, Path, Rect, Line, Polygon, Defs, LinearGradient, Stop } from "@react-pdf/renderer";

/**
 * Decorative artwork for the invite, drawn entirely with SVG primitives so the
 * PDF stays self-contained — no image assets to bundle into the serverless
 * function, no licensing to track. Ivory blooms with sage foliage, clustered in
 * the corners and allowed to bleed past the rule frame.
 */

export const PAGE_W = 420;
export const PAGE_H = 595;

export const palette = {
  paper: "#F7F2EC",
  frameRule: "#C6BAA9",
  ruleSoft: "#B3A896",
  ink: "#1E1B18",
  inkSoft: "#3A342E",
  petalWhite: "#FFFFFF",
  petalIvory: "#F3ECE0",
  petalShade: "#E2D7C6",
  petalOutline: "#D9CDBB",
  centreGold: "#D8B845",
  centreSoft: "#EBD489",
  sageLight: "#C6CBA6",
  sage: "#A8AE86",
  sageDeep: "#6E7A50",
  olive: "#8C9463",
  stem: "#8A8F6B",
};

type ClusterSpec = { x: number; y: number; rotate: number; scale: number };
type BranchSpec = { x: number; y: number; rotate: number; length: number };
type BudSpec = { x: number; y: number };

const FRONT_CLUSTERS: ClusterSpec[] = [
  { x: 56, y: 46, rotate: -18, scale: 1.25 },
  { x: 46, y: 548, rotate: 165, scale: 1.2 },
  { x: 396, y: 168, rotate: 100, scale: 0.9 },
  { x: 402, y: 542, rotate: 205, scale: 0.8 },
];

const FRONT_BRANCHES: BranchSpec[] = [
  { x: 8, y: 96, rotate: -55, length: 120 },
  { x: 96, y: 6, rotate: 15, length: 90 },
  { x: 14, y: 500, rotate: 120, length: 110 },
  { x: 402, y: 470, rotate: 205, length: 95 },
];

const FRONT_BUDS: BudSpec[] = [];

const DETAILS_CLUSTERS: ClusterSpec[] = [
  { x: 374, y: 548, rotate: 195, scale: 1.2 },
  { x: 46, y: 556, rotate: 150, scale: 1 },
];

const DETAILS_BRANCHES: BranchSpec[] = [
  { x: 410, y: 420, rotate: 235, length: 120 },
  { x: 6, y: 470, rotate: 115, length: 100 },
  { x: 414, y: 84, rotate: 200, length: 80 },
];

const DETAILS_BUDS: BudSpec[] = [];

export function PageArt({ variant }: { variant: "front" | "details" }) {
  const isFront = variant === "front";
  const clusters = isFront ? FRONT_CLUSTERS : DETAILS_CLUSTERS;
  const branches = isFront ? FRONT_BRANCHES : DETAILS_BRANCHES;
  const buds = isFront ? FRONT_BUDS : DETAILS_BUDS;
  const petalId = `petalGrad-${variant}`;
  const sageId = `sageGrad-${variant}`;

  return (
    <Svg width={PAGE_W} height={PAGE_H}>
      <Defs>
        <LinearGradient id={petalId} x1="10%" y1="0%" x2="90%" y2="100%">
          <Stop offset="0%" stopColor={palette.petalWhite} />
          <Stop offset="55%" stopColor={palette.petalIvory} />
          <Stop offset="100%" stopColor={palette.petalShade} />
        </LinearGradient>
        <LinearGradient id={sageId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={palette.sageLight} />
          <Stop offset="100%" stopColor={palette.sageDeep} />
        </LinearGradient>
      </Defs>

      <InnerFrame />

      {branches.map((b, i) => (
        <G key={`branch-${i}`} transform={`translate(${b.x} ${b.y}) rotate(${b.rotate})`}>
          <OliveBranch length={b.length} />
        </G>
      ))}

      {buds.map((b, i) => (
        <G key={`bud-${i}`} transform={`translate(${b.x} ${b.y})`}>
          <Bud r={5} petalFill={`url(#${petalId})`} />
        </G>
      ))}

      {clusters.map((c, i) => (
        <G key={`cluster-${i}`} transform={`translate(${c.x} ${c.y}) rotate(${c.rotate}) scale(${c.scale})`}>
          <BloomCluster petalFill={`url(#${petalId})`} sageFill={`url(#${sageId})`} />
        </G>
      ))}
    </Svg>
  );
}

export function InnerFrame() {
  return <Rect x={20} y={20} width={PAGE_W - 40} height={PAGE_H - 40} stroke={palette.frameRule} strokeWidth={0.6} fill="none" />;
}

function BloomCluster({ petalFill, sageFill }: { petalFill: string; sageFill: string }) {
  return (
    <G>
      {/* Foliage sits behind the blooms */}
      <Leaf x={-30} y={6} rot={-50} size={1.3} fill={sageFill} />
      <Leaf x={24} y={-6} rot={35} size={1.15} fill={palette.sage} />
      <Leaf x={-6} y={-32} rot={-8} size={1.05} fill={sageFill} />
      <Leaf x={34} y={22} rot={68} size={0.95} fill={palette.sageLight} />
      <Leaf x={8} y={32} rot={14} size={1} fill={palette.olive} />

      <Bloom x={0} y={0} r={17} petalFill={petalFill} />
      <Bloom x={-20} y={13} r={13} petalFill={petalFill} />
      <Bloom x={18} y={-15} r={11} petalFill={petalFill} />
      <Bud x={-22} y={-19} r={6} petalFill={petalFill} />
    </G>
  );
}

function Bloom({ x = 0, y = 0, r, petalFill }: { x?: number; y?: number; r: number; petalFill: string }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <G key={deg} transform={`rotate(${deg})`}>
          <Ellipse
            cx={0}
            cy={-r * 0.6}
            rx={r * 0.46}
            ry={r * 0.56}
            fill={petalFill}
            stroke={palette.petalOutline}
            strokeWidth={0.35}
          />
        </G>
      ))}
      <Circle cx={0} cy={0} r={r * 0.34} fill={palette.petalIvory} />
      <Circle cx={0} cy={0} r={r * 0.2} fill={palette.centreGold} />
      <Circle cx={-r * 0.08} cy={-r * 0.08} r={r * 0.09} fill={palette.centreSoft} />
      <Circle cx={r * 0.12} cy={r * 0.06} r={r * 0.05} fill={palette.centreSoft} opacity={0.8} />
    </G>
  );
}

function Bud({ x = 0, y = 0, r, petalFill }: { x?: number; y?: number; r: number; petalFill: string }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Ellipse cx={0} cy={0} rx={r * 0.72} ry={r} fill={petalFill} stroke={palette.petalOutline} strokeWidth={0.3} />
      <Ellipse cx={-r * 0.16} cy={-r * 0.12} rx={r * 0.34} ry={r * 0.55} fill={palette.petalWhite} opacity={0.85} />
      {/* No sepal stroke: on clusters that bleed off the page it survives as a
          detached curve once the bloom itself is clipped away. */}
    </G>
  );
}

function Leaf({ x, y, rot, size, fill }: { x: number; y: number; rot: number; size: number; fill: string }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${size})`}>
      <Path d="M0 0 C 5 -4, 13 -5, 18 -1 C 13 4, 5 5, 0 0 Z" fill={fill} opacity={0.9} />
      <Path d="M0 0 L 17 -1" stroke={palette.sageDeep} strokeWidth={0.35} opacity={0.55} />
    </G>
  );
}

function OliveBranch({ length, leaflets = 8 }: { length: number; leaflets?: number }) {
  const step = length / leaflets;
  return (
    <G>
      <Path d={`M 0 0 Q ${length * 0.5} ${-length * 0.12} ${length} ${-length * 0.04}`} stroke={palette.stem} strokeWidth={0.7} fill="none" />
      {Array.from({ length: leaflets }, (_, i) => {
        const px = step * (i + 0.5);
        const py = -length * 0.09 * Math.sin((Math.PI * (i + 0.5)) / leaflets);
        const up = i % 2 === 0;
        return (
          <G key={i} transform={`translate(${px} ${py}) rotate(${up ? -38 : 32})`}>
            <Ellipse cx={5} cy={0} rx={5.2} ry={1.9} fill={up ? palette.sage : palette.sageLight} opacity={0.92} />
          </G>
        );
      })}
    </G>
  );
}

/** The thin rule with a centre diamond that separates the venue and gift blocks. */
export function DiamondDivider({ width = 200 }: { width?: number }) {
  const mid = width / 2;
  return (
    <Svg width={width} height={10}>
      <Line x1={0} y1={5} x2={mid - 14} y2={5} stroke={palette.ruleSoft} strokeWidth={0.6} />
      <Line x1={mid + 14} y1={5} x2={width} y2={5} stroke={palette.ruleSoft} strokeWidth={0.6} />
      <Polygon points={`${mid},1 ${mid + 8},5 ${mid},9 ${mid - 8},5`} fill={palette.ruleSoft} />
    </Svg>
  );
}
