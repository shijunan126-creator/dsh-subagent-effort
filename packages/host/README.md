# dsh-subagent-effort

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin, mounted the dsh way — everything is a plugin: a bundle with a `cordis.patch.yml`, installed/removed through `dsh plugin`, configured from the GUI (Settings → Plugins → configurable) or the profile patch layer.

It lets the harness's **in-process subagents** (`subagent`, `subagent-fork-in-process`, `subagent-spawn-in-process`, and workflow children) run with their **own model and reasoning effort** — chosen by the **GUI settings panel**, by **config** (defaults), or by the **parent model per delegation** (the `subagent_select` tool).

Dependencies: `@deepseek-ai/dsh-tools` (tool definition), `@deepseek-ai/schemastery` (config schema), `@shijunan123/dsh-client-ui-subagent-effort` (settings card). Pure ESM, no build step.

## Lifecycle — one command, clean uninstall

Install / update / uninstall go through `manage.ps1` (project root), which keeps the profile's `pnpm-workspace.yaml` release-age excludes and leftover dirs consistent — `dsh plugin` alone leaves those behind.

```powershell
powershell -ExecutionPolicy Bypass -File manage.ps1 install     # install latest
powershell -ExecutionPolicy Bypass -File manage.ps1 update      # upgrade to latest
powershell -ExecutionPolicy Bypass -File manage.ps1 uninstall   # remove + clean leftovers
powershell -ExecutionPolicy Bypass -File manage.ps1 status      # what is installed
```

After install/update: restart `dsh web` and hard-refresh the browser.

## Config

### GUI (recommended)

Settings → Plugins → configurable → **Subagent model and reasoning effort** card: default model, default reasoning effort (low/medium/high/max or inherit). Writes to `settings.yaml`; takes effect immediately, no restart.

### Profile patch layer (optional composition defaults)

```yaml
- patch:
    - id: subagent-effort
      config:
        model: deepseek-v4-flash        # subagent default model (optional)
        reasoningEffort: high           # low|medium|high|max (optional)
        provider: spawn                 # delegation provider for subagent_select (default spawn)
        toolName: subagent_select       # model-facing tool name (default)
        enableRunInBackground: true     # expose run_in_background on the tool
```

Every field is optional; the bundle ships inert (subagents inherit the parent; the tool is registered but unused until the model picks it). Runtime precedence: `subagent_select` per-call > settings section (`settings.yaml`) > profile config > inherit.

## Behavior

### Part 1 — config defaults

Subagent children carry `AgentOptions.subagentDepth >= 1`. An `agent/request` waterfall listener rewrites `model` / `reasoningEffort` for those agents only; root agents are never touched.

Precedence per subagent request:

1. the child's own `AgentOptions.reasoningEffort` wins (set by the model through `subagent_select`, or smuggled through the built-in tool's `agentOptions` — the tool schema does not advertise the key, but undeclared keys pass through);
2. the `settings.yaml` section `subagent-effort` applies otherwise;
3. then the profile patch config;
4. with neither set, the request keeps its inherited effort.

`settings.yaml` (and then profile config) is authoritative for the subagent model when set.

### Part 2 — `subagent_select` tool

A model-facing delegation tool like the built-in `subagent` tool, plus two optional parameters:

| parameter | meaning |
|---|---|
| `model` | model id for the subagent (e.g. `deepseek-v4-flash`, `deepseek-v4-pro`); omit to keep the parent's model |
| `reasoningEffort` | `low` \| `medium` \| `high` \| `max`; omit to keep the parent's effort |

The parent model picks the model/effort per task (cheap + fast for routine work, strong + max for hard problems). Chosen values travel through `agentOptions` and are applied by part 1.

To avoid two delegation tools in the prompt, rename the built-in tool first by patching its base rows (`tool-subagent`, `tool-subagent-fork`) with a distinct `toolName`, letting `subagent_select` be the one tool.

## Install

From npm (published):

```sh
dsh plugin --profile web add @shijunan123/dsh-subagent-effort
```

From a local checkout:

```sh
dsh plugin --profile web add link:C:\path\to\subagent-effort
```

Then restart `dsh web` and hard-refresh the browser. Remove with `dsh plugin --profile web remove dsh-subagent-effort`.

## Verify

```sh
dsh --profile web --dump-config   # the subagent-effort row is mounted
node --test test/                 # 25 behavior unit tests, mock ctx, no model needed
```

## Model Experience

Indirectly, through the `subagent_select` tool schema and its description, which reach the parent model's prompt; the plugin itself adds no other model-visible text.

#### KV Cache effect

The tool description is a fixed, prefix-stable literal at registration; no per-request prefix changes, so it does not invalidate cache reuse.

## Notes

- Works for every in-process subagent path, including `workflow` children and the built-in `subagent` tool (its `agentOptions.reasoningEffort` is honored even though its schema does not advertise it).
- Does not affect external product subagents (Codex / Claude Code / ACP bridges); those translate their own effort flags.
- Both parts use documented extension points (`agent/request` waterfall, `ctx.tools.register`) — no core changes.

## Publish

Publishing requires an npm account with 2FA; the registry rejects CLI publishing unless a granular token with **Bypass 2FA for publishing** is used (Classic tokens are no longer creatable). Flow: bump versions in `packages/*/package.json`, publish the client package first, then the host:

```sh
# in the project root, with a bypass-2FA token in ~/.npmrc or a temporary project .npmrc
pnpm publish --filter @shijunan123/dsh-client-ui-subagent-effort --no-git-checks
pnpm publish --filter @shijunan123/dsh-subagent-effort --no-git-checks   # rewrites workspace:* deps
```

`pnpm pack` output is verified: the tarball carries `lib/`, `cordis.patch.yml`, `README.md`, `package.json` (`dsh.bundle.patch` included, so `dsh plugin add` recognizes it as a bundle).
