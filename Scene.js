var gl;				// WebGL上下文
var program; 		// shader program

var mvStack = [];  // 模视投影矩阵栈，用数组实现，初始为空
var matCamera = mat4();	 // 照相机变换，初始为恒等矩阵
var matReverse = mat4(); // 照相机变换的逆变换，初始为恒等矩阵

var isGameRun = true;	// 游戏运行状态

var devX = 0;	//鼠标X轴
var devY = 0;	//鼠标Y轴

var sizeGround = 20;	//地图大小

var speed = 0.1;	//相机移动速度

var backgroundColor = vec3(0.5,0.5,0.5);	//背景颜色

var cameraFirstDis = 0.0;	//第一人称摄像机距离
var cameraThirdDis = 1.5;	//第三人称摄像机距离
var cameraDis = cameraThirdDis;		//当前摄像机距离
var isThirdperson = true;	//当前是否为第三人称视角

var textureLoaded = 0;	//贴图读取数量
var numTextures = 6;	//贴图总数

var programObj;							//obj模型 shader program
var attribIndex = new AttribIndex();	//obj中attribute变量索引
var mtlIndex = new MTLIndex();			//obj中材质变量索引

var programLine;						//轮廓线shader program

var lineWidth = 0.005;				//轮廓线宽度
var lineColor = vec3(0.0,0.0,0.0);	//轮廓线颜色

var fogFlag = true;						//是否开启雾化
var toonShaderFlag = true;				//是否开启卡通渲染

var isDrawWall = [false, false, false, false];

var yRot = 0.0;        		//用于动画的旋转角
var deltaAngle = 60.0; 		//每秒旋转角度

// 用于保存W、S、A、D四个方向键的按键状态的数组
var keyDown = [false, false, false, false];

var g = 9.8;				// 重力加速度
var initSpeed = 4; 			// 初始速度 
var jumping = false;	    // 是否处于跳跃过程中
var jumpY = 0;          	// 当前跳跃的高度
var jumpTime = 0;			// 从跳跃开始经历的时间

var showText = [false,false,false,false];	//提示菜单开启状态
var npcDialogFlag = false;					//NPC对话框开启状态

//HUD
var ctx;
var hudOn=true;

var showMap=true;	//小地图

var NUM=0;			//雾化值
var SUM=3;
var time=100;
var Menu=true;		//提示

//输入密码相关
var key = vec3(-1,-1,-1);
var isTypingPassword = false;
var isPassowrdRight = false;

//材质对象
var MaterialObj = function(){
	this.ambient = vec3(0.0,0.0,0.0);
	this.diffuse = vec3(0.8,0.8,0.8);
	this.specular = vec3(0.0,0.0,0.0);
	this.emission = vec3(0.0,0.0,0.0);
	this.shininess = 10;
	this.alpha = 1.0
}

//纹理对象
var TextureObj = function(pathName, format, mipmapping){
	this.path = pathName;
	this.format = format;
	this.mipmapping = mipmapping;
	this.texture = null;
	this.complete = false;
}

//创建纹理对象
function initTexture(texObj, image){
	texObj.texture = gl.createTexture();
	if(!texObj.texture){
		console.log("创建纹理对象失败");
		return false;
	}

	gl.bindTexture(gl.TEXTURE_2D, texObj.texture);
	gl.pixelStorei(gl.UNPACK_FLIP_T_WEBGL, 1);
	gl.texImage2D(gl.TEXTURE_2D,0,texObj.format,texObj.format,gl.UNSIGNED_BYTE, image);
	
	if(texObj.mipmapping){
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
	}
	else{
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
	}

	texObj.complete = true;
}

//读入纹理
function loadTexture(path, format ,mipmapping){
	var texObj = new TextureObj(path, format, mipmapping);
	var image = new Image();
	if(!image){
		console.log("创建image失败");
		return false;
	}

	image.onload = function(){
		console.log("纹理图"+path+"加载完成");
		initTexture(texObj, image);
		textureLoaded++;
		if(textureLoaded==numTextures) requestAnimFrame(render);
	};

	image.src = path;
	console.log("开始加载纹理图"+path);

	return texObj;
}

//Obj对象
var Obj = function(){
	this.numVertices = 0; 		// 顶点个数
	this.vertices = new Array(0);
	this.normals = new Array(0);
	this.texcoords = new Array(0);
	this.vertexBuffer = null;	// 存放顶点数据的buffer对象
	this.normalBuffer = null;	// 存放法线数据的buffer对象
	this.texBuffer = null;
	this.material = new MaterialObj();
	this.texObj = null;
}

//初始化缓冲区对象(VBO)
Obj.prototype.initBuffers = function(){
	/*创建并初始化顶点坐标缓冲区对象(Buffer Object)*/
	// 创建缓冲区对象，存于成员变量vertexBuffer中
	this.vertexBuffer = gl.createBuffer(); 
	// 将vertexBuffer绑定为当前Array Buffer对象
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	// 为Buffer对象在GPU端申请空间，并提供数据
	gl.bufferData(gl.ARRAY_BUFFER,	// Buffer类型
		flatten(this.vertices),		// 数据来源
		gl.STATIC_DRAW	// 表明是一次提供数据，多遍绘制
		);
	// 顶点数据已传至GPU端，可释放内存
	this.vertices.length = 0; 

	this.normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,flatten(this.normals),gl.STATIC_DRAW);
	this.normals.length = 0;

	if(this.texcoords.length != 0){
		this.texBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER,this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER,flatten(this.texcoords),gl.STATIC_DRAW);
		this.texcoords.length = 0;
	}
}

//绘制Obj对象
Obj.prototype.draw = function(matMV, material, temTexObj){
	// 设置为a_Position提供数据的方式
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	// 为顶点属性数组提供数据(数据存放在vertexBuffer对象中)
	gl.vertexAttribPointer(program.a_Position,3,gl.FLOAT,false,0,0);
	// 为a_Position启用顶点数组
	gl.enableVertexAttribArray(program.a_Position);	

	gl.bindBuffer(gl.ARRAY_BUFFER,this.normalBuffer);
	gl.vertexAttribPointer(program.a_Normal,3,gl.FLOAT,false,0,0);
	gl.enableVertexAttribArray(program.a_Normal);	
	
	if(this.texBuffer!=null){
		gl.bindBuffer(gl.ARRAY_BUFFER,this.texBuffer);
		gl.vertexAttribPointer(program.a_Texcoord,2,gl.FLOAT,false,0,0);
		gl.enableVertexAttribArray(program.a_Texcoord);	
	}

	var mtl;
	if(arguments.length>1&&arguments[1]!=null) mtl = material;
	else mtl = this.material;

	var texObj;
	if(arguments.length>2&&arguments[2]!=null) texObj = temTexObj;
	else texObj=this.texObj;

	if(texObj != null && texObj.complete){
		gl.bindTexture(gl.TEXTURE_2D,texObj.texture);
	}

	var ambientProducts = [];
	var diffuseProducts = [];
	var specularProducts = [];
	for(var i = 0;i<lights.length;i++){
		ambientProducts.push(mult(lights[i].ambient,mtl.ambient));
		diffuseProducts.push(mult(lights[i].diffuse,mtl.diffuse));
		specularProducts.push(mult(lights[i].specular,mtl.specular));
	}
	gl.uniform3fv(program.u_AmbientProduct, flatten(ambientProducts));
	gl.uniform3fv(program.u_DiffuseProduct, flatten(diffuseProducts));
	gl.uniform3fv(program.u_SpecularProduct, flatten(specularProducts));
	gl.uniform3fv(program.u_Emission,flatten(mtl.emission));
	gl.uniform1f(program.u_Shininess,mtl.shininess);
	gl.uniform1f(program.u_Alpha,mtl.alpha);

	gl.uniformMatrix4fv(program.u_ModelView, false, flatten(matMV));
	gl.uniformMatrix3fv(program.u_NormalMat,false,flatten(normalMatrix(matMV)));
	gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
}

//绘制Obj对象轮廓线
Obj.prototype.drawLine = function(matMV){
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.FRONT);	//剔除正面

	gl.useProgram(programLine);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.vertexAttribPointer(programLine.a_Position,3,gl.FLOAT,false,0,0);
	gl.enableVertexAttribArray(programLine.a_Position);	

	gl.bindBuffer(gl.ARRAY_BUFFER,this.normalBuffer);
	gl.vertexAttribPointer(programLine.a_Normal,3,gl.FLOAT,false,0,0);
	gl.enableVertexAttribArray(programLine.a_Normal);	

	gl.uniformMatrix4fv(programLine.u_ModelView, false, flatten(matMV));
	gl.uniformMatrix3fv(programLine.u_NormalMat,false,flatten(normalMatrix(matMV)));
	gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);

	gl.useProgram(program);

	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);	//换回默认的剔除背面
}

