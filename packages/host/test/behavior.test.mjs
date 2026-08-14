import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PassThrough } from 'node:stream'
import {
  apply, name, Config, CONFIG_ROUTE, EFFORT_IDS, SETTINGS_NAMESPACE,
} from '../lib/index.js'

let home
const routes = []
let serviceHandler
let webServerAvailable = false

/** In-memory settings scope mirroring the harness SettingsScope surface. */
function makeSettingsScope(initial) {
  let value = { ...initial }
  return {
    get: () => value,
    watch: () => () => {},
    update: async (patch) => { value = { ...value, ...patch } },
    replace: async (section) => { value = { ...section } },
  }
}

function install(config, sectionValue) {
  if (home === undefined) {
    home = mkdtempSync(join(tmpdir(), 'dsh-effort-test-'))
    process.env.DSH_HOME = home
  }
  let requestHandler
  let toolDef
  const starts = []
  const scope = makeSettingsScope(sectionValue ?? {})
  const ctx = {
    logger: { warn: () => {}, info: () => {} },
    effect: (fn) => {
      const disposer = fn()
      return () => { if (typeof disposer === 'function') disposer() }
    },
    on: (event, fn) => {
      if (event === 'agent/request') {
        requestHandler = fn
        return
      }
      if (event === 'internal/service') {
        serviceHandler = fn
        return
      }
      throw new Error(`unexpected event ${event}`)
    },
    get: (key) => {
      if (key === 'jobs') return undefined
      if (key === 'webServer') {
        return webServerAvailable ? { register: (route) => { routes.push(route) } } : undefined
      }
      return undefined
    },
    settings: {
      register: (ns, schema, _options) => {
        assert.equal(ns, SETTINGS_NAMESPACE)
        assert.equal(schema, undefined || schema) // schema identity is loose; namespace matters
        return scope
      },
    },
    tools: {
      register: (def) => {
        toolDef = def
        return () => {}
      },
    },
    subagents: {
      start: async (provider, request) => {
        starts.push({ provider, request })
        return {
          id: 'run-1',
          result: Promise.resolve({ stopReason: 'completed', output: [{ type: 'text', text: 'hi' }] }),
          dispose: async () => {},
        }
      },
    },
  }
  apply(ctx, config)
  assert.ok(requestHandler, 'plugin registered an agent/request listener')
  assert.ok(toolDef, 'plugin registered a delegation tool')
  return { requestHandler, toolDef, starts, scope }
}

/** Simulate the webServer service being provided after apply. */
function makeWebServerAvailable() {
  webServerAvailable = true
  if (serviceHandler !== undefined) serviceHandler('webServer')
}

test.afterEach(() => {
  if (home !== undefined) {
    rmSync(home, { recursive: true, force: true })
    home = undefined
  }
  delete process.env.DSH_HOME
  routes.length = 0
  serviceHandler = undefined
  webServerAvailable = false
})

const fakeExec = () => ({
  agent: { options: { subagentDepth: 1 } },
  signal: new AbortController().signal,
})

test('exports the expected plugin name and effort ids', () => {
  assert.equal(name, 'subagent-effort')
  assert.deepEqual(EFFORT_IDS, ['low', 'medium', 'high', 'max'])
})

// ---- part 1: agent/request listener ----

test('subagent with config model+effort: request config is rewritten', async () => {
  const { requestHandler } = install({ model: 'deepseek-v4-flash', reasoningEffort: 'high' })
  const out = await requestHandler(
    { agent: { options: { subagentDepth: 1 } } },
    async () => ({ provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'max', maxTokens: 8192 }),
  )
  assert.equal(out.model, 'deepseek-v4-flash')
  assert.equal(out.reasoningEffort, 'high')
  assert.equal(out.provider, 'deepseek-official')
  assert.equal(out.maxTokens, 8192)
})

test('subagent with empty config: request config unchanged', async () => {
  const { requestHandler } = install({})
  const base = { provider: 'p', model: 'm', reasoningEffort: 'max' }
  const out = await requestHandler({ agent: { options: { subagentDepth: 2 } } }, async () => ({ ...base }))
  assert.deepEqual(out, base)
})

test('root agent is untouched even with config', async () => {
  const { requestHandler } = install({ model: 'x', reasoningEffort: 'low' })
  const base = { provider: 'p', model: 'parent', reasoningEffort: 'max' }
  const out = await requestHandler({ agent: { options: {} } }, async () => ({ ...base }))
  assert.deepEqual(out, base)
})

test('per-child AgentOptions.reasoningEffort wins over config', async () => {
  const { requestHandler } = install({ model: 'm2', reasoningEffort: 'high' })
  const out = await requestHandler(
    { agent: { options: { subagentDepth: 1, reasoningEffort: 'low' } } },
    async () => ({ provider: 'p', model: 'm', reasoningEffort: 'max' }),
  )
  assert.equal(out.reasoningEffort, 'low')
  assert.equal(out.model, 'm2')
})

