import { useState, useEffect } from 'react';
import type { Environment } from '../types';
import { api } from '../api';

export function useEnvironments(projectId: number | null | undefined) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!projectId) return;
    api.listEnvironments(projectId).then((envs) => {
      const list = envs ?? [];
      setEnvironments(list);
      if (list.length > 0) {
        const def = list.find(e => e.isDefault) || list[0];
        setSelectedEnvId(def.id);
      }
    }).catch(console.error);
  }, [projectId]);

  return { environments, selectedEnvId, setSelectedEnvId };
}
