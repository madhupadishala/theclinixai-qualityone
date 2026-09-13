import { z } from "zod";

const schema = z.object({
  APP_ENV: z.enum(["development", "uat", "production"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().default("TheClinixAI QualityOne"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
});

export function getServerEnv() {
  return schema.parse({
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
  });
}
