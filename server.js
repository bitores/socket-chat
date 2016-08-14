var cookie=require('cookie');
var app = require('http').createServer(function(req, res){
	if(req.url == "/monitor") {
		res.writeHead(200);
		res.end("OK");
	} else {
		res.writeHead(404);
		res.end()
	}
}),
io = require("socket.io").listen(app);
// "websocket","htmlfile",
io.set('transports',['polling','xhr-polling','json-polling']),
io.set('heartbeat timeout', 5 * 60),
io.set('heartbeat interval', 4 * 60),
io.set('close timeout', 1 * 30),
io.set("log level", 1),
io.set("browser client", false),
io.set("browser client cache", false),
app.listen(8080);


var service = [
// {
// 	id:'ID00001',
// 	name:"客服1",
// 	loginTime: 1471049091418,
// 	cus:['xxxx-xxxx-xxxx-xxxx']
// },
// {
// 	id:'ID00002',
// 	name:"客服2",
// 	loginTime: 1471049091418,
// 	cus:['xxxx-xxxx-xxxx-xxxx']
// }
];
// 客服登录后 追加

var custumers = [
// {
// 	id:'xxxx-xxxx-xxxx-xxxx',
// 	name:'游客',
// 	loginTime: 1471049091418
// }
];

function removeUser(userid, usertype){
	// 客户不会回应客户了
	if(usertype === 5555){
		for (var j = custumers.length - 1; j >= 0; j--) {
			var cus = custumers[j];
			if(cus.id === userid) {
				custumers.splice(j,1);
				// break;
			}
		}

		for (var j = service.length - 1; j >= 0; j--) {
			var cus = service[j].cus;
			for (var k = cus.length - 1; k >= 0; k--) {
				if(cus[k] === userid) {
					service[j].cus.splice(k,1);
					// break;
				}
			}
		}
	} else if(usertype === 9999) {
		for (var j = service.length - 1; j >= 0; j--) {
			var ser = service[j];
			if(ser.id === userid) {
				var ser = service.splice(j,1);




				break;
			}
		}
	}
	

}

//--
function registerUser( socket, userinfo, relogin){
	// 记录socket建立时间/userid
	socket.userid=userinfo.userid;
	socket.usertype = userinfo.usertype;
	
	if(relogin === true){
		if(userinfo.usertype === 5555){
			for (var i = custumers.length - 1; i >= 0; i--) {
				if(custumers[i].id === userinfo.userid){
					custumers[i].loginTime = userinfo.time;
					custumers[i].psocket = custumers[i].psocket;
					socket.join(custumers[i].room);
					socket.room = custumers[i].room;
					break;
				}
			}
			// 设置TaskList中
			for (var i = TaskList.length - 1; i >= 0; i--) {
				var nowTask = TaskList[i];
				if(userinfo.userid === nowTask.userid){
					TaskList[i].connTime = socket.connTime;
					break;
				}
			}
		} else if(userinfo.usertype === 9999){
			console.log("registerUser ")
			for (var i = service.length - 1; i >= 0; i--) {
				if(service[i].id === userinfo.userid) {
					service[i].loginTime = userinfo.time;
					service[i].psocket = socket;
					socket.join(service[i].room);
					socket.room = service[i].room;
					break;
				}
			}
		}
		
	} else {
		var obj = {
			id: userinfo.userid,
			name: userinfo.username,
			loginTime: userinfo.time,
			psocket:socket,
			room:null
		};
		if(userinfo.usertype === 5555){
			// 分配客户给客服- 自动分配、客户转服
			service.sort(function(obj1,obj2){
				// 从小到大排序
				return obj1.cus.length > obj2.cus.length;
			})
			console.log('加入房间 ',service[0].id);
			// 储存客户信息
			
			socket.join(service[0].id);
			socket.room = service[0].id;
			service[0].cus.push(userinfo.userid);

			obj.room = service[0].id;
			obj.psocket = service[0].psocket;
			custumers.push(obj);
		} else if(userinfo.usertype === 9999){
			// service
			obj.cus = [];
			obj.room = obj.id;
			service.push(obj);
		}

		socket.join(obj.room);
		socket.room = obj.room;

	}
}

