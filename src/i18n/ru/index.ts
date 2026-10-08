import type { Dict } from '../en';
import type { Shape } from '../keys';
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

export const ru: Shape<Dict> = { common, home, trips, route, composer, inspector, video, settings, figures, export: exportDialog, preview, toasts };
