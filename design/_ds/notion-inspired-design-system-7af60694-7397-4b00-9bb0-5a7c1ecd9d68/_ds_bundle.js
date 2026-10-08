/* Local shim: Badge, Button, Input copied verbatim from the design project's _ds_bundle.js (only components the mockup uses). */
(() => {
const ns = (window.NotionInspiredDesignSystem_7af606 = window.NotionInspiredDesignSystem_7af606 || {});
const tones = {
  blue: { background: 'var(--color-badge-bg)', color: 'var(--color-badge-text)' },
  neutral: { background: 'var(--color-warm-white)', color: 'var(--color-warm-gray-500)' },
  success: { background: 'rgba(42,157,153,0.1)', color: '#1f7a77' },
  warning: { background: 'rgba(221,91,0,0.1)', color: '#b34a00' }
};
function Badge({ tone = 'blue', children, style }) {
  return React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-sans)', fontSize: 'var(--type-badge-size)', lineHeight: 'var(--type-badge-lh)', fontWeight: 600, letterSpacing: 'var(--type-badge-ls)', whiteSpace: 'nowrap', ...tones[tone], ...style } }, children);
}
const base = { fontFamily: 'var(--font-sans)', fontSize: 'var(--type-nav-size)', lineHeight: 'var(--type-nav-lh)', fontWeight: 600, borderRadius: 'var(--radius-micro)', border: '1px solid transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast)', whiteSpace: 'nowrap', textDecoration: 'none' };
const sizes = { sm: { padding: '4px 12px', fontSize: 14 }, md: { padding: '8px 16px' }, lg: { padding: '12px 20px', fontSize: 16 } };
function Button({ variant = 'primary', size = 'md', disabled = false, icon = null, iconRight = null, href, onClick, children, style, type = 'button' }) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  let v;
  if (variant === 'primary') v = { background: hover ? 'var(--accent-active)' : 'var(--accent)', color: 'var(--text-on-accent)' };
  else if (variant === 'secondary') v = { background: 'var(--surface-secondary-button)', color: hover ? 'var(--color-warm-dark)' : '#000000', transform: hover && !active ? 'scale(1.05)' : undefined };
  else if (variant === 'ghost') v = { background: 'transparent', color: 'var(--text-primary)', textDecoration: hover ? 'underline' : 'none', padding: sizes[size].padding };
  else if (variant === 'dark') v = { background: hover ? '#000' : 'var(--color-warm-dark)', color: 'var(--text-on-dark)' };
  if (active && !disabled) v = { ...v, transform: 'scale(0.9)' };
  if (disabled) v = { ...v, background: variant === 'ghost' ? 'transparent' : 'var(--color-translucent)', color: 'var(--text-muted)', cursor: 'not-allowed', transform: 'none', textDecoration: 'none' };
  const s = { ...base, ...sizes[size], ...v, ...style };
  const ev = { onMouseEnter: () => setHover(true), onMouseLeave: () => { setHover(false); setActive(false); }, onMouseDown: () => setActive(true), onMouseUp: () => setActive(false) };
  const content = React.createElement(React.Fragment, null, icon, children, iconRight);
  if (href && !disabled) return React.createElement("a", { href, style: s, ...ev, onClick }, content);
  return React.createElement("button", { type, style: s, disabled, onClick, ...ev }, content);
}
function Input({ label, placeholder, value, defaultValue, onChange, type = 'text', disabled = false, hint, style, name }) {
  const [focus, setFocus] = React.useState(false);
  const id = React.useId();
  return React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)', ...style } },
    label && React.createElement("label", { htmlFor: id, style: { fontSize: 14, lineHeight: 1.43, fontWeight: 500, color: 'var(--text-secondary)' } }, label),
    React.createElement("input", { id, name, type, placeholder, value, defaultValue, onChange, disabled, onFocus: () => setFocus(true), onBlur: () => setFocus(false),
      style: { fontFamily: 'inherit', fontSize: 16, lineHeight: 1.5, padding: 6, borderRadius: 'var(--radius-micro)', border: 'var(--border-input)', background: disabled ? 'var(--surface-alt)' : 'var(--surface-card)', color: disabled ? 'var(--text-muted)' : 'var(--text-input)', outline: focus ? '2px solid var(--color-focus)' : 'none', outlineOffset: 0 } }),
    hint && React.createElement("div", { style: { fontSize: 12, lineHeight: 1.33, color: 'var(--text-muted)' } }, hint));
}
Object.assign(ns, { Badge, Button, Input });
})();
