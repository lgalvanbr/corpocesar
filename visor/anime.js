(function(){
"use strict";
var P=new URLSearchParams(location.search),API=P.get("api")||"http://10.10.10.2:8010";
var esc=function(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});};
var fmt=function(v,d){return Number(v).toLocaleString("es-CO",{minimumFractionDigits:d||0,maximumFractionDigits:d||0});};
function J(u){return fetch(API+u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
var MUNS=["20178","20228"]; // Chiriguana, Curumani
var HC={muy_alta:["#08519c",.55,"Muy alta (HAND < 1 m)"],alta:["#4292c6",.4,"Alta (1-2 m)"],moderada:["#9ecae1",.3,"Moderada (2-3 m)"]};
var DTIPOS={perdida_bosque:["Pérdida de cobertura arbórea 2001-2024","#d1495b"],suelo_alterado_mineria:["Suelo alterado por minería (huella 2017-2025)","#8a5a2b"]};

var map=new maplibregl.Map({container:"map",style:"https://tiles.openfreemap.org/styles/liberty",center:[-73.52,9.33],zoom:10.6,pitch:0,maxPitch:75});
(function(){var hcLat=document.getElementById("hcLat"),hcLon=document.getElementById("hcLon"),hcZoom=document.getElementById("hcZoom");
  if(!hcLat)return;
  map.on("mousemove",function(e){hcLat.textContent=e.lngLat.lat.toFixed(4);hcLon.textContent=e.lngLat.lng.toFixed(4);});
  function zz(){hcZoom.textContent=map.getZoom().toFixed(1);}
  map.on("zoom",zz);map.on("load",zz);zz();
  var pt=document.getElementById("panelToggle"),pn=document.getElementById("panel");
  if(pt)pt.addEventListener("click",function(){var c=pn.classList.toggle("collapsed");pt.setAttribute("aria-expanded",c?"false":"true");setTimeout(function(){map.resize();},360);});
})();
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-left");
map.addControl(new maplibregl.ScaleControl({unit:"metric"}),"bottom-left");
function terrenoListo(){if(map.getSource("terreno"))return;map.addSource("terreno",{type:"raster-dem",tiles:["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],tileSize:256,encoding:"terrarium",maxzoom:14,attribution:"Elevación: Mapzen/AWS Terrain Tiles"});
  if(typeof map.setSky==="function"){try{map.setSky({"sky-color":"#cfe8ff","sky-horizon-blend":.5,"horizon-color":"#fff","horizon-fog-blend":.5,"fog-color":"#e8ecef","fog-ground-blend":.3});}catch(e){}}}
document.getElementById("terreno").addEventListener("change",function(e){terrenoListo();map.setTerrain(e.target.checked?{source:"terreno",exaggeration:1.6}:null);if(e.target.checked&&map.getPitch()<30)map.easeTo({pitch:58});});
document.getElementById("inclinar").addEventListener("change",function(e){map.easeTo({pitch:e.target.checked?58:0,duration:700});});

Promise.all([J("/api/geo/municipios?depto=20&tol=0.0015"), J("/api/dano/resumen?depto=20")]).then(function(v){init(v[0], v[1]);}).catch(function(e){document.getElementById("info").textContent="No se pudo leer la base ("+e.message+").";});

function init(munGeo, resumen){
  var focoFeats = munGeo.features.filter(function(f){return MUNS.indexOf(f.properties.codigo)>=0;});
  var resFoco = resumen.filter(function(r){return MUNS.indexOf(r.municipio)>=0;});
  var kp = {}; resFoco.forEach(function(r){kp[r.tipo]=(kp[r.tipo]||0)+ +r.area_ha;});
  document.getElementById("kpis").innerHTML =
    '<div><b>'+fmt(kp.perdida_bosque||0)+' ha</b><span>bosque perdido 2001-2024 (Hansen)</span></div>'
    +'<div><b>'+fmt(kp.suelo_alterado_mineria||0)+' ha</b><span>huella minera, suma 2017-2025 (Sentinel-2)</span></div>';

  var LAY=[];
  var box=document.getElementById("layers");
  function fila(l){var d=document.createElement("div");d.className="lr";d.innerHTML='<label><input type="checkbox" '+(l.on?"checked":"")+'> <i class="sw" style="background:'+l.sw+'"></i>'+esc(l.label)+"</label>";box.appendChild(d);
    d.querySelector("input").addEventListener("change",function(e){l.ids.forEach(function(i){map.setLayoutProperty(i,"visibility",e.target.checked?"visible":"none");});});}

  (map.isStyleLoaded()?function(f){f();}:function(f){map.once("load",f);})(function(){
    var lbl=map.getStyle().layers.filter(function(l){return l.type==="symbol";})[0];lbl=lbl&&lbl.id;
    map.addSource("mun",{type:"geojson",data:{type:"FeatureCollection",features:focoFeats}});
    map.addLayer({id:"mun_l",type:"line",source:"mun",paint:{"line-color":"#000","line-width":1.8}},lbl);
    var b=new maplibregl.LngLatBounds();focoFeats.forEach(function(f){(f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates).forEach(function(p){p[0].forEach(function(c){b.extend(c);});});});
    if(!b.isEmpty())map.fitBounds(b,{padding:30,duration:0});

    Object.keys(HC).forEach(function(cl){var id="hd_"+cl;
      map.addSource(id,{type:"vector",tiles:[API+"/tiles/capa/hand_anime/"+cl+"/{z}/{x}/{y}.pbf"],minzoom:0,maxzoom:14});
      map.addLayer({id:id,type:"fill",source:id,"source-layer":"capa",layout:{visibility:"visible"},paint:{"fill-color":HC[cl][0],"fill-opacity":HC[cl][1]}},lbl);
      LAY.push({label:HC[cl][2],sw:HC[cl][0],ids:[id],on:true}); fila(LAY[LAY.length-1]);});
    map.addSource("hd_c",{type:"vector",tiles:[API+"/tiles/capa/hand_anime/cauce_modelado/{z}/{x}/{y}.pbf"],minzoom:0,maxzoom:14});
    map.addLayer({id:"hd_c",type:"line",source:"hd_c","source-layer":"capa",layout:{visibility:"visible"},paint:{"line-color":"#08306b","line-width":1.8,"line-dasharray":[2,1]}},lbl);
    LAY.push({label:"Cauces modelados desde el DEM (no es la línea oficial del río)",sw:"#08306b",ids:["hd_c"],on:true}); fila(LAY[LAY.length-1]);
    if(P.get("terreno")==="1"){terrenoListo();document.getElementById("terreno").checked=true;document.getElementById("inclinar").checked=true;map.setTerrain({source:"terreno",exaggeration:1.6});map.jumpTo({pitch:+(P.get("pitch")||55)});}

    map.addSource("dano",{type:"vector",tiles:[API+"/tiles/dano/{z}/{x}/{y}.pbf?depto=20"],minzoom:0,maxzoom:14});
    var col=["match",["get","tipo"]];Object.keys(DTIPOS).forEach(function(t){col.push(t,DTIPOS[t][1]);});col.push("#888");
    var fMun=["in",["get","municipio"],["literal",MUNS]];
    map.addLayer({id:"dano_f",type:"fill",source:"dano","source-layer":"dano",filter:fMun,layout:{visibility:"visible"},paint:{"fill-color":col,"fill-opacity":.65}},lbl);
    fila({label:"Pérdida de bosque (rojo) y huella minera (café), satélite",sw:"#d1495b",ids:["dano_f"],on:true});

    map.on("click","dano_f",function(e){var p=e.features[0].properties;document.getElementById("infoT").textContent=DTIPOS[p.tipo]?DTIPOS[p.tipo][0]:p.tipo;
      document.getElementById("info").innerHTML="<table><tr><td>Año</td><td>"+p.anio+"</td></tr><tr><td>Área</td><td>"+fmt(p.area_ha,1)+" ha</td></tr></table>";});
    ["hd_muy_alta","hd_alta","hd_moderada","dano_f"].forEach(function(id){map.on("mouseenter",id,function(){map.getCanvas().style.cursor="pointer";});map.on("mouseleave",id,function(){map.getCanvas().style.cursor="";});});
  });
}
})();
