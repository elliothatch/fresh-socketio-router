var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(express.static(__dirname));

server.listen(3000);
console.log('listening on port 3000');

var freshSocketRouter = require('../lib');

var socketRouter = freshSocketRouter.Router();
socketRouter.use(function(req, res, next) {
	console.log('my middleware');
	req.code = 'the code';
	next();
});

socketRouter.get('/hello', function(req, res) {
	var code = req.code;
	console.log('hello handler');
	res.status(200).send('world ' + req.body + code);
});

socketRouter.post('/hello', function(req, res) {
	res.status(200).send('world ' + req.body + req.method);
});

var goodbyeRouter = freshSocketRouter.Router();

goodbyeRouter.get('/sam', function(req, res) {
	//console.log('hi');
	//console.log(require('util').inspect(req));
	//console.log('hey');
	res.status(200).send('goodbye sam ' + req.code + 'color:' +
			req.body.color + ' position:' + req.body.pos.x + ',' + req.body.pos.y +
			' ' + (req.body.pos.x + req.body.pos.y));
});

socketRouter.use('/goodbye', goodbyeRouter);

var badRouter = freshSocketRouter.Router();

badRouter.get('/bad', function(req, res, next) {
	var err = new Error('bad');
	err.status = 511;
	throw err;
});
badRouter.get('/bad2', function(req, res, next) {
	res.bad2 = 'uh oh';
	var err = new Error('bad2');
	err.status = 512;
	next(err);
});
badRouter.get('/bad3', function(req, res, next) {
	next();
});

//badRouter.use(function(req, res, next) {
	//console.log('bad middleware');
	//next();
//});

//badRouter.use(function(err, req, res, next) {
	//console.error('bad handler 1', err.message);
	//if(res.bad2 === 'uh oh') {
		//console.log('got uh oh');
		//next(err);
		//return;
	//}
	//res.status(err.status || 500).send(err.message || 'Internal Server Error');
//});

//badRouter.use(function(err, req, res, next) {
	//console.error('bad handler 2', err.message);
	//res.status(err.status || 500).send(err.message || 'Internal Server Error');
//});

socketRouter.use('/bad', badRouter);

socketRouter.get('/users/:user', function(req, res) {
	res.status(200).send('got user ' + req.params.user);
});

var r = [1, 4, 9, 16, 25, 36, 49];
var index = 0;
socketRouter.get('/count/increment', function(req, res) {
	var val = r[index];
	index++;
	setTimeout(function() {
		res.status(200).send(val);
	}, (7-index) * 1000);
});

//socketRouter.use(function(err, req, res, next) {
	//console.error('error handler: ' + req.url);
	//res.status('501').send('something bad');
//});

io.use(freshSocketRouter(socketRouter));
