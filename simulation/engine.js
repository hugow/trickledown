/**
    File: engine.js
    copyright (c) 2011 Hugo Windisch

    The author can be contacted at ideadotprototype.tumblr.com

    This file is part of TrickleDown.

    TrickleDown is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    TrickleDown is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with TrickleDown.  If not, see <http://www.gnu.org/licenses/>.
*/

var COST_OF_LIVING = 10000;

// javascript illeteracy: there should be a standard way to do this (obj.keys().forEach ???)
function forEachProperty(object, f) {
    var v;
    for (v in object) {
        if (object.hasOwnProperty(v)) {
            f(object[v], v, object);
        }
    }
}
// fixes a number that arrives from the external world
function fixNumber(n) {
    n = Number(n);
    if (isNaN(n)) {
        n = 0;
    }
    return n;
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
            r.percent = 0;
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
            if (r.percent) {
                var toInvest = amount * r.percent;
                totalInvested += toInvest;

                if (that.stocks[sector] === undefined) {
                    that.stocks[sector] = {};
                }
                if (that.stocks[sector][reason] === undefined) {
                    that.stocks[sector][reason] = toInvest;
                } else {
                    that.stocks[sector][reason] += toInvest;
                }
                purchaseSystem.invest(sector, reason, toInvest, that.stocks[sector][reason]);
                that.investmentStatistic(sector, toInvest);
            }
        });
    });
    // things must balance... and someone could have nothing in his
    // profile... so the money should not dissappear in this case
    return amount - totalInvested;
};
Portfolio.prototype.getInvestmentProfile = function () {
    var result = {};
    forEachProperty(this.priorities, function (p, sector) {
        result[sector] = {};
        forEachProperty(p.reasons, function (r, reason) {
            result[sector][reason] = r.value;
        });
    });
    return result;
};

Portfolio.prototype.resetStatistics = function () {
    var that = this;
    this.statistics = { spent: {}, received: {}};
    forEachProperty(this.priorities, function (p, sector) {
        that.statistics.spent[sector] = 0;
        that.statistics.received[sector] = 0;
    });
};

Portfolio.prototype.investmentStatistic = function (sector, amount) {
    if (this.statistics.spent[sector] === undefined) {
        this.statistics.spent[sector] = 0;
    }
    this.statistics.spent[sector] += amount;
};

