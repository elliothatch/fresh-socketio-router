var Router = require('router');
var query = require('./middleware/query');

function FreshSocketIoRouter(router, options) {
	opts = Object.create(options || null);
	// create a router and install the provided router as middleware.
	// this allows us to inject middleware before the user's router.
	var baseRouter = new Router();

	if(opts.ignoreList) {
		if(Array.isArray(opts.ignoreList)) {
			// inject empty handler to eat requests that match entries in the ignore list
			baseRouter.all(opts.ignoreList, function(req, res) {
				// do nothing
			});
		}
		else {
			if(!opts.silent) {
				console.warn('WARNING: fresh-socketio-router: FreshSocketIoRouter: ignoreList is not an array, and will not be used');
			}
		}
	}

	// standard middleware
	baseRouter.use(query());
	
	if(router instanceof Router) {
		baseRouter.use(router);
	}
	else {
		if(!opts.silent) {
			console.warn('WARNING: fresh-socketio-router: FreshSocketIoRouter: no router/invalid router. router will not be used');
		}
	}

	app = function(socket, next) {
		var oldOnEvent = socket.onevent;
		socket.onevent = function(packet) {
			var args = packet.data || [undefined, {}];
			handleSocketEvent(baseRouter, opts, socket, args[0], args[1]);
			oldOnEvent.apply(socket, arguments);
		};
		next();
	};

	app.baseRouter = router;

	return app;
}

function handleSocketEvent(router, opts, socket, route, message) {
	var req = new SocketIoRequest(socket, route, message);
	var res = new SocketIoResponse(socket, route);
	req.res = res;
	res.req = req;
	var freshRequestId = req.get('X-Fresh-Request-Id');
	if(freshRequestId) {
		res.headers['X-Fresh-Request-Id'] = freshRequestId;
	}
	router(req, res, finalHandler(req, res, opts));
}

function finalHandler(req, res, options) {
	opts = Object.create(options || null);
	var env = opts.env || process.env.NODE_ENV || 'development';
	var onerror = opts.onerror || logerror;
	function logerror(err) {
		if(!opts.silent) {
			console.error(err.stack || err.toString());
		}
	}
	return function(err) {
		var status = res.statusCode;
		var message = STATUS_CODES[status];
		// unhandled error
		if (err) {
			// respect err.statusCode
			if (err.statusCode) {
				status = err.statusCode;
			}

			// respect err.status
			if (err.status) {
				status = err.status;
			}

			// default status code to 500
			if (!status || status < 400) {
				status = 500;
			}

			// non-production gets full stack output
			if(env !== 'production') {
				message = err.stack || err.toString();
			}
		}
		else {
			status = 404;
			message = 'Cannot ' + req.method + ' ' + (req.originalUrl || req.url);
		}

		res.status(status).send(message);
		if(err && onerror) {
			onerror(err, req, res);
		}
	};
}

function SocketIoRequest (socket, route, message) {
	this.socket = socket;
	this.url = route || '/';
	this.originalUrl = this.url;
	this.message = message || {};
	this.method = this.message.method && this.message.method.toUpperCase() || 'GET';
	this.headers = this.message.headers || {};
	this.body = this.message.body;
}

SocketIoRequest.prototype.method = 'GET';
SocketIoRequest.prototype.get = function(field) {
	return this.headers && this.headers[field];
};
SocketIoRequest.prototype.header = SocketIoRequest.prototype.get;

function SocketIoResponse (socket, route) {
	this.socket = socket;
	this.headers = {};
	this.sentResponse = false;
	// emitUrl only goes up until the first question mark
	this.emitUrl = route || '/';
	var questionMarkIndex = this.emitUrl.indexOf('?');
	if(questionMarkIndex !== -1) {
		this.emitUrl = this.emitUrl.substring(0, questionMarkIndex);
	}
}

SocketIoResponse.prototype.statusCode = 200;

SocketIoResponse.prototype.set = function(field, value) {
	this.headers[field] = value;
};
SocketIoResponse.prototype.header = SocketIoResponse.prototype.set;

SocketIoResponse.prototype.status = function(code) {
	this.statusCode = code;
	return this;
};

SocketIoResponse.prototype.send = function(body) {
	if(this.sentResponse) {
		console.warn('WARNING: fresh-socketio-router: send: response has already been sent and will not be sent again');
		return this;
	}
	var message = { status: this.statusCode, headers: this.headers };
	if(body !== undefined) {
		message.body = body;
	}
	this.socket.emit(this.emitUrl, message);
	this.sentResponse = true;
	return this;
};

SocketIoResponse.prototype.json = SocketIoResponse.prototype.send;

// status code names, taken from nodejs http module
var STATUS_CODES = exports.STATUS_CODES = {
  100 : 'Continue',
  101 : 'Switching Protocols',
  102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
  200 : 'OK',
  201 : 'Created',
  202 : 'Accepted',
  203 : 'Non-Authoritative Information',
  204 : 'No Content',
  205 : 'Reset Content',
  206 : 'Partial Content',
  207 : 'Multi-Status',               // RFC 4918
  208 : 'Already Reported',
  226 : 'IM Used',
  300 : 'Multiple Choices',
  301 : 'Moved Permanently',
  302 : 'Found',
  303 : 'See Other',
  304 : 'Not Modified',
  305 : 'Use Proxy',
  307 : 'Temporary Redirect',
  308 : 'Permanent Redirect',         // RFC 7238
  400 : 'Bad Request',
  401 : 'Unauthorized',
  402 : 'Payment Required',
  403 : 'Forbidden',
  404 : 'Not Found',
  405 : 'Method Not Allowed',
  406 : 'Not Acceptable',
  407 : 'Proxy Authentication Required',
  408 : 'Request Timeout',
  409 : 'Conflict',
  410 : 'Gone',
  411 : 'Length Required',
  412 : 'Precondition Failed',
  413 : 'Payload Too Large',
  414 : 'URI Too Long',
  415 : 'Unsupported Media Type',
  416 : 'Range Not Satisfiable',
  417 : 'Expectation Failed',
  418 : 'I\'m a teapot',              // RFC 2324
  421 : 'Misdirected Request',
  422 : 'Unprocessable Entity',       // RFC 4918
  423 : 'Locked',                     // RFC 4918
  424 : 'Failed Dependency',          // RFC 4918
  425 : 'Unordered Collection',       // RFC 4918
  426 : 'Upgrade Required',           // RFC 2817
  428 : 'Precondition Required',      // RFC 6585
  429 : 'Too Many Requests',          // RFC 6585
  431 : 'Request Header Fields Too Large', // RFC 6585
  451 : 'Unavailable For Legal Reasons',
  500 : 'Internal Server Error',
  501 : 'Not Implemented',
  502 : 'Bad Gateway',
  503 : 'Service Unavailable',
  504 : 'Gateway Timeout',
  505 : 'HTTP Version Not Supported',
  506 : 'Variant Also Negotiates',    // RFC 2295
  507 : 'Insufficient Storage',       // RFC 4918
  508 : 'Loop Detected',
  509 : 'Bandwidth Limit Exceeded',
  510 : 'Not Extended',               // RFC 2774
  511 : 'Network Authentication Required' // RFC 6585
};

module.exports = FreshSocketIoRouter;
module.exports.Router = Router;