test('invalid config fails loud', () => {
  assert.throws(() => install({ reasoningEffort: 'ultra' }), /must be one of/)
  assert.throws(() => install({ model: 42 }), /must be a string/)
})

// ---- settings section (GUI / config-document) precedence ----

test('settings section values win over loader config', async () => {
  const { requestHandler } = install(
    { model: 'flash', reasoningEffort: 'high' },
    { model: 'deepseek-v4-pro', reasoningEffort: 'max' },
  )
  const out = await requestHandler(
    { agent: { options: { subagentDepth: 1 } } },
    async () => ({ provider: 'p', model: 'parent', reasoningEffort: 'medium' }),
  )
  assert.equal(out.model, 'deepseek-v4-pro')
  assert.equal(out.reasoningEffort, 'max')
})

test('empty settings section falls back to loader config', async () => {
  const { requestHandler } = install({ model: 'flash', reasoningEffort: 'low' }, {})
  const out = await requestHandler(
    { agent: { options: { subagentDepth: 1 } } },
    async () => ({ provider: 'p', model: 'parent', reasoningEffort: 'medium' }),
  )
  assert.equal(out.model, 'flash')
  assert.equal(out.reasoningEffort, 'low')
})

test('per-child effort still beats settings section and config', async () => {
  const { requestHandler } = install(
    { reasoningEffort: 'medium' },
    { reasoningEffort: 'max' },
  )
  const out = await requestHandler(
    { agent: { options: { subagentDepth: 1, reasoningEffort: 'low' } } },
    async () => ({ provider: 'p', model: 'm', reasoningEffort: 'medium' }),
  )
  assert.equal(out.reasoningEffort, 'low')
})

test('empty section leaves the request untouched', async () => {
  const { requestHandler } = install({}, undefined)
  const base = { provider: 'p', model: 'parent', reasoningEffort: 'medium' }
  const out = await requestHandler({ agent: { options: { subagentDepth: 1 } } }, async () => ({ ...base }))
  assert.deepEqual(out, base)
})

// ---- legacy config file migration ----

test('migrates the legacy subagent-effort.json into the settings section', async () => {
  home = mkdtempSync(join(tmpdir(), 'dsh-effort-test-'))
  process.env.DSH_HOME = home
  writeFileSync(join(home, 'subagent-effort.json'), JSON.stringify({ model: 'legacy-model', reasoningEffort: 'low' }))
  webServerAvailable = true
  const { scope } = install({})
  // Trigger the lazy migration through the config route GET.
  const route = routes[0]
  let status = 0
  let payload = ''
  const res = {
    writeHead: (code) => { status = code },
    end: (body) => { payload = body },
  }
  await route.handler({ method: 'GET' }, res)
  assert.equal(status, 200)
  assert.deepEqual(JSON.parse(payload), { model: 'legacy-model', reasoningEffort: 'low' })
  assert.deepEqual(scope.get(), { model: 'legacy-model', reasoningEffort: 'low' })
  assert.equal(existsSync(join(home, 'subagent-effort.json')), false)
})

// ---- Config schema (loader validation surface) ----

test('Config schema validates good config and applies defaults', () => {
  const result = Config['~standard'].validate({ reasoningEffort: 'high' })
  assert.ok(!result.issues, JSON.stringify(result.issues))
  assert.equal(result.value.provider, 'spawn')
  assert.equal(result.value.toolName, 'subagent_select')
  assert.equal(result.value.reasoningEffort, 'high')
  assert.equal(result.value.model, undefined)
})

test('Config schema rejects an unknown effort id', () => {
  const result = Config['~standard'].validate({ reasoningEffort: 'ultra' })
  assert.ok(result.issues)
  assert.equal(result.value, undefined)
})

// ---- config HTTP routes ----

test('registers the config route when webServer is present at apply', () => {
  webServerAvailable = true
  install({})
  assert.equal(routes.length, 1)
  const route = routes[0]
  assert.equal(route.kind, 'exact')
  assert.equal(route.path, CONFIG_ROUTE)
})

test('registers the config route when webServer appears later', () => {
  install({})
  assert.equal(routes.length, 0, 'no routes before the service appears')
  makeWebServerAvailable()
  assert.equal(routes.length, 1)
  assert.equal(routes[0].path, CONFIG_ROUTE)
})

test('route GET returns the stored section', async () => {
  webServerAvailable = true
  install({}, { model: 'm1', reasoningEffort: 'high' })
  const route = routes[0]
  let status = 0
  let payload = ''
  const res = {
    writeHead: (code) => { status = code },
    end: (body) => { payload = body },
  }
  await route.handler({ method: 'GET' }, res)
  assert.equal(status, 200)
  assert.deepEqual(JSON.parse(payload), { model: 'm1', reasoningEffort: 'high' })
})

