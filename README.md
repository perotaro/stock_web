
## フォルダ構成

root/
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml            # npm workspaces / pnpm / turborepo など
├─ .github/
│  └─ workflows/
│     ├─ deploy-frontend.yml
│     └─ deploy-backend.yml
│
├─ apps/
│  ├─ frontend/                   # 公開トップ + ログイン後画面
│  │  ├─ public/
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ (public)/
│  │  │  │  │  ├─ page.tsx               # /
│  │  │  │  │  ├─ login/
│  │  │  │  │  │  └─ page.tsx            # /login
│  │  │  │  ├─ (authenticated)/
│  │  │  │  │  ├─ app/
│  │  │  │  │  │  ├─ page.tsx            # /app
│  │  │  │  │  │  ├─ watchlist/
│  │  │  │  │  │  │  └─ page.tsx         # /app/watchlist
│  │  │  │  │  │  └─ systems/
│  │  │  │  │  │     └─ [system_code]/
│  │  │  │  │  │        └─ page.tsx      # /app/systems/{system_code}
│  │  │  │  ├─ components/
│  │  │  │  │  ├─ public/
│  │  │  │  │  ├─ app/
│  │  │  │  │  └─ shared/
│  │  │  │  ├─ features/
│  │  │  │  │  ├─ auth/
│  │  │  │  │  ├─ public-summary/
│  │  │  │  │  ├─ systems/
│  │  │  │  │  └─ watchlist/
│  │  │  │  ├─ lib/
│  │  │  │  │  ├─ api-client/
│  │  │  │  │  ├─ auth/
│  │  │  │  │  └─ config/
│  │  │  │  ├─ hooks/
│  │  │  │  ├─ types/
│  │  │  │  └─ styles/
│  │  │  ├─ tests/
│  │  │  └─ env/
│  │  │     ├─ .env.local.example
│  │  │     ├─ .env.stg.example
│  │  │     └─ .env.prd.example
│  │  └─ package.json
│  │
│  └─ backend/                    # API Gateway + Lambda
│     ├─ src/
│     │  ├─ handlers/
│     │  │  ├─ public/
│     │  │  │  └─ get-public-summary.ts       # GET /api/v1/public/summary
│     │  │  ├─ summary/
│     │  │  │  └─ get-summary.ts              # GET /api/v1/summary
│     │  │  ├─ systems/
│     │  │  │  └─ get-system-latest.ts        # GET /api/v1/systems/{system_code}/latest
│     │  │  └─ watchlist/
│     │  │     └─ get-watchlist.ts            # GET /api/v1/watchlist
│     │  ├─ services/
│     │  │  ├─ public-summary-service.ts
│     │  │  ├─ summary-service.ts
│     │  │  ├─ systems-service.ts
│     │  │  └─ watchlist-service.ts
│     │  ├─ repositories/
│     │  │  ├─ summary-repository.ts
│     │  │  ├─ systems-repository.ts
│     │  │  └─ watchlist-repository.ts
│     │  ├─ middleware/
│     │  │  ├─ auth-context.ts
│     │  │  ├─ error-handler.ts
│     │  │  └─ logger.ts
│     │  ├─ domain/
│     │  │  ├─ public-summary/
│     │  │  ├─ system/
│     │  │  └─ watchlist/
│     │  ├─ lib/
│     │  │  ├─ response.ts
│     │  │  ├─ validator.ts
│     │  │  └─ env.ts
│     │  └─ tests/
│     └─ package.json
│
├─ packages/
│  ├─ shared-types/               # frontend/backend共通の型
│  │  └─ src/
│  │     ├─ public-summary.ts
│  │     ├─ summary.ts
│  │     ├─ systems.ts
│  │     └─ watchlist.ts
│  ├─ api-schema/                 # OpenAPI / zod / DTO定義
│  │  └─ src/
│  ├─ auth-config/                # Cognito/Auth0差し替えを吸収
│  │  └─ src/
│  └─ ui/                         # 共通UI部品が必要なら
│     └─ src/
│
├─ infra/
│  ├─ frontend/                   # S3 / CloudFront / Route53など
│  ├─ backend/                    # API Gateway / Lambda / IAM / Authorizer
│  ├─ auth/                       # Cognito User Pool / callback URL設定など
│  └─ env/
│     ├─ dev/
│     ├─ stg/
│     └─ prd/
│
├─ docs/
│  ├─ architecture/
│  ├─ api/
│  ├─ screens/
│  └─ operations/
│
└─ scripts/
   ├─ build-frontend.sh
   ├─ build-backend.sh
   ├─ deploy-frontend.sh
   └─ deploy-backend.sh