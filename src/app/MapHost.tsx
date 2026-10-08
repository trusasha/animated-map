import type { Ref } from 'react';
import styles from './App.module.css';

/** the one map container; mounted above the router so the map never unmounts */
export function MapHost({ ref }: { ref: Ref<HTMLDivElement> }) {
  return <div ref={ref} className={styles.map} data-testid="map-host" />;
}
