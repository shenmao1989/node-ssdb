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

  it('expire', function(done){
    var key = uniqueKey();
    client.set(key, 'v');
    client.expire(key, 1.2, function(err, val){
      should(err).eql(undefined);
      should(val).eql(1);
    });
    setTimeout(function(){
      client.exists(key, function(err, val){
        should(err).eql(undefined);
        should(val).eql(0);
        done();
      });
    }, 1201);
  });


});
