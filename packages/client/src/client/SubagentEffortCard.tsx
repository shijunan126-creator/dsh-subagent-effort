/**
 * Subagent-effort plugin card in Settings → Plugins → configurable, matching
 * the built-in Shell / Web search cards: a header button (name + description
 * + chevron) discloses the form in place; edits are staged and written by
 * Save over the plugin's own config route. The model field is a select
 * populated from the same catalog the main chat box uses.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SubagentEffortKey } from './locales.ts'
import css from './subagent-effort.module.css'

/** Config payload shared with the host route. */
export interface SubagentEffortConfig {
  model?: string
  reasoningEffort?: string
}

/** Business face injected by the plugin apply. */
export interface ConfigFace {
  load(): Promise<SubagentEffortConfig>
  save(config: SubagentEffortConfig): Promise<boolean>
}

/** Loader for the model catalog (same source as the chat box model picker). */
export type ModelLoader = () => Promise<string[]>

/** Composed props: locale seat plus the injected face. */
export interface SubagentEffortCardProps {
  t: (key: SubagentEffortKey) => string
  config: ConfigFace
  loadModels: ModelLoader
}

const EFFORT_OPTIONS = ['low', 'medium', 'high', 'max'] as const

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

/** Render the subagent effort card. */
export function SubagentEffortCard(props: SubagentEffortCardProps): ReactNode {
  const { t, config, loadModels } = props
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [saved, setSaved] = useState<SubagentEffortConfig>({})
  const [draft, setDraft] = useState<SubagentEffortConfig>({})
  const [saveFailed, setSaveFailed] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [saving, setSaving] = useState(false)

  // Auto-hide the saved confirmation after a moment.
  useEffect(() => {
    if (!savedFlash) return
    const timer = setTimeout(() => { setSavedFlash(false) }, 2500)
    return () => { clearTimeout(timer) }
  }, [savedFlash])

  // Load the stored config and the model catalog on first expand.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void config.load().then((value) => {
      if (cancelled) return
      setSaved(value)
      setDraft(value)
    })
    if (models.length === 0) {
      void loadModels().then((ids) => { if (!cancelled) setModels(ids) })
    }
    return () => { cancelled = true }
  }, [open, config, loadModels, models.length])

  const dirty = draft.model !== saved.model || draft.reasoningEffort !== saved.reasoningEffort

  const onSave = async (): Promise<void> => {
    if (saving) return
    setSaving(true)
    setSaveFailed(false)
    const ok = await config.save({ model: draft.model, reasoningEffort: draft.reasoningEffort })
    setSaving(false)
    if (!ok) {
      setSaveFailed(true)
      return
    }
    setSaved({ model: draft.model, reasoningEffort: draft.reasoningEffort })
    setSavedFlash(true)
  }
  const onDiscard = (): void => {
    if (saving) return
    setSaveFailed(false)
    setSavedFlash(false)
    setDraft(saved)
  }

  return (
    <li className={cx(css.card, open && css.cardOpen)}>
      <button
        type="button"
        className={css.header}
        aria-expanded={open}
        aria-label={`${t(open ? 'collapse' : 'expand')}: ${t('title')}`}
        onClick={() => { setOpen(!open) }}
      >
        <span className={css.headText}>
          <span className={css.name}>{t('title')}</span>
          <span className={css.description}>{t('description')}</span>
        </span>
        {dirty ? <span className={css.pending}>{t('unsaved')}</span> : null}
        <IconChevronDownOutline14 className={cx(css.chevron, open && css.chevronOpen)} />
      </button>
      {open
        ? (
          <div className={css.body}>
            <div className={css.row}>
              <label className={css.label} htmlFor="subagent-effort-model">{t('model.label')}</label>
              <select
                id="subagent-effort-model"
                className={css.select}
                value={draft.model ?? ''}
                onChange={(event) => { setDraft({ ...draft, model: event.currentTarget.value }) }}
              >
                <option value="">{t('model.inherit')}</option>
                {models.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            <div className={css.row}>
              <label className={css.label} htmlFor="subagent-effort-level">{t('effort.label')}</label>
              <select
                id="subagent-effort-level"
                className={css.select}
                value={draft.reasoningEffort ?? ''}
                onChange={(event) => { setDraft({ ...draft, reasoningEffort: event.currentTarget.value }) }}
              >
                <option value="">{t('effort.inherit')}</option>
                {EFFORT_OPTIONS.map((effort) => (
                  <option key={effort} value={effort}>{t(`effort.${effort}`)}</option>
                ))}
              </select>
            </div>
            <div className={css.footer}>
              {saveFailed ? <p className={css.failed} role="status">{t('saveFailed')}</p> : null}
              {savedFlash && !saveFailed ? <p className={css.saved} role="status">✓ {t('saved')}</p> : null}
              <button type="button" className={css.discard} disabled={!dirty || saving} onClick={onDiscard}>
                {t('discard')}
              </button>
              {/* Always enabled (black); grays only while a save is in flight. */}
              <button
                type="button"
                className={css.save}
                disabled={saving}
                onClick={() => { void onSave() }}
              >
                {saving ? t('saving') : t('save')}
              </button>
            </div>
            <p className={css.hint}>{t('hint')}</p>
          </div>
        )
        : null}
    </li>
  )
}
