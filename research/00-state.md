# Pipeline State

- **Project:** Horace Lawrence / Sunrun rep page (scroll-stop)
- **Mode:** full
- **Client URL:** https://sunrun.my.salesforce-sites.com/purl/?srep=/powergenie (rep page) · brand: https://www.sunrun.com
- **Niche:** residential solar + home battery, sold through an individual Sunrun sales rep (Bay Area, 510 number)
- **Scroll subject:** solar home deconstruction — panels lift off the roof, then racking, inverter and home battery separate out, then reassemble
- **Subject type:** product (deconstruction)
- **Scraping:** webfetch-fallback (Firecrawl not connected; competitors found by web search)
- **Last updated:** 2026-10-06

## Stage status
| # | Stage | Status | Output |
|---|---|---|---|
| 0 | Intake | done | this file |
| 1 | Brand | in progress | research/01-client-brand.md |
| 2 | Competitors | pending | research/02-competitor-analysis.md |
| 3 | Report | pending | competitive-analysis.html |
| 4 | Brief | pending | research/03-build-brief.md |
| — | **Gate 1** | awaiting approval | — |
| 5 | Prompts | pending | prompts.html |
| — | **Gate 2** | awaiting assets | — |
| 6 | Build | pending | site/ |
| 7 | Audit | pending | research/04-quality-audit.md |

## Design tokens
- **Accent:** TBD in Stage 4 — candidates: Sunrun blue #0031ff (CTA buttons on the rep page), sun gold #ffb81c (used in the concept)
- **Background:** TBD — rep page navy #05193d (header card, headings)
- **Text primary / muted:** TBD
- **Heading font:** TBD (rep page uses Helvetica / Proxima-style; concept uses DM Sans)
- **Body font:** TBD
- **Mono font:** TBD
- **Landing pattern:** TBD
- **Visual style:** TBD
- **Motion tier:** TBD

## Opted-in sections
- Testimonials: no
- Confetti on CTA: yes
- Card scanner (Three.js): no

## Open questions
- The existing concept (index.html, Three.js hero) and the new scroll-stop site (site/) are separate builds. Decide at Gate 1 whether site/ replaces the concept or stays a second variant.
- No headshot of Horace exists yet; the avatar is initials.

## Decisions log
- 2026-10-06 Full pipeline chosen over skip-research and prompts-only.
- 2026-10-06 Scroll subject: exploding solar home, chosen over a single-panel teardown and a blackout before/after (before/after can't start on a white frame).
- 2026-10-06 Opt-ins: confetti on CTA only. Testimonials off (no real quotes available), card scanner off (too heavy for a lead page).
