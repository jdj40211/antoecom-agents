# CLAUDE.md — AntoEcom Community Agents Platform

## Qué es esto
Plataforma comunitaria de agentes IA para la comunidad AntoEcom (Club/Elite). Los usuarios traen sus propias API keys (BYOK) y ejecutan agentes organizados por categoría: copy, ads, research, ugc, ecommerce, analytics, strategy, cro. 28 agentes especializados.

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
/auth/callback    → intercambio del código OAuth/magic link por sesión
/auth/signout     → cierre de sesión (POST)
```

## Auth
- `proxy.ts` en la raíz (Next 16 renombró `middleware.ts` a `proxy.ts`) hace el chequeo optimista y redirige al login.
- La verificación real vive en `lib/auth/dal.ts`. Las rutas de API usan `getUser()`, nunca confían solo en el proxy.
- Usar `supabase.auth.getUser()`, nunca `getSession()`: este último lee la cookie sin validarla.
- Sin Supabase configurado, `getUser()` devuelve un usuario de dev para poder trabajar en local.

## Modelos
Los IDs de modelo se rompen cuando el proveedor retira una versión. Antes de tocarlos, verificar contra la documentación oficial del proveedor, no de memoria.
- Anthropic: `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5` (con guiones, no puntos)
- OpenAI: `gpt-4o`, `gpt-4o-mini` — **se retiran el 2026-10-23**, migrar a la familia `gpt-5.6-*`
- El validador del plugin de Vercel marca estos IDs como erróneos porque asume AI Gateway. Es un falso positivo: acá se llama a cada proveedor directo, con la key del usuario.

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

## Base de datos
El schema vive en `supabase/migrations/`. Aplicar con `supabase db push --linked`.

El catálogo de agentes **no** está en la DB: vive en `lib/agents/catalog.ts`. El `supabase/schema.sql` y `supabase/seed.sql` originales quedaron obsoletos (tenían una tabla `community_agents` con 20 agentes y modelos ya retirados, desincronizada del código).

`usage_daily` solo se escribe vía la función `record_agent_usage` (SECURITY DEFINER). No tiene policies de INSERT ni UPDATE a propósito, para que el cliente no pueda inflar sus contadores y saltarse el rate limit.

## Dev mode sin Supabase
Cuando las vars de Supabase no están configuradas, las API routes usan un store en memoria (lib/store/dev-keys.ts). Las keys se pierden al reiniciar el server.

@AGENTS.md
