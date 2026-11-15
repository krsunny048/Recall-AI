import "dotenv/config";
import express from "express";
import cors from "cors";
import { GenerateRequestSchema } from "../../shared/study.js";
import { generateStudyMaterial } from "./ai.js";
const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "64kb" }));
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiConfigured: Boolean(process.env.GROQ_API_KEY) });
});
app.post("/api/study/generate", async (req, res) => {
  const requestResult = GenerateRequestSchema.safeParse(req.body);
  if (!requestResult.success) {
    return res.status(400).json({
      error: {
        code: "INVALID_REQUEST",
        message: requestResult.error.issues[0]?.message || "Please check the study request.",
        retryable: false
      }
    });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("AI request timed out.")), 55e3);
  res.on("close", () => {
    if (!res.writableEnded) controller.abort(new Error("Client disconnected."));
  });
  try {
    const studySet = await generateStudyMaterial(requestResult.data, controller.signal);
    if (!res.headersSent && !res.destroyed) {
      res.json({ success: true, data: studySet });
    }
  } catch (error) {
    if (res.destroyed || controller.signal.reason?.message === "Client disconnected.") return;
    const code = error.code || "INTERNAL_ERROR";
    const message = controller.signal.aborted && controller.signal.reason?.message === "AI request timed out." ? "The AI took too long to respond. Please try again." : error instanceof Error ? error.message : "Something went wrong while generating your study material.";
    console.error(`[${code}]`, message);
    const status = code === "AI_NOT_CONFIGURED" ? 503 : code === "AI_RATE_LIMIT" ? 429 : 502;
    if (!res.headersSent && !res.destroyed) {
      res.status(status).json({
        error: {
          code,
          message,
          retryable: !["AI_NOT_CONFIGURED", "INVALID_REQUEST"].includes(code)
        }
      });
    }
  } finally {
    clearTimeout(timeout);
  }
});
app.use((error, _req, res, _next) => {
  console.error("Unhandled server error:", error);
  if (!res.headersSent) {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unexpected server error. Please retry.", retryable: true }
    });
  }
});
app.listen(port, () => {
  console.log(`Recall AI API listening on http://localhost:${port}`);
});
