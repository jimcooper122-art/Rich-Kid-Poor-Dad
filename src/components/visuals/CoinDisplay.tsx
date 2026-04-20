type CoinType = 'nickel' | 'dime' | 'quarter' | 'loonie' | 'toonie';

interface CoinSpec {
  label: string;
  value: string;
  fill: string;
  ring?: string;
  size: number;
}

const COINS: Record<CoinType, CoinSpec> = {
  nickel: { label: '5¢', value: 'NICKEL', fill: '#cbd5e1', size: 60 },
  dime: { label: '10¢', value: 'DIME', fill: '#e2e8f0', size: 52 },
  quarter: { label: '25¢', value: 'QUARTER', fill: '#cbd5e1', size: 70 },
  loonie: { label: '$1', value: 'LOONIE', fill: '#fbbf24', size: 68 },
  toonie: { label: '$2', value: 'TOONIE', fill: '#fbbf24', ring: '#94a3b8', size: 74 },
};

interface Props {
  coins: CoinType[];
}

export default function CoinDisplay({ coins }: Props) {
  return (
    <div className="flex flex-wrap gap-3 justify-center items-center max-w-xl">
      {coins.map((type, i) => {
        const c = COINS[type];
        return (
          <div key={i} className="flex flex-col items-center">
            <svg width={c.size} height={c.size} viewBox={`0 0 ${c.size} ${c.size}`}>
              {c.ring && (
                <circle cx={c.size / 2} cy={c.size / 2} r={c.size / 2 - 2} fill={c.ring} stroke="#0f172a" strokeWidth={2} />
              )}
              <circle
                cx={c.size / 2}
                cy={c.size / 2}
                r={c.ring ? c.size / 2 - 8 : c.size / 2 - 2}
                fill={c.fill}
                stroke="#0f172a"
                strokeWidth={2}
              />
              <text
                x={c.size / 2}
                y={c.size / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={c.size * 0.28}
                fontWeight="bold"
                fill="#0f172a"
                fontFamily="Fredoka, sans-serif"
              >
                {c.label}
              </text>
            </svg>
          </div>
        );
      })}
    </div>
  );
}
