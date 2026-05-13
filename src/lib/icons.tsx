import {
  SiAndroid,
  SiAngular,
  SiAnthropic,
  SiApachekafka,
  SiClaude,
  SiDatadog,
  SiDocker,
  SiElasticsearch,
  SiExpress,
  SiFastapi,
  SiGithub,
  SiGithubactions,
  SiGooglegemini,
  SiKubernetes,
  SiMongodb,
  SiN8n,
  SiNestjs,
  SiNextdotjs,
  SiNodedotjs,
  SiOdoo,
  SiOpenjdk,
  SiPerplexity,
  SiPhp,
  SiPostgresql,
  SiPython,
  SiReact,
  SiScala,
  SiSentry,
  SiSonarqubeserver,
  SiSpring,
  SiSpringboot,
  SiTypescript,
} from '@icons-pack/react-simple-icons'
import {
  Bot,
  BrainCircuit,
  Bug,
  ChevronRight,
  Database,
  DatabaseZap,
  FunctionSquare,
  Ghost,
  Laptop,
  MessageCircle,
  Network,
  Plug,
  ShieldBan,
  Ship,
  Workflow,
} from 'lucide-react'

export type IconComponent = React.ComponentType<{ size?: number; className?: string }>

const SIMPLE_ICONS: Record<string, IconComponent> = {
  android: SiAndroid,
  angular: SiAngular,
  anthropic: SiAnthropic,
  apachekafka: SiApachekafka,
  claude: SiClaude,
  datadog: SiDatadog,
  docker: SiDocker,
  elasticsearch: SiElasticsearch,
  express: SiExpress,
  fastapi: SiFastapi,
  github: SiGithub,
  githubactions: SiGithubactions,
  googlegemini: SiGooglegemini,
  kubernetes: SiKubernetes,
  mongodb: SiMongodb,
  n8n: SiN8n,
  nestjs: SiNestjs,
  nextdotjs: SiNextdotjs,
  nodedotjs: SiNodedotjs,
  odoo: SiOdoo,
  openjdk: SiOpenjdk,
  perplexity: SiPerplexity,
  php: SiPhp,
  postgresql: SiPostgresql,
  python: SiPython,
  react: SiReact,
  scala: SiScala,
  sentry: SiSentry,
  sonarqubeserver: SiSonarqubeserver,
  spring: SiSpring,
  springboot: SiSpringboot,
  typescript: SiTypescript,
}

const LUCIDE_ICONS: Record<string, IconComponent> = {
  bot: Bot,
  'brain-circuit': BrainCircuit,
  bug: Bug,
  'chevron-right': ChevronRight,
  database: Database,
  'database-zap': DatabaseZap,
  'function-square': FunctionSquare,
  ghost: Ghost,
  laptop: Laptop,
  'message-circle': MessageCircle,
  network: Network,
  plug: Plug,
  'shield-ban': ShieldBan,
  ship: Ship,
  workflow: Workflow,
}

// Simple Icons a retiré le logo LinkedIn pour raisons de licence.
export function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.356V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.266 2.37 4.266 5.455v6.288zM5.337 7.433a2.062 2.062 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  )
}

export function resolveTagIcon(icon: string | null): IconComponent | null {
  if (!icon) return null
  const colonIdx = icon.indexOf(':')
  if (colonIdx === -1) return null
  const lib = icon.slice(0, colonIdx)
  const slug = icon.slice(colonIdx + 1)
  if (!slug) return null
  if (lib === 'simple-icons') return SIMPLE_ICONS[slug] ?? null
  if (lib === 'lucide') return LUCIDE_ICONS[slug] ?? null
  return null
}
