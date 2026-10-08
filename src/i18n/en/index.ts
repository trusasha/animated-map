import { common } from './common';
import { composer } from './composer';
import { exportDialog } from './export';
import { figures } from './figures';
import { home } from './home';
import { inspector } from './inspector';
import { preview } from './preview';
import { route } from './route';
import { settings } from './settings';
import { toasts } from './toasts';
import { trips } from './trips';
import { video } from './video';

export const en = { common, home, trips, route, composer, inspector, video, settings, figures, export: exportDialog, preview, toasts };
export type Dict = typeof en;
