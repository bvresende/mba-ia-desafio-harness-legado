import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../..')

const PRE_COMMIT = process.argv.includes('--pre-commit')

const violations = new Map()
const internalErrors = []

function toRepoRel(filePath, baseDir = REPO_ROOT) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(baseDir, filePath)
  return path.relative(REPO_ROOT, abs).split(path.sep).join('/')
}

function addViolation(id, target, detail = '') {
  const cleanTarget = target.split(path.sep).join('/').replace(/^\.\//, '')
  const key = `${id}\0${cleanTarget}\0${detail}`
  if (!violations.has(key)) {
    violations.set(key, { id, target: cleanTarget, detail })
  }
}

function runBin(binPath, args, cwd = REPO_ROOT, extraEnv = {}) {
  const result = spawnSync(binPath, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, ...extraEnv },
  })
  if (result.error) {
    internalErrors.push(`Falha ao executar ${binPath}: ${result.error.message}`)
  }
  return result
}

function runTscGate(subproject) {
  const cwd = path.join(REPO_ROOT, subproject)
  const tscBin = path.join(cwd, 'node_modules', '.bin', 'tsc')
  if (!fs.existsSync(tscBin)) {
    internalErrors.push(`G1: binário não encontrado em ${toRepoRel(tscBin)}`)
    return
  }

  const res = runBin(tscBin, ['-p', 'tsconfig.json', '--noEmit', '--pretty', 'false'], cwd)
  const combined = `${res.stdout || ''}\n${res.stderr || ''}`
  const tsErrorRe = /^(.+?)\(\d+,\d+\):\s+error\s+TS\d+:/gm
  let matched = false
  let match
  while ((match = tsErrorRe.exec(combined)) !== null) {
    matched = true
    addViolation('G1', toRepoRel(match[1], cwd))
  }

  if (res.status !== 0 && !matched) {
    internalErrors.push(
      `G1 (${subproject}): tsc falhou com código ${res.status}: ${combined.trim()}`
    )
  }
}

function runEslintGates() {
  const eslintBin = path.join(REPO_ROOT, 'node_modules', '.bin', 'eslint')
  if (!fs.existsSync(eslintBin)) {
    internalErrors.push(`G2/G5/G12: binário não encontrado em ${toRepoRel(eslintBin)}`)
    return
  }

  const res = runBin(eslintBin, [
    '--no-error-on-unmatched-pattern',
    '--max-warnings',
    '0',
    '--format',
    'json',
    'api/src/**/*.{ts,tsx}',
    'web/src/**/*.{ts,tsx}',
  ])

  let results
  try {
    results = JSON.parse(res.stdout || '[]')
  } catch (err) {
    internalErrors.push(
      `G2/G5/G12: saída inválida do eslint (código ${res.status}): ${err.message}\n${(res.stderr || res.stdout || '').trim()}`
    )
    return
  }

  if (!Array.isArray(results)) {
    internalErrors.push('G2/G5/G12: formato JSON inesperado do eslint')
    return
  }

  let sawMessage = false
  for (const entry of results) {
    const rel = toRepoRel(entry.filePath)
    for (const msg of entry.messages || []) {
      sawMessage = true
      const text = msg.message || ''
      if (text.includes('[G5]')) {
        if (!PRE_COMMIT) addViolation('G5', rel)
      } else if (text.includes('[G12]')) {
        if (!PRE_COMMIT) addViolation('G12', rel)
      } else {
        addViolation('G2', rel)
      }
    }
  }

  if (res.status !== 0 && !sawMessage) {
    internalErrors.push(
      `G2/G5/G12: eslint retornou código ${res.status} sem mensagens: ${(res.stderr || '').trim()}`
    )
  }
}

