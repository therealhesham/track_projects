# syntax=docker/dockerfile:1

# ملاحظة: Next.js 16 محتاج Node 20.9 على الأقل.
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ---------- 1) الاعتماديات ----------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---------- 2) البناء ----------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

# دومينات الموقع — لازم تتحدد وقت البناء عشان فحص CSRF بتاع Server Actions.
# من غيرها الأدمن بيطلّع "This page couldn't load" وراء أي reverse proxy.
# مثال: --build-arg ALLOWED_ORIGINS="rawaes.com,www.rawaes.com"
ARG ALLOWED_ORIGINS=""
ENV ALLOWED_ORIGINS=$ALLOWED_ORIGINS

# استخدام DATABASE_URL كـ secret لو متاح أو رابط افتراضي لتفادي فشل البناء عند static generation
RUN --mount=type=secret,id=database_url,required=false \
    SECRET_URL="$(cat /run/secrets/database_url 2>/dev/null || echo '')" && \
    export DATABASE_URL="${SECRET_URL:-mysql://dummy:dummy@127.0.0.1:3306/dummy}" && \
    npm run build

# ---------- 3) التشغيل ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# تهيئة مجلد .next وإعطاء الصلاحيات للمستخدم
RUN mkdir .next
RUN chown nextjs:nodejs .next

# نسخ الملفات المطلوبة للتشغيل مع نسخ محرك Prisma ومجلداته لضمان عمله في standalone mode
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

