'use strict';

let util = require('util');
let five = require('johnny-five');
let Raspi = require('raspi-io');
var board = new five.Board({
  io: new Raspi()
});
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

board.on("ready", function () {
  var led = new five.Led("P1-35");
  var toggle = new five.Switch("P1-7");
  let isOpen;

  let client = Client(options);
  let game = {};

  client.rpc.on('error', function (err) {
    console.log(util.format('Error : %j', err));
    process.exit(1);
  });

  client.rpc.on('close', function (event) {
    console.log(util.format('Connection Closed : %j', event));
    process.exit(1);
  });

  board.repl.inject({
    toggle: toggle,
    led: led
  });

  toggle.on("close", handleClose);

  toggle.on("open", handleOpen);

  function handleClose() {
    if (isOpen) {
      isOpen = false;
      led.off();

    }
  }

  function handleOpen() {
    if (!isOpen) {
      isOpen = true;
      led.on();
      client.rpc.on('message', getActiveVesselComplete);
      client.rpc.send(client.services.spaceCenter.getActiveVessel());
    }
  }

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

});