//绘制Obj模型的轮廓线
function drawLine(obj, matMV){
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.FRONT);	//剔除正面

	gl.useProgram(programLine);

	for(var i = 0; i < obj.groups.length; i++){
		var group = obj.groups[i];

		gl.bindBuffer(gl.ARRAY_BUFFER, group.vBuffer);
		gl.vertexAttribPointer(programLine.a_Position,3,gl.FLOAT,false,0,0);
		gl.enableVertexAttribArray(programLine.a_Position);	

		gl.bindBuffer(gl.ARRAY_BUFFER, group.nBuffer);
		gl.vertexAttribPointer(programLine.a_Normal,3,gl.FLOAT,false,0,0);
		gl.enableVertexAttribArray(programLine.a_Normal);	

		gl.uniformMatrix4fv(programLine.u_ModelView, false, flatten(matMV));
		gl.uniformMatrix3fv(programLine.u_NormalMat,false,flatten(normalMatrix(matMV)));
		gl.drawArrays(gl.TRIANGLES, 0, group.numVertices);
	}

	gl.useProgram(programObj);

	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);	//换回默认的剔除背面
}

//光源对象
var Light = function(){
	this.pos = vec4(1.0,1.0,1.0,0.0);
	this.ambient = vec3(0.2,0.2,0.2);
	this.diffuse = vec3(1.0,1.0,1.0);
	this.specular = vec3(1.0,1.0,1.0);
	this.on = true;
}

var lights = [];
var lightSun = new Light();
var lightRed = new Light();
var lightYellow = new Light();

//初始化光源
function initLights(){
	lights.push(lightSun);
	lightRed.pos = vec4(0.0,1.0,0.0,1.0);
	lightRed.ambient = vec3(0.2,0.0,0.0);
	lightRed.diffuse = vec3(1.0,0.0,0.0);
	lightRed.specular = vec3(1.0,0.0,0.0);
	lightRed.on = false;
	lights.push(lightRed);
	lightYellow.pos = vec4(0.0,0.0,0.0,1.0);
	lightYellow.ambient = vec3(0.0,0.0,0.0);
	lightYellow.diffuse= vec3(1.0,1.0,0.0);
	lightYellow.specular = vec3(1.0,1.0,0.0);
	lightYellow.on = false;
	lights.push(lightYellow);
	
	gl.useProgram(programObj);
	var ambientLight = [];
	ambientLight.push(lightSun.ambient);
	ambientLight.push(lightRed.ambient);
	ambientLight.push(lightYellow.ambient);
	gl.uniform3fv(programObj.u_AmbientLight,flatten(ambientLight));
	var diffuseLight = [];
	diffuseLight.push(lightSun.diffuse);
	diffuseLight.push(lightRed.diffuse);
	diffuseLight.push(lightYellow.diffuse);
	gl.uniform3fv(programObj.u_DiffuseLight,flatten(diffuseLight));
	var specularLight = [];
	specularLight.push(lightSun.specular);
	specularLight.push(lightRed.specular);
	specularLight.push(lightYellow.specular);
	gl.uniform3fv(programObj.u_SpecularLight,flatten(specularLight));
	gl.uniform3fv(programObj.u_SpotDirection,flatten(vec3(0.0,0.0,-1.0)));
	gl.uniform1f(programObj.u_SpotCutOff, 8);
	gl.uniform1f(programObj.u_SpotExponent, 3);

	gl.useProgram(program);
	gl.uniform3fv(program.u_SpotDirection,flatten(vec3(0.0,0.0,-1.0)));
	gl.uniform1f(program.u_SpotCutOff, 8);
	gl.uniform1f(program.u_SpotExponent, 3);

	passLightsOn();
}

//更新光源状态
function passLightsOn(){
	var lightsOn = [];
	for(var i = 0;i<lights.length;i++){
		if(lights[i].on) lightsOn[i] = 1;
		else lightsOn[i] = 0;
	}

	gl.useProgram(program);
	gl.uniform1iv(program.u_LightOn, lightsOn);
	gl.useProgram(programObj);
	gl.uniform1iv(programObj.u_LightOn, lightsOn);
}

// 在y=0平面绘制中心在原点的格状方形地面
// fExtent：决定地面区域大小(方形地面边长的一半)
// fStep：决定线之间的间隔
// 返回地面Obj对象
function buildGround(fExtent, fStep){	
	var obj = new Obj(); // 新建一个Obj对象

	var iterations = 2 * fExtent / fStep;
	var fTexcoordStep = 40 / iterations;
	for(var x = -fExtent, s = 0;x < fExtent; x+=fStep,s+=fTexcoordStep){
		for(var z = fExtent, t = 0; z>-fExtent;z-=fStep,t+=fTexcoordStep){
			obj.texcoords.push(vec2(s, t + fTexcoordStep));
			obj.texcoords.push(vec2(s, t));
			obj.texcoords.push(vec2(s + fTexcoordStep, t));
			obj.texcoords.push(vec2(s, t + fTexcoordStep));
			obj.texcoords.push(vec2(s + fTexcoordStep, t));
			obj.texcoords.push(vec2(s + fTexcoordStep, t + fTexcoordStep));

			obj.numVertices += 6;
		}
	}

	for(var x = -fExtent; x < fExtent; x += fStep){
		for(var z = fExtent; z > -fExtent; z -= fStep){
			// 以(x, 0, z)为左下角的单元四边形的4个顶点
			var ptLowerLeft = vec3(x, 0, z);
			var ptLowerRight = vec3(x + fStep, 0, z);
			var ptUpperLeft = vec3(x, 0, z - fStep);
			var ptUpperRight = vec3(x + fStep, 0, z - fStep);
			
			// 分成2个三角形
			obj.vertices.push(ptUpperLeft);    
			obj.vertices.push(ptLowerLeft);
			obj.vertices.push(ptLowerRight);
			obj.vertices.push(ptUpperLeft);
			obj.vertices.push(ptLowerRight);
			obj.vertices.push(ptUpperRight);

			obj.normals.push(vec3(0,1,0));
			obj.normals.push(vec3(0,1,0));
			obj.normals.push(vec3(0,1,0));
			obj.normals.push(vec3(0,1,0));
			obj.normals.push(vec3(0,1,0));
			obj.normals.push(vec3(0,1,0));
			
			obj.numVertices += 6;
		}
	}
	
	obj.material.ambient = vec3(0.1,0.1,0.1);
	obj.material.diffuse = vec3(0.8,0.8,0.8);
	obj.material.specular = vec3(0.3,0.3,0.3);
	obj.material.shininess = 10;

	return obj;
}

// 用于生成一个中心在原点的球的顶点数据(南北极在z轴方向)
// 返回球Obj对象，参数为球的半径及经线和纬线数
function buildSphere(radius, columns, rows){
	var obj = new Obj(); // 新建一个Obj对象
	var vertices = []; // 存放不同顶点的数组

	for (var r = 0; r <= rows; r++){
		var v = r / rows;  // v在[0,1]区间
		var theta1 = v * Math.PI; // theta1在[0,PI]区间

		var temp = vec3(0, 0, 1);
		var n = vec3(temp); // 实现Float32Array深拷贝
		var cosTheta1 = Math.cos(theta1);
		var sinTheta1 = Math.sin(theta1);
		n[0] = temp[0] * cosTheta1 + temp[2] * sinTheta1;
		n[2] = -temp[0] * sinTheta1 + temp[2] * cosTheta1;
		
		for (var c = 0; c <= columns; c++){
			var u = c / columns; // u在[0,1]区间
			var theta2 = u * Math.PI * 2; // theta2在[0,2PI]区间
			var pos = vec3(n);
			temp = vec3(n);
			var cosTheta2 = Math.cos(theta2);
			var sinTheta2 = Math.sin(theta2);
			
			pos[0] = temp[0] * cosTheta2 - temp[1] * sinTheta2;
			pos[1] = temp[0] * sinTheta2 + temp[1] * cosTheta2;
			
			var posFull = mult(pos, radius);
			
			vertices.push(posFull);
		}
	}

	/*生成最终顶点数组数据(使用三角形进行绘制)*/
	var colLength = columns + 1;
	for (var r = 0; r < rows; r++){
		var offset = r * colLength;

		for (var c = 0; c < columns; c++){
			var ul = offset  +  c;						// 左上
			var ur = offset  +  c + 1;					// 右上
			var br = offset  +  (c + 1 + colLength);	// 右下
			var bl = offset  +  (c + 0 + colLength);	// 左下

			// 由两条经线和纬线围成的矩形
			// 分2个三角形来画
			obj.vertices.push(vertices[ul]); 
			obj.vertices.push(vertices[bl]);
			obj.vertices.push(vertices[br]);
			obj.vertices.push(vertices[ul]);
			obj.vertices.push(vertices[br]);
			obj.vertices.push(vertices[ur]);

			obj.normals.push(vertices[ul]); 
			obj.normals.push(vertices[bl]);
			obj.normals.push(vertices[br]);
			obj.normals.push(vertices[ul]);
			obj.normals.push(vertices[br]);
			obj.normals.push(vertices[ur]);

			obj.texcoords.push(vec2(c/columns, r/rows));
			obj.texcoords.push(vec2(c/columns, (r+1)/rows));
			obj.texcoords.push(vec2((c+1)/columns, (r+1)/rows));
			obj.texcoords.push(vec2(c/columns, r/rows));
			obj.texcoords.push(vec2((c+1)/columns, (r+1)/rows));
			obj.texcoords.push(vec2((c+1)/columns, r/rows));
		}
	}

	vertices.length = 0; // 已用不到，释放 
	obj.numVertices = rows * columns * 6; // 顶点数
	
	obj.material.ambient = vec3(0.1,0.1,0.1);
	obj.material.diffuse = vec3(0.9,0.4,0.4);
	obj.material.specular = vec3(1.0,1.0,1.0);
	obj.material.shininess = 90;

	return obj;
}

