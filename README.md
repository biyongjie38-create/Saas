# ViralBrain.ai

这是一个面向 YouTube 内容操盘手的 SaaS 项目。当前仓库包含：

- Next.js Web 应用
- FastAPI AI Service
- Supabase Auth + 数据存储
- Stripe 会员支付
- YouTube 数据抓取、趋势页、爆款采集、报告分析、爆款库管理

## 当前已实现

- YouTube 单链接分析工作流
- 报告流式生成
- 报告详情页 5 个标签页
- 字幕抓取与报告入参透传
- 缩略图多模态分析链路
- 热门趋势页真实 YouTube 接入
- 爆款作品采集
- 爆款库导入、删除、恢复、自动向量同步
- Pinecone 对标检索
- Stripe Checkout + webhook 回写
- 中文 PDF 导出字体嵌入
- 中英文界面切换

## 项目结构

```txt
apps/
  web/          # Next.js 前端 + API 路由 + 鉴权
  ai-service/   # FastAPI AI 服务
supabase/
  schema.sql
docs/
  api-contracts.md
  deployment-vercel.md
```

## 运行模式

项目现在支持两种运行模式：

### 1. preview

适合本地开发、演示和 QA。

- 允许 mock / fallback / 本地兜底
- 适合没有全部第三方配置时继续开发页面

### 2. production

适合真实上线。

- 不再静默回退到 mock YouTube 数据
- 不再静默回退到本地 AI 结果
- 趋势、采集、分析都要求真实服务可用
- 服务不可用时直接返回明确错误，便于运营排查

生产环境建议同时设置：

```bash
APP_RUNTIME_MODE=production
NEXT_PUBLIC_APP_RUNTIME_MODE=production
```

## 环境变量

### Web：`apps/web/.env.local`

```bash
NEXT_PUBLIC_APP_URL=
AI_SERVICE_URL=http://127.0.0.1:8000

APP_RUNTIME_MODE=preview
NEXT_PUBLIC_APP_RUNTIME_MODE=preview

YOUTUBE_API_KEY=
YOUTUBE_FETCH_MODE=auto
YOUTUBE_REQUEST_TIMEOUT_MS=12000
ENABLE_E2E_AUTH_BYPASS=false

# 数据后端：mock | supabase | auto
DATA_BACKEND=supabase

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# 可选服务端别名
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
STRIPE_CURRENCY=cny

# PDF 中文字体
PDF_CJK_FONT_PATH=
PDF_CJK_BOLD_FONT_PATH=
```

### AI Service：`apps/ai-service/.env`

```bash
AI_PROVIDER=auto
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_TIMEOUT_SEC=20
OPENAI_ANALYSIS_MODEL=gpt-4o-mini
OPENAI_SCORE_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
PINECONE_API_KEY=
PINECONE_INDEX_HOST=
PINECONE_INDEX_NAME=
PINECONE_NAMESPACE=viral-library
```

## 环境变量说明

- `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是浏览器登录必需项
- `DATA_BACKEND=supabase` 是上线推荐值
- `APP_RUNTIME_MODE=production` 会关闭静默 mock / fallback
- `YOUTUBE_REQUEST_TIMEOUT_MS` 用于限制 YouTube 外部请求超时，避免线上长时间卡死
- `AI_PROVIDER=auto` 表示优先调用真实模型，失败时只有在 preview 模式下才允许本地兜底；production 下会直接报错
- `ENABLE_E2E_AUTH_BYPASS=true` 只建议本地 QA 用
- Windows 开发机上，PDF 导出会自动探测常见中文字体
- 云端部署建议显式设置 `PDF_CJK_FONT_PATH`

## 上线所需的真实依赖

要让产品可以真实运营，至少需要下面这些配置：

### 必需

- Supabase Auth 与数据库
- YouTube Data API Key
- AI Service 可访问
- 模型供应商 Key

### 推荐

- Pinecone
- Stripe 支付

### 说明

- Pinecone 不配时，对标检索仍可运行，但只能走弱化的本地相似度路径
- Stripe 不配时，会员支付页会明确报错，不能正式售卖

## 鉴权与公网回调

如果要让真实用户登录，你必须使用公网 HTTPS 域名。

1. 把 Web 部署到公网域名
2. 在 Supabase `Auth -> URL Configuration` 配置：
   - `Site URL=https://your-domain.com`
   - `Redirect URLs` 包含 `https://your-domain.com/auth/callback`
3. 部署环境建议设置：
   - `NEXT_PUBLIC_APP_URL=https://your-domain.com`

`localhost` 或局域网地址只适合同设备调试，不适合正式对外。

## Supabase 初始化

1. 打开 Supabase SQL Editor
2. 执行 `supabase/schema.sql`
3. 确认下列表已存在：
   - `videos`
   - `reports`
   - `usage_logs`
   - `viral_library_items`
   - `user_profiles`
   - `membership_orders`
