import { z } from 'zod'
import { workspaceRepository } from './workspaceRepository'
import type { GeneratedPost } from '../types'

const postSchema = z.object({ id: z.string(), content: z.string().min(1).max(280), format: z.string(), goal: z.string(), pattern: z.string(), whyItWorks: z.string(), hook: z.string(), recommendedTime: z.string(), confidence: z.number().min(0).max(100), status: z.enum(['draft', 'scheduled', 'published']) })
export type GeneratorInput = { goal: string; tone: string; format: string; length: string }
const examples = [
  ['The biggest unlock for your dev tool isn’t more features.\n\nIt’s the moment a user stops thinking about your product and starts thinking with it.\n\nBuild for that moment.', 'Contrarian Take', 'A sharp point of view creates a natural pause in the feed.'],
  ['Most founders optimize their onboarding for comprehension.\n\nThe best ones optimize for momentum.\n\nA user who ships a tiny win in 3 minutes will forgive a lot later.', 'Technical Breakdown', 'Specific insight + a concrete takeaway makes this highly saveable.'],
  ['Hot take: “AI-native” is not a category.\n\nIt’s a product decision.\n\nIf the experience would be equally good without the model, it probably doesn’t belong.', 'Hot Take + Evidence', 'The provocative opening invites thoughtful replies without being empty.'],
  ['A useful test for every product decision:\n\nWould your best user notice if you removed this?\n\nIf the answer is no, it’s probably roadmap noise.', 'Question + Opinion', 'The question gives readers an immediate way to apply the idea.'],
  ['We stopped measuring whether people completed our setup.\n\nNow we measure whether they reached their first “I get it” moment.\n\nThat one change improved activation more than any redesign.', 'Before / After', 'A real operating change makes the lesson credible and memorable.'],
  ['The next generation of developer tools won’t win by writing more code.\n\nThey’ll win by eliminating the decisions that never deserved human attention.', 'Prediction', 'Forward-looking framing earns reach from people who want an informed POV.'],
  ['Your product has two roadmaps:\n\n1. Features you can describe\n2. Moments users can feel\n\nThe second one is where retention lives.', 'Curiosity Gap', 'The contrast creates a clean, readable mental model.']
]
export async function generatePosts(input: GeneratorInput): Promise<GeneratedPost[]> {
  await new Promise(resolve => setTimeout(resolve, 1100))
  const posts = examples.map(([content, pattern, whyItWorks], index) => postSchema.parse({ id: `gen-${Date.now()}-${index}`, content, format: input.format, goal: input.goal, pattern, whyItWorks, hook: content.split('\n')[0], recommendedTime: ['09:30', '10:00', '08:45', '09:15', '10:30', '11:00', '08:30'][index], confidence: 94 - index * 3, status: 'draft' }))
  const workspace = await workspaceRepository.getActiveWorkspace()
  return workspaceRepository.saveGeneratedPosts(workspace.id, posts)
}
export const contentEngine = { generatePosts }
