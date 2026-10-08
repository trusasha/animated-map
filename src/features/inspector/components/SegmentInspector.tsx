import { FigurePicker } from '../../figures';
import { Placeholder } from '../../../lib/Placeholder';
import type { SegmentInspectorProps } from '../types';

export function SegmentInspector({ onClose }: SegmentInspectorProps) {
  return (
    <Placeholder name="segment-inspector">
      <FigurePicker mode="ground" value="car" onChange={() => {}} />
      <button onClick={onClose}>close</button>
    </Placeholder>
  );
}
