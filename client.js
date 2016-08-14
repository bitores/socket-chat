(function (w,d) {
	var p = parseInt,
	dd = d.documentElement,
	db = d.body,
	dc = d.compatMode == 'CSS1Compat',
	dx = dc ? dd: db,
	ec = encodeURIComponent;
	
	
	w.CHAT = {
		msgObj:d.getElementById("message"),
		screenheight:w.innerHeight ? w.innerHeight : dx.clientHeight,
		username:"我",
		userid:null,
		socket:null,
		//让浏览器滚动条保持在最低部
		scrollToBottom:function(){
			w.scrollTo(0, this.msgObj.clientHeight);
		},
		//退出，本例只是一个简单的刷新
		logout:function(){
			console.log('退出')
			
			this.socket.emit('logout');
			// location.reload();
			this.socket.disconnect();
		},
		//提交聊天消息内容
		submit:function(){
			var content = d.getElementById("content").value;
			if(content != ''){
				var obj = {
					userid: this.userid,
					username: this.username,
					content: content
				};
				this.socket.emit('chat', obj);
				d.getElementById("content").value = '';
			}
			return false;
		},
		genUid:function(){
			var len = 32, radix = 16;
			// return new Date().getTime()+""+Math.floor(Math.random()*899+100);
			var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
		    var uuid = [], i;
		    radix = radix || chars.length;
		 
		    if (len) {
		      // Compact form
		      for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
		    } else {
		      // rfc4122, version 4 form
		      var r;
		 
		      // rfc4122 requires these characters
		      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
		      uuid[14] = '4';
		 
		      // Fill in random data.  At i==19 set the high bits of clock sequence as
		      // per rfc4122, sec. 4.1.5
		      for (i = 0; i < 36; i++) {
		        if (!uuid[i]) {
		          r = 0 | Math.random()*16;
		          uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
		        }
		      }
		    }
		 
		    return uuid.join('');
		},
		//更新系统消息，本例中在用户加入、退出的时候调用
		updateSysMsg:function( action){
			//添加系统消息
			var html = '';
			html += '<div class="msg-system">';
			// html += user.username;
			html += (action == 'login') ? ' 加入了聊天室' : ' 退出了聊天室';
			html += '</div>';
			var section = d.createElement('section');
			section.className = 'system J-mjrlinkWrap J-cutMsg';
			section.innerHTML = html;
			this.msgObj.appendChild(section);	
			this.scrollToBottom();
		},
		//第一个界面用户提交用户名
		usernameSubmit:function(){
			var username = d.getElementById("username").value;
			if(username != ""){
				d.getElementById("username").value = '';
				d.getElementById("loginbox").style.display = 'none';
				d.getElementById("chatbox").style.display = 'block';
				this.init(username);
			}
			return false;
		},
		init:function(username){//
			/*
			客户端根据时间和随机数生成uid,这样使得聊天室用户名称可以重复。
			实际项目中，如果是需要用户登录，那么直接采用用户的uid来做标识就可以
			*/
			var db = {
				'客服01':'ID00001',
				'客服02':'ID00002'
			};

			var me = this;
			if(db.hasOwnProperty(username)){
				me.userid = db[username];
				me.usertype = 9999;
				me.username = username;
			} else {
				me.userid = me.genUid();
				me.usertype = 5555;
				me.username = "游客";
			}
			
			
			d.getElementById("showusername").innerHTML = me.username;
			//this.msgObj.style.minHeight = (this.screenheight - db.clientHeight + this.msgObj.clientHeight) + "px";
			me.scrollToBottom();
			
			//连接websocket后端服务器
			me.socket = io.connect('ws://192.168.1.100:8080',{
				// 'force new connection': false,
				// 'reconnect': false,
				// 'reconnection delay': 200,
				// 'max reconnection attempts': 10
			});

			me.socket.on('disconnect', function(){
				console.log("服务主动断开");
			});

			me.socket.on('reconnect', function(transport_type,reconnectionAttempts){
			    // console.log('重新连接到服务器',transport_type,reconnectionAttempts);
			    me.socket.emit('relogin',{userid:me.userid, username: me.username, usertype:me.usertype, time:new Date().getTime()}, true);
			});
			
			//告诉服务器端有用户登录
			me.socket.emit('login', {userid:me.userid, username: me.username, usertype:me.usertype, time:new Date().getTime()}, false);
			
			//监听登录状态
			me.socket.on('login', function(o){
				CHAT.updateSysMsg('login');	
			});
			
			//监听客服退出
			me.socket.on('logout', function(o){
				CHAT.updateSysMsg('logout');
			});
			
			//监听消息发送
			me.socket.on('chat', function(obj){
				var isme = (obj.userid == CHAT.userid) ? true : false;
				var contentDiv = '<div>'+obj.content+'</div>';
				var usernameDiv = '<span>'+obj.username+'</span>';
				
				var section = d.createElement('section');
				if(isme){
					section.className = 'user';
					section.innerHTML = contentDiv + usernameDiv;
				} else {
					section.className = 'service';
					section.innerHTML = usernameDiv + contentDiv;
				}
				// console.log(section);
				CHAT.msgObj.appendChild(section);
				CHAT.scrollToBottom();	
			});

		}
	};

	//通过“回车”提交用户名
	d.getElementById("username").onkeydown = function(e) {
		e = e || event;
		if (e.keyCode === 13) {
			CHAT.usernameSubmit();
		}
	};
	//通过“回车”提交信息
	d.getElementById("content").onkeydown = function(e) {
		e = e || event;
		if (e.keyCode === 13) {
			CHAT.submit();
		}
	};
})(window,document);