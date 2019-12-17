"use strict";const version="1.22";document.title+=" v1.22",rn(localStorage.getItem("version"),2)!==rn("1.22",2)&&(localStorage.clear(),setTimeout(showWelcomeMessage,8e3));

let svg=d3.select("#map"),defs=svg.select("#deftemp"),viewbox=svg.select("#viewbox"),scaleBar=svg.select("#scaleBar"),legend=svg.append("g").attr("id","legend"),ocean=viewbox.append("g").attr("id","ocean"),oceanLayers=ocean.append("g").attr("id","oceanLayers"),oceanPattern=ocean.append("g").attr("id","oceanPattern"),lakes=viewbox.append("g").attr("id","lakes"),landmass=viewbox.append("g").attr("id","landmass"),texture=viewbox.append("g").attr("id","texture"),terrs=viewbox.append("g").attr("id","terrs"),biomes=viewbox.append("g").attr("id","biomes"),cells=viewbox.append("g").attr("id","cells"),gridOverlay=viewbox.append("g").attr("id","gridOverlay"),coordinates=viewbox.append("g").attr("id","coordinates"),compass=viewbox.append("g").attr("id","compass"),rivers=viewbox.append("g").attr("id","rivers"),terrain=viewbox.append("g").attr("id","terrain"),relig=viewbox.append("g").attr("id","relig"),cults=viewbox.append("g").attr("id","cults"),regions=viewbox.append("g").attr("id","regions"),statesBody=regions.append("g").attr("id","statesBody"),statesHalo=regions.append("g").attr("id","statesHalo"),provs=viewbox.append("g").attr("id","provs"),zones=viewbox.append("g").attr("id","zones").style("display","none"),borders=viewbox.append("g").attr("id","borders"),stateBorders=borders.append("g").attr("id","stateBorders"),provinceBorders=borders.append("g").attr("id","provinceBorders"),routes=viewbox.append("g").attr("id","routes"),roads=routes.append("g").attr("id","roads"),trails=routes.append("g").attr("id","trails"),searoutes=routes.append("g").attr("id","searoutes"),temperature=viewbox.append("g").attr("id","temperature"),coastline=viewbox.append("g").attr("id","coastline"),prec=viewbox.append("g").attr("id","prec").style("display","none"),population=viewbox.append("g").attr("id","population"),labels=viewbox.append("g").attr("id","labels"),icons=viewbox.append("g").attr("id","icons"),burgIcons=icons.append("g").attr("id","burgIcons"),anchors=icons.append("g").attr("id","anchors"),markers=viewbox.append("g").attr("id","markers").style("display","none"),fogging=viewbox.append("g").attr("id","fogging-cont").attr("mask","url(#fog)").append("g").attr("id","fogging").style("display","none"),ruler=viewbox.append("g").attr("id","ruler").style("display","none"),debug=viewbox.append("g").attr("id","debug");lakes.append("g").attr("id","freshwater"),lakes.append("g").attr("id","salt"),lakes.append("g").attr("id","sinkhole"),lakes.append("g").attr("id","frozen"),lakes.append("g").attr("id","lava"),coastline.append("g").attr("id","sea_island"),coastline.append("g").attr("id","lake_island"),labels.append("g").attr("id","states"),labels.append("g").attr("id","addedLabels");let burgLabels=labels.append("g").attr("id","burgLabels");burgIcons.append("g").attr("id","cities"),burgLabels.append("g").attr("id","cities"),anchors.append("g").attr("id","cities"),burgIcons.append("g").attr("id","towns"),burgLabels.append("g").attr("id","towns"),anchors.append("g").attr("id","towns"),population.append("g").attr("id","rural"),population.append("g").attr("id","urban"),fogging.append("rect").attr("x",0).attr("y",0).attr("width","100%").attr("height","100%"),scaleBar.on("mousemove",()=>tip("Click to open Units Editor")),legend.on("mousemove",()=>tip("Drag to change the position. Click to hide the legend")).on("click",()=>clearLegend());

let seed,elSelected,grid={},pack={},mapHistory=[],modules={},notes=[],customization=0,mapCoordinates={},winds=[225,45,225,315,135,315],biomesData=applyDefaultBiomesSystem(),nameBases=Names.getNameBases();const fonts=["Almendra+SC","Georgia","Arial","Times+New+Roman","Comic+Sans+MS","Lucida+Sans+Unicode","Courier+New"];let color=d3.scaleSequential(d3.interpolateSpectral);const lineGen=d3.line().curve(d3.curveBasis);

// d3 zoom behavior
let scale = 1, viewX = 0, viewY = 0;
const zoom = d3.zoom().scaleExtent([1, 20]).on("zoom", zoomed);

applyStoredOptions();
let graphWidth = +mapWidthInput.value, graphHeight = +mapHeightInput.value; // voronoi graph extention, cannot be changed arter generation
let svgWidth = graphWidth, svgHeight = graphHeight; // svg canvas resolution, can be changed
landmass.append("rect").attr("x", 0).attr("y", 0).attr("width", graphWidth).attr("height", graphHeight);
oceanPattern.append("rect").attr("fill", "url(#oceanic)").attr("x", 0).attr("y", 0).attr("width", graphWidth).attr("height", graphHeight);
oceanLayers.append("rect").attr("id", "oceanBase").attr("x", 0).attr("y", 0).attr("width", graphWidth).attr("height", graphHeight);

void function removeLoading() {
  d3.select("#loading").transition().duration(4000).style("opacity", 0).remove();
  d3.select("#initial").transition().duration(4000).attr("opacity", 0).remove();
  d3.select("#optionsContainer").transition().duration(3000).style("opacity", 1);
  d3.select("#tooltip").transition().duration(4000).style("opacity", 1);
}()

// decide which map should be loaded or generated on page load
void function checkLoadParameters() {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  // of there is a valid maplink, try to load .map file from URL
  if (params.get("maplink")) {
    console.warn("Load map from URL");
    const maplink = params.get("maplink");
    const pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    const valid = pattern.test(maplink);
    if (valid) {loadMapFromURL(maplink, 1); return;}
    else showUploadErrorMessage("Map link is not a valid URL", maplink);
  }

  // if there is a seed (user of MFCG provided), generate map for it
  if (params.get("seed")) {
    console.warn("Generate map for seed");
    generateMapOnLoad();
    return;
  }

  // open latest map if option is active and map is stored
  if (onloadMap.value === "saved") {
    ldb.get("lastMap", blob => {
      if (blob) {
        console.warn("Load last saved map");
        try {
          uploadMap(blob);
        }
        catch(error) {
          console.error(error);
          console.warn("Cannot load stored map, random map to be generated");
          generateMapOnLoad();
        }
      } else {
        console.error("No map stored, random map to be generated");
        generateMapOnLoad();
      }
    });
    return;
  }

  console.warn("Generate random map");
  generateMapOnLoad();
}()

function loadMapFromURL(maplink, random) {
  const URL = decodeURIComponent(maplink);

  fetch(URL, {method: 'GET', mode: 'cors'})
    .then(response => {
      if(response.ok) return response.blob();
      throw new Error("Cannot load map from URL");
    }).then(blob => uploadMap(blob))
    .catch(error => {
      showUploadErrorMessage(error.message, URL, random);
      if (random) generateMapOnLoad();
    });
}

function showUploadErrorMessage(error, URL, random) {
  console.error(error);
  alertMessage.innerHTML = `Cannot load map from the ${link(URL, "link provided")}.
    ${random?`A new random map is generated. `:''}
    Please ensure the linked file is reachable and CORS is allowed on server side`;
  $("#alert").dialog({title: "Loading error", width: "32em", buttons: {OK: function() {$(this).dialog("close");}}});
}

function generateMapOnLoad() {
  applyStyleOnLoad(); // apply default of previously selected style
  generate(); // generate map
  focusOn(); // based on searchParams focus on point, cell or burg from MFCG
  applyPreset(); // apply saved layers preset
}

// focus on coordinates, cell or burg provided in searchParams
function focusOn(){const e=new URL(window.location.href).searchParams;if("MFCG"===e.get("from")){if(13!==e.get("seed").length)return void findBurgForMFCG(e);e.set("burg",e.get("seed").slice(-4))}const c=+e.get("scale")||8;let t=+e.get("x"),s=+e.get("y");const g=+e.get("cell");g&&(t=pack.cells.p[g][0],s=pack.cells.p[g][1]);const o=+e.get("burg");o&&pack.burgs[o]&&(t=pack.burgs[o].x,s=pack.burgs[o].y),t&&s&&zoomTo(t,s,c,1600)}