// 构建中心在原点的圆环(由线段构建)
// 参数分别为圆环的主半径(决定环的大小)，
// 圆环截面圆的半径(决定环的粗细)，
// numMajor和numMinor决定模型精细程度
// 返回圆环Obj对象
function buildTorus(majorRadius, minorRadius, numMajor, numMinor){
	var obj = new Obj(); // 新建一个Obj对象
	
	obj.numVertices = numMajor * numMinor * 6; // 顶点数

	var majorStep = 2.0 * Math.PI / numMajor;
	var minorStep = 2.0 * Math.PI / numMinor;
	var sScale = 4, tScale = 2;

	for(var i = 0; i < numMajor; ++i){
		var a0 = i * majorStep;
		var a1 = a0 + majorStep;
		var x0 = Math.cos(a0);
		var y0 = Math.sin(a0);
		var x1 = Math.cos(a1);
		var y1 = Math.sin(a1);

		var center0 = mult(majorRadius, vec3(x0,y0,0));
		var center1 = mult(majorRadius, vec3(x1,y1,0));

		for(var j = 0; j < numMinor; ++j){
			var b0 = j * minorStep;
			var b1 = b0 + minorStep;
			var c0 = Math.cos(b0);
			var r0 = minorRadius * c0 + majorRadius;
			var z0 = minorRadius * Math.sin(b0);
			var c1 = Math.cos(b1);
			var r1 = minorRadius * c1 + majorRadius;
			var z1 = minorRadius * Math.sin(b1);

			var left0 = vec3(x0*r0, y0*r0, z0);
			var right0 = vec3(x1*r0, y1*r0, z0);
			var left1 = vec3(x0*r1, y0*r1, z1);
			var right1 = vec3(x1*r1, y1*r1, z1);
			obj.vertices.push(left0);  
			obj.vertices.push(right0); 
			obj.vertices.push(left1); 
			obj.vertices.push(left1); 
			obj.vertices.push(right0);
			obj.vertices.push(right1);

			obj.normals.push(subtract(left0,center0));
			obj.normals.push(subtract(right0,center1));
			obj.normals.push(subtract(left1,center0));
			obj.normals.push(subtract(left1,center0));
			obj.normals.push(subtract(right0,center1));
			obj.normals.push(subtract(right1,center1));

			obj.texcoords.push(vec2(i/numMajor*sScale,j/numMinor*tScale));
			obj.texcoords.push(vec2((i+1)/numMajor*sScale,j/numMinor*tScale));
			obj.texcoords.push(vec2(i/numMajor*sScale,(j+1)/numMinor*tScale));
			obj.texcoords.push(vec2(i/numMajor*sScale,(j+1)/numMinor*tScale));
			obj.texcoords.push(vec2((i+1)/numMajor*sScale,j/numMinor*tScale));
			obj.texcoords.push(vec2((i+1)/numMajor*sScale,(j+1)/numMinor*tScale));
		}
	}

	obj.material.ambient = vec3(0.05,0.1,0.1);
	obj.material.diffuse = vec3(0.3,0.8,0.75);
	obj.material.specular = vec3(1.0,1.0,1.0);
	obj.material.shininess = 100;
	
	return obj;
}

// 构建立方体，输入参数为立方体边长
function buildCubes(size){
	var obj = new Obj();

	size = size/2;

	obj.numVertices = 36; // 顶点数
	var vertices = [
		vec3(-size,-size,size),
		vec3(-size,size,size),
		vec3(size,size,size),
		vec3(size,-size,size),
		vec3(-size,-size,-size),
		vec3(-size,size,-size),
		vec3(size,size,-size),
		vec3(size,-size,-size)
	];

	function buildCubeQuad(obj,vertices,a,b,c,d){
		var u = subtract(vertices[b],vertices[a]);
		var v = subtract(vertices[c],vertices[b]);
	
		var normal = normalize(cross(u,v));
	
		obj.normals.push(normal);
		obj.vertices.push(vertices[a]);
		obj.texcoords.push(vec2(0,0));
		obj.normals.push(normal);
		obj.vertices.push(vertices[b]);
		obj.texcoords.push(vec2(0,1));
		obj.normals.push(normal);
		obj.vertices.push(vertices[c]);
		obj.texcoords.push(vec2(1,1));
		obj.normals.push(normal);
		obj.vertices.push(vertices[a]);
		obj.texcoords.push(vec2(0,0));
		obj.normals.push(normal);
		obj.vertices.push(vertices[c]);
		obj.texcoords.push(vec2(1,1));
		obj.normals.push(normal);
		obj.vertices.push(vertices[d]);
		obj.texcoords.push(vec2(1,0));
	}
	
	buildCubeQuad(obj,vertices,1,0,3,2);
	buildCubeQuad(obj,vertices,2,3,7,6);
	buildCubeQuad(obj,vertices,3,0,4,7);
	buildCubeQuad(obj,vertices,6,5,1,2);
	buildCubeQuad(obj,vertices,4,5,6,7);
	buildCubeQuad(obj,vertices,5,4,0,1);

	vertices.length = 0; 

	obj.material.ambient = vec3(0.2,0.2,0.2);
	obj.material.diffuse = vec3(0.7,0.8,0.8);
	obj.material.specular = vec3(1.0,1.0,1.0);
	obj.material.emission = vec3(0.2,0.2,0.2);
	obj.material.shininess = 90;

	return obj;
}

