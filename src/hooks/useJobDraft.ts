import { useCallback } from 'react';
import type { MilestoneInput } from '../components/JobForm';
import type { JobMetadata } from '../types';

export interface JobDraft {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  description: string;
  budget: string;
  deadline: number | null; // Unix timestamp ms (Date.getTime())
  metadata: Partial<Pick<JobMetadata, 'category' | 'skills'>>;
  useMilestones: boolean;
  milestones: MilestoneInput[];
}

const STORAGE_KEY = 'job_drafts_v1';

function readAll(): Record<string, JobDraft> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeAll(drafts: Record<string, JobDraft>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

function generateId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useJobDraft() {
  /**
   * Save or update a draft.
   * If `partial.id` is provided and exists, the existing draft is updated.
   * Otherwise a new draft is created.
   * Returns the draft id.
   */
  const saveDraft = useCallback((partial: Partial<JobDraft> & { id?: string }): string => {
    const drafts = readAll();
    const id = partial.id && drafts[partial.id] ? partial.id : generateId();
    const now = Date.now();
    drafts[id] = {
      id,
      createdAt: drafts[id]?.createdAt ?? now,
      updatedAt: now,
      title: partial.title ?? '',
      description: partial.description ?? '',
      budget: partial.budget ?? '',
      deadline: partial.deadline instanceof Date
        ? (partial.deadline as Date).getTime()
        : (partial.deadline ?? null),
      metadata: partial.metadata ?? {},
      useMilestones: partial.useMilestones ?? false,
      milestones: partial.milestones ?? [],
    };
    writeAll(drafts);
    return id;
  }, []);

  const loadDraft = useCallback((id: string): JobDraft | null => {
    return readAll()[id] ?? null;
  }, []);

  const listDrafts = useCallback((): JobDraft[] => {
    return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
  }, []);

  const deleteDraft = useCallback((id: string) => {
    const drafts = readAll();
    delete drafts[id];
    writeAll(drafts);
  }, []);

  return { saveDraft, loadDraft, listDrafts, deleteDraft };
}