// find burg for MFCG and focus on it
function findBurgForMFCG(params) {
  const cells = pack.cells, burgs = pack.burgs;
  if (pack.burgs.length < 2) {console.error("Cannot select a burg for MFCG"); return;}

  const size = +params.get("size");
  const name = params.get("name");
  let coast = +params.get("coast");
  let port = +params.get("port");
  let river = +params.get("river");

  let selection = defineSelection(coast, port, river);
  if (!selection.length) selection = defineSelection(coast, !port, !river);
  if (!selection.length) selection = defineSelection(!coast, 0, !river);
  if (!selection.length) selection = [burgs[1]]; // select first if nothing is found

  function defineSelection(coast, port, river) {
    if (port && river) return burgs.filter(b => b.port && cells.r[b.cell]);
    if (!port && coast && river) return burgs.filter(b => !b.port && cells.t[b.cell] === 1 && cells.r[b.cell]);
    if (!coast && !river) return burgs.filter(b => cells.t[b.cell] !== 1 && !cells.r[b.cell]);
    if (!coast && river) return burgs.filter(b => cells.t[b.cell] !== 1 && cells.r[b.cell]);
    if (coast && river) return burgs.filter(b => cells.t[b.cell] === 1 && cells.r[b.cell]);
    return [];
  }

  // select a burg with closest population from selection
  const selected = d3.scan(selection, (a, b) => Math.abs(a.population - size) - Math.abs(b.population - size));
  const b = selection[selected].i;
  if (!b) {console.error("Cannot select a burg for MFCG"); return;}
  if (size) burgs[b].population = size;
  if (name) burgs[b].name = name;

  const label = burgLabels.select("[data-id='" + b + "']");
  if (label.size()) {
    tip("Here stands the glorious city of " + burgs[b].name, true, "success", 12000);
    label.text(burgs[b].name).classed("drag", true).on("mouseover", function() {
      d3.select(this).classed("drag", false);
      label.on("mouseover", null);
    });
  }

  zoomTo(burgs[b].x, burgs[b].y, 8, 1600);
  invokeActiveZooming();
}

// apply default biomes data
function applyDefaultBiomesSystem() {
  const name = ["Marine","Hot desert","Cold desert","Savanna","Grassland","Tropical seasonal forest","Temperate deciduous forest","Tropical rainforest","Temperate rainforest","Taiga","Tundra","Glacier","Wetland"];
  const color = ["#53679f","#fbe79f","#b5b887","#d2d082","#c8d68f","#b6d95d","#29bc56","#7dcb35","#409c43","#4b6b32","#96784b","#d5e7eb","#0b9131"];
  const habitability = [0,2,5,20,30,50,100,80,90,10,2,0,12];
  const iconsDensity = [0,3,2,120,120,120,120,150,150,100,5,0,150];
  const icons = [{},{dune:3, cactus:6, deadTree:1},{dune:9, deadTree:1},{acacia:1, grass:9},{grass:1},{acacia:8, palm:1},{deciduous:1},{acacia:5, palm:3, deciduous:1, swamp:1},{deciduous:6, swamp:1},{conifer:1},{grass:1},{},{swamp:1}];
  const cost = [10,200,150,60,50,70,70,80,90,80,100,255,150]; // biome movement cost
  const biomesMartix = [
    // hot ↔ cold; dry ↕ wet
    new Uint8Array([1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]),
    new Uint8Array([3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,9,9,9,9,9,10,10]),
    new Uint8Array([5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,9,9,9,9,9,10,10,10]),
    new Uint8Array([5,6,6,6,6,6,6,8,8,8,8,8,8,8,8,8,8,9,9,9,9,9,9,10,10,10]),
    new Uint8Array([7,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,9,9,9,9,9,9,10,10,10])
  ];

  // parse icons weighted array into a simple array
  for (let i=0; i < icons.length; i++) {
    const parsed = [];
    for (const icon in icons[i]) {
      for (let j = 0; j < icons[i][icon]; j++) {parsed.push(icon);}
    }
    icons[i] = parsed;
  }

  return {i:d3.range(0, name.length), name, color, biomesMartix, habitability, iconsDensity, icons, cost};
}

function showWelcomeMessage() {
  const post = link("https://www.reddit.com/r/FantasyMapGenerator/comments/dlow3k/update_new_version_is_published_v_12", "Main changes:"); // announcement on Reddit
  const changelog = link("https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Changelog", "previous version");
  const reddit = link("https://www.reddit.com/r/FantasyMapGenerator", "Reddit community");
  const discord = link("https://discordapp.com/invite/X7E84HU", "Discord server");
  const patreon = link("https://www.patreon.com/azgaar", "Patreon");

  alertMessage.innerHTML = `The Fantasy Map Generator is updated up to version <b>${version}</b>.
    This version is compatible with ${changelog}, loaded <i>.map</i> files will be auto-updated.

    <ul>${post}
      <li>3d scene and Globe view</li>
      <li>Ability to save map as JPEG image</li>
      <li>Diplomacy Editor enhancements</li>
      <li>Rivers Overview screen</li>
    </ul>

    <p>Thanks for all supporters on ${patreon}!</i></p>`;

  $("#alert").dialog(
    {resizable: false, title: "Fantasy Map Generator update", width: "28em",
    buttons: {OK: function() {$(this).dialog("close")}},
    position: {my: "center", at: "center", of: "svg"},
    close: () => localStorage.setItem("version", version)}
  );
}

function zoomed() {
  const transform = d3.event.transform;
  const scaleDiff = scale - transform.k;
  const positionDiff = viewX - transform.x | viewY - transform.y;
  if (!positionDiff && !scaleDiff) return;

  scale = transform.k;
  viewX = transform.x;
  viewY = transform.y;
  viewbox.attr("transform", transform);

  // update grid only if view position
  if (positionDiff) drawCoordinates();

  // rescale only if zoom is changed
  if (scaleDiff) {
    invokeActiveZooming();
    drawScaleBar();
  }

  // zoom image converter overlay
  const canvas = document.getElementById("canvas");
  if (canvas && +canvas.style.opacity) {
    const img = document.getElementById("image");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, viewX, viewY);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
}

function zoomTo(t,a,e=8,o=2e3){const i=d3.zoomIdentity.translate(t*-e+graphWidth/2,a*-e+graphHeight/2).scale(e);svg.transition().duration(o).call(zoom.transform,i)}function resetZoom(t=1e3){svg.transition().duration(t).call(zoom.transform,d3.zoomIdentity)}function getViewBoxExtent(){return[[Math.abs(viewX/scale),Math.abs(viewY/scale)],[Math.abs(viewX/scale)+graphWidth/scale,Math.abs(viewY/scale)+graphHeight/scale]]}

// active zooming feature
function invokeActiveZooming() {
  if (coastline.select("#sea_island").size() && +coastline.select("#sea_island").attr("auto-filter")) {
    // toggle shade/blur filter for coatline on zoom
    const filter = scale > 1.5 && scale <= 2.6 ? null : scale > 2.6 ? "url(#blurFilter)" : "url(#dropShadow)";
    coastline.select("#sea_island").attr("filter", filter);
  }

  // rescale lables on zoom
  if (labels.style("display") !== "none") {
    labels.selectAll("g").each(function(d) {
      if (this.id === "burgLabels") return;
      const desired = +this.dataset.size;
      const relative = Math.max(rn((desired + desired / scale) / 2, 2), 1);
      this.getAttribute("font-size", relative);
      const hidden = hideLabels.checked && (relative * scale < 6 || relative * scale > 50);
      if (hidden) this.classList.add("hidden"); else this.classList.remove("hidden");
    });
  }

  // turn off ocean pattern if scale is big (improves performance)
  oceanPattern.select("rect").attr("fill", scale > 10 ? "#fff" : "url(#oceanic)").attr("opacity", scale > 10 ? .2 : null);

  // change states halo width
  if (!customization) {
    const haloSize = rn(statesHalo.attr("data-width") / scale, 1);
    statesHalo.attr("stroke-width", haloSize).style("display", haloSize > 3 ? "block" : "none");
  }

  // rescale map markers
  if (+markers.attr("rescale") && markers.style("display") !== "none") {
    markers.selectAll("use").each(function(d) {
      const x = +this.dataset.x, y = +this.dataset.y, desired = +this.dataset.size;
      const size = Math.max(desired * 5 + 25 / scale, 1);
      d3.select(this).attr("x", x - size/2).attr("y", y - size).attr("width", size).attr("height", size);
    });
  }

  // rescale rulers to have always the same size
  if (ruler.style("display") !== "none") {
    const size = rn(1 / scale ** .3 * 2, 1);
    ruler.selectAll("circle").attr("r", 2 * size).attr("stroke-width", .5 * size);
    ruler.selectAll("rect").attr("stroke-width", .5 * size);
    ruler.selectAll("text").attr("font-size", 10 * size);
    ruler.selectAll("line, path").attr("stroke-width", size);
  }
}

