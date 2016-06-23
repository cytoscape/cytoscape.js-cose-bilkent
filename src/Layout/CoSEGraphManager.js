var LGraphManager = require('./LGraphManager');

function CoSEGraphManager(layout) {
  LGraphManager.call(this, layout);
}

CoSEGraphManager.prototype = Object.create(LGraphManager.prototype);
Object.keys(LGraphManager).forEach(function(prop) {
  CoSEGraphManager[prop] = LGraphManager[prop];
});

module.exports = CoSEGraphManager;
