import { describe, it, expect } from "vitest";
import { extractJsonArray, parseJudgeScores } from "./parseItems";

describe("extractJsonArray", () => {
  it("parses a plain JSON array", () => {
    expect(extractJsonArray('[{"a":1},{"b":2}]')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("strips ```json code fences", () => {
    const raw = '```json\n[{"category":"sofa"}]\n```';
    expect(extractJsonArray(raw)).toEqual([{ category: "sofa" }]);
  });

  it("tolerates prose around the array", () => {
    const raw = 'Sure, here are the items: [{"q":"rug"}] — hope that helps!';
    expect(extractJsonArray(raw)).toEqual([{ q: "rug" }]);
  });

  it("returns [] for unparseable text", () => {
    expect(extractJsonArray("no json here")).toEqual([]);
  });

  it("returns [] when the payload is a JSON object, not an array", () => {
    expect(extractJsonArray('{"a":1}')).toEqual([]);
  });
});

describe("parseJudgeScores", () => {
  it("parses the documented array form [{i,score}]", () => {
    expect(parseJudgeScores('[{"i":1,"score":85},{"i":2,"score":70}]')).toEqual([
      { i: 1, score: 85 },
      { i: 2, score: 70 },
    ]);
  });

  it("parses the object-of-objects form the model actually returns", () => {
    const raw = '{\n"1":{"i":1,"score":85},\n"2":{"score":90}\n}';
    expect(parseJudgeScores(raw)).toEqual([
      { i: 1, score: 85 },
      { i: 2, score: 90 },
    ]);
  });

  it("parses the object-of-numbers form ({\"1\":85})", () => {
    expect(parseJudgeScores('{"1":85,"2":60}')).toEqual([
      { i: 1, score: 85 },
      { i: 2, score: 60 },
    ]);
  });

  it("strips code fences and returns [] for junk", () => {
    expect(parseJudgeScores('```json\n[{"i":1,"score":50}]\n```')).toEqual([{ i: 1, score: 50 }]);
    expect(parseJudgeScores("no scores here")).toEqual([]);
  });

  it("falls back to parsing prose when the model ignores JSON", () => {
    const raw = "Here is the scoring:\nCandidate 1: 85\nCandidate 2: 40\nCandidate 3: 90";
    const out = parseJudgeScores(raw);
    expect(out).toContainEqual({ i: 1, score: 85 });
    expect(out).toContainEqual({ i: 2, score: 40 });
    expect(out).toContainEqual({ i: 3, score: 90 });
  });
});
