window.__ModuleLoader__.load({
	id: "@shijunan123/dsh-client-ui-subagent-effort",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"title": "子代理设置",
			"description": "设置子代理默认模型与思考强度；选择继承则跟随父代理。",
			"model.label": "默认模型",
			"model.inherit": "继承父级模型",
			"effort.label": "默认思考强度",
			"effort.inherit": "继承父级",
			"effort.low": "低",
			"effort.medium": "中",
			"effort.high": "高",
			"effort.max": "最大",
			"save": "保存",
			"saving": "保存中…",
			"discard": "放弃",
			"unsaved": "未保存",
			"saveFailed": "保存失败，请重试",
			"saved": "已保存，子代理将使用该配置",
			"expand": "展开",
			"collapse": "收起",
			"hint": "父模型也可直接用 subagent_select 工具逐次指定模型与强度。"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"title": "Subagent settings",
			"description": "Default model and reasoning effort for subagents; inherit follows the parent agent.",
			"model.label": "Default model",
			"model.inherit": "Inherit parent model",
			"effort.label": "Default reasoning effort",
			"effort.inherit": "Inherit parent",
			"effort.low": "Low",
			"effort.medium": "Medium",
			"effort.high": "High",
			"effort.max": "Max",
			"save": "Save",
			"saving": "Saving…",
			"discard": "Discard",
			"unsaved": "Unsaved",
			"saveFailed": "Save failed, try again",
			"saved": "Saved — subagents will use this config",
			"expand": "Expand",
			"collapse": "Collapse",
			"hint": "The parent model can also use the subagent_select tool to pick model and effort per delegation."
		};
		//#endregion
		//#region \0dsh-css:C:\Users\s60102361\Desktop\deepseekharness\subagent-effort\packages\client\src\client\subagent-effort.module.css.mjs
		const css = ".vxdfzq_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}.vxdfzq_card:hover{border-color:var(--dsw-alias-label-dimmed)}.vxdfzq_cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.vxdfzq_header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.vxdfzq_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.vxdfzq_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.vxdfzq_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.vxdfzq_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.vxdfzq_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.vxdfzq_chevronOpen{transform:rotate(180deg)}.vxdfzq_body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.vxdfzq_pending{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.vxdfzq_row{align-items:center;gap:12px;margin:12px 0 0;display:flex}.vxdfzq_label{min-width:120px;color:var(--dsw-alias-label-secondary);font-size:13px}.vxdfzq_select{appearance:none;border:1px solid var(--dsw-alias-border-l2);min-width:0;font:inherit;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border-radius:8px;flex:1;padding:6px 10px;font-size:13px}.vxdfzq_select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.vxdfzq_footer{border-top:1px solid var(--dsw-alias-border-l2);justify-content:flex-end;align-items:center;gap:8px;margin-top:12px;padding:12px 0 4px;display:flex}.vxdfzq_failed{min-width:0;color:var(--dsw-alias-label-error);flex:1;margin:0;font-size:12px;line-height:1.5}.vxdfzq_saved{min-width:0;color:var(--dsw-alias-label-secondary);flex:1;margin:0;font-size:12px;line-height:1.5}.vxdfzq_discard,.vxdfzq_save{appearance:none;font:inherit;cursor:pointer;border:1px solid #0000;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.vxdfzq_discard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:0 0}.vxdfzq_discard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.vxdfzq_save{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.vxdfzq_discard:disabled,.vxdfzq_save:disabled{opacity:.4;cursor:default}.vxdfzq_discard:focus-visible,.vxdfzq_save:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.vxdfzq_hint{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:12px;line-height:1.5}";
		const tagId = "@shijunan123/dsh-client-ui-subagent-effort/subagent-effort.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@shijunan123/dsh-client-ui-subagent-effort";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var subagent_effort_module_css_default = {
			"label": "vxdfzq_label",
			"pending": "vxdfzq_pending",
			"body": "vxdfzq_body",
			"save": "vxdfzq_save",
			"headText": "vxdfzq_headText",
			"row": "vxdfzq_row",
			"discard": "vxdfzq_discard",
			"description": "vxdfzq_description",
			"failed": "vxdfzq_failed",
			"footer": "vxdfzq_footer",
			"header": "vxdfzq_header",
			"select": "vxdfzq_select",
			"chevronOpen": "vxdfzq_chevronOpen",
			"name": "vxdfzq_name",
			"hint": "vxdfzq_hint",
			"cardOpen": "vxdfzq_cardOpen",
			"saved": "vxdfzq_saved",
			"card": "vxdfzq_card",
			"chevron": "vxdfzq_chevron"
		};
		//#endregion
		//#region src/client/SubagentEffortCard.tsx
		/**
		* Subagent-effort plugin card in Settings → Plugins → configurable, matching
		* the built-in Shell / Web search cards: a header button (name + description
		* + chevron) discloses the form in place; edits are staged and written by
		* Save over the plugin's own config route. The model field is a select
		* populated from the same catalog the main chat box uses.
		*/
		const EFFORT_OPTIONS = [
			"low",
			"medium",
			"high",
			"max"
		];
		const cx = (...parts) => parts.filter(Boolean).join(" ");
		/** Render the subagent effort card. */
		function SubagentEffortCard(props) {
			const { t, config, loadModels } = props;
			const [open, setOpen] = (0, react.useState)(false);
			const [models, setModels] = (0, react.useState)([]);
			const [saved, setSaved] = (0, react.useState)({});
			const [draft, setDraft] = (0, react.useState)({});
			const [saveFailed, setSaveFailed] = (0, react.useState)(false);
			const [savedFlash, setSavedFlash] = (0, react.useState)(false);
			const [saving, setSaving] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!savedFlash) return;
				const timer = setTimeout(() => {
					setSavedFlash(false);
				}, 2500);
				return () => {
					clearTimeout(timer);
				};
			}, [savedFlash]);
			(0, react.useEffect)(() => {
				if (!open) return;
				let cancelled = false;
				config.load().then((value) => {
					if (cancelled) return;
					setSaved(value);
					setDraft(value);
				});
				if (models.length === 0) loadModels().then((ids) => {
					if (!cancelled) setModels(ids);
				});
				return () => {
					cancelled = true;
				};
			}, [
				open,
				config,
				loadModels,
				models.length
			]);
			const dirty = draft.model !== saved.model || draft.reasoningEffort !== saved.reasoningEffort;
			const onSave = async () => {
				if (saving) return;
				setSaving(true);
				setSaveFailed(false);
				const ok = await config.save({
					model: draft.model,
					reasoningEffort: draft.reasoningEffort
				});
				setSaving(false);
				if (!ok) {
					setSaveFailed(true);
					return;
				}
				setSaved({
					model: draft.model,
					reasoningEffort: draft.reasoningEffort
				});
				setSavedFlash(true);
			};
			const onDiscard = () => {
				if (saving) return;
				setSaveFailed(false);
				setSavedFlash(false);
				setDraft(saved);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: cx(subagent_effort_module_css_default.card, open && subagent_effort_module_css_default.cardOpen),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: subagent_effort_module_css_default.header,
					"aria-expanded": open,
					"aria-label": `${t(open ? "collapse" : "expand")}: ${t("title")}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: subagent_effort_module_css_default.headText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: subagent_effort_module_css_default.name,
								children: t("title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: subagent_effort_module_css_default.description,
								children: t("description")
							})]
						}),
						dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: subagent_effort_module_css_default.pending,
							children: t("unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: cx(subagent_effort_module_css_default.chevron, open && subagent_effort_module_css_default.chevronOpen) })
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: subagent_effort_module_css_default.body,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: subagent_effort_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: subagent_effort_module_css_default.label,
								htmlFor: "subagent-effort-model",
								children: t("model.label")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								id: "subagent-effort-model",
								className: subagent_effort_module_css_default.select,
								value: draft.model ?? "",
								onChange: (event) => {
									setDraft({
										...draft,
										model: event.currentTarget.value
									});
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("model.inherit")
								}), models.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: id,
									children: id
								}, id))]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: subagent_effort_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: subagent_effort_module_css_default.label,
								htmlFor: "subagent-effort-level",
								children: t("effort.label")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								id: "subagent-effort-level",
								className: subagent_effort_module_css_default.select,
								value: draft.reasoningEffort ?? "",
								onChange: (event) => {
									setDraft({
										...draft,
										reasoningEffort: event.currentTarget.value
									});
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("effort.inherit")
								}), EFFORT_OPTIONS.map((effort) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: effort,
									children: t(`effort.${effort}`)
								}, effort))]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: subagent_effort_module_css_default.footer,
							children: [
								saveFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: subagent_effort_module_css_default.failed,
									role: "status",
									children: t("saveFailed")
								}) : null,
								savedFlash && !saveFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: subagent_effort_module_css_default.saved,
									role: "status",
									children: ["✓ ", t("saved")]
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: subagent_effort_module_css_default.discard,
									disabled: !dirty || saving,
									onClick: onDiscard,
									children: t("discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: subagent_effort_module_css_default.save,
									disabled: saving,
									onClick: () => {
										onSave();
									},
									children: saving ? t("saving") : t("save")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: subagent_effort_module_css_default.hint,
							children: t("hint")
						})
					]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/index.ts
		const name = "client-subagent-effort";
		const inject = [
			"slots",
			"locale",
			"connection"
		];
		/** Locale namespace for this card's copy. */
		const NS = "subagent-effort";
		/** Host route serving the plugin config file. */
		const CONFIG_ROUTE = "/subagent-effort/config";
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "subagent-effort: copy dictionaries");
			ctx.locale.bind(NS);
			const configFace = {
				load: async () => {
					try {
						const response = await fetch(CONFIG_ROUTE);
						if (!response.ok) return {};
						return await response.json();
					} catch {
						return {};
					}
				},
				save: async (config) => {
					try {
						return (await fetch(CONFIG_ROUTE, {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify(config)
						})).ok;
					} catch {
						return false;
					}
				}
			};
			const loadModels = async () => {
				try {
					const { api } = ctx.get("connection");
					const response = await api.llm.models({});
					if (!response.result.ok) return [];
					return response.result.value.groups.flatMap((group) => group.models.map((model) => model.id));
				} catch {
					return [];
				}
			};
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				id: "subagent-effort",
				order: 30,
				locale: NS,
				inject: () => ({
					config: configFace,
					loadModels
				})
			}, SubagentEffortCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map