[![Build Status](https://travis-ci.org/elliothatch/fresh-socketio-router.svg?branch=master)](https://travis-ci.org/elliothatch/fresh-socketio-router)
[![Coverage Status](https://coveralls.io/repos/github/elliothatch/fresh-socketio-router/badge.svg?branch=master)](https://coveralls.io/github/elliothatch/fresh-socketio-router?branch=master)
# fresh-socketio-router
## a middleware based router for socketio transactions

fresh-socketio-router is a [Socket.Io](http://socket.io/) middleware that emulates [Express](http://expressjs.com/) routing.
Socket events are modeled as transactions, and they look a lot like HTTP requests/responses.

Routing is achieved with [pillarjs/router](https://github.com/pillarjs/router), the same library
Express 5.0 uses for its routing. See the Express documentation for routing details.

# Topics
 - [Quick Start](#quick-start)
    - [Installation](#installation)
    - [Usage](#usage)
 - [Socket Event API](#socket-event-api)
 - [Server API](#server-api)
 - [Example](#example)
    - [Server](#server)
    - [Client](#client)
 - [Contributing](#contributing)
 - [License](#license)

# Quick Start

## Installation

```bash
$ npm install fresh-socketio-router
```

## Usage

```js
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

server.listen(3000);

var freshSocketRouter = require('fresh-socketio-router');

var myRouter = freshSocketRouter.Router();

myRouter.get('/hello', function(req, res) {
	res.status(200).send('Hello ' + req.body);
});

io.use(freshSocketRouter(myRouter));
```

Request:
```js
var socket = io('http://localhost:3000');
socket.emit('/hello', {
	method: 'GET',
	headers: {},
	body: 'Sam'
});
```

Response:
```js
socket.on('/echo', function(res) {
	// res: {
	// 	status: 200,
	// 	headers: {},
	// 	body: 'Hello Sam'
	// }
});
```


# Socket Event API
fresh-socketio-router establishes a transactional protocol for SocketIo events.
Transactions are modeled after HTTP, but many of the HTTP fields are optional.
Note that requests and responses are serialized to JSON. A binary protocol may be added in the future.

## Request

All events emitted by the client must be a JSON object with these fields:
 - `method` (string): HTTP method name. Default='GET'
 - `headers` (object): HTTP headers. Values must be strings. Default={}
 - `body` (number/string/object): Request body. Default=undefined

### Request headers:
A request header is a name-value pair of strings. Users are encouraged to reuse
HTTP headers where appropriate, and follow HTTP header naming conventions.

## X-Fresh headers
The fresh-socketio-router protocol reserves the use of headers beginning with
`X-Fresh-`.

### X-Fresh-Request-Id
A string or number that uniquely identifies this request for the current socket
connection. This value is echoed back in the response as a header of the same name.

Typically this is a counter initialized to 0 when the socket connection is esablished,
and incremented by 1 for every new request.

A request may either receive exactly one response as an event emitted to the same
url that the request was emitted to, or will time out.

## Response

All responses are JSON objects with the following fields:
 - `status` (number): HTTP status code.
 - `headers` (object): HTTP headers. Values are strings.
 - `body` (number/string/object): Response body.

# Server API

## `FreshSocketIoRouter(router, options)`
Constructor.

Parameters:
 - `router`: A router constructed with `FreshSocketIoRouter.Router()`.
 - `options` (optional): Object with optional properties:
   - `ignoreList`: Array of routes that should not be processed by the framework. Any valid routes can be used. This is achieved
by injecting a no-op handler before user middleware is installed, using `router.all(ignoreList, ...)`.
   - `silent`: If truthy, won't print warnings or errors to stderr.
   - `env`: Environment string. If set to 'production', will send a generic HTTP status code on 500 errors, instead of a stack trace.
Default uses the value from the environment variable `$NODE_ENV`
   - `onerror`: Callback function with signature `onerror(err)`. Executed when a request gets to the end of the middleware stack without being handled.
Default action: `console.error(err.stack || err.toString());`

## `FreshSocketIoRouter.Router()`
Construct a new Router object. See [pillarjs/router](https://github.com/pillarjs/router) or Express documentation.

# Request

## Properties

### req.socket
Contains the SocketIo socket this request came from. See SocketIo docs for details.

### req.url
The url of the currently handled request. Some routing functions rewrite this, see req.originalUrl

### req.originalUrl
This property is much like req.url; however, it retains the original request
URL, allowing you to rewrite req.url freely for internal routing purposes. For
example, the “mounting” feature of app.use() will rewrite req.url to strip the
mount point.

### req.message
The data value that came with the event, or an empty object if it was
undefined. Mostly used internally.

### req.method
The HTTP method of the request, all uppercase letters. Defaults to 'GET'.

### req.headers
The headers value from req.message. Use req.get() to retrieve header values.

### req.body
The body of the request, from req.body.

### req.res
Handle to the response object associated with this request.

## Methods

### req.get(field)
Returns the HTTP request header field. Case sensitive (subject to change).

### req.header()
Alias of req.get().

# Response

## Properties

### res.socket
Contains the SocketIo socket this response is directed toward. See SocketIo docs for details.

### res.headers
Response headers. Use req.set() to set header values.

### res.statusCode

For internal use. HTTP status code currently set on the response. Default=200, but overridden if
an error occurs or the route is fully processed without sending a response.

### res.req
Handle to the request object associated with this response.

## Methods

### res.status(code)
Sets the HTTP status for the response.

### res.set(field, value)
Sets the response’s HTTP header field to value.

### res.header(field, value)
Alias of res.set()

### res.send(body)
Sends the response event. Once the response has been sent, subsequent calls to
res.send() are ignored.

### res.json(body)
Alias of res.send()

# Example

## Server
```js
// socketio server setup
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

server.listen(3000);

var freshSocketRouter = require('fresh-socketio-router');

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
```

## Client
```html
<script src="/socket.io/socket.io.js"></script>
<script>
	var socket = io('http://localhost:3000');
	socket.on('/echo', function (res) {
		// ...
	});
	socket.on('/hello/data', function (res) {
		// ...
	});
	socket.on('/fake', function (res) {
		// ...
	});

	socket.emit('/echo', {
		method: 'GET',
		headers: {},
		body: 'hello'
	});
	// response: {
	// 	status: 200,
	// 	headers: {},
	// 	body: 'hello'
	// }

	socket.emit('/echo', {
		method: 'GET',
		headers: { 'X-Uppercase': true },
		body: 'hello'
	});
	// response: {
	// 	status: 200,
	// 	headers: { 'X-Was-Uppercased': true },
	// 	body: 'HELLO'
	// }

	socket.emit('/hello/data', {
		method: 'GET',
		headers: {},
		body: { user: 'admin' }
	});
	// response: {
	// 	status: 200,
	// 	headers: {},
	// 	body: 'the data'
	// }

	socket.emit('/hello/data', {
		method: 'GET',
		headers: {},
		body: { user: 'elliot' }
	});
	// response: {
	// 	status: 403,
	// 	headers: {},
	// 	body: 'Forbidden: wrong user'
	// }

	socket.emit('/fake', {
		method: 'GET',
		headers: {},
		body: {}
	});
	// response: {
	// 	status: 404,
	// 	headers: {},
	// 	body: 'Cannot GET /fake'
	// }
</script>
```

# Contributing

Add your changes to a new branch. Don't forget to write unit tests.

When your branch is ready, make a pull request.

# License

MIT License

