/**
 * dsh-subagent-effort — let subagents run with their own model and reasoning
 * effort, decided at RUNTIME by the GUI settings card, by the settings
 * document (`settings.yaml` section `subagent-effort` — visible via
 * Settings → Plugins → "open config document"), by loader config
 * (composition defaults), or by the PARENT MODEL per delegation (the
 * `subagent_select` tool).
 *
 * Config transport: the API gateway only exposes WHITELISTED namespaces to
 * the web client, so the CLIENT talks to this plugin's own `ctx.webServer`
 * routes (GET/POST /subagent-effort/config); the HOST stores the values in a
 * registered settings namespace, which lands in settings.yaml and is hot-
 * reloaded on external edits. The card and direct file edits share one store.
 *
 * Two independent parts, both on documented extension points:
 *
 * 1. `agent/request` waterfall listener: for subagent children
 *    (`AgentOptions.subagentDepth >= 1`) rewrites the resolved call config's
 *    `model` / `reasoningEffort`. Root agents are untouched.
 *    Precedence per child:
 *      effort:  child AgentOptions.reasoningEffort (per-call) >
 *               settings section > loader Config > inherit
 *      model:   settings section > loader Config > request as-is
 *
 * 2. `subagent_select` model-facing tool: like the built-in `subagent` tool
 *    but with optional `model` and `reasoningEffort` parameters, so the
 *    parent model picks the child's model and thinking effort per call.
 */

import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

export const name = 'subagent-effort'
export const inject = ['tools', 'subagents', 'settings']

/** Settings namespace (settings.yaml section) shared with the GUI card. */
export const SETTINGS_NAMESPACE = 'subagent-effort'
/** HTTP route serving the config to the browser. */
export const CONFIG_ROUTE = '/subagent-effort/config'
/** Legacy config file migrated into the settings namespace on first load. */
const LEGACY_CONFIG_FILENAME = 'subagent-effort.json'

/** Known reasoning-effort ids accepted in config and tool args. */
export const EFFORT_IDS = ['low', 'medium', 'high', 'max']

export const Config = z.object({
  /** Subagent default model id (part 1); omit to inherit the parent model. */
  model: z.string(),
  /** Subagent default reasoning effort (part 1); omit to inherit the parent effort. */
  reasoningEffort: z.union(EFFORT_IDS),
  /** Delegation provider used by `subagent_select` (part 2). */
  provider: z.string().default('spawn'),
  /** Model-facing tool name (part 2). */
  toolName: z.string().default('subagent_select'),
  /** Expose the `run_in_background` parameter on `subagent_select`. */
  enableRunInBackground: z.boolean().default(true),
})

/** Schema of the settings namespace section. */
export const SettingsSchema = z.object({
  model: z.string(),
  reasoningEffort: z.union(EFFORT_IDS),
})

/** Default delegation provider for the model-facing tool. */
const DEFAULT_PROVIDER = 'spawn'
/** Default model-facing tool name. */
const DEFAULT_TOOL_NAME = 'subagent_select'

function validateConfig(config) {
  const cfg = config ?? {}
  if (cfg.model !== undefined && typeof cfg.model !== 'string') {
    throw new Error('subagent-effort: config.model must be a string')
  }
  if (cfg.reasoningEffort !== undefined
    && (typeof cfg.reasoningEffort !== 'string' || !EFFORT_IDS.includes(cfg.reasoningEffort))) {
    throw new Error(`subagent-effort: config.reasoningEffort must be one of ${EFFORT_IDS.join(', ')}`)
  }
  if (cfg.provider !== undefined && typeof cfg.provider !== 'string') {
    throw new Error('subagent-effort: config.provider must be a string')
  }
  if (cfg.toolName !== undefined && typeof cfg.toolName !== 'string') {
    throw new Error('subagent-effort: config.toolName must be a string')
  }
  return {
    model: cfg.model,
    reasoningEffort: cfg.reasoningEffort,
    provider: cfg.provider ?? DEFAULT_PROVIDER,
    toolName: cfg.toolName ?? DEFAULT_TOOL_NAME,
    backgroundEnabled: cfg.enableRunInBackground !== false,
  }
}

/** Normalize a resolved section: empty strings and undefined mean "inherit". */
function normalizeSection(value) {
  const record = value ?? {}
  return {
    ...typeof record.model === 'string' && record.model !== '' ? { model: record.model } : {},
    ...typeof record.reasoningEffort === 'string' && record.reasoningEffort !== ''
      ? { reasoningEffort: record.reasoningEffort }
      : {},
  }
}

