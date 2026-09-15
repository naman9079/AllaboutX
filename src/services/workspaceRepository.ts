import { env } from '../lib/env'
import type { GeneratedPost, Notification } from '../types'

export type WorkspaceSummary = { id: string; name: string; plan: 'free' | 'pro' | 'agency'; generationUsage: number; generationLimit: number | null }

export interface WorkspaceRepository {
  getActiveWorkspace(): Promise<WorkspaceSummary>
  getPosts(status?: 'draft' | 'scheduled' | 'published'): Promise<GeneratedPost[]>
  saveGeneratedPosts(workspaceId: string, posts: GeneratedPost[]): Promise<GeneratedPost[]>
  schedulePost(workspaceId: string, postId: string, scheduledFor: string): Promise<void>
  getNotifications(workspaceId: string): Promise<Notification[]>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(`${env.apiUrl}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init }); const body = await response.json().catch(() => null); if (!response.ok) throw new Error(body?.error ?? 'Backend request failed.'); return body as T }
export const workspaceRepository: WorkspaceRepository = {
  getActiveWorkspace: () => request<WorkspaceSummary>('/api/workspace'),
  getPosts: status => request<GeneratedPost[]>(status ? `/api/posts?status=${status}` : '/api/posts'),
  saveGeneratedPosts: (workspaceId, posts) => request<GeneratedPost[]>('/api/posts', { method: 'POST', body: JSON.stringify({ workspaceId, posts }) }),
  schedulePost: (workspaceId, postId, scheduledFor) => request('/api/schedule', { method: 'POST', body: JSON.stringify({ workspaceId, postId, scheduledFor }) }).then(() => undefined),
  getNotifications: () => request<Notification[]>('/api/notifications'),
}
