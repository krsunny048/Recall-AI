import { z } from "zod";
const DifficultySchema = z.enum(["easy", "medium", "hard"]);
const GenerationModeSchema = z.enum(["flashcards", "quiz", "both"]);
const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  difficulty: DifficultySchema
});
const QuizQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  difficulty: DifficultySchema
});
const GeneratedStudySetSchema = z.object({
  title: z.string().min(1).max(100),
  summary: z.string().min(1).max(600),
  flashcards: z.array(FlashcardSchema),
  quiz: z.array(QuizQuestionSchema)
});
const GenerateRequestSchema = z.object({
  content: z.string().trim().min(10, "Add at least 10 characters of notes or a topic.").max(12e3),
  mode: GenerationModeSchema,
  difficulty: DifficultySchema,
  flashcardCount: z.number().int().min(1).max(20),
  questionCount: z.number().int().min(1).max(20)
});
export {
  DifficultySchema,
  FlashcardSchema,
  GenerateRequestSchema,
  GeneratedStudySetSchema,
  GenerationModeSchema,
  QuizQuestionSchema
};
