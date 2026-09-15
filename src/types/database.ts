export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type PostStatus = 'draft' | 'scheduled' | 'published'
export type Plan = 'free' | 'pro' | 'agency'

export interface Database {
  public: {
    Tables: {
      profiles: { Row: { id: string; full_name: string | null; handle: string | null; avatar_url: string | null; created_at: string; updated_at: string }; Insert: { id: string; full_name?: string | null; handle?: string | null; avatar_url?: string | null }; Update: { full_name?: string | null; handle?: string | null; avatar_url?: string | null } }
      workspaces: { Row: { id: string; owner_id: string; name: string; company: string | null; website: string | null; product_description: string | null; industry: string | null; target_audience: string | null; created_at: string; updated_at: string }; Insert: { id?: string; owner_id: string; name: string; company?: string | null; website?: string | null; product_description?: string | null; industry?: string | null; target_audience?: string | null }; Update: Partial<Database['public']['Tables']['workspaces']['Insert']> }
      workspace_members: { Row: { workspace_id: string; user_id: string; role: 'owner' | 'member'; created_at: string }; Insert: { workspace_id: string; user_id: string; role?: 'owner' | 'member' }; Update: never }
      posts: { Row: { id: string; workspace_id: string; content: string; status: PostStatus; format: string | null; goal: string | null; pattern: string | null; why_it_works: string | null; hook: string | null; recommended_time: string | null; confidence: number | null; created_at: string; updated_at: string }; Insert: { id?: string; workspace_id: string; content: string; status?: PostStatus; format?: string | null; goal?: string | null; pattern?: string | null; why_it_works?: string | null; hook?: string | null; recommended_time?: string | null; confidence?: number | null }; Update: Partial<Database['public']['Tables']['posts']['Insert']> }
      scheduled_posts: { Row: { id: string; workspace_id: string; post_id: string; scheduled_for: string; provider_status: string; created_at: string; updated_at: string }; Insert: { id?: string; workspace_id: string; post_id: string; scheduled_for: string; provider_status?: string }; Update: { scheduled_for?: string; provider_status?: string } }
      notifications: { Row: { id: string; workspace_id: string; title: string; detail: string; type: string; read_at: string | null; created_at: string }; Insert: { id?: string; workspace_id: string; title: string; detail: string; type?: string }; Update: { read_at?: string | null } }
      subscriptions: { Row: { id: string; workspace_id: string; plan: Plan; status: string; current_period_end: string | null; created_at: string; updated_at: string }; Insert: { id?: string; workspace_id: string; plan?: Plan; status?: string; current_period_end?: string | null }; Update: { plan?: Plan; status?: string; current_period_end?: string | null } }
      usage: { Row: { id: string; workspace_id: string; period_start: string; generations_used: number; created_at: string; updated_at: string }; Insert: { id?: string; workspace_id: string; period_start: string; generations_used?: number }; Update: { generations_used?: number } }
    }
    Views: Record<string, never>
    Functions: { is_workspace_member: { Args: { target_workspace: string }; Returns: boolean } }
    Enums: { post_status: PostStatus; subscription_plan: Plan }
    CompositeTypes: Record<string, never>
  }
}
