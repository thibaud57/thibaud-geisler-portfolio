export type Expertise = {
  readonly name: string
  readonly wikidataId?: string
  readonly wikipediaUrl?: string
}

export const EXPERTISE = [
  {
    name: 'Artificial Intelligence',
    wikidataId: 'Q11660',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
  },
  {
    name: 'Automation',
    wikidataId: 'Q184199',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Automation',
  },
  {
    name: 'Software Engineering',
    wikidataId: 'Q638608',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Software_engineering',
  },
  {
    name: 'Web Development',
    wikidataId: 'Q386275',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Web_development',
  },
  { name: 'AI Training' },
] as const satisfies readonly Expertise[]
