var EventEmitter = require('events');
var util = require('util');

function SocketIoRequest (socket, route, message) {
	EventEmitter.call(this);
	this.socket = socket;
	this.url = route || '/';
	this.originalUrl = this.url;
	this.message = message || {};
	this.method = this.message.method && this.message.method.toUpperCase() || 'GET';
	this.headers = this.message.headers || {};
	this.body = this.message.body;
}

util.inherits(SocketIoRequest, EventEmitter);

SocketIoRequest.prototype.method = 'GET';
SocketIoRequest.prototype.get = function(field) {
	return this.headers && this.headers[field];
};
SocketIoRequest.prototype.header = SocketIoRequest.prototype.get;

module.exports = SocketIoRequest;
