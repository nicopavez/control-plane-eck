# Presentation outline (30 min + 15 min Q&A)

The primary artifact is `site/` (the scrollytelling presentation), scrolled through
live and screen-shared. Partway through, there's a live cutover to the TUI
(`packages/tui`) running against the real local cluster. This doc is the speaking
script/timing budget, not a slide-by-slide script to read verbatim.

## Timing budget (30 min)

| Time | Section (maps to `site/` section) | What to say | Notes |
|---|---|---|---|
| 0:00-0:03 | 1. Market/problem framing | Why operator UX for stateful k8s services matters, the 2-3 sourced stats | Keep this short; it's context, not the pitch |
| 0:03-0:08 | 2. The install journey | Walk the real timeline, name time spent and errors hit | Let the chart do the talking; narrate, don't re-read numbers off it |
| 0:08-0:13 | 3. Ranked problems | The 3-5 ranked problems and the rubric used to rank them | This is "don't be shy about your observations" — be direct |
| 0:13-0:16 | 4. Prototype rationale | Who it's for, why these operations, what's deliberately left out | Tie each operation back to a specific problem #, not a feature list |
| 0:16-0:20 | 5. Before/after | The real kubectl-vs-TUI timing chart | The data-driven argument for the prototype's value |
| 0:20-0:27 | **Live cutover** -> `packages/tui` | Demo 3-4 operations live against the real cluster | **Interviewers pick one operation to walk through** — be ready for any of them, not just a rehearsed path |
| 0:27-0:30 | 6. Close (back in `site/`) | Product philosophy, what I'd need to learn next, the roadmap ask | End on the ask, not a recap |

## "Where AI helped vs where I stepped in" (required talking point)

> TODO: fill in honestly once the work is actually done. Likely shape: AI
> scaffolded the repo structure, the TypeScript contracts, the Fastify/Ink/Next.js
> boilerplate, and the chart rendering; the install itself (Task 1) and its
> findings came from a real local run, not AI output; the ranking rubric and
> problem selection, the persona and scope decisions in `prototype-scope.md`, and
> which operation to demo under interviewer questioning are human judgment calls
> that AI can't make for you. Be specific with examples, not a general statement.

## Anticipated Q&A

> TODO after a dry run. Likely questions worth pre-thinking:
> - "Why didn't you build [operation X]?" -> answer from `prototype-scope.md`'s
>   deliberately-left-out section, with a reason, not just "time."
> - "How would this handle a real production failure mode, not the happy path?"
> - "What would break if this ran against a multi-node, multi-cluster fleet?"
> - "Why a TUI first instead of a web UI?" -> API-first architecture reasoning:
>   same backend could serve either; TUI was faster to build well in the time
>   available and demos cleanly without a browser dependency.

## Dry run checklist

- [ ] Fresh cluster created from scratch at least once before interview day, to
      confirm the setup scripts still work against the current ECK/ES versions.
- [ ] `site/` reviewed end to end with real data (no sample-data banner showing).
- [ ] TUI dry-run of all 4-6 operations against a live cluster, not just the ones
      planned to demo (interviewers pick).
- [ ] Full 30-minute timing check, out loud, not just read silently.
