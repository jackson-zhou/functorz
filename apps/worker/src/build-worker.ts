import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { generateProject } from '@functorz/generator'
import type { ProjectSchema } from '@functorz/schema'
export type Stage =
  'queued' | 'generating' | 'building' | 'uploading' | 'success' | 'failed' | 'cancelled'
export interface PreviewOptions {
  version: string
  description: string
  pagePath?: string
  searchQuery?: string
}
export interface WeChatCiProvider {
  preview(directory: string, options: PreviewOptions): Promise<string>
}
export interface BuildRequest {
  id: string
  project: ProjectSchema
  options: PreviewOptions
  signal?: AbortSignal
}
export interface BuildResult {
  id: string
  status: Stage
  qrCode?: string
  error?: { stage: Stage; message: string }
  stages: Stage[]
}
export class MockWeChatCiProvider implements WeChatCiProvider {
  async preview(_directory: string, options: PreviewOptions) {
    return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><rect width="220" height="220" fill="white"/><text x="20" y="110">Mock QR ${escapeXml(options.version)}</text></svg>`).toString('base64')}`
  }
}
export class MiniprogramCiProvider implements WeChatCiProvider {
  constructor(
    private appId: string,
    private privateKeyPath: string,
  ) {}
  async preview(directory: string, options: PreviewOptions) {
    const ci = await import('miniprogram-ci')
    const project = new ci.Project({
      appid: this.appId,
      type: 'miniProgram',
      projectPath: directory,
      privateKeyPath: this.privateKeyPath,
      ignores: ['node_modules/**/*'],
    })
    const result = await ci.preview({
      project,
      desc: options.description,
      setting: { es6: true, minify: true },
      qrcodeFormat: 'base64',
      qrcodeOutputDest: undefined,
      pagePath: options.pagePath,
      searchQuery: options.searchQuery,
    })
    const base64 = (result as { qrcode?: string }).qrcode
    if (!base64) throw new Error('WeChat CI did not return a QR code')
    return `data:image/png;base64,${base64}`
  }
}
export class BuildWorker {
  constructor(
    private provider: WeChatCiProvider,
    private timeoutMs = 10 * 60_000,
  ) {}
  async process(request: BuildRequest): Promise<BuildResult> {
    const stages: Stage[] = ['queued']
    let stage: Stage = 'generating'
    let directory: string | undefined
    try {
      request.signal?.throwIfAborted()
      stages.push(stage)
      directory = await mkdtemp(join(tmpdir(), 'functorz-build-'))
      const generated = generateProject(request.project)
      for (const [path, content] of generated.files) {
        const target = join(directory, path)
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, content)
      }
      stage = 'building'
      stages.push(stage)
      const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
      const modules = process.env.TARO_NODE_MODULES ?? join(workspace, 'apps/runtime/node_modules')
      await symlink(modules, join(directory, 'node_modules'), 'dir')
      await withTimeout(runTaro(directory, request.signal), this.timeoutMs)
      request.signal?.throwIfAborted()
      stage = 'uploading'
      stages.push(stage)
      const qrCode = await withTimeout(
        this.provider.preview(directory, request.options),
        this.timeoutMs,
      )
      stages.push('success')
      return { id: request.id, status: 'success', qrCode, stages }
    } catch (error) {
      const cancelled = request.signal?.aborted
      stages.push(cancelled ? 'cancelled' : 'failed')
      return {
        id: request.id,
        status: cancelled ? 'cancelled' : 'failed',
        error: { stage, message: redact(error instanceof Error ? error.message : String(error)) },
        stages,
      }
    } finally {
      if (directory) await rm(directory, { recursive: true, force: true })
    }
  }
}
function runTaro(directory: string, signal?: AbortSignal) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(join(directory, 'node_modules/.bin/taro'), ['build', '--type', 'weapp'], {
      cwd: directory,
      stdio: ['ignore', 'ignore', 'pipe'],
      signal,
    })
    let error = ''
    child.stderr.on('data', (chunk) => {
      error = `${error}${String(chunk)}`.slice(-4000)
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`Taro build failed (${code}): ${error}`)),
    )
  })
}
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Build stage timed out')), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
function redact(value: string) {
  return value.replace(/(private[_ -]?key|token|secret|password)\s*[=:]\s*\S+/gi, '$1=[REDACTED]')
}
function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, '')
}