Portfolio.prototype.dividendStatistic = function (sector, amount) {
    if (this.statistics.received[sector] === undefined) {
        this.statistics.received[sector] = 0;
    }
    this.statistics.received[sector] += amount;
};
// make the portfolio leak some of its value over time
Portfolio.prototype.age = function () {
    var factors = {
        size: 0.99,
        technology: 0.99,
        lobbying: 0.9
    };
    forEachProperty(this.stocks, function (stock) {
        forEachProperty(stock, function (value, reason) {
            if (factors[reason]) {
                stock[reason] *= factors[reason];
            }
        });
    });
};
// this is a game player (i.e not a user but a player)
function Player(username, password, worldName, o) {
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
            cash: 100000,
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
    this.username = username;
    this.password = password;
    this.world = worldName;
    // override the portfolio
    this.portfolio = new Portfolio(this.portfolio);
    if (o._id) {
        this.id = o._id;
    }
    this.resetStatistics();
}
Player.prototype.npcControl = function () {
    // we will use the satistics to somehow control the NPC and make it do things
    // semi clever
    function limit(v, m) {
        if (v > m) {
            v = m;
        }
        if (v < 0) {
            v = 0;
        }
        return v;
    }
    if (this.npc) {
        var howToSpend = this.howToSpend,
            goods = howToSpend.goods,
            education = howToSpend.education,
            stocks = howToSpend.stocks,
            savings = howToSpend.savings;

        // adjust spending on goods
        if (this.cash < 10000) {
            goods = 0;
        } else if ((this.statistics.spentOnGoods / this.cash) > 0.40) {
            goods *= 0.9;
        } else {
            goods += 0.001;
            goods *= 1.1;
        }
        // adjust education
        if (this.statistics.spentOnEducation > this.statistics.receivedInSalary) {
            education *= 0.9;
        } else {
            education += 0.001;
            education *= 1.1;
        }
        // adjust investments
        if (this.statistics.spentOnStocks > this.statistics.receivedInDividends) {
            stocks *= 0.9;
        } else {
            stocks += 0.001;
            stocks *= 1.1;
        }
        // savings are mostly useless
        savings = 0;
        this.setSpendingProfile(goods, education, stocks, savings);

        // adjust our voting profile to make us richer (hopefully)
        if (this.cash > 100000) {
            this.vote.taxTheRich = 0.1;
            this.vote.taxThePoor = 0.5;
            this.vote.redistributeToCorporations = 0.7;
        } else {
            this.vote.taxTheRich = 0.5;
            this.vote.taxThePoor = 0.1;
            this.vote.redistributeToCorporations = 0.2;
        }

        /*
        override by uncommenting to test a specific case
        this.vote.taxTheRich = 0;
        this.vote.taxThePoor = 0;
        this.vote.redistributeToCorporations = 1;
        */

        this.vote.redistributeToCorporations = limit(this.vote.redistributeToCorporations, 1);
        this.vote.taxTheRich = limit(this.vote.taxTheRich, 0.4);
        this.vote.taxThePoor = limit(this.vote.taxThePoor, 0.4);
        // don't touch the portfolio stuff
    }
};
Player.prototype.save = function (collection, callback) {
    collection.update(
        {world: this.world, username: this.username},
        this,
        { upsert: true, safe: true},
        callback
    );
};
Player.prototype.resetStatistics = function () {
    // clear the stats
    this.statistics = {
        spentOnEducation: 0,
        spentOnGoods: 0,
        spentOnStocks: 0,
        spentOnTaxes: 0,
        spentOnSavings: 0,
        receivedInSalary: 0,
        receivedInDividends: 0,
        receivedFromGovernment: 0,
        receivedFromSavings: 0
    };
    this.portfolio.resetStatistics();
};
Player.prototype.setVotingProfile = function (taxTheRich, taxThePoor, redistributeToCorporations) {
    taxTheRich = fixNumber(taxTheRich);
    taxThePoor = fixNumber(taxThePoor);
    redistributeToCorporations = fixNumber(redistributeToCorporations);
    this.vote = {
        // how much the government should collect from the rich (and redistribute equally)
        taxTheRich: taxTheRich,
        // how much the government should collect from the poor (and redistribute equally)
        taxThePoor: taxThePoor,
        // how much of the collected taxes is distributed to corporations not people
        redistributeToCorporations: redistributeToCorporations
    };
};
Player.prototype.setSpendingProfile = function (goods, education, stocks, savings) {
    goods = fixNumber(goods);
    education = fixNumber(education);
    stocks = fixNumber(stocks);
    savings = fixNumber(savings);

    var total = goods + education + stocks + savings;
    if (total === 0) {
        this.howToSpend = {
            goods: 0,
            education: 0,
            stocks: 0,
            savings: 1
        };
    } else {
        this.howToSpend = {
            goods: goods / total,
            education: education / total,
            stocks: stocks / total,
            savings: savings / total
        };
    }
};
Player.prototype.setInvestmentProfile = function (investmentProfile) {
    var portfolio = this.portfolio;
    forEachProperty(investmentProfile, function (ind, sector) {
        forEachProperty(ind, function (value, reason) {
            portfolio.setInvestmentWeight(sector, reason, fixNumber(value));
        });
    });
};
Player.prototype.getSpendingProfile = function () {
    var result = {};
    forEachProperty(this.howToSpend, function (v, n) {
        result[n] = v;
    });
    return result;
};
Player.prototype.getVotingProfile = function () {
    var result = {};
    forEachProperty(this.vote, function (v, n) {
        result[n] = v;
    });
    return result;
};
Player.prototype.getInvestmentProfile = function () {
    return this.portfolio.getInvestmentProfile();
};
Player.prototype.setNPC = function (npc) {
    this.npc = npc;
};
Player.prototype.isNPC = function () {
    return this.npc;
};
Player.prototype.spend = function (purchaseSystem) {
    var education, goods, basicgoods, stocks, howToSpend = this.howToSpend,
        initialSavings = this.savings;

    // we cash our savings
    this.cash += this.savings;
    this.savings = 0;
    // there is a minimal amount we must spend on goods to live
    basicgoods = COST_OF_LIVING;
    if (basicgoods > this.cash) {
        basicgoods = this.cash;
    }
    this.cash -= basicgoods;
    purchaseSystem.buyGoods(basicgoods);
    // this is our discretionary spending
    // ----------------------------------
    // at this time, taxes should have been paid already
    education = this.cash * howToSpend.education;
    goods = this.cash * howToSpend.goods;
    stocks = this.cash * howToSpend.stocks;
    // update what we have
    this.savings = this.cash - (education + goods + stocks);
    this.cash = 0;
    this.education += education;
    // if for some reason we could not invest (invalid investment percentages,
    // we move the money to the savings... for now)
    this.savings += this.portfolio.invest(purchaseSystem, stocks);

    // make sure the money goes somewhere
    purchaseSystem.buyEducation(education);
    purchaseSystem.buyGoods(goods);

    // keep stats
    if (this.savings > initialSavings) {
        this.statistics.spentOnSavings = this.savings - initialSavings;
        this.statistics.receivedFromSavings = 0;
    } else {
        this.statistics.spentOnSavings = 0;
        this.statistics.receivedFromSavings = initialSavings - this.savings;
    }
    this.statistics.spentOnEducation = education;
    this.statistics.spentOnGoods = goods + basicgoods;
    this.statistics.spentOnStocks = stocks;
};

