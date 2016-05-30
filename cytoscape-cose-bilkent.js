(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeCoseBilkent = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var FDLayoutConstants = _dereq_('./FDLayoutConstants');

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

},{"./FDLayoutConstants":9}],2:[function(_dereq_,module,exports){
var FDLayoutEdge = _dereq_('./FDLayoutEdge');

function CoSEEdge(source, target, vEdge) {
  FDLayoutEdge.call(this, source, target, vEdge);
}

CoSEEdge.prototype = Object.create(FDLayoutEdge.prototype);
for (var prop in FDLayoutEdge) {
  CoSEEdge[prop] = FDLayoutEdge[prop];
}

module.exports = CoSEEdge

},{"./FDLayoutEdge":10}],3:[function(_dereq_,module,exports){
var LGraph = _dereq_('./LGraph');

function CoSEGraph(parent, graphMgr, vGraph) {
  LGraph.call(this, parent, graphMgr, vGraph);
}

CoSEGraph.prototype = Object.create(LGraph.prototype);
for (var prop in LGraph) {
  CoSEGraph[prop] = LGraph[prop];
}

module.exports = CoSEGraph;

},{"./LGraph":18}],4:[function(_dereq_,module,exports){
var LGraphManager = _dereq_('./LGraphManager');

function CoSEGraphManager(layout) {
  LGraphManager.call(this, layout);
}

CoSEGraphManager.prototype = Object.create(LGraphManager.prototype);
for (var prop in LGraphManager) {
  CoSEGraphManager[prop] = LGraphManager[prop];
}

module.exports = CoSEGraphManager;

},{"./LGraphManager":19}],5:[function(_dereq_,module,exports){
var FDLayout = _dereq_('./FDLayout');
var CoSEGraphManager = _dereq_('./CoSEGraphManager');
var CoSEGraph = _dereq_('./CoSEGraph');
var CoSENode = _dereq_('./CoSENode');
var CoSEEdge = _dereq_('./CoSEEdge');

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
    if (layoutOptionsPack.idealEdgeLength < 10)
    {
      this.idealEdgeLength = 10;
    }
    else
    {
      this.idealEdgeLength = layoutOptionsPack.idealEdgeLength;
    }

    this.useSmartIdealEdgeLengthCalculation =
            layoutOptionsPack.smartEdgeLengthCalc;
    this.springConstant =
            Layout.transform(layoutOptionsPack.springStrength,
                    FDLayoutConstants.DEFAULT_SPRING_STRENGTH, 5.0, 5.0);
    this.repulsionConstant =
            Layout.transform(layoutOptionsPack.repulsionStrength,
                    FDLayoutConstants.DEFAULT_REPULSION_STRENGTH, 5.0, 5.0);
    this.gravityConstant =
            Layout.transform(layoutOptionsPack.gravityStrength,
                    FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH);
    this.compoundGravityConstant =
            Layout.transform(layoutOptionsPack.compoundGravityStrength,
                    FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH);
    this.gravityRangeFactor =
            Layout.transform(layoutOptionsPack.gravityRange,
                    FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR);
    this.compoundGravityRangeFactor =
            Layout.transform(layoutOptionsPack.compoundGravityRange,
                    FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR);
  }
};

CoSELayout.prototype.layout = function () {
  var createBendsAsNeeded = layoutOptionsPack.createBendsAsNeeded;
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
    if (layoutOptionsPack.animate === 'during' && this.totalIterations % animationPeriod == 0) {
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

},{"./CoSEEdge":2,"./CoSEGraph":3,"./CoSEGraphManager":4,"./CoSENode":6,"./FDLayout":8}],6:[function(_dereq_,module,exports){
var FDLayoutNode = _dereq_('./FDLayoutNode');

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

},{"./FDLayoutNode":11}],7:[function(_dereq_,module,exports){
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

},{}],8:[function(_dereq_,module,exports){
var Layout = _dereq_('./Layout');
var FDLayoutConstants = _dereq_('./FDLayoutConstants');

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

},{"./FDLayoutConstants":9,"./Layout":22}],9:[function(_dereq_,module,exports){
var layoutOptionsPack = _dereq_('./layoutOptionsPack');

function FDLayoutConstants() {
}

FDLayoutConstants.getUserOptions = function (options) {
  if (options.nodeRepulsion != null)
    FDLayoutConstants.DEFAULT_REPULSION_STRENGTH = options.nodeRepulsion;
  if (options.idealEdgeLength != null) {
    FDLayoutConstants.DEFAULT_EDGE_LENGTH = options.idealEdgeLength;
  }
  if (options.edgeElasticity != null)
    FDLayoutConstants.DEFAULT_SPRING_STRENGTH = options.edgeElasticity;
  if (options.nestingFactor != null)
    FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = options.nestingFactor;
  if (options.gravity != null)
    FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH = options.gravity;
  if (options.numIter != null)
    FDLayoutConstants.MAX_ITERATIONS = options.numIter;
  
  layoutOptionsPack.incremental = !(options.randomize);
  layoutOptionsPack.animate = options.animate;
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

},{"./layoutOptionsPack":31}],10:[function(_dereq_,module,exports){
var LEdge = _dereq_('./LEdge');
var FDLayoutConstants = _dereq_('./FDLayoutConstants');

function FDLayoutEdge(source, target, vEdge) {
  LEdge.call(this, source, target, vEdge);
  this.idealLength = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
}

FDLayoutEdge.prototype = Object.create(LEdge.prototype);

for (var prop in LEdge) {
  FDLayoutEdge[prop] = LEdge[prop];
}

module.exports = FDLayoutEdge;

},{"./FDLayoutConstants":9,"./LEdge":17}],11:[function(_dereq_,module,exports){
var LNode = _dereq_('./LNode');

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

},{"./LNode":21}],12:[function(_dereq_,module,exports){
var UniqueIDGeneretor = _dereq_('./UniqueIDGeneretor');

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

},{"./UniqueIDGeneretor":29}],13:[function(_dereq_,module,exports){
var UniqueIDGeneretor = _dereq_('./UniqueIDGeneretor');

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

},{"./UniqueIDGeneretor":29}],14:[function(_dereq_,module,exports){
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

},{}],15:[function(_dereq_,module,exports){
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

},{}],16:[function(_dereq_,module,exports){
function Integer() {
}

Integer.MAX_VALUE = 2147483647;
Integer.MIN_VALUE = -2147483648;

module.exports = Integer;

},{}],17:[function(_dereq_,module,exports){
var LGraphObject = _dereq_('./LGraphObject');

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

},{"./LGraphObject":20}],18:[function(_dereq_,module,exports){
var LGraphObject = _dereq_('./LGraphObject');
var Integer = _dereq_('./Integer');
var LayoutConstants = _dereq_('./LayoutConstants');
var LGraphManager = _dereq_('./LGraphManager');
var LNode = _dereq_('./LNode');

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

},{"./Integer":16,"./LGraphManager":19,"./LGraphObject":20,"./LNode":21,"./LayoutConstants":23}],19:[function(_dereq_,module,exports){
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

},{}],20:[function(_dereq_,module,exports){
function LGraphObject(vGraphObject) {
  this.vGraphObject = vGraphObject;
}

module.exports = LGraphObject;

},{}],21:[function(_dereq_,module,exports){
var LGraphObject = _dereq_('./LGraphObject');
var Integer = _dereq_('./Integer');
var RectangleD = _dereq_('./RectangleD');

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

},{"./Integer":16,"./LGraphObject":20,"./RectangleD":27}],22:[function(_dereq_,module,exports){
var LayoutConstants = _dereq_('./LayoutConstants');
var HashMap = _dereq_('./HashMap');
var LGraphManager = _dereq_('./LGraphManager');

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
    this.layoutQuality = layoutOptionsPack.layoutQuality;
    this.animationDuringLayout = layoutOptionsPack.animationDuringLayout;
    this.animationPeriod = Math.floor(Layout.transform(layoutOptionsPack.animationPeriod,
            LayoutConstants.DEFAULT_ANIMATION_PERIOD));
    this.animationOnLayout = layoutOptionsPack.animationOnLayout;
    this.incremental = layoutOptionsPack.incremental;
    this.createBendsAsNeeded = layoutOptionsPack.createBendsAsNeeded;
    this.uniformLeafNodeSizes = layoutOptionsPack.uniformLeafNodeSizes;
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

},{"./HashMap":12,"./LGraphManager":19,"./LayoutConstants":23}],23:[function(_dereq_,module,exports){
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

},{}],24:[function(_dereq_,module,exports){
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

},{}],25:[function(_dereq_,module,exports){
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

},{}],26:[function(_dereq_,module,exports){
function RandomSeed() {
}
RandomSeed.seed = 1;
RandomSeed.x = 0;

RandomSeed.nextDouble = function () {
  RandomSeed.x = Math.sin(RandomSeed.seed++) * 10000;
  return RandomSeed.x - Math.floor(RandomSeed.x);
};

module.exports = RandomSeed;

},{}],27:[function(_dereq_,module,exports){
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

},{}],28:[function(_dereq_,module,exports){
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

},{}],29:[function(_dereq_,module,exports){
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

},{}],30:[function(_dereq_,module,exports){
'use strict';

var Thread;

var DimensionD = _dereq_('./DimensionD');
var HashMap = _dereq_('./HashMap');
var HashSet = _dereq_('./HashSet');
var IGeometry = _dereq_('./IGeometry');
var IMath = _dereq_('./IMath');
var Integer = _dereq_('./Integer');
var Point = _dereq_('./Point');
var PointD = _dereq_('./PointD');
var RandomSeed = _dereq_('./RandomSeed');
var RectangleD = _dereq_('./RectangleD');
var Transform = _dereq_('./Transform');
var UniqueIDGeneretor = _dereq_('./UniqueIDGeneretor');
var LGraphObject = _dereq_('./LGraphObject');
var LGraph = _dereq_('./LGraph');
var LEdge = _dereq_('./LEdge');
var LGraphManager = _dereq_('./LGraphManager');
var LNode = _dereq_('./LNode');
var Layout = _dereq_('./Layout');
var LayoutConstants = _dereq_('./LayoutConstants');
var FDLayout = _dereq_('./FDLayout');
var FDLayoutConstants = _dereq_('./FDLayoutConstants');
var FDLayoutEdge = _dereq_('./FDLayoutEdge');
var FDLayoutNode = _dereq_('./FDLayoutNode');
var CoSEConstants = _dereq_('./CoSEConstants');
var CoSEEdge = _dereq_('./CoSEEdge');
var CoSEGraph = _dereq_('./CoSEGraph');
var CoSEGraphManager = _dereq_('./CoSEGraphManager');
var CoSELayout = _dereq_('./CoSELayout');
var CoSENode = _dereq_('./CoSENode');
var layoutOptionsPack = _dereq_('./layoutOptionsPack');

layoutOptionsPack.layoutQuality; // proof, default, draft
layoutOptionsPack.animationDuringLayout; // T-F
layoutOptionsPack.animationOnLayout; // T-F
layoutOptionsPack.animationPeriod; // 0-100
layoutOptionsPack.incremental; // T-F
layoutOptionsPack.createBendsAsNeeded; // T-F
layoutOptionsPack.uniformLeafNodeSizes; // T-F

layoutOptionsPack.defaultLayoutQuality = LayoutConstants.DEFAULT_QUALITY;
layoutOptionsPack.defaultAnimationDuringLayout = LayoutConstants.DEFAULT_ANIMATION_DURING_LAYOUT;
layoutOptionsPack.defaultAnimationOnLayout = LayoutConstants.DEFAULT_ANIMATION_ON_LAYOUT;
layoutOptionsPack.defaultAnimationPeriod = 50;
layoutOptionsPack.defaultIncremental = LayoutConstants.DEFAULT_INCREMENTAL;
layoutOptionsPack.defaultCreateBendsAsNeeded = LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
layoutOptionsPack.defaultUniformLeafNodeSizes = LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES;

function setDefaultLayoutProperties() {
  layoutOptionsPack.layoutQuality = layoutOptionsPack.defaultLayoutQuality;
  layoutOptionsPack.animationDuringLayout = layoutOptionsPack.defaultAnimationDuringLayout;
  layoutOptionsPack.animationOnLayout = layoutOptionsPack.defaultAnimationOnLayout;
  layoutOptionsPack.animationPeriod = layoutOptionsPack.defaultAnimationPeriod;
  layoutOptionsPack.incremental = layoutOptionsPack.defaultIncremental;
  layoutOptionsPack.createBendsAsNeeded = layoutOptionsPack.defaultCreateBendsAsNeeded;
  layoutOptionsPack.uniformLeafNodeSizes = layoutOptionsPack.defaultUniformLeafNodeSizes;
}

setDefaultLayoutProperties();

function fillCoseLayoutOptionsPack() {
  layoutOptionsPack.defaultIdealEdgeLength = CoSEConstants.DEFAULT_EDGE_LENGTH;
  layoutOptionsPack.defaultSpringStrength = 50;
  layoutOptionsPack.defaultRepulsionStrength = 50;
  layoutOptionsPack.defaultSmartRepulsionRangeCalc = CoSEConstants.DEFAULT_USE_SMART_REPULSION_RANGE_CALCULATION;
  layoutOptionsPack.defaultGravityStrength = 50;
  layoutOptionsPack.defaultGravityRange = 50;
  layoutOptionsPack.defaultCompoundGravityStrength = 50;
  layoutOptionsPack.defaultCompoundGravityRange = 50;
  layoutOptionsPack.defaultSmartEdgeLengthCalc = CoSEConstants.DEFAULT_USE_SMART_IDEAL_EDGE_LENGTH_CALCULATION;
  layoutOptionsPack.defaultMultiLevelScaling = CoSEConstants.DEFAULT_USE_MULTI_LEVEL_SCALING;

  layoutOptionsPack.idealEdgeLength = layoutOptionsPack.defaultIdealEdgeLength;
  layoutOptionsPack.springStrength = layoutOptionsPack.defaultSpringStrength;
  layoutOptionsPack.repulsionStrength = layoutOptionsPack.defaultRepulsionStrength;
  layoutOptionsPack.smartRepulsionRangeCalc = layoutOptionsPack.defaultSmartRepulsionRangeCalc;
  layoutOptionsPack.gravityStrength = layoutOptionsPack.defaultGravityStrength;
  layoutOptionsPack.gravityRange = layoutOptionsPack.defaultGravityRange;
  layoutOptionsPack.compoundGravityStrength = layoutOptionsPack.defaultCompoundGravityStrength;
  layoutOptionsPack.compoundGravityRange = layoutOptionsPack.defaultCompoundGravityRange;
  layoutOptionsPack.smartEdgeLengthCalc = layoutOptionsPack.defaultSmartEdgeLengthCalc;
  layoutOptionsPack.multiLevelScaling = layoutOptionsPack.defaultMultiLevelScaling;
}

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
  //whether to make animation while performing the layout
  animate: 'end',
  //represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
  tilingPaddingVertical: 10,
  //represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
  tilingPaddingHorizontal: 10
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
  FDLayoutConstants.getUserOptions(this.options);
  fillCoseLayoutOptionsPack();
}

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


  var t1 = layout.thread;

  if (!t1 || t1.stopped()) { // try to reuse threads
    t1 = layout.thread = Thread();

    t1.require(DimensionD, 'DimensionD');
    t1.require(HashMap, 'HashMap');
    t1.require(HashSet, 'HashSet');
    t1.require(IGeometry, 'IGeometry');
    t1.require(IMath, 'IMath');
    t1.require(Integer, 'Integer');
    t1.require(Point, 'Point');
    t1.require(PointD, 'PointD');
    t1.require(RandomSeed, 'RandomSeed');
    t1.require(RectangleD, 'RectangleD');
    t1.require(Transform, 'Transform');
    t1.require(UniqueIDGeneretor, 'UniqueIDGeneretor');
    t1.require(LGraphObject, 'LGraphObject');
    t1.require(LGraph, 'LGraph');
    t1.require(LEdge, 'LEdge');
    t1.require(LGraphManager, 'LGraphManager');
    t1.require(LNode, 'LNode');
    t1.require(Layout, 'Layout');
    t1.require(LayoutConstants, 'LayoutConstants');
    t1.require(layoutOptionsPack, 'layoutOptionsPack');
    t1.require(FDLayout, 'FDLayout');
    t1.require(FDLayoutConstants, 'FDLayoutConstants');
    t1.require(FDLayoutEdge, 'FDLayoutEdge');
    t1.require(FDLayoutNode, 'FDLayoutNode');
    t1.require(CoSEConstants, 'CoSEConstants');
    t1.require(CoSEEdge, 'CoSEEdge');
    t1.require(CoSEGraph, 'CoSEGraph');
    t1.require(CoSEGraphManager, 'CoSEGraphManager');
    t1.require(CoSELayout, 'CoSELayout');
    t1.require(CoSENode, 'CoSENode');
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
    var dummy_parent_id = cyNode.data('dummy_parent_id');

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

  t1.pass(pData).run(function (pData) {
    var log = function (msg) {
      broadcast({log: msg});
    };

    log("start thread");

    //the layout will be run in the thread and the results are to be passed
    //to the main thread with the result map
    var layout_t = new CoSELayout();
    var gm_t = layout_t.newGraphManager();
    var ngraph = gm_t.layout.newGraph();
    var nnode = gm_t.layout.newNode(null);
    var root = gm_t.add(ngraph, nnode);
    root.graphManager = gm_t;
    gm_t.setRootGraph(root);
    var root_t = gm_t.rootGraph;

    //maps for inner usage of the thread
    var orphans_t = [];
    var idToLNode_t = {};
    var childrenMap = {};

    //A map of node id to corresponding node position and sizes
    //it is to be returned at the end of the thread function
    var result = {};

    //this function is similar to processChildrenList function in the main thread
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

    //run the layout crated in this thread
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
    }
    //return the result map to pass it to the then function as parameter
    return pass;
  }).then(function (pass) {
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
    
    t1.stop();
    after.options.eles.nodes().removeData('dummy_parent_id');
  });

  t1.on('message', function (e) {
    var logMsg = e.message.log;
    if (logMsg != null) {
      console.log('Thread log: ' + logMsg);
      return;
    }
    var pData = e.message.pData;
    if (pData != null) {
      after.options.eles.nodes().positions(function (i, ele) {
        if (ele.data('dummy_parent_id')) {
          return {
            x: pData[ele.data('dummy_parent_id')].x,
            y: pData[ele.data('dummy_parent_id')].y
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
            dummy.data('tempchildren', []);
          }
          var node = tempMemberGroups[p_id][i];
          node.data('dummy_parent_id', dummyCompoundId);
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
          dummy.data('tempchildren').push(tempchild);
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

    var tempchildren = compound.data('tempchildren');
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

    if (!node.data('dummy_parent_id')) {
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

  if( this.thread ){
    this.thread.stop();
  }
  
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
  Thread = cytoscape.Thread;

  return _CoSELayout;
};
},{"./CoSEConstants":1,"./CoSEEdge":2,"./CoSEGraph":3,"./CoSEGraphManager":4,"./CoSELayout":5,"./CoSENode":6,"./DimensionD":7,"./FDLayout":8,"./FDLayoutConstants":9,"./FDLayoutEdge":10,"./FDLayoutNode":11,"./HashMap":12,"./HashSet":13,"./IGeometry":14,"./IMath":15,"./Integer":16,"./LEdge":17,"./LGraph":18,"./LGraphManager":19,"./LGraphObject":20,"./LNode":21,"./Layout":22,"./LayoutConstants":23,"./Point":24,"./PointD":25,"./RandomSeed":26,"./RectangleD":27,"./Transform":28,"./UniqueIDGeneretor":29,"./layoutOptionsPack":31}],31:[function(_dereq_,module,exports){
function layoutOptionsPack() {
}

module.exports = layoutOptionsPack;
},{}],32:[function(_dereq_,module,exports){
'use strict';

// registers the extension on a cytoscape lib ref
var getLayout = _dereq_('./Layout');

var register = function( cytoscape ){
  var Layout = getLayout( cytoscape );

  cytoscape('layout', 'cose-bilkent', Layout);
};

if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
  register( cytoscape );
}

module.exports = register;

},{"./Layout":30}]},{},[32])(32)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvTGF5b3V0L0NvU0VDb25zdGFudHMuanMiLCJzcmMvTGF5b3V0L0NvU0VFZGdlLmpzIiwic3JjL0xheW91dC9Db1NFR3JhcGguanMiLCJzcmMvTGF5b3V0L0NvU0VHcmFwaE1hbmFnZXIuanMiLCJzcmMvTGF5b3V0L0NvU0VMYXlvdXQuanMiLCJzcmMvTGF5b3V0L0NvU0VOb2RlLmpzIiwic3JjL0xheW91dC9EaW1lbnNpb25ELmpzIiwic3JjL0xheW91dC9GRExheW91dC5qcyIsInNyYy9MYXlvdXQvRkRMYXlvdXRDb25zdGFudHMuanMiLCJzcmMvTGF5b3V0L0ZETGF5b3V0RWRnZS5qcyIsInNyYy9MYXlvdXQvRkRMYXlvdXROb2RlLmpzIiwic3JjL0xheW91dC9IYXNoTWFwLmpzIiwic3JjL0xheW91dC9IYXNoU2V0LmpzIiwic3JjL0xheW91dC9JR2VvbWV0cnkuanMiLCJzcmMvTGF5b3V0L0lNYXRoLmpzIiwic3JjL0xheW91dC9JbnRlZ2VyLmpzIiwic3JjL0xheW91dC9MRWRnZS5qcyIsInNyYy9MYXlvdXQvTEdyYXBoLmpzIiwic3JjL0xheW91dC9MR3JhcGhNYW5hZ2VyLmpzIiwic3JjL0xheW91dC9MR3JhcGhPYmplY3QuanMiLCJzcmMvTGF5b3V0L0xOb2RlLmpzIiwic3JjL0xheW91dC9MYXlvdXQuanMiLCJzcmMvTGF5b3V0L0xheW91dENvbnN0YW50cy5qcyIsInNyYy9MYXlvdXQvUG9pbnQuanMiLCJzcmMvTGF5b3V0L1BvaW50RC5qcyIsInNyYy9MYXlvdXQvUmFuZG9tU2VlZC5qcyIsInNyYy9MYXlvdXQvUmVjdGFuZ2xlRC5qcyIsInNyYy9MYXlvdXQvVHJhbnNmb3JtLmpzIiwic3JjL0xheW91dC9VbmlxdWVJREdlbmVyZXRvci5qcyIsInNyYy9MYXlvdXQvaW5kZXguanMiLCJzcmMvTGF5b3V0L2xheW91dE9wdGlvbnNQYWNrLmpzIiwic3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9hQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdGVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2cEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BrQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRkRMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0ZETGF5b3V0Q29uc3RhbnRzJyk7XHJcblxyXG5mdW5jdGlvbiBDb1NFQ29uc3RhbnRzKCkge1xyXG59XHJcblxyXG4vL0NvU0VDb25zdGFudHMgaW5oZXJpdHMgc3RhdGljIHByb3BzIGluIEZETGF5b3V0Q29uc3RhbnRzXHJcbmZvciAodmFyIHByb3AgaW4gRkRMYXlvdXRDb25zdGFudHMpIHtcclxuICBDb1NFQ29uc3RhbnRzW3Byb3BdID0gRkRMYXlvdXRDb25zdGFudHNbcHJvcF07XHJcbn1cclxuXHJcbkNvU0VDb25zdGFudHMuREVGQVVMVF9VU0VfTVVMVElfTEVWRUxfU0NBTElORyA9IGZhbHNlO1xyXG5Db1NFQ29uc3RhbnRzLkRFRkFVTFRfUkFESUFMX1NFUEFSQVRJT04gPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIO1xyXG5Db1NFQ29uc3RhbnRzLkRFRkFVTFRfQ09NUE9ORU5UX1NFUEVSQVRJT04gPSA2MDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29TRUNvbnN0YW50cztcclxuIiwidmFyIEZETGF5b3V0RWRnZSA9IHJlcXVpcmUoJy4vRkRMYXlvdXRFZGdlJyk7XHJcblxyXG5mdW5jdGlvbiBDb1NFRWRnZShzb3VyY2UsIHRhcmdldCwgdkVkZ2UpIHtcclxuICBGRExheW91dEVkZ2UuY2FsbCh0aGlzLCBzb3VyY2UsIHRhcmdldCwgdkVkZ2UpO1xyXG59XHJcblxyXG5Db1NFRWRnZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZETGF5b3V0RWRnZS5wcm90b3R5cGUpO1xyXG5mb3IgKHZhciBwcm9wIGluIEZETGF5b3V0RWRnZSkge1xyXG4gIENvU0VFZGdlW3Byb3BdID0gRkRMYXlvdXRFZGdlW3Byb3BdO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvU0VFZGdlXHJcbiIsInZhciBMR3JhcGggPSByZXF1aXJlKCcuL0xHcmFwaCcpO1xyXG5cclxuZnVuY3Rpb24gQ29TRUdyYXBoKHBhcmVudCwgZ3JhcGhNZ3IsIHZHcmFwaCkge1xyXG4gIExHcmFwaC5jYWxsKHRoaXMsIHBhcmVudCwgZ3JhcGhNZ3IsIHZHcmFwaCk7XHJcbn1cclxuXHJcbkNvU0VHcmFwaC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExHcmFwaC5wcm90b3R5cGUpO1xyXG5mb3IgKHZhciBwcm9wIGluIExHcmFwaCkge1xyXG4gIENvU0VHcmFwaFtwcm9wXSA9IExHcmFwaFtwcm9wXTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb1NFR3JhcGg7XHJcbiIsInZhciBMR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9MR3JhcGhNYW5hZ2VyJyk7XHJcblxyXG5mdW5jdGlvbiBDb1NFR3JhcGhNYW5hZ2VyKGxheW91dCkge1xyXG4gIExHcmFwaE1hbmFnZXIuY2FsbCh0aGlzLCBsYXlvdXQpO1xyXG59XHJcblxyXG5Db1NFR3JhcGhNYW5hZ2VyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEdyYXBoTWFuYWdlci5wcm90b3R5cGUpO1xyXG5mb3IgKHZhciBwcm9wIGluIExHcmFwaE1hbmFnZXIpIHtcclxuICBDb1NFR3JhcGhNYW5hZ2VyW3Byb3BdID0gTEdyYXBoTWFuYWdlcltwcm9wXTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb1NFR3JhcGhNYW5hZ2VyO1xyXG4iLCJ2YXIgRkRMYXlvdXQgPSByZXF1aXJlKCcuL0ZETGF5b3V0Jyk7XHJcbnZhciBDb1NFR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9Db1NFR3JhcGhNYW5hZ2VyJyk7XHJcbnZhciBDb1NFR3JhcGggPSByZXF1aXJlKCcuL0NvU0VHcmFwaCcpO1xyXG52YXIgQ29TRU5vZGUgPSByZXF1aXJlKCcuL0NvU0VOb2RlJyk7XHJcbnZhciBDb1NFRWRnZSA9IHJlcXVpcmUoJy4vQ29TRUVkZ2UnKTtcclxuXHJcbmZ1bmN0aW9uIENvU0VMYXlvdXQoKSB7XHJcbiAgRkRMYXlvdXQuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZETGF5b3V0LnByb3RvdHlwZSk7XHJcblxyXG5mb3IgKHZhciBwcm9wIGluIEZETGF5b3V0KSB7XHJcbiAgQ29TRUxheW91dFtwcm9wXSA9IEZETGF5b3V0W3Byb3BdO1xyXG59XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdHcmFwaE1hbmFnZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGdtID0gbmV3IENvU0VHcmFwaE1hbmFnZXIodGhpcyk7XHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIgPSBnbTtcclxuICByZXR1cm4gZ207XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdHcmFwaCA9IGZ1bmN0aW9uICh2R3JhcGgpIHtcclxuICByZXR1cm4gbmV3IENvU0VHcmFwaChudWxsLCB0aGlzLmdyYXBoTWFuYWdlciwgdkdyYXBoKTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLm5ld05vZGUgPSBmdW5jdGlvbiAodk5vZGUpIHtcclxuICByZXR1cm4gbmV3IENvU0VOb2RlKHRoaXMuZ3JhcGhNYW5hZ2VyLCB2Tm9kZSk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdFZGdlID0gZnVuY3Rpb24gKHZFZGdlKSB7XHJcbiAgcmV0dXJuIG5ldyBDb1NFRWRnZShudWxsLCBudWxsLCB2RWRnZSk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycyA9IGZ1bmN0aW9uICgpIHtcclxuICBGRExheW91dC5wcm90b3R5cGUuaW5pdFBhcmFtZXRlcnMuY2FsbCh0aGlzLCBhcmd1bWVudHMpO1xyXG4gIGlmICghdGhpcy5pc1N1YkxheW91dCkge1xyXG4gICAgaWYgKGxheW91dE9wdGlvbnNQYWNrLmlkZWFsRWRnZUxlbmd0aCA8IDEwKVxyXG4gICAge1xyXG4gICAgICB0aGlzLmlkZWFsRWRnZUxlbmd0aCA9IDEwO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICB0aGlzLmlkZWFsRWRnZUxlbmd0aCA9IGxheW91dE9wdGlvbnNQYWNrLmlkZWFsRWRnZUxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnVzZVNtYXJ0SWRlYWxFZGdlTGVuZ3RoQ2FsY3VsYXRpb24gPVxyXG4gICAgICAgICAgICBsYXlvdXRPcHRpb25zUGFjay5zbWFydEVkZ2VMZW5ndGhDYWxjO1xyXG4gICAgdGhpcy5zcHJpbmdDb25zdGFudCA9XHJcbiAgICAgICAgICAgIExheW91dC50cmFuc2Zvcm0obGF5b3V0T3B0aW9uc1BhY2suc3ByaW5nU3RyZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEgsIDUuMCwgNS4wKTtcclxuICAgIHRoaXMucmVwdWxzaW9uQ29uc3RhbnQgPVxyXG4gICAgICAgICAgICBMYXlvdXQudHJhbnNmb3JtKGxheW91dE9wdGlvbnNQYWNrLnJlcHVsc2lvblN0cmVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RILCA1LjAsIDUuMCk7XHJcbiAgICB0aGlzLmdyYXZpdHlDb25zdGFudCA9XHJcbiAgICAgICAgICAgIExheW91dC50cmFuc2Zvcm0obGF5b3V0T3B0aW9uc1BhY2suZ3Jhdml0eVN0cmVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9TVFJFTkdUSCk7XHJcbiAgICB0aGlzLmNvbXBvdW5kR3Jhdml0eUNvbnN0YW50ID1cclxuICAgICAgICAgICAgTGF5b3V0LnRyYW5zZm9ybShsYXlvdXRPcHRpb25zUGFjay5jb21wb3VuZEdyYXZpdHlTdHJlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEgpO1xyXG4gICAgdGhpcy5ncmF2aXR5UmFuZ2VGYWN0b3IgPVxyXG4gICAgICAgICAgICBMYXlvdXQudHJhbnNmb3JtKGxheW91dE9wdGlvbnNQYWNrLmdyYXZpdHlSYW5nZSxcclxuICAgICAgICAgICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfUkFOR0VfRkFDVE9SKTtcclxuICAgIHRoaXMuY29tcG91bmRHcmF2aXR5UmFuZ2VGYWN0b3IgPVxyXG4gICAgICAgICAgICBMYXlvdXQudHJhbnNmb3JtKGxheW91dE9wdGlvbnNQYWNrLmNvbXBvdW5kR3Jhdml0eVJhbmdlLFxyXG4gICAgICAgICAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1IpO1xyXG4gIH1cclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmxheW91dCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgY3JlYXRlQmVuZHNBc05lZWRlZCA9IGxheW91dE9wdGlvbnNQYWNrLmNyZWF0ZUJlbmRzQXNOZWVkZWQ7XHJcbiAgaWYgKGNyZWF0ZUJlbmRzQXNOZWVkZWQpXHJcbiAge1xyXG4gICAgdGhpcy5jcmVhdGVCZW5kcG9pbnRzKCk7XHJcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZXNldEFsbEVkZ2VzKCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLmxldmVsID0gMDtcclxuICByZXR1cm4gdGhpcy5jbGFzc2ljTGF5b3V0KCk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5jbGFzc2ljTGF5b3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gIHRoaXMuY2FsY3VsYXRlTm9kZXNUb0FwcGx5R3Jhdml0YXRpb25UbygpO1xyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLmNhbGNMb3dlc3RDb21tb25BbmNlc3RvcnMoKTtcclxuICB0aGlzLmdyYXBoTWFuYWdlci5jYWxjSW5jbHVzaW9uVHJlZURlcHRocygpO1xyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5jYWxjRXN0aW1hdGVkU2l6ZSgpO1xyXG4gIHRoaXMuY2FsY0lkZWFsRWRnZUxlbmd0aHMoKTtcclxuICBpZiAoIXRoaXMuaW5jcmVtZW50YWwpXHJcbiAge1xyXG4gICAgdmFyIGZvcmVzdCA9IHRoaXMuZ2V0RmxhdEZvcmVzdCgpO1xyXG5cclxuICAgIC8vIFRoZSBncmFwaCBhc3NvY2lhdGVkIHdpdGggdGhpcyBsYXlvdXQgaXMgZmxhdCBhbmQgYSBmb3Jlc3RcclxuICAgIGlmIChmb3Jlc3QubGVuZ3RoID4gMClcclxuXHJcbiAgICB7XHJcbiAgICAgIHRoaXMucG9zaXRpb25Ob2Rlc1JhZGlhbGx5KGZvcmVzdCk7XHJcbiAgICB9XHJcbiAgICAvLyBUaGUgZ3JhcGggYXNzb2NpYXRlZCB3aXRoIHRoaXMgbGF5b3V0IGlzIG5vdCBmbGF0IG9yIGEgZm9yZXN0XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIHRoaXMucG9zaXRpb25Ob2Rlc1JhbmRvbWx5KCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0aGlzLmluaXRTcHJpbmdFbWJlZGRlcigpO1xyXG4gIHRoaXMucnVuU3ByaW5nRW1iZWRkZXIoKTtcclxuXHJcbiAgY29uc29sZS5sb2coXCJDbGFzc2ljIENvU0UgbGF5b3V0IGZpbmlzaGVkIGFmdGVyIFwiICtcclxuICAgICAgICAgIHRoaXMudG90YWxJdGVyYXRpb25zICsgXCIgaXRlcmF0aW9uc1wiKTtcclxuXHJcbiAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5ydW5TcHJpbmdFbWJlZGRlciA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbGFzdEZyYW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgdmFyIGluaXRpYWxBbmltYXRpb25QZXJpb2QgPSAyNTtcclxuICB2YXIgYW5pbWF0aW9uUGVyaW9kID0gaW5pdGlhbEFuaW1hdGlvblBlcmlvZDtcclxuICBkb1xyXG4gIHtcclxuICAgIHRoaXMudG90YWxJdGVyYXRpb25zKys7XHJcblxyXG4gICAgaWYgKHRoaXMudG90YWxJdGVyYXRpb25zICUgRkRMYXlvdXRDb25zdGFudHMuQ09OVkVSR0VOQ0VfQ0hFQ0tfUEVSSU9EID09IDApXHJcbiAgICB7XHJcbiAgICAgIGlmICh0aGlzLmlzQ29udmVyZ2VkKCkpXHJcbiAgICAgIHtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5jb29saW5nRmFjdG9yID0gdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciAqXHJcbiAgICAgICAgICAgICAgKCh0aGlzLm1heEl0ZXJhdGlvbnMgLSB0aGlzLnRvdGFsSXRlcmF0aW9ucykgLyB0aGlzLm1heEl0ZXJhdGlvbnMpO1xyXG4gICAgICBhbmltYXRpb25QZXJpb2QgPSBNYXRoLmNlaWwoaW5pdGlhbEFuaW1hdGlvblBlcmlvZCAqIE1hdGguc3FydCh0aGlzLmNvb2xpbmdGYWN0b3IpKTtcclxuXHJcbiAgICB9XHJcbiAgICB0aGlzLnRvdGFsRGlzcGxhY2VtZW50ID0gMDtcclxuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLnVwZGF0ZUJvdW5kcygpO1xyXG4gICAgdGhpcy5jYWxjU3ByaW5nRm9yY2VzKCk7XHJcbiAgICB0aGlzLmNhbGNSZXB1bHNpb25Gb3JjZXMoKTtcclxuICAgIHRoaXMuY2FsY0dyYXZpdGF0aW9uYWxGb3JjZXMoKTtcclxuICAgIHRoaXMubW92ZU5vZGVzKCk7XHJcbiAgICB0aGlzLmFuaW1hdGUoKTtcclxuICAgIGlmIChsYXlvdXRPcHRpb25zUGFjay5hbmltYXRlID09PSAnZHVyaW5nJyAmJiB0aGlzLnRvdGFsSXRlcmF0aW9ucyAlIGFuaW1hdGlvblBlcmlvZCA9PSAwKSB7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMWU3OyBpKyspIHtcclxuICAgICAgICBpZiAoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gbGFzdEZyYW1lKSA+IDI1KSB7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgbGFzdEZyYW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgIHZhciBhbGxOb2RlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzKCk7XHJcbiAgICAgIHZhciBwRGF0YSA9IHt9O1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIHJlY3QgPSBhbGxOb2Rlc1tpXS5yZWN0O1xyXG4gICAgICAgIHZhciBpZCA9IGFsbE5vZGVzW2ldLmlkO1xyXG4gICAgICAgIHBEYXRhW2lkXSA9IHtcclxuICAgICAgICAgIGlkOiBpZCxcclxuICAgICAgICAgIHg6IHJlY3QuZ2V0Q2VudGVyWCgpLFxyXG4gICAgICAgICAgeTogcmVjdC5nZXRDZW50ZXJZKCksXHJcbiAgICAgICAgICB3OiByZWN0LndpZHRoLFxyXG4gICAgICAgICAgaDogcmVjdC5oZWlnaHRcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICAgIGJyb2FkY2FzdCh7cERhdGE6IHBEYXRhfSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHdoaWxlICh0aGlzLnRvdGFsSXRlcmF0aW9ucyA8IHRoaXMubWF4SXRlcmF0aW9ucyk7XHJcblxyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLnVwZGF0ZUJvdW5kcygpO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUuY2FsY3VsYXRlTm9kZXNUb0FwcGx5R3Jhdml0YXRpb25UbyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbm9kZUxpc3QgPSBbXTtcclxuICB2YXIgZ3JhcGg7XHJcblxyXG4gIHZhciBncmFwaHMgPSB0aGlzLmdyYXBoTWFuYWdlci5nZXRHcmFwaHMoKTtcclxuICB2YXIgc2l6ZSA9IGdyYXBocy5sZW5ndGg7XHJcbiAgdmFyIGk7XHJcbiAgZm9yIChpID0gMDsgaSA8IHNpemU7IGkrKylcclxuICB7XHJcbiAgICBncmFwaCA9IGdyYXBoc1tpXTtcclxuXHJcbiAgICBncmFwaC51cGRhdGVDb25uZWN0ZWQoKTtcclxuXHJcbiAgICBpZiAoIWdyYXBoLmlzQ29ubmVjdGVkKVxyXG4gICAge1xyXG4gICAgICBub2RlTGlzdCA9IG5vZGVMaXN0LmNvbmNhdChncmFwaC5nZXROb2RlcygpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLnNldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uKG5vZGVMaXN0KTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmNyZWF0ZUJlbmRwb2ludHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGVkZ2VzID0gW107XHJcbiAgZWRnZXMgPSBlZGdlcy5jb25jYXQodGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsRWRnZXMoKSk7XHJcbiAgdmFyIHZpc2l0ZWQgPSBuZXcgSGFzaFNldCgpO1xyXG4gIHZhciBpO1xyXG4gIGZvciAoaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKylcclxuICB7XHJcbiAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG5cclxuICAgIGlmICghdmlzaXRlZC5jb250YWlucyhlZGdlKSlcclxuICAgIHtcclxuICAgICAgdmFyIHNvdXJjZSA9IGVkZ2UuZ2V0U291cmNlKCk7XHJcbiAgICAgIHZhciB0YXJnZXQgPSBlZGdlLmdldFRhcmdldCgpO1xyXG5cclxuICAgICAgaWYgKHNvdXJjZSA9PSB0YXJnZXQpXHJcbiAgICAgIHtcclxuICAgICAgICBlZGdlLmdldEJlbmRwb2ludHMoKS5wdXNoKG5ldyBQb2ludEQoKSk7XHJcbiAgICAgICAgZWRnZS5nZXRCZW5kcG9pbnRzKCkucHVzaChuZXcgUG9pbnREKCkpO1xyXG4gICAgICAgIHRoaXMuY3JlYXRlRHVtbXlOb2Rlc0ZvckJlbmRwb2ludHMoZWRnZSk7XHJcbiAgICAgICAgdmlzaXRlZC5hZGQoZWRnZSk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgdmFyIGVkZ2VMaXN0ID0gW107XHJcblxyXG4gICAgICAgIGVkZ2VMaXN0ID0gZWRnZUxpc3QuY29uY2F0KHNvdXJjZS5nZXRFZGdlTGlzdFRvTm9kZSh0YXJnZXQpKTtcclxuICAgICAgICBlZGdlTGlzdCA9IGVkZ2VMaXN0LmNvbmNhdCh0YXJnZXQuZ2V0RWRnZUxpc3RUb05vZGUoc291cmNlKSk7XHJcblxyXG4gICAgICAgIGlmICghdmlzaXRlZC5jb250YWlucyhlZGdlTGlzdFswXSkpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWYgKGVkZ2VMaXN0Lmxlbmd0aCA+IDEpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBrO1xyXG4gICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgZWRnZUxpc3QubGVuZ3RoOyBrKyspXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICB2YXIgbXVsdGlFZGdlID0gZWRnZUxpc3Rba107XHJcbiAgICAgICAgICAgICAgbXVsdGlFZGdlLmdldEJlbmRwb2ludHMoKS5wdXNoKG5ldyBQb2ludEQoKSk7XHJcbiAgICAgICAgICAgICAgdGhpcy5jcmVhdGVEdW1teU5vZGVzRm9yQmVuZHBvaW50cyhtdWx0aUVkZ2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2aXNpdGVkLmFkZEFsbChsaXN0KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAodmlzaXRlZC5zaXplKCkgPT0gZWRnZXMubGVuZ3RoKVxyXG4gICAge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5wb3NpdGlvbk5vZGVzUmFkaWFsbHkgPSBmdW5jdGlvbiAoZm9yZXN0KSB7XHJcbiAgLy8gV2UgdGlsZSB0aGUgdHJlZXMgdG8gYSBncmlkIHJvdyBieSByb3c7IGZpcnN0IHRyZWUgc3RhcnRzIGF0ICgwLDApXHJcbiAgdmFyIGN1cnJlbnRTdGFydGluZ1BvaW50ID0gbmV3IFBvaW50KDAsIDApO1xyXG4gIHZhciBudW1iZXJPZkNvbHVtbnMgPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KGZvcmVzdC5sZW5ndGgpKTtcclxuICB2YXIgaGVpZ2h0ID0gMDtcclxuICB2YXIgY3VycmVudFkgPSAwO1xyXG4gIHZhciBjdXJyZW50WCA9IDA7XHJcbiAgdmFyIHBvaW50ID0gbmV3IFBvaW50RCgwLCAwKTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmb3Jlc3QubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgaWYgKGkgJSBudW1iZXJPZkNvbHVtbnMgPT0gMClcclxuICAgIHtcclxuICAgICAgLy8gU3RhcnQgb2YgYSBuZXcgcm93LCBtYWtlIHRoZSB4IGNvb3JkaW5hdGUgMCwgaW5jcmVtZW50IHRoZVxyXG4gICAgICAvLyB5IGNvb3JkaW5hdGUgd2l0aCB0aGUgbWF4IGhlaWdodCBvZiB0aGUgcHJldmlvdXMgcm93XHJcbiAgICAgIGN1cnJlbnRYID0gMDtcclxuICAgICAgY3VycmVudFkgPSBoZWlnaHQ7XHJcblxyXG4gICAgICBpZiAoaSAhPSAwKVxyXG4gICAgICB7XHJcbiAgICAgICAgY3VycmVudFkgKz0gQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPTkVOVF9TRVBFUkFUSU9OO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBoZWlnaHQgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB0cmVlID0gZm9yZXN0W2ldO1xyXG5cclxuICAgIC8vIEZpbmQgdGhlIGNlbnRlciBvZiB0aGUgdHJlZVxyXG4gICAgdmFyIGNlbnRlck5vZGUgPSBMYXlvdXQuZmluZENlbnRlck9mVHJlZSh0cmVlKTtcclxuXHJcbiAgICAvLyBTZXQgdGhlIHN0YXJpbmcgcG9pbnQgb2YgdGhlIG5leHQgdHJlZVxyXG4gICAgY3VycmVudFN0YXJ0aW5nUG9pbnQueCA9IGN1cnJlbnRYO1xyXG4gICAgY3VycmVudFN0YXJ0aW5nUG9pbnQueSA9IGN1cnJlbnRZO1xyXG5cclxuICAgIC8vIERvIGEgcmFkaWFsIGxheW91dCBzdGFydGluZyB3aXRoIHRoZSBjZW50ZXJcclxuICAgIHBvaW50ID1cclxuICAgICAgICAgICAgQ29TRUxheW91dC5yYWRpYWxMYXlvdXQodHJlZSwgY2VudGVyTm9kZSwgY3VycmVudFN0YXJ0aW5nUG9pbnQpO1xyXG5cclxuICAgIGlmIChwb2ludC55ID4gaGVpZ2h0KVxyXG4gICAge1xyXG4gICAgICBoZWlnaHQgPSBNYXRoLmZsb29yKHBvaW50LnkpO1xyXG4gICAgfVxyXG5cclxuICAgIGN1cnJlbnRYID0gTWF0aC5mbG9vcihwb2ludC54ICsgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPTkVOVF9TRVBFUkFUSU9OKTtcclxuICB9XHJcblxyXG4gIHRoaXMudHJhbnNmb3JtKFxyXG4gICAgICAgICAgbmV3IFBvaW50RChMYXlvdXRDb25zdGFudHMuV09STERfQ0VOVEVSX1ggLSBwb2ludC54IC8gMixcclxuICAgICAgICAgICAgICAgICAgTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9ZIC0gcG9pbnQueSAvIDIpKTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucmFkaWFsTGF5b3V0ID0gZnVuY3Rpb24gKHRyZWUsIGNlbnRlck5vZGUsIHN0YXJ0aW5nUG9pbnQpIHtcclxuICB2YXIgcmFkaWFsU2VwID0gTWF0aC5tYXgodGhpcy5tYXhEaWFnb25hbEluVHJlZSh0cmVlKSxcclxuICAgICAgICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9SQURJQUxfU0VQQVJBVElPTik7XHJcbiAgQ29TRUxheW91dC5icmFuY2hSYWRpYWxMYXlvdXQoY2VudGVyTm9kZSwgbnVsbCwgMCwgMzU5LCAwLCByYWRpYWxTZXApO1xyXG4gIHZhciBib3VuZHMgPSBMR3JhcGguY2FsY3VsYXRlQm91bmRzKHRyZWUpO1xyXG5cclxuICB2YXIgdHJhbnNmb3JtID0gbmV3IFRyYW5zZm9ybSgpO1xyXG4gIHRyYW5zZm9ybS5zZXREZXZpY2VPcmdYKGJvdW5kcy5nZXRNaW5YKCkpO1xyXG4gIHRyYW5zZm9ybS5zZXREZXZpY2VPcmdZKGJvdW5kcy5nZXRNaW5ZKCkpO1xyXG4gIHRyYW5zZm9ybS5zZXRXb3JsZE9yZ1goc3RhcnRpbmdQb2ludC54KTtcclxuICB0cmFuc2Zvcm0uc2V0V29ybGRPcmdZKHN0YXJ0aW5nUG9pbnQueSk7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZS5sZW5ndGg7IGkrKylcclxuICB7XHJcbiAgICB2YXIgbm9kZSA9IHRyZWVbaV07XHJcbiAgICBub2RlLnRyYW5zZm9ybSh0cmFuc2Zvcm0pO1xyXG4gIH1cclxuXHJcbiAgdmFyIGJvdHRvbVJpZ2h0ID1cclxuICAgICAgICAgIG5ldyBQb2ludEQoYm91bmRzLmdldE1heFgoKSwgYm91bmRzLmdldE1heFkoKSk7XHJcblxyXG4gIHJldHVybiB0cmFuc2Zvcm0uaW52ZXJzZVRyYW5zZm9ybVBvaW50KGJvdHRvbVJpZ2h0KTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQuYnJhbmNoUmFkaWFsTGF5b3V0ID0gZnVuY3Rpb24gKG5vZGUsIHBhcmVudE9mTm9kZSwgc3RhcnRBbmdsZSwgZW5kQW5nbGUsIGRpc3RhbmNlLCByYWRpYWxTZXBhcmF0aW9uKSB7XHJcbiAgLy8gRmlyc3QsIHBvc2l0aW9uIHRoaXMgbm9kZSBieSBmaW5kaW5nIGl0cyBhbmdsZS5cclxuICB2YXIgaGFsZkludGVydmFsID0gKChlbmRBbmdsZSAtIHN0YXJ0QW5nbGUpICsgMSkgLyAyO1xyXG5cclxuICBpZiAoaGFsZkludGVydmFsIDwgMClcclxuICB7XHJcbiAgICBoYWxmSW50ZXJ2YWwgKz0gMTgwO1xyXG4gIH1cclxuXHJcbiAgdmFyIG5vZGVBbmdsZSA9IChoYWxmSW50ZXJ2YWwgKyBzdGFydEFuZ2xlKSAlIDM2MDtcclxuICB2YXIgdGV0YSA9IChub2RlQW5nbGUgKiBJR2VvbWV0cnkuVFdPX1BJKSAvIDM2MDtcclxuXHJcbiAgLy8gTWFrZSBwb2xhciB0byBqYXZhIGNvcmRpbmF0ZSBjb252ZXJzaW9uLlxyXG4gIHZhciBjb3NfdGV0YSA9IE1hdGguY29zKHRldGEpO1xyXG4gIHZhciB4XyA9IGRpc3RhbmNlICogTWF0aC5jb3ModGV0YSk7XHJcbiAgdmFyIHlfID0gZGlzdGFuY2UgKiBNYXRoLnNpbih0ZXRhKTtcclxuXHJcbiAgbm9kZS5zZXRDZW50ZXIoeF8sIHlfKTtcclxuXHJcbiAgLy8gVHJhdmVyc2UgYWxsIG5laWdoYm9ycyBvZiB0aGlzIG5vZGUgYW5kIHJlY3Vyc2l2ZWx5IGNhbGwgdGhpc1xyXG4gIC8vIGZ1bmN0aW9uLlxyXG4gIHZhciBuZWlnaGJvckVkZ2VzID0gW107XHJcbiAgbmVpZ2hib3JFZGdlcyA9IG5laWdoYm9yRWRnZXMuY29uY2F0KG5vZGUuZ2V0RWRnZXMoKSk7XHJcbiAgdmFyIGNoaWxkQ291bnQgPSBuZWlnaGJvckVkZ2VzLmxlbmd0aDtcclxuXHJcbiAgaWYgKHBhcmVudE9mTm9kZSAhPSBudWxsKVxyXG4gIHtcclxuICAgIGNoaWxkQ291bnQtLTtcclxuICB9XHJcblxyXG4gIHZhciBicmFuY2hDb3VudCA9IDA7XHJcblxyXG4gIHZhciBpbmNFZGdlc0NvdW50ID0gbmVpZ2hib3JFZGdlcy5sZW5ndGg7XHJcbiAgdmFyIHN0YXJ0SW5kZXg7XHJcblxyXG4gIHZhciBlZGdlcyA9IG5vZGUuZ2V0RWRnZXNCZXR3ZWVuKHBhcmVudE9mTm9kZSk7XHJcblxyXG4gIC8vIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBlZGdlcywgcHJ1bmUgdGhlbSB1bnRpbCB0aGVyZSByZW1haW5zIG9ubHkgb25lXHJcbiAgLy8gZWRnZS5cclxuICB3aGlsZSAoZWRnZXMubGVuZ3RoID4gMSlcclxuICB7XHJcbiAgICAvL25laWdoYm9yRWRnZXMucmVtb3ZlKGVkZ2VzLnJlbW92ZSgwKSk7XHJcbiAgICB2YXIgdGVtcCA9IGVkZ2VzWzBdO1xyXG4gICAgZWRnZXMuc3BsaWNlKDAsIDEpO1xyXG4gICAgdmFyIGluZGV4ID0gbmVpZ2hib3JFZGdlcy5pbmRleE9mKHRlbXApO1xyXG4gICAgaWYgKGluZGV4ID49IDApIHtcclxuICAgICAgbmVpZ2hib3JFZGdlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgfVxyXG4gICAgaW5jRWRnZXNDb3VudC0tO1xyXG4gICAgY2hpbGRDb3VudC0tO1xyXG4gIH1cclxuXHJcbiAgaWYgKHBhcmVudE9mTm9kZSAhPSBudWxsKVxyXG4gIHtcclxuICAgIC8vYXNzZXJ0IGVkZ2VzLmxlbmd0aCA9PSAxO1xyXG4gICAgc3RhcnRJbmRleCA9IChuZWlnaGJvckVkZ2VzLmluZGV4T2YoZWRnZXNbMF0pICsgMSkgJSBpbmNFZGdlc0NvdW50O1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgc3RhcnRJbmRleCA9IDA7XHJcbiAgfVxyXG5cclxuICB2YXIgc3RlcEFuZ2xlID0gTWF0aC5hYnMoZW5kQW5nbGUgLSBzdGFydEFuZ2xlKSAvIGNoaWxkQ291bnQ7XHJcblxyXG4gIGZvciAodmFyIGkgPSBzdGFydEluZGV4O1xyXG4gICAgICAgICAgYnJhbmNoQ291bnQgIT0gY2hpbGRDb3VudDtcclxuICAgICAgICAgIGkgPSAoKytpKSAlIGluY0VkZ2VzQ291bnQpXHJcbiAge1xyXG4gICAgdmFyIGN1cnJlbnROZWlnaGJvciA9XHJcbiAgICAgICAgICAgIG5laWdoYm9yRWRnZXNbaV0uZ2V0T3RoZXJFbmQobm9kZSk7XHJcblxyXG4gICAgLy8gRG9uJ3QgYmFjayB0cmF2ZXJzZSB0byByb290IG5vZGUgaW4gY3VycmVudCB0cmVlLlxyXG4gICAgaWYgKGN1cnJlbnROZWlnaGJvciA9PSBwYXJlbnRPZk5vZGUpXHJcbiAgICB7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjaGlsZFN0YXJ0QW5nbGUgPVxyXG4gICAgICAgICAgICAoc3RhcnRBbmdsZSArIGJyYW5jaENvdW50ICogc3RlcEFuZ2xlKSAlIDM2MDtcclxuICAgIHZhciBjaGlsZEVuZEFuZ2xlID0gKGNoaWxkU3RhcnRBbmdsZSArIHN0ZXBBbmdsZSkgJSAzNjA7XHJcblxyXG4gICAgQ29TRUxheW91dC5icmFuY2hSYWRpYWxMYXlvdXQoY3VycmVudE5laWdoYm9yLFxyXG4gICAgICAgICAgICBub2RlLFxyXG4gICAgICAgICAgICBjaGlsZFN0YXJ0QW5nbGUsIGNoaWxkRW5kQW5nbGUsXHJcbiAgICAgICAgICAgIGRpc3RhbmNlICsgcmFkaWFsU2VwYXJhdGlvbiwgcmFkaWFsU2VwYXJhdGlvbik7XHJcblxyXG4gICAgYnJhbmNoQ291bnQrKztcclxuICB9XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0Lm1heERpYWdvbmFsSW5UcmVlID0gZnVuY3Rpb24gKHRyZWUpIHtcclxuICB2YXIgbWF4RGlhZ29uYWwgPSBJbnRlZ2VyLk1JTl9WQUxVRTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmVlLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBub2RlID0gdHJlZVtpXTtcclxuICAgIHZhciBkaWFnb25hbCA9IG5vZGUuZ2V0RGlhZ29uYWwoKTtcclxuXHJcbiAgICBpZiAoZGlhZ29uYWwgPiBtYXhEaWFnb25hbClcclxuICAgIHtcclxuICAgICAgbWF4RGlhZ29uYWwgPSBkaWFnb25hbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBtYXhEaWFnb25hbDtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25SYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBmb3JtdWxhIGlzIDIgeCAobGV2ZWwgKyAxKSB4IGlkZWFsRWRnZUxlbmd0aFxyXG4gIHJldHVybiAoMiAqICh0aGlzLmxldmVsICsgMSkgKiB0aGlzLmlkZWFsRWRnZUxlbmd0aCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvU0VMYXlvdXQ7XHJcbiIsInZhciBGRExheW91dE5vZGUgPSByZXF1aXJlKCcuL0ZETGF5b3V0Tm9kZScpO1xyXG5cclxuZnVuY3Rpb24gQ29TRU5vZGUoZ20sIGxvYywgc2l6ZSwgdk5vZGUpIHtcclxuICBGRExheW91dE5vZGUuY2FsbCh0aGlzLCBnbSwgbG9jLCBzaXplLCB2Tm9kZSk7XHJcbn1cclxuXHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZETGF5b3V0Tm9kZS5wcm90b3R5cGUpO1xyXG5mb3IgKHZhciBwcm9wIGluIEZETGF5b3V0Tm9kZSkge1xyXG4gIENvU0VOb2RlW3Byb3BdID0gRkRMYXlvdXROb2RlW3Byb3BdO1xyXG59XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgbGF5b3V0ID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0TGF5b3V0KCk7XHJcbiAgdGhpcy5kaXNwbGFjZW1lbnRYID0gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKlxyXG4gICAgICAgICAgKHRoaXMuc3ByaW5nRm9yY2VYICsgdGhpcy5yZXB1bHNpb25Gb3JjZVggKyB0aGlzLmdyYXZpdGF0aW9uRm9yY2VYKTtcclxuICB0aGlzLmRpc3BsYWNlbWVudFkgPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqXHJcbiAgICAgICAgICAodGhpcy5zcHJpbmdGb3JjZVkgKyB0aGlzLnJlcHVsc2lvbkZvcmNlWSArIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVkpO1xyXG5cclxuXHJcbiAgaWYgKE1hdGguYWJzKHRoaXMuZGlzcGxhY2VtZW50WCkgPiBsYXlvdXQuY29vbGluZ0ZhY3RvciAqIGxheW91dC5tYXhOb2RlRGlzcGxhY2VtZW50KVxyXG4gIHtcclxuICAgIHRoaXMuZGlzcGxhY2VtZW50WCA9IGxheW91dC5jb29saW5nRmFjdG9yICogbGF5b3V0Lm1heE5vZGVEaXNwbGFjZW1lbnQgKlxyXG4gICAgICAgICAgICBJTWF0aC5zaWduKHRoaXMuZGlzcGxhY2VtZW50WCk7XHJcbiAgfVxyXG5cclxuICBpZiAoTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRZKSA+IGxheW91dC5jb29saW5nRmFjdG9yICogbGF5b3V0Lm1heE5vZGVEaXNwbGFjZW1lbnQpXHJcbiAge1xyXG4gICAgdGhpcy5kaXNwbGFjZW1lbnRZID0gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKiBsYXlvdXQubWF4Tm9kZURpc3BsYWNlbWVudCAqXHJcbiAgICAgICAgICAgIElNYXRoLnNpZ24odGhpcy5kaXNwbGFjZW1lbnRZKTtcclxuICB9XHJcblxyXG4gIC8vIGEgc2ltcGxlIG5vZGUsIGp1c3QgbW92ZSBpdFxyXG4gIGlmICh0aGlzLmNoaWxkID09IG51bGwpXHJcbiAge1xyXG4gICAgdGhpcy5tb3ZlQnkodGhpcy5kaXNwbGFjZW1lbnRYLCB0aGlzLmRpc3BsYWNlbWVudFkpO1xyXG4gIH1cclxuICAvLyBhbiBlbXB0eSBjb21wb3VuZCBub2RlLCBhZ2FpbiBqdXN0IG1vdmUgaXRcclxuICBlbHNlIGlmICh0aGlzLmNoaWxkLmdldE5vZGVzKCkubGVuZ3RoID09IDApXHJcbiAge1xyXG4gICAgdGhpcy5tb3ZlQnkodGhpcy5kaXNwbGFjZW1lbnRYLCB0aGlzLmRpc3BsYWNlbWVudFkpO1xyXG4gIH1cclxuICAvLyBub24tZW1wdHkgY29tcG91bmQgbm9kZSwgcHJvcG9nYXRlIG1vdmVtZW50IHRvIGNoaWxkcmVuIGFzIHdlbGxcclxuICBlbHNlXHJcbiAge1xyXG4gICAgdGhpcy5wcm9wb2dhdGVEaXNwbGFjZW1lbnRUb0NoaWxkcmVuKHRoaXMuZGlzcGxhY2VtZW50WCxcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGFjZW1lbnRZKTtcclxuICB9XHJcblxyXG4gIGxheW91dC50b3RhbERpc3BsYWNlbWVudCArPVxyXG4gICAgICAgICAgTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRYKSArIE1hdGguYWJzKHRoaXMuZGlzcGxhY2VtZW50WSk7XHJcblxyXG4gIHRoaXMuc3ByaW5nRm9yY2VYID0gMDtcclxuICB0aGlzLnNwcmluZ0ZvcmNlWSA9IDA7XHJcbiAgdGhpcy5yZXB1bHNpb25Gb3JjZVggPSAwO1xyXG4gIHRoaXMucmVwdWxzaW9uRm9yY2VZID0gMDtcclxuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VYID0gMDtcclxuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VZID0gMDtcclxuICB0aGlzLmRpc3BsYWNlbWVudFggPSAwO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50WSA9IDA7XHJcbn07XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUucHJvcG9nYXRlRGlzcGxhY2VtZW50VG9DaGlsZHJlbiA9IGZ1bmN0aW9uIChkWCwgZFkpXHJcbntcclxuICB2YXIgbm9kZXMgPSB0aGlzLmdldENoaWxkKCkuZ2V0Tm9kZXMoKTtcclxuICB2YXIgbm9kZTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIG5vZGUgPSBub2Rlc1tpXTtcclxuICAgIGlmIChub2RlLmdldENoaWxkKCkgPT0gbnVsbClcclxuICAgIHtcclxuICAgICAgbm9kZS5tb3ZlQnkoZFgsIGRZKTtcclxuICAgICAgbm9kZS5kaXNwbGFjZW1lbnRYICs9IGRYO1xyXG4gICAgICBub2RlLmRpc3BsYWNlbWVudFkgKz0gZFk7XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIG5vZGUucHJvcG9nYXRlRGlzcGxhY2VtZW50VG9DaGlsZHJlbihkWCwgZFkpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5zZXRQcmVkMSA9IGZ1bmN0aW9uIChwcmVkMSlcclxue1xyXG4gIHRoaXMucHJlZDEgPSBwcmVkMTtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5nZXRQcmVkMSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gcHJlZDE7XHJcbn07XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUuZ2V0UHJlZDIgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHByZWQyO1xyXG59O1xyXG5cclxuQ29TRU5vZGUucHJvdG90eXBlLnNldE5leHQgPSBmdW5jdGlvbiAobmV4dClcclxue1xyXG4gIHRoaXMubmV4dCA9IG5leHQ7XHJcbn07XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUuZ2V0TmV4dCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gbmV4dDtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5zZXRQcm9jZXNzZWQgPSBmdW5jdGlvbiAocHJvY2Vzc2VkKVxyXG57XHJcbiAgdGhpcy5wcm9jZXNzZWQgPSBwcm9jZXNzZWQ7XHJcbn07XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUuaXNQcm9jZXNzZWQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHByb2Nlc3NlZDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29TRU5vZGU7XHJcbiIsImZ1bmN0aW9uIERpbWVuc2lvbkQod2lkdGgsIGhlaWdodCkge1xyXG4gIHRoaXMud2lkdGggPSAwO1xyXG4gIHRoaXMuaGVpZ2h0ID0gMDtcclxuICBpZiAod2lkdGggIT09IG51bGwgJiYgaGVpZ2h0ICE9PSBudWxsKSB7XHJcbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcclxuICAgIHRoaXMud2lkdGggPSB3aWR0aDtcclxuICB9XHJcbn1cclxuXHJcbkRpbWVuc2lvbkQucHJvdG90eXBlLmdldFdpZHRoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLndpZHRoO1xyXG59O1xyXG5cclxuRGltZW5zaW9uRC5wcm90b3R5cGUuc2V0V2lkdGggPSBmdW5jdGlvbiAod2lkdGgpXHJcbntcclxuICB0aGlzLndpZHRoID0gd2lkdGg7XHJcbn07XHJcblxyXG5EaW1lbnNpb25ELnByb3RvdHlwZS5nZXRIZWlnaHQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuaGVpZ2h0O1xyXG59O1xyXG5cclxuRGltZW5zaW9uRC5wcm90b3R5cGUuc2V0SGVpZ2h0ID0gZnVuY3Rpb24gKGhlaWdodClcclxue1xyXG4gIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEaW1lbnNpb25EO1xyXG4iLCJ2YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9MYXlvdXQnKTtcclxudmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xyXG5cclxuZnVuY3Rpb24gRkRMYXlvdXQoKSB7XHJcbiAgTGF5b3V0LmNhbGwodGhpcyk7XHJcblxyXG4gIHRoaXMudXNlU21hcnRJZGVhbEVkZ2VMZW5ndGhDYWxjdWxhdGlvbiA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVVNFX1NNQVJUX0lERUFMX0VER0VfTEVOR1RIX0NBTENVTEFUSU9OO1xyXG4gIHRoaXMuaWRlYWxFZGdlTGVuZ3RoID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcclxuICB0aGlzLnNwcmluZ0NvbnN0YW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEg7XHJcbiAgdGhpcy5yZXB1bHNpb25Db25zdGFudCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RIO1xyXG4gIHRoaXMuZ3Jhdml0eUNvbnN0YW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIO1xyXG4gIHRoaXMuY29tcG91bmRHcmF2aXR5Q29uc3RhbnQgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEg7XHJcbiAgdGhpcy5ncmF2aXR5UmFuZ2VGYWN0b3IgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfUkFOR0VfRkFDVE9SO1xyXG4gIHRoaXMuY29tcG91bmRHcmF2aXR5UmFuZ2VGYWN0b3IgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfUkFOR0VfRkFDVE9SO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50VGhyZXNob2xkUGVyTm9kZSA9ICgzLjAgKiBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIKSAvIDEwMDtcclxuICB0aGlzLmNvb2xpbmdGYWN0b3IgPSAxLjA7XHJcbiAgdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciA9IDEuMDtcclxuICB0aGlzLnRvdGFsRGlzcGxhY2VtZW50ID0gMC4wO1xyXG4gIHRoaXMub2xkVG90YWxEaXNwbGFjZW1lbnQgPSAwLjA7XHJcbiAgdGhpcy5tYXhJdGVyYXRpb25zID0gRkRMYXlvdXRDb25zdGFudHMuTUFYX0lURVJBVElPTlM7XHJcbn1cclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTGF5b3V0LnByb3RvdHlwZSk7XHJcblxyXG5mb3IgKHZhciBwcm9wIGluIExheW91dCkge1xyXG4gIEZETGF5b3V0W3Byb3BdID0gTGF5b3V0W3Byb3BdO1xyXG59XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuaW5pdFBhcmFtZXRlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgTGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycy5jYWxsKHRoaXMsIGFyZ3VtZW50cyk7XHJcblxyXG4gIGlmICh0aGlzLmxheW91dFF1YWxpdHkgPT0gTGF5b3V0Q29uc3RhbnRzLkRSQUZUX1FVQUxJVFkpXHJcbiAge1xyXG4gICAgdGhpcy5kaXNwbGFjZW1lbnRUaHJlc2hvbGRQZXJOb2RlICs9IDAuMzA7XHJcbiAgICB0aGlzLm1heEl0ZXJhdGlvbnMgKj0gMC44O1xyXG4gIH1cclxuICBlbHNlIGlmICh0aGlzLmxheW91dFF1YWxpdHkgPT0gTGF5b3V0Q29uc3RhbnRzLlBST09GX1FVQUxJVFkpXHJcbiAge1xyXG4gICAgdGhpcy5kaXNwbGFjZW1lbnRUaHJlc2hvbGRQZXJOb2RlIC09IDAuMzA7XHJcbiAgICB0aGlzLm1heEl0ZXJhdGlvbnMgKj0gMS4yO1xyXG4gIH1cclxuXHJcbiAgdGhpcy50b3RhbEl0ZXJhdGlvbnMgPSAwO1xyXG4gIHRoaXMubm90QW5pbWF0ZWRJdGVyYXRpb25zID0gMDtcclxuXHJcbi8vICAgIHRoaXMudXNlRlJHcmlkVmFyaWFudCA9IGxheW91dE9wdGlvbnNQYWNrLnNtYXJ0UmVwdWxzaW9uUmFuZ2VDYWxjO1xyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNJZGVhbEVkZ2VMZW5ndGhzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBlZGdlO1xyXG4gIHZhciBsY2FEZXB0aDtcclxuICB2YXIgc291cmNlO1xyXG4gIHZhciB0YXJnZXQ7XHJcbiAgdmFyIHNpemVPZlNvdXJjZUluTGNhO1xyXG4gIHZhciBzaXplT2ZUYXJnZXRJbkxjYTtcclxuXHJcbiAgdmFyIGFsbEVkZ2VzID0gdGhpcy5nZXRHcmFwaE1hbmFnZXIoKS5nZXRBbGxFZGdlcygpO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsRWRnZXMubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgZWRnZSA9IGFsbEVkZ2VzW2ldO1xyXG5cclxuICAgIGVkZ2UuaWRlYWxMZW5ndGggPSB0aGlzLmlkZWFsRWRnZUxlbmd0aDtcclxuXHJcbiAgICBpZiAoZWRnZS5pc0ludGVyR3JhcGgpXHJcbiAgICB7XHJcbiAgICAgIHNvdXJjZSA9IGVkZ2UuZ2V0U291cmNlKCk7XHJcbiAgICAgIHRhcmdldCA9IGVkZ2UuZ2V0VGFyZ2V0KCk7XHJcblxyXG4gICAgICBzaXplT2ZTb3VyY2VJbkxjYSA9IGVkZ2UuZ2V0U291cmNlSW5MY2EoKS5nZXRFc3RpbWF0ZWRTaXplKCk7XHJcbiAgICAgIHNpemVPZlRhcmdldEluTGNhID0gZWRnZS5nZXRUYXJnZXRJbkxjYSgpLmdldEVzdGltYXRlZFNpemUoKTtcclxuXHJcbiAgICAgIGlmICh0aGlzLnVzZVNtYXJ0SWRlYWxFZGdlTGVuZ3RoQ2FsY3VsYXRpb24pXHJcbiAgICAgIHtcclxuICAgICAgICBlZGdlLmlkZWFsTGVuZ3RoICs9IHNpemVPZlNvdXJjZUluTGNhICsgc2l6ZU9mVGFyZ2V0SW5MY2EgLVxyXG4gICAgICAgICAgICAgICAgMiAqIExheW91dENvbnN0YW50cy5TSU1QTEVfTk9ERV9TSVpFO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsY2FEZXB0aCA9IGVkZ2UuZ2V0TGNhKCkuZ2V0SW5jbHVzaW9uVHJlZURlcHRoKCk7XHJcblxyXG4gICAgICBlZGdlLmlkZWFsTGVuZ3RoICs9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggKlxyXG4gICAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLlBFUl9MRVZFTF9JREVBTF9FREdFX0xFTkdUSF9GQUNUT1IgKlxyXG4gICAgICAgICAgICAgIChzb3VyY2UuZ2V0SW5jbHVzaW9uVHJlZURlcHRoKCkgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmdldEluY2x1c2lvblRyZWVEZXB0aCgpIC0gMiAqIGxjYURlcHRoKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuaW5pdFNwcmluZ0VtYmVkZGVyID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICBpZiAodGhpcy5pbmNyZW1lbnRhbClcclxuICB7XHJcbiAgICB0aGlzLmNvb2xpbmdGYWN0b3IgPSAwLjg7XHJcbiAgICB0aGlzLmluaXRpYWxDb29saW5nRmFjdG9yID0gMC44O1xyXG4gICAgdGhpcy5tYXhOb2RlRGlzcGxhY2VtZW50ID1cclxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UX0lOQ1JFTUVOVEFMO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgdGhpcy5jb29saW5nRmFjdG9yID0gMS4wO1xyXG4gICAgdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciA9IDEuMDtcclxuICAgIHRoaXMubWF4Tm9kZURpc3BsYWNlbWVudCA9XHJcbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLk1BWF9OT0RFX0RJU1BMQUNFTUVOVDtcclxuICB9XHJcblxyXG4gIHRoaXMubWF4SXRlcmF0aW9ucyA9XHJcbiAgICAgICAgICBNYXRoLm1heCh0aGlzLmdldEFsbE5vZGVzKCkubGVuZ3RoICogNSwgdGhpcy5tYXhJdGVyYXRpb25zKTtcclxuXHJcbiAgdGhpcy50b3RhbERpc3BsYWNlbWVudFRocmVzaG9sZCA9XHJcbiAgICAgICAgICB0aGlzLmRpc3BsYWNlbWVudFRocmVzaG9sZFBlck5vZGUgKiB0aGlzLmdldEFsbE5vZGVzKCkubGVuZ3RoO1xyXG5cclxuICB0aGlzLnJlcHVsc2lvblJhbmdlID0gdGhpcy5jYWxjUmVwdWxzaW9uUmFuZ2UoKTtcclxufTtcclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjU3ByaW5nRm9yY2VzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBsRWRnZXMgPSB0aGlzLmdldEFsbEVkZ2VzKCk7XHJcbiAgdmFyIGVkZ2U7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbEVkZ2VzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIGVkZ2UgPSBsRWRnZXNbaV07XHJcblxyXG4gICAgdGhpcy5jYWxjU3ByaW5nRm9yY2UoZWRnZSwgZWRnZS5pZGVhbExlbmd0aCk7XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25Gb3JjZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGksIGo7XHJcbiAgdmFyIG5vZGVBLCBub2RlQjtcclxuICB2YXIgbE5vZGVzID0gdGhpcy5nZXRBbGxOb2RlcygpO1xyXG5cclxuICBmb3IgKGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIG5vZGVBID0gbE5vZGVzW2ldO1xyXG5cclxuICAgIGZvciAoaiA9IGkgKyAxOyBqIDwgbE5vZGVzLmxlbmd0aDsgaisrKVxyXG4gICAge1xyXG4gICAgICBub2RlQiA9IGxOb2Rlc1tqXTtcclxuXHJcbiAgICAgIC8vIElmIGJvdGggbm9kZXMgYXJlIG5vdCBtZW1iZXJzIG9mIHRoZSBzYW1lIGdyYXBoLCBza2lwLlxyXG4gICAgICBpZiAobm9kZUEuZ2V0T3duZXIoKSAhPSBub2RlQi5nZXRPd25lcigpKVxyXG4gICAgICB7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuY2FsY1JlcHVsc2lvbkZvcmNlKG5vZGVBLCBub2RlQik7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2VzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBub2RlO1xyXG4gIHZhciBsTm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uKCk7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIG5vZGUgPSBsTm9kZXNbaV07XHJcbiAgICB0aGlzLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2Uobm9kZSk7XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLm1vdmVOb2RlcyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbE5vZGVzID0gdGhpcy5nZXRBbGxOb2RlcygpO1xyXG4gIHZhciBub2RlO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxOb2Rlcy5sZW5ndGg7IGkrKylcclxuICB7XHJcbiAgICBub2RlID0gbE5vZGVzW2ldO1xyXG4gICAgbm9kZS5tb3ZlKCk7XHJcbiAgfVxyXG59XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1NwcmluZ0ZvcmNlID0gZnVuY3Rpb24gKGVkZ2UsIGlkZWFsTGVuZ3RoKSB7XHJcbiAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLmdldFNvdXJjZSgpO1xyXG4gIHZhciB0YXJnZXROb2RlID0gZWRnZS5nZXRUYXJnZXQoKTtcclxuXHJcbiAgdmFyIGxlbmd0aDtcclxuICB2YXIgc3ByaW5nRm9yY2U7XHJcbiAgdmFyIHNwcmluZ0ZvcmNlWDtcclxuICB2YXIgc3ByaW5nRm9yY2VZO1xyXG5cclxuICAvLyBVcGRhdGUgZWRnZSBsZW5ndGhcclxuICBpZiAodGhpcy51bmlmb3JtTGVhZk5vZGVTaXplcyAmJlxyXG4gICAgICAgICAgc291cmNlTm9kZS5nZXRDaGlsZCgpID09IG51bGwgJiYgdGFyZ2V0Tm9kZS5nZXRDaGlsZCgpID09IG51bGwpXHJcbiAge1xyXG4gICAgZWRnZS51cGRhdGVMZW5ndGhTaW1wbGUoKTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIGVkZ2UudXBkYXRlTGVuZ3RoKCk7XHJcblxyXG4gICAgaWYgKGVkZ2UuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0KVxyXG4gICAge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBsZW5ndGggPSBlZGdlLmdldExlbmd0aCgpO1xyXG5cclxuICAvLyBDYWxjdWxhdGUgc3ByaW5nIGZvcmNlc1xyXG4gIHNwcmluZ0ZvcmNlID0gdGhpcy5zcHJpbmdDb25zdGFudCAqIChsZW5ndGggLSBpZGVhbExlbmd0aCk7XHJcblxyXG4gIC8vIFByb2plY3QgZm9yY2Ugb250byB4IGFuZCB5IGF4ZXNcclxuICBzcHJpbmdGb3JjZVggPSBzcHJpbmdGb3JjZSAqIChlZGdlLmxlbmd0aFggLyBsZW5ndGgpO1xyXG4gIHNwcmluZ0ZvcmNlWSA9IHNwcmluZ0ZvcmNlICogKGVkZ2UubGVuZ3RoWSAvIGxlbmd0aCk7XHJcblxyXG4gIC8vIEFwcGx5IGZvcmNlcyBvbiB0aGUgZW5kIG5vZGVzXHJcbiAgc291cmNlTm9kZS5zcHJpbmdGb3JjZVggKz0gc3ByaW5nRm9yY2VYO1xyXG4gIHNvdXJjZU5vZGUuc3ByaW5nRm9yY2VZICs9IHNwcmluZ0ZvcmNlWTtcclxuICB0YXJnZXROb2RlLnNwcmluZ0ZvcmNlWCAtPSBzcHJpbmdGb3JjZVg7XHJcbiAgdGFyZ2V0Tm9kZS5zcHJpbmdGb3JjZVkgLT0gc3ByaW5nRm9yY2VZO1xyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25Gb3JjZSA9IGZ1bmN0aW9uIChub2RlQSwgbm9kZUIpIHtcclxuICB2YXIgcmVjdEEgPSBub2RlQS5nZXRSZWN0KCk7XHJcbiAgdmFyIHJlY3RCID0gbm9kZUIuZ2V0UmVjdCgpO1xyXG4gIHZhciBvdmVybGFwQW1vdW50ID0gbmV3IEFycmF5KDIpO1xyXG4gIHZhciBjbGlwUG9pbnRzID0gbmV3IEFycmF5KDQpO1xyXG4gIHZhciBkaXN0YW5jZVg7XHJcbiAgdmFyIGRpc3RhbmNlWTtcclxuICB2YXIgZGlzdGFuY2VTcXVhcmVkO1xyXG4gIHZhciBkaXN0YW5jZTtcclxuICB2YXIgcmVwdWxzaW9uRm9yY2U7XHJcbiAgdmFyIHJlcHVsc2lvbkZvcmNlWDtcclxuICB2YXIgcmVwdWxzaW9uRm9yY2VZO1xyXG5cclxuICBpZiAocmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpLy8gdHdvIG5vZGVzIG92ZXJsYXBcclxuICB7XHJcbiAgICAvLyBjYWxjdWxhdGUgc2VwYXJhdGlvbiBhbW91bnQgaW4geCBhbmQgeSBkaXJlY3Rpb25zXHJcbiAgICBJR2VvbWV0cnkuY2FsY1NlcGFyYXRpb25BbW91bnQocmVjdEEsXHJcbiAgICAgICAgICAgIHJlY3RCLFxyXG4gICAgICAgICAgICBvdmVybGFwQW1vdW50LFxyXG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIIC8gMi4wKTtcclxuXHJcbiAgICByZXB1bHNpb25Gb3JjZVggPSBvdmVybGFwQW1vdW50WzBdO1xyXG4gICAgcmVwdWxzaW9uRm9yY2VZID0gb3ZlcmxhcEFtb3VudFsxXTtcclxuICB9XHJcbiAgZWxzZS8vIG5vIG92ZXJsYXBcclxuICB7XHJcbiAgICAvLyBjYWxjdWxhdGUgZGlzdGFuY2VcclxuXHJcbiAgICBpZiAodGhpcy51bmlmb3JtTGVhZk5vZGVTaXplcyAmJlxyXG4gICAgICAgICAgICBub2RlQS5nZXRDaGlsZCgpID09IG51bGwgJiYgbm9kZUIuZ2V0Q2hpbGQoKSA9PSBudWxsKS8vIHNpbXBseSBiYXNlIHJlcHVsc2lvbiBvbiBkaXN0YW5jZSBvZiBub2RlIGNlbnRlcnNcclxuICAgIHtcclxuICAgICAgZGlzdGFuY2VYID0gcmVjdEIuZ2V0Q2VudGVyWCgpIC0gcmVjdEEuZ2V0Q2VudGVyWCgpO1xyXG4gICAgICBkaXN0YW5jZVkgPSByZWN0Qi5nZXRDZW50ZXJZKCkgLSByZWN0QS5nZXRDZW50ZXJZKCk7XHJcbiAgICB9XHJcbiAgICBlbHNlLy8gdXNlIGNsaXBwaW5nIHBvaW50c1xyXG4gICAge1xyXG4gICAgICBJR2VvbWV0cnkuZ2V0SW50ZXJzZWN0aW9uKHJlY3RBLCByZWN0QiwgY2xpcFBvaW50cyk7XHJcblxyXG4gICAgICBkaXN0YW5jZVggPSBjbGlwUG9pbnRzWzJdIC0gY2xpcFBvaW50c1swXTtcclxuICAgICAgZGlzdGFuY2VZID0gY2xpcFBvaW50c1szXSAtIGNsaXBQb2ludHNbMV07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTm8gcmVwdWxzaW9uIHJhbmdlLiBGUiBncmlkIHZhcmlhbnQgc2hvdWxkIHRha2UgY2FyZSBvZiB0aGlzLlxyXG4gICAgaWYgKE1hdGguYWJzKGRpc3RhbmNlWCkgPCBGRExheW91dENvbnN0YW50cy5NSU5fUkVQVUxTSU9OX0RJU1QpXHJcbiAgICB7XHJcbiAgICAgIGRpc3RhbmNlWCA9IElNYXRoLnNpZ24oZGlzdGFuY2VYKSAqXHJcbiAgICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChNYXRoLmFicyhkaXN0YW5jZVkpIDwgRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUKVxyXG4gICAge1xyXG4gICAgICBkaXN0YW5jZVkgPSBJTWF0aC5zaWduKGRpc3RhbmNlWSkgKlxyXG4gICAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLk1JTl9SRVBVTFNJT05fRElTVDtcclxuICAgIH1cclxuXHJcbiAgICBkaXN0YW5jZVNxdWFyZWQgPSBkaXN0YW5jZVggKiBkaXN0YW5jZVggKyBkaXN0YW5jZVkgKiBkaXN0YW5jZVk7XHJcbiAgICBkaXN0YW5jZSA9IE1hdGguc3FydChkaXN0YW5jZVNxdWFyZWQpO1xyXG5cclxuICAgIHJlcHVsc2lvbkZvcmNlID0gdGhpcy5yZXB1bHNpb25Db25zdGFudCAvIGRpc3RhbmNlU3F1YXJlZDtcclxuXHJcbiAgICAvLyBQcm9qZWN0IGZvcmNlIG9udG8geCBhbmQgeSBheGVzXHJcbiAgICByZXB1bHNpb25Gb3JjZVggPSByZXB1bHNpb25Gb3JjZSAqIGRpc3RhbmNlWCAvIGRpc3RhbmNlO1xyXG4gICAgcmVwdWxzaW9uRm9yY2VZID0gcmVwdWxzaW9uRm9yY2UgKiBkaXN0YW5jZVkgLyBkaXN0YW5jZTtcclxuICB9XHJcblxyXG4gIC8vIEFwcGx5IGZvcmNlcyBvbiB0aGUgdHdvIG5vZGVzXHJcbiAgbm9kZUEucmVwdWxzaW9uRm9yY2VYIC09IHJlcHVsc2lvbkZvcmNlWDtcclxuICBub2RlQS5yZXB1bHNpb25Gb3JjZVkgLT0gcmVwdWxzaW9uRm9yY2VZO1xyXG4gIG5vZGVCLnJlcHVsc2lvbkZvcmNlWCArPSByZXB1bHNpb25Gb3JjZVg7XHJcbiAgbm9kZUIucmVwdWxzaW9uRm9yY2VZICs9IHJlcHVsc2lvbkZvcmNlWTtcclxufTtcclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjR3Jhdml0YXRpb25hbEZvcmNlID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICB2YXIgb3duZXJHcmFwaDtcclxuICB2YXIgb3duZXJDZW50ZXJYO1xyXG4gIHZhciBvd25lckNlbnRlclk7XHJcbiAgdmFyIGRpc3RhbmNlWDtcclxuICB2YXIgZGlzdGFuY2VZO1xyXG4gIHZhciBhYnNEaXN0YW5jZVg7XHJcbiAgdmFyIGFic0Rpc3RhbmNlWTtcclxuICB2YXIgZXN0aW1hdGVkU2l6ZTtcclxuICBvd25lckdyYXBoID0gbm9kZS5nZXRPd25lcigpO1xyXG5cclxuICBvd25lckNlbnRlclggPSAob3duZXJHcmFwaC5nZXRSaWdodCgpICsgb3duZXJHcmFwaC5nZXRMZWZ0KCkpIC8gMjtcclxuICBvd25lckNlbnRlclkgPSAob3duZXJHcmFwaC5nZXRUb3AoKSArIG93bmVyR3JhcGguZ2V0Qm90dG9tKCkpIC8gMjtcclxuICBkaXN0YW5jZVggPSBub2RlLmdldENlbnRlclgoKSAtIG93bmVyQ2VudGVyWDtcclxuICBkaXN0YW5jZVkgPSBub2RlLmdldENlbnRlclkoKSAtIG93bmVyQ2VudGVyWTtcclxuICBhYnNEaXN0YW5jZVggPSBNYXRoLmFicyhkaXN0YW5jZVgpO1xyXG4gIGFic0Rpc3RhbmNlWSA9IE1hdGguYWJzKGRpc3RhbmNlWSk7XHJcblxyXG4gIGlmIChub2RlLmdldE93bmVyKCkgPT0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpKS8vIGluIHRoZSByb290IGdyYXBoXHJcbiAge1xyXG4gICAgTWF0aC5mbG9vcig4MCk7XHJcbiAgICBlc3RpbWF0ZWRTaXplID0gTWF0aC5mbG9vcihvd25lckdyYXBoLmdldEVzdGltYXRlZFNpemUoKSAqXHJcbiAgICAgICAgICAgIHRoaXMuZ3Jhdml0eVJhbmdlRmFjdG9yKTtcclxuXHJcbiAgICBpZiAoYWJzRGlzdGFuY2VYID4gZXN0aW1hdGVkU2l6ZSB8fCBhYnNEaXN0YW5jZVkgPiBlc3RpbWF0ZWRTaXplKVxyXG4gICAge1xyXG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VYID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VYO1xyXG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VZID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VZO1xyXG4gICAgfVxyXG4gIH1cclxuICBlbHNlLy8gaW5zaWRlIGEgY29tcG91bmRcclxuICB7XHJcbiAgICBlc3RpbWF0ZWRTaXplID0gTWF0aC5mbG9vcigob3duZXJHcmFwaC5nZXRFc3RpbWF0ZWRTaXplKCkgKlxyXG4gICAgICAgICAgICB0aGlzLmNvbXBvdW5kR3Jhdml0eVJhbmdlRmFjdG9yKSk7XHJcblxyXG4gICAgaWYgKGFic0Rpc3RhbmNlWCA+IGVzdGltYXRlZFNpemUgfHwgYWJzRGlzdGFuY2VZID4gZXN0aW1hdGVkU2l6ZSlcclxuICAgIHtcclxuICAgICAgbm9kZS5ncmF2aXRhdGlvbkZvcmNlWCA9IC10aGlzLmdyYXZpdHlDb25zdGFudCAqIGRpc3RhbmNlWCAqXHJcbiAgICAgICAgICAgICAgdGhpcy5jb21wb3VuZEdyYXZpdHlDb25zdGFudDtcclxuICAgICAgbm9kZS5ncmF2aXRhdGlvbkZvcmNlWSA9IC10aGlzLmdyYXZpdHlDb25zdGFudCAqIGRpc3RhbmNlWSAqXHJcbiAgICAgICAgICAgICAgdGhpcy5jb21wb3VuZEdyYXZpdHlDb25zdGFudDtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuaXNDb252ZXJnZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGNvbnZlcmdlZDtcclxuICB2YXIgb3NjaWxhdGluZyA9IGZhbHNlO1xyXG5cclxuICBpZiAodGhpcy50b3RhbEl0ZXJhdGlvbnMgPiB0aGlzLm1heEl0ZXJhdGlvbnMgLyAzKVxyXG4gIHtcclxuICAgIG9zY2lsYXRpbmcgPVxyXG4gICAgICAgICAgICBNYXRoLmFicyh0aGlzLnRvdGFsRGlzcGxhY2VtZW50IC0gdGhpcy5vbGRUb3RhbERpc3BsYWNlbWVudCkgPCAyO1xyXG4gIH1cclxuXHJcbiAgY29udmVyZ2VkID0gdGhpcy50b3RhbERpc3BsYWNlbWVudCA8IHRoaXMudG90YWxEaXNwbGFjZW1lbnRUaHJlc2hvbGQ7XHJcblxyXG4gIHRoaXMub2xkVG90YWxEaXNwbGFjZW1lbnQgPSB0aGlzLnRvdGFsRGlzcGxhY2VtZW50O1xyXG5cclxuICByZXR1cm4gY29udmVyZ2VkIHx8IG9zY2lsYXRpbmc7XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuYW5pbWF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAodGhpcy5hbmltYXRpb25EdXJpbmdMYXlvdXQgJiYgIXRoaXMuaXNTdWJMYXlvdXQpXHJcbiAge1xyXG4gICAgaWYgKHRoaXMubm90QW5pbWF0ZWRJdGVyYXRpb25zID09IHRoaXMuYW5pbWF0aW9uUGVyaW9kKVxyXG4gICAge1xyXG4gICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICB0aGlzLm5vdEFuaW1hdGVkSXRlcmF0aW9ucyA9IDA7XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIHRoaXMubm90QW5pbWF0ZWRJdGVyYXRpb25zKys7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25SYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gMC4wO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dDtcclxuIiwidmFyIGxheW91dE9wdGlvbnNQYWNrID0gcmVxdWlyZSgnLi9sYXlvdXRPcHRpb25zUGFjaycpO1xyXG5cclxuZnVuY3Rpb24gRkRMYXlvdXRDb25zdGFudHMoKSB7XHJcbn1cclxuXHJcbkZETGF5b3V0Q29uc3RhbnRzLmdldFVzZXJPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuICBpZiAob3B0aW9ucy5ub2RlUmVwdWxzaW9uICE9IG51bGwpXHJcbiAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX1JFUFVMU0lPTl9TVFJFTkdUSCA9IG9wdGlvbnMubm9kZVJlcHVsc2lvbjtcclxuICBpZiAob3B0aW9ucy5pZGVhbEVkZ2VMZW5ndGggIT0gbnVsbCkge1xyXG4gICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA9IG9wdGlvbnMuaWRlYWxFZGdlTGVuZ3RoO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5lZGdlRWxhc3RpY2l0eSAhPSBudWxsKVxyXG4gICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEggPSBvcHRpb25zLmVkZ2VFbGFzdGljaXR5O1xyXG4gIGlmIChvcHRpb25zLm5lc3RpbmdGYWN0b3IgIT0gbnVsbClcclxuICAgIEZETGF5b3V0Q29uc3RhbnRzLlBFUl9MRVZFTF9JREVBTF9FREdFX0xFTkdUSF9GQUNUT1IgPSBvcHRpb25zLm5lc3RpbmdGYWN0b3I7XHJcbiAgaWYgKG9wdGlvbnMuZ3Jhdml0eSAhPSBudWxsKVxyXG4gICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIID0gb3B0aW9ucy5ncmF2aXR5O1xyXG4gIGlmIChvcHRpb25zLm51bUl0ZXIgIT0gbnVsbClcclxuICAgIEZETGF5b3V0Q29uc3RhbnRzLk1BWF9JVEVSQVRJT05TID0gb3B0aW9ucy5udW1JdGVyO1xyXG4gIFxyXG4gIGxheW91dE9wdGlvbnNQYWNrLmluY3JlbWVudGFsID0gIShvcHRpb25zLnJhbmRvbWl6ZSk7XHJcbiAgbGF5b3V0T3B0aW9uc1BhY2suYW5pbWF0ZSA9IG9wdGlvbnMuYW5pbWF0ZTtcclxufVxyXG5cclxuRkRMYXlvdXRDb25zdGFudHMuTUFYX0lURVJBVElPTlMgPSAyNTAwO1xyXG5cclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA9IDUwO1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX1NQUklOR19TVFJFTkdUSCA9IDAuNDU7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RIID0gNDUwMC4wO1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEggPSAwLjQ7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9TVFJFTkdUSCA9IDEuMDtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IDMuODtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IDEuNTtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfSURFQUxfRURHRV9MRU5HVEhfQ0FMQ1VMQVRJT04gPSB0cnVlO1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX1VTRV9TTUFSVF9SRVBVTFNJT05fUkFOR0VfQ0FMQ1VMQVRJT04gPSB0cnVlO1xyXG5GRExheW91dENvbnN0YW50cy5NQVhfTk9ERV9ESVNQTEFDRU1FTlRfSU5DUkVNRU5UQUwgPSAxMDAuMDtcclxuRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UID0gRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UX0lOQ1JFTUVOVEFMICogMztcclxuRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCAvIDEwLjA7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkNPTlZFUkdFTkNFX0NIRUNLX1BFUklPRCA9IDEwMDtcclxuRkRMYXlvdXRDb25zdGFudHMuUEVSX0xFVkVMX0lERUFMX0VER0VfTEVOR1RIX0ZBQ1RPUiA9IDAuMTtcclxuRkRMYXlvdXRDb25zdGFudHMuTUlOX0VER0VfTEVOR1RIID0gMTtcclxuRkRMYXlvdXRDb25zdGFudHMuR1JJRF9DQUxDVUxBVElPTl9DSEVDS19QRVJJT0QgPSAxMDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRkRMYXlvdXRDb25zdGFudHM7XHJcbiIsInZhciBMRWRnZSA9IHJlcXVpcmUoJy4vTEVkZ2UnKTtcclxudmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xyXG5cclxuZnVuY3Rpb24gRkRMYXlvdXRFZGdlKHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSkge1xyXG4gIExFZGdlLmNhbGwodGhpcywgc291cmNlLCB0YXJnZXQsIHZFZGdlKTtcclxuICB0aGlzLmlkZWFsTGVuZ3RoID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcclxufVxyXG5cclxuRkRMYXlvdXRFZGdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEVkZ2UucHJvdG90eXBlKTtcclxuXHJcbmZvciAodmFyIHByb3AgaW4gTEVkZ2UpIHtcclxuICBGRExheW91dEVkZ2VbcHJvcF0gPSBMRWRnZVtwcm9wXTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dEVkZ2U7XHJcbiIsInZhciBMTm9kZSA9IHJlcXVpcmUoJy4vTE5vZGUnKTtcclxuXHJcbmZ1bmN0aW9uIEZETGF5b3V0Tm9kZShnbSwgbG9jLCBzaXplLCB2Tm9kZSkge1xyXG4gIC8vIGFsdGVybmF0aXZlIGNvbnN0cnVjdG9yIGlzIGhhbmRsZWQgaW5zaWRlIExOb2RlXHJcbiAgTE5vZGUuY2FsbCh0aGlzLCBnbSwgbG9jLCBzaXplLCB2Tm9kZSk7XHJcbiAgLy9TcHJpbmcsIHJlcHVsc2lvbiBhbmQgZ3Jhdml0YXRpb25hbCBmb3JjZXMgYWN0aW5nIG9uIHRoaXMgbm9kZVxyXG4gIHRoaXMuc3ByaW5nRm9yY2VYID0gMDtcclxuICB0aGlzLnNwcmluZ0ZvcmNlWSA9IDA7XHJcbiAgdGhpcy5yZXB1bHNpb25Gb3JjZVggPSAwO1xyXG4gIHRoaXMucmVwdWxzaW9uRm9yY2VZID0gMDtcclxuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VYID0gMDtcclxuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VZID0gMDtcclxuICAvL0Ftb3VudCBieSB3aGljaCB0aGlzIG5vZGUgaXMgdG8gYmUgbW92ZWQgaW4gdGhpcyBpdGVyYXRpb25cclxuICB0aGlzLmRpc3BsYWNlbWVudFggPSAwO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50WSA9IDA7XHJcblxyXG4gIC8vU3RhcnQgYW5kIGZpbmlzaCBncmlkIGNvb3JkaW5hdGVzIHRoYXQgdGhpcyBub2RlIGlzIGZhbGxlbiBpbnRvXHJcbiAgdGhpcy5zdGFydFggPSAwO1xyXG4gIHRoaXMuZmluaXNoWCA9IDA7XHJcbiAgdGhpcy5zdGFydFkgPSAwO1xyXG4gIHRoaXMuZmluaXNoWSA9IDA7XHJcblxyXG4gIC8vR2VvbWV0cmljIG5laWdoYm9ycyBvZiB0aGlzIG5vZGVcclxuICB0aGlzLnN1cnJvdW5kaW5nID0gW107XHJcbn1cclxuXHJcbkZETGF5b3V0Tm9kZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExOb2RlLnByb3RvdHlwZSk7XHJcblxyXG5mb3IgKHZhciBwcm9wIGluIExOb2RlKSB7XHJcbiAgRkRMYXlvdXROb2RlW3Byb3BdID0gTE5vZGVbcHJvcF07XHJcbn1cclxuXHJcbkZETGF5b3V0Tm9kZS5wcm90b3R5cGUuc2V0R3JpZENvb3JkaW5hdGVzID0gZnVuY3Rpb24gKF9zdGFydFgsIF9maW5pc2hYLCBfc3RhcnRZLCBfZmluaXNoWSlcclxue1xyXG4gIHRoaXMuc3RhcnRYID0gX3N0YXJ0WDtcclxuICB0aGlzLmZpbmlzaFggPSBfZmluaXNoWDtcclxuICB0aGlzLnN0YXJ0WSA9IF9zdGFydFk7XHJcbiAgdGhpcy5maW5pc2hZID0gX2ZpbmlzaFk7XHJcblxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dE5vZGU7XHJcbiIsInZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcclxuXHJcbmZ1bmN0aW9uIEhhc2hNYXAoKSB7XHJcbiAgdGhpcy5tYXAgPSB7fTtcclxuICB0aGlzLmtleXMgPSBbXTtcclxufVxyXG5cclxuSGFzaE1hcC5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuICB2YXIgdGhlSWQgPSBVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChrZXkpO1xyXG4gIGlmICghdGhpcy5jb250YWlucyh0aGVJZCkpIHtcclxuICAgIHRoaXMubWFwW3RoZUlkXSA9IHZhbHVlO1xyXG4gICAgdGhpcy5rZXlzLnB1c2goa2V5KTtcclxuICB9XHJcbn07XHJcblxyXG5IYXNoTWFwLnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChrZXkpIHtcclxuICB2YXIgdGhlSWQgPSBVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChrZXkpO1xyXG4gIHJldHVybiB0aGlzLm1hcFtrZXldICE9IG51bGw7XHJcbn07XHJcblxyXG5IYXNoTWFwLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQoa2V5KTtcclxuICByZXR1cm4gdGhpcy5tYXBbdGhlSWRdO1xyXG59O1xyXG5cclxuSGFzaE1hcC5wcm90b3R5cGUua2V5U2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLmtleXM7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhhc2hNYXA7XHJcbiIsInZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcclxuXHJcbmZ1bmN0aW9uIEhhc2hTZXQoKSB7XHJcbiAgdGhpcy5zZXQgPSB7fTtcclxufVxyXG47XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQob2JqKTtcclxuICBpZiAoIXRoaXMuY29udGFpbnModGhlSWQpKVxyXG4gICAgdGhpcy5zZXRbdGhlSWRdID0gb2JqO1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIGRlbGV0ZSB0aGlzLnNldFtVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChvYmopXTtcclxufTtcclxuXHJcbkhhc2hTZXQucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xyXG4gIHRoaXMuc2V0ID0ge307XHJcbn07XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChvYmopIHtcclxuICByZXR1cm4gdGhpcy5zZXRbVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQob2JqKV0gPT0gb2JqO1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUuaXNFbXB0eSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5zaXplKCkgPT09IDA7XHJcbn07XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnNldCkubGVuZ3RoO1xyXG59O1xyXG5cclxuLy9jb25jYXRzIHRoaXMuc2V0IHRvIHRoZSBnaXZlbiBsaXN0XHJcbkhhc2hTZXQucHJvdG90eXBlLmFkZEFsbFRvID0gZnVuY3Rpb24gKGxpc3QpIHtcclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc2V0KTtcclxuICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgbGlzdC5wdXNoKHRoaXMuc2V0W2tleXNbaV1dKTtcclxuICB9XHJcbn07XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnNldCkubGVuZ3RoO1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUuYWRkQWxsID0gZnVuY3Rpb24gKGxpc3QpIHtcclxuICB2YXIgcyA9IGxpc3QubGVuZ3RoO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKSB7XHJcbiAgICB2YXIgdiA9IGxpc3RbaV07XHJcbiAgICB0aGlzLmFkZCh2KTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhhc2hTZXQ7XHJcbiIsImZ1bmN0aW9uIElHZW9tZXRyeSgpIHtcclxufVxyXG5cclxuSUdlb21ldHJ5LmNhbGNTZXBhcmF0aW9uQW1vdW50ID0gZnVuY3Rpb24gKHJlY3RBLCByZWN0Qiwgb3ZlcmxhcEFtb3VudCwgc2VwYXJhdGlvbkJ1ZmZlcilcclxue1xyXG4gIGlmICghcmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpIHtcclxuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gIH1cclxuICB2YXIgZGlyZWN0aW9ucyA9IG5ldyBBcnJheSgyKTtcclxuICBJR2VvbWV0cnkuZGVjaWRlRGlyZWN0aW9uc0Zvck92ZXJsYXBwaW5nTm9kZXMocmVjdEEsIHJlY3RCLCBkaXJlY3Rpb25zKTtcclxuICBvdmVybGFwQW1vdW50WzBdID0gTWF0aC5taW4ocmVjdEEuZ2V0UmlnaHQoKSwgcmVjdEIuZ2V0UmlnaHQoKSkgLVxyXG4gICAgICAgICAgTWF0aC5tYXgocmVjdEEueCwgcmVjdEIueCk7XHJcbiAgb3ZlcmxhcEFtb3VudFsxXSA9IE1hdGgubWluKHJlY3RBLmdldEJvdHRvbSgpLCByZWN0Qi5nZXRCb3R0b20oKSkgLVxyXG4gICAgICAgICAgTWF0aC5tYXgocmVjdEEueSwgcmVjdEIueSk7XHJcbiAgLy8gdXBkYXRlIHRoZSBvdmVybGFwcGluZyBhbW91bnRzIGZvciB0aGUgZm9sbG93aW5nIGNhc2VzOlxyXG4gIGlmICgocmVjdEEuZ2V0WCgpIDw9IHJlY3RCLmdldFgoKSkgJiYgKHJlY3RBLmdldFJpZ2h0KCkgPj0gcmVjdEIuZ2V0UmlnaHQoKSkpXHJcbiAge1xyXG4gICAgb3ZlcmxhcEFtb3VudFswXSArPSBNYXRoLm1pbigocmVjdEIuZ2V0WCgpIC0gcmVjdEEuZ2V0WCgpKSxcclxuICAgICAgICAgICAgKHJlY3RBLmdldFJpZ2h0KCkgLSByZWN0Qi5nZXRSaWdodCgpKSk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKChyZWN0Qi5nZXRYKCkgPD0gcmVjdEEuZ2V0WCgpKSAmJiAocmVjdEIuZ2V0UmlnaHQoKSA+PSByZWN0QS5nZXRSaWdodCgpKSlcclxuICB7XHJcbiAgICBvdmVybGFwQW1vdW50WzBdICs9IE1hdGgubWluKChyZWN0QS5nZXRYKCkgLSByZWN0Qi5nZXRYKCkpLFxyXG4gICAgICAgICAgICAocmVjdEIuZ2V0UmlnaHQoKSAtIHJlY3RBLmdldFJpZ2h0KCkpKTtcclxuICB9XHJcbiAgaWYgKChyZWN0QS5nZXRZKCkgPD0gcmVjdEIuZ2V0WSgpKSAmJiAocmVjdEEuZ2V0Qm90dG9tKCkgPj0gcmVjdEIuZ2V0Qm90dG9tKCkpKVxyXG4gIHtcclxuICAgIG92ZXJsYXBBbW91bnRbMV0gKz0gTWF0aC5taW4oKHJlY3RCLmdldFkoKSAtIHJlY3RBLmdldFkoKSksXHJcbiAgICAgICAgICAgIChyZWN0QS5nZXRCb3R0b20oKSAtIHJlY3RCLmdldEJvdHRvbSgpKSk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKChyZWN0Qi5nZXRZKCkgPD0gcmVjdEEuZ2V0WSgpKSAmJiAocmVjdEIuZ2V0Qm90dG9tKCkgPj0gcmVjdEEuZ2V0Qm90dG9tKCkpKVxyXG4gIHtcclxuICAgIG92ZXJsYXBBbW91bnRbMV0gKz0gTWF0aC5taW4oKHJlY3RBLmdldFkoKSAtIHJlY3RCLmdldFkoKSksXHJcbiAgICAgICAgICAgIChyZWN0Qi5nZXRCb3R0b20oKSAtIHJlY3RBLmdldEJvdHRvbSgpKSk7XHJcbiAgfVxyXG5cclxuICAvLyBmaW5kIHNsb3BlIG9mIHRoZSBsaW5lIHBhc3NlcyB0d28gY2VudGVyc1xyXG4gIHZhciBzbG9wZSA9IE1hdGguYWJzKChyZWN0Qi5nZXRDZW50ZXJZKCkgLSByZWN0QS5nZXRDZW50ZXJZKCkpIC9cclxuICAgICAgICAgIChyZWN0Qi5nZXRDZW50ZXJYKCkgLSByZWN0QS5nZXRDZW50ZXJYKCkpKTtcclxuICAvLyBpZiBjZW50ZXJzIGFyZSBvdmVybGFwcGVkXHJcbiAgaWYgKChyZWN0Qi5nZXRDZW50ZXJZKCkgPT0gcmVjdEEuZ2V0Q2VudGVyWSgpKSAmJlxyXG4gICAgICAgICAgKHJlY3RCLmdldENlbnRlclgoKSA9PSByZWN0QS5nZXRDZW50ZXJYKCkpKVxyXG4gIHtcclxuICAgIC8vIGFzc3VtZSB0aGUgc2xvcGUgaXMgMSAoNDUgZGVncmVlKVxyXG4gICAgc2xvcGUgPSAxLjA7XHJcbiAgfVxyXG5cclxuICB2YXIgbW92ZUJ5WSA9IHNsb3BlICogb3ZlcmxhcEFtb3VudFswXTtcclxuICB2YXIgbW92ZUJ5WCA9IG92ZXJsYXBBbW91bnRbMV0gLyBzbG9wZTtcclxuICBpZiAob3ZlcmxhcEFtb3VudFswXSA8IG1vdmVCeVgpXHJcbiAge1xyXG4gICAgbW92ZUJ5WCA9IG92ZXJsYXBBbW91bnRbMF07XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICBtb3ZlQnlZID0gb3ZlcmxhcEFtb3VudFsxXTtcclxuICB9XHJcbiAgLy8gcmV0dXJuIGhhbGYgdGhlIGFtb3VudCBzbyB0aGF0IGlmIGVhY2ggcmVjdGFuZ2xlIGlzIG1vdmVkIGJ5IHRoZXNlXHJcbiAgLy8gYW1vdW50cyBpbiBvcHBvc2l0ZSBkaXJlY3Rpb25zLCBvdmVybGFwIHdpbGwgYmUgcmVzb2x2ZWRcclxuICBvdmVybGFwQW1vdW50WzBdID0gLTEgKiBkaXJlY3Rpb25zWzBdICogKChtb3ZlQnlYIC8gMikgKyBzZXBhcmF0aW9uQnVmZmVyKTtcclxuICBvdmVybGFwQW1vdW50WzFdID0gLTEgKiBkaXJlY3Rpb25zWzFdICogKChtb3ZlQnlZIC8gMikgKyBzZXBhcmF0aW9uQnVmZmVyKTtcclxufVxyXG5cclxuSUdlb21ldHJ5LmRlY2lkZURpcmVjdGlvbnNGb3JPdmVybGFwcGluZ05vZGVzID0gZnVuY3Rpb24gKHJlY3RBLCByZWN0QiwgZGlyZWN0aW9ucylcclxue1xyXG4gIGlmIChyZWN0QS5nZXRDZW50ZXJYKCkgPCByZWN0Qi5nZXRDZW50ZXJYKCkpXHJcbiAge1xyXG4gICAgZGlyZWN0aW9uc1swXSA9IC0xO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgZGlyZWN0aW9uc1swXSA9IDE7XHJcbiAgfVxyXG5cclxuICBpZiAocmVjdEEuZ2V0Q2VudGVyWSgpIDwgcmVjdEIuZ2V0Q2VudGVyWSgpKVxyXG4gIHtcclxuICAgIGRpcmVjdGlvbnNbMV0gPSAtMTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIGRpcmVjdGlvbnNbMV0gPSAxO1xyXG4gIH1cclxufVxyXG5cclxuSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbjIgPSBmdW5jdGlvbiAocmVjdEEsIHJlY3RCLCByZXN1bHQpXHJcbntcclxuICAvL3Jlc3VsdFswLTFdIHdpbGwgY29udGFpbiBjbGlwUG9pbnQgb2YgcmVjdEEsIHJlc3VsdFsyLTNdIHdpbGwgY29udGFpbiBjbGlwUG9pbnQgb2YgcmVjdEJcclxuICB2YXIgcDF4ID0gcmVjdEEuZ2V0Q2VudGVyWCgpO1xyXG4gIHZhciBwMXkgPSByZWN0QS5nZXRDZW50ZXJZKCk7XHJcbiAgdmFyIHAyeCA9IHJlY3RCLmdldENlbnRlclgoKTtcclxuICB2YXIgcDJ5ID0gcmVjdEIuZ2V0Q2VudGVyWSgpO1xyXG5cclxuICAvL2lmIHR3byByZWN0YW5nbGVzIGludGVyc2VjdCwgdGhlbiBjbGlwcGluZyBwb2ludHMgYXJlIGNlbnRlcnNcclxuICBpZiAocmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpXHJcbiAge1xyXG4gICAgcmVzdWx0WzBdID0gcDF4O1xyXG4gICAgcmVzdWx0WzFdID0gcDF5O1xyXG4gICAgcmVzdWx0WzJdID0gcDJ4O1xyXG4gICAgcmVzdWx0WzNdID0gcDJ5O1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIC8vdmFyaWFibGVzIGZvciByZWN0QVxyXG4gIHZhciB0b3BMZWZ0QXggPSByZWN0QS5nZXRYKCk7XHJcbiAgdmFyIHRvcExlZnRBeSA9IHJlY3RBLmdldFkoKTtcclxuICB2YXIgdG9wUmlnaHRBeCA9IHJlY3RBLmdldFJpZ2h0KCk7XHJcbiAgdmFyIGJvdHRvbUxlZnRBeCA9IHJlY3RBLmdldFgoKTtcclxuICB2YXIgYm90dG9tTGVmdEF5ID0gcmVjdEEuZ2V0Qm90dG9tKCk7XHJcbiAgdmFyIGJvdHRvbVJpZ2h0QXggPSByZWN0QS5nZXRSaWdodCgpO1xyXG4gIHZhciBoYWxmV2lkdGhBID0gcmVjdEEuZ2V0V2lkdGhIYWxmKCk7XHJcbiAgdmFyIGhhbGZIZWlnaHRBID0gcmVjdEEuZ2V0SGVpZ2h0SGFsZigpO1xyXG4gIC8vdmFyaWFibGVzIGZvciByZWN0QlxyXG4gIHZhciB0b3BMZWZ0QnggPSByZWN0Qi5nZXRYKCk7XHJcbiAgdmFyIHRvcExlZnRCeSA9IHJlY3RCLmdldFkoKTtcclxuICB2YXIgdG9wUmlnaHRCeCA9IHJlY3RCLmdldFJpZ2h0KCk7XHJcbiAgdmFyIGJvdHRvbUxlZnRCeCA9IHJlY3RCLmdldFgoKTtcclxuICB2YXIgYm90dG9tTGVmdEJ5ID0gcmVjdEIuZ2V0Qm90dG9tKCk7XHJcbiAgdmFyIGJvdHRvbVJpZ2h0QnggPSByZWN0Qi5nZXRSaWdodCgpO1xyXG4gIHZhciBoYWxmV2lkdGhCID0gcmVjdEIuZ2V0V2lkdGhIYWxmKCk7XHJcbiAgdmFyIGhhbGZIZWlnaHRCID0gcmVjdEIuZ2V0SGVpZ2h0SGFsZigpO1xyXG4gIC8vZmxhZyB3aGV0aGVyIGNsaXBwaW5nIHBvaW50cyBhcmUgZm91bmRcclxuICB2YXIgY2xpcFBvaW50QUZvdW5kID0gZmFsc2U7XHJcbiAgdmFyIGNsaXBQb2ludEJGb3VuZCA9IGZhbHNlO1xyXG5cclxuICAvLyBsaW5lIGlzIHZlcnRpY2FsXHJcbiAgaWYgKHAxeCA9PSBwMngpXHJcbiAge1xyXG4gICAgaWYgKHAxeSA+IHAyeSlcclxuICAgIHtcclxuICAgICAgcmVzdWx0WzBdID0gcDF4O1xyXG4gICAgICByZXN1bHRbMV0gPSB0b3BMZWZ0QXk7XHJcbiAgICAgIHJlc3VsdFsyXSA9IHAyeDtcclxuICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChwMXkgPCBwMnkpXHJcbiAgICB7XHJcbiAgICAgIHJlc3VsdFswXSA9IHAxeDtcclxuICAgICAgcmVzdWx0WzFdID0gYm90dG9tTGVmdEF5O1xyXG4gICAgICByZXN1bHRbMl0gPSBwMng7XHJcbiAgICAgIHJlc3VsdFszXSA9IHRvcExlZnRCeTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICAvL25vdCBsaW5lLCByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gbGluZSBpcyBob3Jpem9udGFsXHJcbiAgZWxzZSBpZiAocDF5ID09IHAyeSlcclxuICB7XHJcbiAgICBpZiAocDF4ID4gcDJ4KVxyXG4gICAge1xyXG4gICAgICByZXN1bHRbMF0gPSB0b3BMZWZ0QXg7XHJcbiAgICAgIHJlc3VsdFsxXSA9IHAxeTtcclxuICAgICAgcmVzdWx0WzJdID0gdG9wUmlnaHRCeDtcclxuICAgICAgcmVzdWx0WzNdID0gcDJ5O1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChwMXggPCBwMngpXHJcbiAgICB7XHJcbiAgICAgIHJlc3VsdFswXSA9IHRvcFJpZ2h0QXg7XHJcbiAgICAgIHJlc3VsdFsxXSA9IHAxeTtcclxuICAgICAgcmVzdWx0WzJdID0gdG9wTGVmdEJ4O1xyXG4gICAgICByZXN1bHRbM10gPSBwMnk7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgLy9ub3QgdmFsaWQgbGluZSwgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICAvL3Nsb3BlcyBvZiByZWN0QSdzIGFuZCByZWN0QidzIGRpYWdvbmFsc1xyXG4gICAgdmFyIHNsb3BlQSA9IHJlY3RBLmhlaWdodCAvIHJlY3RBLndpZHRoO1xyXG4gICAgdmFyIHNsb3BlQiA9IHJlY3RCLmhlaWdodCAvIHJlY3RCLndpZHRoO1xyXG5cclxuICAgIC8vc2xvcGUgb2YgbGluZSBiZXR3ZWVuIGNlbnRlciBvZiByZWN0QSBhbmQgY2VudGVyIG9mIHJlY3RCXHJcbiAgICB2YXIgc2xvcGVQcmltZSA9IChwMnkgLSBwMXkpIC8gKHAyeCAtIHAxeCk7XHJcbiAgICB2YXIgY2FyZGluYWxEaXJlY3Rpb25BO1xyXG4gICAgdmFyIGNhcmRpbmFsRGlyZWN0aW9uQjtcclxuICAgIHZhciB0ZW1wUG9pbnRBeDtcclxuICAgIHZhciB0ZW1wUG9pbnRBeTtcclxuICAgIHZhciB0ZW1wUG9pbnRCeDtcclxuICAgIHZhciB0ZW1wUG9pbnRCeTtcclxuXHJcbiAgICAvL2RldGVybWluZSB3aGV0aGVyIGNsaXBwaW5nIHBvaW50IGlzIHRoZSBjb3JuZXIgb2Ygbm9kZUFcclxuICAgIGlmICgoLXNsb3BlQSkgPT0gc2xvcGVQcmltZSlcclxuICAgIHtcclxuICAgICAgaWYgKHAxeCA+IHAyeClcclxuICAgICAge1xyXG4gICAgICAgIHJlc3VsdFswXSA9IGJvdHRvbUxlZnRBeDtcclxuICAgICAgICByZXN1bHRbMV0gPSBib3R0b21MZWZ0QXk7XHJcbiAgICAgICAgY2xpcFBvaW50QUZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMF0gPSB0b3BSaWdodEF4O1xyXG4gICAgICAgIHJlc3VsdFsxXSA9IHRvcExlZnRBeTtcclxuICAgICAgICBjbGlwUG9pbnRBRm91bmQgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChzbG9wZUEgPT0gc2xvcGVQcmltZSlcclxuICAgIHtcclxuICAgICAgaWYgKHAxeCA+IHAyeClcclxuICAgICAge1xyXG4gICAgICAgIHJlc3VsdFswXSA9IHRvcExlZnRBeDtcclxuICAgICAgICByZXN1bHRbMV0gPSB0b3BMZWZ0QXk7XHJcbiAgICAgICAgY2xpcFBvaW50QUZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMF0gPSBib3R0b21SaWdodEF4O1xyXG4gICAgICAgIHJlc3VsdFsxXSA9IGJvdHRvbUxlZnRBeTtcclxuICAgICAgICBjbGlwUG9pbnRBRm91bmQgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy9kZXRlcm1pbmUgd2hldGhlciBjbGlwcGluZyBwb2ludCBpcyB0aGUgY29ybmVyIG9mIG5vZGVCXHJcbiAgICBpZiAoKC1zbG9wZUIpID09IHNsb3BlUHJpbWUpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMnggPiBwMXgpXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMl0gPSBib3R0b21MZWZ0Qng7XHJcbiAgICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xyXG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgcmVzdWx0WzJdID0gdG9wUmlnaHRCeDtcclxuICAgICAgICByZXN1bHRbM10gPSB0b3BMZWZ0Qnk7XHJcbiAgICAgICAgY2xpcFBvaW50QkZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoc2xvcGVCID09IHNsb3BlUHJpbWUpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMnggPiBwMXgpXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMl0gPSB0b3BMZWZ0Qng7XHJcbiAgICAgICAgcmVzdWx0WzNdID0gdG9wTGVmdEJ5O1xyXG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgcmVzdWx0WzJdID0gYm90dG9tUmlnaHRCeDtcclxuICAgICAgICByZXN1bHRbM10gPSBib3R0b21MZWZ0Qnk7XHJcbiAgICAgICAgY2xpcFBvaW50QkZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vaWYgYm90aCBjbGlwcGluZyBwb2ludHMgYXJlIGNvcm5lcnNcclxuICAgIGlmIChjbGlwUG9pbnRBRm91bmQgJiYgY2xpcFBvaW50QkZvdW5kKVxyXG4gICAge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy9kZXRlcm1pbmUgQ2FyZGluYWwgRGlyZWN0aW9uIG9mIHJlY3RhbmdsZXNcclxuICAgIGlmIChwMXggPiBwMngpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMXkgPiBwMnkpXHJcbiAgICAgIHtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oc2xvcGVBLCBzbG9wZVByaW1lLCA0KTtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkIgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oc2xvcGVCLCBzbG9wZVByaW1lLCAyKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oLXNsb3BlQSwgc2xvcGVQcmltZSwgMyk7XHJcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKC1zbG9wZUIsIHNsb3BlUHJpbWUsIDEpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMXkgPiBwMnkpXHJcbiAgICAgIHtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oLXNsb3BlQSwgc2xvcGVQcmltZSwgMSk7XHJcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKC1zbG9wZUIsIHNsb3BlUHJpbWUsIDMpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2VcclxuICAgICAge1xyXG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQSA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbihzbG9wZUEsIHNsb3BlUHJpbWUsIDIpO1xyXG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQiA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbihzbG9wZUIsIHNsb3BlUHJpbWUsIDQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvL2NhbGN1bGF0ZSBjbGlwcGluZyBQb2ludCBpZiBpdCBpcyBub3QgZm91bmQgYmVmb3JlXHJcbiAgICBpZiAoIWNsaXBQb2ludEFGb3VuZClcclxuICAgIHtcclxuICAgICAgc3dpdGNoIChjYXJkaW5hbERpcmVjdGlvbkEpXHJcbiAgICAgIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeSA9IHRvcExlZnRBeTtcclxuICAgICAgICAgIHRlbXBQb2ludEF4ID0gcDF4ICsgKC1oYWxmSGVpZ2h0QSkgLyBzbG9wZVByaW1lO1xyXG4gICAgICAgICAgcmVzdWx0WzBdID0gdGVtcFBvaW50QXg7XHJcbiAgICAgICAgICByZXN1bHRbMV0gPSB0ZW1wUG9pbnRBeTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgIHRlbXBQb2ludEF4ID0gYm90dG9tUmlnaHRBeDtcclxuICAgICAgICAgIHRlbXBQb2ludEF5ID0gcDF5ICsgaGFsZldpZHRoQSAqIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMF0gPSB0ZW1wUG9pbnRBeDtcclxuICAgICAgICAgIHJlc3VsdFsxXSA9IHRlbXBQb2ludEF5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgdGVtcFBvaW50QXkgPSBib3R0b21MZWZ0QXk7XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeCA9IHAxeCArIGhhbGZIZWlnaHRBIC8gc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFswXSA9IHRlbXBQb2ludEF4O1xyXG4gICAgICAgICAgcmVzdWx0WzFdID0gdGVtcFBvaW50QXk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeCA9IGJvdHRvbUxlZnRBeDtcclxuICAgICAgICAgIHRlbXBQb2ludEF5ID0gcDF5ICsgKC1oYWxmV2lkdGhBKSAqIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMF0gPSB0ZW1wUG9pbnRBeDtcclxuICAgICAgICAgIHJlc3VsdFsxXSA9IHRlbXBQb2ludEF5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICghY2xpcFBvaW50QkZvdW5kKVxyXG4gICAge1xyXG4gICAgICBzd2l0Y2ggKGNhcmRpbmFsRGlyZWN0aW9uQilcclxuICAgICAge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgIHRlbXBQb2ludEJ5ID0gdG9wTGVmdEJ5O1xyXG4gICAgICAgICAgdGVtcFBvaW50QnggPSBwMnggKyAoLWhhbGZIZWlnaHRCKSAvIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMl0gPSB0ZW1wUG9pbnRCeDtcclxuICAgICAgICAgIHJlc3VsdFszXSA9IHRlbXBQb2ludEJ5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgdGVtcFBvaW50QnggPSBib3R0b21SaWdodEJ4O1xyXG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBwMnkgKyBoYWxmV2lkdGhCICogc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFsyXSA9IHRlbXBQb2ludEJ4O1xyXG4gICAgICAgICAgcmVzdWx0WzNdID0gdGVtcFBvaW50Qnk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRCeSA9IGJvdHRvbUxlZnRCeTtcclxuICAgICAgICAgIHRlbXBQb2ludEJ4ID0gcDJ4ICsgaGFsZkhlaWdodEIgLyBzbG9wZVByaW1lO1xyXG4gICAgICAgICAgcmVzdWx0WzJdID0gdGVtcFBvaW50Qng7XHJcbiAgICAgICAgICByZXN1bHRbM10gPSB0ZW1wUG9pbnRCeTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgIHRlbXBQb2ludEJ4ID0gYm90dG9tTGVmdEJ4O1xyXG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBwMnkgKyAoLWhhbGZXaWR0aEIpICogc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFsyXSA9IHRlbXBQb2ludEJ4O1xyXG4gICAgICAgICAgcmVzdWx0WzNdID0gdGVtcFBvaW50Qnk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbklHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbiA9IGZ1bmN0aW9uIChzbG9wZSwgc2xvcGVQcmltZSwgbGluZSlcclxue1xyXG4gIGlmIChzbG9wZSA+IHNsb3BlUHJpbWUpXHJcbiAge1xyXG4gICAgcmV0dXJuIGxpbmU7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICByZXR1cm4gMSArIGxpbmUgJSA0O1xyXG4gIH1cclxufVxyXG5cclxuSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbiA9IGZ1bmN0aW9uIChzMSwgczIsIGYxLCBmMilcclxue1xyXG4gIGlmIChmMiA9PSBudWxsKSB7XHJcbiAgICByZXR1cm4gSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbjIoczEsIHMyLCBmMSk7XHJcbiAgfVxyXG4gIHZhciB4MSA9IHMxLng7XHJcbiAgdmFyIHkxID0gczEueTtcclxuICB2YXIgeDIgPSBzMi54O1xyXG4gIHZhciB5MiA9IHMyLnk7XHJcbiAgdmFyIHgzID0gZjEueDtcclxuICB2YXIgeTMgPSBmMS55O1xyXG4gIHZhciB4NCA9IGYyLng7XHJcbiAgdmFyIHk0ID0gZjIueTtcclxuICB2YXIgeCwgeTsgLy8gaW50ZXJzZWN0aW9uIHBvaW50XHJcbiAgdmFyIGExLCBhMiwgYjEsIGIyLCBjMSwgYzI7IC8vIGNvZWZmaWNpZW50cyBvZiBsaW5lIGVxbnMuXHJcbiAgdmFyIGRlbm9tO1xyXG5cclxuICBhMSA9IHkyIC0geTE7XHJcbiAgYjEgPSB4MSAtIHgyO1xyXG4gIGMxID0geDIgKiB5MSAtIHgxICogeTI7ICAvLyB7IGExKnggKyBiMSp5ICsgYzEgPSAwIGlzIGxpbmUgMSB9XHJcblxyXG4gIGEyID0geTQgLSB5MztcclxuICBiMiA9IHgzIC0geDQ7XHJcbiAgYzIgPSB4NCAqIHkzIC0geDMgKiB5NDsgIC8vIHsgYTIqeCArIGIyKnkgKyBjMiA9IDAgaXMgbGluZSAyIH1cclxuXHJcbiAgZGVub20gPSBhMSAqIGIyIC0gYTIgKiBiMTtcclxuXHJcbiAgaWYgKGRlbm9tID09IDApXHJcbiAge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICB4ID0gKGIxICogYzIgLSBiMiAqIGMxKSAvIGRlbm9tO1xyXG4gIHkgPSAoYTIgKiBjMSAtIGExICogYzIpIC8gZGVub207XHJcblxyXG4gIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFNlY3Rpb246IENsYXNzIENvbnN0YW50c1xyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vKipcclxuICogU29tZSB1c2VmdWwgcHJlLWNhbGN1bGF0ZWQgY29uc3RhbnRzXHJcbiAqL1xyXG5JR2VvbWV0cnkuSEFMRl9QSSA9IDAuNSAqIE1hdGguUEk7XHJcbklHZW9tZXRyeS5PTkVfQU5EX0hBTEZfUEkgPSAxLjUgKiBNYXRoLlBJO1xyXG5JR2VvbWV0cnkuVFdPX1BJID0gMi4wICogTWF0aC5QSTtcclxuSUdlb21ldHJ5LlRIUkVFX1BJID0gMy4wICogTWF0aC5QSTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSUdlb21ldHJ5O1xyXG4iLCJmdW5jdGlvbiBJTWF0aCgpIHtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIHJldHVybnMgdGhlIHNpZ24gb2YgdGhlIGlucHV0IHZhbHVlLlxyXG4gKi9cclxuSU1hdGguc2lnbiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gIGlmICh2YWx1ZSA+IDApXHJcbiAge1xyXG4gICAgcmV0dXJuIDE7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHZhbHVlIDwgMClcclxuICB7XHJcbiAgICByZXR1cm4gLTE7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICByZXR1cm4gMDtcclxuICB9XHJcbn1cclxuXHJcbklNYXRoLmZsb29yID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgcmV0dXJuIHZhbHVlIDwgMCA/IE1hdGguY2VpbCh2YWx1ZSkgOiBNYXRoLmZsb29yKHZhbHVlKTtcclxufVxyXG5cclxuSU1hdGguY2VpbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gIHJldHVybiB2YWx1ZSA8IDAgPyBNYXRoLmZsb29yKHZhbHVlKSA6IE1hdGguY2VpbCh2YWx1ZSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSU1hdGg7XHJcbiIsImZ1bmN0aW9uIEludGVnZXIoKSB7XHJcbn1cclxuXHJcbkludGVnZXIuTUFYX1ZBTFVFID0gMjE0NzQ4MzY0NztcclxuSW50ZWdlci5NSU5fVkFMVUUgPSAtMjE0NzQ4MzY0ODtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSW50ZWdlcjtcclxuIiwidmFyIExHcmFwaE9iamVjdCA9IHJlcXVpcmUoJy4vTEdyYXBoT2JqZWN0Jyk7XHJcblxyXG5mdW5jdGlvbiBMRWRnZShzb3VyY2UsIHRhcmdldCwgdkVkZ2UpIHtcclxuICBMR3JhcGhPYmplY3QuY2FsbCh0aGlzLCB2RWRnZSk7XHJcblxyXG4gIHRoaXMuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0ID0gZmFsc2U7XHJcbiAgdGhpcy52R3JhcGhPYmplY3QgPSB2RWRnZTtcclxuICB0aGlzLmJlbmRwb2ludHMgPSBbXTtcclxuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcclxuICB0aGlzLnRhcmdldCA9IHRhcmdldDtcclxufVxyXG5cclxuTEVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGhPYmplY3QucHJvdG90eXBlKTtcclxuXHJcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoT2JqZWN0KSB7XHJcbiAgTEVkZ2VbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XHJcbn1cclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRTb3VyY2UgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuc291cmNlO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmdldFRhcmdldCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy50YXJnZXQ7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuaXNJbnRlckdyYXBoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmlzSW50ZXJHcmFwaDtcclxufTtcclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRMZW5ndGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGVuZ3RoO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5pc092ZXJsYXBpbmdTb3VyY2VBbmRUYXJnZXQ7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0QmVuZHBvaW50cyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5iZW5kcG9pbnRzO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmdldExjYSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sY2E7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0U291cmNlSW5MY2EgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuc291cmNlSW5MY2E7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0VGFyZ2V0SW5MY2EgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMudGFyZ2V0SW5MY2E7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0T3RoZXJFbmQgPSBmdW5jdGlvbiAobm9kZSlcclxue1xyXG4gIGlmICh0aGlzLnNvdXJjZSA9PT0gbm9kZSlcclxuICB7XHJcbiAgICByZXR1cm4gdGhpcy50YXJnZXQ7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHRoaXMudGFyZ2V0ID09PSBub2RlKVxyXG4gIHtcclxuICAgIHJldHVybiB0aGlzLnNvdXJjZTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIHRocm93IFwiTm9kZSBpcyBub3QgaW5jaWRlbnQgd2l0aCB0aGlzIGVkZ2VcIjtcclxuICB9XHJcbn1cclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRPdGhlckVuZEluR3JhcGggPSBmdW5jdGlvbiAobm9kZSwgZ3JhcGgpXHJcbntcclxuICB2YXIgb3RoZXJFbmQgPSB0aGlzLmdldE90aGVyRW5kKG5vZGUpO1xyXG4gIHZhciByb290ID0gZ3JhcGguZ2V0R3JhcGhNYW5hZ2VyKCkuZ2V0Um9vdCgpO1xyXG5cclxuICB3aGlsZSAodHJ1ZSlcclxuICB7XHJcbiAgICBpZiAob3RoZXJFbmQuZ2V0T3duZXIoKSA9PSBncmFwaClcclxuICAgIHtcclxuICAgICAgcmV0dXJuIG90aGVyRW5kO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvdGhlckVuZC5nZXRPd25lcigpID09IHJvb3QpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIG90aGVyRW5kID0gb3RoZXJFbmQuZ2V0T3duZXIoKS5nZXRQYXJlbnQoKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBudWxsO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLnVwZGF0ZUxlbmd0aCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgY2xpcFBvaW50Q29vcmRpbmF0ZXMgPSBuZXcgQXJyYXkoNCk7XHJcblxyXG4gIHRoaXMuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0ID1cclxuICAgICAgICAgIElHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24odGhpcy50YXJnZXQuZ2V0UmVjdCgpLFxyXG4gICAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZS5nZXRSZWN0KCksXHJcbiAgICAgICAgICAgICAgICAgIGNsaXBQb2ludENvb3JkaW5hdGVzKTtcclxuXHJcbiAgaWYgKCF0aGlzLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldClcclxuICB7XHJcbiAgICB0aGlzLmxlbmd0aFggPSBjbGlwUG9pbnRDb29yZGluYXRlc1swXSAtIGNsaXBQb2ludENvb3JkaW5hdGVzWzJdO1xyXG4gICAgdGhpcy5sZW5ndGhZID0gY2xpcFBvaW50Q29vcmRpbmF0ZXNbMV0gLSBjbGlwUG9pbnRDb29yZGluYXRlc1szXTtcclxuXHJcbiAgICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhYKSA8IDEuMClcclxuICAgIHtcclxuICAgICAgdGhpcy5sZW5ndGhYID0gSU1hdGguc2lnbih0aGlzLmxlbmd0aFgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChNYXRoLmFicyh0aGlzLmxlbmd0aFkpIDwgMS4wKVxyXG4gICAge1xyXG4gICAgICB0aGlzLmxlbmd0aFkgPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sZW5ndGggPSBNYXRoLnNxcnQoXHJcbiAgICAgICAgICAgIHRoaXMubGVuZ3RoWCAqIHRoaXMubGVuZ3RoWCArIHRoaXMubGVuZ3RoWSAqIHRoaXMubGVuZ3RoWSk7XHJcbiAgfVxyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLnVwZGF0ZUxlbmd0aFNpbXBsZSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB0aGlzLmxlbmd0aFggPSB0aGlzLnRhcmdldC5nZXRDZW50ZXJYKCkgLSB0aGlzLnNvdXJjZS5nZXRDZW50ZXJYKCk7XHJcbiAgdGhpcy5sZW5ndGhZID0gdGhpcy50YXJnZXQuZ2V0Q2VudGVyWSgpIC0gdGhpcy5zb3VyY2UuZ2V0Q2VudGVyWSgpO1xyXG5cclxuICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhYKSA8IDEuMClcclxuICB7XHJcbiAgICB0aGlzLmxlbmd0aFggPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWCk7XHJcbiAgfVxyXG5cclxuICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhZKSA8IDEuMClcclxuICB7XHJcbiAgICB0aGlzLmxlbmd0aFkgPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWSk7XHJcbiAgfVxyXG5cclxuICB0aGlzLmxlbmd0aCA9IE1hdGguc3FydChcclxuICAgICAgICAgIHRoaXMubGVuZ3RoWCAqIHRoaXMubGVuZ3RoWCArIHRoaXMubGVuZ3RoWSAqIHRoaXMubGVuZ3RoWSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTEVkZ2U7XHJcbiIsInZhciBMR3JhcGhPYmplY3QgPSByZXF1aXJlKCcuL0xHcmFwaE9iamVjdCcpO1xyXG52YXIgSW50ZWdlciA9IHJlcXVpcmUoJy4vSW50ZWdlcicpO1xyXG52YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcclxudmFyIExHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0xHcmFwaE1hbmFnZXInKTtcclxudmFyIExOb2RlID0gcmVxdWlyZSgnLi9MTm9kZScpO1xyXG5cclxuZnVuY3Rpb24gTEdyYXBoKHBhcmVudCwgb2JqMiwgdkdyYXBoKSB7XHJcbiAgTEdyYXBoT2JqZWN0LmNhbGwodGhpcywgdkdyYXBoKTtcclxuICB0aGlzLmVzdGltYXRlZFNpemUgPSBJbnRlZ2VyLk1JTl9WQUxVRTtcclxuICB0aGlzLm1hcmdpbiA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVBIX01BUkdJTjtcclxuICB0aGlzLmVkZ2VzID0gW107XHJcbiAgdGhpcy5ub2RlcyA9IFtdO1xyXG4gIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcclxuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuXHJcbiAgaWYgKG9iajIgIT0gbnVsbCAmJiBvYmoyIGluc3RhbmNlb2YgTEdyYXBoTWFuYWdlcikge1xyXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIgPSBvYmoyO1xyXG4gIH1cclxuICBlbHNlIGlmIChvYmoyICE9IG51bGwgJiYgb2JqMiBpbnN0YW5jZW9mIExheW91dCkge1xyXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIgPSBvYmoyLmdyYXBoTWFuYWdlcjtcclxuICB9XHJcbn1cclxuXHJcbkxHcmFwaC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExHcmFwaE9iamVjdC5wcm90b3R5cGUpO1xyXG5mb3IgKHZhciBwcm9wIGluIExHcmFwaE9iamVjdCkge1xyXG4gIExHcmFwaFtwcm9wXSA9IExHcmFwaE9iamVjdFtwcm9wXTtcclxufVxyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXROb2RlcyA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5ub2RlcztcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0RWRnZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuZWRnZXM7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldEdyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXI7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldFBhcmVudCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5wYXJlbnQ7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldExlZnQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGVmdDtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0UmlnaHQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmlnaHQ7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldFRvcCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy50b3A7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldEJvdHRvbSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5ib3R0b207XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmlzQ29ubmVjdGVkID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmlzQ29ubmVjdGVkO1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob2JqMSwgc291cmNlTm9kZSwgdGFyZ2V0Tm9kZSkge1xyXG4gIGlmIChzb3VyY2VOb2RlID09IG51bGwgJiYgdGFyZ2V0Tm9kZSA9PSBudWxsKSB7XHJcbiAgICB2YXIgbmV3Tm9kZSA9IG9iajE7XHJcbiAgICBpZiAodGhpcy5ncmFwaE1hbmFnZXIgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIkdyYXBoIGhhcyBubyBncmFwaCBtZ3IhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5nZXROb2RlcygpLmluZGV4T2YobmV3Tm9kZSkgPiAtMSkge1xyXG4gICAgICB0aHJvdyBcIk5vZGUgYWxyZWFkeSBpbiBncmFwaCFcIjtcclxuICAgIH1cclxuICAgIG5ld05vZGUub3duZXIgPSB0aGlzO1xyXG4gICAgdGhpcy5nZXROb2RlcygpLnB1c2gobmV3Tm9kZSk7XHJcblxyXG4gICAgcmV0dXJuIG5ld05vZGU7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgdmFyIG5ld0VkZ2UgPSBvYmoxO1xyXG4gICAgaWYgKCEodGhpcy5nZXROb2RlcygpLmluZGV4T2Yoc291cmNlTm9kZSkgPiAtMSAmJiAodGhpcy5nZXROb2RlcygpLmluZGV4T2YodGFyZ2V0Tm9kZSkpID4gLTEpKSB7XHJcbiAgICAgIHRocm93IFwiU291cmNlIG9yIHRhcmdldCBub3QgaW4gZ3JhcGghXCI7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCEoc291cmNlTm9kZS5vd25lciA9PSB0YXJnZXROb2RlLm93bmVyICYmIHNvdXJjZU5vZGUub3duZXIgPT0gdGhpcykpIHtcclxuICAgICAgdGhyb3cgXCJCb3RoIG93bmVycyBtdXN0IGJlIHRoaXMgZ3JhcGghXCI7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHNvdXJjZU5vZGUub3duZXIgIT0gdGFyZ2V0Tm9kZS5vd25lcilcclxuICAgIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gc2V0IHNvdXJjZSBhbmQgdGFyZ2V0XHJcbiAgICBuZXdFZGdlLnNvdXJjZSA9IHNvdXJjZU5vZGU7XHJcbiAgICBuZXdFZGdlLnRhcmdldCA9IHRhcmdldE5vZGU7XHJcblxyXG4gICAgLy8gc2V0IGFzIGludHJhLWdyYXBoIGVkZ2VcclxuICAgIG5ld0VkZ2UuaXNJbnRlckdyYXBoID0gZmFsc2U7XHJcblxyXG4gICAgLy8gYWRkIHRvIGdyYXBoIGVkZ2UgbGlzdFxyXG4gICAgdGhpcy5nZXRFZGdlcygpLnB1c2gobmV3RWRnZSk7XHJcblxyXG4gICAgLy8gYWRkIHRvIGluY2lkZW5jeSBsaXN0c1xyXG4gICAgc291cmNlTm9kZS5lZGdlcy5wdXNoKG5ld0VkZ2UpO1xyXG5cclxuICAgIGlmICh0YXJnZXROb2RlICE9IHNvdXJjZU5vZGUpXHJcbiAgICB7XHJcbiAgICAgIHRhcmdldE5vZGUuZWRnZXMucHVzaChuZXdFZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3RWRnZTtcclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChvYmopIHtcclxuICB2YXIgbm9kZSA9IG9iajtcclxuICBpZiAob2JqIGluc3RhbmNlb2YgTE5vZGUpIHtcclxuICAgIGlmIChub2RlID09IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJOb2RlIGlzIG51bGwhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAoIShub2RlLm93bmVyICE9IG51bGwgJiYgbm9kZS5vd25lciA9PSB0aGlzKSkge1xyXG4gICAgICB0aHJvdyBcIk93bmVyIGdyYXBoIGlzIGludmFsaWQhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5ncmFwaE1hbmFnZXIgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIk93bmVyIGdyYXBoIG1hbmFnZXIgaXMgaW52YWxpZCFcIjtcclxuICAgIH1cclxuICAgIC8vIHJlbW92ZSBpbmNpZGVudCBlZGdlcyBmaXJzdCAobWFrZSBhIGNvcHkgdG8gZG8gaXQgc2FmZWx5KVxyXG4gICAgdmFyIGVkZ2VzVG9CZVJlbW92ZWQgPSBub2RlLmVkZ2VzLnNsaWNlKCk7XHJcbiAgICB2YXIgZWRnZTtcclxuICAgIHZhciBzID0gZWRnZXNUb0JlUmVtb3ZlZC5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICAgIHtcclxuICAgICAgZWRnZSA9IGVkZ2VzVG9CZVJlbW92ZWRbaV07XHJcblxyXG4gICAgICBpZiAoZWRnZS5pc0ludGVyR3JhcGgpXHJcbiAgICAgIHtcclxuICAgICAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUoZWRnZSk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgZWRnZS5zb3VyY2Uub3duZXIucmVtb3ZlKGVkZ2UpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbm93IHRoZSBub2RlIGl0c2VsZlxyXG4gICAgdmFyIGluZGV4ID0gdGhpcy5ub2Rlcy5pbmRleE9mKG5vZGUpO1xyXG4gICAgaWYgKGluZGV4ID09IC0xKSB7XHJcbiAgICAgIHRocm93IFwiTm9kZSBub3QgaW4gb3duZXIgbm9kZSBsaXN0IVwiO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubm9kZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICB9XHJcbiAgZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgTEVkZ2UpIHtcclxuICAgIHZhciBlZGdlID0gb2JqO1xyXG4gICAgaWYgKGVkZ2UgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIkVkZ2UgaXMgbnVsbCFcIjtcclxuICAgIH1cclxuICAgIGlmICghKGVkZ2Uuc291cmNlICE9IG51bGwgJiYgZWRnZS50YXJnZXQgIT0gbnVsbCkpIHtcclxuICAgICAgdGhyb3cgXCJTb3VyY2UgYW5kL29yIHRhcmdldCBpcyBudWxsIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCEoZWRnZS5zb3VyY2Uub3duZXIgIT0gbnVsbCAmJiBlZGdlLnRhcmdldC5vd25lciAhPSBudWxsICYmXHJcbiAgICAgICAgICAgIGVkZ2Uuc291cmNlLm93bmVyID09IHRoaXMgJiYgZWRnZS50YXJnZXQub3duZXIgPT0gdGhpcykpIHtcclxuICAgICAgdGhyb3cgXCJTb3VyY2UgYW5kL29yIHRhcmdldCBvd25lciBpcyBpbnZhbGlkIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzb3VyY2VJbmRleCA9IGVkZ2Uuc291cmNlLmVkZ2VzLmluZGV4T2YoZWRnZSk7XHJcbiAgICB2YXIgdGFyZ2V0SW5kZXggPSBlZGdlLnRhcmdldC5lZGdlcy5pbmRleE9mKGVkZ2UpO1xyXG4gICAgaWYgKCEoc291cmNlSW5kZXggPiAtMSAmJiB0YXJnZXRJbmRleCA+IC0xKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGRvZXNuJ3Qga25vdyB0aGlzIGVkZ2UhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgZWRnZS5zb3VyY2UuZWRnZXMuc3BsaWNlKHNvdXJjZUluZGV4LCAxKTtcclxuXHJcbiAgICBpZiAoZWRnZS50YXJnZXQgIT0gZWRnZS5zb3VyY2UpXHJcbiAgICB7XHJcbiAgICAgIGVkZ2UudGFyZ2V0LmVkZ2VzLnNwbGljZSh0YXJnZXRJbmRleCwgMSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGluZGV4ID0gZWRnZS5zb3VyY2Uub3duZXIuZ2V0RWRnZXMoKS5pbmRleE9mKGVkZ2UpO1xyXG4gICAgaWYgKGluZGV4ID09IC0xKSB7XHJcbiAgICAgIHRocm93IFwiTm90IGluIG93bmVyJ3MgZWRnZSBsaXN0IVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGVkZ2Uuc291cmNlLm93bmVyLmdldEVkZ2VzKCkuc3BsaWNlKGluZGV4LCAxKTtcclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLnVwZGF0ZUxlZnRUb3AgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIHRvcCA9IEludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciBsZWZ0ID0gSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIG5vZGVUb3A7XHJcbiAgdmFyIG5vZGVMZWZ0O1xyXG5cclxuICB2YXIgbm9kZXMgPSB0aGlzLmdldE5vZGVzKCk7XHJcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBsTm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgbm9kZVRvcCA9IE1hdGguZmxvb3IobE5vZGUuZ2V0VG9wKCkpO1xyXG4gICAgbm9kZUxlZnQgPSBNYXRoLmZsb29yKGxOb2RlLmdldExlZnQoKSk7XHJcblxyXG4gICAgaWYgKHRvcCA+IG5vZGVUb3ApXHJcbiAgICB7XHJcbiAgICAgIHRvcCA9IG5vZGVUb3A7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGxlZnQgPiBub2RlTGVmdClcclxuICAgIHtcclxuICAgICAgbGVmdCA9IG5vZGVMZWZ0O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gRG8gd2UgaGF2ZSBhbnkgbm9kZXMgaW4gdGhpcyBncmFwaD9cclxuICBpZiAodG9wID09IEludGVnZXIuTUFYX1ZBTFVFKVxyXG4gIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5sZWZ0ID0gbGVmdCAtIHRoaXMubWFyZ2luO1xyXG4gIHRoaXMudG9wID0gdG9wIC0gdGhpcy5tYXJnaW47XHJcblxyXG4gIC8vIEFwcGx5IHRoZSBtYXJnaW5zIGFuZCByZXR1cm4gdGhlIHJlc3VsdFxyXG4gIHJldHVybiBuZXcgUG9pbnQodGhpcy5sZWZ0LCB0aGlzLnRvcCk7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLnVwZGF0ZUJvdW5kcyA9IGZ1bmN0aW9uIChyZWN1cnNpdmUpXHJcbntcclxuICAvLyBjYWxjdWxhdGUgYm91bmRzXHJcbiAgdmFyIGxlZnQgPSBJbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgcmlnaHQgPSAtSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIHRvcCA9IEludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciBib3R0b20gPSAtSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIG5vZGVMZWZ0O1xyXG4gIHZhciBub2RlUmlnaHQ7XHJcbiAgdmFyIG5vZGVUb3A7XHJcbiAgdmFyIG5vZGVCb3R0b207XHJcblxyXG4gIHZhciBub2RlcyA9IHRoaXMubm9kZXM7XHJcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIGxOb2RlID0gbm9kZXNbaV07XHJcblxyXG4gICAgaWYgKHJlY3Vyc2l2ZSAmJiBsTm9kZS5jaGlsZCAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICBsTm9kZS51cGRhdGVCb3VuZHMoKTtcclxuICAgIH1cclxuICAgIG5vZGVMZWZ0ID0gTWF0aC5mbG9vcihsTm9kZS5nZXRMZWZ0KCkpO1xyXG4gICAgbm9kZVJpZ2h0ID0gTWF0aC5mbG9vcihsTm9kZS5nZXRSaWdodCgpKTtcclxuICAgIG5vZGVUb3AgPSBNYXRoLmZsb29yKGxOb2RlLmdldFRvcCgpKTtcclxuICAgIG5vZGVCb3R0b20gPSBNYXRoLmZsb29yKGxOb2RlLmdldEJvdHRvbSgpKTtcclxuXHJcbiAgICBpZiAobGVmdCA+IG5vZGVMZWZ0KVxyXG4gICAge1xyXG4gICAgICBsZWZ0ID0gbm9kZUxlZnQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJpZ2h0IDwgbm9kZVJpZ2h0KVxyXG4gICAge1xyXG4gICAgICByaWdodCA9IG5vZGVSaWdodDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodG9wID4gbm9kZVRvcClcclxuICAgIHtcclxuICAgICAgdG9wID0gbm9kZVRvcDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoYm90dG9tIDwgbm9kZUJvdHRvbSlcclxuICAgIHtcclxuICAgICAgYm90dG9tID0gbm9kZUJvdHRvbTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhciBib3VuZGluZ1JlY3QgPSBuZXcgUmVjdGFuZ2xlRChsZWZ0LCB0b3AsIHJpZ2h0IC0gbGVmdCwgYm90dG9tIC0gdG9wKTtcclxuICBpZiAobGVmdCA9PSBJbnRlZ2VyLk1BWF9WQUxVRSlcclxuICB7XHJcbiAgICB0aGlzLmxlZnQgPSBNYXRoLmZsb29yKHRoaXMucGFyZW50LmdldExlZnQoKSk7XHJcbiAgICB0aGlzLnJpZ2h0ID0gTWF0aC5mbG9vcih0aGlzLnBhcmVudC5nZXRSaWdodCgpKTtcclxuICAgIHRoaXMudG9wID0gTWF0aC5mbG9vcih0aGlzLnBhcmVudC5nZXRUb3AoKSk7XHJcbiAgICB0aGlzLmJvdHRvbSA9IE1hdGguZmxvb3IodGhpcy5wYXJlbnQuZ2V0Qm90dG9tKCkpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5sZWZ0ID0gYm91bmRpbmdSZWN0LnggLSB0aGlzLm1hcmdpbjtcclxuICB0aGlzLnJpZ2h0ID0gYm91bmRpbmdSZWN0LnggKyBib3VuZGluZ1JlY3Qud2lkdGggKyB0aGlzLm1hcmdpbjtcclxuICB0aGlzLnRvcCA9IGJvdW5kaW5nUmVjdC55IC0gdGhpcy5tYXJnaW47XHJcbiAgdGhpcy5ib3R0b20gPSBib3VuZGluZ1JlY3QueSArIGJvdW5kaW5nUmVjdC5oZWlnaHQgKyB0aGlzLm1hcmdpbjtcclxufTtcclxuXHJcbkxHcmFwaC5jYWxjdWxhdGVCb3VuZHMgPSBmdW5jdGlvbiAobm9kZXMpXHJcbntcclxuICB2YXIgbGVmdCA9IEludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciByaWdodCA9IC1JbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgdG9wID0gSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIGJvdHRvbSA9IC1JbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgbm9kZUxlZnQ7XHJcbiAgdmFyIG5vZGVSaWdodDtcclxuICB2YXIgbm9kZVRvcDtcclxuICB2YXIgbm9kZUJvdHRvbTtcclxuXHJcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBsTm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgbm9kZUxlZnQgPSBNYXRoLmZsb29yKGxOb2RlLmdldExlZnQoKSk7XHJcbiAgICBub2RlUmlnaHQgPSBNYXRoLmZsb29yKGxOb2RlLmdldFJpZ2h0KCkpO1xyXG4gICAgbm9kZVRvcCA9IE1hdGguZmxvb3IobE5vZGUuZ2V0VG9wKCkpO1xyXG4gICAgbm9kZUJvdHRvbSA9IE1hdGguZmxvb3IobE5vZGUuZ2V0Qm90dG9tKCkpO1xyXG5cclxuICAgIGlmIChsZWZ0ID4gbm9kZUxlZnQpXHJcbiAgICB7XHJcbiAgICAgIGxlZnQgPSBub2RlTGVmdDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmlnaHQgPCBub2RlUmlnaHQpXHJcbiAgICB7XHJcbiAgICAgIHJpZ2h0ID0gbm9kZVJpZ2h0O1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0b3AgPiBub2RlVG9wKVxyXG4gICAge1xyXG4gICAgICB0b3AgPSBub2RlVG9wO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChib3R0b20gPCBub2RlQm90dG9tKVxyXG4gICAge1xyXG4gICAgICBib3R0b20gPSBub2RlQm90dG9tO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFyIGJvdW5kaW5nUmVjdCA9IG5ldyBSZWN0YW5nbGVEKGxlZnQsIHRvcCwgcmlnaHQgLSBsZWZ0LCBib3R0b20gLSB0b3ApO1xyXG5cclxuICByZXR1cm4gYm91bmRpbmdSZWN0O1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXRJbmNsdXNpb25UcmVlRGVwdGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgaWYgKHRoaXMgPT0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpKVxyXG4gIHtcclxuICAgIHJldHVybiAxO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgcmV0dXJuIHRoaXMucGFyZW50LmdldEluY2x1c2lvblRyZWVEZXB0aCgpO1xyXG4gIH1cclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0RXN0aW1hdGVkU2l6ZSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcy5lc3RpbWF0ZWRTaXplID09IEludGVnZXIuTUlOX1ZBTFVFKSB7XHJcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMuZXN0aW1hdGVkU2l6ZTtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuY2FsY0VzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIHNpemUgPSAwO1xyXG4gIHZhciBub2RlcyA9IHRoaXMubm9kZXM7XHJcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBsTm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgc2l6ZSArPSBsTm9kZS5jYWxjRXN0aW1hdGVkU2l6ZSgpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHNpemUgPT0gMClcclxuICB7XHJcbiAgICB0aGlzLmVzdGltYXRlZFNpemUgPSBMYXlvdXRDb25zdGFudHMuRU1QVFlfQ09NUE9VTkRfTk9ERV9TSVpFO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgdGhpcy5lc3RpbWF0ZWRTaXplID0gTWF0aC5mbG9vcihzaXplIC8gTWF0aC5zcXJ0KHRoaXMubm9kZXMubGVuZ3RoKSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gTWF0aC5mbG9vcih0aGlzLmVzdGltYXRlZFNpemUpO1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS51cGRhdGVDb25uZWN0ZWQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgaWYgKHRoaXMubm9kZXMubGVuZ3RoID09IDApXHJcbiAge1xyXG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHRydWU7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdG9CZVZpc2l0ZWQgPSBbXTtcclxuICB2YXIgdmlzaXRlZCA9IG5ldyBIYXNoU2V0KCk7XHJcbiAgdmFyIGN1cnJlbnROb2RlID0gdGhpcy5ub2Rlc1swXTtcclxuICB2YXIgbmVpZ2hib3JFZGdlcztcclxuICB2YXIgY3VycmVudE5laWdoYm9yO1xyXG4gIHRvQmVWaXNpdGVkID0gdG9CZVZpc2l0ZWQuY29uY2F0KGN1cnJlbnROb2RlLndpdGhDaGlsZHJlbigpKTtcclxuXHJcbiAgd2hpbGUgKHRvQmVWaXNpdGVkLmxlbmd0aCA+IDApXHJcbiAge1xyXG4gICAgY3VycmVudE5vZGUgPSB0b0JlVmlzaXRlZC5zaGlmdCgpO1xyXG4gICAgdmlzaXRlZC5hZGQoY3VycmVudE5vZGUpO1xyXG5cclxuICAgIC8vIFRyYXZlcnNlIGFsbCBuZWlnaGJvcnMgb2YgdGhpcyBub2RlXHJcbiAgICBuZWlnaGJvckVkZ2VzID0gY3VycmVudE5vZGUuZ2V0RWRnZXMoKTtcclxuICAgIHZhciBzID0gbmVpZ2hib3JFZGdlcy5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICAgIHtcclxuICAgICAgdmFyIG5laWdoYm9yRWRnZSA9IG5laWdoYm9yRWRnZXNbaV07XHJcbiAgICAgIGN1cnJlbnROZWlnaGJvciA9XHJcbiAgICAgICAgICAgICAgbmVpZ2hib3JFZGdlLmdldE90aGVyRW5kSW5HcmFwaChjdXJyZW50Tm9kZSwgdGhpcyk7XHJcblxyXG4gICAgICAvLyBBZGQgdW52aXNpdGVkIG5laWdoYm9ycyB0byB0aGUgbGlzdCB0byB2aXNpdFxyXG4gICAgICBpZiAoY3VycmVudE5laWdoYm9yICE9IG51bGwgJiZcclxuICAgICAgICAgICAgICAhdmlzaXRlZC5jb250YWlucyhjdXJyZW50TmVpZ2hib3IpKVxyXG4gICAgICB7XHJcbiAgICAgICAgdG9CZVZpc2l0ZWQgPSB0b0JlVmlzaXRlZC5jb25jYXQoY3VycmVudE5laWdoYm9yLndpdGhDaGlsZHJlbigpKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlO1xyXG5cclxuICBpZiAodmlzaXRlZC5zaXplKCkgPj0gdGhpcy5ub2Rlcy5sZW5ndGgpXHJcbiAge1xyXG4gICAgdmFyIG5vT2ZWaXNpdGVkSW5UaGlzR3JhcGggPSAwO1xyXG5cclxuICAgIHZhciBzID0gdmlzaXRlZC5zaXplKCk7XHJcbiAgICBmb3IgKHZhciB2aXNpdGVkSWQgaW4gdmlzaXRlZC5zZXQpXHJcbiAgICB7XHJcbiAgICAgIHZhciB2aXNpdGVkTm9kZSA9IHZpc2l0ZWQuc2V0W3Zpc2l0ZWRJZF07XHJcbiAgICAgIGlmICh2aXNpdGVkTm9kZS5vd25lciA9PSB0aGlzKVxyXG4gICAgICB7XHJcbiAgICAgICAgbm9PZlZpc2l0ZWRJblRoaXNHcmFwaCsrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG5vT2ZWaXNpdGVkSW5UaGlzR3JhcGggPT0gdGhpcy5ub2Rlcy5sZW5ndGgpXHJcbiAgICB7XHJcbiAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTEdyYXBoO1xyXG4iLCJmdW5jdGlvbiBMR3JhcGhNYW5hZ2VyKGxheW91dCkge1xyXG4gIHRoaXMubGF5b3V0ID0gbGF5b3V0O1xyXG5cclxuICB0aGlzLmdyYXBocyA9IFtdO1xyXG4gIHRoaXMuZWRnZXMgPSBbXTtcclxufVxyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuYWRkUm9vdCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgbmdyYXBoID0gdGhpcy5sYXlvdXQubmV3R3JhcGgoKTtcclxuICB2YXIgbm5vZGUgPSB0aGlzLmxheW91dC5uZXdOb2RlKG51bGwpO1xyXG4gIHZhciByb290ID0gdGhpcy5hZGQobmdyYXBoLCBubm9kZSk7XHJcbiAgdGhpcy5zZXRSb290R3JhcGgocm9vdCk7XHJcbiAgcmV0dXJuIHRoaXMucm9vdEdyYXBoO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG5ld0dyYXBoLCBwYXJlbnROb2RlLCBuZXdFZGdlLCBzb3VyY2VOb2RlLCB0YXJnZXROb2RlKVxyXG57XHJcbiAgLy90aGVyZSBhcmUganVzdCAyIHBhcmFtZXRlcnMgYXJlIHBhc3NlZCB0aGVuIGl0IGFkZHMgYW4gTEdyYXBoIGVsc2UgaXQgYWRkcyBhbiBMRWRnZVxyXG4gIGlmIChuZXdFZGdlID09IG51bGwgJiYgc291cmNlTm9kZSA9PSBudWxsICYmIHRhcmdldE5vZGUgPT0gbnVsbCkge1xyXG4gICAgaWYgKG5ld0dyYXBoID09IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJHcmFwaCBpcyBudWxsIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKHBhcmVudE5vZGUgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIlBhcmVudCBub2RlIGlzIG51bGwhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5ncmFwaHMuaW5kZXhPZihuZXdHcmFwaCkgPiAtMSkge1xyXG4gICAgICB0aHJvdyBcIkdyYXBoIGFscmVhZHkgaW4gdGhpcyBncmFwaCBtZ3IhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5ncmFwaHMucHVzaChuZXdHcmFwaCk7XHJcblxyXG4gICAgaWYgKG5ld0dyYXBoLnBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiQWxyZWFkeSBoYXMgYSBwYXJlbnQhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAocGFyZW50Tm9kZS5jaGlsZCAhPSBudWxsKSB7XHJcbiAgICAgIHRocm93ICBcIkFscmVhZHkgaGFzIGEgY2hpbGQhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgbmV3R3JhcGgucGFyZW50ID0gcGFyZW50Tm9kZTtcclxuICAgIHBhcmVudE5vZGUuY2hpbGQgPSBuZXdHcmFwaDtcclxuXHJcbiAgICByZXR1cm4gbmV3R3JhcGg7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgLy9jaGFuZ2UgdGhlIG9yZGVyIG9mIHRoZSBwYXJhbWV0ZXJzXHJcbiAgICB0YXJnZXROb2RlID0gbmV3RWRnZTtcclxuICAgIHNvdXJjZU5vZGUgPSBwYXJlbnROb2RlO1xyXG4gICAgbmV3RWRnZSA9IG5ld0dyYXBoO1xyXG4gICAgdmFyIHNvdXJjZUdyYXBoID0gc291cmNlTm9kZS5nZXRPd25lcigpO1xyXG4gICAgdmFyIHRhcmdldEdyYXBoID0gdGFyZ2V0Tm9kZS5nZXRPd25lcigpO1xyXG5cclxuICAgIGlmICghKHNvdXJjZUdyYXBoICE9IG51bGwgJiYgc291cmNlR3JhcGguZ2V0R3JhcGhNYW5hZ2VyKCkgPT0gdGhpcykpIHtcclxuICAgICAgdGhyb3cgXCJTb3VyY2Ugbm90IGluIHRoaXMgZ3JhcGggbWdyIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCEodGFyZ2V0R3JhcGggIT0gbnVsbCAmJiB0YXJnZXRHcmFwaC5nZXRHcmFwaE1hbmFnZXIoKSA9PSB0aGlzKSkge1xyXG4gICAgICB0aHJvdyBcIlRhcmdldCBub3QgaW4gdGhpcyBncmFwaCBtZ3IhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHNvdXJjZUdyYXBoID09IHRhcmdldEdyYXBoKVxyXG4gICAge1xyXG4gICAgICBuZXdFZGdlLmlzSW50ZXJHcmFwaCA9IGZhbHNlO1xyXG4gICAgICByZXR1cm4gc291cmNlR3JhcGguYWRkKG5ld0VkZ2UsIHNvdXJjZU5vZGUsIHRhcmdldE5vZGUpO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICBuZXdFZGdlLmlzSW50ZXJHcmFwaCA9IHRydWU7XHJcblxyXG4gICAgICAvLyBzZXQgc291cmNlIGFuZCB0YXJnZXRcclxuICAgICAgbmV3RWRnZS5zb3VyY2UgPSBzb3VyY2VOb2RlO1xyXG4gICAgICBuZXdFZGdlLnRhcmdldCA9IHRhcmdldE5vZGU7XHJcblxyXG4gICAgICAvLyBhZGQgZWRnZSB0byBpbnRlci1ncmFwaCBlZGdlIGxpc3RcclxuICAgICAgaWYgKHRoaXMuZWRnZXMuaW5kZXhPZihuZXdFZGdlKSA+IC0xKSB7XHJcbiAgICAgICAgdGhyb3cgXCJFZGdlIGFscmVhZHkgaW4gaW50ZXItZ3JhcGggZWRnZSBsaXN0IVwiO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmVkZ2VzLnB1c2gobmV3RWRnZSk7XHJcblxyXG4gICAgICAvLyBhZGQgZWRnZSB0byBzb3VyY2UgYW5kIHRhcmdldCBpbmNpZGVuY3kgbGlzdHNcclxuICAgICAgaWYgKCEobmV3RWRnZS5zb3VyY2UgIT0gbnVsbCAmJiBuZXdFZGdlLnRhcmdldCAhPSBudWxsKSkge1xyXG4gICAgICAgIHRocm93IFwiRWRnZSBzb3VyY2UgYW5kL29yIHRhcmdldCBpcyBudWxsIVwiO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoIShuZXdFZGdlLnNvdXJjZS5lZGdlcy5pbmRleE9mKG5ld0VkZ2UpID09IC0xICYmIG5ld0VkZ2UudGFyZ2V0LmVkZ2VzLmluZGV4T2YobmV3RWRnZSkgPT0gLTEpKSB7XHJcbiAgICAgICAgdGhyb3cgXCJFZGdlIGFscmVhZHkgaW4gc291cmNlIGFuZC9vciB0YXJnZXQgaW5jaWRlbmN5IGxpc3QhXCI7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIG5ld0VkZ2Uuc291cmNlLmVkZ2VzLnB1c2gobmV3RWRnZSk7XHJcbiAgICAgIG5ld0VkZ2UudGFyZ2V0LmVkZ2VzLnB1c2gobmV3RWRnZSk7XHJcblxyXG4gICAgICByZXR1cm4gbmV3RWRnZTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAobE9iaikge1xyXG4gIGlmIChsT2JqIGluc3RhbmNlb2YgTEdyYXBoKSB7XHJcbiAgICB2YXIgZ3JhcGggPSBsT2JqO1xyXG4gICAgaWYgKGdyYXBoLmdldEdyYXBoTWFuYWdlcigpICE9IHRoaXMpIHtcclxuICAgICAgdGhyb3cgXCJHcmFwaCBub3QgaW4gdGhpcyBncmFwaCBtZ3JcIjtcclxuICAgIH1cclxuICAgIGlmICghKGdyYXBoID09IHRoaXMucm9vdEdyYXBoIHx8IChncmFwaC5wYXJlbnQgIT0gbnVsbCAmJiBncmFwaC5wYXJlbnQuZ3JhcGhNYW5hZ2VyID09IHRoaXMpKSkge1xyXG4gICAgICB0aHJvdyBcIkludmFsaWQgcGFyZW50IG5vZGUhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZmlyc3QgdGhlIGVkZ2VzIChtYWtlIGEgY29weSB0byBkbyBpdCBzYWZlbHkpXHJcbiAgICB2YXIgZWRnZXNUb0JlUmVtb3ZlZCA9IFtdO1xyXG5cclxuICAgIGVkZ2VzVG9CZVJlbW92ZWQgPSBlZGdlc1RvQmVSZW1vdmVkLmNvbmNhdChncmFwaC5nZXRFZGdlcygpKTtcclxuXHJcbiAgICB2YXIgZWRnZTtcclxuICAgIHZhciBzID0gZWRnZXNUb0JlUmVtb3ZlZC5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICAgIHtcclxuICAgICAgZWRnZSA9IGVkZ2VzVG9CZVJlbW92ZWRbaV07XHJcbiAgICAgIGdyYXBoLnJlbW92ZShlZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyB0aGVuIHRoZSBub2RlcyAobWFrZSBhIGNvcHkgdG8gZG8gaXQgc2FmZWx5KVxyXG4gICAgdmFyIG5vZGVzVG9CZVJlbW92ZWQgPSBbXTtcclxuXHJcbiAgICBub2Rlc1RvQmVSZW1vdmVkID0gbm9kZXNUb0JlUmVtb3ZlZC5jb25jYXQoZ3JhcGguZ2V0Tm9kZXMoKSk7XHJcblxyXG4gICAgdmFyIG5vZGU7XHJcbiAgICBzID0gbm9kZXNUb0JlUmVtb3ZlZC5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICAgIHtcclxuICAgICAgbm9kZSA9IG5vZGVzVG9CZVJlbW92ZWRbaV07XHJcbiAgICAgIGdyYXBoLnJlbW92ZShub2RlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBjaGVjayBpZiBncmFwaCBpcyB0aGUgcm9vdFxyXG4gICAgaWYgKGdyYXBoID09IHRoaXMucm9vdEdyYXBoKVxyXG4gICAge1xyXG4gICAgICB0aGlzLnNldFJvb3RHcmFwaChudWxsKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBub3cgcmVtb3ZlIHRoZSBncmFwaCBpdHNlbGZcclxuICAgIHZhciBpbmRleCA9IHRoaXMuZ3JhcGhzLmluZGV4T2YoZ3JhcGgpO1xyXG4gICAgdGhpcy5ncmFwaHMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHJcbiAgICAvLyBhbHNvIHJlc2V0IHRoZSBwYXJlbnQgb2YgdGhlIGdyYXBoXHJcbiAgICBncmFwaC5wYXJlbnQgPSBudWxsO1xyXG4gIH1cclxuICBlbHNlIGlmIChsT2JqIGluc3RhbmNlb2YgTEVkZ2UpIHtcclxuICAgIGVkZ2UgPSBsT2JqO1xyXG4gICAgaWYgKGVkZ2UgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIkVkZ2UgaXMgbnVsbCFcIjtcclxuICAgIH1cclxuICAgIGlmICghZWRnZS5pc0ludGVyR3JhcGgpIHtcclxuICAgICAgdGhyb3cgXCJOb3QgYW4gaW50ZXItZ3JhcGggZWRnZSFcIjtcclxuICAgIH1cclxuICAgIGlmICghKGVkZ2Uuc291cmNlICE9IG51bGwgJiYgZWRnZS50YXJnZXQgIT0gbnVsbCkpIHtcclxuICAgICAgdGhyb3cgXCJTb3VyY2UgYW5kL29yIHRhcmdldCBpcyBudWxsIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHJlbW92ZSBlZGdlIGZyb20gc291cmNlIGFuZCB0YXJnZXQgbm9kZXMnIGluY2lkZW5jeSBsaXN0c1xyXG5cclxuICAgIGlmICghKGVkZ2Uuc291cmNlLmVkZ2VzLmluZGV4T2YoZWRnZSkgIT0gLTEgJiYgZWRnZS50YXJnZXQuZWRnZXMuaW5kZXhPZihlZGdlKSAhPSAtMSkpIHtcclxuICAgICAgdGhyb3cgXCJTb3VyY2UgYW5kL29yIHRhcmdldCBkb2Vzbid0IGtub3cgdGhpcyBlZGdlIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBpbmRleCA9IGVkZ2Uuc291cmNlLmVkZ2VzLmluZGV4T2YoZWRnZSk7XHJcbiAgICBlZGdlLnNvdXJjZS5lZGdlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgaW5kZXggPSBlZGdlLnRhcmdldC5lZGdlcy5pbmRleE9mKGVkZ2UpO1xyXG4gICAgZWRnZS50YXJnZXQuZWRnZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHJcbiAgICAvLyByZW1vdmUgZWRnZSBmcm9tIG93bmVyIGdyYXBoIG1hbmFnZXIncyBpbnRlci1ncmFwaCBlZGdlIGxpc3RcclxuXHJcbiAgICBpZiAoIShlZGdlLnNvdXJjZS5vd25lciAhPSBudWxsICYmIGVkZ2Uuc291cmNlLm93bmVyLmdldEdyYXBoTWFuYWdlcigpICE9IG51bGwpKSB7XHJcbiAgICAgIHRocm93IFwiRWRnZSBvd25lciBncmFwaCBvciBvd25lciBncmFwaCBtYW5hZ2VyIGlzIG51bGwhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAoZWRnZS5zb3VyY2Uub3duZXIuZ2V0R3JhcGhNYW5hZ2VyKCkuZWRnZXMuaW5kZXhPZihlZGdlKSA9PSAtMSkge1xyXG4gICAgICB0aHJvdyBcIk5vdCBpbiBvd25lciBncmFwaCBtYW5hZ2VyJ3MgZWRnZSBsaXN0IVwiO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBpbmRleCA9IGVkZ2Uuc291cmNlLm93bmVyLmdldEdyYXBoTWFuYWdlcigpLmVkZ2VzLmluZGV4T2YoZWRnZSk7XHJcbiAgICBlZGdlLnNvdXJjZS5vd25lci5nZXRHcmFwaE1hbmFnZXIoKS5lZGdlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gIH1cclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnVwZGF0ZUJvdW5kcyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB0aGlzLnJvb3RHcmFwaC51cGRhdGVCb3VuZHModHJ1ZSk7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5nZXRHcmFwaHMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuZ3JhcGhzO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuZ2V0QWxsTm9kZXMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgaWYgKHRoaXMuYWxsTm9kZXMgPT0gbnVsbClcclxuICB7XHJcbiAgICB2YXIgbm9kZUxpc3QgPSBbXTtcclxuICAgIHZhciBncmFwaHMgPSB0aGlzLmdldEdyYXBocygpO1xyXG4gICAgdmFyIHMgPSBncmFwaHMubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIG5vZGVMaXN0ID0gbm9kZUxpc3QuY29uY2F0KGdyYXBoc1tpXS5nZXROb2RlcygpKTtcclxuICAgIH1cclxuICAgIHRoaXMuYWxsTm9kZXMgPSBub2RlTGlzdDtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMuYWxsTm9kZXM7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5yZXNldEFsbE5vZGVzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHRoaXMuYWxsTm9kZXMgPSBudWxsO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUucmVzZXRBbGxFZGdlcyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB0aGlzLmFsbEVkZ2VzID0gbnVsbDtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlc2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdGhpcy5hbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IG51bGw7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5nZXRBbGxFZGdlcyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcy5hbGxFZGdlcyA9PSBudWxsKVxyXG4gIHtcclxuICAgIHZhciBlZGdlTGlzdCA9IFtdO1xyXG4gICAgdmFyIGdyYXBocyA9IHRoaXMuZ2V0R3JhcGhzKCk7XHJcbiAgICB2YXIgcyA9IGdyYXBocy5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdyYXBocy5sZW5ndGg7IGkrKylcclxuICAgIHtcclxuICAgICAgZWRnZUxpc3QgPSBlZGdlTGlzdC5jb25jYXQoZ3JhcGhzW2ldLmdldEVkZ2VzKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGVkZ2VMaXN0ID0gZWRnZUxpc3QuY29uY2F0KHRoaXMuZWRnZXMpO1xyXG5cclxuICAgIHRoaXMuYWxsRWRnZXMgPSBlZGdlTGlzdDtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMuYWxsRWRnZXM7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5nZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5hbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbjtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnNldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uID0gZnVuY3Rpb24gKG5vZGVMaXN0KVxyXG57XHJcbiAgaWYgKHRoaXMuYWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gIT0gbnVsbCkge1xyXG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgfVxyXG5cclxuICB0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uID0gbm9kZUxpc3Q7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5nZXRSb290ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJvb3RHcmFwaDtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnNldFJvb3RHcmFwaCA9IGZ1bmN0aW9uIChncmFwaClcclxue1xyXG4gIGlmIChncmFwaC5nZXRHcmFwaE1hbmFnZXIoKSAhPSB0aGlzKSB7XHJcbiAgICB0aHJvdyBcIlJvb3Qgbm90IGluIHRoaXMgZ3JhcGggbWdyIVwiO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5yb290R3JhcGggPSBncmFwaDtcclxuICAvLyByb290IGdyYXBoIG11c3QgaGF2ZSBhIHJvb3Qgbm9kZSBhc3NvY2lhdGVkIHdpdGggaXQgZm9yIGNvbnZlbmllbmNlXHJcbiAgaWYgKGdyYXBoLnBhcmVudCA9PSBudWxsKVxyXG4gIHtcclxuICAgIGdyYXBoLnBhcmVudCA9IHRoaXMubGF5b3V0Lm5ld05vZGUoXCJSb290IG5vZGVcIik7XHJcbiAgfVxyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuZ2V0TGF5b3V0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmxheW91dDtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmlzT25lQW5jZXN0b3JPZk90aGVyID0gZnVuY3Rpb24gKGZpcnN0Tm9kZSwgc2Vjb25kTm9kZSlcclxue1xyXG4gIGlmICghKGZpcnN0Tm9kZSAhPSBudWxsICYmIHNlY29uZE5vZGUgIT0gbnVsbCkpIHtcclxuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gIH1cclxuXHJcbiAgaWYgKGZpcnN0Tm9kZSA9PSBzZWNvbmROb2RlKVxyXG4gIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICAvLyBJcyBzZWNvbmQgbm9kZSBhbiBhbmNlc3RvciBvZiB0aGUgZmlyc3Qgb25lP1xyXG4gIHZhciBvd25lckdyYXBoID0gZmlyc3ROb2RlLmdldE93bmVyKCk7XHJcbiAgdmFyIHBhcmVudE5vZGU7XHJcblxyXG4gIGRvXHJcbiAge1xyXG4gICAgcGFyZW50Tm9kZSA9IG93bmVyR3JhcGguZ2V0UGFyZW50KCk7XHJcblxyXG4gICAgaWYgKHBhcmVudE5vZGUgPT0gbnVsbClcclxuICAgIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHBhcmVudE5vZGUgPT0gc2Vjb25kTm9kZSlcclxuICAgIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgb3duZXJHcmFwaCA9IHBhcmVudE5vZGUuZ2V0T3duZXIoKTtcclxuICAgIGlmIChvd25lckdyYXBoID09IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH0gd2hpbGUgKHRydWUpO1xyXG4gIC8vIElzIGZpcnN0IG5vZGUgYW4gYW5jZXN0b3Igb2YgdGhlIHNlY29uZCBvbmU/XHJcbiAgb3duZXJHcmFwaCA9IHNlY29uZE5vZGUuZ2V0T3duZXIoKTtcclxuXHJcbiAgZG9cclxuICB7XHJcbiAgICBwYXJlbnROb2RlID0gb3duZXJHcmFwaC5nZXRQYXJlbnQoKTtcclxuXHJcbiAgICBpZiAocGFyZW50Tm9kZSA9PSBudWxsKVxyXG4gICAge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICBpZiAocGFyZW50Tm9kZSA9PSBmaXJzdE5vZGUpXHJcbiAgICB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIG93bmVyR3JhcGggPSBwYXJlbnROb2RlLmdldE93bmVyKCk7XHJcbiAgICBpZiAob3duZXJHcmFwaCA9PSBudWxsKVxyXG4gICAge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9IHdoaWxlICh0cnVlKTtcclxuXHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuY2FsY0xvd2VzdENvbW1vbkFuY2VzdG9ycyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgZWRnZTtcclxuICB2YXIgc291cmNlTm9kZTtcclxuICB2YXIgdGFyZ2V0Tm9kZTtcclxuICB2YXIgc291cmNlQW5jZXN0b3JHcmFwaDtcclxuICB2YXIgdGFyZ2V0QW5jZXN0b3JHcmFwaDtcclxuXHJcbiAgdmFyIGVkZ2VzID0gdGhpcy5nZXRBbGxFZGdlcygpO1xyXG4gIHZhciBzID0gZWRnZXMubGVuZ3RoO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIGVkZ2UgPSBlZGdlc1tpXTtcclxuXHJcbiAgICBzb3VyY2VOb2RlID0gZWRnZS5zb3VyY2U7XHJcbiAgICB0YXJnZXROb2RlID0gZWRnZS50YXJnZXQ7XHJcbiAgICBlZGdlLmxjYSA9IG51bGw7XHJcbiAgICBlZGdlLnNvdXJjZUluTGNhID0gc291cmNlTm9kZTtcclxuICAgIGVkZ2UudGFyZ2V0SW5MY2EgPSB0YXJnZXROb2RlO1xyXG5cclxuICAgIGlmIChzb3VyY2VOb2RlID09IHRhcmdldE5vZGUpXHJcbiAgICB7XHJcbiAgICAgIGVkZ2UubGNhID0gc291cmNlTm9kZS5nZXRPd25lcigpO1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuXHJcbiAgICBzb3VyY2VBbmNlc3RvckdyYXBoID0gc291cmNlTm9kZS5nZXRPd25lcigpO1xyXG5cclxuICAgIHdoaWxlIChlZGdlLmxjYSA9PSBudWxsKVxyXG4gICAge1xyXG4gICAgICB0YXJnZXRBbmNlc3RvckdyYXBoID0gdGFyZ2V0Tm9kZS5nZXRPd25lcigpO1xyXG5cclxuICAgICAgd2hpbGUgKGVkZ2UubGNhID09IG51bGwpXHJcbiAgICAgIHtcclxuICAgICAgICBpZiAodGFyZ2V0QW5jZXN0b3JHcmFwaCA9PSBzb3VyY2VBbmNlc3RvckdyYXBoKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGVkZ2UubGNhID0gdGFyZ2V0QW5jZXN0b3JHcmFwaDtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRhcmdldEFuY2VzdG9yR3JhcGggPT0gdGhpcy5yb290R3JhcGgpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZWRnZS5sY2EgIT0gbnVsbCkge1xyXG4gICAgICAgICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVkZ2UudGFyZ2V0SW5MY2EgPSB0YXJnZXRBbmNlc3RvckdyYXBoLmdldFBhcmVudCgpO1xyXG4gICAgICAgIHRhcmdldEFuY2VzdG9yR3JhcGggPSBlZGdlLnRhcmdldEluTGNhLmdldE93bmVyKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzb3VyY2VBbmNlc3RvckdyYXBoID09IHRoaXMucm9vdEdyYXBoKVxyXG4gICAgICB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChlZGdlLmxjYSA9PSBudWxsKVxyXG4gICAgICB7XHJcbiAgICAgICAgZWRnZS5zb3VyY2VJbkxjYSA9IHNvdXJjZUFuY2VzdG9yR3JhcGguZ2V0UGFyZW50KCk7XHJcbiAgICAgICAgc291cmNlQW5jZXN0b3JHcmFwaCA9IGVkZ2Uuc291cmNlSW5MY2EuZ2V0T3duZXIoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChlZGdlLmxjYSA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmNhbGNMb3dlc3RDb21tb25BbmNlc3RvciA9IGZ1bmN0aW9uIChmaXJzdE5vZGUsIHNlY29uZE5vZGUpXHJcbntcclxuICBpZiAoZmlyc3ROb2RlID09IHNlY29uZE5vZGUpXHJcbiAge1xyXG4gICAgcmV0dXJuIGZpcnN0Tm9kZS5nZXRPd25lcigpO1xyXG4gIH1cclxuICB2YXIgZmlyc3RPd25lckdyYXBoID0gZmlyc3ROb2RlLmdldE93bmVyKCk7XHJcblxyXG4gIGRvXHJcbiAge1xyXG4gICAgaWYgKGZpcnN0T3duZXJHcmFwaCA9PSBudWxsKVxyXG4gICAge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICAgIHZhciBzZWNvbmRPd25lckdyYXBoID0gc2Vjb25kTm9kZS5nZXRPd25lcigpO1xyXG5cclxuICAgIGRvXHJcbiAgICB7XHJcbiAgICAgIGlmIChzZWNvbmRPd25lckdyYXBoID09IG51bGwpXHJcbiAgICAgIHtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHNlY29uZE93bmVyR3JhcGggPT0gZmlyc3RPd25lckdyYXBoKVxyXG4gICAgICB7XHJcbiAgICAgICAgcmV0dXJuIHNlY29uZE93bmVyR3JhcGg7XHJcbiAgICAgIH1cclxuICAgICAgc2Vjb25kT3duZXJHcmFwaCA9IHNlY29uZE93bmVyR3JhcGguZ2V0UGFyZW50KCkuZ2V0T3duZXIoKTtcclxuICAgIH0gd2hpbGUgKHRydWUpO1xyXG5cclxuICAgIGZpcnN0T3duZXJHcmFwaCA9IGZpcnN0T3duZXJHcmFwaC5nZXRQYXJlbnQoKS5nZXRPd25lcigpO1xyXG4gIH0gd2hpbGUgKHRydWUpO1xyXG5cclxuICByZXR1cm4gZmlyc3RPd25lckdyYXBoO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuY2FsY0luY2x1c2lvblRyZWVEZXB0aHMgPSBmdW5jdGlvbiAoZ3JhcGgsIGRlcHRoKSB7XHJcbiAgaWYgKGdyYXBoID09IG51bGwgJiYgZGVwdGggPT0gbnVsbCkge1xyXG4gICAgZ3JhcGggPSB0aGlzLnJvb3RHcmFwaDtcclxuICAgIGRlcHRoID0gMTtcclxuICB9XHJcbiAgdmFyIG5vZGU7XHJcblxyXG4gIHZhciBub2RlcyA9IGdyYXBoLmdldE5vZGVzKCk7XHJcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAge1xyXG4gICAgbm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgbm9kZS5pbmNsdXNpb25UcmVlRGVwdGggPSBkZXB0aDtcclxuXHJcbiAgICBpZiAobm9kZS5jaGlsZCAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICB0aGlzLmNhbGNJbmNsdXNpb25UcmVlRGVwdGhzKG5vZGUuY2hpbGQsIGRlcHRoICsgMSk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuaW5jbHVkZXNJbnZhbGlkRWRnZSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgZWRnZTtcclxuXHJcbiAgdmFyIHMgPSB0aGlzLmVkZ2VzLmxlbmd0aDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICB7XHJcbiAgICBlZGdlID0gdGhpcy5lZGdlc1tpXTtcclxuXHJcbiAgICBpZiAodGhpcy5pc09uZUFuY2VzdG9yT2ZPdGhlcihlZGdlLnNvdXJjZSwgZWRnZS50YXJnZXQpKVxyXG4gICAge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMR3JhcGhNYW5hZ2VyO1xyXG4iLCJmdW5jdGlvbiBMR3JhcGhPYmplY3QodkdyYXBoT2JqZWN0KSB7XHJcbiAgdGhpcy52R3JhcGhPYmplY3QgPSB2R3JhcGhPYmplY3Q7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTEdyYXBoT2JqZWN0O1xyXG4iLCJ2YXIgTEdyYXBoT2JqZWN0ID0gcmVxdWlyZSgnLi9MR3JhcGhPYmplY3QnKTtcclxudmFyIEludGVnZXIgPSByZXF1aXJlKCcuL0ludGVnZXInKTtcclxudmFyIFJlY3RhbmdsZUQgPSByZXF1aXJlKCcuL1JlY3RhbmdsZUQnKTtcclxuXHJcbmZ1bmN0aW9uIExOb2RlKGdtLCBsb2MsIHNpemUsIHZOb2RlKSB7XHJcbiAgLy9BbHRlcm5hdGl2ZSBjb25zdHJ1Y3RvciAxIDogTE5vZGUoTEdyYXBoTWFuYWdlciBnbSwgUG9pbnQgbG9jLCBEaW1lbnNpb24gc2l6ZSwgT2JqZWN0IHZOb2RlKVxyXG4gIGlmIChzaXplID09IG51bGwgJiYgdk5vZGUgPT0gbnVsbCkge1xyXG4gICAgdk5vZGUgPSBsb2M7XHJcbiAgfVxyXG5cclxuICBMR3JhcGhPYmplY3QuY2FsbCh0aGlzLCB2Tm9kZSk7XHJcblxyXG4gIC8vQWx0ZXJuYXRpdmUgY29uc3RydWN0b3IgMiA6IExOb2RlKExheW91dCBsYXlvdXQsIE9iamVjdCB2Tm9kZSlcclxuICBpZiAoZ20uZ3JhcGhNYW5hZ2VyICE9IG51bGwpXHJcbiAgICBnbSA9IGdtLmdyYXBoTWFuYWdlcjtcclxuXHJcbiAgdGhpcy5lc3RpbWF0ZWRTaXplID0gSW50ZWdlci5NSU5fVkFMVUU7XHJcbiAgdGhpcy5pbmNsdXNpb25UcmVlRGVwdGggPSBJbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB0aGlzLnZHcmFwaE9iamVjdCA9IHZOb2RlO1xyXG4gIHRoaXMuZWRnZXMgPSBbXTtcclxuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xyXG5cclxuICBpZiAoc2l6ZSAhPSBudWxsICYmIGxvYyAhPSBudWxsKVxyXG4gICAgdGhpcy5yZWN0ID0gbmV3IFJlY3RhbmdsZUQobG9jLngsIGxvYy55LCBzaXplLndpZHRoLCBzaXplLmhlaWdodCk7XHJcbiAgZWxzZVxyXG4gICAgdGhpcy5yZWN0ID0gbmV3IFJlY3RhbmdsZUQoKTtcclxufVxyXG5cclxuTE5vZGUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGhPYmplY3QucHJvdG90eXBlKTtcclxuZm9yICh2YXIgcHJvcCBpbiBMR3JhcGhPYmplY3QpIHtcclxuICBMTm9kZVtwcm9wXSA9IExHcmFwaE9iamVjdFtwcm9wXTtcclxufVxyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldEVkZ2VzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmVkZ2VzO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldENoaWxkID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmNoaWxkO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldE93bmVyID0gZnVuY3Rpb24gKClcclxue1xyXG4gIGlmICh0aGlzLm93bmVyICE9IG51bGwpIHtcclxuICAgIGlmICghKHRoaXMub3duZXIgPT0gbnVsbCB8fCB0aGlzLm93bmVyLmdldE5vZGVzKCkuaW5kZXhPZih0aGlzKSA+IC0xKSkge1xyXG4gICAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzLm93bmVyO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldFdpZHRoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3Qud2lkdGg7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuc2V0V2lkdGggPSBmdW5jdGlvbiAod2lkdGgpXHJcbntcclxuICB0aGlzLnJlY3Qud2lkdGggPSB3aWR0aDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRIZWlnaHQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC5oZWlnaHQ7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuc2V0SGVpZ2h0ID0gZnVuY3Rpb24gKGhlaWdodClcclxue1xyXG4gIHRoaXMucmVjdC5oZWlnaHQgPSBoZWlnaHQ7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0Q2VudGVyWCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0LnggKyB0aGlzLnJlY3Qud2lkdGggLyAyO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldENlbnRlclkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC55ICsgdGhpcy5yZWN0LmhlaWdodCAvIDI7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0Q2VudGVyID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBuZXcgUG9pbnREKHRoaXMucmVjdC54ICsgdGhpcy5yZWN0LndpZHRoIC8gMixcclxuICAgICAgICAgIHRoaXMucmVjdC55ICsgdGhpcy5yZWN0LmhlaWdodCAvIDIpO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldExvY2F0aW9uID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBuZXcgUG9pbnREKHRoaXMucmVjdC54LCB0aGlzLnJlY3QueSk7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0UmVjdCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldERpYWdvbmFsID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBNYXRoLnNxcnQodGhpcy5yZWN0LndpZHRoICogdGhpcy5yZWN0LndpZHRoICtcclxuICAgICAgICAgIHRoaXMucmVjdC5oZWlnaHQgKiB0aGlzLnJlY3QuaGVpZ2h0KTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5zZXRSZWN0ID0gZnVuY3Rpb24gKHVwcGVyTGVmdCwgZGltZW5zaW9uKVxyXG57XHJcbiAgdGhpcy5yZWN0LnggPSB1cHBlckxlZnQueDtcclxuICB0aGlzLnJlY3QueSA9IHVwcGVyTGVmdC55O1xyXG4gIHRoaXMucmVjdC53aWR0aCA9IGRpbWVuc2lvbi53aWR0aDtcclxuICB0aGlzLnJlY3QuaGVpZ2h0ID0gZGltZW5zaW9uLmhlaWdodDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5zZXRDZW50ZXIgPSBmdW5jdGlvbiAoY3gsIGN5KVxyXG57XHJcbiAgdGhpcy5yZWN0LnggPSBjeCAtIHRoaXMucmVjdC53aWR0aCAvIDI7XHJcbiAgdGhpcy5yZWN0LnkgPSBjeSAtIHRoaXMucmVjdC5oZWlnaHQgLyAyO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnNldExvY2F0aW9uID0gZnVuY3Rpb24gKHgsIHkpXHJcbntcclxuICB0aGlzLnJlY3QueCA9IHg7XHJcbiAgdGhpcy5yZWN0LnkgPSB5O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLm1vdmVCeSA9IGZ1bmN0aW9uIChkeCwgZHkpXHJcbntcclxuICB0aGlzLnJlY3QueCArPSBkeDtcclxuICB0aGlzLnJlY3QueSArPSBkeTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRFZGdlTGlzdFRvTm9kZSA9IGZ1bmN0aW9uICh0bylcclxue1xyXG4gIHZhciBlZGdlTGlzdCA9IFtdO1xyXG4gIHZhciBlZGdlO1xyXG5cclxuICBmb3IgKHZhciBvYmogaW4gdGhpcy5lZGdlcylcclxuICB7XHJcbiAgICBlZGdlID0gb2JqO1xyXG5cclxuICAgIGlmIChlZGdlLnRhcmdldCA9PSB0bylcclxuICAgIHtcclxuICAgICAgaWYgKGVkZ2Uuc291cmNlICE9IHRoaXMpXHJcbiAgICAgICAgdGhyb3cgXCJJbmNvcnJlY3QgZWRnZSBzb3VyY2UhXCI7XHJcblxyXG4gICAgICBlZGdlTGlzdC5wdXNoKGVkZ2UpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGVkZ2VMaXN0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldEVkZ2VzQmV0d2VlbiA9IGZ1bmN0aW9uIChvdGhlcilcclxue1xyXG4gIHZhciBlZGdlTGlzdCA9IFtdO1xyXG4gIHZhciBlZGdlO1xyXG5cclxuICBmb3IgKHZhciBvYmogaW4gdGhpcy5lZGdlcylcclxuICB7XHJcbiAgICBlZGdlID0gdGhpcy5lZGdlc1tvYmpdO1xyXG5cclxuICAgIGlmICghKGVkZ2Uuc291cmNlID09IHRoaXMgfHwgZWRnZS50YXJnZXQgPT0gdGhpcykpXHJcbiAgICAgIHRocm93IFwiSW5jb3JyZWN0IGVkZ2Ugc291cmNlIGFuZC9vciB0YXJnZXRcIjtcclxuXHJcbiAgICBpZiAoKGVkZ2UudGFyZ2V0ID09IG90aGVyKSB8fCAoZWRnZS5zb3VyY2UgPT0gb3RoZXIpKVxyXG4gICAge1xyXG4gICAgICBlZGdlTGlzdC5wdXNoKGVkZ2UpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGVkZ2VMaXN0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldE5laWdoYm9yc0xpc3QgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIG5laWdoYm9ycyA9IG5ldyBIYXNoU2V0KCk7XHJcbiAgdmFyIGVkZ2U7XHJcblxyXG4gIGZvciAodmFyIG9iaiBpbiB0aGlzLmVkZ2VzKVxyXG4gIHtcclxuICAgIGVkZ2UgPSB0aGlzLmVkZ2VzW29ial07XHJcblxyXG4gICAgaWYgKGVkZ2Uuc291cmNlID09IHRoaXMpXHJcbiAgICB7XHJcbiAgICAgIG5laWdoYm9ycy5hZGQoZWRnZS50YXJnZXQpO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICBpZiAoIWVkZ2UudGFyZ2V0ID09IHRoaXMpXHJcbiAgICAgICAgdGhyb3cgXCJJbmNvcnJlY3QgaW5jaWRlbmN5IVwiO1xyXG4gICAgICBuZWlnaGJvcnMuYWRkKGVkZ2Uuc291cmNlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBuZWlnaGJvcnM7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUud2l0aENoaWxkcmVuID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciB3aXRoTmVpZ2hib3JzTGlzdCA9IFtdO1xyXG4gIHZhciBjaGlsZE5vZGU7XHJcblxyXG4gIHdpdGhOZWlnaGJvcnNMaXN0LnB1c2godGhpcyk7XHJcblxyXG4gIGlmICh0aGlzLmNoaWxkICE9IG51bGwpXHJcbiAge1xyXG4gICAgdmFyIG5vZGVzID0gdGhpcy5jaGlsZC5nZXROb2RlcygpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcclxuICAgIHtcclxuICAgICAgY2hpbGROb2RlID0gbm9kZXNbaV07XHJcblxyXG4gICAgICB3aXRoTmVpZ2hib3JzTGlzdCA9IHdpdGhOZWlnaGJvcnNMaXN0LmNvbmNhdChjaGlsZE5vZGUud2l0aENoaWxkcmVuKCkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHdpdGhOZWlnaGJvcnNMaXN0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldEVzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKHRoaXMuZXN0aW1hdGVkU2l6ZSA9PSBJbnRlZ2VyLk1JTl9WQUxVRSkge1xyXG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgfVxyXG4gIHJldHVybiB0aGlzLmVzdGltYXRlZFNpemU7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuY2FsY0VzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKHRoaXMuY2hpbGQgPT0gbnVsbClcclxuICB7XHJcbiAgICByZXR1cm4gdGhpcy5lc3RpbWF0ZWRTaXplID0gTWF0aC5mbG9vcigodGhpcy5yZWN0LndpZHRoICsgdGhpcy5yZWN0LmhlaWdodCkgLyAyKTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IHRoaXMuY2hpbGQuY2FsY0VzdGltYXRlZFNpemUoKTtcclxuICAgIHRoaXMucmVjdC53aWR0aCA9IHRoaXMuZXN0aW1hdGVkU2l6ZTtcclxuICAgIHRoaXMucmVjdC5oZWlnaHQgPSB0aGlzLmVzdGltYXRlZFNpemU7XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuZXN0aW1hdGVkU2l6ZTtcclxuICB9XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuc2NhdHRlciA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgcmFuZG9tQ2VudGVyWDtcclxuICB2YXIgcmFuZG9tQ2VudGVyWTtcclxuXHJcbiAgdmFyIG1pblggPSAtTGF5b3V0Q29uc3RhbnRzLklOSVRJQUxfV09STERfQk9VTkRBUlk7XHJcbiAgdmFyIG1heFggPSBMYXlvdXRDb25zdGFudHMuSU5JVElBTF9XT1JMRF9CT1VOREFSWTtcclxuICByYW5kb21DZW50ZXJYID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9YICtcclxuICAgICAgICAgIChSYW5kb21TZWVkLm5leHREb3VibGUoKSAqIChtYXhYIC0gbWluWCkpICsgbWluWDtcclxuXHJcbiAgdmFyIG1pblkgPSAtTGF5b3V0Q29uc3RhbnRzLklOSVRJQUxfV09STERfQk9VTkRBUlk7XHJcbiAgdmFyIG1heFkgPSBMYXlvdXRDb25zdGFudHMuSU5JVElBTF9XT1JMRF9CT1VOREFSWTtcclxuICByYW5kb21DZW50ZXJZID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9ZICtcclxuICAgICAgICAgIChSYW5kb21TZWVkLm5leHREb3VibGUoKSAqIChtYXhZIC0gbWluWSkpICsgbWluWTtcclxuXHJcbiAgdGhpcy5yZWN0LnggPSByYW5kb21DZW50ZXJYO1xyXG4gIHRoaXMucmVjdC55ID0gcmFuZG9tQ2VudGVyWVxyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnVwZGF0ZUJvdW5kcyA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAodGhpcy5nZXRDaGlsZCgpID09IG51bGwpIHtcclxuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gIH1cclxuICBpZiAodGhpcy5nZXRDaGlsZCgpLmdldE5vZGVzKCkubGVuZ3RoICE9IDApXHJcbiAge1xyXG4gICAgLy8gd3JhcCB0aGUgY2hpbGRyZW4gbm9kZXMgYnkgcmUtYXJyYW5naW5nIHRoZSBib3VuZGFyaWVzXHJcbiAgICB2YXIgY2hpbGRHcmFwaCA9IHRoaXMuZ2V0Q2hpbGQoKTtcclxuICAgIGNoaWxkR3JhcGgudXBkYXRlQm91bmRzKHRydWUpO1xyXG5cclxuICAgIHRoaXMucmVjdC54ID0gY2hpbGRHcmFwaC5nZXRMZWZ0KCk7XHJcbiAgICB0aGlzLnJlY3QueSA9IGNoaWxkR3JhcGguZ2V0VG9wKCk7XHJcblxyXG4gICAgdGhpcy5zZXRXaWR0aChjaGlsZEdyYXBoLmdldFJpZ2h0KCkgLSBjaGlsZEdyYXBoLmdldExlZnQoKSArXHJcbiAgICAgICAgICAgIDIgKiBMYXlvdXRDb25zdGFudHMuQ09NUE9VTkRfTk9ERV9NQVJHSU4pO1xyXG4gICAgdGhpcy5zZXRIZWlnaHQoY2hpbGRHcmFwaC5nZXRCb3R0b20oKSAtIGNoaWxkR3JhcGguZ2V0VG9wKCkgK1xyXG4gICAgICAgICAgICAyICogTGF5b3V0Q29uc3RhbnRzLkNPTVBPVU5EX05PREVfTUFSR0lOICtcclxuICAgICAgICAgICAgTGF5b3V0Q29uc3RhbnRzLkxBQkVMX0hFSUdIVCk7XHJcbiAgfVxyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldEluY2x1c2lvblRyZWVEZXB0aCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcy5pbmNsdXNpb25UcmVlRGVwdGggPT0gSW50ZWdlci5NQVhfVkFMVUUpIHtcclxuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5pbmNsdXNpb25UcmVlRGVwdGg7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUudHJhbnNmb3JtID0gZnVuY3Rpb24gKHRyYW5zKVxyXG57XHJcbiAgdmFyIGxlZnQgPSB0aGlzLnJlY3QueDtcclxuXHJcbiAgaWYgKGxlZnQgPiBMYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlkpXHJcbiAge1xyXG4gICAgbGVmdCA9IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWTtcclxuICB9XHJcbiAgZWxzZSBpZiAobGVmdCA8IC1MYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlkpXHJcbiAge1xyXG4gICAgbGVmdCA9IC1MYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlk7XHJcbiAgfVxyXG5cclxuICB2YXIgdG9wID0gdGhpcy5yZWN0Lnk7XHJcblxyXG4gIGlmICh0b3AgPiBMYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlkpXHJcbiAge1xyXG4gICAgdG9wID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZO1xyXG4gIH1cclxuICBlbHNlIGlmICh0b3AgPCAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxyXG4gIHtcclxuICAgIHRvcCA9IC1MYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlk7XHJcbiAgfVxyXG5cclxuICB2YXIgbGVmdFRvcCA9IG5ldyBQb2ludEQobGVmdCwgdG9wKTtcclxuICB2YXIgdkxlZnRUb3AgPSB0cmFucy5pbnZlcnNlVHJhbnNmb3JtUG9pbnQobGVmdFRvcCk7XHJcblxyXG4gIHRoaXMuc2V0TG9jYXRpb24odkxlZnRUb3AueCwgdkxlZnRUb3AueSk7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0TGVmdCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0Lng7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0UmlnaHQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC54ICsgdGhpcy5yZWN0LndpZHRoO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldFRvcCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0Lnk7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0Qm90dG9tID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3QueSArIHRoaXMucmVjdC5oZWlnaHQ7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0UGFyZW50ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIGlmICh0aGlzLm93bmVyID09IG51bGwpXHJcbiAge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcy5vd25lci5nZXRQYXJlbnQoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTE5vZGU7XHJcbiIsInZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xyXG52YXIgSGFzaE1hcCA9IHJlcXVpcmUoJy4vSGFzaE1hcCcpO1xyXG52YXIgTEdyYXBoTWFuYWdlciA9IHJlcXVpcmUoJy4vTEdyYXBoTWFuYWdlcicpO1xyXG5cclxuZnVuY3Rpb24gTGF5b3V0KGlzUmVtb3RlVXNlKSB7XHJcbiAgLy9MYXlvdXQgUXVhbGl0eTogMDpwcm9vZiwgMTpkZWZhdWx0LCAyOmRyYWZ0XHJcbiAgdGhpcy5sYXlvdXRRdWFsaXR5ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUVVBTElUWTtcclxuICAvL1doZXRoZXIgbGF5b3V0IHNob3VsZCBjcmVhdGUgYmVuZHBvaW50cyBhcyBuZWVkZWQgb3Igbm90XHJcbiAgdGhpcy5jcmVhdGVCZW5kc0FzTmVlZGVkID1cclxuICAgICAgICAgIExheW91dENvbnN0YW50cy5ERUZBVUxUX0NSRUFURV9CRU5EU19BU19ORUVERUQ7XHJcbiAgLy9XaGV0aGVyIGxheW91dCBzaG91bGQgYmUgaW5jcmVtZW50YWwgb3Igbm90XHJcbiAgdGhpcy5pbmNyZW1lbnRhbCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMO1xyXG4gIC8vV2hldGhlciB3ZSBhbmltYXRlIGZyb20gYmVmb3JlIHRvIGFmdGVyIGxheW91dCBub2RlIHBvc2l0aW9uc1xyXG4gIHRoaXMuYW5pbWF0aW9uT25MYXlvdXQgPVxyXG4gICAgICAgICAgTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX09OX0xBWU9VVDtcclxuICAvL1doZXRoZXIgd2UgYW5pbWF0ZSB0aGUgbGF5b3V0IHByb2Nlc3Mgb3Igbm90XHJcbiAgdGhpcy5hbmltYXRpb25EdXJpbmdMYXlvdXQgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fRFVSSU5HX0xBWU9VVDtcclxuICAvL051bWJlciBpdGVyYXRpb25zIHRoYXQgc2hvdWxkIGJlIGRvbmUgYmV0d2VlbiB0d28gc3VjY2Vzc2l2ZSBhbmltYXRpb25zXHJcbiAgdGhpcy5hbmltYXRpb25QZXJpb2QgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fUEVSSU9EO1xyXG4gIC8qKlxyXG4gICAqIFdoZXRoZXIgb3Igbm90IGxlYWYgbm9kZXMgKG5vbi1jb21wb3VuZCBub2RlcykgYXJlIG9mIHVuaWZvcm0gc2l6ZXMuIFdoZW5cclxuICAgKiB0aGV5IGFyZSwgYm90aCBzcHJpbmcgYW5kIHJlcHVsc2lvbiBmb3JjZXMgYmV0d2VlbiB0d28gbGVhZiBub2RlcyBjYW4gYmVcclxuICAgKiBjYWxjdWxhdGVkIHdpdGhvdXQgdGhlIGV4cGVuc2l2ZSBjbGlwcGluZyBwb2ludCBjYWxjdWxhdGlvbnMsIHJlc3VsdGluZ1xyXG4gICAqIGluIG1ham9yIHNwZWVkLXVwLlxyXG4gICAqL1xyXG4gIHRoaXMudW5pZm9ybUxlYWZOb2RlU2l6ZXMgPVxyXG4gICAgICAgICAgTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVU5JRk9STV9MRUFGX05PREVfU0laRVM7XHJcbiAgLyoqXHJcbiAgICogVGhpcyBpcyB1c2VkIGZvciBjcmVhdGlvbiBvZiBiZW5kcG9pbnRzIGJ5IHVzaW5nIGR1bW15IG5vZGVzIGFuZCBlZGdlcy5cclxuICAgKiBNYXBzIGFuIExFZGdlIHRvIGl0cyBkdW1teSBiZW5kcG9pbnQgcGF0aC5cclxuICAgKi9cclxuICB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMgPSBuZXcgSGFzaE1hcCgpO1xyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyID0gbmV3IExHcmFwaE1hbmFnZXIodGhpcyk7XHJcbiAgdGhpcy5pc0xheW91dEZpbmlzaGVkID0gZmFsc2U7XHJcbiAgdGhpcy5pc1N1YkxheW91dCA9IGZhbHNlO1xyXG4gIHRoaXMuaXNSZW1vdGVVc2UgPSBmYWxzZTtcclxuXHJcbiAgaWYgKGlzUmVtb3RlVXNlICE9IG51bGwpIHtcclxuICAgIHRoaXMuaXNSZW1vdGVVc2UgPSBpc1JlbW90ZVVzZTtcclxuICB9XHJcbn1cclxuXHJcbkxheW91dC5SQU5ET01fU0VFRCA9IDE7XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLmdldEdyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXI7XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLmdldEFsbE5vZGVzID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxOb2RlcygpO1xyXG59O1xyXG5cclxuTGF5b3V0LnByb3RvdHlwZS5nZXRBbGxFZGdlcyA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsRWRnZXMoKTtcclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUuZ2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uKCk7XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLm5ld0dyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgZ20gPSBuZXcgTEdyYXBoTWFuYWdlcih0aGlzKTtcclxuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xyXG4gIHJldHVybiBnbTtcclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUubmV3R3JhcGggPSBmdW5jdGlvbiAodkdyYXBoKVxyXG57XHJcbiAgcmV0dXJuIG5ldyBMR3JhcGgobnVsbCwgdGhpcy5ncmFwaE1hbmFnZXIsIHZHcmFwaCk7XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLm5ld05vZGUgPSBmdW5jdGlvbiAodk5vZGUpXHJcbntcclxuICByZXR1cm4gbmV3IExOb2RlKHRoaXMuZ3JhcGhNYW5hZ2VyLCB2Tm9kZSk7XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLm5ld0VkZ2UgPSBmdW5jdGlvbiAodkVkZ2UpXHJcbntcclxuICByZXR1cm4gbmV3IExFZGdlKG51bGwsIG51bGwsIHZFZGdlKTtcclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUucnVuTGF5b3V0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHRoaXMuaXNMYXlvdXRGaW5pc2hlZCA9IGZhbHNlO1xyXG5cclxuICB0aGlzLmluaXRQYXJhbWV0ZXJzKCk7XHJcbiAgdmFyIGlzTGF5b3V0U3VjY2Vzc2Z1bGw7XHJcblxyXG4gIGlmICgodGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpID09IG51bGwpXHJcbiAgICAgICAgICB8fCB0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkuZ2V0Tm9kZXMoKS5sZW5ndGggPT0gMFxyXG4gICAgICAgICAgfHwgdGhpcy5ncmFwaE1hbmFnZXIuaW5jbHVkZXNJbnZhbGlkRWRnZSgpKVxyXG4gIHtcclxuICAgIGlzTGF5b3V0U3VjY2Vzc2Z1bGwgPSBmYWxzZTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIC8vIGNhbGN1bGF0ZSBleGVjdXRpb24gdGltZVxyXG4gICAgdmFyIHN0YXJ0VGltZSA9IDA7XHJcblxyXG4gICAgaWYgKCF0aGlzLmlzU3ViTGF5b3V0KVxyXG4gICAge1xyXG4gICAgICBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxyXG4gICAgfVxyXG5cclxuICAgIGlzTGF5b3V0U3VjY2Vzc2Z1bGwgPSB0aGlzLmxheW91dCgpO1xyXG5cclxuICAgIGlmICghdGhpcy5pc1N1YkxheW91dClcclxuICAgIHtcclxuICAgICAgdmFyIGVuZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgdmFyIGV4Y1RpbWUgPSBlbmRUaW1lIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coXCJUb3RhbCBleGVjdXRpb24gdGltZTogXCIgKyBleGNUaW1lICsgXCIgbWlsaXNlY29uZHMuXCIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKGlzTGF5b3V0U3VjY2Vzc2Z1bGwpXHJcbiAge1xyXG4gICAgaWYgKCF0aGlzLmlzU3ViTGF5b3V0KVxyXG4gICAge1xyXG4gICAgICB0aGlzLmRvUG9zdExheW91dCgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGhpcy5pc0xheW91dEZpbmlzaGVkID0gdHJ1ZTtcclxuXHJcbiAgcmV0dXJuIGlzTGF5b3V0U3VjY2Vzc2Z1bGw7XHJcbn07XHJcblxyXG4vKipcclxuICogVGhpcyBtZXRob2QgcGVyZm9ybXMgdGhlIG9wZXJhdGlvbnMgcmVxdWlyZWQgYWZ0ZXIgbGF5b3V0LlxyXG4gKi9cclxuTGF5b3V0LnByb3RvdHlwZS5kb1Bvc3RMYXlvdXQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgLy9hc3NlcnQgIWlzU3ViTGF5b3V0IDogXCJTaG91bGQgbm90IGJlIGNhbGxlZCBvbiBzdWItbGF5b3V0IVwiO1xyXG4gIC8vIFByb3BhZ2F0ZSBnZW9tZXRyaWMgY2hhbmdlcyB0byB2LWxldmVsIG9iamVjdHNcclxuICB0aGlzLnRyYW5zZm9ybSgpO1xyXG4gIHRoaXMudXBkYXRlKCk7XHJcbn07XHJcblxyXG4vKipcclxuICogVGhpcyBtZXRob2QgdXBkYXRlcyB0aGUgZ2VvbWV0cnkgb2YgdGhlIHRhcmdldCBncmFwaCBhY2NvcmRpbmcgdG9cclxuICogY2FsY3VsYXRlZCBsYXlvdXQuXHJcbiAqL1xyXG5MYXlvdXQucHJvdG90eXBlLnVwZGF0ZTIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gdXBkYXRlIGJlbmQgcG9pbnRzXHJcbiAgaWYgKHRoaXMuY3JlYXRlQmVuZHNBc05lZWRlZClcclxuICB7XHJcbiAgICB0aGlzLmNyZWF0ZUJlbmRwb2ludHNGcm9tRHVtbXlOb2RlcygpO1xyXG5cclxuICAgIC8vIHJlc2V0IGFsbCBlZGdlcywgc2luY2UgdGhlIHRvcG9sb2d5IGhhcyBjaGFuZ2VkXHJcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZXNldEFsbEVkZ2VzKCk7XHJcbiAgfVxyXG5cclxuICAvLyBwZXJmb3JtIGVkZ2UsIG5vZGUgYW5kIHJvb3QgdXBkYXRlcyBpZiBsYXlvdXQgaXMgbm90IGNhbGxlZFxyXG4gIC8vIHJlbW90ZWx5XHJcbiAgaWYgKCF0aGlzLmlzUmVtb3RlVXNlKVxyXG4gIHtcclxuICAgIC8vIHVwZGF0ZSBhbGwgZWRnZXNcclxuICAgIHZhciBlZGdlO1xyXG4gICAgdmFyIGFsbEVkZ2VzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsRWRnZXMoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsRWRnZXMubGVuZ3RoOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIGVkZ2UgPSBhbGxFZGdlc1tpXTtcclxuLy8gICAgICB0aGlzLnVwZGF0ZShlZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyByZWN1cnNpdmVseSB1cGRhdGUgbm9kZXNcclxuICAgIHZhciBub2RlO1xyXG4gICAgdmFyIG5vZGVzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmdldE5vZGVzKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gICAge1xyXG4gICAgICBub2RlID0gbm9kZXNbaV07XHJcbi8vICAgICAgdGhpcy51cGRhdGUobm9kZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdXBkYXRlIHJvb3QgZ3JhcGhcclxuICAgIHRoaXMudXBkYXRlKHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKSk7XHJcbiAgfVxyXG59O1xyXG5cclxuTGF5b3V0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgaWYgKG9iaiA9PSBudWxsKSB7XHJcbiAgICB0aGlzLnVwZGF0ZTIoKTtcclxuICB9XHJcbiAgZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgTE5vZGUpIHtcclxuICAgIHZhciBub2RlID0gb2JqO1xyXG4gICAgaWYgKG5vZGUuZ2V0Q2hpbGQoKSAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICAvLyBzaW5jZSBub2RlIGlzIGNvbXBvdW5kLCByZWN1cnNpdmVseSB1cGRhdGUgY2hpbGQgbm9kZXNcclxuICAgICAgdmFyIG5vZGVzID0gbm9kZS5nZXRDaGlsZCgpLmdldE5vZGVzKCk7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspXHJcbiAgICAgIHtcclxuICAgICAgICB1cGRhdGUobm9kZXNbaV0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgdGhlIGwtbGV2ZWwgbm9kZSBpcyBhc3NvY2lhdGVkIHdpdGggYSB2LWxldmVsIGdyYXBoIG9iamVjdCxcclxuICAgIC8vIHRoZW4gaXQgaXMgYXNzdW1lZCB0aGF0IHRoZSB2LWxldmVsIG5vZGUgaW1wbGVtZW50cyB0aGVcclxuICAgIC8vIGludGVyZmFjZSBVcGRhdGFibGUuXHJcbiAgICBpZiAobm9kZS52R3JhcGhPYmplY3QgIT0gbnVsbClcclxuICAgIHtcclxuICAgICAgLy8gY2FzdCB0byBVcGRhdGFibGUgd2l0aG91dCBhbnkgdHlwZSBjaGVja1xyXG4gICAgICB2YXIgdk5vZGUgPSBub2RlLnZHcmFwaE9iamVjdDtcclxuXHJcbiAgICAgIC8vIGNhbGwgdGhlIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGludGVyZmFjZVxyXG4gICAgICB2Tm9kZS51cGRhdGUobm9kZSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIExFZGdlKSB7XHJcbiAgICB2YXIgZWRnZSA9IG9iajtcclxuICAgIC8vIGlmIHRoZSBsLWxldmVsIGVkZ2UgaXMgYXNzb2NpYXRlZCB3aXRoIGEgdi1sZXZlbCBncmFwaCBvYmplY3QsXHJcbiAgICAvLyB0aGVuIGl0IGlzIGFzc3VtZWQgdGhhdCB0aGUgdi1sZXZlbCBlZGdlIGltcGxlbWVudHMgdGhlXHJcbiAgICAvLyBpbnRlcmZhY2UgVXBkYXRhYmxlLlxyXG5cclxuICAgIGlmIChlZGdlLnZHcmFwaE9iamVjdCAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICAvLyBjYXN0IHRvIFVwZGF0YWJsZSB3aXRob3V0IGFueSB0eXBlIGNoZWNrXHJcbiAgICAgIHZhciB2RWRnZSA9IGVkZ2UudkdyYXBoT2JqZWN0O1xyXG5cclxuICAgICAgLy8gY2FsbCB0aGUgdXBkYXRlIG1ldGhvZCBvZiB0aGUgaW50ZXJmYWNlXHJcbiAgICAgIHZFZGdlLnVwZGF0ZShlZGdlKTtcclxuICAgIH1cclxuICB9XHJcbiAgZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgTEdyYXBoKSB7XHJcbiAgICB2YXIgZ3JhcGggPSBvYmo7XHJcbiAgICAvLyBpZiB0aGUgbC1sZXZlbCBncmFwaCBpcyBhc3NvY2lhdGVkIHdpdGggYSB2LWxldmVsIGdyYXBoIG9iamVjdCxcclxuICAgIC8vIHRoZW4gaXQgaXMgYXNzdW1lZCB0aGF0IHRoZSB2LWxldmVsIG9iamVjdCBpbXBsZW1lbnRzIHRoZVxyXG4gICAgLy8gaW50ZXJmYWNlIFVwZGF0YWJsZS5cclxuXHJcbiAgICBpZiAoZ3JhcGgudkdyYXBoT2JqZWN0ICE9IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIC8vIGNhc3QgdG8gVXBkYXRhYmxlIHdpdGhvdXQgYW55IHR5cGUgY2hlY2tcclxuICAgICAgdmFyIHZHcmFwaCA9IGdyYXBoLnZHcmFwaE9iamVjdDtcclxuXHJcbiAgICAgIC8vIGNhbGwgdGhlIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGludGVyZmFjZVxyXG4gICAgICB2R3JhcGgudXBkYXRlKGdyYXBoKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogVGhpcyBtZXRob2QgaXMgdXNlZCB0byBzZXQgYWxsIGxheW91dCBwYXJhbWV0ZXJzIHRvIGRlZmF1bHQgdmFsdWVzXHJcbiAqIGRldGVybWluZWQgYXQgY29tcGlsZSB0aW1lLlxyXG4gKi9cclxuTGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycyA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAoIXRoaXMuaXNTdWJMYXlvdXQpXHJcbiAge1xyXG4gICAgdGhpcy5sYXlvdXRRdWFsaXR5ID0gbGF5b3V0T3B0aW9uc1BhY2subGF5b3V0UXVhbGl0eTtcclxuICAgIHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0ID0gbGF5b3V0T3B0aW9uc1BhY2suYW5pbWF0aW9uRHVyaW5nTGF5b3V0O1xyXG4gICAgdGhpcy5hbmltYXRpb25QZXJpb2QgPSBNYXRoLmZsb29yKExheW91dC50cmFuc2Zvcm0obGF5b3V0T3B0aW9uc1BhY2suYW5pbWF0aW9uUGVyaW9kLFxyXG4gICAgICAgICAgICBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fUEVSSU9EKSk7XHJcbiAgICB0aGlzLmFuaW1hdGlvbk9uTGF5b3V0ID0gbGF5b3V0T3B0aW9uc1BhY2suYW5pbWF0aW9uT25MYXlvdXQ7XHJcbiAgICB0aGlzLmluY3JlbWVudGFsID0gbGF5b3V0T3B0aW9uc1BhY2suaW5jcmVtZW50YWw7XHJcbiAgICB0aGlzLmNyZWF0ZUJlbmRzQXNOZWVkZWQgPSBsYXlvdXRPcHRpb25zUGFjay5jcmVhdGVCZW5kc0FzTmVlZGVkO1xyXG4gICAgdGhpcy51bmlmb3JtTGVhZk5vZGVTaXplcyA9IGxheW91dE9wdGlvbnNQYWNrLnVuaWZvcm1MZWFmTm9kZVNpemVzO1xyXG4gIH1cclxuXHJcbiAgaWYgKHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0KVxyXG4gIHtcclxuICAgIGFuaW1hdGlvbk9uTGF5b3V0ID0gZmFsc2U7XHJcbiAgfVxyXG59O1xyXG5cclxuTGF5b3V0LnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAobmV3TGVmdFRvcCkge1xyXG4gIGlmIChuZXdMZWZ0VG9wID09IHVuZGVmaW5lZCkge1xyXG4gICAgdGhpcy50cmFuc2Zvcm0obmV3IFBvaW50RCgwLCAwKSk7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgLy8gY3JlYXRlIGEgdHJhbnNmb3JtYXRpb24gb2JqZWN0IChmcm9tIEVjbGlwc2UgdG8gbGF5b3V0KS4gV2hlbiBhblxyXG4gICAgLy8gaW52ZXJzZSB0cmFuc2Zvcm0gaXMgYXBwbGllZCwgd2UgZ2V0IHVwcGVyLWxlZnQgY29vcmRpbmF0ZSBvZiB0aGVcclxuICAgIC8vIGRyYXdpbmcgb3IgdGhlIHJvb3QgZ3JhcGggYXQgZ2l2ZW4gaW5wdXQgY29vcmRpbmF0ZSAoc29tZSBtYXJnaW5zXHJcbiAgICAvLyBhbHJlYWR5IGluY2x1ZGVkIGluIGNhbGN1bGF0aW9uIG9mIGxlZnQtdG9wKS5cclxuXHJcbiAgICB2YXIgdHJhbnMgPSBuZXcgVHJhbnNmb3JtKCk7XHJcbiAgICB2YXIgbGVmdFRvcCA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS51cGRhdGVMZWZ0VG9wKCk7XHJcblxyXG4gICAgaWYgKGxlZnRUb3AgIT0gbnVsbClcclxuICAgIHtcclxuICAgICAgdHJhbnMuc2V0V29ybGRPcmdYKG5ld0xlZnRUb3AueCk7XHJcbiAgICAgIHRyYW5zLnNldFdvcmxkT3JnWShuZXdMZWZ0VG9wLnkpO1xyXG5cclxuICAgICAgdHJhbnMuc2V0RGV2aWNlT3JnWChsZWZ0VG9wLngpO1xyXG4gICAgICB0cmFucy5zZXREZXZpY2VPcmdZKGxlZnRUb3AueSk7XHJcblxyXG4gICAgICB2YXIgbm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzKCk7XHJcbiAgICAgIHZhciBub2RlO1xyXG5cclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcclxuICAgICAge1xyXG4gICAgICAgIG5vZGUgPSBub2Rlc1tpXTtcclxuICAgICAgICBub2RlLnRyYW5zZm9ybSh0cmFucyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLnBvc2l0aW9uTm9kZXNSYW5kb21seSA9IGZ1bmN0aW9uIChncmFwaCkge1xyXG5cclxuICBpZiAoZ3JhcGggPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAvL2Fzc2VydCAhdGhpcy5pbmNyZW1lbnRhbDtcclxuICAgIHRoaXMucG9zaXRpb25Ob2Rlc1JhbmRvbWx5KHRoaXMuZ2V0R3JhcGhNYW5hZ2VyKCkuZ2V0Um9vdCgpKTtcclxuICAgIHRoaXMuZ2V0R3JhcGhNYW5hZ2VyKCkuZ2V0Um9vdCgpLnVwZGF0ZUJvdW5kcyh0cnVlKTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICB2YXIgbE5vZGU7XHJcbiAgICB2YXIgY2hpbGRHcmFwaDtcclxuXHJcbiAgICB2YXIgbm9kZXMgPSBncmFwaC5nZXROb2RlcygpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcclxuICAgIHtcclxuICAgICAgbE5vZGUgPSBub2Rlc1tpXTtcclxuICAgICAgY2hpbGRHcmFwaCA9IGxOb2RlLmdldENoaWxkKCk7XHJcblxyXG4gICAgICBpZiAoY2hpbGRHcmFwaCA9PSBudWxsKVxyXG4gICAgICB7XHJcbiAgICAgICAgbE5vZGUuc2NhdHRlcigpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2UgaWYgKGNoaWxkR3JhcGguZ2V0Tm9kZXMoKS5sZW5ndGggPT0gMClcclxuICAgICAge1xyXG4gICAgICAgIGxOb2RlLnNjYXR0ZXIoKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uTm9kZXNSYW5kb21seShjaGlsZEdyYXBoKTtcclxuICAgICAgICBsTm9kZS51cGRhdGVCb3VuZHMoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIGEgbGlzdCBvZiB0cmVlcyB3aGVyZSBlYWNoIHRyZWUgaXMgcmVwcmVzZW50ZWQgYXMgYVxyXG4gKiBsaXN0IG9mIGwtbm9kZXMuIFRoZSBtZXRob2QgcmV0dXJucyBhIGxpc3Qgb2Ygc2l6ZSAwIHdoZW46XHJcbiAqIC0gVGhlIGdyYXBoIGlzIG5vdCBmbGF0IG9yXHJcbiAqIC0gT25lIG9mIHRoZSBjb21wb25lbnQocykgb2YgdGhlIGdyYXBoIGlzIG5vdCBhIHRyZWUuXHJcbiAqL1xyXG5MYXlvdXQucHJvdG90eXBlLmdldEZsYXRGb3Jlc3QgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIGZsYXRGb3Jlc3QgPSBbXTtcclxuICB2YXIgaXNGb3Jlc3QgPSB0cnVlO1xyXG5cclxuICAvLyBRdWljayByZWZlcmVuY2UgZm9yIGFsbCBub2RlcyBpbiB0aGUgZ3JhcGggbWFuYWdlciBhc3NvY2lhdGVkIHdpdGhcclxuICAvLyB0aGlzIGxheW91dC4gVGhlIGxpc3Qgc2hvdWxkIG5vdCBiZSBjaGFuZ2VkLlxyXG4gIHZhciBhbGxOb2RlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXROb2RlcygpO1xyXG5cclxuICAvLyBGaXJzdCBiZSBzdXJlIHRoYXQgdGhlIGdyYXBoIGlzIGZsYXRcclxuICB2YXIgaXNGbGF0ID0gdHJ1ZTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbGxOb2Rlcy5sZW5ndGg7IGkrKylcclxuICB7XHJcbiAgICBpZiAoYWxsTm9kZXNbaV0uZ2V0Q2hpbGQoKSAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICBpc0ZsYXQgPSBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFJldHVybiBlbXB0eSBmb3Jlc3QgaWYgdGhlIGdyYXBoIGlzIG5vdCBmbGF0LlxyXG4gIGlmICghaXNGbGF0KVxyXG4gIHtcclxuICAgIHJldHVybiBmbGF0Rm9yZXN0O1xyXG4gIH1cclxuXHJcbiAgLy8gUnVuIEJGUyBmb3IgZWFjaCBjb21wb25lbnQgb2YgdGhlIGdyYXBoLlxyXG5cclxuICB2YXIgdmlzaXRlZCA9IG5ldyBIYXNoU2V0KCk7XHJcbiAgdmFyIHRvQmVWaXNpdGVkID0gW107XHJcbiAgdmFyIHBhcmVudHMgPSBuZXcgSGFzaE1hcCgpO1xyXG4gIHZhciB1blByb2Nlc3NlZE5vZGVzID0gW107XHJcblxyXG4gIHVuUHJvY2Vzc2VkTm9kZXMgPSB1blByb2Nlc3NlZE5vZGVzLmNvbmNhdChhbGxOb2Rlcyk7XHJcblxyXG4gIC8vIEVhY2ggaXRlcmF0aW9uIG9mIHRoaXMgbG9vcCBmaW5kcyBhIGNvbXBvbmVudCBvZiB0aGUgZ3JhcGggYW5kXHJcbiAgLy8gZGVjaWRlcyB3aGV0aGVyIGl0IGlzIGEgdHJlZSBvciBub3QuIElmIGl0IGlzIGEgdHJlZSwgYWRkcyBpdCB0byB0aGVcclxuICAvLyBmb3Jlc3QgYW5kIGNvbnRpbnVlZCB3aXRoIHRoZSBuZXh0IGNvbXBvbmVudC5cclxuXHJcbiAgd2hpbGUgKHVuUHJvY2Vzc2VkTm9kZXMubGVuZ3RoID4gMCAmJiBpc0ZvcmVzdClcclxuICB7XHJcbiAgICB0b0JlVmlzaXRlZC5wdXNoKHVuUHJvY2Vzc2VkTm9kZXNbMF0pO1xyXG5cclxuICAgIC8vIFN0YXJ0IHRoZSBCRlMuIEVhY2ggaXRlcmF0aW9uIG9mIHRoaXMgbG9vcCB2aXNpdHMgYSBub2RlIGluIGFcclxuICAgIC8vIEJGUyBtYW5uZXIuXHJcbiAgICB3aGlsZSAodG9CZVZpc2l0ZWQubGVuZ3RoID4gMCAmJiBpc0ZvcmVzdClcclxuICAgIHtcclxuICAgICAgLy9wb29sIG9wZXJhdGlvblxyXG4gICAgICB2YXIgY3VycmVudE5vZGUgPSB0b0JlVmlzaXRlZFswXTtcclxuICAgICAgdG9CZVZpc2l0ZWQuc3BsaWNlKDAsIDEpO1xyXG4gICAgICB2aXNpdGVkLmFkZChjdXJyZW50Tm9kZSk7XHJcblxyXG4gICAgICAvLyBUcmF2ZXJzZSBhbGwgbmVpZ2hib3JzIG9mIHRoaXMgbm9kZVxyXG4gICAgICB2YXIgbmVpZ2hib3JFZGdlcyA9IGN1cnJlbnROb2RlLmdldEVkZ2VzKCk7XHJcblxyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5laWdoYm9yRWRnZXMubGVuZ3RoOyBpKyspXHJcbiAgICAgIHtcclxuICAgICAgICB2YXIgY3VycmVudE5laWdoYm9yID1cclxuICAgICAgICAgICAgICAgIG5laWdoYm9yRWRnZXNbaV0uZ2V0T3RoZXJFbmQoY3VycmVudE5vZGUpO1xyXG5cclxuICAgICAgICAvLyBJZiBCRlMgaXMgbm90IGdyb3dpbmcgZnJvbSB0aGlzIG5laWdoYm9yLlxyXG4gICAgICAgIGlmIChwYXJlbnRzLmdldChjdXJyZW50Tm9kZSkgIT0gY3VycmVudE5laWdoYm9yKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIC8vIFdlIGhhdmVuJ3QgcHJldmlvdXNseSB2aXNpdGVkIHRoaXMgbmVpZ2hib3IuXHJcbiAgICAgICAgICBpZiAoIXZpc2l0ZWQuY29udGFpbnMoY3VycmVudE5laWdoYm9yKSlcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdG9CZVZpc2l0ZWQucHVzaChjdXJyZW50TmVpZ2hib3IpO1xyXG4gICAgICAgICAgICBwYXJlbnRzLnB1dChjdXJyZW50TmVpZ2hib3IsIGN1cnJlbnROb2RlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIFNpbmNlIHdlIGhhdmUgcHJldmlvdXNseSB2aXNpdGVkIHRoaXMgbmVpZ2hib3IgYW5kXHJcbiAgICAgICAgICAvLyB0aGlzIG5laWdoYm9yIGlzIG5vdCBwYXJlbnQgb2YgY3VycmVudE5vZGUsIGdpdmVuXHJcbiAgICAgICAgICAvLyBncmFwaCBjb250YWlucyBhIGNvbXBvbmVudCB0aGF0IGlzIG5vdCB0cmVlLCBoZW5jZVxyXG4gICAgICAgICAgLy8gaXQgaXMgbm90IGEgZm9yZXN0LlxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBpc0ZvcmVzdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBUaGUgZ3JhcGggY29udGFpbnMgYSBjb21wb25lbnQgdGhhdCBpcyBub3QgYSB0cmVlLiBFbXB0eVxyXG4gICAgLy8gcHJldmlvdXNseSBmb3VuZCB0cmVlcy4gVGhlIG1ldGhvZCB3aWxsIGVuZC5cclxuICAgIGlmICghaXNGb3Jlc3QpXHJcbiAgICB7XHJcbiAgICAgIGZsYXRGb3Jlc3QgPSBbXTtcclxuICAgIH1cclxuICAgIC8vIFNhdmUgY3VycmVudGx5IHZpc2l0ZWQgbm9kZXMgYXMgYSB0cmVlIGluIG91ciBmb3Jlc3QuIFJlc2V0XHJcbiAgICAvLyB2aXNpdGVkIGFuZCBwYXJlbnRzIGxpc3RzLiBDb250aW51ZSB3aXRoIHRoZSBuZXh0IGNvbXBvbmVudCBvZlxyXG4gICAgLy8gdGhlIGdyYXBoLCBpZiBhbnkuXHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIHZhciB0ZW1wID0gW107XHJcbiAgICAgIHZpc2l0ZWQuYWRkQWxsVG8odGVtcCk7XHJcbiAgICAgIGZsYXRGb3Jlc3QucHVzaCh0ZW1wKTtcclxuICAgICAgLy9mbGF0Rm9yZXN0ID0gZmxhdEZvcmVzdC5jb25jYXQodGVtcCk7XHJcbiAgICAgIC8vdW5Qcm9jZXNzZWROb2Rlcy5yZW1vdmVBbGwodmlzaXRlZCk7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGVtcC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IHRlbXBbaV07XHJcbiAgICAgICAgdmFyIGluZGV4ID0gdW5Qcm9jZXNzZWROb2Rlcy5pbmRleE9mKHZhbHVlKTtcclxuICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xyXG4gICAgICAgICAgdW5Qcm9jZXNzZWROb2Rlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICB2aXNpdGVkID0gbmV3IEhhc2hTZXQoKTtcclxuICAgICAgcGFyZW50cyA9IG5ldyBIYXNoTWFwKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZmxhdEZvcmVzdDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUaGlzIG1ldGhvZCBjcmVhdGVzIGR1bW15IG5vZGVzIChhbiBsLWxldmVsIG5vZGUgd2l0aCBtaW5pbWFsIGRpbWVuc2lvbnMpXHJcbiAqIGZvciB0aGUgZ2l2ZW4gZWRnZSAob25lIHBlciBiZW5kcG9pbnQpLiBUaGUgZXhpc3RpbmcgbC1sZXZlbCBzdHJ1Y3R1cmVcclxuICogaXMgdXBkYXRlZCBhY2NvcmRpbmdseS5cclxuICovXHJcbkxheW91dC5wcm90b3R5cGUuY3JlYXRlRHVtbXlOb2Rlc0ZvckJlbmRwb2ludHMgPSBmdW5jdGlvbiAoZWRnZSlcclxue1xyXG4gIHZhciBkdW1teU5vZGVzID0gW107XHJcbiAgdmFyIHByZXYgPSBlZGdlLnNvdXJjZTtcclxuXHJcbiAgdmFyIGdyYXBoID0gdGhpcy5ncmFwaE1hbmFnZXIuY2FsY0xvd2VzdENvbW1vbkFuY2VzdG9yKGVkZ2Uuc291cmNlLCBlZGdlLnRhcmdldCk7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZS5iZW5kcG9pbnRzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIC8vIGNyZWF0ZSBuZXcgZHVtbXkgbm9kZVxyXG4gICAgdmFyIGR1bW15Tm9kZSA9IHRoaXMubmV3Tm9kZShudWxsKTtcclxuICAgIGR1bW15Tm9kZS5zZXRSZWN0KG5ldyBQb2ludCgwLCAwKSwgbmV3IERpbWVuc2lvbigxLCAxKSk7XHJcblxyXG4gICAgZ3JhcGguYWRkKGR1bW15Tm9kZSk7XHJcblxyXG4gICAgLy8gY3JlYXRlIG5ldyBkdW1teSBlZGdlIGJldHdlZW4gcHJldiBhbmQgZHVtbXkgbm9kZVxyXG4gICAgdmFyIGR1bW15RWRnZSA9IHRoaXMubmV3RWRnZShudWxsKTtcclxuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLmFkZChkdW1teUVkZ2UsIHByZXYsIGR1bW15Tm9kZSk7XHJcblxyXG4gICAgZHVtbXlOb2Rlcy5hZGQoZHVtbXlOb2RlKTtcclxuICAgIHByZXYgPSBkdW1teU5vZGU7XHJcbiAgfVxyXG5cclxuICB2YXIgZHVtbXlFZGdlID0gdGhpcy5uZXdFZGdlKG51bGwpO1xyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLmFkZChkdW1teUVkZ2UsIHByZXYsIGVkZ2UudGFyZ2V0KTtcclxuXHJcbiAgdGhpcy5lZGdlVG9EdW1teU5vZGVzLnB1dChlZGdlLCBkdW1teU5vZGVzKTtcclxuXHJcbiAgLy8gcmVtb3ZlIHJlYWwgZWRnZSBmcm9tIGdyYXBoIG1hbmFnZXIgaWYgaXQgaXMgaW50ZXItZ3JhcGhcclxuICBpZiAoZWRnZS5pc0ludGVyR3JhcGgoKSlcclxuICB7XHJcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUoZWRnZSk7XHJcbiAgfVxyXG4gIC8vIGVsc2UsIHJlbW92ZSB0aGUgZWRnZSBmcm9tIHRoZSBjdXJyZW50IGdyYXBoXHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIGdyYXBoLnJlbW92ZShlZGdlKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBkdW1teU5vZGVzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIGNyZWF0ZXMgYmVuZHBvaW50cyBmb3IgZWRnZXMgZnJvbSB0aGUgZHVtbXkgbm9kZXNcclxuICogYXQgbC1sZXZlbC5cclxuICovXHJcbkxheW91dC5wcm90b3R5cGUuY3JlYXRlQmVuZHBvaW50c0Zyb21EdW1teU5vZGVzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBlZGdlcyA9IFtdO1xyXG4gIGVkZ2VzID0gZWRnZXMuY29uY2F0KHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbEVkZ2VzKCkpO1xyXG4gIGVkZ2VzID0gdGhpcy5lZGdlVG9EdW1teU5vZGVzLmtleVNldCgpLmNvbmNhdChlZGdlcyk7XHJcblxyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZWRnZXMubGVuZ3RoOyBrKyspXHJcbiAge1xyXG4gICAgdmFyIGxFZGdlID0gZWRnZXNba107XHJcblxyXG4gICAgaWYgKGxFZGdlLmJlbmRwb2ludHMubGVuZ3RoID4gMClcclxuICAgIHtcclxuICAgICAgdmFyIHBhdGggPSB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMuZ2V0KGxFZGdlKTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKylcclxuICAgICAge1xyXG4gICAgICAgIHZhciBkdW1teU5vZGUgPSBwYXRoW2ldO1xyXG4gICAgICAgIHZhciBwID0gbmV3IFBvaW50RChkdW1teU5vZGUuZ2V0Q2VudGVyWCgpLFxyXG4gICAgICAgICAgICAgICAgZHVtbXlOb2RlLmdldENlbnRlclkoKSk7XHJcblxyXG4gICAgICAgIC8vIHVwZGF0ZSBiZW5kcG9pbnQncyBsb2NhdGlvbiBhY2NvcmRpbmcgdG8gZHVtbXkgbm9kZVxyXG4gICAgICAgIHZhciBlYnAgPSBsRWRnZS5iZW5kcG9pbnRzLmdldChpKTtcclxuICAgICAgICBlYnAueCA9IHAueDtcclxuICAgICAgICBlYnAueSA9IHAueTtcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBkdW1teSBub2RlLCBkdW1teSBlZGdlcyBpbmNpZGVudCB3aXRoIHRoaXNcclxuICAgICAgICAvLyBkdW1teSBub2RlIGlzIGFsc28gcmVtb3ZlZCAod2l0aGluIHRoZSByZW1vdmUgbWV0aG9kKVxyXG4gICAgICAgIGR1bW15Tm9kZS5nZXRPd25lcigpLnJlbW92ZShkdW1teU5vZGUpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBhZGQgdGhlIHJlYWwgZWRnZSB0byBncmFwaFxyXG4gICAgICB0aGlzLmdyYXBoTWFuYWdlci5hZGQobEVkZ2UsIGxFZGdlLnNvdXJjZSwgbEVkZ2UudGFyZ2V0KTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5MYXlvdXQudHJhbnNmb3JtID0gZnVuY3Rpb24gKHNsaWRlclZhbHVlLCBkZWZhdWx0VmFsdWUsIG1pbkRpdiwgbWF4TXVsKSB7XHJcbiAgaWYgKG1pbkRpdiAhPSB1bmRlZmluZWQgJiYgbWF4TXVsICE9IHVuZGVmaW5lZCkge1xyXG4gICAgdmFyIHZhbHVlID0gZGVmYXVsdFZhbHVlO1xyXG5cclxuICAgIGlmIChzbGlkZXJWYWx1ZSA8PSA1MClcclxuICAgIHtcclxuICAgICAgdmFyIG1pblZhbHVlID0gZGVmYXVsdFZhbHVlIC8gbWluRGl2O1xyXG4gICAgICB2YWx1ZSAtPSAoKGRlZmF1bHRWYWx1ZSAtIG1pblZhbHVlKSAvIDUwKSAqICg1MCAtIHNsaWRlclZhbHVlKTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgdmFyIG1heFZhbHVlID0gZGVmYXVsdFZhbHVlICogbWF4TXVsO1xyXG4gICAgICB2YWx1ZSArPSAoKG1heFZhbHVlIC0gZGVmYXVsdFZhbHVlKSAvIDUwKSAqIChzbGlkZXJWYWx1ZSAtIDUwKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgdmFyIGEsIGI7XHJcblxyXG4gICAgaWYgKHNsaWRlclZhbHVlIDw9IDUwKVxyXG4gICAge1xyXG4gICAgICBhID0gOS4wICogZGVmYXVsdFZhbHVlIC8gNTAwLjA7XHJcbiAgICAgIGIgPSBkZWZhdWx0VmFsdWUgLyAxMC4wO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICBhID0gOS4wICogZGVmYXVsdFZhbHVlIC8gNTAuMDtcclxuICAgICAgYiA9IC04ICogZGVmYXVsdFZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAoYSAqIHNsaWRlclZhbHVlICsgYik7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIGZpbmRzIGFuZCByZXR1cm5zIHRoZSBjZW50ZXIgb2YgdGhlIGdpdmVuIG5vZGVzLCBhc3N1bWluZ1xyXG4gKiB0aGF0IHRoZSBnaXZlbiBub2RlcyBmb3JtIGEgdHJlZSBpbiB0aGVtc2VsdmVzLlxyXG4gKi9cclxuTGF5b3V0LmZpbmRDZW50ZXJPZlRyZWUgPSBmdW5jdGlvbiAobm9kZXMpXHJcbntcclxuICB2YXIgbGlzdCA9IFtdO1xyXG4gIGxpc3QgPSBsaXN0LmNvbmNhdChub2Rlcyk7XHJcblxyXG4gIHZhciByZW1vdmVkTm9kZXMgPSBbXTtcclxuICB2YXIgcmVtYWluaW5nRGVncmVlcyA9IG5ldyBIYXNoTWFwKCk7XHJcbiAgdmFyIGZvdW5kQ2VudGVyID0gZmFsc2U7XHJcbiAgdmFyIGNlbnRlck5vZGUgPSBudWxsO1xyXG5cclxuICBpZiAobGlzdC5sZW5ndGggPT0gMSB8fCBsaXN0Lmxlbmd0aCA9PSAyKVxyXG4gIHtcclxuICAgIGZvdW5kQ2VudGVyID0gdHJ1ZTtcclxuICAgIGNlbnRlck5vZGUgPSBsaXN0WzBdO1xyXG4gIH1cclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBub2RlID0gbGlzdFtpXTtcclxuICAgIHZhciBkZWdyZWUgPSBub2RlLmdldE5laWdoYm9yc0xpc3QoKS5zaXplKCk7XHJcbiAgICByZW1haW5pbmdEZWdyZWVzLnB1dChub2RlLCBub2RlLmdldE5laWdoYm9yc0xpc3QoKS5zaXplKCkpO1xyXG5cclxuICAgIGlmIChkZWdyZWUgPT0gMSlcclxuICAgIHtcclxuICAgICAgcmVtb3ZlZE5vZGVzLnB1c2gobm9kZSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YXIgdGVtcExpc3QgPSBbXTtcclxuICB0ZW1wTGlzdCA9IHRlbXBMaXN0LmNvbmNhdChyZW1vdmVkTm9kZXMpO1xyXG5cclxuICB3aGlsZSAoIWZvdW5kQ2VudGVyKVxyXG4gIHtcclxuICAgIHZhciB0ZW1wTGlzdDIgPSBbXTtcclxuICAgIHRlbXBMaXN0MiA9IHRlbXBMaXN0Mi5jb25jYXQodGVtcExpc3QpO1xyXG4gICAgdGVtcExpc3QgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIHZhciBub2RlID0gbGlzdFtpXTtcclxuXHJcbiAgICAgIHZhciBpbmRleCA9IGxpc3QuaW5kZXhPZihub2RlKTtcclxuICAgICAgaWYgKGluZGV4ID49IDApIHtcclxuICAgICAgICBsaXN0LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBuZWlnaGJvdXJzID0gbm9kZS5nZXROZWlnaGJvcnNMaXN0KCk7XHJcblxyXG4gICAgICBmb3IgKHZhciBqIGluIG5laWdoYm91cnMuc2V0KVxyXG4gICAgICB7XHJcbiAgICAgICAgdmFyIG5laWdoYm91ciA9IG5laWdoYm91cnMuc2V0W2pdO1xyXG4gICAgICAgIGlmIChyZW1vdmVkTm9kZXMuaW5kZXhPZihuZWlnaGJvdXIpIDwgMClcclxuICAgICAgICB7XHJcbiAgICAgICAgICB2YXIgb3RoZXJEZWdyZWUgPSByZW1haW5pbmdEZWdyZWVzLmdldChuZWlnaGJvdXIpO1xyXG4gICAgICAgICAgdmFyIG5ld0RlZ3JlZSA9IG90aGVyRGVncmVlIC0gMTtcclxuXHJcbiAgICAgICAgICBpZiAobmV3RGVncmVlID09IDEpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHRlbXBMaXN0LnB1c2gobmVpZ2hib3VyKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICByZW1haW5pbmdEZWdyZWVzLnB1dChuZWlnaGJvdXIsIG5ld0RlZ3JlZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlZE5vZGVzID0gcmVtb3ZlZE5vZGVzLmNvbmNhdCh0ZW1wTGlzdCk7XHJcblxyXG4gICAgaWYgKGxpc3QubGVuZ3RoID09IDEgfHwgbGlzdC5sZW5ndGggPT0gMilcclxuICAgIHtcclxuICAgICAgZm91bmRDZW50ZXIgPSB0cnVlO1xyXG4gICAgICBjZW50ZXJOb2RlID0gbGlzdFswXTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBjZW50ZXJOb2RlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIER1cmluZyB0aGUgY29hcnNlbmluZyBwcm9jZXNzLCB0aGlzIGxheW91dCBtYXkgYmUgcmVmZXJlbmNlZCBieSB0d28gZ3JhcGggbWFuYWdlcnNcclxuICogdGhpcyBzZXR0ZXIgZnVuY3Rpb24gZ3JhbnRzIGFjY2VzcyB0byBjaGFuZ2UgdGhlIGN1cnJlbnRseSBiZWluZyB1c2VkIGdyYXBoIG1hbmFnZXJcclxuICovXHJcbkxheW91dC5wcm90b3R5cGUuc2V0R3JhcGhNYW5hZ2VyID0gZnVuY3Rpb24gKGdtKVxyXG57XHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIgPSBnbTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0O1xyXG4iLCJmdW5jdGlvbiBMYXlvdXRDb25zdGFudHMoKSB7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMYXlvdXQgUXVhbGl0eVxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLlBST09GX1FVQUxJVFkgPSAwO1xyXG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9RVUFMSVRZID0gMTtcclxuTGF5b3V0Q29uc3RhbnRzLkRSQUZUX1FVQUxJVFkgPSAyO1xyXG5cclxuLyoqXHJcbiAqIERlZmF1bHQgcGFyYW1ldGVyc1xyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ1JFQVRFX0JFTkRTX0FTX05FRURFRCA9IGZhbHNlO1xyXG4vL0xheW91dENvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMID0gdHJ1ZTtcclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUwgPSBmYWxzZTtcclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX09OX0xBWU9VVCA9IHRydWU7XHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9EVVJJTkdfTEFZT1VUID0gZmFsc2U7XHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9QRVJJT0QgPSA1MDtcclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVU5JRk9STV9MRUFGX05PREVfU0laRVMgPSBmYWxzZTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFNlY3Rpb246IEdlbmVyYWwgb3RoZXIgY29uc3RhbnRzXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8qXHJcbiAqIE1hcmdpbnMgb2YgYSBncmFwaCB0byBiZSBhcHBsaWVkIG9uIGJvdWRpbmcgcmVjdGFuZ2xlIG9mIGl0cyBjb250ZW50cy4gV2VcclxuICogYXNzdW1lIG1hcmdpbnMgb24gYWxsIGZvdXIgc2lkZXMgdG8gYmUgdW5pZm9ybS5cclxuICovXHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVBIX01BUkdJTiA9IDEwO1xyXG5cclxuLypcclxuICogVGhlIGhlaWdodCBvZiB0aGUgbGFiZWwgb2YgYSBjb21wb3VuZC4gV2UgYXNzdW1lIHRoZSBsYWJlbCBvZiBhIGNvbXBvdW5kXHJcbiAqIG5vZGUgaXMgcGxhY2VkIGF0IHRoZSBib3R0b20gd2l0aCBhIGR5bmFtaWMgd2lkdGggc2FtZSBhcyB0aGUgY29tcG91bmRcclxuICogaXRzZWxmLlxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLkxBQkVMX0hFSUdIVCA9IDIwO1xyXG5cclxuLypcclxuICogQWRkaXRpb25hbCBtYXJnaW5zIHRoYXQgd2UgbWFpbnRhaW4gYXMgc2FmZXR5IGJ1ZmZlciBmb3Igbm9kZS1ub2RlXHJcbiAqIG92ZXJsYXBzLiBDb21wb3VuZCBub2RlIGxhYmVscyBhcyB3ZWxsIGFzIGdyYXBoIG1hcmdpbnMgYXJlIGhhbmRsZWRcclxuICogc2VwYXJhdGVseSFcclxuICovXHJcbkxheW91dENvbnN0YW50cy5DT01QT1VORF9OT0RFX01BUkdJTiA9IDU7XHJcblxyXG4vKlxyXG4gKiBEZWZhdWx0IGRpbWVuc2lvbiBvZiBhIG5vbi1jb21wb3VuZCBub2RlLlxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLlNJTVBMRV9OT0RFX1NJWkUgPSA0MDtcclxuXHJcbi8qXHJcbiAqIERlZmF1bHQgZGltZW5zaW9uIG9mIGEgbm9uLWNvbXBvdW5kIG5vZGUuXHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuU0lNUExFX05PREVfSEFMRl9TSVpFID0gTGF5b3V0Q29uc3RhbnRzLlNJTVBMRV9OT0RFX1NJWkUgLyAyO1xyXG5cclxuLypcclxuICogRW1wdHkgY29tcG91bmQgbm9kZSBzaXplLiBXaGVuIGEgY29tcG91bmQgbm9kZSBpcyBlbXB0eSwgaXRzIGJvdGhcclxuICogZGltZW5zaW9ucyBzaG91bGQgYmUgb2YgdGhpcyB2YWx1ZS5cclxuICovXHJcbkxheW91dENvbnN0YW50cy5FTVBUWV9DT01QT1VORF9OT0RFX1NJWkUgPSA0MDtcclxuXHJcbi8qXHJcbiAqIE1pbmltdW0gbGVuZ3RoIHRoYXQgYW4gZWRnZSBzaG91bGQgdGFrZSBkdXJpbmcgbGF5b3V0XHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuTUlOX0VER0VfTEVOR1RIID0gMTtcclxuXHJcbi8qXHJcbiAqIFdvcmxkIGJvdW5kYXJpZXMgdGhhdCBsYXlvdXQgb3BlcmF0ZXMgb25cclxuICovXHJcbkxheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSA9IDEwMDAwMDA7XHJcblxyXG4vKlxyXG4gKiBXb3JsZCBib3VuZGFyaWVzIHRoYXQgcmFuZG9tIHBvc2l0aW9uaW5nIGNhbiBiZSBwZXJmb3JtZWQgd2l0aFxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLklOSVRJQUxfV09STERfQk9VTkRBUlkgPSBMYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlkgLyAxMDAwO1xyXG5cclxuLypcclxuICogQ29vcmRpbmF0ZXMgb2YgdGhlIHdvcmxkIGNlbnRlclxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9YID0gMTIwMDtcclxuTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9ZID0gOTAwO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXRDb25zdGFudHM7XHJcbiIsIi8qXHJcbiAqVGhpcyBjbGFzcyBpcyB0aGUgamF2YXNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgUG9pbnQuamF2YSBjbGFzcyBpbiBqZGtcclxuICovXHJcbmZ1bmN0aW9uIFBvaW50KHgsIHksIHApIHtcclxuICB0aGlzLnggPSBudWxsO1xyXG4gIHRoaXMueSA9IG51bGw7XHJcbiAgaWYgKHggPT0gbnVsbCAmJiB5ID09IG51bGwgJiYgcCA9PSBudWxsKSB7XHJcbiAgICB0aGlzLnggPSAwO1xyXG4gICAgdGhpcy55ID0gMDtcclxuICB9XHJcbiAgZWxzZSBpZiAodHlwZW9mIHggPT0gJ251bWJlcicgJiYgdHlwZW9mIHkgPT0gJ251bWJlcicgJiYgcCA9PSBudWxsKSB7XHJcbiAgICB0aGlzLnggPSB4O1xyXG4gICAgdGhpcy55ID0geTtcclxuICB9XHJcbiAgZWxzZSBpZiAoeC5jb25zdHJ1Y3Rvci5uYW1lID09ICdQb2ludCcgJiYgeSA9PSBudWxsICYmIHAgPT0gbnVsbCkge1xyXG4gICAgcCA9IHg7XHJcbiAgICB0aGlzLnggPSBwLng7XHJcbiAgICB0aGlzLnkgPSBwLnk7XHJcbiAgfVxyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUuZ2V0WCA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy54O1xyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy55O1xyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUuZ2V0TG9jYXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLngsIHRoaXMueSk7XHJcbn1cclxuXHJcblBvaW50LnByb3RvdHlwZS5zZXRMb2NhdGlvbiA9IGZ1bmN0aW9uICh4LCB5LCBwKSB7XHJcbiAgaWYgKHguY29uc3RydWN0b3IubmFtZSA9PSAnUG9pbnQnICYmIHkgPT0gbnVsbCAmJiBwID09IG51bGwpIHtcclxuICAgIHAgPSB4O1xyXG4gICAgdGhpcy5zZXRMb2NhdGlvbihwLngsIHAueSk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHR5cGVvZiB4ID09ICdudW1iZXInICYmIHR5cGVvZiB5ID09ICdudW1iZXInICYmIHAgPT0gbnVsbCkge1xyXG4gICAgLy9pZiBib3RoIHBhcmFtZXRlcnMgYXJlIGludGVnZXIganVzdCBtb3ZlICh4LHkpIGxvY2F0aW9uXHJcbiAgICBpZiAocGFyc2VJbnQoeCkgPT0geCAmJiBwYXJzZUludCh5KSA9PSB5KSB7XHJcbiAgICAgIHRoaXMubW92ZSh4LCB5KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLnggPSBNYXRoLmZsb29yKHggKyAwLjUpO1xyXG4gICAgICB0aGlzLnkgPSBNYXRoLmZsb29yKHkgKyAwLjUpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoeCwgeSkge1xyXG4gIHRoaXMueCA9IHg7XHJcbiAgdGhpcy55ID0geTtcclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChkeCwgZHkpIHtcclxuICB0aGlzLnggKz0gZHg7XHJcbiAgdGhpcy55ICs9IGR5O1xyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIGlmIChvYmouY29uc3RydWN0b3IubmFtZSA9PSBcIlBvaW50XCIpIHtcclxuICAgIHZhciBwdCA9IG9iajtcclxuICAgIHJldHVybiAodGhpcy54ID09IHB0LngpICYmICh0aGlzLnkgPT0gcHQueSk7XHJcbiAgfVxyXG4gIHJldHVybiB0aGlzID09IG9iajtcclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBuZXcgUG9pbnQoKS5jb25zdHJ1Y3Rvci5uYW1lICsgXCJbeD1cIiArIHRoaXMueCArIFwiLHk9XCIgKyB0aGlzLnkgKyBcIl1cIjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDtcclxuIiwiZnVuY3Rpb24gUG9pbnREKHgsIHkpIHtcclxuICBpZiAoeCA9PSBudWxsICYmIHkgPT0gbnVsbCkge1xyXG4gICAgdGhpcy54ID0gMDtcclxuICAgIHRoaXMueSA9IDA7XHJcbiAgfSBlbHNlIHtcclxuICAgIHRoaXMueCA9IHg7XHJcbiAgICB0aGlzLnkgPSB5O1xyXG4gIH1cclxufVxyXG5cclxuUG9pbnRELnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLng7XHJcbn07XHJcblxyXG5Qb2ludEQucHJvdG90eXBlLmdldFkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueTtcclxufTtcclxuXHJcblBvaW50RC5wcm90b3R5cGUuc2V0WCA9IGZ1bmN0aW9uICh4KVxyXG57XHJcbiAgdGhpcy54ID0geDtcclxufTtcclxuXHJcblBvaW50RC5wcm90b3R5cGUuc2V0WSA9IGZ1bmN0aW9uICh5KVxyXG57XHJcbiAgdGhpcy55ID0geTtcclxufTtcclxuXHJcblBvaW50RC5wcm90b3R5cGUuZ2V0RGlmZmVyZW5jZSA9IGZ1bmN0aW9uIChwdClcclxue1xyXG4gIHJldHVybiBuZXcgRGltZW5zaW9uRCh0aGlzLnggLSBwdC54LCB0aGlzLnkgLSBwdC55KTtcclxufTtcclxuXHJcblBvaW50RC5wcm90b3R5cGUuZ2V0Q29weSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gbmV3IFBvaW50RCh0aGlzLngsIHRoaXMueSk7XHJcbn07XHJcblxyXG5Qb2ludEQucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChkaW0pXHJcbntcclxuICB0aGlzLnggKz0gZGltLndpZHRoO1xyXG4gIHRoaXMueSArPSBkaW0uaGVpZ2h0O1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb2ludEQ7XHJcbiIsImZ1bmN0aW9uIFJhbmRvbVNlZWQoKSB7XHJcbn1cclxuUmFuZG9tU2VlZC5zZWVkID0gMTtcclxuUmFuZG9tU2VlZC54ID0gMDtcclxuXHJcblJhbmRvbVNlZWQubmV4dERvdWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICBSYW5kb21TZWVkLnggPSBNYXRoLnNpbihSYW5kb21TZWVkLnNlZWQrKykgKiAxMDAwMDtcclxuICByZXR1cm4gUmFuZG9tU2VlZC54IC0gTWF0aC5mbG9vcihSYW5kb21TZWVkLngpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSYW5kb21TZWVkO1xyXG4iLCJmdW5jdGlvbiBSZWN0YW5nbGVEKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcclxuICB0aGlzLnggPSAwO1xyXG4gIHRoaXMueSA9IDA7XHJcbiAgdGhpcy53aWR0aCA9IDA7XHJcbiAgdGhpcy5oZWlnaHQgPSAwO1xyXG5cclxuICBpZiAoeCAhPSBudWxsICYmIHkgIT0gbnVsbCAmJiB3aWR0aCAhPSBudWxsICYmIGhlaWdodCAhPSBudWxsKSB7XHJcbiAgICB0aGlzLnggPSB4O1xyXG4gICAgdGhpcy55ID0geTtcclxuICAgIHRoaXMud2lkdGggPSB3aWR0aDtcclxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG4gIH1cclxufVxyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0WCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy54O1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuc2V0WCA9IGZ1bmN0aW9uICh4KVxyXG57XHJcbiAgdGhpcy54ID0geDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldFkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueTtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLnNldFkgPSBmdW5jdGlvbiAoeSlcclxue1xyXG4gIHRoaXMueSA9IHk7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy53aWR0aDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLnNldFdpZHRoID0gZnVuY3Rpb24gKHdpZHRoKVxyXG57XHJcbiAgdGhpcy53aWR0aCA9IHdpZHRoO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0SGVpZ2h0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmhlaWdodDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLnNldEhlaWdodCA9IGZ1bmN0aW9uIChoZWlnaHQpXHJcbntcclxuICB0aGlzLmhlaWdodCA9IGhlaWdodDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldFJpZ2h0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnggKyB0aGlzLndpZHRoO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0Qm90dG9tID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmludGVyc2VjdHMgPSBmdW5jdGlvbiAoYSlcclxue1xyXG4gIGlmICh0aGlzLmdldFJpZ2h0KCkgPCBhLngpXHJcbiAge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgaWYgKHRoaXMuZ2V0Qm90dG9tKCkgPCBhLnkpXHJcbiAge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgaWYgKGEuZ2V0UmlnaHQoKSA8IHRoaXMueClcclxuICB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpZiAoYS5nZXRCb3R0b20oKSA8IHRoaXMueSlcclxuICB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldENlbnRlclggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueCArIHRoaXMud2lkdGggLyAyO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0TWluWCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5nZXRYKCk7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRNYXhYID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmdldFgoKSArIHRoaXMud2lkdGg7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRDZW50ZXJZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodCAvIDI7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRNaW5ZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmdldFkoKTtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldE1heFkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuZ2V0WSgpICsgdGhpcy5oZWlnaHQ7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRXaWR0aEhhbGYgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMud2lkdGggLyAyO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0SGVpZ2h0SGFsZiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5oZWlnaHQgLyAyO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWN0YW5nbGVEO1xyXG4iLCJmdW5jdGlvbiBUcmFuc2Zvcm0oeCwgeSkge1xyXG4gIHRoaXMubHdvcmxkT3JnWCA9IDAuMDtcclxuICB0aGlzLmx3b3JsZE9yZ1kgPSAwLjA7XHJcbiAgdGhpcy5sZGV2aWNlT3JnWCA9IDAuMDtcclxuICB0aGlzLmxkZXZpY2VPcmdZID0gMC4wO1xyXG4gIHRoaXMubHdvcmxkRXh0WCA9IDEuMDtcclxuICB0aGlzLmx3b3JsZEV4dFkgPSAxLjA7XHJcbiAgdGhpcy5sZGV2aWNlRXh0WCA9IDEuMDtcclxuICB0aGlzLmxkZXZpY2VFeHRZID0gMS4wO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFdvcmxkT3JnWCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sd29ybGRPcmdYO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldFdvcmxkT3JnWCA9IGZ1bmN0aW9uICh3b3gpXHJcbntcclxuICB0aGlzLmx3b3JsZE9yZ1ggPSB3b3g7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0V29ybGRPcmdZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmx3b3JsZE9yZ1k7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0V29ybGRPcmdZID0gZnVuY3Rpb24gKHdveSlcclxue1xyXG4gIHRoaXMubHdvcmxkT3JnWSA9IHdveTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXRXb3JsZEV4dFggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubHdvcmxkRXh0WDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRXb3JsZEV4dFggPSBmdW5jdGlvbiAod2V4KVxyXG57XHJcbiAgdGhpcy5sd29ybGRFeHRYID0gd2V4O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFdvcmxkRXh0WSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sd29ybGRFeHRZO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldFdvcmxkRXh0WSA9IGZ1bmN0aW9uICh3ZXkpXHJcbntcclxuICB0aGlzLmx3b3JsZEV4dFkgPSB3ZXk7XHJcbn1cclxuXHJcbi8qIERldmljZSByZWxhdGVkICovXHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZU9yZ1ggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGRldmljZU9yZ1g7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGV2aWNlT3JnWCA9IGZ1bmN0aW9uIChkb3gpXHJcbntcclxuICB0aGlzLmxkZXZpY2VPcmdYID0gZG94O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZU9yZ1kgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGRldmljZU9yZ1k7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGV2aWNlT3JnWSA9IGZ1bmN0aW9uIChkb3kpXHJcbntcclxuICB0aGlzLmxkZXZpY2VPcmdZID0gZG95O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZUV4dFggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGRldmljZUV4dFg7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGV2aWNlRXh0WCA9IGZ1bmN0aW9uIChkZXgpXHJcbntcclxuICB0aGlzLmxkZXZpY2VFeHRYID0gZGV4O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZUV4dFkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGRldmljZUV4dFk7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGV2aWNlRXh0WSA9IGZ1bmN0aW9uIChkZXkpXHJcbntcclxuICB0aGlzLmxkZXZpY2VFeHRZID0gZGV5O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnRyYW5zZm9ybVggPSBmdW5jdGlvbiAoeClcclxue1xyXG4gIHZhciB4RGV2aWNlID0gMC4wO1xyXG4gIHZhciB3b3JsZEV4dFggPSB0aGlzLmx3b3JsZEV4dFg7XHJcbiAgaWYgKHdvcmxkRXh0WCAhPSAwLjApXHJcbiAge1xyXG4gICAgeERldmljZSA9IHRoaXMubGRldmljZU9yZ1ggK1xyXG4gICAgICAgICAgICAoKHggLSB0aGlzLmx3b3JsZE9yZ1gpICogdGhpcy5sZGV2aWNlRXh0WCAvIHdvcmxkRXh0WCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4geERldmljZTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS50cmFuc2Zvcm1ZID0gZnVuY3Rpb24gKHkpXHJcbntcclxuICB2YXIgeURldmljZSA9IDAuMDtcclxuICB2YXIgd29ybGRFeHRZID0gdGhpcy5sd29ybGRFeHRZO1xyXG4gIGlmICh3b3JsZEV4dFkgIT0gMC4wKVxyXG4gIHtcclxuICAgIHlEZXZpY2UgPSB0aGlzLmxkZXZpY2VPcmdZICtcclxuICAgICAgICAgICAgKCh5IC0gdGhpcy5sd29ybGRPcmdZKSAqIHRoaXMubGRldmljZUV4dFkgLyB3b3JsZEV4dFkpO1xyXG4gIH1cclxuXHJcblxyXG4gIHJldHVybiB5RGV2aWNlO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmludmVyc2VUcmFuc2Zvcm1YID0gZnVuY3Rpb24gKHgpXHJcbntcclxuICB2YXIgeFdvcmxkID0gMC4wO1xyXG4gIHZhciBkZXZpY2VFeHRYID0gdGhpcy5sZGV2aWNlRXh0WDtcclxuICBpZiAoZGV2aWNlRXh0WCAhPSAwLjApXHJcbiAge1xyXG4gICAgeFdvcmxkID0gdGhpcy5sd29ybGRPcmdYICtcclxuICAgICAgICAgICAgKCh4IC0gdGhpcy5sZGV2aWNlT3JnWCkgKiB0aGlzLmx3b3JsZEV4dFggLyBkZXZpY2VFeHRYKTtcclxuICB9XHJcblxyXG5cclxuICByZXR1cm4geFdvcmxkO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmludmVyc2VUcmFuc2Zvcm1ZID0gZnVuY3Rpb24gKHkpXHJcbntcclxuICB2YXIgeVdvcmxkID0gMC4wO1xyXG4gIHZhciBkZXZpY2VFeHRZID0gdGhpcy5sZGV2aWNlRXh0WTtcclxuICBpZiAoZGV2aWNlRXh0WSAhPSAwLjApXHJcbiAge1xyXG4gICAgeVdvcmxkID0gdGhpcy5sd29ybGRPcmdZICtcclxuICAgICAgICAgICAgKCh5IC0gdGhpcy5sZGV2aWNlT3JnWSkgKiB0aGlzLmx3b3JsZEV4dFkgLyBkZXZpY2VFeHRZKTtcclxuICB9XHJcbiAgcmV0dXJuIHlXb3JsZDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5pbnZlcnNlVHJhbnNmb3JtUG9pbnQgPSBmdW5jdGlvbiAoaW5Qb2ludClcclxue1xyXG4gIHZhciBvdXRQb2ludCA9XHJcbiAgICAgICAgICBuZXcgUG9pbnREKHRoaXMuaW52ZXJzZVRyYW5zZm9ybVgoaW5Qb2ludC54KSxcclxuICAgICAgICAgICAgICAgICAgdGhpcy5pbnZlcnNlVHJhbnNmb3JtWShpblBvaW50LnkpKTtcclxuICByZXR1cm4gb3V0UG9pbnQ7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtO1xyXG4iLCJmdW5jdGlvbiBVbmlxdWVJREdlbmVyZXRvcigpIHtcclxufVxyXG5cclxuVW5pcXVlSURHZW5lcmV0b3IubGFzdElEID0gMDtcclxuXHJcblVuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIGlmIChVbmlxdWVJREdlbmVyZXRvci5pc1ByaW1pdGl2ZShvYmopKSB7XHJcbiAgICByZXR1cm4gb2JqO1xyXG4gIH1cclxuICBpZiAob2JqLnVuaXF1ZUlEICE9IG51bGwpIHtcclxuICAgIHJldHVybiBvYmoudW5pcXVlSUQ7XHJcbiAgfVxyXG4gIG9iai51bmlxdWVJRCA9IFVuaXF1ZUlER2VuZXJldG9yLmdldFN0cmluZygpO1xyXG4gIFVuaXF1ZUlER2VuZXJldG9yLmxhc3RJRCsrO1xyXG4gIHJldHVybiBvYmoudW5pcXVlSUQ7XHJcbn1cclxuXHJcblVuaXF1ZUlER2VuZXJldG9yLmdldFN0cmluZyA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIGlmIChpZCA9PSBudWxsKVxyXG4gICAgaWQgPSBVbmlxdWVJREdlbmVyZXRvci5sYXN0SUQ7XHJcbiAgcmV0dXJuIFwiT2JqZWN0I1wiICsgaWQgKyBcIlwiO1xyXG59XHJcblxyXG5VbmlxdWVJREdlbmVyZXRvci5pc1ByaW1pdGl2ZSA9IGZ1bmN0aW9uIChhcmcpIHtcclxuICB2YXIgdHlwZSA9IHR5cGVvZiBhcmc7XHJcbiAgcmV0dXJuIGFyZyA9PSBudWxsIHx8ICh0eXBlICE9IFwib2JqZWN0XCIgJiYgdHlwZSAhPSBcImZ1bmN0aW9uXCIpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFVuaXF1ZUlER2VuZXJldG9yO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgVGhyZWFkO1xyXG5cclxudmFyIERpbWVuc2lvbkQgPSByZXF1aXJlKCcuL0RpbWVuc2lvbkQnKTtcclxudmFyIEhhc2hNYXAgPSByZXF1aXJlKCcuL0hhc2hNYXAnKTtcclxudmFyIEhhc2hTZXQgPSByZXF1aXJlKCcuL0hhc2hTZXQnKTtcclxudmFyIElHZW9tZXRyeSA9IHJlcXVpcmUoJy4vSUdlb21ldHJ5Jyk7XHJcbnZhciBJTWF0aCA9IHJlcXVpcmUoJy4vSU1hdGgnKTtcclxudmFyIEludGVnZXIgPSByZXF1aXJlKCcuL0ludGVnZXInKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9Qb2ludCcpO1xyXG52YXIgUG9pbnREID0gcmVxdWlyZSgnLi9Qb2ludEQnKTtcclxudmFyIFJhbmRvbVNlZWQgPSByZXF1aXJlKCcuL1JhbmRvbVNlZWQnKTtcclxudmFyIFJlY3RhbmdsZUQgPSByZXF1aXJlKCcuL1JlY3RhbmdsZUQnKTtcclxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyk7XHJcbnZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcclxudmFyIExHcmFwaE9iamVjdCA9IHJlcXVpcmUoJy4vTEdyYXBoT2JqZWN0Jyk7XHJcbnZhciBMR3JhcGggPSByZXF1aXJlKCcuL0xHcmFwaCcpO1xyXG52YXIgTEVkZ2UgPSByZXF1aXJlKCcuL0xFZGdlJyk7XHJcbnZhciBMR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9MR3JhcGhNYW5hZ2VyJyk7XHJcbnZhciBMTm9kZSA9IHJlcXVpcmUoJy4vTE5vZGUnKTtcclxudmFyIExheW91dCA9IHJlcXVpcmUoJy4vTGF5b3V0Jyk7XHJcbnZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xyXG52YXIgRkRMYXlvdXQgPSByZXF1aXJlKCcuL0ZETGF5b3V0Jyk7XHJcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcclxudmFyIEZETGF5b3V0RWRnZSA9IHJlcXVpcmUoJy4vRkRMYXlvdXRFZGdlJyk7XHJcbnZhciBGRExheW91dE5vZGUgPSByZXF1aXJlKCcuL0ZETGF5b3V0Tm9kZScpO1xyXG52YXIgQ29TRUNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQ29TRUNvbnN0YW50cycpO1xyXG52YXIgQ29TRUVkZ2UgPSByZXF1aXJlKCcuL0NvU0VFZGdlJyk7XHJcbnZhciBDb1NFR3JhcGggPSByZXF1aXJlKCcuL0NvU0VHcmFwaCcpO1xyXG52YXIgQ29TRUdyYXBoTWFuYWdlciA9IHJlcXVpcmUoJy4vQ29TRUdyYXBoTWFuYWdlcicpO1xyXG52YXIgQ29TRUxheW91dCA9IHJlcXVpcmUoJy4vQ29TRUxheW91dCcpO1xyXG52YXIgQ29TRU5vZGUgPSByZXF1aXJlKCcuL0NvU0VOb2RlJyk7XHJcbnZhciBsYXlvdXRPcHRpb25zUGFjayA9IHJlcXVpcmUoJy4vbGF5b3V0T3B0aW9uc1BhY2snKTtcclxuXHJcbmxheW91dE9wdGlvbnNQYWNrLmxheW91dFF1YWxpdHk7IC8vIHByb29mLCBkZWZhdWx0LCBkcmFmdFxyXG5sYXlvdXRPcHRpb25zUGFjay5hbmltYXRpb25EdXJpbmdMYXlvdXQ7IC8vIFQtRlxyXG5sYXlvdXRPcHRpb25zUGFjay5hbmltYXRpb25PbkxheW91dDsgLy8gVC1GXHJcbmxheW91dE9wdGlvbnNQYWNrLmFuaW1hdGlvblBlcmlvZDsgLy8gMC0xMDBcclxubGF5b3V0T3B0aW9uc1BhY2suaW5jcmVtZW50YWw7IC8vIFQtRlxyXG5sYXlvdXRPcHRpb25zUGFjay5jcmVhdGVCZW5kc0FzTmVlZGVkOyAvLyBULUZcclxubGF5b3V0T3B0aW9uc1BhY2sudW5pZm9ybUxlYWZOb2RlU2l6ZXM7IC8vIFQtRlxyXG5cclxubGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdExheW91dFF1YWxpdHkgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9RVUFMSVRZO1xyXG5sYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0QW5pbWF0aW9uRHVyaW5nTGF5b3V0ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX0RVUklOR19MQVlPVVQ7XHJcbmxheW91dE9wdGlvbnNQYWNrLmRlZmF1bHRBbmltYXRpb25PbkxheW91dCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9PTl9MQVlPVVQ7XHJcbmxheW91dE9wdGlvbnNQYWNrLmRlZmF1bHRBbmltYXRpb25QZXJpb2QgPSA1MDtcclxubGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdEluY3JlbWVudGFsID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUw7XHJcbmxheW91dE9wdGlvbnNQYWNrLmRlZmF1bHRDcmVhdGVCZW5kc0FzTmVlZGVkID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ1JFQVRFX0JFTkRTX0FTX05FRURFRDtcclxubGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdFVuaWZvcm1MZWFmTm9kZVNpemVzID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVU5JRk9STV9MRUFGX05PREVfU0laRVM7XHJcblxyXG5mdW5jdGlvbiBzZXREZWZhdWx0TGF5b3V0UHJvcGVydGllcygpIHtcclxuICBsYXlvdXRPcHRpb25zUGFjay5sYXlvdXRRdWFsaXR5ID0gbGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdExheW91dFF1YWxpdHk7XHJcbiAgbGF5b3V0T3B0aW9uc1BhY2suYW5pbWF0aW9uRHVyaW5nTGF5b3V0ID0gbGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdEFuaW1hdGlvbkR1cmluZ0xheW91dDtcclxuICBsYXlvdXRPcHRpb25zUGFjay5hbmltYXRpb25PbkxheW91dCA9IGxheW91dE9wdGlvbnNQYWNrLmRlZmF1bHRBbmltYXRpb25PbkxheW91dDtcclxuICBsYXlvdXRPcHRpb25zUGFjay5hbmltYXRpb25QZXJpb2QgPSBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0QW5pbWF0aW9uUGVyaW9kO1xyXG4gIGxheW91dE9wdGlvbnNQYWNrLmluY3JlbWVudGFsID0gbGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdEluY3JlbWVudGFsO1xyXG4gIGxheW91dE9wdGlvbnNQYWNrLmNyZWF0ZUJlbmRzQXNOZWVkZWQgPSBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0Q3JlYXRlQmVuZHNBc05lZWRlZDtcclxuICBsYXlvdXRPcHRpb25zUGFjay51bmlmb3JtTGVhZk5vZGVTaXplcyA9IGxheW91dE9wdGlvbnNQYWNrLmRlZmF1bHRVbmlmb3JtTGVhZk5vZGVTaXplcztcclxufVxyXG5cclxuc2V0RGVmYXVsdExheW91dFByb3BlcnRpZXMoKTtcclxuXHJcbmZ1bmN0aW9uIGZpbGxDb3NlTGF5b3V0T3B0aW9uc1BhY2soKSB7XHJcbiAgbGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdElkZWFsRWRnZUxlbmd0aCA9IENvU0VDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcclxuICBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0U3ByaW5nU3RyZW5ndGggPSA1MDtcclxuICBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0UmVwdWxzaW9uU3RyZW5ndGggPSA1MDtcclxuICBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0U21hcnRSZXB1bHNpb25SYW5nZUNhbGMgPSBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfVVNFX1NNQVJUX1JFUFVMU0lPTl9SQU5HRV9DQUxDVUxBVElPTjtcclxuICBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0R3Jhdml0eVN0cmVuZ3RoID0gNTA7XHJcbiAgbGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdEdyYXZpdHlSYW5nZSA9IDUwO1xyXG4gIGxheW91dE9wdGlvbnNQYWNrLmRlZmF1bHRDb21wb3VuZEdyYXZpdHlTdHJlbmd0aCA9IDUwO1xyXG4gIGxheW91dE9wdGlvbnNQYWNrLmRlZmF1bHRDb21wb3VuZEdyYXZpdHlSYW5nZSA9IDUwO1xyXG4gIGxheW91dE9wdGlvbnNQYWNrLmRlZmF1bHRTbWFydEVkZ2VMZW5ndGhDYWxjID0gQ29TRUNvbnN0YW50cy5ERUZBVUxUX1VTRV9TTUFSVF9JREVBTF9FREdFX0xFTkdUSF9DQUxDVUxBVElPTjtcclxuICBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0TXVsdGlMZXZlbFNjYWxpbmcgPSBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfVVNFX01VTFRJX0xFVkVMX1NDQUxJTkc7XHJcblxyXG4gIGxheW91dE9wdGlvbnNQYWNrLmlkZWFsRWRnZUxlbmd0aCA9IGxheW91dE9wdGlvbnNQYWNrLmRlZmF1bHRJZGVhbEVkZ2VMZW5ndGg7XHJcbiAgbGF5b3V0T3B0aW9uc1BhY2suc3ByaW5nU3RyZW5ndGggPSBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0U3ByaW5nU3RyZW5ndGg7XHJcbiAgbGF5b3V0T3B0aW9uc1BhY2sucmVwdWxzaW9uU3RyZW5ndGggPSBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0UmVwdWxzaW9uU3RyZW5ndGg7XHJcbiAgbGF5b3V0T3B0aW9uc1BhY2suc21hcnRSZXB1bHNpb25SYW5nZUNhbGMgPSBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0U21hcnRSZXB1bHNpb25SYW5nZUNhbGM7XHJcbiAgbGF5b3V0T3B0aW9uc1BhY2suZ3Jhdml0eVN0cmVuZ3RoID0gbGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdEdyYXZpdHlTdHJlbmd0aDtcclxuICBsYXlvdXRPcHRpb25zUGFjay5ncmF2aXR5UmFuZ2UgPSBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0R3Jhdml0eVJhbmdlO1xyXG4gIGxheW91dE9wdGlvbnNQYWNrLmNvbXBvdW5kR3Jhdml0eVN0cmVuZ3RoID0gbGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdENvbXBvdW5kR3Jhdml0eVN0cmVuZ3RoO1xyXG4gIGxheW91dE9wdGlvbnNQYWNrLmNvbXBvdW5kR3Jhdml0eVJhbmdlID0gbGF5b3V0T3B0aW9uc1BhY2suZGVmYXVsdENvbXBvdW5kR3Jhdml0eVJhbmdlO1xyXG4gIGxheW91dE9wdGlvbnNQYWNrLnNtYXJ0RWRnZUxlbmd0aENhbGMgPSBsYXlvdXRPcHRpb25zUGFjay5kZWZhdWx0U21hcnRFZGdlTGVuZ3RoQ2FsYztcclxuICBsYXlvdXRPcHRpb25zUGFjay5tdWx0aUxldmVsU2NhbGluZyA9IGxheW91dE9wdGlvbnNQYWNrLmRlZmF1bHRNdWx0aUxldmVsU2NhbGluZztcclxufVxyXG5cclxuX0NvU0VMYXlvdXQuaWRUb0xOb2RlID0ge307XHJcbl9Db1NFTGF5b3V0LnRvQmVUaWxlZCA9IHt9O1xyXG5cclxudmFyIGRlZmF1bHRzID0ge1xyXG4gIC8vIENhbGxlZCBvbiBgbGF5b3V0cmVhZHlgXHJcbiAgcmVhZHk6IGZ1bmN0aW9uICgpIHtcclxuICB9LFxyXG4gIC8vIENhbGxlZCBvbiBgbGF5b3V0c3RvcGBcclxuICBzdG9wOiBmdW5jdGlvbiAoKSB7XHJcbiAgfSxcclxuICAvLyBXaGV0aGVyIHRvIGZpdCB0aGUgbmV0d29yayB2aWV3IGFmdGVyIHdoZW4gZG9uZVxyXG4gIGZpdDogdHJ1ZSxcclxuICAvLyBQYWRkaW5nIG9uIGZpdFxyXG4gIHBhZGRpbmc6IDEwLFxyXG4gIC8vIFdoZXRoZXIgdG8gZW5hYmxlIGluY3JlbWVudGFsIG1vZGVcclxuICByYW5kb21pemU6IHRydWUsXHJcbiAgLy8gTm9kZSByZXB1bHNpb24gKG5vbiBvdmVybGFwcGluZykgbXVsdGlwbGllclxyXG4gIG5vZGVSZXB1bHNpb246IDQ1MDAsXHJcbiAgLy8gSWRlYWwgZWRnZSAobm9uIG5lc3RlZCkgbGVuZ3RoXHJcbiAgaWRlYWxFZGdlTGVuZ3RoOiA1MCxcclxuICAvLyBEaXZpc29yIHRvIGNvbXB1dGUgZWRnZSBmb3JjZXNcclxuICBlZGdlRWxhc3RpY2l0eTogMC40NSxcclxuICAvLyBOZXN0aW5nIGZhY3RvciAobXVsdGlwbGllcikgdG8gY29tcHV0ZSBpZGVhbCBlZGdlIGxlbmd0aCBmb3IgbmVzdGVkIGVkZ2VzXHJcbiAgbmVzdGluZ0ZhY3RvcjogMC4xLFxyXG4gIC8vIEdyYXZpdHkgZm9yY2UgKGNvbnN0YW50KVxyXG4gIGdyYXZpdHk6IDAuMjUsXHJcbiAgLy8gTWF4aW11bSBudW1iZXIgb2YgaXRlcmF0aW9ucyB0byBwZXJmb3JtXHJcbiAgbnVtSXRlcjogMjUwMCxcclxuICAvLyBGb3IgZW5hYmxpbmcgdGlsaW5nXHJcbiAgdGlsZTogdHJ1ZSxcclxuICAvL3doZXRoZXIgdG8gbWFrZSBhbmltYXRpb24gd2hpbGUgcGVyZm9ybWluZyB0aGUgbGF5b3V0XHJcbiAgYW5pbWF0ZTogJ2VuZCcsXHJcbiAgLy9yZXByZXNlbnRzIHRoZSBhbW91bnQgb2YgdGhlIHZlcnRpY2FsIHNwYWNlIHRvIHB1dCBiZXR3ZWVuIHRoZSB6ZXJvIGRlZ3JlZSBtZW1iZXJzIGR1cmluZyB0aGUgdGlsaW5nIG9wZXJhdGlvbihjYW4gYWxzbyBiZSBhIGZ1bmN0aW9uKVxyXG4gIHRpbGluZ1BhZGRpbmdWZXJ0aWNhbDogMTAsXHJcbiAgLy9yZXByZXNlbnRzIHRoZSBhbW91bnQgb2YgdGhlIGhvcml6b250YWwgc3BhY2UgdG8gcHV0IGJldHdlZW4gdGhlIHplcm8gZGVncmVlIG1lbWJlcnMgZHVyaW5nIHRoZSB0aWxpbmcgb3BlcmF0aW9uKGNhbiBhbHNvIGJlIGEgZnVuY3Rpb24pXHJcbiAgdGlsaW5nUGFkZGluZ0hvcml6b250YWw6IDEwXHJcbn07XHJcblxyXG5mdW5jdGlvbiBleHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpIHtcclxuICB2YXIgb2JqID0ge307XHJcblxyXG4gIGZvciAodmFyIGkgaW4gZGVmYXVsdHMpIHtcclxuICAgIG9ialtpXSA9IGRlZmF1bHRzW2ldO1xyXG4gIH1cclxuXHJcbiAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XHJcbiAgICBvYmpbaV0gPSBvcHRpb25zW2ldO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG9iajtcclxufVxyXG47XHJcblxyXG5fQ29TRUxheW91dC5sYXlvdXQgPSBuZXcgQ29TRUxheW91dCgpO1xyXG5mdW5jdGlvbiBfQ29TRUxheW91dChvcHRpb25zKSB7XHJcblxyXG4gIHRoaXMub3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XHJcbiAgRkRMYXlvdXRDb25zdGFudHMuZ2V0VXNlck9wdGlvbnModGhpcy5vcHRpb25zKTtcclxuICBmaWxsQ29zZUxheW91dE9wdGlvbnNQYWNrKCk7XHJcbn1cclxuXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGxheW91dCA9IHRoaXM7XHJcblxyXG4gIF9Db1NFTGF5b3V0LmlkVG9MTm9kZSA9IHt9O1xyXG4gIF9Db1NFTGF5b3V0LnRvQmVUaWxlZCA9IHt9O1xyXG4gIF9Db1NFTGF5b3V0LmxheW91dCA9IG5ldyBDb1NFTGF5b3V0KCk7XHJcbiAgdGhpcy5jeSA9IHRoaXMub3B0aW9ucy5jeTtcclxuICB2YXIgYWZ0ZXIgPSB0aGlzO1xyXG5cclxuICB0aGlzLmN5LnRyaWdnZXIoJ2xheW91dHN0YXJ0Jyk7XHJcblxyXG4gIHZhciBnbSA9IF9Db1NFTGF5b3V0LmxheW91dC5uZXdHcmFwaE1hbmFnZXIoKTtcclxuICB0aGlzLmdtID0gZ207XHJcblxyXG4gIHZhciBub2RlcyA9IHRoaXMub3B0aW9ucy5lbGVzLm5vZGVzKCk7XHJcbiAgdmFyIGVkZ2VzID0gdGhpcy5vcHRpb25zLmVsZXMuZWRnZXMoKTtcclxuXHJcbiAgdGhpcy5yb290ID0gZ20uYWRkUm9vdCgpO1xyXG5cclxuICBpZiAoIXRoaXMub3B0aW9ucy50aWxlKSB7XHJcbiAgICB0aGlzLnByb2Nlc3NDaGlsZHJlbkxpc3QodGhpcy5yb290LCBfQ29TRUxheW91dC5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpKTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICAvLyBGaW5kIHplcm8gZGVncmVlIG5vZGVzIGFuZCBjcmVhdGUgYSBjb21wb3VuZCBmb3IgZWFjaCBsZXZlbFxyXG4gICAgdmFyIG1lbWJlckdyb3VwcyA9IHRoaXMuZ3JvdXBaZXJvRGVncmVlTWVtYmVycygpO1xyXG4gICAgLy8gVGlsZSBhbmQgY2xlYXIgY2hpbGRyZW4gb2YgZWFjaCBjb21wb3VuZFxyXG4gICAgdmFyIHRpbGVkTWVtYmVyUGFjayA9IHRoaXMuY2xlYXJDb21wb3VuZHModGhpcy5vcHRpb25zKTtcclxuICAgIC8vIFNlcGFyYXRlbHkgdGlsZSBhbmQgY2xlYXIgemVybyBkZWdyZWUgbm9kZXMgZm9yIGVhY2ggbGV2ZWxcclxuICAgIHZhciB0aWxlZFplcm9EZWdyZWVOb2RlcyA9IHRoaXMuY2xlYXJaZXJvRGVncmVlTWVtYmVycyhtZW1iZXJHcm91cHMpO1xyXG4gIH1cclxuXHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICB2YXIgc291cmNlTm9kZSA9IF9Db1NFTGF5b3V0LmlkVG9MTm9kZVtlZGdlLmRhdGEoXCJzb3VyY2VcIildO1xyXG4gICAgdmFyIHRhcmdldE5vZGUgPSBfQ29TRUxheW91dC5pZFRvTE5vZGVbZWRnZS5kYXRhKFwidGFyZ2V0XCIpXTtcclxuICAgIHZhciBlMSA9IGdtLmFkZChfQ29TRUxheW91dC5sYXlvdXQubmV3RWRnZSgpLCBzb3VyY2VOb2RlLCB0YXJnZXROb2RlKTtcclxuICAgIGUxLmlkID0gZWRnZS5pZCgpO1xyXG4gIH1cclxuXHJcblxyXG4gIHZhciB0MSA9IGxheW91dC50aHJlYWQ7XHJcblxyXG4gIGlmICghdDEgfHwgdDEuc3RvcHBlZCgpKSB7IC8vIHRyeSB0byByZXVzZSB0aHJlYWRzXHJcbiAgICB0MSA9IGxheW91dC50aHJlYWQgPSBUaHJlYWQoKTtcclxuXHJcbiAgICB0MS5yZXF1aXJlKERpbWVuc2lvbkQsICdEaW1lbnNpb25EJyk7XHJcbiAgICB0MS5yZXF1aXJlKEhhc2hNYXAsICdIYXNoTWFwJyk7XHJcbiAgICB0MS5yZXF1aXJlKEhhc2hTZXQsICdIYXNoU2V0Jyk7XHJcbiAgICB0MS5yZXF1aXJlKElHZW9tZXRyeSwgJ0lHZW9tZXRyeScpO1xyXG4gICAgdDEucmVxdWlyZShJTWF0aCwgJ0lNYXRoJyk7XHJcbiAgICB0MS5yZXF1aXJlKEludGVnZXIsICdJbnRlZ2VyJyk7XHJcbiAgICB0MS5yZXF1aXJlKFBvaW50LCAnUG9pbnQnKTtcclxuICAgIHQxLnJlcXVpcmUoUG9pbnRELCAnUG9pbnREJyk7XHJcbiAgICB0MS5yZXF1aXJlKFJhbmRvbVNlZWQsICdSYW5kb21TZWVkJyk7XHJcbiAgICB0MS5yZXF1aXJlKFJlY3RhbmdsZUQsICdSZWN0YW5nbGVEJyk7XHJcbiAgICB0MS5yZXF1aXJlKFRyYW5zZm9ybSwgJ1RyYW5zZm9ybScpO1xyXG4gICAgdDEucmVxdWlyZShVbmlxdWVJREdlbmVyZXRvciwgJ1VuaXF1ZUlER2VuZXJldG9yJyk7XHJcbiAgICB0MS5yZXF1aXJlKExHcmFwaE9iamVjdCwgJ0xHcmFwaE9iamVjdCcpO1xyXG4gICAgdDEucmVxdWlyZShMR3JhcGgsICdMR3JhcGgnKTtcclxuICAgIHQxLnJlcXVpcmUoTEVkZ2UsICdMRWRnZScpO1xyXG4gICAgdDEucmVxdWlyZShMR3JhcGhNYW5hZ2VyLCAnTEdyYXBoTWFuYWdlcicpO1xyXG4gICAgdDEucmVxdWlyZShMTm9kZSwgJ0xOb2RlJyk7XHJcbiAgICB0MS5yZXF1aXJlKExheW91dCwgJ0xheW91dCcpO1xyXG4gICAgdDEucmVxdWlyZShMYXlvdXRDb25zdGFudHMsICdMYXlvdXRDb25zdGFudHMnKTtcclxuICAgIHQxLnJlcXVpcmUobGF5b3V0T3B0aW9uc1BhY2ssICdsYXlvdXRPcHRpb25zUGFjaycpO1xyXG4gICAgdDEucmVxdWlyZShGRExheW91dCwgJ0ZETGF5b3V0Jyk7XHJcbiAgICB0MS5yZXF1aXJlKEZETGF5b3V0Q29uc3RhbnRzLCAnRkRMYXlvdXRDb25zdGFudHMnKTtcclxuICAgIHQxLnJlcXVpcmUoRkRMYXlvdXRFZGdlLCAnRkRMYXlvdXRFZGdlJyk7XHJcbiAgICB0MS5yZXF1aXJlKEZETGF5b3V0Tm9kZSwgJ0ZETGF5b3V0Tm9kZScpO1xyXG4gICAgdDEucmVxdWlyZShDb1NFQ29uc3RhbnRzLCAnQ29TRUNvbnN0YW50cycpO1xyXG4gICAgdDEucmVxdWlyZShDb1NFRWRnZSwgJ0NvU0VFZGdlJyk7XHJcbiAgICB0MS5yZXF1aXJlKENvU0VHcmFwaCwgJ0NvU0VHcmFwaCcpO1xyXG4gICAgdDEucmVxdWlyZShDb1NFR3JhcGhNYW5hZ2VyLCAnQ29TRUdyYXBoTWFuYWdlcicpO1xyXG4gICAgdDEucmVxdWlyZShDb1NFTGF5b3V0LCAnQ29TRUxheW91dCcpO1xyXG4gICAgdDEucmVxdWlyZShDb1NFTm9kZSwgJ0NvU0VOb2RlJyk7XHJcbiAgfVxyXG5cclxuICB2YXIgbm9kZXMgPSB0aGlzLm9wdGlvbnMuZWxlcy5ub2RlcygpO1xyXG4gIHZhciBlZGdlcyA9IHRoaXMub3B0aW9ucy5lbGVzLmVkZ2VzKCk7XHJcblxyXG4gIC8vIEZpcnN0IEkgbmVlZCB0byBjcmVhdGUgdGhlIGRhdGEgc3RydWN0dXJlIHRvIHBhc3MgdG8gdGhlIHdvcmtlclxyXG4gIHZhciBwRGF0YSA9IHtcclxuICAgICdub2Rlcyc6IFtdLFxyXG4gICAgJ2VkZ2VzJzogW11cclxuICB9O1xyXG5cclxuICAvL01hcCB0aGUgaWRzIG9mIG5vZGVzIGluIHRoZSBsaXN0IHRvIGNoZWNrIGlmIGEgbm9kZSBpcyBpbiB0aGUgbGlzdCBpbiBjb25zdGFudCB0aW1lXHJcbiAgdmFyIG5vZGVJZE1hcCA9IHt9O1xyXG4gIFxyXG4gIC8vRmlsbCB0aGUgbWFwIGluIGxpbmVhciB0aW1lXHJcbiAgZm9yKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKXtcclxuICAgIG5vZGVJZE1hcFtub2Rlc1tpXS5pZCgpXSA9IHRydWU7XHJcbiAgfVxyXG5cclxuICB2YXIgbG5vZGVzID0gZ20uZ2V0QWxsTm9kZXMoKTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxub2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIGxub2RlID0gbG5vZGVzW2ldO1xyXG4gICAgdmFyIG5vZGVJZCA9IGxub2RlLmlkO1xyXG4gICAgdmFyIGN5Tm9kZSA9IHRoaXMub3B0aW9ucy5jeS5nZXRFbGVtZW50QnlJZChub2RlSWQpO1xyXG4gICAgXHJcbiAgICB2YXIgcGFyZW50SWQgPSBjeU5vZGUuZGF0YSgncGFyZW50Jyk7XHJcbiAgICBwYXJlbnRJZCA9IG5vZGVJZE1hcFtwYXJlbnRJZF0/cGFyZW50SWQ6dW5kZWZpbmVkO1xyXG4gICAgXHJcbiAgICB2YXIgdyA9IGxub2RlLnJlY3Qud2lkdGg7XHJcbiAgICB2YXIgcG9zWCA9IGxub2RlLnJlY3QueDtcclxuICAgIHZhciBwb3NZID0gbG5vZGUucmVjdC55O1xyXG4gICAgdmFyIGggPSBsbm9kZS5yZWN0LmhlaWdodDtcclxuICAgIHZhciBkdW1teV9wYXJlbnRfaWQgPSBjeU5vZGUuZGF0YSgnZHVtbXlfcGFyZW50X2lkJyk7XHJcblxyXG4gICAgcERhdGFbICdub2RlcycgXS5wdXNoKHtcclxuICAgICAgaWQ6IG5vZGVJZCxcclxuICAgICAgcGlkOiBwYXJlbnRJZCxcclxuICAgICAgeDogcG9zWCxcclxuICAgICAgeTogcG9zWSxcclxuICAgICAgd2lkdGg6IHcsXHJcbiAgICAgIGhlaWdodDogaCxcclxuICAgICAgZHVtbXlfcGFyZW50X2lkOiBkdW1teV9wYXJlbnRfaWRcclxuICAgIH0pO1xyXG5cclxuICB9XHJcblxyXG4gIHZhciBsZWRnZXMgPSBnbS5nZXRBbGxFZGdlcygpO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbGVkZ2UgPSBsZWRnZXNbaV07XHJcbiAgICB2YXIgZWRnZUlkID0gbGVkZ2UuaWQ7XHJcbiAgICB2YXIgY3lFZGdlID0gdGhpcy5vcHRpb25zLmN5LmdldEVsZW1lbnRCeUlkKGVkZ2VJZCk7XHJcbiAgICB2YXIgc3JjTm9kZUlkID0gY3lFZGdlLnNvdXJjZSgpLmlkKCk7XHJcbiAgICB2YXIgdGd0Tm9kZUlkID0gY3lFZGdlLnRhcmdldCgpLmlkKCk7XHJcbiAgICBwRGF0YVsgJ2VkZ2VzJyBdLnB1c2goe1xyXG4gICAgICBpZDogZWRnZUlkLFxyXG4gICAgICBzb3VyY2U6IHNyY05vZGVJZCxcclxuICAgICAgdGFyZ2V0OiB0Z3ROb2RlSWRcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdmFyIHJlYWR5ID0gZmFsc2U7XHJcblxyXG4gIHQxLnBhc3MocERhdGEpLnJ1bihmdW5jdGlvbiAocERhdGEpIHtcclxuICAgIHZhciBsb2cgPSBmdW5jdGlvbiAobXNnKSB7XHJcbiAgICAgIGJyb2FkY2FzdCh7bG9nOiBtc2d9KTtcclxuICAgIH07XHJcblxyXG4gICAgbG9nKFwic3RhcnQgdGhyZWFkXCIpO1xyXG5cclxuICAgIC8vdGhlIGxheW91dCB3aWxsIGJlIHJ1biBpbiB0aGUgdGhyZWFkIGFuZCB0aGUgcmVzdWx0cyBhcmUgdG8gYmUgcGFzc2VkXHJcbiAgICAvL3RvIHRoZSBtYWluIHRocmVhZCB3aXRoIHRoZSByZXN1bHQgbWFwXHJcbiAgICB2YXIgbGF5b3V0X3QgPSBuZXcgQ29TRUxheW91dCgpO1xyXG4gICAgdmFyIGdtX3QgPSBsYXlvdXRfdC5uZXdHcmFwaE1hbmFnZXIoKTtcclxuICAgIHZhciBuZ3JhcGggPSBnbV90LmxheW91dC5uZXdHcmFwaCgpO1xyXG4gICAgdmFyIG5ub2RlID0gZ21fdC5sYXlvdXQubmV3Tm9kZShudWxsKTtcclxuICAgIHZhciByb290ID0gZ21fdC5hZGQobmdyYXBoLCBubm9kZSk7XHJcbiAgICByb290LmdyYXBoTWFuYWdlciA9IGdtX3Q7XHJcbiAgICBnbV90LnNldFJvb3RHcmFwaChyb290KTtcclxuICAgIHZhciByb290X3QgPSBnbV90LnJvb3RHcmFwaDtcclxuXHJcbiAgICAvL21hcHMgZm9yIGlubmVyIHVzYWdlIG9mIHRoZSB0aHJlYWRcclxuICAgIHZhciBvcnBoYW5zX3QgPSBbXTtcclxuICAgIHZhciBpZFRvTE5vZGVfdCA9IHt9O1xyXG4gICAgdmFyIGNoaWxkcmVuTWFwID0ge307XHJcblxyXG4gICAgLy9BIG1hcCBvZiBub2RlIGlkIHRvIGNvcnJlc3BvbmRpbmcgbm9kZSBwb3NpdGlvbiBhbmQgc2l6ZXNcclxuICAgIC8vaXQgaXMgdG8gYmUgcmV0dXJuZWQgYXQgdGhlIGVuZCBvZiB0aGUgdGhyZWFkIGZ1bmN0aW9uXHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcblxyXG4gICAgLy90aGlzIGZ1bmN0aW9uIGlzIHNpbWlsYXIgdG8gcHJvY2Vzc0NoaWxkcmVuTGlzdCBmdW5jdGlvbiBpbiB0aGUgbWFpbiB0aHJlYWRcclxuICAgIC8vaXQgaXMgdG8gcHJvY2VzcyB0aGUgbm9kZXMgaW4gY29ycmVjdCBvcmRlciByZWN1cnNpdmVseVxyXG4gICAgdmFyIHByb2Nlc3NOb2RlcyA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkcmVuKSB7XHJcbiAgICAgIHZhciBzaXplID0gY2hpbGRyZW4ubGVuZ3RoO1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICAgIHZhciB0aGVDaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICAgIHZhciBjaGlsZHJlbl9vZl9jaGlsZHJlbiA9IGNoaWxkcmVuTWFwW3RoZUNoaWxkLmlkXTtcclxuICAgICAgICB2YXIgdGhlTm9kZTtcclxuXHJcbiAgICAgICAgaWYgKHRoZUNoaWxkLndpZHRoICE9IG51bGxcclxuICAgICAgICAgICAgICAgICYmIHRoZUNoaWxkLmhlaWdodCAhPSBudWxsKSB7XHJcbiAgICAgICAgICB0aGVOb2RlID0gcGFyZW50LmFkZChuZXcgQ29TRU5vZGUoZ21fdCxcclxuICAgICAgICAgICAgICAgICAgbmV3IFBvaW50RCh0aGVDaGlsZC54LCB0aGVDaGlsZC55KSxcclxuICAgICAgICAgICAgICAgICAgbmV3IERpbWVuc2lvbkQocGFyc2VGbG9hdCh0aGVDaGlsZC53aWR0aCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VGbG9hdCh0aGVDaGlsZC5oZWlnaHQpKSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIHRoZU5vZGUgPSBwYXJlbnQuYWRkKG5ldyBDb1NFTm9kZShnbV90KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoZU5vZGUuaWQgPSB0aGVDaGlsZC5pZDtcclxuICAgICAgICBpZFRvTE5vZGVfdFt0aGVDaGlsZC5pZF0gPSB0aGVOb2RlO1xyXG5cclxuICAgICAgICBpZiAoaXNOYU4odGhlTm9kZS5yZWN0LngpKSB7XHJcbiAgICAgICAgICB0aGVOb2RlLnJlY3QueCA9IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXNOYU4odGhlTm9kZS5yZWN0LnkpKSB7XHJcbiAgICAgICAgICB0aGVOb2RlLnJlY3QueSA9IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY2hpbGRyZW5fb2ZfY2hpbGRyZW4gIT0gbnVsbCAmJiBjaGlsZHJlbl9vZl9jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICB2YXIgdGhlTmV3R3JhcGg7XHJcbiAgICAgICAgICB0aGVOZXdHcmFwaCA9IGxheW91dF90LmdldEdyYXBoTWFuYWdlcigpLmFkZChsYXlvdXRfdC5uZXdHcmFwaCgpLCB0aGVOb2RlKTtcclxuICAgICAgICAgIHRoZU5ld0dyYXBoLmdyYXBoTWFuYWdlciA9IGdtX3Q7XHJcbiAgICAgICAgICBwcm9jZXNzTm9kZXModGhlTmV3R3JhcGgsIGNoaWxkcmVuX29mX2NoaWxkcmVuKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvL2ZpbGwgdGhlIGNoaWRyZW5NYXAgYW5kIG9ycGhhbnNfdCBtYXBzIHRvIHByb2Nlc3MgdGhlIG5vZGVzIGluIHRoZSBjb3JyZWN0IG9yZGVyXHJcbiAgICB2YXIgbm9kZXMgPSBwRGF0YS5ub2RlcztcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIHRoZU5vZGUgPSBub2Rlc1tpXTtcclxuICAgICAgdmFyIHBfaWQgPSB0aGVOb2RlLnBpZDtcclxuICAgICAgaWYgKHBfaWQgIT0gbnVsbCkge1xyXG4gICAgICAgIGlmIChjaGlsZHJlbk1hcFtwX2lkXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICBjaGlsZHJlbk1hcFtwX2lkXSA9IFtdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjaGlsZHJlbk1hcFtwX2lkXS5wdXNoKHRoZU5vZGUpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIG9ycGhhbnNfdC5wdXNoKHRoZU5vZGUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJvY2Vzc05vZGVzKHJvb3RfdCwgb3JwaGFuc190KTtcclxuXHJcbiAgICAvL2hhbmRsZSB0aGUgZWRnZXNcclxuICAgIHZhciBlZGdlcyA9IHBEYXRhLmVkZ2VzO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG4gICAgICB2YXIgc291cmNlTm9kZSA9IGlkVG9MTm9kZV90W2VkZ2Uuc291cmNlXTtcclxuICAgICAgdmFyIHRhcmdldE5vZGUgPSBpZFRvTE5vZGVfdFtlZGdlLnRhcmdldF07XHJcbiAgICAgIHZhciBlMSA9IGdtX3QuYWRkKGxheW91dF90Lm5ld0VkZ2UoKSwgc291cmNlTm9kZSwgdGFyZ2V0Tm9kZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy9ydW4gdGhlIGxheW91dCBjcmF0ZWQgaW4gdGhpcyB0aHJlYWRcclxuICAgIGxheW91dF90LnJ1bkxheW91dCgpO1xyXG5cclxuICAgIC8vZmlsbCB0aGUgcmVzdWx0IG1hcFxyXG4gICAgZm9yICh2YXIgaWQgaW4gaWRUb0xOb2RlX3QpIHtcclxuICAgICAgdmFyIGxOb2RlID0gaWRUb0xOb2RlX3RbaWRdO1xyXG4gICAgICB2YXIgcmVjdCA9IGxOb2RlLnJlY3Q7XHJcbiAgICAgIHJlc3VsdFtpZF0gPSB7XHJcbiAgICAgICAgaWQ6IGlkLFxyXG4gICAgICAgIHg6IHJlY3QueCxcclxuICAgICAgICB5OiByZWN0LnksXHJcbiAgICAgICAgdzogcmVjdC53aWR0aCxcclxuICAgICAgICBoOiByZWN0LmhlaWdodFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gICAgdmFyIHNlZWRzID0ge307XHJcbiAgICBzZWVkcy5yc1NlZWQgPSBSYW5kb21TZWVkLnNlZWQ7XHJcbiAgICBzZWVkcy5yc1ggPSBSYW5kb21TZWVkLng7XHJcbiAgICB2YXIgcGFzcyA9IHtcclxuICAgICAgcmVzdWx0OiByZXN1bHQsXHJcbiAgICAgIHNlZWRzOiBzZWVkc1xyXG4gICAgfVxyXG4gICAgLy9yZXR1cm4gdGhlIHJlc3VsdCBtYXAgdG8gcGFzcyBpdCB0byB0aGUgdGhlbiBmdW5jdGlvbiBhcyBwYXJhbWV0ZXJcclxuICAgIHJldHVybiBwYXNzO1xyXG4gIH0pLnRoZW4oZnVuY3Rpb24gKHBhc3MpIHtcclxuICAgIHZhciByZXN1bHQgPSBwYXNzLnJlc3VsdDtcclxuICAgIHZhciBzZWVkcyA9IHBhc3Muc2VlZHM7XHJcbiAgICBSYW5kb21TZWVkLnNlZWQgPSBzZWVkcy5yc1NlZWQ7XHJcbiAgICBSYW5kb21TZWVkLnggPSBzZWVkcy5yc1g7XHJcbiAgICAvL3JlZnJlc2ggdGhlIGxub2RlIHBvc2l0aW9ucyBhbmQgc2l6ZXMgYnkgdXNpbmcgcmVzdWx0IG1hcFxyXG4gICAgZm9yICh2YXIgaWQgaW4gcmVzdWx0KSB7XHJcbiAgICAgIHZhciBsTm9kZSA9IF9Db1NFTGF5b3V0LmlkVG9MTm9kZVtpZF07XHJcbiAgICAgIHZhciBub2RlID0gcmVzdWx0W2lkXTtcclxuICAgICAgbE5vZGUucmVjdC54ID0gbm9kZS54O1xyXG4gICAgICBsTm9kZS5yZWN0LnkgPSBub2RlLnk7XHJcbiAgICAgIGxOb2RlLnJlY3Qud2lkdGggPSBub2RlLnc7XHJcbiAgICAgIGxOb2RlLnJlY3QuaGVpZ2h0ID0gbm9kZS5oO1xyXG4gICAgfVxyXG4gICAgaWYgKGFmdGVyLm9wdGlvbnMudGlsZSkge1xyXG4gICAgICAvLyBSZXBvcHVsYXRlIG1lbWJlcnNcclxuICAgICAgYWZ0ZXIucmVwb3B1bGF0ZVplcm9EZWdyZWVNZW1iZXJzKHRpbGVkWmVyb0RlZ3JlZU5vZGVzKTtcclxuICAgICAgYWZ0ZXIucmVwb3B1bGF0ZUNvbXBvdW5kcyh0aWxlZE1lbWJlclBhY2spO1xyXG4gICAgICBhZnRlci5vcHRpb25zLmVsZXMubm9kZXMoKS51cGRhdGVDb21wb3VuZEJvdW5kcygpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBnZXRQb3NpdGlvbnMgPSBmdW5jdGlvbihpICxlbGUpe1xyXG4gICAgICB2YXIgdGhlSWQgPSBlbGUuZGF0YSgnaWQnKTtcclxuICAgICAgdmFyIGxOb2RlID0gX0NvU0VMYXlvdXQuaWRUb0xOb2RlW3RoZUlkXTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogbE5vZGUuZ2V0UmVjdCgpLmdldENlbnRlclgoKSxcclxuICAgICAgICB5OiBsTm9kZS5nZXRSZWN0KCkuZ2V0Q2VudGVyWSgpXHJcbiAgICAgIH07XHJcbiAgICB9O1xyXG5cclxuICAgIGlmKGFmdGVyLm9wdGlvbnMuYW5pbWF0ZSAhPT0gJ2R1cmluZycpe1xyXG4gICAgICBhZnRlci5vcHRpb25zLmVsZXMubm9kZXMoKS5sYXlvdXRQb3NpdGlvbnMoYWZ0ZXIsIGFmdGVyLm9wdGlvbnMsIGdldFBvc2l0aW9ucyk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgYWZ0ZXIub3B0aW9ucy5lbGVzLm5vZGVzKCkucG9zaXRpb25zKGdldFBvc2l0aW9ucyk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoYWZ0ZXIub3B0aW9ucy5maXQpXHJcbiAgICAgICAgYWZ0ZXIub3B0aW9ucy5jeS5maXQoYWZ0ZXIub3B0aW9ucy5lbGVzLm5vZGVzKCksIGFmdGVyLm9wdGlvbnMucGFkZGluZyk7XHJcbiAgICBcclxuICAgICAgLy90cmlnZ2VyIGxheW91dHJlYWR5IHdoZW4gZWFjaCBub2RlIGhhcyBoYWQgaXRzIHBvc2l0aW9uIHNldCBhdCBsZWFzdCBvbmNlXHJcbiAgICAgIGlmICghcmVhZHkpIHtcclxuICAgICAgICBhZnRlci5jeS5vbmUoJ2xheW91dHJlYWR5JywgYWZ0ZXIub3B0aW9ucy5yZWFkeSk7XHJcbiAgICAgICAgYWZ0ZXIuY3kudHJpZ2dlcignbGF5b3V0cmVhZHknKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gdHJpZ2dlciBsYXlvdXRzdG9wIHdoZW4gdGhlIGxheW91dCBzdG9wcyAoZS5nLiBmaW5pc2hlcylcclxuICAgICAgYWZ0ZXIuY3kub25lKCdsYXlvdXRzdG9wJywgYWZ0ZXIub3B0aW9ucy5zdG9wKTtcclxuICAgICAgYWZ0ZXIuY3kudHJpZ2dlcignbGF5b3V0c3RvcCcpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB0MS5zdG9wKCk7XHJcbiAgICBhZnRlci5vcHRpb25zLmVsZXMubm9kZXMoKS5yZW1vdmVEYXRhKCdkdW1teV9wYXJlbnRfaWQnKTtcclxuICB9KTtcclxuXHJcbiAgdDEub24oJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgdmFyIGxvZ01zZyA9IGUubWVzc2FnZS5sb2c7XHJcbiAgICBpZiAobG9nTXNnICE9IG51bGwpIHtcclxuICAgICAgY29uc29sZS5sb2coJ1RocmVhZCBsb2c6ICcgKyBsb2dNc2cpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgcERhdGEgPSBlLm1lc3NhZ2UucERhdGE7XHJcbiAgICBpZiAocERhdGEgIT0gbnVsbCkge1xyXG4gICAgICBhZnRlci5vcHRpb25zLmVsZXMubm9kZXMoKS5wb3NpdGlvbnMoZnVuY3Rpb24gKGksIGVsZSkge1xyXG4gICAgICAgIGlmIChlbGUuZGF0YSgnZHVtbXlfcGFyZW50X2lkJykpIHtcclxuICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHg6IHBEYXRhW2VsZS5kYXRhKCdkdW1teV9wYXJlbnRfaWQnKV0ueCxcclxuICAgICAgICAgICAgeTogcERhdGFbZWxlLmRhdGEoJ2R1bW15X3BhcmVudF9pZCcpXS55XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdGhlSWQgPSBlbGUuZGF0YSgnaWQnKTtcclxuICAgICAgICB2YXIgcE5vZGUgPSBwRGF0YVt0aGVJZF07XHJcbiAgICAgICAgdmFyIHRlbXAgPSB0aGlzO1xyXG4gICAgICAgIHdoaWxlIChwTm9kZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICB0ZW1wID0gdGVtcC5wYXJlbnQoKVswXTtcclxuICAgICAgICAgIHBOb2RlID0gcERhdGFbdGVtcC5pZCgpXTtcclxuICAgICAgICAgIHBEYXRhW3RoZUlkXSA9IHBOb2RlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgeDogcE5vZGUueCxcclxuICAgICAgICAgIHk6IHBOb2RlLnlcclxuICAgICAgICB9O1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmIChhZnRlci5vcHRpb25zLmZpdClcclxuICAgICAgICBhZnRlci5vcHRpb25zLmN5LmZpdChhZnRlci5vcHRpb25zLmVsZXMubm9kZXMoKSwgYWZ0ZXIub3B0aW9ucy5wYWRkaW5nKTtcclxuXHJcbiAgICAgIGlmICghcmVhZHkpIHtcclxuICAgICAgICByZWFkeSA9IHRydWU7XHJcbiAgICAgICAgYWZ0ZXIub25lKCdsYXlvdXRyZWFkeScsIGFmdGVyLm9wdGlvbnMucmVhZHkpO1xyXG4gICAgICAgIGFmdGVyLnRyaWdnZXIoe3R5cGU6ICdsYXlvdXRyZWFkeScsIGxheW91dDogYWZ0ZXJ9KTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiB0aGlzOyAvLyBjaGFpbmluZ1xyXG59O1xyXG5cclxuLy9HZXQgdGhlIHRvcCBtb3N0IG9uZXMgb2YgYSBsaXN0IG9mIG5vZGVzXHJcbl9Db1NFTGF5b3V0LmdldFRvcE1vc3ROb2RlcyA9IGZ1bmN0aW9uKG5vZGVzKSB7XHJcbiAgdmFyIG5vZGVzTWFwID0ge307XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBub2Rlc01hcFtub2Rlc1tpXS5pZCgpXSA9IHRydWU7XHJcbiAgfVxyXG4gIHZhciByb290cyA9IG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoaSwgZWxlKSB7XHJcbiAgICAgIHZhciBwYXJlbnQgPSBlbGUucGFyZW50KClbMF07XHJcbiAgICAgIHdoaWxlKHBhcmVudCAhPSBudWxsKXtcclxuICAgICAgICBpZihub2Rlc01hcFtwYXJlbnQuaWQoKV0pe1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50KClbMF07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiByb290cztcclxufTtcclxuXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRUb0JlVGlsZWQgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBpZCA9IG5vZGUuZGF0YShcImlkXCIpO1xyXG4gIC8vZmlyc3RseSBjaGVjayB0aGUgcHJldmlvdXMgcmVzdWx0c1xyXG4gIGlmIChfQ29TRUxheW91dC50b0JlVGlsZWRbaWRdICE9IG51bGwpIHtcclxuICAgIHJldHVybiBfQ29TRUxheW91dC50b0JlVGlsZWRbaWRdO1xyXG4gIH1cclxuXHJcbiAgLy9vbmx5IGNvbXBvdW5kIG5vZGVzIGFyZSB0byBiZSB0aWxlZFxyXG4gIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICBpZiAoY2hpbGRyZW4gPT0gbnVsbCB8fCBjaGlsZHJlbi5sZW5ndGggPT0gMCkge1xyXG4gICAgX0NvU0VMYXlvdXQudG9CZVRpbGVkW2lkXSA9IGZhbHNlO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLy9hIGNvbXBvdW5kIG5vZGUgaXMgbm90IHRvIGJlIHRpbGVkIGlmIGFsbCBvZiBpdHMgY29tcG91bmQgY2hpbGRyZW4gYXJlIG5vdCB0byBiZSB0aWxlZFxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciB0aGVDaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG5cclxuICAgIGlmICh0aGlzLmdldE5vZGVEZWdyZWUodGhlQ2hpbGQpID4gMCkge1xyXG4gICAgICBfQ29TRUxheW91dC50b0JlVGlsZWRbaWRdID0gZmFsc2U7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICAvL3Bhc3MgdGhlIGNoaWxkcmVuIG5vdCBoYXZpbmcgdGhlIGNvbXBvdW5kIHN0cnVjdHVyZVxyXG4gICAgaWYgKHRoZUNoaWxkLmNoaWxkcmVuKCkgPT0gbnVsbCB8fCB0aGVDaGlsZC5jaGlsZHJlbigpLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIF9Db1NFTGF5b3V0LnRvQmVUaWxlZFt0aGVDaGlsZC5kYXRhKFwiaWRcIildID0gZmFsc2U7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdGhpcy5nZXRUb0JlVGlsZWQodGhlQ2hpbGQpKSB7XHJcbiAgICAgIF9Db1NFTGF5b3V0LnRvQmVUaWxlZFtpZF0gPSBmYWxzZTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuICBfQ29TRUxheW91dC50b0JlVGlsZWRbaWRdID0gdHJ1ZTtcclxuICByZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXROb2RlRGVncmVlID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICB2YXIgaWQgPSBub2RlLmlkKCk7XHJcbiAgdmFyIGVkZ2VzID0gdGhpcy5vcHRpb25zLmVsZXMuZWRnZXMoKS5maWx0ZXIoZnVuY3Rpb24gKGksIGVsZSkge1xyXG4gICAgdmFyIHNvdXJjZSA9IGVsZS5kYXRhKCdzb3VyY2UnKTtcclxuICAgIHZhciB0YXJnZXQgPSBlbGUuZGF0YSgndGFyZ2V0Jyk7XHJcbiAgICBpZiAoc291cmNlICE9IHRhcmdldCAmJiAoc291cmNlID09IGlkIHx8IHRhcmdldCA9PSBpZCkpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGVkZ2VzLmxlbmd0aDtcclxufTtcclxuXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXROb2RlRGVncmVlV2l0aENoaWxkcmVuID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICB2YXIgZGVncmVlID0gdGhpcy5nZXROb2RlRGVncmVlKG5vZGUpO1xyXG4gIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcclxuICAgIGRlZ3JlZSArPSB0aGlzLmdldE5vZGVEZWdyZWVXaXRoQ2hpbGRyZW4oY2hpbGQpO1xyXG4gIH1cclxuICByZXR1cm4gZGVncmVlO1xyXG59O1xyXG5cclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmdyb3VwWmVyb0RlZ3JlZU1lbWJlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gYXJyYXkgb2YgW3BhcmVudF9pZCB4IG9uZURlZ3JlZU5vZGVfaWRdIFxyXG4gIHZhciB0ZW1wTWVtYmVyR3JvdXBzID0gW107XHJcbiAgdmFyIG1lbWJlckdyb3VwcyA9IFtdO1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB2YXIgcGFyZW50TWFwID0ge307XHJcbiAgXHJcbiAgZm9yKHZhciBpID0gMDsgaSA8IHRoaXMub3B0aW9ucy5lbGVzLm5vZGVzKCkubGVuZ3RoOyBpKyspe1xyXG4gICAgcGFyZW50TWFwW3RoaXMub3B0aW9ucy5lbGVzLm5vZGVzKClbaV0uaWQoKV0gPSB0cnVlO1xyXG4gIH1cclxuICBcclxuICAvLyBGaW5kIGFsbCB6ZXJvIGRlZ3JlZSBub2RlcyB3aGljaCBhcmVuJ3QgY292ZXJlZCBieSBhIGNvbXBvdW5kXHJcbiAgdmFyIHplcm9EZWdyZWUgPSB0aGlzLm9wdGlvbnMuZWxlcy5ub2RlcygpLmZpbHRlcihmdW5jdGlvbiAoaSwgZWxlKSB7XHJcbiAgICB2YXIgcGlkID0gZWxlLmRhdGEoJ3BhcmVudCcpO1xyXG4gICAgaWYocGlkICE9IHVuZGVmaW5lZCAmJiAhcGFyZW50TWFwW3BpZF0pe1xyXG4gICAgICBwaWQgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmIChzZWxmLmdldE5vZGVEZWdyZWVXaXRoQ2hpbGRyZW4oZWxlKSA9PSAwICYmIChwaWQgPT0gdW5kZWZpbmVkIHx8IChwaWQgIT0gdW5kZWZpbmVkICYmICFzZWxmLmdldFRvQmVUaWxlZChlbGUucGFyZW50KClbMF0pKSkpXHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgZWxzZVxyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgfSk7XHJcblxyXG4gIC8vIENyZWF0ZSBhIG1hcCBvZiBwYXJlbnQgbm9kZSBhbmQgaXRzIHplcm8gZGVncmVlIG1lbWJlcnNcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHplcm9EZWdyZWUubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIG5vZGUgPSB6ZXJvRGVncmVlW2ldO1xyXG4gICAgdmFyIHBfaWQgPSBub2RlLnBhcmVudCgpLmlkKCk7XHJcbiAgICBcclxuICAgIGlmKHBfaWQgIT0gdW5kZWZpbmVkICYmICFwYXJlbnRNYXBbcF9pZF0pe1xyXG4gICAgICBwX2lkID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eXBlb2YgdGVtcE1lbWJlckdyb3Vwc1twX2lkXSA9PT0gXCJ1bmRlZmluZWRcIilcclxuICAgICAgdGVtcE1lbWJlckdyb3Vwc1twX2lkXSA9IFtdO1xyXG5cclxuICAgIHRlbXBNZW1iZXJHcm91cHNbcF9pZF0gPSB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdLmNvbmNhdChub2RlKTtcclxuICB9XHJcblxyXG4gIC8vIElmIHRoZXJlIGFyZSBhdCBsZWFzdCB0d28gbm9kZXMgYXQgYSBsZXZlbCwgY3JlYXRlIGEgZHVtbXkgY29tcG91bmQgZm9yIHRoZW1cclxuICBmb3IgKHZhciBwX2lkIGluIHRlbXBNZW1iZXJHcm91cHMpIHtcclxuICAgIGlmICh0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdLmxlbmd0aCA+IDEpIHtcclxuICAgICAgdmFyIGR1bW15Q29tcG91bmRJZCA9IFwiRHVtbXlDb21wb3VuZF9cIiArIHBfaWQ7XHJcbiAgICAgIG1lbWJlckdyb3Vwc1tkdW1teUNvbXBvdW5kSWRdID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBhIGR1bW15IGNvbXBvdW5kXHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuY3kuZ2V0RWxlbWVudEJ5SWQoZHVtbXlDb21wb3VuZElkKS5lbXB0eSgpKSB7XHJcbiAgICAgICAgdGhpcy5vcHRpb25zLmN5LmFkZCh7XHJcbiAgICAgICAgICBncm91cDogXCJub2Rlc1wiLFxyXG4gICAgICAgICAgZGF0YToge2lkOiBkdW1teUNvbXBvdW5kSWQsIHBhcmVudDogcF9pZFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB2YXIgZHVtbXkgPSB0aGlzLm9wdGlvbnMuY3kubm9kZXMoKVt0aGlzLm9wdGlvbnMuY3kubm9kZXMoKS5sZW5ndGggLSAxXTtcclxuICAgICAgICB0aGlzLm9wdGlvbnMuZWxlcyA9IHRoaXMub3B0aW9ucy5lbGVzLnVuaW9uKGR1bW15KTtcclxuICAgICAgICBkdW1teS5oaWRlKCk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGVtcE1lbWJlckdyb3Vwc1twX2lkXS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgaWYgKGkgPT0gMCkge1xyXG4gICAgICAgICAgICBkdW1teS5kYXRhKCd0ZW1wY2hpbGRyZW4nLCBbXSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2YXIgbm9kZSA9IHRlbXBNZW1iZXJHcm91cHNbcF9pZF1baV07XHJcbiAgICAgICAgICBub2RlLmRhdGEoJ2R1bW15X3BhcmVudF9pZCcsIGR1bW15Q29tcG91bmRJZCk7XHJcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuY3kuYWRkKHtcclxuICAgICAgICAgICAgZ3JvdXA6IFwibm9kZXNcIixcclxuICAgICAgICAgICAgZGF0YToge3BhcmVudDogZHVtbXlDb21wb3VuZElkLCB3aWR0aDogbm9kZS53aWR0aCgpLCBoZWlnaHQ6IG5vZGUuaGVpZ2h0KClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICB2YXIgdGVtcGNoaWxkID0gdGhpcy5vcHRpb25zLmN5Lm5vZGVzKClbdGhpcy5vcHRpb25zLmN5Lm5vZGVzKCkubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICB0ZW1wY2hpbGQuaGlkZSgpO1xyXG4gICAgICAgICAgdGVtcGNoaWxkLmNzcygnd2lkdGgnLCB0ZW1wY2hpbGQuZGF0YSgnd2lkdGgnKSk7XHJcbiAgICAgICAgICB0ZW1wY2hpbGQuY3NzKCdoZWlnaHQnLCB0ZW1wY2hpbGQuZGF0YSgnaGVpZ2h0JykpO1xyXG4gICAgICAgICAgdGVtcGNoaWxkLndpZHRoKCk7XHJcbiAgICAgICAgICBkdW1teS5kYXRhKCd0ZW1wY2hpbGRyZW4nKS5wdXNoKHRlbXBjaGlsZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWVtYmVyR3JvdXBzO1xyXG59O1xyXG5cclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLnBlcmZvcm1ERlNPbkNvbXBvdW5kcyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcbiAgdmFyIGNvbXBvdW5kT3JkZXIgPSBbXTtcclxuXHJcbiAgdmFyIHJvb3RzID0gX0NvU0VMYXlvdXQuZ2V0VG9wTW9zdE5vZGVzKHRoaXMub3B0aW9ucy5lbGVzLm5vZGVzKCkpO1xyXG4gIHRoaXMuZmlsbENvbXBleE9yZGVyQnlERlMoY29tcG91bmRPcmRlciwgcm9vdHMpO1xyXG5cclxuICByZXR1cm4gY29tcG91bmRPcmRlcjtcclxufTtcclxuXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5maWxsQ29tcGV4T3JkZXJCeURGUyA9IGZ1bmN0aW9uIChjb21wb3VuZE9yZGVyLCBjaGlsZHJlbikge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgdGhpcy5maWxsQ29tcGV4T3JkZXJCeURGUyhjb21wb3VuZE9yZGVyLCBjaGlsZC5jaGlsZHJlbigpKTtcclxuICAgIGlmICh0aGlzLmdldFRvQmVUaWxlZChjaGlsZCkpIHtcclxuICAgICAgY29tcG91bmRPcmRlci5wdXNoKGNoaWxkKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5fQ29TRUxheW91dC5wcm90b3R5cGUuY2xlYXJDb21wb3VuZHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xyXG4gIHZhciBjaGlsZEdyYXBoTWFwID0gW107XHJcblxyXG4gIC8vIEdldCBjb21wb3VuZCBvcmRlcmluZyBieSBmaW5kaW5nIHRoZSBpbm5lciBvbmUgZmlyc3RcclxuICB2YXIgY29tcG91bmRPcmRlciA9IHRoaXMucGVyZm9ybURGU09uQ29tcG91bmRzKG9wdGlvbnMpO1xyXG4gIF9Db1NFTGF5b3V0LmNvbXBvdW5kT3JkZXIgPSBjb21wb3VuZE9yZGVyO1xyXG4gIHRoaXMucHJvY2Vzc0NoaWxkcmVuTGlzdCh0aGlzLnJvb3QsIF9Db1NFTGF5b3V0LmdldFRvcE1vc3ROb2Rlcyh0aGlzLm9wdGlvbnMuZWxlcy5ub2RlcygpKSk7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY29tcG91bmRPcmRlci5sZW5ndGg7IGkrKykge1xyXG4gICAgLy8gZmluZCB0aGUgY29ycmVzcG9uZGluZyBsYXlvdXQgbm9kZVxyXG4gICAgdmFyIGxDb21wb3VuZE5vZGUgPSBfQ29TRUxheW91dC5pZFRvTE5vZGVbY29tcG91bmRPcmRlcltpXS5pZCgpXTtcclxuXHJcbiAgICBjaGlsZEdyYXBoTWFwW2NvbXBvdW5kT3JkZXJbaV0uaWQoKV0gPSBjb21wb3VuZE9yZGVyW2ldLmNoaWxkcmVuKCk7XHJcblxyXG4gICAgLy8gUmVtb3ZlIGNoaWxkcmVuIG9mIGNvbXBvdW5kcyBcclxuICAgIGxDb21wb3VuZE5vZGUuY2hpbGQgPSBudWxsO1xyXG4gIH1cclxuXHJcbiAgLy8gVGlsZSB0aGUgcmVtb3ZlZCBjaGlsZHJlblxyXG4gIHZhciB0aWxlZE1lbWJlclBhY2sgPSB0aGlzLnRpbGVDb21wb3VuZE1lbWJlcnMoY2hpbGRHcmFwaE1hcCk7XHJcblxyXG4gIHJldHVybiB0aWxlZE1lbWJlclBhY2s7XHJcbn07XHJcblxyXG5fQ29TRUxheW91dC5wcm90b3R5cGUuY2xlYXJaZXJvRGVncmVlTWVtYmVycyA9IGZ1bmN0aW9uIChtZW1iZXJHcm91cHMpIHtcclxuICB2YXIgdGlsZWRaZXJvRGVncmVlUGFjayA9IFtdO1xyXG5cclxuICBmb3IgKHZhciBpZCBpbiBtZW1iZXJHcm91cHMpIHtcclxuICAgIHZhciBjb21wb3VuZE5vZGUgPSBfQ29TRUxheW91dC5pZFRvTE5vZGVbaWRdO1xyXG5cclxuICAgIHRpbGVkWmVyb0RlZ3JlZVBhY2tbaWRdID0gdGhpcy50aWxlTm9kZXMobWVtYmVyR3JvdXBzW2lkXSk7XHJcblxyXG4gICAgLy8gU2V0IHRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIHRoZSBkdW1teSBjb21wb3VuZCBhcyBjYWxjdWxhdGVkXHJcbiAgICBjb21wb3VuZE5vZGUucmVjdC53aWR0aCA9IHRpbGVkWmVyb0RlZ3JlZVBhY2tbaWRdLndpZHRoO1xyXG4gICAgY29tcG91bmROb2RlLnJlY3QuaGVpZ2h0ID0gdGlsZWRaZXJvRGVncmVlUGFja1tpZF0uaGVpZ2h0O1xyXG4gIH1cclxuICByZXR1cm4gdGlsZWRaZXJvRGVncmVlUGFjaztcclxufTtcclxuXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5yZXBvcHVsYXRlQ29tcG91bmRzID0gZnVuY3Rpb24gKHRpbGVkTWVtYmVyUGFjaykge1xyXG4gIGZvciAodmFyIGkgPSBfQ29TRUxheW91dC5jb21wb3VuZE9yZGVyLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICB2YXIgaWQgPSBfQ29TRUxheW91dC5jb21wb3VuZE9yZGVyW2ldLmlkKCk7XHJcbiAgICB2YXIgbENvbXBvdW5kTm9kZSA9IF9Db1NFTGF5b3V0LmlkVG9MTm9kZVtpZF07XHJcbiAgICB2YXIgaG9yaXpvbnRhbE1hcmdpbiA9IHBhcnNlSW50KF9Db1NFTGF5b3V0LmNvbXBvdW5kT3JkZXJbaV0uY3NzKCdwYWRkaW5nLWxlZnQnKSk7XHJcbiAgICB2YXIgdmVydGljYWxNYXJnaW4gPSBwYXJzZUludChfQ29TRUxheW91dC5jb21wb3VuZE9yZGVyW2ldLmNzcygncGFkZGluZy10b3AnKSk7XHJcblxyXG4gICAgdGhpcy5hZGp1c3RMb2NhdGlvbnModGlsZWRNZW1iZXJQYWNrW2lkXSwgbENvbXBvdW5kTm9kZS5yZWN0LngsIGxDb21wb3VuZE5vZGUucmVjdC55LCBob3Jpem9udGFsTWFyZ2luLCB2ZXJ0aWNhbE1hcmdpbik7XHJcbiAgfVxyXG59O1xyXG5cclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLnJlcG9wdWxhdGVaZXJvRGVncmVlTWVtYmVycyA9IGZ1bmN0aW9uICh0aWxlZFBhY2spIHtcclxuICBmb3IgKHZhciBpIGluIHRpbGVkUGFjaykge1xyXG4gICAgdmFyIGNvbXBvdW5kID0gdGhpcy5jeS5nZXRFbGVtZW50QnlJZChpKTtcclxuICAgIHZhciBjb21wb3VuZE5vZGUgPSBfQ29TRUxheW91dC5pZFRvTE5vZGVbaV07XHJcbiAgICB2YXIgaG9yaXpvbnRhbE1hcmdpbiA9IHBhcnNlSW50KGNvbXBvdW5kLmNzcygncGFkZGluZy1sZWZ0JykpO1xyXG4gICAgdmFyIHZlcnRpY2FsTWFyZ2luID0gcGFyc2VJbnQoY29tcG91bmQuY3NzKCdwYWRkaW5nLXRvcCcpKTtcclxuICAgIFxyXG4gICAgLy8gQWRqdXN0IHRoZSBwb3NpdGlvbnMgb2Ygbm9kZXMgd3J0IGl0cyBjb21wb3VuZFxyXG4gICAgdGhpcy5hZGp1c3RMb2NhdGlvbnModGlsZWRQYWNrW2ldLCBjb21wb3VuZE5vZGUucmVjdC54LCBjb21wb3VuZE5vZGUucmVjdC55LCBob3Jpem9udGFsTWFyZ2luLCB2ZXJ0aWNhbE1hcmdpbik7XHJcblxyXG4gICAgdmFyIHRlbXBjaGlsZHJlbiA9IGNvbXBvdW5kLmRhdGEoJ3RlbXBjaGlsZHJlbicpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZW1wY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdGVtcGNoaWxkcmVuW2ldLnJlbW92ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlbW92ZSB0aGUgZHVtbXkgY29tcG91bmRcclxuICAgIGNvbXBvdW5kLnJlbW92ZSgpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBUaGlzIG1ldGhvZCBwbGFjZXMgZWFjaCB6ZXJvIGRlZ3JlZSBtZW1iZXIgd3J0IGdpdmVuICh4LHkpIGNvb3JkaW5hdGVzICh0b3AgbGVmdCkuIFxyXG4gKi9cclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmFkanVzdExvY2F0aW9ucyA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24sIHgsIHksIGNvbXBvdW5kSG9yaXpvbnRhbE1hcmdpbiwgY29tcG91bmRWZXJ0aWNhbE1hcmdpbikge1xyXG4gIHggKz0gY29tcG91bmRIb3Jpem9udGFsTWFyZ2luO1xyXG4gIHkgKz0gY29tcG91bmRWZXJ0aWNhbE1hcmdpbjtcclxuXHJcbiAgdmFyIGxlZnQgPSB4O1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgcm93ID0gb3JnYW5pemF0aW9uLnJvd3NbaV07XHJcbiAgICB4ID0gbGVmdDtcclxuICAgIHZhciBtYXhIZWlnaHQgPSAwO1xyXG5cclxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgcm93Lmxlbmd0aDsgaisrKSB7XHJcbiAgICAgIHZhciBsbm9kZSA9IHJvd1tqXTtcclxuICAgICAgdmFyIG5vZGUgPSB0aGlzLmN5LmdldEVsZW1lbnRCeUlkKGxub2RlLmlkKTtcclxuXHJcbiAgICAgIGxub2RlLnJlY3QueCA9IHg7Ly8gKyBsbm9kZS5yZWN0LndpZHRoIC8gMjtcclxuICAgICAgbG5vZGUucmVjdC55ID0geTsvLyArIGxub2RlLnJlY3QuaGVpZ2h0IC8gMjtcclxuXHJcbiAgICAgIHggKz0gbG5vZGUucmVjdC53aWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZztcclxuXHJcbiAgICAgIGlmIChsbm9kZS5yZWN0LmhlaWdodCA+IG1heEhlaWdodClcclxuICAgICAgICBtYXhIZWlnaHQgPSBsbm9kZS5yZWN0LmhlaWdodDtcclxuICAgIH1cclxuXHJcbiAgICB5ICs9IG1heEhlaWdodCArIG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XHJcbiAgfVxyXG59O1xyXG5cclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLnRpbGVDb21wb3VuZE1lbWJlcnMgPSBmdW5jdGlvbiAoY2hpbGRHcmFwaE1hcCkge1xyXG4gIHZhciB0aWxlZE1lbWJlclBhY2sgPSBbXTtcclxuXHJcbiAgZm9yICh2YXIgaWQgaW4gY2hpbGRHcmFwaE1hcCkge1xyXG4gICAgLy8gQWNjZXNzIGxheW91dEluZm8gbm9kZXMgdG8gc2V0IHRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIGNvbXBvdW5kc1xyXG4gICAgdmFyIGNvbXBvdW5kTm9kZSA9IF9Db1NFTGF5b3V0LmlkVG9MTm9kZVtpZF07XHJcblxyXG4gICAgdGlsZWRNZW1iZXJQYWNrW2lkXSA9IHRoaXMudGlsZU5vZGVzKGNoaWxkR3JhcGhNYXBbaWRdKTtcclxuXHJcbiAgICBjb21wb3VuZE5vZGUucmVjdC53aWR0aCA9IHRpbGVkTWVtYmVyUGFja1tpZF0ud2lkdGggKyAyMDtcclxuICAgIGNvbXBvdW5kTm9kZS5yZWN0LmhlaWdodCA9IHRpbGVkTWVtYmVyUGFja1tpZF0uaGVpZ2h0ICsgMjA7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGlsZWRNZW1iZXJQYWNrO1xyXG59O1xyXG5cclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLnRpbGVOb2RlcyA9IGZ1bmN0aW9uIChub2Rlcykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB2YXIgdmVydGljYWxQYWRkaW5nID0gdHlwZW9mIHNlbGYub3B0aW9ucy50aWxpbmdQYWRkaW5nVmVydGljYWwgPT09ICdmdW5jdGlvbicgPyBzZWxmLm9wdGlvbnMudGlsaW5nUGFkZGluZ1ZlcnRpY2FsLmNhbGwoKSA6IHNlbGYub3B0aW9ucy50aWxpbmdQYWRkaW5nVmVydGljYWw7XHJcbiAgdmFyIGhvcml6b250YWxQYWRkaW5nID0gdHlwZW9mIHNlbGYub3B0aW9ucy50aWxpbmdQYWRkaW5nSG9yaXpvbnRhbCA9PT0gJ2Z1bmN0aW9uJyA/IHNlbGYub3B0aW9ucy50aWxpbmdQYWRkaW5nSG9yaXpvbnRhbC5jYWxsKCkgOiBzZWxmLm9wdGlvbnMudGlsaW5nUGFkZGluZ0hvcml6b250YWw7XHJcbiAgdmFyIG9yZ2FuaXphdGlvbiA9IHtcclxuICAgIHJvd3M6IFtdLFxyXG4gICAgcm93V2lkdGg6IFtdLFxyXG4gICAgcm93SGVpZ2h0OiBbXSxcclxuICAgIHdpZHRoOiAyMCxcclxuICAgIGhlaWdodDogMjAsXHJcbiAgICB2ZXJ0aWNhbFBhZGRpbmc6IHZlcnRpY2FsUGFkZGluZyxcclxuICAgIGhvcml6b250YWxQYWRkaW5nOiBob3Jpem9udGFsUGFkZGluZ1xyXG4gIH07XHJcblxyXG4gIHZhciBsYXlvdXROb2RlcyA9IFtdO1xyXG5cclxuICAvLyBHZXQgbGF5b3V0IG5vZGVzXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcclxuICAgIHZhciBsTm9kZSA9IF9Db1NFTGF5b3V0LmlkVG9MTm9kZVtub2RlLmlkKCldO1xyXG5cclxuICAgIGlmICghbm9kZS5kYXRhKCdkdW1teV9wYXJlbnRfaWQnKSkge1xyXG4gICAgICB2YXIgb3duZXIgPSBsTm9kZS5vd25lcjtcclxuICAgICAgb3duZXIucmVtb3ZlKGxOb2RlKTtcclxuXHJcbiAgICAgIHRoaXMuZ20ucmVzZXRBbGxOb2RlcygpO1xyXG4gICAgICB0aGlzLmdtLmdldEFsbE5vZGVzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgbGF5b3V0Tm9kZXMucHVzaChsTm9kZSk7XHJcbiAgfVxyXG5cclxuICAvLyBTb3J0IHRoZSBub2RlcyBpbiBhc2NlbmRpbmcgb3JkZXIgb2YgdGhlaXIgYXJlYXNcclxuICBsYXlvdXROb2Rlcy5zb3J0KGZ1bmN0aW9uIChuMSwgbjIpIHtcclxuICAgIGlmIChuMS5yZWN0LndpZHRoICogbjEucmVjdC5oZWlnaHQgPiBuMi5yZWN0LndpZHRoICogbjIucmVjdC5oZWlnaHQpXHJcbiAgICAgIHJldHVybiAtMTtcclxuICAgIGlmIChuMS5yZWN0LndpZHRoICogbjEucmVjdC5oZWlnaHQgPCBuMi5yZWN0LndpZHRoICogbjIucmVjdC5oZWlnaHQpXHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgcmV0dXJuIDA7XHJcbiAgfSk7XHJcblxyXG4gIC8vIENyZWF0ZSB0aGUgb3JnYW5pemF0aW9uIC0+IHRpbGUgbWVtYmVyc1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGF5b3V0Tm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBsTm9kZSA9IGxheW91dE5vZGVzW2ldO1xyXG4gICAgXHJcbiAgICB2YXIgY3lOb2RlID0gdGhpcy5jeS5nZXRFbGVtZW50QnlJZChsTm9kZS5pZCkucGFyZW50KClbMF07XHJcbiAgICB2YXIgbWluV2lkdGggPSAwO1xyXG4gICAgaWYoY3lOb2RlKXtcclxuICAgICAgbWluV2lkdGggPSBwYXJzZUludChjeU5vZGUuY3NzKCdwYWRkaW5nLWxlZnQnKSkgKyBwYXJzZUludChjeU5vZGUuY3NzKCdwYWRkaW5nLXJpZ2h0JykpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiAob3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoID09IDApIHtcclxuICAgICAgdGhpcy5pbnNlcnROb2RlVG9Sb3cob3JnYW5pemF0aW9uLCBsTm9kZSwgMCwgbWluV2lkdGgpO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodGhpcy5jYW5BZGRIb3Jpem9udGFsKG9yZ2FuaXphdGlvbiwgbE5vZGUucmVjdC53aWR0aCwgbE5vZGUucmVjdC5oZWlnaHQpKSB7XHJcbiAgICAgIHRoaXMuaW5zZXJ0Tm9kZVRvUm93KG9yZ2FuaXphdGlvbiwgbE5vZGUsIHRoaXMuZ2V0U2hvcnRlc3RSb3dJbmRleChvcmdhbml6YXRpb24pLCBtaW5XaWR0aCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhpcy5pbnNlcnROb2RlVG9Sb3cob3JnYW5pemF0aW9uLCBsTm9kZSwgb3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoLCBtaW5XaWR0aCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zaGlmdFRvTGFzdFJvdyhvcmdhbml6YXRpb24pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG9yZ2FuaXphdGlvbjtcclxufTtcclxuXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5pbnNlcnROb2RlVG9Sb3cgPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uLCBub2RlLCByb3dJbmRleCwgbWluV2lkdGgpIHtcclxuICB2YXIgbWluQ29tcG91bmRTaXplID0gbWluV2lkdGg7XHJcblxyXG4gIC8vIEFkZCBuZXcgcm93IGlmIG5lZWRlZFxyXG4gIGlmIChyb3dJbmRleCA9PSBvcmdhbml6YXRpb24ucm93cy5sZW5ndGgpIHtcclxuICAgIHZhciBzZWNvbmREaW1lbnNpb24gPSBbXTtcclxuXHJcbiAgICBvcmdhbml6YXRpb24ucm93cy5wdXNoKHNlY29uZERpbWVuc2lvbik7XHJcbiAgICBvcmdhbml6YXRpb24ucm93V2lkdGgucHVzaChtaW5Db21wb3VuZFNpemUpO1xyXG4gICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodC5wdXNoKDApO1xyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIHJvdyB3aWR0aFxyXG4gIHZhciB3ID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW3Jvd0luZGV4XSArIG5vZGUucmVjdC53aWR0aDtcclxuXHJcbiAgaWYgKG9yZ2FuaXphdGlvbi5yb3dzW3Jvd0luZGV4XS5sZW5ndGggPiAwKSB7XHJcbiAgICB3ICs9IG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZztcclxuICB9XHJcblxyXG4gIG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtyb3dJbmRleF0gPSB3O1xyXG4gIC8vIFVwZGF0ZSBjb21wb3VuZCB3aWR0aFxyXG4gIGlmIChvcmdhbml6YXRpb24ud2lkdGggPCB3KSB7XHJcbiAgICBvcmdhbml6YXRpb24ud2lkdGggPSB3O1xyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIGhlaWdodFxyXG4gIHZhciBoID0gbm9kZS5yZWN0LmhlaWdodDtcclxuICBpZiAocm93SW5kZXggPiAwKVxyXG4gICAgaCArPSBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nO1xyXG5cclxuICB2YXIgZXh0cmFIZWlnaHQgPSAwO1xyXG4gIGlmIChoID4gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtyb3dJbmRleF0pIHtcclxuICAgIGV4dHJhSGVpZ2h0ID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtyb3dJbmRleF07XHJcbiAgICBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XSA9IGg7XHJcbiAgICBleHRyYUhlaWdodCA9IG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbcm93SW5kZXhdIC0gZXh0cmFIZWlnaHQ7XHJcbiAgfVxyXG5cclxuICBvcmdhbml6YXRpb24uaGVpZ2h0ICs9IGV4dHJhSGVpZ2h0O1xyXG5cclxuICAvLyBJbnNlcnQgbm9kZVxyXG4gIG9yZ2FuaXphdGlvbi5yb3dzW3Jvd0luZGV4XS5wdXNoKG5vZGUpO1xyXG59O1xyXG5cclxuLy9TY2FucyB0aGUgcm93cyBvZiBhbiBvcmdhbml6YXRpb24gYW5kIHJldHVybnMgdGhlIG9uZSB3aXRoIHRoZSBtaW4gd2lkdGhcclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmdldFNob3J0ZXN0Um93SW5kZXggPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uKSB7XHJcbiAgdmFyIHIgPSAtMTtcclxuICB2YXIgbWluID0gTnVtYmVyLk1BWF9WQUxVRTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcmdhbml6YXRpb24ucm93cy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXSA8IG1pbikge1xyXG4gICAgICByID0gaTtcclxuICAgICAgbWluID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2ldO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gcjtcclxufTtcclxuXHJcbi8vU2NhbnMgdGhlIHJvd3Mgb2YgYW4gb3JnYW5pemF0aW9uIGFuZCByZXR1cm5zIHRoZSBvbmUgd2l0aCB0aGUgbWF4IHdpZHRoXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRMb25nZXN0Um93SW5kZXggPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uKSB7XHJcbiAgdmFyIHIgPSAtMTtcclxuICB2YXIgbWF4ID0gTnVtYmVyLk1JTl9WQUxVRTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcmdhbml6YXRpb24ucm93cy5sZW5ndGg7IGkrKykge1xyXG5cclxuICAgIGlmIChvcmdhbml6YXRpb24ucm93V2lkdGhbaV0gPiBtYXgpIHtcclxuICAgICAgciA9IGk7XHJcbiAgICAgIG1heCA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiByO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIGNoZWNrcyB3aGV0aGVyIGFkZGluZyBleHRyYSB3aWR0aCB0byB0aGUgb3JnYW5pemF0aW9uIHZpb2xhdGVzXHJcbiAqIHRoZSBhc3BlY3QgcmF0aW8oMSkgb3Igbm90LlxyXG4gKi9cclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmNhbkFkZEhvcml6b250YWwgPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uLCBleHRyYVdpZHRoLCBleHRyYUhlaWdodCkge1xyXG5cclxuICB2YXIgc3JpID0gdGhpcy5nZXRTaG9ydGVzdFJvd0luZGV4KG9yZ2FuaXphdGlvbik7XHJcblxyXG4gIGlmIChzcmkgPCAwKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIHZhciBtaW4gPSBvcmdhbml6YXRpb24ucm93V2lkdGhbc3JpXTtcclxuXHJcbiAgaWYgKG1pbiArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZyArIGV4dHJhV2lkdGggPD0gb3JnYW5pemF0aW9uLndpZHRoKVxyXG4gICAgcmV0dXJuIHRydWU7XHJcblxyXG4gIHZhciBoRGlmZiA9IDA7XHJcblxyXG4gIC8vIEFkZGluZyB0byBhbiBleGlzdGluZyByb3dcclxuICBpZiAob3JnYW5pemF0aW9uLnJvd0hlaWdodFtzcmldIDwgZXh0cmFIZWlnaHQpIHtcclxuICAgIGlmIChzcmkgPiAwKVxyXG4gICAgICBoRGlmZiA9IGV4dHJhSGVpZ2h0ICsgb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZyAtIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbc3JpXTtcclxuICB9XHJcblxyXG4gIHZhciBhZGRfdG9fcm93X3JhdGlvO1xyXG4gIGlmIChvcmdhbml6YXRpb24ud2lkdGggLSBtaW4gPj0gZXh0cmFXaWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZykge1xyXG4gICAgYWRkX3RvX3Jvd19yYXRpbyA9IChvcmdhbml6YXRpb24uaGVpZ2h0ICsgaERpZmYpIC8gKG1pbiArIGV4dHJhV2lkdGggKyBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmcpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBhZGRfdG9fcm93X3JhdGlvID0gKG9yZ2FuaXphdGlvbi5oZWlnaHQgKyBoRGlmZikgLyBvcmdhbml6YXRpb24ud2lkdGg7XHJcbiAgfVxyXG5cclxuICAvLyBBZGRpbmcgYSBuZXcgcm93IGZvciB0aGlzIG5vZGVcclxuICBoRGlmZiA9IGV4dHJhSGVpZ2h0ICsgb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcclxuICB2YXIgYWRkX25ld19yb3dfcmF0aW87XHJcbiAgaWYgKG9yZ2FuaXphdGlvbi53aWR0aCA8IGV4dHJhV2lkdGgpIHtcclxuICAgIGFkZF9uZXdfcm93X3JhdGlvID0gKG9yZ2FuaXphdGlvbi5oZWlnaHQgKyBoRGlmZikgLyBleHRyYVdpZHRoO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBhZGRfbmV3X3Jvd19yYXRpbyA9IChvcmdhbml6YXRpb24uaGVpZ2h0ICsgaERpZmYpIC8gb3JnYW5pemF0aW9uLndpZHRoO1xyXG4gIH1cclxuXHJcbiAgaWYgKGFkZF9uZXdfcm93X3JhdGlvIDwgMSlcclxuICAgIGFkZF9uZXdfcm93X3JhdGlvID0gMSAvIGFkZF9uZXdfcm93X3JhdGlvO1xyXG5cclxuICBpZiAoYWRkX3RvX3Jvd19yYXRpbyA8IDEpXHJcbiAgICBhZGRfdG9fcm93X3JhdGlvID0gMSAvIGFkZF90b19yb3dfcmF0aW87XHJcblxyXG4gIHJldHVybiBhZGRfdG9fcm93X3JhdGlvIDwgYWRkX25ld19yb3dfcmF0aW87XHJcbn07XHJcblxyXG5cclxuLy9JZiBtb3ZpbmcgdGhlIGxhc3Qgbm9kZSBmcm9tIHRoZSBsb25nZXN0IHJvdyBhbmQgYWRkaW5nIGl0IHRvIHRoZSBsYXN0XHJcbi8vcm93IG1ha2VzIHRoZSBib3VuZGluZyBib3ggc21hbGxlciwgZG8gaXQuXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5zaGlmdFRvTGFzdFJvdyA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24pIHtcclxuICB2YXIgbG9uZ2VzdCA9IHRoaXMuZ2V0TG9uZ2VzdFJvd0luZGV4KG9yZ2FuaXphdGlvbik7XHJcbiAgdmFyIGxhc3QgPSBvcmdhbml6YXRpb24ucm93V2lkdGgubGVuZ3RoIC0gMTtcclxuICB2YXIgcm93ID0gb3JnYW5pemF0aW9uLnJvd3NbbG9uZ2VzdF07XHJcbiAgdmFyIG5vZGUgPSByb3dbcm93Lmxlbmd0aCAtIDFdO1xyXG5cclxuICB2YXIgZGlmZiA9IG5vZGUud2lkdGggKyBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmc7XHJcblxyXG4gIC8vIENoZWNrIGlmIHRoZXJlIGlzIGVub3VnaCBzcGFjZSBvbiB0aGUgbGFzdCByb3dcclxuICBpZiAob3JnYW5pemF0aW9uLndpZHRoIC0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xhc3RdID4gZGlmZiAmJiBsb25nZXN0ICE9IGxhc3QpIHtcclxuICAgIC8vIFJlbW92ZSB0aGUgbGFzdCBlbGVtZW50IG9mIHRoZSBsb25nZXN0IHJvd1xyXG4gICAgcm93LnNwbGljZSgtMSwgMSk7XHJcblxyXG4gICAgLy8gUHVzaCBpdCB0byB0aGUgbGFzdCByb3dcclxuICAgIG9yZ2FuaXphdGlvbi5yb3dzW2xhc3RdLnB1c2gobm9kZSk7XHJcblxyXG4gICAgb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xvbmdlc3RdID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xvbmdlc3RdIC0gZGlmZjtcclxuICAgIG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsYXN0XSA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsYXN0XSArIGRpZmY7XHJcbiAgICBvcmdhbml6YXRpb24ud2lkdGggPSBvcmdhbml6YXRpb24ucm93V2lkdGhbdGhpcy5nZXRMb25nZXN0Um93SW5kZXgob3JnYW5pemF0aW9uKV07XHJcblxyXG4gICAgLy8gVXBkYXRlIGhlaWdodHMgb2YgdGhlIG9yZ2FuaXphdGlvblxyXG4gICAgdmFyIG1heEhlaWdodCA9IE51bWJlci5NSU5fVkFMVUU7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvdy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBpZiAocm93W2ldLmhlaWdodCA+IG1heEhlaWdodClcclxuICAgICAgICBtYXhIZWlnaHQgPSByb3dbaV0uaGVpZ2h0O1xyXG4gICAgfVxyXG4gICAgaWYgKGxvbmdlc3QgPiAwKVxyXG4gICAgICBtYXhIZWlnaHQgKz0gb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcclxuXHJcbiAgICB2YXIgcHJldlRvdGFsID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSArIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbGFzdF07XHJcblxyXG4gICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSA9IG1heEhlaWdodDtcclxuICAgIGlmIChvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xhc3RdIDwgbm9kZS5oZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nKVxyXG4gICAgICBvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xhc3RdID0gbm9kZS5oZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nO1xyXG5cclxuICAgIHZhciBmaW5hbFRvdGFsID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSArIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbGFzdF07XHJcbiAgICBvcmdhbml6YXRpb24uaGVpZ2h0ICs9IChmaW5hbFRvdGFsIC0gcHJldlRvdGFsKTtcclxuXHJcbiAgICB0aGlzLnNoaWZ0VG9MYXN0Um93KG9yZ2FuaXphdGlvbik7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBicmllZiA6IGNhbGxlZCBvbiBjb250aW51b3VzIGxheW91dHMgdG8gc3RvcCB0aGVtIGJlZm9yZSB0aGV5IGZpbmlzaFxyXG4gKi9cclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5zdG9wcGVkID0gdHJ1ZTtcclxuXHJcbiAgaWYoIHRoaXMudGhyZWFkICl7XHJcbiAgICB0aGlzLnRocmVhZC5zdG9wKCk7XHJcbiAgfVxyXG4gIFxyXG4gIHRoaXMudHJpZ2dlcignbGF5b3V0c3RvcCcpO1xyXG5cclxuICByZXR1cm4gdGhpczsgLy8gY2hhaW5pbmdcclxufTtcclxuXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5wcm9jZXNzQ2hpbGRyZW5MaXN0ID0gZnVuY3Rpb24gKHBhcmVudCwgY2hpbGRyZW4pIHtcclxuICB2YXIgc2l6ZSA9IGNoaWxkcmVuLmxlbmd0aDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgdmFyIHRoZUNoaWxkID0gY2hpbGRyZW5baV07XHJcbiAgICB0aGlzLm9wdGlvbnMuZWxlcy5ub2RlcygpLmxlbmd0aDtcclxuICAgIHZhciBjaGlsZHJlbl9vZl9jaGlsZHJlbiA9IHRoZUNoaWxkLmNoaWxkcmVuKCk7XHJcbiAgICB2YXIgdGhlTm9kZTtcclxuXHJcbiAgICBpZiAodGhlQ2hpbGQud2lkdGgoKSAhPSBudWxsXHJcbiAgICAgICAgICAgICYmIHRoZUNoaWxkLmhlaWdodCgpICE9IG51bGwpIHtcclxuICAgICAgdGhlTm9kZSA9IHBhcmVudC5hZGQobmV3IENvU0VOb2RlKF9Db1NFTGF5b3V0LmxheW91dC5ncmFwaE1hbmFnZXIsXHJcbiAgICAgICAgICAgICAgbmV3IFBvaW50RCh0aGVDaGlsZC5wb3NpdGlvbigneCcpLCB0aGVDaGlsZC5wb3NpdGlvbigneScpKSxcclxuICAgICAgICAgICAgICBuZXcgRGltZW5zaW9uRChwYXJzZUZsb2F0KHRoZUNoaWxkLndpZHRoKCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgcGFyc2VGbG9hdCh0aGVDaGlsZC5oZWlnaHQoKSkpKSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhlTm9kZSA9IHBhcmVudC5hZGQobmV3IENvU0VOb2RlKHRoaXMuZ3JhcGhNYW5hZ2VyKSk7XHJcbiAgICB9XHJcbiAgICB0aGVOb2RlLmlkID0gdGhlQ2hpbGQuZGF0YShcImlkXCIpO1xyXG4gICAgX0NvU0VMYXlvdXQuaWRUb0xOb2RlW3RoZUNoaWxkLmRhdGEoXCJpZFwiKV0gPSB0aGVOb2RlO1xyXG5cclxuICAgIGlmIChpc05hTih0aGVOb2RlLnJlY3QueCkpIHtcclxuICAgICAgdGhlTm9kZS5yZWN0LnggPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChpc05hTih0aGVOb2RlLnJlY3QueSkpIHtcclxuICAgICAgdGhlTm9kZS5yZWN0LnkgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjaGlsZHJlbl9vZl9jaGlsZHJlbiAhPSBudWxsICYmIGNoaWxkcmVuX29mX2NoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgdmFyIHRoZU5ld0dyYXBoO1xyXG4gICAgICB0aGVOZXdHcmFwaCA9IF9Db1NFTGF5b3V0LmxheW91dC5nZXRHcmFwaE1hbmFnZXIoKS5hZGQoX0NvU0VMYXlvdXQubGF5b3V0Lm5ld0dyYXBoKCksIHRoZU5vZGUpO1xyXG4gICAgICB0aGlzLnByb2Nlc3NDaGlsZHJlbkxpc3QodGhlTmV3R3JhcGgsIGNoaWxkcmVuX29mX2NoaWxkcmVuKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldChjeXRvc2NhcGUpIHtcclxuICBUaHJlYWQgPSBjeXRvc2NhcGUuVGhyZWFkO1xyXG5cclxuICByZXR1cm4gX0NvU0VMYXlvdXQ7XHJcbn07IiwiZnVuY3Rpb24gbGF5b3V0T3B0aW9uc1BhY2soKSB7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbGF5b3V0T3B0aW9uc1BhY2s7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG52YXIgZ2V0TGF5b3V0ID0gcmVxdWlyZSgnLi9MYXlvdXQnKTtcclxuXHJcbnZhciByZWdpc3RlciA9IGZ1bmN0aW9uKCBjeXRvc2NhcGUgKXtcclxuICB2YXIgTGF5b3V0ID0gZ2V0TGF5b3V0KCBjeXRvc2NhcGUgKTtcclxuXHJcbiAgY3l0b3NjYXBlKCdsYXlvdXQnLCAnY29zZS1iaWxrZW50JywgTGF5b3V0KTtcclxufTtcclxuXHJcbmlmKCB0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyApeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxyXG4gIHJlZ2lzdGVyKCBjeXRvc2NhcGUgKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcclxuIl19
