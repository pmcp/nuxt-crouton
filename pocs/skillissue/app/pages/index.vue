<script setup lang="ts">
// skill/issue landing — bespoke, static. Copy = writeups/briefings/skillissue-site-brief.md (#918).
// The flow stepper below is an intentional *taste* of the centerpiece demo (#921),
// not the finished interactive piece.

const steps = [
  {
    n: '01',
    ico: '📋',
    key: 'issue',
    title: 'Issue',
    tag: 'the what & why',
    blurb: 'A ticket: scope, the reason, and what “done” looks like.'
  },
  {
    n: '02',
    ico: '🛠️',
    key: 'skill',
    title: 'Skill',
    tag: 'the repeatable how-to',
    blurb: 'A reusable procedure picks up the ticket and runs it.'
  },
  {
    n: '03',
    ico: '✅',
    key: 'pr',
    title: 'Reviewed PR',
    tag: 'the proof',
    blurb: 'A real diff, reviewed against the ticket’s acceptance criteria.'
  },
  {
    n: '04',
    ico: '🚀',
    key: 'deploy',
    title: 'Deploy',
    tag: 'it ships',
    blurb: 'And the learnings feed back into the skill — next time is sharper.'
  }
] as const

const active = ref<(typeof steps)[number]['key']>('issue')

const terminal: Record<string, { cmd: string; lines: { t: string; c?: string }[] }> = {
  issue: {
    cmd: 'gh issue view 918',
    lines: [
      { t: '#918  Add dark-mode toggle to the settings page', c: 'tok' },
      { t: 'labels: type:feat · app:web    status: open', c: 'dim' },
      { t: '', c: 'dim' },
      { t: '## Why', c: 'tok2' },
      { t: 'Users on the night shift asked for it twice this week.', c: '' },
      { t: '## Done when', c: 'tok2' },
      { t: '- toggle persists across reloads', c: '' },
      { t: '- respects prefers-color-scheme on first visit', c: '' }
    ]
  },
  skill: {
    cmd: 'skill run build-feature --issue 918',
    lines: [
      { t: '→ reading ticket #918 …', c: 'dim' },
      { t: '→ applying skill: build-feature@2.3', c: 'tok' },
      { t: '✓ added useColorMode() composable', c: 'add' },
      { t: '✓ wired toggle in SettingsPanel.vue', c: 'add' },
      { t: '✓ persisted choice to localStorage', c: 'add' },
      { t: '→ running typecheck … pass', c: 'dim' },
      { t: '→ opening pull request …', c: 'dim' }
    ]
  },
  pr: {
    cmd: 'gh pr view 924 --diff',
    lines: [
      { t: 'PR #924  feat: dark-mode toggle (Closes #918)', c: 'tok' },
      { t: 'reviewers: 1 approved · checks: 6/6 green', c: 'add' },
      { t: '', c: 'dim' },
      { t: '+ const mode = useColorMode()', c: 'add' },
      { t: '+ <USwitch v-model="isDark" />', c: 'add' },
      { t: '- // TODO: dark mode someday', c: 'del' }
    ]
  },
  deploy: {
    cmd: 'skill run deploy --env staging',
    lines: [
      { t: '→ building … done in 7.4s', c: 'dim' },
      { t: '✓ deployed to https://web.pmcp.dev', c: 'add' },
      { t: '✓ learnings appended to build-feature skill', c: 'tok' },
      { t: '', c: 'dim' },
      { t: 'one change · idea → live · fully traceable', c: 'tok2' }
    ]
  }
}

const dotColors = ['#fb7185', '#fbbf24', '#a3e635']
</script>

