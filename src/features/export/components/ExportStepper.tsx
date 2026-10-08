import { Stepper } from '../../../ds';
import { useT } from '../../../i18n/react';

export function ExportStepper({ current, compact, className }: { current: number; compact: boolean; className?: string }) {
  const { t } = useT();
  const steps = [t('export.steps.prepare'), t('export.steps.captions'), t('export.steps.render'), t('export.steps.done')];
  return (
    <Stepper
      className={className}
      steps={steps}
      current={current}
      compact={compact}
      compactLabel={t('export.stepOf', { step: current + 1, total: steps.length })}
      label={t('export.stepperLabel')}
    />
  );
}
