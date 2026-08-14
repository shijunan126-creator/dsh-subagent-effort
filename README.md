# dsh-subagent-effort

[![npm version](https://img.shields.io/npm/v/@shijunan123/dsh-subagent-effort)](https://www.npmjs.com/package/@shijunan123/dsh-subagent-effort)
[![npm license](https://img.shields.io/npm/l/@shijunan123/dsh-subagent-effort)](LICENSE)
[![dsh-plugin](https://img.shields.io/badge/dsh--plugin-topic-blue)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%20%3E%3D24-green)](https://github.com/deepseek-ai/deepseek-harness)

DeepSeek Harness 插件：让**子代理**使用**独立的模型与思考强度**——GUI 卡片或配置文档（`settings.yaml`）即配即用，父模型也能用 `subagent_select` 工具逐次指定。

## 特性

- **GUI 设置卡片**：设置 → 插件 → 可配置 →「子代理设置」——模型下拉（与主聊天框同一目录）＋思考强度（低/中/高/最大/继承），保存即生效
- **配置文档直改**：设置 → 插件 → 右上角「打开配置文档」→ `subagent-effort:` 段，编辑热生效，与 GUI 共用同一份数据
- **父模型自选**：`subagent_select` 工具带 `model` + `reasoningEffort` 参数，按任务成本自行决定（重活用 pro/max、机械活 flash/low）
- **全覆盖**：`subagent` 工具、spawn/fork-in-process、workflow 子代理全部生效；根代理不受影响
- **可装可卸**：bundle 形态，`dsh plugin` 一条命令装/卸，`manage.ps1` 管生命周期（含 pnpm 发布年龄白名单清理）

## 前置要求

- Node.js `^22.19` 或 `>=24`
- 已安装或可通过 `npx` 使用 DeepSeek Harness

## 安装

### 从 npm（推荐）

```sh
dsh plugin --profile web add @shijunan123/dsh-subagent-effort
```

### 从 GitHub

```sh
dsh plugin --profile web add github:shijunan126-creator/dsh-subagent-effort
```

> **重启生效**：安装完成后重启 `dsh web` 并硬刷新浏览器（Ctrl+F5）。

## 使用

1. 打开 **设置 → 插件 → 可配置** → 点开 **「子代理设置」** 卡片
2. 选择**默认模型**（与主聊天框同源）与**默认思考强度**，点**保存**
3. 后续子代理请求自动使用该配置；父代理保持自身配置不变

也可以直接对助手说：

> 用 subagent_select 派一个 deepseek-v4-flash / low 的子代理去跑批量格式化

## 配置

运行时优先级：**`subagent_select` 逐次指定 > 设置（settings.yaml）> 配置默认值 > 继承父级**。

```yaml
# ~/.dsh/settings.yaml（设置 → 插件 → 打开配置文档）
subagent-effort:
  model: deepseek-v4-flash
  reasoningEffort: max        # low | medium | high | max
```

| 字段 | 说明 | 留空 |
|---|---|---|
| `model` | 子代理默认模型 id | 继承父代理模型 |
| `reasoningEffort` | 子代理默认思考强度 | 继承父代理强度 |

## 架构

单 bundle，双包：

- **Host 半**（`@shijunan123/dsh-subagent-effort`）：`agent/request` 瀑布监听（按 `subagentDepth` 只改写子代理请求）+ 配置路由（`/subagent-effort/config`，存进 settings.yaml）+ `subagent_select` 工具
- **Client 半**（`@shijunan123/dsh-client-ui-subagent-effort`）：`settings.plugin.item` 卡片（「子代理设置」）

## 卸载

```sh
dsh plugin --profile web remove @shijunan123/dsh-subagent-effort
```

重启后完全还原；残留清理用 `manage.ps1 uninstall`。

## 验证

```sh
dsh --profile web --dump-config   # subagent-effort 行在位
node --test packages/host/test/   # 25 个行为测试（mock ctx，无需模型）
```

## License

MIT
