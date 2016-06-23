var LGraph = require('./LGraph');

function CoSEGraph(parent, graphMgr, vGraph) {
  LGraph.call(this, parent, graphMgr, vGraph);
}

CoSEGraph.prototype = Object.create(LGraph.prototype);
Object.keys(LGraph).forEach(function(prop) {
  CoSEGraph[prop] = LGraph[prop];
});

module.exports = CoSEGraph;
