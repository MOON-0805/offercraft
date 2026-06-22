# offercraft产品需求文档 

# 前言

在空行输入“/高亮块” 插入高亮块，突出显示重点信息

# 一、 版本信息

版本号：V1\.0

创建日期：2026\-06\-22

审核人：PM

# 二、 变更日志

|**时间**|**版本号**|**变更人**|**主要变更内容**|
|---|---|---|---|
|2026\-06\-22|V1\.0|PM|初始版本创建，覆盖 7 大核心模块|

# 三、 文档说明

## 名词解释

|**术语 / 缩略词**|**说明**|
|---|---|
|主简历（Master Resume）|用户上传或创建的原始简历，作为所有改写的唯一事实素材源。|
|JD（Job Description）|目标岗位描述|
|快照（Snapshot）|投递时对当时简历和 JD 的一份只读“冻结”副本，确保历史记录不可篡改。|
|匹配度（Match Score）|当前简历与目标 JD 的契合度评分（0\-100 分|
|幻觉（Hallucination）|AI 生成原简历中不存在的事实信息（如虚构项目、公司），系统必须强制拦截。|

# 四、 需求背景

## 项目背景

校招应届生在求职季通常需要海投上百家企业，但每家公司的岗位要求（JD）各异。手动针对不同 JD 逐字修改简历耗时费力，且面试准备缺乏针对性，投递进度难以系统化追踪。

## 用户调研

1. 用户需要一份“素材库”（主简历），能快速针对不同 JD 衍生出定制化版本。

2. 用户需要深度理解 JD 背后的隐性门槛和考察重点，而不只是看关键词。

3. 用户需要一个闭环：简历改写 → 面试准备 → 投递记录，三者必须关联，避免重复劳动。

## 竞品分析

1. 竞品选择：Rezi、Teal、Kickresume、面试鸭。

2. 对比分析：

    1. Rezi/Teal 侧重简历 ATS 优化，但 JD 解析较浅，偏向关键词统计而非语义推理。

    2. 面试鸭侧重八股文刷题，与用户个人简历项目脱节，无法做到“针对简历项目深挖”。

3. 关键结论：OfferCraft 的差异化在于 “简历\- JD \- 面试题”三者强关联，且通过严格的幻觉控制机制，确保生成内容可信、可追溯，尤其适合对真实性要求极高的校招背景调查。

# 五、 需求范围

- 功能范围：仪表盘、简历管理、JD 解析、简历改写、面试备战、投递追踪、设置（API Key 配置），共计 7 个核心页面。

# 六、 功能详细说明

## 产品流程图

### 核心业务图

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjU4YzZjNzNhODJkYzZlODM4MTM1N2ZiNzc0Zjc4NTRfMjQyZDM3ZjNiYWZkYzZjNmU1MDdlMmNmZmQwYjFiYjRfSUQ6NzY1NDE0MjkxOTQ1NzMxMTk0Nl8xNzgyMTI2NTk2OjE3ODIyMTI5OTZfVjM)

### 简历解析流程

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZDBkN2ZmMjRmZTE0ZDUyNWQzYmEzZDI2ZWFjMTU1MmNfNDZmZDkzYmFkMWRiZDdiNGQxYzlhYzg4YWFlYmRhOGRfSUQ6NzY1NDE0MzE1NzM3NjQ1Mzg1M18xNzgyMTI2NTk3OjE3ODIyMTI5OTdfVjM)

### 简历改写流程

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MTM5Yjc5MWVlYTNmMTJiOTVhMDhjNWEwM2YxOWZlZGFfZWZmYjJjYjViNTE1ZWIzZGEzNzljZmVlNzNjNDZhNjFfSUQ6NzY1NDE0MzQwMDQ4MDE4MTQ3Ml8xNzgyMTI2NTk2OjE3ODIyMTI5OTZfVjM)

## 交互原型图

- 场景 1：首次上传与简历管理

    - 路径：进入「简历管理」→ 点击「上传简历」（PDF/Word/Markdown）或「手动创建」→ 系统解析并展示结构化字段（基本信息、教育、经历、项目、技能）。

    - 交互：解析完成后，该简历自动标记为“主简历”，全局状态 `currentResumeId` 更新。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YjUyYjkxNjZiMDI1Y2M0YjY4NGM4YzgyZWU0N2U2MmNfZWViZDU2NmY1MmZhYzNlM2Q0YmE0MmZiMGNkNDE5NDdfSUQ6NzY1NDEyNzc1NjExNjE4NDI2MF8xNzgyMTI2NTk2OjE3ODIyMTI5OTZfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjgzZDc5Mjc3NDdlODQ2YjllNTdlYzNhMTM3ODA0NjZfM2I5YWZjZWQyNmIzN2FjOWRiMTE0MzdjMmNlZDRlOWJfSUQ6NzY1NDEyODMxMTcxMTgxMjc5Nl8xNzgyMTI2NTk3OjE3ODIyMTI5OTdfVjM)

