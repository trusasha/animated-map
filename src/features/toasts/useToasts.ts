import { createContext, useContext } from 'react';
import type { ToastInput } from '../../ds';

export interface ToastApi {
  push: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi>({ push: () => 0, dismiss: () => {} });

export const useToasts = () => useContext(ToastContext);