// 获取shader中变量位置
function getLocation(){
	//获取program变量
	program.a_Position = gl.getAttribLocation(program,"a_Position");
	if(program.a_Position<0) console.log("获取a_Position失败");
	program.a_Normal = gl.getAttribLocation(program,"a_Normal");
	if(program.a_Normal<0) console.log("获取a_Normal失败");
	program.u_ModelView = gl.getUniformLocation(program,"u_ModelView");
	if(!program.u_ModelView) console.log("获取u_ModelView失败");
	program.u_Projection = gl.getUniformLocation(program,"u_Projection");
	if(!program.u_Projection) console.log("获取u_Projection失败");
	program.u_NormalMat = gl.getUniformLocation(program,"u_NormalMat");
	if(!program.u_NormalMat) console.log("获取u_NormalMat失败");
	program.u_AmbientProduct = gl.getUniformLocation(program,"u_AmbientProduct");
	if(!program.u_AmbientProduct) console.log("获取u_AmbientProduct失败");
	program.u_DiffuseProduct = gl.getUniformLocation(program,"u_DiffuseProduct");
	if(!program.u_DiffuseProduct) console.log("获取u_DiffuseProduct失败");
	program.u_SpecularProduct = gl.getUniformLocation(program,"u_SpecularProduct");
	if(!program.u_SpecularProduct) console.log("获取u_SpecularProduct失败");
	program.u_Shininess = gl.getUniformLocation(program,"u_Shininess");
	if(!program.u_Shininess) console.log("获取u_Shininess失败");
	program.u_LightPosition = gl.getUniformLocation(program,"u_LightPosition");
	if(!program.u_LightPosition) console.log("获取u_LightPosition失败");
	program.u_Emission = gl.getUniformLocation(program,"u_Emission");
	if(!program.u_Emission) console.log("获取u_Emission失败");
	program.u_SpotDirection = gl.getUniformLocation(program,"u_SpotDirection");
	if(!program.u_SpotDirection) console.log("获取u_SpotDirection失败");
	program.u_SpotCutOff = gl.getUniformLocation(program,"u_SpotCutOff");
	if(!program.u_SpotCutOff) console.log("获取u_SpotCutOff失败");
	program.u_SpotExponent = gl.getUniformLocation(program,"u_SpotExponent");
	if(!program.u_SpotExponent) console.log("获取u_SpotExponent失败");
	program.u_LightOn = gl.getUniformLocation(program,"u_LightOn");
	if(!program.u_LightOn) console.log("获取u_LightOn失败");
	program.a_Texcoord = gl.getAttribLocation(program,"a_Texcoord");
	if(program.a_Texcoord<0) console.log("获取a_Texcoord失败");
	program.u_Sampler = gl.getUniformLocation(program,"u_Sampler");
	if(!program.u_Sampler) console.log("获取u_Sampler失败");
	program.u_Alpha = gl.getUniformLocation(program,"u_Alpha");
	if(!program.u_Alpha) console.log("获取u_Alpha失败");
	program.u_bOnlyTexture = gl.getUniformLocation(program,"u_bOnlyTexture");
	if(!program.u_bOnlyTexture) console.log("获取u_bOnlyTexture失败");
	program.u_Color = gl.getUniformLocation(program,"u_Color");
	if(!program.u_Color) console.log("获取u_Color失败");
	program.u_eye = gl.getUniformLocation(program,"u_eye");
	if(!program.u_eye) console.log("获取u_eye失败");
	program.u_FogColor = gl.getUniformLocation(program,"u_FogColor");
	if(!program.u_FogColor) console.log("获取u_FogColor失败");
	program.u_FogDist = gl.getUniformLocation(program,"u_FogDist");
	if(!program.u_FogDist) console.log("获取u_FogDist失败");
	program.u_bFog = gl.getUniformLocation(program,"u_bFog");
	if(!program.u_bFog) console.log("获取u_bFog失败");
	program.u_bToonShader = gl.getUniformLocation(program,"u_bToonShader");
	if(!program.u_bToonShader) console.log("获取u_bToonShader失败");

	//获取programObj变量
	attribIndex.a_Position = gl.getAttribLocation(programObj, "a_Position");
	if(attribIndex.a_Position<0) console.log("获取a_Position失败");
	attribIndex.a_Normal = gl.getAttribLocation(programObj, "a_Normal");
	if(attribIndex.a_Normal<0) console.log("获取a_Normal失败");
	attribIndex.a_Texcoord = gl.getAttribLocation(programObj, "a_Texcoord");
	if(attribIndex.a_Texcoord<0) console.log("获取a_Texcoord失败");
	mtlIndex.u_Ka = gl.getUniformLocation(programObj, "u_Ka");
	if(!mtlIndex.u_Ka) console.log("获取u_Ka失败");
	mtlIndex.u_Kd = gl.getUniformLocation(programObj, "u_Kd");
	if(!mtlIndex.u_Kd) console.log("获取u_Kd失败");
	mtlIndex.u_Ks = gl.getUniformLocation(programObj, "u_Ks");
	if(!mtlIndex.u_Ks) console.log("获取u_Ks失败");
	mtlIndex.u_Ke = gl.getUniformLocation(programObj, "u_Ke");
	if(!mtlIndex.u_Ke) console.log("获取u_Ke失败");
	mtlIndex.u_Ns = gl.getUniformLocation(programObj, "u_Ns");
	if(!mtlIndex.u_Ns) console.log("获取u_Ns失败");
	mtlIndex.u_d = gl.getUniformLocation(programObj, "u_d");
	if(!mtlIndex.u_d) console.log("获取u_d失败");
	programObj.u_AmbientLight = gl.getUniformLocation(programObj, "u_AmbientLight");
	if(!programObj.u_AmbientLight) console.log("获取u_AmbientLight失败");
	programObj.u_DiffuseLight = gl.getUniformLocation(programObj, "u_DiffuseLight");
	if(!programObj.u_DiffuseLight) console.log("获取u_DiffuseLight失败");
	programObj.u_SpecularLight = gl.getUniformLocation(programObj, "u_SpecularLight");
	if(!programObj.u_SpecularLight) console.log("获取u_SpecularLight失败");
	programObj.u_ModelView = gl.getUniformLocation(programObj, "u_ModelView");
	if(!programObj.u_ModelView) console.log("获取u_ModelView失败");
	programObj.u_Projection = gl.getUniformLocation(programObj, "u_Projection");
	if(!programObj.u_Projection) console.log("获取u_Projection失败");
	programObj.u_NormalMat = gl.getUniformLocation(programObj, "u_NormalMat");
	if(!programObj.u_NormalMat) console.log("获取u_NormalMat失败");
	programObj.u_LightPosition = gl.getUniformLocation(programObj, "u_LightPosition");
	if(!programObj.u_LightPosition) console.log("获取u_LightPosition失败");
	programObj.u_bOnlyTexture = gl.getUniformLocation(programObj, "u_bOnlyTexture");
	if(!programObj.u_bOnlyTexture) console.log("获取u_bOnlyTexture失败");
	programObj.u_LightOn = gl.getUniformLocation(programObj, "u_LightOn");
	if(!programObj.u_LightOn) console.log("获取u_LightOn失败");
	programObj.u_Sampler = gl.getUniformLocation(programObj, "u_Sampler");
	if(!programObj.u_Sampler) console.log("获取u_Sampler失败");
	programObj.u_SpotDirection = gl.getUniformLocation(programObj, "u_SpotDirection");
	if(!programObj.u_SpotDirection) console.log("获取u_SpotDirection失败");
	programObj.u_SpotCutOff = gl.getUniformLocation(programObj, "u_SpotCutOff");
	if(!programObj.u_SpotCutOff) console.log("获取u_SpotCutOff失败");
	programObj.u_SpotExponent = gl.getUniformLocation(programObj, "u_SpotExponent");
	if(!programObj.u_SpotExponent) console.log("获取u_SpotExponent失败");
	programObj.u_FogColor = gl.getUniformLocation(programObj, "u_FogColor");
	if(!programObj.u_FogColor) console.log("获取u_FogColort失败");
	programObj.u_FogDist = gl.getUniformLocation(programObj, "u_FogDist");
	if(!programObj.u_FogDist) console.log("获取u_FogDist失败");
	programObj.u_bFog = gl.getUniformLocation(programObj, "u_bFog");
	if(!programObj.u_bFog) console.log("获取u_bFog失败");
	programObj.u_bToonShader = gl.getUniformLocation(programObj, "u_bToonShader");
	if(!programObj.u_bToonShader) console.log("获取u_bToonShader失败");

	//获取programLine变量
	programLine.a_Position = gl.getAttribLocation(programLine,"a_Position");
	if(programLine.a_Position<0) console.log("获取a_Position失败");
	programLine.a_Normal = gl.getAttribLocation(programLine,"a_Normal");
	if(programLine.a_Normal<0) console.log("获取a_Normal失败");
	programLine.u_ModelView = gl.getUniformLocation(programLine, "u_ModelView");
	if(!programLine.u_ModelView) console.log("获取u_ModelView失败");
	programLine.u_Projection = gl.getUniformLocation(programLine, "u_Projection");
	if(!programLine.u_Projection) console.log("获取u_Projection失败");
	programLine.u_NormalMat = gl.getUniformLocation(programLine, "u_NormalMat");
	if(!programLine.u_NormalMat) console.log("获取u_NormalMat失败");
	programLine.u_eye = gl.getUniformLocation(programLine, "u_eye");
	if(!programLine.u_eye) console.log("获取u_eye失败");
	programLine.u_FogColor = gl.getUniformLocation(programLine, "u_FogColor");
	if(!programLine.u_FogColor) console.log("获取u_FogColor失败");
	programLine.u_FogDist = gl.getUniformLocation(programLine, "u_FogDist");
	if(!programLine.u_FogDist) console.log("获取u_FogDist失败");
	programLine.u_bFog = gl.getUniformLocation(programLine, "u_bFog");
	if(!programLine.u_bFog) console.log("获取u_bFog失败");
	programLine.u_LineWidth = gl.getUniformLocation(programLine, "u_LineWidth");
	if(!programLine.u_LineWidth) console.log("获取u_LineWidth失败");
	programLine.u_LineColor = gl.getUniformLocation(programLine, "u_LineColor");
	if(!programLine.u_LineColor) console.log("获取u_LineColor失败");
	programLine.u_Alpha = gl.getUniformLocation(programLine, "u_Alpha");
	if(!programLine.u_Alpha) console.log("获取u_Alpha失败");
}

