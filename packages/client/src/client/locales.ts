/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '子代理设置',
  'description': '设置子代理默认模型与思考强度；选择继承则跟随父代理。',
  'model.label': '默认模型',
  'model.inherit': '继承父级模型',
  'effort.label': '默认思考强度',
  'effort.inherit': '继承父级',
  'effort.low': '低',
  'effort.medium': '中',
  'effort.high': '高',
  'effort.max': '最大',
  'save': '保存',
  'saving': '保存中…',
  'discard': '放弃',
  'unsaved': '未保存',
  'saveFailed': '保存失败，请重试',
  'saved': '已保存，子代理将使用该配置',
  'expand': '展开',
  'collapse': '收起',
  'hint': '父模型也可直接用 subagent_select 工具逐次指定模型与强度。',
} satisfies Record<string, string>

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'title': 'Subagent settings',
  'description': 'Default model and reasoning effort for subagents; inherit follows the parent agent.',
  'model.label': 'Default model',
  'model.inherit': 'Inherit parent model',
  'effort.label': 'Default reasoning effort',
  'effort.inherit': 'Inherit parent',
  'effort.low': 'Low',
  'effort.medium': 'Medium',
  'effort.high': 'High',
  'effort.max': 'Max',
  'save': 'Save',
  'saving': 'Saving…',
  'discard': 'Discard',
  'unsaved': 'Unsaved',
  'saveFailed': 'Save failed, try again',
  'saved': 'Saved — subagents will use this config',
  'expand': 'Expand',
  'collapse': 'Collapse',
  'hint': 'The parent model can also use the subagent_select tool to pick model and effort per delegation.',
} satisfies Record<keyof typeof zh, string>

/** The settings namespace key union. */
export type SubagentEffortKey = keyof typeof zh
