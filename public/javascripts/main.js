/**
    File: main.js
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

/*
    This stuff is very messy and full of scars and stigmata from its
    node ko origin...

    Could be cleaned up and made less insane.
*/
$(document).ready(function () {
    var singleId = 0,
        // FIXME: should not be known here (should come from the server)
        stockTypes = [ 'food', 'houses', 'guns', 'health', 'coffins' ],
        worldGraphics = { odov: {}, opov: {}},
        playerGraphics = { odov: {}, opov: {}};

    $( "#tabs" ).tabs();

    function getSingleId() {
        var ret = 'id' + singleId;
        singleId += 1;
        return ret;
    }

    // updates the histograms and various graphics for the world
    // FIXME: this pisses memory but I did not find any way to make it work
    //          properly
    function updateWorldGraphics(world, histogram, industryStatistics) {
        var wg1Id = world + '_' + 'worldchart1',
            wg2Id = world + '_' + 'worldchart2',
            wg3Id = world + '_' + 'marketshares',
            wg4Id = world + '_' + 'industryRevenue',
            wg5Id = world + '_' + 'industrySpending';
            wg6Id = world + '_' + 'sbreakdown';
            wg7Id = world + '_' + 'rbreakdown';

        // seems to be leaking heavily if we don't destroy the thing
        try {
            if (worldGraphics[world].wg1 !== undefined) {
                $(wg1Id).empty();
                worldGraphics[world].wg1.destroy();
            }
            worldGraphics[world].wg1 = $.jqplot(wg1Id, [histogram.percent], {
                seriesDefaults:{
                    renderer:$.jqplot.BarRenderer,
                    pointLabels: { show: true }
                },
                axes: {
                    xaxis: {
                        renderer: $.jqplot.CategoryAxisRenderer,
                        ticks: histogram.dataLabels
                    },
                    yaxis: {
                        min: 0
                    }
                },
                highlighter: { show: false }
            });
        } catch (e) {
        }
        try {
            if (worldGraphics[world].wg2 !== undefined) {
                $(wg2Id).empty();
                worldGraphics[world].wg2.destroy();
            }
            worldGraphics[world].wg2 = $.jqplot(wg2Id, [histogram.number], {
                seriesDefaults:{
                    renderer:$.jqplot.BarRenderer,
                    pointLabels: { show: true }
                },
                axes: {
                    xaxis: {
                        renderer: $.jqplot.CategoryAxisRenderer,
                        ticks: histogram.dataLabels
                    },
                    yaxis: {
                        min: 0
                    }
                },
                highlighter: { show: false }
            });
        } catch (e) {
        }

        // industry stuff
        var ind, i,
            toPlot = [],
            indNames = [],
            indPurchase = [],
            indInvest = [],
            indGov = [],
            indSalaries = [],
            indDividends = [],
            indLobbying = [];

        for (ind in industryStatistics) {
            if (industryStatistics.hasOwnProperty(ind)) {
                i = industryStatistics[ind];
                toPlot.push([ind, i.marketWeight]);
                indPurchase.push(i.receivedInPurchases);
                indInvest.push(i.receivedInInvestments);
                indGov.push(i.receivedFromGovernment);
                indSalaries.push(i.spentOnSalaries);
                indDividends.push(i.spentOnDividends);
                indLobbying.push(i.spentOnLobbying);
                indNames.push(ind);
            }
        }
        // market shares of the various industries
        try {
            if (worldGraphics[world].wg3 !== undefined) {
                $(wg3Id).empty();
                worldGraphics[world].wg3.destroy();
            }
            worldGraphics[world].wg3 = $.jqplot(wg3Id, [toPlot], {
              seriesDefaults:{renderer:$.jqplot.PieRenderer, trendline:{show:false}, rendererOptions: { showDataLabels: true}},
              legend:{show:true}
            });
        } catch (e) {
        }

        // revenue of the different industries
        try {
            if (worldGraphics[world].wg4 !== undefined) {
                $(wg4Id).empty();
                worldGraphics[world].wg4.destroy();
            }
            worldGraphics[world].wg4 = $.jqplot(wg4Id, [indPurchase, indGov, indInvest], {
                stackSeries: true,
                seriesDefaults:{
                    renderer:$.jqplot.BarRenderer,
                    pointLabels:{stackedValue: true},
                },
                series: [
                    {
				        label: 'Purchase'
			        },
			        {
				        label: 'Subsidies'
			        },
			        {
			            label: 'Investments'
			        }
			    ],

                axes: {
                    xaxis: {
                        renderer: $.jqplot.CategoryAxisRenderer,
                        ticks: indNames
                    },
                    yaxis: {
                        min: 0
                    }
                },

                highlighter: { show: false },
                legend: {show: true}
            });
        } catch (e) {
        }

        // revenue of the different industries
        try {
            if (worldGraphics[world].wg5 !== undefined) {
                $(wg5Id).empty();
                worldGraphics[world].wg5.destroy();
            }
            worldGraphics[world].wg5 = $.jqplot(wg5Id, [indSalaries, indDividends, indLobbying], {
                stackSeries: true,
                seriesDefaults:{
                    renderer:$.jqplot.BarRenderer,
                    pointLabels:{stackedValue: true},
                },
                series: [
                    {
				        label: 'Salaries'
			        },
			        {
				        label: 'Dividends'
			        },
			        {
			            label: 'Lobbying'
			        }
			    ],

                axes: {
                    xaxis: {
                        renderer: $.jqplot.CategoryAxisRenderer,
                        ticks: indNames
                    },
                    yaxis: {
                        min: 0
                    }
                },

                highlighter: { show: false },
                legend: {show: true}
            });
        } catch (e) {
        }

        // player spending per wealth cat
        try {
            if (worldGraphics[world].wg6 !== undefined) {
                $(wg6Id).empty();
                worldGraphics[world].wg6.destroy();
            }

            worldGraphics[world].wg6 = $.jqplot(wg6Id, [histogram.spentOnEducation, histogram.spentOnGoods, histogram.spentOnStocks, histogram.spentOnTaxes, histogram.spentOnSavings], {
                stackSeries: true,
                seriesDefaults:{
                    renderer:$.jqplot.BarRenderer,
                    pointLabels:{stackedValue: true},
                },
                series: [
                    {
				        label: 'Education'
			        },
			        {
				        label: 'Goods'
			        },
			        {
			            label: 'Stocks'
			        },
			        {
			            label: 'Taxes'
			        },
			        {
			            label: 'Savings'
			        },

			    ],

                axes: {
                    xaxis: {
                        renderer: $.jqplot.CategoryAxisRenderer,
                        ticks: histogram.dataLabels
                    },
                    yaxis: {
                        min: 0,
                        max: 100
                    }
                },

                highlighter: { show: false },
                legend: {show: true}
            });
        } catch (e) {
        }

        // player income per wealth cat
        try {
            if (worldGraphics[world].wg7 !== undefined) {
                $(wg7Id).empty();
                worldGraphics[world].wg7.destroy();
            }
            worldGraphics[world].wg7 = $.jqplot(wg7Id, [histogram.receivedInSalary, histogram.receivedInDividends, histogram.receivedFromGovernment, histogram.receivedFromSavings], {
                stackSeries: true,
                seriesDefaults:{
                    renderer:$.jqplot.BarRenderer,
                    pointLabels:{stackedValue: true},
                },
                series: [
                    {
				        label: 'Salary'
			        },
			        {
				        label: 'Dividends'
			        },
			        {
			            label: 'Soc. Serv.'
			        },
			        {
			            label: 'Savings'
			        }
			    ],

                axes: {
                    xaxis: {
                        renderer: $.jqplot.CategoryAxisRenderer,
                        ticks: histogram.dataLabels
                    },
                    yaxis: {
                        min: 0,
                        max: 100
                    }
                },

                highlighter: { show: false },
                legend: {show: true}
            });
        } catch (e) {
        }

    }

    function updateRanking(world, values) {
        var str = '<table>', i;
        for (i = 0; i < values.length; i += 1) {
            str += '<tr><td>' + values[i].username + '</td><td style="text-align: right">' + Math.round(values[i].value) + '$</td></tr>';
        }
        str += '</table>';
        $('div.' + world + ' div.playerranking').html(str);
    }

    function updateOtherStats(world, values) {
        var str = '<table>', i;
        for (i = 0; i < values.length; i += 1) {
            str += '<tr><td>' + values[i].name + '</td><td>' + (Math.round(values[i].value * 100) / 100) + '</td></tr>';
        }
        str += '</table>';
        $('div.' + world + ' div.otherstats').html(str);
    }

    function updatePlayerGraphics(world, values) {
        $('div.' + world + ' div.graphics').css('display', 'block');
        try {
            $.jqplot(world + '_income', [[
                ['Salaries', values.statistics.receivedInSalary],
                ['Dividends', values.statistics.receivedInDividends],
                ['Soc. Serv.', values.statistics.receivedFromGovernment],
                ['Savings', values.statistics.receivedFromSavings]]], {
              seriesDefaults:{renderer:$.jqplot.PieRenderer, trendline:{show:false}, rendererOptions: { showDataLabels: true}},
              legend:{show:true}
            }).replot();
        } catch (e) {
        }
        try {
            $.jqplot(world + '_expenses', [[
                ['Education', values.statistics.spentOnEducation],
                ['Goods', values.statistics.spentOnGoods],
                ['Investments', values.statistics.spentOnStocks],
                ['Savings', values.statistics.spentOnSavings],
                ['Taxes', values.statistics.spentOnTaxes]]], {
              seriesDefaults:{renderer:$.jqplot.PieRenderer, trendline:{show:false}, rendererOptions: { showDataLabels: true}},
              legend:{show:true}
            }).replot();
        } catch (e) {
        }

        var inv, roiLabels =  [], roiValues = [];
        for (inv in values.portfolioStatistics.spent) {
            if (values.portfolioStatistics.spent.hasOwnProperty(inv) && values.portfolioStatistics.spent[inv] !== 0) {
                roiLabels.push(inv);
                roiValues.push(values.portfolioStatistics.received[inv] / values.portfolioStatistics.spent[inv]);
            }
        }

        try {
            $.jqplot(world + '_roi', [roiValues], {
                seriesDefaults:{
                    renderer:$.jqplot.BarRenderer,
                    pointLabels: { show: true }
                },
                axes: {
                    xaxis: {
                        renderer: $.jqplot.CategoryAxisRenderer,
                        ticks: roiLabels
                    },
                    yaxis: {
                        min: 0
                    }
                },
                highlighter: { show: false }
            }).replot();
        } catch (e) {
        }
    }

    function updatePlayerStats(world, values) {
        $('div.' + world + ' div.ranking').css('display', 'block');
        var str = '<table>', i;
        for (i in values) {
            str += '<tr><td>' + i + '</td><td style="text-align: right">' + Math.round(values[i]) + '</td></tr>';
        }
        str += '</table>';
        $('div.' + world + ' div.ranking').html(str);
    }

    function hidePlayerStats(world) {
        $('div.' + world + ' div.ranking').css('display', 'none');
    }
    function hidePlayerGraphics(world) {
        $('div.' + world + ' div.graphics').css('display', 'none');
    }

    function createSliderBox(containerSelector, boxdescr, whenSliderChanges) {
        var g = $(containerSelector).append('<div class = "sliderbox"></div>'),
            result = {};
        result.sliders = {};
        // the title
        g.append('<h2>' + boxdescr.title + '<h2>');
        // for all settings
        boxdescr.settings.forEach(function (setting) {
            var fn = setting.fieldName, sid = getSingleId();
            g.append('<p>' + setting.label + '</p>');
            g.append('<div class = "' + sid + '"></div>');
            $('div.' + sid).slider({
                max: 100,
                stop: function(event, ui) {
                    console.log(' NEW VALUE FOR ' + fn + ': ' + boxdescr.title + ', ' + containerSelector + ' ' + sid + ' ' + $('div.' + sid).slider('value'));
                    result.changed();
                }
            });
            result.sliders[fn] = sid;
        });

        result.setValues = function (o) {
            var p, rs = result.sliders;
            for (p in o) {
                if (o.hasOwnProperty(p)) {
                    $('div.' + rs[p]).slider('value', o[p] * 100);
                }
            }
        };

        result.getValues = function () {
            var o = { }, p, rs = result.sliders;
            for (p in rs) {
                if (rs.hasOwnProperty(p)) {
                    o[p] = $('div.' + rs[p]).slider('value') / 100;
                }
            }
            return o;
        };
        result.changed = whenSliderChanges;

        return result;
    }

    function clearUserSliders(world) {
        var selector = '#tabs-2 div.' + world + ' div.worldinner' + ' div.sliders';
        $(selector).html('');
    }

    function createUserSliders(world) {
        var voting = {
                title: "Voting Profile",
                settings: [
                    { label: "Tax % for the richest", fieldName: "taxTheRich" },
                    { label: "Tax % for the poorest", fieldName: "taxThePoor" },
                    { label: "Redistribute to corporations", fieldName: "redistributeToCorporations" }
                ]
            },
            spending = {
                title: "Spending Profile",
                settings: [
                    { label: "Spend on education", fieldName: "education" },
                    { label: "Spend on savings", fieldName: "savings" },
                    { label: "Spend on invesments", fieldName: "stocks" },
                    { label: "Spend on goods", fieldName: "goods" }
                ]
            },
            stocks = {
                title: "tbd",
                settings: [
                    { label: "Research", fieldName: "technology" },
                    { label: "Growth & Salaries", fieldName: "size" },
                    { label: "Lobbying", fieldName: "lobbying" }
                ]
            },
            selector = '#tabs-2 div.' + world + ' div.worldinner' + ' div.sliders',
            results = {};
        $(selector).html('');

        function whenSliderChanges() {
            var toSend = results.getProfiles(),
                username = $('#username').val(),
                password = $('#password').val();

            $.ajax({
                url: '/worlds/' + world + '/players/' + username + '/profiles?password=' + escape(password),
                type: "POST",
                dataType: 'text',
                data: toSend,
                success: function (data) {
                    console.log("POST RESULT : " + data);
                },
                error: function () {
                    console.log('save error');
                }
            });
        }

        results.voting = createSliderBox(selector, voting, whenSliderChanges);
        results.spending = createSliderBox(selector, spending, whenSliderChanges);
        results.stocks = {};
        stockTypes.forEach(function (stock) {
            stocks.title = "Stock: " + stock;
            results.stocks[stock] = createSliderBox(selector, stocks, whenSliderChanges);
        });
        results.show = function (visible) {
            $(selector).css({display: visible ? 'block' : 'none'});
        }
        results.setProfiles = function (profiles) {
            results.voting.setValues(profiles.votingProfile);
            results.spending.setValues(profiles.spendingProfile);
            var p, prof = profiles.investmentProfile;
            for (p in prof) {
                if (prof.hasOwnProperty(p)) {
                    results.stocks[p].setValues(prof[p]);
                }
            }
        };
        results.getProfiles = function (profiles) {
            var rep = {}, p;
            rep.votingProfile = results.voting.getValues();
            rep.spendingProfile = results.spending.getValues();
            rep.investmentProfile = {};
            stockTypes.forEach(function (p) {
                rep.investmentProfile[p] = results.stocks[p].getValues();
            });
            return rep;
        }
        return results;
    }

    function clearAllUserSliders() {
        clearUserSliders('opov');
        clearUserSliders('odov');
    }
    function setupInteraction() {
        var opovSliders,
            odovSliders,
            username,
            password;

        function createDefaultData() {
            return {
                votingProfile: {
                    "taxTheRich" : 0.4,
                    "taxThePoor" : 0.1,
                    "redistributeToCorporations" : 0.5
                },
                spendingProfile: {
                    education: 0.2,
                    goods: 0,
                    savings: 0,
                    stocks: 0.8
                },
                investmentProfile: {
                    food: { technology: '0.5', size: '0.3', lobbying: '0.2' },
                    houses: { technology: '0.5', size: '0.3', lobbying: '0.2' },
                    guns: { technology: '0.5', size: '0.3', lobbying: '0.2' },
                    health: { technology: '0.5', size: '0.3', lobbying: '0.2' },
                    coffins: { technology: '0.5', size: '0.3', lobbying: '0.2' }
                }
            };
        }

        $('#username').bind('change', function() {
            clearAllUserSliders();
        });

        $('#login').bind('click', function () {
            username = $('#username').val();
            password = $('#password').val();
            clearAllUserSliders();
            $.ajax({
                url: '/worlds/opov/players/' + username + '/profiles?password=' + escape(password),
                type: "GET",
                dataType: 'json',
                success: function (data) {
                    // create default data for new players
                    if (data === null) {
                        data = createDefaultData();
                    }
                    opovSliders = createUserSliders('opov');
                    opovSliders.setProfiles(data);
                },
                error: function () {
                    //alert('invalid login');
                }
            });

            $.ajax({
                url: '/worlds/odov/players/' + username + '/profiles?password=' + escape(password),
                type: "GET",
                dataType: 'json',
                success: function (data) {
                    // create default data for new players
                    if (data === null) {
                        data = createDefaultData();
                    }
                    odovSliders = createUserSliders('odov');
                    odovSliders.setProfiles(data);
                },
                error: function () {
                    //alert('invalid login');
                }
            });

        });
    }

    function setupSimulation () {
        var requests = [];
        function simulate() {
            var username = $('#username').val();
            // abort all pending ajax requests
            requests.forEach(function (req) {
                req.abort();
            });

            // queue more requests
            requests.push($.get('/worlds/opov',
                function (data, textStatus, jqXHR) {
                    updateWorldGraphics('opov', data.moneyDistribution, data.industryStatistics);
                    updateRanking('opov', data.topPlayers);
                    updateOtherStats('opov', [
                        data.statistics[4],
                        data.statistics[5],
                        data.statistics[6],
                        { name: 'Total Cash', value: data.totalCash}
                    ]);
                },
                'json'
            ));
            requests.push($.get('/worlds/odov',
                function (data, textStatus, jqXHR) {
                    updateWorldGraphics('odov', data.moneyDistribution, data.industryStatistics);
                    updateRanking('odov', data.topPlayers);
                    updateOtherStats('odov', [
                        data.statistics[4],
                        data.statistics[5],
                        data.statistics[6],
                        { name: 'Total Cash', value: data.totalCash}
                    ]);
                },
                'json'
            ));
            if (username) {
                requests.push($.ajax({
                    url: '/worlds/odov/players/' + username,
                    success: function (data, textStatus, jqXHR) {
                        updatePlayerStats('odov', {cash: data.cash, rank: data.rank, totalPlayers: data.totalPlayers});
                        updatePlayerGraphics('odov', data);
                    },
                    error: function () {
                        hidePlayerStats('odov');
                        hidePlayerGraphics('odov');
                    },
                    dataType: 'json'
                }));
                requests.push($.ajax({
                    url: '/worlds/opov/players/' + username,
                    success: function (data, textStatus, jqXHR) {
                        updatePlayerStats('opov', {cash: data.cash, rank: data.rank, totalPlayers: data.totalPlayers});
                        updatePlayerGraphics('opov', data);
                    },
                    error: function () {
                        hidePlayerStats('opov');
                        hidePlayerGraphics('opov');
                    },
                    dataType: 'json'
                }));
            } else {
                hidePlayerStats('odov');
                hidePlayerGraphics('odov');
                hidePlayerStats('opov');
                hidePlayerGraphics('opov');
            }
        }
        // set an interval to reload the world (we know it updates constantly,
        // there is no point in being notified)
        setInterval(simulate, 3300);
        // immediately do the first interval
        simulate();
        // hide stuff
        hidePlayerStats('odov');
        hidePlayerGraphics('odov');
        hidePlayerStats('opov');
        hidePlayerGraphics('opov');
    }
    setupSimulation();
    setupInteraction();
});