// 设置断开socket时间
var DISCONNECT_TIME = 1000 * 3;//* 60 * 5;
// 断开socket任务队列
var TaskList = [];
function Task(socket){
	// this.socket = socket;
	this.usertype = socket.usertype;
	this.userid = socket.userid;
	this.connTime = socket.creatTime;
	this.disconnTime = new Date().getTime();
}
//
setInterval(function(){
	var nowTime = new Date().getTime();
	for (var i = TaskList.length - 1; i >= 0; i--) {
		// 最后一次为disconn
		var nowTask = TaskList[i];
		if(nowTask.disconnTime>nowTask.connTime ){
			// 最后一欠dis时间差为5分钟
			if(nowTime - nowTask.disconnTime > DISCONNECT_TIME){
				// 连接超时
				console.log('删除客户')
				removeUser(nowTask.userid, nowTask.usertype);
				// console.log('删除Task')
				var socket = TaskList.splice(i,1);
				break;
			}else{
				console.log('等待重连');
			}
		}
	}
},DISCONNECT_TIME);


// http://www.cnblogs.com/xiezhengcai/p/3956401.html
io.sockets.on('connection', function( socket ) {
	// console.log('new connection....',socket.id);
	socket.connTime = new Date().getTime();

	socket.on('relogin', function( userinfo, relogin){
		console.log("relogin");
		registerUser(socket, userinfo, relogin);
		console.log('重连成功')
	})
	// 客户登录
	socket.on('login', function( userinfo, relogin) {
		console.log("login");
		socket.emit('login',userinfo);
		registerUser(socket, userinfo, relogin);
		// console.log(service);
	})

	socket.on('chat', function(msg, ack){
		console.log(msg);
		socket.emit('chat', msg);
		if(socket.usertype === 9999){
			console.log('向房间 ',socket.room, ' 广播其它');
			// socket.broadcast.emit('chat', msg);// 广播给其它游客
			// 向房间内所有人广播 - 如果此房间内，不会向他自己发
			socket.broadcast.to(socket.room).emit('chat', msg);
			// 向房间内所有人广播 - 如果此房间内，也会向他自己发
			// io.sockets.in('ID00001').emit('chat', msg);
			//向所有客户端广播 - 所有房间
			// io.sockets.emit("chat", msg);
		} else if(socket.usertype === 5555){

			var userid = socket.userid;
			for (var i = custumers.length - 1; i >= 0; i--) {
				var cus = custumers[i];
				if(cus.id === userid) {
					var psocket = cus.psocket;

					psocket.emit('chat', msg);
					break;
				}
			}

		}
	})

	socket.on('disconnect', function(data) {
		// 客户端主动断开,data
		console.log('disconnect....');
		// 删除 客户socket,定时消除用户id，因为用户端
		// 很可能重连，所以避免重连时用户还在
		// 删除 客户id

		//
		if(!data || data.toString() == "transport error" || data.toString() == "socket end"){
			console.log("删除客户");
			removeUser(socket.userid,socket.usertype);
			socket.leave(socket.room);
		} else {
			var inTask = false;
			for (var i = TaskList.length - 1; i >= 0; i--) {
				var nowTask = TaskList[i];
				if(socket.userid === nowTask.userid){
					TaskList[i].disconnTime = new Date().getTime();
					inTask = true;
					break;
				}
			}
			if(inTask == false){
				TaskList.push(new Task(socket));
			}
		}

		// console.log(data)
		// if(!data || data.toString() == "close timeout" || data.toString() == "socket end"){
		// if(!data || data.toString() == "ping timeout" || data.toString() == "transports error"){
		// transport error/ transport close/ client close/ping timeout/ close timeout/socket end
		// }
	})
})
