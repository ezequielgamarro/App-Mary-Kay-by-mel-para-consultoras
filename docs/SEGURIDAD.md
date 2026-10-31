# Checklist de seguridad

Copia de trabajo de la checklist del vault Jarvis (`00-INBOX/2026-10-15-checklist-seguridad-proyectos.md`), aplicada a este proyecto. Los puntos `[G]` son prácticas generales no verificadas contra una fuente. Estado al 2026-10-30.

Leyenda: `[x]` cumple y verificado · `[ ]` pendiente · `[?]` no se pudo verificar · `n/a` no aplica (con motivo).

## 1. Secretos y configuración

- [x] `.env` y `.env*.local` en `.gitignore` antes del primer commit.
- [x] `.mcp.json` sin valores secretos: el token se toma de la variable `SUPABASE_PERSONAL_TOKEN`.
- [x] Token guardado en el Administrador de credenciales (entrada `supabase-personal-token`).
- [?] El token de Supabase tiene el mínimo de permisos: no se sabe si se creó acotado a este proyecto.
- [ ] Buscar secretos en el historial de git antes de hacer público el repo. [G]
- [ ] Una clave distinta por entorno (desarrollo y producción). [G]

## 2. Autenticación y permisos

- [ ] Auth de Supabase configurada (fase 0, pendiente).
- [ ] Permisos por usuaria comprobados en el servidor con pruebas SQL (A no lee datos de B).
- [ ] 2FA en GitHub, Supabase y el correo. [G]

## 3. Base de datos

- [x] Migración `profiles` aplicada el 2026-10-31 (versión `20261031011854`); 7 pruebas SQL de RLS superadas.
- [x] RLS activado en `profiles` (única tabla por ahora). Repetir en cada tabla nueva.
- [x] `get_advisors` (seguridad) sin avisos al 2026-10-31. Los 2 avisos sobre `public.rls_auto_enable()` (función previa del proyecto) se corrigieron revocando su EXECUTE a `anon` y `authenticated`; el event trigger que activa RLS en tablas nuevas sigue funcionando (verificado con una tabla temporal). Repetir `get_advisors` tras cada migración.
- [ ] Solo la clave pública en el cliente; nunca `service_role`.
- [ ] Backups y una restauración probada. [G]

## 4. Entradas y errores

- [ ] Validación con Zod en el cliente y reglas equivalentes en la base.
- [ ] Mensajes de error genéricos hacia la usuaria; detalle solo en logs.
- [ ] Límite de tamaño y tipo en la importación Excel/CSV y en las imágenes. [G]

## 5. Registro y monitoreo

- [ ] Logs de Supabase revisados; sin contraseñas ni datos personales en los logs. [G]

## 6. Servidor propio

- n/a: no hay VPS; todo corre en Supabase y EAS.

## 7. Dependencias y publicación

- [x] Lockfile versionado (`package-lock.json`).
- [ ] `npm audit` marca 8 vulnerabilidades (3 altas) en dependencias de las herramientas de Expo. Revisar con `supply-chain-risk-auditor`; `npm audit fix --force` propone bajar Expo a 51 y no se ejecuta.
- [ ] Revisión con `security-review` y `security-audit` antes de publicar.
- [ ] Nombre sin la marca «Mary Kay» antes de publicar en las tiendas.

## 8. Con IA en el proyecto

- [x] Todo contenido externo (video, páginas) se trata como dato, no como instrucciones.
- [ ] `.claude/settings.json` activa el plugin de Expo que dejó la plantilla: confirmar si se queda.
- [ ] Buscar claves pegadas en el código generado antes de cada subida.