var ground = buildGround(20.0, 0.1);	//生成地面对象

var numSpheres = 50;  //场景中球的数目
var posSphere = [];  //球的坐标
var sphere = buildSphere(0.2, 15, 15);	//生成球对象

var numTours=4;		//场景中圆环的数目
var posTours = [];  //圆环的坐标
var torus = buildTorus(0.35, 0.15, 40, 20);	//生成圆环对象

var cube = buildCubes(1);	//生成方块对象

var treeTrunkTexObj;	//树干纹理
var treeLeafTexObj;		//树叶纹理

var numTrees = 10;		//树的数量
var posTrees = [];		//树的坐标

//树的材质
mtlTreeLeft = new MaterialObj();
mtlTreeLeft.ambient = vec3(0.2,0.2,0.2);
mtlTreeLeft.diffuse = vec3(0.7,0.7,0.3);
mtlTreeLeft.specular = vec3(0.2,0.2,0.2);
mtlTreeLeft.emission = vec3(0.1,0.1,0.1);
mtlTreeLeft.shininess = 10;

var posWall = [
	vec2(1.0,-1.0),
	vec2(1.0,-2.0),
	vec2(1.0,-3.0)
];
var wallFlag = [];

var npcPos;		//NPC坐标

var obj = loadOBJ("Res\\Obj\\Saber.obj");				//玩家的Obj模型
var obj2 = loadOBJ("Res\\31089\\Rinna Mayfield.obj");	//NPC的Obj模型

// 初始化场景中的几何对象
function initObjs(){

	// 初始化地面顶点数据缓冲区对象(VBO)
	ground.initBuffers(); 
	ground.texObj = loadTexture("Res\\ground.jpeg",gl.RGB,true);
	
	// 随机放置球的位置
	for(var iSphere = 0; iSphere < numSpheres; iSphere++){
		var x = Math.random() * sizeGround * 2 - sizeGround;
		var z = Math.random() * sizeGround * 2 - sizeGround;
		posSphere.push(vec2(x, z));
	}
	
	// 初始化球顶点数据缓冲区对象(VBO)
	sphere.initBuffers();
	sphere.texObj = loadTexture("Res\\sphere.jpg",gl.RGB,true);
	
	// 随机放置圆环的位置
	posTours.push(vec2(0, -3));
	for(var iTour = 1; iTour < numTours; iTour++){
		var x = Math.random() * sizeGround * 2 - sizeGround;
		var z = Math.random() * sizeGround * 2 - sizeGround;
		posTours.push(vec2(x, z));
	}

	// 初始化圆环顶点数据缓冲区对象(VBO)
	torus.initBuffers();
	torus.texObj = loadTexture("Res\\torus.jpeg",gl.RGB,true);

	// 初始化方块顶点数据缓冲区对象(VBO)
	cube.initBuffers();
	cube.texObj = loadTexture("Res\\quad.jpg",gl.RGB,true);

	// 载入树的贴图
	treeLeftTexObj = loadTexture("Res\\left.jpeg",gl.RGB,true);
	treeTrunkTexObj = loadTexture("Res\\tree.jpeg",gl.RGB,true);

	// 随机生成树的坐标
	for(var i = 0; i < numTrees; i++){
		var x = Math.random() * (sizeGround - 1) * 2 - (sizeGround - 1);
		var z = Math.random() * (sizeGround - 1) * 2 - (sizeGround - 1);
		posTrees.push(vec2(x, z));
	}

	// NPC的坐标
	npcPos = vec2(-2, -2.8);

	for(var i=0;i<posWall.length;i++){
		wallFlag.push(true);
	}
}

//初始化雾化效果
function initFog(){
	var fogColor = backgroundColor;
	var fogDist = vec2(13,18);
	var eye = vec4(0.0,0.0,0.0,1.0);
	gl.useProgram(program);
	gl.uniform3fv(program.u_FogColor,fogColor);
	gl.uniform2fv(program.u_FogDist,fogDist);
	gl.uniform4fv(program.u_eye,eye);
	gl.uniform1i(program.u_bFog, fogFlag);
	gl.useProgram(programObj);
	gl.uniform3fv(programObj.u_FogColor,fogColor);
	gl.uniform2fv(programObj.u_FogDist,fogDist);
	gl.uniform4fv(programObj.u_eye,eye);
	gl.uniform1i(programObj.u_bFog, fogFlag);
	gl.useProgram(programLine);
	gl.uniform3fv(programLine.u_FogColor,fogColor);
	gl.uniform2fv(programLine.u_FogDist,fogDist);
	gl.uniform4fv(programLine.u_eye,eye);
	gl.uniform1i(programLine.u_bFog, fogFlag);
}

//初始化轮廓线数据
function initLine(){
	gl.useProgram(programLine);
	gl.uniform1f(programLine.u_LineWidth,lineWidth);
	gl.uniform3fv(programLine.u_LineColor,lineColor);
	gl.uniform1f(programLine.u_Alpha,1.0);
}

//每次渲染前的初始化
function init(){
	initLine();

	var fogDist = vec2(13,18);
	fogDist[0] -= (NUM / 10);
	fogDist[1] -= 1.5 * (NUM / 10);

	var eye = vec4(0.0,0.0,cameraDis,1.0);

	gl.useProgram(program);
	gl.uniform1i(program.u_bToonShader, toonShaderFlag);
	gl.uniform2fv(program.u_FogDist,fogDist);
	gl.uniform4fv(program.u_eye,eye);
	gl.uniform1i(program.u_bFog, fogFlag);
	gl.useProgram(programObj);
	gl.uniform1i(programObj.u_bToonShader, toonShaderFlag);
	gl.uniform2fv(programObj.u_FogDist,fogDist);
	gl.uniform4fv(programObj.u_eye,eye);
	gl.uniform1i(programObj.u_bFog, fogFlag);
	gl.useProgram(programLine);
	gl.uniform2fv(programLine.u_FogDist,fogDist);
	gl.uniform4fv(programLine.u_eye,eye);
	gl.uniform1i(programLine.u_bFog, fogFlag);
	gl.useProgram(program);
}

// 页面加载完成后会调用此函数，函数名可任意(不一定为main)
window.onload = function main(){
	// 获取页面中id为webgl的canvas元素
    var canvas = document.getElementById("webgl");
	if(!canvas){ // 获取失败
		alert("获取canvas失败！"); 
		return;
	}

	var hud = document.getElementById("hud");
	if(!hud){ // 获取失败
		alert("获取hud失败！"); 
		return;
	}
	ctx=hud.getContext('2d');
	
	// 利用辅助程序文件中的功能获取WebGL上下文
	// 成功则后面可通过gl来调用WebGL的函数
    gl = WebGLUtils.setupWebGL(canvas, {alpha:false});    
    if (!gl){ // 失败则弹出信息
		alert("获取WebGL上下文失败！"); 
		return;
	}        

	/*设置WebGL相关属性*/
    gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], 1.0); // 设置背景色为蓝色
	gl.enable(gl.DEPTH_TEST);	// 开启深度检测
	gl.enable(gl.CULL_FACE);	// 开启面剔除
	// 设置视口，占满整个canvas
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
	/*加载shader程序并为shader中attribute变量提供数据*/
	// 加载id分别为"vertex-shader"和"fragment-shader"的shader程序，
	// 并进行编译和链接，返回shader程序对象program
    program = initShaders(gl, "vertex-shader", "fragment-shader");
	programObj = initShaders(gl, "vertex-shader", "OBJfragment-shader");
	programLine = initShaders(gl, "line-vertex-shader", "line-fragment-shader");
    gl.useProgram(program);	// 启用该shader程序对象 
	
	// 获取shader中变量位置
	getLocation();	
		
	// 设置投影矩阵：透视投影，根据视口宽高比指定视域体
	var matProj = perspective(35.0, 		// 垂直方向视角
		canvas.width / canvas.height, 	// 视域体宽高比
		0.1, 							// 相机到近裁剪面距离
		1000.0);							// 相机到远裁剪面距离

	gl.uniformMatrix4fv(program.u_Projection,false,flatten(matProj));

	gl.uniform1i(program.u_Sampler, 0);

	gl.useProgram(programObj);
	gl.uniformMatrix4fv(programObj.u_Projection,false,flatten(matProj));

	gl.useProgram(programLine);
	gl.uniformMatrix4fv(programLine.u_Projection,false,flatten(matProj));

	//鼠标控制镜头
	canvas.onclick = function () {
		canvas.requestPointerLock();
	}
	canvas.onmousemove = function () {
		if (document.pointerLockElement) {
			devX = event.movementX;
			devY = event.movementY;
		}
	}
	
	initLine();
	initFog();

	initLights();

	initObjs();
	
	isGameRun = true;

	// 进行绘制
    //render();
};

