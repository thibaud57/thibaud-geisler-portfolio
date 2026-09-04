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
  SiGoogle,
  SiGooglecloud,
  SiGooglegemini,
  SiKubernetes,
  SiMongodb,
  SiN8n,
  SiNestjs,
  SiNextdotjs,
  SiNodedotjs,
  SiOdoo,
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
  Coffee,
  Database,
  DatabaseZap,
  Ghost,
  Laptop,
  MessageCircle,
  Network,
  Plug,
  ShieldBan,
  Ship,
  Sparkles,
  SquareFunction,
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
  google: SiGoogle,
  googlecloud: SiGooglecloud,
  googlegemini: SiGooglegemini,
  kubernetes: SiKubernetes,
  mongodb: SiMongodb,
  n8n: SiN8n,
  nestjs: SiNestjs,
  nextdotjs: SiNextdotjs,
  nodedotjs: SiNodedotjs,
  odoo: SiOdoo,
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
  coffee: Coffee,
  database: Database,
  'database-zap': DatabaseZap,
  ghost: Ghost,
  laptop: Laptop,
  'message-circle': MessageCircle,
  network: Network,
  plug: Plug,
  'shield-ban': ShieldBan,
  ship: Ship,
  sparkles: Sparkles,
  'square-function': SquareFunction,
  workflow: Workflow,
}

// Malt absent de Simple Icons : symbole du logo officiel (media kit Malt), en currentColor
// comme LinkedIn ci-dessous, pour suivre le thème comme le reste de la rangée d'icônes.
export function MaltIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="-2.5 2.6 42.63 42.63"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* La barre est affinée perpendiculairement (rotation à l'horizontale, compression,
          rotation inverse) : à 16 px elle écrasait les pétales et faisait une tache. */}
      <path
        transform="translate(18.9 23.84) rotate(-45) scale(1 0.62) rotate(45) translate(-18.9 -23.84)"
        d="M32.1993 10.5357C29.3591 7.69551 26.3252 9.53378 24.4265 11.4325L6.49014 29.3694C4.59144 31.2679 2.60411 34.1526 5.59336 37.1414C8.58262 40.1313 11.4673 38.1436 13.3656 36.2449L31.3023 18.3084C33.201 16.4095 35.0393 13.3755 32.1993 10.5357Z"
      />
      <path d="M15.0631 9.80108L18.8611 13.5989L22.727 9.73299C22.9894 9.46992 23.2559 9.22579 23.524 8.99555C23.1192 6.95303 21.9537 5.1065 18.8593 5.1065C15.759 5.1065 14.595 6.96028 14.1923 9.00723C14.4818 9.25761 14.7706 9.5086 15.0631 9.80108Z" />
      <path d="M22.7248 38.0122L18.8613 34.1486L15.0653 37.9442C14.7771 38.2326 14.4902 38.4961 14.2046 38.7436C14.6399 40.8258 15.8718 42.733 18.8597 42.733C21.8554 42.733 23.0857 40.8156 23.5182 38.7267C23.2525 38.4981 22.9866 38.2739 22.7248 38.0122Z" />
      <path d="M13.4522 19.0079H6.13018C3.44549 19.0079 0 19.8537 0 23.8699C0 26.8666 1.91804 28.0971 4.00729 28.5294C4.25465 28.2438 13.4522 19.0079 13.4522 19.0079Z" />
      <path d="M33.7268 19.2029C33.4951 19.4724 24.2782 28.7317 24.2782 28.7317H31.4963C34.1812 28.7317 37.6265 28.0973 37.6265 23.8699C37.6265 20.7701 35.7733 19.6054 33.7268 19.2029Z" />
      <path d="M15.8513 16.6044L17.1594 15.2963L13.3638 11.5002C11.4649 9.60166 8.5806 7.61413 5.59135 10.6034C3.39937 12.7954 3.88623 14.9287 5.04889 16.6606C5.40301 16.6345 15.8513 16.6044 15.8513 16.6044Z" />
      <path d="M21.8697 31.1351L20.5582 32.4467L24.4244 36.3126C26.3231 38.2115 29.3571 40.0493 32.1969 37.2095C34.316 35.0903 33.8297 32.8644 32.6582 31.0814C32.2811 31.1086 21.8697 31.1351 21.8697 31.1351Z" />
    </svg>
  )
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
