# dsh-subagent-effort

DeepSeek Harness 插件：让**子代理**使用**独立的模型与思考强度**——通过 GUI 设置卡片或配置文档（`settings.yaml` 的 `subagent-effort` 段）配置，父模型也可用 `subagent_select` 工具逐次指定。遵循 dsh 的「万物皆插件」理念：bundle 形态、可装可卸、配置可 patch。

## 功能

- **GUI 设置卡片**：设置 → 插件 → 可配置 →「子代理设置」——下拉选择模型（与主聊天框同一目录）与思考强度（低/中/高/最大/继承），保存即生效
- **配置文档**：设置 → 插件 → 右上角「打开配置文档」→ `subagent-effort:` 段，直接编辑、热生效（与 GUI 共用同一份数据）
- **父模型自选**：`subagent_select` 工具带 `model` + `reasoningEffort` 参数，父模型按任务自行决定
- **优先级**：`subagent_select` 逐次指定 > 设置（settings.yaml）> 配置默认值 > 继承父级
- 覆盖所有进程内子代理路径：`subagent` 工具、spawn/fork-in-process、workflow 子代理

## 安装

```sh
dsh plugin --profile web add @shijunan123/dsh-subagent-effort
```

重启 `dsh web` + 浏览器硬刷新。

## 使用

1. 打开 **设置 → 插件 → 可配置** → 点开「子代理设置」卡片
2. 选默认模型（与主聊天框同源）与默认思考强度，点**保存**
3. 后续子代理请求自动使用该配置（父代理不受影响）

生命周期管理（含 pnpm 发布年龄白名单等清理）：`manage.ps1 install / update / uninstall / status`。

## 包结构

| 包 | 角色 |
|---|---|
| `@shijunan123/dsh-subagent-effort` | host：`agent/request` 监听 + 配置路由 + `subagent_select` 工具 |
| `@shijunan123/dsh-client-ui-subagent-effort` | client：设置页卡片 UI |

## 开发

```sh
pnpm install
pnpm --filter @shijunan123/dsh-client-ui-subagent-effort run build   # 客户端 bundle
node --test packages/host/test/                                      # 25 个行为测试
```

发布：client 先行，host 后行（`pnpm publish --filter ...`，需 bypass-2FA 的 granular token）。

## License

MIT
