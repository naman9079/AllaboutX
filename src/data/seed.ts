import type { Competitor, ContentDNA, GeneratedPost, Notification, Trend } from '../types'
export const dna: ContentDNA = { tone: 88, confidence: 84, depth: 91, humor: 42, storytelling: 67, concise: 86, opinion: 89 }
export const trends: Trend[] = [
  { id: '1', topic: 'AI coding agents', momentum: 92, relevance: 97, volume: '24.8K posts', summary: 'Founders are debating how agent workflows change small engineering teams.', category: 'Your niche' },
  { id: '2', topic: 'The unbundling of SaaS', momentum: 81, relevance: 88, volume: '11.2K posts', summary: 'A fresh conversation about category leaders losing workflow-level differentiation.', category: 'SaaS' },
  { id: '3', topic: 'Build in public fatigue', momentum: 74, relevance: 83, volume: '8.6K posts', summary: 'Creators are sharing more honest takes on sustainable audience building.', category: 'Creator economy' },
  { id: '4', topic: 'Small teams, bigger ambition', momentum: 69, relevance: 91, volume: '6.1K posts', summary: 'Lean product teams are posting their new operating principles.', category: 'Startups' }
]
export const competitors: Competitor[] = [
  { id: '1', name: 'Maya Chen', handle: '@mayamakes', followers: '38.4K', posts: 8, engagement: '4.8%', topic: 'AI workflows', format: 'Founder stories', color: '#E85A4F' },
  { id: '2', name: 'Jon Bell', handle: '@jonbuilds', followers: '24.1K', posts: 6, engagement: '3.9%', topic: 'Dev tools', format: 'Technical threads', color: '#E98074' },
  { id: '3', name: 'Priya Kapoor', handle: '@priyak', followers: '17.8K', posts: 5, engagement: '5.2%', topic: 'SaaS growth', format: 'Hot takes', color: '#D8C3A5' }
]
export const notifications: Notification[] = [
  { id: '1', title: 'Your post is outperforming', detail: 'Yesterday’s post is 240% above your average engagement.', time: '28m', unread: true },
  { id: '2', title: 'A relevant trend is rising', detail: 'AI coding agents is picking up momentum in your niche.', time: '2h', unread: true },
  { id: '3', title: 'Your weekly report is ready', detail: 'You gained 318 followers and your best format was technical breakdowns.', time: '1d', unread: false }
]
export const scheduledSeed: GeneratedPost[] = [
  { id: 'scheduled-1', content: 'The best onboarding doesn’t explain your product. It gets the user to a win before they have time to doubt it.', format: 'Hot take', goal: 'Reach', pattern: 'Contrarian Take', whyItWorks: 'A clear view with a useful distinction.', hook: 'The best onboarding doesn’t explain your product.', recommendedTime: '09:30', confidence: 92, status: 'scheduled' },
  { id: 'scheduled-2', content: 'Every great developer tool has an invisible feature: it makes the next right action feel obvious.', format: 'Educational', goal: 'Followers', pattern: 'Curiosity Gap', whyItWorks: 'Creates a memorable mental model.', hook: 'Every great developer tool has an invisible feature.', recommendedTime: '10:00', confidence: 89, status: 'scheduled' }
]
