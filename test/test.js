var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(express.static(__dirname));

server.listen(3000);
console.log('listening on port 3000');

var freshSocketRouter = require('../lib');

var router = freshSocketRouter.Router();
router.use(function(req, res, next) {
	console.log('my middleware');
	req.code = 'the code';
	next();
});

router.get('/hello', function(req, res) {
	var code = req.code;
	console.log('hello handler');
	res.status(200).send('world ' + code);
});

var goodbyeRouter = freshSocketRouter.Router();

goodbyeRouter.get('/sam', function(req, res) {
	res.status(200).send('goodbye sam ' + req.code);
});

router.use('/goodbye', goodbyeRouter);

io.use(freshSocketRouter(router));
