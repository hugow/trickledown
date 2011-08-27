
/**
 * Module dependencies.
 */

/*globals module, __dirname */

var express = require('express'),
    mongodb = require('mongodb'),
    async = require('async'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    client = new Db('trickledown', new Server("127.0.0.1", 27017, {})),
    World = require('./simulation/engine').World,
    app = module.exports = express.createServer(),
    nko = require('nko')('HDMpimMItHdc/S+8');

// Configuration
app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

// Routes
app.get('/', function (req, res) {
    res.render('index', {
        title: 'Express'
    });
});

// this will be fun at some point
/*
// open the db once
client.open(function (err) {
    if (err) {
        console.log('failed to create db, exiting');
    } else {
        var worlds = [ 'odov', 'opov' ];
        async.map(worlds, function (world, callback) {
            World.createFromDb(client, world, callback);
        }, function (err, worlds) {
            if (err) {
                console.log('failed to load worlds');
            }
            // we need to
            // start the server
            app.listen(3000);
            console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
        });
    }
});
*/
// but for now, I must make the world work
(function () {
    var w = new World('test');
    w.addNewPlayer('alaskagirl');
    w.iterate();
}());
