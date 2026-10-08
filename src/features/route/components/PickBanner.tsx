import { LinkButton, StatusPill } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './RoutePanel.module.css';

export interface PickBannerProps {
  name: string;
  touch: boolean;
  onCancel: () => void;
}

export function PickBanner({ name, touch, onCancel }: PickBannerProps) {
  const { t } = useT();
  return (
    <StatusPill tone="info" className={styles.banner} action={<LinkButton size="sm" onClick={onCancel}>{t('route.pick.cancel')}</LinkButton>}>
      {t(touch ? 'route.pick.bannerTouch' : 'route.pick.banner', { name })}
    </StatusPill>
  );
}
