/**
 * Standalone build config for the subagent-effort settings panel. Uses the
 * shared client-bundle preset (shared/tsdown.client.ts, kept in sync with the
 * DSH checkout's packages/client/tsdown.client.ts): the node-half lib/ plus
 * the browser bundle lib/client.js.
 */
import { clientBundle } from '../../shared/tsdown.client.ts'

export default clientBundle('@shijunan123/dsh-client-ui-subagent-effort', ['src/index.ts'])
