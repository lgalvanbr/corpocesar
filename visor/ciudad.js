(function(){
"use strict";
var P=new URLSearchParams(location.search),slug=P.get("c")||"barranquilla",API=P.get("api")||"http://10.10.10.2:8010";
var C={blue:"#2a78d6",navy:"#0d2a5c",gray:"#b9c0be",seq:["#cde2fb","#9ec5f4","#5598e7","#1c5cab","#104281"],warm:["#fbe3b4","#f5c26b","#e79a1f","#b56d0a","#6f3f06"],orange:"#eb6834"};
var fmt=function(v,d){return Number(v).toLocaleString("es-CO",{minimumFractionDigits:d||0,maximumFractionDigits:d||0});},esc=function(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});};
function J(u){return fetch(API+u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
var LAY=[];
Promise.all([J("/api/ciudades/"+slug),J("/api/imagenes/"+slug).catch(function(){return[];}),J("/api/ciudades/"+slug+"/capas")]).then(function(v){init(v[0],v[1],v[2]);}).catch(function(e){document.getElementById("ttl").textContent="No se pudo leer la base ("+e.message+"). ¿La API de la ATOM está activa en "+API+"?";});
function init(R,imgs,capas){
  var RS=R.resumen||{},E=R.edificios||{},pico=RS.pico||{};document.getElementById("ttl").textContent=R.nombre+" · "+R.depto;
  var ctr=[+(P.get("lon")||R.lon),+(P.get("lat")||R.lat)],z=+(P.get("zoom")||11.3);
  var map=new maplibregl.Map({container:"map",style:"https://tiles.openfreemap.org/styles/liberty",center:ctr,zoom:z,pitch:0,maxPitch:75});map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-left");map.addControl(new maplibregl.ScaleControl({unit:"metric"}),"bottom-left");
  function terrenoListo(){if(map.getSource("terreno"))return;map.addSource("terreno",{type:"raster-dem",tiles:["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],tileSize:256,encoding:"terrarium",maxzoom:14,attribution:"Elevación: Mapzen/AWS Terrain Tiles"});
    if(typeof map.setSky==="function"){try{map.setSky({"sky-color":"#cfe8ff","sky-horizon-blend":.5,"horizon-color":"#fff","horizon-fog-blend":.5,"fog-color":"#e8ecef","fog-ground-blend":.3});}catch(e){}}}
  document.getElementById("terreno").addEventListener("change",function(e){terrenoListo();map.setTerrain(e.target.checked?{source:"terreno",exaggeration:1.6}:null);if(e.target.checked&&map.getPitch()<30)map.easeTo({pitch:58});});
  document.getElementById("inclinar").addEventListener("change",function(e){map.easeTo({pitch:e.target.checked?58:0,duration:700});});
  document.getElementById("kpis").innerHTML='<div><b>'+fmt(E.n)+'</b><span>edificios en OpenStreetMap</span></div><div><b>'+fmt(100*E.con_pisos/Math.max(1,E.n),1)+' %</b><span>con pisos o altura</span></div><div><b>'+fmt(pico.inund_km2_17||0,1)+' km²</b><span>agua no permanente en el máximo ('+(pico.fecha||"")+')</span></div><div><b>'+fmt(RS.construido_menos2m_km2||0,1)+' km²</b><span>zona construida a menos de 2 m sobre el nivel del mar</span></div><div><b>'+fmt(E.agua_pico)+'</b><span>edificios con agua detectada en el máximo</span></div><div><b>'+fmt(RS.escenas||0)+'</b><span>escenas de radar analizadas</span></div>';
  var MODO="alt";
  function colorMode(m){if(m==="alt")return["case",["all",["!",["has","pisos"]],["!",["has","altura_m"]]],C.gray,["step",["case",["has","altura_m"],["get","altura_m"],["*",["get","pisos"],3]],C.warm[0],3.6,C.warm[1],6.6,C.warm[2],9.6,C.warm[3],15.6,C.warm[4]]];
    if(m==="agua")return["case",["==",["get","agua_pico"],1],C.blue,C.gray];if(m==="frec")return["match",["get","frec"],3,C.seq[3],2,C.seq[1],1,C.seq[0],C.gray];return["match",["get","elev"],1,C.seq[4],2,C.seq[2],3,C.seq[0],C.gray];}
  var nombres={};capas.forEach(function(c){nombres[c.capa]=c.poligonos;});
  map.on("load",function(){
    var lbl=map.getStyle().layers.filter(function(l){return l.type==="symbol";})[0];lbl=lbl&&lbl.id;
    var rp=imgs.filter(function(i){return i.clave==="radar_pico";})[0];
    if(rp){map.addSource("rp",{type:"image",url:API+"/api/imagen/"+slug+"/radar_pico",coordinates:rp.corners});map.addLayer({id:"rp",type:"raster",source:"rp",layout:{visibility:"none"},paint:{"raster-opacity":.9,"raster-fade-duration":0}},lbl);LAY.push({id:"rp",label:"Radar Sentinel-1 del máximo ("+(pico.fecha||"")+")",ids:["rp"],sw:[C.gray],on:false});}
    function cap(id,capa,paint,label,sw,on){if(!nombres[capa])return;map.addSource(id,{type:"vector",tiles:[API+"/tiles/radar/"+slug+"/"+capa+"/{z}/{x}/{y}.pbf"],minzoom:0,maxzoom:14});map.addLayer({id:id,type:"fill",source:id,"source-layer":"radar",layout:{visibility:on?"visible":"none"},paint:paint},lbl);LAY.push({id:id,label:label,ids:[id],sw:sw,on:!!on});}
    cap("el1","elevacion_menos2m",{"fill-color":C.seq[4],"fill-opacity":.4},"Menos de 2 m sobre el nivel del mar (modelo de superficie)",[C.seq[4]],true);
    cap("el2","elevacion_2a5m",{"fill-color":C.seq[2],"fill-opacity":.5},"2 a 5 m",[C.seq[2]],false);
    cap("el3","elevacion_5a10m",{"fill-color":C.seq[0],"fill-opacity":.45},"5 a 10 m",[C.seq[0]],false);
    cap("fr","frecuencia_2a5pct",{"fill-color":C.orange,"fill-opacity":.35},"Inundada en 2 a 5 % de las escenas",["#f8c9b3"],false);
    cap("fr2","frecuencia_5a10pct",{"fill-color":C.orange,"fill-opacity":.55},"5 a 10 %",["#f19a75"],false);
    cap("fr3","frecuencia_10maspct",{"fill-color":C.orange,"fill-opacity":.8},"10 % o más",[C.orange],false);
    cap("pk","inundacion_pico",{"fill-color":C.blue,"fill-opacity":.75},"Agua no permanente en el máximo",[C.blue],true);
    cap("ab","agua_base",{"fill-color":C.navy,"fill-opacity":.85},"Agua base (mar, ríos, ciénagas)",[C.navy],true);
    if(slug==="valledupar"){
      var HC={muy_alta:["#08519c",.6],alta:["#3182bd",.48],moderada:["#6baed6",.35]};
      ["muy_alta","alta","moderada"].forEach(function(cl){var id="hd_"+cl;map.addSource(id,{type:"vector",tiles:[API+"/tiles/capa/hand_valledupar/"+cl+"/{z}/{x}/{y}.pbf"],minzoom:0,maxzoom:14});map.addLayer({id:id,type:"fill",source:id,"source-layer":"capa",layout:{visibility:"visible"},paint:{"fill-color":HC[cl][0],"fill-opacity":HC[cl][1]}},lbl);});
      map.addSource("hd_c",{type:"vector",tiles:[API+"/tiles/capa/hand_valledupar/cauce_modelado/{z}/{x}/{y}.pbf"],minzoom:0,maxzoom:14});
      map.addLayer({id:"hd_c",type:"line",source:"hd_c","source-layer":"capa",layout:{visibility:"visible"},paint:{"line-color":"#08306b","line-width":1.8,"line-dasharray":[2,1]}},lbl);
      LAY.push({id:"hd_g",label:"Zonas inundables por topografía (modelo HAND, DEM 30 m)",ids:["hd_muy_alta","hd_alta","hd_moderada","hd_c"],sw:["#08519c","#3182bd","#6baed6"],on:true});
      if(P.get("terreno")==="1"){terrenoListo();document.getElementById("terreno").checked=true;document.getElementById("inclinar").checked=true;map.setTerrain({source:"terreno",exaggeration:1.6});map.jumpTo({pitch:+(P.get("pitch")||58)});}
    }
    map.addSource("ed",{type:"vector",tiles:[API+"/tiles/edificios/{z}/{x}/{y}.pbf?ciudad="+slug],minzoom:12,maxzoom:14});
    map.addLayer({id:"ed",type:"fill-extrusion",source:"ed","source-layer":"edificios",minzoom:12,paint:{"fill-extrusion-height":["case",["has","altura_m"],["get","altura_m"],["has","pisos"],["*",["get","pisos"],3],3],"fill-extrusion-base":0,"fill-extrusion-color":colorMode("alt"),"fill-extrusion-opacity":.92}});LAY.push({id:"ed",label:"Edificios (3D; acerque el mapa)",ids:["ed"],sw:C.warm.slice(0,3),on:true,sub:true});
    var box=document.getElementById("layers");LAY.forEach(function(l){var d=document.createElement("div");d.className="lr";d.innerHTML='<label><input type="checkbox" '+(l.on?"checked":"")+'> '+l.sw.map(function(c){return'<i class="sw" style="background:'+c+'"></i>';}).join("")+esc(l.label)+"</label>"+(l.sub?'<select id="modo"><option value="alt">Colorear por pisos</option><option value="agua">por agua en el máximo</option><option value="frec">por frecuencia de inundación</option><option value="elev">por elevación</option></select>':"");box.appendChild(d);
      d.querySelector("input").addEventListener("change",function(ev){l.on=ev.target.checked;l.ids.forEach(function(i){map.setLayoutProperty(i,"visibility",l.on?"visible":"none");});});});
    document.getElementById("modo").addEventListener("change",function(ev){MODO=ev.target.value;map.setPaintProperty("ed","fill-extrusion-color",colorMode(MODO));leg();});
    function leg(){var h="",it=function(c,t){return'<span><i style="background:'+c+'"></i>'+t+"</span>";};if(MODO==="alt")h=it(C.warm[0],"hasta 3 m")+it(C.warm[1],"3-6 m")+it(C.warm[2],"6-9 m")+it(C.warm[3],"9-15 m")+it(C.warm[4],"más de 15 m")+it(C.gray,"sin dato");if(MODO==="agua")h=it(C.blue,"con agua en el máximo")+it(C.gray,"sin agua detectada");if(MODO==="frec")h=it(C.gray,"sin registro")+it(C.seq[0],"2-5 %")+it(C.seq[1],"5-10 %")+it(C.seq[3],"10 % o más");if(MODO==="elev")h=it(C.seq[4],"menos de 2 m")+it(C.seq[2],"2 a 5 m")+it(C.seq[0],"5 a 10 m")+it(C.gray,"más de 10 m");
      if(slug==="valledupar")h+='<span style="flex-basis:100%;height:0"></span>'+it("#08519c","HAND: muy alta (&lt;1 m)")+it("#3182bd","alta (1-2 m)")+it("#6baed6","moderada (2-3 m)")+it("#08306b","cauce modelado");
      document.getElementById("leg").innerHTML=h;}leg();
    map.on("click","ed",function(ev){var p=ev.features[0].properties;document.getElementById("infoT").textContent=p.nombre||"Edificio";document.getElementById("info").innerHTML="<table>"+[["Tipo (OSM)",p.tipo],["Pisos",p.pisos||"sin dato"],["Altura",p.altura_m?fmt(p.altura_m,1)+" m":p.pisos?"~"+fmt(p.pisos*3,0)+" m (estimada)":"sin dato"],["Agua en el máximo",p.agua_pico?"sí":"no"],["Frecuencia de inundación",["sin registro","2-5 % de escenas","5-10 %","10 % o más"][p.frec]],["Elevación sobre el nivel del mar",["sin dato","menos de 2 m","2 a 5 m","5 a 10 m","más de 10 m"][p.elev]]].map(function(r){return"<tr><td>"+r[0]+"</td><td>"+esc(r[1])+"</td></tr>";}).join("")+"</table>";});
    map.on("mouseenter","ed",function(){map.getCanvas().style.cursor="pointer";});map.on("mouseleave","ed",function(){map.getCanvas().style.cursor="";});
  });
  J("/api/hechos?ciudad="+slug+"&limit=60").then(function(hs){var box=document.getElementById("hechos");if(!hs.length){box.innerHTML="<small>Aún no hay hechos verificados para esta ciudad.</small>";return;}box.innerHTML=hs.map(function(h){var dom=(h.url||"").split("/")[2]||"";return"<div><b>"+esc(h.fecha&&h.fecha!=="null"?h.fecha:"s/f")+"</b> "+esc(h.hecho)+" <small><a href='"+esc(h.url)+"' target='_blank' rel='noopener'>"+esc(dom.replace(/^www\./,""))+"</a> · "+esc(h.area||"")+"</small></div>";}).join("");});
}
})();
