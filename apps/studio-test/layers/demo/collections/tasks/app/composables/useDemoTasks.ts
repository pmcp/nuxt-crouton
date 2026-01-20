/**
 * Demo Tasks composable
 * Placeholder for testing Studio scanner
 */

export function useDemoTasks() {
  const tasks = ref<any[]>([])
  const loading = ref(false)

  return {
    tasks,
    loading
  }
}
