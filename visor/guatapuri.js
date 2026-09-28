(function(){
"use strict";
var YEARS = ["2018","2019","2020","2021","2022","2023","2024","2025"];
var MESES_2025 = ["2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12"];
var MES_NOMBRE = {"01":"ene","02":"feb","03":"mar","04":"abr","05":"may","06":"jun","07":"jul","08":"ago","09":"sep","10":"oct","11":"nov","12":"dic"};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fmt(v,d){return Number(v).toLocaleString("es-CO",{minimumFractionDigits:d||0,maximumFractionDigits:d||0});}
function Jlocal(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
var CAJA_POR_DEFECTO = [[-73.315,10.531],[-73.181,10.531],[-73.181,10.408],[-73.315,10.408]];

var map = new maplibregl.Map({container:"map", style:"https://tiles.openfreemap.org/styles/liberty", center:[-73.245,10.46], zoom:12.2, pitch:0, maxPitch:75});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}), "top-left");
map.addControl(new maplibregl.ScaleControl({unit:"metric"}), "bottom-left");

(function(){var hcLat=document.getElementById("hcLat"),hcLon=document.getElementById("hcLon"),hcZoom=document.getElementById("hcZoom");
  map.on("mousemove",function(e){hcLat.textContent=e.lngLat.lat.toFixed(4);hcLon.textContent=e.lngLat.lng.toFixed(4);});
  function zz(){hcZoom.textContent=map.getZoom().toFixed(1);} map.on("zoom",zz); map.on("load",zz); zz();
  var pt=document.getElementById("panelToggle"), pn=document.getElementById("panel");
  pt.addEventListener("click", function(){ var c=pn.classList.toggle("collapsed"); pt.setAttribute("aria-expanded", c?"false":"true"); setTimeout(function(){map.resize();},360); });
})();

var MODE = "anio";           // "anio" | "mes"
var IDX = 0, IDX_MES = 11;
var resumen = {anios:{}}, resumenMes = {meses:{}}, imgs = {}, imgsMes = {};
var LAY = [], LBL = null, sedVisible = false;
var cauceCache = {}, sedCache = {};

function labels(){ return MODE==="anio" ? YEARS : MESES_2025; }
function idx(){ return MODE==="anio" ? IDX : IDX_MES; }
function setIdx(v){ if(MODE==="anio") IDX=v; else IDX_MES=v; }
function etiquetaActual(){ return labels()[idx()]; }
function claveImagen(et){ return (MODE==="anio"?"anio_":"mes_")+et; }
function tablaImgs(){ return MODE==="anio" ? imgs : imgsMes; }
function tablaResumen(){ return MODE==="anio" ? (resumen.anios||{}) : (resumenMes.meses||{}); }
function nombreTick(et){ return MODE==="anio" ? et.slice(2) : MES_NOMBRE[et.slice(5)]; }
function rutaImagen(et){ return "../datos/guatapuri/imagenes/"+claveImagen(et)+".png"; }
function rutaCapa(tipo, et){
  // tipo: "cauce" | "sedimento". et: "2019" (carpeta anual) o "2025-03" (carpeta mensual)
  return MODE==="anio" ? "../datos/guatapuri/anual/"+tipo+"_"+et+".json" : "../datos/guatapuri/mensual/"+tipo+"_"+et+".json";
}
function cargarCapa(tipo, et){
  var cache = tipo==="cauce" ? cauceCache : sedCache, k = MODE+"_"+et;
  if(cache[k]) return Promise.resolve(cache[k]);
  return Jlocal(rutaCapa(tipo,et)).then(function(gj){ cache[k]=gj; return gj; }).catch(function(){ return {type:"FeatureCollection",features:[]}; });
}

