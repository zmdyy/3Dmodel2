/* A limited self-contained glTF 2.0 / GLB parser for the DZ47 Blender export.
   Implements embedded buffers, mesh attributes, PBR materials, shape keys and
   node TRS / morph-weight animation. No glTF extensions or skins are assumed.
   GLB files using Draco/KTX2/external URIs are reported as unsupported. */
const LocalGLB = (()=>{
  const typeComps={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
  const ctor={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
  const bsz={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
  const getComponent=(view,off,t)=>({5120:()=>view.getInt8(off),5121:()=>view.getUint8(off),5122:()=>view.getInt16(off,true),5123:()=>view.getUint16(off,true),5125:()=>view.getUint32(off,true),5126:()=>view.getFloat32(off,true)})[t]();
  function norm(val,t){if(t===5120)return Math.max(-1,val/127);if(t===5121)return val/255;if(t===5122)return Math.max(-1,val/32767);if(t===5123)return val/65535;return val;}
  async function parse(bytes,THREE){
    const arr=bytes instanceof ArrayBuffer?bytes:await bytes.arrayBuffer();
    const d=new DataView(arr);if(d.getUint32(0,true)!==0x46546c67)throw Error('不是有效的 GLB 二进制模型');
    if(d.getUint32(4,true)!==2)throw Error('仅支持 glTF 2.0');
    if(d.getUint32(8,true)>arr.byteLength)throw Error('GLB 长度有误');
    let json=null,bin=null;
    for(let p=12;p+8<=arr.byteLength;){const n=d.getUint32(p,true),type=d.getUint32(p+4,true);p+=8;
      if(p+n>arr.byteLength)throw Error('GLB 数据块损坏');
      if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(arr,p,n)));
      if(type===0x004e4942)bin=arr.slice(p,p+n);p+=n;
    }
    if(!json||!bin)throw Error('GLB 缺少 JSON 或二进制几何块');
    if(json.extensionsRequired?.length)throw Error('模型使用了本离线查看器暂不支持的扩展：'+json.extensionsRequired.join(', '));
    const views=json.bufferViews||[],accessors=json.accessors||[];
    const readAccessor=(idx)=>{
      const a=accessors[idx];if(!a)throw Error('找不到数据索引 '+idx);
      const N=typeComps[a.type],Cls=ctor[a.componentType],size=bsz[a.componentType];
      if(!Cls||!N)throw Error('未识别的数据类型 '+a.componentType);
      let out=new Cls(a.count*N);
      if(a.bufferView!==undefined){const bv=views[a.bufferView];if(bv.buffer!==0)throw Error('不支持外部 buffer');
        const start=(bv.byteOffset||0)+(a.byteOffset||0);const stride=bv.byteStride||N*size;
        const dv=new DataView(bin);
        for(let i=0;i<a.count;i++)for(let j=0;j<N;j++)out[i*N+j]=getComponent(dv,start+i*stride+j*size,a.componentType);
      }
      if(a.sparse){const sp=a.sparse;const iv=views[sp.indices.bufferView],vv=views[sp.values.bufferView];
        const idv=new DataView(bin),vdv=new DataView(bin);const isz=bsz[sp.indices.componentType];
        for(let i=0;i<sp.count;i++){
          const entry=getComponent(idv,(iv.byteOffset||0)+(sp.indices.byteOffset||0)+i*isz,sp.indices.componentType);
          for(let j=0;j<N;j++)out[entry*N+j]=getComponent(vdv,(vv.byteOffset||0)+(sp.values.byteOffset||0)+(i*N+j)*size,a.componentType);
        }
      }
      if(a.normalized && a.componentType!==5126){const normalized=new Float32Array(out.length);for(let i=0;i<out.length;i++)normalized[i]=norm(out[i],a.componentType);out=normalized;}
      return {data:out,comps:N,count:a.count,type:a.type};
    };
    const textureCache={},objectUrls=[];
    async function texRef(info){if(!info)return null;const idx=info.index;if(textureCache[idx])return textureCache[idx];
      const t=json.textures?.[idx],im=json.images?.[t?.source];if(!im)return null;
      let blob;if(im.bufferView!==undefined){const v=views[im.bufferView];blob=new Blob([bin.slice(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)],{type:im.mimeType||'image/png'});}else throw Error('模型含外链图片，离线无法加载');
      const url=URL.createObjectURL(blob);objectUrls.push(url);const texture=await new Promise((resolve,reject)=>new THREE.TextureLoader().load(url,resolve,undefined,reject));
      texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;const sam=json.samplers?.[t.sampler];
      if(sam){const table={33071:THREE.ClampToEdgeWrapping,33648:THREE.MirroredRepeatWrapping,10497:THREE.RepeatWrapping};texture.wrapS=table[sam.wrapS]||THREE.RepeatWrapping;texture.wrapT=table[sam.wrapT]||THREE.RepeatWrapping;}
      textureCache[idx]=texture;return texture;
    }
    const materials=[];
    for(const m of (json.materials||[])){
      const pbr=m.pbrMetallicRoughness||{},col=pbr.baseColorFactor||[1,1,1,1];
      const mat=new THREE.MeshStandardMaterial({name:m.name||'材料',color:new THREE.Color(col[0],col[1],col[2]),metalness:pbr.metallicFactor??0,roughness:pbr.roughnessFactor??1,
        side:m.doubleSided?THREE.DoubleSide:THREE.FrontSide,transparent:m.alphaMode==='BLEND'||col[3]<0.999,opacity:col[3]});
      if(pbr.baseColorTexture)mat.map=await texRef(pbr.baseColorTexture);
      if(m.emissiveFactor)mat.emissive=new THREE.Color(...m.emissiveFactor);
      if(m.alphaMode==='MASK'){mat.alphaTest=m.alphaCutoff??0.5;mat.transparent=false;}
      if(m.normalTexture){const t=await texRef(m.normalTexture);if(t){t.colorSpace=THREE.NoColorSpace;mat.normalMap=t;}}
      materials.push(mat);
    }
    const geomCache=new Map();
    function primitiveGeom(primitive){if(geomCache.has(primitive))return geomCache.get(primitive);
      if(primitive.extensions)throw Error('不支持压缩或扩展几何，请导出普通 GLB');
      const g=new THREE.BufferGeometry();
      for(const [a,key] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv'],['COLOR_0','color'],['TANGENT','tangent']]){
        if(primitive.attributes[a]===undefined)continue;const x=readAccessor(primitive.attributes[a]);
        g.setAttribute(key,new THREE.BufferAttribute(x.data,x.comps));
      }
      if(primitive.indices!==undefined)g.setIndex(new THREE.BufferAttribute(readAccessor(primitive.indices).data,1));
      const targets=primitive.targets||[];for(const tgt of targets){
        for(const [p,which] of [['POSITION','position'],['NORMAL','normal']]){
          if(tgt[p]===undefined)continue;const ac=readAccessor(tgt[p]);
          if(!g.morphAttributes[which])g.morphAttributes[which]=[];
          g.morphAttributes[which].push(new THREE.BufferAttribute(ac.data,ac.comps));
        }
      }
      g.morphTargetsRelative=true;
      if(!g.attributes.normal)g.computeVertexNormals();
      geomCache.set(primitive,g);return g;
    }
    const nodes=(json.nodes||[]).map((n,i)=>{
      const o=new THREE.Group();o.name=n.name||'node_'+i;o.userData={gltfIndex:i,originName:o.name};
      if(n.matrix){const mat=new THREE.Matrix4().fromArray(n.matrix);mat.decompose(o.position,o.quaternion,o.scale);}
      else {if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}
      if(n.mesh!==undefined){const mesh=json.meshes[n.mesh];for(let k=0;k<mesh.primitives.length;k++){
        const pri=mesh.primitives[k],g=primitiveGeom(pri),mat=materials[pri.material]||new THREE.MeshStandardMaterial({color:0xbfc8c1});
        let obj=new THREE.Mesh(g,mat);obj.name=mesh.name?mesh.name+(mesh.primitives.length>1?' #'+(k+1):''):o.name;
        obj.userData.originName=o.name;obj.userData.gltfIndex=i;
        if(g.morphAttributes.position?.length){obj.updateMorphTargets();const weights=n.weights||mesh.weights||[];
          for(let q=0;q<obj.morphTargetInfluences.length;q++)obj.morphTargetInfluences[q]=weights[q]||0;
        }
        obj.castShadow=true;obj.receiveShadow=true;
        if(pri.mode===1){obj=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x9da8a3}));}
        o.add(obj);
      }}
      return o;
    });
    (json.nodes||[]).forEach((n,i)=>(n.children||[]).forEach(c=>nodes[i].add(nodes[c])));
    const top=new THREE.Group();top.name='DZ47_V51_GLTF';
    const scene=json.scenes?.[json.scene??0];if(!scene)throw Error('GLB 没有可显示的场景');
    scene.nodes?.forEach(i=>top.add(nodes[i]));
    const rawAnims=(json.animations||[]).map(anim=>{
      let duration=0,tracks=[];
      for(const c of anim.channels){const sampler=anim.samplers[c.sampler];if(!sampler)continue;
        const t=readAccessor(sampler.input),v=readAccessor(sampler.output);duration=Math.max(duration,t.data[t.data.length-1]||0);
        tracks.push({node:nodes[c.target.node],path:c.target.path,times:t.data,values:v.data,interp:sampler.interpolation||'LINEAR',
          components:c.target.path==='weights' ? v.data.length/(t.data.length*(sampler.interpolation==='CUBICSPLINE'?3:1)) : c.target.path==='rotation'?4:3});
      }return {name:anim.name||'机械动作',duration,tracks};
    });
    return {root:top,nodes,clips:rawAnims,json,revoke:()=>objectUrls.forEach(URL.revokeObjectURL)};
  }
  function apply(clip,t,THREE){if(!clip)return;
    for(const tr of clip.tracks){const times=tr.times,val=tr.values,n=tr.components;if(!times.length)continue;
      let hi=times.length-1;if(t<=times[0])hi=0;else if(t>=times[hi]){}else{
        let lo=0;while(lo+1<hi){const mid=(lo+hi)>>1;if(times[mid]<=t)lo=mid;else hi=mid;}
      }
      const i=hi===0?0:hi===times.length-1 && t>=times[hi]?hi:Math.max(0,hi-1);
      const j=Math.min(times.length-1,i+1),a=times[i],b=times[j],f=i===j?0:Math.max(0,Math.min(1,(t-a)/(b-a)));
      const mode=tr.interp, stride=n*(mode==='CUBICSPLINE'?3:1);
      const off=mode==='CUBICSPLINE'?n:0,baseI=i*stride+off,baseJ=j*stride+off;
      const tmp=new Float32Array(n);
      for(let q=0;q<n;q++){
        let v0=val[baseI+q],v1=val[baseJ+q];
        if(mode==='STEP'||i===j)tmp[q]=v0;
        else if(mode==='CUBICSPLINE'){
          const dt=b-a,t2=f*f,t3=t2*f;
          const outTan=val[i*stride+2*n+q]*dt,inTan=val[j*stride+q]*dt;
          tmp[q]=(2*t3-3*t2+1)*v0+(t3-2*t2+f)*outTan+(-2*t3+3*t2)*v1+(t3-t2)*inTan;
        }else tmp[q]=v0+(v1-v0)*f;
      }
      const node=tr.node;
      if(tr.path==='translation')node.position.set(tmp[0],tmp[1],tmp[2]);
      if(tr.path==='scale')node.scale.set(tmp[0],tmp[1],tmp[2]);
      if(tr.path==='rotation'){
        const quat=new THREE.Quaternion(val[baseI],val[baseI+1],val[baseI+2],val[baseI+3]);
        if(i!==j && mode!=='STEP'){
          const q2=new THREE.Quaternion(val[baseJ],val[baseJ+1],val[baseJ+2],val[baseJ+3]);quat.slerp(q2,f);
        }
        node.quaternion.copy(quat).normalize();
      }
      if(tr.path==='weights')node.traverse(o=>{
        if(o.isMesh && o.morphTargetInfluences)for(let k=0;k<Math.min(n,o.morphTargetInfluences.length);k++)o.morphTargetInfluences[k]=tmp[k];
      });
    }
  }
  return {parse,apply};
})();
