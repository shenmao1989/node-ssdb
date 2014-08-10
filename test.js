var util = require('util');
var ssdb = require('./lib/ssdb');
var should = require('should');

var client = ssdb.createClient();

// helpers
var uniqueKey = (function(prefix, base){
  var cursor = base;
  return function(){
    return util.format('%s-%d', prefix, cursor++);
  };
})('key', 1000);


// mocha ssdb module
describe('ssdb', function(){

  it('set', function(done) {
    var key = uniqueKey();
    client.set(key, 'v', function(err, val){
      should(err).eql(undefined);
      should(val).eql(1);
      done();
    });
  });

  it('get', function(done){
    var key = uniqueKey();
    client.set(key, 'v');
    client.get(key, function(err, val){
      should(err).eql(undefined);
      should(val).eql('v');
      done();
    });
  });

  it('setx', function(done){
    var key = uniqueKey();
    client.setx(key, 'v', 5, function(err, val){
      should(err).eql(undefined);
      should(val).eql(1);
    });

    client.get(key, function(err, val){
      should(err).eql(undefined);
      should(val).eql('v');
    });

    setTimeout(function(){
      client.ttl(key, function(err, val){
        (undefined === err).should.be.true;
        should(val).not.above(5 - 1);
        done();
      });
    });

  });

  // status events test cases
  it('on-status-ok', function(done) {
    client.set(uniqueKey(), 'val');
    client.on('status_ok', function(cmd, data){
      should(data).eql(1);
      should(cmd).eql('set');
      done();
    });
  });


});
