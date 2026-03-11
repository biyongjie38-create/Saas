# Developer Guide

这份文档只面向项目维护者、开发者和部署人员。

如果你只是产品用户，请优先查看产品内“帮助与支持”页面，不需要阅读本文件。

## 仓库结构

```txt
apps/
  web/          # Next.js 前端、App Router、API Route
  ai-service/   # FastAPI AI service
supabase/
  schema.sql    # 数据库结构与策略
docs/
  api-contracts.md
  deployment-vercel.md
```

## 核心能力

- 热门趋势（视频 / 频道 / 主题）
- 单链接 YouTube 分析
- 爆款作品采集与导入
- 爆款库搜索、分类、导出、回收站
- 会员支付与订单记录
- 报告重跑、分享与导出

## 运行模式

### Preview

适合本地开发、预览和 QA：

- 允许示例数据和本地兜底
- 适合第三方服务尚未全部接通时的页面联调

### Production

适合正式上线：

- 分析、趋势、采集要求真实服务链路可用
- 不再静默回退到演示数据
- 服务不可用时直接返回明确错误

建议同时设置：

```bash
APP_RUNTIME_MODE=production
NEXT_PUBLIC_APP_RUNTIME_MODE=production
```

## Web 环境变量

文件位置：`apps/web/.env.local`

```bash
NEXT_PUBLIC_APP_URL=
AI_SERVICE_URL=http://127.0.0.1:8000

APP_RUNTIME_MODE=preview
NEXT_PUBLIC_APP_RUNTIME_MODE=preview

YOUTUBE_API_KEY=
YOUTUBE_FETCH_MODE=auto
YOUTUBE_REQUEST_TIMEOUT_MS=12000
AI_SERVICE_REQUEST_TIMEOUT_MS=120000
ENABLE_E2E_AUTH_BYPASS=false

DATA_BACKEND=supabase

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
STRIPE_CURRENCY=cny

PDF_CJK_FONT_PATH=
PDF_CJK_BOLD_FONT_PATH=

NEXT_PUBLIC_SUPPORT_EMAIL=
```

## AI Service 环境变量

文件位置：`apps/ai-service/.env`

```bash
AI_PROVIDER=auto
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_TIMEOUT_SEC=120
OPENAI_ANALYSIS_MODEL=gpt-4o-mini
OPENAI_SCORE_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
PINECONE_API_KEY=
PINECONE_INDEX_HOST=
PINECONE_INDEX_NAME=
PINECONE_NAMESPACE=viral-library
```

## 上线前最少依赖

必需：

- Supabase Auth 与数据库
- YouTube Data API Key
- AI service
- 模型供应商 Key

推荐：

- Pinecone
- Stripe
- Resend
- Upstash Redis

## Supabase 初始化

1. 打开 Supabase SQL Editor
2. 执行 `supabase/schema.sql`
3. 确认以下表已创建：
   - `videos`
   - `reports`
   - `usage_logs`
   - `viral_library_items`
   - `user_profiles`
   - `membership_orders`
4. 确认对应策略和索引已生效

## 本地启动

### 启动 Web

```bash
cd apps/web
npm install
npm run dev
```

### 启动 AI Service

```bash
cd apps/ai-service
python -m venv .venv
. .venv/Scripts/Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Pinecone 建索引

如果继续使用默认 embedding 模型，索引维度需要与模型输出维度保持一致。

```bash
cd apps/ai-service
python scripts/index_viral_library.py
```

可选参数：

```bash
python scripts/index_viral_library.py --index-host=... --namespace=viral-library --batch-size=50
```

## 鉴权与回调

正式登录建议使用公网 HTTPS 域名，并配置：

- `Site URL`
- `Redirect URLs`
- `NEXT_PUBLIC_APP_URL`

本地或局域网地址只适合调试，不适合正式对外。

## 会员状态切换

### 线上

直接改 `user_profiles` 中当前用户的：

- `plan`
- `subscription_status`

### 本地

可修改：

- `data/mock-db.json`

或启用：

```bash
ENABLE_E2E_AUTH_BYPASS=true
```

然后使用：

```txt
/api/test-auth/login?plan=pro&next=/dashboard
/api/test-auth/login?plan=free&next=/dashboard
```

## QA 与检查

### Web

```bash
cd apps/web
npm run lint
npm run build
npm run qa:release
npm run qa:live
npm run deploy:check
```

### AI Service

```bash
cd apps/ai-service
python -m compileall app
```

## 真实链路验证前提

运行机器需要能访问：

- `www.youtube.com`
- `i.ytimg.com`
- `www.googleapis.com`
- 模型供应商域名
- Pinecone 域名（如启用）
- GitHub / Vercel / Supabase / Stripe（按使用场景）

如果外网本身不可达，代码链路即使正确，也无法完成真实联调。
