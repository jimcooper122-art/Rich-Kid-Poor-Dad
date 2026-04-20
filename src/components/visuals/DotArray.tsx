interface Props {
  rows: number;
  cols: number;
  highlighted?: number[];
  dotSize?: number;
}

export default function DotArray({ rows, cols, highlighted = [], dotSize = 36 }: Props) {
  const gap = 10;
  const width = cols * dotSize + (cols - 1) * gap;
  const height = rows * dotSize + (rows - 1) * gap;

  const dots: JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const isHighlighted = highlighted.includes(idx);
      const cx = c * (dotSize + gap) + dotSize / 2;
      const cy = r * (dotSize + gap) + dotSize / 2;
      dots.push(
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r={dotSize / 2 - 2}
          fill={isHighlighted ? '#facc15' : '#fb923c'}
          stroke="#0f172a"
          strokeWidth={3}
        />
      );
    }
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {dots}
    </svg>
  );
}
