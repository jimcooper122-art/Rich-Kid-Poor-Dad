import type { Visual } from '../../types';
import FractionShape from './FractionShape';
import DotArray from './DotArray';
import Clock from './Clock';
import CoinDisplay from './CoinDisplay';

interface Props {
  visual?: Visual;
}

export default function VisualRenderer({ visual }: Props) {
  if (!visual || visual.type === 'none') return null;

  const d = visual.data || {};

  switch (visual.type) {
    case 'fraction_shape':
      return (
        <FractionShape
          shape={d.shape || 'circle'}
          totalParts={d.totalParts}
          shadedParts={d.shadedParts}
          size={d.size}
        />
      );
    case 'dots':
      return <DotArray rows={d.rows} cols={d.cols} highlighted={d.highlighted} dotSize={d.dotSize} />;
    case 'clock':
      return <Clock hour={d.hour} minute={d.minute} size={d.size} />;
    case 'coins':
      return <CoinDisplay coins={d.coins || []} />;
    case 'image':
      return d.src ? <img src={`/images/${d.src}`} alt="" className="max-h-48 rounded-xl" /> : null;
    default:
      return null;
  }
}
