# Atelier Principles

Use these to evaluate every feature, design decision, and priority call.
If something violates a principle, it's wrong. If it serves several, it's right.

---

1. **The user describes what, never how.**
They say "I need bookings." They never configure a database, write a query, or pick a component library.

2. **Everything connects by default.**
Any package works alone. Any two packages work together. Adding a package never requires rewiring what's already there. Members are the connective tissue — bookings, email, invoicing, and the member area all reference the same identity through auth.

3. **The framework is the product. AI is the labour.**
We build the rules. AI builds to the rules. The Architect designs data, the Designer decides component presentation, the Analyst creates visualizations, the Editor composes pages, the CLI generates code. Our value is the guarantee that generated output is compatible, not that it's generated fast.

4. **Generate → Customise → Own.**
Every generated file belongs to the user. They can edit it, replace it, or keep it forever. The app doesn't know which files came from the CLI, the designer, or the user. Like Rails scaffolding — the scaffold gets you started, the code is yours.

5. **Schema carries everything.**
The JSON schema is the single source of truth — data model, field metadata, layout hints. The architect writes the structure, the designer adds presentation hints or writes custom components, the CLI reads it all and generates accordingly. No separate configuration layer.

6. **Standard first, custom when it matters.**
Most collections work fine with table + form + detail. The designer only writes custom components when the domain demands it — calendars, embedded flows, domain-specific interactions. The test: would a user look at a generic table and think "this works" or "this doesn't feel right"?

7. **Packages, not features.**
Every capability ships as a package. If it can't be installed, removed, or replaced independently, it's not designed right. Removing a package makes the app simpler, never broken.

8. **Opinionated for small organisations.**
Community centers, clubs, charities, freelancers. We don't generalise to serve everyone. A feature that makes sense for an enterprise but not for a 200-member club is a wrong feature. These organisations want specific tools with custom constraints, not full ERP.

9. **Four roles, one pipeline.**
Architect talks to the user and outputs schemas. Designer reads schemas and outputs hints or components. CLI generates everything else. Analyst creates visualizations from domain data + available packages. Editor composes pages from all available pieces. No coordinator, no orchestration framework. Just: run prompt A, write files, run prompt B, write files, run CLI, run prompt C, write files, run prompt D, write files.

10. **The CLI gets smarter, everyone does less.**
Every project is a data point. Date + capacity → calendar. Image + name → grid. Date + count → time series chart. Status field → donut chart. Public page → hero first. Dashboard → personal data first. Patterns are manual observations now, codified as defaults over time. The Designer focuses on genuinely novel components, the Analyst on genuinely novel data shapes, the Editor on genuinely novel page compositions.

11. **Open source framework, paid convenience.**
The framework is free forever. Revenue comes from hosting, AI, and managed services. We never gate a capability behind payment — only the effort of running it yourself.

12. **Everything lands in layers.**
Whether the CLI generated it from a hint or the designer wrote it custom, files live in the same `layers/[domain]/` structure. Components, composables, server routes, types — all in one place per domain. No new conventions, no separate systems.

13. **Generated layers are packages.**
A generated layer registers the same way a published package does: `app.config.ts` with `croutonApps`, `croutonBlocks`, admin routes, page types. The page editor, sidebar, and page tree discover generated domains identically to `crouton-bookings` or `crouton-charts`. No manifest needed — the `app.config.ts` IS the registration. Every collection the pipeline creates gets List, Detail, Form, Card components plus chart presets, map configs, and collection views as editor blocks. Whether you installed it from npm or an AI designed it from "I need drink sales for a fundraiser" — same result at runtime.

---

## Decision filter

When evaluating a feature, change, or priority, ask:

- **Does it serve a 200-member community center?** If not, it's probably too complex.
- **Can a non-technical person describe what they want and get it?** If they need to understand schemas, layers, or collections, the interface layer is incomplete.
- **Does the schema carry this, or does it need a new configuration surface?** If it can't live in the schema, question whether it's needed.
- **Is this a CLI default waiting to happen?** If the designer would make the same choice every time, it should be a CLI default instead.
- **Can I remove this package and the app still works?** If not, the dependency is too hard.
- **Does the generated file look like something a developer would write?** If the output needs immediate editing to be useful, the generator isn't good enough yet.
- **Would this be better as a hint or a custom component?** Hints are cheaper. Custom components are more powerful. Pick the right tool.
- **Does this increase the value of every app, or just one?** Prioritise work that compounds — better CLI defaults, new packages, better schema conventions — over one-off improvements.
- **Would this work the same if it came from a generated layer instead of a package?** If a generated domain can't do something a package can, the registration system has a gap.
