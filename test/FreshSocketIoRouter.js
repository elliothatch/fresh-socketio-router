
var expect = require('chai').expect;

var BPromise = require('bluebird');

var http = require('http');
var ioServer = require('socket.io');
var ioClient = require('socket.io-client');

var freshSocketRouter = require('../lib');

var ipAddress = 'http://127.0.0.1:3000';
var port = 3000;
var server;
var io;

describe('FreshSocketIoRouter', function() {
	beforeEach(function() {
		server = http.createServer();
		io = ioServer(server);
		server.listen(3000);
	});

	afterEach(function() {
		server.close();
	});

	it('should route correctly with a single router', function() {
		var routes = ['/test1', '/test2/a', 'test2/b', 'test2/c'];
		var statusVals = [200, 202, null, 201];
		var dataVals = [null, 1, { a: 1, b: 'b', c: { a: 'ca' }}, 'd'];
		var a1 = 'a1';
		var headerVals = [
		{ 'X-Fresh-Request-Id': '1' },
		{ 'X-Fresh-Request-Id': '2' },
		{ 'X-Fresh-Request-Id': '3' },
		{ 'X-Fresh-Request-Id': 'a' }];
		var sentBodyVals = [
			'hello',
			10,
			{ first: 'hi', second: { a: 'a', b: 2 } },
			null
		];

		var socketRouter = freshSocketRouter.Router();
		socketRouter.use(function(req, res, next) {
			req.a1 = a1;
			next();
		});

		socketRouter.get(routes[0], function(req, res) {
			res.status(statusVals[0]).send(req.a1 + req.body);
		});
		socketRouter.get(routes[1], function(req, res) {
			res.status(statusVals[1]).send(dataVals[1] + req.body);
		});
		socketRouter.get(routes[2], function(req, res) {
			res.send({ data: dataVals[2], first: req.body.first, sent: req.body});
		});
		socketRouter.post(routes[3], function(req, res) {
			res.status(statusVals[3]).send(dataVals[3]);
		});

		io.use(freshSocketRouter(socketRouter));

		var client = ioClient(ipAddress);
		return new BPromise(function(resolve, reject) {
			client.on('connect', function() {
				resolve();
			});
		}).then(function() {
			return BPromise.all([
				new BPromise(function(resolve, reject) {
					client.on(routes[0], function(data) {
						expect(data).to.deep.equal({
							status: statusVals[0],
							headers: headerVals[0],
							body: a1 + sentBodyVals[0]
						});
						resolve();
					});
					client.emit(routes[0], {
						method: 'GET',
						headers: headerVals[0],
						body: sentBodyVals[0]
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on(routes[1], function(data) {
						expect(data).to.deep.equal({
							status: statusVals[1],
							headers: headerVals[1],
							body: dataVals[1] + sentBodyVals[1]
						});
						resolve();
					});
					client.emit(routes[1], {
						method: 'GET',
						headers: headerVals[1],
						body: sentBodyVals[1]
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on(routes[2], function(data) {
						expect(data).to.deep.equal({
							status: 200, //default 'good' status
							headers: headerVals[2],
							body: {data: dataVals[2], first: sentBodyVals[2].first, sent: sentBodyVals[2]}
						});
						resolve();
					});
					client.emit(routes[2], {
						method: 'GET',
						headers: headerVals[2],
						body: sentBodyVals[2]
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on(routes[3], function(data) {
						expect(data).to.deep.equal({
							status: statusVals[3],
							headers: headerVals[3],
							body: dataVals[3]
						});
						resolve();
					});
					client.emit(routes[3], {
						method: 'POST',
						headers: headerVals[3],
						body: sentBodyVals[3]
					});
				})
			]);
		});
	});
});
