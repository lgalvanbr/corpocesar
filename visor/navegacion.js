// Barra de "obra anterior / siguiente" compartida por los 4 visores de mapa.
// Recorre las 8 obras de datos/obras.json en el mismo orden que index.html. Si dos obras
// comparten exactamente la misma vista (p.ej. las dos de Valledupar), el enlace sigue
// apuntando a la obra correcta aunque la pagina de destino se vea igual.
(function(){
  "use strict";
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function indiceActual(obras){
    var pagina = location.pathname.split("/").pop();
    // guatapuri.html no tiene una obra propia en la lista: lo anclamos a la primera de Valledupar
    if(pagina === "guatapuri.html") return 0;
    // marcador explicito &obra=N (lo agregan los propios enlaces del sitio) -- necesario porque
    // dos obras distintas pueden compartir exactamente la misma pagina y los mismos parametros
    // (p.ej. las dos de Valledupar), y comparar solo la URL no alcanza para distinguirlas.
    var n = +new URLSearchParams(location.search).get("obra");
    if(!isNaN(n) && obras[n]) return n;
    var aqui = pagina + location.search;
    var i = obras.findIndex(function(o){ return o.ruta === aqui; });
    if(i>=0) return i;
    i = obras.findIndex(function(o){ return o.ruta.split("?")[0] === pagina; });
    return i>=0 ? i : 0;
  }
  fetch("../datos/obras.json").then(function(r){ return r.json(); }).then(function(obras){
    var idx = indiceActual(obras);
    var wrap = document.createElement("div");
    wrap.className = "hud-navproy";
    wrap.innerHTML =
      '<button class="hud-navproy-btn" id="npPrev" title="Obra anterior" aria-label="Obra anterior">'
      +'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>'
      +'<a class="hud-navproy-actual" href="../index.html#obras" title="Ver todas las obras en el mapa principal">'
        +'<span class="hud-navproy-n">Obra '+(idx+1)+' de '+obras.length+'</span>'
        +'<span class="hud-navproy-t">'+esc(obras[idx].nombre)+'</span>'
      +'</a>'
      +'<button class="hud-navproy-btn" id="npNext" title="Obra siguiente" aria-label="Obra siguiente">'
      +'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>';
    var top = document.querySelector(".hud-top .sep") || document.querySelector(".hud-top");
    if(top && top.parentNode) top.parentNode.insertBefore(wrap, top.nextSibling);
    function ir(i){ location.href = obras[(i+obras.length)%obras.length].ruta; }
    document.getElementById("npPrev").addEventListener("click", function(){ ir(idx-1); });
    document.getElementById("npNext").addEventListener("click", function(){ ir(idx+1); });
  }).catch(function(){});
})();
