import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import fs from 'node:fs/promises'
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const dataPath = path.join(root, 'data.json')
const port = Number(process.env.PORT || 8787)
const webUrl = process.env.WEB_URL || 'http://localhost:5173'
const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

const initialData = {
  users: [],
  sessions: [],
  workspace: { id: 'local-workspace', ownerId: null, name: 'DevFlow', plan: 'free', generationUsage: 0, generationLimit: 5 },
  posts: [],
  scheduledPosts: [],
  publishedPosts: [],
  notifications: [],
  xAccount: null,
  analytics: [],
}

async function readData() {
  try {
    const data = JSON.parse(await fs.readFile(dataPath, 'utf8'))
    data.users ||= []
    data.sessions ||= []
    data.workspace.ownerId ||= data.users[0]?.id ?? null
    return data
  } catch { await writeData(initialData); return structuredClone(initialData) }
}
async function writeData(data) { await fs.writeFile(dataPath, JSON.stringify(data, null, 2)) }
function sendError(response, status, message) { return response.status(status).json({ error: message }) }
function requireValue(value, message) { if (!value || typeof value !== 'string') throw new Error(message) }
function hashPassword(password, salt = randomBytes(16).toString('hex')) { return `${salt}:${scryptSync(password, salt, 64).toString('hex')}` }
function verifyPassword(password, stored) { const [salt, hash] = stored.split(':'); const actual = scryptSync(password, salt, 64); return timingSafeEqual(actual, Buffer.from(hash, 'hex')) }
function sessionCookie(token) { return `allaboutx_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` }
function cookies(request) { return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map(item => { const [key, ...value] = item.trim().split('='); return [key, decodeURIComponent(value.join('='))] })) }
async function authenticatedUser(request) { const data = await readData(); const token = cookies(request).allaboutx_session; const session = data.sessions.find(item => item.token === token && new Date(item.expiresAt) > new Date()); return session ? { data, user: data.users.find(item => item.id === session.userId) } : { data, user: null } }
function base64Url(value) { return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
function xRedirect(path) { return `${webUrl}${path}` }
async function refreshXAccessToken(user, data) {
  if (!user.xRefreshToken) return null
  const response = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: user.xRefreshToken, grant_type: 'refresh_token', client_id: process.env.X_CLIENT_ID, client_secret: process.env.X_CLIENT_SECRET }) })
  const tokens = await response.json().catch(() => null)
  if (!response.ok || !tokens?.access_token) return null
  user.xAccessToken = tokens.access_token
  if (tokens.refresh_token) user.xRefreshToken = tokens.refresh_token
  await writeData(data)
  return tokens.access_token
}