// 按键响应
window.onkeydown = function(){
	switch(event.keyCode){
		case 87:	// W
			keyDown[0] = true;
			break;
		case 83:	// S
			keyDown[1] = true;
			break;
		case 65:	// A
			keyDown[2] = true;
			break;
		case 68:	// D
			keyDown[3] = true;
			break;
		case 70:	//F
			lights[2].on = !lights[2].on;
			passLightsOn();
			break;
		case 69:	//E
			toonShaderFlag = !toonShaderFlag;
			break;
		case 81:	//Q
			if(isThirdperson){
				matReverse = mult(matReverse, translate(0.0, 0.0, -(cameraThirdDis - cameraFirstDis)));
				matCamera = mult(translate(0.0, 0.0, (cameraThirdDis - cameraFirstDis)), matCamera);
				cameraDis = cameraFirstDis;
			}
			else{
				matReverse = mult(matReverse, translate(0.0, 0.0, (cameraThirdDis - cameraFirstDis)));
				matCamera = mult(translate(0.0, 0.0, -(cameraThirdDis - cameraFirstDis)), matCamera);
				cameraDis = cameraThirdDis;
			}
			isThirdperson = !isThirdperson;
			break;

		case 32: 	// space
			if(!jumping){
				jumping = true;
				jumpTime = 0;
			}
			break;
		
		case 48:	//0
			if(!showText[0]) break;
			if(isTypingPassword)
			{
				if(key[0] == -1)
				{
					key[0] = 0;
					break;
				}
				if(key[1] == -1)
				{
					key[1] = 0;
					break;
				}
				if(key[2] == -1)
				{
					key[2] = 0;
					break;
				}
			}
			break;
		case 49:	//1
			if(!showText[0]) break;
			if(isTypingPassword)
			{
				if(key[0] == -1)
				{
					key[0] = 1;
					break;
				}
				if(key[1] == -1)
				{
					key[1] = 1;
					break;
				}
				if(key[2] == -1)
				{
					key[2] = 1;
					break;
				}
			}
			break;
		case 50:	//2
			if(!showText[0]) break;
			if(isTypingPassword)
			{
				if(key[0] == -1)
				{
					key[0] = 2;
					break;
				}
				if(key[1] == -1)
				{
					key[1] = 2;
					break;
				}
				if(key[2] == -1)
				{
					key[2] = 2;
					break;
				}
			}
			break;
		case 51:	//3
			if(!showText[0]) break;
			if(isTypingPassword)
			{
				if(key[0] == -1)
				{
					key[0] = 3;
					break;
				}
				if(key[1] == -1)
				{
					key[1] = 3;
					break;
				}
				if(key[2] == -1)
				{
					key[2] = 3;
					break;
				}
			}
			break;
		case 52:	//4
			if(!showText[0]) break;
			if(isTypingPassword)
			{
				if(key[0] == -1)
				{
					key[0] = 4;
					break;
				}
				if(key[1] == -1)
				{
					key[1] = 4;
					break;
				}
				if(key[2] == -1)
				{
					key[2] = 4;
					break;
				}
			}
			break;
		case 53:	//5
			if(!showText[0]) break;
			if(isTypingPassword)
			{
				if(key[0] == -1)
				{
					key[0] = 5;
					break;
				}
				if(key[1] == -1)
				{
					key[1] = 5;
					break;
				}
				if(key[2] == -1)
				{
					key[2] = 5;
					break;
				}
			}
			break;
		case 54:	//6
			if(!showText[0]) break;
			if(isTypingPassword)
			{
				if(key[0] == -1)
				{
					key[0] = 6;
					break;
				}
				if(key[1] == -1)
				{
					key[1] = 6;
					break;
				}
				if(key[2] == -1)
				{
					key[2] = 6;
					break;
				}
			}
			break;
		case 55:	//7
			if(!showText[0]) break;
			if(isTypingPassword)
			{
				if(key[0] == -1)
				{
					key[0] = 7;
					break;
				}
				if(key[1] == -1)
				{
					key[1] = 7;
					break;
				}
				if(key[2] == -1)
				{
					key[2] = 7;
					break;
				}
			}
			break;
		case 56:	//8
			if(!showText[0]) break;
			if(isTypingPassword)
			{
				if(key[0] == -1)
				{
					key[0] = 8;
					break;
				}
				if(key[1] == -1)
				{
					key[1] = 8;
					break;
				}
				if(key[2] == -1)
				{
					key[2] = 8;
					break;
				}
			}
			break;
		case 57:	//9
			if(!showText[0]) break;
			if(isTypingPassword)
			{
				if(key[0] == -1)
				{
					key[0] = 9;
					break;
				}
				if(key[1] == -1)
				{
					key[1] = 9;
					break;
				}
				if(key[2] == -1)
				{
					key[2] = 9;
					break;
				}
			}
			break;
		case 78:	//N
			hudOn=!hudOn;
			break;
		case 77:	//M
			showMap=!showMap;
			break;
		case 76:	//L
			chongwan();
			break;
		case 75:	//K
			Menu=!Menu;
			break;
	
	}
	
	// 禁止默认处理(例如上下方向键对滚动条的控制)
	event.preventDefault(); 
}

// 按键弹起响应
window.onkeyup = function(){
	switch(event.keyCode){
		case 87:	// W
			keyDown[0] = false;
			break;
		case 83:	// S
			keyDown[1] = false;
			break;
		case 65:	// A
			keyDown[2] = false;
			break;
		case 68:	// D
			keyDown[3] = false;
			break;
	}
}

// 记录上一次调用函数的时刻
var last = Date.now();

// 根据时间更新旋转角度
function animation(){
	// 计算距离上次调用经过多长的时间
	var now = Date.now();
	var elapsed = (now - last) / 1000.0; // 秒
	last = now;
	
	// 更新动画状态
	yRot += deltaAngle * elapsed;

	// 防止溢出
    yRot %= 360;
	
	// 跳跃处理
	jumpTime += elapsed;
	if(jumping){
		jumpY = initSpeed * jumpTime - 0.5 * g * jumpTime * jumpTime;
		if(jumpY <= 0){
			jumpY = 0;
			jumping = false;
		}
	}

	if(isGameRun){
		//time -= elapsed;
		//NUM += elapsed*2;
	}
}

// 更新照相机变换
function updateCamera(){
	// 鼠标控制旋转
	matReverse = mult(matReverse, translate(0.0, 0.0, -cameraDis));
	matCamera = mult(translate(0.0, 0.0, cameraDis), matCamera);
	var angleY = devX / 5000 * 360;	
	matReverse = mult(matReverse, rotateY(-angleY));
	matCamera = mult(rotateY(angleY), matCamera);
	matReverse = mult(matReverse, translate(0.0, 0.0, cameraDis));
	matCamera = mult(translate(0.0, 0.0, -cameraDis), matCamera);

	// 照相机前进
	if(keyDown[0]){
		matReverse = mult(matReverse, translate(0.0, 0.0, -speed));
		matCamera = mult(translate(0.0, 0.0, speed), matCamera);
	}
	
	// 照相机后退
	if(keyDown[1]){
		matReverse = mult(matReverse, translate(0.0, 0.0, speed));
		matCamera = mult(translate(0.0, 0.0, -speed), matCamera);
	}
	
	// 照相机左移
	if(keyDown[2]){
		matReverse = mult(matReverse, translate(-speed, 0.0, 0.0));
		matCamera = mult(translate(speed, 0.0, 0.0), matCamera);
	}
	
	// 照相机右移
	if(keyDown[3]){
		matReverse = mult(matReverse, translate(speed, 0.0, 0.0));
		matCamera = mult(translate(-speed, 0.0, 0.0), matCamera);
	}

	devX = 0;
	matReverse = mult(matReverse, translate(0.0, 0.0, -cameraDis));
	matCamera = mult(translate(0.0, 0.0, cameraDis), matCamera);
	collide();	//碰撞检测
	matReverse = mult(matReverse, translate(0.0, 0.0, cameraDis));
	matCamera = mult(translate(0.0, 0.0, -cameraDis), matCamera);

	collideCamera();
}

