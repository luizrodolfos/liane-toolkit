import "./logger.js";
import "./globals.js";
import "./accounts.js";
import "./api.js";
import "./redis.js";
import "./fixtures.js";

Meteor.setInterval(function() {
  var output = {};

  var connections = Meteor.server.stream_server.open_sockets;
  _.each(connections, function(connection) {
    // named subscriptions
    var subs = connection._meteorSession._namedSubs;
    for (var sub in subs) {
      var mySubName = subs[sub]._name;

      if (subs[sub]._params.length > 0) {
        mySubName += subs[sub]._params[0]; // assume one id parameter for now
      }

      if (!output[mySubName]) {
        output[mySubName] = 1;
      } else {
        output[mySubName] += 1;
      }
    }
    // there are also these 'universal subscriptions'
    //not sure what these are, i count none in my tests
    var usubs = connection._meteorSession._universalSubs;
  });

  console.log(output);
}, 2000);
