import { JobRole } from "@/generated/prisma/browser"

export const JOB_ROLES = Object.values(JobRole)

export const JOB_ROLE_LABELS: Record<JobRole, string> = {
  CTO: "CTO",
  TECH_LEAD: "Tech Lead",
  RECRUTEUR: "Recruteur",
  DEVELOPPEUR: "Développeur",
  CEO: "CEO",
  PRODUCT_OWNER: "Product Owner",
  C_LEVEL: "C-Level",
  MANAGER: "Manager",
  AUTRE: "Autre",
}
