/* Сравнение цен в рабочих часах. Все суммы вводятся в рублях. */
(function () {
  "use strict";
  function calculate(a, b, income, monthHours, shiftHours, repeats) {
    const values=[a,b,income,monthHours,shiftHours,repeats];
    if(values.some(x=>!Number.isFinite(x)) || a<0 || b<0 || income<=0 || monthHours<=0 || monthHours>744 || shiftHours<=0 || shiftHours>24 || ![1,12,365].includes(repeats)) return null;
    const rate=income/monthHours, totalA=a*repeats,totalB=b*repeats;
    return {rate,totalA,totalB,hoursA:totalA/rate,hoursB:totalB/rate,shiftsA:totalA/rate/shiftHours,shiftsB:totalB/rate/shiftHours,difference:Math.abs(totalA-totalB),timeDifference:Math.abs(totalA-totalB)/rate};
  }
  if(typeof module!=="undefined"&&module.exports)module.exports={calculate};
  if(typeof document==="undefined")return;
  const form=document.getElementById("price-duel");
  if(!form)return;
  const get=id=>document.getElementById(id);
  const read=id=>{const raw=get(id).value.replace(/\s/g,"").replace(",",".");return raw===""?NaN:Number(raw);};
  const nf=(x,d=1)=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:d}).format(x);
  const cash=x=>nf(x,0)+" ₽";
  function render(){
    const repeats=Number(get("duel-frequency").value);
    const result=calculate(read("duel-a"),read("duel-b"),read("sal"),read("hours"),read("duel-shift"),repeats);
    get("duel-result").hidden=!result;
    get("duel-error").textContent=result?"":"Укажите неотрицательные цены, доход больше нуля, от 0 до 744 рабочих часов в месяц (не включая 0) и смену до 24 часов.";
    if(!result)return;
    const r=result, max=Math.max(r.hoursA,r.hoursB,1);
    ["A","B"].forEach(key=>{
      const suffix=key.toLowerCase();
      get("duel-hours-"+suffix).textContent=nf(r["hours"+key])+" ч";
      get("duel-shifts-"+suffix).textContent=nf(r["shifts"+key])+" смен · "+cash(r["total"+key]);
      get("duel-bar-"+suffix).style.width=(r["hours"+key]/max*100)+"%";
    });
    get("duel-verdict").textContent=r.difference===0?"Одинаковая цена — одинаковое рабочее время.":"Вариант "+(r.totalA<r.totalB?"А":"Б")+" дешевле на "+cash(r.difference)+". Разница — "+nf(r.timeDifference)+" рабочих часов.";
    get("duel-basis").textContent="При доходе "+cash(read("sal"))+" и "+nf(read("hours"))+" ч работы в месяц: "+cash(r.rate)+"/ч. Одна смена — "+nf(read("duel-shift"))+" ч. "+(repeats===1?"Сравниваем по одной покупке.":"Сравниваем за год: "+repeats+" платежей, без изменения цен.");
  }
  form.addEventListener("input",render);form.addEventListener("change",render);
  form.addEventListener("submit",e=>{e.preventDefault();render();});
  ["sal","hours"].forEach(id=>get(id).addEventListener("input",render));
  form.querySelectorAll("[data-duel-example]").forEach(button=>button.addEventListener("click",()=>{
    const examples={phone:[120000,60000,1],coffee:[300,100,365],subscription:[999,399,12]};
    const v=examples[button.dataset.duelExample];
    get("duel-a").value=v[0];get("duel-b").value=v[1];get("duel-frequency").value=String(v[2]);render();
  }));
  render();
})();
