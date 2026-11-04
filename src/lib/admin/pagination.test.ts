import { describe, expect, it } from "vitest"

import { getVisiblePages, paginate } from "./pagination"

const ITEMS = Array.from({ length: 12 }, (_, index) => index + 1)

describe("paginate", () => {
  it("returns the slice of the requested page", () => {
    const result = paginate(ITEMS, 2, 5)

    expect(result).toEqual({ currentPage: 2, pageCount: 3, pageItems: [6, 7, 8, 9, 10] })
  })

  it("clamps a page beyond the last one", () => {
    const result = paginate(ITEMS, 9, 5)

    expect(result).toEqual({ currentPage: 3, pageCount: 3, pageItems: [11, 12] })
  })

  it("keeps one empty page for an empty list", () => {
    const result = paginate([], 1, 5)

    expect(result).toEqual({ currentPage: 1, pageCount: 1, pageItems: [] })
  })
})

describe("getVisiblePages", () => {
  it("lists every page up to five", () => {
    const pages = getVisiblePages(2, 4)

    expect(pages).toEqual([1, 2, 3, 4])
  })

  it("collapses the tail when near the start", () => {
    const pages = getVisiblePages(2, 10)

    expect(pages).toEqual([1, 2, 3, "ellipsis", 10])
  })

  it("collapses the head when near the end", () => {
    const pages = getVisiblePages(9, 10)

    expect(pages).toEqual([1, "ellipsis", 8, 9, 10])
  })

  it("collapses both sides around a middle page", () => {
    const pages = getVisiblePages(5, 10)

    expect(pages).toEqual([1, "ellipsis", 5, "ellipsis", 10])
  })
})
