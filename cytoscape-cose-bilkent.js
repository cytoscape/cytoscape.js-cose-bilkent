(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEConstants.js":[function(require,module,exports){
var FDLayoutConstants = require('./FDLayoutConstants');

function CoSEConstants() {
}

//CoSEConstants inherits static props in FDLayoutConstants
for (var prop in FDLayoutConstants) {
  CoSEConstants[prop] = FDLayoutConstants[prop];
}

CoSEConstants.DEFAULT_USE_MULTI_LEVEL_SCALING = false;
CoSEConstants.DEFAULT_RADIAL_SEPARATION = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
CoSEConstants.DEFAULT_COMPONENT_SEPERATION = 60;

module.exports = CoSEConstants;

},{"./FDLayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutConstants.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEEdge.js":[function(require,module,exports){
var FDLayoutEdge = require('./FDLayoutEdge');

function CoSEEdge(source, target, vEdge) {
  FDLayoutEdge.call(this, source, target, vEdge);
}

CoSEEdge.prototype = Object.create(FDLayoutEdge.prototype);
for (var prop in FDLayoutEdge) {
  CoSEEdge[prop] = FDLayoutEdge[prop];
}

module.exports = CoSEEdge

},{"./FDLayoutEdge":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutEdge.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEGraph.js":[function(require,module,exports){
var LGraph = require('./LGraph');

function CoSEGraph(parent, graphMgr, vGraph) {
  LGraph.call(this, parent, graphMgr, vGraph);
}

CoSEGraph.prototype = Object.create(LGraph.prototype);
for (var prop in LGraph) {
  CoSEGraph[prop] = LGraph[prop];
}

module.exports = CoSEGraph;

},{"./LGraph":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraph.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEGraphManager.js":[function(require,module,exports){
var LGraphManager = require('./LGraphManager');

function CoSEGraphManager(layout) {
  LGraphManager.call(this, layout);
}

CoSEGraphManager.prototype = Object.create(LGraphManager.prototype);
for (var prop in LGraphManager) {
  CoSEGraphManager[prop] = LGraphManager[prop];
}

module.exports = CoSEGraphManager;

},{"./LGraphManager":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraphManager.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSELayout.js":[function(require,module,exports){
var FDLayout = require('./FDLayout');
var CoSEGraphManager = require('./CoSEGraphManager');
var CoSEGraph = require('./CoSEGraph');
var CoSENode = require('./CoSENode');
var CoSEEdge = require('./CoSEEdge');
var CoSEConstants = require('./CoSEConstants');
var FDLayoutConstants = require('./FDLayoutConstants');
var LayoutConstants = require('./LayoutConstants');

function CoSELayout() {
  FDLayout.call(this);
}

CoSELayout.prototype = Object.create(FDLayout.prototype);

for (var prop in FDLayout) {
  CoSELayout[prop] = FDLayout[prop];
}

CoSELayout.prototype.newGraphManager = function () {
  var gm = new CoSEGraphManager(this);
  this.graphManager = gm;
  return gm;
};

CoSELayout.prototype.newGraph = function (vGraph) {
  return new CoSEGraph(null, this.graphManager, vGraph);
};

CoSELayout.prototype.newNode = function (vNode) {
  return new CoSENode(this.graphManager, vNode);
};

CoSELayout.prototype.newEdge = function (vEdge) {
  return new CoSEEdge(null, null, vEdge);
};

CoSELayout.prototype.initParameters = function () {
  FDLayout.prototype.initParameters.call(this, arguments);
  if (!this.isSubLayout) {
    if (CoSEConstants.DEFAULT_EDGE_LENGTH < 10)
    {
      this.idealEdgeLength = 10;
    }
    else
    {
      this.idealEdgeLength = CoSEConstants.DEFAULT_EDGE_LENGTH;
    }

    this.useSmartIdealEdgeLengthCalculation =
            CoSEConstants.DEFAULT_USE_SMART_IDEAL_EDGE_LENGTH_CALCULATION;
    this.springConstant =
            FDLayoutConstants.DEFAULT_SPRING_STRENGTH;
    this.repulsionConstant =
            FDLayoutConstants.DEFAULT_REPULSION_STRENGTH;
    this.gravityConstant =
            FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH;
    this.compoundGravityConstant =
            FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH;
    this.gravityRangeFactor =
            FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR;
    this.compoundGravityRangeFactor =
            FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR;
  }
};

CoSELayout.prototype.layout = function () {
  var createBendsAsNeeded = LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
  if (createBendsAsNeeded)
  {
    this.createBendpoints();
    this.graphManager.resetAllEdges();
  }

  this.level = 0;
  return this.classicLayout();
};

CoSELayout.prototype.classicLayout = function () {
  this.calculateNodesToApplyGravitationTo();
  this.graphManager.calcLowestCommonAncestors();
  this.graphManager.calcInclusionTreeDepths();
  this.graphManager.getRoot().calcEstimatedSize();
  this.calcIdealEdgeLengths();
  if (!this.incremental)
  {
    var forest = this.getFlatForest();

    // The graph associated with this layout is flat and a forest
    if (forest.length > 0)

    {
      this.positionNodesRadially(forest);
    }
    // The graph associated with this layout is not flat or a forest
    else
    {
      this.positionNodesRandomly();
    }
  }

  this.initSpringEmbedder();
  this.runSpringEmbedder();

  console.log("Classic CoSE layout finished after " +
          this.totalIterations + " iterations");

  return true;
};

CoSELayout.prototype.runSpringEmbedder = function () {
  var lastFrame = new Date().getTime();
  var initialAnimationPeriod = 25;
  var animationPeriod = initialAnimationPeriod;
  do
  {
    this.totalIterations++;

    if (this.totalIterations % FDLayoutConstants.CONVERGENCE_CHECK_PERIOD == 0)
    {
      if (this.isConverged())
      {
        break;
      }

      this.coolingFactor = this.initialCoolingFactor *
              ((this.maxIterations - this.totalIterations) / this.maxIterations);
      animationPeriod = Math.ceil(initialAnimationPeriod * Math.sqrt(this.coolingFactor));

    }
    this.totalDisplacement = 0;
    this.graphManager.updateBounds();
    this.calcSpringForces();
    this.calcRepulsionForces();
    this.calcGravitationalForces();
    this.moveNodes();
    this.animate();
    if (FDLayoutConstants.ANIMATE === 'during' && this.totalIterations % animationPeriod == 0) {
      for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - lastFrame) > 25) {
          break;
        }
      }
      lastFrame = new Date().getTime();
      var allNodes = this.graphManager.getAllNodes();
      var pData = {};
      for (var i = 0; i < allNodes.length; i++) {
        var rect = allNodes[i].rect;
        var id = allNodes[i].id;
        pData[id] = {
          id: id,
          x: rect.getCenterX(),
          y: rect.getCenterY(),
          w: rect.width,
          h: rect.height
        };
      }
      broadcast({pData: pData});
    }
  }
  while (this.totalIterations < this.maxIterations);

  this.graphManager.updateBounds();
};

CoSELayout.prototype.calculateNodesToApplyGravitationTo = function () {
  var nodeList = [];
  var graph;

  var graphs = this.graphManager.getGraphs();
  var size = graphs.length;
  var i;
  for (i = 0; i < size; i++)
  {
    graph = graphs[i];

    graph.updateConnected();

    if (!graph.isConnected)
    {
      nodeList = nodeList.concat(graph.getNodes());
    }
  }

  this.graphManager.setAllNodesToApplyGravitation(nodeList);
};

CoSELayout.prototype.createBendpoints = function () {
  var edges = [];
  edges = edges.concat(this.graphManager.getAllEdges());
  var visited = new HashSet();
  var i;
  for (i = 0; i < edges.length; i++)
  {
    var edge = edges[i];

    if (!visited.contains(edge))
    {
      var source = edge.getSource();
      var target = edge.getTarget();

      if (source == target)
      {
        edge.getBendpoints().push(new PointD());
        edge.getBendpoints().push(new PointD());
        this.createDummyNodesForBendpoints(edge);
        visited.add(edge);
      }
      else
      {
        var edgeList = [];

        edgeList = edgeList.concat(source.getEdgeListToNode(target));
        edgeList = edgeList.concat(target.getEdgeListToNode(source));

        if (!visited.contains(edgeList[0]))
        {
          if (edgeList.length > 1)
          {
            var k;
            for (k = 0; k < edgeList.length; k++)
            {
              var multiEdge = edgeList[k];
              multiEdge.getBendpoints().push(new PointD());
              this.createDummyNodesForBendpoints(multiEdge);
            }
          }
          visited.addAll(list);
        }
      }
    }

    if (visited.size() == edges.length)
    {
      break;
    }
  }
};

CoSELayout.prototype.positionNodesRadially = function (forest) {
  // We tile the trees to a grid row by row; first tree starts at (0,0)
  var currentStartingPoint = new Point(0, 0);
  var numberOfColumns = Math.ceil(Math.sqrt(forest.length));
  var height = 0;
  var currentY = 0;
  var currentX = 0;
  var point = new PointD(0, 0);

  for (var i = 0; i < forest.length; i++)
  {
    if (i % numberOfColumns == 0)
    {
      // Start of a new row, make the x coordinate 0, increment the
      // y coordinate with the max height of the previous row
      currentX = 0;
      currentY = height;

      if (i != 0)
      {
        currentY += CoSEConstants.DEFAULT_COMPONENT_SEPERATION;
      }

      height = 0;
    }

    var tree = forest[i];

    // Find the center of the tree
    var centerNode = Layout.findCenterOfTree(tree);

    // Set the staring point of the next tree
    currentStartingPoint.x = currentX;
    currentStartingPoint.y = currentY;

    // Do a radial layout starting with the center
    point =
            CoSELayout.radialLayout(tree, centerNode, currentStartingPoint);

    if (point.y > height)
    {
      height = Math.floor(point.y);
    }

    currentX = Math.floor(point.x + CoSEConstants.DEFAULT_COMPONENT_SEPERATION);
  }

  this.transform(
          new PointD(LayoutConstants.WORLD_CENTER_X - point.x / 2,
                  LayoutConstants.WORLD_CENTER_Y - point.y / 2));
};

CoSELayout.radialLayout = function (tree, centerNode, startingPoint) {
  var radialSep = Math.max(this.maxDiagonalInTree(tree),
          CoSEConstants.DEFAULT_RADIAL_SEPARATION);
  CoSELayout.branchRadialLayout(centerNode, null, 0, 359, 0, radialSep);
  var bounds = LGraph.calculateBounds(tree);

  var transform = new Transform();
  transform.setDeviceOrgX(bounds.getMinX());
  transform.setDeviceOrgY(bounds.getMinY());
  transform.setWorldOrgX(startingPoint.x);
  transform.setWorldOrgY(startingPoint.y);

  for (var i = 0; i < tree.length; i++)
  {
    var node = tree[i];
    node.transform(transform);
  }

  var bottomRight =
          new PointD(bounds.getMaxX(), bounds.getMaxY());

  return transform.inverseTransformPoint(bottomRight);
};

CoSELayout.branchRadialLayout = function (node, parentOfNode, startAngle, endAngle, distance, radialSeparation) {
  // First, position this node by finding its angle.
  var halfInterval = ((endAngle - startAngle) + 1) / 2;

  if (halfInterval < 0)
  {
    halfInterval += 180;
  }

  var nodeAngle = (halfInterval + startAngle) % 360;
  var teta = (nodeAngle * IGeometry.TWO_PI) / 360;

  // Make polar to java cordinate conversion.
  var cos_teta = Math.cos(teta);
  var x_ = distance * Math.cos(teta);
  var y_ = distance * Math.sin(teta);

  node.setCenter(x_, y_);

  // Traverse all neighbors of this node and recursively call this
  // function.
  var neighborEdges = [];
  neighborEdges = neighborEdges.concat(node.getEdges());
  var childCount = neighborEdges.length;

  if (parentOfNode != null)
  {
    childCount--;
  }

  var branchCount = 0;

  var incEdgesCount = neighborEdges.length;
  var startIndex;

  var edges = node.getEdgesBetween(parentOfNode);

  // If there are multiple edges, prune them until there remains only one
  // edge.
  while (edges.length > 1)
  {
    //neighborEdges.remove(edges.remove(0));
    var temp = edges[0];
    edges.splice(0, 1);
    var index = neighborEdges.indexOf(temp);
    if (index >= 0) {
      neighborEdges.splice(index, 1);
    }
    incEdgesCount--;
    childCount--;
  }

  if (parentOfNode != null)
  {
    //assert edges.length == 1;
    startIndex = (neighborEdges.indexOf(edges[0]) + 1) % incEdgesCount;
  }
  else
  {
    startIndex = 0;
  }

  var stepAngle = Math.abs(endAngle - startAngle) / childCount;

  for (var i = startIndex;
          branchCount != childCount;
          i = (++i) % incEdgesCount)
  {
    var currentNeighbor =
            neighborEdges[i].getOtherEnd(node);

    // Don't back traverse to root node in current tree.
    if (currentNeighbor == parentOfNode)
    {
      continue;
    }

    var childStartAngle =
            (startAngle + branchCount * stepAngle) % 360;
    var childEndAngle = (childStartAngle + stepAngle) % 360;

    CoSELayout.branchRadialLayout(currentNeighbor,
            node,
            childStartAngle, childEndAngle,
            distance + radialSeparation, radialSeparation);

    branchCount++;
  }
};

CoSELayout.maxDiagonalInTree = function (tree) {
  var maxDiagonal = Integer.MIN_VALUE;

  for (var i = 0; i < tree.length; i++)
  {
    var node = tree[i];
    var diagonal = node.getDiagonal();

    if (diagonal > maxDiagonal)
    {
      maxDiagonal = diagonal;
    }
  }

  return maxDiagonal;
};

CoSELayout.prototype.calcRepulsionRange = function () {
  // formula is 2 x (level + 1) x idealEdgeLength
  return (2 * (this.level + 1) * this.idealEdgeLength);
};

module.exports = CoSELayout;

},{"./CoSEConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEConstants.js","./CoSEEdge":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEEdge.js","./CoSEGraph":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEGraph.js","./CoSEGraphManager":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEGraphManager.js","./CoSENode":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSENode.js","./FDLayout":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayout.js","./FDLayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutConstants.js","./LayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LayoutConstants.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSENode.js":[function(require,module,exports){
var FDLayoutNode = require('./FDLayoutNode');
var IMath = require('./IMath');

function CoSENode(gm, loc, size, vNode) {
  FDLayoutNode.call(this, gm, loc, size, vNode);
}


CoSENode.prototype = Object.create(FDLayoutNode.prototype);
for (var prop in FDLayoutNode) {
  CoSENode[prop] = FDLayoutNode[prop];
}

CoSENode.prototype.move = function ()
{
  var layout = this.graphManager.getLayout();
  this.displacementX = layout.coolingFactor *
          (this.springForceX + this.repulsionForceX + this.gravitationForceX);
  this.displacementY = layout.coolingFactor *
          (this.springForceY + this.repulsionForceY + this.gravitationForceY);


  if (Math.abs(this.displacementX) > layout.coolingFactor * layout.maxNodeDisplacement)
  {
    this.displacementX = layout.coolingFactor * layout.maxNodeDisplacement *
            IMath.sign(this.displacementX);
  }

  if (Math.abs(this.displacementY) > layout.coolingFactor * layout.maxNodeDisplacement)
  {
    this.displacementY = layout.coolingFactor * layout.maxNodeDisplacement *
            IMath.sign(this.displacementY);
  }

  // a simple node, just move it
  if (this.child == null)
  {
    this.moveBy(this.displacementX, this.displacementY);
  }
  // an empty compound node, again just move it
  else if (this.child.getNodes().length == 0)
  {
    this.moveBy(this.displacementX, this.displacementY);
  }
  // non-empty compound node, propogate movement to children as well
  else
  {
    this.propogateDisplacementToChildren(this.displacementX,
            this.displacementY);
  }

  layout.totalDisplacement +=
          Math.abs(this.displacementX) + Math.abs(this.displacementY);

  this.springForceX = 0;
  this.springForceY = 0;
  this.repulsionForceX = 0;
  this.repulsionForceY = 0;
  this.gravitationForceX = 0;
  this.gravitationForceY = 0;
  this.displacementX = 0;
  this.displacementY = 0;
};

CoSENode.prototype.propogateDisplacementToChildren = function (dX, dY)
{
  var nodes = this.getChild().getNodes();
  var node;
  for (var i = 0; i < nodes.length; i++)
  {
    node = nodes[i];
    if (node.getChild() == null)
    {
      node.moveBy(dX, dY);
      node.displacementX += dX;
      node.displacementY += dY;
    }
    else
    {
      node.propogateDisplacementToChildren(dX, dY);
    }
  }
};

CoSENode.prototype.setPred1 = function (pred1)
{
  this.pred1 = pred1;
};

CoSENode.prototype.getPred1 = function ()
{
  return pred1;
};

CoSENode.prototype.getPred2 = function ()
{
  return pred2;
};

CoSENode.prototype.setNext = function (next)
{
  this.next = next;
};

CoSENode.prototype.getNext = function ()
{
  return next;
};

CoSENode.prototype.setProcessed = function (processed)
{
  this.processed = processed;
};

CoSENode.prototype.isProcessed = function ()
{
  return processed;
};

module.exports = CoSENode;

},{"./FDLayoutNode":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutNode.js","./IMath":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/IMath.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/DimensionD.js":[function(require,module,exports){
function DimensionD(width, height) {
  this.width = 0;
  this.height = 0;
  if (width !== null && height !== null) {
    this.height = height;
    this.width = width;
  }
}

DimensionD.prototype.getWidth = function ()
{
  return this.width;
};

DimensionD.prototype.setWidth = function (width)
{
  this.width = width;
};

DimensionD.prototype.getHeight = function ()
{
  return this.height;
};

DimensionD.prototype.setHeight = function (height)
{
  this.height = height;
};

module.exports = DimensionD;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayout.js":[function(require,module,exports){
var Layout = require('./Layout');
var FDLayoutConstants = require('./FDLayoutConstants');
var LayoutConstants = require('./LayoutConstants');
var IGeometry = require('./IGeometry');
var IMath = require('./IMath');

function FDLayout() {
  Layout.call(this);

  this.useSmartIdealEdgeLengthCalculation = FDLayoutConstants.DEFAULT_USE_SMART_IDEAL_EDGE_LENGTH_CALCULATION;
  this.idealEdgeLength = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
  this.springConstant = FDLayoutConstants.DEFAULT_SPRING_STRENGTH;
  this.repulsionConstant = FDLayoutConstants.DEFAULT_REPULSION_STRENGTH;
  this.gravityConstant = FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH;
  this.compoundGravityConstant = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH;
  this.gravityRangeFactor = FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR;
  this.compoundGravityRangeFactor = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR;
  this.displacementThresholdPerNode = (3.0 * FDLayoutConstants.DEFAULT_EDGE_LENGTH) / 100;
  this.coolingFactor = 1.0;
  this.initialCoolingFactor = 1.0;
  this.totalDisplacement = 0.0;
  this.oldTotalDisplacement = 0.0;
  this.maxIterations = FDLayoutConstants.MAX_ITERATIONS;
}

FDLayout.prototype = Object.create(Layout.prototype);

for (var prop in Layout) {
  FDLayout[prop] = Layout[prop];
}

FDLayout.prototype.initParameters = function () {
  Layout.prototype.initParameters.call(this, arguments);

  if (this.layoutQuality == LayoutConstants.DRAFT_QUALITY)
  {
    this.displacementThresholdPerNode += 0.30;
    this.maxIterations *= 0.8;
  }
  else if (this.layoutQuality == LayoutConstants.PROOF_QUALITY)
  {
    this.displacementThresholdPerNode -= 0.30;
    this.maxIterations *= 1.2;
  }

  this.totalIterations = 0;
  this.notAnimatedIterations = 0;

//    this.useFRGridVariant = layoutOptionsPack.smartRepulsionRangeCalc;
};

FDLayout.prototype.calcIdealEdgeLengths = function () {
  var edge;
  var lcaDepth;
  var source;
  var target;
  var sizeOfSourceInLca;
  var sizeOfTargetInLca;

  var allEdges = this.getGraphManager().getAllEdges();
  for (var i = 0; i < allEdges.length; i++)
  {
    edge = allEdges[i];

    edge.idealLength = this.idealEdgeLength;

    if (edge.isInterGraph)
    {
      source = edge.getSource();
      target = edge.getTarget();

      sizeOfSourceInLca = edge.getSourceInLca().getEstimatedSize();
      sizeOfTargetInLca = edge.getTargetInLca().getEstimatedSize();

      if (this.useSmartIdealEdgeLengthCalculation)
      {
        edge.idealLength += sizeOfSourceInLca + sizeOfTargetInLca -
                2 * LayoutConstants.SIMPLE_NODE_SIZE;
      }

      lcaDepth = edge.getLca().getInclusionTreeDepth();

      edge.idealLength += FDLayoutConstants.DEFAULT_EDGE_LENGTH *
              FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR *
              (source.getInclusionTreeDepth() +
                      target.getInclusionTreeDepth() - 2 * lcaDepth);
    }
  }
};

FDLayout.prototype.initSpringEmbedder = function () {

  if (this.incremental)
  {
    this.coolingFactor = 0.8;
    this.initialCoolingFactor = 0.8;
    this.maxNodeDisplacement =
            FDLayoutConstants.MAX_NODE_DISPLACEMENT_INCREMENTAL;
  }
  else
  {
    this.coolingFactor = 1.0;
    this.initialCoolingFactor = 1.0;
    this.maxNodeDisplacement =
            FDLayoutConstants.MAX_NODE_DISPLACEMENT;
  }

  this.maxIterations =
          Math.max(this.getAllNodes().length * 5, this.maxIterations);

  this.totalDisplacementThreshold =
          this.displacementThresholdPerNode * this.getAllNodes().length;

  this.repulsionRange = this.calcRepulsionRange();
};

FDLayout.prototype.calcSpringForces = function () {
  var lEdges = this.getAllEdges();
  var edge;

  for (var i = 0; i < lEdges.length; i++)
  {
    edge = lEdges[i];

    this.calcSpringForce(edge, edge.idealLength);
  }
};

FDLayout.prototype.calcRepulsionForces = function () {
  var i, j;
  var nodeA, nodeB;
  var lNodes = this.getAllNodes();

  for (i = 0; i < lNodes.length; i++)
  {
    nodeA = lNodes[i];

    for (j = i + 1; j < lNodes.length; j++)
    {
      nodeB = lNodes[j];

      // If both nodes are not members of the same graph, skip.
      if (nodeA.getOwner() != nodeB.getOwner())
      {
        continue;
      }

      this.calcRepulsionForce(nodeA, nodeB);
    }
  }
};

FDLayout.prototype.calcGravitationalForces = function () {
  var node;
  var lNodes = this.getAllNodesToApplyGravitation();

  for (var i = 0; i < lNodes.length; i++)
  {
    node = lNodes[i];
    this.calcGravitationalForce(node);
  }
};

FDLayout.prototype.moveNodes = function () {
  var lNodes = this.getAllNodes();
  var node;

  for (var i = 0; i < lNodes.length; i++)
  {
    node = lNodes[i];
    node.move();
  }
}

FDLayout.prototype.calcSpringForce = function (edge, idealLength) {
  var sourceNode = edge.getSource();
  var targetNode = edge.getTarget();

  var length;
  var springForce;
  var springForceX;
  var springForceY;

  // Update edge length
  if (this.uniformLeafNodeSizes &&
          sourceNode.getChild() == null && targetNode.getChild() == null)
  {
    edge.updateLengthSimple();
  }
  else
  {
    edge.updateLength();

    if (edge.isOverlapingSourceAndTarget)
    {
      return;
    }
  }

  length = edge.getLength();

  // Calculate spring forces
  springForce = this.springConstant * (length - idealLength);

  // Project force onto x and y axes
  springForceX = springForce * (edge.lengthX / length);
  springForceY = springForce * (edge.lengthY / length);

  // Apply forces on the end nodes
  sourceNode.springForceX += springForceX;
  sourceNode.springForceY += springForceY;
  targetNode.springForceX -= springForceX;
  targetNode.springForceY -= springForceY;
};

FDLayout.prototype.calcRepulsionForce = function (nodeA, nodeB) {
  var rectA = nodeA.getRect();
  var rectB = nodeB.getRect();
  var overlapAmount = new Array(2);
  var clipPoints = new Array(4);
  var distanceX;
  var distanceY;
  var distanceSquared;
  var distance;
  var repulsionForce;
  var repulsionForceX;
  var repulsionForceY;

  if (rectA.intersects(rectB))// two nodes overlap
  {
    // calculate separation amount in x and y directions
    IGeometry.calcSeparationAmount(rectA,
            rectB,
            overlapAmount,
            FDLayoutConstants.DEFAULT_EDGE_LENGTH / 2.0);

    repulsionForceX = overlapAmount[0];
    repulsionForceY = overlapAmount[1];
  }
  else// no overlap
  {
    // calculate distance

    if (this.uniformLeafNodeSizes &&
            nodeA.getChild() == null && nodeB.getChild() == null)// simply base repulsion on distance of node centers
    {
      distanceX = rectB.getCenterX() - rectA.getCenterX();
      distanceY = rectB.getCenterY() - rectA.getCenterY();
    }
    else// use clipping points
    {
      IGeometry.getIntersection(rectA, rectB, clipPoints);

      distanceX = clipPoints[2] - clipPoints[0];
      distanceY = clipPoints[3] - clipPoints[1];
    }

    // No repulsion range. FR grid variant should take care of this.
    if (Math.abs(distanceX) < FDLayoutConstants.MIN_REPULSION_DIST)
    {
      distanceX = IMath.sign(distanceX) *
              FDLayoutConstants.MIN_REPULSION_DIST;
    }

    if (Math.abs(distanceY) < FDLayoutConstants.MIN_REPULSION_DIST)
    {
      distanceY = IMath.sign(distanceY) *
              FDLayoutConstants.MIN_REPULSION_DIST;
    }

    distanceSquared = distanceX * distanceX + distanceY * distanceY;
    distance = Math.sqrt(distanceSquared);

    repulsionForce = this.repulsionConstant / distanceSquared;

    // Project force onto x and y axes
    repulsionForceX = repulsionForce * distanceX / distance;
    repulsionForceY = repulsionForce * distanceY / distance;
  }

  // Apply forces on the two nodes
  nodeA.repulsionForceX -= repulsionForceX;
  nodeA.repulsionForceY -= repulsionForceY;
  nodeB.repulsionForceX += repulsionForceX;
  nodeB.repulsionForceY += repulsionForceY;
};

FDLayout.prototype.calcGravitationalForce = function (node) {
  var ownerGraph;
  var ownerCenterX;
  var ownerCenterY;
  var distanceX;
  var distanceY;
  var absDistanceX;
  var absDistanceY;
  var estimatedSize;
  ownerGraph = node.getOwner();

  ownerCenterX = (ownerGraph.getRight() + ownerGraph.getLeft()) / 2;
  ownerCenterY = (ownerGraph.getTop() + ownerGraph.getBottom()) / 2;
  distanceX = node.getCenterX() - ownerCenterX;
  distanceY = node.getCenterY() - ownerCenterY;
  absDistanceX = Math.abs(distanceX);
  absDistanceY = Math.abs(distanceY);

  if (node.getOwner() == this.graphManager.getRoot())// in the root graph
  {
    Math.floor(80);
    estimatedSize = Math.floor(ownerGraph.getEstimatedSize() *
            this.gravityRangeFactor);

    if (absDistanceX > estimatedSize || absDistanceY > estimatedSize)
    {
      node.gravitationForceX = -this.gravityConstant * distanceX;
      node.gravitationForceY = -this.gravityConstant * distanceY;
    }
  }
  else// inside a compound
  {
    estimatedSize = Math.floor((ownerGraph.getEstimatedSize() *
            this.compoundGravityRangeFactor));

    if (absDistanceX > estimatedSize || absDistanceY > estimatedSize)
    {
      node.gravitationForceX = -this.gravityConstant * distanceX *
              this.compoundGravityConstant;
      node.gravitationForceY = -this.gravityConstant * distanceY *
              this.compoundGravityConstant;
    }
  }
};

FDLayout.prototype.isConverged = function () {
  var converged;
  var oscilating = false;

  if (this.totalIterations > this.maxIterations / 3)
  {
    oscilating =
            Math.abs(this.totalDisplacement - this.oldTotalDisplacement) < 2;
  }

  converged = this.totalDisplacement < this.totalDisplacementThreshold;

  this.oldTotalDisplacement = this.totalDisplacement;

  return converged || oscilating;
};

FDLayout.prototype.animate = function () {
  if (this.animationDuringLayout && !this.isSubLayout)
  {
    if (this.notAnimatedIterations == this.animationPeriod)
    {
      this.update();
      this.notAnimatedIterations = 0;
    }
    else
    {
      this.notAnimatedIterations++;
    }
  }
};

FDLayout.prototype.calcRepulsionRange = function () {
  return 0.0;
};

module.exports = FDLayout;

},{"./FDLayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutConstants.js","./IGeometry":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/IGeometry.js","./IMath":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/IMath.js","./Layout":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Layout.js","./LayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LayoutConstants.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutConstants.js":[function(require,module,exports){
var LayoutConstants = require('./LayoutConstants');

function FDLayoutConstants() {
}

//FDLayoutConstants inherits static props in LayoutConstants
for (var prop in LayoutConstants) {
  FDLayoutConstants[prop] = LayoutConstants[prop];
}

FDLayoutConstants.MAX_ITERATIONS = 2500;

FDLayoutConstants.DEFAULT_EDGE_LENGTH = 50;
FDLayoutConstants.DEFAULT_SPRING_STRENGTH = 0.45;
FDLayoutConstants.DEFAULT_REPULSION_STRENGTH = 4500.0;
FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH = 0.4;
FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = 1.0;
FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR = 3.8;
FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = 1.5;
FDLayoutConstants.DEFAULT_USE_SMART_IDEAL_EDGE_LENGTH_CALCULATION = true;
FDLayoutConstants.DEFAULT_USE_SMART_REPULSION_RANGE_CALCULATION = true;
FDLayoutConstants.MAX_NODE_DISPLACEMENT_INCREMENTAL = 100.0;
FDLayoutConstants.MAX_NODE_DISPLACEMENT = FDLayoutConstants.MAX_NODE_DISPLACEMENT_INCREMENTAL * 3;
FDLayoutConstants.MIN_REPULSION_DIST = FDLayoutConstants.DEFAULT_EDGE_LENGTH / 10.0;
FDLayoutConstants.CONVERGENCE_CHECK_PERIOD = 100;
FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = 0.1;
FDLayoutConstants.MIN_EDGE_LENGTH = 1;
FDLayoutConstants.GRID_CALCULATION_CHECK_PERIOD = 10;

module.exports = FDLayoutConstants;

},{"./LayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LayoutConstants.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutEdge.js":[function(require,module,exports){
var LEdge = require('./LEdge');
var FDLayoutConstants = require('./FDLayoutConstants');

function FDLayoutEdge(source, target, vEdge) {
  LEdge.call(this, source, target, vEdge);
  this.idealLength = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
}

FDLayoutEdge.prototype = Object.create(LEdge.prototype);

for (var prop in LEdge) {
  FDLayoutEdge[prop] = LEdge[prop];
}

module.exports = FDLayoutEdge;

},{"./FDLayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutConstants.js","./LEdge":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LEdge.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutNode.js":[function(require,module,exports){
var LNode = require('./LNode');

function FDLayoutNode(gm, loc, size, vNode) {
  // alternative constructor is handled inside LNode
  LNode.call(this, gm, loc, size, vNode);
  //Spring, repulsion and gravitational forces acting on this node
  this.springForceX = 0;
  this.springForceY = 0;
  this.repulsionForceX = 0;
  this.repulsionForceY = 0;
  this.gravitationForceX = 0;
  this.gravitationForceY = 0;
  //Amount by which this node is to be moved in this iteration
  this.displacementX = 0;
  this.displacementY = 0;

  //Start and finish grid coordinates that this node is fallen into
  this.startX = 0;
  this.finishX = 0;
  this.startY = 0;
  this.finishY = 0;

  //Geometric neighbors of this node
  this.surrounding = [];
}

FDLayoutNode.prototype = Object.create(LNode.prototype);

for (var prop in LNode) {
  FDLayoutNode[prop] = LNode[prop];
}

FDLayoutNode.prototype.setGridCoordinates = function (_startX, _finishX, _startY, _finishY)
{
  this.startX = _startX;
  this.finishX = _finishX;
  this.startY = _startY;
  this.finishY = _finishY;

};

module.exports = FDLayoutNode;

},{"./LNode":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LNode.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/HashMap.js":[function(require,module,exports){
var UniqueIDGeneretor = require('./UniqueIDGeneretor');

function HashMap() {
  this.map = {};
  this.keys = [];
}

HashMap.prototype.put = function (key, value) {
  var theId = UniqueIDGeneretor.createID(key);
  if (!this.contains(theId)) {
    this.map[theId] = value;
    this.keys.push(key);
  }
};

HashMap.prototype.contains = function (key) {
  var theId = UniqueIDGeneretor.createID(key);
  return this.map[key] != null;
};

HashMap.prototype.get = function (key) {
  var theId = UniqueIDGeneretor.createID(key);
  return this.map[theId];
};

HashMap.prototype.keySet = function () {
  return this.keys;
};

module.exports = HashMap;

},{"./UniqueIDGeneretor":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/UniqueIDGeneretor.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/HashSet.js":[function(require,module,exports){
var UniqueIDGeneretor = require('./UniqueIDGeneretor');

function HashSet() {
  this.set = {};
}
;

HashSet.prototype.add = function (obj) {
  var theId = UniqueIDGeneretor.createID(obj);
  if (!this.contains(theId))
    this.set[theId] = obj;
};

HashSet.prototype.remove = function (obj) {
  delete this.set[UniqueIDGeneretor.createID(obj)];
};

HashSet.prototype.clear = function () {
  this.set = {};
};

HashSet.prototype.contains = function (obj) {
  return this.set[UniqueIDGeneretor.createID(obj)] == obj;
};

HashSet.prototype.isEmpty = function () {
  return this.size() === 0;
};

HashSet.prototype.size = function () {
  return Object.keys(this.set).length;
};

//concats this.set to the given list
HashSet.prototype.addAllTo = function (list) {
  var keys = Object.keys(this.set);
  var length = keys.length;
  for (var i = 0; i < length; i++) {
    list.push(this.set[keys[i]]);
  }
};

HashSet.prototype.size = function () {
  return Object.keys(this.set).length;
};

HashSet.prototype.addAll = function (list) {
  var s = list.length;
  for (var i = 0; i < s; i++) {
    var v = list[i];
    this.add(v);
  }
};

module.exports = HashSet;

},{"./UniqueIDGeneretor":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/UniqueIDGeneretor.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/IGeometry.js":[function(require,module,exports){
function IGeometry() {
}

IGeometry.calcSeparationAmount = function (rectA, rectB, overlapAmount, separationBuffer)
{
  if (!rectA.intersects(rectB)) {
    throw "assert failed";
  }
  var directions = new Array(2);
  IGeometry.decideDirectionsForOverlappingNodes(rectA, rectB, directions);
  overlapAmount[0] = Math.min(rectA.getRight(), rectB.getRight()) -
          Math.max(rectA.x, rectB.x);
  overlapAmount[1] = Math.min(rectA.getBottom(), rectB.getBottom()) -
          Math.max(rectA.y, rectB.y);
  // update the overlapping amounts for the following cases:
  if ((rectA.getX() <= rectB.getX()) && (rectA.getRight() >= rectB.getRight()))
  {
    overlapAmount[0] += Math.min((rectB.getX() - rectA.getX()),
            (rectA.getRight() - rectB.getRight()));
  }
  else if ((rectB.getX() <= rectA.getX()) && (rectB.getRight() >= rectA.getRight()))
  {
    overlapAmount[0] += Math.min((rectA.getX() - rectB.getX()),
            (rectB.getRight() - rectA.getRight()));
  }
  if ((rectA.getY() <= rectB.getY()) && (rectA.getBottom() >= rectB.getBottom()))
  {
    overlapAmount[1] += Math.min((rectB.getY() - rectA.getY()),
            (rectA.getBottom() - rectB.getBottom()));
  }
  else if ((rectB.getY() <= rectA.getY()) && (rectB.getBottom() >= rectA.getBottom()))
  {
    overlapAmount[1] += Math.min((rectA.getY() - rectB.getY()),
            (rectB.getBottom() - rectA.getBottom()));
  }

  // find slope of the line passes two centers
  var slope = Math.abs((rectB.getCenterY() - rectA.getCenterY()) /
          (rectB.getCenterX() - rectA.getCenterX()));
  // if centers are overlapped
  if ((rectB.getCenterY() == rectA.getCenterY()) &&
          (rectB.getCenterX() == rectA.getCenterX()))
  {
    // assume the slope is 1 (45 degree)
    slope = 1.0;
  }

  var moveByY = slope * overlapAmount[0];
  var moveByX = overlapAmount[1] / slope;
  if (overlapAmount[0] < moveByX)
  {
    moveByX = overlapAmount[0];
  }
  else
  {
    moveByY = overlapAmount[1];
  }
  // return half the amount so that if each rectangle is moved by these
  // amounts in opposite directions, overlap will be resolved
  overlapAmount[0] = -1 * directions[0] * ((moveByX / 2) + separationBuffer);
  overlapAmount[1] = -1 * directions[1] * ((moveByY / 2) + separationBuffer);
}

IGeometry.decideDirectionsForOverlappingNodes = function (rectA, rectB, directions)
{
  if (rectA.getCenterX() < rectB.getCenterX())
  {
    directions[0] = -1;
  }
  else
  {
    directions[0] = 1;
  }

  if (rectA.getCenterY() < rectB.getCenterY())
  {
    directions[1] = -1;
  }
  else
  {
    directions[1] = 1;
  }
}

IGeometry.getIntersection2 = function (rectA, rectB, result)
{
  //result[0-1] will contain clipPoint of rectA, result[2-3] will contain clipPoint of rectB
  var p1x = rectA.getCenterX();
  var p1y = rectA.getCenterY();
  var p2x = rectB.getCenterX();
  var p2y = rectB.getCenterY();

  //if two rectangles intersect, then clipping points are centers
  if (rectA.intersects(rectB))
  {
    result[0] = p1x;
    result[1] = p1y;
    result[2] = p2x;
    result[3] = p2y;
    return true;
  }
  //variables for rectA
  var topLeftAx = rectA.getX();
  var topLeftAy = rectA.getY();
  var topRightAx = rectA.getRight();
  var bottomLeftAx = rectA.getX();
  var bottomLeftAy = rectA.getBottom();
  var bottomRightAx = rectA.getRight();
  var halfWidthA = rectA.getWidthHalf();
  var halfHeightA = rectA.getHeightHalf();
  //variables for rectB
  var topLeftBx = rectB.getX();
  var topLeftBy = rectB.getY();
  var topRightBx = rectB.getRight();
  var bottomLeftBx = rectB.getX();
  var bottomLeftBy = rectB.getBottom();
  var bottomRightBx = rectB.getRight();
  var halfWidthB = rectB.getWidthHalf();
  var halfHeightB = rectB.getHeightHalf();
  //flag whether clipping points are found
  var clipPointAFound = false;
  var clipPointBFound = false;

  // line is vertical
  if (p1x == p2x)
  {
    if (p1y > p2y)
    {
      result[0] = p1x;
      result[1] = topLeftAy;
      result[2] = p2x;
      result[3] = bottomLeftBy;
      return false;
    }
    else if (p1y < p2y)
    {
      result[0] = p1x;
      result[1] = bottomLeftAy;
      result[2] = p2x;
      result[3] = topLeftBy;
      return false;
    }
    else
    {
      //not line, return null;
    }
  }
  // line is horizontal
  else if (p1y == p2y)
  {
    if (p1x > p2x)
    {
      result[0] = topLeftAx;
      result[1] = p1y;
      result[2] = topRightBx;
      result[3] = p2y;
      return false;
    }
    else if (p1x < p2x)
    {
      result[0] = topRightAx;
      result[1] = p1y;
      result[2] = topLeftBx;
      result[3] = p2y;
      return false;
    }
    else
    {
      //not valid line, return null;
    }
  }
  else
  {
    //slopes of rectA's and rectB's diagonals
    var slopeA = rectA.height / rectA.width;
    var slopeB = rectB.height / rectB.width;

    //slope of line between center of rectA and center of rectB
    var slopePrime = (p2y - p1y) / (p2x - p1x);
    var cardinalDirectionA;
    var cardinalDirectionB;
    var tempPointAx;
    var tempPointAy;
    var tempPointBx;
    var tempPointBy;

    //determine whether clipping point is the corner of nodeA
    if ((-slopeA) == slopePrime)
    {
      if (p1x > p2x)
      {
        result[0] = bottomLeftAx;
        result[1] = bottomLeftAy;
        clipPointAFound = true;
      }
      else
      {
        result[0] = topRightAx;
        result[1] = topLeftAy;
        clipPointAFound = true;
      }
    }
    else if (slopeA == slopePrime)
    {
      if (p1x > p2x)
      {
        result[0] = topLeftAx;
        result[1] = topLeftAy;
        clipPointAFound = true;
      }
      else
      {
        result[0] = bottomRightAx;
        result[1] = bottomLeftAy;
        clipPointAFound = true;
      }
    }

    //determine whether clipping point is the corner of nodeB
    if ((-slopeB) == slopePrime)
    {
      if (p2x > p1x)
      {
        result[2] = bottomLeftBx;
        result[3] = bottomLeftBy;
        clipPointBFound = true;
      }
      else
      {
        result[2] = topRightBx;
        result[3] = topLeftBy;
        clipPointBFound = true;
      }
    }
    else if (slopeB == slopePrime)
    {
      if (p2x > p1x)
      {
        result[2] = topLeftBx;
        result[3] = topLeftBy;
        clipPointBFound = true;
      }
      else
      {
        result[2] = bottomRightBx;
        result[3] = bottomLeftBy;
        clipPointBFound = true;
      }
    }

    //if both clipping points are corners
    if (clipPointAFound && clipPointBFound)
    {
      return false;
    }

    //determine Cardinal Direction of rectangles
    if (p1x > p2x)
    {
      if (p1y > p2y)
      {
        cardinalDirectionA = IGeometry.getCardinalDirection(slopeA, slopePrime, 4);
        cardinalDirectionB = IGeometry.getCardinalDirection(slopeB, slopePrime, 2);
      }
      else
      {
        cardinalDirectionA = IGeometry.getCardinalDirection(-slopeA, slopePrime, 3);
        cardinalDirectionB = IGeometry.getCardinalDirection(-slopeB, slopePrime, 1);
      }
    }
    else
    {
      if (p1y > p2y)
      {
        cardinalDirectionA = IGeometry.getCardinalDirection(-slopeA, slopePrime, 1);
        cardinalDirectionB = IGeometry.getCardinalDirection(-slopeB, slopePrime, 3);
      }
      else
      {
        cardinalDirectionA = IGeometry.getCardinalDirection(slopeA, slopePrime, 2);
        cardinalDirectionB = IGeometry.getCardinalDirection(slopeB, slopePrime, 4);
      }
    }
    //calculate clipping Point if it is not found before
    if (!clipPointAFound)
    {
      switch (cardinalDirectionA)
      {
        case 1:
          tempPointAy = topLeftAy;
          tempPointAx = p1x + (-halfHeightA) / slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
        case 2:
          tempPointAx = bottomRightAx;
          tempPointAy = p1y + halfWidthA * slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
        case 3:
          tempPointAy = bottomLeftAy;
          tempPointAx = p1x + halfHeightA / slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
        case 4:
          tempPointAx = bottomLeftAx;
          tempPointAy = p1y + (-halfWidthA) * slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
      }
    }
    if (!clipPointBFound)
    {
      switch (cardinalDirectionB)
      {
        case 1:
          tempPointBy = topLeftBy;
          tempPointBx = p2x + (-halfHeightB) / slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
        case 2:
          tempPointBx = bottomRightBx;
          tempPointBy = p2y + halfWidthB * slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
        case 3:
          tempPointBy = bottomLeftBy;
          tempPointBx = p2x + halfHeightB / slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
        case 4:
          tempPointBx = bottomLeftBx;
          tempPointBy = p2y + (-halfWidthB) * slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
      }
    }
  }
  return false;
}

IGeometry.getCardinalDirection = function (slope, slopePrime, line)
{
  if (slope > slopePrime)
  {
    return line;
  }
  else
  {
    return 1 + line % 4;
  }
}

IGeometry.getIntersection = function (s1, s2, f1, f2)
{
  if (f2 == null) {
    return IGeometry.getIntersection2(s1, s2, f1);
  }
  var x1 = s1.x;
  var y1 = s1.y;
  var x2 = s2.x;
  var y2 = s2.y;
  var x3 = f1.x;
  var y3 = f1.y;
  var x4 = f2.x;
  var y4 = f2.y;
  var x, y; // intersection point
  var a1, a2, b1, b2, c1, c2; // coefficients of line eqns.
  var denom;

  a1 = y2 - y1;
  b1 = x1 - x2;
  c1 = x2 * y1 - x1 * y2;  // { a1*x + b1*y + c1 = 0 is line 1 }

  a2 = y4 - y3;
  b2 = x3 - x4;
  c2 = x4 * y3 - x3 * y4;  // { a2*x + b2*y + c2 = 0 is line 2 }

  denom = a1 * b2 - a2 * b1;

  if (denom == 0)
  {
    return null;
  }

  x = (b1 * c2 - b2 * c1) / denom;
  y = (a2 * c1 - a1 * c2) / denom;

  return new Point(x, y);
}

// -----------------------------------------------------------------------------
// Section: Class Constants
// -----------------------------------------------------------------------------
/**
 * Some useful pre-calculated constants
 */
IGeometry.HALF_PI = 0.5 * Math.PI;
IGeometry.ONE_AND_HALF_PI = 1.5 * Math.PI;
IGeometry.TWO_PI = 2.0 * Math.PI;
IGeometry.THREE_PI = 3.0 * Math.PI;

module.exports = IGeometry;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/IMath.js":[function(require,module,exports){
function IMath() {
}

/**
 * This method returns the sign of the input value.
 */
IMath.sign = function (value) {
  if (value > 0)
  {
    return 1;
  }
  else if (value < 0)
  {
    return -1;
  }
  else
  {
    return 0;
  }
}

IMath.floor = function (value) {
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

IMath.ceil = function (value) {
  return value < 0 ? Math.floor(value) : Math.ceil(value);
}

module.exports = IMath;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Integer.js":[function(require,module,exports){
function Integer() {
}

Integer.MAX_VALUE = 2147483647;
Integer.MIN_VALUE = -2147483648;

module.exports = Integer;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LEdge.js":[function(require,module,exports){
var LGraphObject = require('./LGraphObject');
var IGeometry = require('./IGeometry');
var IMath = require('./IMath');

function LEdge(source, target, vEdge) {
  LGraphObject.call(this, vEdge);

  this.isOverlapingSourceAndTarget = false;
  this.vGraphObject = vEdge;
  this.bendpoints = [];
  this.source = source;
  this.target = target;
}

LEdge.prototype = Object.create(LGraphObject.prototype);

for (var prop in LGraphObject) {
  LEdge[prop] = LGraphObject[prop];
}

LEdge.prototype.getSource = function ()
{
  return this.source;
};

LEdge.prototype.getTarget = function ()
{
  return this.target;
};

LEdge.prototype.isInterGraph = function ()
{
  return this.isInterGraph;
};

LEdge.prototype.getLength = function ()
{
  return this.length;
};

LEdge.prototype.isOverlapingSourceAndTarget = function ()
{
  return this.isOverlapingSourceAndTarget;
};

LEdge.prototype.getBendpoints = function ()
{
  return this.bendpoints;
};

LEdge.prototype.getLca = function ()
{
  return this.lca;
};

LEdge.prototype.getSourceInLca = function ()
{
  return this.sourceInLca;
};

LEdge.prototype.getTargetInLca = function ()
{
  return this.targetInLca;
};

LEdge.prototype.getOtherEnd = function (node)
{
  if (this.source === node)
  {
    return this.target;
  }
  else if (this.target === node)
  {
    return this.source;
  }
  else
  {
    throw "Node is not incident with this edge";
  }
}

LEdge.prototype.getOtherEndInGraph = function (node, graph)
{
  var otherEnd = this.getOtherEnd(node);
  var root = graph.getGraphManager().getRoot();

  while (true)
  {
    if (otherEnd.getOwner() == graph)
    {
      return otherEnd;
    }

    if (otherEnd.getOwner() == root)
    {
      break;
    }

    otherEnd = otherEnd.getOwner().getParent();
  }

  return null;
};

LEdge.prototype.updateLength = function ()
{
  var clipPointCoordinates = new Array(4);

  this.isOverlapingSourceAndTarget =
          IGeometry.getIntersection(this.target.getRect(),
                  this.source.getRect(),
                  clipPointCoordinates);

  if (!this.isOverlapingSourceAndTarget)
  {
    this.lengthX = clipPointCoordinates[0] - clipPointCoordinates[2];
    this.lengthY = clipPointCoordinates[1] - clipPointCoordinates[3];

    if (Math.abs(this.lengthX) < 1.0)
    {
      this.lengthX = IMath.sign(this.lengthX);
    }

    if (Math.abs(this.lengthY) < 1.0)
    {
      this.lengthY = IMath.sign(this.lengthY);
    }

    this.length = Math.sqrt(
            this.lengthX * this.lengthX + this.lengthY * this.lengthY);
  }
};

LEdge.prototype.updateLengthSimple = function ()
{
  this.lengthX = this.target.getCenterX() - this.source.getCenterX();
  this.lengthY = this.target.getCenterY() - this.source.getCenterY();

  if (Math.abs(this.lengthX) < 1.0)
  {
    this.lengthX = IMath.sign(this.lengthX);
  }

  if (Math.abs(this.lengthY) < 1.0)
  {
    this.lengthY = IMath.sign(this.lengthY);
  }

  this.length = Math.sqrt(
          this.lengthX * this.lengthX + this.lengthY * this.lengthY);
}

module.exports = LEdge;

},{"./IGeometry":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/IGeometry.js","./IMath":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/IMath.js","./LGraphObject":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraphObject.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraph.js":[function(require,module,exports){
var LGraphObject = require('./LGraphObject');
var Integer = require('./Integer');
var LayoutConstants = require('./LayoutConstants');
var LGraphManager = require('./LGraphManager');
var LNode = require('./LNode');
var HashSet = require('./HashSet');
var RectangleD = require('./RectangleD');
var Point = require('./Point');

function LGraph(parent, obj2, vGraph) {
  LGraphObject.call(this, vGraph);
  this.estimatedSize = Integer.MIN_VALUE;
  this.margin = LayoutConstants.DEFAULT_GRAPH_MARGIN;
  this.edges = [];
  this.nodes = [];
  this.isConnected = false;
  this.parent = parent;

  if (obj2 != null && obj2 instanceof LGraphManager) {
    this.graphManager = obj2;
  }
  else if (obj2 != null && obj2 instanceof Layout) {
    this.graphManager = obj2.graphManager;
  }
}

LGraph.prototype = Object.create(LGraphObject.prototype);
for (var prop in LGraphObject) {
  LGraph[prop] = LGraphObject[prop];
}

LGraph.prototype.getNodes = function () {
  return this.nodes;
};

LGraph.prototype.getEdges = function () {
  return this.edges;
};

LGraph.prototype.getGraphManager = function ()
{
  return this.graphManager;
};

LGraph.prototype.getParent = function ()
{
  return this.parent;
};

LGraph.prototype.getLeft = function ()
{
  return this.left;
};

LGraph.prototype.getRight = function ()
{
  return this.right;
};

LGraph.prototype.getTop = function ()
{
  return this.top;
};

LGraph.prototype.getBottom = function ()
{
  return this.bottom;
};

LGraph.prototype.isConnected = function ()
{
  return this.isConnected;
};

LGraph.prototype.add = function (obj1, sourceNode, targetNode) {
  if (sourceNode == null && targetNode == null) {
    var newNode = obj1;
    if (this.graphManager == null) {
      throw "Graph has no graph mgr!";
    }
    if (this.getNodes().indexOf(newNode) > -1) {
      throw "Node already in graph!";
    }
    newNode.owner = this;
    this.getNodes().push(newNode);

    return newNode;
  }
  else {
    var newEdge = obj1;
    if (!(this.getNodes().indexOf(sourceNode) > -1 && (this.getNodes().indexOf(targetNode)) > -1)) {
      throw "Source or target not in graph!";
    }

    if (!(sourceNode.owner == targetNode.owner && sourceNode.owner == this)) {
      throw "Both owners must be this graph!";
    }

    if (sourceNode.owner != targetNode.owner)
    {
      return null;
    }

    // set source and target
    newEdge.source = sourceNode;
    newEdge.target = targetNode;

    // set as intra-graph edge
    newEdge.isInterGraph = false;

    // add to graph edge list
    this.getEdges().push(newEdge);

    // add to incidency lists
    sourceNode.edges.push(newEdge);

    if (targetNode != sourceNode)
    {
      targetNode.edges.push(newEdge);
    }

    return newEdge;
  }
};

LGraph.prototype.remove = function (obj) {
  var node = obj;
  if (obj instanceof LNode) {
    if (node == null) {
      throw "Node is null!";
    }
    if (!(node.owner != null && node.owner == this)) {
      throw "Owner graph is invalid!";
    }
    if (this.graphManager == null) {
      throw "Owner graph manager is invalid!";
    }
    // remove incident edges first (make a copy to do it safely)
    var edgesToBeRemoved = node.edges.slice();
    var edge;
    var s = edgesToBeRemoved.length;
    for (var i = 0; i < s; i++)
    {
      edge = edgesToBeRemoved[i];

      if (edge.isInterGraph)
      {
        this.graphManager.remove(edge);
      }
      else
      {
        edge.source.owner.remove(edge);
      }
    }

    // now the node itself
    var index = this.nodes.indexOf(node);
    if (index == -1) {
      throw "Node not in owner node list!";
    }

    this.nodes.splice(index, 1);
  }
  else if (obj instanceof LEdge) {
    var edge = obj;
    if (edge == null) {
      throw "Edge is null!";
    }
    if (!(edge.source != null && edge.target != null)) {
      throw "Source and/or target is null!";
    }
    if (!(edge.source.owner != null && edge.target.owner != null &&
            edge.source.owner == this && edge.target.owner == this)) {
      throw "Source and/or target owner is invalid!";
    }

    var sourceIndex = edge.source.edges.indexOf(edge);
    var targetIndex = edge.target.edges.indexOf(edge);
    if (!(sourceIndex > -1 && targetIndex > -1)) {
      throw "Source and/or target doesn't know this edge!";
    }

    edge.source.edges.splice(sourceIndex, 1);

    if (edge.target != edge.source)
    {
      edge.target.edges.splice(targetIndex, 1);
    }

    var index = edge.source.owner.getEdges().indexOf(edge);
    if (index == -1) {
      throw "Not in owner's edge list!";
    }

    edge.source.owner.getEdges().splice(index, 1);
  }
};

LGraph.prototype.updateLeftTop = function ()
{
  var top = Integer.MAX_VALUE;
  var left = Integer.MAX_VALUE;
  var nodeTop;
  var nodeLeft;

  var nodes = this.getNodes();
  var s = nodes.length;

  for (var i = 0; i < s; i++)
  {
    var lNode = nodes[i];
    nodeTop = Math.floor(lNode.getTop());
    nodeLeft = Math.floor(lNode.getLeft());

    if (top > nodeTop)
    {
      top = nodeTop;
    }

    if (left > nodeLeft)
    {
      left = nodeLeft;
    }
  }

  // Do we have any nodes in this graph?
  if (top == Integer.MAX_VALUE)
  {
    return null;
  }

  this.left = left - this.margin;
  this.top = top - this.margin;

  // Apply the margins and return the result
  return new Point(this.left, this.top);
};

LGraph.prototype.updateBounds = function (recursive)
{
  // calculate bounds
  var left = Integer.MAX_VALUE;
  var right = -Integer.MAX_VALUE;
  var top = Integer.MAX_VALUE;
  var bottom = -Integer.MAX_VALUE;
  var nodeLeft;
  var nodeRight;
  var nodeTop;
  var nodeBottom;

  var nodes = this.nodes;
  var s = nodes.length;
  for (var i = 0; i < s; i++)
  {
    var lNode = nodes[i];

    if (recursive && lNode.child != null)
    {
      lNode.updateBounds();
    }
    nodeLeft = Math.floor(lNode.getLeft());
    nodeRight = Math.floor(lNode.getRight());
    nodeTop = Math.floor(lNode.getTop());
    nodeBottom = Math.floor(lNode.getBottom());

    if (left > nodeLeft)
    {
      left = nodeLeft;
    }

    if (right < nodeRight)
    {
      right = nodeRight;
    }

    if (top > nodeTop)
    {
      top = nodeTop;
    }

    if (bottom < nodeBottom)
    {
      bottom = nodeBottom;
    }
  }

  var boundingRect = new RectangleD(left, top, right - left, bottom - top);
  if (left == Integer.MAX_VALUE)
  {
    this.left = Math.floor(this.parent.getLeft());
    this.right = Math.floor(this.parent.getRight());
    this.top = Math.floor(this.parent.getTop());
    this.bottom = Math.floor(this.parent.getBottom());
  }

  this.left = boundingRect.x - this.margin;
  this.right = boundingRect.x + boundingRect.width + this.margin;
  this.top = boundingRect.y - this.margin;
  this.bottom = boundingRect.y + boundingRect.height + this.margin;
};

LGraph.calculateBounds = function (nodes)
{
  var left = Integer.MAX_VALUE;
  var right = -Integer.MAX_VALUE;
  var top = Integer.MAX_VALUE;
  var bottom = -Integer.MAX_VALUE;
  var nodeLeft;
  var nodeRight;
  var nodeTop;
  var nodeBottom;

  var s = nodes.length;

  for (var i = 0; i < s; i++)
  {
    var lNode = nodes[i];
    nodeLeft = Math.floor(lNode.getLeft());
    nodeRight = Math.floor(lNode.getRight());
    nodeTop = Math.floor(lNode.getTop());
    nodeBottom = Math.floor(lNode.getBottom());

    if (left > nodeLeft)
    {
      left = nodeLeft;
    }

    if (right < nodeRight)
    {
      right = nodeRight;
    }

    if (top > nodeTop)
    {
      top = nodeTop;
    }

    if (bottom < nodeBottom)
    {
      bottom = nodeBottom;
    }
  }

  var boundingRect = new RectangleD(left, top, right - left, bottom - top);

  return boundingRect;
};

LGraph.prototype.getInclusionTreeDepth = function ()
{
  if (this == this.graphManager.getRoot())
  {
    return 1;
  }
  else
  {
    return this.parent.getInclusionTreeDepth();
  }
};

LGraph.prototype.getEstimatedSize = function ()
{
  if (this.estimatedSize == Integer.MIN_VALUE) {
    throw "assert failed";
  }
  return this.estimatedSize;
};

LGraph.prototype.calcEstimatedSize = function ()
{
  var size = 0;
  var nodes = this.nodes;
  var s = nodes.length;

  for (var i = 0; i < s; i++)
  {
    var lNode = nodes[i];
    size += lNode.calcEstimatedSize();
  }

  if (size == 0)
  {
    this.estimatedSize = LayoutConstants.EMPTY_COMPOUND_NODE_SIZE;
  }
  else
  {
    this.estimatedSize = Math.floor(size / Math.sqrt(this.nodes.length));
  }

  return Math.floor(this.estimatedSize);
};

LGraph.prototype.updateConnected = function ()
{
  if (this.nodes.length == 0)
  {
    this.isConnected = true;
    return;
  }

  var toBeVisited = [];
  var visited = new HashSet();
  var currentNode = this.nodes[0];
  var neighborEdges;
  var currentNeighbor;
  toBeVisited = toBeVisited.concat(currentNode.withChildren());

  while (toBeVisited.length > 0)
  {
    currentNode = toBeVisited.shift();
    visited.add(currentNode);

    // Traverse all neighbors of this node
    neighborEdges = currentNode.getEdges();
    var s = neighborEdges.length;
    for (var i = 0; i < s; i++)
    {
      var neighborEdge = neighborEdges[i];
      currentNeighbor =
              neighborEdge.getOtherEndInGraph(currentNode, this);

      // Add unvisited neighbors to the list to visit
      if (currentNeighbor != null &&
              !visited.contains(currentNeighbor))
      {
        toBeVisited = toBeVisited.concat(currentNeighbor.withChildren());
      }
    }
  }

  this.isConnected = false;

  if (visited.size() >= this.nodes.length)
  {
    var noOfVisitedInThisGraph = 0;

    var s = visited.size();
    for (var visitedId in visited.set)
    {
      var visitedNode = visited.set[visitedId];
      if (visitedNode.owner == this)
      {
        noOfVisitedInThisGraph++;
      }
    }

    if (noOfVisitedInThisGraph == this.nodes.length)
    {
      this.isConnected = true;
    }
  }
};

module.exports = LGraph;

},{"./HashSet":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/HashSet.js","./Integer":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Integer.js","./LGraphManager":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraphManager.js","./LGraphObject":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraphObject.js","./LNode":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LNode.js","./LayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LayoutConstants.js","./Point":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Point.js","./RectangleD":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/RectangleD.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraphManager.js":[function(require,module,exports){
function LGraphManager(layout) {
  this.layout = layout;

  this.graphs = [];
  this.edges = [];
}

LGraphManager.prototype.addRoot = function ()
{
  var ngraph = this.layout.newGraph();
  var nnode = this.layout.newNode(null);
  var root = this.add(ngraph, nnode);
  this.setRootGraph(root);
  return this.rootGraph;
};

LGraphManager.prototype.add = function (newGraph, parentNode, newEdge, sourceNode, targetNode)
{
  //there are just 2 parameters are passed then it adds an LGraph else it adds an LEdge
  if (newEdge == null && sourceNode == null && targetNode == null) {
    if (newGraph == null) {
      throw "Graph is null!";
    }
    if (parentNode == null) {
      throw "Parent node is null!";
    }
    if (this.graphs.indexOf(newGraph) > -1) {
      throw "Graph already in this graph mgr!";
    }

    this.graphs.push(newGraph);

    if (newGraph.parent != null) {
      throw "Already has a parent!";
    }
    if (parentNode.child != null) {
      throw  "Already has a child!";
    }

    newGraph.parent = parentNode;
    parentNode.child = newGraph;

    return newGraph;
  }
  else {
    //change the order of the parameters
    targetNode = newEdge;
    sourceNode = parentNode;
    newEdge = newGraph;
    var sourceGraph = sourceNode.getOwner();
    var targetGraph = targetNode.getOwner();

    if (!(sourceGraph != null && sourceGraph.getGraphManager() == this)) {
      throw "Source not in this graph mgr!";
    }
    if (!(targetGraph != null && targetGraph.getGraphManager() == this)) {
      throw "Target not in this graph mgr!";
    }

    if (sourceGraph == targetGraph)
    {
      newEdge.isInterGraph = false;
      return sourceGraph.add(newEdge, sourceNode, targetNode);
    }
    else
    {
      newEdge.isInterGraph = true;

      // set source and target
      newEdge.source = sourceNode;
      newEdge.target = targetNode;

      // add edge to inter-graph edge list
      if (this.edges.indexOf(newEdge) > -1) {
        throw "Edge already in inter-graph edge list!";
      }

      this.edges.push(newEdge);

      // add edge to source and target incidency lists
      if (!(newEdge.source != null && newEdge.target != null)) {
        throw "Edge source and/or target is null!";
      }

      if (!(newEdge.source.edges.indexOf(newEdge) == -1 && newEdge.target.edges.indexOf(newEdge) == -1)) {
        throw "Edge already in source and/or target incidency list!";
      }

      newEdge.source.edges.push(newEdge);
      newEdge.target.edges.push(newEdge);

      return newEdge;
    }
  }
};

LGraphManager.prototype.remove = function (lObj) {
  if (lObj instanceof LGraph) {
    var graph = lObj;
    if (graph.getGraphManager() != this) {
      throw "Graph not in this graph mgr";
    }
    if (!(graph == this.rootGraph || (graph.parent != null && graph.parent.graphManager == this))) {
      throw "Invalid parent node!";
    }

    // first the edges (make a copy to do it safely)
    var edgesToBeRemoved = [];

    edgesToBeRemoved = edgesToBeRemoved.concat(graph.getEdges());

    var edge;
    var s = edgesToBeRemoved.length;
    for (var i = 0; i < s; i++)
    {
      edge = edgesToBeRemoved[i];
      graph.remove(edge);
    }

    // then the nodes (make a copy to do it safely)
    var nodesToBeRemoved = [];

    nodesToBeRemoved = nodesToBeRemoved.concat(graph.getNodes());

    var node;
    s = nodesToBeRemoved.length;
    for (var i = 0; i < s; i++)
    {
      node = nodesToBeRemoved[i];
      graph.remove(node);
    }

    // check if graph is the root
    if (graph == this.rootGraph)
    {
      this.setRootGraph(null);
    }

    // now remove the graph itself
    var index = this.graphs.indexOf(graph);
    this.graphs.splice(index, 1);

    // also reset the parent of the graph
    graph.parent = null;
  }
  else if (lObj instanceof LEdge) {
    edge = lObj;
    if (edge == null) {
      throw "Edge is null!";
    }
    if (!edge.isInterGraph) {
      throw "Not an inter-graph edge!";
    }
    if (!(edge.source != null && edge.target != null)) {
      throw "Source and/or target is null!";
    }

    // remove edge from source and target nodes' incidency lists

    if (!(edge.source.edges.indexOf(edge) != -1 && edge.target.edges.indexOf(edge) != -1)) {
      throw "Source and/or target doesn't know this edge!";
    }

    var index = edge.source.edges.indexOf(edge);
    edge.source.edges.splice(index, 1);
    index = edge.target.edges.indexOf(edge);
    edge.target.edges.splice(index, 1);

    // remove edge from owner graph manager's inter-graph edge list

    if (!(edge.source.owner != null && edge.source.owner.getGraphManager() != null)) {
      throw "Edge owner graph or owner graph manager is null!";
    }
    if (edge.source.owner.getGraphManager().edges.indexOf(edge) == -1) {
      throw "Not in owner graph manager's edge list!";
    }

    var index = edge.source.owner.getGraphManager().edges.indexOf(edge);
    edge.source.owner.getGraphManager().edges.splice(index, 1);
  }
};

LGraphManager.prototype.updateBounds = function ()
{
  this.rootGraph.updateBounds(true);
};

LGraphManager.prototype.getGraphs = function ()
{
  return this.graphs;
};

LGraphManager.prototype.getAllNodes = function ()
{
  if (this.allNodes == null)
  {
    var nodeList = [];
    var graphs = this.getGraphs();
    var s = graphs.length;
    for (var i = 0; i < s; i++)
    {
      nodeList = nodeList.concat(graphs[i].getNodes());
    }
    this.allNodes = nodeList;
  }
  return this.allNodes;
};

LGraphManager.prototype.resetAllNodes = function ()
{
  this.allNodes = null;
};

LGraphManager.prototype.resetAllEdges = function ()
{
  this.allEdges = null;
};

LGraphManager.prototype.resetAllNodesToApplyGravitation = function ()
{
  this.allNodesToApplyGravitation = null;
};

LGraphManager.prototype.getAllEdges = function ()
{
  if (this.allEdges == null)
  {
    var edgeList = [];
    var graphs = this.getGraphs();
    var s = graphs.length;
    for (var i = 0; i < graphs.length; i++)
    {
      edgeList = edgeList.concat(graphs[i].getEdges());
    }

    edgeList = edgeList.concat(this.edges);

    this.allEdges = edgeList;
  }
  return this.allEdges;
};

LGraphManager.prototype.getAllNodesToApplyGravitation = function ()
{
  return this.allNodesToApplyGravitation;
};

LGraphManager.prototype.setAllNodesToApplyGravitation = function (nodeList)
{
  if (this.allNodesToApplyGravitation != null) {
    throw "assert failed";
  }

  this.allNodesToApplyGravitation = nodeList;
};

LGraphManager.prototype.getRoot = function ()
{
  return this.rootGraph;
};

LGraphManager.prototype.setRootGraph = function (graph)
{
  if (graph.getGraphManager() != this) {
    throw "Root not in this graph mgr!";
  }

  this.rootGraph = graph;
  // root graph must have a root node associated with it for convenience
  if (graph.parent == null)
  {
    graph.parent = this.layout.newNode("Root node");
  }
};

LGraphManager.prototype.getLayout = function ()
{
  return this.layout;
};

LGraphManager.prototype.isOneAncestorOfOther = function (firstNode, secondNode)
{
  if (!(firstNode != null && secondNode != null)) {
    throw "assert failed";
  }

  if (firstNode == secondNode)
  {
    return true;
  }
  // Is second node an ancestor of the first one?
  var ownerGraph = firstNode.getOwner();
  var parentNode;

  do
  {
    parentNode = ownerGraph.getParent();

    if (parentNode == null)
    {
      break;
    }

    if (parentNode == secondNode)
    {
      return true;
    }

    ownerGraph = parentNode.getOwner();
    if (ownerGraph == null)
    {
      break;
    }
  } while (true);
  // Is first node an ancestor of the second one?
  ownerGraph = secondNode.getOwner();

  do
  {
    parentNode = ownerGraph.getParent();

    if (parentNode == null)
    {
      break;
    }

    if (parentNode == firstNode)
    {
      return true;
    }

    ownerGraph = parentNode.getOwner();
    if (ownerGraph == null)
    {
      break;
    }
  } while (true);

  return false;
};

LGraphManager.prototype.calcLowestCommonAncestors = function ()
{
  var edge;
  var sourceNode;
  var targetNode;
  var sourceAncestorGraph;
  var targetAncestorGraph;

  var edges = this.getAllEdges();
  var s = edges.length;
  for (var i = 0; i < s; i++)
  {
    edge = edges[i];

    sourceNode = edge.source;
    targetNode = edge.target;
    edge.lca = null;
    edge.sourceInLca = sourceNode;
    edge.targetInLca = targetNode;

    if (sourceNode == targetNode)
    {
      edge.lca = sourceNode.getOwner();
      continue;
    }

    sourceAncestorGraph = sourceNode.getOwner();

    while (edge.lca == null)
    {
      targetAncestorGraph = targetNode.getOwner();

      while (edge.lca == null)
      {
        if (targetAncestorGraph == sourceAncestorGraph)
        {
          edge.lca = targetAncestorGraph;
          break;
        }

        if (targetAncestorGraph == this.rootGraph)
        {
          break;
        }

        if (edge.lca != null) {
          throw "assert failed";
        }
        edge.targetInLca = targetAncestorGraph.getParent();
        targetAncestorGraph = edge.targetInLca.getOwner();
      }

      if (sourceAncestorGraph == this.rootGraph)
      {
        break;
      }

      if (edge.lca == null)
      {
        edge.sourceInLca = sourceAncestorGraph.getParent();
        sourceAncestorGraph = edge.sourceInLca.getOwner();
      }
    }

    if (edge.lca == null) {
      throw "assert failed";
    }
  }
};

LGraphManager.prototype.calcLowestCommonAncestor = function (firstNode, secondNode)
{
  if (firstNode == secondNode)
  {
    return firstNode.getOwner();
  }
  var firstOwnerGraph = firstNode.getOwner();

  do
  {
    if (firstOwnerGraph == null)
    {
      break;
    }
    var secondOwnerGraph = secondNode.getOwner();

    do
    {
      if (secondOwnerGraph == null)
      {
        break;
      }

      if (secondOwnerGraph == firstOwnerGraph)
      {
        return secondOwnerGraph;
      }
      secondOwnerGraph = secondOwnerGraph.getParent().getOwner();
    } while (true);

    firstOwnerGraph = firstOwnerGraph.getParent().getOwner();
  } while (true);

  return firstOwnerGraph;
};

LGraphManager.prototype.calcInclusionTreeDepths = function (graph, depth) {
  if (graph == null && depth == null) {
    graph = this.rootGraph;
    depth = 1;
  }
  var node;

  var nodes = graph.getNodes();
  var s = nodes.length;
  for (var i = 0; i < s; i++)
  {
    node = nodes[i];
    node.inclusionTreeDepth = depth;

    if (node.child != null)
    {
      this.calcInclusionTreeDepths(node.child, depth + 1);
    }
  }
};

LGraphManager.prototype.includesInvalidEdge = function ()
{
  var edge;

  var s = this.edges.length;
  for (var i = 0; i < s; i++)
  {
    edge = this.edges[i];

    if (this.isOneAncestorOfOther(edge.source, edge.target))
    {
      return true;
    }
  }
  return false;
};

module.exports = LGraphManager;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraphObject.js":[function(require,module,exports){
function LGraphObject(vGraphObject) {
  this.vGraphObject = vGraphObject;
}

module.exports = LGraphObject;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LNode.js":[function(require,module,exports){
var LGraphObject = require('./LGraphObject');
var Integer = require('./Integer');
var RectangleD = require('./RectangleD');
var LayoutConstants = require('./LayoutConstants');
var RandomSeed = require('./RandomSeed');
var PointD = require('./PointD');

function LNode(gm, loc, size, vNode) {
  //Alternative constructor 1 : LNode(LGraphManager gm, Point loc, Dimension size, Object vNode)
  if (size == null && vNode == null) {
    vNode = loc;
  }

  LGraphObject.call(this, vNode);

  //Alternative constructor 2 : LNode(Layout layout, Object vNode)
  if (gm.graphManager != null)
    gm = gm.graphManager;

  this.estimatedSize = Integer.MIN_VALUE;
  this.inclusionTreeDepth = Integer.MAX_VALUE;
  this.vGraphObject = vNode;
  this.edges = [];
  this.graphManager = gm;

  if (size != null && loc != null)
    this.rect = new RectangleD(loc.x, loc.y, size.width, size.height);
  else
    this.rect = new RectangleD();
}

LNode.prototype = Object.create(LGraphObject.prototype);
for (var prop in LGraphObject) {
  LNode[prop] = LGraphObject[prop];
}

LNode.prototype.getEdges = function ()
{
  return this.edges;
};

LNode.prototype.getChild = function ()
{
  return this.child;
};

LNode.prototype.getOwner = function ()
{
  if (this.owner != null) {
    if (!(this.owner == null || this.owner.getNodes().indexOf(this) > -1)) {
      throw "assert failed";
    }
  }

  return this.owner;
};

LNode.prototype.getWidth = function ()
{
  return this.rect.width;
};

LNode.prototype.setWidth = function (width)
{
  this.rect.width = width;
};

LNode.prototype.getHeight = function ()
{
  return this.rect.height;
};

LNode.prototype.setHeight = function (height)
{
  this.rect.height = height;
};

LNode.prototype.getCenterX = function ()
{
  return this.rect.x + this.rect.width / 2;
};

LNode.prototype.getCenterY = function ()
{
  return this.rect.y + this.rect.height / 2;
};

LNode.prototype.getCenter = function ()
{
  return new PointD(this.rect.x + this.rect.width / 2,
          this.rect.y + this.rect.height / 2);
};

LNode.prototype.getLocation = function ()
{
  return new PointD(this.rect.x, this.rect.y);
};

LNode.prototype.getRect = function ()
{
  return this.rect;
};

LNode.prototype.getDiagonal = function ()
{
  return Math.sqrt(this.rect.width * this.rect.width +
          this.rect.height * this.rect.height);
};

LNode.prototype.setRect = function (upperLeft, dimension)
{
  this.rect.x = upperLeft.x;
  this.rect.y = upperLeft.y;
  this.rect.width = dimension.width;
  this.rect.height = dimension.height;
};

LNode.prototype.setCenter = function (cx, cy)
{
  this.rect.x = cx - this.rect.width / 2;
  this.rect.y = cy - this.rect.height / 2;
};

LNode.prototype.setLocation = function (x, y)
{
  this.rect.x = x;
  this.rect.y = y;
};

LNode.prototype.moveBy = function (dx, dy)
{
  this.rect.x += dx;
  this.rect.y += dy;
};

LNode.prototype.getEdgeListToNode = function (to)
{
  var edgeList = [];
  var edge;

  for (var obj in this.edges)
  {
    edge = obj;

    if (edge.target == to)
    {
      if (edge.source != this)
        throw "Incorrect edge source!";

      edgeList.push(edge);
    }
  }

  return edgeList;
};

LNode.prototype.getEdgesBetween = function (other)
{
  var edgeList = [];
  var edge;

  for (var obj in this.edges)
  {
    edge = this.edges[obj];

    if (!(edge.source == this || edge.target == this))
      throw "Incorrect edge source and/or target";

    if ((edge.target == other) || (edge.source == other))
    {
      edgeList.push(edge);
    }
  }

  return edgeList;
};

LNode.prototype.getNeighborsList = function ()
{
  var neighbors = new HashSet();
  var edge;

  for (var obj in this.edges)
  {
    edge = this.edges[obj];

    if (edge.source == this)
    {
      neighbors.add(edge.target);
    }
    else
    {
      if (!edge.target == this)
        throw "Incorrect incidency!";
      neighbors.add(edge.source);
    }
  }

  return neighbors;
};

LNode.prototype.withChildren = function ()
{
  var withNeighborsList = [];
  var childNode;

  withNeighborsList.push(this);

  if (this.child != null)
  {
    var nodes = this.child.getNodes();
    for (var i = 0; i < nodes.length; i++)
    {
      childNode = nodes[i];

      withNeighborsList = withNeighborsList.concat(childNode.withChildren());
    }
  }

  return withNeighborsList;
};

LNode.prototype.getEstimatedSize = function () {
  if (this.estimatedSize == Integer.MIN_VALUE) {
    throw "assert failed";
  }
  return this.estimatedSize;
};

LNode.prototype.calcEstimatedSize = function () {
  if (this.child == null)
  {
    return this.estimatedSize = Math.floor((this.rect.width + this.rect.height) / 2);
  }
  else
  {
    this.estimatedSize = this.child.calcEstimatedSize();
    this.rect.width = this.estimatedSize;
    this.rect.height = this.estimatedSize;

    return this.estimatedSize;
  }
};

LNode.prototype.scatter = function () {
  var randomCenterX;
  var randomCenterY;

  var minX = -LayoutConstants.INITIAL_WORLD_BOUNDARY;
  var maxX = LayoutConstants.INITIAL_WORLD_BOUNDARY;
  randomCenterX = LayoutConstants.WORLD_CENTER_X +
          (RandomSeed.nextDouble() * (maxX - minX)) + minX;

  var minY = -LayoutConstants.INITIAL_WORLD_BOUNDARY;
  var maxY = LayoutConstants.INITIAL_WORLD_BOUNDARY;
  randomCenterY = LayoutConstants.WORLD_CENTER_Y +
          (RandomSeed.nextDouble() * (maxY - minY)) + minY;

  this.rect.x = randomCenterX;
  this.rect.y = randomCenterY
};

LNode.prototype.updateBounds = function () {
  if (this.getChild() == null) {
    throw "assert failed";
  }
  if (this.getChild().getNodes().length != 0)
  {
    // wrap the children nodes by re-arranging the boundaries
    var childGraph = this.getChild();
    childGraph.updateBounds(true);

    this.rect.x = childGraph.getLeft();
    this.rect.y = childGraph.getTop();

    this.setWidth(childGraph.getRight() - childGraph.getLeft() +
            2 * LayoutConstants.COMPOUND_NODE_MARGIN);
    this.setHeight(childGraph.getBottom() - childGraph.getTop() +
            2 * LayoutConstants.COMPOUND_NODE_MARGIN +
            LayoutConstants.LABEL_HEIGHT);
  }
};

LNode.prototype.getInclusionTreeDepth = function ()
{
  if (this.inclusionTreeDepth == Integer.MAX_VALUE) {
    throw "assert failed";
  }
  return this.inclusionTreeDepth;
};

LNode.prototype.transform = function (trans)
{
  var left = this.rect.x;

  if (left > LayoutConstants.WORLD_BOUNDARY)
  {
    left = LayoutConstants.WORLD_BOUNDARY;
  }
  else if (left < -LayoutConstants.WORLD_BOUNDARY)
  {
    left = -LayoutConstants.WORLD_BOUNDARY;
  }

  var top = this.rect.y;

  if (top > LayoutConstants.WORLD_BOUNDARY)
  {
    top = LayoutConstants.WORLD_BOUNDARY;
  }
  else if (top < -LayoutConstants.WORLD_BOUNDARY)
  {
    top = -LayoutConstants.WORLD_BOUNDARY;
  }

  var leftTop = new PointD(left, top);
  var vLeftTop = trans.inverseTransformPoint(leftTop);

  this.setLocation(vLeftTop.x, vLeftTop.y);
};

LNode.prototype.getLeft = function ()
{
  return this.rect.x;
};

LNode.prototype.getRight = function ()
{
  return this.rect.x + this.rect.width;
};

LNode.prototype.getTop = function ()
{
  return this.rect.y;
};

LNode.prototype.getBottom = function ()
{
  return this.rect.y + this.rect.height;
};

LNode.prototype.getParent = function ()
{
  if (this.owner == null)
  {
    return null;
  }

  return this.owner.getParent();
};

module.exports = LNode;

},{"./Integer":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Integer.js","./LGraphObject":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraphObject.js","./LayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LayoutConstants.js","./PointD":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/PointD.js","./RandomSeed":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/RandomSeed.js","./RectangleD":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/RectangleD.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Layout.js":[function(require,module,exports){
var LayoutConstants = require('./LayoutConstants');
var HashMap = require('./HashMap');
var LGraphManager = require('./LGraphManager');
var LNode = require('./LNode');
var LEdge = require('./LEdge');
var LGraph = require('./LGraph');
var PointD = require('./PointD');
var Transform = require('./Transform');

function Layout(isRemoteUse) {
  //Layout Quality: 0:proof, 1:default, 2:draft
  this.layoutQuality = LayoutConstants.DEFAULT_QUALITY;
  //Whether layout should create bendpoints as needed or not
  this.createBendsAsNeeded =
          LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
  //Whether layout should be incremental or not
  this.incremental = LayoutConstants.DEFAULT_INCREMENTAL;
  //Whether we animate from before to after layout node positions
  this.animationOnLayout =
          LayoutConstants.DEFAULT_ANIMATION_ON_LAYOUT;
  //Whether we animate the layout process or not
  this.animationDuringLayout = LayoutConstants.DEFAULT_ANIMATION_DURING_LAYOUT;
  //Number iterations that should be done between two successive animations
  this.animationPeriod = LayoutConstants.DEFAULT_ANIMATION_PERIOD;
  /**
   * Whether or not leaf nodes (non-compound nodes) are of uniform sizes. When
   * they are, both spring and repulsion forces between two leaf nodes can be
   * calculated without the expensive clipping point calculations, resulting
   * in major speed-up.
   */
  this.uniformLeafNodeSizes =
          LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES;
  /**
   * This is used for creation of bendpoints by using dummy nodes and edges.
   * Maps an LEdge to its dummy bendpoint path.
   */
  this.edgeToDummyNodes = new HashMap();
  this.graphManager = new LGraphManager(this);
  this.isLayoutFinished = false;
  this.isSubLayout = false;
  this.isRemoteUse = false;

  if (isRemoteUse != null) {
    this.isRemoteUse = isRemoteUse;
  }
}

Layout.RANDOM_SEED = 1;

Layout.prototype.getGraphManager = function () {
  return this.graphManager;
};

Layout.prototype.getAllNodes = function () {
  return this.graphManager.getAllNodes();
};

Layout.prototype.getAllEdges = function () {
  return this.graphManager.getAllEdges();
};

Layout.prototype.getAllNodesToApplyGravitation = function () {
  return this.graphManager.getAllNodesToApplyGravitation();
};

Layout.prototype.newGraphManager = function () {
  var gm = new LGraphManager(this);
  this.graphManager = gm;
  return gm;
};

Layout.prototype.newGraph = function (vGraph)
{
  return new LGraph(null, this.graphManager, vGraph);
};

Layout.prototype.newNode = function (vNode)
{
  return new LNode(this.graphManager, vNode);
};

Layout.prototype.newEdge = function (vEdge)
{
  return new LEdge(null, null, vEdge);
};

Layout.prototype.runLayout = function ()
{
  this.isLayoutFinished = false;

  this.initParameters();
  var isLayoutSuccessfull;

  if ((this.graphManager.getRoot() == null)
          || this.graphManager.getRoot().getNodes().length == 0
          || this.graphManager.includesInvalidEdge())
  {
    isLayoutSuccessfull = false;
  }
  else
  {
    // calculate execution time
    var startTime = 0;

    if (!this.isSubLayout)
    {
      startTime = new Date().getTime()
    }

    isLayoutSuccessfull = this.layout();

    if (!this.isSubLayout)
    {
      var endTime = new Date().getTime();
      var excTime = endTime - startTime;

      console.log("Total execution time: " + excTime + " miliseconds.");
    }
  }

  if (isLayoutSuccessfull)
  {
    if (!this.isSubLayout)
    {
      this.doPostLayout();
    }
  }

  this.isLayoutFinished = true;

  return isLayoutSuccessfull;
};

/**
 * This method performs the operations required after layout.
 */
Layout.prototype.doPostLayout = function ()
{
  //assert !isSubLayout : "Should not be called on sub-layout!";
  // Propagate geometric changes to v-level objects
  this.transform();
  this.update();
};

/**
 * This method updates the geometry of the target graph according to
 * calculated layout.
 */
Layout.prototype.update2 = function () {
  // update bend points
  if (this.createBendsAsNeeded)
  {
    this.createBendpointsFromDummyNodes();

    // reset all edges, since the topology has changed
    this.graphManager.resetAllEdges();
  }

  // perform edge, node and root updates if layout is not called
  // remotely
  if (!this.isRemoteUse)
  {
    // update all edges
    var edge;
    var allEdges = this.graphManager.getAllEdges();
    for (var i = 0; i < allEdges.length; i++)
    {
      edge = allEdges[i];
//      this.update(edge);
    }

    // recursively update nodes
    var node;
    var nodes = this.graphManager.getRoot().getNodes();
    for (var i = 0; i < nodes.length; i++)
    {
      node = nodes[i];
//      this.update(node);
    }

    // update root graph
    this.update(this.graphManager.getRoot());
  }
};

Layout.prototype.update = function (obj) {
  if (obj == null) {
    this.update2();
  }
  else if (obj instanceof LNode) {
    var node = obj;
    if (node.getChild() != null)
    {
      // since node is compound, recursively update child nodes
      var nodes = node.getChild().getNodes();
      for (var i = 0; i < nodes.length; i++)
      {
        update(nodes[i]);
      }
    }

    // if the l-level node is associated with a v-level graph object,
    // then it is assumed that the v-level node implements the
    // interface Updatable.
    if (node.vGraphObject != null)
    {
      // cast to Updatable without any type check
      var vNode = node.vGraphObject;

      // call the update method of the interface
      vNode.update(node);
    }
  }
  else if (obj instanceof LEdge) {
    var edge = obj;
    // if the l-level edge is associated with a v-level graph object,
    // then it is assumed that the v-level edge implements the
    // interface Updatable.

    if (edge.vGraphObject != null)
    {
      // cast to Updatable without any type check
      var vEdge = edge.vGraphObject;

      // call the update method of the interface
      vEdge.update(edge);
    }
  }
  else if (obj instanceof LGraph) {
    var graph = obj;
    // if the l-level graph is associated with a v-level graph object,
    // then it is assumed that the v-level object implements the
    // interface Updatable.

    if (graph.vGraphObject != null)
    {
      // cast to Updatable without any type check
      var vGraph = graph.vGraphObject;

      // call the update method of the interface
      vGraph.update(graph);
    }
  }
};

/**
 * This method is used to set all layout parameters to default values
 * determined at compile time.
 */
Layout.prototype.initParameters = function () {
  if (!this.isSubLayout)
  {
    this.layoutQuality = LayoutConstants.DEFAULT_QUALITY;
    this.animationDuringLayout = LayoutConstants.DEFAULT_ANIMATION_ON_LAYOUT;
    this.animationPeriod = LayoutConstants.DEFAULT_ANIMATION_PERIOD;
    this.animationOnLayout = LayoutConstants.DEFAULT_ANIMATION_DURING_LAYOUT;
    this.incremental = LayoutConstants.DEFAULT_INCREMENTAL;
    this.createBendsAsNeeded = LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
    this.uniformLeafNodeSizes = LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES;
  }

  if (this.animationDuringLayout)
  {
    animationOnLayout = false;
  }
};

Layout.prototype.transform = function (newLeftTop) {
  if (newLeftTop == undefined) {
    this.transform(new PointD(0, 0));
  }
  else {
    // create a transformation object (from Eclipse to layout). When an
    // inverse transform is applied, we get upper-left coordinate of the
    // drawing or the root graph at given input coordinate (some margins
    // already included in calculation of left-top).

    var trans = new Transform();
    var leftTop = this.graphManager.getRoot().updateLeftTop();

    if (leftTop != null)
    {
      trans.setWorldOrgX(newLeftTop.x);
      trans.setWorldOrgY(newLeftTop.y);

      trans.setDeviceOrgX(leftTop.x);
      trans.setDeviceOrgY(leftTop.y);

      var nodes = this.getAllNodes();
      var node;

      for (var i = 0; i < nodes.length; i++)
      {
        node = nodes[i];
        node.transform(trans);
      }
    }
  }
};

Layout.prototype.positionNodesRandomly = function (graph) {

  if (graph == undefined) {
    //assert !this.incremental;
    this.positionNodesRandomly(this.getGraphManager().getRoot());
    this.getGraphManager().getRoot().updateBounds(true);
  }
  else {
    var lNode;
    var childGraph;

    var nodes = graph.getNodes();
    for (var i = 0; i < nodes.length; i++)
    {
      lNode = nodes[i];
      childGraph = lNode.getChild();

      if (childGraph == null)
      {
        lNode.scatter();
      }
      else if (childGraph.getNodes().length == 0)
      {
        lNode.scatter();
      }
      else
      {
        this.positionNodesRandomly(childGraph);
        lNode.updateBounds();
      }
    }
  }
};

/**
 * This method returns a list of trees where each tree is represented as a
 * list of l-nodes. The method returns a list of size 0 when:
 * - The graph is not flat or
 * - One of the component(s) of the graph is not a tree.
 */
Layout.prototype.getFlatForest = function ()
{
  var flatForest = [];
  var isForest = true;

  // Quick reference for all nodes in the graph manager associated with
  // this layout. The list should not be changed.
  var allNodes = this.graphManager.getRoot().getNodes();

  // First be sure that the graph is flat
  var isFlat = true;

  for (var i = 0; i < allNodes.length; i++)
  {
    if (allNodes[i].getChild() != null)
    {
      isFlat = false;
    }
  }

  // Return empty forest if the graph is not flat.
  if (!isFlat)
  {
    return flatForest;
  }

  // Run BFS for each component of the graph.

  var visited = new HashSet();
  var toBeVisited = [];
  var parents = new HashMap();
  var unProcessedNodes = [];

  unProcessedNodes = unProcessedNodes.concat(allNodes);

  // Each iteration of this loop finds a component of the graph and
  // decides whether it is a tree or not. If it is a tree, adds it to the
  // forest and continued with the next component.

  while (unProcessedNodes.length > 0 && isForest)
  {
    toBeVisited.push(unProcessedNodes[0]);

    // Start the BFS. Each iteration of this loop visits a node in a
    // BFS manner.
    while (toBeVisited.length > 0 && isForest)
    {
      //pool operation
      var currentNode = toBeVisited[0];
      toBeVisited.splice(0, 1);
      visited.add(currentNode);

      // Traverse all neighbors of this node
      var neighborEdges = currentNode.getEdges();

      for (var i = 0; i < neighborEdges.length; i++)
      {
        var currentNeighbor =
                neighborEdges[i].getOtherEnd(currentNode);

        // If BFS is not growing from this neighbor.
        if (parents.get(currentNode) != currentNeighbor)
        {
          // We haven't previously visited this neighbor.
          if (!visited.contains(currentNeighbor))
          {
            toBeVisited.push(currentNeighbor);
            parents.put(currentNeighbor, currentNode);
          }
          // Since we have previously visited this neighbor and
          // this neighbor is not parent of currentNode, given
          // graph contains a component that is not tree, hence
          // it is not a forest.
          else
          {
            isForest = false;
            break;
          }
        }
      }
    }

    // The graph contains a component that is not a tree. Empty
    // previously found trees. The method will end.
    if (!isForest)
    {
      flatForest = [];
    }
    // Save currently visited nodes as a tree in our forest. Reset
    // visited and parents lists. Continue with the next component of
    // the graph, if any.
    else
    {
      var temp = [];
      visited.addAllTo(temp);
      flatForest.push(temp);
      //flatForest = flatForest.concat(temp);
      //unProcessedNodes.removeAll(visited);
      for (var i = 0; i < temp.length; i++) {
        var value = temp[i];
        var index = unProcessedNodes.indexOf(value);
        if (index > -1) {
          unProcessedNodes.splice(index, 1);
        }
      }
      visited = new HashSet();
      parents = new HashMap();
    }
  }

  return flatForest;
};

/**
 * This method creates dummy nodes (an l-level node with minimal dimensions)
 * for the given edge (one per bendpoint). The existing l-level structure
 * is updated accordingly.
 */
Layout.prototype.createDummyNodesForBendpoints = function (edge)
{
  var dummyNodes = [];
  var prev = edge.source;

  var graph = this.graphManager.calcLowestCommonAncestor(edge.source, edge.target);

  for (var i = 0; i < edge.bendpoints.length; i++)
  {
    // create new dummy node
    var dummyNode = this.newNode(null);
    dummyNode.setRect(new Point(0, 0), new Dimension(1, 1));

    graph.add(dummyNode);

    // create new dummy edge between prev and dummy node
    var dummyEdge = this.newEdge(null);
    this.graphManager.add(dummyEdge, prev, dummyNode);

    dummyNodes.add(dummyNode);
    prev = dummyNode;
  }

  var dummyEdge = this.newEdge(null);
  this.graphManager.add(dummyEdge, prev, edge.target);

  this.edgeToDummyNodes.put(edge, dummyNodes);

  // remove real edge from graph manager if it is inter-graph
  if (edge.isInterGraph())
  {
    this.graphManager.remove(edge);
  }
  // else, remove the edge from the current graph
  else
  {
    graph.remove(edge);
  }

  return dummyNodes;
};

/**
 * This method creates bendpoints for edges from the dummy nodes
 * at l-level.
 */
Layout.prototype.createBendpointsFromDummyNodes = function ()
{
  var edges = [];
  edges = edges.concat(this.graphManager.getAllEdges());
  edges = this.edgeToDummyNodes.keySet().concat(edges);

  for (var k = 0; k < edges.length; k++)
  {
    var lEdge = edges[k];

    if (lEdge.bendpoints.length > 0)
    {
      var path = this.edgeToDummyNodes.get(lEdge);

      for (var i = 0; i < path.length; i++)
      {
        var dummyNode = path[i];
        var p = new PointD(dummyNode.getCenterX(),
                dummyNode.getCenterY());

        // update bendpoint's location according to dummy node
        var ebp = lEdge.bendpoints.get(i);
        ebp.x = p.x;
        ebp.y = p.y;

        // remove the dummy node, dummy edges incident with this
        // dummy node is also removed (within the remove method)
        dummyNode.getOwner().remove(dummyNode);
      }

      // add the real edge to graph
      this.graphManager.add(lEdge, lEdge.source, lEdge.target);
    }
  }
};

Layout.transform = function (sliderValue, defaultValue, minDiv, maxMul) {
  if (minDiv != undefined && maxMul != undefined) {
    var value = defaultValue;

    if (sliderValue <= 50)
    {
      var minValue = defaultValue / minDiv;
      value -= ((defaultValue - minValue) / 50) * (50 - sliderValue);
    }
    else
    {
      var maxValue = defaultValue * maxMul;
      value += ((maxValue - defaultValue) / 50) * (sliderValue - 50);
    }

    return value;
  }
  else {
    var a, b;

    if (sliderValue <= 50)
    {
      a = 9.0 * defaultValue / 500.0;
      b = defaultValue / 10.0;
    }
    else
    {
      a = 9.0 * defaultValue / 50.0;
      b = -8 * defaultValue;
    }

    return (a * sliderValue + b);
  }
};

/**
 * This method finds and returns the center of the given nodes, assuming
 * that the given nodes form a tree in themselves.
 */
Layout.findCenterOfTree = function (nodes)
{
  var list = [];
  list = list.concat(nodes);

  var removedNodes = [];
  var remainingDegrees = new HashMap();
  var foundCenter = false;
  var centerNode = null;

  if (list.length == 1 || list.length == 2)
  {
    foundCenter = true;
    centerNode = list[0];
  }

  for (var i = 0; i < list.length; i++)
  {
    var node = list[i];
    var degree = node.getNeighborsList().size();
    remainingDegrees.put(node, node.getNeighborsList().size());

    if (degree == 1)
    {
      removedNodes.push(node);
    }
  }

  var tempList = [];
  tempList = tempList.concat(removedNodes);

  while (!foundCenter)
  {
    var tempList2 = [];
    tempList2 = tempList2.concat(tempList);
    tempList = [];

    for (var i = 0; i < list.length; i++)
    {
      var node = list[i];

      var index = list.indexOf(node);
      if (index >= 0) {
        list.splice(index, 1);
      }

      var neighbours = node.getNeighborsList();

      for (var j in neighbours.set)
      {
        var neighbour = neighbours.set[j];
        if (removedNodes.indexOf(neighbour) < 0)
        {
          var otherDegree = remainingDegrees.get(neighbour);
          var newDegree = otherDegree - 1;

          if (newDegree == 1)
          {
            tempList.push(neighbour);
          }

          remainingDegrees.put(neighbour, newDegree);
        }
      }
    }

    removedNodes = removedNodes.concat(tempList);

    if (list.length == 1 || list.length == 2)
    {
      foundCenter = true;
      centerNode = list[0];
    }
  }

  return centerNode;
};

/**
 * During the coarsening process, this layout may be referenced by two graph managers
 * this setter function grants access to change the currently being used graph manager
 */
Layout.prototype.setGraphManager = function (gm)
{
  this.graphManager = gm;
};

module.exports = Layout;

},{"./HashMap":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/HashMap.js","./LEdge":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LEdge.js","./LGraph":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraph.js","./LGraphManager":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraphManager.js","./LNode":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LNode.js","./LayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LayoutConstants.js","./PointD":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/PointD.js","./Transform":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Transform.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LayoutConstants.js":[function(require,module,exports){
function LayoutConstants() {
}

/**
 * Layout Quality
 */
LayoutConstants.PROOF_QUALITY = 0;
LayoutConstants.DEFAULT_QUALITY = 1;
LayoutConstants.DRAFT_QUALITY = 2;

/**
 * Default parameters
 */
LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED = false;
//LayoutConstants.DEFAULT_INCREMENTAL = true;
LayoutConstants.DEFAULT_INCREMENTAL = false;
LayoutConstants.DEFAULT_ANIMATION_ON_LAYOUT = true;
LayoutConstants.DEFAULT_ANIMATION_DURING_LAYOUT = false;
LayoutConstants.DEFAULT_ANIMATION_PERIOD = 50;
LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES = false;

// -----------------------------------------------------------------------------
// Section: General other constants
// -----------------------------------------------------------------------------
/*
 * Margins of a graph to be applied on bouding rectangle of its contents. We
 * assume margins on all four sides to be uniform.
 */
LayoutConstants.DEFAULT_GRAPH_MARGIN = 10;

/*
 * The height of the label of a compound. We assume the label of a compound
 * node is placed at the bottom with a dynamic width same as the compound
 * itself.
 */
LayoutConstants.LABEL_HEIGHT = 20;

/*
 * Additional margins that we maintain as safety buffer for node-node
 * overlaps. Compound node labels as well as graph margins are handled
 * separately!
 */
LayoutConstants.COMPOUND_NODE_MARGIN = 5;

/*
 * Default dimension of a non-compound node.
 */
LayoutConstants.SIMPLE_NODE_SIZE = 40;

/*
 * Default dimension of a non-compound node.
 */
LayoutConstants.SIMPLE_NODE_HALF_SIZE = LayoutConstants.SIMPLE_NODE_SIZE / 2;

/*
 * Empty compound node size. When a compound node is empty, its both
 * dimensions should be of this value.
 */
LayoutConstants.EMPTY_COMPOUND_NODE_SIZE = 40;

/*
 * Minimum length that an edge should take during layout
 */
LayoutConstants.MIN_EDGE_LENGTH = 1;

/*
 * World boundaries that layout operates on
 */
LayoutConstants.WORLD_BOUNDARY = 1000000;

/*
 * World boundaries that random positioning can be performed with
 */
LayoutConstants.INITIAL_WORLD_BOUNDARY = LayoutConstants.WORLD_BOUNDARY / 1000;

/*
 * Coordinates of the world center
 */
LayoutConstants.WORLD_CENTER_X = 1200;
LayoutConstants.WORLD_CENTER_Y = 900;

module.exports = LayoutConstants;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Point.js":[function(require,module,exports){
/*
 *This class is the javascript implementation of the Point.java class in jdk
 */
function Point(x, y, p) {
  this.x = null;
  this.y = null;
  if (x == null && y == null && p == null) {
    this.x = 0;
    this.y = 0;
  }
  else if (typeof x == 'number' && typeof y == 'number' && p == null) {
    this.x = x;
    this.y = y;
  }
  else if (x.constructor.name == 'Point' && y == null && p == null) {
    p = x;
    this.x = p.x;
    this.y = p.y;
  }
}

Point.prototype.getX = function () {
  return this.x;
}

Point.prototype.getY = function () {
  return this.y;
}

Point.prototype.getLocation = function () {
  return new Point(this.x, this.y);
}

Point.prototype.setLocation = function (x, y, p) {
  if (x.constructor.name == 'Point' && y == null && p == null) {
    p = x;
    this.setLocation(p.x, p.y);
  }
  else if (typeof x == 'number' && typeof y == 'number' && p == null) {
    //if both parameters are integer just move (x,y) location
    if (parseInt(x) == x && parseInt(y) == y) {
      this.move(x, y);
    }
    else {
      this.x = Math.floor(x + 0.5);
      this.y = Math.floor(y + 0.5);
    }
  }
}

Point.prototype.move = function (x, y) {
  this.x = x;
  this.y = y;
}

Point.prototype.translate = function (dx, dy) {
  this.x += dx;
  this.y += dy;
}

Point.prototype.equals = function (obj) {
  if (obj.constructor.name == "Point") {
    var pt = obj;
    return (this.x == pt.x) && (this.y == pt.y);
  }
  return this == obj;
}

Point.prototype.toString = function () {
  return new Point().constructor.name + "[x=" + this.x + ",y=" + this.y + "]";
}

module.exports = Point;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/PointD.js":[function(require,module,exports){
function PointD(x, y) {
  if (x == null && y == null) {
    this.x = 0;
    this.y = 0;
  } else {
    this.x = x;
    this.y = y;
  }
}

PointD.prototype.getX = function ()
{
  return this.x;
};

PointD.prototype.getY = function ()
{
  return this.y;
};

PointD.prototype.setX = function (x)
{
  this.x = x;
};

PointD.prototype.setY = function (y)
{
  this.y = y;
};

PointD.prototype.getDifference = function (pt)
{
  return new DimensionD(this.x - pt.x, this.y - pt.y);
};

PointD.prototype.getCopy = function ()
{
  return new PointD(this.x, this.y);
};

PointD.prototype.translate = function (dim)
{
  this.x += dim.width;
  this.y += dim.height;
  return this;
};

module.exports = PointD;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/RandomSeed.js":[function(require,module,exports){
function RandomSeed() {
}
RandomSeed.seed = 1;
RandomSeed.x = 0;

RandomSeed.nextDouble = function () {
  RandomSeed.x = Math.sin(RandomSeed.seed++) * 10000;
  return RandomSeed.x - Math.floor(RandomSeed.x);
};

module.exports = RandomSeed;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/RectangleD.js":[function(require,module,exports){
function RectangleD(x, y, width, height) {
  this.x = 0;
  this.y = 0;
  this.width = 0;
  this.height = 0;

  if (x != null && y != null && width != null && height != null) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

RectangleD.prototype.getX = function ()
{
  return this.x;
};

RectangleD.prototype.setX = function (x)
{
  this.x = x;
};

RectangleD.prototype.getY = function ()
{
  return this.y;
};

RectangleD.prototype.setY = function (y)
{
  this.y = y;
};

RectangleD.prototype.getWidth = function ()
{
  return this.width;
};

RectangleD.prototype.setWidth = function (width)
{
  this.width = width;
};

RectangleD.prototype.getHeight = function ()
{
  return this.height;
};

RectangleD.prototype.setHeight = function (height)
{
  this.height = height;
};

RectangleD.prototype.getRight = function ()
{
  return this.x + this.width;
};

RectangleD.prototype.getBottom = function ()
{
  return this.y + this.height;
};

RectangleD.prototype.intersects = function (a)
{
  if (this.getRight() < a.x)
  {
    return false;
  }

  if (this.getBottom() < a.y)
  {
    return false;
  }

  if (a.getRight() < this.x)
  {
    return false;
  }

  if (a.getBottom() < this.y)
  {
    return false;
  }

  return true;
};

RectangleD.prototype.getCenterX = function ()
{
  return this.x + this.width / 2;
};

RectangleD.prototype.getMinX = function ()
{
  return this.getX();
};

RectangleD.prototype.getMaxX = function ()
{
  return this.getX() + this.width;
};

RectangleD.prototype.getCenterY = function ()
{
  return this.y + this.height / 2;
};

RectangleD.prototype.getMinY = function ()
{
  return this.getY();
};

RectangleD.prototype.getMaxY = function ()
{
  return this.getY() + this.height;
};

RectangleD.prototype.getWidthHalf = function ()
{
  return this.width / 2;
};

RectangleD.prototype.getHeightHalf = function ()
{
  return this.height / 2;
};

module.exports = RectangleD;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Transform.js":[function(require,module,exports){
var PointD = require('./PointD');

function Transform(x, y) {
  this.lworldOrgX = 0.0;
  this.lworldOrgY = 0.0;
  this.ldeviceOrgX = 0.0;
  this.ldeviceOrgY = 0.0;
  this.lworldExtX = 1.0;
  this.lworldExtY = 1.0;
  this.ldeviceExtX = 1.0;
  this.ldeviceExtY = 1.0;
}

Transform.prototype.getWorldOrgX = function ()
{
  return this.lworldOrgX;
}

Transform.prototype.setWorldOrgX = function (wox)
{
  this.lworldOrgX = wox;
}

Transform.prototype.getWorldOrgY = function ()
{
  return this.lworldOrgY;
}

Transform.prototype.setWorldOrgY = function (woy)
{
  this.lworldOrgY = woy;
}

Transform.prototype.getWorldExtX = function ()
{
  return this.lworldExtX;
}

Transform.prototype.setWorldExtX = function (wex)
{
  this.lworldExtX = wex;
}

Transform.prototype.getWorldExtY = function ()
{
  return this.lworldExtY;
}

Transform.prototype.setWorldExtY = function (wey)
{
  this.lworldExtY = wey;
}

/* Device related */

Transform.prototype.getDeviceOrgX = function ()
{
  return this.ldeviceOrgX;
}

Transform.prototype.setDeviceOrgX = function (dox)
{
  this.ldeviceOrgX = dox;
}

Transform.prototype.getDeviceOrgY = function ()
{
  return this.ldeviceOrgY;
}

Transform.prototype.setDeviceOrgY = function (doy)
{
  this.ldeviceOrgY = doy;
}

Transform.prototype.getDeviceExtX = function ()
{
  return this.ldeviceExtX;
}

Transform.prototype.setDeviceExtX = function (dex)
{
  this.ldeviceExtX = dex;
}

Transform.prototype.getDeviceExtY = function ()
{
  return this.ldeviceExtY;
}

Transform.prototype.setDeviceExtY = function (dey)
{
  this.ldeviceExtY = dey;
}

Transform.prototype.transformX = function (x)
{
  var xDevice = 0.0;
  var worldExtX = this.lworldExtX;
  if (worldExtX != 0.0)
  {
    xDevice = this.ldeviceOrgX +
            ((x - this.lworldOrgX) * this.ldeviceExtX / worldExtX);
  }

  return xDevice;
}

Transform.prototype.transformY = function (y)
{
  var yDevice = 0.0;
  var worldExtY = this.lworldExtY;
  if (worldExtY != 0.0)
  {
    yDevice = this.ldeviceOrgY +
            ((y - this.lworldOrgY) * this.ldeviceExtY / worldExtY);
  }


  return yDevice;
}

Transform.prototype.inverseTransformX = function (x)
{
  var xWorld = 0.0;
  var deviceExtX = this.ldeviceExtX;
  if (deviceExtX != 0.0)
  {
    xWorld = this.lworldOrgX +
            ((x - this.ldeviceOrgX) * this.lworldExtX / deviceExtX);
  }


  return xWorld;
}

Transform.prototype.inverseTransformY = function (y)
{
  var yWorld = 0.0;
  var deviceExtY = this.ldeviceExtY;
  if (deviceExtY != 0.0)
  {
    yWorld = this.lworldOrgY +
            ((y - this.ldeviceOrgY) * this.lworldExtY / deviceExtY);
  }
  return yWorld;
}

Transform.prototype.inverseTransformPoint = function (inPoint)
{
  var outPoint =
          new PointD(this.inverseTransformX(inPoint.x),
                  this.inverseTransformY(inPoint.y));
  return outPoint;
}

module.exports = Transform;

},{"./PointD":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/PointD.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/UniqueIDGeneretor.js":[function(require,module,exports){
function UniqueIDGeneretor() {
}

UniqueIDGeneretor.lastID = 0;

UniqueIDGeneretor.createID = function (obj) {
  if (UniqueIDGeneretor.isPrimitive(obj)) {
    return obj;
  }
  if (obj.uniqueID != null) {
    return obj.uniqueID;
  }
  obj.uniqueID = UniqueIDGeneretor.getString();
  UniqueIDGeneretor.lastID++;
  return obj.uniqueID;
}

UniqueIDGeneretor.getString = function (id) {
  if (id == null)
    id = UniqueIDGeneretor.lastID;
  return "Object#" + id + "";
}

UniqueIDGeneretor.isPrimitive = function (arg) {
  var type = typeof arg;
  return arg == null || (type != "object" && type != "function");
}

module.exports = UniqueIDGeneretor;

},{}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/index.js":[function(require,module,exports){
'use strict';

var DimensionD = require('./DimensionD');
var HashMap = require('./HashMap');
var HashSet = require('./HashSet');
var IGeometry = require('./IGeometry');
var IMath = require('./IMath');
var Integer = require('./Integer');
var Point = require('./Point');
var PointD = require('./PointD');
var RandomSeed = require('./RandomSeed');
var RectangleD = require('./RectangleD');
var Transform = require('./Transform');
var UniqueIDGeneretor = require('./UniqueIDGeneretor');
var LGraphObject = require('./LGraphObject');
var LGraph = require('./LGraph');
var LEdge = require('./LEdge');
var LGraphManager = require('./LGraphManager');
var LNode = require('./LNode');
var Layout = require('./Layout');
var LayoutConstants = require('./LayoutConstants');
var FDLayout = require('./FDLayout');
var FDLayoutConstants = require('./FDLayoutConstants');
var FDLayoutEdge = require('./FDLayoutEdge');
var FDLayoutNode = require('./FDLayoutNode');
var CoSEConstants = require('./CoSEConstants');
var CoSEEdge = require('./CoSEEdge');
var CoSEGraph = require('./CoSEGraph');
var CoSEGraphManager = require('./CoSEGraphManager');
var CoSELayout = require('./CoSELayout');
var CoSENode = require('./CoSENode');

_CoSELayout.idToLNode = {};
_CoSELayout.toBeTiled = {};

var defaults = {
  // Called on `layoutready`
  ready: function () {
  },
  // Called on `layoutstop`
  stop: function () {
  },
  // Whether to fit the network view after when done
  fit: true,
  // Padding on fit
  padding: 10,
  // Whether to enable incremental mode
  randomize: true,
  // Node repulsion (non overlapping) multiplier
  nodeRepulsion: 4500,
  // Ideal edge (non nested) length
  idealEdgeLength: 50,
  // Divisor to compute edge forces
  edgeElasticity: 0.45,
  // Nesting factor (multiplier) to compute ideal edge length for nested edges
  nestingFactor: 0.1,
  // Gravity force (constant)
  gravity: 0.25,
  // Maximum number of iterations to perform
  numIter: 2500,
  // For enabling tiling
  tile: true,
  // Type of layout animation. The option set is {'during', 'end', false}
  animate: 'end',
  // Represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
  tilingPaddingVertical: 10,
  // Represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
  tilingPaddingHorizontal: 10,
  // Gravity range (constant) for compounds
  gravityRangeCompound: 1.5,
  // Gravity force (constant) for compounds
  gravityCompound: 1.0,
  // Gravity range (constant)
  gravityRange: 3.8
};

function extend(defaults, options) {
  var obj = {};

  for (var i in defaults) {
    obj[i] = defaults[i];
  }

  for (var i in options) {
    obj[i] = options[i];
  }

  return obj;
}
;

_CoSELayout.layout = new CoSELayout();
function _CoSELayout(options) {

  this.options = extend(defaults, options);
  _CoSELayout.getUserOptions(this.options);
}

_CoSELayout.getUserOptions = function (options) {
  if (options.nodeRepulsion != null)
    CoSEConstants.DEFAULT_REPULSION_STRENGTH = FDLayoutConstants.DEFAULT_REPULSION_STRENGTH = options.nodeRepulsion;
  if (options.idealEdgeLength != null)
    CoSEConstants.DEFAULT_EDGE_LENGTH = FDLayoutConstants.DEFAULT_EDGE_LENGTH = options.idealEdgeLength;
  if (options.edgeElasticity != null)
    CoSEConstants.DEFAULT_SPRING_STRENGTH = FDLayoutConstants.DEFAULT_SPRING_STRENGTH = options.edgeElasticity;
  if (options.nestingFactor != null)
    CoSEConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = options.nestingFactor;
  if (options.gravity != null)
    CoSEConstants.DEFAULT_GRAVITY_STRENGTH = FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH = options.gravity;
  if (options.numIter != null)
    CoSEConstants.MAX_ITERATIONS = FDLayoutConstants.MAX_ITERATIONS = options.numIter;
  if (options.gravityRange != null)
    CoSEConstants.DEFAULT_GRAVITY_RANGE_FACTOR = FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR = options.gravityRange;
  if(options.gravityCompound != null)
    CoSEConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = options.gravityCompound;
  if(options.gravityRangeCompound != null)
    CoSEConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = options.gravityRangeCompound;

  CoSEConstants.DEFAULT_INCREMENTAL = FDLayoutConstants.DEFAULT_INCREMENTAL = LayoutConstants.DEFAULT_INCREMENTAL =
          !(options.randomize);
  CoSEConstants.ANIMATE = FDLayoutConstants.ANIMATE = options.animate;
};

_CoSELayout.prototype.run = function () {
  var layout = this;

  _CoSELayout.idToLNode = {};
  _CoSELayout.toBeTiled = {};
  _CoSELayout.layout = new CoSELayout();
  this.cy = this.options.cy;
  var after = this;

  this.cy.trigger('layoutstart');

  var gm = _CoSELayout.layout.newGraphManager();
  this.gm = gm;

  var nodes = this.options.eles.nodes();
  var edges = this.options.eles.edges();

  this.root = gm.addRoot();

  if (!this.options.tile) {
    this.processChildrenList(this.root, _CoSELayout.getTopMostNodes(nodes));
  }
  else {
    // Find zero degree nodes and create a compound for each level
    var memberGroups = this.groupZeroDegreeMembers();
    // Tile and clear children of each compound
    var tiledMemberPack = this.clearCompounds(this.options);
    // Separately tile and clear zero degree nodes for each level
    var tiledZeroDegreeNodes = this.clearZeroDegreeMembers(memberGroups);
  }


  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
    var sourceNode = _CoSELayout.idToLNode[edge.data("source")];
    var targetNode = _CoSELayout.idToLNode[edge.data("target")];
    var e1 = gm.add(_CoSELayout.layout.newEdge(), sourceNode, targetNode);
    e1.id = edge.id();
  }

  var nodes = this.options.eles.nodes();
  var edges = this.options.eles.edges();

  // First I need to create the data structure to pass to the worker
  var pData = {
    'nodes': [],
    'edges': []
  };

  //Map the ids of nodes in the list to check if a node is in the list in constant time
  var nodeIdMap = {};

  //Fill the map in linear time
  for(var i = 0; i < nodes.length; i++){
    nodeIdMap[nodes[i].id()] = true;
  }

  var lnodes = gm.getAllNodes();
  for (var i = 0; i < lnodes.length; i++) {
    var lnode = lnodes[i];
    var nodeId = lnode.id;
    var cyNode = this.options.cy.getElementById(nodeId);

    var parentId = cyNode.data('parent');
    parentId = nodeIdMap[parentId]?parentId:undefined;

    var w = lnode.rect.width;
    var posX = lnode.rect.x;
    var posY = lnode.rect.y;
    var h = lnode.rect.height;
    var dummy_parent_id = null;
    if(cyNode.scratch('coseBilkent') && cyNode.scratch('coseBilkent').dummy_parent_id)
      dummy_parent_id = cyNode.scratch('coseBilkent').dummy_parent_id;

    pData[ 'nodes' ].push({
      id: nodeId,
      pid: parentId,
      x: posX,
      y: posY,
      width: w,
      height: h,
      dummy_parent_id: dummy_parent_id
    });

  }

  var ledges = gm.getAllEdges();
  for (var i = 0; i < ledges.length; i++) {
    var ledge = ledges[i];
    var edgeId = ledge.id;
    var cyEdge = this.options.cy.getElementById(edgeId);
    var srcNodeId = cyEdge.source().id();
    var tgtNodeId = cyEdge.target().id();
    pData[ 'edges' ].push({
      id: edgeId,
      source: srcNodeId,
      target: tgtNodeId
    });
  }

  var ready = false;

  var logListeners = [];

  var log = function (msg) {
    logListeners.forEach(function( l ){
      l({ type: 'message', log: msg });
    });
  };

  var onLog = function( cb ){
    logListeners.push( cb );
  };

  var run = (function (pData) {
    // the layout will be run and the results are to be returned with the result map
    var layout_t = new CoSELayout();
    var gm_t = layout_t.newGraphManager();
    var ngraph = gm_t.layout.newGraph();
    var nnode = gm_t.layout.newNode(null);
    var root = gm_t.add(ngraph, nnode);
    root.graphManager = gm_t;
    gm_t.setRootGraph(root);
    var root_t = gm_t.rootGraph;

    //maps for inner usage
    var orphans_t = [];
    var idToLNode_t = {};
    var childrenMap = {};

    //A map of node id to corresponding node position and sizes
    //it is to be returned at the end of the function
    var result = {};

    //it is to process the nodes in correct order recursively
    var processNodes = function (parent, children) {
      var size = children.length;
      for (var i = 0; i < size; i++) {
        var theChild = children[i];
        var children_of_children = childrenMap[theChild.id];
        var theNode;

        if (theChild.width != null
                && theChild.height != null) {
          theNode = parent.add(new CoSENode(gm_t,
                  new PointD(theChild.x, theChild.y),
                  new DimensionD(parseFloat(theChild.width),
                          parseFloat(theChild.height))));
        }
        else {
          theNode = parent.add(new CoSENode(gm_t));
        }
        theNode.id = theChild.id;
        idToLNode_t[theChild.id] = theNode;

        if (isNaN(theNode.rect.x)) {
          theNode.rect.x = 0;
        }

        if (isNaN(theNode.rect.y)) {
          theNode.rect.y = 0;
        }

        if (children_of_children != null && children_of_children.length > 0) {
          var theNewGraph;
          theNewGraph = layout_t.getGraphManager().add(layout_t.newGraph(), theNode);
          theNewGraph.graphManager = gm_t;
          processNodes(theNewGraph, children_of_children);
        }
      }
    }

    //fill the chidrenMap and orphans_t maps to process the nodes in the correct order
    var nodes = pData.nodes;
    for (var i = 0; i < nodes.length; i++) {
      var theNode = nodes[i];
      var p_id = theNode.pid;
      if (p_id != null) {
        if (childrenMap[p_id] == null) {
          childrenMap[p_id] = [];
        }
        childrenMap[p_id].push(theNode);
      }
      else {
        orphans_t.push(theNode);
      }
    }

    processNodes(root_t, orphans_t);

    //handle the edges
    var edges = pData.edges;
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var sourceNode = idToLNode_t[edge.source];
      var targetNode = idToLNode_t[edge.target];
      var e1 = gm_t.add(layout_t.newEdge(), sourceNode, targetNode);
    }

    //run the layout
    layout_t.runLayout();

    //fill the result map
    for (var id in idToLNode_t) {
      var lNode = idToLNode_t[id];
      var rect = lNode.rect;
      result[id] = {
        id: id,
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height
      };
    }
    var seeds = {};
    seeds.rsSeed = RandomSeed.seed;
    seeds.rsX = RandomSeed.x;

    var pass = {
      result: result,
      seeds: seeds
    };

    //return the result map to pass it to the then function as parameter
    return pass;
  });

  var done = (function (pass) {
    var result = pass.result;
    var seeds = pass.seeds;
    RandomSeed.seed = seeds.rsSeed;
    RandomSeed.x = seeds.rsX;
    //refresh the lnode positions and sizes by using result map
    for (var id in result) {
      var lNode = _CoSELayout.idToLNode[id];
      var node = result[id];
      lNode.rect.x = node.x;
      lNode.rect.y = node.y;
      lNode.rect.width = node.w;
      lNode.rect.height = node.h;
    }
    if (after.options.tile) {
      // Repopulate members
      after.repopulateZeroDegreeMembers(tiledZeroDegreeNodes);
      after.repopulateCompounds(tiledMemberPack);
      after.options.eles.nodes().updateCompoundBounds();
    }

    var getPositions = function(i ,ele){
      var theId = ele.data('id');
      var lNode = _CoSELayout.idToLNode[theId];

      return {
        x: lNode.getRect().getCenterX(),
        y: lNode.getRect().getCenterY()
      };
    };

    if(after.options.animate !== 'during'){
      after.options.eles.nodes().layoutPositions(after, after.options, getPositions);
    }
    else {
      after.options.eles.nodes().positions(getPositions);

      if (after.options.fit)
        after.options.cy.fit(after.options.eles.nodes(), after.options.padding);

      //trigger layoutready when each node has had its position set at least once
      if (!ready) {
        after.cy.one('layoutready', after.options.ready);
        after.cy.trigger('layoutready');
      }

      // trigger layoutstop when the layout stops (e.g. finishes)
      after.cy.one('layoutstop', after.options.stop);
      after.cy.trigger('layoutstop');
    }

    after.options.eles.nodes().removeScratch('coseBilkent');
  });

  onLog(function (e) {
    var logMsg = e.message.log;
    if (logMsg != null) {
      console.log('Log: ' + logMsg);
      return;
    }
    var pData = e.message.pData;
    if (pData != null) {
      after.options.eles.nodes().positions(function (i, ele) {
        if (ele.scratch('coseBilkent') && ele.scratch('coseBilkent').dummy_parent_id) {
          var dummyParent = ele.scratch('coseBilkent').dummy_parent_id;
          return {
            x: dummyParent.x,
            y: dummyParent.y
          };
        }
        var theId = ele.data('id');
        var pNode = pData[theId];
        var temp = this;
        while (pNode == null) {
          temp = temp.parent()[0];
          pNode = pData[temp.id()];
          pData[theId] = pNode;
        }
        return {
          x: pNode.x,
          y: pNode.y
        };
      });

      if (after.options.fit)
        after.options.cy.fit(after.options.eles.nodes(), after.options.padding);

      if (!ready) {
        ready = true;
        after.one('layoutready', after.options.ready);
        after.trigger({type: 'layoutready', layout: after});
      }
      return;
    }
  });

  done( run( pData ) );

  return this; // chaining
};

//Get the top most ones of a list of nodes
_CoSELayout.getTopMostNodes = function(nodes) {
  var nodesMap = {};
  for (var i = 0; i < nodes.length; i++) {
      nodesMap[nodes[i].id()] = true;
  }
  var roots = nodes.filter(function (i, ele) {
      var parent = ele.parent()[0];
      while(parent != null){
        if(nodesMap[parent.id()]){
          return false;
        }
        parent = parent.parent()[0];
      }
      return true;
  });

  return roots;
};

_CoSELayout.prototype.getToBeTiled = function (node) {
  var id = node.data("id");
  //firstly check the previous results
  if (_CoSELayout.toBeTiled[id] != null) {
    return _CoSELayout.toBeTiled[id];
  }

  //only compound nodes are to be tiled
  var children = node.children();
  if (children == null || children.length == 0) {
    _CoSELayout.toBeTiled[id] = false;
    return false;
  }

  //a compound node is not to be tiled if all of its compound children are not to be tiled
  for (var i = 0; i < children.length; i++) {
    var theChild = children[i];

    if (this.getNodeDegree(theChild) > 0) {
      _CoSELayout.toBeTiled[id] = false;
      return false;
    }

    //pass the children not having the compound structure
    if (theChild.children() == null || theChild.children().length == 0) {
      _CoSELayout.toBeTiled[theChild.data("id")] = false;
      continue;
    }

    if (!this.getToBeTiled(theChild)) {
      _CoSELayout.toBeTiled[id] = false;
      return false;
    }
  }
  _CoSELayout.toBeTiled[id] = true;
  return true;
};

_CoSELayout.prototype.getNodeDegree = function (node) {
  var id = node.id();
  var edges = this.options.eles.edges().filter(function (i, ele) {
    var source = ele.data('source');
    var target = ele.data('target');
    if (source != target && (source == id || target == id)) {
      return true;
    }
  });
  return edges.length;
};

_CoSELayout.prototype.getNodeDegreeWithChildren = function (node) {
  var degree = this.getNodeDegree(node);
  var children = node.children();
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    degree += this.getNodeDegreeWithChildren(child);
  }
  return degree;
};

_CoSELayout.prototype.groupZeroDegreeMembers = function () {
  // array of [parent_id x oneDegreeNode_id]
  var tempMemberGroups = [];
  var memberGroups = [];
  var self = this;
  var parentMap = {};

  for(var i = 0; i < this.options.eles.nodes().length; i++){
    parentMap[this.options.eles.nodes()[i].id()] = true;
  }

  // Find all zero degree nodes which aren't covered by a compound
  var zeroDegree = this.options.eles.nodes().filter(function (i, ele) {
    var pid = ele.data('parent');
    if(pid != undefined && !parentMap[pid]){
      pid = undefined;
    }

    if (self.getNodeDegreeWithChildren(ele) == 0 && (pid == undefined || (pid != undefined && !self.getToBeTiled(ele.parent()[0]))))
      return true;
    else
      return false;
  });

  // Create a map of parent node and its zero degree members
  for (var i = 0; i < zeroDegree.length; i++)
  {
    var node = zeroDegree[i];
    var p_id = node.parent().id();

    if(p_id != undefined && !parentMap[p_id]){
      p_id = undefined;
    }

    if (typeof tempMemberGroups[p_id] === "undefined")
      tempMemberGroups[p_id] = [];

    tempMemberGroups[p_id] = tempMemberGroups[p_id].concat(node);
  }

  // If there are at least two nodes at a level, create a dummy compound for them
  for (var p_id in tempMemberGroups) {
    if (tempMemberGroups[p_id].length > 1) {
      var dummyCompoundId = "DummyCompound_" + p_id;
      memberGroups[dummyCompoundId] = tempMemberGroups[p_id];

      // Create a dummy compound
      if (this.options.cy.getElementById(dummyCompoundId).empty()) {
        this.options.cy.add({
          group: "nodes",
          data: {id: dummyCompoundId, parent: p_id
          }
        });

        var dummy = this.options.cy.nodes()[this.options.cy.nodes().length - 1];
        this.options.eles = this.options.eles.union(dummy);
        dummy.hide();

        for (var i = 0; i < tempMemberGroups[p_id].length; i++) {
          if (i == 0) {
            dummy.scratch('coseBilkent', {tempchildren: []});
          }
          var node = tempMemberGroups[p_id][i];
          var scratchObj = node.scratch('coseBilkent');
          if(!scratchObj) {
              scratchObj = {};
              node.scratch('coseBilkent', scratchObj);
          }
          scratchObj['dummy_parent_id'] = dummyCompoundId;
          this.options.cy.add({
            group: "nodes",
            data: {parent: dummyCompoundId, width: node.width(), height: node.height()
            }
          });
          var tempchild = this.options.cy.nodes()[this.options.cy.nodes().length - 1];
          tempchild.hide();
          tempchild.css('width', tempchild.data('width'));
          tempchild.css('height', tempchild.data('height'));
          tempchild.width();
          dummy.scratch('coseBilkent').tempchildren.push(tempchild);
        }
      }
    }
  }

  return memberGroups;
};

_CoSELayout.prototype.performDFSOnCompounds = function (options) {
  var compoundOrder = [];

  var roots = _CoSELayout.getTopMostNodes(this.options.eles.nodes());
  this.fillCompexOrderByDFS(compoundOrder, roots);

  return compoundOrder;
};

_CoSELayout.prototype.fillCompexOrderByDFS = function (compoundOrder, children) {
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    this.fillCompexOrderByDFS(compoundOrder, child.children());
    if (this.getToBeTiled(child)) {
      compoundOrder.push(child);
    }
  }
};

_CoSELayout.prototype.clearCompounds = function (options) {
  var childGraphMap = [];

  // Get compound ordering by finding the inner one first
  var compoundOrder = this.performDFSOnCompounds(options);
  _CoSELayout.compoundOrder = compoundOrder;
  this.processChildrenList(this.root, _CoSELayout.getTopMostNodes(this.options.eles.nodes()));

  for (var i = 0; i < compoundOrder.length; i++) {
    // find the corresponding layout node
    var lCompoundNode = _CoSELayout.idToLNode[compoundOrder[i].id()];

    childGraphMap[compoundOrder[i].id()] = compoundOrder[i].children();

    // Remove children of compounds
    lCompoundNode.child = null;
  }

  // Tile the removed children
  var tiledMemberPack = this.tileCompoundMembers(childGraphMap);

  return tiledMemberPack;
};

_CoSELayout.prototype.clearZeroDegreeMembers = function (memberGroups) {
  var tiledZeroDegreePack = [];

  for (var id in memberGroups) {
    var compoundNode = _CoSELayout.idToLNode[id];

    tiledZeroDegreePack[id] = this.tileNodes(memberGroups[id]);

    // Set the width and height of the dummy compound as calculated
    compoundNode.rect.width = tiledZeroDegreePack[id].width;
    compoundNode.rect.height = tiledZeroDegreePack[id].height;
  }
  return tiledZeroDegreePack;
};

_CoSELayout.prototype.repopulateCompounds = function (tiledMemberPack) {
  for (var i = _CoSELayout.compoundOrder.length - 1; i >= 0; i--) {
    var id = _CoSELayout.compoundOrder[i].id();
    var lCompoundNode = _CoSELayout.idToLNode[id];
    var horizontalMargin = parseInt(_CoSELayout.compoundOrder[i].css('padding-left'));
    var verticalMargin = parseInt(_CoSELayout.compoundOrder[i].css('padding-top'));

    this.adjustLocations(tiledMemberPack[id], lCompoundNode.rect.x, lCompoundNode.rect.y, horizontalMargin, verticalMargin);
  }
};

_CoSELayout.prototype.repopulateZeroDegreeMembers = function (tiledPack) {
  for (var i in tiledPack) {
    var compound = this.cy.getElementById(i);
    var compoundNode = _CoSELayout.idToLNode[i];
    var horizontalMargin = parseInt(compound.css('padding-left'));
    var verticalMargin = parseInt(compound.css('padding-top'));

    // Adjust the positions of nodes wrt its compound
    this.adjustLocations(tiledPack[i], compoundNode.rect.x, compoundNode.rect.y, horizontalMargin, verticalMargin);

    var tempchildren = compound.scratch('coseBilkent').tempchildren;
    for (var i = 0; i < tempchildren.length; i++) {
      tempchildren[i].remove();
    }

    // Remove the dummy compound
    compound.remove();
  }
};

/**
 * This method places each zero degree member wrt given (x,y) coordinates (top left).
 */
_CoSELayout.prototype.adjustLocations = function (organization, x, y, compoundHorizontalMargin, compoundVerticalMargin) {
  x += compoundHorizontalMargin;
  y += compoundVerticalMargin;

  var left = x;

  for (var i = 0; i < organization.rows.length; i++) {
    var row = organization.rows[i];
    x = left;
    var maxHeight = 0;

    for (var j = 0; j < row.length; j++) {
      var lnode = row[j];
      var node = this.cy.getElementById(lnode.id);

      lnode.rect.x = x;// + lnode.rect.width / 2;
      lnode.rect.y = y;// + lnode.rect.height / 2;

      x += lnode.rect.width + organization.horizontalPadding;

      if (lnode.rect.height > maxHeight)
        maxHeight = lnode.rect.height;
    }

    y += maxHeight + organization.verticalPadding;
  }
};

_CoSELayout.prototype.tileCompoundMembers = function (childGraphMap) {
  var tiledMemberPack = [];

  for (var id in childGraphMap) {
    // Access layoutInfo nodes to set the width and height of compounds
    var compoundNode = _CoSELayout.idToLNode[id];

    tiledMemberPack[id] = this.tileNodes(childGraphMap[id]);

    compoundNode.rect.width = tiledMemberPack[id].width + 20;
    compoundNode.rect.height = tiledMemberPack[id].height + 20;
  }

  return tiledMemberPack;
};

_CoSELayout.prototype.tileNodes = function (nodes) {
  var self = this;
  var verticalPadding = typeof self.options.tilingPaddingVertical === 'function' ? self.options.tilingPaddingVertical.call() : self.options.tilingPaddingVertical;
  var horizontalPadding = typeof self.options.tilingPaddingHorizontal === 'function' ? self.options.tilingPaddingHorizontal.call() : self.options.tilingPaddingHorizontal;
  var organization = {
    rows: [],
    rowWidth: [],
    rowHeight: [],
    width: 20,
    height: 20,
    verticalPadding: verticalPadding,
    horizontalPadding: horizontalPadding
  };

  var layoutNodes = [];

  // Get layout nodes
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var lNode = _CoSELayout.idToLNode[node.id()];

    if (!node.scratch('coseBilkent')  || !node.scratch('coseBilkent').dummy_parent_id) {
      var owner = lNode.owner;
      owner.remove(lNode);

      this.gm.resetAllNodes();
      this.gm.getAllNodes();
    }

    layoutNodes.push(lNode);
  }

  // Sort the nodes in ascending order of their areas
  layoutNodes.sort(function (n1, n2) {
    if (n1.rect.width * n1.rect.height > n2.rect.width * n2.rect.height)
      return -1;
    if (n1.rect.width * n1.rect.height < n2.rect.width * n2.rect.height)
      return 1;
    return 0;
  });

  // Create the organization -> tile members
  for (var i = 0; i < layoutNodes.length; i++) {
    var lNode = layoutNodes[i];

    var cyNode = this.cy.getElementById(lNode.id).parent()[0];
    var minWidth = 0;
    if(cyNode){
      minWidth = parseInt(cyNode.css('padding-left')) + parseInt(cyNode.css('padding-right'));
    }

    if (organization.rows.length == 0) {
      this.insertNodeToRow(organization, lNode, 0, minWidth);
    }
    else if (this.canAddHorizontal(organization, lNode.rect.width, lNode.rect.height)) {
      this.insertNodeToRow(organization, lNode, this.getShortestRowIndex(organization), minWidth);
    }
    else {
      this.insertNodeToRow(organization, lNode, organization.rows.length, minWidth);
    }

    this.shiftToLastRow(organization);
  }

  return organization;
};

_CoSELayout.prototype.insertNodeToRow = function (organization, node, rowIndex, minWidth) {
  var minCompoundSize = minWidth;

  // Add new row if needed
  if (rowIndex == organization.rows.length) {
    var secondDimension = [];

    organization.rows.push(secondDimension);
    organization.rowWidth.push(minCompoundSize);
    organization.rowHeight.push(0);
  }

  // Update row width
  var w = organization.rowWidth[rowIndex] + node.rect.width;

  if (organization.rows[rowIndex].length > 0) {
    w += organization.horizontalPadding;
  }

  organization.rowWidth[rowIndex] = w;
  // Update compound width
  if (organization.width < w) {
    organization.width = w;
  }

  // Update height
  var h = node.rect.height;
  if (rowIndex > 0)
    h += organization.verticalPadding;

  var extraHeight = 0;
  if (h > organization.rowHeight[rowIndex]) {
    extraHeight = organization.rowHeight[rowIndex];
    organization.rowHeight[rowIndex] = h;
    extraHeight = organization.rowHeight[rowIndex] - extraHeight;
  }

  organization.height += extraHeight;

  // Insert node
  organization.rows[rowIndex].push(node);
};

//Scans the rows of an organization and returns the one with the min width
_CoSELayout.prototype.getShortestRowIndex = function (organization) {
  var r = -1;
  var min = Number.MAX_VALUE;

  for (var i = 0; i < organization.rows.length; i++) {
    if (organization.rowWidth[i] < min) {
      r = i;
      min = organization.rowWidth[i];
    }
  }
  return r;
};

//Scans the rows of an organization and returns the one with the max width
_CoSELayout.prototype.getLongestRowIndex = function (organization) {
  var r = -1;
  var max = Number.MIN_VALUE;

  for (var i = 0; i < organization.rows.length; i++) {

    if (organization.rowWidth[i] > max) {
      r = i;
      max = organization.rowWidth[i];
    }
  }

  return r;
};

/**
 * This method checks whether adding extra width to the organization violates
 * the aspect ratio(1) or not.
 */
_CoSELayout.prototype.canAddHorizontal = function (organization, extraWidth, extraHeight) {

  var sri = this.getShortestRowIndex(organization);

  if (sri < 0) {
    return true;
  }

  var min = organization.rowWidth[sri];

  if (min + organization.horizontalPadding + extraWidth <= organization.width)
    return true;

  var hDiff = 0;

  // Adding to an existing row
  if (organization.rowHeight[sri] < extraHeight) {
    if (sri > 0)
      hDiff = extraHeight + organization.verticalPadding - organization.rowHeight[sri];
  }

  var add_to_row_ratio;
  if (organization.width - min >= extraWidth + organization.horizontalPadding) {
    add_to_row_ratio = (organization.height + hDiff) / (min + extraWidth + organization.horizontalPadding);
  } else {
    add_to_row_ratio = (organization.height + hDiff) / organization.width;
  }

  // Adding a new row for this node
  hDiff = extraHeight + organization.verticalPadding;
  var add_new_row_ratio;
  if (organization.width < extraWidth) {
    add_new_row_ratio = (organization.height + hDiff) / extraWidth;
  } else {
    add_new_row_ratio = (organization.height + hDiff) / organization.width;
  }

  if (add_new_row_ratio < 1)
    add_new_row_ratio = 1 / add_new_row_ratio;

  if (add_to_row_ratio < 1)
    add_to_row_ratio = 1 / add_to_row_ratio;

  return add_to_row_ratio < add_new_row_ratio;
};


//If moving the last node from the longest row and adding it to the last
//row makes the bounding box smaller, do it.
_CoSELayout.prototype.shiftToLastRow = function (organization) {
  var longest = this.getLongestRowIndex(organization);
  var last = organization.rowWidth.length - 1;
  var row = organization.rows[longest];
  var node = row[row.length - 1];

  var diff = node.width + organization.horizontalPadding;

  // Check if there is enough space on the last row
  if (organization.width - organization.rowWidth[last] > diff && longest != last) {
    // Remove the last element of the longest row
    row.splice(-1, 1);

    // Push it to the last row
    organization.rows[last].push(node);

    organization.rowWidth[longest] = organization.rowWidth[longest] - diff;
    organization.rowWidth[last] = organization.rowWidth[last] + diff;
    organization.width = organization.rowWidth[this.getLongestRowIndex(organization)];

    // Update heights of the organization
    var maxHeight = Number.MIN_VALUE;
    for (var i = 0; i < row.length; i++) {
      if (row[i].height > maxHeight)
        maxHeight = row[i].height;
    }
    if (longest > 0)
      maxHeight += organization.verticalPadding;

    var prevTotal = organization.rowHeight[longest] + organization.rowHeight[last];

    organization.rowHeight[longest] = maxHeight;
    if (organization.rowHeight[last] < node.height + organization.verticalPadding)
      organization.rowHeight[last] = node.height + organization.verticalPadding;

    var finalTotal = organization.rowHeight[longest] + organization.rowHeight[last];
    organization.height += (finalTotal - prevTotal);

    this.shiftToLastRow(organization);
  }
};

/**
 * @brief : called on continuous layouts to stop them before they finish
 */
_CoSELayout.prototype.stop = function () {
  this.stopped = true;

  this.trigger('layoutstop');

  return this; // chaining
};

_CoSELayout.prototype.processChildrenList = function (parent, children) {
  var size = children.length;
  for (var i = 0; i < size; i++) {
    var theChild = children[i];
    this.options.eles.nodes().length;
    var children_of_children = theChild.children();
    var theNode;

    if (theChild.width() != null
            && theChild.height() != null) {
      theNode = parent.add(new CoSENode(_CoSELayout.layout.graphManager,
              new PointD(theChild.position('x'), theChild.position('y')),
              new DimensionD(parseFloat(theChild.width()),
                      parseFloat(theChild.height()))));
    }
    else {
      theNode = parent.add(new CoSENode(this.graphManager));
    }
    theNode.id = theChild.data("id");
    _CoSELayout.idToLNode[theChild.data("id")] = theNode;

    if (isNaN(theNode.rect.x)) {
      theNode.rect.x = 0;
    }

    if (isNaN(theNode.rect.y)) {
      theNode.rect.y = 0;
    }

    if (children_of_children != null && children_of_children.length > 0) {
      var theNewGraph;
      theNewGraph = _CoSELayout.layout.getGraphManager().add(_CoSELayout.layout.newGraph(), theNode);
      this.processChildrenList(theNewGraph, children_of_children);
    }
  }
};

module.exports = function get(cytoscape) {
  return _CoSELayout;
};

},{"./CoSEConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEConstants.js","./CoSEEdge":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEEdge.js","./CoSEGraph":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEGraph.js","./CoSEGraphManager":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSEGraphManager.js","./CoSELayout":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSELayout.js","./CoSENode":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/CoSENode.js","./DimensionD":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/DimensionD.js","./FDLayout":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayout.js","./FDLayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutConstants.js","./FDLayoutEdge":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutEdge.js","./FDLayoutNode":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/FDLayoutNode.js","./HashMap":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/HashMap.js","./HashSet":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/HashSet.js","./IGeometry":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/IGeometry.js","./IMath":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/IMath.js","./Integer":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Integer.js","./LEdge":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LEdge.js","./LGraph":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraph.js","./LGraphManager":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraphManager.js","./LGraphObject":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LGraphObject.js","./LNode":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LNode.js","./Layout":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Layout.js","./LayoutConstants":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/LayoutConstants.js","./Point":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Point.js","./PointD":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/PointD.js","./RandomSeed":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/RandomSeed.js","./RectangleD":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/RectangleD.js","./Transform":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/Transform.js","./UniqueIDGeneretor":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/UniqueIDGeneretor.js"}],"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src":[function(require,module,exports){
'use strict';

// registers the extension on a cytoscape lib ref
var getLayout = require('./Layout');

var register = function( cytoscape ){
  var Layout = getLayout( cytoscape );

  cytoscape('layout', 'cose-bilkent', Layout);
};

if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
  register( cytoscape );
}

module.exports = register;

},{"./Layout":"/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src/Layout/index.js"}]},{},["/Users/max/Documents/workspace/cytoscape.js-cose-bilkent/src"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvTGF5b3V0L0NvU0VDb25zdGFudHMuanMiLCJzcmMvTGF5b3V0L0NvU0VFZGdlLmpzIiwic3JjL0xheW91dC9Db1NFR3JhcGguanMiLCJzcmMvTGF5b3V0L0NvU0VHcmFwaE1hbmFnZXIuanMiLCJzcmMvTGF5b3V0L0NvU0VMYXlvdXQuanMiLCJzcmMvTGF5b3V0L0NvU0VOb2RlLmpzIiwic3JjL0xheW91dC9EaW1lbnNpb25ELmpzIiwic3JjL0xheW91dC9GRExheW91dC5qcyIsInNyYy9MYXlvdXQvRkRMYXlvdXRDb25zdGFudHMuanMiLCJzcmMvTGF5b3V0L0ZETGF5b3V0RWRnZS5qcyIsInNyYy9MYXlvdXQvRkRMYXlvdXROb2RlLmpzIiwic3JjL0xheW91dC9IYXNoTWFwLmpzIiwic3JjL0xheW91dC9IYXNoU2V0LmpzIiwic3JjL0xheW91dC9JR2VvbWV0cnkuanMiLCJzcmMvTGF5b3V0L0lNYXRoLmpzIiwic3JjL0xheW91dC9JbnRlZ2VyLmpzIiwic3JjL0xheW91dC9MRWRnZS5qcyIsInNyYy9MYXlvdXQvTEdyYXBoLmpzIiwic3JjL0xheW91dC9MR3JhcGhNYW5hZ2VyLmpzIiwic3JjL0xheW91dC9MR3JhcGhPYmplY3QuanMiLCJzcmMvTGF5b3V0L0xOb2RlLmpzIiwic3JjL0xheW91dC9MYXlvdXQuanMiLCJzcmMvTGF5b3V0L0xheW91dENvbnN0YW50cy5qcyIsInNyYy9MYXlvdXQvUG9pbnQuanMiLCJzcmMvTGF5b3V0L1BvaW50RC5qcyIsInNyYy9MYXlvdXQvUmFuZG9tU2VlZC5qcyIsInNyYy9MYXlvdXQvUmVjdGFuZ2xlRC5qcyIsInNyYy9MYXlvdXQvVHJhbnNmb3JtLmpzIiwic3JjL0xheW91dC9VbmlxdWVJREdlbmVyZXRvci5qcyIsInNyYy9MYXlvdXQvaW5kZXguanMiLCJzcmMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdGNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xuXG5mdW5jdGlvbiBDb1NFQ29uc3RhbnRzKCkge1xufVxuXG4vL0NvU0VDb25zdGFudHMgaW5oZXJpdHMgc3RhdGljIHByb3BzIGluIEZETGF5b3V0Q29uc3RhbnRzXG5mb3IgKHZhciBwcm9wIGluIEZETGF5b3V0Q29uc3RhbnRzKSB7XG4gIENvU0VDb25zdGFudHNbcHJvcF0gPSBGRExheW91dENvbnN0YW50c1twcm9wXTtcbn1cblxuQ29TRUNvbnN0YW50cy5ERUZBVUxUX1VTRV9NVUxUSV9MRVZFTF9TQ0FMSU5HID0gZmFsc2U7XG5Db1NFQ29uc3RhbnRzLkRFRkFVTFRfUkFESUFMX1NFUEFSQVRJT04gPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIO1xuQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPTkVOVF9TRVBFUkFUSU9OID0gNjA7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29TRUNvbnN0YW50cztcbiIsInZhciBGRExheW91dEVkZ2UgPSByZXF1aXJlKCcuL0ZETGF5b3V0RWRnZScpO1xuXG5mdW5jdGlvbiBDb1NFRWRnZShzb3VyY2UsIHRhcmdldCwgdkVkZ2UpIHtcbiAgRkRMYXlvdXRFZGdlLmNhbGwodGhpcywgc291cmNlLCB0YXJnZXQsIHZFZGdlKTtcbn1cblxuQ29TRUVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGRExheW91dEVkZ2UucHJvdG90eXBlKTtcbmZvciAodmFyIHByb3AgaW4gRkRMYXlvdXRFZGdlKSB7XG4gIENvU0VFZGdlW3Byb3BdID0gRkRMYXlvdXRFZGdlW3Byb3BdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvU0VFZGdlXG4iLCJ2YXIgTEdyYXBoID0gcmVxdWlyZSgnLi9MR3JhcGgnKTtcblxuZnVuY3Rpb24gQ29TRUdyYXBoKHBhcmVudCwgZ3JhcGhNZ3IsIHZHcmFwaCkge1xuICBMR3JhcGguY2FsbCh0aGlzLCBwYXJlbnQsIGdyYXBoTWdyLCB2R3JhcGgpO1xufVxuXG5Db1NFR3JhcGgucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGgucHJvdG90eXBlKTtcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoKSB7XG4gIENvU0VHcmFwaFtwcm9wXSA9IExHcmFwaFtwcm9wXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb1NFR3JhcGg7XG4iLCJ2YXIgTEdyYXBoTWFuYWdlciA9IHJlcXVpcmUoJy4vTEdyYXBoTWFuYWdlcicpO1xuXG5mdW5jdGlvbiBDb1NFR3JhcGhNYW5hZ2VyKGxheW91dCkge1xuICBMR3JhcGhNYW5hZ2VyLmNhbGwodGhpcywgbGF5b3V0KTtcbn1cblxuQ29TRUdyYXBoTWFuYWdlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExHcmFwaE1hbmFnZXIucHJvdG90eXBlKTtcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoTWFuYWdlcikge1xuICBDb1NFR3JhcGhNYW5hZ2VyW3Byb3BdID0gTEdyYXBoTWFuYWdlcltwcm9wXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb1NFR3JhcGhNYW5hZ2VyO1xuIiwidmFyIEZETGF5b3V0ID0gcmVxdWlyZSgnLi9GRExheW91dCcpO1xudmFyIENvU0VHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0NvU0VHcmFwaE1hbmFnZXInKTtcbnZhciBDb1NFR3JhcGggPSByZXF1aXJlKCcuL0NvU0VHcmFwaCcpO1xudmFyIENvU0VOb2RlID0gcmVxdWlyZSgnLi9Db1NFTm9kZScpO1xudmFyIENvU0VFZGdlID0gcmVxdWlyZSgnLi9Db1NFRWRnZScpO1xudmFyIENvU0VDb25zdGFudHMgPSByZXF1aXJlKCcuL0NvU0VDb25zdGFudHMnKTtcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcbnZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xuXG5mdW5jdGlvbiBDb1NFTGF5b3V0KCkge1xuICBGRExheW91dC5jYWxsKHRoaXMpO1xufVxuXG5Db1NFTGF5b3V0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRkRMYXlvdXQucHJvdG90eXBlKTtcblxuZm9yICh2YXIgcHJvcCBpbiBGRExheW91dCkge1xuICBDb1NFTGF5b3V0W3Byb3BdID0gRkRMYXlvdXRbcHJvcF07XG59XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLm5ld0dyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGdtID0gbmV3IENvU0VHcmFwaE1hbmFnZXIodGhpcyk7XG4gIHRoaXMuZ3JhcGhNYW5hZ2VyID0gZ207XG4gIHJldHVybiBnbTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLm5ld0dyYXBoID0gZnVuY3Rpb24gKHZHcmFwaCkge1xuICByZXR1cm4gbmV3IENvU0VHcmFwaChudWxsLCB0aGlzLmdyYXBoTWFuYWdlciwgdkdyYXBoKTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLm5ld05vZGUgPSBmdW5jdGlvbiAodk5vZGUpIHtcbiAgcmV0dXJuIG5ldyBDb1NFTm9kZSh0aGlzLmdyYXBoTWFuYWdlciwgdk5vZGUpO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUubmV3RWRnZSA9IGZ1bmN0aW9uICh2RWRnZSkge1xuICByZXR1cm4gbmV3IENvU0VFZGdlKG51bGwsIG51bGwsIHZFZGdlKTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmluaXRQYXJhbWV0ZXJzID0gZnVuY3Rpb24gKCkge1xuICBGRExheW91dC5wcm90b3R5cGUuaW5pdFBhcmFtZXRlcnMuY2FsbCh0aGlzLCBhcmd1bWVudHMpO1xuICBpZiAoIXRoaXMuaXNTdWJMYXlvdXQpIHtcbiAgICBpZiAoQ29TRUNvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIIDwgMTApXG4gICAge1xuICAgICAgdGhpcy5pZGVhbEVkZ2VMZW5ndGggPSAxMDtcbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIHRoaXMuaWRlYWxFZGdlTGVuZ3RoID0gQ29TRUNvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIO1xuICAgIH1cblxuICAgIHRoaXMudXNlU21hcnRJZGVhbEVkZ2VMZW5ndGhDYWxjdWxhdGlvbiA9XG4gICAgICAgICAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfVVNFX1NNQVJUX0lERUFMX0VER0VfTEVOR1RIX0NBTENVTEFUSU9OO1xuICAgIHRoaXMuc3ByaW5nQ29uc3RhbnQgPVxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEg7XG4gICAgdGhpcy5yZXB1bHNpb25Db25zdGFudCA9XG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX1JFUFVMU0lPTl9TVFJFTkdUSDtcbiAgICB0aGlzLmdyYXZpdHlDb25zdGFudCA9XG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEg7XG4gICAgdGhpcy5jb21wb3VuZEdyYXZpdHlDb25zdGFudCA9XG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEg7XG4gICAgdGhpcy5ncmF2aXR5UmFuZ2VGYWN0b3IgPVxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUjtcbiAgICB0aGlzLmNvbXBvdW5kR3Jhdml0eVJhbmdlRmFjdG9yID1cbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XG4gIH1cbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmxheW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGNyZWF0ZUJlbmRzQXNOZWVkZWQgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DUkVBVEVfQkVORFNfQVNfTkVFREVEO1xuICBpZiAoY3JlYXRlQmVuZHNBc05lZWRlZClcbiAge1xuICAgIHRoaXMuY3JlYXRlQmVuZHBvaW50cygpO1xuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLnJlc2V0QWxsRWRnZXMoKTtcbiAgfVxuXG4gIHRoaXMubGV2ZWwgPSAwO1xuICByZXR1cm4gdGhpcy5jbGFzc2ljTGF5b3V0KCk7XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5jbGFzc2ljTGF5b3V0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNhbGN1bGF0ZU5vZGVzVG9BcHBseUdyYXZpdGF0aW9uVG8oKTtcbiAgdGhpcy5ncmFwaE1hbmFnZXIuY2FsY0xvd2VzdENvbW1vbkFuY2VzdG9ycygpO1xuICB0aGlzLmdyYXBoTWFuYWdlci5jYWxjSW5jbHVzaW9uVHJlZURlcHRocygpO1xuICB0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkuY2FsY0VzdGltYXRlZFNpemUoKTtcbiAgdGhpcy5jYWxjSWRlYWxFZGdlTGVuZ3RocygpO1xuICBpZiAoIXRoaXMuaW5jcmVtZW50YWwpXG4gIHtcbiAgICB2YXIgZm9yZXN0ID0gdGhpcy5nZXRGbGF0Rm9yZXN0KCk7XG5cbiAgICAvLyBUaGUgZ3JhcGggYXNzb2NpYXRlZCB3aXRoIHRoaXMgbGF5b3V0IGlzIGZsYXQgYW5kIGEgZm9yZXN0XG4gICAgaWYgKGZvcmVzdC5sZW5ndGggPiAwKVxuXG4gICAge1xuICAgICAgdGhpcy5wb3NpdGlvbk5vZGVzUmFkaWFsbHkoZm9yZXN0KTtcbiAgICB9XG4gICAgLy8gVGhlIGdyYXBoIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGxheW91dCBpcyBub3QgZmxhdCBvciBhIGZvcmVzdFxuICAgIGVsc2VcbiAgICB7XG4gICAgICB0aGlzLnBvc2l0aW9uTm9kZXNSYW5kb21seSgpO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuaW5pdFNwcmluZ0VtYmVkZGVyKCk7XG4gIHRoaXMucnVuU3ByaW5nRW1iZWRkZXIoKTtcblxuICBjb25zb2xlLmxvZyhcIkNsYXNzaWMgQ29TRSBsYXlvdXQgZmluaXNoZWQgYWZ0ZXIgXCIgK1xuICAgICAgICAgIHRoaXMudG90YWxJdGVyYXRpb25zICsgXCIgaXRlcmF0aW9uc1wiKTtcblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLnJ1blNwcmluZ0VtYmVkZGVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbGFzdEZyYW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIHZhciBpbml0aWFsQW5pbWF0aW9uUGVyaW9kID0gMjU7XG4gIHZhciBhbmltYXRpb25QZXJpb2QgPSBpbml0aWFsQW5pbWF0aW9uUGVyaW9kO1xuICBkb1xuICB7XG4gICAgdGhpcy50b3RhbEl0ZXJhdGlvbnMrKztcblxuICAgIGlmICh0aGlzLnRvdGFsSXRlcmF0aW9ucyAlIEZETGF5b3V0Q29uc3RhbnRzLkNPTlZFUkdFTkNFX0NIRUNLX1BFUklPRCA9PSAwKVxuICAgIHtcbiAgICAgIGlmICh0aGlzLmlzQ29udmVyZ2VkKCkpXG4gICAgICB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmNvb2xpbmdGYWN0b3IgPSB0aGlzLmluaXRpYWxDb29saW5nRmFjdG9yICpcbiAgICAgICAgICAgICAgKCh0aGlzLm1heEl0ZXJhdGlvbnMgLSB0aGlzLnRvdGFsSXRlcmF0aW9ucykgLyB0aGlzLm1heEl0ZXJhdGlvbnMpO1xuICAgICAgYW5pbWF0aW9uUGVyaW9kID0gTWF0aC5jZWlsKGluaXRpYWxBbmltYXRpb25QZXJpb2QgKiBNYXRoLnNxcnQodGhpcy5jb29saW5nRmFjdG9yKSk7XG5cbiAgICB9XG4gICAgdGhpcy50b3RhbERpc3BsYWNlbWVudCA9IDA7XG4gICAgdGhpcy5ncmFwaE1hbmFnZXIudXBkYXRlQm91bmRzKCk7XG4gICAgdGhpcy5jYWxjU3ByaW5nRm9yY2VzKCk7XG4gICAgdGhpcy5jYWxjUmVwdWxzaW9uRm9yY2VzKCk7XG4gICAgdGhpcy5jYWxjR3Jhdml0YXRpb25hbEZvcmNlcygpO1xuICAgIHRoaXMubW92ZU5vZGVzKCk7XG4gICAgdGhpcy5hbmltYXRlKCk7XG4gICAgaWYgKEZETGF5b3V0Q29uc3RhbnRzLkFOSU1BVEUgPT09ICdkdXJpbmcnICYmIHRoaXMudG90YWxJdGVyYXRpb25zICUgYW5pbWF0aW9uUGVyaW9kID09IDApIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMWU3OyBpKyspIHtcbiAgICAgICAgaWYgKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxhc3RGcmFtZSkgPiAyNSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBsYXN0RnJhbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIHZhciBhbGxOb2RlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzKCk7XG4gICAgICB2YXIgcERhdGEgPSB7fTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHJlY3QgPSBhbGxOb2Rlc1tpXS5yZWN0O1xuICAgICAgICB2YXIgaWQgPSBhbGxOb2Rlc1tpXS5pZDtcbiAgICAgICAgcERhdGFbaWRdID0ge1xuICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICB4OiByZWN0LmdldENlbnRlclgoKSxcbiAgICAgICAgICB5OiByZWN0LmdldENlbnRlclkoKSxcbiAgICAgICAgICB3OiByZWN0LndpZHRoLFxuICAgICAgICAgIGg6IHJlY3QuaGVpZ2h0XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBicm9hZGNhc3Qoe3BEYXRhOiBwRGF0YX0pO1xuICAgIH1cbiAgfVxuICB3aGlsZSAodGhpcy50b3RhbEl0ZXJhdGlvbnMgPCB0aGlzLm1heEl0ZXJhdGlvbnMpO1xuXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLnVwZGF0ZUJvdW5kcygpO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuY2FsY3VsYXRlTm9kZXNUb0FwcGx5R3Jhdml0YXRpb25UbyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG5vZGVMaXN0ID0gW107XG4gIHZhciBncmFwaDtcblxuICB2YXIgZ3JhcGhzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0R3JhcGhzKCk7XG4gIHZhciBzaXplID0gZ3JhcGhzLmxlbmd0aDtcbiAgdmFyIGk7XG4gIGZvciAoaSA9IDA7IGkgPCBzaXplOyBpKyspXG4gIHtcbiAgICBncmFwaCA9IGdyYXBoc1tpXTtcblxuICAgIGdyYXBoLnVwZGF0ZUNvbm5lY3RlZCgpO1xuXG4gICAgaWYgKCFncmFwaC5pc0Nvbm5lY3RlZClcbiAgICB7XG4gICAgICBub2RlTGlzdCA9IG5vZGVMaXN0LmNvbmNhdChncmFwaC5nZXROb2RlcygpKTtcbiAgICB9XG4gIH1cblxuICB0aGlzLmdyYXBoTWFuYWdlci5zZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbihub2RlTGlzdCk7XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5jcmVhdGVCZW5kcG9pbnRzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZWRnZXMgPSBbXTtcbiAgZWRnZXMgPSBlZGdlcy5jb25jYXQodGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsRWRnZXMoKSk7XG4gIHZhciB2aXNpdGVkID0gbmV3IEhhc2hTZXQoKTtcbiAgdmFyIGk7XG4gIGZvciAoaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKylcbiAge1xuICAgIHZhciBlZGdlID0gZWRnZXNbaV07XG5cbiAgICBpZiAoIXZpc2l0ZWQuY29udGFpbnMoZWRnZSkpXG4gICAge1xuICAgICAgdmFyIHNvdXJjZSA9IGVkZ2UuZ2V0U291cmNlKCk7XG4gICAgICB2YXIgdGFyZ2V0ID0gZWRnZS5nZXRUYXJnZXQoKTtcblxuICAgICAgaWYgKHNvdXJjZSA9PSB0YXJnZXQpXG4gICAgICB7XG4gICAgICAgIGVkZ2UuZ2V0QmVuZHBvaW50cygpLnB1c2gobmV3IFBvaW50RCgpKTtcbiAgICAgICAgZWRnZS5nZXRCZW5kcG9pbnRzKCkucHVzaChuZXcgUG9pbnREKCkpO1xuICAgICAgICB0aGlzLmNyZWF0ZUR1bW15Tm9kZXNGb3JCZW5kcG9pbnRzKGVkZ2UpO1xuICAgICAgICB2aXNpdGVkLmFkZChlZGdlKTtcbiAgICAgIH1cbiAgICAgIGVsc2VcbiAgICAgIHtcbiAgICAgICAgdmFyIGVkZ2VMaXN0ID0gW107XG5cbiAgICAgICAgZWRnZUxpc3QgPSBlZGdlTGlzdC5jb25jYXQoc291cmNlLmdldEVkZ2VMaXN0VG9Ob2RlKHRhcmdldCkpO1xuICAgICAgICBlZGdlTGlzdCA9IGVkZ2VMaXN0LmNvbmNhdCh0YXJnZXQuZ2V0RWRnZUxpc3RUb05vZGUoc291cmNlKSk7XG5cbiAgICAgICAgaWYgKCF2aXNpdGVkLmNvbnRhaW5zKGVkZ2VMaXN0WzBdKSlcbiAgICAgICAge1xuICAgICAgICAgIGlmIChlZGdlTGlzdC5sZW5ndGggPiAxKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZhciBrO1xuICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IGVkZ2VMaXN0Lmxlbmd0aDsgaysrKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB2YXIgbXVsdGlFZGdlID0gZWRnZUxpc3Rba107XG4gICAgICAgICAgICAgIG11bHRpRWRnZS5nZXRCZW5kcG9pbnRzKCkucHVzaChuZXcgUG9pbnREKCkpO1xuICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUR1bW15Tm9kZXNGb3JCZW5kcG9pbnRzKG11bHRpRWRnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHZpc2l0ZWQuYWRkQWxsKGxpc3QpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHZpc2l0ZWQuc2l6ZSgpID09IGVkZ2VzLmxlbmd0aClcbiAgICB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLnBvc2l0aW9uTm9kZXNSYWRpYWxseSA9IGZ1bmN0aW9uIChmb3Jlc3QpIHtcbiAgLy8gV2UgdGlsZSB0aGUgdHJlZXMgdG8gYSBncmlkIHJvdyBieSByb3c7IGZpcnN0IHRyZWUgc3RhcnRzIGF0ICgwLDApXG4gIHZhciBjdXJyZW50U3RhcnRpbmdQb2ludCA9IG5ldyBQb2ludCgwLCAwKTtcbiAgdmFyIG51bWJlck9mQ29sdW1ucyA9IE1hdGguY2VpbChNYXRoLnNxcnQoZm9yZXN0Lmxlbmd0aCkpO1xuICB2YXIgaGVpZ2h0ID0gMDtcbiAgdmFyIGN1cnJlbnRZID0gMDtcbiAgdmFyIGN1cnJlbnRYID0gMDtcbiAgdmFyIHBvaW50ID0gbmV3IFBvaW50RCgwLCAwKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGZvcmVzdC5sZW5ndGg7IGkrKylcbiAge1xuICAgIGlmIChpICUgbnVtYmVyT2ZDb2x1bW5zID09IDApXG4gICAge1xuICAgICAgLy8gU3RhcnQgb2YgYSBuZXcgcm93LCBtYWtlIHRoZSB4IGNvb3JkaW5hdGUgMCwgaW5jcmVtZW50IHRoZVxuICAgICAgLy8geSBjb29yZGluYXRlIHdpdGggdGhlIG1heCBoZWlnaHQgb2YgdGhlIHByZXZpb3VzIHJvd1xuICAgICAgY3VycmVudFggPSAwO1xuICAgICAgY3VycmVudFkgPSBoZWlnaHQ7XG5cbiAgICAgIGlmIChpICE9IDApXG4gICAgICB7XG4gICAgICAgIGN1cnJlbnRZICs9IENvU0VDb25zdGFudHMuREVGQVVMVF9DT01QT05FTlRfU0VQRVJBVElPTjtcbiAgICAgIH1cblxuICAgICAgaGVpZ2h0ID0gMDtcbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IGZvcmVzdFtpXTtcblxuICAgIC8vIEZpbmQgdGhlIGNlbnRlciBvZiB0aGUgdHJlZVxuICAgIHZhciBjZW50ZXJOb2RlID0gTGF5b3V0LmZpbmRDZW50ZXJPZlRyZWUodHJlZSk7XG5cbiAgICAvLyBTZXQgdGhlIHN0YXJpbmcgcG9pbnQgb2YgdGhlIG5leHQgdHJlZVxuICAgIGN1cnJlbnRTdGFydGluZ1BvaW50LnggPSBjdXJyZW50WDtcbiAgICBjdXJyZW50U3RhcnRpbmdQb2ludC55ID0gY3VycmVudFk7XG5cbiAgICAvLyBEbyBhIHJhZGlhbCBsYXlvdXQgc3RhcnRpbmcgd2l0aCB0aGUgY2VudGVyXG4gICAgcG9pbnQgPVxuICAgICAgICAgICAgQ29TRUxheW91dC5yYWRpYWxMYXlvdXQodHJlZSwgY2VudGVyTm9kZSwgY3VycmVudFN0YXJ0aW5nUG9pbnQpO1xuXG4gICAgaWYgKHBvaW50LnkgPiBoZWlnaHQpXG4gICAge1xuICAgICAgaGVpZ2h0ID0gTWF0aC5mbG9vcihwb2ludC55KTtcbiAgICB9XG5cbiAgICBjdXJyZW50WCA9IE1hdGguZmxvb3IocG9pbnQueCArIENvU0VDb25zdGFudHMuREVGQVVMVF9DT01QT05FTlRfU0VQRVJBVElPTik7XG4gIH1cblxuICB0aGlzLnRyYW5zZm9ybShcbiAgICAgICAgICBuZXcgUG9pbnREKExheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWCAtIHBvaW50LnggLyAyLFxuICAgICAgICAgICAgICAgICAgTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9ZIC0gcG9pbnQueSAvIDIpKTtcbn07XG5cbkNvU0VMYXlvdXQucmFkaWFsTGF5b3V0ID0gZnVuY3Rpb24gKHRyZWUsIGNlbnRlck5vZGUsIHN0YXJ0aW5nUG9pbnQpIHtcbiAgdmFyIHJhZGlhbFNlcCA9IE1hdGgubWF4KHRoaXMubWF4RGlhZ29uYWxJblRyZWUodHJlZSksXG4gICAgICAgICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX1JBRElBTF9TRVBBUkFUSU9OKTtcbiAgQ29TRUxheW91dC5icmFuY2hSYWRpYWxMYXlvdXQoY2VudGVyTm9kZSwgbnVsbCwgMCwgMzU5LCAwLCByYWRpYWxTZXApO1xuICB2YXIgYm91bmRzID0gTEdyYXBoLmNhbGN1bGF0ZUJvdW5kcyh0cmVlKTtcblxuICB2YXIgdHJhbnNmb3JtID0gbmV3IFRyYW5zZm9ybSgpO1xuICB0cmFuc2Zvcm0uc2V0RGV2aWNlT3JnWChib3VuZHMuZ2V0TWluWCgpKTtcbiAgdHJhbnNmb3JtLnNldERldmljZU9yZ1koYm91bmRzLmdldE1pblkoKSk7XG4gIHRyYW5zZm9ybS5zZXRXb3JsZE9yZ1goc3RhcnRpbmdQb2ludC54KTtcbiAgdHJhbnNmb3JtLnNldFdvcmxkT3JnWShzdGFydGluZ1BvaW50LnkpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZS5sZW5ndGg7IGkrKylcbiAge1xuICAgIHZhciBub2RlID0gdHJlZVtpXTtcbiAgICBub2RlLnRyYW5zZm9ybSh0cmFuc2Zvcm0pO1xuICB9XG5cbiAgdmFyIGJvdHRvbVJpZ2h0ID1cbiAgICAgICAgICBuZXcgUG9pbnREKGJvdW5kcy5nZXRNYXhYKCksIGJvdW5kcy5nZXRNYXhZKCkpO1xuXG4gIHJldHVybiB0cmFuc2Zvcm0uaW52ZXJzZVRyYW5zZm9ybVBvaW50KGJvdHRvbVJpZ2h0KTtcbn07XG5cbkNvU0VMYXlvdXQuYnJhbmNoUmFkaWFsTGF5b3V0ID0gZnVuY3Rpb24gKG5vZGUsIHBhcmVudE9mTm9kZSwgc3RhcnRBbmdsZSwgZW5kQW5nbGUsIGRpc3RhbmNlLCByYWRpYWxTZXBhcmF0aW9uKSB7XG4gIC8vIEZpcnN0LCBwb3NpdGlvbiB0aGlzIG5vZGUgYnkgZmluZGluZyBpdHMgYW5nbGUuXG4gIHZhciBoYWxmSW50ZXJ2YWwgPSAoKGVuZEFuZ2xlIC0gc3RhcnRBbmdsZSkgKyAxKSAvIDI7XG5cbiAgaWYgKGhhbGZJbnRlcnZhbCA8IDApXG4gIHtcbiAgICBoYWxmSW50ZXJ2YWwgKz0gMTgwO1xuICB9XG5cbiAgdmFyIG5vZGVBbmdsZSA9IChoYWxmSW50ZXJ2YWwgKyBzdGFydEFuZ2xlKSAlIDM2MDtcbiAgdmFyIHRldGEgPSAobm9kZUFuZ2xlICogSUdlb21ldHJ5LlRXT19QSSkgLyAzNjA7XG5cbiAgLy8gTWFrZSBwb2xhciB0byBqYXZhIGNvcmRpbmF0ZSBjb252ZXJzaW9uLlxuICB2YXIgY29zX3RldGEgPSBNYXRoLmNvcyh0ZXRhKTtcbiAgdmFyIHhfID0gZGlzdGFuY2UgKiBNYXRoLmNvcyh0ZXRhKTtcbiAgdmFyIHlfID0gZGlzdGFuY2UgKiBNYXRoLnNpbih0ZXRhKTtcblxuICBub2RlLnNldENlbnRlcih4XywgeV8pO1xuXG4gIC8vIFRyYXZlcnNlIGFsbCBuZWlnaGJvcnMgb2YgdGhpcyBub2RlIGFuZCByZWN1cnNpdmVseSBjYWxsIHRoaXNcbiAgLy8gZnVuY3Rpb24uXG4gIHZhciBuZWlnaGJvckVkZ2VzID0gW107XG4gIG5laWdoYm9yRWRnZXMgPSBuZWlnaGJvckVkZ2VzLmNvbmNhdChub2RlLmdldEVkZ2VzKCkpO1xuICB2YXIgY2hpbGRDb3VudCA9IG5laWdoYm9yRWRnZXMubGVuZ3RoO1xuXG4gIGlmIChwYXJlbnRPZk5vZGUgIT0gbnVsbClcbiAge1xuICAgIGNoaWxkQ291bnQtLTtcbiAgfVxuXG4gIHZhciBicmFuY2hDb3VudCA9IDA7XG5cbiAgdmFyIGluY0VkZ2VzQ291bnQgPSBuZWlnaGJvckVkZ2VzLmxlbmd0aDtcbiAgdmFyIHN0YXJ0SW5kZXg7XG5cbiAgdmFyIGVkZ2VzID0gbm9kZS5nZXRFZGdlc0JldHdlZW4ocGFyZW50T2ZOb2RlKTtcblxuICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgZWRnZXMsIHBydW5lIHRoZW0gdW50aWwgdGhlcmUgcmVtYWlucyBvbmx5IG9uZVxuICAvLyBlZGdlLlxuICB3aGlsZSAoZWRnZXMubGVuZ3RoID4gMSlcbiAge1xuICAgIC8vbmVpZ2hib3JFZGdlcy5yZW1vdmUoZWRnZXMucmVtb3ZlKDApKTtcbiAgICB2YXIgdGVtcCA9IGVkZ2VzWzBdO1xuICAgIGVkZ2VzLnNwbGljZSgwLCAxKTtcbiAgICB2YXIgaW5kZXggPSBuZWlnaGJvckVkZ2VzLmluZGV4T2YodGVtcCk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgIG5laWdoYm9yRWRnZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gICAgaW5jRWRnZXNDb3VudC0tO1xuICAgIGNoaWxkQ291bnQtLTtcbiAgfVxuXG4gIGlmIChwYXJlbnRPZk5vZGUgIT0gbnVsbClcbiAge1xuICAgIC8vYXNzZXJ0IGVkZ2VzLmxlbmd0aCA9PSAxO1xuICAgIHN0YXJ0SW5kZXggPSAobmVpZ2hib3JFZGdlcy5pbmRleE9mKGVkZ2VzWzBdKSArIDEpICUgaW5jRWRnZXNDb3VudDtcbiAgfVxuICBlbHNlXG4gIHtcbiAgICBzdGFydEluZGV4ID0gMDtcbiAgfVxuXG4gIHZhciBzdGVwQW5nbGUgPSBNYXRoLmFicyhlbmRBbmdsZSAtIHN0YXJ0QW5nbGUpIC8gY2hpbGRDb3VudDtcblxuICBmb3IgKHZhciBpID0gc3RhcnRJbmRleDtcbiAgICAgICAgICBicmFuY2hDb3VudCAhPSBjaGlsZENvdW50O1xuICAgICAgICAgIGkgPSAoKytpKSAlIGluY0VkZ2VzQ291bnQpXG4gIHtcbiAgICB2YXIgY3VycmVudE5laWdoYm9yID1cbiAgICAgICAgICAgIG5laWdoYm9yRWRnZXNbaV0uZ2V0T3RoZXJFbmQobm9kZSk7XG5cbiAgICAvLyBEb24ndCBiYWNrIHRyYXZlcnNlIHRvIHJvb3Qgbm9kZSBpbiBjdXJyZW50IHRyZWUuXG4gICAgaWYgKGN1cnJlbnROZWlnaGJvciA9PSBwYXJlbnRPZk5vZGUpXG4gICAge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFyIGNoaWxkU3RhcnRBbmdsZSA9XG4gICAgICAgICAgICAoc3RhcnRBbmdsZSArIGJyYW5jaENvdW50ICogc3RlcEFuZ2xlKSAlIDM2MDtcbiAgICB2YXIgY2hpbGRFbmRBbmdsZSA9IChjaGlsZFN0YXJ0QW5nbGUgKyBzdGVwQW5nbGUpICUgMzYwO1xuXG4gICAgQ29TRUxheW91dC5icmFuY2hSYWRpYWxMYXlvdXQoY3VycmVudE5laWdoYm9yLFxuICAgICAgICAgICAgbm9kZSxcbiAgICAgICAgICAgIGNoaWxkU3RhcnRBbmdsZSwgY2hpbGRFbmRBbmdsZSxcbiAgICAgICAgICAgIGRpc3RhbmNlICsgcmFkaWFsU2VwYXJhdGlvbiwgcmFkaWFsU2VwYXJhdGlvbik7XG5cbiAgICBicmFuY2hDb3VudCsrO1xuICB9XG59O1xuXG5Db1NFTGF5b3V0Lm1heERpYWdvbmFsSW5UcmVlID0gZnVuY3Rpb24gKHRyZWUpIHtcbiAgdmFyIG1heERpYWdvbmFsID0gSW50ZWdlci5NSU5fVkFMVUU7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmVlLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgdmFyIG5vZGUgPSB0cmVlW2ldO1xuICAgIHZhciBkaWFnb25hbCA9IG5vZGUuZ2V0RGlhZ29uYWwoKTtcblxuICAgIGlmIChkaWFnb25hbCA+IG1heERpYWdvbmFsKVxuICAgIHtcbiAgICAgIG1heERpYWdvbmFsID0gZGlhZ29uYWw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1heERpYWdvbmFsO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuY2FsY1JlcHVsc2lvblJhbmdlID0gZnVuY3Rpb24gKCkge1xuICAvLyBmb3JtdWxhIGlzIDIgeCAobGV2ZWwgKyAxKSB4IGlkZWFsRWRnZUxlbmd0aFxuICByZXR1cm4gKDIgKiAodGhpcy5sZXZlbCArIDEpICogdGhpcy5pZGVhbEVkZ2VMZW5ndGgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb1NFTGF5b3V0O1xuIiwidmFyIEZETGF5b3V0Tm9kZSA9IHJlcXVpcmUoJy4vRkRMYXlvdXROb2RlJyk7XG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XG5cbmZ1bmN0aW9uIENvU0VOb2RlKGdtLCBsb2MsIHNpemUsIHZOb2RlKSB7XG4gIEZETGF5b3V0Tm9kZS5jYWxsKHRoaXMsIGdtLCBsb2MsIHNpemUsIHZOb2RlKTtcbn1cblxuXG5Db1NFTm9kZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZETGF5b3V0Tm9kZS5wcm90b3R5cGUpO1xuZm9yICh2YXIgcHJvcCBpbiBGRExheW91dE5vZGUpIHtcbiAgQ29TRU5vZGVbcHJvcF0gPSBGRExheW91dE5vZGVbcHJvcF07XG59XG5cbkNvU0VOb2RlLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIGxheW91dCA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldExheW91dCgpO1xuICB0aGlzLmRpc3BsYWNlbWVudFggPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqXG4gICAgICAgICAgKHRoaXMuc3ByaW5nRm9yY2VYICsgdGhpcy5yZXB1bHNpb25Gb3JjZVggKyB0aGlzLmdyYXZpdGF0aW9uRm9yY2VYKTtcbiAgdGhpcy5kaXNwbGFjZW1lbnRZID0gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKlxuICAgICAgICAgICh0aGlzLnNwcmluZ0ZvcmNlWSArIHRoaXMucmVwdWxzaW9uRm9yY2VZICsgdGhpcy5ncmF2aXRhdGlvbkZvcmNlWSk7XG5cblxuICBpZiAoTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRYKSA+IGxheW91dC5jb29saW5nRmFjdG9yICogbGF5b3V0Lm1heE5vZGVEaXNwbGFjZW1lbnQpXG4gIHtcbiAgICB0aGlzLmRpc3BsYWNlbWVudFggPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqIGxheW91dC5tYXhOb2RlRGlzcGxhY2VtZW50ICpcbiAgICAgICAgICAgIElNYXRoLnNpZ24odGhpcy5kaXNwbGFjZW1lbnRYKTtcbiAgfVxuXG4gIGlmIChNYXRoLmFicyh0aGlzLmRpc3BsYWNlbWVudFkpID4gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKiBsYXlvdXQubWF4Tm9kZURpc3BsYWNlbWVudClcbiAge1xuICAgIHRoaXMuZGlzcGxhY2VtZW50WSA9IGxheW91dC5jb29saW5nRmFjdG9yICogbGF5b3V0Lm1heE5vZGVEaXNwbGFjZW1lbnQgKlxuICAgICAgICAgICAgSU1hdGguc2lnbih0aGlzLmRpc3BsYWNlbWVudFkpO1xuICB9XG5cbiAgLy8gYSBzaW1wbGUgbm9kZSwganVzdCBtb3ZlIGl0XG4gIGlmICh0aGlzLmNoaWxkID09IG51bGwpXG4gIHtcbiAgICB0aGlzLm1vdmVCeSh0aGlzLmRpc3BsYWNlbWVudFgsIHRoaXMuZGlzcGxhY2VtZW50WSk7XG4gIH1cbiAgLy8gYW4gZW1wdHkgY29tcG91bmQgbm9kZSwgYWdhaW4ganVzdCBtb3ZlIGl0XG4gIGVsc2UgaWYgKHRoaXMuY2hpbGQuZ2V0Tm9kZXMoKS5sZW5ndGggPT0gMClcbiAge1xuICAgIHRoaXMubW92ZUJ5KHRoaXMuZGlzcGxhY2VtZW50WCwgdGhpcy5kaXNwbGFjZW1lbnRZKTtcbiAgfVxuICAvLyBub24tZW1wdHkgY29tcG91bmQgbm9kZSwgcHJvcG9nYXRlIG1vdmVtZW50IHRvIGNoaWxkcmVuIGFzIHdlbGxcbiAgZWxzZVxuICB7XG4gICAgdGhpcy5wcm9wb2dhdGVEaXNwbGFjZW1lbnRUb0NoaWxkcmVuKHRoaXMuZGlzcGxhY2VtZW50WCxcbiAgICAgICAgICAgIHRoaXMuZGlzcGxhY2VtZW50WSk7XG4gIH1cblxuICBsYXlvdXQudG90YWxEaXNwbGFjZW1lbnQgKz1cbiAgICAgICAgICBNYXRoLmFicyh0aGlzLmRpc3BsYWNlbWVudFgpICsgTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRZKTtcblxuICB0aGlzLnNwcmluZ0ZvcmNlWCA9IDA7XG4gIHRoaXMuc3ByaW5nRm9yY2VZID0gMDtcbiAgdGhpcy5yZXB1bHNpb25Gb3JjZVggPSAwO1xuICB0aGlzLnJlcHVsc2lvbkZvcmNlWSA9IDA7XG4gIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVggPSAwO1xuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VZID0gMDtcbiAgdGhpcy5kaXNwbGFjZW1lbnRYID0gMDtcbiAgdGhpcy5kaXNwbGFjZW1lbnRZID0gMDtcbn07XG5cbkNvU0VOb2RlLnByb3RvdHlwZS5wcm9wb2dhdGVEaXNwbGFjZW1lbnRUb0NoaWxkcmVuID0gZnVuY3Rpb24gKGRYLCBkWSlcbntcbiAgdmFyIG5vZGVzID0gdGhpcy5nZXRDaGlsZCgpLmdldE5vZGVzKCk7XG4gIHZhciBub2RlO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgbm9kZSA9IG5vZGVzW2ldO1xuICAgIGlmIChub2RlLmdldENoaWxkKCkgPT0gbnVsbClcbiAgICB7XG4gICAgICBub2RlLm1vdmVCeShkWCwgZFkpO1xuICAgICAgbm9kZS5kaXNwbGFjZW1lbnRYICs9IGRYO1xuICAgICAgbm9kZS5kaXNwbGFjZW1lbnRZICs9IGRZO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgbm9kZS5wcm9wb2dhdGVEaXNwbGFjZW1lbnRUb0NoaWxkcmVuKGRYLCBkWSk7XG4gICAgfVxuICB9XG59O1xuXG5Db1NFTm9kZS5wcm90b3R5cGUuc2V0UHJlZDEgPSBmdW5jdGlvbiAocHJlZDEpXG57XG4gIHRoaXMucHJlZDEgPSBwcmVkMTtcbn07XG5cbkNvU0VOb2RlLnByb3RvdHlwZS5nZXRQcmVkMSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiBwcmVkMTtcbn07XG5cbkNvU0VOb2RlLnByb3RvdHlwZS5nZXRQcmVkMiA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiBwcmVkMjtcbn07XG5cbkNvU0VOb2RlLnByb3RvdHlwZS5zZXROZXh0ID0gZnVuY3Rpb24gKG5leHQpXG57XG4gIHRoaXMubmV4dCA9IG5leHQ7XG59O1xuXG5Db1NFTm9kZS5wcm90b3R5cGUuZ2V0TmV4dCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiBuZXh0O1xufTtcblxuQ29TRU5vZGUucHJvdG90eXBlLnNldFByb2Nlc3NlZCA9IGZ1bmN0aW9uIChwcm9jZXNzZWQpXG57XG4gIHRoaXMucHJvY2Vzc2VkID0gcHJvY2Vzc2VkO1xufTtcblxuQ29TRU5vZGUucHJvdG90eXBlLmlzUHJvY2Vzc2VkID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHByb2Nlc3NlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29TRU5vZGU7XG4iLCJmdW5jdGlvbiBEaW1lbnNpb25EKHdpZHRoLCBoZWlnaHQpIHtcbiAgdGhpcy53aWR0aCA9IDA7XG4gIHRoaXMuaGVpZ2h0ID0gMDtcbiAgaWYgKHdpZHRoICE9PSBudWxsICYmIGhlaWdodCAhPT0gbnVsbCkge1xuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgfVxufVxuXG5EaW1lbnNpb25ELnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLndpZHRoO1xufTtcblxuRGltZW5zaW9uRC5wcm90b3R5cGUuc2V0V2lkdGggPSBmdW5jdGlvbiAod2lkdGgpXG57XG4gIHRoaXMud2lkdGggPSB3aWR0aDtcbn07XG5cbkRpbWVuc2lvbkQucHJvdG90eXBlLmdldEhlaWdodCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmhlaWdodDtcbn07XG5cbkRpbWVuc2lvbkQucHJvdG90eXBlLnNldEhlaWdodCA9IGZ1bmN0aW9uIChoZWlnaHQpXG57XG4gIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEaW1lbnNpb25EO1xuIiwidmFyIExheW91dCA9IHJlcXVpcmUoJy4vTGF5b3V0Jyk7XG52YXIgRkRMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0ZETGF5b3V0Q29uc3RhbnRzJyk7XG52YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcbnZhciBJR2VvbWV0cnkgPSByZXF1aXJlKCcuL0lHZW9tZXRyeScpO1xudmFyIElNYXRoID0gcmVxdWlyZSgnLi9JTWF0aCcpO1xuXG5mdW5jdGlvbiBGRExheW91dCgpIHtcbiAgTGF5b3V0LmNhbGwodGhpcyk7XG5cbiAgdGhpcy51c2VTbWFydElkZWFsRWRnZUxlbmd0aENhbGN1bGF0aW9uID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfSURFQUxfRURHRV9MRU5HVEhfQ0FMQ1VMQVRJT047XG4gIHRoaXMuaWRlYWxFZGdlTGVuZ3RoID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcbiAgdGhpcy5zcHJpbmdDb25zdGFudCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfU1BSSU5HX1NUUkVOR1RIO1xuICB0aGlzLnJlcHVsc2lvbkNvbnN0YW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEg7XG4gIHRoaXMuZ3Jhdml0eUNvbnN0YW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIO1xuICB0aGlzLmNvbXBvdW5kR3Jhdml0eUNvbnN0YW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1NUUkVOR1RIO1xuICB0aGlzLmdyYXZpdHlSYW5nZUZhY3RvciA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XG4gIHRoaXMuY29tcG91bmRHcmF2aXR5UmFuZ2VGYWN0b3IgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfUkFOR0VfRkFDVE9SO1xuICB0aGlzLmRpc3BsYWNlbWVudFRocmVzaG9sZFBlck5vZGUgPSAoMy4wICogRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCkgLyAxMDA7XG4gIHRoaXMuY29vbGluZ0ZhY3RvciA9IDEuMDtcbiAgdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciA9IDEuMDtcbiAgdGhpcy50b3RhbERpc3BsYWNlbWVudCA9IDAuMDtcbiAgdGhpcy5vbGRUb3RhbERpc3BsYWNlbWVudCA9IDAuMDtcbiAgdGhpcy5tYXhJdGVyYXRpb25zID0gRkRMYXlvdXRDb25zdGFudHMuTUFYX0lURVJBVElPTlM7XG59XG5cbkZETGF5b3V0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTGF5b3V0LnByb3RvdHlwZSk7XG5cbmZvciAodmFyIHByb3AgaW4gTGF5b3V0KSB7XG4gIEZETGF5b3V0W3Byb3BdID0gTGF5b3V0W3Byb3BdO1xufVxuXG5GRExheW91dC5wcm90b3R5cGUuaW5pdFBhcmFtZXRlcnMgPSBmdW5jdGlvbiAoKSB7XG4gIExheW91dC5wcm90b3R5cGUuaW5pdFBhcmFtZXRlcnMuY2FsbCh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIGlmICh0aGlzLmxheW91dFF1YWxpdHkgPT0gTGF5b3V0Q29uc3RhbnRzLkRSQUZUX1FVQUxJVFkpXG4gIHtcbiAgICB0aGlzLmRpc3BsYWNlbWVudFRocmVzaG9sZFBlck5vZGUgKz0gMC4zMDtcbiAgICB0aGlzLm1heEl0ZXJhdGlvbnMgKj0gMC44O1xuICB9XG4gIGVsc2UgaWYgKHRoaXMubGF5b3V0UXVhbGl0eSA9PSBMYXlvdXRDb25zdGFudHMuUFJPT0ZfUVVBTElUWSlcbiAge1xuICAgIHRoaXMuZGlzcGxhY2VtZW50VGhyZXNob2xkUGVyTm9kZSAtPSAwLjMwO1xuICAgIHRoaXMubWF4SXRlcmF0aW9ucyAqPSAxLjI7XG4gIH1cblxuICB0aGlzLnRvdGFsSXRlcmF0aW9ucyA9IDA7XG4gIHRoaXMubm90QW5pbWF0ZWRJdGVyYXRpb25zID0gMDtcblxuLy8gICAgdGhpcy51c2VGUkdyaWRWYXJpYW50ID0gbGF5b3V0T3B0aW9uc1BhY2suc21hcnRSZXB1bHNpb25SYW5nZUNhbGM7XG59O1xuXG5GRExheW91dC5wcm90b3R5cGUuY2FsY0lkZWFsRWRnZUxlbmd0aHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBlZGdlO1xuICB2YXIgbGNhRGVwdGg7XG4gIHZhciBzb3VyY2U7XG4gIHZhciB0YXJnZXQ7XG4gIHZhciBzaXplT2ZTb3VyY2VJbkxjYTtcbiAgdmFyIHNpemVPZlRhcmdldEluTGNhO1xuXG4gIHZhciBhbGxFZGdlcyA9IHRoaXMuZ2V0R3JhcGhNYW5hZ2VyKCkuZ2V0QWxsRWRnZXMoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbGxFZGdlcy5sZW5ndGg7IGkrKylcbiAge1xuICAgIGVkZ2UgPSBhbGxFZGdlc1tpXTtcblxuICAgIGVkZ2UuaWRlYWxMZW5ndGggPSB0aGlzLmlkZWFsRWRnZUxlbmd0aDtcblxuICAgIGlmIChlZGdlLmlzSW50ZXJHcmFwaClcbiAgICB7XG4gICAgICBzb3VyY2UgPSBlZGdlLmdldFNvdXJjZSgpO1xuICAgICAgdGFyZ2V0ID0gZWRnZS5nZXRUYXJnZXQoKTtcblxuICAgICAgc2l6ZU9mU291cmNlSW5MY2EgPSBlZGdlLmdldFNvdXJjZUluTGNhKCkuZ2V0RXN0aW1hdGVkU2l6ZSgpO1xuICAgICAgc2l6ZU9mVGFyZ2V0SW5MY2EgPSBlZGdlLmdldFRhcmdldEluTGNhKCkuZ2V0RXN0aW1hdGVkU2l6ZSgpO1xuXG4gICAgICBpZiAodGhpcy51c2VTbWFydElkZWFsRWRnZUxlbmd0aENhbGN1bGF0aW9uKVxuICAgICAge1xuICAgICAgICBlZGdlLmlkZWFsTGVuZ3RoICs9IHNpemVPZlNvdXJjZUluTGNhICsgc2l6ZU9mVGFyZ2V0SW5MY2EgLVxuICAgICAgICAgICAgICAgIDIgKiBMYXlvdXRDb25zdGFudHMuU0lNUExFX05PREVfU0laRTtcbiAgICAgIH1cblxuICAgICAgbGNhRGVwdGggPSBlZGdlLmdldExjYSgpLmdldEluY2x1c2lvblRyZWVEZXB0aCgpO1xuXG4gICAgICBlZGdlLmlkZWFsTGVuZ3RoICs9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggKlxuICAgICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5QRVJfTEVWRUxfSURFQUxfRURHRV9MRU5HVEhfRkFDVE9SICpcbiAgICAgICAgICAgICAgKHNvdXJjZS5nZXRJbmNsdXNpb25UcmVlRGVwdGgoKSArXG4gICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmdldEluY2x1c2lvblRyZWVEZXB0aCgpIC0gMiAqIGxjYURlcHRoKTtcbiAgICB9XG4gIH1cbn07XG5cbkZETGF5b3V0LnByb3RvdHlwZS5pbml0U3ByaW5nRW1iZWRkZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgaWYgKHRoaXMuaW5jcmVtZW50YWwpXG4gIHtcbiAgICB0aGlzLmNvb2xpbmdGYWN0b3IgPSAwLjg7XG4gICAgdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciA9IDAuODtcbiAgICB0aGlzLm1heE5vZGVEaXNwbGFjZW1lbnQgPVxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UX0lOQ1JFTUVOVEFMO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIHRoaXMuY29vbGluZ0ZhY3RvciA9IDEuMDtcbiAgICB0aGlzLmluaXRpYWxDb29saW5nRmFjdG9yID0gMS4wO1xuICAgIHRoaXMubWF4Tm9kZURpc3BsYWNlbWVudCA9XG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5NQVhfTk9ERV9ESVNQTEFDRU1FTlQ7XG4gIH1cblxuICB0aGlzLm1heEl0ZXJhdGlvbnMgPVxuICAgICAgICAgIE1hdGgubWF4KHRoaXMuZ2V0QWxsTm9kZXMoKS5sZW5ndGggKiA1LCB0aGlzLm1heEl0ZXJhdGlvbnMpO1xuXG4gIHRoaXMudG90YWxEaXNwbGFjZW1lbnRUaHJlc2hvbGQgPVxuICAgICAgICAgIHRoaXMuZGlzcGxhY2VtZW50VGhyZXNob2xkUGVyTm9kZSAqIHRoaXMuZ2V0QWxsTm9kZXMoKS5sZW5ndGg7XG5cbiAgdGhpcy5yZXB1bHNpb25SYW5nZSA9IHRoaXMuY2FsY1JlcHVsc2lvblJhbmdlKCk7XG59O1xuXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1NwcmluZ0ZvcmNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGxFZGdlcyA9IHRoaXMuZ2V0QWxsRWRnZXMoKTtcbiAgdmFyIGVkZ2U7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsRWRnZXMubGVuZ3RoOyBpKyspXG4gIHtcbiAgICBlZGdlID0gbEVkZ2VzW2ldO1xuXG4gICAgdGhpcy5jYWxjU3ByaW5nRm9yY2UoZWRnZSwgZWRnZS5pZGVhbExlbmd0aCk7XG4gIH1cbn07XG5cbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjUmVwdWxzaW9uRm9yY2VzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgaSwgajtcbiAgdmFyIG5vZGVBLCBub2RlQjtcbiAgdmFyIGxOb2RlcyA9IHRoaXMuZ2V0QWxsTm9kZXMoKTtcblxuICBmb3IgKGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgbm9kZUEgPSBsTm9kZXNbaV07XG5cbiAgICBmb3IgKGogPSBpICsgMTsgaiA8IGxOb2Rlcy5sZW5ndGg7IGorKylcbiAgICB7XG4gICAgICBub2RlQiA9IGxOb2Rlc1tqXTtcblxuICAgICAgLy8gSWYgYm90aCBub2RlcyBhcmUgbm90IG1lbWJlcnMgb2YgdGhlIHNhbWUgZ3JhcGgsIHNraXAuXG4gICAgICBpZiAobm9kZUEuZ2V0T3duZXIoKSAhPSBub2RlQi5nZXRPd25lcigpKVxuICAgICAge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5jYWxjUmVwdWxzaW9uRm9yY2Uobm9kZUEsIG5vZGVCKTtcbiAgICB9XG4gIH1cbn07XG5cbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjR3Jhdml0YXRpb25hbEZvcmNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG5vZGU7XG4gIHZhciBsTm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uKCk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsTm9kZXMubGVuZ3RoOyBpKyspXG4gIHtcbiAgICBub2RlID0gbE5vZGVzW2ldO1xuICAgIHRoaXMuY2FsY0dyYXZpdGF0aW9uYWxGb3JjZShub2RlKTtcbiAgfVxufTtcblxuRkRMYXlvdXQucHJvdG90eXBlLm1vdmVOb2RlcyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGxOb2RlcyA9IHRoaXMuZ2V0QWxsTm9kZXMoKTtcbiAgdmFyIG5vZGU7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsTm9kZXMubGVuZ3RoOyBpKyspXG4gIHtcbiAgICBub2RlID0gbE5vZGVzW2ldO1xuICAgIG5vZGUubW92ZSgpO1xuICB9XG59XG5cbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjU3ByaW5nRm9yY2UgPSBmdW5jdGlvbiAoZWRnZSwgaWRlYWxMZW5ndGgpIHtcbiAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLmdldFNvdXJjZSgpO1xuICB2YXIgdGFyZ2V0Tm9kZSA9IGVkZ2UuZ2V0VGFyZ2V0KCk7XG5cbiAgdmFyIGxlbmd0aDtcbiAgdmFyIHNwcmluZ0ZvcmNlO1xuICB2YXIgc3ByaW5nRm9yY2VYO1xuICB2YXIgc3ByaW5nRm9yY2VZO1xuXG4gIC8vIFVwZGF0ZSBlZGdlIGxlbmd0aFxuICBpZiAodGhpcy51bmlmb3JtTGVhZk5vZGVTaXplcyAmJlxuICAgICAgICAgIHNvdXJjZU5vZGUuZ2V0Q2hpbGQoKSA9PSBudWxsICYmIHRhcmdldE5vZGUuZ2V0Q2hpbGQoKSA9PSBudWxsKVxuICB7XG4gICAgZWRnZS51cGRhdGVMZW5ndGhTaW1wbGUoKTtcbiAgfVxuICBlbHNlXG4gIHtcbiAgICBlZGdlLnVwZGF0ZUxlbmd0aCgpO1xuXG4gICAgaWYgKGVkZ2UuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0KVxuICAgIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBsZW5ndGggPSBlZGdlLmdldExlbmd0aCgpO1xuXG4gIC8vIENhbGN1bGF0ZSBzcHJpbmcgZm9yY2VzXG4gIHNwcmluZ0ZvcmNlID0gdGhpcy5zcHJpbmdDb25zdGFudCAqIChsZW5ndGggLSBpZGVhbExlbmd0aCk7XG5cbiAgLy8gUHJvamVjdCBmb3JjZSBvbnRvIHggYW5kIHkgYXhlc1xuICBzcHJpbmdGb3JjZVggPSBzcHJpbmdGb3JjZSAqIChlZGdlLmxlbmd0aFggLyBsZW5ndGgpO1xuICBzcHJpbmdGb3JjZVkgPSBzcHJpbmdGb3JjZSAqIChlZGdlLmxlbmd0aFkgLyBsZW5ndGgpO1xuXG4gIC8vIEFwcGx5IGZvcmNlcyBvbiB0aGUgZW5kIG5vZGVzXG4gIHNvdXJjZU5vZGUuc3ByaW5nRm9yY2VYICs9IHNwcmluZ0ZvcmNlWDtcbiAgc291cmNlTm9kZS5zcHJpbmdGb3JjZVkgKz0gc3ByaW5nRm9yY2VZO1xuICB0YXJnZXROb2RlLnNwcmluZ0ZvcmNlWCAtPSBzcHJpbmdGb3JjZVg7XG4gIHRhcmdldE5vZGUuc3ByaW5nRm9yY2VZIC09IHNwcmluZ0ZvcmNlWTtcbn07XG5cbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjUmVwdWxzaW9uRm9yY2UgPSBmdW5jdGlvbiAobm9kZUEsIG5vZGVCKSB7XG4gIHZhciByZWN0QSA9IG5vZGVBLmdldFJlY3QoKTtcbiAgdmFyIHJlY3RCID0gbm9kZUIuZ2V0UmVjdCgpO1xuICB2YXIgb3ZlcmxhcEFtb3VudCA9IG5ldyBBcnJheSgyKTtcbiAgdmFyIGNsaXBQb2ludHMgPSBuZXcgQXJyYXkoNCk7XG4gIHZhciBkaXN0YW5jZVg7XG4gIHZhciBkaXN0YW5jZVk7XG4gIHZhciBkaXN0YW5jZVNxdWFyZWQ7XG4gIHZhciBkaXN0YW5jZTtcbiAgdmFyIHJlcHVsc2lvbkZvcmNlO1xuICB2YXIgcmVwdWxzaW9uRm9yY2VYO1xuICB2YXIgcmVwdWxzaW9uRm9yY2VZO1xuXG4gIGlmIChyZWN0QS5pbnRlcnNlY3RzKHJlY3RCKSkvLyB0d28gbm9kZXMgb3ZlcmxhcFxuICB7XG4gICAgLy8gY2FsY3VsYXRlIHNlcGFyYXRpb24gYW1vdW50IGluIHggYW5kIHkgZGlyZWN0aW9uc1xuICAgIElHZW9tZXRyeS5jYWxjU2VwYXJhdGlvbkFtb3VudChyZWN0QSxcbiAgICAgICAgICAgIHJlY3RCLFxuICAgICAgICAgICAgb3ZlcmxhcEFtb3VudCxcbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggLyAyLjApO1xuXG4gICAgcmVwdWxzaW9uRm9yY2VYID0gb3ZlcmxhcEFtb3VudFswXTtcbiAgICByZXB1bHNpb25Gb3JjZVkgPSBvdmVybGFwQW1vdW50WzFdO1xuICB9XG4gIGVsc2UvLyBubyBvdmVybGFwXG4gIHtcbiAgICAvLyBjYWxjdWxhdGUgZGlzdGFuY2VcblxuICAgIGlmICh0aGlzLnVuaWZvcm1MZWFmTm9kZVNpemVzICYmXG4gICAgICAgICAgICBub2RlQS5nZXRDaGlsZCgpID09IG51bGwgJiYgbm9kZUIuZ2V0Q2hpbGQoKSA9PSBudWxsKS8vIHNpbXBseSBiYXNlIHJlcHVsc2lvbiBvbiBkaXN0YW5jZSBvZiBub2RlIGNlbnRlcnNcbiAgICB7XG4gICAgICBkaXN0YW5jZVggPSByZWN0Qi5nZXRDZW50ZXJYKCkgLSByZWN0QS5nZXRDZW50ZXJYKCk7XG4gICAgICBkaXN0YW5jZVkgPSByZWN0Qi5nZXRDZW50ZXJZKCkgLSByZWN0QS5nZXRDZW50ZXJZKCk7XG4gICAgfVxuICAgIGVsc2UvLyB1c2UgY2xpcHBpbmcgcG9pbnRzXG4gICAge1xuICAgICAgSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbihyZWN0QSwgcmVjdEIsIGNsaXBQb2ludHMpO1xuXG4gICAgICBkaXN0YW5jZVggPSBjbGlwUG9pbnRzWzJdIC0gY2xpcFBvaW50c1swXTtcbiAgICAgIGRpc3RhbmNlWSA9IGNsaXBQb2ludHNbM10gLSBjbGlwUG9pbnRzWzFdO1xuICAgIH1cblxuICAgIC8vIE5vIHJlcHVsc2lvbiByYW5nZS4gRlIgZ3JpZCB2YXJpYW50IHNob3VsZCB0YWtlIGNhcmUgb2YgdGhpcy5cbiAgICBpZiAoTWF0aC5hYnMoZGlzdGFuY2VYKSA8IEZETGF5b3V0Q29uc3RhbnRzLk1JTl9SRVBVTFNJT05fRElTVClcbiAgICB7XG4gICAgICBkaXN0YW5jZVggPSBJTWF0aC5zaWduKGRpc3RhbmNlWCkgKlxuICAgICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5NSU5fUkVQVUxTSU9OX0RJU1Q7XG4gICAgfVxuXG4gICAgaWYgKE1hdGguYWJzKGRpc3RhbmNlWSkgPCBGRExheW91dENvbnN0YW50cy5NSU5fUkVQVUxTSU9OX0RJU1QpXG4gICAge1xuICAgICAgZGlzdGFuY2VZID0gSU1hdGguc2lnbihkaXN0YW5jZVkpICpcbiAgICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUO1xuICAgIH1cblxuICAgIGRpc3RhbmNlU3F1YXJlZCA9IGRpc3RhbmNlWCAqIGRpc3RhbmNlWCArIGRpc3RhbmNlWSAqIGRpc3RhbmNlWTtcbiAgICBkaXN0YW5jZSA9IE1hdGguc3FydChkaXN0YW5jZVNxdWFyZWQpO1xuXG4gICAgcmVwdWxzaW9uRm9yY2UgPSB0aGlzLnJlcHVsc2lvbkNvbnN0YW50IC8gZGlzdGFuY2VTcXVhcmVkO1xuXG4gICAgLy8gUHJvamVjdCBmb3JjZSBvbnRvIHggYW5kIHkgYXhlc1xuICAgIHJlcHVsc2lvbkZvcmNlWCA9IHJlcHVsc2lvbkZvcmNlICogZGlzdGFuY2VYIC8gZGlzdGFuY2U7XG4gICAgcmVwdWxzaW9uRm9yY2VZID0gcmVwdWxzaW9uRm9yY2UgKiBkaXN0YW5jZVkgLyBkaXN0YW5jZTtcbiAgfVxuXG4gIC8vIEFwcGx5IGZvcmNlcyBvbiB0aGUgdHdvIG5vZGVzXG4gIG5vZGVBLnJlcHVsc2lvbkZvcmNlWCAtPSByZXB1bHNpb25Gb3JjZVg7XG4gIG5vZGVBLnJlcHVsc2lvbkZvcmNlWSAtPSByZXB1bHNpb25Gb3JjZVk7XG4gIG5vZGVCLnJlcHVsc2lvbkZvcmNlWCArPSByZXB1bHNpb25Gb3JjZVg7XG4gIG5vZGVCLnJlcHVsc2lvbkZvcmNlWSArPSByZXB1bHNpb25Gb3JjZVk7XG59O1xuXG5GRExheW91dC5wcm90b3R5cGUuY2FsY0dyYXZpdGF0aW9uYWxGb3JjZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHZhciBvd25lckdyYXBoO1xuICB2YXIgb3duZXJDZW50ZXJYO1xuICB2YXIgb3duZXJDZW50ZXJZO1xuICB2YXIgZGlzdGFuY2VYO1xuICB2YXIgZGlzdGFuY2VZO1xuICB2YXIgYWJzRGlzdGFuY2VYO1xuICB2YXIgYWJzRGlzdGFuY2VZO1xuICB2YXIgZXN0aW1hdGVkU2l6ZTtcbiAgb3duZXJHcmFwaCA9IG5vZGUuZ2V0T3duZXIoKTtcblxuICBvd25lckNlbnRlclggPSAob3duZXJHcmFwaC5nZXRSaWdodCgpICsgb3duZXJHcmFwaC5nZXRMZWZ0KCkpIC8gMjtcbiAgb3duZXJDZW50ZXJZID0gKG93bmVyR3JhcGguZ2V0VG9wKCkgKyBvd25lckdyYXBoLmdldEJvdHRvbSgpKSAvIDI7XG4gIGRpc3RhbmNlWCA9IG5vZGUuZ2V0Q2VudGVyWCgpIC0gb3duZXJDZW50ZXJYO1xuICBkaXN0YW5jZVkgPSBub2RlLmdldENlbnRlclkoKSAtIG93bmVyQ2VudGVyWTtcbiAgYWJzRGlzdGFuY2VYID0gTWF0aC5hYnMoZGlzdGFuY2VYKTtcbiAgYWJzRGlzdGFuY2VZID0gTWF0aC5hYnMoZGlzdGFuY2VZKTtcblxuICBpZiAobm9kZS5nZXRPd25lcigpID09IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKSkvLyBpbiB0aGUgcm9vdCBncmFwaFxuICB7XG4gICAgTWF0aC5mbG9vcig4MCk7XG4gICAgZXN0aW1hdGVkU2l6ZSA9IE1hdGguZmxvb3Iob3duZXJHcmFwaC5nZXRFc3RpbWF0ZWRTaXplKCkgKlxuICAgICAgICAgICAgdGhpcy5ncmF2aXR5UmFuZ2VGYWN0b3IpO1xuXG4gICAgaWYgKGFic0Rpc3RhbmNlWCA+IGVzdGltYXRlZFNpemUgfHwgYWJzRGlzdGFuY2VZID4gZXN0aW1hdGVkU2l6ZSlcbiAgICB7XG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VYID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VYO1xuICAgICAgbm9kZS5ncmF2aXRhdGlvbkZvcmNlWSA9IC10aGlzLmdyYXZpdHlDb25zdGFudCAqIGRpc3RhbmNlWTtcbiAgICB9XG4gIH1cbiAgZWxzZS8vIGluc2lkZSBhIGNvbXBvdW5kXG4gIHtcbiAgICBlc3RpbWF0ZWRTaXplID0gTWF0aC5mbG9vcigob3duZXJHcmFwaC5nZXRFc3RpbWF0ZWRTaXplKCkgKlxuICAgICAgICAgICAgdGhpcy5jb21wb3VuZEdyYXZpdHlSYW5nZUZhY3RvcikpO1xuXG4gICAgaWYgKGFic0Rpc3RhbmNlWCA+IGVzdGltYXRlZFNpemUgfHwgYWJzRGlzdGFuY2VZID4gZXN0aW1hdGVkU2l6ZSlcbiAgICB7XG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VYID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VYICpcbiAgICAgICAgICAgICAgdGhpcy5jb21wb3VuZEdyYXZpdHlDb25zdGFudDtcbiAgICAgIG5vZGUuZ3Jhdml0YXRpb25Gb3JjZVkgPSAtdGhpcy5ncmF2aXR5Q29uc3RhbnQgKiBkaXN0YW5jZVkgKlxuICAgICAgICAgICAgICB0aGlzLmNvbXBvdW5kR3Jhdml0eUNvbnN0YW50O1xuICAgIH1cbiAgfVxufTtcblxuRkRMYXlvdXQucHJvdG90eXBlLmlzQ29udmVyZ2VkID0gZnVuY3Rpb24gKCkge1xuICB2YXIgY29udmVyZ2VkO1xuICB2YXIgb3NjaWxhdGluZyA9IGZhbHNlO1xuXG4gIGlmICh0aGlzLnRvdGFsSXRlcmF0aW9ucyA+IHRoaXMubWF4SXRlcmF0aW9ucyAvIDMpXG4gIHtcbiAgICBvc2NpbGF0aW5nID1cbiAgICAgICAgICAgIE1hdGguYWJzKHRoaXMudG90YWxEaXNwbGFjZW1lbnQgLSB0aGlzLm9sZFRvdGFsRGlzcGxhY2VtZW50KSA8IDI7XG4gIH1cblxuICBjb252ZXJnZWQgPSB0aGlzLnRvdGFsRGlzcGxhY2VtZW50IDwgdGhpcy50b3RhbERpc3BsYWNlbWVudFRocmVzaG9sZDtcblxuICB0aGlzLm9sZFRvdGFsRGlzcGxhY2VtZW50ID0gdGhpcy50b3RhbERpc3BsYWNlbWVudDtcblxuICByZXR1cm4gY29udmVyZ2VkIHx8IG9zY2lsYXRpbmc7XG59O1xuXG5GRExheW91dC5wcm90b3R5cGUuYW5pbWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0ICYmICF0aGlzLmlzU3ViTGF5b3V0KVxuICB7XG4gICAgaWYgKHRoaXMubm90QW5pbWF0ZWRJdGVyYXRpb25zID09IHRoaXMuYW5pbWF0aW9uUGVyaW9kKVxuICAgIHtcbiAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICB0aGlzLm5vdEFuaW1hdGVkSXRlcmF0aW9ucyA9IDA7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICB0aGlzLm5vdEFuaW1hdGVkSXRlcmF0aW9ucysrO1xuICAgIH1cbiAgfVxufTtcblxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25SYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIDAuMDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRkRMYXlvdXQ7XG4iLCJ2YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcblxuZnVuY3Rpb24gRkRMYXlvdXRDb25zdGFudHMoKSB7XG59XG5cbi8vRkRMYXlvdXRDb25zdGFudHMgaW5oZXJpdHMgc3RhdGljIHByb3BzIGluIExheW91dENvbnN0YW50c1xuZm9yICh2YXIgcHJvcCBpbiBMYXlvdXRDb25zdGFudHMpIHtcbiAgRkRMYXlvdXRDb25zdGFudHNbcHJvcF0gPSBMYXlvdXRDb25zdGFudHNbcHJvcF07XG59XG5cbkZETGF5b3V0Q29uc3RhbnRzLk1BWF9JVEVSQVRJT05TID0gMjUwMDtcblxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA9IDUwO1xuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEggPSAwLjQ1O1xuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEggPSA0NTAwLjA7XG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEggPSAwLjQ7XG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEggPSAxLjA7XG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfUkFOR0VfRkFDVE9SID0gMy44O1xuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IDEuNTtcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVVNFX1NNQVJUX0lERUFMX0VER0VfTEVOR1RIX0NBTENVTEFUSU9OID0gdHJ1ZTtcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVVNFX1NNQVJUX1JFUFVMU0lPTl9SQU5HRV9DQUxDVUxBVElPTiA9IHRydWU7XG5GRExheW91dENvbnN0YW50cy5NQVhfTk9ERV9ESVNQTEFDRU1FTlRfSU5DUkVNRU5UQUwgPSAxMDAuMDtcbkZETGF5b3V0Q29uc3RhbnRzLk1BWF9OT0RFX0RJU1BMQUNFTUVOVCA9IEZETGF5b3V0Q29uc3RhbnRzLk1BWF9OT0RFX0RJU1BMQUNFTUVOVF9JTkNSRU1FTlRBTCAqIDM7XG5GRExheW91dENvbnN0YW50cy5NSU5fUkVQVUxTSU9OX0RJU1QgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIIC8gMTAuMDtcbkZETGF5b3V0Q29uc3RhbnRzLkNPTlZFUkdFTkNFX0NIRUNLX1BFUklPRCA9IDEwMDtcbkZETGF5b3V0Q29uc3RhbnRzLlBFUl9MRVZFTF9JREVBTF9FREdFX0xFTkdUSF9GQUNUT1IgPSAwLjE7XG5GRExheW91dENvbnN0YW50cy5NSU5fRURHRV9MRU5HVEggPSAxO1xuRkRMYXlvdXRDb25zdGFudHMuR1JJRF9DQUxDVUxBVElPTl9DSEVDS19QRVJJT0QgPSAxMDtcblxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dENvbnN0YW50cztcbiIsInZhciBMRWRnZSA9IHJlcXVpcmUoJy4vTEVkZ2UnKTtcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcblxuZnVuY3Rpb24gRkRMYXlvdXRFZGdlKHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSkge1xuICBMRWRnZS5jYWxsKHRoaXMsIHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSk7XG4gIHRoaXMuaWRlYWxMZW5ndGggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIO1xufVxuXG5GRExheW91dEVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMRWRnZS5wcm90b3R5cGUpO1xuXG5mb3IgKHZhciBwcm9wIGluIExFZGdlKSB7XG4gIEZETGF5b3V0RWRnZVtwcm9wXSA9IExFZGdlW3Byb3BdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZETGF5b3V0RWRnZTtcbiIsInZhciBMTm9kZSA9IHJlcXVpcmUoJy4vTE5vZGUnKTtcblxuZnVuY3Rpb24gRkRMYXlvdXROb2RlKGdtLCBsb2MsIHNpemUsIHZOb2RlKSB7XG4gIC8vIGFsdGVybmF0aXZlIGNvbnN0cnVjdG9yIGlzIGhhbmRsZWQgaW5zaWRlIExOb2RlXG4gIExOb2RlLmNhbGwodGhpcywgZ20sIGxvYywgc2l6ZSwgdk5vZGUpO1xuICAvL1NwcmluZywgcmVwdWxzaW9uIGFuZCBncmF2aXRhdGlvbmFsIGZvcmNlcyBhY3Rpbmcgb24gdGhpcyBub2RlXG4gIHRoaXMuc3ByaW5nRm9yY2VYID0gMDtcbiAgdGhpcy5zcHJpbmdGb3JjZVkgPSAwO1xuICB0aGlzLnJlcHVsc2lvbkZvcmNlWCA9IDA7XG4gIHRoaXMucmVwdWxzaW9uRm9yY2VZID0gMDtcbiAgdGhpcy5ncmF2aXRhdGlvbkZvcmNlWCA9IDA7XG4gIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVkgPSAwO1xuICAvL0Ftb3VudCBieSB3aGljaCB0aGlzIG5vZGUgaXMgdG8gYmUgbW92ZWQgaW4gdGhpcyBpdGVyYXRpb25cbiAgdGhpcy5kaXNwbGFjZW1lbnRYID0gMDtcbiAgdGhpcy5kaXNwbGFjZW1lbnRZID0gMDtcblxuICAvL1N0YXJ0IGFuZCBmaW5pc2ggZ3JpZCBjb29yZGluYXRlcyB0aGF0IHRoaXMgbm9kZSBpcyBmYWxsZW4gaW50b1xuICB0aGlzLnN0YXJ0WCA9IDA7XG4gIHRoaXMuZmluaXNoWCA9IDA7XG4gIHRoaXMuc3RhcnRZID0gMDtcbiAgdGhpcy5maW5pc2hZID0gMDtcblxuICAvL0dlb21ldHJpYyBuZWlnaGJvcnMgb2YgdGhpcyBub2RlXG4gIHRoaXMuc3Vycm91bmRpbmcgPSBbXTtcbn1cblxuRkRMYXlvdXROb2RlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTE5vZGUucHJvdG90eXBlKTtcblxuZm9yICh2YXIgcHJvcCBpbiBMTm9kZSkge1xuICBGRExheW91dE5vZGVbcHJvcF0gPSBMTm9kZVtwcm9wXTtcbn1cblxuRkRMYXlvdXROb2RlLnByb3RvdHlwZS5zZXRHcmlkQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAoX3N0YXJ0WCwgX2ZpbmlzaFgsIF9zdGFydFksIF9maW5pc2hZKVxue1xuICB0aGlzLnN0YXJ0WCA9IF9zdGFydFg7XG4gIHRoaXMuZmluaXNoWCA9IF9maW5pc2hYO1xuICB0aGlzLnN0YXJ0WSA9IF9zdGFydFk7XG4gIHRoaXMuZmluaXNoWSA9IF9maW5pc2hZO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZETGF5b3V0Tm9kZTtcbiIsInZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcblxuZnVuY3Rpb24gSGFzaE1hcCgpIHtcbiAgdGhpcy5tYXAgPSB7fTtcbiAgdGhpcy5rZXlzID0gW107XG59XG5cbkhhc2hNYXAucHJvdG90eXBlLnB1dCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIHZhciB0aGVJZCA9IFVuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEKGtleSk7XG4gIGlmICghdGhpcy5jb250YWlucyh0aGVJZCkpIHtcbiAgICB0aGlzLm1hcFt0aGVJZF0gPSB2YWx1ZTtcbiAgICB0aGlzLmtleXMucHVzaChrZXkpO1xuICB9XG59O1xuXG5IYXNoTWFwLnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQoa2V5KTtcbiAgcmV0dXJuIHRoaXMubWFwW2tleV0gIT0gbnVsbDtcbn07XG5cbkhhc2hNYXAucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQoa2V5KTtcbiAgcmV0dXJuIHRoaXMubWFwW3RoZUlkXTtcbn07XG5cbkhhc2hNYXAucHJvdG90eXBlLmtleVNldCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMua2V5cztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGFzaE1hcDtcbiIsInZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcblxuZnVuY3Rpb24gSGFzaFNldCgpIHtcbiAgdGhpcy5zZXQgPSB7fTtcbn1cbjtcblxuSGFzaFNldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG9iaikge1xuICB2YXIgdGhlSWQgPSBVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChvYmopO1xuICBpZiAoIXRoaXMuY29udGFpbnModGhlSWQpKVxuICAgIHRoaXMuc2V0W3RoZUlkXSA9IG9iajtcbn07XG5cbkhhc2hTZXQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgZGVsZXRlIHRoaXMuc2V0W1VuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEKG9iaildO1xufTtcblxuSGFzaFNldC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2V0ID0ge307XG59O1xuXG5IYXNoU2V0LnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIHRoaXMuc2V0W1VuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEKG9iaildID09IG9iajtcbn07XG5cbkhhc2hTZXQucHJvdG90eXBlLmlzRW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnNpemUoKSA9PT0gMDtcbn07XG5cbkhhc2hTZXQucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnNldCkubGVuZ3RoO1xufTtcblxuLy9jb25jYXRzIHRoaXMuc2V0IHRvIHRoZSBnaXZlbiBsaXN0XG5IYXNoU2V0LnByb3RvdHlwZS5hZGRBbGxUbyA9IGZ1bmN0aW9uIChsaXN0KSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5zZXQpO1xuICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBsaXN0LnB1c2godGhpcy5zZXRba2V5c1tpXV0pO1xuICB9XG59O1xuXG5IYXNoU2V0LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5zZXQpLmxlbmd0aDtcbn07XG5cbkhhc2hTZXQucHJvdG90eXBlLmFkZEFsbCA9IGZ1bmN0aW9uIChsaXN0KSB7XG4gIHZhciBzID0gbGlzdC5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKSB7XG4gICAgdmFyIHYgPSBsaXN0W2ldO1xuICAgIHRoaXMuYWRkKHYpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhhc2hTZXQ7XG4iLCJmdW5jdGlvbiBJR2VvbWV0cnkoKSB7XG59XG5cbklHZW9tZXRyeS5jYWxjU2VwYXJhdGlvbkFtb3VudCA9IGZ1bmN0aW9uIChyZWN0QSwgcmVjdEIsIG92ZXJsYXBBbW91bnQsIHNlcGFyYXRpb25CdWZmZXIpXG57XG4gIGlmICghcmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpIHtcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcbiAgfVxuICB2YXIgZGlyZWN0aW9ucyA9IG5ldyBBcnJheSgyKTtcbiAgSUdlb21ldHJ5LmRlY2lkZURpcmVjdGlvbnNGb3JPdmVybGFwcGluZ05vZGVzKHJlY3RBLCByZWN0QiwgZGlyZWN0aW9ucyk7XG4gIG92ZXJsYXBBbW91bnRbMF0gPSBNYXRoLm1pbihyZWN0QS5nZXRSaWdodCgpLCByZWN0Qi5nZXRSaWdodCgpKSAtXG4gICAgICAgICAgTWF0aC5tYXgocmVjdEEueCwgcmVjdEIueCk7XG4gIG92ZXJsYXBBbW91bnRbMV0gPSBNYXRoLm1pbihyZWN0QS5nZXRCb3R0b20oKSwgcmVjdEIuZ2V0Qm90dG9tKCkpIC1cbiAgICAgICAgICBNYXRoLm1heChyZWN0QS55LCByZWN0Qi55KTtcbiAgLy8gdXBkYXRlIHRoZSBvdmVybGFwcGluZyBhbW91bnRzIGZvciB0aGUgZm9sbG93aW5nIGNhc2VzOlxuICBpZiAoKHJlY3RBLmdldFgoKSA8PSByZWN0Qi5nZXRYKCkpICYmIChyZWN0QS5nZXRSaWdodCgpID49IHJlY3RCLmdldFJpZ2h0KCkpKVxuICB7XG4gICAgb3ZlcmxhcEFtb3VudFswXSArPSBNYXRoLm1pbigocmVjdEIuZ2V0WCgpIC0gcmVjdEEuZ2V0WCgpKSxcbiAgICAgICAgICAgIChyZWN0QS5nZXRSaWdodCgpIC0gcmVjdEIuZ2V0UmlnaHQoKSkpO1xuICB9XG4gIGVsc2UgaWYgKChyZWN0Qi5nZXRYKCkgPD0gcmVjdEEuZ2V0WCgpKSAmJiAocmVjdEIuZ2V0UmlnaHQoKSA+PSByZWN0QS5nZXRSaWdodCgpKSlcbiAge1xuICAgIG92ZXJsYXBBbW91bnRbMF0gKz0gTWF0aC5taW4oKHJlY3RBLmdldFgoKSAtIHJlY3RCLmdldFgoKSksXG4gICAgICAgICAgICAocmVjdEIuZ2V0UmlnaHQoKSAtIHJlY3RBLmdldFJpZ2h0KCkpKTtcbiAgfVxuICBpZiAoKHJlY3RBLmdldFkoKSA8PSByZWN0Qi5nZXRZKCkpICYmIChyZWN0QS5nZXRCb3R0b20oKSA+PSByZWN0Qi5nZXRCb3R0b20oKSkpXG4gIHtcbiAgICBvdmVybGFwQW1vdW50WzFdICs9IE1hdGgubWluKChyZWN0Qi5nZXRZKCkgLSByZWN0QS5nZXRZKCkpLFxuICAgICAgICAgICAgKHJlY3RBLmdldEJvdHRvbSgpIC0gcmVjdEIuZ2V0Qm90dG9tKCkpKTtcbiAgfVxuICBlbHNlIGlmICgocmVjdEIuZ2V0WSgpIDw9IHJlY3RBLmdldFkoKSkgJiYgKHJlY3RCLmdldEJvdHRvbSgpID49IHJlY3RBLmdldEJvdHRvbSgpKSlcbiAge1xuICAgIG92ZXJsYXBBbW91bnRbMV0gKz0gTWF0aC5taW4oKHJlY3RBLmdldFkoKSAtIHJlY3RCLmdldFkoKSksXG4gICAgICAgICAgICAocmVjdEIuZ2V0Qm90dG9tKCkgLSByZWN0QS5nZXRCb3R0b20oKSkpO1xuICB9XG5cbiAgLy8gZmluZCBzbG9wZSBvZiB0aGUgbGluZSBwYXNzZXMgdHdvIGNlbnRlcnNcbiAgdmFyIHNsb3BlID0gTWF0aC5hYnMoKHJlY3RCLmdldENlbnRlclkoKSAtIHJlY3RBLmdldENlbnRlclkoKSkgL1xuICAgICAgICAgIChyZWN0Qi5nZXRDZW50ZXJYKCkgLSByZWN0QS5nZXRDZW50ZXJYKCkpKTtcbiAgLy8gaWYgY2VudGVycyBhcmUgb3ZlcmxhcHBlZFxuICBpZiAoKHJlY3RCLmdldENlbnRlclkoKSA9PSByZWN0QS5nZXRDZW50ZXJZKCkpICYmXG4gICAgICAgICAgKHJlY3RCLmdldENlbnRlclgoKSA9PSByZWN0QS5nZXRDZW50ZXJYKCkpKVxuICB7XG4gICAgLy8gYXNzdW1lIHRoZSBzbG9wZSBpcyAxICg0NSBkZWdyZWUpXG4gICAgc2xvcGUgPSAxLjA7XG4gIH1cblxuICB2YXIgbW92ZUJ5WSA9IHNsb3BlICogb3ZlcmxhcEFtb3VudFswXTtcbiAgdmFyIG1vdmVCeVggPSBvdmVybGFwQW1vdW50WzFdIC8gc2xvcGU7XG4gIGlmIChvdmVybGFwQW1vdW50WzBdIDwgbW92ZUJ5WClcbiAge1xuICAgIG1vdmVCeVggPSBvdmVybGFwQW1vdW50WzBdO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIG1vdmVCeVkgPSBvdmVybGFwQW1vdW50WzFdO1xuICB9XG4gIC8vIHJldHVybiBoYWxmIHRoZSBhbW91bnQgc28gdGhhdCBpZiBlYWNoIHJlY3RhbmdsZSBpcyBtb3ZlZCBieSB0aGVzZVxuICAvLyBhbW91bnRzIGluIG9wcG9zaXRlIGRpcmVjdGlvbnMsIG92ZXJsYXAgd2lsbCBiZSByZXNvbHZlZFxuICBvdmVybGFwQW1vdW50WzBdID0gLTEgKiBkaXJlY3Rpb25zWzBdICogKChtb3ZlQnlYIC8gMikgKyBzZXBhcmF0aW9uQnVmZmVyKTtcbiAgb3ZlcmxhcEFtb3VudFsxXSA9IC0xICogZGlyZWN0aW9uc1sxXSAqICgobW92ZUJ5WSAvIDIpICsgc2VwYXJhdGlvbkJ1ZmZlcik7XG59XG5cbklHZW9tZXRyeS5kZWNpZGVEaXJlY3Rpb25zRm9yT3ZlcmxhcHBpbmdOb2RlcyA9IGZ1bmN0aW9uIChyZWN0QSwgcmVjdEIsIGRpcmVjdGlvbnMpXG57XG4gIGlmIChyZWN0QS5nZXRDZW50ZXJYKCkgPCByZWN0Qi5nZXRDZW50ZXJYKCkpXG4gIHtcbiAgICBkaXJlY3Rpb25zWzBdID0gLTE7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgZGlyZWN0aW9uc1swXSA9IDE7XG4gIH1cblxuICBpZiAocmVjdEEuZ2V0Q2VudGVyWSgpIDwgcmVjdEIuZ2V0Q2VudGVyWSgpKVxuICB7XG4gICAgZGlyZWN0aW9uc1sxXSA9IC0xO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIGRpcmVjdGlvbnNbMV0gPSAxO1xuICB9XG59XG5cbklHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24yID0gZnVuY3Rpb24gKHJlY3RBLCByZWN0QiwgcmVzdWx0KVxue1xuICAvL3Jlc3VsdFswLTFdIHdpbGwgY29udGFpbiBjbGlwUG9pbnQgb2YgcmVjdEEsIHJlc3VsdFsyLTNdIHdpbGwgY29udGFpbiBjbGlwUG9pbnQgb2YgcmVjdEJcbiAgdmFyIHAxeCA9IHJlY3RBLmdldENlbnRlclgoKTtcbiAgdmFyIHAxeSA9IHJlY3RBLmdldENlbnRlclkoKTtcbiAgdmFyIHAyeCA9IHJlY3RCLmdldENlbnRlclgoKTtcbiAgdmFyIHAyeSA9IHJlY3RCLmdldENlbnRlclkoKTtcblxuICAvL2lmIHR3byByZWN0YW5nbGVzIGludGVyc2VjdCwgdGhlbiBjbGlwcGluZyBwb2ludHMgYXJlIGNlbnRlcnNcbiAgaWYgKHJlY3RBLmludGVyc2VjdHMocmVjdEIpKVxuICB7XG4gICAgcmVzdWx0WzBdID0gcDF4O1xuICAgIHJlc3VsdFsxXSA9IHAxeTtcbiAgICByZXN1bHRbMl0gPSBwMng7XG4gICAgcmVzdWx0WzNdID0gcDJ5O1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIC8vdmFyaWFibGVzIGZvciByZWN0QVxuICB2YXIgdG9wTGVmdEF4ID0gcmVjdEEuZ2V0WCgpO1xuICB2YXIgdG9wTGVmdEF5ID0gcmVjdEEuZ2V0WSgpO1xuICB2YXIgdG9wUmlnaHRBeCA9IHJlY3RBLmdldFJpZ2h0KCk7XG4gIHZhciBib3R0b21MZWZ0QXggPSByZWN0QS5nZXRYKCk7XG4gIHZhciBib3R0b21MZWZ0QXkgPSByZWN0QS5nZXRCb3R0b20oKTtcbiAgdmFyIGJvdHRvbVJpZ2h0QXggPSByZWN0QS5nZXRSaWdodCgpO1xuICB2YXIgaGFsZldpZHRoQSA9IHJlY3RBLmdldFdpZHRoSGFsZigpO1xuICB2YXIgaGFsZkhlaWdodEEgPSByZWN0QS5nZXRIZWlnaHRIYWxmKCk7XG4gIC8vdmFyaWFibGVzIGZvciByZWN0QlxuICB2YXIgdG9wTGVmdEJ4ID0gcmVjdEIuZ2V0WCgpO1xuICB2YXIgdG9wTGVmdEJ5ID0gcmVjdEIuZ2V0WSgpO1xuICB2YXIgdG9wUmlnaHRCeCA9IHJlY3RCLmdldFJpZ2h0KCk7XG4gIHZhciBib3R0b21MZWZ0QnggPSByZWN0Qi5nZXRYKCk7XG4gIHZhciBib3R0b21MZWZ0QnkgPSByZWN0Qi5nZXRCb3R0b20oKTtcbiAgdmFyIGJvdHRvbVJpZ2h0QnggPSByZWN0Qi5nZXRSaWdodCgpO1xuICB2YXIgaGFsZldpZHRoQiA9IHJlY3RCLmdldFdpZHRoSGFsZigpO1xuICB2YXIgaGFsZkhlaWdodEIgPSByZWN0Qi5nZXRIZWlnaHRIYWxmKCk7XG4gIC8vZmxhZyB3aGV0aGVyIGNsaXBwaW5nIHBvaW50cyBhcmUgZm91bmRcbiAgdmFyIGNsaXBQb2ludEFGb3VuZCA9IGZhbHNlO1xuICB2YXIgY2xpcFBvaW50QkZvdW5kID0gZmFsc2U7XG5cbiAgLy8gbGluZSBpcyB2ZXJ0aWNhbFxuICBpZiAocDF4ID09IHAyeClcbiAge1xuICAgIGlmIChwMXkgPiBwMnkpXG4gICAge1xuICAgICAgcmVzdWx0WzBdID0gcDF4O1xuICAgICAgcmVzdWx0WzFdID0gdG9wTGVmdEF5O1xuICAgICAgcmVzdWx0WzJdID0gcDJ4O1xuICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIGlmIChwMXkgPCBwMnkpXG4gICAge1xuICAgICAgcmVzdWx0WzBdID0gcDF4O1xuICAgICAgcmVzdWx0WzFdID0gYm90dG9tTGVmdEF5O1xuICAgICAgcmVzdWx0WzJdID0gcDJ4O1xuICAgICAgcmVzdWx0WzNdID0gdG9wTGVmdEJ5O1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgLy9ub3QgbGluZSwgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG4gIC8vIGxpbmUgaXMgaG9yaXpvbnRhbFxuICBlbHNlIGlmIChwMXkgPT0gcDJ5KVxuICB7XG4gICAgaWYgKHAxeCA+IHAyeClcbiAgICB7XG4gICAgICByZXN1bHRbMF0gPSB0b3BMZWZ0QXg7XG4gICAgICByZXN1bHRbMV0gPSBwMXk7XG4gICAgICByZXN1bHRbMl0gPSB0b3BSaWdodEJ4O1xuICAgICAgcmVzdWx0WzNdID0gcDJ5O1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIGlmIChwMXggPCBwMngpXG4gICAge1xuICAgICAgcmVzdWx0WzBdID0gdG9wUmlnaHRBeDtcbiAgICAgIHJlc3VsdFsxXSA9IHAxeTtcbiAgICAgIHJlc3VsdFsyXSA9IHRvcExlZnRCeDtcbiAgICAgIHJlc3VsdFszXSA9IHAyeTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIC8vbm90IHZhbGlkIGxpbmUsIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuICBlbHNlXG4gIHtcbiAgICAvL3Nsb3BlcyBvZiByZWN0QSdzIGFuZCByZWN0QidzIGRpYWdvbmFsc1xuICAgIHZhciBzbG9wZUEgPSByZWN0QS5oZWlnaHQgLyByZWN0QS53aWR0aDtcbiAgICB2YXIgc2xvcGVCID0gcmVjdEIuaGVpZ2h0IC8gcmVjdEIud2lkdGg7XG5cbiAgICAvL3Nsb3BlIG9mIGxpbmUgYmV0d2VlbiBjZW50ZXIgb2YgcmVjdEEgYW5kIGNlbnRlciBvZiByZWN0QlxuICAgIHZhciBzbG9wZVByaW1lID0gKHAyeSAtIHAxeSkgLyAocDJ4IC0gcDF4KTtcbiAgICB2YXIgY2FyZGluYWxEaXJlY3Rpb25BO1xuICAgIHZhciBjYXJkaW5hbERpcmVjdGlvbkI7XG4gICAgdmFyIHRlbXBQb2ludEF4O1xuICAgIHZhciB0ZW1wUG9pbnRBeTtcbiAgICB2YXIgdGVtcFBvaW50Qng7XG4gICAgdmFyIHRlbXBQb2ludEJ5O1xuXG4gICAgLy9kZXRlcm1pbmUgd2hldGhlciBjbGlwcGluZyBwb2ludCBpcyB0aGUgY29ybmVyIG9mIG5vZGVBXG4gICAgaWYgKCgtc2xvcGVBKSA9PSBzbG9wZVByaW1lKVxuICAgIHtcbiAgICAgIGlmIChwMXggPiBwMngpXG4gICAgICB7XG4gICAgICAgIHJlc3VsdFswXSA9IGJvdHRvbUxlZnRBeDtcbiAgICAgICAgcmVzdWx0WzFdID0gYm90dG9tTGVmdEF5O1xuICAgICAgICBjbGlwUG9pbnRBRm91bmQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICByZXN1bHRbMF0gPSB0b3BSaWdodEF4O1xuICAgICAgICByZXN1bHRbMV0gPSB0b3BMZWZ0QXk7XG4gICAgICAgIGNsaXBQb2ludEFGb3VuZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHNsb3BlQSA9PSBzbG9wZVByaW1lKVxuICAgIHtcbiAgICAgIGlmIChwMXggPiBwMngpXG4gICAgICB7XG4gICAgICAgIHJlc3VsdFswXSA9IHRvcExlZnRBeDtcbiAgICAgICAgcmVzdWx0WzFdID0gdG9wTGVmdEF5O1xuICAgICAgICBjbGlwUG9pbnRBRm91bmQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICByZXN1bHRbMF0gPSBib3R0b21SaWdodEF4O1xuICAgICAgICByZXN1bHRbMV0gPSBib3R0b21MZWZ0QXk7XG4gICAgICAgIGNsaXBQb2ludEFGb3VuZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9kZXRlcm1pbmUgd2hldGhlciBjbGlwcGluZyBwb2ludCBpcyB0aGUgY29ybmVyIG9mIG5vZGVCXG4gICAgaWYgKCgtc2xvcGVCKSA9PSBzbG9wZVByaW1lKVxuICAgIHtcbiAgICAgIGlmIChwMnggPiBwMXgpXG4gICAgICB7XG4gICAgICAgIHJlc3VsdFsyXSA9IGJvdHRvbUxlZnRCeDtcbiAgICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xuICAgICAgICBjbGlwUG9pbnRCRm91bmQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICByZXN1bHRbMl0gPSB0b3BSaWdodEJ4O1xuICAgICAgICByZXN1bHRbM10gPSB0b3BMZWZ0Qnk7XG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHNsb3BlQiA9PSBzbG9wZVByaW1lKVxuICAgIHtcbiAgICAgIGlmIChwMnggPiBwMXgpXG4gICAgICB7XG4gICAgICAgIHJlc3VsdFsyXSA9IHRvcExlZnRCeDtcbiAgICAgICAgcmVzdWx0WzNdID0gdG9wTGVmdEJ5O1xuICAgICAgICBjbGlwUG9pbnRCRm91bmQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICByZXN1bHRbMl0gPSBib3R0b21SaWdodEJ4O1xuICAgICAgICByZXN1bHRbM10gPSBib3R0b21MZWZ0Qnk7XG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9pZiBib3RoIGNsaXBwaW5nIHBvaW50cyBhcmUgY29ybmVyc1xuICAgIGlmIChjbGlwUG9pbnRBRm91bmQgJiYgY2xpcFBvaW50QkZvdW5kKVxuICAgIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvL2RldGVybWluZSBDYXJkaW5hbCBEaXJlY3Rpb24gb2YgcmVjdGFuZ2xlc1xuICAgIGlmIChwMXggPiBwMngpXG4gICAge1xuICAgICAgaWYgKHAxeSA+IHAyeSlcbiAgICAgIHtcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25BID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKHNsb3BlQSwgc2xvcGVQcmltZSwgNCk7XG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQiA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbihzbG9wZUIsIHNsb3BlUHJpbWUsIDIpO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oLXNsb3BlQSwgc2xvcGVQcmltZSwgMyk7XG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQiA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbigtc2xvcGVCLCBzbG9wZVByaW1lLCAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIGlmIChwMXkgPiBwMnkpXG4gICAgICB7XG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQSA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbigtc2xvcGVBLCBzbG9wZVByaW1lLCAxKTtcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKC1zbG9wZUIsIHNsb3BlUHJpbWUsIDMpO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oc2xvcGVBLCBzbG9wZVByaW1lLCAyKTtcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKHNsb3BlQiwgc2xvcGVQcmltZSwgNCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vY2FsY3VsYXRlIGNsaXBwaW5nIFBvaW50IGlmIGl0IGlzIG5vdCBmb3VuZCBiZWZvcmVcbiAgICBpZiAoIWNsaXBQb2ludEFGb3VuZClcbiAgICB7XG4gICAgICBzd2l0Y2ggKGNhcmRpbmFsRGlyZWN0aW9uQSlcbiAgICAgIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHRlbXBQb2ludEF5ID0gdG9wTGVmdEF5O1xuICAgICAgICAgIHRlbXBQb2ludEF4ID0gcDF4ICsgKC1oYWxmSGVpZ2h0QSkgLyBzbG9wZVByaW1lO1xuICAgICAgICAgIHJlc3VsdFswXSA9IHRlbXBQb2ludEF4O1xuICAgICAgICAgIHJlc3VsdFsxXSA9IHRlbXBQb2ludEF5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgdGVtcFBvaW50QXggPSBib3R0b21SaWdodEF4O1xuICAgICAgICAgIHRlbXBQb2ludEF5ID0gcDF5ICsgaGFsZldpZHRoQSAqIHNsb3BlUHJpbWU7XG4gICAgICAgICAgcmVzdWx0WzBdID0gdGVtcFBvaW50QXg7XG4gICAgICAgICAgcmVzdWx0WzFdID0gdGVtcFBvaW50QXk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICB0ZW1wUG9pbnRBeSA9IGJvdHRvbUxlZnRBeTtcbiAgICAgICAgICB0ZW1wUG9pbnRBeCA9IHAxeCArIGhhbGZIZWlnaHRBIC8gc2xvcGVQcmltZTtcbiAgICAgICAgICByZXN1bHRbMF0gPSB0ZW1wUG9pbnRBeDtcbiAgICAgICAgICByZXN1bHRbMV0gPSB0ZW1wUG9pbnRBeTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHRlbXBQb2ludEF4ID0gYm90dG9tTGVmdEF4O1xuICAgICAgICAgIHRlbXBQb2ludEF5ID0gcDF5ICsgKC1oYWxmV2lkdGhBKSAqIHNsb3BlUHJpbWU7XG4gICAgICAgICAgcmVzdWx0WzBdID0gdGVtcFBvaW50QXg7XG4gICAgICAgICAgcmVzdWx0WzFdID0gdGVtcFBvaW50QXk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghY2xpcFBvaW50QkZvdW5kKVxuICAgIHtcbiAgICAgIHN3aXRjaCAoY2FyZGluYWxEaXJlY3Rpb25CKVxuICAgICAge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgdGVtcFBvaW50QnkgPSB0b3BMZWZ0Qnk7XG4gICAgICAgICAgdGVtcFBvaW50QnggPSBwMnggKyAoLWhhbGZIZWlnaHRCKSAvIHNsb3BlUHJpbWU7XG4gICAgICAgICAgcmVzdWx0WzJdID0gdGVtcFBvaW50Qng7XG4gICAgICAgICAgcmVzdWx0WzNdID0gdGVtcFBvaW50Qnk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICB0ZW1wUG9pbnRCeCA9IGJvdHRvbVJpZ2h0Qng7XG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBwMnkgKyBoYWxmV2lkdGhCICogc2xvcGVQcmltZTtcbiAgICAgICAgICByZXN1bHRbMl0gPSB0ZW1wUG9pbnRCeDtcbiAgICAgICAgICByZXN1bHRbM10gPSB0ZW1wUG9pbnRCeTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHRlbXBQb2ludEJ5ID0gYm90dG9tTGVmdEJ5O1xuICAgICAgICAgIHRlbXBQb2ludEJ4ID0gcDJ4ICsgaGFsZkhlaWdodEIgLyBzbG9wZVByaW1lO1xuICAgICAgICAgIHJlc3VsdFsyXSA9IHRlbXBQb2ludEJ4O1xuICAgICAgICAgIHJlc3VsdFszXSA9IHRlbXBQb2ludEJ5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgdGVtcFBvaW50QnggPSBib3R0b21MZWZ0Qng7XG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBwMnkgKyAoLWhhbGZXaWR0aEIpICogc2xvcGVQcmltZTtcbiAgICAgICAgICByZXN1bHRbMl0gPSB0ZW1wUG9pbnRCeDtcbiAgICAgICAgICByZXN1bHRbM10gPSB0ZW1wUG9pbnRCeTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5JR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24gPSBmdW5jdGlvbiAoc2xvcGUsIHNsb3BlUHJpbWUsIGxpbmUpXG57XG4gIGlmIChzbG9wZSA+IHNsb3BlUHJpbWUpXG4gIHtcbiAgICByZXR1cm4gbGluZTtcbiAgfVxuICBlbHNlXG4gIHtcbiAgICByZXR1cm4gMSArIGxpbmUgJSA0O1xuICB9XG59XG5cbklHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24gPSBmdW5jdGlvbiAoczEsIHMyLCBmMSwgZjIpXG57XG4gIGlmIChmMiA9PSBudWxsKSB7XG4gICAgcmV0dXJuIElHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24yKHMxLCBzMiwgZjEpO1xuICB9XG4gIHZhciB4MSA9IHMxLng7XG4gIHZhciB5MSA9IHMxLnk7XG4gIHZhciB4MiA9IHMyLng7XG4gIHZhciB5MiA9IHMyLnk7XG4gIHZhciB4MyA9IGYxLng7XG4gIHZhciB5MyA9IGYxLnk7XG4gIHZhciB4NCA9IGYyLng7XG4gIHZhciB5NCA9IGYyLnk7XG4gIHZhciB4LCB5OyAvLyBpbnRlcnNlY3Rpb24gcG9pbnRcbiAgdmFyIGExLCBhMiwgYjEsIGIyLCBjMSwgYzI7IC8vIGNvZWZmaWNpZW50cyBvZiBsaW5lIGVxbnMuXG4gIHZhciBkZW5vbTtcblxuICBhMSA9IHkyIC0geTE7XG4gIGIxID0geDEgLSB4MjtcbiAgYzEgPSB4MiAqIHkxIC0geDEgKiB5MjsgIC8vIHsgYTEqeCArIGIxKnkgKyBjMSA9IDAgaXMgbGluZSAxIH1cblxuICBhMiA9IHk0IC0geTM7XG4gIGIyID0geDMgLSB4NDtcbiAgYzIgPSB4NCAqIHkzIC0geDMgKiB5NDsgIC8vIHsgYTIqeCArIGIyKnkgKyBjMiA9IDAgaXMgbGluZSAyIH1cblxuICBkZW5vbSA9IGExICogYjIgLSBhMiAqIGIxO1xuXG4gIGlmIChkZW5vbSA9PSAwKVxuICB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB4ID0gKGIxICogYzIgLSBiMiAqIGMxKSAvIGRlbm9tO1xuICB5ID0gKGEyICogYzEgLSBhMSAqIGMyKSAvIGRlbm9tO1xuXG4gIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBTZWN0aW9uOiBDbGFzcyBDb25zdGFudHNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFNvbWUgdXNlZnVsIHByZS1jYWxjdWxhdGVkIGNvbnN0YW50c1xuICovXG5JR2VvbWV0cnkuSEFMRl9QSSA9IDAuNSAqIE1hdGguUEk7XG5JR2VvbWV0cnkuT05FX0FORF9IQUxGX1BJID0gMS41ICogTWF0aC5QSTtcbklHZW9tZXRyeS5UV09fUEkgPSAyLjAgKiBNYXRoLlBJO1xuSUdlb21ldHJ5LlRIUkVFX1BJID0gMy4wICogTWF0aC5QSTtcblxubW9kdWxlLmV4cG9ydHMgPSBJR2VvbWV0cnk7XG4iLCJmdW5jdGlvbiBJTWF0aCgpIHtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBzaWduIG9mIHRoZSBpbnB1dCB2YWx1ZS5cbiAqL1xuSU1hdGguc2lnbiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgPiAwKVxuICB7XG4gICAgcmV0dXJuIDE7XG4gIH1cbiAgZWxzZSBpZiAodmFsdWUgPCAwKVxuICB7XG4gICAgcmV0dXJuIC0xO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIHJldHVybiAwO1xuICB9XG59XG5cbklNYXRoLmZsb29yID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA8IDAgPyBNYXRoLmNlaWwodmFsdWUpIDogTWF0aC5mbG9vcih2YWx1ZSk7XG59XG5cbklNYXRoLmNlaWwgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlIDwgMCA/IE1hdGguZmxvb3IodmFsdWUpIDogTWF0aC5jZWlsKHZhbHVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJTWF0aDtcbiIsImZ1bmN0aW9uIEludGVnZXIoKSB7XG59XG5cbkludGVnZXIuTUFYX1ZBTFVFID0gMjE0NzQ4MzY0NztcbkludGVnZXIuTUlOX1ZBTFVFID0gLTIxNDc0ODM2NDg7XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZWdlcjtcbiIsInZhciBMR3JhcGhPYmplY3QgPSByZXF1aXJlKCcuL0xHcmFwaE9iamVjdCcpO1xudmFyIElHZW9tZXRyeSA9IHJlcXVpcmUoJy4vSUdlb21ldHJ5Jyk7XG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XG5cbmZ1bmN0aW9uIExFZGdlKHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSkge1xuICBMR3JhcGhPYmplY3QuY2FsbCh0aGlzLCB2RWRnZSk7XG5cbiAgdGhpcy5pc092ZXJsYXBpbmdTb3VyY2VBbmRUYXJnZXQgPSBmYWxzZTtcbiAgdGhpcy52R3JhcGhPYmplY3QgPSB2RWRnZTtcbiAgdGhpcy5iZW5kcG9pbnRzID0gW107XG4gIHRoaXMuc291cmNlID0gc291cmNlO1xuICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbn1cblxuTEVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGhPYmplY3QucHJvdG90eXBlKTtcblxuZm9yICh2YXIgcHJvcCBpbiBMR3JhcGhPYmplY3QpIHtcbiAgTEVkZ2VbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XG59XG5cbkxFZGdlLnByb3RvdHlwZS5nZXRTb3VyY2UgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5zb3VyY2U7XG59O1xuXG5MRWRnZS5wcm90b3R5cGUuZ2V0VGFyZ2V0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMudGFyZ2V0O1xufTtcblxuTEVkZ2UucHJvdG90eXBlLmlzSW50ZXJHcmFwaCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmlzSW50ZXJHcmFwaDtcbn07XG5cbkxFZGdlLnByb3RvdHlwZS5nZXRMZW5ndGggPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5sZW5ndGg7XG59O1xuXG5MRWRnZS5wcm90b3R5cGUuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0O1xufTtcblxuTEVkZ2UucHJvdG90eXBlLmdldEJlbmRwb2ludHMgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5iZW5kcG9pbnRzO1xufTtcblxuTEVkZ2UucHJvdG90eXBlLmdldExjYSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmxjYTtcbn07XG5cbkxFZGdlLnByb3RvdHlwZS5nZXRTb3VyY2VJbkxjYSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnNvdXJjZUluTGNhO1xufTtcblxuTEVkZ2UucHJvdG90eXBlLmdldFRhcmdldEluTGNhID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMudGFyZ2V0SW5MY2E7XG59O1xuXG5MRWRnZS5wcm90b3R5cGUuZ2V0T3RoZXJFbmQgPSBmdW5jdGlvbiAobm9kZSlcbntcbiAgaWYgKHRoaXMuc291cmNlID09PSBub2RlKVxuICB7XG4gICAgcmV0dXJuIHRoaXMudGFyZ2V0O1xuICB9XG4gIGVsc2UgaWYgKHRoaXMudGFyZ2V0ID09PSBub2RlKVxuICB7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIHRocm93IFwiTm9kZSBpcyBub3QgaW5jaWRlbnQgd2l0aCB0aGlzIGVkZ2VcIjtcbiAgfVxufVxuXG5MRWRnZS5wcm90b3R5cGUuZ2V0T3RoZXJFbmRJbkdyYXBoID0gZnVuY3Rpb24gKG5vZGUsIGdyYXBoKVxue1xuICB2YXIgb3RoZXJFbmQgPSB0aGlzLmdldE90aGVyRW5kKG5vZGUpO1xuICB2YXIgcm9vdCA9IGdyYXBoLmdldEdyYXBoTWFuYWdlcigpLmdldFJvb3QoKTtcblxuICB3aGlsZSAodHJ1ZSlcbiAge1xuICAgIGlmIChvdGhlckVuZC5nZXRPd25lcigpID09IGdyYXBoKVxuICAgIHtcbiAgICAgIHJldHVybiBvdGhlckVuZDtcbiAgICB9XG5cbiAgICBpZiAob3RoZXJFbmQuZ2V0T3duZXIoKSA9PSByb290KVxuICAgIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIG90aGVyRW5kID0gb3RoZXJFbmQuZ2V0T3duZXIoKS5nZXRQYXJlbnQoKTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuTEVkZ2UucHJvdG90eXBlLnVwZGF0ZUxlbmd0aCA9IGZ1bmN0aW9uICgpXG57XG4gIHZhciBjbGlwUG9pbnRDb29yZGluYXRlcyA9IG5ldyBBcnJheSg0KTtcblxuICB0aGlzLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldCA9XG4gICAgICAgICAgSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbih0aGlzLnRhcmdldC5nZXRSZWN0KCksXG4gICAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZS5nZXRSZWN0KCksXG4gICAgICAgICAgICAgICAgICBjbGlwUG9pbnRDb29yZGluYXRlcyk7XG5cbiAgaWYgKCF0aGlzLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldClcbiAge1xuICAgIHRoaXMubGVuZ3RoWCA9IGNsaXBQb2ludENvb3JkaW5hdGVzWzBdIC0gY2xpcFBvaW50Q29vcmRpbmF0ZXNbMl07XG4gICAgdGhpcy5sZW5ndGhZID0gY2xpcFBvaW50Q29vcmRpbmF0ZXNbMV0gLSBjbGlwUG9pbnRDb29yZGluYXRlc1szXTtcblxuICAgIGlmIChNYXRoLmFicyh0aGlzLmxlbmd0aFgpIDwgMS4wKVxuICAgIHtcbiAgICAgIHRoaXMubGVuZ3RoWCA9IElNYXRoLnNpZ24odGhpcy5sZW5ndGhYKTtcbiAgICB9XG5cbiAgICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhZKSA8IDEuMClcbiAgICB7XG4gICAgICB0aGlzLmxlbmd0aFkgPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWSk7XG4gICAgfVxuXG4gICAgdGhpcy5sZW5ndGggPSBNYXRoLnNxcnQoXG4gICAgICAgICAgICB0aGlzLmxlbmd0aFggKiB0aGlzLmxlbmd0aFggKyB0aGlzLmxlbmd0aFkgKiB0aGlzLmxlbmd0aFkpO1xuICB9XG59O1xuXG5MRWRnZS5wcm90b3R5cGUudXBkYXRlTGVuZ3RoU2ltcGxlID0gZnVuY3Rpb24gKClcbntcbiAgdGhpcy5sZW5ndGhYID0gdGhpcy50YXJnZXQuZ2V0Q2VudGVyWCgpIC0gdGhpcy5zb3VyY2UuZ2V0Q2VudGVyWCgpO1xuICB0aGlzLmxlbmd0aFkgPSB0aGlzLnRhcmdldC5nZXRDZW50ZXJZKCkgLSB0aGlzLnNvdXJjZS5nZXRDZW50ZXJZKCk7XG5cbiAgaWYgKE1hdGguYWJzKHRoaXMubGVuZ3RoWCkgPCAxLjApXG4gIHtcbiAgICB0aGlzLmxlbmd0aFggPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWCk7XG4gIH1cblxuICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhZKSA8IDEuMClcbiAge1xuICAgIHRoaXMubGVuZ3RoWSA9IElNYXRoLnNpZ24odGhpcy5sZW5ndGhZKTtcbiAgfVxuXG4gIHRoaXMubGVuZ3RoID0gTWF0aC5zcXJ0KFxuICAgICAgICAgIHRoaXMubGVuZ3RoWCAqIHRoaXMubGVuZ3RoWCArIHRoaXMubGVuZ3RoWSAqIHRoaXMubGVuZ3RoWSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTEVkZ2U7XG4iLCJ2YXIgTEdyYXBoT2JqZWN0ID0gcmVxdWlyZSgnLi9MR3JhcGhPYmplY3QnKTtcbnZhciBJbnRlZ2VyID0gcmVxdWlyZSgnLi9JbnRlZ2VyJyk7XG52YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcbnZhciBMR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9MR3JhcGhNYW5hZ2VyJyk7XG52YXIgTE5vZGUgPSByZXF1aXJlKCcuL0xOb2RlJyk7XG52YXIgSGFzaFNldCA9IHJlcXVpcmUoJy4vSGFzaFNldCcpO1xudmFyIFJlY3RhbmdsZUQgPSByZXF1aXJlKCcuL1JlY3RhbmdsZUQnKTtcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vUG9pbnQnKTtcblxuZnVuY3Rpb24gTEdyYXBoKHBhcmVudCwgb2JqMiwgdkdyYXBoKSB7XG4gIExHcmFwaE9iamVjdC5jYWxsKHRoaXMsIHZHcmFwaCk7XG4gIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IEludGVnZXIuTUlOX1ZBTFVFO1xuICB0aGlzLm1hcmdpbiA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVBIX01BUkdJTjtcbiAgdGhpcy5lZGdlcyA9IFtdO1xuICB0aGlzLm5vZGVzID0gW107XG4gIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG5cbiAgaWYgKG9iajIgIT0gbnVsbCAmJiBvYmoyIGluc3RhbmNlb2YgTEdyYXBoTWFuYWdlcikge1xuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyID0gb2JqMjtcbiAgfVxuICBlbHNlIGlmIChvYmoyICE9IG51bGwgJiYgb2JqMiBpbnN0YW5jZW9mIExheW91dCkge1xuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyID0gb2JqMi5ncmFwaE1hbmFnZXI7XG4gIH1cbn1cblxuTEdyYXBoLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEdyYXBoT2JqZWN0LnByb3RvdHlwZSk7XG5mb3IgKHZhciBwcm9wIGluIExHcmFwaE9iamVjdCkge1xuICBMR3JhcGhbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XG59XG5cbkxHcmFwaC5wcm90b3R5cGUuZ2V0Tm9kZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm5vZGVzO1xufTtcblxuTEdyYXBoLnByb3RvdHlwZS5nZXRFZGdlcyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuZWRnZXM7XG59O1xuXG5MR3JhcGgucHJvdG90eXBlLmdldEdyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmdyYXBoTWFuYWdlcjtcbn07XG5cbkxHcmFwaC5wcm90b3R5cGUuZ2V0UGFyZW50ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMucGFyZW50O1xufTtcblxuTEdyYXBoLnByb3RvdHlwZS5nZXRMZWZ0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMubGVmdDtcbn07XG5cbkxHcmFwaC5wcm90b3R5cGUuZ2V0UmlnaHQgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yaWdodDtcbn07XG5cbkxHcmFwaC5wcm90b3R5cGUuZ2V0VG9wID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMudG9wO1xufTtcblxuTEdyYXBoLnByb3RvdHlwZS5nZXRCb3R0b20gPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5ib3R0b207XG59O1xuXG5MR3JhcGgucHJvdG90eXBlLmlzQ29ubmVjdGVkID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMuaXNDb25uZWN0ZWQ7XG59O1xuXG5MR3JhcGgucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChvYmoxLCBzb3VyY2VOb2RlLCB0YXJnZXROb2RlKSB7XG4gIGlmIChzb3VyY2VOb2RlID09IG51bGwgJiYgdGFyZ2V0Tm9kZSA9PSBudWxsKSB7XG4gICAgdmFyIG5ld05vZGUgPSBvYmoxO1xuICAgIGlmICh0aGlzLmdyYXBoTWFuYWdlciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBcIkdyYXBoIGhhcyBubyBncmFwaCBtZ3IhXCI7XG4gICAgfVxuICAgIGlmICh0aGlzLmdldE5vZGVzKCkuaW5kZXhPZihuZXdOb2RlKSA+IC0xKSB7XG4gICAgICB0aHJvdyBcIk5vZGUgYWxyZWFkeSBpbiBncmFwaCFcIjtcbiAgICB9XG4gICAgbmV3Tm9kZS5vd25lciA9IHRoaXM7XG4gICAgdGhpcy5nZXROb2RlcygpLnB1c2gobmV3Tm9kZSk7XG5cbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfVxuICBlbHNlIHtcbiAgICB2YXIgbmV3RWRnZSA9IG9iajE7XG4gICAgaWYgKCEodGhpcy5nZXROb2RlcygpLmluZGV4T2Yoc291cmNlTm9kZSkgPiAtMSAmJiAodGhpcy5nZXROb2RlcygpLmluZGV4T2YodGFyZ2V0Tm9kZSkpID4gLTEpKSB7XG4gICAgICB0aHJvdyBcIlNvdXJjZSBvciB0YXJnZXQgbm90IGluIGdyYXBoIVwiO1xuICAgIH1cblxuICAgIGlmICghKHNvdXJjZU5vZGUub3duZXIgPT0gdGFyZ2V0Tm9kZS5vd25lciAmJiBzb3VyY2VOb2RlLm93bmVyID09IHRoaXMpKSB7XG4gICAgICB0aHJvdyBcIkJvdGggb3duZXJzIG11c3QgYmUgdGhpcyBncmFwaCFcIjtcbiAgICB9XG5cbiAgICBpZiAoc291cmNlTm9kZS5vd25lciAhPSB0YXJnZXROb2RlLm93bmVyKVxuICAgIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIHNldCBzb3VyY2UgYW5kIHRhcmdldFxuICAgIG5ld0VkZ2Uuc291cmNlID0gc291cmNlTm9kZTtcbiAgICBuZXdFZGdlLnRhcmdldCA9IHRhcmdldE5vZGU7XG5cbiAgICAvLyBzZXQgYXMgaW50cmEtZ3JhcGggZWRnZVxuICAgIG5ld0VkZ2UuaXNJbnRlckdyYXBoID0gZmFsc2U7XG5cbiAgICAvLyBhZGQgdG8gZ3JhcGggZWRnZSBsaXN0XG4gICAgdGhpcy5nZXRFZGdlcygpLnB1c2gobmV3RWRnZSk7XG5cbiAgICAvLyBhZGQgdG8gaW5jaWRlbmN5IGxpc3RzXG4gICAgc291cmNlTm9kZS5lZGdlcy5wdXNoKG5ld0VkZ2UpO1xuXG4gICAgaWYgKHRhcmdldE5vZGUgIT0gc291cmNlTm9kZSlcbiAgICB7XG4gICAgICB0YXJnZXROb2RlLmVkZ2VzLnB1c2gobmV3RWRnZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld0VkZ2U7XG4gIH1cbn07XG5cbkxHcmFwaC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKG9iaikge1xuICB2YXIgbm9kZSA9IG9iajtcbiAgaWYgKG9iaiBpbnN0YW5jZW9mIExOb2RlKSB7XG4gICAgaWYgKG5vZGUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgXCJOb2RlIGlzIG51bGwhXCI7XG4gICAgfVxuICAgIGlmICghKG5vZGUub3duZXIgIT0gbnVsbCAmJiBub2RlLm93bmVyID09IHRoaXMpKSB7XG4gICAgICB0aHJvdyBcIk93bmVyIGdyYXBoIGlzIGludmFsaWQhXCI7XG4gICAgfVxuICAgIGlmICh0aGlzLmdyYXBoTWFuYWdlciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBcIk93bmVyIGdyYXBoIG1hbmFnZXIgaXMgaW52YWxpZCFcIjtcbiAgICB9XG4gICAgLy8gcmVtb3ZlIGluY2lkZW50IGVkZ2VzIGZpcnN0IChtYWtlIGEgY29weSB0byBkbyBpdCBzYWZlbHkpXG4gICAgdmFyIGVkZ2VzVG9CZVJlbW92ZWQgPSBub2RlLmVkZ2VzLnNsaWNlKCk7XG4gICAgdmFyIGVkZ2U7XG4gICAgdmFyIHMgPSBlZGdlc1RvQmVSZW1vdmVkLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAgICB7XG4gICAgICBlZGdlID0gZWRnZXNUb0JlUmVtb3ZlZFtpXTtcblxuICAgICAgaWYgKGVkZ2UuaXNJbnRlckdyYXBoKVxuICAgICAge1xuICAgICAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUoZWRnZSk7XG4gICAgICB9XG4gICAgICBlbHNlXG4gICAgICB7XG4gICAgICAgIGVkZ2Uuc291cmNlLm93bmVyLnJlbW92ZShlZGdlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBub3cgdGhlIG5vZGUgaXRzZWxmXG4gICAgdmFyIGluZGV4ID0gdGhpcy5ub2Rlcy5pbmRleE9mKG5vZGUpO1xuICAgIGlmIChpbmRleCA9PSAtMSkge1xuICAgICAgdGhyb3cgXCJOb2RlIG5vdCBpbiBvd25lciBub2RlIGxpc3QhXCI7XG4gICAgfVxuXG4gICAgdGhpcy5ub2Rlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG4gIGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIExFZGdlKSB7XG4gICAgdmFyIGVkZ2UgPSBvYmo7XG4gICAgaWYgKGVkZ2UgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgXCJFZGdlIGlzIG51bGwhXCI7XG4gICAgfVxuICAgIGlmICghKGVkZ2Uuc291cmNlICE9IG51bGwgJiYgZWRnZS50YXJnZXQgIT0gbnVsbCkpIHtcbiAgICAgIHRocm93IFwiU291cmNlIGFuZC9vciB0YXJnZXQgaXMgbnVsbCFcIjtcbiAgICB9XG4gICAgaWYgKCEoZWRnZS5zb3VyY2Uub3duZXIgIT0gbnVsbCAmJiBlZGdlLnRhcmdldC5vd25lciAhPSBudWxsICYmXG4gICAgICAgICAgICBlZGdlLnNvdXJjZS5vd25lciA9PSB0aGlzICYmIGVkZ2UudGFyZ2V0Lm93bmVyID09IHRoaXMpKSB7XG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IG93bmVyIGlzIGludmFsaWQhXCI7XG4gICAgfVxuXG4gICAgdmFyIHNvdXJjZUluZGV4ID0gZWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihlZGdlKTtcbiAgICB2YXIgdGFyZ2V0SW5kZXggPSBlZGdlLnRhcmdldC5lZGdlcy5pbmRleE9mKGVkZ2UpO1xuICAgIGlmICghKHNvdXJjZUluZGV4ID4gLTEgJiYgdGFyZ2V0SW5kZXggPiAtMSkpIHtcbiAgICAgIHRocm93IFwiU291cmNlIGFuZC9vciB0YXJnZXQgZG9lc24ndCBrbm93IHRoaXMgZWRnZSFcIjtcbiAgICB9XG5cbiAgICBlZGdlLnNvdXJjZS5lZGdlcy5zcGxpY2Uoc291cmNlSW5kZXgsIDEpO1xuXG4gICAgaWYgKGVkZ2UudGFyZ2V0ICE9IGVkZ2Uuc291cmNlKVxuICAgIHtcbiAgICAgIGVkZ2UudGFyZ2V0LmVkZ2VzLnNwbGljZSh0YXJnZXRJbmRleCwgMSk7XG4gICAgfVxuXG4gICAgdmFyIGluZGV4ID0gZWRnZS5zb3VyY2Uub3duZXIuZ2V0RWRnZXMoKS5pbmRleE9mKGVkZ2UpO1xuICAgIGlmIChpbmRleCA9PSAtMSkge1xuICAgICAgdGhyb3cgXCJOb3QgaW4gb3duZXIncyBlZGdlIGxpc3QhXCI7XG4gICAgfVxuXG4gICAgZWRnZS5zb3VyY2Uub3duZXIuZ2V0RWRnZXMoKS5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG59O1xuXG5MR3JhcGgucHJvdG90eXBlLnVwZGF0ZUxlZnRUb3AgPSBmdW5jdGlvbiAoKVxue1xuICB2YXIgdG9wID0gSW50ZWdlci5NQVhfVkFMVUU7XG4gIHZhciBsZWZ0ID0gSW50ZWdlci5NQVhfVkFMVUU7XG4gIHZhciBub2RlVG9wO1xuICB2YXIgbm9kZUxlZnQ7XG5cbiAgdmFyIG5vZGVzID0gdGhpcy5nZXROb2RlcygpO1xuICB2YXIgcyA9IG5vZGVzLmxlbmd0aDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAge1xuICAgIHZhciBsTm9kZSA9IG5vZGVzW2ldO1xuICAgIG5vZGVUb3AgPSBNYXRoLmZsb29yKGxOb2RlLmdldFRvcCgpKTtcbiAgICBub2RlTGVmdCA9IE1hdGguZmxvb3IobE5vZGUuZ2V0TGVmdCgpKTtcblxuICAgIGlmICh0b3AgPiBub2RlVG9wKVxuICAgIHtcbiAgICAgIHRvcCA9IG5vZGVUb3A7XG4gICAgfVxuXG4gICAgaWYgKGxlZnQgPiBub2RlTGVmdClcbiAgICB7XG4gICAgICBsZWZ0ID0gbm9kZUxlZnQ7XG4gICAgfVxuICB9XG5cbiAgLy8gRG8gd2UgaGF2ZSBhbnkgbm9kZXMgaW4gdGhpcyBncmFwaD9cbiAgaWYgKHRvcCA9PSBJbnRlZ2VyLk1BWF9WQUxVRSlcbiAge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdGhpcy5sZWZ0ID0gbGVmdCAtIHRoaXMubWFyZ2luO1xuICB0aGlzLnRvcCA9IHRvcCAtIHRoaXMubWFyZ2luO1xuXG4gIC8vIEFwcGx5IHRoZSBtYXJnaW5zIGFuZCByZXR1cm4gdGhlIHJlc3VsdFxuICByZXR1cm4gbmV3IFBvaW50KHRoaXMubGVmdCwgdGhpcy50b3ApO1xufTtcblxuTEdyYXBoLnByb3RvdHlwZS51cGRhdGVCb3VuZHMgPSBmdW5jdGlvbiAocmVjdXJzaXZlKVxue1xuICAvLyBjYWxjdWxhdGUgYm91bmRzXG4gIHZhciBsZWZ0ID0gSW50ZWdlci5NQVhfVkFMVUU7XG4gIHZhciByaWdodCA9IC1JbnRlZ2VyLk1BWF9WQUxVRTtcbiAgdmFyIHRvcCA9IEludGVnZXIuTUFYX1ZBTFVFO1xuICB2YXIgYm90dG9tID0gLUludGVnZXIuTUFYX1ZBTFVFO1xuICB2YXIgbm9kZUxlZnQ7XG4gIHZhciBub2RlUmlnaHQ7XG4gIHZhciBub2RlVG9wO1xuICB2YXIgbm9kZUJvdHRvbTtcblxuICB2YXIgbm9kZXMgPSB0aGlzLm5vZGVzO1xuICB2YXIgcyA9IG5vZGVzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXG4gIHtcbiAgICB2YXIgbE5vZGUgPSBub2Rlc1tpXTtcblxuICAgIGlmIChyZWN1cnNpdmUgJiYgbE5vZGUuY2hpbGQgIT0gbnVsbClcbiAgICB7XG4gICAgICBsTm9kZS51cGRhdGVCb3VuZHMoKTtcbiAgICB9XG4gICAgbm9kZUxlZnQgPSBNYXRoLmZsb29yKGxOb2RlLmdldExlZnQoKSk7XG4gICAgbm9kZVJpZ2h0ID0gTWF0aC5mbG9vcihsTm9kZS5nZXRSaWdodCgpKTtcbiAgICBub2RlVG9wID0gTWF0aC5mbG9vcihsTm9kZS5nZXRUb3AoKSk7XG4gICAgbm9kZUJvdHRvbSA9IE1hdGguZmxvb3IobE5vZGUuZ2V0Qm90dG9tKCkpO1xuXG4gICAgaWYgKGxlZnQgPiBub2RlTGVmdClcbiAgICB7XG4gICAgICBsZWZ0ID0gbm9kZUxlZnQ7XG4gICAgfVxuXG4gICAgaWYgKHJpZ2h0IDwgbm9kZVJpZ2h0KVxuICAgIHtcbiAgICAgIHJpZ2h0ID0gbm9kZVJpZ2h0O1xuICAgIH1cblxuICAgIGlmICh0b3AgPiBub2RlVG9wKVxuICAgIHtcbiAgICAgIHRvcCA9IG5vZGVUb3A7XG4gICAgfVxuXG4gICAgaWYgKGJvdHRvbSA8IG5vZGVCb3R0b20pXG4gICAge1xuICAgICAgYm90dG9tID0gbm9kZUJvdHRvbTtcbiAgICB9XG4gIH1cblxuICB2YXIgYm91bmRpbmdSZWN0ID0gbmV3IFJlY3RhbmdsZUQobGVmdCwgdG9wLCByaWdodCAtIGxlZnQsIGJvdHRvbSAtIHRvcCk7XG4gIGlmIChsZWZ0ID09IEludGVnZXIuTUFYX1ZBTFVFKVxuICB7XG4gICAgdGhpcy5sZWZ0ID0gTWF0aC5mbG9vcih0aGlzLnBhcmVudC5nZXRMZWZ0KCkpO1xuICAgIHRoaXMucmlnaHQgPSBNYXRoLmZsb29yKHRoaXMucGFyZW50LmdldFJpZ2h0KCkpO1xuICAgIHRoaXMudG9wID0gTWF0aC5mbG9vcih0aGlzLnBhcmVudC5nZXRUb3AoKSk7XG4gICAgdGhpcy5ib3R0b20gPSBNYXRoLmZsb29yKHRoaXMucGFyZW50LmdldEJvdHRvbSgpKTtcbiAgfVxuXG4gIHRoaXMubGVmdCA9IGJvdW5kaW5nUmVjdC54IC0gdGhpcy5tYXJnaW47XG4gIHRoaXMucmlnaHQgPSBib3VuZGluZ1JlY3QueCArIGJvdW5kaW5nUmVjdC53aWR0aCArIHRoaXMubWFyZ2luO1xuICB0aGlzLnRvcCA9IGJvdW5kaW5nUmVjdC55IC0gdGhpcy5tYXJnaW47XG4gIHRoaXMuYm90dG9tID0gYm91bmRpbmdSZWN0LnkgKyBib3VuZGluZ1JlY3QuaGVpZ2h0ICsgdGhpcy5tYXJnaW47XG59O1xuXG5MR3JhcGguY2FsY3VsYXRlQm91bmRzID0gZnVuY3Rpb24gKG5vZGVzKVxue1xuICB2YXIgbGVmdCA9IEludGVnZXIuTUFYX1ZBTFVFO1xuICB2YXIgcmlnaHQgPSAtSW50ZWdlci5NQVhfVkFMVUU7XG4gIHZhciB0b3AgPSBJbnRlZ2VyLk1BWF9WQUxVRTtcbiAgdmFyIGJvdHRvbSA9IC1JbnRlZ2VyLk1BWF9WQUxVRTtcbiAgdmFyIG5vZGVMZWZ0O1xuICB2YXIgbm9kZVJpZ2h0O1xuICB2YXIgbm9kZVRvcDtcbiAgdmFyIG5vZGVCb3R0b207XG5cbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXG4gIHtcbiAgICB2YXIgbE5vZGUgPSBub2Rlc1tpXTtcbiAgICBub2RlTGVmdCA9IE1hdGguZmxvb3IobE5vZGUuZ2V0TGVmdCgpKTtcbiAgICBub2RlUmlnaHQgPSBNYXRoLmZsb29yKGxOb2RlLmdldFJpZ2h0KCkpO1xuICAgIG5vZGVUb3AgPSBNYXRoLmZsb29yKGxOb2RlLmdldFRvcCgpKTtcbiAgICBub2RlQm90dG9tID0gTWF0aC5mbG9vcihsTm9kZS5nZXRCb3R0b20oKSk7XG5cbiAgICBpZiAobGVmdCA+IG5vZGVMZWZ0KVxuICAgIHtcbiAgICAgIGxlZnQgPSBub2RlTGVmdDtcbiAgICB9XG5cbiAgICBpZiAocmlnaHQgPCBub2RlUmlnaHQpXG4gICAge1xuICAgICAgcmlnaHQgPSBub2RlUmlnaHQ7XG4gICAgfVxuXG4gICAgaWYgKHRvcCA+IG5vZGVUb3ApXG4gICAge1xuICAgICAgdG9wID0gbm9kZVRvcDtcbiAgICB9XG5cbiAgICBpZiAoYm90dG9tIDwgbm9kZUJvdHRvbSlcbiAgICB7XG4gICAgICBib3R0b20gPSBub2RlQm90dG9tO1xuICAgIH1cbiAgfVxuXG4gIHZhciBib3VuZGluZ1JlY3QgPSBuZXcgUmVjdGFuZ2xlRChsZWZ0LCB0b3AsIHJpZ2h0IC0gbGVmdCwgYm90dG9tIC0gdG9wKTtcblxuICByZXR1cm4gYm91bmRpbmdSZWN0O1xufTtcblxuTEdyYXBoLnByb3RvdHlwZS5nZXRJbmNsdXNpb25UcmVlRGVwdGggPSBmdW5jdGlvbiAoKVxue1xuICBpZiAodGhpcyA9PSB0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkpXG4gIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICBlbHNlXG4gIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0SW5jbHVzaW9uVHJlZURlcHRoKCk7XG4gIH1cbn07XG5cbkxHcmFwaC5wcm90b3R5cGUuZ2V0RXN0aW1hdGVkU2l6ZSA9IGZ1bmN0aW9uICgpXG57XG4gIGlmICh0aGlzLmVzdGltYXRlZFNpemUgPT0gSW50ZWdlci5NSU5fVkFMVUUpIHtcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcbiAgfVxuICByZXR1cm4gdGhpcy5lc3RpbWF0ZWRTaXplO1xufTtcblxuTEdyYXBoLnByb3RvdHlwZS5jYWxjRXN0aW1hdGVkU2l6ZSA9IGZ1bmN0aW9uICgpXG57XG4gIHZhciBzaXplID0gMDtcbiAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXG4gIHtcbiAgICB2YXIgbE5vZGUgPSBub2Rlc1tpXTtcbiAgICBzaXplICs9IGxOb2RlLmNhbGNFc3RpbWF0ZWRTaXplKCk7XG4gIH1cblxuICBpZiAoc2l6ZSA9PSAwKVxuICB7XG4gICAgdGhpcy5lc3RpbWF0ZWRTaXplID0gTGF5b3V0Q29uc3RhbnRzLkVNUFRZX0NPTVBPVU5EX05PREVfU0laRTtcbiAgfVxuICBlbHNlXG4gIHtcbiAgICB0aGlzLmVzdGltYXRlZFNpemUgPSBNYXRoLmZsb29yKHNpemUgLyBNYXRoLnNxcnQodGhpcy5ub2Rlcy5sZW5ndGgpKTtcbiAgfVxuXG4gIHJldHVybiBNYXRoLmZsb29yKHRoaXMuZXN0aW1hdGVkU2l6ZSk7XG59O1xuXG5MR3JhcGgucHJvdG90eXBlLnVwZGF0ZUNvbm5lY3RlZCA9IGZ1bmN0aW9uICgpXG57XG4gIGlmICh0aGlzLm5vZGVzLmxlbmd0aCA9PSAwKVxuICB7XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHRydWU7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIHRvQmVWaXNpdGVkID0gW107XG4gIHZhciB2aXNpdGVkID0gbmV3IEhhc2hTZXQoKTtcbiAgdmFyIGN1cnJlbnROb2RlID0gdGhpcy5ub2Rlc1swXTtcbiAgdmFyIG5laWdoYm9yRWRnZXM7XG4gIHZhciBjdXJyZW50TmVpZ2hib3I7XG4gIHRvQmVWaXNpdGVkID0gdG9CZVZpc2l0ZWQuY29uY2F0KGN1cnJlbnROb2RlLndpdGhDaGlsZHJlbigpKTtcblxuICB3aGlsZSAodG9CZVZpc2l0ZWQubGVuZ3RoID4gMClcbiAge1xuICAgIGN1cnJlbnROb2RlID0gdG9CZVZpc2l0ZWQuc2hpZnQoKTtcbiAgICB2aXNpdGVkLmFkZChjdXJyZW50Tm9kZSk7XG5cbiAgICAvLyBUcmF2ZXJzZSBhbGwgbmVpZ2hib3JzIG9mIHRoaXMgbm9kZVxuICAgIG5laWdoYm9yRWRnZXMgPSBjdXJyZW50Tm9kZS5nZXRFZGdlcygpO1xuICAgIHZhciBzID0gbmVpZ2hib3JFZGdlcy5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXG4gICAge1xuICAgICAgdmFyIG5laWdoYm9yRWRnZSA9IG5laWdoYm9yRWRnZXNbaV07XG4gICAgICBjdXJyZW50TmVpZ2hib3IgPVxuICAgICAgICAgICAgICBuZWlnaGJvckVkZ2UuZ2V0T3RoZXJFbmRJbkdyYXBoKGN1cnJlbnROb2RlLCB0aGlzKTtcblxuICAgICAgLy8gQWRkIHVudmlzaXRlZCBuZWlnaGJvcnMgdG8gdGhlIGxpc3QgdG8gdmlzaXRcbiAgICAgIGlmIChjdXJyZW50TmVpZ2hib3IgIT0gbnVsbCAmJlxuICAgICAgICAgICAgICAhdmlzaXRlZC5jb250YWlucyhjdXJyZW50TmVpZ2hib3IpKVxuICAgICAge1xuICAgICAgICB0b0JlVmlzaXRlZCA9IHRvQmVWaXNpdGVkLmNvbmNhdChjdXJyZW50TmVpZ2hib3Iud2l0aENoaWxkcmVuKCkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcblxuICBpZiAodmlzaXRlZC5zaXplKCkgPj0gdGhpcy5ub2Rlcy5sZW5ndGgpXG4gIHtcbiAgICB2YXIgbm9PZlZpc2l0ZWRJblRoaXNHcmFwaCA9IDA7XG5cbiAgICB2YXIgcyA9IHZpc2l0ZWQuc2l6ZSgpO1xuICAgIGZvciAodmFyIHZpc2l0ZWRJZCBpbiB2aXNpdGVkLnNldClcbiAgICB7XG4gICAgICB2YXIgdmlzaXRlZE5vZGUgPSB2aXNpdGVkLnNldFt2aXNpdGVkSWRdO1xuICAgICAgaWYgKHZpc2l0ZWROb2RlLm93bmVyID09IHRoaXMpXG4gICAgICB7XG4gICAgICAgIG5vT2ZWaXNpdGVkSW5UaGlzR3JhcGgrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobm9PZlZpc2l0ZWRJblRoaXNHcmFwaCA9PSB0aGlzLm5vZGVzLmxlbmd0aClcbiAgICB7XG4gICAgICB0aGlzLmlzQ29ubmVjdGVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTEdyYXBoO1xuIiwiZnVuY3Rpb24gTEdyYXBoTWFuYWdlcihsYXlvdXQpIHtcbiAgdGhpcy5sYXlvdXQgPSBsYXlvdXQ7XG5cbiAgdGhpcy5ncmFwaHMgPSBbXTtcbiAgdGhpcy5lZGdlcyA9IFtdO1xufVxuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5hZGRSb290ID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIG5ncmFwaCA9IHRoaXMubGF5b3V0Lm5ld0dyYXBoKCk7XG4gIHZhciBubm9kZSA9IHRoaXMubGF5b3V0Lm5ld05vZGUobnVsbCk7XG4gIHZhciByb290ID0gdGhpcy5hZGQobmdyYXBoLCBubm9kZSk7XG4gIHRoaXMuc2V0Um9vdEdyYXBoKHJvb3QpO1xuICByZXR1cm4gdGhpcy5yb290R3JhcGg7XG59O1xuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAobmV3R3JhcGgsIHBhcmVudE5vZGUsIG5ld0VkZ2UsIHNvdXJjZU5vZGUsIHRhcmdldE5vZGUpXG57XG4gIC8vdGhlcmUgYXJlIGp1c3QgMiBwYXJhbWV0ZXJzIGFyZSBwYXNzZWQgdGhlbiBpdCBhZGRzIGFuIExHcmFwaCBlbHNlIGl0IGFkZHMgYW4gTEVkZ2VcbiAgaWYgKG5ld0VkZ2UgPT0gbnVsbCAmJiBzb3VyY2VOb2RlID09IG51bGwgJiYgdGFyZ2V0Tm9kZSA9PSBudWxsKSB7XG4gICAgaWYgKG5ld0dyYXBoID09IG51bGwpIHtcbiAgICAgIHRocm93IFwiR3JhcGggaXMgbnVsbCFcIjtcbiAgICB9XG4gICAgaWYgKHBhcmVudE5vZGUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgXCJQYXJlbnQgbm9kZSBpcyBudWxsIVwiO1xuICAgIH1cbiAgICBpZiAodGhpcy5ncmFwaHMuaW5kZXhPZihuZXdHcmFwaCkgPiAtMSkge1xuICAgICAgdGhyb3cgXCJHcmFwaCBhbHJlYWR5IGluIHRoaXMgZ3JhcGggbWdyIVwiO1xuICAgIH1cblxuICAgIHRoaXMuZ3JhcGhzLnB1c2gobmV3R3JhcGgpO1xuXG4gICAgaWYgKG5ld0dyYXBoLnBhcmVudCAhPSBudWxsKSB7XG4gICAgICB0aHJvdyBcIkFscmVhZHkgaGFzIGEgcGFyZW50IVwiO1xuICAgIH1cbiAgICBpZiAocGFyZW50Tm9kZS5jaGlsZCAhPSBudWxsKSB7XG4gICAgICB0aHJvdyAgXCJBbHJlYWR5IGhhcyBhIGNoaWxkIVwiO1xuICAgIH1cblxuICAgIG5ld0dyYXBoLnBhcmVudCA9IHBhcmVudE5vZGU7XG4gICAgcGFyZW50Tm9kZS5jaGlsZCA9IG5ld0dyYXBoO1xuXG4gICAgcmV0dXJuIG5ld0dyYXBoO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vY2hhbmdlIHRoZSBvcmRlciBvZiB0aGUgcGFyYW1ldGVyc1xuICAgIHRhcmdldE5vZGUgPSBuZXdFZGdlO1xuICAgIHNvdXJjZU5vZGUgPSBwYXJlbnROb2RlO1xuICAgIG5ld0VkZ2UgPSBuZXdHcmFwaDtcbiAgICB2YXIgc291cmNlR3JhcGggPSBzb3VyY2VOb2RlLmdldE93bmVyKCk7XG4gICAgdmFyIHRhcmdldEdyYXBoID0gdGFyZ2V0Tm9kZS5nZXRPd25lcigpO1xuXG4gICAgaWYgKCEoc291cmNlR3JhcGggIT0gbnVsbCAmJiBzb3VyY2VHcmFwaC5nZXRHcmFwaE1hbmFnZXIoKSA9PSB0aGlzKSkge1xuICAgICAgdGhyb3cgXCJTb3VyY2Ugbm90IGluIHRoaXMgZ3JhcGggbWdyIVwiO1xuICAgIH1cbiAgICBpZiAoISh0YXJnZXRHcmFwaCAhPSBudWxsICYmIHRhcmdldEdyYXBoLmdldEdyYXBoTWFuYWdlcigpID09IHRoaXMpKSB7XG4gICAgICB0aHJvdyBcIlRhcmdldCBub3QgaW4gdGhpcyBncmFwaCBtZ3IhXCI7XG4gICAgfVxuXG4gICAgaWYgKHNvdXJjZUdyYXBoID09IHRhcmdldEdyYXBoKVxuICAgIHtcbiAgICAgIG5ld0VkZ2UuaXNJbnRlckdyYXBoID0gZmFsc2U7XG4gICAgICByZXR1cm4gc291cmNlR3JhcGguYWRkKG5ld0VkZ2UsIHNvdXJjZU5vZGUsIHRhcmdldE5vZGUpO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgbmV3RWRnZS5pc0ludGVyR3JhcGggPSB0cnVlO1xuXG4gICAgICAvLyBzZXQgc291cmNlIGFuZCB0YXJnZXRcbiAgICAgIG5ld0VkZ2Uuc291cmNlID0gc291cmNlTm9kZTtcbiAgICAgIG5ld0VkZ2UudGFyZ2V0ID0gdGFyZ2V0Tm9kZTtcblxuICAgICAgLy8gYWRkIGVkZ2UgdG8gaW50ZXItZ3JhcGggZWRnZSBsaXN0XG4gICAgICBpZiAodGhpcy5lZGdlcy5pbmRleE9mKG5ld0VkZ2UpID4gLTEpIHtcbiAgICAgICAgdGhyb3cgXCJFZGdlIGFscmVhZHkgaW4gaW50ZXItZ3JhcGggZWRnZSBsaXN0IVwiO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmVkZ2VzLnB1c2gobmV3RWRnZSk7XG5cbiAgICAgIC8vIGFkZCBlZGdlIHRvIHNvdXJjZSBhbmQgdGFyZ2V0IGluY2lkZW5jeSBsaXN0c1xuICAgICAgaWYgKCEobmV3RWRnZS5zb3VyY2UgIT0gbnVsbCAmJiBuZXdFZGdlLnRhcmdldCAhPSBudWxsKSkge1xuICAgICAgICB0aHJvdyBcIkVkZ2Ugc291cmNlIGFuZC9vciB0YXJnZXQgaXMgbnVsbCFcIjtcbiAgICAgIH1cblxuICAgICAgaWYgKCEobmV3RWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihuZXdFZGdlKSA9PSAtMSAmJiBuZXdFZGdlLnRhcmdldC5lZGdlcy5pbmRleE9mKG5ld0VkZ2UpID09IC0xKSkge1xuICAgICAgICB0aHJvdyBcIkVkZ2UgYWxyZWFkeSBpbiBzb3VyY2UgYW5kL29yIHRhcmdldCBpbmNpZGVuY3kgbGlzdCFcIjtcbiAgICAgIH1cblxuICAgICAgbmV3RWRnZS5zb3VyY2UuZWRnZXMucHVzaChuZXdFZGdlKTtcbiAgICAgIG5ld0VkZ2UudGFyZ2V0LmVkZ2VzLnB1c2gobmV3RWRnZSk7XG5cbiAgICAgIHJldHVybiBuZXdFZGdlO1xuICAgIH1cbiAgfVxufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKGxPYmopIHtcbiAgaWYgKGxPYmogaW5zdGFuY2VvZiBMR3JhcGgpIHtcbiAgICB2YXIgZ3JhcGggPSBsT2JqO1xuICAgIGlmIChncmFwaC5nZXRHcmFwaE1hbmFnZXIoKSAhPSB0aGlzKSB7XG4gICAgICB0aHJvdyBcIkdyYXBoIG5vdCBpbiB0aGlzIGdyYXBoIG1nclwiO1xuICAgIH1cbiAgICBpZiAoIShncmFwaCA9PSB0aGlzLnJvb3RHcmFwaCB8fCAoZ3JhcGgucGFyZW50ICE9IG51bGwgJiYgZ3JhcGgucGFyZW50LmdyYXBoTWFuYWdlciA9PSB0aGlzKSkpIHtcbiAgICAgIHRocm93IFwiSW52YWxpZCBwYXJlbnQgbm9kZSFcIjtcbiAgICB9XG5cbiAgICAvLyBmaXJzdCB0aGUgZWRnZXMgKG1ha2UgYSBjb3B5IHRvIGRvIGl0IHNhZmVseSlcbiAgICB2YXIgZWRnZXNUb0JlUmVtb3ZlZCA9IFtdO1xuXG4gICAgZWRnZXNUb0JlUmVtb3ZlZCA9IGVkZ2VzVG9CZVJlbW92ZWQuY29uY2F0KGdyYXBoLmdldEVkZ2VzKCkpO1xuXG4gICAgdmFyIGVkZ2U7XG4gICAgdmFyIHMgPSBlZGdlc1RvQmVSZW1vdmVkLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAgICB7XG4gICAgICBlZGdlID0gZWRnZXNUb0JlUmVtb3ZlZFtpXTtcbiAgICAgIGdyYXBoLnJlbW92ZShlZGdlKTtcbiAgICB9XG5cbiAgICAvLyB0aGVuIHRoZSBub2RlcyAobWFrZSBhIGNvcHkgdG8gZG8gaXQgc2FmZWx5KVxuICAgIHZhciBub2Rlc1RvQmVSZW1vdmVkID0gW107XG5cbiAgICBub2Rlc1RvQmVSZW1vdmVkID0gbm9kZXNUb0JlUmVtb3ZlZC5jb25jYXQoZ3JhcGguZ2V0Tm9kZXMoKSk7XG5cbiAgICB2YXIgbm9kZTtcbiAgICBzID0gbm9kZXNUb0JlUmVtb3ZlZC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXG4gICAge1xuICAgICAgbm9kZSA9IG5vZGVzVG9CZVJlbW92ZWRbaV07XG4gICAgICBncmFwaC5yZW1vdmUobm9kZSk7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgaWYgZ3JhcGggaXMgdGhlIHJvb3RcbiAgICBpZiAoZ3JhcGggPT0gdGhpcy5yb290R3JhcGgpXG4gICAge1xuICAgICAgdGhpcy5zZXRSb290R3JhcGgobnVsbCk7XG4gICAgfVxuXG4gICAgLy8gbm93IHJlbW92ZSB0aGUgZ3JhcGggaXRzZWxmXG4gICAgdmFyIGluZGV4ID0gdGhpcy5ncmFwaHMuaW5kZXhPZihncmFwaCk7XG4gICAgdGhpcy5ncmFwaHMuc3BsaWNlKGluZGV4LCAxKTtcblxuICAgIC8vIGFsc28gcmVzZXQgdGhlIHBhcmVudCBvZiB0aGUgZ3JhcGhcbiAgICBncmFwaC5wYXJlbnQgPSBudWxsO1xuICB9XG4gIGVsc2UgaWYgKGxPYmogaW5zdGFuY2VvZiBMRWRnZSkge1xuICAgIGVkZ2UgPSBsT2JqO1xuICAgIGlmIChlZGdlID09IG51bGwpIHtcbiAgICAgIHRocm93IFwiRWRnZSBpcyBudWxsIVwiO1xuICAgIH1cbiAgICBpZiAoIWVkZ2UuaXNJbnRlckdyYXBoKSB7XG4gICAgICB0aHJvdyBcIk5vdCBhbiBpbnRlci1ncmFwaCBlZGdlIVwiO1xuICAgIH1cbiAgICBpZiAoIShlZGdlLnNvdXJjZSAhPSBudWxsICYmIGVkZ2UudGFyZ2V0ICE9IG51bGwpKSB7XG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGlzIG51bGwhXCI7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIGVkZ2UgZnJvbSBzb3VyY2UgYW5kIHRhcmdldCBub2RlcycgaW5jaWRlbmN5IGxpc3RzXG5cbiAgICBpZiAoIShlZGdlLnNvdXJjZS5lZGdlcy5pbmRleE9mKGVkZ2UpICE9IC0xICYmIGVkZ2UudGFyZ2V0LmVkZ2VzLmluZGV4T2YoZWRnZSkgIT0gLTEpKSB7XG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGRvZXNuJ3Qga25vdyB0aGlzIGVkZ2UhXCI7XG4gICAgfVxuXG4gICAgdmFyIGluZGV4ID0gZWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihlZGdlKTtcbiAgICBlZGdlLnNvdXJjZS5lZGdlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIGluZGV4ID0gZWRnZS50YXJnZXQuZWRnZXMuaW5kZXhPZihlZGdlKTtcbiAgICBlZGdlLnRhcmdldC5lZGdlcy5zcGxpY2UoaW5kZXgsIDEpO1xuXG4gICAgLy8gcmVtb3ZlIGVkZ2UgZnJvbSBvd25lciBncmFwaCBtYW5hZ2VyJ3MgaW50ZXItZ3JhcGggZWRnZSBsaXN0XG5cbiAgICBpZiAoIShlZGdlLnNvdXJjZS5vd25lciAhPSBudWxsICYmIGVkZ2Uuc291cmNlLm93bmVyLmdldEdyYXBoTWFuYWdlcigpICE9IG51bGwpKSB7XG4gICAgICB0aHJvdyBcIkVkZ2Ugb3duZXIgZ3JhcGggb3Igb3duZXIgZ3JhcGggbWFuYWdlciBpcyBudWxsIVwiO1xuICAgIH1cbiAgICBpZiAoZWRnZS5zb3VyY2Uub3duZXIuZ2V0R3JhcGhNYW5hZ2VyKCkuZWRnZXMuaW5kZXhPZihlZGdlKSA9PSAtMSkge1xuICAgICAgdGhyb3cgXCJOb3QgaW4gb3duZXIgZ3JhcGggbWFuYWdlcidzIGVkZ2UgbGlzdCFcIjtcbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBlZGdlLnNvdXJjZS5vd25lci5nZXRHcmFwaE1hbmFnZXIoKS5lZGdlcy5pbmRleE9mKGVkZ2UpO1xuICAgIGVkZ2Uuc291cmNlLm93bmVyLmdldEdyYXBoTWFuYWdlcigpLmVkZ2VzLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnVwZGF0ZUJvdW5kcyA9IGZ1bmN0aW9uICgpXG57XG4gIHRoaXMucm9vdEdyYXBoLnVwZGF0ZUJvdW5kcyh0cnVlKTtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEdyYXBocyA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmdyYXBocztcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEFsbE5vZGVzID0gZnVuY3Rpb24gKClcbntcbiAgaWYgKHRoaXMuYWxsTm9kZXMgPT0gbnVsbClcbiAge1xuICAgIHZhciBub2RlTGlzdCA9IFtdO1xuICAgIHZhciBncmFwaHMgPSB0aGlzLmdldEdyYXBocygpO1xuICAgIHZhciBzID0gZ3JhcGhzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAgICB7XG4gICAgICBub2RlTGlzdCA9IG5vZGVMaXN0LmNvbmNhdChncmFwaHNbaV0uZ2V0Tm9kZXMoKSk7XG4gICAgfVxuICAgIHRoaXMuYWxsTm9kZXMgPSBub2RlTGlzdDtcbiAgfVxuICByZXR1cm4gdGhpcy5hbGxOb2Rlcztcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlc2V0QWxsTm9kZXMgPSBmdW5jdGlvbiAoKVxue1xuICB0aGlzLmFsbE5vZGVzID0gbnVsbDtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlc2V0QWxsRWRnZXMgPSBmdW5jdGlvbiAoKVxue1xuICB0aGlzLmFsbEVkZ2VzID0gbnVsbDtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlc2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAoKVxue1xuICB0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uID0gbnVsbDtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEFsbEVkZ2VzID0gZnVuY3Rpb24gKClcbntcbiAgaWYgKHRoaXMuYWxsRWRnZXMgPT0gbnVsbClcbiAge1xuICAgIHZhciBlZGdlTGlzdCA9IFtdO1xuICAgIHZhciBncmFwaHMgPSB0aGlzLmdldEdyYXBocygpO1xuICAgIHZhciBzID0gZ3JhcGhzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdyYXBocy5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICBlZGdlTGlzdCA9IGVkZ2VMaXN0LmNvbmNhdChncmFwaHNbaV0uZ2V0RWRnZXMoKSk7XG4gICAgfVxuXG4gICAgZWRnZUxpc3QgPSBlZGdlTGlzdC5jb25jYXQodGhpcy5lZGdlcyk7XG5cbiAgICB0aGlzLmFsbEVkZ2VzID0gZWRnZUxpc3Q7XG4gIH1cbiAgcmV0dXJuIHRoaXMuYWxsRWRnZXM7XG59O1xuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5nZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uO1xufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuc2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAobm9kZUxpc3QpXG57XG4gIGlmICh0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uICE9IG51bGwpIHtcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcbiAgfVxuXG4gIHRoaXMuYWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBub2RlTGlzdDtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldFJvb3QgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yb290R3JhcGg7XG59O1xuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5zZXRSb290R3JhcGggPSBmdW5jdGlvbiAoZ3JhcGgpXG57XG4gIGlmIChncmFwaC5nZXRHcmFwaE1hbmFnZXIoKSAhPSB0aGlzKSB7XG4gICAgdGhyb3cgXCJSb290IG5vdCBpbiB0aGlzIGdyYXBoIG1nciFcIjtcbiAgfVxuXG4gIHRoaXMucm9vdEdyYXBoID0gZ3JhcGg7XG4gIC8vIHJvb3QgZ3JhcGggbXVzdCBoYXZlIGEgcm9vdCBub2RlIGFzc29jaWF0ZWQgd2l0aCBpdCBmb3IgY29udmVuaWVuY2VcbiAgaWYgKGdyYXBoLnBhcmVudCA9PSBudWxsKVxuICB7XG4gICAgZ3JhcGgucGFyZW50ID0gdGhpcy5sYXlvdXQubmV3Tm9kZShcIlJvb3Qgbm9kZVwiKTtcbiAgfVxufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuZ2V0TGF5b3V0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMubGF5b3V0O1xufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuaXNPbmVBbmNlc3Rvck9mT3RoZXIgPSBmdW5jdGlvbiAoZmlyc3ROb2RlLCBzZWNvbmROb2RlKVxue1xuICBpZiAoIShmaXJzdE5vZGUgIT0gbnVsbCAmJiBzZWNvbmROb2RlICE9IG51bGwpKSB7XG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XG4gIH1cblxuICBpZiAoZmlyc3ROb2RlID09IHNlY29uZE5vZGUpXG4gIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICAvLyBJcyBzZWNvbmQgbm9kZSBhbiBhbmNlc3RvciBvZiB0aGUgZmlyc3Qgb25lP1xuICB2YXIgb3duZXJHcmFwaCA9IGZpcnN0Tm9kZS5nZXRPd25lcigpO1xuICB2YXIgcGFyZW50Tm9kZTtcblxuICBkb1xuICB7XG4gICAgcGFyZW50Tm9kZSA9IG93bmVyR3JhcGguZ2V0UGFyZW50KCk7XG5cbiAgICBpZiAocGFyZW50Tm9kZSA9PSBudWxsKVxuICAgIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChwYXJlbnROb2RlID09IHNlY29uZE5vZGUpXG4gICAge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgb3duZXJHcmFwaCA9IHBhcmVudE5vZGUuZ2V0T3duZXIoKTtcbiAgICBpZiAob3duZXJHcmFwaCA9PSBudWxsKVxuICAgIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSB3aGlsZSAodHJ1ZSk7XG4gIC8vIElzIGZpcnN0IG5vZGUgYW4gYW5jZXN0b3Igb2YgdGhlIHNlY29uZCBvbmU/XG4gIG93bmVyR3JhcGggPSBzZWNvbmROb2RlLmdldE93bmVyKCk7XG5cbiAgZG9cbiAge1xuICAgIHBhcmVudE5vZGUgPSBvd25lckdyYXBoLmdldFBhcmVudCgpO1xuXG4gICAgaWYgKHBhcmVudE5vZGUgPT0gbnVsbClcbiAgICB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGFyZW50Tm9kZSA9PSBmaXJzdE5vZGUpXG4gICAge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgb3duZXJHcmFwaCA9IHBhcmVudE5vZGUuZ2V0T3duZXIoKTtcbiAgICBpZiAob3duZXJHcmFwaCA9PSBudWxsKVxuICAgIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSB3aGlsZSAodHJ1ZSk7XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuY2FsY0xvd2VzdENvbW1vbkFuY2VzdG9ycyA9IGZ1bmN0aW9uICgpXG57XG4gIHZhciBlZGdlO1xuICB2YXIgc291cmNlTm9kZTtcbiAgdmFyIHRhcmdldE5vZGU7XG4gIHZhciBzb3VyY2VBbmNlc3RvckdyYXBoO1xuICB2YXIgdGFyZ2V0QW5jZXN0b3JHcmFwaDtcblxuICB2YXIgZWRnZXMgPSB0aGlzLmdldEFsbEVkZ2VzKCk7XG4gIHZhciBzID0gZWRnZXMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAge1xuICAgIGVkZ2UgPSBlZGdlc1tpXTtcblxuICAgIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZTtcbiAgICB0YXJnZXROb2RlID0gZWRnZS50YXJnZXQ7XG4gICAgZWRnZS5sY2EgPSBudWxsO1xuICAgIGVkZ2Uuc291cmNlSW5MY2EgPSBzb3VyY2VOb2RlO1xuICAgIGVkZ2UudGFyZ2V0SW5MY2EgPSB0YXJnZXROb2RlO1xuXG4gICAgaWYgKHNvdXJjZU5vZGUgPT0gdGFyZ2V0Tm9kZSlcbiAgICB7XG4gICAgICBlZGdlLmxjYSA9IHNvdXJjZU5vZGUuZ2V0T3duZXIoKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHNvdXJjZUFuY2VzdG9yR3JhcGggPSBzb3VyY2VOb2RlLmdldE93bmVyKCk7XG5cbiAgICB3aGlsZSAoZWRnZS5sY2EgPT0gbnVsbClcbiAgICB7XG4gICAgICB0YXJnZXRBbmNlc3RvckdyYXBoID0gdGFyZ2V0Tm9kZS5nZXRPd25lcigpO1xuXG4gICAgICB3aGlsZSAoZWRnZS5sY2EgPT0gbnVsbClcbiAgICAgIHtcbiAgICAgICAgaWYgKHRhcmdldEFuY2VzdG9yR3JhcGggPT0gc291cmNlQW5jZXN0b3JHcmFwaClcbiAgICAgICAge1xuICAgICAgICAgIGVkZ2UubGNhID0gdGFyZ2V0QW5jZXN0b3JHcmFwaDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0YXJnZXRBbmNlc3RvckdyYXBoID09IHRoaXMucm9vdEdyYXBoKVxuICAgICAgICB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZWRnZS5sY2EgIT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xuICAgICAgICB9XG4gICAgICAgIGVkZ2UudGFyZ2V0SW5MY2EgPSB0YXJnZXRBbmNlc3RvckdyYXBoLmdldFBhcmVudCgpO1xuICAgICAgICB0YXJnZXRBbmNlc3RvckdyYXBoID0gZWRnZS50YXJnZXRJbkxjYS5nZXRPd25lcigpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc291cmNlQW5jZXN0b3JHcmFwaCA9PSB0aGlzLnJvb3RHcmFwaClcbiAgICAgIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmIChlZGdlLmxjYSA9PSBudWxsKVxuICAgICAge1xuICAgICAgICBlZGdlLnNvdXJjZUluTGNhID0gc291cmNlQW5jZXN0b3JHcmFwaC5nZXRQYXJlbnQoKTtcbiAgICAgICAgc291cmNlQW5jZXN0b3JHcmFwaCA9IGVkZ2Uuc291cmNlSW5MY2EuZ2V0T3duZXIoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZWRnZS5sY2EgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XG4gICAgfVxuICB9XG59O1xuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5jYWxjTG93ZXN0Q29tbW9uQW5jZXN0b3IgPSBmdW5jdGlvbiAoZmlyc3ROb2RlLCBzZWNvbmROb2RlKVxue1xuICBpZiAoZmlyc3ROb2RlID09IHNlY29uZE5vZGUpXG4gIHtcbiAgICByZXR1cm4gZmlyc3ROb2RlLmdldE93bmVyKCk7XG4gIH1cbiAgdmFyIGZpcnN0T3duZXJHcmFwaCA9IGZpcnN0Tm9kZS5nZXRPd25lcigpO1xuXG4gIGRvXG4gIHtcbiAgICBpZiAoZmlyc3RPd25lckdyYXBoID09IG51bGwpXG4gICAge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHZhciBzZWNvbmRPd25lckdyYXBoID0gc2Vjb25kTm9kZS5nZXRPd25lcigpO1xuXG4gICAgZG9cbiAgICB7XG4gICAgICBpZiAoc2Vjb25kT3duZXJHcmFwaCA9PSBudWxsKVxuICAgICAge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYgKHNlY29uZE93bmVyR3JhcGggPT0gZmlyc3RPd25lckdyYXBoKVxuICAgICAge1xuICAgICAgICByZXR1cm4gc2Vjb25kT3duZXJHcmFwaDtcbiAgICAgIH1cbiAgICAgIHNlY29uZE93bmVyR3JhcGggPSBzZWNvbmRPd25lckdyYXBoLmdldFBhcmVudCgpLmdldE93bmVyKCk7XG4gICAgfSB3aGlsZSAodHJ1ZSk7XG5cbiAgICBmaXJzdE93bmVyR3JhcGggPSBmaXJzdE93bmVyR3JhcGguZ2V0UGFyZW50KCkuZ2V0T3duZXIoKTtcbiAgfSB3aGlsZSAodHJ1ZSk7XG5cbiAgcmV0dXJuIGZpcnN0T3duZXJHcmFwaDtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmNhbGNJbmNsdXNpb25UcmVlRGVwdGhzID0gZnVuY3Rpb24gKGdyYXBoLCBkZXB0aCkge1xuICBpZiAoZ3JhcGggPT0gbnVsbCAmJiBkZXB0aCA9PSBudWxsKSB7XG4gICAgZ3JhcGggPSB0aGlzLnJvb3RHcmFwaDtcbiAgICBkZXB0aCA9IDE7XG4gIH1cbiAgdmFyIG5vZGU7XG5cbiAgdmFyIG5vZGVzID0gZ3JhcGguZ2V0Tm9kZXMoKTtcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxuICB7XG4gICAgbm9kZSA9IG5vZGVzW2ldO1xuICAgIG5vZGUuaW5jbHVzaW9uVHJlZURlcHRoID0gZGVwdGg7XG5cbiAgICBpZiAobm9kZS5jaGlsZCAhPSBudWxsKVxuICAgIHtcbiAgICAgIHRoaXMuY2FsY0luY2x1c2lvblRyZWVEZXB0aHMobm9kZS5jaGlsZCwgZGVwdGggKyAxKTtcbiAgICB9XG4gIH1cbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmluY2x1ZGVzSW52YWxpZEVkZ2UgPSBmdW5jdGlvbiAoKVxue1xuICB2YXIgZWRnZTtcblxuICB2YXIgcyA9IHRoaXMuZWRnZXMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAge1xuICAgIGVkZ2UgPSB0aGlzLmVkZ2VzW2ldO1xuXG4gICAgaWYgKHRoaXMuaXNPbmVBbmNlc3Rvck9mT3RoZXIoZWRnZS5zb3VyY2UsIGVkZ2UudGFyZ2V0KSlcbiAgICB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMR3JhcGhNYW5hZ2VyO1xuIiwiZnVuY3Rpb24gTEdyYXBoT2JqZWN0KHZHcmFwaE9iamVjdCkge1xuICB0aGlzLnZHcmFwaE9iamVjdCA9IHZHcmFwaE9iamVjdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMR3JhcGhPYmplY3Q7XG4iLCJ2YXIgTEdyYXBoT2JqZWN0ID0gcmVxdWlyZSgnLi9MR3JhcGhPYmplY3QnKTtcbnZhciBJbnRlZ2VyID0gcmVxdWlyZSgnLi9JbnRlZ2VyJyk7XG52YXIgUmVjdGFuZ2xlRCA9IHJlcXVpcmUoJy4vUmVjdGFuZ2xlRCcpO1xudmFyIExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vTGF5b3V0Q29uc3RhbnRzJyk7XG52YXIgUmFuZG9tU2VlZCA9IHJlcXVpcmUoJy4vUmFuZG9tU2VlZCcpO1xudmFyIFBvaW50RCA9IHJlcXVpcmUoJy4vUG9pbnREJyk7XG5cbmZ1bmN0aW9uIExOb2RlKGdtLCBsb2MsIHNpemUsIHZOb2RlKSB7XG4gIC8vQWx0ZXJuYXRpdmUgY29uc3RydWN0b3IgMSA6IExOb2RlKExHcmFwaE1hbmFnZXIgZ20sIFBvaW50IGxvYywgRGltZW5zaW9uIHNpemUsIE9iamVjdCB2Tm9kZSlcbiAgaWYgKHNpemUgPT0gbnVsbCAmJiB2Tm9kZSA9PSBudWxsKSB7XG4gICAgdk5vZGUgPSBsb2M7XG4gIH1cblxuICBMR3JhcGhPYmplY3QuY2FsbCh0aGlzLCB2Tm9kZSk7XG5cbiAgLy9BbHRlcm5hdGl2ZSBjb25zdHJ1Y3RvciAyIDogTE5vZGUoTGF5b3V0IGxheW91dCwgT2JqZWN0IHZOb2RlKVxuICBpZiAoZ20uZ3JhcGhNYW5hZ2VyICE9IG51bGwpXG4gICAgZ20gPSBnbS5ncmFwaE1hbmFnZXI7XG5cbiAgdGhpcy5lc3RpbWF0ZWRTaXplID0gSW50ZWdlci5NSU5fVkFMVUU7XG4gIHRoaXMuaW5jbHVzaW9uVHJlZURlcHRoID0gSW50ZWdlci5NQVhfVkFMVUU7XG4gIHRoaXMudkdyYXBoT2JqZWN0ID0gdk5vZGU7XG4gIHRoaXMuZWRnZXMgPSBbXTtcbiAgdGhpcy5ncmFwaE1hbmFnZXIgPSBnbTtcblxuICBpZiAoc2l6ZSAhPSBudWxsICYmIGxvYyAhPSBudWxsKVxuICAgIHRoaXMucmVjdCA9IG5ldyBSZWN0YW5nbGVEKGxvYy54LCBsb2MueSwgc2l6ZS53aWR0aCwgc2l6ZS5oZWlnaHQpO1xuICBlbHNlXG4gICAgdGhpcy5yZWN0ID0gbmV3IFJlY3RhbmdsZUQoKTtcbn1cblxuTE5vZGUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGhPYmplY3QucHJvdG90eXBlKTtcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoT2JqZWN0KSB7XG4gIExOb2RlW3Byb3BdID0gTEdyYXBoT2JqZWN0W3Byb3BdO1xufVxuXG5MTm9kZS5wcm90b3R5cGUuZ2V0RWRnZXMgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5lZGdlcztcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRDaGlsZCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmNoaWxkO1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldE93bmVyID0gZnVuY3Rpb24gKClcbntcbiAgaWYgKHRoaXMub3duZXIgIT0gbnVsbCkge1xuICAgIGlmICghKHRoaXMub3duZXIgPT0gbnVsbCB8fCB0aGlzLm93bmVyLmdldE5vZGVzKCkuaW5kZXhPZih0aGlzKSA+IC0xKSkge1xuICAgICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXMub3duZXI7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0V2lkdGggPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yZWN0LndpZHRoO1xufTtcblxuTE5vZGUucHJvdG90eXBlLnNldFdpZHRoID0gZnVuY3Rpb24gKHdpZHRoKVxue1xuICB0aGlzLnJlY3Qud2lkdGggPSB3aWR0aDtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRIZWlnaHQgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yZWN0LmhlaWdodDtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbiAoaGVpZ2h0KVxue1xuICB0aGlzLnJlY3QuaGVpZ2h0ID0gaGVpZ2h0O1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldENlbnRlclggPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yZWN0LnggKyB0aGlzLnJlY3Qud2lkdGggLyAyO1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldENlbnRlclkgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yZWN0LnkgKyB0aGlzLnJlY3QuaGVpZ2h0IC8gMjtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRDZW50ZXIgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gbmV3IFBvaW50RCh0aGlzLnJlY3QueCArIHRoaXMucmVjdC53aWR0aCAvIDIsXG4gICAgICAgICAgdGhpcy5yZWN0LnkgKyB0aGlzLnJlY3QuaGVpZ2h0IC8gMik7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0TG9jYXRpb24gPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gbmV3IFBvaW50RCh0aGlzLnJlY3QueCwgdGhpcy5yZWN0LnkpO1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldFJlY3QgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yZWN0O1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldERpYWdvbmFsID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIE1hdGguc3FydCh0aGlzLnJlY3Qud2lkdGggKiB0aGlzLnJlY3Qud2lkdGggK1xuICAgICAgICAgIHRoaXMucmVjdC5oZWlnaHQgKiB0aGlzLnJlY3QuaGVpZ2h0KTtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5zZXRSZWN0ID0gZnVuY3Rpb24gKHVwcGVyTGVmdCwgZGltZW5zaW9uKVxue1xuICB0aGlzLnJlY3QueCA9IHVwcGVyTGVmdC54O1xuICB0aGlzLnJlY3QueSA9IHVwcGVyTGVmdC55O1xuICB0aGlzLnJlY3Qud2lkdGggPSBkaW1lbnNpb24ud2lkdGg7XG4gIHRoaXMucmVjdC5oZWlnaHQgPSBkaW1lbnNpb24uaGVpZ2h0O1xufTtcblxuTE5vZGUucHJvdG90eXBlLnNldENlbnRlciA9IGZ1bmN0aW9uIChjeCwgY3kpXG57XG4gIHRoaXMucmVjdC54ID0gY3ggLSB0aGlzLnJlY3Qud2lkdGggLyAyO1xuICB0aGlzLnJlY3QueSA9IGN5IC0gdGhpcy5yZWN0LmhlaWdodCAvIDI7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuc2V0TG9jYXRpb24gPSBmdW5jdGlvbiAoeCwgeSlcbntcbiAgdGhpcy5yZWN0LnggPSB4O1xuICB0aGlzLnJlY3QueSA9IHk7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUubW92ZUJ5ID0gZnVuY3Rpb24gKGR4LCBkeSlcbntcbiAgdGhpcy5yZWN0LnggKz0gZHg7XG4gIHRoaXMucmVjdC55ICs9IGR5O1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldEVkZ2VMaXN0VG9Ob2RlID0gZnVuY3Rpb24gKHRvKVxue1xuICB2YXIgZWRnZUxpc3QgPSBbXTtcbiAgdmFyIGVkZ2U7XG5cbiAgZm9yICh2YXIgb2JqIGluIHRoaXMuZWRnZXMpXG4gIHtcbiAgICBlZGdlID0gb2JqO1xuXG4gICAgaWYgKGVkZ2UudGFyZ2V0ID09IHRvKVxuICAgIHtcbiAgICAgIGlmIChlZGdlLnNvdXJjZSAhPSB0aGlzKVxuICAgICAgICB0aHJvdyBcIkluY29ycmVjdCBlZGdlIHNvdXJjZSFcIjtcblxuICAgICAgZWRnZUxpc3QucHVzaChlZGdlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZWRnZUxpc3Q7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0RWRnZXNCZXR3ZWVuID0gZnVuY3Rpb24gKG90aGVyKVxue1xuICB2YXIgZWRnZUxpc3QgPSBbXTtcbiAgdmFyIGVkZ2U7XG5cbiAgZm9yICh2YXIgb2JqIGluIHRoaXMuZWRnZXMpXG4gIHtcbiAgICBlZGdlID0gdGhpcy5lZGdlc1tvYmpdO1xuXG4gICAgaWYgKCEoZWRnZS5zb3VyY2UgPT0gdGhpcyB8fCBlZGdlLnRhcmdldCA9PSB0aGlzKSlcbiAgICAgIHRocm93IFwiSW5jb3JyZWN0IGVkZ2Ugc291cmNlIGFuZC9vciB0YXJnZXRcIjtcblxuICAgIGlmICgoZWRnZS50YXJnZXQgPT0gb3RoZXIpIHx8IChlZGdlLnNvdXJjZSA9PSBvdGhlcikpXG4gICAge1xuICAgICAgZWRnZUxpc3QucHVzaChlZGdlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZWRnZUxpc3Q7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0TmVpZ2hib3JzTGlzdCA9IGZ1bmN0aW9uICgpXG57XG4gIHZhciBuZWlnaGJvcnMgPSBuZXcgSGFzaFNldCgpO1xuICB2YXIgZWRnZTtcblxuICBmb3IgKHZhciBvYmogaW4gdGhpcy5lZGdlcylcbiAge1xuICAgIGVkZ2UgPSB0aGlzLmVkZ2VzW29ial07XG5cbiAgICBpZiAoZWRnZS5zb3VyY2UgPT0gdGhpcylcbiAgICB7XG4gICAgICBuZWlnaGJvcnMuYWRkKGVkZ2UudGFyZ2V0KTtcbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIGlmICghZWRnZS50YXJnZXQgPT0gdGhpcylcbiAgICAgICAgdGhyb3cgXCJJbmNvcnJlY3QgaW5jaWRlbmN5IVwiO1xuICAgICAgbmVpZ2hib3JzLmFkZChlZGdlLnNvdXJjZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5laWdoYm9ycztcbn07XG5cbkxOb2RlLnByb3RvdHlwZS53aXRoQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKVxue1xuICB2YXIgd2l0aE5laWdoYm9yc0xpc3QgPSBbXTtcbiAgdmFyIGNoaWxkTm9kZTtcblxuICB3aXRoTmVpZ2hib3JzTGlzdC5wdXNoKHRoaXMpO1xuXG4gIGlmICh0aGlzLmNoaWxkICE9IG51bGwpXG4gIHtcbiAgICB2YXIgbm9kZXMgPSB0aGlzLmNoaWxkLmdldE5vZGVzKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICBjaGlsZE5vZGUgPSBub2Rlc1tpXTtcblxuICAgICAgd2l0aE5laWdoYm9yc0xpc3QgPSB3aXRoTmVpZ2hib3JzTGlzdC5jb25jYXQoY2hpbGROb2RlLndpdGhDaGlsZHJlbigpKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gd2l0aE5laWdoYm9yc0xpc3Q7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0RXN0aW1hdGVkU2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuZXN0aW1hdGVkU2l6ZSA9PSBJbnRlZ2VyLk1JTl9WQUxVRSkge1xuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xuICB9XG4gIHJldHVybiB0aGlzLmVzdGltYXRlZFNpemU7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuY2FsY0VzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmNoaWxkID09IG51bGwpXG4gIHtcbiAgICByZXR1cm4gdGhpcy5lc3RpbWF0ZWRTaXplID0gTWF0aC5mbG9vcigodGhpcy5yZWN0LndpZHRoICsgdGhpcy5yZWN0LmhlaWdodCkgLyAyKTtcbiAgfVxuICBlbHNlXG4gIHtcbiAgICB0aGlzLmVzdGltYXRlZFNpemUgPSB0aGlzLmNoaWxkLmNhbGNFc3RpbWF0ZWRTaXplKCk7XG4gICAgdGhpcy5yZWN0LndpZHRoID0gdGhpcy5lc3RpbWF0ZWRTaXplO1xuICAgIHRoaXMucmVjdC5oZWlnaHQgPSB0aGlzLmVzdGltYXRlZFNpemU7XG5cbiAgICByZXR1cm4gdGhpcy5lc3RpbWF0ZWRTaXplO1xuICB9XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuc2NhdHRlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJhbmRvbUNlbnRlclg7XG4gIHZhciByYW5kb21DZW50ZXJZO1xuXG4gIHZhciBtaW5YID0gLUxheW91dENvbnN0YW50cy5JTklUSUFMX1dPUkxEX0JPVU5EQVJZO1xuICB2YXIgbWF4WCA9IExheW91dENvbnN0YW50cy5JTklUSUFMX1dPUkxEX0JPVU5EQVJZO1xuICByYW5kb21DZW50ZXJYID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9YICtcbiAgICAgICAgICAoUmFuZG9tU2VlZC5uZXh0RG91YmxlKCkgKiAobWF4WCAtIG1pblgpKSArIG1pblg7XG5cbiAgdmFyIG1pblkgPSAtTGF5b3V0Q29uc3RhbnRzLklOSVRJQUxfV09STERfQk9VTkRBUlk7XG4gIHZhciBtYXhZID0gTGF5b3V0Q29uc3RhbnRzLklOSVRJQUxfV09STERfQk9VTkRBUlk7XG4gIHJhbmRvbUNlbnRlclkgPSBMYXlvdXRDb25zdGFudHMuV09STERfQ0VOVEVSX1kgK1xuICAgICAgICAgIChSYW5kb21TZWVkLm5leHREb3VibGUoKSAqIChtYXhZIC0gbWluWSkpICsgbWluWTtcblxuICB0aGlzLnJlY3QueCA9IHJhbmRvbUNlbnRlclg7XG4gIHRoaXMucmVjdC55ID0gcmFuZG9tQ2VudGVyWVxufTtcblxuTE5vZGUucHJvdG90eXBlLnVwZGF0ZUJvdW5kcyA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuZ2V0Q2hpbGQoKSA9PSBudWxsKSB7XG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XG4gIH1cbiAgaWYgKHRoaXMuZ2V0Q2hpbGQoKS5nZXROb2RlcygpLmxlbmd0aCAhPSAwKVxuICB7XG4gICAgLy8gd3JhcCB0aGUgY2hpbGRyZW4gbm9kZXMgYnkgcmUtYXJyYW5naW5nIHRoZSBib3VuZGFyaWVzXG4gICAgdmFyIGNoaWxkR3JhcGggPSB0aGlzLmdldENoaWxkKCk7XG4gICAgY2hpbGRHcmFwaC51cGRhdGVCb3VuZHModHJ1ZSk7XG5cbiAgICB0aGlzLnJlY3QueCA9IGNoaWxkR3JhcGguZ2V0TGVmdCgpO1xuICAgIHRoaXMucmVjdC55ID0gY2hpbGRHcmFwaC5nZXRUb3AoKTtcblxuICAgIHRoaXMuc2V0V2lkdGgoY2hpbGRHcmFwaC5nZXRSaWdodCgpIC0gY2hpbGRHcmFwaC5nZXRMZWZ0KCkgK1xuICAgICAgICAgICAgMiAqIExheW91dENvbnN0YW50cy5DT01QT1VORF9OT0RFX01BUkdJTik7XG4gICAgdGhpcy5zZXRIZWlnaHQoY2hpbGRHcmFwaC5nZXRCb3R0b20oKSAtIGNoaWxkR3JhcGguZ2V0VG9wKCkgK1xuICAgICAgICAgICAgMiAqIExheW91dENvbnN0YW50cy5DT01QT1VORF9OT0RFX01BUkdJTiArXG4gICAgICAgICAgICBMYXlvdXRDb25zdGFudHMuTEFCRUxfSEVJR0hUKTtcbiAgfVxufTtcblxuTE5vZGUucHJvdG90eXBlLmdldEluY2x1c2lvblRyZWVEZXB0aCA9IGZ1bmN0aW9uICgpXG57XG4gIGlmICh0aGlzLmluY2x1c2lvblRyZWVEZXB0aCA9PSBJbnRlZ2VyLk1BWF9WQUxVRSkge1xuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xuICB9XG4gIHJldHVybiB0aGlzLmluY2x1c2lvblRyZWVEZXB0aDtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAodHJhbnMpXG57XG4gIHZhciBsZWZ0ID0gdGhpcy5yZWN0Lng7XG5cbiAgaWYgKGxlZnQgPiBMYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlkpXG4gIHtcbiAgICBsZWZ0ID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZO1xuICB9XG4gIGVsc2UgaWYgKGxlZnQgPCAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxuICB7XG4gICAgbGVmdCA9IC1MYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlk7XG4gIH1cblxuICB2YXIgdG9wID0gdGhpcy5yZWN0Lnk7XG5cbiAgaWYgKHRvcCA+IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSlcbiAge1xuICAgIHRvcCA9IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWTtcbiAgfVxuICBlbHNlIGlmICh0b3AgPCAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxuICB7XG4gICAgdG9wID0gLUxheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWTtcbiAgfVxuXG4gIHZhciBsZWZ0VG9wID0gbmV3IFBvaW50RChsZWZ0LCB0b3ApO1xuICB2YXIgdkxlZnRUb3AgPSB0cmFucy5pbnZlcnNlVHJhbnNmb3JtUG9pbnQobGVmdFRvcCk7XG5cbiAgdGhpcy5zZXRMb2NhdGlvbih2TGVmdFRvcC54LCB2TGVmdFRvcC55KTtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRMZWZ0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMucmVjdC54O1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldFJpZ2h0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMucmVjdC54ICsgdGhpcy5yZWN0LndpZHRoO1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldFRvcCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnJlY3QueTtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRCb3R0b20gPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yZWN0LnkgKyB0aGlzLnJlY3QuaGVpZ2h0O1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldFBhcmVudCA9IGZ1bmN0aW9uICgpXG57XG4gIGlmICh0aGlzLm93bmVyID09IG51bGwpXG4gIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLm93bmVyLmdldFBhcmVudCgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMTm9kZTtcbiIsInZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xudmFyIEhhc2hNYXAgPSByZXF1aXJlKCcuL0hhc2hNYXAnKTtcbnZhciBMR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9MR3JhcGhNYW5hZ2VyJyk7XG52YXIgTE5vZGUgPSByZXF1aXJlKCcuL0xOb2RlJyk7XG52YXIgTEVkZ2UgPSByZXF1aXJlKCcuL0xFZGdlJyk7XG52YXIgTEdyYXBoID0gcmVxdWlyZSgnLi9MR3JhcGgnKTtcbnZhciBQb2ludEQgPSByZXF1aXJlKCcuL1BvaW50RCcpO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyk7XG5cbmZ1bmN0aW9uIExheW91dChpc1JlbW90ZVVzZSkge1xuICAvL0xheW91dCBRdWFsaXR5OiAwOnByb29mLCAxOmRlZmF1bHQsIDI6ZHJhZnRcbiAgdGhpcy5sYXlvdXRRdWFsaXR5ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUVVBTElUWTtcbiAgLy9XaGV0aGVyIGxheW91dCBzaG91bGQgY3JlYXRlIGJlbmRwb2ludHMgYXMgbmVlZGVkIG9yIG5vdFxuICB0aGlzLmNyZWF0ZUJlbmRzQXNOZWVkZWQgPVxuICAgICAgICAgIExheW91dENvbnN0YW50cy5ERUZBVUxUX0NSRUFURV9CRU5EU19BU19ORUVERUQ7XG4gIC8vV2hldGhlciBsYXlvdXQgc2hvdWxkIGJlIGluY3JlbWVudGFsIG9yIG5vdFxuICB0aGlzLmluY3JlbWVudGFsID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUw7XG4gIC8vV2hldGhlciB3ZSBhbmltYXRlIGZyb20gYmVmb3JlIHRvIGFmdGVyIGxheW91dCBub2RlIHBvc2l0aW9uc1xuICB0aGlzLmFuaW1hdGlvbk9uTGF5b3V0ID1cbiAgICAgICAgICBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fT05fTEFZT1VUO1xuICAvL1doZXRoZXIgd2UgYW5pbWF0ZSB0aGUgbGF5b3V0IHByb2Nlc3Mgb3Igbm90XG4gIHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX0RVUklOR19MQVlPVVQ7XG4gIC8vTnVtYmVyIGl0ZXJhdGlvbnMgdGhhdCBzaG91bGQgYmUgZG9uZSBiZXR3ZWVuIHR3byBzdWNjZXNzaXZlIGFuaW1hdGlvbnNcbiAgdGhpcy5hbmltYXRpb25QZXJpb2QgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fUEVSSU9EO1xuICAvKipcbiAgICogV2hldGhlciBvciBub3QgbGVhZiBub2RlcyAobm9uLWNvbXBvdW5kIG5vZGVzKSBhcmUgb2YgdW5pZm9ybSBzaXplcy4gV2hlblxuICAgKiB0aGV5IGFyZSwgYm90aCBzcHJpbmcgYW5kIHJlcHVsc2lvbiBmb3JjZXMgYmV0d2VlbiB0d28gbGVhZiBub2RlcyBjYW4gYmVcbiAgICogY2FsY3VsYXRlZCB3aXRob3V0IHRoZSBleHBlbnNpdmUgY2xpcHBpbmcgcG9pbnQgY2FsY3VsYXRpb25zLCByZXN1bHRpbmdcbiAgICogaW4gbWFqb3Igc3BlZWQtdXAuXG4gICAqL1xuICB0aGlzLnVuaWZvcm1MZWFmTm9kZVNpemVzID1cbiAgICAgICAgICBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VTklGT1JNX0xFQUZfTk9ERV9TSVpFUztcbiAgLyoqXG4gICAqIFRoaXMgaXMgdXNlZCBmb3IgY3JlYXRpb24gb2YgYmVuZHBvaW50cyBieSB1c2luZyBkdW1teSBub2RlcyBhbmQgZWRnZXMuXG4gICAqIE1hcHMgYW4gTEVkZ2UgdG8gaXRzIGR1bW15IGJlbmRwb2ludCBwYXRoLlxuICAgKi9cbiAgdGhpcy5lZGdlVG9EdW1teU5vZGVzID0gbmV3IEhhc2hNYXAoKTtcbiAgdGhpcy5ncmFwaE1hbmFnZXIgPSBuZXcgTEdyYXBoTWFuYWdlcih0aGlzKTtcbiAgdGhpcy5pc0xheW91dEZpbmlzaGVkID0gZmFsc2U7XG4gIHRoaXMuaXNTdWJMYXlvdXQgPSBmYWxzZTtcbiAgdGhpcy5pc1JlbW90ZVVzZSA9IGZhbHNlO1xuXG4gIGlmIChpc1JlbW90ZVVzZSAhPSBudWxsKSB7XG4gICAgdGhpcy5pc1JlbW90ZVVzZSA9IGlzUmVtb3RlVXNlO1xuICB9XG59XG5cbkxheW91dC5SQU5ET01fU0VFRCA9IDE7XG5cbkxheW91dC5wcm90b3R5cGUuZ2V0R3JhcGhNYW5hZ2VyID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXI7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLmdldEFsbE5vZGVzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsTm9kZXMoKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUuZ2V0QWxsRWRnZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxFZGdlcygpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZS5nZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uKCk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLm5ld0dyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGdtID0gbmV3IExHcmFwaE1hbmFnZXIodGhpcyk7XG4gIHRoaXMuZ3JhcGhNYW5hZ2VyID0gZ207XG4gIHJldHVybiBnbTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUubmV3R3JhcGggPSBmdW5jdGlvbiAodkdyYXBoKVxue1xuICByZXR1cm4gbmV3IExHcmFwaChudWxsLCB0aGlzLmdyYXBoTWFuYWdlciwgdkdyYXBoKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUubmV3Tm9kZSA9IGZ1bmN0aW9uICh2Tm9kZSlcbntcbiAgcmV0dXJuIG5ldyBMTm9kZSh0aGlzLmdyYXBoTWFuYWdlciwgdk5vZGUpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZS5uZXdFZGdlID0gZnVuY3Rpb24gKHZFZGdlKVxue1xuICByZXR1cm4gbmV3IExFZGdlKG51bGwsIG51bGwsIHZFZGdlKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUucnVuTGF5b3V0ID0gZnVuY3Rpb24gKClcbntcbiAgdGhpcy5pc0xheW91dEZpbmlzaGVkID0gZmFsc2U7XG5cbiAgdGhpcy5pbml0UGFyYW1ldGVycygpO1xuICB2YXIgaXNMYXlvdXRTdWNjZXNzZnVsbDtcblxuICBpZiAoKHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKSA9PSBudWxsKVxuICAgICAgICAgIHx8IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXROb2RlcygpLmxlbmd0aCA9PSAwXG4gICAgICAgICAgfHwgdGhpcy5ncmFwaE1hbmFnZXIuaW5jbHVkZXNJbnZhbGlkRWRnZSgpKVxuICB7XG4gICAgaXNMYXlvdXRTdWNjZXNzZnVsbCA9IGZhbHNlO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIC8vIGNhbGN1bGF0ZSBleGVjdXRpb24gdGltZVxuICAgIHZhciBzdGFydFRpbWUgPSAwO1xuXG4gICAgaWYgKCF0aGlzLmlzU3ViTGF5b3V0KVxuICAgIHtcbiAgICAgIHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgfVxuXG4gICAgaXNMYXlvdXRTdWNjZXNzZnVsbCA9IHRoaXMubGF5b3V0KCk7XG5cbiAgICBpZiAoIXRoaXMuaXNTdWJMYXlvdXQpXG4gICAge1xuICAgICAgdmFyIGVuZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIHZhciBleGNUaW1lID0gZW5kVGltZSAtIHN0YXJ0VGltZTtcblxuICAgICAgY29uc29sZS5sb2coXCJUb3RhbCBleGVjdXRpb24gdGltZTogXCIgKyBleGNUaW1lICsgXCIgbWlsaXNlY29uZHMuXCIpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChpc0xheW91dFN1Y2Nlc3NmdWxsKVxuICB7XG4gICAgaWYgKCF0aGlzLmlzU3ViTGF5b3V0KVxuICAgIHtcbiAgICAgIHRoaXMuZG9Qb3N0TGF5b3V0KCk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy5pc0xheW91dEZpbmlzaGVkID0gdHJ1ZTtcblxuICByZXR1cm4gaXNMYXlvdXRTdWNjZXNzZnVsbDtcbn07XG5cbi8qKlxuICogVGhpcyBtZXRob2QgcGVyZm9ybXMgdGhlIG9wZXJhdGlvbnMgcmVxdWlyZWQgYWZ0ZXIgbGF5b3V0LlxuICovXG5MYXlvdXQucHJvdG90eXBlLmRvUG9zdExheW91dCA9IGZ1bmN0aW9uICgpXG57XG4gIC8vYXNzZXJ0ICFpc1N1YkxheW91dCA6IFwiU2hvdWxkIG5vdCBiZSBjYWxsZWQgb24gc3ViLWxheW91dCFcIjtcbiAgLy8gUHJvcGFnYXRlIGdlb21ldHJpYyBjaGFuZ2VzIHRvIHYtbGV2ZWwgb2JqZWN0c1xuICB0aGlzLnRyYW5zZm9ybSgpO1xuICB0aGlzLnVwZGF0ZSgpO1xufTtcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCB1cGRhdGVzIHRoZSBnZW9tZXRyeSBvZiB0aGUgdGFyZ2V0IGdyYXBoIGFjY29yZGluZyB0b1xuICogY2FsY3VsYXRlZCBsYXlvdXQuXG4gKi9cbkxheW91dC5wcm90b3R5cGUudXBkYXRlMiA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gdXBkYXRlIGJlbmQgcG9pbnRzXG4gIGlmICh0aGlzLmNyZWF0ZUJlbmRzQXNOZWVkZWQpXG4gIHtcbiAgICB0aGlzLmNyZWF0ZUJlbmRwb2ludHNGcm9tRHVtbXlOb2RlcygpO1xuXG4gICAgLy8gcmVzZXQgYWxsIGVkZ2VzLCBzaW5jZSB0aGUgdG9wb2xvZ3kgaGFzIGNoYW5nZWRcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZXNldEFsbEVkZ2VzKCk7XG4gIH1cblxuICAvLyBwZXJmb3JtIGVkZ2UsIG5vZGUgYW5kIHJvb3QgdXBkYXRlcyBpZiBsYXlvdXQgaXMgbm90IGNhbGxlZFxuICAvLyByZW1vdGVseVxuICBpZiAoIXRoaXMuaXNSZW1vdGVVc2UpXG4gIHtcbiAgICAvLyB1cGRhdGUgYWxsIGVkZ2VzXG4gICAgdmFyIGVkZ2U7XG4gICAgdmFyIGFsbEVkZ2VzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsRWRnZXMoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbEVkZ2VzLmxlbmd0aDsgaSsrKVxuICAgIHtcbiAgICAgIGVkZ2UgPSBhbGxFZGdlc1tpXTtcbi8vICAgICAgdGhpcy51cGRhdGUoZWRnZSk7XG4gICAgfVxuXG4gICAgLy8gcmVjdXJzaXZlbHkgdXBkYXRlIG5vZGVzXG4gICAgdmFyIG5vZGU7XG4gICAgdmFyIG5vZGVzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmdldE5vZGVzKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICBub2RlID0gbm9kZXNbaV07XG4vLyAgICAgIHRoaXMudXBkYXRlKG5vZGUpO1xuICAgIH1cblxuICAgIC8vIHVwZGF0ZSByb290IGdyYXBoXG4gICAgdGhpcy51cGRhdGUodGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpKTtcbiAgfVxufTtcblxuTGF5b3V0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAob2JqKSB7XG4gIGlmIChvYmogPT0gbnVsbCkge1xuICAgIHRoaXMudXBkYXRlMigpO1xuICB9XG4gIGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIExOb2RlKSB7XG4gICAgdmFyIG5vZGUgPSBvYmo7XG4gICAgaWYgKG5vZGUuZ2V0Q2hpbGQoKSAhPSBudWxsKVxuICAgIHtcbiAgICAgIC8vIHNpbmNlIG5vZGUgaXMgY29tcG91bmQsIHJlY3Vyc2l2ZWx5IHVwZGF0ZSBjaGlsZCBub2Rlc1xuICAgICAgdmFyIG5vZGVzID0gbm9kZS5nZXRDaGlsZCgpLmdldE5vZGVzKCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxuICAgICAge1xuICAgICAgICB1cGRhdGUobm9kZXNbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGlmIHRoZSBsLWxldmVsIG5vZGUgaXMgYXNzb2NpYXRlZCB3aXRoIGEgdi1sZXZlbCBncmFwaCBvYmplY3QsXG4gICAgLy8gdGhlbiBpdCBpcyBhc3N1bWVkIHRoYXQgdGhlIHYtbGV2ZWwgbm9kZSBpbXBsZW1lbnRzIHRoZVxuICAgIC8vIGludGVyZmFjZSBVcGRhdGFibGUuXG4gICAgaWYgKG5vZGUudkdyYXBoT2JqZWN0ICE9IG51bGwpXG4gICAge1xuICAgICAgLy8gY2FzdCB0byBVcGRhdGFibGUgd2l0aG91dCBhbnkgdHlwZSBjaGVja1xuICAgICAgdmFyIHZOb2RlID0gbm9kZS52R3JhcGhPYmplY3Q7XG5cbiAgICAgIC8vIGNhbGwgdGhlIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGludGVyZmFjZVxuICAgICAgdk5vZGUudXBkYXRlKG5vZGUpO1xuICAgIH1cbiAgfVxuICBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBMRWRnZSkge1xuICAgIHZhciBlZGdlID0gb2JqO1xuICAgIC8vIGlmIHRoZSBsLWxldmVsIGVkZ2UgaXMgYXNzb2NpYXRlZCB3aXRoIGEgdi1sZXZlbCBncmFwaCBvYmplY3QsXG4gICAgLy8gdGhlbiBpdCBpcyBhc3N1bWVkIHRoYXQgdGhlIHYtbGV2ZWwgZWRnZSBpbXBsZW1lbnRzIHRoZVxuICAgIC8vIGludGVyZmFjZSBVcGRhdGFibGUuXG5cbiAgICBpZiAoZWRnZS52R3JhcGhPYmplY3QgIT0gbnVsbClcbiAgICB7XG4gICAgICAvLyBjYXN0IHRvIFVwZGF0YWJsZSB3aXRob3V0IGFueSB0eXBlIGNoZWNrXG4gICAgICB2YXIgdkVkZ2UgPSBlZGdlLnZHcmFwaE9iamVjdDtcblxuICAgICAgLy8gY2FsbCB0aGUgdXBkYXRlIG1ldGhvZCBvZiB0aGUgaW50ZXJmYWNlXG4gICAgICB2RWRnZS51cGRhdGUoZWRnZSk7XG4gICAgfVxuICB9XG4gIGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIExHcmFwaCkge1xuICAgIHZhciBncmFwaCA9IG9iajtcbiAgICAvLyBpZiB0aGUgbC1sZXZlbCBncmFwaCBpcyBhc3NvY2lhdGVkIHdpdGggYSB2LWxldmVsIGdyYXBoIG9iamVjdCxcbiAgICAvLyB0aGVuIGl0IGlzIGFzc3VtZWQgdGhhdCB0aGUgdi1sZXZlbCBvYmplY3QgaW1wbGVtZW50cyB0aGVcbiAgICAvLyBpbnRlcmZhY2UgVXBkYXRhYmxlLlxuXG4gICAgaWYgKGdyYXBoLnZHcmFwaE9iamVjdCAhPSBudWxsKVxuICAgIHtcbiAgICAgIC8vIGNhc3QgdG8gVXBkYXRhYmxlIHdpdGhvdXQgYW55IHR5cGUgY2hlY2tcbiAgICAgIHZhciB2R3JhcGggPSBncmFwaC52R3JhcGhPYmplY3Q7XG5cbiAgICAgIC8vIGNhbGwgdGhlIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGludGVyZmFjZVxuICAgICAgdkdyYXBoLnVwZGF0ZShncmFwaCk7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIGlzIHVzZWQgdG8gc2V0IGFsbCBsYXlvdXQgcGFyYW1ldGVycyB0byBkZWZhdWx0IHZhbHVlc1xuICogZGV0ZXJtaW5lZCBhdCBjb21waWxlIHRpbWUuXG4gKi9cbkxheW91dC5wcm90b3R5cGUuaW5pdFBhcmFtZXRlcnMgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghdGhpcy5pc1N1YkxheW91dClcbiAge1xuICAgIHRoaXMubGF5b3V0UXVhbGl0eSA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX1FVQUxJVFk7XG4gICAgdGhpcy5hbmltYXRpb25EdXJpbmdMYXlvdXQgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fT05fTEFZT1VUO1xuICAgIHRoaXMuYW5pbWF0aW9uUGVyaW9kID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX1BFUklPRDtcbiAgICB0aGlzLmFuaW1hdGlvbk9uTGF5b3V0ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX0RVUklOR19MQVlPVVQ7XG4gICAgdGhpcy5pbmNyZW1lbnRhbCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMO1xuICAgIHRoaXMuY3JlYXRlQmVuZHNBc05lZWRlZCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0NSRUFURV9CRU5EU19BU19ORUVERUQ7XG4gICAgdGhpcy51bmlmb3JtTGVhZk5vZGVTaXplcyA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX1VOSUZPUk1fTEVBRl9OT0RFX1NJWkVTO1xuICB9XG5cbiAgaWYgKHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0KVxuICB7XG4gICAgYW5pbWF0aW9uT25MYXlvdXQgPSBmYWxzZTtcbiAgfVxufTtcblxuTGF5b3V0LnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAobmV3TGVmdFRvcCkge1xuICBpZiAobmV3TGVmdFRvcCA9PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLnRyYW5zZm9ybShuZXcgUG9pbnREKDAsIDApKTtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBjcmVhdGUgYSB0cmFuc2Zvcm1hdGlvbiBvYmplY3QgKGZyb20gRWNsaXBzZSB0byBsYXlvdXQpLiBXaGVuIGFuXG4gICAgLy8gaW52ZXJzZSB0cmFuc2Zvcm0gaXMgYXBwbGllZCwgd2UgZ2V0IHVwcGVyLWxlZnQgY29vcmRpbmF0ZSBvZiB0aGVcbiAgICAvLyBkcmF3aW5nIG9yIHRoZSByb290IGdyYXBoIGF0IGdpdmVuIGlucHV0IGNvb3JkaW5hdGUgKHNvbWUgbWFyZ2luc1xuICAgIC8vIGFscmVhZHkgaW5jbHVkZWQgaW4gY2FsY3VsYXRpb24gb2YgbGVmdC10b3ApLlxuXG4gICAgdmFyIHRyYW5zID0gbmV3IFRyYW5zZm9ybSgpO1xuICAgIHZhciBsZWZ0VG9wID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLnVwZGF0ZUxlZnRUb3AoKTtcblxuICAgIGlmIChsZWZ0VG9wICE9IG51bGwpXG4gICAge1xuICAgICAgdHJhbnMuc2V0V29ybGRPcmdYKG5ld0xlZnRUb3AueCk7XG4gICAgICB0cmFucy5zZXRXb3JsZE9yZ1kobmV3TGVmdFRvcC55KTtcblxuICAgICAgdHJhbnMuc2V0RGV2aWNlT3JnWChsZWZ0VG9wLngpO1xuICAgICAgdHJhbnMuc2V0RGV2aWNlT3JnWShsZWZ0VG9wLnkpO1xuXG4gICAgICB2YXIgbm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzKCk7XG4gICAgICB2YXIgbm9kZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcbiAgICAgIHtcbiAgICAgICAgbm9kZSA9IG5vZGVzW2ldO1xuICAgICAgICBub2RlLnRyYW5zZm9ybSh0cmFucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLnBvc2l0aW9uTm9kZXNSYW5kb21seSA9IGZ1bmN0aW9uIChncmFwaCkge1xuXG4gIGlmIChncmFwaCA9PSB1bmRlZmluZWQpIHtcbiAgICAvL2Fzc2VydCAhdGhpcy5pbmNyZW1lbnRhbDtcbiAgICB0aGlzLnBvc2l0aW9uTm9kZXNSYW5kb21seSh0aGlzLmdldEdyYXBoTWFuYWdlcigpLmdldFJvb3QoKSk7XG4gICAgdGhpcy5nZXRHcmFwaE1hbmFnZXIoKS5nZXRSb290KCkudXBkYXRlQm91bmRzKHRydWUpO1xuICB9XG4gIGVsc2Uge1xuICAgIHZhciBsTm9kZTtcbiAgICB2YXIgY2hpbGRHcmFwaDtcblxuICAgIHZhciBub2RlcyA9IGdyYXBoLmdldE5vZGVzKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICBsTm9kZSA9IG5vZGVzW2ldO1xuICAgICAgY2hpbGRHcmFwaCA9IGxOb2RlLmdldENoaWxkKCk7XG5cbiAgICAgIGlmIChjaGlsZEdyYXBoID09IG51bGwpXG4gICAgICB7XG4gICAgICAgIGxOb2RlLnNjYXR0ZXIoKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGNoaWxkR3JhcGguZ2V0Tm9kZXMoKS5sZW5ndGggPT0gMClcbiAgICAgIHtcbiAgICAgICAgbE5vZGUuc2NhdHRlcigpO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICB0aGlzLnBvc2l0aW9uTm9kZXNSYW5kb21seShjaGlsZEdyYXBoKTtcbiAgICAgICAgbE5vZGUudXBkYXRlQm91bmRzKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIHJldHVybnMgYSBsaXN0IG9mIHRyZWVzIHdoZXJlIGVhY2ggdHJlZSBpcyByZXByZXNlbnRlZCBhcyBhXG4gKiBsaXN0IG9mIGwtbm9kZXMuIFRoZSBtZXRob2QgcmV0dXJucyBhIGxpc3Qgb2Ygc2l6ZSAwIHdoZW46XG4gKiAtIFRoZSBncmFwaCBpcyBub3QgZmxhdCBvclxuICogLSBPbmUgb2YgdGhlIGNvbXBvbmVudChzKSBvZiB0aGUgZ3JhcGggaXMgbm90IGEgdHJlZS5cbiAqL1xuTGF5b3V0LnByb3RvdHlwZS5nZXRGbGF0Rm9yZXN0ID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIGZsYXRGb3Jlc3QgPSBbXTtcbiAgdmFyIGlzRm9yZXN0ID0gdHJ1ZTtcblxuICAvLyBRdWljayByZWZlcmVuY2UgZm9yIGFsbCBub2RlcyBpbiB0aGUgZ3JhcGggbWFuYWdlciBhc3NvY2lhdGVkIHdpdGhcbiAgLy8gdGhpcyBsYXlvdXQuIFRoZSBsaXN0IHNob3VsZCBub3QgYmUgY2hhbmdlZC5cbiAgdmFyIGFsbE5vZGVzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmdldE5vZGVzKCk7XG5cbiAgLy8gRmlyc3QgYmUgc3VyZSB0aGF0IHRoZSBncmFwaCBpcyBmbGF0XG4gIHZhciBpc0ZsYXQgPSB0cnVlO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsTm9kZXMubGVuZ3RoOyBpKyspXG4gIHtcbiAgICBpZiAoYWxsTm9kZXNbaV0uZ2V0Q2hpbGQoKSAhPSBudWxsKVxuICAgIHtcbiAgICAgIGlzRmxhdCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybiBlbXB0eSBmb3Jlc3QgaWYgdGhlIGdyYXBoIGlzIG5vdCBmbGF0LlxuICBpZiAoIWlzRmxhdClcbiAge1xuICAgIHJldHVybiBmbGF0Rm9yZXN0O1xuICB9XG5cbiAgLy8gUnVuIEJGUyBmb3IgZWFjaCBjb21wb25lbnQgb2YgdGhlIGdyYXBoLlxuXG4gIHZhciB2aXNpdGVkID0gbmV3IEhhc2hTZXQoKTtcbiAgdmFyIHRvQmVWaXNpdGVkID0gW107XG4gIHZhciBwYXJlbnRzID0gbmV3IEhhc2hNYXAoKTtcbiAgdmFyIHVuUHJvY2Vzc2VkTm9kZXMgPSBbXTtcblxuICB1blByb2Nlc3NlZE5vZGVzID0gdW5Qcm9jZXNzZWROb2Rlcy5jb25jYXQoYWxsTm9kZXMpO1xuXG4gIC8vIEVhY2ggaXRlcmF0aW9uIG9mIHRoaXMgbG9vcCBmaW5kcyBhIGNvbXBvbmVudCBvZiB0aGUgZ3JhcGggYW5kXG4gIC8vIGRlY2lkZXMgd2hldGhlciBpdCBpcyBhIHRyZWUgb3Igbm90LiBJZiBpdCBpcyBhIHRyZWUsIGFkZHMgaXQgdG8gdGhlXG4gIC8vIGZvcmVzdCBhbmQgY29udGludWVkIHdpdGggdGhlIG5leHQgY29tcG9uZW50LlxuXG4gIHdoaWxlICh1blByb2Nlc3NlZE5vZGVzLmxlbmd0aCA+IDAgJiYgaXNGb3Jlc3QpXG4gIHtcbiAgICB0b0JlVmlzaXRlZC5wdXNoKHVuUHJvY2Vzc2VkTm9kZXNbMF0pO1xuXG4gICAgLy8gU3RhcnQgdGhlIEJGUy4gRWFjaCBpdGVyYXRpb24gb2YgdGhpcyBsb29wIHZpc2l0cyBhIG5vZGUgaW4gYVxuICAgIC8vIEJGUyBtYW5uZXIuXG4gICAgd2hpbGUgKHRvQmVWaXNpdGVkLmxlbmd0aCA+IDAgJiYgaXNGb3Jlc3QpXG4gICAge1xuICAgICAgLy9wb29sIG9wZXJhdGlvblxuICAgICAgdmFyIGN1cnJlbnROb2RlID0gdG9CZVZpc2l0ZWRbMF07XG4gICAgICB0b0JlVmlzaXRlZC5zcGxpY2UoMCwgMSk7XG4gICAgICB2aXNpdGVkLmFkZChjdXJyZW50Tm9kZSk7XG5cbiAgICAgIC8vIFRyYXZlcnNlIGFsbCBuZWlnaGJvcnMgb2YgdGhpcyBub2RlXG4gICAgICB2YXIgbmVpZ2hib3JFZGdlcyA9IGN1cnJlbnROb2RlLmdldEVkZ2VzKCk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmVpZ2hib3JFZGdlcy5sZW5ndGg7IGkrKylcbiAgICAgIHtcbiAgICAgICAgdmFyIGN1cnJlbnROZWlnaGJvciA9XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JFZGdlc1tpXS5nZXRPdGhlckVuZChjdXJyZW50Tm9kZSk7XG5cbiAgICAgICAgLy8gSWYgQkZTIGlzIG5vdCBncm93aW5nIGZyb20gdGhpcyBuZWlnaGJvci5cbiAgICAgICAgaWYgKHBhcmVudHMuZ2V0KGN1cnJlbnROb2RlKSAhPSBjdXJyZW50TmVpZ2hib3IpXG4gICAgICAgIHtcbiAgICAgICAgICAvLyBXZSBoYXZlbid0IHByZXZpb3VzbHkgdmlzaXRlZCB0aGlzIG5laWdoYm9yLlxuICAgICAgICAgIGlmICghdmlzaXRlZC5jb250YWlucyhjdXJyZW50TmVpZ2hib3IpKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRvQmVWaXNpdGVkLnB1c2goY3VycmVudE5laWdoYm9yKTtcbiAgICAgICAgICAgIHBhcmVudHMucHV0KGN1cnJlbnROZWlnaGJvciwgY3VycmVudE5vZGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBTaW5jZSB3ZSBoYXZlIHByZXZpb3VzbHkgdmlzaXRlZCB0aGlzIG5laWdoYm9yIGFuZFxuICAgICAgICAgIC8vIHRoaXMgbmVpZ2hib3IgaXMgbm90IHBhcmVudCBvZiBjdXJyZW50Tm9kZSwgZ2l2ZW5cbiAgICAgICAgICAvLyBncmFwaCBjb250YWlucyBhIGNvbXBvbmVudCB0aGF0IGlzIG5vdCB0cmVlLCBoZW5jZVxuICAgICAgICAgIC8vIGl0IGlzIG5vdCBhIGZvcmVzdC5cbiAgICAgICAgICBlbHNlXG4gICAgICAgICAge1xuICAgICAgICAgICAgaXNGb3Jlc3QgPSBmYWxzZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBncmFwaCBjb250YWlucyBhIGNvbXBvbmVudCB0aGF0IGlzIG5vdCBhIHRyZWUuIEVtcHR5XG4gICAgLy8gcHJldmlvdXNseSBmb3VuZCB0cmVlcy4gVGhlIG1ldGhvZCB3aWxsIGVuZC5cbiAgICBpZiAoIWlzRm9yZXN0KVxuICAgIHtcbiAgICAgIGZsYXRGb3Jlc3QgPSBbXTtcbiAgICB9XG4gICAgLy8gU2F2ZSBjdXJyZW50bHkgdmlzaXRlZCBub2RlcyBhcyBhIHRyZWUgaW4gb3VyIGZvcmVzdC4gUmVzZXRcbiAgICAvLyB2aXNpdGVkIGFuZCBwYXJlbnRzIGxpc3RzLiBDb250aW51ZSB3aXRoIHRoZSBuZXh0IGNvbXBvbmVudCBvZlxuICAgIC8vIHRoZSBncmFwaCwgaWYgYW55LlxuICAgIGVsc2VcbiAgICB7XG4gICAgICB2YXIgdGVtcCA9IFtdO1xuICAgICAgdmlzaXRlZC5hZGRBbGxUbyh0ZW1wKTtcbiAgICAgIGZsYXRGb3Jlc3QucHVzaCh0ZW1wKTtcbiAgICAgIC8vZmxhdEZvcmVzdCA9IGZsYXRGb3Jlc3QuY29uY2F0KHRlbXApO1xuICAgICAgLy91blByb2Nlc3NlZE5vZGVzLnJlbW92ZUFsbCh2aXNpdGVkKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGVtcC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgdmFsdWUgPSB0ZW1wW2ldO1xuICAgICAgICB2YXIgaW5kZXggPSB1blByb2Nlc3NlZE5vZGVzLmluZGV4T2YodmFsdWUpO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgIHVuUHJvY2Vzc2VkTm9kZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmlzaXRlZCA9IG5ldyBIYXNoU2V0KCk7XG4gICAgICBwYXJlbnRzID0gbmV3IEhhc2hNYXAoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmxhdEZvcmVzdDtcbn07XG5cbi8qKlxuICogVGhpcyBtZXRob2QgY3JlYXRlcyBkdW1teSBub2RlcyAoYW4gbC1sZXZlbCBub2RlIHdpdGggbWluaW1hbCBkaW1lbnNpb25zKVxuICogZm9yIHRoZSBnaXZlbiBlZGdlIChvbmUgcGVyIGJlbmRwb2ludCkuIFRoZSBleGlzdGluZyBsLWxldmVsIHN0cnVjdHVyZVxuICogaXMgdXBkYXRlZCBhY2NvcmRpbmdseS5cbiAqL1xuTGF5b3V0LnByb3RvdHlwZS5jcmVhdGVEdW1teU5vZGVzRm9yQmVuZHBvaW50cyA9IGZ1bmN0aW9uIChlZGdlKVxue1xuICB2YXIgZHVtbXlOb2RlcyA9IFtdO1xuICB2YXIgcHJldiA9IGVkZ2Uuc291cmNlO1xuXG4gIHZhciBncmFwaCA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmNhbGNMb3dlc3RDb21tb25BbmNlc3RvcihlZGdlLnNvdXJjZSwgZWRnZS50YXJnZXQpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZS5iZW5kcG9pbnRzLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgLy8gY3JlYXRlIG5ldyBkdW1teSBub2RlXG4gICAgdmFyIGR1bW15Tm9kZSA9IHRoaXMubmV3Tm9kZShudWxsKTtcbiAgICBkdW1teU5vZGUuc2V0UmVjdChuZXcgUG9pbnQoMCwgMCksIG5ldyBEaW1lbnNpb24oMSwgMSkpO1xuXG4gICAgZ3JhcGguYWRkKGR1bW15Tm9kZSk7XG5cbiAgICAvLyBjcmVhdGUgbmV3IGR1bW15IGVkZ2UgYmV0d2VlbiBwcmV2IGFuZCBkdW1teSBub2RlXG4gICAgdmFyIGR1bW15RWRnZSA9IHRoaXMubmV3RWRnZShudWxsKTtcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5hZGQoZHVtbXlFZGdlLCBwcmV2LCBkdW1teU5vZGUpO1xuXG4gICAgZHVtbXlOb2Rlcy5hZGQoZHVtbXlOb2RlKTtcbiAgICBwcmV2ID0gZHVtbXlOb2RlO1xuICB9XG5cbiAgdmFyIGR1bW15RWRnZSA9IHRoaXMubmV3RWRnZShudWxsKTtcbiAgdGhpcy5ncmFwaE1hbmFnZXIuYWRkKGR1bW15RWRnZSwgcHJldiwgZWRnZS50YXJnZXQpO1xuXG4gIHRoaXMuZWRnZVRvRHVtbXlOb2Rlcy5wdXQoZWRnZSwgZHVtbXlOb2Rlcyk7XG5cbiAgLy8gcmVtb3ZlIHJlYWwgZWRnZSBmcm9tIGdyYXBoIG1hbmFnZXIgaWYgaXQgaXMgaW50ZXItZ3JhcGhcbiAgaWYgKGVkZ2UuaXNJbnRlckdyYXBoKCkpXG4gIHtcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUoZWRnZSk7XG4gIH1cbiAgLy8gZWxzZSwgcmVtb3ZlIHRoZSBlZGdlIGZyb20gdGhlIGN1cnJlbnQgZ3JhcGhcbiAgZWxzZVxuICB7XG4gICAgZ3JhcGgucmVtb3ZlKGVkZ2UpO1xuICB9XG5cbiAgcmV0dXJuIGR1bW15Tm9kZXM7XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIGNyZWF0ZXMgYmVuZHBvaW50cyBmb3IgZWRnZXMgZnJvbSB0aGUgZHVtbXkgbm9kZXNcbiAqIGF0IGwtbGV2ZWwuXG4gKi9cbkxheW91dC5wcm90b3R5cGUuY3JlYXRlQmVuZHBvaW50c0Zyb21EdW1teU5vZGVzID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIGVkZ2VzID0gW107XG4gIGVkZ2VzID0gZWRnZXMuY29uY2F0KHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbEVkZ2VzKCkpO1xuICBlZGdlcyA9IHRoaXMuZWRnZVRvRHVtbXlOb2Rlcy5rZXlTZXQoKS5jb25jYXQoZWRnZXMpO1xuXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZWRnZXMubGVuZ3RoOyBrKyspXG4gIHtcbiAgICB2YXIgbEVkZ2UgPSBlZGdlc1trXTtcblxuICAgIGlmIChsRWRnZS5iZW5kcG9pbnRzLmxlbmd0aCA+IDApXG4gICAge1xuICAgICAgdmFyIHBhdGggPSB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMuZ2V0KGxFZGdlKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRoLmxlbmd0aDsgaSsrKVxuICAgICAge1xuICAgICAgICB2YXIgZHVtbXlOb2RlID0gcGF0aFtpXTtcbiAgICAgICAgdmFyIHAgPSBuZXcgUG9pbnREKGR1bW15Tm9kZS5nZXRDZW50ZXJYKCksXG4gICAgICAgICAgICAgICAgZHVtbXlOb2RlLmdldENlbnRlclkoKSk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGJlbmRwb2ludCdzIGxvY2F0aW9uIGFjY29yZGluZyB0byBkdW1teSBub2RlXG4gICAgICAgIHZhciBlYnAgPSBsRWRnZS5iZW5kcG9pbnRzLmdldChpKTtcbiAgICAgICAgZWJwLnggPSBwLng7XG4gICAgICAgIGVicC55ID0gcC55O1xuXG4gICAgICAgIC8vIHJlbW92ZSB0aGUgZHVtbXkgbm9kZSwgZHVtbXkgZWRnZXMgaW5jaWRlbnQgd2l0aCB0aGlzXG4gICAgICAgIC8vIGR1bW15IG5vZGUgaXMgYWxzbyByZW1vdmVkICh3aXRoaW4gdGhlIHJlbW92ZSBtZXRob2QpXG4gICAgICAgIGR1bW15Tm9kZS5nZXRPd25lcigpLnJlbW92ZShkdW1teU5vZGUpO1xuICAgICAgfVxuXG4gICAgICAvLyBhZGQgdGhlIHJlYWwgZWRnZSB0byBncmFwaFxuICAgICAgdGhpcy5ncmFwaE1hbmFnZXIuYWRkKGxFZGdlLCBsRWRnZS5zb3VyY2UsIGxFZGdlLnRhcmdldCk7XG4gICAgfVxuICB9XG59O1xuXG5MYXlvdXQudHJhbnNmb3JtID0gZnVuY3Rpb24gKHNsaWRlclZhbHVlLCBkZWZhdWx0VmFsdWUsIG1pbkRpdiwgbWF4TXVsKSB7XG4gIGlmIChtaW5EaXYgIT0gdW5kZWZpbmVkICYmIG1heE11bCAhPSB1bmRlZmluZWQpIHtcbiAgICB2YXIgdmFsdWUgPSBkZWZhdWx0VmFsdWU7XG5cbiAgICBpZiAoc2xpZGVyVmFsdWUgPD0gNTApXG4gICAge1xuICAgICAgdmFyIG1pblZhbHVlID0gZGVmYXVsdFZhbHVlIC8gbWluRGl2O1xuICAgICAgdmFsdWUgLT0gKChkZWZhdWx0VmFsdWUgLSBtaW5WYWx1ZSkgLyA1MCkgKiAoNTAgLSBzbGlkZXJWYWx1ZSk7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICB2YXIgbWF4VmFsdWUgPSBkZWZhdWx0VmFsdWUgKiBtYXhNdWw7XG4gICAgICB2YWx1ZSArPSAoKG1heFZhbHVlIC0gZGVmYXVsdFZhbHVlKSAvIDUwKSAqIChzbGlkZXJWYWx1ZSAtIDUwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgZWxzZSB7XG4gICAgdmFyIGEsIGI7XG5cbiAgICBpZiAoc2xpZGVyVmFsdWUgPD0gNTApXG4gICAge1xuICAgICAgYSA9IDkuMCAqIGRlZmF1bHRWYWx1ZSAvIDUwMC4wO1xuICAgICAgYiA9IGRlZmF1bHRWYWx1ZSAvIDEwLjA7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICBhID0gOS4wICogZGVmYXVsdFZhbHVlIC8gNTAuMDtcbiAgICAgIGIgPSAtOCAqIGRlZmF1bHRWYWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gKGEgKiBzbGlkZXJWYWx1ZSArIGIpO1xuICB9XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIGZpbmRzIGFuZCByZXR1cm5zIHRoZSBjZW50ZXIgb2YgdGhlIGdpdmVuIG5vZGVzLCBhc3N1bWluZ1xuICogdGhhdCB0aGUgZ2l2ZW4gbm9kZXMgZm9ybSBhIHRyZWUgaW4gdGhlbXNlbHZlcy5cbiAqL1xuTGF5b3V0LmZpbmRDZW50ZXJPZlRyZWUgPSBmdW5jdGlvbiAobm9kZXMpXG57XG4gIHZhciBsaXN0ID0gW107XG4gIGxpc3QgPSBsaXN0LmNvbmNhdChub2Rlcyk7XG5cbiAgdmFyIHJlbW92ZWROb2RlcyA9IFtdO1xuICB2YXIgcmVtYWluaW5nRGVncmVlcyA9IG5ldyBIYXNoTWFwKCk7XG4gIHZhciBmb3VuZENlbnRlciA9IGZhbHNlO1xuICB2YXIgY2VudGVyTm9kZSA9IG51bGw7XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09IDEgfHwgbGlzdC5sZW5ndGggPT0gMilcbiAge1xuICAgIGZvdW5kQ2VudGVyID0gdHJ1ZTtcbiAgICBjZW50ZXJOb2RlID0gbGlzdFswXTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKylcbiAge1xuICAgIHZhciBub2RlID0gbGlzdFtpXTtcbiAgICB2YXIgZGVncmVlID0gbm9kZS5nZXROZWlnaGJvcnNMaXN0KCkuc2l6ZSgpO1xuICAgIHJlbWFpbmluZ0RlZ3JlZXMucHV0KG5vZGUsIG5vZGUuZ2V0TmVpZ2hib3JzTGlzdCgpLnNpemUoKSk7XG5cbiAgICBpZiAoZGVncmVlID09IDEpXG4gICAge1xuICAgICAgcmVtb3ZlZE5vZGVzLnB1c2gobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIHRlbXBMaXN0ID0gW107XG4gIHRlbXBMaXN0ID0gdGVtcExpc3QuY29uY2F0KHJlbW92ZWROb2Rlcyk7XG5cbiAgd2hpbGUgKCFmb3VuZENlbnRlcilcbiAge1xuICAgIHZhciB0ZW1wTGlzdDIgPSBbXTtcbiAgICB0ZW1wTGlzdDIgPSB0ZW1wTGlzdDIuY29uY2F0KHRlbXBMaXN0KTtcbiAgICB0ZW1wTGlzdCA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKVxuICAgIHtcbiAgICAgIHZhciBub2RlID0gbGlzdFtpXTtcblxuICAgICAgdmFyIGluZGV4ID0gbGlzdC5pbmRleE9mKG5vZGUpO1xuICAgICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgbGlzdC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuXG4gICAgICB2YXIgbmVpZ2hib3VycyA9IG5vZGUuZ2V0TmVpZ2hib3JzTGlzdCgpO1xuXG4gICAgICBmb3IgKHZhciBqIGluIG5laWdoYm91cnMuc2V0KVxuICAgICAge1xuICAgICAgICB2YXIgbmVpZ2hib3VyID0gbmVpZ2hib3Vycy5zZXRbal07XG4gICAgICAgIGlmIChyZW1vdmVkTm9kZXMuaW5kZXhPZihuZWlnaGJvdXIpIDwgMClcbiAgICAgICAge1xuICAgICAgICAgIHZhciBvdGhlckRlZ3JlZSA9IHJlbWFpbmluZ0RlZ3JlZXMuZ2V0KG5laWdoYm91cik7XG4gICAgICAgICAgdmFyIG5ld0RlZ3JlZSA9IG90aGVyRGVncmVlIC0gMTtcblxuICAgICAgICAgIGlmIChuZXdEZWdyZWUgPT0gMSlcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0ZW1wTGlzdC5wdXNoKG5laWdoYm91cik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVtYWluaW5nRGVncmVlcy5wdXQobmVpZ2hib3VyLCBuZXdEZWdyZWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVtb3ZlZE5vZGVzID0gcmVtb3ZlZE5vZGVzLmNvbmNhdCh0ZW1wTGlzdCk7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT0gMSB8fCBsaXN0Lmxlbmd0aCA9PSAyKVxuICAgIHtcbiAgICAgIGZvdW5kQ2VudGVyID0gdHJ1ZTtcbiAgICAgIGNlbnRlck5vZGUgPSBsaXN0WzBdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjZW50ZXJOb2RlO1xufTtcblxuLyoqXG4gKiBEdXJpbmcgdGhlIGNvYXJzZW5pbmcgcHJvY2VzcywgdGhpcyBsYXlvdXQgbWF5IGJlIHJlZmVyZW5jZWQgYnkgdHdvIGdyYXBoIG1hbmFnZXJzXG4gKiB0aGlzIHNldHRlciBmdW5jdGlvbiBncmFudHMgYWNjZXNzIHRvIGNoYW5nZSB0aGUgY3VycmVudGx5IGJlaW5nIHVzZWQgZ3JhcGggbWFuYWdlclxuICovXG5MYXlvdXQucHJvdG90eXBlLnNldEdyYXBoTWFuYWdlciA9IGZ1bmN0aW9uIChnbSlcbntcbiAgdGhpcy5ncmFwaE1hbmFnZXIgPSBnbTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0O1xuIiwiZnVuY3Rpb24gTGF5b3V0Q29uc3RhbnRzKCkge1xufVxuXG4vKipcbiAqIExheW91dCBRdWFsaXR5XG4gKi9cbkxheW91dENvbnN0YW50cy5QUk9PRl9RVUFMSVRZID0gMDtcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX1FVQUxJVFkgPSAxO1xuTGF5b3V0Q29uc3RhbnRzLkRSQUZUX1FVQUxJVFkgPSAyO1xuXG4vKipcbiAqIERlZmF1bHQgcGFyYW1ldGVyc1xuICovXG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9DUkVBVEVfQkVORFNfQVNfTkVFREVEID0gZmFsc2U7XG4vL0xheW91dENvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMID0gdHJ1ZTtcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMID0gZmFsc2U7XG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fT05fTEFZT1VUID0gdHJ1ZTtcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9EVVJJTkdfTEFZT1VUID0gZmFsc2U7XG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fUEVSSU9EID0gNTA7XG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9VTklGT1JNX0xFQUZfTk9ERV9TSVpFUyA9IGZhbHNlO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gU2VjdGlvbjogR2VuZXJhbCBvdGhlciBjb25zdGFudHNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKlxuICogTWFyZ2lucyBvZiBhIGdyYXBoIHRvIGJlIGFwcGxpZWQgb24gYm91ZGluZyByZWN0YW5nbGUgb2YgaXRzIGNvbnRlbnRzLiBXZVxuICogYXNzdW1lIG1hcmdpbnMgb24gYWxsIGZvdXIgc2lkZXMgdG8gYmUgdW5pZm9ybS5cbiAqL1xuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBUEhfTUFSR0lOID0gMTA7XG5cbi8qXG4gKiBUaGUgaGVpZ2h0IG9mIHRoZSBsYWJlbCBvZiBhIGNvbXBvdW5kLiBXZSBhc3N1bWUgdGhlIGxhYmVsIG9mIGEgY29tcG91bmRcbiAqIG5vZGUgaXMgcGxhY2VkIGF0IHRoZSBib3R0b20gd2l0aCBhIGR5bmFtaWMgd2lkdGggc2FtZSBhcyB0aGUgY29tcG91bmRcbiAqIGl0c2VsZi5cbiAqL1xuTGF5b3V0Q29uc3RhbnRzLkxBQkVMX0hFSUdIVCA9IDIwO1xuXG4vKlxuICogQWRkaXRpb25hbCBtYXJnaW5zIHRoYXQgd2UgbWFpbnRhaW4gYXMgc2FmZXR5IGJ1ZmZlciBmb3Igbm9kZS1ub2RlXG4gKiBvdmVybGFwcy4gQ29tcG91bmQgbm9kZSBsYWJlbHMgYXMgd2VsbCBhcyBncmFwaCBtYXJnaW5zIGFyZSBoYW5kbGVkXG4gKiBzZXBhcmF0ZWx5IVxuICovXG5MYXlvdXRDb25zdGFudHMuQ09NUE9VTkRfTk9ERV9NQVJHSU4gPSA1O1xuXG4vKlxuICogRGVmYXVsdCBkaW1lbnNpb24gb2YgYSBub24tY29tcG91bmQgbm9kZS5cbiAqL1xuTGF5b3V0Q29uc3RhbnRzLlNJTVBMRV9OT0RFX1NJWkUgPSA0MDtcblxuLypcbiAqIERlZmF1bHQgZGltZW5zaW9uIG9mIGEgbm9uLWNvbXBvdW5kIG5vZGUuXG4gKi9cbkxheW91dENvbnN0YW50cy5TSU1QTEVfTk9ERV9IQUxGX1NJWkUgPSBMYXlvdXRDb25zdGFudHMuU0lNUExFX05PREVfU0laRSAvIDI7XG5cbi8qXG4gKiBFbXB0eSBjb21wb3VuZCBub2RlIHNpemUuIFdoZW4gYSBjb21wb3VuZCBub2RlIGlzIGVtcHR5LCBpdHMgYm90aFxuICogZGltZW5zaW9ucyBzaG91bGQgYmUgb2YgdGhpcyB2YWx1ZS5cbiAqL1xuTGF5b3V0Q29uc3RhbnRzLkVNUFRZX0NPTVBPVU5EX05PREVfU0laRSA9IDQwO1xuXG4vKlxuICogTWluaW11bSBsZW5ndGggdGhhdCBhbiBlZGdlIHNob3VsZCB0YWtlIGR1cmluZyBsYXlvdXRcbiAqL1xuTGF5b3V0Q29uc3RhbnRzLk1JTl9FREdFX0xFTkdUSCA9IDE7XG5cbi8qXG4gKiBXb3JsZCBib3VuZGFyaWVzIHRoYXQgbGF5b3V0IG9wZXJhdGVzIG9uXG4gKi9cbkxheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSA9IDEwMDAwMDA7XG5cbi8qXG4gKiBXb3JsZCBib3VuZGFyaWVzIHRoYXQgcmFuZG9tIHBvc2l0aW9uaW5nIGNhbiBiZSBwZXJmb3JtZWQgd2l0aFxuICovXG5MYXlvdXRDb25zdGFudHMuSU5JVElBTF9XT1JMRF9CT1VOREFSWSA9IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSAvIDEwMDA7XG5cbi8qXG4gKiBDb29yZGluYXRlcyBvZiB0aGUgd29ybGQgY2VudGVyXG4gKi9cbkxheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWCA9IDEyMDA7XG5MYXlvdXRDb25zdGFudHMuV09STERfQ0VOVEVSX1kgPSA5MDA7XG5cbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0Q29uc3RhbnRzO1xuIiwiLypcbiAqVGhpcyBjbGFzcyBpcyB0aGUgamF2YXNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgUG9pbnQuamF2YSBjbGFzcyBpbiBqZGtcbiAqL1xuZnVuY3Rpb24gUG9pbnQoeCwgeSwgcCkge1xuICB0aGlzLnggPSBudWxsO1xuICB0aGlzLnkgPSBudWxsO1xuICBpZiAoeCA9PSBudWxsICYmIHkgPT0gbnVsbCAmJiBwID09IG51bGwpIHtcbiAgICB0aGlzLnggPSAwO1xuICAgIHRoaXMueSA9IDA7XG4gIH1cbiAgZWxzZSBpZiAodHlwZW9mIHggPT0gJ251bWJlcicgJiYgdHlwZW9mIHkgPT0gJ251bWJlcicgJiYgcCA9PSBudWxsKSB7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICB9XG4gIGVsc2UgaWYgKHguY29uc3RydWN0b3IubmFtZSA9PSAnUG9pbnQnICYmIHkgPT0gbnVsbCAmJiBwID09IG51bGwpIHtcbiAgICBwID0geDtcbiAgICB0aGlzLnggPSBwLng7XG4gICAgdGhpcy55ID0gcC55O1xuICB9XG59XG5cblBvaW50LnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy54O1xufVxuXG5Qb2ludC5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMueTtcbn1cblxuUG9pbnQucHJvdG90eXBlLmdldExvY2F0aW9uID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCwgdGhpcy55KTtcbn1cblxuUG9pbnQucHJvdG90eXBlLnNldExvY2F0aW9uID0gZnVuY3Rpb24gKHgsIHksIHApIHtcbiAgaWYgKHguY29uc3RydWN0b3IubmFtZSA9PSAnUG9pbnQnICYmIHkgPT0gbnVsbCAmJiBwID09IG51bGwpIHtcbiAgICBwID0geDtcbiAgICB0aGlzLnNldExvY2F0aW9uKHAueCwgcC55KTtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgeCA9PSAnbnVtYmVyJyAmJiB0eXBlb2YgeSA9PSAnbnVtYmVyJyAmJiBwID09IG51bGwpIHtcbiAgICAvL2lmIGJvdGggcGFyYW1ldGVycyBhcmUgaW50ZWdlciBqdXN0IG1vdmUgKHgseSkgbG9jYXRpb25cbiAgICBpZiAocGFyc2VJbnQoeCkgPT0geCAmJiBwYXJzZUludCh5KSA9PSB5KSB7XG4gICAgICB0aGlzLm1vdmUoeCwgeSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy54ID0gTWF0aC5mbG9vcih4ICsgMC41KTtcbiAgICAgIHRoaXMueSA9IE1hdGguZmxvb3IoeSArIDAuNSk7XG4gICAgfVxuICB9XG59XG5cblBvaW50LnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgdGhpcy54ID0geDtcbiAgdGhpcy55ID0geTtcbn1cblxuUG9pbnQucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChkeCwgZHkpIHtcbiAgdGhpcy54ICs9IGR4O1xuICB0aGlzLnkgKz0gZHk7XG59XG5cblBvaW50LnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAob2JqKSB7XG4gIGlmIChvYmouY29uc3RydWN0b3IubmFtZSA9PSBcIlBvaW50XCIpIHtcbiAgICB2YXIgcHQgPSBvYmo7XG4gICAgcmV0dXJuICh0aGlzLnggPT0gcHQueCkgJiYgKHRoaXMueSA9PSBwdC55KTtcbiAgfVxuICByZXR1cm4gdGhpcyA9PSBvYmo7XG59XG5cblBvaW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIG5ldyBQb2ludCgpLmNvbnN0cnVjdG9yLm5hbWUgKyBcIlt4PVwiICsgdGhpcy54ICsgXCIseT1cIiArIHRoaXMueSArIFwiXVwiO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50O1xuIiwiZnVuY3Rpb24gUG9pbnREKHgsIHkpIHtcbiAgaWYgKHggPT0gbnVsbCAmJiB5ID09IG51bGwpIHtcbiAgICB0aGlzLnggPSAwO1xuICAgIHRoaXMueSA9IDA7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICB9XG59XG5cblBvaW50RC5wcm90b3R5cGUuZ2V0WCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLng7XG59O1xuXG5Qb2ludEQucHJvdG90eXBlLmdldFkgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy55O1xufTtcblxuUG9pbnRELnByb3RvdHlwZS5zZXRYID0gZnVuY3Rpb24gKHgpXG57XG4gIHRoaXMueCA9IHg7XG59O1xuXG5Qb2ludEQucHJvdG90eXBlLnNldFkgPSBmdW5jdGlvbiAoeSlcbntcbiAgdGhpcy55ID0geTtcbn07XG5cblBvaW50RC5wcm90b3R5cGUuZ2V0RGlmZmVyZW5jZSA9IGZ1bmN0aW9uIChwdClcbntcbiAgcmV0dXJuIG5ldyBEaW1lbnNpb25EKHRoaXMueCAtIHB0LngsIHRoaXMueSAtIHB0LnkpO1xufTtcblxuUG9pbnRELnByb3RvdHlwZS5nZXRDb3B5ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIG5ldyBQb2ludEQodGhpcy54LCB0aGlzLnkpO1xufTtcblxuUG9pbnRELnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbiAoZGltKVxue1xuICB0aGlzLnggKz0gZGltLndpZHRoO1xuICB0aGlzLnkgKz0gZGltLmhlaWdodDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50RDtcbiIsImZ1bmN0aW9uIFJhbmRvbVNlZWQoKSB7XG59XG5SYW5kb21TZWVkLnNlZWQgPSAxO1xuUmFuZG9tU2VlZC54ID0gMDtcblxuUmFuZG9tU2VlZC5uZXh0RG91YmxlID0gZnVuY3Rpb24gKCkge1xuICBSYW5kb21TZWVkLnggPSBNYXRoLnNpbihSYW5kb21TZWVkLnNlZWQrKykgKiAxMDAwMDtcbiAgcmV0dXJuIFJhbmRvbVNlZWQueCAtIE1hdGguZmxvb3IoUmFuZG9tU2VlZC54KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmFuZG9tU2VlZDtcbiIsImZ1bmN0aW9uIFJlY3RhbmdsZUQoeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICB0aGlzLnggPSAwO1xuICB0aGlzLnkgPSAwO1xuICB0aGlzLndpZHRoID0gMDtcbiAgdGhpcy5oZWlnaHQgPSAwO1xuXG4gIGlmICh4ICE9IG51bGwgJiYgeSAhPSBudWxsICYmIHdpZHRoICE9IG51bGwgJiYgaGVpZ2h0ICE9IG51bGwpIHtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICB9XG59XG5cblJlY3RhbmdsZUQucHJvdG90eXBlLmdldFggPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy54O1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuc2V0WCA9IGZ1bmN0aW9uICh4KVxue1xuICB0aGlzLnggPSB4O1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnk7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5zZXRZID0gZnVuY3Rpb24gKHkpXG57XG4gIHRoaXMueSA9IHk7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLndpZHRoO1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuc2V0V2lkdGggPSBmdW5jdGlvbiAod2lkdGgpXG57XG4gIHRoaXMud2lkdGggPSB3aWR0aDtcbn07XG5cblJlY3RhbmdsZUQucHJvdG90eXBlLmdldEhlaWdodCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmhlaWdodDtcbn07XG5cblJlY3RhbmdsZUQucHJvdG90eXBlLnNldEhlaWdodCA9IGZ1bmN0aW9uIChoZWlnaHQpXG57XG4gIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0UmlnaHQgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy54ICsgdGhpcy53aWR0aDtcbn07XG5cblJlY3RhbmdsZUQucHJvdG90eXBlLmdldEJvdHRvbSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodDtcbn07XG5cblJlY3RhbmdsZUQucHJvdG90eXBlLmludGVyc2VjdHMgPSBmdW5jdGlvbiAoYSlcbntcbiAgaWYgKHRoaXMuZ2V0UmlnaHQoKSA8IGEueClcbiAge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICh0aGlzLmdldEJvdHRvbSgpIDwgYS55KVxuICB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKGEuZ2V0UmlnaHQoKSA8IHRoaXMueClcbiAge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChhLmdldEJvdHRvbSgpIDwgdGhpcy55KVxuICB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRDZW50ZXJYID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMueCArIHRoaXMud2lkdGggLyAyO1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0TWluWCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmdldFgoKTtcbn07XG5cblJlY3RhbmdsZUQucHJvdG90eXBlLmdldE1heFggPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5nZXRYKCkgKyB0aGlzLndpZHRoO1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0Q2VudGVyWSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodCAvIDI7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRNaW5ZID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMuZ2V0WSgpO1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0TWF4WSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmdldFkoKSArIHRoaXMuaGVpZ2h0O1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0V2lkdGhIYWxmID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMud2lkdGggLyAyO1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0SGVpZ2h0SGFsZiA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmhlaWdodCAvIDI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3RhbmdsZUQ7XG4iLCJ2YXIgUG9pbnREID0gcmVxdWlyZSgnLi9Qb2ludEQnKTtcblxuZnVuY3Rpb24gVHJhbnNmb3JtKHgsIHkpIHtcbiAgdGhpcy5sd29ybGRPcmdYID0gMC4wO1xuICB0aGlzLmx3b3JsZE9yZ1kgPSAwLjA7XG4gIHRoaXMubGRldmljZU9yZ1ggPSAwLjA7XG4gIHRoaXMubGRldmljZU9yZ1kgPSAwLjA7XG4gIHRoaXMubHdvcmxkRXh0WCA9IDEuMDtcbiAgdGhpcy5sd29ybGRFeHRZID0gMS4wO1xuICB0aGlzLmxkZXZpY2VFeHRYID0gMS4wO1xuICB0aGlzLmxkZXZpY2VFeHRZID0gMS4wO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFdvcmxkT3JnWCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmx3b3JsZE9yZ1g7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0V29ybGRPcmdYID0gZnVuY3Rpb24gKHdveClcbntcbiAgdGhpcy5sd29ybGRPcmdYID0gd294O1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFdvcmxkT3JnWSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmx3b3JsZE9yZ1k7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0V29ybGRPcmdZID0gZnVuY3Rpb24gKHdveSlcbntcbiAgdGhpcy5sd29ybGRPcmdZID0gd295O1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFdvcmxkRXh0WCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmx3b3JsZEV4dFg7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0V29ybGRFeHRYID0gZnVuY3Rpb24gKHdleClcbntcbiAgdGhpcy5sd29ybGRFeHRYID0gd2V4O1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFdvcmxkRXh0WSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmx3b3JsZEV4dFk7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0V29ybGRFeHRZID0gZnVuY3Rpb24gKHdleSlcbntcbiAgdGhpcy5sd29ybGRFeHRZID0gd2V5O1xufVxuXG4vKiBEZXZpY2UgcmVsYXRlZCAqL1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZU9yZ1ggPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5sZGV2aWNlT3JnWDtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXREZXZpY2VPcmdYID0gZnVuY3Rpb24gKGRveClcbntcbiAgdGhpcy5sZGV2aWNlT3JnWCA9IGRveDtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXREZXZpY2VPcmdZID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMubGRldmljZU9yZ1k7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGV2aWNlT3JnWSA9IGZ1bmN0aW9uIChkb3kpXG57XG4gIHRoaXMubGRldmljZU9yZ1kgPSBkb3k7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0RGV2aWNlRXh0WCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmxkZXZpY2VFeHRYO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldERldmljZUV4dFggPSBmdW5jdGlvbiAoZGV4KVxue1xuICB0aGlzLmxkZXZpY2VFeHRYID0gZGV4O1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZUV4dFkgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5sZGV2aWNlRXh0WTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXREZXZpY2VFeHRZID0gZnVuY3Rpb24gKGRleSlcbntcbiAgdGhpcy5sZGV2aWNlRXh0WSA9IGRleTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS50cmFuc2Zvcm1YID0gZnVuY3Rpb24gKHgpXG57XG4gIHZhciB4RGV2aWNlID0gMC4wO1xuICB2YXIgd29ybGRFeHRYID0gdGhpcy5sd29ybGRFeHRYO1xuICBpZiAod29ybGRFeHRYICE9IDAuMClcbiAge1xuICAgIHhEZXZpY2UgPSB0aGlzLmxkZXZpY2VPcmdYICtcbiAgICAgICAgICAgICgoeCAtIHRoaXMubHdvcmxkT3JnWCkgKiB0aGlzLmxkZXZpY2VFeHRYIC8gd29ybGRFeHRYKTtcbiAgfVxuXG4gIHJldHVybiB4RGV2aWNlO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnRyYW5zZm9ybVkgPSBmdW5jdGlvbiAoeSlcbntcbiAgdmFyIHlEZXZpY2UgPSAwLjA7XG4gIHZhciB3b3JsZEV4dFkgPSB0aGlzLmx3b3JsZEV4dFk7XG4gIGlmICh3b3JsZEV4dFkgIT0gMC4wKVxuICB7XG4gICAgeURldmljZSA9IHRoaXMubGRldmljZU9yZ1kgK1xuICAgICAgICAgICAgKCh5IC0gdGhpcy5sd29ybGRPcmdZKSAqIHRoaXMubGRldmljZUV4dFkgLyB3b3JsZEV4dFkpO1xuICB9XG5cblxuICByZXR1cm4geURldmljZTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5pbnZlcnNlVHJhbnNmb3JtWCA9IGZ1bmN0aW9uICh4KVxue1xuICB2YXIgeFdvcmxkID0gMC4wO1xuICB2YXIgZGV2aWNlRXh0WCA9IHRoaXMubGRldmljZUV4dFg7XG4gIGlmIChkZXZpY2VFeHRYICE9IDAuMClcbiAge1xuICAgIHhXb3JsZCA9IHRoaXMubHdvcmxkT3JnWCArXG4gICAgICAgICAgICAoKHggLSB0aGlzLmxkZXZpY2VPcmdYKSAqIHRoaXMubHdvcmxkRXh0WCAvIGRldmljZUV4dFgpO1xuICB9XG5cblxuICByZXR1cm4geFdvcmxkO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmludmVyc2VUcmFuc2Zvcm1ZID0gZnVuY3Rpb24gKHkpXG57XG4gIHZhciB5V29ybGQgPSAwLjA7XG4gIHZhciBkZXZpY2VFeHRZID0gdGhpcy5sZGV2aWNlRXh0WTtcbiAgaWYgKGRldmljZUV4dFkgIT0gMC4wKVxuICB7XG4gICAgeVdvcmxkID0gdGhpcy5sd29ybGRPcmdZICtcbiAgICAgICAgICAgICgoeSAtIHRoaXMubGRldmljZU9yZ1kpICogdGhpcy5sd29ybGRFeHRZIC8gZGV2aWNlRXh0WSk7XG4gIH1cbiAgcmV0dXJuIHlXb3JsZDtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5pbnZlcnNlVHJhbnNmb3JtUG9pbnQgPSBmdW5jdGlvbiAoaW5Qb2ludClcbntcbiAgdmFyIG91dFBvaW50ID1cbiAgICAgICAgICBuZXcgUG9pbnREKHRoaXMuaW52ZXJzZVRyYW5zZm9ybVgoaW5Qb2ludC54KSxcbiAgICAgICAgICAgICAgICAgIHRoaXMuaW52ZXJzZVRyYW5zZm9ybVkoaW5Qb2ludC55KSk7XG4gIHJldHVybiBvdXRQb2ludDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2Zvcm07XG4iLCJmdW5jdGlvbiBVbmlxdWVJREdlbmVyZXRvcigpIHtcbn1cblxuVW5pcXVlSURHZW5lcmV0b3IubGFzdElEID0gMDtcblxuVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQgPSBmdW5jdGlvbiAob2JqKSB7XG4gIGlmIChVbmlxdWVJREdlbmVyZXRvci5pc1ByaW1pdGl2ZShvYmopKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuICBpZiAob2JqLnVuaXF1ZUlEICE9IG51bGwpIHtcbiAgICByZXR1cm4gb2JqLnVuaXF1ZUlEO1xuICB9XG4gIG9iai51bmlxdWVJRCA9IFVuaXF1ZUlER2VuZXJldG9yLmdldFN0cmluZygpO1xuICBVbmlxdWVJREdlbmVyZXRvci5sYXN0SUQrKztcbiAgcmV0dXJuIG9iai51bmlxdWVJRDtcbn1cblxuVW5pcXVlSURHZW5lcmV0b3IuZ2V0U3RyaW5nID0gZnVuY3Rpb24gKGlkKSB7XG4gIGlmIChpZCA9PSBudWxsKVxuICAgIGlkID0gVW5pcXVlSURHZW5lcmV0b3IubGFzdElEO1xuICByZXR1cm4gXCJPYmplY3QjXCIgKyBpZCArIFwiXCI7XG59XG5cblVuaXF1ZUlER2VuZXJldG9yLmlzUHJpbWl0aXZlID0gZnVuY3Rpb24gKGFyZykge1xuICB2YXIgdHlwZSA9IHR5cGVvZiBhcmc7XG4gIHJldHVybiBhcmcgPT0gbnVsbCB8fCAodHlwZSAhPSBcIm9iamVjdFwiICYmIHR5cGUgIT0gXCJmdW5jdGlvblwiKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBVbmlxdWVJREdlbmVyZXRvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIERpbWVuc2lvbkQgPSByZXF1aXJlKCcuL0RpbWVuc2lvbkQnKTtcbnZhciBIYXNoTWFwID0gcmVxdWlyZSgnLi9IYXNoTWFwJyk7XG52YXIgSGFzaFNldCA9IHJlcXVpcmUoJy4vSGFzaFNldCcpO1xudmFyIElHZW9tZXRyeSA9IHJlcXVpcmUoJy4vSUdlb21ldHJ5Jyk7XG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XG52YXIgSW50ZWdlciA9IHJlcXVpcmUoJy4vSW50ZWdlcicpO1xudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9Qb2ludCcpO1xudmFyIFBvaW50RCA9IHJlcXVpcmUoJy4vUG9pbnREJyk7XG52YXIgUmFuZG9tU2VlZCA9IHJlcXVpcmUoJy4vUmFuZG9tU2VlZCcpO1xudmFyIFJlY3RhbmdsZUQgPSByZXF1aXJlKCcuL1JlY3RhbmdsZUQnKTtcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL1RyYW5zZm9ybScpO1xudmFyIFVuaXF1ZUlER2VuZXJldG9yID0gcmVxdWlyZSgnLi9VbmlxdWVJREdlbmVyZXRvcicpO1xudmFyIExHcmFwaE9iamVjdCA9IHJlcXVpcmUoJy4vTEdyYXBoT2JqZWN0Jyk7XG52YXIgTEdyYXBoID0gcmVxdWlyZSgnLi9MR3JhcGgnKTtcbnZhciBMRWRnZSA9IHJlcXVpcmUoJy4vTEVkZ2UnKTtcbnZhciBMR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9MR3JhcGhNYW5hZ2VyJyk7XG52YXIgTE5vZGUgPSByZXF1aXJlKCcuL0xOb2RlJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9MYXlvdXQnKTtcbnZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xudmFyIEZETGF5b3V0ID0gcmVxdWlyZSgnLi9GRExheW91dCcpO1xudmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xudmFyIEZETGF5b3V0RWRnZSA9IHJlcXVpcmUoJy4vRkRMYXlvdXRFZGdlJyk7XG52YXIgRkRMYXlvdXROb2RlID0gcmVxdWlyZSgnLi9GRExheW91dE5vZGUnKTtcbnZhciBDb1NFQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9Db1NFQ29uc3RhbnRzJyk7XG52YXIgQ29TRUVkZ2UgPSByZXF1aXJlKCcuL0NvU0VFZGdlJyk7XG52YXIgQ29TRUdyYXBoID0gcmVxdWlyZSgnLi9Db1NFR3JhcGgnKTtcbnZhciBDb1NFR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9Db1NFR3JhcGhNYW5hZ2VyJyk7XG52YXIgQ29TRUxheW91dCA9IHJlcXVpcmUoJy4vQ29TRUxheW91dCcpO1xudmFyIENvU0VOb2RlID0gcmVxdWlyZSgnLi9Db1NFTm9kZScpO1xuXG5fQ29TRUxheW91dC5pZFRvTE5vZGUgPSB7fTtcbl9Db1NFTGF5b3V0LnRvQmVUaWxlZCA9IHt9O1xuXG52YXIgZGVmYXVsdHMgPSB7XG4gIC8vIENhbGxlZCBvbiBgbGF5b3V0cmVhZHlgXG4gIHJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gIH0sXG4gIC8vIENhbGxlZCBvbiBgbGF5b3V0c3RvcGBcbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICB9LFxuICAvLyBXaGV0aGVyIHRvIGZpdCB0aGUgbmV0d29yayB2aWV3IGFmdGVyIHdoZW4gZG9uZVxuICBmaXQ6IHRydWUsXG4gIC8vIFBhZGRpbmcgb24gZml0XG4gIHBhZGRpbmc6IDEwLFxuICAvLyBXaGV0aGVyIHRvIGVuYWJsZSBpbmNyZW1lbnRhbCBtb2RlXG4gIHJhbmRvbWl6ZTogdHJ1ZSxcbiAgLy8gTm9kZSByZXB1bHNpb24gKG5vbiBvdmVybGFwcGluZykgbXVsdGlwbGllclxuICBub2RlUmVwdWxzaW9uOiA0NTAwLFxuICAvLyBJZGVhbCBlZGdlIChub24gbmVzdGVkKSBsZW5ndGhcbiAgaWRlYWxFZGdlTGVuZ3RoOiA1MCxcbiAgLy8gRGl2aXNvciB0byBjb21wdXRlIGVkZ2UgZm9yY2VzXG4gIGVkZ2VFbGFzdGljaXR5OiAwLjQ1LFxuICAvLyBOZXN0aW5nIGZhY3RvciAobXVsdGlwbGllcikgdG8gY29tcHV0ZSBpZGVhbCBlZGdlIGxlbmd0aCBmb3IgbmVzdGVkIGVkZ2VzXG4gIG5lc3RpbmdGYWN0b3I6IDAuMSxcbiAgLy8gR3Jhdml0eSBmb3JjZSAoY29uc3RhbnQpXG4gIGdyYXZpdHk6IDAuMjUsXG4gIC8vIE1heGltdW0gbnVtYmVyIG9mIGl0ZXJhdGlvbnMgdG8gcGVyZm9ybVxuICBudW1JdGVyOiAyNTAwLFxuICAvLyBGb3IgZW5hYmxpbmcgdGlsaW5nXG4gIHRpbGU6IHRydWUsXG4gIC8vIFR5cGUgb2YgbGF5b3V0IGFuaW1hdGlvbi4gVGhlIG9wdGlvbiBzZXQgaXMgeydkdXJpbmcnLCAnZW5kJywgZmFsc2V9XG4gIGFuaW1hdGU6ICdlbmQnLFxuICAvLyBSZXByZXNlbnRzIHRoZSBhbW91bnQgb2YgdGhlIHZlcnRpY2FsIHNwYWNlIHRvIHB1dCBiZXR3ZWVuIHRoZSB6ZXJvIGRlZ3JlZSBtZW1iZXJzIGR1cmluZyB0aGUgdGlsaW5nIG9wZXJhdGlvbihjYW4gYWxzbyBiZSBhIGZ1bmN0aW9uKVxuICB0aWxpbmdQYWRkaW5nVmVydGljYWw6IDEwLFxuICAvLyBSZXByZXNlbnRzIHRoZSBhbW91bnQgb2YgdGhlIGhvcml6b250YWwgc3BhY2UgdG8gcHV0IGJldHdlZW4gdGhlIHplcm8gZGVncmVlIG1lbWJlcnMgZHVyaW5nIHRoZSB0aWxpbmcgb3BlcmF0aW9uKGNhbiBhbHNvIGJlIGEgZnVuY3Rpb24pXG4gIHRpbGluZ1BhZGRpbmdIb3Jpem9udGFsOiAxMCxcbiAgLy8gR3Jhdml0eSByYW5nZSAoY29uc3RhbnQpIGZvciBjb21wb3VuZHNcbiAgZ3Jhdml0eVJhbmdlQ29tcG91bmQ6IDEuNSxcbiAgLy8gR3Jhdml0eSBmb3JjZSAoY29uc3RhbnQpIGZvciBjb21wb3VuZHNcbiAgZ3Jhdml0eUNvbXBvdW5kOiAxLjAsXG4gIC8vIEdyYXZpdHkgcmFuZ2UgKGNvbnN0YW50KVxuICBncmF2aXR5UmFuZ2U6IDMuOFxufTtcblxuZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XG4gIHZhciBvYmogPSB7fTtcblxuICBmb3IgKHZhciBpIGluIGRlZmF1bHRzKSB7XG4gICAgb2JqW2ldID0gZGVmYXVsdHNbaV07XG4gIH1cblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICBvYmpbaV0gPSBvcHRpb25zW2ldO1xuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cbjtcblxuX0NvU0VMYXlvdXQubGF5b3V0ID0gbmV3IENvU0VMYXlvdXQoKTtcbmZ1bmN0aW9uIF9Db1NFTGF5b3V0KG9wdGlvbnMpIHtcblxuICB0aGlzLm9wdGlvbnMgPSBleHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpO1xuICBfQ29TRUxheW91dC5nZXRVc2VyT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xufVxuXG5fQ29TRUxheW91dC5nZXRVc2VyT3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zLm5vZGVSZXB1bHNpb24gIT0gbnVsbClcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEggPSBvcHRpb25zLm5vZGVSZXB1bHNpb247XG4gIGlmIChvcHRpb25zLmlkZWFsRWRnZUxlbmd0aCAhPSBudWxsKVxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggPSBvcHRpb25zLmlkZWFsRWRnZUxlbmd0aDtcbiAgaWYgKG9wdGlvbnMuZWRnZUVsYXN0aWNpdHkgIT0gbnVsbClcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfU1BSSU5HX1NUUkVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEggPSBvcHRpb25zLmVkZ2VFbGFzdGljaXR5O1xuICBpZiAob3B0aW9ucy5uZXN0aW5nRmFjdG9yICE9IG51bGwpXG4gICAgQ29TRUNvbnN0YW50cy5QRVJfTEVWRUxfSURFQUxfRURHRV9MRU5HVEhfRkFDVE9SID0gRkRMYXlvdXRDb25zdGFudHMuUEVSX0xFVkVMX0lERUFMX0VER0VfTEVOR1RIX0ZBQ1RPUiA9IG9wdGlvbnMubmVzdGluZ0ZhY3RvcjtcbiAgaWYgKG9wdGlvbnMuZ3Jhdml0eSAhPSBudWxsKVxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIID0gb3B0aW9ucy5ncmF2aXR5O1xuICBpZiAob3B0aW9ucy5udW1JdGVyICE9IG51bGwpXG4gICAgQ29TRUNvbnN0YW50cy5NQVhfSVRFUkFUSU9OUyA9IEZETGF5b3V0Q29uc3RhbnRzLk1BWF9JVEVSQVRJT05TID0gb3B0aW9ucy5udW1JdGVyO1xuICBpZiAob3B0aW9ucy5ncmF2aXR5UmFuZ2UgIT0gbnVsbClcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfUkFOR0VfRkFDVE9SID0gb3B0aW9ucy5ncmF2aXR5UmFuZ2U7XG4gIGlmKG9wdGlvbnMuZ3Jhdml0eUNvbXBvdW5kICE9IG51bGwpXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEggPSBvcHRpb25zLmdyYXZpdHlDb21wb3VuZDtcbiAgaWYob3B0aW9ucy5ncmF2aXR5UmFuZ2VDb21wb3VuZCAhPSBudWxsKVxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSBvcHRpb25zLmdyYXZpdHlSYW5nZUNvbXBvdW5kO1xuXG4gIENvU0VDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUwgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9XG4gICAgICAgICAgIShvcHRpb25zLnJhbmRvbWl6ZSk7XG4gIENvU0VDb25zdGFudHMuQU5JTUFURSA9IEZETGF5b3V0Q29uc3RhbnRzLkFOSU1BVEUgPSBvcHRpb25zLmFuaW1hdGU7XG59O1xuXG5fQ29TRUxheW91dC5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbGF5b3V0ID0gdGhpcztcblxuICBfQ29TRUxheW91dC5pZFRvTE5vZGUgPSB7fTtcbiAgX0NvU0VMYXlvdXQudG9CZVRpbGVkID0ge307XG4gIF9Db1NFTGF5b3V0LmxheW91dCA9IG5ldyBDb1NFTGF5b3V0KCk7XG4gIHRoaXMuY3kgPSB0aGlzLm9wdGlvbnMuY3k7XG4gIHZhciBhZnRlciA9IHRoaXM7XG5cbiAgdGhpcy5jeS50cmlnZ2VyKCdsYXlvdXRzdGFydCcpO1xuXG4gIHZhciBnbSA9IF9Db1NFTGF5b3V0LmxheW91dC5uZXdHcmFwaE1hbmFnZXIoKTtcbiAgdGhpcy5nbSA9IGdtO1xuXG4gIHZhciBub2RlcyA9IHRoaXMub3B0aW9ucy5lbGVzLm5vZGVzKCk7XG4gIHZhciBlZGdlcyA9IHRoaXMub3B0aW9ucy5lbGVzLmVkZ2VzKCk7XG5cbiAgdGhpcy5yb290ID0gZ20uYWRkUm9vdCgpO1xuXG4gIGlmICghdGhpcy5vcHRpb25zLnRpbGUpIHtcbiAgICB0aGlzLnByb2Nlc3NDaGlsZHJlbkxpc3QodGhpcy5yb290LCBfQ29TRUxheW91dC5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpKTtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBGaW5kIHplcm8gZGVncmVlIG5vZGVzIGFuZCBjcmVhdGUgYSBjb21wb3VuZCBmb3IgZWFjaCBsZXZlbFxuICAgIHZhciBtZW1iZXJHcm91cHMgPSB0aGlzLmdyb3VwWmVyb0RlZ3JlZU1lbWJlcnMoKTtcbiAgICAvLyBUaWxlIGFuZCBjbGVhciBjaGlsZHJlbiBvZiBlYWNoIGNvbXBvdW5kXG4gICAgdmFyIHRpbGVkTWVtYmVyUGFjayA9IHRoaXMuY2xlYXJDb21wb3VuZHModGhpcy5vcHRpb25zKTtcbiAgICAvLyBTZXBhcmF0ZWx5IHRpbGUgYW5kIGNsZWFyIHplcm8gZGVncmVlIG5vZGVzIGZvciBlYWNoIGxldmVsXG4gICAgdmFyIHRpbGVkWmVyb0RlZ3JlZU5vZGVzID0gdGhpcy5jbGVhclplcm9EZWdyZWVNZW1iZXJzKG1lbWJlckdyb3Vwcyk7XG4gIH1cblxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xuICAgIHZhciBzb3VyY2VOb2RlID0gX0NvU0VMYXlvdXQuaWRUb0xOb2RlW2VkZ2UuZGF0YShcInNvdXJjZVwiKV07XG4gICAgdmFyIHRhcmdldE5vZGUgPSBfQ29TRUxheW91dC5pZFRvTE5vZGVbZWRnZS5kYXRhKFwidGFyZ2V0XCIpXTtcbiAgICB2YXIgZTEgPSBnbS5hZGQoX0NvU0VMYXlvdXQubGF5b3V0Lm5ld0VkZ2UoKSwgc291cmNlTm9kZSwgdGFyZ2V0Tm9kZSk7XG4gICAgZTEuaWQgPSBlZGdlLmlkKCk7XG4gIH1cblxuICB2YXIgbm9kZXMgPSB0aGlzLm9wdGlvbnMuZWxlcy5ub2RlcygpO1xuICB2YXIgZWRnZXMgPSB0aGlzLm9wdGlvbnMuZWxlcy5lZGdlcygpO1xuXG4gIC8vIEZpcnN0IEkgbmVlZCB0byBjcmVhdGUgdGhlIGRhdGEgc3RydWN0dXJlIHRvIHBhc3MgdG8gdGhlIHdvcmtlclxuICB2YXIgcERhdGEgPSB7XG4gICAgJ25vZGVzJzogW10sXG4gICAgJ2VkZ2VzJzogW11cbiAgfTtcblxuICAvL01hcCB0aGUgaWRzIG9mIG5vZGVzIGluIHRoZSBsaXN0IHRvIGNoZWNrIGlmIGEgbm9kZSBpcyBpbiB0aGUgbGlzdCBpbiBjb25zdGFudCB0aW1lXG4gIHZhciBub2RlSWRNYXAgPSB7fTtcblxuICAvL0ZpbGwgdGhlIG1hcCBpbiBsaW5lYXIgdGltZVxuICBmb3IodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspe1xuICAgIG5vZGVJZE1hcFtub2Rlc1tpXS5pZCgpXSA9IHRydWU7XG4gIH1cblxuICB2YXIgbG5vZGVzID0gZ20uZ2V0QWxsTm9kZXMoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgbG5vZGUgPSBsbm9kZXNbaV07XG4gICAgdmFyIG5vZGVJZCA9IGxub2RlLmlkO1xuICAgIHZhciBjeU5vZGUgPSB0aGlzLm9wdGlvbnMuY3kuZ2V0RWxlbWVudEJ5SWQobm9kZUlkKTtcblxuICAgIHZhciBwYXJlbnRJZCA9IGN5Tm9kZS5kYXRhKCdwYXJlbnQnKTtcbiAgICBwYXJlbnRJZCA9IG5vZGVJZE1hcFtwYXJlbnRJZF0/cGFyZW50SWQ6dW5kZWZpbmVkO1xuXG4gICAgdmFyIHcgPSBsbm9kZS5yZWN0LndpZHRoO1xuICAgIHZhciBwb3NYID0gbG5vZGUucmVjdC54O1xuICAgIHZhciBwb3NZID0gbG5vZGUucmVjdC55O1xuICAgIHZhciBoID0gbG5vZGUucmVjdC5oZWlnaHQ7XG4gICAgdmFyIGR1bW15X3BhcmVudF9pZCA9IG51bGw7XG4gICAgaWYoY3lOb2RlLnNjcmF0Y2goJ2Nvc2VCaWxrZW50JykgJiYgY3lOb2RlLnNjcmF0Y2goJ2Nvc2VCaWxrZW50JykuZHVtbXlfcGFyZW50X2lkKVxuICAgICAgZHVtbXlfcGFyZW50X2lkID0gY3lOb2RlLnNjcmF0Y2goJ2Nvc2VCaWxrZW50JykuZHVtbXlfcGFyZW50X2lkO1xuXG4gICAgcERhdGFbICdub2RlcycgXS5wdXNoKHtcbiAgICAgIGlkOiBub2RlSWQsXG4gICAgICBwaWQ6IHBhcmVudElkLFxuICAgICAgeDogcG9zWCxcbiAgICAgIHk6IHBvc1ksXG4gICAgICB3aWR0aDogdyxcbiAgICAgIGhlaWdodDogaCxcbiAgICAgIGR1bW15X3BhcmVudF9pZDogZHVtbXlfcGFyZW50X2lkXG4gICAgfSk7XG5cbiAgfVxuXG4gIHZhciBsZWRnZXMgPSBnbS5nZXRBbGxFZGdlcygpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlZGdlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBsZWRnZSA9IGxlZGdlc1tpXTtcbiAgICB2YXIgZWRnZUlkID0gbGVkZ2UuaWQ7XG4gICAgdmFyIGN5RWRnZSA9IHRoaXMub3B0aW9ucy5jeS5nZXRFbGVtZW50QnlJZChlZGdlSWQpO1xuICAgIHZhciBzcmNOb2RlSWQgPSBjeUVkZ2Uuc291cmNlKCkuaWQoKTtcbiAgICB2YXIgdGd0Tm9kZUlkID0gY3lFZGdlLnRhcmdldCgpLmlkKCk7XG4gICAgcERhdGFbICdlZGdlcycgXS5wdXNoKHtcbiAgICAgIGlkOiBlZGdlSWQsXG4gICAgICBzb3VyY2U6IHNyY05vZGVJZCxcbiAgICAgIHRhcmdldDogdGd0Tm9kZUlkXG4gICAgfSk7XG4gIH1cblxuICB2YXIgcmVhZHkgPSBmYWxzZTtcblxuICB2YXIgbG9nTGlzdGVuZXJzID0gW107XG5cbiAgdmFyIGxvZyA9IGZ1bmN0aW9uIChtc2cpIHtcbiAgICBsb2dMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiggbCApe1xuICAgICAgbCh7IHR5cGU6ICdtZXNzYWdlJywgbG9nOiBtc2cgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIG9uTG9nID0gZnVuY3Rpb24oIGNiICl7XG4gICAgbG9nTGlzdGVuZXJzLnB1c2goIGNiICk7XG4gIH07XG5cbiAgdmFyIHJ1biA9IChmdW5jdGlvbiAocERhdGEpIHtcbiAgICAvLyB0aGUgbGF5b3V0IHdpbGwgYmUgcnVuIGFuZCB0aGUgcmVzdWx0cyBhcmUgdG8gYmUgcmV0dXJuZWQgd2l0aCB0aGUgcmVzdWx0IG1hcFxuICAgIHZhciBsYXlvdXRfdCA9IG5ldyBDb1NFTGF5b3V0KCk7XG4gICAgdmFyIGdtX3QgPSBsYXlvdXRfdC5uZXdHcmFwaE1hbmFnZXIoKTtcbiAgICB2YXIgbmdyYXBoID0gZ21fdC5sYXlvdXQubmV3R3JhcGgoKTtcbiAgICB2YXIgbm5vZGUgPSBnbV90LmxheW91dC5uZXdOb2RlKG51bGwpO1xuICAgIHZhciByb290ID0gZ21fdC5hZGQobmdyYXBoLCBubm9kZSk7XG4gICAgcm9vdC5ncmFwaE1hbmFnZXIgPSBnbV90O1xuICAgIGdtX3Quc2V0Um9vdEdyYXBoKHJvb3QpO1xuICAgIHZhciByb290X3QgPSBnbV90LnJvb3RHcmFwaDtcblxuICAgIC8vbWFwcyBmb3IgaW5uZXIgdXNhZ2VcbiAgICB2YXIgb3JwaGFuc190ID0gW107XG4gICAgdmFyIGlkVG9MTm9kZV90ID0ge307XG4gICAgdmFyIGNoaWxkcmVuTWFwID0ge307XG5cbiAgICAvL0EgbWFwIG9mIG5vZGUgaWQgdG8gY29ycmVzcG9uZGluZyBub2RlIHBvc2l0aW9uIGFuZCBzaXplc1xuICAgIC8vaXQgaXMgdG8gYmUgcmV0dXJuZWQgYXQgdGhlIGVuZCBvZiB0aGUgZnVuY3Rpb25cbiAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICAvL2l0IGlzIHRvIHByb2Nlc3MgdGhlIG5vZGVzIGluIGNvcnJlY3Qgb3JkZXIgcmVjdXJzaXZlbHlcbiAgICB2YXIgcHJvY2Vzc05vZGVzID0gZnVuY3Rpb24gKHBhcmVudCwgY2hpbGRyZW4pIHtcbiAgICAgIHZhciBzaXplID0gY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgICAgdmFyIHRoZUNoaWxkID0gY2hpbGRyZW5baV07XG4gICAgICAgIHZhciBjaGlsZHJlbl9vZl9jaGlsZHJlbiA9IGNoaWxkcmVuTWFwW3RoZUNoaWxkLmlkXTtcbiAgICAgICAgdmFyIHRoZU5vZGU7XG5cbiAgICAgICAgaWYgKHRoZUNoaWxkLndpZHRoICE9IG51bGxcbiAgICAgICAgICAgICAgICAmJiB0aGVDaGlsZC5oZWlnaHQgIT0gbnVsbCkge1xuICAgICAgICAgIHRoZU5vZGUgPSBwYXJlbnQuYWRkKG5ldyBDb1NFTm9kZShnbV90LFxuICAgICAgICAgICAgICAgICAgbmV3IFBvaW50RCh0aGVDaGlsZC54LCB0aGVDaGlsZC55KSxcbiAgICAgICAgICAgICAgICAgIG5ldyBEaW1lbnNpb25EKHBhcnNlRmxvYXQodGhlQ2hpbGQud2lkdGgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KHRoZUNoaWxkLmhlaWdodCkpKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhlTm9kZSA9IHBhcmVudC5hZGQobmV3IENvU0VOb2RlKGdtX3QpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGVOb2RlLmlkID0gdGhlQ2hpbGQuaWQ7XG4gICAgICAgIGlkVG9MTm9kZV90W3RoZUNoaWxkLmlkXSA9IHRoZU5vZGU7XG5cbiAgICAgICAgaWYgKGlzTmFOKHRoZU5vZGUucmVjdC54KSkge1xuICAgICAgICAgIHRoZU5vZGUucmVjdC54ID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc05hTih0aGVOb2RlLnJlY3QueSkpIHtcbiAgICAgICAgICB0aGVOb2RlLnJlY3QueSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hpbGRyZW5fb2ZfY2hpbGRyZW4gIT0gbnVsbCAmJiBjaGlsZHJlbl9vZl9jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdmFyIHRoZU5ld0dyYXBoO1xuICAgICAgICAgIHRoZU5ld0dyYXBoID0gbGF5b3V0X3QuZ2V0R3JhcGhNYW5hZ2VyKCkuYWRkKGxheW91dF90Lm5ld0dyYXBoKCksIHRoZU5vZGUpO1xuICAgICAgICAgIHRoZU5ld0dyYXBoLmdyYXBoTWFuYWdlciA9IGdtX3Q7XG4gICAgICAgICAgcHJvY2Vzc05vZGVzKHRoZU5ld0dyYXBoLCBjaGlsZHJlbl9vZl9jaGlsZHJlbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL2ZpbGwgdGhlIGNoaWRyZW5NYXAgYW5kIG9ycGhhbnNfdCBtYXBzIHRvIHByb2Nlc3MgdGhlIG5vZGVzIGluIHRoZSBjb3JyZWN0IG9yZGVyXG4gICAgdmFyIG5vZGVzID0gcERhdGEubm9kZXM7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRoZU5vZGUgPSBub2Rlc1tpXTtcbiAgICAgIHZhciBwX2lkID0gdGhlTm9kZS5waWQ7XG4gICAgICBpZiAocF9pZCAhPSBudWxsKSB7XG4gICAgICAgIGlmIChjaGlsZHJlbk1hcFtwX2lkXSA9PSBudWxsKSB7XG4gICAgICAgICAgY2hpbGRyZW5NYXBbcF9pZF0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBjaGlsZHJlbk1hcFtwX2lkXS5wdXNoKHRoZU5vZGUpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG9ycGhhbnNfdC5wdXNoKHRoZU5vZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHByb2Nlc3NOb2Rlcyhyb290X3QsIG9ycGhhbnNfdCk7XG5cbiAgICAvL2hhbmRsZSB0aGUgZWRnZXNcbiAgICB2YXIgZWRnZXMgPSBwRGF0YS5lZGdlcztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xuICAgICAgdmFyIHNvdXJjZU5vZGUgPSBpZFRvTE5vZGVfdFtlZGdlLnNvdXJjZV07XG4gICAgICB2YXIgdGFyZ2V0Tm9kZSA9IGlkVG9MTm9kZV90W2VkZ2UudGFyZ2V0XTtcbiAgICAgIHZhciBlMSA9IGdtX3QuYWRkKGxheW91dF90Lm5ld0VkZ2UoKSwgc291cmNlTm9kZSwgdGFyZ2V0Tm9kZSk7XG4gICAgfVxuXG4gICAgLy9ydW4gdGhlIGxheW91dFxuICAgIGxheW91dF90LnJ1bkxheW91dCgpO1xuXG4gICAgLy9maWxsIHRoZSByZXN1bHQgbWFwXG4gICAgZm9yICh2YXIgaWQgaW4gaWRUb0xOb2RlX3QpIHtcbiAgICAgIHZhciBsTm9kZSA9IGlkVG9MTm9kZV90W2lkXTtcbiAgICAgIHZhciByZWN0ID0gbE5vZGUucmVjdDtcbiAgICAgIHJlc3VsdFtpZF0gPSB7XG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgeDogcmVjdC54LFxuICAgICAgICB5OiByZWN0LnksXG4gICAgICAgIHc6IHJlY3Qud2lkdGgsXG4gICAgICAgIGg6IHJlY3QuaGVpZ2h0XG4gICAgICB9O1xuICAgIH1cbiAgICB2YXIgc2VlZHMgPSB7fTtcbiAgICBzZWVkcy5yc1NlZWQgPSBSYW5kb21TZWVkLnNlZWQ7XG4gICAgc2VlZHMucnNYID0gUmFuZG9tU2VlZC54O1xuXG4gICAgdmFyIHBhc3MgPSB7XG4gICAgICByZXN1bHQ6IHJlc3VsdCxcbiAgICAgIHNlZWRzOiBzZWVkc1xuICAgIH07XG5cbiAgICAvL3JldHVybiB0aGUgcmVzdWx0IG1hcCB0byBwYXNzIGl0IHRvIHRoZSB0aGVuIGZ1bmN0aW9uIGFzIHBhcmFtZXRlclxuICAgIHJldHVybiBwYXNzO1xuICB9KTtcblxuICB2YXIgZG9uZSA9IChmdW5jdGlvbiAocGFzcykge1xuICAgIHZhciByZXN1bHQgPSBwYXNzLnJlc3VsdDtcbiAgICB2YXIgc2VlZHMgPSBwYXNzLnNlZWRzO1xuICAgIFJhbmRvbVNlZWQuc2VlZCA9IHNlZWRzLnJzU2VlZDtcbiAgICBSYW5kb21TZWVkLnggPSBzZWVkcy5yc1g7XG4gICAgLy9yZWZyZXNoIHRoZSBsbm9kZSBwb3NpdGlvbnMgYW5kIHNpemVzIGJ5IHVzaW5nIHJlc3VsdCBtYXBcbiAgICBmb3IgKHZhciBpZCBpbiByZXN1bHQpIHtcbiAgICAgIHZhciBsTm9kZSA9IF9Db1NFTGF5b3V0LmlkVG9MTm9kZVtpZF07XG4gICAgICB2YXIgbm9kZSA9IHJlc3VsdFtpZF07XG4gICAgICBsTm9kZS5yZWN0LnggPSBub2RlLng7XG4gICAgICBsTm9kZS5yZWN0LnkgPSBub2RlLnk7XG4gICAgICBsTm9kZS5yZWN0LndpZHRoID0gbm9kZS53O1xuICAgICAgbE5vZGUucmVjdC5oZWlnaHQgPSBub2RlLmg7XG4gICAgfVxuICAgIGlmIChhZnRlci5vcHRpb25zLnRpbGUpIHtcbiAgICAgIC8vIFJlcG9wdWxhdGUgbWVtYmVyc1xuICAgICAgYWZ0ZXIucmVwb3B1bGF0ZVplcm9EZWdyZWVNZW1iZXJzKHRpbGVkWmVyb0RlZ3JlZU5vZGVzKTtcbiAgICAgIGFmdGVyLnJlcG9wdWxhdGVDb21wb3VuZHModGlsZWRNZW1iZXJQYWNrKTtcbiAgICAgIGFmdGVyLm9wdGlvbnMuZWxlcy5ub2RlcygpLnVwZGF0ZUNvbXBvdW5kQm91bmRzKCk7XG4gICAgfVxuXG4gICAgdmFyIGdldFBvc2l0aW9ucyA9IGZ1bmN0aW9uKGkgLGVsZSl7XG4gICAgICB2YXIgdGhlSWQgPSBlbGUuZGF0YSgnaWQnKTtcbiAgICAgIHZhciBsTm9kZSA9IF9Db1NFTGF5b3V0LmlkVG9MTm9kZVt0aGVJZF07XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHg6IGxOb2RlLmdldFJlY3QoKS5nZXRDZW50ZXJYKCksXG4gICAgICAgIHk6IGxOb2RlLmdldFJlY3QoKS5nZXRDZW50ZXJZKClcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGlmKGFmdGVyLm9wdGlvbnMuYW5pbWF0ZSAhPT0gJ2R1cmluZycpe1xuICAgICAgYWZ0ZXIub3B0aW9ucy5lbGVzLm5vZGVzKCkubGF5b3V0UG9zaXRpb25zKGFmdGVyLCBhZnRlci5vcHRpb25zLCBnZXRQb3NpdGlvbnMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGFmdGVyLm9wdGlvbnMuZWxlcy5ub2RlcygpLnBvc2l0aW9ucyhnZXRQb3NpdGlvbnMpO1xuXG4gICAgICBpZiAoYWZ0ZXIub3B0aW9ucy5maXQpXG4gICAgICAgIGFmdGVyLm9wdGlvbnMuY3kuZml0KGFmdGVyLm9wdGlvbnMuZWxlcy5ub2RlcygpLCBhZnRlci5vcHRpb25zLnBhZGRpbmcpO1xuXG4gICAgICAvL3RyaWdnZXIgbGF5b3V0cmVhZHkgd2hlbiBlYWNoIG5vZGUgaGFzIGhhZCBpdHMgcG9zaXRpb24gc2V0IGF0IGxlYXN0IG9uY2VcbiAgICAgIGlmICghcmVhZHkpIHtcbiAgICAgICAgYWZ0ZXIuY3kub25lKCdsYXlvdXRyZWFkeScsIGFmdGVyLm9wdGlvbnMucmVhZHkpO1xuICAgICAgICBhZnRlci5jeS50cmlnZ2VyKCdsYXlvdXRyZWFkeScpO1xuICAgICAgfVxuXG4gICAgICAvLyB0cmlnZ2VyIGxheW91dHN0b3Agd2hlbiB0aGUgbGF5b3V0IHN0b3BzIChlLmcuIGZpbmlzaGVzKVxuICAgICAgYWZ0ZXIuY3kub25lKCdsYXlvdXRzdG9wJywgYWZ0ZXIub3B0aW9ucy5zdG9wKTtcbiAgICAgIGFmdGVyLmN5LnRyaWdnZXIoJ2xheW91dHN0b3AnKTtcbiAgICB9XG5cbiAgICBhZnRlci5vcHRpb25zLmVsZXMubm9kZXMoKS5yZW1vdmVTY3JhdGNoKCdjb3NlQmlsa2VudCcpO1xuICB9KTtcblxuICBvbkxvZyhmdW5jdGlvbiAoZSkge1xuICAgIHZhciBsb2dNc2cgPSBlLm1lc3NhZ2UubG9nO1xuICAgIGlmIChsb2dNc2cgIT0gbnVsbCkge1xuICAgICAgY29uc29sZS5sb2coJ0xvZzogJyArIGxvZ01zZyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBwRGF0YSA9IGUubWVzc2FnZS5wRGF0YTtcbiAgICBpZiAocERhdGEgIT0gbnVsbCkge1xuICAgICAgYWZ0ZXIub3B0aW9ucy5lbGVzLm5vZGVzKCkucG9zaXRpb25zKGZ1bmN0aW9uIChpLCBlbGUpIHtcbiAgICAgICAgaWYgKGVsZS5zY3JhdGNoKCdjb3NlQmlsa2VudCcpICYmIGVsZS5zY3JhdGNoKCdjb3NlQmlsa2VudCcpLmR1bW15X3BhcmVudF9pZCkge1xuICAgICAgICAgIHZhciBkdW1teVBhcmVudCA9IGVsZS5zY3JhdGNoKCdjb3NlQmlsa2VudCcpLmR1bW15X3BhcmVudF9pZDtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogZHVtbXlQYXJlbnQueCxcbiAgICAgICAgICAgIHk6IGR1bW15UGFyZW50LnlcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aGVJZCA9IGVsZS5kYXRhKCdpZCcpO1xuICAgICAgICB2YXIgcE5vZGUgPSBwRGF0YVt0aGVJZF07XG4gICAgICAgIHZhciB0ZW1wID0gdGhpcztcbiAgICAgICAgd2hpbGUgKHBOb2RlID09IG51bGwpIHtcbiAgICAgICAgICB0ZW1wID0gdGVtcC5wYXJlbnQoKVswXTtcbiAgICAgICAgICBwTm9kZSA9IHBEYXRhW3RlbXAuaWQoKV07XG4gICAgICAgICAgcERhdGFbdGhlSWRdID0gcE5vZGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB4OiBwTm9kZS54LFxuICAgICAgICAgIHk6IHBOb2RlLnlcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoYWZ0ZXIub3B0aW9ucy5maXQpXG4gICAgICAgIGFmdGVyLm9wdGlvbnMuY3kuZml0KGFmdGVyLm9wdGlvbnMuZWxlcy5ub2RlcygpLCBhZnRlci5vcHRpb25zLnBhZGRpbmcpO1xuXG4gICAgICBpZiAoIXJlYWR5KSB7XG4gICAgICAgIHJlYWR5ID0gdHJ1ZTtcbiAgICAgICAgYWZ0ZXIub25lKCdsYXlvdXRyZWFkeScsIGFmdGVyLm9wdGlvbnMucmVhZHkpO1xuICAgICAgICBhZnRlci50cmlnZ2VyKHt0eXBlOiAnbGF5b3V0cmVhZHknLCBsYXlvdXQ6IGFmdGVyfSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9KTtcblxuICBkb25lKCBydW4oIHBEYXRhICkgKTtcblxuICByZXR1cm4gdGhpczsgLy8gY2hhaW5pbmdcbn07XG5cbi8vR2V0IHRoZSB0b3AgbW9zdCBvbmVzIG9mIGEgbGlzdCBvZiBub2Rlc1xuX0NvU0VMYXlvdXQuZ2V0VG9wTW9zdE5vZGVzID0gZnVuY3Rpb24obm9kZXMpIHtcbiAgdmFyIG5vZGVzTWFwID0ge307XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG5vZGVzTWFwW25vZGVzW2ldLmlkKCldID0gdHJ1ZTtcbiAgfVxuICB2YXIgcm9vdHMgPSBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKGksIGVsZSkge1xuICAgICAgdmFyIHBhcmVudCA9IGVsZS5wYXJlbnQoKVswXTtcbiAgICAgIHdoaWxlKHBhcmVudCAhPSBudWxsKXtcbiAgICAgICAgaWYobm9kZXNNYXBbcGFyZW50LmlkKCldKXtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudCgpWzBdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiByb290cztcbn07XG5cbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRUb0JlVGlsZWQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB2YXIgaWQgPSBub2RlLmRhdGEoXCJpZFwiKTtcbiAgLy9maXJzdGx5IGNoZWNrIHRoZSBwcmV2aW91cyByZXN1bHRzXG4gIGlmIChfQ29TRUxheW91dC50b0JlVGlsZWRbaWRdICE9IG51bGwpIHtcbiAgICByZXR1cm4gX0NvU0VMYXlvdXQudG9CZVRpbGVkW2lkXTtcbiAgfVxuXG4gIC8vb25seSBjb21wb3VuZCBub2RlcyBhcmUgdG8gYmUgdGlsZWRcbiAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xuICBpZiAoY2hpbGRyZW4gPT0gbnVsbCB8fCBjaGlsZHJlbi5sZW5ndGggPT0gMCkge1xuICAgIF9Db1NFTGF5b3V0LnRvQmVUaWxlZFtpZF0gPSBmYWxzZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvL2EgY29tcG91bmQgbm9kZSBpcyBub3QgdG8gYmUgdGlsZWQgaWYgYWxsIG9mIGl0cyBjb21wb3VuZCBjaGlsZHJlbiBhcmUgbm90IHRvIGJlIHRpbGVkXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdGhlQ2hpbGQgPSBjaGlsZHJlbltpXTtcblxuICAgIGlmICh0aGlzLmdldE5vZGVEZWdyZWUodGhlQ2hpbGQpID4gMCkge1xuICAgICAgX0NvU0VMYXlvdXQudG9CZVRpbGVkW2lkXSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vcGFzcyB0aGUgY2hpbGRyZW4gbm90IGhhdmluZyB0aGUgY29tcG91bmQgc3RydWN0dXJlXG4gICAgaWYgKHRoZUNoaWxkLmNoaWxkcmVuKCkgPT0gbnVsbCB8fCB0aGVDaGlsZC5jaGlsZHJlbigpLmxlbmd0aCA9PSAwKSB7XG4gICAgICBfQ29TRUxheW91dC50b0JlVGlsZWRbdGhlQ2hpbGQuZGF0YShcImlkXCIpXSA9IGZhbHNlO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmdldFRvQmVUaWxlZCh0aGVDaGlsZCkpIHtcbiAgICAgIF9Db1NFTGF5b3V0LnRvQmVUaWxlZFtpZF0gPSBmYWxzZTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgX0NvU0VMYXlvdXQudG9CZVRpbGVkW2lkXSA9IHRydWU7XG4gIHJldHVybiB0cnVlO1xufTtcblxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmdldE5vZGVEZWdyZWUgPSBmdW5jdGlvbiAobm9kZSkge1xuICB2YXIgaWQgPSBub2RlLmlkKCk7XG4gIHZhciBlZGdlcyA9IHRoaXMub3B0aW9ucy5lbGVzLmVkZ2VzKCkuZmlsdGVyKGZ1bmN0aW9uIChpLCBlbGUpIHtcbiAgICB2YXIgc291cmNlID0gZWxlLmRhdGEoJ3NvdXJjZScpO1xuICAgIHZhciB0YXJnZXQgPSBlbGUuZGF0YSgndGFyZ2V0Jyk7XG4gICAgaWYgKHNvdXJjZSAhPSB0YXJnZXQgJiYgKHNvdXJjZSA9PSBpZCB8fCB0YXJnZXQgPT0gaWQpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZWRnZXMubGVuZ3RoO1xufTtcblxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmdldE5vZGVEZWdyZWVXaXRoQ2hpbGRyZW4gPSBmdW5jdGlvbiAobm9kZSkge1xuICB2YXIgZGVncmVlID0gdGhpcy5nZXROb2RlRGVncmVlKG5vZGUpO1xuICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICBkZWdyZWUgKz0gdGhpcy5nZXROb2RlRGVncmVlV2l0aENoaWxkcmVuKGNoaWxkKTtcbiAgfVxuICByZXR1cm4gZGVncmVlO1xufTtcblxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmdyb3VwWmVyb0RlZ3JlZU1lbWJlcnMgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIGFycmF5IG9mIFtwYXJlbnRfaWQgeCBvbmVEZWdyZWVOb2RlX2lkXVxuICB2YXIgdGVtcE1lbWJlckdyb3VwcyA9IFtdO1xuICB2YXIgbWVtYmVyR3JvdXBzID0gW107XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHBhcmVudE1hcCA9IHt9O1xuXG4gIGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLm9wdGlvbnMuZWxlcy5ub2RlcygpLmxlbmd0aDsgaSsrKXtcbiAgICBwYXJlbnRNYXBbdGhpcy5vcHRpb25zLmVsZXMubm9kZXMoKVtpXS5pZCgpXSA9IHRydWU7XG4gIH1cblxuICAvLyBGaW5kIGFsbCB6ZXJvIGRlZ3JlZSBub2RlcyB3aGljaCBhcmVuJ3QgY292ZXJlZCBieSBhIGNvbXBvdW5kXG4gIHZhciB6ZXJvRGVncmVlID0gdGhpcy5vcHRpb25zLmVsZXMubm9kZXMoKS5maWx0ZXIoZnVuY3Rpb24gKGksIGVsZSkge1xuICAgIHZhciBwaWQgPSBlbGUuZGF0YSgncGFyZW50Jyk7XG4gICAgaWYocGlkICE9IHVuZGVmaW5lZCAmJiAhcGFyZW50TWFwW3BpZF0pe1xuICAgICAgcGlkID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmIChzZWxmLmdldE5vZGVEZWdyZWVXaXRoQ2hpbGRyZW4oZWxlKSA9PSAwICYmIChwaWQgPT0gdW5kZWZpbmVkIHx8IChwaWQgIT0gdW5kZWZpbmVkICYmICFzZWxmLmdldFRvQmVUaWxlZChlbGUucGFyZW50KClbMF0pKSkpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuXG4gIC8vIENyZWF0ZSBhIG1hcCBvZiBwYXJlbnQgbm9kZSBhbmQgaXRzIHplcm8gZGVncmVlIG1lbWJlcnNcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB6ZXJvRGVncmVlLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgdmFyIG5vZGUgPSB6ZXJvRGVncmVlW2ldO1xuICAgIHZhciBwX2lkID0gbm9kZS5wYXJlbnQoKS5pZCgpO1xuXG4gICAgaWYocF9pZCAhPSB1bmRlZmluZWQgJiYgIXBhcmVudE1hcFtwX2lkXSl7XG4gICAgICBwX2lkID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdGVtcE1lbWJlckdyb3Vwc1twX2lkXSA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgIHRlbXBNZW1iZXJHcm91cHNbcF9pZF0gPSBbXTtcblxuICAgIHRlbXBNZW1iZXJHcm91cHNbcF9pZF0gPSB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdLmNvbmNhdChub2RlKTtcbiAgfVxuXG4gIC8vIElmIHRoZXJlIGFyZSBhdCBsZWFzdCB0d28gbm9kZXMgYXQgYSBsZXZlbCwgY3JlYXRlIGEgZHVtbXkgY29tcG91bmQgZm9yIHRoZW1cbiAgZm9yICh2YXIgcF9pZCBpbiB0ZW1wTWVtYmVyR3JvdXBzKSB7XG4gICAgaWYgKHRlbXBNZW1iZXJHcm91cHNbcF9pZF0ubGVuZ3RoID4gMSkge1xuICAgICAgdmFyIGR1bW15Q29tcG91bmRJZCA9IFwiRHVtbXlDb21wb3VuZF9cIiArIHBfaWQ7XG4gICAgICBtZW1iZXJHcm91cHNbZHVtbXlDb21wb3VuZElkXSA9IHRlbXBNZW1iZXJHcm91cHNbcF9pZF07XG5cbiAgICAgIC8vIENyZWF0ZSBhIGR1bW15IGNvbXBvdW5kXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmN5LmdldEVsZW1lbnRCeUlkKGR1bW15Q29tcG91bmRJZCkuZW1wdHkoKSkge1xuICAgICAgICB0aGlzLm9wdGlvbnMuY3kuYWRkKHtcbiAgICAgICAgICBncm91cDogXCJub2Rlc1wiLFxuICAgICAgICAgIGRhdGE6IHtpZDogZHVtbXlDb21wb3VuZElkLCBwYXJlbnQ6IHBfaWRcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBkdW1teSA9IHRoaXMub3B0aW9ucy5jeS5ub2RlcygpW3RoaXMub3B0aW9ucy5jeS5ub2RlcygpLmxlbmd0aCAtIDFdO1xuICAgICAgICB0aGlzLm9wdGlvbnMuZWxlcyA9IHRoaXMub3B0aW9ucy5lbGVzLnVuaW9uKGR1bW15KTtcbiAgICAgICAgZHVtbXkuaGlkZSgpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGVtcE1lbWJlckdyb3Vwc1twX2lkXS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChpID09IDApIHtcbiAgICAgICAgICAgIGR1bW15LnNjcmF0Y2goJ2Nvc2VCaWxrZW50Jywge3RlbXBjaGlsZHJlbjogW119KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5vZGUgPSB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdW2ldO1xuICAgICAgICAgIHZhciBzY3JhdGNoT2JqID0gbm9kZS5zY3JhdGNoKCdjb3NlQmlsa2VudCcpO1xuICAgICAgICAgIGlmKCFzY3JhdGNoT2JqKSB7XG4gICAgICAgICAgICAgIHNjcmF0Y2hPYmogPSB7fTtcbiAgICAgICAgICAgICAgbm9kZS5zY3JhdGNoKCdjb3NlQmlsa2VudCcsIHNjcmF0Y2hPYmopO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzY3JhdGNoT2JqWydkdW1teV9wYXJlbnRfaWQnXSA9IGR1bW15Q29tcG91bmRJZDtcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuY3kuYWRkKHtcbiAgICAgICAgICAgIGdyb3VwOiBcIm5vZGVzXCIsXG4gICAgICAgICAgICBkYXRhOiB7cGFyZW50OiBkdW1teUNvbXBvdW5kSWQsIHdpZHRoOiBub2RlLndpZHRoKCksIGhlaWdodDogbm9kZS5oZWlnaHQoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHZhciB0ZW1wY2hpbGQgPSB0aGlzLm9wdGlvbnMuY3kubm9kZXMoKVt0aGlzLm9wdGlvbnMuY3kubm9kZXMoKS5sZW5ndGggLSAxXTtcbiAgICAgICAgICB0ZW1wY2hpbGQuaGlkZSgpO1xuICAgICAgICAgIHRlbXBjaGlsZC5jc3MoJ3dpZHRoJywgdGVtcGNoaWxkLmRhdGEoJ3dpZHRoJykpO1xuICAgICAgICAgIHRlbXBjaGlsZC5jc3MoJ2hlaWdodCcsIHRlbXBjaGlsZC5kYXRhKCdoZWlnaHQnKSk7XG4gICAgICAgICAgdGVtcGNoaWxkLndpZHRoKCk7XG4gICAgICAgICAgZHVtbXkuc2NyYXRjaCgnY29zZUJpbGtlbnQnKS50ZW1wY2hpbGRyZW4ucHVzaCh0ZW1wY2hpbGQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1lbWJlckdyb3Vwcztcbn07XG5cbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5wZXJmb3JtREZTT25Db21wb3VuZHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgY29tcG91bmRPcmRlciA9IFtdO1xuXG4gIHZhciByb290cyA9IF9Db1NFTGF5b3V0LmdldFRvcE1vc3ROb2Rlcyh0aGlzLm9wdGlvbnMuZWxlcy5ub2RlcygpKTtcbiAgdGhpcy5maWxsQ29tcGV4T3JkZXJCeURGUyhjb21wb3VuZE9yZGVyLCByb290cyk7XG5cbiAgcmV0dXJuIGNvbXBvdW5kT3JkZXI7XG59O1xuXG5fQ29TRUxheW91dC5wcm90b3R5cGUuZmlsbENvbXBleE9yZGVyQnlERlMgPSBmdW5jdGlvbiAoY29tcG91bmRPcmRlciwgY2hpbGRyZW4pIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xuICAgIHRoaXMuZmlsbENvbXBleE9yZGVyQnlERlMoY29tcG91bmRPcmRlciwgY2hpbGQuY2hpbGRyZW4oKSk7XG4gICAgaWYgKHRoaXMuZ2V0VG9CZVRpbGVkKGNoaWxkKSkge1xuICAgICAgY29tcG91bmRPcmRlci5wdXNoKGNoaWxkKTtcbiAgICB9XG4gIH1cbn07XG5cbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5jbGVhckNvbXBvdW5kcyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBjaGlsZEdyYXBoTWFwID0gW107XG5cbiAgLy8gR2V0IGNvbXBvdW5kIG9yZGVyaW5nIGJ5IGZpbmRpbmcgdGhlIGlubmVyIG9uZSBmaXJzdFxuICB2YXIgY29tcG91bmRPcmRlciA9IHRoaXMucGVyZm9ybURGU09uQ29tcG91bmRzKG9wdGlvbnMpO1xuICBfQ29TRUxheW91dC5jb21wb3VuZE9yZGVyID0gY29tcG91bmRPcmRlcjtcbiAgdGhpcy5wcm9jZXNzQ2hpbGRyZW5MaXN0KHRoaXMucm9vdCwgX0NvU0VMYXlvdXQuZ2V0VG9wTW9zdE5vZGVzKHRoaXMub3B0aW9ucy5lbGVzLm5vZGVzKCkpKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBvdW5kT3JkZXIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBmaW5kIHRoZSBjb3JyZXNwb25kaW5nIGxheW91dCBub2RlXG4gICAgdmFyIGxDb21wb3VuZE5vZGUgPSBfQ29TRUxheW91dC5pZFRvTE5vZGVbY29tcG91bmRPcmRlcltpXS5pZCgpXTtcblxuICAgIGNoaWxkR3JhcGhNYXBbY29tcG91bmRPcmRlcltpXS5pZCgpXSA9IGNvbXBvdW5kT3JkZXJbaV0uY2hpbGRyZW4oKTtcblxuICAgIC8vIFJlbW92ZSBjaGlsZHJlbiBvZiBjb21wb3VuZHNcbiAgICBsQ29tcG91bmROb2RlLmNoaWxkID0gbnVsbDtcbiAgfVxuXG4gIC8vIFRpbGUgdGhlIHJlbW92ZWQgY2hpbGRyZW5cbiAgdmFyIHRpbGVkTWVtYmVyUGFjayA9IHRoaXMudGlsZUNvbXBvdW5kTWVtYmVycyhjaGlsZEdyYXBoTWFwKTtcblxuICByZXR1cm4gdGlsZWRNZW1iZXJQYWNrO1xufTtcblxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmNsZWFyWmVyb0RlZ3JlZU1lbWJlcnMgPSBmdW5jdGlvbiAobWVtYmVyR3JvdXBzKSB7XG4gIHZhciB0aWxlZFplcm9EZWdyZWVQYWNrID0gW107XG5cbiAgZm9yICh2YXIgaWQgaW4gbWVtYmVyR3JvdXBzKSB7XG4gICAgdmFyIGNvbXBvdW5kTm9kZSA9IF9Db1NFTGF5b3V0LmlkVG9MTm9kZVtpZF07XG5cbiAgICB0aWxlZFplcm9EZWdyZWVQYWNrW2lkXSA9IHRoaXMudGlsZU5vZGVzKG1lbWJlckdyb3Vwc1tpZF0pO1xuXG4gICAgLy8gU2V0IHRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIHRoZSBkdW1teSBjb21wb3VuZCBhcyBjYWxjdWxhdGVkXG4gICAgY29tcG91bmROb2RlLnJlY3Qud2lkdGggPSB0aWxlZFplcm9EZWdyZWVQYWNrW2lkXS53aWR0aDtcbiAgICBjb21wb3VuZE5vZGUucmVjdC5oZWlnaHQgPSB0aWxlZFplcm9EZWdyZWVQYWNrW2lkXS5oZWlnaHQ7XG4gIH1cbiAgcmV0dXJuIHRpbGVkWmVyb0RlZ3JlZVBhY2s7XG59O1xuXG5fQ29TRUxheW91dC5wcm90b3R5cGUucmVwb3B1bGF0ZUNvbXBvdW5kcyA9IGZ1bmN0aW9uICh0aWxlZE1lbWJlclBhY2spIHtcbiAgZm9yICh2YXIgaSA9IF9Db1NFTGF5b3V0LmNvbXBvdW5kT3JkZXIubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgaWQgPSBfQ29TRUxheW91dC5jb21wb3VuZE9yZGVyW2ldLmlkKCk7XG4gICAgdmFyIGxDb21wb3VuZE5vZGUgPSBfQ29TRUxheW91dC5pZFRvTE5vZGVbaWRdO1xuICAgIHZhciBob3Jpem9udGFsTWFyZ2luID0gcGFyc2VJbnQoX0NvU0VMYXlvdXQuY29tcG91bmRPcmRlcltpXS5jc3MoJ3BhZGRpbmctbGVmdCcpKTtcbiAgICB2YXIgdmVydGljYWxNYXJnaW4gPSBwYXJzZUludChfQ29TRUxheW91dC5jb21wb3VuZE9yZGVyW2ldLmNzcygncGFkZGluZy10b3AnKSk7XG5cbiAgICB0aGlzLmFkanVzdExvY2F0aW9ucyh0aWxlZE1lbWJlclBhY2tbaWRdLCBsQ29tcG91bmROb2RlLnJlY3QueCwgbENvbXBvdW5kTm9kZS5yZWN0LnksIGhvcml6b250YWxNYXJnaW4sIHZlcnRpY2FsTWFyZ2luKTtcbiAgfVxufTtcblxuX0NvU0VMYXlvdXQucHJvdG90eXBlLnJlcG9wdWxhdGVaZXJvRGVncmVlTWVtYmVycyA9IGZ1bmN0aW9uICh0aWxlZFBhY2spIHtcbiAgZm9yICh2YXIgaSBpbiB0aWxlZFBhY2spIHtcbiAgICB2YXIgY29tcG91bmQgPSB0aGlzLmN5LmdldEVsZW1lbnRCeUlkKGkpO1xuICAgIHZhciBjb21wb3VuZE5vZGUgPSBfQ29TRUxheW91dC5pZFRvTE5vZGVbaV07XG4gICAgdmFyIGhvcml6b250YWxNYXJnaW4gPSBwYXJzZUludChjb21wb3VuZC5jc3MoJ3BhZGRpbmctbGVmdCcpKTtcbiAgICB2YXIgdmVydGljYWxNYXJnaW4gPSBwYXJzZUludChjb21wb3VuZC5jc3MoJ3BhZGRpbmctdG9wJykpO1xuXG4gICAgLy8gQWRqdXN0IHRoZSBwb3NpdGlvbnMgb2Ygbm9kZXMgd3J0IGl0cyBjb21wb3VuZFxuICAgIHRoaXMuYWRqdXN0TG9jYXRpb25zKHRpbGVkUGFja1tpXSwgY29tcG91bmROb2RlLnJlY3QueCwgY29tcG91bmROb2RlLnJlY3QueSwgaG9yaXpvbnRhbE1hcmdpbiwgdmVydGljYWxNYXJnaW4pO1xuXG4gICAgdmFyIHRlbXBjaGlsZHJlbiA9IGNvbXBvdW5kLnNjcmF0Y2goJ2Nvc2VCaWxrZW50JykudGVtcGNoaWxkcmVuO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGVtcGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0ZW1wY2hpbGRyZW5baV0ucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHRoZSBkdW1teSBjb21wb3VuZFxuICAgIGNvbXBvdW5kLnJlbW92ZSgpO1xuICB9XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIHBsYWNlcyBlYWNoIHplcm8gZGVncmVlIG1lbWJlciB3cnQgZ2l2ZW4gKHgseSkgY29vcmRpbmF0ZXMgKHRvcCBsZWZ0KS5cbiAqL1xuX0NvU0VMYXlvdXQucHJvdG90eXBlLmFkanVzdExvY2F0aW9ucyA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24sIHgsIHksIGNvbXBvdW5kSG9yaXpvbnRhbE1hcmdpbiwgY29tcG91bmRWZXJ0aWNhbE1hcmdpbikge1xuICB4ICs9IGNvbXBvdW5kSG9yaXpvbnRhbE1hcmdpbjtcbiAgeSArPSBjb21wb3VuZFZlcnRpY2FsTWFyZ2luO1xuXG4gIHZhciBsZWZ0ID0geDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHJvdyA9IG9yZ2FuaXphdGlvbi5yb3dzW2ldO1xuICAgIHggPSBsZWZ0O1xuICAgIHZhciBtYXhIZWlnaHQgPSAwO1xuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCByb3cubGVuZ3RoOyBqKyspIHtcbiAgICAgIHZhciBsbm9kZSA9IHJvd1tqXTtcbiAgICAgIHZhciBub2RlID0gdGhpcy5jeS5nZXRFbGVtZW50QnlJZChsbm9kZS5pZCk7XG5cbiAgICAgIGxub2RlLnJlY3QueCA9IHg7Ly8gKyBsbm9kZS5yZWN0LndpZHRoIC8gMjtcbiAgICAgIGxub2RlLnJlY3QueSA9IHk7Ly8gKyBsbm9kZS5yZWN0LmhlaWdodCAvIDI7XG5cbiAgICAgIHggKz0gbG5vZGUucmVjdC53aWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZztcblxuICAgICAgaWYgKGxub2RlLnJlY3QuaGVpZ2h0ID4gbWF4SGVpZ2h0KVxuICAgICAgICBtYXhIZWlnaHQgPSBsbm9kZS5yZWN0LmhlaWdodDtcbiAgICB9XG5cbiAgICB5ICs9IG1heEhlaWdodCArIG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XG4gIH1cbn07XG5cbl9Db1NFTGF5b3V0LnByb3RvdHlwZS50aWxlQ29tcG91bmRNZW1iZXJzID0gZnVuY3Rpb24gKGNoaWxkR3JhcGhNYXApIHtcbiAgdmFyIHRpbGVkTWVtYmVyUGFjayA9IFtdO1xuXG4gIGZvciAodmFyIGlkIGluIGNoaWxkR3JhcGhNYXApIHtcbiAgICAvLyBBY2Nlc3MgbGF5b3V0SW5mbyBub2RlcyB0byBzZXQgdGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgY29tcG91bmRzXG4gICAgdmFyIGNvbXBvdW5kTm9kZSA9IF9Db1NFTGF5b3V0LmlkVG9MTm9kZVtpZF07XG5cbiAgICB0aWxlZE1lbWJlclBhY2tbaWRdID0gdGhpcy50aWxlTm9kZXMoY2hpbGRHcmFwaE1hcFtpZF0pO1xuXG4gICAgY29tcG91bmROb2RlLnJlY3Qud2lkdGggPSB0aWxlZE1lbWJlclBhY2tbaWRdLndpZHRoICsgMjA7XG4gICAgY29tcG91bmROb2RlLnJlY3QuaGVpZ2h0ID0gdGlsZWRNZW1iZXJQYWNrW2lkXS5oZWlnaHQgKyAyMDtcbiAgfVxuXG4gIHJldHVybiB0aWxlZE1lbWJlclBhY2s7XG59O1xuXG5fQ29TRUxheW91dC5wcm90b3R5cGUudGlsZU5vZGVzID0gZnVuY3Rpb24gKG5vZGVzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHZlcnRpY2FsUGFkZGluZyA9IHR5cGVvZiBzZWxmLm9wdGlvbnMudGlsaW5nUGFkZGluZ1ZlcnRpY2FsID09PSAnZnVuY3Rpb24nID8gc2VsZi5vcHRpb25zLnRpbGluZ1BhZGRpbmdWZXJ0aWNhbC5jYWxsKCkgOiBzZWxmLm9wdGlvbnMudGlsaW5nUGFkZGluZ1ZlcnRpY2FsO1xuICB2YXIgaG9yaXpvbnRhbFBhZGRpbmcgPSB0eXBlb2Ygc2VsZi5vcHRpb25zLnRpbGluZ1BhZGRpbmdIb3Jpem9udGFsID09PSAnZnVuY3Rpb24nID8gc2VsZi5vcHRpb25zLnRpbGluZ1BhZGRpbmdIb3Jpem9udGFsLmNhbGwoKSA6IHNlbGYub3B0aW9ucy50aWxpbmdQYWRkaW5nSG9yaXpvbnRhbDtcbiAgdmFyIG9yZ2FuaXphdGlvbiA9IHtcbiAgICByb3dzOiBbXSxcbiAgICByb3dXaWR0aDogW10sXG4gICAgcm93SGVpZ2h0OiBbXSxcbiAgICB3aWR0aDogMjAsXG4gICAgaGVpZ2h0OiAyMCxcbiAgICB2ZXJ0aWNhbFBhZGRpbmc6IHZlcnRpY2FsUGFkZGluZyxcbiAgICBob3Jpem9udGFsUGFkZGluZzogaG9yaXpvbnRhbFBhZGRpbmdcbiAgfTtcblxuICB2YXIgbGF5b3V0Tm9kZXMgPSBbXTtcblxuICAvLyBHZXQgbGF5b3V0IG5vZGVzXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xuICAgIHZhciBsTm9kZSA9IF9Db1NFTGF5b3V0LmlkVG9MTm9kZVtub2RlLmlkKCldO1xuXG4gICAgaWYgKCFub2RlLnNjcmF0Y2goJ2Nvc2VCaWxrZW50JykgIHx8ICFub2RlLnNjcmF0Y2goJ2Nvc2VCaWxrZW50JykuZHVtbXlfcGFyZW50X2lkKSB7XG4gICAgICB2YXIgb3duZXIgPSBsTm9kZS5vd25lcjtcbiAgICAgIG93bmVyLnJlbW92ZShsTm9kZSk7XG5cbiAgICAgIHRoaXMuZ20ucmVzZXRBbGxOb2RlcygpO1xuICAgICAgdGhpcy5nbS5nZXRBbGxOb2RlcygpO1xuICAgIH1cblxuICAgIGxheW91dE5vZGVzLnB1c2gobE5vZGUpO1xuICB9XG5cbiAgLy8gU29ydCB0aGUgbm9kZXMgaW4gYXNjZW5kaW5nIG9yZGVyIG9mIHRoZWlyIGFyZWFzXG4gIGxheW91dE5vZGVzLnNvcnQoZnVuY3Rpb24gKG4xLCBuMikge1xuICAgIGlmIChuMS5yZWN0LndpZHRoICogbjEucmVjdC5oZWlnaHQgPiBuMi5yZWN0LndpZHRoICogbjIucmVjdC5oZWlnaHQpXG4gICAgICByZXR1cm4gLTE7XG4gICAgaWYgKG4xLnJlY3Qud2lkdGggKiBuMS5yZWN0LmhlaWdodCA8IG4yLnJlY3Qud2lkdGggKiBuMi5yZWN0LmhlaWdodClcbiAgICAgIHJldHVybiAxO1xuICAgIHJldHVybiAwO1xuICB9KTtcblxuICAvLyBDcmVhdGUgdGhlIG9yZ2FuaXphdGlvbiAtPiB0aWxlIG1lbWJlcnNcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXlvdXROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBsTm9kZSA9IGxheW91dE5vZGVzW2ldO1xuXG4gICAgdmFyIGN5Tm9kZSA9IHRoaXMuY3kuZ2V0RWxlbWVudEJ5SWQobE5vZGUuaWQpLnBhcmVudCgpWzBdO1xuICAgIHZhciBtaW5XaWR0aCA9IDA7XG4gICAgaWYoY3lOb2RlKXtcbiAgICAgIG1pbldpZHRoID0gcGFyc2VJbnQoY3lOb2RlLmNzcygncGFkZGluZy1sZWZ0JykpICsgcGFyc2VJbnQoY3lOb2RlLmNzcygncGFkZGluZy1yaWdodCcpKTtcbiAgICB9XG5cbiAgICBpZiAob3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoID09IDApIHtcbiAgICAgIHRoaXMuaW5zZXJ0Tm9kZVRvUm93KG9yZ2FuaXphdGlvbiwgbE5vZGUsIDAsIG1pbldpZHRoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5jYW5BZGRIb3Jpem9udGFsKG9yZ2FuaXphdGlvbiwgbE5vZGUucmVjdC53aWR0aCwgbE5vZGUucmVjdC5oZWlnaHQpKSB7XG4gICAgICB0aGlzLmluc2VydE5vZGVUb1Jvdyhvcmdhbml6YXRpb24sIGxOb2RlLCB0aGlzLmdldFNob3J0ZXN0Um93SW5kZXgob3JnYW5pemF0aW9uKSwgbWluV2lkdGgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuaW5zZXJ0Tm9kZVRvUm93KG9yZ2FuaXphdGlvbiwgbE5vZGUsIG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aCwgbWluV2lkdGgpO1xuICAgIH1cblxuICAgIHRoaXMuc2hpZnRUb0xhc3RSb3cob3JnYW5pemF0aW9uKTtcbiAgfVxuXG4gIHJldHVybiBvcmdhbml6YXRpb247XG59O1xuXG5fQ29TRUxheW91dC5wcm90b3R5cGUuaW5zZXJ0Tm9kZVRvUm93ID0gZnVuY3Rpb24gKG9yZ2FuaXphdGlvbiwgbm9kZSwgcm93SW5kZXgsIG1pbldpZHRoKSB7XG4gIHZhciBtaW5Db21wb3VuZFNpemUgPSBtaW5XaWR0aDtcblxuICAvLyBBZGQgbmV3IHJvdyBpZiBuZWVkZWRcbiAgaWYgKHJvd0luZGV4ID09IG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aCkge1xuICAgIHZhciBzZWNvbmREaW1lbnNpb24gPSBbXTtcblxuICAgIG9yZ2FuaXphdGlvbi5yb3dzLnB1c2goc2Vjb25kRGltZW5zaW9uKTtcbiAgICBvcmdhbml6YXRpb24ucm93V2lkdGgucHVzaChtaW5Db21wb3VuZFNpemUpO1xuICAgIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHQucHVzaCgwKTtcbiAgfVxuXG4gIC8vIFVwZGF0ZSByb3cgd2lkdGhcbiAgdmFyIHcgPSBvcmdhbml6YXRpb24ucm93V2lkdGhbcm93SW5kZXhdICsgbm9kZS5yZWN0LndpZHRoO1xuXG4gIGlmIChvcmdhbml6YXRpb24ucm93c1tyb3dJbmRleF0ubGVuZ3RoID4gMCkge1xuICAgIHcgKz0gb3JnYW5pemF0aW9uLmhvcml6b250YWxQYWRkaW5nO1xuICB9XG5cbiAgb3JnYW5pemF0aW9uLnJvd1dpZHRoW3Jvd0luZGV4XSA9IHc7XG4gIC8vIFVwZGF0ZSBjb21wb3VuZCB3aWR0aFxuICBpZiAob3JnYW5pemF0aW9uLndpZHRoIDwgdykge1xuICAgIG9yZ2FuaXphdGlvbi53aWR0aCA9IHc7XG4gIH1cblxuICAvLyBVcGRhdGUgaGVpZ2h0XG4gIHZhciBoID0gbm9kZS5yZWN0LmhlaWdodDtcbiAgaWYgKHJvd0luZGV4ID4gMClcbiAgICBoICs9IG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XG5cbiAgdmFyIGV4dHJhSGVpZ2h0ID0gMDtcbiAgaWYgKGggPiBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XSkge1xuICAgIGV4dHJhSGVpZ2h0ID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtyb3dJbmRleF07XG4gICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodFtyb3dJbmRleF0gPSBoO1xuICAgIGV4dHJhSGVpZ2h0ID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtyb3dJbmRleF0gLSBleHRyYUhlaWdodDtcbiAgfVxuXG4gIG9yZ2FuaXphdGlvbi5oZWlnaHQgKz0gZXh0cmFIZWlnaHQ7XG5cbiAgLy8gSW5zZXJ0IG5vZGVcbiAgb3JnYW5pemF0aW9uLnJvd3Nbcm93SW5kZXhdLnB1c2gobm9kZSk7XG59O1xuXG4vL1NjYW5zIHRoZSByb3dzIG9mIGFuIG9yZ2FuaXphdGlvbiBhbmQgcmV0dXJucyB0aGUgb25lIHdpdGggdGhlIG1pbiB3aWR0aFxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmdldFNob3J0ZXN0Um93SW5kZXggPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uKSB7XG4gIHZhciByID0gLTE7XG4gIHZhciBtaW4gPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgb3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAob3JnYW5pemF0aW9uLnJvd1dpZHRoW2ldIDwgbWluKSB7XG4gICAgICByID0gaTtcbiAgICAgIG1pbiA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHI7XG59O1xuXG4vL1NjYW5zIHRoZSByb3dzIG9mIGFuIG9yZ2FuaXphdGlvbiBhbmQgcmV0dXJucyB0aGUgb25lIHdpdGggdGhlIG1heCB3aWR0aFxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmdldExvbmdlc3RSb3dJbmRleCA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24pIHtcbiAgdmFyIHIgPSAtMTtcbiAgdmFyIG1heCA9IE51bWJlci5NSU5fVkFMVUU7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcmdhbml6YXRpb24ucm93cy5sZW5ndGg7IGkrKykge1xuXG4gICAgaWYgKG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXSA+IG1heCkge1xuICAgICAgciA9IGk7XG4gICAgICBtYXggPSBvcmdhbml6YXRpb24ucm93V2lkdGhbaV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHI7XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIGNoZWNrcyB3aGV0aGVyIGFkZGluZyBleHRyYSB3aWR0aCB0byB0aGUgb3JnYW5pemF0aW9uIHZpb2xhdGVzXG4gKiB0aGUgYXNwZWN0IHJhdGlvKDEpIG9yIG5vdC5cbiAqL1xuX0NvU0VMYXlvdXQucHJvdG90eXBlLmNhbkFkZEhvcml6b250YWwgPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uLCBleHRyYVdpZHRoLCBleHRyYUhlaWdodCkge1xuXG4gIHZhciBzcmkgPSB0aGlzLmdldFNob3J0ZXN0Um93SW5kZXgob3JnYW5pemF0aW9uKTtcblxuICBpZiAoc3JpIDwgMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgdmFyIG1pbiA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtzcmldO1xuXG4gIGlmIChtaW4gKyBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmcgKyBleHRyYVdpZHRoIDw9IG9yZ2FuaXphdGlvbi53aWR0aClcbiAgICByZXR1cm4gdHJ1ZTtcblxuICB2YXIgaERpZmYgPSAwO1xuXG4gIC8vIEFkZGluZyB0byBhbiBleGlzdGluZyByb3dcbiAgaWYgKG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbc3JpXSA8IGV4dHJhSGVpZ2h0KSB7XG4gICAgaWYgKHNyaSA+IDApXG4gICAgICBoRGlmZiA9IGV4dHJhSGVpZ2h0ICsgb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZyAtIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbc3JpXTtcbiAgfVxuXG4gIHZhciBhZGRfdG9fcm93X3JhdGlvO1xuICBpZiAob3JnYW5pemF0aW9uLndpZHRoIC0gbWluID49IGV4dHJhV2lkdGggKyBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmcpIHtcbiAgICBhZGRfdG9fcm93X3JhdGlvID0gKG9yZ2FuaXphdGlvbi5oZWlnaHQgKyBoRGlmZikgLyAobWluICsgZXh0cmFXaWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZyk7XG4gIH0gZWxzZSB7XG4gICAgYWRkX3RvX3Jvd19yYXRpbyA9IChvcmdhbml6YXRpb24uaGVpZ2h0ICsgaERpZmYpIC8gb3JnYW5pemF0aW9uLndpZHRoO1xuICB9XG5cbiAgLy8gQWRkaW5nIGEgbmV3IHJvdyBmb3IgdGhpcyBub2RlXG4gIGhEaWZmID0gZXh0cmFIZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nO1xuICB2YXIgYWRkX25ld19yb3dfcmF0aW87XG4gIGlmIChvcmdhbml6YXRpb24ud2lkdGggPCBleHRyYVdpZHRoKSB7XG4gICAgYWRkX25ld19yb3dfcmF0aW8gPSAob3JnYW5pemF0aW9uLmhlaWdodCArIGhEaWZmKSAvIGV4dHJhV2lkdGg7XG4gIH0gZWxzZSB7XG4gICAgYWRkX25ld19yb3dfcmF0aW8gPSAob3JnYW5pemF0aW9uLmhlaWdodCArIGhEaWZmKSAvIG9yZ2FuaXphdGlvbi53aWR0aDtcbiAgfVxuXG4gIGlmIChhZGRfbmV3X3Jvd19yYXRpbyA8IDEpXG4gICAgYWRkX25ld19yb3dfcmF0aW8gPSAxIC8gYWRkX25ld19yb3dfcmF0aW87XG5cbiAgaWYgKGFkZF90b19yb3dfcmF0aW8gPCAxKVxuICAgIGFkZF90b19yb3dfcmF0aW8gPSAxIC8gYWRkX3RvX3Jvd19yYXRpbztcblxuICByZXR1cm4gYWRkX3RvX3Jvd19yYXRpbyA8IGFkZF9uZXdfcm93X3JhdGlvO1xufTtcblxuXG4vL0lmIG1vdmluZyB0aGUgbGFzdCBub2RlIGZyb20gdGhlIGxvbmdlc3Qgcm93IGFuZCBhZGRpbmcgaXQgdG8gdGhlIGxhc3Rcbi8vcm93IG1ha2VzIHRoZSBib3VuZGluZyBib3ggc21hbGxlciwgZG8gaXQuXG5fQ29TRUxheW91dC5wcm90b3R5cGUuc2hpZnRUb0xhc3RSb3cgPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uKSB7XG4gIHZhciBsb25nZXN0ID0gdGhpcy5nZXRMb25nZXN0Um93SW5kZXgob3JnYW5pemF0aW9uKTtcbiAgdmFyIGxhc3QgPSBvcmdhbml6YXRpb24ucm93V2lkdGgubGVuZ3RoIC0gMTtcbiAgdmFyIHJvdyA9IG9yZ2FuaXphdGlvbi5yb3dzW2xvbmdlc3RdO1xuICB2YXIgbm9kZSA9IHJvd1tyb3cubGVuZ3RoIC0gMV07XG5cbiAgdmFyIGRpZmYgPSBub2RlLndpZHRoICsgb3JnYW5pemF0aW9uLmhvcml6b250YWxQYWRkaW5nO1xuXG4gIC8vIENoZWNrIGlmIHRoZXJlIGlzIGVub3VnaCBzcGFjZSBvbiB0aGUgbGFzdCByb3dcbiAgaWYgKG9yZ2FuaXphdGlvbi53aWR0aCAtIG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsYXN0XSA+IGRpZmYgJiYgbG9uZ2VzdCAhPSBsYXN0KSB7XG4gICAgLy8gUmVtb3ZlIHRoZSBsYXN0IGVsZW1lbnQgb2YgdGhlIGxvbmdlc3Qgcm93XG4gICAgcm93LnNwbGljZSgtMSwgMSk7XG5cbiAgICAvLyBQdXNoIGl0IHRvIHRoZSBsYXN0IHJvd1xuICAgIG9yZ2FuaXphdGlvbi5yb3dzW2xhc3RdLnB1c2gobm9kZSk7XG5cbiAgICBvcmdhbml6YXRpb24ucm93V2lkdGhbbG9uZ2VzdF0gPSBvcmdhbml6YXRpb24ucm93V2lkdGhbbG9uZ2VzdF0gLSBkaWZmO1xuICAgIG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsYXN0XSA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsYXN0XSArIGRpZmY7XG4gICAgb3JnYW5pemF0aW9uLndpZHRoID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW3RoaXMuZ2V0TG9uZ2VzdFJvd0luZGV4KG9yZ2FuaXphdGlvbildO1xuXG4gICAgLy8gVXBkYXRlIGhlaWdodHMgb2YgdGhlIG9yZ2FuaXphdGlvblxuICAgIHZhciBtYXhIZWlnaHQgPSBOdW1iZXIuTUlOX1ZBTFVFO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm93Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocm93W2ldLmhlaWdodCA+IG1heEhlaWdodClcbiAgICAgICAgbWF4SGVpZ2h0ID0gcm93W2ldLmhlaWdodDtcbiAgICB9XG4gICAgaWYgKGxvbmdlc3QgPiAwKVxuICAgICAgbWF4SGVpZ2h0ICs9IG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XG5cbiAgICB2YXIgcHJldlRvdGFsID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSArIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbGFzdF07XG5cbiAgICBvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xvbmdlc3RdID0gbWF4SGVpZ2h0O1xuICAgIGlmIChvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xhc3RdIDwgbm9kZS5oZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nKVxuICAgICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsYXN0XSA9IG5vZGUuaGVpZ2h0ICsgb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcblxuICAgIHZhciBmaW5hbFRvdGFsID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSArIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbGFzdF07XG4gICAgb3JnYW5pemF0aW9uLmhlaWdodCArPSAoZmluYWxUb3RhbCAtIHByZXZUb3RhbCk7XG5cbiAgICB0aGlzLnNoaWZ0VG9MYXN0Um93KG9yZ2FuaXphdGlvbik7XG4gIH1cbn07XG5cbi8qKlxuICogQGJyaWVmIDogY2FsbGVkIG9uIGNvbnRpbnVvdXMgbGF5b3V0cyB0byBzdG9wIHRoZW0gYmVmb3JlIHRoZXkgZmluaXNoXG4gKi9cbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnN0b3BwZWQgPSB0cnVlO1xuXG4gIHRoaXMudHJpZ2dlcignbGF5b3V0c3RvcCcpO1xuXG4gIHJldHVybiB0aGlzOyAvLyBjaGFpbmluZ1xufTtcblxuX0NvU0VMYXlvdXQucHJvdG90eXBlLnByb2Nlc3NDaGlsZHJlbkxpc3QgPSBmdW5jdGlvbiAocGFyZW50LCBjaGlsZHJlbikge1xuICB2YXIgc2l6ZSA9IGNoaWxkcmVuLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICB2YXIgdGhlQ2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICB0aGlzLm9wdGlvbnMuZWxlcy5ub2RlcygpLmxlbmd0aDtcbiAgICB2YXIgY2hpbGRyZW5fb2ZfY2hpbGRyZW4gPSB0aGVDaGlsZC5jaGlsZHJlbigpO1xuICAgIHZhciB0aGVOb2RlO1xuXG4gICAgaWYgKHRoZUNoaWxkLndpZHRoKCkgIT0gbnVsbFxuICAgICAgICAgICAgJiYgdGhlQ2hpbGQuaGVpZ2h0KCkgIT0gbnVsbCkge1xuICAgICAgdGhlTm9kZSA9IHBhcmVudC5hZGQobmV3IENvU0VOb2RlKF9Db1NFTGF5b3V0LmxheW91dC5ncmFwaE1hbmFnZXIsXG4gICAgICAgICAgICAgIG5ldyBQb2ludEQodGhlQ2hpbGQucG9zaXRpb24oJ3gnKSwgdGhlQ2hpbGQucG9zaXRpb24oJ3knKSksXG4gICAgICAgICAgICAgIG5ldyBEaW1lbnNpb25EKHBhcnNlRmxvYXQodGhlQ2hpbGQud2lkdGgoKSksXG4gICAgICAgICAgICAgICAgICAgICAgcGFyc2VGbG9hdCh0aGVDaGlsZC5oZWlnaHQoKSkpKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhlTm9kZSA9IHBhcmVudC5hZGQobmV3IENvU0VOb2RlKHRoaXMuZ3JhcGhNYW5hZ2VyKSk7XG4gICAgfVxuICAgIHRoZU5vZGUuaWQgPSB0aGVDaGlsZC5kYXRhKFwiaWRcIik7XG4gICAgX0NvU0VMYXlvdXQuaWRUb0xOb2RlW3RoZUNoaWxkLmRhdGEoXCJpZFwiKV0gPSB0aGVOb2RlO1xuXG4gICAgaWYgKGlzTmFOKHRoZU5vZGUucmVjdC54KSkge1xuICAgICAgdGhlTm9kZS5yZWN0LnggPSAwO1xuICAgIH1cblxuICAgIGlmIChpc05hTih0aGVOb2RlLnJlY3QueSkpIHtcbiAgICAgIHRoZU5vZGUucmVjdC55ID0gMDtcbiAgICB9XG5cbiAgICBpZiAoY2hpbGRyZW5fb2ZfY2hpbGRyZW4gIT0gbnVsbCAmJiBjaGlsZHJlbl9vZl9jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgdGhlTmV3R3JhcGg7XG4gICAgICB0aGVOZXdHcmFwaCA9IF9Db1NFTGF5b3V0LmxheW91dC5nZXRHcmFwaE1hbmFnZXIoKS5hZGQoX0NvU0VMYXlvdXQubGF5b3V0Lm5ld0dyYXBoKCksIHRoZU5vZGUpO1xuICAgICAgdGhpcy5wcm9jZXNzQ2hpbGRyZW5MaXN0KHRoZU5ld0dyYXBoLCBjaGlsZHJlbl9vZl9jaGlsZHJlbik7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldChjeXRvc2NhcGUpIHtcbiAgcmV0dXJuIF9Db1NFTGF5b3V0O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxudmFyIGdldExheW91dCA9IHJlcXVpcmUoJy4vTGF5b3V0Jyk7XG5cbnZhciByZWdpc3RlciA9IGZ1bmN0aW9uKCBjeXRvc2NhcGUgKXtcbiAgdmFyIExheW91dCA9IGdldExheW91dCggY3l0b3NjYXBlICk7XG5cbiAgY3l0b3NjYXBlKCdsYXlvdXQnLCAnY29zZS1iaWxrZW50JywgTGF5b3V0KTtcbn07XG5cbmlmKCB0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyApeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxuICByZWdpc3RlciggY3l0b3NjYXBlICk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XG4iXX0=
