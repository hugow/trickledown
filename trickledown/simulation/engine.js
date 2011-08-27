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
        that[prop] = value;
    });
}
Portfolio.reasons = [
    'technology',   // increase market share without increasing salaries
    'size',         // increase market share by growing (increasing salaries)
    'lobbying'      // increase the share of grants (this does not increase
                    // market share but increases government 'help' to
                    // the industries)
];

// (this determines how to split the new money between existing accounts)
// (the sum of all weights does not need to be 1, the percentages will be
// automatically computed)
// (sector is the industry name... the name of the industrial sector)
Portfolio.prototype.setInvestmentWeight = function (sector, reason, weight) {
    var total = 0;
    if (this.priorities[sector] === undefined) {
        this.priorities[sector] = {
            sector: sector,
            reasons: {}
        };
    }
    this.priorities[sector].reasons[reason] = {
        value: weight
    };
    // compute PERCENTAGES
    // (make sure the sum of all our priorities is 1 at most)
    // (it could also be zero if we invest in nothing)
    // compute the total
    forEachProperty(this.priorities, function (p) {
        forEachProperty(p.reasons, function (r) {
            total += r.value;
        });
    });
    if (total !== 0) {
        // compute the percentages
        forEachProperty(this.priorities, function (p) {
            forEachProperty(p.reasons, function (r) {
                r.percent = r.value / total;
            });
        });
    }
};
Portfolio.prototype.invest = function (purchaseSystem, amount) {
    // put the money somewhere according to the investment
    // percentages
    var that = this, totalInvested = 0;
    forEachProperty(this.priorities, function (p, sector) {
        forEachProperty(p.reasons, function (r, reason) {
            var toInvest = amount * r.percent;
            totalInvested += toInvest;

            if (that.stocks[p.sector] === undefined) {
                that.stocks[sector] = {};
            }
            if (that.stocks[sector][reason] === undefined) {
                that.stocks[sector][reason] = toInvest;
            } else {
                this.stocks[sector][reason] += toInvest;
            }
            purchaseSystem.invest(sector, reason, toInvest, this.stocks[sector][reason]);
        });
    });
    // things must balance... and someone could have nothing in his
    // profile... so the money should not dissappear in this case
    return amount - totalInvested;
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
        // if for some reason we could not invest (invalid investment percentages,
        // we move the money to the savings... for now)
        this.savings += this.portfolio.invest(purchaseSystem, stocks);
        // make sure the money goes somewhere
        purchaseSystem.buyEducation(education);
        purchaseSystem.buyGoods(goods * howToSpend.goods);
    }
};

Player.prototype.getEducation = function () {
    return this.education;
};

Player.prototype.getDividendSharingWeight = function (sector) {
    var portfolio = this.portfolio;
    // note: we don't count the lobbying
    return portfolio.stocks[sector] !== undefined ?
        portfolio.stocks[sector].technology + portfolio.stocks[sector].size :
        0;
};

Player.prototype.paySalary = function (amount) {
    this.income = amount;
};

Player.prototype.taxIncome = function (taxes) {
    this.cash = this.income - taxes;
    this.income = 0;
};

Player.prototype.payGovernmentServices = function (taxes) {
    this.cash += taxes;
};

Player.prototype.payDividends = function (amount) {
    this.cash += amount;
};

// this is an industry
function Industry(sector) {
    this.sector = sector;
    this.cash = 0;
}
Industry.prototype.resetInvestmentData = function () {
    var that = this;
    this.investments = {};
    Portfolio.reasons.forEach(function (reason) {
        that.investments[reason] = 0;
    });
};
Industry.prototype.invest = function (reason, amount, integratedAmount) {
    this.cash += amount;
    this.investments[reason] += integratedAmount;
    // NOTE: lobbying money should go to some government individuals...
    // this... is absurdly complicated, we will leave this money
    // as cash in the industry... we will put this money on our payroll...
    // and increase salaries accordingly
};

Industry.prototype.updateMarketWeight = function () {
    // let's say it costs more in technology to get
    var investments = this.investments;
    investments.marketWeight =
        investments.size +
        investments.technology * 0.5;
};

