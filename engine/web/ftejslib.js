
mergeInto(LibraryManager.library,
{
	//generic handles array
	//yeah, I hope you don't use-after-free. hopefully that sort of thing will be detected on systems with easier non-mangled debuggers.
	$FTEH__deps: [],
	$FTEH: {
		h: [],
		f: {}
	},

	//FIXME: split+merge by \n
	emscriptenfte_print : function(msg)
	{
		FTEC.linebuffer += Pointer_stringify(msg);
		for(;;)
		{
			nl = FTEC.linebuffer.indexOf("\n");
			if (nl == -1)
				break;
			console.log(FTEC.linebuffer.substring(0, nl));
			FTEC.linebuffer = FTEC.linebuffer.substring(nl+1);
		}
	},
	emscriptenfte_alert : function(msg)
	{
		msg = Pointer_stringify(msg);
		console.log(msg);
		alert(msg);
	},

	emscriptenfte_handle_alloc__deps : ['$FTEH'],
	emscriptenfte_handle_alloc : function(h)
	{
		for (var i = 0; FTEH.h.length; i+=1)
		{
			if (FTEH.h[i] == null)
			{
				FTEH.h[i] = h;
				return i;
			}
		}
		i = FTEH.h.length;
		FTEH.h[i] = h;
		return i;
	},

	//temp files
	emscriptenfte_buf_createfromarraybuf__deps : ['emscriptenfte_handle_alloc'],
	emscriptenfte_buf_createfromarraybuf : function(buf)
	{
		var len = buf.length;
		var b = {h:-1, r:1, l:len,m:len,d:new Uint8Array(buf), n:null};
		b.h = _emscriptenfte_handle_alloc(b);
		return b.h;
	},

	$FTEC__deps : ['emscriptenfte_buf_createfromarraybuf'],
	$FTEC:
	{
		ctxwarned:0,
		pointerislocked:0,
		pointerwantlock:0,
		linebuffer:'',
		w: -1,
		h: -1,
		donecb:0,
		evcb: {
			resize:0,
			mouse:0,
			button:0,
			key:0,
			loadfile:0,
			jbutton:0,
			jaxis:0,
			wantfullscreen:0
		},

		loadurl : function(url, mime, arraybuf)
		{
			if (FTEC.evcb.loadfile != 0)
			{
				var handle = -1;
				if (arraybuf !== undefined)
					handle = _emscriptenfte_buf_createfromarraybuf(arraybuf);	
				var urlptr = _malloc(url.length+1);
				writeStringToMemory(url, urlptr);
				var mimeptr = _malloc(mime.length+1);
				writeStringToMemory(mime, mimeptr);
				Runtime.dynCall('viii', FTEC.evcb.loadfile, [urlptr, mimeptr, handle]);
				_free(mimeptr);
				_free(urlptr);
				window.focus();
			}
		},

		handleevent : function(event)
		{
			switch(event.type)
			{
				case 'message':
					console.log(event);
					console.log(event.data);
					FTEC.loadurl(event.data.url, event.data.cmd, undefined);
					break;
				case 'resize':
					if (FTEC.evcb.resize != 0)
						Runtime.dynCall('vii', FTEC.evcb.resize, [Module['canvas'].width, Module['canvas'].height]);
					break;
				case 'mousemove':
					if (FTEC.evcb.mouse != 0)
					{
						if (Browser.pointerLock)
						{
							if (typeof event.movementX === 'undefined')
							{
								event.movementX = event.mozMovementX;
								event.movementY = event.mozMovementY;
							}
							if (typeof event.movementX === 'undefined')
							{
								event.movementX = event.webkitMovementX;
								event.movementY = event.webkitMovementY;
							}
							Runtime.dynCall('viidddd', FTEC.evcb.mouse, [0, false, event.movementX, event.movementY, 0, 0]);
						}
						else
							Runtime.dynCall('viidddd', FTEC.evcb.mouse, [0, true, event.pageX, event.pageY, 0, 0]);
					}
					break;
				case 'mousedown':
					window.focus();
					//older browsers need fullscreen in order for requestPointerLock to work.
					//newer browsers can still break pointer locks when alt-tabbing, even without breaking fullscreen.
					//so lets spam requests for it
					if (Browser.isFullScreen == 0)
					if (FTEC.evcb.wantfullscreen != 0)
					if (Runtime.dynCall('i', FTEC.evcb.wantfullscreen, []))
					{
						Browser.requestFullScreen(true, true);
					}
					if (FTEC.pointerwantlock != 0 && FTEC.pointerislocked == 0)
					{
						FTEC.pointerislocked = -1;  //don't repeat the request on every click. firefox has a fit at that, so require the mouse to leave the element or something before we retry.
						Module['canvas'].requestPointerLock();
					}
					//fallthrough
				case 'mouseup':
					if (FTEC.evcb.button != 0)
					{
						Runtime.dynCall('viii', FTEC.evcb.button, [0, event.type=='mousedown', event.button]);
						event.preventDefault();
					}
					break;
				case 'mousewheel':
				case 'wheel':
					if (FTEC.evcb.button != 0)
					{
						Runtime.dynCall('viii', FTEC.evcb.button, [0, 2, event.deltaY]);
						event.preventDefault();
					}
					break;
				case 'mouseout':
					if (FTEC.evcb.button != 0)
					{
						for (var i = 0; i < 8; i++)	
							Runtime.dynCall('viii', FTEC.evcb.button, [0, false, i]);
					}
					if (FTEC.pointerislocked == -1)
						FTEC.pointerislocked = 0;
					break;
				case 'focus':
				case 'blur':
					Runtime.dynCall('iiiii', FTEC.evcb.key, [0, false, 16, 0]); //shift
					Runtime.dynCall('iiiii', FTEC.evcb.key, [0, false, 17, 0]); //alt
					Runtime.dynCall('iiiii', FTEC.evcb.key, [0, false, 18, 0]); //ctrl
					if (FTEC.pointerislocked == -1)
						FTEC.pointerislocked = 0;
					break;
				case 'keypress':
					if (FTEC.evcb.key != 0)
					{
						if (event.charCode >= 122 && event.charCode <= 123)	//no f11/f12
							break;
						Runtime.dynCall('iiiii', FTEC.evcb.key, [0, 1, 0, event.charCode]);
						Runtime.dynCall('iiiii', FTEC.evcb.key, [0, 0, 0, event.charCode]);
						event.preventDefault();
						event.stopPropagation();
					}
					break;
				case 'keydown':
				case 'keyup':
					//122 is 'toggle fullscreen'.
					//we don't steal that because its impossible to leave it again once used.
					if (FTEC.evcb.key != 0 && event.keyCode != 122)
					{
						if (Runtime.dynCall('iiiii', FTEC.evcb.key, [0, event.type=='keydown', event.keyCode, 0]))
							event.preventDefault();
					}
					break;
				case 'touchstart':
				case 'touchend':
				case 'touchcancel':
				case 'touchleave':
				case 'touchmove':
					var touches = event.changedTouches;
					for (var i = 0; i < touches.length; i++)
					{
						var t = touches[i];
						if (FTEC.evcb.mouse)
							Runtime.dynCall('viidddd', FTEC.evcb.mouse, [t.identifier+1, true, t.pageX, t.pageY, 0, Math.sqrt(t.radiusX*t.radiusX+t.radiusY*t.radiusY)]);
						if (FTEC.evcb.button)
						{
							if (event.type == 'touchstart')
								Runtime.dynCall('viii', FTEC.evcb.button, [t.identifier+1, 1, 0]);
							else if (event.type != 'touchmove')
								Runtime.dynCall('viii', FTEC.evcb.button, [t.identifier+1, 0, 0]);
						}
					}
					event.preventDefault();
					break;
				case 'dragenter':
				case 'dragover':
					event.stopPropagation();
					event.preventDefault();
					break;
				case 'drop':
					event.stopPropagation();
					event.preventDefault();
					var files = event.dataTransfer.files;
					for (var i = 0; i < files.length; i++)
					{
						var file = files[i];
						var reader = new FileReader();
						reader.onload = function(evt)
						{
							FTEC.loadurl(file.name, "", evt.target.result);
						};
						reader.readAsArrayBuffer(file);
					}
					break;
				case 'gamepadconnected':
					var gp = e.gamepad;
					if (FTEH.gamepads === undefined)
						FTEH.gamepads = [];
					FTEH.gamepads[gp.index] = gp;
					console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.", gp.index, gp.id, gp.buttons.length, gp.axes.length);
					break;
				case 'gamepaddisconnected':
					var gp = e.gamepad;
					delete FTEH.gamepads[gp.index];
					if (FTEC.evcb.jaxis)	//try and clear out the axis when released.
						for (var j = 0; j < 6; j+=1)
							Runtime.dynCall('viid', FTEC.evcb.jaxis, [gp.index, j, 0]);
					if (FTEC.evcb.jbutton)	//try and clear out the axis when released.
						for (var j = 0; j < 32+4; j+=1)
							Runtime.dynCall('viid', FTEC.evcb.jbutton, [gp.index, j, 0]);
					console.log("Gamepad disconnected from index %d: %s", gp.index, gp.id);
					break;
				case 'pointerlockchange':
				case 'mozpointerlockchange':
				case 'webkitpointerlockchange':
					FTEC.pointerislocked =	document.pointerLockElement === Module['canvas'] ||
											document.mozPointerLockElement === Module['canvas'] ||
											document.webkitPointerLockElement === Module['canvas'];
					console.log("Pointer lock now " + FTEC.pointerislocked);
					break;
				default:
					console.log(event);
					break;
			}
		}
	},
	emscriptenfte_updatepointerlock : function(wantlock, softcursor)
	{
		FTEC.pointerwantlock = wantlock;
		//we can only apply locks when we're clicked, but should be able to unlock any time.
		if (wantlock == 0 && FTEC.pointerislocked != 0)
		{
			document.exitPointerLock =	document.exitPointerLock    ||
										document.mozExitPointerLock ||
										document.webkitExitPointerLock;
			FTEC.pointerislocked = 0;
			if (document.exitPointerLock)
				document.exitPointerLock();
		}
		if (softcursor)
			Module.canvas.style.cursor = "none";	//hide the cursor, we'll do a soft-cursor when one is needed.
		else
			Module.canvas.style.cursor = "default";	//restore the cursor
	},
	emscriptenfte_polljoyevents : function()
	{
		//with events, we can do unplug stuff properly.
		//otherwise hot unplug might be buggy.
		var gamepads;
		if (FTEH.gamepads !== undefined)
			gamepads = FTEH.gamepads;
		else
			gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);

		if (gamepads !== undefined)
		for (var i = 0; i < gamepads.length; i+=1)
		{
			var gp = gamepads[i];
			if (gp === undefined)
				continue;
			for (var j = 0; j < gp.buttons.length; j+=1)
			{
				var b = gp.buttons[j];
				var p;
				if (typeof(b) == "object")
				{
					p = b.pressed;
					if (b.lastframe != p)
					{	//cache it to avoid spam
						b.lastframe = p;
						Runtime.dynCall('viii', FTEC.evcb.jbutton, [gp.index, j, p]);
					}
				}
				else
				{//old chrome bug
					p = b==1.0;
					//warning: no cache. this is going to be spammy.
					Runtime.dynCall('viii', FTEC.evcb.jbutton, [gp.index, j, p]);
				}
			}
			for (var j = 0; j < gp.axes.length; j+=1)
				Runtime.dynCall('viid', FTEC.evcb.jaxis, [gp.index, j, gp.axes[j]]);
		}
	},
	emscriptenfte_setupcanvas__deps: ['$FTEC', '$Browser', 'emscriptenfte_buf_createfromarraybuf'],
	emscriptenfte_setupcanvas : function(nw,nh,evresize,evmouse,evmbutton,evkey,evfile,evjbutton,evjaxis,evwantfullscreen)
	{
		FTEC.evcb.resize = evresize;
		FTEC.evcb.mouse = evmouse;
		FTEC.evcb.button = evmbutton;
		FTEC.evcb.key = evkey;
		FTEC.evcb.loadfile = evfile;
		FTEC.evcb.jbutton = evjbutton;
		FTEC.evcb.jaxis = evjaxis;
		FTEC.evcb.wantfullscreen = evwantfullscreen;

		if ('GamepadEvent' in window)
			FTEH.gamepads = [];	//don't bother ever trying to poll if we can use gamepad events. this will hopefully avoid weirdness.

		if (!FTEC.donecb)
		{
			FTEC.donecb = 1;
			var events = ['mousedown', 'mouseup', 'mousemove', 'wheel', 'mousewheel', 'mouseout', 
						'keypress', 'keydown', 'keyup', 
						'touchstart', 'touchend', 'touchcancel', 'touchleave', 'touchmove',
						'dragenter', 'dragover', 'drop',
						'gamepadconnected', 'gamepaddisconnected',
						'message', 
						'pointerlockchange', 'mozpointerlockchange', 'webkitpointerlockchange',
						'focus', 'blur'];   //try to fix alt-tab
			events.forEach(function(event)
			{
				Module['canvas'].addEventListener(event, FTEC.handleevent, true);
			});

			var docevents = ['keypress', 'keydown', 'keyup',
							'pointerlockchange', 'mozpointerlockchange', 'webkitpointerlockchange'];
			docevents.forEach(function(event)
			{
				document.addEventListener(event, FTEC.handleevent, true);
			});

			var windowevents = ['message'];
			windowevents.forEach(function(event)
			{
				window.addEventListener(event, FTEC.handleevent, true);
			});

			Browser.resizeListeners.push(function(w, h) {
				FTEC.handleevent({
					type: 'resize',
				});
			});
		}
		var ctx = Browser.createContext(Module['canvas'], true, true);
		if (ctx == null)
		{
			var msg = "Unable to set up webgl context.\n\nPlease use a browser that supports it and has it enabled\nYour graphics drivers may also be blacklisted, so try updating those too. woo, might as well update your entire operating system while you're at it.\nIt'll be expensive, but hey, its YOUR money, not mine.\nYou can probably just disable the blacklist, but please don't moan at me when your computer blows up, seriously, make sure those drivers are not too buggy.\nI knew a guy once. True story. Boring, but true.\nYou're probably missing out on something right now. Don't you just hate it when that happens?\nMeh, its probably just tinkertoys, right?\n\nYou know, you could always try Internet Explorer, you never know, hell might have frozen over.\nDon't worry, I wasn't serious.\n\nTum te tum. Did you get it working yet?\nDude, fix it already.\n\nThis message was brought to you by Sleep Deprivation, sponsoring quake since I don't know when";
			if (FTEC.ctxwarned == 0)
			{
				FTEC.ctxwarned = 1;
				console.log(msg);
				alert(msg);
			}
			return 0;
		}
//		Browser.setCanvasSize(nw, nh, false);

		window.onresize = function()
		{
			//emscripten's browser library will revert sizes wrongly or something when we're fullscreen, so make sure that doesn't happen.
//			if (Browser.isFullScreen)
//			{
//				Browser.windowedWidth = window.innerWidth;
//				Browser.windowedHeight = window.innerHeight;
//			}
//			else
				Browser.setCanvasSize(window.innerWidth, window.innerHeight, false);
			if (FTEC.evcb.resize != 0)
				Runtime.dynCall('vii', FTEC.evcb.resize, [Module['canvas'].width, Module['canvas'].height]);
		};
		window.onresize();

		if (FTEC.evcb.hashchange)
		{
			window.onhashchange = function()
			{
				FTEC.loadurl(location.hash.substring(1), "", undefined);
			};
		}
		
		_emscriptenfte_updatepointerlock(false, false);

		return 1;
	},
	emscriptenfte_settitle : function(txt)
	{
		document.title = Pointer_stringify(txt);
	},
	emscriptenfte_abortmainloop : function(fname)
	{
		fname = Pointer_stringify(fname);
		throw 'oh noes! something bad happened in ' + fname + '!\n' + Module['stackTrace']();
	},

	emscriptenfte_setupmainloop : function(fnc)
	{
		Module['noExitRuntime'] = true;

		//Module.abort = abort = function(msg) {};

		Module["sched"] = function()
		{
			var dovsync = false;
			if (ABORT)
				return;
			try
			{
				dovsync = Runtime.dynCall('i', fnc, []);
			}
			catch(err)
			{
				console.log(err);
			}
			if (dovsync)
				Browser.requestAnimationFrame(Module["sched"]);
			else
				setTimeout(Module["sched"], 0);
		};
		//don't start it instantly, so we can distinguish between types of errors (emscripten sucks!).
		setTimeout(Module["sched"], 1);
	},

	emscriptenfte_ticks_ms : function()
	{
		return Date.now();
	},

	emscriptenfte_buf_create__deps : ['emscriptenfte_handle_alloc'],
	emscriptenfte_buf_create : function()
	{
		var b = {h:-1, r:1, l:0,m:4096,d:new Uint8Array(4096), n:null};
		b.h = _emscriptenfte_handle_alloc(b);
		return b.h;
	},
	//filesystem emulation
	emscriptenfte_buf_open__deps : ['emscriptenfte_buf_create'],
	emscriptenfte_buf_open : function(name, createifneeded)
	{
		name = Pointer_stringify(name);
		var f = FTEH.f[name];
		var r = -1;
		if (f == null)
		{
			if (window.localStorage && createifneeded != 2)
			{
				var str = window.localStorage.getItem(name);
				if (str != null)
				{
//					console.log('read file '+name+': ' + str);

					var len = str.length;
					var buf = new Uint8Array(len);
					for (var i = 0; i < len; i++)
						buf[i] = str.charCodeAt(i);

					var b = {h:-1, r:2, l:len,m:len,d:buf, n:name};
					r = b.h = _emscriptenfte_handle_alloc(b);
					FTEH.f[name] = b;
					return b.h;
				}
			}

			if (createifneeded)
				r = _emscriptenfte_buf_create();
			if (r != -1)
			{
				f = FTEH.h[r];
				f.r+=1;
				f.n = name;
				FTEH.f[name] = f;
				if (FTEH.f[name] != f || f.n != name)
					console.log('error creating file '+name);
			}
		}
		else
		{
			f.r+=1;
			r = f.h;
		}
		if (f != null && createifneeded == 2)
			f.l = 0;  //truncate it.
		return r;
	},
	emscriptenfte_buf_rename : function(oldname, newname)
	{
		oldname = Pointer_stringify(oldname);
		newname = Pointer_stringify(newname);
		var f = FTEH.f[oldname];
		if (f == null)
			return 0;
		if (FTEH.f[newname] != null)
			return 0;
		FTEH.f[newname] = f;
		delete FTEH.f[oldname];
		f.n = newname;
		return 1;
	},
	emscriptenfte_buf_delete : function(name)
	{
		name = Pointer_stringify(name);
		var f = FTEH.f[name];
		if (f)
		{
			delete FTEH.f[name];
			f.n = null;
			emscriptenfte_buf_release(f.h);
			return 1;
		}
		return 0;
	},
	emscriptenfte_buf_pushtolocalstore : function(handle)
	{
		var b = FTEH.h[handle];
		if (b == null)
		{
			Module.printError('emscriptenfte_buf_pushtolocalstore with invalid handle');
			return;
		}
		if (b.n == null)
			return;
		var data = b.d;
		var len = b.l;
		if (window.localStorage)
		{
			var foo = "";
			//use a divide and conquer implementation instead for speed?
			for (var i = 0; i < len; i++)
				foo += String.fromCharCode(data[i]);
			window.localStorage.setItem(b.n, foo);
		}
		else
			console.log('local storage not supported');
	},
	emscriptenfte_buf_release : function(handle)
	{
		var b = FTEH.h[handle];
		if (b == null)
		{
			Module.printError('emscriptenfte_buf_release with invalid handle');
			return;
		}
		b.r -= 1;
		if (b.r == 0)
		{
			if (b.n != null)
				delete FTEH.f[b.n];
			delete FTEH.h[handle];
			b.d = null;
		}
	},
	emscriptenfte_buf_getsize : function(handle)
	{
		var b = FTEH.h[handle];
		return b.l;
	},
	emscriptenfte_buf_read : function(handle, offset, data, len)
	{
		var b = FTEH.h[handle];
		if (offset+len > b.l)	//clamp the read
			len = b.l - offset;
		if (len < 0)
		{
			len = 0;
			if (offset+len >= b.l)
				return -1;
		}
		HEAPU8.set(b.d.subarray(offset, offset+len), data);
		return len;
	},
	emscriptenfte_buf_write : function(handle, offset, data, len)
	{
		var b = FTEH.h[handle];
		if (len < 0)
			len = 0;
		if (offset+len > b.m)
		{	//extend it if needed.
			b.m = offset + len + 4095;
			b.m = b.m & ~4095;
			var nd = new Uint8Array(b.m);
			nd.set(b.d, 0);
			b.d = nd;
		}
		b.d.set(HEAPU8.subarray(data, data+len), offset);
		if (offset + len > b.l)
			b.l = offset + len;
		return len;
	},

	emscriptenfte_ws_connect__deps: ['emscriptenfte_handle_alloc'],
	emscriptenfte_ws_connect : function(url)
	{
		var _url = Pointer_stringify(url);
		var s = {ws:null, inq:[], err:0, con:0};
		s.ws = new WebSocket(_url, 'binary');
		if (s.ws === undefined)
			return -1;
		s.ws.onerror = function(event) {s.con = 0; s.err = 1;};
		s.ws.onclose = function(event) {s.con = 0; s.err = 1;};
		s.ws.onopen = function(event) {s.con = 1;};
		s.ws.onmessage = function(event)
			{
				assert(typeof event.data !== 'string' && event.data.byteLength);
				s.inq.push(new Uint8Array(event.data));
			};

		return _emscriptenfte_handle_alloc(s);
	},
	emscriptenfte_ws_close : function(sockid)
	{
		var s = FTEH.h[sockid];
		if (s === undefined)
			return -1;
		s.ws.close();
		s.ws = null;	//make sure to avoid circular references
		delete FTEH.h[sockid];	//socked is no longer accessible.
		return 0;
	},
	//separate call allows for more sane flood control when fragmentation is involved.
	emscriptenfte_ws_cansend : function(sockid, extra, maxpending)
	{
		var s = FTEH.h[sockid];
		if (s === undefined)
			return 1;	//go on punk, make my day.
		return ((s.ws.bufferedAmount+extra) < maxpending);
	},
	emscriptenfte_ws_send : function(sockid, data, len)
	{
		var s = FTEH.h[sockid];
		if (s === undefined)
			return -1;
		if (s.con == 0 || len < 1 || len > 125)
			return 0; //not connected yet
		s.ws.send(HEAPU8.subarray(data, data+len).buffer);
		return len;
	},
	emscriptenfte_ws_recv : function(sockid, data, len)
	{
		var s = FTEH.h[sockid];
		if (s === undefined)
			return -1;
		var inp = s.inq.shift();
		if (inp)
		{
			if (inp.length > len)
				inp.length = len;
			HEAPU8.set(inp, data);
			return inp.length;
		}
		if (s.err)
			return -1;
		return 0;
	},



	emscriptenfte_async_wget_data2 : function(url, ctx, onload, onerror, onprogress)
	{
		var _url = Pointer_stringify(url);
		console.log("Attempting download of " + _url);
		var http = new XMLHttpRequest();
		http.open('GET', _url, true);
		http.responseType = 'arraybuffer';

		http.onload = function(e)
		{
console.log("onload: " + _url + " status " + http.status);
			if (http.status == 200)
			{
				var bar = new Uint8Array(http.response);
				var buf = _malloc(bar.length);
				HEAPU8.set(bar, buf);
				if (onload)
					Runtime.dynCall('viii', onload, [ctx, buf, bar.length]);
			}
			else
			{
				if (onerror)
					Runtime.dynCall('vii', onerror, [ctx, http.status]);
			}
		};

		http.onerror = function(e)
		{
console.log("onerror: " + _url + " status " + http.status);
			if (onerror)
				Runtime.dynCall('vii', onerror, [ctx, http.status]);
		};

		http.onprogress = function(e)
		{
			if (onprogress)
				Runtime.dynCall('viii', onprogress, [ctx, e.loaded, e.total]);
		};

		http.send(null);
	},

	emscriptenfte_al_loadaudiofile : function(buf, dataptr, datasize)
	{
		//match emscripten's openal support.
		if (!buf)
			return;
		buf = buf - 1;

		var ctx = AL.currentContext;
		try
		{
			//its async, so it needs its own copy of an arraybuffer
			var abuf = new ArrayBuffer(datasize);
			new Uint8Array(abuf).set(HEAPU8.subarray(dataptr, dataptr+datasize));
			AL.currentContext.ctx.decodeAudioData(abuf, function(buffer)
			{
				ctx.buf[buf] = buffer;
			}, function()
			{
				console.log("Audio Callback failed!");
			});
		}
		catch (e)
		{
			console.log("unable to decode audio data");
			console.log(e);
		}
	},

	emscriptenfte_gl_loadtexturefile : function(texid, widthptr, heightptr, dataptr, datasize)
	{
		function encode64(data) {
			var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
			var PAD = '=';
			var ret = '';
			var leftchar = 0;
			var leftbits = 0;
			for (var i = 0; i < data.length; i++) {
				leftchar = (leftchar << 8) | data[i];
				leftbits += 8;
				while (leftbits >= 6) {
					var curr = (leftchar >> (leftbits-6)) & 0x3f;
					leftbits -= 6;
					ret += BASE[curr];
				}
			}
			if (leftbits == 2) {
				ret += BASE[(leftchar&3) << 4];
				ret += PAD + PAD;
			} else if (leftbits == 4) {
				ret += BASE[(leftchar&0xf) << 2];
				ret += PAD;
			}
			return ret;
		}

		//make sure the texture is defined before its loaded, so we get no errors
		GLctx.texImage2D(GLctx.TEXTURE_2D, 0, GLctx.RGBA, 1,1,0,GLctx.RGBA, GLctx.UNSIGNED_BYTE, null);

		var img = new Image();
		var gltex = GL.textures[texid];
		img.onload = function()
		{
			console.log("Image Callback called!");
			var oldtex = GLctx.getParameter(GLctx.TEXTURE_BINDING_2D);	//blurgh, try to avoid breaking anything in this unexpected event.
			GLctx.bindTexture(GLctx.TEXTURE_2D, gltex);
			GLctx.texImage2D(GLctx.TEXTURE_2D, 0, GLctx.RGBA, GLctx.RGBA, GLctx.UNSIGNED_BYTE, img);
			GLctx.generateMipmap(GLctx.TEXTURE_2D);
			GLctx.bindTexture(GLctx.TEXTURE_2D, oldtex);
		};
		img.crossorigin = true;
		img.src = "data:image/png;base64," + encode64(HEAPU8.subarray(dataptr, dataptr+datasize));
		img.onload();
	}
});