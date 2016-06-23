var FDLayoutEdge = require('./FDLayoutEdge');

function CoSEEdge(source, target, vEdge) {
  FDLayoutEdge.call(this, source, target, vEdge);
}

CoSEEdge.prototype = Object.create(FDLayoutEdge.prototype);
Object.keys(FDLayoutEdge).forEach(function(prop) {
  CoSEEdge[prop] = FDLayoutEdge[prop];
});

module.exports = CoSEEdge
