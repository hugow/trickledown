var createSimulation = require('./simulation/simulation').createSimulation;

createSimulation(function (err, simulation) {
    simulation.generateFakeUsers(2, function (err) {
        if (err) {
            console.log(err);
        }
        simulation.close();
    });
});
