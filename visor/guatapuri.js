(function(){
"use strict";
var P = new URLSearchParams(location.search), API = P.get("api") || "http://10.10.10.2:8010";
var YEARS = ["2018","2019","2020","2021","2022","2023","2024","2025"];
var MESES_2025 = ["2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12"];
var MES_NOMBRE = {"01":"ene","02":"feb","03":"mar","04":"abr","05":"may","06":"jun","07":"jul","08":"ago","09":"sep","10":"oct","11":"nov","12":"dic"};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fmt(v,d){return Number(v).toLocaleString("es-CO",{minimumFractionDigits:d||0,maximumFractionDigits:d||0});}
function J(u){return fetch(API+u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}

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

function labels(){ return MODE==="anio" ? YEARS : MESES_2025; }
function idx(){ return MODE==="anio" ? IDX : IDX_MES; }
function setIdx(v){ if(MODE==="anio") IDX=v; else IDX_MES=v; }
function etiquetaActual(){ return labels()[idx()]; }
function claveImagen(et){ return (MODE==="anio"?"anio_":"mes_")+et; }
function tablaImgs(){ return MODE==="anio" ? imgs : imgsMes; }
function tablaResumen(){ return MODE==="anio" ? (resumen.anios||{}) : (resumenMes.meses||{}); }
function nombreTick(et){ return MODE==="anio" ? et.slice(2) : MES_NOMBRE[et.slice(5)]; }

Promise.all([
  J("/api/guatapuri/resumen").catch(function(){return {anios:{}};}),
  J("/api/guatapuri/resumen_mensual").catch(function(){return {meses:{}};}),
  J("/api/imagenes/guatapuri").catch(function(){return [];}),
  J("/api/imagenes/guatapuri_mes").catch(function(){return [];}),
  J("/api/capas/hand_valledupar").catch(function(){return [];})
]).then(function(v){
  resumen = v[0]; resumenMes = v[1];
  v[2].forEach(function(im){ imgs[im.clave] = im; });
  v[3].forEach(function(im){ imgsMes[im.clave] = im; });
  var disponibles = YEARS.filter(function(y){ return imgs["anio_"+y]; });
  if(!disponibles.length){
    document.getElementById("kpis").innerHTML = "<div class='nota'>Todavía no hay ningún año listo — la ATOM sigue procesando las imágenes. Actualice esta página en unos minutos.</div>";
    document.getElementById("tlYear").textContent = "—";
    return;
  }
  IDX = YEARS.indexOf(disponibles[disponibles.length-1]);
  var disponiblesMes = MESES_2025.filter(function(m){ return imgsMes["mes_"+m]; });
  IDX_MES = disponiblesMes.length ? MESES_2025.indexOf(disponiblesMes[disponiblesMes.length-1]) : 11;
  configurarModoUI();
  if(disponibles.length < YEARS.length){
    document.getElementById("riesgo").innerHTML = "Mostrando "+disponibles.length+" de "+YEARS.length+" años — la ATOM sigue calculando los que faltan ("+YEARS.filter(function(y){return !imgs["anio_"+y];}).join(", ")+"). Esta página no se actualiza sola: vuelva a cargarla más tarde para verlos.";
  }
  init(v[4]);
}).catch(function(e){ document.getElementById("kpis").textContent = "No se pudo leer la base ("+e.message+")."; });

function init(handCapas){
  map.on("load", function(){
    LBL = map.getStyle().layers.filter(function(l){return l.type==="symbol";})[0]; LBL = LBL && LBL.id;

    map.addSource("img", {type:"image", url: API+"/api/imagen/guatapuri/"+claveImagen(etiquetaActual()), coordinates: (tablaImgs()[claveImagen(etiquetaActual())]||{}).corners || [[-73.315,10.531],[-73.181,10.531],[-73.181,10.408],[-73.315,10.408]]});
    map.addLayer({id:"img_l", type:"raster", source:"img", paint:{"raster-opacity":.95, "raster-resampling":"linear"}}, LBL);
    LAY.push({id:"img_l", label:"Imagen satelital Sentinel-2", sw:"#8a8f99", on:true});

    map.addSource("linea", {type:"vector", tiles:[API+"/tiles/capa/guatapuri/cauce_osm/{z}/{x}/{y}.pbf"], minzoom:0, maxzoom:16});
    map.addLayer({id:"linea_l", type:"line", source:"linea", "source-layer":"capa", paint:{"line-color":"#12141a", "line-width":1.4, "line-dasharray":[2,1.5]}}, LBL);
    LAY.push({id:"linea_l", label:"Trazado oficial del río (OSM)", sw:"#12141a", on:true});

    if(handCapas.length){
      ["muy_alta","alta"].forEach(function(cl){
        var id = "hd_"+cl;
        map.addSource(id, {type:"vector", tiles:[API+"/tiles/capa/hand_valledupar/"+cl+"/{z}/{x}/{y}.pbf"], minzoom:0, maxzoom:14});
        map.addLayer({id:id, type:"fill", source:id, "source-layer":"capa", layout:{visibility:"none"}, paint:{"fill-color":cl==="muy_alta"?"#08519c":"#3182bd", "fill-opacity":.25}}, LBL);
        LAY.push({id:id, label:"Zona inundable HAND · "+(cl==="muy_alta"?"muy alta":"alta"), sw:cl==="muy_alta"?"#08519c":"#3182bd", on:false});
      });
    }

    ["2010-2011","2020-2022"].forEach(function(anio){
      var id = "ideam_"+anio;
      map.addSource(id, {type:"vector", tiles:[API+"/tiles/capa/ideam_inundacion_historica/"+anio+"/{z}/{x}/{y}.pbf"], minzoom:0, maxzoom:16});
      map.addLayer({id:id, type:"fill", source:id, "source-layer":"capa", layout:{visibility:"none"}, paint:{"fill-color":"#e05a2b", "fill-opacity":.45}}, LBL);
      LAY.push({id:id, label:"Inundación real IDEAM "+anio, sw:"#e05a2b", on:false});
    });

    crearCapasDatos();
    LAY.push({id:"sed_f", label:"Zonas de más sedimento (proxy NDTI)", sw:"#c2410c", on:false});

    var box = document.getElementById("layers");
    LAY.forEach(function(l){
      var d = document.createElement("div"); d.className = "lr";
      d.innerHTML = '<label><input type="checkbox" '+(l.on?"checked":"")+'> <i class="sw" style="background:'+l.sw+'"></i>'+esc(l.label)+"</label>";
      box.appendChild(d);
      d.querySelector("input").addEventListener("change", function(e){
        if(l.id==="sed_f") sedVisible = e.target.checked;
        map.setLayoutProperty(l.id, "visibility", e.target.checked?"visible":"none");
      });
    });

    var b = new maplibregl.LngLatBounds([-73.3149009,10.4084177],[-73.1810985,10.531347]);
    map.fitBounds(b, {padding:40, duration:0});

    map.on("click", "cauce_f", function(e){ var p = e.features[0].properties; document.getElementById("infoT").textContent = "Cauce "+p.capa; document.getElementById("info").textContent = "Extensión de agua detectada por MNDWI en el compuesto de Sentinel-2 de "+p.capa+"."; });
    map.on("click", "sed_f", function(e){ var p = e.features[0].properties; document.getElementById("infoT").textContent = "Sedimento "+p.capa; document.getElementById("info").textContent = "Zona con mayor proxy de turbidez (NDTI) dentro del agua detectada en "+p.capa+" — indica posible mayor carga de sedimento en superficie, no una medición directa."; });

    actualizar();
  });
}

function crearCapasDatos(){
  ["cauce_f","cauce_l","sed_f"].forEach(function(id){ if(map.getLayer(id)) map.removeLayer(id); });
  ["cauce","sedimento"].forEach(function(id){ if(map.getSource(id)) map.removeSource(id); });
  var colCauce = "guatapuri_cauce"+(MODE==="mes"?"_mes":"");
  var colSed = "guatapuri_sedimento"+(MODE==="mes"?"_mes":"");
  var et = etiquetaActual();
  map.addSource("cauce", {type:"vector", tiles:[API+"/tiles/capacol/"+colCauce+"/{z}/{x}/{y}.pbf"], minzoom:0, maxzoom:16});
  map.addLayer({id:"cauce_f", type:"fill", source:"cauce", "source-layer":"capa", filter:["==",["get","capa"],et], paint:{"fill-color":"#2563eb", "fill-opacity":.55}}, LBL);
  map.addLayer({id:"cauce_l", type:"line", source:"cauce", "source-layer":"capa", filter:["==",["get","capa"],et], paint:{"line-color":"#1d4ed8", "line-width":1}}, LBL);
  map.addSource("sedimento", {type:"vector", tiles:[API+"/tiles/capacol/"+colSed+"/{z}/{x}/{y}.pbf"], minzoom:0, maxzoom:16});
  map.addLayer({id:"sed_f", type:"fill", source:"sedimento", "source-layer":"capa", filter:["==",["get","capa"],et], layout:{visibility: sedVisible?"visible":"none"}, paint:{"fill-color":"#c2410c", "fill-opacity":.6}}, LBL);
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
        if(map.isStyleLoaded() && map.getSource("cauce")) crearCapasDatos();
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
  if(map.getLayer("cauce_f")){ map.setFilter("cauce_f", ["==",["get","capa"],et]); map.setFilter("cauce_l", ["==",["get","capa"],et]); }
  if(map.getLayer("sed_f")) map.setFilter("sed_f", ["==",["get","capa"],et]);
  var clave = claveImagen(et), im = tablaImgs()[clave];
  if(map.getSource("img") && im && im.corners){ map.getSource("img").updateImage({url: API+"/api/imagen/guatapuri/"+clave, coordinates: im.corners}); }

  var tabla = tablaResumen(), a = tabla[et];
  var kp = document.getElementById("kpis");
  if(a){
    var extra = MODE==="mes" && a.cobertura_valida!=null ? '<div><b>'+Math.round(a.cobertura_valida*100)+'%</b><span>del tramo con imagen sin nube</span></div>' : '';
    kp.innerHTML = '<div><b>'+fmt(a.area_agua_km2,2)+' km²</b><span>agua detectada (MNDWI), '+et+'</span></div>'
      + '<div><b>'+fmt(a.poligonos_cauce)+'</b><span>polígonos de cauce</span></div>'
      + '<div><b>'+fmt(a.poligonos_sedimento)+'</b><span>zonas de mayor sedimento</span></div>'
      + (MODE==="anio" ? '<div><b>'+(a.cambio_km2_vs_anio_anterior==null?"—":(a.cambio_km2_vs_anio_anterior>=0?"+":"")+fmt(a.cambio_km2_vs_anio_anterior,2)+" km²")+'</b><span>cambio vs. año anterior</span></div>' : extra);
  } else if(a && a.sin_datos) {
    kp.innerHTML = '<div class="nota">Sin escenas Sentinel-2 utilizables para '+et+' (posiblemente un mes muy nublado).</div>';
  } else {
    kp.innerHTML = '<div class="nota">Sin datos todavía para '+et+' (el análisis puede seguir corriendo en la ATOM).</div>';
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
      riesgo.innerHTML = "Entre "+anios[0]+" y "+anios[anios.length-1]+", el agua detectada en el corredor pasó de "+fmt(a0.area_agua_km2,2)+" a "+fmt(a1.area_agua_km2,2)+" km² ("+(delta>=0?"+":"")+fmt(delta,2)+" km²). "
        + (Math.abs(delta) > 0.3 ? "Es un cambio grande para ser solo variación estacional entre compuestos — compare el trazado del cauce de ambos años en el mapa para ver si hay desplazamiento lateral, no solo más o menos agua." : "El cambio es modesto; no sugiere una migración grande del cauce en este período, aunque cada año es un solo compuesto de temporada seca, no un promedio robusto.");
    } else riesgo.textContent = "Aún no hay suficientes años cargados para comparar.";
  } else {
    if(riesgoT) riesgoT.textContent = "Estacionalidad dentro de 2025";
    var meses = MESES_2025.filter(function(m){return resumenMes.meses && resumenMes.meses[m] && resumenMes.meses[m].area_agua_km2!=null;});
    if(meses.length>=2){
      var vals = meses.map(function(m){return resumenMes.meses[m].area_agua_km2;});
      var maxM = meses[vals.indexOf(Math.max.apply(null,vals))], minM = meses[vals.indexOf(Math.min.apply(null,vals))];
      riesgo.innerHTML = "Dentro de 2025, el mes con más agua detectada fue "+nombreTick(maxM)+" ("+fmt(Math.max.apply(null,vals),2)+" km²) y el de menos fue "+nombreTick(minM)+" ("+fmt(Math.min.apply(null,vals),2)+" km²). Esta variación mes a mes es sobre todo estacional (lluvias vs. seca) y de cobertura de nubes — no la compare directamente con el cambio entre años, que usa siempre el compuesto de enero-marzo.";
    } else {
      riesgo.innerHTML = "La ATOM está calculando los compuestos mensuales de 2025 (uno por mes, puede tardar). Esta página no se actualiza sola — recárguela para ver más meses.";
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