Industry.prototype.getMarketWeight = function () {
    return this.investments.marketWeight;
};

Industry.prototype.getLobbyingWeight = function () {
    return this.investments.lobbying;
};

Industry.prototype.purchaseGoods = function (amount) {
    this.cash += amount;
};

Industry.prototype.collectSalaries = function () {
    var investments = this.investments,
        tot = investments.size + investments.technology + investments.lobbying,
        payroll = investments.size + investments.lobbying,
        salaries;
    if (tot > 0) {
        salaries = this.cash * payroll / tot;
    } else {
        // no investments... kinda weird.. return everything as salaries
        salaries = this.cash;
    }
    this.cash -= salaries;
    return salaries;
};

Industry.prototype.payGovernmentContract = function (amount) {
    this.cash += amount;
};

Industry.prototype.distributeDividends = function (population) {
    var dividends = this.cash,
        totalWeight = 0,
        sector = this.sector,
        that = this,
        dividendRatio;
    // we spend dividends and salary. dividends are paid to investors, proportional
    // to their investment
    population.forEach(function (player) {
        totalWeight += player.getDividendSharingWeight(sector);
    });
    if (totalWeight > 0) {
        // keep the ratio
        dividendRatio = dividends / totalWeight;
        population.forEach(function (player) {
            var pay = player.getDividendSharingWeight(sector) * dividendRatio;
            // pay dividends
            player.payDividends(pay);
            that.cash -= pay;
        });
    }
};

// this is a world
function World(worldName, oneDollarOneVote) {
    var that = this;
    this.worldName = worldName;
    this.population = [];
    this.cash = 0;
    this.spentOnGoods = 0;
    // how we vote
    this.oneDollarOneVote = oneDollarOneVote;
    // industries
    this.industries = [
        new Industry('wood'),
        new Industry('metal'),
        new Industry('drugs'),
        new Industry('electronics'),
        new Industry('cars'),
        new Industry('cinema'),
        new Industry('software')
    ];
    // (quickly find by name)
    this.industryIndex = {};
    this.industries.forEach(function (ind) {
        that.industryIndex[ind.sector] = ind;
    });
    // keep track of some stock, per iteration cycle
    this.statistics = {};
}
// the 'purchase' interface (begin)
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
World.prototype.invest = function (sector, reason, amount, integratedAmount) {
    this.industryIndex[sector].invest(reason, amount, integratedAmount);
};
// the 'purchase' interface (end)

// this will distribute the money spent on goods
World.prototype.purchaseIndustryGoods = function () {
    var totalMarketWeight = 0,
        moneyToDistribute = this.spentOnGoods;
    this.spentOnGoods = 0;
    this.industries.forEach(function (ind) {
        ind.updateMarketWeight();
        totalMarketWeight += ind.getMarketWeight();
    });
    if (totalMarketWeight !== 0) {
        this.industries.forEach(function (ind) {
            ind.purchaseGoods(moneyToDistribute * ind.getMarketWeight() / totalMarketWeight);
        });
    } else {
        // the money must go somewhere
        this.cash += moneyToDistribute;
    }
};

World.prototype.distributeSalaries = function () {
    var salaries = 0,
        totEducation = 0;
    // lets compute all the money available for salaries
    this.industries.forEach(function (ind) {
        salaries += ind.collectSalaries();
    });
    // now that we have this money, we must distribute it to the population
    this.population.forEach(function (player) {
        totEducation += player.getEducation();
    });
    if (totEducation > 0) {
        this.population.forEach(function (player) {
            player.paySalary(salaries * player.getEducation() / totEducation);
        });
    } else {
        // the money must go somewhere
        // let's keep it to the governement
        this.cash += salaries;
    }
};

