(function(){
"use strict";
var P = new URLSearchParams(location.search), API = P.get("api") || "http://10.10.10.2:8010";
var YEARS = ["2018","2019","2020","2021","2022","2023","2024","2025"];
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

var IDX = 0, resumen = {anios:{}}, imgs = {};
var LAY = [];

Promise.all([
  J("/api/guatapuri/resumen").catch(function(){return {anios:{}};}),
  J("/api/imagenes/guatapuri").catch(function(){return [];}),
  J("/api/capas/hand_valledupar").catch(function(){return [];})
]).then(function(v){
  resumen = v[0];
  v[1].forEach(function(im){ imgs[im.clave] = im; });
  var disponibles = YEARS.filter(function(y){ return imgs["anio_"+y]; });
  if(!disponibles.length){
    document.getElementById("kpis").innerHTML = "<div class='nota'>Todavía no hay ningún año listo — la ATOM sigue procesando las imágenes. Actualice esta página en unos minutos.</div>";
    document.getElementById("tlYear").textContent = "—";
    return;
  }
  IDX = YEARS.indexOf(disponibles[disponibles.length-1]);
  document.getElementById("tlRange").value = IDX;
  document.getElementById("tlRange").max = YEARS.length-1;
  if(disponibles.length < YEARS.length){
    document.getElementById("riesgo").innerHTML = "Mostrando "+disponibles.length+" de "+YEARS.length+" años — la ATOM sigue calculando los que faltan ("+YEARS.filter(function(y){return !imgs["anio_"+y];}).join(", ")+"). Esta página no se actualiza sola: vuelva a cargarla más tarde para verlos.";
  }
  init(v[2]);
}).catch(function(e){ document.getElementById("kpis").textContent = "No se pudo leer la base ("+e.message+")."; });

function init(handCapas){
  map.on("load", function(){
    var lbl = map.getStyle().layers.filter(function(l){return l.type==="symbol";})[0]; lbl = lbl && lbl.id;

    map.addSource("img", {type:"image", url: API+"/api/imagen/guatapuri/anio_"+YEARS[IDX], coordinates: (imgs["anio_"+YEARS[IDX]]||{}).corners || [[-73.315,10.531],[-73.181,10.531],[-73.181,10.408],[-73.315,10.408]]});
    map.addLayer({id:"img_l", type:"raster", source:"img", paint:{"raster-opacity":.95, "raster-resampling":"linear"}}, lbl);
    LAY.push({id:"img_l", label:"Imagen satelital Sentinel-2 (temporada seca)", sw:"#8a8f99", on:true});

    map.addSource("linea", {type:"vector", tiles:[API+"/tiles/capa/guatapuri/cauce_osm/{z}/{x}/{y}.pbf"], minzoom:0, maxzoom:16});
    map.addLayer({id:"linea_l", type:"line", source:"linea", "source-layer":"capa", paint:{"line-color":"#12141a", "line-width":1.4, "line-dasharray":[2,1.5]}}, lbl);
    LAY.push({id:"linea_l", label:"Trazado oficial del río (OSM)", sw:"#12141a", on:true});

    if(handCapas.length){
      ["muy_alta","alta"].forEach(function(cl){
        var id = "hd_"+cl;
        map.addSource(id, {type:"vector", tiles:[API+"/tiles/capa/hand_valledupar/"+cl+"/{z}/{x}/{y}.pbf"], minzoom:0, maxzoom:14});
        map.addLayer({id:id, type:"fill", source:id, "source-layer":"capa", layout:{visibility:"none"}, paint:{"fill-color":cl==="muy_alta"?"#08519c":"#3182bd", "fill-opacity":.25}}, lbl);
        LAY.push({id:id, label:"Zona inundable HAND · "+(cl==="muy_alta"?"muy alta":"alta"), sw:cl==="muy_alta"?"#08519c":"#3182bd", on:false});
      });
    }

    ["2010-2011","2020-2022"].forEach(function(anio){
      var id = "ideam_"+anio;
      map.addSource(id, {type:"vector", tiles:[API+"/tiles/capa/ideam_inundacion_historica/"+anio+"/{z}/{x}/{y}.pbf"], minzoom:0, maxzoom:16});
      map.addLayer({id:id, type:"fill", source:id, "source-layer":"capa", layout:{visibility:"none"}, paint:{"fill-color":"#e05a2b", "fill-opacity":.45}}, lbl);
      LAY.push({id:id, label:"Inundación real IDEAM "+anio, sw:"#e05a2b", on:false});
    });

    map.addSource("cauce", {type:"vector", tiles:[API+"/tiles/capacol/guatapuri_cauce/{z}/{x}/{y}.pbf"], minzoom:0, maxzoom:16});
    map.addLayer({id:"cauce_f", type:"fill", source:"cauce", "source-layer":"capa", filter:["==",["get","capa"],YEARS[IDX]], paint:{"fill-color":"#2563eb", "fill-opacity":.55}}, lbl);
    map.addLayer({id:"cauce_l", type:"line", source:"cauce", "source-layer":"capa", filter:["==",["get","capa"],YEARS[IDX]], paint:{"line-color":"#1d4ed8", "line-width":1}}, lbl);

    map.addSource("sedimento", {type:"vector", tiles:[API+"/tiles/capacol/guatapuri_sedimento/{z}/{x}/{y}.pbf"], minzoom:0, maxzoom:16});
    map.addLayer({id:"sed_f", type:"fill", source:"sedimento", "source-layer":"capa", filter:["==",["get","capa"],YEARS[IDX]], layout:{visibility:"none"}, paint:{"fill-color":"#c2410c", "fill-opacity":.6}}, lbl);
    LAY.push({id:"sed_f", label:"Zonas de más sedimento (proxy NDTI)", sw:"#c2410c", on:false});

    var box = document.getElementById("layers");
    LAY.forEach(function(l){
      var d = document.createElement("div"); d.className = "lr";
      d.innerHTML = '<label><input type="checkbox" '+(l.on?"checked":"")+'> <i class="sw" style="background:'+l.sw+'"></i>'+esc(l.label)+"</label>";
      box.appendChild(d);
      d.querySelector("input").addEventListener("change", function(e){ map.setLayoutProperty(l.id, "visibility", e.target.checked?"visible":"none"); });
    });

    var b = new maplibregl.LngLatBounds([-73.3149009,10.4084177],[-73.1810985,10.531347]);
    map.fitBounds(b, {padding:40, duration:0});

    map.on("click", "cauce_f", function(e){ var p = e.features[0].properties; document.getElementById("infoT").textContent = "Cauce "+p.capa; document.getElementById("info").textContent = "Extensión de agua detectada por MNDWI en el compuesto de Sentinel-2 de la temporada seca "+p.capa+"."; });
    map.on("click", "sed_f", function(e){ var p = e.features[0].properties; document.getElementById("infoT").textContent = "Sedimento "+p.capa; document.getElementById("info").textContent = "Zona con mayor proxy de turbidez (NDTI) dentro del agua detectada en "+p.capa+" — indica posible mayor carga de sedimento en superficie, no una medición directa."; });

    actualizar();
  });
}

function actualizar(){
  var anio = YEARS[IDX];
  document.getElementById("tlYear").textContent = anio;
  if(map.getLayer("cauce_f")){ map.setFilter("cauce_f", ["==",["get","capa"],anio]); map.setFilter("cauce_l", ["==",["get","capa"],anio]); }
  if(map.getLayer("sed_f")) map.setFilter("sed_f", ["==",["get","capa"],anio]);
  var im = imgs["anio_"+anio];
  if(map.getSource("img") && im && im.corners){ map.getSource("img").updateImage({url: API+"/api/imagen/guatapuri/anio_"+anio, coordinates: im.corners}); }

  var a = resumen.anios && resumen.anios[anio];
  var kp = document.getElementById("kpis");
  if(a){
    kp.innerHTML = '<div><b>'+fmt(a.area_agua_km2,2)+' km²</b><span>agua detectada (MNDWI), '+anio+'</span></div>'
      + '<div><b>'+fmt(a.poligonos_cauce)+'</b><span>polígonos de cauce</span></div>'
      + '<div><b>'+fmt(a.poligonos_sedimento)+'</b><span>zonas de mayor sedimento</span></div>'
      + '<div><b>'+(a.cambio_km2_vs_anio_anterior==null?"—":(a.cambio_km2_vs_anio_anterior>=0?"+":"")+fmt(a.cambio_km2_vs_anio_anterior,2)+" km²")+'</b><span>cambio vs. año anterior</span></div>';
  } else {
    kp.innerHTML = '<div class="nota">Sin datos todavía para '+anio+' (el análisis puede seguir corriendo en la ATOM).</div>';
  }
  var stat = document.getElementById("tlStat");
  if(a && a.cambio_km2_vs_anio_anterior != null){
    var c = a.cambio_km2_vs_anio_anterior;
    stat.className = "tl-stat " + (c>0.05?"up":c<-0.05?"down":"");
    stat.innerHTML = (c>=0?"+":"")+fmt(c,2)+" km² de agua vs. "+(YEARS[IDX-1]||"");
  } else stat.textContent = "";

  var riesgo = document.getElementById("riesgo");
  var anios = YEARS.filter(function(y){return resumen.anios && resumen.anios[y];});
  if(anios.length>=2){
    var a0 = resumen.anios[anios[0]], a1 = resumen.anios[anios[anios.length-1]];
    var delta = a1.area_agua_km2 - a0.area_agua_km2;
    riesgo.innerHTML = "Entre "+anios[0]+" y "+anios[anios.length-1]+", el agua detectada en el corredor pasó de "+fmt(a0.area_agua_km2,2)+" a "+fmt(a1.area_agua_km2,2)+" km² ("+(delta>=0?"+":"")+fmt(delta,2)+" km²). "
      + (Math.abs(delta) > 0.3 ? "Es un cambio grande para ser solo variación estacional entre compuestos — compare el trazado del cauce de ambos años en el mapa para ver si hay desplazamiento lateral, no solo más o menos agua." : "El cambio es modesto; no sugiere una migración grande del cauce en este período, aunque cada año es un solo compuesto de temporada seca, no un promedio robusto.");
  } else riesgo.textContent = "Aún no hay suficientes años cargados para comparar.";
}

document.getElementById("tlRange").addEventListener("input", function(e){ IDX = +e.target.value; actualizar(); });
var ticks = document.getElementById("tlTicks");
YEARS.forEach(function(y){ var s = document.createElement("span"); s.textContent = y.slice(2); ticks.appendChild(s); });

var playing = null;
document.getElementById("tlPlay").addEventListener("click", function(){
  var btn = this;
  if(playing){ clearInterval(playing); playing = null; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'; return; }
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
  playing = setInterval(function(){
    IDX = (IDX+1) % YEARS.length; document.getElementById("tlRange").value = IDX; actualizar();
  }, 1400);
});
})();
