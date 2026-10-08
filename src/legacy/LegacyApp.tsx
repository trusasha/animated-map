import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { Animator, loadStyle, TILE_CACHE_ZOOM_LEVELS } from './animator';
import { api } from './api';
import { attributionOf, DEFAULT_OVERLAY, drawOverlay, exportVideo, FORMATS } from './exporter';
import { FIGURE_LABELS, figureKey, setModelPoses } from './figures';
import { buildPath } from './geo';
import { chain, legsOf, migrate, pathKey, setLegAt } from './route';
import { figureThumb } from './thumbs';
import { FIGURES, type CustomModel, type Format, type ModelPose, type Overlay, type Leg, type LngLat, type MapStyle, type Mode, type Place, type Stop, type Trip, type TripData } from './types';
import './legacy.css';

const EMPTY: TripData = { stops: [], style: 'satellite', speed: 1, format: '9:16' };
const MODES: { mode: Mode; icon: string; label: string }[] = [
  { mode: 'air', icon: '✈️', label: 'Воздух' },
  { mode: 'ground', icon: '🛣️', label: 'Земля' },
  { mode: 'water', icon: '🌊', label: 'Вода' },
];

const loadTrip = async (id: string) => migrate(await api.trip(id));

export function App() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [models, setModels] = useState<CustomModel[]>([]);
  setModelPoses(models);
  const poseKey = models.map((m) => figureKey(`model:${m.url}`)).join();
  const [config, setConfig] = useState({ openai: false, photo3d: false });
  const [mapReady, setMapReady] = useState(false);
  const [routing, setRouting] = useState(false);
  const [time, setTime] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [warming, setWarming] = useState<number | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  /** stop index waiting for a map click to move there */
  const [picking, setPicking] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [error, setError] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);
  const mapEl = useRef<HTMLDivElement>(null);
  const anim = useRef<Animator | null>(null);
  const report = (e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    api.log('error', { message, stack: e instanceof Error ? e.stack?.slice(0, 1500) : undefined });
    setError(message);
  };

  const update = (fn: (d: TripData) => TripData) => setTrip((t) => (t ? { ...t, data: chain(fn(t.data)) } : t));
  const ready = !!trip && trip.data.stops.length > 1 && legsOf(trip.data).every((l, i) => l.pathKey === pathKey(trip.data, i));
  const duration = anim.current?.tl?.duration ?? 0;

  useEffect(() => {
    api.config().then(setConfig).catch(report);
    api.models().then(setModels).catch(report);
    api.trips().then(async (list) => {
      setTrips(list);
      setTrip(list[0] ? await loadTrip(list[0].id) : await api.createTrip('Моё путешествие', EMPTY));
    }).catch(report);
  }, []);

  const hasTrip = !!trip;
  useEffect(() => {
    if (!hasTrip) return;
    let map: maplibregl.Map | undefined;
    loadStyle('satellite').then((style) => {
      map = new maplibregl.Map({ container: mapEl.current!, style, center: [20, 30], zoom: 1.4, maxTileCacheZoomLevels: TILE_CACHE_ZOOM_LEVELS, canvasContextAttributes: { antialias: true } });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      const a = new Animator(map);
      a.onFrame = (t) => {
        setTime(t);
        if (!a.playing) setPlaying(false);
      };
      anim.current = a;
      if (import.meta.env.DEV || new URLSearchParams(location.search).has('e2e')) (window as any).__anim = a;
      a.onBuffering = setBuffering;
      map.once('load', () => setMapReady(true));
    }).catch(report);
    return () => map?.remove();
  }, [hasTrip]);

  const style = trip?.data.style;
  const loadedStyle = useRef<MapStyle>('satellite');
  useEffect(() => {
    if (!mapReady || !style || style === loadedStyle.current) return;
    loadedStyle.current = style;
    loadStyle(style).then((s) => { if (loadedStyle.current === style) anim.current!.map.setStyle(s, { diff: false }); }).catch(report);
  }, [style, mapReady]);

  // compute missing route geometry, then hand the trip to the animator
  const data = trip?.data;
  useEffect(() => {
    if (!data || !mapReady) return;
    let cancelled = false;
    (async () => {
      const legs = legsOf(data);
      const stale = legs.map((_, i) => i).filter((i) => legs[i].pathKey !== pathKey(data, i));
      if (stale.length) {
        setRouting(true);
        const keys = stale.map((i) => pathKey(data, i));
        const paths = await Promise.all(stale.map((i) => {
          const a = data.stops[i], b = data.stops[i + 1];
          return buildPath([a.lng, a.lat], [b.lng, b.lat], legs[i].mode);
        }));
        if (cancelled) return;
        update((d) => ({
          ...d,
          stops: d.stops.map((s, i) => {
            const k = i > 0 ? keys.indexOf(pathKey(d, i - 1)) : -1;
            return k >= 0 ? { ...s, leg: { ...s.leg!, path: paths[k], pathKey: keys[k] } } : s;
          }),
        }));
        return;
      }
      setRouting(false);
      const a = anim.current!;
      a.stop();
      const [s0, s1] = span(data);
      await a.setTrip(data.stops.slice(s0, s1 + 1), legs.slice(s0, s1) as { mode: Mode; figure: string; path: LngLat[] }[], data.speed);
      a.setContext(legs.flatMap((l, i) => (i < s0 || i >= s1) && l.path ? [l.path] : []));
      if (cancelled) return;
      setPreviewing(false);
      setPlaying(false);
      a.setFrame(null);
      fitView(a, data, selectedRef.current);
    })().catch((e) => { setRouting(false); report(e); });
    return () => { cancelled = true; };
  }, [data?.stops, data?.speed, data?.range, mapReady, poseKey]);

  const unsaved = useRef<Trip | null>(null);
  const flushSave = async () => {
    const t = unsaved.current;
    unsaved.current = null;
    if (t) await api.saveTrip(t);
  };
  useEffect(() => {
    if (!trip) return;
    unsaved.current = trip;
    const t = setTimeout(() => flushSave().then(() => api.trips().then(setTrips)).catch(report), 600);
    return () => clearTimeout(t);
  }, [trip]);

  useEffect(() => {
    if (!models.some((m) => m.status.startsWith('pending'))) return;
    const t = setInterval(() => {
      for (const m of models.filter((m) => m.status.startsWith('pending'))) {
        api.refreshModel(m.id).then((fresh) => setModels((list) => list.map((x) => (x.id === fresh.id ? fresh : x)))).catch(report);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [models]);

  useEffect(() => {
    const a = anim.current;
    if (!a || !mapReady || !data) return;
    const i = selected !== null && selected < data.stops.length - 1 ? selected : null;
    const [s0, s1] = span(data);
    a.select(i !== null && i >= s0 && i < s1 ? i - s0 : null);
    if (!previewing) fitView(a, data, i);
  }, [selected, mapReady, data?.range]);

  const moveRef = useRef<(i: number, p: LngLat) => void>(undefined);
  useEffect(() => {
    const map = anim.current?.map;
    if (!map || !mapReady || picking === null) return;
    const onClick = (e: maplibregl.MapMouseEvent) => { moveRef.current?.(picking, [e.lngLat.lng, e.lngLat.lat]); setPicking(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicking(null); };
    map.getCanvas().style.cursor = 'crosshair';
    map.once('click', onClick);
    addEventListener('keydown', onKey);
    return () => { map.off('click', onClick); removeEventListener('keydown', onKey); map.getCanvas().style.cursor = ''; };
  }, [picking, mapReady]);

  const finish = selected !== null && !previewing ? data?.stops[selected + 1] : undefined;
  useEffect(() => {
    const map = anim.current?.map;
    if (!map || !mapReady || !finish) return;
    const i = selected! + 1;
    const marker = new maplibregl.Marker({ draggable: true, color: '#ff4d6d' }).setLngLat([finish.lng, finish.lat]).addTo(map);
    marker.on('dragend', () => { const p = marker.getLngLat(); moveRef.current?.(i, [p.lng, p.lat]); });
    return () => { marker.remove(); };
  }, [finish?.id, finish?.lng, finish?.lat, mapReady]);

  if (!trip) return <div className="boot">{error || 'Загрузка…'}</div>;
  const d = trip.data;
  const [s0, s1] = span(d);
  const track = (type: string, data: object = {}) => api.log(type, { trip: trip.id, ...data });
  const setRange = (from: number, to: number) => {
    track('range.set', { from: d.stops[from]?.name, to: d.stops[to]?.name });
    update((d) => ({
      ...d, range: from === 0 && to === d.stops.length - 1 ? undefined : { from: d.stops[from].id, to: d.stops[to].id },
    }));
  };

  /** selection and the 📍 pick hold indices, which go stale once stops shift */
  const unselect = () => { setSelected(null); setPicking(null); };

  const addStop = (p: Place) => {
    track('stop.add', { name: p.name, lng: p.lng, lat: p.lat });
    update((d) => {
      const stop = { id: crypto.randomUUID(), name: p.name, lng: p.lng, lat: p.lat };
      return { ...d, stops: [...d.stops, stop] };
    });
  };
  const removeStop = (i: number) => {
    track('stop.remove', { index: i, name: d.stops[i]?.name });
    unselect();
    update((d) => ({ ...d, stops: d.stops.filter((_, k) => k !== i) }));
  };
  const moveStop = (i: number, dir: -1 | 1) => {
    track('stop.reorder', { index: i, dir, name: d.stops[i]?.name });
    unselect();
    const j = Math.min(i, i + dir);
    // places swap, legs keep their positions: otherwise a swap with the first stop throws its leg away
    update((d) => ({
      ...d,
      stops: d.stops.map((s, k) => (k === j ? { ...d.stops[j + 1], leg: s.leg } : k === j + 1 ? { ...d.stops[j], leg: s.leg } : s)),
    }));
  };
  /** moving a stop re-routes both legs that touch it: they share it as finish and start */
  const moveStopTo = (i: number, [lng, lat]: LngLat) => {
    track('stop.move', { index: i, name: d.stops[i]?.name, from: [d.stops[i]?.lng, d.stops[i]?.lat], to: [lng, lat] });
    const id = d.stops[i]?.id;
    const stale = (s: Stop) => (s.leg ? { ...s, leg: { ...s.leg, pathKey: undefined } } : s);
    update((d) => ({
      ...d,
      stops: d.stops.map((s, k) => (k === i ? stale({ ...s, lng, lat, approx: undefined }) : k === i + 1 ? stale(s) : s)),
    }));
    api.reverse(lng, lat).then((p) => p?.name && update((d) => ({
      ...d, stops: d.stops.map((s) => (s.id === id && s.lng === lng && s.lat === lat ? { ...s, name: p.name } : s)),
    }))).catch(() => { /* keep the old name */ });
  };
  moveRef.current = moveStopTo;
  const setLeg = (i: number, patch: Partial<Leg>) => {
    track('leg.change', { index: i, patch });
    update((d) => setLegAt(d, i, (l) => ({ ...l, ...patch })));
  };

  const applyParsed = async (text: string) => {
    const id = trip.id;
    const plan = await api.parse(text);
    unselect();
    setTrip((t) => t?.id !== id ? t : {
      ...t, title: plan.title || t.title,
      data: chain({ ...t.data, range: undefined, stops: plan.stops.map((s) => ({ ...s, id: crypto.randomUUID() })) }),
    });
  };

  const openTrip = async (id: string) => { anim.current?.stop(); await flushSave(); unselect(); setTrip(await loadTrip(id)); };
  const newTrip = async () => { unselect(); await flushSave(); const t = await api.createTrip('Новое путешествие', { ...EMPTY, style: d.style, format: d.format }); setTrips(await api.trips()); setTrip(t); };
  const deleteTrip = async () => {
    if (!confirm(`Удалить «${trip.title}»?`)) return;
    unsaved.current = null;
    unselect();
    await api.deleteTrip(trip.id);
    const list = await api.trips();
    setTrips(list);
    setTrip(list[0] ? await loadTrip(list[0].id) : await api.createTrip('Моё путешествие', EMPTY));
  };

  const play = async () => {
    const a = anim.current!;
    const t0 = performance.now();
    track('preview.start', { ready: a.ready });
    setPreviewing(true);
    if (!a.ready) {
      setWarming(0);
      const done = await a.preload(setWarming, undefined, undefined, a.time >= a.tl!.duration ? 0 : a.time);
      track('preview.preloaded', { done, seconds: Math.round((performance.now() - t0) / 1000) });
      setWarming(null);
      if (!done) return;
    }
    setPlaying(true);
    a.play();
  };
  const pause = () => { anim.current!.stop(); setPlaying(false); setWarming(null); setBuffering(false); };
  const exitPreview = () => { pause(); setPreviewing(false); anim.current!.setFrame(null); };

  return (
    <div className={`app ${panelOpen ? '' : 'panel-closed'}`}>
      <div className="map" ref={mapEl} />

      <div className="player">
        {!previewing ? (
          <button className="primary" disabled={!ready} onClick={play}>▶ Превью</button>
        ) : warming !== null ? (
          <>
            <button disabled>▶</button>
            <span className="hint">Подгружаю карту… {Math.round(warming * 100)}%</span>
            <button onClick={exitPreview} title="Выйти из превью">✕</button>
          </>
        ) : (
          <>
            <button onClick={playing ? pause : play}>{playing ? '⏸' : '▶'}</button>
            <input type="range" min={0} max={duration} step={0.01} value={time} onChange={(e) => { pause(); anim.current!.setFrame(Number(e.target.value)); }} />
            <span className="time">{buffering && playing ? 'буферизация… ' : ''}{time.toFixed(1)}/{duration.toFixed(0)}s</span>
            <button onClick={exitPreview} title="Выйти из превью">✕</button>
          </>
        )}
        <button className="accent" disabled={!ready} onClick={() => { pause(); track('export.open'); setExportOpen(true); }}>🎬 Видео</button>
        {routing && <span className="hint">строю маршрут…</span>}
      </div>

      <aside className="panel">
        <button className="panel-toggle" onClick={() => setPanelOpen(!panelOpen)}>{panelOpen ? '▾ Скрыть' : '▴ Маршрут'}</button>
        <div className="panel-body">
          <div className="row">
            <select value={trip.id} onChange={(e) => openTrip(e.target.value).catch(report)}>
              {trips.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button onClick={() => newTrip().catch(report)} title="Новое путешествие">＋</button>
            <button onClick={() => deleteTrip().catch(report)} title="Удалить">🗑</button>
          </div>
          <input className="title" value={trip.title} onChange={(e) => setTrip({ ...trip, title: e.target.value })} placeholder="Название" />

          {error && <div className="error" onClick={() => setError('')}>{error} ✕</div>}

          <Describe enabled={config.openai} onText={(t) => applyParsed(t)} onError={report} />

          <h3>Маршрут</h3>
          <ol className="stops">
            {d.stops.map((s, i) => (
              <li key={s.id}>
                <div className={`stop ${i < s0 || i > s1 ? 'out' : ''}`}>
                  <span className="dot">{i + 1}</span>
                  <span className="name" onClick={() => i < d.stops.length - 1 && setSelected(selected === i ? null : i)}>
                    {s.approx && <span className="approx" title="Место не нашлось в картах — стоит примерно, по догадке ИИ. Проверьте и поправьте через 📍 Финиш.">⚠</span>}{s.name}
                  </span>
                  <button disabled={i === 0} onClick={() => moveStop(i, -1)}>↑</button>
                  <button disabled={i === d.stops.length - 1} onClick={() => moveStop(i, 1)}>↓</button>
                  <button onClick={() => removeStop(i)}>✕</button>
                </div>
                {d.stops[i + 1] && <LegEditor leg={d.stops[i + 1].leg!} from={s.name} to={d.stops[i + 1].name} picking={picking === i + 1}
                  onPickFinish={() => { setSelected(i); setPicking(picking === i + 1 ? null : i + 1); }}
                  models={models} out={i < s0 || i >= s1} selected={selected === i} onSelect={() => setSelected(i)} onChange={(p) => setLeg(i, p)} />}
              </li>
            ))}
          </ol>
          <PlaceSearch onPick={addStop} placeholder={d.stops.length ? 'Следующая точка…' : 'Откуда стартуем?'} />

          <h3>Видео</h3>
          {d.stops.length > 2 && (
            <div className="range">
              <span>Участок для видео</span>
              <div className="row">
                <select value={s0} onChange={(e) => setRange(Number(e.target.value), s1)}>
                  {d.stops.map((s, i) => <option key={s.id} value={i} disabled={i >= s1}>{i + 1}. {s.name}</option>)}
                </select>
                <span>→</span>
                <select value={s1} onChange={(e) => setRange(s0, Number(e.target.value))}>
                  {d.stops.map((s, i) => <option key={s.id} value={i} disabled={i <= s0}>{i + 1}. {s.name}</option>)}
                </select>
              </div>
              {d.range && <button onClick={() => setRange(0, d.stops.length - 1)}>Весь маршрут</button>}
            </div>
          )}
          <label>Карта
            <select value={d.style} onChange={(e) => update((d) => ({ ...d, style: e.target.value as MapStyle }))}>
              <option value="satellite">Спутник</option>
              <option value="streets">Улицы</option>
              <option value="dark">Тёмная</option>
              <option value="ukiyoe">Японская гравюра</option>
            </select>
          </label>
          <label>Формат
            <select value={d.format} onChange={(e) => update((d) => ({ ...d, format: e.target.value as Format }))}>
              {Object.entries(FORMATS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </select>
          </label>
          <label>Скорость ×{d.speed.toFixed(1)}
            <input type="range" min={0.5} max={2.5} step={0.1} value={d.speed} onChange={(e) => update((d) => ({ ...d, speed: Number(e.target.value) }))} />
          </label>

          <Models models={models} setModels={setModels} photo3d={config.photo3d} onError={report} />
        </div>
      </aside>

      {exportOpen && <ExportDialog trip={trip} onOverlay={(overlay) => update((d) => ({ ...d, overlay }))} onClose={() => setExportOpen(false)} />}
    </div>
  );
}

function Thumb({ id, size, pose }: { id: string; size: number; pose?: ModelPose }) {
  const [src, setSrc] = useState('');
  const key = figureKey(id, pose);
  useEffect(() => { figureThumb(id, pose).then(setSrc).catch(() => setSrc('')); }, [key]);
  return src ? <img src={src} width={size} height={size} alt="" /> : <span className="thumb-wait" style={{ width: size, height: size }} />;
}

/** stop indices [first, last] the video covers: the chosen stretch, or the whole route */
function span(d: TripData): [number, number] {
  const a = d.stops.findIndex((s) => s.id === d.range?.from), b = d.stops.findIndex((s) => s.id === d.range?.to);
  return a >= 0 && b > a ? [a, b] : [0, Math.max(d.stops.length - 1, 0)];
}

/** the video stretch, or one leg with its two stops */
function fitView(a: Animator, d: TripData, leg: number | null) {
  const [s0, s1] = leg === null ? span(d) : [leg, leg + 1];
  const b = new maplibregl.LngLatBounds();
  for (const l of legsOf(d).slice(s0, s1)) for (const p of l.path ?? []) b.extend(p);
  for (const s of d.stops.slice(s0, s1 + 1)) b.extend([s.lng, s.lat]);
  if (!b.isEmpty()) a.map.fitBounds(b, { padding: 60, maxZoom: leg === null ? 9 : 13, pitch: 0, duration: 800 });
}

const fitting = (models: CustomModel[], mode: Mode) => models.filter((m) => m.status === 'ready' && m.url && (!m.mode || m.mode === mode));

function LegEditor({ leg, from, to, picking, onPickFinish, models, out, selected, onSelect, onChange }: {
  leg: Leg; from: string; to: string; picking: boolean; onPickFinish: () => void;
  models: CustomModel[]; out: boolean; selected: boolean; onSelect: () => void; onChange: (p: Partial<Leg>) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [
    ...FIGURES[leg.mode].map((id) => ({ id, label: FIGURE_LABELS[id] })),
    ...fitting(models, leg.mode).map((m) => ({ id: `model:${m.url}`, label: m.name })),
  ];
  const current = options.find((o) => o.id === leg.figure);
  return (
    <div className={`leg ${selected ? 'selected' : ''} ${out ? 'out' : ''}`} onClick={onSelect}>
      <div className="leg-ends">
        <span title={`Старт: ${from}\nФиниш: ${to}`}>{from} <small>→</small> {to}</span>
        <button className={picking ? 'on' : ''} title="Перенести финиш: кликните по карте (Esc — отмена). У выбранного участка маркер финиша можно тащить."
          onClick={(e) => { e.stopPropagation(); onPickFinish(); }}>{picking ? 'Клик по карте…' : '📍 Финиш'}</button>
      </div>
      <div className="leg-row">
        <div className="modes">
          {MODES.map((m) => (
            <button key={m.mode} className={leg.mode === m.mode ? 'on' : ''} title={m.label}
              onClick={() => onChange({ mode: m.mode, figure: fitting(models, m.mode).some((x) => `model:${x.url}` === leg.figure) ? leg.figure : FIGURES[m.mode][0] })}>
              {m.icon}
            </button>
          ))}
        </div>
        <button className={`figure-btn ${open ? 'on' : ''}`} onClick={() => setOpen(!open)}>
          <Thumb id={leg.figure} size={34} />
          <span>{current?.label ?? leg.figure}</span>
          <small>{open ? '▴' : '▾'}</small>
        </button>
      </div>
      <label className="leg-speed">
        <span>Темп</span>
        <input type="range" min={0.25} max={3} step={0.25} value={leg.speed ?? 1} onChange={(e) => onChange({ speed: Number(e.target.value) })} />
        <span>×{(leg.speed ?? 1).toFixed(2).replace(/\.?0+$/, '')}</span>
      </label>
      {leg.mode !== 'air' && (
        <label className="leg-speed" title="0 — точно по дороге, больше — плавнее повороты">
          <span>Сглаживание</span>
          <input type="range" min={0} max={4} step={0.25} value={leg.smooth ?? 1} onChange={(e) => onChange({ smooth: Number(e.target.value) })} />
          <span>{(leg.smooth ?? 1) === 0 ? 'нет' : `×${(leg.smooth ?? 1).toFixed(2).replace(/\.?0+$/, '')}`}</span>
        </label>
      )}
      {open && (
        <div className="figure-grid">
          {options.map((o) => (
            <button key={o.id} className={o.id === leg.figure ? 'on' : ''} onClick={() => { onChange({ figure: o.id }); setOpen(false); }}>
              <Thumb id={o.id} size={84} />
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceSearch({ onPick, placeholder }: { onPick: (p: Place) => void; placeholder: string }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Place[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => api.geocode(q, ctrl.signal).then(setItems).catch(() => {}), 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);
  return (
    <div className="search">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      {items.length > 0 && (
        <ul>
          {items.map((p, i) => (
            <li key={i} onClick={() => { onPick(p); setQ(''); setItems([]); }}>
              <b>{p.name}</b><small>{p.label}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Describe({ enabled, onText, onError }: { enabled: boolean; onText: (t: string) => Promise<void>; onError: (e: unknown) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const rec = useRef<MediaRecorder | null>(null);

  const run = async (t: string) => {
    setBusy('Разбираю маршрут…');
    try { await onText(t); } catch (e) { onError(e); } finally { setBusy(''); }
  };

  const toggleMic = async () => {
    if (rec.current) { rec.current.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        rec.current = null;
        setBusy('Распознаю голос…');
        try {
          const { text: heard } = await api.voice(new Blob(chunks, { type: r.mimeType }));
          setText(heard);
          await run(heard);
        } catch (e) { onError(e); setBusy(''); }
      };
      r.start();
      rec.current = r;
      setBusy('🔴 Говорите… нажмите ещё раз, чтобы закончить');
    } catch (e) { onError(e); }
  };

  if (!enabled) return <p className="hint">Добавьте OPENAI_API_KEY в .env, чтобы описывать маршрут голосом или текстом.</p>;
  return (
    <div className="describe">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder="Например: вылетел из Берлина в Стамбул, оттуда на пароме в Кадыкёй, потом на мотоцикле в Шиле" />
      <div className="row">
        <button className={rec.current ? 'rec' : ''} onClick={toggleMic} disabled={!!busy && !rec.current}>🎤</button>
        <button className="primary" disabled={!text.trim() || !!busy} onClick={() => run(text)}>Построить маршрут</button>
      </div>
      {busy && <p className="hint">{busy}</p>}
    </div>
  );
}

function Models({ models, setModels, photo3d, onError }: { models: CustomModel[]; setModels: React.Dispatch<React.SetStateAction<CustomModel[]>>; photo3d: boolean; onError: (e: unknown) => void }) {
  const [editing, setEditing] = useState<CustomModel | 'new' | null>(null);
  const put = (m: CustomModel) => setModels((list) => list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [m, ...list]);
  return (
    <>
      <h3>Свои фигурки</h3>
      <ul className="models">
        {models.map((m) => (
          <li key={m.id}>
            {m.url ? <Thumb id={`model:${m.url}`} size={34} /> : <span className="thumb-wait" style={{ width: 34, height: 34 }} />}
            <span>{m.name} {m.mode && MODES.find((x) => x.mode === m.mode)!.icon}</span>
            <small>{m.status === 'ready' ? '' : m.status}</small>
            {m.status === 'ready' && <button title="Редактировать" onClick={() => setEditing(m)}>✎</button>}
            <button onClick={() => api.deleteModel(m.id).then(() => setModels((list) => list.filter((x) => x.id !== m.id))).catch(onError)}>✕</button>
          </li>
        ))}
      </ul>
      <button onClick={() => setEditing('new')}>＋ Новая фигурка</button>
      {!photo3d && <p className="hint">FAL_KEY включит генерацию 3D-фигурки по фото.</p>}
      {editing && <ModelDialog photo3d={photo3d} model={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
        onSave={(p) => p.then((m) => { put(m); setEditing(null); })} />}
    </>
  );
}

const NO_POSE: ModelPose = { rx: 0, ry: 0, rz: 0, scale: 1 };
const turn = (deg: number) => (((deg % 360) + 360) % 360);

/** model = null: new figure from a photo or GLB; otherwise edits name, mode and pose */
function ModelDialog({ photo3d, model, onSave, onClose }: { photo3d: boolean; model: CustomModel | null; onSave: (p: Promise<CustomModel>) => Promise<void>; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(model?.name ?? '');
  const [mode, setMode] = useState<Mode | null>(model?.mode ?? null);
  const [pose, setPose] = useState<ModelPose>(model?.pose ?? NO_POSE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  useEffect(() => {
    if (!file || /\.(glb|hei[cf])$/i.test(file.name)) return setPreview('');
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.\w+$/, ''));
  };
  const rotate = (axis: 'rx' | 'ry' | 'rz', deg: number) => setPose((p) => ({ ...p, [axis]: turn(p[axis] + deg) }));
  const submit = () => {
    setBusy(true);
    setError('');
    const req = model ? api.editModel({ ...model, name: name.trim(), mode, pose }) : api.addModel(file!, name.trim(), mode);
    onSave(req).catch((e) => { setError(e.message || String(e)); setBusy(false); });
  };
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="dialog">
        <h3>{model ? 'Фигурка' : 'Новая фигурка'}</h3>
        {model
          ? <div className="pose">
            <Thumb id={`model:${model.url}`} pose={pose} size={192} />
            <div className="pose-tools">
              <button onClick={() => rotate('ry', 180)}>⇄ Развернуть</button>
              <button onClick={() => rotate('ry', 90)}>↻ 90° по курсу</button>
              <button onClick={() => rotate('rz', 90)}>⟲ Крен 90°</button>
              <button onClick={() => rotate('rx', 90)}>⤵ Тангаж 90°</button>
              <button onClick={() => setPose(NO_POSE)}>Сброс</button>
            </div>
            <p className="hint">Нос должен смотреть влево-вниз, колёса/днище — вниз, как у встроенных фигурок.</p>
            <label className="leg-speed">
              <span>Размер</span>
              <input type="range" min={0.5} max={2} step={0.1} value={pose.scale} onChange={(e) => setPose({ ...pose, scale: Number(e.target.value) })} />
              <span>×{pose.scale.toFixed(1)}</span>
            </label>
          </div>
          : <>
            <label className="file drop">
              {preview ? <img src={preview} alt="" /> : <span>{file ? `📎 ${file.name}` : photo3d ? '📷 Выбрать фото (или .glb)' : '⬆ Выбрать .glb'}</span>}
              <input type="file" accept={photo3d ? 'image/*,.heic,.heif,.glb' : '.glb,model/gltf-binary'} hidden onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            {photo3d && <p className="hint">Из фото генерируется 3D-модель, ~2 минуты. Лучше всего: один объект целиком, в 3/4 или сбоку. Ориентацию потом можно поправить через ✎.</p>}
          </>}
        <input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="modes">
          <button className={mode === null ? 'on' : ''} onClick={() => setMode(null)}>Любой</button>
          {MODES.map((m) => (
            <button key={m.mode} className={mode === m.mode ? 'on' : ''} onClick={() => setMode(m.mode)}>{m.icon} {m.label}</button>
          ))}
        </div>
        <p className="hint">{mode ? 'Фигурка появится только в этом типе перемещения.' : 'Без типа фигурка доступна для воздуха, земли и воды.'}</p>
        {error && <div className="error">{error}</div>}
        <div className="row">
          <button className="primary" disabled={(!model && !file) || !name.trim() || busy} onClick={submit}>{busy ? 'Сохраняю…' : model ? 'Сохранить' : 'Добавить'}</button>
          <button onClick={onClose} disabled={busy}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

const CAPTIONS: { key: keyof Overlay; label: string }[] = [
  { key: 'title', label: 'Название' },
  { key: 'label', label: 'Подпись отрезка' },
  { key: 'progress', label: 'Прогресс-бар' },
];

function ExportDialog({ trip, onOverlay, onClose }: { trip: Trip; onOverlay: (o: Overlay) => void; onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const start = useRef<(o: Overlay) => void>(undefined);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'load' | 'ready' | 'render'>('load');
  const [frame, setFrame] = useState<{ label: string; mode: Mode } | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(trip.data.overlay ?? DEFAULT_OVERLAY);
  const [video, setVideo] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const { w, h } = FORMATS[trip.data.format];
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / (w / 2), e.contentRect.height / (h / 2))));
    ro.observe(wrap.current!);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    const d = trip.data;
    const [s0, s1] = span(d);
    exportVideo({
      title: trip.title, stops: d.stops.slice(s0, s1 + 1), legs: legsOf(d).slice(s0, s1) as { mode: Mode; figure: string; path: LngLat[] }[],
      style: d.style, format: d.format, speed: d.speed, host: host.current!, signal: ctrl.signal,
      onProgress: (p, s) => { setProgress(p); setStage(s); },
      ready: (f) => new Promise((resolve) => { setFrame({ label: f.label, mode: f.mode }); setStage('ready'); start.current = resolve; }),
    }).then(setVideo).catch((e) => { if (!ctrl.signal.aborted) setError(e.message || String(e)); });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (frame) drawOverlay(ctx, w, h, overlay, trip.title, frame.label, frame.mode, stage === 'render' ? progress : 0.4, attributionOf(trip.data.style));
  }, [overlay, frame, stage === 'render' && progress]);

  const render = () => { onOverlay(overlay); setStage('render'); start.current!(overlay); };

  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!video) return;
    const u = URL.createObjectURL(video);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [video]);
  const file = video ? new File([video], `${trip.title.replace(/[^\p{L}\p{N}]+/gu, '-')}-${trip.data.format.replace(':', 'x')}.mp4`, { type: 'video/mp4' }) : null;
  const canShare = !!file && !!navigator.canShare?.({ files: [file] });

  return (
    <div className="modal">
      <div className="dialog export">
        <div className="stage" ref={wrap}>
          {url
            ? <video src={url} controls autoPlay loop playsInline />
            : <div className="scaler" style={{ width: (w / 2) * scale, height: (h / 2) * scale }}>
              <div style={{ position: 'relative', transform: `scale(${scale})`, transformOrigin: '0 0' }}>
                <div ref={host} />
                <canvas ref={canvas} width={w} height={h} style={{ position: 'absolute', inset: 0, width: w / 2, height: h / 2, pointerEvents: 'none' }} />
              </div>
            </div>}
        </div>
        {!video && !error && (
          <div className="captions">
            {CAPTIONS.map((c) => (
              <label key={c.key}>
                <input type="checkbox" checked={overlay[c.key]} disabled={stage === 'render'} onChange={(e) => setOverlay({ ...overlay, [c.key]: e.target.checked })} /> {c.label}
              </label>
            ))}
          </div>
        )}
        {error ? <div className="error">{error}</div>
          : stage === 'ready' ? null
            : !video ? <><progress value={progress} /><p className="hint">{stage === 'load' ? 'Подгружаю карту…' : 'Рендер'} {Math.round(progress * 100)}% — не сворачивайте вкладку</p></>
              : null}
        <div className="row">
          {stage === 'ready' && <button className="primary" onClick={render}>🎬 Рендер</button>}
          {url && <a className="button primary" href={url} download={file!.name}>⬇ Скачать MP4</a>}
          {canShare && <button onClick={() => navigator.share({ files: [file!] }).catch(() => {})}>📤 Поделиться</button>}
          <button onClick={onClose}>{video || error ? 'Закрыть' : 'Отмена'}</button>
        </div>
      </div>
    </div>
  );
}
