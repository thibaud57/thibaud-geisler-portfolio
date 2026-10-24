import { z } from "zod"

export const StringList = z.array(z.string())