World.prototype.distributeGovernmentMoneyToCorporations = function (amount) {
    var that = this,
        totalInvestments = 0;
    // reset the market weight of all industries
    this.industries.forEach(function (ind) {
        totalInvestments += ind.getLobbyingWeight();
    });
    // if noone spent on lobbying, distribute equally to all industries
    if (totalInvestments === 0) {
        amount /= this.industries.length;
        this.industries.forEach(function (ind) {
            ind.cash += amount;
        });

    } else {
        // now that we know the total investment we can
        // redistribute it
        amount /= totalInvestments;
        this.industries.forEach(function (ind) {
            ind.payGovernmentContract(ind.lobbying * amount);
        });
    }
};

// this is the fun part, how the government acts on the economy
World.prototype.taxation = function () {
    var taxTheRich = 0,
        taxThePoor = 0,
        redistributeToCorporations = 0,
        maxIncome = 0,
        incomeWeight = 0,
        taxes = 0,
        voteWeight = 0,
        toCorporations = 0,
        getVoteWeight = this.oneDollarOneVote ?
            function (person) { return person.income + person.cash + person.savings + 1; } :
            function (person) { return 1; };

    // compute the taxation profile
    this.population.forEach(function (person) {
        var weight = getVoteWeight(person);
        taxTheRich += person.vote.taxTheRich * weight;
        taxThePoor += person.vote.taxThePoor * weight;
        redistributeToCorporations += person.vote.redistributeToCorporations * weight;
        voteWeight += weight;
        if (person.income > maxIncome) {
            maxIncome = person.income;
        }
    });

    taxTheRich /= voteWeight;
    taxThePoor /= voteWeight;
    redistributeToCorporations /= voteWeight;

    // collect taxes
    if (maxIncome > 0) {
        // collect from everyone
        this.population.forEach(function (person) {
            var tax = (person.income * taxTheRich +
                (maxIncome - person.income) * taxThePoor) * person.income / maxIncome;
            taxes += tax;
            person.taxIncome(tax);
        });
    }
    // keep some stats
    this.statistics.incomeTaxes = taxes;
    this.statistics.educationTaxes = this.cash;
    this.statistics.taxTheRich = taxTheRich;
    this.statistics.taxThePoor = taxThePoor;
    // redistribute
    taxes += this.cash; // education money

    toCorporations = taxes * redistributeToCorporations;
    taxes = taxes - toCorporations;
    taxes /= this.population.length;
    this.cash = 0;



    // equally distribute to all people
    this.population.forEach(function (player) {
        player.payGovernmentServices(taxes);
    });
    // distribute redistributeToCorporations to the prorata of lobbying
    this.distributeGovernmentMoneyToCorporations(toCorporations);
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

    // 0. reset invesment data in all industries
    this.industries.forEach(function (ind) {
        ind.resetInvestmentData();
    });

    // 1. make everyone spend his money according to his priorities
    this.population.forEach(function (person) {
        person.spend(that);
    });

    // 2. take the money spent by players on goods and distribute it to economic
    // sectors (i.e. share the purchases between the industrial sectors)
    this.purchaseIndustryGoods();

    // 3. make the industries distribute salaries
    this.distributeSalaries();

    // 4. apply taxation on salaries
    this.taxation();

    // 5. distribute dividends
    this.industries.forEach(function (ind) {
        ind.distributeDividends(that.population);
    });

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
// computes the total amount of money in the world
World.prototype.getTotalCash = function () {
    var total = 0;
    this.population.forEach(function (p) {
        total += (p.cash + p.savings + p.income);
    });
    forEachProperty(this.industries, function (p) {
        total += p.cash;
    });
    total += this.spentOnGoods;
    total += this.cash;
    return total;
};
// dump the world to mongo (needed before we shutdown, and maybe periodically)
World.prototype.snapShotToDb = function (db, callback) {

};
// note: this will only be called at the startup when the world is
// loading (no simulation while loading)
World.prototype.load = function (collection, callback) {
    // create an empty world
    var that = this;

    // find all objects in the specified world
    collection.find({ world: this.worldName }, function (err, cursor) {
        cursor.each(function (err, player) {
            // we are done
            if (player === null) {
                return callback(null, that);
            }
            // otherwise, create a player and add it
            that.population.add(new Player(player));
        });
    });
};

exports.World = World;