// Pull request from @evyatron
void function addDragToUpload() {
  document.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
    $('#map-dragged').show();
  });

  document.addEventListener('dragleave', function(e) {
    $('#map-dragged').hide();
  });

  document.addEventListener('drop', function(e) {
    e.stopPropagation();
    e.preventDefault();
    $('#map-dragged').hide();
    // no files or more than one
    if (e.dataTransfer.items == null || e.dataTransfer.items.length != 1) {return;}
    const file = e.dataTransfer.items[0].getAsFile();
    // not a .map file
    if (file.name.indexOf('.map') == -1) {
      alertMessage.innerHTML = 'Please upload a <b>.map</b> file you have previously downloaded';
      $("#alert").dialog({
        resizable: false, title: "Invalid file format",
        width: "40em", buttons: {
          Close: function() { $(this).dialog("close"); }
        }, position: {my: "center", at: "center", of: "svg"}
      });
      return;
    }
    // all good - show uploading text and load the map
    $("#map-dragged > p").text("Uploading<span>.</span><span>.</span><span>.</span>");
    closeDialogs();
    uploadMap(file, function onUploadFinish() {
      $("#map-dragged > p").text("Drop to upload");
    });
  });
}()

function generate(){try{const e=performance.now();invokeActiveZooming(),generateSeed(),console.group("Generated Map "+seed),applyMapSize(),randomizeOptions(),placePoints(),calculateVoronoi(grid,grid.points),drawScaleBar(),HeightmapGenerator.generate(),markFeatures(),openNearSeaLakes(),OceanLayers(),defineMapSize(),calculateMapCoordinates(),calculateTemperatures(),generatePrecipitation(),reGraph(),drawCoastline(),elevateLakes(),Rivers.generate(),defineBiomes(),rankCells(),Cultures.generate(),Cultures.expand(),BurgsAndStates.generate(),Religions.generate(),BurgsAndStates.defineStateForms(),BurgsAndStates.generateProvinces(),BurgsAndStates.defineBurgFeatures(),drawStates(),drawBorders(),BurgsAndStates.drawStateLabels(),Rivers.specify(),addMarkers(),addZones(),Names.getMapName(),console.warn(`TOTAL: ${rn((performance.now()-e)/1e3,2)}s`),showStatistics(),console.groupEnd("Generated Map "+seed)}catch(e){console.error(e),clearMainTip(),alertMessage.innerHTML=`An error is occured on map generation. Please retry.\n      <br>If error is critical, clear the stored data and try again.\n      <p id="errorBox">${parseError(e)}</p>`,$("#alert").dialog({resizable:!1,title:"Generation error",width:"32em",buttons:{"Clear data":function(){localStorage.clear(),localStorage.setItem("version",version)},Regenerate:function(){regenerateMap(),$(this).dialog("close")},Ignore:function(){$(this).dialog("close")}},position:{my:"center",at:"center",of:"svg"}})}}

function generateSeed(){const e=!mapHistory[0],t=new URL(window.location.href),o=t.searchParams,n=t.searchParams.get("seed");e&&"MFCG"===o.get("from")&&13===n.length?seed=n.slice(0,-4):e&&n?seed=n:optionsSeed.value&&optionsSeed.value!=seed?seed=optionsSeed.value:seed=Math.floor(1e9*Math.random()).toString(),optionsSeed.value=seed,Math.seedrandom(seed)}function placePoints(){console.time("placePoints");const e=1e4*densityInput.value,t=grid.spacing=rn(Math.sqrt(graphWidth*graphHeight/e),2);grid.boundary=getBoundaryPoints(graphWidth,graphHeight,t),grid.points=getJitteredGrid(graphWidth,graphHeight,t),grid.cellsX=Math.floor((graphWidth+.5*t)/t),grid.cellsY=Math.floor((graphHeight+.5*t)/t),console.timeEnd("placePoints")}function calculateVoronoi(e,t){console.time("calculateDelaunay");const o=t.length,n=t.concat(grid.boundary),a=Delaunator.from(n);console.timeEnd("calculateDelaunay"),console.time("calculateVoronoi");const r=Voronoi(a,n,o);e.cells=r.cells,e.cells.i=o<65535?Uint16Array.from(d3.range(o)):Uint32Array.from(d3.range(o)),e.vertices=r.vertices,console.timeEnd("calculateVoronoi")}function markFeatures(){console.time("markFeatures"),Math.seedrandom(seed);const e=grid.cells,t=grid.cells.h;e.f=new Uint16Array(e.i.length),e.t=new Int8Array(e.i.length),grid.features=[0];for(let o=1,n=[0];-1!==n[0];o++){e.f[n[0]]=o;const a=t[n[0]]>=20;let r=!1;for(;n.length;){const i=n.pop();e.b[i]&&(r=!0),e.c[i].forEach(function(r){const s=t[r]>=20;a===s&&0===e.f[r]&&(e.f[r]=o,n.push(r)),a&&!s&&(e.t[i]=1,e.t[r]=-1)})}const i=a?"island":r?"ocean":"lake";grid.features.push({i:o,land:a,border:r,type:i}),n[0]=e.f.findIndex(e=>!e)}console.timeEnd("markFeatures")}function openNearSeaLakes(){if("Atoll"===templateInput.value)return;const e=grid.cells,t=grid.features;if(!t.find(e=>"lake"===e.type))return;console.time("openLakes");for(let n=0,a=!0;n<5&&a;n++){a=!1;for(const n of e.i){const r=e.f[n];if("lake"===t[r].type)e:for(const i of e.c[n])if(!(1!==e.t[i]||e.h[i]>50))for(const n of e.c[i]){const s=e.f[n];if("ocean"===t[s].type){a=o(i,r,s);break e}}}}function o(o,n,a){return e.h[o]=19,e.t[o]=-1,e.f[o]=a,e.c[o].forEach(function(t){e.h[t]>=20&&(e.t[t]=1)}),t[n].type="ocean",!0}console.timeEnd("openLakes")}

// define map size and position based on template and random factor
function defineMapSize(){const[e,t]=function(){const e=document.getElementById("templateInput").value,t=grid.features.some(e=>e.land&&e.border),a=t?85:100,n=t?gauss(P(.5)?30:70,15,20,80):gauss(50,20,15,85);if(!t){if("Pangea"===e)return[100,50];if("Shattered"===e&&P(.7))return[100,50];if("Continents"===e&&P(.5))return[100,50];if("Archipelago"===e&&P(.35))return[100,50];if("High Island"===e&&P(.25))return[100,50];if("Low Island"===e&&P(.1))return[100,50]}return"Pangea"===e?[gauss(75,20,30,a),n]:"Volcano"===e?[gauss(30,20,10,a),n]:"Mediterranean"===e?[gauss(30,30,15,80),n]:"Peninsula"===e?[gauss(15,15,5,80),n]:"Isthmus"===e?[gauss(20,20,3,80),n]:"Atoll"===e?[gauss(10,10,2,a),n]:[gauss(40,20,15,a),n]}();locked("mapSize")||(mapSizeOutput.value=mapSizeInput.value=e),locked("latitude")||(latitudeOutput.value=latitudeInput.value=t)}function calculateMapCoordinates(){const e=+document.getElementById("mapSizeOutput").value/100*180,t=90-(180-e)*+document.getElementById("latitudeOutput").value/100,a=t-e,n=Math.min(graphWidth/graphHeight*e/2,180);mapCoordinates={latT:e,latN:t,latS:a,lonT:2*n,lonW:-n,lonE:n}}function calculateTemperatures(){console.time("calculateTemperatures");const e=grid.cells;e.temp=new Int8Array(e.i.length);const t=+temperatureEquatorInput.value,a=+temperaturePoleInput.value,n=t-a;function u(e){if(e<20)return 0;const t=+heightExponentInput.value,a=Math.pow(e-18,t);return rn(a/1e3*6.5)}d3.range(0,e.i.length,grid.cellsX).forEach(function(a){const l=grid.points[a][1],r=Math.abs(mapCoordinates.latN-l/graphHeight*mapCoordinates.latT),i=t-r/90*n;for(let t=a;t<a+grid.cellsX;t++)e.temp[t]=i-u(e.h[t])}),console.timeEnd("calculateTemperatures")}

