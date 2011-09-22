/**
    File: fakeworld.js
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
var createSimulation = require('./simulation/simulation').createSimulation;

createSimulation(function (err, simulation) {
    simulation.generateFakeUsers(200, function (err) {
        if (err) {
            console.log(err);
        }
        simulation.close();
    });
});
