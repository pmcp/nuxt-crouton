/**
 * @crouton-generated
 * @collection tasks
 * @layer demo
 *
 * Demo collection for testing Studio scanner
 */

export interface DemoTask {
  id: string
  teamId: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  assigneeId?: string
  dueDate?: Date | null
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

export type NewDemoTask = Omit<DemoTask, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