// simplest precipitation model
function generatePrecipitation() {
  console.time('generatePrecipitation');
  prec.selectAll("*").remove();
  const cells = grid.cells;
  cells.prec = new Uint8Array(cells.i.length); // precipitation array
  const modifier = precInput.value / 100; // user's input
  const cellsX = grid.cellsX, cellsY = grid.cellsY;
  let westerly = [], easterly = [], southerly = 0, northerly = 0;

  {// latitude bands
  // x4 = 0-5 latitude: wet throught the year (rising zone)
  // x2 = 5-20 latitude: wet summer (rising zone), dry winter (sinking zone)
  // x1 = 20-30 latitude: dry all year (sinking zone)
  // x2 = 30-50 latitude: wet winter (rising zone), dry summer (sinking zone)
  // x3 = 50-60 latitude: wet all year (rising zone)
  // x2 = 60-70 latitude: wet summer (rising zone), dry winter (sinking zone)
  // x1 = 70-90 latitude: dry all year (sinking zone)
  }
  const lalitudeModifier = [4,2,2,2,1,1,2,2,2,2,3,3,2,2,1,1,1,0.5]; // by 5d step

  // difine wind directions based on cells latitude and prevailing winds there
  d3.range(0, cells.i.length, cellsX).forEach(function(c, i) {
    const lat = mapCoordinates.latN - i / cellsY * mapCoordinates.latT;
    const band = (Math.abs(lat) - 1) / 5 | 0;
    const latMod = lalitudeModifier[band];
    const tier = Math.abs(lat - 89) / 30 | 0; // 30d tiers from 0 to 5 from N to S
    if (winds[tier] > 40 && winds[tier] < 140) westerly.push([c, latMod, tier]);
    else if (winds[tier] > 220 && winds[tier] < 320) easterly.push([c + cellsX -1, latMod, tier]);
    if (winds[tier] > 100 && winds[tier] < 260) northerly++;
    else if (winds[tier] > 280 || winds[tier] < 80) southerly++;
  });

  // distribute winds by direction
  if (westerly.length) passWind(westerly, 120 * modifier, 1, cellsX);
  if (easterly.length) passWind(easterly, 120 * modifier, -1, cellsX);
  const vertT = (southerly + northerly);
  if (northerly) {
    const bandN = (Math.abs(mapCoordinates.latN) - 1) / 5 | 0;
    const latModN = mapCoordinates.latT > 60 ? d3.mean(lalitudeModifier) : lalitudeModifier[bandN];
    const maxPrecN = northerly / vertT * 60 * modifier * latModN;
    passWind(d3.range(0, cellsX, 1), maxPrecN, cellsX, cellsY);
  }
  if (southerly) {
    const bandS = (Math.abs(mapCoordinates.latS) - 1) / 5 | 0;
    const latModS = mapCoordinates.latT > 60 ? d3.mean(lalitudeModifier) : lalitudeModifier[bandS];
    const maxPrecS = southerly / vertT * 60 * modifier * latModS;
    passWind(d3.range(cells.i.length - cellsX, cells.i.length, 1), maxPrecS, -cellsX, cellsY);
  }

  function passWind(source, maxPrec, next, steps) {
    const maxPrecInit = maxPrec;
    for (let first of source) {
      if (first[0]) {maxPrec = Math.min(maxPrecInit * first[1], 255); first = first[0];}
      let humidity = maxPrec - cells.h[first]; // initial water amount
      if (humidity <= 0) continue; // if first cell in row is too elevated cosdired wind dry
      for (let s = 0, current = first; s < steps; s++, current += next) {
        // no flux on permafrost
        if (cells.temp[current] < -5) continue;
        // water cell
        if (cells.h[current] < 20) {
          if (cells.h[current+next] >= 20) {
            cells.prec[current+next] += Math.max(humidity / rand(10, 20), 1); // coastal precipitation
          } else {
            humidity = Math.min(humidity + 5 * modifier, maxPrec); // wind gets more humidity passing water cell
            cells.prec[current] += 5 * modifier; // water cells precipitation (need to correctly pour water through lakes)
          }
          continue;
        }

        // land cell
        const precipitation = getPrecipitation(humidity, current, next);
        cells.prec[current] += precipitation;
        const evaporation = precipitation > 1.5 ? 1 : 0; // some humidity evaporates back to the atmosphere
        humidity = Math.min(Math.max(humidity - precipitation + evaporation, 0), maxPrec);
      }
    }
  }

  function getPrecipitation(humidity, i, n) {
    if (cells.h[i+n] > 85) return humidity; // 85 is max passable height
    const normalLoss = Math.max(humidity / (10 * modifier), 1); // precipitation in normal conditions
    const diff = Math.max(cells.h[i+n] - cells.h[i], 0); // difference in height
    const mod = (cells.h[i+n] / 70) ** 2; // 50 stands for hills, 70 for mountains
    return Math.min(Math.max(normalLoss + diff * mod, 1), humidity);
  }

  void function drawWindDirection() {
     const wind = prec.append("g").attr("id", "wind");

    d3.range(0, 6).forEach(function(t) {
      if (westerly.length > 1) {
        const west = westerly.filter(w => w[2] === t);
        if (west && west.length > 3) {
          const from = west[0][0], to = west[west.length-1][0];
          const y = (grid.points[from][1] + grid.points[to][1]) / 2;
          wind.append("text").attr("x", 20).attr("y", y).text("\u21C9");
        }
      }
      if (easterly.length > 1) {
        const east = easterly.filter(w => w[2] === t);
        if (east && east.length > 3) {
          const from = east[0][0], to = east[east.length-1][0];
          const y = (grid.points[from][1] + grid.points[to][1]) / 2;
          wind.append("text").attr("x", graphWidth - 52).attr("y", y).text("\u21C7");
        }
      }
    });

    if (northerly) wind.append("text").attr("x", graphWidth / 2).attr("y", 42).text("\u21CA");
    if (southerly) wind.append("text").attr("x", graphWidth / 2).attr("y", graphHeight - 20).text("\u21C8");
  }();

  console.timeEnd('generatePrecipitation');
}

// recalculate Voronoi Graph to pack cells
function reGraph() {
  console.time("reGraph");
  let cells = grid.cells, points = grid.points, features = grid.features;
  const newCells = {p:[], g:[], h:[], t:[], f:[], r:[], biome:[]}; // to store new data
  const spacing2 = grid.spacing ** 2;

  for (const i of cells.i) {
    const height = cells.h[i];
    const type = cells.t[i];
    if (height < 20 && type !== -1 && type !== -2) continue; // exclude all deep ocean points
    if (type === -2 && (i%4=== 0 || features[cells.f[i]].type === "lake")) continue; // exclude non-coastal lake points
    const x = points[i][0], y = points[i][1];

    addNewPoint(x, y); // add point to array
    // add additional points for cells along coast
    if (type === 1 || type === -1) {
      if (cells.b[i]) continue; // not for near-border cells
      cells.c[i].forEach(function(e) {
        if (i > e) return;
        if (cells.t[e] === type) {
          const dist2 = (y - points[e][1]) ** 2 + (x - points[e][0]) ** 2;
          if (dist2 < spacing2) return; // too close to each other
          const x1 = rn((x + points[e][0]) / 2, 1);
          const y1 = rn((y + points[e][1]) / 2, 1);
          addNewPoint(x1, y1);
        }
      });
    }

    function addNewPoint(x, y) {
      newCells.p.push([x, y]);
      newCells.g.push(i);
      newCells.h.push(height);
    }
  }

  calculateVoronoi(pack, newCells.p);
  cells = pack.cells;
  cells.p = newCells.p; // points coordinates [x, y]
  cells.g = grid.cells.i.length < 65535 ? Uint16Array.from(newCells.g) : Uint32Array.from(newCells.g); // reference to initial grid cell
  cells.q = d3.quadtree(cells.p.map((p, d) => [p[0], p[1], d])); // points quadtree for fast search
  cells.h = new Uint8Array(newCells.h); // heights
  cells.area = new Uint16Array(cells.i.length); // cell area
  cells.i.forEach(i => cells.area[i] = Math.abs(d3.polygonArea(getPackPolygon(i))));

  console.timeEnd("reGraph");
}

