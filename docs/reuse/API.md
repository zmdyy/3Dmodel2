# LabKit API

3D组件先加载 `shared/vendor/three-r160.min.js`，再按注册表依赖顺序加载。只有一个Three.js实例和宿主rAF。所有接口位于 `window.LabKit`。

## camera-navigation

`createNavigation({element,pose,apply,fov,minDistance,maxDistance,onManual,onChange})`，姿态为 `{target:[x,y,z],dist,yaw,pitch}`，位置用场景单位、角度rad、竖直fov用度并与相机一致。
返回 `pose`副本、`automatic`、`setPose(p)`、`follow(p,{jump})`、`update(dtSeconds)`、`stop()`、`dispose()`。

```js
const nav=LabKit.createNavigation({element:canvas,
 pose:{target:[0,.3,0],dist:1.4,yaw:.4,pitch:.2},fov:camera.fov,
 apply(p,eye){camera.position.set(...eye);camera.lookAt(...p.target);},
 onManual(){auto=false;}});
// 宿主已有rAF：if(auto)nav.follow(goal);nav.update(dtSeconds);
```

`fitPose({target,size:[w,h,d],yaw,pitch,fov,aspect,fill})`按8角点拟合透视取景。`sampleShots([{at,pose},...],progress,state)`按0–1递增机位插值，pose可为接受state的函数。`lerpPose`用最近角度、对数距离插值。手动后宿主停止逐帧follow，明确恢复才重启。

## svg-scale

`svg.linearScale({min,max,step,majorEvery,unit,value,width,height,x,top,bottom,fontSize})`返回完整SVG。默认0–10 N，小格.2 N，每5格主刻度，360×1860，刻度向下增长；`value:null`不显示指针。仅直线刻度，不可直接冒充温度计或圆表盘。
`svg.label(text,{width,height,fontSize})`生成经过XML转义的文字SVG。`svg.texture(THREE,markup,{renderer})`返回 `{texture,ready}`；截图前await ready，源稿保存在texture.userData.svgSource。正式读数放大直接显示SVG；CJK字体依赖系统回退。

## glass-beaker

`createGlassLab(THREE,{renderer,scene})`设置玻璃案例的背景、雾、曝光、色彩空间、阴影和灯光，返回 `{lights,dispose}`。它拥有场景设置，释放时还原；同场景不叠加多个预设。
`createBeaker(THREE,{radius,height,wall,level})`返回 `group,parts,anchors,bounds,level,setLevel,dispose`。原点外底中心、Y向上、单位m；level为内底以上水深，液面局部高度wall+level，范围0到height−2wall。

```js
const light=LabKit.createGlassLab(THREE,{renderer,scene});
const cup=LabKit.createBeaker(THREE,{radius:.055,height:.14,wall:.0018,level:.1});
scene.add(cup.group);cup.setLevel(.11);
```

这是基本圆柱教学容器，没有量筒校准、杯嘴、溢水口或精确折射。套杯另验。`disposeObject(object)`只用于私有几何/材质/贴图的对象树，避免误释放共享资产。

## adjustable-stand

`createStand(THREE,{height=.62,armLength=.20,clampHeight=.53})`返回 `group,parts.arm,bounds,clampHeight,setClampHeight(y),getMountAnchor(),dispose()`。单位m，夹持高度.04到杆高；挂点随横臂移动。基础教学结构，不是厂商夹具详图。

## spring-meter-10n

`createSpringMeter(THREE,{renderer})`返回 `group,parts,range,ready,anchors.upperAttachment,getHookAnchor(),force,setForce(N),setCutaway(bool),getReadoutSVG(),getReadoutDetail(),dispose()`。
保留原10 N测力计的上环一体横杆、弹簧、冲压长片、指示片、穿钩孔和S钩。135 mm/10 N行程，内部毫米几何转换为公共m；不能重复缩放。setForce拒绝非有限或超0–10 N输入。物理公式由场景计算。

```js
const stand=LabKit.createStand(THREE),meter=LabKit.createSpringMeter(THREE,{renderer});
scene.add(stand.group,meter.group);await meter.ready;meter.setForce(2.4);
const a=stand.getMountAnchor(),b=meter.anchors.upperAttachment;
meter.group.position.set(...a.map((v,i)=>v-b[i]));
```

上例假设同父组且未额外旋转缩放。不同父组需统一坐标。`getReadoutDetail()`返回 `{svg,viewBox,focus,readout,subtitle}`；仪器决定关注区，窗口不硬编码刻度位置。

## classroom-typography

加载typography.css，根元素加`.lab-kit`。屏幕基线：标题24px、分区20px、正文/按钮18px、辅助16px、读数36px、按钮至少44px。SVG内部字号不等于屏幕字号，另验viewBox缩放与字体回退。

## detail-view

加载detail-view.css与.js。`createDetailView({host,compactHost,title,subtitle,width=300,top=86,right=24,minZoom=1,maxZoom=3,onVisibilityChange})`，host应为有明确大小的relative容器，compactHost位于主画面之外。
返回 `element,viewport,visible,zoom,compact,setSVG(markup,{viewBox,focus}),setContent(node,{update,dispose}),setReadout(text),setSubtitle(text),setZoom(v),show(),hide(),toggle(),reset(),dispose()`。

```js
const panel=LabKit.createDetailView({host:stage,compactHost:belowStage,title:'测力计读数'});
const r=meter.getReadoutDetail();
panel.setSVG(r.svg,{viewBox:r.viewBox,focus:r.focus});panel.setReadout(r.readout);
```

更新内容保留用户倍率，围绕focus缩放并限制在关注区内，reset恢复默认倍率和停靠。host宽<620px移入compactHost。倍率相对局部关注区，不是相对主模型的绝对倍率。
SVG必须是可信应用生成内容，组件不是任意上传SVG的清洗器。3D/Canvas通过setContent接入，update接受 `{zoom,visible,viewport}`；宿主负责相机、绘制和唯一rAF。切换内容或销毁时调用清理函数。

## cylinder-linked-lens

加载instrument-details.js一次。`cylinderWithLens({value=39,after=true,object={id:'aluminum',volume:8}})`返回量筒、定位连线和圆形放大镜SVG。value为5–50 mL，after翻转左右，object可为stone/aluminum/iron，null隐藏物体。
固定50 mL/1 mL类型，原图与镜内液面/刻度同源，保留相邻主刻度数字；图示不是排液物理计算器。

## instrument-face-detail

同一instrument-details.js提供 `springReadoutDetail({force,max=10,step=.2,majorEvery=5})`，返回 `{svg,viewBox,focus,readout,subtitle}`。
`cropInstrumentSVG(detail)`从同一完整SVG裁矩形局部，保留仪器样貌。红指针限于中央槽，与黑刻度留白1.25个源单位。该2D类型外观不代表所有3D测力计零件完全一致。

```js
const r=LabKit.springReadoutDetail({force:.6});zoom.innerHTML=LabKit.cropInstrumentSVG(r);
// 也可以接入同一个可缩放读数窗
panel.setSVG(r.svg,{viewBox:r.viewBox,focus:r.focus});
```
