import nextEnv from '@next/env'

process.env.SKIP_ENV_VALIDATION = 'true'
nextEnv.loadEnvConfig(process.cwd())