Player.prototype.getEducation = function () {
    return this.education;
};

Player.prototype.getDividendSharingWeight = function (sector) {
    var portfolio = this.portfolio, ret = 0;
    // note: we don't count the lobbying
    if (portfolio.stocks[sector]) {
        if (portfolio.stocks[sector].technology) {
            ret += portfolio.stocks[sector].technology;
        }
        if (portfolio.stocks[sector].size) {
            ret += portfolio.stocks[sector].size;
        }
    }
    return ret;
};

Player.prototype.paySalary = function (amount) {
    this.income = amount;
    this.statistics.receivedInSalary = amount;
};

Player.prototype.taxIncome = function (taxes) {
    this.statistics.spentOnTaxes = taxes;
    this.cash = this.income - taxes;
    this.income = 0;
};

Player.prototype.payGovernmentServices = function (taxes) {
    this.cash += taxes;
    this.statistics.receivedFromGovernment += taxes;
};

Player.prototype.payDividends = function (sector, amount) {
    this.cash += amount;
    this.statistics.receivedInDividends += amount;
    this.portfolio.dividendStatistic(sector, amount);
};

Player.prototype.age = function () {
    // make the education age
    this.education = this.education * 0.999;
    // make the portfolio age
    this.portfolio.age();
};

// this is an industry
function Industry(sector) {
    this.sector = sector;
    this.cash = 0;
}
Industry.prototype.resetStatistics = function () {
    this.statistics = {
        spentOnSalaries: 0,
        spentOnLobbying: 0,
        spentOnDividends: 0,
        receivedInPurchases: 0,
        receivedFromGovernment: 0,
        receivedInInvestments: 0
    };
};
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
    this.statistics.receivedInInvestments += amount;
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
    // update the various stats
    this.statistics.marketWeight = investments.marketWeight;
};

Industry.prototype.getMarketWeight = function () {
    return this.investments.marketWeight;
};

Industry.prototype.getLobbyingWeight = function () {
    return this.investments.lobbying;
};

Industry.prototype.purchaseGoods = function (amount) {
    this.cash += amount;
    this.statistics.receivedInPurchases += amount;
};

Industry.prototype.collectSalaries = function () {
    var investments = this.investments,
        tot = investments.size + investments.technology + investments.lobbying,
        salaries = 0,
        lobbying = 0,
        payroll;
    if (tot > 0) {
        salaries = investments.size * this.cash / tot;
        lobbying = investments.lobbying * this.cash / tot;
    } else {
        // no investments... kinda weird.. return everything as salaries
        salaries = this.cash;
    }
    payroll = salaries + lobbying;
    this.cash -= payroll;
    this.statistics.spentOnSalaries += salaries;
    this.statistics.spentOnLobbying += lobbying;

    return payroll;
};

Industry.prototype.payGovernmentContract = function (amount) {
    this.cash += amount;
    this.statistics.receivedFromGovernment += amount;
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
            player.payDividends(that.sector, pay);
            that.cash -= pay;
        });
        this.statistics.spentOnDividends += dividends;
    }
};

