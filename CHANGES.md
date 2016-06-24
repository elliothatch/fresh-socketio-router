# CHANGES

## 0.1

### 0.1.3 - 6-24-16
 - Added res.message--the message object sent as the payload when res.send() is called

### 0.1.2 - 5-8-16
 - Made request and response objects inherit from EventEmitter. Response emits 'final' event when res.send is called.
 - Added req.ip

### 0.1.1 - 5-2-16
 - No longer crashes if recieved message is not an object
 - Added support for query strings. Query strings don't affect the URL that responses are emitted to.
 - Travis CI now automatically publishes tagged version to npm
 - Options parameter is used as a prototype instead of being modified itself.

### 0.1.0 - 4-28-16
Initial version
