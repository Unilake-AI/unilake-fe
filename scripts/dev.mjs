import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { parseEnv } from 'node:util'

const require = createRequire(import.meta.url)
const envFile = new URL('../.env.local', import.meta.url)
const localEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}
const hostname = (process.env.UNILAKE_DEV_HOST ?? localEnv.UNILAKE_DEV_HOST)?.trim()

const args = [require.resolve('next/dist/bin/next'), 'dev', '--turbopack']
if (hostname) args.push('--hostname', hostname)

const server = spawn(process.execPath, [...args, ...process.argv.slice(2)], { stdio: 'inherit' })
server.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
