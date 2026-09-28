// Configuracion compartida de los visores de mapa. Estas paginas (dano, ciudad, anime, guatapuri)
// todavia leen datos en vivo de la API del laboratorio (SinergIA, Universidad de los Andes),
// que hoy solo es accesible dentro de esa red. index.html y contratos.html NO dependen de esto:
// ya son 100% estaticos (ver /datos en la raiz del sitio).
// Para apuntar a otra API (p.ej. un tunel publico), cambie DEFAULT_API aqui, o agregue ?api=... a la URL.
var CORPOCESAR_CONFIG = {
  DEFAULT_API: "http://10.10.10.2:8010"
};
