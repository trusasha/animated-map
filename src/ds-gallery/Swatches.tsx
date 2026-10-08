import { useEffect, useMemo, useRef } from 'react';

const COLOR_NAME = /^--(color|text|surface|accent|focus|status)/;

const collect = (rules: CSSRuleList, out: Set<string>) => {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      for (const name of Array.from(rule.style)) if (COLOR_NAME.test(name)) out.add(name);
    } else if ('cssRules' in rule) {
      collect((rule as CSSGroupingRule).cssRules, out);
    }
  }
};

const tokenNames = (): string[] => {
  const out = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      collect(sheet.cssRules, out);
    } catch {
      // cross-origin sheet
    }
  }
  return [...out];
};

const group = (name: string) => name.slice(2).split('-')[0]!;

export function Swatches({ theme }: { theme: string }) {
  const groups = useMemo(() => {
    const by = new Map<string, string[]>();
    for (const n of tokenNames()) by.set(group(n), [...(by.get(group(n)) ?? []), n]);
    return [...by.entries()];
  }, []);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    root.current?.querySelectorAll<HTMLElement>('[data-token]').forEach((el) => {
      el.textContent = style.getPropertyValue(el.dataset.token!).trim();
    });
  }, [theme]);

  return (
    <section ref={root} className="gallery-section" data-testid="swatches" data-theme-shown={theme} aria-labelledby="h-swatches">
      <h2 id="h-swatches">Color tokens</h2>
      {groups.map(([g, names]) => (
        <div key={g}>
          <h3>{g}</h3>
          <ul className="swatch-grid">
            {names.map((n) => (
              <li key={n}>
                <span className="swatch" style={{ background: `var(${n})` }} />
                <code>{n}</code>
                <small data-token={n} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
