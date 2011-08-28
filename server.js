/*globals module, __dirname */
/**
 * Module dependencies.
 */

var express = require('express'),
    app = module.exports = express.createServer(),
    nko = require('nko')('HDMpimMItHdc/S+8'),
    url = require('url'),

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
    var sim = app.settings.simulationEngine,
        parsed = url.parse(req.url, true),
        password = parsed.query.password;

    res.send(JSON.stringify(sim.getPlayerProfiles(
        req.params.name,
        req.params.username,
        password
    )));
});

// set the profiles of a specific user
app.post('/worlds/:name/players/:username/profiles', function (req, res) {
    var sim = app.settings.simulationEngine,
        parsed = url.parse(req.url, true),
        password = parsed.query.password,
        content = '';

	sim.updatePlayer(
        req.params.username,
        password,
        req.params.name,
        req.body.spendingProfile,
        req.body.votingProfile,
        req.body.investmentProfile,
        false,
        function (err, callback) {
            if (err) {
                return res.send(err);
            }
            res.send('ok');
        }
    );

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
        // (I don't know why 80 fails in my development setup, probably
        // very obvious... but I don't have time to waste on this)
        try {
            app.listen(80);
        } catch (e) {
            app.listen(3000);
        }
        console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
    }
});