// Detect and draw the coasline
function drawCoastline(){console.time("drawCoastline"),reMarkFeatures();const t=pack.cells,e=pack.vertices,a=t.i.length,n=pack.features,l=new Uint8Array(n.length),r=d3.scan(n.map(t=>t.land?t.cells:0),(t,e)=>e-t),s=defs.select("#land"),i=defs.select("#water");lineGen.curve(d3.curveBasisClosed);for(const a of t.i){if(!(!a&&t.h[a]>=20)&&-1!==t.t[a]&&1!==t.t[a])continue;const f=t.f[a];if(l[f])continue;if("ocean"===n[f].type)continue;const p="lake"===n[f].type?1:-1,u=c(a,p);if(-1===u)continue;let k=d(u,p);"lake"===n[f].type&&o(k,1.2),l[f]=1;let h=k.map(t=>e.p[t]);const v=d3.polygonArea(h);v>0&&"lake"===n[f].type&&(h=h.reverse(),k=k.reverse()),n[f].area=Math.abs(v),n[f].vertices=k;const g=round(lineGen(h));if("lake"===n[f].type)s.append("path").attr("d",g).attr("fill","black").attr("id","land_"+f),lakes.select("#"+n[f].group).append("path").attr("d",g).attr("id","lake_"+f).attr("data-f",f);else{s.append("path").attr("d",g).attr("fill","white").attr("id","land_"+f),i.append("path").attr("d",g).attr("fill","black").attr("id","water_"+f);const t="lake_island"===n[f].group?"lake_island":"sea_island";coastline.select("#"+t).append("path").attr("d",g).attr("id","island_"+f).attr("data-f",f)}if(f===r){const t=h[d3.scan(h,(t,e)=>t[0]-e[0])],e=h[d3.scan(h,(t,e)=>e[0]-t[0])];addRuler(t[0],t[1],e[0],e[1])}}function c(n,l){if(-1===l&&t.b[n])return t.v[n].find(t=>e.c[t].some(t=>t>=a));const r=t.c[n].filter(e=>t.t[e]===l),s=t.c[n].indexOf(d3.min(r));return-1===s?s:t.v[n][s]}function d(n,l){const r=[];for(let s=0,i=n;0===s||i!==n&&s<5e4;s++){const n=r[r.length-1];r.push(i);const s=e.c[i],c=e.v[i],d=s[0]>=a||t.t[s[0]]===l,o=s[1]>=a||t.t[s[1]]===l,f=s[2]>=a||t.t[s[2]]===l;if(c[0]!==n&&d!==o?i=c[0]:c[1]!==n&&o!==f?i=c[1]:c[2]!==n&&d!==f&&(i=c[2]),i===r[r.length-1]){console.error("Next vertex is not found");break}}return r}function o(t,a){const n=e.p,l=d3.quadtree();for(let e=0;e<t.length;e++){const r=t[e];let[s,i]=[n[r][0],n[r][1]];if(e&&t[e+1]&&void 0!==l.find(s,i,a)){const a=t[e-1],l=t[e+1],[c,d]=[n[a][0],n[a][1]],[o,f]=[n[l][0],n[l][1]];[s,i]=[(c+o)/2,(d+f)/2],n[r]=[s,i]}l.add([s,i])}}console.timeEnd("drawCoastline")}

// Re-mark features (ocean, lakes, islands)
function reMarkFeatures(){console.time("reMarkFeatures");const e=pack.cells,n=pack.features=[0];e.f=new Uint16Array(e.i.length),e.t=new Int16Array(e.i.length),e.haven=e.i.length<65535?new Uint16Array(e.i.length):new Uint32Array(e.i.length),e.harbor=new Uint8Array(e.i.length);for(let l=1,a=[0];-1!==a[0];l++){const i=a[0];e.f[i]=l;const o=e.h[i]>=20;let s=!1,c=1;for(;a.length;){const n=a.pop();e.b[n]&&(s=!0),e.c[n].forEach(function(t){const r=e.h[t]>=20;o&&!r?(e.t[n]=1,e.t[t]=-1,e.harbor[n]++,e.haven[n]||(e.haven[n]=t)):o&&r&&(e.t[t]||1!==e.t[n]?e.t[n]||1!==e.t[t]||(e.t[n]=2):e.t[t]=2),o===r&&0===e.f[t]&&(e.f[t]=l,a.push(t),c++)})}const h=o?"island":s?"ocean":"lake";let f;"lake"===h?f=t(i,c):"ocean"===h?f="ocean":"island"===h&&(f=r(i,c)),n.push({i:l,land:o,border:s,type:h,cells:c,firstCell:i,group:f}),a[0]=e.f.findIndex(e=>!e)}function t(n,t){const r=grid.cells.temp[e.g[n]];if(r>24)return"salt";if(r<-3)return"frozen";const l=d3.max(e.c[n].map(n=>e.h[n]));return l>69&&t<3&&n%5==0?"sinkhole":l>69&&t<10&&n%5==0?"lava":"freshwater"}function r(t,r){return t&&"lake"===n[e.f[t-1]].type?"lake_island":r>grid.cells.i.length/10?"continent":r>grid.cells.i.length/1e3?"island":"isle"}console.timeEnd("reMarkFeatures")}

// temporary elevate some lakes to resolve depressions and flux the water to form an open (exorheic) lake
function elevateLakes(){if("Atoll"===templateInput.value)return;console.time("elevateLakes");const e=pack.cells,t=pack.features,n=e.i.length/100;e.i.forEach(a=>{e.h[a]>=20||"freshwater"!==t[e.f[a]].group||t[e.f[a]].cells>n||(e.h[a]=20)}),console.timeEnd("elevateLakes")}function defineBiomes(){console.time("defineBiomes");const e=pack.cells,t=pack.features;e.biome=new Uint8Array(e.i.length);for(const n of e.i){if("freshwater"===t[e.f[n]].group&&(e.h[n]=19),e.h[n]<20)continue;let a=grid.cells.prec[e.g[n]];e.r[n]&&(a+=Math.max(e.fl[n]/20,2));const o=e.c[n].filter(isLand).map(t=>grid.cells.prec[e.g[t]]).concat([a]);a=rn(4+d3.mean(o));const i=grid.cells.temp[e.g[n]];e.biome[n]=getBiomeId(a,i,e.h[n])}console.timeEnd("defineBiomes")}function getBiomeId(e,t,n){if(t<-5)return 11;if(e>40&&n<25||e>24&&n>24)return 12;const a=Math.min(e/5|0,4),o=Math.min(Math.max(20-t,0),25);return biomesData.biomesMartix[a][o]}function rankCells(){console.time("rankCells");const e=pack.cells,t=pack.features;e.s=new Int16Array(e.i.length),e.pop=new Float32Array(e.i.length);const n=d3.median(e.fl.filter(e=>e))||0,a=d3.max(e.fl)+d3.max(e.conf),o=d3.mean(e.area);for(const i of e.i){let l=+biomesData.habitability[e.biome[i]];if(l){if(n&&(l+=250*normalize(e.fl[i]+e.conf[i],n,a)),l-=(e.h[i]-50)/5,1===e.t[i]){e.r[i]&&(l+=15);const n=t[e.f[e.haven[i]]].type,a=t[e.f[e.haven[i]]].group;"lake"===n?"freshwater"===a?l+=30:"lava"!==a&&(l+=10):(l+=5,1===e.harbor[i]&&(l+=20))}e.s[i]=l/5,e.pop[i]=e.s[i]>0?e.s[i]*e.area[i]/o:0}}console.timeEnd("rankCells")}

