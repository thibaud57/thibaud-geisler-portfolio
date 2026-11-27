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
  SiFfmpeg,
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
  SiTelegram,
  SiTraefikproxy,
  SiTypescript,
} from "@icons-pack/react-simple-icons"
import {
  AudioWaveform,
  Bot,
  BrainCircuit,
  Bug,
  ChevronRight,
  Clapperboard,
  Coffee,
  Database,
  DatabaseZap,
  Film,
  Ghost,
  ImageIcon,
  Laptop,
  MessageCircle,
  Network,
  Plug,
  Scale,
  ScanSearch,
  ShieldBan,
  ShieldHalf,
  Ship,
  Sparkles,
  SquareFunction,
  UserRoundCheck,
  Workflow,
} from "lucide-react"

import { keysOf } from "@/lib/keys-of"

export type IconComponent = React.ComponentType<{ size?: number; className?: string }>

const TAG_ICONS = {
  "simple-icons:android": SiAndroid,
  "simple-icons:angular": SiAngular,
  "simple-icons:anthropic": SiAnthropic,
  "simple-icons:apachekafka": SiApachekafka,
  "simple-icons:claude": SiClaude,
  "simple-icons:datadog": SiDatadog,
  "simple-icons:docker": SiDocker,
  "simple-icons:elasticsearch": SiElasticsearch,
  "simple-icons:express": SiExpress,
  "simple-icons:fastapi": SiFastapi,
  "simple-icons:ffmpeg": SiFfmpeg,
  "simple-icons:github": SiGithub,
  "simple-icons:githubactions": SiGithubactions,
  "simple-icons:google": SiGoogle,
  "simple-icons:googlecloud": SiGooglecloud,
  "simple-icons:googlegemini": SiGooglegemini,
  "simple-icons:grafana": SiGrafana,
  "simple-icons:kubernetes": SiKubernetes,
  "simple-icons:modelcontextprotocol": SiModelcontextprotocol,
  "simple-icons:mongodb": SiMongodb,
  "simple-icons:n8n": SiN8n,
  "simple-icons:nestjs": SiNestjs,
  "simple-icons:nextdotjs": SiNextdotjs,
  "simple-icons:nodedotjs": SiNodedotjs,
  "simple-icons:odoo": SiOdoo,
  "simple-icons:openrouter": SiOpenrouter,
  "simple-icons:perplexity": SiPerplexity,
  "simple-icons:php": SiPhp,
  "simple-icons:postgresql": SiPostgresql,
  "simple-icons:pydantic": SiPydantic,
  "simple-icons:python": SiPython,
  "simple-icons:qdrant": SiQdrant,
  "simple-icons:react": SiReact,
  "simple-icons:scala": SiScala,
  "simple-icons:sentry": SiSentry,
  "simple-icons:sonarqubeserver": SiSonarqubeserver,
  "simple-icons:spring": SiSpring,
  "simple-icons:springboot": SiSpringboot,
  "simple-icons:tauri": SiTauri,
  "simple-icons:telegram": SiTelegram,
  "simple-icons:traefikproxy": SiTraefikproxy,
  "simple-icons:typescript": SiTypescript,
  "lucide:audio-waveform": AudioWaveform,
  "lucide:bot": Bot,
  "lucide:brain-circuit": BrainCircuit,
  "lucide:bug": Bug,
  "lucide:chevron-right": ChevronRight,
  "lucide:clapperboard": Clapperboard,
  "lucide:coffee": Coffee,
  "lucide:database": Database,
  "lucide:database-zap": DatabaseZap,
  "lucide:film": Film,
  "lucide:ghost": Ghost,
  "lucide:image": ImageIcon,
  "lucide:laptop": Laptop,
  "lucide:message-circle": MessageCircle,
  "lucide:network": Network,
  "lucide:plug": Plug,
  "lucide:scale": Scale,
  "lucide:scan-search": ScanSearch,
  "lucide:shield-ban": ShieldBan,
  "lucide:shield-half": ShieldHalf,
  "lucide:ship": Ship,
  "lucide:sparkles": Sparkles,
  "lucide:square-function": SquareFunction,
  "lucide:user-round-check": UserRoundCheck,
  "lucide:workflow": Workflow,
  "custom:langfuse": LangfuseIcon,
  "custom:remotion": RemotionIcon,
} as const satisfies Record<string, IconComponent>

export type TagIconKey = keyof typeof TAG_ICONS

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

