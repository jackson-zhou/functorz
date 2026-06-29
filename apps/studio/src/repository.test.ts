import { describe, expect, it, vi } from 'vitest'
import { demoProject } from '@functorz/schema/fixtures'
import { FallbackProjectRepository, MemoryProjectRepository, scheduleAutoSave } from './repository'

describe('local project repository', () => {
  it('stores isolated valid project snapshots', async () => {
    const repository = new MemoryProjectRepository()
    await repository.save(demoProject)
    const record = await repository.get(demoProject.id)
    expect(record?.project).toEqual(demoProject)
    expect(record?.project).not.toBe(demoProject)
  })
  it('falls back when the wasm repository cannot open', async () => {
    const fallback = new MemoryProjectRepository()
    const failed = { list: vi.fn().mockRejectedValue(new Error('open failed')) } as never
    const repository = new FallbackProjectRepository(failed, fallback)
    expect(await repository.list()).toEqual([])
  })
  it('debounces rapid saves', async () => {
    vi.useFakeTimers()
    const repository = new MemoryProjectRepository()
    const save = vi.spyOn(repository, 'save')
    const schedule = scheduleAutoSave(repository, 200)
    schedule(demoProject, vi.fn())
    schedule(demoProject, vi.fn())
    schedule(demoProject, vi.fn())
    await vi.advanceTimersByTimeAsync(201)
    expect(save).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