// calculate army and fleet based on state cells polulation 
function calculateMilitaryForces(){const e=pack.cells,r=pack.states,a=r.filter(e=>e.i&&!e.removed);a.forEach(e=>e.military={infantry:0,cavalry:0,archers:0,reserve:0,fleet:0});for(const a of e.i){const i=r[e.state[a]];if(!i.i||i.removed)continue;let t=e.pop[a]/100;e.culture[a]!==i.culture&&(t="Union"===i.form?t/1.2:t/2),e.religion[a]!==e.religion[i.center]&&(t="Theocracy"===i.form?t/2.2:t/1.4),e.f[a]!==e.f[i.center]&&(t="Naval"===i.type?t/1.2:t/1.8);let l=.5*t,n=.25*t,c=.25*t;[1,2,3,4].includes(e.biome[a])?(c*=3,l/=5,n/=2):[7,8,9,12].includes(e.biome[a])&&(c/=2.5,l*=1.2,n*=1.2),i.military.infantry+=l,i.military.archers+=n,i.military.cavalry+=c,i.military.reserve+=3*t+.02*e.pop[a]}for(const a of pack.burgs){if(!a.i||a.removed||!a.state)continue;const i=r[a.state];let t=a.population/50;a.capital&&(t*=2),a.culture!==i.culture&&(t="Union"===i.form?t/1.2:t/2),e.religion[a.cell]!==e.religion[i.center]&&(t="Theocracy"===i.form?t/2.2:t/1.4),e.f[a.cell]!==e.f[i.center]&&(t="Naval"===i.type?t/1.2:t/1.8);let l=.6*t,n=.3*t,c=.1*t;const o=e.biome[a.cell];if([1,2,3,4].includes(o)?(c*=3,l/=2):[7,8,9,12].includes(o)&&(c/=4,l*=1.2,n*=1.4),i.military.infantry+=l,i.military.archers+=n,i.military.cavalry+=c,i.military.reserve+=2*t+.01*a.population,!a.port)continue;let s=a.capital?a.population/3:a.population/5;"Naval"===i.type&&(s*=1.8),i.military.fleet+=~~s+ +P(s%1)}const i=d3.sum(a.map(e=>e.expansionism)),t=d3.sum(a.map(e=>e.area)),l={x:0,Ally:-.2,Friendly:-.1,Neutral:0,Suspicion:.1,Enemy:1,Unknown:0,Rival:.5,Vassal:.5,Suzerain:-.5};a.forEach(e=>{const r=e.military,a=e.diplomacy,n=Math.min(Math.max(e.expansionism/i/(e.area/t),.25),4),c=a.some(e=>"Enemy"===e)?1:a.some(e=>"Rival"===e)?.8:a.some(e=>"Suspicion"===e)?.5:.1,o=Math.min(Math.max(e.neighbors.map(r=>r?pack.states[r].diplomacy[e.i]:"Suspicion").reduce((e,r)=>e+=l[r],.5),.3),3);r.alert=rn(n*c*o,2),r.infantry=rn(r.infantry*r.alert,3),r.cavalry=rn(r.cavalry*r.alert,3),r.archers=rn(r.archers*r.alert,3),r.reserve=rn(r.reserve,3)}),console.table(a.map(e=>[e.name,e.military.alert,e.military.infantry,e.military.archers,e.military.cavalry,e.military.reserve,rn(e.military.reserve/(e.urban+e.rural)*100,2)+"%",e.military.fleet]))}

