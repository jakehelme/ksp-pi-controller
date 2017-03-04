'use strict';

let util = require('util');
let Client = require('krpc-node');
let hostAddress = process.argv[2];
let options = {
  rpc: {
        protocol: 'ws',
        host: hostAddress,
        port: '50000',
        wsProtocols: null,
        wsOptions: null
    },
    stream: {
        protocol: 'ws',
        host: hostAddress,
        port: '50001',
        wsProtocols: null,
        wsOptions: null
    }
};
let client = Client(options);
let game = {};

client.rpc.on('open', function (event) {
    client.rpc.on('message', getActiveVesselComplete);
    client.rpc.send(client.services.spaceCenter.getActiveVessel());
});

client.rpc.on('error', function (err) {
    console.log(util.format('Error : %j', err));
    process.exit(1);
});

client.rpc.on('close', function (event) {
    console.log(util.format('Connection Closed : %j', event));
    process.exit(1);
});

function getActiveVesselComplete(response) {
    game.vessel = {
        id: getFirstResult(response)
    };
    replaceMessageHandler(getActiveVesselControlComplete);
    client.rpc.send(client.services.spaceCenter.vesselGetControl(game.vessel.id));
}

function getActiveVesselControlComplete(response) {
    game.vessel.control = {
        id: getFirstResult(response)
    };
    replaceMessageHandler(getThrottleValueComplete);
    client.rpc.send(client.services.spaceCenter.controlGetThrottle(game.vessel.control.id));
}

function getThrottleValueComplete(response) {
    game.vessel.control.throttle = getFirstResult(response);
    console.log(util.format("Updating throttle value from %s to 1", game.vessel.control.throttle));
    replaceMessageHandler(setThrottleToFullComplete);
    var call = client.services.spaceCenter.controlSetThrottle(game.vessel.control.id, 1);
    client.rpc.send(call);
}

function setThrottleToFullComplete(response) {
    replaceMessageHandler(launched);
    client.rpc.send(client.services.spaceCenter.controlActivateNextStage(game.vessel.control.id));
}

function launched(response) {
    console.log("launched!!");
    process.exit(0);
}

function getFirstResult(response) {
    var result = response.results[0];
    return result.value;
}

function replaceMessageHandler(fn) {
    client.rpc.emitter.removeAllListeners('message');
    client.rpc.on('message', fn);
}