// Absent de Simple Icons : icône monochrome officielle de la page de marque Langfuse (langfuse.com/brand).
function LangfuseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 512 512"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M318.645 135.713C324.19 134.927 335.859 136.439 341.271 138.266C357.915 143.886 373.708 155.313 386.944 166.742C390.717 170.001 394.121 173.741 397.477 177.267C403.722 172.469 410.688 166.353 416.534 161.128C420.699 157.403 426.139 152.467 430.026 148.462C432.443 151.311 437.916 156.283 440.769 159.135C443.789 162.156 448.423 167.097 451.5 169.763C449.402 171.778 447.447 173.915 445.275 175.969C435.518 185.19 425.314 193.924 414.699 202.142C416.131 206.071 418.146 209.973 419.706 214.37C430.353 244.871 428.629 278.335 414.908 307.579C419.795 310.665 426.215 315.536 430.819 319.022C437.477 324.065 444.53 329.464 450.667 335.103C448.921 337.113 447.252 339.188 445.487 341.185C440.687 346.619 435.313 352.246 430.732 357.836C427.49 354.691 422.914 351.171 419.367 348.395C412.435 342.887 405.296 337.649 397.965 332.687C385.625 346.319 365.124 362.891 348.068 370.251C342.596 372.66 336.808 374.279 330.882 375.064C302.031 378.828 277.622 361.934 255.928 345.279C252.583 348.26 247.732 351.864 244.093 354.533C229.07 365.547 212.408 375.109 193.414 376.34C191.874 376.511 189.464 376.521 187.906 376.48C181.035 376.28 174.239 374.992 167.77 372.666C160.959 370.213 156.624 367.662 150.563 364.002C136.762 355.669 126.116 347.071 115.035 335.379C112.216 337.285 108.693 340.189 106.015 342.334C97.6272 349.096 89.5081 356.186 81.6766 363.588C75.4441 356.739 67.1357 348.545 60.5 341.889C65.3867 337.837 70.0365 332.931 75.0089 328.771C82.5137 322.495 89.7878 316.218 97.7676 310.514C96.259 307.413 94.477 303.658 93.2329 300.425C84.1343 276.778 83.1019 248.442 89.5507 223.953C91.4597 216.704 93.7938 211.293 96.7651 204.579C85.0205 196.793 71.6203 185.95 61.0223 176.738C67.4755 169.509 75.0828 161.522 81.2234 154.18C91.5695 163.24 102.421 171.705 113.725 179.534L113.802 179.43C115.004 177.825 117.411 175.371 118.839 173.917C128.242 164.342 139.107 156.117 150.461 149.002C154.334 146.575 158.028 144.265 162.19 142.334C167.97 139.624 174.121 137.789 180.44 136.891C210.216 132.858 233.606 150.368 255.762 167.202C258.762 164.539 264.323 160.312 267.535 157.949C283.73 146.037 298.243 137.367 318.645 135.713ZM218.248 317.376C206.132 309.795 193.482 303.647 178.778 304.192C164.821 305.027 152.411 311.148 140.526 318.189C146.179 324.001 153.002 329.474 159.774 333.99C168.428 339.762 177.876 346.066 188.622 346.218C189.974 346.237 191.326 346.175 192.671 346.034C203.988 344.75 216.171 337.48 225.147 330.827C226.887 329.537 229.514 327.7 231.115 326.319C227.291 323.216 222.446 320.002 218.248 317.376ZM371.741 316.575C358.979 309.931 341.321 301.687 326.711 303.34C311.052 304.592 296.858 313.6 284.385 322.596C283.031 323.573 281.725 324.597 280.508 325.746C288.772 332.599 303.008 341.451 313.363 344.113C317.33 345.167 321.449 345.538 325.543 345.211C328.331 344.867 331.96 344.176 334.525 343.039C347.004 337.499 362.29 326.174 371.741 316.575ZM255.812 206.33C237.456 220.819 219.789 233.787 196.191 238.412C169.477 243.646 145.637 233.457 122.679 220.934C113.944 240.121 113.528 268.308 120.906 288.014C121.574 289.812 122.3 291.588 123.082 293.34C146.169 279.069 171.93 269.159 199.388 276.14C219.572 281.272 237.634 292.985 254.053 305.524C254.867 306.146 255.186 306.717 256.11 306.276C278.685 287.401 307.351 270.114 337.691 273.233C355.593 275.072 373.509 283.016 389.103 291.635C390.849 287.216 392.45 283.09 393.56 278.437C398.085 259.475 396.981 238.05 389.47 220.018C383.257 223.589 376.51 227.596 369.945 230.53C350.207 239.353 331.482 242.628 310.265 236.779C293.962 232.284 280.778 224.155 267.135 214.546C265.743 213.566 256.639 206.288 255.812 206.33ZM231.563 186.81C218.569 176.952 202.985 165.548 185.98 166.721C182.759 167.106 178.545 168.087 175.654 169.518C164.876 174.849 147.642 186.944 139.853 195.777C148.947 200.835 158.643 205.167 168.7 207.892C174.445 209.448 180.011 209.765 185.929 209.303C201.698 207.877 219.405 196.835 231.563 186.81ZM321.91 165.701C313.482 166.157 305.902 169.192 298.763 173.559C292.309 177.508 286.018 181.624 280.188 186.46C294.39 197.487 312.553 209.177 330.955 209.414C346.475 209.234 359.256 202.585 372.307 194.769C366.402 187.14 354.741 179.907 346.693 174.55C339.178 169.549 331.17 165.476 321.91 165.701Z"
      />
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

export function isTagIconKey(value: string): value is TagIconKey {
  return Object.hasOwn(TAG_ICONS, value)
}

export function resolveTagIcon(icon: string | null): IconComponent | null {
  return icon !== null && isTagIconKey(icon) ? TAG_ICONS[icon] : null
}

export function TagIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = resolveTagIcon(icon)
  // eslint-disable-next-line react-hooks/static-components -- lookup par clé dans des registres immuables, aucun composant créé au rendu
  return Icon ? <Icon className={className} aria-hidden /> : null
}

export const TAG_ICON_KEYS: readonly TagIconKey[] = keysOf(TAG_ICONS).sort()
