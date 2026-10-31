/* Adapted from measurement-1@8cd976dd; pointer stays within central channel. */
(function(root){'use strict';const K=root.LabKit=root.LabKit||{};let serial=0;
function springReadoutDetail({force,max=10,step=.2,majorEvery=5}={}){
if(![force,max,step].every(Number.isFinite)||max<=0||step<=0||force<0||force>max||max/step>500)throw Error('Invalid spring scale');
const q={force,ticks:force/step,spec:{max,step,major:majorEvery}},prefix='measurementSpring'+(++serial);
const txt=(x,y,value,size=22)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="#222" font-family="Arial,Microsoft YaHei,sans-serif">${value}</text>`;
  function instrument(prefix){
    const py=300+q.force/q.spec.max*300,hook=730+q.force/q.spec.max*35;
    let svg=`<defs><linearGradient id="${prefix}Metal"><stop stop-color="#777"/><stop offset=".35" stop-color="#eee"/><stop offset=".7" stop-color="#b7b7b7"/><stop offset="1" stop-color="#666"/></linearGradient></defs><circle cx="250" cy="77" r="62" fill="none" stroke="url(#${prefix}Metal)" stroke-width="12"/><rect x="222" y="111" width="56" height="40" fill="#c4c8ca"/>
      <path d="M155 153Q250 102 345 153V682Q250 727 155 682Z" fill="#277583"/><path d="M162 212Q196 193 220 193Q250 146 280 193Q310 194 338 212V638Q250 677 162 638Z" fill="white" stroke="#aab3b5" stroke-width="2"/>
      ${txt(250,219,q.spec.max+' N',25)}${txt(250,249,'条形盒',22)}${txt(250,276,'测力计',22)}${txt(180,291,'N',21)}${txt(320,291,'N',21)}
      <rect x="242" y="284" width="16" height="350" fill="#343434"/>`;
    // The coil extends as the pointer moves down. The rod and hook carry the load.
    let coil='M244 285';for(let i=0;i<20;i++)coil+=`L${i%2?244:256} ${285+(py-285)*(i+1)/20}`;
    svg+=`<path d="${coil}" fill="none" stroke="#ddd" stroke-width="2.5"/><rect x="243" y="${py}" width="14" height="${hook-24-py}" fill="url(#${prefix}Metal)"/>`;
    for(let i=0;i<=Math.round(q.spec.max/q.spec.step);i++){const y=300+i*q.spec.step/q.spec.max*300,major=i%q.spec.major===0,len=major?32:19;svg+=`<path data-tick="${i}" d="M${242-len} ${y}H242M258 ${y}H${258+len}" stroke="#272727" stroke-width="1.5"/>`;if(major){const label=Number((i*q.spec.step).toFixed(1));svg+=txt(191,y+7,label,22)+txt(309,y+7,label,22);}}
    svg+=`<path data-pointer="${q.ticks}" data-pointer-clearance="1.25" d="M244 ${py}L250 ${py-1.4}L256 ${py}L250 ${py+1.4}Z" fill="#c9222b"/>
      <path d="M230 695V${hook-27}Q250 ${hook-7} 270 ${hook-27}V695" fill="none" stroke="#c7cbce" stroke-width="9"/><path d="M250 ${hook-26}C279 ${hook-24} 250 ${hook-4} 240 ${hook+7}C218 ${hook+33} 257 ${hook+43} 269 ${hook+16}" fill="none" stroke="#898d90" stroke-width="6"/><path d="M250 ${hook-26}C279 ${hook-24} 250 ${hook-4} 240 ${hook+7}C218 ${hook+33} 257 ${hook+43} 269 ${hook+16}" fill="none" stroke="#e3e5e6" stroke-width="2"/>`;
    return svg;
  }
const py=300+force/max*300;return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 940" role="img" aria-label="测力计原面板局部">${instrument(prefix)}</svg>`,viewBox:[160,Math.max(265,Math.min(535,py-70)),180,150],focus:[250,py],readout:force.toFixed(2)+' N',subtitle:`${max} N量程 · 每小格${step} N`};}
function cylinderWithLens({value=39,after=true,object={id:'aluminum',volume:8}}={}){
if(!Number.isFinite(value)||value<5||value>50)throw Error('Cylinder value must be 5–50 mL');const q={item:object||{id:'aluminum'},volume:object?.volume||8};
  const y=v=>560-v*8;
  const text=(x,yy,t,size=23)=>`<text x="${x}" y="${yy}" text-anchor="middle" font-family="Arial,Microsoft YaHei,sans-serif" font-size="${size}" fill="#202020">${t}</text>`;
  function water(cx,value,id){const yy=y(value);return `<path data-liquid="${value}" d="M${cx-44} ${yy-6}Q${cx-41} ${yy} ${cx-33} ${yy}H${cx+33}Q${cx+41} ${yy} ${cx+44} ${yy-6}V558Q${cx} 568 ${cx-44} 558Z" fill="url(#${id}Water)"/><path d="M${cx-44} ${yy-6}Q${cx-41} ${yy} ${cx-33} ${yy}H${cx+33}Q${cx+41} ${yy} ${cx+44} ${yy-6}" fill="none" stroke="#65bddb" stroke-width="1"/>`;}
  function markings(cx,zoomValue=null){
    const lower=zoomValue===null?null:Math.max(10,Math.min(40,Math.floor(zoomValue/10)*10));
    let t='';for(let n=5;n<=50;n++){const yy=y(n),major=n%10===0,half=n%5===0;
      t+=`<path data-tick="${n}" d="M${cx-(major?37:half?29:22)} ${yy}H${cx+22}" fill="none" stroke="#222" stroke-width="${major?1.8:1.1}"/>`;
      if(major&&(lower===null||n===lower||n===lower+10))t+=`<g data-scale-label="${n}">${text(cx+33,yy-3,n,16)}</g>`;
    }return t;
  }

  function solid(cx){const h=32+q.volume*6,top=555-h;
    if(q.item.id==='stone')return `<g data-solid="stone"><path d="M${cx-34} 537L${cx-37} ${top+30}L${cx-20} ${top+3}L${cx+11} ${top}L${cx+34} ${top+22}L${cx+38} 530L${cx+23} 553L${cx-17} 557Z" fill="#88654e" stroke="#513c2e" stroke-width="2.5"/><path d="M${cx-20} ${top+7}L${cx-10} ${top+34}L${cx+25} ${top+24}M${cx-10} ${top+34}L${cx+8} 542L${cx+30} 531" fill="none" stroke="#b69678" stroke-width="3"/></g>`;
    const fill=q.item.id==='aluminum'?'#a6b2bd':'#626c7b';return `<g data-solid="${q.item.id}"><path d="M${cx-32} ${top+12}L${cx+22} ${top}L${cx+34} ${top+14}V545L${cx-19} 557L${cx-32} 543Z" fill="${fill}" stroke="#3c4856" stroke-width="2"/><path d="M${cx-32} ${top+12}L${cx-19} ${top+27}L${cx+34} ${top+14}M${cx-19} ${top+27}V557" fill="none" stroke="#e0e6eb" stroke-width="2"/><path d="M${cx-10} ${top+39}L${cx+20} ${top+32}" stroke="#dbe3ea" stroke-width="3"/></g>`;
  }
  function drawScene(id,value,after){const cx=after?500:100,bx=after?225:375,by=330,r=218,yy=y(value),zoom=3.4;
    const lower=Math.max(10,Math.min(40,Math.floor(value/10)*10)),focusY=y(lower+5);
    let svg=`<defs><linearGradient id="${id}Water"><stop stop-color="#a4def2"/><stop offset=".5" stop-color="#edfaff"/><stop offset="1" stop-color="#a4def2"/></linearGradient><clipPath id="${id}Clip"><circle cx="${bx}" cy="${by}" r="${r}"/></clipPath></defs>`;
    svg+=`<path d="M${cx-55} 39H${cx+48}Q${cx+50} 39 ${cx+50} 44V568Q${cx+77} 587 ${cx+84} 609H${cx-84}Q${cx-76} 587 ${cx-50} 568V57Q${cx-50} 48 ${cx-61} 46Q${cx-66} 39 ${cx-55} 39Z" fill="#fafeff" stroke="#363636" stroke-width="2"/>`;
    svg+=water(cx,value,id);if(after&&object)svg+=solid(cx);svg+=markings(cx);
    svg+=`<path d="M${cx-61} 46H${cx+49}M${cx-88} 610H${cx+88}L${cx+94} 617H${cx-94}Z" fill="#e6f4f9" stroke="#333" stroke-width="2"/>`+text(cx,96,'20 °C',23)+text(cx,124,'50 mL',23);
    // Frame two adjacent numbered marks together; never center only on the liquid level.
    const edge=cx+(after?-44:44),near=bx+(after?r*.7:-r*.7);
    svg+=`<path d="M${edge} ${yy}Q${near} ${yy} ${near} ${by+r*.68}" fill="none" stroke="#29a5d7" stroke-width="2.5"/><circle cx="${bx}" cy="${by}" r="${r}" fill="white"/><g clip-path="url(#${id}Clip)"><g data-zoom-volume="${value}" transform="translate(${bx-zoom*(cx+8)} ${by+18-zoom*focusY}) scale(${zoom})">${water(cx,value,id)}${markings(cx,value)}</g></g><circle cx="${bx}" cy="${by}" r="${r}" fill="none" stroke="#29a5d7" stroke-width="2.5"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 650" role="img" aria-label="量筒及圆形液面放大镜">${svg}</svg>`;
  }
return drawScene('cylinderDetail'+(++serial),value,after);}
function cropInstrumentSVG(d){return d.svg.replace(/viewBox="[^"]+"/,`viewBox="${d.viewBox.join(' ')}"`);}
Object.assign(K,{springReadoutDetail,cylinderWithLens,cropInstrumentSVG});
})(typeof window==='undefined'?globalThis:window);
