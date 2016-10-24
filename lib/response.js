var EventEmitter = require('events');
var util = require('util');

function SocketIoResponse (socket, route, ack) {
	this.socket = socket;
	this.headers = {};
	this.sentResponse = false;
	this.ack = ack;
	this.message = null; //the sent response
	// emitUrl only goes up until the first question mark
	this.emitUrl = route || '/';
	var questionMarkIndex = this.emitUrl.indexOf('?');
	if(questionMarkIndex !== -1) {
		this.emitUrl = this.emitUrl.substring(0, questionMarkIndex);
	}
}

util.inherits(SocketIoResponse, EventEmitter);

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
	this.message = { status: this.statusCode, headers: this.headers };
	if(body !== undefined) {
		this.message.body = body;
	}
	this.socket.emit(this.emitUrl, this.message);
	this.emit('finish');
	if(typeof this.ack === 'function') {
		this.ack(this.message);
	}
	this.sentResponse = true;
	return this;
};

SocketIoResponse.prototype.json = SocketIoResponse.prototype.send;

module.exports = SocketIoResponse;