// this is a world
function World(worldName, oneDollarOneVote) {
    var that = this;
    this.worldName = worldName;
    this.population = [];
    this.populationIndex = {};
    this.cash = 0;
    this.spentOnGoods = 0;
    // how we vote
    this.oneDollarOneVote = oneDollarOneVote;
    // industries
    this.industries = [
        new Industry('food'),
        new Industry('houses'),
        new Industry('guns'),
        new Industry('health'),
        new Industry('coffins')
    ];
    // (quickly find by name)
    this.industryIndex = {};
    this.industries.forEach(function (ind) {
        that.industryIndex[ind.sector] = ind;
    });
    // keep track of some stock, per iteration cycle
    this.resetStatistics();
}
World.prototype.resetStatistics = function () {
    this.statistics = {
        totalSpentOnEducation: 0,
        totalSpentOnGoods: 0,
        incomeTaxes: 0,
        educationTaxes: 0,
        taxTheRich: 0,
        taxThePoor: 0,
        redistributeToCorporations: 0
    };
    this.population.forEach(function (p) {
        p.resetStatistics();
    });
    this.industries.forEach(function (ind) {
        ind.resetStatistics();
    });
};
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
            ind.payGovernmentContract(amount);
        });

    } else {
        // now that we know the total investment we can
        // redistribute it
        amount /= totalInvestments;
        this.industries.forEach(function (ind) {
            ind.payGovernmentContract(ind.getLobbyingWeight() * amount);
        });
    }
};

// this is the fun part, how the government acts on the economy
World.prototype.taxation = function () {
    var that = this,
        taxTheRich = 0,
        taxThePoor = 0,
        redistributeToCorporations = 0,
        maxIncome = 0,
        incomeWeight = 0,
        taxes = 0,
        voteWeight = 0,
        toCorporations = 0,
        getVoteWeight = this.oneDollarOneVote ?
            function (person) { return (person.income + person.cash + person.savings) > 100000 ? 1 : 0; } :
            function (person) { return 1; };

    // compute the taxation profile
    function computeVoteWeights(getVoteWeight) {
        that.population.forEach(function (person) {
            var weight = getVoteWeight(person);
            taxTheRich += person.vote.taxTheRich * weight;
            taxThePoor += person.vote.taxThePoor * weight;
            redistributeToCorporations += person.vote.redistributeToCorporations * weight;
            voteWeight += weight;
            if (person.income > maxIncome) {
                maxIncome = person.income;
            }
        });
    }
    computeVoteWeights(getVoteWeight);

    // well... this is possible if everyone is below the 100K threshold... which
    // is kinda weird but let's say... vaguely possible
    if (voteWeight === 0) {
        computeVoteWeights(function (person) { return 1; });
     }
    // just for sure!
    if (voteWeight === 0) {
        voteWeight = 1;
    }

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
    this.statistics.redistributeToCorporations = redistributeToCorporations;

    // redistribute
    taxes += this.cash; // education money
    this.cash = 0;
    toCorporations = taxes * redistributeToCorporations;
    taxes = taxes - toCorporations;
    taxes /= this.population.length;

    // equally distribute to all people
    this.population.forEach(function (player) {
        player.payGovernmentServices(taxes);
    });

    // distribute redistributeToCorporations to the prorata of lobbying
    this.distributeGovernmentMoneyToCorporations(toCorporations);
};
// ranks all the players
World.prototype.rankPlayers = function () {
    this.population.sort(function (p1, p2) {
        return p2.statistics.spentOnGoods - p1.statistics.spentOnGoods;
    });
    var i;
    for (i = 0; i < this.population.length; i += 1) {
        this.population[i].rank = i;
    }
};

// ranks all the players
World.prototype.age = function () {
    this.population.forEach(function (p) {
        p.age();
    });
};


// controls the NPC.. without a little help, the rich NPC are too dumb to
// try to pay less taxes... This is too non representative of the real world...
World.prototype.controlNPC = function () {
    var toControl, i;
    // randomly update some of the npcs
    for (i = 0; i < 5; i += 1) {
        toControl = Math.floor(Math.random() * this.population.length);
        this.population[toControl].npcControl();
    }
};

