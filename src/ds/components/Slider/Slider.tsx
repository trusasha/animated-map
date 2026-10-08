import { useId, type CSSProperties, type ReactNode, type Ref } from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { cx } from '../../lib/cx';
import styles from './Slider.module.css';

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  label: ReactNode;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  startLabel?: ReactNode;
  endLabel?: ReactNode;
  help?: ReactNode;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Slider({
  value,
  onChange,
  onCommit,
  label,
  min = 0,
  max = 100,
  step = 1,
  format = String,
  startLabel,
  endLabel,
  help,
  disabled,
  className,
  style,
  ref,
}: SliderProps) {
  const helpId = useId();
  return (
    <BaseSlider.Root
      ref={ref}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={cx(styles.root, className)}
      style={style}
      onValueChange={(v) => onChange(v)}
      onValueCommitted={(v) => onCommit?.(v)}
    >
      <div className={styles.head}>
        <BaseSlider.Label className={styles.label}>{label}</BaseSlider.Label>
        <output className={cx(styles.value, 'tabular')}>{format(value)}</output>
      </div>
      <BaseSlider.Control className={styles.control}>
        <BaseSlider.Track className={styles.track}>
          <BaseSlider.Indicator className={styles.indicator} />
          <BaseSlider.Thumb className={styles.thumb} aria-describedby={help ? helpId : undefined} getAriaValueText={(_, v) => format(v)} />
        </BaseSlider.Track>
      </BaseSlider.Control>
      {(startLabel || endLabel) && (
        <div className={styles.ends}>
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      )}
      {help && (
        <div id={helpId} className={styles.help}>
          {help}
        </div>
      )}
    </BaseSlider.Root>
  );
}