// generate some markers
function addMarkers(t=1){if(!t)return;console.time("addMarkers");const e=pack.cells;function a(t,e,a,r,n){const i=svg.select("#defs-markers");if(i.select("#marker_"+t).size())return;const l=i.append("symbol").attr("id","marker_"+t).attr("viewBox","0 0 30 30");l.append("path").attr("d","M6,19 l9,10 L24,19").attr("fill","#000000").attr("stroke","none"),l.append("circle").attr("cx",15).attr("cy",15).attr("r",10).attr("fill","#ffffff").attr("stroke","#000000").attr("stroke-width",1),l.append("text").attr("x",a+"%").attr("y",r+"%").attr("fill","#000000").attr("stroke","#3200ff").attr("stroke-width",0).attr("font-size",n+"px").attr("dominant-baseline","central").text(e)}!function(){let r=Array.from(e.i).filter(t=>e.h[t]>70).sort((t,a)=>e.h[a]-e.h[t]),n=r.length<10?0:Math.ceil(r.length/300*t);for(n&&a("volcano","🌋",52,52,17.5);n;){const t=r.splice(biased(0,r.length-1,5),1),a=e.p[t][0],i=e.p[t][1],l=getNextId("markerElement");markers.append("use").attr("id",l).attr("data-cell",t).attr("xlink:href","#marker_volcano").attr("data-id","#marker_volcano").attr("data-x",a).attr("data-y",i).attr("x",a-15).attr("y",i-30).attr("data-size",1).attr("width",30).attr("height",30);const o=getFriendlyHeight([a,i]),d=Names.getCulture(e.culture[t]),s=P(.3)?"Mount "+d:Math.random()>.3?d+" Volcano":d;notes.push({id:l,name:s,legend:`Active volcano. Height: ${o}`}),n--}}(),function(){let r=Array.from(e.i).filter(t=>e.h[t]>50).sort((t,a)=>e.h[a]-e.h[t]),n=r.length<30?0:Math.ceil(r.length/1e3*t);for(n&&a("hot_springs","♨",50,50,19.5);n;){const t=r.splice(biased(1,r.length-1,3),1),a=e.p[t][0],i=e.p[t][1],l=getNextId("markerElement");markers.append("use").attr("id",l).attr("xlink:href","#marker_hot_springs").attr("data-id","#marker_hot_springs").attr("data-x",a).attr("data-y",i).attr("x",a-15).attr("y",i-30).attr("data-size",1).attr("width",30).attr("height",30);const o=Names.getCulture(e.culture[t]),d=convertTemperature(gauss(30,15,20,100));notes.push({id:l,name:o+" Hot Springs",legend:`A hot springs area. Temperature: ${d}`}),n--}}(),function(){let r=Array.from(e.i).filter(t=>e.h[t]>47&&e.burg[t]),n=r.length?Math.ceil(r.length/7*t):0;if(!n)return;a("mine","⚒",50,50,20);const i={salt:5,gold:2,silver:4,copper:2,iron:3,lead:1,tin:1};for(;n;){const t=r.splice(Math.floor(Math.random()*r.length),1),a=e.p[t][0],l=e.p[t][1],o=getNextId("markerElement");markers.append("use").attr("id",o).attr("xlink:href","#marker_mine").attr("data-id","#marker_mine").attr("data-x",a).attr("data-y",l).attr("x",a-15).attr("y",l-30).attr("data-size",1).attr("width",30).attr("height",30);const d=rw(i),s=pack.burgs[e.burg[t]],h=`${s.name} - ${d} mining town`,c=rn(s.population*populationRate.value*urbanization.value),g=`${s.name} is a mining town of ${c} people just nearby the ${d} mine`;notes.push({id:o,name:h,legend:g}),n--}}(),function(){const r=d3.mean(e.road.filter(t=>t)),n=d3.mean(e.fl.filter(t=>t));let i=Array.from(e.i).filter(t=>e.burg[t]&&e.h[t]>=20&&e.r[t]&&e.fl[t]>n&&e.road[t]>r).sort((t,a)=>e.road[a]+e.fl[a]/10-(e.road[t]+e.fl[t]/10)),l=i.length?Math.ceil(i.length/12*t):0;for(l&&a("bridge","🌉",50,50,16.5);l;){const t=i.splice(0,1),a=e.p[t][0],r=e.p[t][1],n=getNextId("markerElement");markers.append("use").attr("id",n).attr("xlink:href","#marker_bridge").attr("data-id","#marker_bridge").attr("data-x",a).attr("data-y",r).attr("x",a-15).attr("y",r-30).attr("data-size",1).attr("width",30).attr("height",30);const o=pack.burgs[e.burg[t]],d=pack.rivers.find(e=>e.i===pack.cells.r[t]),s=d?`${d.name} ${d.type}`:"river",h=d&&P(.2)?d.name:o.name;notes.push({id:n,name:`${h} Bridge`,legend:`A stone bridge over the ${s} near ${o.name}`}),l--}}(),function(){const r=.9*d3.max(e.road);let n=Array.from(e.i).filter(t=>e.crossroad[t]&&e.h[t]>=20&&e.road[t]>r);if(!n.length)return;const i=Math.ceil(4*t);a("inn","🍻",50,50,17.5);const l=["Dark","Light","Bright","Golden","White","Black","Red","Pink","Purple","Blue","Green","Yellow","Amber","Orange","Brown","Grey"],o=["Antelope","Ape","Badger","Bear","Beaver","Bison","Boar","Buffalo","Cat","Crane","Crocodile","Crow","Deer","Dog","Eagle","Elk","Fox","Goat","Goose","Hare","Hawk","Heron","Horse","Hyena","Ibis","Jackal","Jaguar","Lark","Leopard","Lion","Mantis","Marten","Moose","Mule","Narwhal","Owl","Panther","Rat","Raven","Rook","Scorpion","Shark","Sheep","Snake","Spider","Swan","Tiger","Turtle","Wolf","Wolverine","Camel","Falcon","Hound","Ox"],d=["New","Good","High","Old","Great","Big","Major","Happy","Main","Huge","Far","Beautiful","Fair","Prime","Ancient","Golden","Proud","Lucky","Fat","Honest","Giant","Distant","Friendly","Loud","Hungry","Magical","Superior","Peaceful","Frozen","Divine","Favorable","Brave","Sunny","Flying"];for(let t=0;t<n.length&&t<i;t++){const t=n.splice(Math.floor(Math.random()*n.length),1),a=e.p[t][0],r=e.p[t][1],i=getNextId("markerElement");markers.append("use").attr("id",i).attr("xlink:href","#marker_inn").attr("data-id","#marker_inn").attr("data-x",a).attr("data-y",r).attr("x",a-15).attr("y",r-30).attr("data-size",1).attr("width",30).attr("height",30);const s=P(.3)?"inn":"tavern",h=P(.5)?ra(l)+" "+ra(o):P(.6)?ra(d)+" "+ra(o):ra(d)+" "+capitalize(s);notes.push({id:i,name:"The "+h,legend:`A big and famous roadside ${s}`})}}(),function(){const r=e.i.filter(t=>e.harbor[t]>6&&e.c[t].some(t=>e.h[t]<20&&e.road[t])),n=Array.from(r).map(t=>[t,e.v[t][e.c[t].findIndex(t=>e.h[t]<20&&e.road[t])]]);n.length&&a("lighthouse","🚨",50,50,16);const i=Math.ceil(4*t);for(let t=0;t<n.length&&t<i;t++){const a=n[t][0],r=n[t][1],i=pack.vertices.p[r][0],l=pack.vertices.p[r][1],o=getNextId("markerElement");markers.append("use").attr("id",o).attr("xlink:href","#marker_lighthouse").attr("data-id","#marker_lighthouse").attr("data-x",i).attr("data-y",l).attr("x",i-15).attr("y",l-30).attr("data-size",1).attr("width",30).attr("height",30);const d=e.burg[a]?pack.burgs[e.burg[a]].name:Names.getCulture(e.culture[a]);notes.push({id:o,name:getAdjective(d)+" Lighthouse"+name,legend:"A lighthouse to keep the navigation safe"})}}(),function(){const r=e.i.filter(t=>e.r[t]&&e.h[t]>70);r.length&&a("waterfall","⟱",50,54,16.5);const n=Math.ceil(3*t);for(let t=0;t<r.length&&t<n;t++){const a=r[t],n=e.p[a][0],i=e.p[a][1],l=getNextId("markerElement");markers.append("use").attr("id",l).attr("xlink:href","#marker_waterfall").attr("data-id","#marker_waterfall").attr("data-x",n).attr("data-y",i).attr("x",n-15).attr("y",i-30).attr("data-size",1).attr("width",30).attr("height",30);const o=e.burg[a]?pack.burgs[e.burg[a]].name:Names.getCulture(e.culture[a]);notes.push({id:l,name:getAdjective(o)+" Waterfall"+name,legend:"An extremely beautiful waterfall"})}}(),function(){let r=Array.from(e.i).filter(t=>e.pop[t]>2&&e.h[t]<50&&e.h[t]>25),n=r.length<100?0:Math.ceil(r.length/500*t);const i=Names.getCulture(0,3,7,"",0)+" Era";for(n&&a("battlefield","⚔",50,50,20);n;){const t=r.splice(Math.floor(Math.random()*r.length),1),a=e.p[t][0],l=e.p[t][1],o=getNextId("markerElement");markers.append("use").attr("id",o).attr("xlink:href","#marker_battlefield").attr("data-id","#marker_battlefield").attr("data-x",a).attr("data-y",l).attr("x",a-15).attr("y",l-30).attr("data-size",1).attr("width",30).attr("height",30);const d=Names.getCulture(e.culture[t])+" Battlefield",s=new Date(rand(100,1e3),rand(12),rand(31)).toLocaleDateString("en",{year:"numeric",month:"long",day:"numeric"})+" "+i;notes.push({id:o,name:d,legend:`A historical battlefield spot. \r\nDate: ${s}`}),n--}}(),console.timeEnd("addMarkers")}

