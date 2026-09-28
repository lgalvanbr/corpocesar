# Corpocesar en la mira

Investigación independiente del Laboratorio SinergIA (Ingeniería Civil y Ambiental,
Universidad de los Andes) sobre la contratación ambiental de Corpocesar (NIT 892.301.483)
en el departamento del Cesar, cruzada con imagen satelital y un modelo propio de zonas
inundables. Sitio propio, sin relación contractual ni institucional con la entidad.

## Estructura

- `index.html` — landing y explorador de las 8 obras seleccionadas, con mapa interactivo.
- `contratos.html` — buscador de los 531 contratos activos (lee `contratos_ejecucion.json`).
- `datos/` — capas geográficas propias **congeladas como archivos estáticos** (municipios,
  departamentos, daño ambiental por municipio, zonas inundables HAND por obra). `index.html`
  y `contratos.html` son 100% estáticos: no dependen de ningún servidor en vivo.
- `visor/` — cuatro visores de mapa más detallados (`dano.html`, `ciudad.html`, `anime.html`,
  `guatapuri.html`). **Estos sí leen datos en vivo** de la API del laboratorio
  (`visor/config.js`, hoy solo accesible dentro de la red del laboratorio). Si esa API no
  está disponible, cada visor lo dice explícitamente en pantalla en vez de quedar en blanco.
- `estilo.css` — sistema de diseño compartido por las páginas principales.

## Cómo se congelaron los datos de `datos/`

Se exportaron el 28 de septiembre de 2026 desde la base PostGIS del laboratorio con
`curl` directo a los mismos endpoints que usa `visor/` (`/api/geo/*`, `/api/capas/*`,
`/api/dano/poligonos`), filtrando el daño ambiental a los 7 municipios que tienen una
obra en este sitio. Si los datos de origen cambian, hay que repetir esa exportación a
mano — no se actualizan solos.

## Ejecutar en local

Cualquier servidor estático sirve. Por ejemplo:

```bash
python3 -m http.server 4300
```

y abrir `http://localhost:4300/`.

## Desplegar

Ver instrucciones de despliegue a Vercel en la conversación / historial del laboratorio.
Resumen: sin build step, se despliega como sitio estático tal cual.
