# fresh-socketio-router
## a middleware based router for socketio transactions


# Socket Event API
fresh-socketio-router establishes a transactional protocol for SocketIo events.
Transactions are modeled after HTTP, but many of the HTTP fields are optional.
Note that requests and responses are serialized to JSON. A binary protocol may be added in the future.

All events emitted by the client to a handled route must contain undefined or an object, with
the optional properties:

```
{
	method (string:HTTP Method): default='GET',
	headers (object--name-value string pairs)=undefined,
	body (number/string/object): default=undefined
}
```

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

All responses have the following format.
```
{
	status (number:HTTP Status),
	headers (object--name-value string pairs),
	body (number/string/object)
}
```

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

