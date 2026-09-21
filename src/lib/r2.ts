import "server-only"
import { S3Client } from "@aws-sdk/client-s3"
import { env } from "@/env"

export const r2 = new S3Client({
  region: "auto",
  // Buckets créés en juridiction européenne au sub-project 01, sans .eu. le bucket est introuvable
  endpoint: `https://${env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ASSETS_ACCESS_KEY_ID,
    secretAccessKey: env.R2_ASSETS_SECRET_ACCESS_KEY,
  },
  // R2 rejette le checksum CRC32 par défaut du SDK
  requestChecksumCalculation: "WHEN_REQUIRED",
})

export const R2_BUCKET = env.R2_ASSETS_BUCKET

export const adminR2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ADMIN_ACCESS_KEY_ID,
    secretAccessKey: env.R2_ADMIN_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
})

export const R2_ADMIN_BUCKET = env.R2_ADMIN_BUCKET
