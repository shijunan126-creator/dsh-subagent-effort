/**
 * Browser half: registers the subagent-effort card inside the Plugins
 * settings page (设置 → 插件 → 可配置), matching the built-in Shell / Web
 * search cards. Config travels over the plugin's own host routes
 * (GET/POST /subagent-effort/config) into its config file — the harness API
 * gateway does not expose third-party settings namespaces, so the plugin owns
 * its storage instead of settings.yaml. The model field is a select populated
 * from the same catalog the main chat box uses (`llm.models`).
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
// Type-only: pulls the settings SlotMap merges ('settings.plugin.item') and
// the locale Context merge into this program.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { zh, en, type SubagentEffortKey } from './locales.ts'
import { SubagentEffortCard, type ConfigFace } from './SubagentEffortCard.tsx'

export const name = 'client-subagent-effort'
export const inject = ['slots', 'locale', 'connection']

/** Locale namespace for this card's copy. */
const NS = 'subagent-effort'
/** Host route serving the plugin config file. */
const CONFIG_ROUTE = '/subagent-effort/config'

export function apply(ctx: ClientContext) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'subagent-effort: copy dictionaries')
  const t = ctx.locale.bind(NS) as (key: SubagentEffortKey) => string

  const configFace: ConfigFace = {
    load: async () => {
      try {
        const response = await fetch(CONFIG_ROUTE)
        if (!response.ok) return {}
        return (await response.json()) as { model?: string; reasoningEffort?: string }
      } catch {
        return {}
      }
    },
    save: async (config) => {
      try {
        const response = await fetch(CONFIG_ROUTE, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(config),
        })
        return response.ok
      } catch {
        return false
      }
    },
  }

  // The same model catalog the main chat box model picker uses.
  const loadModels = async (): Promise<string[]> => {
    try {
      const { api } = ctx.get('connection') as ConnectionHandle
      const response = await api.llm.models({})
      if (!response.result.ok) return []
      return response.result.value.groups.flatMap(group => group.models.map(model => model.id))
    } catch {
      return []
    }
  }

  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    id: 'subagent-effort',
    order: 30,
    locale: NS,
    inject: () => ({ config: configFace, loadModels }),
  }, SubagentEffortCard))
}
