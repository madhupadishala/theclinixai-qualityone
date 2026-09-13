# Deployment path

## Branches
- `develop`: development integration and preview deployment.
- `main`: controlled production release line.

## Vercel
Connect this GitHub repository to one Vercel project. Non-production branch pushes create preview deployments. Production is released from `main` only after validation/review.

Required environment variables: `DATABASE_URL`, `AUTH_SECRET`, `APP_ENV`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`.

Do not place secrets in GitHub source. DEV/UAT/PROD must use separate database credentials and data sets.

## Database
Use managed PostgreSQL. Prisma migrations become controlled release artifacts. Production migrations must be reviewed and backed up before execution.
