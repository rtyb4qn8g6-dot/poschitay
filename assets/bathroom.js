/* Материалы для прямоугольной ванной. Нормы задаёт пользователь. */
(function () {
  "use strict";
  const defaults = Object.freeze({length:3,width:2,height:2.5,openings:1.6,floor:true,walls:true,reserve:10,floorPack:1.44,wallPack:1.44,glueRate:5,gluePack:25,groutRate:0.35,groutPack:2,waterproof:true,waterproofHeight:0.2,waterproofRate:1.5,waterproofPack:10});
  function calculate(input) {
    const x=Object.assign({},defaults,input), errors=[];
    const range=(key,min,max,label,inclusiveMin=true)=>{const n=x[key];if(typeof n!=="number"||!Number.isFinite(n)||(inclusiveMin?n<min:n<=min)||n>max)errors.push(label);};
    range("length",0,100,"Длина: больше 0 и до 100 м.",false);
    range("width",0,100,"Ширина: больше 0 и до 100 м.",false);
    range("height",0,10,"Высота облицовки: больше 0 и до 10 м.",false);
    range("reserve",0,100,"Запас: от 0 до 100%.");
    ["floor","walls","waterproof"].forEach(k=>{if(typeof x[k]!=="boolean")errors.push("Проверьте переключатели поверхностей.");});
    if(!x.floor&&!x.walls&&!x.waterproof)errors.push("Выберите хотя бы одну поверхность или гидроизоляцию.");
    if(x.walls){range("openings",0,10000,"Площадь проёмов должна быть неотрицательным числом.");range("wallPack",0,100,"Упаковка настенной плитки: больше 0 и до 100 м².",false);}
    if(x.floor)range("floorPack",0,100,"Упаковка напольной плитки: больше 0 и до 100 м².",false);
    if(x.floor||x.walls){
      range("glueRate",0,100,"Расход клея: больше 0 и до 100 кг/м².",false);range("gluePack",0,1000,"Фасовка клея: больше 0 и до 1000 кг.",false);
      range("groutRate",0,20,"Расход затирки: больше 0 и до 20 кг/м².",false);range("groutPack",0,1000,"Фасовка затирки: больше 0 и до 1000 кг.",false);
    }
    if(x.waterproof){
      range("waterproofHeight",0,10,"Высота гидроизоляции: от 0 до 10 м.");
      range("waterproofRate",0,100,"Суммарный расход гидроизоляции: больше 0 и до 100 кг/м².",false);
      range("waterproofPack",0,1000,"Фасовка гидроизоляции: больше 0 и до 1000 кг.",false);
    }
    if(errors.length)return {ok:false,errors:[...new Set(errors)]};
    const floorArea=x.length*x.width,perimeter=2*(x.length+x.width),grossWalls=perimeter*x.height;
    if(x.walls&&x.openings>=grossWalls)return {ok:false,errors:["Проёмы должны занимать меньше площади четырёх стен. Проверьте размеры или отключите плитку на стенах."]};
    const wallArea=x.walls?grossWalls-x.openings:0,tileFloor=x.floor?floorArea:0,tileArea=tileFloor+wallArea,multiplier=1+x.reserve/100;
    // Убираем только машинный шум у целого числа; реальная дробная упаковка округляется вверх.
    const packs=(quantity,size)=>{const q=quantity/size;const near=Math.round(q);return near>0&&Math.abs(q-near)<=Number.EPSILON*Math.max(1,Math.abs(q))*8?near:Math.ceil(q);};
    const material=(quantity,pack)=>({quantity,pack,packages:packs(quantity,pack),purchased:packs(quantity,pack)*pack});
    const items=[];
    if(x.floor)items.push({id:"floor",name:"Напольная плитка",unit:"м²",packageName:"кор.",area:tileFloor,...material(tileFloor*multiplier,x.floorPack)});
    if(x.walls)items.push({id:"walls",name:"Настенная плитка",unit:"м²",packageName:"кор.",area:wallArea,...material(wallArea*multiplier,x.wallPack)});
    if(tileArea>0){
      items.push({id:"glue",name:"Плиточный клей",unit:"кг",packageName:"меш.",area:tileArea,...material(tileArea*x.glueRate,x.gluePack)});
      items.push({id:"grout",name:"Затирка",unit:"кг",packageName:"уп.",area:tileArea,...material(tileArea*x.groutRate,x.groutPack)});
    }
    const waterproofArea=x.waterproof?floorArea+perimeter*x.waterproofHeight:0;
    if(x.waterproof)items.push({id:"waterproof",name:"Гидроизоляция",unit:"кг",packageName:"вед.",area:waterproofArea,...material(waterproofArea*x.waterproofRate,x.waterproofPack)});
    if(items.some(i=>!Number.isFinite(i.quantity)||i.quantity<=0||!Number.isFinite(i.purchased)||!Number.isSafeInteger(i.packages)||i.packages<1))return {ok:false,errors:["Значения слишком малы или велики для надёжного расчёта. Проверьте размеры, расход и фасовки."]};
    return {ok:true,errors:[],input:x,floorArea,perimeter,grossWalls,wallArea,tileArea,waterproofArea,items};
  }
  if(typeof module!=="undefined"&&module.exports)module.exports={calculate,defaults};
  if(typeof document==="undefined")return;
  const form=document.getElementById("bathroom-form");if(!form)return;
  const el=id=>document.getElementById(id), nf=(n,d=2)=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:d}).format(n);
  let last=null;
  const read=()=>{const x={};Object.keys(defaults).forEach(k=>{const f=form.elements.namedItem(k);if(typeof defaults[k]==="boolean")x[k]=f.checked;else {const s=f.value.replace(/\s/g,"").replace(",",".");x[k]=s===""?NaN:Number(s);}});return x;};
  function render(){
    const x=read();["floor","walls","waterproof"].forEach(k=>form.querySelectorAll('[data-for="'+k+'"]').forEach(e=>e.disabled=!x[k]));
    form.querySelectorAll("[data-for-tiling]").forEach(e=>e.disabled=!x.floor&&!x.walls);
    const r=calculate(x);last=r.ok?r:null;
    el("bathroom-error").textContent=r.errors.join(" ");
    el("bathroom-results").hidden=!r.ok;
    el("bathroom-copy").disabled=!r.ok;
    if(!r.ok)return;
    el("bathroom-floor").textContent=nf(r.floorArea)+" м²";
    el("bathroom-walls").textContent=x.walls?nf(r.wallArea)+" м²":"не считаем";
    el("bathroom-hydro").textContent=x.waterproof?nf(r.waterproofArea)+" м²":"не считаем";
    el("bathroom-reserve").textContent=nf(x.reserve)+"%";
    el("bathroom-room-summary").textContent="Ванная "+nf(x.length)+" × "+nf(x.width)+" м · высота облицовки "+nf(x.height)+" м · исключённые проёмы "+(x.walls?nf(x.openings):"не учитываются")+(x.walls?" м²":"");
    el("bathroom-list").innerHTML=r.items.map(i=>'<li><label><input type="checkbox"><span><b>'+i.name+'</b><small>По расчёту'+(["floor","walls"].includes(i.id)?" с запасом":"")+': '+nf(i.quantity)+' '+i.unit+' · фасовка '+nf(i.pack)+' '+i.unit+'</small></span><strong>'+nf(i.packages,0)+' '+i.packageName+'<small>К покупке '+nf(i.purchased)+' '+i.unit+'</small></strong></label></li>').join("");
    el("bathroom-summary").textContent="Плитка — "+nf(r.tileArea)+" м² чистой облицовки. Запас "+nf(x.reserve)+"% добавлен только к плитке. Клей и затирка считаются по чистой площади, без плиточного запаса. Все фасовки округлены вверх.";
    el("bathroom-hydro-note").textContent=x.waterproof?"Гидроизоляция: весь пол "+nf(r.floorArea)+" м² + полоса по четырём стенам "+nf(r.perimeter)+" × "+nf(x.waterproofHeight)+" м. Проёмы не вычитаются. Выбранная зона — допущение расчёта, её нужно сверить с проектом мокрой зоны.":"Гидроизоляция отключена и в список покупок не входит.";
    const rectW=240,rectH=Math.max(45,Math.min(190,rectW*x.width/x.length));
    el("bathroom-plan-floor").setAttribute("height",rectH);el("bathroom-plan-floor").setAttribute("y",125-rectH/2);
    el("bathroom-plan-width").textContent=nf(x.width)+" м";el("bathroom-plan-length").textContent=nf(x.length)+" м";
    el("bathroom-plan-caption").textContent=nf(r.floorArea)+" м²";
    el("bathroom-status").textContent="";
  }
  form.addEventListener("input",render);form.addEventListener("change",render);
  form.addEventListener("submit",e=>{e.preventDefault();render();el("bathroom-results").scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});});
  el("bathroom-reset").addEventListener("click",()=>{Object.entries(defaults).forEach(([k,v])=>{const f=form.elements.namedItem(k);if(typeof v==="boolean")f.checked=v;else f.value=v;});render();});
  el("bathroom-copy").addEventListener("click",async()=>{
    if(!last)return;
    const r=last,text=["Посчитай — материалы для ванной",nf(r.input.length)+" × "+nf(r.input.width)+" м, высота облицовки "+nf(r.input.height)+" м; запас "+nf(r.input.reserve)+"%.",...r.items.map(i=>i.name+": "+nf(i.packages,0)+" "+i.packageName+" по "+nf(i.pack)+" "+i.unit+" (всего "+nf(i.purchased)+" "+i.unit+")"),"Нормы и зоны предварительные: сверьте с упаковкой и проектом.","https://poschitay24.ru/remont-vannoy"].join("\n");
    try{await navigator.clipboard.writeText(text);el("bathroom-status").textContent="Список скопирован. Можно отправить мастеру или взять в магазин.";}catch(e){el("bathroom-status").textContent="Не удалось скопировать автоматически. Используйте кнопку «Распечатать список».";}
  });
  el("bathroom-print").addEventListener("click",()=>window.print());
  render();
})();