4. 确认 RLS 与相关策略已创建

## 启动方式

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

### 建立 Pinecone 索引

如果继续使用默认 `text-embedding-3-small`，Pinecone 索引维度要设为 `1536`。

然后执行：

```bash
cd apps/ai-service
python scripts/index_viral_library.py
```

可选参数：

```bash
python scripts/index_viral_library.py --index-host=... --namespace=viral-library --batch-size=50
```

## 页面

- `/`
- `/login`
- `/auth/callback`
- `/auth/confirm`
- `/dashboard`
- `/dashboard/trends`
- `/dashboard/collector`
- `/dashboard/reports`
- `/report/[id]`
- `/library`
- `/membership`
- `/settings`
- `/support`

## 会员状态控制

你可以通过 3 种方式切换自己是免费还是会员：

### 1. 线上 Supabase

直接修改 `user_profiles` 里的当前用户记录：

- `plan=free` 或 `pro`
- `subscription_status=none` 或 `active`

### 2. 本地 mock 数据

修改：

```txt
data/mock-db.json
```

### 3. 本地测试登录旁路

在 `apps/web/.env.local` 中设置：

```bash
ENABLE_E2E_AUTH_BYPASS=true
```

然后重启 Next.js。

切到会员：

```txt
/api/test-auth/login?plan=pro&next=/dashboard
```

切到免费：

```txt
/api/test-auth/login?plan=free&next=/dashboard
```

正式环境下，仍建议以 Stripe 支付和 webhook 回写作为会员状态真源。

## 如何测试字幕抓取与缩略图多模态

机器必须能访问：

- `www.youtube.com`
- `i.ytimg.com`
- `www.googleapis.com`
- 模型供应商接口域名

测试步骤：

1. 在 `apps/web/.env.local` 配置 `YOUTUBE_API_KEY`
2. 在 `apps/ai-service/.env` 配置 `OPENAI_API_KEY` 或兼容模型供应商
3. 启动 Web 和 AI Service
4. 调用 `POST /api/youtube/fetch`
5. 确认返回里有 `captionsText`
6. 用同一个链接进入 `/dashboard` 跑分析
7. 确认报告快照页出现字幕内容
8. 查看 AI Service 日志：
   - 缩略图下载成功时，先走图片输入
   - 缩略图下载失败时，回退到纯文本输入
9. 再用一个没有字幕的视频验证回退路径

如果当前机器无法出海访问 YouTube，这一项必须换到能正常访问外网的机器或服务器上测试。

## API

- 所有 JSON API 都统一返回 `ok/data/error/request_id`
- `POST /api/analyze`
- `POST /api/youtube/fetch`
- `POST /api/benchmarks`
- `GET /api/reports`
- `GET /api/reports/{id}`
- `POST /api/library/import`
- `POST /api/library/collect`
- `GET /api/me`
- `POST /api/usage/consume`
- `POST /api/membership/checkout`
- `POST /api/membership/checkout/confirm`
- `POST /api/membership/webhook/stripe`

## Playwright QA

### 现有 QA 冒烟

```bash
cd apps/web
npm run qa:release
```

这套用例主要验证：

- 登录
- 输入 YouTube 链接
- 生成报告
- 打开报告页

注意：现有 `qa:release` 默认是 QA mock 模式。

### 真实模式测试建议

如果你要验证上线态，建议在本地或测试环境里同时满足：

- `APP_RUNTIME_MODE=production`
- `NEXT_PUBLIC_APP_RUNTIME_MODE=production`
- Supabase 已配置
- YouTube API 已配置
- AI Service 已启动
- 模型供应商 Key 已配置

否则测试出来的问题更多会是环境缺项，而不是代码问题。

### 新增真实链路冒烟

```bash
cd apps/web
npm run qa:live
```

这套用例会：

- 启动 AI Service
- 以 `production` 运行模式启动 Next.js
- 禁用 mock YouTube / 本地 AI 兜底
- 保留测试专用的 mock 数据后端与测试登录旁路，避免 Supabase RLS 阻塞自动化
- 预检 `YOUTUBE_API_KEY` / `OPENAI_API_KEY` / Pinecone 配置，以及当前机器到 YouTube Data API 的外连能力；前置条件不满足时会明确跳过测试

也就是说，它重点验证的是“真实 YouTube + 真实 AI 提供商链路是否被正确调用”，而不是验证真实登录会话本身。

## 当前上线建议

如果你要正式上线，建议使用下面这组配置：

```bash
APP_RUNTIME_MODE=production
NEXT_PUBLIC_APP_RUNTIME_MODE=production
DATA_BACKEND=supabase
YOUTUBE_FETCH_MODE=live
AI_PROVIDER=auto
```

这样系统就会进入真实模式：

- 不再偷偷回退到 mock 数据
- 不再偷偷回退到本地 AI
- 服务缺失时直接报明确错误
- 更适合真实运营和排障
