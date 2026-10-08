import type { FocusEvent } from 'react';

const TABBABLE =
  'a[href],button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

/**
 * Base UI re-focuses from its focus guards on the next animation frame, so a fast Tab can
 * step past them. Redirect synchronously; Base UI's own redirect then lands on the same element.
 */
export function wrapFocusFromGuard(event: FocusEvent, popup: HTMLElement | null) {
  const guard = event.target as HTMLElement;
  if (!popup || !guard.hasAttribute('data-base-ui-focus-guard')) return;
  const items = Array.from(popup.querySelectorAll<HTMLElement>(TABBABLE)).filter((el) => el.checkVisibility());
  const toLast = Boolean(guard.compareDocumentPosition(popup) & Node.DOCUMENT_POSITION_FOLLOWING);
  (toLast ? items.at(-1) : items[0])?.focus();
}