// this will perform an iteration of the simulation
World.prototype.iterate = function () {
    var that = this;
    // useless case
    if (this.population.length === 0) {
        return;
    }
    // NOTE: the result of a simulation cycle is that none of the money is
    // lost and that all of the money is in the hand of players. So this
    // (all the money in the hand pf players) is also the initial state.
    this.resetStatistics();
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
    // 6. age investments
    this.age();

    // 7. rank players from the richest to the poorest (sort players)
    this.rankPlayers();

    // 8. put some semi intelligence in NPC players
    this.controlNPC();
};
// creates a player (FIXME: the player will have to be added to the db?
// maybe not: this only happens when we add a new user... so...
// the async thing could be done after
World.prototype.addNewPlayer = function (username, password) {
    var p = new Player(username, password, this.worldName);
    this.population.push(p);
    this.populationIndex[username] = p;
    return p;
};
World.prototype.getPlayer = function (username) {
    return this.populationIndex[username];
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
World.prototype.getMoneyDistribution = function () {
    var ret = {},
        buckets = [ 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1280000, 1e20 ],
        dataLabels = [ '10K', '20K', '40K', '80K', '160K', '320K', '640K', '128M', 'more' ],
        number = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        total = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        percent = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        spentOnEducation = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        spentOnGoods = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        spentOnStocks = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        spentOnTaxes = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        spentOnSavings = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        receivedInSalary = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        receivedInDividends = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        receivedFromGovernment = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        receivedFromSavings = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ],

        totalValue = 0,
        tots,
        totr,
        i;
    // put employees in an histogram
    this.population.forEach(function (e) {
        var w = e.income + e.cash + e.savings,
            i,
            stats = e.statistics;
        totalValue += w;

        for (i = 0; i < buckets.length; i += 1) {
            if (w < buckets[i]) {
                number[i] += 1;
                total[i] += w;

                spentOnEducation[i] += stats.spentOnEducation;
                spentOnGoods[i] += stats.spentOnGoods;
                spentOnStocks[i] += stats.spentOnStocks;
                spentOnTaxes[i] += stats.spentOnTaxes;
                spentOnSavings[i] += stats.spentOnSavings;
                receivedInSalary[i] += stats.receivedInSalary;
                receivedInDividends[i] += stats.receivedInDividends;
                receivedFromGovernment[i] += stats.receivedFromGovernment;
                receivedFromSavings[i] += stats.receivedFromSavings;

                break;
            }
        }
    });
    for (i = 0; i < buckets.length; i += 1) {
        percent[i] = 100 * total[i] / totalValue;
        tots = (spentOnEducation[i] + spentOnGoods[i] + spentOnStocks[i] + spentOnTaxes[i] + spentOnSavings[i]) / 100;
        totr = (receivedInSalary[i] + receivedInDividends[i] + receivedFromGovernment[i] + receivedFromSavings[i]) / 100;
        if (tots > 0) {
            spentOnEducation[i] /= tots;
            spentOnGoods[i] /= tots;
            spentOnStocks[i] /= tots;
            spentOnTaxes[i] /= tots;
            spentOnSavings[i] /= tots;
        }
        if (totr > 0) {
            receivedInSalary[i] /= totr;
            receivedInDividends[i] /= totr;
            receivedFromGovernment[i] /= totr;
            receivedFromSavings[i] /= totr;
        }
    }

    return {
        buckets: buckets,
        dataLabels: dataLabels,
        number: number,
        total: total,
        percent: percent,
        spentOnEducation: spentOnEducation,
        spentOnGoods: spentOnGoods,
        spentOnStocks: spentOnStocks,
        spentOnTaxes: spentOnTaxes,
        spentOnSavings: spentOnSavings,
        receivedInSalary: receivedInSalary,
        receivedInDividends: receivedInDividends,
        receivedFromGovernment: receivedFromGovernment,
        receivedFromSavings: receivedFromSavings
    };
};

World.prototype.getTopPlayers = function (num) {
    var i, results = [], pl;
    if (num > this.population.length) {
        num = this.population.length;
    }
    for (i = 0; i < num; i += 1) {
        pl = this.population[i];
        results.push({ username: pl.username, value: pl.statistics.spentOnGoods });
    }
    return results;
};

World.prototype.getStatistics = function () {
    var results = [];
    forEachProperty(this.statistics, function (stat, statName) {
        results.push({ name: statName, value: stat});
    });
    return results;
};

World.prototype.getIndustryStatistics = function () {
    var stats = {};
    this.industries.forEach(function (ind) {
        var st = {};
        stats[ind.sector] = st;
        forEachProperty(ind.statistics, function (stat, statName) {
            st[statName] = stat;
        });
    });
    return stats;
};

// dump the world to mongo (needed before we shutdown, and maybe periodically)
World.prototype.save = function (collection, callback) {
    require('async').forEach(this.population, function (p, callback) {
        p.save(collection, callback);
    }, callback);
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
            var p = new Player(player.username, player.password, player.world, player);
            that.population.push(p);
            that.populationIndex[p.username] = p;
        });
    });
};
World.prototype.getIndustries = function () {
    return this.industries.map(function (ind) {
        return ind.sector;
    });
};
World.prototype.getInvestmentReasons = function () {
    return Portfolio.reasons;
};
exports.World = World;
exports.forEachProperty = forEachProperty;