- 场景 2：JD 深度解析

    - 路径：进入「JD 解析」→ 粘贴 JD 文本 → 点击「深度解析」。

    - 交互：系统输出 8 大维度（岗位定位、硬性技能分类、加分项、业务背景、项目经验要求、画像、隐藏要求、面试考察方向）。右侧“历史记录”可回溯过往解析结果。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTkxMDQwOWMyMDE1ZDRmZjRkNDkyMmM2MGM5NDkyNWFfNzg0ODZlMzJjMjIxODU0MTVlMDI0NTcwZjA5Yzc1ODlfSUQ6NzY1NDEyNzg0MjMzNjkzNDg3Ml8xNzgyMTI2NTk3OjE3ODIyMTI5OTdfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Njg1MmY4ZTczZTVjNWQ2MmJlZDQ2YTY2ZDk0N2ZlMGVfMDkwNGFlMzM4YTBjMWYzMTE1MTA0NmMzYTdkZTcyMzJfSUQ6NzY1NDEyNzkxMjQ5MzAwOTg1MF8xNzgyMTI2NTk2OjE3ODIyMTI5OTZfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZDRmNDYyOTA3NTFmYjExZDc2MmU3ZWZhNjZiYzllOThfN2YzZjQ0MGI5MjBiMGU5MTQwYjRhYjQ3YzU4Y2U5NjBfSUQ6NzY1NDEyNzk3NTk0ODMwNzYzNV8xNzgyMTI2NTk3OjE3ODIyMTI5OTdfVjM)

- 场景 3：简历智能改写

    - 路径：进入「简历改写」→ 选择“主简历” \+ 选择“目标 JD”→ 点击「开始改写」。

    - 交互：AI 返回定制版本，用户预览后可“确认保存”或“重新生成”。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTJmMmJlMmI1ODgwNzliNWYwODk2ZGQ1ODdlZjRlNjZfNjMwZGJkMjkyNjc2ZjQ1YmJmYTgzNzNhMmQ2YmY1YTRfSUQ6NzY1NDEyODc4NDcwMjA5ODYyMl8xNzgyMTI2NTk3OjE3ODIyMTI5OTdfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MDdjZmY0YzM2NWMzMDk0NGZjOWM3YzRhYzI2ZTZlMTVfODY2MzU4NWNkYTk2NTU4MDVkMTM0ZTFhNDQ0NTFhMDlfSUQ6NzY1NDEyOTA1OTY1NjQwMzk0OF8xNzgyMTI2NTk2OjE3ODIyMTI5OTZfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTQwZmI4NWUwODBmN2Y3NzJhOTE1NWQ5OGY1ZWNkMWFfMDU2ZTg0Yzg0ZTE0N2ZmNzQzNTgyZWIyNDRmMjI5NGVfSUQ6NzY1NDEyOTIwNDE4MzI4OTAyNl8xNzgyMTI2NTk2OjE3ODIyMTI5OTZfVjM)

- 场景 4：面试备战包生成

    - 路径：进入「面试备战」→ 选择“简历” \+ 选择“JD”→ 点击「生成备战包」。

    - 交互：产出 4 个模块（高频面经、八股文梳理、项目深挖预测、技能自查清单）。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MTAwMmI0NDZiODYwZDZhY2U3ZWI2MDgwYjBlMGVjMmJfZGExODViYzRmZjFmMGU2M2VkNTg1N2Y5MTI4ZTA4MzVfSUQ6NzY1NDEyOTMzNjIzMjAyMTIwM18xNzgyMTI2NTk2OjE3ODIyMTI5OTZfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjZmYTZmNWM2NTQ5NGRiOWFmMTVlYjQ3NGU5NTU5MGNfMzEyZDA0MzQ4M2RhZGI2NDFiYzZlOThiMGIxODdkNzBfSUQ6NzY1NDEyOTQzOTg2OTE5MzQwOV8xNzgyMTI2NTk3OjE3ODIyMTI5OTdfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OGVjMDdlYjkxZjU2YTQ5MzY1MjJiMWEyOTVlM2IwMGJfMDA0MDAwOThmYjA4MWIwYjU0NGM2ZjAzZDI5N2U1MGVfSUQ6NzY1NDEyOTUyMzkzMzM4MzYzN18xNzgyMTI2NTk2OjE3ODIyMTI5OTZfVjM)

