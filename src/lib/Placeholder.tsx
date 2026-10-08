import type { ReactNode } from 'react';
import styles from './Placeholder.module.css';

const crashes = (name: string) => {
  const params = new URLSearchParams(location.search);
  return (import.meta.env.DEV || params.has('e2e')) && params.get('crash') === name;
};

/** stands in for a feature component until its work package replaces it */
export function Placeholder({ name, children }: { name: string; children?: ReactNode }) {
  if (crashes(name)) throw new Error(`placeholder ${name} crashed`);
  return <div className={styles.box} data-placeholder={name}>—{children}</div>;
}
