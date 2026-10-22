/** what the browser tells about the device: enough to see which phones crash, nothing identifying */
export function deviceInfo() {
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { mobile?: boolean; platform?: string } };
  return {
    ua: navigator.userAgent.slice(0, 300),
    mobile: nav.userAgentData?.mobile ?? /Mobi|iPhone|iPad|Android/.test(navigator.userAgent),
    platform: nav.userAgentData?.platform ?? navigator.platform,
    deviceMemoryGb: nav.deviceMemory ?? null,
    cores: navigator.hardwareConcurrency ?? null,
    screen: [screen.width, screen.height],
    dpr: devicePixelRatio,
  };
}

/** JS heap in MB where the browser exposes it (Chromium); null elsewhere, e.g. Safari */
export function heapMb(): number | null {
  const m = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return m ? Math.round(m.usedJSHeapSize / 1e6) : null;
}
