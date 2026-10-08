import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { MapOverlay3D } from '../../domain/overlay3d';
import { createMapService, type MapService, type Padding } from '../../services/map';
import { createOverlay3D } from '../../services/scene3d';
import { MapHost } from '../MapHost';

export interface Services {
  map: MapService;
  overlay: MapOverlay3D;
  /** camera padding for the editor panels */
  setPadding: (p: Padding) => void;
}

const Ctx = createContext<Services | null>(null);

export function useServices(): Services {
  const s = useContext(Ctx);
  if (!s) throw new Error('useServices outside ServicesProvider');
  return s;
}

const exposeForTests = import.meta.env.DEV || new URLSearchParams(location.search).has('e2e');

/** creates the overlay and the map once, when the container mounts; children render after that */
export function ServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Services | null>(null);

  const attach = useCallback((el: HTMLDivElement) => {
    const overlay = createOverlay3D();
    const map = createMapService(el, overlay);
    const ta = { map, player: map.player, padding: undefined as Padding | undefined };
    if (exposeForTests) (window as unknown as { __ta: typeof ta }).__ta = ta;
    setServices({ map, overlay, setPadding: (p) => { ta.padding = p; map.setPadding(p); } });
    return () => {
      setServices(null);
      map.destroy();
    };
  }, []);

  return (
    <>
      <MapHost ref={attach} />
      {services && <Ctx value={services}>{children}</Ctx>}
    </>
  );
}
