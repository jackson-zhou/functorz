export interface WorkerStatus {
  service: 'worker'
  status: 'idle'
}

export function getWorkerStatus(): WorkerStatus {
  return {
    service: 'worker',
    status: 'idle',
  }
}
