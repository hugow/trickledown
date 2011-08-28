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
        title: 'Express '
    });
});

/// get the profiles of a specific user
app.get('/worlds/:name/players/:username/profiles', function (req, res) {
});

// set the profiles of a specific user
app.post('/worlds/:name/players/:username/profiles', function (req, res) {
});

// get the state of a specific user
//http://127.0.0.1:3000/worlds/opov/players/NPC1
app.get('/worlds/:name/players/:username', function (req, res) {
    var sim = app.settings.simulationEngine,
        state = sim.getPlayerState(req.params.name, req.params.username);
    if (state === undefined) {
        throw 'Unknown username: ';
    }
    res.send(JSON.stringify(state));
});

// get the state of the world
app.get('/worlds/:name', function (req, res) {
    var sim = app.settings.simulationEngine,
        state = sim.getWorldState(req.params.name);
    res.send(JSON.stringify(state));
});


createSimulation(function (err, simulation) {
    if (err) {
        console.log(err);
    } else {
        simulation.start();
        app.set('simulationEngine', simulation);

        // start the server
        app.listen(3000);
        console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
    }
});

