import { useState } from 'react';
import { ColorSwatchPicker, type ColorSwatch } from './ColorSwatchPicker';

export const title = 'ColorSwatchPicker';

const NAMES = ['charcoal', 'blue', 'teal', 'green', 'orange', 'pink', 'purple', 'brown'];

function readSwatches(): ColorSwatch[] {
  const css = getComputedStyle(document.documentElement);
  return NAMES.map((n) => ({ value: css.getPropertyValue(`--line-${n}`).trim(), label: n[0].toUpperCase() + n.slice(1) }));
}

export default function Demo() {
  const [swatches] = useState(readSwatches);
  const [a, setA] = useState(swatches[1].value);
  const [b, setB] = useState(swatches[4].value);
  return (
    <div data-testid="demo-ColorSwatchPicker" style={{ display: 'grid', gap: 20 }}>
      <ColorSwatchPicker label="Line colour" customLabel="Custom colour" swatches={swatches} value={a} onChange={setA} />
      <ColorSwatchPicker label="Line colour, large" customLabel="Custom colour" size={32} swatches={swatches} value={b} onChange={setB} />
    </div>
  );
}