- 场景 5：投递追踪与快照查看

    - 路径：进入「投递追踪」→ 点击「新增投递」→ 填写岗位名称/公司/阶段 → 系统自动绑定当前的 `resume_snapshot_id` 和 `jd_snapshot_id`。

    - 交互：点击历史记录中的任意一条，弹窗展示当时冻结的“定制简历”和“备战包”。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NTJiZTU5YjA3YWQ4MDI4ODRhZTRjOTZkZjliYjczOTJfNjA4OWE1YWJkZTNhZDZlNjEyOGMzNGQ5YTk3MDNlNTNfSUQ6NzY1NDEyOTc3Mzg3NDEzODA3MV8xNzgyMTI2NTk3OjE3ODIyMTI5OTdfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YWZjNjM0ZTM0MWIxNTQ0MGIyMzQ5NjliYzhlNDBiNGVfZDFmNmVmYjE2ZDI0YjRmMDI4Yjg5OTI4NjcyNDBiMGVfSUQ6NzY1NDEyOTk1OTgxNjEyMTU0MV8xNzgyMTI2NTk3OjE3ODIyMTI5OTdfVjM)

- 场景 6：仪表盘概览

    - 路径：登录后默认进入仪表盘。

    - 交互：展示 5 个统计卡片（简历数、JD 数、改写版本数、备战包数、投递数），下方提供“解析 JD”和“智能改写”的快捷入口。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MTYzNWI3ZTg0YzRhZGM1OWVkYmZhYzA0MGFmNTI3YTZfMzllNGFmMDUzMTczNGU0NTRmYjhlOWIwZTk1Yjk4NGZfSUQ6NzY1NDEzMDA1ODYxMjk4NDc2M18xNzgyMTI2NTk3OjE3ODIyMTI5OTdfVjM)

- 场景 7：异常与兜底

    - 场景：简历解析失败（格式不支持）或 AI 改写触发幻觉拦截。

    - 交互：顶部弹出 Toast 提示错误码及具体原因（如“400: 检测到超出原始素材的内容”）。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MDY4YmUxYWY2YjFhMTY4NjRkY2M1YzhiNzhiZWJlNGVfODIwZTEwNGY0OTNjZGNhYTFlY2NkYjJlZGYzYjVmOWZfSUQ6NzY1NDEzMDI1MDgzOTA1MTIzMF8xNzgyMTI2NTk3OjE3ODIyMTI5OTdfVjM)

## 功能说明

|页面|功能点|详细逻辑与约束|
|---|---|---|
|仪表盘|数据总览与快捷入口|统计数据来源于数据库聚合查询（`count` 操作）。点击卡片可跳转至对应列表页。|
|简历管理|上传/解析/手动创建|支持 PDF / Word / Markdown。解析失败时允许用户手动编辑字段。仅允许存在一份主简历（切换主简历需确认覆盖）。|
|JD 解析|结构化抽取与历史存储|必须输出 8 个维度。硬性技能需细分为“语言/框架/中间件/工具”子类。解析结果存入数据库并关联 `user_id`。|
|简历改写|关键词对齐 \+ 经历重排 \+ Bullet 优化|核心约束：严格遵循幻觉控制规则（见下文 AI 评测部分）。改写后生成新版本，不覆盖主简历。|
|面试备战|4 模块生成|面经按“项目/算法/系统设计/行为”分组。项目深挖问题由 LLM 结合简历项目描述 \+ JD 技术栈共同生成。|
|投递追踪|看板进度 \+ 快照关联|看板按阶段（已投/笔试/一面/二面\.\.\.）分组卡片。V1\.0 不做 AI 预测（如通过率），仅做 CRUD。点击条目查看快照。|
|设置|DeepSeek API Key 配置|Key 仅存储在前端 localStorage（本地），不经过后端服务器。校验 Key 有效性时调用 DeepSeek 模型列表接口。|



# 七、非功能性需求与技术约束



## 7\.1 简历解析方案（自建轻量化引擎）



为保障用户数据隐私（不经过任何第三方 API）及零成本运营，简历解析全部采用本地自建方案，不调用任何外部商业解析接口。

|文件类型|解析方案|提取内容|约束说明|
|---|---|---|---|
|**\.docx**|`python-docx` 库|按段落顺序抽取文本 \+ 读取表格内文字|仅支持基于文本的 \.docx，不支持加密文档|
|**\.pdf**|`pdfplumber` 库|逐页抽取文本（按垂直坐标排序还原阅读顺序）|**不支持扫描件/图片型 PDF**（需用户自行 OCR 预处理）。若检测到文本量为 0，前端明确提示"当前 PDF 为扫描件，请上传文字版 PDF"|
|**\.txt / \.md**|原生文件读取|直接按 UTF\-8 编码读取全文|文件大小上限 5MB|
|**手输 / 粘贴**|前端 JSON 直传|按结构化字段（基本信息/教育/经历/项目/技能）直接入库|不做额外解析，仅做 XSS 安全过滤|



