"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { ADMIN_API_KEYS_PATH } from "@/lib/admin/routes"
import { auth } from "@/lib/auth"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { apiKeySchema, expiryInSeconds, type ApiKeyInput } from "@/lib/schemas/api-key"
import { rowExists, stringField, stringValues } from "@/lib/server-utils"

import { deleteEntity, formStateHandlers, saveEntity } from "./_support/shared"
import type { ApiKeyDeleteState, ApiKeyFormState } from "./api-keys.types"

function invalidateApiKeyCaches(): void {
  revalidatePath(ADMIN_API_KEYS_PATH)
}

export async function createApiKey(
  _prevState: ApiKeyFormState,
  formData: FormData,
): Promise<ApiKeyFormState> {
  const user = await getCurrentUser()
  const raw = {
    name: stringField(formData, "name"),
    domains: stringValues(formData, "domains"),
    expiry: stringField(formData, "expiry"),
  }

  return saveEntity<ApiKeyInput, ApiKeyFormState, { id: string; key: string }>({
    actionName: "createApiKey",
    events: { success: "api_key:created", failure: "api_key:create_failed" },
    schema: apiKeySchema,
    input: raw,
    // Sans `headers` : `permissions` est une propriété server-only (.claude/rules/better-auth/api-key.md)
    persist: ({ name, domains, expiry }) =>
      auth.api.createApiKey({
        body: {
          userId: user.id,
          name,
          permissions: Object.fromEntries(domains.map((domain) => [domain, ["read", "write"]])),
          expiresIn: expiryInSeconds(expiry),
        },
      }),
    // Jamais la valeur de la clé : seul l'état de succès la porte
    successLogFields: (_data, persisted) => ({ keyId: persisted.id }),
    invalidateCaches: invalidateApiKeyCaches,
    ...formStateHandlers<ApiKeyInput>(raw),
    onSuccess: (persisted, data) => ({
      ok: true,
      errors: {},
      message: null,
      created: { name: data.name, key: persisted.key },
    }),
  })
}

export async function deleteApiKey(rawId: string): Promise<ApiKeyDeleteState> {
  await getCurrentUser()

  return deleteEntity<ApiKeyDeleteState>({
    actionName: "deleteApiKey",
    events: { success: "api_key:deleted", failure: "api_key:delete_failed" },
    successLogFields: { keyId: rawId },
    exists: () => rowExists(prisma.apikey, { id: rawId }),
    // Par Prisma : le plugin n'a ni `secondaryStorage` ni hook de suppression, la ligne retirée invalide la clé aussitôt
    destroy: () => prisma.apikey.delete({ where: { id: rawId } }),
    invalidateCaches: invalidateApiKeyCaches,
    onSuccess: () => ({ ok: true, message: null }),
    onUnknownError: () => ({ ok: false, message: "unknown_error" }),
  })
}
