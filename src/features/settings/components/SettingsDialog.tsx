import { Button, Dialog } from '../../../ds';
import { DEFAULT_SETTINGS } from '../../../domain/settings';
import { useT } from '../../../i18n/react';
import { SHOW_EXPORT_QUALITY, SHOW_LINE_COLORS } from '../flags';
import { useFigureRows } from '../hooks/useFigureRows';
import { useSettings } from '../hooks/useSettings';
import type { SettingsDialogProps } from '../types';
import { AppearanceSection } from './AppearanceSection';
import { DefaultFiguresSection } from './DefaultFiguresSection';
import { ExportQualitySection } from './ExportQualitySection';
import { LineColorsSection } from './LineColorsSection';
import { NewSegmentsSection } from './NewSegmentsSection';

const NO_MODELS: NonNullable<SettingsDialogProps['models']> = [];

export function SettingsDialog({ open, onClose, models = NO_MODELS }: SettingsDialogProps) {
  const { t } = useT();
  const { settings, update } = useSettings();
  const rows = useFigureRows(models);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      closeLabel={t('common.aria.close')}
      fullScreenBelow="phone"
      footer={
        <>
          <Button variant="ghost" onClick={() => update(DEFAULT_SETTINGS)}>{t('settings.reset')}</Button>
          <Button onClick={onClose}>{t('settings.done')}</Button>
        </>
      }
    >
      <AppearanceSection
        theme={settings.theme}
        lang={settings.lang}
        onThemeChange={(theme) => update({ theme })}
        onLangChange={(lang) => update({ lang })}
      />
      <DefaultFiguresSection
        rows={rows}
        value={settings.figures}
        onChange={(mode, figure) => update({ figures: { ...settings.figures, [mode]: figure } })}
      />
      {SHOW_LINE_COLORS && (
        <LineColorsSection value={settings.colors} onChange={(mode, color) => update({ colors: { ...settings.colors, [mode]: color } })} />
      )}
      <NewSegmentsSection flyKm={settings.flyKm} onChange={(flyKm) => update({ flyKm })} />
      {SHOW_EXPORT_QUALITY && <ExportQualitySection value={settings.exportLongSide} onChange={(exportLongSide) => update({ exportLongSide })} />}
    </Dialog>
  );
}
