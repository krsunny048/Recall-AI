import { describe, expect, it } from "vitest";
import { calculateQuizScore, getIncorrectQuestionIds } from "./quiz";
const answers = [
  { questionId: "q1", selectedOptionIndex: 1, isCorrect: true },
  { questionId: "q2", selectedOptionIndex: 0, isCorrect: false },
  { questionId: "q3", selectedOptionIndex: 2, isCorrect: true }
];
describe("quiz helpers", () => {
  it("calculates a rounded percentage score", () => {
    expect(calculateQuizScore(answers, 3)).toBe(67);
  });
  it("returns zero for an empty quiz", () => {
    expect(calculateQuizScore([], 0)).toBe(0);
  });
  it("returns only question IDs answered incorrectly for revision", () => {
    expect(getIncorrectQuestionIds(answers)).toEqual(["q2"]);
  });
});