test('route POST writes the section and answers 200', async () => {
  webServerAvailable = true
  const { scope } = install({})
  const route = routes[0]
  let status = 0
  let payload = ''
  const res = {
    writeHead: (code) => { status = code },
    end: (body) => { payload = body },
  }
  const req = new PassThrough()
  req.method = 'POST'
  const handlerPromise = route.handler(req, res)
  req.end(JSON.stringify({ model: 'deepseek-v4-flash', reasoningEffort: 'low' }))
  await handlerPromise
  assert.equal(status, 200)
  assert.equal(JSON.parse(payload).ok, true)
  assert.deepEqual(scope.get(), { model: 'deepseek-v4-flash', reasoningEffort: 'low' })
})

test('route POST with empty strings clears the fields', async () => {
  webServerAvailable = true
  const { scope } = install({}, { model: 'm1', reasoningEffort: 'high' })
  const route = routes[0]
  let status = 0
  const res = {
    writeHead: (code) => { status = code },
    end: () => {},
  }
  const req = new PassThrough()
  req.method = 'POST'
  const handlerPromise = route.handler(req, res)
  req.end(JSON.stringify({ model: '', reasoningEffort: '' }))
  await handlerPromise
  assert.equal(status, 200)
  assert.deepEqual(scope.get(), {})
})

test('route POST rejects an invalid body', async () => {
  webServerAvailable = true
  install({})
  const route = routes[0]
  let status = 0
  const res = {
    writeHead: (code) => { status = code },
    end: () => {},
  }
  const req = new PassThrough()
  req.method = 'POST'
  const handlerPromise = route.handler(req, res)
  req.end(JSON.stringify({ reasoningEffort: 'ultra' }))
  await handlerPromise
  assert.equal(status, 400)
})

// ---- part 2: subagent_select tool ----

test('tool registers with the configured name and model/effort parameters', () => {
  const { toolDef } = install({})
  assert.equal(toolDef.name, 'subagent_select')
  assert.equal(toolDef.parameters.properties.model.type, 'string')
  assert.deepEqual(toolDef.parameters.properties.reasoningEffort.enum, EFFORT_IDS)
  const renamed = install({ toolName: 'delegate' })
  assert.equal(renamed.toolDef.name, 'delegate')
})

test('execute forwards chosen model+effort through agentOptions', async () => {
  const { toolDef, starts } = install({})
  const result = await toolDef.execute(
    { description: 'do it', prompt: 'task', model: 'deepseek-v4-flash', reasoningEffort: 'low' },
    fakeExec(),
  )
  assert.equal(result.kind, 'foreground')
  assert.equal(starts.length, 1)
  assert.equal(starts[0].provider, 'spawn')
  assert.deepEqual(starts[0].request.agentOptions, { model: 'deepseek-v4-flash', reasoningEffort: 'low' })
})

test('execute with no selection passes no agentOptions and inherits nothing extra', async () => {
  const { toolDef, starts } = install({})
  await toolDef.execute({ description: 'do it', prompt: 'task' }, fakeExec())
  assert.equal(starts[0].request.agentOptions, undefined)
  assert.equal(starts[0].request.prompt[0].text, 'task')
})

test('execute rejects an invalid reasoningEffort', async () => {
  const { toolDef } = install({})
  await assert.rejects(
    toolDef.execute({ description: 'do it', prompt: 'task', reasoningEffort: 'ultra' }, fakeExec()),
    /must be one of/,
  )
})

test('execute requires a calling agent', async () => {
  const { toolDef } = install({})
  await assert.rejects(
    toolDef.execute({ description: 'do it', prompt: 'task' }, { signal: new AbortController().signal }),
    /requires a calling agent/,
  )
})

test('execute surfaces a non-completed stop reason as a failure', async () => {
  let captured
  const ctxOverride = {
    logger: { warn: () => {}, info: () => {} },
    effect: (fn) => {
      const disposer = fn()
      return () => { if (typeof disposer === 'function') disposer() }
    },
    on: () => {},
    get: (key) => {
      if (key === 'webServer') return { register: (route) => { routes.push(route) } }
      return undefined
    },
    settings: { register: () => makeSettingsScope({}) },
    tools: { register: (def) => { captured = def } },
    subagents: { start: async () => ({ id: 'r2', result: Promise.resolve({ stopReason: 'max-tokens', output: [] }), dispose: async () => {} }) },
  }
  apply(ctxOverride, {})
  await assert.rejects(
    captured.execute({ description: 'do it', prompt: 'task' }, fakeExec()),
    /token limit/,
  )
})
