/**
 * Lexical redundancy via shingle-containment (WS1, #927).
 *
 * The harness's redundancy is near-verbatim RESTATEMENT — the Artifacts table,
 * the deploy section, per-folder CLAUDE.md files echoing the root. That's a
 * lexical phenomenon, so a lexical measure catches it deterministically and
 * trendably (no LLM, no embeddings). We only escalate to embeddings if real
 * paraphrase ever slips past this — see the epic's considered-and-rejected.
 *
 * A *shingle* is a sliding window of K consecutive normalized words. Two
 * artifacts that restate the same paragraph share its shingles verbatim.
 *
 *   - corpus redundancy = duplicated shingle occurrences / total occurrences
 *     (how much of all the prose is a copy of prose seen elsewhere)
 *   - containment(A,B)  = |shingles(A) ∩ shingles(B)| / |smaller set|
 *     (how much of the smaller artifact is restated by the larger — the metric
 *     that flags "this skill duplicates the root CLAUDE.md")
 *
 * No deps. Pure ESM.
 */

const DEFAULT_K = 8

/** Normalize to a bag of words: lowercase, strip markdown/punctuation noise. */
function words(text) {
  return (text || '')
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' ') // drop fenced code — churns, not prose redundancy
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation → space
    .split(/\s+/)
    .filter(Boolean)
}

/** List of K-word shingles for one text, WITH repeats (a multiset as an array).
 *  Repeats matter: a section restated verbatim inside one file shows up as the
 *  same shingle twice, which is exactly the intra-file restatement we want to see
 *  (the Artifacts table / deploy section echoed within CLAUDE.md). Short texts
 *  (< K words) yield one shingle. */
export function shingleList(text, k = DEFAULT_K) {
  const w = words(text)
  if (w.length === 0) return []
  if (w.length < k) return [w.join(' ')]
  const out = []
  for (let i = 0; i + k <= w.length; i++) out.push(w.slice(i, i + k).join(' '))
  return out
}

/** Distinct K-word shingles for one text (set form, for containment). */
export function shingles(text, k = DEFAULT_K) {
  return new Set(shingleList(text, k))
}

/** Self-redundancy of one text: fraction of its shingle occurrences that repeat
 *  a shingle already seen earlier in the same text. Catches intra-file restatement. */
export function selfRedundancy(text, k = DEFAULT_K) {
  const list = shingleList(text, k)
  if (list.length === 0) return { pct: 0, total: 0, repeated: 0 }
  const distinct = new Set(list).size
  const repeated = list.length - distinct
  return { pct: Math.round((repeated / list.length) * 1000) / 10, total: list.length, repeated }
}

export function containment(aSet, bSet) {
  const [small, big] = aSet.size <= bSet.size ? [aSet, bSet] : [bSet, aSet]
  if (small.size === 0) return 0
  let shared = 0
  for (const s of small) if (big.has(s)) shared++
  return { ratio: shared / small.size, shared }
}

/**
 * Compute corpus-level redundancy + the top restated artifact pairs.
 *
 * @param {{path:string, text:string}[]} artifacts
 * @param {{k?:number, minContainment?:number, topPairs?:number}} opts
 */
export function redundancy(artifacts, opts = {}) {
  const k = opts.k || DEFAULT_K
  const minContainment = opts.minContainment ?? 0.15
  const topN = opts.topPairs || 12

  const lists = artifacts.map((a) => ({ path: a.path, list: shingleList(a.text, k) }))
  const sets = lists.map(({ path, list }) => ({ path, set: new Set(list) }))

  // Corpus redundancy: count every shingle OCCURRENCE across all artifacts (the
  // multiset — so a section restated within a file AND a section duplicated across
  // files both register). A shingle seen N times contributes (N-1) duplicate hits.
  const seen = new Map()
  let total = 0
  for (const { list } of lists) {
    for (const sh of list) {
      total++
      seen.set(sh, (seen.get(sh) || 0) + 1)
    }
  }
  let duplicated = 0
  for (const count of seen.values()) if (count > 1) duplicated += count - 1
  const pct = total === 0 ? 0 : Math.round((duplicated / total) * 1000) / 10

  // Per-artifact self-redundancy (intra-file restatement), surfaced for the
  // scorecard / view — the always-on CLAUDE.md's own number is the headline one.
  const selfByPath = {}
  for (const { path, list } of lists) {
    const distinct = new Set(list).size
    const repeated = list.length - distinct
    selfByPath[path] = list.length === 0 ? 0 : Math.round((repeated / list.length) * 1000) / 10
  }

  // Top restated pairs by containment (the actionable "X echoes Y" list).
  const pairs = []
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const c = containment(sets[i].set, sets[j].set)
      if (c.ratio >= minContainment) {
        pairs.push({
          a: sets[i].path,
          b: sets[j].path,
          containment: Math.round(c.ratio * 1000) / 10,
          shared: c.shared
        })
      }
    }
  }
  pairs.sort((x, y) => y.containment - x.containment)

  return {
    shingleSize: k,
    pct, // % of all shingle occurrences that are duplicates (intra + cross file)
    totalShingles: total,
    uniqueShingles: seen.size,
    duplicatedShingles: duplicated,
    selfByPath, // path → intra-file restatement %
    topPairs: pairs.slice(0, topN)
  }
}
