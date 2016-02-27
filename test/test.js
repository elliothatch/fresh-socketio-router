var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(express.static(__dirname));

server.listen(3000);
console.log('listening on port 3000');

var freshSocketRouter = require('../lib');

var socketRouter = freshSocketRouter();
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

var goodbyeRouter = freshSocketRouter.Router();

goodbyeRouter.get('/sam', function(req, res) {
	console.log('hi');
	console.log(JSON.stringify(req));
	console.log('hey');
	res.status(200).send('goodbye sam ' + req.code + 'color:' +
			req.body.color + ' position:' + req.body.pos.x + ',' + req.body.pos.y +
			' ' + req.body.pos.x + req.body.pos.y);
});

socketRouter.use('/goodbye', goodbyeRouter);

socketRouter.get('/bad', function(req, res, next) {
	throw new Error('bad');
});
socketRouter.get('/bad2', function(req, res, next) {
	next(new Error('bad2'));
});
socketRouter.get('/bad3', function(req, res, next) {
	next();
});

io.use(socketRouter);
