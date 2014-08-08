// nodejs client for https://github.com/ideawu/ssdb
//
// Usage:
//
//   > ssdb = require('ssdb')
//   > client = ssdb.Client()
//   > client.set('key', 'val')
//   > client.get('key')


var net = require('net');
var util = require('util');


function Connection(port, host, timeout, connectListener, timeoutCallback) {
  this.host = host || '0.0.0.0';
  this.port = port || 8888;
  this.timeout = timeout || 0;
  this.connectListener = connectListener;
  this.timeoutCallback = timeoutCallback;

  this.sock = null;
  this.batch = false;
  this._commands = [];
}


Connection.prototype.connect = function() {
  this.sock = net.Socket();
  this.sock.setTimeout(this.timeout, this.timeoutCallback);
  this.sock.setEncoding('utf8');
  this.sock.setNoDelay(true);
  this.sock.setKeepAlive(true);
  return this.sock.connect(this.port, this.host, this.connectListener);
}


Connection.prototype.close = function() {
  if (this.sock) {
    this.sock.end();
    this.sock.destroy();
    this.sock = null;
  }
}


Connection.prototype.compile = function(args) {  // build buffer source string
  var list = [];
  var pattern = '%d\n%s\n';

  for(var i = 0; i < args.length; i++) {
    var arg = args[i];
    list.push(util.format(pattern, arg.toString().length, arg));
  }

  list.push('\n');
  return list.join('');
}




Connection.prototype.parse = function(data) { // responsed data parser
  var resps = [];
  var i = 0;

  var parseUnit = function() {
    var size = '';

    while (1) {
      var ch = data[i];
      if (ch === '\n') break;
      size += ch;
      i++;
    }

    if (size !== '') {
      i++;
      size = parseInt(size);
      var unit = data.slice(i, i + size);
      i += size + 1;
      return unit;
    }
    return null;
  }

  while (i < data.length) {

    var resp = [];
    var stat = parseUnit();
    resp.push(stat);

    while (1) {
      var body = parseUnit();
      if (body === null) break;
      resp.push(body);
    }

    resps.push(resp);
    i++;
  }

  return resps;
}


Connection.prototype.send = function(args) {
  if (!this.sock) this.connect();

  var commands = [];

  for (var i = 0; i < this._commands.length; i ++) {
    var args = this._commands[i];
    commands.push(this.compile(args));
  }

  var buffer = new Buffer(commands.join(''));
  return this.sock.write(buffer);
}


function Client(options) {
  this.conn = new Connection(options.port, options.host, options.connectListener,
                             options.timeoutCallback);
}


Client.prototype.quit = function() {
  return this.conn.close();
}


exports.Client = Client
exports.Connection = Connection
