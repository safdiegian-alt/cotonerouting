# Cotonerouting

Código de la aplicación de planificación de retiros y entregas. Exportación basada en la versión 33, commit de origen `a5b85f48c1a425a0db62b0e04996155dd612085d`.

## Contenido

- Interfaz, agenda de direcciones y carga de CSV.
- Motor por zonas, horarios por vehículo, precedencias y descargas en depósito.
- Edición manual: agregar, quitar, mover y reordenar paradas.
- Exportación CSV, enlaces Google Maps y mapa de flota.
- Backend, esquema SQL, migraciones y pruebas.

## Instalación

Requisitos: Node.js >=22.13, npm y Linux (los scripts usan bash, flock y timeout).

```bash
npm ci
cp .env.example .dev.vars
npm run dev
```

Configurar `GOOGLE_MAPS_API_KEY` como secreto del Worker; `.dev.vars` es para desarrollo local de Cloudflare y no debe subirse a Git. La clave se consume en el servidor. Crear el binding D1 `DB` y aplicar las migraciones de `drizzle/` en orden. El esquema está en `db/schema.ts`.

**Estos comandos arrancan el entorno de desarrollo, pero no configuran automáticamente autenticación ni base de datos.** La aplicación actual depende del runtime Cloudflare Workers/D1 y de la autenticación proporcionada por ChatGPT Sites. Las APIs requieren el encabezado de identidad `oai-authenticated-user-id`, inyectado por la plataforma. Fuera de Sites debe adaptarse esa integración a un proveedor de autenticación confiable: no aceptar identidad enviada directamente por el navegador ni exponer un bypass público. Configurar un proyecto propio en `.openai/hosting.json` si se utiliza Sites. Revisar `vite.config.ts`, `worker/index.ts`, `db/raw.ts` y `app/chatgpt-auth.ts` para otro hosting.

## Verificación

```bash
node tests/manual-stops.mjs
node tests/operational-rules.mjs
node tests/maps-segments.mjs
node tests/deterministic-routing.mjs
node tests/territory-integration.mjs
npm run build
```

El motor usa búsquedas heurísticas con presupuestos deterministas de iteraciones; no certifica el óptimo global. Los tiempos y distancias dependen de la matriz recibida de Google. Las reglas operativas se explican en `ROUTING_OPERATIONS.md`.

## Repositorio para compartir

Se incluye un repositorio Git nuevo en la carpeta `.git`, con un único commit de entrega y sin remoto. Se puede descomprimir y agregar un remoto propio para subirlo a GitHub o GitLab. No contiene el historial anterior, claves, base de datos ni archivos CSV de usuarios. Los tests contienen casos de prueba, no una copia de la agenda.

Diferencias respecto a producción: se quitó el identificador del proyecto de hosting y una limpieza histórica de movimientos vinculada al propietario original. No se modificó el motor ni la interfaz. La web publicada no fue alterada.

Más detalles de la infraestructura original: `README-STARTER.md`. No se concede una licencia abierta con esta entrega.
