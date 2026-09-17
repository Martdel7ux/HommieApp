import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { PAGE_SIZE } from '@/config/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { analytics } from '@/services/analytics';
import { haptics } from '@/services/haptics';
import { jobsApi } from './api';
import type { JobCard, JobFilters } from './types';

export function useJobSearch(filters: JobFilters) {
  const query = useInfiniteQuery({
    queryKey: qk.jobs(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      jobsApi.list(filters, {
        limit: PAGE_SIZE.jobs,
        offset: pageParam * PAGE_SIZE.jobs,
        withCount: pageParam === 0,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.rows.length, 0);
      const total = allPages[0]?.count ?? loaded;
      return loaded < total ? allPages.length : undefined;
    },
  });

  const rows = useMemo<JobCard[]>(() => query.data?.pages.flatMap((p) => p.rows) ?? [], [query.data]);
  const total = query.data?.pages[0]?.count ?? null;

  return { ...query, rows, total };
}

export function useJob(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.job(id),
    queryFn: () => jobsApi.get(id, user!.id),
    enabled: !!id && !!user,
  });
}

export function useSavedJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = qk.savedJobs(user?.id ?? 'anon');

  const saved = useQuery({
    queryKey: key,
    queryFn: () => jobsApi.savedIds(user!.id),
    enabled: !!user,
  });

  const toggle = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) => jobsApi.toggleSave(user!.id, id, next),
    onMutate: async ({ id, next }) => {
      haptics.select();
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData<string[]>(key, next ? [...prev, id] : prev.filter((x) => x !== id));
      analytics.track(next ? 'job_saved' : 'job_unsaved', { job_id: id });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({ queryKey: key });
      if (vars) queryClient.invalidateQueries({ queryKey: qk.job(vars.id) });
    },
  });

  return {
    savedIds: Array.isArray(saved.data) ? saved.data : [],
    toggle: (id: string, next: boolean) => toggle.mutate({ id, next }),
  };
}