<template>
  <div class="si-canvas">
    <div class="si-shell">
      <!-- NAV -->
      <nav class="si-nav">
        <div class="si-wrap si-nav-inner">
          <a href="#top" class="si-logo">skill<b>/</b>issue</a>
          <div class="si-navlinks">
            <a href="#flow">The flow</a>
            <a href="#how">How it works</a>
            <a href="#why">Why different</a>
            <a href="#use-cases">Use cases</a>
          </div>
          <a href="#cta" class="si-btn si-btn-primary" style="padding: 0.55rem 1rem">Get early access</a>
        </div>
      </nav>

      <!-- HERO -->
      <header id="top" class="si-section si-wrap" style="padding-top: 5rem">
        <div class="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p class="si-eyebrow mb-5">Skills + tickets = software that ships itself</p>
            <h1 class="si-display">
              Stop prompting.<br />
              Start shipping —<br />
              <span class="si-grad-text">repeatably.</span>
            </h1>
            <p class="si-lead mt-7 max-w-xl">
              skill/issue turns AI coding into a system you can trust. A <b style="color:var(--si-ink)">ticket</b>
              captures <i>what</i> to build and <i>why</i>. A reusable <b style="color:var(--si-ink)">skill</b> knows
              <i>how</i>. Out comes a <b style="color:var(--si-ink)">reviewed PR</b> — every time, traceable, auditable.
            </p>
            <div class="mt-9 flex flex-wrap gap-3">
              <a href="#flow" class="si-btn si-btn-primary">Watch the flow ↓</a>
              <a href="#cta" class="si-btn si-btn-ghost">Get early access</a>
            </div>
            <p class="si-kicker mt-7">// this page was built this way — receipts in the demo</p>
          </div>

          <!-- hero visual: a tiny terminal -->
          <div class="si-term">
            <div class="si-term-bar">
              <span class="si-dot" :style="{ background: dotColors[0] }" />
              <span class="si-dot" :style="{ background: dotColors[1] }" />
              <span class="si-dot" :style="{ background: dotColors[2] }" />
              <span class="si-dim ml-2">issue → skill → PR → deploy</span>
            </div>
            <div class="si-term-body">
              <div><span class="si-tok-2">$</span> skill run build-feature <span class="si-tok">--issue</span> 918</div>
              <div class="si-dim">→ reading ticket …</div>
              <div class="si-add">✓ code written</div>
              <div class="si-add">✓ PR #924 opened · 6/6 checks green</div>
              <div class="si-add">✓ deployed · learnings saved</div>
              <div class="si-tok-2 mt-2">done — and the skill got smarter.</div>
            </div>
          </div>
        </div>
      </header>

      <hr class="si-rule si-wrap" />

      <!-- THE FLOW (demo taste) -->
      <section id="flow" class="si-section si-wrap">
        <div class="si-section-head">
          <p class="si-kicker mb-3">// the centerpiece</p>
          <h2 class="si-h2">Watch one change go from idea to deployed</h2>
          <p class="si-lead mt-4">
            No slides. This is the actual loop — file an issue, a skill executes it, a reviewed PR appears, it deploys.
            Click a step.
          </p>
        </div>

        <div class="si-pipe mb-6">
          <button
            v-for="s in steps"
            :key="s.key"
            class="si-step text-left"
            :style="active === s.key ? 'border-color: var(--si-cyan); background:#22d3ee0d' : ''"
            @click="active = s.key"
          >
            <div class="si-step-n">STEP {{ s.n }}</div>
            <div class="si-step-ico">{{ s.ico }}</div>
            <h4>{{ s.title }}</h4>
            <p>{{ s.blurb }}</p>
          </button>
        </div>

        <div class="si-term">
          <div class="si-term-bar">
            <span class="si-dot" :style="{ background: dotColors[0] }" />
            <span class="si-dot" :style="{ background: dotColors[1] }" />
            <span class="si-dot" :style="{ background: dotColors[2] }" />
            <span class="si-dim ml-2">{{ steps.find(s => s.key === active)?.tag }}</span>
          </div>
          <div class="si-term-body">
            <div class="mb-2"><span class="si-tok-2">$</span> {{ terminal[active].cmd }}</div>
            <div v-for="(l, i) in terminal[active].lines" :key="i" :class="l.c ? 'si-' + l.c : ''">
              {{ l.t || ' ' }}
            </div>
          </div>
        </div>
        <p class="si-kicker mt-5">// the whole product — not a faster autocomplete, a delivery system</p>
      </section>

      <hr class="si-rule si-wrap" />

      <!-- HOW IT WORKS -->
      <section id="how" class="si-section si-wrap">
        <div class="si-section-head">
          <p class="si-kicker mb-3">// how it works</p>
          <h2 class="si-h2">Two durable artifacts.<br />One compounding loop.</h2>
          <p class="si-lead mt-4">
            Most AI coding throws away the most valuable part — <i>how</i> you did it. skill/issue keeps it.
          </p>
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <div class="si-card si-card-glow">
            <div class="si-step-ico">🛠️</div>
            <h3 class="text-xl font-bold mb-2">Skills — the reusable how-to</h3>
            <p class="si-lead" style="font-size:1rem">
              The repeatable procedure, written once and improved over time. Versioned, reviewable, shareable.
              The skill that built today's feature builds tomorrow's the same way — and gets better each run.
            </p>
          </div>
          <div class="si-card si-card-glow">
            <div class="si-step-ico">📋</div>
            <h3 class="text-xl font-bold mb-2">Issues — the tracked what &amp; why</h3>
            <p class="si-lead" style="font-size:1rem">
              Every change starts as a ticket: scope, reasoning, acceptance check, audit trail. Six months later you
              can answer “why did this change?” — because the answer is written down, not lost in a chat log.
            </p>
          </div>
        </div>

        <div class="si-card mt-5" style="border-style: dashed">
          <p class="si-kicker mb-3">// the loop</p>
          <p class="font-mono text-sm md:text-base" style="color:var(--si-ink)">
            <span class="si-tok">Issue</span> →
            <span class="si-tok-2">Skill</span> →
            Code →
            <span class="si-add">Reviewed&nbsp;PR</span> →
            Deploy →
            <span class="si-dim">(learnings sharpen the skill)</span> → ↻
          </p>
          <p class="si-lead mt-3" style="font-size:1rem">
            Knowledge <b style="color:var(--si-ink)">compounds</b> instead of evaporating. Every loop leaves the
            system smarter than it found it.
          </p>
        </div>
      </section>

      <hr class="si-rule si-wrap" />

      <!-- WHY DIFFERENT -->
      <section id="why" class="si-section si-wrap">
        <div class="si-section-head">
          <p class="si-kicker mb-3">// positioning</p>
          <h2 class="si-h2">Not another autocomplete</h2>
          <p class="si-lead mt-4">
            Copilot and Cursor make <i>typing</i> faster. skill/issue makes <i>delivery</i> a system — governed,
            reviewable, repeatable. It's the layer <b style="color:var(--si-ink)">above</b> the assistant, not a
            replacement for it.
          </p>
        </div>

        <div class="si-card" style="padding:0; overflow:hidden">
          <table class="si-vs">
            <thead>
              <tr><th>Ad-hoc AI coding</th><th class="si-col-new-h">skill/issue</th></tr>
            </thead>
            <tbody>
              <tr><td class="si-col-old">Re-explain the context every session</td><td class="si-col-new">Durable how-to — the skill remembers</td></tr>
              <tr><td class="si-col-old">“Why did this change?” → shrug</td><td class="si-col-new">Traceable what/why — the ticket is the record</td></tr>
              <tr><td class="si-col-old">Works once, differently next time</td><td class="si-col-new">Repeatable — same skill, same result</td></tr>
              <tr><td class="si-col-old">No paper trail</td><td class="si-col-new">Auditable — one reviewed PR per issue</td></tr>
              <tr><td class="si-col-old">Knowledge lives in one person's head</td><td class="si-col-new">Knowledge compounds in skills + issues</td></tr>
            </tbody>
          </table>
        </div>
        <p class="si-kicker mt-5">// bring your favourite assistant — skill/issue is the system it plugs into</p>
      </section>

      <hr class="si-rule si-wrap" />

      <!-- USE CASES -->
      <section id="use-cases" class="si-section si-wrap">
        <div class="si-section-head">
          <p class="si-kicker mb-3">// who it's for</p>
          <h2 class="si-h2">Built for people who ship</h2>
        </div>
        <div class="grid gap-5 md:grid-cols-3">
          <div class="si-card">
            <span class="si-pill mb-4"><span class="si-blink" /> solo builders</span>
            <p class="si-lead" style="font-size:1rem">
              You move fast but lose the thread — last month's clever prompt is gone. Here your <i>how-to</i> becomes
              an asset you keep, not a one-off you retype. Leverage without the amnesia.
            </p>
          </div>
          <div class="si-card">
            <span class="si-pill mb-4"><span class="si-blink" /> small dev teams</span>
            <p class="si-lead" style="font-size:1rem">
              Onboarding, traceability, and “who changed this and why” — solved by construction. The ticket is the
              audit trail; the skill is the shared playbook. New teammates inherit how you build.
            </p>
          </div>
          <div class="si-card">
            <span class="si-pill mb-4"><span class="si-blink" style="background:var(--si-violet);box-shadow:0 0 10px var(--si-violet)" /> agencies</span>
            <p class="si-lead" style="font-size:1rem">
              Repeatable, auditable delivery across clients. Productize your process: the same skills run every
              engagement, and every change is traceable for the client.
            </p>
          </div>
        </div>
      </section>

      <hr class="si-rule si-wrap" />

      <!-- CTA -->
      <section id="cta" class="si-section si-wrap">
        <div class="si-card si-card-glow" style="padding: clamp(2rem, 6vw, 4rem); text-align: center">
          <p class="si-kicker mb-4">// make your AI coding repeatable</p>
          <h2 class="si-h2" style="max-width: 16ch; margin: 0 auto">Skills + tickets + a reviewed flow.</h2>
          <p class="si-lead mt-4" style="max-width: 46ch; margin-left:auto; margin-right:auto">
            The way we build — packaged for the way you build.
          </p>
          <form class="mt-8 flex flex-wrap justify-center gap-3" @submit.prevent>
            <input
              type="email"
              placeholder="you@studio.dev"
              class="si-btn si-btn-ghost"
              style="min-width: 260px; font-family: var(--si-mono); color: var(--si-ink)"
            />
            <button type="submit" class="si-btn si-btn-primary">Get early access →</button>
          </form>
          <p class="si-dim mt-3 text-sm" style="font-family: var(--si-mono)">No spam. Just a note when it's ready.</p>
        </div>
        <p class="si-kicker mt-8 text-center">// this page was built with skill/issue · so was the demo · so is everything next</p>
      </section>

      <!-- FOOTER -->
      <footer class="si-wrap" style="padding: 3rem 24px; border-top: 1px solid var(--si-line)">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <a href="#top" class="si-logo">skill<b>/</b>issue</a>
          <p class="si-dim text-sm" style="font-family: var(--si-mono)">A ticket says what. A skill knows how. Out comes a reviewed PR.</p>
        </div>
      </footer>
    </div>
  </div>
</template>
