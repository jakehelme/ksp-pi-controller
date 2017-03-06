let five = require('johnny-five');
let Raspi = require('raspi-io');
let board = new five.Board({
  io: new Raspi()
});

board.on("ready", function () {
  let joystick = five.Joystick({
    pins: ["P1-16", "P1-18"]
  });

  joystick.on("change", function() {
    console.log("Joystick");
    console.log("  x : ", this.x);
    console.log("  y : ", this.y);
    console.log("--------------------------------------");
  });

});
