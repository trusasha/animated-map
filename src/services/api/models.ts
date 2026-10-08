import type { CustomModel, Mode } from '../../domain/types';
import { jsonBody, req } from './http';

export const models = {
  models: () => req<CustomModel[]>('/api/models'),
  addModel: (file: File, name: string, mode: Mode | null) => {
    const glb = /\.glb$/i.test(file.name);
    const q = new URLSearchParams({ name, file: file.name, ...(mode && { mode }) });
    const type = glb ? 'model/gltf-binary' : file.type || 'image/jpeg';
    return req<CustomModel>(`/api/models/${glb ? 'upload' : 'generate'}?${q}`, { method: 'POST', headers: { 'Content-Type': type }, body: file });
  },
  editModel: (m: CustomModel) => req<CustomModel>(`/api/models/${m.id}`, jsonBody('PUT', { name: m.name, mode: m.mode, pose: m.pose })),
  refreshModel: (id: string) => req<CustomModel>(`/api/models/${id}/refresh`, { method: 'POST' }),
  deleteModel: (id: string) => req(`/api/models/${id}`, { method: 'DELETE' }),
};
