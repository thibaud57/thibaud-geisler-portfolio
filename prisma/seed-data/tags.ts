import type { TagKind } from '@/generated/prisma/client'

export type TagInput = {
  slug: string
  nameFr: string
  nameEn: string
  kind: TagKind
  icon: string | null
}

export const tags: TagInput[] = [
  // === LANGUAGE (5) ===
  { slug: 'typescript', nameFr: 'TypeScript', nameEn: 'TypeScript', kind: 'LANGUAGE', icon: 'simple-icons:typescript' },
  { slug: 'scala', nameFr: 'Scala', nameEn: 'Scala', kind: 'LANGUAGE', icon: 'simple-icons:scala' },
  { slug: 'java', nameFr: 'Java', nameEn: 'Java', kind: 'LANGUAGE', icon: 'simple-icons:openjdk' },
  { slug: 'python', nameFr: 'Python', nameEn: 'Python', kind: 'LANGUAGE', icon: 'simple-icons:python' },
  { slug: 'php', nameFr: 'PHP', nameEn: 'PHP', kind: 'LANGUAGE', icon: 'simple-icons:php' },

  // === FRAMEWORK (11) ===
  { slug: 'nextjs', nameFr: 'Next.js', nameEn: 'Next.js', kind: 'FRAMEWORK', icon: 'simple-icons:nextdotjs' },
  { slug: 'react', nameFr: 'React', nameEn: 'React', kind: 'FRAMEWORK', icon: 'simple-icons:react' },
  { slug: 'nodejs', nameFr: 'Node.js', nameEn: 'Node.js', kind: 'FRAMEWORK', icon: 'simple-icons:nodedotjs' },
  { slug: 'nestjs', nameFr: 'NestJS', nameEn: 'NestJS', kind: 'FRAMEWORK', icon: 'simple-icons:nestjs' },
  { slug: 'angular', nameFr: 'Angular', nameEn: 'Angular', kind: 'FRAMEWORK', icon: 'simple-icons:angular' },
  { slug: 'fastapi', nameFr: 'FastAPI', nameEn: 'FastAPI', kind: 'FRAMEWORK', icon: 'simple-icons:fastapi' },
  { slug: 'spring-boot', nameFr: 'Spring Boot', nameEn: 'Spring Boot', kind: 'FRAMEWORK', icon: 'simple-icons:springboot' },
  { slug: 'spring', nameFr: 'Spring', nameEn: 'Spring', kind: 'FRAMEWORK', icon: 'simple-icons:spring' },
  { slug: 'play', nameFr: 'Play', nameEn: 'Play', kind: 'FRAMEWORK', icon: 'lucide:chevron-right' },
  { slug: 'android', nameFr: 'Android', nameEn: 'Android', kind: 'FRAMEWORK', icon: 'simple-icons:android' },
  { slug: 'odoo', nameFr: 'Odoo', nameEn: 'Odoo', kind: 'FRAMEWORK', icon: 'simple-icons:odoo' },

  // === DATABASE (2) ===
  { slug: 'postgresql', nameFr: 'PostgreSQL', nameEn: 'PostgreSQL', kind: 'DATABASE', icon: 'simple-icons:postgresql' },
  { slug: 'mongodb', nameFr: 'MongoDB', nameEn: 'MongoDB', kind: 'DATABASE', icon: 'simple-icons:mongodb' },

  // === AI (5) ===
  { slug: 'anthropic', nameFr: 'Claude (Anthropic)', nameEn: 'Claude (Anthropic)', kind: 'AI', icon: 'simple-icons:anthropic' },
  { slug: 'openai', nameFr: 'ChatGPT (OpenAI)', nameEn: 'ChatGPT (OpenAI)', kind: 'AI', icon: 'simple-icons:openai' },
  { slug: 'n8n', nameFr: 'n8n', nameEn: 'n8n', kind: 'AI', icon: 'simple-icons:n8n' },
  { slug: 'perplexity', nameFr: 'Perplexity', nameEn: 'Perplexity', kind: 'AI', icon: 'simple-icons:perplexity' },
  { slug: 'piagent', nameFr: 'PiAgent', nameEn: 'PiAgent', kind: 'AI', icon: 'lucide:bot' },

  // === INFRA (10) ===
  { slug: 'docker', nameFr: 'Docker', nameEn: 'Docker', kind: 'INFRA', icon: 'simple-icons:docker' },
  { slug: 'github-actions', nameFr: 'GitHub Actions', nameEn: 'GitHub Actions', kind: 'INFRA', icon: 'simple-icons:githubactions' },
  { slug: 'kubernetes', nameFr: 'Kubernetes', nameEn: 'Kubernetes', kind: 'INFRA', icon: 'simple-icons:kubernetes' },
  { slug: 'dokploy', nameFr: 'Dokploy', nameEn: 'Dokploy', kind: 'INFRA', icon: 'lucide:ship' },
  { slug: 'vercel', nameFr: 'Vercel', nameEn: 'Vercel', kind: 'INFRA', icon: 'simple-icons:vercel' },
  { slug: 'kafka', nameFr: 'Kafka', nameEn: 'Kafka', kind: 'INFRA', icon: 'simple-icons:apachekafka' },
  { slug: 'sentry', nameFr: 'Sentry', nameEn: 'Sentry', kind: 'INFRA', icon: 'simple-icons:sentry' },
  { slug: 'datadog', nameFr: 'Datadog', nameEn: 'Datadog', kind: 'INFRA', icon: 'simple-icons:datadog' },
  { slug: 'sonarqube', nameFr: 'SonarQube', nameEn: 'SonarQube', kind: 'INFRA', icon: 'simple-icons:sonarqube' },
  { slug: 'local', nameFr: 'Local', nameEn: 'Local', kind: 'INFRA', icon: 'lucide:monitor' },

  // === EXPERTISE (8) ===
  { slug: 'scraping', nameFr: 'Scraping', nameEn: 'Scraping', kind: 'EXPERTISE', icon: 'lucide:bug' },
  { slug: 'anti-bot', nameFr: 'Anti-bot', nameEn: 'Anti-bot', kind: 'EXPERTISE', icon: 'lucide:shield-ban' },
  { slug: 'anonymisation', nameFr: 'Anonymisation', nameEn: 'Anonymization', kind: 'EXPERTISE', icon: 'lucide:ghost' },
  { slug: 'rag', nameFr: 'RAG', nameEn: 'RAG', kind: 'EXPERTISE', icon: 'lucide:database' },
  { slug: 'mcp', nameFr: 'MCP', nameEn: 'MCP', kind: 'EXPERTISE', icon: 'lucide:plug' },
  { slug: 'agents-ia', nameFr: 'Agents IA', nameEn: 'AI Agents', kind: 'EXPERTISE', icon: 'lucide:brain-circuit' },
  { slug: 'skills', nameFr: 'Skills', nameEn: 'Skills', kind: 'EXPERTISE', icon: 'lucide:sparkles' },
  { slug: 'automatisation', nameFr: 'Automatisation', nameEn: 'Automation', kind: 'EXPERTISE', icon: 'lucide:workflow' },
]
