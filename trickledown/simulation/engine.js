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
Portfolio.prototype.invest = function (purchaseSystem, amount) {
    // FIXME: put the money somewhere
};

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
Player.prototype.spend = function (purchaseSystem) {
    var education, goods, stocks, howToSpend = this.howToSpend;
    // we cash our savings
    this.cash += this.savings;
    this.savings = 0;

    // if we do have some cash
    if (this.cash > 0) {
        // at this time, taxes should have been paid already
        education = this.cash * howToSpend.education;
        goods = this.cash * howToSpend.goods;
        stocks = this.cash * howToSpend.savings;
        // update what we have
        this.savings = this.cash - (education + goods + stocks);
        this.cash = 0;
        this.education += education;
        this.portfolio.invest(purchaseSystem);
        // make sure the money goes somewhere
        purchaseSystem.buyEducation(education);
        purchaseSystem.buyGoods(this.cash * howToSpend.goods);
    }
};

// this is a world
function World(worldName) {
    this.worldName = worldName;
    this.population = [];
    // keep track of some stock, per iteration cycle
    this.statistics = {};
}
// buys some education
World.prototype.buyEducation = function (amount) {
    this.statistics.totalSpentOnEducation += amount;
    // this money goes to the government or 'world', could also be an industry
    this.cash += amount;
};
// buys some goods
World.prototype.buyGoods = function (amount) {
    this.statistics.totalSpentOnGoods += amount;
    this.spentOnGoods += amount;
};
// invest in some industry
World.prototype.invest = function (industry, amount) {
// FIXME: put the money somewhere
};
// this will perform an iteration of the simulation
World.prototype.iterate = function () {
    console.log('[iterate');
    var that = this;
    // useless case
    if (this.population.length === 0) {
        return;
    }

    // NOTE: the result of a simulation cycle is that none of the money is
    // lost and that all of the money is in the hand of players. So this
    // (all the money in the hand pf players) is also the initial state.

    // 1. make everyone spend his money according to his priorities
    this.population.forEach(function (person) {
        person.spend(that);
    });

    // 2. take the money spent by players and distribute it to economic sectors

    // 3. make the industries distribute salaries

    // 4. apply taxation

    // 5. distribute dividends

    // 6. amortize investments

    console.log('iterate]');
};
// creates a player (FIXME: the player will have to be added to the db?
// maybe not: this only happens when we add a new user... so...
// the async thing could be done after
World.prototype.addNewPlayer = function (username) {
    var p = new Player();
    this.population.push(p);
    return p;
};
// dump the world to mongo (needed before we shutdown, and maybe periodically)
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
