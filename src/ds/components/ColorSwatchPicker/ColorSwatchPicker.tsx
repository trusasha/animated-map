import { useId, type CSSProperties, type Ref } from 'react';
import { cx } from '../../lib/cx';
import styles from './ColorSwatchPicker.module.css';

const HEX = /^#[0-9a-f]{6}$/i;

export interface ColorSwatch {
  value: string;
  label: string;
}

export interface ColorSwatchPickerProps {
  swatches: readonly ColorSwatch[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  customLabel?: string;
  size?: 22 | 32;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function ColorSwatchPicker({ swatches, value, onChange, label, customLabel, size = 22, className, style, ref }: ColorSwatchPickerProps) {
  const name = useId();
  const isCustom = !swatches.some((s) => s.value.toLowerCase() === value.toLowerCase());
  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={cx(styles.root, className)} style={style} data-size={size}>
      {swatches.map((s) => (
        <label key={s.value} className={styles.swatch} data-selected={s.value.toLowerCase() === value.toLowerCase() ? '' : undefined}>
          <input
            type="radio"
            name={name}
            className={styles.input}
            value={s.value}
            aria-label={s.label}
            checked={s.value.toLowerCase() === value.toLowerCase()}
            onChange={() => onChange(s.value)}
          />
          <span className={styles.chip} style={{ background: s.value }} />
        </label>
      ))}
      {customLabel && (
        <label className={styles.swatch} data-custom="" data-selected={isCustom ? '' : undefined}>
          <input
            type="color"
            className={styles.input}
            aria-label={customLabel}
            value={HEX.test(value) ? value : (swatches[0]?.value ?? value)}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className={styles.chip} style={isCustom ? { background: value } : undefined} />
        </label>
      )}
    </div>
  );
}