**数据隐私承诺**：所有文件解析过程仅发生在后端服务器内存中，解析完成后原始文件不落盘存储，仅保留提取后的结构化文本数据。用户 API Key 仅存储于前端 localStorage，后端不记录。



## 7\.2 简历导出方案（V1\.0 暂不实现）



**当前版本（V1\.0）状态：**

- OpenAPI 接口列表中**不包含** `/export` 相关路由。

- 前端所有"导出"按钮（若 UI 占位存在）置为**灰显不可点击**，悬浮提示文案为："导出功能开发中，敬请期待 V1\.1"。

    

**产品策略说明：**

- V1\.0 聚焦核心闭环：**解析 → 改写 → 备战 → 追踪**，验证 AI 改写质量和幻觉拦截效果。

- 导出属于"工具链下游"功能，优先级低于核心 AI 能力。用户当前可通过**浏览器打印（Ctrl\+P）→ 另存为 PDF** 作为临时替代方案。

- **V1\.1 规划**：届时评估采用 `python-docx`（生成 Word）\+ `weasyprint` 或 `puppeteer`（生成 PDF）的技术方案，并依用户调研决定优先支持哪种导出格式。

    

## 7\.3 数据安全与隐私



|维度|方案说明|
|---|---|
|**API Key 存储**|DeepSeek API Key 仅存储于前端 localStorage，后端服务器不记录、不持久化任何 Key 信息|
|**简历数据**|原始上传文件不落盘存储，解析后仅保留结构化文本；所有数据存储于 Coze TOS 对象存储，传输全程 HTTPS 加密|
|**用户隔离**|当前 V1\.0 为单用户部署（无登录系统），所有数据归属于单一用户实例；V2\.0 如引入多用户，将增加 `user_id` 行级隔离|
|**第三方传输**|除调用 DeepSeek API 进行 AI 推理外，不向任何第三方服务传输用户简历或 JD 数据|



## 7\.4 系统架构约束



|约束项|说明|
|---|---|
|**数据持久化**|不得依赖容器本地文件系统（如 `/tmp`），必须使用 Coze TOS 对象存储；写操作后立即触发 `fire-and-forget` 上传，每 5 分钟执行心跳同步（dirty flag 机制）|
|**启动时拉取**|容器冷启动时必须执行 `sync_db_on_startup()`：若 TOS 远端存在备份文件则拉取恢复，若远端无文件则上传本地空 DB 初始化|
|**依赖管理**|新增 Python 依赖前须评估传递依赖数量，避免引入超过 50 个传递依赖的 SDK（如 `coze-coding-dev-sdk` 含 104 个传递依赖导致部署超时）；优先选用 AWS/GCP 标准 SDK（如 `boto3`）|
|**API 设计规范**|所有 GET 请求必须携带 `?resumeId=` 或 `?jdId=` 作为必填参数；后端校验该资源是否属于当前用户（V2\.0 起）|
|**投递快照机制**|投递记录表不存储动态指针，而是存储 `resume_snapshot_id` 和 `jd_snapshot_id`（对应快照存储路径）。点击历史记录时直接读取快照，禁止重新查询当前最新简历|



## 7\.5 AI 质量约束



|约束项|说明|
|---|---|
|**幻觉拦截（硬性要求）**|系统提示词必须包含"禁止编造"铁律；后端增加实体交集校验（提取改写后的公司名/学校名/职位名/项目名，与原始简历实体列表比对），发现新实体则返回 400 错误，拒绝入库|
|**结构化输入约束**|传递给大模型的简历数据不采用整段文本，而是拆解为 `education: []`、`experience: []`、`project: []` 数组，并在提示词中明确告知"仅允许修改上述数组内每条记录的 description 字段，严禁增加或删除数组元素"|
|**输出格式约束**|面试备战包和简历改写结果必须强制要求返回 **Markdown 格式**，禁止输出纯文本或未格式化的 JSON 字符串；前端使用 `react-markdown` \+ `remark-gfm` 渲染|
|**匹配度计算规则**|基础加权分 =（硬性得分×0\.3）\+（项目得分×0\.25）\+（加分技能×0\.1）\+（画像得分×0\.15）\+（隐藏要求×0\.1）；风险扣减率 = \(100 \- 面试重点考察得分\) / 100；最终得分 = 基础加权分 × \(1 \- 风险扣减率 × 0\.2\)。若硬性技能得分为 0，最终总分直接输出 0|





