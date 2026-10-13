
# FarmAI MVP v0.1

FarmAI is a mobile-friendly PWA for practical farm questions in Telugu or English. It supports Agriculture, Horticulture, and Fisheries today; Livestock has a prepared home card for the next release. Chat history remains in the user's browser for this MVP. The Gemini key is used only by `/api/chat`, never sent to the browser.

## Local-first My Farm workspace

The current local build includes **My Farm**, where farms and fields can be saved on the same device. Each field has **Crop Doctor** for a saved symptom assessment, **Crop Diary** for farm work, observations, and optional expenses; **Farm Weather** for a current condition and seven-day forecast; and **Smart Reminders** for due-dated farm tasks. Crop Doctor sends the typed concern and optional photo to the configured FarmAI service only when the farmer taps its assessment button; the local case record keeps the concern and answer, not the photo. Weather lookup is user-triggered and sends the saved village/district to Open-Meteo to find the forecast area. Choosing a field opens FarmAI with that field's crop, area, crop stage, and location as chat context. These records use browser storage only: they are not yet synced, shared, or recoverable after browser-data deletion. Cloud accounts and database storage will be added only after the local build is stable.

The local My Farm controls adapt to the selected Telugu, English, or Hindi language. Voice input uses the browser's speech-recognition support for the selected language, and the chat has a "Listen" control for the latest FarmAI reply. Voice buttons are available for the main text fields; when tapped, a large recording screen appears and the same mic button (or the large mic) stops recording. The browser asks for microphone permission only after a farmer taps the microphone button. The Home-page **Ask FarmAI** button opens chat directly; FarmAI then asks only the missing farm details step by step.

## Run locally

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to a **free-tier** key created in [Google AI Studio](https://aistudio.google.com/app/apikey).
3. Run `npm run dev`, then visit `http://localhost:3000` on a phone or desktop.

The default `GEMINI_MODEL=gemini-3.8-flash` is a multimodal Flash model suitable for text and photo analysis. When its free-tier capacity is briefly busy, FarmAI automatically retries once and then tries `gemini-3.1-flash-lite`, another free-tier multimodal model. Availability and quotas are account-specific: check the active limits in AI Studio and keep the project on the Free tier. Do not link billing if the goal is strictly zero spend.

## Deploy free (Vercel Hobby)

1. Put this folder in a personal Git repository and import it into Vercel, selecting the Hobby plan.
2. In the project’s Environment Variables, add `GEMINI_API_KEY` and optionally `GEMINI_MODEL=gemini-3.8-flash`.
3. Deploy. Do **not** use a `NEXT_PUBLIC_` prefix for the key.

Vercel Hobby is appropriate for a personal/non-commercial MVP. It has fixed free limits and does not bill overages, but can pause the project at limits. For shared, persistent histories later, add Supabase Free with Row Level Security and user authentication; this MVP intentionally needs neither.

## Test checklist

- Ask an English and a Telugu question.
- Upload a JPG/PNG/WebP under 5 MB, optionally with a question.
- Reload the page: local conversation history should remain.
- Use **Clear** to erase local history.

## Next modules

Add weather, crop calendars, calculators, voice input, authentication, and a Supabase-backed history behind separate server routes. Add rate limiting and authentication before broadly sharing the deployed endpoint, because an unauthenticated public endpoint can exhaust a free Gemini quota.

# farmai-mvp
FarmAI — a free Telugu and English agriculture assistant for crop, plant, and fish guidance.
