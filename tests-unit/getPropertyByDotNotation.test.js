import { describe, it, expect } from "vitest";
import "../app/src/global.js";

const getPropertyByDotNotation =
  window.YoutubeAntiTranslate.getPropertyByDotNotation.bind(
    window.YoutubeAntiTranslate,
  );

describe("getPropertyByDotNotation", () => {
  it("returns the correct value for a valid dot notation path", () => {
    const obj = { a: { b: { c: 42 } } };
    expect(getPropertyByDotNotation(obj, "a.b.c")).toBe(42);
  });

  it("returns null for a non-existent path", () => {
    const obj = { a: { b: { c: 42 } } };
    expect(getPropertyByDotNotation(obj, "a.b.x")).toBeNull();
  });

  it("returns null for empty dotNotationProperty", () => {
    const obj = { a: 1 };
    expect(getPropertyByDotNotation(obj, "")).toBeNull();
  });

  it("returns null if json is not an object", () => {
    expect(getPropertyByDotNotation(null, "a.b")).toBeNull();
    expect(getPropertyByDotNotation(undefined, "a.b")).toBeNull();
    expect(getPropertyByDotNotation(42, "a.b")).toBeNull();
  });

  it("returns null for incomplete path (parent.undefined.children)", () => {
    const obj = { parent: { defined: { children: 123 } } };
    expect(
      getPropertyByDotNotation(obj, "parent.undefined.children"),
    ).toBeNull();
    expect(
      getPropertyByDotNotation(obj, "parent.defined.undefined"),
    ).toBeNull();
    expect(getPropertyByDotNotation(obj, "parent.undefined")).toBeNull();
  });
});
