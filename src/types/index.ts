export type PostStatus = 'draft' | 'scheduled' | 'published'
export interface GeneratedPost { id: string; content: string; format: string; goal: string; pattern: string; whyItWorks: string; hook: string; recommendedTime: string; confidence: number; status: PostStatus; createdAt?: string }
export interface Trend { id: string; topic: string; momentum: number; relevance: number; volume: string; summary: string; category: string }
export interface Competitor { id: string; name: string; handle: string; followers: string; posts: number; engagement: string; topic: string; format: string; color: string }
export interface Notification { id: string; title: string; detail: string; time: string; unread: boolean }
export interface ContentDNA { tone: number; confidence: number; depth: number; humor: number; storytelling: number; concise: number; opinion: number }
export interface XAccountData { id: string; username: string; name: string; description: string; profileImageUrl: string | null; followers: number; following: number; tweetCount: number; posts: XPost[] }
export interface ConnectedXAccount { username: string; name: string; profileImageUrl: string | null }
export interface XPost { id: string; text: string; createdAt: string; publicMetrics: { likeCount: number; replyCount: number; repostCount: number; quoteCount: number; bookmarkCount: number; impressionCount: number } }
