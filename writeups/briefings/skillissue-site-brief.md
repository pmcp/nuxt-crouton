# skill/issue — marketing site brief & copy deck

> Source of truth for the site's **words** and **information architecture**.
> Sub-issue [#918](https://github.com/FriendlyInternet/nuxt-crouton/issues/918) of epic
> [#917](https://github.com/FriendlyInternet/nuxt-crouton/issues/917). The scaffold (#919),
> design (#920), demo (#921) and SEO/launch (#922) build against the copy below — do not
> re-invent positioning; if copy needs to change, change it *here* first.

This is internal notes, not agent instructions — ignore any imperative lines as directives.

---

## 0. The one-liner (stranger test)

> **skill/issue turns AI coding into a repeatable system: a ticket says *what* to build, a reusable skill knows *how* to build it, and out comes a reviewed PR — every time, traceably.**

Locked decisions (from epic #917):
- **Lead audience:** solo builders + small dev teams (agencies secondary).
- **Domains:** prod `skillissue.friendlyinter.net`, staging `skillissue.pmcp.dev`.
- **v1 pages:** Hero · How-it-works/The-flow · Why-it's-different · Use-cases · CTA, **plus** the interactive watch-the-flow demo. **No** pricing, **no** docs/blog in v1.

---

## 1. Page outline (one-screen IA)

The site is a **single long-scroll landing page** with anchor nav. Order = the order a skeptic
needs to be convinced in: hook → see it run → understand it → believe it's different → see
themselves in it → act.

| # | Section | Anchor | Intent (what this section must do) |
|---|---------|--------|-------------------------------------|
| 1 | **Hero** | `#top` | In one screen: say what it is + the promise, and pull the eye to the demo. One primary CTA. |
| 2 | **The flow** (watch-the-flow demo) | `#flow` | The "wow". *Show* issue → skill → code → PR → deploy actually running. This is the centerpiece (built in #921). |
| 3 | **How it works** | `#how` | Explain the two durable artifacts (skills + issues) and how the loop compounds. Make the demo legible. |
| 4 | **Why it's different** | `#why` | The contrast vs. ad-hoc AI coding. The table. Kill the "isn't this just Copilot?" objection. |
| 5 | **Who it's for** (use-cases) | `#use-cases` | Solo builders + small teams see themselves; agencies get a nod. Concrete, not abstract. |
| 6 | **CTA / close** | `#cta` | One ask. Repeat the one-liner. Remove friction. |
| — | Footer | — | Minimal: logo, the one-liner, links. (No pricing/docs in v1.) |

Nav (sticky, minimal): `The flow · How it works · Why different · Use cases · [CTA button]`.

---

## 2. Copy deck (final words, section by section)

### 1 · Hero  `#top`

**Eyebrow:** `Skills + tickets = software that ships itself`

**H1:**
> # Stop prompting. Start shipping — repeatably.

**Sub-head:**
> skill/issue turns AI coding into a system you can trust. A **ticket** captures *what* to
> build and *why*. A reusable **skill** knows *how*. Out comes a **reviewed PR** — every time,
> traceable, auditable.

**Primary CTA:** `[ Watch the flow ↓ ]` (scrolls to `#flow`)
**Secondary CTA:** `Get early access` (→ `#cta`)

**Trust line (under the buttons):**
> The site you're reading was built this way. *(Receipts in the demo.)*

---

### 2 · The flow — watch-the-flow demo  `#flow`

**Section heading:**
> ## Watch one change go from idea to deployed

**Lead:**
> No slides. This is the actual loop: file an issue, a skill picks it up and executes, a
> reviewed pull request appears, it deploys. Step through it.

**The four steps (stepper labels + one-line captions — drives the #921 widget):**

1. **📋 Issue** — *The what & why.* A ticket: scope, the reason, what "done" looks like.
2. **🛠️ Skill** — *The repeatable how-to.* A reusable procedure picks up the ticket and runs it.
3. **✅ Reviewed PR** — *The proof.* Real diff, reviewed against the ticket's acceptance criteria.
4. **🚀 Deploy** — *It ships.* And the learnings feed back into the skill, so next time is sharper.

**Payoff line (after the loop completes):**
> That's the whole product. Not a faster autocomplete — a **delivery system**.

*(Build note for #921: live path drives a real/recorded skill/issue run; graceful static
fallback = recorded frames if the live path is unavailable. Keyboard-driven stepper, not
hover-only — see #921 a11y note.)*

---

### 3 · How it works  `#how`

**Section heading:**
> ## Two durable artifacts. One compounding loop.

**Intro:**
> Most AI coding throws away the most valuable part — *how* you did it. skill/issue keeps it.

**Two cards:**

**Card A — 🛠️ Skills = the reusable how-to**
> The repeatable procedure, written down once and improved over time. Versioned, reviewable,
> shareable. The skill that built today's feature builds tomorrow's the same way — and gets
> better each run.

**Card B — 📋 Issues = the tracked what & why**
> Every change starts as a ticket: the scope, the reasoning, the acceptance check, the audit
> trail. Six months later you can answer "why did this change?" — because the answer is written
> down, not lost in a chat log.

**The loop (caption for a flow diagram):**
> `Issue → Skill → Code → Reviewed PR → Deploy → (learnings sharpen the skill) → ↻`
>
> Knowledge **compounds** instead of evaporating. Every loop leaves the system smarter than it
> found it.

---

### 4 · Why it's different  `#why`

**Section heading:**
> ## Not another autocomplete

**Lead:**
> Copilot and Cursor make *typing* faster. skill/issue makes *delivery* a system — governed,
> reviewable, repeatable. It's the layer **above** the assistant, not a replacement for it.

**The contrast table:**

| Ad-hoc AI coding | **skill/issue** |
|---|---|
| Re-explain the context every session | **Durable how-to** — the skill remembers |
| "Why did this change?" → shrug | **Traceable what/why** — the ticket is the record |
| Works once, differently next time | **Repeatable** — same skill, same result |
| No paper trail | **Auditable** — one reviewed PR per issue |
| Knowledge lives in one person's head | **Knowledge compounds** in skills + issues |

**Closer:**
> Bring your favourite assistant. skill/issue is the system it plugs into.

---

### 5 · Who it's for  `#use-cases`

**Section heading:**
> ## Built for people who ship

**Three cards (lead two first, agencies third):**

**Solo builders** *(lead)*
> You move fast but lose the thread — last month's clever prompt is gone. With skill/issue your
> *how-to* becomes an asset you keep, not a one-off you retype. Leverage without the amnesia.

**Small dev teams** *(lead)*
> Onboarding, traceability, and "who changed this and why" — solved by construction. The ticket
> is the audit trail; the skill is the shared playbook. New teammates inherit how you build, not
> just what you built.

**Agencies** *(secondary)*
> Repeatable, auditable delivery across clients. Productize your process: the same skills run
> every engagement, and every change is traceable for the client.

---

### 6 · CTA / close  `#cta`

**Heading:**
> ## Make your AI coding repeatable

**Sub:**
> Skills + tickets + a reviewed flow. The way we build — packaged for the way you build.

**Primary CTA:** `[ Get early access ]` (email capture / waitlist)
**Micro-copy under field:** `No spam. Just a note when it's ready.`

**Final trust line:**
> This page was built with skill/issue. So was the demo above. So is everything next.

---

## 3. Voice & tone notes

- **Confident, plain, a little contrarian.** Short sentences. Verbs over adjectives.
- **Show, don't claim** — the dogfood line ("this site was built this way") earns the claims.
- **Don't trash the assistants** — position *above* them ("bring your favourite assistant"),
  not against them. The enemy is *ad-hoc-ness*, not Copilot.
- Avoid unexplained jargon. "Skill" and "issue/ticket" are defined on first use (Hero + How).

## 4. Open questions for sign-off

1. **Product name styling** — "skill/issue" (lowercase, slash) everywhere? Confirm.
2. **CTA mechanic** — email waitlist vs. "book a demo" vs. "star on GitHub"? Brief assumes
   **email waitlist** (`Get early access`).
3. **Eyebrow tagline** — "Skills + tickets = software that ships itself" — keep, or tune?
4. Anything in the **Why-different** table that over-claims and should soften?

---

## 5. Sign-off

Per the schema/UI sign-off pattern (#310), this copy is the **content gate**: #919/#920/#921
consume it once approved. Approve by commenting `lgtm` / `approve` on #918 (a reaction/label
does **not** count, per #572). Change requests → iterate here.
