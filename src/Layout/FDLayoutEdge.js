var LEdge = require('./LEdge');
var FDLayoutConstants = require('./FDLayoutConstants');

function FDLayoutEdge(source, target, vEdge) {
  LEdge.call(this, source, target, vEdge);
  this.idealLength = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
}

FDLayoutEdge.prototype = Object.create(LEdge.prototype);

Object.keys(LEdge).forEach(function(prop) {
  FDLayoutEdge[prop] = LEdge[prop];
});

module.exports = FDLayoutEdge;
