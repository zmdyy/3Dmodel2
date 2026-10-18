"""Attach portable PBR colors to the Blender geometry export, sharing binary buffers."""
import copy,json,struct,sys
from pathlib import Path
FINISH={
'Satin machined aluminium':([.58,.64,.67],.78,.43),'Brushed stainless steel':([.32,.38,.41],.83,.39),
'Blue grey powder coated frame':([.075,.14,.205],.28,.67),'Grey enamel cheeks':([.28,.35,.39],.45,.58),
'Oil bronze bush':([.38,.25,.115],.7,.48),'Dark rubber':([.035,.047,.05],0,.86),
'Woven natural cord':([.14,.09,.040],0,.92),'Cord plies':([.24,.16,.075],0,.94),
'Fluorescent rotation witness':([.75,.88,.025],0,.68),'Oxidised steel masses':([.15,.19,.215],.7,.59),
'Engraved dark lettering':([.025,.04,.055],0,.8),'Instrument plate':([.84,.86,.77],.12,.7),
'Warm worn laboratory board':([.48,.31,.17],0,.82)}
def prepare(path):
 raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];data=json.loads(raw[20:20+n]);binary_chunks=raw[20+n:]
 data['materials']=[{'name':k,'pbrMetallicRoughness':{'baseColorFactor':[*rgb,1],'metallicFactor':m,'roughnessFactor':r}} for k,(rgb,m,r) in FINISH.items()]
 ids={k:i for i,k in enumerate(FINISH)};old=data['meshes'];meshes=[];lookup={}
 for node in data['nodes']:
  if 'mesh' not in node:continue
  material=ids.get(node.get('extras',{}).get('materialKey'),1);key=(node['mesh'],material)
  if key not in lookup:
   mesh=copy.deepcopy(old[node['mesh']]);mesh['name']=mesh.get('name','part')+' | '+data['materials'][material]['name']
   for p in mesh['primitives']:p['material']=material
   lookup[key]=len(meshes);meshes.append(mesh)
  node['mesh']=lookup[key]
 data['meshes']=meshes;data['asset']['extras']={'source':'Pulley_Laboratory_Precision_Local_V1.blend','geometry':'evaluated native Blender meshes','browserMaterialFinish':'shared/pulley-precision.js'}
 chunk=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode();chunk+=b' '*((-len(chunk))%4)
 out=struct.pack('<4sII',b'glTF',2,20+len(chunk)+len(binary_chunks))+struct.pack('<I4s',len(chunk),b'JSON')+chunk+binary_chunks
 path.write_bytes(out);print(path,len(out),'bytes',len(meshes),'material variants')
if __name__=='__main__':prepare(Path(sys.argv[1]))
