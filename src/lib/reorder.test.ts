import { describe, expect, it } from "vitest"

import { computeIdsAtPosition, computeReorderedIds, removeId } from "./reorder"

describe("computeReorderedIds", () => {
  it("moves the dragged id forward to the target's position, shifting the rest back", () => {
    const result = computeReorderedIds(["a", "b", "c", "d"], "a", "c")

    expect(result).toEqual(["b", "c", "a", "d"])
  })

  it("moves the dragged id one row down when dropped on the next row", () => {
    const result = computeReorderedIds(["a", "b", "c"], "a", "b")

    expect(result).toEqual(["b", "a", "c"])
  })

  it("moves the dragged id backward to the target's position, shifting the rest forward", () => {
    const result = computeReorderedIds(["a", "b", "c", "d"], "d", "b")

    expect(result).toEqual(["a", "d", "b", "c"])
  })

  it("returns the list unchanged when dragged and target are the same id", () => {
    const result = computeReorderedIds(["a", "b", "c"], "b", "b")

    expect(result).toEqual(["a", "b", "c"])
  })

  it("returns the list unchanged when the target id is not found", () => {
    const result = computeReorderedIds(["a", "b", "c"], "a", "z")

    expect(result).toEqual(["a", "b", "c"])
  })
})

describe("computeIdsAtPosition", () => {
  it("inserts a new id at an occupied position, shifting the following ones back", () => {
    const result = computeIdsAtPosition(["a", "b", "c", "d", "e", "f", "g"], "h", 5)

    expect(result).toEqual(["a", "b", "c", "d", "h", "e", "f", "g"])
  })

  it("inserts a new id at position 1", () => {
    const result = computeIdsAtPosition(["a", "b", "c"], "z", 1)

    expect(result).toEqual(["z", "a", "b", "c"])
  })

  it("appends a new id at the end when the position is beyond it", () => {
    const result = computeIdsAtPosition(["a", "b", "c"], "z", 10)

    expect(result).toEqual(["a", "b", "c", "z"])
  })

  it("clamps a position below 1 up to 1", () => {
    const result = computeIdsAtPosition(["a", "b", "c"], "z", 0)

    expect(result).toEqual(["z", "a", "b", "c"])
  })

  it("moves an existing id down within the same category", () => {
    const result = computeIdsAtPosition(["a", "b", "c", "d"], "a", 3)

    expect(result).toEqual(["b", "c", "a", "d"])
  })

  it("moves an existing id up within the same category", () => {
    const result = computeIdsAtPosition(["a", "b", "c", "d"], "d", 2)

    expect(result).toEqual(["a", "d", "b", "c"])
  })
})

describe("removeId", () => {
  it("closes the list by removing the given id", () => {
    const result = removeId(["a", "b", "c"], "b")

    expect(result).toEqual(["a", "c"])
  })
})