// regenerate some zones
function addZones(e=1){console.time("addZones");const t=[],r=pack.cells,n=pack.states,a=pack.burgs,o=new Uint8Array(r.i.length);for(let t=0;t<rn(1.8*Math.random()*e);t++)l();for(let t=0;t<rn(1.6*Math.random()*e);t++)s();for(let t=0;t<rn(1.6*Math.random()*e);t++)i();for(let t=0;t<rn(1.6*Math.random()*e);t++)c();for(let t=0;t<rn(1.8*Math.random()*e);t++)u();for(let t=0;t<rn(1.4*Math.random()*e);t++)h();for(let t=0;t<rn(1.4*Math.random()*e);t++)f();for(let t=0;t<rn(1*Math.random()*e);t++)p();for(let t=0;t<rn(1.4*Math.random()*e);t++)d();for(let t=0;t<rn(1.4*Math.random()*e);t++)g();for(let t=0;t<rn(1.2*Math.random()*e);t++)m();function l(){const e=n.filter(e=>e.diplomacy&&e.diplomacy.some(e=>"Enemy"===e));if(!e.length)return;const a=ra(e),l=a.diplomacy.findIndex(e=>"Enemy"===e),s=ra(r.i.filter(e=>r.state[e]===l&&r.c[e].some(e=>r.state[e]===a.i)));if(!s)return;const i=[],c=[s],u=rand(5,30);for(;c.length;){const e=P(.4)?c.shift():c.pop();if(i.push(e),i.length>u)break;r.c[e].forEach(e=>{o[e]||r.state[e]===l&&(o[e]=1,c.push(e))})}const h=rw({Invasion:4,Occupation:3,Raid:2,Conquest:2,Subjugation:1,Foray:1,Skirmishes:1,Incursion:2,Pillaging:1,Intervention:1}),f=getAdjective(a.name)+" "+h;t.push({name:f,type:"Invasion",cells:i,fill:"url(#hatch1)"})}function s(){const e=ra(n.filter(e=>e.i&&e.neighbors.some(e=>e)));if(!e)return;const a=ra(e.neighbors.filter(e=>e)),l=[],s=[r.i.find(t=>r.state[t]===e.i&&r.c[t].some(e=>r.state[e]===a))],i=rand(10,30);for(;s.length;){const t=s.shift();if(l.push(t),l.length>i)break;r.c[t].forEach(t=>{o[t]||r.state[t]===e.i&&(o[t]=1,(t%4==0||r.c[t].some(e=>r.state[e]===a))&&s.push(t))})}const c=rw({Rebels:5,Insurgents:2,Mutineers:1,Rioters:1,Separatists:1,Secessionists:1,Insurrection:2,Rebellion:1,Conspiracy:2}),u=getAdjective(n[a].name)+" "+c;t.push({name:u,type:"Rebels",cells:l,fill:"url(#hatch3)"})}function i(){const e=ra(pack.religions.filter(e=>"Organized"===e.type));if(!e)return;const n=ra(r.i.filter(t=>r.religion[t]&&r.religion[t]!==e.i&&r.c[t].some(t=>r.religion[t]===e.i)));if(!n)return;const a=r.religion[n],l=[],s=[n],i=rand(10,30);for(;s.length;){const e=s.shift();if(l.push(e),l.length>i)break;r.c[e].forEach(e=>{o[e]||r.religion[e]===a&&(r.h[e]<20||(o[e]=1,s.push(e)))})}const c=getAdjective(e.name.split(" ")[0])+" Proselytism";t.push({name:c,type:"Proselytism",cells:l,fill:"url(#hatch6)"})}function c(){const e=ra(pack.religions.filter(e=>"Heresy"===e.type));if(!e)return;const n=r.i.filter(t=>!o[t]&&r.religion[t]===e.i);if(!n.length)return;n.forEach(e=>o[e]=1);const a=getAdjective(e.name.split(" ")[0])+" Crusade";t.push({name:a,type:"Crusade",cells:n,fill:"url(#hatch6)"})}function u(){const e=ra(a.filter(e=>!o[e.cell]&&e.i&&!e.removed));if(!e)return;const n=[],l=[],s=rand(20,37),i=new PriorityQueue({comparator:(e,t)=>e.p-t.p});for(i.queue({e:e.cell,p:0});i.length;){const e=i.dequeue();(r.burg[e.e]||r.pop[e.e])&&n.push(e.e),o[e.e]=1,r.c[e.e].forEach(function(t){const n=r.road[e.e],a=n?Math.max(10-n,1):100,o=e.p+a;o>s||(!l[t]||o<l[t])&&(l[t]=o,i.queue({e:t,p:o}))})}const c=rw({Fever:5,Pestilence:2,Flu:2,Pox:2,Smallpox:2,Plague:4,Cholera:2,Dropsy:1,Leprosy:2}),u=rw({[(()=>ra(["Golden","White","Black","Red","Pink","Purple","Blue","Green","Yellow","Amber","Orange","Brown","Grey"]))()]:4,[(()=>ra(["Ape","Bear","Boar","Cat","Cow","Dog","Pig","Fox","Bird","Horse","Rat","Raven","Sheep","Spider","Wolf"]))()]:2,[(()=>ra(["Great","Silent","Severe","Blind","Unknown","Loud","Deadly","Burning","Bloody","Brutal","Fatal"]))()]:1})+" "+c;t.push({name:u,type:"Disease",cells:n,fill:"url(#hatch12)"})}function h(){const e=ra(a.filter(e=>!o[e.cell]&&e.i&&!e.removed));if(!e)return;const n=[],l=[],s=rand(5,25),i=new PriorityQueue({comparator:(e,t)=>e.p-t.p});for(i.queue({e:e.cell,p:0});i.length;){const e=i.dequeue();(r.burg[e.e]||r.pop[e.e])&&n.push(e.e),o[e.e]=1,r.c[e.e].forEach(function(t){const r=rand(1,10),n=e.p+r;n>s||(!l[t]||n<l[t])&&(l[t]=n,i.queue({e:t,p:n}))})}const c=rw({Famine:5,Dearth:1,Drought:3,Earthquake:3,Tornadoes:1,Wildfires:1}),u=getAdjective(e.name)+" "+c;t.push({name:u,type:"Disaster",cells:n,fill:"url(#hatch5)"})}function f(){const e=[];if(markers.selectAll("use[data-id='#marker_volcano']").each(function(){e.push(this.dataset.cell)}),!e.length)return;const n=+ra(e),a=markers.select("use[data-cell='"+n+"']").attr("id"),l=notes.filter(e=>e.id===a);l[0]&&(l[0].legend=l[0].legend.replace("Active volcano","Erupting volcano"));const s=l[0]?l[0].name.replace(" Volcano","")+" Eruption":"Volcano Eruption",i=[],c=[n],u=rand(10,30);for(;c.length;){const e=P(.5)?c.shift():c.pop();if(i.push(e),i.length>u)break;r.c[e].forEach(e=>{o[e]||(o[e]=1,c.push(e))})}t.push({name:s,type:"Disaster",cells:i,fill:"url(#hatch7)"})}function p(){const e=r.i.filter(e=>!o[e]&&r.road[e]&&r.h[e]>=70);if(!e.length)return;const n=+ra(e),a=[],l=[n],s=rand(3,15);for(;l.length;){const e=P(.3)?l.shift():l.pop();if(a.push(e),a.length>s)break;r.c[e].forEach(e=>{o[e]||r.h[e]<65||(o[e]=1,l.push(e))})}const i=getAdjective(Names.getCultureShort(r.culture[n]))+" Avalanche";t.push({name:i,type:"Disaster",cells:a,fill:"url(#hatch5)"})}function d(){const e=r.i.filter(e=>!o[e]&&r.h[e]>50&&r.h[e]<70);if(!e.length)return;const n=ra(e),a=[],l=[n],s=rand(3,15);for(;l.length;){const e=l.pop();if(r.h[e]>=20&&a.push(e),a.length>s)break;r.c[e].forEach(e=>{o[e]||r.r[e]||(o[e]=1,l.push(e))})}const i=getAdjective(Names.getCultureShort(r.culture[n]))+" Fault";t.push({name:i,type:"Disaster",cells:a,fill:"url(#hatch2)"})}function g(){const e=r.fl.filter(e=>e),n=d3.mean(e),l=(d3.max(e)-n)/2+n,s=r.i.filter(e=>!o[e]&&r.h[e]<50&&r.r[e]&&r.fl[e]>l&&r.burg[e]);if(!s.length)return;const i=+ra(s),c=r.r[i],u=[],h=[i],f=rand(5,30);for(;h.length;){const e=h.pop();if(u.push(e),u.length>f)break;r.c[e].forEach(e=>{o[e]||r.h[e]<20||r.r[e]!==c||r.h[e]>50||r.fl[e]<n||(o[e]=1,h.push(e))})}const p=getAdjective(a[r.burg[i]].name)+" Flood";t.push({name:p,type:"Disaster",cells:u,fill:"url(#hatch13)"})}function m(){const e=r.i.filter(e=>!o[e]&&-1===r.t[e]&&"lake"!==pack.features[r.f[e]].type);if(!e.length)return;const n=+ra(e),a=[],l=[n],s=rand(10,30);for(;l.length;){const e=l.shift();if(1===r.t[e]&&a.push(e),a.length>s)break;r.c[e].forEach(e=>{o[e]||r.t[e]>2||"lake"!==pack.features[r.f[e]].type&&(o[e]=1,l.push(e))})}const i=getAdjective(Names.getCultureShort(r.culture[n]))+" Tsunami";t.push({name:i,type:"Disaster",cells:a,fill:"url(#hatch13)"})}zones.selectAll("g").data(t).enter().append("g").attr("id",(e,t)=>"zone"+t).attr("data-description",e=>e.name).attr("data-type",e=>e.type).attr("data-cells",e=>e.cells.join(",")).attr("fill",e=>e.fill).selectAll("polygon").data(e=>e.cells).enter().append("polygon").attr("points",e=>getPackPolygon(e)).attr("id",function(e){return this.parentNode.id+"_"+e}),console.timeEnd("addZones")}

function showStatistics(){const e=templateInput.value,t=locked("template")?"":"(random)",n=`  Seed: ${seed}\n  Canvas size: ${graphWidth}x${graphHeight}\n  Template: ${e} ${t}\n  Points: ${grid.points.length}\n  Cells: ${pack.cells.i.length}\n  Map size: ${mapSizeOutput.value}%\n  States: ${pack.states.length-1}\n  Provinces: ${pack.provinces.length-1}\n  Burgs: ${pack.burgs.length-1}\n  Religions: ${pack.religions.length-1}\n  Culture set: ${culturesSet.selectedOptions[0].innerText}\n  Cultures: ${pack.cultures.length-1}`;mapHistory.push({seed:seed,width:graphWidth,height:graphHeight,template:e,created:Date.now()}),console.log(n)}const regenerateMap=debounce(function(){console.warn("Generate new random map"),closeDialogs("#worldConfigurator, #options3d"),customization=0,undraw(),resetZoom(1e3),generate(),restoreLayers(),ThreeD.options.isOn&&ThreeD.redraw(),$("#worldConfigurator").is(":visible")&&editWorld()},500);function undraw(){viewbox.selectAll("path, circle, polygon, line, text, use, #zones > g, #ruler > g").remove(),defs.selectAll("path, clipPath").remove(),notes=[],unfog()}
