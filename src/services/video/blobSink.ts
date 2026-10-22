interface Segment { start: number; end: number; part: Blob }

/**
 * Collects the muxer's positioned writes as Blob parts instead of one growing ArrayBuffer. Blob data lives outside
 * the page's JS heap (WebKit hands it to another process, Chromium spills large blobs to disk), so a long video no
 * longer has to fit in the tab's memory two or three times over. Writes behind the end (box sizes, the moov written
 * into its reserved space at finalize) replace the bytes they cover by slicing, which copies nothing.
 */
export class BlobSink {
  private segments: Segment[] = [];

  write(data: Uint8Array, position: number) {
    const start = position, end = position + data.byteLength, part = new Blob([data as Uint8Array<ArrayBuffer>]);
    const last = this.segments.at(-1);
    if (!last || start >= last.end) {
      this.segments.push({ start, end, part });
      return;
    }
    const kept: Segment[] = [];
    for (const s of this.segments) {
      if (s.end <= start || s.start >= end) { kept.push(s); continue; }
      if (s.start < start) kept.push({ start: s.start, end: start, part: s.part.slice(0, start - s.start) });
      if (s.end > end) kept.push({ start: end, end: s.end, part: s.part.slice(end - s.start) });
    }
    kept.push({ start, end, part });
    this.segments = kept.sort((a, b) => a.start - b.start);
  }

  /** the whole file; bytes never written (the unused tail of the reserved moov space, inside a `free` box) are zeros */
  blob(type: string): Blob {
    const parts: Blob[] = [];
    let at = 0;
    for (const s of this.segments) {
      if (s.start > at) parts.push(new Blob([new Uint8Array(s.start - at)]));
      parts.push(s.part);
      at = s.end;
    }
    return new Blob(parts, { type });
  }
}
