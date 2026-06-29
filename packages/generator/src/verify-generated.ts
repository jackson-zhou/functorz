import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { demoProject } from '@functorz/schema/fixtures'
import { generateProject } from './index.js'

const directory = await mkdtemp(join(tmpdir(), 'functorz-export-'))
for (const [path, content] of generateProject(demoProject).files) {
  const target = join(directory, path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content)
}
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
await symlink(join(workspace, 'apps/runtime/node_modules'), join(directory, 'node_modules'), 'dir')
for (const platform of ['h5', 'weapp'])
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(join(directory, 'node_modules/.bin/taro'), ['build', '--type', platform], {
      cwd: directory,
      stdio: 'inherit',
    })
    child.on('exit', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${platform} build exited ${code}`)),
    )
  })
