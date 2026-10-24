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
  SiGrafana,
  SiKubernetes,
  SiModelcontextprotocol,
  SiMongodb,
  SiN8n,
  SiNestjs,
  SiNextdotjs,
  SiNodedotjs,
  SiOdoo,
  SiOpenrouter,
  SiPerplexity,
  SiPhp,
  SiPostgresql,
  SiPydantic,
  SiPython,
  SiQdrant,
  SiReact,
  SiScala,
  SiSentry,
  SiSonarqubeserver,
  SiSpring,
  SiSpringboot,
  SiTauri,
  SiTraefikproxy,
  SiTypescript,
} from "@icons-pack/react-simple-icons"
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
} from "lucide-react"

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
  grafana: SiGrafana,
  kubernetes: SiKubernetes,
  modelcontextprotocol: SiModelcontextprotocol,
  mongodb: SiMongodb,
  n8n: SiN8n,
  nestjs: SiNestjs,
  nextdotjs: SiNextdotjs,
  nodedotjs: SiNodedotjs,
  odoo: SiOdoo,
  openrouter: SiOpenrouter,
  perplexity: SiPerplexity,
  php: SiPhp,
  postgresql: SiPostgresql,
  pydantic: SiPydantic,
  python: SiPython,
  qdrant: SiQdrant,
  react: SiReact,
  scala: SiScala,
  sentry: SiSentry,
  sonarqubeserver: SiSonarqubeserver,
  spring: SiSpring,
  springboot: SiSpringboot,
  tauri: SiTauri,
  traefikproxy: SiTraefikproxy,
  typescript: SiTypescript,
}

const LUCIDE_ICONS: Record<string, IconComponent> = {
  bot: Bot,
  "brain-circuit": BrainCircuit,
  bug: Bug,
  "chevron-right": ChevronRight,
  coffee: Coffee,
  database: Database,
  "database-zap": DatabaseZap,
  ghost: Ghost,
  laptop: Laptop,
  "message-circle": MessageCircle,
  network: Network,
  plug: Plug,
  "shield-ban": ShieldBan,
  ship: Ship,
  sparkles: Sparkles,
  "square-function": SquareFunction,
  workflow: Workflow,
}

const CUSTOM_ICONS: Record<string, IconComponent> = {
  remotion: RemotionIcon,
}

// Malt absent de Simple Icons : symbole du logo officiel (media kit Malt), en currentColor
// comme LinkedIn ci-dessous, pour suivre le thème comme le reste de la rangée d'icônes.
export function MaltIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-2.5 2.6 42.63 42.63"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
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
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.356V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.266 2.37 4.266 5.455v6.288zM5.337 7.433a2.062 2.062 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  )
}

