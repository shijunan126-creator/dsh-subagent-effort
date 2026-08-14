/** Node-half entry: this plugin is browser-only, nothing to do on the host side. */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'client-subagent-effort'

export function apply(_ctx: Context) {
  // The browser half (src/client) registers the settings panel.
}
