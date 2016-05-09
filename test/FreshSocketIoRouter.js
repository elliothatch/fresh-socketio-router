var expect = require('chai').expect;
var assert = require('chai').assert;

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
		var routes = ['/test1', '/test2/a', '/test2/b', '/test2/c'];
		var statusVals = [200, 202, null, 201];
		var dataVals = [null, 1, { a: 1, b: 'b', c: { a: 'ca' }}, 'd'];
		var a1 = 'a1';
		var c1 = 'c1';
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
		socketRouter.post(routes[3], function(req, res, next) {
			req.c = c1;
			next();
		});
		socketRouter.post(routes[3], function(req, res) {
			res.status(statusVals[3]).send(req.c + dataVals[3]);
		});

		io.use(freshSocketRouter(socketRouter));

		var client = ioClient(ipAddress);
		var client2 = ioClient(ipAddress);
		return BPromise.all([
			new BPromise(function(resolve, reject) {
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
					})
				]);
			}),
			new BPromise(function(resolve, reject) {
				client2.on('connect', function() {
					resolve();
				});
			}).then(function() {
				return BPromise.all([
					new BPromise(function(resolve, reject) {
						client2.on(routes[2], function(data) {
							expect(data).to.deep.equal({
								status: 200, //default 'good' status
								headers: headerVals[2],
								body: {data: dataVals[2], first: sentBodyVals[2].first, sent: sentBodyVals[2]}
							});
							resolve();
						});
						client2.emit(routes[2], {
							method: 'GET',
							headers: headerVals[2],
							body: sentBodyVals[2]
						});
					}),
					new BPromise(function(resolve, reject) {
						client2.on(routes[3], function(data) {
							expect(data).to.deep.equal({
								status: statusVals[3],
								headers: headerVals[3],
								body: c1 + dataVals[3]
							});
							resolve();
						});
						client2.emit(routes[3], {
							method: 'POST',
							headers: headerVals[3],
							body: sentBodyVals[3]
						});
					})
				]);
			})
		]);
	});

	it('should route correctly with nested routers', function() {
		var socketRouter = freshSocketRouter.Router();
		socketRouter.use(function(req, res, next) {
			req.data = 'base';
			res.set('X-hello', 'hi');
			next();
		});
		var aRouter = freshSocketRouter.Router();
		aRouter.use(function(req, res, next) {
			req.dataA = 'one';
			next();
		});
		var bRouter = freshSocketRouter.Router();
		bRouter.use(function(req, res, next) {
			req.dataB = 'two';
			next();
		});
		bRouter.get('/test', function(req, res) {
			res.status(201).send(req.data + req.dataA + req.dataB + req.body);
		});

		var cRouter = freshSocketRouter.Router();
		bRouter.use(function(req, res, next) {
			req.dataC = 'three';
			next();
		});
		cRouter.get('/test', function(req, res) {
			res.status(200).send(req.data + req.dataA + req.dataB + req.dataC + req.body);
		});
		bRouter.use('/c', cRouter);
		aRouter.use('/b', bRouter);
		socketRouter.use('/a', aRouter);

		io.use(freshSocketRouter(socketRouter));
		
		var client = ioClient(ipAddress);
		return new BPromise(function(resolve, reject) {
			client.on('connect', function() {
				resolve();
			});
		}).then(function() {
			return BPromise.all([
				new BPromise(function(resolve, reject) {
					client.on('/a/b/test', function(data) {
						expect(data).to.deep.equal({
							status: 201,
							headers: { 'X-hello': 'hi' },
							body: 'baseonetwoHI'
						});
						resolve();
					});
					client.emit('/a/b/test', {
						method: 'GET',
						headers: {},
						body: 'HI'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/a/b/c/test', function(data) {
						expect(data).to.deep.equal({
							status: 200,
							headers: { 'X-hello': 'hi' },
							body: 'baseonetwothreeHELLO'
						});
						resolve();
					});
					client.emit('/a/b/c/test', {
						method: 'GET',
						headers: {},
						body: 'HELLO'
					});
				})
			]);
		});
	});
	it('should respond with 404 if the route isn\'t mapped', function() {
		var socketRouter = freshSocketRouter.Router();
		socketRouter.use('/test2', function(req, res, next) {
			next();
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
					client.on('/test', function(data) {
						expect(data).to.deep.equal({
							status: 404,
							headers: {},
							body: 'Cannot GET /test'
						});
						resolve();
					});
					client.emit('/test', {
						method: 'GET',
						headers: {},
						body: 'aaa'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/test2', function(data) {
						expect(data).to.deep.equal({
							status: 404,
							headers: {},
							body: 'Cannot GET /test2'
						});
						resolve();
					});
					client.emit('/test2', {
						method: 'GET',
						headers: {},
						body: 'bbb'
					});
				})
			]);
		});
	});
	it('should handle errors correctly', function() {
		var err1, err2, err3, err4;
		var socketRouter = freshSocketRouter.Router();
		socketRouter.get('/bad1', function(req, res, next) {
			err1 = new Error('bad1');
			err1.status = 511;
			throw err1;
		});
		socketRouter.get('/bad2', function(req, res, next) {
			err2 = new Error('bad2');
			next(err2);
		});

		socketRouter.use(function(err, req, res, next) {
			res.status(err.status || 500).send(err.message || 'Internal Server Error');
		});

		socketRouter.get('/bad3', function(req, res, next) {
			err3 = new Error('bad3');
			err3.status = 511;
			throw err3;
		});
		socketRouter.get('/bad4', function(req, res, next) {
			err4 = new Error('bad4');
			next(err4);
		});
		io.use(freshSocketRouter(socketRouter, {silent: true}));

		var client = ioClient(ipAddress);
		return new BPromise(function(resolve, reject) {
			client.on('connect', function() {
				resolve();
			});
		}).then(function() {
			return BPromise.all([
				new BPromise(function(resolve, reject) {
					client.on('/bad1', function(data) {
						expect(data).to.deep.equal({
							status: 511,
							headers: {},
							body: err1.message
						});
						resolve();
					});
					client.emit('/bad1', {
						method: 'GET',
						headers: {},
						body: 'aaa'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/bad2', function(data) {
						expect(data).to.deep.equal({
							status: 500,
							headers: {},
							body: err2.message
						});
						resolve();
					});
					client.emit('/bad2', {
						method: 'GET',
						headers: {},
						body: 'bbb'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/bad3', function(data) {
						expect(data).to.deep.equal({
							status: 511,
							headers: {},
							body: err3.stack
						});
						resolve();
					});
					client.emit('/bad3', {
						method: 'GET',
						headers: {},
						body: 'aaa'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/bad4', function(data) {
						expect(data).to.deep.equal({
							status: 500,
							headers: {},
							body: err4.stack
						});
						resolve();
					});
					client.emit('/bad4', {
						method: 'GET',
						headers: {},
						body: 'bbb'
					});
				})
			]);
		});
	});

	it('should work on the README example', function() {
		var myRouter = freshSocketRouter.Router();

		// middleware
		myRouter.use(function(req, res, next) {
			req.myData = 'the data';
			next();
		});

		myRouter.get('/echo', function(req, res) {
			if(req.get('X-Uppercase') && typeof req.body === 'string') {
				res.set('X-Was-Uppercased', true);
				res.status(200).send(req.body.toUpperCase());
			}
			else {
				res.status(200).send(req.body);
			}
		});

		var helloRouter = freshSocketRouter.Router();
		helloRouter.get('/data', function(req, res, next) {
			if(req.body && req.body.user === 'admin') {
				res.status(200).send(req.myData);
			}
			else {
				var err = new Error('Forbidden: wrong user');
				err.status = 403;
				next(err);
			}
		});

		myRouter.use('/hello', helloRouter);

		// generic error handler
		myRouter.use(function(err, req, res, next) {
			if(!err.status || err.status >= 500) {
				console.error(err.stack);
			}
			res.status(err.status || 500).send(err.message || 'Internal Server Error');
		});

		io.use(freshSocketRouter(myRouter));

		var socket = ioClient(ipAddress);
		return new BPromise(function(resolve, reject) {
			socket.on('connect', function() {
				resolve();
			});
		}).then(function() {
			return BPromise.all([
				new BPromise(function(resolve, reject) {
					socket.on('/echo', function(res) {
						if(res.headers['X-Fresh-Request-Id'] === '0') {
							expect(res).to.deep.equal({
								status: 200,
								headers: {'X-Fresh-Request-Id': '0'},
								body: 'hello'
							});
							resolve();
						}
					});
					socket.emit('/echo', {
						method: 'GET',
						headers: {'X-Fresh-Request-Id': '0'},
						body: 'hello'
					});
				}),
				new BPromise(function(resolve, reject) {
					socket.on('/echo', function(res) {
						if(res.headers['X-Fresh-Request-Id'] === '1') {
							expect(res).to.deep.equal({
								status: 200,
								headers: {'X-Fresh-Request-Id': '1', 'X-Was-Uppercased': true},
								body: 'HELLO'
							});
							resolve();
						}
					});
					socket.emit('/echo', {
						method: 'GET',
						headers: {'X-Fresh-Request-Id': '1', 'X-Uppercase': true},
						body: 'hello'
					});
				}),
				new BPromise(function(resolve, reject) {
					socket.on('/hello/data', function(res) {
						if(res.headers['X-Fresh-Request-Id'] === '2') {
							expect(res).to.deep.equal({
								status: 200,
								headers: {'X-Fresh-Request-Id': '2'},
								body: 'the data'
							});
							resolve();
						}
					});
					socket.emit('/hello/data', {
						method: 'GET',
						headers: {'X-Fresh-Request-Id': '2'},
						body: { user: 'admin'}
					});
				}),
				new BPromise(function(resolve, reject) {
					socket.on('/hello/data', function(res) {
						if(res.headers['X-Fresh-Request-Id'] === '3') {
							expect(res).to.deep.equal({
								status: 403,
								headers: {'X-Fresh-Request-Id': '3'},
								body: 'Forbidden: wrong user'
							});
							resolve();
						}
					});
					socket.emit('/hello/data', {
						method: 'GET',
						headers: {'X-Fresh-Request-Id': '3'},
						body: { user: 'elliot'}
					});
				}),
				new BPromise(function(resolve, reject) {
					socket.on('/fake', function(res) {
						if(res.headers['X-Fresh-Request-Id'] === '4') {
							expect(res).to.deep.equal({
								status: 404,
								headers: {'X-Fresh-Request-Id': '4'},
								body: 'Cannot GET /fake'
							});
							resolve();
						}
					});
					socket.emit('/fake', {
						method: 'GET',
						headers: {'X-Fresh-Request-Id': '4'},
						body: {}
					});
				})
			]);
		});
	});
	it('should not execute middleware for routes on the ignoreList', function() {
		var waitTime = 200; //time to delay "success" events, to allow for rejections to happen first.
		// waitTime=0 seems to work, probably because the "setTimeout" delays the event loop or something. using 200 just to be safe.
		var socketRouter = freshSocketRouter.Router();

		var error;
		var ignoreList = ['/test1', '/test2', '/test2/*', '/test3/:id'];
		socketRouter.all(ignoreList, function(req, res, next) {
			try {
				assert.fail(0,1, 'Middleware was executed on ignored route \'' + req.originalUrl + '\'');
			}
			catch(e) {
				error = e;
				throw e;
			}
		});

		socketRouter.all('/test1/a', function(req, res) {
			res.status(200).send('a');
		});

		socketRouter.all('/test3', function(req, res) {
			res.status(200).send('t3');
		});

		socketRouter.all('/test3/:id/hello', function(req, res) {
			res.status(200).send('t3h');
		});


		
		var options = { silent: true, ignoreList: ignoreList };
		io.use(freshSocketRouter(socketRouter, options));
		// register emitters outside socketRouter
		io.on('connection', function(socket) {
			socket.on('/test1', function(data) {
				socket.emit('/got-test1', 't1');
			});
			socket.on('/test2', function(data) {
				socket.emit('/got-test2', 't2');
			});
			socket.on('/test2/hello', function(data) {
				socket.emit('/got-test2/hello', 't2h');
			});
			socket.on('/test3/abc', function(data) {
				socket.emit('/got-test3/abc', 't3a');
			});
		});

		var client = ioClient(ipAddress);
		return new BPromise(function(resolve, reject) {
			client.on('connect', function() {
				resolve();
			});
		}).then(function() {
			return BPromise.all([
				new BPromise(function(resolve, reject) {
					client.on('/got-test1', function(data) {
						expect(data).to.deep.equal('t1');
						setTimeout(function() {
							resolve();
						}, waitTime);
					});
					client.on('/test1', function(data) {
						reject(error);
					});
					client.emit('/test1', {
						method: 'GET',
						headers: {},
						body: 'aaa'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/test1/a', function(data) {
						expect(data).to.deep.equal({
							status: 200,
							headers: {},
							body: 'a'
						});
						resolve();
					});
					client.emit('/test1/a', {
						method: 'GET',
						headers: {},
						body: 'aaa'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/got-test2', function(data) {
						expect(data).to.deep.equal('t2');
						setTimeout(function() {
							resolve();
						}, waitTime);
					});
					client.on('/test2', function(data) {
						reject(error);
					});
					client.emit('/test2', {
						method: 'GET',
						headers: {},
						body: 'aaa'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/got-test2/hello', function(data) {
						expect(data).to.deep.equal('t2h');
						setTimeout(function() {
							resolve();
						}, waitTime);
					});
					client.on('/test2/hello', function(data) {
						reject(error);
					});
					client.emit('/test2/hello', {
						method: 'GET',
						headers: {},
						body: 'aaa'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/test3', function(data) {
						expect(data).to.deep.equal({
							status: 200,
							headers: {},
							body: 't3'
						});
						resolve();
					});
					client.emit('/test3', {
						method: 'GET',
						headers: {},
						body: 'aaa'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/got-test3/abc', function(data) {
						expect(data).to.deep.equal('t3a');
						setTimeout(function() {
							resolve();
						}, waitTime);
					});
					client.on('/test3/abc', function(data) {
						reject(error);
					});
					client.emit('/test3/abc', {
						method: 'GET',
						headers: {},
						body: 'aaa'
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/test3/abc/hello', function(data) {
						expect(data).to.deep.equal({
							status: 200,
							headers: {},
							body: 't3h'
						});
						resolve();
					});
					client.emit('/test3/abc/hello', {
						method: 'GET',
						headers: {},
						body: 'aaa'
					});
				})
			]);
		});
	});
	it('should work with poorly formatted requests', function() {
		var socketRouter = freshSocketRouter.Router();
		socketRouter.use('/test/:id', function(req, res, next) {
			res.status(200).send('hello ' + req.params.id);
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
					client.on('/test/1', function(data) {
						expect(data).to.deep.equal({
							status: 200,
							headers: {},
							body: 'hello 1'
						});
						resolve();
					});
					client.emit('/test/1', {});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/test/2', function(data) {
						expect(data).to.deep.equal({
							status: 200,
							headers: {},
							body: 'hello 2'
						});
						resolve();
					});
					client.emit('/test/2', undefined);
				}),
				new BPromise(function(resolve, reject) {
					client.on('/test/3', function(data) {
						expect(data).to.deep.equal({
							status: 200,
							headers: {},
							body: 'hello 3'
						});
						resolve();
					});
					client.emit('/test/3', 2);
				})
			]);
		});
	});
	it('should work with query string parameters', function() {
		var socketRouter = freshSocketRouter.Router();
		socketRouter.use('/test/:id', function(req, res, next) {
			res.status(200).send('hello ' + req.query.id);
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
					client.on('/test/1', function(data) {
						expect(data).to.deep.equal({
							status: 200,
							headers: {},
							body: 'hello undefined'
						});
						resolve();
					});
					client.emit('/test/1?', {
						method: 'GET',
						headers: {},
						body: undefined
					});
				}),
				new BPromise(function(resolve, reject) {
					client.on('/test/2', function(data) {
						expect(data).to.deep.equal({
							status: 200,
							headers: {},
							body: 'hello elliot'
						});
						resolve();
					});
					client.emit('/test/2?id=elliot', {
						method: 'GET',
						headers: {},
						body: undefined
					});
				})
			]);
		});
	});
	it('should have the response emit \'finish\' when res.send is called', function() {
		var socketRouter = freshSocketRouter.Router();
		var finishPromise;
		socketRouter.use(function(req, res, next) {
			finishPromise = new Promise(function(resolve, reject) {
				res.on('finish', function() {
					resolve();
				});
			});
			next();
		});
		socketRouter.use('/test', function(req, res, next) {
			res.status(200).send('hello ' + req.body);
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
					client.on('/test', function(data) {
						expect(data).to.deep.equal({
							status: 200,
							headers: {},
							body: 'hello hi'
						});
						resolve();
					});
					client.emit('/test', {
						method: 'GET',
						headers: {},
						body: 'hi'
					});
				}),
				finishPromise
			]);
		});
	});
});
