# Corpocesar en la mira

Investigación independiente del Laboratorio SinergIA (Ingeniería Civil y Ambiental,
Universidad de los Andes) sobre la contratación ambiental de Corpocesar (NIT 892.301.483)
en el departamento del Cesar, cruzada con imagen satelital y un modelo propio de zonas
inundables. Sitio propio, sin relación contractual ni institucional con la entidad.

## Estructura

- `index.html` — landing y explorador de las 8 obras seleccionadas, con mapa interactivo.
- `contratos.html` — buscador de los 531 contratos activos (lee `contratos_ejecucion.json`).
- `datos/` — todas las capas geográficas, imágenes y resúmenes del sitio **congelados como
  archivos estáticos** (~70 MB): municipios, departamentos, daño ambiental (por municipio y
  el detalle completo de Cesar), zonas inundables HAND, inundación real IDEAM, edificios y
  capas de radar de Valledupar, y las 20 imágenes + polígonos de cauce/sedimento del
  Guatapurí (por año y por mes de 2025). **Todo el sitio, incluidos los 4 visores de mapa,
  es 100% estático: no depende de ningún servidor en vivo.**
- `visor/` — cuatro visores de mapa más detallados: `dano.html` (explorador genérico de daño
  ambiental — datos propios completos solo para Cesar, depto=20; otro departamento cae a la
  API en vivo del laboratorio), `ciudad.html` (solo `?c=valledupar` tiene datos propios
  completos; otras ciudades dependen de la API en vivo), `anime.html` y `guatapuri.html`
  (100% estáticos, sin ninguna dependencia en vivo). `visor/config.js` centraliza la URL de
  esa API en vivo para los casos que aún la necesitan; si no está disponible, cada visor lo
  dice explícitamente en pantalla en vez de quedar en blanco.
- `estilo.css` — sistema de diseño compartido por las páginas principales.

## Cómo se congelaron los datos de `datos/`

Se exportaron el 28 de septiembre de 2026 desde la base PostGIS del laboratorio: la mayoría
por `curl` directo a los mismos endpoints que usaban los visores en vivo (`/api/geo/*`,
`/api/capas/*`, `/api/dano/poligonos`, `/api/imagen*`), y las capas de radar de Valledupar
(`radar_capa`, sin endpoint plano) y los edificios completos directo por SQL
(`ST_AsGeoJSON`) porque no tenían una ruta JSON simple. El daño ambiental del mapa principal
se filtró a los 7 municipios con obra; el explorador genérico de Cesar (`dano.html`) incluye
todo el departamento pero solo polígonos ≥5 ha (documentado en esa página). Si los datos de
origen cambian, hay que repetir esta exportación a mano — no se actualizan solos.

## Ejecutar en local

Cualquier servidor estático sirve. Por ejemplo:

```bash
python3 -m http.server 4300
```

y abrir `http://localhost:4300/`.

## Desplegar

Ver instrucciones de despliegue a Vercel en la conversación / historial del laboratorio.
Resumen: sin build step, se despliega como sitio estático tal cual.