function runVitestGate() {
  const apiDir = path.join(REPO_ROOT, 'api')
  const vitestBin = path.join(apiDir, 'node_modules', '.bin', 'vitest')
  if (!fs.existsSync(vitestBin)) {
    internalErrors.push(`G3: binário não encontrado em ${toRepoRel(vitestBin)}`)
    return
  }

  const tmpOut = path.join(
    os.tmpdir(),
    `balcao-vitest-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  )

  try {
    const res = runBin(
      vitestBin,
      ['run', '--reporter=json', `--outputFile=${tmpOut}`],
      apiDir,
      { NODE_ENV: 'test' }
    )

    if (!fs.existsSync(tmpOut)) {
      internalErrors.push(
        `G3: vitest não gerou relatório JSON (código ${res.status}): ${(res.stderr || res.stdout || '').trim()}`
      )
      return
    }

    const report = JSON.parse(fs.readFileSync(tmpOut, 'utf8'))
    let recordedFailure = false
    for (const suite of report.testResults || []) {
      const hasFailedAssertion = (suite.assertionResults || []).some(
        (a) => a.status === 'failed'
      )
      if (suite.status === 'failed' || hasFailedAssertion) {
        recordedFailure = true
        addViolation('G3', toRepoRel(suite.name, apiDir))
      }
    }

    if ((res.status !== 0 || report.success === false) && !recordedFailure) {
      internalErrors.push(
        `G3: vitest falhou com código ${res.status} sem suíte marcada como failed`
      )
    }
  } catch (err) {
    internalErrors.push(`G3: falha ao processar saída do vitest: ${err.message}`)
  } finally {
    if (fs.existsSync(tmpOut)) {
      fs.rmSync(tmpOut, { force: true })
    }
  }
}

function runDepcruiseGates() {
  const depcruiseBin = path.join(REPO_ROOT, 'node_modules', '.bin', 'depcruise')
  if (!fs.existsSync(depcruiseBin)) {
    internalErrors.push(`G4/G6/G7/G8/G9/G11: binário não encontrado em ${toRepoRel(depcruiseBin)}`)
    return
  }

  const res = runBin(depcruiseBin, [
    '--config',
    '.dependency-cruiser.cjs',
    '--output-type',
    'json',
    'api/src',
    'web/src',
  ])

  let data
  try {
    data = JSON.parse(res.stdout || '{}')
  } catch (err) {
    internalErrors.push(
      `G4/G6/G7/G8/G9/G11: saída inválida do depcruise (código ${res.status}): ${err.message}\n${(res.stderr || res.stdout || '').trim()}`
    )
    return
  }

  const list = data?.summary?.violations || []
  for (const v of list) {
    const ruleId = v?.rule?.name
    if (!ruleId) continue
    if (v.from) {
      addViolation(ruleId, toRepoRel(v.from))
    }
    if (ruleId === 'G9' && Array.isArray(v.cycle)) {
      for (const step of v.cycle) {
        const stepRel = step?.name ? toRepoRel(step.name) : ''
        if (/^(api\/src|web\/src)\//.test(stepRel)) {
          addViolation('G9', stepRel)
        }
      }
    }
  }

  if (res.status !== 0 && list.length === 0) {
    internalErrors.push(
      `G4/G6/G7/G8/G9/G11: depcruise retornou código ${res.status} sem violações: ${(res.stderr || '').trim()}`
    )
  }
}

function runKnipGate() {
  const knipBin = path.join(REPO_ROOT, 'node_modules', '.bin', 'knip')
  if (!fs.existsSync(knipBin)) {
    internalErrors.push(`G10: binário não encontrado em ${toRepoRel(knipBin)}`)
    return
  }

  const res = runBin(knipBin, [
    '--workspace',
    'api',
    '--workspace',
    'web',
    '--reporter',
    'json',
  ])

  let data
  try {
    data = JSON.parse(res.stdout || '{}')
  } catch (err) {
    internalErrors.push(
      `G10: saída inválida do knip (código ${res.status}): ${err.message}\n${(res.stderr || res.stdout || '').trim()}`
    )
    return
  }

  let recorded = false
  for (const f of data.files || []) {
    const filePath = typeof f === 'string' ? f : f?.name
    if (filePath) {
      recorded = true
      addViolation('G10', toRepoRel(filePath))
    }
  }

  for (const issue of data.issues || []) {
    const issueFile = issue.file ? toRepoRel(issue.file) : ''

    for (const f of issue.files || []) {
      const filePath = typeof f === 'string' ? f : f?.name || issueFile
      if (filePath) {
        recorded = true
        addViolation('G10', toRepoRel(filePath))
      }
    }

    for (const exp of issue.exports || []) {
      if (issueFile && exp?.name) {
        recorded = true
        addViolation('G10', issueFile, `(export sem uso: ${exp.name})`)
      }
    }

    for (const typ of issue.types || []) {
      if (issueFile && typ?.name) {
        recorded = true
        addViolation('G10', issueFile, `(export sem uso: ${typ.name})`)
      }
    }

    for (const member of issue.enumMembers || []) {
      if (issueFile && member?.name) {
        recorded = true
        addViolation('G10', issueFile, `(membro sem uso: ${member.name})`)
      }
    }

    for (const member of issue.namespaceMembers || []) {
      if (issueFile && member?.name) {
        recorded = true
        addViolation('G10', issueFile, `(membro sem uso: ${member.name})`)
      }
    }

    if (Array.isArray(issue.duplicates) && issue.duplicates.length > 0 && issueFile) {
      recorded = true
      addViolation('G10', issueFile, '(export duplicado)')
    }

    for (const depList of [
      issue.dependencies,
      issue.devDependencies,
      issue.optionalPeerDependencies,
    ]) {
      for (const dep of depList || []) {
        const depName = typeof dep === 'string' ? dep : dep?.name
        if (issueFile && depName) {
          recorded = true
          addViolation('G10', issueFile, `${depName} (dependência sem uso)`)
        }
      }
    }
  }

  if (res.status !== 0 && !recorded) {
    internalErrors.push(
      `G10: knip retornou código ${res.status} sem issues mapeadas: ${(res.stderr || '').trim()}`
    )
  }
}

function ruleOrder(id) {
  const num = Number(id.replace(/^G/, ''))
  return Number.isNaN(num) ? 999 : num
}

runTscGate('api')
runTscGate('web')
runEslintGates()

if (!PRE_COMMIT) {
  runVitestGate()
  runDepcruiseGates()
  runKnipGate()
}

const sorted = Array.from(violations.values()).sort((a, b) => {
  const diff = ruleOrder(a.id) - ruleOrder(b.id)
  if (diff !== 0) return diff
  const targetDiff = a.target.localeCompare(b.target)
  if (targetDiff !== 0) return targetDiff
  return a.detail.localeCompare(b.detail)
})

if (sorted.length > 0) {
  console.log(
    PRE_COMMIT
      ? 'Pre-commit bloqueado — violações encontradas:'
      : 'Violações encontradas nos gates:'
  )
  for (const v of sorted) {
    console.log(v.detail ? `${v.id} ${v.target} ${v.detail}` : `${v.id} ${v.target}`)
  }
  console.log(`Total: ${sorted.length} violação(ões).`)
}

if (internalErrors.length > 0) {
  for (const err of internalErrors) {
    console.error(`ERRO INTERNO: ${err}`)
  }
  process.exit(1)
}

if (sorted.length > 0) {
  process.exit(1)
}

console.log(PRE_COMMIT ? 'Pre-commit OK (G1, G2).' : 'Gates OK (G1–G12): 0 violações.')
process.exit(0)
