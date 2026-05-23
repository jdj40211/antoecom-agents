# CLAUDE.md — AntoEcom Community Agents Platform

## Qué es esto
Plataforma comunitaria de agentes IA para la comunidad AntoEcom (Club/Elite). Los usuarios traen sus propias API keys (BYOK) y ejecutan agentes organizados por categoría: copy, ads, research, UGC, ecommerce, analytics, estrategia. 20 agentes especializados.

**Esto NO es el CEO Dashboard.** Es un producto user-facing para la comunidad.

## Stack
- **Frontend:** Next.js 16, TypeScript, Tailwind CSS v4, Framer Motion, shadcn/ui (base-ui), Zustand
- **Backend:** Supabase (PostgreSQL + Auth + RLS) — proyecto separado del CEO dashboard
- **AI:** Vercel AI SDK v6 multi-provider (Anthropic, OpenAI, Google, OpenRouter)
- **Crypto:** AES-256-GCM para encriptar API keys del usuario
- **Deploy:** Vercel

## Rutas
```
/hub         → landing "¿Qué quieres hacer hoy?"
/agents      → grid de agentes con filtro por categoría
/agents/[s]  → ejecución: form input → streaming output
/history     → historial de ejecuciones
/saved       → outputs guardados
/usage       → dashboard de uso/tokens
/settings/keys    → gestión de API keys (6 providers)
/settings/profile → perfil del usuario
/login       → auth (magic link + Google OAuth)
```

## Reglas
1. TypeScript estricto. No `any`, no `as unknown`
2. Dark mode first, validar en light
3. shadcn/ui usa `@base-ui/react` (NO Radix). Sin `asChild` prop
4. Framer Motion para animaciones
5. No usar `--` (double dash) en texto visible al usuario
6. AI SDK v6: usar `maxOutputTokens` (no `maxTokens`)
7. API keys NUNCA se devuelven al client. Solo hints
8. Mobile responsive (iPhone-first)
9. Mensajes de error en español
10. Datos en dev se almacenan en memoria (lib/store/dev-keys.ts) cuando Supabase no está configurado

## Env vars
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
API_KEY_ENCRYPTION_SECRET (64-char hex)
```

## Dev mode sin Supabase
Cuando las vars de Supabase no están configuradas, las API routes usan un store en memoria (lib/store/dev-keys.ts). Las keys se pierden al reiniciar el server. Para persistencia real, configurar un proyecto Supabase y ejecutar `supabase/schema.sql`.

@AGENTS.md