//碰撞检测
function collide(){
	var x = matReverse[3];
	var z = matReverse[11];

	var isCollision = false;	//是否发生碰撞

	//边界检测
	if (x < -(sizeGround - 0.1) || x > (sizeGround - 0.1) || z < -(sizeGround - 0.1) || z > (sizeGround - 0.1)) {
		isCollision = true;
	}

	//与球的碰撞检测
	for (var i = 0; i < numSpheres; i++) {
        if (Math.abs(posSphere[i][0] - x) <= 0.5 && Math.abs(posSphere[i][1] - z) <= 0.5) {
            posSphere[i][0] = 1000;
			posSphere[i][1] = 1000;
			NUM=Math.max(NUM-5,0);
            break;
        }
	}

	//与圆环的碰撞检测
	for (var i = 0; i < numTours; i++){
		showText[i] = false;
		if (!isGameRun) continue;
		if (Math.abs(posTours[i][0] - x) <= 0.6 && Math.abs(posTours[i][1] - z) <= 0.6) {
			showText[i] = true;
		}
	}
	
	//与树的碰撞检测
	for (var i = 0; i < numTrees; i++){
		if (Math.abs(posTrees[i][0] - x) <= 0.2 && Math.abs(posTrees[i][1] - z) <= 0.2) {
			isCollision = true;
		}
	}

	//与NPC的碰撞检测
	npcDialogFlag = false
	if (Math.abs(npcPos[0] - x) <= 0.5 && Math.abs(npcPos[1] - z) <= 0.5) {
		npcDialogFlag = true;
	}
	if (Math.abs(npcPos[0] - x) <= 0.15 && Math.abs(npcPos[1] - z) <= 0.15) {
		isCollision = true;
	}

	for(var i=0;i<posWall.length;i++){
		if (Math.abs(posWall[i][0] - x) <= 0.55 && Math.abs(posWall[i][1] - z) <= 0.55) 
			isCollision = true;
	}

	//发生碰撞，摄像机归位
	if (isCollision) {
		if (keyDown[0]) {
			matReverse = mult(matReverse, translate(0.0, 0.0, speed));
			matCamera = mult(translate(0.0, 0.0, -speed), matCamera);
		}
		if (keyDown[1]) {
			matReverse = mult(matReverse, translate(0.0, 0.0, -speed));
			matCamera = mult(translate(0.0, 0.0, speed), matCamera);
		}
		if (keyDown[2]) {
			matReverse = mult(matReverse, translate(speed, 0.0, 0.0));
			matCamera = mult(translate(-speed, 0.0, 0.0), matCamera);
		}
		if (keyDown[3]) {
			matReverse = mult(matReverse, translate(-speed, 0.0, 0.0));
			matCamera = mult(translate(speed, 0.0, 0.0), matCamera);
		}
	}
}

function collideCamera(){
	var x = matReverse[3];
	var z = matReverse[11];

	for(var i = 0; i < 4; i++) isDrawWall[i] = true;
	if(x < -sizeGround ) {
		isDrawWall[3] = false;
	}
	else if(x > sizeGround ) {
		isDrawWall[1] = false;
	}
	if(z < -sizeGround) {
		isDrawWall[2] = false;
	}
	else if(z > sizeGround) {
		isDrawWall[0] = false;
	}

	for(var i=0;i<posWall.length;i++){
		wallFlag[i] = true;
		if (Math.abs(posWall[i][0] - x) <= 0.55 && Math.abs(posWall[i][1] - z) <= 0.55) 
			wallFlag[i] = false;
	}
}

//UI界面
function draw2D(){
	if(!isGameRun) return;
	
	ctx.clearRect(0,0,600,350);
	//绘制小地图
	if(showMap) {
		//边框
		ctx.beginPath();
		ctx.moveTo(10, 10);
		ctx.lineTo(220, 10);
		ctx.lineTo(220, 220);
		ctx.lineTo(10, 220);
		ctx.closePath();
		ctx.lineWidth = 2;
		ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
		ctx.stroke();
	
		//地
		ctx.fillStyle = 'rgba(0, 255, 127, 0.8)';
		ctx.fillRect(10, 10, 210, 210);
		
	
		//出口
		ctx.fillStyle = 'rgba(176, 196, 222, 0.8)';
		ctx.fillRect(105, 105, 8, 8);
	
		//玩家的坐标
		matReverse = mult(matReverse, translate(0.0, 0.0, -cameraDis));
		//matCamera = mult(translate(0.0, 0.0, cameraDis), matCamera);
		var gX = matReverse[3];
		var gZ = matReverse[11];
		matReverse = mult(matReverse, translate(0.0, 0.0, cameraDis));
		//matCamera = mult(translate(0.0, 0.0, -cameraDis), matCamera);
		//玩家
		ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
		var pX = 105 + (gX * 10) / 2;
		var pY = 105 + (gZ * 10) / 2;
		ctx.fillRect(pX, pY, 10, 10);
		
		//游戏数据
		ctx.font='14px"微软雅黑"';
		ctx.fillStyle='rgba(255,255,255,1)';
		ctx.fillText('雾化值：'+Math.floor(NUM)+'%',250,20);
		ctx.fillText('时间：'+Math.floor(time),250,40);
		//console.log(pX,pY);
	}	
	//提示
	if(Menu) {
		ctx.font='14px"微软雅黑"';
		ctx.fillStyle='rgba(255,255,255,1)';
		ctx.fillText('鼠标控制左右转向',250,60);
		ctx.fillText('WASD控制移动',250,80);	
		ctx.fillText('空格键跳跃',250,100);	
		ctx.fillText('F键开/关手电筒',250,120);	
		ctx.fillText('Q键切换第一/第三人称',250,140);	
		ctx.fillText('E键切换卡通/真实渲染风格(默认为卡通渲染)',250,160);	
		ctx.fillText('N键开/关UI，M键开/关地图，K键开/关操作提示',250,180);	
		ctx.fillText('L键重启',250,200);	
	}
	//if(pX>150.0&&pX<158.0&&pY>95.0&&pY<110.0)
	if(showText[1]) {
		ctx.beginPath();
		ctx.moveTo(10,230);
		ctx.lineTo(230,230);
		ctx.lineTo(230,300);
		ctx.lineTo(10,300);
		ctx.closePath()
		ctx.strokeStyle='rgba(255,255,255,1)';
		ctx.stroke();
		ctx.font='14px"微软雅黑"';
		ctx.fillStyle='rgba(255,255,255,1)';
		ctx.fillText('密码：第一位是4',20,250);
	}
	//if(pX>52.0&&pX<60.0&&pY>95.0&&pY<110.0)
	if(showText[2]) {
		ctx.beginPath();
		ctx.moveTo(10,230);
		ctx.lineTo(230,230);
		ctx.lineTo(230,300);
		ctx.lineTo(10,300);
		ctx.closePath()
		ctx.strokeStyle='rgba(255,255,255,1)';
		ctx.stroke();
		ctx.font='14px"微软雅黑"';
		ctx.fillStyle='rgba(255,255,255,1)';
		ctx.fillText('密码：第二位是0',20,250);
	}
	//if(pX>151.0&&pX<159.0&&pY>149.0&&pY<155.0)
	if(showText[3]) {
		ctx.beginPath();
		ctx.moveTo(10,230);
		ctx.lineTo(230,230);
		ctx.lineTo(230,300);
		ctx.lineTo(10,300);
		ctx.closePath()
		ctx.strokeStyle='rgba(255,255,255,1)';
		ctx.stroke();
		ctx.font='14px"微软雅黑"';
		ctx.fillStyle='rgba(255,255,255,1)';
		ctx.fillText('密码：第三位是2',20,250);
	}
		
	//if(pX>102.0&&pX<110.0&&pY>102.0&&pY<110.0)
	if (showText[0]) {
		isTypingPassword = true;
		//----------------------------------------
		//ctx.clearRect(0,0,800,600);
		ctx.font = '30px "幼圆"';
		ctx.fillStyle = 'rgba(255,255,255,1)';
		ctx.fillText('门禁密码：', 200, 200);
		if (key[0] != -1)
			ctx.fillText(key[0], 375, 200);
		if (key[1] != -1)
			ctx.fillText(key[1], 465, 200);
		if (key[2] != -1)
			ctx.fillText(key[2], 555, 200);
		ctx.fillText('——', 355, 215);
		ctx.fillText('——', 450, 215);
		ctx.fillText('——', 540, 215);
		//----------------------------------------
		if (key[2] != -1) {
			if (key[0] == 4 && key[1] == 0 && key[2] == 2) {

				ctx.clearRect(0, 0, 800, 600);
				ctx.font = '30px "幼圆"';
				ctx.fillStyle = 'rgba(255,255,255,1)';
				ctx.fillText('密码正确！', 400, 200);
				isPassowrdRight = true;
				isTypingPassword = false;
			}
			else {
				ctx.clearRect(0, 0, 800, 600);
				ctx.font = '30px "幼圆"';
				ctx.fillStyle = 'rgba(255,255,255,1)';
				ctx.fillText('密码错误！', 400, 200);
			}
		}
	}
	
	//NPC对话框
	if(npcDialogFlag){
		ctx.font = '20px"微软雅黑"';
		ctx.fillStyle = 'rgba(255,255,255,1)';
		ctx.fillText('寻找其他的圆环得到密码，解除雾气吧',240,250);
		ctx.fillText('要小心，密码输入不能反悔',240,270);
		ctx.fillText('地上的药丸可以帮助你抵抗雾气',240,290);
	}
	
	if(isPassowrdRight&&time>0) {
		ctx.clearRect(0,0,800,600);
		ctx.font = '30px "幼圆"';
		ctx.fillStyle = 'rgba(255,255,255,1)';
		ctx.fillText('成功！',450,200);
		isGameRun = false;
		fogFlag = false;
	}
	else if(time<=0||NUM>=100) {
		ctx.clearRect(0,0,800,600);
		ctx.font = '30px "幼圆"';
		ctx.fillStyle = 'rgba(255,255,255,1)';
		ctx.fillText('失败！',450,200);
		isGameRun = false;
		fogFlag = false;
	} 
}

