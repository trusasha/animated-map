export interface ScreenPoint { x: number; y: number }

/** indices grouped where markers would overlap (chains count: a–b and b–c near puts a, b, c together); `solo` points never join */
// ponytail: O(n²) pair scan, fine for a trip's few dozen stops; grid buckets if routes reach thousands
export function groupNear(points: ScreenPoint[], px: number, solo: boolean[] = []): number[][] {
  const root = points.map((_, i) => i);
  const find = (i: number): number => (root[i] === i ? i : (root[i] = find(root[i])));
  for (let i = 0; i < points.length; i++) {
    if (solo[i]) continue;
    for (let j = i + 1; j < points.length; j++) {
      if (solo[j] || Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) >= px) continue;
      root[find(j)] = find(i);
    }
  }
  const groups = new Map<number, number[]>();
  points.forEach((_, i) => { const r = find(i); groups.set(r, [...(groups.get(r) ?? []), i]); });
  return [...groups.values()];
}

/** "7–8", "21–23", "1, 26", "3–5, 9" */
export function rangeLabel(numbers: number[]): string {
  const sorted = [...numbers].sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    runs.push(j === i ? String(sorted[i]) : `${sorted[i]}–${sorted[j]}`);
    i = j;
  }
  return runs.join(', ');
}
