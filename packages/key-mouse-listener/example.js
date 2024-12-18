const { mouseEvents, keyboardEvents } = require("./index");

keyboardEvents.on("keydown", data => {
  console.log(data);
});

mouseEvents.on("mouseup", data => {
  console.log(data);
});

mouseEvents.on("mousemove", data => {
  console.log(data);
});

mouseEvents.on("mousedown", data => {
  console.log(data);
});

mouseEvents.on("mousewheel", data => {
  console.log(data);
});

setInterval(() => {
  if (!mouseEvents.getPaused()) {
    console.error("Still listening...");
  }
}, 5000);

process.on("SIGBREAK", () => {
  if (mouseEvents.getPaused()) {
    console.error("resuming mouse events");
    mouseEvents.resumeMouseEvents();
    keyboardEvents.resumeKeyEvents();
  } else {
    console.error("pausing mouse events");
    mouseEvents.pauseMouseEvents();
    keyboardEvents.pauseKeyEvents();
  }
});

console.error("Press Ctrl+Break to toggle listening");