// 绘制函数
function render() {
	//检测Obj模型是否加载完成
	if(!obj.isAllReady(gl)||!obj2.isAllReady(gl)){
		requestAnimationFrame(render);
		return;
	}

	animation(); // 更新动画参数
	
	updateCamera(); // 更新相机变换
	
	// 清颜色缓存和深度缓存
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	init();
   
	var matMV;	//模视矩阵
	matMV = mult(translate(0,-jumpY-0.36,0), matCamera);
	// if(isThirdperson) matMV = mult(translate(0,-jumpY-0.5,0), matCamera);
	// else matMV = mult(translate(0,-jumpY,0), matCamera);

	//处理光源信息
	var LightPositions = [];
	var matRotatingSphere = mult(matMV,mult(translate(0.0,0.0,-2.5),
	mult(rotateY(-yRot * 2.0),translate(1.0,0.0,0.0))));
	LightPositions.push(mult(matMV,lightSun.pos));
	LightPositions.push(mult(matRotatingSphere,lightRed.pos));
	lightYellow.pos[1] = -0.3;
	//if(isThirdperson) lightYellow.pos[1] = -0.5;
	//else lightYellow.pos[1] = 0.0;
	lightYellow.pos[2] = -cameraDis;
	LightPositions.push(lightYellow.pos);
	gl.useProgram(program);
	gl.uniform4fv(program.u_LightPosition,flatten(LightPositions));
	gl.useProgram(programObj);
	gl.uniform4fv(programObj.u_LightPosition,flatten(LightPositions));

	/*绘制玩家*/
	gl.useProgram(programObj);
	mvStack.push(matMV);
	matMV = mult(matMV, translate(0.0,jumpY,-cameraDis));
	matMV = mult(matMV, rotateY(180));
	matMV = mult(matMV, scale(0.1,0.1,0.1));
	matMV = mult(matReverse, matMV);
	gl.uniformMatrix4fv(programObj.u_ModelView,false,flatten(matMV));
	gl.uniformMatrix3fv(programObj.u_NormalMat,false,flatten(flatten(normalMatrix(matMV))));
	if(toonShaderFlag) drawLine(obj, matMV);
	obj.draw(gl, attribIndex, mtlIndex, programObj.u_Sampler);
	matMV = mvStack.pop();

	/*绘制NPC*/
	gl.useProgram(programObj);
	mvStack.push(matMV);
	matMV = mult(matMV,translate(npcPos[0],-0.4,npcPos[1]));
	matMV = mult(matMV,rotateY(50));
	matMV = mult(matMV,scale(0.005,0.005,0.005));
	gl.uniformMatrix4fv(programObj.u_ModelView,false,flatten(matMV));
	gl.uniformMatrix3fv(programObj.u_NormalMat,false,flatten(flatten(normalMatrix(matMV))));
	if(toonShaderFlag) drawLine(obj2, matMV);
	obj2.draw(gl, attribIndex, mtlIndex, programObj.u_Sampler);
	matMV = mvStack.pop();

	gl.useProgram(program);

	/*绘制地面*/
	mvStack.push(matMV);
	// 将地面移到y=-0.4平面上
	matMV = mult(matMV, translate(0.0, -0.4, 0.0));
	ground.draw(matMV);
	matMV = mvStack.pop();

	/*绘制每个球体*/
	for(var i = 0; i < numSpheres; i++){
		mvStack.push(matMV);
		matMV = mult(matMV, translate(posSphere[i][0],
			-0.2, posSphere[i][1])); // 平移到相应位置
		matMV = mult(matMV, rotateX(90)); // 调整南北极
		if(toonShaderFlag) sphere.drawLine(matMV);
		sphere.draw(matMV);
		matMV = mvStack.pop();
	}
	
	/*绘制每个圆环*/
	for(var i = 0; i < numTours; i++){
		mvStack.push(matMV);
		matMV = mult(matMV, translate(posTours[i][0], 0.2, posTours[i][1]));
		matMV = mult(matMV, rotateY(yRot));
		if(toonShaderFlag) torus.drawLine(matMV);
		torus.draw(matMV);
		matMV = mvStack.pop();
	}

	/*绘制每棵树*/
	for(var i = 0; i < numTrees; i++){
		mvStack.push(matMV);
		matMV = mult(matMV, translate(posTrees[i][0], 0.0, posTrees[i][1]));
		mvStack.push(matMV);
		matMV = mult(matMV,scale(0.3, 3, 0.3));
		if(toonShaderFlag) cube.drawLine(matMV);
		cube.draw(matMV,null,treeTrunkTexObj);
		matMV = mvStack.pop();
		mvStack.push(matMV);
		matMV = mult(matMV, translate(0.0, 2, 0.0));
		if(i%2){
			matMV = mult(matMV, scale(3.5,3.5,3.5));
			if(toonShaderFlag) sphere.drawLine(matMV);
			sphere.draw(matMV,mtlTreeLeft,treeLeftTexObj);
		}
		else{
			matMV = mult(matMV, scale(1,1,1));
			if(toonShaderFlag) cube.drawLine(matMV);
			cube.draw(matMV,mtlTreeLeft,treeLeftTexObj);
		}
		matMV = mvStack.pop();
		matMV = mvStack.pop();
	}

	/*绘制墙体*/
	for(var i = 0; i < 4; i++){
		if(!isDrawWall[i]) continue;
		mvStack.push(matMV);
		matMV = mult(matMV, rotateY(i*90));
		matMV = mult(matMV, translate(0.0, 0.5, 21.0));
		for(var j = 0; j < 40; j+=2){
			mvStack.push(matMV);
			//matMV = mult(matMV, rotateX(180));
			matMV = mult(matMV, translate(j - 19, 0.0, 0.0));
			matMV = mult(matMV, scale(2,4,2));
			if(toonShaderFlag) cube.drawLine(matMV);
			cube.draw(matMV);
			matMV = mvStack.pop();
		}
		matMV = mvStack.pop();
	}

	// matMV = mult(matMV, translate(0.0, 0.0, -2.0));
	// gl.useProgram(programLine);
	// gl.uniform3fv(programLine.u_LineColor,vec3(1.0,0.0,0.0));
	// gl.uniform1f(programLine.u_LineWidth,0.036);
	// gl.uniform1f(programLine.u_Alpha,0.8);
	// gl.useProgram(program);
	// sphere.drawLine(matMV);
	// sphere.draw(matMV);

	for(var i=0;i<posWall.length;i++){
		if(!wallFlag[i]) {
			gl.useProgram(programLine);
			gl.uniform1f(programLine.u_LineWidth,-0.0005);
			gl.uniform1f(programLine.u_Alpha,0.4);
			gl.useProgram(program);
			gl.uniform1f(program.u_Alpha,0.4);
		}
		mvStack.push(matMV);
		matMV = mult(matMV, translate(posWall[i][0], 0.2, posWall[i][1]));
		if(toonShaderFlag||!wallFlag[i]) cube.drawLine(matMV);
		cube.draw(matMV);
		matMV = mvStack.pop();
		gl.useProgram(programLine);
		gl.uniform1f(programLine.u_Alpha,1.0);
		gl.uniform1f(programLine.u_LineWidth,lineWidth);
		gl.useProgram(program);
		gl.uniform1f(program.u_Alpha,1.0);
	}

	draw2D();	//绘制UI
	
	if(!hudOn)
		ctx.clearRect(0,0,800,600);
	
	requestAnimFrame(render); // 请求重绘
}

function chongwan() {
	location.reload(true);
}