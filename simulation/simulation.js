var mongodb = require('mongodb'),
    async = require('async'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    engine = require('./engine'),
    World = engine.World,
    forEachProperty = engine.forEachProperty;

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
Simulation.prototype.close = function () {
    if (this.interval) {
        clearInterval(this.interval);
        delete this.interval;
    }

    this.dbClient.close();
};
Simulation.prototype.start = function () {
    var that = this;
    this.interval = setInterval(function () {
        that.iterate();
    }, 2000);
};
Simulation.prototype.iterate = function () {
    this.periodicalSave();
    forEachProperty(this.worlds, function (world) {
        world.iterate();
    });
};
Simulation.prototype.createUser = function (
    username,
    password,
    callback
) {
    var players = [], collection = this.playerCol;
    forEachProperty(this.worlds, function (world) {
        if (world.population.length < 1500) {
            players.push(world.addNewPlayer(username, password, callback));
        }
    });
    // prevent the world from exploding
    if (players.length === 0) {
        return callback('world limit reached');
    }
    async.forEach(
        players,
        function (player, callback) {
            player.save(collection, function (err) {
                callback(err);
            });
        },
        callback
    );
};
Simulation.prototype.updatePlayer = function (
    username,
    password,
    world,
    spendingProfile,
    votingProfile,
    investmentProfile,
    isNPC,
    callback
) {
    var player = this.worlds[world].getPlayer(username),
        that = this;
    function update() {
        // if the password matches
        if (player.password === password) {
            // update the player
            player.setVotingProfile(votingProfile.taxTheRich, votingProfile.taxThePoor, votingProfile.redistributeToCorporations);
            player.setSpendingProfile(Number(spendingProfile.goods), Number(spendingProfile.education), Number(spendingProfile.stocks), Number(spendingProfile.savings));
            player.setInvestmentProfile(investmentProfile);
            player.setNPC(isNPC);
            // synch it
            player.save(that.playerCol, callback);
        } else {
            return callback('invalid password');
        }
    }
    // if the player does not exist in this world
    // we must create it in all worlds
    if (!player) {
        this.createUser(username, password, function (err) {
            if (err) {
                return callback('could not create user');
            }
            player = that.worlds[world].getPlayer(username);
            update();
        });
    } else {
        update();
    }
};
Simulation.prototype.getWorldState = function (
    worldName
) {
    var state, world = this.worlds[worldName];
    if (world) {
        state = {
            totalCash: world.getTotalCash(),
            moneyDistribution: world.getMoneyDistribution(),
            topPlayers: world.getTopPlayers(8),
            statistics: world.getStatistics(),
            industryStatistics: world.getIndustryStatistics()
        };
    }
    return state;
};
Simulation.prototype.getPlayerState = function (
    worldName,
    username
) {
    var state, world = this.worlds[worldName], player;
    if (world) {
        player = world.getPlayer(username);
        if (player) {
            state = {
                cash: player.cash,
                savings: player.savings,
                rank: player.rank,
                totalPlayers: world.population.length,
                statistics: player.statistics,
                portfolioStatistics: player.portfolio.statistics
            };
        }
    }
    return state;
};
Simulation.prototype.getPlayerProfiles = function (
    worldName,
    username,
    password
) {
    var state, world = this.worlds[worldName], player;
    if (world) {
        player = world.getPlayer(username);
        if (player) {
            if (player.password !== password) {
                throw "Invalid credentials";
            }
            state = {
                spendingProfile: player.getSpendingProfile(),
                votingProfile: player.getVotingProfile(),
                investmentProfile: player.getInvestmentProfile(),
            };
        }
    }
    return state;
};
// this is used to create a fake world, to allow the demonstration
// of the whole thing
Simulation.prototype.generateFakeUsers = function (
    number,
    callback
) {
    var that = this, i, toprocess = number;

    function internalCb(err) {
        toprocess -= 1;
        if (toprocess === 0) {
            callback();
        }
    }

    function getRandomInvestmentProfile(world) {
        var o = {};
        world.getIndustries().forEach(function (sector) {
            var prof = o[sector] = {};
            world.getInvestmentReasons().forEach(function (reason) {
                prof[reason] = Math.random();
            });
        });
        return o;
    }

    function updatePlayer(i) {
        forEachProperty(that.worlds, function (world, worldName) {
            that.updatePlayer(
                "NPC" + i,
                "pw" + i,
                worldName,
                { goods: Math.random(), education: Math.random(), stocks: Math.random(), savings: Math.random() },
                { taxTheRich: Math.random() * 0.5, taxThePoor: Math.random() * 0.5, redistributeToCorporations: Math.random() },
                getRandomInvestmentProfile(world),
                true,
                internalCb
            );
        });
    }

    for (i = 0; i < number; i += 1) {
        updatePlayer(i);
    }
};

Simulation.prototype.periodicalSave = function () {
    var that = this;
    if (this.nextSave === undefined) {
        this.nextSave = 20;
    } else if (this.nextSave === 0) {
        this.nextSave = 20;
        forEachProperty(this.worlds, function (world) {
            console.log('Saving world ' + world.worldName);
            world.save(that.playerCol ,function (err) {
                if (err) {
                    console.log('Error while saving world ' + world.worldName + ': ' + err);
                }
            });
        });
    }
    this.nextSave -= 1;
};

Simulation.prototype.load = function (callback) {
    var that = this;
    async.map(
        Object.keys(this.worlds),
        function (worldName, callback) {
            var world = that.worlds[worldName];
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
