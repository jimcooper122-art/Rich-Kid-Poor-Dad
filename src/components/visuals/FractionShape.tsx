interface Props {
  shape?: 'circle' | 'rectangle' | 'square';
  totalParts: number;
  shadedParts: number;
  size?: number;
}

const SHADED_COLOR = '#facc15';
const UNSHADED_COLOR = '#f8fafc';
const STROKE = '#0f172a';

export default function FractionShape({
  shape = 'circle',
  totalParts,
  shadedParts,
  size = 200,
}: Props) {
  if (shape === 'circle') {
    return <Pie totalParts={totalParts} shadedParts={shadedParts} size={size} />;
  }
  if (shape === 'rectangle') {
    return <Bar totalParts={totalParts} shadedParts={shadedParts} size={size} />;
  }
  return <Grid totalParts={totalParts} shadedParts={shadedParts} size={size} />;
}

function Pie({ totalParts, shadedParts, size }: { totalParts: number; shadedParts: number; size: number }) {
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  const paths: JSX.Element[] = [];
  for (let i = 0; i < totalParts; i++) {
    const startAngle = (i * 2 * Math.PI) / totalParts - Math.PI / 2;
    const endAngle = ((i + 1) * 2 * Math.PI) / totalParts - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

    const d =
      totalParts === 1
        ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    paths.push(
      <path
        key={i}
        d={d}
        fill={i < shadedParts ? SHADED_COLOR : UNSHADED_COLOR}
        stroke={STROKE}
        strokeWidth={3}
        strokeLinejoin="round"
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
    </svg>
  );
}

function Bar({ totalParts, shadedParts, size }: { totalParts: number; shadedParts: number; size: number }) {
  const width = size * 1.5;
  const height = size / 2.5;
  const partWidth = width / totalParts;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {Array.from({ length: totalParts }).map((_, i) => (
        <rect
          key={i}
          x={i * partWidth + 2}
          y={2}
          width={partWidth - 4}
          height={height - 4}
          fill={i < shadedParts ? SHADED_COLOR : UNSHADED_COLOR}
          stroke={STROKE}
          strokeWidth={3}
        />
      ))}
    </svg>
  );
}

function Grid({ totalParts, shadedParts, size }: { totalParts: number; shadedParts: number; size: number }) {
  const cols = Math.ceil(Math.sqrt(totalParts));
  const rows = Math.ceil(totalParts / cols);
  const cellSize = size / Math.max(cols, rows);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: totalParts }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <rect
            key={i}
            x={col * cellSize + 2}
            y={row * cellSize + 2}
            width={cellSize - 4}
            height={cellSize - 4}
            fill={i < shadedParts ? SHADED_COLOR : UNSHADED_COLOR}
            stroke={STROKE}
            strokeWidth={3}
          />
        );
      })}
    </svg>
  );
}
