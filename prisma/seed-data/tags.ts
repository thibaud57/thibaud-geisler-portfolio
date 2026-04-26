import type { TagKind } from '@/generated/prisma/client'

export type TagInput = {
  slug: string
  nameFr: string
  nameEn: string
  kind: TagKind
  icon: string | null
  displayOrder: number
}

export const tags: TagInput[] = [
  // === LANGUAGE (5) ===
  { slug: 'typescript', nameFr: 'TypeScript', nameEn: 'TypeScript', kind: 'LANGUAGE', icon: 'simple-icons:typescript', displayOrder: 0 },
  { slug: 'scala', nameFr: 'Scala', nameEn: 'Scala', kind: 'LANGUAGE', icon: 'simple-icons:scala', displayOrder: 1 },
  { slug: 'python', nameFr: 'Python', nameEn: 'Python', kind: 'LANGUAGE', icon: 'simple-icons:python', displayOrder: 2 },
  { slug: 'java', nameFr: 'Java', nameEn: 'Java', kind: 'LANGUAGE', icon: 'simple-icons:openjdk', displayOrder: 3 },
  { slug: 'php', nameFr: 'PHP', nameEn: 'PHP', kind: 'LANGUAGE', icon: 'simple-icons:php', displayOrder: 4 },

  // === FRAMEWORK (12) ===
  { slug: 'angular', nameFr: 'Angular', nameEn: 'Angular', kind: 'FRAMEWORK', icon: 'simple-icons:angular', displayOrder: 0 },
  { slug: 'play', nameFr: 'Play', nameEn: 'Play', kind: 'FRAMEWORK', icon: 'lucide:chevron-right', displayOrder: 1 },
  { slug: 'nodejs', nameFr: 'Node.js', nameEn: 'Node.js', kind: 'FRAMEWORK', icon: 'simple-icons:nodedotjs', displayOrder: 2 },
  { slug: 'express', nameFr: 'Express', nameEn: 'Express', kind: 'FRAMEWORK', icon: 'simple-icons:express', displayOrder: 3 },
  { slug: 'nestjs', nameFr: 'NestJS', nameEn: 'NestJS', kind: 'FRAMEWORK', icon: 'simple-icons:nestjs', displayOrder: 4 },
  { slug: 'react', nameFr: 'React', nameEn: 'React', kind: 'FRAMEWORK', icon: 'simple-icons:react', displayOrder: 5 },
  { slug: 'nextjs', nameFr: 'Next.js', nameEn: 'Next.js', kind: 'FRAMEWORK', icon: 'simple-icons:nextdotjs', displayOrder: 6 },
  { slug: 'fastapi', nameFr: 'FastAPI', nameEn: 'FastAPI', kind: 'FRAMEWORK', icon: 'simple-icons:fastapi', displayOrder: 7 },
  { slug: 'spring', nameFr: 'Spring', nameEn: 'Spring', kind: 'FRAMEWORK', icon: 'simple-icons:spring', displayOrder: 8 },
  { slug: 'spring-boot', nameFr: 'Spring Boot', nameEn: 'Spring Boot', kind: 'FRAMEWORK', icon: 'simple-icons:springboot', displayOrder: 9 },
  { slug: 'android', nameFr: 'Android', nameEn: 'Android', kind: 'FRAMEWORK', icon: 'simple-icons:android', displayOrder: 10 },
  { slug: 'odoo', nameFr: 'Odoo', nameEn: 'Odoo', kind: 'FRAMEWORK', icon: 'simple-icons:odoo', displayOrder: 11 },

  // === DATABASE (2) ===
  { slug: 'mongodb', nameFr: 'MongoDB', nameEn: 'MongoDB', kind: 'DATABASE', icon: 'simple-icons:mongodb', displayOrder: 0 },
  { slug: 'postgresql', nameFr: 'PostgreSQL', nameEn: 'PostgreSQL', kind: 'DATABASE', icon: 'simple-icons:postgresql', displayOrder: 1 },

  // === AI (8) ===
  { slug: 'n8n', nameFr: 'n8n', nameEn: 'n8n', kind: 'AI', icon: 'simple-icons:n8n', displayOrder: 0 },
  { slug: 'rag', nameFr: 'RAG', nameEn: 'RAG', kind: 'AI', icon: 'lucide:database', displayOrder: 1 },
  { slug: 'mcp', nameFr: 'MCP', nameEn: 'MCP', kind: 'AI', icon: 'lucide:plug', displayOrder: 2 },
  { slug: 'skills', nameFr: 'Skills', nameEn: 'Skills', kind: 'AI', icon: 'simple-icons:anthropic', displayOrder: 3 },
  { slug: 'anthropic', nameFr: 'Claude', nameEn: 'Claude', kind: 'AI', icon: 'simple-icons:claude', displayOrder: 4 },
  { slug: 'openai', nameFr: 'ChatGPT', nameEn: 'ChatGPT', kind: 'AI', icon: 'lucide:message-circle', displayOrder: 5 },
  { slug: 'perplexity', nameFr: 'Perplexity', nameEn: 'Perplexity', kind: 'AI', icon: 'simple-icons:perplexity', displayOrder: 6 },
  { slug: 'piagent', nameFr: 'PiAgent', nameEn: 'PiAgent', kind: 'AI', icon: 'lucide:bot', displayOrder: 7 },

  // === INFRA (11) ===
  { slug: 'kafka', nameFr: 'Kafka', nameEn: 'Kafka', kind: 'INFRA', icon: 'simple-icons:apachekafka', displayOrder: 0 },
  { slug: 'docker', nameFr: 'Docker', nameEn: 'Docker', kind: 'INFRA', icon: 'simple-icons:docker', displayOrder: 1 },
  { slug: 'kubernetes', nameFr: 'Kubernetes', nameEn: 'Kubernetes', kind: 'INFRA', icon: 'simple-icons:kubernetes', displayOrder: 2 },
  { slug: 'dokploy', nameFr: 'Dokploy', nameEn: 'Dokploy', kind: 'INFRA', icon: 'lucide:ship', displayOrder: 3 },
  { slug: 'github-actions', nameFr: 'GitHub Actions', nameEn: 'GitHub Actions', kind: 'INFRA', icon: 'simple-icons:githubactions', displayOrder: 4 },
  { slug: 'datadog', nameFr: 'Datadog', nameEn: 'Datadog', kind: 'INFRA', icon: 'simple-icons:datadog', displayOrder: 5 },
  { slug: 'elasticsearch', nameFr: 'Elasticsearch', nameEn: 'Elasticsearch', kind: 'INFRA', icon: 'simple-icons:elasticsearch', displayOrder: 6 },
  { slug: 'sentry', nameFr: 'Sentry', nameEn: 'Sentry', kind: 'INFRA', icon: 'simple-icons:sentry', displayOrder: 7 },
  { slug: 'sonarqube', nameFr: 'SonarQube', nameEn: 'SonarQube', kind: 'INFRA', icon: 'simple-icons:sonarqubeserver', displayOrder: 8 },
  { slug: 'local', nameFr: 'Local', nameEn: 'Local', kind: 'INFRA', icon: 'lucide:monitor', displayOrder: 9 },
  { slug: 'vercel', nameFr: 'Vercel', nameEn: 'Vercel', kind: 'INFRA', icon: 'simple-icons:vercel', displayOrder: 10 },

  // === EXPERTISE (6) ===
  { slug: 'agents-ia', nameFr: 'Agents IA', nameEn: 'AI Agents', kind: 'EXPERTISE', icon: 'lucide:brain-circuit', displayOrder: 0 },
  { slug: 'automatisation', nameFr: 'Automatisation', nameEn: 'Automation', kind: 'EXPERTISE', icon: 'lucide:workflow', displayOrder: 1 },
  { slug: 'developpement-fullstack', nameFr: 'Développement Full-Stack', nameEn: 'Full-Stack Development', kind: 'EXPERTISE', icon: 'lucide:laptop', displayOrder: 2 },
  { slug: 'scraping', nameFr: 'Scraping', nameEn: 'Scraping', kind: 'EXPERTISE', icon: 'lucide:bug', displayOrder: 3 },
  { slug: 'anonymisation', nameFr: 'Anonymisation', nameEn: 'Anonymization', kind: 'EXPERTISE', icon: 'lucide:ghost', displayOrder: 4 },
  { slug: 'anti-bot', nameFr: 'Anti-bot', nameEn: 'Anti-bot', kind: 'EXPERTISE', icon: 'lucide:shield-ban', displayOrder: 5 },
]
