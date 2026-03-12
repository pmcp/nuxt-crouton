export function useBranchColors() {
  const palette = [
    { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-300 dark:border-violet-700', text: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
    { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    { bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-600 dark:text-pink-400', dot: 'bg-pink-500' },
    { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500' },
    { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  ]

  const mainColor = { bg: '', border: '', text: 'text-neutral-400 dark:text-neutral-500', dot: 'bg-neutral-400' }

  function getBranchColor(branchName?: string | null) {
    if (!branchName || branchName === 'main') return mainColor
    let hash = 0
    for (let i = 0; i < branchName.length; i++) {
      hash = ((hash << 5) - hash + branchName.charCodeAt(i)) | 0
    }
    return palette[Math.abs(hash) % palette.length]
  }

  return { getBranchColor }
}
