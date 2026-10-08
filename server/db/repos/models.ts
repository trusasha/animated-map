import type { CustomModel } from '../../../src/domain/types.ts';
import type { ModelsRepo, Query } from '../types.ts';

const COLS = 'id, name, url, status, task_id, mode, pose';

export const modelsRepo = (query: Query): ModelsRepo => ({
  list: async () => (await query<CustomModel>(`select ${COLS} from models order by created_at desc`)).rows,
  get: async (id) => (await query<CustomModel>(`select ${COLS} from models where id = $1`, [id])).rows[0],
  create: async (m) =>
    (await query<CustomModel>(`insert into models (name, url, status, task_id, mode) values ($1, $2, $3, $4, $5) returning ${COLS}`, [m.name, m.url, m.status, m.task_id, m.mode])).rows[0],
  setState: async (id, url, status) =>
    (await query<CustomModel>(`update models set url = $2, status = $3 where id = $1 returning ${COLS}`, [id, url, status])).rows[0],
  edit: async (id, m) =>
    (await query<CustomModel>(`update models set name = $2, mode = $3, pose = $4::jsonb where id = $1 returning ${COLS}`, [id, m.name, m.mode, JSON.stringify(m.pose)])).rows[0],
  remove: async (id) => { await query('delete from models where id = $1', [id]); },
});
