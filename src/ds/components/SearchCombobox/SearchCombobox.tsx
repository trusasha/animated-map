import { useState, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { Autocomplete } from '@base-ui/react/autocomplete';
import { cx } from '../../lib/cx';
import { Input } from '../Input';
import { Spinner } from '../Spinner';
import styles from './SearchCombobox.module.css';

export interface SearchItem {
  id: string;
  title: string;
  sub?: string;
}

export interface SearchComboboxProps {
  /** Current query; the parent owns it and fetches `items`. */
  value: string;
  onValueChange: (value: string) => void;
  items: readonly SearchItem[];
  onSelect: (item: SearchItem) => void;
  /** Accessible name of the input. */
  label: string;
  placeholder?: string;
  loading?: boolean;
  loadingLabel: string;
  /** Shown when a non-empty query has no items. */
  emptyLabel: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Enter pressed with free text while there are no items to pick. */
  onSubmitText?: (query: string) => void;
  disabled?: boolean;
  id?: string;
  /** Applied to the field wrapper around the input. */
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLInputElement>;
}

export function SearchCombobox({
  value,
  onValueChange,
  items,
  onSelect,
  label,
  placeholder,
  loading = false,
  loadingLabel,
  emptyLabel,
  hint,
  error,
  onSubmitText,
  disabled,
  id,
  className,
  style,
  ref,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const active = open && value.trim() !== '';

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && value) onValueChange('');
    else if (e.key === 'Enter' && value.trim() && items.length === 0 && !loading && onSubmitText) {
      e.preventDefault();
      onSubmitText(value.trim());
    }
  };

  return (
    <Autocomplete.Root
      mode="none"
      items={items}
      value={value}
      open={active}
      autoHighlight="always"
      itemToStringValue={(item) => item.title}
      onValueChange={(next, details) => details.reason !== 'item-press' && onValueChange(next)}
      onOpenChange={setOpen}
    >
      <Autocomplete.Input
        ref={ref}
        id={id}
        render={
          <Input
            size="search"
            aria-label={label}
            placeholder={placeholder}
            disabled={disabled}
            hint={hint}
            error={error}
            className={className}
            style={style}
          />
        }
        onKeyDown={onKeyDown}
      />
      <Autocomplete.Portal>
        <Autocomplete.Positioner className={styles.positioner} sideOffset={4}>
          <Autocomplete.Popup className={styles.popup} aria-busy={loading || undefined}>
            <Autocomplete.List className={styles.list}>
              {(item: SearchItem) => (
                <Autocomplete.Item key={item.id} value={item} className={styles.item} onClick={() => onSelect(item)}>
                  <span className={styles.title}>{item.title}</span>
                  {item.sub && <span className={styles.sub}>{item.sub}</span>}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
            {loading && (
              <div className={cx(styles.note, styles.loading)} role="status">
                <Spinner size={16} />
                {loadingLabel}
              </div>
            )}
            {!loading && (
              <Autocomplete.Empty className={styles.note}>{emptyLabel}</Autocomplete.Empty>
            )}
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
