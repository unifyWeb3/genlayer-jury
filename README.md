# The Jury

The Jury is an interactive educational web product for the GenLayer Builder Program.
It demonstrates how GenLayer validators can deliberate on subjective disputes and still
reach finality through the Equivalence Principle.

Live app: `https://genlayer-jury.vercel.app`

## What This Project Teaches

1. Why standard EVM contracts struggle with subjective disputes.
2. How Intelligent Contracts use validator deliberation and appeals.
3. How to choose the right Equivalence mode:
   `Strict`, `Comparative`, or `Non-comparative`.
4. How finality is reached when cases escalate from Tier 1 to Tier 2.

## Product Structure

The homepage is structured as an educational docket:

1. Hero + system primitives.
2. Mode explanations.
3. Live simulator (mock or OpenRouter-backed).
4. Casebook with 5 focused case files.
5. Appeal and Finality panel with animated escalation flow.
6. Field Guide essay + decision tree for authors.

Case file routes:

- `/case/freelancer`
- `/case/flight`
- `/case/dao`
- `/case/prediction`
- `/case/ai-agent`

Each case file includes:

1. A focused dispute brief.
2. Recommended Equivalence mode and rationale.
3. Embedded simulator locked to that case.
4. Annotated Python contract notebook.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS v4

## Local Development

Node.js `>= 20.9.0` is required for Next.js 16 builds.

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

The project supports two jury modes.

### Mocked mode (default)

Set:

```bash
NEXT_PUBLIC_LIVE_JURY=false
```

This path is deterministic and streams prewritten juror responses.

### Live mode (OpenRouter)

Set:

```bash
NEXT_PUBLIC_LIVE_JURY=true
OPENROUTER_API_KEY=...
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=The Jury
```

Live mode calls OpenRouter per juror and streams back through `/api/jury`.

## Live Mode Reliability Notes

Free-tier models can throttle heavily. The app includes guards for this:

1. Sequential live scheduling with enforced start gaps.
2. Retry-aware pacing based on `Retry-After`.
3. Timeout fallback verdicts so jurors do not stay stuck in deliberation.
4. SSE completion safeguards on both server and client.

This favors reliability and educational clarity over raw speed.

## Core Files

- `/src/app/api/jury/route.ts`: OpenRouter SSE proxy, timeout handling, retry hints.
- `/src/lib/useJury.ts`: Client streaming, scheduling, fallback finalization.
- `/src/lib/scenarios.ts`: Case data and contract annotations.
- `/src/components/Simulator.tsx`: Main simulator surface.
- `/src/components/Casebook.tsx`: 5 case file index.
- `/src/components/Appeal.tsx`: Appeal/finality educational panel.
- `/src/components/FieldGuide.tsx`: Author essay + mode decision tree.

## Submission Writeup

See [`SUBMISSION.md`](/home/unify/genlayer-jury/SUBMISSION.md) for the builder-program
submission narrative, judging checklist, and demo script.
