import bpy, os, gzip, hashlib, struct, json
from mathutils import Vector
original_scene=bpy.context.window.scene
configs=[('01 | FIXED PULLEY','fixed'),('02 | MOVING PULLEY','moving'),('03 | TACKLE n2','tackle2'),('04 | TACKLE n3','tackle3'),('05 | TACKLE n4','tackle4')]
standprefix=('Solid hardwood','Cast support foot','Recessed mounting','Rubber isolation','Ground stainless','Upright base','Base locking','Thumb knob','Load bearing top','Crossbar clamp','Clamp screw','Maker plate','Maker engraving')
temp=bpy.data.scenes.new('WEB_EXPORT_TEMP')
items=[];cache={};summary={}
for scenename,key in configs:
 sc=bpy.data.scenes[scenename];bpy.context.window.scene=sc
 deps=bpy.context.evaluated_depsgraph_get();sc.view_layers[0].update()
 count=0
 for o in sc.objects:
  name=o.name
  if o.type not in {'MESH','CURVE','FONT'}:continue
  if name.startswith(('Seamless studio','ONE CONTINUOUS ROPE','Twisted rope ply','Cord end whipping')):continue
  ancestors=[];a=o
  while a:ancestors.append(a);a=a.parent
  wheel=next((a for a in ancestors if 'axle carrier' in a.name),None)
  role='fixed';wk='';rot=False
  if name.startswith(standprefix):role='stand'
  elif wheel:
   wk=wheel.name.split(' | ')[0];role='wheel';rot=any('ROTATING SHEAVE' in a.name for a in ancestors)
  elif any(a.name.startswith('PAYLOAD') for a in ancestors):role='payload'
  elif name.startswith(('Free end pull','Pull handle','Rubber covered pull','Upward pull')):role='grip'
  elif name.startswith(('Load hook |','Moving frame |')):role='moving'
  elif name.startswith('Common two wheel'):role='moving' if o.location.z<.6 else 'fixed'
  elif name.startswith(('Rope dead end','Dead end rope','Eye splice')):role='moving' if key=='tackle3' else 'fixed'
  ev=o.evaluated_get(deps);me=bpy.data.meshes.new_from_object(ev,depsgraph=deps)
  if not me or not len(me.polygons):
   if me:bpy.data.meshes.remove(me)
   continue
  # Identical evaluated meshes share a GPU buffer across configurations.
  h=hashlib.sha256()
  for v in me.vertices:h.update(struct.pack('<3f',*v.co))
  for p in me.polygons:h.update(struct.pack('<I?',len(p.vertices),p.use_smooth));h.update(struct.pack('<%dI'%len(p.vertices),*p.vertices))
  digest=h.hexdigest()
  if digest in cache:bpy.data.meshes.remove(me);me=cache[digest]
  else:cache[digest]=me
  dup=bpy.data.objects.new(key+'__'+name,me);temp.collection.objects.link(dup);dup.matrix_world=o.matrix_world.copy()
  dup['config']=key;dup['role']=role;dup['wheelKey']=wk;dup['rotating']=rot;dup['sourceName']=name
  dup['materialKey']=o.data.materials[0].name.split('.')[0] if o.data.materials else 'Brushed stainless steel'
  dup['part']='sheave' if rot else 'bush' if 'sleeve' in name else 'cheek' if ('cheek' in name.lower() or 'carrier' in name.lower() or 'spacer' in name.lower()) else 'axle' if role=='wheel' else 'stand' if role=='stand' else 'load' if role=='payload' or name.startswith('Load hook') else 'grip' if role=='grip' else 'anchor' if ('Dead end' in name or 'splice' in name) else 'cheek'
  items.append(dup);count+=1
 summary[key]=count
bpy.context.window.scene=temp
outdir=os.path.join(os.path.expanduser('~'),'Documents','Pulley_Web_Export')
os.makedirs(outdir,exist_ok=True)
target=os.path.join(outdir,'pulley-precision-v1.glb')
bpy.ops.export_scene.gltf(filepath=target,export_format='GLB',use_active_scene=True,export_materials='NONE',export_cameras=False,export_lights=False,export_extras=True,export_animations=False,export_apply=False)
raw=open(target,'rb').read();comp=gzip.compress(raw,compresslevel=9)
open(target+'.gz','wb').write(comp)
for o in list(temp.objects):bpy.data.objects.remove(o,do_unlink=True)
bpy.context.window.scene=original_scene;bpy.data.scenes.remove(temp)
print('WEB_EXPORT',json.dumps({'path':target,'glbBytes':len(raw),'gzipBytes':len(comp),'uniqueMeshes':len(cache),'configurations':summary}))

