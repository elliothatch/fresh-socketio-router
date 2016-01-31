var Router = require('router');

function SocketIoRouter(router) {
	return function(socket, next) {
		var oldOnEvent = socket.onevent;
		socket.onevent = function(packet) {
			var args = packet.data || [undefined, {}];
			handleSocketEvent(router, socket, args[0], args[1]);
			oldOnEvent.apply(socket, arguments);
		};
		next();
	};
};

function handleSocketEvent(router, socket, route, message) {
	route = route || '';

	var req = new SocketIoRequest(socket, route, message);
	var res = new SocketIoResponse(socket);
	req.res = res;
	res.req = req;
	router(req, res, finalHandler(req, res));
}

function finalHandler(req, res) {
	return function(err) {
		console.log('the final handler');
		//console.log(req);
		//console.log(res);
		res.status(500).send('Internal Server Error');
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

module.exports = SocketIoRouter;
module.exports.Router = Router;

