/*globals module, __dirname */
/**
 * Module dependencies.
 */

var express = require('express'),
    app = module.exports = express.createServer(),
    nko = require('nko')('HDMpimMItHdc/S+8'),
    createSimulation = require('./simulation/simulation').createSimulation;

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

createSimulation(function (err, simulation) {
    simulation.start();
    // we should add the simulation to the app
    // ... right here FIXME

    // start the server
    //app.listen(3000);
    //console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