// Todos los datos de este visor (resumenes, listas de imagenes, imagenes mismas, capas de cauce/
// sedimento por anio y mes, HAND e IDEAM) estan congelados como archivos propios en /datos -- ver
// README del repo. Este visor ya no depende de ningun servidor en vivo.
Promise.all([
  Jlocal("../datos/guatapuri/resumen.json").catch(function(){return {anios:{}};}),
  Jlocal("../datos/guatapuri/resumen_mensual.json").catch(function(){return {meses:{}};}),
  Jlocal("../datos/guatapuri/imagenes_anual.json").catch(function(){return [];}),
  Jlocal("../datos/guatapuri/imagenes_mensual.json").catch(function(){return [];})
]).then(function(v){
  resumen = v[0]; resumenMes = v[1];
  v[2].forEach(function(im){ imgs[im.clave] = im; });
  v[3].forEach(function(im){ imgsMes[im.clave] = im; });
  var disponibles = YEARS.filter(function(y){ return imgs["anio_"+y]; });
  if(!disponibles.length){
    document.getElementById("kpis").innerHTML = "<div class='nota'>No se encontraron las imágenes del análisis. Revise que /datos/guatapuri/imagenes esté completo.</div>";
    document.getElementById("tlYear").textContent = "—";
    return;
  }
  IDX = YEARS.indexOf(disponibles[disponibles.length-1]);
  var disponiblesMes = MESES_2025.filter(function(m){ return imgsMes["mes_"+m]; });
  IDX_MES = disponiblesMes.length ? MESES_2025.indexOf(disponiblesMes[disponiblesMes.length-1]) : 11;
  configurarModoUI();
  init();
}).catch(function(e){ document.getElementById("kpis").textContent = "No se pudieron leer los datos propios de este visor ("+e.message+")."; });

function init(){
  map.on("load", function(){
    LBL = map.getStyle().layers.filter(function(l){return l.type==="symbol";})[0]; LBL = LBL && LBL.id;

    map.addSource("img", {type:"image", url: rutaImagen(etiquetaActual()), coordinates: (tablaImgs()[claveImagen(etiquetaActual())]||{}).corners || CAJA_POR_DEFECTO});
    map.addLayer({id:"img_l", type:"raster", source:"img", paint:{"raster-opacity":.95, "raster-resampling":"linear"}}, LBL);
    LAY.push({id:"img_l", label:"Imagen satelital Sentinel-2", sw:"#8a8f99", on:true});

    Jlocal("../datos/guatapuri/cauce_osm.json").then(function(gj){
      map.addSource("linea", {type:"geojson", data: gj});
      map.addLayer({id:"linea_l", type:"line", source:"linea", paint:{"line-color":"#12141a", "line-width":1.4, "line-dasharray":[2,1.5]}}, LBL);
      LAY.push({id:"linea_l", label:"Trazado oficial del río (OSM)", sw:"#12141a", on:true});
      redibujarPanel();
    });

    Promise.all(["muy_alta","alta"].map(function(cl){ return Jlocal("../datos/hand/hand_valledupar_"+cl+".json"); })).then(function(gjs){
      ["muy_alta","alta"].forEach(function(cl,i){
        var id = "hd_"+cl;
        map.addSource(id, {type:"geojson", data: gjs[i]});
        map.addLayer({id:id, type:"fill", source:id, layout:{visibility:"none"}, paint:{"fill-color":cl==="muy_alta"?"#08519c":"#3182bd", "fill-opacity":.25}}, LBL);
        LAY.push({id:id, label:"Zona inundable HAND · "+(cl==="muy_alta"?"muy alta":"alta"), sw:cl==="muy_alta"?"#08519c":"#3182bd", on:false});
      });
      redibujarPanel();
    });

    Promise.all(["2010-2011","2020-2022"].map(function(anio){ return Jlocal("../datos/ideam/"+anio+".json"); })).then(function(gjs){
      ["2010-2011","2020-2022"].forEach(function(anio,i){
        var id = "ideam_"+anio;
        map.addSource(id, {type:"geojson", data: gjs[i]});
        map.addLayer({id:id, type:"fill", source:id, layout:{visibility:"none"}, paint:{"fill-color":"#e05a2b", "fill-opacity":.45}}, LBL);
        LAY.push({id:id, label:"Inundación real IDEAM "+anio, sw:"#e05a2b", on:false});
      });
      redibujarPanel();
    });

    map.addSource("cauce", {type:"geojson", data:{type:"FeatureCollection",features:[]}});
    map.addLayer({id:"cauce_f", type:"fill", source:"cauce", paint:{"fill-color":"#2563eb", "fill-opacity":.55}}, LBL);
    map.addLayer({id:"cauce_l", type:"line", source:"cauce", paint:{"line-color":"#1d4ed8", "line-width":1}}, LBL);
    map.addSource("sedimento", {type:"geojson", data:{type:"FeatureCollection",features:[]}});
    map.addLayer({id:"sed_f", type:"fill", source:"sedimento", layout:{visibility:"none"}, paint:{"fill-color":"#c2410c", "fill-opacity":.6}}, LBL);
    LAY.push({id:"sed_f", label:"Zonas de más sedimento (proxy NDTI)", sw:"#c2410c", on:false});
    redibujarPanel();

    var b = new maplibregl.LngLatBounds([-73.3149009,10.4084177],[-73.1810985,10.531347]);
    map.fitBounds(b, {padding:40, duration:0});

    map.on("click", "cauce_f", function(e){ var p = e.features[0].properties; document.getElementById("infoT").textContent = "Franja húmeda "+(p.anio||etiquetaActual()); document.getElementById("info").textContent = "10% más húmedo (MNDWI) del corredor de 500m del río en "+(p.anio||etiquetaActual())+" — una aproximación gruesa, no el ancho real del cauce (el río es más angosto de lo que Sentinel-2 puede resolver bien)."; });
    map.on("click", "sed_f", function(e){ var p = e.features[0].properties; document.getElementById("infoT").textContent = "Sedimento "+(p.anio||etiquetaActual()); document.getElementById("info").textContent = "Zona con mayor proxy de turbidez (NDTI) dentro de la franja húmeda detectada en "+(p.anio||etiquetaActual())+" — indica posible mayor carga de sedimento en superficie, no una medición directa."; });

    actualizar();
  });
}

