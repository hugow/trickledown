// The only thing that will need to be in the database, hopefully,
// will be:
// users (username, hashed password, pid1, pid2)
// playersfunction

// javascript illeteracy: there should be a standard way to do this (obj.keys().forEach ???)
function forEachProperty(object, f) {
    var v;
    for (v in object) {
        if (object.hasOwnProperty(v)) {
            f(object[v], v, object);
        }
    }
}
//      -
// + the simulation will run in memory
// + the db will be updated once in a while (we only use it as a big object
//      store, not really to make queries... as far a the simulation is concerned)
// (we can recreate the world from the db but run it in memory)

// this is a player's portfolio (stocks he owns, stuff)
function Portfolio(o) {
    var that = this;
    forEachProperty(o, function (value, prop) {
    });
}

// this is a game player (i.e not a user but a player)
function Player(o) {
    var that = this;
    if (o === undefined) {
        o = {
            world: 'default',
            howToSpend: {
                goods: 0.5,
                education: 0.4,
                stocks: 0.1,
                savings: 0
            },
            vote: {
                // how much the government should collect from the rich (and redistribute equally)
                taxTheRich: 0.01,
                // how much the government should collect from the poor (and redistribute equally)
                taxThePoor: 0.1,
                // what portion of the total taxes should go to corporations (i.e. reverse robin hood)
                redistributeToCorporations: 0.2
            },
            education: 0,
            cash: 0,
            income: 0,
            savings: 0,
            portfolio: {
                // investment priorities: how we want to spend our money
                priorities: {
                },
                // stocks: what we have purchased
                stocks: {
                }
            }
        };
    }
    // keep the id if it is defined
    forEachProperty(o, function (value, prop) {
        that[prop] = value;
    });
    // override the portfolio
    this.portfolio = new Portfolio(this.portfolio);
    if (o._id) {
        this.id = o._id;
    }
}

// this is a world
function World(worldName) {
    this.worldName = worldName;
    this.population = [];
}
World.prototype.snapShotToDb = function (db, callback) {

};
// note: this will only be called at the startup when the world is
// loading (no simulation while loading)
World.createFromDb = function (db, worldName, callback) {
    // create an empty world
    var that = new World(worldName);

    db.collection('players', function (err, coll) {
        if (err) {
            return callback(err);
        }
        // find all objects in the specified world
        coll.find({ world: worldName }, function (err, cursor) {
            cursor.each(function (err, player) {
                // we are done
                if (player === null) {
                    return callback(null, that);
                }
                // otherwise, create a player and add it
                that.population.add(new Player(player));
            });
        });
    });
};

exports.World = World;
