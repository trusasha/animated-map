import type { CustomModel } from '../../../src/domain/types.ts';
import type { ModelsRepo, Query } from '../types.ts';

const COLS = 'id, name, url, status, task_id, mode, pose';
const MINE = 'user_id is not distinct from $1::text';

export const modelsRepo = (query: Query): ModelsRepo => ({
  list: async (owner) => (await query<CustomModel>(`select ${COLS} from models where ${MINE} order by created_at desc`, [owner])).rows,
  get: async (owner, id) => (await query<CustomModel>(`select ${COLS} from models where ${MINE} and id = $2`, [owner, id])).rows[0],
  create: async (owner, m) =>
    (await query<CustomModel>(`insert into models (user_id, name, url, status, task_id, mode) values ($1, $2, $3, $4, $5, $6) returning ${COLS}`, [owner, m.name, m.url, m.status, m.task_id, m.mode])).rows[0],
  setState: async (owner, id, url, status) =>
    (await query<CustomModel>(`update models set url = $3, status = $4 where ${MINE} and id = $2 returning ${COLS}`, [owner, id, url, status])).rows[0],
  edit: async (owner, id, m) =>
    (await query<CustomModel>(`update models set name = $3, mode = $4, pose = $5::jsonb where ${MINE} and id = $2 returning ${COLS}`, [owner, id, m.name, m.mode, JSON.stringify(m.pose)])).rows[0],
  remove: async (owner, id) => { await query(`delete from models where ${MINE} and id = $2`, [owner, id]); },
});