function redibujarPanel(){
  var box = document.getElementById("layers");
  box.innerHTML = "";
  LAY.forEach(function(l){
    var d = document.createElement("div"); d.className = "lr";
    d.innerHTML = '<label><input type="checkbox" '+(l.on?"checked":"")+'> <i class="sw" style="background:'+l.sw+'"></i>'+esc(l.label)+"</label>";
    box.appendChild(d);
    d.querySelector("input").addEventListener("change", function(e){
      if(l.id==="sed_f") sedVisible = e.target.checked;
      map.setLayoutProperty(l.id, "visibility", e.target.checked?"visible":"none");
    });
  });
}

function configurarModoUI(){
  var wrap = document.getElementById("tlModo");
  if(!wrap){
    wrap = document.createElement("div"); wrap.id = "tlModo"; wrap.className = "tl-modo";
    wrap.innerHTML = '<button data-m="anio" class="on">Años 2018–2025</button><button data-m="mes">2025 mes a mes</button>';
    document.querySelector(".tl-top").insertBefore(wrap, document.querySelector(".tl-spacer"));
    wrap.querySelectorAll("button").forEach(function(btn){
      btn.addEventListener("click", function(){
        if(btn.dataset.m === MODE) return;
        MODE = btn.dataset.m;
        wrap.querySelectorAll("button").forEach(function(b){ b.classList.toggle("on", b===btn); });
        document.getElementById("tlRange").max = labels().length-1;
        document.getElementById("tlRange").value = idx();
        pintarTicks();
        actualizar();
      });
    });
  }
  document.getElementById("tlRange").max = labels().length-1;
  document.getElementById("tlRange").value = idx();
  pintarTicks();
}

function pintarTicks(){
  var ticks = document.getElementById("tlTicks"); ticks.innerHTML = "";
  labels().forEach(function(et){ var s = document.createElement("span"); s.textContent = nombreTick(et); ticks.appendChild(s); });
}

