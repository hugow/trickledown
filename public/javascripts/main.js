$(document).ready(function () {
    var singleId = 0,
        // FIXME: should not be known here (should come from the server)
        stockTypes = [ "wood", "metal", "drugs", "electronics", "cars", "cinema", "software" ],
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
            wg4Id = world + '_' + 'industryRevenue';
            wg5Id = world + '_' + 'industrySpending';

        // seems to be leaking heavily if we don't destroy the thing
        if (worldGraphics[world].wg1 !== undefined) {
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
        if (worldGraphics[world].wg2 !== undefined) {
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

        // industry stuff
        var ind, i, toPlot = [], indNames = [], indPurchase = [], indGov = [], indSalaries = [], indDividends = [], indLobbying = [];
        for (ind in industryStatistics) {
            if (industryStatistics.hasOwnProperty(ind)) {
                i = industryStatistics[ind];
                toPlot.push([ind, i.marketWeight]);
                indPurchase.push(i.receivedInPurchases);
                indGov.push(i.receivedFromGovernment);
                indSalaries.push(i.spentOnSalaries);
                indDividends.push(i.spentOnDividends);
                indLobbying.push(i.spentOnLobbying);
                indNames.push(ind);
            }
        }
        // market shares of the various industries
        if (worldGraphics[world].wg3 !== undefined) {
            worldGraphics[world].wg3.destroy();
        }
        worldGraphics[world].wg3 = $.jqplot(wg3Id, [toPlot], {
          seriesDefaults:{renderer:$.jqplot.PieRenderer, trendline:{show:false}, rendererOptions: { showDataLabels: true}},
          legend:{show:true}
        });

        // revenue of the different industries
        if (worldGraphics[world].wg4 !== undefined) {
            worldGraphics[world].wg4.destroy();
        }
        worldGraphics[world].wg4 = $.jqplot(wg4Id, [indPurchase, indGov], {
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

        // revenue of the different industries
        if (worldGraphics[world].wg5 !== undefined) {
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
    }

    function updateRanking(world, values) {
        var str = '<table>', i;
        for (i = 0; i < values.length; i += 1) {
            str += '<tr><td>' + values[i].username + '</td><td>' + Math.round(values[i].value) + '$</td></tr>';
        }
        str += '</table>';
        $('div.' + world + ' div.playerranking').html(str);
    }

    function updateOtherStats(world, values) {
        var str = '<table>', i;
        for (i = 0; i < values.length; i += 1) {
            str += '<tr><td>' + values[i].name + '</td><td>' + values[i].value + '</td></tr>';
        }
        str += '</table>';
        $('div.' + world + ' div.otherstats').html(str);
    }

    function updatePlayerGraphics(world, values) {
         $.jqplot(world + '_income', [[
            ['Salaries', values.statistics.receivedInSalary],
            ['Dividends', values.statistics.receivedInDividends],
            ['Soc. Serv.', values.statistics.receivedFromGovernment],
            ['Savings', values.statistics.receivedFromSavings]]], {
          seriesDefaults:{renderer:$.jqplot.PieRenderer, trendline:{show:false}, rendererOptions: { showDataLabels: true}},
          legend:{show:true}
        }).replot();
         $.jqplot(world + '_expenses', [[
            ['Education', values.statistics.spentOnEducation],
            ['Goods', values.statistics.spentOnGoods],
            ['Investments', values.statistics.spentOnStocks],
            ['Savings', values.statistics.spentOnSavings],
            ['Taxes', values.statistics.spentOnTaxes]]], {
          seriesDefaults:{renderer:$.jqplot.PieRenderer, trendline:{show:false}, rendererOptions: { showDataLabels: true}},
          legend:{show:true}
        }).replot();

        var inv, roiLabels =  [], roiValues = [];
        for (inv in values.portfolioStatistics.spent) {
            if (values.portfolioStatistics.spent.hasOwnProperty(inv) && values.portfolioStatistics.spent[inv] !== 0) {
                roiLabels.push(inv);
                roiValues.push(values.portfolioStatistics.received[inv] / values.portfolioStatistics.spent[inv]);
            }
        }

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
    }

    function updatePlayerStats(world, values) {
        var str = '<table>', i;
        for (i in values) {
            str += '<tr><td>' + i + '</td><td>' + values[i] + '</td></tr>';
        }
        str += '</table>';
        $('div.' + world + ' div.ranking').html(str);
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
        results.clear = function () {
            $(selector).html('');
        };
        return results;
    }

    function setupInteraction() {
        var opovSliders,
            odovSliders,
            username,
            password;

        $('#login').bind('click', function () {
            username = $('#username').val();
            password = $('#password').val();
            if (opovSliders) {
                opovSliders.clear();
            }
            if (odovSliders) {
                odovSliders.clear();
            }
            $.ajax({
                url: '/worlds/opov/players/' + username + '/profiles?password=' + escape(password),
                type: "GET",
                dataType: 'json',
                success: function (data) {
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
        // set an interval to reload the world (we know it updates constantly,
        // there is no point in being notified)
        setInterval(function () {
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
                    updateOtherStats('opov', [ { name: 'test', value: 'v' }]);
                    updateOtherStats('opov', data.statistics);
                },
                'json'
            ));
            requests.push($.get('/worlds/odov',
                function (data, textStatus, jqXHR) {
                    updateWorldGraphics('odov', data.moneyDistribution, data.industryStatistics);
                    updateRanking('odov', data.topPlayers);
                    updateOtherStats('odov', data.statistics);
                },
                'json'
            ));
            if (username) {
                requests.push($.get('/worlds/odov/players/' + username,
                    function (data, textStatus, jqXHR) {
                        updatePlayerStats('odov', data);
                        updatePlayerGraphics('odov', data);
                    },
                    'json'
                ));
                requests.push($.get('/worlds/opov/players/' + username,
                    function (data, textStatus, jqXHR) {
                        updatePlayerStats('opov', data);
                        updatePlayerGraphics('opov', data);
                    },
                    'json'
                ));
            }



        }, 3300);
    }
    setupSimulation();
    setupInteraction();
});

