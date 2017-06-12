(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeCoseBilkent = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
CoSEConstants.TILE = true;
CoSEConstants.TILING_PADDING_VERTICAL = 10;
CoSEConstants.TILING_PADDING_HORIZONTAL = 10;

module.exports = CoSEConstants;

},{"./FDLayoutConstants":10}],2:[function(require,module,exports){
var FDLayoutEdge = require('./FDLayoutEdge');

function CoSEEdge(source, target, vEdge) {
  FDLayoutEdge.call(this, source, target, vEdge);
}

CoSEEdge.prototype = Object.create(FDLayoutEdge.prototype);
for (var prop in FDLayoutEdge) {
  CoSEEdge[prop] = FDLayoutEdge[prop];
}

module.exports = CoSEEdge

},{"./FDLayoutEdge":11}],3:[function(require,module,exports){
var LGraph = require('./LGraph');

function CoSEGraph(parent, graphMgr, vGraph) {
  LGraph.call(this, parent, graphMgr, vGraph);
}

CoSEGraph.prototype = Object.create(LGraph.prototype);
for (var prop in LGraph) {
  CoSEGraph[prop] = LGraph[prop];
}

module.exports = CoSEGraph;

},{"./LGraph":19}],4:[function(require,module,exports){
var LGraphManager = require('./LGraphManager');

function CoSEGraphManager(layout) {
  LGraphManager.call(this, layout);
}

CoSEGraphManager.prototype = Object.create(LGraphManager.prototype);
for (var prop in LGraphManager) {
  CoSEGraphManager[prop] = LGraphManager[prop];
}

module.exports = CoSEGraphManager;

},{"./LGraphManager":20}],5:[function(require,module,exports){
var FDLayout = require('./FDLayout');
var CoSEGraphManager = require('./CoSEGraphManager');
var CoSEGraph = require('./CoSEGraph');
var CoSENode = require('./CoSENode');
var CoSEEdge = require('./CoSEEdge');
var CoSEConstants = require('./CoSEConstants');
var FDLayoutConstants = require('./FDLayoutConstants');
var LayoutConstants = require('./LayoutConstants');
var Point = require('./Point');
var PointD = require('./PointD');
var Layout = require('./Layout');
var Integer = require('./Integer');
var IGeometry = require('./IGeometry');
var LGraph = require('./LGraph');
var Transform = require('./Transform');

function CoSELayout() {
  FDLayout.call(this);
  
  this.toBeTiled = {}; // Memorize if a node is to be tiled or is tiled
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

  return true;
};

CoSELayout.prototype.tick = function() {
  this.totalIterations++;
  
  if (this.totalIterations === this.maxIterations) {
    return true; // Layout is not ended return true
  }
  
  if (this.totalIterations % FDLayoutConstants.CONVERGENCE_CHECK_PERIOD == 0)
  {
    if (this.isConverged())
    {
      return true; // Layout is not ended return true
    }

    this.coolingFactor = this.initialCoolingFactor *
            ((this.maxIterations - this.totalIterations) / this.maxIterations);
    this.animationPeriod = Math.ceil(this.initialAnimationPeriod * Math.sqrt(this.coolingFactor));

  }
  this.totalDisplacement = 0;
  this.graphManager.updateBounds();
  this.calcSpringForces();
  this.calcRepulsionForces();
  this.calcGravitationalForces();
  this.moveNodes();
  this.animate();
  
  return false; // Layout is not ended yet return false
};

CoSELayout.prototype.getPositionsData = function() {
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
  
  return pData;
};

CoSELayout.prototype.runSpringEmbedder = function () {
  this.initialAnimationPeriod = 25;
  this.animationPeriod = this.initialAnimationPeriod;
  var layoutEnded = false;
  
  // If aminate option is 'during' signal that layout is supposed to start iterating
  if ( FDLayoutConstants.ANIMATE === 'during' ) {
    this.emit('layoutstarted');
  }
  else {
    // If aminate option is 'during' tick() function will be called on index.js
    while (!layoutEnded) {
      layoutEnded = this.tick();
    }

    this.graphManager.updateBounds();
  }
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

// Tiling methods

// Group zero degree members whose parents are not to be tiled, create dummy parents where needed and fill memberGroups by their dummp parent id's
CoSELayout.prototype.groupZeroDegreeMembers = function () {
  var self = this;
  // array of [parent_id x oneDegreeNode_id]
  var tempMemberGroups = {}; // A temporary map of parent node and its zero degree members
  this.memberGroups = {}; // A map of dummy parent node and its zero degree members whose parents are not to be tiled
  this.idToDummyNode = {}; // A map of id to dummy node 
  
  var zeroDegree = []; // List of zero degree nodes whose parents are not to be tiled
  var allNodes = this.graphManager.getAllNodes();

  // Fill zero degree list
  for (var i = 0; i < allNodes.length; i++) {
    var node = allNodes[i];
    var parent = node.getParent();
    // If a node has zero degree and its parent is not to be tiled if exists add that node to zeroDegres list
    if (this.getNodeDegreeWithChildren(node) === 0 && ( parent.id == undefined || !this.getToBeTiled(parent) ) ) {
      zeroDegree.push(node);
    }
  }

  // Create a map of parent node and its zero degree members
  for (var i = 0; i < zeroDegree.length; i++)
  {
    var node = zeroDegree[i]; // Zero degree node itself
    var p_id = node.getParent().id; // Parent id

    if (typeof tempMemberGroups[p_id] === "undefined")
      tempMemberGroups[p_id] = [];

    tempMemberGroups[p_id] = tempMemberGroups[p_id].concat(node); // Push node to the list belongs to its parent in tempMemberGroups
  }

  // If there are at least two nodes at a level, create a dummy compound for them
  Object.keys(tempMemberGroups).forEach(function(p_id) {
    if (tempMemberGroups[p_id].length > 1) {
      var dummyCompoundId = "DummyCompound_" + p_id; // The id of dummy compound which will be created soon
      self.memberGroups[dummyCompoundId] = tempMemberGroups[p_id]; // Add dummy compound to memberGroups

      var parent = tempMemberGroups[p_id][0].getParent(); // The parent of zero degree nodes will be the parent of new dummy compound

      // Create a dummy compound with calculated id
      var dummyCompound = new CoSENode(self.graphManager);
      dummyCompound.id = dummyCompoundId;
      dummyCompound.paddingLeft = parent.paddingLeft || 0;
      dummyCompound.paddingRight = parent.paddingRight || 0;
      dummyCompound.paddingBottom = parent.paddingBottom || 0;
      dummyCompound.paddingTop = parent.paddingTop || 0;
      
      self.idToDummyNode[dummyCompoundId] = dummyCompound;
      
      var dummyParentGraph = self.getGraphManager().add(self.newGraph(), dummyCompound);
      var parentGraph = parent.getChild();

      // Add dummy compound to parent the graph
      parentGraph.add(dummyCompound);

      // For each zero degree node in this level remove it from its parent graph and add it to the graph of dummy parent
      for (var i = 0; i < tempMemberGroups[p_id].length; i++) {
        var node = tempMemberGroups[p_id][i];
        
        parentGraph.remove(node);
        dummyParentGraph.add(node);
      }
    }
  });
};

CoSELayout.prototype.clearCompounds = function () {
  var childGraphMap = {};
  var idToNode = {};

  // Get compound ordering by finding the inner one first
  this.performDFSOnCompounds();

  for (var i = 0; i < this.compoundOrder.length; i++) {
    
    idToNode[this.compoundOrder[i].id] = this.compoundOrder[i];
    childGraphMap[this.compoundOrder[i].id] = [].concat(this.compoundOrder[i].getChild().getNodes());

    // Remove children of compounds
    this.graphManager.remove(this.compoundOrder[i].getChild());
    this.compoundOrder[i].child = null;
  }
  
  this.graphManager.resetAllNodes();
  
  // Tile the removed children
  this.tileCompoundMembers(childGraphMap, idToNode);
};

CoSELayout.prototype.clearZeroDegreeMembers = function () {
  var self = this;
  var tiledZeroDegreePack = this.tiledZeroDegreePack = [];

  Object.keys(this.memberGroups).forEach(function(id) {
    var compoundNode = self.idToDummyNode[id]; // Get the dummy compound

    tiledZeroDegreePack[id] = self.tileNodes(self.memberGroups[id], compoundNode.paddingLeft + compoundNode.paddingRight);

    // Set the width and height of the dummy compound as calculated
    compoundNode.rect.width = tiledZeroDegreePack[id].width;
    compoundNode.rect.height = tiledZeroDegreePack[id].height;
  });
};

CoSELayout.prototype.repopulateCompounds = function () {
  for (var i = this.compoundOrder.length - 1; i >= 0; i--) {
    var lCompoundNode = this.compoundOrder[i];
    var id = lCompoundNode.id;
    var horizontalMargin = lCompoundNode.paddingLeft;
    var verticalMargin = lCompoundNode.paddingTop;

    this.adjustLocations(this.tiledMemberPack[id], lCompoundNode.rect.x, lCompoundNode.rect.y, horizontalMargin, verticalMargin);
  }
};

CoSELayout.prototype.repopulateZeroDegreeMembers = function () {
  var self = this;
  var tiledPack = this.tiledZeroDegreePack;
  
  Object.keys(tiledPack).forEach(function(id) {
    var compoundNode = self.idToDummyNode[id]; // Get the dummy compound by its id
    var horizontalMargin = compoundNode.paddingLeft;
    var verticalMargin = compoundNode.paddingTop;

    // Adjust the positions of nodes wrt its compound
    self.adjustLocations(tiledPack[id], compoundNode.rect.x, compoundNode.rect.y, horizontalMargin, verticalMargin);
  });
};

CoSELayout.prototype.getToBeTiled = function (node) {
  var id = node.id;
  //firstly check the previous results
  if (this.toBeTiled[id] != null) {
    return this.toBeTiled[id];
  }

  //only compound nodes are to be tiled
  var childGraph = node.getChild();
  if (childGraph == null) {
    this.toBeTiled[id] = false;
    return false;
  }

  var children = childGraph.getNodes(); // Get the children nodes

  //a compound node is not to be tiled if all of its compound children are not to be tiled
  for (var i = 0; i < children.length; i++) {
    var theChild = children[i];

    if (this.getNodeDegree(theChild) > 0) {
      this.toBeTiled[id] = false;
      return false;
    }

    //pass the children not having the compound structure
    if (theChild.getChild() == null) {
      this.toBeTiled[theChild.id] = false;
      continue;
    }

    if (!this.getToBeTiled(theChild)) {
      this.toBeTiled[id] = false;
      return false;
    }
  }
  this.toBeTiled[id] = true;
  return true;
};

// Get degree of a node depending of its edges and independent of its children
CoSELayout.prototype.getNodeDegree = function (node) {
  var id = node.id;
  var edges = node.getEdges();
  var degree = 0;
  
  // For the edges connected
  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
    if (edge.getSource().id !== edge.getTarget().id) {
      degree = degree + 1;
    }
  }
  return degree;
};

// Get degree of a node with its children
CoSELayout.prototype.getNodeDegreeWithChildren = function (node) {
  var degree = this.getNodeDegree(node);
  if (node.getChild() == null) {
    return degree;
  }
  var children = node.getChild().getNodes();
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    degree += this.getNodeDegreeWithChildren(child);
  }
  return degree;
};

CoSELayout.prototype.performDFSOnCompounds = function () {
  this.compoundOrder = [];
  this.fillCompexOrderByDFS(this.graphManager.getRoot().getNodes());
};

CoSELayout.prototype.fillCompexOrderByDFS = function (children) {
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child.getChild() != null) {
      this.fillCompexOrderByDFS(child.getChild().getNodes());
    }
    if (this.getToBeTiled(child)) {
      this.compoundOrder.push(child);
    }
  }
};

/**
* This method places each zero degree member wrt given (x,y) coordinates (top left).
*/
CoSELayout.prototype.adjustLocations = function (organization, x, y, compoundHorizontalMargin, compoundVerticalMargin) {
  x += compoundHorizontalMargin;
  y += compoundVerticalMargin;

  var left = x;

  for (var i = 0; i < organization.rows.length; i++) {
    var row = organization.rows[i];
    x = left;
    var maxHeight = 0;

    for (var j = 0; j < row.length; j++) {
      var lnode = row[j];

      lnode.rect.x = x;// + lnode.rect.width / 2;
      lnode.rect.y = y;// + lnode.rect.height / 2;

      x += lnode.rect.width + organization.horizontalPadding;

      if (lnode.rect.height > maxHeight)
        maxHeight = lnode.rect.height;
    }

    y += maxHeight + organization.verticalPadding;
  }
};

CoSELayout.prototype.tileCompoundMembers = function (childGraphMap, idToNode) {
  var self = this;
  this.tiledMemberPack = [];

  Object.keys(childGraphMap).forEach(function(id) {
    // Get the compound node
    var compoundNode = idToNode[id];

    self.tiledMemberPack[id] = self.tileNodes(childGraphMap[id], compoundNode.paddingLeft + compoundNode.paddingRight);

    compoundNode.rect.width = self.tiledMemberPack[id].width + 20;
    compoundNode.rect.height = self.tiledMemberPack[id].height + 20;
  });
};

CoSELayout.prototype.tileNodes = function (nodes, minWidth) {
  var verticalPadding = CoSEConstants.TILING_PADDING_VERTICAL;
  var horizontalPadding = CoSEConstants.TILING_PADDING_HORIZONTAL;
  var organization = {
    rows: [],
    rowWidth: [],
    rowHeight: [],
    width: 20,
    height: 20,
    verticalPadding: verticalPadding,
    horizontalPadding: horizontalPadding
  };

  // Sort the nodes in ascending order of their areas
  nodes.sort(function (n1, n2) {
    if (n1.rect.width * n1.rect.height > n2.rect.width * n2.rect.height)
      return -1;
    if (n1.rect.width * n1.rect.height < n2.rect.width * n2.rect.height)
      return 1;
    return 0;
  });

  // Create the organization -> tile members
  for (var i = 0; i < nodes.length; i++) {
    var lNode = nodes[i];
    
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

CoSELayout.prototype.insertNodeToRow = function (organization, node, rowIndex, minWidth) {
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
CoSELayout.prototype.getShortestRowIndex = function (organization) {
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
CoSELayout.prototype.getLongestRowIndex = function (organization) {
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
CoSELayout.prototype.canAddHorizontal = function (organization, extraWidth, extraHeight) {

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
CoSELayout.prototype.shiftToLastRow = function (organization) {
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
    organization.width = organization.rowWidth[instance.getLongestRowIndex(organization)];

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

CoSELayout.prototype.tilingPreLayout = function() {
  if (CoSEConstants.TILE) {
    // Find zero degree nodes and create a compound for each level
    this.groupZeroDegreeMembers();
    // Tile and clear children of each compound
    this.clearCompounds();
    // Separately tile and clear zero degree nodes for each level
    this.clearZeroDegreeMembers();
  }
};

CoSELayout.prototype.tilingPostLayout = function() {
  if (CoSEConstants.TILE) {
    this.repopulateZeroDegreeMembers();
    this.repopulateCompounds();
  }
};

module.exports = CoSELayout;

},{"./CoSEConstants":1,"./CoSEEdge":2,"./CoSEGraph":3,"./CoSEGraphManager":4,"./CoSENode":6,"./FDLayout":9,"./FDLayoutConstants":10,"./IGeometry":15,"./Integer":17,"./LGraph":19,"./Layout":23,"./LayoutConstants":24,"./Point":25,"./PointD":26,"./Transform":29}],6:[function(require,module,exports){
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

},{"./FDLayoutNode":12,"./IMath":16}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
function Emitter(){
  this.listeners = [];
}

var p = Emitter.prototype;

p.addListener = function( event, callback ){
  this.listeners.push({
    event: event,
    callback: callback
  });
};

p.removeListener = function( event, callback ){
  for( var i = this.listeners.length; i >= 0; i-- ){
    var l = this.listeners[i];

    if( l.event === event && l.callback === callback ){
      this.listeners.splice( i, 1 );
    }
  }
};

p.emit = function( event, data ){
  for( var i = 0; i < this.listeners.length; i++ ){
    var l = this.listeners[i];

    if( event === l.event ){
      l.callback( data );
    }
  }
};

module.exports = Emitter;

},{}],9:[function(require,module,exports){
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

},{"./FDLayoutConstants":10,"./IGeometry":15,"./IMath":16,"./Layout":23,"./LayoutConstants":24}],10:[function(require,module,exports){
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

},{"./LayoutConstants":24}],11:[function(require,module,exports){
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

},{"./FDLayoutConstants":10,"./LEdge":18}],12:[function(require,module,exports){
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

},{"./LNode":22}],13:[function(require,module,exports){
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

},{"./UniqueIDGeneretor":30}],14:[function(require,module,exports){
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

},{"./UniqueIDGeneretor":30}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
function Integer() {
}

Integer.MAX_VALUE = 2147483647;
Integer.MIN_VALUE = -2147483648;

module.exports = Integer;

},{}],18:[function(require,module,exports){
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

},{"./IGeometry":15,"./IMath":16,"./LGraphObject":21}],19:[function(require,module,exports){
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
  var self = this;
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
     Object.keys(visited.set).forEach(function(visitedId) {
      var visitedNode = visited.set[visitedId];
      if (visitedNode.owner == self)
      {
        noOfVisitedInThisGraph++;
      }
    });

    if (noOfVisitedInThisGraph == this.nodes.length)
    {
      this.isConnected = true;
    }
  }
};

module.exports = LGraph;

},{"./HashSet":14,"./Integer":17,"./LGraphManager":20,"./LGraphObject":21,"./LNode":22,"./LayoutConstants":24,"./Point":25,"./RectangleD":28}],20:[function(require,module,exports){
var LGraph;
var LEdge = require('./LEdge');

function LGraphManager(layout) {
  LGraph = require('./LGraph'); // It may be better to initilize this out of this function but it gives an error (Right-hand side of 'instanceof' is not callable) now.
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

},{"./LEdge":18,"./LGraph":19}],21:[function(require,module,exports){
function LGraphObject(vGraphObject) {
  this.vGraphObject = vGraphObject;
}

module.exports = LGraphObject;

},{}],22:[function(require,module,exports){
var LGraphObject = require('./LGraphObject');
var Integer = require('./Integer');
var RectangleD = require('./RectangleD');
var LayoutConstants = require('./LayoutConstants');
var RandomSeed = require('./RandomSeed');
var PointD = require('./PointD');
var HashSet = require('./HashSet');

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
  var self = this;

  self.edges.forEach(function(edge) {
    
    if (edge.target == to)
    {
      if (edge.source != self)
        throw "Incorrect edge source!";

      edgeList.push(edge);
    }
  });

  return edgeList;
};

LNode.prototype.getEdgesBetween = function (other)
{
  var edgeList = [];
  var edge;
  
  var self = this;
  self.edges.forEach(function(edge) {

    if (!(edge.source == self || edge.target == self))
      throw "Incorrect edge source and/or target";

    if ((edge.target == other) || (edge.source == other))
    {
      edgeList.push(edge);
    }
  });

  return edgeList;
};

LNode.prototype.getNeighborsList = function ()
{
  var neighbors = new HashSet();
  var edge;
  
  var self = this;
  self.edges.forEach(function(edge) {

    if (edge.source == self)
    {
      neighbors.add(edge.target);
    }
    else
    {
      if (edge.target != self) {
        throw "Incorrect incidency!";
      }
    
      neighbors.add(edge.source);
    }
  });

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

    this.setWidth(childGraph.getRight() - childGraph.getLeft());
    this.setHeight(childGraph.getBottom() - childGraph.getTop());
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

},{"./HashSet":14,"./Integer":17,"./LGraphObject":21,"./LayoutConstants":24,"./PointD":26,"./RandomSeed":27,"./RectangleD":28}],23:[function(require,module,exports){
var LayoutConstants = require('./LayoutConstants');
var HashMap = require('./HashMap');
var LGraphManager = require('./LGraphManager');
var LNode = require('./LNode');
var LEdge = require('./LEdge');
var LGraph = require('./LGraph');
var PointD = require('./PointD');
var Transform = require('./Transform');
var Emitter = require('./Emitter');
var HashSet = require('./HashSet');

function Layout(isRemoteUse) {
  Emitter.call( this );

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

Layout.prototype = Object.create( Emitter.prototype );

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
  
  if (this.tilingPreLayout) {
    this.tilingPreLayout();
  }

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
    }
  }

  if (isLayoutSuccessfull)
  {
    if (!this.isSubLayout)
    {
      this.doPostLayout();
    }
  }

  if (this.tilingPostLayout) {
    this.tilingPostLayout();
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

      Object.keys(neighbours.set).forEach(function(j) {
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
      });
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

},{"./Emitter":8,"./HashMap":13,"./HashSet":14,"./LEdge":18,"./LGraph":19,"./LGraphManager":20,"./LNode":22,"./LayoutConstants":24,"./PointD":26,"./Transform":29}],24:[function(require,module,exports){
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
LayoutConstants.DEFAULT_GRAPH_MARGIN = 15;

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

},{}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
function RandomSeed() {
}
RandomSeed.seed = 1;
RandomSeed.x = 0;

RandomSeed.nextDouble = function () {
  RandomSeed.x = Math.sin(RandomSeed.seed++) * 10000;
  return RandomSeed.x - Math.floor(RandomSeed.x);
};

module.exports = RandomSeed;

},{}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
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

},{"./PointD":26}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

var defaults = {
  // Called on `layoutready`
  ready: function () {
  },
  // Called on `layoutstop`
  stop: function () {
  },
  // number of ticks per frame; higher is faster but more jerky
  refresh: 30,
  // Whether to fit the network view after when done
  fit: true,
  // Padding on fit
  padding: 10,
  // Padding for compounds
  paddingCompound: 15,
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
  // Duration for animate:end
  animationDuration: 500,
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
};

function _CoSELayout(_options) {
  this.options = extend(defaults, _options);
  getUserOptions(this.options);
}

var getUserOptions = function (options) {
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
  if (options.paddingCompound != null)
    CoSEConstants.DEFAULT_GRAPH_MARGIN = FDLayoutConstants.DEFAULT_GRAPH_MARGIN = LayoutConstants.DEFAULT_GRAPH_MARGIN = options.paddingCompound;
  if (options.gravityRange != null)
    CoSEConstants.DEFAULT_GRAVITY_RANGE_FACTOR = FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR = options.gravityRange;
  if(options.gravityCompound != null)
    CoSEConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = options.gravityCompound;
  if(options.gravityRangeCompound != null)
    CoSEConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = options.gravityRangeCompound;

  CoSEConstants.DEFAULT_INCREMENTAL = FDLayoutConstants.DEFAULT_INCREMENTAL = LayoutConstants.DEFAULT_INCREMENTAL =
          !(options.randomize);
  CoSEConstants.ANIMATE = FDLayoutConstants.ANIMATE = options.animate;
  CoSEConstants.TILE = options.tile;
  CoSEConstants.TILING_PADDING_VERTICAL = 
          typeof options.tilingPaddingVertical === 'function' ? options.tilingPaddingVertical.call() : options.tilingPaddingVertical;
  CoSEConstants.TILING_PADDING_HORIZONTAL = 
          typeof options.tilingPaddingHorizontal === 'function' ? options.tilingPaddingHorizontal.call() : options.tilingPaddingHorizontal;
};

_CoSELayout.prototype.run = function () {
  var ready;
  var frameId;
  var options = this.options;
  var idToLNode = this.idToLNode = {};
  var layout = this.layout = new CoSELayout();
  var self = this;
  
  this.cy = this.options.cy;

  this.cy.trigger({ type: 'layoutstart', layout: this });

  var gm = layout.newGraphManager();
  this.gm = gm;

  var nodes = this.options.eles.nodes();
  var edges = this.options.eles.edges();

  this.root = gm.addRoot();
  this.processChildrenList(this.root, this.getTopMostNodes(nodes), layout);


  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
    var sourceNode = this.idToLNode[edge.data("source")];
    var targetNode = this.idToLNode[edge.data("target")];
    var e1 = gm.add(layout.newEdge(), sourceNode, targetNode);
    e1.id = edge.id();
  }
  
   var getPositions = function(ele, i){
    if(typeof ele === "number") {
      ele = i;
    }
    var theId = ele.data('id');
    var lNode = self.idToLNode[theId];

    return {
      x: lNode.getRect().getCenterX(),
      y: lNode.getRect().getCenterY()
    };
  };
  
  /*
   * Reposition nodes in iterations animatedly
   */
  var iterateAnimated = function () {
    // Thigs to perform after nodes are repositioned on screen
    var afterReposition = function() {
      if (options.fit) {
        options.cy.fit(options.eles.nodes(), options.padding);
      }

      if (!ready) {
        ready = true;
        self.cy.one('layoutready', options.ready);
        self.cy.trigger({type: 'layoutready', layout: self});
      }
    };
    
    var ticksPerFrame = self.options.refresh;
    var isDone;

    for( var i = 0; i < ticksPerFrame && !isDone; i++ ){
      isDone = self.layout.tick();
    }
    
    // If layout is done
    if (isDone) {
      self.options.eles.nodes().positions(getPositions);
      
      afterReposition();
      
      // trigger layoutstop when the layout stops (e.g. finishes)
      self.cy.one('layoutstop', self.options.stop);
      self.cy.trigger('layoutstop');
      self.cy.trigger({ type: 'layoutstop', layout: self });

      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      
      self.options.eles.nodes().removeScratch('coseBilkent');
      ready = false;
      return;
    }
    
    var animationData = self.layout.getPositionsData(); // Get positions of layout nodes note that all nodes may not be layout nodes because of tiling
    
    // Position nodes, for the nodes whose id does not included in data (because they are removed from their parents and included in dummy compounds)
    // use position of their ancestors or dummy ancestors
    options.eles.nodes().positions(function (ele, i) {
      if (typeof ele === "number") {
        ele = i;
      }
      var theId = ele.id();
      var pNode = animationData[theId];
      var temp = ele;
      // If pNode is undefined search until finding position data of its first ancestor (It may be dummy as well)
      while (pNode == null) {
        pNode = animationData[temp.data('parent')] || animationData['DummyCompound_' + temp.data('parent')];
        animationData[theId] = pNode;
        temp = temp.parent()[0];
      }
      return {
        x: pNode.x,
        y: pNode.y
      };
    });

    afterReposition();

    frameId = requestAnimationFrame(iterateAnimated);
  };
  
  /*
  * Listen 'layoutstarted' event and start animated iteration if animate option is 'during'
  */
  layout.addListener('layoutstarted', function () {
    if (self.options.animate === 'during') {
      frameId = requestAnimationFrame(iterateAnimated);
    }
  });
  
  layout.runLayout(); // Run cose layout
  
  /*
   * If animate option is not 'during' ('end' or false) perform these here (If it is 'during' similar things are already performed)
   */
  if(this.options.animate !== 'during'){
    setTimeout(function() {
      self.options.eles.nodes().not(":parent").layoutPositions(self, self.options, getPositions); // Use layout positions to reposition the nodes it considers the options parameter
      self.options.eles.nodes().removeScratch('coseBilkent');
      ready = false;
    }, 0);
    
  }

  return this; // chaining
};

//Get the top most ones of a list of nodes
_CoSELayout.prototype.getTopMostNodes = function(nodes) {
  var nodesMap = {};
  for (var i = 0; i < nodes.length; i++) {
      nodesMap[nodes[i].id()] = true;
  }
  var roots = nodes.filter(function (ele, i) {
      if(typeof ele === "number") {
        ele = i;
      }
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

_CoSELayout.prototype.processChildrenList = function (parent, children, layout) {
  var size = children.length;
  for (var i = 0; i < size; i++) {
    var theChild = children[i];
    this.options.eles.nodes().length;
    var children_of_children = theChild.children();
    var theNode;

    if (theChild.width() != null
            && theChild.height() != null) {
      theNode = parent.add(new CoSENode(layout.graphManager,
              new PointD(theChild.position('x') - theChild.width() / 2, theChild.position('y') - theChild.height() / 2),
              new DimensionD(parseFloat(theChild.width()),
                      parseFloat(theChild.height()))));
    }
    else {
      theNode = parent.add(new CoSENode(this.graphManager));
    }
    // Attach id to the layout node
    theNode.id = theChild.data("id");
    // Attach the paddings of cy node to layout node
    theNode.paddingLeft = parseInt( theChild.css('padding-left') );
    theNode.paddingTop = parseInt( theChild.css('padding-top') );
    theNode.paddingRight = parseInt( theChild.css('padding-right') );
    theNode.paddingBottom = parseInt( theChild.css('padding-bottom') );
    // Map the layout node
    this.idToLNode[theChild.data("id")] = theNode;

    if (isNaN(theNode.rect.x)) {
      theNode.rect.x = 0;
    }

    if (isNaN(theNode.rect.y)) {
      theNode.rect.y = 0;
    }

    if (children_of_children != null && children_of_children.length > 0) {
      var theNewGraph;
      theNewGraph = layout.getGraphManager().add(layout.newGraph(), theNode);
      this.processChildrenList(theNewGraph, children_of_children, layout);
    }
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

module.exports = function get(cytoscape) {
  return _CoSELayout;
};

},{"./CoSEConstants":1,"./CoSEEdge":2,"./CoSEGraph":3,"./CoSEGraphManager":4,"./CoSELayout":5,"./CoSENode":6,"./DimensionD":7,"./FDLayout":9,"./FDLayoutConstants":10,"./FDLayoutEdge":11,"./FDLayoutNode":12,"./HashMap":13,"./HashSet":14,"./IGeometry":15,"./IMath":16,"./Integer":17,"./LEdge":18,"./LGraph":19,"./LGraphManager":20,"./LGraphObject":21,"./LNode":22,"./Layout":23,"./LayoutConstants":24,"./Point":25,"./PointD":26,"./RandomSeed":27,"./RectangleD":28,"./Transform":29,"./UniqueIDGeneretor":30}],32:[function(require,module,exports){
'use strict';

// registers the extension on a cytoscape lib ref
var getLayout = require('./Layout');

var register = function( cytoscape ){
  var Layout = getLayout( cytoscape );

  cytoscape('layout', 'cose-bilkent', Layout);
};

// auto reg for globals
if( typeof cytoscape !== 'undefined' ){
  register( cytoscape );
}

module.exports = register;

},{"./Layout":31}]},{},[32])(32)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvTGF5b3V0L0NvU0VDb25zdGFudHMuanMiLCJzcmMvTGF5b3V0L0NvU0VFZGdlLmpzIiwic3JjL0xheW91dC9Db1NFR3JhcGguanMiLCJzcmMvTGF5b3V0L0NvU0VHcmFwaE1hbmFnZXIuanMiLCJzcmMvTGF5b3V0L0NvU0VMYXlvdXQuanMiLCJzcmMvTGF5b3V0L0NvU0VOb2RlLmpzIiwic3JjL0xheW91dC9EaW1lbnNpb25ELmpzIiwic3JjL0xheW91dC9FbWl0dGVyLmpzIiwic3JjL0xheW91dC9GRExheW91dC5qcyIsInNyYy9MYXlvdXQvRkRMYXlvdXRDb25zdGFudHMuanMiLCJzcmMvTGF5b3V0L0ZETGF5b3V0RWRnZS5qcyIsInNyYy9MYXlvdXQvRkRMYXlvdXROb2RlLmpzIiwic3JjL0xheW91dC9IYXNoTWFwLmpzIiwic3JjL0xheW91dC9IYXNoU2V0LmpzIiwic3JjL0xheW91dC9JR2VvbWV0cnkuanMiLCJzcmMvTGF5b3V0L0lNYXRoLmpzIiwic3JjL0xheW91dC9JbnRlZ2VyLmpzIiwic3JjL0xheW91dC9MRWRnZS5qcyIsInNyYy9MYXlvdXQvTEdyYXBoLmpzIiwic3JjL0xheW91dC9MR3JhcGhNYW5hZ2VyLmpzIiwic3JjL0xheW91dC9MR3JhcGhPYmplY3QuanMiLCJzcmMvTGF5b3V0L0xOb2RlLmpzIiwic3JjL0xheW91dC9MYXlvdXQuanMiLCJzcmMvTGF5b3V0L0xheW91dENvbnN0YW50cy5qcyIsInNyYy9MYXlvdXQvUG9pbnQuanMiLCJzcmMvTGF5b3V0L1BvaW50RC5qcyIsInNyYy9MYXlvdXQvUmFuZG9tU2VlZC5qcyIsInNyYy9MYXlvdXQvUmVjdGFuZ2xlRC5qcyIsInNyYy9MYXlvdXQvVHJhbnNmb3JtLmpzIiwic3JjL0xheW91dC9VbmlxdWVJREdlbmVyZXRvci5qcyIsInNyYy9MYXlvdXQvaW5kZXguanMiLCJzcmMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzE2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcclxuXHJcbmZ1bmN0aW9uIENvU0VDb25zdGFudHMoKSB7XHJcbn1cclxuXHJcbi8vQ29TRUNvbnN0YW50cyBpbmhlcml0cyBzdGF0aWMgcHJvcHMgaW4gRkRMYXlvdXRDb25zdGFudHNcclxuZm9yICh2YXIgcHJvcCBpbiBGRExheW91dENvbnN0YW50cykge1xyXG4gIENvU0VDb25zdGFudHNbcHJvcF0gPSBGRExheW91dENvbnN0YW50c1twcm9wXTtcclxufVxyXG5cclxuQ29TRUNvbnN0YW50cy5ERUZBVUxUX1VTRV9NVUxUSV9MRVZFTF9TQ0FMSU5HID0gZmFsc2U7XHJcbkNvU0VDb25zdGFudHMuREVGQVVMVF9SQURJQUxfU0VQQVJBVElPTiA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEg7XHJcbkNvU0VDb25zdGFudHMuREVGQVVMVF9DT01QT05FTlRfU0VQRVJBVElPTiA9IDYwO1xyXG5Db1NFQ29uc3RhbnRzLlRJTEUgPSB0cnVlO1xyXG5Db1NFQ29uc3RhbnRzLlRJTElOR19QQURESU5HX1ZFUlRJQ0FMID0gMTA7XHJcbkNvU0VDb25zdGFudHMuVElMSU5HX1BBRERJTkdfSE9SSVpPTlRBTCA9IDEwO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb1NFQ29uc3RhbnRzO1xyXG4iLCJ2YXIgRkRMYXlvdXRFZGdlID0gcmVxdWlyZSgnLi9GRExheW91dEVkZ2UnKTtcclxuXHJcbmZ1bmN0aW9uIENvU0VFZGdlKHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSkge1xyXG4gIEZETGF5b3V0RWRnZS5jYWxsKHRoaXMsIHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSk7XHJcbn1cclxuXHJcbkNvU0VFZGdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRkRMYXlvdXRFZGdlLnByb3RvdHlwZSk7XHJcbmZvciAodmFyIHByb3AgaW4gRkRMYXlvdXRFZGdlKSB7XHJcbiAgQ29TRUVkZ2VbcHJvcF0gPSBGRExheW91dEVkZ2VbcHJvcF07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29TRUVkZ2VcclxuIiwidmFyIExHcmFwaCA9IHJlcXVpcmUoJy4vTEdyYXBoJyk7XHJcblxyXG5mdW5jdGlvbiBDb1NFR3JhcGgocGFyZW50LCBncmFwaE1nciwgdkdyYXBoKSB7XHJcbiAgTEdyYXBoLmNhbGwodGhpcywgcGFyZW50LCBncmFwaE1nciwgdkdyYXBoKTtcclxufVxyXG5cclxuQ29TRUdyYXBoLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEdyYXBoLnByb3RvdHlwZSk7XHJcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoKSB7XHJcbiAgQ29TRUdyYXBoW3Byb3BdID0gTEdyYXBoW3Byb3BdO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvU0VHcmFwaDtcclxuIiwidmFyIExHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0xHcmFwaE1hbmFnZXInKTtcclxuXHJcbmZ1bmN0aW9uIENvU0VHcmFwaE1hbmFnZXIobGF5b3V0KSB7XHJcbiAgTEdyYXBoTWFuYWdlci5jYWxsKHRoaXMsIGxheW91dCk7XHJcbn1cclxuXHJcbkNvU0VHcmFwaE1hbmFnZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGhNYW5hZ2VyLnByb3RvdHlwZSk7XHJcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoTWFuYWdlcikge1xyXG4gIENvU0VHcmFwaE1hbmFnZXJbcHJvcF0gPSBMR3JhcGhNYW5hZ2VyW3Byb3BdO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvU0VHcmFwaE1hbmFnZXI7XHJcbiIsInZhciBGRExheW91dCA9IHJlcXVpcmUoJy4vRkRMYXlvdXQnKTtcclxudmFyIENvU0VHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0NvU0VHcmFwaE1hbmFnZXInKTtcclxudmFyIENvU0VHcmFwaCA9IHJlcXVpcmUoJy4vQ29TRUdyYXBoJyk7XHJcbnZhciBDb1NFTm9kZSA9IHJlcXVpcmUoJy4vQ29TRU5vZGUnKTtcclxudmFyIENvU0VFZGdlID0gcmVxdWlyZSgnLi9Db1NFRWRnZScpO1xyXG52YXIgQ29TRUNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQ29TRUNvbnN0YW50cycpO1xyXG52YXIgRkRMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0ZETGF5b3V0Q29uc3RhbnRzJyk7XHJcbnZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL1BvaW50Jyk7XHJcbnZhciBQb2ludEQgPSByZXF1aXJlKCcuL1BvaW50RCcpO1xyXG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9MYXlvdXQnKTtcclxudmFyIEludGVnZXIgPSByZXF1aXJlKCcuL0ludGVnZXInKTtcclxudmFyIElHZW9tZXRyeSA9IHJlcXVpcmUoJy4vSUdlb21ldHJ5Jyk7XHJcbnZhciBMR3JhcGggPSByZXF1aXJlKCcuL0xHcmFwaCcpO1xyXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9UcmFuc2Zvcm0nKTtcclxuXHJcbmZ1bmN0aW9uIENvU0VMYXlvdXQoKSB7XHJcbiAgRkRMYXlvdXQuY2FsbCh0aGlzKTtcclxuICBcclxuICB0aGlzLnRvQmVUaWxlZCA9IHt9OyAvLyBNZW1vcml6ZSBpZiBhIG5vZGUgaXMgdG8gYmUgdGlsZWQgb3IgaXMgdGlsZWRcclxufVxyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZETGF5b3V0LnByb3RvdHlwZSk7XHJcblxyXG5mb3IgKHZhciBwcm9wIGluIEZETGF5b3V0KSB7XHJcbiAgQ29TRUxheW91dFtwcm9wXSA9IEZETGF5b3V0W3Byb3BdO1xyXG59XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdHcmFwaE1hbmFnZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGdtID0gbmV3IENvU0VHcmFwaE1hbmFnZXIodGhpcyk7XHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIgPSBnbTtcclxuICByZXR1cm4gZ207XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdHcmFwaCA9IGZ1bmN0aW9uICh2R3JhcGgpIHtcclxuICByZXR1cm4gbmV3IENvU0VHcmFwaChudWxsLCB0aGlzLmdyYXBoTWFuYWdlciwgdkdyYXBoKTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLm5ld05vZGUgPSBmdW5jdGlvbiAodk5vZGUpIHtcclxuICByZXR1cm4gbmV3IENvU0VOb2RlKHRoaXMuZ3JhcGhNYW5hZ2VyLCB2Tm9kZSk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdFZGdlID0gZnVuY3Rpb24gKHZFZGdlKSB7XHJcbiAgcmV0dXJuIG5ldyBDb1NFRWRnZShudWxsLCBudWxsLCB2RWRnZSk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycyA9IGZ1bmN0aW9uICgpIHtcclxuICBGRExheW91dC5wcm90b3R5cGUuaW5pdFBhcmFtZXRlcnMuY2FsbCh0aGlzLCBhcmd1bWVudHMpO1xyXG4gIGlmICghdGhpcy5pc1N1YkxheW91dCkge1xyXG4gICAgaWYgKENvU0VDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA8IDEwKVxyXG4gICAge1xyXG4gICAgICB0aGlzLmlkZWFsRWRnZUxlbmd0aCA9IDEwO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICB0aGlzLmlkZWFsRWRnZUxlbmd0aCA9IENvU0VDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnVzZVNtYXJ0SWRlYWxFZGdlTGVuZ3RoQ2FsY3VsYXRpb24gPVxyXG4gICAgICAgICAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfVVNFX1NNQVJUX0lERUFMX0VER0VfTEVOR1RIX0NBTENVTEFUSU9OO1xyXG4gICAgdGhpcy5zcHJpbmdDb25zdGFudCA9XHJcbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfU1BSSU5HX1NUUkVOR1RIO1xyXG4gICAgdGhpcy5yZXB1bHNpb25Db25zdGFudCA9XHJcbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RIO1xyXG4gICAgdGhpcy5ncmF2aXR5Q29uc3RhbnQgPVxyXG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEg7XHJcbiAgICB0aGlzLmNvbXBvdW5kR3Jhdml0eUNvbnN0YW50ID1cclxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1NUUkVOR1RIO1xyXG4gICAgdGhpcy5ncmF2aXR5UmFuZ2VGYWN0b3IgPVxyXG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfUkFOR0VfRkFDVE9SO1xyXG4gICAgdGhpcy5jb21wb3VuZEdyYXZpdHlSYW5nZUZhY3RvciA9XHJcbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XHJcbiAgfVxyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUubGF5b3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBjcmVhdGVCZW5kc0FzTmVlZGVkID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ1JFQVRFX0JFTkRTX0FTX05FRURFRDtcclxuICBpZiAoY3JlYXRlQmVuZHNBc05lZWRlZClcclxuICB7XHJcbiAgICB0aGlzLmNyZWF0ZUJlbmRwb2ludHMoKTtcclxuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLnJlc2V0QWxsRWRnZXMoKTtcclxuICB9XHJcblxyXG4gIHRoaXMubGV2ZWwgPSAwO1xyXG4gIHJldHVybiB0aGlzLmNsYXNzaWNMYXlvdXQoKTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmNsYXNzaWNMYXlvdXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5jYWxjdWxhdGVOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvblRvKCk7XHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIuY2FsY0xvd2VzdENvbW1vbkFuY2VzdG9ycygpO1xyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLmNhbGNJbmNsdXNpb25UcmVlRGVwdGhzKCk7XHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmNhbGNFc3RpbWF0ZWRTaXplKCk7XHJcbiAgdGhpcy5jYWxjSWRlYWxFZGdlTGVuZ3RocygpO1xyXG4gIGlmICghdGhpcy5pbmNyZW1lbnRhbClcclxuICB7XHJcbiAgICB2YXIgZm9yZXN0ID0gdGhpcy5nZXRGbGF0Rm9yZXN0KCk7XHJcblxyXG4gICAgLy8gVGhlIGdyYXBoIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGxheW91dCBpcyBmbGF0IGFuZCBhIGZvcmVzdFxyXG4gICAgaWYgKGZvcmVzdC5sZW5ndGggPiAwKVxyXG5cclxuICAgIHtcclxuICAgICAgdGhpcy5wb3NpdGlvbk5vZGVzUmFkaWFsbHkoZm9yZXN0KTtcclxuICAgIH1cclxuICAgIC8vIFRoZSBncmFwaCBhc3NvY2lhdGVkIHdpdGggdGhpcyBsYXlvdXQgaXMgbm90IGZsYXQgb3IgYSBmb3Jlc3RcclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgdGhpcy5wb3NpdGlvbk5vZGVzUmFuZG9tbHkoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRoaXMuaW5pdFNwcmluZ0VtYmVkZGVyKCk7XHJcbiAgdGhpcy5ydW5TcHJpbmdFbWJlZGRlcigpO1xyXG5cclxuICByZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLnRpY2sgPSBmdW5jdGlvbigpIHtcclxuICB0aGlzLnRvdGFsSXRlcmF0aW9ucysrO1xyXG4gIFxyXG4gIGlmICh0aGlzLnRvdGFsSXRlcmF0aW9ucyA9PT0gdGhpcy5tYXhJdGVyYXRpb25zKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTsgLy8gTGF5b3V0IGlzIG5vdCBlbmRlZCByZXR1cm4gdHJ1ZVxyXG4gIH1cclxuICBcclxuICBpZiAodGhpcy50b3RhbEl0ZXJhdGlvbnMgJSBGRExheW91dENvbnN0YW50cy5DT05WRVJHRU5DRV9DSEVDS19QRVJJT0QgPT0gMClcclxuICB7XHJcbiAgICBpZiAodGhpcy5pc0NvbnZlcmdlZCgpKVxyXG4gICAge1xyXG4gICAgICByZXR1cm4gdHJ1ZTsgLy8gTGF5b3V0IGlzIG5vdCBlbmRlZCByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuY29vbGluZ0ZhY3RvciA9IHRoaXMuaW5pdGlhbENvb2xpbmdGYWN0b3IgKlxyXG4gICAgICAgICAgICAoKHRoaXMubWF4SXRlcmF0aW9ucyAtIHRoaXMudG90YWxJdGVyYXRpb25zKSAvIHRoaXMubWF4SXRlcmF0aW9ucyk7XHJcbiAgICB0aGlzLmFuaW1hdGlvblBlcmlvZCA9IE1hdGguY2VpbCh0aGlzLmluaXRpYWxBbmltYXRpb25QZXJpb2QgKiBNYXRoLnNxcnQodGhpcy5jb29saW5nRmFjdG9yKSk7XHJcblxyXG4gIH1cclxuICB0aGlzLnRvdGFsRGlzcGxhY2VtZW50ID0gMDtcclxuICB0aGlzLmdyYXBoTWFuYWdlci51cGRhdGVCb3VuZHMoKTtcclxuICB0aGlzLmNhbGNTcHJpbmdGb3JjZXMoKTtcclxuICB0aGlzLmNhbGNSZXB1bHNpb25Gb3JjZXMoKTtcclxuICB0aGlzLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2VzKCk7XHJcbiAgdGhpcy5tb3ZlTm9kZXMoKTtcclxuICB0aGlzLmFuaW1hdGUoKTtcclxuICBcclxuICByZXR1cm4gZmFsc2U7IC8vIExheW91dCBpcyBub3QgZW5kZWQgeWV0IHJldHVybiBmYWxzZVxyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUuZ2V0UG9zaXRpb25zRGF0YSA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciBhbGxOb2RlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzKCk7XHJcbiAgdmFyIHBEYXRhID0ge307XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbGxOb2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIHJlY3QgPSBhbGxOb2Rlc1tpXS5yZWN0O1xyXG4gICAgdmFyIGlkID0gYWxsTm9kZXNbaV0uaWQ7XHJcbiAgICBwRGF0YVtpZF0gPSB7XHJcbiAgICAgIGlkOiBpZCxcclxuICAgICAgeDogcmVjdC5nZXRDZW50ZXJYKCksXHJcbiAgICAgIHk6IHJlY3QuZ2V0Q2VudGVyWSgpLFxyXG4gICAgICB3OiByZWN0LndpZHRoLFxyXG4gICAgICBoOiByZWN0LmhlaWdodFxyXG4gICAgfTtcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIHBEYXRhO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUucnVuU3ByaW5nRW1iZWRkZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5pbml0aWFsQW5pbWF0aW9uUGVyaW9kID0gMjU7XHJcbiAgdGhpcy5hbmltYXRpb25QZXJpb2QgPSB0aGlzLmluaXRpYWxBbmltYXRpb25QZXJpb2Q7XHJcbiAgdmFyIGxheW91dEVuZGVkID0gZmFsc2U7XHJcbiAgXHJcbiAgLy8gSWYgYW1pbmF0ZSBvcHRpb24gaXMgJ2R1cmluZycgc2lnbmFsIHRoYXQgbGF5b3V0IGlzIHN1cHBvc2VkIHRvIHN0YXJ0IGl0ZXJhdGluZ1xyXG4gIGlmICggRkRMYXlvdXRDb25zdGFudHMuQU5JTUFURSA9PT0gJ2R1cmluZycgKSB7XHJcbiAgICB0aGlzLmVtaXQoJ2xheW91dHN0YXJ0ZWQnKTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICAvLyBJZiBhbWluYXRlIG9wdGlvbiBpcyAnZHVyaW5nJyB0aWNrKCkgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgb24gaW5kZXguanNcclxuICAgIHdoaWxlICghbGF5b3V0RW5kZWQpIHtcclxuICAgICAgbGF5b3V0RW5kZWQgPSB0aGlzLnRpY2soKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmdyYXBoTWFuYWdlci51cGRhdGVCb3VuZHMoKTtcclxuICB9XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5jYWxjdWxhdGVOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvblRvID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBub2RlTGlzdCA9IFtdO1xyXG4gIHZhciBncmFwaDtcclxuXHJcbiAgdmFyIGdyYXBocyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEdyYXBocygpO1xyXG4gIHZhciBzaXplID0gZ3JhcGhzLmxlbmd0aDtcclxuICB2YXIgaTtcclxuICBmb3IgKGkgPSAwOyBpIDwgc2l6ZTsgaSsrKVxyXG4gIHtcclxuICAgIGdyYXBoID0gZ3JhcGhzW2ldO1xyXG5cclxuICAgIGdyYXBoLnVwZGF0ZUNvbm5lY3RlZCgpO1xyXG5cclxuICAgIGlmICghZ3JhcGguaXNDb25uZWN0ZWQpXHJcbiAgICB7XHJcbiAgICAgIG5vZGVMaXN0ID0gbm9kZUxpc3QuY29uY2F0KGdyYXBoLmdldE5vZGVzKCkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIuc2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24obm9kZUxpc3QpO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUuY3JlYXRlQmVuZHBvaW50cyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgZWRnZXMgPSBbXTtcclxuICBlZGdlcyA9IGVkZ2VzLmNvbmNhdCh0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxFZGdlcygpKTtcclxuICB2YXIgdmlzaXRlZCA9IG5ldyBIYXNoU2V0KCk7XHJcbiAgdmFyIGk7XHJcbiAgZm9yIChpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcblxyXG4gICAgaWYgKCF2aXNpdGVkLmNvbnRhaW5zKGVkZ2UpKVxyXG4gICAge1xyXG4gICAgICB2YXIgc291cmNlID0gZWRnZS5nZXRTb3VyY2UoKTtcclxuICAgICAgdmFyIHRhcmdldCA9IGVkZ2UuZ2V0VGFyZ2V0KCk7XHJcblxyXG4gICAgICBpZiAoc291cmNlID09IHRhcmdldClcclxuICAgICAge1xyXG4gICAgICAgIGVkZ2UuZ2V0QmVuZHBvaW50cygpLnB1c2gobmV3IFBvaW50RCgpKTtcclxuICAgICAgICBlZGdlLmdldEJlbmRwb2ludHMoKS5wdXNoKG5ldyBQb2ludEQoKSk7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVEdW1teU5vZGVzRm9yQmVuZHBvaW50cyhlZGdlKTtcclxuICAgICAgICB2aXNpdGVkLmFkZChlZGdlKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICB2YXIgZWRnZUxpc3QgPSBbXTtcclxuXHJcbiAgICAgICAgZWRnZUxpc3QgPSBlZGdlTGlzdC5jb25jYXQoc291cmNlLmdldEVkZ2VMaXN0VG9Ob2RlKHRhcmdldCkpO1xyXG4gICAgICAgIGVkZ2VMaXN0ID0gZWRnZUxpc3QuY29uY2F0KHRhcmdldC5nZXRFZGdlTGlzdFRvTm9kZShzb3VyY2UpKTtcclxuXHJcbiAgICAgICAgaWYgKCF2aXNpdGVkLmNvbnRhaW5zKGVkZ2VMaXN0WzBdKSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZiAoZWRnZUxpc3QubGVuZ3RoID4gMSlcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIGs7XHJcbiAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCBlZGdlTGlzdC5sZW5ndGg7IGsrKylcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHZhciBtdWx0aUVkZ2UgPSBlZGdlTGlzdFtrXTtcclxuICAgICAgICAgICAgICBtdWx0aUVkZ2UuZ2V0QmVuZHBvaW50cygpLnB1c2gobmV3IFBvaW50RCgpKTtcclxuICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUR1bW15Tm9kZXNGb3JCZW5kcG9pbnRzKG11bHRpRWRnZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZpc2l0ZWQuYWRkQWxsKGxpc3QpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmICh2aXNpdGVkLnNpemUoKSA9PSBlZGdlcy5sZW5ndGgpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLnBvc2l0aW9uTm9kZXNSYWRpYWxseSA9IGZ1bmN0aW9uIChmb3Jlc3QpIHtcclxuICAvLyBXZSB0aWxlIHRoZSB0cmVlcyB0byBhIGdyaWQgcm93IGJ5IHJvdzsgZmlyc3QgdHJlZSBzdGFydHMgYXQgKDAsMClcclxuICB2YXIgY3VycmVudFN0YXJ0aW5nUG9pbnQgPSBuZXcgUG9pbnQoMCwgMCk7XHJcbiAgdmFyIG51bWJlck9mQ29sdW1ucyA9IE1hdGguY2VpbChNYXRoLnNxcnQoZm9yZXN0Lmxlbmd0aCkpO1xyXG4gIHZhciBoZWlnaHQgPSAwO1xyXG4gIHZhciBjdXJyZW50WSA9IDA7XHJcbiAgdmFyIGN1cnJlbnRYID0gMDtcclxuICB2YXIgcG9pbnQgPSBuZXcgUG9pbnREKDAsIDApO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGZvcmVzdC5sZW5ndGg7IGkrKylcclxuICB7XHJcbiAgICBpZiAoaSAlIG51bWJlck9mQ29sdW1ucyA9PSAwKVxyXG4gICAge1xyXG4gICAgICAvLyBTdGFydCBvZiBhIG5ldyByb3csIG1ha2UgdGhlIHggY29vcmRpbmF0ZSAwLCBpbmNyZW1lbnQgdGhlXHJcbiAgICAgIC8vIHkgY29vcmRpbmF0ZSB3aXRoIHRoZSBtYXggaGVpZ2h0IG9mIHRoZSBwcmV2aW91cyByb3dcclxuICAgICAgY3VycmVudFggPSAwO1xyXG4gICAgICBjdXJyZW50WSA9IGhlaWdodDtcclxuXHJcbiAgICAgIGlmIChpICE9IDApXHJcbiAgICAgIHtcclxuICAgICAgICBjdXJyZW50WSArPSBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfQ09NUE9ORU5UX1NFUEVSQVRJT047XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGhlaWdodCA9IDA7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHRyZWUgPSBmb3Jlc3RbaV07XHJcblxyXG4gICAgLy8gRmluZCB0aGUgY2VudGVyIG9mIHRoZSB0cmVlXHJcbiAgICB2YXIgY2VudGVyTm9kZSA9IExheW91dC5maW5kQ2VudGVyT2ZUcmVlKHRyZWUpO1xyXG5cclxuICAgIC8vIFNldCB0aGUgc3RhcmluZyBwb2ludCBvZiB0aGUgbmV4dCB0cmVlXHJcbiAgICBjdXJyZW50U3RhcnRpbmdQb2ludC54ID0gY3VycmVudFg7XHJcbiAgICBjdXJyZW50U3RhcnRpbmdQb2ludC55ID0gY3VycmVudFk7XHJcblxyXG4gICAgLy8gRG8gYSByYWRpYWwgbGF5b3V0IHN0YXJ0aW5nIHdpdGggdGhlIGNlbnRlclxyXG4gICAgcG9pbnQgPVxyXG4gICAgICAgICAgICBDb1NFTGF5b3V0LnJhZGlhbExheW91dCh0cmVlLCBjZW50ZXJOb2RlLCBjdXJyZW50U3RhcnRpbmdQb2ludCk7XHJcblxyXG4gICAgaWYgKHBvaW50LnkgPiBoZWlnaHQpXHJcbiAgICB7XHJcbiAgICAgIGhlaWdodCA9IE1hdGguZmxvb3IocG9pbnQueSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3VycmVudFggPSBNYXRoLmZsb29yKHBvaW50LnggKyBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfQ09NUE9ORU5UX1NFUEVSQVRJT04pO1xyXG4gIH1cclxuXHJcbiAgdGhpcy50cmFuc2Zvcm0oXHJcbiAgICAgICAgICBuZXcgUG9pbnREKExheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWCAtIHBvaW50LnggLyAyLFxyXG4gICAgICAgICAgICAgICAgICBMYXlvdXRDb25zdGFudHMuV09STERfQ0VOVEVSX1kgLSBwb2ludC55IC8gMikpO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5yYWRpYWxMYXlvdXQgPSBmdW5jdGlvbiAodHJlZSwgY2VudGVyTm9kZSwgc3RhcnRpbmdQb2ludCkge1xyXG4gIHZhciByYWRpYWxTZXAgPSBNYXRoLm1heCh0aGlzLm1heERpYWdvbmFsSW5UcmVlKHRyZWUpLFxyXG4gICAgICAgICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX1JBRElBTF9TRVBBUkFUSU9OKTtcclxuICBDb1NFTGF5b3V0LmJyYW5jaFJhZGlhbExheW91dChjZW50ZXJOb2RlLCBudWxsLCAwLCAzNTksIDAsIHJhZGlhbFNlcCk7XHJcbiAgdmFyIGJvdW5kcyA9IExHcmFwaC5jYWxjdWxhdGVCb3VuZHModHJlZSk7XHJcblxyXG4gIHZhciB0cmFuc2Zvcm0gPSBuZXcgVHJhbnNmb3JtKCk7XHJcbiAgdHJhbnNmb3JtLnNldERldmljZU9yZ1goYm91bmRzLmdldE1pblgoKSk7XHJcbiAgdHJhbnNmb3JtLnNldERldmljZU9yZ1koYm91bmRzLmdldE1pblkoKSk7XHJcbiAgdHJhbnNmb3JtLnNldFdvcmxkT3JnWChzdGFydGluZ1BvaW50LngpO1xyXG4gIHRyYW5zZm9ybS5zZXRXb3JsZE9yZ1koc3RhcnRpbmdQb2ludC55KTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmVlLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBub2RlID0gdHJlZVtpXTtcclxuICAgIG5vZGUudHJhbnNmb3JtKHRyYW5zZm9ybSk7XHJcbiAgfVxyXG5cclxuICB2YXIgYm90dG9tUmlnaHQgPVxyXG4gICAgICAgICAgbmV3IFBvaW50RChib3VuZHMuZ2V0TWF4WCgpLCBib3VuZHMuZ2V0TWF4WSgpKTtcclxuXHJcbiAgcmV0dXJuIHRyYW5zZm9ybS5pbnZlcnNlVHJhbnNmb3JtUG9pbnQoYm90dG9tUmlnaHQpO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5icmFuY2hSYWRpYWxMYXlvdXQgPSBmdW5jdGlvbiAobm9kZSwgcGFyZW50T2ZOb2RlLCBzdGFydEFuZ2xlLCBlbmRBbmdsZSwgZGlzdGFuY2UsIHJhZGlhbFNlcGFyYXRpb24pIHtcclxuICAvLyBGaXJzdCwgcG9zaXRpb24gdGhpcyBub2RlIGJ5IGZpbmRpbmcgaXRzIGFuZ2xlLlxyXG4gIHZhciBoYWxmSW50ZXJ2YWwgPSAoKGVuZEFuZ2xlIC0gc3RhcnRBbmdsZSkgKyAxKSAvIDI7XHJcblxyXG4gIGlmIChoYWxmSW50ZXJ2YWwgPCAwKVxyXG4gIHtcclxuICAgIGhhbGZJbnRlcnZhbCArPSAxODA7XHJcbiAgfVxyXG5cclxuICB2YXIgbm9kZUFuZ2xlID0gKGhhbGZJbnRlcnZhbCArIHN0YXJ0QW5nbGUpICUgMzYwO1xyXG4gIHZhciB0ZXRhID0gKG5vZGVBbmdsZSAqIElHZW9tZXRyeS5UV09fUEkpIC8gMzYwO1xyXG5cclxuICAvLyBNYWtlIHBvbGFyIHRvIGphdmEgY29yZGluYXRlIGNvbnZlcnNpb24uXHJcbiAgdmFyIGNvc190ZXRhID0gTWF0aC5jb3ModGV0YSk7XHJcbiAgdmFyIHhfID0gZGlzdGFuY2UgKiBNYXRoLmNvcyh0ZXRhKTtcclxuICB2YXIgeV8gPSBkaXN0YW5jZSAqIE1hdGguc2luKHRldGEpO1xyXG5cclxuICBub2RlLnNldENlbnRlcih4XywgeV8pO1xyXG5cclxuICAvLyBUcmF2ZXJzZSBhbGwgbmVpZ2hib3JzIG9mIHRoaXMgbm9kZSBhbmQgcmVjdXJzaXZlbHkgY2FsbCB0aGlzXHJcbiAgLy8gZnVuY3Rpb24uXHJcbiAgdmFyIG5laWdoYm9yRWRnZXMgPSBbXTtcclxuICBuZWlnaGJvckVkZ2VzID0gbmVpZ2hib3JFZGdlcy5jb25jYXQobm9kZS5nZXRFZGdlcygpKTtcclxuICB2YXIgY2hpbGRDb3VudCA9IG5laWdoYm9yRWRnZXMubGVuZ3RoO1xyXG5cclxuICBpZiAocGFyZW50T2ZOb2RlICE9IG51bGwpXHJcbiAge1xyXG4gICAgY2hpbGRDb3VudC0tO1xyXG4gIH1cclxuXHJcbiAgdmFyIGJyYW5jaENvdW50ID0gMDtcclxuXHJcbiAgdmFyIGluY0VkZ2VzQ291bnQgPSBuZWlnaGJvckVkZ2VzLmxlbmd0aDtcclxuICB2YXIgc3RhcnRJbmRleDtcclxuXHJcbiAgdmFyIGVkZ2VzID0gbm9kZS5nZXRFZGdlc0JldHdlZW4ocGFyZW50T2ZOb2RlKTtcclxuXHJcbiAgLy8gSWYgdGhlcmUgYXJlIG11bHRpcGxlIGVkZ2VzLCBwcnVuZSB0aGVtIHVudGlsIHRoZXJlIHJlbWFpbnMgb25seSBvbmVcclxuICAvLyBlZGdlLlxyXG4gIHdoaWxlIChlZGdlcy5sZW5ndGggPiAxKVxyXG4gIHtcclxuICAgIC8vbmVpZ2hib3JFZGdlcy5yZW1vdmUoZWRnZXMucmVtb3ZlKDApKTtcclxuICAgIHZhciB0ZW1wID0gZWRnZXNbMF07XHJcbiAgICBlZGdlcy5zcGxpY2UoMCwgMSk7XHJcbiAgICB2YXIgaW5kZXggPSBuZWlnaGJvckVkZ2VzLmluZGV4T2YodGVtcCk7XHJcbiAgICBpZiAoaW5kZXggPj0gMCkge1xyXG4gICAgICBuZWlnaGJvckVkZ2VzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICB9XHJcbiAgICBpbmNFZGdlc0NvdW50LS07XHJcbiAgICBjaGlsZENvdW50LS07XHJcbiAgfVxyXG5cclxuICBpZiAocGFyZW50T2ZOb2RlICE9IG51bGwpXHJcbiAge1xyXG4gICAgLy9hc3NlcnQgZWRnZXMubGVuZ3RoID09IDE7XHJcbiAgICBzdGFydEluZGV4ID0gKG5laWdoYm9yRWRnZXMuaW5kZXhPZihlZGdlc1swXSkgKyAxKSAlIGluY0VkZ2VzQ291bnQ7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICBzdGFydEluZGV4ID0gMDtcclxuICB9XHJcblxyXG4gIHZhciBzdGVwQW5nbGUgPSBNYXRoLmFicyhlbmRBbmdsZSAtIHN0YXJ0QW5nbGUpIC8gY2hpbGRDb3VudDtcclxuXHJcbiAgZm9yICh2YXIgaSA9IHN0YXJ0SW5kZXg7XHJcbiAgICAgICAgICBicmFuY2hDb3VudCAhPSBjaGlsZENvdW50O1xyXG4gICAgICAgICAgaSA9ICgrK2kpICUgaW5jRWRnZXNDb3VudClcclxuICB7XHJcbiAgICB2YXIgY3VycmVudE5laWdoYm9yID1cclxuICAgICAgICAgICAgbmVpZ2hib3JFZGdlc1tpXS5nZXRPdGhlckVuZChub2RlKTtcclxuXHJcbiAgICAvLyBEb24ndCBiYWNrIHRyYXZlcnNlIHRvIHJvb3Qgbm9kZSBpbiBjdXJyZW50IHRyZWUuXHJcbiAgICBpZiAoY3VycmVudE5laWdoYm9yID09IHBhcmVudE9mTm9kZSlcclxuICAgIHtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGNoaWxkU3RhcnRBbmdsZSA9XHJcbiAgICAgICAgICAgIChzdGFydEFuZ2xlICsgYnJhbmNoQ291bnQgKiBzdGVwQW5nbGUpICUgMzYwO1xyXG4gICAgdmFyIGNoaWxkRW5kQW5nbGUgPSAoY2hpbGRTdGFydEFuZ2xlICsgc3RlcEFuZ2xlKSAlIDM2MDtcclxuXHJcbiAgICBDb1NFTGF5b3V0LmJyYW5jaFJhZGlhbExheW91dChjdXJyZW50TmVpZ2hib3IsXHJcbiAgICAgICAgICAgIG5vZGUsXHJcbiAgICAgICAgICAgIGNoaWxkU3RhcnRBbmdsZSwgY2hpbGRFbmRBbmdsZSxcclxuICAgICAgICAgICAgZGlzdGFuY2UgKyByYWRpYWxTZXBhcmF0aW9uLCByYWRpYWxTZXBhcmF0aW9uKTtcclxuXHJcbiAgICBicmFuY2hDb3VudCsrO1xyXG4gIH1cclxufTtcclxuXHJcbkNvU0VMYXlvdXQubWF4RGlhZ29uYWxJblRyZWUgPSBmdW5jdGlvbiAodHJlZSkge1xyXG4gIHZhciBtYXhEaWFnb25hbCA9IEludGVnZXIuTUlOX1ZBTFVFO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRyZWUubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIG5vZGUgPSB0cmVlW2ldO1xyXG4gICAgdmFyIGRpYWdvbmFsID0gbm9kZS5nZXREaWFnb25hbCgpO1xyXG5cclxuICAgIGlmIChkaWFnb25hbCA+IG1heERpYWdvbmFsKVxyXG4gICAge1xyXG4gICAgICBtYXhEaWFnb25hbCA9IGRpYWdvbmFsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG1heERpYWdvbmFsO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUuY2FsY1JlcHVsc2lvblJhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIGZvcm11bGEgaXMgMiB4IChsZXZlbCArIDEpIHggaWRlYWxFZGdlTGVuZ3RoXHJcbiAgcmV0dXJuICgyICogKHRoaXMubGV2ZWwgKyAxKSAqIHRoaXMuaWRlYWxFZGdlTGVuZ3RoKTtcclxufTtcclxuXHJcbi8vIFRpbGluZyBtZXRob2RzXHJcblxyXG4vLyBHcm91cCB6ZXJvIGRlZ3JlZSBtZW1iZXJzIHdob3NlIHBhcmVudHMgYXJlIG5vdCB0byBiZSB0aWxlZCwgY3JlYXRlIGR1bW15IHBhcmVudHMgd2hlcmUgbmVlZGVkIGFuZCBmaWxsIG1lbWJlckdyb3VwcyBieSB0aGVpciBkdW1tcCBwYXJlbnQgaWQnc1xyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5ncm91cFplcm9EZWdyZWVNZW1iZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICAvLyBhcnJheSBvZiBbcGFyZW50X2lkIHggb25lRGVncmVlTm9kZV9pZF1cclxuICB2YXIgdGVtcE1lbWJlckdyb3VwcyA9IHt9OyAvLyBBIHRlbXBvcmFyeSBtYXAgb2YgcGFyZW50IG5vZGUgYW5kIGl0cyB6ZXJvIGRlZ3JlZSBtZW1iZXJzXHJcbiAgdGhpcy5tZW1iZXJHcm91cHMgPSB7fTsgLy8gQSBtYXAgb2YgZHVtbXkgcGFyZW50IG5vZGUgYW5kIGl0cyB6ZXJvIGRlZ3JlZSBtZW1iZXJzIHdob3NlIHBhcmVudHMgYXJlIG5vdCB0byBiZSB0aWxlZFxyXG4gIHRoaXMuaWRUb0R1bW15Tm9kZSA9IHt9OyAvLyBBIG1hcCBvZiBpZCB0byBkdW1teSBub2RlIFxyXG4gIFxyXG4gIHZhciB6ZXJvRGVncmVlID0gW107IC8vIExpc3Qgb2YgemVybyBkZWdyZWUgbm9kZXMgd2hvc2UgcGFyZW50cyBhcmUgbm90IHRvIGJlIHRpbGVkXHJcbiAgdmFyIGFsbE5vZGVzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsTm9kZXMoKTtcclxuXHJcbiAgLy8gRmlsbCB6ZXJvIGRlZ3JlZSBsaXN0XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbGxOb2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIG5vZGUgPSBhbGxOb2Rlc1tpXTtcclxuICAgIHZhciBwYXJlbnQgPSBub2RlLmdldFBhcmVudCgpO1xyXG4gICAgLy8gSWYgYSBub2RlIGhhcyB6ZXJvIGRlZ3JlZSBhbmQgaXRzIHBhcmVudCBpcyBub3QgdG8gYmUgdGlsZWQgaWYgZXhpc3RzIGFkZCB0aGF0IG5vZGUgdG8gemVyb0RlZ3JlcyBsaXN0XHJcbiAgICBpZiAodGhpcy5nZXROb2RlRGVncmVlV2l0aENoaWxkcmVuKG5vZGUpID09PSAwICYmICggcGFyZW50LmlkID09IHVuZGVmaW5lZCB8fCAhdGhpcy5nZXRUb0JlVGlsZWQocGFyZW50KSApICkge1xyXG4gICAgICB6ZXJvRGVncmVlLnB1c2gobm9kZSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBDcmVhdGUgYSBtYXAgb2YgcGFyZW50IG5vZGUgYW5kIGl0cyB6ZXJvIGRlZ3JlZSBtZW1iZXJzXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB6ZXJvRGVncmVlLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBub2RlID0gemVyb0RlZ3JlZVtpXTsgLy8gWmVybyBkZWdyZWUgbm9kZSBpdHNlbGZcclxuICAgIHZhciBwX2lkID0gbm9kZS5nZXRQYXJlbnQoKS5pZDsgLy8gUGFyZW50IGlkXHJcblxyXG4gICAgaWYgKHR5cGVvZiB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdID09PSBcInVuZGVmaW5lZFwiKVxyXG4gICAgICB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdID0gW107XHJcblxyXG4gICAgdGVtcE1lbWJlckdyb3Vwc1twX2lkXSA9IHRlbXBNZW1iZXJHcm91cHNbcF9pZF0uY29uY2F0KG5vZGUpOyAvLyBQdXNoIG5vZGUgdG8gdGhlIGxpc3QgYmVsb25ncyB0byBpdHMgcGFyZW50IGluIHRlbXBNZW1iZXJHcm91cHNcclxuICB9XHJcblxyXG4gIC8vIElmIHRoZXJlIGFyZSBhdCBsZWFzdCB0d28gbm9kZXMgYXQgYSBsZXZlbCwgY3JlYXRlIGEgZHVtbXkgY29tcG91bmQgZm9yIHRoZW1cclxuICBPYmplY3Qua2V5cyh0ZW1wTWVtYmVyR3JvdXBzKS5mb3JFYWNoKGZ1bmN0aW9uKHBfaWQpIHtcclxuICAgIGlmICh0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdLmxlbmd0aCA+IDEpIHtcclxuICAgICAgdmFyIGR1bW15Q29tcG91bmRJZCA9IFwiRHVtbXlDb21wb3VuZF9cIiArIHBfaWQ7IC8vIFRoZSBpZCBvZiBkdW1teSBjb21wb3VuZCB3aGljaCB3aWxsIGJlIGNyZWF0ZWQgc29vblxyXG4gICAgICBzZWxmLm1lbWJlckdyb3Vwc1tkdW1teUNvbXBvdW5kSWRdID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXTsgLy8gQWRkIGR1bW15IGNvbXBvdW5kIHRvIG1lbWJlckdyb3Vwc1xyXG5cclxuICAgICAgdmFyIHBhcmVudCA9IHRlbXBNZW1iZXJHcm91cHNbcF9pZF1bMF0uZ2V0UGFyZW50KCk7IC8vIFRoZSBwYXJlbnQgb2YgemVybyBkZWdyZWUgbm9kZXMgd2lsbCBiZSB0aGUgcGFyZW50IG9mIG5ldyBkdW1teSBjb21wb3VuZFxyXG5cclxuICAgICAgLy8gQ3JlYXRlIGEgZHVtbXkgY29tcG91bmQgd2l0aCBjYWxjdWxhdGVkIGlkXHJcbiAgICAgIHZhciBkdW1teUNvbXBvdW5kID0gbmV3IENvU0VOb2RlKHNlbGYuZ3JhcGhNYW5hZ2VyKTtcclxuICAgICAgZHVtbXlDb21wb3VuZC5pZCA9IGR1bW15Q29tcG91bmRJZDtcclxuICAgICAgZHVtbXlDb21wb3VuZC5wYWRkaW5nTGVmdCA9IHBhcmVudC5wYWRkaW5nTGVmdCB8fCAwO1xyXG4gICAgICBkdW1teUNvbXBvdW5kLnBhZGRpbmdSaWdodCA9IHBhcmVudC5wYWRkaW5nUmlnaHQgfHwgMDtcclxuICAgICAgZHVtbXlDb21wb3VuZC5wYWRkaW5nQm90dG9tID0gcGFyZW50LnBhZGRpbmdCb3R0b20gfHwgMDtcclxuICAgICAgZHVtbXlDb21wb3VuZC5wYWRkaW5nVG9wID0gcGFyZW50LnBhZGRpbmdUb3AgfHwgMDtcclxuICAgICAgXHJcbiAgICAgIHNlbGYuaWRUb0R1bW15Tm9kZVtkdW1teUNvbXBvdW5kSWRdID0gZHVtbXlDb21wb3VuZDtcclxuICAgICAgXHJcbiAgICAgIHZhciBkdW1teVBhcmVudEdyYXBoID0gc2VsZi5nZXRHcmFwaE1hbmFnZXIoKS5hZGQoc2VsZi5uZXdHcmFwaCgpLCBkdW1teUNvbXBvdW5kKTtcclxuICAgICAgdmFyIHBhcmVudEdyYXBoID0gcGFyZW50LmdldENoaWxkKCk7XHJcblxyXG4gICAgICAvLyBBZGQgZHVtbXkgY29tcG91bmQgdG8gcGFyZW50IHRoZSBncmFwaFxyXG4gICAgICBwYXJlbnRHcmFwaC5hZGQoZHVtbXlDb21wb3VuZCk7XHJcblxyXG4gICAgICAvLyBGb3IgZWFjaCB6ZXJvIGRlZ3JlZSBub2RlIGluIHRoaXMgbGV2ZWwgcmVtb3ZlIGl0IGZyb20gaXRzIHBhcmVudCBncmFwaCBhbmQgYWRkIGl0IHRvIHRoZSBncmFwaCBvZiBkdW1teSBwYXJlbnRcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIG5vZGUgPSB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdW2ldO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHBhcmVudEdyYXBoLnJlbW92ZShub2RlKTtcclxuICAgICAgICBkdW1teVBhcmVudEdyYXBoLmFkZChub2RlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUuY2xlYXJDb21wb3VuZHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGNoaWxkR3JhcGhNYXAgPSB7fTtcclxuICB2YXIgaWRUb05vZGUgPSB7fTtcclxuXHJcbiAgLy8gR2V0IGNvbXBvdW5kIG9yZGVyaW5nIGJ5IGZpbmRpbmcgdGhlIGlubmVyIG9uZSBmaXJzdFxyXG4gIHRoaXMucGVyZm9ybURGU09uQ29tcG91bmRzKCk7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb21wb3VuZE9yZGVyLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBcclxuICAgIGlkVG9Ob2RlW3RoaXMuY29tcG91bmRPcmRlcltpXS5pZF0gPSB0aGlzLmNvbXBvdW5kT3JkZXJbaV07XHJcbiAgICBjaGlsZEdyYXBoTWFwW3RoaXMuY29tcG91bmRPcmRlcltpXS5pZF0gPSBbXS5jb25jYXQodGhpcy5jb21wb3VuZE9yZGVyW2ldLmdldENoaWxkKCkuZ2V0Tm9kZXMoKSk7XHJcblxyXG4gICAgLy8gUmVtb3ZlIGNoaWxkcmVuIG9mIGNvbXBvdW5kc1xyXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIucmVtb3ZlKHRoaXMuY29tcG91bmRPcmRlcltpXS5nZXRDaGlsZCgpKTtcclxuICAgIHRoaXMuY29tcG91bmRPcmRlcltpXS5jaGlsZCA9IG51bGw7XHJcbiAgfVxyXG4gIFxyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLnJlc2V0QWxsTm9kZXMoKTtcclxuICBcclxuICAvLyBUaWxlIHRoZSByZW1vdmVkIGNoaWxkcmVuXHJcbiAgdGhpcy50aWxlQ29tcG91bmRNZW1iZXJzKGNoaWxkR3JhcGhNYXAsIGlkVG9Ob2RlKTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmNsZWFyWmVyb0RlZ3JlZU1lbWJlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHZhciB0aWxlZFplcm9EZWdyZWVQYWNrID0gdGhpcy50aWxlZFplcm9EZWdyZWVQYWNrID0gW107XHJcblxyXG4gIE9iamVjdC5rZXlzKHRoaXMubWVtYmVyR3JvdXBzKS5mb3JFYWNoKGZ1bmN0aW9uKGlkKSB7XHJcbiAgICB2YXIgY29tcG91bmROb2RlID0gc2VsZi5pZFRvRHVtbXlOb2RlW2lkXTsgLy8gR2V0IHRoZSBkdW1teSBjb21wb3VuZFxyXG5cclxuICAgIHRpbGVkWmVyb0RlZ3JlZVBhY2tbaWRdID0gc2VsZi50aWxlTm9kZXMoc2VsZi5tZW1iZXJHcm91cHNbaWRdLCBjb21wb3VuZE5vZGUucGFkZGluZ0xlZnQgKyBjb21wb3VuZE5vZGUucGFkZGluZ1JpZ2h0KTtcclxuXHJcbiAgICAvLyBTZXQgdGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgdGhlIGR1bW15IGNvbXBvdW5kIGFzIGNhbGN1bGF0ZWRcclxuICAgIGNvbXBvdW5kTm9kZS5yZWN0LndpZHRoID0gdGlsZWRaZXJvRGVncmVlUGFja1tpZF0ud2lkdGg7XHJcbiAgICBjb21wb3VuZE5vZGUucmVjdC5oZWlnaHQgPSB0aWxlZFplcm9EZWdyZWVQYWNrW2lkXS5oZWlnaHQ7XHJcbiAgfSk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5yZXBvcHVsYXRlQ29tcG91bmRzID0gZnVuY3Rpb24gKCkge1xyXG4gIGZvciAodmFyIGkgPSB0aGlzLmNvbXBvdW5kT3JkZXIubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgIHZhciBsQ29tcG91bmROb2RlID0gdGhpcy5jb21wb3VuZE9yZGVyW2ldO1xyXG4gICAgdmFyIGlkID0gbENvbXBvdW5kTm9kZS5pZDtcclxuICAgIHZhciBob3Jpem9udGFsTWFyZ2luID0gbENvbXBvdW5kTm9kZS5wYWRkaW5nTGVmdDtcclxuICAgIHZhciB2ZXJ0aWNhbE1hcmdpbiA9IGxDb21wb3VuZE5vZGUucGFkZGluZ1RvcDtcclxuXHJcbiAgICB0aGlzLmFkanVzdExvY2F0aW9ucyh0aGlzLnRpbGVkTWVtYmVyUGFja1tpZF0sIGxDb21wb3VuZE5vZGUucmVjdC54LCBsQ29tcG91bmROb2RlLnJlY3QueSwgaG9yaXpvbnRhbE1hcmdpbiwgdmVydGljYWxNYXJnaW4pO1xyXG4gIH1cclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLnJlcG9wdWxhdGVaZXJvRGVncmVlTWVtYmVycyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgdmFyIHRpbGVkUGFjayA9IHRoaXMudGlsZWRaZXJvRGVncmVlUGFjaztcclxuICBcclxuICBPYmplY3Qua2V5cyh0aWxlZFBhY2spLmZvckVhY2goZnVuY3Rpb24oaWQpIHtcclxuICAgIHZhciBjb21wb3VuZE5vZGUgPSBzZWxmLmlkVG9EdW1teU5vZGVbaWRdOyAvLyBHZXQgdGhlIGR1bW15IGNvbXBvdW5kIGJ5IGl0cyBpZFxyXG4gICAgdmFyIGhvcml6b250YWxNYXJnaW4gPSBjb21wb3VuZE5vZGUucGFkZGluZ0xlZnQ7XHJcbiAgICB2YXIgdmVydGljYWxNYXJnaW4gPSBjb21wb3VuZE5vZGUucGFkZGluZ1RvcDtcclxuXHJcbiAgICAvLyBBZGp1c3QgdGhlIHBvc2l0aW9ucyBvZiBub2RlcyB3cnQgaXRzIGNvbXBvdW5kXHJcbiAgICBzZWxmLmFkanVzdExvY2F0aW9ucyh0aWxlZFBhY2tbaWRdLCBjb21wb3VuZE5vZGUucmVjdC54LCBjb21wb3VuZE5vZGUucmVjdC55LCBob3Jpem9udGFsTWFyZ2luLCB2ZXJ0aWNhbE1hcmdpbik7XHJcbiAgfSk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRUb0JlVGlsZWQgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBpZCA9IG5vZGUuaWQ7XHJcbiAgLy9maXJzdGx5IGNoZWNrIHRoZSBwcmV2aW91cyByZXN1bHRzXHJcbiAgaWYgKHRoaXMudG9CZVRpbGVkW2lkXSAhPSBudWxsKSB7XHJcbiAgICByZXR1cm4gdGhpcy50b0JlVGlsZWRbaWRdO1xyXG4gIH1cclxuXHJcbiAgLy9vbmx5IGNvbXBvdW5kIG5vZGVzIGFyZSB0byBiZSB0aWxlZFxyXG4gIHZhciBjaGlsZEdyYXBoID0gbm9kZS5nZXRDaGlsZCgpO1xyXG4gIGlmIChjaGlsZEdyYXBoID09IG51bGwpIHtcclxuICAgIHRoaXMudG9CZVRpbGVkW2lkXSA9IGZhbHNlO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgdmFyIGNoaWxkcmVuID0gY2hpbGRHcmFwaC5nZXROb2RlcygpOyAvLyBHZXQgdGhlIGNoaWxkcmVuIG5vZGVzXHJcblxyXG4gIC8vYSBjb21wb3VuZCBub2RlIGlzIG5vdCB0byBiZSB0aWxlZCBpZiBhbGwgb2YgaXRzIGNvbXBvdW5kIGNoaWxkcmVuIGFyZSBub3QgdG8gYmUgdGlsZWRcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgdGhlQ2hpbGQgPSBjaGlsZHJlbltpXTtcclxuXHJcbiAgICBpZiAodGhpcy5nZXROb2RlRGVncmVlKHRoZUNoaWxkKSA+IDApIHtcclxuICAgICAgdGhpcy50b0JlVGlsZWRbaWRdID0gZmFsc2U7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICAvL3Bhc3MgdGhlIGNoaWxkcmVuIG5vdCBoYXZpbmcgdGhlIGNvbXBvdW5kIHN0cnVjdHVyZVxyXG4gICAgaWYgKHRoZUNoaWxkLmdldENoaWxkKCkgPT0gbnVsbCkge1xyXG4gICAgICB0aGlzLnRvQmVUaWxlZFt0aGVDaGlsZC5pZF0gPSBmYWxzZTtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF0aGlzLmdldFRvQmVUaWxlZCh0aGVDaGlsZCkpIHtcclxuICAgICAgdGhpcy50b0JlVGlsZWRbaWRdID0gZmFsc2U7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcbiAgdGhpcy50b0JlVGlsZWRbaWRdID0gdHJ1ZTtcclxuICByZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbi8vIEdldCBkZWdyZWUgb2YgYSBub2RlIGRlcGVuZGluZyBvZiBpdHMgZWRnZXMgYW5kIGluZGVwZW5kZW50IG9mIGl0cyBjaGlsZHJlblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXROb2RlRGVncmVlID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICB2YXIgaWQgPSBub2RlLmlkO1xyXG4gIHZhciBlZGdlcyA9IG5vZGUuZ2V0RWRnZXMoKTtcclxuICB2YXIgZGVncmVlID0gMDtcclxuICBcclxuICAvLyBGb3IgdGhlIGVkZ2VzIGNvbm5lY3RlZFxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICBpZiAoZWRnZS5nZXRTb3VyY2UoKS5pZCAhPT0gZWRnZS5nZXRUYXJnZXQoKS5pZCkge1xyXG4gICAgICBkZWdyZWUgPSBkZWdyZWUgKyAxO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gZGVncmVlO1xyXG59O1xyXG5cclxuLy8gR2V0IGRlZ3JlZSBvZiBhIG5vZGUgd2l0aCBpdHMgY2hpbGRyZW5cclxuQ29TRUxheW91dC5wcm90b3R5cGUuZ2V0Tm9kZURlZ3JlZVdpdGhDaGlsZHJlbiA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgdmFyIGRlZ3JlZSA9IHRoaXMuZ2V0Tm9kZURlZ3JlZShub2RlKTtcclxuICBpZiAobm9kZS5nZXRDaGlsZCgpID09IG51bGwpIHtcclxuICAgIHJldHVybiBkZWdyZWU7XHJcbiAgfVxyXG4gIHZhciBjaGlsZHJlbiA9IG5vZGUuZ2V0Q2hpbGQoKS5nZXROb2RlcygpO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgZGVncmVlICs9IHRoaXMuZ2V0Tm9kZURlZ3JlZVdpdGhDaGlsZHJlbihjaGlsZCk7XHJcbiAgfVxyXG4gIHJldHVybiBkZWdyZWU7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5wZXJmb3JtREZTT25Db21wb3VuZHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5jb21wb3VuZE9yZGVyID0gW107XHJcbiAgdGhpcy5maWxsQ29tcGV4T3JkZXJCeURGUyh0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkuZ2V0Tm9kZXMoKSk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5maWxsQ29tcGV4T3JkZXJCeURGUyA9IGZ1bmN0aW9uIChjaGlsZHJlbikge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgaWYgKGNoaWxkLmdldENoaWxkKCkgIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLmZpbGxDb21wZXhPcmRlckJ5REZTKGNoaWxkLmdldENoaWxkKCkuZ2V0Tm9kZXMoKSk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5nZXRUb0JlVGlsZWQoY2hpbGQpKSB7XHJcbiAgICAgIHRoaXMuY29tcG91bmRPcmRlci5wdXNoKGNoaWxkKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuKiBUaGlzIG1ldGhvZCBwbGFjZXMgZWFjaCB6ZXJvIGRlZ3JlZSBtZW1iZXIgd3J0IGdpdmVuICh4LHkpIGNvb3JkaW5hdGVzICh0b3AgbGVmdCkuXHJcbiovXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmFkanVzdExvY2F0aW9ucyA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24sIHgsIHksIGNvbXBvdW5kSG9yaXpvbnRhbE1hcmdpbiwgY29tcG91bmRWZXJ0aWNhbE1hcmdpbikge1xyXG4gIHggKz0gY29tcG91bmRIb3Jpem9udGFsTWFyZ2luO1xyXG4gIHkgKz0gY29tcG91bmRWZXJ0aWNhbE1hcmdpbjtcclxuXHJcbiAgdmFyIGxlZnQgPSB4O1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgcm93ID0gb3JnYW5pemF0aW9uLnJvd3NbaV07XHJcbiAgICB4ID0gbGVmdDtcclxuICAgIHZhciBtYXhIZWlnaHQgPSAwO1xyXG5cclxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgcm93Lmxlbmd0aDsgaisrKSB7XHJcbiAgICAgIHZhciBsbm9kZSA9IHJvd1tqXTtcclxuXHJcbiAgICAgIGxub2RlLnJlY3QueCA9IHg7Ly8gKyBsbm9kZS5yZWN0LndpZHRoIC8gMjtcclxuICAgICAgbG5vZGUucmVjdC55ID0geTsvLyArIGxub2RlLnJlY3QuaGVpZ2h0IC8gMjtcclxuXHJcbiAgICAgIHggKz0gbG5vZGUucmVjdC53aWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZztcclxuXHJcbiAgICAgIGlmIChsbm9kZS5yZWN0LmhlaWdodCA+IG1heEhlaWdodClcclxuICAgICAgICBtYXhIZWlnaHQgPSBsbm9kZS5yZWN0LmhlaWdodDtcclxuICAgIH1cclxuXHJcbiAgICB5ICs9IG1heEhlaWdodCArIG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XHJcbiAgfVxyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUudGlsZUNvbXBvdW5kTWVtYmVycyA9IGZ1bmN0aW9uIChjaGlsZEdyYXBoTWFwLCBpZFRvTm9kZSkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB0aGlzLnRpbGVkTWVtYmVyUGFjayA9IFtdO1xyXG5cclxuICBPYmplY3Qua2V5cyhjaGlsZEdyYXBoTWFwKS5mb3JFYWNoKGZ1bmN0aW9uKGlkKSB7XHJcbiAgICAvLyBHZXQgdGhlIGNvbXBvdW5kIG5vZGVcclxuICAgIHZhciBjb21wb3VuZE5vZGUgPSBpZFRvTm9kZVtpZF07XHJcblxyXG4gICAgc2VsZi50aWxlZE1lbWJlclBhY2tbaWRdID0gc2VsZi50aWxlTm9kZXMoY2hpbGRHcmFwaE1hcFtpZF0sIGNvbXBvdW5kTm9kZS5wYWRkaW5nTGVmdCArIGNvbXBvdW5kTm9kZS5wYWRkaW5nUmlnaHQpO1xyXG5cclxuICAgIGNvbXBvdW5kTm9kZS5yZWN0LndpZHRoID0gc2VsZi50aWxlZE1lbWJlclBhY2tbaWRdLndpZHRoICsgMjA7XHJcbiAgICBjb21wb3VuZE5vZGUucmVjdC5oZWlnaHQgPSBzZWxmLnRpbGVkTWVtYmVyUGFja1tpZF0uaGVpZ2h0ICsgMjA7XHJcbiAgfSk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS50aWxlTm9kZXMgPSBmdW5jdGlvbiAobm9kZXMsIG1pbldpZHRoKSB7XHJcbiAgdmFyIHZlcnRpY2FsUGFkZGluZyA9IENvU0VDb25zdGFudHMuVElMSU5HX1BBRERJTkdfVkVSVElDQUw7XHJcbiAgdmFyIGhvcml6b250YWxQYWRkaW5nID0gQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19IT1JJWk9OVEFMO1xyXG4gIHZhciBvcmdhbml6YXRpb24gPSB7XHJcbiAgICByb3dzOiBbXSxcclxuICAgIHJvd1dpZHRoOiBbXSxcclxuICAgIHJvd0hlaWdodDogW10sXHJcbiAgICB3aWR0aDogMjAsXHJcbiAgICBoZWlnaHQ6IDIwLFxyXG4gICAgdmVydGljYWxQYWRkaW5nOiB2ZXJ0aWNhbFBhZGRpbmcsXHJcbiAgICBob3Jpem9udGFsUGFkZGluZzogaG9yaXpvbnRhbFBhZGRpbmdcclxuICB9O1xyXG5cclxuICAvLyBTb3J0IHRoZSBub2RlcyBpbiBhc2NlbmRpbmcgb3JkZXIgb2YgdGhlaXIgYXJlYXNcclxuICBub2Rlcy5zb3J0KGZ1bmN0aW9uIChuMSwgbjIpIHtcclxuICAgIGlmIChuMS5yZWN0LndpZHRoICogbjEucmVjdC5oZWlnaHQgPiBuMi5yZWN0LndpZHRoICogbjIucmVjdC5oZWlnaHQpXHJcbiAgICAgIHJldHVybiAtMTtcclxuICAgIGlmIChuMS5yZWN0LndpZHRoICogbjEucmVjdC5oZWlnaHQgPCBuMi5yZWN0LndpZHRoICogbjIucmVjdC5oZWlnaHQpXHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgcmV0dXJuIDA7XHJcbiAgfSk7XHJcblxyXG4gIC8vIENyZWF0ZSB0aGUgb3JnYW5pemF0aW9uIC0+IHRpbGUgbWVtYmVyc1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBsTm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgXHJcbiAgICBpZiAob3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoID09IDApIHtcclxuICAgICAgdGhpcy5pbnNlcnROb2RlVG9Sb3cob3JnYW5pemF0aW9uLCBsTm9kZSwgMCwgbWluV2lkdGgpO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodGhpcy5jYW5BZGRIb3Jpem9udGFsKG9yZ2FuaXphdGlvbiwgbE5vZGUucmVjdC53aWR0aCwgbE5vZGUucmVjdC5oZWlnaHQpKSB7XHJcbiAgICAgIHRoaXMuaW5zZXJ0Tm9kZVRvUm93KG9yZ2FuaXphdGlvbiwgbE5vZGUsIHRoaXMuZ2V0U2hvcnRlc3RSb3dJbmRleChvcmdhbml6YXRpb24pLCBtaW5XaWR0aCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhpcy5pbnNlcnROb2RlVG9Sb3cob3JnYW5pemF0aW9uLCBsTm9kZSwgb3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoLCBtaW5XaWR0aCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zaGlmdFRvTGFzdFJvdyhvcmdhbml6YXRpb24pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG9yZ2FuaXphdGlvbjtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmluc2VydE5vZGVUb1JvdyA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24sIG5vZGUsIHJvd0luZGV4LCBtaW5XaWR0aCkge1xyXG4gIHZhciBtaW5Db21wb3VuZFNpemUgPSBtaW5XaWR0aDtcclxuXHJcbiAgLy8gQWRkIG5ldyByb3cgaWYgbmVlZGVkXHJcbiAgaWYgKHJvd0luZGV4ID09IG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aCkge1xyXG4gICAgdmFyIHNlY29uZERpbWVuc2lvbiA9IFtdO1xyXG5cclxuICAgIG9yZ2FuaXphdGlvbi5yb3dzLnB1c2goc2Vjb25kRGltZW5zaW9uKTtcclxuICAgIG9yZ2FuaXphdGlvbi5yb3dXaWR0aC5wdXNoKG1pbkNvbXBvdW5kU2l6ZSk7XHJcbiAgICBvcmdhbml6YXRpb24ucm93SGVpZ2h0LnB1c2goMCk7XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgcm93IHdpZHRoXHJcbiAgdmFyIHcgPSBvcmdhbml6YXRpb24ucm93V2lkdGhbcm93SW5kZXhdICsgbm9kZS5yZWN0LndpZHRoO1xyXG5cclxuICBpZiAob3JnYW5pemF0aW9uLnJvd3Nbcm93SW5kZXhdLmxlbmd0aCA+IDApIHtcclxuICAgIHcgKz0gb3JnYW5pemF0aW9uLmhvcml6b250YWxQYWRkaW5nO1xyXG4gIH1cclxuXHJcbiAgb3JnYW5pemF0aW9uLnJvd1dpZHRoW3Jvd0luZGV4XSA9IHc7XHJcbiAgLy8gVXBkYXRlIGNvbXBvdW5kIHdpZHRoXHJcbiAgaWYgKG9yZ2FuaXphdGlvbi53aWR0aCA8IHcpIHtcclxuICAgIG9yZ2FuaXphdGlvbi53aWR0aCA9IHc7XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgaGVpZ2h0XHJcbiAgdmFyIGggPSBub2RlLnJlY3QuaGVpZ2h0O1xyXG4gIGlmIChyb3dJbmRleCA+IDApXHJcbiAgICBoICs9IG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XHJcblxyXG4gIHZhciBleHRyYUhlaWdodCA9IDA7XHJcbiAgaWYgKGggPiBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XSkge1xyXG4gICAgZXh0cmFIZWlnaHQgPSBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XTtcclxuICAgIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbcm93SW5kZXhdID0gaDtcclxuICAgIGV4dHJhSGVpZ2h0ID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtyb3dJbmRleF0gLSBleHRyYUhlaWdodDtcclxuICB9XHJcblxyXG4gIG9yZ2FuaXphdGlvbi5oZWlnaHQgKz0gZXh0cmFIZWlnaHQ7XHJcblxyXG4gIC8vIEluc2VydCBub2RlXHJcbiAgb3JnYW5pemF0aW9uLnJvd3Nbcm93SW5kZXhdLnB1c2gobm9kZSk7XHJcbn07XHJcblxyXG4vL1NjYW5zIHRoZSByb3dzIG9mIGFuIG9yZ2FuaXphdGlvbiBhbmQgcmV0dXJucyB0aGUgb25lIHdpdGggdGhlIG1pbiB3aWR0aFxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRTaG9ydGVzdFJvd0luZGV4ID0gZnVuY3Rpb24gKG9yZ2FuaXphdGlvbikge1xyXG4gIHZhciByID0gLTE7XHJcbiAgdmFyIG1pbiA9IE51bWJlci5NQVhfVkFMVUU7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgb3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmIChvcmdhbml6YXRpb24ucm93V2lkdGhbaV0gPCBtaW4pIHtcclxuICAgICAgciA9IGk7XHJcbiAgICAgIG1pbiA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHI7XHJcbn07XHJcblxyXG4vL1NjYW5zIHRoZSByb3dzIG9mIGFuIG9yZ2FuaXphdGlvbiBhbmQgcmV0dXJucyB0aGUgb25lIHdpdGggdGhlIG1heCB3aWR0aFxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRMb25nZXN0Um93SW5kZXggPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uKSB7XHJcbiAgdmFyIHIgPSAtMTtcclxuICB2YXIgbWF4ID0gTnVtYmVyLk1JTl9WQUxVRTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcmdhbml6YXRpb24ucm93cy5sZW5ndGg7IGkrKykge1xyXG5cclxuICAgIGlmIChvcmdhbml6YXRpb24ucm93V2lkdGhbaV0gPiBtYXgpIHtcclxuICAgICAgciA9IGk7XHJcbiAgICAgIG1heCA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiByO1xyXG59O1xyXG5cclxuLyoqXHJcbiogVGhpcyBtZXRob2QgY2hlY2tzIHdoZXRoZXIgYWRkaW5nIGV4dHJhIHdpZHRoIHRvIHRoZSBvcmdhbml6YXRpb24gdmlvbGF0ZXNcclxuKiB0aGUgYXNwZWN0IHJhdGlvKDEpIG9yIG5vdC5cclxuKi9cclxuQ29TRUxheW91dC5wcm90b3R5cGUuY2FuQWRkSG9yaXpvbnRhbCA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24sIGV4dHJhV2lkdGgsIGV4dHJhSGVpZ2h0KSB7XHJcblxyXG4gIHZhciBzcmkgPSB0aGlzLmdldFNob3J0ZXN0Um93SW5kZXgob3JnYW5pemF0aW9uKTtcclxuXHJcbiAgaWYgKHNyaSA8IDApIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgdmFyIG1pbiA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtzcmldO1xyXG5cclxuICBpZiAobWluICsgb3JnYW5pemF0aW9uLmhvcml6b250YWxQYWRkaW5nICsgZXh0cmFXaWR0aCA8PSBvcmdhbml6YXRpb24ud2lkdGgpXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgdmFyIGhEaWZmID0gMDtcclxuXHJcbiAgLy8gQWRkaW5nIHRvIGFuIGV4aXN0aW5nIHJvd1xyXG4gIGlmIChvcmdhbml6YXRpb24ucm93SGVpZ2h0W3NyaV0gPCBleHRyYUhlaWdodCkge1xyXG4gICAgaWYgKHNyaSA+IDApXHJcbiAgICAgIGhEaWZmID0gZXh0cmFIZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nIC0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtzcmldO1xyXG4gIH1cclxuXHJcbiAgdmFyIGFkZF90b19yb3dfcmF0aW87XHJcbiAgaWYgKG9yZ2FuaXphdGlvbi53aWR0aCAtIG1pbiA+PSBleHRyYVdpZHRoICsgb3JnYW5pemF0aW9uLmhvcml6b250YWxQYWRkaW5nKSB7XHJcbiAgICBhZGRfdG9fcm93X3JhdGlvID0gKG9yZ2FuaXphdGlvbi5oZWlnaHQgKyBoRGlmZikgLyAobWluICsgZXh0cmFXaWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGFkZF90b19yb3dfcmF0aW8gPSAob3JnYW5pemF0aW9uLmhlaWdodCArIGhEaWZmKSAvIG9yZ2FuaXphdGlvbi53aWR0aDtcclxuICB9XHJcblxyXG4gIC8vIEFkZGluZyBhIG5ldyByb3cgZm9yIHRoaXMgbm9kZVxyXG4gIGhEaWZmID0gZXh0cmFIZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nO1xyXG4gIHZhciBhZGRfbmV3X3Jvd19yYXRpbztcclxuICBpZiAob3JnYW5pemF0aW9uLndpZHRoIDwgZXh0cmFXaWR0aCkge1xyXG4gICAgYWRkX25ld19yb3dfcmF0aW8gPSAob3JnYW5pemF0aW9uLmhlaWdodCArIGhEaWZmKSAvIGV4dHJhV2lkdGg7XHJcbiAgfSBlbHNlIHtcclxuICAgIGFkZF9uZXdfcm93X3JhdGlvID0gKG9yZ2FuaXphdGlvbi5oZWlnaHQgKyBoRGlmZikgLyBvcmdhbml6YXRpb24ud2lkdGg7XHJcbiAgfVxyXG5cclxuICBpZiAoYWRkX25ld19yb3dfcmF0aW8gPCAxKVxyXG4gICAgYWRkX25ld19yb3dfcmF0aW8gPSAxIC8gYWRkX25ld19yb3dfcmF0aW87XHJcblxyXG4gIGlmIChhZGRfdG9fcm93X3JhdGlvIDwgMSlcclxuICAgIGFkZF90b19yb3dfcmF0aW8gPSAxIC8gYWRkX3RvX3Jvd19yYXRpbztcclxuXHJcbiAgcmV0dXJuIGFkZF90b19yb3dfcmF0aW8gPCBhZGRfbmV3X3Jvd19yYXRpbztcclxufTtcclxuXHJcbi8vSWYgbW92aW5nIHRoZSBsYXN0IG5vZGUgZnJvbSB0aGUgbG9uZ2VzdCByb3cgYW5kIGFkZGluZyBpdCB0byB0aGUgbGFzdFxyXG4vL3JvdyBtYWtlcyB0aGUgYm91bmRpbmcgYm94IHNtYWxsZXIsIGRvIGl0LlxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5zaGlmdFRvTGFzdFJvdyA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24pIHtcclxuICB2YXIgbG9uZ2VzdCA9IHRoaXMuZ2V0TG9uZ2VzdFJvd0luZGV4KG9yZ2FuaXphdGlvbik7XHJcbiAgdmFyIGxhc3QgPSBvcmdhbml6YXRpb24ucm93V2lkdGgubGVuZ3RoIC0gMTtcclxuICB2YXIgcm93ID0gb3JnYW5pemF0aW9uLnJvd3NbbG9uZ2VzdF07XHJcbiAgdmFyIG5vZGUgPSByb3dbcm93Lmxlbmd0aCAtIDFdO1xyXG5cclxuICB2YXIgZGlmZiA9IG5vZGUud2lkdGggKyBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmc7XHJcblxyXG4gIC8vIENoZWNrIGlmIHRoZXJlIGlzIGVub3VnaCBzcGFjZSBvbiB0aGUgbGFzdCByb3dcclxuICBpZiAob3JnYW5pemF0aW9uLndpZHRoIC0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xhc3RdID4gZGlmZiAmJiBsb25nZXN0ICE9IGxhc3QpIHtcclxuICAgIC8vIFJlbW92ZSB0aGUgbGFzdCBlbGVtZW50IG9mIHRoZSBsb25nZXN0IHJvd1xyXG4gICAgcm93LnNwbGljZSgtMSwgMSk7XHJcblxyXG4gICAgLy8gUHVzaCBpdCB0byB0aGUgbGFzdCByb3dcclxuICAgIG9yZ2FuaXphdGlvbi5yb3dzW2xhc3RdLnB1c2gobm9kZSk7XHJcblxyXG4gICAgb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xvbmdlc3RdID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xvbmdlc3RdIC0gZGlmZjtcclxuICAgIG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsYXN0XSA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsYXN0XSArIGRpZmY7XHJcbiAgICBvcmdhbml6YXRpb24ud2lkdGggPSBvcmdhbml6YXRpb24ucm93V2lkdGhbaW5zdGFuY2UuZ2V0TG9uZ2VzdFJvd0luZGV4KG9yZ2FuaXphdGlvbildO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBoZWlnaHRzIG9mIHRoZSBvcmdhbml6YXRpb25cclxuICAgIHZhciBtYXhIZWlnaHQgPSBOdW1iZXIuTUlOX1ZBTFVFO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb3cubGVuZ3RoOyBpKyspIHtcclxuICAgICAgaWYgKHJvd1tpXS5oZWlnaHQgPiBtYXhIZWlnaHQpXHJcbiAgICAgICAgbWF4SGVpZ2h0ID0gcm93W2ldLmhlaWdodDtcclxuICAgIH1cclxuICAgIGlmIChsb25nZXN0ID4gMClcclxuICAgICAgbWF4SGVpZ2h0ICs9IG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XHJcblxyXG4gICAgdmFyIHByZXZUb3RhbCA9IG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbG9uZ2VzdF0gKyBvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xhc3RdO1xyXG5cclxuICAgIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbG9uZ2VzdF0gPSBtYXhIZWlnaHQ7XHJcbiAgICBpZiAob3JnYW5pemF0aW9uLnJvd0hlaWdodFtsYXN0XSA8IG5vZGUuaGVpZ2h0ICsgb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZylcclxuICAgICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsYXN0XSA9IG5vZGUuaGVpZ2h0ICsgb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcclxuXHJcbiAgICB2YXIgZmluYWxUb3RhbCA9IG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbG9uZ2VzdF0gKyBvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xhc3RdO1xyXG4gICAgb3JnYW5pemF0aW9uLmhlaWdodCArPSAoZmluYWxUb3RhbCAtIHByZXZUb3RhbCk7XHJcblxyXG4gICAgdGhpcy5zaGlmdFRvTGFzdFJvdyhvcmdhbml6YXRpb24pO1xyXG4gIH1cclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLnRpbGluZ1ByZUxheW91dCA9IGZ1bmN0aW9uKCkge1xyXG4gIGlmIChDb1NFQ29uc3RhbnRzLlRJTEUpIHtcclxuICAgIC8vIEZpbmQgemVybyBkZWdyZWUgbm9kZXMgYW5kIGNyZWF0ZSBhIGNvbXBvdW5kIGZvciBlYWNoIGxldmVsXHJcbiAgICB0aGlzLmdyb3VwWmVyb0RlZ3JlZU1lbWJlcnMoKTtcclxuICAgIC8vIFRpbGUgYW5kIGNsZWFyIGNoaWxkcmVuIG9mIGVhY2ggY29tcG91bmRcclxuICAgIHRoaXMuY2xlYXJDb21wb3VuZHMoKTtcclxuICAgIC8vIFNlcGFyYXRlbHkgdGlsZSBhbmQgY2xlYXIgemVybyBkZWdyZWUgbm9kZXMgZm9yIGVhY2ggbGV2ZWxcclxuICAgIHRoaXMuY2xlYXJaZXJvRGVncmVlTWVtYmVycygpO1xyXG4gIH1cclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLnRpbGluZ1Bvc3RMYXlvdXQgPSBmdW5jdGlvbigpIHtcclxuICBpZiAoQ29TRUNvbnN0YW50cy5USUxFKSB7XHJcbiAgICB0aGlzLnJlcG9wdWxhdGVaZXJvRGVncmVlTWVtYmVycygpO1xyXG4gICAgdGhpcy5yZXBvcHVsYXRlQ29tcG91bmRzKCk7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb1NFTGF5b3V0O1xyXG4iLCJ2YXIgRkRMYXlvdXROb2RlID0gcmVxdWlyZSgnLi9GRExheW91dE5vZGUnKTtcclxudmFyIElNYXRoID0gcmVxdWlyZSgnLi9JTWF0aCcpO1xyXG5cclxuZnVuY3Rpb24gQ29TRU5vZGUoZ20sIGxvYywgc2l6ZSwgdk5vZGUpIHtcclxuICBGRExheW91dE5vZGUuY2FsbCh0aGlzLCBnbSwgbG9jLCBzaXplLCB2Tm9kZSk7XHJcbn1cclxuXHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZETGF5b3V0Tm9kZS5wcm90b3R5cGUpO1xyXG5mb3IgKHZhciBwcm9wIGluIEZETGF5b3V0Tm9kZSkge1xyXG4gIENvU0VOb2RlW3Byb3BdID0gRkRMYXlvdXROb2RlW3Byb3BdO1xyXG59XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgbGF5b3V0ID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0TGF5b3V0KCk7XHJcbiAgdGhpcy5kaXNwbGFjZW1lbnRYID0gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKlxyXG4gICAgICAgICAgKHRoaXMuc3ByaW5nRm9yY2VYICsgdGhpcy5yZXB1bHNpb25Gb3JjZVggKyB0aGlzLmdyYXZpdGF0aW9uRm9yY2VYKTtcclxuICB0aGlzLmRpc3BsYWNlbWVudFkgPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqXHJcbiAgICAgICAgICAodGhpcy5zcHJpbmdGb3JjZVkgKyB0aGlzLnJlcHVsc2lvbkZvcmNlWSArIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVkpO1xyXG5cclxuXHJcbiAgaWYgKE1hdGguYWJzKHRoaXMuZGlzcGxhY2VtZW50WCkgPiBsYXlvdXQuY29vbGluZ0ZhY3RvciAqIGxheW91dC5tYXhOb2RlRGlzcGxhY2VtZW50KVxyXG4gIHtcclxuICAgIHRoaXMuZGlzcGxhY2VtZW50WCA9IGxheW91dC5jb29saW5nRmFjdG9yICogbGF5b3V0Lm1heE5vZGVEaXNwbGFjZW1lbnQgKlxyXG4gICAgICAgICAgICBJTWF0aC5zaWduKHRoaXMuZGlzcGxhY2VtZW50WCk7XHJcbiAgfVxyXG5cclxuICBpZiAoTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRZKSA+IGxheW91dC5jb29saW5nRmFjdG9yICogbGF5b3V0Lm1heE5vZGVEaXNwbGFjZW1lbnQpXHJcbiAge1xyXG4gICAgdGhpcy5kaXNwbGFjZW1lbnRZID0gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKiBsYXlvdXQubWF4Tm9kZURpc3BsYWNlbWVudCAqXHJcbiAgICAgICAgICAgIElNYXRoLnNpZ24odGhpcy5kaXNwbGFjZW1lbnRZKTtcclxuICB9XHJcblxyXG4gIC8vIGEgc2ltcGxlIG5vZGUsIGp1c3QgbW92ZSBpdFxyXG4gIGlmICh0aGlzLmNoaWxkID09IG51bGwpXHJcbiAge1xyXG4gICAgdGhpcy5tb3ZlQnkodGhpcy5kaXNwbGFjZW1lbnRYLCB0aGlzLmRpc3BsYWNlbWVudFkpO1xyXG4gIH1cclxuICAvLyBhbiBlbXB0eSBjb21wb3VuZCBub2RlLCBhZ2FpbiBqdXN0IG1vdmUgaXRcclxuICBlbHNlIGlmICh0aGlzLmNoaWxkLmdldE5vZGVzKCkubGVuZ3RoID09IDApXHJcbiAge1xyXG4gICAgdGhpcy5tb3ZlQnkodGhpcy5kaXNwbGFjZW1lbnRYLCB0aGlzLmRpc3BsYWNlbWVudFkpO1xyXG4gIH1cclxuICAvLyBub24tZW1wdHkgY29tcG91bmQgbm9kZSwgcHJvcG9nYXRlIG1vdmVtZW50IHRvIGNoaWxkcmVuIGFzIHdlbGxcclxuICBlbHNlXHJcbiAge1xyXG4gICAgdGhpcy5wcm9wb2dhdGVEaXNwbGFjZW1lbnRUb0NoaWxkcmVuKHRoaXMuZGlzcGxhY2VtZW50WCxcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGFjZW1lbnRZKTtcclxuICB9XHJcblxyXG4gIGxheW91dC50b3RhbERpc3BsYWNlbWVudCArPVxyXG4gICAgICAgICAgTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRYKSArIE1hdGguYWJzKHRoaXMuZGlzcGxhY2VtZW50WSk7XHJcblxyXG4gIHRoaXMuc3ByaW5nRm9yY2VYID0gMDtcclxuICB0aGlzLnNwcmluZ0ZvcmNlWSA9IDA7XHJcbiAgdGhpcy5yZXB1bHNpb25Gb3JjZVggPSAwO1xyXG4gIHRoaXMucmVwdWxzaW9uRm9yY2VZID0gMDtcclxuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VYID0gMDtcclxuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VZID0gMDtcclxuICB0aGlzLmRpc3BsYWNlbWVudFggPSAwO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50WSA9IDA7XHJcbn07XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUucHJvcG9nYXRlRGlzcGxhY2VtZW50VG9DaGlsZHJlbiA9IGZ1bmN0aW9uIChkWCwgZFkpXHJcbntcclxuICB2YXIgbm9kZXMgPSB0aGlzLmdldENoaWxkKCkuZ2V0Tm9kZXMoKTtcclxuICB2YXIgbm9kZTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIG5vZGUgPSBub2Rlc1tpXTtcclxuICAgIGlmIChub2RlLmdldENoaWxkKCkgPT0gbnVsbClcclxuICAgIHtcclxuICAgICAgbm9kZS5tb3ZlQnkoZFgsIGRZKTtcclxuICAgICAgbm9kZS5kaXNwbGFjZW1lbnRYICs9IGRYO1xyXG4gICAgICBub2RlLmRpc3BsYWNlbWVudFkgKz0gZFk7XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIG5vZGUucHJvcG9nYXRlRGlzcGxhY2VtZW50VG9DaGlsZHJlbihkWCwgZFkpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5zZXRQcmVkMSA9IGZ1bmN0aW9uIChwcmVkMSlcclxue1xyXG4gIHRoaXMucHJlZDEgPSBwcmVkMTtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5nZXRQcmVkMSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gcHJlZDE7XHJcbn07XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUuZ2V0UHJlZDIgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHByZWQyO1xyXG59O1xyXG5cclxuQ29TRU5vZGUucHJvdG90eXBlLnNldE5leHQgPSBmdW5jdGlvbiAobmV4dClcclxue1xyXG4gIHRoaXMubmV4dCA9IG5leHQ7XHJcbn07XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUuZ2V0TmV4dCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gbmV4dDtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5zZXRQcm9jZXNzZWQgPSBmdW5jdGlvbiAocHJvY2Vzc2VkKVxyXG57XHJcbiAgdGhpcy5wcm9jZXNzZWQgPSBwcm9jZXNzZWQ7XHJcbn07XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUuaXNQcm9jZXNzZWQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHByb2Nlc3NlZDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29TRU5vZGU7XHJcbiIsImZ1bmN0aW9uIERpbWVuc2lvbkQod2lkdGgsIGhlaWdodCkge1xyXG4gIHRoaXMud2lkdGggPSAwO1xyXG4gIHRoaXMuaGVpZ2h0ID0gMDtcclxuICBpZiAod2lkdGggIT09IG51bGwgJiYgaGVpZ2h0ICE9PSBudWxsKSB7XHJcbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcclxuICAgIHRoaXMud2lkdGggPSB3aWR0aDtcclxuICB9XHJcbn1cclxuXHJcbkRpbWVuc2lvbkQucHJvdG90eXBlLmdldFdpZHRoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLndpZHRoO1xyXG59O1xyXG5cclxuRGltZW5zaW9uRC5wcm90b3R5cGUuc2V0V2lkdGggPSBmdW5jdGlvbiAod2lkdGgpXHJcbntcclxuICB0aGlzLndpZHRoID0gd2lkdGg7XHJcbn07XHJcblxyXG5EaW1lbnNpb25ELnByb3RvdHlwZS5nZXRIZWlnaHQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuaGVpZ2h0O1xyXG59O1xyXG5cclxuRGltZW5zaW9uRC5wcm90b3R5cGUuc2V0SGVpZ2h0ID0gZnVuY3Rpb24gKGhlaWdodClcclxue1xyXG4gIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEaW1lbnNpb25EO1xyXG4iLCJmdW5jdGlvbiBFbWl0dGVyKCl7XHJcbiAgdGhpcy5saXN0ZW5lcnMgPSBbXTtcclxufVxyXG5cclxudmFyIHAgPSBFbWl0dGVyLnByb3RvdHlwZTtcclxuXHJcbnAuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiggZXZlbnQsIGNhbGxiYWNrICl7XHJcbiAgdGhpcy5saXN0ZW5lcnMucHVzaCh7XHJcbiAgICBldmVudDogZXZlbnQsXHJcbiAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuICB9KTtcclxufTtcclxuXHJcbnAucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiggZXZlbnQsIGNhbGxiYWNrICl7XHJcbiAgZm9yKCB2YXIgaSA9IHRoaXMubGlzdGVuZXJzLmxlbmd0aDsgaSA+PSAwOyBpLS0gKXtcclxuICAgIHZhciBsID0gdGhpcy5saXN0ZW5lcnNbaV07XHJcblxyXG4gICAgaWYoIGwuZXZlbnQgPT09IGV2ZW50ICYmIGwuY2FsbGJhY2sgPT09IGNhbGxiYWNrICl7XHJcbiAgICAgIHRoaXMubGlzdGVuZXJzLnNwbGljZSggaSwgMSApO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbnAuZW1pdCA9IGZ1bmN0aW9uKCBldmVudCwgZGF0YSApe1xyXG4gIGZvciggdmFyIGkgPSAwOyBpIDwgdGhpcy5saXN0ZW5lcnMubGVuZ3RoOyBpKysgKXtcclxuICAgIHZhciBsID0gdGhpcy5saXN0ZW5lcnNbaV07XHJcblxyXG4gICAgaWYoIGV2ZW50ID09PSBsLmV2ZW50ICl7XHJcbiAgICAgIGwuY2FsbGJhY2soIGRhdGEgKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7XHJcbiIsInZhciBMYXlvdXQgPSByZXF1aXJlKCcuL0xheW91dCcpO1xyXG52YXIgRkRMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0ZETGF5b3V0Q29uc3RhbnRzJyk7XHJcbnZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xyXG52YXIgSUdlb21ldHJ5ID0gcmVxdWlyZSgnLi9JR2VvbWV0cnknKTtcclxudmFyIElNYXRoID0gcmVxdWlyZSgnLi9JTWF0aCcpO1xyXG5cclxuZnVuY3Rpb24gRkRMYXlvdXQoKSB7XHJcbiAgTGF5b3V0LmNhbGwodGhpcyk7XHJcblxyXG4gIHRoaXMudXNlU21hcnRJZGVhbEVkZ2VMZW5ndGhDYWxjdWxhdGlvbiA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVVNFX1NNQVJUX0lERUFMX0VER0VfTEVOR1RIX0NBTENVTEFUSU9OO1xyXG4gIHRoaXMuaWRlYWxFZGdlTGVuZ3RoID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcclxuICB0aGlzLnNwcmluZ0NvbnN0YW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEg7XHJcbiAgdGhpcy5yZXB1bHNpb25Db25zdGFudCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RIO1xyXG4gIHRoaXMuZ3Jhdml0eUNvbnN0YW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIO1xyXG4gIHRoaXMuY29tcG91bmRHcmF2aXR5Q29uc3RhbnQgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEg7XHJcbiAgdGhpcy5ncmF2aXR5UmFuZ2VGYWN0b3IgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfUkFOR0VfRkFDVE9SO1xyXG4gIHRoaXMuY29tcG91bmRHcmF2aXR5UmFuZ2VGYWN0b3IgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfUkFOR0VfRkFDVE9SO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50VGhyZXNob2xkUGVyTm9kZSA9ICgzLjAgKiBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIKSAvIDEwMDtcclxuICB0aGlzLmNvb2xpbmdGYWN0b3IgPSAxLjA7XHJcbiAgdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciA9IDEuMDtcclxuICB0aGlzLnRvdGFsRGlzcGxhY2VtZW50ID0gMC4wO1xyXG4gIHRoaXMub2xkVG90YWxEaXNwbGFjZW1lbnQgPSAwLjA7XHJcbiAgdGhpcy5tYXhJdGVyYXRpb25zID0gRkRMYXlvdXRDb25zdGFudHMuTUFYX0lURVJBVElPTlM7XHJcbn1cclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTGF5b3V0LnByb3RvdHlwZSk7XHJcblxyXG5mb3IgKHZhciBwcm9wIGluIExheW91dCkge1xyXG4gIEZETGF5b3V0W3Byb3BdID0gTGF5b3V0W3Byb3BdO1xyXG59XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuaW5pdFBhcmFtZXRlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgTGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycy5jYWxsKHRoaXMsIGFyZ3VtZW50cyk7XHJcblxyXG4gIGlmICh0aGlzLmxheW91dFF1YWxpdHkgPT0gTGF5b3V0Q29uc3RhbnRzLkRSQUZUX1FVQUxJVFkpXHJcbiAge1xyXG4gICAgdGhpcy5kaXNwbGFjZW1lbnRUaHJlc2hvbGRQZXJOb2RlICs9IDAuMzA7XHJcbiAgICB0aGlzLm1heEl0ZXJhdGlvbnMgKj0gMC44O1xyXG4gIH1cclxuICBlbHNlIGlmICh0aGlzLmxheW91dFF1YWxpdHkgPT0gTGF5b3V0Q29uc3RhbnRzLlBST09GX1FVQUxJVFkpXHJcbiAge1xyXG4gICAgdGhpcy5kaXNwbGFjZW1lbnRUaHJlc2hvbGRQZXJOb2RlIC09IDAuMzA7XHJcbiAgICB0aGlzLm1heEl0ZXJhdGlvbnMgKj0gMS4yO1xyXG4gIH1cclxuXHJcbiAgdGhpcy50b3RhbEl0ZXJhdGlvbnMgPSAwO1xyXG4gIHRoaXMubm90QW5pbWF0ZWRJdGVyYXRpb25zID0gMDtcclxuXHJcbi8vICAgIHRoaXMudXNlRlJHcmlkVmFyaWFudCA9IGxheW91dE9wdGlvbnNQYWNrLnNtYXJ0UmVwdWxzaW9uUmFuZ2VDYWxjO1xyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNJZGVhbEVkZ2VMZW5ndGhzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBlZGdlO1xyXG4gIHZhciBsY2FEZXB0aDtcclxuICB2YXIgc291cmNlO1xyXG4gIHZhciB0YXJnZXQ7XHJcbiAgdmFyIHNpemVPZlNvdXJjZUluTGNhO1xyXG4gIHZhciBzaXplT2ZUYXJnZXRJbkxjYTtcclxuXHJcbiAgdmFyIGFsbEVkZ2VzID0gdGhpcy5nZXRHcmFwaE1hbmFnZXIoKS5nZXRBbGxFZGdlcygpO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsRWRnZXMubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgZWRnZSA9IGFsbEVkZ2VzW2ldO1xyXG5cclxuICAgIGVkZ2UuaWRlYWxMZW5ndGggPSB0aGlzLmlkZWFsRWRnZUxlbmd0aDtcclxuXHJcbiAgICBpZiAoZWRnZS5pc0ludGVyR3JhcGgpXHJcbiAgICB7XHJcbiAgICAgIHNvdXJjZSA9IGVkZ2UuZ2V0U291cmNlKCk7XHJcbiAgICAgIHRhcmdldCA9IGVkZ2UuZ2V0VGFyZ2V0KCk7XHJcblxyXG4gICAgICBzaXplT2ZTb3VyY2VJbkxjYSA9IGVkZ2UuZ2V0U291cmNlSW5MY2EoKS5nZXRFc3RpbWF0ZWRTaXplKCk7XHJcbiAgICAgIHNpemVPZlRhcmdldEluTGNhID0gZWRnZS5nZXRUYXJnZXRJbkxjYSgpLmdldEVzdGltYXRlZFNpemUoKTtcclxuXHJcbiAgICAgIGlmICh0aGlzLnVzZVNtYXJ0SWRlYWxFZGdlTGVuZ3RoQ2FsY3VsYXRpb24pXHJcbiAgICAgIHtcclxuICAgICAgICBlZGdlLmlkZWFsTGVuZ3RoICs9IHNpemVPZlNvdXJjZUluTGNhICsgc2l6ZU9mVGFyZ2V0SW5MY2EgLVxyXG4gICAgICAgICAgICAgICAgMiAqIExheW91dENvbnN0YW50cy5TSU1QTEVfTk9ERV9TSVpFO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsY2FEZXB0aCA9IGVkZ2UuZ2V0TGNhKCkuZ2V0SW5jbHVzaW9uVHJlZURlcHRoKCk7XHJcblxyXG4gICAgICBlZGdlLmlkZWFsTGVuZ3RoICs9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggKlxyXG4gICAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLlBFUl9MRVZFTF9JREVBTF9FREdFX0xFTkdUSF9GQUNUT1IgKlxyXG4gICAgICAgICAgICAgIChzb3VyY2UuZ2V0SW5jbHVzaW9uVHJlZURlcHRoKCkgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmdldEluY2x1c2lvblRyZWVEZXB0aCgpIC0gMiAqIGxjYURlcHRoKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuaW5pdFNwcmluZ0VtYmVkZGVyID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICBpZiAodGhpcy5pbmNyZW1lbnRhbClcclxuICB7XHJcbiAgICB0aGlzLmNvb2xpbmdGYWN0b3IgPSAwLjg7XHJcbiAgICB0aGlzLmluaXRpYWxDb29saW5nRmFjdG9yID0gMC44O1xyXG4gICAgdGhpcy5tYXhOb2RlRGlzcGxhY2VtZW50ID1cclxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UX0lOQ1JFTUVOVEFMO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgdGhpcy5jb29saW5nRmFjdG9yID0gMS4wO1xyXG4gICAgdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciA9IDEuMDtcclxuICAgIHRoaXMubWF4Tm9kZURpc3BsYWNlbWVudCA9XHJcbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLk1BWF9OT0RFX0RJU1BMQUNFTUVOVDtcclxuICB9XHJcblxyXG4gIHRoaXMubWF4SXRlcmF0aW9ucyA9XHJcbiAgICAgICAgICBNYXRoLm1heCh0aGlzLmdldEFsbE5vZGVzKCkubGVuZ3RoICogNSwgdGhpcy5tYXhJdGVyYXRpb25zKTtcclxuXHJcbiAgdGhpcy50b3RhbERpc3BsYWNlbWVudFRocmVzaG9sZCA9XHJcbiAgICAgICAgICB0aGlzLmRpc3BsYWNlbWVudFRocmVzaG9sZFBlck5vZGUgKiB0aGlzLmdldEFsbE5vZGVzKCkubGVuZ3RoO1xyXG5cclxuICB0aGlzLnJlcHVsc2lvblJhbmdlID0gdGhpcy5jYWxjUmVwdWxzaW9uUmFuZ2UoKTtcclxufTtcclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjU3ByaW5nRm9yY2VzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBsRWRnZXMgPSB0aGlzLmdldEFsbEVkZ2VzKCk7XHJcbiAgdmFyIGVkZ2U7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbEVkZ2VzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIGVkZ2UgPSBsRWRnZXNbaV07XHJcblxyXG4gICAgdGhpcy5jYWxjU3ByaW5nRm9yY2UoZWRnZSwgZWRnZS5pZGVhbExlbmd0aCk7XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25Gb3JjZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGksIGo7XHJcbiAgdmFyIG5vZGVBLCBub2RlQjtcclxuICB2YXIgbE5vZGVzID0gdGhpcy5nZXRBbGxOb2RlcygpO1xyXG5cclxuICBmb3IgKGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIG5vZGVBID0gbE5vZGVzW2ldO1xyXG5cclxuICAgIGZvciAoaiA9IGkgKyAxOyBqIDwgbE5vZGVzLmxlbmd0aDsgaisrKVxyXG4gICAge1xyXG4gICAgICBub2RlQiA9IGxOb2Rlc1tqXTtcclxuXHJcbiAgICAgIC8vIElmIGJvdGggbm9kZXMgYXJlIG5vdCBtZW1iZXJzIG9mIHRoZSBzYW1lIGdyYXBoLCBza2lwLlxyXG4gICAgICBpZiAobm9kZUEuZ2V0T3duZXIoKSAhPSBub2RlQi5nZXRPd25lcigpKVxyXG4gICAgICB7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuY2FsY1JlcHVsc2lvbkZvcmNlKG5vZGVBLCBub2RlQik7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2VzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBub2RlO1xyXG4gIHZhciBsTm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uKCk7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIG5vZGUgPSBsTm9kZXNbaV07XHJcbiAgICB0aGlzLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2Uobm9kZSk7XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLm1vdmVOb2RlcyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbE5vZGVzID0gdGhpcy5nZXRBbGxOb2RlcygpO1xyXG4gIHZhciBub2RlO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxOb2Rlcy5sZW5ndGg7IGkrKylcclxuICB7XHJcbiAgICBub2RlID0gbE5vZGVzW2ldO1xyXG4gICAgbm9kZS5tb3ZlKCk7XHJcbiAgfVxyXG59XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1NwcmluZ0ZvcmNlID0gZnVuY3Rpb24gKGVkZ2UsIGlkZWFsTGVuZ3RoKSB7XHJcbiAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLmdldFNvdXJjZSgpO1xyXG4gIHZhciB0YXJnZXROb2RlID0gZWRnZS5nZXRUYXJnZXQoKTtcclxuXHJcbiAgdmFyIGxlbmd0aDtcclxuICB2YXIgc3ByaW5nRm9yY2U7XHJcbiAgdmFyIHNwcmluZ0ZvcmNlWDtcclxuICB2YXIgc3ByaW5nRm9yY2VZO1xyXG5cclxuICAvLyBVcGRhdGUgZWRnZSBsZW5ndGhcclxuICBpZiAodGhpcy51bmlmb3JtTGVhZk5vZGVTaXplcyAmJlxyXG4gICAgICAgICAgc291cmNlTm9kZS5nZXRDaGlsZCgpID09IG51bGwgJiYgdGFyZ2V0Tm9kZS5nZXRDaGlsZCgpID09IG51bGwpXHJcbiAge1xyXG4gICAgZWRnZS51cGRhdGVMZW5ndGhTaW1wbGUoKTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIGVkZ2UudXBkYXRlTGVuZ3RoKCk7XHJcblxyXG4gICAgaWYgKGVkZ2UuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0KVxyXG4gICAge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBsZW5ndGggPSBlZGdlLmdldExlbmd0aCgpO1xyXG5cclxuICAvLyBDYWxjdWxhdGUgc3ByaW5nIGZvcmNlc1xyXG4gIHNwcmluZ0ZvcmNlID0gdGhpcy5zcHJpbmdDb25zdGFudCAqIChsZW5ndGggLSBpZGVhbExlbmd0aCk7XHJcblxyXG4gIC8vIFByb2plY3QgZm9yY2Ugb250byB4IGFuZCB5IGF4ZXNcclxuICBzcHJpbmdGb3JjZVggPSBzcHJpbmdGb3JjZSAqIChlZGdlLmxlbmd0aFggLyBsZW5ndGgpO1xyXG4gIHNwcmluZ0ZvcmNlWSA9IHNwcmluZ0ZvcmNlICogKGVkZ2UubGVuZ3RoWSAvIGxlbmd0aCk7XHJcblxyXG4gIC8vIEFwcGx5IGZvcmNlcyBvbiB0aGUgZW5kIG5vZGVzXHJcbiAgc291cmNlTm9kZS5zcHJpbmdGb3JjZVggKz0gc3ByaW5nRm9yY2VYO1xyXG4gIHNvdXJjZU5vZGUuc3ByaW5nRm9yY2VZICs9IHNwcmluZ0ZvcmNlWTtcclxuICB0YXJnZXROb2RlLnNwcmluZ0ZvcmNlWCAtPSBzcHJpbmdGb3JjZVg7XHJcbiAgdGFyZ2V0Tm9kZS5zcHJpbmdGb3JjZVkgLT0gc3ByaW5nRm9yY2VZO1xyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25Gb3JjZSA9IGZ1bmN0aW9uIChub2RlQSwgbm9kZUIpIHtcclxuICB2YXIgcmVjdEEgPSBub2RlQS5nZXRSZWN0KCk7XHJcbiAgdmFyIHJlY3RCID0gbm9kZUIuZ2V0UmVjdCgpO1xyXG4gIHZhciBvdmVybGFwQW1vdW50ID0gbmV3IEFycmF5KDIpO1xyXG4gIHZhciBjbGlwUG9pbnRzID0gbmV3IEFycmF5KDQpO1xyXG4gIHZhciBkaXN0YW5jZVg7XHJcbiAgdmFyIGRpc3RhbmNlWTtcclxuICB2YXIgZGlzdGFuY2VTcXVhcmVkO1xyXG4gIHZhciBkaXN0YW5jZTtcclxuICB2YXIgcmVwdWxzaW9uRm9yY2U7XHJcbiAgdmFyIHJlcHVsc2lvbkZvcmNlWDtcclxuICB2YXIgcmVwdWxzaW9uRm9yY2VZO1xyXG5cclxuICBpZiAocmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpLy8gdHdvIG5vZGVzIG92ZXJsYXBcclxuICB7XHJcbiAgICAvLyBjYWxjdWxhdGUgc2VwYXJhdGlvbiBhbW91bnQgaW4geCBhbmQgeSBkaXJlY3Rpb25zXHJcbiAgICBJR2VvbWV0cnkuY2FsY1NlcGFyYXRpb25BbW91bnQocmVjdEEsXHJcbiAgICAgICAgICAgIHJlY3RCLFxyXG4gICAgICAgICAgICBvdmVybGFwQW1vdW50LFxyXG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIIC8gMi4wKTtcclxuXHJcbiAgICByZXB1bHNpb25Gb3JjZVggPSBvdmVybGFwQW1vdW50WzBdO1xyXG4gICAgcmVwdWxzaW9uRm9yY2VZID0gb3ZlcmxhcEFtb3VudFsxXTtcclxuICB9XHJcbiAgZWxzZS8vIG5vIG92ZXJsYXBcclxuICB7XHJcbiAgICAvLyBjYWxjdWxhdGUgZGlzdGFuY2VcclxuXHJcbiAgICBpZiAodGhpcy51bmlmb3JtTGVhZk5vZGVTaXplcyAmJlxyXG4gICAgICAgICAgICBub2RlQS5nZXRDaGlsZCgpID09IG51bGwgJiYgbm9kZUIuZ2V0Q2hpbGQoKSA9PSBudWxsKS8vIHNpbXBseSBiYXNlIHJlcHVsc2lvbiBvbiBkaXN0YW5jZSBvZiBub2RlIGNlbnRlcnNcclxuICAgIHtcclxuICAgICAgZGlzdGFuY2VYID0gcmVjdEIuZ2V0Q2VudGVyWCgpIC0gcmVjdEEuZ2V0Q2VudGVyWCgpO1xyXG4gICAgICBkaXN0YW5jZVkgPSByZWN0Qi5nZXRDZW50ZXJZKCkgLSByZWN0QS5nZXRDZW50ZXJZKCk7XHJcbiAgICB9XHJcbiAgICBlbHNlLy8gdXNlIGNsaXBwaW5nIHBvaW50c1xyXG4gICAge1xyXG4gICAgICBJR2VvbWV0cnkuZ2V0SW50ZXJzZWN0aW9uKHJlY3RBLCByZWN0QiwgY2xpcFBvaW50cyk7XHJcblxyXG4gICAgICBkaXN0YW5jZVggPSBjbGlwUG9pbnRzWzJdIC0gY2xpcFBvaW50c1swXTtcclxuICAgICAgZGlzdGFuY2VZID0gY2xpcFBvaW50c1szXSAtIGNsaXBQb2ludHNbMV07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTm8gcmVwdWxzaW9uIHJhbmdlLiBGUiBncmlkIHZhcmlhbnQgc2hvdWxkIHRha2UgY2FyZSBvZiB0aGlzLlxyXG4gICAgaWYgKE1hdGguYWJzKGRpc3RhbmNlWCkgPCBGRExheW91dENvbnN0YW50cy5NSU5fUkVQVUxTSU9OX0RJU1QpXHJcbiAgICB7XHJcbiAgICAgIGRpc3RhbmNlWCA9IElNYXRoLnNpZ24oZGlzdGFuY2VYKSAqXHJcbiAgICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChNYXRoLmFicyhkaXN0YW5jZVkpIDwgRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUKVxyXG4gICAge1xyXG4gICAgICBkaXN0YW5jZVkgPSBJTWF0aC5zaWduKGRpc3RhbmNlWSkgKlxyXG4gICAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLk1JTl9SRVBVTFNJT05fRElTVDtcclxuICAgIH1cclxuXHJcbiAgICBkaXN0YW5jZVNxdWFyZWQgPSBkaXN0YW5jZVggKiBkaXN0YW5jZVggKyBkaXN0YW5jZVkgKiBkaXN0YW5jZVk7XHJcbiAgICBkaXN0YW5jZSA9IE1hdGguc3FydChkaXN0YW5jZVNxdWFyZWQpO1xyXG5cclxuICAgIHJlcHVsc2lvbkZvcmNlID0gdGhpcy5yZXB1bHNpb25Db25zdGFudCAvIGRpc3RhbmNlU3F1YXJlZDtcclxuXHJcbiAgICAvLyBQcm9qZWN0IGZvcmNlIG9udG8geCBhbmQgeSBheGVzXHJcbiAgICByZXB1bHNpb25Gb3JjZVggPSByZXB1bHNpb25Gb3JjZSAqIGRpc3RhbmNlWCAvIGRpc3RhbmNlO1xyXG4gICAgcmVwdWxzaW9uRm9yY2VZID0gcmVwdWxzaW9uRm9yY2UgKiBkaXN0YW5jZVkgLyBkaXN0YW5jZTtcclxuICB9XHJcblxyXG4gIC8vIEFwcGx5IGZvcmNlcyBvbiB0aGUgdHdvIG5vZGVzXHJcbiAgbm9kZUEucmVwdWxzaW9uRm9yY2VYIC09IHJlcHVsc2lvbkZvcmNlWDtcclxuICBub2RlQS5yZXB1bHNpb25Gb3JjZVkgLT0gcmVwdWxzaW9uRm9yY2VZO1xyXG4gIG5vZGVCLnJlcHVsc2lvbkZvcmNlWCArPSByZXB1bHNpb25Gb3JjZVg7XHJcbiAgbm9kZUIucmVwdWxzaW9uRm9yY2VZICs9IHJlcHVsc2lvbkZvcmNlWTtcclxufTtcclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjR3Jhdml0YXRpb25hbEZvcmNlID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICB2YXIgb3duZXJHcmFwaDtcclxuICB2YXIgb3duZXJDZW50ZXJYO1xyXG4gIHZhciBvd25lckNlbnRlclk7XHJcbiAgdmFyIGRpc3RhbmNlWDtcclxuICB2YXIgZGlzdGFuY2VZO1xyXG4gIHZhciBhYnNEaXN0YW5jZVg7XHJcbiAgdmFyIGFic0Rpc3RhbmNlWTtcclxuICB2YXIgZXN0aW1hdGVkU2l6ZTtcclxuICBvd25lckdyYXBoID0gbm9kZS5nZXRPd25lcigpO1xyXG5cclxuICBvd25lckNlbnRlclggPSAob3duZXJHcmFwaC5nZXRSaWdodCgpICsgb3duZXJHcmFwaC5nZXRMZWZ0KCkpIC8gMjtcclxuICBvd25lckNlbnRlclkgPSAob3duZXJHcmFwaC5nZXRUb3AoKSArIG93bmVyR3JhcGguZ2V0Qm90dG9tKCkpIC8gMjtcclxuICBkaXN0YW5jZVggPSBub2RlLmdldENlbnRlclgoKSAtIG93bmVyQ2VudGVyWDtcclxuICBkaXN0YW5jZVkgPSBub2RlLmdldENlbnRlclkoKSAtIG93bmVyQ2VudGVyWTtcclxuICBhYnNEaXN0YW5jZVggPSBNYXRoLmFicyhkaXN0YW5jZVgpO1xyXG4gIGFic0Rpc3RhbmNlWSA9IE1hdGguYWJzKGRpc3RhbmNlWSk7XHJcblxyXG4gIGlmIChub2RlLmdldE93bmVyKCkgPT0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpKS8vIGluIHRoZSByb290IGdyYXBoXHJcbiAge1xyXG4gICAgTWF0aC5mbG9vcig4MCk7XHJcbiAgICBlc3RpbWF0ZWRTaXplID0gTWF0aC5mbG9vcihvd25lckdyYXBoLmdldEVzdGltYXRlZFNpemUoKSAqXHJcbiAgICAgICAgICAgIHRoaXMuZ3Jhdml0eVJhbmdlRmFjdG9yKTtcclxuXHJcbiAgICBpZiAoYWJzRGlzdGFuY2VYID4gZXN0aW1hdGVkU2l6ZSB8fCBhYnNEaXN0YW5jZVkgPiBlc3RpbWF0ZWRTaXplKVxyXG4gICAge1xyXG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VYID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VYO1xyXG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VZID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VZO1xyXG4gICAgfVxyXG4gIH1cclxuICBlbHNlLy8gaW5zaWRlIGEgY29tcG91bmRcclxuICB7XHJcbiAgICBlc3RpbWF0ZWRTaXplID0gTWF0aC5mbG9vcigob3duZXJHcmFwaC5nZXRFc3RpbWF0ZWRTaXplKCkgKlxyXG4gICAgICAgICAgICB0aGlzLmNvbXBvdW5kR3Jhdml0eVJhbmdlRmFjdG9yKSk7XHJcblxyXG4gICAgaWYgKGFic0Rpc3RhbmNlWCA+IGVzdGltYXRlZFNpemUgfHwgYWJzRGlzdGFuY2VZID4gZXN0aW1hdGVkU2l6ZSlcclxuICAgIHtcclxuICAgICAgbm9kZS5ncmF2aXRhdGlvbkZvcmNlWCA9IC10aGlzLmdyYXZpdHlDb25zdGFudCAqIGRpc3RhbmNlWCAqXHJcbiAgICAgICAgICAgICAgdGhpcy5jb21wb3VuZEdyYXZpdHlDb25zdGFudDtcclxuICAgICAgbm9kZS5ncmF2aXRhdGlvbkZvcmNlWSA9IC10aGlzLmdyYXZpdHlDb25zdGFudCAqIGRpc3RhbmNlWSAqXHJcbiAgICAgICAgICAgICAgdGhpcy5jb21wb3VuZEdyYXZpdHlDb25zdGFudDtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuaXNDb252ZXJnZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGNvbnZlcmdlZDtcclxuICB2YXIgb3NjaWxhdGluZyA9IGZhbHNlO1xyXG5cclxuICBpZiAodGhpcy50b3RhbEl0ZXJhdGlvbnMgPiB0aGlzLm1heEl0ZXJhdGlvbnMgLyAzKVxyXG4gIHtcclxuICAgIG9zY2lsYXRpbmcgPVxyXG4gICAgICAgICAgICBNYXRoLmFicyh0aGlzLnRvdGFsRGlzcGxhY2VtZW50IC0gdGhpcy5vbGRUb3RhbERpc3BsYWNlbWVudCkgPCAyO1xyXG4gIH1cclxuXHJcbiAgY29udmVyZ2VkID0gdGhpcy50b3RhbERpc3BsYWNlbWVudCA8IHRoaXMudG90YWxEaXNwbGFjZW1lbnRUaHJlc2hvbGQ7XHJcblxyXG4gIHRoaXMub2xkVG90YWxEaXNwbGFjZW1lbnQgPSB0aGlzLnRvdGFsRGlzcGxhY2VtZW50O1xyXG5cclxuICByZXR1cm4gY29udmVyZ2VkIHx8IG9zY2lsYXRpbmc7XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuYW5pbWF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAodGhpcy5hbmltYXRpb25EdXJpbmdMYXlvdXQgJiYgIXRoaXMuaXNTdWJMYXlvdXQpXHJcbiAge1xyXG4gICAgaWYgKHRoaXMubm90QW5pbWF0ZWRJdGVyYXRpb25zID09IHRoaXMuYW5pbWF0aW9uUGVyaW9kKVxyXG4gICAge1xyXG4gICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICB0aGlzLm5vdEFuaW1hdGVkSXRlcmF0aW9ucyA9IDA7XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIHRoaXMubm90QW5pbWF0ZWRJdGVyYXRpb25zKys7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25SYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gMC4wO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dDtcclxuIiwidmFyIExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vTGF5b3V0Q29uc3RhbnRzJyk7XHJcblxyXG5mdW5jdGlvbiBGRExheW91dENvbnN0YW50cygpIHtcclxufVxyXG5cclxuLy9GRExheW91dENvbnN0YW50cyBpbmhlcml0cyBzdGF0aWMgcHJvcHMgaW4gTGF5b3V0Q29uc3RhbnRzXHJcbmZvciAodmFyIHByb3AgaW4gTGF5b3V0Q29uc3RhbnRzKSB7XHJcbiAgRkRMYXlvdXRDb25zdGFudHNbcHJvcF0gPSBMYXlvdXRDb25zdGFudHNbcHJvcF07XHJcbn1cclxuXHJcbkZETGF5b3V0Q29uc3RhbnRzLk1BWF9JVEVSQVRJT05TID0gMjUwMDtcclxuXHJcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggPSA1MDtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEggPSAwLjQ1O1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX1JFUFVMU0lPTl9TVFJFTkdUSCA9IDQ1MDAuMDtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIID0gMC40O1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEggPSAxLjA7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSAzLjg7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSAxLjU7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVVNFX1NNQVJUX0lERUFMX0VER0VfTEVOR1RIX0NBTENVTEFUSU9OID0gdHJ1ZTtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfUkVQVUxTSU9OX1JBTkdFX0NBTENVTEFUSU9OID0gdHJ1ZTtcclxuRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UX0lOQ1JFTUVOVEFMID0gMTAwLjA7XHJcbkZETGF5b3V0Q29uc3RhbnRzLk1BWF9OT0RFX0RJU1BMQUNFTUVOVCA9IEZETGF5b3V0Q29uc3RhbnRzLk1BWF9OT0RFX0RJU1BMQUNFTUVOVF9JTkNSRU1FTlRBTCAqIDM7XHJcbkZETGF5b3V0Q29uc3RhbnRzLk1JTl9SRVBVTFNJT05fRElTVCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggLyAxMC4wO1xyXG5GRExheW91dENvbnN0YW50cy5DT05WRVJHRU5DRV9DSEVDS19QRVJJT0QgPSAxMDA7XHJcbkZETGF5b3V0Q29uc3RhbnRzLlBFUl9MRVZFTF9JREVBTF9FREdFX0xFTkdUSF9GQUNUT1IgPSAwLjE7XHJcbkZETGF5b3V0Q29uc3RhbnRzLk1JTl9FREdFX0xFTkdUSCA9IDE7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkdSSURfQ0FMQ1VMQVRJT05fQ0hFQ0tfUEVSSU9EID0gMTA7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZETGF5b3V0Q29uc3RhbnRzO1xyXG4iLCJ2YXIgTEVkZ2UgPSByZXF1aXJlKCcuL0xFZGdlJyk7XHJcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcclxuXHJcbmZ1bmN0aW9uIEZETGF5b3V0RWRnZShzb3VyY2UsIHRhcmdldCwgdkVkZ2UpIHtcclxuICBMRWRnZS5jYWxsKHRoaXMsIHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSk7XHJcbiAgdGhpcy5pZGVhbExlbmd0aCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEg7XHJcbn1cclxuXHJcbkZETGF5b3V0RWRnZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExFZGdlLnByb3RvdHlwZSk7XHJcblxyXG5mb3IgKHZhciBwcm9wIGluIExFZGdlKSB7XHJcbiAgRkRMYXlvdXRFZGdlW3Byb3BdID0gTEVkZ2VbcHJvcF07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRkRMYXlvdXRFZGdlO1xyXG4iLCJ2YXIgTE5vZGUgPSByZXF1aXJlKCcuL0xOb2RlJyk7XHJcblxyXG5mdW5jdGlvbiBGRExheW91dE5vZGUoZ20sIGxvYywgc2l6ZSwgdk5vZGUpIHtcclxuICAvLyBhbHRlcm5hdGl2ZSBjb25zdHJ1Y3RvciBpcyBoYW5kbGVkIGluc2lkZSBMTm9kZVxyXG4gIExOb2RlLmNhbGwodGhpcywgZ20sIGxvYywgc2l6ZSwgdk5vZGUpO1xyXG4gIC8vU3ByaW5nLCByZXB1bHNpb24gYW5kIGdyYXZpdGF0aW9uYWwgZm9yY2VzIGFjdGluZyBvbiB0aGlzIG5vZGVcclxuICB0aGlzLnNwcmluZ0ZvcmNlWCA9IDA7XHJcbiAgdGhpcy5zcHJpbmdGb3JjZVkgPSAwO1xyXG4gIHRoaXMucmVwdWxzaW9uRm9yY2VYID0gMDtcclxuICB0aGlzLnJlcHVsc2lvbkZvcmNlWSA9IDA7XHJcbiAgdGhpcy5ncmF2aXRhdGlvbkZvcmNlWCA9IDA7XHJcbiAgdGhpcy5ncmF2aXRhdGlvbkZvcmNlWSA9IDA7XHJcbiAgLy9BbW91bnQgYnkgd2hpY2ggdGhpcyBub2RlIGlzIHRvIGJlIG1vdmVkIGluIHRoaXMgaXRlcmF0aW9uXHJcbiAgdGhpcy5kaXNwbGFjZW1lbnRYID0gMDtcclxuICB0aGlzLmRpc3BsYWNlbWVudFkgPSAwO1xyXG5cclxuICAvL1N0YXJ0IGFuZCBmaW5pc2ggZ3JpZCBjb29yZGluYXRlcyB0aGF0IHRoaXMgbm9kZSBpcyBmYWxsZW4gaW50b1xyXG4gIHRoaXMuc3RhcnRYID0gMDtcclxuICB0aGlzLmZpbmlzaFggPSAwO1xyXG4gIHRoaXMuc3RhcnRZID0gMDtcclxuICB0aGlzLmZpbmlzaFkgPSAwO1xyXG5cclxuICAvL0dlb21ldHJpYyBuZWlnaGJvcnMgb2YgdGhpcyBub2RlXHJcbiAgdGhpcy5zdXJyb3VuZGluZyA9IFtdO1xyXG59XHJcblxyXG5GRExheW91dE5vZGUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMTm9kZS5wcm90b3R5cGUpO1xyXG5cclxuZm9yICh2YXIgcHJvcCBpbiBMTm9kZSkge1xyXG4gIEZETGF5b3V0Tm9kZVtwcm9wXSA9IExOb2RlW3Byb3BdO1xyXG59XHJcblxyXG5GRExheW91dE5vZGUucHJvdG90eXBlLnNldEdyaWRDb29yZGluYXRlcyA9IGZ1bmN0aW9uIChfc3RhcnRYLCBfZmluaXNoWCwgX3N0YXJ0WSwgX2ZpbmlzaFkpXHJcbntcclxuICB0aGlzLnN0YXJ0WCA9IF9zdGFydFg7XHJcbiAgdGhpcy5maW5pc2hYID0gX2ZpbmlzaFg7XHJcbiAgdGhpcy5zdGFydFkgPSBfc3RhcnRZO1xyXG4gIHRoaXMuZmluaXNoWSA9IF9maW5pc2hZO1xyXG5cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRkRMYXlvdXROb2RlO1xyXG4iLCJ2YXIgVW5pcXVlSURHZW5lcmV0b3IgPSByZXF1aXJlKCcuL1VuaXF1ZUlER2VuZXJldG9yJyk7XHJcblxyXG5mdW5jdGlvbiBIYXNoTWFwKCkge1xyXG4gIHRoaXMubWFwID0ge307XHJcbiAgdGhpcy5rZXlzID0gW107XHJcbn1cclxuXHJcbkhhc2hNYXAucHJvdG90eXBlLnB1dCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XHJcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQoa2V5KTtcclxuICBpZiAoIXRoaXMuY29udGFpbnModGhlSWQpKSB7XHJcbiAgICB0aGlzLm1hcFt0aGVJZF0gPSB2YWx1ZTtcclxuICAgIHRoaXMua2V5cy5wdXNoKGtleSk7XHJcbiAgfVxyXG59O1xyXG5cclxuSGFzaE1hcC5wcm90b3R5cGUuY29udGFpbnMgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQoa2V5KTtcclxuICByZXR1cm4gdGhpcy5tYXBba2V5XSAhPSBudWxsO1xyXG59O1xyXG5cclxuSGFzaE1hcC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xyXG4gIHZhciB0aGVJZCA9IFVuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEKGtleSk7XHJcbiAgcmV0dXJuIHRoaXMubWFwW3RoZUlkXTtcclxufTtcclxuXHJcbkhhc2hNYXAucHJvdG90eXBlLmtleVNldCA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5rZXlzO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBIYXNoTWFwO1xyXG4iLCJ2YXIgVW5pcXVlSURHZW5lcmV0b3IgPSByZXF1aXJlKCcuL1VuaXF1ZUlER2VuZXJldG9yJyk7XHJcblxyXG5mdW5jdGlvbiBIYXNoU2V0KCkge1xyXG4gIHRoaXMuc2V0ID0ge307XHJcbn1cclxuO1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIHZhciB0aGVJZCA9IFVuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEKG9iaik7XHJcbiAgaWYgKCF0aGlzLmNvbnRhaW5zKHRoZUlkKSlcclxuICAgIHRoaXMuc2V0W3RoZUlkXSA9IG9iajtcclxufTtcclxuXHJcbkhhc2hTZXQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChvYmopIHtcclxuICBkZWxldGUgdGhpcy5zZXRbVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQob2JqKV07XHJcbn07XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLnNldCA9IHt9O1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUuY29udGFpbnMgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgcmV0dXJuIHRoaXMuc2V0W1VuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEKG9iaildID09IG9iajtcclxufTtcclxuXHJcbkhhc2hTZXQucHJvdG90eXBlLmlzRW1wdHkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuc2l6ZSgpID09PSAwO1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5zZXQpLmxlbmd0aDtcclxufTtcclxuXHJcbi8vY29uY2F0cyB0aGlzLnNldCB0byB0aGUgZ2l2ZW4gbGlzdFxyXG5IYXNoU2V0LnByb3RvdHlwZS5hZGRBbGxUbyA9IGZ1bmN0aW9uIChsaXN0KSB7XHJcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnNldCk7XHJcbiAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgIGxpc3QucHVzaCh0aGlzLnNldFtrZXlzW2ldXSk7XHJcbiAgfVxyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5zZXQpLmxlbmd0aDtcclxufTtcclxuXHJcbkhhc2hTZXQucHJvdG90eXBlLmFkZEFsbCA9IGZ1bmN0aW9uIChsaXN0KSB7XHJcbiAgdmFyIHMgPSBsaXN0Lmxlbmd0aDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKykge1xyXG4gICAgdmFyIHYgPSBsaXN0W2ldO1xyXG4gICAgdGhpcy5hZGQodik7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBIYXNoU2V0O1xyXG4iLCJmdW5jdGlvbiBJR2VvbWV0cnkoKSB7XHJcbn1cclxuXHJcbklHZW9tZXRyeS5jYWxjU2VwYXJhdGlvbkFtb3VudCA9IGZ1bmN0aW9uIChyZWN0QSwgcmVjdEIsIG92ZXJsYXBBbW91bnQsIHNlcGFyYXRpb25CdWZmZXIpXHJcbntcclxuICBpZiAoIXJlY3RBLmludGVyc2VjdHMocmVjdEIpKSB7XHJcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICB9XHJcbiAgdmFyIGRpcmVjdGlvbnMgPSBuZXcgQXJyYXkoMik7XHJcbiAgSUdlb21ldHJ5LmRlY2lkZURpcmVjdGlvbnNGb3JPdmVybGFwcGluZ05vZGVzKHJlY3RBLCByZWN0QiwgZGlyZWN0aW9ucyk7XHJcbiAgb3ZlcmxhcEFtb3VudFswXSA9IE1hdGgubWluKHJlY3RBLmdldFJpZ2h0KCksIHJlY3RCLmdldFJpZ2h0KCkpIC1cclxuICAgICAgICAgIE1hdGgubWF4KHJlY3RBLngsIHJlY3RCLngpO1xyXG4gIG92ZXJsYXBBbW91bnRbMV0gPSBNYXRoLm1pbihyZWN0QS5nZXRCb3R0b20oKSwgcmVjdEIuZ2V0Qm90dG9tKCkpIC1cclxuICAgICAgICAgIE1hdGgubWF4KHJlY3RBLnksIHJlY3RCLnkpO1xyXG4gIC8vIHVwZGF0ZSB0aGUgb3ZlcmxhcHBpbmcgYW1vdW50cyBmb3IgdGhlIGZvbGxvd2luZyBjYXNlczpcclxuICBpZiAoKHJlY3RBLmdldFgoKSA8PSByZWN0Qi5nZXRYKCkpICYmIChyZWN0QS5nZXRSaWdodCgpID49IHJlY3RCLmdldFJpZ2h0KCkpKVxyXG4gIHtcclxuICAgIG92ZXJsYXBBbW91bnRbMF0gKz0gTWF0aC5taW4oKHJlY3RCLmdldFgoKSAtIHJlY3RBLmdldFgoKSksXHJcbiAgICAgICAgICAgIChyZWN0QS5nZXRSaWdodCgpIC0gcmVjdEIuZ2V0UmlnaHQoKSkpO1xyXG4gIH1cclxuICBlbHNlIGlmICgocmVjdEIuZ2V0WCgpIDw9IHJlY3RBLmdldFgoKSkgJiYgKHJlY3RCLmdldFJpZ2h0KCkgPj0gcmVjdEEuZ2V0UmlnaHQoKSkpXHJcbiAge1xyXG4gICAgb3ZlcmxhcEFtb3VudFswXSArPSBNYXRoLm1pbigocmVjdEEuZ2V0WCgpIC0gcmVjdEIuZ2V0WCgpKSxcclxuICAgICAgICAgICAgKHJlY3RCLmdldFJpZ2h0KCkgLSByZWN0QS5nZXRSaWdodCgpKSk7XHJcbiAgfVxyXG4gIGlmICgocmVjdEEuZ2V0WSgpIDw9IHJlY3RCLmdldFkoKSkgJiYgKHJlY3RBLmdldEJvdHRvbSgpID49IHJlY3RCLmdldEJvdHRvbSgpKSlcclxuICB7XHJcbiAgICBvdmVybGFwQW1vdW50WzFdICs9IE1hdGgubWluKChyZWN0Qi5nZXRZKCkgLSByZWN0QS5nZXRZKCkpLFxyXG4gICAgICAgICAgICAocmVjdEEuZ2V0Qm90dG9tKCkgLSByZWN0Qi5nZXRCb3R0b20oKSkpO1xyXG4gIH1cclxuICBlbHNlIGlmICgocmVjdEIuZ2V0WSgpIDw9IHJlY3RBLmdldFkoKSkgJiYgKHJlY3RCLmdldEJvdHRvbSgpID49IHJlY3RBLmdldEJvdHRvbSgpKSlcclxuICB7XHJcbiAgICBvdmVybGFwQW1vdW50WzFdICs9IE1hdGgubWluKChyZWN0QS5nZXRZKCkgLSByZWN0Qi5nZXRZKCkpLFxyXG4gICAgICAgICAgICAocmVjdEIuZ2V0Qm90dG9tKCkgLSByZWN0QS5nZXRCb3R0b20oKSkpO1xyXG4gIH1cclxuXHJcbiAgLy8gZmluZCBzbG9wZSBvZiB0aGUgbGluZSBwYXNzZXMgdHdvIGNlbnRlcnNcclxuICB2YXIgc2xvcGUgPSBNYXRoLmFicygocmVjdEIuZ2V0Q2VudGVyWSgpIC0gcmVjdEEuZ2V0Q2VudGVyWSgpKSAvXHJcbiAgICAgICAgICAocmVjdEIuZ2V0Q2VudGVyWCgpIC0gcmVjdEEuZ2V0Q2VudGVyWCgpKSk7XHJcbiAgLy8gaWYgY2VudGVycyBhcmUgb3ZlcmxhcHBlZFxyXG4gIGlmICgocmVjdEIuZ2V0Q2VudGVyWSgpID09IHJlY3RBLmdldENlbnRlclkoKSkgJiZcclxuICAgICAgICAgIChyZWN0Qi5nZXRDZW50ZXJYKCkgPT0gcmVjdEEuZ2V0Q2VudGVyWCgpKSlcclxuICB7XHJcbiAgICAvLyBhc3N1bWUgdGhlIHNsb3BlIGlzIDEgKDQ1IGRlZ3JlZSlcclxuICAgIHNsb3BlID0gMS4wO1xyXG4gIH1cclxuXHJcbiAgdmFyIG1vdmVCeVkgPSBzbG9wZSAqIG92ZXJsYXBBbW91bnRbMF07XHJcbiAgdmFyIG1vdmVCeVggPSBvdmVybGFwQW1vdW50WzFdIC8gc2xvcGU7XHJcbiAgaWYgKG92ZXJsYXBBbW91bnRbMF0gPCBtb3ZlQnlYKVxyXG4gIHtcclxuICAgIG1vdmVCeVggPSBvdmVybGFwQW1vdW50WzBdO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgbW92ZUJ5WSA9IG92ZXJsYXBBbW91bnRbMV07XHJcbiAgfVxyXG4gIC8vIHJldHVybiBoYWxmIHRoZSBhbW91bnQgc28gdGhhdCBpZiBlYWNoIHJlY3RhbmdsZSBpcyBtb3ZlZCBieSB0aGVzZVxyXG4gIC8vIGFtb3VudHMgaW4gb3Bwb3NpdGUgZGlyZWN0aW9ucywgb3ZlcmxhcCB3aWxsIGJlIHJlc29sdmVkXHJcbiAgb3ZlcmxhcEFtb3VudFswXSA9IC0xICogZGlyZWN0aW9uc1swXSAqICgobW92ZUJ5WCAvIDIpICsgc2VwYXJhdGlvbkJ1ZmZlcik7XHJcbiAgb3ZlcmxhcEFtb3VudFsxXSA9IC0xICogZGlyZWN0aW9uc1sxXSAqICgobW92ZUJ5WSAvIDIpICsgc2VwYXJhdGlvbkJ1ZmZlcik7XHJcbn1cclxuXHJcbklHZW9tZXRyeS5kZWNpZGVEaXJlY3Rpb25zRm9yT3ZlcmxhcHBpbmdOb2RlcyA9IGZ1bmN0aW9uIChyZWN0QSwgcmVjdEIsIGRpcmVjdGlvbnMpXHJcbntcclxuICBpZiAocmVjdEEuZ2V0Q2VudGVyWCgpIDwgcmVjdEIuZ2V0Q2VudGVyWCgpKVxyXG4gIHtcclxuICAgIGRpcmVjdGlvbnNbMF0gPSAtMTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIGRpcmVjdGlvbnNbMF0gPSAxO1xyXG4gIH1cclxuXHJcbiAgaWYgKHJlY3RBLmdldENlbnRlclkoKSA8IHJlY3RCLmdldENlbnRlclkoKSlcclxuICB7XHJcbiAgICBkaXJlY3Rpb25zWzFdID0gLTE7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICBkaXJlY3Rpb25zWzFdID0gMTtcclxuICB9XHJcbn1cclxuXHJcbklHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24yID0gZnVuY3Rpb24gKHJlY3RBLCByZWN0QiwgcmVzdWx0KVxyXG57XHJcbiAgLy9yZXN1bHRbMC0xXSB3aWxsIGNvbnRhaW4gY2xpcFBvaW50IG9mIHJlY3RBLCByZXN1bHRbMi0zXSB3aWxsIGNvbnRhaW4gY2xpcFBvaW50IG9mIHJlY3RCXHJcbiAgdmFyIHAxeCA9IHJlY3RBLmdldENlbnRlclgoKTtcclxuICB2YXIgcDF5ID0gcmVjdEEuZ2V0Q2VudGVyWSgpO1xyXG4gIHZhciBwMnggPSByZWN0Qi5nZXRDZW50ZXJYKCk7XHJcbiAgdmFyIHAyeSA9IHJlY3RCLmdldENlbnRlclkoKTtcclxuXHJcbiAgLy9pZiB0d28gcmVjdGFuZ2xlcyBpbnRlcnNlY3QsIHRoZW4gY2xpcHBpbmcgcG9pbnRzIGFyZSBjZW50ZXJzXHJcbiAgaWYgKHJlY3RBLmludGVyc2VjdHMocmVjdEIpKVxyXG4gIHtcclxuICAgIHJlc3VsdFswXSA9IHAxeDtcclxuICAgIHJlc3VsdFsxXSA9IHAxeTtcclxuICAgIHJlc3VsdFsyXSA9IHAyeDtcclxuICAgIHJlc3VsdFszXSA9IHAyeTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICAvL3ZhcmlhYmxlcyBmb3IgcmVjdEFcclxuICB2YXIgdG9wTGVmdEF4ID0gcmVjdEEuZ2V0WCgpO1xyXG4gIHZhciB0b3BMZWZ0QXkgPSByZWN0QS5nZXRZKCk7XHJcbiAgdmFyIHRvcFJpZ2h0QXggPSByZWN0QS5nZXRSaWdodCgpO1xyXG4gIHZhciBib3R0b21MZWZ0QXggPSByZWN0QS5nZXRYKCk7XHJcbiAgdmFyIGJvdHRvbUxlZnRBeSA9IHJlY3RBLmdldEJvdHRvbSgpO1xyXG4gIHZhciBib3R0b21SaWdodEF4ID0gcmVjdEEuZ2V0UmlnaHQoKTtcclxuICB2YXIgaGFsZldpZHRoQSA9IHJlY3RBLmdldFdpZHRoSGFsZigpO1xyXG4gIHZhciBoYWxmSGVpZ2h0QSA9IHJlY3RBLmdldEhlaWdodEhhbGYoKTtcclxuICAvL3ZhcmlhYmxlcyBmb3IgcmVjdEJcclxuICB2YXIgdG9wTGVmdEJ4ID0gcmVjdEIuZ2V0WCgpO1xyXG4gIHZhciB0b3BMZWZ0QnkgPSByZWN0Qi5nZXRZKCk7XHJcbiAgdmFyIHRvcFJpZ2h0QnggPSByZWN0Qi5nZXRSaWdodCgpO1xyXG4gIHZhciBib3R0b21MZWZ0QnggPSByZWN0Qi5nZXRYKCk7XHJcbiAgdmFyIGJvdHRvbUxlZnRCeSA9IHJlY3RCLmdldEJvdHRvbSgpO1xyXG4gIHZhciBib3R0b21SaWdodEJ4ID0gcmVjdEIuZ2V0UmlnaHQoKTtcclxuICB2YXIgaGFsZldpZHRoQiA9IHJlY3RCLmdldFdpZHRoSGFsZigpO1xyXG4gIHZhciBoYWxmSGVpZ2h0QiA9IHJlY3RCLmdldEhlaWdodEhhbGYoKTtcclxuICAvL2ZsYWcgd2hldGhlciBjbGlwcGluZyBwb2ludHMgYXJlIGZvdW5kXHJcbiAgdmFyIGNsaXBQb2ludEFGb3VuZCA9IGZhbHNlO1xyXG4gIHZhciBjbGlwUG9pbnRCRm91bmQgPSBmYWxzZTtcclxuXHJcbiAgLy8gbGluZSBpcyB2ZXJ0aWNhbFxyXG4gIGlmIChwMXggPT0gcDJ4KVxyXG4gIHtcclxuICAgIGlmIChwMXkgPiBwMnkpXHJcbiAgICB7XHJcbiAgICAgIHJlc3VsdFswXSA9IHAxeDtcclxuICAgICAgcmVzdWx0WzFdID0gdG9wTGVmdEF5O1xyXG4gICAgICByZXN1bHRbMl0gPSBwMng7XHJcbiAgICAgIHJlc3VsdFszXSA9IGJvdHRvbUxlZnRCeTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAocDF5IDwgcDJ5KVxyXG4gICAge1xyXG4gICAgICByZXN1bHRbMF0gPSBwMXg7XHJcbiAgICAgIHJlc3VsdFsxXSA9IGJvdHRvbUxlZnRBeTtcclxuICAgICAgcmVzdWx0WzJdID0gcDJ4O1xyXG4gICAgICByZXN1bHRbM10gPSB0b3BMZWZ0Qnk7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgLy9ub3QgbGluZSwgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIGxpbmUgaXMgaG9yaXpvbnRhbFxyXG4gIGVsc2UgaWYgKHAxeSA9PSBwMnkpXHJcbiAge1xyXG4gICAgaWYgKHAxeCA+IHAyeClcclxuICAgIHtcclxuICAgICAgcmVzdWx0WzBdID0gdG9wTGVmdEF4O1xyXG4gICAgICByZXN1bHRbMV0gPSBwMXk7XHJcbiAgICAgIHJlc3VsdFsyXSA9IHRvcFJpZ2h0Qng7XHJcbiAgICAgIHJlc3VsdFszXSA9IHAyeTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAocDF4IDwgcDJ4KVxyXG4gICAge1xyXG4gICAgICByZXN1bHRbMF0gPSB0b3BSaWdodEF4O1xyXG4gICAgICByZXN1bHRbMV0gPSBwMXk7XHJcbiAgICAgIHJlc3VsdFsyXSA9IHRvcExlZnRCeDtcclxuICAgICAgcmVzdWx0WzNdID0gcDJ5O1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIC8vbm90IHZhbGlkIGxpbmUsIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgLy9zbG9wZXMgb2YgcmVjdEEncyBhbmQgcmVjdEIncyBkaWFnb25hbHNcclxuICAgIHZhciBzbG9wZUEgPSByZWN0QS5oZWlnaHQgLyByZWN0QS53aWR0aDtcclxuICAgIHZhciBzbG9wZUIgPSByZWN0Qi5oZWlnaHQgLyByZWN0Qi53aWR0aDtcclxuXHJcbiAgICAvL3Nsb3BlIG9mIGxpbmUgYmV0d2VlbiBjZW50ZXIgb2YgcmVjdEEgYW5kIGNlbnRlciBvZiByZWN0QlxyXG4gICAgdmFyIHNsb3BlUHJpbWUgPSAocDJ5IC0gcDF5KSAvIChwMnggLSBwMXgpO1xyXG4gICAgdmFyIGNhcmRpbmFsRGlyZWN0aW9uQTtcclxuICAgIHZhciBjYXJkaW5hbERpcmVjdGlvbkI7XHJcbiAgICB2YXIgdGVtcFBvaW50QXg7XHJcbiAgICB2YXIgdGVtcFBvaW50QXk7XHJcbiAgICB2YXIgdGVtcFBvaW50Qng7XHJcbiAgICB2YXIgdGVtcFBvaW50Qnk7XHJcblxyXG4gICAgLy9kZXRlcm1pbmUgd2hldGhlciBjbGlwcGluZyBwb2ludCBpcyB0aGUgY29ybmVyIG9mIG5vZGVBXHJcbiAgICBpZiAoKC1zbG9wZUEpID09IHNsb3BlUHJpbWUpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMXggPiBwMngpXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMF0gPSBib3R0b21MZWZ0QXg7XHJcbiAgICAgICAgcmVzdWx0WzFdID0gYm90dG9tTGVmdEF5O1xyXG4gICAgICAgIGNsaXBQb2ludEFGb3VuZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgcmVzdWx0WzBdID0gdG9wUmlnaHRBeDtcclxuICAgICAgICByZXN1bHRbMV0gPSB0b3BMZWZ0QXk7XHJcbiAgICAgICAgY2xpcFBvaW50QUZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoc2xvcGVBID09IHNsb3BlUHJpbWUpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMXggPiBwMngpXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMF0gPSB0b3BMZWZ0QXg7XHJcbiAgICAgICAgcmVzdWx0WzFdID0gdG9wTGVmdEF5O1xyXG4gICAgICAgIGNsaXBQb2ludEFGb3VuZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgcmVzdWx0WzBdID0gYm90dG9tUmlnaHRBeDtcclxuICAgICAgICByZXN1bHRbMV0gPSBib3R0b21MZWZ0QXk7XHJcbiAgICAgICAgY2xpcFBvaW50QUZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vZGV0ZXJtaW5lIHdoZXRoZXIgY2xpcHBpbmcgcG9pbnQgaXMgdGhlIGNvcm5lciBvZiBub2RlQlxyXG4gICAgaWYgKCgtc2xvcGVCKSA9PSBzbG9wZVByaW1lKVxyXG4gICAge1xyXG4gICAgICBpZiAocDJ4ID4gcDF4KVxyXG4gICAgICB7XHJcbiAgICAgICAgcmVzdWx0WzJdID0gYm90dG9tTGVmdEJ4O1xyXG4gICAgICAgIHJlc3VsdFszXSA9IGJvdHRvbUxlZnRCeTtcclxuICAgICAgICBjbGlwUG9pbnRCRm91bmQgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2VcclxuICAgICAge1xyXG4gICAgICAgIHJlc3VsdFsyXSA9IHRvcFJpZ2h0Qng7XHJcbiAgICAgICAgcmVzdWx0WzNdID0gdG9wTGVmdEJ5O1xyXG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHNsb3BlQiA9PSBzbG9wZVByaW1lKVxyXG4gICAge1xyXG4gICAgICBpZiAocDJ4ID4gcDF4KVxyXG4gICAgICB7XHJcbiAgICAgICAgcmVzdWx0WzJdID0gdG9wTGVmdEJ4O1xyXG4gICAgICAgIHJlc3VsdFszXSA9IHRvcExlZnRCeTtcclxuICAgICAgICBjbGlwUG9pbnRCRm91bmQgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2VcclxuICAgICAge1xyXG4gICAgICAgIHJlc3VsdFsyXSA9IGJvdHRvbVJpZ2h0Qng7XHJcbiAgICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xyXG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvL2lmIGJvdGggY2xpcHBpbmcgcG9pbnRzIGFyZSBjb3JuZXJzXHJcbiAgICBpZiAoY2xpcFBvaW50QUZvdW5kICYmIGNsaXBQb2ludEJGb3VuZClcclxuICAgIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vZGV0ZXJtaW5lIENhcmRpbmFsIERpcmVjdGlvbiBvZiByZWN0YW5nbGVzXHJcbiAgICBpZiAocDF4ID4gcDJ4KVxyXG4gICAge1xyXG4gICAgICBpZiAocDF5ID4gcDJ5KVxyXG4gICAgICB7XHJcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25BID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKHNsb3BlQSwgc2xvcGVQcmltZSwgNCk7XHJcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKHNsb3BlQiwgc2xvcGVQcmltZSwgMik7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25BID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKC1zbG9wZUEsIHNsb3BlUHJpbWUsIDMpO1xyXG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQiA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbigtc2xvcGVCLCBzbG9wZVByaW1lLCAxKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICBpZiAocDF5ID4gcDJ5KVxyXG4gICAgICB7XHJcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25BID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKC1zbG9wZUEsIHNsb3BlUHJpbWUsIDEpO1xyXG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQiA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbigtc2xvcGVCLCBzbG9wZVByaW1lLCAzKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oc2xvcGVBLCBzbG9wZVByaW1lLCAyKTtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkIgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oc2xvcGVCLCBzbG9wZVByaW1lLCA0KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy9jYWxjdWxhdGUgY2xpcHBpbmcgUG9pbnQgaWYgaXQgaXMgbm90IGZvdW5kIGJlZm9yZVxyXG4gICAgaWYgKCFjbGlwUG9pbnRBRm91bmQpXHJcbiAgICB7XHJcbiAgICAgIHN3aXRjaCAoY2FyZGluYWxEaXJlY3Rpb25BKVxyXG4gICAgICB7XHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgdGVtcFBvaW50QXkgPSB0b3BMZWZ0QXk7XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeCA9IHAxeCArICgtaGFsZkhlaWdodEEpIC8gc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFswXSA9IHRlbXBQb2ludEF4O1xyXG4gICAgICAgICAgcmVzdWx0WzFdID0gdGVtcFBvaW50QXk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeCA9IGJvdHRvbVJpZ2h0QXg7XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeSA9IHAxeSArIGhhbGZXaWR0aEEgKiBzbG9wZVByaW1lO1xyXG4gICAgICAgICAgcmVzdWx0WzBdID0gdGVtcFBvaW50QXg7XHJcbiAgICAgICAgICByZXN1bHRbMV0gPSB0ZW1wUG9pbnRBeTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgIHRlbXBQb2ludEF5ID0gYm90dG9tTGVmdEF5O1xyXG4gICAgICAgICAgdGVtcFBvaW50QXggPSBwMXggKyBoYWxmSGVpZ2h0QSAvIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMF0gPSB0ZW1wUG9pbnRBeDtcclxuICAgICAgICAgIHJlc3VsdFsxXSA9IHRlbXBQb2ludEF5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgdGVtcFBvaW50QXggPSBib3R0b21MZWZ0QXg7XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeSA9IHAxeSArICgtaGFsZldpZHRoQSkgKiBzbG9wZVByaW1lO1xyXG4gICAgICAgICAgcmVzdWx0WzBdID0gdGVtcFBvaW50QXg7XHJcbiAgICAgICAgICByZXN1bHRbMV0gPSB0ZW1wUG9pbnRBeTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoIWNsaXBQb2ludEJGb3VuZClcclxuICAgIHtcclxuICAgICAgc3dpdGNoIChjYXJkaW5hbERpcmVjdGlvbkIpXHJcbiAgICAgIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRCeSA9IHRvcExlZnRCeTtcclxuICAgICAgICAgIHRlbXBQb2ludEJ4ID0gcDJ4ICsgKC1oYWxmSGVpZ2h0QikgLyBzbG9wZVByaW1lO1xyXG4gICAgICAgICAgcmVzdWx0WzJdID0gdGVtcFBvaW50Qng7XHJcbiAgICAgICAgICByZXN1bHRbM10gPSB0ZW1wUG9pbnRCeTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgIHRlbXBQb2ludEJ4ID0gYm90dG9tUmlnaHRCeDtcclxuICAgICAgICAgIHRlbXBQb2ludEJ5ID0gcDJ5ICsgaGFsZldpZHRoQiAqIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMl0gPSB0ZW1wUG9pbnRCeDtcclxuICAgICAgICAgIHJlc3VsdFszXSA9IHRlbXBQb2ludEJ5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBib3R0b21MZWZ0Qnk7XHJcbiAgICAgICAgICB0ZW1wUG9pbnRCeCA9IHAyeCArIGhhbGZIZWlnaHRCIC8gc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFsyXSA9IHRlbXBQb2ludEJ4O1xyXG4gICAgICAgICAgcmVzdWx0WzNdID0gdGVtcFBvaW50Qnk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRCeCA9IGJvdHRvbUxlZnRCeDtcclxuICAgICAgICAgIHRlbXBQb2ludEJ5ID0gcDJ5ICsgKC1oYWxmV2lkdGhCKSAqIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMl0gPSB0ZW1wUG9pbnRCeDtcclxuICAgICAgICAgIHJlc3VsdFszXSA9IHRlbXBQb2ludEJ5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5JR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24gPSBmdW5jdGlvbiAoc2xvcGUsIHNsb3BlUHJpbWUsIGxpbmUpXHJcbntcclxuICBpZiAoc2xvcGUgPiBzbG9wZVByaW1lKVxyXG4gIHtcclxuICAgIHJldHVybiBsaW5lO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgcmV0dXJuIDEgKyBsaW5lICUgNDtcclxuICB9XHJcbn1cclxuXHJcbklHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24gPSBmdW5jdGlvbiAoczEsIHMyLCBmMSwgZjIpXHJcbntcclxuICBpZiAoZjIgPT0gbnVsbCkge1xyXG4gICAgcmV0dXJuIElHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24yKHMxLCBzMiwgZjEpO1xyXG4gIH1cclxuICB2YXIgeDEgPSBzMS54O1xyXG4gIHZhciB5MSA9IHMxLnk7XHJcbiAgdmFyIHgyID0gczIueDtcclxuICB2YXIgeTIgPSBzMi55O1xyXG4gIHZhciB4MyA9IGYxLng7XHJcbiAgdmFyIHkzID0gZjEueTtcclxuICB2YXIgeDQgPSBmMi54O1xyXG4gIHZhciB5NCA9IGYyLnk7XHJcbiAgdmFyIHgsIHk7IC8vIGludGVyc2VjdGlvbiBwb2ludFxyXG4gIHZhciBhMSwgYTIsIGIxLCBiMiwgYzEsIGMyOyAvLyBjb2VmZmljaWVudHMgb2YgbGluZSBlcW5zLlxyXG4gIHZhciBkZW5vbTtcclxuXHJcbiAgYTEgPSB5MiAtIHkxO1xyXG4gIGIxID0geDEgLSB4MjtcclxuICBjMSA9IHgyICogeTEgLSB4MSAqIHkyOyAgLy8geyBhMSp4ICsgYjEqeSArIGMxID0gMCBpcyBsaW5lIDEgfVxyXG5cclxuICBhMiA9IHk0IC0geTM7XHJcbiAgYjIgPSB4MyAtIHg0O1xyXG4gIGMyID0geDQgKiB5MyAtIHgzICogeTQ7ICAvLyB7IGEyKnggKyBiMip5ICsgYzIgPSAwIGlzIGxpbmUgMiB9XHJcblxyXG4gIGRlbm9tID0gYTEgKiBiMiAtIGEyICogYjE7XHJcblxyXG4gIGlmIChkZW5vbSA9PSAwKVxyXG4gIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgeCA9IChiMSAqIGMyIC0gYjIgKiBjMSkgLyBkZW5vbTtcclxuICB5ID0gKGEyICogYzEgLSBhMSAqIGMyKSAvIGRlbm9tO1xyXG5cclxuICByZXR1cm4gbmV3IFBvaW50KHgsIHkpO1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBTZWN0aW9uOiBDbGFzcyBDb25zdGFudHNcclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLyoqXHJcbiAqIFNvbWUgdXNlZnVsIHByZS1jYWxjdWxhdGVkIGNvbnN0YW50c1xyXG4gKi9cclxuSUdlb21ldHJ5LkhBTEZfUEkgPSAwLjUgKiBNYXRoLlBJO1xyXG5JR2VvbWV0cnkuT05FX0FORF9IQUxGX1BJID0gMS41ICogTWF0aC5QSTtcclxuSUdlb21ldHJ5LlRXT19QSSA9IDIuMCAqIE1hdGguUEk7XHJcbklHZW9tZXRyeS5USFJFRV9QSSA9IDMuMCAqIE1hdGguUEk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IElHZW9tZXRyeTtcclxuIiwiZnVuY3Rpb24gSU1hdGgoKSB7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBzaWduIG9mIHRoZSBpbnB1dCB2YWx1ZS5cclxuICovXHJcbklNYXRoLnNpZ24gPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICBpZiAodmFsdWUgPiAwKVxyXG4gIHtcclxuICAgIHJldHVybiAxO1xyXG4gIH1cclxuICBlbHNlIGlmICh2YWx1ZSA8IDApXHJcbiAge1xyXG4gICAgcmV0dXJuIC0xO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgcmV0dXJuIDA7XHJcbiAgfVxyXG59XHJcblxyXG5JTWF0aC5mbG9vciA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gIHJldHVybiB2YWx1ZSA8IDAgPyBNYXRoLmNlaWwodmFsdWUpIDogTWF0aC5mbG9vcih2YWx1ZSk7XHJcbn1cclxuXHJcbklNYXRoLmNlaWwgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICByZXR1cm4gdmFsdWUgPCAwID8gTWF0aC5mbG9vcih2YWx1ZSkgOiBNYXRoLmNlaWwodmFsdWUpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IElNYXRoO1xyXG4iLCJmdW5jdGlvbiBJbnRlZ2VyKCkge1xyXG59XHJcblxyXG5JbnRlZ2VyLk1BWF9WQUxVRSA9IDIxNDc0ODM2NDc7XHJcbkludGVnZXIuTUlOX1ZBTFVFID0gLTIxNDc0ODM2NDg7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEludGVnZXI7XHJcbiIsInZhciBMR3JhcGhPYmplY3QgPSByZXF1aXJlKCcuL0xHcmFwaE9iamVjdCcpO1xyXG52YXIgSUdlb21ldHJ5ID0gcmVxdWlyZSgnLi9JR2VvbWV0cnknKTtcclxudmFyIElNYXRoID0gcmVxdWlyZSgnLi9JTWF0aCcpO1xyXG5cclxuZnVuY3Rpb24gTEVkZ2Uoc291cmNlLCB0YXJnZXQsIHZFZGdlKSB7XHJcbiAgTEdyYXBoT2JqZWN0LmNhbGwodGhpcywgdkVkZ2UpO1xyXG5cclxuICB0aGlzLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldCA9IGZhbHNlO1xyXG4gIHRoaXMudkdyYXBoT2JqZWN0ID0gdkVkZ2U7XHJcbiAgdGhpcy5iZW5kcG9pbnRzID0gW107XHJcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XHJcbiAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XHJcbn1cclxuXHJcbkxFZGdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEdyYXBoT2JqZWN0LnByb3RvdHlwZSk7XHJcblxyXG5mb3IgKHZhciBwcm9wIGluIExHcmFwaE9iamVjdCkge1xyXG4gIExFZGdlW3Byb3BdID0gTEdyYXBoT2JqZWN0W3Byb3BdO1xyXG59XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0U291cmNlID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnNvdXJjZTtcclxufTtcclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRUYXJnZXQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMudGFyZ2V0O1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmlzSW50ZXJHcmFwaCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5pc0ludGVyR3JhcGg7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0TGVuZ3RoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmxlbmd0aDtcclxufTtcclxuXHJcbkxFZGdlLnByb3RvdHlwZS5pc092ZXJsYXBpbmdTb3VyY2VBbmRUYXJnZXQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0O1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmdldEJlbmRwb2ludHMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuYmVuZHBvaW50cztcclxufTtcclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRMY2EgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGNhO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmdldFNvdXJjZUluTGNhID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnNvdXJjZUluTGNhO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmdldFRhcmdldEluTGNhID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnRhcmdldEluTGNhO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmdldE90aGVyRW5kID0gZnVuY3Rpb24gKG5vZGUpXHJcbntcclxuICBpZiAodGhpcy5zb3VyY2UgPT09IG5vZGUpXHJcbiAge1xyXG4gICAgcmV0dXJuIHRoaXMudGFyZ2V0O1xyXG4gIH1cclxuICBlbHNlIGlmICh0aGlzLnRhcmdldCA9PT0gbm9kZSlcclxuICB7XHJcbiAgICByZXR1cm4gdGhpcy5zb3VyY2U7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICB0aHJvdyBcIk5vZGUgaXMgbm90IGluY2lkZW50IHdpdGggdGhpcyBlZGdlXCI7XHJcbiAgfVxyXG59XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0T3RoZXJFbmRJbkdyYXBoID0gZnVuY3Rpb24gKG5vZGUsIGdyYXBoKVxyXG57XHJcbiAgdmFyIG90aGVyRW5kID0gdGhpcy5nZXRPdGhlckVuZChub2RlKTtcclxuICB2YXIgcm9vdCA9IGdyYXBoLmdldEdyYXBoTWFuYWdlcigpLmdldFJvb3QoKTtcclxuXHJcbiAgd2hpbGUgKHRydWUpXHJcbiAge1xyXG4gICAgaWYgKG90aGVyRW5kLmdldE93bmVyKCkgPT0gZ3JhcGgpXHJcbiAgICB7XHJcbiAgICAgIHJldHVybiBvdGhlckVuZDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAob3RoZXJFbmQuZ2V0T3duZXIoKSA9PSByb290KVxyXG4gICAge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICBvdGhlckVuZCA9IG90aGVyRW5kLmdldE93bmVyKCkuZ2V0UGFyZW50KCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbnVsbDtcclxufTtcclxuXHJcbkxFZGdlLnByb3RvdHlwZS51cGRhdGVMZW5ndGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIGNsaXBQb2ludENvb3JkaW5hdGVzID0gbmV3IEFycmF5KDQpO1xyXG5cclxuICB0aGlzLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldCA9XHJcbiAgICAgICAgICBJR2VvbWV0cnkuZ2V0SW50ZXJzZWN0aW9uKHRoaXMudGFyZ2V0LmdldFJlY3QoKSxcclxuICAgICAgICAgICAgICAgICAgdGhpcy5zb3VyY2UuZ2V0UmVjdCgpLFxyXG4gICAgICAgICAgICAgICAgICBjbGlwUG9pbnRDb29yZGluYXRlcyk7XHJcblxyXG4gIGlmICghdGhpcy5pc092ZXJsYXBpbmdTb3VyY2VBbmRUYXJnZXQpXHJcbiAge1xyXG4gICAgdGhpcy5sZW5ndGhYID0gY2xpcFBvaW50Q29vcmRpbmF0ZXNbMF0gLSBjbGlwUG9pbnRDb29yZGluYXRlc1syXTtcclxuICAgIHRoaXMubGVuZ3RoWSA9IGNsaXBQb2ludENvb3JkaW5hdGVzWzFdIC0gY2xpcFBvaW50Q29vcmRpbmF0ZXNbM107XHJcblxyXG4gICAgaWYgKE1hdGguYWJzKHRoaXMubGVuZ3RoWCkgPCAxLjApXHJcbiAgICB7XHJcbiAgICAgIHRoaXMubGVuZ3RoWCA9IElNYXRoLnNpZ24odGhpcy5sZW5ndGhYKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhZKSA8IDEuMClcclxuICAgIHtcclxuICAgICAgdGhpcy5sZW5ndGhZID0gSU1hdGguc2lnbih0aGlzLmxlbmd0aFkpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubGVuZ3RoID0gTWF0aC5zcXJ0KFxyXG4gICAgICAgICAgICB0aGlzLmxlbmd0aFggKiB0aGlzLmxlbmd0aFggKyB0aGlzLmxlbmd0aFkgKiB0aGlzLmxlbmd0aFkpO1xyXG4gIH1cclxufTtcclxuXHJcbkxFZGdlLnByb3RvdHlwZS51cGRhdGVMZW5ndGhTaW1wbGUgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdGhpcy5sZW5ndGhYID0gdGhpcy50YXJnZXQuZ2V0Q2VudGVyWCgpIC0gdGhpcy5zb3VyY2UuZ2V0Q2VudGVyWCgpO1xyXG4gIHRoaXMubGVuZ3RoWSA9IHRoaXMudGFyZ2V0LmdldENlbnRlclkoKSAtIHRoaXMuc291cmNlLmdldENlbnRlclkoKTtcclxuXHJcbiAgaWYgKE1hdGguYWJzKHRoaXMubGVuZ3RoWCkgPCAxLjApXHJcbiAge1xyXG4gICAgdGhpcy5sZW5ndGhYID0gSU1hdGguc2lnbih0aGlzLmxlbmd0aFgpO1xyXG4gIH1cclxuXHJcbiAgaWYgKE1hdGguYWJzKHRoaXMubGVuZ3RoWSkgPCAxLjApXHJcbiAge1xyXG4gICAgdGhpcy5sZW5ndGhZID0gSU1hdGguc2lnbih0aGlzLmxlbmd0aFkpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5sZW5ndGggPSBNYXRoLnNxcnQoXHJcbiAgICAgICAgICB0aGlzLmxlbmd0aFggKiB0aGlzLmxlbmd0aFggKyB0aGlzLmxlbmd0aFkgKiB0aGlzLmxlbmd0aFkpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExFZGdlO1xyXG4iLCJ2YXIgTEdyYXBoT2JqZWN0ID0gcmVxdWlyZSgnLi9MR3JhcGhPYmplY3QnKTtcclxudmFyIEludGVnZXIgPSByZXF1aXJlKCcuL0ludGVnZXInKTtcclxudmFyIExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vTGF5b3V0Q29uc3RhbnRzJyk7XHJcbnZhciBMR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9MR3JhcGhNYW5hZ2VyJyk7XHJcbnZhciBMTm9kZSA9IHJlcXVpcmUoJy4vTE5vZGUnKTtcclxudmFyIEhhc2hTZXQgPSByZXF1aXJlKCcuL0hhc2hTZXQnKTtcclxudmFyIFJlY3RhbmdsZUQgPSByZXF1aXJlKCcuL1JlY3RhbmdsZUQnKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9Qb2ludCcpO1xyXG5cclxuZnVuY3Rpb24gTEdyYXBoKHBhcmVudCwgb2JqMiwgdkdyYXBoKSB7XHJcbiAgTEdyYXBoT2JqZWN0LmNhbGwodGhpcywgdkdyYXBoKTtcclxuICB0aGlzLmVzdGltYXRlZFNpemUgPSBJbnRlZ2VyLk1JTl9WQUxVRTtcclxuICB0aGlzLm1hcmdpbiA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVBIX01BUkdJTjtcclxuICB0aGlzLmVkZ2VzID0gW107XHJcbiAgdGhpcy5ub2RlcyA9IFtdO1xyXG4gIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcclxuICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuXHJcbiAgaWYgKG9iajIgIT0gbnVsbCAmJiBvYmoyIGluc3RhbmNlb2YgTEdyYXBoTWFuYWdlcikge1xyXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIgPSBvYmoyO1xyXG4gIH1cclxuICBlbHNlIGlmIChvYmoyICE9IG51bGwgJiYgb2JqMiBpbnN0YW5jZW9mIExheW91dCkge1xyXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIgPSBvYmoyLmdyYXBoTWFuYWdlcjtcclxuICB9XHJcbn1cclxuXHJcbkxHcmFwaC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExHcmFwaE9iamVjdC5wcm90b3R5cGUpO1xyXG5mb3IgKHZhciBwcm9wIGluIExHcmFwaE9iamVjdCkge1xyXG4gIExHcmFwaFtwcm9wXSA9IExHcmFwaE9iamVjdFtwcm9wXTtcclxufVxyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXROb2RlcyA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5ub2RlcztcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0RWRnZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuZWRnZXM7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldEdyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXI7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldFBhcmVudCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5wYXJlbnQ7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldExlZnQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGVmdDtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0UmlnaHQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmlnaHQ7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldFRvcCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy50b3A7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldEJvdHRvbSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5ib3R0b207XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmlzQ29ubmVjdGVkID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmlzQ29ubmVjdGVkO1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob2JqMSwgc291cmNlTm9kZSwgdGFyZ2V0Tm9kZSkge1xyXG4gIGlmIChzb3VyY2VOb2RlID09IG51bGwgJiYgdGFyZ2V0Tm9kZSA9PSBudWxsKSB7XHJcbiAgICB2YXIgbmV3Tm9kZSA9IG9iajE7XHJcbiAgICBpZiAodGhpcy5ncmFwaE1hbmFnZXIgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIkdyYXBoIGhhcyBubyBncmFwaCBtZ3IhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5nZXROb2RlcygpLmluZGV4T2YobmV3Tm9kZSkgPiAtMSkge1xyXG4gICAgICB0aHJvdyBcIk5vZGUgYWxyZWFkeSBpbiBncmFwaCFcIjtcclxuICAgIH1cclxuICAgIG5ld05vZGUub3duZXIgPSB0aGlzO1xyXG4gICAgdGhpcy5nZXROb2RlcygpLnB1c2gobmV3Tm9kZSk7XHJcblxyXG4gICAgcmV0dXJuIG5ld05vZGU7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgdmFyIG5ld0VkZ2UgPSBvYmoxO1xyXG4gICAgaWYgKCEodGhpcy5nZXROb2RlcygpLmluZGV4T2Yoc291cmNlTm9kZSkgPiAtMSAmJiAodGhpcy5nZXROb2RlcygpLmluZGV4T2YodGFyZ2V0Tm9kZSkpID4gLTEpKSB7XHJcbiAgICAgIHRocm93IFwiU291cmNlIG9yIHRhcmdldCBub3QgaW4gZ3JhcGghXCI7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCEoc291cmNlTm9kZS5vd25lciA9PSB0YXJnZXROb2RlLm93bmVyICYmIHNvdXJjZU5vZGUub3duZXIgPT0gdGhpcykpIHtcclxuICAgICAgdGhyb3cgXCJCb3RoIG93bmVycyBtdXN0IGJlIHRoaXMgZ3JhcGghXCI7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHNvdXJjZU5vZGUub3duZXIgIT0gdGFyZ2V0Tm9kZS5vd25lcilcclxuICAgIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gc2V0IHNvdXJjZSBhbmQgdGFyZ2V0XHJcbiAgICBuZXdFZGdlLnNvdXJjZSA9IHNvdXJjZU5vZGU7XHJcbiAgICBuZXdFZGdlLnRhcmdldCA9IHRhcmdldE5vZGU7XHJcblxyXG4gICAgLy8gc2V0IGFzIGludHJhLWdyYXBoIGVkZ2VcclxuICAgIG5ld0VkZ2UuaXNJbnRlckdyYXBoID0gZmFsc2U7XHJcblxyXG4gICAgLy8gYWRkIHRvIGdyYXBoIGVkZ2UgbGlzdFxyXG4gICAgdGhpcy5nZXRFZGdlcygpLnB1c2gobmV3RWRnZSk7XHJcblxyXG4gICAgLy8gYWRkIHRvIGluY2lkZW5jeSBsaXN0c1xyXG4gICAgc291cmNlTm9kZS5lZGdlcy5wdXNoKG5ld0VkZ2UpO1xyXG5cclxuICAgIGlmICh0YXJnZXROb2RlICE9IHNvdXJjZU5vZGUpXHJcbiAgICB7XHJcbiAgICAgIHRhcmdldE5vZGUuZWRnZXMucHVzaChuZXdFZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3RWRnZTtcclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChvYmopIHtcclxuICB2YXIgbm9kZSA9IG9iajtcclxuICBpZiAob2JqIGluc3RhbmNlb2YgTE5vZGUpIHtcclxuICAgIGlmIChub2RlID09IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJOb2RlIGlzIG51bGwhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAoIShub2RlLm93bmVyICE9IG51bGwgJiYgbm9kZS5vd25lciA9PSB0aGlzKSkge1xyXG4gICAgICB0aHJvdyBcIk93bmVyIGdyYXBoIGlzIGludmFsaWQhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5ncmFwaE1hbmFnZXIgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIk93bmVyIGdyYXBoIG1hbmFnZXIgaXMgaW52YWxpZCFcIjtcclxuICAgIH1cclxuICAgIC8vIHJlbW92ZSBpbmNpZGVudCBlZGdlcyBmaXJzdCAobWFrZSBhIGNvcHkgdG8gZG8gaXQgc2FmZWx5KVxyXG4gICAgdmFyIGVkZ2VzVG9CZVJlbW92ZWQgPSBub2RlLmVkZ2VzLnNsaWNlKCk7XHJcbiAgICB2YXIgZWRnZTtcclxuICAgIHZhciBzID0gZWRnZXNUb0JlUmVtb3ZlZC5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICAgIHtcclxuICAgICAgZWRnZSA9IGVkZ2VzVG9CZVJlbW92ZWRbaV07XHJcblxyXG4gICAgICBpZiAoZWRnZS5pc0ludGVyR3JhcGgpXHJcbiAgICAgIHtcclxuICAgICAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUoZWRnZSk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgZWRnZS5zb3VyY2Uub3duZXIucmVtb3ZlKGVkZ2UpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbm93IHRoZSBub2RlIGl0c2VsZlxyXG4gICAgdmFyIGluZGV4ID0gdGhpcy5ub2Rlcy5pbmRleE9mKG5vZGUpO1xyXG4gICAgaWYgKGluZGV4ID09IC0xKSB7XHJcbiAgICAgIHRocm93IFwiTm9kZSBub3QgaW4gb3duZXIgbm9kZSBsaXN0IVwiO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubm9kZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICB9XHJcbiAgZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgTEVkZ2UpIHtcclxuICAgIHZhciBlZGdlID0gb2JqO1xyXG4gICAgaWYgKGVkZ2UgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIkVkZ2UgaXMgbnVsbCFcIjtcclxuICAgIH1cclxuICAgIGlmICghKGVkZ2Uuc291cmNlICE9IG51bGwgJiYgZWRnZS50YXJnZXQgIT0gbnVsbCkpIHtcclxuICAgICAgdGhyb3cgXCJTb3VyY2UgYW5kL29yIHRhcmdldCBpcyBudWxsIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCEoZWRnZS5zb3VyY2Uub3duZXIgIT0gbnVsbCAmJiBlZGdlLnRhcmdldC5vd25lciAhPSBudWxsICYmXHJcbiAgICAgICAgICAgIGVkZ2Uuc291cmNlLm93bmVyID09IHRoaXMgJiYgZWRnZS50YXJnZXQub3duZXIgPT0gdGhpcykpIHtcclxuICAgICAgdGhyb3cgXCJTb3VyY2UgYW5kL29yIHRhcmdldCBvd25lciBpcyBpbnZhbGlkIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzb3VyY2VJbmRleCA9IGVkZ2Uuc291cmNlLmVkZ2VzLmluZGV4T2YoZWRnZSk7XHJcbiAgICB2YXIgdGFyZ2V0SW5kZXggPSBlZGdlLnRhcmdldC5lZGdlcy5pbmRleE9mKGVkZ2UpO1xyXG4gICAgaWYgKCEoc291cmNlSW5kZXggPiAtMSAmJiB0YXJnZXRJbmRleCA+IC0xKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGRvZXNuJ3Qga25vdyB0aGlzIGVkZ2UhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgZWRnZS5zb3VyY2UuZWRnZXMuc3BsaWNlKHNvdXJjZUluZGV4LCAxKTtcclxuXHJcbiAgICBpZiAoZWRnZS50YXJnZXQgIT0gZWRnZS5zb3VyY2UpXHJcbiAgICB7XHJcbiAgICAgIGVkZ2UudGFyZ2V0LmVkZ2VzLnNwbGljZSh0YXJnZXRJbmRleCwgMSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGluZGV4ID0gZWRnZS5zb3VyY2Uub3duZXIuZ2V0RWRnZXMoKS5pbmRleE9mKGVkZ2UpO1xyXG4gICAgaWYgKGluZGV4ID09IC0xKSB7XHJcbiAgICAgIHRocm93IFwiTm90IGluIG93bmVyJ3MgZWRnZSBsaXN0IVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGVkZ2Uuc291cmNlLm93bmVyLmdldEVkZ2VzKCkuc3BsaWNlKGluZGV4LCAxKTtcclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLnVwZGF0ZUxlZnRUb3AgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIHRvcCA9IEludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciBsZWZ0ID0gSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIG5vZGVUb3A7XHJcbiAgdmFyIG5vZGVMZWZ0O1xyXG5cclxuICB2YXIgbm9kZXMgPSB0aGlzLmdldE5vZGVzKCk7XHJcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBsTm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgbm9kZVRvcCA9IE1hdGguZmxvb3IobE5vZGUuZ2V0VG9wKCkpO1xyXG4gICAgbm9kZUxlZnQgPSBNYXRoLmZsb29yKGxOb2RlLmdldExlZnQoKSk7XHJcblxyXG4gICAgaWYgKHRvcCA+IG5vZGVUb3ApXHJcbiAgICB7XHJcbiAgICAgIHRvcCA9IG5vZGVUb3A7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGxlZnQgPiBub2RlTGVmdClcclxuICAgIHtcclxuICAgICAgbGVmdCA9IG5vZGVMZWZ0O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gRG8gd2UgaGF2ZSBhbnkgbm9kZXMgaW4gdGhpcyBncmFwaD9cclxuICBpZiAodG9wID09IEludGVnZXIuTUFYX1ZBTFVFKVxyXG4gIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5sZWZ0ID0gbGVmdCAtIHRoaXMubWFyZ2luO1xyXG4gIHRoaXMudG9wID0gdG9wIC0gdGhpcy5tYXJnaW47XHJcblxyXG4gIC8vIEFwcGx5IHRoZSBtYXJnaW5zIGFuZCByZXR1cm4gdGhlIHJlc3VsdFxyXG4gIHJldHVybiBuZXcgUG9pbnQodGhpcy5sZWZ0LCB0aGlzLnRvcCk7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLnVwZGF0ZUJvdW5kcyA9IGZ1bmN0aW9uIChyZWN1cnNpdmUpXHJcbntcclxuICAvLyBjYWxjdWxhdGUgYm91bmRzXHJcbiAgdmFyIGxlZnQgPSBJbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgcmlnaHQgPSAtSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIHRvcCA9IEludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciBib3R0b20gPSAtSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIG5vZGVMZWZ0O1xyXG4gIHZhciBub2RlUmlnaHQ7XHJcbiAgdmFyIG5vZGVUb3A7XHJcbiAgdmFyIG5vZGVCb3R0b207XHJcblxyXG4gIHZhciBub2RlcyA9IHRoaXMubm9kZXM7XHJcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIGxOb2RlID0gbm9kZXNbaV07XHJcblxyXG4gICAgaWYgKHJlY3Vyc2l2ZSAmJiBsTm9kZS5jaGlsZCAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICBsTm9kZS51cGRhdGVCb3VuZHMoKTtcclxuICAgIH1cclxuICAgIG5vZGVMZWZ0ID0gTWF0aC5mbG9vcihsTm9kZS5nZXRMZWZ0KCkpO1xyXG4gICAgbm9kZVJpZ2h0ID0gTWF0aC5mbG9vcihsTm9kZS5nZXRSaWdodCgpKTtcclxuICAgIG5vZGVUb3AgPSBNYXRoLmZsb29yKGxOb2RlLmdldFRvcCgpKTtcclxuICAgIG5vZGVCb3R0b20gPSBNYXRoLmZsb29yKGxOb2RlLmdldEJvdHRvbSgpKTtcclxuXHJcbiAgICBpZiAobGVmdCA+IG5vZGVMZWZ0KVxyXG4gICAge1xyXG4gICAgICBsZWZ0ID0gbm9kZUxlZnQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJpZ2h0IDwgbm9kZVJpZ2h0KVxyXG4gICAge1xyXG4gICAgICByaWdodCA9IG5vZGVSaWdodDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodG9wID4gbm9kZVRvcClcclxuICAgIHtcclxuICAgICAgdG9wID0gbm9kZVRvcDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoYm90dG9tIDwgbm9kZUJvdHRvbSlcclxuICAgIHtcclxuICAgICAgYm90dG9tID0gbm9kZUJvdHRvbTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhciBib3VuZGluZ1JlY3QgPSBuZXcgUmVjdGFuZ2xlRChsZWZ0LCB0b3AsIHJpZ2h0IC0gbGVmdCwgYm90dG9tIC0gdG9wKTtcclxuICBpZiAobGVmdCA9PSBJbnRlZ2VyLk1BWF9WQUxVRSlcclxuICB7XHJcbiAgICB0aGlzLmxlZnQgPSBNYXRoLmZsb29yKHRoaXMucGFyZW50LmdldExlZnQoKSk7XHJcbiAgICB0aGlzLnJpZ2h0ID0gTWF0aC5mbG9vcih0aGlzLnBhcmVudC5nZXRSaWdodCgpKTtcclxuICAgIHRoaXMudG9wID0gTWF0aC5mbG9vcih0aGlzLnBhcmVudC5nZXRUb3AoKSk7XHJcbiAgICB0aGlzLmJvdHRvbSA9IE1hdGguZmxvb3IodGhpcy5wYXJlbnQuZ2V0Qm90dG9tKCkpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5sZWZ0ID0gYm91bmRpbmdSZWN0LnggLSB0aGlzLm1hcmdpbjtcclxuICB0aGlzLnJpZ2h0ID0gYm91bmRpbmdSZWN0LnggKyBib3VuZGluZ1JlY3Qud2lkdGggKyB0aGlzLm1hcmdpbjtcclxuICB0aGlzLnRvcCA9IGJvdW5kaW5nUmVjdC55IC0gdGhpcy5tYXJnaW47XHJcbiAgdGhpcy5ib3R0b20gPSBib3VuZGluZ1JlY3QueSArIGJvdW5kaW5nUmVjdC5oZWlnaHQgKyB0aGlzLm1hcmdpbjtcclxufTtcclxuXHJcbkxHcmFwaC5jYWxjdWxhdGVCb3VuZHMgPSBmdW5jdGlvbiAobm9kZXMpXHJcbntcclxuICB2YXIgbGVmdCA9IEludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciByaWdodCA9IC1JbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgdG9wID0gSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIGJvdHRvbSA9IC1JbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgbm9kZUxlZnQ7XHJcbiAgdmFyIG5vZGVSaWdodDtcclxuICB2YXIgbm9kZVRvcDtcclxuICB2YXIgbm9kZUJvdHRvbTtcclxuXHJcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBsTm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgbm9kZUxlZnQgPSBNYXRoLmZsb29yKGxOb2RlLmdldExlZnQoKSk7XHJcbiAgICBub2RlUmlnaHQgPSBNYXRoLmZsb29yKGxOb2RlLmdldFJpZ2h0KCkpO1xyXG4gICAgbm9kZVRvcCA9IE1hdGguZmxvb3IobE5vZGUuZ2V0VG9wKCkpO1xyXG4gICAgbm9kZUJvdHRvbSA9IE1hdGguZmxvb3IobE5vZGUuZ2V0Qm90dG9tKCkpO1xyXG5cclxuICAgIGlmIChsZWZ0ID4gbm9kZUxlZnQpXHJcbiAgICB7XHJcbiAgICAgIGxlZnQgPSBub2RlTGVmdDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmlnaHQgPCBub2RlUmlnaHQpXHJcbiAgICB7XHJcbiAgICAgIHJpZ2h0ID0gbm9kZVJpZ2h0O1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0b3AgPiBub2RlVG9wKVxyXG4gICAge1xyXG4gICAgICB0b3AgPSBub2RlVG9wO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChib3R0b20gPCBub2RlQm90dG9tKVxyXG4gICAge1xyXG4gICAgICBib3R0b20gPSBub2RlQm90dG9tO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFyIGJvdW5kaW5nUmVjdCA9IG5ldyBSZWN0YW5nbGVEKGxlZnQsIHRvcCwgcmlnaHQgLSBsZWZ0LCBib3R0b20gLSB0b3ApO1xyXG5cclxuICByZXR1cm4gYm91bmRpbmdSZWN0O1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXRJbmNsdXNpb25UcmVlRGVwdGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgaWYgKHRoaXMgPT0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpKVxyXG4gIHtcclxuICAgIHJldHVybiAxO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgcmV0dXJuIHRoaXMucGFyZW50LmdldEluY2x1c2lvblRyZWVEZXB0aCgpO1xyXG4gIH1cclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0RXN0aW1hdGVkU2l6ZSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcy5lc3RpbWF0ZWRTaXplID09IEludGVnZXIuTUlOX1ZBTFVFKSB7XHJcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMuZXN0aW1hdGVkU2l6ZTtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuY2FsY0VzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIHNpemUgPSAwO1xyXG4gIHZhciBub2RlcyA9IHRoaXMubm9kZXM7XHJcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBsTm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgc2l6ZSArPSBsTm9kZS5jYWxjRXN0aW1hdGVkU2l6ZSgpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHNpemUgPT0gMClcclxuICB7XHJcbiAgICB0aGlzLmVzdGltYXRlZFNpemUgPSBMYXlvdXRDb25zdGFudHMuRU1QVFlfQ09NUE9VTkRfTk9ERV9TSVpFO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgdGhpcy5lc3RpbWF0ZWRTaXplID0gTWF0aC5mbG9vcihzaXplIC8gTWF0aC5zcXJ0KHRoaXMubm9kZXMubGVuZ3RoKSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gTWF0aC5mbG9vcih0aGlzLmVzdGltYXRlZFNpemUpO1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS51cGRhdGVDb25uZWN0ZWQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIGlmICh0aGlzLm5vZGVzLmxlbmd0aCA9PSAwKVxyXG4gIHtcclxuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHRvQmVWaXNpdGVkID0gW107XHJcbiAgdmFyIHZpc2l0ZWQgPSBuZXcgSGFzaFNldCgpO1xyXG4gIHZhciBjdXJyZW50Tm9kZSA9IHRoaXMubm9kZXNbMF07XHJcbiAgdmFyIG5laWdoYm9yRWRnZXM7XHJcbiAgdmFyIGN1cnJlbnROZWlnaGJvcjtcclxuICB0b0JlVmlzaXRlZCA9IHRvQmVWaXNpdGVkLmNvbmNhdChjdXJyZW50Tm9kZS53aXRoQ2hpbGRyZW4oKSk7XHJcblxyXG4gIHdoaWxlICh0b0JlVmlzaXRlZC5sZW5ndGggPiAwKVxyXG4gIHtcclxuICAgIGN1cnJlbnROb2RlID0gdG9CZVZpc2l0ZWQuc2hpZnQoKTtcclxuICAgIHZpc2l0ZWQuYWRkKGN1cnJlbnROb2RlKTtcclxuXHJcbiAgICAvLyBUcmF2ZXJzZSBhbGwgbmVpZ2hib3JzIG9mIHRoaXMgbm9kZVxyXG4gICAgbmVpZ2hib3JFZGdlcyA9IGN1cnJlbnROb2RlLmdldEVkZ2VzKCk7XHJcbiAgICB2YXIgcyA9IG5laWdoYm9yRWRnZXMubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIHZhciBuZWlnaGJvckVkZ2UgPSBuZWlnaGJvckVkZ2VzW2ldO1xyXG4gICAgICBjdXJyZW50TmVpZ2hib3IgPVxyXG4gICAgICAgICAgICAgIG5laWdoYm9yRWRnZS5nZXRPdGhlckVuZEluR3JhcGgoY3VycmVudE5vZGUsIHRoaXMpO1xyXG5cclxuICAgICAgLy8gQWRkIHVudmlzaXRlZCBuZWlnaGJvcnMgdG8gdGhlIGxpc3QgdG8gdmlzaXRcclxuICAgICAgaWYgKGN1cnJlbnROZWlnaGJvciAhPSBudWxsICYmXHJcbiAgICAgICAgICAgICAgIXZpc2l0ZWQuY29udGFpbnMoY3VycmVudE5laWdoYm9yKSlcclxuICAgICAge1xyXG4gICAgICAgIHRvQmVWaXNpdGVkID0gdG9CZVZpc2l0ZWQuY29uY2F0KGN1cnJlbnROZWlnaGJvci53aXRoQ2hpbGRyZW4oKSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcclxuXHJcbiAgaWYgKHZpc2l0ZWQuc2l6ZSgpID49IHRoaXMubm9kZXMubGVuZ3RoKVxyXG4gIHtcclxuICAgIHZhciBub09mVmlzaXRlZEluVGhpc0dyYXBoID0gMDtcclxuICAgIFxyXG4gICAgdmFyIHMgPSB2aXNpdGVkLnNpemUoKTtcclxuICAgICBPYmplY3Qua2V5cyh2aXNpdGVkLnNldCkuZm9yRWFjaChmdW5jdGlvbih2aXNpdGVkSWQpIHtcclxuICAgICAgdmFyIHZpc2l0ZWROb2RlID0gdmlzaXRlZC5zZXRbdmlzaXRlZElkXTtcclxuICAgICAgaWYgKHZpc2l0ZWROb2RlLm93bmVyID09IHNlbGYpXHJcbiAgICAgIHtcclxuICAgICAgICBub09mVmlzaXRlZEluVGhpc0dyYXBoKys7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGlmIChub09mVmlzaXRlZEluVGhpc0dyYXBoID09IHRoaXMubm9kZXMubGVuZ3RoKVxyXG4gICAge1xyXG4gICAgICB0aGlzLmlzQ29ubmVjdGVkID0gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExHcmFwaDtcclxuIiwidmFyIExHcmFwaDtcclxudmFyIExFZGdlID0gcmVxdWlyZSgnLi9MRWRnZScpO1xyXG5cclxuZnVuY3Rpb24gTEdyYXBoTWFuYWdlcihsYXlvdXQpIHtcclxuICBMR3JhcGggPSByZXF1aXJlKCcuL0xHcmFwaCcpOyAvLyBJdCBtYXkgYmUgYmV0dGVyIHRvIGluaXRpbGl6ZSB0aGlzIG91dCBvZiB0aGlzIGZ1bmN0aW9uIGJ1dCBpdCBnaXZlcyBhbiBlcnJvciAoUmlnaHQtaGFuZCBzaWRlIG9mICdpbnN0YW5jZW9mJyBpcyBub3QgY2FsbGFibGUpIG5vdy5cclxuICB0aGlzLmxheW91dCA9IGxheW91dDtcclxuXHJcbiAgdGhpcy5ncmFwaHMgPSBbXTtcclxuICB0aGlzLmVkZ2VzID0gW107XHJcbn1cclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmFkZFJvb3QgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIG5ncmFwaCA9IHRoaXMubGF5b3V0Lm5ld0dyYXBoKCk7XHJcbiAgdmFyIG5ub2RlID0gdGhpcy5sYXlvdXQubmV3Tm9kZShudWxsKTtcclxuICB2YXIgcm9vdCA9IHRoaXMuYWRkKG5ncmFwaCwgbm5vZGUpO1xyXG4gIHRoaXMuc2V0Um9vdEdyYXBoKHJvb3QpO1xyXG4gIHJldHVybiB0aGlzLnJvb3RHcmFwaDtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChuZXdHcmFwaCwgcGFyZW50Tm9kZSwgbmV3RWRnZSwgc291cmNlTm9kZSwgdGFyZ2V0Tm9kZSlcclxue1xyXG4gIC8vdGhlcmUgYXJlIGp1c3QgMiBwYXJhbWV0ZXJzIGFyZSBwYXNzZWQgdGhlbiBpdCBhZGRzIGFuIExHcmFwaCBlbHNlIGl0IGFkZHMgYW4gTEVkZ2VcclxuICBpZiAobmV3RWRnZSA9PSBudWxsICYmIHNvdXJjZU5vZGUgPT0gbnVsbCAmJiB0YXJnZXROb2RlID09IG51bGwpIHtcclxuICAgIGlmIChuZXdHcmFwaCA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiR3JhcGggaXMgbnVsbCFcIjtcclxuICAgIH1cclxuICAgIGlmIChwYXJlbnROb2RlID09IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJQYXJlbnQgbm9kZSBpcyBudWxsIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZ3JhcGhzLmluZGV4T2YobmV3R3JhcGgpID4gLTEpIHtcclxuICAgICAgdGhyb3cgXCJHcmFwaCBhbHJlYWR5IGluIHRoaXMgZ3JhcGggbWdyIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZ3JhcGhzLnB1c2gobmV3R3JhcGgpO1xyXG5cclxuICAgIGlmIChuZXdHcmFwaC5wYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIkFscmVhZHkgaGFzIGEgcGFyZW50IVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKHBhcmVudE5vZGUuY2hpbGQgIT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyAgXCJBbHJlYWR5IGhhcyBhIGNoaWxkIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIG5ld0dyYXBoLnBhcmVudCA9IHBhcmVudE5vZGU7XHJcbiAgICBwYXJlbnROb2RlLmNoaWxkID0gbmV3R3JhcGg7XHJcblxyXG4gICAgcmV0dXJuIG5ld0dyYXBoO1xyXG4gIH1cclxuICBlbHNlIHtcclxuICAgIC8vY2hhbmdlIHRoZSBvcmRlciBvZiB0aGUgcGFyYW1ldGVyc1xyXG4gICAgdGFyZ2V0Tm9kZSA9IG5ld0VkZ2U7XHJcbiAgICBzb3VyY2VOb2RlID0gcGFyZW50Tm9kZTtcclxuICAgIG5ld0VkZ2UgPSBuZXdHcmFwaDtcclxuICAgIHZhciBzb3VyY2VHcmFwaCA9IHNvdXJjZU5vZGUuZ2V0T3duZXIoKTtcclxuICAgIHZhciB0YXJnZXRHcmFwaCA9IHRhcmdldE5vZGUuZ2V0T3duZXIoKTtcclxuXHJcbiAgICBpZiAoIShzb3VyY2VHcmFwaCAhPSBudWxsICYmIHNvdXJjZUdyYXBoLmdldEdyYXBoTWFuYWdlcigpID09IHRoaXMpKSB7XHJcbiAgICAgIHRocm93IFwiU291cmNlIG5vdCBpbiB0aGlzIGdyYXBoIG1nciFcIjtcclxuICAgIH1cclxuICAgIGlmICghKHRhcmdldEdyYXBoICE9IG51bGwgJiYgdGFyZ2V0R3JhcGguZ2V0R3JhcGhNYW5hZ2VyKCkgPT0gdGhpcykpIHtcclxuICAgICAgdGhyb3cgXCJUYXJnZXQgbm90IGluIHRoaXMgZ3JhcGggbWdyIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChzb3VyY2VHcmFwaCA9PSB0YXJnZXRHcmFwaClcclxuICAgIHtcclxuICAgICAgbmV3RWRnZS5pc0ludGVyR3JhcGggPSBmYWxzZTtcclxuICAgICAgcmV0dXJuIHNvdXJjZUdyYXBoLmFkZChuZXdFZGdlLCBzb3VyY2VOb2RlLCB0YXJnZXROb2RlKTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgbmV3RWRnZS5pc0ludGVyR3JhcGggPSB0cnVlO1xyXG5cclxuICAgICAgLy8gc2V0IHNvdXJjZSBhbmQgdGFyZ2V0XHJcbiAgICAgIG5ld0VkZ2Uuc291cmNlID0gc291cmNlTm9kZTtcclxuICAgICAgbmV3RWRnZS50YXJnZXQgPSB0YXJnZXROb2RlO1xyXG5cclxuICAgICAgLy8gYWRkIGVkZ2UgdG8gaW50ZXItZ3JhcGggZWRnZSBsaXN0XHJcbiAgICAgIGlmICh0aGlzLmVkZ2VzLmluZGV4T2YobmV3RWRnZSkgPiAtMSkge1xyXG4gICAgICAgIHRocm93IFwiRWRnZSBhbHJlYWR5IGluIGludGVyLWdyYXBoIGVkZ2UgbGlzdCFcIjtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5lZGdlcy5wdXNoKG5ld0VkZ2UpO1xyXG5cclxuICAgICAgLy8gYWRkIGVkZ2UgdG8gc291cmNlIGFuZCB0YXJnZXQgaW5jaWRlbmN5IGxpc3RzXHJcbiAgICAgIGlmICghKG5ld0VkZ2Uuc291cmNlICE9IG51bGwgJiYgbmV3RWRnZS50YXJnZXQgIT0gbnVsbCkpIHtcclxuICAgICAgICB0aHJvdyBcIkVkZ2Ugc291cmNlIGFuZC9vciB0YXJnZXQgaXMgbnVsbCFcIjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCEobmV3RWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihuZXdFZGdlKSA9PSAtMSAmJiBuZXdFZGdlLnRhcmdldC5lZGdlcy5pbmRleE9mKG5ld0VkZ2UpID09IC0xKSkge1xyXG4gICAgICAgIHRocm93IFwiRWRnZSBhbHJlYWR5IGluIHNvdXJjZSBhbmQvb3IgdGFyZ2V0IGluY2lkZW5jeSBsaXN0IVwiO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBuZXdFZGdlLnNvdXJjZS5lZGdlcy5wdXNoKG5ld0VkZ2UpO1xyXG4gICAgICBuZXdFZGdlLnRhcmdldC5lZGdlcy5wdXNoKG5ld0VkZ2UpO1xyXG5cclxuICAgICAgcmV0dXJuIG5ld0VkZ2U7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKGxPYmopIHtcclxuICBpZiAobE9iaiBpbnN0YW5jZW9mIExHcmFwaCkge1xyXG4gICAgdmFyIGdyYXBoID0gbE9iajtcclxuICAgIGlmIChncmFwaC5nZXRHcmFwaE1hbmFnZXIoKSAhPSB0aGlzKSB7XHJcbiAgICAgIHRocm93IFwiR3JhcGggbm90IGluIHRoaXMgZ3JhcGggbWdyXCI7XHJcbiAgICB9XHJcbiAgICBpZiAoIShncmFwaCA9PSB0aGlzLnJvb3RHcmFwaCB8fCAoZ3JhcGgucGFyZW50ICE9IG51bGwgJiYgZ3JhcGgucGFyZW50LmdyYXBoTWFuYWdlciA9PSB0aGlzKSkpIHtcclxuICAgICAgdGhyb3cgXCJJbnZhbGlkIHBhcmVudCBub2RlIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGZpcnN0IHRoZSBlZGdlcyAobWFrZSBhIGNvcHkgdG8gZG8gaXQgc2FmZWx5KVxyXG4gICAgdmFyIGVkZ2VzVG9CZVJlbW92ZWQgPSBbXTtcclxuXHJcbiAgICBlZGdlc1RvQmVSZW1vdmVkID0gZWRnZXNUb0JlUmVtb3ZlZC5jb25jYXQoZ3JhcGguZ2V0RWRnZXMoKSk7XHJcblxyXG4gICAgdmFyIGVkZ2U7XHJcbiAgICB2YXIgcyA9IGVkZ2VzVG9CZVJlbW92ZWQubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIGVkZ2UgPSBlZGdlc1RvQmVSZW1vdmVkW2ldO1xyXG4gICAgICBncmFwaC5yZW1vdmUoZWRnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdGhlbiB0aGUgbm9kZXMgKG1ha2UgYSBjb3B5IHRvIGRvIGl0IHNhZmVseSlcclxuICAgIHZhciBub2Rlc1RvQmVSZW1vdmVkID0gW107XHJcblxyXG4gICAgbm9kZXNUb0JlUmVtb3ZlZCA9IG5vZGVzVG9CZVJlbW92ZWQuY29uY2F0KGdyYXBoLmdldE5vZGVzKCkpO1xyXG5cclxuICAgIHZhciBub2RlO1xyXG4gICAgcyA9IG5vZGVzVG9CZVJlbW92ZWQubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIG5vZGUgPSBub2Rlc1RvQmVSZW1vdmVkW2ldO1xyXG4gICAgICBncmFwaC5yZW1vdmUobm9kZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2hlY2sgaWYgZ3JhcGggaXMgdGhlIHJvb3RcclxuICAgIGlmIChncmFwaCA9PSB0aGlzLnJvb3RHcmFwaClcclxuICAgIHtcclxuICAgICAgdGhpcy5zZXRSb290R3JhcGgobnVsbCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbm93IHJlbW92ZSB0aGUgZ3JhcGggaXRzZWxmXHJcbiAgICB2YXIgaW5kZXggPSB0aGlzLmdyYXBocy5pbmRleE9mKGdyYXBoKTtcclxuICAgIHRoaXMuZ3JhcGhzLnNwbGljZShpbmRleCwgMSk7XHJcblxyXG4gICAgLy8gYWxzbyByZXNldCB0aGUgcGFyZW50IG9mIHRoZSBncmFwaFxyXG4gICAgZ3JhcGgucGFyZW50ID0gbnVsbDtcclxuICB9XHJcbiAgZWxzZSBpZiAobE9iaiBpbnN0YW5jZW9mIExFZGdlKSB7XHJcbiAgICBlZGdlID0gbE9iajtcclxuICAgIGlmIChlZGdlID09IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJFZGdlIGlzIG51bGwhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAoIWVkZ2UuaXNJbnRlckdyYXBoKSB7XHJcbiAgICAgIHRocm93IFwiTm90IGFuIGludGVyLWdyYXBoIGVkZ2UhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAoIShlZGdlLnNvdXJjZSAhPSBudWxsICYmIGVkZ2UudGFyZ2V0ICE9IG51bGwpKSB7XHJcbiAgICAgIHRocm93IFwiU291cmNlIGFuZC9vciB0YXJnZXQgaXMgbnVsbCFcIjtcclxuICAgIH1cclxuXHJcbiAgICAvLyByZW1vdmUgZWRnZSBmcm9tIHNvdXJjZSBhbmQgdGFyZ2V0IG5vZGVzJyBpbmNpZGVuY3kgbGlzdHNcclxuXHJcbiAgICBpZiAoIShlZGdlLnNvdXJjZS5lZGdlcy5pbmRleE9mKGVkZ2UpICE9IC0xICYmIGVkZ2UudGFyZ2V0LmVkZ2VzLmluZGV4T2YoZWRnZSkgIT0gLTEpKSB7XHJcbiAgICAgIHRocm93IFwiU291cmNlIGFuZC9vciB0YXJnZXQgZG9lc24ndCBrbm93IHRoaXMgZWRnZSFcIjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaW5kZXggPSBlZGdlLnNvdXJjZS5lZGdlcy5pbmRleE9mKGVkZ2UpO1xyXG4gICAgZWRnZS5zb3VyY2UuZWRnZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgIGluZGV4ID0gZWRnZS50YXJnZXQuZWRnZXMuaW5kZXhPZihlZGdlKTtcclxuICAgIGVkZ2UudGFyZ2V0LmVkZ2VzLnNwbGljZShpbmRleCwgMSk7XHJcblxyXG4gICAgLy8gcmVtb3ZlIGVkZ2UgZnJvbSBvd25lciBncmFwaCBtYW5hZ2VyJ3MgaW50ZXItZ3JhcGggZWRnZSBsaXN0XHJcblxyXG4gICAgaWYgKCEoZWRnZS5zb3VyY2Uub3duZXIgIT0gbnVsbCAmJiBlZGdlLnNvdXJjZS5vd25lci5nZXRHcmFwaE1hbmFnZXIoKSAhPSBudWxsKSkge1xyXG4gICAgICB0aHJvdyBcIkVkZ2Ugb3duZXIgZ3JhcGggb3Igb3duZXIgZ3JhcGggbWFuYWdlciBpcyBudWxsIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKGVkZ2Uuc291cmNlLm93bmVyLmdldEdyYXBoTWFuYWdlcigpLmVkZ2VzLmluZGV4T2YoZWRnZSkgPT0gLTEpIHtcclxuICAgICAgdGhyb3cgXCJOb3QgaW4gb3duZXIgZ3JhcGggbWFuYWdlcidzIGVkZ2UgbGlzdCFcIjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaW5kZXggPSBlZGdlLnNvdXJjZS5vd25lci5nZXRHcmFwaE1hbmFnZXIoKS5lZGdlcy5pbmRleE9mKGVkZ2UpO1xyXG4gICAgZWRnZS5zb3VyY2Uub3duZXIuZ2V0R3JhcGhNYW5hZ2VyKCkuZWRnZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS51cGRhdGVCb3VuZHMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdGhpcy5yb290R3JhcGgudXBkYXRlQm91bmRzKHRydWUpO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuZ2V0R3JhcGhzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmdyYXBocztcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEFsbE5vZGVzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIGlmICh0aGlzLmFsbE5vZGVzID09IG51bGwpXHJcbiAge1xyXG4gICAgdmFyIG5vZGVMaXN0ID0gW107XHJcbiAgICB2YXIgZ3JhcGhzID0gdGhpcy5nZXRHcmFwaHMoKTtcclxuICAgIHZhciBzID0gZ3JhcGhzLmxlbmd0aDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gICAge1xyXG4gICAgICBub2RlTGlzdCA9IG5vZGVMaXN0LmNvbmNhdChncmFwaHNbaV0uZ2V0Tm9kZXMoKSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmFsbE5vZGVzID0gbm9kZUxpc3Q7XHJcbiAgfVxyXG4gIHJldHVybiB0aGlzLmFsbE5vZGVzO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUucmVzZXRBbGxOb2RlcyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB0aGlzLmFsbE5vZGVzID0gbnVsbDtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlc2V0QWxsRWRnZXMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdGhpcy5hbGxFZGdlcyA9IG51bGw7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5yZXNldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHRoaXMuYWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBudWxsO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuZ2V0QWxsRWRnZXMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgaWYgKHRoaXMuYWxsRWRnZXMgPT0gbnVsbClcclxuICB7XHJcbiAgICB2YXIgZWRnZUxpc3QgPSBbXTtcclxuICAgIHZhciBncmFwaHMgPSB0aGlzLmdldEdyYXBocygpO1xyXG4gICAgdmFyIHMgPSBncmFwaHMubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBncmFwaHMubGVuZ3RoOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIGVkZ2VMaXN0ID0gZWRnZUxpc3QuY29uY2F0KGdyYXBoc1tpXS5nZXRFZGdlcygpKTtcclxuICAgIH1cclxuXHJcbiAgICBlZGdlTGlzdCA9IGVkZ2VMaXN0LmNvbmNhdCh0aGlzLmVkZ2VzKTtcclxuXHJcbiAgICB0aGlzLmFsbEVkZ2VzID0gZWRnZUxpc3Q7XHJcbiAgfVxyXG4gIHJldHVybiB0aGlzLmFsbEVkZ2VzO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuZ2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuYWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb247XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5zZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IGZ1bmN0aW9uIChub2RlTGlzdClcclxue1xyXG4gIGlmICh0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uICE9IG51bGwpIHtcclxuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5hbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IG5vZGVMaXN0O1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuZ2V0Um9vdCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yb290R3JhcGg7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5zZXRSb290R3JhcGggPSBmdW5jdGlvbiAoZ3JhcGgpXHJcbntcclxuICBpZiAoZ3JhcGguZ2V0R3JhcGhNYW5hZ2VyKCkgIT0gdGhpcykge1xyXG4gICAgdGhyb3cgXCJSb290IG5vdCBpbiB0aGlzIGdyYXBoIG1nciFcIjtcclxuICB9XHJcblxyXG4gIHRoaXMucm9vdEdyYXBoID0gZ3JhcGg7XHJcbiAgLy8gcm9vdCBncmFwaCBtdXN0IGhhdmUgYSByb290IG5vZGUgYXNzb2NpYXRlZCB3aXRoIGl0IGZvciBjb252ZW5pZW5jZVxyXG4gIGlmIChncmFwaC5wYXJlbnQgPT0gbnVsbClcclxuICB7XHJcbiAgICBncmFwaC5wYXJlbnQgPSB0aGlzLmxheW91dC5uZXdOb2RlKFwiUm9vdCBub2RlXCIpO1xyXG4gIH1cclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldExheW91dCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sYXlvdXQ7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5pc09uZUFuY2VzdG9yT2ZPdGhlciA9IGZ1bmN0aW9uIChmaXJzdE5vZGUsIHNlY29uZE5vZGUpXHJcbntcclxuICBpZiAoIShmaXJzdE5vZGUgIT0gbnVsbCAmJiBzZWNvbmROb2RlICE9IG51bGwpKSB7XHJcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICB9XHJcblxyXG4gIGlmIChmaXJzdE5vZGUgPT0gc2Vjb25kTm9kZSlcclxuICB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbiAgLy8gSXMgc2Vjb25kIG5vZGUgYW4gYW5jZXN0b3Igb2YgdGhlIGZpcnN0IG9uZT9cclxuICB2YXIgb3duZXJHcmFwaCA9IGZpcnN0Tm9kZS5nZXRPd25lcigpO1xyXG4gIHZhciBwYXJlbnROb2RlO1xyXG5cclxuICBkb1xyXG4gIHtcclxuICAgIHBhcmVudE5vZGUgPSBvd25lckdyYXBoLmdldFBhcmVudCgpO1xyXG5cclxuICAgIGlmIChwYXJlbnROb2RlID09IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChwYXJlbnROb2RlID09IHNlY29uZE5vZGUpXHJcbiAgICB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIG93bmVyR3JhcGggPSBwYXJlbnROb2RlLmdldE93bmVyKCk7XHJcbiAgICBpZiAob3duZXJHcmFwaCA9PSBudWxsKVxyXG4gICAge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9IHdoaWxlICh0cnVlKTtcclxuICAvLyBJcyBmaXJzdCBub2RlIGFuIGFuY2VzdG9yIG9mIHRoZSBzZWNvbmQgb25lP1xyXG4gIG93bmVyR3JhcGggPSBzZWNvbmROb2RlLmdldE93bmVyKCk7XHJcblxyXG4gIGRvXHJcbiAge1xyXG4gICAgcGFyZW50Tm9kZSA9IG93bmVyR3JhcGguZ2V0UGFyZW50KCk7XHJcblxyXG4gICAgaWYgKHBhcmVudE5vZGUgPT0gbnVsbClcclxuICAgIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHBhcmVudE5vZGUgPT0gZmlyc3ROb2RlKVxyXG4gICAge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBvd25lckdyYXBoID0gcGFyZW50Tm9kZS5nZXRPd25lcigpO1xyXG4gICAgaWYgKG93bmVyR3JhcGggPT0gbnVsbClcclxuICAgIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfSB3aGlsZSAodHJ1ZSk7XHJcblxyXG4gIHJldHVybiBmYWxzZTtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmNhbGNMb3dlc3RDb21tb25BbmNlc3RvcnMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIGVkZ2U7XHJcbiAgdmFyIHNvdXJjZU5vZGU7XHJcbiAgdmFyIHRhcmdldE5vZGU7XHJcbiAgdmFyIHNvdXJjZUFuY2VzdG9yR3JhcGg7XHJcbiAgdmFyIHRhcmdldEFuY2VzdG9yR3JhcGg7XHJcblxyXG4gIHZhciBlZGdlcyA9IHRoaXMuZ2V0QWxsRWRnZXMoKTtcclxuICB2YXIgcyA9IGVkZ2VzLmxlbmd0aDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICB7XHJcbiAgICBlZGdlID0gZWRnZXNbaV07XHJcblxyXG4gICAgc291cmNlTm9kZSA9IGVkZ2Uuc291cmNlO1xyXG4gICAgdGFyZ2V0Tm9kZSA9IGVkZ2UudGFyZ2V0O1xyXG4gICAgZWRnZS5sY2EgPSBudWxsO1xyXG4gICAgZWRnZS5zb3VyY2VJbkxjYSA9IHNvdXJjZU5vZGU7XHJcbiAgICBlZGdlLnRhcmdldEluTGNhID0gdGFyZ2V0Tm9kZTtcclxuXHJcbiAgICBpZiAoc291cmNlTm9kZSA9PSB0YXJnZXROb2RlKVxyXG4gICAge1xyXG4gICAgICBlZGdlLmxjYSA9IHNvdXJjZU5vZGUuZ2V0T3duZXIoKTtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcblxyXG4gICAgc291cmNlQW5jZXN0b3JHcmFwaCA9IHNvdXJjZU5vZGUuZ2V0T3duZXIoKTtcclxuXHJcbiAgICB3aGlsZSAoZWRnZS5sY2EgPT0gbnVsbClcclxuICAgIHtcclxuICAgICAgdGFyZ2V0QW5jZXN0b3JHcmFwaCA9IHRhcmdldE5vZGUuZ2V0T3duZXIoKTtcclxuXHJcbiAgICAgIHdoaWxlIChlZGdlLmxjYSA9PSBudWxsKVxyXG4gICAgICB7XHJcbiAgICAgICAgaWYgKHRhcmdldEFuY2VzdG9yR3JhcGggPT0gc291cmNlQW5jZXN0b3JHcmFwaClcclxuICAgICAgICB7XHJcbiAgICAgICAgICBlZGdlLmxjYSA9IHRhcmdldEFuY2VzdG9yR3JhcGg7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0YXJnZXRBbmNlc3RvckdyYXBoID09IHRoaXMucm9vdEdyYXBoKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGVkZ2UubGNhICE9IG51bGwpIHtcclxuICAgICAgICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlZGdlLnRhcmdldEluTGNhID0gdGFyZ2V0QW5jZXN0b3JHcmFwaC5nZXRQYXJlbnQoKTtcclxuICAgICAgICB0YXJnZXRBbmNlc3RvckdyYXBoID0gZWRnZS50YXJnZXRJbkxjYS5nZXRPd25lcigpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc291cmNlQW5jZXN0b3JHcmFwaCA9PSB0aGlzLnJvb3RHcmFwaClcclxuICAgICAge1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZWRnZS5sY2EgPT0gbnVsbClcclxuICAgICAge1xyXG4gICAgICAgIGVkZ2Uuc291cmNlSW5MY2EgPSBzb3VyY2VBbmNlc3RvckdyYXBoLmdldFBhcmVudCgpO1xyXG4gICAgICAgIHNvdXJjZUFuY2VzdG9yR3JhcGggPSBlZGdlLnNvdXJjZUluTGNhLmdldE93bmVyKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoZWRnZS5sY2EgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5jYWxjTG93ZXN0Q29tbW9uQW5jZXN0b3IgPSBmdW5jdGlvbiAoZmlyc3ROb2RlLCBzZWNvbmROb2RlKVxyXG57XHJcbiAgaWYgKGZpcnN0Tm9kZSA9PSBzZWNvbmROb2RlKVxyXG4gIHtcclxuICAgIHJldHVybiBmaXJzdE5vZGUuZ2V0T3duZXIoKTtcclxuICB9XHJcbiAgdmFyIGZpcnN0T3duZXJHcmFwaCA9IGZpcnN0Tm9kZS5nZXRPd25lcigpO1xyXG5cclxuICBkb1xyXG4gIHtcclxuICAgIGlmIChmaXJzdE93bmVyR3JhcGggPT0gbnVsbClcclxuICAgIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICB2YXIgc2Vjb25kT3duZXJHcmFwaCA9IHNlY29uZE5vZGUuZ2V0T3duZXIoKTtcclxuXHJcbiAgICBkb1xyXG4gICAge1xyXG4gICAgICBpZiAoc2Vjb25kT3duZXJHcmFwaCA9PSBudWxsKVxyXG4gICAgICB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzZWNvbmRPd25lckdyYXBoID09IGZpcnN0T3duZXJHcmFwaClcclxuICAgICAge1xyXG4gICAgICAgIHJldHVybiBzZWNvbmRPd25lckdyYXBoO1xyXG4gICAgICB9XHJcbiAgICAgIHNlY29uZE93bmVyR3JhcGggPSBzZWNvbmRPd25lckdyYXBoLmdldFBhcmVudCgpLmdldE93bmVyKCk7XHJcbiAgICB9IHdoaWxlICh0cnVlKTtcclxuXHJcbiAgICBmaXJzdE93bmVyR3JhcGggPSBmaXJzdE93bmVyR3JhcGguZ2V0UGFyZW50KCkuZ2V0T3duZXIoKTtcclxuICB9IHdoaWxlICh0cnVlKTtcclxuXHJcbiAgcmV0dXJuIGZpcnN0T3duZXJHcmFwaDtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmNhbGNJbmNsdXNpb25UcmVlRGVwdGhzID0gZnVuY3Rpb24gKGdyYXBoLCBkZXB0aCkge1xyXG4gIGlmIChncmFwaCA9PSBudWxsICYmIGRlcHRoID09IG51bGwpIHtcclxuICAgIGdyYXBoID0gdGhpcy5yb290R3JhcGg7XHJcbiAgICBkZXB0aCA9IDE7XHJcbiAgfVxyXG4gIHZhciBub2RlO1xyXG5cclxuICB2YXIgbm9kZXMgPSBncmFwaC5nZXROb2RlcygpO1xyXG4gIHZhciBzID0gbm9kZXMubGVuZ3RoO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIG5vZGUgPSBub2Rlc1tpXTtcclxuICAgIG5vZGUuaW5jbHVzaW9uVHJlZURlcHRoID0gZGVwdGg7XHJcblxyXG4gICAgaWYgKG5vZGUuY2hpbGQgIT0gbnVsbClcclxuICAgIHtcclxuICAgICAgdGhpcy5jYWxjSW5jbHVzaW9uVHJlZURlcHRocyhub2RlLmNoaWxkLCBkZXB0aCArIDEpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmluY2x1ZGVzSW52YWxpZEVkZ2UgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIGVkZ2U7XHJcblxyXG4gIHZhciBzID0gdGhpcy5lZGdlcy5sZW5ndGg7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAge1xyXG4gICAgZWRnZSA9IHRoaXMuZWRnZXNbaV07XHJcblxyXG4gICAgaWYgKHRoaXMuaXNPbmVBbmNlc3Rvck9mT3RoZXIoZWRnZS5zb3VyY2UsIGVkZ2UudGFyZ2V0KSlcclxuICAgIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBmYWxzZTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTEdyYXBoTWFuYWdlcjtcclxuIiwiZnVuY3Rpb24gTEdyYXBoT2JqZWN0KHZHcmFwaE9iamVjdCkge1xyXG4gIHRoaXMudkdyYXBoT2JqZWN0ID0gdkdyYXBoT2JqZWN0O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExHcmFwaE9iamVjdDtcclxuIiwidmFyIExHcmFwaE9iamVjdCA9IHJlcXVpcmUoJy4vTEdyYXBoT2JqZWN0Jyk7XHJcbnZhciBJbnRlZ2VyID0gcmVxdWlyZSgnLi9JbnRlZ2VyJyk7XHJcbnZhciBSZWN0YW5nbGVEID0gcmVxdWlyZSgnLi9SZWN0YW5nbGVEJyk7XHJcbnZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xyXG52YXIgUmFuZG9tU2VlZCA9IHJlcXVpcmUoJy4vUmFuZG9tU2VlZCcpO1xyXG52YXIgUG9pbnREID0gcmVxdWlyZSgnLi9Qb2ludEQnKTtcclxudmFyIEhhc2hTZXQgPSByZXF1aXJlKCcuL0hhc2hTZXQnKTtcclxuXHJcbmZ1bmN0aW9uIExOb2RlKGdtLCBsb2MsIHNpemUsIHZOb2RlKSB7XHJcbiAgLy9BbHRlcm5hdGl2ZSBjb25zdHJ1Y3RvciAxIDogTE5vZGUoTEdyYXBoTWFuYWdlciBnbSwgUG9pbnQgbG9jLCBEaW1lbnNpb24gc2l6ZSwgT2JqZWN0IHZOb2RlKVxyXG4gIGlmIChzaXplID09IG51bGwgJiYgdk5vZGUgPT0gbnVsbCkge1xyXG4gICAgdk5vZGUgPSBsb2M7XHJcbiAgfVxyXG5cclxuICBMR3JhcGhPYmplY3QuY2FsbCh0aGlzLCB2Tm9kZSk7XHJcblxyXG4gIC8vQWx0ZXJuYXRpdmUgY29uc3RydWN0b3IgMiA6IExOb2RlKExheW91dCBsYXlvdXQsIE9iamVjdCB2Tm9kZSlcclxuICBpZiAoZ20uZ3JhcGhNYW5hZ2VyICE9IG51bGwpXHJcbiAgICBnbSA9IGdtLmdyYXBoTWFuYWdlcjtcclxuXHJcbiAgdGhpcy5lc3RpbWF0ZWRTaXplID0gSW50ZWdlci5NSU5fVkFMVUU7XHJcbiAgdGhpcy5pbmNsdXNpb25UcmVlRGVwdGggPSBJbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB0aGlzLnZHcmFwaE9iamVjdCA9IHZOb2RlO1xyXG4gIHRoaXMuZWRnZXMgPSBbXTtcclxuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xyXG5cclxuICBpZiAoc2l6ZSAhPSBudWxsICYmIGxvYyAhPSBudWxsKVxyXG4gICAgdGhpcy5yZWN0ID0gbmV3IFJlY3RhbmdsZUQobG9jLngsIGxvYy55LCBzaXplLndpZHRoLCBzaXplLmhlaWdodCk7XHJcbiAgZWxzZVxyXG4gICAgdGhpcy5yZWN0ID0gbmV3IFJlY3RhbmdsZUQoKTtcclxufVxyXG5cclxuTE5vZGUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGhPYmplY3QucHJvdG90eXBlKTtcclxuZm9yICh2YXIgcHJvcCBpbiBMR3JhcGhPYmplY3QpIHtcclxuICBMTm9kZVtwcm9wXSA9IExHcmFwaE9iamVjdFtwcm9wXTtcclxufVxyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldEVkZ2VzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmVkZ2VzO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldENoaWxkID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmNoaWxkO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldE93bmVyID0gZnVuY3Rpb24gKClcclxue1xyXG4gIGlmICh0aGlzLm93bmVyICE9IG51bGwpIHtcclxuICAgIGlmICghKHRoaXMub3duZXIgPT0gbnVsbCB8fCB0aGlzLm93bmVyLmdldE5vZGVzKCkuaW5kZXhPZih0aGlzKSA+IC0xKSkge1xyXG4gICAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzLm93bmVyO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldFdpZHRoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3Qud2lkdGg7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuc2V0V2lkdGggPSBmdW5jdGlvbiAod2lkdGgpXHJcbntcclxuICB0aGlzLnJlY3Qud2lkdGggPSB3aWR0aDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRIZWlnaHQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC5oZWlnaHQ7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuc2V0SGVpZ2h0ID0gZnVuY3Rpb24gKGhlaWdodClcclxue1xyXG4gIHRoaXMucmVjdC5oZWlnaHQgPSBoZWlnaHQ7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0Q2VudGVyWCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0LnggKyB0aGlzLnJlY3Qud2lkdGggLyAyO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldENlbnRlclkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC55ICsgdGhpcy5yZWN0LmhlaWdodCAvIDI7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0Q2VudGVyID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBuZXcgUG9pbnREKHRoaXMucmVjdC54ICsgdGhpcy5yZWN0LndpZHRoIC8gMixcclxuICAgICAgICAgIHRoaXMucmVjdC55ICsgdGhpcy5yZWN0LmhlaWdodCAvIDIpO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldExvY2F0aW9uID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBuZXcgUG9pbnREKHRoaXMucmVjdC54LCB0aGlzLnJlY3QueSk7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0UmVjdCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldERpYWdvbmFsID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBNYXRoLnNxcnQodGhpcy5yZWN0LndpZHRoICogdGhpcy5yZWN0LndpZHRoICtcclxuICAgICAgICAgIHRoaXMucmVjdC5oZWlnaHQgKiB0aGlzLnJlY3QuaGVpZ2h0KTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5zZXRSZWN0ID0gZnVuY3Rpb24gKHVwcGVyTGVmdCwgZGltZW5zaW9uKVxyXG57XHJcbiAgdGhpcy5yZWN0LnggPSB1cHBlckxlZnQueDtcclxuICB0aGlzLnJlY3QueSA9IHVwcGVyTGVmdC55O1xyXG4gIHRoaXMucmVjdC53aWR0aCA9IGRpbWVuc2lvbi53aWR0aDtcclxuICB0aGlzLnJlY3QuaGVpZ2h0ID0gZGltZW5zaW9uLmhlaWdodDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5zZXRDZW50ZXIgPSBmdW5jdGlvbiAoY3gsIGN5KVxyXG57XHJcbiAgdGhpcy5yZWN0LnggPSBjeCAtIHRoaXMucmVjdC53aWR0aCAvIDI7XHJcbiAgdGhpcy5yZWN0LnkgPSBjeSAtIHRoaXMucmVjdC5oZWlnaHQgLyAyO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnNldExvY2F0aW9uID0gZnVuY3Rpb24gKHgsIHkpXHJcbntcclxuICB0aGlzLnJlY3QueCA9IHg7XHJcbiAgdGhpcy5yZWN0LnkgPSB5O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLm1vdmVCeSA9IGZ1bmN0aW9uIChkeCwgZHkpXHJcbntcclxuICB0aGlzLnJlY3QueCArPSBkeDtcclxuICB0aGlzLnJlY3QueSArPSBkeTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRFZGdlTGlzdFRvTm9kZSA9IGZ1bmN0aW9uICh0bylcclxue1xyXG4gIHZhciBlZGdlTGlzdCA9IFtdO1xyXG4gIHZhciBlZGdlO1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgc2VsZi5lZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKGVkZ2UpIHtcclxuICAgIFxyXG4gICAgaWYgKGVkZ2UudGFyZ2V0ID09IHRvKVxyXG4gICAge1xyXG4gICAgICBpZiAoZWRnZS5zb3VyY2UgIT0gc2VsZilcclxuICAgICAgICB0aHJvdyBcIkluY29ycmVjdCBlZGdlIHNvdXJjZSFcIjtcclxuXHJcbiAgICAgIGVkZ2VMaXN0LnB1c2goZWRnZSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiBlZGdlTGlzdDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRFZGdlc0JldHdlZW4gPSBmdW5jdGlvbiAob3RoZXIpXHJcbntcclxuICB2YXIgZWRnZUxpc3QgPSBbXTtcclxuICB2YXIgZWRnZTtcclxuICBcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgc2VsZi5lZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKGVkZ2UpIHtcclxuXHJcbiAgICBpZiAoIShlZGdlLnNvdXJjZSA9PSBzZWxmIHx8IGVkZ2UudGFyZ2V0ID09IHNlbGYpKVxyXG4gICAgICB0aHJvdyBcIkluY29ycmVjdCBlZGdlIHNvdXJjZSBhbmQvb3IgdGFyZ2V0XCI7XHJcblxyXG4gICAgaWYgKChlZGdlLnRhcmdldCA9PSBvdGhlcikgfHwgKGVkZ2Uuc291cmNlID09IG90aGVyKSlcclxuICAgIHtcclxuICAgICAgZWRnZUxpc3QucHVzaChlZGdlKTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIGVkZ2VMaXN0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldE5laWdoYm9yc0xpc3QgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIG5laWdoYm9ycyA9IG5ldyBIYXNoU2V0KCk7XHJcbiAgdmFyIGVkZ2U7XHJcbiAgXHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHNlbGYuZWRnZXMuZm9yRWFjaChmdW5jdGlvbihlZGdlKSB7XHJcblxyXG4gICAgaWYgKGVkZ2Uuc291cmNlID09IHNlbGYpXHJcbiAgICB7XHJcbiAgICAgIG5laWdoYm9ycy5hZGQoZWRnZS50YXJnZXQpO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICBpZiAoZWRnZS50YXJnZXQgIT0gc2VsZikge1xyXG4gICAgICAgIHRocm93IFwiSW5jb3JyZWN0IGluY2lkZW5jeSFcIjtcclxuICAgICAgfVxyXG4gICAgXHJcbiAgICAgIG5laWdoYm9ycy5hZGQoZWRnZS5zb3VyY2UpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gbmVpZ2hib3JzO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLndpdGhDaGlsZHJlbiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgd2l0aE5laWdoYm9yc0xpc3QgPSBbXTtcclxuICB2YXIgY2hpbGROb2RlO1xyXG5cclxuICB3aXRoTmVpZ2hib3JzTGlzdC5wdXNoKHRoaXMpO1xyXG5cclxuICBpZiAodGhpcy5jaGlsZCAhPSBudWxsKVxyXG4gIHtcclxuICAgIHZhciBub2RlcyA9IHRoaXMuY2hpbGQuZ2V0Tm9kZXMoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIGNoaWxkTm9kZSA9IG5vZGVzW2ldO1xyXG5cclxuICAgICAgd2l0aE5laWdoYm9yc0xpc3QgPSB3aXRoTmVpZ2hib3JzTGlzdC5jb25jYXQoY2hpbGROb2RlLndpdGhDaGlsZHJlbigpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB3aXRoTmVpZ2hib3JzTGlzdDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRFc3RpbWF0ZWRTaXplID0gZnVuY3Rpb24gKCkge1xyXG4gIGlmICh0aGlzLmVzdGltYXRlZFNpemUgPT0gSW50ZWdlci5NSU5fVkFMVUUpIHtcclxuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5lc3RpbWF0ZWRTaXplO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmNhbGNFc3RpbWF0ZWRTaXplID0gZnVuY3Rpb24gKCkge1xyXG4gIGlmICh0aGlzLmNoaWxkID09IG51bGwpXHJcbiAge1xyXG4gICAgcmV0dXJuIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IE1hdGguZmxvb3IoKHRoaXMucmVjdC53aWR0aCArIHRoaXMucmVjdC5oZWlnaHQpIC8gMik7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICB0aGlzLmVzdGltYXRlZFNpemUgPSB0aGlzLmNoaWxkLmNhbGNFc3RpbWF0ZWRTaXplKCk7XHJcbiAgICB0aGlzLnJlY3Qud2lkdGggPSB0aGlzLmVzdGltYXRlZFNpemU7XHJcbiAgICB0aGlzLnJlY3QuaGVpZ2h0ID0gdGhpcy5lc3RpbWF0ZWRTaXplO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmVzdGltYXRlZFNpemU7XHJcbiAgfVxyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnNjYXR0ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHJhbmRvbUNlbnRlclg7XHJcbiAgdmFyIHJhbmRvbUNlbnRlclk7XHJcblxyXG4gIHZhciBtaW5YID0gLUxheW91dENvbnN0YW50cy5JTklUSUFMX1dPUkxEX0JPVU5EQVJZO1xyXG4gIHZhciBtYXhYID0gTGF5b3V0Q29uc3RhbnRzLklOSVRJQUxfV09STERfQk9VTkRBUlk7XHJcbiAgcmFuZG9tQ2VudGVyWCA9IExheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWCArXHJcbiAgICAgICAgICAoUmFuZG9tU2VlZC5uZXh0RG91YmxlKCkgKiAobWF4WCAtIG1pblgpKSArIG1pblg7XHJcblxyXG4gIHZhciBtaW5ZID0gLUxheW91dENvbnN0YW50cy5JTklUSUFMX1dPUkxEX0JPVU5EQVJZO1xyXG4gIHZhciBtYXhZID0gTGF5b3V0Q29uc3RhbnRzLklOSVRJQUxfV09STERfQk9VTkRBUlk7XHJcbiAgcmFuZG9tQ2VudGVyWSA9IExheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWSArXHJcbiAgICAgICAgICAoUmFuZG9tU2VlZC5uZXh0RG91YmxlKCkgKiAobWF4WSAtIG1pblkpKSArIG1pblk7XHJcblxyXG4gIHRoaXMucmVjdC54ID0gcmFuZG9tQ2VudGVyWDtcclxuICB0aGlzLnJlY3QueSA9IHJhbmRvbUNlbnRlcllcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS51cGRhdGVCb3VuZHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKHRoaXMuZ2V0Q2hpbGQoKSA9PSBudWxsKSB7XHJcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICB9XHJcbiAgaWYgKHRoaXMuZ2V0Q2hpbGQoKS5nZXROb2RlcygpLmxlbmd0aCAhPSAwKVxyXG4gIHtcclxuICAgIC8vIHdyYXAgdGhlIGNoaWxkcmVuIG5vZGVzIGJ5IHJlLWFycmFuZ2luZyB0aGUgYm91bmRhcmllc1xyXG4gICAgdmFyIGNoaWxkR3JhcGggPSB0aGlzLmdldENoaWxkKCk7XHJcbiAgICBjaGlsZEdyYXBoLnVwZGF0ZUJvdW5kcyh0cnVlKTtcclxuXHJcbiAgICB0aGlzLnJlY3QueCA9IGNoaWxkR3JhcGguZ2V0TGVmdCgpO1xyXG4gICAgdGhpcy5yZWN0LnkgPSBjaGlsZEdyYXBoLmdldFRvcCgpO1xyXG5cclxuICAgIHRoaXMuc2V0V2lkdGgoY2hpbGRHcmFwaC5nZXRSaWdodCgpIC0gY2hpbGRHcmFwaC5nZXRMZWZ0KCkpO1xyXG4gICAgdGhpcy5zZXRIZWlnaHQoY2hpbGRHcmFwaC5nZXRCb3R0b20oKSAtIGNoaWxkR3JhcGguZ2V0VG9wKCkpO1xyXG4gIH1cclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRJbmNsdXNpb25UcmVlRGVwdGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgaWYgKHRoaXMuaW5jbHVzaW9uVHJlZURlcHRoID09IEludGVnZXIuTUFYX1ZBTFVFKSB7XHJcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMuaW5jbHVzaW9uVHJlZURlcHRoO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnRyYW5zZm9ybSA9IGZ1bmN0aW9uICh0cmFucylcclxue1xyXG4gIHZhciBsZWZ0ID0gdGhpcy5yZWN0Lng7XHJcblxyXG4gIGlmIChsZWZ0ID4gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxyXG4gIHtcclxuICAgIGxlZnQgPSBMYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKGxlZnQgPCAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxyXG4gIHtcclxuICAgIGxlZnQgPSAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZO1xyXG4gIH1cclxuXHJcbiAgdmFyIHRvcCA9IHRoaXMucmVjdC55O1xyXG5cclxuICBpZiAodG9wID4gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxyXG4gIHtcclxuICAgIHRvcCA9IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWTtcclxuICB9XHJcbiAgZWxzZSBpZiAodG9wIDwgLUxheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSlcclxuICB7XHJcbiAgICB0b3AgPSAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZO1xyXG4gIH1cclxuXHJcbiAgdmFyIGxlZnRUb3AgPSBuZXcgUG9pbnREKGxlZnQsIHRvcCk7XHJcbiAgdmFyIHZMZWZ0VG9wID0gdHJhbnMuaW52ZXJzZVRyYW5zZm9ybVBvaW50KGxlZnRUb3ApO1xyXG5cclxuICB0aGlzLnNldExvY2F0aW9uKHZMZWZ0VG9wLngsIHZMZWZ0VG9wLnkpO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldExlZnQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC54O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldFJpZ2h0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3QueCArIHRoaXMucmVjdC53aWR0aDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRUb3AgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC55O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldEJvdHRvbSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0LnkgKyB0aGlzLnJlY3QuaGVpZ2h0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldFBhcmVudCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcy5vd25lciA9PSBudWxsKVxyXG4gIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXMub3duZXIuZ2V0UGFyZW50KCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExOb2RlO1xyXG4iLCJ2YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcclxudmFyIEhhc2hNYXAgPSByZXF1aXJlKCcuL0hhc2hNYXAnKTtcclxudmFyIExHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0xHcmFwaE1hbmFnZXInKTtcclxudmFyIExOb2RlID0gcmVxdWlyZSgnLi9MTm9kZScpO1xyXG52YXIgTEVkZ2UgPSByZXF1aXJlKCcuL0xFZGdlJyk7XHJcbnZhciBMR3JhcGggPSByZXF1aXJlKCcuL0xHcmFwaCcpO1xyXG52YXIgUG9pbnREID0gcmVxdWlyZSgnLi9Qb2ludEQnKTtcclxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyk7XHJcbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnLi9FbWl0dGVyJyk7XHJcbnZhciBIYXNoU2V0ID0gcmVxdWlyZSgnLi9IYXNoU2V0Jyk7XHJcblxyXG5mdW5jdGlvbiBMYXlvdXQoaXNSZW1vdGVVc2UpIHtcclxuICBFbWl0dGVyLmNhbGwoIHRoaXMgKTtcclxuXHJcbiAgLy9MYXlvdXQgUXVhbGl0eTogMDpwcm9vZiwgMTpkZWZhdWx0LCAyOmRyYWZ0XHJcbiAgdGhpcy5sYXlvdXRRdWFsaXR5ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUVVBTElUWTtcclxuICAvL1doZXRoZXIgbGF5b3V0IHNob3VsZCBjcmVhdGUgYmVuZHBvaW50cyBhcyBuZWVkZWQgb3Igbm90XHJcbiAgdGhpcy5jcmVhdGVCZW5kc0FzTmVlZGVkID1cclxuICAgICAgICAgIExheW91dENvbnN0YW50cy5ERUZBVUxUX0NSRUFURV9CRU5EU19BU19ORUVERUQ7XHJcbiAgLy9XaGV0aGVyIGxheW91dCBzaG91bGQgYmUgaW5jcmVtZW50YWwgb3Igbm90XHJcbiAgdGhpcy5pbmNyZW1lbnRhbCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMO1xyXG4gIC8vV2hldGhlciB3ZSBhbmltYXRlIGZyb20gYmVmb3JlIHRvIGFmdGVyIGxheW91dCBub2RlIHBvc2l0aW9uc1xyXG4gIHRoaXMuYW5pbWF0aW9uT25MYXlvdXQgPVxyXG4gICAgICAgICAgTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX09OX0xBWU9VVDtcclxuICAvL1doZXRoZXIgd2UgYW5pbWF0ZSB0aGUgbGF5b3V0IHByb2Nlc3Mgb3Igbm90XHJcbiAgdGhpcy5hbmltYXRpb25EdXJpbmdMYXlvdXQgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fRFVSSU5HX0xBWU9VVDtcclxuICAvL051bWJlciBpdGVyYXRpb25zIHRoYXQgc2hvdWxkIGJlIGRvbmUgYmV0d2VlbiB0d28gc3VjY2Vzc2l2ZSBhbmltYXRpb25zXHJcbiAgdGhpcy5hbmltYXRpb25QZXJpb2QgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fUEVSSU9EO1xyXG4gIC8qKlxyXG4gICAqIFdoZXRoZXIgb3Igbm90IGxlYWYgbm9kZXMgKG5vbi1jb21wb3VuZCBub2RlcykgYXJlIG9mIHVuaWZvcm0gc2l6ZXMuIFdoZW5cclxuICAgKiB0aGV5IGFyZSwgYm90aCBzcHJpbmcgYW5kIHJlcHVsc2lvbiBmb3JjZXMgYmV0d2VlbiB0d28gbGVhZiBub2RlcyBjYW4gYmVcclxuICAgKiBjYWxjdWxhdGVkIHdpdGhvdXQgdGhlIGV4cGVuc2l2ZSBjbGlwcGluZyBwb2ludCBjYWxjdWxhdGlvbnMsIHJlc3VsdGluZ1xyXG4gICAqIGluIG1ham9yIHNwZWVkLXVwLlxyXG4gICAqL1xyXG4gIHRoaXMudW5pZm9ybUxlYWZOb2RlU2l6ZXMgPVxyXG4gICAgICAgICAgTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVU5JRk9STV9MRUFGX05PREVfU0laRVM7XHJcbiAgLyoqXHJcbiAgICogVGhpcyBpcyB1c2VkIGZvciBjcmVhdGlvbiBvZiBiZW5kcG9pbnRzIGJ5IHVzaW5nIGR1bW15IG5vZGVzIGFuZCBlZGdlcy5cclxuICAgKiBNYXBzIGFuIExFZGdlIHRvIGl0cyBkdW1teSBiZW5kcG9pbnQgcGF0aC5cclxuICAgKi9cclxuICB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMgPSBuZXcgSGFzaE1hcCgpO1xyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyID0gbmV3IExHcmFwaE1hbmFnZXIodGhpcyk7XHJcbiAgdGhpcy5pc0xheW91dEZpbmlzaGVkID0gZmFsc2U7XHJcbiAgdGhpcy5pc1N1YkxheW91dCA9IGZhbHNlO1xyXG4gIHRoaXMuaXNSZW1vdGVVc2UgPSBmYWxzZTtcclxuXHJcbiAgaWYgKGlzUmVtb3RlVXNlICE9IG51bGwpIHtcclxuICAgIHRoaXMuaXNSZW1vdGVVc2UgPSBpc1JlbW90ZVVzZTtcclxuICB9XHJcbn1cclxuXHJcbkxheW91dC5SQU5ET01fU0VFRCA9IDE7XHJcblxyXG5MYXlvdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRW1pdHRlci5wcm90b3R5cGUgKTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUuZ2V0R3JhcGhNYW5hZ2VyID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLmdyYXBoTWFuYWdlcjtcclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUuZ2V0QWxsTm9kZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzKCk7XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLmdldEFsbEVkZ2VzID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxFZGdlcygpO1xyXG59O1xyXG5cclxuTGF5b3V0LnByb3RvdHlwZS5nZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24oKTtcclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUubmV3R3JhcGhNYW5hZ2VyID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBnbSA9IG5ldyBMR3JhcGhNYW5hZ2VyKHRoaXMpO1xyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyID0gZ207XHJcbiAgcmV0dXJuIGdtO1xyXG59O1xyXG5cclxuTGF5b3V0LnByb3RvdHlwZS5uZXdHcmFwaCA9IGZ1bmN0aW9uICh2R3JhcGgpXHJcbntcclxuICByZXR1cm4gbmV3IExHcmFwaChudWxsLCB0aGlzLmdyYXBoTWFuYWdlciwgdkdyYXBoKTtcclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUubmV3Tm9kZSA9IGZ1bmN0aW9uICh2Tm9kZSlcclxue1xyXG4gIHJldHVybiBuZXcgTE5vZGUodGhpcy5ncmFwaE1hbmFnZXIsIHZOb2RlKTtcclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUubmV3RWRnZSA9IGZ1bmN0aW9uICh2RWRnZSlcclxue1xyXG4gIHJldHVybiBuZXcgTEVkZ2UobnVsbCwgbnVsbCwgdkVkZ2UpO1xyXG59O1xyXG5cclxuTGF5b3V0LnByb3RvdHlwZS5ydW5MYXlvdXQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdGhpcy5pc0xheW91dEZpbmlzaGVkID0gZmFsc2U7XHJcbiAgXHJcbiAgaWYgKHRoaXMudGlsaW5nUHJlTGF5b3V0KSB7XHJcbiAgICB0aGlzLnRpbGluZ1ByZUxheW91dCgpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5pbml0UGFyYW1ldGVycygpO1xyXG4gIHZhciBpc0xheW91dFN1Y2Nlc3NmdWxsO1xyXG5cclxuICBpZiAoKHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKSA9PSBudWxsKVxyXG4gICAgICAgICAgfHwgdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmdldE5vZGVzKCkubGVuZ3RoID09IDBcclxuICAgICAgICAgIHx8IHRoaXMuZ3JhcGhNYW5hZ2VyLmluY2x1ZGVzSW52YWxpZEVkZ2UoKSlcclxuICB7XHJcbiAgICBpc0xheW91dFN1Y2Nlc3NmdWxsID0gZmFsc2U7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICAvLyBjYWxjdWxhdGUgZXhlY3V0aW9uIHRpbWVcclxuICAgIHZhciBzdGFydFRpbWUgPSAwO1xyXG5cclxuICAgIGlmICghdGhpcy5pc1N1YkxheW91dClcclxuICAgIHtcclxuICAgICAgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKClcclxuICAgIH1cclxuXHJcbiAgICBpc0xheW91dFN1Y2Nlc3NmdWxsID0gdGhpcy5sYXlvdXQoKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuaXNTdWJMYXlvdXQpXHJcbiAgICB7XHJcbiAgICAgIHZhciBlbmRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgIHZhciBleGNUaW1lID0gZW5kVGltZSAtIHN0YXJ0VGltZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChpc0xheW91dFN1Y2Nlc3NmdWxsKVxyXG4gIHtcclxuICAgIGlmICghdGhpcy5pc1N1YkxheW91dClcclxuICAgIHtcclxuICAgICAgdGhpcy5kb1Bvc3RMYXlvdXQoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmICh0aGlzLnRpbGluZ1Bvc3RMYXlvdXQpIHtcclxuICAgIHRoaXMudGlsaW5nUG9zdExheW91dCgpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5pc0xheW91dEZpbmlzaGVkID0gdHJ1ZTtcclxuXHJcbiAgcmV0dXJuIGlzTGF5b3V0U3VjY2Vzc2Z1bGw7XHJcbn07XHJcblxyXG4vKipcclxuICogVGhpcyBtZXRob2QgcGVyZm9ybXMgdGhlIG9wZXJhdGlvbnMgcmVxdWlyZWQgYWZ0ZXIgbGF5b3V0LlxyXG4gKi9cclxuTGF5b3V0LnByb3RvdHlwZS5kb1Bvc3RMYXlvdXQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgLy9hc3NlcnQgIWlzU3ViTGF5b3V0IDogXCJTaG91bGQgbm90IGJlIGNhbGxlZCBvbiBzdWItbGF5b3V0IVwiO1xyXG4gIC8vIFByb3BhZ2F0ZSBnZW9tZXRyaWMgY2hhbmdlcyB0byB2LWxldmVsIG9iamVjdHNcclxuICB0aGlzLnRyYW5zZm9ybSgpO1xyXG4gIHRoaXMudXBkYXRlKCk7XHJcbn07XHJcblxyXG4vKipcclxuICogVGhpcyBtZXRob2QgdXBkYXRlcyB0aGUgZ2VvbWV0cnkgb2YgdGhlIHRhcmdldCBncmFwaCBhY2NvcmRpbmcgdG9cclxuICogY2FsY3VsYXRlZCBsYXlvdXQuXHJcbiAqL1xyXG5MYXlvdXQucHJvdG90eXBlLnVwZGF0ZTIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gdXBkYXRlIGJlbmQgcG9pbnRzXHJcbiAgaWYgKHRoaXMuY3JlYXRlQmVuZHNBc05lZWRlZClcclxuICB7XHJcbiAgICB0aGlzLmNyZWF0ZUJlbmRwb2ludHNGcm9tRHVtbXlOb2RlcygpO1xyXG5cclxuICAgIC8vIHJlc2V0IGFsbCBlZGdlcywgc2luY2UgdGhlIHRvcG9sb2d5IGhhcyBjaGFuZ2VkXHJcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZXNldEFsbEVkZ2VzKCk7XHJcbiAgfVxyXG5cclxuICAvLyBwZXJmb3JtIGVkZ2UsIG5vZGUgYW5kIHJvb3QgdXBkYXRlcyBpZiBsYXlvdXQgaXMgbm90IGNhbGxlZFxyXG4gIC8vIHJlbW90ZWx5XHJcbiAgaWYgKCF0aGlzLmlzUmVtb3RlVXNlKVxyXG4gIHtcclxuICAgIC8vIHVwZGF0ZSBhbGwgZWRnZXNcclxuICAgIHZhciBlZGdlO1xyXG4gICAgdmFyIGFsbEVkZ2VzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsRWRnZXMoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsRWRnZXMubGVuZ3RoOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIGVkZ2UgPSBhbGxFZGdlc1tpXTtcclxuLy8gICAgICB0aGlzLnVwZGF0ZShlZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyByZWN1cnNpdmVseSB1cGRhdGUgbm9kZXNcclxuICAgIHZhciBub2RlO1xyXG4gICAgdmFyIG5vZGVzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmdldE5vZGVzKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gICAge1xyXG4gICAgICBub2RlID0gbm9kZXNbaV07XHJcbi8vICAgICAgdGhpcy51cGRhdGUobm9kZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdXBkYXRlIHJvb3QgZ3JhcGhcclxuICAgIHRoaXMudXBkYXRlKHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKSk7XHJcbiAgfVxyXG59O1xyXG5cclxuTGF5b3V0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgaWYgKG9iaiA9PSBudWxsKSB7XHJcbiAgICB0aGlzLnVwZGF0ZTIoKTtcclxuICB9XHJcbiAgZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgTE5vZGUpIHtcclxuICAgIHZhciBub2RlID0gb2JqO1xyXG4gICAgaWYgKG5vZGUuZ2V0Q2hpbGQoKSAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICAvLyBzaW5jZSBub2RlIGlzIGNvbXBvdW5kLCByZWN1cnNpdmVseSB1cGRhdGUgY2hpbGQgbm9kZXNcclxuICAgICAgdmFyIG5vZGVzID0gbm9kZS5nZXRDaGlsZCgpLmdldE5vZGVzKCk7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspXHJcbiAgICAgIHtcclxuICAgICAgICB1cGRhdGUobm9kZXNbaV0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgdGhlIGwtbGV2ZWwgbm9kZSBpcyBhc3NvY2lhdGVkIHdpdGggYSB2LWxldmVsIGdyYXBoIG9iamVjdCxcclxuICAgIC8vIHRoZW4gaXQgaXMgYXNzdW1lZCB0aGF0IHRoZSB2LWxldmVsIG5vZGUgaW1wbGVtZW50cyB0aGVcclxuICAgIC8vIGludGVyZmFjZSBVcGRhdGFibGUuXHJcbiAgICBpZiAobm9kZS52R3JhcGhPYmplY3QgIT0gbnVsbClcclxuICAgIHtcclxuICAgICAgLy8gY2FzdCB0byBVcGRhdGFibGUgd2l0aG91dCBhbnkgdHlwZSBjaGVja1xyXG4gICAgICB2YXIgdk5vZGUgPSBub2RlLnZHcmFwaE9iamVjdDtcclxuXHJcbiAgICAgIC8vIGNhbGwgdGhlIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGludGVyZmFjZVxyXG4gICAgICB2Tm9kZS51cGRhdGUobm9kZSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIExFZGdlKSB7XHJcbiAgICB2YXIgZWRnZSA9IG9iajtcclxuICAgIC8vIGlmIHRoZSBsLWxldmVsIGVkZ2UgaXMgYXNzb2NpYXRlZCB3aXRoIGEgdi1sZXZlbCBncmFwaCBvYmplY3QsXHJcbiAgICAvLyB0aGVuIGl0IGlzIGFzc3VtZWQgdGhhdCB0aGUgdi1sZXZlbCBlZGdlIGltcGxlbWVudHMgdGhlXHJcbiAgICAvLyBpbnRlcmZhY2UgVXBkYXRhYmxlLlxyXG5cclxuICAgIGlmIChlZGdlLnZHcmFwaE9iamVjdCAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICAvLyBjYXN0IHRvIFVwZGF0YWJsZSB3aXRob3V0IGFueSB0eXBlIGNoZWNrXHJcbiAgICAgIHZhciB2RWRnZSA9IGVkZ2UudkdyYXBoT2JqZWN0O1xyXG5cclxuICAgICAgLy8gY2FsbCB0aGUgdXBkYXRlIG1ldGhvZCBvZiB0aGUgaW50ZXJmYWNlXHJcbiAgICAgIHZFZGdlLnVwZGF0ZShlZGdlKTtcclxuICAgIH1cclxuICB9XHJcbiAgZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgTEdyYXBoKSB7XHJcbiAgICB2YXIgZ3JhcGggPSBvYmo7XHJcbiAgICAvLyBpZiB0aGUgbC1sZXZlbCBncmFwaCBpcyBhc3NvY2lhdGVkIHdpdGggYSB2LWxldmVsIGdyYXBoIG9iamVjdCxcclxuICAgIC8vIHRoZW4gaXQgaXMgYXNzdW1lZCB0aGF0IHRoZSB2LWxldmVsIG9iamVjdCBpbXBsZW1lbnRzIHRoZVxyXG4gICAgLy8gaW50ZXJmYWNlIFVwZGF0YWJsZS5cclxuXHJcbiAgICBpZiAoZ3JhcGgudkdyYXBoT2JqZWN0ICE9IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIC8vIGNhc3QgdG8gVXBkYXRhYmxlIHdpdGhvdXQgYW55IHR5cGUgY2hlY2tcclxuICAgICAgdmFyIHZHcmFwaCA9IGdyYXBoLnZHcmFwaE9iamVjdDtcclxuXHJcbiAgICAgIC8vIGNhbGwgdGhlIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGludGVyZmFjZVxyXG4gICAgICB2R3JhcGgudXBkYXRlKGdyYXBoKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogVGhpcyBtZXRob2QgaXMgdXNlZCB0byBzZXQgYWxsIGxheW91dCBwYXJhbWV0ZXJzIHRvIGRlZmF1bHQgdmFsdWVzXHJcbiAqIGRldGVybWluZWQgYXQgY29tcGlsZSB0aW1lLlxyXG4gKi9cclxuTGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycyA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAoIXRoaXMuaXNTdWJMYXlvdXQpXHJcbiAge1xyXG4gICAgdGhpcy5sYXlvdXRRdWFsaXR5ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUVVBTElUWTtcclxuICAgIHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX09OX0xBWU9VVDtcclxuICAgIHRoaXMuYW5pbWF0aW9uUGVyaW9kID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX1BFUklPRDtcclxuICAgIHRoaXMuYW5pbWF0aW9uT25MYXlvdXQgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fRFVSSU5HX0xBWU9VVDtcclxuICAgIHRoaXMuaW5jcmVtZW50YWwgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTDtcclxuICAgIHRoaXMuY3JlYXRlQmVuZHNBc05lZWRlZCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0NSRUFURV9CRU5EU19BU19ORUVERUQ7XHJcbiAgICB0aGlzLnVuaWZvcm1MZWFmTm9kZVNpemVzID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVU5JRk9STV9MRUFGX05PREVfU0laRVM7XHJcbiAgfVxyXG5cclxuICBpZiAodGhpcy5hbmltYXRpb25EdXJpbmdMYXlvdXQpXHJcbiAge1xyXG4gICAgYW5pbWF0aW9uT25MYXlvdXQgPSBmYWxzZTtcclxuICB9XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChuZXdMZWZ0VG9wKSB7XHJcbiAgaWYgKG5ld0xlZnRUb3AgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICB0aGlzLnRyYW5zZm9ybShuZXcgUG9pbnREKDAsIDApKTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICAvLyBjcmVhdGUgYSB0cmFuc2Zvcm1hdGlvbiBvYmplY3QgKGZyb20gRWNsaXBzZSB0byBsYXlvdXQpLiBXaGVuIGFuXHJcbiAgICAvLyBpbnZlcnNlIHRyYW5zZm9ybSBpcyBhcHBsaWVkLCB3ZSBnZXQgdXBwZXItbGVmdCBjb29yZGluYXRlIG9mIHRoZVxyXG4gICAgLy8gZHJhd2luZyBvciB0aGUgcm9vdCBncmFwaCBhdCBnaXZlbiBpbnB1dCBjb29yZGluYXRlIChzb21lIG1hcmdpbnNcclxuICAgIC8vIGFscmVhZHkgaW5jbHVkZWQgaW4gY2FsY3VsYXRpb24gb2YgbGVmdC10b3ApLlxyXG5cclxuICAgIHZhciB0cmFucyA9IG5ldyBUcmFuc2Zvcm0oKTtcclxuICAgIHZhciBsZWZ0VG9wID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLnVwZGF0ZUxlZnRUb3AoKTtcclxuXHJcbiAgICBpZiAobGVmdFRvcCAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICB0cmFucy5zZXRXb3JsZE9yZ1gobmV3TGVmdFRvcC54KTtcclxuICAgICAgdHJhbnMuc2V0V29ybGRPcmdZKG5ld0xlZnRUb3AueSk7XHJcblxyXG4gICAgICB0cmFucy5zZXREZXZpY2VPcmdYKGxlZnRUb3AueCk7XHJcbiAgICAgIHRyYW5zLnNldERldmljZU9yZ1kobGVmdFRvcC55KTtcclxuXHJcbiAgICAgIHZhciBub2RlcyA9IHRoaXMuZ2V0QWxsTm9kZXMoKTtcclxuICAgICAgdmFyIG5vZGU7XHJcblxyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gICAgICB7XHJcbiAgICAgICAgbm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgICAgIG5vZGUudHJhbnNmb3JtKHRyYW5zKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUucG9zaXRpb25Ob2Rlc1JhbmRvbWx5ID0gZnVuY3Rpb24gKGdyYXBoKSB7XHJcblxyXG4gIGlmIChncmFwaCA9PSB1bmRlZmluZWQpIHtcclxuICAgIC8vYXNzZXJ0ICF0aGlzLmluY3JlbWVudGFsO1xyXG4gICAgdGhpcy5wb3NpdGlvbk5vZGVzUmFuZG9tbHkodGhpcy5nZXRHcmFwaE1hbmFnZXIoKS5nZXRSb290KCkpO1xyXG4gICAgdGhpcy5nZXRHcmFwaE1hbmFnZXIoKS5nZXRSb290KCkudXBkYXRlQm91bmRzKHRydWUpO1xyXG4gIH1cclxuICBlbHNlIHtcclxuICAgIHZhciBsTm9kZTtcclxuICAgIHZhciBjaGlsZEdyYXBoO1xyXG5cclxuICAgIHZhciBub2RlcyA9IGdyYXBoLmdldE5vZGVzKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gICAge1xyXG4gICAgICBsTm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgICBjaGlsZEdyYXBoID0gbE5vZGUuZ2V0Q2hpbGQoKTtcclxuXHJcbiAgICAgIGlmIChjaGlsZEdyYXBoID09IG51bGwpXHJcbiAgICAgIHtcclxuICAgICAgICBsTm9kZS5zY2F0dGVyKCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoY2hpbGRHcmFwaC5nZXROb2RlcygpLmxlbmd0aCA9PSAwKVxyXG4gICAgICB7XHJcbiAgICAgICAgbE5vZGUuc2NhdHRlcigpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2VcclxuICAgICAge1xyXG4gICAgICAgIHRoaXMucG9zaXRpb25Ob2Rlc1JhbmRvbWx5KGNoaWxkR3JhcGgpO1xyXG4gICAgICAgIGxOb2RlLnVwZGF0ZUJvdW5kcygpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIHJldHVybnMgYSBsaXN0IG9mIHRyZWVzIHdoZXJlIGVhY2ggdHJlZSBpcyByZXByZXNlbnRlZCBhcyBhXHJcbiAqIGxpc3Qgb2YgbC1ub2Rlcy4gVGhlIG1ldGhvZCByZXR1cm5zIGEgbGlzdCBvZiBzaXplIDAgd2hlbjpcclxuICogLSBUaGUgZ3JhcGggaXMgbm90IGZsYXQgb3JcclxuICogLSBPbmUgb2YgdGhlIGNvbXBvbmVudChzKSBvZiB0aGUgZ3JhcGggaXMgbm90IGEgdHJlZS5cclxuICovXHJcbkxheW91dC5wcm90b3R5cGUuZ2V0RmxhdEZvcmVzdCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgZmxhdEZvcmVzdCA9IFtdO1xyXG4gIHZhciBpc0ZvcmVzdCA9IHRydWU7XHJcblxyXG4gIC8vIFF1aWNrIHJlZmVyZW5jZSBmb3IgYWxsIG5vZGVzIGluIHRoZSBncmFwaCBtYW5hZ2VyIGFzc29jaWF0ZWQgd2l0aFxyXG4gIC8vIHRoaXMgbGF5b3V0LiBUaGUgbGlzdCBzaG91bGQgbm90IGJlIGNoYW5nZWQuXHJcbiAgdmFyIGFsbE5vZGVzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmdldE5vZGVzKCk7XHJcblxyXG4gIC8vIEZpcnN0IGJlIHN1cmUgdGhhdCB0aGUgZ3JhcGggaXMgZmxhdFxyXG4gIHZhciBpc0ZsYXQgPSB0cnVlO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbE5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIGlmIChhbGxOb2Rlc1tpXS5nZXRDaGlsZCgpICE9IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGlzRmxhdCA9IGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gUmV0dXJuIGVtcHR5IGZvcmVzdCBpZiB0aGUgZ3JhcGggaXMgbm90IGZsYXQuXHJcbiAgaWYgKCFpc0ZsYXQpXHJcbiAge1xyXG4gICAgcmV0dXJuIGZsYXRGb3Jlc3Q7XHJcbiAgfVxyXG5cclxuICAvLyBSdW4gQkZTIGZvciBlYWNoIGNvbXBvbmVudCBvZiB0aGUgZ3JhcGguXHJcblxyXG4gIHZhciB2aXNpdGVkID0gbmV3IEhhc2hTZXQoKTtcclxuICB2YXIgdG9CZVZpc2l0ZWQgPSBbXTtcclxuICB2YXIgcGFyZW50cyA9IG5ldyBIYXNoTWFwKCk7XHJcbiAgdmFyIHVuUHJvY2Vzc2VkTm9kZXMgPSBbXTtcclxuXHJcbiAgdW5Qcm9jZXNzZWROb2RlcyA9IHVuUHJvY2Vzc2VkTm9kZXMuY29uY2F0KGFsbE5vZGVzKTtcclxuXHJcbiAgLy8gRWFjaCBpdGVyYXRpb24gb2YgdGhpcyBsb29wIGZpbmRzIGEgY29tcG9uZW50IG9mIHRoZSBncmFwaCBhbmRcclxuICAvLyBkZWNpZGVzIHdoZXRoZXIgaXQgaXMgYSB0cmVlIG9yIG5vdC4gSWYgaXQgaXMgYSB0cmVlLCBhZGRzIGl0IHRvIHRoZVxyXG4gIC8vIGZvcmVzdCBhbmQgY29udGludWVkIHdpdGggdGhlIG5leHQgY29tcG9uZW50LlxyXG5cclxuICB3aGlsZSAodW5Qcm9jZXNzZWROb2Rlcy5sZW5ndGggPiAwICYmIGlzRm9yZXN0KVxyXG4gIHtcclxuICAgIHRvQmVWaXNpdGVkLnB1c2godW5Qcm9jZXNzZWROb2Rlc1swXSk7XHJcblxyXG4gICAgLy8gU3RhcnQgdGhlIEJGUy4gRWFjaCBpdGVyYXRpb24gb2YgdGhpcyBsb29wIHZpc2l0cyBhIG5vZGUgaW4gYVxyXG4gICAgLy8gQkZTIG1hbm5lci5cclxuICAgIHdoaWxlICh0b0JlVmlzaXRlZC5sZW5ndGggPiAwICYmIGlzRm9yZXN0KVxyXG4gICAge1xyXG4gICAgICAvL3Bvb2wgb3BlcmF0aW9uXHJcbiAgICAgIHZhciBjdXJyZW50Tm9kZSA9IHRvQmVWaXNpdGVkWzBdO1xyXG4gICAgICB0b0JlVmlzaXRlZC5zcGxpY2UoMCwgMSk7XHJcbiAgICAgIHZpc2l0ZWQuYWRkKGN1cnJlbnROb2RlKTtcclxuXHJcbiAgICAgIC8vIFRyYXZlcnNlIGFsbCBuZWlnaGJvcnMgb2YgdGhpcyBub2RlXHJcbiAgICAgIHZhciBuZWlnaGJvckVkZ2VzID0gY3VycmVudE5vZGUuZ2V0RWRnZXMoKTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmVpZ2hib3JFZGdlcy5sZW5ndGg7IGkrKylcclxuICAgICAge1xyXG4gICAgICAgIHZhciBjdXJyZW50TmVpZ2hib3IgPVxyXG4gICAgICAgICAgICAgICAgbmVpZ2hib3JFZGdlc1tpXS5nZXRPdGhlckVuZChjdXJyZW50Tm9kZSk7XHJcblxyXG4gICAgICAgIC8vIElmIEJGUyBpcyBub3QgZ3Jvd2luZyBmcm9tIHRoaXMgbmVpZ2hib3IuXHJcbiAgICAgICAgaWYgKHBhcmVudHMuZ2V0KGN1cnJlbnROb2RlKSAhPSBjdXJyZW50TmVpZ2hib3IpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgLy8gV2UgaGF2ZW4ndCBwcmV2aW91c2x5IHZpc2l0ZWQgdGhpcyBuZWlnaGJvci5cclxuICAgICAgICAgIGlmICghdmlzaXRlZC5jb250YWlucyhjdXJyZW50TmVpZ2hib3IpKVxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB0b0JlVmlzaXRlZC5wdXNoKGN1cnJlbnROZWlnaGJvcik7XHJcbiAgICAgICAgICAgIHBhcmVudHMucHV0KGN1cnJlbnROZWlnaGJvciwgY3VycmVudE5vZGUpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gU2luY2Ugd2UgaGF2ZSBwcmV2aW91c2x5IHZpc2l0ZWQgdGhpcyBuZWlnaGJvciBhbmRcclxuICAgICAgICAgIC8vIHRoaXMgbmVpZ2hib3IgaXMgbm90IHBhcmVudCBvZiBjdXJyZW50Tm9kZSwgZ2l2ZW5cclxuICAgICAgICAgIC8vIGdyYXBoIGNvbnRhaW5zIGEgY29tcG9uZW50IHRoYXQgaXMgbm90IHRyZWUsIGhlbmNlXHJcbiAgICAgICAgICAvLyBpdCBpcyBub3QgYSBmb3Jlc3QuXHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGlzRm9yZXN0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFRoZSBncmFwaCBjb250YWlucyBhIGNvbXBvbmVudCB0aGF0IGlzIG5vdCBhIHRyZWUuIEVtcHR5XHJcbiAgICAvLyBwcmV2aW91c2x5IGZvdW5kIHRyZWVzLiBUaGUgbWV0aG9kIHdpbGwgZW5kLlxyXG4gICAgaWYgKCFpc0ZvcmVzdClcclxuICAgIHtcclxuICAgICAgZmxhdEZvcmVzdCA9IFtdO1xyXG4gICAgfVxyXG4gICAgLy8gU2F2ZSBjdXJyZW50bHkgdmlzaXRlZCBub2RlcyBhcyBhIHRyZWUgaW4gb3VyIGZvcmVzdC4gUmVzZXRcclxuICAgIC8vIHZpc2l0ZWQgYW5kIHBhcmVudHMgbGlzdHMuIENvbnRpbnVlIHdpdGggdGhlIG5leHQgY29tcG9uZW50IG9mXHJcbiAgICAvLyB0aGUgZ3JhcGgsIGlmIGFueS5cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgdmFyIHRlbXAgPSBbXTtcclxuICAgICAgdmlzaXRlZC5hZGRBbGxUbyh0ZW1wKTtcclxuICAgICAgZmxhdEZvcmVzdC5wdXNoKHRlbXApO1xyXG4gICAgICAvL2ZsYXRGb3Jlc3QgPSBmbGF0Rm9yZXN0LmNvbmNhdCh0ZW1wKTtcclxuICAgICAgLy91blByb2Nlc3NlZE5vZGVzLnJlbW92ZUFsbCh2aXNpdGVkKTtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZW1wLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gdGVtcFtpXTtcclxuICAgICAgICB2YXIgaW5kZXggPSB1blByb2Nlc3NlZE5vZGVzLmluZGV4T2YodmFsdWUpO1xyXG4gICAgICAgIGlmIChpbmRleCA+IC0xKSB7XHJcbiAgICAgICAgICB1blByb2Nlc3NlZE5vZGVzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHZpc2l0ZWQgPSBuZXcgSGFzaFNldCgpO1xyXG4gICAgICBwYXJlbnRzID0gbmV3IEhhc2hNYXAoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBmbGF0Rm9yZXN0O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIGNyZWF0ZXMgZHVtbXkgbm9kZXMgKGFuIGwtbGV2ZWwgbm9kZSB3aXRoIG1pbmltYWwgZGltZW5zaW9ucylcclxuICogZm9yIHRoZSBnaXZlbiBlZGdlIChvbmUgcGVyIGJlbmRwb2ludCkuIFRoZSBleGlzdGluZyBsLWxldmVsIHN0cnVjdHVyZVxyXG4gKiBpcyB1cGRhdGVkIGFjY29yZGluZ2x5LlxyXG4gKi9cclxuTGF5b3V0LnByb3RvdHlwZS5jcmVhdGVEdW1teU5vZGVzRm9yQmVuZHBvaW50cyA9IGZ1bmN0aW9uIChlZGdlKVxyXG57XHJcbiAgdmFyIGR1bW15Tm9kZXMgPSBbXTtcclxuICB2YXIgcHJldiA9IGVkZ2Uuc291cmNlO1xyXG5cclxuICB2YXIgZ3JhcGggPSB0aGlzLmdyYXBoTWFuYWdlci5jYWxjTG93ZXN0Q29tbW9uQW5jZXN0b3IoZWRnZS5zb3VyY2UsIGVkZ2UudGFyZ2V0KTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlLmJlbmRwb2ludHMubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgLy8gY3JlYXRlIG5ldyBkdW1teSBub2RlXHJcbiAgICB2YXIgZHVtbXlOb2RlID0gdGhpcy5uZXdOb2RlKG51bGwpO1xyXG4gICAgZHVtbXlOb2RlLnNldFJlY3QobmV3IFBvaW50KDAsIDApLCBuZXcgRGltZW5zaW9uKDEsIDEpKTtcclxuXHJcbiAgICBncmFwaC5hZGQoZHVtbXlOb2RlKTtcclxuXHJcbiAgICAvLyBjcmVhdGUgbmV3IGR1bW15IGVkZ2UgYmV0d2VlbiBwcmV2IGFuZCBkdW1teSBub2RlXHJcbiAgICB2YXIgZHVtbXlFZGdlID0gdGhpcy5uZXdFZGdlKG51bGwpO1xyXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIuYWRkKGR1bW15RWRnZSwgcHJldiwgZHVtbXlOb2RlKTtcclxuXHJcbiAgICBkdW1teU5vZGVzLmFkZChkdW1teU5vZGUpO1xyXG4gICAgcHJldiA9IGR1bW15Tm9kZTtcclxuICB9XHJcblxyXG4gIHZhciBkdW1teUVkZ2UgPSB0aGlzLm5ld0VkZ2UobnVsbCk7XHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIuYWRkKGR1bW15RWRnZSwgcHJldiwgZWRnZS50YXJnZXQpO1xyXG5cclxuICB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMucHV0KGVkZ2UsIGR1bW15Tm9kZXMpO1xyXG5cclxuICAvLyByZW1vdmUgcmVhbCBlZGdlIGZyb20gZ3JhcGggbWFuYWdlciBpZiBpdCBpcyBpbnRlci1ncmFwaFxyXG4gIGlmIChlZGdlLmlzSW50ZXJHcmFwaCgpKVxyXG4gIHtcclxuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLnJlbW92ZShlZGdlKTtcclxuICB9XHJcbiAgLy8gZWxzZSwgcmVtb3ZlIHRoZSBlZGdlIGZyb20gdGhlIGN1cnJlbnQgZ3JhcGhcclxuICBlbHNlXHJcbiAge1xyXG4gICAgZ3JhcGgucmVtb3ZlKGVkZ2UpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGR1bW15Tm9kZXM7XHJcbn07XHJcblxyXG4vKipcclxuICogVGhpcyBtZXRob2QgY3JlYXRlcyBiZW5kcG9pbnRzIGZvciBlZGdlcyBmcm9tIHRoZSBkdW1teSBub2Rlc1xyXG4gKiBhdCBsLWxldmVsLlxyXG4gKi9cclxuTGF5b3V0LnByb3RvdHlwZS5jcmVhdGVCZW5kcG9pbnRzRnJvbUR1bW15Tm9kZXMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIGVkZ2VzID0gW107XHJcbiAgZWRnZXMgPSBlZGdlcy5jb25jYXQodGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsRWRnZXMoKSk7XHJcbiAgZWRnZXMgPSB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMua2V5U2V0KCkuY29uY2F0KGVkZ2VzKTtcclxuXHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBlZGdlcy5sZW5ndGg7IGsrKylcclxuICB7XHJcbiAgICB2YXIgbEVkZ2UgPSBlZGdlc1trXTtcclxuXHJcbiAgICBpZiAobEVkZ2UuYmVuZHBvaW50cy5sZW5ndGggPiAwKVxyXG4gICAge1xyXG4gICAgICB2YXIgcGF0aCA9IHRoaXMuZWRnZVRvRHVtbXlOb2Rlcy5nZXQobEVkZ2UpO1xyXG5cclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRoLmxlbmd0aDsgaSsrKVxyXG4gICAgICB7XHJcbiAgICAgICAgdmFyIGR1bW15Tm9kZSA9IHBhdGhbaV07XHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUG9pbnREKGR1bW15Tm9kZS5nZXRDZW50ZXJYKCksXHJcbiAgICAgICAgICAgICAgICBkdW1teU5vZGUuZ2V0Q2VudGVyWSgpKTtcclxuXHJcbiAgICAgICAgLy8gdXBkYXRlIGJlbmRwb2ludCdzIGxvY2F0aW9uIGFjY29yZGluZyB0byBkdW1teSBub2RlXHJcbiAgICAgICAgdmFyIGVicCA9IGxFZGdlLmJlbmRwb2ludHMuZ2V0KGkpO1xyXG4gICAgICAgIGVicC54ID0gcC54O1xyXG4gICAgICAgIGVicC55ID0gcC55O1xyXG5cclxuICAgICAgICAvLyByZW1vdmUgdGhlIGR1bW15IG5vZGUsIGR1bW15IGVkZ2VzIGluY2lkZW50IHdpdGggdGhpc1xyXG4gICAgICAgIC8vIGR1bW15IG5vZGUgaXMgYWxzbyByZW1vdmVkICh3aXRoaW4gdGhlIHJlbW92ZSBtZXRob2QpXHJcbiAgICAgICAgZHVtbXlOb2RlLmdldE93bmVyKCkucmVtb3ZlKGR1bW15Tm9kZSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGFkZCB0aGUgcmVhbCBlZGdlIHRvIGdyYXBoXHJcbiAgICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLmFkZChsRWRnZSwgbEVkZ2Uuc291cmNlLCBsRWRnZS50YXJnZXQpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkxheW91dC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoc2xpZGVyVmFsdWUsIGRlZmF1bHRWYWx1ZSwgbWluRGl2LCBtYXhNdWwpIHtcclxuICBpZiAobWluRGl2ICE9IHVuZGVmaW5lZCAmJiBtYXhNdWwgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICB2YXIgdmFsdWUgPSBkZWZhdWx0VmFsdWU7XHJcblxyXG4gICAgaWYgKHNsaWRlclZhbHVlIDw9IDUwKVxyXG4gICAge1xyXG4gICAgICB2YXIgbWluVmFsdWUgPSBkZWZhdWx0VmFsdWUgLyBtaW5EaXY7XHJcbiAgICAgIHZhbHVlIC09ICgoZGVmYXVsdFZhbHVlIC0gbWluVmFsdWUpIC8gNTApICogKDUwIC0gc2xpZGVyVmFsdWUpO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICB2YXIgbWF4VmFsdWUgPSBkZWZhdWx0VmFsdWUgKiBtYXhNdWw7XHJcbiAgICAgIHZhbHVlICs9ICgobWF4VmFsdWUgLSBkZWZhdWx0VmFsdWUpIC8gNTApICogKHNsaWRlclZhbHVlIC0gNTApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2YWx1ZTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICB2YXIgYSwgYjtcclxuXHJcbiAgICBpZiAoc2xpZGVyVmFsdWUgPD0gNTApXHJcbiAgICB7XHJcbiAgICAgIGEgPSA5LjAgKiBkZWZhdWx0VmFsdWUgLyA1MDAuMDtcclxuICAgICAgYiA9IGRlZmF1bHRWYWx1ZSAvIDEwLjA7XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIGEgPSA5LjAgKiBkZWZhdWx0VmFsdWUgLyA1MC4wO1xyXG4gICAgICBiID0gLTggKiBkZWZhdWx0VmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIChhICogc2xpZGVyVmFsdWUgKyBiKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogVGhpcyBtZXRob2QgZmluZHMgYW5kIHJldHVybnMgdGhlIGNlbnRlciBvZiB0aGUgZ2l2ZW4gbm9kZXMsIGFzc3VtaW5nXHJcbiAqIHRoYXQgdGhlIGdpdmVuIG5vZGVzIGZvcm0gYSB0cmVlIGluIHRoZW1zZWx2ZXMuXHJcbiAqL1xyXG5MYXlvdXQuZmluZENlbnRlck9mVHJlZSA9IGZ1bmN0aW9uIChub2Rlcylcclxue1xyXG4gIHZhciBsaXN0ID0gW107XHJcbiAgbGlzdCA9IGxpc3QuY29uY2F0KG5vZGVzKTtcclxuXHJcbiAgdmFyIHJlbW92ZWROb2RlcyA9IFtdO1xyXG4gIHZhciByZW1haW5pbmdEZWdyZWVzID0gbmV3IEhhc2hNYXAoKTtcclxuICB2YXIgZm91bmRDZW50ZXIgPSBmYWxzZTtcclxuICB2YXIgY2VudGVyTm9kZSA9IG51bGw7XHJcblxyXG4gIGlmIChsaXN0Lmxlbmd0aCA9PSAxIHx8IGxpc3QubGVuZ3RoID09IDIpXHJcbiAge1xyXG4gICAgZm91bmRDZW50ZXIgPSB0cnVlO1xyXG4gICAgY2VudGVyTm9kZSA9IGxpc3RbMF07XHJcbiAgfVxyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIG5vZGUgPSBsaXN0W2ldO1xyXG4gICAgdmFyIGRlZ3JlZSA9IG5vZGUuZ2V0TmVpZ2hib3JzTGlzdCgpLnNpemUoKTtcclxuICAgIHJlbWFpbmluZ0RlZ3JlZXMucHV0KG5vZGUsIG5vZGUuZ2V0TmVpZ2hib3JzTGlzdCgpLnNpemUoKSk7XHJcblxyXG4gICAgaWYgKGRlZ3JlZSA9PSAxKVxyXG4gICAge1xyXG4gICAgICByZW1vdmVkTm9kZXMucHVzaChub2RlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhciB0ZW1wTGlzdCA9IFtdO1xyXG4gIHRlbXBMaXN0ID0gdGVtcExpc3QuY29uY2F0KHJlbW92ZWROb2Rlcyk7XHJcblxyXG4gIHdoaWxlICghZm91bmRDZW50ZXIpXHJcbiAge1xyXG4gICAgdmFyIHRlbXBMaXN0MiA9IFtdO1xyXG4gICAgdGVtcExpc3QyID0gdGVtcExpc3QyLmNvbmNhdCh0ZW1wTGlzdCk7XHJcbiAgICB0ZW1wTGlzdCA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKylcclxuICAgIHtcclxuICAgICAgdmFyIG5vZGUgPSBsaXN0W2ldO1xyXG5cclxuICAgICAgdmFyIGluZGV4ID0gbGlzdC5pbmRleE9mKG5vZGUpO1xyXG4gICAgICBpZiAoaW5kZXggPj0gMCkge1xyXG4gICAgICAgIGxpc3Quc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIG5laWdoYm91cnMgPSBub2RlLmdldE5laWdoYm9yc0xpc3QoKTtcclxuXHJcbiAgICAgIE9iamVjdC5rZXlzKG5laWdoYm91cnMuc2V0KS5mb3JFYWNoKGZ1bmN0aW9uKGopIHtcclxuICAgICAgICB2YXIgbmVpZ2hib3VyID0gbmVpZ2hib3Vycy5zZXRbal07XHJcbiAgICAgICAgaWYgKHJlbW92ZWROb2Rlcy5pbmRleE9mKG5laWdoYm91cikgPCAwKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHZhciBvdGhlckRlZ3JlZSA9IHJlbWFpbmluZ0RlZ3JlZXMuZ2V0KG5laWdoYm91cik7XHJcbiAgICAgICAgICB2YXIgbmV3RGVncmVlID0gb3RoZXJEZWdyZWUgLSAxO1xyXG5cclxuICAgICAgICAgIGlmIChuZXdEZWdyZWUgPT0gMSlcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdGVtcExpc3QucHVzaChuZWlnaGJvdXIpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHJlbWFpbmluZ0RlZ3JlZXMucHV0KG5laWdoYm91ciwgbmV3RGVncmVlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZWROb2RlcyA9IHJlbW92ZWROb2Rlcy5jb25jYXQodGVtcExpc3QpO1xyXG5cclxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PSAxIHx8IGxpc3QubGVuZ3RoID09IDIpXHJcbiAgICB7XHJcbiAgICAgIGZvdW5kQ2VudGVyID0gdHJ1ZTtcclxuICAgICAgY2VudGVyTm9kZSA9IGxpc3RbMF07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gY2VudGVyTm9kZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEdXJpbmcgdGhlIGNvYXJzZW5pbmcgcHJvY2VzcywgdGhpcyBsYXlvdXQgbWF5IGJlIHJlZmVyZW5jZWQgYnkgdHdvIGdyYXBoIG1hbmFnZXJzXHJcbiAqIHRoaXMgc2V0dGVyIGZ1bmN0aW9uIGdyYW50cyBhY2Nlc3MgdG8gY2hhbmdlIHRoZSBjdXJyZW50bHkgYmVpbmcgdXNlZCBncmFwaCBtYW5hZ2VyXHJcbiAqL1xyXG5MYXlvdXQucHJvdG90eXBlLnNldEdyYXBoTWFuYWdlciA9IGZ1bmN0aW9uIChnbSlcclxue1xyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyID0gZ207XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDtcclxuIiwiZnVuY3Rpb24gTGF5b3V0Q29uc3RhbnRzKCkge1xyXG59XHJcblxyXG4vKipcclxuICogTGF5b3V0IFF1YWxpdHlcclxuICovXHJcbkxheW91dENvbnN0YW50cy5QUk9PRl9RVUFMSVRZID0gMDtcclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUVVBTElUWSA9IDE7XHJcbkxheW91dENvbnN0YW50cy5EUkFGVF9RVUFMSVRZID0gMjtcclxuXHJcbi8qKlxyXG4gKiBEZWZhdWx0IHBhcmFtZXRlcnNcclxuICovXHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0NSRUFURV9CRU5EU19BU19ORUVERUQgPSBmYWxzZTtcclxuLy9MYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9IHRydWU7XHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMID0gZmFsc2U7XHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9PTl9MQVlPVVQgPSB0cnVlO1xyXG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fRFVSSU5HX0xBWU9VVCA9IGZhbHNlO1xyXG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fUEVSSU9EID0gNTA7XHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX1VOSUZPUk1fTEVBRl9OT0RFX1NJWkVTID0gZmFsc2U7XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBTZWN0aW9uOiBHZW5lcmFsIG90aGVyIGNvbnN0YW50c1xyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vKlxyXG4gKiBNYXJnaW5zIG9mIGEgZ3JhcGggdG8gYmUgYXBwbGllZCBvbiBib3VkaW5nIHJlY3RhbmdsZSBvZiBpdHMgY29udGVudHMuIFdlXHJcbiAqIGFzc3VtZSBtYXJnaW5zIG9uIGFsbCBmb3VyIHNpZGVzIHRvIGJlIHVuaWZvcm0uXHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFQSF9NQVJHSU4gPSAxNTtcclxuXHJcbi8qXHJcbiAqIERlZmF1bHQgZGltZW5zaW9uIG9mIGEgbm9uLWNvbXBvdW5kIG5vZGUuXHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuU0lNUExFX05PREVfU0laRSA9IDQwO1xyXG5cclxuLypcclxuICogRGVmYXVsdCBkaW1lbnNpb24gb2YgYSBub24tY29tcG91bmQgbm9kZS5cclxuICovXHJcbkxheW91dENvbnN0YW50cy5TSU1QTEVfTk9ERV9IQUxGX1NJWkUgPSBMYXlvdXRDb25zdGFudHMuU0lNUExFX05PREVfU0laRSAvIDI7XHJcblxyXG4vKlxyXG4gKiBFbXB0eSBjb21wb3VuZCBub2RlIHNpemUuIFdoZW4gYSBjb21wb3VuZCBub2RlIGlzIGVtcHR5LCBpdHMgYm90aFxyXG4gKiBkaW1lbnNpb25zIHNob3VsZCBiZSBvZiB0aGlzIHZhbHVlLlxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLkVNUFRZX0NPTVBPVU5EX05PREVfU0laRSA9IDQwO1xyXG5cclxuLypcclxuICogTWluaW11bSBsZW5ndGggdGhhdCBhbiBlZGdlIHNob3VsZCB0YWtlIGR1cmluZyBsYXlvdXRcclxuICovXHJcbkxheW91dENvbnN0YW50cy5NSU5fRURHRV9MRU5HVEggPSAxO1xyXG5cclxuLypcclxuICogV29ybGQgYm91bmRhcmllcyB0aGF0IGxheW91dCBvcGVyYXRlcyBvblxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZID0gMTAwMDAwMDtcclxuXHJcbi8qXHJcbiAqIFdvcmxkIGJvdW5kYXJpZXMgdGhhdCByYW5kb20gcG9zaXRpb25pbmcgY2FuIGJlIHBlcmZvcm1lZCB3aXRoXHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuSU5JVElBTF9XT1JMRF9CT1VOREFSWSA9IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSAvIDEwMDA7XHJcblxyXG4vKlxyXG4gKiBDb29yZGluYXRlcyBvZiB0aGUgd29ybGQgY2VudGVyXHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuV09STERfQ0VOVEVSX1ggPSAxMjAwO1xyXG5MYXlvdXRDb25zdGFudHMuV09STERfQ0VOVEVSX1kgPSA5MDA7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dENvbnN0YW50cztcclxuIiwiLypcclxuICpUaGlzIGNsYXNzIGlzIHRoZSBqYXZhc2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIHRoZSBQb2ludC5qYXZhIGNsYXNzIGluIGpka1xyXG4gKi9cclxuZnVuY3Rpb24gUG9pbnQoeCwgeSwgcCkge1xyXG4gIHRoaXMueCA9IG51bGw7XHJcbiAgdGhpcy55ID0gbnVsbDtcclxuICBpZiAoeCA9PSBudWxsICYmIHkgPT0gbnVsbCAmJiBwID09IG51bGwpIHtcclxuICAgIHRoaXMueCA9IDA7XHJcbiAgICB0aGlzLnkgPSAwO1xyXG4gIH1cclxuICBlbHNlIGlmICh0eXBlb2YgeCA9PSAnbnVtYmVyJyAmJiB0eXBlb2YgeSA9PSAnbnVtYmVyJyAmJiBwID09IG51bGwpIHtcclxuICAgIHRoaXMueCA9IHg7XHJcbiAgICB0aGlzLnkgPSB5O1xyXG4gIH1cclxuICBlbHNlIGlmICh4LmNvbnN0cnVjdG9yLm5hbWUgPT0gJ1BvaW50JyAmJiB5ID09IG51bGwgJiYgcCA9PSBudWxsKSB7XHJcbiAgICBwID0geDtcclxuICAgIHRoaXMueCA9IHAueDtcclxuICAgIHRoaXMueSA9IHAueTtcclxuICB9XHJcbn1cclxuXHJcblBvaW50LnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLng7XHJcbn1cclxuXHJcblBvaW50LnByb3RvdHlwZS5nZXRZID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLnk7XHJcbn1cclxuXHJcblBvaW50LnByb3RvdHlwZS5nZXRMb2NhdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gbmV3IFBvaW50KHRoaXMueCwgdGhpcy55KTtcclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLnNldExvY2F0aW9uID0gZnVuY3Rpb24gKHgsIHksIHApIHtcclxuICBpZiAoeC5jb25zdHJ1Y3Rvci5uYW1lID09ICdQb2ludCcgJiYgeSA9PSBudWxsICYmIHAgPT0gbnVsbCkge1xyXG4gICAgcCA9IHg7XHJcbiAgICB0aGlzLnNldExvY2F0aW9uKHAueCwgcC55KTtcclxuICB9XHJcbiAgZWxzZSBpZiAodHlwZW9mIHggPT0gJ251bWJlcicgJiYgdHlwZW9mIHkgPT0gJ251bWJlcicgJiYgcCA9PSBudWxsKSB7XHJcbiAgICAvL2lmIGJvdGggcGFyYW1ldGVycyBhcmUgaW50ZWdlciBqdXN0IG1vdmUgKHgseSkgbG9jYXRpb25cclxuICAgIGlmIChwYXJzZUludCh4KSA9PSB4ICYmIHBhcnNlSW50KHkpID09IHkpIHtcclxuICAgICAgdGhpcy5tb3ZlKHgsIHkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMueCA9IE1hdGguZmxvb3IoeCArIDAuNSk7XHJcbiAgICAgIHRoaXMueSA9IE1hdGguZmxvb3IoeSArIDAuNSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgdGhpcy54ID0geDtcclxuICB0aGlzLnkgPSB5O1xyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24gKGR4LCBkeSkge1xyXG4gIHRoaXMueCArPSBkeDtcclxuICB0aGlzLnkgKz0gZHk7XHJcbn1cclxuXHJcblBvaW50LnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgaWYgKG9iai5jb25zdHJ1Y3Rvci5uYW1lID09IFwiUG9pbnRcIikge1xyXG4gICAgdmFyIHB0ID0gb2JqO1xyXG4gICAgcmV0dXJuICh0aGlzLnggPT0gcHQueCkgJiYgKHRoaXMueSA9PSBwdC55KTtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMgPT0gb2JqO1xyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIG5ldyBQb2ludCgpLmNvbnN0cnVjdG9yLm5hbWUgKyBcIlt4PVwiICsgdGhpcy54ICsgXCIseT1cIiArIHRoaXMueSArIFwiXVwiO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50O1xyXG4iLCJmdW5jdGlvbiBQb2ludEQoeCwgeSkge1xyXG4gIGlmICh4ID09IG51bGwgJiYgeSA9PSBudWxsKSB7XHJcbiAgICB0aGlzLnggPSAwO1xyXG4gICAgdGhpcy55ID0gMDtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy54ID0geDtcclxuICAgIHRoaXMueSA9IHk7XHJcbiAgfVxyXG59XHJcblxyXG5Qb2ludEQucHJvdG90eXBlLmdldFggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueDtcclxufTtcclxuXHJcblBvaW50RC5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy55O1xyXG59O1xyXG5cclxuUG9pbnRELnByb3RvdHlwZS5zZXRYID0gZnVuY3Rpb24gKHgpXHJcbntcclxuICB0aGlzLnggPSB4O1xyXG59O1xyXG5cclxuUG9pbnRELnByb3RvdHlwZS5zZXRZID0gZnVuY3Rpb24gKHkpXHJcbntcclxuICB0aGlzLnkgPSB5O1xyXG59O1xyXG5cclxuUG9pbnRELnByb3RvdHlwZS5nZXREaWZmZXJlbmNlID0gZnVuY3Rpb24gKHB0KVxyXG57XHJcbiAgcmV0dXJuIG5ldyBEaW1lbnNpb25EKHRoaXMueCAtIHB0LngsIHRoaXMueSAtIHB0LnkpO1xyXG59O1xyXG5cclxuUG9pbnRELnByb3RvdHlwZS5nZXRDb3B5ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBuZXcgUG9pbnREKHRoaXMueCwgdGhpcy55KTtcclxufTtcclxuXHJcblBvaW50RC5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24gKGRpbSlcclxue1xyXG4gIHRoaXMueCArPSBkaW0ud2lkdGg7XHJcbiAgdGhpcy55ICs9IGRpbS5oZWlnaHQ7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50RDtcclxuIiwiZnVuY3Rpb24gUmFuZG9tU2VlZCgpIHtcclxufVxyXG5SYW5kb21TZWVkLnNlZWQgPSAxO1xyXG5SYW5kb21TZWVkLnggPSAwO1xyXG5cclxuUmFuZG9tU2VlZC5uZXh0RG91YmxlID0gZnVuY3Rpb24gKCkge1xyXG4gIFJhbmRvbVNlZWQueCA9IE1hdGguc2luKFJhbmRvbVNlZWQuc2VlZCsrKSAqIDEwMDAwO1xyXG4gIHJldHVybiBSYW5kb21TZWVkLnggLSBNYXRoLmZsb29yKFJhbmRvbVNlZWQueCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJhbmRvbVNlZWQ7XHJcbiIsImZ1bmN0aW9uIFJlY3RhbmdsZUQoeCwgeSwgd2lkdGgsIGhlaWdodCkge1xyXG4gIHRoaXMueCA9IDA7XHJcbiAgdGhpcy55ID0gMDtcclxuICB0aGlzLndpZHRoID0gMDtcclxuICB0aGlzLmhlaWdodCA9IDA7XHJcblxyXG4gIGlmICh4ICE9IG51bGwgJiYgeSAhPSBudWxsICYmIHdpZHRoICE9IG51bGwgJiYgaGVpZ2h0ICE9IG51bGwpIHtcclxuICAgIHRoaXMueCA9IHg7XHJcbiAgICB0aGlzLnkgPSB5O1xyXG4gICAgdGhpcy53aWR0aCA9IHdpZHRoO1xyXG4gICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XHJcbiAgfVxyXG59XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLng7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5zZXRYID0gZnVuY3Rpb24gKHgpXHJcbntcclxuICB0aGlzLnggPSB4O1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy55O1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuc2V0WSA9IGZ1bmN0aW9uICh5KVxyXG57XHJcbiAgdGhpcy55ID0geTtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldFdpZHRoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLndpZHRoO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuc2V0V2lkdGggPSBmdW5jdGlvbiAod2lkdGgpXHJcbntcclxuICB0aGlzLndpZHRoID0gd2lkdGg7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRIZWlnaHQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuaGVpZ2h0O1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuc2V0SGVpZ2h0ID0gZnVuY3Rpb24gKGhlaWdodClcclxue1xyXG4gIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0UmlnaHQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueCArIHRoaXMud2lkdGg7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRCb3R0b20gPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueSArIHRoaXMuaGVpZ2h0O1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuaW50ZXJzZWN0cyA9IGZ1bmN0aW9uIChhKVxyXG57XHJcbiAgaWYgKHRoaXMuZ2V0UmlnaHQoKSA8IGEueClcclxuICB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpZiAodGhpcy5nZXRCb3R0b20oKSA8IGEueSlcclxuICB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpZiAoYS5nZXRSaWdodCgpIDwgdGhpcy54KVxyXG4gIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIGlmIChhLmdldEJvdHRvbSgpIDwgdGhpcy55KVxyXG4gIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0Q2VudGVyWCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy54ICsgdGhpcy53aWR0aCAvIDI7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRNaW5YID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmdldFgoKTtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldE1heFggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuZ2V0WCgpICsgdGhpcy53aWR0aDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldENlbnRlclkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueSArIHRoaXMuaGVpZ2h0IC8gMjtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldE1pblkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuZ2V0WSgpO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0TWF4WSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5nZXRZKCkgKyB0aGlzLmhlaWdodDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldFdpZHRoSGFsZiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy53aWR0aCAvIDI7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRIZWlnaHRIYWxmID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmhlaWdodCAvIDI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3RhbmdsZUQ7XHJcbiIsInZhciBQb2ludEQgPSByZXF1aXJlKCcuL1BvaW50RCcpO1xyXG5cclxuZnVuY3Rpb24gVHJhbnNmb3JtKHgsIHkpIHtcclxuICB0aGlzLmx3b3JsZE9yZ1ggPSAwLjA7XHJcbiAgdGhpcy5sd29ybGRPcmdZID0gMC4wO1xyXG4gIHRoaXMubGRldmljZU9yZ1ggPSAwLjA7XHJcbiAgdGhpcy5sZGV2aWNlT3JnWSA9IDAuMDtcclxuICB0aGlzLmx3b3JsZEV4dFggPSAxLjA7XHJcbiAgdGhpcy5sd29ybGRFeHRZID0gMS4wO1xyXG4gIHRoaXMubGRldmljZUV4dFggPSAxLjA7XHJcbiAgdGhpcy5sZGV2aWNlRXh0WSA9IDEuMDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXRXb3JsZE9yZ1ggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubHdvcmxkT3JnWDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRXb3JsZE9yZ1ggPSBmdW5jdGlvbiAod294KVxyXG57XHJcbiAgdGhpcy5sd29ybGRPcmdYID0gd294O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFdvcmxkT3JnWSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sd29ybGRPcmdZO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldFdvcmxkT3JnWSA9IGZ1bmN0aW9uICh3b3kpXHJcbntcclxuICB0aGlzLmx3b3JsZE9yZ1kgPSB3b3k7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0V29ybGRFeHRYID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmx3b3JsZEV4dFg7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0V29ybGRFeHRYID0gZnVuY3Rpb24gKHdleClcclxue1xyXG4gIHRoaXMubHdvcmxkRXh0WCA9IHdleDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXRXb3JsZEV4dFkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubHdvcmxkRXh0WTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRXb3JsZEV4dFkgPSBmdW5jdGlvbiAod2V5KVxyXG57XHJcbiAgdGhpcy5sd29ybGRFeHRZID0gd2V5O1xyXG59XHJcblxyXG4vKiBEZXZpY2UgcmVsYXRlZCAqL1xyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXREZXZpY2VPcmdYID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmxkZXZpY2VPcmdYO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldERldmljZU9yZ1ggPSBmdW5jdGlvbiAoZG94KVxyXG57XHJcbiAgdGhpcy5sZGV2aWNlT3JnWCA9IGRveDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXREZXZpY2VPcmdZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmxkZXZpY2VPcmdZO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldERldmljZU9yZ1kgPSBmdW5jdGlvbiAoZG95KVxyXG57XHJcbiAgdGhpcy5sZGV2aWNlT3JnWSA9IGRveTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXREZXZpY2VFeHRYID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmxkZXZpY2VFeHRYO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldERldmljZUV4dFggPSBmdW5jdGlvbiAoZGV4KVxyXG57XHJcbiAgdGhpcy5sZGV2aWNlRXh0WCA9IGRleDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXREZXZpY2VFeHRZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmxkZXZpY2VFeHRZO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldERldmljZUV4dFkgPSBmdW5jdGlvbiAoZGV5KVxyXG57XHJcbiAgdGhpcy5sZGV2aWNlRXh0WSA9IGRleTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS50cmFuc2Zvcm1YID0gZnVuY3Rpb24gKHgpXHJcbntcclxuICB2YXIgeERldmljZSA9IDAuMDtcclxuICB2YXIgd29ybGRFeHRYID0gdGhpcy5sd29ybGRFeHRYO1xyXG4gIGlmICh3b3JsZEV4dFggIT0gMC4wKVxyXG4gIHtcclxuICAgIHhEZXZpY2UgPSB0aGlzLmxkZXZpY2VPcmdYICtcclxuICAgICAgICAgICAgKCh4IC0gdGhpcy5sd29ybGRPcmdYKSAqIHRoaXMubGRldmljZUV4dFggLyB3b3JsZEV4dFgpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHhEZXZpY2U7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUudHJhbnNmb3JtWSA9IGZ1bmN0aW9uICh5KVxyXG57XHJcbiAgdmFyIHlEZXZpY2UgPSAwLjA7XHJcbiAgdmFyIHdvcmxkRXh0WSA9IHRoaXMubHdvcmxkRXh0WTtcclxuICBpZiAod29ybGRFeHRZICE9IDAuMClcclxuICB7XHJcbiAgICB5RGV2aWNlID0gdGhpcy5sZGV2aWNlT3JnWSArXHJcbiAgICAgICAgICAgICgoeSAtIHRoaXMubHdvcmxkT3JnWSkgKiB0aGlzLmxkZXZpY2VFeHRZIC8gd29ybGRFeHRZKTtcclxuICB9XHJcblxyXG5cclxuICByZXR1cm4geURldmljZTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5pbnZlcnNlVHJhbnNmb3JtWCA9IGZ1bmN0aW9uICh4KVxyXG57XHJcbiAgdmFyIHhXb3JsZCA9IDAuMDtcclxuICB2YXIgZGV2aWNlRXh0WCA9IHRoaXMubGRldmljZUV4dFg7XHJcbiAgaWYgKGRldmljZUV4dFggIT0gMC4wKVxyXG4gIHtcclxuICAgIHhXb3JsZCA9IHRoaXMubHdvcmxkT3JnWCArXHJcbiAgICAgICAgICAgICgoeCAtIHRoaXMubGRldmljZU9yZ1gpICogdGhpcy5sd29ybGRFeHRYIC8gZGV2aWNlRXh0WCk7XHJcbiAgfVxyXG5cclxuXHJcbiAgcmV0dXJuIHhXb3JsZDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5pbnZlcnNlVHJhbnNmb3JtWSA9IGZ1bmN0aW9uICh5KVxyXG57XHJcbiAgdmFyIHlXb3JsZCA9IDAuMDtcclxuICB2YXIgZGV2aWNlRXh0WSA9IHRoaXMubGRldmljZUV4dFk7XHJcbiAgaWYgKGRldmljZUV4dFkgIT0gMC4wKVxyXG4gIHtcclxuICAgIHlXb3JsZCA9IHRoaXMubHdvcmxkT3JnWSArXHJcbiAgICAgICAgICAgICgoeSAtIHRoaXMubGRldmljZU9yZ1kpICogdGhpcy5sd29ybGRFeHRZIC8gZGV2aWNlRXh0WSk7XHJcbiAgfVxyXG4gIHJldHVybiB5V29ybGQ7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuaW52ZXJzZVRyYW5zZm9ybVBvaW50ID0gZnVuY3Rpb24gKGluUG9pbnQpXHJcbntcclxuICB2YXIgb3V0UG9pbnQgPVxyXG4gICAgICAgICAgbmV3IFBvaW50RCh0aGlzLmludmVyc2VUcmFuc2Zvcm1YKGluUG9pbnQueCksXHJcbiAgICAgICAgICAgICAgICAgIHRoaXMuaW52ZXJzZVRyYW5zZm9ybVkoaW5Qb2ludC55KSk7XHJcbiAgcmV0dXJuIG91dFBvaW50O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTtcclxuIiwiZnVuY3Rpb24gVW5pcXVlSURHZW5lcmV0b3IoKSB7XHJcbn1cclxuXHJcblVuaXF1ZUlER2VuZXJldG9yLmxhc3RJRCA9IDA7XHJcblxyXG5VbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICBpZiAoVW5pcXVlSURHZW5lcmV0b3IuaXNQcmltaXRpdmUob2JqKSkge1xyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcbiAgaWYgKG9iai51bmlxdWVJRCAhPSBudWxsKSB7XHJcbiAgICByZXR1cm4gb2JqLnVuaXF1ZUlEO1xyXG4gIH1cclxuICBvYmoudW5pcXVlSUQgPSBVbmlxdWVJREdlbmVyZXRvci5nZXRTdHJpbmcoKTtcclxuICBVbmlxdWVJREdlbmVyZXRvci5sYXN0SUQrKztcclxuICByZXR1cm4gb2JqLnVuaXF1ZUlEO1xyXG59XHJcblxyXG5VbmlxdWVJREdlbmVyZXRvci5nZXRTdHJpbmcgPSBmdW5jdGlvbiAoaWQpIHtcclxuICBpZiAoaWQgPT0gbnVsbClcclxuICAgIGlkID0gVW5pcXVlSURHZW5lcmV0b3IubGFzdElEO1xyXG4gIHJldHVybiBcIk9iamVjdCNcIiArIGlkICsgXCJcIjtcclxufVxyXG5cclxuVW5pcXVlSURHZW5lcmV0b3IuaXNQcmltaXRpdmUgPSBmdW5jdGlvbiAoYXJnKSB7XHJcbiAgdmFyIHR5cGUgPSB0eXBlb2YgYXJnO1xyXG4gIHJldHVybiBhcmcgPT0gbnVsbCB8fCAodHlwZSAhPSBcIm9iamVjdFwiICYmIHR5cGUgIT0gXCJmdW5jdGlvblwiKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBVbmlxdWVJREdlbmVyZXRvcjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIERpbWVuc2lvbkQgPSByZXF1aXJlKCcuL0RpbWVuc2lvbkQnKTtcclxudmFyIEhhc2hNYXAgPSByZXF1aXJlKCcuL0hhc2hNYXAnKTtcclxudmFyIEhhc2hTZXQgPSByZXF1aXJlKCcuL0hhc2hTZXQnKTtcclxudmFyIElHZW9tZXRyeSA9IHJlcXVpcmUoJy4vSUdlb21ldHJ5Jyk7XHJcbnZhciBJTWF0aCA9IHJlcXVpcmUoJy4vSU1hdGgnKTtcclxudmFyIEludGVnZXIgPSByZXF1aXJlKCcuL0ludGVnZXInKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9Qb2ludCcpO1xyXG52YXIgUG9pbnREID0gcmVxdWlyZSgnLi9Qb2ludEQnKTtcclxudmFyIFJhbmRvbVNlZWQgPSByZXF1aXJlKCcuL1JhbmRvbVNlZWQnKTtcclxudmFyIFJlY3RhbmdsZUQgPSByZXF1aXJlKCcuL1JlY3RhbmdsZUQnKTtcclxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyk7XHJcbnZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcclxudmFyIExHcmFwaE9iamVjdCA9IHJlcXVpcmUoJy4vTEdyYXBoT2JqZWN0Jyk7XHJcbnZhciBMR3JhcGggPSByZXF1aXJlKCcuL0xHcmFwaCcpO1xyXG52YXIgTEVkZ2UgPSByZXF1aXJlKCcuL0xFZGdlJyk7XHJcbnZhciBMR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9MR3JhcGhNYW5hZ2VyJyk7XHJcbnZhciBMTm9kZSA9IHJlcXVpcmUoJy4vTE5vZGUnKTtcclxudmFyIExheW91dCA9IHJlcXVpcmUoJy4vTGF5b3V0Jyk7XHJcbnZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xyXG52YXIgRkRMYXlvdXQgPSByZXF1aXJlKCcuL0ZETGF5b3V0Jyk7XHJcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcclxudmFyIEZETGF5b3V0RWRnZSA9IHJlcXVpcmUoJy4vRkRMYXlvdXRFZGdlJyk7XHJcbnZhciBGRExheW91dE5vZGUgPSByZXF1aXJlKCcuL0ZETGF5b3V0Tm9kZScpO1xyXG52YXIgQ29TRUNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQ29TRUNvbnN0YW50cycpO1xyXG52YXIgQ29TRUVkZ2UgPSByZXF1aXJlKCcuL0NvU0VFZGdlJyk7XHJcbnZhciBDb1NFR3JhcGggPSByZXF1aXJlKCcuL0NvU0VHcmFwaCcpO1xyXG52YXIgQ29TRUdyYXBoTWFuYWdlciA9IHJlcXVpcmUoJy4vQ29TRUdyYXBoTWFuYWdlcicpO1xyXG52YXIgQ29TRUxheW91dCA9IHJlcXVpcmUoJy4vQ29TRUxheW91dCcpO1xyXG52YXIgQ29TRU5vZGUgPSByZXF1aXJlKCcuL0NvU0VOb2RlJyk7XHJcblxyXG52YXIgZGVmYXVsdHMgPSB7XHJcbiAgLy8gQ2FsbGVkIG9uIGBsYXlvdXRyZWFkeWBcclxuICByZWFkeTogZnVuY3Rpb24gKCkge1xyXG4gIH0sXHJcbiAgLy8gQ2FsbGVkIG9uIGBsYXlvdXRzdG9wYFxyXG4gIHN0b3A6IGZ1bmN0aW9uICgpIHtcclxuICB9LFxyXG4gIC8vIG51bWJlciBvZiB0aWNrcyBwZXIgZnJhbWU7IGhpZ2hlciBpcyBmYXN0ZXIgYnV0IG1vcmUgamVya3lcclxuICByZWZyZXNoOiAzMCxcclxuICAvLyBXaGV0aGVyIHRvIGZpdCB0aGUgbmV0d29yayB2aWV3IGFmdGVyIHdoZW4gZG9uZVxyXG4gIGZpdDogdHJ1ZSxcclxuICAvLyBQYWRkaW5nIG9uIGZpdFxyXG4gIHBhZGRpbmc6IDEwLFxyXG4gIC8vIFBhZGRpbmcgZm9yIGNvbXBvdW5kc1xyXG4gIHBhZGRpbmdDb21wb3VuZDogMTUsXHJcbiAgLy8gV2hldGhlciB0byBlbmFibGUgaW5jcmVtZW50YWwgbW9kZVxyXG4gIHJhbmRvbWl6ZTogdHJ1ZSxcclxuICAvLyBOb2RlIHJlcHVsc2lvbiAobm9uIG92ZXJsYXBwaW5nKSBtdWx0aXBsaWVyXHJcbiAgbm9kZVJlcHVsc2lvbjogNDUwMCxcclxuICAvLyBJZGVhbCBlZGdlIChub24gbmVzdGVkKSBsZW5ndGhcclxuICBpZGVhbEVkZ2VMZW5ndGg6IDUwLFxyXG4gIC8vIERpdmlzb3IgdG8gY29tcHV0ZSBlZGdlIGZvcmNlc1xyXG4gIGVkZ2VFbGFzdGljaXR5OiAwLjQ1LFxyXG4gIC8vIE5lc3RpbmcgZmFjdG9yIChtdWx0aXBsaWVyKSB0byBjb21wdXRlIGlkZWFsIGVkZ2UgbGVuZ3RoIGZvciBuZXN0ZWQgZWRnZXNcclxuICBuZXN0aW5nRmFjdG9yOiAwLjEsXHJcbiAgLy8gR3Jhdml0eSBmb3JjZSAoY29uc3RhbnQpXHJcbiAgZ3Jhdml0eTogMC4yNSxcclxuICAvLyBNYXhpbXVtIG51bWJlciBvZiBpdGVyYXRpb25zIHRvIHBlcmZvcm1cclxuICBudW1JdGVyOiAyNTAwLFxyXG4gIC8vIEZvciBlbmFibGluZyB0aWxpbmdcclxuICB0aWxlOiB0cnVlLFxyXG4gIC8vIFR5cGUgb2YgbGF5b3V0IGFuaW1hdGlvbi4gVGhlIG9wdGlvbiBzZXQgaXMgeydkdXJpbmcnLCAnZW5kJywgZmFsc2V9XHJcbiAgYW5pbWF0ZTogJ2VuZCcsXHJcbiAgLy8gRHVyYXRpb24gZm9yIGFuaW1hdGU6ZW5kXHJcbiAgYW5pbWF0aW9uRHVyYXRpb246IDUwMCxcclxuICAvLyBSZXByZXNlbnRzIHRoZSBhbW91bnQgb2YgdGhlIHZlcnRpY2FsIHNwYWNlIHRvIHB1dCBiZXR3ZWVuIHRoZSB6ZXJvIGRlZ3JlZSBtZW1iZXJzIGR1cmluZyB0aGUgdGlsaW5nIG9wZXJhdGlvbihjYW4gYWxzbyBiZSBhIGZ1bmN0aW9uKVxyXG4gIHRpbGluZ1BhZGRpbmdWZXJ0aWNhbDogMTAsXHJcbiAgLy8gUmVwcmVzZW50cyB0aGUgYW1vdW50IG9mIHRoZSBob3Jpem9udGFsIHNwYWNlIHRvIHB1dCBiZXR3ZWVuIHRoZSB6ZXJvIGRlZ3JlZSBtZW1iZXJzIGR1cmluZyB0aGUgdGlsaW5nIG9wZXJhdGlvbihjYW4gYWxzbyBiZSBhIGZ1bmN0aW9uKVxyXG4gIHRpbGluZ1BhZGRpbmdIb3Jpem9udGFsOiAxMCxcclxuICAvLyBHcmF2aXR5IHJhbmdlIChjb25zdGFudCkgZm9yIGNvbXBvdW5kc1xyXG4gIGdyYXZpdHlSYW5nZUNvbXBvdW5kOiAxLjUsXHJcbiAgLy8gR3Jhdml0eSBmb3JjZSAoY29uc3RhbnQpIGZvciBjb21wb3VuZHNcclxuICBncmF2aXR5Q29tcG91bmQ6IDEuMCxcclxuICAvLyBHcmF2aXR5IHJhbmdlIChjb25zdGFudClcclxuICBncmF2aXR5UmFuZ2U6IDMuOFxyXG59O1xyXG5cclxuZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XHJcbiAgdmFyIG9iaiA9IHt9O1xyXG5cclxuICBmb3IgKHZhciBpIGluIGRlZmF1bHRzKSB7XHJcbiAgICBvYmpbaV0gPSBkZWZhdWx0c1tpXTtcclxuICB9XHJcblxyXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xyXG4gICAgb2JqW2ldID0gb3B0aW9uc1tpXTtcclxuICB9XHJcblxyXG4gIHJldHVybiBvYmo7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBfQ29TRUxheW91dChfb3B0aW9ucykge1xyXG4gIHRoaXMub3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0cywgX29wdGlvbnMpO1xyXG4gIGdldFVzZXJPcHRpb25zKHRoaXMub3B0aW9ucyk7XHJcbn1cclxuXHJcbnZhciBnZXRVc2VyT3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcbiAgaWYgKG9wdGlvbnMubm9kZVJlcHVsc2lvbiAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX1JFUFVMU0lPTl9TVFJFTkdUSCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RIID0gb3B0aW9ucy5ub2RlUmVwdWxzaW9uO1xyXG4gIGlmIChvcHRpb25zLmlkZWFsRWRnZUxlbmd0aCAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA9IG9wdGlvbnMuaWRlYWxFZGdlTGVuZ3RoO1xyXG4gIGlmIChvcHRpb25zLmVkZ2VFbGFzdGljaXR5ICE9IG51bGwpXHJcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfU1BSSU5HX1NUUkVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEggPSBvcHRpb25zLmVkZ2VFbGFzdGljaXR5O1xyXG4gIGlmIChvcHRpb25zLm5lc3RpbmdGYWN0b3IgIT0gbnVsbClcclxuICAgIENvU0VDb25zdGFudHMuUEVSX0xFVkVMX0lERUFMX0VER0VfTEVOR1RIX0ZBQ1RPUiA9IEZETGF5b3V0Q29uc3RhbnRzLlBFUl9MRVZFTF9JREVBTF9FREdFX0xFTkdUSF9GQUNUT1IgPSBvcHRpb25zLm5lc3RpbmdGYWN0b3I7XHJcbiAgaWYgKG9wdGlvbnMuZ3Jhdml0eSAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEggPSBvcHRpb25zLmdyYXZpdHk7XHJcbiAgaWYgKG9wdGlvbnMubnVtSXRlciAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5NQVhfSVRFUkFUSU9OUyA9IEZETGF5b3V0Q29uc3RhbnRzLk1BWF9JVEVSQVRJT05TID0gb3B0aW9ucy5udW1JdGVyO1xyXG4gIGlmIChvcHRpb25zLnBhZGRpbmdDb21wb3VuZCAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0dSQVBIX01BUkdJTiA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBUEhfTUFSR0lOID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBUEhfTUFSR0lOID0gb3B0aW9ucy5wYWRkaW5nQ29tcG91bmQ7XHJcbiAgaWYgKG9wdGlvbnMuZ3Jhdml0eVJhbmdlICE9IG51bGwpXHJcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfUkFOR0VfRkFDVE9SID0gb3B0aW9ucy5ncmF2aXR5UmFuZ2U7XHJcbiAgaWYob3B0aW9ucy5ncmF2aXR5Q29tcG91bmQgIT0gbnVsbClcclxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1NUUkVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1NUUkVOR1RIID0gb3B0aW9ucy5ncmF2aXR5Q29tcG91bmQ7XHJcbiAgaWYob3B0aW9ucy5ncmF2aXR5UmFuZ2VDb21wb3VuZCAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfUkFOR0VfRkFDVE9SID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IG9wdGlvbnMuZ3Jhdml0eVJhbmdlQ29tcG91bmQ7XHJcblxyXG4gIENvU0VDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUwgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9XHJcbiAgICAgICAgICAhKG9wdGlvbnMucmFuZG9taXplKTtcclxuICBDb1NFQ29uc3RhbnRzLkFOSU1BVEUgPSBGRExheW91dENvbnN0YW50cy5BTklNQVRFID0gb3B0aW9ucy5hbmltYXRlO1xyXG4gIENvU0VDb25zdGFudHMuVElMRSA9IG9wdGlvbnMudGlsZTtcclxuICBDb1NFQ29uc3RhbnRzLlRJTElOR19QQURESU5HX1ZFUlRJQ0FMID0gXHJcbiAgICAgICAgICB0eXBlb2Ygb3B0aW9ucy50aWxpbmdQYWRkaW5nVmVydGljYWwgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLnRpbGluZ1BhZGRpbmdWZXJ0aWNhbC5jYWxsKCkgOiBvcHRpb25zLnRpbGluZ1BhZGRpbmdWZXJ0aWNhbDtcclxuICBDb1NFQ29uc3RhbnRzLlRJTElOR19QQURESU5HX0hPUklaT05UQUwgPSBcclxuICAgICAgICAgIHR5cGVvZiBvcHRpb25zLnRpbGluZ1BhZGRpbmdIb3Jpem9udGFsID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy50aWxpbmdQYWRkaW5nSG9yaXpvbnRhbC5jYWxsKCkgOiBvcHRpb25zLnRpbGluZ1BhZGRpbmdIb3Jpem9udGFsO1xyXG59O1xyXG5cclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgcmVhZHk7XHJcbiAgdmFyIGZyYW1lSWQ7XHJcbiAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XHJcbiAgdmFyIGlkVG9MTm9kZSA9IHRoaXMuaWRUb0xOb2RlID0ge307XHJcbiAgdmFyIGxheW91dCA9IHRoaXMubGF5b3V0ID0gbmV3IENvU0VMYXlvdXQoKTtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgXHJcbiAgdGhpcy5jeSA9IHRoaXMub3B0aW9ucy5jeTtcclxuXHJcbiAgdGhpcy5jeS50cmlnZ2VyKHsgdHlwZTogJ2xheW91dHN0YXJ0JywgbGF5b3V0OiB0aGlzIH0pO1xyXG5cclxuICB2YXIgZ20gPSBsYXlvdXQubmV3R3JhcGhNYW5hZ2VyKCk7XHJcbiAgdGhpcy5nbSA9IGdtO1xyXG5cclxuICB2YXIgbm9kZXMgPSB0aGlzLm9wdGlvbnMuZWxlcy5ub2RlcygpO1xyXG4gIHZhciBlZGdlcyA9IHRoaXMub3B0aW9ucy5lbGVzLmVkZ2VzKCk7XHJcblxyXG4gIHRoaXMucm9vdCA9IGdtLmFkZFJvb3QoKTtcclxuICB0aGlzLnByb2Nlc3NDaGlsZHJlbkxpc3QodGhpcy5yb290LCB0aGlzLmdldFRvcE1vc3ROb2Rlcyhub2RlcyksIGxheW91dCk7XHJcblxyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG4gICAgdmFyIHNvdXJjZU5vZGUgPSB0aGlzLmlkVG9MTm9kZVtlZGdlLmRhdGEoXCJzb3VyY2VcIildO1xyXG4gICAgdmFyIHRhcmdldE5vZGUgPSB0aGlzLmlkVG9MTm9kZVtlZGdlLmRhdGEoXCJ0YXJnZXRcIildO1xyXG4gICAgdmFyIGUxID0gZ20uYWRkKGxheW91dC5uZXdFZGdlKCksIHNvdXJjZU5vZGUsIHRhcmdldE5vZGUpO1xyXG4gICAgZTEuaWQgPSBlZGdlLmlkKCk7XHJcbiAgfVxyXG4gIFxyXG4gICB2YXIgZ2V0UG9zaXRpb25zID0gZnVuY3Rpb24oZWxlLCBpKXtcclxuICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgZWxlID0gaTtcclxuICAgIH1cclxuICAgIHZhciB0aGVJZCA9IGVsZS5kYXRhKCdpZCcpO1xyXG4gICAgdmFyIGxOb2RlID0gc2VsZi5pZFRvTE5vZGVbdGhlSWRdO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHg6IGxOb2RlLmdldFJlY3QoKS5nZXRDZW50ZXJYKCksXHJcbiAgICAgIHk6IGxOb2RlLmdldFJlY3QoKS5nZXRDZW50ZXJZKClcclxuICAgIH07XHJcbiAgfTtcclxuICBcclxuICAvKlxyXG4gICAqIFJlcG9zaXRpb24gbm9kZXMgaW4gaXRlcmF0aW9ucyBhbmltYXRlZGx5XHJcbiAgICovXHJcbiAgdmFyIGl0ZXJhdGVBbmltYXRlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIFRoaWdzIHRvIHBlcmZvcm0gYWZ0ZXIgbm9kZXMgYXJlIHJlcG9zaXRpb25lZCBvbiBzY3JlZW5cclxuICAgIHZhciBhZnRlclJlcG9zaXRpb24gPSBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKG9wdGlvbnMuZml0KSB7XHJcbiAgICAgICAgb3B0aW9ucy5jeS5maXQob3B0aW9ucy5lbGVzLm5vZGVzKCksIG9wdGlvbnMucGFkZGluZyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghcmVhZHkpIHtcclxuICAgICAgICByZWFkeSA9IHRydWU7XHJcbiAgICAgICAgc2VsZi5jeS5vbmUoJ2xheW91dHJlYWR5Jywgb3B0aW9ucy5yZWFkeSk7XHJcbiAgICAgICAgc2VsZi5jeS50cmlnZ2VyKHt0eXBlOiAnbGF5b3V0cmVhZHknLCBsYXlvdXQ6IHNlbGZ9KTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgdmFyIHRpY2tzUGVyRnJhbWUgPSBzZWxmLm9wdGlvbnMucmVmcmVzaDtcclxuICAgIHZhciBpc0RvbmU7XHJcblxyXG4gICAgZm9yKCB2YXIgaSA9IDA7IGkgPCB0aWNrc1BlckZyYW1lICYmICFpc0RvbmU7IGkrKyApe1xyXG4gICAgICBpc0RvbmUgPSBzZWxmLmxheW91dC50aWNrKCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIElmIGxheW91dCBpcyBkb25lXHJcbiAgICBpZiAoaXNEb25lKSB7XHJcbiAgICAgIHNlbGYub3B0aW9ucy5lbGVzLm5vZGVzKCkucG9zaXRpb25zKGdldFBvc2l0aW9ucyk7XHJcbiAgICAgIFxyXG4gICAgICBhZnRlclJlcG9zaXRpb24oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIHRyaWdnZXIgbGF5b3V0c3RvcCB3aGVuIHRoZSBsYXlvdXQgc3RvcHMgKGUuZy4gZmluaXNoZXMpXHJcbiAgICAgIHNlbGYuY3kub25lKCdsYXlvdXRzdG9wJywgc2VsZi5vcHRpb25zLnN0b3ApO1xyXG4gICAgICBzZWxmLmN5LnRyaWdnZXIoJ2xheW91dHN0b3AnKTtcclxuICAgICAgc2VsZi5jeS50cmlnZ2VyKHsgdHlwZTogJ2xheW91dHN0b3AnLCBsYXlvdXQ6IHNlbGYgfSk7XHJcblxyXG4gICAgICBpZiAoZnJhbWVJZCkge1xyXG4gICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGZyYW1lSWQpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBzZWxmLm9wdGlvbnMuZWxlcy5ub2RlcygpLnJlbW92ZVNjcmF0Y2goJ2Nvc2VCaWxrZW50Jyk7XHJcbiAgICAgIHJlYWR5ID0gZmFsc2U7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGFuaW1hdGlvbkRhdGEgPSBzZWxmLmxheW91dC5nZXRQb3NpdGlvbnNEYXRhKCk7IC8vIEdldCBwb3NpdGlvbnMgb2YgbGF5b3V0IG5vZGVzIG5vdGUgdGhhdCBhbGwgbm9kZXMgbWF5IG5vdCBiZSBsYXlvdXQgbm9kZXMgYmVjYXVzZSBvZiB0aWxpbmdcclxuICAgIFxyXG4gICAgLy8gUG9zaXRpb24gbm9kZXMsIGZvciB0aGUgbm9kZXMgd2hvc2UgaWQgZG9lcyBub3QgaW5jbHVkZWQgaW4gZGF0YSAoYmVjYXVzZSB0aGV5IGFyZSByZW1vdmVkIGZyb20gdGhlaXIgcGFyZW50cyBhbmQgaW5jbHVkZWQgaW4gZHVtbXkgY29tcG91bmRzKVxyXG4gICAgLy8gdXNlIHBvc2l0aW9uIG9mIHRoZWlyIGFuY2VzdG9ycyBvciBkdW1teSBhbmNlc3RvcnNcclxuICAgIG9wdGlvbnMuZWxlcy5ub2RlcygpLnBvc2l0aW9ucyhmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgIGlmICh0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgZWxlID0gaTtcclxuICAgICAgfVxyXG4gICAgICB2YXIgdGhlSWQgPSBlbGUuaWQoKTtcclxuICAgICAgdmFyIHBOb2RlID0gYW5pbWF0aW9uRGF0YVt0aGVJZF07XHJcbiAgICAgIHZhciB0ZW1wID0gZWxlO1xyXG4gICAgICAvLyBJZiBwTm9kZSBpcyB1bmRlZmluZWQgc2VhcmNoIHVudGlsIGZpbmRpbmcgcG9zaXRpb24gZGF0YSBvZiBpdHMgZmlyc3QgYW5jZXN0b3IgKEl0IG1heSBiZSBkdW1teSBhcyB3ZWxsKVxyXG4gICAgICB3aGlsZSAocE5vZGUgPT0gbnVsbCkge1xyXG4gICAgICAgIHBOb2RlID0gYW5pbWF0aW9uRGF0YVt0ZW1wLmRhdGEoJ3BhcmVudCcpXSB8fCBhbmltYXRpb25EYXRhWydEdW1teUNvbXBvdW5kXycgKyB0ZW1wLmRhdGEoJ3BhcmVudCcpXTtcclxuICAgICAgICBhbmltYXRpb25EYXRhW3RoZUlkXSA9IHBOb2RlO1xyXG4gICAgICAgIHRlbXAgPSB0ZW1wLnBhcmVudCgpWzBdO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogcE5vZGUueCxcclxuICAgICAgICB5OiBwTm9kZS55XHJcbiAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBhZnRlclJlcG9zaXRpb24oKTtcclxuXHJcbiAgICBmcmFtZUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGl0ZXJhdGVBbmltYXRlZCk7XHJcbiAgfTtcclxuICBcclxuICAvKlxyXG4gICogTGlzdGVuICdsYXlvdXRzdGFydGVkJyBldmVudCBhbmQgc3RhcnQgYW5pbWF0ZWQgaXRlcmF0aW9uIGlmIGFuaW1hdGUgb3B0aW9uIGlzICdkdXJpbmcnXHJcbiAgKi9cclxuICBsYXlvdXQuYWRkTGlzdGVuZXIoJ2xheW91dHN0YXJ0ZWQnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAoc2VsZi5vcHRpb25zLmFuaW1hdGUgPT09ICdkdXJpbmcnKSB7XHJcbiAgICAgIGZyYW1lSWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoaXRlcmF0ZUFuaW1hdGVkKTtcclxuICAgIH1cclxuICB9KTtcclxuICBcclxuICBsYXlvdXQucnVuTGF5b3V0KCk7IC8vIFJ1biBjb3NlIGxheW91dFxyXG4gIFxyXG4gIC8qXHJcbiAgICogSWYgYW5pbWF0ZSBvcHRpb24gaXMgbm90ICdkdXJpbmcnICgnZW5kJyBvciBmYWxzZSkgcGVyZm9ybSB0aGVzZSBoZXJlIChJZiBpdCBpcyAnZHVyaW5nJyBzaW1pbGFyIHRoaW5ncyBhcmUgYWxyZWFkeSBwZXJmb3JtZWQpXHJcbiAgICovXHJcbiAgaWYodGhpcy5vcHRpb25zLmFuaW1hdGUgIT09ICdkdXJpbmcnKXtcclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgIHNlbGYub3B0aW9ucy5lbGVzLm5vZGVzKCkubm90KFwiOnBhcmVudFwiKS5sYXlvdXRQb3NpdGlvbnMoc2VsZiwgc2VsZi5vcHRpb25zLCBnZXRQb3NpdGlvbnMpOyAvLyBVc2UgbGF5b3V0IHBvc2l0aW9ucyB0byByZXBvc2l0aW9uIHRoZSBub2RlcyBpdCBjb25zaWRlcnMgdGhlIG9wdGlvbnMgcGFyYW1ldGVyXHJcbiAgICAgIHNlbGYub3B0aW9ucy5lbGVzLm5vZGVzKCkucmVtb3ZlU2NyYXRjaCgnY29zZUJpbGtlbnQnKTtcclxuICAgICAgcmVhZHkgPSBmYWxzZTtcclxuICAgIH0sIDApO1xyXG4gICAgXHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpczsgLy8gY2hhaW5pbmdcclxufTtcclxuXHJcbi8vR2V0IHRoZSB0b3AgbW9zdCBvbmVzIG9mIGEgbGlzdCBvZiBub2Rlc1xyXG5fQ29TRUxheW91dC5wcm90b3R5cGUuZ2V0VG9wTW9zdE5vZGVzID0gZnVuY3Rpb24obm9kZXMpIHtcclxuICB2YXIgbm9kZXNNYXAgPSB7fTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIG5vZGVzTWFwW25vZGVzW2ldLmlkKCldID0gdHJ1ZTtcclxuICB9XHJcbiAgdmFyIHJvb3RzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChlbGUsIGkpIHtcclxuICAgICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgIGVsZSA9IGk7XHJcbiAgICAgIH1cclxuICAgICAgdmFyIHBhcmVudCA9IGVsZS5wYXJlbnQoKVswXTtcclxuICAgICAgd2hpbGUocGFyZW50ICE9IG51bGwpe1xyXG4gICAgICAgIGlmKG5vZGVzTWFwW3BhcmVudC5pZCgpXSl7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQoKVswXTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHJvb3RzO1xyXG59O1xyXG5cclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLnByb2Nlc3NDaGlsZHJlbkxpc3QgPSBmdW5jdGlvbiAocGFyZW50LCBjaGlsZHJlbiwgbGF5b3V0KSB7XHJcbiAgdmFyIHNpemUgPSBjaGlsZHJlbi5sZW5ndGg7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcclxuICAgIHZhciB0aGVDaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgdGhpcy5vcHRpb25zLmVsZXMubm9kZXMoKS5sZW5ndGg7XHJcbiAgICB2YXIgY2hpbGRyZW5fb2ZfY2hpbGRyZW4gPSB0aGVDaGlsZC5jaGlsZHJlbigpO1xyXG4gICAgdmFyIHRoZU5vZGU7XHJcblxyXG4gICAgaWYgKHRoZUNoaWxkLndpZHRoKCkgIT0gbnVsbFxyXG4gICAgICAgICAgICAmJiB0aGVDaGlsZC5oZWlnaHQoKSAhPSBudWxsKSB7XHJcbiAgICAgIHRoZU5vZGUgPSBwYXJlbnQuYWRkKG5ldyBDb1NFTm9kZShsYXlvdXQuZ3JhcGhNYW5hZ2VyLFxyXG4gICAgICAgICAgICAgIG5ldyBQb2ludEQodGhlQ2hpbGQucG9zaXRpb24oJ3gnKSAtIHRoZUNoaWxkLndpZHRoKCkgLyAyLCB0aGVDaGlsZC5wb3NpdGlvbigneScpIC0gdGhlQ2hpbGQuaGVpZ2h0KCkgLyAyKSxcclxuICAgICAgICAgICAgICBuZXcgRGltZW5zaW9uRChwYXJzZUZsb2F0KHRoZUNoaWxkLndpZHRoKCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgcGFyc2VGbG9hdCh0aGVDaGlsZC5oZWlnaHQoKSkpKSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhlTm9kZSA9IHBhcmVudC5hZGQobmV3IENvU0VOb2RlKHRoaXMuZ3JhcGhNYW5hZ2VyKSk7XHJcbiAgICB9XHJcbiAgICAvLyBBdHRhY2ggaWQgdG8gdGhlIGxheW91dCBub2RlXHJcbiAgICB0aGVOb2RlLmlkID0gdGhlQ2hpbGQuZGF0YShcImlkXCIpO1xyXG4gICAgLy8gQXR0YWNoIHRoZSBwYWRkaW5ncyBvZiBjeSBub2RlIHRvIGxheW91dCBub2RlXHJcbiAgICB0aGVOb2RlLnBhZGRpbmdMZWZ0ID0gcGFyc2VJbnQoIHRoZUNoaWxkLmNzcygncGFkZGluZy1sZWZ0JykgKTtcclxuICAgIHRoZU5vZGUucGFkZGluZ1RvcCA9IHBhcnNlSW50KCB0aGVDaGlsZC5jc3MoJ3BhZGRpbmctdG9wJykgKTtcclxuICAgIHRoZU5vZGUucGFkZGluZ1JpZ2h0ID0gcGFyc2VJbnQoIHRoZUNoaWxkLmNzcygncGFkZGluZy1yaWdodCcpICk7XHJcbiAgICB0aGVOb2RlLnBhZGRpbmdCb3R0b20gPSBwYXJzZUludCggdGhlQ2hpbGQuY3NzKCdwYWRkaW5nLWJvdHRvbScpICk7XHJcbiAgICAvLyBNYXAgdGhlIGxheW91dCBub2RlXHJcbiAgICB0aGlzLmlkVG9MTm9kZVt0aGVDaGlsZC5kYXRhKFwiaWRcIildID0gdGhlTm9kZTtcclxuXHJcbiAgICBpZiAoaXNOYU4odGhlTm9kZS5yZWN0LngpKSB7XHJcbiAgICAgIHRoZU5vZGUucmVjdC54ID0gMDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaXNOYU4odGhlTm9kZS5yZWN0LnkpKSB7XHJcbiAgICAgIHRoZU5vZGUucmVjdC55ID0gMDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY2hpbGRyZW5fb2ZfY2hpbGRyZW4gIT0gbnVsbCAmJiBjaGlsZHJlbl9vZl9jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHZhciB0aGVOZXdHcmFwaDtcclxuICAgICAgdGhlTmV3R3JhcGggPSBsYXlvdXQuZ2V0R3JhcGhNYW5hZ2VyKCkuYWRkKGxheW91dC5uZXdHcmFwaCgpLCB0aGVOb2RlKTtcclxuICAgICAgdGhpcy5wcm9jZXNzQ2hpbGRyZW5MaXN0KHRoZU5ld0dyYXBoLCBjaGlsZHJlbl9vZl9jaGlsZHJlbiwgbGF5b3V0KTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQGJyaWVmIDogY2FsbGVkIG9uIGNvbnRpbnVvdXMgbGF5b3V0cyB0byBzdG9wIHRoZW0gYmVmb3JlIHRoZXkgZmluaXNoXHJcbiAqL1xyXG5fQ29TRUxheW91dC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLnN0b3BwZWQgPSB0cnVlO1xyXG4gIFxyXG4gIHRoaXMudHJpZ2dlcignbGF5b3V0c3RvcCcpO1xyXG5cclxuICByZXR1cm4gdGhpczsgLy8gY2hhaW5pbmdcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2V0KGN5dG9zY2FwZSkge1xyXG4gIHJldHVybiBfQ29TRUxheW91dDtcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG52YXIgZ2V0TGF5b3V0ID0gcmVxdWlyZSgnLi9MYXlvdXQnKTtcclxuXHJcbnZhciByZWdpc3RlciA9IGZ1bmN0aW9uKCBjeXRvc2NhcGUgKXtcclxuICB2YXIgTGF5b3V0ID0gZ2V0TGF5b3V0KCBjeXRvc2NhcGUgKTtcclxuXHJcbiAgY3l0b3NjYXBlKCdsYXlvdXQnLCAnY29zZS1iaWxrZW50JywgTGF5b3V0KTtcclxufTtcclxuXHJcbi8vIGF1dG8gcmVnIGZvciBnbG9iYWxzXHJcbmlmKCB0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyApe1xyXG4gIHJlZ2lzdGVyKCBjeXRvc2NhcGUgKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcclxuIl19