/** Validate a parsed POST body into a user section (absent keys = inherit). */
function parseConfigBody(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined
  const record = body
  const draft = {}
  if (record.model !== undefined) {
    if (typeof record.model !== 'string') return undefined
    // Empty string clears the field (the key stays out of the section).
    if (record.model !== '') draft.model = record.model
  }
  if (record.reasoningEffort !== undefined) {
    if (typeof record.reasoningEffort !== 'string') return undefined
    if (record.reasoningEffort !== '') {
      if (!EFFORT_IDS.includes(record.reasoningEffort)) return undefined
      draft.reasoningEffort = record.reasoningEffort
    }
  }
  const result = SettingsSchema['~standard'].validate(draft)
  if (result.issues !== undefined) return undefined
  return normalizeSection(result.value)
}

/** Read the request body (bounded) as JSON. */
function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 64 * 1024) {
        rejectBody(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks)
        resolveBody(raw.length === 0 ? {} : JSON.parse(raw.toString('utf8')))
      } catch (error) {
        rejectBody(error)
      }
    })
    req.on('error', rejectBody)
  })
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) })
  res.end(body)
}

/** Render text blocks from the canonical JSON block array. */
function outputValueText(values) {
  return (values ?? [])
    .filter((value) => typeof value === 'object' && value !== null && !Array.isArray(value)
      && value.type === 'text' && typeof value.text === 'string')
    .map((value) => value.text)
    .join('')
}

/** A stop reason other than `completed` means the child did not finish cleanly. */
function stopReasonError(result) {
  switch (result.stopReason) {
    case 'completed':
      return undefined
    case 'aborted':
      return 'subagent run was cancelled'
    case 'error':
      return 'subagent run failed'
    case 'max-tokens':
      return 'subagent run hit its token limit before finishing'
    case 'refusal':
      return 'subagent declined the task'
    default:
      return `subagent run ended abnormally (${String(result.stopReason)})`
  }
}

/** Collect and release one foreground run without letting disposal mask a failure. */
async function settleForegroundRun(run) {
  const [execution] = await Promise.allSettled([
    run.result.then((result) => {
      const error = stopReasonError(result)
      if (error !== undefined) throw new Error(error)
      return {
        kind: 'foreground',
        runId: run.id,
        output: result.output,
      }
    }),
  ])
  const [disposal] = await Promise.allSettled([Promise.resolve().then(() => run.dispose())])
  if (execution.status === 'rejected') throw execution.reason
  if (disposal.status === 'rejected') throw disposal.reason
  return execution.value
}

/** Settle a background start without rejecting the task producer contract. */
async function settleStart(start, signal) {
  try {
    return await (await start).result
  } catch {
    return signal.aborted
      ? { status: 'killed' }
      : { status: 'failed', detail: String(start) }
  }
}

