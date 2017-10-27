(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeCoseBilkent = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var FDLayoutConstants = require('./FDLayoutConstants');

function CoSEConstants() {}

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
'use strict';

var FDLayoutEdge = require('./FDLayoutEdge');

function CoSEEdge(source, target, vEdge) {
  FDLayoutEdge.call(this, source, target, vEdge);
}

CoSEEdge.prototype = Object.create(FDLayoutEdge.prototype);
for (var prop in FDLayoutEdge) {
  CoSEEdge[prop] = FDLayoutEdge[prop];
}

module.exports = CoSEEdge;

},{"./FDLayoutEdge":11}],3:[function(require,module,exports){
'use strict';

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
'use strict';

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
'use strict';

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
    if (CoSEConstants.DEFAULT_EDGE_LENGTH < 10) {
      this.idealEdgeLength = 10;
    } else {
      this.idealEdgeLength = CoSEConstants.DEFAULT_EDGE_LENGTH;
    }

    this.useSmartIdealEdgeLengthCalculation = CoSEConstants.DEFAULT_USE_SMART_IDEAL_EDGE_LENGTH_CALCULATION;
    this.springConstant = FDLayoutConstants.DEFAULT_SPRING_STRENGTH;
    this.repulsionConstant = FDLayoutConstants.DEFAULT_REPULSION_STRENGTH;
    this.gravityConstant = FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH;
    this.compoundGravityConstant = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH;
    this.gravityRangeFactor = FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR;
    this.compoundGravityRangeFactor = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR;
  }
};

CoSELayout.prototype.layout = function () {
  var createBendsAsNeeded = LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
  if (createBendsAsNeeded) {
    this.createBendpoints();
    this.graphManager.resetAllEdges();
  }

  this.level = 0;
  return this.classicLayout();
};

CoSELayout.prototype.classicLayout = function () {
  this.calculateNodesToApplyGravitationTo();
  this.calcNoOfChildrenForAllNodes();
  this.graphManager.calcLowestCommonAncestors();
  this.graphManager.calcInclusionTreeDepths();
  this.graphManager.getRoot().calcEstimatedSize();
  this.calcIdealEdgeLengths();
  if (!this.incremental) {
    var forest = this.getFlatForest();

    // The graph associated with this layout is flat and a forest
    if (forest.length > 0) {
      this.positionNodesRadially(forest);
    }
    // The graph associated with this layout is not flat or a forest
    else {
        this.positionNodesRandomly();
      }
  }

  this.initSpringEmbedder();
  this.runSpringEmbedder();

  return true;
};

CoSELayout.prototype.tick = function () {
  this.totalIterations++;

  if (this.totalIterations === this.maxIterations) {
    return true; // Layout is not ended return true
  }

  if (this.totalIterations % FDLayoutConstants.CONVERGENCE_CHECK_PERIOD == 0) {
    if (this.isConverged()) {
      return true; // Layout is not ended return true
    }

    this.coolingFactor = this.initialCoolingFactor * ((this.maxIterations - this.totalIterations) / this.maxIterations);
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

CoSELayout.prototype.getPositionsData = function () {
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
  if (FDLayoutConstants.ANIMATE === 'during') {
    this.emit('layoutstarted');
  } else {
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
  for (i = 0; i < size; i++) {
    graph = graphs[i];

    graph.updateConnected();

    if (!graph.isConnected) {
      nodeList = nodeList.concat(graph.getNodes());
    }
  }

  this.graphManager.setAllNodesToApplyGravitation(nodeList);
};

CoSELayout.prototype.calcNoOfChildrenForAllNodes = function () {
  var node;
  var allNodes = this.graphManager.getAllNodes();

  for (var i = 0; i < allNodes.length; i++) {
    node = allNodes[i];
    node.noOfChildren = node.getNoOfChildren();
  }
};

CoSELayout.prototype.createBendpoints = function () {
  var edges = [];
  edges = edges.concat(this.graphManager.getAllEdges());
  var visited = new HashSet();
  var i;
  for (i = 0; i < edges.length; i++) {
    var edge = edges[i];

    if (!visited.contains(edge)) {
      var source = edge.getSource();
      var target = edge.getTarget();

      if (source == target) {
        edge.getBendpoints().push(new PointD());
        edge.getBendpoints().push(new PointD());
        this.createDummyNodesForBendpoints(edge);
        visited.add(edge);
      } else {
        var edgeList = [];

        edgeList = edgeList.concat(source.getEdgeListToNode(target));
        edgeList = edgeList.concat(target.getEdgeListToNode(source));

        if (!visited.contains(edgeList[0])) {
          if (edgeList.length > 1) {
            var k;
            for (k = 0; k < edgeList.length; k++) {
              var multiEdge = edgeList[k];
              multiEdge.getBendpoints().push(new PointD());
              this.createDummyNodesForBendpoints(multiEdge);
            }
          }
          visited.addAll(list);
        }
      }
    }

    if (visited.size() == edges.length) {
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

  for (var i = 0; i < forest.length; i++) {
    if (i % numberOfColumns == 0) {
      // Start of a new row, make the x coordinate 0, increment the
      // y coordinate with the max height of the previous row
      currentX = 0;
      currentY = height;

      if (i != 0) {
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
    point = CoSELayout.radialLayout(tree, centerNode, currentStartingPoint);

    if (point.y > height) {
      height = Math.floor(point.y);
    }

    currentX = Math.floor(point.x + CoSEConstants.DEFAULT_COMPONENT_SEPERATION);
  }

  this.transform(new PointD(LayoutConstants.WORLD_CENTER_X - point.x / 2, LayoutConstants.WORLD_CENTER_Y - point.y / 2));
};

CoSELayout.radialLayout = function (tree, centerNode, startingPoint) {
  var radialSep = Math.max(this.maxDiagonalInTree(tree), CoSEConstants.DEFAULT_RADIAL_SEPARATION);
  CoSELayout.branchRadialLayout(centerNode, null, 0, 359, 0, radialSep);
  var bounds = LGraph.calculateBounds(tree);

  var transform = new Transform();
  transform.setDeviceOrgX(bounds.getMinX());
  transform.setDeviceOrgY(bounds.getMinY());
  transform.setWorldOrgX(startingPoint.x);
  transform.setWorldOrgY(startingPoint.y);

  for (var i = 0; i < tree.length; i++) {
    var node = tree[i];
    node.transform(transform);
  }

  var bottomRight = new PointD(bounds.getMaxX(), bounds.getMaxY());

  return transform.inverseTransformPoint(bottomRight);
};

CoSELayout.branchRadialLayout = function (node, parentOfNode, startAngle, endAngle, distance, radialSeparation) {
  // First, position this node by finding its angle.
  var halfInterval = (endAngle - startAngle + 1) / 2;

  if (halfInterval < 0) {
    halfInterval += 180;
  }

  var nodeAngle = (halfInterval + startAngle) % 360;
  var teta = nodeAngle * IGeometry.TWO_PI / 360;

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

  if (parentOfNode != null) {
    childCount--;
  }

  var branchCount = 0;

  var incEdgesCount = neighborEdges.length;
  var startIndex;

  var edges = node.getEdgesBetween(parentOfNode);

  // If there are multiple edges, prune them until there remains only one
  // edge.
  while (edges.length > 1) {
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

  if (parentOfNode != null) {
    //assert edges.length == 1;
    startIndex = (neighborEdges.indexOf(edges[0]) + 1) % incEdgesCount;
  } else {
    startIndex = 0;
  }

  var stepAngle = Math.abs(endAngle - startAngle) / childCount;

  for (var i = startIndex; branchCount != childCount; i = ++i % incEdgesCount) {
    var currentNeighbor = neighborEdges[i].getOtherEnd(node);

    // Don't back traverse to root node in current tree.
    if (currentNeighbor == parentOfNode) {
      continue;
    }

    var childStartAngle = (startAngle + branchCount * stepAngle) % 360;
    var childEndAngle = (childStartAngle + stepAngle) % 360;

    CoSELayout.branchRadialLayout(currentNeighbor, node, childStartAngle, childEndAngle, distance + radialSeparation, radialSeparation);

    branchCount++;
  }
};

CoSELayout.maxDiagonalInTree = function (tree) {
  var maxDiagonal = Integer.MIN_VALUE;

  for (var i = 0; i < tree.length; i++) {
    var node = tree[i];
    var diagonal = node.getDiagonal();

    if (diagonal > maxDiagonal) {
      maxDiagonal = diagonal;
    }
  }

  return maxDiagonal;
};

CoSELayout.prototype.calcRepulsionRange = function () {
  // formula is 2 x (level + 1) x idealEdgeLength
  return 2 * (this.level + 1) * this.idealEdgeLength;
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
    if (this.getNodeDegreeWithChildren(node) === 0 && (parent.id == undefined || !this.getToBeTiled(parent))) {
      zeroDegree.push(node);
    }
  }

  // Create a map of parent node and its zero degree members
  for (var i = 0; i < zeroDegree.length; i++) {
    var node = zeroDegree[i]; // Zero degree node itself
    var p_id = node.getParent().id; // Parent id

    if (typeof tempMemberGroups[p_id] === "undefined") tempMemberGroups[p_id] = [];

    tempMemberGroups[p_id] = tempMemberGroups[p_id].concat(node); // Push node to the list belongs to its parent in tempMemberGroups
  }

  // If there are at least two nodes at a level, create a dummy compound for them
  Object.keys(tempMemberGroups).forEach(function (p_id) {
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

  Object.keys(this.memberGroups).forEach(function (id) {
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

  Object.keys(tiledPack).forEach(function (id) {
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

      lnode.rect.x = x; // + lnode.rect.width / 2;
      lnode.rect.y = y; // + lnode.rect.height / 2;

      x += lnode.rect.width + organization.horizontalPadding;

      if (lnode.rect.height > maxHeight) maxHeight = lnode.rect.height;
    }

    y += maxHeight + organization.verticalPadding;
  }
};

CoSELayout.prototype.tileCompoundMembers = function (childGraphMap, idToNode) {
  var self = this;
  this.tiledMemberPack = [];

  Object.keys(childGraphMap).forEach(function (id) {
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
    if (n1.rect.width * n1.rect.height > n2.rect.width * n2.rect.height) return -1;
    if (n1.rect.width * n1.rect.height < n2.rect.width * n2.rect.height) return 1;
    return 0;
  });

  // Create the organization -> tile members
  for (var i = 0; i < nodes.length; i++) {
    var lNode = nodes[i];

    if (organization.rows.length == 0) {
      this.insertNodeToRow(organization, lNode, 0, minWidth);
    } else if (this.canAddHorizontal(organization, lNode.rect.width, lNode.rect.height)) {
      this.insertNodeToRow(organization, lNode, this.getShortestRowIndex(organization), minWidth);
    } else {
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
  if (rowIndex > 0) h += organization.verticalPadding;

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

  if (min + organization.horizontalPadding + extraWidth <= organization.width) return true;

  var hDiff = 0;

  // Adding to an existing row
  if (organization.rowHeight[sri] < extraHeight) {
    if (sri > 0) hDiff = extraHeight + organization.verticalPadding - organization.rowHeight[sri];
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

  if (add_new_row_ratio < 1) add_new_row_ratio = 1 / add_new_row_ratio;

  if (add_to_row_ratio < 1) add_to_row_ratio = 1 / add_to_row_ratio;

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
      if (row[i].height > maxHeight) maxHeight = row[i].height;
    }
    if (longest > 0) maxHeight += organization.verticalPadding;

    var prevTotal = organization.rowHeight[longest] + organization.rowHeight[last];

    organization.rowHeight[longest] = maxHeight;
    if (organization.rowHeight[last] < node.height + organization.verticalPadding) organization.rowHeight[last] = node.height + organization.verticalPadding;

    var finalTotal = organization.rowHeight[longest] + organization.rowHeight[last];
    organization.height += finalTotal - prevTotal;

    this.shiftToLastRow(organization);
  }
};

CoSELayout.prototype.tilingPreLayout = function () {
  if (CoSEConstants.TILE) {
    // Find zero degree nodes and create a compound for each level
    this.groupZeroDegreeMembers();
    // Tile and clear children of each compound
    this.clearCompounds();
    // Separately tile and clear zero degree nodes for each level
    this.clearZeroDegreeMembers();
  }
};

CoSELayout.prototype.tilingPostLayout = function () {
  if (CoSEConstants.TILE) {
    this.repopulateZeroDegreeMembers();
    this.repopulateCompounds();
  }
};

module.exports = CoSELayout;

},{"./CoSEConstants":1,"./CoSEEdge":2,"./CoSEGraph":3,"./CoSEGraphManager":4,"./CoSENode":6,"./FDLayout":9,"./FDLayoutConstants":10,"./IGeometry":15,"./Integer":17,"./LGraph":19,"./Layout":23,"./LayoutConstants":24,"./Point":25,"./PointD":26,"./Transform":29}],6:[function(require,module,exports){
'use strict';

var FDLayoutNode = require('./FDLayoutNode');
var IMath = require('./IMath');

function CoSENode(gm, loc, size, vNode) {
  FDLayoutNode.call(this, gm, loc, size, vNode);
}

CoSENode.prototype = Object.create(FDLayoutNode.prototype);
for (var prop in FDLayoutNode) {
  CoSENode[prop] = FDLayoutNode[prop];
}

CoSENode.prototype.move = function () {
  var layout = this.graphManager.getLayout();
  this.displacementX = layout.coolingFactor * (this.springForceX + this.repulsionForceX + this.gravitationForceX) / this.noOfChildren;
  this.displacementY = layout.coolingFactor * (this.springForceY + this.repulsionForceY + this.gravitationForceY) / this.noOfChildren;

  if (Math.abs(this.displacementX) > layout.coolingFactor * layout.maxNodeDisplacement) {
    this.displacementX = layout.coolingFactor * layout.maxNodeDisplacement * IMath.sign(this.displacementX);
  }

  if (Math.abs(this.displacementY) > layout.coolingFactor * layout.maxNodeDisplacement) {
    this.displacementY = layout.coolingFactor * layout.maxNodeDisplacement * IMath.sign(this.displacementY);
  }

  // a simple node, just move it
  if (this.child == null) {
    this.moveBy(this.displacementX, this.displacementY);
  }
  // an empty compound node, again just move it
  else if (this.child.getNodes().length == 0) {
      this.moveBy(this.displacementX, this.displacementY);
    }
    // non-empty compound node, propogate movement to children as well
    else {
        this.propogateDisplacementToChildren(this.displacementX, this.displacementY);
      }

  layout.totalDisplacement += Math.abs(this.displacementX) + Math.abs(this.displacementY);

  this.springForceX = 0;
  this.springForceY = 0;
  this.repulsionForceX = 0;
  this.repulsionForceY = 0;
  this.gravitationForceX = 0;
  this.gravitationForceY = 0;
  this.displacementX = 0;
  this.displacementY = 0;
};

CoSENode.prototype.propogateDisplacementToChildren = function (dX, dY) {
  var nodes = this.getChild().getNodes();
  var node;
  for (var i = 0; i < nodes.length; i++) {
    node = nodes[i];
    if (node.getChild() == null) {
      node.moveBy(dX, dY);
      node.displacementX += dX;
      node.displacementY += dY;
    } else {
      node.propogateDisplacementToChildren(dX, dY);
    }
  }
};

CoSENode.prototype.setPred1 = function (pred1) {
  this.pred1 = pred1;
};

CoSENode.prototype.getPred1 = function () {
  return pred1;
};

CoSENode.prototype.getPred2 = function () {
  return pred2;
};

CoSENode.prototype.setNext = function (next) {
  this.next = next;
};

CoSENode.prototype.getNext = function () {
  return next;
};

CoSENode.prototype.setProcessed = function (processed) {
  this.processed = processed;
};

CoSENode.prototype.isProcessed = function () {
  return processed;
};

module.exports = CoSENode;

},{"./FDLayoutNode":12,"./IMath":16}],7:[function(require,module,exports){
"use strict";

function DimensionD(width, height) {
  this.width = 0;
  this.height = 0;
  if (width !== null && height !== null) {
    this.height = height;
    this.width = width;
  }
}

DimensionD.prototype.getWidth = function () {
  return this.width;
};

DimensionD.prototype.setWidth = function (width) {
  this.width = width;
};

DimensionD.prototype.getHeight = function () {
  return this.height;
};

DimensionD.prototype.setHeight = function (height) {
  this.height = height;
};

module.exports = DimensionD;

},{}],8:[function(require,module,exports){
"use strict";

function Emitter() {
  this.listeners = [];
}

var p = Emitter.prototype;

p.addListener = function (event, callback) {
  this.listeners.push({
    event: event,
    callback: callback
  });
};

p.removeListener = function (event, callback) {
  for (var i = this.listeners.length; i >= 0; i--) {
    var l = this.listeners[i];

    if (l.event === event && l.callback === callback) {
      this.listeners.splice(i, 1);
    }
  }
};

p.emit = function (event, data) {
  for (var i = 0; i < this.listeners.length; i++) {
    var l = this.listeners[i];

    if (event === l.event) {
      l.callback(data);
    }
  }
};

module.exports = Emitter;

},{}],9:[function(require,module,exports){
'use strict';

var Layout = require('./Layout');
var FDLayoutConstants = require('./FDLayoutConstants');
var LayoutConstants = require('./LayoutConstants');
var IGeometry = require('./IGeometry');
var IMath = require('./IMath');
var HashSet = require('./HashSet');

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
  this.displacementThresholdPerNode = 3.0 * FDLayoutConstants.DEFAULT_EDGE_LENGTH / 100;
  this.coolingFactor = FDLayoutConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL;
  this.initialCoolingFactor = FDLayoutConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL;
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

  if (this.layoutQuality == LayoutConstants.DRAFT_QUALITY) {
    this.displacementThresholdPerNode += 0.30;
    this.maxIterations *= 0.8;
  } else if (this.layoutQuality == LayoutConstants.PROOF_QUALITY) {
    this.displacementThresholdPerNode -= 0.30;
    this.maxIterations *= 1.2;
  }

  this.totalIterations = 0;
  this.notAnimatedIterations = 0;

  this.useFRGridVariant = FDLayoutConstants.DEFAULT_USE_SMART_REPULSION_RANGE_CALCULATION;
};

FDLayout.prototype.calcIdealEdgeLengths = function () {
  var edge;
  var lcaDepth;
  var source;
  var target;
  var sizeOfSourceInLca;
  var sizeOfTargetInLca;

  var allEdges = this.getGraphManager().getAllEdges();
  for (var i = 0; i < allEdges.length; i++) {
    edge = allEdges[i];

    edge.idealLength = this.idealEdgeLength;

    if (edge.isInterGraph) {
      source = edge.getSource();
      target = edge.getTarget();

      sizeOfSourceInLca = edge.getSourceInLca().getEstimatedSize();
      sizeOfTargetInLca = edge.getTargetInLca().getEstimatedSize();

      if (this.useSmartIdealEdgeLengthCalculation) {
        edge.idealLength += sizeOfSourceInLca + sizeOfTargetInLca - 2 * LayoutConstants.SIMPLE_NODE_SIZE;
      }

      lcaDepth = edge.getLca().getInclusionTreeDepth();

      edge.idealLength += FDLayoutConstants.DEFAULT_EDGE_LENGTH * FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR * (source.getInclusionTreeDepth() + target.getInclusionTreeDepth() - 2 * lcaDepth);
    }
  }
};

FDLayout.prototype.initSpringEmbedder = function () {

  if (this.incremental) {
    this.maxNodeDisplacement = FDLayoutConstants.MAX_NODE_DISPLACEMENT_INCREMENTAL;
  } else {
    this.coolingFactor = 1.0;
    this.initialCoolingFactor = 1.0;
    this.maxNodeDisplacement = FDLayoutConstants.MAX_NODE_DISPLACEMENT;
  }

  this.maxIterations = Math.max(this.getAllNodes().length * 5, this.maxIterations);

  this.totalDisplacementThreshold = this.displacementThresholdPerNode * this.getAllNodes().length;

  this.repulsionRange = this.calcRepulsionRange();
};

FDLayout.prototype.calcSpringForces = function () {
  var lEdges = this.getAllEdges();
  var edge;

  for (var i = 0; i < lEdges.length; i++) {
    edge = lEdges[i];

    this.calcSpringForce(edge, edge.idealLength);
  }
};

FDLayout.prototype.calcRepulsionForces = function () {
  var i, j;
  var nodeA, nodeB;
  var lNodes = this.getAllNodes();
  var processedNodeSet;

  if (this.useFRGridVariant) {
    if (this.totalIterations % FDLayoutConstants.GRID_CALCULATION_CHECK_PERIOD == 1) {
      var grid = this.calcGrid(this.graphManager.getRoot());

      // put all nodes to proper grid cells
      for (i = 0; i < lNodes.length; i++) {
        nodeA = lNodes[i];
        this.addNodeToGrid(nodeA, grid, this.graphManager.getRoot().getLeft(), this.graphManager.getRoot().getTop());
      }
    }

    processedNodeSet = new HashSet();

    // calculate repulsion forces between each nodes and its surrounding
    for (i = 0; i < lNodes.length; i++) {
      nodeA = lNodes[i];
      this.calculateRepulsionForceOfANode(grid, nodeA, processedNodeSet);
      processedNodeSet.add(nodeA);
    }
  } else {

    for (i = 0; i < lNodes.length; i++) {
      nodeA = lNodes[i];

      for (j = i + 1; j < lNodes.length; j++) {
        nodeB = lNodes[j];

        // If both nodes are not members of the same graph, skip.
        if (nodeA.getOwner() != nodeB.getOwner()) {
          continue;
        }

        this.calcRepulsionForce(nodeA, nodeB);
      }
    }
  }
};

FDLayout.prototype.calcGravitationalForces = function () {
  var node;
  var lNodes = this.getAllNodesToApplyGravitation();

  for (var i = 0; i < lNodes.length; i++) {
    node = lNodes[i];
    this.calcGravitationalForce(node);
  }
};

FDLayout.prototype.moveNodes = function () {
  var lNodes = this.getAllNodes();
  var node;

  for (var i = 0; i < lNodes.length; i++) {
    node = lNodes[i];
    node.move();
  }
};

FDLayout.prototype.calcSpringForce = function (edge, idealLength) {
  var sourceNode = edge.getSource();
  var targetNode = edge.getTarget();

  var length;
  var springForce;
  var springForceX;
  var springForceY;

  // Update edge length
  if (this.uniformLeafNodeSizes && sourceNode.getChild() == null && targetNode.getChild() == null) {
    edge.updateLengthSimple();
  } else {
    edge.updateLength();

    if (edge.isOverlapingSourceAndTarget) {
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

  if (rectA.intersects(rectB)) // two nodes overlap
    {
      // calculate separation amount in x and y directions
      IGeometry.calcSeparationAmount(rectA, rectB, overlapAmount, FDLayoutConstants.DEFAULT_EDGE_LENGTH / 2.0);

      repulsionForceX = 2 * overlapAmount[0];
      repulsionForceY = 2 * overlapAmount[1];

      var childrenConstant = nodeA.noOfChildren * nodeB.noOfChildren / (nodeA.noOfChildren + nodeB.noOfChildren);

      // Apply forces on the two nodes
      nodeA.repulsionForceX -= childrenConstant * repulsionForceX;
      nodeA.repulsionForceY -= childrenConstant * repulsionForceY;
      nodeB.repulsionForceX += childrenConstant * repulsionForceX;
      nodeB.repulsionForceY += childrenConstant * repulsionForceY;
    } else // no overlap
    {
      // calculate distance

      if (this.uniformLeafNodeSizes && nodeA.getChild() == null && nodeB.getChild() == null) // simply base repulsion on distance of node centers
        {
          distanceX = rectB.getCenterX() - rectA.getCenterX();
          distanceY = rectB.getCenterY() - rectA.getCenterY();
        } else // use clipping points
        {
          IGeometry.getIntersection(rectA, rectB, clipPoints);

          distanceX = clipPoints[2] - clipPoints[0];
          distanceY = clipPoints[3] - clipPoints[1];
        }

      // No repulsion range. FR grid variant should take care of this.
      if (Math.abs(distanceX) < FDLayoutConstants.MIN_REPULSION_DIST) {
        distanceX = IMath.sign(distanceX) * FDLayoutConstants.MIN_REPULSION_DIST;
      }

      if (Math.abs(distanceY) < FDLayoutConstants.MIN_REPULSION_DIST) {
        distanceY = IMath.sign(distanceY) * FDLayoutConstants.MIN_REPULSION_DIST;
      }

      distanceSquared = distanceX * distanceX + distanceY * distanceY;
      distance = Math.sqrt(distanceSquared);

      repulsionForce = this.repulsionConstant * nodeA.noOfChildren * nodeB.noOfChildren / distanceSquared;

      // Project force onto x and y axes
      repulsionForceX = repulsionForce * distanceX / distance;
      repulsionForceY = repulsionForce * distanceY / distance;

      // Apply forces on the two nodes    
      nodeA.repulsionForceX -= repulsionForceX;
      nodeA.repulsionForceY -= repulsionForceY;
      nodeB.repulsionForceX += repulsionForceX;
      nodeB.repulsionForceY += repulsionForceY;
    }
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
  absDistanceX = Math.abs(distanceX) + node.getWidth() / 2;
  absDistanceY = Math.abs(distanceY) + node.getHeight() / 2;

  if (node.getOwner() == this.graphManager.getRoot()) // in the root graph
    {
      estimatedSize = ownerGraph.getEstimatedSize() * this.gravityRangeFactor;

      if (absDistanceX > estimatedSize || absDistanceY > estimatedSize) {
        node.gravitationForceX = -this.gravityConstant * distanceX;
        node.gravitationForceY = -this.gravityConstant * distanceY;
      }
    } else // inside a compound
    {
      estimatedSize = ownerGraph.getEstimatedSize() * this.compoundGravityRangeFactor;

      if (absDistanceX > estimatedSize || absDistanceY > estimatedSize) {
        node.gravitationForceX = -this.gravityConstant * distanceX * this.compoundGravityConstant;
        node.gravitationForceY = -this.gravityConstant * distanceY * this.compoundGravityConstant;
      }
    }
};

FDLayout.prototype.isConverged = function () {
  var converged;
  var oscilating = false;

  if (this.totalIterations > this.maxIterations / 3) {
    oscilating = Math.abs(this.totalDisplacement - this.oldTotalDisplacement) < 2;
  }

  converged = this.totalDisplacement < this.totalDisplacementThreshold;

  this.oldTotalDisplacement = this.totalDisplacement;

  return converged || oscilating;
};

FDLayout.prototype.animate = function () {
  if (this.animationDuringLayout && !this.isSubLayout) {
    if (this.notAnimatedIterations == this.animationPeriod) {
      this.update();
      this.notAnimatedIterations = 0;
    } else {
      this.notAnimatedIterations++;
    }
  }
};

// -----------------------------------------------------------------------------
// Section: FR-Grid Variant Repulsion Force Calculation
// -----------------------------------------------------------------------------

FDLayout.prototype.calcGrid = function (graph) {

  var sizeX = 0;
  var sizeY = 0;

  sizeX = parseInt(Math.ceil((graph.getRight() - graph.getLeft()) / this.repulsionRange));
  sizeY = parseInt(Math.ceil((graph.getBottom() - graph.getTop()) / this.repulsionRange));

  var grid = new Array(sizeX);

  for (var i = 0; i < sizeX; i++) {
    grid[i] = new Array(sizeY);
  }

  for (var i = 0; i < sizeX; i++) {
    for (var j = 0; j < sizeY; j++) {
      grid[i][j] = new Array();
    }
  }

  return grid;
};

FDLayout.prototype.addNodeToGrid = function (v, grid, left, top) {

  var startX = 0;
  var finishX = 0;
  var startY = 0;
  var finishY = 0;

  startX = parseInt(Math.floor((v.getRect().x - left) / this.repulsionRange));
  finishX = parseInt(Math.floor((v.getRect().width + v.getRect().x - left) / this.repulsionRange));
  startY = parseInt(Math.floor((v.getRect().y - top) / this.repulsionRange));
  finishY = parseInt(Math.floor((v.getRect().height + v.getRect().y - top) / this.repulsionRange));

  for (var i = startX; i <= finishX; i++) {
    for (var j = startY; j <= finishY; j++) {
      grid[i][j].push(v);
      v.setGridCoordinates(startX, finishX, startY, finishY);
    }
  }
};

FDLayout.prototype.calculateRepulsionForceOfANode = function (grid, nodeA, processedNodeSet) {

  if (this.totalIterations % FDLayoutConstants.GRID_CALCULATION_CHECK_PERIOD == 1) {
    var surrounding = new HashSet();
    nodeA.surrounding = new Array();
    var nodeB;

    for (var i = nodeA.startX - 1; i < nodeA.finishX + 2; i++) {
      for (var j = nodeA.startY - 1; j < nodeA.finishY + 2; j++) {
        if (!(i < 0 || j < 0 || i >= grid.length || j >= grid[0].length)) {
          for (var k = 0; k < grid[i][j].length; k++) {
            nodeB = grid[i][j][k];

            // If both nodes are not members of the same graph, 
            // or both nodes are the same, skip.
            if (nodeA.getOwner() != nodeB.getOwner() || nodeA == nodeB) {
              continue;
            }

            // check if the repulsion force between
            // nodeA and nodeB has already been calculated
            if (!processedNodeSet.contains(nodeB) && !surrounding.contains(nodeB)) {
              var distanceX = Math.abs(nodeA.getCenterX() - nodeB.getCenterX()) - (nodeA.getWidth() / 2 + nodeB.getWidth() / 2);
              var distanceY = Math.abs(nodeA.getCenterY() - nodeB.getCenterY()) - (nodeA.getHeight() / 2 + nodeB.getHeight() / 2);

              // if the distance between nodeA and nodeB 
              // is less then calculation range
              if (distanceX <= this.repulsionRange && distanceY <= this.repulsionRange) {
                //then add nodeB to surrounding of nodeA
                surrounding.add(nodeB);
              }
            }
          }
        }
      }
    }

    surrounding.addAllTo(nodeA.surrounding);
  }
  for (i = 0; i < nodeA.surrounding.length; i++) {
    this.calcRepulsionForce(nodeA, nodeA.surrounding[i]);
  }
};

FDLayout.prototype.calcRepulsionRange = function () {
  return 0.0;
};

module.exports = FDLayout;

},{"./FDLayoutConstants":10,"./HashSet":14,"./IGeometry":15,"./IMath":16,"./Layout":23,"./LayoutConstants":24}],10:[function(require,module,exports){
'use strict';

var LayoutConstants = require('./LayoutConstants');

function FDLayoutConstants() {}

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
FDLayoutConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL = 0.8;
FDLayoutConstants.MAX_NODE_DISPLACEMENT_INCREMENTAL = 100.0;
FDLayoutConstants.MAX_NODE_DISPLACEMENT = FDLayoutConstants.MAX_NODE_DISPLACEMENT_INCREMENTAL * 3;
FDLayoutConstants.MIN_REPULSION_DIST = FDLayoutConstants.DEFAULT_EDGE_LENGTH / 10.0;
FDLayoutConstants.CONVERGENCE_CHECK_PERIOD = 100;
FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = 0.1;
FDLayoutConstants.MIN_EDGE_LENGTH = 1;
FDLayoutConstants.GRID_CALCULATION_CHECK_PERIOD = 10;

module.exports = FDLayoutConstants;

},{"./LayoutConstants":24}],11:[function(require,module,exports){
'use strict';

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
'use strict';

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

FDLayoutNode.prototype.setGridCoordinates = function (_startX, _finishX, _startY, _finishY) {
  this.startX = _startX;
  this.finishX = _finishX;
  this.startY = _startY;
  this.finishY = _finishY;
};

module.exports = FDLayoutNode;

},{"./LNode":22}],13:[function(require,module,exports){
'use strict';

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
'use strict';

var UniqueIDGeneretor = require('./UniqueIDGeneretor');

function HashSet() {
  this.set = {};
}
;

HashSet.prototype.add = function (obj) {
  var theId = UniqueIDGeneretor.createID(obj);
  if (!this.contains(theId)) this.set[theId] = obj;
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
"use strict";

function IGeometry() {}

IGeometry.calcSeparationAmount = function (rectA, rectB, overlapAmount, separationBuffer) {
  if (!rectA.intersects(rectB)) {
    throw "assert failed";
  }
  var directions = new Array(2);
  IGeometry.decideDirectionsForOverlappingNodes(rectA, rectB, directions);
  overlapAmount[0] = Math.min(rectA.getRight(), rectB.getRight()) - Math.max(rectA.x, rectB.x);
  overlapAmount[1] = Math.min(rectA.getBottom(), rectB.getBottom()) - Math.max(rectA.y, rectB.y);
  // update the overlapping amounts for the following cases:
  if (rectA.getX() <= rectB.getX() && rectA.getRight() >= rectB.getRight()) {
    overlapAmount[0] += Math.min(rectB.getX() - rectA.getX(), rectA.getRight() - rectB.getRight());
  } else if (rectB.getX() <= rectA.getX() && rectB.getRight() >= rectA.getRight()) {
    overlapAmount[0] += Math.min(rectA.getX() - rectB.getX(), rectB.getRight() - rectA.getRight());
  }
  if (rectA.getY() <= rectB.getY() && rectA.getBottom() >= rectB.getBottom()) {
    overlapAmount[1] += Math.min(rectB.getY() - rectA.getY(), rectA.getBottom() - rectB.getBottom());
  } else if (rectB.getY() <= rectA.getY() && rectB.getBottom() >= rectA.getBottom()) {
    overlapAmount[1] += Math.min(rectA.getY() - rectB.getY(), rectB.getBottom() - rectA.getBottom());
  }

  // find slope of the line passes two centers
  var slope = Math.abs((rectB.getCenterY() - rectA.getCenterY()) / (rectB.getCenterX() - rectA.getCenterX()));
  // if centers are overlapped
  if (rectB.getCenterY() == rectA.getCenterY() && rectB.getCenterX() == rectA.getCenterX()) {
    // assume the slope is 1 (45 degree)
    slope = 1.0;
  }

  var moveByY = slope * overlapAmount[0];
  var moveByX = overlapAmount[1] / slope;
  if (overlapAmount[0] < moveByX) {
    moveByX = overlapAmount[0];
  } else {
    moveByY = overlapAmount[1];
  }
  // return half the amount so that if each rectangle is moved by these
  // amounts in opposite directions, overlap will be resolved
  overlapAmount[0] = -1 * directions[0] * (moveByX / 2 + separationBuffer);
  overlapAmount[1] = -1 * directions[1] * (moveByY / 2 + separationBuffer);
};

IGeometry.decideDirectionsForOverlappingNodes = function (rectA, rectB, directions) {
  if (rectA.getCenterX() < rectB.getCenterX()) {
    directions[0] = -1;
  } else {
    directions[0] = 1;
  }

  if (rectA.getCenterY() < rectB.getCenterY()) {
    directions[1] = -1;
  } else {
    directions[1] = 1;
  }
};

IGeometry.getIntersection2 = function (rectA, rectB, result) {
  //result[0-1] will contain clipPoint of rectA, result[2-3] will contain clipPoint of rectB
  var p1x = rectA.getCenterX();
  var p1y = rectA.getCenterY();
  var p2x = rectB.getCenterX();
  var p2y = rectB.getCenterY();

  //if two rectangles intersect, then clipping points are centers
  if (rectA.intersects(rectB)) {
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
  if (p1x == p2x) {
    if (p1y > p2y) {
      result[0] = p1x;
      result[1] = topLeftAy;
      result[2] = p2x;
      result[3] = bottomLeftBy;
      return false;
    } else if (p1y < p2y) {
      result[0] = p1x;
      result[1] = bottomLeftAy;
      result[2] = p2x;
      result[3] = topLeftBy;
      return false;
    } else {
      //not line, return null;
    }
  }
  // line is horizontal
  else if (p1y == p2y) {
      if (p1x > p2x) {
        result[0] = topLeftAx;
        result[1] = p1y;
        result[2] = topRightBx;
        result[3] = p2y;
        return false;
      } else if (p1x < p2x) {
        result[0] = topRightAx;
        result[1] = p1y;
        result[2] = topLeftBx;
        result[3] = p2y;
        return false;
      } else {
        //not valid line, return null;
      }
    } else {
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
      if (-slopeA == slopePrime) {
        if (p1x > p2x) {
          result[0] = bottomLeftAx;
          result[1] = bottomLeftAy;
          clipPointAFound = true;
        } else {
          result[0] = topRightAx;
          result[1] = topLeftAy;
          clipPointAFound = true;
        }
      } else if (slopeA == slopePrime) {
        if (p1x > p2x) {
          result[0] = topLeftAx;
          result[1] = topLeftAy;
          clipPointAFound = true;
        } else {
          result[0] = bottomRightAx;
          result[1] = bottomLeftAy;
          clipPointAFound = true;
        }
      }

      //determine whether clipping point is the corner of nodeB
      if (-slopeB == slopePrime) {
        if (p2x > p1x) {
          result[2] = bottomLeftBx;
          result[3] = bottomLeftBy;
          clipPointBFound = true;
        } else {
          result[2] = topRightBx;
          result[3] = topLeftBy;
          clipPointBFound = true;
        }
      } else if (slopeB == slopePrime) {
        if (p2x > p1x) {
          result[2] = topLeftBx;
          result[3] = topLeftBy;
          clipPointBFound = true;
        } else {
          result[2] = bottomRightBx;
          result[3] = bottomLeftBy;
          clipPointBFound = true;
        }
      }

      //if both clipping points are corners
      if (clipPointAFound && clipPointBFound) {
        return false;
      }

      //determine Cardinal Direction of rectangles
      if (p1x > p2x) {
        if (p1y > p2y) {
          cardinalDirectionA = IGeometry.getCardinalDirection(slopeA, slopePrime, 4);
          cardinalDirectionB = IGeometry.getCardinalDirection(slopeB, slopePrime, 2);
        } else {
          cardinalDirectionA = IGeometry.getCardinalDirection(-slopeA, slopePrime, 3);
          cardinalDirectionB = IGeometry.getCardinalDirection(-slopeB, slopePrime, 1);
        }
      } else {
        if (p1y > p2y) {
          cardinalDirectionA = IGeometry.getCardinalDirection(-slopeA, slopePrime, 1);
          cardinalDirectionB = IGeometry.getCardinalDirection(-slopeB, slopePrime, 3);
        } else {
          cardinalDirectionA = IGeometry.getCardinalDirection(slopeA, slopePrime, 2);
          cardinalDirectionB = IGeometry.getCardinalDirection(slopeB, slopePrime, 4);
        }
      }
      //calculate clipping Point if it is not found before
      if (!clipPointAFound) {
        switch (cardinalDirectionA) {
          case 1:
            tempPointAy = topLeftAy;
            tempPointAx = p1x + -halfHeightA / slopePrime;
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
            tempPointAy = p1y + -halfWidthA * slopePrime;
            result[0] = tempPointAx;
            result[1] = tempPointAy;
            break;
        }
      }
      if (!clipPointBFound) {
        switch (cardinalDirectionB) {
          case 1:
            tempPointBy = topLeftBy;
            tempPointBx = p2x + -halfHeightB / slopePrime;
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
            tempPointBy = p2y + -halfWidthB * slopePrime;
            result[2] = tempPointBx;
            result[3] = tempPointBy;
            break;
        }
      }
    }
  return false;
};

IGeometry.getCardinalDirection = function (slope, slopePrime, line) {
  if (slope > slopePrime) {
    return line;
  } else {
    return 1 + line % 4;
  }
};

IGeometry.getIntersection = function (s1, s2, f1, f2) {
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
  c1 = x2 * y1 - x1 * y2; // { a1*x + b1*y + c1 = 0 is line 1 }

  a2 = y4 - y3;
  b2 = x3 - x4;
  c2 = x4 * y3 - x3 * y4; // { a2*x + b2*y + c2 = 0 is line 2 }

  denom = a1 * b2 - a2 * b1;

  if (denom == 0) {
    return null;
  }

  x = (b1 * c2 - b2 * c1) / denom;
  y = (a2 * c1 - a1 * c2) / denom;

  return new Point(x, y);
};

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
"use strict";

function IMath() {}

/**
 * This method returns the sign of the input value.
 */
IMath.sign = function (value) {
  if (value > 0) {
    return 1;
  } else if (value < 0) {
    return -1;
  } else {
    return 0;
  }
};

IMath.floor = function (value) {
  return value < 0 ? Math.ceil(value) : Math.floor(value);
};

IMath.ceil = function (value) {
  return value < 0 ? Math.floor(value) : Math.ceil(value);
};

module.exports = IMath;

},{}],17:[function(require,module,exports){
"use strict";

function Integer() {}

Integer.MAX_VALUE = 2147483647;
Integer.MIN_VALUE = -2147483648;

module.exports = Integer;

},{}],18:[function(require,module,exports){
'use strict';

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

LEdge.prototype.getSource = function () {
  return this.source;
};

LEdge.prototype.getTarget = function () {
  return this.target;
};

LEdge.prototype.isInterGraph = function () {
  return this.isInterGraph;
};

LEdge.prototype.getLength = function () {
  return this.length;
};

LEdge.prototype.isOverlapingSourceAndTarget = function () {
  return this.isOverlapingSourceAndTarget;
};

LEdge.prototype.getBendpoints = function () {
  return this.bendpoints;
};

LEdge.prototype.getLca = function () {
  return this.lca;
};

LEdge.prototype.getSourceInLca = function () {
  return this.sourceInLca;
};

LEdge.prototype.getTargetInLca = function () {
  return this.targetInLca;
};

LEdge.prototype.getOtherEnd = function (node) {
  if (this.source === node) {
    return this.target;
  } else if (this.target === node) {
    return this.source;
  } else {
    throw "Node is not incident with this edge";
  }
};

LEdge.prototype.getOtherEndInGraph = function (node, graph) {
  var otherEnd = this.getOtherEnd(node);
  var root = graph.getGraphManager().getRoot();

  while (true) {
    if (otherEnd.getOwner() == graph) {
      return otherEnd;
    }

    if (otherEnd.getOwner() == root) {
      break;
    }

    otherEnd = otherEnd.getOwner().getParent();
  }

  return null;
};

LEdge.prototype.updateLength = function () {
  var clipPointCoordinates = new Array(4);

  this.isOverlapingSourceAndTarget = IGeometry.getIntersection(this.target.getRect(), this.source.getRect(), clipPointCoordinates);

  if (!this.isOverlapingSourceAndTarget) {
    this.lengthX = clipPointCoordinates[0] - clipPointCoordinates[2];
    this.lengthY = clipPointCoordinates[1] - clipPointCoordinates[3];

    if (Math.abs(this.lengthX) < 1.0) {
      this.lengthX = IMath.sign(this.lengthX);
    }

    if (Math.abs(this.lengthY) < 1.0) {
      this.lengthY = IMath.sign(this.lengthY);
    }

    this.length = Math.sqrt(this.lengthX * this.lengthX + this.lengthY * this.lengthY);
  }
};

LEdge.prototype.updateLengthSimple = function () {
  this.lengthX = this.target.getCenterX() - this.source.getCenterX();
  this.lengthY = this.target.getCenterY() - this.source.getCenterY();

  if (Math.abs(this.lengthX) < 1.0) {
    this.lengthX = IMath.sign(this.lengthX);
  }

  if (Math.abs(this.lengthY) < 1.0) {
    this.lengthY = IMath.sign(this.lengthY);
  }

  this.length = Math.sqrt(this.lengthX * this.lengthX + this.lengthY * this.lengthY);
};

module.exports = LEdge;

},{"./IGeometry":15,"./IMath":16,"./LGraphObject":21}],19:[function(require,module,exports){
'use strict';

var LGraphObject = require('./LGraphObject');
var Integer = require('./Integer');
var LayoutConstants = require('./LayoutConstants');
var LGraphManager = require('./LGraphManager');
var LNode = require('./LNode');
var LEdge = require('./LEdge');
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
  } else if (obj2 != null && obj2 instanceof Layout) {
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

LGraph.prototype.getGraphManager = function () {
  return this.graphManager;
};

LGraph.prototype.getParent = function () {
  return this.parent;
};

LGraph.prototype.getLeft = function () {
  return this.left;
};

LGraph.prototype.getRight = function () {
  return this.right;
};

LGraph.prototype.getTop = function () {
  return this.top;
};

LGraph.prototype.getBottom = function () {
  return this.bottom;
};

LGraph.prototype.isConnected = function () {
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
  } else {
    var newEdge = obj1;
    if (!(this.getNodes().indexOf(sourceNode) > -1 && this.getNodes().indexOf(targetNode) > -1)) {
      throw "Source or target not in graph!";
    }

    if (!(sourceNode.owner == targetNode.owner && sourceNode.owner == this)) {
      throw "Both owners must be this graph!";
    }

    if (sourceNode.owner != targetNode.owner) {
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

    if (targetNode != sourceNode) {
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
    for (var i = 0; i < s; i++) {
      edge = edgesToBeRemoved[i];

      if (edge.isInterGraph) {
        this.graphManager.remove(edge);
      } else {
        edge.source.owner.remove(edge);
      }
    }

    // now the node itself
    var index = this.nodes.indexOf(node);
    if (index == -1) {
      throw "Node not in owner node list!";
    }

    this.nodes.splice(index, 1);
  } else if (obj instanceof LEdge) {
    var edge = obj;
    if (edge == null) {
      throw "Edge is null!";
    }
    if (!(edge.source != null && edge.target != null)) {
      throw "Source and/or target is null!";
    }
    if (!(edge.source.owner != null && edge.target.owner != null && edge.source.owner == this && edge.target.owner == this)) {
      throw "Source and/or target owner is invalid!";
    }

    var sourceIndex = edge.source.edges.indexOf(edge);
    var targetIndex = edge.target.edges.indexOf(edge);
    if (!(sourceIndex > -1 && targetIndex > -1)) {
      throw "Source and/or target doesn't know this edge!";
    }

    edge.source.edges.splice(sourceIndex, 1);

    if (edge.target != edge.source) {
      edge.target.edges.splice(targetIndex, 1);
    }

    var index = edge.source.owner.getEdges().indexOf(edge);
    if (index == -1) {
      throw "Not in owner's edge list!";
    }

    edge.source.owner.getEdges().splice(index, 1);
  }
};

LGraph.prototype.updateLeftTop = function () {
  var top = Integer.MAX_VALUE;
  var left = Integer.MAX_VALUE;
  var nodeTop;
  var nodeLeft;
  var margin;

  var nodes = this.getNodes();
  var s = nodes.length;

  for (var i = 0; i < s; i++) {
    var lNode = nodes[i];
    nodeTop = lNode.getTop();
    nodeLeft = lNode.getLeft();

    if (top > nodeTop) {
      top = nodeTop;
    }

    if (left > nodeLeft) {
      left = nodeLeft;
    }
  }

  // Do we have any nodes in this graph?
  if (top == Integer.MAX_VALUE) {
    return null;
  }

  if (nodes[0].getParent().paddingLeft != undefined) {
    margin = nodes[0].getParent().paddingLeft;
  } else {
    margin = this.margin;
  }

  this.left = left - margin;
  this.top = top - margin;

  // Apply the margins and return the result
  return new Point(this.left, this.top);
};

LGraph.prototype.updateBounds = function (recursive) {
  // calculate bounds
  var left = Integer.MAX_VALUE;
  var right = -Integer.MAX_VALUE;
  var top = Integer.MAX_VALUE;
  var bottom = -Integer.MAX_VALUE;
  var nodeLeft;
  var nodeRight;
  var nodeTop;
  var nodeBottom;
  var margin;

  var nodes = this.nodes;
  var s = nodes.length;
  for (var i = 0; i < s; i++) {
    var lNode = nodes[i];

    if (recursive && lNode.child != null) {
      lNode.updateBounds();
    }
    nodeLeft = lNode.getLeft();
    nodeRight = lNode.getRight();
    nodeTop = lNode.getTop();
    nodeBottom = lNode.getBottom();

    if (left > nodeLeft) {
      left = nodeLeft;
    }

    if (right < nodeRight) {
      right = nodeRight;
    }

    if (top > nodeTop) {
      top = nodeTop;
    }

    if (bottom < nodeBottom) {
      bottom = nodeBottom;
    }
  }

  var boundingRect = new RectangleD(left, top, right - left, bottom - top);
  if (left == Integer.MAX_VALUE) {
    this.left = this.parent.getLeft();
    this.right = this.parent.getRight();
    this.top = this.parent.getTop();
    this.bottom = this.parent.getBottom();
  }

  if (nodes[0].getParent().paddingLeft != undefined) {
    margin = nodes[0].getParent().paddingLeft;
  } else {
    margin = this.margin;
  }

  this.left = boundingRect.x - margin;
  this.right = boundingRect.x + boundingRect.width + margin;
  this.top = boundingRect.y - margin;
  this.bottom = boundingRect.y + boundingRect.height + margin;
};

LGraph.calculateBounds = function (nodes) {
  var left = Integer.MAX_VALUE;
  var right = -Integer.MAX_VALUE;
  var top = Integer.MAX_VALUE;
  var bottom = -Integer.MAX_VALUE;
  var nodeLeft;
  var nodeRight;
  var nodeTop;
  var nodeBottom;

  var s = nodes.length;

  for (var i = 0; i < s; i++) {
    var lNode = nodes[i];
    nodeLeft = lNode.getLeft();
    nodeRight = lNode.getRight();
    nodeTop = lNode.getTop();
    nodeBottom = lNode.getBottom();

    if (left > nodeLeft) {
      left = nodeLeft;
    }

    if (right < nodeRight) {
      right = nodeRight;
    }

    if (top > nodeTop) {
      top = nodeTop;
    }

    if (bottom < nodeBottom) {
      bottom = nodeBottom;
    }
  }

  var boundingRect = new RectangleD(left, top, right - left, bottom - top);

  return boundingRect;
};

LGraph.prototype.getInclusionTreeDepth = function () {
  if (this == this.graphManager.getRoot()) {
    return 1;
  } else {
    return this.parent.getInclusionTreeDepth();
  }
};

LGraph.prototype.getEstimatedSize = function () {
  if (this.estimatedSize == Integer.MIN_VALUE) {
    throw "assert failed";
  }
  return this.estimatedSize;
};

LGraph.prototype.calcEstimatedSize = function () {
  var size = 0;
  var nodes = this.nodes;
  var s = nodes.length;

  for (var i = 0; i < s; i++) {
    var lNode = nodes[i];
    size += lNode.calcEstimatedSize();
  }

  if (size == 0) {
    this.estimatedSize = LayoutConstants.EMPTY_COMPOUND_NODE_SIZE;
  } else {
    this.estimatedSize = size / Math.sqrt(this.nodes.length);
  }

  return this.estimatedSize;
};

LGraph.prototype.updateConnected = function () {
  var self = this;
  if (this.nodes.length == 0) {
    this.isConnected = true;
    return;
  }

  var toBeVisited = [];
  var visited = new HashSet();
  var currentNode = this.nodes[0];
  var neighborEdges;
  var currentNeighbor;
  toBeVisited = toBeVisited.concat(currentNode.withChildren());

  while (toBeVisited.length > 0) {
    currentNode = toBeVisited.shift();
    visited.add(currentNode);

    // Traverse all neighbors of this node
    neighborEdges = currentNode.getEdges();
    var s = neighborEdges.length;
    for (var i = 0; i < s; i++) {
      var neighborEdge = neighborEdges[i];
      currentNeighbor = neighborEdge.getOtherEndInGraph(currentNode, this);

      // Add unvisited neighbors to the list to visit
      if (currentNeighbor != null && !visited.contains(currentNeighbor)) {
        toBeVisited = toBeVisited.concat(currentNeighbor.withChildren());
      }
    }
  }

  this.isConnected = false;

  if (visited.size() >= this.nodes.length) {
    var noOfVisitedInThisGraph = 0;

    var s = visited.size();
    Object.keys(visited.set).forEach(function (visitedId) {
      var visitedNode = visited.set[visitedId];
      if (visitedNode.owner == self) {
        noOfVisitedInThisGraph++;
      }
    });

    if (noOfVisitedInThisGraph == this.nodes.length) {
      this.isConnected = true;
    }
  }
};

module.exports = LGraph;

},{"./HashSet":14,"./Integer":17,"./LEdge":18,"./LGraphManager":20,"./LGraphObject":21,"./LNode":22,"./LayoutConstants":24,"./Point":25,"./RectangleD":28}],20:[function(require,module,exports){
'use strict';

var LGraph;
var LEdge = require('./LEdge');

function LGraphManager(layout) {
  LGraph = require('./LGraph'); // It may be better to initilize this out of this function but it gives an error (Right-hand side of 'instanceof' is not callable) now.
  this.layout = layout;

  this.graphs = [];
  this.edges = [];
}

LGraphManager.prototype.addRoot = function () {
  var ngraph = this.layout.newGraph();
  var nnode = this.layout.newNode(null);
  var root = this.add(ngraph, nnode);
  this.setRootGraph(root);
  return this.rootGraph;
};

LGraphManager.prototype.add = function (newGraph, parentNode, newEdge, sourceNode, targetNode) {
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
      throw "Already has a child!";
    }

    newGraph.parent = parentNode;
    parentNode.child = newGraph;

    return newGraph;
  } else {
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

    if (sourceGraph == targetGraph) {
      newEdge.isInterGraph = false;
      return sourceGraph.add(newEdge, sourceNode, targetNode);
    } else {
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
    if (!(graph == this.rootGraph || graph.parent != null && graph.parent.graphManager == this)) {
      throw "Invalid parent node!";
    }

    // first the edges (make a copy to do it safely)
    var edgesToBeRemoved = [];

    edgesToBeRemoved = edgesToBeRemoved.concat(graph.getEdges());

    var edge;
    var s = edgesToBeRemoved.length;
    for (var i = 0; i < s; i++) {
      edge = edgesToBeRemoved[i];
      graph.remove(edge);
    }

    // then the nodes (make a copy to do it safely)
    var nodesToBeRemoved = [];

    nodesToBeRemoved = nodesToBeRemoved.concat(graph.getNodes());

    var node;
    s = nodesToBeRemoved.length;
    for (var i = 0; i < s; i++) {
      node = nodesToBeRemoved[i];
      graph.remove(node);
    }

    // check if graph is the root
    if (graph == this.rootGraph) {
      this.setRootGraph(null);
    }

    // now remove the graph itself
    var index = this.graphs.indexOf(graph);
    this.graphs.splice(index, 1);

    // also reset the parent of the graph
    graph.parent = null;
  } else if (lObj instanceof LEdge) {
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

LGraphManager.prototype.updateBounds = function () {
  this.rootGraph.updateBounds(true);
};

LGraphManager.prototype.getGraphs = function () {
  return this.graphs;
};

LGraphManager.prototype.getAllNodes = function () {
  if (this.allNodes == null) {
    var nodeList = [];
    var graphs = this.getGraphs();
    var s = graphs.length;
    for (var i = 0; i < s; i++) {
      nodeList = nodeList.concat(graphs[i].getNodes());
    }
    this.allNodes = nodeList;
  }
  return this.allNodes;
};

LGraphManager.prototype.resetAllNodes = function () {
  this.allNodes = null;
};

LGraphManager.prototype.resetAllEdges = function () {
  this.allEdges = null;
};

LGraphManager.prototype.resetAllNodesToApplyGravitation = function () {
  this.allNodesToApplyGravitation = null;
};

LGraphManager.prototype.getAllEdges = function () {
  if (this.allEdges == null) {
    var edgeList = [];
    var graphs = this.getGraphs();
    var s = graphs.length;
    for (var i = 0; i < graphs.length; i++) {
      edgeList = edgeList.concat(graphs[i].getEdges());
    }

    edgeList = edgeList.concat(this.edges);

    this.allEdges = edgeList;
  }
  return this.allEdges;
};

LGraphManager.prototype.getAllNodesToApplyGravitation = function () {
  return this.allNodesToApplyGravitation;
};

LGraphManager.prototype.setAllNodesToApplyGravitation = function (nodeList) {
  if (this.allNodesToApplyGravitation != null) {
    throw "assert failed";
  }

  this.allNodesToApplyGravitation = nodeList;
};

LGraphManager.prototype.getRoot = function () {
  return this.rootGraph;
};

LGraphManager.prototype.setRootGraph = function (graph) {
  if (graph.getGraphManager() != this) {
    throw "Root not in this graph mgr!";
  }

  this.rootGraph = graph;
  // root graph must have a root node associated with it for convenience
  if (graph.parent == null) {
    graph.parent = this.layout.newNode("Root node");
  }
};

LGraphManager.prototype.getLayout = function () {
  return this.layout;
};

LGraphManager.prototype.isOneAncestorOfOther = function (firstNode, secondNode) {
  if (!(firstNode != null && secondNode != null)) {
    throw "assert failed";
  }

  if (firstNode == secondNode) {
    return true;
  }
  // Is second node an ancestor of the first one?
  var ownerGraph = firstNode.getOwner();
  var parentNode;

  do {
    parentNode = ownerGraph.getParent();

    if (parentNode == null) {
      break;
    }

    if (parentNode == secondNode) {
      return true;
    }

    ownerGraph = parentNode.getOwner();
    if (ownerGraph == null) {
      break;
    }
  } while (true);
  // Is first node an ancestor of the second one?
  ownerGraph = secondNode.getOwner();

  do {
    parentNode = ownerGraph.getParent();

    if (parentNode == null) {
      break;
    }

    if (parentNode == firstNode) {
      return true;
    }

    ownerGraph = parentNode.getOwner();
    if (ownerGraph == null) {
      break;
    }
  } while (true);

  return false;
};

LGraphManager.prototype.calcLowestCommonAncestors = function () {
  var edge;
  var sourceNode;
  var targetNode;
  var sourceAncestorGraph;
  var targetAncestorGraph;

  var edges = this.getAllEdges();
  var s = edges.length;
  for (var i = 0; i < s; i++) {
    edge = edges[i];

    sourceNode = edge.source;
    targetNode = edge.target;
    edge.lca = null;
    edge.sourceInLca = sourceNode;
    edge.targetInLca = targetNode;

    if (sourceNode == targetNode) {
      edge.lca = sourceNode.getOwner();
      continue;
    }

    sourceAncestorGraph = sourceNode.getOwner();

    while (edge.lca == null) {
      edge.targetInLca = targetNode;
      targetAncestorGraph = targetNode.getOwner();

      while (edge.lca == null) {
        if (targetAncestorGraph == sourceAncestorGraph) {
          edge.lca = targetAncestorGraph;
          break;
        }

        if (targetAncestorGraph == this.rootGraph) {
          break;
        }

        if (edge.lca != null) {
          throw "assert failed";
        }
        edge.targetInLca = targetAncestorGraph.getParent();
        targetAncestorGraph = edge.targetInLca.getOwner();
      }

      if (sourceAncestorGraph == this.rootGraph) {
        break;
      }

      if (edge.lca == null) {
        edge.sourceInLca = sourceAncestorGraph.getParent();
        sourceAncestorGraph = edge.sourceInLca.getOwner();
      }
    }

    if (edge.lca == null) {
      throw "assert failed";
    }
  }
};

LGraphManager.prototype.calcLowestCommonAncestor = function (firstNode, secondNode) {
  if (firstNode == secondNode) {
    return firstNode.getOwner();
  }
  var firstOwnerGraph = firstNode.getOwner();

  do {
    if (firstOwnerGraph == null) {
      break;
    }
    var secondOwnerGraph = secondNode.getOwner();

    do {
      if (secondOwnerGraph == null) {
        break;
      }

      if (secondOwnerGraph == firstOwnerGraph) {
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
  for (var i = 0; i < s; i++) {
    node = nodes[i];
    node.inclusionTreeDepth = depth;

    if (node.child != null) {
      this.calcInclusionTreeDepths(node.child, depth + 1);
    }
  }
};

LGraphManager.prototype.includesInvalidEdge = function () {
  var edge;

  var s = this.edges.length;
  for (var i = 0; i < s; i++) {
    edge = this.edges[i];

    if (this.isOneAncestorOfOther(edge.source, edge.target)) {
      return true;
    }
  }
  return false;
};

module.exports = LGraphManager;

},{"./LEdge":18,"./LGraph":19}],21:[function(require,module,exports){
"use strict";

function LGraphObject(vGraphObject) {
  this.vGraphObject = vGraphObject;
}

module.exports = LGraphObject;

},{}],22:[function(require,module,exports){
'use strict';

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
  if (gm.graphManager != null) gm = gm.graphManager;

  this.estimatedSize = Integer.MIN_VALUE;
  this.inclusionTreeDepth = Integer.MAX_VALUE;
  this.vGraphObject = vNode;
  this.edges = [];
  this.graphManager = gm;

  if (size != null && loc != null) this.rect = new RectangleD(loc.x, loc.y, size.width, size.height);else this.rect = new RectangleD();
}

LNode.prototype = Object.create(LGraphObject.prototype);
for (var prop in LGraphObject) {
  LNode[prop] = LGraphObject[prop];
}

LNode.prototype.getEdges = function () {
  return this.edges;
};

LNode.prototype.getChild = function () {
  return this.child;
};

LNode.prototype.getOwner = function () {
  if (this.owner != null) {
    if (!(this.owner == null || this.owner.getNodes().indexOf(this) > -1)) {
      throw "assert failed";
    }
  }

  return this.owner;
};

LNode.prototype.getWidth = function () {
  return this.rect.width;
};

LNode.prototype.setWidth = function (width) {
  this.rect.width = width;
};

LNode.prototype.getHeight = function () {
  return this.rect.height;
};

LNode.prototype.setHeight = function (height) {
  this.rect.height = height;
};

LNode.prototype.getCenterX = function () {
  return this.rect.x + this.rect.width / 2;
};

LNode.prototype.getCenterY = function () {
  return this.rect.y + this.rect.height / 2;
};

LNode.prototype.getCenter = function () {
  return new PointD(this.rect.x + this.rect.width / 2, this.rect.y + this.rect.height / 2);
};

LNode.prototype.getLocation = function () {
  return new PointD(this.rect.x, this.rect.y);
};

LNode.prototype.getRect = function () {
  return this.rect;
};

LNode.prototype.getDiagonal = function () {
  return Math.sqrt(this.rect.width * this.rect.width + this.rect.height * this.rect.height);
};

LNode.prototype.setRect = function (upperLeft, dimension) {
  this.rect.x = upperLeft.x;
  this.rect.y = upperLeft.y;
  this.rect.width = dimension.width;
  this.rect.height = dimension.height;
};

LNode.prototype.setCenter = function (cx, cy) {
  this.rect.x = cx - this.rect.width / 2;
  this.rect.y = cy - this.rect.height / 2;
};

LNode.prototype.setLocation = function (x, y) {
  this.rect.x = x;
  this.rect.y = y;
};

LNode.prototype.moveBy = function (dx, dy) {
  this.rect.x += dx;
  this.rect.y += dy;
};

LNode.prototype.getEdgeListToNode = function (to) {
  var edgeList = [];
  var edge;
  var self = this;

  self.edges.forEach(function (edge) {

    if (edge.target == to) {
      if (edge.source != self) throw "Incorrect edge source!";

      edgeList.push(edge);
    }
  });

  return edgeList;
};

LNode.prototype.getEdgesBetween = function (other) {
  var edgeList = [];
  var edge;

  var self = this;
  self.edges.forEach(function (edge) {

    if (!(edge.source == self || edge.target == self)) throw "Incorrect edge source and/or target";

    if (edge.target == other || edge.source == other) {
      edgeList.push(edge);
    }
  });

  return edgeList;
};

LNode.prototype.getNeighborsList = function () {
  var neighbors = new HashSet();
  var edge;

  var self = this;
  self.edges.forEach(function (edge) {

    if (edge.source == self) {
      neighbors.add(edge.target);
    } else {
      if (edge.target != self) {
        throw "Incorrect incidency!";
      }

      neighbors.add(edge.source);
    }
  });

  return neighbors;
};

LNode.prototype.withChildren = function () {
  var withNeighborsList = [];
  var childNode;

  withNeighborsList.push(this);

  if (this.child != null) {
    var nodes = this.child.getNodes();
    for (var i = 0; i < nodes.length; i++) {
      childNode = nodes[i];

      withNeighborsList = withNeighborsList.concat(childNode.withChildren());
    }
  }

  return withNeighborsList;
};

LNode.prototype.getNoOfChildren = function () {
  var noOfChildren = 0;
  var childNode;

  if (this.child == null) {
    noOfChildren = 1;
  } else {
    var nodes = this.child.getNodes();
    for (var i = 0; i < nodes.length; i++) {
      childNode = nodes[i];

      noOfChildren += childNode.getNoOfChildren();
    }
  }

  if (noOfChildren == 0) {
    noOfChildren = 1;
  }
  return noOfChildren;
};

LNode.prototype.getEstimatedSize = function () {
  if (this.estimatedSize == Integer.MIN_VALUE) {
    throw "assert failed";
  }
  return this.estimatedSize;
};

LNode.prototype.calcEstimatedSize = function () {
  if (this.child == null) {
    return this.estimatedSize = (this.rect.width + this.rect.height) / 2;
  } else {
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
  randomCenterX = LayoutConstants.WORLD_CENTER_X + RandomSeed.nextDouble() * (maxX - minX) + minX;

  var minY = -LayoutConstants.INITIAL_WORLD_BOUNDARY;
  var maxY = LayoutConstants.INITIAL_WORLD_BOUNDARY;
  randomCenterY = LayoutConstants.WORLD_CENTER_Y + RandomSeed.nextDouble() * (maxY - minY) + minY;

  this.rect.x = randomCenterX;
  this.rect.y = randomCenterY;
};

LNode.prototype.updateBounds = function () {
  if (this.getChild() == null) {
    throw "assert failed";
  }
  if (this.getChild().getNodes().length != 0) {
    // wrap the children nodes by re-arranging the boundaries
    var childGraph = this.getChild();
    childGraph.updateBounds(true);

    this.rect.x = childGraph.getLeft();
    this.rect.y = childGraph.getTop();

    this.setWidth(childGraph.getRight() - childGraph.getLeft());
    this.setHeight(childGraph.getBottom() - childGraph.getTop());

    // Update compound bounds considering its label properties    
    if (LayoutConstants.NODE_DIMENSIONS_INCLUDE_LABELS) {

      var width = childGraph.getRight() - childGraph.getLeft();
      var height = childGraph.getBottom() - childGraph.getTop();

      if (this.labelWidth > width) {
        this.rect.x -= (this.labelWidth - width) / 2;
        this.setWidth(this.labelWidth);
      }

      if (this.labelHeight > height) {
        if (this.labelPos == "center") {
          this.rect.y -= (this.labelHeight - height) / 2;
        } else if (this.labelPos == "top") {
          this.rect.y -= this.labelHeight - height;
        }
        this.setHeight(this.labelHeight);
      }
    }
  }
};

LNode.prototype.getInclusionTreeDepth = function () {
  if (this.inclusionTreeDepth == Integer.MAX_VALUE) {
    throw "assert failed";
  }
  return this.inclusionTreeDepth;
};

LNode.prototype.transform = function (trans) {
  var left = this.rect.x;

  if (left > LayoutConstants.WORLD_BOUNDARY) {
    left = LayoutConstants.WORLD_BOUNDARY;
  } else if (left < -LayoutConstants.WORLD_BOUNDARY) {
    left = -LayoutConstants.WORLD_BOUNDARY;
  }

  var top = this.rect.y;

  if (top > LayoutConstants.WORLD_BOUNDARY) {
    top = LayoutConstants.WORLD_BOUNDARY;
  } else if (top < -LayoutConstants.WORLD_BOUNDARY) {
    top = -LayoutConstants.WORLD_BOUNDARY;
  }

  var leftTop = new PointD(left, top);
  var vLeftTop = trans.inverseTransformPoint(leftTop);

  this.setLocation(vLeftTop.x, vLeftTop.y);
};

LNode.prototype.getLeft = function () {
  return this.rect.x;
};

LNode.prototype.getRight = function () {
  return this.rect.x + this.rect.width;
};

LNode.prototype.getTop = function () {
  return this.rect.y;
};

LNode.prototype.getBottom = function () {
  return this.rect.y + this.rect.height;
};

LNode.prototype.getParent = function () {
  if (this.owner == null) {
    return null;
  }

  return this.owner.getParent();
};

module.exports = LNode;

},{"./HashSet":14,"./Integer":17,"./LGraphObject":21,"./LayoutConstants":24,"./PointD":26,"./RandomSeed":27,"./RectangleD":28}],23:[function(require,module,exports){
'use strict';

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
  Emitter.call(this);

  //Layout Quality: 0:proof, 1:default, 2:draft
  this.layoutQuality = LayoutConstants.DEFAULT_QUALITY;
  //Whether layout should create bendpoints as needed or not
  this.createBendsAsNeeded = LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
  //Whether layout should be incremental or not
  this.incremental = LayoutConstants.DEFAULT_INCREMENTAL;
  //Whether we animate from before to after layout node positions
  this.animationOnLayout = LayoutConstants.DEFAULT_ANIMATION_ON_LAYOUT;
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
  this.uniformLeafNodeSizes = LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES;
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

Layout.prototype = Object.create(Emitter.prototype);

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

Layout.prototype.newGraph = function (vGraph) {
  return new LGraph(null, this.graphManager, vGraph);
};

Layout.prototype.newNode = function (vNode) {
  return new LNode(this.graphManager, vNode);
};

Layout.prototype.newEdge = function (vEdge) {
  return new LEdge(null, null, vEdge);
};

Layout.prototype.checkLayoutSuccess = function () {
  return this.graphManager.getRoot() == null || this.graphManager.getRoot().getNodes().length == 0 || this.graphManager.includesInvalidEdge();
};

Layout.prototype.runLayout = function () {
  this.isLayoutFinished = false;

  if (this.tilingPreLayout) {
    this.tilingPreLayout();
  }

  this.initParameters();
  var isLayoutSuccessfull;

  if (this.checkLayoutSuccess()) {
    isLayoutSuccessfull = false;
  } else {
    isLayoutSuccessfull = this.layout();
  }

  if (LayoutConstants.ANIMATE === 'during') {
    // If this is a 'during' layout animation. Layout is not finished yet. 
    // We need to perform these in index.js when layout is really finished.
    return false;
  }

  if (isLayoutSuccessfull) {
    if (!this.isSubLayout) {
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
Layout.prototype.doPostLayout = function () {
  //assert !isSubLayout : "Should not be called on sub-layout!";
  // Propagate geometric changes to v-level objects
  if (!this.incremental) {
    this.transform();
  }
  this.update();
};

/**
 * This method updates the geometry of the target graph according to
 * calculated layout.
 */
Layout.prototype.update2 = function () {
  // update bend points
  if (this.createBendsAsNeeded) {
    this.createBendpointsFromDummyNodes();

    // reset all edges, since the topology has changed
    this.graphManager.resetAllEdges();
  }

  // perform edge, node and root updates if layout is not called
  // remotely
  if (!this.isRemoteUse) {
    // update all edges
    var edge;
    var allEdges = this.graphManager.getAllEdges();
    for (var i = 0; i < allEdges.length; i++) {
      edge = allEdges[i];
      //      this.update(edge);
    }

    // recursively update nodes
    var node;
    var nodes = this.graphManager.getRoot().getNodes();
    for (var i = 0; i < nodes.length; i++) {
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
  } else if (obj instanceof LNode) {
    var node = obj;
    if (node.getChild() != null) {
      // since node is compound, recursively update child nodes
      var nodes = node.getChild().getNodes();
      for (var i = 0; i < nodes.length; i++) {
        update(nodes[i]);
      }
    }

    // if the l-level node is associated with a v-level graph object,
    // then it is assumed that the v-level node implements the
    // interface Updatable.
    if (node.vGraphObject != null) {
      // cast to Updatable without any type check
      var vNode = node.vGraphObject;

      // call the update method of the interface
      vNode.update(node);
    }
  } else if (obj instanceof LEdge) {
    var edge = obj;
    // if the l-level edge is associated with a v-level graph object,
    // then it is assumed that the v-level edge implements the
    // interface Updatable.

    if (edge.vGraphObject != null) {
      // cast to Updatable without any type check
      var vEdge = edge.vGraphObject;

      // call the update method of the interface
      vEdge.update(edge);
    }
  } else if (obj instanceof LGraph) {
    var graph = obj;
    // if the l-level graph is associated with a v-level graph object,
    // then it is assumed that the v-level object implements the
    // interface Updatable.

    if (graph.vGraphObject != null) {
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
  if (!this.isSubLayout) {
    this.layoutQuality = LayoutConstants.DEFAULT_QUALITY;
    this.animationDuringLayout = LayoutConstants.DEFAULT_ANIMATION_DURING_LAYOUT;
    this.animationPeriod = LayoutConstants.DEFAULT_ANIMATION_PERIOD;
    this.animationOnLayout = LayoutConstants.DEFAULT_ANIMATION_ON_LAYOUT;
    this.incremental = LayoutConstants.DEFAULT_INCREMENTAL;
    this.createBendsAsNeeded = LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
    this.uniformLeafNodeSizes = LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES;
  }

  if (this.animationDuringLayout) {
    this.animationOnLayout = false;
  }
};

Layout.prototype.transform = function (newLeftTop) {
  if (newLeftTop == undefined) {
    this.transform(new PointD(0, 0));
  } else {
    // create a transformation object (from Eclipse to layout). When an
    // inverse transform is applied, we get upper-left coordinate of the
    // drawing or the root graph at given input coordinate (some margins
    // already included in calculation of left-top).

    var trans = new Transform();
    var leftTop = this.graphManager.getRoot().updateLeftTop();

    if (leftTop != null) {
      trans.setWorldOrgX(newLeftTop.x);
      trans.setWorldOrgY(newLeftTop.y);

      trans.setDeviceOrgX(leftTop.x);
      trans.setDeviceOrgY(leftTop.y);

      var nodes = this.getAllNodes();
      var node;

      for (var i = 0; i < nodes.length; i++) {
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
  } else {
    var lNode;
    var childGraph;

    var nodes = graph.getNodes();
    for (var i = 0; i < nodes.length; i++) {
      lNode = nodes[i];
      childGraph = lNode.getChild();

      if (childGraph == null) {
        lNode.scatter();
      } else if (childGraph.getNodes().length == 0) {
        lNode.scatter();
      } else {
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
Layout.prototype.getFlatForest = function () {
  var flatForest = [];
  var isForest = true;

  // Quick reference for all nodes in the graph manager associated with
  // this layout. The list should not be changed.
  var allNodes = this.graphManager.getRoot().getNodes();

  // First be sure that the graph is flat
  var isFlat = true;

  for (var i = 0; i < allNodes.length; i++) {
    if (allNodes[i].getChild() != null) {
      isFlat = false;
    }
  }

  // Return empty forest if the graph is not flat.
  if (!isFlat) {
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

  while (unProcessedNodes.length > 0 && isForest) {
    toBeVisited.push(unProcessedNodes[0]);

    // Start the BFS. Each iteration of this loop visits a node in a
    // BFS manner.
    while (toBeVisited.length > 0 && isForest) {
      //pool operation
      var currentNode = toBeVisited[0];
      toBeVisited.splice(0, 1);
      visited.add(currentNode);

      // Traverse all neighbors of this node
      var neighborEdges = currentNode.getEdges();

      for (var i = 0; i < neighborEdges.length; i++) {
        var currentNeighbor = neighborEdges[i].getOtherEnd(currentNode);

        // If BFS is not growing from this neighbor.
        if (parents.get(currentNode) != currentNeighbor) {
          // We haven't previously visited this neighbor.
          if (!visited.contains(currentNeighbor)) {
            toBeVisited.push(currentNeighbor);
            parents.put(currentNeighbor, currentNode);
          }
          // Since we have previously visited this neighbor and
          // this neighbor is not parent of currentNode, given
          // graph contains a component that is not tree, hence
          // it is not a forest.
          else {
              isForest = false;
              break;
            }
        }
      }
    }

    // The graph contains a component that is not a tree. Empty
    // previously found trees. The method will end.
    if (!isForest) {
      flatForest = [];
    }
    // Save currently visited nodes as a tree in our forest. Reset
    // visited and parents lists. Continue with the next component of
    // the graph, if any.
    else {
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
Layout.prototype.createDummyNodesForBendpoints = function (edge) {
  var dummyNodes = [];
  var prev = edge.source;

  var graph = this.graphManager.calcLowestCommonAncestor(edge.source, edge.target);

  for (var i = 0; i < edge.bendpoints.length; i++) {
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
  if (edge.isInterGraph()) {
    this.graphManager.remove(edge);
  }
  // else, remove the edge from the current graph
  else {
      graph.remove(edge);
    }

  return dummyNodes;
};

/**
 * This method creates bendpoints for edges from the dummy nodes
 * at l-level.
 */
Layout.prototype.createBendpointsFromDummyNodes = function () {
  var edges = [];
  edges = edges.concat(this.graphManager.getAllEdges());
  edges = this.edgeToDummyNodes.keySet().concat(edges);

  for (var k = 0; k < edges.length; k++) {
    var lEdge = edges[k];

    if (lEdge.bendpoints.length > 0) {
      var path = this.edgeToDummyNodes.get(lEdge);

      for (var i = 0; i < path.length; i++) {
        var dummyNode = path[i];
        var p = new PointD(dummyNode.getCenterX(), dummyNode.getCenterY());

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

    if (sliderValue <= 50) {
      var minValue = defaultValue / minDiv;
      value -= (defaultValue - minValue) / 50 * (50 - sliderValue);
    } else {
      var maxValue = defaultValue * maxMul;
      value += (maxValue - defaultValue) / 50 * (sliderValue - 50);
    }

    return value;
  } else {
    var a, b;

    if (sliderValue <= 50) {
      a = 9.0 * defaultValue / 500.0;
      b = defaultValue / 10.0;
    } else {
      a = 9.0 * defaultValue / 50.0;
      b = -8 * defaultValue;
    }

    return a * sliderValue + b;
  }
};

/**
 * This method finds and returns the center of the given nodes, assuming
 * that the given nodes form a tree in themselves.
 */
Layout.findCenterOfTree = function (nodes) {
  var list = [];
  list = list.concat(nodes);

  var removedNodes = [];
  var remainingDegrees = new HashMap();
  var foundCenter = false;
  var centerNode = null;

  if (list.length == 1 || list.length == 2) {
    foundCenter = true;
    centerNode = list[0];
  }

  for (var i = 0; i < list.length; i++) {
    var node = list[i];
    var degree = node.getNeighborsList().size();
    remainingDegrees.put(node, node.getNeighborsList().size());

    if (degree == 1) {
      removedNodes.push(node);
    }
  }

  var tempList = [];
  tempList = tempList.concat(removedNodes);

  while (!foundCenter) {
    var tempList2 = [];
    tempList2 = tempList2.concat(tempList);
    tempList = [];

    for (var i = 0; i < list.length; i++) {
      var node = list[i];

      var index = list.indexOf(node);
      if (index >= 0) {
        list.splice(index, 1);
      }

      var neighbours = node.getNeighborsList();

      Object.keys(neighbours.set).forEach(function (j) {
        var neighbour = neighbours.set[j];
        if (removedNodes.indexOf(neighbour) < 0) {
          var otherDegree = remainingDegrees.get(neighbour);
          var newDegree = otherDegree - 1;

          if (newDegree == 1) {
            tempList.push(neighbour);
          }

          remainingDegrees.put(neighbour, newDegree);
        }
      });
    }

    removedNodes = removedNodes.concat(tempList);

    if (list.length == 1 || list.length == 2) {
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
Layout.prototype.setGraphManager = function (gm) {
  this.graphManager = gm;
};

module.exports = Layout;

},{"./Emitter":8,"./HashMap":13,"./HashSet":14,"./LEdge":18,"./LGraph":19,"./LGraphManager":20,"./LNode":22,"./LayoutConstants":24,"./PointD":26,"./Transform":29}],24:[function(require,module,exports){
"use strict";

function LayoutConstants() {}

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
 * Whether to consider labels in node dimensions or not
 */
LayoutConstants.NODE_DIMENSIONS_INCLUDE_LABELS = false;

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
'use strict';

/*
 *This class is the javascript implementation of the Point.java class in jdk
 */
function Point(x, y, p) {
  this.x = null;
  this.y = null;
  if (x == null && y == null && p == null) {
    this.x = 0;
    this.y = 0;
  } else if (typeof x == 'number' && typeof y == 'number' && p == null) {
    this.x = x;
    this.y = y;
  } else if (x.constructor.name == 'Point' && y == null && p == null) {
    p = x;
    this.x = p.x;
    this.y = p.y;
  }
}

Point.prototype.getX = function () {
  return this.x;
};

Point.prototype.getY = function () {
  return this.y;
};

Point.prototype.getLocation = function () {
  return new Point(this.x, this.y);
};

Point.prototype.setLocation = function (x, y, p) {
  if (x.constructor.name == 'Point' && y == null && p == null) {
    p = x;
    this.setLocation(p.x, p.y);
  } else if (typeof x == 'number' && typeof y == 'number' && p == null) {
    //if both parameters are integer just move (x,y) location
    if (parseInt(x) == x && parseInt(y) == y) {
      this.move(x, y);
    } else {
      this.x = Math.floor(x + 0.5);
      this.y = Math.floor(y + 0.5);
    }
  }
};

Point.prototype.move = function (x, y) {
  this.x = x;
  this.y = y;
};

Point.prototype.translate = function (dx, dy) {
  this.x += dx;
  this.y += dy;
};

Point.prototype.equals = function (obj) {
  if (obj.constructor.name == "Point") {
    var pt = obj;
    return this.x == pt.x && this.y == pt.y;
  }
  return this == obj;
};

Point.prototype.toString = function () {
  return new Point().constructor.name + "[x=" + this.x + ",y=" + this.y + "]";
};

module.exports = Point;

},{}],26:[function(require,module,exports){
"use strict";

function PointD(x, y) {
  if (x == null && y == null) {
    this.x = 0;
    this.y = 0;
  } else {
    this.x = x;
    this.y = y;
  }
}

PointD.prototype.getX = function () {
  return this.x;
};

PointD.prototype.getY = function () {
  return this.y;
};

PointD.prototype.setX = function (x) {
  this.x = x;
};

PointD.prototype.setY = function (y) {
  this.y = y;
};

PointD.prototype.getDifference = function (pt) {
  return new DimensionD(this.x - pt.x, this.y - pt.y);
};

PointD.prototype.getCopy = function () {
  return new PointD(this.x, this.y);
};

PointD.prototype.translate = function (dim) {
  this.x += dim.width;
  this.y += dim.height;
  return this;
};

module.exports = PointD;

},{}],27:[function(require,module,exports){
"use strict";

function RandomSeed() {}
RandomSeed.seed = 1;
RandomSeed.x = 0;

RandomSeed.nextDouble = function () {
  RandomSeed.x = Math.sin(RandomSeed.seed++) * 10000;
  return RandomSeed.x - Math.floor(RandomSeed.x);
};

module.exports = RandomSeed;

},{}],28:[function(require,module,exports){
"use strict";

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

RectangleD.prototype.getX = function () {
  return this.x;
};

RectangleD.prototype.setX = function (x) {
  this.x = x;
};

RectangleD.prototype.getY = function () {
  return this.y;
};

RectangleD.prototype.setY = function (y) {
  this.y = y;
};

RectangleD.prototype.getWidth = function () {
  return this.width;
};

RectangleD.prototype.setWidth = function (width) {
  this.width = width;
};

RectangleD.prototype.getHeight = function () {
  return this.height;
};

RectangleD.prototype.setHeight = function (height) {
  this.height = height;
};

RectangleD.prototype.getRight = function () {
  return this.x + this.width;
};

RectangleD.prototype.getBottom = function () {
  return this.y + this.height;
};

RectangleD.prototype.intersects = function (a) {
  if (this.getRight() < a.x) {
    return false;
  }

  if (this.getBottom() < a.y) {
    return false;
  }

  if (a.getRight() < this.x) {
    return false;
  }

  if (a.getBottom() < this.y) {
    return false;
  }

  return true;
};

RectangleD.prototype.getCenterX = function () {
  return this.x + this.width / 2;
};

RectangleD.prototype.getMinX = function () {
  return this.getX();
};

RectangleD.prototype.getMaxX = function () {
  return this.getX() + this.width;
};

RectangleD.prototype.getCenterY = function () {
  return this.y + this.height / 2;
};

RectangleD.prototype.getMinY = function () {
  return this.getY();
};

RectangleD.prototype.getMaxY = function () {
  return this.getY() + this.height;
};

RectangleD.prototype.getWidthHalf = function () {
  return this.width / 2;
};

RectangleD.prototype.getHeightHalf = function () {
  return this.height / 2;
};

module.exports = RectangleD;

},{}],29:[function(require,module,exports){
'use strict';

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

Transform.prototype.getWorldOrgX = function () {
  return this.lworldOrgX;
};

Transform.prototype.setWorldOrgX = function (wox) {
  this.lworldOrgX = wox;
};

Transform.prototype.getWorldOrgY = function () {
  return this.lworldOrgY;
};

Transform.prototype.setWorldOrgY = function (woy) {
  this.lworldOrgY = woy;
};

Transform.prototype.getWorldExtX = function () {
  return this.lworldExtX;
};

Transform.prototype.setWorldExtX = function (wex) {
  this.lworldExtX = wex;
};

Transform.prototype.getWorldExtY = function () {
  return this.lworldExtY;
};

Transform.prototype.setWorldExtY = function (wey) {
  this.lworldExtY = wey;
};

/* Device related */

Transform.prototype.getDeviceOrgX = function () {
  return this.ldeviceOrgX;
};

Transform.prototype.setDeviceOrgX = function (dox) {
  this.ldeviceOrgX = dox;
};

Transform.prototype.getDeviceOrgY = function () {
  return this.ldeviceOrgY;
};

Transform.prototype.setDeviceOrgY = function (doy) {
  this.ldeviceOrgY = doy;
};

Transform.prototype.getDeviceExtX = function () {
  return this.ldeviceExtX;
};

Transform.prototype.setDeviceExtX = function (dex) {
  this.ldeviceExtX = dex;
};

Transform.prototype.getDeviceExtY = function () {
  return this.ldeviceExtY;
};

Transform.prototype.setDeviceExtY = function (dey) {
  this.ldeviceExtY = dey;
};

Transform.prototype.transformX = function (x) {
  var xDevice = 0.0;
  var worldExtX = this.lworldExtX;
  if (worldExtX != 0.0) {
    xDevice = this.ldeviceOrgX + (x - this.lworldOrgX) * this.ldeviceExtX / worldExtX;
  }

  return xDevice;
};

Transform.prototype.transformY = function (y) {
  var yDevice = 0.0;
  var worldExtY = this.lworldExtY;
  if (worldExtY != 0.0) {
    yDevice = this.ldeviceOrgY + (y - this.lworldOrgY) * this.ldeviceExtY / worldExtY;
  }

  return yDevice;
};

Transform.prototype.inverseTransformX = function (x) {
  var xWorld = 0.0;
  var deviceExtX = this.ldeviceExtX;
  if (deviceExtX != 0.0) {
    xWorld = this.lworldOrgX + (x - this.ldeviceOrgX) * this.lworldExtX / deviceExtX;
  }

  return xWorld;
};

Transform.prototype.inverseTransformY = function (y) {
  var yWorld = 0.0;
  var deviceExtY = this.ldeviceExtY;
  if (deviceExtY != 0.0) {
    yWorld = this.lworldOrgY + (y - this.ldeviceOrgY) * this.lworldExtY / deviceExtY;
  }
  return yWorld;
};

Transform.prototype.inverseTransformPoint = function (inPoint) {
  var outPoint = new PointD(this.inverseTransformX(inPoint.x), this.inverseTransformY(inPoint.y));
  return outPoint;
};

module.exports = Transform;

},{"./PointD":26}],30:[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function UniqueIDGeneretor() {}

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
};

UniqueIDGeneretor.getString = function (id) {
  if (id == null) id = UniqueIDGeneretor.lastID;
  return "Object#" + id + "";
};

UniqueIDGeneretor.isPrimitive = function (arg) {
  var type = typeof arg === "undefined" ? "undefined" : _typeof(arg);
  return arg == null || type != "object" && type != "function";
};

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
  ready: function ready() {},
  // Called on `layoutstop`
  stop: function stop() {},
  // include labels in node dimensions
  nodeDimensionsIncludeLabels: false,
  // number of ticks per frame; higher is faster but more jerky
  refresh: 30,
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
  gravityRange: 3.8,
  // Initial cooling factor for incremental layout
  initialEnergyOnIncremental: 0.8
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

var getUserOptions = function getUserOptions(options) {
  if (options.nodeRepulsion != null) CoSEConstants.DEFAULT_REPULSION_STRENGTH = FDLayoutConstants.DEFAULT_REPULSION_STRENGTH = options.nodeRepulsion;
  if (options.idealEdgeLength != null) CoSEConstants.DEFAULT_EDGE_LENGTH = FDLayoutConstants.DEFAULT_EDGE_LENGTH = options.idealEdgeLength;
  if (options.edgeElasticity != null) CoSEConstants.DEFAULT_SPRING_STRENGTH = FDLayoutConstants.DEFAULT_SPRING_STRENGTH = options.edgeElasticity;
  if (options.nestingFactor != null) CoSEConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = options.nestingFactor;
  if (options.gravity != null) CoSEConstants.DEFAULT_GRAVITY_STRENGTH = FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH = options.gravity;
  if (options.numIter != null) CoSEConstants.MAX_ITERATIONS = FDLayoutConstants.MAX_ITERATIONS = options.numIter;
  if (options.gravityRange != null) CoSEConstants.DEFAULT_GRAVITY_RANGE_FACTOR = FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR = options.gravityRange;
  if (options.gravityCompound != null) CoSEConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = options.gravityCompound;
  if (options.gravityRangeCompound != null) CoSEConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = options.gravityRangeCompound;
  if (options.initialEnergyOnIncremental != null) CoSEConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL = FDLayoutConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL = options.initialEnergyOnIncremental;

  CoSEConstants.NODE_DIMENSIONS_INCLUDE_LABELS = FDLayoutConstants.NODE_DIMENSIONS_INCLUDE_LABELS = LayoutConstants.NODE_DIMENSIONS_INCLUDE_LABELS = options.nodeDimensionsIncludeLabels;
  CoSEConstants.DEFAULT_INCREMENTAL = FDLayoutConstants.DEFAULT_INCREMENTAL = LayoutConstants.DEFAULT_INCREMENTAL = !options.randomize;
  CoSEConstants.ANIMATE = FDLayoutConstants.ANIMATE = LayoutConstants.ANIMATE = options.animate;
  CoSEConstants.TILE = options.tile;
  CoSEConstants.TILING_PADDING_VERTICAL = typeof options.tilingPaddingVertical === 'function' ? options.tilingPaddingVertical.call() : options.tilingPaddingVertical;
  CoSEConstants.TILING_PADDING_HORIZONTAL = typeof options.tilingPaddingHorizontal === 'function' ? options.tilingPaddingHorizontal.call() : options.tilingPaddingHorizontal;
};

_CoSELayout.prototype.run = function () {
  var ready;
  var frameId;
  var options = this.options;
  var idToLNode = this.idToLNode = {};
  var layout = this.layout = new CoSELayout();
  var self = this;

  self.stopped = false;

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

  var getPositions = function getPositions(ele, i) {
    if (typeof ele === "number") {
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
  var iterateAnimated = function iterateAnimated() {
    // Thigs to perform after nodes are repositioned on screen
    var afterReposition = function afterReposition() {
      if (options.fit) {
        options.cy.fit(options.eles.nodes(), options.padding);
      }

      if (!ready) {
        ready = true;
        self.cy.one('layoutready', options.ready);
        self.cy.trigger({ type: 'layoutready', layout: self });
      }
    };

    var ticksPerFrame = self.options.refresh;
    var isDone;

    for (var i = 0; i < ticksPerFrame && !isDone; i++) {
      isDone = self.stopped || self.layout.tick();
    }

    // If layout is done
    if (isDone) {
      // If the layout is not a sublayout and it is successful perform post layout.
      if (layout.checkLayoutSuccess() && !layout.isSubLayout) {
        layout.doPostLayout();
      }

      // If layout has a tilingPostLayout function property call it.
      if (layout.tilingPostLayout) {
        layout.tilingPostLayout();
      }

      layout.isLayoutFinished = true;

      self.options.eles.nodes().positions(getPositions);

      afterReposition();

      // trigger layoutstop when the layout stops (e.g. finishes)
      self.cy.one('layoutstop', self.options.stop);
      self.cy.trigger({ type: 'layoutstop', layout: self });

      if (frameId) {
        cancelAnimationFrame(frameId);
      }

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
  if (this.options.animate == 'end') {
    setTimeout(function () {
      self.options.eles.nodes().not(":parent").layoutPositions(self, self.options, getPositions); // Use layout positions to reposition the nodes it considers the options parameter
      ready = false;
    }, 0);
  } else if (this.options.animate == false) {
    self.options.eles.nodes().not(":parent").layoutPositions(self, self.options, getPositions); // Use layout positions to reposition the nodes it considers the options parameter
    ready = false;
  }

  return this; // chaining
};

//Get the top most ones of a list of nodes
_CoSELayout.prototype.getTopMostNodes = function (nodes) {
  var nodesMap = {};
  for (var i = 0; i < nodes.length; i++) {
    nodesMap[nodes[i].id()] = true;
  }
  var roots = nodes.filter(function (ele, i) {
    if (typeof ele === "number") {
      ele = i;
    }
    var parent = ele.parent()[0];
    while (parent != null) {
      if (nodesMap[parent.id()]) {
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

    var dimensions = theChild.layoutDimensions({
      nodeDimensionsIncludeLabels: this.options.nodeDimensionsIncludeLabels
    });

    if (theChild.outerWidth() != null && theChild.outerHeight() != null) {
      theNode = parent.add(new CoSENode(layout.graphManager, new PointD(theChild.position('x') - dimensions.w / 2, theChild.position('y') - dimensions.h / 2), new DimensionD(parseFloat(dimensions.w), parseFloat(dimensions.h))));
    } else {
      theNode = parent.add(new CoSENode(this.graphManager));
    }
    // Attach id to the layout node
    theNode.id = theChild.data("id");
    // Attach the paddings of cy node to layout node
    theNode.paddingLeft = parseInt(theChild.css('padding'));
    theNode.paddingTop = parseInt(theChild.css('padding'));
    theNode.paddingRight = parseInt(theChild.css('padding'));
    theNode.paddingBottom = parseInt(theChild.css('padding'));

    //Attach the label properties to compound if labels will be included in node dimensions  
    if (this.options.nodeDimensionsIncludeLabels) {
      if (theChild.isParent()) {
        var labelWidth = theChild.boundingBox({ includeLabels: true, includeNodes: false }).w;
        var labelHeight = theChild.boundingBox({ includeLabels: true, includeNodes: false }).h;
        var labelPos = theChild.css("text-halign");
        theNode.labelWidth = labelWidth;
        theNode.labelHeight = labelHeight;
        theNode.labelPos = labelPos;
      }
    }

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

  return this; // chaining
};

module.exports = function get(cytoscape) {
  return _CoSELayout;
};

},{"./CoSEConstants":1,"./CoSEEdge":2,"./CoSEGraph":3,"./CoSEGraphManager":4,"./CoSELayout":5,"./CoSENode":6,"./DimensionD":7,"./FDLayout":9,"./FDLayoutConstants":10,"./FDLayoutEdge":11,"./FDLayoutNode":12,"./HashMap":13,"./HashSet":14,"./IGeometry":15,"./IMath":16,"./Integer":17,"./LEdge":18,"./LGraph":19,"./LGraphManager":20,"./LGraphObject":21,"./LNode":22,"./Layout":23,"./LayoutConstants":24,"./Point":25,"./PointD":26,"./RandomSeed":27,"./RectangleD":28,"./Transform":29,"./UniqueIDGeneretor":30}],32:[function(require,module,exports){
'use strict';

// registers the extension on a cytoscape lib ref

var getLayout = require('./Layout');

var register = function register(cytoscape) {
  var Layout = getLayout(cytoscape);

  cytoscape('layout', 'cose-bilkent', Layout);
};

// auto reg for globals
if (typeof cytoscape !== 'undefined') {
  register(cytoscape);
}

module.exports = register;

},{"./Layout":31}]},{},[32])(32)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvTGF5b3V0L0NvU0VDb25zdGFudHMuanMiLCJzcmMvTGF5b3V0L0NvU0VFZGdlLmpzIiwic3JjL0xheW91dC9Db1NFR3JhcGguanMiLCJzcmMvTGF5b3V0L0NvU0VHcmFwaE1hbmFnZXIuanMiLCJzcmMvTGF5b3V0L0NvU0VMYXlvdXQuanMiLCJzcmMvTGF5b3V0L0NvU0VOb2RlLmpzIiwic3JjL0xheW91dC9EaW1lbnNpb25ELmpzIiwic3JjL0xheW91dC9FbWl0dGVyLmpzIiwic3JjL0xheW91dC9GRExheW91dC5qcyIsInNyYy9MYXlvdXQvRkRMYXlvdXRDb25zdGFudHMuanMiLCJzcmMvTGF5b3V0L0ZETGF5b3V0RWRnZS5qcyIsInNyYy9MYXlvdXQvRkRMYXlvdXROb2RlLmpzIiwic3JjL0xheW91dC9IYXNoTWFwLmpzIiwic3JjL0xheW91dC9IYXNoU2V0LmpzIiwic3JjL0xheW91dC9JR2VvbWV0cnkuanMiLCJzcmMvTGF5b3V0L0lNYXRoLmpzIiwic3JjL0xheW91dC9JbnRlZ2VyLmpzIiwic3JjL0xheW91dC9MRWRnZS5qcyIsInNyYy9MYXlvdXQvTEdyYXBoLmpzIiwic3JjL0xheW91dC9MR3JhcGhNYW5hZ2VyLmpzIiwic3JjL0xheW91dC9MR3JhcGhPYmplY3QuanMiLCJzcmMvTGF5b3V0L0xOb2RlLmpzIiwic3JjL0xheW91dC9MYXlvdXQuanMiLCJzcmMvTGF5b3V0L0xheW91dENvbnN0YW50cy5qcyIsInNyYy9MYXlvdXQvUG9pbnQuanMiLCJzcmMvTGF5b3V0L1BvaW50RC5qcyIsInNyYy9MYXlvdXQvUmFuZG9tU2VlZC5qcyIsInNyYy9MYXlvdXQvUmVjdGFuZ2xlRC5qcyIsInNyYy9MYXlvdXQvVHJhbnNmb3JtLmpzIiwic3JjL0xheW91dC9VbmlxdWVJREdlbmVyZXRvci5qcyIsInNyYy9MYXlvdXQvaW5kZXguanMiLCJpbmRleC5qcyJdLCJuYW1lcyI6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R0FBZSxJQUFmOztBQUVBLFNBQU8sSUFBUCxDQUh1QyxDQUcxQjtBQUNkLENBSkQ7O0FBTUEsT0FBTyxPQUFQLEdBQWlCLFNBQVMsR0FBVCxDQUFhLFNBQWIsRUFBd0I7QUFDdkMsU0FBTyxXQUFQO0FBQ0QsQ0FGRDs7O0FDNVhBOztBQUVBOztBQUNBLElBQUksWUFBWSxRQUFRLFVBQVIsQ0FBaEI7O0FBRUEsSUFBSSxXQUFXLFNBQVgsUUFBVyxDQUFVLFNBQVYsRUFBcUI7QUFDbEMsTUFBSSxTQUFTLFVBQVcsU0FBWCxDQUFiOztBQUVBLFlBQVUsUUFBVixFQUFvQixjQUFwQixFQUFvQyxNQUFwQztBQUNELENBSkQ7O0FBTUE7QUFDQSxJQUFJLE9BQU8sU0FBUCxLQUFxQixXQUF6QixFQUFzQztBQUNwQyxXQUFVLFNBQVY7QUFDRDs7QUFFRCxPQUFPLE9BQVAsR0FBaUIsUUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xuXG5mdW5jdGlvbiBDb1NFQ29uc3RhbnRzKCkge1xufVxuXG4vL0NvU0VDb25zdGFudHMgaW5oZXJpdHMgc3RhdGljIHByb3BzIGluIEZETGF5b3V0Q29uc3RhbnRzXG5mb3IgKHZhciBwcm9wIGluIEZETGF5b3V0Q29uc3RhbnRzKSB7XG4gIENvU0VDb25zdGFudHNbcHJvcF0gPSBGRExheW91dENvbnN0YW50c1twcm9wXTtcbn1cblxuQ29TRUNvbnN0YW50cy5ERUZBVUxUX1VTRV9NVUxUSV9MRVZFTF9TQ0FMSU5HID0gZmFsc2U7XG5Db1NFQ29uc3RhbnRzLkRFRkFVTFRfUkFESUFMX1NFUEFSQVRJT04gPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIO1xuQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPTkVOVF9TRVBFUkFUSU9OID0gNjA7XG5Db1NFQ29uc3RhbnRzLlRJTEUgPSB0cnVlO1xuQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19WRVJUSUNBTCA9IDEwO1xuQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19IT1JJWk9OVEFMID0gMTA7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29TRUNvbnN0YW50cztcbiIsInZhciBGRExheW91dEVkZ2UgPSByZXF1aXJlKCcuL0ZETGF5b3V0RWRnZScpO1xuXG5mdW5jdGlvbiBDb1NFRWRnZShzb3VyY2UsIHRhcmdldCwgdkVkZ2UpIHtcbiAgRkRMYXlvdXRFZGdlLmNhbGwodGhpcywgc291cmNlLCB0YXJnZXQsIHZFZGdlKTtcbn1cblxuQ29TRUVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGRExheW91dEVkZ2UucHJvdG90eXBlKTtcbmZvciAodmFyIHByb3AgaW4gRkRMYXlvdXRFZGdlKSB7XG4gIENvU0VFZGdlW3Byb3BdID0gRkRMYXlvdXRFZGdlW3Byb3BdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvU0VFZGdlXG4iLCJ2YXIgTEdyYXBoID0gcmVxdWlyZSgnLi9MR3JhcGgnKTtcblxuZnVuY3Rpb24gQ29TRUdyYXBoKHBhcmVudCwgZ3JhcGhNZ3IsIHZHcmFwaCkge1xuICBMR3JhcGguY2FsbCh0aGlzLCBwYXJlbnQsIGdyYXBoTWdyLCB2R3JhcGgpO1xufVxuXG5Db1NFR3JhcGgucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGgucHJvdG90eXBlKTtcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoKSB7XG4gIENvU0VHcmFwaFtwcm9wXSA9IExHcmFwaFtwcm9wXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb1NFR3JhcGg7XG4iLCJ2YXIgTEdyYXBoTWFuYWdlciA9IHJlcXVpcmUoJy4vTEdyYXBoTWFuYWdlcicpO1xuXG5mdW5jdGlvbiBDb1NFR3JhcGhNYW5hZ2VyKGxheW91dCkge1xuICBMR3JhcGhNYW5hZ2VyLmNhbGwodGhpcywgbGF5b3V0KTtcbn1cblxuQ29TRUdyYXBoTWFuYWdlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExHcmFwaE1hbmFnZXIucHJvdG90eXBlKTtcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoTWFuYWdlcikge1xuICBDb1NFR3JhcGhNYW5hZ2VyW3Byb3BdID0gTEdyYXBoTWFuYWdlcltwcm9wXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb1NFR3JhcGhNYW5hZ2VyO1xuIiwidmFyIEZETGF5b3V0ID0gcmVxdWlyZSgnLi9GRExheW91dCcpO1xudmFyIENvU0VHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0NvU0VHcmFwaE1hbmFnZXInKTtcbnZhciBDb1NFR3JhcGggPSByZXF1aXJlKCcuL0NvU0VHcmFwaCcpO1xudmFyIENvU0VOb2RlID0gcmVxdWlyZSgnLi9Db1NFTm9kZScpO1xudmFyIENvU0VFZGdlID0gcmVxdWlyZSgnLi9Db1NFRWRnZScpO1xudmFyIENvU0VDb25zdGFudHMgPSByZXF1aXJlKCcuL0NvU0VDb25zdGFudHMnKTtcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcbnZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9Qb2ludCcpO1xudmFyIFBvaW50RCA9IHJlcXVpcmUoJy4vUG9pbnREJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9MYXlvdXQnKTtcbnZhciBJbnRlZ2VyID0gcmVxdWlyZSgnLi9JbnRlZ2VyJyk7XG52YXIgSUdlb21ldHJ5ID0gcmVxdWlyZSgnLi9JR2VvbWV0cnknKTtcbnZhciBMR3JhcGggPSByZXF1aXJlKCcuL0xHcmFwaCcpO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyk7XG5cbmZ1bmN0aW9uIENvU0VMYXlvdXQoKSB7XG4gIEZETGF5b3V0LmNhbGwodGhpcyk7XG4gIFxuICB0aGlzLnRvQmVUaWxlZCA9IHt9OyAvLyBNZW1vcml6ZSBpZiBhIG5vZGUgaXMgdG8gYmUgdGlsZWQgb3IgaXMgdGlsZWRcbn1cblxuQ29TRUxheW91dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZETGF5b3V0LnByb3RvdHlwZSk7XG5cbmZvciAodmFyIHByb3AgaW4gRkRMYXlvdXQpIHtcbiAgQ29TRUxheW91dFtwcm9wXSA9IEZETGF5b3V0W3Byb3BdO1xufVxuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdHcmFwaE1hbmFnZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBnbSA9IG5ldyBDb1NFR3JhcGhNYW5hZ2VyKHRoaXMpO1xuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xuICByZXR1cm4gZ207XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdHcmFwaCA9IGZ1bmN0aW9uICh2R3JhcGgpIHtcbiAgcmV0dXJuIG5ldyBDb1NFR3JhcGgobnVsbCwgdGhpcy5ncmFwaE1hbmFnZXIsIHZHcmFwaCk7XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdOb2RlID0gZnVuY3Rpb24gKHZOb2RlKSB7XG4gIHJldHVybiBuZXcgQ29TRU5vZGUodGhpcy5ncmFwaE1hbmFnZXIsIHZOb2RlKTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLm5ld0VkZ2UgPSBmdW5jdGlvbiAodkVkZ2UpIHtcbiAgcmV0dXJuIG5ldyBDb1NFRWRnZShudWxsLCBudWxsLCB2RWRnZSk7XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycyA9IGZ1bmN0aW9uICgpIHtcbiAgRkRMYXlvdXQucHJvdG90eXBlLmluaXRQYXJhbWV0ZXJzLmNhbGwodGhpcywgYXJndW1lbnRzKTtcbiAgaWYgKCF0aGlzLmlzU3ViTGF5b3V0KSB7XG4gICAgaWYgKENvU0VDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA8IDEwKVxuICAgIHtcbiAgICAgIHRoaXMuaWRlYWxFZGdlTGVuZ3RoID0gMTA7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICB0aGlzLmlkZWFsRWRnZUxlbmd0aCA9IENvU0VDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcbiAgICB9XG5cbiAgICB0aGlzLnVzZVNtYXJ0SWRlYWxFZGdlTGVuZ3RoQ2FsY3VsYXRpb24gPVxuICAgICAgICAgICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX1VTRV9TTUFSVF9JREVBTF9FREdFX0xFTkdUSF9DQUxDVUxBVElPTjtcbiAgICB0aGlzLnNwcmluZ0NvbnN0YW50ID1cbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfU1BSSU5HX1NUUkVOR1RIO1xuICAgIHRoaXMucmVwdWxzaW9uQ29uc3RhbnQgPVxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEg7XG4gICAgdGhpcy5ncmF2aXR5Q29uc3RhbnQgPVxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIO1xuICAgIHRoaXMuY29tcG91bmRHcmF2aXR5Q29uc3RhbnQgPVxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1NUUkVOR1RIO1xuICAgIHRoaXMuZ3Jhdml0eVJhbmdlRmFjdG9yID1cbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XG4gICAgdGhpcy5jb21wb3VuZEdyYXZpdHlSYW5nZUZhY3RvciA9XG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfUkFOR0VfRkFDVE9SO1xuICB9XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5sYXlvdXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBjcmVhdGVCZW5kc0FzTmVlZGVkID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ1JFQVRFX0JFTkRTX0FTX05FRURFRDtcbiAgaWYgKGNyZWF0ZUJlbmRzQXNOZWVkZWQpXG4gIHtcbiAgICB0aGlzLmNyZWF0ZUJlbmRwb2ludHMoKTtcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZXNldEFsbEVkZ2VzKCk7XG4gIH1cblxuICB0aGlzLmxldmVsID0gMDtcbiAgcmV0dXJuIHRoaXMuY2xhc3NpY0xheW91dCgpO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuY2xhc3NpY0xheW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5jYWxjdWxhdGVOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvblRvKCk7XG4gIHRoaXMuY2FsY05vT2ZDaGlsZHJlbkZvckFsbE5vZGVzKCk7XG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLmNhbGNMb3dlc3RDb21tb25BbmNlc3RvcnMoKTtcbiAgdGhpcy5ncmFwaE1hbmFnZXIuY2FsY0luY2x1c2lvblRyZWVEZXB0aHMoKTtcbiAgdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmNhbGNFc3RpbWF0ZWRTaXplKCk7XG4gIHRoaXMuY2FsY0lkZWFsRWRnZUxlbmd0aHMoKTtcbiAgaWYgKCF0aGlzLmluY3JlbWVudGFsKVxuICB7XG4gICAgdmFyIGZvcmVzdCA9IHRoaXMuZ2V0RmxhdEZvcmVzdCgpO1xuXG4gICAgLy8gVGhlIGdyYXBoIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGxheW91dCBpcyBmbGF0IGFuZCBhIGZvcmVzdFxuICAgIGlmIChmb3Jlc3QubGVuZ3RoID4gMClcblxuICAgIHtcbiAgICAgIHRoaXMucG9zaXRpb25Ob2Rlc1JhZGlhbGx5KGZvcmVzdCk7XG4gICAgfVxuICAgIC8vIFRoZSBncmFwaCBhc3NvY2lhdGVkIHdpdGggdGhpcyBsYXlvdXQgaXMgbm90IGZsYXQgb3IgYSBmb3Jlc3RcbiAgICBlbHNlXG4gICAge1xuICAgICAgdGhpcy5wb3NpdGlvbk5vZGVzUmFuZG9tbHkoKTtcbiAgICB9XG4gIH1cblxuICB0aGlzLmluaXRTcHJpbmdFbWJlZGRlcigpO1xuICB0aGlzLnJ1blNwcmluZ0VtYmVkZGVyKCk7XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS50aWNrID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMudG90YWxJdGVyYXRpb25zKys7XG4gIFxuICBpZiAodGhpcy50b3RhbEl0ZXJhdGlvbnMgPT09IHRoaXMubWF4SXRlcmF0aW9ucykge1xuICAgIHJldHVybiB0cnVlOyAvLyBMYXlvdXQgaXMgbm90IGVuZGVkIHJldHVybiB0cnVlXG4gIH1cbiAgXG4gIGlmICh0aGlzLnRvdGFsSXRlcmF0aW9ucyAlIEZETGF5b3V0Q29uc3RhbnRzLkNPTlZFUkdFTkNFX0NIRUNLX1BFUklPRCA9PSAwKVxuICB7XG4gICAgaWYgKHRoaXMuaXNDb252ZXJnZWQoKSlcbiAgICB7XG4gICAgICByZXR1cm4gdHJ1ZTsgLy8gTGF5b3V0IGlzIG5vdCBlbmRlZCByZXR1cm4gdHJ1ZVxuICAgIH1cblxuICAgIHRoaXMuY29vbGluZ0ZhY3RvciA9IHRoaXMuaW5pdGlhbENvb2xpbmdGYWN0b3IgKlxuICAgICAgICAgICAgKCh0aGlzLm1heEl0ZXJhdGlvbnMgLSB0aGlzLnRvdGFsSXRlcmF0aW9ucykgLyB0aGlzLm1heEl0ZXJhdGlvbnMpO1xuICAgIHRoaXMuYW5pbWF0aW9uUGVyaW9kID0gTWF0aC5jZWlsKHRoaXMuaW5pdGlhbEFuaW1hdGlvblBlcmlvZCAqIE1hdGguc3FydCh0aGlzLmNvb2xpbmdGYWN0b3IpKTtcblxuICB9XG4gIHRoaXMudG90YWxEaXNwbGFjZW1lbnQgPSAwO1xuICB0aGlzLmdyYXBoTWFuYWdlci51cGRhdGVCb3VuZHMoKTtcbiAgdGhpcy5jYWxjU3ByaW5nRm9yY2VzKCk7XG4gIHRoaXMuY2FsY1JlcHVsc2lvbkZvcmNlcygpO1xuICB0aGlzLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2VzKCk7XG4gIHRoaXMubW92ZU5vZGVzKCk7XG4gIHRoaXMuYW5pbWF0ZSgpO1xuICBcbiAgcmV0dXJuIGZhbHNlOyAvLyBMYXlvdXQgaXMgbm90IGVuZGVkIHlldCByZXR1cm4gZmFsc2Vcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmdldFBvc2l0aW9uc0RhdGEgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFsbE5vZGVzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsTm9kZXMoKTtcbiAgdmFyIHBEYXRhID0ge307XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcmVjdCA9IGFsbE5vZGVzW2ldLnJlY3Q7XG4gICAgdmFyIGlkID0gYWxsTm9kZXNbaV0uaWQ7XG4gICAgcERhdGFbaWRdID0ge1xuICAgICAgaWQ6IGlkLFxuICAgICAgeDogcmVjdC5nZXRDZW50ZXJYKCksXG4gICAgICB5OiByZWN0LmdldENlbnRlclkoKSxcbiAgICAgIHc6IHJlY3Qud2lkdGgsXG4gICAgICBoOiByZWN0LmhlaWdodFxuICAgIH07XG4gIH1cbiAgXG4gIHJldHVybiBwRGF0YTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLnJ1blNwcmluZ0VtYmVkZGVyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmluaXRpYWxBbmltYXRpb25QZXJpb2QgPSAyNTtcbiAgdGhpcy5hbmltYXRpb25QZXJpb2QgPSB0aGlzLmluaXRpYWxBbmltYXRpb25QZXJpb2Q7XG4gIHZhciBsYXlvdXRFbmRlZCA9IGZhbHNlO1xuICBcbiAgLy8gSWYgYW1pbmF0ZSBvcHRpb24gaXMgJ2R1cmluZycgc2lnbmFsIHRoYXQgbGF5b3V0IGlzIHN1cHBvc2VkIHRvIHN0YXJ0IGl0ZXJhdGluZ1xuICBpZiAoIEZETGF5b3V0Q29uc3RhbnRzLkFOSU1BVEUgPT09ICdkdXJpbmcnICkge1xuICAgIHRoaXMuZW1pdCgnbGF5b3V0c3RhcnRlZCcpO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIElmIGFtaW5hdGUgb3B0aW9uIGlzICdkdXJpbmcnIHRpY2soKSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBvbiBpbmRleC5qc1xuICAgIHdoaWxlICghbGF5b3V0RW5kZWQpIHtcbiAgICAgIGxheW91dEVuZGVkID0gdGhpcy50aWNrKCk7XG4gICAgfVxuXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIudXBkYXRlQm91bmRzKCk7XG4gIH1cbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmNhbGN1bGF0ZU5vZGVzVG9BcHBseUdyYXZpdGF0aW9uVG8gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBub2RlTGlzdCA9IFtdO1xuICB2YXIgZ3JhcGg7XG5cbiAgdmFyIGdyYXBocyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEdyYXBocygpO1xuICB2YXIgc2l6ZSA9IGdyYXBocy5sZW5ndGg7XG4gIHZhciBpO1xuICBmb3IgKGkgPSAwOyBpIDwgc2l6ZTsgaSsrKVxuICB7XG4gICAgZ3JhcGggPSBncmFwaHNbaV07XG5cbiAgICBncmFwaC51cGRhdGVDb25uZWN0ZWQoKTtcblxuICAgIGlmICghZ3JhcGguaXNDb25uZWN0ZWQpXG4gICAge1xuICAgICAgbm9kZUxpc3QgPSBub2RlTGlzdC5jb25jYXQoZ3JhcGguZ2V0Tm9kZXMoKSk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy5ncmFwaE1hbmFnZXIuc2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24obm9kZUxpc3QpO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuY2FsY05vT2ZDaGlsZHJlbkZvckFsbE5vZGVzID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIG5vZGU7XG4gIHZhciBhbGxOb2RlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzKCk7XG4gIFxuICBmb3IodmFyIGkgPSAwOyBpIDwgYWxsTm9kZXMubGVuZ3RoOyBpKyspXG4gIHtcbiAgICAgIG5vZGUgPSBhbGxOb2Rlc1tpXTtcbiAgICAgIG5vZGUubm9PZkNoaWxkcmVuID0gbm9kZS5nZXROb09mQ2hpbGRyZW4oKTtcbiAgfVxufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuY3JlYXRlQmVuZHBvaW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGVkZ2VzID0gW107XG4gIGVkZ2VzID0gZWRnZXMuY29uY2F0KHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbEVkZ2VzKCkpO1xuICB2YXIgdmlzaXRlZCA9IG5ldyBIYXNoU2V0KCk7XG4gIHZhciBpO1xuICBmb3IgKGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspXG4gIHtcbiAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xuXG4gICAgaWYgKCF2aXNpdGVkLmNvbnRhaW5zKGVkZ2UpKVxuICAgIHtcbiAgICAgIHZhciBzb3VyY2UgPSBlZGdlLmdldFNvdXJjZSgpO1xuICAgICAgdmFyIHRhcmdldCA9IGVkZ2UuZ2V0VGFyZ2V0KCk7XG5cbiAgICAgIGlmIChzb3VyY2UgPT0gdGFyZ2V0KVxuICAgICAge1xuICAgICAgICBlZGdlLmdldEJlbmRwb2ludHMoKS5wdXNoKG5ldyBQb2ludEQoKSk7XG4gICAgICAgIGVkZ2UuZ2V0QmVuZHBvaW50cygpLnB1c2gobmV3IFBvaW50RCgpKTtcbiAgICAgICAgdGhpcy5jcmVhdGVEdW1teU5vZGVzRm9yQmVuZHBvaW50cyhlZGdlKTtcbiAgICAgICAgdmlzaXRlZC5hZGQoZWRnZSk7XG4gICAgICB9XG4gICAgICBlbHNlXG4gICAgICB7XG4gICAgICAgIHZhciBlZGdlTGlzdCA9IFtdO1xuXG4gICAgICAgIGVkZ2VMaXN0ID0gZWRnZUxpc3QuY29uY2F0KHNvdXJjZS5nZXRFZGdlTGlzdFRvTm9kZSh0YXJnZXQpKTtcbiAgICAgICAgZWRnZUxpc3QgPSBlZGdlTGlzdC5jb25jYXQodGFyZ2V0LmdldEVkZ2VMaXN0VG9Ob2RlKHNvdXJjZSkpO1xuXG4gICAgICAgIGlmICghdmlzaXRlZC5jb250YWlucyhlZGdlTGlzdFswXSkpXG4gICAgICAgIHtcbiAgICAgICAgICBpZiAoZWRnZUxpc3QubGVuZ3RoID4gMSlcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2YXIgaztcbiAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCBlZGdlTGlzdC5sZW5ndGg7IGsrKylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdmFyIG11bHRpRWRnZSA9IGVkZ2VMaXN0W2tdO1xuICAgICAgICAgICAgICBtdWx0aUVkZ2UuZ2V0QmVuZHBvaW50cygpLnB1c2gobmV3IFBvaW50RCgpKTtcbiAgICAgICAgICAgICAgdGhpcy5jcmVhdGVEdW1teU5vZGVzRm9yQmVuZHBvaW50cyhtdWx0aUVkZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2aXNpdGVkLmFkZEFsbChsaXN0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh2aXNpdGVkLnNpemUoKSA9PSBlZGdlcy5sZW5ndGgpXG4gICAge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5wb3NpdGlvbk5vZGVzUmFkaWFsbHkgPSBmdW5jdGlvbiAoZm9yZXN0KSB7XG4gIC8vIFdlIHRpbGUgdGhlIHRyZWVzIHRvIGEgZ3JpZCByb3cgYnkgcm93OyBmaXJzdCB0cmVlIHN0YXJ0cyBhdCAoMCwwKVxuICB2YXIgY3VycmVudFN0YXJ0aW5nUG9pbnQgPSBuZXcgUG9pbnQoMCwgMCk7XG4gIHZhciBudW1iZXJPZkNvbHVtbnMgPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KGZvcmVzdC5sZW5ndGgpKTtcbiAgdmFyIGhlaWdodCA9IDA7XG4gIHZhciBjdXJyZW50WSA9IDA7XG4gIHZhciBjdXJyZW50WCA9IDA7XG4gIHZhciBwb2ludCA9IG5ldyBQb2ludEQoMCwgMCk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmb3Jlc3QubGVuZ3RoOyBpKyspXG4gIHtcbiAgICBpZiAoaSAlIG51bWJlck9mQ29sdW1ucyA9PSAwKVxuICAgIHtcbiAgICAgIC8vIFN0YXJ0IG9mIGEgbmV3IHJvdywgbWFrZSB0aGUgeCBjb29yZGluYXRlIDAsIGluY3JlbWVudCB0aGVcbiAgICAgIC8vIHkgY29vcmRpbmF0ZSB3aXRoIHRoZSBtYXggaGVpZ2h0IG9mIHRoZSBwcmV2aW91cyByb3dcbiAgICAgIGN1cnJlbnRYID0gMDtcbiAgICAgIGN1cnJlbnRZID0gaGVpZ2h0O1xuXG4gICAgICBpZiAoaSAhPSAwKVxuICAgICAge1xuICAgICAgICBjdXJyZW50WSArPSBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfQ09NUE9ORU5UX1NFUEVSQVRJT047XG4gICAgICB9XG5cbiAgICAgIGhlaWdodCA9IDA7XG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSBmb3Jlc3RbaV07XG5cbiAgICAvLyBGaW5kIHRoZSBjZW50ZXIgb2YgdGhlIHRyZWVcbiAgICB2YXIgY2VudGVyTm9kZSA9IExheW91dC5maW5kQ2VudGVyT2ZUcmVlKHRyZWUpO1xuXG4gICAgLy8gU2V0IHRoZSBzdGFyaW5nIHBvaW50IG9mIHRoZSBuZXh0IHRyZWVcbiAgICBjdXJyZW50U3RhcnRpbmdQb2ludC54ID0gY3VycmVudFg7XG4gICAgY3VycmVudFN0YXJ0aW5nUG9pbnQueSA9IGN1cnJlbnRZO1xuXG4gICAgLy8gRG8gYSByYWRpYWwgbGF5b3V0IHN0YXJ0aW5nIHdpdGggdGhlIGNlbnRlclxuICAgIHBvaW50ID1cbiAgICAgICAgICAgIENvU0VMYXlvdXQucmFkaWFsTGF5b3V0KHRyZWUsIGNlbnRlck5vZGUsIGN1cnJlbnRTdGFydGluZ1BvaW50KTtcblxuICAgIGlmIChwb2ludC55ID4gaGVpZ2h0KVxuICAgIHtcbiAgICAgIGhlaWdodCA9IE1hdGguZmxvb3IocG9pbnQueSk7XG4gICAgfVxuXG4gICAgY3VycmVudFggPSBNYXRoLmZsb29yKHBvaW50LnggKyBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfQ09NUE9ORU5UX1NFUEVSQVRJT04pO1xuICB9XG5cbiAgdGhpcy50cmFuc2Zvcm0oXG4gICAgICAgICAgbmV3IFBvaW50RChMYXlvdXRDb25zdGFudHMuV09STERfQ0VOVEVSX1ggLSBwb2ludC54IC8gMixcbiAgICAgICAgICAgICAgICAgIExheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWSAtIHBvaW50LnkgLyAyKSk7XG59O1xuXG5Db1NFTGF5b3V0LnJhZGlhbExheW91dCA9IGZ1bmN0aW9uICh0cmVlLCBjZW50ZXJOb2RlLCBzdGFydGluZ1BvaW50KSB7XG4gIHZhciByYWRpYWxTZXAgPSBNYXRoLm1heCh0aGlzLm1heERpYWdvbmFsSW5UcmVlKHRyZWUpLFxuICAgICAgICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9SQURJQUxfU0VQQVJBVElPTik7XG4gIENvU0VMYXlvdXQuYnJhbmNoUmFkaWFsTGF5b3V0KGNlbnRlck5vZGUsIG51bGwsIDAsIDM1OSwgMCwgcmFkaWFsU2VwKTtcbiAgdmFyIGJvdW5kcyA9IExHcmFwaC5jYWxjdWxhdGVCb3VuZHModHJlZSk7XG5cbiAgdmFyIHRyYW5zZm9ybSA9IG5ldyBUcmFuc2Zvcm0oKTtcbiAgdHJhbnNmb3JtLnNldERldmljZU9yZ1goYm91bmRzLmdldE1pblgoKSk7XG4gIHRyYW5zZm9ybS5zZXREZXZpY2VPcmdZKGJvdW5kcy5nZXRNaW5ZKCkpO1xuICB0cmFuc2Zvcm0uc2V0V29ybGRPcmdYKHN0YXJ0aW5nUG9pbnQueCk7XG4gIHRyYW5zZm9ybS5zZXRXb3JsZE9yZ1koc3RhcnRpbmdQb2ludC55KTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRyZWUubGVuZ3RoOyBpKyspXG4gIHtcbiAgICB2YXIgbm9kZSA9IHRyZWVbaV07XG4gICAgbm9kZS50cmFuc2Zvcm0odHJhbnNmb3JtKTtcbiAgfVxuXG4gIHZhciBib3R0b21SaWdodCA9XG4gICAgICAgICAgbmV3IFBvaW50RChib3VuZHMuZ2V0TWF4WCgpLCBib3VuZHMuZ2V0TWF4WSgpKTtcblxuICByZXR1cm4gdHJhbnNmb3JtLmludmVyc2VUcmFuc2Zvcm1Qb2ludChib3R0b21SaWdodCk7XG59O1xuXG5Db1NFTGF5b3V0LmJyYW5jaFJhZGlhbExheW91dCA9IGZ1bmN0aW9uIChub2RlLCBwYXJlbnRPZk5vZGUsIHN0YXJ0QW5nbGUsIGVuZEFuZ2xlLCBkaXN0YW5jZSwgcmFkaWFsU2VwYXJhdGlvbikge1xuICAvLyBGaXJzdCwgcG9zaXRpb24gdGhpcyBub2RlIGJ5IGZpbmRpbmcgaXRzIGFuZ2xlLlxuICB2YXIgaGFsZkludGVydmFsID0gKChlbmRBbmdsZSAtIHN0YXJ0QW5nbGUpICsgMSkgLyAyO1xuXG4gIGlmIChoYWxmSW50ZXJ2YWwgPCAwKVxuICB7XG4gICAgaGFsZkludGVydmFsICs9IDE4MDtcbiAgfVxuXG4gIHZhciBub2RlQW5nbGUgPSAoaGFsZkludGVydmFsICsgc3RhcnRBbmdsZSkgJSAzNjA7XG4gIHZhciB0ZXRhID0gKG5vZGVBbmdsZSAqIElHZW9tZXRyeS5UV09fUEkpIC8gMzYwO1xuXG4gIC8vIE1ha2UgcG9sYXIgdG8gamF2YSBjb3JkaW5hdGUgY29udmVyc2lvbi5cbiAgdmFyIGNvc190ZXRhID0gTWF0aC5jb3ModGV0YSk7XG4gIHZhciB4XyA9IGRpc3RhbmNlICogTWF0aC5jb3ModGV0YSk7XG4gIHZhciB5XyA9IGRpc3RhbmNlICogTWF0aC5zaW4odGV0YSk7XG5cbiAgbm9kZS5zZXRDZW50ZXIoeF8sIHlfKTtcblxuICAvLyBUcmF2ZXJzZSBhbGwgbmVpZ2hib3JzIG9mIHRoaXMgbm9kZSBhbmQgcmVjdXJzaXZlbHkgY2FsbCB0aGlzXG4gIC8vIGZ1bmN0aW9uLlxuICB2YXIgbmVpZ2hib3JFZGdlcyA9IFtdO1xuICBuZWlnaGJvckVkZ2VzID0gbmVpZ2hib3JFZGdlcy5jb25jYXQobm9kZS5nZXRFZGdlcygpKTtcbiAgdmFyIGNoaWxkQ291bnQgPSBuZWlnaGJvckVkZ2VzLmxlbmd0aDtcblxuICBpZiAocGFyZW50T2ZOb2RlICE9IG51bGwpXG4gIHtcbiAgICBjaGlsZENvdW50LS07XG4gIH1cblxuICB2YXIgYnJhbmNoQ291bnQgPSAwO1xuXG4gIHZhciBpbmNFZGdlc0NvdW50ID0gbmVpZ2hib3JFZGdlcy5sZW5ndGg7XG4gIHZhciBzdGFydEluZGV4O1xuXG4gIHZhciBlZGdlcyA9IG5vZGUuZ2V0RWRnZXNCZXR3ZWVuKHBhcmVudE9mTm9kZSk7XG5cbiAgLy8gSWYgdGhlcmUgYXJlIG11bHRpcGxlIGVkZ2VzLCBwcnVuZSB0aGVtIHVudGlsIHRoZXJlIHJlbWFpbnMgb25seSBvbmVcbiAgLy8gZWRnZS5cbiAgd2hpbGUgKGVkZ2VzLmxlbmd0aCA+IDEpXG4gIHtcbiAgICAvL25laWdoYm9yRWRnZXMucmVtb3ZlKGVkZ2VzLnJlbW92ZSgwKSk7XG4gICAgdmFyIHRlbXAgPSBlZGdlc1swXTtcbiAgICBlZGdlcy5zcGxpY2UoMCwgMSk7XG4gICAgdmFyIGluZGV4ID0gbmVpZ2hib3JFZGdlcy5pbmRleE9mKHRlbXApO1xuICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICBuZWlnaGJvckVkZ2VzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICAgIGluY0VkZ2VzQ291bnQtLTtcbiAgICBjaGlsZENvdW50LS07XG4gIH1cblxuICBpZiAocGFyZW50T2ZOb2RlICE9IG51bGwpXG4gIHtcbiAgICAvL2Fzc2VydCBlZGdlcy5sZW5ndGggPT0gMTtcbiAgICBzdGFydEluZGV4ID0gKG5laWdoYm9yRWRnZXMuaW5kZXhPZihlZGdlc1swXSkgKyAxKSAlIGluY0VkZ2VzQ291bnQ7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgc3RhcnRJbmRleCA9IDA7XG4gIH1cblxuICB2YXIgc3RlcEFuZ2xlID0gTWF0aC5hYnMoZW5kQW5nbGUgLSBzdGFydEFuZ2xlKSAvIGNoaWxkQ291bnQ7XG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0SW5kZXg7XG4gICAgICAgICAgYnJhbmNoQ291bnQgIT0gY2hpbGRDb3VudDtcbiAgICAgICAgICBpID0gKCsraSkgJSBpbmNFZGdlc0NvdW50KVxuICB7XG4gICAgdmFyIGN1cnJlbnROZWlnaGJvciA9XG4gICAgICAgICAgICBuZWlnaGJvckVkZ2VzW2ldLmdldE90aGVyRW5kKG5vZGUpO1xuXG4gICAgLy8gRG9uJ3QgYmFjayB0cmF2ZXJzZSB0byByb290IG5vZGUgaW4gY3VycmVudCB0cmVlLlxuICAgIGlmIChjdXJyZW50TmVpZ2hib3IgPT0gcGFyZW50T2ZOb2RlKVxuICAgIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciBjaGlsZFN0YXJ0QW5nbGUgPVxuICAgICAgICAgICAgKHN0YXJ0QW5nbGUgKyBicmFuY2hDb3VudCAqIHN0ZXBBbmdsZSkgJSAzNjA7XG4gICAgdmFyIGNoaWxkRW5kQW5nbGUgPSAoY2hpbGRTdGFydEFuZ2xlICsgc3RlcEFuZ2xlKSAlIDM2MDtcblxuICAgIENvU0VMYXlvdXQuYnJhbmNoUmFkaWFsTGF5b3V0KGN1cnJlbnROZWlnaGJvcixcbiAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICBjaGlsZFN0YXJ0QW5nbGUsIGNoaWxkRW5kQW5nbGUsXG4gICAgICAgICAgICBkaXN0YW5jZSArIHJhZGlhbFNlcGFyYXRpb24sIHJhZGlhbFNlcGFyYXRpb24pO1xuXG4gICAgYnJhbmNoQ291bnQrKztcbiAgfVxufTtcblxuQ29TRUxheW91dC5tYXhEaWFnb25hbEluVHJlZSA9IGZ1bmN0aW9uICh0cmVlKSB7XG4gIHZhciBtYXhEaWFnb25hbCA9IEludGVnZXIuTUlOX1ZBTFVFO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZS5sZW5ndGg7IGkrKylcbiAge1xuICAgIHZhciBub2RlID0gdHJlZVtpXTtcbiAgICB2YXIgZGlhZ29uYWwgPSBub2RlLmdldERpYWdvbmFsKCk7XG5cbiAgICBpZiAoZGlhZ29uYWwgPiBtYXhEaWFnb25hbClcbiAgICB7XG4gICAgICBtYXhEaWFnb25hbCA9IGRpYWdvbmFsO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtYXhEaWFnb25hbDtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25SYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gZm9ybXVsYSBpcyAyIHggKGxldmVsICsgMSkgeCBpZGVhbEVkZ2VMZW5ndGhcbiAgcmV0dXJuICgyICogKHRoaXMubGV2ZWwgKyAxKSAqIHRoaXMuaWRlYWxFZGdlTGVuZ3RoKTtcbn07XG5cbi8vIFRpbGluZyBtZXRob2RzXG5cbi8vIEdyb3VwIHplcm8gZGVncmVlIG1lbWJlcnMgd2hvc2UgcGFyZW50cyBhcmUgbm90IHRvIGJlIHRpbGVkLCBjcmVhdGUgZHVtbXkgcGFyZW50cyB3aGVyZSBuZWVkZWQgYW5kIGZpbGwgbWVtYmVyR3JvdXBzIGJ5IHRoZWlyIGR1bW1wIHBhcmVudCBpZCdzXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5ncm91cFplcm9EZWdyZWVNZW1iZXJzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vIGFycmF5IG9mIFtwYXJlbnRfaWQgeCBvbmVEZWdyZWVOb2RlX2lkXVxuICB2YXIgdGVtcE1lbWJlckdyb3VwcyA9IHt9OyAvLyBBIHRlbXBvcmFyeSBtYXAgb2YgcGFyZW50IG5vZGUgYW5kIGl0cyB6ZXJvIGRlZ3JlZSBtZW1iZXJzXG4gIHRoaXMubWVtYmVyR3JvdXBzID0ge307IC8vIEEgbWFwIG9mIGR1bW15IHBhcmVudCBub2RlIGFuZCBpdHMgemVybyBkZWdyZWUgbWVtYmVycyB3aG9zZSBwYXJlbnRzIGFyZSBub3QgdG8gYmUgdGlsZWRcbiAgdGhpcy5pZFRvRHVtbXlOb2RlID0ge307IC8vIEEgbWFwIG9mIGlkIHRvIGR1bW15IG5vZGUgXG4gIFxuICB2YXIgemVyb0RlZ3JlZSA9IFtdOyAvLyBMaXN0IG9mIHplcm8gZGVncmVlIG5vZGVzIHdob3NlIHBhcmVudHMgYXJlIG5vdCB0byBiZSB0aWxlZFxuICB2YXIgYWxsTm9kZXMgPSB0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxOb2RlcygpO1xuXG4gIC8vIEZpbGwgemVybyBkZWdyZWUgbGlzdFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG5vZGUgPSBhbGxOb2Rlc1tpXTtcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5nZXRQYXJlbnQoKTtcbiAgICAvLyBJZiBhIG5vZGUgaGFzIHplcm8gZGVncmVlIGFuZCBpdHMgcGFyZW50IGlzIG5vdCB0byBiZSB0aWxlZCBpZiBleGlzdHMgYWRkIHRoYXQgbm9kZSB0byB6ZXJvRGVncmVzIGxpc3RcbiAgICBpZiAodGhpcy5nZXROb2RlRGVncmVlV2l0aENoaWxkcmVuKG5vZGUpID09PSAwICYmICggcGFyZW50LmlkID09IHVuZGVmaW5lZCB8fCAhdGhpcy5nZXRUb0JlVGlsZWQocGFyZW50KSApICkge1xuICAgICAgemVyb0RlZ3JlZS5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIENyZWF0ZSBhIG1hcCBvZiBwYXJlbnQgbm9kZSBhbmQgaXRzIHplcm8gZGVncmVlIG1lbWJlcnNcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB6ZXJvRGVncmVlLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgdmFyIG5vZGUgPSB6ZXJvRGVncmVlW2ldOyAvLyBaZXJvIGRlZ3JlZSBub2RlIGl0c2VsZlxuICAgIHZhciBwX2lkID0gbm9kZS5nZXRQYXJlbnQoKS5pZDsgLy8gUGFyZW50IGlkXG5cbiAgICBpZiAodHlwZW9mIHRlbXBNZW1iZXJHcm91cHNbcF9pZF0gPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdID0gW107XG5cbiAgICB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXS5jb25jYXQobm9kZSk7IC8vIFB1c2ggbm9kZSB0byB0aGUgbGlzdCBiZWxvbmdzIHRvIGl0cyBwYXJlbnQgaW4gdGVtcE1lbWJlckdyb3Vwc1xuICB9XG5cbiAgLy8gSWYgdGhlcmUgYXJlIGF0IGxlYXN0IHR3byBub2RlcyBhdCBhIGxldmVsLCBjcmVhdGUgYSBkdW1teSBjb21wb3VuZCBmb3IgdGhlbVxuICBPYmplY3Qua2V5cyh0ZW1wTWVtYmVyR3JvdXBzKS5mb3JFYWNoKGZ1bmN0aW9uKHBfaWQpIHtcbiAgICBpZiAodGVtcE1lbWJlckdyb3Vwc1twX2lkXS5sZW5ndGggPiAxKSB7XG4gICAgICB2YXIgZHVtbXlDb21wb3VuZElkID0gXCJEdW1teUNvbXBvdW5kX1wiICsgcF9pZDsgLy8gVGhlIGlkIG9mIGR1bW15IGNvbXBvdW5kIHdoaWNoIHdpbGwgYmUgY3JlYXRlZCBzb29uXG4gICAgICBzZWxmLm1lbWJlckdyb3Vwc1tkdW1teUNvbXBvdW5kSWRdID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXTsgLy8gQWRkIGR1bW15IGNvbXBvdW5kIHRvIG1lbWJlckdyb3Vwc1xuXG4gICAgICB2YXIgcGFyZW50ID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXVswXS5nZXRQYXJlbnQoKTsgLy8gVGhlIHBhcmVudCBvZiB6ZXJvIGRlZ3JlZSBub2RlcyB3aWxsIGJlIHRoZSBwYXJlbnQgb2YgbmV3IGR1bW15IGNvbXBvdW5kXG5cbiAgICAgIC8vIENyZWF0ZSBhIGR1bW15IGNvbXBvdW5kIHdpdGggY2FsY3VsYXRlZCBpZFxuICAgICAgdmFyIGR1bW15Q29tcG91bmQgPSBuZXcgQ29TRU5vZGUoc2VsZi5ncmFwaE1hbmFnZXIpO1xuICAgICAgZHVtbXlDb21wb3VuZC5pZCA9IGR1bW15Q29tcG91bmRJZDtcbiAgICAgIGR1bW15Q29tcG91bmQucGFkZGluZ0xlZnQgPSBwYXJlbnQucGFkZGluZ0xlZnQgfHwgMDtcbiAgICAgIGR1bW15Q29tcG91bmQucGFkZGluZ1JpZ2h0ID0gcGFyZW50LnBhZGRpbmdSaWdodCB8fCAwO1xuICAgICAgZHVtbXlDb21wb3VuZC5wYWRkaW5nQm90dG9tID0gcGFyZW50LnBhZGRpbmdCb3R0b20gfHwgMDtcbiAgICAgIGR1bW15Q29tcG91bmQucGFkZGluZ1RvcCA9IHBhcmVudC5wYWRkaW5nVG9wIHx8IDA7XG4gICAgICBcbiAgICAgIHNlbGYuaWRUb0R1bW15Tm9kZVtkdW1teUNvbXBvdW5kSWRdID0gZHVtbXlDb21wb3VuZDtcbiAgICAgIFxuICAgICAgdmFyIGR1bW15UGFyZW50R3JhcGggPSBzZWxmLmdldEdyYXBoTWFuYWdlcigpLmFkZChzZWxmLm5ld0dyYXBoKCksIGR1bW15Q29tcG91bmQpO1xuICAgICAgdmFyIHBhcmVudEdyYXBoID0gcGFyZW50LmdldENoaWxkKCk7XG5cbiAgICAgIC8vIEFkZCBkdW1teSBjb21wb3VuZCB0byBwYXJlbnQgdGhlIGdyYXBoXG4gICAgICBwYXJlbnRHcmFwaC5hZGQoZHVtbXlDb21wb3VuZCk7XG5cbiAgICAgIC8vIEZvciBlYWNoIHplcm8gZGVncmVlIG5vZGUgaW4gdGhpcyBsZXZlbCByZW1vdmUgaXQgZnJvbSBpdHMgcGFyZW50IGdyYXBoIGFuZCBhZGQgaXQgdG8gdGhlIGdyYXBoIG9mIGR1bW15IHBhcmVudFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBub2RlID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXVtpXTtcbiAgICAgICAgXG4gICAgICAgIHBhcmVudEdyYXBoLnJlbW92ZShub2RlKTtcbiAgICAgICAgZHVtbXlQYXJlbnRHcmFwaC5hZGQobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmNsZWFyQ29tcG91bmRzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgY2hpbGRHcmFwaE1hcCA9IHt9O1xuICB2YXIgaWRUb05vZGUgPSB7fTtcblxuICAvLyBHZXQgY29tcG91bmQgb3JkZXJpbmcgYnkgZmluZGluZyB0aGUgaW5uZXIgb25lIGZpcnN0XG4gIHRoaXMucGVyZm9ybURGU09uQ29tcG91bmRzKCk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvbXBvdW5kT3JkZXIubGVuZ3RoOyBpKyspIHtcbiAgICBcbiAgICBpZFRvTm9kZVt0aGlzLmNvbXBvdW5kT3JkZXJbaV0uaWRdID0gdGhpcy5jb21wb3VuZE9yZGVyW2ldO1xuICAgIGNoaWxkR3JhcGhNYXBbdGhpcy5jb21wb3VuZE9yZGVyW2ldLmlkXSA9IFtdLmNvbmNhdCh0aGlzLmNvbXBvdW5kT3JkZXJbaV0uZ2V0Q2hpbGQoKS5nZXROb2RlcygpKTtcblxuICAgIC8vIFJlbW92ZSBjaGlsZHJlbiBvZiBjb21wb3VuZHNcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUodGhpcy5jb21wb3VuZE9yZGVyW2ldLmdldENoaWxkKCkpO1xuICAgIHRoaXMuY29tcG91bmRPcmRlcltpXS5jaGlsZCA9IG51bGw7XG4gIH1cbiAgXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLnJlc2V0QWxsTm9kZXMoKTtcbiAgXG4gIC8vIFRpbGUgdGhlIHJlbW92ZWQgY2hpbGRyZW5cbiAgdGhpcy50aWxlQ29tcG91bmRNZW1iZXJzKGNoaWxkR3JhcGhNYXAsIGlkVG9Ob2RlKTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmNsZWFyWmVyb0RlZ3JlZU1lbWJlcnMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHRpbGVkWmVyb0RlZ3JlZVBhY2sgPSB0aGlzLnRpbGVkWmVyb0RlZ3JlZVBhY2sgPSBbXTtcblxuICBPYmplY3Qua2V5cyh0aGlzLm1lbWJlckdyb3VwcykuZm9yRWFjaChmdW5jdGlvbihpZCkge1xuICAgIHZhciBjb21wb3VuZE5vZGUgPSBzZWxmLmlkVG9EdW1teU5vZGVbaWRdOyAvLyBHZXQgdGhlIGR1bW15IGNvbXBvdW5kXG5cbiAgICB0aWxlZFplcm9EZWdyZWVQYWNrW2lkXSA9IHNlbGYudGlsZU5vZGVzKHNlbGYubWVtYmVyR3JvdXBzW2lkXSwgY29tcG91bmROb2RlLnBhZGRpbmdMZWZ0ICsgY29tcG91bmROb2RlLnBhZGRpbmdSaWdodCk7XG5cbiAgICAvLyBTZXQgdGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgdGhlIGR1bW15IGNvbXBvdW5kIGFzIGNhbGN1bGF0ZWRcbiAgICBjb21wb3VuZE5vZGUucmVjdC53aWR0aCA9IHRpbGVkWmVyb0RlZ3JlZVBhY2tbaWRdLndpZHRoO1xuICAgIGNvbXBvdW5kTm9kZS5yZWN0LmhlaWdodCA9IHRpbGVkWmVyb0RlZ3JlZVBhY2tbaWRdLmhlaWdodDtcbiAgfSk7XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5yZXBvcHVsYXRlQ29tcG91bmRzID0gZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBpID0gdGhpcy5jb21wb3VuZE9yZGVyLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxDb21wb3VuZE5vZGUgPSB0aGlzLmNvbXBvdW5kT3JkZXJbaV07XG4gICAgdmFyIGlkID0gbENvbXBvdW5kTm9kZS5pZDtcbiAgICB2YXIgaG9yaXpvbnRhbE1hcmdpbiA9IGxDb21wb3VuZE5vZGUucGFkZGluZ0xlZnQ7XG4gICAgdmFyIHZlcnRpY2FsTWFyZ2luID0gbENvbXBvdW5kTm9kZS5wYWRkaW5nVG9wO1xuXG4gICAgdGhpcy5hZGp1c3RMb2NhdGlvbnModGhpcy50aWxlZE1lbWJlclBhY2tbaWRdLCBsQ29tcG91bmROb2RlLnJlY3QueCwgbENvbXBvdW5kTm9kZS5yZWN0LnksIGhvcml6b250YWxNYXJnaW4sIHZlcnRpY2FsTWFyZ2luKTtcbiAgfVxufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUucmVwb3B1bGF0ZVplcm9EZWdyZWVNZW1iZXJzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB0aWxlZFBhY2sgPSB0aGlzLnRpbGVkWmVyb0RlZ3JlZVBhY2s7XG4gIFxuICBPYmplY3Qua2V5cyh0aWxlZFBhY2spLmZvckVhY2goZnVuY3Rpb24oaWQpIHtcbiAgICB2YXIgY29tcG91bmROb2RlID0gc2VsZi5pZFRvRHVtbXlOb2RlW2lkXTsgLy8gR2V0IHRoZSBkdW1teSBjb21wb3VuZCBieSBpdHMgaWRcbiAgICB2YXIgaG9yaXpvbnRhbE1hcmdpbiA9IGNvbXBvdW5kTm9kZS5wYWRkaW5nTGVmdDtcbiAgICB2YXIgdmVydGljYWxNYXJnaW4gPSBjb21wb3VuZE5vZGUucGFkZGluZ1RvcDtcblxuICAgIC8vIEFkanVzdCB0aGUgcG9zaXRpb25zIG9mIG5vZGVzIHdydCBpdHMgY29tcG91bmRcbiAgICBzZWxmLmFkanVzdExvY2F0aW9ucyh0aWxlZFBhY2tbaWRdLCBjb21wb3VuZE5vZGUucmVjdC54LCBjb21wb3VuZE5vZGUucmVjdC55LCBob3Jpem9udGFsTWFyZ2luLCB2ZXJ0aWNhbE1hcmdpbik7XG4gIH0pO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuZ2V0VG9CZVRpbGVkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdmFyIGlkID0gbm9kZS5pZDtcbiAgLy9maXJzdGx5IGNoZWNrIHRoZSBwcmV2aW91cyByZXN1bHRzXG4gIGlmICh0aGlzLnRvQmVUaWxlZFtpZF0gIT0gbnVsbCkge1xuICAgIHJldHVybiB0aGlzLnRvQmVUaWxlZFtpZF07XG4gIH1cblxuICAvL29ubHkgY29tcG91bmQgbm9kZXMgYXJlIHRvIGJlIHRpbGVkXG4gIHZhciBjaGlsZEdyYXBoID0gbm9kZS5nZXRDaGlsZCgpO1xuICBpZiAoY2hpbGRHcmFwaCA9PSBudWxsKSB7XG4gICAgdGhpcy50b0JlVGlsZWRbaWRdID0gZmFsc2U7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdmFyIGNoaWxkcmVuID0gY2hpbGRHcmFwaC5nZXROb2RlcygpOyAvLyBHZXQgdGhlIGNoaWxkcmVuIG5vZGVzXG5cbiAgLy9hIGNvbXBvdW5kIG5vZGUgaXMgbm90IHRvIGJlIHRpbGVkIGlmIGFsbCBvZiBpdHMgY29tcG91bmQgY2hpbGRyZW4gYXJlIG5vdCB0byBiZSB0aWxlZFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHRoZUNoaWxkID0gY2hpbGRyZW5baV07XG5cbiAgICBpZiAodGhpcy5nZXROb2RlRGVncmVlKHRoZUNoaWxkKSA+IDApIHtcbiAgICAgIHRoaXMudG9CZVRpbGVkW2lkXSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vcGFzcyB0aGUgY2hpbGRyZW4gbm90IGhhdmluZyB0aGUgY29tcG91bmQgc3RydWN0dXJlXG4gICAgaWYgKHRoZUNoaWxkLmdldENoaWxkKCkgPT0gbnVsbCkge1xuICAgICAgdGhpcy50b0JlVGlsZWRbdGhlQ2hpbGQuaWRdID0gZmFsc2U7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZ2V0VG9CZVRpbGVkKHRoZUNoaWxkKSkge1xuICAgICAgdGhpcy50b0JlVGlsZWRbaWRdID0gZmFsc2U7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHRoaXMudG9CZVRpbGVkW2lkXSA9IHRydWU7XG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gR2V0IGRlZ3JlZSBvZiBhIG5vZGUgZGVwZW5kaW5nIG9mIGl0cyBlZGdlcyBhbmQgaW5kZXBlbmRlbnQgb2YgaXRzIGNoaWxkcmVuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXROb2RlRGVncmVlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdmFyIGlkID0gbm9kZS5pZDtcbiAgdmFyIGVkZ2VzID0gbm9kZS5nZXRFZGdlcygpO1xuICB2YXIgZGVncmVlID0gMDtcbiAgXG4gIC8vIEZvciB0aGUgZWRnZXMgY29ubmVjdGVkXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xuICAgIGlmIChlZGdlLmdldFNvdXJjZSgpLmlkICE9PSBlZGdlLmdldFRhcmdldCgpLmlkKSB7XG4gICAgICBkZWdyZWUgPSBkZWdyZWUgKyAxO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVncmVlO1xufTtcblxuLy8gR2V0IGRlZ3JlZSBvZiBhIG5vZGUgd2l0aCBpdHMgY2hpbGRyZW5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmdldE5vZGVEZWdyZWVXaXRoQ2hpbGRyZW4gPSBmdW5jdGlvbiAobm9kZSkge1xuICB2YXIgZGVncmVlID0gdGhpcy5nZXROb2RlRGVncmVlKG5vZGUpO1xuICBpZiAobm9kZS5nZXRDaGlsZCgpID09IG51bGwpIHtcbiAgICByZXR1cm4gZGVncmVlO1xuICB9XG4gIHZhciBjaGlsZHJlbiA9IG5vZGUuZ2V0Q2hpbGQoKS5nZXROb2RlcygpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XG4gICAgZGVncmVlICs9IHRoaXMuZ2V0Tm9kZURlZ3JlZVdpdGhDaGlsZHJlbihjaGlsZCk7XG4gIH1cbiAgcmV0dXJuIGRlZ3JlZTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLnBlcmZvcm1ERlNPbkNvbXBvdW5kcyA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5jb21wb3VuZE9yZGVyID0gW107XG4gIHRoaXMuZmlsbENvbXBleE9yZGVyQnlERlModGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmdldE5vZGVzKCkpO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuZmlsbENvbXBleE9yZGVyQnlERlMgPSBmdW5jdGlvbiAoY2hpbGRyZW4pIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xuICAgIGlmIChjaGlsZC5nZXRDaGlsZCgpICE9IG51bGwpIHtcbiAgICAgIHRoaXMuZmlsbENvbXBleE9yZGVyQnlERlMoY2hpbGQuZ2V0Q2hpbGQoKS5nZXROb2RlcygpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZ2V0VG9CZVRpbGVkKGNoaWxkKSkge1xuICAgICAgdGhpcy5jb21wb3VuZE9yZGVyLnB1c2goY2hpbGQpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4qIFRoaXMgbWV0aG9kIHBsYWNlcyBlYWNoIHplcm8gZGVncmVlIG1lbWJlciB3cnQgZ2l2ZW4gKHgseSkgY29vcmRpbmF0ZXMgKHRvcCBsZWZ0KS5cbiovXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5hZGp1c3RMb2NhdGlvbnMgPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uLCB4LCB5LCBjb21wb3VuZEhvcml6b250YWxNYXJnaW4sIGNvbXBvdW5kVmVydGljYWxNYXJnaW4pIHtcbiAgeCArPSBjb21wb3VuZEhvcml6b250YWxNYXJnaW47XG4gIHkgKz0gY29tcG91bmRWZXJ0aWNhbE1hcmdpbjtcblxuICB2YXIgbGVmdCA9IHg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcmdhbml6YXRpb24ucm93cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciByb3cgPSBvcmdhbml6YXRpb24ucm93c1tpXTtcbiAgICB4ID0gbGVmdDtcbiAgICB2YXIgbWF4SGVpZ2h0ID0gMDtcblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgcm93Lmxlbmd0aDsgaisrKSB7XG4gICAgICB2YXIgbG5vZGUgPSByb3dbal07XG5cbiAgICAgIGxub2RlLnJlY3QueCA9IHg7Ly8gKyBsbm9kZS5yZWN0LndpZHRoIC8gMjtcbiAgICAgIGxub2RlLnJlY3QueSA9IHk7Ly8gKyBsbm9kZS5yZWN0LmhlaWdodCAvIDI7XG5cbiAgICAgIHggKz0gbG5vZGUucmVjdC53aWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZztcblxuICAgICAgaWYgKGxub2RlLnJlY3QuaGVpZ2h0ID4gbWF4SGVpZ2h0KVxuICAgICAgICBtYXhIZWlnaHQgPSBsbm9kZS5yZWN0LmhlaWdodDtcbiAgICB9XG5cbiAgICB5ICs9IG1heEhlaWdodCArIG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XG4gIH1cbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLnRpbGVDb21wb3VuZE1lbWJlcnMgPSBmdW5jdGlvbiAoY2hpbGRHcmFwaE1hcCwgaWRUb05vZGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnRpbGVkTWVtYmVyUGFjayA9IFtdO1xuXG4gIE9iamVjdC5rZXlzKGNoaWxkR3JhcGhNYXApLmZvckVhY2goZnVuY3Rpb24oaWQpIHtcbiAgICAvLyBHZXQgdGhlIGNvbXBvdW5kIG5vZGVcbiAgICB2YXIgY29tcG91bmROb2RlID0gaWRUb05vZGVbaWRdO1xuXG4gICAgc2VsZi50aWxlZE1lbWJlclBhY2tbaWRdID0gc2VsZi50aWxlTm9kZXMoY2hpbGRHcmFwaE1hcFtpZF0sIGNvbXBvdW5kTm9kZS5wYWRkaW5nTGVmdCArIGNvbXBvdW5kTm9kZS5wYWRkaW5nUmlnaHQpO1xuXG4gICAgY29tcG91bmROb2RlLnJlY3Qud2lkdGggPSBzZWxmLnRpbGVkTWVtYmVyUGFja1tpZF0ud2lkdGggKyAyMDtcbiAgICBjb21wb3VuZE5vZGUucmVjdC5oZWlnaHQgPSBzZWxmLnRpbGVkTWVtYmVyUGFja1tpZF0uaGVpZ2h0ICsgMjA7XG4gIH0pO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUudGlsZU5vZGVzID0gZnVuY3Rpb24gKG5vZGVzLCBtaW5XaWR0aCkge1xuICB2YXIgdmVydGljYWxQYWRkaW5nID0gQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19WRVJUSUNBTDtcbiAgdmFyIGhvcml6b250YWxQYWRkaW5nID0gQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19IT1JJWk9OVEFMO1xuICB2YXIgb3JnYW5pemF0aW9uID0ge1xuICAgIHJvd3M6IFtdLFxuICAgIHJvd1dpZHRoOiBbXSxcbiAgICByb3dIZWlnaHQ6IFtdLFxuICAgIHdpZHRoOiAyMCxcbiAgICBoZWlnaHQ6IDIwLFxuICAgIHZlcnRpY2FsUGFkZGluZzogdmVydGljYWxQYWRkaW5nLFxuICAgIGhvcml6b250YWxQYWRkaW5nOiBob3Jpem9udGFsUGFkZGluZ1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG5vZGVzIGluIGFzY2VuZGluZyBvcmRlciBvZiB0aGVpciBhcmVhc1xuICBub2Rlcy5zb3J0KGZ1bmN0aW9uIChuMSwgbjIpIHtcbiAgICBpZiAobjEucmVjdC53aWR0aCAqIG4xLnJlY3QuaGVpZ2h0ID4gbjIucmVjdC53aWR0aCAqIG4yLnJlY3QuaGVpZ2h0KVxuICAgICAgcmV0dXJuIC0xO1xuICAgIGlmIChuMS5yZWN0LndpZHRoICogbjEucmVjdC5oZWlnaHQgPCBuMi5yZWN0LndpZHRoICogbjIucmVjdC5oZWlnaHQpXG4gICAgICByZXR1cm4gMTtcbiAgICByZXR1cm4gMDtcbiAgfSk7XG5cbiAgLy8gQ3JlYXRlIHRoZSBvcmdhbml6YXRpb24gLT4gdGlsZSBtZW1iZXJzXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgbE5vZGUgPSBub2Rlc1tpXTtcbiAgICBcbiAgICBpZiAob3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoID09IDApIHtcbiAgICAgIHRoaXMuaW5zZXJ0Tm9kZVRvUm93KG9yZ2FuaXphdGlvbiwgbE5vZGUsIDAsIG1pbldpZHRoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5jYW5BZGRIb3Jpem9udGFsKG9yZ2FuaXphdGlvbiwgbE5vZGUucmVjdC53aWR0aCwgbE5vZGUucmVjdC5oZWlnaHQpKSB7XG4gICAgICB0aGlzLmluc2VydE5vZGVUb1Jvdyhvcmdhbml6YXRpb24sIGxOb2RlLCB0aGlzLmdldFNob3J0ZXN0Um93SW5kZXgob3JnYW5pemF0aW9uKSwgbWluV2lkdGgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuaW5zZXJ0Tm9kZVRvUm93KG9yZ2FuaXphdGlvbiwgbE5vZGUsIG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aCwgbWluV2lkdGgpO1xuICAgIH1cblxuICAgIHRoaXMuc2hpZnRUb0xhc3RSb3cob3JnYW5pemF0aW9uKTtcbiAgfVxuXG4gIHJldHVybiBvcmdhbml6YXRpb247XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5pbnNlcnROb2RlVG9Sb3cgPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uLCBub2RlLCByb3dJbmRleCwgbWluV2lkdGgpIHtcbiAgdmFyIG1pbkNvbXBvdW5kU2l6ZSA9IG1pbldpZHRoO1xuXG4gIC8vIEFkZCBuZXcgcm93IGlmIG5lZWRlZFxuICBpZiAocm93SW5kZXggPT0gb3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoKSB7XG4gICAgdmFyIHNlY29uZERpbWVuc2lvbiA9IFtdO1xuXG4gICAgb3JnYW5pemF0aW9uLnJvd3MucHVzaChzZWNvbmREaW1lbnNpb24pO1xuICAgIG9yZ2FuaXphdGlvbi5yb3dXaWR0aC5wdXNoKG1pbkNvbXBvdW5kU2l6ZSk7XG4gICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodC5wdXNoKDApO1xuICB9XG5cbiAgLy8gVXBkYXRlIHJvdyB3aWR0aFxuICB2YXIgdyA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtyb3dJbmRleF0gKyBub2RlLnJlY3Qud2lkdGg7XG5cbiAgaWYgKG9yZ2FuaXphdGlvbi5yb3dzW3Jvd0luZGV4XS5sZW5ndGggPiAwKSB7XG4gICAgdyArPSBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmc7XG4gIH1cblxuICBvcmdhbml6YXRpb24ucm93V2lkdGhbcm93SW5kZXhdID0gdztcbiAgLy8gVXBkYXRlIGNvbXBvdW5kIHdpZHRoXG4gIGlmIChvcmdhbml6YXRpb24ud2lkdGggPCB3KSB7XG4gICAgb3JnYW5pemF0aW9uLndpZHRoID0gdztcbiAgfVxuXG4gIC8vIFVwZGF0ZSBoZWlnaHRcbiAgdmFyIGggPSBub2RlLnJlY3QuaGVpZ2h0O1xuICBpZiAocm93SW5kZXggPiAwKVxuICAgIGggKz0gb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcblxuICB2YXIgZXh0cmFIZWlnaHQgPSAwO1xuICBpZiAoaCA+IG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbcm93SW5kZXhdKSB7XG4gICAgZXh0cmFIZWlnaHQgPSBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XTtcbiAgICBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XSA9IGg7XG4gICAgZXh0cmFIZWlnaHQgPSBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XSAtIGV4dHJhSGVpZ2h0O1xuICB9XG5cbiAgb3JnYW5pemF0aW9uLmhlaWdodCArPSBleHRyYUhlaWdodDtcblxuICAvLyBJbnNlcnQgbm9kZVxuICBvcmdhbml6YXRpb24ucm93c1tyb3dJbmRleF0ucHVzaChub2RlKTtcbn07XG5cbi8vU2NhbnMgdGhlIHJvd3Mgb2YgYW4gb3JnYW5pemF0aW9uIGFuZCByZXR1cm5zIHRoZSBvbmUgd2l0aCB0aGUgbWluIHdpZHRoXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRTaG9ydGVzdFJvd0luZGV4ID0gZnVuY3Rpb24gKG9yZ2FuaXphdGlvbikge1xuICB2YXIgciA9IC0xO1xuICB2YXIgbWluID0gTnVtYmVyLk1BWF9WQUxVRTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXSA8IG1pbikge1xuICAgICAgciA9IGk7XG4gICAgICBtaW4gPSBvcmdhbml6YXRpb24ucm93V2lkdGhbaV07XG4gICAgfVxuICB9XG4gIHJldHVybiByO1xufTtcblxuLy9TY2FucyB0aGUgcm93cyBvZiBhbiBvcmdhbml6YXRpb24gYW5kIHJldHVybnMgdGhlIG9uZSB3aXRoIHRoZSBtYXggd2lkdGhcbkNvU0VMYXlvdXQucHJvdG90eXBlLmdldExvbmdlc3RSb3dJbmRleCA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24pIHtcbiAgdmFyIHIgPSAtMTtcbiAgdmFyIG1heCA9IE51bWJlci5NSU5fVkFMVUU7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcmdhbml6YXRpb24ucm93cy5sZW5ndGg7IGkrKykge1xuXG4gICAgaWYgKG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXSA+IG1heCkge1xuICAgICAgciA9IGk7XG4gICAgICBtYXggPSBvcmdhbml6YXRpb24ucm93V2lkdGhbaV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHI7XG59O1xuXG4vKipcbiogVGhpcyBtZXRob2QgY2hlY2tzIHdoZXRoZXIgYWRkaW5nIGV4dHJhIHdpZHRoIHRvIHRoZSBvcmdhbml6YXRpb24gdmlvbGF0ZXNcbiogdGhlIGFzcGVjdCByYXRpbygxKSBvciBub3QuXG4qL1xuQ29TRUxheW91dC5wcm90b3R5cGUuY2FuQWRkSG9yaXpvbnRhbCA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24sIGV4dHJhV2lkdGgsIGV4dHJhSGVpZ2h0KSB7XG5cbiAgdmFyIHNyaSA9IHRoaXMuZ2V0U2hvcnRlc3RSb3dJbmRleChvcmdhbml6YXRpb24pO1xuXG4gIGlmIChzcmkgPCAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICB2YXIgbWluID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW3NyaV07XG5cbiAgaWYgKG1pbiArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZyArIGV4dHJhV2lkdGggPD0gb3JnYW5pemF0aW9uLndpZHRoKVxuICAgIHJldHVybiB0cnVlO1xuXG4gIHZhciBoRGlmZiA9IDA7XG5cbiAgLy8gQWRkaW5nIHRvIGFuIGV4aXN0aW5nIHJvd1xuICBpZiAob3JnYW5pemF0aW9uLnJvd0hlaWdodFtzcmldIDwgZXh0cmFIZWlnaHQpIHtcbiAgICBpZiAoc3JpID4gMClcbiAgICAgIGhEaWZmID0gZXh0cmFIZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nIC0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtzcmldO1xuICB9XG5cbiAgdmFyIGFkZF90b19yb3dfcmF0aW87XG4gIGlmIChvcmdhbml6YXRpb24ud2lkdGggLSBtaW4gPj0gZXh0cmFXaWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZykge1xuICAgIGFkZF90b19yb3dfcmF0aW8gPSAob3JnYW5pemF0aW9uLmhlaWdodCArIGhEaWZmKSAvIChtaW4gKyBleHRyYVdpZHRoICsgb3JnYW5pemF0aW9uLmhvcml6b250YWxQYWRkaW5nKTtcbiAgfSBlbHNlIHtcbiAgICBhZGRfdG9fcm93X3JhdGlvID0gKG9yZ2FuaXphdGlvbi5oZWlnaHQgKyBoRGlmZikgLyBvcmdhbml6YXRpb24ud2lkdGg7XG4gIH1cblxuICAvLyBBZGRpbmcgYSBuZXcgcm93IGZvciB0aGlzIG5vZGVcbiAgaERpZmYgPSBleHRyYUhlaWdodCArIG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XG4gIHZhciBhZGRfbmV3X3Jvd19yYXRpbztcbiAgaWYgKG9yZ2FuaXphdGlvbi53aWR0aCA8IGV4dHJhV2lkdGgpIHtcbiAgICBhZGRfbmV3X3Jvd19yYXRpbyA9IChvcmdhbml6YXRpb24uaGVpZ2h0ICsgaERpZmYpIC8gZXh0cmFXaWR0aDtcbiAgfSBlbHNlIHtcbiAgICBhZGRfbmV3X3Jvd19yYXRpbyA9IChvcmdhbml6YXRpb24uaGVpZ2h0ICsgaERpZmYpIC8gb3JnYW5pemF0aW9uLndpZHRoO1xuICB9XG5cbiAgaWYgKGFkZF9uZXdfcm93X3JhdGlvIDwgMSlcbiAgICBhZGRfbmV3X3Jvd19yYXRpbyA9IDEgLyBhZGRfbmV3X3Jvd19yYXRpbztcblxuICBpZiAoYWRkX3RvX3Jvd19yYXRpbyA8IDEpXG4gICAgYWRkX3RvX3Jvd19yYXRpbyA9IDEgLyBhZGRfdG9fcm93X3JhdGlvO1xuXG4gIHJldHVybiBhZGRfdG9fcm93X3JhdGlvIDwgYWRkX25ld19yb3dfcmF0aW87XG59O1xuXG4vL0lmIG1vdmluZyB0aGUgbGFzdCBub2RlIGZyb20gdGhlIGxvbmdlc3Qgcm93IGFuZCBhZGRpbmcgaXQgdG8gdGhlIGxhc3Rcbi8vcm93IG1ha2VzIHRoZSBib3VuZGluZyBib3ggc21hbGxlciwgZG8gaXQuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5zaGlmdFRvTGFzdFJvdyA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24pIHtcbiAgdmFyIGxvbmdlc3QgPSB0aGlzLmdldExvbmdlc3RSb3dJbmRleChvcmdhbml6YXRpb24pO1xuICB2YXIgbGFzdCA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aC5sZW5ndGggLSAxO1xuICB2YXIgcm93ID0gb3JnYW5pemF0aW9uLnJvd3NbbG9uZ2VzdF07XG4gIHZhciBub2RlID0gcm93W3Jvdy5sZW5ndGggLSAxXTtcblxuICB2YXIgZGlmZiA9IG5vZGUud2lkdGggKyBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmc7XG5cbiAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgZW5vdWdoIHNwYWNlIG9uIHRoZSBsYXN0IHJvd1xuICBpZiAob3JnYW5pemF0aW9uLndpZHRoIC0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xhc3RdID4gZGlmZiAmJiBsb25nZXN0ICE9IGxhc3QpIHtcbiAgICAvLyBSZW1vdmUgdGhlIGxhc3QgZWxlbWVudCBvZiB0aGUgbG9uZ2VzdCByb3dcbiAgICByb3cuc3BsaWNlKC0xLCAxKTtcblxuICAgIC8vIFB1c2ggaXQgdG8gdGhlIGxhc3Qgcm93XG4gICAgb3JnYW5pemF0aW9uLnJvd3NbbGFzdF0ucHVzaChub2RlKTtcblxuICAgIG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsb25nZXN0XSA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsb25nZXN0XSAtIGRpZmY7XG4gICAgb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xhc3RdID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xhc3RdICsgZGlmZjtcbiAgICBvcmdhbml6YXRpb24ud2lkdGggPSBvcmdhbml6YXRpb24ucm93V2lkdGhbaW5zdGFuY2UuZ2V0TG9uZ2VzdFJvd0luZGV4KG9yZ2FuaXphdGlvbildO1xuXG4gICAgLy8gVXBkYXRlIGhlaWdodHMgb2YgdGhlIG9yZ2FuaXphdGlvblxuICAgIHZhciBtYXhIZWlnaHQgPSBOdW1iZXIuTUlOX1ZBTFVFO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm93Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocm93W2ldLmhlaWdodCA+IG1heEhlaWdodClcbiAgICAgICAgbWF4SGVpZ2h0ID0gcm93W2ldLmhlaWdodDtcbiAgICB9XG4gICAgaWYgKGxvbmdlc3QgPiAwKVxuICAgICAgbWF4SGVpZ2h0ICs9IG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XG5cbiAgICB2YXIgcHJldlRvdGFsID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSArIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbGFzdF07XG5cbiAgICBvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xvbmdlc3RdID0gbWF4SGVpZ2h0O1xuICAgIGlmIChvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xhc3RdIDwgbm9kZS5oZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nKVxuICAgICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsYXN0XSA9IG5vZGUuaGVpZ2h0ICsgb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcblxuICAgIHZhciBmaW5hbFRvdGFsID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSArIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbGFzdF07XG4gICAgb3JnYW5pemF0aW9uLmhlaWdodCArPSAoZmluYWxUb3RhbCAtIHByZXZUb3RhbCk7XG5cbiAgICB0aGlzLnNoaWZ0VG9MYXN0Um93KG9yZ2FuaXphdGlvbik7XG4gIH1cbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLnRpbGluZ1ByZUxheW91dCA9IGZ1bmN0aW9uKCkge1xuICBpZiAoQ29TRUNvbnN0YW50cy5USUxFKSB7XG4gICAgLy8gRmluZCB6ZXJvIGRlZ3JlZSBub2RlcyBhbmQgY3JlYXRlIGEgY29tcG91bmQgZm9yIGVhY2ggbGV2ZWxcbiAgICB0aGlzLmdyb3VwWmVyb0RlZ3JlZU1lbWJlcnMoKTtcbiAgICAvLyBUaWxlIGFuZCBjbGVhciBjaGlsZHJlbiBvZiBlYWNoIGNvbXBvdW5kXG4gICAgdGhpcy5jbGVhckNvbXBvdW5kcygpO1xuICAgIC8vIFNlcGFyYXRlbHkgdGlsZSBhbmQgY2xlYXIgemVybyBkZWdyZWUgbm9kZXMgZm9yIGVhY2ggbGV2ZWxcbiAgICB0aGlzLmNsZWFyWmVyb0RlZ3JlZU1lbWJlcnMoKTtcbiAgfVxufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUudGlsaW5nUG9zdExheW91dCA9IGZ1bmN0aW9uKCkge1xuICBpZiAoQ29TRUNvbnN0YW50cy5USUxFKSB7XG4gICAgdGhpcy5yZXBvcHVsYXRlWmVyb0RlZ3JlZU1lbWJlcnMoKTtcbiAgICB0aGlzLnJlcG9wdWxhdGVDb21wb3VuZHMoKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb1NFTGF5b3V0O1xuIiwidmFyIEZETGF5b3V0Tm9kZSA9IHJlcXVpcmUoJy4vRkRMYXlvdXROb2RlJyk7XG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XG5cbmZ1bmN0aW9uIENvU0VOb2RlKGdtLCBsb2MsIHNpemUsIHZOb2RlKSB7XG4gIEZETGF5b3V0Tm9kZS5jYWxsKHRoaXMsIGdtLCBsb2MsIHNpemUsIHZOb2RlKTtcbn1cblxuXG5Db1NFTm9kZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZETGF5b3V0Tm9kZS5wcm90b3R5cGUpO1xuZm9yICh2YXIgcHJvcCBpbiBGRExheW91dE5vZGUpIHtcbiAgQ29TRU5vZGVbcHJvcF0gPSBGRExheW91dE5vZGVbcHJvcF07XG59XG5cbkNvU0VOb2RlLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIGxheW91dCA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldExheW91dCgpO1xuICB0aGlzLmRpc3BsYWNlbWVudFggPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqXG4gICAgICAgICAgKHRoaXMuc3ByaW5nRm9yY2VYICsgdGhpcy5yZXB1bHNpb25Gb3JjZVggKyB0aGlzLmdyYXZpdGF0aW9uRm9yY2VYKSAvIHRoaXMubm9PZkNoaWxkcmVuO1xuICB0aGlzLmRpc3BsYWNlbWVudFkgPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqXG4gICAgICAgICAgKHRoaXMuc3ByaW5nRm9yY2VZICsgdGhpcy5yZXB1bHNpb25Gb3JjZVkgKyB0aGlzLmdyYXZpdGF0aW9uRm9yY2VZKSAvIHRoaXMubm9PZkNoaWxkcmVuO1xuXG5cbiAgaWYgKE1hdGguYWJzKHRoaXMuZGlzcGxhY2VtZW50WCkgPiBsYXlvdXQuY29vbGluZ0ZhY3RvciAqIGxheW91dC5tYXhOb2RlRGlzcGxhY2VtZW50KVxuICB7XG4gICAgdGhpcy5kaXNwbGFjZW1lbnRYID0gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKiBsYXlvdXQubWF4Tm9kZURpc3BsYWNlbWVudCAqXG4gICAgICAgICAgICBJTWF0aC5zaWduKHRoaXMuZGlzcGxhY2VtZW50WCk7XG4gIH1cblxuICBpZiAoTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRZKSA+IGxheW91dC5jb29saW5nRmFjdG9yICogbGF5b3V0Lm1heE5vZGVEaXNwbGFjZW1lbnQpXG4gIHtcbiAgICB0aGlzLmRpc3BsYWNlbWVudFkgPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqIGxheW91dC5tYXhOb2RlRGlzcGxhY2VtZW50ICpcbiAgICAgICAgICAgIElNYXRoLnNpZ24odGhpcy5kaXNwbGFjZW1lbnRZKTtcbiAgfVxuXG4gIC8vIGEgc2ltcGxlIG5vZGUsIGp1c3QgbW92ZSBpdFxuICBpZiAodGhpcy5jaGlsZCA9PSBudWxsKVxuICB7XG4gICAgdGhpcy5tb3ZlQnkodGhpcy5kaXNwbGFjZW1lbnRYLCB0aGlzLmRpc3BsYWNlbWVudFkpO1xuICB9XG4gIC8vIGFuIGVtcHR5IGNvbXBvdW5kIG5vZGUsIGFnYWluIGp1c3QgbW92ZSBpdFxuICBlbHNlIGlmICh0aGlzLmNoaWxkLmdldE5vZGVzKCkubGVuZ3RoID09IDApXG4gIHtcbiAgICB0aGlzLm1vdmVCeSh0aGlzLmRpc3BsYWNlbWVudFgsIHRoaXMuZGlzcGxhY2VtZW50WSk7XG4gIH1cbiAgLy8gbm9uLWVtcHR5IGNvbXBvdW5kIG5vZGUsIHByb3BvZ2F0ZSBtb3ZlbWVudCB0byBjaGlsZHJlbiBhcyB3ZWxsXG4gIGVsc2VcbiAge1xuICAgIHRoaXMucHJvcG9nYXRlRGlzcGxhY2VtZW50VG9DaGlsZHJlbih0aGlzLmRpc3BsYWNlbWVudFgsXG4gICAgICAgICAgICB0aGlzLmRpc3BsYWNlbWVudFkpO1xuICB9XG5cbiAgbGF5b3V0LnRvdGFsRGlzcGxhY2VtZW50ICs9XG4gICAgICAgICAgTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRYKSArIE1hdGguYWJzKHRoaXMuZGlzcGxhY2VtZW50WSk7XG5cbiAgdGhpcy5zcHJpbmdGb3JjZVggPSAwO1xuICB0aGlzLnNwcmluZ0ZvcmNlWSA9IDA7XG4gIHRoaXMucmVwdWxzaW9uRm9yY2VYID0gMDtcbiAgdGhpcy5yZXB1bHNpb25Gb3JjZVkgPSAwO1xuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VYID0gMDtcbiAgdGhpcy5ncmF2aXRhdGlvbkZvcmNlWSA9IDA7XG4gIHRoaXMuZGlzcGxhY2VtZW50WCA9IDA7XG4gIHRoaXMuZGlzcGxhY2VtZW50WSA9IDA7XG59O1xuXG5Db1NFTm9kZS5wcm90b3R5cGUucHJvcG9nYXRlRGlzcGxhY2VtZW50VG9DaGlsZHJlbiA9IGZ1bmN0aW9uIChkWCwgZFkpXG57XG4gIHZhciBub2RlcyA9IHRoaXMuZ2V0Q2hpbGQoKS5nZXROb2RlcygpO1xuICB2YXIgbm9kZTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcbiAge1xuICAgIG5vZGUgPSBub2Rlc1tpXTtcbiAgICBpZiAobm9kZS5nZXRDaGlsZCgpID09IG51bGwpXG4gICAge1xuICAgICAgbm9kZS5tb3ZlQnkoZFgsIGRZKTtcbiAgICAgIG5vZGUuZGlzcGxhY2VtZW50WCArPSBkWDtcbiAgICAgIG5vZGUuZGlzcGxhY2VtZW50WSArPSBkWTtcbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIG5vZGUucHJvcG9nYXRlRGlzcGxhY2VtZW50VG9DaGlsZHJlbihkWCwgZFkpO1xuICAgIH1cbiAgfVxufTtcblxuQ29TRU5vZGUucHJvdG90eXBlLnNldFByZWQxID0gZnVuY3Rpb24gKHByZWQxKVxue1xuICB0aGlzLnByZWQxID0gcHJlZDE7XG59O1xuXG5Db1NFTm9kZS5wcm90b3R5cGUuZ2V0UHJlZDEgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gcHJlZDE7XG59O1xuXG5Db1NFTm9kZS5wcm90b3R5cGUuZ2V0UHJlZDIgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gcHJlZDI7XG59O1xuXG5Db1NFTm9kZS5wcm90b3R5cGUuc2V0TmV4dCA9IGZ1bmN0aW9uIChuZXh0KVxue1xuICB0aGlzLm5leHQgPSBuZXh0O1xufTtcblxuQ29TRU5vZGUucHJvdG90eXBlLmdldE5leHQgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gbmV4dDtcbn07XG5cbkNvU0VOb2RlLnByb3RvdHlwZS5zZXRQcm9jZXNzZWQgPSBmdW5jdGlvbiAocHJvY2Vzc2VkKVxue1xuICB0aGlzLnByb2Nlc3NlZCA9IHByb2Nlc3NlZDtcbn07XG5cbkNvU0VOb2RlLnByb3RvdHlwZS5pc1Byb2Nlc3NlZCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiBwcm9jZXNzZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvU0VOb2RlO1xuIiwiZnVuY3Rpb24gRGltZW5zaW9uRCh3aWR0aCwgaGVpZ2h0KSB7XG4gIHRoaXMud2lkdGggPSAwO1xuICB0aGlzLmhlaWdodCA9IDA7XG4gIGlmICh3aWR0aCAhPT0gbnVsbCAmJiBoZWlnaHQgIT09IG51bGwpIHtcbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gIH1cbn1cblxuRGltZW5zaW9uRC5wcm90b3R5cGUuZ2V0V2lkdGggPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy53aWR0aDtcbn07XG5cbkRpbWVuc2lvbkQucHJvdG90eXBlLnNldFdpZHRoID0gZnVuY3Rpb24gKHdpZHRoKVxue1xuICB0aGlzLndpZHRoID0gd2lkdGg7XG59O1xuXG5EaW1lbnNpb25ELnByb3RvdHlwZS5nZXRIZWlnaHQgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5oZWlnaHQ7XG59O1xuXG5EaW1lbnNpb25ELnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbiAoaGVpZ2h0KVxue1xuICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRGltZW5zaW9uRDtcbiIsImZ1bmN0aW9uIEVtaXR0ZXIoKXtcbiAgdGhpcy5saXN0ZW5lcnMgPSBbXTtcbn1cblxudmFyIHAgPSBFbWl0dGVyLnByb3RvdHlwZTtcblxucC5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKCBldmVudCwgY2FsbGJhY2sgKXtcbiAgdGhpcy5saXN0ZW5lcnMucHVzaCh7XG4gICAgZXZlbnQ6IGV2ZW50LFxuICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICB9KTtcbn07XG5cbnAucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiggZXZlbnQsIGNhbGxiYWNrICl7XG4gIGZvciggdmFyIGkgPSB0aGlzLmxpc3RlbmVycy5sZW5ndGg7IGkgPj0gMDsgaS0tICl7XG4gICAgdmFyIGwgPSB0aGlzLmxpc3RlbmVyc1tpXTtcblxuICAgIGlmKCBsLmV2ZW50ID09PSBldmVudCAmJiBsLmNhbGxiYWNrID09PSBjYWxsYmFjayApe1xuICAgICAgdGhpcy5saXN0ZW5lcnMuc3BsaWNlKCBpLCAxICk7XG4gICAgfVxuICB9XG59O1xuXG5wLmVtaXQgPSBmdW5jdGlvbiggZXZlbnQsIGRhdGEgKXtcbiAgZm9yKCB2YXIgaSA9IDA7IGkgPCB0aGlzLmxpc3RlbmVycy5sZW5ndGg7IGkrKyApe1xuICAgIHZhciBsID0gdGhpcy5saXN0ZW5lcnNbaV07XG5cbiAgICBpZiggZXZlbnQgPT09IGwuZXZlbnQgKXtcbiAgICAgIGwuY2FsbGJhY2soIGRhdGEgKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcbiIsInZhciBMYXlvdXQgPSByZXF1aXJlKCcuL0xheW91dCcpO1xudmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xudmFyIExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vTGF5b3V0Q29uc3RhbnRzJyk7XG52YXIgSUdlb21ldHJ5ID0gcmVxdWlyZSgnLi9JR2VvbWV0cnknKTtcbnZhciBJTWF0aCA9IHJlcXVpcmUoJy4vSU1hdGgnKTtcbnZhciBIYXNoU2V0ID0gcmVxdWlyZSgnLi9IYXNoU2V0Jyk7XG5cbmZ1bmN0aW9uIEZETGF5b3V0KCkge1xuICBMYXlvdXQuY2FsbCh0aGlzKTtcblxuICB0aGlzLnVzZVNtYXJ0SWRlYWxFZGdlTGVuZ3RoQ2FsY3VsYXRpb24gPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX1VTRV9TTUFSVF9JREVBTF9FREdFX0xFTkdUSF9DQUxDVUxBVElPTjtcbiAgdGhpcy5pZGVhbEVkZ2VMZW5ndGggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIO1xuICB0aGlzLnNwcmluZ0NvbnN0YW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEg7XG4gIHRoaXMucmVwdWxzaW9uQ29uc3RhbnQgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX1JFUFVMU0lPTl9TVFJFTkdUSDtcbiAgdGhpcy5ncmF2aXR5Q29uc3RhbnQgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEg7XG4gIHRoaXMuY29tcG91bmRHcmF2aXR5Q29uc3RhbnQgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEg7XG4gIHRoaXMuZ3Jhdml0eVJhbmdlRmFjdG9yID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUjtcbiAgdGhpcy5jb21wb3VuZEdyYXZpdHlSYW5nZUZhY3RvciA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XG4gIHRoaXMuZGlzcGxhY2VtZW50VGhyZXNob2xkUGVyTm9kZSA9ICgzLjAgKiBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIKSAvIDEwMDtcbiAgdGhpcy5jb29saW5nRmFjdG9yID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT09MSU5HX0ZBQ1RPUl9JTkNSRU1FTlRBTDtcbiAgdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09PTElOR19GQUNUT1JfSU5DUkVNRU5UQUw7XG4gIHRoaXMudG90YWxEaXNwbGFjZW1lbnQgPSAwLjA7XG4gIHRoaXMub2xkVG90YWxEaXNwbGFjZW1lbnQgPSAwLjA7XG4gIHRoaXMubWF4SXRlcmF0aW9ucyA9IEZETGF5b3V0Q29uc3RhbnRzLk1BWF9JVEVSQVRJT05TO1xufVxuXG5GRExheW91dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExheW91dC5wcm90b3R5cGUpO1xuXG5mb3IgKHZhciBwcm9wIGluIExheW91dCkge1xuICBGRExheW91dFtwcm9wXSA9IExheW91dFtwcm9wXTtcbn1cblxuRkRMYXlvdXQucHJvdG90eXBlLmluaXRQYXJhbWV0ZXJzID0gZnVuY3Rpb24gKCkge1xuICBMYXlvdXQucHJvdG90eXBlLmluaXRQYXJhbWV0ZXJzLmNhbGwodGhpcywgYXJndW1lbnRzKTtcblxuICBpZiAodGhpcy5sYXlvdXRRdWFsaXR5ID09IExheW91dENvbnN0YW50cy5EUkFGVF9RVUFMSVRZKVxuICB7XG4gICAgdGhpcy5kaXNwbGFjZW1lbnRUaHJlc2hvbGRQZXJOb2RlICs9IDAuMzA7XG4gICAgdGhpcy5tYXhJdGVyYXRpb25zICo9IDAuODtcbiAgfVxuICBlbHNlIGlmICh0aGlzLmxheW91dFF1YWxpdHkgPT0gTGF5b3V0Q29uc3RhbnRzLlBST09GX1FVQUxJVFkpXG4gIHtcbiAgICB0aGlzLmRpc3BsYWNlbWVudFRocmVzaG9sZFBlck5vZGUgLT0gMC4zMDtcbiAgICB0aGlzLm1heEl0ZXJhdGlvbnMgKj0gMS4yO1xuICB9XG5cbiAgdGhpcy50b3RhbEl0ZXJhdGlvbnMgPSAwO1xuICB0aGlzLm5vdEFuaW1hdGVkSXRlcmF0aW9ucyA9IDA7XG5cbiAgdGhpcy51c2VGUkdyaWRWYXJpYW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfUkVQVUxTSU9OX1JBTkdFX0NBTENVTEFUSU9OO1xufTtcblxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNJZGVhbEVkZ2VMZW5ndGhzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZWRnZTtcbiAgdmFyIGxjYURlcHRoO1xuICB2YXIgc291cmNlO1xuICB2YXIgdGFyZ2V0O1xuICB2YXIgc2l6ZU9mU291cmNlSW5MY2E7XG4gIHZhciBzaXplT2ZUYXJnZXRJbkxjYTtcblxuICB2YXIgYWxsRWRnZXMgPSB0aGlzLmdldEdyYXBoTWFuYWdlcigpLmdldEFsbEVkZ2VzKCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsRWRnZXMubGVuZ3RoOyBpKyspXG4gIHtcbiAgICBlZGdlID0gYWxsRWRnZXNbaV07XG5cbiAgICBlZGdlLmlkZWFsTGVuZ3RoID0gdGhpcy5pZGVhbEVkZ2VMZW5ndGg7XG5cbiAgICBpZiAoZWRnZS5pc0ludGVyR3JhcGgpXG4gICAge1xuICAgICAgc291cmNlID0gZWRnZS5nZXRTb3VyY2UoKTtcbiAgICAgIHRhcmdldCA9IGVkZ2UuZ2V0VGFyZ2V0KCk7XG5cbiAgICAgIHNpemVPZlNvdXJjZUluTGNhID0gZWRnZS5nZXRTb3VyY2VJbkxjYSgpLmdldEVzdGltYXRlZFNpemUoKTtcbiAgICAgIHNpemVPZlRhcmdldEluTGNhID0gZWRnZS5nZXRUYXJnZXRJbkxjYSgpLmdldEVzdGltYXRlZFNpemUoKTtcblxuICAgICAgaWYgKHRoaXMudXNlU21hcnRJZGVhbEVkZ2VMZW5ndGhDYWxjdWxhdGlvbilcbiAgICAgIHtcbiAgICAgICAgZWRnZS5pZGVhbExlbmd0aCArPSBzaXplT2ZTb3VyY2VJbkxjYSArIHNpemVPZlRhcmdldEluTGNhIC1cbiAgICAgICAgICAgICAgICAyICogTGF5b3V0Q29uc3RhbnRzLlNJTVBMRV9OT0RFX1NJWkU7XG4gICAgICB9XG5cbiAgICAgIGxjYURlcHRoID0gZWRnZS5nZXRMY2EoKS5nZXRJbmNsdXNpb25UcmVlRGVwdGgoKTtcblxuICAgICAgZWRnZS5pZGVhbExlbmd0aCArPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIICpcbiAgICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuUEVSX0xFVkVMX0lERUFMX0VER0VfTEVOR1RIX0ZBQ1RPUiAqXG4gICAgICAgICAgICAgIChzb3VyY2UuZ2V0SW5jbHVzaW9uVHJlZURlcHRoKCkgK1xuICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5nZXRJbmNsdXNpb25UcmVlRGVwdGgoKSAtIDIgKiBsY2FEZXB0aCk7XG4gICAgfVxuICB9XG59O1xuXG5GRExheW91dC5wcm90b3R5cGUuaW5pdFNwcmluZ0VtYmVkZGVyID0gZnVuY3Rpb24gKCkge1xuXG4gIGlmICh0aGlzLmluY3JlbWVudGFsKVxuICB7XG4gICAgdGhpcy5tYXhOb2RlRGlzcGxhY2VtZW50ID1cbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLk1BWF9OT0RFX0RJU1BMQUNFTUVOVF9JTkNSRU1FTlRBTDtcbiAgfVxuICBlbHNlXG4gIHtcbiAgICB0aGlzLmNvb2xpbmdGYWN0b3IgPSAxLjA7XG4gICAgdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciA9IDEuMDtcbiAgICB0aGlzLm1heE5vZGVEaXNwbGFjZW1lbnQgPVxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UO1xuICB9XG5cbiAgdGhpcy5tYXhJdGVyYXRpb25zID1cbiAgICAgICAgICBNYXRoLm1heCh0aGlzLmdldEFsbE5vZGVzKCkubGVuZ3RoICogNSwgdGhpcy5tYXhJdGVyYXRpb25zKTtcblxuICB0aGlzLnRvdGFsRGlzcGxhY2VtZW50VGhyZXNob2xkID1cbiAgICAgICAgICB0aGlzLmRpc3BsYWNlbWVudFRocmVzaG9sZFBlck5vZGUgKiB0aGlzLmdldEFsbE5vZGVzKCkubGVuZ3RoO1xuXG4gIHRoaXMucmVwdWxzaW9uUmFuZ2UgPSB0aGlzLmNhbGNSZXB1bHNpb25SYW5nZSgpO1xufTtcblxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNTcHJpbmdGb3JjZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBsRWRnZXMgPSB0aGlzLmdldEFsbEVkZ2VzKCk7XG4gIHZhciBlZGdlO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbEVkZ2VzLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgZWRnZSA9IGxFZGdlc1tpXTtcblxuICAgIHRoaXMuY2FsY1NwcmluZ0ZvcmNlKGVkZ2UsIGVkZ2UuaWRlYWxMZW5ndGgpO1xuICB9XG59O1xuXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1JlcHVsc2lvbkZvcmNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGksIGo7XG4gIHZhciBub2RlQSwgbm9kZUI7XG4gIHZhciBsTm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzKCk7XG4gIHZhciBwcm9jZXNzZWROb2RlU2V0O1xuXG4gIGlmICh0aGlzLnVzZUZSR3JpZFZhcmlhbnQpXG4gIHsgICAgICAgXG4gICAgaWYgKHRoaXMudG90YWxJdGVyYXRpb25zICUgRkRMYXlvdXRDb25zdGFudHMuR1JJRF9DQUxDVUxBVElPTl9DSEVDS19QRVJJT0QgPT0gMSlcbiAgICB7XG4gICAgICB2YXIgZ3JpZCA9IHRoaXMuY2FsY0dyaWQodGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpKTsgICAgXG4gICAgICBcbiAgICAgIC8vIHB1dCBhbGwgbm9kZXMgdG8gcHJvcGVyIGdyaWQgY2VsbHNcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsTm9kZXMubGVuZ3RoOyBpKyspXG4gICAgICB7XG4gICAgICAgIG5vZGVBID0gbE5vZGVzW2ldO1xuICAgICAgICB0aGlzLmFkZE5vZGVUb0dyaWQobm9kZUEsIGdyaWQsIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXRMZWZ0KCksIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXRUb3AoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcHJvY2Vzc2VkTm9kZVNldCA9IG5ldyBIYXNoU2V0KCk7XG4gICAgXG4gICAgLy8gY2FsY3VsYXRlIHJlcHVsc2lvbiBmb3JjZXMgYmV0d2VlbiBlYWNoIG5vZGVzIGFuZCBpdHMgc3Vycm91bmRpbmdcbiAgICBmb3IgKGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxuICAgIHtcbiAgICAgIG5vZGVBID0gbE5vZGVzW2ldO1xuICAgICAgdGhpcy5jYWxjdWxhdGVSZXB1bHNpb25Gb3JjZU9mQU5vZGUoZ3JpZCwgbm9kZUEsIHByb2Nlc3NlZE5vZGVTZXQpO1xuICAgICAgcHJvY2Vzc2VkTm9kZVNldC5hZGQobm9kZUEpO1xuICAgIH1cblxuICB9XG4gIGVsc2VcbiAge1xuICBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxuICAgIHtcbiAgICAgIG5vZGVBID0gbE5vZGVzW2ldO1xuXG4gICAgICBmb3IgKGogPSBpICsgMTsgaiA8IGxOb2Rlcy5sZW5ndGg7IGorKylcbiAgICAgIHtcbiAgICAgICAgbm9kZUIgPSBsTm9kZXNbal07XG5cbiAgICAgICAgLy8gSWYgYm90aCBub2RlcyBhcmUgbm90IG1lbWJlcnMgb2YgdGhlIHNhbWUgZ3JhcGgsIHNraXAuXG4gICAgICAgIGlmIChub2RlQS5nZXRPd25lcigpICE9IG5vZGVCLmdldE93bmVyKCkpXG4gICAgICAgIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2FsY1JlcHVsc2lvbkZvcmNlKG5vZGVBLCBub2RlQik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5GRExheW91dC5wcm90b3R5cGUuY2FsY0dyYXZpdGF0aW9uYWxGb3JjZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBub2RlO1xuICB2YXIgbE5vZGVzID0gdGhpcy5nZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbigpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgbm9kZSA9IGxOb2Rlc1tpXTtcbiAgICB0aGlzLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2Uobm9kZSk7XG4gIH1cbn07XG5cbkZETGF5b3V0LnByb3RvdHlwZS5tb3ZlTm9kZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBsTm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzKCk7XG4gIHZhciBub2RlO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgbm9kZSA9IGxOb2Rlc1tpXTtcbiAgICBub2RlLm1vdmUoKTtcbiAgfVxufVxuXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1NwcmluZ0ZvcmNlID0gZnVuY3Rpb24gKGVkZ2UsIGlkZWFsTGVuZ3RoKSB7XG4gIHZhciBzb3VyY2VOb2RlID0gZWRnZS5nZXRTb3VyY2UoKTtcbiAgdmFyIHRhcmdldE5vZGUgPSBlZGdlLmdldFRhcmdldCgpO1xuXG4gIHZhciBsZW5ndGg7XG4gIHZhciBzcHJpbmdGb3JjZTtcbiAgdmFyIHNwcmluZ0ZvcmNlWDtcbiAgdmFyIHNwcmluZ0ZvcmNlWTtcblxuICAvLyBVcGRhdGUgZWRnZSBsZW5ndGhcbiAgaWYgKHRoaXMudW5pZm9ybUxlYWZOb2RlU2l6ZXMgJiZcbiAgICAgICAgICBzb3VyY2VOb2RlLmdldENoaWxkKCkgPT0gbnVsbCAmJiB0YXJnZXROb2RlLmdldENoaWxkKCkgPT0gbnVsbClcbiAge1xuICAgIGVkZ2UudXBkYXRlTGVuZ3RoU2ltcGxlKCk7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgZWRnZS51cGRhdGVMZW5ndGgoKTtcblxuICAgIGlmIChlZGdlLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldClcbiAgICB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgbGVuZ3RoID0gZWRnZS5nZXRMZW5ndGgoKTtcblxuICAvLyBDYWxjdWxhdGUgc3ByaW5nIGZvcmNlc1xuICBzcHJpbmdGb3JjZSA9IHRoaXMuc3ByaW5nQ29uc3RhbnQgKiAobGVuZ3RoIC0gaWRlYWxMZW5ndGgpO1xuXG4gIC8vIFByb2plY3QgZm9yY2Ugb250byB4IGFuZCB5IGF4ZXNcbiAgc3ByaW5nRm9yY2VYID0gc3ByaW5nRm9yY2UgKiAoZWRnZS5sZW5ndGhYIC8gbGVuZ3RoKTtcbiAgc3ByaW5nRm9yY2VZID0gc3ByaW5nRm9yY2UgKiAoZWRnZS5sZW5ndGhZIC8gbGVuZ3RoKTtcblxuICAvLyBBcHBseSBmb3JjZXMgb24gdGhlIGVuZCBub2Rlc1xuICBzb3VyY2VOb2RlLnNwcmluZ0ZvcmNlWCArPSBzcHJpbmdGb3JjZVg7XG4gIHNvdXJjZU5vZGUuc3ByaW5nRm9yY2VZICs9IHNwcmluZ0ZvcmNlWTtcbiAgdGFyZ2V0Tm9kZS5zcHJpbmdGb3JjZVggLT0gc3ByaW5nRm9yY2VYO1xuICB0YXJnZXROb2RlLnNwcmluZ0ZvcmNlWSAtPSBzcHJpbmdGb3JjZVk7XG59O1xuXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1JlcHVsc2lvbkZvcmNlID0gZnVuY3Rpb24gKG5vZGVBLCBub2RlQikge1xuICB2YXIgcmVjdEEgPSBub2RlQS5nZXRSZWN0KCk7XG4gIHZhciByZWN0QiA9IG5vZGVCLmdldFJlY3QoKTtcbiAgdmFyIG92ZXJsYXBBbW91bnQgPSBuZXcgQXJyYXkoMik7XG4gIHZhciBjbGlwUG9pbnRzID0gbmV3IEFycmF5KDQpO1xuICB2YXIgZGlzdGFuY2VYO1xuICB2YXIgZGlzdGFuY2VZO1xuICB2YXIgZGlzdGFuY2VTcXVhcmVkO1xuICB2YXIgZGlzdGFuY2U7XG4gIHZhciByZXB1bHNpb25Gb3JjZTtcbiAgdmFyIHJlcHVsc2lvbkZvcmNlWDtcbiAgdmFyIHJlcHVsc2lvbkZvcmNlWTtcblxuICBpZiAocmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpLy8gdHdvIG5vZGVzIG92ZXJsYXBcbiAge1xuICAgIC8vIGNhbGN1bGF0ZSBzZXBhcmF0aW9uIGFtb3VudCBpbiB4IGFuZCB5IGRpcmVjdGlvbnNcbiAgICBJR2VvbWV0cnkuY2FsY1NlcGFyYXRpb25BbW91bnQocmVjdEEsXG4gICAgICAgICAgICByZWN0QixcbiAgICAgICAgICAgIG92ZXJsYXBBbW91bnQsXG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIIC8gMi4wKTtcblxuICAgIHJlcHVsc2lvbkZvcmNlWCA9IDIgKiBvdmVybGFwQW1vdW50WzBdO1xuICAgIHJlcHVsc2lvbkZvcmNlWSA9IDIgKiBvdmVybGFwQW1vdW50WzFdO1xuICAgIFxuICAgIHZhciBjaGlsZHJlbkNvbnN0YW50ID0gbm9kZUEubm9PZkNoaWxkcmVuICogbm9kZUIubm9PZkNoaWxkcmVuIC8gKG5vZGVBLm5vT2ZDaGlsZHJlbiArIG5vZGVCLm5vT2ZDaGlsZHJlbik7XG4gICAgXG4gICAgLy8gQXBwbHkgZm9yY2VzIG9uIHRoZSB0d28gbm9kZXNcbiAgICBub2RlQS5yZXB1bHNpb25Gb3JjZVggLT0gY2hpbGRyZW5Db25zdGFudCAqIHJlcHVsc2lvbkZvcmNlWDtcbiAgICBub2RlQS5yZXB1bHNpb25Gb3JjZVkgLT0gY2hpbGRyZW5Db25zdGFudCAqIHJlcHVsc2lvbkZvcmNlWTtcbiAgICBub2RlQi5yZXB1bHNpb25Gb3JjZVggKz0gY2hpbGRyZW5Db25zdGFudCAqIHJlcHVsc2lvbkZvcmNlWDtcbiAgICBub2RlQi5yZXB1bHNpb25Gb3JjZVkgKz0gY2hpbGRyZW5Db25zdGFudCAqIHJlcHVsc2lvbkZvcmNlWTtcbiAgfVxuICBlbHNlLy8gbm8gb3ZlcmxhcFxuICB7XG4gICAgLy8gY2FsY3VsYXRlIGRpc3RhbmNlXG5cbiAgICBpZiAodGhpcy51bmlmb3JtTGVhZk5vZGVTaXplcyAmJlxuICAgICAgICAgICAgbm9kZUEuZ2V0Q2hpbGQoKSA9PSBudWxsICYmIG5vZGVCLmdldENoaWxkKCkgPT0gbnVsbCkvLyBzaW1wbHkgYmFzZSByZXB1bHNpb24gb24gZGlzdGFuY2Ugb2Ygbm9kZSBjZW50ZXJzXG4gICAge1xuICAgICAgZGlzdGFuY2VYID0gcmVjdEIuZ2V0Q2VudGVyWCgpIC0gcmVjdEEuZ2V0Q2VudGVyWCgpO1xuICAgICAgZGlzdGFuY2VZID0gcmVjdEIuZ2V0Q2VudGVyWSgpIC0gcmVjdEEuZ2V0Q2VudGVyWSgpO1xuICAgIH1cbiAgICBlbHNlLy8gdXNlIGNsaXBwaW5nIHBvaW50c1xuICAgIHtcbiAgICAgIElHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24ocmVjdEEsIHJlY3RCLCBjbGlwUG9pbnRzKTtcblxuICAgICAgZGlzdGFuY2VYID0gY2xpcFBvaW50c1syXSAtIGNsaXBQb2ludHNbMF07XG4gICAgICBkaXN0YW5jZVkgPSBjbGlwUG9pbnRzWzNdIC0gY2xpcFBvaW50c1sxXTtcbiAgICB9XG5cbiAgICAvLyBObyByZXB1bHNpb24gcmFuZ2UuIEZSIGdyaWQgdmFyaWFudCBzaG91bGQgdGFrZSBjYXJlIG9mIHRoaXMuXG4gICAgaWYgKE1hdGguYWJzKGRpc3RhbmNlWCkgPCBGRExheW91dENvbnN0YW50cy5NSU5fUkVQVUxTSU9OX0RJU1QpXG4gICAge1xuICAgICAgZGlzdGFuY2VYID0gSU1hdGguc2lnbihkaXN0YW5jZVgpICpcbiAgICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUO1xuICAgIH1cblxuICAgIGlmIChNYXRoLmFicyhkaXN0YW5jZVkpIDwgRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUKVxuICAgIHtcbiAgICAgIGRpc3RhbmNlWSA9IElNYXRoLnNpZ24oZGlzdGFuY2VZKSAqXG4gICAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLk1JTl9SRVBVTFNJT05fRElTVDtcbiAgICB9XG5cbiAgICBkaXN0YW5jZVNxdWFyZWQgPSBkaXN0YW5jZVggKiBkaXN0YW5jZVggKyBkaXN0YW5jZVkgKiBkaXN0YW5jZVk7XG4gICAgZGlzdGFuY2UgPSBNYXRoLnNxcnQoZGlzdGFuY2VTcXVhcmVkKTtcblxuICAgIHJlcHVsc2lvbkZvcmNlID0gdGhpcy5yZXB1bHNpb25Db25zdGFudCAqIG5vZGVBLm5vT2ZDaGlsZHJlbiAqIG5vZGVCLm5vT2ZDaGlsZHJlbiAvIGRpc3RhbmNlU3F1YXJlZDtcblxuICAgIC8vIFByb2plY3QgZm9yY2Ugb250byB4IGFuZCB5IGF4ZXNcbiAgICByZXB1bHNpb25Gb3JjZVggPSByZXB1bHNpb25Gb3JjZSAqIGRpc3RhbmNlWCAvIGRpc3RhbmNlO1xuICAgIHJlcHVsc2lvbkZvcmNlWSA9IHJlcHVsc2lvbkZvcmNlICogZGlzdGFuY2VZIC8gZGlzdGFuY2U7XG4gICAgIFxuICAgIC8vIEFwcGx5IGZvcmNlcyBvbiB0aGUgdHdvIG5vZGVzICAgIFxuICAgIG5vZGVBLnJlcHVsc2lvbkZvcmNlWCAtPSByZXB1bHNpb25Gb3JjZVg7XG4gICAgbm9kZUEucmVwdWxzaW9uRm9yY2VZIC09IHJlcHVsc2lvbkZvcmNlWTtcbiAgICBub2RlQi5yZXB1bHNpb25Gb3JjZVggKz0gcmVwdWxzaW9uRm9yY2VYO1xuICAgIG5vZGVCLnJlcHVsc2lvbkZvcmNlWSArPSByZXB1bHNpb25Gb3JjZVk7XG4gIH1cbn07XG5cbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjR3Jhdml0YXRpb25hbEZvcmNlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdmFyIG93bmVyR3JhcGg7XG4gIHZhciBvd25lckNlbnRlclg7XG4gIHZhciBvd25lckNlbnRlclk7XG4gIHZhciBkaXN0YW5jZVg7XG4gIHZhciBkaXN0YW5jZVk7XG4gIHZhciBhYnNEaXN0YW5jZVg7XG4gIHZhciBhYnNEaXN0YW5jZVk7XG4gIHZhciBlc3RpbWF0ZWRTaXplO1xuICBvd25lckdyYXBoID0gbm9kZS5nZXRPd25lcigpO1xuXG4gIG93bmVyQ2VudGVyWCA9IChvd25lckdyYXBoLmdldFJpZ2h0KCkgKyBvd25lckdyYXBoLmdldExlZnQoKSkgLyAyO1xuICBvd25lckNlbnRlclkgPSAob3duZXJHcmFwaC5nZXRUb3AoKSArIG93bmVyR3JhcGguZ2V0Qm90dG9tKCkpIC8gMjtcbiAgZGlzdGFuY2VYID0gbm9kZS5nZXRDZW50ZXJYKCkgLSBvd25lckNlbnRlclg7XG4gIGRpc3RhbmNlWSA9IG5vZGUuZ2V0Q2VudGVyWSgpIC0gb3duZXJDZW50ZXJZO1xuICBhYnNEaXN0YW5jZVggPSBNYXRoLmFicyhkaXN0YW5jZVgpICsgbm9kZS5nZXRXaWR0aCgpIC8gMjtcbiAgYWJzRGlzdGFuY2VZID0gTWF0aC5hYnMoZGlzdGFuY2VZKSArIG5vZGUuZ2V0SGVpZ2h0KCkgLyAyO1xuXG4gIGlmIChub2RlLmdldE93bmVyKCkgPT0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpKS8vIGluIHRoZSByb290IGdyYXBoXG4gIHtcbiAgICBlc3RpbWF0ZWRTaXplID0gb3duZXJHcmFwaC5nZXRFc3RpbWF0ZWRTaXplKCkgKiB0aGlzLmdyYXZpdHlSYW5nZUZhY3RvcjtcblxuICAgIGlmIChhYnNEaXN0YW5jZVggPiBlc3RpbWF0ZWRTaXplIHx8IGFic0Rpc3RhbmNlWSA+IGVzdGltYXRlZFNpemUpXG4gICAge1xuICAgICAgbm9kZS5ncmF2aXRhdGlvbkZvcmNlWCA9IC10aGlzLmdyYXZpdHlDb25zdGFudCAqIGRpc3RhbmNlWDtcbiAgICAgIG5vZGUuZ3Jhdml0YXRpb25Gb3JjZVkgPSAtdGhpcy5ncmF2aXR5Q29uc3RhbnQgKiBkaXN0YW5jZVk7XG4gICAgfVxuICB9XG4gIGVsc2UvLyBpbnNpZGUgYSBjb21wb3VuZFxuICB7XG4gICAgZXN0aW1hdGVkU2l6ZSA9IG93bmVyR3JhcGguZ2V0RXN0aW1hdGVkU2l6ZSgpICogdGhpcy5jb21wb3VuZEdyYXZpdHlSYW5nZUZhY3RvcjtcblxuICAgIGlmIChhYnNEaXN0YW5jZVggPiBlc3RpbWF0ZWRTaXplIHx8IGFic0Rpc3RhbmNlWSA+IGVzdGltYXRlZFNpemUpXG4gICAge1xuICAgICAgbm9kZS5ncmF2aXRhdGlvbkZvcmNlWCA9IC10aGlzLmdyYXZpdHlDb25zdGFudCAqIGRpc3RhbmNlWCAqXG4gICAgICAgICAgICAgIHRoaXMuY29tcG91bmRHcmF2aXR5Q29uc3RhbnQ7XG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VZID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VZICpcbiAgICAgICAgICAgICAgdGhpcy5jb21wb3VuZEdyYXZpdHlDb25zdGFudDtcbiAgICB9XG4gIH1cbn07XG5cbkZETGF5b3V0LnByb3RvdHlwZS5pc0NvbnZlcmdlZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGNvbnZlcmdlZDtcbiAgdmFyIG9zY2lsYXRpbmcgPSBmYWxzZTtcblxuICBpZiAodGhpcy50b3RhbEl0ZXJhdGlvbnMgPiB0aGlzLm1heEl0ZXJhdGlvbnMgLyAzKVxuICB7XG4gICAgb3NjaWxhdGluZyA9XG4gICAgICAgICAgICBNYXRoLmFicyh0aGlzLnRvdGFsRGlzcGxhY2VtZW50IC0gdGhpcy5vbGRUb3RhbERpc3BsYWNlbWVudCkgPCAyO1xuICB9XG5cbiAgY29udmVyZ2VkID0gdGhpcy50b3RhbERpc3BsYWNlbWVudCA8IHRoaXMudG90YWxEaXNwbGFjZW1lbnRUaHJlc2hvbGQ7XG5cbiAgdGhpcy5vbGRUb3RhbERpc3BsYWNlbWVudCA9IHRoaXMudG90YWxEaXNwbGFjZW1lbnQ7XG5cbiAgcmV0dXJuIGNvbnZlcmdlZCB8fCBvc2NpbGF0aW5nO1xufTtcblxuRkRMYXlvdXQucHJvdG90eXBlLmFuaW1hdGUgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmFuaW1hdGlvbkR1cmluZ0xheW91dCAmJiAhdGhpcy5pc1N1YkxheW91dClcbiAge1xuICAgIGlmICh0aGlzLm5vdEFuaW1hdGVkSXRlcmF0aW9ucyA9PSB0aGlzLmFuaW1hdGlvblBlcmlvZClcbiAgICB7XG4gICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgdGhpcy5ub3RBbmltYXRlZEl0ZXJhdGlvbnMgPSAwO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgdGhpcy5ub3RBbmltYXRlZEl0ZXJhdGlvbnMrKztcbiAgICB9XG4gIH1cbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBTZWN0aW9uOiBGUi1HcmlkIFZhcmlhbnQgUmVwdWxzaW9uIEZvcmNlIENhbGN1bGF0aW9uXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5GRExheW91dC5wcm90b3R5cGUuY2FsY0dyaWQgPSBmdW5jdGlvbiAoZ3JhcGgpe1xuXG4gIHZhciBzaXplWCA9IDA7IFxuICB2YXIgc2l6ZVkgPSAwO1xuICBcbiAgc2l6ZVggPSBwYXJzZUludChNYXRoLmNlaWwoKGdyYXBoLmdldFJpZ2h0KCkgLSBncmFwaC5nZXRMZWZ0KCkpIC8gdGhpcy5yZXB1bHNpb25SYW5nZSkpO1xuICBzaXplWSA9IHBhcnNlSW50KE1hdGguY2VpbCgoZ3JhcGguZ2V0Qm90dG9tKCkgLSBncmFwaC5nZXRUb3AoKSkgLyB0aGlzLnJlcHVsc2lvblJhbmdlKSk7XG4gIFxuICB2YXIgZ3JpZCA9IG5ldyBBcnJheShzaXplWCk7XG4gIFxuICBmb3IodmFyIGkgPSAwOyBpIDwgc2l6ZVg7IGkrKyl7XG4gICAgZ3JpZFtpXSA9IG5ldyBBcnJheShzaXplWSk7ICAgIFxuICB9XG4gIFxuICBmb3IodmFyIGkgPSAwOyBpIDwgc2l6ZVg7IGkrKyl7XG4gICAgZm9yKHZhciBqID0gMDsgaiA8IHNpemVZOyBqKyspe1xuICAgICAgZ3JpZFtpXVtqXSA9IG5ldyBBcnJheSgpOyAgICBcbiAgICB9XG4gIH1cbiAgXG4gIHJldHVybiBncmlkO1xufTtcblxuRkRMYXlvdXQucHJvdG90eXBlLmFkZE5vZGVUb0dyaWQgPSBmdW5jdGlvbiAodiwgZ3JpZCwgbGVmdCwgdG9wKXtcbiAgICBcbiAgdmFyIHN0YXJ0WCA9IDA7XG4gIHZhciBmaW5pc2hYID0gMDtcbiAgdmFyIHN0YXJ0WSA9IDA7XG4gIHZhciBmaW5pc2hZID0gMDtcbiAgXG4gIHN0YXJ0WCA9IHBhcnNlSW50KE1hdGguZmxvb3IoKHYuZ2V0UmVjdCgpLnggLSBsZWZ0KSAvIHRoaXMucmVwdWxzaW9uUmFuZ2UpKTtcbiAgZmluaXNoWCA9IHBhcnNlSW50KE1hdGguZmxvb3IoKHYuZ2V0UmVjdCgpLndpZHRoICsgdi5nZXRSZWN0KCkueCAtIGxlZnQpIC8gdGhpcy5yZXB1bHNpb25SYW5nZSkpO1xuICBzdGFydFkgPSBwYXJzZUludChNYXRoLmZsb29yKCh2LmdldFJlY3QoKS55IC0gdG9wKSAvIHRoaXMucmVwdWxzaW9uUmFuZ2UpKTtcbiAgZmluaXNoWSA9IHBhcnNlSW50KE1hdGguZmxvb3IoKHYuZ2V0UmVjdCgpLmhlaWdodCArIHYuZ2V0UmVjdCgpLnkgLSB0b3ApIC8gdGhpcy5yZXB1bHNpb25SYW5nZSkpO1xuXG4gIGZvciAodmFyIGkgPSBzdGFydFg7IGkgPD0gZmluaXNoWDsgaSsrKVxuICB7XG4gICAgZm9yICh2YXIgaiA9IHN0YXJ0WTsgaiA8PSBmaW5pc2hZOyBqKyspXG4gICAge1xuICAgICAgZ3JpZFtpXVtqXS5wdXNoKHYpO1xuICAgICAgdi5zZXRHcmlkQ29vcmRpbmF0ZXMoc3RhcnRYLCBmaW5pc2hYLCBzdGFydFksIGZpbmlzaFkpOyBcbiAgICB9XG4gIH0gIFxuXG59O1xuXG5GRExheW91dC5wcm90b3R5cGUuY2FsY3VsYXRlUmVwdWxzaW9uRm9yY2VPZkFOb2RlID0gZnVuY3Rpb24gKGdyaWQsIG5vZGVBLCBwcm9jZXNzZWROb2RlU2V0KXtcbiAgXG4gIGlmICh0aGlzLnRvdGFsSXRlcmF0aW9ucyAlIEZETGF5b3V0Q29uc3RhbnRzLkdSSURfQ0FMQ1VMQVRJT05fQ0hFQ0tfUEVSSU9EID09IDEpXG4gIHtcbiAgICB2YXIgc3Vycm91bmRpbmcgPSBuZXcgSGFzaFNldCgpO1xuICAgIG5vZGVBLnN1cnJvdW5kaW5nID0gbmV3IEFycmF5KCk7XG4gICAgdmFyIG5vZGVCO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAobm9kZUEuc3RhcnRYIC0gMSk7IGkgPCAobm9kZUEuZmluaXNoWCArIDIpOyBpKyspXG4gICAge1xuICAgICAgZm9yICh2YXIgaiA9IChub2RlQS5zdGFydFkgLSAxKTsgaiA8IChub2RlQS5maW5pc2hZICsgMik7IGorKylcbiAgICAgIHtcbiAgICAgICAgaWYgKCEoKGkgPCAwKSB8fCAoaiA8IDApIHx8IChpID49IGdyaWQubGVuZ3RoKSB8fCAoaiA+PSBncmlkWzBdLmxlbmd0aCkpKVxuICAgICAgICB7ICBcbiAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGdyaWRbaV1bal0ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgIG5vZGVCID0gZ3JpZFtpXVtqXVtrXTtcblxuICAgICAgICAgICAgLy8gSWYgYm90aCBub2RlcyBhcmUgbm90IG1lbWJlcnMgb2YgdGhlIHNhbWUgZ3JhcGgsIFxuICAgICAgICAgICAgLy8gb3IgYm90aCBub2RlcyBhcmUgdGhlIHNhbWUsIHNraXAuXG4gICAgICAgICAgICBpZiAoKG5vZGVBLmdldE93bmVyKCkgIT0gbm9kZUIuZ2V0T3duZXIoKSkgfHwgKG5vZGVBID09IG5vZGVCKSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHRoZSByZXB1bHNpb24gZm9yY2UgYmV0d2VlblxuICAgICAgICAgICAgLy8gbm9kZUEgYW5kIG5vZGVCIGhhcyBhbHJlYWR5IGJlZW4gY2FsY3VsYXRlZFxuICAgICAgICAgICAgaWYgKCFwcm9jZXNzZWROb2RlU2V0LmNvbnRhaW5zKG5vZGVCKSAmJiAhc3Vycm91bmRpbmcuY29udGFpbnMobm9kZUIpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB2YXIgZGlzdGFuY2VYID0gTWF0aC5hYnMobm9kZUEuZ2V0Q2VudGVyWCgpLW5vZGVCLmdldENlbnRlclgoKSkgLSBcbiAgICAgICAgICAgICAgICAgICAgKChub2RlQS5nZXRXaWR0aCgpLzIpICsgKG5vZGVCLmdldFdpZHRoKCkvMikpO1xuICAgICAgICAgICAgICB2YXIgZGlzdGFuY2VZID0gTWF0aC5hYnMobm9kZUEuZ2V0Q2VudGVyWSgpLW5vZGVCLmdldENlbnRlclkoKSkgLSBcbiAgICAgICAgICAgICAgICAgICAgKChub2RlQS5nZXRIZWlnaHQoKS8yKSArIChub2RlQi5nZXRIZWlnaHQoKS8yKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIGRpc3RhbmNlIGJldHdlZW4gbm9kZUEgYW5kIG5vZGVCIFxuICAgICAgICAgICAgICAvLyBpcyBsZXNzIHRoZW4gY2FsY3VsYXRpb24gcmFuZ2VcbiAgICAgICAgICAgICAgaWYgKChkaXN0YW5jZVggPD0gdGhpcy5yZXB1bHNpb25SYW5nZSkgJiYgKGRpc3RhbmNlWSA8PSB0aGlzLnJlcHVsc2lvblJhbmdlKSlcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIC8vdGhlbiBhZGQgbm9kZUIgdG8gc3Vycm91bmRpbmcgb2Ygbm9kZUFcbiAgICAgICAgICAgICAgICBzdXJyb3VuZGluZy5hZGQobm9kZUIpO1xuICAgICAgICAgICAgICB9ICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0gICAgXG4gICAgICAgICAgfVxuICAgICAgICB9ICAgICAgICAgIFxuICAgICAgfVxuICAgIH1cblxuICAgIHN1cnJvdW5kaW5nLmFkZEFsbFRvKG5vZGVBLnN1cnJvdW5kaW5nKTtcblx0XG4gIH1cbiAgZm9yIChpID0gMDsgaSA8IG5vZGVBLnN1cnJvdW5kaW5nLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgdGhpcy5jYWxjUmVwdWxzaW9uRm9yY2Uobm9kZUEsIG5vZGVBLnN1cnJvdW5kaW5nW2ldKTtcbiAgfVx0XG59O1xuXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1JlcHVsc2lvblJhbmdlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gMC4wO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dDtcbiIsInZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xuXG5mdW5jdGlvbiBGRExheW91dENvbnN0YW50cygpIHtcbn1cblxuLy9GRExheW91dENvbnN0YW50cyBpbmhlcml0cyBzdGF0aWMgcHJvcHMgaW4gTGF5b3V0Q29uc3RhbnRzXG5mb3IgKHZhciBwcm9wIGluIExheW91dENvbnN0YW50cykge1xuICBGRExheW91dENvbnN0YW50c1twcm9wXSA9IExheW91dENvbnN0YW50c1twcm9wXTtcbn1cblxuRkRMYXlvdXRDb25zdGFudHMuTUFYX0lURVJBVElPTlMgPSAyNTAwO1xuXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIID0gNTA7XG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX1NQUklOR19TVFJFTkdUSCA9IDAuNDU7XG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX1JFUFVMU0lPTl9TVFJFTkdUSCA9IDQ1MDAuMDtcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9TVFJFTkdUSCA9IDAuNDtcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9TVFJFTkdUSCA9IDEuMDtcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSAzLjg7XG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfUkFOR0VfRkFDVE9SID0gMS41O1xuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfSURFQUxfRURHRV9MRU5HVEhfQ0FMQ1VMQVRJT04gPSB0cnVlO1xuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfUkVQVUxTSU9OX1JBTkdFX0NBTENVTEFUSU9OID0gdHJ1ZTtcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09PTElOR19GQUNUT1JfSU5DUkVNRU5UQUwgPSAwLjg7XG5GRExheW91dENvbnN0YW50cy5NQVhfTk9ERV9ESVNQTEFDRU1FTlRfSU5DUkVNRU5UQUwgPSAxMDAuMDtcbkZETGF5b3V0Q29uc3RhbnRzLk1BWF9OT0RFX0RJU1BMQUNFTUVOVCA9IEZETGF5b3V0Q29uc3RhbnRzLk1BWF9OT0RFX0RJU1BMQUNFTUVOVF9JTkNSRU1FTlRBTCAqIDM7XG5GRExheW91dENvbnN0YW50cy5NSU5fUkVQVUxTSU9OX0RJU1QgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIIC8gMTAuMDtcbkZETGF5b3V0Q29uc3RhbnRzLkNPTlZFUkdFTkNFX0NIRUNLX1BFUklPRCA9IDEwMDtcbkZETGF5b3V0Q29uc3RhbnRzLlBFUl9MRVZFTF9JREVBTF9FREdFX0xFTkdUSF9GQUNUT1IgPSAwLjE7XG5GRExheW91dENvbnN0YW50cy5NSU5fRURHRV9MRU5HVEggPSAxO1xuRkRMYXlvdXRDb25zdGFudHMuR1JJRF9DQUxDVUxBVElPTl9DSEVDS19QRVJJT0QgPSAxMDtcblxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dENvbnN0YW50cztcbiIsInZhciBMRWRnZSA9IHJlcXVpcmUoJy4vTEVkZ2UnKTtcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcblxuZnVuY3Rpb24gRkRMYXlvdXRFZGdlKHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSkge1xuICBMRWRnZS5jYWxsKHRoaXMsIHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSk7XG4gIHRoaXMuaWRlYWxMZW5ndGggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIO1xufVxuXG5GRExheW91dEVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMRWRnZS5wcm90b3R5cGUpO1xuXG5mb3IgKHZhciBwcm9wIGluIExFZGdlKSB7XG4gIEZETGF5b3V0RWRnZVtwcm9wXSA9IExFZGdlW3Byb3BdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZETGF5b3V0RWRnZTtcbiIsInZhciBMTm9kZSA9IHJlcXVpcmUoJy4vTE5vZGUnKTtcblxuZnVuY3Rpb24gRkRMYXlvdXROb2RlKGdtLCBsb2MsIHNpemUsIHZOb2RlKSB7XG4gIC8vIGFsdGVybmF0aXZlIGNvbnN0cnVjdG9yIGlzIGhhbmRsZWQgaW5zaWRlIExOb2RlXG4gIExOb2RlLmNhbGwodGhpcywgZ20sIGxvYywgc2l6ZSwgdk5vZGUpO1xuICAvL1NwcmluZywgcmVwdWxzaW9uIGFuZCBncmF2aXRhdGlvbmFsIGZvcmNlcyBhY3Rpbmcgb24gdGhpcyBub2RlXG4gIHRoaXMuc3ByaW5nRm9yY2VYID0gMDtcbiAgdGhpcy5zcHJpbmdGb3JjZVkgPSAwO1xuICB0aGlzLnJlcHVsc2lvbkZvcmNlWCA9IDA7XG4gIHRoaXMucmVwdWxzaW9uRm9yY2VZID0gMDtcbiAgdGhpcy5ncmF2aXRhdGlvbkZvcmNlWCA9IDA7XG4gIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVkgPSAwO1xuICAvL0Ftb3VudCBieSB3aGljaCB0aGlzIG5vZGUgaXMgdG8gYmUgbW92ZWQgaW4gdGhpcyBpdGVyYXRpb25cbiAgdGhpcy5kaXNwbGFjZW1lbnRYID0gMDtcbiAgdGhpcy5kaXNwbGFjZW1lbnRZID0gMDtcblxuICAvL1N0YXJ0IGFuZCBmaW5pc2ggZ3JpZCBjb29yZGluYXRlcyB0aGF0IHRoaXMgbm9kZSBpcyBmYWxsZW4gaW50b1xuICB0aGlzLnN0YXJ0WCA9IDA7XG4gIHRoaXMuZmluaXNoWCA9IDA7XG4gIHRoaXMuc3RhcnRZID0gMDtcbiAgdGhpcy5maW5pc2hZID0gMDtcblxuICAvL0dlb21ldHJpYyBuZWlnaGJvcnMgb2YgdGhpcyBub2RlXG4gIHRoaXMuc3Vycm91bmRpbmcgPSBbXTtcbn1cblxuRkRMYXlvdXROb2RlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTE5vZGUucHJvdG90eXBlKTtcblxuZm9yICh2YXIgcHJvcCBpbiBMTm9kZSkge1xuICBGRExheW91dE5vZGVbcHJvcF0gPSBMTm9kZVtwcm9wXTtcbn1cblxuRkRMYXlvdXROb2RlLnByb3RvdHlwZS5zZXRHcmlkQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAoX3N0YXJ0WCwgX2ZpbmlzaFgsIF9zdGFydFksIF9maW5pc2hZKVxue1xuICB0aGlzLnN0YXJ0WCA9IF9zdGFydFg7XG4gIHRoaXMuZmluaXNoWCA9IF9maW5pc2hYO1xuICB0aGlzLnN0YXJ0WSA9IF9zdGFydFk7XG4gIHRoaXMuZmluaXNoWSA9IF9maW5pc2hZO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZETGF5b3V0Tm9kZTtcbiIsInZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcblxuZnVuY3Rpb24gSGFzaE1hcCgpIHtcbiAgdGhpcy5tYXAgPSB7fTtcbiAgdGhpcy5rZXlzID0gW107XG59XG5cbkhhc2hNYXAucHJvdG90eXBlLnB1dCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIHZhciB0aGVJZCA9IFVuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEKGtleSk7XG4gIGlmICghdGhpcy5jb250YWlucyh0aGVJZCkpIHtcbiAgICB0aGlzLm1hcFt0aGVJZF0gPSB2YWx1ZTtcbiAgICB0aGlzLmtleXMucHVzaChrZXkpO1xuICB9XG59O1xuXG5IYXNoTWFwLnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQoa2V5KTtcbiAgcmV0dXJuIHRoaXMubWFwW2tleV0gIT0gbnVsbDtcbn07XG5cbkhhc2hNYXAucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQoa2V5KTtcbiAgcmV0dXJuIHRoaXMubWFwW3RoZUlkXTtcbn07XG5cbkhhc2hNYXAucHJvdG90eXBlLmtleVNldCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMua2V5cztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGFzaE1hcDtcbiIsInZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcblxuZnVuY3Rpb24gSGFzaFNldCgpIHtcbiAgdGhpcy5zZXQgPSB7fTtcbn1cbjtcblxuSGFzaFNldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG9iaikge1xuICB2YXIgdGhlSWQgPSBVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChvYmopO1xuICBpZiAoIXRoaXMuY29udGFpbnModGhlSWQpKVxuICAgIHRoaXMuc2V0W3RoZUlkXSA9IG9iajtcbn07XG5cbkhhc2hTZXQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgZGVsZXRlIHRoaXMuc2V0W1VuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEKG9iaildO1xufTtcblxuSGFzaFNldC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2V0ID0ge307XG59O1xuXG5IYXNoU2V0LnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIHRoaXMuc2V0W1VuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEKG9iaildID09IG9iajtcbn07XG5cbkhhc2hTZXQucHJvdG90eXBlLmlzRW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnNpemUoKSA9PT0gMDtcbn07XG5cbkhhc2hTZXQucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnNldCkubGVuZ3RoO1xufTtcblxuLy9jb25jYXRzIHRoaXMuc2V0IHRvIHRoZSBnaXZlbiBsaXN0XG5IYXNoU2V0LnByb3RvdHlwZS5hZGRBbGxUbyA9IGZ1bmN0aW9uIChsaXN0KSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5zZXQpO1xuICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBsaXN0LnB1c2godGhpcy5zZXRba2V5c1tpXV0pO1xuICB9XG59O1xuXG5IYXNoU2V0LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5zZXQpLmxlbmd0aDtcbn07XG5cbkhhc2hTZXQucHJvdG90eXBlLmFkZEFsbCA9IGZ1bmN0aW9uIChsaXN0KSB7XG4gIHZhciBzID0gbGlzdC5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKSB7XG4gICAgdmFyIHYgPSBsaXN0W2ldO1xuICAgIHRoaXMuYWRkKHYpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhhc2hTZXQ7XG4iLCJmdW5jdGlvbiBJR2VvbWV0cnkoKSB7XG59XG5cbklHZW9tZXRyeS5jYWxjU2VwYXJhdGlvbkFtb3VudCA9IGZ1bmN0aW9uIChyZWN0QSwgcmVjdEIsIG92ZXJsYXBBbW91bnQsIHNlcGFyYXRpb25CdWZmZXIpXG57XG4gIGlmICghcmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpIHtcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcbiAgfVxuICB2YXIgZGlyZWN0aW9ucyA9IG5ldyBBcnJheSgyKTtcbiAgSUdlb21ldHJ5LmRlY2lkZURpcmVjdGlvbnNGb3JPdmVybGFwcGluZ05vZGVzKHJlY3RBLCByZWN0QiwgZGlyZWN0aW9ucyk7XG4gIG92ZXJsYXBBbW91bnRbMF0gPSBNYXRoLm1pbihyZWN0QS5nZXRSaWdodCgpLCByZWN0Qi5nZXRSaWdodCgpKSAtXG4gICAgICAgICAgTWF0aC5tYXgocmVjdEEueCwgcmVjdEIueCk7XG4gIG92ZXJsYXBBbW91bnRbMV0gPSBNYXRoLm1pbihyZWN0QS5nZXRCb3R0b20oKSwgcmVjdEIuZ2V0Qm90dG9tKCkpIC1cbiAgICAgICAgICBNYXRoLm1heChyZWN0QS55LCByZWN0Qi55KTtcbiAgLy8gdXBkYXRlIHRoZSBvdmVybGFwcGluZyBhbW91bnRzIGZvciB0aGUgZm9sbG93aW5nIGNhc2VzOlxuICBpZiAoKHJlY3RBLmdldFgoKSA8PSByZWN0Qi5nZXRYKCkpICYmIChyZWN0QS5nZXRSaWdodCgpID49IHJlY3RCLmdldFJpZ2h0KCkpKVxuICB7XG4gICAgb3ZlcmxhcEFtb3VudFswXSArPSBNYXRoLm1pbigocmVjdEIuZ2V0WCgpIC0gcmVjdEEuZ2V0WCgpKSxcbiAgICAgICAgICAgIChyZWN0QS5nZXRSaWdodCgpIC0gcmVjdEIuZ2V0UmlnaHQoKSkpO1xuICB9XG4gIGVsc2UgaWYgKChyZWN0Qi5nZXRYKCkgPD0gcmVjdEEuZ2V0WCgpKSAmJiAocmVjdEIuZ2V0UmlnaHQoKSA+PSByZWN0QS5nZXRSaWdodCgpKSlcbiAge1xuICAgIG92ZXJsYXBBbW91bnRbMF0gKz0gTWF0aC5taW4oKHJlY3RBLmdldFgoKSAtIHJlY3RCLmdldFgoKSksXG4gICAgICAgICAgICAocmVjdEIuZ2V0UmlnaHQoKSAtIHJlY3RBLmdldFJpZ2h0KCkpKTtcbiAgfVxuICBpZiAoKHJlY3RBLmdldFkoKSA8PSByZWN0Qi5nZXRZKCkpICYmIChyZWN0QS5nZXRCb3R0b20oKSA+PSByZWN0Qi5nZXRCb3R0b20oKSkpXG4gIHtcbiAgICBvdmVybGFwQW1vdW50WzFdICs9IE1hdGgubWluKChyZWN0Qi5nZXRZKCkgLSByZWN0QS5nZXRZKCkpLFxuICAgICAgICAgICAgKHJlY3RBLmdldEJvdHRvbSgpIC0gcmVjdEIuZ2V0Qm90dG9tKCkpKTtcbiAgfVxuICBlbHNlIGlmICgocmVjdEIuZ2V0WSgpIDw9IHJlY3RBLmdldFkoKSkgJiYgKHJlY3RCLmdldEJvdHRvbSgpID49IHJlY3RBLmdldEJvdHRvbSgpKSlcbiAge1xuICAgIG92ZXJsYXBBbW91bnRbMV0gKz0gTWF0aC5taW4oKHJlY3RBLmdldFkoKSAtIHJlY3RCLmdldFkoKSksXG4gICAgICAgICAgICAocmVjdEIuZ2V0Qm90dG9tKCkgLSByZWN0QS5nZXRCb3R0b20oKSkpO1xuICB9XG5cbiAgLy8gZmluZCBzbG9wZSBvZiB0aGUgbGluZSBwYXNzZXMgdHdvIGNlbnRlcnNcbiAgdmFyIHNsb3BlID0gTWF0aC5hYnMoKHJlY3RCLmdldENlbnRlclkoKSAtIHJlY3RBLmdldENlbnRlclkoKSkgL1xuICAgICAgICAgIChyZWN0Qi5nZXRDZW50ZXJYKCkgLSByZWN0QS5nZXRDZW50ZXJYKCkpKTtcbiAgLy8gaWYgY2VudGVycyBhcmUgb3ZlcmxhcHBlZFxuICBpZiAoKHJlY3RCLmdldENlbnRlclkoKSA9PSByZWN0QS5nZXRDZW50ZXJZKCkpICYmXG4gICAgICAgICAgKHJlY3RCLmdldENlbnRlclgoKSA9PSByZWN0QS5nZXRDZW50ZXJYKCkpKVxuICB7XG4gICAgLy8gYXNzdW1lIHRoZSBzbG9wZSBpcyAxICg0NSBkZWdyZWUpXG4gICAgc2xvcGUgPSAxLjA7XG4gIH1cblxuICB2YXIgbW92ZUJ5WSA9IHNsb3BlICogb3ZlcmxhcEFtb3VudFswXTtcbiAgdmFyIG1vdmVCeVggPSBvdmVybGFwQW1vdW50WzFdIC8gc2xvcGU7XG4gIGlmIChvdmVybGFwQW1vdW50WzBdIDwgbW92ZUJ5WClcbiAge1xuICAgIG1vdmVCeVggPSBvdmVybGFwQW1vdW50WzBdO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIG1vdmVCeVkgPSBvdmVybGFwQW1vdW50WzFdO1xuICB9XG4gIC8vIHJldHVybiBoYWxmIHRoZSBhbW91bnQgc28gdGhhdCBpZiBlYWNoIHJlY3RhbmdsZSBpcyBtb3ZlZCBieSB0aGVzZVxuICAvLyBhbW91bnRzIGluIG9wcG9zaXRlIGRpcmVjdGlvbnMsIG92ZXJsYXAgd2lsbCBiZSByZXNvbHZlZFxuICBvdmVybGFwQW1vdW50WzBdID0gLTEgKiBkaXJlY3Rpb25zWzBdICogKChtb3ZlQnlYIC8gMikgKyBzZXBhcmF0aW9uQnVmZmVyKTtcbiAgb3ZlcmxhcEFtb3VudFsxXSA9IC0xICogZGlyZWN0aW9uc1sxXSAqICgobW92ZUJ5WSAvIDIpICsgc2VwYXJhdGlvbkJ1ZmZlcik7XG59XG5cbklHZW9tZXRyeS5kZWNpZGVEaXJlY3Rpb25zRm9yT3ZlcmxhcHBpbmdOb2RlcyA9IGZ1bmN0aW9uIChyZWN0QSwgcmVjdEIsIGRpcmVjdGlvbnMpXG57XG4gIGlmIChyZWN0QS5nZXRDZW50ZXJYKCkgPCByZWN0Qi5nZXRDZW50ZXJYKCkpXG4gIHtcbiAgICBkaXJlY3Rpb25zWzBdID0gLTE7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgZGlyZWN0aW9uc1swXSA9IDE7XG4gIH1cblxuICBpZiAocmVjdEEuZ2V0Q2VudGVyWSgpIDwgcmVjdEIuZ2V0Q2VudGVyWSgpKVxuICB7XG4gICAgZGlyZWN0aW9uc1sxXSA9IC0xO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIGRpcmVjdGlvbnNbMV0gPSAxO1xuICB9XG59XG5cbklHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24yID0gZnVuY3Rpb24gKHJlY3RBLCByZWN0QiwgcmVzdWx0KVxue1xuICAvL3Jlc3VsdFswLTFdIHdpbGwgY29udGFpbiBjbGlwUG9pbnQgb2YgcmVjdEEsIHJlc3VsdFsyLTNdIHdpbGwgY29udGFpbiBjbGlwUG9pbnQgb2YgcmVjdEJcbiAgdmFyIHAxeCA9IHJlY3RBLmdldENlbnRlclgoKTtcbiAgdmFyIHAxeSA9IHJlY3RBLmdldENlbnRlclkoKTtcbiAgdmFyIHAyeCA9IHJlY3RCLmdldENlbnRlclgoKTtcbiAgdmFyIHAyeSA9IHJlY3RCLmdldENlbnRlclkoKTtcblxuICAvL2lmIHR3byByZWN0YW5nbGVzIGludGVyc2VjdCwgdGhlbiBjbGlwcGluZyBwb2ludHMgYXJlIGNlbnRlcnNcbiAgaWYgKHJlY3RBLmludGVyc2VjdHMocmVjdEIpKVxuICB7XG4gICAgcmVzdWx0WzBdID0gcDF4O1xuICAgIHJlc3VsdFsxXSA9IHAxeTtcbiAgICByZXN1bHRbMl0gPSBwMng7XG4gICAgcmVzdWx0WzNdID0gcDJ5O1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIC8vdmFyaWFibGVzIGZvciByZWN0QVxuICB2YXIgdG9wTGVmdEF4ID0gcmVjdEEuZ2V0WCgpO1xuICB2YXIgdG9wTGVmdEF5ID0gcmVjdEEuZ2V0WSgpO1xuICB2YXIgdG9wUmlnaHRBeCA9IHJlY3RBLmdldFJpZ2h0KCk7XG4gIHZhciBib3R0b21MZWZ0QXggPSByZWN0QS5nZXRYKCk7XG4gIHZhciBib3R0b21MZWZ0QXkgPSByZWN0QS5nZXRCb3R0b20oKTtcbiAgdmFyIGJvdHRvbVJpZ2h0QXggPSByZWN0QS5nZXRSaWdodCgpO1xuICB2YXIgaGFsZldpZHRoQSA9IHJlY3RBLmdldFdpZHRoSGFsZigpO1xuICB2YXIgaGFsZkhlaWdodEEgPSByZWN0QS5nZXRIZWlnaHRIYWxmKCk7XG4gIC8vdmFyaWFibGVzIGZvciByZWN0QlxuICB2YXIgdG9wTGVmdEJ4ID0gcmVjdEIuZ2V0WCgpO1xuICB2YXIgdG9wTGVmdEJ5ID0gcmVjdEIuZ2V0WSgpO1xuICB2YXIgdG9wUmlnaHRCeCA9IHJlY3RCLmdldFJpZ2h0KCk7XG4gIHZhciBib3R0b21MZWZ0QnggPSByZWN0Qi5nZXRYKCk7XG4gIHZhciBib3R0b21MZWZ0QnkgPSByZWN0Qi5nZXRCb3R0b20oKTtcbiAgdmFyIGJvdHRvbVJpZ2h0QnggPSByZWN0Qi5nZXRSaWdodCgpO1xuICB2YXIgaGFsZldpZHRoQiA9IHJlY3RCLmdldFdpZHRoSGFsZigpO1xuICB2YXIgaGFsZkhlaWdodEIgPSByZWN0Qi5nZXRIZWlnaHRIYWxmKCk7XG4gIC8vZmxhZyB3aGV0aGVyIGNsaXBwaW5nIHBvaW50cyBhcmUgZm91bmRcbiAgdmFyIGNsaXBQb2ludEFGb3VuZCA9IGZhbHNlO1xuICB2YXIgY2xpcFBvaW50QkZvdW5kID0gZmFsc2U7XG5cbiAgLy8gbGluZSBpcyB2ZXJ0aWNhbFxuICBpZiAocDF4ID09IHAyeClcbiAge1xuICAgIGlmIChwMXkgPiBwMnkpXG4gICAge1xuICAgICAgcmVzdWx0WzBdID0gcDF4O1xuICAgICAgcmVzdWx0WzFdID0gdG9wTGVmdEF5O1xuICAgICAgcmVzdWx0WzJdID0gcDJ4O1xuICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIGlmIChwMXkgPCBwMnkpXG4gICAge1xuICAgICAgcmVzdWx0WzBdID0gcDF4O1xuICAgICAgcmVzdWx0WzFdID0gYm90dG9tTGVmdEF5O1xuICAgICAgcmVzdWx0WzJdID0gcDJ4O1xuICAgICAgcmVzdWx0WzNdID0gdG9wTGVmdEJ5O1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgLy9ub3QgbGluZSwgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG4gIC8vIGxpbmUgaXMgaG9yaXpvbnRhbFxuICBlbHNlIGlmIChwMXkgPT0gcDJ5KVxuICB7XG4gICAgaWYgKHAxeCA+IHAyeClcbiAgICB7XG4gICAgICByZXN1bHRbMF0gPSB0b3BMZWZ0QXg7XG4gICAgICByZXN1bHRbMV0gPSBwMXk7XG4gICAgICByZXN1bHRbMl0gPSB0b3BSaWdodEJ4O1xuICAgICAgcmVzdWx0WzNdID0gcDJ5O1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIGlmIChwMXggPCBwMngpXG4gICAge1xuICAgICAgcmVzdWx0WzBdID0gdG9wUmlnaHRBeDtcbiAgICAgIHJlc3VsdFsxXSA9IHAxeTtcbiAgICAgIHJlc3VsdFsyXSA9IHRvcExlZnRCeDtcbiAgICAgIHJlc3VsdFszXSA9IHAyeTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIC8vbm90IHZhbGlkIGxpbmUsIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuICBlbHNlXG4gIHtcbiAgICAvL3Nsb3BlcyBvZiByZWN0QSdzIGFuZCByZWN0QidzIGRpYWdvbmFsc1xuICAgIHZhciBzbG9wZUEgPSByZWN0QS5oZWlnaHQgLyByZWN0QS53aWR0aDtcbiAgICB2YXIgc2xvcGVCID0gcmVjdEIuaGVpZ2h0IC8gcmVjdEIud2lkdGg7XG5cbiAgICAvL3Nsb3BlIG9mIGxpbmUgYmV0d2VlbiBjZW50ZXIgb2YgcmVjdEEgYW5kIGNlbnRlciBvZiByZWN0QlxuICAgIHZhciBzbG9wZVByaW1lID0gKHAyeSAtIHAxeSkgLyAocDJ4IC0gcDF4KTtcbiAgICB2YXIgY2FyZGluYWxEaXJlY3Rpb25BO1xuICAgIHZhciBjYXJkaW5hbERpcmVjdGlvbkI7XG4gICAgdmFyIHRlbXBQb2ludEF4O1xuICAgIHZhciB0ZW1wUG9pbnRBeTtcbiAgICB2YXIgdGVtcFBvaW50Qng7XG4gICAgdmFyIHRlbXBQb2ludEJ5O1xuXG4gICAgLy9kZXRlcm1pbmUgd2hldGhlciBjbGlwcGluZyBwb2ludCBpcyB0aGUgY29ybmVyIG9mIG5vZGVBXG4gICAgaWYgKCgtc2xvcGVBKSA9PSBzbG9wZVByaW1lKVxuICAgIHtcbiAgICAgIGlmIChwMXggPiBwMngpXG4gICAgICB7XG4gICAgICAgIHJlc3VsdFswXSA9IGJvdHRvbUxlZnRBeDtcbiAgICAgICAgcmVzdWx0WzFdID0gYm90dG9tTGVmdEF5O1xuICAgICAgICBjbGlwUG9pbnRBRm91bmQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICByZXN1bHRbMF0gPSB0b3BSaWdodEF4O1xuICAgICAgICByZXN1bHRbMV0gPSB0b3BMZWZ0QXk7XG4gICAgICAgIGNsaXBQb2ludEFGb3VuZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHNsb3BlQSA9PSBzbG9wZVByaW1lKVxuICAgIHtcbiAgICAgIGlmIChwMXggPiBwMngpXG4gICAgICB7XG4gICAgICAgIHJlc3VsdFswXSA9IHRvcExlZnRBeDtcbiAgICAgICAgcmVzdWx0WzFdID0gdG9wTGVmdEF5O1xuICAgICAgICBjbGlwUG9pbnRBRm91bmQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICByZXN1bHRbMF0gPSBib3R0b21SaWdodEF4O1xuICAgICAgICByZXN1bHRbMV0gPSBib3R0b21MZWZ0QXk7XG4gICAgICAgIGNsaXBQb2ludEFGb3VuZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9kZXRlcm1pbmUgd2hldGhlciBjbGlwcGluZyBwb2ludCBpcyB0aGUgY29ybmVyIG9mIG5vZGVCXG4gICAgaWYgKCgtc2xvcGVCKSA9PSBzbG9wZVByaW1lKVxuICAgIHtcbiAgICAgIGlmIChwMnggPiBwMXgpXG4gICAgICB7XG4gICAgICAgIHJlc3VsdFsyXSA9IGJvdHRvbUxlZnRCeDtcbiAgICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xuICAgICAgICBjbGlwUG9pbnRCRm91bmQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICByZXN1bHRbMl0gPSB0b3BSaWdodEJ4O1xuICAgICAgICByZXN1bHRbM10gPSB0b3BMZWZ0Qnk7XG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHNsb3BlQiA9PSBzbG9wZVByaW1lKVxuICAgIHtcbiAgICAgIGlmIChwMnggPiBwMXgpXG4gICAgICB7XG4gICAgICAgIHJlc3VsdFsyXSA9IHRvcExlZnRCeDtcbiAgICAgICAgcmVzdWx0WzNdID0gdG9wTGVmdEJ5O1xuICAgICAgICBjbGlwUG9pbnRCRm91bmQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICByZXN1bHRbMl0gPSBib3R0b21SaWdodEJ4O1xuICAgICAgICByZXN1bHRbM10gPSBib3R0b21MZWZ0Qnk7XG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9pZiBib3RoIGNsaXBwaW5nIHBvaW50cyBhcmUgY29ybmVyc1xuICAgIGlmIChjbGlwUG9pbnRBRm91bmQgJiYgY2xpcFBvaW50QkZvdW5kKVxuICAgIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvL2RldGVybWluZSBDYXJkaW5hbCBEaXJlY3Rpb24gb2YgcmVjdGFuZ2xlc1xuICAgIGlmIChwMXggPiBwMngpXG4gICAge1xuICAgICAgaWYgKHAxeSA+IHAyeSlcbiAgICAgIHtcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25BID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKHNsb3BlQSwgc2xvcGVQcmltZSwgNCk7XG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQiA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbihzbG9wZUIsIHNsb3BlUHJpbWUsIDIpO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oLXNsb3BlQSwgc2xvcGVQcmltZSwgMyk7XG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQiA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbigtc2xvcGVCLCBzbG9wZVByaW1lLCAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIGlmIChwMXkgPiBwMnkpXG4gICAgICB7XG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQSA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbigtc2xvcGVBLCBzbG9wZVByaW1lLCAxKTtcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKC1zbG9wZUIsIHNsb3BlUHJpbWUsIDMpO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oc2xvcGVBLCBzbG9wZVByaW1lLCAyKTtcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKHNsb3BlQiwgc2xvcGVQcmltZSwgNCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vY2FsY3VsYXRlIGNsaXBwaW5nIFBvaW50IGlmIGl0IGlzIG5vdCBmb3VuZCBiZWZvcmVcbiAgICBpZiAoIWNsaXBQb2ludEFGb3VuZClcbiAgICB7XG4gICAgICBzd2l0Y2ggKGNhcmRpbmFsRGlyZWN0aW9uQSlcbiAgICAgIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHRlbXBQb2ludEF5ID0gdG9wTGVmdEF5O1xuICAgICAgICAgIHRlbXBQb2ludEF4ID0gcDF4ICsgKC1oYWxmSGVpZ2h0QSkgLyBzbG9wZVByaW1lO1xuICAgICAgICAgIHJlc3VsdFswXSA9IHRlbXBQb2ludEF4O1xuICAgICAgICAgIHJlc3VsdFsxXSA9IHRlbXBQb2ludEF5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgdGVtcFBvaW50QXggPSBib3R0b21SaWdodEF4O1xuICAgICAgICAgIHRlbXBQb2ludEF5ID0gcDF5ICsgaGFsZldpZHRoQSAqIHNsb3BlUHJpbWU7XG4gICAgICAgICAgcmVzdWx0WzBdID0gdGVtcFBvaW50QXg7XG4gICAgICAgICAgcmVzdWx0WzFdID0gdGVtcFBvaW50QXk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICB0ZW1wUG9pbnRBeSA9IGJvdHRvbUxlZnRBeTtcbiAgICAgICAgICB0ZW1wUG9pbnRBeCA9IHAxeCArIGhhbGZIZWlnaHRBIC8gc2xvcGVQcmltZTtcbiAgICAgICAgICByZXN1bHRbMF0gPSB0ZW1wUG9pbnRBeDtcbiAgICAgICAgICByZXN1bHRbMV0gPSB0ZW1wUG9pbnRBeTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHRlbXBQb2ludEF4ID0gYm90dG9tTGVmdEF4O1xuICAgICAgICAgIHRlbXBQb2ludEF5ID0gcDF5ICsgKC1oYWxmV2lkdGhBKSAqIHNsb3BlUHJpbWU7XG4gICAgICAgICAgcmVzdWx0WzBdID0gdGVtcFBvaW50QXg7XG4gICAgICAgICAgcmVzdWx0WzFdID0gdGVtcFBvaW50QXk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghY2xpcFBvaW50QkZvdW5kKVxuICAgIHtcbiAgICAgIHN3aXRjaCAoY2FyZGluYWxEaXJlY3Rpb25CKVxuICAgICAge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgdGVtcFBvaW50QnkgPSB0b3BMZWZ0Qnk7XG4gICAgICAgICAgdGVtcFBvaW50QnggPSBwMnggKyAoLWhhbGZIZWlnaHRCKSAvIHNsb3BlUHJpbWU7XG4gICAgICAgICAgcmVzdWx0WzJdID0gdGVtcFBvaW50Qng7XG4gICAgICAgICAgcmVzdWx0WzNdID0gdGVtcFBvaW50Qnk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICB0ZW1wUG9pbnRCeCA9IGJvdHRvbVJpZ2h0Qng7XG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBwMnkgKyBoYWxmV2lkdGhCICogc2xvcGVQcmltZTtcbiAgICAgICAgICByZXN1bHRbMl0gPSB0ZW1wUG9pbnRCeDtcbiAgICAgICAgICByZXN1bHRbM10gPSB0ZW1wUG9pbnRCeTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHRlbXBQb2ludEJ5ID0gYm90dG9tTGVmdEJ5O1xuICAgICAgICAgIHRlbXBQb2ludEJ4ID0gcDJ4ICsgaGFsZkhlaWdodEIgLyBzbG9wZVByaW1lO1xuICAgICAgICAgIHJlc3VsdFsyXSA9IHRlbXBQb2ludEJ4O1xuICAgICAgICAgIHJlc3VsdFszXSA9IHRlbXBQb2ludEJ5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgdGVtcFBvaW50QnggPSBib3R0b21MZWZ0Qng7XG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBwMnkgKyAoLWhhbGZXaWR0aEIpICogc2xvcGVQcmltZTtcbiAgICAgICAgICByZXN1bHRbMl0gPSB0ZW1wUG9pbnRCeDtcbiAgICAgICAgICByZXN1bHRbM10gPSB0ZW1wUG9pbnRCeTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5JR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24gPSBmdW5jdGlvbiAoc2xvcGUsIHNsb3BlUHJpbWUsIGxpbmUpXG57XG4gIGlmIChzbG9wZSA+IHNsb3BlUHJpbWUpXG4gIHtcbiAgICByZXR1cm4gbGluZTtcbiAgfVxuICBlbHNlXG4gIHtcbiAgICByZXR1cm4gMSArIGxpbmUgJSA0O1xuICB9XG59XG5cbklHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24gPSBmdW5jdGlvbiAoczEsIHMyLCBmMSwgZjIpXG57XG4gIGlmIChmMiA9PSBudWxsKSB7XG4gICAgcmV0dXJuIElHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24yKHMxLCBzMiwgZjEpO1xuICB9XG4gIHZhciB4MSA9IHMxLng7XG4gIHZhciB5MSA9IHMxLnk7XG4gIHZhciB4MiA9IHMyLng7XG4gIHZhciB5MiA9IHMyLnk7XG4gIHZhciB4MyA9IGYxLng7XG4gIHZhciB5MyA9IGYxLnk7XG4gIHZhciB4NCA9IGYyLng7XG4gIHZhciB5NCA9IGYyLnk7XG4gIHZhciB4LCB5OyAvLyBpbnRlcnNlY3Rpb24gcG9pbnRcbiAgdmFyIGExLCBhMiwgYjEsIGIyLCBjMSwgYzI7IC8vIGNvZWZmaWNpZW50cyBvZiBsaW5lIGVxbnMuXG4gIHZhciBkZW5vbTtcblxuICBhMSA9IHkyIC0geTE7XG4gIGIxID0geDEgLSB4MjtcbiAgYzEgPSB4MiAqIHkxIC0geDEgKiB5MjsgIC8vIHsgYTEqeCArIGIxKnkgKyBjMSA9IDAgaXMgbGluZSAxIH1cblxuICBhMiA9IHk0IC0geTM7XG4gIGIyID0geDMgLSB4NDtcbiAgYzIgPSB4NCAqIHkzIC0geDMgKiB5NDsgIC8vIHsgYTIqeCArIGIyKnkgKyBjMiA9IDAgaXMgbGluZSAyIH1cblxuICBkZW5vbSA9IGExICogYjIgLSBhMiAqIGIxO1xuXG4gIGlmIChkZW5vbSA9PSAwKVxuICB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB4ID0gKGIxICogYzIgLSBiMiAqIGMxKSAvIGRlbm9tO1xuICB5ID0gKGEyICogYzEgLSBhMSAqIGMyKSAvIGRlbm9tO1xuXG4gIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBTZWN0aW9uOiBDbGFzcyBDb25zdGFudHNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFNvbWUgdXNlZnVsIHByZS1jYWxjdWxhdGVkIGNvbnN0YW50c1xuICovXG5JR2VvbWV0cnkuSEFMRl9QSSA9IDAuNSAqIE1hdGguUEk7XG5JR2VvbWV0cnkuT05FX0FORF9IQUxGX1BJID0gMS41ICogTWF0aC5QSTtcbklHZW9tZXRyeS5UV09fUEkgPSAyLjAgKiBNYXRoLlBJO1xuSUdlb21ldHJ5LlRIUkVFX1BJID0gMy4wICogTWF0aC5QSTtcblxubW9kdWxlLmV4cG9ydHMgPSBJR2VvbWV0cnk7XG4iLCJmdW5jdGlvbiBJTWF0aCgpIHtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBzaWduIG9mIHRoZSBpbnB1dCB2YWx1ZS5cbiAqL1xuSU1hdGguc2lnbiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgPiAwKVxuICB7XG4gICAgcmV0dXJuIDE7XG4gIH1cbiAgZWxzZSBpZiAodmFsdWUgPCAwKVxuICB7XG4gICAgcmV0dXJuIC0xO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIHJldHVybiAwO1xuICB9XG59XG5cbklNYXRoLmZsb29yID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA8IDAgPyBNYXRoLmNlaWwodmFsdWUpIDogTWF0aC5mbG9vcih2YWx1ZSk7XG59XG5cbklNYXRoLmNlaWwgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlIDwgMCA/IE1hdGguZmxvb3IodmFsdWUpIDogTWF0aC5jZWlsKHZhbHVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJTWF0aDtcbiIsImZ1bmN0aW9uIEludGVnZXIoKSB7XG59XG5cbkludGVnZXIuTUFYX1ZBTFVFID0gMjE0NzQ4MzY0NztcbkludGVnZXIuTUlOX1ZBTFVFID0gLTIxNDc0ODM2NDg7XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZWdlcjtcbiIsInZhciBMR3JhcGhPYmplY3QgPSByZXF1aXJlKCcuL0xHcmFwaE9iamVjdCcpO1xudmFyIElHZW9tZXRyeSA9IHJlcXVpcmUoJy4vSUdlb21ldHJ5Jyk7XG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XG5cbmZ1bmN0aW9uIExFZGdlKHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSkge1xuICBMR3JhcGhPYmplY3QuY2FsbCh0aGlzLCB2RWRnZSk7XG5cbiAgdGhpcy5pc092ZXJsYXBpbmdTb3VyY2VBbmRUYXJnZXQgPSBmYWxzZTtcbiAgdGhpcy52R3JhcGhPYmplY3QgPSB2RWRnZTtcbiAgdGhpcy5iZW5kcG9pbnRzID0gW107XG4gIHRoaXMuc291cmNlID0gc291cmNlO1xuICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbn1cblxuTEVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGhPYmplY3QucHJvdG90eXBlKTtcblxuZm9yICh2YXIgcHJvcCBpbiBMR3JhcGhPYmplY3QpIHtcbiAgTEVkZ2VbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XG59XG5cbkxFZGdlLnByb3RvdHlwZS5nZXRTb3VyY2UgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5zb3VyY2U7XG59O1xuXG5MRWRnZS5wcm90b3R5cGUuZ2V0VGFyZ2V0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMudGFyZ2V0O1xufTtcblxuTEVkZ2UucHJvdG90eXBlLmlzSW50ZXJHcmFwaCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmlzSW50ZXJHcmFwaDtcbn07XG5cbkxFZGdlLnByb3RvdHlwZS5nZXRMZW5ndGggPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5sZW5ndGg7XG59O1xuXG5MRWRnZS5wcm90b3R5cGUuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0O1xufTtcblxuTEVkZ2UucHJvdG90eXBlLmdldEJlbmRwb2ludHMgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5iZW5kcG9pbnRzO1xufTtcblxuTEVkZ2UucHJvdG90eXBlLmdldExjYSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmxjYTtcbn07XG5cbkxFZGdlLnByb3RvdHlwZS5nZXRTb3VyY2VJbkxjYSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnNvdXJjZUluTGNhO1xufTtcblxuTEVkZ2UucHJvdG90eXBlLmdldFRhcmdldEluTGNhID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMudGFyZ2V0SW5MY2E7XG59O1xuXG5MRWRnZS5wcm90b3R5cGUuZ2V0T3RoZXJFbmQgPSBmdW5jdGlvbiAobm9kZSlcbntcbiAgaWYgKHRoaXMuc291cmNlID09PSBub2RlKVxuICB7XG4gICAgcmV0dXJuIHRoaXMudGFyZ2V0O1xuICB9XG4gIGVsc2UgaWYgKHRoaXMudGFyZ2V0ID09PSBub2RlKVxuICB7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIHRocm93IFwiTm9kZSBpcyBub3QgaW5jaWRlbnQgd2l0aCB0aGlzIGVkZ2VcIjtcbiAgfVxufVxuXG5MRWRnZS5wcm90b3R5cGUuZ2V0T3RoZXJFbmRJbkdyYXBoID0gZnVuY3Rpb24gKG5vZGUsIGdyYXBoKVxue1xuICB2YXIgb3RoZXJFbmQgPSB0aGlzLmdldE90aGVyRW5kKG5vZGUpO1xuICB2YXIgcm9vdCA9IGdyYXBoLmdldEdyYXBoTWFuYWdlcigpLmdldFJvb3QoKTtcblxuICB3aGlsZSAodHJ1ZSlcbiAge1xuICAgIGlmIChvdGhlckVuZC5nZXRPd25lcigpID09IGdyYXBoKVxuICAgIHtcbiAgICAgIHJldHVybiBvdGhlckVuZDtcbiAgICB9XG5cbiAgICBpZiAob3RoZXJFbmQuZ2V0T3duZXIoKSA9PSByb290KVxuICAgIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIG90aGVyRW5kID0gb3RoZXJFbmQuZ2V0T3duZXIoKS5nZXRQYXJlbnQoKTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuTEVkZ2UucHJvdG90eXBlLnVwZGF0ZUxlbmd0aCA9IGZ1bmN0aW9uICgpXG57XG4gIHZhciBjbGlwUG9pbnRDb29yZGluYXRlcyA9IG5ldyBBcnJheSg0KTtcblxuICB0aGlzLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldCA9XG4gICAgICAgICAgSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbih0aGlzLnRhcmdldC5nZXRSZWN0KCksXG4gICAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZS5nZXRSZWN0KCksXG4gICAgICAgICAgICAgICAgICBjbGlwUG9pbnRDb29yZGluYXRlcyk7XG5cbiAgaWYgKCF0aGlzLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldClcbiAge1xuICAgIHRoaXMubGVuZ3RoWCA9IGNsaXBQb2ludENvb3JkaW5hdGVzWzBdIC0gY2xpcFBvaW50Q29vcmRpbmF0ZXNbMl07XG4gICAgdGhpcy5sZW5ndGhZID0gY2xpcFBvaW50Q29vcmRpbmF0ZXNbMV0gLSBjbGlwUG9pbnRDb29yZGluYXRlc1szXTtcblxuICAgIGlmIChNYXRoLmFicyh0aGlzLmxlbmd0aFgpIDwgMS4wKVxuICAgIHtcbiAgICAgIHRoaXMubGVuZ3RoWCA9IElNYXRoLnNpZ24odGhpcy5sZW5ndGhYKTtcbiAgICB9XG5cbiAgICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhZKSA8IDEuMClcbiAgICB7XG4gICAgICB0aGlzLmxlbmd0aFkgPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWSk7XG4gICAgfVxuXG4gICAgdGhpcy5sZW5ndGggPSBNYXRoLnNxcnQoXG4gICAgICAgICAgICB0aGlzLmxlbmd0aFggKiB0aGlzLmxlbmd0aFggKyB0aGlzLmxlbmd0aFkgKiB0aGlzLmxlbmd0aFkpO1xuICB9XG59O1xuXG5MRWRnZS5wcm90b3R5cGUudXBkYXRlTGVuZ3RoU2ltcGxlID0gZnVuY3Rpb24gKClcbntcbiAgdGhpcy5sZW5ndGhYID0gdGhpcy50YXJnZXQuZ2V0Q2VudGVyWCgpIC0gdGhpcy5zb3VyY2UuZ2V0Q2VudGVyWCgpO1xuICB0aGlzLmxlbmd0aFkgPSB0aGlzLnRhcmdldC5nZXRDZW50ZXJZKCkgLSB0aGlzLnNvdXJjZS5nZXRDZW50ZXJZKCk7XG5cbiAgaWYgKE1hdGguYWJzKHRoaXMubGVuZ3RoWCkgPCAxLjApXG4gIHtcbiAgICB0aGlzLmxlbmd0aFggPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWCk7XG4gIH1cblxuICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhZKSA8IDEuMClcbiAge1xuICAgIHRoaXMubGVuZ3RoWSA9IElNYXRoLnNpZ24odGhpcy5sZW5ndGhZKTtcbiAgfVxuXG4gIHRoaXMubGVuZ3RoID0gTWF0aC5zcXJ0KFxuICAgICAgICAgIHRoaXMubGVuZ3RoWCAqIHRoaXMubGVuZ3RoWCArIHRoaXMubGVuZ3RoWSAqIHRoaXMubGVuZ3RoWSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTEVkZ2U7XG4iLCJ2YXIgTEdyYXBoT2JqZWN0ID0gcmVxdWlyZSgnLi9MR3JhcGhPYmplY3QnKTtcbnZhciBJbnRlZ2VyID0gcmVxdWlyZSgnLi9JbnRlZ2VyJyk7XG52YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcbnZhciBMR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9MR3JhcGhNYW5hZ2VyJyk7XG52YXIgTE5vZGUgPSByZXF1aXJlKCcuL0xOb2RlJyk7XG52YXIgTEVkZ2UgPSByZXF1aXJlKCcuL0xFZGdlJyk7XG52YXIgSGFzaFNldCA9IHJlcXVpcmUoJy4vSGFzaFNldCcpO1xudmFyIFJlY3RhbmdsZUQgPSByZXF1aXJlKCcuL1JlY3RhbmdsZUQnKTtcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vUG9pbnQnKTtcblxuZnVuY3Rpb24gTEdyYXBoKHBhcmVudCwgb2JqMiwgdkdyYXBoKSB7XG4gIExHcmFwaE9iamVjdC5jYWxsKHRoaXMsIHZHcmFwaCk7XG4gIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IEludGVnZXIuTUlOX1ZBTFVFO1xuICB0aGlzLm1hcmdpbiA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVBIX01BUkdJTjtcbiAgdGhpcy5lZGdlcyA9IFtdO1xuICB0aGlzLm5vZGVzID0gW107XG4gIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG5cbiAgaWYgKG9iajIgIT0gbnVsbCAmJiBvYmoyIGluc3RhbmNlb2YgTEdyYXBoTWFuYWdlcikge1xuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyID0gb2JqMjtcbiAgfVxuICBlbHNlIGlmIChvYmoyICE9IG51bGwgJiYgb2JqMiBpbnN0YW5jZW9mIExheW91dCkge1xuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyID0gb2JqMi5ncmFwaE1hbmFnZXI7XG4gIH1cbn1cblxuTEdyYXBoLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEdyYXBoT2JqZWN0LnByb3RvdHlwZSk7XG5mb3IgKHZhciBwcm9wIGluIExHcmFwaE9iamVjdCkge1xuICBMR3JhcGhbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XG59XG5cbkxHcmFwaC5wcm90b3R5cGUuZ2V0Tm9kZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm5vZGVzO1xufTtcblxuTEdyYXBoLnByb3RvdHlwZS5nZXRFZGdlcyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuZWRnZXM7XG59O1xuXG5MR3JhcGgucHJvdG90eXBlLmdldEdyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmdyYXBoTWFuYWdlcjtcbn07XG5cbkxHcmFwaC5wcm90b3R5cGUuZ2V0UGFyZW50ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMucGFyZW50O1xufTtcblxuTEdyYXBoLnByb3RvdHlwZS5nZXRMZWZ0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMubGVmdDtcbn07XG5cbkxHcmFwaC5wcm90b3R5cGUuZ2V0UmlnaHQgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yaWdodDtcbn07XG5cbkxHcmFwaC5wcm90b3R5cGUuZ2V0VG9wID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMudG9wO1xufTtcblxuTEdyYXBoLnByb3RvdHlwZS5nZXRCb3R0b20gPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5ib3R0b207XG59O1xuXG5MR3JhcGgucHJvdG90eXBlLmlzQ29ubmVjdGVkID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMuaXNDb25uZWN0ZWQ7XG59O1xuXG5MR3JhcGgucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChvYmoxLCBzb3VyY2VOb2RlLCB0YXJnZXROb2RlKSB7XG4gIGlmIChzb3VyY2VOb2RlID09IG51bGwgJiYgdGFyZ2V0Tm9kZSA9PSBudWxsKSB7XG4gICAgdmFyIG5ld05vZGUgPSBvYmoxO1xuICAgIGlmICh0aGlzLmdyYXBoTWFuYWdlciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBcIkdyYXBoIGhhcyBubyBncmFwaCBtZ3IhXCI7XG4gICAgfVxuICAgIGlmICh0aGlzLmdldE5vZGVzKCkuaW5kZXhPZihuZXdOb2RlKSA+IC0xKSB7XG4gICAgICB0aHJvdyBcIk5vZGUgYWxyZWFkeSBpbiBncmFwaCFcIjtcbiAgICB9XG4gICAgbmV3Tm9kZS5vd25lciA9IHRoaXM7XG4gICAgdGhpcy5nZXROb2RlcygpLnB1c2gobmV3Tm9kZSk7XG5cbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfVxuICBlbHNlIHtcbiAgICB2YXIgbmV3RWRnZSA9IG9iajE7XG4gICAgaWYgKCEodGhpcy5nZXROb2RlcygpLmluZGV4T2Yoc291cmNlTm9kZSkgPiAtMSAmJiAodGhpcy5nZXROb2RlcygpLmluZGV4T2YodGFyZ2V0Tm9kZSkpID4gLTEpKSB7XG4gICAgICB0aHJvdyBcIlNvdXJjZSBvciB0YXJnZXQgbm90IGluIGdyYXBoIVwiO1xuICAgIH1cblxuICAgIGlmICghKHNvdXJjZU5vZGUub3duZXIgPT0gdGFyZ2V0Tm9kZS5vd25lciAmJiBzb3VyY2VOb2RlLm93bmVyID09IHRoaXMpKSB7XG4gICAgICB0aHJvdyBcIkJvdGggb3duZXJzIG11c3QgYmUgdGhpcyBncmFwaCFcIjtcbiAgICB9XG5cbiAgICBpZiAoc291cmNlTm9kZS5vd25lciAhPSB0YXJnZXROb2RlLm93bmVyKVxuICAgIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIHNldCBzb3VyY2UgYW5kIHRhcmdldFxuICAgIG5ld0VkZ2Uuc291cmNlID0gc291cmNlTm9kZTtcbiAgICBuZXdFZGdlLnRhcmdldCA9IHRhcmdldE5vZGU7XG5cbiAgICAvLyBzZXQgYXMgaW50cmEtZ3JhcGggZWRnZVxuICAgIG5ld0VkZ2UuaXNJbnRlckdyYXBoID0gZmFsc2U7XG5cbiAgICAvLyBhZGQgdG8gZ3JhcGggZWRnZSBsaXN0XG4gICAgdGhpcy5nZXRFZGdlcygpLnB1c2gobmV3RWRnZSk7XG5cbiAgICAvLyBhZGQgdG8gaW5jaWRlbmN5IGxpc3RzXG4gICAgc291cmNlTm9kZS5lZGdlcy5wdXNoKG5ld0VkZ2UpO1xuXG4gICAgaWYgKHRhcmdldE5vZGUgIT0gc291cmNlTm9kZSlcbiAgICB7XG4gICAgICB0YXJnZXROb2RlLmVkZ2VzLnB1c2gobmV3RWRnZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld0VkZ2U7XG4gIH1cbn07XG5cbkxHcmFwaC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKG9iaikge1xuICB2YXIgbm9kZSA9IG9iajtcbiAgaWYgKG9iaiBpbnN0YW5jZW9mIExOb2RlKSB7XG4gICAgaWYgKG5vZGUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgXCJOb2RlIGlzIG51bGwhXCI7XG4gICAgfVxuICAgIGlmICghKG5vZGUub3duZXIgIT0gbnVsbCAmJiBub2RlLm93bmVyID09IHRoaXMpKSB7XG4gICAgICB0aHJvdyBcIk93bmVyIGdyYXBoIGlzIGludmFsaWQhXCI7XG4gICAgfVxuICAgIGlmICh0aGlzLmdyYXBoTWFuYWdlciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBcIk93bmVyIGdyYXBoIG1hbmFnZXIgaXMgaW52YWxpZCFcIjtcbiAgICB9XG4gICAgLy8gcmVtb3ZlIGluY2lkZW50IGVkZ2VzIGZpcnN0IChtYWtlIGEgY29weSB0byBkbyBpdCBzYWZlbHkpXG4gICAgdmFyIGVkZ2VzVG9CZVJlbW92ZWQgPSBub2RlLmVkZ2VzLnNsaWNlKCk7XG4gICAgdmFyIGVkZ2U7XG4gICAgdmFyIHMgPSBlZGdlc1RvQmVSZW1vdmVkLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAgICB7XG4gICAgICBlZGdlID0gZWRnZXNUb0JlUmVtb3ZlZFtpXTtcblxuICAgICAgaWYgKGVkZ2UuaXNJbnRlckdyYXBoKVxuICAgICAge1xuICAgICAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUoZWRnZSk7XG4gICAgICB9XG4gICAgICBlbHNlXG4gICAgICB7XG4gICAgICAgIGVkZ2Uuc291cmNlLm93bmVyLnJlbW92ZShlZGdlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBub3cgdGhlIG5vZGUgaXRzZWxmXG4gICAgdmFyIGluZGV4ID0gdGhpcy5ub2Rlcy5pbmRleE9mKG5vZGUpO1xuICAgIGlmIChpbmRleCA9PSAtMSkge1xuICAgICAgdGhyb3cgXCJOb2RlIG5vdCBpbiBvd25lciBub2RlIGxpc3QhXCI7XG4gICAgfVxuXG4gICAgdGhpcy5ub2Rlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG4gIGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIExFZGdlKSB7XG4gICAgdmFyIGVkZ2UgPSBvYmo7XG4gICAgaWYgKGVkZ2UgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgXCJFZGdlIGlzIG51bGwhXCI7XG4gICAgfVxuICAgIGlmICghKGVkZ2Uuc291cmNlICE9IG51bGwgJiYgZWRnZS50YXJnZXQgIT0gbnVsbCkpIHtcbiAgICAgIHRocm93IFwiU291cmNlIGFuZC9vciB0YXJnZXQgaXMgbnVsbCFcIjtcbiAgICB9XG4gICAgaWYgKCEoZWRnZS5zb3VyY2Uub3duZXIgIT0gbnVsbCAmJiBlZGdlLnRhcmdldC5vd25lciAhPSBudWxsICYmXG4gICAgICAgICAgICBlZGdlLnNvdXJjZS5vd25lciA9PSB0aGlzICYmIGVkZ2UudGFyZ2V0Lm93bmVyID09IHRoaXMpKSB7XG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IG93bmVyIGlzIGludmFsaWQhXCI7XG4gICAgfVxuXG4gICAgdmFyIHNvdXJjZUluZGV4ID0gZWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihlZGdlKTtcbiAgICB2YXIgdGFyZ2V0SW5kZXggPSBlZGdlLnRhcmdldC5lZGdlcy5pbmRleE9mKGVkZ2UpO1xuICAgIGlmICghKHNvdXJjZUluZGV4ID4gLTEgJiYgdGFyZ2V0SW5kZXggPiAtMSkpIHtcbiAgICAgIHRocm93IFwiU291cmNlIGFuZC9vciB0YXJnZXQgZG9lc24ndCBrbm93IHRoaXMgZWRnZSFcIjtcbiAgICB9XG5cbiAgICBlZGdlLnNvdXJjZS5lZGdlcy5zcGxpY2Uoc291cmNlSW5kZXgsIDEpO1xuXG4gICAgaWYgKGVkZ2UudGFyZ2V0ICE9IGVkZ2Uuc291cmNlKVxuICAgIHtcbiAgICAgIGVkZ2UudGFyZ2V0LmVkZ2VzLnNwbGljZSh0YXJnZXRJbmRleCwgMSk7XG4gICAgfVxuXG4gICAgdmFyIGluZGV4ID0gZWRnZS5zb3VyY2Uub3duZXIuZ2V0RWRnZXMoKS5pbmRleE9mKGVkZ2UpO1xuICAgIGlmIChpbmRleCA9PSAtMSkge1xuICAgICAgdGhyb3cgXCJOb3QgaW4gb3duZXIncyBlZGdlIGxpc3QhXCI7XG4gICAgfVxuXG4gICAgZWRnZS5zb3VyY2Uub3duZXIuZ2V0RWRnZXMoKS5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG59O1xuXG5MR3JhcGgucHJvdG90eXBlLnVwZGF0ZUxlZnRUb3AgPSBmdW5jdGlvbiAoKVxue1xuICB2YXIgdG9wID0gSW50ZWdlci5NQVhfVkFMVUU7XG4gIHZhciBsZWZ0ID0gSW50ZWdlci5NQVhfVkFMVUU7XG4gIHZhciBub2RlVG9wO1xuICB2YXIgbm9kZUxlZnQ7XG4gIHZhciBtYXJnaW47XG5cbiAgdmFyIG5vZGVzID0gdGhpcy5nZXROb2RlcygpO1xuICB2YXIgcyA9IG5vZGVzLmxlbmd0aDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAge1xuICAgIHZhciBsTm9kZSA9IG5vZGVzW2ldO1xuICAgIG5vZGVUb3AgPSBsTm9kZS5nZXRUb3AoKTtcbiAgICBub2RlTGVmdCA9IGxOb2RlLmdldExlZnQoKTtcblxuICAgIGlmICh0b3AgPiBub2RlVG9wKVxuICAgIHtcbiAgICAgIHRvcCA9IG5vZGVUb3A7XG4gICAgfVxuXG4gICAgaWYgKGxlZnQgPiBub2RlTGVmdClcbiAgICB7XG4gICAgICBsZWZ0ID0gbm9kZUxlZnQ7XG4gICAgfVxuICB9XG5cbiAgLy8gRG8gd2UgaGF2ZSBhbnkgbm9kZXMgaW4gdGhpcyBncmFwaD9cbiAgaWYgKHRvcCA9PSBJbnRlZ2VyLk1BWF9WQUxVRSlcbiAge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIFxuICBpZihub2Rlc1swXS5nZXRQYXJlbnQoKS5wYWRkaW5nTGVmdCAhPSB1bmRlZmluZWQpe1xuICAgIG1hcmdpbiA9IG5vZGVzWzBdLmdldFBhcmVudCgpLnBhZGRpbmdMZWZ0O1xuICB9XG4gIGVsc2V7XG4gICAgbWFyZ2luID0gdGhpcy5tYXJnaW47XG4gIH1cblxuICB0aGlzLmxlZnQgPSBsZWZ0IC0gbWFyZ2luO1xuICB0aGlzLnRvcCA9IHRvcCAtIG1hcmdpbjtcblxuICAvLyBBcHBseSB0aGUgbWFyZ2lucyBhbmQgcmV0dXJuIHRoZSByZXN1bHRcbiAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLmxlZnQsIHRoaXMudG9wKTtcbn07XG5cbkxHcmFwaC5wcm90b3R5cGUudXBkYXRlQm91bmRzID0gZnVuY3Rpb24gKHJlY3Vyc2l2ZSlcbntcbiAgLy8gY2FsY3VsYXRlIGJvdW5kc1xuICB2YXIgbGVmdCA9IEludGVnZXIuTUFYX1ZBTFVFO1xuICB2YXIgcmlnaHQgPSAtSW50ZWdlci5NQVhfVkFMVUU7XG4gIHZhciB0b3AgPSBJbnRlZ2VyLk1BWF9WQUxVRTtcbiAgdmFyIGJvdHRvbSA9IC1JbnRlZ2VyLk1BWF9WQUxVRTtcbiAgdmFyIG5vZGVMZWZ0O1xuICB2YXIgbm9kZVJpZ2h0O1xuICB2YXIgbm9kZVRvcDtcbiAgdmFyIG5vZGVCb3R0b207XG4gIHZhciBtYXJnaW47XG5cbiAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxuICB7XG4gICAgdmFyIGxOb2RlID0gbm9kZXNbaV07XG5cbiAgICBpZiAocmVjdXJzaXZlICYmIGxOb2RlLmNoaWxkICE9IG51bGwpXG4gICAge1xuICAgICAgbE5vZGUudXBkYXRlQm91bmRzKCk7XG4gICAgfVxuICAgIG5vZGVMZWZ0ID0gbE5vZGUuZ2V0TGVmdCgpO1xuICAgIG5vZGVSaWdodCA9IGxOb2RlLmdldFJpZ2h0KCk7XG4gICAgbm9kZVRvcCA9IGxOb2RlLmdldFRvcCgpO1xuICAgIG5vZGVCb3R0b20gPSBsTm9kZS5nZXRCb3R0b20oKTtcblxuICAgIGlmIChsZWZ0ID4gbm9kZUxlZnQpXG4gICAge1xuICAgICAgbGVmdCA9IG5vZGVMZWZ0O1xuICAgIH1cblxuICAgIGlmIChyaWdodCA8IG5vZGVSaWdodClcbiAgICB7XG4gICAgICByaWdodCA9IG5vZGVSaWdodDtcbiAgICB9XG5cbiAgICBpZiAodG9wID4gbm9kZVRvcClcbiAgICB7XG4gICAgICB0b3AgPSBub2RlVG9wO1xuICAgIH1cblxuICAgIGlmIChib3R0b20gPCBub2RlQm90dG9tKVxuICAgIHtcbiAgICAgIGJvdHRvbSA9IG5vZGVCb3R0b207XG4gICAgfVxuICB9XG5cbiAgdmFyIGJvdW5kaW5nUmVjdCA9IG5ldyBSZWN0YW5nbGVEKGxlZnQsIHRvcCwgcmlnaHQgLSBsZWZ0LCBib3R0b20gLSB0b3ApO1xuICBpZiAobGVmdCA9PSBJbnRlZ2VyLk1BWF9WQUxVRSlcbiAge1xuICAgIHRoaXMubGVmdCA9IHRoaXMucGFyZW50LmdldExlZnQoKTtcbiAgICB0aGlzLnJpZ2h0ID0gdGhpcy5wYXJlbnQuZ2V0UmlnaHQoKTtcbiAgICB0aGlzLnRvcCA9IHRoaXMucGFyZW50LmdldFRvcCgpO1xuICAgIHRoaXMuYm90dG9tID0gdGhpcy5wYXJlbnQuZ2V0Qm90dG9tKCk7XG4gIH1cbiAgXG4gIGlmKG5vZGVzWzBdLmdldFBhcmVudCgpLnBhZGRpbmdMZWZ0ICE9IHVuZGVmaW5lZCl7XG4gICAgbWFyZ2luID0gbm9kZXNbMF0uZ2V0UGFyZW50KCkucGFkZGluZ0xlZnQ7XG4gIH1cbiAgZWxzZXtcbiAgICBtYXJnaW4gPSB0aGlzLm1hcmdpbjtcbiAgfVxuXG4gIHRoaXMubGVmdCA9IGJvdW5kaW5nUmVjdC54IC0gbWFyZ2luO1xuICB0aGlzLnJpZ2h0ID0gYm91bmRpbmdSZWN0LnggKyBib3VuZGluZ1JlY3Qud2lkdGggKyBtYXJnaW47XG4gIHRoaXMudG9wID0gYm91bmRpbmdSZWN0LnkgLSBtYXJnaW47XG4gIHRoaXMuYm90dG9tID0gYm91bmRpbmdSZWN0LnkgKyBib3VuZGluZ1JlY3QuaGVpZ2h0ICsgbWFyZ2luO1xufTtcblxuTEdyYXBoLmNhbGN1bGF0ZUJvdW5kcyA9IGZ1bmN0aW9uIChub2RlcylcbntcbiAgdmFyIGxlZnQgPSBJbnRlZ2VyLk1BWF9WQUxVRTtcbiAgdmFyIHJpZ2h0ID0gLUludGVnZXIuTUFYX1ZBTFVFO1xuICB2YXIgdG9wID0gSW50ZWdlci5NQVhfVkFMVUU7XG4gIHZhciBib3R0b20gPSAtSW50ZWdlci5NQVhfVkFMVUU7XG4gIHZhciBub2RlTGVmdDtcbiAgdmFyIG5vZGVSaWdodDtcbiAgdmFyIG5vZGVUb3A7XG4gIHZhciBub2RlQm90dG9tO1xuXG4gIHZhciBzID0gbm9kZXMubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxuICB7XG4gICAgdmFyIGxOb2RlID0gbm9kZXNbaV07XG4gICAgbm9kZUxlZnQgPSBsTm9kZS5nZXRMZWZ0KCk7XG4gICAgbm9kZVJpZ2h0ID0gbE5vZGUuZ2V0UmlnaHQoKTtcbiAgICBub2RlVG9wID0gbE5vZGUuZ2V0VG9wKCk7XG4gICAgbm9kZUJvdHRvbSA9IGxOb2RlLmdldEJvdHRvbSgpO1xuXG4gICAgaWYgKGxlZnQgPiBub2RlTGVmdClcbiAgICB7XG4gICAgICBsZWZ0ID0gbm9kZUxlZnQ7XG4gICAgfVxuXG4gICAgaWYgKHJpZ2h0IDwgbm9kZVJpZ2h0KVxuICAgIHtcbiAgICAgIHJpZ2h0ID0gbm9kZVJpZ2h0O1xuICAgIH1cblxuICAgIGlmICh0b3AgPiBub2RlVG9wKVxuICAgIHtcbiAgICAgIHRvcCA9IG5vZGVUb3A7XG4gICAgfVxuXG4gICAgaWYgKGJvdHRvbSA8IG5vZGVCb3R0b20pXG4gICAge1xuICAgICAgYm90dG9tID0gbm9kZUJvdHRvbTtcbiAgICB9XG4gIH1cblxuICB2YXIgYm91bmRpbmdSZWN0ID0gbmV3IFJlY3RhbmdsZUQobGVmdCwgdG9wLCByaWdodCAtIGxlZnQsIGJvdHRvbSAtIHRvcCk7XG5cbiAgcmV0dXJuIGJvdW5kaW5nUmVjdDtcbn07XG5cbkxHcmFwaC5wcm90b3R5cGUuZ2V0SW5jbHVzaW9uVHJlZURlcHRoID0gZnVuY3Rpb24gKClcbntcbiAgaWYgKHRoaXMgPT0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpKVxuICB7XG4gICAgcmV0dXJuIDE7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgcmV0dXJuIHRoaXMucGFyZW50LmdldEluY2x1c2lvblRyZWVEZXB0aCgpO1xuICB9XG59O1xuXG5MR3JhcGgucHJvdG90eXBlLmdldEVzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKVxue1xuICBpZiAodGhpcy5lc3RpbWF0ZWRTaXplID09IEludGVnZXIuTUlOX1ZBTFVFKSB7XG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XG4gIH1cbiAgcmV0dXJuIHRoaXMuZXN0aW1hdGVkU2l6ZTtcbn07XG5cbkxHcmFwaC5wcm90b3R5cGUuY2FsY0VzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKVxue1xuICB2YXIgc2l6ZSA9IDA7XG4gIHZhciBub2RlcyA9IHRoaXMubm9kZXM7XG4gIHZhciBzID0gbm9kZXMubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxuICB7XG4gICAgdmFyIGxOb2RlID0gbm9kZXNbaV07XG4gICAgc2l6ZSArPSBsTm9kZS5jYWxjRXN0aW1hdGVkU2l6ZSgpO1xuICB9XG5cbiAgaWYgKHNpemUgPT0gMClcbiAge1xuICAgIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IExheW91dENvbnN0YW50cy5FTVBUWV9DT01QT1VORF9OT0RFX1NJWkU7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgdGhpcy5lc3RpbWF0ZWRTaXplID0gc2l6ZSAvIE1hdGguc3FydCh0aGlzLm5vZGVzLmxlbmd0aCk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5lc3RpbWF0ZWRTaXplO1xufTtcblxuTEdyYXBoLnByb3RvdHlwZS51cGRhdGVDb25uZWN0ZWQgPSBmdW5jdGlvbiAoKVxue1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0aGlzLm5vZGVzLmxlbmd0aCA9PSAwKVxuICB7XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHRydWU7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIHRvQmVWaXNpdGVkID0gW107XG4gIHZhciB2aXNpdGVkID0gbmV3IEhhc2hTZXQoKTtcbiAgdmFyIGN1cnJlbnROb2RlID0gdGhpcy5ub2Rlc1swXTtcbiAgdmFyIG5laWdoYm9yRWRnZXM7XG4gIHZhciBjdXJyZW50TmVpZ2hib3I7XG4gIHRvQmVWaXNpdGVkID0gdG9CZVZpc2l0ZWQuY29uY2F0KGN1cnJlbnROb2RlLndpdGhDaGlsZHJlbigpKTtcblxuICB3aGlsZSAodG9CZVZpc2l0ZWQubGVuZ3RoID4gMClcbiAge1xuICAgIGN1cnJlbnROb2RlID0gdG9CZVZpc2l0ZWQuc2hpZnQoKTtcbiAgICB2aXNpdGVkLmFkZChjdXJyZW50Tm9kZSk7XG5cbiAgICAvLyBUcmF2ZXJzZSBhbGwgbmVpZ2hib3JzIG9mIHRoaXMgbm9kZVxuICAgIG5laWdoYm9yRWRnZXMgPSBjdXJyZW50Tm9kZS5nZXRFZGdlcygpO1xuICAgIHZhciBzID0gbmVpZ2hib3JFZGdlcy5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXG4gICAge1xuICAgICAgdmFyIG5laWdoYm9yRWRnZSA9IG5laWdoYm9yRWRnZXNbaV07XG4gICAgICBjdXJyZW50TmVpZ2hib3IgPVxuICAgICAgICAgICAgICBuZWlnaGJvckVkZ2UuZ2V0T3RoZXJFbmRJbkdyYXBoKGN1cnJlbnROb2RlLCB0aGlzKTtcblxuICAgICAgLy8gQWRkIHVudmlzaXRlZCBuZWlnaGJvcnMgdG8gdGhlIGxpc3QgdG8gdmlzaXRcbiAgICAgIGlmIChjdXJyZW50TmVpZ2hib3IgIT0gbnVsbCAmJlxuICAgICAgICAgICAgICAhdmlzaXRlZC5jb250YWlucyhjdXJyZW50TmVpZ2hib3IpKVxuICAgICAge1xuICAgICAgICB0b0JlVmlzaXRlZCA9IHRvQmVWaXNpdGVkLmNvbmNhdChjdXJyZW50TmVpZ2hib3Iud2l0aENoaWxkcmVuKCkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcblxuICBpZiAodmlzaXRlZC5zaXplKCkgPj0gdGhpcy5ub2Rlcy5sZW5ndGgpXG4gIHtcbiAgICB2YXIgbm9PZlZpc2l0ZWRJblRoaXNHcmFwaCA9IDA7XG4gICAgXG4gICAgdmFyIHMgPSB2aXNpdGVkLnNpemUoKTtcbiAgICAgT2JqZWN0LmtleXModmlzaXRlZC5zZXQpLmZvckVhY2goZnVuY3Rpb24odmlzaXRlZElkKSB7XG4gICAgICB2YXIgdmlzaXRlZE5vZGUgPSB2aXNpdGVkLnNldFt2aXNpdGVkSWRdO1xuICAgICAgaWYgKHZpc2l0ZWROb2RlLm93bmVyID09IHNlbGYpXG4gICAgICB7XG4gICAgICAgIG5vT2ZWaXNpdGVkSW5UaGlzR3JhcGgrKztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChub09mVmlzaXRlZEluVGhpc0dyYXBoID09IHRoaXMubm9kZXMubGVuZ3RoKVxuICAgIHtcbiAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMR3JhcGg7XG4iLCJ2YXIgTEdyYXBoO1xudmFyIExFZGdlID0gcmVxdWlyZSgnLi9MRWRnZScpO1xuXG5mdW5jdGlvbiBMR3JhcGhNYW5hZ2VyKGxheW91dCkge1xuICBMR3JhcGggPSByZXF1aXJlKCcuL0xHcmFwaCcpOyAvLyBJdCBtYXkgYmUgYmV0dGVyIHRvIGluaXRpbGl6ZSB0aGlzIG91dCBvZiB0aGlzIGZ1bmN0aW9uIGJ1dCBpdCBnaXZlcyBhbiBlcnJvciAoUmlnaHQtaGFuZCBzaWRlIG9mICdpbnN0YW5jZW9mJyBpcyBub3QgY2FsbGFibGUpIG5vdy5cbiAgdGhpcy5sYXlvdXQgPSBsYXlvdXQ7XG5cbiAgdGhpcy5ncmFwaHMgPSBbXTtcbiAgdGhpcy5lZGdlcyA9IFtdO1xufVxuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5hZGRSb290ID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIG5ncmFwaCA9IHRoaXMubGF5b3V0Lm5ld0dyYXBoKCk7XG4gIHZhciBubm9kZSA9IHRoaXMubGF5b3V0Lm5ld05vZGUobnVsbCk7XG4gIHZhciByb290ID0gdGhpcy5hZGQobmdyYXBoLCBubm9kZSk7XG4gIHRoaXMuc2V0Um9vdEdyYXBoKHJvb3QpO1xuICByZXR1cm4gdGhpcy5yb290R3JhcGg7XG59O1xuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAobmV3R3JhcGgsIHBhcmVudE5vZGUsIG5ld0VkZ2UsIHNvdXJjZU5vZGUsIHRhcmdldE5vZGUpXG57XG4gIC8vdGhlcmUgYXJlIGp1c3QgMiBwYXJhbWV0ZXJzIGFyZSBwYXNzZWQgdGhlbiBpdCBhZGRzIGFuIExHcmFwaCBlbHNlIGl0IGFkZHMgYW4gTEVkZ2VcbiAgaWYgKG5ld0VkZ2UgPT0gbnVsbCAmJiBzb3VyY2VOb2RlID09IG51bGwgJiYgdGFyZ2V0Tm9kZSA9PSBudWxsKSB7XG4gICAgaWYgKG5ld0dyYXBoID09IG51bGwpIHtcbiAgICAgIHRocm93IFwiR3JhcGggaXMgbnVsbCFcIjtcbiAgICB9XG4gICAgaWYgKHBhcmVudE5vZGUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgXCJQYXJlbnQgbm9kZSBpcyBudWxsIVwiO1xuICAgIH1cbiAgICBpZiAodGhpcy5ncmFwaHMuaW5kZXhPZihuZXdHcmFwaCkgPiAtMSkge1xuICAgICAgdGhyb3cgXCJHcmFwaCBhbHJlYWR5IGluIHRoaXMgZ3JhcGggbWdyIVwiO1xuICAgIH1cblxuICAgIHRoaXMuZ3JhcGhzLnB1c2gobmV3R3JhcGgpO1xuXG4gICAgaWYgKG5ld0dyYXBoLnBhcmVudCAhPSBudWxsKSB7XG4gICAgICB0aHJvdyBcIkFscmVhZHkgaGFzIGEgcGFyZW50IVwiO1xuICAgIH1cbiAgICBpZiAocGFyZW50Tm9kZS5jaGlsZCAhPSBudWxsKSB7XG4gICAgICB0aHJvdyAgXCJBbHJlYWR5IGhhcyBhIGNoaWxkIVwiO1xuICAgIH1cblxuICAgIG5ld0dyYXBoLnBhcmVudCA9IHBhcmVudE5vZGU7XG4gICAgcGFyZW50Tm9kZS5jaGlsZCA9IG5ld0dyYXBoO1xuXG4gICAgcmV0dXJuIG5ld0dyYXBoO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vY2hhbmdlIHRoZSBvcmRlciBvZiB0aGUgcGFyYW1ldGVyc1xuICAgIHRhcmdldE5vZGUgPSBuZXdFZGdlO1xuICAgIHNvdXJjZU5vZGUgPSBwYXJlbnROb2RlO1xuICAgIG5ld0VkZ2UgPSBuZXdHcmFwaDtcbiAgICB2YXIgc291cmNlR3JhcGggPSBzb3VyY2VOb2RlLmdldE93bmVyKCk7XG4gICAgdmFyIHRhcmdldEdyYXBoID0gdGFyZ2V0Tm9kZS5nZXRPd25lcigpO1xuXG4gICAgaWYgKCEoc291cmNlR3JhcGggIT0gbnVsbCAmJiBzb3VyY2VHcmFwaC5nZXRHcmFwaE1hbmFnZXIoKSA9PSB0aGlzKSkge1xuICAgICAgdGhyb3cgXCJTb3VyY2Ugbm90IGluIHRoaXMgZ3JhcGggbWdyIVwiO1xuICAgIH1cbiAgICBpZiAoISh0YXJnZXRHcmFwaCAhPSBudWxsICYmIHRhcmdldEdyYXBoLmdldEdyYXBoTWFuYWdlcigpID09IHRoaXMpKSB7XG4gICAgICB0aHJvdyBcIlRhcmdldCBub3QgaW4gdGhpcyBncmFwaCBtZ3IhXCI7XG4gICAgfVxuXG4gICAgaWYgKHNvdXJjZUdyYXBoID09IHRhcmdldEdyYXBoKVxuICAgIHtcbiAgICAgIG5ld0VkZ2UuaXNJbnRlckdyYXBoID0gZmFsc2U7XG4gICAgICByZXR1cm4gc291cmNlR3JhcGguYWRkKG5ld0VkZ2UsIHNvdXJjZU5vZGUsIHRhcmdldE5vZGUpO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgbmV3RWRnZS5pc0ludGVyR3JhcGggPSB0cnVlO1xuXG4gICAgICAvLyBzZXQgc291cmNlIGFuZCB0YXJnZXRcbiAgICAgIG5ld0VkZ2Uuc291cmNlID0gc291cmNlTm9kZTtcbiAgICAgIG5ld0VkZ2UudGFyZ2V0ID0gdGFyZ2V0Tm9kZTtcblxuICAgICAgLy8gYWRkIGVkZ2UgdG8gaW50ZXItZ3JhcGggZWRnZSBsaXN0XG4gICAgICBpZiAodGhpcy5lZGdlcy5pbmRleE9mKG5ld0VkZ2UpID4gLTEpIHtcbiAgICAgICAgdGhyb3cgXCJFZGdlIGFscmVhZHkgaW4gaW50ZXItZ3JhcGggZWRnZSBsaXN0IVwiO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmVkZ2VzLnB1c2gobmV3RWRnZSk7XG5cbiAgICAgIC8vIGFkZCBlZGdlIHRvIHNvdXJjZSBhbmQgdGFyZ2V0IGluY2lkZW5jeSBsaXN0c1xuICAgICAgaWYgKCEobmV3RWRnZS5zb3VyY2UgIT0gbnVsbCAmJiBuZXdFZGdlLnRhcmdldCAhPSBudWxsKSkge1xuICAgICAgICB0aHJvdyBcIkVkZ2Ugc291cmNlIGFuZC9vciB0YXJnZXQgaXMgbnVsbCFcIjtcbiAgICAgIH1cblxuICAgICAgaWYgKCEobmV3RWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihuZXdFZGdlKSA9PSAtMSAmJiBuZXdFZGdlLnRhcmdldC5lZGdlcy5pbmRleE9mKG5ld0VkZ2UpID09IC0xKSkge1xuICAgICAgICB0aHJvdyBcIkVkZ2UgYWxyZWFkeSBpbiBzb3VyY2UgYW5kL29yIHRhcmdldCBpbmNpZGVuY3kgbGlzdCFcIjtcbiAgICAgIH1cblxuICAgICAgbmV3RWRnZS5zb3VyY2UuZWRnZXMucHVzaChuZXdFZGdlKTtcbiAgICAgIG5ld0VkZ2UudGFyZ2V0LmVkZ2VzLnB1c2gobmV3RWRnZSk7XG5cbiAgICAgIHJldHVybiBuZXdFZGdlO1xuICAgIH1cbiAgfVxufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKGxPYmopIHtcbiAgaWYgKGxPYmogaW5zdGFuY2VvZiBMR3JhcGgpIHtcbiAgICB2YXIgZ3JhcGggPSBsT2JqO1xuICAgIGlmIChncmFwaC5nZXRHcmFwaE1hbmFnZXIoKSAhPSB0aGlzKSB7XG4gICAgICB0aHJvdyBcIkdyYXBoIG5vdCBpbiB0aGlzIGdyYXBoIG1nclwiO1xuICAgIH1cbiAgICBpZiAoIShncmFwaCA9PSB0aGlzLnJvb3RHcmFwaCB8fCAoZ3JhcGgucGFyZW50ICE9IG51bGwgJiYgZ3JhcGgucGFyZW50LmdyYXBoTWFuYWdlciA9PSB0aGlzKSkpIHtcbiAgICAgIHRocm93IFwiSW52YWxpZCBwYXJlbnQgbm9kZSFcIjtcbiAgICB9XG5cbiAgICAvLyBmaXJzdCB0aGUgZWRnZXMgKG1ha2UgYSBjb3B5IHRvIGRvIGl0IHNhZmVseSlcbiAgICB2YXIgZWRnZXNUb0JlUmVtb3ZlZCA9IFtdO1xuXG4gICAgZWRnZXNUb0JlUmVtb3ZlZCA9IGVkZ2VzVG9CZVJlbW92ZWQuY29uY2F0KGdyYXBoLmdldEVkZ2VzKCkpO1xuXG4gICAgdmFyIGVkZ2U7XG4gICAgdmFyIHMgPSBlZGdlc1RvQmVSZW1vdmVkLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAgICB7XG4gICAgICBlZGdlID0gZWRnZXNUb0JlUmVtb3ZlZFtpXTtcbiAgICAgIGdyYXBoLnJlbW92ZShlZGdlKTtcbiAgICB9XG5cbiAgICAvLyB0aGVuIHRoZSBub2RlcyAobWFrZSBhIGNvcHkgdG8gZG8gaXQgc2FmZWx5KVxuICAgIHZhciBub2Rlc1RvQmVSZW1vdmVkID0gW107XG5cbiAgICBub2Rlc1RvQmVSZW1vdmVkID0gbm9kZXNUb0JlUmVtb3ZlZC5jb25jYXQoZ3JhcGguZ2V0Tm9kZXMoKSk7XG5cbiAgICB2YXIgbm9kZTtcbiAgICBzID0gbm9kZXNUb0JlUmVtb3ZlZC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXG4gICAge1xuICAgICAgbm9kZSA9IG5vZGVzVG9CZVJlbW92ZWRbaV07XG4gICAgICBncmFwaC5yZW1vdmUobm9kZSk7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgaWYgZ3JhcGggaXMgdGhlIHJvb3RcbiAgICBpZiAoZ3JhcGggPT0gdGhpcy5yb290R3JhcGgpXG4gICAge1xuICAgICAgdGhpcy5zZXRSb290R3JhcGgobnVsbCk7XG4gICAgfVxuXG4gICAgLy8gbm93IHJlbW92ZSB0aGUgZ3JhcGggaXRzZWxmXG4gICAgdmFyIGluZGV4ID0gdGhpcy5ncmFwaHMuaW5kZXhPZihncmFwaCk7XG4gICAgdGhpcy5ncmFwaHMuc3BsaWNlKGluZGV4LCAxKTtcblxuICAgIC8vIGFsc28gcmVzZXQgdGhlIHBhcmVudCBvZiB0aGUgZ3JhcGhcbiAgICBncmFwaC5wYXJlbnQgPSBudWxsO1xuICB9XG4gIGVsc2UgaWYgKGxPYmogaW5zdGFuY2VvZiBMRWRnZSkge1xuICAgIGVkZ2UgPSBsT2JqO1xuICAgIGlmIChlZGdlID09IG51bGwpIHtcbiAgICAgIHRocm93IFwiRWRnZSBpcyBudWxsIVwiO1xuICAgIH1cbiAgICBpZiAoIWVkZ2UuaXNJbnRlckdyYXBoKSB7XG4gICAgICB0aHJvdyBcIk5vdCBhbiBpbnRlci1ncmFwaCBlZGdlIVwiO1xuICAgIH1cbiAgICBpZiAoIShlZGdlLnNvdXJjZSAhPSBudWxsICYmIGVkZ2UudGFyZ2V0ICE9IG51bGwpKSB7XG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGlzIG51bGwhXCI7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIGVkZ2UgZnJvbSBzb3VyY2UgYW5kIHRhcmdldCBub2RlcycgaW5jaWRlbmN5IGxpc3RzXG5cbiAgICBpZiAoIShlZGdlLnNvdXJjZS5lZGdlcy5pbmRleE9mKGVkZ2UpICE9IC0xICYmIGVkZ2UudGFyZ2V0LmVkZ2VzLmluZGV4T2YoZWRnZSkgIT0gLTEpKSB7XG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGRvZXNuJ3Qga25vdyB0aGlzIGVkZ2UhXCI7XG4gICAgfVxuXG4gICAgdmFyIGluZGV4ID0gZWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihlZGdlKTtcbiAgICBlZGdlLnNvdXJjZS5lZGdlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIGluZGV4ID0gZWRnZS50YXJnZXQuZWRnZXMuaW5kZXhPZihlZGdlKTtcbiAgICBlZGdlLnRhcmdldC5lZGdlcy5zcGxpY2UoaW5kZXgsIDEpO1xuXG4gICAgLy8gcmVtb3ZlIGVkZ2UgZnJvbSBvd25lciBncmFwaCBtYW5hZ2VyJ3MgaW50ZXItZ3JhcGggZWRnZSBsaXN0XG5cbiAgICBpZiAoIShlZGdlLnNvdXJjZS5vd25lciAhPSBudWxsICYmIGVkZ2Uuc291cmNlLm93bmVyLmdldEdyYXBoTWFuYWdlcigpICE9IG51bGwpKSB7XG4gICAgICB0aHJvdyBcIkVkZ2Ugb3duZXIgZ3JhcGggb3Igb3duZXIgZ3JhcGggbWFuYWdlciBpcyBudWxsIVwiO1xuICAgIH1cbiAgICBpZiAoZWRnZS5zb3VyY2Uub3duZXIuZ2V0R3JhcGhNYW5hZ2VyKCkuZWRnZXMuaW5kZXhPZihlZGdlKSA9PSAtMSkge1xuICAgICAgdGhyb3cgXCJOb3QgaW4gb3duZXIgZ3JhcGggbWFuYWdlcidzIGVkZ2UgbGlzdCFcIjtcbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBlZGdlLnNvdXJjZS5vd25lci5nZXRHcmFwaE1hbmFnZXIoKS5lZGdlcy5pbmRleE9mKGVkZ2UpO1xuICAgIGVkZ2Uuc291cmNlLm93bmVyLmdldEdyYXBoTWFuYWdlcigpLmVkZ2VzLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnVwZGF0ZUJvdW5kcyA9IGZ1bmN0aW9uICgpXG57XG4gIHRoaXMucm9vdEdyYXBoLnVwZGF0ZUJvdW5kcyh0cnVlKTtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEdyYXBocyA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmdyYXBocztcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEFsbE5vZGVzID0gZnVuY3Rpb24gKClcbntcbiAgaWYgKHRoaXMuYWxsTm9kZXMgPT0gbnVsbClcbiAge1xuICAgIHZhciBub2RlTGlzdCA9IFtdO1xuICAgIHZhciBncmFwaHMgPSB0aGlzLmdldEdyYXBocygpO1xuICAgIHZhciBzID0gZ3JhcGhzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAgICB7XG4gICAgICBub2RlTGlzdCA9IG5vZGVMaXN0LmNvbmNhdChncmFwaHNbaV0uZ2V0Tm9kZXMoKSk7XG4gICAgfVxuICAgIHRoaXMuYWxsTm9kZXMgPSBub2RlTGlzdDtcbiAgfVxuICByZXR1cm4gdGhpcy5hbGxOb2Rlcztcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlc2V0QWxsTm9kZXMgPSBmdW5jdGlvbiAoKVxue1xuICB0aGlzLmFsbE5vZGVzID0gbnVsbDtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlc2V0QWxsRWRnZXMgPSBmdW5jdGlvbiAoKVxue1xuICB0aGlzLmFsbEVkZ2VzID0gbnVsbDtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlc2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAoKVxue1xuICB0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uID0gbnVsbDtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEFsbEVkZ2VzID0gZnVuY3Rpb24gKClcbntcbiAgaWYgKHRoaXMuYWxsRWRnZXMgPT0gbnVsbClcbiAge1xuICAgIHZhciBlZGdlTGlzdCA9IFtdO1xuICAgIHZhciBncmFwaHMgPSB0aGlzLmdldEdyYXBocygpO1xuICAgIHZhciBzID0gZ3JhcGhzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdyYXBocy5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICBlZGdlTGlzdCA9IGVkZ2VMaXN0LmNvbmNhdChncmFwaHNbaV0uZ2V0RWRnZXMoKSk7XG4gICAgfVxuXG4gICAgZWRnZUxpc3QgPSBlZGdlTGlzdC5jb25jYXQodGhpcy5lZGdlcyk7XG5cbiAgICB0aGlzLmFsbEVkZ2VzID0gZWRnZUxpc3Q7XG4gIH1cbiAgcmV0dXJuIHRoaXMuYWxsRWRnZXM7XG59O1xuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5nZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uO1xufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuc2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAobm9kZUxpc3QpXG57XG4gIGlmICh0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uICE9IG51bGwpIHtcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcbiAgfVxuXG4gIHRoaXMuYWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBub2RlTGlzdDtcbn07XG5cbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldFJvb3QgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yb290R3JhcGg7XG59O1xuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5zZXRSb290R3JhcGggPSBmdW5jdGlvbiAoZ3JhcGgpXG57XG4gIGlmIChncmFwaC5nZXRHcmFwaE1hbmFnZXIoKSAhPSB0aGlzKSB7XG4gICAgdGhyb3cgXCJSb290IG5vdCBpbiB0aGlzIGdyYXBoIG1nciFcIjtcbiAgfVxuXG4gIHRoaXMucm9vdEdyYXBoID0gZ3JhcGg7XG4gIC8vIHJvb3QgZ3JhcGggbXVzdCBoYXZlIGEgcm9vdCBub2RlIGFzc29jaWF0ZWQgd2l0aCBpdCBmb3IgY29udmVuaWVuY2VcbiAgaWYgKGdyYXBoLnBhcmVudCA9PSBudWxsKVxuICB7XG4gICAgZ3JhcGgucGFyZW50ID0gdGhpcy5sYXlvdXQubmV3Tm9kZShcIlJvb3Qgbm9kZVwiKTtcbiAgfVxufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuZ2V0TGF5b3V0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMubGF5b3V0O1xufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuaXNPbmVBbmNlc3Rvck9mT3RoZXIgPSBmdW5jdGlvbiAoZmlyc3ROb2RlLCBzZWNvbmROb2RlKVxue1xuICBpZiAoIShmaXJzdE5vZGUgIT0gbnVsbCAmJiBzZWNvbmROb2RlICE9IG51bGwpKSB7XG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XG4gIH1cblxuICBpZiAoZmlyc3ROb2RlID09IHNlY29uZE5vZGUpXG4gIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICAvLyBJcyBzZWNvbmQgbm9kZSBhbiBhbmNlc3RvciBvZiB0aGUgZmlyc3Qgb25lP1xuICB2YXIgb3duZXJHcmFwaCA9IGZpcnN0Tm9kZS5nZXRPd25lcigpO1xuICB2YXIgcGFyZW50Tm9kZTtcblxuICBkb1xuICB7XG4gICAgcGFyZW50Tm9kZSA9IG93bmVyR3JhcGguZ2V0UGFyZW50KCk7XG5cbiAgICBpZiAocGFyZW50Tm9kZSA9PSBudWxsKVxuICAgIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChwYXJlbnROb2RlID09IHNlY29uZE5vZGUpXG4gICAge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgb3duZXJHcmFwaCA9IHBhcmVudE5vZGUuZ2V0T3duZXIoKTtcbiAgICBpZiAob3duZXJHcmFwaCA9PSBudWxsKVxuICAgIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSB3aGlsZSAodHJ1ZSk7XG4gIC8vIElzIGZpcnN0IG5vZGUgYW4gYW5jZXN0b3Igb2YgdGhlIHNlY29uZCBvbmU/XG4gIG93bmVyR3JhcGggPSBzZWNvbmROb2RlLmdldE93bmVyKCk7XG5cbiAgZG9cbiAge1xuICAgIHBhcmVudE5vZGUgPSBvd25lckdyYXBoLmdldFBhcmVudCgpO1xuXG4gICAgaWYgKHBhcmVudE5vZGUgPT0gbnVsbClcbiAgICB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGFyZW50Tm9kZSA9PSBmaXJzdE5vZGUpXG4gICAge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgb3duZXJHcmFwaCA9IHBhcmVudE5vZGUuZ2V0T3duZXIoKTtcbiAgICBpZiAob3duZXJHcmFwaCA9PSBudWxsKVxuICAgIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSB3aGlsZSAodHJ1ZSk7XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuY2FsY0xvd2VzdENvbW1vbkFuY2VzdG9ycyA9IGZ1bmN0aW9uICgpXG57XG4gIHZhciBlZGdlO1xuICB2YXIgc291cmNlTm9kZTtcbiAgdmFyIHRhcmdldE5vZGU7XG4gIHZhciBzb3VyY2VBbmNlc3RvckdyYXBoO1xuICB2YXIgdGFyZ2V0QW5jZXN0b3JHcmFwaDtcblxuICB2YXIgZWRnZXMgPSB0aGlzLmdldEFsbEVkZ2VzKCk7XG4gIHZhciBzID0gZWRnZXMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAge1xuICAgIGVkZ2UgPSBlZGdlc1tpXTtcblxuICAgIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZTtcbiAgICB0YXJnZXROb2RlID0gZWRnZS50YXJnZXQ7XG4gICAgZWRnZS5sY2EgPSBudWxsO1xuICAgIGVkZ2Uuc291cmNlSW5MY2EgPSBzb3VyY2VOb2RlO1xuICAgIGVkZ2UudGFyZ2V0SW5MY2EgPSB0YXJnZXROb2RlO1xuXG4gICAgaWYgKHNvdXJjZU5vZGUgPT0gdGFyZ2V0Tm9kZSlcbiAgICB7XG4gICAgICBlZGdlLmxjYSA9IHNvdXJjZU5vZGUuZ2V0T3duZXIoKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHNvdXJjZUFuY2VzdG9yR3JhcGggPSBzb3VyY2VOb2RlLmdldE93bmVyKCk7XG5cbiAgICB3aGlsZSAoZWRnZS5sY2EgPT0gbnVsbClcbiAgICB7XG4gICAgICBlZGdlLnRhcmdldEluTGNhID0gdGFyZ2V0Tm9kZTsgIFxuICAgICAgdGFyZ2V0QW5jZXN0b3JHcmFwaCA9IHRhcmdldE5vZGUuZ2V0T3duZXIoKTtcblxuICAgICAgd2hpbGUgKGVkZ2UubGNhID09IG51bGwpXG4gICAgICB7XG4gICAgICAgIGlmICh0YXJnZXRBbmNlc3RvckdyYXBoID09IHNvdXJjZUFuY2VzdG9yR3JhcGgpXG4gICAgICAgIHtcbiAgICAgICAgICBlZGdlLmxjYSA9IHRhcmdldEFuY2VzdG9yR3JhcGg7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGFyZ2V0QW5jZXN0b3JHcmFwaCA9PSB0aGlzLnJvb3RHcmFwaClcbiAgICAgICAge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGVkZ2UubGNhICE9IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcbiAgICAgICAgfVxuICAgICAgICBlZGdlLnRhcmdldEluTGNhID0gdGFyZ2V0QW5jZXN0b3JHcmFwaC5nZXRQYXJlbnQoKTtcbiAgICAgICAgdGFyZ2V0QW5jZXN0b3JHcmFwaCA9IGVkZ2UudGFyZ2V0SW5MY2EuZ2V0T3duZXIoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNvdXJjZUFuY2VzdG9yR3JhcGggPT0gdGhpcy5yb290R3JhcGgpXG4gICAgICB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZiAoZWRnZS5sY2EgPT0gbnVsbClcbiAgICAgIHtcbiAgICAgICAgZWRnZS5zb3VyY2VJbkxjYSA9IHNvdXJjZUFuY2VzdG9yR3JhcGguZ2V0UGFyZW50KCk7XG4gICAgICAgIHNvdXJjZUFuY2VzdG9yR3JhcGggPSBlZGdlLnNvdXJjZUluTGNhLmdldE93bmVyKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVkZ2UubGNhID09IG51bGwpIHtcbiAgICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xuICAgIH1cbiAgfVxufTtcblxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuY2FsY0xvd2VzdENvbW1vbkFuY2VzdG9yID0gZnVuY3Rpb24gKGZpcnN0Tm9kZSwgc2Vjb25kTm9kZSlcbntcbiAgaWYgKGZpcnN0Tm9kZSA9PSBzZWNvbmROb2RlKVxuICB7XG4gICAgcmV0dXJuIGZpcnN0Tm9kZS5nZXRPd25lcigpO1xuICB9XG4gIHZhciBmaXJzdE93bmVyR3JhcGggPSBmaXJzdE5vZGUuZ2V0T3duZXIoKTtcblxuICBkb1xuICB7XG4gICAgaWYgKGZpcnN0T3duZXJHcmFwaCA9PSBudWxsKVxuICAgIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB2YXIgc2Vjb25kT3duZXJHcmFwaCA9IHNlY29uZE5vZGUuZ2V0T3duZXIoKTtcblxuICAgIGRvXG4gICAge1xuICAgICAgaWYgKHNlY29uZE93bmVyR3JhcGggPT0gbnVsbClcbiAgICAgIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZWNvbmRPd25lckdyYXBoID09IGZpcnN0T3duZXJHcmFwaClcbiAgICAgIHtcbiAgICAgICAgcmV0dXJuIHNlY29uZE93bmVyR3JhcGg7XG4gICAgICB9XG4gICAgICBzZWNvbmRPd25lckdyYXBoID0gc2Vjb25kT3duZXJHcmFwaC5nZXRQYXJlbnQoKS5nZXRPd25lcigpO1xuICAgIH0gd2hpbGUgKHRydWUpO1xuXG4gICAgZmlyc3RPd25lckdyYXBoID0gZmlyc3RPd25lckdyYXBoLmdldFBhcmVudCgpLmdldE93bmVyKCk7XG4gIH0gd2hpbGUgKHRydWUpO1xuXG4gIHJldHVybiBmaXJzdE93bmVyR3JhcGg7XG59O1xuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5jYWxjSW5jbHVzaW9uVHJlZURlcHRocyA9IGZ1bmN0aW9uIChncmFwaCwgZGVwdGgpIHtcbiAgaWYgKGdyYXBoID09IG51bGwgJiYgZGVwdGggPT0gbnVsbCkge1xuICAgIGdyYXBoID0gdGhpcy5yb290R3JhcGg7XG4gICAgZGVwdGggPSAxO1xuICB9XG4gIHZhciBub2RlO1xuXG4gIHZhciBub2RlcyA9IGdyYXBoLmdldE5vZGVzKCk7XG4gIHZhciBzID0gbm9kZXMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcbiAge1xuICAgIG5vZGUgPSBub2Rlc1tpXTtcbiAgICBub2RlLmluY2x1c2lvblRyZWVEZXB0aCA9IGRlcHRoO1xuXG4gICAgaWYgKG5vZGUuY2hpbGQgIT0gbnVsbClcbiAgICB7XG4gICAgICB0aGlzLmNhbGNJbmNsdXNpb25UcmVlRGVwdGhzKG5vZGUuY2hpbGQsIGRlcHRoICsgMSk7XG4gICAgfVxuICB9XG59O1xuXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5pbmNsdWRlc0ludmFsaWRFZGdlID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIGVkZ2U7XG5cbiAgdmFyIHMgPSB0aGlzLmVkZ2VzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXG4gIHtcbiAgICBlZGdlID0gdGhpcy5lZGdlc1tpXTtcblxuICAgIGlmICh0aGlzLmlzT25lQW5jZXN0b3JPZk90aGVyKGVkZ2Uuc291cmNlLCBlZGdlLnRhcmdldCkpXG4gICAge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTEdyYXBoTWFuYWdlcjtcbiIsImZ1bmN0aW9uIExHcmFwaE9iamVjdCh2R3JhcGhPYmplY3QpIHtcbiAgdGhpcy52R3JhcGhPYmplY3QgPSB2R3JhcGhPYmplY3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTEdyYXBoT2JqZWN0O1xuIiwidmFyIExHcmFwaE9iamVjdCA9IHJlcXVpcmUoJy4vTEdyYXBoT2JqZWN0Jyk7XG52YXIgSW50ZWdlciA9IHJlcXVpcmUoJy4vSW50ZWdlcicpO1xudmFyIFJlY3RhbmdsZUQgPSByZXF1aXJlKCcuL1JlY3RhbmdsZUQnKTtcbnZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xudmFyIFJhbmRvbVNlZWQgPSByZXF1aXJlKCcuL1JhbmRvbVNlZWQnKTtcbnZhciBQb2ludEQgPSByZXF1aXJlKCcuL1BvaW50RCcpO1xudmFyIEhhc2hTZXQgPSByZXF1aXJlKCcuL0hhc2hTZXQnKTtcblxuZnVuY3Rpb24gTE5vZGUoZ20sIGxvYywgc2l6ZSwgdk5vZGUpIHtcbiAgLy9BbHRlcm5hdGl2ZSBjb25zdHJ1Y3RvciAxIDogTE5vZGUoTEdyYXBoTWFuYWdlciBnbSwgUG9pbnQgbG9jLCBEaW1lbnNpb24gc2l6ZSwgT2JqZWN0IHZOb2RlKVxuICBpZiAoc2l6ZSA9PSBudWxsICYmIHZOb2RlID09IG51bGwpIHtcbiAgICB2Tm9kZSA9IGxvYztcbiAgfVxuXG4gIExHcmFwaE9iamVjdC5jYWxsKHRoaXMsIHZOb2RlKTtcblxuICAvL0FsdGVybmF0aXZlIGNvbnN0cnVjdG9yIDIgOiBMTm9kZShMYXlvdXQgbGF5b3V0LCBPYmplY3Qgdk5vZGUpXG4gIGlmIChnbS5ncmFwaE1hbmFnZXIgIT0gbnVsbClcbiAgICBnbSA9IGdtLmdyYXBoTWFuYWdlcjtcblxuICB0aGlzLmVzdGltYXRlZFNpemUgPSBJbnRlZ2VyLk1JTl9WQUxVRTtcbiAgdGhpcy5pbmNsdXNpb25UcmVlRGVwdGggPSBJbnRlZ2VyLk1BWF9WQUxVRTtcbiAgdGhpcy52R3JhcGhPYmplY3QgPSB2Tm9kZTtcbiAgdGhpcy5lZGdlcyA9IFtdO1xuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xuXG4gIGlmIChzaXplICE9IG51bGwgJiYgbG9jICE9IG51bGwpXG4gICAgdGhpcy5yZWN0ID0gbmV3IFJlY3RhbmdsZUQobG9jLngsIGxvYy55LCBzaXplLndpZHRoLCBzaXplLmhlaWdodCk7XG4gIGVsc2VcbiAgICB0aGlzLnJlY3QgPSBuZXcgUmVjdGFuZ2xlRCgpO1xufVxuXG5MTm9kZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExHcmFwaE9iamVjdC5wcm90b3R5cGUpO1xuZm9yICh2YXIgcHJvcCBpbiBMR3JhcGhPYmplY3QpIHtcbiAgTE5vZGVbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XG59XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRFZGdlcyA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmVkZ2VzO1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldENoaWxkID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMuY2hpbGQ7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0T3duZXIgPSBmdW5jdGlvbiAoKVxue1xuICBpZiAodGhpcy5vd25lciAhPSBudWxsKSB7XG4gICAgaWYgKCEodGhpcy5vd25lciA9PSBudWxsIHx8IHRoaXMub3duZXIuZ2V0Tm9kZXMoKS5pbmRleE9mKHRoaXMpID4gLTEpKSB7XG4gICAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcy5vd25lcjtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnJlY3Qud2lkdGg7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuc2V0V2lkdGggPSBmdW5jdGlvbiAod2lkdGgpXG57XG4gIHRoaXMucmVjdC53aWR0aCA9IHdpZHRoO1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldEhlaWdodCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnJlY3QuaGVpZ2h0O1xufTtcblxuTE5vZGUucHJvdG90eXBlLnNldEhlaWdodCA9IGZ1bmN0aW9uIChoZWlnaHQpXG57XG4gIHRoaXMucmVjdC5oZWlnaHQgPSBoZWlnaHQ7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0Q2VudGVyWCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnJlY3QueCArIHRoaXMucmVjdC53aWR0aCAvIDI7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0Q2VudGVyWSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnJlY3QueSArIHRoaXMucmVjdC5oZWlnaHQgLyAyO1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldENlbnRlciA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiBuZXcgUG9pbnREKHRoaXMucmVjdC54ICsgdGhpcy5yZWN0LndpZHRoIC8gMixcbiAgICAgICAgICB0aGlzLnJlY3QueSArIHRoaXMucmVjdC5oZWlnaHQgLyAyKTtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRMb2NhdGlvbiA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiBuZXcgUG9pbnREKHRoaXMucmVjdC54LCB0aGlzLnJlY3QueSk7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0UmVjdCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnJlY3Q7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0RGlhZ29uYWwgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMucmVjdC53aWR0aCAqIHRoaXMucmVjdC53aWR0aCArXG4gICAgICAgICAgdGhpcy5yZWN0LmhlaWdodCAqIHRoaXMucmVjdC5oZWlnaHQpO1xufTtcblxuTE5vZGUucHJvdG90eXBlLnNldFJlY3QgPSBmdW5jdGlvbiAodXBwZXJMZWZ0LCBkaW1lbnNpb24pXG57XG4gIHRoaXMucmVjdC54ID0gdXBwZXJMZWZ0Lng7XG4gIHRoaXMucmVjdC55ID0gdXBwZXJMZWZ0Lnk7XG4gIHRoaXMucmVjdC53aWR0aCA9IGRpbWVuc2lvbi53aWR0aDtcbiAgdGhpcy5yZWN0LmhlaWdodCA9IGRpbWVuc2lvbi5oZWlnaHQ7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuc2V0Q2VudGVyID0gZnVuY3Rpb24gKGN4LCBjeSlcbntcbiAgdGhpcy5yZWN0LnggPSBjeCAtIHRoaXMucmVjdC53aWR0aCAvIDI7XG4gIHRoaXMucmVjdC55ID0gY3kgLSB0aGlzLnJlY3QuaGVpZ2h0IC8gMjtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5zZXRMb2NhdGlvbiA9IGZ1bmN0aW9uICh4LCB5KVxue1xuICB0aGlzLnJlY3QueCA9IHg7XG4gIHRoaXMucmVjdC55ID0geTtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5tb3ZlQnkgPSBmdW5jdGlvbiAoZHgsIGR5KVxue1xuICB0aGlzLnJlY3QueCArPSBkeDtcbiAgdGhpcy5yZWN0LnkgKz0gZHk7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0RWRnZUxpc3RUb05vZGUgPSBmdW5jdGlvbiAodG8pXG57XG4gIHZhciBlZGdlTGlzdCA9IFtdO1xuICB2YXIgZWRnZTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYuZWRnZXMuZm9yRWFjaChmdW5jdGlvbihlZGdlKSB7XG4gICAgXG4gICAgaWYgKGVkZ2UudGFyZ2V0ID09IHRvKVxuICAgIHtcbiAgICAgIGlmIChlZGdlLnNvdXJjZSAhPSBzZWxmKVxuICAgICAgICB0aHJvdyBcIkluY29ycmVjdCBlZGdlIHNvdXJjZSFcIjtcblxuICAgICAgZWRnZUxpc3QucHVzaChlZGdlKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBlZGdlTGlzdDtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRFZGdlc0JldHdlZW4gPSBmdW5jdGlvbiAob3RoZXIpXG57XG4gIHZhciBlZGdlTGlzdCA9IFtdO1xuICB2YXIgZWRnZTtcbiAgXG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5lZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKGVkZ2UpIHtcblxuICAgIGlmICghKGVkZ2Uuc291cmNlID09IHNlbGYgfHwgZWRnZS50YXJnZXQgPT0gc2VsZikpXG4gICAgICB0aHJvdyBcIkluY29ycmVjdCBlZGdlIHNvdXJjZSBhbmQvb3IgdGFyZ2V0XCI7XG5cbiAgICBpZiAoKGVkZ2UudGFyZ2V0ID09IG90aGVyKSB8fCAoZWRnZS5zb3VyY2UgPT0gb3RoZXIpKVxuICAgIHtcbiAgICAgIGVkZ2VMaXN0LnB1c2goZWRnZSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gZWRnZUxpc3Q7XG59O1xuXG5MTm9kZS5wcm90b3R5cGUuZ2V0TmVpZ2hib3JzTGlzdCA9IGZ1bmN0aW9uICgpXG57XG4gIHZhciBuZWlnaGJvcnMgPSBuZXcgSGFzaFNldCgpO1xuICB2YXIgZWRnZTtcbiAgXG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5lZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKGVkZ2UpIHtcblxuICAgIGlmIChlZGdlLnNvdXJjZSA9PSBzZWxmKVxuICAgIHtcbiAgICAgIG5laWdoYm9ycy5hZGQoZWRnZS50YXJnZXQpO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgaWYgKGVkZ2UudGFyZ2V0ICE9IHNlbGYpIHtcbiAgICAgICAgdGhyb3cgXCJJbmNvcnJlY3QgaW5jaWRlbmN5IVwiO1xuICAgICAgfVxuICAgIFxuICAgICAgbmVpZ2hib3JzLmFkZChlZGdlLnNvdXJjZSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gbmVpZ2hib3JzO1xufTtcblxuTE5vZGUucHJvdG90eXBlLndpdGhDaGlsZHJlbiA9IGZ1bmN0aW9uICgpXG57XG4gIHZhciB3aXRoTmVpZ2hib3JzTGlzdCA9IFtdO1xuICB2YXIgY2hpbGROb2RlO1xuXG4gIHdpdGhOZWlnaGJvcnNMaXN0LnB1c2godGhpcyk7XG5cbiAgaWYgKHRoaXMuY2hpbGQgIT0gbnVsbClcbiAge1xuICAgIHZhciBub2RlcyA9IHRoaXMuY2hpbGQuZ2V0Tm9kZXMoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxuICAgIHtcbiAgICAgIGNoaWxkTm9kZSA9IG5vZGVzW2ldO1xuXG4gICAgICB3aXRoTmVpZ2hib3JzTGlzdCA9IHdpdGhOZWlnaGJvcnNMaXN0LmNvbmNhdChjaGlsZE5vZGUud2l0aENoaWxkcmVuKCkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB3aXRoTmVpZ2hib3JzTGlzdDtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXROb09mQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKVxue1xuICB2YXIgbm9PZkNoaWxkcmVuID0gMDtcbiAgdmFyIGNoaWxkTm9kZTtcblxuICBpZih0aGlzLmNoaWxkID09IG51bGwpe1xuICAgIG5vT2ZDaGlsZHJlbiA9IDE7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgdmFyIG5vZGVzID0gdGhpcy5jaGlsZC5nZXROb2RlcygpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspXG4gICAge1xuICAgICAgY2hpbGROb2RlID0gbm9kZXNbaV07XG5cbiAgICAgIG5vT2ZDaGlsZHJlbiArPSBjaGlsZE5vZGUuZ2V0Tm9PZkNoaWxkcmVuKCk7XG4gICAgfVxuICB9XG4gIFxuICBpZihub09mQ2hpbGRyZW4gPT0gMCl7XG4gICAgbm9PZkNoaWxkcmVuID0gMTtcbiAgfVxuICByZXR1cm4gbm9PZkNoaWxkcmVuO1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldEVzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmVzdGltYXRlZFNpemUgPT0gSW50ZWdlci5NSU5fVkFMVUUpIHtcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcbiAgfVxuICByZXR1cm4gdGhpcy5lc3RpbWF0ZWRTaXplO1xufTtcblxuTE5vZGUucHJvdG90eXBlLmNhbGNFc3RpbWF0ZWRTaXplID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5jaGlsZCA9PSBudWxsKVxuICB7XG4gICAgcmV0dXJuIHRoaXMuZXN0aW1hdGVkU2l6ZSA9ICh0aGlzLnJlY3Qud2lkdGggKyB0aGlzLnJlY3QuaGVpZ2h0KSAvIDI7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgdGhpcy5lc3RpbWF0ZWRTaXplID0gdGhpcy5jaGlsZC5jYWxjRXN0aW1hdGVkU2l6ZSgpO1xuICAgIHRoaXMucmVjdC53aWR0aCA9IHRoaXMuZXN0aW1hdGVkU2l6ZTtcbiAgICB0aGlzLnJlY3QuaGVpZ2h0ID0gdGhpcy5lc3RpbWF0ZWRTaXplO1xuXG4gICAgcmV0dXJuIHRoaXMuZXN0aW1hdGVkU2l6ZTtcbiAgfVxufTtcblxuTE5vZGUucHJvdG90eXBlLnNjYXR0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByYW5kb21DZW50ZXJYO1xuICB2YXIgcmFuZG9tQ2VudGVyWTtcblxuICB2YXIgbWluWCA9IC1MYXlvdXRDb25zdGFudHMuSU5JVElBTF9XT1JMRF9CT1VOREFSWTtcbiAgdmFyIG1heFggPSBMYXlvdXRDb25zdGFudHMuSU5JVElBTF9XT1JMRF9CT1VOREFSWTtcbiAgcmFuZG9tQ2VudGVyWCA9IExheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWCArXG4gICAgICAgICAgKFJhbmRvbVNlZWQubmV4dERvdWJsZSgpICogKG1heFggLSBtaW5YKSkgKyBtaW5YO1xuXG4gIHZhciBtaW5ZID0gLUxheW91dENvbnN0YW50cy5JTklUSUFMX1dPUkxEX0JPVU5EQVJZO1xuICB2YXIgbWF4WSA9IExheW91dENvbnN0YW50cy5JTklUSUFMX1dPUkxEX0JPVU5EQVJZO1xuICByYW5kb21DZW50ZXJZID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9ZICtcbiAgICAgICAgICAoUmFuZG9tU2VlZC5uZXh0RG91YmxlKCkgKiAobWF4WSAtIG1pblkpKSArIG1pblk7XG5cbiAgdGhpcy5yZWN0LnggPSByYW5kb21DZW50ZXJYO1xuICB0aGlzLnJlY3QueSA9IHJhbmRvbUNlbnRlcllcbn07XG5cbkxOb2RlLnByb3RvdHlwZS51cGRhdGVCb3VuZHMgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmdldENoaWxkKCkgPT0gbnVsbCkge1xuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xuICB9XG4gIGlmICh0aGlzLmdldENoaWxkKCkuZ2V0Tm9kZXMoKS5sZW5ndGggIT0gMClcbiAge1xuICAgIC8vIHdyYXAgdGhlIGNoaWxkcmVuIG5vZGVzIGJ5IHJlLWFycmFuZ2luZyB0aGUgYm91bmRhcmllc1xuICAgIHZhciBjaGlsZEdyYXBoID0gdGhpcy5nZXRDaGlsZCgpO1xuICAgIGNoaWxkR3JhcGgudXBkYXRlQm91bmRzKHRydWUpO1xuXG4gICAgdGhpcy5yZWN0LnggPSBjaGlsZEdyYXBoLmdldExlZnQoKTtcbiAgICB0aGlzLnJlY3QueSA9IGNoaWxkR3JhcGguZ2V0VG9wKCk7XG5cbiAgICB0aGlzLnNldFdpZHRoKGNoaWxkR3JhcGguZ2V0UmlnaHQoKSAtIGNoaWxkR3JhcGguZ2V0TGVmdCgpKTtcbiAgICB0aGlzLnNldEhlaWdodChjaGlsZEdyYXBoLmdldEJvdHRvbSgpIC0gY2hpbGRHcmFwaC5nZXRUb3AoKSk7XG4gICAgXG4gICAgLy8gVXBkYXRlIGNvbXBvdW5kIGJvdW5kcyBjb25zaWRlcmluZyBpdHMgbGFiZWwgcHJvcGVydGllcyAgICBcbiAgICBpZihMYXlvdXRDb25zdGFudHMuTk9ERV9ESU1FTlNJT05TX0lOQ0xVREVfTEFCRUxTKXtcbiAgICAgICAgXG4gICAgICB2YXIgd2lkdGggPSBjaGlsZEdyYXBoLmdldFJpZ2h0KCkgLSBjaGlsZEdyYXBoLmdldExlZnQoKTtcbiAgICAgIHZhciBoZWlnaHQgPSBjaGlsZEdyYXBoLmdldEJvdHRvbSgpIC0gY2hpbGRHcmFwaC5nZXRUb3AoKTtcblxuICAgICAgaWYodGhpcy5sYWJlbFdpZHRoID4gd2lkdGgpe1xuICAgICAgICB0aGlzLnJlY3QueCAtPSAodGhpcy5sYWJlbFdpZHRoIC0gd2lkdGgpIC8gMjtcbiAgICAgICAgdGhpcy5zZXRXaWR0aCh0aGlzLmxhYmVsV2lkdGgpO1xuICAgICAgfVxuXG4gICAgICBpZih0aGlzLmxhYmVsSGVpZ2h0ID4gaGVpZ2h0KXtcbiAgICAgICAgaWYodGhpcy5sYWJlbFBvcyA9PSBcImNlbnRlclwiKXtcbiAgICAgICAgICB0aGlzLnJlY3QueSAtPSAodGhpcy5sYWJlbEhlaWdodCAtIGhlaWdodCkgLyAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYodGhpcy5sYWJlbFBvcyA9PSBcInRvcFwiKXtcbiAgICAgICAgICB0aGlzLnJlY3QueSAtPSAodGhpcy5sYWJlbEhlaWdodCAtIGhlaWdodCk7IFxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0SGVpZ2h0KHRoaXMubGFiZWxIZWlnaHQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuTE5vZGUucHJvdG90eXBlLmdldEluY2x1c2lvblRyZWVEZXB0aCA9IGZ1bmN0aW9uICgpXG57XG4gIGlmICh0aGlzLmluY2x1c2lvblRyZWVEZXB0aCA9PSBJbnRlZ2VyLk1BWF9WQUxVRSkge1xuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xuICB9XG4gIHJldHVybiB0aGlzLmluY2x1c2lvblRyZWVEZXB0aDtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAodHJhbnMpXG57XG4gIHZhciBsZWZ0ID0gdGhpcy5yZWN0Lng7XG5cbiAgaWYgKGxlZnQgPiBMYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlkpXG4gIHtcbiAgICBsZWZ0ID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZO1xuICB9XG4gIGVsc2UgaWYgKGxlZnQgPCAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxuICB7XG4gICAgbGVmdCA9IC1MYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlk7XG4gIH1cblxuICB2YXIgdG9wID0gdGhpcy5yZWN0Lnk7XG5cbiAgaWYgKHRvcCA+IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSlcbiAge1xuICAgIHRvcCA9IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWTtcbiAgfVxuICBlbHNlIGlmICh0b3AgPCAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxuICB7XG4gICAgdG9wID0gLUxheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWTtcbiAgfVxuXG4gIHZhciBsZWZ0VG9wID0gbmV3IFBvaW50RChsZWZ0LCB0b3ApO1xuICB2YXIgdkxlZnRUb3AgPSB0cmFucy5pbnZlcnNlVHJhbnNmb3JtUG9pbnQobGVmdFRvcCk7XG5cbiAgdGhpcy5zZXRMb2NhdGlvbih2TGVmdFRvcC54LCB2TGVmdFRvcC55KTtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRMZWZ0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMucmVjdC54O1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldFJpZ2h0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMucmVjdC54ICsgdGhpcy5yZWN0LndpZHRoO1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldFRvcCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnJlY3QueTtcbn07XG5cbkxOb2RlLnByb3RvdHlwZS5nZXRCb3R0b20gPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5yZWN0LnkgKyB0aGlzLnJlY3QuaGVpZ2h0O1xufTtcblxuTE5vZGUucHJvdG90eXBlLmdldFBhcmVudCA9IGZ1bmN0aW9uICgpXG57XG4gIGlmICh0aGlzLm93bmVyID09IG51bGwpXG4gIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLm93bmVyLmdldFBhcmVudCgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMTm9kZTtcbiIsInZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xudmFyIEhhc2hNYXAgPSByZXF1aXJlKCcuL0hhc2hNYXAnKTtcbnZhciBMR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9MR3JhcGhNYW5hZ2VyJyk7XG52YXIgTE5vZGUgPSByZXF1aXJlKCcuL0xOb2RlJyk7XG52YXIgTEVkZ2UgPSByZXF1aXJlKCcuL0xFZGdlJyk7XG52YXIgTEdyYXBoID0gcmVxdWlyZSgnLi9MR3JhcGgnKTtcbnZhciBQb2ludEQgPSByZXF1aXJlKCcuL1BvaW50RCcpO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyk7XG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJy4vRW1pdHRlcicpO1xudmFyIEhhc2hTZXQgPSByZXF1aXJlKCcuL0hhc2hTZXQnKTtcblxuZnVuY3Rpb24gTGF5b3V0KGlzUmVtb3RlVXNlKSB7XG4gIEVtaXR0ZXIuY2FsbCggdGhpcyApO1xuXG4gIC8vTGF5b3V0IFF1YWxpdHk6IDA6cHJvb2YsIDE6ZGVmYXVsdCwgMjpkcmFmdFxuICB0aGlzLmxheW91dFF1YWxpdHkgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9RVUFMSVRZO1xuICAvL1doZXRoZXIgbGF5b3V0IHNob3VsZCBjcmVhdGUgYmVuZHBvaW50cyBhcyBuZWVkZWQgb3Igbm90XG4gIHRoaXMuY3JlYXRlQmVuZHNBc05lZWRlZCA9XG4gICAgICAgICAgTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ1JFQVRFX0JFTkRTX0FTX05FRURFRDtcbiAgLy9XaGV0aGVyIGxheW91dCBzaG91bGQgYmUgaW5jcmVtZW50YWwgb3Igbm90XG4gIHRoaXMuaW5jcmVtZW50YWwgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTDtcbiAgLy9XaGV0aGVyIHdlIGFuaW1hdGUgZnJvbSBiZWZvcmUgdG8gYWZ0ZXIgbGF5b3V0IG5vZGUgcG9zaXRpb25zXG4gIHRoaXMuYW5pbWF0aW9uT25MYXlvdXQgPVxuICAgICAgICAgIExheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9PTl9MQVlPVVQ7XG4gIC8vV2hldGhlciB3ZSBhbmltYXRlIHRoZSBsYXlvdXQgcHJvY2VzcyBvciBub3RcbiAgdGhpcy5hbmltYXRpb25EdXJpbmdMYXlvdXQgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fRFVSSU5HX0xBWU9VVDtcbiAgLy9OdW1iZXIgaXRlcmF0aW9ucyB0aGF0IHNob3VsZCBiZSBkb25lIGJldHdlZW4gdHdvIHN1Y2Nlc3NpdmUgYW5pbWF0aW9uc1xuICB0aGlzLmFuaW1hdGlvblBlcmlvZCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9QRVJJT0Q7XG4gIC8qKlxuICAgKiBXaGV0aGVyIG9yIG5vdCBsZWFmIG5vZGVzIChub24tY29tcG91bmQgbm9kZXMpIGFyZSBvZiB1bmlmb3JtIHNpemVzLiBXaGVuXG4gICAqIHRoZXkgYXJlLCBib3RoIHNwcmluZyBhbmQgcmVwdWxzaW9uIGZvcmNlcyBiZXR3ZWVuIHR3byBsZWFmIG5vZGVzIGNhbiBiZVxuICAgKiBjYWxjdWxhdGVkIHdpdGhvdXQgdGhlIGV4cGVuc2l2ZSBjbGlwcGluZyBwb2ludCBjYWxjdWxhdGlvbnMsIHJlc3VsdGluZ1xuICAgKiBpbiBtYWpvciBzcGVlZC11cC5cbiAgICovXG4gIHRoaXMudW5pZm9ybUxlYWZOb2RlU2l6ZXMgPVxuICAgICAgICAgIExheW91dENvbnN0YW50cy5ERUZBVUxUX1VOSUZPUk1fTEVBRl9OT0RFX1NJWkVTO1xuICAvKipcbiAgICogVGhpcyBpcyB1c2VkIGZvciBjcmVhdGlvbiBvZiBiZW5kcG9pbnRzIGJ5IHVzaW5nIGR1bW15IG5vZGVzIGFuZCBlZGdlcy5cbiAgICogTWFwcyBhbiBMRWRnZSB0byBpdHMgZHVtbXkgYmVuZHBvaW50IHBhdGguXG4gICAqL1xuICB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMgPSBuZXcgSGFzaE1hcCgpO1xuICB0aGlzLmdyYXBoTWFuYWdlciA9IG5ldyBMR3JhcGhNYW5hZ2VyKHRoaXMpO1xuICB0aGlzLmlzTGF5b3V0RmluaXNoZWQgPSBmYWxzZTtcbiAgdGhpcy5pc1N1YkxheW91dCA9IGZhbHNlO1xuICB0aGlzLmlzUmVtb3RlVXNlID0gZmFsc2U7XG5cbiAgaWYgKGlzUmVtb3RlVXNlICE9IG51bGwpIHtcbiAgICB0aGlzLmlzUmVtb3RlVXNlID0gaXNSZW1vdGVVc2U7XG4gIH1cbn1cblxuTGF5b3V0LlJBTkRPTV9TRUVEID0gMTtcblxuTGF5b3V0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEVtaXR0ZXIucHJvdG90eXBlICk7XG5cbkxheW91dC5wcm90b3R5cGUuZ2V0R3JhcGhNYW5hZ2VyID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXI7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLmdldEFsbE5vZGVzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsTm9kZXMoKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUuZ2V0QWxsRWRnZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxFZGdlcygpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZS5nZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uKCk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLm5ld0dyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGdtID0gbmV3IExHcmFwaE1hbmFnZXIodGhpcyk7XG4gIHRoaXMuZ3JhcGhNYW5hZ2VyID0gZ207XG4gIHJldHVybiBnbTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUubmV3R3JhcGggPSBmdW5jdGlvbiAodkdyYXBoKVxue1xuICByZXR1cm4gbmV3IExHcmFwaChudWxsLCB0aGlzLmdyYXBoTWFuYWdlciwgdkdyYXBoKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUubmV3Tm9kZSA9IGZ1bmN0aW9uICh2Tm9kZSlcbntcbiAgcmV0dXJuIG5ldyBMTm9kZSh0aGlzLmdyYXBoTWFuYWdlciwgdk5vZGUpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZS5uZXdFZGdlID0gZnVuY3Rpb24gKHZFZGdlKVxue1xuICByZXR1cm4gbmV3IExFZGdlKG51bGwsIG51bGwsIHZFZGdlKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUuY2hlY2tMYXlvdXRTdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAodGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpID09IG51bGwpXG4gICAgICAgICAgfHwgdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmdldE5vZGVzKCkubGVuZ3RoID09IDBcbiAgICAgICAgICB8fCB0aGlzLmdyYXBoTWFuYWdlci5pbmNsdWRlc0ludmFsaWRFZGdlKCk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLnJ1bkxheW91dCA9IGZ1bmN0aW9uICgpXG57XG4gIHRoaXMuaXNMYXlvdXRGaW5pc2hlZCA9IGZhbHNlO1xuICBcbiAgaWYgKHRoaXMudGlsaW5nUHJlTGF5b3V0KSB7XG4gICAgdGhpcy50aWxpbmdQcmVMYXlvdXQoKTtcbiAgfVxuXG4gIHRoaXMuaW5pdFBhcmFtZXRlcnMoKTtcbiAgdmFyIGlzTGF5b3V0U3VjY2Vzc2Z1bGw7XG5cbiAgaWYgKHRoaXMuY2hlY2tMYXlvdXRTdWNjZXNzKCkpXG4gIHtcbiAgICBpc0xheW91dFN1Y2Nlc3NmdWxsID0gZmFsc2U7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgaXNMYXlvdXRTdWNjZXNzZnVsbCA9IHRoaXMubGF5b3V0KCk7XG4gIH1cbiAgXG4gIGlmIChMYXlvdXRDb25zdGFudHMuQU5JTUFURSA9PT0gJ2R1cmluZycpIHtcbiAgICAvLyBJZiB0aGlzIGlzIGEgJ2R1cmluZycgbGF5b3V0IGFuaW1hdGlvbi4gTGF5b3V0IGlzIG5vdCBmaW5pc2hlZCB5ZXQuIFxuICAgIC8vIFdlIG5lZWQgdG8gcGVyZm9ybSB0aGVzZSBpbiBpbmRleC5qcyB3aGVuIGxheW91dCBpcyByZWFsbHkgZmluaXNoZWQuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIFxuICBpZiAoaXNMYXlvdXRTdWNjZXNzZnVsbClcbiAge1xuICAgIGlmICghdGhpcy5pc1N1YkxheW91dClcbiAgICB7XG4gICAgICB0aGlzLmRvUG9zdExheW91dCgpO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0aGlzLnRpbGluZ1Bvc3RMYXlvdXQpIHtcbiAgICB0aGlzLnRpbGluZ1Bvc3RMYXlvdXQoKTtcbiAgfVxuXG4gIHRoaXMuaXNMYXlvdXRGaW5pc2hlZCA9IHRydWU7XG5cbiAgcmV0dXJuIGlzTGF5b3V0U3VjY2Vzc2Z1bGw7XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIHBlcmZvcm1zIHRoZSBvcGVyYXRpb25zIHJlcXVpcmVkIGFmdGVyIGxheW91dC5cbiAqL1xuTGF5b3V0LnByb3RvdHlwZS5kb1Bvc3RMYXlvdXQgPSBmdW5jdGlvbiAoKVxue1xuICAvL2Fzc2VydCAhaXNTdWJMYXlvdXQgOiBcIlNob3VsZCBub3QgYmUgY2FsbGVkIG9uIHN1Yi1sYXlvdXQhXCI7XG4gIC8vIFByb3BhZ2F0ZSBnZW9tZXRyaWMgY2hhbmdlcyB0byB2LWxldmVsIG9iamVjdHNcbiAgaWYoIXRoaXMuaW5jcmVtZW50YWwpe1xuICAgIHRoaXMudHJhbnNmb3JtKCk7XG4gIH1cbiAgdGhpcy51cGRhdGUoKTtcbn07XG5cbi8qKlxuICogVGhpcyBtZXRob2QgdXBkYXRlcyB0aGUgZ2VvbWV0cnkgb2YgdGhlIHRhcmdldCBncmFwaCBhY2NvcmRpbmcgdG9cbiAqIGNhbGN1bGF0ZWQgbGF5b3V0LlxuICovXG5MYXlvdXQucHJvdG90eXBlLnVwZGF0ZTIgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIHVwZGF0ZSBiZW5kIHBvaW50c1xuICBpZiAodGhpcy5jcmVhdGVCZW5kc0FzTmVlZGVkKVxuICB7XG4gICAgdGhpcy5jcmVhdGVCZW5kcG9pbnRzRnJvbUR1bW15Tm9kZXMoKTtcblxuICAgIC8vIHJlc2V0IGFsbCBlZGdlcywgc2luY2UgdGhlIHRvcG9sb2d5IGhhcyBjaGFuZ2VkXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIucmVzZXRBbGxFZGdlcygpO1xuICB9XG5cbiAgLy8gcGVyZm9ybSBlZGdlLCBub2RlIGFuZCByb290IHVwZGF0ZXMgaWYgbGF5b3V0IGlzIG5vdCBjYWxsZWRcbiAgLy8gcmVtb3RlbHlcbiAgaWYgKCF0aGlzLmlzUmVtb3RlVXNlKVxuICB7XG4gICAgLy8gdXBkYXRlIGFsbCBlZGdlc1xuICAgIHZhciBlZGdlO1xuICAgIHZhciBhbGxFZGdlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbEVkZ2VzKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbGxFZGdlcy5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICBlZGdlID0gYWxsRWRnZXNbaV07XG4vLyAgICAgIHRoaXMudXBkYXRlKGVkZ2UpO1xuICAgIH1cblxuICAgIC8vIHJlY3Vyc2l2ZWx5IHVwZGF0ZSBub2Rlc1xuICAgIHZhciBub2RlO1xuICAgIHZhciBub2RlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXROb2RlcygpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspXG4gICAge1xuICAgICAgbm9kZSA9IG5vZGVzW2ldO1xuLy8gICAgICB0aGlzLnVwZGF0ZShub2RlKTtcbiAgICB9XG5cbiAgICAvLyB1cGRhdGUgcm9vdCBncmFwaFxuICAgIHRoaXMudXBkYXRlKHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKSk7XG4gIH1cbn07XG5cbkxheW91dC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKG9iaikge1xuICBpZiAob2JqID09IG51bGwpIHtcbiAgICB0aGlzLnVwZGF0ZTIoKTtcbiAgfVxuICBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBMTm9kZSkge1xuICAgIHZhciBub2RlID0gb2JqO1xuICAgIGlmIChub2RlLmdldENoaWxkKCkgIT0gbnVsbClcbiAgICB7XG4gICAgICAvLyBzaW5jZSBub2RlIGlzIGNvbXBvdW5kLCByZWN1cnNpdmVseSB1cGRhdGUgY2hpbGQgbm9kZXNcbiAgICAgIHZhciBub2RlcyA9IG5vZGUuZ2V0Q2hpbGQoKS5nZXROb2RlcygpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcbiAgICAgIHtcbiAgICAgICAgdXBkYXRlKG5vZGVzW2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpZiB0aGUgbC1sZXZlbCBub2RlIGlzIGFzc29jaWF0ZWQgd2l0aCBhIHYtbGV2ZWwgZ3JhcGggb2JqZWN0LFxuICAgIC8vIHRoZW4gaXQgaXMgYXNzdW1lZCB0aGF0IHRoZSB2LWxldmVsIG5vZGUgaW1wbGVtZW50cyB0aGVcbiAgICAvLyBpbnRlcmZhY2UgVXBkYXRhYmxlLlxuICAgIGlmIChub2RlLnZHcmFwaE9iamVjdCAhPSBudWxsKVxuICAgIHtcbiAgICAgIC8vIGNhc3QgdG8gVXBkYXRhYmxlIHdpdGhvdXQgYW55IHR5cGUgY2hlY2tcbiAgICAgIHZhciB2Tm9kZSA9IG5vZGUudkdyYXBoT2JqZWN0O1xuXG4gICAgICAvLyBjYWxsIHRoZSB1cGRhdGUgbWV0aG9kIG9mIHRoZSBpbnRlcmZhY2VcbiAgICAgIHZOb2RlLnVwZGF0ZShub2RlKTtcbiAgICB9XG4gIH1cbiAgZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgTEVkZ2UpIHtcbiAgICB2YXIgZWRnZSA9IG9iajtcbiAgICAvLyBpZiB0aGUgbC1sZXZlbCBlZGdlIGlzIGFzc29jaWF0ZWQgd2l0aCBhIHYtbGV2ZWwgZ3JhcGggb2JqZWN0LFxuICAgIC8vIHRoZW4gaXQgaXMgYXNzdW1lZCB0aGF0IHRoZSB2LWxldmVsIGVkZ2UgaW1wbGVtZW50cyB0aGVcbiAgICAvLyBpbnRlcmZhY2UgVXBkYXRhYmxlLlxuXG4gICAgaWYgKGVkZ2UudkdyYXBoT2JqZWN0ICE9IG51bGwpXG4gICAge1xuICAgICAgLy8gY2FzdCB0byBVcGRhdGFibGUgd2l0aG91dCBhbnkgdHlwZSBjaGVja1xuICAgICAgdmFyIHZFZGdlID0gZWRnZS52R3JhcGhPYmplY3Q7XG5cbiAgICAgIC8vIGNhbGwgdGhlIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGludGVyZmFjZVxuICAgICAgdkVkZ2UudXBkYXRlKGVkZ2UpO1xuICAgIH1cbiAgfVxuICBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBMR3JhcGgpIHtcbiAgICB2YXIgZ3JhcGggPSBvYmo7XG4gICAgLy8gaWYgdGhlIGwtbGV2ZWwgZ3JhcGggaXMgYXNzb2NpYXRlZCB3aXRoIGEgdi1sZXZlbCBncmFwaCBvYmplY3QsXG4gICAgLy8gdGhlbiBpdCBpcyBhc3N1bWVkIHRoYXQgdGhlIHYtbGV2ZWwgb2JqZWN0IGltcGxlbWVudHMgdGhlXG4gICAgLy8gaW50ZXJmYWNlIFVwZGF0YWJsZS5cblxuICAgIGlmIChncmFwaC52R3JhcGhPYmplY3QgIT0gbnVsbClcbiAgICB7XG4gICAgICAvLyBjYXN0IHRvIFVwZGF0YWJsZSB3aXRob3V0IGFueSB0eXBlIGNoZWNrXG4gICAgICB2YXIgdkdyYXBoID0gZ3JhcGgudkdyYXBoT2JqZWN0O1xuXG4gICAgICAvLyBjYWxsIHRoZSB1cGRhdGUgbWV0aG9kIG9mIHRoZSBpbnRlcmZhY2VcbiAgICAgIHZHcmFwaC51cGRhdGUoZ3JhcGgpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBpcyB1c2VkIHRvIHNldCBhbGwgbGF5b3V0IHBhcmFtZXRlcnMgdG8gZGVmYXVsdCB2YWx1ZXNcbiAqIGRldGVybWluZWQgYXQgY29tcGlsZSB0aW1lLlxuICovXG5MYXlvdXQucHJvdG90eXBlLmluaXRQYXJhbWV0ZXJzID0gZnVuY3Rpb24gKCkge1xuICBpZiAoIXRoaXMuaXNTdWJMYXlvdXQpXG4gIHtcbiAgICB0aGlzLmxheW91dFF1YWxpdHkgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9RVUFMSVRZO1xuICAgIHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX0RVUklOR19MQVlPVVQ7XG4gICAgdGhpcy5hbmltYXRpb25QZXJpb2QgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fUEVSSU9EO1xuICAgIHRoaXMuYW5pbWF0aW9uT25MYXlvdXQgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fT05fTEFZT1VUO1xuICAgIHRoaXMuaW5jcmVtZW50YWwgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTDtcbiAgICB0aGlzLmNyZWF0ZUJlbmRzQXNOZWVkZWQgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DUkVBVEVfQkVORFNfQVNfTkVFREVEO1xuICAgIHRoaXMudW5pZm9ybUxlYWZOb2RlU2l6ZXMgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VTklGT1JNX0xFQUZfTk9ERV9TSVpFUztcbiAgfVxuXG4gIGlmICh0aGlzLmFuaW1hdGlvbkR1cmluZ0xheW91dClcbiAge1xuICAgIHRoaXMuYW5pbWF0aW9uT25MYXlvdXQgPSBmYWxzZTtcbiAgfVxufTtcblxuTGF5b3V0LnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAobmV3TGVmdFRvcCkge1xuICBpZiAobmV3TGVmdFRvcCA9PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLnRyYW5zZm9ybShuZXcgUG9pbnREKDAsIDApKTtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBjcmVhdGUgYSB0cmFuc2Zvcm1hdGlvbiBvYmplY3QgKGZyb20gRWNsaXBzZSB0byBsYXlvdXQpLiBXaGVuIGFuXG4gICAgLy8gaW52ZXJzZSB0cmFuc2Zvcm0gaXMgYXBwbGllZCwgd2UgZ2V0IHVwcGVyLWxlZnQgY29vcmRpbmF0ZSBvZiB0aGVcbiAgICAvLyBkcmF3aW5nIG9yIHRoZSByb290IGdyYXBoIGF0IGdpdmVuIGlucHV0IGNvb3JkaW5hdGUgKHNvbWUgbWFyZ2luc1xuICAgIC8vIGFscmVhZHkgaW5jbHVkZWQgaW4gY2FsY3VsYXRpb24gb2YgbGVmdC10b3ApLlxuXG4gICAgdmFyIHRyYW5zID0gbmV3IFRyYW5zZm9ybSgpO1xuICAgIHZhciBsZWZ0VG9wID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLnVwZGF0ZUxlZnRUb3AoKTtcblxuICAgIGlmIChsZWZ0VG9wICE9IG51bGwpXG4gICAge1xuICAgICAgdHJhbnMuc2V0V29ybGRPcmdYKG5ld0xlZnRUb3AueCk7XG4gICAgICB0cmFucy5zZXRXb3JsZE9yZ1kobmV3TGVmdFRvcC55KTtcblxuICAgICAgdHJhbnMuc2V0RGV2aWNlT3JnWChsZWZ0VG9wLngpO1xuICAgICAgdHJhbnMuc2V0RGV2aWNlT3JnWShsZWZ0VG9wLnkpO1xuXG4gICAgICB2YXIgbm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzKCk7XG4gICAgICB2YXIgbm9kZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcbiAgICAgIHtcbiAgICAgICAgbm9kZSA9IG5vZGVzW2ldO1xuICAgICAgICBub2RlLnRyYW5zZm9ybSh0cmFucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLnBvc2l0aW9uTm9kZXNSYW5kb21seSA9IGZ1bmN0aW9uIChncmFwaCkge1xuXG4gIGlmIChncmFwaCA9PSB1bmRlZmluZWQpIHtcbiAgICAvL2Fzc2VydCAhdGhpcy5pbmNyZW1lbnRhbDtcbiAgICB0aGlzLnBvc2l0aW9uTm9kZXNSYW5kb21seSh0aGlzLmdldEdyYXBoTWFuYWdlcigpLmdldFJvb3QoKSk7XG4gICAgdGhpcy5nZXRHcmFwaE1hbmFnZXIoKS5nZXRSb290KCkudXBkYXRlQm91bmRzKHRydWUpO1xuICB9XG4gIGVsc2Uge1xuICAgIHZhciBsTm9kZTtcbiAgICB2YXIgY2hpbGRHcmFwaDtcblxuICAgIHZhciBub2RlcyA9IGdyYXBoLmdldE5vZGVzKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICBsTm9kZSA9IG5vZGVzW2ldO1xuICAgICAgY2hpbGRHcmFwaCA9IGxOb2RlLmdldENoaWxkKCk7XG5cbiAgICAgIGlmIChjaGlsZEdyYXBoID09IG51bGwpXG4gICAgICB7XG4gICAgICAgIGxOb2RlLnNjYXR0ZXIoKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGNoaWxkR3JhcGguZ2V0Tm9kZXMoKS5sZW5ndGggPT0gMClcbiAgICAgIHtcbiAgICAgICAgbE5vZGUuc2NhdHRlcigpO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICB0aGlzLnBvc2l0aW9uTm9kZXNSYW5kb21seShjaGlsZEdyYXBoKTtcbiAgICAgICAgbE5vZGUudXBkYXRlQm91bmRzKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIHJldHVybnMgYSBsaXN0IG9mIHRyZWVzIHdoZXJlIGVhY2ggdHJlZSBpcyByZXByZXNlbnRlZCBhcyBhXG4gKiBsaXN0IG9mIGwtbm9kZXMuIFRoZSBtZXRob2QgcmV0dXJucyBhIGxpc3Qgb2Ygc2l6ZSAwIHdoZW46XG4gKiAtIFRoZSBncmFwaCBpcyBub3QgZmxhdCBvclxuICogLSBPbmUgb2YgdGhlIGNvbXBvbmVudChzKSBvZiB0aGUgZ3JhcGggaXMgbm90IGEgdHJlZS5cbiAqL1xuTGF5b3V0LnByb3RvdHlwZS5nZXRGbGF0Rm9yZXN0ID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIGZsYXRGb3Jlc3QgPSBbXTtcbiAgdmFyIGlzRm9yZXN0ID0gdHJ1ZTtcblxuICAvLyBRdWljayByZWZlcmVuY2UgZm9yIGFsbCBub2RlcyBpbiB0aGUgZ3JhcGggbWFuYWdlciBhc3NvY2lhdGVkIHdpdGhcbiAgLy8gdGhpcyBsYXlvdXQuIFRoZSBsaXN0IHNob3VsZCBub3QgYmUgY2hhbmdlZC5cbiAgdmFyIGFsbE5vZGVzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmdldE5vZGVzKCk7XG5cbiAgLy8gRmlyc3QgYmUgc3VyZSB0aGF0IHRoZSBncmFwaCBpcyBmbGF0XG4gIHZhciBpc0ZsYXQgPSB0cnVlO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsTm9kZXMubGVuZ3RoOyBpKyspXG4gIHtcbiAgICBpZiAoYWxsTm9kZXNbaV0uZ2V0Q2hpbGQoKSAhPSBudWxsKVxuICAgIHtcbiAgICAgIGlzRmxhdCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybiBlbXB0eSBmb3Jlc3QgaWYgdGhlIGdyYXBoIGlzIG5vdCBmbGF0LlxuICBpZiAoIWlzRmxhdClcbiAge1xuICAgIHJldHVybiBmbGF0Rm9yZXN0O1xuICB9XG5cbiAgLy8gUnVuIEJGUyBmb3IgZWFjaCBjb21wb25lbnQgb2YgdGhlIGdyYXBoLlxuXG4gIHZhciB2aXNpdGVkID0gbmV3IEhhc2hTZXQoKTtcbiAgdmFyIHRvQmVWaXNpdGVkID0gW107XG4gIHZhciBwYXJlbnRzID0gbmV3IEhhc2hNYXAoKTtcbiAgdmFyIHVuUHJvY2Vzc2VkTm9kZXMgPSBbXTtcblxuICB1blByb2Nlc3NlZE5vZGVzID0gdW5Qcm9jZXNzZWROb2Rlcy5jb25jYXQoYWxsTm9kZXMpO1xuXG4gIC8vIEVhY2ggaXRlcmF0aW9uIG9mIHRoaXMgbG9vcCBmaW5kcyBhIGNvbXBvbmVudCBvZiB0aGUgZ3JhcGggYW5kXG4gIC8vIGRlY2lkZXMgd2hldGhlciBpdCBpcyBhIHRyZWUgb3Igbm90LiBJZiBpdCBpcyBhIHRyZWUsIGFkZHMgaXQgdG8gdGhlXG4gIC8vIGZvcmVzdCBhbmQgY29udGludWVkIHdpdGggdGhlIG5leHQgY29tcG9uZW50LlxuXG4gIHdoaWxlICh1blByb2Nlc3NlZE5vZGVzLmxlbmd0aCA+IDAgJiYgaXNGb3Jlc3QpXG4gIHtcbiAgICB0b0JlVmlzaXRlZC5wdXNoKHVuUHJvY2Vzc2VkTm9kZXNbMF0pO1xuXG4gICAgLy8gU3RhcnQgdGhlIEJGUy4gRWFjaCBpdGVyYXRpb24gb2YgdGhpcyBsb29wIHZpc2l0cyBhIG5vZGUgaW4gYVxuICAgIC8vIEJGUyBtYW5uZXIuXG4gICAgd2hpbGUgKHRvQmVWaXNpdGVkLmxlbmd0aCA+IDAgJiYgaXNGb3Jlc3QpXG4gICAge1xuICAgICAgLy9wb29sIG9wZXJhdGlvblxuICAgICAgdmFyIGN1cnJlbnROb2RlID0gdG9CZVZpc2l0ZWRbMF07XG4gICAgICB0b0JlVmlzaXRlZC5zcGxpY2UoMCwgMSk7XG4gICAgICB2aXNpdGVkLmFkZChjdXJyZW50Tm9kZSk7XG5cbiAgICAgIC8vIFRyYXZlcnNlIGFsbCBuZWlnaGJvcnMgb2YgdGhpcyBub2RlXG4gICAgICB2YXIgbmVpZ2hib3JFZGdlcyA9IGN1cnJlbnROb2RlLmdldEVkZ2VzKCk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmVpZ2hib3JFZGdlcy5sZW5ndGg7IGkrKylcbiAgICAgIHtcbiAgICAgICAgdmFyIGN1cnJlbnROZWlnaGJvciA9XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JFZGdlc1tpXS5nZXRPdGhlckVuZChjdXJyZW50Tm9kZSk7XG5cbiAgICAgICAgLy8gSWYgQkZTIGlzIG5vdCBncm93aW5nIGZyb20gdGhpcyBuZWlnaGJvci5cbiAgICAgICAgaWYgKHBhcmVudHMuZ2V0KGN1cnJlbnROb2RlKSAhPSBjdXJyZW50TmVpZ2hib3IpXG4gICAgICAgIHtcbiAgICAgICAgICAvLyBXZSBoYXZlbid0IHByZXZpb3VzbHkgdmlzaXRlZCB0aGlzIG5laWdoYm9yLlxuICAgICAgICAgIGlmICghdmlzaXRlZC5jb250YWlucyhjdXJyZW50TmVpZ2hib3IpKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRvQmVWaXNpdGVkLnB1c2goY3VycmVudE5laWdoYm9yKTtcbiAgICAgICAgICAgIHBhcmVudHMucHV0KGN1cnJlbnROZWlnaGJvciwgY3VycmVudE5vZGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBTaW5jZSB3ZSBoYXZlIHByZXZpb3VzbHkgdmlzaXRlZCB0aGlzIG5laWdoYm9yIGFuZFxuICAgICAgICAgIC8vIHRoaXMgbmVpZ2hib3IgaXMgbm90IHBhcmVudCBvZiBjdXJyZW50Tm9kZSwgZ2l2ZW5cbiAgICAgICAgICAvLyBncmFwaCBjb250YWlucyBhIGNvbXBvbmVudCB0aGF0IGlzIG5vdCB0cmVlLCBoZW5jZVxuICAgICAgICAgIC8vIGl0IGlzIG5vdCBhIGZvcmVzdC5cbiAgICAgICAgICBlbHNlXG4gICAgICAgICAge1xuICAgICAgICAgICAgaXNGb3Jlc3QgPSBmYWxzZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBncmFwaCBjb250YWlucyBhIGNvbXBvbmVudCB0aGF0IGlzIG5vdCBhIHRyZWUuIEVtcHR5XG4gICAgLy8gcHJldmlvdXNseSBmb3VuZCB0cmVlcy4gVGhlIG1ldGhvZCB3aWxsIGVuZC5cbiAgICBpZiAoIWlzRm9yZXN0KVxuICAgIHtcbiAgICAgIGZsYXRGb3Jlc3QgPSBbXTtcbiAgICB9XG4gICAgLy8gU2F2ZSBjdXJyZW50bHkgdmlzaXRlZCBub2RlcyBhcyBhIHRyZWUgaW4gb3VyIGZvcmVzdC4gUmVzZXRcbiAgICAvLyB2aXNpdGVkIGFuZCBwYXJlbnRzIGxpc3RzLiBDb250aW51ZSB3aXRoIHRoZSBuZXh0IGNvbXBvbmVudCBvZlxuICAgIC8vIHRoZSBncmFwaCwgaWYgYW55LlxuICAgIGVsc2VcbiAgICB7XG4gICAgICB2YXIgdGVtcCA9IFtdO1xuICAgICAgdmlzaXRlZC5hZGRBbGxUbyh0ZW1wKTtcbiAgICAgIGZsYXRGb3Jlc3QucHVzaCh0ZW1wKTtcbiAgICAgIC8vZmxhdEZvcmVzdCA9IGZsYXRGb3Jlc3QuY29uY2F0KHRlbXApO1xuICAgICAgLy91blByb2Nlc3NlZE5vZGVzLnJlbW92ZUFsbCh2aXNpdGVkKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGVtcC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgdmFsdWUgPSB0ZW1wW2ldO1xuICAgICAgICB2YXIgaW5kZXggPSB1blByb2Nlc3NlZE5vZGVzLmluZGV4T2YodmFsdWUpO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgIHVuUHJvY2Vzc2VkTm9kZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmlzaXRlZCA9IG5ldyBIYXNoU2V0KCk7XG4gICAgICBwYXJlbnRzID0gbmV3IEhhc2hNYXAoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmxhdEZvcmVzdDtcbn07XG5cbi8qKlxuICogVGhpcyBtZXRob2QgY3JlYXRlcyBkdW1teSBub2RlcyAoYW4gbC1sZXZlbCBub2RlIHdpdGggbWluaW1hbCBkaW1lbnNpb25zKVxuICogZm9yIHRoZSBnaXZlbiBlZGdlIChvbmUgcGVyIGJlbmRwb2ludCkuIFRoZSBleGlzdGluZyBsLWxldmVsIHN0cnVjdHVyZVxuICogaXMgdXBkYXRlZCBhY2NvcmRpbmdseS5cbiAqL1xuTGF5b3V0LnByb3RvdHlwZS5jcmVhdGVEdW1teU5vZGVzRm9yQmVuZHBvaW50cyA9IGZ1bmN0aW9uIChlZGdlKVxue1xuICB2YXIgZHVtbXlOb2RlcyA9IFtdO1xuICB2YXIgcHJldiA9IGVkZ2Uuc291cmNlO1xuXG4gIHZhciBncmFwaCA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmNhbGNMb3dlc3RDb21tb25BbmNlc3RvcihlZGdlLnNvdXJjZSwgZWRnZS50YXJnZXQpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZS5iZW5kcG9pbnRzLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgLy8gY3JlYXRlIG5ldyBkdW1teSBub2RlXG4gICAgdmFyIGR1bW15Tm9kZSA9IHRoaXMubmV3Tm9kZShudWxsKTtcbiAgICBkdW1teU5vZGUuc2V0UmVjdChuZXcgUG9pbnQoMCwgMCksIG5ldyBEaW1lbnNpb24oMSwgMSkpO1xuXG4gICAgZ3JhcGguYWRkKGR1bW15Tm9kZSk7XG5cbiAgICAvLyBjcmVhdGUgbmV3IGR1bW15IGVkZ2UgYmV0d2VlbiBwcmV2IGFuZCBkdW1teSBub2RlXG4gICAgdmFyIGR1bW15RWRnZSA9IHRoaXMubmV3RWRnZShudWxsKTtcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5hZGQoZHVtbXlFZGdlLCBwcmV2LCBkdW1teU5vZGUpO1xuXG4gICAgZHVtbXlOb2Rlcy5hZGQoZHVtbXlOb2RlKTtcbiAgICBwcmV2ID0gZHVtbXlOb2RlO1xuICB9XG5cbiAgdmFyIGR1bW15RWRnZSA9IHRoaXMubmV3RWRnZShudWxsKTtcbiAgdGhpcy5ncmFwaE1hbmFnZXIuYWRkKGR1bW15RWRnZSwgcHJldiwgZWRnZS50YXJnZXQpO1xuXG4gIHRoaXMuZWRnZVRvRHVtbXlOb2Rlcy5wdXQoZWRnZSwgZHVtbXlOb2Rlcyk7XG5cbiAgLy8gcmVtb3ZlIHJlYWwgZWRnZSBmcm9tIGdyYXBoIG1hbmFnZXIgaWYgaXQgaXMgaW50ZXItZ3JhcGhcbiAgaWYgKGVkZ2UuaXNJbnRlckdyYXBoKCkpXG4gIHtcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUoZWRnZSk7XG4gIH1cbiAgLy8gZWxzZSwgcmVtb3ZlIHRoZSBlZGdlIGZyb20gdGhlIGN1cnJlbnQgZ3JhcGhcbiAgZWxzZVxuICB7XG4gICAgZ3JhcGgucmVtb3ZlKGVkZ2UpO1xuICB9XG5cbiAgcmV0dXJuIGR1bW15Tm9kZXM7XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIGNyZWF0ZXMgYmVuZHBvaW50cyBmb3IgZWRnZXMgZnJvbSB0aGUgZHVtbXkgbm9kZXNcbiAqIGF0IGwtbGV2ZWwuXG4gKi9cbkxheW91dC5wcm90b3R5cGUuY3JlYXRlQmVuZHBvaW50c0Zyb21EdW1teU5vZGVzID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIGVkZ2VzID0gW107XG4gIGVkZ2VzID0gZWRnZXMuY29uY2F0KHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbEVkZ2VzKCkpO1xuICBlZGdlcyA9IHRoaXMuZWRnZVRvRHVtbXlOb2Rlcy5rZXlTZXQoKS5jb25jYXQoZWRnZXMpO1xuXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZWRnZXMubGVuZ3RoOyBrKyspXG4gIHtcbiAgICB2YXIgbEVkZ2UgPSBlZGdlc1trXTtcblxuICAgIGlmIChsRWRnZS5iZW5kcG9pbnRzLmxlbmd0aCA+IDApXG4gICAge1xuICAgICAgdmFyIHBhdGggPSB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMuZ2V0KGxFZGdlKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRoLmxlbmd0aDsgaSsrKVxuICAgICAge1xuICAgICAgICB2YXIgZHVtbXlOb2RlID0gcGF0aFtpXTtcbiAgICAgICAgdmFyIHAgPSBuZXcgUG9pbnREKGR1bW15Tm9kZS5nZXRDZW50ZXJYKCksXG4gICAgICAgICAgICAgICAgZHVtbXlOb2RlLmdldENlbnRlclkoKSk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGJlbmRwb2ludCdzIGxvY2F0aW9uIGFjY29yZGluZyB0byBkdW1teSBub2RlXG4gICAgICAgIHZhciBlYnAgPSBsRWRnZS5iZW5kcG9pbnRzLmdldChpKTtcbiAgICAgICAgZWJwLnggPSBwLng7XG4gICAgICAgIGVicC55ID0gcC55O1xuXG4gICAgICAgIC8vIHJlbW92ZSB0aGUgZHVtbXkgbm9kZSwgZHVtbXkgZWRnZXMgaW5jaWRlbnQgd2l0aCB0aGlzXG4gICAgICAgIC8vIGR1bW15IG5vZGUgaXMgYWxzbyByZW1vdmVkICh3aXRoaW4gdGhlIHJlbW92ZSBtZXRob2QpXG4gICAgICAgIGR1bW15Tm9kZS5nZXRPd25lcigpLnJlbW92ZShkdW1teU5vZGUpO1xuICAgICAgfVxuXG4gICAgICAvLyBhZGQgdGhlIHJlYWwgZWRnZSB0byBncmFwaFxuICAgICAgdGhpcy5ncmFwaE1hbmFnZXIuYWRkKGxFZGdlLCBsRWRnZS5zb3VyY2UsIGxFZGdlLnRhcmdldCk7XG4gICAgfVxuICB9XG59O1xuXG5MYXlvdXQudHJhbnNmb3JtID0gZnVuY3Rpb24gKHNsaWRlclZhbHVlLCBkZWZhdWx0VmFsdWUsIG1pbkRpdiwgbWF4TXVsKSB7XG4gIGlmIChtaW5EaXYgIT0gdW5kZWZpbmVkICYmIG1heE11bCAhPSB1bmRlZmluZWQpIHtcbiAgICB2YXIgdmFsdWUgPSBkZWZhdWx0VmFsdWU7XG5cbiAgICBpZiAoc2xpZGVyVmFsdWUgPD0gNTApXG4gICAge1xuICAgICAgdmFyIG1pblZhbHVlID0gZGVmYXVsdFZhbHVlIC8gbWluRGl2O1xuICAgICAgdmFsdWUgLT0gKChkZWZhdWx0VmFsdWUgLSBtaW5WYWx1ZSkgLyA1MCkgKiAoNTAgLSBzbGlkZXJWYWx1ZSk7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICB2YXIgbWF4VmFsdWUgPSBkZWZhdWx0VmFsdWUgKiBtYXhNdWw7XG4gICAgICB2YWx1ZSArPSAoKG1heFZhbHVlIC0gZGVmYXVsdFZhbHVlKSAvIDUwKSAqIChzbGlkZXJWYWx1ZSAtIDUwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgZWxzZSB7XG4gICAgdmFyIGEsIGI7XG5cbiAgICBpZiAoc2xpZGVyVmFsdWUgPD0gNTApXG4gICAge1xuICAgICAgYSA9IDkuMCAqIGRlZmF1bHRWYWx1ZSAvIDUwMC4wO1xuICAgICAgYiA9IGRlZmF1bHRWYWx1ZSAvIDEwLjA7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICBhID0gOS4wICogZGVmYXVsdFZhbHVlIC8gNTAuMDtcbiAgICAgIGIgPSAtOCAqIGRlZmF1bHRWYWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gKGEgKiBzbGlkZXJWYWx1ZSArIGIpO1xuICB9XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIGZpbmRzIGFuZCByZXR1cm5zIHRoZSBjZW50ZXIgb2YgdGhlIGdpdmVuIG5vZGVzLCBhc3N1bWluZ1xuICogdGhhdCB0aGUgZ2l2ZW4gbm9kZXMgZm9ybSBhIHRyZWUgaW4gdGhlbXNlbHZlcy5cbiAqL1xuTGF5b3V0LmZpbmRDZW50ZXJPZlRyZWUgPSBmdW5jdGlvbiAobm9kZXMpXG57XG4gIHZhciBsaXN0ID0gW107XG4gIGxpc3QgPSBsaXN0LmNvbmNhdChub2Rlcyk7XG5cbiAgdmFyIHJlbW92ZWROb2RlcyA9IFtdO1xuICB2YXIgcmVtYWluaW5nRGVncmVlcyA9IG5ldyBIYXNoTWFwKCk7XG4gIHZhciBmb3VuZENlbnRlciA9IGZhbHNlO1xuICB2YXIgY2VudGVyTm9kZSA9IG51bGw7XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09IDEgfHwgbGlzdC5sZW5ndGggPT0gMilcbiAge1xuICAgIGZvdW5kQ2VudGVyID0gdHJ1ZTtcbiAgICBjZW50ZXJOb2RlID0gbGlzdFswXTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKylcbiAge1xuICAgIHZhciBub2RlID0gbGlzdFtpXTtcbiAgICB2YXIgZGVncmVlID0gbm9kZS5nZXROZWlnaGJvcnNMaXN0KCkuc2l6ZSgpO1xuICAgIHJlbWFpbmluZ0RlZ3JlZXMucHV0KG5vZGUsIG5vZGUuZ2V0TmVpZ2hib3JzTGlzdCgpLnNpemUoKSk7XG5cbiAgICBpZiAoZGVncmVlID09IDEpXG4gICAge1xuICAgICAgcmVtb3ZlZE5vZGVzLnB1c2gobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIHRlbXBMaXN0ID0gW107XG4gIHRlbXBMaXN0ID0gdGVtcExpc3QuY29uY2F0KHJlbW92ZWROb2Rlcyk7XG5cbiAgd2hpbGUgKCFmb3VuZENlbnRlcilcbiAge1xuICAgIHZhciB0ZW1wTGlzdDIgPSBbXTtcbiAgICB0ZW1wTGlzdDIgPSB0ZW1wTGlzdDIuY29uY2F0KHRlbXBMaXN0KTtcbiAgICB0ZW1wTGlzdCA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKVxuICAgIHtcbiAgICAgIHZhciBub2RlID0gbGlzdFtpXTtcblxuICAgICAgdmFyIGluZGV4ID0gbGlzdC5pbmRleE9mKG5vZGUpO1xuICAgICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgbGlzdC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuXG4gICAgICB2YXIgbmVpZ2hib3VycyA9IG5vZGUuZ2V0TmVpZ2hib3JzTGlzdCgpO1xuXG4gICAgICBPYmplY3Qua2V5cyhuZWlnaGJvdXJzLnNldCkuZm9yRWFjaChmdW5jdGlvbihqKSB7XG4gICAgICAgIHZhciBuZWlnaGJvdXIgPSBuZWlnaGJvdXJzLnNldFtqXTtcbiAgICAgICAgaWYgKHJlbW92ZWROb2Rlcy5pbmRleE9mKG5laWdoYm91cikgPCAwKVxuICAgICAgICB7XG4gICAgICAgICAgdmFyIG90aGVyRGVncmVlID0gcmVtYWluaW5nRGVncmVlcy5nZXQobmVpZ2hib3VyKTtcbiAgICAgICAgICB2YXIgbmV3RGVncmVlID0gb3RoZXJEZWdyZWUgLSAxO1xuXG4gICAgICAgICAgaWYgKG5ld0RlZ3JlZSA9PSAxKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRlbXBMaXN0LnB1c2gobmVpZ2hib3VyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZW1haW5pbmdEZWdyZWVzLnB1dChuZWlnaGJvdXIsIG5ld0RlZ3JlZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlbW92ZWROb2RlcyA9IHJlbW92ZWROb2Rlcy5jb25jYXQodGVtcExpc3QpO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09IDEgfHwgbGlzdC5sZW5ndGggPT0gMilcbiAgICB7XG4gICAgICBmb3VuZENlbnRlciA9IHRydWU7XG4gICAgICBjZW50ZXJOb2RlID0gbGlzdFswXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY2VudGVyTm9kZTtcbn07XG5cbi8qKlxuICogRHVyaW5nIHRoZSBjb2Fyc2VuaW5nIHByb2Nlc3MsIHRoaXMgbGF5b3V0IG1heSBiZSByZWZlcmVuY2VkIGJ5IHR3byBncmFwaCBtYW5hZ2Vyc1xuICogdGhpcyBzZXR0ZXIgZnVuY3Rpb24gZ3JhbnRzIGFjY2VzcyB0byBjaGFuZ2UgdGhlIGN1cnJlbnRseSBiZWluZyB1c2VkIGdyYXBoIG1hbmFnZXJcbiAqL1xuTGF5b3V0LnByb3RvdHlwZS5zZXRHcmFwaE1hbmFnZXIgPSBmdW5jdGlvbiAoZ20pXG57XG4gIHRoaXMuZ3JhcGhNYW5hZ2VyID0gZ207XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDtcbiIsImZ1bmN0aW9uIExheW91dENvbnN0YW50cygpIHtcbn1cblxuLyoqXG4gKiBMYXlvdXQgUXVhbGl0eVxuICovXG5MYXlvdXRDb25zdGFudHMuUFJPT0ZfUVVBTElUWSA9IDA7XG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9RVUFMSVRZID0gMTtcbkxheW91dENvbnN0YW50cy5EUkFGVF9RVUFMSVRZID0gMjtcblxuLyoqXG4gKiBEZWZhdWx0IHBhcmFtZXRlcnNcbiAqL1xuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ1JFQVRFX0JFTkRTX0FTX05FRURFRCA9IGZhbHNlO1xuLy9MYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9IHRydWU7XG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9IGZhbHNlO1xuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX09OX0xBWU9VVCA9IHRydWU7XG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fRFVSSU5HX0xBWU9VVCA9IGZhbHNlO1xuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX1BFUklPRCA9IDUwO1xuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVU5JRk9STV9MRUFGX05PREVfU0laRVMgPSBmYWxzZTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFNlY3Rpb246IEdlbmVyYWwgb3RoZXIgY29uc3RhbnRzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLypcbiAqIE1hcmdpbnMgb2YgYSBncmFwaCB0byBiZSBhcHBsaWVkIG9uIGJvdWRpbmcgcmVjdGFuZ2xlIG9mIGl0cyBjb250ZW50cy4gV2VcbiAqIGFzc3VtZSBtYXJnaW5zIG9uIGFsbCBmb3VyIHNpZGVzIHRvIGJlIHVuaWZvcm0uXG4gKi9cbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVBIX01BUkdJTiA9IDE1O1xuXG4vKlxuICogV2hldGhlciB0byBjb25zaWRlciBsYWJlbHMgaW4gbm9kZSBkaW1lbnNpb25zIG9yIG5vdFxuICovXG5MYXlvdXRDb25zdGFudHMuTk9ERV9ESU1FTlNJT05TX0lOQ0xVREVfTEFCRUxTID0gZmFsc2U7XG5cbi8qXG4gKiBEZWZhdWx0IGRpbWVuc2lvbiBvZiBhIG5vbi1jb21wb3VuZCBub2RlLlxuICovXG5MYXlvdXRDb25zdGFudHMuU0lNUExFX05PREVfU0laRSA9IDQwO1xuXG4vKlxuICogRGVmYXVsdCBkaW1lbnNpb24gb2YgYSBub24tY29tcG91bmQgbm9kZS5cbiAqL1xuTGF5b3V0Q29uc3RhbnRzLlNJTVBMRV9OT0RFX0hBTEZfU0laRSA9IExheW91dENvbnN0YW50cy5TSU1QTEVfTk9ERV9TSVpFIC8gMjtcblxuLypcbiAqIEVtcHR5IGNvbXBvdW5kIG5vZGUgc2l6ZS4gV2hlbiBhIGNvbXBvdW5kIG5vZGUgaXMgZW1wdHksIGl0cyBib3RoXG4gKiBkaW1lbnNpb25zIHNob3VsZCBiZSBvZiB0aGlzIHZhbHVlLlxuICovXG5MYXlvdXRDb25zdGFudHMuRU1QVFlfQ09NUE9VTkRfTk9ERV9TSVpFID0gNDA7XG5cbi8qXG4gKiBNaW5pbXVtIGxlbmd0aCB0aGF0IGFuIGVkZ2Ugc2hvdWxkIHRha2UgZHVyaW5nIGxheW91dFxuICovXG5MYXlvdXRDb25zdGFudHMuTUlOX0VER0VfTEVOR1RIID0gMTtcblxuLypcbiAqIFdvcmxkIGJvdW5kYXJpZXMgdGhhdCBsYXlvdXQgb3BlcmF0ZXMgb25cbiAqL1xuTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZID0gMTAwMDAwMDtcblxuLypcbiAqIFdvcmxkIGJvdW5kYXJpZXMgdGhhdCByYW5kb20gcG9zaXRpb25pbmcgY2FuIGJlIHBlcmZvcm1lZCB3aXRoXG4gKi9cbkxheW91dENvbnN0YW50cy5JTklUSUFMX1dPUkxEX0JPVU5EQVJZID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZIC8gMTAwMDtcblxuLypcbiAqIENvb3JkaW5hdGVzIG9mIHRoZSB3b3JsZCBjZW50ZXJcbiAqL1xuTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9YID0gMTIwMDtcbkxheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWSA9IDkwMDtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXRDb25zdGFudHM7XG4iLCIvKlxuICpUaGlzIGNsYXNzIGlzIHRoZSBqYXZhc2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIHRoZSBQb2ludC5qYXZhIGNsYXNzIGluIGpka1xuICovXG5mdW5jdGlvbiBQb2ludCh4LCB5LCBwKSB7XG4gIHRoaXMueCA9IG51bGw7XG4gIHRoaXMueSA9IG51bGw7XG4gIGlmICh4ID09IG51bGwgJiYgeSA9PSBudWxsICYmIHAgPT0gbnVsbCkge1xuICAgIHRoaXMueCA9IDA7XG4gICAgdGhpcy55ID0gMDtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgeCA9PSAnbnVtYmVyJyAmJiB0eXBlb2YgeSA9PSAnbnVtYmVyJyAmJiBwID09IG51bGwpIHtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gIH1cbiAgZWxzZSBpZiAoeC5jb25zdHJ1Y3Rvci5uYW1lID09ICdQb2ludCcgJiYgeSA9PSBudWxsICYmIHAgPT0gbnVsbCkge1xuICAgIHAgPSB4O1xuICAgIHRoaXMueCA9IHAueDtcbiAgICB0aGlzLnkgPSBwLnk7XG4gIH1cbn1cblxuUG9pbnQucHJvdG90eXBlLmdldFggPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLng7XG59XG5cblBvaW50LnByb3RvdHlwZS5nZXRZID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy55O1xufVxuXG5Qb2ludC5wcm90b3R5cGUuZ2V0TG9jYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBuZXcgUG9pbnQodGhpcy54LCB0aGlzLnkpO1xufVxuXG5Qb2ludC5wcm90b3R5cGUuc2V0TG9jYXRpb24gPSBmdW5jdGlvbiAoeCwgeSwgcCkge1xuICBpZiAoeC5jb25zdHJ1Y3Rvci5uYW1lID09ICdQb2ludCcgJiYgeSA9PSBudWxsICYmIHAgPT0gbnVsbCkge1xuICAgIHAgPSB4O1xuICAgIHRoaXMuc2V0TG9jYXRpb24ocC54LCBwLnkpO1xuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiB4ID09ICdudW1iZXInICYmIHR5cGVvZiB5ID09ICdudW1iZXInICYmIHAgPT0gbnVsbCkge1xuICAgIC8vaWYgYm90aCBwYXJhbWV0ZXJzIGFyZSBpbnRlZ2VyIGp1c3QgbW92ZSAoeCx5KSBsb2NhdGlvblxuICAgIGlmIChwYXJzZUludCh4KSA9PSB4ICYmIHBhcnNlSW50KHkpID09IHkpIHtcbiAgICAgIHRoaXMubW92ZSh4LCB5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnggPSBNYXRoLmZsb29yKHggKyAwLjUpO1xuICAgICAgdGhpcy55ID0gTWF0aC5mbG9vcih5ICsgMC41KTtcbiAgICB9XG4gIH1cbn1cblxuUG9pbnQucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoeCwgeSkge1xuICB0aGlzLnggPSB4O1xuICB0aGlzLnkgPSB5O1xufVxuXG5Qb2ludC5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24gKGR4LCBkeSkge1xuICB0aGlzLnggKz0gZHg7XG4gIHRoaXMueSArPSBkeTtcbn1cblxuUG9pbnQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgaWYgKG9iai5jb25zdHJ1Y3Rvci5uYW1lID09IFwiUG9pbnRcIikge1xuICAgIHZhciBwdCA9IG9iajtcbiAgICByZXR1cm4gKHRoaXMueCA9PSBwdC54KSAmJiAodGhpcy55ID09IHB0LnkpO1xuICB9XG4gIHJldHVybiB0aGlzID09IG9iajtcbn1cblxuUG9pbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gbmV3IFBvaW50KCkuY29uc3RydWN0b3IubmFtZSArIFwiW3g9XCIgKyB0aGlzLnggKyBcIix5PVwiICsgdGhpcy55ICsgXCJdXCI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9pbnQ7XG4iLCJmdW5jdGlvbiBQb2ludEQoeCwgeSkge1xuICBpZiAoeCA9PSBudWxsICYmIHkgPT0gbnVsbCkge1xuICAgIHRoaXMueCA9IDA7XG4gICAgdGhpcy55ID0gMDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gIH1cbn1cblxuUG9pbnRELnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMueDtcbn07XG5cblBvaW50RC5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnk7XG59O1xuXG5Qb2ludEQucHJvdG90eXBlLnNldFggPSBmdW5jdGlvbiAoeClcbntcbiAgdGhpcy54ID0geDtcbn07XG5cblBvaW50RC5wcm90b3R5cGUuc2V0WSA9IGZ1bmN0aW9uICh5KVxue1xuICB0aGlzLnkgPSB5O1xufTtcblxuUG9pbnRELnByb3RvdHlwZS5nZXREaWZmZXJlbmNlID0gZnVuY3Rpb24gKHB0KVxue1xuICByZXR1cm4gbmV3IERpbWVuc2lvbkQodGhpcy54IC0gcHQueCwgdGhpcy55IC0gcHQueSk7XG59O1xuXG5Qb2ludEQucHJvdG90eXBlLmdldENvcHkgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gbmV3IFBvaW50RCh0aGlzLngsIHRoaXMueSk7XG59O1xuXG5Qb2ludEQucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChkaW0pXG57XG4gIHRoaXMueCArPSBkaW0ud2lkdGg7XG4gIHRoaXMueSArPSBkaW0uaGVpZ2h0O1xuICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUG9pbnREO1xuIiwiZnVuY3Rpb24gUmFuZG9tU2VlZCgpIHtcbn1cblJhbmRvbVNlZWQuc2VlZCA9IDE7XG5SYW5kb21TZWVkLnggPSAwO1xuXG5SYW5kb21TZWVkLm5leHREb3VibGUgPSBmdW5jdGlvbiAoKSB7XG4gIFJhbmRvbVNlZWQueCA9IE1hdGguc2luKFJhbmRvbVNlZWQuc2VlZCsrKSAqIDEwMDAwO1xuICByZXR1cm4gUmFuZG9tU2VlZC54IC0gTWF0aC5mbG9vcihSYW5kb21TZWVkLngpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSYW5kb21TZWVkO1xuIiwiZnVuY3Rpb24gUmVjdGFuZ2xlRCh4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gIHRoaXMueCA9IDA7XG4gIHRoaXMueSA9IDA7XG4gIHRoaXMud2lkdGggPSAwO1xuICB0aGlzLmhlaWdodCA9IDA7XG5cbiAgaWYgKHggIT0gbnVsbCAmJiB5ICE9IG51bGwgJiYgd2lkdGggIT0gbnVsbCAmJiBoZWlnaHQgIT0gbnVsbCkge1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gIH1cbn1cblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0WCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLng7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5zZXRYID0gZnVuY3Rpb24gKHgpXG57XG4gIHRoaXMueCA9IHg7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRZID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMueTtcbn07XG5cblJlY3RhbmdsZUQucHJvdG90eXBlLnNldFkgPSBmdW5jdGlvbiAoeSlcbntcbiAgdGhpcy55ID0geTtcbn07XG5cblJlY3RhbmdsZUQucHJvdG90eXBlLmdldFdpZHRoID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMud2lkdGg7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5zZXRXaWR0aCA9IGZ1bmN0aW9uICh3aWR0aClcbntcbiAgdGhpcy53aWR0aCA9IHdpZHRoO1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0SGVpZ2h0ID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMuaGVpZ2h0O1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuc2V0SGVpZ2h0ID0gZnVuY3Rpb24gKGhlaWdodClcbntcbiAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRSaWdodCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLnggKyB0aGlzLndpZHRoO1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0Qm90dG9tID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMueSArIHRoaXMuaGVpZ2h0O1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuaW50ZXJzZWN0cyA9IGZ1bmN0aW9uIChhKVxue1xuICBpZiAodGhpcy5nZXRSaWdodCgpIDwgYS54KVxuICB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKHRoaXMuZ2V0Qm90dG9tKCkgPCBhLnkpXG4gIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoYS5nZXRSaWdodCgpIDwgdGhpcy54KVxuICB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKGEuZ2V0Qm90dG9tKCkgPCB0aGlzLnkpXG4gIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cblJlY3RhbmdsZUQucHJvdG90eXBlLmdldENlbnRlclggPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy54ICsgdGhpcy53aWR0aCAvIDI7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRNaW5YID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMuZ2V0WCgpO1xufTtcblxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0TWF4WCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmdldFgoKSArIHRoaXMud2lkdGg7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRDZW50ZXJZID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMueSArIHRoaXMuaGVpZ2h0IC8gMjtcbn07XG5cblJlY3RhbmdsZUQucHJvdG90eXBlLmdldE1pblkgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5nZXRZKCk7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRNYXhZID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMuZ2V0WSgpICsgdGhpcy5oZWlnaHQ7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRXaWR0aEhhbGYgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy53aWR0aCAvIDI7XG59O1xuXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRIZWlnaHRIYWxmID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMuaGVpZ2h0IC8gMjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVjdGFuZ2xlRDtcbiIsInZhciBQb2ludEQgPSByZXF1aXJlKCcuL1BvaW50RCcpO1xuXG5mdW5jdGlvbiBUcmFuc2Zvcm0oeCwgeSkge1xuICB0aGlzLmx3b3JsZE9yZ1ggPSAwLjA7XG4gIHRoaXMubHdvcmxkT3JnWSA9IDAuMDtcbiAgdGhpcy5sZGV2aWNlT3JnWCA9IDAuMDtcbiAgdGhpcy5sZGV2aWNlT3JnWSA9IDAuMDtcbiAgdGhpcy5sd29ybGRFeHRYID0gMS4wO1xuICB0aGlzLmx3b3JsZEV4dFkgPSAxLjA7XG4gIHRoaXMubGRldmljZUV4dFggPSAxLjA7XG4gIHRoaXMubGRldmljZUV4dFkgPSAxLjA7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0V29ybGRPcmdYID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMubHdvcmxkT3JnWDtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRXb3JsZE9yZ1ggPSBmdW5jdGlvbiAod294KVxue1xuICB0aGlzLmx3b3JsZE9yZ1ggPSB3b3g7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0V29ybGRPcmdZID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMubHdvcmxkT3JnWTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRXb3JsZE9yZ1kgPSBmdW5jdGlvbiAod295KVxue1xuICB0aGlzLmx3b3JsZE9yZ1kgPSB3b3k7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0V29ybGRFeHRYID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMubHdvcmxkRXh0WDtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRXb3JsZEV4dFggPSBmdW5jdGlvbiAod2V4KVxue1xuICB0aGlzLmx3b3JsZEV4dFggPSB3ZXg7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0V29ybGRFeHRZID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMubHdvcmxkRXh0WTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRXb3JsZEV4dFkgPSBmdW5jdGlvbiAod2V5KVxue1xuICB0aGlzLmx3b3JsZEV4dFkgPSB3ZXk7XG59XG5cbi8qIERldmljZSByZWxhdGVkICovXG5cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0RGV2aWNlT3JnWCA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmxkZXZpY2VPcmdYO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldERldmljZU9yZ1ggPSBmdW5jdGlvbiAoZG94KVxue1xuICB0aGlzLmxkZXZpY2VPcmdYID0gZG94O1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZU9yZ1kgPSBmdW5jdGlvbiAoKVxue1xuICByZXR1cm4gdGhpcy5sZGV2aWNlT3JnWTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXREZXZpY2VPcmdZID0gZnVuY3Rpb24gKGRveSlcbntcbiAgdGhpcy5sZGV2aWNlT3JnWSA9IGRveTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXREZXZpY2VFeHRYID0gZnVuY3Rpb24gKClcbntcbiAgcmV0dXJuIHRoaXMubGRldmljZUV4dFg7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGV2aWNlRXh0WCA9IGZ1bmN0aW9uIChkZXgpXG57XG4gIHRoaXMubGRldmljZUV4dFggPSBkZXg7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0RGV2aWNlRXh0WSA9IGZ1bmN0aW9uICgpXG57XG4gIHJldHVybiB0aGlzLmxkZXZpY2VFeHRZO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldERldmljZUV4dFkgPSBmdW5jdGlvbiAoZGV5KVxue1xuICB0aGlzLmxkZXZpY2VFeHRZID0gZGV5O1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnRyYW5zZm9ybVggPSBmdW5jdGlvbiAoeClcbntcbiAgdmFyIHhEZXZpY2UgPSAwLjA7XG4gIHZhciB3b3JsZEV4dFggPSB0aGlzLmx3b3JsZEV4dFg7XG4gIGlmICh3b3JsZEV4dFggIT0gMC4wKVxuICB7XG4gICAgeERldmljZSA9IHRoaXMubGRldmljZU9yZ1ggK1xuICAgICAgICAgICAgKCh4IC0gdGhpcy5sd29ybGRPcmdYKSAqIHRoaXMubGRldmljZUV4dFggLyB3b3JsZEV4dFgpO1xuICB9XG5cbiAgcmV0dXJuIHhEZXZpY2U7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUudHJhbnNmb3JtWSA9IGZ1bmN0aW9uICh5KVxue1xuICB2YXIgeURldmljZSA9IDAuMDtcbiAgdmFyIHdvcmxkRXh0WSA9IHRoaXMubHdvcmxkRXh0WTtcbiAgaWYgKHdvcmxkRXh0WSAhPSAwLjApXG4gIHtcbiAgICB5RGV2aWNlID0gdGhpcy5sZGV2aWNlT3JnWSArXG4gICAgICAgICAgICAoKHkgLSB0aGlzLmx3b3JsZE9yZ1kpICogdGhpcy5sZGV2aWNlRXh0WSAvIHdvcmxkRXh0WSk7XG4gIH1cblxuXG4gIHJldHVybiB5RGV2aWNlO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmludmVyc2VUcmFuc2Zvcm1YID0gZnVuY3Rpb24gKHgpXG57XG4gIHZhciB4V29ybGQgPSAwLjA7XG4gIHZhciBkZXZpY2VFeHRYID0gdGhpcy5sZGV2aWNlRXh0WDtcbiAgaWYgKGRldmljZUV4dFggIT0gMC4wKVxuICB7XG4gICAgeFdvcmxkID0gdGhpcy5sd29ybGRPcmdYICtcbiAgICAgICAgICAgICgoeCAtIHRoaXMubGRldmljZU9yZ1gpICogdGhpcy5sd29ybGRFeHRYIC8gZGV2aWNlRXh0WCk7XG4gIH1cblxuXG4gIHJldHVybiB4V29ybGQ7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuaW52ZXJzZVRyYW5zZm9ybVkgPSBmdW5jdGlvbiAoeSlcbntcbiAgdmFyIHlXb3JsZCA9IDAuMDtcbiAgdmFyIGRldmljZUV4dFkgPSB0aGlzLmxkZXZpY2VFeHRZO1xuICBpZiAoZGV2aWNlRXh0WSAhPSAwLjApXG4gIHtcbiAgICB5V29ybGQgPSB0aGlzLmx3b3JsZE9yZ1kgK1xuICAgICAgICAgICAgKCh5IC0gdGhpcy5sZGV2aWNlT3JnWSkgKiB0aGlzLmx3b3JsZEV4dFkgLyBkZXZpY2VFeHRZKTtcbiAgfVxuICByZXR1cm4geVdvcmxkO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmludmVyc2VUcmFuc2Zvcm1Qb2ludCA9IGZ1bmN0aW9uIChpblBvaW50KVxue1xuICB2YXIgb3V0UG9pbnQgPVxuICAgICAgICAgIG5ldyBQb2ludEQodGhpcy5pbnZlcnNlVHJhbnNmb3JtWChpblBvaW50LngpLFxuICAgICAgICAgICAgICAgICAgdGhpcy5pbnZlcnNlVHJhbnNmb3JtWShpblBvaW50LnkpKTtcbiAgcmV0dXJuIG91dFBvaW50O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTtcbiIsImZ1bmN0aW9uIFVuaXF1ZUlER2VuZXJldG9yKCkge1xufVxuXG5VbmlxdWVJREdlbmVyZXRvci5sYXN0SUQgPSAwO1xuXG5VbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgaWYgKFVuaXF1ZUlER2VuZXJldG9yLmlzUHJpbWl0aXZlKG9iaikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIGlmIChvYmoudW5pcXVlSUQgIT0gbnVsbCkge1xuICAgIHJldHVybiBvYmoudW5pcXVlSUQ7XG4gIH1cbiAgb2JqLnVuaXF1ZUlEID0gVW5pcXVlSURHZW5lcmV0b3IuZ2V0U3RyaW5nKCk7XG4gIFVuaXF1ZUlER2VuZXJldG9yLmxhc3RJRCsrO1xuICByZXR1cm4gb2JqLnVuaXF1ZUlEO1xufVxuXG5VbmlxdWVJREdlbmVyZXRvci5nZXRTdHJpbmcgPSBmdW5jdGlvbiAoaWQpIHtcbiAgaWYgKGlkID09IG51bGwpXG4gICAgaWQgPSBVbmlxdWVJREdlbmVyZXRvci5sYXN0SUQ7XG4gIHJldHVybiBcIk9iamVjdCNcIiArIGlkICsgXCJcIjtcbn1cblxuVW5pcXVlSURHZW5lcmV0b3IuaXNQcmltaXRpdmUgPSBmdW5jdGlvbiAoYXJnKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIGFyZztcbiAgcmV0dXJuIGFyZyA9PSBudWxsIHx8ICh0eXBlICE9IFwib2JqZWN0XCIgJiYgdHlwZSAhPSBcImZ1bmN0aW9uXCIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFVuaXF1ZUlER2VuZXJldG9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRGltZW5zaW9uRCA9IHJlcXVpcmUoJy4vRGltZW5zaW9uRCcpO1xudmFyIEhhc2hNYXAgPSByZXF1aXJlKCcuL0hhc2hNYXAnKTtcbnZhciBIYXNoU2V0ID0gcmVxdWlyZSgnLi9IYXNoU2V0Jyk7XG52YXIgSUdlb21ldHJ5ID0gcmVxdWlyZSgnLi9JR2VvbWV0cnknKTtcbnZhciBJTWF0aCA9IHJlcXVpcmUoJy4vSU1hdGgnKTtcbnZhciBJbnRlZ2VyID0gcmVxdWlyZSgnLi9JbnRlZ2VyJyk7XG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL1BvaW50Jyk7XG52YXIgUG9pbnREID0gcmVxdWlyZSgnLi9Qb2ludEQnKTtcbnZhciBSYW5kb21TZWVkID0gcmVxdWlyZSgnLi9SYW5kb21TZWVkJyk7XG52YXIgUmVjdGFuZ2xlRCA9IHJlcXVpcmUoJy4vUmVjdGFuZ2xlRCcpO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyk7XG52YXIgVW5pcXVlSURHZW5lcmV0b3IgPSByZXF1aXJlKCcuL1VuaXF1ZUlER2VuZXJldG9yJyk7XG52YXIgTEdyYXBoT2JqZWN0ID0gcmVxdWlyZSgnLi9MR3JhcGhPYmplY3QnKTtcbnZhciBMR3JhcGggPSByZXF1aXJlKCcuL0xHcmFwaCcpO1xudmFyIExFZGdlID0gcmVxdWlyZSgnLi9MRWRnZScpO1xudmFyIExHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0xHcmFwaE1hbmFnZXInKTtcbnZhciBMTm9kZSA9IHJlcXVpcmUoJy4vTE5vZGUnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL0xheW91dCcpO1xudmFyIExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vTGF5b3V0Q29uc3RhbnRzJyk7XG52YXIgRkRMYXlvdXQgPSByZXF1aXJlKCcuL0ZETGF5b3V0Jyk7XG52YXIgRkRMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0ZETGF5b3V0Q29uc3RhbnRzJyk7XG52YXIgRkRMYXlvdXRFZGdlID0gcmVxdWlyZSgnLi9GRExheW91dEVkZ2UnKTtcbnZhciBGRExheW91dE5vZGUgPSByZXF1aXJlKCcuL0ZETGF5b3V0Tm9kZScpO1xudmFyIENvU0VDb25zdGFudHMgPSByZXF1aXJlKCcuL0NvU0VDb25zdGFudHMnKTtcbnZhciBDb1NFRWRnZSA9IHJlcXVpcmUoJy4vQ29TRUVkZ2UnKTtcbnZhciBDb1NFR3JhcGggPSByZXF1aXJlKCcuL0NvU0VHcmFwaCcpO1xudmFyIENvU0VHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0NvU0VHcmFwaE1hbmFnZXInKTtcbnZhciBDb1NFTGF5b3V0ID0gcmVxdWlyZSgnLi9Db1NFTGF5b3V0Jyk7XG52YXIgQ29TRU5vZGUgPSByZXF1aXJlKCcuL0NvU0VOb2RlJyk7XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgLy8gQ2FsbGVkIG9uIGBsYXlvdXRyZWFkeWBcbiAgcmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgfSxcbiAgLy8gQ2FsbGVkIG9uIGBsYXlvdXRzdG9wYFxuICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gIH0sXG4gIC8vIGluY2x1ZGUgbGFiZWxzIGluIG5vZGUgZGltZW5zaW9uc1xuICBub2RlRGltZW5zaW9uc0luY2x1ZGVMYWJlbHM6IGZhbHNlLFxuICAvLyBudW1iZXIgb2YgdGlja3MgcGVyIGZyYW1lOyBoaWdoZXIgaXMgZmFzdGVyIGJ1dCBtb3JlIGplcmt5XG4gIHJlZnJlc2g6IDMwLFxuICAvLyBXaGV0aGVyIHRvIGZpdCB0aGUgbmV0d29yayB2aWV3IGFmdGVyIHdoZW4gZG9uZVxuICBmaXQ6IHRydWUsXG4gIC8vIFBhZGRpbmcgb24gZml0XG4gIHBhZGRpbmc6IDEwLFxuICAvLyBXaGV0aGVyIHRvIGVuYWJsZSBpbmNyZW1lbnRhbCBtb2RlXG4gIHJhbmRvbWl6ZTogdHJ1ZSxcbiAgLy8gTm9kZSByZXB1bHNpb24gKG5vbiBvdmVybGFwcGluZykgbXVsdGlwbGllclxuICBub2RlUmVwdWxzaW9uOiA0NTAwLFxuICAvLyBJZGVhbCBlZGdlIChub24gbmVzdGVkKSBsZW5ndGhcbiAgaWRlYWxFZGdlTGVuZ3RoOiA1MCxcbiAgLy8gRGl2aXNvciB0byBjb21wdXRlIGVkZ2UgZm9yY2VzXG4gIGVkZ2VFbGFzdGljaXR5OiAwLjQ1LFxuICAvLyBOZXN0aW5nIGZhY3RvciAobXVsdGlwbGllcikgdG8gY29tcHV0ZSBpZGVhbCBlZGdlIGxlbmd0aCBmb3IgbmVzdGVkIGVkZ2VzXG4gIG5lc3RpbmdGYWN0b3I6IDAuMSxcbiAgLy8gR3Jhdml0eSBmb3JjZSAoY29uc3RhbnQpXG4gIGdyYXZpdHk6IDAuMjUsXG4gIC8vIE1heGltdW0gbnVtYmVyIG9mIGl0ZXJhdGlvbnMgdG8gcGVyZm9ybVxuICBudW1JdGVyOiAyNTAwLFxuICAvLyBGb3IgZW5hYmxpbmcgdGlsaW5nXG4gIHRpbGU6IHRydWUsXG4gIC8vIFR5cGUgb2YgbGF5b3V0IGFuaW1hdGlvbi4gVGhlIG9wdGlvbiBzZXQgaXMgeydkdXJpbmcnLCAnZW5kJywgZmFsc2V9XG4gIGFuaW1hdGU6ICdlbmQnLFxuICAvLyBEdXJhdGlvbiBmb3IgYW5pbWF0ZTplbmRcbiAgYW5pbWF0aW9uRHVyYXRpb246IDUwMCxcbiAgLy8gUmVwcmVzZW50cyB0aGUgYW1vdW50IG9mIHRoZSB2ZXJ0aWNhbCBzcGFjZSB0byBwdXQgYmV0d2VlbiB0aGUgemVybyBkZWdyZWUgbWVtYmVycyBkdXJpbmcgdGhlIHRpbGluZyBvcGVyYXRpb24oY2FuIGFsc28gYmUgYSBmdW5jdGlvbilcbiAgdGlsaW5nUGFkZGluZ1ZlcnRpY2FsOiAxMCxcbiAgLy8gUmVwcmVzZW50cyB0aGUgYW1vdW50IG9mIHRoZSBob3Jpem9udGFsIHNwYWNlIHRvIHB1dCBiZXR3ZWVuIHRoZSB6ZXJvIGRlZ3JlZSBtZW1iZXJzIGR1cmluZyB0aGUgdGlsaW5nIG9wZXJhdGlvbihjYW4gYWxzbyBiZSBhIGZ1bmN0aW9uKVxuICB0aWxpbmdQYWRkaW5nSG9yaXpvbnRhbDogMTAsXG4gIC8vIEdyYXZpdHkgcmFuZ2UgKGNvbnN0YW50KSBmb3IgY29tcG91bmRzXG4gIGdyYXZpdHlSYW5nZUNvbXBvdW5kOiAxLjUsXG4gIC8vIEdyYXZpdHkgZm9yY2UgKGNvbnN0YW50KSBmb3IgY29tcG91bmRzXG4gIGdyYXZpdHlDb21wb3VuZDogMS4wLFxuICAvLyBHcmF2aXR5IHJhbmdlIChjb25zdGFudClcbiAgZ3Jhdml0eVJhbmdlOiAzLjgsXG4gIC8vIEluaXRpYWwgY29vbGluZyBmYWN0b3IgZm9yIGluY3JlbWVudGFsIGxheW91dFxuICBpbml0aWFsRW5lcmd5T25JbmNyZW1lbnRhbDogMC44XG59O1xuXG5mdW5jdGlvbiBleHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpIHtcbiAgdmFyIG9iaiA9IHt9O1xuXG4gIGZvciAodmFyIGkgaW4gZGVmYXVsdHMpIHtcbiAgICBvYmpbaV0gPSBkZWZhdWx0c1tpXTtcbiAgfVxuXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgIG9ialtpXSA9IG9wdGlvbnNbaV07XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxuZnVuY3Rpb24gX0NvU0VMYXlvdXQoX29wdGlvbnMpIHtcbiAgdGhpcy5vcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRzLCBfb3B0aW9ucyk7XG4gIGdldFVzZXJPcHRpb25zKHRoaXMub3B0aW9ucyk7XG59XG5cbnZhciBnZXRVc2VyT3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zLm5vZGVSZXB1bHNpb24gIT0gbnVsbClcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEggPSBvcHRpb25zLm5vZGVSZXB1bHNpb247XG4gIGlmIChvcHRpb25zLmlkZWFsRWRnZUxlbmd0aCAhPSBudWxsKVxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggPSBvcHRpb25zLmlkZWFsRWRnZUxlbmd0aDtcbiAgaWYgKG9wdGlvbnMuZWRnZUVsYXN0aWNpdHkgIT0gbnVsbClcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfU1BSSU5HX1NUUkVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEggPSBvcHRpb25zLmVkZ2VFbGFzdGljaXR5O1xuICBpZiAob3B0aW9ucy5uZXN0aW5nRmFjdG9yICE9IG51bGwpXG4gICAgQ29TRUNvbnN0YW50cy5QRVJfTEVWRUxfSURFQUxfRURHRV9MRU5HVEhfRkFDVE9SID0gRkRMYXlvdXRDb25zdGFudHMuUEVSX0xFVkVMX0lERUFMX0VER0VfTEVOR1RIX0ZBQ1RPUiA9IG9wdGlvbnMubmVzdGluZ0ZhY3RvcjtcbiAgaWYgKG9wdGlvbnMuZ3Jhdml0eSAhPSBudWxsKVxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIID0gb3B0aW9ucy5ncmF2aXR5O1xuICBpZiAob3B0aW9ucy5udW1JdGVyICE9IG51bGwpXG4gICAgQ29TRUNvbnN0YW50cy5NQVhfSVRFUkFUSU9OUyA9IEZETGF5b3V0Q29uc3RhbnRzLk1BWF9JVEVSQVRJT05TID0gb3B0aW9ucy5udW1JdGVyO1xuICBpZiAob3B0aW9ucy5ncmF2aXR5UmFuZ2UgIT0gbnVsbClcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfUkFOR0VfRkFDVE9SID0gb3B0aW9ucy5ncmF2aXR5UmFuZ2U7XG4gIGlmKG9wdGlvbnMuZ3Jhdml0eUNvbXBvdW5kICE9IG51bGwpXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEggPSBvcHRpb25zLmdyYXZpdHlDb21wb3VuZDtcbiAgaWYob3B0aW9ucy5ncmF2aXR5UmFuZ2VDb21wb3VuZCAhPSBudWxsKVxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSBvcHRpb25zLmdyYXZpdHlSYW5nZUNvbXBvdW5kO1xuICBpZiAob3B0aW9ucy5pbml0aWFsRW5lcmd5T25JbmNyZW1lbnRhbCAhPSBudWxsKVxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9DT09MSU5HX0ZBQ1RPUl9JTkNSRU1FTlRBTCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09PTElOR19GQUNUT1JfSU5DUkVNRU5UQUwgPSBvcHRpb25zLmluaXRpYWxFbmVyZ3lPbkluY3JlbWVudGFsO1xuXG4gIENvU0VDb25zdGFudHMuTk9ERV9ESU1FTlNJT05TX0lOQ0xVREVfTEFCRUxTID0gRkRMYXlvdXRDb25zdGFudHMuTk9ERV9ESU1FTlNJT05TX0lOQ0xVREVfTEFCRUxTID0gTGF5b3V0Q29uc3RhbnRzLk5PREVfRElNRU5TSU9OU19JTkNMVURFX0xBQkVMUyA9IG9wdGlvbnMubm9kZURpbWVuc2lvbnNJbmNsdWRlTGFiZWxzO1xuICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUwgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUwgPVxuICAgICAgICAgICEob3B0aW9ucy5yYW5kb21pemUpO1xuICBDb1NFQ29uc3RhbnRzLkFOSU1BVEUgPSBGRExheW91dENvbnN0YW50cy5BTklNQVRFID0gTGF5b3V0Q29uc3RhbnRzLkFOSU1BVEUgPSBvcHRpb25zLmFuaW1hdGU7XG4gIENvU0VDb25zdGFudHMuVElMRSA9IG9wdGlvbnMudGlsZTtcbiAgQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19WRVJUSUNBTCA9IFxuICAgICAgICAgIHR5cGVvZiBvcHRpb25zLnRpbGluZ1BhZGRpbmdWZXJ0aWNhbCA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMudGlsaW5nUGFkZGluZ1ZlcnRpY2FsLmNhbGwoKSA6IG9wdGlvbnMudGlsaW5nUGFkZGluZ1ZlcnRpY2FsO1xuICBDb1NFQ29uc3RhbnRzLlRJTElOR19QQURESU5HX0hPUklaT05UQUwgPSBcbiAgICAgICAgICB0eXBlb2Ygb3B0aW9ucy50aWxpbmdQYWRkaW5nSG9yaXpvbnRhbCA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMudGlsaW5nUGFkZGluZ0hvcml6b250YWwuY2FsbCgpIDogb3B0aW9ucy50aWxpbmdQYWRkaW5nSG9yaXpvbnRhbDtcbn07XG5cbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZWFkeTtcbiAgdmFyIGZyYW1lSWQ7XG4gIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICB2YXIgaWRUb0xOb2RlID0gdGhpcy5pZFRvTE5vZGUgPSB7fTtcbiAgdmFyIGxheW91dCA9IHRoaXMubGF5b3V0ID0gbmV3IENvU0VMYXlvdXQoKTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgc2VsZi5zdG9wcGVkID0gZmFsc2U7XG5cbiAgdGhpcy5jeSA9IHRoaXMub3B0aW9ucy5jeTtcblxuICB0aGlzLmN5LnRyaWdnZXIoeyB0eXBlOiAnbGF5b3V0c3RhcnQnLCBsYXlvdXQ6IHRoaXMgfSk7XG5cbiAgdmFyIGdtID0gbGF5b3V0Lm5ld0dyYXBoTWFuYWdlcigpO1xuICB0aGlzLmdtID0gZ207XG5cbiAgdmFyIG5vZGVzID0gdGhpcy5vcHRpb25zLmVsZXMubm9kZXMoKTtcbiAgdmFyIGVkZ2VzID0gdGhpcy5vcHRpb25zLmVsZXMuZWRnZXMoKTtcblxuICB0aGlzLnJvb3QgPSBnbS5hZGRSb290KCk7XG4gIHRoaXMucHJvY2Vzc0NoaWxkcmVuTGlzdCh0aGlzLnJvb3QsIHRoaXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKSwgbGF5b3V0KTtcblxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xuICAgIHZhciBzb3VyY2VOb2RlID0gdGhpcy5pZFRvTE5vZGVbZWRnZS5kYXRhKFwic291cmNlXCIpXTtcbiAgICB2YXIgdGFyZ2V0Tm9kZSA9IHRoaXMuaWRUb0xOb2RlW2VkZ2UuZGF0YShcInRhcmdldFwiKV07XG4gICAgdmFyIGUxID0gZ20uYWRkKGxheW91dC5uZXdFZGdlKCksIHNvdXJjZU5vZGUsIHRhcmdldE5vZGUpO1xuICAgIGUxLmlkID0gZWRnZS5pZCgpO1xuICB9XG4gIFxuICAgdmFyIGdldFBvc2l0aW9ucyA9IGZ1bmN0aW9uKGVsZSwgaSl7XG4gICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgZWxlID0gaTtcbiAgICB9XG4gICAgdmFyIHRoZUlkID0gZWxlLmRhdGEoJ2lkJyk7XG4gICAgdmFyIGxOb2RlID0gc2VsZi5pZFRvTE5vZGVbdGhlSWRdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IGxOb2RlLmdldFJlY3QoKS5nZXRDZW50ZXJYKCksXG4gICAgICB5OiBsTm9kZS5nZXRSZWN0KCkuZ2V0Q2VudGVyWSgpXG4gICAgfTtcbiAgfTtcbiAgXG4gIC8qXG4gICAqIFJlcG9zaXRpb24gbm9kZXMgaW4gaXRlcmF0aW9ucyBhbmltYXRlZGx5XG4gICAqL1xuICB2YXIgaXRlcmF0ZUFuaW1hdGVkID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFRoaWdzIHRvIHBlcmZvcm0gYWZ0ZXIgbm9kZXMgYXJlIHJlcG9zaXRpb25lZCBvbiBzY3JlZW5cbiAgICB2YXIgYWZ0ZXJSZXBvc2l0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAob3B0aW9ucy5maXQpIHtcbiAgICAgICAgb3B0aW9ucy5jeS5maXQob3B0aW9ucy5lbGVzLm5vZGVzKCksIG9wdGlvbnMucGFkZGluZyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcmVhZHkpIHtcbiAgICAgICAgcmVhZHkgPSB0cnVlO1xuICAgICAgICBzZWxmLmN5Lm9uZSgnbGF5b3V0cmVhZHknLCBvcHRpb25zLnJlYWR5KTtcbiAgICAgICAgc2VsZi5jeS50cmlnZ2VyKHt0eXBlOiAnbGF5b3V0cmVhZHknLCBsYXlvdXQ6IHNlbGZ9KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHZhciB0aWNrc1BlckZyYW1lID0gc2VsZi5vcHRpb25zLnJlZnJlc2g7XG4gICAgdmFyIGlzRG9uZTtcblxuICAgIGZvciggdmFyIGkgPSAwOyBpIDwgdGlja3NQZXJGcmFtZSAmJiAhaXNEb25lOyBpKysgKXtcbiAgICAgIGlzRG9uZSA9IHNlbGYuc3RvcHBlZCB8fCBzZWxmLmxheW91dC50aWNrKCk7XG4gICAgfVxuICAgIFxuICAgIC8vIElmIGxheW91dCBpcyBkb25lXG4gICAgaWYgKGlzRG9uZSkge1xuICAgICAgLy8gSWYgdGhlIGxheW91dCBpcyBub3QgYSBzdWJsYXlvdXQgYW5kIGl0IGlzIHN1Y2Nlc3NmdWwgcGVyZm9ybSBwb3N0IGxheW91dC5cbiAgICAgIGlmIChsYXlvdXQuY2hlY2tMYXlvdXRTdWNjZXNzKCkgJiYgIWxheW91dC5pc1N1YkxheW91dCkge1xuICAgICAgICBsYXlvdXQuZG9Qb3N0TGF5b3V0KCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIElmIGxheW91dCBoYXMgYSB0aWxpbmdQb3N0TGF5b3V0IGZ1bmN0aW9uIHByb3BlcnR5IGNhbGwgaXQuXG4gICAgICBpZiAobGF5b3V0LnRpbGluZ1Bvc3RMYXlvdXQpIHtcbiAgICAgICAgbGF5b3V0LnRpbGluZ1Bvc3RMYXlvdXQoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgbGF5b3V0LmlzTGF5b3V0RmluaXNoZWQgPSB0cnVlO1xuICAgICAgXG4gICAgICBzZWxmLm9wdGlvbnMuZWxlcy5ub2RlcygpLnBvc2l0aW9ucyhnZXRQb3NpdGlvbnMpO1xuICAgICAgXG4gICAgICBhZnRlclJlcG9zaXRpb24oKTtcbiAgICAgIFxuICAgICAgLy8gdHJpZ2dlciBsYXlvdXRzdG9wIHdoZW4gdGhlIGxheW91dCBzdG9wcyAoZS5nLiBmaW5pc2hlcylcbiAgICAgIHNlbGYuY3kub25lKCdsYXlvdXRzdG9wJywgc2VsZi5vcHRpb25zLnN0b3ApO1xuICAgICAgc2VsZi5jeS50cmlnZ2VyKHsgdHlwZTogJ2xheW91dHN0b3AnLCBsYXlvdXQ6IHNlbGYgfSk7XG5cbiAgICAgIGlmIChmcmFtZUlkKSB7XG4gICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGZyYW1lSWQpO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZWFkeSA9IGZhbHNlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICB2YXIgYW5pbWF0aW9uRGF0YSA9IHNlbGYubGF5b3V0LmdldFBvc2l0aW9uc0RhdGEoKTsgLy8gR2V0IHBvc2l0aW9ucyBvZiBsYXlvdXQgbm9kZXMgbm90ZSB0aGF0IGFsbCBub2RlcyBtYXkgbm90IGJlIGxheW91dCBub2RlcyBiZWNhdXNlIG9mIHRpbGluZ1xuICAgIFxuICAgIC8vIFBvc2l0aW9uIG5vZGVzLCBmb3IgdGhlIG5vZGVzIHdob3NlIGlkIGRvZXMgbm90IGluY2x1ZGVkIGluIGRhdGEgKGJlY2F1c2UgdGhleSBhcmUgcmVtb3ZlZCBmcm9tIHRoZWlyIHBhcmVudHMgYW5kIGluY2x1ZGVkIGluIGR1bW15IGNvbXBvdW5kcylcbiAgICAvLyB1c2UgcG9zaXRpb24gb2YgdGhlaXIgYW5jZXN0b3JzIG9yIGR1bW15IGFuY2VzdG9yc1xuICAgIG9wdGlvbnMuZWxlcy5ub2RlcygpLnBvc2l0aW9ucyhmdW5jdGlvbiAoZWxlLCBpKSB7XG4gICAgICBpZiAodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICBlbGUgPSBpO1xuICAgICAgfVxuICAgICAgdmFyIHRoZUlkID0gZWxlLmlkKCk7XG4gICAgICB2YXIgcE5vZGUgPSBhbmltYXRpb25EYXRhW3RoZUlkXTtcbiAgICAgIHZhciB0ZW1wID0gZWxlO1xuICAgICAgLy8gSWYgcE5vZGUgaXMgdW5kZWZpbmVkIHNlYXJjaCB1bnRpbCBmaW5kaW5nIHBvc2l0aW9uIGRhdGEgb2YgaXRzIGZpcnN0IGFuY2VzdG9yIChJdCBtYXkgYmUgZHVtbXkgYXMgd2VsbClcbiAgICAgIHdoaWxlIChwTm9kZSA9PSBudWxsKSB7XG4gICAgICAgIHBOb2RlID0gYW5pbWF0aW9uRGF0YVt0ZW1wLmRhdGEoJ3BhcmVudCcpXSB8fCBhbmltYXRpb25EYXRhWydEdW1teUNvbXBvdW5kXycgKyB0ZW1wLmRhdGEoJ3BhcmVudCcpXTtcbiAgICAgICAgYW5pbWF0aW9uRGF0YVt0aGVJZF0gPSBwTm9kZTtcbiAgICAgICAgdGVtcCA9IHRlbXAucGFyZW50KClbMF07XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICB4OiBwTm9kZS54LFxuICAgICAgICB5OiBwTm9kZS55XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgYWZ0ZXJSZXBvc2l0aW9uKCk7XG5cbiAgICBmcmFtZUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGl0ZXJhdGVBbmltYXRlZCk7XG4gIH07XG4gIFxuICAvKlxuICAqIExpc3RlbiAnbGF5b3V0c3RhcnRlZCcgZXZlbnQgYW5kIHN0YXJ0IGFuaW1hdGVkIGl0ZXJhdGlvbiBpZiBhbmltYXRlIG9wdGlvbiBpcyAnZHVyaW5nJ1xuICAqL1xuICBsYXlvdXQuYWRkTGlzdGVuZXIoJ2xheW91dHN0YXJ0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHNlbGYub3B0aW9ucy5hbmltYXRlID09PSAnZHVyaW5nJykge1xuICAgICAgZnJhbWVJZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShpdGVyYXRlQW5pbWF0ZWQpO1xuICAgIH1cbiAgfSk7XG4gIFxuICBsYXlvdXQucnVuTGF5b3V0KCk7IC8vIFJ1biBjb3NlIGxheW91dFxuICBcbiAgLypcbiAgICogSWYgYW5pbWF0ZSBvcHRpb24gaXMgbm90ICdkdXJpbmcnICgnZW5kJyBvciBmYWxzZSkgcGVyZm9ybSB0aGVzZSBoZXJlIChJZiBpdCBpcyAnZHVyaW5nJyBzaW1pbGFyIHRoaW5ncyBhcmUgYWxyZWFkeSBwZXJmb3JtZWQpXG4gICAqL1xuICBpZih0aGlzLm9wdGlvbnMuYW5pbWF0ZSA9PSAnZW5kJyl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgIFxuICAgICAgc2VsZi5vcHRpb25zLmVsZXMubm9kZXMoKS5ub3QoXCI6cGFyZW50XCIpLmxheW91dFBvc2l0aW9ucyhzZWxmLCBzZWxmLm9wdGlvbnMsIGdldFBvc2l0aW9ucyk7IC8vIFVzZSBsYXlvdXQgcG9zaXRpb25zIHRvIHJlcG9zaXRpb24gdGhlIG5vZGVzIGl0IGNvbnNpZGVycyB0aGUgb3B0aW9ucyBwYXJhbWV0ZXJcbiAgICAgIHJlYWR5ID0gZmFsc2U7XG4gICAgfSwgMCk7XG4gIH1cbiAgZWxzZSBpZih0aGlzLm9wdGlvbnMuYW5pbWF0ZSA9PSBmYWxzZSl7XG4gICAgc2VsZi5vcHRpb25zLmVsZXMubm9kZXMoKS5ub3QoXCI6cGFyZW50XCIpLmxheW91dFBvc2l0aW9ucyhzZWxmLCBzZWxmLm9wdGlvbnMsIGdldFBvc2l0aW9ucyk7IC8vIFVzZSBsYXlvdXQgcG9zaXRpb25zIHRvIHJlcG9zaXRpb24gdGhlIG5vZGVzIGl0IGNvbnNpZGVycyB0aGUgb3B0aW9ucyBwYXJhbWV0ZXJcbiAgICByZWFkeSA9IGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7IC8vIGNoYWluaW5nXG59O1xuXG4vL0dldCB0aGUgdG9wIG1vc3Qgb25lcyBvZiBhIGxpc3Qgb2Ygbm9kZXNcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRUb3BNb3N0Tm9kZXMgPSBmdW5jdGlvbihub2Rlcykge1xuICB2YXIgbm9kZXNNYXAgPSB7fTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgbm9kZXNNYXBbbm9kZXNbaV0uaWQoKV0gPSB0cnVlO1xuICB9XG4gIHZhciByb290cyA9IG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGVsZSA9IGk7XG4gICAgICB9XG4gICAgICB2YXIgcGFyZW50ID0gZWxlLnBhcmVudCgpWzBdO1xuICAgICAgd2hpbGUocGFyZW50ICE9IG51bGwpe1xuICAgICAgICBpZihub2Rlc01hcFtwYXJlbnQuaWQoKV0pe1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50KClbMF07XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIHJvb3RzO1xufTtcblxuX0NvU0VMYXlvdXQucHJvdG90eXBlLnByb2Nlc3NDaGlsZHJlbkxpc3QgPSBmdW5jdGlvbiAocGFyZW50LCBjaGlsZHJlbiwgbGF5b3V0KSB7XG4gIHZhciBzaXplID0gY2hpbGRyZW4ubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgIHZhciB0aGVDaGlsZCA9IGNoaWxkcmVuW2ldO1xuICAgIHRoaXMub3B0aW9ucy5lbGVzLm5vZGVzKCkubGVuZ3RoO1xuICAgIHZhciBjaGlsZHJlbl9vZl9jaGlsZHJlbiA9IHRoZUNoaWxkLmNoaWxkcmVuKCk7XG4gICAgdmFyIHRoZU5vZGU7ICAgIFxuXG4gICAgdmFyIGRpbWVuc2lvbnMgPSB0aGVDaGlsZC5sYXlvdXREaW1lbnNpb25zKHtcbiAgICAgIG5vZGVEaW1lbnNpb25zSW5jbHVkZUxhYmVsczogdGhpcy5vcHRpb25zLm5vZGVEaW1lbnNpb25zSW5jbHVkZUxhYmVsc1xuICAgIH0pO1xuXG4gICAgaWYgKHRoZUNoaWxkLm91dGVyV2lkdGgoKSAhPSBudWxsXG4gICAgICAgICAgICAmJiB0aGVDaGlsZC5vdXRlckhlaWdodCgpICE9IG51bGwpIHtcbiAgICAgIHRoZU5vZGUgPSBwYXJlbnQuYWRkKG5ldyBDb1NFTm9kZShsYXlvdXQuZ3JhcGhNYW5hZ2VyLFxuICAgICAgICAgICAgICBuZXcgUG9pbnREKHRoZUNoaWxkLnBvc2l0aW9uKCd4JykgLSBkaW1lbnNpb25zLncgLyAyLCB0aGVDaGlsZC5wb3NpdGlvbigneScpIC0gZGltZW5zaW9ucy5oIC8gMiksXG4gICAgICAgICAgICAgIG5ldyBEaW1lbnNpb25EKHBhcnNlRmxvYXQoZGltZW5zaW9ucy53KSwgcGFyc2VGbG9hdChkaW1lbnNpb25zLmgpKSkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoZU5vZGUgPSBwYXJlbnQuYWRkKG5ldyBDb1NFTm9kZSh0aGlzLmdyYXBoTWFuYWdlcikpO1xuICAgIH1cbiAgICAvLyBBdHRhY2ggaWQgdG8gdGhlIGxheW91dCBub2RlXG4gICAgdGhlTm9kZS5pZCA9IHRoZUNoaWxkLmRhdGEoXCJpZFwiKTtcbiAgICAvLyBBdHRhY2ggdGhlIHBhZGRpbmdzIG9mIGN5IG5vZGUgdG8gbGF5b3V0IG5vZGVcbiAgICB0aGVOb2RlLnBhZGRpbmdMZWZ0ID0gcGFyc2VJbnQoIHRoZUNoaWxkLmNzcygncGFkZGluZycpICk7XG4gICAgdGhlTm9kZS5wYWRkaW5nVG9wID0gcGFyc2VJbnQoIHRoZUNoaWxkLmNzcygncGFkZGluZycpICk7XG4gICAgdGhlTm9kZS5wYWRkaW5nUmlnaHQgPSBwYXJzZUludCggdGhlQ2hpbGQuY3NzKCdwYWRkaW5nJykgKTtcbiAgICB0aGVOb2RlLnBhZGRpbmdCb3R0b20gPSBwYXJzZUludCggdGhlQ2hpbGQuY3NzKCdwYWRkaW5nJykgKTtcbiAgICBcbiAgICAvL0F0dGFjaCB0aGUgbGFiZWwgcHJvcGVydGllcyB0byBjb21wb3VuZCBpZiBsYWJlbHMgd2lsbCBiZSBpbmNsdWRlZCBpbiBub2RlIGRpbWVuc2lvbnMgIFxuICAgIGlmKHRoaXMub3B0aW9ucy5ub2RlRGltZW5zaW9uc0luY2x1ZGVMYWJlbHMpe1xuICAgICAgaWYodGhlQ2hpbGQuaXNQYXJlbnQoKSl7XG4gICAgICAgICAgdmFyIGxhYmVsV2lkdGggPSB0aGVDaGlsZC5ib3VuZGluZ0JveCh7IGluY2x1ZGVMYWJlbHM6IHRydWUsIGluY2x1ZGVOb2RlczogZmFsc2UgfSkudzsgICAgICAgICAgXG4gICAgICAgICAgdmFyIGxhYmVsSGVpZ2h0ID0gdGhlQ2hpbGQuYm91bmRpbmdCb3goeyBpbmNsdWRlTGFiZWxzOiB0cnVlLCBpbmNsdWRlTm9kZXM6IGZhbHNlIH0pLmg7XG4gICAgICAgICAgdmFyIGxhYmVsUG9zID0gdGhlQ2hpbGQuY3NzKFwidGV4dC1oYWxpZ25cIik7XG4gICAgICAgICAgdGhlTm9kZS5sYWJlbFdpZHRoID0gbGFiZWxXaWR0aDtcbiAgICAgICAgICB0aGVOb2RlLmxhYmVsSGVpZ2h0ID0gbGFiZWxIZWlnaHQ7XG4gICAgICAgICAgdGhlTm9kZS5sYWJlbFBvcyA9IGxhYmVsUG9zO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBNYXAgdGhlIGxheW91dCBub2RlXG4gICAgdGhpcy5pZFRvTE5vZGVbdGhlQ2hpbGQuZGF0YShcImlkXCIpXSA9IHRoZU5vZGU7XG5cbiAgICBpZiAoaXNOYU4odGhlTm9kZS5yZWN0LngpKSB7XG4gICAgICB0aGVOb2RlLnJlY3QueCA9IDA7XG4gICAgfVxuXG4gICAgaWYgKGlzTmFOKHRoZU5vZGUucmVjdC55KSkge1xuICAgICAgdGhlTm9kZS5yZWN0LnkgPSAwO1xuICAgIH1cblxuICAgIGlmIChjaGlsZHJlbl9vZl9jaGlsZHJlbiAhPSBudWxsICYmIGNoaWxkcmVuX29mX2NoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciB0aGVOZXdHcmFwaDtcbiAgICAgIHRoZU5ld0dyYXBoID0gbGF5b3V0LmdldEdyYXBoTWFuYWdlcigpLmFkZChsYXlvdXQubmV3R3JhcGgoKSwgdGhlTm9kZSk7XG4gICAgICB0aGlzLnByb2Nlc3NDaGlsZHJlbkxpc3QodGhlTmV3R3JhcGgsIGNoaWxkcmVuX29mX2NoaWxkcmVuLCBsYXlvdXQpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBAYnJpZWYgOiBjYWxsZWQgb24gY29udGludW91cyBsYXlvdXRzIHRvIHN0b3AgdGhlbSBiZWZvcmUgdGhleSBmaW5pc2hcbiAqL1xuX0NvU0VMYXlvdXQucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc3RvcHBlZCA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXM7IC8vIGNoYWluaW5nXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldChjeXRvc2NhcGUpIHtcbiAgcmV0dXJuIF9Db1NFTGF5b3V0O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxudmFyIGdldExheW91dCA9IHJlcXVpcmUoJy4vTGF5b3V0Jyk7XG5cbnZhciByZWdpc3RlciA9IGZ1bmN0aW9uKCBjeXRvc2NhcGUgKXtcbiAgdmFyIExheW91dCA9IGdldExheW91dCggY3l0b3NjYXBlICk7XG5cbiAgY3l0b3NjYXBlKCdsYXlvdXQnLCAnY29zZS1iaWxrZW50JywgTGF5b3V0KTtcbn07XG5cbi8vIGF1dG8gcmVnIGZvciBnbG9iYWxzXG5pZiggdHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcgKXtcbiAgcmVnaXN0ZXIoIGN5dG9zY2FwZSApO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xuIl19
