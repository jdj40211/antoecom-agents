# Base de datos

El schema vive en `migrations/`. Se aplican en orden por el timestamp del nombre.

```bash
supabase link --project-ref <ref>
supabase db push --linked
```

`schema.sql` y `seed.sql` originales quedaron obsoletos: tenían una tabla
`community_agents` con 20 agentes y modelos ya retirados, desincronizada del
catálogo real, que vive en `lib/agents/catalog.ts`.

## Migraciones

| Archivo | Qué hace |
| --- | --- |
| `20260727010740_init_schema.sql` | Perfiles, API keys, ejecuciones, uso diario, guardados y límites por programa |
| `20260821000000_program_control.sql` | Restringe qué columnas del perfil puede editar el usuario y agrega la asignación de programa |

## Asignar un programa

El programa (`club`, `elite`, `trial`) define el rate limit, así que no se toca
desde la app. Desde el SQL editor de Supabase:

```sql
SELECT grant_program('alguien@ejemplo.com', 'club');
```

Funciona tanto si la persona ya se registró como si todavía no: en ese caso
queda anotado y el trigger se lo aplica cuando entre por primera vez.

## Levantar un proyecto desde cero

Pasos para dejar la app funcionando contra un proyecto nuevo de Supabase.

1. **Crear el proyecto** y anotar el ref (la parte de
   `https://<ref>.supabase.co`).

2. **Aplicar las migraciones**:

   ```bash
   supabase link --project-ref <ref>
   supabase db push --linked
   ```

3. **Configurar las URLs de auth** en Authentication > URL Configuration. Sin
   esto el magic link y el OAuth de Google redirigen a un lugar equivocado y el
   login falla sin explicación:

   - Site URL: la URL de producción
   - Redirect URLs: `<produccion>/auth/callback` y `http://localhost:3000/auth/callback`

4. **Habilitar los proveedores** que use el login: Email (magic link) y Google.

5. **Setear las env vars** en Vercel, en los tres entornos (Production, Preview
   y Development). Si faltan en Preview, cada deploy de rama queda sin auth
   posible:

   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   API_KEY_ENCRYPTION_SECRET
   ```

   `API_KEY_ENCRYPTION_SECRET` es un hex de 64 caracteres:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Ojo: si cambia, las API keys ya guardadas dejan de poder descifrarse y cada
   usuario tiene que volver a cargarlas.

6. **Asignar programas** a los miembros con `grant_program`, si no todos quedan
   en `trial` con 10 ejecuciones por día.
