import { normalizeForSearch } from "@/lib/admin/search"

type ReplaceDetailsSectionResult =
  | { ok: true; details: string }
  | { ok: false; code: "no_details" }
  | { ok: false; code: "section_not_found"; headings: string[] }

// normalizeForSearch laisse l'emoji du titre : le retirer ici permet de viser « À propos » pour « # 🏢 À propos ».
function headingKey(heading: string): string {
  return normalizeForSearch(heading)
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
}

function headingOf(section: string): string {
  return section.slice(2).split("\n", 1)[0] ?? ""
}

export function replaceDetailsSection(
  details: string | null,
  heading: string,
  content: string,
): ReplaceDetailsSectionResult {
  if (details === null || details === "") {
    return { ok: false, code: "no_details" }
  }

  const target = headingKey(heading)
  // Une section court de son « # » jusqu'au suivant : le texte avant le premier titre n'en fait pas partie.
  const chunks = details.split(/^(?=# )/m).map((chunk) => ({
    chunk,
    title: chunk.startsWith("# ") ? headingOf(chunk) : undefined,
  }))

  const firstMatch = chunks.findIndex(
    ({ title }) => title !== undefined && headingKey(title) === target,
  )
  if (firstMatch === -1) {
    const headings = chunks.flatMap(({ title }) => (title === undefined ? [] : [title]))
    return { ok: false, code: "section_not_found", headings }
  }

  const body = content.trim() === "" ? "" : `\n${content.trim()}\n`
  const replaced = chunks.map(({ chunk, title }, index) => {
    if (index !== firstMatch || title === undefined) return chunk
    const separator = index === chunks.length - 1 ? "" : "\n"
    return `# ${title}\n${body}${separator}`
  })

  return { ok: true, details: replaced.join("") }
}