// Absent de Simple Icons : logo officiel du dépôt remotion-dev/brand.
function RemotionIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 410 425"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillOpacity="0.2"
        d="M116.44 45.697C109.454 46.0762 103.824 47.1846 98.1503 49.3432C95.3208 50.4079 90.6828 52.7269 88.1304 54.3313C77.4543 61.0258 69.3159 71.0894 65.0717 82.8011C64.2257 85.1201 61.9359 92.5146 60.4628 97.6048C50.6472 131.631 45.0757 168.838 43.8798 208.217C43.6901 214.488 43.6901 229.423 43.8798 235.593C44.6819 261.7 47.1759 285.269 51.6973 309.305C53.535 319.033 56.4811 332.101 58.1876 338.037C61.6734 350.099 68.7908 360.367 78.9128 367.893C85.6948 372.939 93.3956 376.323 101.928 377.986C106.041 378.788 111.466 379.152 115.463 378.89C120.99 378.525 131.958 377.052 140.87 375.462C181.036 368.301 218.141 355.481 251.788 337.133C273.097 325.509 291.313 312.922 308.888 297.652C326.405 282.454 341.34 266.105 354.481 247.757C357.529 243.512 359.06 241.033 360.592 237.912C364.53 229.861 366.382 221.854 366.367 212.899C366.367 204.556 364.792 197.147 361.394 189.563C359.76 185.902 358.2 183.277 354.699 178.289C341.806 159.926 327.498 143.927 310.055 128.379C283.014 104.285 250.898 84.5221 215.034 69.8934C207.26 66.7285 199.603 63.9427 190.385 60.9237C170.871 54.55 146.718 49.0224 126.285 46.2658C123.076 45.8282 118.715 45.5803 116.44 45.697Z"
      />
      <path
        fillOpacity="0.1"
        d="M92.3905 0.603638C83.5124 1.08554 76.358 2.49417 69.1481 5.2373C65.5523 6.59033 59.6583 9.53735 56.4148 11.5762C42.8474 20.0836 32.5051 32.8724 27.1115 47.7558C26.0365 50.7028 23.1266 60.0998 21.2546 66.5684C8.78078 109.81 1.70055 157.092 0.180713 207.135C-0.0602375 215.105 -0.0602375 234.084 0.180713 241.925C1.20012 275.102 4.36954 305.053 10.1153 335.599C12.4506 347.961 16.1946 364.568 18.3632 372.112C22.793 387.44 31.8379 400.488 44.7009 410.052C53.3195 416.465 63.1058 420.765 73.9485 422.878C79.1753 423.897 86.0702 424.361 91.1487 424.027C98.1733 423.564 112.111 421.692 123.436 419.672C174.48 410.571 221.632 394.279 264.392 370.963C291.471 356.19 314.621 340.195 336.955 320.789C359.215 301.476 378.194 280.699 394.894 257.382C398.768 251.989 400.714 248.838 402.66 244.872C407.665 234.64 410.018 224.465 410 213.085C410 202.483 407.998 193.067 403.68 183.429C401.604 178.777 399.62 175.441 395.172 169.102C378.788 145.767 360.605 125.434 338.438 105.676C304.074 75.0573 263.261 49.9428 217.685 31.3526C207.806 27.3306 198.075 23.7905 186.361 19.9538C161.562 11.8542 130.868 4.82956 104.901 1.32651C100.824 0.770477 95.2819 0.455353 92.3905 0.603638Z"
      />
      <path d="M141.332 92.4681C136.307 92.7408 132.259 93.5379 128.179 95.0902C126.144 95.8559 122.809 97.5236 120.973 98.6774C113.295 103.492 107.443 110.729 104.391 119.151C103.782 120.819 102.136 126.137 101.076 129.797C94.0174 154.267 90.0107 181.023 89.1506 209.343C89.0143 213.853 89.0143 224.593 89.1506 229.03C89.7275 247.804 91.5211 264.754 94.7725 282.039C96.0941 289.035 98.2128 298.433 99.44 302.702C101.947 311.376 107.065 318.76 114.344 324.172C119.221 327.801 124.759 330.235 130.895 331.43C133.853 332.007 137.755 332.269 140.629 332.081C144.604 331.818 152.491 330.759 158.9 329.616C187.786 324.466 214.469 315.246 238.666 302.052C253.99 293.692 267.09 284.641 279.729 273.659C292.326 262.73 303.066 250.972 312.516 237.777C314.708 234.725 315.81 232.942 316.911 230.698C319.743 224.908 321.075 219.15 321.064 212.71C321.064 206.71 319.932 201.382 317.488 195.928C316.313 193.295 315.191 191.407 312.674 187.82C303.402 174.615 293.112 163.109 280.568 151.928C261.122 134.601 238.026 120.389 212.235 109.869C206.644 107.593 201.138 105.589 194.509 103.418C180.475 98.8347 163.106 94.8595 148.411 92.8771C146.104 92.5625 142.968 92.3842 141.332 92.4681Z" />
    </svg>
  )
}

export function resolveTagIcon(icon: string | null): IconComponent | null {
  if (!icon) return null
  const colonIdx = icon.indexOf(":")
  if (colonIdx === -1) return null
  const lib = icon.slice(0, colonIdx)
  const slug = icon.slice(colonIdx + 1)
  if (!slug) return null
  if (lib === "simple-icons") return SIMPLE_ICONS[slug] ?? null
  if (lib === "lucide") return LUCIDE_ICONS[slug] ?? null
  if (lib === "custom") return CUSTOM_ICONS[slug] ?? null
  return null
}

export function TagIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = resolveTagIcon(icon)
  // eslint-disable-next-line react-hooks/static-components -- lookup par clé dans des registres immuables, aucun composant créé au rendu
  return Icon ? <Icon className={className} aria-hidden /> : null
}

export const TAG_ICON_KEYS: readonly string[] = [
  ...Object.keys(SIMPLE_ICONS).map((slug) => `simple-icons:${slug}`),
  ...Object.keys(LUCIDE_ICONS).map((slug) => `lucide:${slug}`),
  ...Object.keys(CUSTOM_ICONS).map((slug) => `custom:${slug}`),
].sort()
