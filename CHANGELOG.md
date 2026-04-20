# Changelog

## [0.2.0](https://github.com/thibaud57/thibaud-geisler-portfolio/compare/v0.1.0...v0.2.0) (2026-04-20)


### Features

* **i18n:** add AppConfig augmentation and align localePrefix with spec ([312e4ce](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/312e4cef2460282fe687178ccb9e0d9374409063))
* **i18n:** add country flag icons to LanguageSwitcher ([f48bb03](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/f48bb036b491d66a2e70c3c7f2cd05e3b2a1d30c))
* **i18n:** add locale detection proxy with next-intl middleware ([29ea57b](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/29ea57b81697403f9804e0ce16bcb7d6014fbace))
* **i18n:** wire FR/EN translations for public pages and state screens ([0311b12](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/0311b125253da7eb0bf44b34361a4e6893ed4762))
* **i18n:** wire LanguageSwitcher with localized router and typed locales ([010bc7d](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/010bc7d89cc8d65d2369c8bcf5690bcf67e0676d))
* **seo:** add localized metadata, hreflang alternates and multilingual sitemap ([c656f04](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/c656f045cfa18fe686fd0113f5e141896a624b4f))


### Bug Fixes

* **ci:** add predicate-quantifier=every to paths-filter for proper exclusions ([cd24a44](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/cd24a44b03d25d73dd4f97ae7b19635d9d49e91c))
* **ci:** add pull-requests:read permission for paths-filter API access ([058759e](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/058759e9c86daf82cf88d40d0f7d48bdf4c78214))
* **ci:** add timeout-minutes on changes + ci aggregator jobs ([32125f6](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/32125f63b5810eac3cb0e0694ae6ded202ab8f94))
* **ci:** aggregator also fails if changes detection job fails ([e6204f8](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/e6204f8d5578f690a60d091f29e87a6edb24511f))
* **ci:** refactor with paths-filter + ci aggregator job ([11a4036](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/11a4036ea7f11f265fc14b246fa3e84ed653e3ba))
* **ci:** rename test job to quality (lint + typecheck + test + build + audit) ([f4627f9](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/f4627f99a2aae7cab677996c50dba5cf20fdd8d6))
* **ci:** skip runs on doc-only changes ([36decca](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/36decca587fc762d999c84e17a93642c44e0b8e4))
* **ci:** skip runs on doc-only changes (md, docs/, .claude/) ([42ad21e](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/42ad21e58c06313c6237519065ffe387becccf8d))
* **i18n:** align LanguageSwitcher flag type with country-flag-icons ([2a6c788](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/2a6c7880bb301228f9a60d38d30d2cece79d9a00))
* **i18n:** localize global-error via URL-based locale detection ([59ea56f](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/59ea56f6d2944cd26a934d4a17375f44ef6ddf25))
* **theme:** silence React 19 script tag warning from next-themes ([f908b46](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/f908b4686e6d9819b4d743a049194754dd46a39d))
* **ui:** restore cursor pointer on interactive elements after Tailwind v4 ([2733d93](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/2733d93392062f5a8fde92bd589d05f05f168946))

## 0.1.0 (2026-04-18)


### Features

* **automation:** Claude Code skills + rules + SessionStart hook + CLAUDE.md ([27db703](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/27db703bf00c0874cf5a198c0cf5f21b2fad48c9))
* bootstrap initial Next.js 16 + Prisma 7 portfolio ([6d5b9b3](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/6d5b9b3f9c390a3f3835621bca6c99e21220cf54))
* **ci:** GitHub Actions CI + Dependabot + release-please ([c1d2401](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/c1d240170fb0aac3061d3c22e83ac7af1066e13f))
* **db:** Prisma 7 + PostgreSQL 18 + schema skeleton ([1cbdc6c](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/1cbdc6c27c8589f4fe25379d1b67aa644848598c))
* **design:** shadcn/ui Nova preset + 12 primitives + Magic UI / Aceternity registries ([ffd55c5](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/ffd55c5104640444fefa0b425bd5606228fb713e))
* **i18n:** next-intl 4 FR/EN with proxy middleware + locale guard helper ([b6a83c5](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/b6a83c58cdf599325820eeb1d1481f47d816d041))
* **infra:** Docker Compose + Dockerfile multi-stage + Justfile ([00b74c7](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/00b74c7c24c444e69bd94524c5abb2fe64f01b8b))
* **layout:** layout components + providers + public and technique pages ([359df3f](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/359df3f2d49951b72f1afe022803b5c7995fad04))
* scaffolding Next.js 16 + TypeScript strict + App Router ([c39af85](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/c39af8541a946c5fc63e4ce2ec061d8b516e453a))
* **stack:** Pino 10 logger with redact + instrumentation bootstrap ([d511867](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/d5118677194da12d284d7f021b25e4fd84a19711))
* **tests:** Vitest 4 + Testing Library + health endpoint unit test ([f5b893a](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/f5b893ac63c7cd130fa6faa893a5246dd30f7ae7))


### Bug Fixes

* **ci:** group concurrency by head_ref to cancel duplicate push + pull_request runs ([5020bf8](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/5020bf88426bf2693c1992f4e7df6b4ec891dd59))
* **ci:** trigger CI on push main only + all PRs to avoid duplicate runs ([973fc70](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/973fc70d4bbfda26b9ae6a9b12a3b1534a5a50b3))
* **tests:** rename health route test to match integration.test pattern ([e92aad1](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/e92aad1691ac319716413a5f9ff4d50b903395c6))


### Documentation

* technical documentation (ARCHITECTURE + VERSIONS + PRODUCTION + DESIGN + BRAINSTORM + ADRs + knowledges) ([ea0184c](https://github.com/thibaud57/thibaud-geisler-portfolio/commit/ea0184c105d83d56a09bdaa90ee4f621f923adfc))

## Historique Versions

## Ressources

- [Keep a Changelog 1.1](https://keepachangelog.com/fr/1.1.0/)
- [SemVer](https://semver.org/lang/fr/) — schéma versioning projet (voir [docs/PRODUCTION.md](docs/PRODUCTION.md))
