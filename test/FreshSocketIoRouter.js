
var expect = require('chai').expect;

var http = require('http');
var ioServer = require('socket.io');
var ioClient = require('socket.io-client');

var port = 3000;
var server;
var io;

describe('FreshSocketIoRouter', function() {
	beforeEach(function() {
		server = http.createServer();
		io = ioServer(server);
		server.listen(3000);
		//io.use(freshSocketRouter(socketRouter));
	});

	afterEach(function() {
		server.close();
	});

	it('should route correctly with a single router') {
	}
}