export function apply(ctx, config = {}) {
  const { model, reasoningEffort, provider, toolName, backgroundEnabled } = validateConfig(config)
  const settings = ctx.settings.register(SETTINGS_NAMESPACE, SettingsSchema, {})

  // One-time lazy migration from the pre-0.4 config file into the settings
  // section. Runs on first use (a request or a config read), by which time the
  // settings file provider is mounted; a failed write is logged, not swallowed.
  let legacyMigrated = false
  const migrateLegacy = async () => {
    if (legacyMigrated) return
    legacyMigrated = true
    const legacyPath = join(resolveDshHome(), LEGACY_CONFIG_FILENAME)
    if (!existsSync(legacyPath)) return
    try {
      const legacy = JSON.parse(readFileSync(legacyPath, 'utf8'))
      const migrated = parseConfigBody(legacy)
      if (migrated !== undefined) await settings.replace(migrated)
    } catch (error) {
      ctx.logger.warn(`subagent-effort: legacy config migration failed: ${String(error)}`)
    }
    try {
      unlinkSync(legacyPath)
    } catch {
      // Best-effort cleanup; a lingering file is harmless.
    }
  }

  // Part 1: apply subagent model/effort at the request config level.
  ctx.on('agent/request', async (payload, next) => {
    void migrateLegacy()
    const resolved = await next()
    const options = payload.agent.options
    if (options.subagentDepth === undefined) return resolved
    const runtime = normalizeSection(settings.get())
    const effort = options.reasoningEffort ?? runtime.reasoningEffort ?? reasoningEffort
    const targetModel = runtime.model ?? model
    if (targetModel === undefined && effort === undefined) return resolved
    const { reasoningEffort: _inherited, ...rest } = resolved
    return {
      ...rest,
      ...(targetModel !== undefined ? { model: targetModel } : {}),
      ...(effort !== undefined ? { reasoningEffort: effort } : {}),
    }
  })

  // Config routes for the settings card. The webServer service may not be
  // provided yet when this plugin's apply runs (load order), so if it is
  // absent we wait for `internal/service` to announce it — the headless
  // profile has no webserver, so the routes must not block activation.
  let routesRegistered = false
  const registerRoutes = (webserver) => {
    if (routesRegistered) return
    routesRegistered = true
    ctx.effect(() => webserver.register({
      kind: 'exact',
      path: CONFIG_ROUTE,
      handler: async (req, res) => {
        await migrateLegacy()
        if (req.method === 'GET') {
          sendJson(res, 200, normalizeSection(settings.get()))
          return
        }
        if (req.method === 'POST') {
          try {
            const body = await readBody(req)
            const parsed = parseConfigBody(body)
            if (parsed === undefined) {
              sendJson(res, 400, { ok: false, error: 'invalid config body' })
              return
            }
            await settings.replace(parsed)
            sendJson(res, 200, { ok: true, config: parsed })
          } catch {
            sendJson(res, 400, { ok: false, error: 'invalid request body' })
          }
          return
        }
        sendJson(res, 405, { ok: false, error: 'method not allowed' })
      },
    }), 'subagent-effort: config routes')
  }
  const webserver = ctx.get('webServer')
  if (webserver !== undefined) {
    registerRoutes(webserver)
  } else {
    ctx.on('internal/service', (name) => {
      if (name !== 'webServer') return
      const ws = ctx.get('webServer')
      if (ws !== undefined) registerRoutes(ws)
    }, { global: true })
  }

  // Part 2: model-facing tool with per-call model/effort selection.
  ctx.tools.register(defineTool({
    name: toolName,
    description: 'Delegate a self-contained task to a subagent and choose its model and thinking effort yourself. '
      + 'Use this when the task has a natural cost/skill profile: heavy or uncertain work on a stronger model with '
      + 'higher effort (e.g. deepseek-v4-pro / max), routine or mechanical work on a cheaper model with lower effort '
      + '(e.g. deepseek-v4-flash / low). The subagent returns its result, not its intermediate steps; give it a '
      + 'complete, standalone prompt. The plain `subagent` tool inherits the parent model and effort; this tool exists '
      + 'so you can decide them per delegation.'
      + (backgroundEnabled
        ? ' This call waits for the result by default. Set `run_in_background: true` to return a job id; collect with `job_output` and stop with `job_kill`.'
        : ''),
    parameters: {
      description: {
        type: 'string',
        required: true,
        description: 'A short (3-5 word) description of the delegated task, for display.',
      },
      prompt: {
        type: 'string',
        required: true,
        description: 'The complete, self-contained task for the subagent. It does not share this conversation\'s context, so include everything it needs.',
      },
      model: {
        type: 'string',
        description: 'Model id for the subagent (e.g. deepseek-v4-flash, deepseek-v4-pro). Omit to keep the parent\'s model.',
      },
      reasoningEffort: {
        type: 'string',
        enum: EFFORT_IDS,
        description: 'Thinking effort for the subagent: low | medium | high | max. Omit to keep the parent\'s effort.',
      },
      ...backgroundEnabled ? {
        run_in_background: {
          type: 'boolean',
          description: 'Whether to run as a background job and return its id. Defaults to false; collect with job_output or stop with job_kill.',
        },
      } : {},
    },
    output: {
      schema: {
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', required: true, const: 'background' },
              jobId: { type: 'string', required: true },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', required: true, const: 'foreground' },
              runId: { type: 'string', required: true },
              output: { type: 'array', required: true, items: { type: 'json' } },
            },
          },
        ],
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.kind === 'background'
          ? `started background subagent task ${value.jobId}`
          : outputValueText(value.output),
      }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const parent = exec.agent
      if (!parent) {
        throw new Error(`${toolName} requires a calling agent (exec.agent was undefined)`)
      }
      if (args.reasoningEffort !== undefined && !EFFORT_IDS.includes(args.reasoningEffort)) {
        throw new Error(`${toolName}: reasoningEffort must be one of ${EFFORT_IDS.join(', ')}`)
      }
      const agentOptions = {}
      if (args.model !== undefined) agentOptions.model = args.model
      if (args.reasoningEffort !== undefined) agentOptions.reasoningEffort = args.reasoningEffort
      const request = {
        label: args.description,
        prompt: [{ type: 'text', text: args.prompt }],
        parent,
        ...Object.keys(agentOptions).length > 0 ? { agentOptions } : {},
      }

      if (args.run_in_background === true) {
        const jobs = ctx.get('jobs')
        if (jobs === undefined) {
          throw new Error('background jobs unavailable: load @deepseek-ai/dsh-jobs and @deepseek-ai/dsh-tool-jobs')
        }
        const id = jobs.start({
          kind: 'subagent',
          label: args.description,
          owner: parent,
          run: () => {
            const controller = new AbortController()
            const start = ctx.subagents.start(provider, { ...request, signal: controller.signal })
            return {
              cancel: (reason) => controller.abort(reason ?? `${toolName} background task killed`),
              done: settleStart(start, controller.signal),
            }
          },
        })
        return { kind: 'background', jobId: id }
      }

      const run = await ctx.subagents.start(provider, { ...request, signal: exec.signal })
      return settleForegroundRun(run)
    },
  }))
}
