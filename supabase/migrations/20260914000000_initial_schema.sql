-- AllaboutX: multi-tenant foundation. Run with `supabase db push` or in the Supabase SQL editor.
create extension if not exists "pgcrypto";

create type public.member_role as enum ('owner', 'member');
create type public.post_status as enum ('draft', 'scheduled', 'published');
create type public.subscription_plan as enum ('free', 'pro', 'agency');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, handle text, avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspaces (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120), company text, website text,
  product_description text, industry text, target_audience text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member', created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table public.x_accounts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_user_id text not null, handle text not null, display_name text, avatar_url text, follower_count integer not null default 0,
  encrypted_access_token text, token_expires_at timestamptz, connected_at timestamptz not null default now(), disconnected_at timestamptz,
  unique (workspace_id, provider_user_id)
);
create table public.posts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  x_account_id uuid references public.x_accounts(id) on delete set null, content text not null check (char_length(content) between 1 and 25000),
  status public.post_status not null default 'draft', format text, goal text, pattern text, why_it_works text, hook text,
  recommended_time text, confidence numeric(5,2) check (confidence between 0 and 100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  post_id uuid not null unique references public.posts(id) on delete cascade, scheduled_for timestamptz not null,
  provider_status text not null default 'pending', provider_job_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.published_posts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  post_id uuid not null unique references public.posts(id) on delete cascade, provider_post_id text, published_at timestamptz not null,
  impressions integer not null default 0, likes integer not null default 0, replies integer not null default 0, reposts integer not null default 0, engagement_rate numeric(8,4) not null default 0
);
create table public.content_dna (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  tone smallint check (tone between 0 and 100), confidence smallint check (confidence between 0 and 100), technical_depth smallint check (technical_depth between 0 and 100), humor smallint check (humor between 0 and 100), storytelling smallint check (storytelling between 0 and 100), conciseness smallint check (conciseness between 0 and 100), opinion_strength smallint check (opinion_strength between 0 and 100), analysis text, updated_at timestamptz not null default now()
);
create table public.viral_patterns (
  id uuid primary key default gen_random_uuid(), workspace_id uuid references public.workspaces(id) on delete cascade, name text not null, score smallint check (score between 0 and 100), structure text, example text, recommended_usage text, created_at timestamptz not null default now()
);
create table public.trends (
  id uuid primary key default gen_random_uuid(), workspace_id uuid references public.workspaces(id) on delete cascade, topic text not null, category text, momentum smallint check (momentum between 0 and 100), relevance smallint check (relevance between 0 and 100), discussion_volume integer, summary text, saved boolean not null default false, observed_at timestamptz not null default now()
);
create table public.competitors (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, handle text not null, display_name text, followers integer, posts_this_week integer, average_engagement numeric(8,4), top_topic text, top_format text, created_at timestamptz not null default now(), unique(workspace_id, handle)
);
create table public.analytics_daily (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, date date not null, impressions integer not null default 0, engagements integer not null default 0, followers integer not null default 0, posts_count integer not null default 0, engagement_rate numeric(8,4) not null default 0, unique(workspace_id, date)
);
create table public.missions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, date date not null, title text not null, completed_at timestamptz, sort_order smallint not null default 0
);
create table public.streaks (workspace_id uuid primary key references public.workspaces(id) on delete cascade, current_days integer not null default 0, longest_days integer not null default 0, last_completed_on date);
create table public.notifications (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, title text not null, detail text not null, type text not null default 'info', read_at timestamptz, created_at timestamptz not null default now());
create table public.subscriptions (id uuid primary key default gen_random_uuid(), workspace_id uuid not null unique references public.workspaces(id) on delete cascade, plan public.subscription_plan not null default 'free', status text not null default 'active', stripe_customer_id text unique, stripe_subscription_id text unique, current_period_end timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.usage (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, period_start date not null, generations_used integer not null default 0 check (generations_used >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id, period_start));

create index posts_workspace_status_idx on public.posts(workspace_id, status, created_at desc);
create index scheduled_posts_workspace_time_idx on public.scheduled_posts(workspace_id, scheduled_for);
create index trends_workspace_observed_idx on public.trends(workspace_id, observed_at desc);
create index notifications_workspace_created_idx on public.notifications(workspace_id, created_at desc);
create index analytics_workspace_date_idx on public.analytics_daily(workspace_id, date desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger workspaces_updated before update on public.workspaces for each row execute function public.set_updated_at();
create trigger posts_updated before update on public.posts for each row execute function public.set_updated_at();
create trigger scheduled_posts_updated before update on public.scheduled_posts for each row execute function public.set_updated_at();
create trigger subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger usage_updated before update on public.usage for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(target_workspace uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid()); $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email)); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.add_workspace_owner() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.workspace_members(workspace_id, user_id, role) values (new.id, new.owner_id, 'owner'); return new; end; $$;
create trigger on_workspace_created after insert on public.workspaces for each row execute procedure public.add_workspace_owner();

alter table public.profiles enable row level security; alter table public.workspaces enable row level security; alter table public.workspace_members enable row level security; alter table public.x_accounts enable row level security; alter table public.posts enable row level security; alter table public.scheduled_posts enable row level security; alter table public.published_posts enable row level security; alter table public.content_dna enable row level security; alter table public.viral_patterns enable row level security; alter table public.trends enable row level security; alter table public.competitors enable row level security; alter table public.analytics_daily enable row level security; alter table public.missions enable row level security; alter table public.streaks enable row level security; alter table public.notifications enable row level security; alter table public.subscriptions enable row level security; alter table public.usage enable row level security;
create policy "profiles own record" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "workspace members select workspaces" on public.workspaces for select using (public.is_workspace_member(id)); create policy "owners manage workspace" on public.workspaces for update using (owner_id = auth.uid()); create policy "users create workspaces" on public.workspaces for insert with check (owner_id = auth.uid());
create policy "members view membership" on public.workspace_members for select using (public.is_workspace_member(workspace_id)); create policy "owners manage members" on public.workspace_members for all using (exists(select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid()));
-- Every remaining workspace-scoped resource receives the same tenant guard.
create policy "member access x accounts" on public.x_accounts for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access posts" on public.posts for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access scheduled posts" on public.scheduled_posts for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access published posts" on public.published_posts for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access content dna" on public.content_dna for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access viral patterns" on public.viral_patterns for all using (workspace_id is null or public.is_workspace_member(workspace_id)) with check (workspace_id is null or public.is_workspace_member(workspace_id));
create policy "member access trends" on public.trends for all using (workspace_id is null or public.is_workspace_member(workspace_id)) with check (workspace_id is null or public.is_workspace_member(workspace_id));
create policy "member access competitors" on public.competitors for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access analytics" on public.analytics_daily for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access missions" on public.missions for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access streaks" on public.streaks for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access notifications" on public.notifications for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access subscriptions" on public.subscriptions for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "member access usage" on public.usage for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
