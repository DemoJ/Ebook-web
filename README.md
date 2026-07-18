# LeafRead · 电子书阅读网站

LeafRead 是一个同时适配电脑端和手机端的多用户 EPUB 在线阅读网站。用户可以上传并管理自己的电子书，将书籍设为私有或共享，并在任意设备上从上次中断的位置继续阅读；每位用户的书架和阅读进度相互隔离。电脑端支持键盘翻页，手机端支持沉浸式阅读、点击分区翻页及左右滑动翻页。

## 效果预览

### 书架界面

![LeafRead 书架界面](./images/image1.png)

### 阅读界面

![LeafRead 阅读界面](./images/image2.png)

## 技术栈

- 后端：FastAPI + SQLAlchemy + PostgreSQL（依赖用 `uv` / `pyproject.toml`）
- 前端：React + TypeScript + Vite + epub.js
- 部署：Docker Compose（Nginx 同源代理 `/api`）

## 快速启动（Docker）

```bash
cp .env.example .env
# 修改 EBOOK_SECRET_KEY 与超级管理员密码
docker compose up -d --build
```

浏览器打开：http://localhost:8080

默认超级管理员：

- Docker（见根目录 `.env.example`）：`admin` / `admin123`
- 本地默认（未配置环境变量时）：`admin` / `admin123`

## 环境变量说明

项目里有两套 `.env`，用途不同：

| 文件 | 谁读取 | 用途 |
|---|---|---|
| 根目录 `.env` | Docker Compose | 替换 `docker-compose.yaml` 中的 `${VAR}`，并注入到容器 |
| `backend/.env` | FastAPI（pydantic-settings） | 本地开发时后端直接读取 |

后端环境变量统一使用前缀 `EBOOK_`。  
例如代码字段 `secret_key` 对应环境变量 `EBOOK_SECRET_KEY`。

### 根目录 `.env`（Docker Compose）

复制模板：

```bash
cp .env.example .env
```

| 变量 | 必填 | 默认值 | 含义 |
|---|---|---|---|
| `PORT` | 否 | `8080` | 宿主机访问前端的端口，映射到容器 80 |
| `POSTGRES_PASSWORD` | 建议修改 | `ebook-pass` | PostgreSQL 密码；同时用于拼接后端数据库连接串 |
| `EBOOK_SECRET_KEY` | **生产必改** | `please-change-this-secret-key-now` | JWT 签名密钥，至少 16 位，生产环境请用足够长的随机串 |
| `EBOOK_COOKIE_SECURE` | 否 | `false` | 登录 Cookie 是否仅 HTTPS 发送；本地 HTTP 保持 `false`，公网 HTTPS 设为 `true` |
| `EBOOK_SUPERADMIN_USERNAME` | 否 | `admin` | 首次启动时创建的超级管理员用户名 |
| `EBOOK_SUPERADMIN_PASSWORD` | **生产必改** | `admin123` | 超级管理员初始密码 |
| `EBOOK_ACCESS_TOKEN_MINUTES` | 否 | `480` | 登录会话有效期（分钟），默认 8 小时 |
| `EBOOK_MAX_UPLOAD_BYTES` | 否 | `104857600` | 单本 EPUB 最大上传体积（字节），默认约 100MB |

说明：

- Docker 下数据库地址由 Compose 自动组装，无需在根目录 `.env` 写 `EBOOK_DATABASE_URL`
- Docker 下书籍存储目录固定为容器内 `/data/storage`，并挂载到 Docker volume
- 超级管理员仅在**首次启动且库中不存在该用户名时**创建；之后改 `.env` 密码不会自动更新已有账号

### `backend/.env`（本地开发）

本地不走 Docker 时，可在 `backend` 目录创建：

```bash
cp backend/.env.example backend/.env
```

| 变量 | 必填 | 默认值 | 含义 |
|---|---|---|---|
| `EBOOK_DATABASE_URL` | 否 | `sqlite:///./ebook.db` | 数据库连接串；本地默认 SQLite，也可连本机 PostgreSQL |
| `EBOOK_SECRET_KEY` | **生产必改** | `change-me-in-production` | JWT 签名密钥 |
| `EBOOK_COOKIE_SECURE` | 否 | `false` | 是否仅 HTTPS 发送 Cookie |
| `EBOOK_STORAGE_DIR` | 否 | `./storage` | EPUB 与封面文件存储目录 |
| `EBOOK_SUPERADMIN_USERNAME` | 否 | `admin` | 超级管理员用户名 |
| `EBOOK_SUPERADMIN_PASSWORD` | **生产必改** | `admin123` | 超级管理员初始密码 |
| `EBOOK_ACCESS_TOKEN_MINUTES` | 否 | `480` | 登录会话有效期（分钟） |
| `EBOOK_MAX_UPLOAD_BYTES` | 否 | `104857600` | 单文件上传大小上限（字节） |
| `EBOOK_MAX_EPUB_ENTRIES` | 否 | `2000` | EPUB 内最大文件条目数，用于防 ZIP Bomb |
| `EBOOK_MAX_UNCOMPRESSED_BYTES` | 否 | `524288000` | EPUB 解压后总大小上限（约 500MB） |
| `EBOOK_MAX_COMPRESSION_RATIO` | 否 | `100` | 单个条目最大压缩比，用于防 ZIP Bomb |

本地 PostgreSQL 示例：

```env
EBOOK_DATABASE_URL=postgresql+psycopg://ebook:password@127.0.0.1:5432/ebook
```

### 生产环境建议

1. 将 `EBOOK_SECRET_KEY` 设为足够长的随机字符串  
2. 将 `EBOOK_SUPERADMIN_PASSWORD` 设为强密码  
3. 公网 HTTPS 部署时设置 `EBOOK_COOKIE_SECURE=true`  
4. 不要将 `.env` 提交到 Git  
5. 修改超级管理员密码后，若账号已存在，请在系统内改密或由管理员重置，而不是只改 `.env`

## 本地开发

### 后端（uv）

```bash
cd backend
uv sync --group dev
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器默认将 `/api` 代理到 `http://127.0.0.1:8000`。

### 测试

```bash
cd backend
uv run pytest -q
```

## P0 功能

- 管理员创建用户 / 启禁用 / 重置密码
- 普通用户上传 EPUB、编辑元数据、设置私有或共享
- 我的书架、我的上传、共享书库
- EPUB 在线阅读、目录、字号、主题
- 阅读进度按用户隔离，续读恢复
- 管理员下架 / 恢复书籍
- 管理员默认不能读取其他用户的私有正文

## 目录

```text
backend/              FastAPI 服务
frontend/             React 前端
docker-compose.yaml   Docker 编排
.env.example          Docker 环境变量模板
backend/.env.example  本地后端环境变量模板
```
