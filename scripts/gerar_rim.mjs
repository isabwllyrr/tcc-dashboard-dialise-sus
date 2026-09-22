/** DialisaSUS: autoria procedural do projeto, sem geometria/imagens externas.
 * npm ci && node scripts/gerar_rim.mjs
 * Mesma seed + versões fixadas no lockfile => mesmos bytes.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { SphereGeometry, Vector3, TubeGeometry, CatmullRomCurve3 } from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsClearcoat, KHRMaterialsSheen } from '@gltf-transform/extensions';
import { dedup, weld, resample, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const SEED = 18473, N = 1024;
let state = SEED;
const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = t => t * t * (3 - 2 * t);
function hash(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ SEED;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, z) {
  const a = Math.floor(x), b = Math.floor(y), c = Math.floor(z);
  const u = smooth(x - a), v = smooth(y - b), w = smooth(z - c);
  let result = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++)
    result += hash(a+i,b+j,c+k) * (i ? u : 1-u) * (j ? v : 1-v) * (k ? w : 1-w);
  return result;
}
function field(x, y, z) {
  return .56*noise(x*5+7,y*5,z*5) + .27*noise(x*13,y*13+3,z*13)
    + .12*noise(x*34,y*34,z*34+5) + .05*noise(x*91,y*91,z*91);
}
// Three SphereGeometry UV convention: u=0/1 is lateral (-X), u=.5 medial (+X).
function sphere(u, v) {
  const p = Math.PI * v, t = Math.PI * 2 * u;
  return [-Math.cos(t)*Math.sin(p), Math.cos(p), Math.sin(t)*Math.sin(p)];
}
function height(x,y,z) { return (field(x,y,z)-.5)*.0028; }

const geometry = new SphereGeometry(1, 256, 160);
const positions = geometry.attributes.position;
for (let i=0;i<positions.count;i++) {
  const nx=positions.getX(i), ny=positions.getY(i), nz=positions.getZ(i);
  const medial = Math.pow(Math.max(0,nx), 1.6);
  const waist = Math.exp(-Math.pow((ny+.035)/.35,2));
  const h=height(nx,ny,nz);
  // Upper/lower shoulders differ, smooth convex lateral margin; medial cleft.
  const x = .275*nx*(1+.09*ny) - .31*medial*waist + .012*ny + h*nx;
  const y = .5*ny + .012*nx*(1-ny*ny) + h*ny;
  const z = .135*nz*(1+.055*ny)*(1-.32*medial*waist) + h*nz;
  positions.setXYZ(i,x,y,z);
}
// Shape construction enforces the requested anatomical ratio, prior to runtime uniform scaling.
geometry.computeBoundingBox();
const size=geometry.boundingBox.getSize(new Vector3());
geometry.scale(.55/size.x,1/size.y,.27/size.z);
geometry.computeVertexNormals();
// Average normals on coincident UV seams and poles (UV coordinates stay split).
const groups=new Map();
for(let i=0;i<positions.count;i++){
  const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v*1e7)).join(',');
  if(!groups.has(key))groups.set(key,[]); groups.get(key).push(i);
}
for(const indices of groups.values()){
  const n=new Vector3(); for(const i of indices)n.add(new Vector3().fromBufferAttribute(geometry.attributes.normal,i));
  n.normalize(); for(const i of indices)geometry.attributes.normal.setXYZ(i,n.x,n.y,n.z);
}

// Rasterized branching vascular trees, generated rather than sampled from an image.
const vessels=new Float32Array(N*N), arteries=new Float32Array(N*N);
function stamp(map,x,y,r,strength){
  for(let j=Math.floor(y-r*2);j<=y+r*2;j++)for(let i=Math.floor(x-r*2);i<=x+r*2;i++){
    if(j<0||j>=N)continue;
    const d=((i-x)**2+(j-y)**2)/(r*r);
    if(d>4)continue;
    const at=j*N+((i%N)+N)%N;
    map[at]=Math.max(map[at],Math.exp(-d*1.5)*strength);
  }
}
function branch(map,x,y,dx,dy,length,width,depth){
  const steps=Math.ceil(length*1.6), bend=(random()-.5)*.8;
  let px=x,py=y;
  for(let s=0;s<steps;s++){
    const t=s/steps,angle=bend*Math.sin(t*Math.PI);
    px+= (dx*Math.cos(angle)-dy*Math.sin(angle))*.625;
    py+= (dy*Math.cos(angle)+dx*Math.sin(angle))*.625;
    stamp(map,px,py,Math.max(.45,width*(1-t*.6)),.7*(1-t*.32));
    if(depth>0&&(s===Math.floor(steps*.43)||s===Math.floor(steps*.72))){
      const a=(s<steps*.6?-1:1)*(.4+random()*.5);
      branch(map,px,py,dx*Math.cos(a)-dy*Math.sin(a),dy*Math.cos(a)+dx*Math.sin(a),length*.43,width*.5,depth-1);
    }
  }
}
for(const side of [-1,1])for(let k=0;k<6;k++){
  const a=-1.1+k*.43;
  branch(vessels,N*.5,N*(.48+(random()-.5)*.045),side*Math.cos(a),Math.sin(a),N*(.17+random()*.19),1.6+random()*.6,3);
}
for(const side of [-1,1])for(let k=0;k<4;k++){
  const a=-.95+k*.62;
  branch(arteries,N*.5,N*.5,side*Math.cos(a),Math.sin(a),N*(.15+random()*.14),.9,2);
}
const albedo=Buffer.alloc(N*N*3),normal=Buffer.alloc(N*N*3),orm=Buffer.alloc(N*N*3);
const heights=new Float32Array(N*N);
for(let j=0;j<N;j++)for(let i=0;i<N;i++){
  const [x,y,z]=sphere((i+.5)/N,(j+.5)/N),at=j*N+i;
  const f=field(x,y,z), fine=noise(x*160,y*160,z*160);
  heights[at]=height(x,y,z)+.00009*(fine-.5)+vessels[at]*.0001;
  const cleft=Math.pow(Math.max(0,x),8)*Math.exp(-Math.pow(y/.4,2));
  const marble=noise(x*19+field(x,y,z)*3,y*19,z*19);
  const variation=(f-.5)*65+(marble-.5)*15;
  const vein=vessels[at]*.78,artery=arteries[at]*.48;
  const colors=[146+variation+y*3,67+variation*.58,55+variation*.5];
  for(let c=0;c<3;c++)albedo[at*3+c]=clamp(colors[c]*(1-cleft*.15)*(1-vein)+[85,39,52][c]*vein+artery*[12,-8,-5][c],0,255);
  orm[at*3]=Math.round(255*(1-cleft*.32));
  orm[at*3+1]=Math.round(255*clamp(.29-(f-.5)*.23+(fine-.5)*.025,.18,.40));
  orm[at*3+2]=0;
}
for(let j=0;j<N;j++)for(let i=0;i<N;i++){
  const at=j*N+i;
  const du=heights[j*N+(i+1)%N]-heights[j*N+(i+N-1)%N];
  const dv=heights[Math.min(N-1,j+1)*N+i]-heights[Math.max(0,j-1)*N+i];
  // OpenGL tangent normal, glTF texture V increases downward.
  const nx=-du*N,ny=dv*N,nz=1,mag=Math.hypot(nx,ny,nz);
  normal[at*3]=Math.round((nx/mag*.5+.5)*255);
  normal[at*3+1]=Math.round((ny/mag*.5+.5)*255);
  normal[at*3+2]=Math.round((nz/mag*.5+.5)*255);
}
const doc=new Document(),buffer=doc.createBuffer();
const texture=async(name,data)=>doc.createTexture(name).setImage(await sharp(data,{raw:{width:N,height:N,channels:3}}).png().toBuffer()).setMimeType('image/png');
const color=await texture('Capsula_Albedo_Vascular',albedo),norm=await texture('Capsula_Normal',normal),packed=await texture('Capsula_AO_Roughness_Metallic',orm);
const coat=doc.createExtension(KHRMaterialsClearcoat).createClearcoat().setClearcoatFactor(.42).setClearcoatRoughnessFactor(.23);
const sheen=doc.createExtension(KHRMaterialsSheen).createSheen().setSheenColorFactor([.055,.018,.014]).setSheenRoughnessFactor(.5);
const material=doc.createMaterial('Capsula_renal_umida').setBaseColorTexture(color).setNormalTexture(norm).setNormalScale(.45)
  .setMetallicRoughnessTexture(packed).setOcclusionTexture(packed).setMetallicFactor(0).setRoughnessFactor(1)
  .setExtension('KHR_materials_clearcoat',coat).setExtension('KHR_materials_sheen',sheen);
const accessor=(name,type,array)=>doc.createAccessor(name,buffer).setType(type).setArray(array);
// glTF UV V is flipped relative to Three's SphereGeometry.
const uv=Float32Array.from(geometry.attributes.uv.array); for(let i=1;i<uv.length;i+=2)uv[i]=1-uv[i];
const primitive=doc.createPrimitive().setAttribute('POSITION',accessor('pos','VEC3',geometry.attributes.position.array))
  .setAttribute('NORMAL',accessor('normal','VEC3',geometry.attributes.normal.array))
  .setAttribute('TEXCOORD_0',accessor('uv','VEC2',uv))
  .setIndices(accessor('indices','SCALAR',geometry.index.array)).setMaterial(material);
const scene=doc.createScene('Rim_procedural_DialisaSUS');
scene.addChild(doc.createNode('Capsula_com_hilo_medial').setMesh(doc.createMesh('Rim_fechado').addPrimitive(primitive)));
let triangles=geometry.index.count/3;
// Short hollow anatomical stumps. Their annular end rims close the wall mesh;
// the visible lumen is not a hole in the capsule. All stay within its bounds.
function vessel(name,points,radius,color){
  const curve=new CatmullRomCurve3(points.map(p=>new Vector3(...p))),segments=28,radial=20;
  const outer=new TubeGeometry(curve,segments,radius,radial,false);
  const inner=new TubeGeometry(curve,segments,radius*.62,radial,false);
  const count=outer.attributes.position.count;
  const pos=new Float32Array(count*6),nor=new Float32Array(count*6),uvs=new Float32Array(count*4);
  pos.set(outer.attributes.position.array);pos.set(inner.attributes.position.array,count*3);
  nor.set(outer.attributes.normal.array);nor.set(Float32Array.from(inner.attributes.normal.array,v=>-v),count*3);
  uvs.set(outer.attributes.uv.array);uvs.set(inner.attributes.uv.array,count*2);
  const idx=[...outer.index.array];
  for(let i=0;i<inner.index.count;i+=3)idx.push(inner.index.array[i]+count,inner.index.array[i+2]+count,inner.index.array[i+1]+count);
  for(const row of [0,segments])for(let j=0;j<radial;j++){
    const a=row*(radial+1)+j,b=a+1,c=a+count,d=b+count;
    if(row===0)idx.push(a,c,b,b,c,d);else idx.push(a,b,c,b,d,c);
  }
  const mat=doc.createMaterial(name+'_tecido').setBaseColorFactor([...color,1]).setNormalTexture(norm).setNormalScale(.15)
    .setMetallicRoughnessTexture(packed).setMetallicFactor(0).setRoughnessFactor(1)
    .setExtension('KHR_materials_clearcoat',coat);
  const prim=doc.createPrimitive().setAttribute('POSITION',accessor(name+'_pos','VEC3',pos))
    .setAttribute('NORMAL',accessor(name+'_nor','VEC3',nor)).setAttribute('TEXCOORD_0',accessor(name+'_uv','VEC2',uvs))
    .setIndices(accessor(name+'_idx','SCALAR',new Uint16Array(idx))).setMaterial(mat);
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  triangles+=idx.length/3;
}
vessel('Arteria_renal',[[-.075,.045,-.015],[.015,.048,-.012],[.115,.078,-.006],[.16,.085,.002]],.017,[.34,.045,.035]);
vessel('Veia_renal',[[-.065,.007,.025],[.008,.003,.036],[.12,.024,.052],[.185,.032,.058]],.023,[.19,.065,.09]);
vessel('Ureter',[[-.07,-.045,-.018],[.032,-.085,-.005],[.086,-.19,.018],[.11,-.26,.025]],.013,[.63,.43,.25]);
doc.getRoot().setExtras({author:'DialisaSUS',seed:SEED,ratio:[1,.55,.27],generator:'scripts/gerar_rim.mjs'});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
await mkdir('docs/amostra/assets/source',{recursive:true});
await doc.transform(weld(),dedup(),resample());
await io.write('docs/amostra/assets/source/rim-procedural-master.glb',doc);
await doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',resize:[N,N],quality:76}),meshopt({encoder:MeshoptEncoder,level:'medium',quantizePosition:16}));
await io.write('public/assets/kidney.glb',doc);
const out=await readFile('public/assets/kidney.glb');
const json=JSON.parse(out.subarray(20,20+out.readUInt32LE(12)));
const manifest={seed:SEED,resolution:N,ratio:[1,.55,.27],triangles,images:json.images.length,materials:json.materials,
  files:await Promise.all(['docs/amostra/assets/source/rim-procedural-master.glb','public/assets/kidney.glb'].map(async path=>{const b=await readFile(path);return{path,bytes:b.length,gzip:gzipSync(b,{level:9}).length,sha256:createHash('sha256').update(b).digest('hex')};}))};
await writeFile('docs/amostra/assets/rim-procedural-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
