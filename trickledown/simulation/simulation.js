var mongodb = require('mongodb'),
    async = require('async'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    World = require('./engine').World;

// all what we need to run the simulation is there
function Simulation(dbClient, userCol, playerCol) {
    this.dbClient = dbClient;
    this.userCol = userCol;
    this.playerCol = playerCol;
    this.worlds = {
        // one dollar one vote (corrupt) world
        odov:  new World('odov', true),
        // one person one vote (clean) world
        opov: new World('opov', false)
    };
}
Simulation.prototype.start = function () {
    console.log('simulation start');
    this.worlds.odov.addNewPlayer('alaskagirl');
    this.worlds.odov.iterate();
    console.log('Total cash ' + this.worlds.odov.getTotalCash());
    // if we dont't do this, the thing will never exit
    this.dbClient.close();
};
Simulation.prototype.updatePlayer = function (
    username,
    password,
    world
) {
};
Simulation.prototype.getWorldState = function (
    username,
    password,
    world
) {
};
Simulation.prototype.getPlayerState = function (
    username,
    password,
    world
) {
};
Simulation.prototype.generateFakeUsers = function (
    number
) {
};
Simulation.prototype.load = function (callback) {
    var that = this;
    async.map(
        this.worlds,
        function (world, callback) {
            world.load(that.playerCol, callback);
        },
        callback
    );
};
function createSimulation(callback) {
    var sim;
    async.waterfall([
        // open the client
        function (callback) {
            var client = new Db('trickledown', new Server("127.0.0.1", 27017, {}));
            client.open(function (err) {
                callback(err, client);
            });
        },
        // create the collections
        function (client, callback) {
            var collectionNames = [ 'users', 'players' ];
            async.map(
                collectionNames,
                function (name, callback) {
                    client.collection(name, function (err, collection) {
                        callback(err, collection);
                    });
                },
                function (err, collections) {
                    callback(err, client, collections);
                }
            );
        },
        // create the simulation object and load the existing worlds
        function (client, collections, callback) {
            sim = new Simulation(client, collections[0], collections[1]);
            sim.load(function (err) {
                callback(err, sim);
            });
        }
    ], function (err) {
        if (err) {
            return callback(err);
        }
        callback(err, sim);
    });
}
exports.createSimulation = createSimulation;
