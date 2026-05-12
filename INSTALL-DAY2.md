# Day 2 — Install instructions

Three files to drop into your existing project:

```
genlayer-jury/
└── src/
    ├── lib/                          ← NEW folder
    │   ├── scenarios.ts              ← 6 scenarios + EP comparators
    │   └── useJury.ts                ← streaming state machine
    └── components/
        └── Simulator.tsx             ← REPLACE the Day 1 version
```

## How to install

### Option A — VS Code drag-and-drop (easiest)

1. Extract `genlayer-jury-day2.zip`
2. You'll get a `day2/` folder with `src/lib/` and `src/components/Simulator.tsx`
3. Open your project in VS Code
4. From the extracted folder, drag `lib/` into your project's `src/` folder
5. Drag `Simulator.tsx` into your project's `src/components/` folder, choose **Replace** when prompted

### Option B — Terminal

```bash
cd ~/Downloads
unzip -o genlayer-jury-day2.zip
cp -rf day2/src/. /home/unify/genlayer-jury/src/
```

## How to verify it worked

Open `src/lib/` in your project — you should see:
- `scenarios.ts`
- `useJury.ts`

Open `src/components/Simulator.tsx` — top of file should start with `"use client";` followed by `import { useMemo, useState } from "react";` and `import { SCENARIOS, type Mode } from "@/lib/scenarios";`.

## Run it

```bash
npm run dev
```

You should now see:

1. **Scenario picker** — 6 buttons above the mode selector
2. Clicking a scenario **changes the prompt** and resets the mode to the author's recommendation
3. **"Convene the jury →"** button below the prompt
4. Clicking it: jurors flip from "Awaiting" → "Deliberating" (pulse) → final verdict, each at a different time
5. **Text streams character by character** like a real LLM
6. **Verdict bar tallies live** as each juror finishes
7. **"Equivalence Principle: …"** appears with the final outcome and a reason line
8. If the EP returns no_consensus or undetermined, an **"Appeal · double jury"** button appears
9. **Mode tabs**: switching modes shows a "Author recommended: X" hint when you pick a non-default mode

## What's still mocked

All 5 validators are mocked from the scenario data in `scenarios.ts`. No API calls. We swap to live OpenRouter on Day 4 — but the interface won't change, only the data source.

## What's coming on Day 3

- The **Appeal mechanism upgraded**: doubles the jury to 11 with 6 synthetic jurors who simulate tier-2 deliberation
- **Code drawer**: the actual Python contract for each scenario, with "Fork in Studio" deep links
- **2 Casebook pages deep**: dedicated pages for the freelancer and flight cases with full teaching layer (why this mode, what could go wrong, why Ethereum couldn't do this)

Ping me with **"Day 3"** once Day 2 is live on Vercel.
