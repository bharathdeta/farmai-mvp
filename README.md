
# FarmAI MVP v0.1

FarmAI is a mobile-friendly PWA for practical farm questions in Telugu or English. It supports Agriculture, Horticulture, and Fisheries today; Livestock has a prepared home card for the next release. Chat history remains in the user's browser for this MVP. The Gemini key is used only by `/api/chat`, never sent to the browser.

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

