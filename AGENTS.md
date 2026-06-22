# OfferCraft - 项目上下文

## 项目概述
OfferCraft 是一个智能简历改写与面试备战平台，帮助用户根据不同岗位 JD 快速改写简历并生成面试备战包。

## 技术栈
- **前端**: React 19 + Vite 7 + TypeScript 5 + Tailwind CSS 3 + shadcn/ui 风格组件
- **后端**: Python FastAPI + Uvicorn + SQLAlchemy ORM + SQLite
- **AI**: DeepSeek API (OpenAI 兼容协议, base_url https://api.deepseek.com/v1)
- **对象存储**: boto3 + coze-workload-identity (直接 S3 协议访问 TOS)

## 目录结构
```
├── backend/              # Python FastAPI 后端
│   ├── main.py           # FastAPI 入口 + 静态文件托管
│   ├── database.py       # SQLAlchemy 配置
│   ├── models.py         # 数据库模型 (Resume, JD, TailoredResume, InterviewKit, Pipeline, Setting)
│   ├── schemas.py        # Pydantic 请求/响应模型
│   ├── ai_client.py      # DeepSeek API 客户端 (含流式输出)
│   ├── routers/          # API 路由
│   │   ├── resumes.py    # 简历 CRUD + 上传 + AI 解析
│   │   ├── jd.py         # JD 解析 + 匹配度计算
│   │   ├── rewrite.py    # 简历 AI 改写 (SSE 流式)
│   │   ├── interview.py  # 面试备战包生成 (SSE 流式)
│   │   ├── pipeline.py   # 投递追踪 CRUD
│   │   └── settings.py   # API Key 管理
│   ├── .venv/            # Python 虚拟环境
│   ├── requirements.txt  # Python 依赖
│   └── static/           # 前端构建产物 (部署时)
├── src/                  # React 前端源码
│   ├── main.tsx          # React 入口
│   ├── App.tsx           # 路由配置
│   ├── index.css         # 全局样式 (Tailwind + 自定义)
│   ├── api/client.ts     # API 客户端 (含 SSE 流式)
│   ├── types/index.ts    # TypeScript 类型定义
│   ├── components/       # 组件
│   │   ├── Layout.tsx    # 主布局 (侧边栏 + 内容区)
│   │   └── ui/           # 基础 UI 组件 (Button, Card, Input, Modal, Select, Textarea)
│   └── pages/            # 页面
│       ├── Dashboard.tsx     # 仪表盘
│       ├── Resumes.tsx       # 简历管理
│       ├── JdParser.tsx      # JD 解析
│       ├── ResumeRewrite.tsx # 简历改写
│       ├── InterviewKit.tsx  # 面试备战
│       ├── Pipeline.tsx      # 投递追踪
│       └── Settings.tsx      # 设置
├── scripts/              # 启动脚本
│   ├── prepare.sh        # 依赖安装
│   ├── build.sh          # 构建
│   ├── dev.sh            # 开发启动
│   └── start.sh          # 生产启动
├── data/                 # SQLite 数据库文件
├── .coze                 # Coze 配置
├── .env                  # 环境变量 (DEEPSEEK_API_KEY)
└── DESIGN.md             # 设计规范
```

## 包管理规范
- **前端**: 仅使用 pnpm
- **后端**: Python venv + pip

## 常用命令
- 前端开发: `pnpm vite --host 0.0.0.0 --port 5000`
- 后端开发: `source backend/.venv/bin/activate && python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 5001 --reload --reload-dir backend`
- 构建: `pnpm vite build` (输出到 backend/static/)
- TypeScript 检查: `pnpm ts-check`

## 开发模式架构
- Vite dev server (5000) + FastAPI backend (5001)
- Vite 通过 proxy 将 /api 请求转发到 5001
- 生产模式: FastAPI 同时托管 API 和前端静态文件

## API 端点
| 路径 | 方法 | 功能 |
|------|------|------|
| /api/resumes | GET/POST | 简历列表/创建 |
| /api/resumes/:id | GET/PUT/DELETE | 简历详情/更新/删除 |
| /api/resumes/upload | POST | 上传简历文件 |
| /api/resumes/:id/parse | POST | AI 解析简历 |
| /api/jd | GET | JD 列表 |
| /api/jd/parse | POST | AI 解析 JD |
| /api/jd/:id | GET/PUT/DELETE | JD 操作 |
| /api/rewrite/generate | POST (SSE) | AI 改写简历 |
| /api/rewrite | GET | 改写历史 |
| /api/interview/generate | POST (SSE) | 生成面试备战包 |
| /api/interview | GET | 备战包列表 |
| /api/pipeline | GET/POST | 投递列表/创建 |
| /api/pipeline/:id | GET/PUT/DELETE | 投递操作 |
| /api/settings/api-key | GET/PUT | API Key 管理 |

## 注意事项
- AI 功能需要配置 DeepSeek API Key (通过设置页或环境变量 DEEPSEEK_API_KEY)
- 所有 AI 生成接口使用 SSE 流式输出
- 数据库首次启动自动建表 (lifespan 事件)
- 后端 Python 模块使用 `backend.` 包前缀导入
