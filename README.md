# Recall — Your Personal Study Workspace

Recall turns notes or a topic into structured flashcards and multiple-choice quizzes. Learners can flip through cards, mark concepts as known or difficult, take a quiz, review explanations, and retry incorrect questions.

> **Important:** The browser never receives the Groq API key. AI requests go through the Express server. Generated output is parsed and validated with Zod before it reaches the React UI.

## Features

- React single-page application written in JavaScript.
- Create study material from free-form notes or a topic.
- Generation modes: flashcards, quiz, or both.
- Difficulty and item-count controls.
- Flashcard flip interaction, progress, and known/difficult marking.
- Multiple-choice quiz with one submission per question and instant explanations.
- Results page with score and answer review.
- Retry mode built only from questions answered incorrectly.
- LocalStorage persistence for saved sets and flashcard progress.
- Loading, empty, and error states.
- Request timeout, cancellation, and stale-response protection.
- Backend request validation and AI response validation with Zod.
- A sample study set for trying the UI without an API key.

## Tech stack

- **Frontend:** React 18, JavaScript, Vite, custom CSS, Lucide React
- **Backend:** Node.js, Express
- **AI:** Groq Chat Completions API (OpenAI-compatible endpoint)
- **Validation:** Zod
- **Persistence:** Browser LocalStorage
- **Tests:** Vitest

## Prerequisites

- Node.js 20 or newer recommended
- npm
- A Groq API key for live AI generation (the sample set works without one)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root.

3. Create an API key in the [Groq Console](https://console.groq.com/keys) and add these settings to `.env`:

   ```dotenv
   GROQ_API_KEY=your_actual_key
   GROQ_MODEL=openai/gpt-oss-120b
   PORT=3001
   CLIENT_ORIGIN=http://localhost:5173
   ```

4. Start the frontend and backend together:

   ```bash
   npm start
   ```

5. Open [http://localhost:5173](http://localhost:5173).

The API health endpoint is available at [http://localhost:3001/api/health](http://localhost:3001/api/health).

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Starts Express and Vite in parallel |
| `npm run build` | Creates the production frontend build |
| `npm test` | Runs the Zod schema tests |
| `npm run preview` | Previews the built frontend |

## How structured generation works

1. The React form sends `content`, `mode`, `difficulty`, `flashcardCount`, and `questionCount` to `POST /api/study/generate`.
2. Express validates the incoming request with `GenerateRequestSchema`.
3. The server sends a system prompt and the user's study input to Groq's Chat Completions endpoint with JSON response mode enabled.
4. The server extracts and parses the JSON response.
5. `GeneratedStudySetSchema` validates the title, summary, flashcards, quiz questions, four answer options, correct answer index, and difficulty values.
6. The server assigns application-owned IDs to flashcards and questions and only returns validated data.
7. React validates the response again before storing and rendering it.

Malformed JSON, wrong data shapes, empty responses, missing credentials, rate limits, timeouts, and provider/network errors become structured API errors. Raw provider error details and model output are not returned to the browser.

## Reliability notes

- The frontend uses `AbortController` and a monotonically increasing request sequence so an obsolete response cannot overwrite a newer request.
- The server cancels generation when the client disconnects and enforces a request timeout.
- A failed generation does not clear the user's notes or replace an existing study set.
- LocalStorage reads are guarded against malformed or unavailable stored data.
- The quiz stores answers by question ID and the revision session is filtered to incorrect question IDs from the preceding attempt.

## AI usage note

An AI coding assistant was used to help scaffold and implement the application, styling, and tests. The project owner should review the generated code, run the test suite, and be able to explain the request lifecycle, schema validation, race-condition handling, quiz state, and revision logic before submitting.

## Known limitations

- No authentication, cloud database, or cross-device sync; saved study sets live in the current browser's LocalStorage.
- No file/PDF upload; notes are pasted into the text area.
- The app uses one Groq-compatible provider configuration. The provider call is isolated in `server/src/ai.js` so it can be replaced.
- AI-generated content can still contain factual errors. Students should verify important material against their source notes.
- There is no streaming UI; the app shows a loading state until the validated response is ready.
- This is a focused internship-assignment implementation, not a production multi-user service. Add authentication, abuse controls, rate limiting, and stronger observability before public deployment.

## Time spent

To be filled in by the project owner with the actual hands-on development and verification time. Do not claim an estimated value as actual time spent.