function actualizar(){
  var et = etiquetaActual();
  document.getElementById("tlYear").textContent = MODE==="anio" ? et : nombreTick(et)+" "+et.slice(0,4);

  if(map.getSource("cauce")) cargarCapa("cauce", et).then(function(gj){ if(map.getSource("cauce")) map.getSource("cauce").setData(gj); });
  if(map.getSource("sedimento")) cargarCapa("sedimento", et).then(function(gj){ if(map.getSource("sedimento")) map.getSource("sedimento").setData(gj); });

  var clave = claveImagen(et), im = tablaImgs()[clave];
  if(map.getSource("img") && im && im.corners){ map.getSource("img").updateImage({url: rutaImagen(et), coordinates: im.corners}); }

  var tabla = tablaResumen(), a = tabla[et];
  var kp = document.getElementById("kpis");
  if(a){
    var extra = MODE==="mes" && a.cobertura_valida!=null ? '<div><b>'+Math.round(a.cobertura_valida*100)+'%</b><span>del tramo con imagen sin nube</span></div>' : '';
    kp.innerHTML = '<div><b>'+fmt(a.area_agua_km2,2)+' km²</b><span>franja húmeda (aprox.), '+et+'</span></div>'
      + '<div><b>'+fmt(a.poligonos_cauce)+'</b><span>polígonos de franja húmeda</span></div>'
      + '<div><b>'+fmt(a.poligonos_sedimento)+'</b><span>zonas de mayor sedimento</span></div>'
      + (MODE==="anio" ? '<div><b>'+(a.cambio_km2_vs_anio_anterior==null?"—":(a.cambio_km2_vs_anio_anterior>=0?"+":"")+fmt(a.cambio_km2_vs_anio_anterior,2)+" km²")+'</b><span>cambio vs. año anterior</span></div>' : extra);
  } else if(a && a.sin_datos) {
    kp.innerHTML = '<div class="nota">Sin escenas Sentinel-2 utilizables para '+et+' (posiblemente un mes muy nublado).</div>';
  } else {
    kp.innerHTML = '<div class="nota">Sin datos todavía para '+et+'.</div>';
  }

  var stat = document.getElementById("tlStat");
  if(MODE==="anio" && a && a.cambio_km2_vs_anio_anterior != null){
    var c = a.cambio_km2_vs_anio_anterior;
    stat.className = "tl-stat " + (c>0.05?"up":c<-0.05?"down":"");
    stat.innerHTML = (c>=0?"+":"")+fmt(c,2)+" km² de agua vs. "+(YEARS[IDX-1]||"");
  } else if(MODE==="mes" && a){
    var etsAntes = MESES_2025.slice(0, IDX_MES).reverse();
    var prevEt = etsAntes.find(function(m){ return tabla[m] && tabla[m].area_agua_km2!=null; });
    if(prevEt){
      var d = a.area_agua_km2 - tabla[prevEt].area_agua_km2;
      stat.className = "tl-stat " + (d>0.05?"up":d<-0.05?"down":"");
      stat.innerHTML = (d>=0?"+":"")+fmt(d,2)+" km² vs. "+nombreTick(prevEt);
    } else stat.textContent = "";
  } else stat.textContent = "";

  var riesgo = document.getElementById("riesgo");
  var riesgoT = document.getElementById("riesgoT");
  if(MODE==="anio"){
    if(riesgoT) riesgoT.textContent = "Lo que muestra el cambio 2018→2025";
    var anios = YEARS.filter(function(y){return resumen.anios && resumen.anios[y];});
    if(anios.length>=2){
      var a0 = resumen.anios[anios[0]], a1 = resumen.anios[anios[anios.length-1]];
      var delta = a1.area_agua_km2 - a0.area_agua_km2;
      riesgo.innerHTML = "Entre "+anios[0]+" y "+anios[anios.length-1]+", la franja húmeda estimada en el corredor pasó de "+fmt(a0.area_agua_km2,2)+" a "+fmt(a1.area_agua_km2,2)+" km² ("+(delta>=0?"+":"")+fmt(delta,2)+" km²). "
        + (Math.abs(delta) > 0.3 ? "Es un cambio grande para ser solo variación estacional entre compuestos — compare la posición de la franja de ambos años en el mapa para ver si hay desplazamiento lateral, no solo más o menos humedad detectada." : "El cambio es modesto; no sugiere una migración grande del cauce en este período. Recuerde que esto es una aproximación gruesa, no una medición precisa del ancho del río.");
    } else riesgo.textContent = "Aún no hay suficientes años cargados para comparar.";
  } else {
    if(riesgoT) riesgoT.textContent = "Estacionalidad dentro de 2025";
    var meses = MESES_2025.filter(function(m){return resumenMes.meses && resumenMes.meses[m] && resumenMes.meses[m].area_agua_km2!=null;});
    if(meses.length>=2){
      var vals = meses.map(function(m){return resumenMes.meses[m].area_agua_km2;});
      var maxM = meses[vals.indexOf(Math.max.apply(null,vals))], minM = meses[vals.indexOf(Math.min.apply(null,vals))];
      riesgo.innerHTML = "Dentro de 2025, el mes con más agua detectada fue "+nombreTick(maxM)+" ("+fmt(Math.max.apply(null,vals),2)+" km²) y el de menos fue "+nombreTick(minM)+" ("+fmt(Math.min.apply(null,vals),2)+" km²). Esta variación mes a mes es sobre todo estacional (lluvias vs. seca) y de cobertura de nubes — no la compare directamente con el cambio entre años, que usa siempre el compuesto de enero-marzo.";
    } else {
      riesgo.innerHTML = "Sin suficientes meses cargados para comparar.";
    }
  }
}

document.getElementById("tlRange").addEventListener("input", function(e){ setIdx(+e.target.value); actualizar(); });

var playing = null;
document.getElementById("tlPlay").addEventListener("click", function(){
  var btn = this;
  if(playing){ clearInterval(playing); playing = null; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'; return; }
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
  playing = setInterval(function(){
    setIdx((idx()+1) % labels().length); document.getElementById("tlRange").value = idx(); actualizar();
  }, 1400);
});
})();
