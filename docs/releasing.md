# Releasing Schema Forge

Este documento describe el flujo de releases con `main` protegido y publicación a npm basada en tags.

## Reglas del repositorio

- Todos los cambios deben entrar por Pull Request hacia `main`.
- No se permiten commits directos a `main` desde workflows.
- El required status check es el job **Test** del workflow de CI.

## Flujo recomendado

### 1) Desarrollo y PR

1. Crear rama desde `main`.
2. Implementar cambios.
3. Agregar changeset:

   ```bash
   npx changeset
   ```

4. Abrir PR hacia `main`.
5. Esperar CI (job `Test`) en verde.

### 2) Versionado (antes del merge)

El bump de versión y changelog debe quedar en el PR que se mergea, o hacerse manualmente antes de taggear.

Opciones:

- Con Changesets (recomendado):

  ```bash
  npx changeset version
  ```

  Esto actualiza `package.json` y `CHANGELOG.md`.

- Manual (si aplica): actualizar versión/changelog explícitamente antes de crear el tag.

Después, commitear estos cambios en la rama del PR y mergear a `main` mediante PR.

### 3) Publicación por tag

La publicación a npm se dispara con push de tags `v*` usando `.github/workflows/publish.yml`.

```bash
# Asegúrate de estar sobre el commit correcto en main
VERSION=$(node -p "require('./package.json').version")
git tag "v$VERSION"
git push origin "v$VERSION"
```

Al pushear el tag, el workflow ejecuta:

1. `npm ci`
2. `npm run build`
3. `npm publish --access public`

## Workflows

- `.github/workflows/ci.yml`
  - Trigger: `pull_request` a `main`
  - Job name: `Test` (required check)
  - Steps: `npm ci`, `npm test` (si existe), `npm run build`

- `.github/workflows/release-on-main.yml`
  - Trigger: `push` a `main`
  - Solo validación/mensajes de preparación
  - No realiza `git commit` ni `git push origin main`

- `.github/workflows/publish.yml`
  - Trigger: `push` de tags `v*`
  - Publica a npm con Trusted Publishing (OIDC)

## Configuración requerida en npm

Configurar Trusted Publishing del paquete en npm para este repositorio/workflow.

En GitHub Actions, el workflow usa `id-token: write` para intercambio OIDC; no requiere `NPM_TOKEN`.

## Si usas 2FA en npm

- Trusted Publishing evita el uso de tokens de publish y no requiere OTP interactivo en CI.
- Si tu política exige publicación manual, mantener este flujo y ejecutar el publish manual localmente tras crear el tag.

## Checklist de release

1. PR con cambios + changeset/versionado.
2. CI `Test` en verde.
3. Merge del PR a `main`.
4. Crear y pushear tag `vX.Y.Z`.
5. Verificar ejecución de `publish.yml` y release en npm.
