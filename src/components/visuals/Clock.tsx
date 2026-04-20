interface Props {
  hour: number;
  minute: number;
  size?: number;
}

export default function Clock({ hour, minute, size = 220 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;

  const hourAngle = ((hour % 12) * 30 + minute * 0.5 - 90) * (Math.PI / 180);
  const minuteAngle = (minute * 6 - 90) * (Math.PI / 180);

  const hourLen = r * 0.5;
  const minuteLen = r * 0.75;

  const hourX = cx + hourLen * Math.cos(hourAngle);
  const hourY = cy + hourLen * Math.sin(hourAngle);
  const minuteX = cx + minuteLen * Math.cos(minuteAngle);
  const minuteY = cy + minuteLen * Math.sin(minuteAngle);

  const numbers = [];
  for (let i = 1; i <= 12; i++) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const nx = cx + (r - 20) * Math.cos(angle);
    const ny = cy + (r - 20) * Math.sin(angle);
    numbers.push(
      <text
        key={i}
        x={nx}
        y={ny}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={22}
        fontWeight="bold"
        fill="#0f172a"
        fontFamily="Fredoka, sans-serif"
      >
        {i}
      </text>
    );
  }

  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const inner = i % 5 === 0 ? r - 10 : r - 5;
    const x1 = cx + inner * Math.cos(angle);
    const y1 = cy + inner * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#0f172a"
        strokeWidth={i % 5 === 0 ? 3 : 1}
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="#f8fafc" stroke="#0f172a" strokeWidth={4} />
      {ticks}
      {numbers}
      <line x1={cx} y1={cy} x2={hourX} y2={hourY} stroke="#0f172a" strokeWidth={6} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={minuteX} y2={minuteY} stroke="#0f172a" strokeWidth={4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill="#0f172a" />
    </svg>
  );
}
