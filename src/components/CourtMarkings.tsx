import { COURT, SCALE, SVG_LENGTH, SVG_WIDTH, toSvg } from "@/lib/court";

const STROKE = "#3f3f46";
const STROKE_WIDTH = 1.5;

const rim = toSvg({ x: COURT.rimX, y: COURT.rimY });
const freeThrow = toSvg({ x: 0, y: COURT.freeThrowLineY });
const laneLeft = toSvg({ x: -COURT.laneWidth / 2, y: 0 }).x;
const laneRight = toSvg({ x: COURT.laneWidth / 2, y: 0 }).x;
const cornerLeft = toSvg({ x: -COURT.cornerThreeX, y: 0 }).x;
const cornerRight = toSvg({ x: COURT.cornerThreeX, y: 0 }).x;
const cornerY = COURT.cornerThreeSideY * SCALE;
const threeR = COURT.threeRadius * SCALE;
const restrictedR = COURT.restrictedRadius * SCALE;

// The court lines that give the scatter spatial meaning. Drawn once behind the
// hexbins; all coordinates come from the shared court geometry.
export function CourtMarkings() {
  return (
    <g fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH}>
      <rect x={0} y={0} width={SVG_WIDTH} height={SVG_LENGTH} />
      <rect x={laneLeft} y={0} width={laneRight - laneLeft} height={COURT.freeThrowLineY * SCALE} />
      <circle cx={freeThrow.x} cy={freeThrow.y} r={COURT.freeThrowRadius * SCALE} />
      <line
        x1={rim.x - (COURT.backboardWidth / 2) * SCALE}
        y1={COURT.backboardY * SCALE}
        x2={rim.x + (COURT.backboardWidth / 2) * SCALE}
        y2={COURT.backboardY * SCALE}
      />
      <circle cx={rim.x} cy={rim.y} r={COURT.rimRadius * SCALE} />
      <path
        d={`M ${rim.x - restrictedR} ${rim.y} A ${restrictedR} ${restrictedR} 0 0 0 ${rim.x + restrictedR} ${rim.y}`}
      />
      <line x1={cornerLeft} y1={0} x2={cornerLeft} y2={cornerY} />
      <line x1={cornerRight} y1={0} x2={cornerRight} y2={cornerY} />
      <path
        d={`M ${cornerLeft} ${cornerY} A ${threeR} ${threeR} 0 0 0 ${cornerRight} ${cornerY}`}
      />
    </g>
  );
}
