import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405)

  const authorization = request.headers.get('Authorization')
  const token = authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Authentication required.' }, 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: user, error: userError } = await supabase.auth.getUser()
  if (userError || !user.user) return json({ error: 'Invalid session.' }, 401)

  const username = new URL(request.url).searchParams.get('username')?.replace(/^@/, '').trim()
  if (!username || !/^[A-Za-z0-9_]{1,15}$/.test(username)) return json({ error: 'A valid X username is required.' }, 400)

  const bearer = Deno.env.get('X_BEARER_TOKEN')
  if (!bearer) return json({ error: 'X API is not configured on the server.' }, 503)

  const headers = { Authorization: `Bearer ${bearer}` }
  const userResponse = await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=description,profile_image_url,public_metrics,username,name`, { headers })
  const userPayload = await userResponse.json()
  if (!userResponse.ok || !userPayload.data) return json({ error: userPayload.errors?.[0]?.detail ?? 'X user not found.' }, userResponse.status || 502)

  const xUser = userPayload.data
  const postsResponse = await fetch(`https://api.x.com/2/users/${xUser.id}/tweets?max_results=100&tweet.fields=created_at,public_metrics&exclude=replies,retweets`, { headers })
  const postsPayload = await postsResponse.json()
  if (!postsResponse.ok) return json({ error: postsPayload.errors?.[0]?.detail ?? 'Unable to load X posts.' }, postsResponse.status || 502)

  return json({
    id: xUser.id,
    username: xUser.username,
    name: xUser.name,
    description: xUser.description ?? '',
    profileImageUrl: xUser.profile_image_url ?? null,
    followers: xUser.public_metrics?.followers_count ?? 0,
    following: xUser.public_metrics?.following_count ?? 0,
    tweetCount: xUser.public_metrics?.tweet_count ?? 0,
    posts: (postsPayload.data ?? []).map((post: { id: string; text: string; created_at?: string; public_metrics?: { like_count?: number; reply_count?: number; retweet_count?: number; impression_count?: number } }) => ({
      id: post.id,
      text: post.text,
      createdAt: post.created_at ?? '',
      publicMetrics: {
        likeCount: post.public_metrics?.like_count ?? 0,
        replyCount: post.public_metrics?.reply_count ?? 0,
        repostCount: post.public_metrics?.retweet_count ?? 0,
        impressionCount: post.public_metrics?.impression_count ?? 0,
      },
    })),
  })
})
