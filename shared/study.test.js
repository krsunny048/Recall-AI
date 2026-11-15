import { describe, expect, it } from "vitest";
import { GeneratedStudySetSchema, GenerateRequestSchema } from "./study";
const validSet = {
  title: "Networking basics",
  summary: "A short overview.",
  flashcards: [{ id: "fc1", front: "What is DNS?", back: "A system that resolves domain names.", difficulty: "easy" }],
  quiz: [{ id: "q1", question: "Which layer routes packets?", options: ["Physical", "Network", "Session", "Application"], correctOptionIndex: 1, explanation: "The Network layer routes packets.", difficulty: "medium" }]
};
describe("GeneratedStudySetSchema", () => {
  it("accepts valid structured study material", () => {
    expect(GeneratedStudySetSchema.safeParse(validSet).success).toBe(true);
  });
  it("rejects questions that do not have exactly four options", () => {
    const invalid = { ...validSet, quiz: [{ ...validSet.quiz[0], options: ["Only one"] }] };
    expect(GeneratedStudySetSchema.safeParse(invalid).success).toBe(false);
  });
  it("rejects an out-of-range correct option index", () => {
    const invalid = { ...validSet, quiz: [{ ...validSet.quiz[0], correctOptionIndex: 4 }] };
    expect(GeneratedStudySetSchema.safeParse(invalid).success).toBe(false);
  });
});
describe("GenerateRequestSchema", () => {
  it("rejects content that is too short", () => {
    expect(GenerateRequestSchema.safeParse({ content: "short", mode: "both", difficulty: "medium", flashcardCount: 8, questionCount: 8 }).success).toBe(false);
  });
  it("accepts a valid generation request", () => {
    expect(GenerateRequestSchema.safeParse({ content: "Explain the OSI model in computer networks.", mode: "both", difficulty: "medium", flashcardCount: 8, questionCount: 8 }).success).toBe(true);
  });
});
