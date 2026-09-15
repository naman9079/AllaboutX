import { env } from '../lib/env'
import { getSupabaseClient } from '../lib/supabase'
import type { GeneratedPost, Notification } from '../types'

export type WorkspaceSummary = { id: string; name: string; plan: 'free' | 'pro' | 'agency'; generationUsage: number; generationLimit: number | null }

export interface WorkspaceRepository {
  getActiveWorkspace(): Promise<WorkspaceSummary>
  saveGeneratedPosts(workspaceId: string, posts: GeneratedPost[]): Promise<GeneratedPost[]>
  schedulePost(workspaceId: string, postId: string, scheduledFor: string): Promise<void>
  getNotifications(workspaceId: string): Promise<Notification[]>
}

const mockWorkspace: WorkspaceSummary = { id: 'local-devflow', name: 'DevFlow', plan: 'free', generationUsage: 4, generationLimit: 5 }

class LocalWorkspaceRepository implements WorkspaceRepository {
  async getActiveWorkspace() { return mockWorkspace }
  async saveGeneratedPosts(_workspaceId: string, posts: GeneratedPost[]) { localStorage.setItem('allaboutx:generated-posts', JSON.stringify(posts)); return posts }
  async schedulePost(_workspaceId: string, postId: string, scheduledFor: string) { localStorage.setItem(`allaboutx:scheduled:${postId}`, scheduledFor) }
  async getNotifications() { return [] }
}

class SupabaseWorkspaceRepository implements WorkspaceRepository {
  // The generated Database contract is kept at the client boundary; relational selects
  // are intentionally narrowed here until `supabase gen types` replaces the scaffold.
  private client(): any { const client = getSupabaseClient(); if (!client) throw new Error('Supabase is not configured.') ; return client }
  async getActiveWorkspace() {
    const client = this.client(); const { data: auth, error: authError } = await client.auth.getUser(); if (authError || !auth.user) throw new Error('You need to sign in to access a workspace.')
    const { data, error } = await client.from('workspaces').select('id,name,subscriptions(plan),usage(generations_used)').eq('owner_id', auth.user.id).limit(1).single()
    if (error || !data) throw new Error('No workspace found. Complete onboarding first.')
    const subscription = data.subscriptions?.[0]; const usage = data.usage?.[0]
    return { id: data.id, name: data.name, plan: subscription?.plan ?? 'free', generationUsage: usage?.generations_used ?? 0, generationLimit: subscription?.plan === 'free' ? 5 : null }
  }
  async saveGeneratedPosts(workspaceId: string, posts: GeneratedPost[]) { const { data, error } = await this.client().from('posts').insert(posts.map(post => ({ workspace_id: workspaceId, content: post.content, status: post.status, format: post.format, goal: post.goal, pattern: post.pattern, why_it_works: post.whyItWorks, hook: post.hook, recommended_time: post.recommendedTime, confidence: post.confidence }))).select('id,content,status,format,goal,pattern,why_it_works,hook,recommended_time,confidence'); if (error || !data) throw new Error('Unable to save your generated posts.'); return data.map((post: { id: string; content: string; status: GeneratedPost['status']; format: string; goal: string; pattern: string; why_it_works: string; hook: string; recommended_time: string; confidence: number }) => ({ id: post.id, content: post.content, status: post.status, format: post.format, goal: post.goal, pattern: post.pattern, whyItWorks: post.why_it_works, hook: post.hook, recommendedTime: post.recommended_time, confidence: post.confidence })) }
  async schedulePost(workspaceId: string, postId: string, scheduledFor: string) { const { error } = await this.client().from('scheduled_posts').insert({ workspace_id: workspaceId, post_id: postId, scheduled_for: scheduledFor }); if (error) throw new Error('Unable to schedule this post.') }
  async getNotifications(workspaceId: string) { const { data, error } = await this.client().from('notifications').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }); if (error) throw new Error('Unable to load notifications.'); return (data ?? []).map((n: { id: string; title: string; detail: string; created_at: string; read_at: string | null }) => ({ id: n.id, title: n.title, detail: n.detail, time: new Date(n.created_at).toLocaleDateString(), unread: !n.read_at })) }
}

export const workspaceRepository: WorkspaceRepository = env.useSupabase ? new SupabaseWorkspaceRepository() : new LocalWorkspaceRepository()
