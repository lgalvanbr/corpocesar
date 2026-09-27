(function(){
"use strict";
window.addEventListener("error",function(e){var d=document.createElement("div");d.style.cssText="position:fixed;top:0;left:0;right:0;z-index:99;background:#fee;color:#900;padding:8px 12px;font:13px monospace";d.textContent="Error: "+e.message+" línea "+(e.lineno||"")+":"+(e.colno||"");document.body.appendChild(d);});
var P=new URLSearchParams(location.search),DEP=P.get("depto")||"20",API=P.get("api")||"http://10.10.10.2:8010";
var TIPOS={perdida_bosque:["Pérdida de cobertura arbórea (Hansen)","#d1495b"],perdida_bosque_lulc:["Pérdida de bosque (cobertura anual)","#eb6834"],suelo_alterado_mineria:["Suelo alterado por minería a cielo abierto (Sentinel-2; huella de cada año)","#8a5a2b"],suelo_desnudo_nuevo:["Suelo desnudo nuevo (posible minería, quema o cantera)","#8a5a2b"],expansion_construida:["Expansión de suelo construido","#6f4aa8"],perdida_agua_humedal:["Pérdida de agua o humedal","#2a78d6"]};
var fmt=function(v,d){return Number(v).toLocaleString("es-CO",{minimumFractionDigits:d||0,maximumFractionDigits:d||0});},esc=function(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});};
var ACT={},YR=2024,MUN={},RES=[],timer=null,ESTADO={suelo_alterado_mineria:true};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function J(u){return fetch(API+u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
var map=new maplibregl.Map({container:"map",style:"https://tiles.openfreemap.org/styles/liberty",center:[-73.5,9.5],zoom:7.4,pitch:0,maxPitch:75});map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-left");map.addControl(new maplibregl.ScaleControl({unit:"metric"}),"bottom-left");
(function(){var hcLat=document.getElementById("hcLat"),hcLon=document.getElementById("hcLon"),hcZoom=document.getElementById("hcZoom");
  if(!hcLat)return;
  map.on("mousemove",function(e){hcLat.textContent=e.lngLat.lat.toFixed(4);hcLon.textContent=e.lngLat.lng.toFixed(4);});
  function z(){hcZoom.textContent=map.getZoom().toFixed(1);}
  map.on("zoom",z);map.on("load",z);z();
  var pt=document.getElementById("panelToggle"),pn=document.getElementById("panel");
  if(pt)pt.addEventListener("click",function(){var c=pn.classList.toggle("collapsed");pt.setAttribute("aria-expanded",c?"false":"true");setTimeout(function(){map.resize();},360);});
})();
function terrenoListo(){if(map.getSource("terreno"))return;map.addSource("terreno",{type:"raster-dem",tiles:["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],tileSize:256,encoding:"terrarium",maxzoom:14,attribution:"Elevación: Mapzen/AWS Terrain Tiles"});
  if(typeof map.setSky==="function"){try{map.setSky({"sky-color":"#cfe8ff","sky-horizon-blend":.5,"horizon-color":"#fff","horizon-fog-blend":.5,"fog-color":"#e8ecef","fog-ground-blend":.3});}catch(e){}}}
document.getElementById("terreno").addEventListener("change",function(e){terrenoListo();map.setTerrain(e.target.checked?{source:"terreno",exaggeration:1.6}:null);if(e.target.checked&&map.getPitch()<30)map.easeTo({pitch:58});});
document.getElementById("inclinar").addEventListener("change",function(e){map.easeTo({pitch:e.target.checked?58:0,duration:700});});
Promise.all([J("/api/dano/resumen?depto="+DEP),J("/api/geo/municipios?depto="+DEP+"&tol=0.002"),J("/api/geo/departamentos?tol=0.003"),J("/api/dano/tipos")]).then(function(v){RES=v[0];v[1].features.forEach(function(f){MUN[f.properties.codigo]=f.properties.nombre;});init(v[1],v[2],v[3]);}).catch(function(e){document.getElementById("info").textContent="No se pudo leer la base ("+e.message+"). Revise que la API de la ATOM esté activa en "+API+".";});
function init(munGeo,depGeo,tipos){
  var prese=Object.keys(TIPOS).filter(function(t){return RES.some(function(r){return r.tipo===t;});});var pt=(P.get("tipos")||"").split(",").filter(Boolean);prese.forEach(function(t,i){ACT[t]=pt.length?pt.indexOf(t)>=0:(i===0||t==="perdida_bosque");});
  var box=document.getElementById("tipos");prese.forEach(function(t){var d=document.createElement("div");d.className="lr";d.innerHTML='<label><input type="checkbox" data-t="'+t+'" '+(ACT[t]?"checked":"")+'> <i class="sw" style="background:'+TIPOS[t][1]+'"></i>'+esc(TIPOS[t][0])+"</label>";box.appendChild(d);d.querySelector("input").addEventListener("change",function(e){ACT[t]=e.target.checked;filtra();resumen();});});
  var yrs=RES.map(function(r){return r.anio;}),y0=Math.min.apply(null,yrs),y1=Math.max.apply(null,yrs),sl=document.getElementById("yr");sl.min=y0;sl.max=y1;YR=+(P.get("anio")||y1);sl.value=YR;document.getElementById("yv").textContent=YR;document.getElementById("rng").textContent=y0+"–"+y1;
  var dn=depGeo.features.filter(function(f){return f.properties.codigo===DEP;})[0];var sel=document.getElementById("depSel");depGeo.features.slice().sort(function(a,b){return a.properties.nombre.localeCompare(b.properties.nombre);}).forEach(function(f){var o=document.createElement("option");o.value=f.properties.codigo;o.textContent=f.properties.nombre;if(f.properties.codigo===DEP)o.selected=true;sel.appendChild(o);});sel.addEventListener("change",function(){P.set("depto",sel.value);location.search=P.toString();});document.getElementById("ttl").textContent="Daño ambiental · "+(dn?dn.properties.nombre:DEP);J("/api/hechos?proyecto=mineria&departamento="+encodeURIComponent(dn?dn.properties.nombre:"")+"&limit=25").then(function(hs){var b=document.getElementById("prensa");if(!hs.length){b.textContent="Aún no hay hechos verificados de prensa para este departamento.";return;}b.innerHTML=hs.map(function(h){var dom=(h.url||"").split("/")[2]||"";return"<div style='margin-bottom:8px'><b>"+esc(h.fecha&&h.fecha!=="null"?h.fecha:"s/f")+"</b> "+esc(h.hecho)+" <a href='"+esc(h.url)+"' target='_blank' rel='noopener'>"+esc(dom.replace(/^www\./,""))+"</a>"+(h.municipio&&h.municipio!=="null"?" · "+esc(h.municipio):"")+"</div>";}).join("");}).catch(function(){});
  (map.isStyleLoaded()?function(f){f();}:function(f){map.once("load",f);})(function(){
    var lbl=map.getStyle().layers.filter(function(l){return l.type==="symbol";})[0];lbl=lbl&&lbl.id;
    map.addSource("mun",{type:"geojson",data:munGeo});map.addLayer({id:"mun_l",type:"line",source:"mun",paint:{"line-color":"#333","line-width":.6,"line-opacity":.5}},lbl);
    map.addSource("dep",{type:"geojson",data:{type:"FeatureCollection",features:depGeo.features.filter(function(f){return f.properties.codigo===DEP;})}});map.addLayer({id:"dep_l",type:"line",source:"dep",paint:{"line-color":"#000","line-width":1.8}},lbl);
    var MUN_SEL=P.get("mun");
    var focoFeats=MUN_SEL?munGeo.features.filter(function(f){return f.properties.codigo===MUN_SEL;}):depGeo.features.filter(function(f){return f.properties.codigo===DEP;});
    var b=new maplibregl.LngLatBounds();focoFeats.forEach(function(f){(f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates).forEach(function(p){p[0].forEach(function(c){b.extend(c);});});});if(!b.isEmpty())map.fitBounds(b,{padding:MUN_SEL?60:30,duration:0});
    if(MUN_SEL){map.addSource("foco",{type:"geojson",data:{type:"FeatureCollection",features:focoFeats}});map.addLayer({id:"foco_l",type:"line",source:"foco",paint:{"line-color":"#5c8a3a","line-width":2.6}},lbl);
      var mn=focoFeats[0];if(mn)document.getElementById("ttl").textContent="Daño ambiental · "+mn.properties.nombre+" (Corpocesar)";}
    if(P.get("terreno")==="1"){terrenoListo();document.getElementById("terreno").checked=true;document.getElementById("inclinar").checked=true;map.setTerrain({source:"terreno",exaggeration:1.6});map.jumpTo({pitch:+(P.get("pitch")||58)});}
    map.addSource("dano",{type:"vector",tiles:[API+"/tiles/dano/{z}/{x}/{y}.pbf?depto="+DEP],minzoom:0,maxzoom:14});
    var col=["match",["get","tipo"]];Object.keys(TIPOS).forEach(function(t){col.push(t,TIPOS[t][1]);});col.push("#888");
    map.addLayer({id:"dano_f",type:"fill",source:"dano","source-layer":"dano",paint:{"fill-color":col,"fill-opacity":.72}},lbl);map.addLayer({id:"dano_o",type:"line",source:"dano","source-layer":"dano",paint:{"line-color":col,"line-width":.5}},lbl);
    filtra();resumen();
    map.on("click","dano_f",function(e){var p=e.features[0].properties;document.getElementById("infoT").textContent=TIPOS[p.tipo]?TIPOS[p.tipo][0]:p.tipo;document.getElementById("info").innerHTML="<table><tr><td>Año</td><td>"+p.anio+"</td></tr><tr><td>Área</td><td>"+fmt(p.area_ha,1)+" ha</td></tr><tr><td>Municipio</td><td>"+esc(MUN[p.municipio]||p.municipio||"sin asignar")+"</td></tr></table>";});
    map.on("mouseenter","dano_f",function(){map.getCanvas().style.cursor="pointer";});map.on("mouseleave","dano_f",function(){map.getCanvas().style.cursor="";});
  });
  sl.addEventListener("input",function(){YR=+sl.value;document.getElementById("yv").textContent=YR;filtra();resumen();});
  document.getElementById("acum").addEventListener("change",function(){filtra();resumen();});
  document.getElementById("play").addEventListener("click",function(){var bt=this;if(timer){clearInterval(timer);timer=null;bt.textContent="▶ Reproducir";return;}bt.textContent="❚❚ Pausar";YR=y0;timer=setInterval(function(){if(YR>=y1){clearInterval(timer);timer=null;bt.textContent="▶ Reproducir";return;}YR++;sl.value=YR;document.getElementById("yv").textContent=YR;filtra();resumen();},700);});
}
function filtra(){if(!map.getLayer("dano_f"))return;var on=Object.keys(ACT).filter(function(t){return ACT[t];}),acum=document.getElementById("acum").checked;
  var acu=on.filter(function(t){return !ESTADO[t];}),est=on.filter(function(t){return ESTADO[t];});
  var partes=[];if(acu.length)partes.push(["all",["in",["get","tipo"],["literal",acu]],acum?["<=",["get","anio"],YR]:["==",["get","anio"],YR]]);if(est.length)partes.push(["all",["in",["get","tipo"],["literal",est]],["==",["get","anio"],YR]]);var f=partes.length?["any"].concat(partes):["==",1,0];map.setFilter("dano_f",f);map.setFilter("dano_o",f);}
function resumen(){
  var on=Object.keys(ACT).filter(function(t){return ACT[t];}),acum=document.getElementById("acum").checked;
  var sel=RES.filter(function(r){return on.indexOf(r.tipo)>=0&&((acum&&!ESTADO[r.tipo])?r.anio<=YR:r.anio===YR);}),tot=0,pol=0;sel.forEach(function(r){tot+=+r.area_ha;pol+=r.poligonos;});
  document.getElementById("kpis").innerHTML='<div><b>'+fmt(tot)+' ha</b><span>'+(acum?"pérdida acumulada hasta "+YR+" (y huella minera de "+YR+")":"en "+YR)+'</span></div><div><b>'+fmt(pol)+'</b><span>polígonos</span></div>';
  /* barras apiladas por año (tipos activos) */
  var svg=document.getElementById("chart"),NS="http://www.w3.org/2000/svg";svg.innerHTML="";var yrs=[],by={};RES.forEach(function(r){if(on.indexOf(r.tipo)<0)return;by[r.anio]=by[r.anio]||{};by[r.anio][r.tipo]=(by[r.anio][r.tipo]||0)+ +r.area_ha;});yrs=Object.keys(by).map(Number).sort();
  if(!yrs.length){return;}var mx=Math.max.apply(null,yrs.map(function(y){return on.reduce(function(a,t){return a+(by[y][t]||0);},0);}))*1.05,W=320,H=170,m={l:38,r:4,t:8,b:20},bw=(W-m.l-m.r)/yrs.length;
  function E(t,a,tx){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(tx!=null)e.textContent=tx;svg.appendChild(e);return e;}
  [0,.5,1].forEach(function(f){var y=H-m.b-(H-m.b-m.t)*f;E("line",{x1:m.l,x2:W-m.r,y1:y,y2:y,"class":"grid"});E("text",{x:m.l-4,y:y+3.5,"text-anchor":"end"},fmt(mx*f/1.05));});
  yrs.forEach(function(y,i){var acc=0,x=m.l+i*bw+bw*.12,w=bw*.76;on.forEach(function(t){var v=by[y][t]||0;if(!v)return;var h=(H-m.b-m.t)*v/mx;E("rect",{x:x,y:H-m.b-acc-h,width:w,height:h,fill:TIPOS[t][1],opacity:(acum?y<=YR:y===YR)?1:.35});acc+=h;});if(i%Math.ceil(yrs.length/8)===0)E("text",{x:x+w/2,y:H-6,"text-anchor":"middle"},String(y).slice(-2));});
  document.getElementById("leg").textContent="Barras opacas: años incluidos en la vista; tenues: fuera de ella.";
  /* municipios */
  var mm={};sel.forEach(function(r){var k=r.municipio_nombre||MUN[r.municipio]||r.municipio||"sin asignar";mm[k]=(mm[k]||0)+ +r.area_ha;});var top=Object.keys(mm).sort(function(a,b){return mm[b]-mm[a];}).slice(0,8);
  document.getElementById("mun").innerHTML=top.map(function(k){return"<tr><td>"+esc(k)+"</td><td>"+fmt(mm[k])+" ha</td></tr>";}).join("");
}
})();
