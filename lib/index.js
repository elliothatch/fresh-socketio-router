var Router = require('router');

function SocketIoRouter(options) {
	options = options || {};
	// if no router provided, set up base router with default values
	if(!options.router) {
		options.router = new Router();
	}

	app = function(socket, next) {
		var oldOnEvent = socket.onevent;
		socket.onevent = function(packet) {
			var args = packet.data || [undefined, {}];
			handleSocketEvent(options, socket, args[0], args[1]);
			oldOnEvent.apply(socket, arguments);
		};
		next();
	};

	app.router = options.router;

	// todo: is this safe?
	app.__proto__ = app.router;
	return app;
};

function handleSocketEvent(options, socket, route, message) {
	route = route || '';

	var req = new SocketIoRequest(socket, route, message);
	var res = new SocketIoResponse(socket);
	req.res = res;
	res.req = req;
	options.router(req, res, finalHandler(req, res, {env: options.env}));
}

function finalHandler(req, res, options) {
	options = options || {};
	var env = options.env || process.env.NODE_ENV || 'development';
	return function(err) {
		console.log('the final handler');

		var status = res.statusCode;
		// unhandled error
		if (err) {
			// respect err.statusCode
			if (err.statusCode) {
				status = err.statusCode;
			}

			// respect err.status
			if (err.status) {
				status = err.status
			}

			// default status code to 500
			if (!status || status < 400) {
				status = 500
			}

			// production gets a basic error message
			var message = STATUS_CODES[status];
			if(env !== 'production') {
				message = err.stack || err.toString();
			}
		}
		else {
			status = 404;
			message = 'Cannot ' + req.method + ' ' + (req.originalUrl || req.url) + '\n';
		}

		res.status(status).send(message);
	};
}

function SocketIoRequest (socket, route, message) {
	this.socket = socket;
	this.url = route || '/';
	this.originalUrl = this.url;
	this.message = message;
	this.body = message.body;
}

SocketIoRequest.prototype.method = 'GET'; //TODO: remove this or somethingidk

function SocketIoResponse (socket) {
	this.socket = socket;
}

SocketIoResponse.prototype.statusCode = 200;

SocketIoResponse.prototype.status = function(code) {
	this.statusCode = code;
	return this;
};

SocketIoResponse.prototype.send = function(body) {
	var message = { status: this.statusCode};
	if(body !== undefined) {
		message.body = body;
	}
	this.socket.emit(this.req.originalUrl, message);
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

module.exports = SocketIoRouter;
module.exports.Router = Router;


