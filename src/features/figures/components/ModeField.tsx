import type { Mode } from '../../../domain/types';
import { Segmented } from '../../../ds';
import { useT } from '../../../i18n/react';

const MODES: (Mode | 'any')[] = ['any', 'air', 'ground', 'water'];

export interface ModeFieldProps { value: Mode | null; onChange: (mode: Mode | null) => void }

export function ModeField({ value, onChange }: ModeFieldProps) {
  const { t } = useT();
  return (
    <Segmented
      label={t('figures.add.travelsBy')}
      value={value ?? 'any'}
      options={MODES.map((m) => ({ value: m, label: t(`common.mode.${m}`) }))}
      onChange={(m) => onChange(m === 'any' ? null : m)}
    />
  );
}