app.post('/api/auth/register', async (request, response) => {
  const email = String(request.body?.email || '').trim().toLowerCase()
  const password = String(request.body?.password || '')
  const name = String(request.body?.name || '').trim()
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || name.length < 2) return sendError(response, 400, 'Enter a valid name, email, and password of at least 8 characters.')
  const data = await readData()
  if (data.users.some(user => user.email === email)) return sendError(response, 409, 'An account with this email already exists.')
  const user = { id: randomUUID(), email, name, passwordHash: hashPassword(password), createdAt: new Date().toISOString() }
  data.users.push(user)
  if (!data.workspace.ownerId) data.workspace.ownerId = user.id
  const token = randomBytes(32).toString('hex')
  data.sessions.push({ token, userId: user.id, expiresAt: new Date(Date.now() + 604800000).toISOString() })
  await writeData(data)
  response.setHeader('Set-Cookie', sessionCookie(token))
  response.status(201).json({ id: user.id, email: user.email, name: user.name, xUsername: user.xUsername, profileImageUrl: user.profileImageUrl || null })
})
app.post('/api/auth/login', async (request, response) => {
  const email = String(request.body?.email || '').trim().toLowerCase()
  const password = String(request.body?.password || '')
  const data = await readData()
  const user = data.users.find(item => item.email === email)
  if (!user || !verifyPassword(password, user.passwordHash)) return sendError(response, 401, 'Email or password is incorrect.')
  const token = randomBytes(32).toString('hex')
  data.sessions = data.sessions.filter(item => item.userId !== user.id)
  data.sessions.push({ token, userId: user.id, expiresAt: new Date(Date.now() + 604800000).toISOString() })
  await writeData(data)
  response.setHeader('Set-Cookie', sessionCookie(token))
  response.json({ id: user.id, email: user.email, name: user.name, xUsername: user.xUsername, profileImageUrl: user.profileImageUrl || null })
})
app.get('/api/auth/me', async (request, response) => {
  const { user } = await authenticatedUser(request)
  if (!user) return sendError(response, 401, 'Not signed in.')
  response.json({ id: user.id, email: user.email, name: user.name, xUsername: user.xUsername, profileImageUrl: user.profileImageUrl || null })
})
app.post('/api/auth/logout', async (request, response) => {
  const data = await readData()
  const token = cookies(request).allaboutx_session
  data.sessions = data.sessions.filter(item => item.token !== token)
  await writeData(data)
  response.setHeader('Set-Cookie', 'allaboutx_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
  response.status(204).end()
})
app.post('/api/auth/supabase', async (request, response) => {
  const providerToken = String(request.body?.providerToken || '')
  const supabaseUser = request.body?.user
  if (!providerToken || !supabaseUser?.id) return sendError(response, 400, 'Supabase X session is incomplete.')
  const profileResponse = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,username,name', { headers: { Authorization: `Bearer ${providerToken}` } })
  const profilePayload = await profileResponse.json().catch(() => null)
  if (!profileResponse.ok || !profilePayload?.data) return sendError(response, 401, 'Unable to verify the X session from Supabase.')
  const profile = profilePayload.data
  const data = await readData()
  let user = data.users.find(item => item.supabaseUserId === supabaseUser.id || item.xUserId === profile.id)
  if (!user) { user = { id: randomUUID(), email: supabaseUser.email || `${profile.username}@x.local`, name: profile.name, passwordHash: '', supabaseUserId: supabaseUser.id, xUserId: profile.id, xUsername: profile.username, profileImageUrl: profile.profile_image_url || null, xAccessToken: providerToken, createdAt: new Date().toISOString() }; data.users.push(user) } else { user.supabaseUserId = supabaseUser.id; user.email = supabaseUser.email || user.email; user.name = profile.name; user.xUserId = profile.id; user.xUsername = profile.username; user.profileImageUrl = profile.profile_image_url || null; user.xAccessToken = providerToken }
  if (!data.workspace.ownerId) data.workspace.ownerId = user.id
  const sessionToken = randomBytes(32).toString('hex')
  data.sessions = data.sessions.filter(item => item.userId !== user.id)
  data.sessions.push({ token: sessionToken, userId: user.id, expiresAt: new Date(Date.now() + 604800000).toISOString() })
  await writeData(data)
  response.setHeader('Set-Cookie', sessionCookie(sessionToken))
  response.json({ id: user.id, email: user.email, name: user.name, xUsername: user.xUsername, profileImageUrl: user.profileImageUrl || null })
})
app.get('/api/auth/x/start', async (_request, response) => {
  const clientId = process.env.X_CLIENT_ID
  if (!clientId) return sendError(response, 503, 'X_CLIENT_ID is not configured on the backend.')
  const state = base64Url(randomBytes(24))
  const verifier = base64Url(randomBytes(48))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())
  const data = await readData()
  data.oauthStates ||= []
  data.oauthStates.push({ state, verifier, expiresAt: new Date(Date.now() + 600000).toISOString() })
  await writeData(data)
  const params = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: process.env.X_REDIRECT_URI || 'http://localhost:8787/api/auth/x/callback', scope: 'tweet.read users.read offline.access tweet.write', state, code_challenge: challenge, code_challenge_method: 'S256' })
  response.redirect(`https://twitter.com/i/oauth2/authorize?${params}`)
})
app.get('/api/auth/x/callback', async (request, response) => {
  const code = String(request.query.code || '')
  const state = String(request.query.state || '')
  const data = await readData()
  const oauthState = (data.oauthStates || []).find(item => item.state === state && new Date(item.expiresAt) > new Date())
  data.oauthStates = (data.oauthStates || []).filter(item => item.state !== state)
  if (!code || !oauthState) return response.redirect(`${webUrl}/?auth_error=Invalid%20X%20login%20session`)
  const redirectUri = process.env.X_REDIRECT_URI || 'http://localhost:8787/api/auth/x/callback'
  const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, grant_type: 'authorization_code', client_id: process.env.X_CLIENT_ID, client_secret: process.env.X_CLIENT_SECRET, redirect_uri: redirectUri, code_verifier: oauthState.verifier }) })
  const tokens = await tokenResponse.json()
  if (!tokenResponse.ok || !tokens.access_token) { await writeData(data); return response.redirect(`${webUrl}/?auth_error=Unable%20to%20complete%20X%20login`) }
  const profileResponse = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,username,name', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
  const profilePayload = await profileResponse.json()
  if (!profileResponse.ok || !profilePayload.data) { await writeData(data); return response.redirect(`${webUrl}/?auth_error=Unable%20to%20read%20your%20X%20profile`) }
  const profile = profilePayload.data
  let user = data.users.find(item => item.xUserId === profile.id)
  if (!user) { user = { id: randomUUID(), email: `${profile.username}@x.local`, name: profile.name, passwordHash: '', xUserId: profile.id, xUsername: profile.username, profileImageUrl: profile.profile_image_url || null, xAccessToken: tokens.access_token, xRefreshToken: tokens.refresh_token, createdAt: new Date().toISOString() }; data.users.push(user) } else { user.name = profile.name; user.xUsername = profile.username; user.profileImageUrl = profile.profile_image_url || null; user.xAccessToken = tokens.access_token; user.xRefreshToken = tokens.refresh_token }
  if (!data.workspace.ownerId) data.workspace.ownerId = user.id
  const sessionToken = randomBytes(32).toString('hex')
  data.sessions = data.sessions.filter(item => item.userId !== user.id)
  data.sessions.push({ token: sessionToken, userId: user.id, expiresAt: new Date(Date.now() + 604800000).toISOString() })
  await writeData(data)
  response.setHeader('Set-Cookie', sessionCookie(sessionToken))
  response.redirect(`${webUrl}/?x=connected`)
})

