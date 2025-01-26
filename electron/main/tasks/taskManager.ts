import type { Scheduler } from './scheduler'
import { remove } from 'lodash-es'

interface TaskManagerConfig {
  tasks?: Scheduler[]
}

export function createTaskManager(userConfig: TaskManagerConfig) {
  let tasks = userConfig.tasks ?? []

  function addTask(task: Scheduler) {
    tasks.push(task)
  }

  function removeTask(task: Scheduler) {
    tasks = remove(tasks, task)
  }

  function startAllTasks() {
    tasks.forEach(task => task.start())
  }

  function stopAllTasks() {
    tasks.forEach(task => task.stop())
  }

  return {
    addTask,
    removeTask,
    startAllTasks,
    stopAllTasks,
  }
}
