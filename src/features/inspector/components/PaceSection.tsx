import { Slider } from '../../../ds';
import { useT } from '../../../i18n/react';

export interface PaceSectionProps { value: number; onChange: (v: number) => void; onCommit: (v: number) => void }

export function PaceSection({ value, onChange, onCommit }: PaceSectionProps) {
  const { t } = useT();
  return (
    <Slider
      label={t('inspector.pace.label')}
      value={value}
      min={0.25}
      max={3}
      step={0.25}
      format={(v) => t('inspector.pace.value', { value: v })}
      help={t('inspector.pace.help')}
      onChange={onChange}
      onCommit={onCommit}
    />
  );
}