app.use('/api', async (request, response, next) => {
  if (request.path === '/health' || request.path.startsWith('/auth/')) return next()
  const { data, user } = await authenticatedUser(request)
  if (!user) return sendError(response, 401, 'Sign in to continue.')
  request.user = user
  request.appData = data
  next()
})

app.get('/api/health', (_request, response) => response.json({ ok: true, service: 'allaboutx-api' }))
app.get('/api/workspace', async (request, response) => response.json({ ...request.appData.workspace, ownerId: undefined }))
app.get('/api/notifications', async (_request, response) => response.json((await readData()).notifications))
app.get('/api/posts', async (request, response) => {
  const status = String(request.query.status || '').trim()
  const allowedStatuses = new Set(['draft', 'scheduled', 'published'])
  if (status && !allowedStatuses.has(status)) return sendError(response, 400, 'Unsupported post status.')
  const data = await readData()
  response.json(data.posts.filter(post => !status || post.status === status))
})
app.post('/api/posts', async (request, response) => {
  const data = await readData()
  const posts = Array.isArray(request.body?.posts) ? request.body.posts : []
  if (!posts.length) return sendError(response, 400, 'At least one post is required.')
  const saved = posts.map(post => ({ ...post, id: randomUUID(), createdAt: new Date().toISOString() }))
  data.posts.push(...saved)
  data.workspace.generationUsage += 1
  await writeData(data)
  response.status(201).json(saved)
})
app.post('/api/schedule', async (request, response) => {
  try {
    requireValue(request.body?.postId, 'postId is required.')
    requireValue(request.body?.scheduledFor, 'scheduledFor is required.')
    const scheduledFor = new Date(request.body.scheduledFor)
    if (Number.isNaN(scheduledFor.getTime())) return sendError(response, 400, 'scheduledFor must be a valid date.')
    const data = await readData()
    const post = data.posts.find(item => item.id === request.body.postId)
    if (!post) return sendError(response, 404, 'Post not found.')
    const scheduled = { id: randomUUID(), postId: post.id, scheduledFor: scheduledFor.toISOString(), providerStatus: 'pending', createdAt: new Date().toISOString() }
    post.status = 'scheduled'
    data.scheduledPosts = data.scheduledPosts.filter(item => item.postId !== post.id)
    data.scheduledPosts.push(scheduled)
    await writeData(data)
    response.status(201).json(scheduled)
  } catch (error) { sendError(response, 400, error.message) }
})
app.get('/api/x/account', async (request, response) => {
  let token = request.user.xAccessToken
  if (!token) return sendError(response, 404, 'No X account is connected.')
  let headers = { Authorization: `Bearer ${token}` }
  let profileResponse = await fetch('https://api.x.com/2/users/me?user.fields=description,profile_image_url,public_metrics,username,name', { headers })
  if (profileResponse.status === 401) {
    token = await refreshXAccessToken(request.user, request.appData)
    if (!token) return sendError(response, 401, 'Your X connection has expired. Please connect X again.')
    headers = { Authorization: `Bearer ${token}` }
    profileResponse = await fetch('https://api.x.com/2/users/me?user.fields=description,profile_image_url,public_metrics,username,name', { headers })
  }
  const profilePayload = await profileResponse.json()
  if (!profileResponse.ok || !profilePayload.data) return sendError(response, profileResponse.status || 502, 'Unable to load the connected X profile.')
  const profile = profilePayload.data
  const postsResponse = await fetch(`https://api.x.com/2/users/${profile.id}/tweets?max_results=100&tweet.fields=created_at,public_metrics&exclude=replies,retweets`, { headers })
  const postsPayload = await postsResponse.json()
  if (!postsResponse.ok) return sendError(response, postsResponse.status || 502, 'Unable to load posts from the connected X account.')
  const posts = (postsPayload.data || []).map(post => ({ id: post.id, text: post.text, createdAt: post.created_at || '', publicMetrics: { likeCount: post.public_metrics?.like_count || 0, replyCount: post.public_metrics?.reply_count || 0, repostCount: post.public_metrics?.retweet_count || 0, quoteCount: post.public_metrics?.quote_count || 0, bookmarkCount: post.public_metrics?.bookmark_count || 0, impressionCount: post.public_metrics?.impression_count || 0 } }))
  request.user.name = profile.name
  request.user.xUsername = profile.username
  request.user.profileImageUrl = profile.profile_image_url || null
  await writeData(request.appData)
  response.json({ id: profile.id, username: profile.username, name: profile.name, description: profile.description || '', profileImageUrl: profile.profile_image_url || null, followers: profile.public_metrics?.followers_count || 0, following: profile.public_metrics?.following_count || 0, tweetCount: profile.public_metrics?.tweet_count || 0, posts })
})
app.get('/api/x/data', async (request, response) => {
  const username = String(request.query.username || '').replace(/^@/, '').trim()
  if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) return sendError(response, 400, 'A valid X username is required.')
  const bearer = process.env.X_BEARER_TOKEN
  if (!bearer) return sendError(response, 503, 'X_BEARER_TOKEN is not configured on the backend.')
  const headers = { Authorization: `Bearer ${bearer}` }
  const userResponse = await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=description,profile_image_url,public_metrics,username,name`, { headers })
  const userPayload = await userResponse.json()
  if (!userResponse.ok || !userPayload.data) return sendError(response, userResponse.status || 502, userPayload.errors?.[0]?.detail || 'X user not found.')
  const xUser = userPayload.data
  const postsResponse = await fetch(`https://api.x.com/2/users/${xUser.id}/tweets?max_results=100&tweet.fields=created_at,public_metrics&exclude=replies,retweets`, { headers })
  const postsPayload = await postsResponse.json()
  if (!postsResponse.ok) return sendError(response, postsResponse.status || 502, postsPayload.errors?.[0]?.detail || 'Unable to load X posts.')
  const posts = (postsPayload.data || []).map(post => ({ id: post.id, text: post.text, createdAt: post.created_at || '', publicMetrics: { likeCount: post.public_metrics?.like_count || 0, replyCount: post.public_metrics?.reply_count || 0, repostCount: post.public_metrics?.retweet_count || 0, quoteCount: post.public_metrics?.quote_count || 0, bookmarkCount: post.public_metrics?.bookmark_count || 0, impressionCount: post.public_metrics?.impression_count || 0 } }))
  const data = await readData()
  data.xAccount = { id: xUser.id, username: xUser.username, name: xUser.name, description: xUser.description || '', profileImageUrl: xUser.profile_image_url || null, followers: xUser.public_metrics?.followers_count || 0, following: xUser.public_metrics?.following_count || 0, tweetCount: xUser.public_metrics?.tweet_count || 0, posts }
  data.analytics.push({ date: new Date().toISOString().slice(0, 10), followers: data.xAccount.followers, postsCount: posts.length, impressions: posts.reduce((sum, post) => sum + post.publicMetrics.impressionCount, 0), engagements: posts.reduce((sum, post) => sum + post.publicMetrics.likeCount + post.publicMetrics.replyCount + post.publicMetrics.repostCount + post.publicMetrics.quoteCount, 0) })
  await writeData(data)
  response.json(data.xAccount)
})
app.post('/api/x/publish', async (request, response) => {
  const token = request.user.xAccessToken || process.env.X_USER_ACCESS_TOKEN
  if (!token) return sendError(response, 503, 'X_USER_ACCESS_TOKEN is not configured on the backend.')
  const data = await readData()
  const post = data.posts.find(item => item.id === request.body?.postId)
  if (!post) return sendError(response, 404, 'Post not found.')
  const xResponse = await fetch('https://api.x.com/2/tweets', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: post.content }) })
  const payload = await xResponse.json()
  if (!xResponse.ok || !payload.data?.id) return sendError(response, xResponse.status || 502, payload.detail || 'X rejected the post.')
  post.status = 'published'
  const published = { id: randomUUID(), postId: post.id, providerPostId: payload.data.id, publishedAt: new Date().toISOString() }
  data.publishedPosts.push(published)
  await writeData(data)
  response.json(published)
})

app.listen(port, () => console.log(`AllaboutX API running at http://localhost:${port}`))
