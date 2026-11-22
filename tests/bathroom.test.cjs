const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, defaults } = require('../assets/bathroom.js');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const get = (r, id) => r.items.find(item => item.id === id);

test('independent rectangular room reference, reserve only on tiles', () => {
  const r=calculate({length:2,width:3,height:2.5,openings:2,reserve:10,floorPack:1.44,wallPack:1.2,glueRate:5,gluePack:25,groutRate:0.4,groutPack:2,waterproofHeight:0.2,waterproofRate:1.5,waterproofPack:5});
  assert.equal(r.ok,true); close(r.floorArea,6);close(r.wallArea,23);close(r.tileArea,29);close(r.waterproofArea,8);
  const expected={floor:[6.6,5,7.2],walls:[25.3,22,26.4],glue:[145,6,150],grout:[11.6,6,12],waterproof:[12,3,15]};
  for(const [id,[q,p,bought]] of Object.entries(expected)){const item=get(r,id);close(item.quantity,q);assert.equal(item.packages,p);close(item.purchased,bought);}
});

test('default case matches on-page example quantities', () => {
  const r=calculate(defaults);assert.equal(r.ok,true);close(r.floorArea,6);close(r.wallArea,23.4);close(r.tileArea,29.4);close(r.waterproofArea,8);
  assert.deepEqual(r.items.map(x=>[x.id,x.packages]),[['floor',5],['walls',18],['glue',6],['grout',6],['waterproof',2]]);
});

test('floor-only excludes walls and ignores inactive field values', () => {
  const r=calculate({floor:true,walls:false,waterproof:false,wallPack:NaN,openings:Infinity,waterproofRate:-1,waterproofPack:0,waterproofHeight:Infinity});
  assert.equal(r.ok,true);assert.deepEqual(r.items.map(x=>x.id),['floor','glue','grout']);close(r.tileArea,6);close(get(r,'glue').quantity,30);
});

test('walls-only excludes floor tile and ignores floor packaging', () => {
  const r=calculate({floor:false,walls:true,waterproof:false,floorPack:0,openings:0,reserve:0});
  assert.equal(r.ok,true);assert.deepEqual(r.items.map(x=>x.id),['walls','glue','grout']);close(r.tileArea,25);close(get(r,'glue').quantity,125);
});

test('waterproofing independently includes floor plus chosen perimeter strip', () => {
  const r=calculate({floor:false,walls:false,waterproof:true,waterproofHeight:0,floorPack:0,wallPack:0,openings:Infinity,gluePack:0,groutRate:NaN});
  assert.equal(r.ok,true);assert.deepEqual(r.items.map(x=>x.id),['waterproof']);close(r.tileArea,0);close(r.waterproofArea,6);close(get(r,'waterproof').quantity,9);
});

test('no selected materials returns a helpful validation failure',()=>{const r=calculate({floor:false,walls:false,waterproof:false});assert.equal(r.ok,false);assert.ok(r.errors.length);});

test('chosen waterproofing height is independent of tiling height',()=>{
  const r=calculate({height:1,waterproofHeight:2,waterproofRate:1.5,waterproofPack:10});
  assert.equal(r.ok,true);close(r.waterproofArea,26);close(get(r,'waterproof').quantity,39);assert.equal(get(r,'waterproof').packages,4);
});

test('openings equal to or greater than gross walls fail',()=>{for(const openings of [25,26]){const r=calculate({openings});assert.equal(r.ok,false);assert.ok(r.errors.some(x=>x.includes('Проёмы')));}});

test('invalid active inputs never produce results',()=>{
  for(const key of Object.keys(defaults)){
    if(typeof defaults[key]==='boolean'){
      assert.equal(calculate({[key]:'true'}).ok,false,key);continue;
    }
    for(const value of [NaN,Infinity,-Infinity,'2',null,-1])assert.equal(calculate({[key]:value}).ok,false,`${key}=${value}`);
  }
  for(const key of ['length','width','height','floorPack','wallPack','glueRate','gluePack','groutRate','groutPack','waterproofRate','waterproofPack'])assert.equal(calculate({[key]:0}).ok,false,`zero ${key}`);
});

test('zero openings, zero reserve and maximum reserve are valid',()=>{
  const noReserve=calculate({openings:0,reserve:0});assert.equal(noReserve.ok,true);close(get(noReserve,'floor').quantity,6);
  const double=calculate({openings:0,reserve:100});assert.equal(double.ok,true);close(get(double,'floor').quantity,12);close(get(double,'glue').quantity,get(noReserve,'glue').quantity);
});

test('decimal exact pack boundaries avoid floating-point extra packs',()=>{
  let r=calculate({length:0.1,width:0.2,floor:true,walls:false,waterproof:false,reserve:0,floorPack:0.01,glueRate:1,gluePack:0.01,groutRate:1,groutPack:0.01});
  assert.equal(r.ok,true);assert.equal(get(r,'floor').packages,2);assert.equal(get(r,'glue').packages,2);
  r=calculate({length:0.1,width:0.20000001,floor:true,walls:false,waterproof:false,reserve:0,floorPack:0.01});assert.equal(get(r,'floor').packages,3);
});

test('positive tiny quantities still need at least one whole package',()=>{
  const r=calculate({length:1e-9,width:1e-9,floor:true,walls:false,waterproof:false});assert.equal(r.ok,true);
  for(const item of r.items){assert.ok(item.quantity>0);assert.ok(item.packages>=1,`${item.id}: positive demand rounded to zero`);}
});

test('mixed bounded scenarios preserve area and package coverage',()=>{
  for(let k=1;k<=100;k++){
    const length=0.5+k/31,width=0.7+k/47,height=1.1+k/100,openings=k%3?0.7:0;
    const r=calculate({length,width,height,openings,reserve:k%21,floorPack:1.1+(k%5)/10,wallPack:0.9+(k%7)/10,waterproofHeight:0.1+(k%6)/10});
    assert.equal(r.ok,true);close(r.tileArea,length*width+2*(length+width)*height-openings);
    for(const item of r.items){assert.ok(Number.isInteger(item.packages));assert.ok(item.packages>0);assert.ok(item.purchased+1e-9>=item.quantity);assert.ok(item.purchased-item.pack<item.quantity+1e-9);}
  }
});

test('calculation does not mutate defaults or supplied input',()=>{const input={length:2,reserve:0};const before=JSON.stringify(input),d=JSON.stringify(defaults);calculate(input);assert.equal(JSON.stringify(input),before);assert.equal(JSON.stringify(defaults),d);});

test('extreme finite inputs fail safely or produce finite safe package counts',()=>{
  const cases=[
    {floorPack:1e-320}, {wallPack:1e-320}, {gluePack:1e-320}, {groutPack:1e-320}, {waterproofPack:1e-320},
    {length:1e-320,width:1e-320}, {glueRate:1e-320}, {groutRate:1e-320}, {waterproofRate:1e-320}
  ];
  for(const input of cases){const r=calculate(input);if(!r.ok){assert.ok(r.errors.length);continue;}
    for(const item of r.items){assert.ok(Number.isFinite(item.quantity));assert.ok(Number.isFinite(item.purchased));assert.ok(Number.isSafeInteger(item.packages),JSON.stringify(input)+' '+item.id+' count='+item.packages);}
  }
});
