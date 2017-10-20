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
      isDone = self.layout.tick();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXExheW91dFxcQ29TRUNvbnN0YW50cy5qcyIsInNyY1xcTGF5b3V0XFxDb1NFRWRnZS5qcyIsInNyY1xcTGF5b3V0XFxDb1NFR3JhcGguanMiLCJzcmNcXExheW91dFxcQ29TRUdyYXBoTWFuYWdlci5qcyIsInNyY1xcTGF5b3V0XFxDb1NFTGF5b3V0LmpzIiwic3JjXFxMYXlvdXRcXENvU0VOb2RlLmpzIiwic3JjXFxMYXlvdXRcXERpbWVuc2lvbkQuanMiLCJzcmNcXExheW91dFxcRW1pdHRlci5qcyIsInNyY1xcTGF5b3V0XFxGRExheW91dC5qcyIsInNyY1xcTGF5b3V0XFxGRExheW91dENvbnN0YW50cy5qcyIsInNyY1xcTGF5b3V0XFxGRExheW91dEVkZ2UuanMiLCJzcmNcXExheW91dFxcRkRMYXlvdXROb2RlLmpzIiwic3JjXFxMYXlvdXRcXEhhc2hNYXAuanMiLCJzcmNcXExheW91dFxcSGFzaFNldC5qcyIsInNyY1xcTGF5b3V0XFxJR2VvbWV0cnkuanMiLCJzcmNcXExheW91dFxcSU1hdGguanMiLCJzcmNcXExheW91dFxcSW50ZWdlci5qcyIsInNyY1xcTGF5b3V0XFxMRWRnZS5qcyIsInNyY1xcTGF5b3V0XFxMR3JhcGguanMiLCJzcmNcXExheW91dFxcTEdyYXBoTWFuYWdlci5qcyIsInNyY1xcTGF5b3V0XFxMR3JhcGhPYmplY3QuanMiLCJzcmNcXExheW91dFxcTE5vZGUuanMiLCJzcmNcXExheW91dFxcTGF5b3V0LmpzIiwic3JjXFxMYXlvdXRcXExheW91dENvbnN0YW50cy5qcyIsInNyY1xcTGF5b3V0XFxQb2ludC5qcyIsInNyY1xcTGF5b3V0XFxQb2ludEQuanMiLCJzcmNcXExheW91dFxcUmFuZG9tU2VlZC5qcyIsInNyY1xcTGF5b3V0XFxSZWN0YW5nbGVELmpzIiwic3JjXFxMYXlvdXRcXFRyYW5zZm9ybS5qcyIsInNyY1xcTGF5b3V0XFxVbmlxdWVJREdlbmVyZXRvci5qcyIsInNyY1xcTGF5b3V0XFxpbmRleC5qcyIsImluZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQSxJQUFJLG9CQUFvQixRQUFRLHFCQUFSLENBQXhCOztBQUVBLFNBQVMsYUFBVCxHQUF5QixDQUN4Qjs7QUFFRDtBQUNBLEtBQUssSUFBSSxJQUFULElBQWlCLGlCQUFqQixFQUFvQztBQUNsQyxnQkFBYyxJQUFkLElBQXNCLGtCQUFrQixJQUFsQixDQUF0QjtBQUNEOztBQUVELGNBQWMsK0JBQWQsR0FBZ0QsS0FBaEQ7QUFDQSxjQUFjLHlCQUFkLEdBQTBDLGtCQUFrQixtQkFBNUQ7QUFDQSxjQUFjLDRCQUFkLEdBQTZDLEVBQTdDO0FBQ0EsY0FBYyxJQUFkLEdBQXFCLElBQXJCO0FBQ0EsY0FBYyx1QkFBZCxHQUF3QyxFQUF4QztBQUNBLGNBQWMseUJBQWQsR0FBMEMsRUFBMUM7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLGFBQWpCOzs7OztBQ2pCQSxJQUFJLGVBQWUsUUFBUSxnQkFBUixDQUFuQjs7QUFFQSxTQUFTLFFBQVQsQ0FBa0IsTUFBbEIsRUFBMEIsTUFBMUIsRUFBa0MsS0FBbEMsRUFBeUM7QUFDdkMsZUFBYSxJQUFiLENBQWtCLElBQWxCLEVBQXdCLE1BQXhCLEVBQWdDLE1BQWhDLEVBQXdDLEtBQXhDO0FBQ0Q7O0FBRUQsU0FBUyxTQUFULEdBQXFCLE9BQU8sTUFBUCxDQUFjLGFBQWEsU0FBM0IsQ0FBckI7QUFDQSxLQUFLLElBQUksSUFBVCxJQUFpQixZQUFqQixFQUErQjtBQUM3QixXQUFTLElBQVQsSUFBaUIsYUFBYSxJQUFiLENBQWpCO0FBQ0Q7O0FBRUQsT0FBTyxPQUFQLEdBQWlCLFFBQWpCOzs7OztBQ1hBLElBQUksU0FBUyxRQUFRLFVBQVIsQ0FBYjs7QUFFQSxTQUFTLFNBQVQsQ0FBbUIsTUFBbkIsRUFBMkIsUUFBM0IsRUFBcUMsTUFBckMsRUFBNkM7QUFDM0MsU0FBTyxJQUFQLENBQVksSUFBWixFQUFrQixNQUFsQixF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QVk7QUFDdkMsT0FBSyxPQUFMLEdBQWUsSUFBZjs7QUFFQSxPQUFLLE9BQUwsQ0FBYSxZQUFiOztBQUVBLFNBQU8sSUFBUCxDQUx1QyxDQUsxQjtBQUNkLENBTkQ7O0FBUUEsT0FBTyxPQUFQLEdBQWlCLFNBQVMsR0FBVCxDQUFhLFNBQWIsRUFBd0I7QUFDdkMsU0FBTyxXQUFQO0FBQ0QsQ0FGRDs7O0FDNVhBOztBQUVBOztBQUNBLElBQUksWUFBWSxRQUFRLFVBQVIsQ0FBaEI7O0FBRUEsSUFBSSxXQUFXLFNBQVgsUUFBVyxDQUFVLFNBQVYsRUFBcUI7QUFDbEMsTUFBSSxTQUFTLFVBQVcsU0FBWCxDQUFiOztBQUVBLFlBQVUsUUFBVixFQUFvQixjQUFwQixFQUFvQyxNQUFwQztBQUNELENBSkQ7O0FBTUE7QUFDQSxJQUFJLE9BQU8sU0FBUCxLQUFxQixXQUF6QixFQUFzQztBQUNwQyxXQUFVLFNBQVY7QUFDRDs7QUFFRCxPQUFPLE9BQVAsR0FBaUIsUUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xyXG5cclxuZnVuY3Rpb24gQ29TRUNvbnN0YW50cygpIHtcclxufVxyXG5cclxuLy9Db1NFQ29uc3RhbnRzIGluaGVyaXRzIHN0YXRpYyBwcm9wcyBpbiBGRExheW91dENvbnN0YW50c1xyXG5mb3IgKHZhciBwcm9wIGluIEZETGF5b3V0Q29uc3RhbnRzKSB7XHJcbiAgQ29TRUNvbnN0YW50c1twcm9wXSA9IEZETGF5b3V0Q29uc3RhbnRzW3Byb3BdO1xyXG59XHJcblxyXG5Db1NFQ29uc3RhbnRzLkRFRkFVTFRfVVNFX01VTFRJX0xFVkVMX1NDQUxJTkcgPSBmYWxzZTtcclxuQ29TRUNvbnN0YW50cy5ERUZBVUxUX1JBRElBTF9TRVBBUkFUSU9OID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcclxuQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPTkVOVF9TRVBFUkFUSU9OID0gNjA7XHJcbkNvU0VDb25zdGFudHMuVElMRSA9IHRydWU7XHJcbkNvU0VDb25zdGFudHMuVElMSU5HX1BBRERJTkdfVkVSVElDQUwgPSAxMDtcclxuQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19IT1JJWk9OVEFMID0gMTA7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvU0VDb25zdGFudHM7XHJcbiIsInZhciBGRExheW91dEVkZ2UgPSByZXF1aXJlKCcuL0ZETGF5b3V0RWRnZScpO1xyXG5cclxuZnVuY3Rpb24gQ29TRUVkZ2Uoc291cmNlLCB0YXJnZXQsIHZFZGdlKSB7XHJcbiAgRkRMYXlvdXRFZGdlLmNhbGwodGhpcywgc291cmNlLCB0YXJnZXQsIHZFZGdlKTtcclxufVxyXG5cclxuQ29TRUVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGRExheW91dEVkZ2UucHJvdG90eXBlKTtcclxuZm9yICh2YXIgcHJvcCBpbiBGRExheW91dEVkZ2UpIHtcclxuICBDb1NFRWRnZVtwcm9wXSA9IEZETGF5b3V0RWRnZVtwcm9wXTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb1NFRWRnZVxyXG4iLCJ2YXIgTEdyYXBoID0gcmVxdWlyZSgnLi9MR3JhcGgnKTtcclxuXHJcbmZ1bmN0aW9uIENvU0VHcmFwaChwYXJlbnQsIGdyYXBoTWdyLCB2R3JhcGgpIHtcclxuICBMR3JhcGguY2FsbCh0aGlzLCBwYXJlbnQsIGdyYXBoTWdyLCB2R3JhcGgpO1xyXG59XHJcblxyXG5Db1NFR3JhcGgucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGgucHJvdG90eXBlKTtcclxuZm9yICh2YXIgcHJvcCBpbiBMR3JhcGgpIHtcclxuICBDb1NFR3JhcGhbcHJvcF0gPSBMR3JhcGhbcHJvcF07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29TRUdyYXBoO1xyXG4iLCJ2YXIgTEdyYXBoTWFuYWdlciA9IHJlcXVpcmUoJy4vTEdyYXBoTWFuYWdlcicpO1xyXG5cclxuZnVuY3Rpb24gQ29TRUdyYXBoTWFuYWdlcihsYXlvdXQpIHtcclxuICBMR3JhcGhNYW5hZ2VyLmNhbGwodGhpcywgbGF5b3V0KTtcclxufVxyXG5cclxuQ29TRUdyYXBoTWFuYWdlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExHcmFwaE1hbmFnZXIucHJvdG90eXBlKTtcclxuZm9yICh2YXIgcHJvcCBpbiBMR3JhcGhNYW5hZ2VyKSB7XHJcbiAgQ29TRUdyYXBoTWFuYWdlcltwcm9wXSA9IExHcmFwaE1hbmFnZXJbcHJvcF07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29TRUdyYXBoTWFuYWdlcjtcclxuIiwidmFyIEZETGF5b3V0ID0gcmVxdWlyZSgnLi9GRExheW91dCcpO1xudmFyIENvU0VHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0NvU0VHcmFwaE1hbmFnZXInKTtcbnZhciBDb1NFR3JhcGggPSByZXF1aXJlKCcuL0NvU0VHcmFwaCcpO1xudmFyIENvU0VOb2RlID0gcmVxdWlyZSgnLi9Db1NFTm9kZScpO1xudmFyIENvU0VFZGdlID0gcmVxdWlyZSgnLi9Db1NFRWRnZScpO1xudmFyIENvU0VDb25zdGFudHMgPSByZXF1aXJlKCcuL0NvU0VDb25zdGFudHMnKTtcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcbnZhciBMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0xheW91dENvbnN0YW50cycpO1xudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9Qb2ludCcpO1xudmFyIFBvaW50RCA9IHJlcXVpcmUoJy4vUG9pbnREJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9MYXlvdXQnKTtcbnZhciBJbnRlZ2VyID0gcmVxdWlyZSgnLi9JbnRlZ2VyJyk7XG52YXIgSUdlb21ldHJ5ID0gcmVxdWlyZSgnLi9JR2VvbWV0cnknKTtcbnZhciBMR3JhcGggPSByZXF1aXJlKCcuL0xHcmFwaCcpO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyk7XG5cbmZ1bmN0aW9uIENvU0VMYXlvdXQoKSB7XG4gIEZETGF5b3V0LmNhbGwodGhpcyk7XG4gIFxuICB0aGlzLnRvQmVUaWxlZCA9IHt9OyAvLyBNZW1vcml6ZSBpZiBhIG5vZGUgaXMgdG8gYmUgdGlsZWQgb3IgaXMgdGlsZWRcbn1cblxuQ29TRUxheW91dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZETGF5b3V0LnByb3RvdHlwZSk7XG5cbmZvciAodmFyIHByb3AgaW4gRkRMYXlvdXQpIHtcbiAgQ29TRUxheW91dFtwcm9wXSA9IEZETGF5b3V0W3Byb3BdO1xufVxuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdHcmFwaE1hbmFnZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBnbSA9IG5ldyBDb1NFR3JhcGhNYW5hZ2VyKHRoaXMpO1xuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xuICByZXR1cm4gZ207XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdHcmFwaCA9IGZ1bmN0aW9uICh2R3JhcGgpIHtcbiAgcmV0dXJuIG5ldyBDb1NFR3JhcGgobnVsbCwgdGhpcy5ncmFwaE1hbmFnZXIsIHZHcmFwaCk7XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5uZXdOb2RlID0gZnVuY3Rpb24gKHZOb2RlKSB7XG4gIHJldHVybiBuZXcgQ29TRU5vZGUodGhpcy5ncmFwaE1hbmFnZXIsIHZOb2RlKTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLm5ld0VkZ2UgPSBmdW5jdGlvbiAodkVkZ2UpIHtcbiAgcmV0dXJuIG5ldyBDb1NFRWRnZShudWxsLCBudWxsLCB2RWRnZSk7XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycyA9IGZ1bmN0aW9uICgpIHtcbiAgRkRMYXlvdXQucHJvdG90eXBlLmluaXRQYXJhbWV0ZXJzLmNhbGwodGhpcywgYXJndW1lbnRzKTtcbiAgaWYgKCF0aGlzLmlzU3ViTGF5b3V0KSB7XG4gICAgaWYgKENvU0VDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA8IDEwKVxuICAgIHtcbiAgICAgIHRoaXMuaWRlYWxFZGdlTGVuZ3RoID0gMTA7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICB0aGlzLmlkZWFsRWRnZUxlbmd0aCA9IENvU0VDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcbiAgICB9XG5cbiAgICB0aGlzLnVzZVNtYXJ0SWRlYWxFZGdlTGVuZ3RoQ2FsY3VsYXRpb24gPVxuICAgICAgICAgICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX1VTRV9TTUFSVF9JREVBTF9FREdFX0xFTkdUSF9DQUxDVUxBVElPTjtcbiAgICB0aGlzLnNwcmluZ0NvbnN0YW50ID1cbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfU1BSSU5HX1NUUkVOR1RIO1xuICAgIHRoaXMucmVwdWxzaW9uQ29uc3RhbnQgPVxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEg7XG4gICAgdGhpcy5ncmF2aXR5Q29uc3RhbnQgPVxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIO1xuICAgIHRoaXMuY29tcG91bmRHcmF2aXR5Q29uc3RhbnQgPVxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1NUUkVOR1RIO1xuICAgIHRoaXMuZ3Jhdml0eVJhbmdlRmFjdG9yID1cbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XG4gICAgdGhpcy5jb21wb3VuZEdyYXZpdHlSYW5nZUZhY3RvciA9XG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfUkFOR0VfRkFDVE9SO1xuICB9XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5sYXlvdXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBjcmVhdGVCZW5kc0FzTmVlZGVkID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ1JFQVRFX0JFTkRTX0FTX05FRURFRDtcbiAgaWYgKGNyZWF0ZUJlbmRzQXNOZWVkZWQpXG4gIHtcbiAgICB0aGlzLmNyZWF0ZUJlbmRwb2ludHMoKTtcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZXNldEFsbEVkZ2VzKCk7XG4gIH1cblxuICB0aGlzLmxldmVsID0gMDtcbiAgcmV0dXJuIHRoaXMuY2xhc3NpY0xheW91dCgpO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuY2xhc3NpY0xheW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5jYWxjdWxhdGVOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvblRvKCk7XG4gIHRoaXMuY2FsY05vT2ZDaGlsZHJlbkZvckFsbE5vZGVzKCk7XG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLmNhbGNMb3dlc3RDb21tb25BbmNlc3RvcnMoKTtcbiAgdGhpcy5ncmFwaE1hbmFnZXIuY2FsY0luY2x1c2lvblRyZWVEZXB0aHMoKTtcbiAgdGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmNhbGNFc3RpbWF0ZWRTaXplKCk7XG4gIHRoaXMuY2FsY0lkZWFsRWRnZUxlbmd0aHMoKTtcbiAgaWYgKCF0aGlzLmluY3JlbWVudGFsKVxuICB7XG4gICAgdmFyIGZvcmVzdCA9IHRoaXMuZ2V0RmxhdEZvcmVzdCgpO1xuXG4gICAgLy8gVGhlIGdyYXBoIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGxheW91dCBpcyBmbGF0IGFuZCBhIGZvcmVzdFxuICAgIGlmIChmb3Jlc3QubGVuZ3RoID4gMClcblxuICAgIHtcbiAgICAgIHRoaXMucG9zaXRpb25Ob2Rlc1JhZGlhbGx5KGZvcmVzdCk7XG4gICAgfVxuICAgIC8vIFRoZSBncmFwaCBhc3NvY2lhdGVkIHdpdGggdGhpcyBsYXlvdXQgaXMgbm90IGZsYXQgb3IgYSBmb3Jlc3RcbiAgICBlbHNlXG4gICAge1xuICAgICAgdGhpcy5wb3NpdGlvbk5vZGVzUmFuZG9tbHkoKTtcbiAgICB9XG4gIH1cblxuICB0aGlzLmluaXRTcHJpbmdFbWJlZGRlcigpO1xuICB0aGlzLnJ1blNwcmluZ0VtYmVkZGVyKCk7XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS50aWNrID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMudG90YWxJdGVyYXRpb25zKys7XG4gIFxuICBpZiAodGhpcy50b3RhbEl0ZXJhdGlvbnMgPT09IHRoaXMubWF4SXRlcmF0aW9ucykge1xuICAgIHJldHVybiB0cnVlOyAvLyBMYXlvdXQgaXMgbm90IGVuZGVkIHJldHVybiB0cnVlXG4gIH1cbiAgXG4gIGlmICh0aGlzLnRvdGFsSXRlcmF0aW9ucyAlIEZETGF5b3V0Q29uc3RhbnRzLkNPTlZFUkdFTkNFX0NIRUNLX1BFUklPRCA9PSAwKVxuICB7XG4gICAgaWYgKHRoaXMuaXNDb252ZXJnZWQoKSlcbiAgICB7XG4gICAgICByZXR1cm4gdHJ1ZTsgLy8gTGF5b3V0IGlzIG5vdCBlbmRlZCByZXR1cm4gdHJ1ZVxuICAgIH1cblxuICAgIHRoaXMuY29vbGluZ0ZhY3RvciA9IHRoaXMuaW5pdGlhbENvb2xpbmdGYWN0b3IgKlxuICAgICAgICAgICAgKCh0aGlzLm1heEl0ZXJhdGlvbnMgLSB0aGlzLnRvdGFsSXRlcmF0aW9ucykgLyB0aGlzLm1heEl0ZXJhdGlvbnMpO1xuICAgIHRoaXMuYW5pbWF0aW9uUGVyaW9kID0gTWF0aC5jZWlsKHRoaXMuaW5pdGlhbEFuaW1hdGlvblBlcmlvZCAqIE1hdGguc3FydCh0aGlzLmNvb2xpbmdGYWN0b3IpKTtcblxuICB9XG4gIHRoaXMudG90YWxEaXNwbGFjZW1lbnQgPSAwO1xuICB0aGlzLmdyYXBoTWFuYWdlci51cGRhdGVCb3VuZHMoKTtcbiAgdGhpcy5jYWxjU3ByaW5nRm9yY2VzKCk7XG4gIHRoaXMuY2FsY1JlcHVsc2lvbkZvcmNlcygpO1xuICB0aGlzLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2VzKCk7XG4gIHRoaXMubW92ZU5vZGVzKCk7XG4gIHRoaXMuYW5pbWF0ZSgpO1xuICBcbiAgcmV0dXJuIGZhbHNlOyAvLyBMYXlvdXQgaXMgbm90IGVuZGVkIHlldCByZXR1cm4gZmFsc2Vcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmdldFBvc2l0aW9uc0RhdGEgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFsbE5vZGVzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsTm9kZXMoKTtcbiAgdmFyIHBEYXRhID0ge307XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcmVjdCA9IGFsbE5vZGVzW2ldLnJlY3Q7XG4gICAgdmFyIGlkID0gYWxsTm9kZXNbaV0uaWQ7XG4gICAgcERhdGFbaWRdID0ge1xuICAgICAgaWQ6IGlkLFxuICAgICAgeDogcmVjdC5nZXRDZW50ZXJYKCksXG4gICAgICB5OiByZWN0LmdldENlbnRlclkoKSxcbiAgICAgIHc6IHJlY3Qud2lkdGgsXG4gICAgICBoOiByZWN0LmhlaWdodFxuICAgIH07XG4gIH1cbiAgXG4gIHJldHVybiBwRGF0YTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLnJ1blNwcmluZ0VtYmVkZGVyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmluaXRpYWxBbmltYXRpb25QZXJpb2QgPSAyNTtcbiAgdGhpcy5hbmltYXRpb25QZXJpb2QgPSB0aGlzLmluaXRpYWxBbmltYXRpb25QZXJpb2Q7XG4gIHZhciBsYXlvdXRFbmRlZCA9IGZhbHNlO1xuICBcbiAgLy8gSWYgYW1pbmF0ZSBvcHRpb24gaXMgJ2R1cmluZycgc2lnbmFsIHRoYXQgbGF5b3V0IGlzIHN1cHBvc2VkIHRvIHN0YXJ0IGl0ZXJhdGluZ1xuICBpZiAoIEZETGF5b3V0Q29uc3RhbnRzLkFOSU1BVEUgPT09ICdkdXJpbmcnICkge1xuICAgIHRoaXMuZW1pdCgnbGF5b3V0c3RhcnRlZCcpO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIElmIGFtaW5hdGUgb3B0aW9uIGlzICdkdXJpbmcnIHRpY2soKSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBvbiBpbmRleC5qc1xuICAgIHdoaWxlICghbGF5b3V0RW5kZWQpIHtcbiAgICAgIGxheW91dEVuZGVkID0gdGhpcy50aWNrKCk7XG4gICAgfVxuXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIudXBkYXRlQm91bmRzKCk7XG4gIH1cbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmNhbGN1bGF0ZU5vZGVzVG9BcHBseUdyYXZpdGF0aW9uVG8gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBub2RlTGlzdCA9IFtdO1xuICB2YXIgZ3JhcGg7XG5cbiAgdmFyIGdyYXBocyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEdyYXBocygpO1xuICB2YXIgc2l6ZSA9IGdyYXBocy5sZW5ndGg7XG4gIHZhciBpO1xuICBmb3IgKGkgPSAwOyBpIDwgc2l6ZTsgaSsrKVxuICB7XG4gICAgZ3JhcGggPSBncmFwaHNbaV07XG5cbiAgICBncmFwaC51cGRhdGVDb25uZWN0ZWQoKTtcblxuICAgIGlmICghZ3JhcGguaXNDb25uZWN0ZWQpXG4gICAge1xuICAgICAgbm9kZUxpc3QgPSBub2RlTGlzdC5jb25jYXQoZ3JhcGguZ2V0Tm9kZXMoKSk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy5ncmFwaE1hbmFnZXIuc2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24obm9kZUxpc3QpO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuY2FsY05vT2ZDaGlsZHJlbkZvckFsbE5vZGVzID0gZnVuY3Rpb24gKClcbntcbiAgdmFyIG5vZGU7XG4gIHZhciBhbGxOb2RlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzKCk7XG4gIFxuICBmb3IodmFyIGkgPSAwOyBpIDwgYWxsTm9kZXMubGVuZ3RoOyBpKyspXG4gIHtcbiAgICAgIG5vZGUgPSBhbGxOb2Rlc1tpXTtcbiAgICAgIG5vZGUubm9PZkNoaWxkcmVuID0gbm9kZS5nZXROb09mQ2hpbGRyZW4oKTtcbiAgfVxufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuY3JlYXRlQmVuZHBvaW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGVkZ2VzID0gW107XG4gIGVkZ2VzID0gZWRnZXMuY29uY2F0KHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbEVkZ2VzKCkpO1xuICB2YXIgdmlzaXRlZCA9IG5ldyBIYXNoU2V0KCk7XG4gIHZhciBpO1xuICBmb3IgKGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspXG4gIHtcbiAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xuXG4gICAgaWYgKCF2aXNpdGVkLmNvbnRhaW5zKGVkZ2UpKVxuICAgIHtcbiAgICAgIHZhciBzb3VyY2UgPSBlZGdlLmdldFNvdXJjZSgpO1xuICAgICAgdmFyIHRhcmdldCA9IGVkZ2UuZ2V0VGFyZ2V0KCk7XG5cbiAgICAgIGlmIChzb3VyY2UgPT0gdGFyZ2V0KVxuICAgICAge1xuICAgICAgICBlZGdlLmdldEJlbmRwb2ludHMoKS5wdXNoKG5ldyBQb2ludEQoKSk7XG4gICAgICAgIGVkZ2UuZ2V0QmVuZHBvaW50cygpLnB1c2gobmV3IFBvaW50RCgpKTtcbiAgICAgICAgdGhpcy5jcmVhdGVEdW1teU5vZGVzRm9yQmVuZHBvaW50cyhlZGdlKTtcbiAgICAgICAgdmlzaXRlZC5hZGQoZWRnZSk7XG4gICAgICB9XG4gICAgICBlbHNlXG4gICAgICB7XG4gICAgICAgIHZhciBlZGdlTGlzdCA9IFtdO1xuXG4gICAgICAgIGVkZ2VMaXN0ID0gZWRnZUxpc3QuY29uY2F0KHNvdXJjZS5nZXRFZGdlTGlzdFRvTm9kZSh0YXJnZXQpKTtcbiAgICAgICAgZWRnZUxpc3QgPSBlZGdlTGlzdC5jb25jYXQodGFyZ2V0LmdldEVkZ2VMaXN0VG9Ob2RlKHNvdXJjZSkpO1xuXG4gICAgICAgIGlmICghdmlzaXRlZC5jb250YWlucyhlZGdlTGlzdFswXSkpXG4gICAgICAgIHtcbiAgICAgICAgICBpZiAoZWRnZUxpc3QubGVuZ3RoID4gMSlcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2YXIgaztcbiAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCBlZGdlTGlzdC5sZW5ndGg7IGsrKylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdmFyIG11bHRpRWRnZSA9IGVkZ2VMaXN0W2tdO1xuICAgICAgICAgICAgICBtdWx0aUVkZ2UuZ2V0QmVuZHBvaW50cygpLnB1c2gobmV3IFBvaW50RCgpKTtcbiAgICAgICAgICAgICAgdGhpcy5jcmVhdGVEdW1teU5vZGVzRm9yQmVuZHBvaW50cyhtdWx0aUVkZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2aXNpdGVkLmFkZEFsbChsaXN0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh2aXNpdGVkLnNpemUoKSA9PSBlZGdlcy5sZW5ndGgpXG4gICAge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5wb3NpdGlvbk5vZGVzUmFkaWFsbHkgPSBmdW5jdGlvbiAoZm9yZXN0KSB7XG4gIC8vIFdlIHRpbGUgdGhlIHRyZWVzIHRvIGEgZ3JpZCByb3cgYnkgcm93OyBmaXJzdCB0cmVlIHN0YXJ0cyBhdCAoMCwwKVxuICB2YXIgY3VycmVudFN0YXJ0aW5nUG9pbnQgPSBuZXcgUG9pbnQoMCwgMCk7XG4gIHZhciBudW1iZXJPZkNvbHVtbnMgPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KGZvcmVzdC5sZW5ndGgpKTtcbiAgdmFyIGhlaWdodCA9IDA7XG4gIHZhciBjdXJyZW50WSA9IDA7XG4gIHZhciBjdXJyZW50WCA9IDA7XG4gIHZhciBwb2ludCA9IG5ldyBQb2ludEQoMCwgMCk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmb3Jlc3QubGVuZ3RoOyBpKyspXG4gIHtcbiAgICBpZiAoaSAlIG51bWJlck9mQ29sdW1ucyA9PSAwKVxuICAgIHtcbiAgICAgIC8vIFN0YXJ0IG9mIGEgbmV3IHJvdywgbWFrZSB0aGUgeCBjb29yZGluYXRlIDAsIGluY3JlbWVudCB0aGVcbiAgICAgIC8vIHkgY29vcmRpbmF0ZSB3aXRoIHRoZSBtYXggaGVpZ2h0IG9mIHRoZSBwcmV2aW91cyByb3dcbiAgICAgIGN1cnJlbnRYID0gMDtcbiAgICAgIGN1cnJlbnRZID0gaGVpZ2h0O1xuXG4gICAgICBpZiAoaSAhPSAwKVxuICAgICAge1xuICAgICAgICBjdXJyZW50WSArPSBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfQ09NUE9ORU5UX1NFUEVSQVRJT047XG4gICAgICB9XG5cbiAgICAgIGhlaWdodCA9IDA7XG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSBmb3Jlc3RbaV07XG5cbiAgICAvLyBGaW5kIHRoZSBjZW50ZXIgb2YgdGhlIHRyZWVcbiAgICB2YXIgY2VudGVyTm9kZSA9IExheW91dC5maW5kQ2VudGVyT2ZUcmVlKHRyZWUpO1xuXG4gICAgLy8gU2V0IHRoZSBzdGFyaW5nIHBvaW50IG9mIHRoZSBuZXh0IHRyZWVcbiAgICBjdXJyZW50U3RhcnRpbmdQb2ludC54ID0gY3VycmVudFg7XG4gICAgY3VycmVudFN0YXJ0aW5nUG9pbnQueSA9IGN1cnJlbnRZO1xuXG4gICAgLy8gRG8gYSByYWRpYWwgbGF5b3V0IHN0YXJ0aW5nIHdpdGggdGhlIGNlbnRlclxuICAgIHBvaW50ID1cbiAgICAgICAgICAgIENvU0VMYXlvdXQucmFkaWFsTGF5b3V0KHRyZWUsIGNlbnRlck5vZGUsIGN1cnJlbnRTdGFydGluZ1BvaW50KTtcblxuICAgIGlmIChwb2ludC55ID4gaGVpZ2h0KVxuICAgIHtcbiAgICAgIGhlaWdodCA9IE1hdGguZmxvb3IocG9pbnQueSk7XG4gICAgfVxuXG4gICAgY3VycmVudFggPSBNYXRoLmZsb29yKHBvaW50LnggKyBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfQ09NUE9ORU5UX1NFUEVSQVRJT04pO1xuICB9XG5cbiAgdGhpcy50cmFuc2Zvcm0oXG4gICAgICAgICAgbmV3IFBvaW50RChMYXlvdXRDb25zdGFudHMuV09STERfQ0VOVEVSX1ggLSBwb2ludC54IC8gMixcbiAgICAgICAgICAgICAgICAgIExheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWSAtIHBvaW50LnkgLyAyKSk7XG59O1xuXG5Db1NFTGF5b3V0LnJhZGlhbExheW91dCA9IGZ1bmN0aW9uICh0cmVlLCBjZW50ZXJOb2RlLCBzdGFydGluZ1BvaW50KSB7XG4gIHZhciByYWRpYWxTZXAgPSBNYXRoLm1heCh0aGlzLm1heERpYWdvbmFsSW5UcmVlKHRyZWUpLFxuICAgICAgICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9SQURJQUxfU0VQQVJBVElPTik7XG4gIENvU0VMYXlvdXQuYnJhbmNoUmFkaWFsTGF5b3V0KGNlbnRlck5vZGUsIG51bGwsIDAsIDM1OSwgMCwgcmFkaWFsU2VwKTtcbiAgdmFyIGJvdW5kcyA9IExHcmFwaC5jYWxjdWxhdGVCb3VuZHModHJlZSk7XG5cbiAgdmFyIHRyYW5zZm9ybSA9IG5ldyBUcmFuc2Zvcm0oKTtcbiAgdHJhbnNmb3JtLnNldERldmljZU9yZ1goYm91bmRzLmdldE1pblgoKSk7XG4gIHRyYW5zZm9ybS5zZXREZXZpY2VPcmdZKGJvdW5kcy5nZXRNaW5ZKCkpO1xuICB0cmFuc2Zvcm0uc2V0V29ybGRPcmdYKHN0YXJ0aW5nUG9pbnQueCk7XG4gIHRyYW5zZm9ybS5zZXRXb3JsZE9yZ1koc3RhcnRpbmdQb2ludC55KTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRyZWUubGVuZ3RoOyBpKyspXG4gIHtcbiAgICB2YXIgbm9kZSA9IHRyZWVbaV07XG4gICAgbm9kZS50cmFuc2Zvcm0odHJhbnNmb3JtKTtcbiAgfVxuXG4gIHZhciBib3R0b21SaWdodCA9XG4gICAgICAgICAgbmV3IFBvaW50RChib3VuZHMuZ2V0TWF4WCgpLCBib3VuZHMuZ2V0TWF4WSgpKTtcblxuICByZXR1cm4gdHJhbnNmb3JtLmludmVyc2VUcmFuc2Zvcm1Qb2ludChib3R0b21SaWdodCk7XG59O1xuXG5Db1NFTGF5b3V0LmJyYW5jaFJhZGlhbExheW91dCA9IGZ1bmN0aW9uIChub2RlLCBwYXJlbnRPZk5vZGUsIHN0YXJ0QW5nbGUsIGVuZEFuZ2xlLCBkaXN0YW5jZSwgcmFkaWFsU2VwYXJhdGlvbikge1xuICAvLyBGaXJzdCwgcG9zaXRpb24gdGhpcyBub2RlIGJ5IGZpbmRpbmcgaXRzIGFuZ2xlLlxuICB2YXIgaGFsZkludGVydmFsID0gKChlbmRBbmdsZSAtIHN0YXJ0QW5nbGUpICsgMSkgLyAyO1xuXG4gIGlmIChoYWxmSW50ZXJ2YWwgPCAwKVxuICB7XG4gICAgaGFsZkludGVydmFsICs9IDE4MDtcbiAgfVxuXG4gIHZhciBub2RlQW5nbGUgPSAoaGFsZkludGVydmFsICsgc3RhcnRBbmdsZSkgJSAzNjA7XG4gIHZhciB0ZXRhID0gKG5vZGVBbmdsZSAqIElHZW9tZXRyeS5UV09fUEkpIC8gMzYwO1xuXG4gIC8vIE1ha2UgcG9sYXIgdG8gamF2YSBjb3JkaW5hdGUgY29udmVyc2lvbi5cbiAgdmFyIGNvc190ZXRhID0gTWF0aC5jb3ModGV0YSk7XG4gIHZhciB4XyA9IGRpc3RhbmNlICogTWF0aC5jb3ModGV0YSk7XG4gIHZhciB5XyA9IGRpc3RhbmNlICogTWF0aC5zaW4odGV0YSk7XG5cbiAgbm9kZS5zZXRDZW50ZXIoeF8sIHlfKTtcblxuICAvLyBUcmF2ZXJzZSBhbGwgbmVpZ2hib3JzIG9mIHRoaXMgbm9kZSBhbmQgcmVjdXJzaXZlbHkgY2FsbCB0aGlzXG4gIC8vIGZ1bmN0aW9uLlxuICB2YXIgbmVpZ2hib3JFZGdlcyA9IFtdO1xuICBuZWlnaGJvckVkZ2VzID0gbmVpZ2hib3JFZGdlcy5jb25jYXQobm9kZS5nZXRFZGdlcygpKTtcbiAgdmFyIGNoaWxkQ291bnQgPSBuZWlnaGJvckVkZ2VzLmxlbmd0aDtcblxuICBpZiAocGFyZW50T2ZOb2RlICE9IG51bGwpXG4gIHtcbiAgICBjaGlsZENvdW50LS07XG4gIH1cblxuICB2YXIgYnJhbmNoQ291bnQgPSAwO1xuXG4gIHZhciBpbmNFZGdlc0NvdW50ID0gbmVpZ2hib3JFZGdlcy5sZW5ndGg7XG4gIHZhciBzdGFydEluZGV4O1xuXG4gIHZhciBlZGdlcyA9IG5vZGUuZ2V0RWRnZXNCZXR3ZWVuKHBhcmVudE9mTm9kZSk7XG5cbiAgLy8gSWYgdGhlcmUgYXJlIG11bHRpcGxlIGVkZ2VzLCBwcnVuZSB0aGVtIHVudGlsIHRoZXJlIHJlbWFpbnMgb25seSBvbmVcbiAgLy8gZWRnZS5cbiAgd2hpbGUgKGVkZ2VzLmxlbmd0aCA+IDEpXG4gIHtcbiAgICAvL25laWdoYm9yRWRnZXMucmVtb3ZlKGVkZ2VzLnJlbW92ZSgwKSk7XG4gICAgdmFyIHRlbXAgPSBlZGdlc1swXTtcbiAgICBlZGdlcy5zcGxpY2UoMCwgMSk7XG4gICAgdmFyIGluZGV4ID0gbmVpZ2hib3JFZGdlcy5pbmRleE9mKHRlbXApO1xuICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICBuZWlnaGJvckVkZ2VzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICAgIGluY0VkZ2VzQ291bnQtLTtcbiAgICBjaGlsZENvdW50LS07XG4gIH1cblxuICBpZiAocGFyZW50T2ZOb2RlICE9IG51bGwpXG4gIHtcbiAgICAvL2Fzc2VydCBlZGdlcy5sZW5ndGggPT0gMTtcbiAgICBzdGFydEluZGV4ID0gKG5laWdoYm9yRWRnZXMuaW5kZXhPZihlZGdlc1swXSkgKyAxKSAlIGluY0VkZ2VzQ291bnQ7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgc3RhcnRJbmRleCA9IDA7XG4gIH1cblxuICB2YXIgc3RlcEFuZ2xlID0gTWF0aC5hYnMoZW5kQW5nbGUgLSBzdGFydEFuZ2xlKSAvIGNoaWxkQ291bnQ7XG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0SW5kZXg7XG4gICAgICAgICAgYnJhbmNoQ291bnQgIT0gY2hpbGRDb3VudDtcbiAgICAgICAgICBpID0gKCsraSkgJSBpbmNFZGdlc0NvdW50KVxuICB7XG4gICAgdmFyIGN1cnJlbnROZWlnaGJvciA9XG4gICAgICAgICAgICBuZWlnaGJvckVkZ2VzW2ldLmdldE90aGVyRW5kKG5vZGUpO1xuXG4gICAgLy8gRG9uJ3QgYmFjayB0cmF2ZXJzZSB0byByb290IG5vZGUgaW4gY3VycmVudCB0cmVlLlxuICAgIGlmIChjdXJyZW50TmVpZ2hib3IgPT0gcGFyZW50T2ZOb2RlKVxuICAgIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciBjaGlsZFN0YXJ0QW5nbGUgPVxuICAgICAgICAgICAgKHN0YXJ0QW5nbGUgKyBicmFuY2hDb3VudCAqIHN0ZXBBbmdsZSkgJSAzNjA7XG4gICAgdmFyIGNoaWxkRW5kQW5nbGUgPSAoY2hpbGRTdGFydEFuZ2xlICsgc3RlcEFuZ2xlKSAlIDM2MDtcblxuICAgIENvU0VMYXlvdXQuYnJhbmNoUmFkaWFsTGF5b3V0KGN1cnJlbnROZWlnaGJvcixcbiAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICBjaGlsZFN0YXJ0QW5nbGUsIGNoaWxkRW5kQW5nbGUsXG4gICAgICAgICAgICBkaXN0YW5jZSArIHJhZGlhbFNlcGFyYXRpb24sIHJhZGlhbFNlcGFyYXRpb24pO1xuXG4gICAgYnJhbmNoQ291bnQrKztcbiAgfVxufTtcblxuQ29TRUxheW91dC5tYXhEaWFnb25hbEluVHJlZSA9IGZ1bmN0aW9uICh0cmVlKSB7XG4gIHZhciBtYXhEaWFnb25hbCA9IEludGVnZXIuTUlOX1ZBTFVFO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZS5sZW5ndGg7IGkrKylcbiAge1xuICAgIHZhciBub2RlID0gdHJlZVtpXTtcbiAgICB2YXIgZGlhZ29uYWwgPSBub2RlLmdldERpYWdvbmFsKCk7XG5cbiAgICBpZiAoZGlhZ29uYWwgPiBtYXhEaWFnb25hbClcbiAgICB7XG4gICAgICBtYXhEaWFnb25hbCA9IGRpYWdvbmFsO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtYXhEaWFnb25hbDtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25SYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gZm9ybXVsYSBpcyAyIHggKGxldmVsICsgMSkgeCBpZGVhbEVkZ2VMZW5ndGhcbiAgcmV0dXJuICgyICogKHRoaXMubGV2ZWwgKyAxKSAqIHRoaXMuaWRlYWxFZGdlTGVuZ3RoKTtcbn07XG5cbi8vIFRpbGluZyBtZXRob2RzXG5cbi8vIEdyb3VwIHplcm8gZGVncmVlIG1lbWJlcnMgd2hvc2UgcGFyZW50cyBhcmUgbm90IHRvIGJlIHRpbGVkLCBjcmVhdGUgZHVtbXkgcGFyZW50cyB3aGVyZSBuZWVkZWQgYW5kIGZpbGwgbWVtYmVyR3JvdXBzIGJ5IHRoZWlyIGR1bW1wIHBhcmVudCBpZCdzXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5ncm91cFplcm9EZWdyZWVNZW1iZXJzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vIGFycmF5IG9mIFtwYXJlbnRfaWQgeCBvbmVEZWdyZWVOb2RlX2lkXVxuICB2YXIgdGVtcE1lbWJlckdyb3VwcyA9IHt9OyAvLyBBIHRlbXBvcmFyeSBtYXAgb2YgcGFyZW50IG5vZGUgYW5kIGl0cyB6ZXJvIGRlZ3JlZSBtZW1iZXJzXG4gIHRoaXMubWVtYmVyR3JvdXBzID0ge307IC8vIEEgbWFwIG9mIGR1bW15IHBhcmVudCBub2RlIGFuZCBpdHMgemVybyBkZWdyZWUgbWVtYmVycyB3aG9zZSBwYXJlbnRzIGFyZSBub3QgdG8gYmUgdGlsZWRcbiAgdGhpcy5pZFRvRHVtbXlOb2RlID0ge307IC8vIEEgbWFwIG9mIGlkIHRvIGR1bW15IG5vZGUgXG4gIFxuICB2YXIgemVyb0RlZ3JlZSA9IFtdOyAvLyBMaXN0IG9mIHplcm8gZGVncmVlIG5vZGVzIHdob3NlIHBhcmVudHMgYXJlIG5vdCB0byBiZSB0aWxlZFxuICB2YXIgYWxsTm9kZXMgPSB0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxOb2RlcygpO1xuXG4gIC8vIEZpbGwgemVybyBkZWdyZWUgbGlzdFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG5vZGUgPSBhbGxOb2Rlc1tpXTtcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5nZXRQYXJlbnQoKTtcbiAgICAvLyBJZiBhIG5vZGUgaGFzIHplcm8gZGVncmVlIGFuZCBpdHMgcGFyZW50IGlzIG5vdCB0byBiZSB0aWxlZCBpZiBleGlzdHMgYWRkIHRoYXQgbm9kZSB0byB6ZXJvRGVncmVzIGxpc3RcbiAgICBpZiAodGhpcy5nZXROb2RlRGVncmVlV2l0aENoaWxkcmVuKG5vZGUpID09PSAwICYmICggcGFyZW50LmlkID09IHVuZGVmaW5lZCB8fCAhdGhpcy5nZXRUb0JlVGlsZWQocGFyZW50KSApICkge1xuICAgICAgemVyb0RlZ3JlZS5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIENyZWF0ZSBhIG1hcCBvZiBwYXJlbnQgbm9kZSBhbmQgaXRzIHplcm8gZGVncmVlIG1lbWJlcnNcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB6ZXJvRGVncmVlLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgdmFyIG5vZGUgPSB6ZXJvRGVncmVlW2ldOyAvLyBaZXJvIGRlZ3JlZSBub2RlIGl0c2VsZlxuICAgIHZhciBwX2lkID0gbm9kZS5nZXRQYXJlbnQoKS5pZDsgLy8gUGFyZW50IGlkXG5cbiAgICBpZiAodHlwZW9mIHRlbXBNZW1iZXJHcm91cHNbcF9pZF0gPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdID0gW107XG5cbiAgICB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXS5jb25jYXQobm9kZSk7IC8vIFB1c2ggbm9kZSB0byB0aGUgbGlzdCBiZWxvbmdzIHRvIGl0cyBwYXJlbnQgaW4gdGVtcE1lbWJlckdyb3Vwc1xuICB9XG5cbiAgLy8gSWYgdGhlcmUgYXJlIGF0IGxlYXN0IHR3byBub2RlcyBhdCBhIGxldmVsLCBjcmVhdGUgYSBkdW1teSBjb21wb3VuZCBmb3IgdGhlbVxuICBPYmplY3Qua2V5cyh0ZW1wTWVtYmVyR3JvdXBzKS5mb3JFYWNoKGZ1bmN0aW9uKHBfaWQpIHtcbiAgICBpZiAodGVtcE1lbWJlckdyb3Vwc1twX2lkXS5sZW5ndGggPiAxKSB7XG4gICAgICB2YXIgZHVtbXlDb21wb3VuZElkID0gXCJEdW1teUNvbXBvdW5kX1wiICsgcF9pZDsgLy8gVGhlIGlkIG9mIGR1bW15IGNvbXBvdW5kIHdoaWNoIHdpbGwgYmUgY3JlYXRlZCBzb29uXG4gICAgICBzZWxmLm1lbWJlckdyb3Vwc1tkdW1teUNvbXBvdW5kSWRdID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXTsgLy8gQWRkIGR1bW15IGNvbXBvdW5kIHRvIG1lbWJlckdyb3Vwc1xuXG4gICAgICB2YXIgcGFyZW50ID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXVswXS5nZXRQYXJlbnQoKTsgLy8gVGhlIHBhcmVudCBvZiB6ZXJvIGRlZ3JlZSBub2RlcyB3aWxsIGJlIHRoZSBwYXJlbnQgb2YgbmV3IGR1bW15IGNvbXBvdW5kXG5cbiAgICAgIC8vIENyZWF0ZSBhIGR1bW15IGNvbXBvdW5kIHdpdGggY2FsY3VsYXRlZCBpZFxuICAgICAgdmFyIGR1bW15Q29tcG91bmQgPSBuZXcgQ29TRU5vZGUoc2VsZi5ncmFwaE1hbmFnZXIpO1xuICAgICAgZHVtbXlDb21wb3VuZC5pZCA9IGR1bW15Q29tcG91bmRJZDtcbiAgICAgIGR1bW15Q29tcG91bmQucGFkZGluZ0xlZnQgPSBwYXJlbnQucGFkZGluZ0xlZnQgfHwgMDtcbiAgICAgIGR1bW15Q29tcG91bmQucGFkZGluZ1JpZ2h0ID0gcGFyZW50LnBhZGRpbmdSaWdodCB8fCAwO1xuICAgICAgZHVtbXlDb21wb3VuZC5wYWRkaW5nQm90dG9tID0gcGFyZW50LnBhZGRpbmdCb3R0b20gfHwgMDtcbiAgICAgIGR1bW15Q29tcG91bmQucGFkZGluZ1RvcCA9IHBhcmVudC5wYWRkaW5nVG9wIHx8IDA7XG4gICAgICBcbiAgICAgIHNlbGYuaWRUb0R1bW15Tm9kZVtkdW1teUNvbXBvdW5kSWRdID0gZHVtbXlDb21wb3VuZDtcbiAgICAgIFxuICAgICAgdmFyIGR1bW15UGFyZW50R3JhcGggPSBzZWxmLmdldEdyYXBoTWFuYWdlcigpLmFkZChzZWxmLm5ld0dyYXBoKCksIGR1bW15Q29tcG91bmQpO1xuICAgICAgdmFyIHBhcmVudEdyYXBoID0gcGFyZW50LmdldENoaWxkKCk7XG5cbiAgICAgIC8vIEFkZCBkdW1teSBjb21wb3VuZCB0byBwYXJlbnQgdGhlIGdyYXBoXG4gICAgICBwYXJlbnRHcmFwaC5hZGQoZHVtbXlDb21wb3VuZCk7XG5cbiAgICAgIC8vIEZvciBlYWNoIHplcm8gZGVncmVlIG5vZGUgaW4gdGhpcyBsZXZlbCByZW1vdmUgaXQgZnJvbSBpdHMgcGFyZW50IGdyYXBoIGFuZCBhZGQgaXQgdG8gdGhlIGdyYXBoIG9mIGR1bW15IHBhcmVudFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBub2RlID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXVtpXTtcbiAgICAgICAgXG4gICAgICAgIHBhcmVudEdyYXBoLnJlbW92ZShub2RlKTtcbiAgICAgICAgZHVtbXlQYXJlbnRHcmFwaC5hZGQobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmNsZWFyQ29tcG91bmRzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgY2hpbGRHcmFwaE1hcCA9IHt9O1xuICB2YXIgaWRUb05vZGUgPSB7fTtcblxuICAvLyBHZXQgY29tcG91bmQgb3JkZXJpbmcgYnkgZmluZGluZyB0aGUgaW5uZXIgb25lIGZpcnN0XG4gIHRoaXMucGVyZm9ybURGU09uQ29tcG91bmRzKCk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvbXBvdW5kT3JkZXIubGVuZ3RoOyBpKyspIHtcbiAgICBcbiAgICBpZFRvTm9kZVt0aGlzLmNvbXBvdW5kT3JkZXJbaV0uaWRdID0gdGhpcy5jb21wb3VuZE9yZGVyW2ldO1xuICAgIGNoaWxkR3JhcGhNYXBbdGhpcy5jb21wb3VuZE9yZGVyW2ldLmlkXSA9IFtdLmNvbmNhdCh0aGlzLmNvbXBvdW5kT3JkZXJbaV0uZ2V0Q2hpbGQoKS5nZXROb2RlcygpKTtcblxuICAgIC8vIFJlbW92ZSBjaGlsZHJlbiBvZiBjb21wb3VuZHNcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUodGhpcy5jb21wb3VuZE9yZGVyW2ldLmdldENoaWxkKCkpO1xuICAgIHRoaXMuY29tcG91bmRPcmRlcltpXS5jaGlsZCA9IG51bGw7XG4gIH1cbiAgXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLnJlc2V0QWxsTm9kZXMoKTtcbiAgXG4gIC8vIFRpbGUgdGhlIHJlbW92ZWQgY2hpbGRyZW5cbiAgdGhpcy50aWxlQ29tcG91bmRNZW1iZXJzKGNoaWxkR3JhcGhNYXAsIGlkVG9Ob2RlKTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmNsZWFyWmVyb0RlZ3JlZU1lbWJlcnMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHRpbGVkWmVyb0RlZ3JlZVBhY2sgPSB0aGlzLnRpbGVkWmVyb0RlZ3JlZVBhY2sgPSBbXTtcblxuICBPYmplY3Qua2V5cyh0aGlzLm1lbWJlckdyb3VwcykuZm9yRWFjaChmdW5jdGlvbihpZCkge1xuICAgIHZhciBjb21wb3VuZE5vZGUgPSBzZWxmLmlkVG9EdW1teU5vZGVbaWRdOyAvLyBHZXQgdGhlIGR1bW15IGNvbXBvdW5kXG5cbiAgICB0aWxlZFplcm9EZWdyZWVQYWNrW2lkXSA9IHNlbGYudGlsZU5vZGVzKHNlbGYubWVtYmVyR3JvdXBzW2lkXSwgY29tcG91bmROb2RlLnBhZGRpbmdMZWZ0ICsgY29tcG91bmROb2RlLnBhZGRpbmdSaWdodCk7XG5cbiAgICAvLyBTZXQgdGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgdGhlIGR1bW15IGNvbXBvdW5kIGFzIGNhbGN1bGF0ZWRcbiAgICBjb21wb3VuZE5vZGUucmVjdC53aWR0aCA9IHRpbGVkWmVyb0RlZ3JlZVBhY2tbaWRdLndpZHRoO1xuICAgIGNvbXBvdW5kTm9kZS5yZWN0LmhlaWdodCA9IHRpbGVkWmVyb0RlZ3JlZVBhY2tbaWRdLmhlaWdodDtcbiAgfSk7XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5yZXBvcHVsYXRlQ29tcG91bmRzID0gZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBpID0gdGhpcy5jb21wb3VuZE9yZGVyLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxDb21wb3VuZE5vZGUgPSB0aGlzLmNvbXBvdW5kT3JkZXJbaV07XG4gICAgdmFyIGlkID0gbENvbXBvdW5kTm9kZS5pZDtcbiAgICB2YXIgaG9yaXpvbnRhbE1hcmdpbiA9IGxDb21wb3VuZE5vZGUucGFkZGluZ0xlZnQ7XG4gICAgdmFyIHZlcnRpY2FsTWFyZ2luID0gbENvbXBvdW5kTm9kZS5wYWRkaW5nVG9wO1xuXG4gICAgdGhpcy5hZGp1c3RMb2NhdGlvbnModGhpcy50aWxlZE1lbWJlclBhY2tbaWRdLCBsQ29tcG91bmROb2RlLnJlY3QueCwgbENvbXBvdW5kTm9kZS5yZWN0LnksIGhvcml6b250YWxNYXJnaW4sIHZlcnRpY2FsTWFyZ2luKTtcbiAgfVxufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUucmVwb3B1bGF0ZVplcm9EZWdyZWVNZW1iZXJzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB0aWxlZFBhY2sgPSB0aGlzLnRpbGVkWmVyb0RlZ3JlZVBhY2s7XG4gIFxuICBPYmplY3Qua2V5cyh0aWxlZFBhY2spLmZvckVhY2goZnVuY3Rpb24oaWQpIHtcbiAgICB2YXIgY29tcG91bmROb2RlID0gc2VsZi5pZFRvRHVtbXlOb2RlW2lkXTsgLy8gR2V0IHRoZSBkdW1teSBjb21wb3VuZCBieSBpdHMgaWRcbiAgICB2YXIgaG9yaXpvbnRhbE1hcmdpbiA9IGNvbXBvdW5kTm9kZS5wYWRkaW5nTGVmdDtcbiAgICB2YXIgdmVydGljYWxNYXJnaW4gPSBjb21wb3VuZE5vZGUucGFkZGluZ1RvcDtcblxuICAgIC8vIEFkanVzdCB0aGUgcG9zaXRpb25zIG9mIG5vZGVzIHdydCBpdHMgY29tcG91bmRcbiAgICBzZWxmLmFkanVzdExvY2F0aW9ucyh0aWxlZFBhY2tbaWRdLCBjb21wb3VuZE5vZGUucmVjdC54LCBjb21wb3VuZE5vZGUucmVjdC55LCBob3Jpem9udGFsTWFyZ2luLCB2ZXJ0aWNhbE1hcmdpbik7XG4gIH0pO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuZ2V0VG9CZVRpbGVkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdmFyIGlkID0gbm9kZS5pZDtcbiAgLy9maXJzdGx5IGNoZWNrIHRoZSBwcmV2aW91cyByZXN1bHRzXG4gIGlmICh0aGlzLnRvQmVUaWxlZFtpZF0gIT0gbnVsbCkge1xuICAgIHJldHVybiB0aGlzLnRvQmVUaWxlZFtpZF07XG4gIH1cblxuICAvL29ubHkgY29tcG91bmQgbm9kZXMgYXJlIHRvIGJlIHRpbGVkXG4gIHZhciBjaGlsZEdyYXBoID0gbm9kZS5nZXRDaGlsZCgpO1xuICBpZiAoY2hpbGRHcmFwaCA9PSBudWxsKSB7XG4gICAgdGhpcy50b0JlVGlsZWRbaWRdID0gZmFsc2U7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdmFyIGNoaWxkcmVuID0gY2hpbGRHcmFwaC5nZXROb2RlcygpOyAvLyBHZXQgdGhlIGNoaWxkcmVuIG5vZGVzXG5cbiAgLy9hIGNvbXBvdW5kIG5vZGUgaXMgbm90IHRvIGJlIHRpbGVkIGlmIGFsbCBvZiBpdHMgY29tcG91bmQgY2hpbGRyZW4gYXJlIG5vdCB0byBiZSB0aWxlZFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHRoZUNoaWxkID0gY2hpbGRyZW5baV07XG5cbiAgICBpZiAodGhpcy5nZXROb2RlRGVncmVlKHRoZUNoaWxkKSA+IDApIHtcbiAgICAgIHRoaXMudG9CZVRpbGVkW2lkXSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vcGFzcyB0aGUgY2hpbGRyZW4gbm90IGhhdmluZyB0aGUgY29tcG91bmQgc3RydWN0dXJlXG4gICAgaWYgKHRoZUNoaWxkLmdldENoaWxkKCkgPT0gbnVsbCkge1xuICAgICAgdGhpcy50b0JlVGlsZWRbdGhlQ2hpbGQuaWRdID0gZmFsc2U7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZ2V0VG9CZVRpbGVkKHRoZUNoaWxkKSkge1xuICAgICAgdGhpcy50b0JlVGlsZWRbaWRdID0gZmFsc2U7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHRoaXMudG9CZVRpbGVkW2lkXSA9IHRydWU7XG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gR2V0IGRlZ3JlZSBvZiBhIG5vZGUgZGVwZW5kaW5nIG9mIGl0cyBlZGdlcyBhbmQgaW5kZXBlbmRlbnQgb2YgaXRzIGNoaWxkcmVuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXROb2RlRGVncmVlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdmFyIGlkID0gbm9kZS5pZDtcbiAgdmFyIGVkZ2VzID0gbm9kZS5nZXRFZGdlcygpO1xuICB2YXIgZGVncmVlID0gMDtcbiAgXG4gIC8vIEZvciB0aGUgZWRnZXMgY29ubmVjdGVkXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xuICAgIGlmIChlZGdlLmdldFNvdXJjZSgpLmlkICE9PSBlZGdlLmdldFRhcmdldCgpLmlkKSB7XG4gICAgICBkZWdyZWUgPSBkZWdyZWUgKyAxO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVncmVlO1xufTtcblxuLy8gR2V0IGRlZ3JlZSBvZiBhIG5vZGUgd2l0aCBpdHMgY2hpbGRyZW5cbkNvU0VMYXlvdXQucHJvdG90eXBlLmdldE5vZGVEZWdyZWVXaXRoQ2hpbGRyZW4gPSBmdW5jdGlvbiAobm9kZSkge1xuICB2YXIgZGVncmVlID0gdGhpcy5nZXROb2RlRGVncmVlKG5vZGUpO1xuICBpZiAobm9kZS5nZXRDaGlsZCgpID09IG51bGwpIHtcbiAgICByZXR1cm4gZGVncmVlO1xuICB9XG4gIHZhciBjaGlsZHJlbiA9IG5vZGUuZ2V0Q2hpbGQoKS5nZXROb2RlcygpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XG4gICAgZGVncmVlICs9IHRoaXMuZ2V0Tm9kZURlZ3JlZVdpdGhDaGlsZHJlbihjaGlsZCk7XG4gIH1cbiAgcmV0dXJuIGRlZ3JlZTtcbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLnBlcmZvcm1ERlNPbkNvbXBvdW5kcyA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5jb21wb3VuZE9yZGVyID0gW107XG4gIHRoaXMuZmlsbENvbXBleE9yZGVyQnlERlModGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpLmdldE5vZGVzKCkpO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUuZmlsbENvbXBleE9yZGVyQnlERlMgPSBmdW5jdGlvbiAoY2hpbGRyZW4pIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xuICAgIGlmIChjaGlsZC5nZXRDaGlsZCgpICE9IG51bGwpIHtcbiAgICAgIHRoaXMuZmlsbENvbXBleE9yZGVyQnlERlMoY2hpbGQuZ2V0Q2hpbGQoKS5nZXROb2RlcygpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZ2V0VG9CZVRpbGVkKGNoaWxkKSkge1xuICAgICAgdGhpcy5jb21wb3VuZE9yZGVyLnB1c2goY2hpbGQpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4qIFRoaXMgbWV0aG9kIHBsYWNlcyBlYWNoIHplcm8gZGVncmVlIG1lbWJlciB3cnQgZ2l2ZW4gKHgseSkgY29vcmRpbmF0ZXMgKHRvcCBsZWZ0KS5cbiovXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5hZGp1c3RMb2NhdGlvbnMgPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uLCB4LCB5LCBjb21wb3VuZEhvcml6b250YWxNYXJnaW4sIGNvbXBvdW5kVmVydGljYWxNYXJnaW4pIHtcbiAgeCArPSBjb21wb3VuZEhvcml6b250YWxNYXJnaW47XG4gIHkgKz0gY29tcG91bmRWZXJ0aWNhbE1hcmdpbjtcblxuICB2YXIgbGVmdCA9IHg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcmdhbml6YXRpb24ucm93cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciByb3cgPSBvcmdhbml6YXRpb24ucm93c1tpXTtcbiAgICB4ID0gbGVmdDtcbiAgICB2YXIgbWF4SGVpZ2h0ID0gMDtcblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgcm93Lmxlbmd0aDsgaisrKSB7XG4gICAgICB2YXIgbG5vZGUgPSByb3dbal07XG5cbiAgICAgIGxub2RlLnJlY3QueCA9IHg7Ly8gKyBsbm9kZS5yZWN0LndpZHRoIC8gMjtcbiAgICAgIGxub2RlLnJlY3QueSA9IHk7Ly8gKyBsbm9kZS5yZWN0LmhlaWdodCAvIDI7XG5cbiAgICAgIHggKz0gbG5vZGUucmVjdC53aWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZztcblxuICAgICAgaWYgKGxub2RlLnJlY3QuaGVpZ2h0ID4gbWF4SGVpZ2h0KVxuICAgICAgICBtYXhIZWlnaHQgPSBsbm9kZS5yZWN0LmhlaWdodDtcbiAgICB9XG5cbiAgICB5ICs9IG1heEhlaWdodCArIG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XG4gIH1cbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLnRpbGVDb21wb3VuZE1lbWJlcnMgPSBmdW5jdGlvbiAoY2hpbGRHcmFwaE1hcCwgaWRUb05vZGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnRpbGVkTWVtYmVyUGFjayA9IFtdO1xuXG4gIE9iamVjdC5rZXlzKGNoaWxkR3JhcGhNYXApLmZvckVhY2goZnVuY3Rpb24oaWQpIHtcbiAgICAvLyBHZXQgdGhlIGNvbXBvdW5kIG5vZGVcbiAgICB2YXIgY29tcG91bmROb2RlID0gaWRUb05vZGVbaWRdO1xuXG4gICAgc2VsZi50aWxlZE1lbWJlclBhY2tbaWRdID0gc2VsZi50aWxlTm9kZXMoY2hpbGRHcmFwaE1hcFtpZF0sIGNvbXBvdW5kTm9kZS5wYWRkaW5nTGVmdCArIGNvbXBvdW5kTm9kZS5wYWRkaW5nUmlnaHQpO1xuXG4gICAgY29tcG91bmROb2RlLnJlY3Qud2lkdGggPSBzZWxmLnRpbGVkTWVtYmVyUGFja1tpZF0ud2lkdGggKyAyMDtcbiAgICBjb21wb3VuZE5vZGUucmVjdC5oZWlnaHQgPSBzZWxmLnRpbGVkTWVtYmVyUGFja1tpZF0uaGVpZ2h0ICsgMjA7XG4gIH0pO1xufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUudGlsZU5vZGVzID0gZnVuY3Rpb24gKG5vZGVzLCBtaW5XaWR0aCkge1xuICB2YXIgdmVydGljYWxQYWRkaW5nID0gQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19WRVJUSUNBTDtcbiAgdmFyIGhvcml6b250YWxQYWRkaW5nID0gQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19IT1JJWk9OVEFMO1xuICB2YXIgb3JnYW5pemF0aW9uID0ge1xuICAgIHJvd3M6IFtdLFxuICAgIHJvd1dpZHRoOiBbXSxcbiAgICByb3dIZWlnaHQ6IFtdLFxuICAgIHdpZHRoOiAyMCxcbiAgICBoZWlnaHQ6IDIwLFxuICAgIHZlcnRpY2FsUGFkZGluZzogdmVydGljYWxQYWRkaW5nLFxuICAgIGhvcml6b250YWxQYWRkaW5nOiBob3Jpem9udGFsUGFkZGluZ1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG5vZGVzIGluIGFzY2VuZGluZyBvcmRlciBvZiB0aGVpciBhcmVhc1xuICBub2Rlcy5zb3J0KGZ1bmN0aW9uIChuMSwgbjIpIHtcbiAgICBpZiAobjEucmVjdC53aWR0aCAqIG4xLnJlY3QuaGVpZ2h0ID4gbjIucmVjdC53aWR0aCAqIG4yLnJlY3QuaGVpZ2h0KVxuICAgICAgcmV0dXJuIC0xO1xuICAgIGlmIChuMS5yZWN0LndpZHRoICogbjEucmVjdC5oZWlnaHQgPCBuMi5yZWN0LndpZHRoICogbjIucmVjdC5oZWlnaHQpXG4gICAgICByZXR1cm4gMTtcbiAgICByZXR1cm4gMDtcbiAgfSk7XG5cbiAgLy8gQ3JlYXRlIHRoZSBvcmdhbml6YXRpb24gLT4gdGlsZSBtZW1iZXJzXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgbE5vZGUgPSBub2Rlc1tpXTtcbiAgICBcbiAgICBpZiAob3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoID09IDApIHtcbiAgICAgIHRoaXMuaW5zZXJ0Tm9kZVRvUm93KG9yZ2FuaXphdGlvbiwgbE5vZGUsIDAsIG1pbldpZHRoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5jYW5BZGRIb3Jpem9udGFsKG9yZ2FuaXphdGlvbiwgbE5vZGUucmVjdC53aWR0aCwgbE5vZGUucmVjdC5oZWlnaHQpKSB7XG4gICAgICB0aGlzLmluc2VydE5vZGVUb1Jvdyhvcmdhbml6YXRpb24sIGxOb2RlLCB0aGlzLmdldFNob3J0ZXN0Um93SW5kZXgob3JnYW5pemF0aW9uKSwgbWluV2lkdGgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuaW5zZXJ0Tm9kZVRvUm93KG9yZ2FuaXphdGlvbiwgbE5vZGUsIG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aCwgbWluV2lkdGgpO1xuICAgIH1cblxuICAgIHRoaXMuc2hpZnRUb0xhc3RSb3cob3JnYW5pemF0aW9uKTtcbiAgfVxuXG4gIHJldHVybiBvcmdhbml6YXRpb247XG59O1xuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5pbnNlcnROb2RlVG9Sb3cgPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uLCBub2RlLCByb3dJbmRleCwgbWluV2lkdGgpIHtcbiAgdmFyIG1pbkNvbXBvdW5kU2l6ZSA9IG1pbldpZHRoO1xuXG4gIC8vIEFkZCBuZXcgcm93IGlmIG5lZWRlZFxuICBpZiAocm93SW5kZXggPT0gb3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoKSB7XG4gICAgdmFyIHNlY29uZERpbWVuc2lvbiA9IFtdO1xuXG4gICAgb3JnYW5pemF0aW9uLnJvd3MucHVzaChzZWNvbmREaW1lbnNpb24pO1xuICAgIG9yZ2FuaXphdGlvbi5yb3dXaWR0aC5wdXNoKG1pbkNvbXBvdW5kU2l6ZSk7XG4gICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodC5wdXNoKDApO1xuICB9XG5cbiAgLy8gVXBkYXRlIHJvdyB3aWR0aFxuICB2YXIgdyA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtyb3dJbmRleF0gKyBub2RlLnJlY3Qud2lkdGg7XG5cbiAgaWYgKG9yZ2FuaXphdGlvbi5yb3dzW3Jvd0luZGV4XS5sZW5ndGggPiAwKSB7XG4gICAgdyArPSBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmc7XG4gIH1cblxuICBvcmdhbml6YXRpb24ucm93V2lkdGhbcm93SW5kZXhdID0gdztcbiAgLy8gVXBkYXRlIGNvbXBvdW5kIHdpZHRoXG4gIGlmIChvcmdhbml6YXRpb24ud2lkdGggPCB3KSB7XG4gICAgb3JnYW5pemF0aW9uLndpZHRoID0gdztcbiAgfVxuXG4gIC8vIFVwZGF0ZSBoZWlnaHRcbiAgdmFyIGggPSBub2RlLnJlY3QuaGVpZ2h0O1xuICBpZiAocm93SW5kZXggPiAwKVxuICAgIGggKz0gb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcblxuICB2YXIgZXh0cmFIZWlnaHQgPSAwO1xuICBpZiAoaCA+IG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbcm93SW5kZXhdKSB7XG4gICAgZXh0cmFIZWlnaHQgPSBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XTtcbiAgICBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XSA9IGg7XG4gICAgZXh0cmFIZWlnaHQgPSBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XSAtIGV4dHJhSGVpZ2h0O1xuICB9XG5cbiAgb3JnYW5pemF0aW9uLmhlaWdodCArPSBleHRyYUhlaWdodDtcblxuICAvLyBJbnNlcnQgbm9kZVxuICBvcmdhbml6YXRpb24ucm93c1tyb3dJbmRleF0ucHVzaChub2RlKTtcbn07XG5cbi8vU2NhbnMgdGhlIHJvd3Mgb2YgYW4gb3JnYW5pemF0aW9uIGFuZCByZXR1cm5zIHRoZSBvbmUgd2l0aCB0aGUgbWluIHdpZHRoXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRTaG9ydGVzdFJvd0luZGV4ID0gZnVuY3Rpb24gKG9yZ2FuaXphdGlvbikge1xuICB2YXIgciA9IC0xO1xuICB2YXIgbWluID0gTnVtYmVyLk1BWF9WQUxVRTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXSA8IG1pbikge1xuICAgICAgciA9IGk7XG4gICAgICBtaW4gPSBvcmdhbml6YXRpb24ucm93V2lkdGhbaV07XG4gICAgfVxuICB9XG4gIHJldHVybiByO1xufTtcblxuLy9TY2FucyB0aGUgcm93cyBvZiBhbiBvcmdhbml6YXRpb24gYW5kIHJldHVybnMgdGhlIG9uZSB3aXRoIHRoZSBtYXggd2lkdGhcbkNvU0VMYXlvdXQucHJvdG90eXBlLmdldExvbmdlc3RSb3dJbmRleCA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24pIHtcbiAgdmFyIHIgPSAtMTtcbiAgdmFyIG1heCA9IE51bWJlci5NSU5fVkFMVUU7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcmdhbml6YXRpb24ucm93cy5sZW5ndGg7IGkrKykge1xuXG4gICAgaWYgKG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXSA+IG1heCkge1xuICAgICAgciA9IGk7XG4gICAgICBtYXggPSBvcmdhbml6YXRpb24ucm93V2lkdGhbaV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHI7XG59O1xuXG4vKipcbiogVGhpcyBtZXRob2QgY2hlY2tzIHdoZXRoZXIgYWRkaW5nIGV4dHJhIHdpZHRoIHRvIHRoZSBvcmdhbml6YXRpb24gdmlvbGF0ZXNcbiogdGhlIGFzcGVjdCByYXRpbygxKSBvciBub3QuXG4qL1xuQ29TRUxheW91dC5wcm90b3R5cGUuY2FuQWRkSG9yaXpvbnRhbCA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24sIGV4dHJhV2lkdGgsIGV4dHJhSGVpZ2h0KSB7XG5cbiAgdmFyIHNyaSA9IHRoaXMuZ2V0U2hvcnRlc3RSb3dJbmRleChvcmdhbml6YXRpb24pO1xuXG4gIGlmIChzcmkgPCAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICB2YXIgbWluID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW3NyaV07XG5cbiAgaWYgKG1pbiArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZyArIGV4dHJhV2lkdGggPD0gb3JnYW5pemF0aW9uLndpZHRoKVxuICAgIHJldHVybiB0cnVlO1xuXG4gIHZhciBoRGlmZiA9IDA7XG5cbiAgLy8gQWRkaW5nIHRvIGFuIGV4aXN0aW5nIHJvd1xuICBpZiAob3JnYW5pemF0aW9uLnJvd0hlaWdodFtzcmldIDwgZXh0cmFIZWlnaHQpIHtcbiAgICBpZiAoc3JpID4gMClcbiAgICAgIGhEaWZmID0gZXh0cmFIZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nIC0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtzcmldO1xuICB9XG5cbiAgdmFyIGFkZF90b19yb3dfcmF0aW87XG4gIGlmIChvcmdhbml6YXRpb24ud2lkdGggLSBtaW4gPj0gZXh0cmFXaWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZykge1xuICAgIGFkZF90b19yb3dfcmF0aW8gPSAob3JnYW5pemF0aW9uLmhlaWdodCArIGhEaWZmKSAvIChtaW4gKyBleHRyYVdpZHRoICsgb3JnYW5pemF0aW9uLmhvcml6b250YWxQYWRkaW5nKTtcbiAgfSBlbHNlIHtcbiAgICBhZGRfdG9fcm93X3JhdGlvID0gKG9yZ2FuaXphdGlvbi5oZWlnaHQgKyBoRGlmZikgLyBvcmdhbml6YXRpb24ud2lkdGg7XG4gIH1cblxuICAvLyBBZGRpbmcgYSBuZXcgcm93IGZvciB0aGlzIG5vZGVcbiAgaERpZmYgPSBleHRyYUhlaWdodCArIG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XG4gIHZhciBhZGRfbmV3X3Jvd19yYXRpbztcbiAgaWYgKG9yZ2FuaXphdGlvbi53aWR0aCA8IGV4dHJhV2lkdGgpIHtcbiAgICBhZGRfbmV3X3Jvd19yYXRpbyA9IChvcmdhbml6YXRpb24uaGVpZ2h0ICsgaERpZmYpIC8gZXh0cmFXaWR0aDtcbiAgfSBlbHNlIHtcbiAgICBhZGRfbmV3X3Jvd19yYXRpbyA9IChvcmdhbml6YXRpb24uaGVpZ2h0ICsgaERpZmYpIC8gb3JnYW5pemF0aW9uLndpZHRoO1xuICB9XG5cbiAgaWYgKGFkZF9uZXdfcm93X3JhdGlvIDwgMSlcbiAgICBhZGRfbmV3X3Jvd19yYXRpbyA9IDEgLyBhZGRfbmV3X3Jvd19yYXRpbztcblxuICBpZiAoYWRkX3RvX3Jvd19yYXRpbyA8IDEpXG4gICAgYWRkX3RvX3Jvd19yYXRpbyA9IDEgLyBhZGRfdG9fcm93X3JhdGlvO1xuXG4gIHJldHVybiBhZGRfdG9fcm93X3JhdGlvIDwgYWRkX25ld19yb3dfcmF0aW87XG59O1xuXG4vL0lmIG1vdmluZyB0aGUgbGFzdCBub2RlIGZyb20gdGhlIGxvbmdlc3Qgcm93IGFuZCBhZGRpbmcgaXQgdG8gdGhlIGxhc3Rcbi8vcm93IG1ha2VzIHRoZSBib3VuZGluZyBib3ggc21hbGxlciwgZG8gaXQuXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5zaGlmdFRvTGFzdFJvdyA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24pIHtcbiAgdmFyIGxvbmdlc3QgPSB0aGlzLmdldExvbmdlc3RSb3dJbmRleChvcmdhbml6YXRpb24pO1xuICB2YXIgbGFzdCA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aC5sZW5ndGggLSAxO1xuICB2YXIgcm93ID0gb3JnYW5pemF0aW9uLnJvd3NbbG9uZ2VzdF07XG4gIHZhciBub2RlID0gcm93W3Jvdy5sZW5ndGggLSAxXTtcblxuICB2YXIgZGlmZiA9IG5vZGUud2lkdGggKyBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmc7XG5cbiAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgZW5vdWdoIHNwYWNlIG9uIHRoZSBsYXN0IHJvd1xuICBpZiAob3JnYW5pemF0aW9uLndpZHRoIC0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xhc3RdID4gZGlmZiAmJiBsb25nZXN0ICE9IGxhc3QpIHtcbiAgICAvLyBSZW1vdmUgdGhlIGxhc3QgZWxlbWVudCBvZiB0aGUgbG9uZ2VzdCByb3dcbiAgICByb3cuc3BsaWNlKC0xLCAxKTtcblxuICAgIC8vIFB1c2ggaXQgdG8gdGhlIGxhc3Qgcm93XG4gICAgb3JnYW5pemF0aW9uLnJvd3NbbGFzdF0ucHVzaChub2RlKTtcblxuICAgIG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsb25nZXN0XSA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtsb25nZXN0XSAtIGRpZmY7XG4gICAgb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xhc3RdID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xhc3RdICsgZGlmZjtcbiAgICBvcmdhbml6YXRpb24ud2lkdGggPSBvcmdhbml6YXRpb24ucm93V2lkdGhbaW5zdGFuY2UuZ2V0TG9uZ2VzdFJvd0luZGV4KG9yZ2FuaXphdGlvbildO1xuXG4gICAgLy8gVXBkYXRlIGhlaWdodHMgb2YgdGhlIG9yZ2FuaXphdGlvblxuICAgIHZhciBtYXhIZWlnaHQgPSBOdW1iZXIuTUlOX1ZBTFVFO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm93Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocm93W2ldLmhlaWdodCA+IG1heEhlaWdodClcbiAgICAgICAgbWF4SGVpZ2h0ID0gcm93W2ldLmhlaWdodDtcbiAgICB9XG4gICAgaWYgKGxvbmdlc3QgPiAwKVxuICAgICAgbWF4SGVpZ2h0ICs9IG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XG5cbiAgICB2YXIgcHJldlRvdGFsID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSArIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbGFzdF07XG5cbiAgICBvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xvbmdlc3RdID0gbWF4SGVpZ2h0O1xuICAgIGlmIChvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xhc3RdIDwgbm9kZS5oZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nKVxuICAgICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsYXN0XSA9IG5vZGUuaGVpZ2h0ICsgb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcblxuICAgIHZhciBmaW5hbFRvdGFsID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSArIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbGFzdF07XG4gICAgb3JnYW5pemF0aW9uLmhlaWdodCArPSAoZmluYWxUb3RhbCAtIHByZXZUb3RhbCk7XG5cbiAgICB0aGlzLnNoaWZ0VG9MYXN0Um93KG9yZ2FuaXphdGlvbik7XG4gIH1cbn07XG5cbkNvU0VMYXlvdXQucHJvdG90eXBlLnRpbGluZ1ByZUxheW91dCA9IGZ1bmN0aW9uKCkge1xuICBpZiAoQ29TRUNvbnN0YW50cy5USUxFKSB7XG4gICAgLy8gRmluZCB6ZXJvIGRlZ3JlZSBub2RlcyBhbmQgY3JlYXRlIGEgY29tcG91bmQgZm9yIGVhY2ggbGV2ZWxcbiAgICB0aGlzLmdyb3VwWmVyb0RlZ3JlZU1lbWJlcnMoKTtcbiAgICAvLyBUaWxlIGFuZCBjbGVhciBjaGlsZHJlbiBvZiBlYWNoIGNvbXBvdW5kXG4gICAgdGhpcy5jbGVhckNvbXBvdW5kcygpO1xuICAgIC8vIFNlcGFyYXRlbHkgdGlsZSBhbmQgY2xlYXIgemVybyBkZWdyZWUgbm9kZXMgZm9yIGVhY2ggbGV2ZWxcbiAgICB0aGlzLmNsZWFyWmVyb0RlZ3JlZU1lbWJlcnMoKTtcbiAgfVxufTtcblxuQ29TRUxheW91dC5wcm90b3R5cGUudGlsaW5nUG9zdExheW91dCA9IGZ1bmN0aW9uKCkge1xuICBpZiAoQ29TRUNvbnN0YW50cy5USUxFKSB7XG4gICAgdGhpcy5yZXBvcHVsYXRlWmVyb0RlZ3JlZU1lbWJlcnMoKTtcbiAgICB0aGlzLnJlcG9wdWxhdGVDb21wb3VuZHMoKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb1NFTGF5b3V0O1xuIiwidmFyIEZETGF5b3V0Tm9kZSA9IHJlcXVpcmUoJy4vRkRMYXlvdXROb2RlJyk7XHJcbnZhciBJTWF0aCA9IHJlcXVpcmUoJy4vSU1hdGgnKTtcclxuXHJcbmZ1bmN0aW9uIENvU0VOb2RlKGdtLCBsb2MsIHNpemUsIHZOb2RlKSB7XHJcbiAgRkRMYXlvdXROb2RlLmNhbGwodGhpcywgZ20sIGxvYywgc2l6ZSwgdk5vZGUpO1xyXG59XHJcblxyXG5cclxuQ29TRU5vZGUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGRExheW91dE5vZGUucHJvdG90eXBlKTtcclxuZm9yICh2YXIgcHJvcCBpbiBGRExheW91dE5vZGUpIHtcclxuICBDb1NFTm9kZVtwcm9wXSA9IEZETGF5b3V0Tm9kZVtwcm9wXTtcclxufVxyXG5cclxuQ29TRU5vZGUucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIGxheW91dCA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldExheW91dCgpO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50WCA9IGxheW91dC5jb29saW5nRmFjdG9yICpcclxuICAgICAgICAgICh0aGlzLnNwcmluZ0ZvcmNlWCArIHRoaXMucmVwdWxzaW9uRm9yY2VYICsgdGhpcy5ncmF2aXRhdGlvbkZvcmNlWCkgLyB0aGlzLm5vT2ZDaGlsZHJlbjtcclxuICB0aGlzLmRpc3BsYWNlbWVudFkgPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqXHJcbiAgICAgICAgICAodGhpcy5zcHJpbmdGb3JjZVkgKyB0aGlzLnJlcHVsc2lvbkZvcmNlWSArIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVkpIC8gdGhpcy5ub09mQ2hpbGRyZW47XHJcblxyXG5cclxuICBpZiAoTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRYKSA+IGxheW91dC5jb29saW5nRmFjdG9yICogbGF5b3V0Lm1heE5vZGVEaXNwbGFjZW1lbnQpXHJcbiAge1xyXG4gICAgdGhpcy5kaXNwbGFjZW1lbnRYID0gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKiBsYXlvdXQubWF4Tm9kZURpc3BsYWNlbWVudCAqXHJcbiAgICAgICAgICAgIElNYXRoLnNpZ24odGhpcy5kaXNwbGFjZW1lbnRYKTtcclxuICB9XHJcblxyXG4gIGlmIChNYXRoLmFicyh0aGlzLmRpc3BsYWNlbWVudFkpID4gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKiBsYXlvdXQubWF4Tm9kZURpc3BsYWNlbWVudClcclxuICB7XHJcbiAgICB0aGlzLmRpc3BsYWNlbWVudFkgPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqIGxheW91dC5tYXhOb2RlRGlzcGxhY2VtZW50ICpcclxuICAgICAgICAgICAgSU1hdGguc2lnbih0aGlzLmRpc3BsYWNlbWVudFkpO1xyXG4gIH1cclxuXHJcbiAgLy8gYSBzaW1wbGUgbm9kZSwganVzdCBtb3ZlIGl0XHJcbiAgaWYgKHRoaXMuY2hpbGQgPT0gbnVsbClcclxuICB7XHJcbiAgICB0aGlzLm1vdmVCeSh0aGlzLmRpc3BsYWNlbWVudFgsIHRoaXMuZGlzcGxhY2VtZW50WSk7XHJcbiAgfVxyXG4gIC8vIGFuIGVtcHR5IGNvbXBvdW5kIG5vZGUsIGFnYWluIGp1c3QgbW92ZSBpdFxyXG4gIGVsc2UgaWYgKHRoaXMuY2hpbGQuZ2V0Tm9kZXMoKS5sZW5ndGggPT0gMClcclxuICB7XHJcbiAgICB0aGlzLm1vdmVCeSh0aGlzLmRpc3BsYWNlbWVudFgsIHRoaXMuZGlzcGxhY2VtZW50WSk7XHJcbiAgfVxyXG4gIC8vIG5vbi1lbXB0eSBjb21wb3VuZCBub2RlLCBwcm9wb2dhdGUgbW92ZW1lbnQgdG8gY2hpbGRyZW4gYXMgd2VsbFxyXG4gIGVsc2VcclxuICB7XHJcbiAgICB0aGlzLnByb3BvZ2F0ZURpc3BsYWNlbWVudFRvQ2hpbGRyZW4odGhpcy5kaXNwbGFjZW1lbnRYLFxyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYWNlbWVudFkpO1xyXG4gIH1cclxuXHJcbiAgbGF5b3V0LnRvdGFsRGlzcGxhY2VtZW50ICs9XHJcbiAgICAgICAgICBNYXRoLmFicyh0aGlzLmRpc3BsYWNlbWVudFgpICsgTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRZKTtcclxuXHJcbiAgdGhpcy5zcHJpbmdGb3JjZVggPSAwO1xyXG4gIHRoaXMuc3ByaW5nRm9yY2VZID0gMDtcclxuICB0aGlzLnJlcHVsc2lvbkZvcmNlWCA9IDA7XHJcbiAgdGhpcy5yZXB1bHNpb25Gb3JjZVkgPSAwO1xyXG4gIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVggPSAwO1xyXG4gIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVkgPSAwO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50WCA9IDA7XHJcbiAgdGhpcy5kaXNwbGFjZW1lbnRZID0gMDtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5wcm9wb2dhdGVEaXNwbGFjZW1lbnRUb0NoaWxkcmVuID0gZnVuY3Rpb24gKGRYLCBkWSlcclxue1xyXG4gIHZhciBub2RlcyA9IHRoaXMuZ2V0Q2hpbGQoKS5nZXROb2RlcygpO1xyXG4gIHZhciBub2RlO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgbm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgaWYgKG5vZGUuZ2V0Q2hpbGQoKSA9PSBudWxsKVxyXG4gICAge1xyXG4gICAgICBub2RlLm1vdmVCeShkWCwgZFkpO1xyXG4gICAgICBub2RlLmRpc3BsYWNlbWVudFggKz0gZFg7XHJcbiAgICAgIG5vZGUuZGlzcGxhY2VtZW50WSArPSBkWTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgbm9kZS5wcm9wb2dhdGVEaXNwbGFjZW1lbnRUb0NoaWxkcmVuKGRYLCBkWSk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuQ29TRU5vZGUucHJvdG90eXBlLnNldFByZWQxID0gZnVuY3Rpb24gKHByZWQxKVxyXG57XHJcbiAgdGhpcy5wcmVkMSA9IHByZWQxO1xyXG59O1xyXG5cclxuQ29TRU5vZGUucHJvdG90eXBlLmdldFByZWQxID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBwcmVkMTtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5nZXRQcmVkMiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gcHJlZDI7XHJcbn07XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUuc2V0TmV4dCA9IGZ1bmN0aW9uIChuZXh0KVxyXG57XHJcbiAgdGhpcy5uZXh0ID0gbmV4dDtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5nZXROZXh0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBuZXh0O1xyXG59O1xyXG5cclxuQ29TRU5vZGUucHJvdG90eXBlLnNldFByb2Nlc3NlZCA9IGZ1bmN0aW9uIChwcm9jZXNzZWQpXHJcbntcclxuICB0aGlzLnByb2Nlc3NlZCA9IHByb2Nlc3NlZDtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5pc1Byb2Nlc3NlZCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gcHJvY2Vzc2VkO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb1NFTm9kZTtcclxuIiwiZnVuY3Rpb24gRGltZW5zaW9uRCh3aWR0aCwgaGVpZ2h0KSB7XHJcbiAgdGhpcy53aWR0aCA9IDA7XHJcbiAgdGhpcy5oZWlnaHQgPSAwO1xyXG4gIGlmICh3aWR0aCAhPT0gbnVsbCAmJiBoZWlnaHQgIT09IG51bGwpIHtcclxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgdGhpcy53aWR0aCA9IHdpZHRoO1xyXG4gIH1cclxufVxyXG5cclxuRGltZW5zaW9uRC5wcm90b3R5cGUuZ2V0V2lkdGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMud2lkdGg7XHJcbn07XHJcblxyXG5EaW1lbnNpb25ELnByb3RvdHlwZS5zZXRXaWR0aCA9IGZ1bmN0aW9uICh3aWR0aClcclxue1xyXG4gIHRoaXMud2lkdGggPSB3aWR0aDtcclxufTtcclxuXHJcbkRpbWVuc2lvbkQucHJvdG90eXBlLmdldEhlaWdodCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5oZWlnaHQ7XHJcbn07XHJcblxyXG5EaW1lbnNpb25ELnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbiAoaGVpZ2h0KVxyXG57XHJcbiAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERpbWVuc2lvbkQ7XHJcbiIsImZ1bmN0aW9uIEVtaXR0ZXIoKXtcclxuICB0aGlzLmxpc3RlbmVycyA9IFtdO1xyXG59XHJcblxyXG52YXIgcCA9IEVtaXR0ZXIucHJvdG90eXBlO1xyXG5cclxucC5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKCBldmVudCwgY2FsbGJhY2sgKXtcclxuICB0aGlzLmxpc3RlbmVycy5wdXNoKHtcclxuICAgIGV2ZW50OiBldmVudCxcclxuICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG4gIH0pO1xyXG59O1xyXG5cclxucC5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKCBldmVudCwgY2FsbGJhY2sgKXtcclxuICBmb3IoIHZhciBpID0gdGhpcy5saXN0ZW5lcnMubGVuZ3RoOyBpID49IDA7IGktLSApe1xyXG4gICAgdmFyIGwgPSB0aGlzLmxpc3RlbmVyc1tpXTtcclxuXHJcbiAgICBpZiggbC5ldmVudCA9PT0gZXZlbnQgJiYgbC5jYWxsYmFjayA9PT0gY2FsbGJhY2sgKXtcclxuICAgICAgdGhpcy5saXN0ZW5lcnMuc3BsaWNlKCBpLCAxICk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxucC5lbWl0ID0gZnVuY3Rpb24oIGV2ZW50LCBkYXRhICl7XHJcbiAgZm9yKCB2YXIgaSA9IDA7IGkgPCB0aGlzLmxpc3RlbmVycy5sZW5ndGg7IGkrKyApe1xyXG4gICAgdmFyIGwgPSB0aGlzLmxpc3RlbmVyc1tpXTtcclxuXHJcbiAgICBpZiggZXZlbnQgPT09IGwuZXZlbnQgKXtcclxuICAgICAgbC5jYWxsYmFjayggZGF0YSApO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcclxuIiwidmFyIExheW91dCA9IHJlcXVpcmUoJy4vTGF5b3V0Jyk7XHJcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcclxudmFyIExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vTGF5b3V0Q29uc3RhbnRzJyk7XHJcbnZhciBJR2VvbWV0cnkgPSByZXF1aXJlKCcuL0lHZW9tZXRyeScpO1xyXG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XHJcbnZhciBIYXNoU2V0ID0gcmVxdWlyZSgnLi9IYXNoU2V0Jyk7XHJcblxyXG5mdW5jdGlvbiBGRExheW91dCgpIHtcclxuICBMYXlvdXQuY2FsbCh0aGlzKTtcclxuXHJcbiAgdGhpcy51c2VTbWFydElkZWFsRWRnZUxlbmd0aENhbGN1bGF0aW9uID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfSURFQUxfRURHRV9MRU5HVEhfQ0FMQ1VMQVRJT047XHJcbiAgdGhpcy5pZGVhbEVkZ2VMZW5ndGggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIO1xyXG4gIHRoaXMuc3ByaW5nQ29uc3RhbnQgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX1NQUklOR19TVFJFTkdUSDtcclxuICB0aGlzLnJlcHVsc2lvbkNvbnN0YW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEg7XHJcbiAgdGhpcy5ncmF2aXR5Q29uc3RhbnQgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEg7XHJcbiAgdGhpcy5jb21wb3VuZEdyYXZpdHlDb25zdGFudCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9TVFJFTkdUSDtcclxuICB0aGlzLmdyYXZpdHlSYW5nZUZhY3RvciA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XHJcbiAgdGhpcy5jb21wb3VuZEdyYXZpdHlSYW5nZUZhY3RvciA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XHJcbiAgdGhpcy5kaXNwbGFjZW1lbnRUaHJlc2hvbGRQZXJOb2RlID0gKDMuMCAqIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEgpIC8gMTAwO1xyXG4gIHRoaXMuY29vbGluZ0ZhY3RvciA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09PTElOR19GQUNUT1JfSU5DUkVNRU5UQUw7XHJcbiAgdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09PTElOR19GQUNUT1JfSU5DUkVNRU5UQUw7XHJcbiAgdGhpcy50b3RhbERpc3BsYWNlbWVudCA9IDAuMDtcclxuICB0aGlzLm9sZFRvdGFsRGlzcGxhY2VtZW50ID0gMC4wO1xyXG4gIHRoaXMubWF4SXRlcmF0aW9ucyA9IEZETGF5b3V0Q29uc3RhbnRzLk1BWF9JVEVSQVRJT05TO1xyXG59XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExheW91dC5wcm90b3R5cGUpO1xyXG5cclxuZm9yICh2YXIgcHJvcCBpbiBMYXlvdXQpIHtcclxuICBGRExheW91dFtwcm9wXSA9IExheW91dFtwcm9wXTtcclxufVxyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmluaXRQYXJhbWV0ZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gIExheW91dC5wcm90b3R5cGUuaW5pdFBhcmFtZXRlcnMuY2FsbCh0aGlzLCBhcmd1bWVudHMpO1xyXG5cclxuICBpZiAodGhpcy5sYXlvdXRRdWFsaXR5ID09IExheW91dENvbnN0YW50cy5EUkFGVF9RVUFMSVRZKVxyXG4gIHtcclxuICAgIHRoaXMuZGlzcGxhY2VtZW50VGhyZXNob2xkUGVyTm9kZSArPSAwLjMwO1xyXG4gICAgdGhpcy5tYXhJdGVyYXRpb25zICo9IDAuODtcclxuICB9XHJcbiAgZWxzZSBpZiAodGhpcy5sYXlvdXRRdWFsaXR5ID09IExheW91dENvbnN0YW50cy5QUk9PRl9RVUFMSVRZKVxyXG4gIHtcclxuICAgIHRoaXMuZGlzcGxhY2VtZW50VGhyZXNob2xkUGVyTm9kZSAtPSAwLjMwO1xyXG4gICAgdGhpcy5tYXhJdGVyYXRpb25zICo9IDEuMjtcclxuICB9XHJcblxyXG4gIHRoaXMudG90YWxJdGVyYXRpb25zID0gMDtcclxuICB0aGlzLm5vdEFuaW1hdGVkSXRlcmF0aW9ucyA9IDA7XHJcblxyXG4gIHRoaXMudXNlRlJHcmlkVmFyaWFudCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVVNFX1NNQVJUX1JFUFVMU0lPTl9SQU5HRV9DQUxDVUxBVElPTjtcclxufTtcclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjSWRlYWxFZGdlTGVuZ3RocyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgZWRnZTtcclxuICB2YXIgbGNhRGVwdGg7XHJcbiAgdmFyIHNvdXJjZTtcclxuICB2YXIgdGFyZ2V0O1xyXG4gIHZhciBzaXplT2ZTb3VyY2VJbkxjYTtcclxuICB2YXIgc2l6ZU9mVGFyZ2V0SW5MY2E7XHJcblxyXG4gIHZhciBhbGxFZGdlcyA9IHRoaXMuZ2V0R3JhcGhNYW5hZ2VyKCkuZ2V0QWxsRWRnZXMoKTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbEVkZ2VzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIGVkZ2UgPSBhbGxFZGdlc1tpXTtcclxuXHJcbiAgICBlZGdlLmlkZWFsTGVuZ3RoID0gdGhpcy5pZGVhbEVkZ2VMZW5ndGg7XHJcblxyXG4gICAgaWYgKGVkZ2UuaXNJbnRlckdyYXBoKVxyXG4gICAge1xyXG4gICAgICBzb3VyY2UgPSBlZGdlLmdldFNvdXJjZSgpO1xyXG4gICAgICB0YXJnZXQgPSBlZGdlLmdldFRhcmdldCgpO1xyXG5cclxuICAgICAgc2l6ZU9mU291cmNlSW5MY2EgPSBlZGdlLmdldFNvdXJjZUluTGNhKCkuZ2V0RXN0aW1hdGVkU2l6ZSgpO1xyXG4gICAgICBzaXplT2ZUYXJnZXRJbkxjYSA9IGVkZ2UuZ2V0VGFyZ2V0SW5MY2EoKS5nZXRFc3RpbWF0ZWRTaXplKCk7XHJcblxyXG4gICAgICBpZiAodGhpcy51c2VTbWFydElkZWFsRWRnZUxlbmd0aENhbGN1bGF0aW9uKVxyXG4gICAgICB7XHJcbiAgICAgICAgZWRnZS5pZGVhbExlbmd0aCArPSBzaXplT2ZTb3VyY2VJbkxjYSArIHNpemVPZlRhcmdldEluTGNhIC1cclxuICAgICAgICAgICAgICAgIDIgKiBMYXlvdXRDb25zdGFudHMuU0lNUExFX05PREVfU0laRTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGNhRGVwdGggPSBlZGdlLmdldExjYSgpLmdldEluY2x1c2lvblRyZWVEZXB0aCgpO1xyXG5cclxuICAgICAgZWRnZS5pZGVhbExlbmd0aCArPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIICpcclxuICAgICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5QRVJfTEVWRUxfSURFQUxfRURHRV9MRU5HVEhfRkFDVE9SICpcclxuICAgICAgICAgICAgICAoc291cmNlLmdldEluY2x1c2lvblRyZWVEZXB0aCgpICtcclxuICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5nZXRJbmNsdXNpb25UcmVlRGVwdGgoKSAtIDIgKiBsY2FEZXB0aCk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmluaXRTcHJpbmdFbWJlZGRlciA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgaWYgKHRoaXMuaW5jcmVtZW50YWwpXHJcbiAge1xyXG4gICAgdGhpcy5tYXhOb2RlRGlzcGxhY2VtZW50ID1cclxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UX0lOQ1JFTUVOVEFMO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgdGhpcy5jb29saW5nRmFjdG9yID0gMS4wO1xyXG4gICAgdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciA9IDEuMDtcclxuICAgIHRoaXMubWF4Tm9kZURpc3BsYWNlbWVudCA9XHJcbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLk1BWF9OT0RFX0RJU1BMQUNFTUVOVDtcclxuICB9XHJcblxyXG4gIHRoaXMubWF4SXRlcmF0aW9ucyA9XHJcbiAgICAgICAgICBNYXRoLm1heCh0aGlzLmdldEFsbE5vZGVzKCkubGVuZ3RoICogNSwgdGhpcy5tYXhJdGVyYXRpb25zKTtcclxuXHJcbiAgdGhpcy50b3RhbERpc3BsYWNlbWVudFRocmVzaG9sZCA9XHJcbiAgICAgICAgICB0aGlzLmRpc3BsYWNlbWVudFRocmVzaG9sZFBlck5vZGUgKiB0aGlzLmdldEFsbE5vZGVzKCkubGVuZ3RoO1xyXG5cclxuICB0aGlzLnJlcHVsc2lvblJhbmdlID0gdGhpcy5jYWxjUmVwdWxzaW9uUmFuZ2UoKTtcclxufTtcclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjU3ByaW5nRm9yY2VzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBsRWRnZXMgPSB0aGlzLmdldEFsbEVkZ2VzKCk7XHJcbiAgdmFyIGVkZ2U7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbEVkZ2VzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIGVkZ2UgPSBsRWRnZXNbaV07XHJcblxyXG4gICAgdGhpcy5jYWxjU3ByaW5nRm9yY2UoZWRnZSwgZWRnZS5pZGVhbExlbmd0aCk7XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25Gb3JjZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGksIGo7XHJcbiAgdmFyIG5vZGVBLCBub2RlQjtcclxuICB2YXIgbE5vZGVzID0gdGhpcy5nZXRBbGxOb2RlcygpO1xyXG4gIHZhciBwcm9jZXNzZWROb2RlU2V0O1xyXG5cclxuICBpZiAodGhpcy51c2VGUkdyaWRWYXJpYW50KVxyXG4gIHsgICAgICAgXHJcbiAgICBpZiAodGhpcy50b3RhbEl0ZXJhdGlvbnMgJSBGRExheW91dENvbnN0YW50cy5HUklEX0NBTENVTEFUSU9OX0NIRUNLX1BFUklPRCA9PSAxKVxyXG4gICAge1xyXG4gICAgICB2YXIgZ3JpZCA9IHRoaXMuY2FsY0dyaWQodGhpcy5ncmFwaE1hbmFnZXIuZ2V0Um9vdCgpKTsgICAgXHJcbiAgICAgIFxyXG4gICAgICAvLyBwdXQgYWxsIG5vZGVzIHRvIHByb3BlciBncmlkIGNlbGxzXHJcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsTm9kZXMubGVuZ3RoOyBpKyspXHJcbiAgICAgIHtcclxuICAgICAgICBub2RlQSA9IGxOb2Rlc1tpXTtcclxuICAgICAgICB0aGlzLmFkZE5vZGVUb0dyaWQobm9kZUEsIGdyaWQsIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXRMZWZ0KCksIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXRUb3AoKSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcm9jZXNzZWROb2RlU2V0ID0gbmV3IEhhc2hTZXQoKTtcclxuICAgIFxyXG4gICAgLy8gY2FsY3VsYXRlIHJlcHVsc2lvbiBmb3JjZXMgYmV0d2VlbiBlYWNoIG5vZGVzIGFuZCBpdHMgc3Vycm91bmRpbmdcclxuICAgIGZvciAoaSA9IDA7IGkgPCBsTm9kZXMubGVuZ3RoOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIG5vZGVBID0gbE5vZGVzW2ldO1xyXG4gICAgICB0aGlzLmNhbGN1bGF0ZVJlcHVsc2lvbkZvcmNlT2ZBTm9kZShncmlkLCBub2RlQSwgcHJvY2Vzc2VkTm9kZVNldCk7XHJcbiAgICAgIHByb2Nlc3NlZE5vZGVTZXQuYWRkKG5vZGVBKTtcclxuICAgIH1cclxuXHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gICAge1xyXG4gICAgICBub2RlQSA9IGxOb2Rlc1tpXTtcclxuXHJcbiAgICAgIGZvciAoaiA9IGkgKyAxOyBqIDwgbE5vZGVzLmxlbmd0aDsgaisrKVxyXG4gICAgICB7XHJcbiAgICAgICAgbm9kZUIgPSBsTm9kZXNbal07XHJcblxyXG4gICAgICAgIC8vIElmIGJvdGggbm9kZXMgYXJlIG5vdCBtZW1iZXJzIG9mIHRoZSBzYW1lIGdyYXBoLCBza2lwLlxyXG4gICAgICAgIGlmIChub2RlQS5nZXRPd25lcigpICE9IG5vZGVCLmdldE93bmVyKCkpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNhbGNSZXB1bHNpb25Gb3JjZShub2RlQSwgbm9kZUIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2VzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBub2RlO1xyXG4gIHZhciBsTm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uKCk7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIG5vZGUgPSBsTm9kZXNbaV07XHJcbiAgICB0aGlzLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2Uobm9kZSk7XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLm1vdmVOb2RlcyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbE5vZGVzID0gdGhpcy5nZXRBbGxOb2RlcygpO1xyXG4gIHZhciBub2RlO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxOb2Rlcy5sZW5ndGg7IGkrKylcclxuICB7XHJcbiAgICBub2RlID0gbE5vZGVzW2ldO1xyXG4gICAgbm9kZS5tb3ZlKCk7XHJcbiAgfVxyXG59XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1NwcmluZ0ZvcmNlID0gZnVuY3Rpb24gKGVkZ2UsIGlkZWFsTGVuZ3RoKSB7XHJcbiAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLmdldFNvdXJjZSgpO1xyXG4gIHZhciB0YXJnZXROb2RlID0gZWRnZS5nZXRUYXJnZXQoKTtcclxuXHJcbiAgdmFyIGxlbmd0aDtcclxuICB2YXIgc3ByaW5nRm9yY2U7XHJcbiAgdmFyIHNwcmluZ0ZvcmNlWDtcclxuICB2YXIgc3ByaW5nRm9yY2VZO1xyXG5cclxuICAvLyBVcGRhdGUgZWRnZSBsZW5ndGhcclxuICBpZiAodGhpcy51bmlmb3JtTGVhZk5vZGVTaXplcyAmJlxyXG4gICAgICAgICAgc291cmNlTm9kZS5nZXRDaGlsZCgpID09IG51bGwgJiYgdGFyZ2V0Tm9kZS5nZXRDaGlsZCgpID09IG51bGwpXHJcbiAge1xyXG4gICAgZWRnZS51cGRhdGVMZW5ndGhTaW1wbGUoKTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIGVkZ2UudXBkYXRlTGVuZ3RoKCk7XHJcblxyXG4gICAgaWYgKGVkZ2UuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0KVxyXG4gICAge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBsZW5ndGggPSBlZGdlLmdldExlbmd0aCgpO1xyXG5cclxuICAvLyBDYWxjdWxhdGUgc3ByaW5nIGZvcmNlc1xyXG4gIHNwcmluZ0ZvcmNlID0gdGhpcy5zcHJpbmdDb25zdGFudCAqIChsZW5ndGggLSBpZGVhbExlbmd0aCk7XHJcblxyXG4gIC8vIFByb2plY3QgZm9yY2Ugb250byB4IGFuZCB5IGF4ZXNcclxuICBzcHJpbmdGb3JjZVggPSBzcHJpbmdGb3JjZSAqIChlZGdlLmxlbmd0aFggLyBsZW5ndGgpO1xyXG4gIHNwcmluZ0ZvcmNlWSA9IHNwcmluZ0ZvcmNlICogKGVkZ2UubGVuZ3RoWSAvIGxlbmd0aCk7XHJcblxyXG4gIC8vIEFwcGx5IGZvcmNlcyBvbiB0aGUgZW5kIG5vZGVzXHJcbiAgc291cmNlTm9kZS5zcHJpbmdGb3JjZVggKz0gc3ByaW5nRm9yY2VYO1xyXG4gIHNvdXJjZU5vZGUuc3ByaW5nRm9yY2VZICs9IHNwcmluZ0ZvcmNlWTtcclxuICB0YXJnZXROb2RlLnNwcmluZ0ZvcmNlWCAtPSBzcHJpbmdGb3JjZVg7XHJcbiAgdGFyZ2V0Tm9kZS5zcHJpbmdGb3JjZVkgLT0gc3ByaW5nRm9yY2VZO1xyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNSZXB1bHNpb25Gb3JjZSA9IGZ1bmN0aW9uIChub2RlQSwgbm9kZUIpIHtcclxuICB2YXIgcmVjdEEgPSBub2RlQS5nZXRSZWN0KCk7XHJcbiAgdmFyIHJlY3RCID0gbm9kZUIuZ2V0UmVjdCgpO1xyXG4gIHZhciBvdmVybGFwQW1vdW50ID0gbmV3IEFycmF5KDIpO1xyXG4gIHZhciBjbGlwUG9pbnRzID0gbmV3IEFycmF5KDQpO1xyXG4gIHZhciBkaXN0YW5jZVg7XHJcbiAgdmFyIGRpc3RhbmNlWTtcclxuICB2YXIgZGlzdGFuY2VTcXVhcmVkO1xyXG4gIHZhciBkaXN0YW5jZTtcclxuICB2YXIgcmVwdWxzaW9uRm9yY2U7XHJcbiAgdmFyIHJlcHVsc2lvbkZvcmNlWDtcclxuICB2YXIgcmVwdWxzaW9uRm9yY2VZO1xyXG5cclxuICBpZiAocmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpLy8gdHdvIG5vZGVzIG92ZXJsYXBcclxuICB7XHJcbiAgICAvLyBjYWxjdWxhdGUgc2VwYXJhdGlvbiBhbW91bnQgaW4geCBhbmQgeSBkaXJlY3Rpb25zXHJcbiAgICBJR2VvbWV0cnkuY2FsY1NlcGFyYXRpb25BbW91bnQocmVjdEEsXHJcbiAgICAgICAgICAgIHJlY3RCLFxyXG4gICAgICAgICAgICBvdmVybGFwQW1vdW50LFxyXG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIIC8gMi4wKTtcclxuXHJcbiAgICByZXB1bHNpb25Gb3JjZVggPSAyICogb3ZlcmxhcEFtb3VudFswXTtcclxuICAgIHJlcHVsc2lvbkZvcmNlWSA9IDIgKiBvdmVybGFwQW1vdW50WzFdO1xyXG4gICAgXHJcbiAgICB2YXIgY2hpbGRyZW5Db25zdGFudCA9IG5vZGVBLm5vT2ZDaGlsZHJlbiAqIG5vZGVCLm5vT2ZDaGlsZHJlbiAvIChub2RlQS5ub09mQ2hpbGRyZW4gKyBub2RlQi5ub09mQ2hpbGRyZW4pO1xyXG4gICAgXHJcbiAgICAvLyBBcHBseSBmb3JjZXMgb24gdGhlIHR3byBub2Rlc1xyXG4gICAgbm9kZUEucmVwdWxzaW9uRm9yY2VYIC09IGNoaWxkcmVuQ29uc3RhbnQgKiByZXB1bHNpb25Gb3JjZVg7XHJcbiAgICBub2RlQS5yZXB1bHNpb25Gb3JjZVkgLT0gY2hpbGRyZW5Db25zdGFudCAqIHJlcHVsc2lvbkZvcmNlWTtcclxuICAgIG5vZGVCLnJlcHVsc2lvbkZvcmNlWCArPSBjaGlsZHJlbkNvbnN0YW50ICogcmVwdWxzaW9uRm9yY2VYO1xyXG4gICAgbm9kZUIucmVwdWxzaW9uRm9yY2VZICs9IGNoaWxkcmVuQ29uc3RhbnQgKiByZXB1bHNpb25Gb3JjZVk7XHJcbiAgfVxyXG4gIGVsc2UvLyBubyBvdmVybGFwXHJcbiAge1xyXG4gICAgLy8gY2FsY3VsYXRlIGRpc3RhbmNlXHJcblxyXG4gICAgaWYgKHRoaXMudW5pZm9ybUxlYWZOb2RlU2l6ZXMgJiZcclxuICAgICAgICAgICAgbm9kZUEuZ2V0Q2hpbGQoKSA9PSBudWxsICYmIG5vZGVCLmdldENoaWxkKCkgPT0gbnVsbCkvLyBzaW1wbHkgYmFzZSByZXB1bHNpb24gb24gZGlzdGFuY2Ugb2Ygbm9kZSBjZW50ZXJzXHJcbiAgICB7XHJcbiAgICAgIGRpc3RhbmNlWCA9IHJlY3RCLmdldENlbnRlclgoKSAtIHJlY3RBLmdldENlbnRlclgoKTtcclxuICAgICAgZGlzdGFuY2VZID0gcmVjdEIuZ2V0Q2VudGVyWSgpIC0gcmVjdEEuZ2V0Q2VudGVyWSgpO1xyXG4gICAgfVxyXG4gICAgZWxzZS8vIHVzZSBjbGlwcGluZyBwb2ludHNcclxuICAgIHtcclxuICAgICAgSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbihyZWN0QSwgcmVjdEIsIGNsaXBQb2ludHMpO1xyXG5cclxuICAgICAgZGlzdGFuY2VYID0gY2xpcFBvaW50c1syXSAtIGNsaXBQb2ludHNbMF07XHJcbiAgICAgIGRpc3RhbmNlWSA9IGNsaXBQb2ludHNbM10gLSBjbGlwUG9pbnRzWzFdO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE5vIHJlcHVsc2lvbiByYW5nZS4gRlIgZ3JpZCB2YXJpYW50IHNob3VsZCB0YWtlIGNhcmUgb2YgdGhpcy5cclxuICAgIGlmIChNYXRoLmFicyhkaXN0YW5jZVgpIDwgRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUKVxyXG4gICAge1xyXG4gICAgICBkaXN0YW5jZVggPSBJTWF0aC5zaWduKGRpc3RhbmNlWCkgKlxyXG4gICAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLk1JTl9SRVBVTFNJT05fRElTVDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoTWF0aC5hYnMoZGlzdGFuY2VZKSA8IEZETGF5b3V0Q29uc3RhbnRzLk1JTl9SRVBVTFNJT05fRElTVClcclxuICAgIHtcclxuICAgICAgZGlzdGFuY2VZID0gSU1hdGguc2lnbihkaXN0YW5jZVkpICpcclxuICAgICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5NSU5fUkVQVUxTSU9OX0RJU1Q7XHJcbiAgICB9XHJcblxyXG4gICAgZGlzdGFuY2VTcXVhcmVkID0gZGlzdGFuY2VYICogZGlzdGFuY2VYICsgZGlzdGFuY2VZICogZGlzdGFuY2VZO1xyXG4gICAgZGlzdGFuY2UgPSBNYXRoLnNxcnQoZGlzdGFuY2VTcXVhcmVkKTtcclxuXHJcbiAgICByZXB1bHNpb25Gb3JjZSA9IHRoaXMucmVwdWxzaW9uQ29uc3RhbnQgKiBub2RlQS5ub09mQ2hpbGRyZW4gKiBub2RlQi5ub09mQ2hpbGRyZW4gLyBkaXN0YW5jZVNxdWFyZWQ7XHJcblxyXG4gICAgLy8gUHJvamVjdCBmb3JjZSBvbnRvIHggYW5kIHkgYXhlc1xyXG4gICAgcmVwdWxzaW9uRm9yY2VYID0gcmVwdWxzaW9uRm9yY2UgKiBkaXN0YW5jZVggLyBkaXN0YW5jZTtcclxuICAgIHJlcHVsc2lvbkZvcmNlWSA9IHJlcHVsc2lvbkZvcmNlICogZGlzdGFuY2VZIC8gZGlzdGFuY2U7XHJcbiAgICAgXHJcbiAgICAvLyBBcHBseSBmb3JjZXMgb24gdGhlIHR3byBub2RlcyAgICBcclxuICAgIG5vZGVBLnJlcHVsc2lvbkZvcmNlWCAtPSByZXB1bHNpb25Gb3JjZVg7XHJcbiAgICBub2RlQS5yZXB1bHNpb25Gb3JjZVkgLT0gcmVwdWxzaW9uRm9yY2VZO1xyXG4gICAgbm9kZUIucmVwdWxzaW9uRm9yY2VYICs9IHJlcHVsc2lvbkZvcmNlWDtcclxuICAgIG5vZGVCLnJlcHVsc2lvbkZvcmNlWSArPSByZXB1bHNpb25Gb3JjZVk7XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2UgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBvd25lckdyYXBoO1xyXG4gIHZhciBvd25lckNlbnRlclg7XHJcbiAgdmFyIG93bmVyQ2VudGVyWTtcclxuICB2YXIgZGlzdGFuY2VYO1xyXG4gIHZhciBkaXN0YW5jZVk7XHJcbiAgdmFyIGFic0Rpc3RhbmNlWDtcclxuICB2YXIgYWJzRGlzdGFuY2VZO1xyXG4gIHZhciBlc3RpbWF0ZWRTaXplO1xyXG4gIG93bmVyR3JhcGggPSBub2RlLmdldE93bmVyKCk7XHJcblxyXG4gIG93bmVyQ2VudGVyWCA9IChvd25lckdyYXBoLmdldFJpZ2h0KCkgKyBvd25lckdyYXBoLmdldExlZnQoKSkgLyAyO1xyXG4gIG93bmVyQ2VudGVyWSA9IChvd25lckdyYXBoLmdldFRvcCgpICsgb3duZXJHcmFwaC5nZXRCb3R0b20oKSkgLyAyO1xyXG4gIGRpc3RhbmNlWCA9IG5vZGUuZ2V0Q2VudGVyWCgpIC0gb3duZXJDZW50ZXJYO1xyXG4gIGRpc3RhbmNlWSA9IG5vZGUuZ2V0Q2VudGVyWSgpIC0gb3duZXJDZW50ZXJZO1xyXG4gIGFic0Rpc3RhbmNlWCA9IE1hdGguYWJzKGRpc3RhbmNlWCkgKyBub2RlLmdldFdpZHRoKCkgLyAyO1xyXG4gIGFic0Rpc3RhbmNlWSA9IE1hdGguYWJzKGRpc3RhbmNlWSkgKyBub2RlLmdldEhlaWdodCgpIC8gMjtcclxuXHJcbiAgaWYgKG5vZGUuZ2V0T3duZXIoKSA9PSB0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkpLy8gaW4gdGhlIHJvb3QgZ3JhcGhcclxuICB7XHJcbiAgICBlc3RpbWF0ZWRTaXplID0gb3duZXJHcmFwaC5nZXRFc3RpbWF0ZWRTaXplKCkgKiB0aGlzLmdyYXZpdHlSYW5nZUZhY3RvcjtcclxuXHJcbiAgICBpZiAoYWJzRGlzdGFuY2VYID4gZXN0aW1hdGVkU2l6ZSB8fCBhYnNEaXN0YW5jZVkgPiBlc3RpbWF0ZWRTaXplKVxyXG4gICAge1xyXG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VYID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VYO1xyXG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VZID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VZO1xyXG4gICAgfVxyXG4gIH1cclxuICBlbHNlLy8gaW5zaWRlIGEgY29tcG91bmRcclxuICB7XHJcbiAgICBlc3RpbWF0ZWRTaXplID0gb3duZXJHcmFwaC5nZXRFc3RpbWF0ZWRTaXplKCkgKiB0aGlzLmNvbXBvdW5kR3Jhdml0eVJhbmdlRmFjdG9yO1xyXG5cclxuICAgIGlmIChhYnNEaXN0YW5jZVggPiBlc3RpbWF0ZWRTaXplIHx8IGFic0Rpc3RhbmNlWSA+IGVzdGltYXRlZFNpemUpXHJcbiAgICB7XHJcbiAgICAgIG5vZGUuZ3Jhdml0YXRpb25Gb3JjZVggPSAtdGhpcy5ncmF2aXR5Q29uc3RhbnQgKiBkaXN0YW5jZVggKlxyXG4gICAgICAgICAgICAgIHRoaXMuY29tcG91bmRHcmF2aXR5Q29uc3RhbnQ7XHJcbiAgICAgIG5vZGUuZ3Jhdml0YXRpb25Gb3JjZVkgPSAtdGhpcy5ncmF2aXR5Q29uc3RhbnQgKiBkaXN0YW5jZVkgKlxyXG4gICAgICAgICAgICAgIHRoaXMuY29tcG91bmRHcmF2aXR5Q29uc3RhbnQ7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmlzQ29udmVyZ2VkID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBjb252ZXJnZWQ7XHJcbiAgdmFyIG9zY2lsYXRpbmcgPSBmYWxzZTtcclxuXHJcbiAgaWYgKHRoaXMudG90YWxJdGVyYXRpb25zID4gdGhpcy5tYXhJdGVyYXRpb25zIC8gMylcclxuICB7XHJcbiAgICBvc2NpbGF0aW5nID1cclxuICAgICAgICAgICAgTWF0aC5hYnModGhpcy50b3RhbERpc3BsYWNlbWVudCAtIHRoaXMub2xkVG90YWxEaXNwbGFjZW1lbnQpIDwgMjtcclxuICB9XHJcblxyXG4gIGNvbnZlcmdlZCA9IHRoaXMudG90YWxEaXNwbGFjZW1lbnQgPCB0aGlzLnRvdGFsRGlzcGxhY2VtZW50VGhyZXNob2xkO1xyXG5cclxuICB0aGlzLm9sZFRvdGFsRGlzcGxhY2VtZW50ID0gdGhpcy50b3RhbERpc3BsYWNlbWVudDtcclxuXHJcbiAgcmV0dXJuIGNvbnZlcmdlZCB8fCBvc2NpbGF0aW5nO1xyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmFuaW1hdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0ICYmICF0aGlzLmlzU3ViTGF5b3V0KVxyXG4gIHtcclxuICAgIGlmICh0aGlzLm5vdEFuaW1hdGVkSXRlcmF0aW9ucyA9PSB0aGlzLmFuaW1hdGlvblBlcmlvZClcclxuICAgIHtcclxuICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgdGhpcy5ub3RBbmltYXRlZEl0ZXJhdGlvbnMgPSAwO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICB0aGlzLm5vdEFuaW1hdGVkSXRlcmF0aW9ucysrO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFNlY3Rpb246IEZSLUdyaWQgVmFyaWFudCBSZXB1bHNpb24gRm9yY2UgQ2FsY3VsYXRpb25cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjR3JpZCA9IGZ1bmN0aW9uIChncmFwaCl7XHJcblxyXG4gIHZhciBzaXplWCA9IDA7IFxyXG4gIHZhciBzaXplWSA9IDA7XHJcbiAgXHJcbiAgc2l6ZVggPSBwYXJzZUludChNYXRoLmNlaWwoKGdyYXBoLmdldFJpZ2h0KCkgLSBncmFwaC5nZXRMZWZ0KCkpIC8gdGhpcy5yZXB1bHNpb25SYW5nZSkpO1xyXG4gIHNpemVZID0gcGFyc2VJbnQoTWF0aC5jZWlsKChncmFwaC5nZXRCb3R0b20oKSAtIGdyYXBoLmdldFRvcCgpKSAvIHRoaXMucmVwdWxzaW9uUmFuZ2UpKTtcclxuICBcclxuICB2YXIgZ3JpZCA9IG5ldyBBcnJheShzaXplWCk7XHJcbiAgXHJcbiAgZm9yKHZhciBpID0gMDsgaSA8IHNpemVYOyBpKyspe1xyXG4gICAgZ3JpZFtpXSA9IG5ldyBBcnJheShzaXplWSk7ICAgIFxyXG4gIH1cclxuICBcclxuICBmb3IodmFyIGkgPSAwOyBpIDwgc2l6ZVg7IGkrKyl7XHJcbiAgICBmb3IodmFyIGogPSAwOyBqIDwgc2l6ZVk7IGorKyl7XHJcbiAgICAgIGdyaWRbaV1bal0gPSBuZXcgQXJyYXkoKTsgICAgXHJcbiAgICB9XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBncmlkO1xyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmFkZE5vZGVUb0dyaWQgPSBmdW5jdGlvbiAodiwgZ3JpZCwgbGVmdCwgdG9wKXtcclxuICAgIFxyXG4gIHZhciBzdGFydFggPSAwO1xyXG4gIHZhciBmaW5pc2hYID0gMDtcclxuICB2YXIgc3RhcnRZID0gMDtcclxuICB2YXIgZmluaXNoWSA9IDA7XHJcbiAgXHJcbiAgc3RhcnRYID0gcGFyc2VJbnQoTWF0aC5mbG9vcigodi5nZXRSZWN0KCkueCAtIGxlZnQpIC8gdGhpcy5yZXB1bHNpb25SYW5nZSkpO1xyXG4gIGZpbmlzaFggPSBwYXJzZUludChNYXRoLmZsb29yKCh2LmdldFJlY3QoKS53aWR0aCArIHYuZ2V0UmVjdCgpLnggLSBsZWZ0KSAvIHRoaXMucmVwdWxzaW9uUmFuZ2UpKTtcclxuICBzdGFydFkgPSBwYXJzZUludChNYXRoLmZsb29yKCh2LmdldFJlY3QoKS55IC0gdG9wKSAvIHRoaXMucmVwdWxzaW9uUmFuZ2UpKTtcclxuICBmaW5pc2hZID0gcGFyc2VJbnQoTWF0aC5mbG9vcigodi5nZXRSZWN0KCkuaGVpZ2h0ICsgdi5nZXRSZWN0KCkueSAtIHRvcCkgLyB0aGlzLnJlcHVsc2lvblJhbmdlKSk7XHJcblxyXG4gIGZvciAodmFyIGkgPSBzdGFydFg7IGkgPD0gZmluaXNoWDsgaSsrKVxyXG4gIHtcclxuICAgIGZvciAodmFyIGogPSBzdGFydFk7IGogPD0gZmluaXNoWTsgaisrKVxyXG4gICAge1xyXG4gICAgICBncmlkW2ldW2pdLnB1c2godik7XHJcbiAgICAgIHYuc2V0R3JpZENvb3JkaW5hdGVzKHN0YXJ0WCwgZmluaXNoWCwgc3RhcnRZLCBmaW5pc2hZKTsgXHJcbiAgICB9XHJcbiAgfSAgXHJcblxyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGN1bGF0ZVJlcHVsc2lvbkZvcmNlT2ZBTm9kZSA9IGZ1bmN0aW9uIChncmlkLCBub2RlQSwgcHJvY2Vzc2VkTm9kZVNldCl7XHJcbiAgXHJcbiAgaWYgKHRoaXMudG90YWxJdGVyYXRpb25zICUgRkRMYXlvdXRDb25zdGFudHMuR1JJRF9DQUxDVUxBVElPTl9DSEVDS19QRVJJT0QgPT0gMSlcclxuICB7XHJcbiAgICB2YXIgc3Vycm91bmRpbmcgPSBuZXcgSGFzaFNldCgpO1xyXG4gICAgbm9kZUEuc3Vycm91bmRpbmcgPSBuZXcgQXJyYXkoKTtcclxuICAgIHZhciBub2RlQjtcclxuICAgIFxyXG4gICAgZm9yICh2YXIgaSA9IChub2RlQS5zdGFydFggLSAxKTsgaSA8IChub2RlQS5maW5pc2hYICsgMik7IGkrKylcclxuICAgIHtcclxuICAgICAgZm9yICh2YXIgaiA9IChub2RlQS5zdGFydFkgLSAxKTsgaiA8IChub2RlQS5maW5pc2hZICsgMik7IGorKylcclxuICAgICAge1xyXG4gICAgICAgIGlmICghKChpIDwgMCkgfHwgKGogPCAwKSB8fCAoaSA+PSBncmlkLmxlbmd0aCkgfHwgKGogPj0gZ3JpZFswXS5sZW5ndGgpKSlcclxuICAgICAgICB7ICBcclxuICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JpZFtpXVtqXS5sZW5ndGg7IGsrKykge1xyXG4gICAgICAgICAgICBub2RlQiA9IGdyaWRbaV1bal1ba107XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBib3RoIG5vZGVzIGFyZSBub3QgbWVtYmVycyBvZiB0aGUgc2FtZSBncmFwaCwgXHJcbiAgICAgICAgICAgIC8vIG9yIGJvdGggbm9kZXMgYXJlIHRoZSBzYW1lLCBza2lwLlxyXG4gICAgICAgICAgICBpZiAoKG5vZGVBLmdldE93bmVyKCkgIT0gbm9kZUIuZ2V0T3duZXIoKSkgfHwgKG5vZGVBID09IG5vZGVCKSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgcmVwdWxzaW9uIGZvcmNlIGJldHdlZW5cclxuICAgICAgICAgICAgLy8gbm9kZUEgYW5kIG5vZGVCIGhhcyBhbHJlYWR5IGJlZW4gY2FsY3VsYXRlZFxyXG4gICAgICAgICAgICBpZiAoIXByb2Nlc3NlZE5vZGVTZXQuY29udGFpbnMobm9kZUIpICYmICFzdXJyb3VuZGluZy5jb250YWlucyhub2RlQikpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICB2YXIgZGlzdGFuY2VYID0gTWF0aC5hYnMobm9kZUEuZ2V0Q2VudGVyWCgpLW5vZGVCLmdldENlbnRlclgoKSkgLSBcclxuICAgICAgICAgICAgICAgICAgICAoKG5vZGVBLmdldFdpZHRoKCkvMikgKyAobm9kZUIuZ2V0V2lkdGgoKS8yKSk7XHJcbiAgICAgICAgICAgICAgdmFyIGRpc3RhbmNlWSA9IE1hdGguYWJzKG5vZGVBLmdldENlbnRlclkoKS1ub2RlQi5nZXRDZW50ZXJZKCkpIC0gXHJcbiAgICAgICAgICAgICAgICAgICAgKChub2RlQS5nZXRIZWlnaHQoKS8yKSArIChub2RlQi5nZXRIZWlnaHQoKS8yKSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIC8vIGlmIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIG5vZGVBIGFuZCBub2RlQiBcclxuICAgICAgICAgICAgICAvLyBpcyBsZXNzIHRoZW4gY2FsY3VsYXRpb24gcmFuZ2VcclxuICAgICAgICAgICAgICBpZiAoKGRpc3RhbmNlWCA8PSB0aGlzLnJlcHVsc2lvblJhbmdlKSAmJiAoZGlzdGFuY2VZIDw9IHRoaXMucmVwdWxzaW9uUmFuZ2UpKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIC8vdGhlbiBhZGQgbm9kZUIgdG8gc3Vycm91bmRpbmcgb2Ygbm9kZUFcclxuICAgICAgICAgICAgICAgIHN1cnJvdW5kaW5nLmFkZChub2RlQik7XHJcbiAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0gICAgXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSAgICAgICAgICBcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHN1cnJvdW5kaW5nLmFkZEFsbFRvKG5vZGVBLnN1cnJvdW5kaW5nKTtcclxuXHRcclxuICB9XHJcbiAgZm9yIChpID0gMDsgaSA8IG5vZGVBLnN1cnJvdW5kaW5nLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIHRoaXMuY2FsY1JlcHVsc2lvbkZvcmNlKG5vZGVBLCBub2RlQS5zdXJyb3VuZGluZ1tpXSk7XHJcbiAgfVx0XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1JlcHVsc2lvblJhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiAwLjA7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZETGF5b3V0O1xyXG4iLCJ2YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcclxuXHJcbmZ1bmN0aW9uIEZETGF5b3V0Q29uc3RhbnRzKCkge1xyXG59XHJcblxyXG4vL0ZETGF5b3V0Q29uc3RhbnRzIGluaGVyaXRzIHN0YXRpYyBwcm9wcyBpbiBMYXlvdXRDb25zdGFudHNcclxuZm9yICh2YXIgcHJvcCBpbiBMYXlvdXRDb25zdGFudHMpIHtcclxuICBGRExheW91dENvbnN0YW50c1twcm9wXSA9IExheW91dENvbnN0YW50c1twcm9wXTtcclxufVxyXG5cclxuRkRMYXlvdXRDb25zdGFudHMuTUFYX0lURVJBVElPTlMgPSAyNTAwO1xyXG5cclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA9IDUwO1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX1NQUklOR19TVFJFTkdUSCA9IDAuNDU7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RIID0gNDUwMC4wO1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEggPSAwLjQ7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9TVFJFTkdUSCA9IDEuMDtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IDMuODtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IDEuNTtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfSURFQUxfRURHRV9MRU5HVEhfQ0FMQ1VMQVRJT04gPSB0cnVlO1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX1VTRV9TTUFSVF9SRVBVTFNJT05fUkFOR0VfQ0FMQ1VMQVRJT04gPSB0cnVlO1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPT0xJTkdfRkFDVE9SX0lOQ1JFTUVOVEFMID0gMC44O1xyXG5GRExheW91dENvbnN0YW50cy5NQVhfTk9ERV9ESVNQTEFDRU1FTlRfSU5DUkVNRU5UQUwgPSAxMDAuMDtcclxuRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UID0gRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UX0lOQ1JFTUVOVEFMICogMztcclxuRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCAvIDEwLjA7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkNPTlZFUkdFTkNFX0NIRUNLX1BFUklPRCA9IDEwMDtcclxuRkRMYXlvdXRDb25zdGFudHMuUEVSX0xFVkVMX0lERUFMX0VER0VfTEVOR1RIX0ZBQ1RPUiA9IDAuMTtcclxuRkRMYXlvdXRDb25zdGFudHMuTUlOX0VER0VfTEVOR1RIID0gMTtcclxuRkRMYXlvdXRDb25zdGFudHMuR1JJRF9DQUxDVUxBVElPTl9DSEVDS19QRVJJT0QgPSAxMDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRkRMYXlvdXRDb25zdGFudHM7XHJcbiIsInZhciBMRWRnZSA9IHJlcXVpcmUoJy4vTEVkZ2UnKTtcclxudmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xyXG5cclxuZnVuY3Rpb24gRkRMYXlvdXRFZGdlKHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSkge1xyXG4gIExFZGdlLmNhbGwodGhpcywgc291cmNlLCB0YXJnZXQsIHZFZGdlKTtcclxuICB0aGlzLmlkZWFsTGVuZ3RoID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcclxufVxyXG5cclxuRkRMYXlvdXRFZGdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEVkZ2UucHJvdG90eXBlKTtcclxuXHJcbmZvciAodmFyIHByb3AgaW4gTEVkZ2UpIHtcclxuICBGRExheW91dEVkZ2VbcHJvcF0gPSBMRWRnZVtwcm9wXTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dEVkZ2U7XHJcbiIsInZhciBMTm9kZSA9IHJlcXVpcmUoJy4vTE5vZGUnKTtcclxuXHJcbmZ1bmN0aW9uIEZETGF5b3V0Tm9kZShnbSwgbG9jLCBzaXplLCB2Tm9kZSkge1xyXG4gIC8vIGFsdGVybmF0aXZlIGNvbnN0cnVjdG9yIGlzIGhhbmRsZWQgaW5zaWRlIExOb2RlXHJcbiAgTE5vZGUuY2FsbCh0aGlzLCBnbSwgbG9jLCBzaXplLCB2Tm9kZSk7XHJcbiAgLy9TcHJpbmcsIHJlcHVsc2lvbiBhbmQgZ3Jhdml0YXRpb25hbCBmb3JjZXMgYWN0aW5nIG9uIHRoaXMgbm9kZVxyXG4gIHRoaXMuc3ByaW5nRm9yY2VYID0gMDtcclxuICB0aGlzLnNwcmluZ0ZvcmNlWSA9IDA7XHJcbiAgdGhpcy5yZXB1bHNpb25Gb3JjZVggPSAwO1xyXG4gIHRoaXMucmVwdWxzaW9uRm9yY2VZID0gMDtcclxuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VYID0gMDtcclxuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VZID0gMDtcclxuICAvL0Ftb3VudCBieSB3aGljaCB0aGlzIG5vZGUgaXMgdG8gYmUgbW92ZWQgaW4gdGhpcyBpdGVyYXRpb25cclxuICB0aGlzLmRpc3BsYWNlbWVudFggPSAwO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50WSA9IDA7XHJcblxyXG4gIC8vU3RhcnQgYW5kIGZpbmlzaCBncmlkIGNvb3JkaW5hdGVzIHRoYXQgdGhpcyBub2RlIGlzIGZhbGxlbiBpbnRvXHJcbiAgdGhpcy5zdGFydFggPSAwO1xyXG4gIHRoaXMuZmluaXNoWCA9IDA7XHJcbiAgdGhpcy5zdGFydFkgPSAwO1xyXG4gIHRoaXMuZmluaXNoWSA9IDA7XHJcblxyXG4gIC8vR2VvbWV0cmljIG5laWdoYm9ycyBvZiB0aGlzIG5vZGVcclxuICB0aGlzLnN1cnJvdW5kaW5nID0gW107XHJcbn1cclxuXHJcbkZETGF5b3V0Tm9kZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExOb2RlLnByb3RvdHlwZSk7XHJcblxyXG5mb3IgKHZhciBwcm9wIGluIExOb2RlKSB7XHJcbiAgRkRMYXlvdXROb2RlW3Byb3BdID0gTE5vZGVbcHJvcF07XHJcbn1cclxuXHJcbkZETGF5b3V0Tm9kZS5wcm90b3R5cGUuc2V0R3JpZENvb3JkaW5hdGVzID0gZnVuY3Rpb24gKF9zdGFydFgsIF9maW5pc2hYLCBfc3RhcnRZLCBfZmluaXNoWSlcclxue1xyXG4gIHRoaXMuc3RhcnRYID0gX3N0YXJ0WDtcclxuICB0aGlzLmZpbmlzaFggPSBfZmluaXNoWDtcclxuICB0aGlzLnN0YXJ0WSA9IF9zdGFydFk7XHJcbiAgdGhpcy5maW5pc2hZID0gX2ZpbmlzaFk7XHJcblxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dE5vZGU7XHJcbiIsInZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcclxuXHJcbmZ1bmN0aW9uIEhhc2hNYXAoKSB7XHJcbiAgdGhpcy5tYXAgPSB7fTtcclxuICB0aGlzLmtleXMgPSBbXTtcclxufVxyXG5cclxuSGFzaE1hcC5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuICB2YXIgdGhlSWQgPSBVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChrZXkpO1xyXG4gIGlmICghdGhpcy5jb250YWlucyh0aGVJZCkpIHtcclxuICAgIHRoaXMubWFwW3RoZUlkXSA9IHZhbHVlO1xyXG4gICAgdGhpcy5rZXlzLnB1c2goa2V5KTtcclxuICB9XHJcbn07XHJcblxyXG5IYXNoTWFwLnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChrZXkpIHtcclxuICB2YXIgdGhlSWQgPSBVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChrZXkpO1xyXG4gIHJldHVybiB0aGlzLm1hcFtrZXldICE9IG51bGw7XHJcbn07XHJcblxyXG5IYXNoTWFwLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQoa2V5KTtcclxuICByZXR1cm4gdGhpcy5tYXBbdGhlSWRdO1xyXG59O1xyXG5cclxuSGFzaE1hcC5wcm90b3R5cGUua2V5U2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLmtleXM7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhhc2hNYXA7XHJcbiIsInZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcclxuXHJcbmZ1bmN0aW9uIEhhc2hTZXQoKSB7XHJcbiAgdGhpcy5zZXQgPSB7fTtcclxufVxyXG47XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQob2JqKTtcclxuICBpZiAoIXRoaXMuY29udGFpbnModGhlSWQpKVxyXG4gICAgdGhpcy5zZXRbdGhlSWRdID0gb2JqO1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIGRlbGV0ZSB0aGlzLnNldFtVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChvYmopXTtcclxufTtcclxuXHJcbkhhc2hTZXQucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xyXG4gIHRoaXMuc2V0ID0ge307XHJcbn07XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChvYmopIHtcclxuICByZXR1cm4gdGhpcy5zZXRbVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQob2JqKV0gPT0gb2JqO1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUuaXNFbXB0eSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5zaXplKCkgPT09IDA7XHJcbn07XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnNldCkubGVuZ3RoO1xyXG59O1xyXG5cclxuLy9jb25jYXRzIHRoaXMuc2V0IHRvIHRoZSBnaXZlbiBsaXN0XHJcbkhhc2hTZXQucHJvdG90eXBlLmFkZEFsbFRvID0gZnVuY3Rpb24gKGxpc3QpIHtcclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc2V0KTtcclxuICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgbGlzdC5wdXNoKHRoaXMuc2V0W2tleXNbaV1dKTtcclxuICB9XHJcbn07XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnNldCkubGVuZ3RoO1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUuYWRkQWxsID0gZnVuY3Rpb24gKGxpc3QpIHtcclxuICB2YXIgcyA9IGxpc3QubGVuZ3RoO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKSB7XHJcbiAgICB2YXIgdiA9IGxpc3RbaV07XHJcbiAgICB0aGlzLmFkZCh2KTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhhc2hTZXQ7XHJcbiIsImZ1bmN0aW9uIElHZW9tZXRyeSgpIHtcclxufVxyXG5cclxuSUdlb21ldHJ5LmNhbGNTZXBhcmF0aW9uQW1vdW50ID0gZnVuY3Rpb24gKHJlY3RBLCByZWN0Qiwgb3ZlcmxhcEFtb3VudCwgc2VwYXJhdGlvbkJ1ZmZlcilcclxue1xyXG4gIGlmICghcmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpIHtcclxuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gIH1cclxuICB2YXIgZGlyZWN0aW9ucyA9IG5ldyBBcnJheSgyKTtcclxuICBJR2VvbWV0cnkuZGVjaWRlRGlyZWN0aW9uc0Zvck92ZXJsYXBwaW5nTm9kZXMocmVjdEEsIHJlY3RCLCBkaXJlY3Rpb25zKTtcclxuICBvdmVybGFwQW1vdW50WzBdID0gTWF0aC5taW4ocmVjdEEuZ2V0UmlnaHQoKSwgcmVjdEIuZ2V0UmlnaHQoKSkgLVxyXG4gICAgICAgICAgTWF0aC5tYXgocmVjdEEueCwgcmVjdEIueCk7XHJcbiAgb3ZlcmxhcEFtb3VudFsxXSA9IE1hdGgubWluKHJlY3RBLmdldEJvdHRvbSgpLCByZWN0Qi5nZXRCb3R0b20oKSkgLVxyXG4gICAgICAgICAgTWF0aC5tYXgocmVjdEEueSwgcmVjdEIueSk7XHJcbiAgLy8gdXBkYXRlIHRoZSBvdmVybGFwcGluZyBhbW91bnRzIGZvciB0aGUgZm9sbG93aW5nIGNhc2VzOlxyXG4gIGlmICgocmVjdEEuZ2V0WCgpIDw9IHJlY3RCLmdldFgoKSkgJiYgKHJlY3RBLmdldFJpZ2h0KCkgPj0gcmVjdEIuZ2V0UmlnaHQoKSkpXHJcbiAge1xyXG4gICAgb3ZlcmxhcEFtb3VudFswXSArPSBNYXRoLm1pbigocmVjdEIuZ2V0WCgpIC0gcmVjdEEuZ2V0WCgpKSxcclxuICAgICAgICAgICAgKHJlY3RBLmdldFJpZ2h0KCkgLSByZWN0Qi5nZXRSaWdodCgpKSk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKChyZWN0Qi5nZXRYKCkgPD0gcmVjdEEuZ2V0WCgpKSAmJiAocmVjdEIuZ2V0UmlnaHQoKSA+PSByZWN0QS5nZXRSaWdodCgpKSlcclxuICB7XHJcbiAgICBvdmVybGFwQW1vdW50WzBdICs9IE1hdGgubWluKChyZWN0QS5nZXRYKCkgLSByZWN0Qi5nZXRYKCkpLFxyXG4gICAgICAgICAgICAocmVjdEIuZ2V0UmlnaHQoKSAtIHJlY3RBLmdldFJpZ2h0KCkpKTtcclxuICB9XHJcbiAgaWYgKChyZWN0QS5nZXRZKCkgPD0gcmVjdEIuZ2V0WSgpKSAmJiAocmVjdEEuZ2V0Qm90dG9tKCkgPj0gcmVjdEIuZ2V0Qm90dG9tKCkpKVxyXG4gIHtcclxuICAgIG92ZXJsYXBBbW91bnRbMV0gKz0gTWF0aC5taW4oKHJlY3RCLmdldFkoKSAtIHJlY3RBLmdldFkoKSksXHJcbiAgICAgICAgICAgIChyZWN0QS5nZXRCb3R0b20oKSAtIHJlY3RCLmdldEJvdHRvbSgpKSk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKChyZWN0Qi5nZXRZKCkgPD0gcmVjdEEuZ2V0WSgpKSAmJiAocmVjdEIuZ2V0Qm90dG9tKCkgPj0gcmVjdEEuZ2V0Qm90dG9tKCkpKVxyXG4gIHtcclxuICAgIG92ZXJsYXBBbW91bnRbMV0gKz0gTWF0aC5taW4oKHJlY3RBLmdldFkoKSAtIHJlY3RCLmdldFkoKSksXHJcbiAgICAgICAgICAgIChyZWN0Qi5nZXRCb3R0b20oKSAtIHJlY3RBLmdldEJvdHRvbSgpKSk7XHJcbiAgfVxyXG5cclxuICAvLyBmaW5kIHNsb3BlIG9mIHRoZSBsaW5lIHBhc3NlcyB0d28gY2VudGVyc1xyXG4gIHZhciBzbG9wZSA9IE1hdGguYWJzKChyZWN0Qi5nZXRDZW50ZXJZKCkgLSByZWN0QS5nZXRDZW50ZXJZKCkpIC9cclxuICAgICAgICAgIChyZWN0Qi5nZXRDZW50ZXJYKCkgLSByZWN0QS5nZXRDZW50ZXJYKCkpKTtcclxuICAvLyBpZiBjZW50ZXJzIGFyZSBvdmVybGFwcGVkXHJcbiAgaWYgKChyZWN0Qi5nZXRDZW50ZXJZKCkgPT0gcmVjdEEuZ2V0Q2VudGVyWSgpKSAmJlxyXG4gICAgICAgICAgKHJlY3RCLmdldENlbnRlclgoKSA9PSByZWN0QS5nZXRDZW50ZXJYKCkpKVxyXG4gIHtcclxuICAgIC8vIGFzc3VtZSB0aGUgc2xvcGUgaXMgMSAoNDUgZGVncmVlKVxyXG4gICAgc2xvcGUgPSAxLjA7XHJcbiAgfVxyXG5cclxuICB2YXIgbW92ZUJ5WSA9IHNsb3BlICogb3ZlcmxhcEFtb3VudFswXTtcclxuICB2YXIgbW92ZUJ5WCA9IG92ZXJsYXBBbW91bnRbMV0gLyBzbG9wZTtcclxuICBpZiAob3ZlcmxhcEFtb3VudFswXSA8IG1vdmVCeVgpXHJcbiAge1xyXG4gICAgbW92ZUJ5WCA9IG92ZXJsYXBBbW91bnRbMF07XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICBtb3ZlQnlZID0gb3ZlcmxhcEFtb3VudFsxXTtcclxuICB9XHJcbiAgLy8gcmV0dXJuIGhhbGYgdGhlIGFtb3VudCBzbyB0aGF0IGlmIGVhY2ggcmVjdGFuZ2xlIGlzIG1vdmVkIGJ5IHRoZXNlXHJcbiAgLy8gYW1vdW50cyBpbiBvcHBvc2l0ZSBkaXJlY3Rpb25zLCBvdmVybGFwIHdpbGwgYmUgcmVzb2x2ZWRcclxuICBvdmVybGFwQW1vdW50WzBdID0gLTEgKiBkaXJlY3Rpb25zWzBdICogKChtb3ZlQnlYIC8gMikgKyBzZXBhcmF0aW9uQnVmZmVyKTtcclxuICBvdmVybGFwQW1vdW50WzFdID0gLTEgKiBkaXJlY3Rpb25zWzFdICogKChtb3ZlQnlZIC8gMikgKyBzZXBhcmF0aW9uQnVmZmVyKTtcclxufVxyXG5cclxuSUdlb21ldHJ5LmRlY2lkZURpcmVjdGlvbnNGb3JPdmVybGFwcGluZ05vZGVzID0gZnVuY3Rpb24gKHJlY3RBLCByZWN0QiwgZGlyZWN0aW9ucylcclxue1xyXG4gIGlmIChyZWN0QS5nZXRDZW50ZXJYKCkgPCByZWN0Qi5nZXRDZW50ZXJYKCkpXHJcbiAge1xyXG4gICAgZGlyZWN0aW9uc1swXSA9IC0xO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgZGlyZWN0aW9uc1swXSA9IDE7XHJcbiAgfVxyXG5cclxuICBpZiAocmVjdEEuZ2V0Q2VudGVyWSgpIDwgcmVjdEIuZ2V0Q2VudGVyWSgpKVxyXG4gIHtcclxuICAgIGRpcmVjdGlvbnNbMV0gPSAtMTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIGRpcmVjdGlvbnNbMV0gPSAxO1xyXG4gIH1cclxufVxyXG5cclxuSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbjIgPSBmdW5jdGlvbiAocmVjdEEsIHJlY3RCLCByZXN1bHQpXHJcbntcclxuICAvL3Jlc3VsdFswLTFdIHdpbGwgY29udGFpbiBjbGlwUG9pbnQgb2YgcmVjdEEsIHJlc3VsdFsyLTNdIHdpbGwgY29udGFpbiBjbGlwUG9pbnQgb2YgcmVjdEJcclxuICB2YXIgcDF4ID0gcmVjdEEuZ2V0Q2VudGVyWCgpO1xyXG4gIHZhciBwMXkgPSByZWN0QS5nZXRDZW50ZXJZKCk7XHJcbiAgdmFyIHAyeCA9IHJlY3RCLmdldENlbnRlclgoKTtcclxuICB2YXIgcDJ5ID0gcmVjdEIuZ2V0Q2VudGVyWSgpO1xyXG5cclxuICAvL2lmIHR3byByZWN0YW5nbGVzIGludGVyc2VjdCwgdGhlbiBjbGlwcGluZyBwb2ludHMgYXJlIGNlbnRlcnNcclxuICBpZiAocmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpXHJcbiAge1xyXG4gICAgcmVzdWx0WzBdID0gcDF4O1xyXG4gICAgcmVzdWx0WzFdID0gcDF5O1xyXG4gICAgcmVzdWx0WzJdID0gcDJ4O1xyXG4gICAgcmVzdWx0WzNdID0gcDJ5O1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIC8vdmFyaWFibGVzIGZvciByZWN0QVxyXG4gIHZhciB0b3BMZWZ0QXggPSByZWN0QS5nZXRYKCk7XHJcbiAgdmFyIHRvcExlZnRBeSA9IHJlY3RBLmdldFkoKTtcclxuICB2YXIgdG9wUmlnaHRBeCA9IHJlY3RBLmdldFJpZ2h0KCk7XHJcbiAgdmFyIGJvdHRvbUxlZnRBeCA9IHJlY3RBLmdldFgoKTtcclxuICB2YXIgYm90dG9tTGVmdEF5ID0gcmVjdEEuZ2V0Qm90dG9tKCk7XHJcbiAgdmFyIGJvdHRvbVJpZ2h0QXggPSByZWN0QS5nZXRSaWdodCgpO1xyXG4gIHZhciBoYWxmV2lkdGhBID0gcmVjdEEuZ2V0V2lkdGhIYWxmKCk7XHJcbiAgdmFyIGhhbGZIZWlnaHRBID0gcmVjdEEuZ2V0SGVpZ2h0SGFsZigpO1xyXG4gIC8vdmFyaWFibGVzIGZvciByZWN0QlxyXG4gIHZhciB0b3BMZWZ0QnggPSByZWN0Qi5nZXRYKCk7XHJcbiAgdmFyIHRvcExlZnRCeSA9IHJlY3RCLmdldFkoKTtcclxuICB2YXIgdG9wUmlnaHRCeCA9IHJlY3RCLmdldFJpZ2h0KCk7XHJcbiAgdmFyIGJvdHRvbUxlZnRCeCA9IHJlY3RCLmdldFgoKTtcclxuICB2YXIgYm90dG9tTGVmdEJ5ID0gcmVjdEIuZ2V0Qm90dG9tKCk7XHJcbiAgdmFyIGJvdHRvbVJpZ2h0QnggPSByZWN0Qi5nZXRSaWdodCgpO1xyXG4gIHZhciBoYWxmV2lkdGhCID0gcmVjdEIuZ2V0V2lkdGhIYWxmKCk7XHJcbiAgdmFyIGhhbGZIZWlnaHRCID0gcmVjdEIuZ2V0SGVpZ2h0SGFsZigpO1xyXG4gIC8vZmxhZyB3aGV0aGVyIGNsaXBwaW5nIHBvaW50cyBhcmUgZm91bmRcclxuICB2YXIgY2xpcFBvaW50QUZvdW5kID0gZmFsc2U7XHJcbiAgdmFyIGNsaXBQb2ludEJGb3VuZCA9IGZhbHNlO1xyXG5cclxuICAvLyBsaW5lIGlzIHZlcnRpY2FsXHJcbiAgaWYgKHAxeCA9PSBwMngpXHJcbiAge1xyXG4gICAgaWYgKHAxeSA+IHAyeSlcclxuICAgIHtcclxuICAgICAgcmVzdWx0WzBdID0gcDF4O1xyXG4gICAgICByZXN1bHRbMV0gPSB0b3BMZWZ0QXk7XHJcbiAgICAgIHJlc3VsdFsyXSA9IHAyeDtcclxuICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChwMXkgPCBwMnkpXHJcbiAgICB7XHJcbiAgICAgIHJlc3VsdFswXSA9IHAxeDtcclxuICAgICAgcmVzdWx0WzFdID0gYm90dG9tTGVmdEF5O1xyXG4gICAgICByZXN1bHRbMl0gPSBwMng7XHJcbiAgICAgIHJlc3VsdFszXSA9IHRvcExlZnRCeTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICAvL25vdCBsaW5lLCByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gbGluZSBpcyBob3Jpem9udGFsXHJcbiAgZWxzZSBpZiAocDF5ID09IHAyeSlcclxuICB7XHJcbiAgICBpZiAocDF4ID4gcDJ4KVxyXG4gICAge1xyXG4gICAgICByZXN1bHRbMF0gPSB0b3BMZWZ0QXg7XHJcbiAgICAgIHJlc3VsdFsxXSA9IHAxeTtcclxuICAgICAgcmVzdWx0WzJdID0gdG9wUmlnaHRCeDtcclxuICAgICAgcmVzdWx0WzNdID0gcDJ5O1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChwMXggPCBwMngpXHJcbiAgICB7XHJcbiAgICAgIHJlc3VsdFswXSA9IHRvcFJpZ2h0QXg7XHJcbiAgICAgIHJlc3VsdFsxXSA9IHAxeTtcclxuICAgICAgcmVzdWx0WzJdID0gdG9wTGVmdEJ4O1xyXG4gICAgICByZXN1bHRbM10gPSBwMnk7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgLy9ub3QgdmFsaWQgbGluZSwgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICAvL3Nsb3BlcyBvZiByZWN0QSdzIGFuZCByZWN0QidzIGRpYWdvbmFsc1xyXG4gICAgdmFyIHNsb3BlQSA9IHJlY3RBLmhlaWdodCAvIHJlY3RBLndpZHRoO1xyXG4gICAgdmFyIHNsb3BlQiA9IHJlY3RCLmhlaWdodCAvIHJlY3RCLndpZHRoO1xyXG5cclxuICAgIC8vc2xvcGUgb2YgbGluZSBiZXR3ZWVuIGNlbnRlciBvZiByZWN0QSBhbmQgY2VudGVyIG9mIHJlY3RCXHJcbiAgICB2YXIgc2xvcGVQcmltZSA9IChwMnkgLSBwMXkpIC8gKHAyeCAtIHAxeCk7XHJcbiAgICB2YXIgY2FyZGluYWxEaXJlY3Rpb25BO1xyXG4gICAgdmFyIGNhcmRpbmFsRGlyZWN0aW9uQjtcclxuICAgIHZhciB0ZW1wUG9pbnRBeDtcclxuICAgIHZhciB0ZW1wUG9pbnRBeTtcclxuICAgIHZhciB0ZW1wUG9pbnRCeDtcclxuICAgIHZhciB0ZW1wUG9pbnRCeTtcclxuXHJcbiAgICAvL2RldGVybWluZSB3aGV0aGVyIGNsaXBwaW5nIHBvaW50IGlzIHRoZSBjb3JuZXIgb2Ygbm9kZUFcclxuICAgIGlmICgoLXNsb3BlQSkgPT0gc2xvcGVQcmltZSlcclxuICAgIHtcclxuICAgICAgaWYgKHAxeCA+IHAyeClcclxuICAgICAge1xyXG4gICAgICAgIHJlc3VsdFswXSA9IGJvdHRvbUxlZnRBeDtcclxuICAgICAgICByZXN1bHRbMV0gPSBib3R0b21MZWZ0QXk7XHJcbiAgICAgICAgY2xpcFBvaW50QUZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMF0gPSB0b3BSaWdodEF4O1xyXG4gICAgICAgIHJlc3VsdFsxXSA9IHRvcExlZnRBeTtcclxuICAgICAgICBjbGlwUG9pbnRBRm91bmQgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChzbG9wZUEgPT0gc2xvcGVQcmltZSlcclxuICAgIHtcclxuICAgICAgaWYgKHAxeCA+IHAyeClcclxuICAgICAge1xyXG4gICAgICAgIHJlc3VsdFswXSA9IHRvcExlZnRBeDtcclxuICAgICAgICByZXN1bHRbMV0gPSB0b3BMZWZ0QXk7XHJcbiAgICAgICAgY2xpcFBvaW50QUZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMF0gPSBib3R0b21SaWdodEF4O1xyXG4gICAgICAgIHJlc3VsdFsxXSA9IGJvdHRvbUxlZnRBeTtcclxuICAgICAgICBjbGlwUG9pbnRBRm91bmQgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy9kZXRlcm1pbmUgd2hldGhlciBjbGlwcGluZyBwb2ludCBpcyB0aGUgY29ybmVyIG9mIG5vZGVCXHJcbiAgICBpZiAoKC1zbG9wZUIpID09IHNsb3BlUHJpbWUpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMnggPiBwMXgpXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMl0gPSBib3R0b21MZWZ0Qng7XHJcbiAgICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xyXG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgcmVzdWx0WzJdID0gdG9wUmlnaHRCeDtcclxuICAgICAgICByZXN1bHRbM10gPSB0b3BMZWZ0Qnk7XHJcbiAgICAgICAgY2xpcFBvaW50QkZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoc2xvcGVCID09IHNsb3BlUHJpbWUpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMnggPiBwMXgpXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMl0gPSB0b3BMZWZ0Qng7XHJcbiAgICAgICAgcmVzdWx0WzNdID0gdG9wTGVmdEJ5O1xyXG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgcmVzdWx0WzJdID0gYm90dG9tUmlnaHRCeDtcclxuICAgICAgICByZXN1bHRbM10gPSBib3R0b21MZWZ0Qnk7XHJcbiAgICAgICAgY2xpcFBvaW50QkZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vaWYgYm90aCBjbGlwcGluZyBwb2ludHMgYXJlIGNvcm5lcnNcclxuICAgIGlmIChjbGlwUG9pbnRBRm91bmQgJiYgY2xpcFBvaW50QkZvdW5kKVxyXG4gICAge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy9kZXRlcm1pbmUgQ2FyZGluYWwgRGlyZWN0aW9uIG9mIHJlY3RhbmdsZXNcclxuICAgIGlmIChwMXggPiBwMngpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMXkgPiBwMnkpXHJcbiAgICAgIHtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oc2xvcGVBLCBzbG9wZVByaW1lLCA0KTtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkIgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oc2xvcGVCLCBzbG9wZVByaW1lLCAyKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oLXNsb3BlQSwgc2xvcGVQcmltZSwgMyk7XHJcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKC1zbG9wZUIsIHNsb3BlUHJpbWUsIDEpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMXkgPiBwMnkpXHJcbiAgICAgIHtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oLXNsb3BlQSwgc2xvcGVQcmltZSwgMSk7XHJcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKC1zbG9wZUIsIHNsb3BlUHJpbWUsIDMpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2VcclxuICAgICAge1xyXG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQSA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbihzbG9wZUEsIHNsb3BlUHJpbWUsIDIpO1xyXG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQiA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbihzbG9wZUIsIHNsb3BlUHJpbWUsIDQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvL2NhbGN1bGF0ZSBjbGlwcGluZyBQb2ludCBpZiBpdCBpcyBub3QgZm91bmQgYmVmb3JlXHJcbiAgICBpZiAoIWNsaXBQb2ludEFGb3VuZClcclxuICAgIHtcclxuICAgICAgc3dpdGNoIChjYXJkaW5hbERpcmVjdGlvbkEpXHJcbiAgICAgIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeSA9IHRvcExlZnRBeTtcclxuICAgICAgICAgIHRlbXBQb2ludEF4ID0gcDF4ICsgKC1oYWxmSGVpZ2h0QSkgLyBzbG9wZVByaW1lO1xyXG4gICAgICAgICAgcmVzdWx0WzBdID0gdGVtcFBvaW50QXg7XHJcbiAgICAgICAgICByZXN1bHRbMV0gPSB0ZW1wUG9pbnRBeTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgIHRlbXBQb2ludEF4ID0gYm90dG9tUmlnaHRBeDtcclxuICAgICAgICAgIHRlbXBQb2ludEF5ID0gcDF5ICsgaGFsZldpZHRoQSAqIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMF0gPSB0ZW1wUG9pbnRBeDtcclxuICAgICAgICAgIHJlc3VsdFsxXSA9IHRlbXBQb2ludEF5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgdGVtcFBvaW50QXkgPSBib3R0b21MZWZ0QXk7XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeCA9IHAxeCArIGhhbGZIZWlnaHRBIC8gc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFswXSA9IHRlbXBQb2ludEF4O1xyXG4gICAgICAgICAgcmVzdWx0WzFdID0gdGVtcFBvaW50QXk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeCA9IGJvdHRvbUxlZnRBeDtcclxuICAgICAgICAgIHRlbXBQb2ludEF5ID0gcDF5ICsgKC1oYWxmV2lkdGhBKSAqIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMF0gPSB0ZW1wUG9pbnRBeDtcclxuICAgICAgICAgIHJlc3VsdFsxXSA9IHRlbXBQb2ludEF5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICghY2xpcFBvaW50QkZvdW5kKVxyXG4gICAge1xyXG4gICAgICBzd2l0Y2ggKGNhcmRpbmFsRGlyZWN0aW9uQilcclxuICAgICAge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgIHRlbXBQb2ludEJ5ID0gdG9wTGVmdEJ5O1xyXG4gICAgICAgICAgdGVtcFBvaW50QnggPSBwMnggKyAoLWhhbGZIZWlnaHRCKSAvIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMl0gPSB0ZW1wUG9pbnRCeDtcclxuICAgICAgICAgIHJlc3VsdFszXSA9IHRlbXBQb2ludEJ5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgdGVtcFBvaW50QnggPSBib3R0b21SaWdodEJ4O1xyXG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBwMnkgKyBoYWxmV2lkdGhCICogc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFsyXSA9IHRlbXBQb2ludEJ4O1xyXG4gICAgICAgICAgcmVzdWx0WzNdID0gdGVtcFBvaW50Qnk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRCeSA9IGJvdHRvbUxlZnRCeTtcclxuICAgICAgICAgIHRlbXBQb2ludEJ4ID0gcDJ4ICsgaGFsZkhlaWdodEIgLyBzbG9wZVByaW1lO1xyXG4gICAgICAgICAgcmVzdWx0WzJdID0gdGVtcFBvaW50Qng7XHJcbiAgICAgICAgICByZXN1bHRbM10gPSB0ZW1wUG9pbnRCeTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgIHRlbXBQb2ludEJ4ID0gYm90dG9tTGVmdEJ4O1xyXG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBwMnkgKyAoLWhhbGZXaWR0aEIpICogc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFsyXSA9IHRlbXBQb2ludEJ4O1xyXG4gICAgICAgICAgcmVzdWx0WzNdID0gdGVtcFBvaW50Qnk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbklHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbiA9IGZ1bmN0aW9uIChzbG9wZSwgc2xvcGVQcmltZSwgbGluZSlcclxue1xyXG4gIGlmIChzbG9wZSA+IHNsb3BlUHJpbWUpXHJcbiAge1xyXG4gICAgcmV0dXJuIGxpbmU7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICByZXR1cm4gMSArIGxpbmUgJSA0O1xyXG4gIH1cclxufVxyXG5cclxuSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbiA9IGZ1bmN0aW9uIChzMSwgczIsIGYxLCBmMilcclxue1xyXG4gIGlmIChmMiA9PSBudWxsKSB7XHJcbiAgICByZXR1cm4gSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbjIoczEsIHMyLCBmMSk7XHJcbiAgfVxyXG4gIHZhciB4MSA9IHMxLng7XHJcbiAgdmFyIHkxID0gczEueTtcclxuICB2YXIgeDIgPSBzMi54O1xyXG4gIHZhciB5MiA9IHMyLnk7XHJcbiAgdmFyIHgzID0gZjEueDtcclxuICB2YXIgeTMgPSBmMS55O1xyXG4gIHZhciB4NCA9IGYyLng7XHJcbiAgdmFyIHk0ID0gZjIueTtcclxuICB2YXIgeCwgeTsgLy8gaW50ZXJzZWN0aW9uIHBvaW50XHJcbiAgdmFyIGExLCBhMiwgYjEsIGIyLCBjMSwgYzI7IC8vIGNvZWZmaWNpZW50cyBvZiBsaW5lIGVxbnMuXHJcbiAgdmFyIGRlbm9tO1xyXG5cclxuICBhMSA9IHkyIC0geTE7XHJcbiAgYjEgPSB4MSAtIHgyO1xyXG4gIGMxID0geDIgKiB5MSAtIHgxICogeTI7ICAvLyB7IGExKnggKyBiMSp5ICsgYzEgPSAwIGlzIGxpbmUgMSB9XHJcblxyXG4gIGEyID0geTQgLSB5MztcclxuICBiMiA9IHgzIC0geDQ7XHJcbiAgYzIgPSB4NCAqIHkzIC0geDMgKiB5NDsgIC8vIHsgYTIqeCArIGIyKnkgKyBjMiA9IDAgaXMgbGluZSAyIH1cclxuXHJcbiAgZGVub20gPSBhMSAqIGIyIC0gYTIgKiBiMTtcclxuXHJcbiAgaWYgKGRlbm9tID09IDApXHJcbiAge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICB4ID0gKGIxICogYzIgLSBiMiAqIGMxKSAvIGRlbm9tO1xyXG4gIHkgPSAoYTIgKiBjMSAtIGExICogYzIpIC8gZGVub207XHJcblxyXG4gIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFNlY3Rpb246IENsYXNzIENvbnN0YW50c1xyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vKipcclxuICogU29tZSB1c2VmdWwgcHJlLWNhbGN1bGF0ZWQgY29uc3RhbnRzXHJcbiAqL1xyXG5JR2VvbWV0cnkuSEFMRl9QSSA9IDAuNSAqIE1hdGguUEk7XHJcbklHZW9tZXRyeS5PTkVfQU5EX0hBTEZfUEkgPSAxLjUgKiBNYXRoLlBJO1xyXG5JR2VvbWV0cnkuVFdPX1BJID0gMi4wICogTWF0aC5QSTtcclxuSUdlb21ldHJ5LlRIUkVFX1BJID0gMy4wICogTWF0aC5QSTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSUdlb21ldHJ5O1xyXG4iLCJmdW5jdGlvbiBJTWF0aCgpIHtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIHJldHVybnMgdGhlIHNpZ24gb2YgdGhlIGlucHV0IHZhbHVlLlxyXG4gKi9cclxuSU1hdGguc2lnbiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gIGlmICh2YWx1ZSA+IDApXHJcbiAge1xyXG4gICAgcmV0dXJuIDE7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHZhbHVlIDwgMClcclxuICB7XHJcbiAgICByZXR1cm4gLTE7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICByZXR1cm4gMDtcclxuICB9XHJcbn1cclxuXHJcbklNYXRoLmZsb29yID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgcmV0dXJuIHZhbHVlIDwgMCA/IE1hdGguY2VpbCh2YWx1ZSkgOiBNYXRoLmZsb29yKHZhbHVlKTtcclxufVxyXG5cclxuSU1hdGguY2VpbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gIHJldHVybiB2YWx1ZSA8IDAgPyBNYXRoLmZsb29yKHZhbHVlKSA6IE1hdGguY2VpbCh2YWx1ZSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSU1hdGg7XHJcbiIsImZ1bmN0aW9uIEludGVnZXIoKSB7XHJcbn1cclxuXHJcbkludGVnZXIuTUFYX1ZBTFVFID0gMjE0NzQ4MzY0NztcclxuSW50ZWdlci5NSU5fVkFMVUUgPSAtMjE0NzQ4MzY0ODtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSW50ZWdlcjtcclxuIiwidmFyIExHcmFwaE9iamVjdCA9IHJlcXVpcmUoJy4vTEdyYXBoT2JqZWN0Jyk7XHJcbnZhciBJR2VvbWV0cnkgPSByZXF1aXJlKCcuL0lHZW9tZXRyeScpO1xyXG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XHJcblxyXG5mdW5jdGlvbiBMRWRnZShzb3VyY2UsIHRhcmdldCwgdkVkZ2UpIHtcclxuICBMR3JhcGhPYmplY3QuY2FsbCh0aGlzLCB2RWRnZSk7XHJcblxyXG4gIHRoaXMuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0ID0gZmFsc2U7XHJcbiAgdGhpcy52R3JhcGhPYmplY3QgPSB2RWRnZTtcclxuICB0aGlzLmJlbmRwb2ludHMgPSBbXTtcclxuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcclxuICB0aGlzLnRhcmdldCA9IHRhcmdldDtcclxufVxyXG5cclxuTEVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGhPYmplY3QucHJvdG90eXBlKTtcclxuXHJcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoT2JqZWN0KSB7XHJcbiAgTEVkZ2VbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XHJcbn1cclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRTb3VyY2UgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuc291cmNlO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmdldFRhcmdldCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy50YXJnZXQ7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuaXNJbnRlckdyYXBoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmlzSW50ZXJHcmFwaDtcclxufTtcclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRMZW5ndGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGVuZ3RoO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5pc092ZXJsYXBpbmdTb3VyY2VBbmRUYXJnZXQ7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0QmVuZHBvaW50cyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5iZW5kcG9pbnRzO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmdldExjYSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sY2E7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0U291cmNlSW5MY2EgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuc291cmNlSW5MY2E7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0VGFyZ2V0SW5MY2EgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMudGFyZ2V0SW5MY2E7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0T3RoZXJFbmQgPSBmdW5jdGlvbiAobm9kZSlcclxue1xyXG4gIGlmICh0aGlzLnNvdXJjZSA9PT0gbm9kZSlcclxuICB7XHJcbiAgICByZXR1cm4gdGhpcy50YXJnZXQ7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHRoaXMudGFyZ2V0ID09PSBub2RlKVxyXG4gIHtcclxuICAgIHJldHVybiB0aGlzLnNvdXJjZTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIHRocm93IFwiTm9kZSBpcyBub3QgaW5jaWRlbnQgd2l0aCB0aGlzIGVkZ2VcIjtcclxuICB9XHJcbn1cclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRPdGhlckVuZEluR3JhcGggPSBmdW5jdGlvbiAobm9kZSwgZ3JhcGgpXHJcbntcclxuICB2YXIgb3RoZXJFbmQgPSB0aGlzLmdldE90aGVyRW5kKG5vZGUpO1xyXG4gIHZhciByb290ID0gZ3JhcGguZ2V0R3JhcGhNYW5hZ2VyKCkuZ2V0Um9vdCgpO1xyXG5cclxuICB3aGlsZSAodHJ1ZSlcclxuICB7XHJcbiAgICBpZiAob3RoZXJFbmQuZ2V0T3duZXIoKSA9PSBncmFwaClcclxuICAgIHtcclxuICAgICAgcmV0dXJuIG90aGVyRW5kO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvdGhlckVuZC5nZXRPd25lcigpID09IHJvb3QpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIG90aGVyRW5kID0gb3RoZXJFbmQuZ2V0T3duZXIoKS5nZXRQYXJlbnQoKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBudWxsO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLnVwZGF0ZUxlbmd0aCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgY2xpcFBvaW50Q29vcmRpbmF0ZXMgPSBuZXcgQXJyYXkoNCk7XHJcblxyXG4gIHRoaXMuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0ID1cclxuICAgICAgICAgIElHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24odGhpcy50YXJnZXQuZ2V0UmVjdCgpLFxyXG4gICAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZS5nZXRSZWN0KCksXHJcbiAgICAgICAgICAgICAgICAgIGNsaXBQb2ludENvb3JkaW5hdGVzKTtcclxuXHJcbiAgaWYgKCF0aGlzLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldClcclxuICB7XHJcbiAgICB0aGlzLmxlbmd0aFggPSBjbGlwUG9pbnRDb29yZGluYXRlc1swXSAtIGNsaXBQb2ludENvb3JkaW5hdGVzWzJdO1xyXG4gICAgdGhpcy5sZW5ndGhZID0gY2xpcFBvaW50Q29vcmRpbmF0ZXNbMV0gLSBjbGlwUG9pbnRDb29yZGluYXRlc1szXTtcclxuXHJcbiAgICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhYKSA8IDEuMClcclxuICAgIHtcclxuICAgICAgdGhpcy5sZW5ndGhYID0gSU1hdGguc2lnbih0aGlzLmxlbmd0aFgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChNYXRoLmFicyh0aGlzLmxlbmd0aFkpIDwgMS4wKVxyXG4gICAge1xyXG4gICAgICB0aGlzLmxlbmd0aFkgPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sZW5ndGggPSBNYXRoLnNxcnQoXHJcbiAgICAgICAgICAgIHRoaXMubGVuZ3RoWCAqIHRoaXMubGVuZ3RoWCArIHRoaXMubGVuZ3RoWSAqIHRoaXMubGVuZ3RoWSk7XHJcbiAgfVxyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLnVwZGF0ZUxlbmd0aFNpbXBsZSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB0aGlzLmxlbmd0aFggPSB0aGlzLnRhcmdldC5nZXRDZW50ZXJYKCkgLSB0aGlzLnNvdXJjZS5nZXRDZW50ZXJYKCk7XHJcbiAgdGhpcy5sZW5ndGhZID0gdGhpcy50YXJnZXQuZ2V0Q2VudGVyWSgpIC0gdGhpcy5zb3VyY2UuZ2V0Q2VudGVyWSgpO1xyXG5cclxuICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhYKSA8IDEuMClcclxuICB7XHJcbiAgICB0aGlzLmxlbmd0aFggPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWCk7XHJcbiAgfVxyXG5cclxuICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhZKSA8IDEuMClcclxuICB7XHJcbiAgICB0aGlzLmxlbmd0aFkgPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWSk7XHJcbiAgfVxyXG5cclxuICB0aGlzLmxlbmd0aCA9IE1hdGguc3FydChcclxuICAgICAgICAgIHRoaXMubGVuZ3RoWCAqIHRoaXMubGVuZ3RoWCArIHRoaXMubGVuZ3RoWSAqIHRoaXMubGVuZ3RoWSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTEVkZ2U7XHJcbiIsInZhciBMR3JhcGhPYmplY3QgPSByZXF1aXJlKCcuL0xHcmFwaE9iamVjdCcpO1xyXG52YXIgSW50ZWdlciA9IHJlcXVpcmUoJy4vSW50ZWdlcicpO1xyXG52YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcclxudmFyIExHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0xHcmFwaE1hbmFnZXInKTtcclxudmFyIExOb2RlID0gcmVxdWlyZSgnLi9MTm9kZScpO1xyXG52YXIgTEVkZ2UgPSByZXF1aXJlKCcuL0xFZGdlJyk7XHJcbnZhciBIYXNoU2V0ID0gcmVxdWlyZSgnLi9IYXNoU2V0Jyk7XHJcbnZhciBSZWN0YW5nbGVEID0gcmVxdWlyZSgnLi9SZWN0YW5nbGVEJyk7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vUG9pbnQnKTtcclxuXHJcbmZ1bmN0aW9uIExHcmFwaChwYXJlbnQsIG9iajIsIHZHcmFwaCkge1xyXG4gIExHcmFwaE9iamVjdC5jYWxsKHRoaXMsIHZHcmFwaCk7XHJcbiAgdGhpcy5lc3RpbWF0ZWRTaXplID0gSW50ZWdlci5NSU5fVkFMVUU7XHJcbiAgdGhpcy5tYXJnaW4gPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFQSF9NQVJHSU47XHJcbiAgdGhpcy5lZGdlcyA9IFtdO1xyXG4gIHRoaXMubm9kZXMgPSBbXTtcclxuICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2U7XHJcbiAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcblxyXG4gIGlmIChvYmoyICE9IG51bGwgJiYgb2JqMiBpbnN0YW5jZW9mIExHcmFwaE1hbmFnZXIpIHtcclxuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyID0gb2JqMjtcclxuICB9XHJcbiAgZWxzZSBpZiAob2JqMiAhPSBudWxsICYmIG9iajIgaW5zdGFuY2VvZiBMYXlvdXQpIHtcclxuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyID0gb2JqMi5ncmFwaE1hbmFnZXI7XHJcbiAgfVxyXG59XHJcblxyXG5MR3JhcGgucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGhPYmplY3QucHJvdG90eXBlKTtcclxuZm9yICh2YXIgcHJvcCBpbiBMR3JhcGhPYmplY3QpIHtcclxuICBMR3JhcGhbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XHJcbn1cclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0Tm9kZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMubm9kZXM7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldEVkZ2VzID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLmVkZ2VzO1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXRHcmFwaE1hbmFnZXIgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuZ3JhcGhNYW5hZ2VyO1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXRQYXJlbnQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucGFyZW50O1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXRMZWZ0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmxlZnQ7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldFJpZ2h0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJpZ2h0O1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXRUb3AgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMudG9wO1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXRCb3R0b20gPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuYm90dG9tO1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5pc0Nvbm5lY3RlZCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5pc0Nvbm5lY3RlZDtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG9iajEsIHNvdXJjZU5vZGUsIHRhcmdldE5vZGUpIHtcclxuICBpZiAoc291cmNlTm9kZSA9PSBudWxsICYmIHRhcmdldE5vZGUgPT0gbnVsbCkge1xyXG4gICAgdmFyIG5ld05vZGUgPSBvYmoxO1xyXG4gICAgaWYgKHRoaXMuZ3JhcGhNYW5hZ2VyID09IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJHcmFwaCBoYXMgbm8gZ3JhcGggbWdyIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZ2V0Tm9kZXMoKS5pbmRleE9mKG5ld05vZGUpID4gLTEpIHtcclxuICAgICAgdGhyb3cgXCJOb2RlIGFscmVhZHkgaW4gZ3JhcGghXCI7XHJcbiAgICB9XHJcbiAgICBuZXdOb2RlLm93bmVyID0gdGhpcztcclxuICAgIHRoaXMuZ2V0Tm9kZXMoKS5wdXNoKG5ld05vZGUpO1xyXG5cclxuICAgIHJldHVybiBuZXdOb2RlO1xyXG4gIH1cclxuICBlbHNlIHtcclxuICAgIHZhciBuZXdFZGdlID0gb2JqMTtcclxuICAgIGlmICghKHRoaXMuZ2V0Tm9kZXMoKS5pbmRleE9mKHNvdXJjZU5vZGUpID4gLTEgJiYgKHRoaXMuZ2V0Tm9kZXMoKS5pbmRleE9mKHRhcmdldE5vZGUpKSA+IC0xKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBvciB0YXJnZXQgbm90IGluIGdyYXBoIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghKHNvdXJjZU5vZGUub3duZXIgPT0gdGFyZ2V0Tm9kZS5vd25lciAmJiBzb3VyY2VOb2RlLm93bmVyID09IHRoaXMpKSB7XHJcbiAgICAgIHRocm93IFwiQm90aCBvd25lcnMgbXVzdCBiZSB0aGlzIGdyYXBoIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChzb3VyY2VOb2RlLm93bmVyICE9IHRhcmdldE5vZGUub3duZXIpXHJcbiAgICB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHNldCBzb3VyY2UgYW5kIHRhcmdldFxyXG4gICAgbmV3RWRnZS5zb3VyY2UgPSBzb3VyY2VOb2RlO1xyXG4gICAgbmV3RWRnZS50YXJnZXQgPSB0YXJnZXROb2RlO1xyXG5cclxuICAgIC8vIHNldCBhcyBpbnRyYS1ncmFwaCBlZGdlXHJcbiAgICBuZXdFZGdlLmlzSW50ZXJHcmFwaCA9IGZhbHNlO1xyXG5cclxuICAgIC8vIGFkZCB0byBncmFwaCBlZGdlIGxpc3RcclxuICAgIHRoaXMuZ2V0RWRnZXMoKS5wdXNoKG5ld0VkZ2UpO1xyXG5cclxuICAgIC8vIGFkZCB0byBpbmNpZGVuY3kgbGlzdHNcclxuICAgIHNvdXJjZU5vZGUuZWRnZXMucHVzaChuZXdFZGdlKTtcclxuXHJcbiAgICBpZiAodGFyZ2V0Tm9kZSAhPSBzb3VyY2VOb2RlKVxyXG4gICAge1xyXG4gICAgICB0YXJnZXROb2RlLmVkZ2VzLnB1c2gobmV3RWRnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5ld0VkZ2U7XHJcbiAgfVxyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgdmFyIG5vZGUgPSBvYmo7XHJcbiAgaWYgKG9iaiBpbnN0YW5jZW9mIExOb2RlKSB7XHJcbiAgICBpZiAobm9kZSA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiTm9kZSBpcyBudWxsIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCEobm9kZS5vd25lciAhPSBudWxsICYmIG5vZGUub3duZXIgPT0gdGhpcykpIHtcclxuICAgICAgdGhyb3cgXCJPd25lciBncmFwaCBpcyBpbnZhbGlkIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZ3JhcGhNYW5hZ2VyID09IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJPd25lciBncmFwaCBtYW5hZ2VyIGlzIGludmFsaWQhXCI7XHJcbiAgICB9XHJcbiAgICAvLyByZW1vdmUgaW5jaWRlbnQgZWRnZXMgZmlyc3QgKG1ha2UgYSBjb3B5IHRvIGRvIGl0IHNhZmVseSlcclxuICAgIHZhciBlZGdlc1RvQmVSZW1vdmVkID0gbm9kZS5lZGdlcy5zbGljZSgpO1xyXG4gICAgdmFyIGVkZ2U7XHJcbiAgICB2YXIgcyA9IGVkZ2VzVG9CZVJlbW92ZWQubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIGVkZ2UgPSBlZGdlc1RvQmVSZW1vdmVkW2ldO1xyXG5cclxuICAgICAgaWYgKGVkZ2UuaXNJbnRlckdyYXBoKVxyXG4gICAgICB7XHJcbiAgICAgICAgdGhpcy5ncmFwaE1hbmFnZXIucmVtb3ZlKGVkZ2UpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2VcclxuICAgICAge1xyXG4gICAgICAgIGVkZ2Uuc291cmNlLm93bmVyLnJlbW92ZShlZGdlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIG5vdyB0aGUgbm9kZSBpdHNlbGZcclxuICAgIHZhciBpbmRleCA9IHRoaXMubm9kZXMuaW5kZXhPZihub2RlKTtcclxuICAgIGlmIChpbmRleCA9PSAtMSkge1xyXG4gICAgICB0aHJvdyBcIk5vZGUgbm90IGluIG93bmVyIG5vZGUgbGlzdCFcIjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLm5vZGVzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIExFZGdlKSB7XHJcbiAgICB2YXIgZWRnZSA9IG9iajtcclxuICAgIGlmIChlZGdlID09IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJFZGdlIGlzIG51bGwhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAoIShlZGdlLnNvdXJjZSAhPSBudWxsICYmIGVkZ2UudGFyZ2V0ICE9IG51bGwpKSB7XHJcbiAgICAgIHRocm93IFwiU291cmNlIGFuZC9vciB0YXJnZXQgaXMgbnVsbCFcIjtcclxuICAgIH1cclxuICAgIGlmICghKGVkZ2Uuc291cmNlLm93bmVyICE9IG51bGwgJiYgZWRnZS50YXJnZXQub3duZXIgIT0gbnVsbCAmJlxyXG4gICAgICAgICAgICBlZGdlLnNvdXJjZS5vd25lciA9PSB0aGlzICYmIGVkZ2UudGFyZ2V0Lm93bmVyID09IHRoaXMpKSB7XHJcbiAgICAgIHRocm93IFwiU291cmNlIGFuZC9vciB0YXJnZXQgb3duZXIgaXMgaW52YWxpZCFcIjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc291cmNlSW5kZXggPSBlZGdlLnNvdXJjZS5lZGdlcy5pbmRleE9mKGVkZ2UpO1xyXG4gICAgdmFyIHRhcmdldEluZGV4ID0gZWRnZS50YXJnZXQuZWRnZXMuaW5kZXhPZihlZGdlKTtcclxuICAgIGlmICghKHNvdXJjZUluZGV4ID4gLTEgJiYgdGFyZ2V0SW5kZXggPiAtMSkpIHtcclxuICAgICAgdGhyb3cgXCJTb3VyY2UgYW5kL29yIHRhcmdldCBkb2Vzbid0IGtub3cgdGhpcyBlZGdlIVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGVkZ2Uuc291cmNlLmVkZ2VzLnNwbGljZShzb3VyY2VJbmRleCwgMSk7XHJcblxyXG4gICAgaWYgKGVkZ2UudGFyZ2V0ICE9IGVkZ2Uuc291cmNlKVxyXG4gICAge1xyXG4gICAgICBlZGdlLnRhcmdldC5lZGdlcy5zcGxpY2UodGFyZ2V0SW5kZXgsIDEpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBpbmRleCA9IGVkZ2Uuc291cmNlLm93bmVyLmdldEVkZ2VzKCkuaW5kZXhPZihlZGdlKTtcclxuICAgIGlmIChpbmRleCA9PSAtMSkge1xyXG4gICAgICB0aHJvdyBcIk5vdCBpbiBvd25lcidzIGVkZ2UgbGlzdCFcIjtcclxuICAgIH1cclxuXHJcbiAgICBlZGdlLnNvdXJjZS5vd25lci5nZXRFZGdlcygpLnNwbGljZShpbmRleCwgMSk7XHJcbiAgfVxyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS51cGRhdGVMZWZ0VG9wID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciB0b3AgPSBJbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgbGVmdCA9IEludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciBub2RlVG9wO1xyXG4gIHZhciBub2RlTGVmdDtcclxuICB2YXIgbWFyZ2luO1xyXG5cclxuICB2YXIgbm9kZXMgPSB0aGlzLmdldE5vZGVzKCk7XHJcbiAgdmFyIHMgPSBub2Rlcy5sZW5ndGg7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBsTm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgbm9kZVRvcCA9IGxOb2RlLmdldFRvcCgpO1xyXG4gICAgbm9kZUxlZnQgPSBsTm9kZS5nZXRMZWZ0KCk7XHJcblxyXG4gICAgaWYgKHRvcCA+IG5vZGVUb3ApXHJcbiAgICB7XHJcbiAgICAgIHRvcCA9IG5vZGVUb3A7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGxlZnQgPiBub2RlTGVmdClcclxuICAgIHtcclxuICAgICAgbGVmdCA9IG5vZGVMZWZ0O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gRG8gd2UgaGF2ZSBhbnkgbm9kZXMgaW4gdGhpcyBncmFwaD9cclxuICBpZiAodG9wID09IEludGVnZXIuTUFYX1ZBTFVFKVxyXG4gIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuICBcclxuICBpZihub2Rlc1swXS5nZXRQYXJlbnQoKS5wYWRkaW5nTGVmdCAhPSB1bmRlZmluZWQpe1xyXG4gICAgbWFyZ2luID0gbm9kZXNbMF0uZ2V0UGFyZW50KCkucGFkZGluZ0xlZnQ7XHJcbiAgfVxyXG4gIGVsc2V7XHJcbiAgICBtYXJnaW4gPSB0aGlzLm1hcmdpbjtcclxuICB9XHJcblxyXG4gIHRoaXMubGVmdCA9IGxlZnQgLSBtYXJnaW47XHJcbiAgdGhpcy50b3AgPSB0b3AgLSBtYXJnaW47XHJcblxyXG4gIC8vIEFwcGx5IHRoZSBtYXJnaW5zIGFuZCByZXR1cm4gdGhlIHJlc3VsdFxyXG4gIHJldHVybiBuZXcgUG9pbnQodGhpcy5sZWZ0LCB0aGlzLnRvcCk7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLnVwZGF0ZUJvdW5kcyA9IGZ1bmN0aW9uIChyZWN1cnNpdmUpXHJcbntcclxuICAvLyBjYWxjdWxhdGUgYm91bmRzXHJcbiAgdmFyIGxlZnQgPSBJbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgcmlnaHQgPSAtSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIHRvcCA9IEludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciBib3R0b20gPSAtSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIG5vZGVMZWZ0O1xyXG4gIHZhciBub2RlUmlnaHQ7XHJcbiAgdmFyIG5vZGVUb3A7XHJcbiAgdmFyIG5vZGVCb3R0b207XHJcbiAgdmFyIG1hcmdpbjtcclxuXHJcbiAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcclxuICB2YXIgcyA9IG5vZGVzLmxlbmd0aDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICB7XHJcbiAgICB2YXIgbE5vZGUgPSBub2Rlc1tpXTtcclxuXHJcbiAgICBpZiAocmVjdXJzaXZlICYmIGxOb2RlLmNoaWxkICE9IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGxOb2RlLnVwZGF0ZUJvdW5kcygpO1xyXG4gICAgfVxyXG4gICAgbm9kZUxlZnQgPSBsTm9kZS5nZXRMZWZ0KCk7XHJcbiAgICBub2RlUmlnaHQgPSBsTm9kZS5nZXRSaWdodCgpO1xyXG4gICAgbm9kZVRvcCA9IGxOb2RlLmdldFRvcCgpO1xyXG4gICAgbm9kZUJvdHRvbSA9IGxOb2RlLmdldEJvdHRvbSgpO1xyXG5cclxuICAgIGlmIChsZWZ0ID4gbm9kZUxlZnQpXHJcbiAgICB7XHJcbiAgICAgIGxlZnQgPSBub2RlTGVmdDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmlnaHQgPCBub2RlUmlnaHQpXHJcbiAgICB7XHJcbiAgICAgIHJpZ2h0ID0gbm9kZVJpZ2h0O1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0b3AgPiBub2RlVG9wKVxyXG4gICAge1xyXG4gICAgICB0b3AgPSBub2RlVG9wO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChib3R0b20gPCBub2RlQm90dG9tKVxyXG4gICAge1xyXG4gICAgICBib3R0b20gPSBub2RlQm90dG9tO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFyIGJvdW5kaW5nUmVjdCA9IG5ldyBSZWN0YW5nbGVEKGxlZnQsIHRvcCwgcmlnaHQgLSBsZWZ0LCBib3R0b20gLSB0b3ApO1xyXG4gIGlmIChsZWZ0ID09IEludGVnZXIuTUFYX1ZBTFVFKVxyXG4gIHtcclxuICAgIHRoaXMubGVmdCA9IHRoaXMucGFyZW50LmdldExlZnQoKTtcclxuICAgIHRoaXMucmlnaHQgPSB0aGlzLnBhcmVudC5nZXRSaWdodCgpO1xyXG4gICAgdGhpcy50b3AgPSB0aGlzLnBhcmVudC5nZXRUb3AoKTtcclxuICAgIHRoaXMuYm90dG9tID0gdGhpcy5wYXJlbnQuZ2V0Qm90dG9tKCk7XHJcbiAgfVxyXG4gIFxyXG4gIGlmKG5vZGVzWzBdLmdldFBhcmVudCgpLnBhZGRpbmdMZWZ0ICE9IHVuZGVmaW5lZCl7XHJcbiAgICBtYXJnaW4gPSBub2Rlc1swXS5nZXRQYXJlbnQoKS5wYWRkaW5nTGVmdDtcclxuICB9XHJcbiAgZWxzZXtcclxuICAgIG1hcmdpbiA9IHRoaXMubWFyZ2luO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5sZWZ0ID0gYm91bmRpbmdSZWN0LnggLSBtYXJnaW47XHJcbiAgdGhpcy5yaWdodCA9IGJvdW5kaW5nUmVjdC54ICsgYm91bmRpbmdSZWN0LndpZHRoICsgbWFyZ2luO1xyXG4gIHRoaXMudG9wID0gYm91bmRpbmdSZWN0LnkgLSBtYXJnaW47XHJcbiAgdGhpcy5ib3R0b20gPSBib3VuZGluZ1JlY3QueSArIGJvdW5kaW5nUmVjdC5oZWlnaHQgKyBtYXJnaW47XHJcbn07XHJcblxyXG5MR3JhcGguY2FsY3VsYXRlQm91bmRzID0gZnVuY3Rpb24gKG5vZGVzKVxyXG57XHJcbiAgdmFyIGxlZnQgPSBJbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgcmlnaHQgPSAtSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIHRvcCA9IEludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciBib3R0b20gPSAtSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIG5vZGVMZWZ0O1xyXG4gIHZhciBub2RlUmlnaHQ7XHJcbiAgdmFyIG5vZGVUb3A7XHJcbiAgdmFyIG5vZGVCb3R0b207XHJcblxyXG4gIHZhciBzID0gbm9kZXMubGVuZ3RoO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICB7XHJcbiAgICB2YXIgbE5vZGUgPSBub2Rlc1tpXTtcclxuICAgIG5vZGVMZWZ0ID0gbE5vZGUuZ2V0TGVmdCgpO1xyXG4gICAgbm9kZVJpZ2h0ID0gbE5vZGUuZ2V0UmlnaHQoKTtcclxuICAgIG5vZGVUb3AgPSBsTm9kZS5nZXRUb3AoKTtcclxuICAgIG5vZGVCb3R0b20gPSBsTm9kZS5nZXRCb3R0b20oKTtcclxuXHJcbiAgICBpZiAobGVmdCA+IG5vZGVMZWZ0KVxyXG4gICAge1xyXG4gICAgICBsZWZ0ID0gbm9kZUxlZnQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJpZ2h0IDwgbm9kZVJpZ2h0KVxyXG4gICAge1xyXG4gICAgICByaWdodCA9IG5vZGVSaWdodDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodG9wID4gbm9kZVRvcClcclxuICAgIHtcclxuICAgICAgdG9wID0gbm9kZVRvcDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoYm90dG9tIDwgbm9kZUJvdHRvbSlcclxuICAgIHtcclxuICAgICAgYm90dG9tID0gbm9kZUJvdHRvbTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhciBib3VuZGluZ1JlY3QgPSBuZXcgUmVjdGFuZ2xlRChsZWZ0LCB0b3AsIHJpZ2h0IC0gbGVmdCwgYm90dG9tIC0gdG9wKTtcclxuXHJcbiAgcmV0dXJuIGJvdW5kaW5nUmVjdDtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0SW5jbHVzaW9uVHJlZURlcHRoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIGlmICh0aGlzID09IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKSlcclxuICB7XHJcbiAgICByZXR1cm4gMTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIHJldHVybiB0aGlzLnBhcmVudC5nZXRJbmNsdXNpb25UcmVlRGVwdGgoKTtcclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldEVzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgaWYgKHRoaXMuZXN0aW1hdGVkU2l6ZSA9PSBJbnRlZ2VyLk1JTl9WQUxVRSkge1xyXG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgfVxyXG4gIHJldHVybiB0aGlzLmVzdGltYXRlZFNpemU7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmNhbGNFc3RpbWF0ZWRTaXplID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBzaXplID0gMDtcclxuICB2YXIgbm9kZXMgPSB0aGlzLm5vZGVzO1xyXG4gIHZhciBzID0gbm9kZXMubGVuZ3RoO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICB7XHJcbiAgICB2YXIgbE5vZGUgPSBub2Rlc1tpXTtcclxuICAgIHNpemUgKz0gbE5vZGUuY2FsY0VzdGltYXRlZFNpemUoKTtcclxuICB9XHJcblxyXG4gIGlmIChzaXplID09IDApXHJcbiAge1xyXG4gICAgdGhpcy5lc3RpbWF0ZWRTaXplID0gTGF5b3V0Q29uc3RhbnRzLkVNUFRZX0NPTVBPVU5EX05PREVfU0laRTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IHNpemUgLyBNYXRoLnNxcnQodGhpcy5ub2Rlcy5sZW5ndGgpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXMuZXN0aW1hdGVkU2l6ZTtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUudXBkYXRlQ29ubmVjdGVkID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBpZiAodGhpcy5ub2Rlcy5sZW5ndGggPT0gMClcclxuICB7XHJcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gdHJ1ZTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHZhciB0b0JlVmlzaXRlZCA9IFtdO1xyXG4gIHZhciB2aXNpdGVkID0gbmV3IEhhc2hTZXQoKTtcclxuICB2YXIgY3VycmVudE5vZGUgPSB0aGlzLm5vZGVzWzBdO1xyXG4gIHZhciBuZWlnaGJvckVkZ2VzO1xyXG4gIHZhciBjdXJyZW50TmVpZ2hib3I7XHJcbiAgdG9CZVZpc2l0ZWQgPSB0b0JlVmlzaXRlZC5jb25jYXQoY3VycmVudE5vZGUud2l0aENoaWxkcmVuKCkpO1xyXG5cclxuICB3aGlsZSAodG9CZVZpc2l0ZWQubGVuZ3RoID4gMClcclxuICB7XHJcbiAgICBjdXJyZW50Tm9kZSA9IHRvQmVWaXNpdGVkLnNoaWZ0KCk7XHJcbiAgICB2aXNpdGVkLmFkZChjdXJyZW50Tm9kZSk7XHJcblxyXG4gICAgLy8gVHJhdmVyc2UgYWxsIG5laWdoYm9ycyBvZiB0aGlzIG5vZGVcclxuICAgIG5laWdoYm9yRWRnZXMgPSBjdXJyZW50Tm9kZS5nZXRFZGdlcygpO1xyXG4gICAgdmFyIHMgPSBuZWlnaGJvckVkZ2VzLmxlbmd0aDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gICAge1xyXG4gICAgICB2YXIgbmVpZ2hib3JFZGdlID0gbmVpZ2hib3JFZGdlc1tpXTtcclxuICAgICAgY3VycmVudE5laWdoYm9yID1cclxuICAgICAgICAgICAgICBuZWlnaGJvckVkZ2UuZ2V0T3RoZXJFbmRJbkdyYXBoKGN1cnJlbnROb2RlLCB0aGlzKTtcclxuXHJcbiAgICAgIC8vIEFkZCB1bnZpc2l0ZWQgbmVpZ2hib3JzIHRvIHRoZSBsaXN0IHRvIHZpc2l0XHJcbiAgICAgIGlmIChjdXJyZW50TmVpZ2hib3IgIT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAgICF2aXNpdGVkLmNvbnRhaW5zKGN1cnJlbnROZWlnaGJvcikpXHJcbiAgICAgIHtcclxuICAgICAgICB0b0JlVmlzaXRlZCA9IHRvQmVWaXNpdGVkLmNvbmNhdChjdXJyZW50TmVpZ2hib3Iud2l0aENoaWxkcmVuKCkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2U7XHJcblxyXG4gIGlmICh2aXNpdGVkLnNpemUoKSA+PSB0aGlzLm5vZGVzLmxlbmd0aClcclxuICB7XHJcbiAgICB2YXIgbm9PZlZpc2l0ZWRJblRoaXNHcmFwaCA9IDA7XHJcbiAgICBcclxuICAgIHZhciBzID0gdmlzaXRlZC5zaXplKCk7XHJcbiAgICAgT2JqZWN0LmtleXModmlzaXRlZC5zZXQpLmZvckVhY2goZnVuY3Rpb24odmlzaXRlZElkKSB7XHJcbiAgICAgIHZhciB2aXNpdGVkTm9kZSA9IHZpc2l0ZWQuc2V0W3Zpc2l0ZWRJZF07XHJcbiAgICAgIGlmICh2aXNpdGVkTm9kZS5vd25lciA9PSBzZWxmKVxyXG4gICAgICB7XHJcbiAgICAgICAgbm9PZlZpc2l0ZWRJblRoaXNHcmFwaCsrO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAobm9PZlZpc2l0ZWRJblRoaXNHcmFwaCA9PSB0aGlzLm5vZGVzLmxlbmd0aClcclxuICAgIHtcclxuICAgICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMR3JhcGg7XHJcbiIsInZhciBMR3JhcGg7XHJcbnZhciBMRWRnZSA9IHJlcXVpcmUoJy4vTEVkZ2UnKTtcclxuXHJcbmZ1bmN0aW9uIExHcmFwaE1hbmFnZXIobGF5b3V0KSB7XHJcbiAgTEdyYXBoID0gcmVxdWlyZSgnLi9MR3JhcGgnKTsgLy8gSXQgbWF5IGJlIGJldHRlciB0byBpbml0aWxpemUgdGhpcyBvdXQgb2YgdGhpcyBmdW5jdGlvbiBidXQgaXQgZ2l2ZXMgYW4gZXJyb3IgKFJpZ2h0LWhhbmQgc2lkZSBvZiAnaW5zdGFuY2VvZicgaXMgbm90IGNhbGxhYmxlKSBub3cuXHJcbiAgdGhpcy5sYXlvdXQgPSBsYXlvdXQ7XHJcblxyXG4gIHRoaXMuZ3JhcGhzID0gW107XHJcbiAgdGhpcy5lZGdlcyA9IFtdO1xyXG59XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5hZGRSb290ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBuZ3JhcGggPSB0aGlzLmxheW91dC5uZXdHcmFwaCgpO1xyXG4gIHZhciBubm9kZSA9IHRoaXMubGF5b3V0Lm5ld05vZGUobnVsbCk7XHJcbiAgdmFyIHJvb3QgPSB0aGlzLmFkZChuZ3JhcGgsIG5ub2RlKTtcclxuICB0aGlzLnNldFJvb3RHcmFwaChyb290KTtcclxuICByZXR1cm4gdGhpcy5yb290R3JhcGg7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAobmV3R3JhcGgsIHBhcmVudE5vZGUsIG5ld0VkZ2UsIHNvdXJjZU5vZGUsIHRhcmdldE5vZGUpXHJcbntcclxuICAvL3RoZXJlIGFyZSBqdXN0IDIgcGFyYW1ldGVycyBhcmUgcGFzc2VkIHRoZW4gaXQgYWRkcyBhbiBMR3JhcGggZWxzZSBpdCBhZGRzIGFuIExFZGdlXHJcbiAgaWYgKG5ld0VkZ2UgPT0gbnVsbCAmJiBzb3VyY2VOb2RlID09IG51bGwgJiYgdGFyZ2V0Tm9kZSA9PSBudWxsKSB7XHJcbiAgICBpZiAobmV3R3JhcGggPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIkdyYXBoIGlzIG51bGwhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAocGFyZW50Tm9kZSA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiUGFyZW50IG5vZGUgaXMgbnVsbCFcIjtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmdyYXBocy5pbmRleE9mKG5ld0dyYXBoKSA+IC0xKSB7XHJcbiAgICAgIHRocm93IFwiR3JhcGggYWxyZWFkeSBpbiB0aGlzIGdyYXBoIG1nciFcIjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmdyYXBocy5wdXNoKG5ld0dyYXBoKTtcclxuXHJcbiAgICBpZiAobmV3R3JhcGgucGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJBbHJlYWR5IGhhcyBhIHBhcmVudCFcIjtcclxuICAgIH1cclxuICAgIGlmIChwYXJlbnROb2RlLmNoaWxkICE9IG51bGwpIHtcclxuICAgICAgdGhyb3cgIFwiQWxyZWFkeSBoYXMgYSBjaGlsZCFcIjtcclxuICAgIH1cclxuXHJcbiAgICBuZXdHcmFwaC5wYXJlbnQgPSBwYXJlbnROb2RlO1xyXG4gICAgcGFyZW50Tm9kZS5jaGlsZCA9IG5ld0dyYXBoO1xyXG5cclxuICAgIHJldHVybiBuZXdHcmFwaDtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICAvL2NoYW5nZSB0aGUgb3JkZXIgb2YgdGhlIHBhcmFtZXRlcnNcclxuICAgIHRhcmdldE5vZGUgPSBuZXdFZGdlO1xyXG4gICAgc291cmNlTm9kZSA9IHBhcmVudE5vZGU7XHJcbiAgICBuZXdFZGdlID0gbmV3R3JhcGg7XHJcbiAgICB2YXIgc291cmNlR3JhcGggPSBzb3VyY2VOb2RlLmdldE93bmVyKCk7XHJcbiAgICB2YXIgdGFyZ2V0R3JhcGggPSB0YXJnZXROb2RlLmdldE93bmVyKCk7XHJcblxyXG4gICAgaWYgKCEoc291cmNlR3JhcGggIT0gbnVsbCAmJiBzb3VyY2VHcmFwaC5nZXRHcmFwaE1hbmFnZXIoKSA9PSB0aGlzKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBub3QgaW4gdGhpcyBncmFwaCBtZ3IhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAoISh0YXJnZXRHcmFwaCAhPSBudWxsICYmIHRhcmdldEdyYXBoLmdldEdyYXBoTWFuYWdlcigpID09IHRoaXMpKSB7XHJcbiAgICAgIHRocm93IFwiVGFyZ2V0IG5vdCBpbiB0aGlzIGdyYXBoIG1nciFcIjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc291cmNlR3JhcGggPT0gdGFyZ2V0R3JhcGgpXHJcbiAgICB7XHJcbiAgICAgIG5ld0VkZ2UuaXNJbnRlckdyYXBoID0gZmFsc2U7XHJcbiAgICAgIHJldHVybiBzb3VyY2VHcmFwaC5hZGQobmV3RWRnZSwgc291cmNlTm9kZSwgdGFyZ2V0Tm9kZSk7XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIG5ld0VkZ2UuaXNJbnRlckdyYXBoID0gdHJ1ZTtcclxuXHJcbiAgICAgIC8vIHNldCBzb3VyY2UgYW5kIHRhcmdldFxyXG4gICAgICBuZXdFZGdlLnNvdXJjZSA9IHNvdXJjZU5vZGU7XHJcbiAgICAgIG5ld0VkZ2UudGFyZ2V0ID0gdGFyZ2V0Tm9kZTtcclxuXHJcbiAgICAgIC8vIGFkZCBlZGdlIHRvIGludGVyLWdyYXBoIGVkZ2UgbGlzdFxyXG4gICAgICBpZiAodGhpcy5lZGdlcy5pbmRleE9mKG5ld0VkZ2UpID4gLTEpIHtcclxuICAgICAgICB0aHJvdyBcIkVkZ2UgYWxyZWFkeSBpbiBpbnRlci1ncmFwaCBlZGdlIGxpc3QhXCI7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZWRnZXMucHVzaChuZXdFZGdlKTtcclxuXHJcbiAgICAgIC8vIGFkZCBlZGdlIHRvIHNvdXJjZSBhbmQgdGFyZ2V0IGluY2lkZW5jeSBsaXN0c1xyXG4gICAgICBpZiAoIShuZXdFZGdlLnNvdXJjZSAhPSBudWxsICYmIG5ld0VkZ2UudGFyZ2V0ICE9IG51bGwpKSB7XHJcbiAgICAgICAgdGhyb3cgXCJFZGdlIHNvdXJjZSBhbmQvb3IgdGFyZ2V0IGlzIG51bGwhXCI7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghKG5ld0VkZ2Uuc291cmNlLmVkZ2VzLmluZGV4T2YobmV3RWRnZSkgPT0gLTEgJiYgbmV3RWRnZS50YXJnZXQuZWRnZXMuaW5kZXhPZihuZXdFZGdlKSA9PSAtMSkpIHtcclxuICAgICAgICB0aHJvdyBcIkVkZ2UgYWxyZWFkeSBpbiBzb3VyY2UgYW5kL29yIHRhcmdldCBpbmNpZGVuY3kgbGlzdCFcIjtcclxuICAgICAgfVxyXG5cclxuICAgICAgbmV3RWRnZS5zb3VyY2UuZWRnZXMucHVzaChuZXdFZGdlKTtcclxuICAgICAgbmV3RWRnZS50YXJnZXQuZWRnZXMucHVzaChuZXdFZGdlKTtcclxuXHJcbiAgICAgIHJldHVybiBuZXdFZGdlO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChsT2JqKSB7XHJcbiAgaWYgKGxPYmogaW5zdGFuY2VvZiBMR3JhcGgpIHtcclxuICAgIHZhciBncmFwaCA9IGxPYmo7XHJcbiAgICBpZiAoZ3JhcGguZ2V0R3JhcGhNYW5hZ2VyKCkgIT0gdGhpcykge1xyXG4gICAgICB0aHJvdyBcIkdyYXBoIG5vdCBpbiB0aGlzIGdyYXBoIG1nclwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCEoZ3JhcGggPT0gdGhpcy5yb290R3JhcGggfHwgKGdyYXBoLnBhcmVudCAhPSBudWxsICYmIGdyYXBoLnBhcmVudC5ncmFwaE1hbmFnZXIgPT0gdGhpcykpKSB7XHJcbiAgICAgIHRocm93IFwiSW52YWxpZCBwYXJlbnQgbm9kZSFcIjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBmaXJzdCB0aGUgZWRnZXMgKG1ha2UgYSBjb3B5IHRvIGRvIGl0IHNhZmVseSlcclxuICAgIHZhciBlZGdlc1RvQmVSZW1vdmVkID0gW107XHJcblxyXG4gICAgZWRnZXNUb0JlUmVtb3ZlZCA9IGVkZ2VzVG9CZVJlbW92ZWQuY29uY2F0KGdyYXBoLmdldEVkZ2VzKCkpO1xyXG5cclxuICAgIHZhciBlZGdlO1xyXG4gICAgdmFyIHMgPSBlZGdlc1RvQmVSZW1vdmVkLmxlbmd0aDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gICAge1xyXG4gICAgICBlZGdlID0gZWRnZXNUb0JlUmVtb3ZlZFtpXTtcclxuICAgICAgZ3JhcGgucmVtb3ZlKGVkZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHRoZW4gdGhlIG5vZGVzIChtYWtlIGEgY29weSB0byBkbyBpdCBzYWZlbHkpXHJcbiAgICB2YXIgbm9kZXNUb0JlUmVtb3ZlZCA9IFtdO1xyXG5cclxuICAgIG5vZGVzVG9CZVJlbW92ZWQgPSBub2Rlc1RvQmVSZW1vdmVkLmNvbmNhdChncmFwaC5nZXROb2RlcygpKTtcclxuXHJcbiAgICB2YXIgbm9kZTtcclxuICAgIHMgPSBub2Rlc1RvQmVSZW1vdmVkLmxlbmd0aDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gICAge1xyXG4gICAgICBub2RlID0gbm9kZXNUb0JlUmVtb3ZlZFtpXTtcclxuICAgICAgZ3JhcGgucmVtb3ZlKG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGNoZWNrIGlmIGdyYXBoIGlzIHRoZSByb290XHJcbiAgICBpZiAoZ3JhcGggPT0gdGhpcy5yb290R3JhcGgpXHJcbiAgICB7XHJcbiAgICAgIHRoaXMuc2V0Um9vdEdyYXBoKG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIG5vdyByZW1vdmUgdGhlIGdyYXBoIGl0c2VsZlxyXG4gICAgdmFyIGluZGV4ID0gdGhpcy5ncmFwaHMuaW5kZXhPZihncmFwaCk7XHJcbiAgICB0aGlzLmdyYXBocy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cclxuICAgIC8vIGFsc28gcmVzZXQgdGhlIHBhcmVudCBvZiB0aGUgZ3JhcGhcclxuICAgIGdyYXBoLnBhcmVudCA9IG51bGw7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKGxPYmogaW5zdGFuY2VvZiBMRWRnZSkge1xyXG4gICAgZWRnZSA9IGxPYmo7XHJcbiAgICBpZiAoZWRnZSA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiRWRnZSBpcyBudWxsIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCFlZGdlLmlzSW50ZXJHcmFwaCkge1xyXG4gICAgICB0aHJvdyBcIk5vdCBhbiBpbnRlci1ncmFwaCBlZGdlIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCEoZWRnZS5zb3VyY2UgIT0gbnVsbCAmJiBlZGdlLnRhcmdldCAhPSBudWxsKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGlzIG51bGwhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmVtb3ZlIGVkZ2UgZnJvbSBzb3VyY2UgYW5kIHRhcmdldCBub2RlcycgaW5jaWRlbmN5IGxpc3RzXHJcblxyXG4gICAgaWYgKCEoZWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihlZGdlKSAhPSAtMSAmJiBlZGdlLnRhcmdldC5lZGdlcy5pbmRleE9mKGVkZ2UpICE9IC0xKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGRvZXNuJ3Qga25vdyB0aGlzIGVkZ2UhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGluZGV4ID0gZWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihlZGdlKTtcclxuICAgIGVkZ2Uuc291cmNlLmVkZ2VzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICBpbmRleCA9IGVkZ2UudGFyZ2V0LmVkZ2VzLmluZGV4T2YoZWRnZSk7XHJcbiAgICBlZGdlLnRhcmdldC5lZGdlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cclxuICAgIC8vIHJlbW92ZSBlZGdlIGZyb20gb3duZXIgZ3JhcGggbWFuYWdlcidzIGludGVyLWdyYXBoIGVkZ2UgbGlzdFxyXG5cclxuICAgIGlmICghKGVkZ2Uuc291cmNlLm93bmVyICE9IG51bGwgJiYgZWRnZS5zb3VyY2Uub3duZXIuZ2V0R3JhcGhNYW5hZ2VyKCkgIT0gbnVsbCkpIHtcclxuICAgICAgdGhyb3cgXCJFZGdlIG93bmVyIGdyYXBoIG9yIG93bmVyIGdyYXBoIG1hbmFnZXIgaXMgbnVsbCFcIjtcclxuICAgIH1cclxuICAgIGlmIChlZGdlLnNvdXJjZS5vd25lci5nZXRHcmFwaE1hbmFnZXIoKS5lZGdlcy5pbmRleE9mKGVkZ2UpID09IC0xKSB7XHJcbiAgICAgIHRocm93IFwiTm90IGluIG93bmVyIGdyYXBoIG1hbmFnZXIncyBlZGdlIGxpc3QhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGluZGV4ID0gZWRnZS5zb3VyY2Uub3duZXIuZ2V0R3JhcGhNYW5hZ2VyKCkuZWRnZXMuaW5kZXhPZihlZGdlKTtcclxuICAgIGVkZ2Uuc291cmNlLm93bmVyLmdldEdyYXBoTWFuYWdlcigpLmVkZ2VzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgfVxyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUudXBkYXRlQm91bmRzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHRoaXMucm9vdEdyYXBoLnVwZGF0ZUJvdW5kcyh0cnVlKTtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEdyYXBocyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5ncmFwaHM7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5nZXRBbGxOb2RlcyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcy5hbGxOb2RlcyA9PSBudWxsKVxyXG4gIHtcclxuICAgIHZhciBub2RlTGlzdCA9IFtdO1xyXG4gICAgdmFyIGdyYXBocyA9IHRoaXMuZ2V0R3JhcGhzKCk7XHJcbiAgICB2YXIgcyA9IGdyYXBocy5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICAgIHtcclxuICAgICAgbm9kZUxpc3QgPSBub2RlTGlzdC5jb25jYXQoZ3JhcGhzW2ldLmdldE5vZGVzKCkpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5hbGxOb2RlcyA9IG5vZGVMaXN0O1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5hbGxOb2RlcztcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlc2V0QWxsTm9kZXMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdGhpcy5hbGxOb2RlcyA9IG51bGw7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5yZXNldEFsbEVkZ2VzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHRoaXMuYWxsRWRnZXMgPSBudWxsO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUucmVzZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uID0gbnVsbDtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEFsbEVkZ2VzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIGlmICh0aGlzLmFsbEVkZ2VzID09IG51bGwpXHJcbiAge1xyXG4gICAgdmFyIGVkZ2VMaXN0ID0gW107XHJcbiAgICB2YXIgZ3JhcGhzID0gdGhpcy5nZXRHcmFwaHMoKTtcclxuICAgIHZhciBzID0gZ3JhcGhzLmxlbmd0aDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ3JhcGhzLmxlbmd0aDsgaSsrKVxyXG4gICAge1xyXG4gICAgICBlZGdlTGlzdCA9IGVkZ2VMaXN0LmNvbmNhdChncmFwaHNbaV0uZ2V0RWRnZXMoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZWRnZUxpc3QgPSBlZGdlTGlzdC5jb25jYXQodGhpcy5lZGdlcyk7XHJcblxyXG4gICAgdGhpcy5hbGxFZGdlcyA9IGVkZ2VMaXN0O1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5hbGxFZGdlcztcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuc2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAobm9kZUxpc3QpXHJcbntcclxuICBpZiAodGhpcy5hbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiAhPSBudWxsKSB7XHJcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICB9XHJcblxyXG4gIHRoaXMuYWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBub2RlTGlzdDtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldFJvb3QgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucm9vdEdyYXBoO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuc2V0Um9vdEdyYXBoID0gZnVuY3Rpb24gKGdyYXBoKVxyXG57XHJcbiAgaWYgKGdyYXBoLmdldEdyYXBoTWFuYWdlcigpICE9IHRoaXMpIHtcclxuICAgIHRocm93IFwiUm9vdCBub3QgaW4gdGhpcyBncmFwaCBtZ3IhXCI7XHJcbiAgfVxyXG5cclxuICB0aGlzLnJvb3RHcmFwaCA9IGdyYXBoO1xyXG4gIC8vIHJvb3QgZ3JhcGggbXVzdCBoYXZlIGEgcm9vdCBub2RlIGFzc29jaWF0ZWQgd2l0aCBpdCBmb3IgY29udmVuaWVuY2VcclxuICBpZiAoZ3JhcGgucGFyZW50ID09IG51bGwpXHJcbiAge1xyXG4gICAgZ3JhcGgucGFyZW50ID0gdGhpcy5sYXlvdXQubmV3Tm9kZShcIlJvb3Qgbm9kZVwiKTtcclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5nZXRMYXlvdXQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGF5b3V0O1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuaXNPbmVBbmNlc3Rvck9mT3RoZXIgPSBmdW5jdGlvbiAoZmlyc3ROb2RlLCBzZWNvbmROb2RlKVxyXG57XHJcbiAgaWYgKCEoZmlyc3ROb2RlICE9IG51bGwgJiYgc2Vjb25kTm9kZSAhPSBudWxsKSkge1xyXG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgfVxyXG5cclxuICBpZiAoZmlyc3ROb2RlID09IHNlY29uZE5vZGUpXHJcbiAge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIC8vIElzIHNlY29uZCBub2RlIGFuIGFuY2VzdG9yIG9mIHRoZSBmaXJzdCBvbmU/XHJcbiAgdmFyIG93bmVyR3JhcGggPSBmaXJzdE5vZGUuZ2V0T3duZXIoKTtcclxuICB2YXIgcGFyZW50Tm9kZTtcclxuXHJcbiAgZG9cclxuICB7XHJcbiAgICBwYXJlbnROb2RlID0gb3duZXJHcmFwaC5nZXRQYXJlbnQoKTtcclxuXHJcbiAgICBpZiAocGFyZW50Tm9kZSA9PSBudWxsKVxyXG4gICAge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICBpZiAocGFyZW50Tm9kZSA9PSBzZWNvbmROb2RlKVxyXG4gICAge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBvd25lckdyYXBoID0gcGFyZW50Tm9kZS5nZXRPd25lcigpO1xyXG4gICAgaWYgKG93bmVyR3JhcGggPT0gbnVsbClcclxuICAgIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfSB3aGlsZSAodHJ1ZSk7XHJcbiAgLy8gSXMgZmlyc3Qgbm9kZSBhbiBhbmNlc3RvciBvZiB0aGUgc2Vjb25kIG9uZT9cclxuICBvd25lckdyYXBoID0gc2Vjb25kTm9kZS5nZXRPd25lcigpO1xyXG5cclxuICBkb1xyXG4gIHtcclxuICAgIHBhcmVudE5vZGUgPSBvd25lckdyYXBoLmdldFBhcmVudCgpO1xyXG5cclxuICAgIGlmIChwYXJlbnROb2RlID09IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChwYXJlbnROb2RlID09IGZpcnN0Tm9kZSlcclxuICAgIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgb3duZXJHcmFwaCA9IHBhcmVudE5vZGUuZ2V0T3duZXIoKTtcclxuICAgIGlmIChvd25lckdyYXBoID09IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH0gd2hpbGUgKHRydWUpO1xyXG5cclxuICByZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5jYWxjTG93ZXN0Q29tbW9uQW5jZXN0b3JzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBlZGdlO1xyXG4gIHZhciBzb3VyY2VOb2RlO1xyXG4gIHZhciB0YXJnZXROb2RlO1xyXG4gIHZhciBzb3VyY2VBbmNlc3RvckdyYXBoO1xyXG4gIHZhciB0YXJnZXRBbmNlc3RvckdyYXBoO1xyXG5cclxuICB2YXIgZWRnZXMgPSB0aGlzLmdldEFsbEVkZ2VzKCk7XHJcbiAgdmFyIHMgPSBlZGdlcy5sZW5ndGg7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAge1xyXG4gICAgZWRnZSA9IGVkZ2VzW2ldO1xyXG5cclxuICAgIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZTtcclxuICAgIHRhcmdldE5vZGUgPSBlZGdlLnRhcmdldDtcclxuICAgIGVkZ2UubGNhID0gbnVsbDtcclxuICAgIGVkZ2Uuc291cmNlSW5MY2EgPSBzb3VyY2VOb2RlO1xyXG4gICAgZWRnZS50YXJnZXRJbkxjYSA9IHRhcmdldE5vZGU7XHJcblxyXG4gICAgaWYgKHNvdXJjZU5vZGUgPT0gdGFyZ2V0Tm9kZSlcclxuICAgIHtcclxuICAgICAgZWRnZS5sY2EgPSBzb3VyY2VOb2RlLmdldE93bmVyKCk7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHNvdXJjZUFuY2VzdG9yR3JhcGggPSBzb3VyY2VOb2RlLmdldE93bmVyKCk7XHJcblxyXG4gICAgd2hpbGUgKGVkZ2UubGNhID09IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGVkZ2UudGFyZ2V0SW5MY2EgPSB0YXJnZXROb2RlOyAgXHJcbiAgICAgIHRhcmdldEFuY2VzdG9yR3JhcGggPSB0YXJnZXROb2RlLmdldE93bmVyKCk7XHJcblxyXG4gICAgICB3aGlsZSAoZWRnZS5sY2EgPT0gbnVsbClcclxuICAgICAge1xyXG4gICAgICAgIGlmICh0YXJnZXRBbmNlc3RvckdyYXBoID09IHNvdXJjZUFuY2VzdG9yR3JhcGgpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgZWRnZS5sY2EgPSB0YXJnZXRBbmNlc3RvckdyYXBoO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGFyZ2V0QW5jZXN0b3JHcmFwaCA9PSB0aGlzLnJvb3RHcmFwaClcclxuICAgICAgICB7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlZGdlLmxjYSAhPSBudWxsKSB7XHJcbiAgICAgICAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWRnZS50YXJnZXRJbkxjYSA9IHRhcmdldEFuY2VzdG9yR3JhcGguZ2V0UGFyZW50KCk7XHJcbiAgICAgICAgdGFyZ2V0QW5jZXN0b3JHcmFwaCA9IGVkZ2UudGFyZ2V0SW5MY2EuZ2V0T3duZXIoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHNvdXJjZUFuY2VzdG9yR3JhcGggPT0gdGhpcy5yb290R3JhcGgpXHJcbiAgICAgIHtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGVkZ2UubGNhID09IG51bGwpXHJcbiAgICAgIHtcclxuICAgICAgICBlZGdlLnNvdXJjZUluTGNhID0gc291cmNlQW5jZXN0b3JHcmFwaC5nZXRQYXJlbnQoKTtcclxuICAgICAgICBzb3VyY2VBbmNlc3RvckdyYXBoID0gZWRnZS5zb3VyY2VJbkxjYS5nZXRPd25lcigpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVkZ2UubGNhID09IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuY2FsY0xvd2VzdENvbW1vbkFuY2VzdG9yID0gZnVuY3Rpb24gKGZpcnN0Tm9kZSwgc2Vjb25kTm9kZSlcclxue1xyXG4gIGlmIChmaXJzdE5vZGUgPT0gc2Vjb25kTm9kZSlcclxuICB7XHJcbiAgICByZXR1cm4gZmlyc3ROb2RlLmdldE93bmVyKCk7XHJcbiAgfVxyXG4gIHZhciBmaXJzdE93bmVyR3JhcGggPSBmaXJzdE5vZGUuZ2V0T3duZXIoKTtcclxuXHJcbiAgZG9cclxuICB7XHJcbiAgICBpZiAoZmlyc3RPd25lckdyYXBoID09IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgdmFyIHNlY29uZE93bmVyR3JhcGggPSBzZWNvbmROb2RlLmdldE93bmVyKCk7XHJcblxyXG4gICAgZG9cclxuICAgIHtcclxuICAgICAgaWYgKHNlY29uZE93bmVyR3JhcGggPT0gbnVsbClcclxuICAgICAge1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc2Vjb25kT3duZXJHcmFwaCA9PSBmaXJzdE93bmVyR3JhcGgpXHJcbiAgICAgIHtcclxuICAgICAgICByZXR1cm4gc2Vjb25kT3duZXJHcmFwaDtcclxuICAgICAgfVxyXG4gICAgICBzZWNvbmRPd25lckdyYXBoID0gc2Vjb25kT3duZXJHcmFwaC5nZXRQYXJlbnQoKS5nZXRPd25lcigpO1xyXG4gICAgfSB3aGlsZSAodHJ1ZSk7XHJcblxyXG4gICAgZmlyc3RPd25lckdyYXBoID0gZmlyc3RPd25lckdyYXBoLmdldFBhcmVudCgpLmdldE93bmVyKCk7XHJcbiAgfSB3aGlsZSAodHJ1ZSk7XHJcblxyXG4gIHJldHVybiBmaXJzdE93bmVyR3JhcGg7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5jYWxjSW5jbHVzaW9uVHJlZURlcHRocyA9IGZ1bmN0aW9uIChncmFwaCwgZGVwdGgpIHtcclxuICBpZiAoZ3JhcGggPT0gbnVsbCAmJiBkZXB0aCA9PSBudWxsKSB7XHJcbiAgICBncmFwaCA9IHRoaXMucm9vdEdyYXBoO1xyXG4gICAgZGVwdGggPSAxO1xyXG4gIH1cclxuICB2YXIgbm9kZTtcclxuXHJcbiAgdmFyIG5vZGVzID0gZ3JhcGguZ2V0Tm9kZXMoKTtcclxuICB2YXIgcyA9IG5vZGVzLmxlbmd0aDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICB7XHJcbiAgICBub2RlID0gbm9kZXNbaV07XHJcbiAgICBub2RlLmluY2x1c2lvblRyZWVEZXB0aCA9IGRlcHRoO1xyXG5cclxuICAgIGlmIChub2RlLmNoaWxkICE9IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIHRoaXMuY2FsY0luY2x1c2lvblRyZWVEZXB0aHMobm9kZS5jaGlsZCwgZGVwdGggKyAxKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5pbmNsdWRlc0ludmFsaWRFZGdlID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBlZGdlO1xyXG5cclxuICB2YXIgcyA9IHRoaXMuZWRnZXMubGVuZ3RoO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIGVkZ2UgPSB0aGlzLmVkZ2VzW2ldO1xyXG5cclxuICAgIGlmICh0aGlzLmlzT25lQW5jZXN0b3JPZk90aGVyKGVkZ2Uuc291cmNlLCBlZGdlLnRhcmdldCkpXHJcbiAgICB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExHcmFwaE1hbmFnZXI7XHJcbiIsImZ1bmN0aW9uIExHcmFwaE9iamVjdCh2R3JhcGhPYmplY3QpIHtcclxuICB0aGlzLnZHcmFwaE9iamVjdCA9IHZHcmFwaE9iamVjdDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMR3JhcGhPYmplY3Q7XHJcbiIsInZhciBMR3JhcGhPYmplY3QgPSByZXF1aXJlKCcuL0xHcmFwaE9iamVjdCcpO1xyXG52YXIgSW50ZWdlciA9IHJlcXVpcmUoJy4vSW50ZWdlcicpO1xyXG52YXIgUmVjdGFuZ2xlRCA9IHJlcXVpcmUoJy4vUmVjdGFuZ2xlRCcpO1xyXG52YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcclxudmFyIFJhbmRvbVNlZWQgPSByZXF1aXJlKCcuL1JhbmRvbVNlZWQnKTtcclxudmFyIFBvaW50RCA9IHJlcXVpcmUoJy4vUG9pbnREJyk7XHJcbnZhciBIYXNoU2V0ID0gcmVxdWlyZSgnLi9IYXNoU2V0Jyk7XHJcblxyXG5mdW5jdGlvbiBMTm9kZShnbSwgbG9jLCBzaXplLCB2Tm9kZSkge1xyXG4gIC8vQWx0ZXJuYXRpdmUgY29uc3RydWN0b3IgMSA6IExOb2RlKExHcmFwaE1hbmFnZXIgZ20sIFBvaW50IGxvYywgRGltZW5zaW9uIHNpemUsIE9iamVjdCB2Tm9kZSlcclxuICBpZiAoc2l6ZSA9PSBudWxsICYmIHZOb2RlID09IG51bGwpIHtcclxuICAgIHZOb2RlID0gbG9jO1xyXG4gIH1cclxuXHJcbiAgTEdyYXBoT2JqZWN0LmNhbGwodGhpcywgdk5vZGUpO1xyXG5cclxuICAvL0FsdGVybmF0aXZlIGNvbnN0cnVjdG9yIDIgOiBMTm9kZShMYXlvdXQgbGF5b3V0LCBPYmplY3Qgdk5vZGUpXHJcbiAgaWYgKGdtLmdyYXBoTWFuYWdlciAhPSBudWxsKVxyXG4gICAgZ20gPSBnbS5ncmFwaE1hbmFnZXI7XHJcblxyXG4gIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IEludGVnZXIuTUlOX1ZBTFVFO1xyXG4gIHRoaXMuaW5jbHVzaW9uVHJlZURlcHRoID0gSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdGhpcy52R3JhcGhPYmplY3QgPSB2Tm9kZTtcclxuICB0aGlzLmVkZ2VzID0gW107XHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIgPSBnbTtcclxuXHJcbiAgaWYgKHNpemUgIT0gbnVsbCAmJiBsb2MgIT0gbnVsbClcclxuICAgIHRoaXMucmVjdCA9IG5ldyBSZWN0YW5nbGVEKGxvYy54LCBsb2MueSwgc2l6ZS53aWR0aCwgc2l6ZS5oZWlnaHQpO1xyXG4gIGVsc2VcclxuICAgIHRoaXMucmVjdCA9IG5ldyBSZWN0YW5nbGVEKCk7XHJcbn1cclxuXHJcbkxOb2RlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEdyYXBoT2JqZWN0LnByb3RvdHlwZSk7XHJcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoT2JqZWN0KSB7XHJcbiAgTE5vZGVbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XHJcbn1cclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRFZGdlcyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5lZGdlcztcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRDaGlsZCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5jaGlsZDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRPd25lciA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcy5vd25lciAhPSBudWxsKSB7XHJcbiAgICBpZiAoISh0aGlzLm93bmVyID09IG51bGwgfHwgdGhpcy5vd25lci5nZXROb2RlcygpLmluZGV4T2YodGhpcykgPiAtMSkpIHtcclxuICAgICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcy5vd25lcjtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0LndpZHRoO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnNldFdpZHRoID0gZnVuY3Rpb24gKHdpZHRoKVxyXG57XHJcbiAgdGhpcy5yZWN0LndpZHRoID0gd2lkdGg7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0SGVpZ2h0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3QuaGVpZ2h0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnNldEhlaWdodCA9IGZ1bmN0aW9uIChoZWlnaHQpXHJcbntcclxuICB0aGlzLnJlY3QuaGVpZ2h0ID0gaGVpZ2h0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldENlbnRlclggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC54ICsgdGhpcy5yZWN0LndpZHRoIC8gMjtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRDZW50ZXJZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3QueSArIHRoaXMucmVjdC5oZWlnaHQgLyAyO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldENlbnRlciA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gbmV3IFBvaW50RCh0aGlzLnJlY3QueCArIHRoaXMucmVjdC53aWR0aCAvIDIsXHJcbiAgICAgICAgICB0aGlzLnJlY3QueSArIHRoaXMucmVjdC5oZWlnaHQgLyAyKTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRMb2NhdGlvbiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gbmV3IFBvaW50RCh0aGlzLnJlY3QueCwgdGhpcy5yZWN0LnkpO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldFJlY3QgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXREaWFnb25hbCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMucmVjdC53aWR0aCAqIHRoaXMucmVjdC53aWR0aCArXHJcbiAgICAgICAgICB0aGlzLnJlY3QuaGVpZ2h0ICogdGhpcy5yZWN0LmhlaWdodCk7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuc2V0UmVjdCA9IGZ1bmN0aW9uICh1cHBlckxlZnQsIGRpbWVuc2lvbilcclxue1xyXG4gIHRoaXMucmVjdC54ID0gdXBwZXJMZWZ0Lng7XHJcbiAgdGhpcy5yZWN0LnkgPSB1cHBlckxlZnQueTtcclxuICB0aGlzLnJlY3Qud2lkdGggPSBkaW1lbnNpb24ud2lkdGg7XHJcbiAgdGhpcy5yZWN0LmhlaWdodCA9IGRpbWVuc2lvbi5oZWlnaHQ7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuc2V0Q2VudGVyID0gZnVuY3Rpb24gKGN4LCBjeSlcclxue1xyXG4gIHRoaXMucmVjdC54ID0gY3ggLSB0aGlzLnJlY3Qud2lkdGggLyAyO1xyXG4gIHRoaXMucmVjdC55ID0gY3kgLSB0aGlzLnJlY3QuaGVpZ2h0IC8gMjtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5zZXRMb2NhdGlvbiA9IGZ1bmN0aW9uICh4LCB5KVxyXG57XHJcbiAgdGhpcy5yZWN0LnggPSB4O1xyXG4gIHRoaXMucmVjdC55ID0geTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5tb3ZlQnkgPSBmdW5jdGlvbiAoZHgsIGR5KVxyXG57XHJcbiAgdGhpcy5yZWN0LnggKz0gZHg7XHJcbiAgdGhpcy5yZWN0LnkgKz0gZHk7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0RWRnZUxpc3RUb05vZGUgPSBmdW5jdGlvbiAodG8pXHJcbntcclxuICB2YXIgZWRnZUxpc3QgPSBbXTtcclxuICB2YXIgZWRnZTtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIHNlbGYuZWRnZXMuZm9yRWFjaChmdW5jdGlvbihlZGdlKSB7XHJcbiAgICBcclxuICAgIGlmIChlZGdlLnRhcmdldCA9PSB0bylcclxuICAgIHtcclxuICAgICAgaWYgKGVkZ2Uuc291cmNlICE9IHNlbGYpXHJcbiAgICAgICAgdGhyb3cgXCJJbmNvcnJlY3QgZWRnZSBzb3VyY2UhXCI7XHJcblxyXG4gICAgICBlZGdlTGlzdC5wdXNoKGVkZ2UpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gZWRnZUxpc3Q7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0RWRnZXNCZXR3ZWVuID0gZnVuY3Rpb24gKG90aGVyKVxyXG57XHJcbiAgdmFyIGVkZ2VMaXN0ID0gW107XHJcbiAgdmFyIGVkZ2U7XHJcbiAgXHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHNlbGYuZWRnZXMuZm9yRWFjaChmdW5jdGlvbihlZGdlKSB7XHJcblxyXG4gICAgaWYgKCEoZWRnZS5zb3VyY2UgPT0gc2VsZiB8fCBlZGdlLnRhcmdldCA9PSBzZWxmKSlcclxuICAgICAgdGhyb3cgXCJJbmNvcnJlY3QgZWRnZSBzb3VyY2UgYW5kL29yIHRhcmdldFwiO1xyXG5cclxuICAgIGlmICgoZWRnZS50YXJnZXQgPT0gb3RoZXIpIHx8IChlZGdlLnNvdXJjZSA9PSBvdGhlcikpXHJcbiAgICB7XHJcbiAgICAgIGVkZ2VMaXN0LnB1c2goZWRnZSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiBlZGdlTGlzdDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXROZWlnaGJvcnNMaXN0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBuZWlnaGJvcnMgPSBuZXcgSGFzaFNldCgpO1xyXG4gIHZhciBlZGdlO1xyXG4gIFxyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBzZWxmLmVkZ2VzLmZvckVhY2goZnVuY3Rpb24oZWRnZSkge1xyXG5cclxuICAgIGlmIChlZGdlLnNvdXJjZSA9PSBzZWxmKVxyXG4gICAge1xyXG4gICAgICBuZWlnaGJvcnMuYWRkKGVkZ2UudGFyZ2V0KTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgaWYgKGVkZ2UudGFyZ2V0ICE9IHNlbGYpIHtcclxuICAgICAgICB0aHJvdyBcIkluY29ycmVjdCBpbmNpZGVuY3khXCI7XHJcbiAgICAgIH1cclxuICAgIFxyXG4gICAgICBuZWlnaGJvcnMuYWRkKGVkZ2Uuc291cmNlKTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIG5laWdoYm9ycztcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS53aXRoQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIHdpdGhOZWlnaGJvcnNMaXN0ID0gW107XHJcbiAgdmFyIGNoaWxkTm9kZTtcclxuXHJcbiAgd2l0aE5laWdoYm9yc0xpc3QucHVzaCh0aGlzKTtcclxuXHJcbiAgaWYgKHRoaXMuY2hpbGQgIT0gbnVsbClcclxuICB7XHJcbiAgICB2YXIgbm9kZXMgPSB0aGlzLmNoaWxkLmdldE5vZGVzKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gICAge1xyXG4gICAgICBjaGlsZE5vZGUgPSBub2Rlc1tpXTtcclxuXHJcbiAgICAgIHdpdGhOZWlnaGJvcnNMaXN0ID0gd2l0aE5laWdoYm9yc0xpc3QuY29uY2F0KGNoaWxkTm9kZS53aXRoQ2hpbGRyZW4oKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gd2l0aE5laWdoYm9yc0xpc3Q7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0Tm9PZkNoaWxkcmVuID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBub09mQ2hpbGRyZW4gPSAwO1xyXG4gIHZhciBjaGlsZE5vZGU7XHJcblxyXG4gIGlmKHRoaXMuY2hpbGQgPT0gbnVsbCl7XHJcbiAgICBub09mQ2hpbGRyZW4gPSAxO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgdmFyIG5vZGVzID0gdGhpcy5jaGlsZC5nZXROb2RlcygpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcclxuICAgIHtcclxuICAgICAgY2hpbGROb2RlID0gbm9kZXNbaV07XHJcblxyXG4gICAgICBub09mQ2hpbGRyZW4gKz0gY2hpbGROb2RlLmdldE5vT2ZDaGlsZHJlbigpO1xyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICBpZihub09mQ2hpbGRyZW4gPT0gMCl7XHJcbiAgICBub09mQ2hpbGRyZW4gPSAxO1xyXG4gIH1cclxuICByZXR1cm4gbm9PZkNoaWxkcmVuO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldEVzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKHRoaXMuZXN0aW1hdGVkU2l6ZSA9PSBJbnRlZ2VyLk1JTl9WQUxVRSkge1xyXG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgfVxyXG4gIHJldHVybiB0aGlzLmVzdGltYXRlZFNpemU7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuY2FsY0VzdGltYXRlZFNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKHRoaXMuY2hpbGQgPT0gbnVsbClcclxuICB7XHJcbiAgICByZXR1cm4gdGhpcy5lc3RpbWF0ZWRTaXplID0gKHRoaXMucmVjdC53aWR0aCArIHRoaXMucmVjdC5oZWlnaHQpIC8gMjtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IHRoaXMuY2hpbGQuY2FsY0VzdGltYXRlZFNpemUoKTtcclxuICAgIHRoaXMucmVjdC53aWR0aCA9IHRoaXMuZXN0aW1hdGVkU2l6ZTtcclxuICAgIHRoaXMucmVjdC5oZWlnaHQgPSB0aGlzLmVzdGltYXRlZFNpemU7XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuZXN0aW1hdGVkU2l6ZTtcclxuICB9XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuc2NhdHRlciA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgcmFuZG9tQ2VudGVyWDtcclxuICB2YXIgcmFuZG9tQ2VudGVyWTtcclxuXHJcbiAgdmFyIG1pblggPSAtTGF5b3V0Q29uc3RhbnRzLklOSVRJQUxfV09STERfQk9VTkRBUlk7XHJcbiAgdmFyIG1heFggPSBMYXlvdXRDb25zdGFudHMuSU5JVElBTF9XT1JMRF9CT1VOREFSWTtcclxuICByYW5kb21DZW50ZXJYID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9YICtcclxuICAgICAgICAgIChSYW5kb21TZWVkLm5leHREb3VibGUoKSAqIChtYXhYIC0gbWluWCkpICsgbWluWDtcclxuXHJcbiAgdmFyIG1pblkgPSAtTGF5b3V0Q29uc3RhbnRzLklOSVRJQUxfV09STERfQk9VTkRBUlk7XHJcbiAgdmFyIG1heFkgPSBMYXlvdXRDb25zdGFudHMuSU5JVElBTF9XT1JMRF9CT1VOREFSWTtcclxuICByYW5kb21DZW50ZXJZID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9ZICtcclxuICAgICAgICAgIChSYW5kb21TZWVkLm5leHREb3VibGUoKSAqIChtYXhZIC0gbWluWSkpICsgbWluWTtcclxuXHJcbiAgdGhpcy5yZWN0LnggPSByYW5kb21DZW50ZXJYO1xyXG4gIHRoaXMucmVjdC55ID0gcmFuZG9tQ2VudGVyWVxyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnVwZGF0ZUJvdW5kcyA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAodGhpcy5nZXRDaGlsZCgpID09IG51bGwpIHtcclxuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gIH1cclxuICBpZiAodGhpcy5nZXRDaGlsZCgpLmdldE5vZGVzKCkubGVuZ3RoICE9IDApXHJcbiAge1xyXG4gICAgLy8gd3JhcCB0aGUgY2hpbGRyZW4gbm9kZXMgYnkgcmUtYXJyYW5naW5nIHRoZSBib3VuZGFyaWVzXHJcbiAgICB2YXIgY2hpbGRHcmFwaCA9IHRoaXMuZ2V0Q2hpbGQoKTtcclxuICAgIGNoaWxkR3JhcGgudXBkYXRlQm91bmRzKHRydWUpO1xyXG5cclxuICAgIHRoaXMucmVjdC54ID0gY2hpbGRHcmFwaC5nZXRMZWZ0KCk7XHJcbiAgICB0aGlzLnJlY3QueSA9IGNoaWxkR3JhcGguZ2V0VG9wKCk7XHJcblxyXG4gICAgdGhpcy5zZXRXaWR0aChjaGlsZEdyYXBoLmdldFJpZ2h0KCkgLSBjaGlsZEdyYXBoLmdldExlZnQoKSk7XHJcbiAgICB0aGlzLnNldEhlaWdodChjaGlsZEdyYXBoLmdldEJvdHRvbSgpIC0gY2hpbGRHcmFwaC5nZXRUb3AoKSk7XHJcbiAgICBcclxuICAgIC8vIFVwZGF0ZSBjb21wb3VuZCBib3VuZHMgY29uc2lkZXJpbmcgaXRzIGxhYmVsIHByb3BlcnRpZXMgICAgXHJcbiAgICBpZihMYXlvdXRDb25zdGFudHMuTk9ERV9ESU1FTlNJT05TX0lOQ0xVREVfTEFCRUxTKXtcclxuICAgICAgICBcclxuICAgICAgdmFyIHdpZHRoID0gY2hpbGRHcmFwaC5nZXRSaWdodCgpIC0gY2hpbGRHcmFwaC5nZXRMZWZ0KCk7XHJcbiAgICAgIHZhciBoZWlnaHQgPSBjaGlsZEdyYXBoLmdldEJvdHRvbSgpIC0gY2hpbGRHcmFwaC5nZXRUb3AoKTtcclxuXHJcbiAgICAgIGlmKHRoaXMubGFiZWxXaWR0aCA+IHdpZHRoKXtcclxuICAgICAgICB0aGlzLnJlY3QueCAtPSAodGhpcy5sYWJlbFdpZHRoIC0gd2lkdGgpIC8gMjtcclxuICAgICAgICB0aGlzLnNldFdpZHRoKHRoaXMubGFiZWxXaWR0aCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHRoaXMubGFiZWxIZWlnaHQgPiBoZWlnaHQpe1xyXG4gICAgICAgIGlmKHRoaXMubGFiZWxQb3MgPT0gXCJjZW50ZXJcIil7XHJcbiAgICAgICAgICB0aGlzLnJlY3QueSAtPSAodGhpcy5sYWJlbEhlaWdodCAtIGhlaWdodCkgLyAyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmKHRoaXMubGFiZWxQb3MgPT0gXCJ0b3BcIil7XHJcbiAgICAgICAgICB0aGlzLnJlY3QueSAtPSAodGhpcy5sYWJlbEhlaWdodCAtIGhlaWdodCk7IFxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnNldEhlaWdodCh0aGlzLmxhYmVsSGVpZ2h0KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRJbmNsdXNpb25UcmVlRGVwdGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgaWYgKHRoaXMuaW5jbHVzaW9uVHJlZURlcHRoID09IEludGVnZXIuTUFYX1ZBTFVFKSB7XHJcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMuaW5jbHVzaW9uVHJlZURlcHRoO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnRyYW5zZm9ybSA9IGZ1bmN0aW9uICh0cmFucylcclxue1xyXG4gIHZhciBsZWZ0ID0gdGhpcy5yZWN0Lng7XHJcblxyXG4gIGlmIChsZWZ0ID4gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxyXG4gIHtcclxuICAgIGxlZnQgPSBMYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKGxlZnQgPCAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxyXG4gIHtcclxuICAgIGxlZnQgPSAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZO1xyXG4gIH1cclxuXHJcbiAgdmFyIHRvcCA9IHRoaXMucmVjdC55O1xyXG5cclxuICBpZiAodG9wID4gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZKVxyXG4gIHtcclxuICAgIHRvcCA9IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWTtcclxuICB9XHJcbiAgZWxzZSBpZiAodG9wIDwgLUxheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSlcclxuICB7XHJcbiAgICB0b3AgPSAtTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZO1xyXG4gIH1cclxuXHJcbiAgdmFyIGxlZnRUb3AgPSBuZXcgUG9pbnREKGxlZnQsIHRvcCk7XHJcbiAgdmFyIHZMZWZ0VG9wID0gdHJhbnMuaW52ZXJzZVRyYW5zZm9ybVBvaW50KGxlZnRUb3ApO1xyXG5cclxuICB0aGlzLnNldExvY2F0aW9uKHZMZWZ0VG9wLngsIHZMZWZ0VG9wLnkpO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldExlZnQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC54O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldFJpZ2h0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3QueCArIHRoaXMucmVjdC53aWR0aDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRUb3AgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC55O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldEJvdHRvbSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0LnkgKyB0aGlzLnJlY3QuaGVpZ2h0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldFBhcmVudCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcy5vd25lciA9PSBudWxsKVxyXG4gIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXMub3duZXIuZ2V0UGFyZW50KCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExOb2RlO1xyXG4iLCJ2YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcbnZhciBIYXNoTWFwID0gcmVxdWlyZSgnLi9IYXNoTWFwJyk7XG52YXIgTEdyYXBoTWFuYWdlciA9IHJlcXVpcmUoJy4vTEdyYXBoTWFuYWdlcicpO1xudmFyIExOb2RlID0gcmVxdWlyZSgnLi9MTm9kZScpO1xudmFyIExFZGdlID0gcmVxdWlyZSgnLi9MRWRnZScpO1xudmFyIExHcmFwaCA9IHJlcXVpcmUoJy4vTEdyYXBoJyk7XG52YXIgUG9pbnREID0gcmVxdWlyZSgnLi9Qb2ludEQnKTtcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL1RyYW5zZm9ybScpO1xudmFyIEVtaXR0ZXIgPSByZXF1aXJlKCcuL0VtaXR0ZXInKTtcbnZhciBIYXNoU2V0ID0gcmVxdWlyZSgnLi9IYXNoU2V0Jyk7XG5cbmZ1bmN0aW9uIExheW91dChpc1JlbW90ZVVzZSkge1xuICBFbWl0dGVyLmNhbGwoIHRoaXMgKTtcblxuICAvL0xheW91dCBRdWFsaXR5OiAwOnByb29mLCAxOmRlZmF1bHQsIDI6ZHJhZnRcbiAgdGhpcy5sYXlvdXRRdWFsaXR5ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUVVBTElUWTtcbiAgLy9XaGV0aGVyIGxheW91dCBzaG91bGQgY3JlYXRlIGJlbmRwb2ludHMgYXMgbmVlZGVkIG9yIG5vdFxuICB0aGlzLmNyZWF0ZUJlbmRzQXNOZWVkZWQgPVxuICAgICAgICAgIExheW91dENvbnN0YW50cy5ERUZBVUxUX0NSRUFURV9CRU5EU19BU19ORUVERUQ7XG4gIC8vV2hldGhlciBsYXlvdXQgc2hvdWxkIGJlIGluY3JlbWVudGFsIG9yIG5vdFxuICB0aGlzLmluY3JlbWVudGFsID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUw7XG4gIC8vV2hldGhlciB3ZSBhbmltYXRlIGZyb20gYmVmb3JlIHRvIGFmdGVyIGxheW91dCBub2RlIHBvc2l0aW9uc1xuICB0aGlzLmFuaW1hdGlvbk9uTGF5b3V0ID1cbiAgICAgICAgICBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fT05fTEFZT1VUO1xuICAvL1doZXRoZXIgd2UgYW5pbWF0ZSB0aGUgbGF5b3V0IHByb2Nlc3Mgb3Igbm90XG4gIHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX0RVUklOR19MQVlPVVQ7XG4gIC8vTnVtYmVyIGl0ZXJhdGlvbnMgdGhhdCBzaG91bGQgYmUgZG9uZSBiZXR3ZWVuIHR3byBzdWNjZXNzaXZlIGFuaW1hdGlvbnNcbiAgdGhpcy5hbmltYXRpb25QZXJpb2QgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fUEVSSU9EO1xuICAvKipcbiAgICogV2hldGhlciBvciBub3QgbGVhZiBub2RlcyAobm9uLWNvbXBvdW5kIG5vZGVzKSBhcmUgb2YgdW5pZm9ybSBzaXplcy4gV2hlblxuICAgKiB0aGV5IGFyZSwgYm90aCBzcHJpbmcgYW5kIHJlcHVsc2lvbiBmb3JjZXMgYmV0d2VlbiB0d28gbGVhZiBub2RlcyBjYW4gYmVcbiAgICogY2FsY3VsYXRlZCB3aXRob3V0IHRoZSBleHBlbnNpdmUgY2xpcHBpbmcgcG9pbnQgY2FsY3VsYXRpb25zLCByZXN1bHRpbmdcbiAgICogaW4gbWFqb3Igc3BlZWQtdXAuXG4gICAqL1xuICB0aGlzLnVuaWZvcm1MZWFmTm9kZVNpemVzID1cbiAgICAgICAgICBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VTklGT1JNX0xFQUZfTk9ERV9TSVpFUztcbiAgLyoqXG4gICAqIFRoaXMgaXMgdXNlZCBmb3IgY3JlYXRpb24gb2YgYmVuZHBvaW50cyBieSB1c2luZyBkdW1teSBub2RlcyBhbmQgZWRnZXMuXG4gICAqIE1hcHMgYW4gTEVkZ2UgdG8gaXRzIGR1bW15IGJlbmRwb2ludCBwYXRoLlxuICAgKi9cbiAgdGhpcy5lZGdlVG9EdW1teU5vZGVzID0gbmV3IEhhc2hNYXAoKTtcbiAgdGhpcy5ncmFwaE1hbmFnZXIgPSBuZXcgTEdyYXBoTWFuYWdlcih0aGlzKTtcbiAgdGhpcy5pc0xheW91dEZpbmlzaGVkID0gZmFsc2U7XG4gIHRoaXMuaXNTdWJMYXlvdXQgPSBmYWxzZTtcbiAgdGhpcy5pc1JlbW90ZVVzZSA9IGZhbHNlO1xuXG4gIGlmIChpc1JlbW90ZVVzZSAhPSBudWxsKSB7XG4gICAgdGhpcy5pc1JlbW90ZVVzZSA9IGlzUmVtb3RlVXNlO1xuICB9XG59XG5cbkxheW91dC5SQU5ET01fU0VFRCA9IDE7XG5cbkxheW91dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFbWl0dGVyLnByb3RvdHlwZSApO1xuXG5MYXlvdXQucHJvdG90eXBlLmdldEdyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuZ3JhcGhNYW5hZ2VyO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZS5nZXRBbGxOb2RlcyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzKCk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLmdldEFsbEVkZ2VzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsRWRnZXMoKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUuZ2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbigpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZS5uZXdHcmFwaE1hbmFnZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBnbSA9IG5ldyBMR3JhcGhNYW5hZ2VyKHRoaXMpO1xuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xuICByZXR1cm4gZ207XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLm5ld0dyYXBoID0gZnVuY3Rpb24gKHZHcmFwaClcbntcbiAgcmV0dXJuIG5ldyBMR3JhcGgobnVsbCwgdGhpcy5ncmFwaE1hbmFnZXIsIHZHcmFwaCk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLm5ld05vZGUgPSBmdW5jdGlvbiAodk5vZGUpXG57XG4gIHJldHVybiBuZXcgTE5vZGUodGhpcy5ncmFwaE1hbmFnZXIsIHZOb2RlKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUubmV3RWRnZSA9IGZ1bmN0aW9uICh2RWRnZSlcbntcbiAgcmV0dXJuIG5ldyBMRWRnZShudWxsLCBudWxsLCB2RWRnZSk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLmNoZWNrTGF5b3V0U3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKSA9PSBudWxsKVxuICAgICAgICAgIHx8IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXROb2RlcygpLmxlbmd0aCA9PSAwXG4gICAgICAgICAgfHwgdGhpcy5ncmFwaE1hbmFnZXIuaW5jbHVkZXNJbnZhbGlkRWRnZSgpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZS5ydW5MYXlvdXQgPSBmdW5jdGlvbiAoKVxue1xuICB0aGlzLmlzTGF5b3V0RmluaXNoZWQgPSBmYWxzZTtcbiAgXG4gIGlmICh0aGlzLnRpbGluZ1ByZUxheW91dCkge1xuICAgIHRoaXMudGlsaW5nUHJlTGF5b3V0KCk7XG4gIH1cblxuICB0aGlzLmluaXRQYXJhbWV0ZXJzKCk7XG4gIHZhciBpc0xheW91dFN1Y2Nlc3NmdWxsO1xuXG4gIGlmICh0aGlzLmNoZWNrTGF5b3V0U3VjY2VzcygpKVxuICB7XG4gICAgaXNMYXlvdXRTdWNjZXNzZnVsbCA9IGZhbHNlO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIGlzTGF5b3V0U3VjY2Vzc2Z1bGwgPSB0aGlzLmxheW91dCgpO1xuICB9XG4gIFxuICBpZiAoTGF5b3V0Q29uc3RhbnRzLkFOSU1BVEUgPT09ICdkdXJpbmcnKSB7XG4gICAgLy8gSWYgdGhpcyBpcyBhICdkdXJpbmcnIGxheW91dCBhbmltYXRpb24uIExheW91dCBpcyBub3QgZmluaXNoZWQgeWV0LiBcbiAgICAvLyBXZSBuZWVkIHRvIHBlcmZvcm0gdGhlc2UgaW4gaW5kZXguanMgd2hlbiBsYXlvdXQgaXMgcmVhbGx5IGZpbmlzaGVkLlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBcbiAgaWYgKGlzTGF5b3V0U3VjY2Vzc2Z1bGwpXG4gIHtcbiAgICBpZiAoIXRoaXMuaXNTdWJMYXlvdXQpXG4gICAge1xuICAgICAgdGhpcy5kb1Bvc3RMYXlvdXQoKTtcbiAgICB9XG4gIH1cblxuICBpZiAodGhpcy50aWxpbmdQb3N0TGF5b3V0KSB7XG4gICAgdGhpcy50aWxpbmdQb3N0TGF5b3V0KCk7XG4gIH1cblxuICB0aGlzLmlzTGF5b3V0RmluaXNoZWQgPSB0cnVlO1xuXG4gIHJldHVybiBpc0xheW91dFN1Y2Nlc3NmdWxsO1xufTtcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBwZXJmb3JtcyB0aGUgb3BlcmF0aW9ucyByZXF1aXJlZCBhZnRlciBsYXlvdXQuXG4gKi9cbkxheW91dC5wcm90b3R5cGUuZG9Qb3N0TGF5b3V0ID0gZnVuY3Rpb24gKClcbntcbiAgLy9hc3NlcnQgIWlzU3ViTGF5b3V0IDogXCJTaG91bGQgbm90IGJlIGNhbGxlZCBvbiBzdWItbGF5b3V0IVwiO1xuICAvLyBQcm9wYWdhdGUgZ2VvbWV0cmljIGNoYW5nZXMgdG8gdi1sZXZlbCBvYmplY3RzXG4gIGlmKCF0aGlzLmluY3JlbWVudGFsKXtcbiAgICB0aGlzLnRyYW5zZm9ybSgpO1xuICB9XG4gIHRoaXMudXBkYXRlKCk7XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIHVwZGF0ZXMgdGhlIGdlb21ldHJ5IG9mIHRoZSB0YXJnZXQgZ3JhcGggYWNjb3JkaW5nIHRvXG4gKiBjYWxjdWxhdGVkIGxheW91dC5cbiAqL1xuTGF5b3V0LnByb3RvdHlwZS51cGRhdGUyID0gZnVuY3Rpb24gKCkge1xuICAvLyB1cGRhdGUgYmVuZCBwb2ludHNcbiAgaWYgKHRoaXMuY3JlYXRlQmVuZHNBc05lZWRlZClcbiAge1xuICAgIHRoaXMuY3JlYXRlQmVuZHBvaW50c0Zyb21EdW1teU5vZGVzKCk7XG5cbiAgICAvLyByZXNldCBhbGwgZWRnZXMsIHNpbmNlIHRoZSB0b3BvbG9neSBoYXMgY2hhbmdlZFxuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLnJlc2V0QWxsRWRnZXMoKTtcbiAgfVxuXG4gIC8vIHBlcmZvcm0gZWRnZSwgbm9kZSBhbmQgcm9vdCB1cGRhdGVzIGlmIGxheW91dCBpcyBub3QgY2FsbGVkXG4gIC8vIHJlbW90ZWx5XG4gIGlmICghdGhpcy5pc1JlbW90ZVVzZSlcbiAge1xuICAgIC8vIHVwZGF0ZSBhbGwgZWRnZXNcbiAgICB2YXIgZWRnZTtcbiAgICB2YXIgYWxsRWRnZXMgPSB0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxFZGdlcygpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsRWRnZXMubGVuZ3RoOyBpKyspXG4gICAge1xuICAgICAgZWRnZSA9IGFsbEVkZ2VzW2ldO1xuLy8gICAgICB0aGlzLnVwZGF0ZShlZGdlKTtcbiAgICB9XG5cbiAgICAvLyByZWN1cnNpdmVseSB1cGRhdGUgbm9kZXNcbiAgICB2YXIgbm9kZTtcbiAgICB2YXIgbm9kZXMgPSB0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkuZ2V0Tm9kZXMoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxuICAgIHtcbiAgICAgIG5vZGUgPSBub2Rlc1tpXTtcbi8vICAgICAgdGhpcy51cGRhdGUobm9kZSk7XG4gICAgfVxuXG4gICAgLy8gdXBkYXRlIHJvb3QgZ3JhcGhcbiAgICB0aGlzLnVwZGF0ZSh0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkpO1xuICB9XG59O1xuXG5MYXlvdXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgdGhpcy51cGRhdGUyKCk7XG4gIH1cbiAgZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgTE5vZGUpIHtcbiAgICB2YXIgbm9kZSA9IG9iajtcbiAgICBpZiAobm9kZS5nZXRDaGlsZCgpICE9IG51bGwpXG4gICAge1xuICAgICAgLy8gc2luY2Ugbm9kZSBpcyBjb21wb3VuZCwgcmVjdXJzaXZlbHkgdXBkYXRlIGNoaWxkIG5vZGVzXG4gICAgICB2YXIgbm9kZXMgPSBub2RlLmdldENoaWxkKCkuZ2V0Tm9kZXMoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspXG4gICAgICB7XG4gICAgICAgIHVwZGF0ZShub2Rlc1tpXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gaWYgdGhlIGwtbGV2ZWwgbm9kZSBpcyBhc3NvY2lhdGVkIHdpdGggYSB2LWxldmVsIGdyYXBoIG9iamVjdCxcbiAgICAvLyB0aGVuIGl0IGlzIGFzc3VtZWQgdGhhdCB0aGUgdi1sZXZlbCBub2RlIGltcGxlbWVudHMgdGhlXG4gICAgLy8gaW50ZXJmYWNlIFVwZGF0YWJsZS5cbiAgICBpZiAobm9kZS52R3JhcGhPYmplY3QgIT0gbnVsbClcbiAgICB7XG4gICAgICAvLyBjYXN0IHRvIFVwZGF0YWJsZSB3aXRob3V0IGFueSB0eXBlIGNoZWNrXG4gICAgICB2YXIgdk5vZGUgPSBub2RlLnZHcmFwaE9iamVjdDtcblxuICAgICAgLy8gY2FsbCB0aGUgdXBkYXRlIG1ldGhvZCBvZiB0aGUgaW50ZXJmYWNlXG4gICAgICB2Tm9kZS51cGRhdGUobm9kZSk7XG4gICAgfVxuICB9XG4gIGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIExFZGdlKSB7XG4gICAgdmFyIGVkZ2UgPSBvYmo7XG4gICAgLy8gaWYgdGhlIGwtbGV2ZWwgZWRnZSBpcyBhc3NvY2lhdGVkIHdpdGggYSB2LWxldmVsIGdyYXBoIG9iamVjdCxcbiAgICAvLyB0aGVuIGl0IGlzIGFzc3VtZWQgdGhhdCB0aGUgdi1sZXZlbCBlZGdlIGltcGxlbWVudHMgdGhlXG4gICAgLy8gaW50ZXJmYWNlIFVwZGF0YWJsZS5cblxuICAgIGlmIChlZGdlLnZHcmFwaE9iamVjdCAhPSBudWxsKVxuICAgIHtcbiAgICAgIC8vIGNhc3QgdG8gVXBkYXRhYmxlIHdpdGhvdXQgYW55IHR5cGUgY2hlY2tcbiAgICAgIHZhciB2RWRnZSA9IGVkZ2UudkdyYXBoT2JqZWN0O1xuXG4gICAgICAvLyBjYWxsIHRoZSB1cGRhdGUgbWV0aG9kIG9mIHRoZSBpbnRlcmZhY2VcbiAgICAgIHZFZGdlLnVwZGF0ZShlZGdlKTtcbiAgICB9XG4gIH1cbiAgZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgTEdyYXBoKSB7XG4gICAgdmFyIGdyYXBoID0gb2JqO1xuICAgIC8vIGlmIHRoZSBsLWxldmVsIGdyYXBoIGlzIGFzc29jaWF0ZWQgd2l0aCBhIHYtbGV2ZWwgZ3JhcGggb2JqZWN0LFxuICAgIC8vIHRoZW4gaXQgaXMgYXNzdW1lZCB0aGF0IHRoZSB2LWxldmVsIG9iamVjdCBpbXBsZW1lbnRzIHRoZVxuICAgIC8vIGludGVyZmFjZSBVcGRhdGFibGUuXG5cbiAgICBpZiAoZ3JhcGgudkdyYXBoT2JqZWN0ICE9IG51bGwpXG4gICAge1xuICAgICAgLy8gY2FzdCB0byBVcGRhdGFibGUgd2l0aG91dCBhbnkgdHlwZSBjaGVja1xuICAgICAgdmFyIHZHcmFwaCA9IGdyYXBoLnZHcmFwaE9iamVjdDtcblxuICAgICAgLy8gY2FsbCB0aGUgdXBkYXRlIG1ldGhvZCBvZiB0aGUgaW50ZXJmYWNlXG4gICAgICB2R3JhcGgudXBkYXRlKGdyYXBoKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogVGhpcyBtZXRob2QgaXMgdXNlZCB0byBzZXQgYWxsIGxheW91dCBwYXJhbWV0ZXJzIHRvIGRlZmF1bHQgdmFsdWVzXG4gKiBkZXRlcm1pbmVkIGF0IGNvbXBpbGUgdGltZS5cbiAqL1xuTGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycyA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLmlzU3ViTGF5b3V0KVxuICB7XG4gICAgdGhpcy5sYXlvdXRRdWFsaXR5ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUVVBTElUWTtcbiAgICB0aGlzLmFuaW1hdGlvbkR1cmluZ0xheW91dCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9EVVJJTkdfTEFZT1VUO1xuICAgIHRoaXMuYW5pbWF0aW9uUGVyaW9kID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX1BFUklPRDtcbiAgICB0aGlzLmFuaW1hdGlvbk9uTGF5b3V0ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX09OX0xBWU9VVDtcbiAgICB0aGlzLmluY3JlbWVudGFsID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUw7XG4gICAgdGhpcy5jcmVhdGVCZW5kc0FzTmVlZGVkID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ1JFQVRFX0JFTkRTX0FTX05FRURFRDtcbiAgICB0aGlzLnVuaWZvcm1MZWFmTm9kZVNpemVzID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVU5JRk9STV9MRUFGX05PREVfU0laRVM7XG4gIH1cblxuICBpZiAodGhpcy5hbmltYXRpb25EdXJpbmdMYXlvdXQpXG4gIHtcbiAgICB0aGlzLmFuaW1hdGlvbk9uTGF5b3V0ID0gZmFsc2U7XG4gIH1cbn07XG5cbkxheW91dC5wcm90b3R5cGUudHJhbnNmb3JtID0gZnVuY3Rpb24gKG5ld0xlZnRUb3ApIHtcbiAgaWYgKG5ld0xlZnRUb3AgPT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy50cmFuc2Zvcm0obmV3IFBvaW50RCgwLCAwKSk7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gY3JlYXRlIGEgdHJhbnNmb3JtYXRpb24gb2JqZWN0IChmcm9tIEVjbGlwc2UgdG8gbGF5b3V0KS4gV2hlbiBhblxuICAgIC8vIGludmVyc2UgdHJhbnNmb3JtIGlzIGFwcGxpZWQsIHdlIGdldCB1cHBlci1sZWZ0IGNvb3JkaW5hdGUgb2YgdGhlXG4gICAgLy8gZHJhd2luZyBvciB0aGUgcm9vdCBncmFwaCBhdCBnaXZlbiBpbnB1dCBjb29yZGluYXRlIChzb21lIG1hcmdpbnNcbiAgICAvLyBhbHJlYWR5IGluY2x1ZGVkIGluIGNhbGN1bGF0aW9uIG9mIGxlZnQtdG9wKS5cblxuICAgIHZhciB0cmFucyA9IG5ldyBUcmFuc2Zvcm0oKTtcbiAgICB2YXIgbGVmdFRvcCA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS51cGRhdGVMZWZ0VG9wKCk7XG5cbiAgICBpZiAobGVmdFRvcCAhPSBudWxsKVxuICAgIHtcbiAgICAgIHRyYW5zLnNldFdvcmxkT3JnWChuZXdMZWZ0VG9wLngpO1xuICAgICAgdHJhbnMuc2V0V29ybGRPcmdZKG5ld0xlZnRUb3AueSk7XG5cbiAgICAgIHRyYW5zLnNldERldmljZU9yZ1gobGVmdFRvcC54KTtcbiAgICAgIHRyYW5zLnNldERldmljZU9yZ1kobGVmdFRvcC55KTtcblxuICAgICAgdmFyIG5vZGVzID0gdGhpcy5nZXRBbGxOb2RlcygpO1xuICAgICAgdmFyIG5vZGU7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspXG4gICAgICB7XG4gICAgICAgIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgbm9kZS50cmFuc2Zvcm0odHJhbnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuTGF5b3V0LnByb3RvdHlwZS5wb3NpdGlvbk5vZGVzUmFuZG9tbHkgPSBmdW5jdGlvbiAoZ3JhcGgpIHtcblxuICBpZiAoZ3JhcGggPT0gdW5kZWZpbmVkKSB7XG4gICAgLy9hc3NlcnQgIXRoaXMuaW5jcmVtZW50YWw7XG4gICAgdGhpcy5wb3NpdGlvbk5vZGVzUmFuZG9tbHkodGhpcy5nZXRHcmFwaE1hbmFnZXIoKS5nZXRSb290KCkpO1xuICAgIHRoaXMuZ2V0R3JhcGhNYW5hZ2VyKCkuZ2V0Um9vdCgpLnVwZGF0ZUJvdW5kcyh0cnVlKTtcbiAgfVxuICBlbHNlIHtcbiAgICB2YXIgbE5vZGU7XG4gICAgdmFyIGNoaWxkR3JhcGg7XG5cbiAgICB2YXIgbm9kZXMgPSBncmFwaC5nZXROb2RlcygpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspXG4gICAge1xuICAgICAgbE5vZGUgPSBub2Rlc1tpXTtcbiAgICAgIGNoaWxkR3JhcGggPSBsTm9kZS5nZXRDaGlsZCgpO1xuXG4gICAgICBpZiAoY2hpbGRHcmFwaCA9PSBudWxsKVxuICAgICAge1xuICAgICAgICBsTm9kZS5zY2F0dGVyKCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChjaGlsZEdyYXBoLmdldE5vZGVzKCkubGVuZ3RoID09IDApXG4gICAgICB7XG4gICAgICAgIGxOb2RlLnNjYXR0ZXIoKTtcbiAgICAgIH1cbiAgICAgIGVsc2VcbiAgICAgIHtcbiAgICAgICAgdGhpcy5wb3NpdGlvbk5vZGVzUmFuZG9tbHkoY2hpbGRHcmFwaCk7XG4gICAgICAgIGxOb2RlLnVwZGF0ZUJvdW5kcygpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIGEgbGlzdCBvZiB0cmVlcyB3aGVyZSBlYWNoIHRyZWUgaXMgcmVwcmVzZW50ZWQgYXMgYVxuICogbGlzdCBvZiBsLW5vZGVzLiBUaGUgbWV0aG9kIHJldHVybnMgYSBsaXN0IG9mIHNpemUgMCB3aGVuOlxuICogLSBUaGUgZ3JhcGggaXMgbm90IGZsYXQgb3JcbiAqIC0gT25lIG9mIHRoZSBjb21wb25lbnQocykgb2YgdGhlIGdyYXBoIGlzIG5vdCBhIHRyZWUuXG4gKi9cbkxheW91dC5wcm90b3R5cGUuZ2V0RmxhdEZvcmVzdCA9IGZ1bmN0aW9uICgpXG57XG4gIHZhciBmbGF0Rm9yZXN0ID0gW107XG4gIHZhciBpc0ZvcmVzdCA9IHRydWU7XG5cbiAgLy8gUXVpY2sgcmVmZXJlbmNlIGZvciBhbGwgbm9kZXMgaW4gdGhlIGdyYXBoIG1hbmFnZXIgYXNzb2NpYXRlZCB3aXRoXG4gIC8vIHRoaXMgbGF5b3V0LiBUaGUgbGlzdCBzaG91bGQgbm90IGJlIGNoYW5nZWQuXG4gIHZhciBhbGxOb2RlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXROb2RlcygpO1xuXG4gIC8vIEZpcnN0IGJlIHN1cmUgdGhhdCB0aGUgZ3JhcGggaXMgZmxhdFxuICB2YXIgaXNGbGF0ID0gdHJ1ZTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbE5vZGVzLmxlbmd0aDsgaSsrKVxuICB7XG4gICAgaWYgKGFsbE5vZGVzW2ldLmdldENoaWxkKCkgIT0gbnVsbClcbiAgICB7XG4gICAgICBpc0ZsYXQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm4gZW1wdHkgZm9yZXN0IGlmIHRoZSBncmFwaCBpcyBub3QgZmxhdC5cbiAgaWYgKCFpc0ZsYXQpXG4gIHtcbiAgICByZXR1cm4gZmxhdEZvcmVzdDtcbiAgfVxuXG4gIC8vIFJ1biBCRlMgZm9yIGVhY2ggY29tcG9uZW50IG9mIHRoZSBncmFwaC5cblxuICB2YXIgdmlzaXRlZCA9IG5ldyBIYXNoU2V0KCk7XG4gIHZhciB0b0JlVmlzaXRlZCA9IFtdO1xuICB2YXIgcGFyZW50cyA9IG5ldyBIYXNoTWFwKCk7XG4gIHZhciB1blByb2Nlc3NlZE5vZGVzID0gW107XG5cbiAgdW5Qcm9jZXNzZWROb2RlcyA9IHVuUHJvY2Vzc2VkTm9kZXMuY29uY2F0KGFsbE5vZGVzKTtcblxuICAvLyBFYWNoIGl0ZXJhdGlvbiBvZiB0aGlzIGxvb3AgZmluZHMgYSBjb21wb25lbnQgb2YgdGhlIGdyYXBoIGFuZFxuICAvLyBkZWNpZGVzIHdoZXRoZXIgaXQgaXMgYSB0cmVlIG9yIG5vdC4gSWYgaXQgaXMgYSB0cmVlLCBhZGRzIGl0IHRvIHRoZVxuICAvLyBmb3Jlc3QgYW5kIGNvbnRpbnVlZCB3aXRoIHRoZSBuZXh0IGNvbXBvbmVudC5cblxuICB3aGlsZSAodW5Qcm9jZXNzZWROb2Rlcy5sZW5ndGggPiAwICYmIGlzRm9yZXN0KVxuICB7XG4gICAgdG9CZVZpc2l0ZWQucHVzaCh1blByb2Nlc3NlZE5vZGVzWzBdKTtcblxuICAgIC8vIFN0YXJ0IHRoZSBCRlMuIEVhY2ggaXRlcmF0aW9uIG9mIHRoaXMgbG9vcCB2aXNpdHMgYSBub2RlIGluIGFcbiAgICAvLyBCRlMgbWFubmVyLlxuICAgIHdoaWxlICh0b0JlVmlzaXRlZC5sZW5ndGggPiAwICYmIGlzRm9yZXN0KVxuICAgIHtcbiAgICAgIC8vcG9vbCBvcGVyYXRpb25cbiAgICAgIHZhciBjdXJyZW50Tm9kZSA9IHRvQmVWaXNpdGVkWzBdO1xuICAgICAgdG9CZVZpc2l0ZWQuc3BsaWNlKDAsIDEpO1xuICAgICAgdmlzaXRlZC5hZGQoY3VycmVudE5vZGUpO1xuXG4gICAgICAvLyBUcmF2ZXJzZSBhbGwgbmVpZ2hib3JzIG9mIHRoaXMgbm9kZVxuICAgICAgdmFyIG5laWdoYm9yRWRnZXMgPSBjdXJyZW50Tm9kZS5nZXRFZGdlcygpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5laWdoYm9yRWRnZXMubGVuZ3RoOyBpKyspXG4gICAgICB7XG4gICAgICAgIHZhciBjdXJyZW50TmVpZ2hib3IgPVxuICAgICAgICAgICAgICAgIG5laWdoYm9yRWRnZXNbaV0uZ2V0T3RoZXJFbmQoY3VycmVudE5vZGUpO1xuXG4gICAgICAgIC8vIElmIEJGUyBpcyBub3QgZ3Jvd2luZyBmcm9tIHRoaXMgbmVpZ2hib3IuXG4gICAgICAgIGlmIChwYXJlbnRzLmdldChjdXJyZW50Tm9kZSkgIT0gY3VycmVudE5laWdoYm9yKVxuICAgICAgICB7XG4gICAgICAgICAgLy8gV2UgaGF2ZW4ndCBwcmV2aW91c2x5IHZpc2l0ZWQgdGhpcyBuZWlnaGJvci5cbiAgICAgICAgICBpZiAoIXZpc2l0ZWQuY29udGFpbnMoY3VycmVudE5laWdoYm9yKSlcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0b0JlVmlzaXRlZC5wdXNoKGN1cnJlbnROZWlnaGJvcik7XG4gICAgICAgICAgICBwYXJlbnRzLnB1dChjdXJyZW50TmVpZ2hib3IsIGN1cnJlbnROb2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gU2luY2Ugd2UgaGF2ZSBwcmV2aW91c2x5IHZpc2l0ZWQgdGhpcyBuZWlnaGJvciBhbmRcbiAgICAgICAgICAvLyB0aGlzIG5laWdoYm9yIGlzIG5vdCBwYXJlbnQgb2YgY3VycmVudE5vZGUsIGdpdmVuXG4gICAgICAgICAgLy8gZ3JhcGggY29udGFpbnMgYSBjb21wb25lbnQgdGhhdCBpcyBub3QgdHJlZSwgaGVuY2VcbiAgICAgICAgICAvLyBpdCBpcyBub3QgYSBmb3Jlc3QuXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlzRm9yZXN0ID0gZmFsc2U7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGUgZ3JhcGggY29udGFpbnMgYSBjb21wb25lbnQgdGhhdCBpcyBub3QgYSB0cmVlLiBFbXB0eVxuICAgIC8vIHByZXZpb3VzbHkgZm91bmQgdHJlZXMuIFRoZSBtZXRob2Qgd2lsbCBlbmQuXG4gICAgaWYgKCFpc0ZvcmVzdClcbiAgICB7XG4gICAgICBmbGF0Rm9yZXN0ID0gW107XG4gICAgfVxuICAgIC8vIFNhdmUgY3VycmVudGx5IHZpc2l0ZWQgbm9kZXMgYXMgYSB0cmVlIGluIG91ciBmb3Jlc3QuIFJlc2V0XG4gICAgLy8gdmlzaXRlZCBhbmQgcGFyZW50cyBsaXN0cy4gQ29udGludWUgd2l0aCB0aGUgbmV4dCBjb21wb25lbnQgb2ZcbiAgICAvLyB0aGUgZ3JhcGgsIGlmIGFueS5cbiAgICBlbHNlXG4gICAge1xuICAgICAgdmFyIHRlbXAgPSBbXTtcbiAgICAgIHZpc2l0ZWQuYWRkQWxsVG8odGVtcCk7XG4gICAgICBmbGF0Rm9yZXN0LnB1c2godGVtcCk7XG4gICAgICAvL2ZsYXRGb3Jlc3QgPSBmbGF0Rm9yZXN0LmNvbmNhdCh0ZW1wKTtcbiAgICAgIC8vdW5Qcm9jZXNzZWROb2Rlcy5yZW1vdmVBbGwodmlzaXRlZCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRlbXAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdGVtcFtpXTtcbiAgICAgICAgdmFyIGluZGV4ID0gdW5Qcm9jZXNzZWROb2Rlcy5pbmRleE9mKHZhbHVlKTtcbiAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICB1blByb2Nlc3NlZE5vZGVzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZpc2l0ZWQgPSBuZXcgSGFzaFNldCgpO1xuICAgICAgcGFyZW50cyA9IG5ldyBIYXNoTWFwKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZsYXRGb3Jlc3Q7XG59O1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIGNyZWF0ZXMgZHVtbXkgbm9kZXMgKGFuIGwtbGV2ZWwgbm9kZSB3aXRoIG1pbmltYWwgZGltZW5zaW9ucylcbiAqIGZvciB0aGUgZ2l2ZW4gZWRnZSAob25lIHBlciBiZW5kcG9pbnQpLiBUaGUgZXhpc3RpbmcgbC1sZXZlbCBzdHJ1Y3R1cmVcbiAqIGlzIHVwZGF0ZWQgYWNjb3JkaW5nbHkuXG4gKi9cbkxheW91dC5wcm90b3R5cGUuY3JlYXRlRHVtbXlOb2Rlc0ZvckJlbmRwb2ludHMgPSBmdW5jdGlvbiAoZWRnZSlcbntcbiAgdmFyIGR1bW15Tm9kZXMgPSBbXTtcbiAgdmFyIHByZXYgPSBlZGdlLnNvdXJjZTtcblxuICB2YXIgZ3JhcGggPSB0aGlzLmdyYXBoTWFuYWdlci5jYWxjTG93ZXN0Q29tbW9uQW5jZXN0b3IoZWRnZS5zb3VyY2UsIGVkZ2UudGFyZ2V0KTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2UuYmVuZHBvaW50cy5sZW5ndGg7IGkrKylcbiAge1xuICAgIC8vIGNyZWF0ZSBuZXcgZHVtbXkgbm9kZVxuICAgIHZhciBkdW1teU5vZGUgPSB0aGlzLm5ld05vZGUobnVsbCk7XG4gICAgZHVtbXlOb2RlLnNldFJlY3QobmV3IFBvaW50KDAsIDApLCBuZXcgRGltZW5zaW9uKDEsIDEpKTtcblxuICAgIGdyYXBoLmFkZChkdW1teU5vZGUpO1xuXG4gICAgLy8gY3JlYXRlIG5ldyBkdW1teSBlZGdlIGJldHdlZW4gcHJldiBhbmQgZHVtbXkgbm9kZVxuICAgIHZhciBkdW1teUVkZ2UgPSB0aGlzLm5ld0VkZ2UobnVsbCk7XG4gICAgdGhpcy5ncmFwaE1hbmFnZXIuYWRkKGR1bW15RWRnZSwgcHJldiwgZHVtbXlOb2RlKTtcblxuICAgIGR1bW15Tm9kZXMuYWRkKGR1bW15Tm9kZSk7XG4gICAgcHJldiA9IGR1bW15Tm9kZTtcbiAgfVxuXG4gIHZhciBkdW1teUVkZ2UgPSB0aGlzLm5ld0VkZ2UobnVsbCk7XG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLmFkZChkdW1teUVkZ2UsIHByZXYsIGVkZ2UudGFyZ2V0KTtcblxuICB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMucHV0KGVkZ2UsIGR1bW15Tm9kZXMpO1xuXG4gIC8vIHJlbW92ZSByZWFsIGVkZ2UgZnJvbSBncmFwaCBtYW5hZ2VyIGlmIGl0IGlzIGludGVyLWdyYXBoXG4gIGlmIChlZGdlLmlzSW50ZXJHcmFwaCgpKVxuICB7XG4gICAgdGhpcy5ncmFwaE1hbmFnZXIucmVtb3ZlKGVkZ2UpO1xuICB9XG4gIC8vIGVsc2UsIHJlbW92ZSB0aGUgZWRnZSBmcm9tIHRoZSBjdXJyZW50IGdyYXBoXG4gIGVsc2VcbiAge1xuICAgIGdyYXBoLnJlbW92ZShlZGdlKTtcbiAgfVxuXG4gIHJldHVybiBkdW1teU5vZGVzO1xufTtcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBjcmVhdGVzIGJlbmRwb2ludHMgZm9yIGVkZ2VzIGZyb20gdGhlIGR1bW15IG5vZGVzXG4gKiBhdCBsLWxldmVsLlxuICovXG5MYXlvdXQucHJvdG90eXBlLmNyZWF0ZUJlbmRwb2ludHNGcm9tRHVtbXlOb2RlcyA9IGZ1bmN0aW9uICgpXG57XG4gIHZhciBlZGdlcyA9IFtdO1xuICBlZGdlcyA9IGVkZ2VzLmNvbmNhdCh0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxFZGdlcygpKTtcbiAgZWRnZXMgPSB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMua2V5U2V0KCkuY29uY2F0KGVkZ2VzKTtcblxuICBmb3IgKHZhciBrID0gMDsgayA8IGVkZ2VzLmxlbmd0aDsgaysrKVxuICB7XG4gICAgdmFyIGxFZGdlID0gZWRnZXNba107XG5cbiAgICBpZiAobEVkZ2UuYmVuZHBvaW50cy5sZW5ndGggPiAwKVxuICAgIHtcbiAgICAgIHZhciBwYXRoID0gdGhpcy5lZGdlVG9EdW1teU5vZGVzLmdldChsRWRnZSk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKylcbiAgICAgIHtcbiAgICAgICAgdmFyIGR1bW15Tm9kZSA9IHBhdGhbaV07XG4gICAgICAgIHZhciBwID0gbmV3IFBvaW50RChkdW1teU5vZGUuZ2V0Q2VudGVyWCgpLFxuICAgICAgICAgICAgICAgIGR1bW15Tm9kZS5nZXRDZW50ZXJZKCkpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBiZW5kcG9pbnQncyBsb2NhdGlvbiBhY2NvcmRpbmcgdG8gZHVtbXkgbm9kZVxuICAgICAgICB2YXIgZWJwID0gbEVkZ2UuYmVuZHBvaW50cy5nZXQoaSk7XG4gICAgICAgIGVicC54ID0gcC54O1xuICAgICAgICBlYnAueSA9IHAueTtcblxuICAgICAgICAvLyByZW1vdmUgdGhlIGR1bW15IG5vZGUsIGR1bW15IGVkZ2VzIGluY2lkZW50IHdpdGggdGhpc1xuICAgICAgICAvLyBkdW1teSBub2RlIGlzIGFsc28gcmVtb3ZlZCAod2l0aGluIHRoZSByZW1vdmUgbWV0aG9kKVxuICAgICAgICBkdW1teU5vZGUuZ2V0T3duZXIoKS5yZW1vdmUoZHVtbXlOb2RlKTtcbiAgICAgIH1cblxuICAgICAgLy8gYWRkIHRoZSByZWFsIGVkZ2UgdG8gZ3JhcGhcbiAgICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLmFkZChsRWRnZSwgbEVkZ2Uuc291cmNlLCBsRWRnZS50YXJnZXQpO1xuICAgIH1cbiAgfVxufTtcblxuTGF5b3V0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChzbGlkZXJWYWx1ZSwgZGVmYXVsdFZhbHVlLCBtaW5EaXYsIG1heE11bCkge1xuICBpZiAobWluRGl2ICE9IHVuZGVmaW5lZCAmJiBtYXhNdWwgIT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIHZhbHVlID0gZGVmYXVsdFZhbHVlO1xuXG4gICAgaWYgKHNsaWRlclZhbHVlIDw9IDUwKVxuICAgIHtcbiAgICAgIHZhciBtaW5WYWx1ZSA9IGRlZmF1bHRWYWx1ZSAvIG1pbkRpdjtcbiAgICAgIHZhbHVlIC09ICgoZGVmYXVsdFZhbHVlIC0gbWluVmFsdWUpIC8gNTApICogKDUwIC0gc2xpZGVyVmFsdWUpO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgdmFyIG1heFZhbHVlID0gZGVmYXVsdFZhbHVlICogbWF4TXVsO1xuICAgICAgdmFsdWUgKz0gKChtYXhWYWx1ZSAtIGRlZmF1bHRWYWx1ZSkgLyA1MCkgKiAoc2xpZGVyVmFsdWUgLSA1MCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGVsc2Uge1xuICAgIHZhciBhLCBiO1xuXG4gICAgaWYgKHNsaWRlclZhbHVlIDw9IDUwKVxuICAgIHtcbiAgICAgIGEgPSA5LjAgKiBkZWZhdWx0VmFsdWUgLyA1MDAuMDtcbiAgICAgIGIgPSBkZWZhdWx0VmFsdWUgLyAxMC4wO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgYSA9IDkuMCAqIGRlZmF1bHRWYWx1ZSAvIDUwLjA7XG4gICAgICBiID0gLTggKiBkZWZhdWx0VmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIChhICogc2xpZGVyVmFsdWUgKyBiKTtcbiAgfVxufTtcblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBmaW5kcyBhbmQgcmV0dXJucyB0aGUgY2VudGVyIG9mIHRoZSBnaXZlbiBub2RlcywgYXNzdW1pbmdcbiAqIHRoYXQgdGhlIGdpdmVuIG5vZGVzIGZvcm0gYSB0cmVlIGluIHRoZW1zZWx2ZXMuXG4gKi9cbkxheW91dC5maW5kQ2VudGVyT2ZUcmVlID0gZnVuY3Rpb24gKG5vZGVzKVxue1xuICB2YXIgbGlzdCA9IFtdO1xuICBsaXN0ID0gbGlzdC5jb25jYXQobm9kZXMpO1xuXG4gIHZhciByZW1vdmVkTm9kZXMgPSBbXTtcbiAgdmFyIHJlbWFpbmluZ0RlZ3JlZXMgPSBuZXcgSGFzaE1hcCgpO1xuICB2YXIgZm91bmRDZW50ZXIgPSBmYWxzZTtcbiAgdmFyIGNlbnRlck5vZGUgPSBudWxsO1xuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PSAxIHx8IGxpc3QubGVuZ3RoID09IDIpXG4gIHtcbiAgICBmb3VuZENlbnRlciA9IHRydWU7XG4gICAgY2VudGVyTm9kZSA9IGxpc3RbMF07XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspXG4gIHtcbiAgICB2YXIgbm9kZSA9IGxpc3RbaV07XG4gICAgdmFyIGRlZ3JlZSA9IG5vZGUuZ2V0TmVpZ2hib3JzTGlzdCgpLnNpemUoKTtcbiAgICByZW1haW5pbmdEZWdyZWVzLnB1dChub2RlLCBub2RlLmdldE5laWdoYm9yc0xpc3QoKS5zaXplKCkpO1xuXG4gICAgaWYgKGRlZ3JlZSA9PSAxKVxuICAgIHtcbiAgICAgIHJlbW92ZWROb2Rlcy5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciB0ZW1wTGlzdCA9IFtdO1xuICB0ZW1wTGlzdCA9IHRlbXBMaXN0LmNvbmNhdChyZW1vdmVkTm9kZXMpO1xuXG4gIHdoaWxlICghZm91bmRDZW50ZXIpXG4gIHtcbiAgICB2YXIgdGVtcExpc3QyID0gW107XG4gICAgdGVtcExpc3QyID0gdGVtcExpc3QyLmNvbmNhdCh0ZW1wTGlzdCk7XG4gICAgdGVtcExpc3QgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICB2YXIgbm9kZSA9IGxpc3RbaV07XG5cbiAgICAgIHZhciBpbmRleCA9IGxpc3QuaW5kZXhPZihub2RlKTtcbiAgICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgIGxpc3Quc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIH1cblxuICAgICAgdmFyIG5laWdoYm91cnMgPSBub2RlLmdldE5laWdoYm9yc0xpc3QoKTtcblxuICAgICAgT2JqZWN0LmtleXMobmVpZ2hib3Vycy5zZXQpLmZvckVhY2goZnVuY3Rpb24oaikge1xuICAgICAgICB2YXIgbmVpZ2hib3VyID0gbmVpZ2hib3Vycy5zZXRbal07XG4gICAgICAgIGlmIChyZW1vdmVkTm9kZXMuaW5kZXhPZihuZWlnaGJvdXIpIDwgMClcbiAgICAgICAge1xuICAgICAgICAgIHZhciBvdGhlckRlZ3JlZSA9IHJlbWFpbmluZ0RlZ3JlZXMuZ2V0KG5laWdoYm91cik7XG4gICAgICAgICAgdmFyIG5ld0RlZ3JlZSA9IG90aGVyRGVncmVlIC0gMTtcblxuICAgICAgICAgIGlmIChuZXdEZWdyZWUgPT0gMSlcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0ZW1wTGlzdC5wdXNoKG5laWdoYm91cik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVtYWluaW5nRGVncmVlcy5wdXQobmVpZ2hib3VyLCBuZXdEZWdyZWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZW1vdmVkTm9kZXMgPSByZW1vdmVkTm9kZXMuY29uY2F0KHRlbXBMaXN0KTtcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PSAxIHx8IGxpc3QubGVuZ3RoID09IDIpXG4gICAge1xuICAgICAgZm91bmRDZW50ZXIgPSB0cnVlO1xuICAgICAgY2VudGVyTm9kZSA9IGxpc3RbMF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNlbnRlck5vZGU7XG59O1xuXG4vKipcbiAqIER1cmluZyB0aGUgY29hcnNlbmluZyBwcm9jZXNzLCB0aGlzIGxheW91dCBtYXkgYmUgcmVmZXJlbmNlZCBieSB0d28gZ3JhcGggbWFuYWdlcnNcbiAqIHRoaXMgc2V0dGVyIGZ1bmN0aW9uIGdyYW50cyBhY2Nlc3MgdG8gY2hhbmdlIHRoZSBjdXJyZW50bHkgYmVpbmcgdXNlZCBncmFwaCBtYW5hZ2VyXG4gKi9cbkxheW91dC5wcm90b3R5cGUuc2V0R3JhcGhNYW5hZ2VyID0gZnVuY3Rpb24gKGdtKVxue1xuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXQ7XG4iLCJmdW5jdGlvbiBMYXlvdXRDb25zdGFudHMoKSB7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMYXlvdXQgUXVhbGl0eVxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLlBST09GX1FVQUxJVFkgPSAwO1xyXG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9RVUFMSVRZID0gMTtcclxuTGF5b3V0Q29uc3RhbnRzLkRSQUZUX1FVQUxJVFkgPSAyO1xyXG5cclxuLyoqXHJcbiAqIERlZmF1bHQgcGFyYW1ldGVyc1xyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ1JFQVRFX0JFTkRTX0FTX05FRURFRCA9IGZhbHNlO1xyXG4vL0xheW91dENvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMID0gdHJ1ZTtcclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUwgPSBmYWxzZTtcclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX09OX0xBWU9VVCA9IHRydWU7XHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9EVVJJTkdfTEFZT1VUID0gZmFsc2U7XHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9QRVJJT0QgPSA1MDtcclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfVU5JRk9STV9MRUFGX05PREVfU0laRVMgPSBmYWxzZTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFNlY3Rpb246IEdlbmVyYWwgb3RoZXIgY29uc3RhbnRzXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8qXHJcbiAqIE1hcmdpbnMgb2YgYSBncmFwaCB0byBiZSBhcHBsaWVkIG9uIGJvdWRpbmcgcmVjdGFuZ2xlIG9mIGl0cyBjb250ZW50cy4gV2VcclxuICogYXNzdW1lIG1hcmdpbnMgb24gYWxsIGZvdXIgc2lkZXMgdG8gYmUgdW5pZm9ybS5cclxuICovXHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVBIX01BUkdJTiA9IDE1O1xyXG5cclxuLypcclxuICogV2hldGhlciB0byBjb25zaWRlciBsYWJlbHMgaW4gbm9kZSBkaW1lbnNpb25zIG9yIG5vdFxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLk5PREVfRElNRU5TSU9OU19JTkNMVURFX0xBQkVMUyA9IGZhbHNlO1xyXG5cclxuLypcclxuICogRGVmYXVsdCBkaW1lbnNpb24gb2YgYSBub24tY29tcG91bmQgbm9kZS5cclxuICovXHJcbkxheW91dENvbnN0YW50cy5TSU1QTEVfTk9ERV9TSVpFID0gNDA7XHJcblxyXG4vKlxyXG4gKiBEZWZhdWx0IGRpbWVuc2lvbiBvZiBhIG5vbi1jb21wb3VuZCBub2RlLlxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLlNJTVBMRV9OT0RFX0hBTEZfU0laRSA9IExheW91dENvbnN0YW50cy5TSU1QTEVfTk9ERV9TSVpFIC8gMjtcclxuXHJcbi8qXHJcbiAqIEVtcHR5IGNvbXBvdW5kIG5vZGUgc2l6ZS4gV2hlbiBhIGNvbXBvdW5kIG5vZGUgaXMgZW1wdHksIGl0cyBib3RoXHJcbiAqIGRpbWVuc2lvbnMgc2hvdWxkIGJlIG9mIHRoaXMgdmFsdWUuXHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuRU1QVFlfQ09NUE9VTkRfTk9ERV9TSVpFID0gNDA7XHJcblxyXG4vKlxyXG4gKiBNaW5pbXVtIGxlbmd0aCB0aGF0IGFuIGVkZ2Ugc2hvdWxkIHRha2UgZHVyaW5nIGxheW91dFxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLk1JTl9FREdFX0xFTkdUSCA9IDE7XHJcblxyXG4vKlxyXG4gKiBXb3JsZCBib3VuZGFyaWVzIHRoYXQgbGF5b3V0IG9wZXJhdGVzIG9uXHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlkgPSAxMDAwMDAwO1xyXG5cclxuLypcclxuICogV29ybGQgYm91bmRhcmllcyB0aGF0IHJhbmRvbSBwb3NpdGlvbmluZyBjYW4gYmUgcGVyZm9ybWVkIHdpdGhcclxuICovXHJcbkxheW91dENvbnN0YW50cy5JTklUSUFMX1dPUkxEX0JPVU5EQVJZID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZIC8gMTAwMDtcclxuXHJcbi8qXHJcbiAqIENvb3JkaW5hdGVzIG9mIHRoZSB3b3JsZCBjZW50ZXJcclxuICovXHJcbkxheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWCA9IDEyMDA7XHJcbkxheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWSA9IDkwMDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0Q29uc3RhbnRzO1xyXG4iLCIvKlxyXG4gKlRoaXMgY2xhc3MgaXMgdGhlIGphdmFzY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIFBvaW50LmphdmEgY2xhc3MgaW4gamRrXHJcbiAqL1xyXG5mdW5jdGlvbiBQb2ludCh4LCB5LCBwKSB7XHJcbiAgdGhpcy54ID0gbnVsbDtcclxuICB0aGlzLnkgPSBudWxsO1xyXG4gIGlmICh4ID09IG51bGwgJiYgeSA9PSBudWxsICYmIHAgPT0gbnVsbCkge1xyXG4gICAgdGhpcy54ID0gMDtcclxuICAgIHRoaXMueSA9IDA7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHR5cGVvZiB4ID09ICdudW1iZXInICYmIHR5cGVvZiB5ID09ICdudW1iZXInICYmIHAgPT0gbnVsbCkge1xyXG4gICAgdGhpcy54ID0geDtcclxuICAgIHRoaXMueSA9IHk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHguY29uc3RydWN0b3IubmFtZSA9PSAnUG9pbnQnICYmIHkgPT0gbnVsbCAmJiBwID09IG51bGwpIHtcclxuICAgIHAgPSB4O1xyXG4gICAgdGhpcy54ID0gcC54O1xyXG4gICAgdGhpcy55ID0gcC55O1xyXG4gIH1cclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLmdldFggPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMueDtcclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLmdldFkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMueTtcclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLmdldExvY2F0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBuZXcgUG9pbnQodGhpcy54LCB0aGlzLnkpO1xyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUuc2V0TG9jYXRpb24gPSBmdW5jdGlvbiAoeCwgeSwgcCkge1xyXG4gIGlmICh4LmNvbnN0cnVjdG9yLm5hbWUgPT0gJ1BvaW50JyAmJiB5ID09IG51bGwgJiYgcCA9PSBudWxsKSB7XHJcbiAgICBwID0geDtcclxuICAgIHRoaXMuc2V0TG9jYXRpb24ocC54LCBwLnkpO1xyXG4gIH1cclxuICBlbHNlIGlmICh0eXBlb2YgeCA9PSAnbnVtYmVyJyAmJiB0eXBlb2YgeSA9PSAnbnVtYmVyJyAmJiBwID09IG51bGwpIHtcclxuICAgIC8vaWYgYm90aCBwYXJhbWV0ZXJzIGFyZSBpbnRlZ2VyIGp1c3QgbW92ZSAoeCx5KSBsb2NhdGlvblxyXG4gICAgaWYgKHBhcnNlSW50KHgpID09IHggJiYgcGFyc2VJbnQoeSkgPT0geSkge1xyXG4gICAgICB0aGlzLm1vdmUoeCwgeSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdGhpcy54ID0gTWF0aC5mbG9vcih4ICsgMC41KTtcclxuICAgICAgdGhpcy55ID0gTWF0aC5mbG9vcih5ICsgMC41KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcblBvaW50LnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuICB0aGlzLnggPSB4O1xyXG4gIHRoaXMueSA9IHk7XHJcbn1cclxuXHJcblBvaW50LnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbiAoZHgsIGR5KSB7XHJcbiAgdGhpcy54ICs9IGR4O1xyXG4gIHRoaXMueSArPSBkeTtcclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIChvYmopIHtcclxuICBpZiAob2JqLmNvbnN0cnVjdG9yLm5hbWUgPT0gXCJQb2ludFwiKSB7XHJcbiAgICB2YXIgcHQgPSBvYmo7XHJcbiAgICByZXR1cm4gKHRoaXMueCA9PSBwdC54KSAmJiAodGhpcy55ID09IHB0LnkpO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcyA9PSBvYmo7XHJcbn1cclxuXHJcblBvaW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gbmV3IFBvaW50KCkuY29uc3RydWN0b3IubmFtZSArIFwiW3g9XCIgKyB0aGlzLnggKyBcIix5PVwiICsgdGhpcy55ICsgXCJdXCI7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUG9pbnQ7XHJcbiIsImZ1bmN0aW9uIFBvaW50RCh4LCB5KSB7XHJcbiAgaWYgKHggPT0gbnVsbCAmJiB5ID09IG51bGwpIHtcclxuICAgIHRoaXMueCA9IDA7XHJcbiAgICB0aGlzLnkgPSAwO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLnggPSB4O1xyXG4gICAgdGhpcy55ID0geTtcclxuICB9XHJcbn1cclxuXHJcblBvaW50RC5wcm90b3R5cGUuZ2V0WCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy54O1xyXG59O1xyXG5cclxuUG9pbnRELnByb3RvdHlwZS5nZXRZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnk7XHJcbn07XHJcblxyXG5Qb2ludEQucHJvdG90eXBlLnNldFggPSBmdW5jdGlvbiAoeClcclxue1xyXG4gIHRoaXMueCA9IHg7XHJcbn07XHJcblxyXG5Qb2ludEQucHJvdG90eXBlLnNldFkgPSBmdW5jdGlvbiAoeSlcclxue1xyXG4gIHRoaXMueSA9IHk7XHJcbn07XHJcblxyXG5Qb2ludEQucHJvdG90eXBlLmdldERpZmZlcmVuY2UgPSBmdW5jdGlvbiAocHQpXHJcbntcclxuICByZXR1cm4gbmV3IERpbWVuc2lvbkQodGhpcy54IC0gcHQueCwgdGhpcy55IC0gcHQueSk7XHJcbn07XHJcblxyXG5Qb2ludEQucHJvdG90eXBlLmdldENvcHkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIG5ldyBQb2ludEQodGhpcy54LCB0aGlzLnkpO1xyXG59O1xyXG5cclxuUG9pbnRELnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbiAoZGltKVxyXG57XHJcbiAgdGhpcy54ICs9IGRpbS53aWR0aDtcclxuICB0aGlzLnkgKz0gZGltLmhlaWdodDtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUG9pbnREO1xyXG4iLCJmdW5jdGlvbiBSYW5kb21TZWVkKCkge1xyXG59XHJcblJhbmRvbVNlZWQuc2VlZCA9IDE7XHJcblJhbmRvbVNlZWQueCA9IDA7XHJcblxyXG5SYW5kb21TZWVkLm5leHREb3VibGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgUmFuZG9tU2VlZC54ID0gTWF0aC5zaW4oUmFuZG9tU2VlZC5zZWVkKyspICogMTAwMDA7XHJcbiAgcmV0dXJuIFJhbmRvbVNlZWQueCAtIE1hdGguZmxvb3IoUmFuZG9tU2VlZC54KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmFuZG9tU2VlZDtcclxuIiwiZnVuY3Rpb24gUmVjdGFuZ2xlRCh4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XHJcbiAgdGhpcy54ID0gMDtcclxuICB0aGlzLnkgPSAwO1xyXG4gIHRoaXMud2lkdGggPSAwO1xyXG4gIHRoaXMuaGVpZ2h0ID0gMDtcclxuXHJcbiAgaWYgKHggIT0gbnVsbCAmJiB5ICE9IG51bGwgJiYgd2lkdGggIT0gbnVsbCAmJiBoZWlnaHQgIT0gbnVsbCkge1xyXG4gICAgdGhpcy54ID0geDtcclxuICAgIHRoaXMueSA9IHk7XHJcbiAgICB0aGlzLndpZHRoID0gd2lkdGg7XHJcbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcclxuICB9XHJcbn1cclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldFggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLnNldFggPSBmdW5jdGlvbiAoeClcclxue1xyXG4gIHRoaXMueCA9IHg7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnk7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5zZXRZID0gZnVuY3Rpb24gKHkpXHJcbntcclxuICB0aGlzLnkgPSB5O1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0V2lkdGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMud2lkdGg7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5zZXRXaWR0aCA9IGZ1bmN0aW9uICh3aWR0aClcclxue1xyXG4gIHRoaXMud2lkdGggPSB3aWR0aDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldEhlaWdodCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5oZWlnaHQ7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbiAoaGVpZ2h0KVxyXG57XHJcbiAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRSaWdodCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy54ICsgdGhpcy53aWR0aDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldEJvdHRvbSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy55ICsgdGhpcy5oZWlnaHQ7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5pbnRlcnNlY3RzID0gZnVuY3Rpb24gKGEpXHJcbntcclxuICBpZiAodGhpcy5nZXRSaWdodCgpIDwgYS54KVxyXG4gIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIGlmICh0aGlzLmdldEJvdHRvbSgpIDwgYS55KVxyXG4gIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIGlmIChhLmdldFJpZ2h0KCkgPCB0aGlzLngpXHJcbiAge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgaWYgKGEuZ2V0Qm90dG9tKCkgPCB0aGlzLnkpXHJcbiAge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRDZW50ZXJYID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnggKyB0aGlzLndpZHRoIC8gMjtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldE1pblggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuZ2V0WCgpO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0TWF4WCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5nZXRYKCkgKyB0aGlzLndpZHRoO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0Q2VudGVyWSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy55ICsgdGhpcy5oZWlnaHQgLyAyO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0TWluWSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5nZXRZKCk7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRNYXhZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmdldFkoKSArIHRoaXMuaGVpZ2h0O1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0V2lkdGhIYWxmID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLndpZHRoIC8gMjtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldEhlaWdodEhhbGYgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuaGVpZ2h0IC8gMjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVjdGFuZ2xlRDtcclxuIiwidmFyIFBvaW50RCA9IHJlcXVpcmUoJy4vUG9pbnREJyk7XHJcblxyXG5mdW5jdGlvbiBUcmFuc2Zvcm0oeCwgeSkge1xyXG4gIHRoaXMubHdvcmxkT3JnWCA9IDAuMDtcclxuICB0aGlzLmx3b3JsZE9yZ1kgPSAwLjA7XHJcbiAgdGhpcy5sZGV2aWNlT3JnWCA9IDAuMDtcclxuICB0aGlzLmxkZXZpY2VPcmdZID0gMC4wO1xyXG4gIHRoaXMubHdvcmxkRXh0WCA9IDEuMDtcclxuICB0aGlzLmx3b3JsZEV4dFkgPSAxLjA7XHJcbiAgdGhpcy5sZGV2aWNlRXh0WCA9IDEuMDtcclxuICB0aGlzLmxkZXZpY2VFeHRZID0gMS4wO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFdvcmxkT3JnWCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sd29ybGRPcmdYO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldFdvcmxkT3JnWCA9IGZ1bmN0aW9uICh3b3gpXHJcbntcclxuICB0aGlzLmx3b3JsZE9yZ1ggPSB3b3g7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0V29ybGRPcmdZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmx3b3JsZE9yZ1k7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0V29ybGRPcmdZID0gZnVuY3Rpb24gKHdveSlcclxue1xyXG4gIHRoaXMubHdvcmxkT3JnWSA9IHdveTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXRXb3JsZEV4dFggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubHdvcmxkRXh0WDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRXb3JsZEV4dFggPSBmdW5jdGlvbiAod2V4KVxyXG57XHJcbiAgdGhpcy5sd29ybGRFeHRYID0gd2V4O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFdvcmxkRXh0WSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sd29ybGRFeHRZO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldFdvcmxkRXh0WSA9IGZ1bmN0aW9uICh3ZXkpXHJcbntcclxuICB0aGlzLmx3b3JsZEV4dFkgPSB3ZXk7XHJcbn1cclxuXHJcbi8qIERldmljZSByZWxhdGVkICovXHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZU9yZ1ggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGRldmljZU9yZ1g7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGV2aWNlT3JnWCA9IGZ1bmN0aW9uIChkb3gpXHJcbntcclxuICB0aGlzLmxkZXZpY2VPcmdYID0gZG94O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZU9yZ1kgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGRldmljZU9yZ1k7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGV2aWNlT3JnWSA9IGZ1bmN0aW9uIChkb3kpXHJcbntcclxuICB0aGlzLmxkZXZpY2VPcmdZID0gZG95O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZUV4dFggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGRldmljZUV4dFg7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGV2aWNlRXh0WCA9IGZ1bmN0aW9uIChkZXgpXHJcbntcclxuICB0aGlzLmxkZXZpY2VFeHRYID0gZGV4O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldERldmljZUV4dFkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGRldmljZUV4dFk7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGV2aWNlRXh0WSA9IGZ1bmN0aW9uIChkZXkpXHJcbntcclxuICB0aGlzLmxkZXZpY2VFeHRZID0gZGV5O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnRyYW5zZm9ybVggPSBmdW5jdGlvbiAoeClcclxue1xyXG4gIHZhciB4RGV2aWNlID0gMC4wO1xyXG4gIHZhciB3b3JsZEV4dFggPSB0aGlzLmx3b3JsZEV4dFg7XHJcbiAgaWYgKHdvcmxkRXh0WCAhPSAwLjApXHJcbiAge1xyXG4gICAgeERldmljZSA9IHRoaXMubGRldmljZU9yZ1ggK1xyXG4gICAgICAgICAgICAoKHggLSB0aGlzLmx3b3JsZE9yZ1gpICogdGhpcy5sZGV2aWNlRXh0WCAvIHdvcmxkRXh0WCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4geERldmljZTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS50cmFuc2Zvcm1ZID0gZnVuY3Rpb24gKHkpXHJcbntcclxuICB2YXIgeURldmljZSA9IDAuMDtcclxuICB2YXIgd29ybGRFeHRZID0gdGhpcy5sd29ybGRFeHRZO1xyXG4gIGlmICh3b3JsZEV4dFkgIT0gMC4wKVxyXG4gIHtcclxuICAgIHlEZXZpY2UgPSB0aGlzLmxkZXZpY2VPcmdZICtcclxuICAgICAgICAgICAgKCh5IC0gdGhpcy5sd29ybGRPcmdZKSAqIHRoaXMubGRldmljZUV4dFkgLyB3b3JsZEV4dFkpO1xyXG4gIH1cclxuXHJcblxyXG4gIHJldHVybiB5RGV2aWNlO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmludmVyc2VUcmFuc2Zvcm1YID0gZnVuY3Rpb24gKHgpXHJcbntcclxuICB2YXIgeFdvcmxkID0gMC4wO1xyXG4gIHZhciBkZXZpY2VFeHRYID0gdGhpcy5sZGV2aWNlRXh0WDtcclxuICBpZiAoZGV2aWNlRXh0WCAhPSAwLjApXHJcbiAge1xyXG4gICAgeFdvcmxkID0gdGhpcy5sd29ybGRPcmdYICtcclxuICAgICAgICAgICAgKCh4IC0gdGhpcy5sZGV2aWNlT3JnWCkgKiB0aGlzLmx3b3JsZEV4dFggLyBkZXZpY2VFeHRYKTtcclxuICB9XHJcblxyXG5cclxuICByZXR1cm4geFdvcmxkO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmludmVyc2VUcmFuc2Zvcm1ZID0gZnVuY3Rpb24gKHkpXHJcbntcclxuICB2YXIgeVdvcmxkID0gMC4wO1xyXG4gIHZhciBkZXZpY2VFeHRZID0gdGhpcy5sZGV2aWNlRXh0WTtcclxuICBpZiAoZGV2aWNlRXh0WSAhPSAwLjApXHJcbiAge1xyXG4gICAgeVdvcmxkID0gdGhpcy5sd29ybGRPcmdZICtcclxuICAgICAgICAgICAgKCh5IC0gdGhpcy5sZGV2aWNlT3JnWSkgKiB0aGlzLmx3b3JsZEV4dFkgLyBkZXZpY2VFeHRZKTtcclxuICB9XHJcbiAgcmV0dXJuIHlXb3JsZDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5pbnZlcnNlVHJhbnNmb3JtUG9pbnQgPSBmdW5jdGlvbiAoaW5Qb2ludClcclxue1xyXG4gIHZhciBvdXRQb2ludCA9XHJcbiAgICAgICAgICBuZXcgUG9pbnREKHRoaXMuaW52ZXJzZVRyYW5zZm9ybVgoaW5Qb2ludC54KSxcclxuICAgICAgICAgICAgICAgICAgdGhpcy5pbnZlcnNlVHJhbnNmb3JtWShpblBvaW50LnkpKTtcclxuICByZXR1cm4gb3V0UG9pbnQ7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtO1xyXG4iLCJmdW5jdGlvbiBVbmlxdWVJREdlbmVyZXRvcigpIHtcclxufVxyXG5cclxuVW5pcXVlSURHZW5lcmV0b3IubGFzdElEID0gMDtcclxuXHJcblVuaXF1ZUlER2VuZXJldG9yLmNyZWF0ZUlEID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIGlmIChVbmlxdWVJREdlbmVyZXRvci5pc1ByaW1pdGl2ZShvYmopKSB7XHJcbiAgICByZXR1cm4gb2JqO1xyXG4gIH1cclxuICBpZiAob2JqLnVuaXF1ZUlEICE9IG51bGwpIHtcclxuICAgIHJldHVybiBvYmoudW5pcXVlSUQ7XHJcbiAgfVxyXG4gIG9iai51bmlxdWVJRCA9IFVuaXF1ZUlER2VuZXJldG9yLmdldFN0cmluZygpO1xyXG4gIFVuaXF1ZUlER2VuZXJldG9yLmxhc3RJRCsrO1xyXG4gIHJldHVybiBvYmoudW5pcXVlSUQ7XHJcbn1cclxuXHJcblVuaXF1ZUlER2VuZXJldG9yLmdldFN0cmluZyA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIGlmIChpZCA9PSBudWxsKVxyXG4gICAgaWQgPSBVbmlxdWVJREdlbmVyZXRvci5sYXN0SUQ7XHJcbiAgcmV0dXJuIFwiT2JqZWN0I1wiICsgaWQgKyBcIlwiO1xyXG59XHJcblxyXG5VbmlxdWVJREdlbmVyZXRvci5pc1ByaW1pdGl2ZSA9IGZ1bmN0aW9uIChhcmcpIHtcclxuICB2YXIgdHlwZSA9IHR5cGVvZiBhcmc7XHJcbiAgcmV0dXJuIGFyZyA9PSBudWxsIHx8ICh0eXBlICE9IFwib2JqZWN0XCIgJiYgdHlwZSAhPSBcImZ1bmN0aW9uXCIpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFVuaXF1ZUlER2VuZXJldG9yO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgRGltZW5zaW9uRCA9IHJlcXVpcmUoJy4vRGltZW5zaW9uRCcpO1xyXG52YXIgSGFzaE1hcCA9IHJlcXVpcmUoJy4vSGFzaE1hcCcpO1xyXG52YXIgSGFzaFNldCA9IHJlcXVpcmUoJy4vSGFzaFNldCcpO1xyXG52YXIgSUdlb21ldHJ5ID0gcmVxdWlyZSgnLi9JR2VvbWV0cnknKTtcclxudmFyIElNYXRoID0gcmVxdWlyZSgnLi9JTWF0aCcpO1xyXG52YXIgSW50ZWdlciA9IHJlcXVpcmUoJy4vSW50ZWdlcicpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL1BvaW50Jyk7XHJcbnZhciBQb2ludEQgPSByZXF1aXJlKCcuL1BvaW50RCcpO1xyXG52YXIgUmFuZG9tU2VlZCA9IHJlcXVpcmUoJy4vUmFuZG9tU2VlZCcpO1xyXG52YXIgUmVjdGFuZ2xlRCA9IHJlcXVpcmUoJy4vUmVjdGFuZ2xlRCcpO1xyXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9UcmFuc2Zvcm0nKTtcclxudmFyIFVuaXF1ZUlER2VuZXJldG9yID0gcmVxdWlyZSgnLi9VbmlxdWVJREdlbmVyZXRvcicpO1xyXG52YXIgTEdyYXBoT2JqZWN0ID0gcmVxdWlyZSgnLi9MR3JhcGhPYmplY3QnKTtcclxudmFyIExHcmFwaCA9IHJlcXVpcmUoJy4vTEdyYXBoJyk7XHJcbnZhciBMRWRnZSA9IHJlcXVpcmUoJy4vTEVkZ2UnKTtcclxudmFyIExHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0xHcmFwaE1hbmFnZXInKTtcclxudmFyIExOb2RlID0gcmVxdWlyZSgnLi9MTm9kZScpO1xyXG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9MYXlvdXQnKTtcclxudmFyIExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vTGF5b3V0Q29uc3RhbnRzJyk7XHJcbnZhciBGRExheW91dCA9IHJlcXVpcmUoJy4vRkRMYXlvdXQnKTtcclxudmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xyXG52YXIgRkRMYXlvdXRFZGdlID0gcmVxdWlyZSgnLi9GRExheW91dEVkZ2UnKTtcclxudmFyIEZETGF5b3V0Tm9kZSA9IHJlcXVpcmUoJy4vRkRMYXlvdXROb2RlJyk7XHJcbnZhciBDb1NFQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9Db1NFQ29uc3RhbnRzJyk7XHJcbnZhciBDb1NFRWRnZSA9IHJlcXVpcmUoJy4vQ29TRUVkZ2UnKTtcclxudmFyIENvU0VHcmFwaCA9IHJlcXVpcmUoJy4vQ29TRUdyYXBoJyk7XHJcbnZhciBDb1NFR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9Db1NFR3JhcGhNYW5hZ2VyJyk7XHJcbnZhciBDb1NFTGF5b3V0ID0gcmVxdWlyZSgnLi9Db1NFTGF5b3V0Jyk7XHJcbnZhciBDb1NFTm9kZSA9IHJlcXVpcmUoJy4vQ29TRU5vZGUnKTtcclxuXHJcbnZhciBkZWZhdWx0cyA9IHtcclxuICAvLyBDYWxsZWQgb24gYGxheW91dHJlYWR5YFxyXG4gIHJlYWR5OiBmdW5jdGlvbiAoKSB7XHJcbiAgfSxcclxuICAvLyBDYWxsZWQgb24gYGxheW91dHN0b3BgXHJcbiAgc3RvcDogZnVuY3Rpb24gKCkge1xyXG4gIH0sXHJcbiAgLy8gaW5jbHVkZSBsYWJlbHMgaW4gbm9kZSBkaW1lbnNpb25zXHJcbiAgbm9kZURpbWVuc2lvbnNJbmNsdWRlTGFiZWxzOiBmYWxzZSxcclxuICAvLyBudW1iZXIgb2YgdGlja3MgcGVyIGZyYW1lOyBoaWdoZXIgaXMgZmFzdGVyIGJ1dCBtb3JlIGplcmt5XHJcbiAgcmVmcmVzaDogMzAsXHJcbiAgLy8gV2hldGhlciB0byBmaXQgdGhlIG5ldHdvcmsgdmlldyBhZnRlciB3aGVuIGRvbmVcclxuICBmaXQ6IHRydWUsXHJcbiAgLy8gUGFkZGluZyBvbiBmaXRcclxuICBwYWRkaW5nOiAxMCxcclxuICAvLyBXaGV0aGVyIHRvIGVuYWJsZSBpbmNyZW1lbnRhbCBtb2RlXHJcbiAgcmFuZG9taXplOiB0cnVlLFxyXG4gIC8vIE5vZGUgcmVwdWxzaW9uIChub24gb3ZlcmxhcHBpbmcpIG11bHRpcGxpZXJcclxuICBub2RlUmVwdWxzaW9uOiA0NTAwLFxyXG4gIC8vIElkZWFsIGVkZ2UgKG5vbiBuZXN0ZWQpIGxlbmd0aFxyXG4gIGlkZWFsRWRnZUxlbmd0aDogNTAsXHJcbiAgLy8gRGl2aXNvciB0byBjb21wdXRlIGVkZ2UgZm9yY2VzXHJcbiAgZWRnZUVsYXN0aWNpdHk6IDAuNDUsXHJcbiAgLy8gTmVzdGluZyBmYWN0b3IgKG11bHRpcGxpZXIpIHRvIGNvbXB1dGUgaWRlYWwgZWRnZSBsZW5ndGggZm9yIG5lc3RlZCBlZGdlc1xyXG4gIG5lc3RpbmdGYWN0b3I6IDAuMSxcclxuICAvLyBHcmF2aXR5IGZvcmNlIChjb25zdGFudClcclxuICBncmF2aXR5OiAwLjI1LFxyXG4gIC8vIE1heGltdW0gbnVtYmVyIG9mIGl0ZXJhdGlvbnMgdG8gcGVyZm9ybVxyXG4gIG51bUl0ZXI6IDI1MDAsXHJcbiAgLy8gRm9yIGVuYWJsaW5nIHRpbGluZ1xyXG4gIHRpbGU6IHRydWUsXHJcbiAgLy8gVHlwZSBvZiBsYXlvdXQgYW5pbWF0aW9uLiBUaGUgb3B0aW9uIHNldCBpcyB7J2R1cmluZycsICdlbmQnLCBmYWxzZX1cclxuICBhbmltYXRlOiAnZW5kJyxcclxuICAvLyBEdXJhdGlvbiBmb3IgYW5pbWF0ZTplbmRcclxuICBhbmltYXRpb25EdXJhdGlvbjogNTAwLFxyXG4gIC8vIFJlcHJlc2VudHMgdGhlIGFtb3VudCBvZiB0aGUgdmVydGljYWwgc3BhY2UgdG8gcHV0IGJldHdlZW4gdGhlIHplcm8gZGVncmVlIG1lbWJlcnMgZHVyaW5nIHRoZSB0aWxpbmcgb3BlcmF0aW9uKGNhbiBhbHNvIGJlIGEgZnVuY3Rpb24pXHJcbiAgdGlsaW5nUGFkZGluZ1ZlcnRpY2FsOiAxMCxcclxuICAvLyBSZXByZXNlbnRzIHRoZSBhbW91bnQgb2YgdGhlIGhvcml6b250YWwgc3BhY2UgdG8gcHV0IGJldHdlZW4gdGhlIHplcm8gZGVncmVlIG1lbWJlcnMgZHVyaW5nIHRoZSB0aWxpbmcgb3BlcmF0aW9uKGNhbiBhbHNvIGJlIGEgZnVuY3Rpb24pXHJcbiAgdGlsaW5nUGFkZGluZ0hvcml6b250YWw6IDEwLFxyXG4gIC8vIEdyYXZpdHkgcmFuZ2UgKGNvbnN0YW50KSBmb3IgY29tcG91bmRzXHJcbiAgZ3Jhdml0eVJhbmdlQ29tcG91bmQ6IDEuNSxcclxuICAvLyBHcmF2aXR5IGZvcmNlIChjb25zdGFudCkgZm9yIGNvbXBvdW5kc1xyXG4gIGdyYXZpdHlDb21wb3VuZDogMS4wLFxyXG4gIC8vIEdyYXZpdHkgcmFuZ2UgKGNvbnN0YW50KVxyXG4gIGdyYXZpdHlSYW5nZTogMy44LFxyXG4gIC8vIEluaXRpYWwgY29vbGluZyBmYWN0b3IgZm9yIGluY3JlbWVudGFsIGxheW91dFxyXG4gIGluaXRpYWxFbmVyZ3lPbkluY3JlbWVudGFsOiAwLjhcclxufTtcclxuXHJcbmZ1bmN0aW9uIGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykge1xyXG4gIHZhciBvYmogPSB7fTtcclxuXHJcbiAgZm9yICh2YXIgaSBpbiBkZWZhdWx0cykge1xyXG4gICAgb2JqW2ldID0gZGVmYXVsdHNbaV07XHJcbiAgfVxyXG5cclxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcclxuICAgIG9ialtpXSA9IG9wdGlvbnNbaV07XHJcbiAgfVxyXG5cclxuICByZXR1cm4gb2JqO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gX0NvU0VMYXlvdXQoX29wdGlvbnMpIHtcclxuICB0aGlzLm9wdGlvbnMgPSBleHRlbmQoZGVmYXVsdHMsIF9vcHRpb25zKTtcclxuICBnZXRVc2VyT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xyXG59XHJcblxyXG52YXIgZ2V0VXNlck9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xyXG4gIGlmIChvcHRpb25zLm5vZGVSZXB1bHNpb24gIT0gbnVsbClcclxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX1JFUFVMU0lPTl9TVFJFTkdUSCA9IG9wdGlvbnMubm9kZVJlcHVsc2lvbjtcclxuICBpZiAob3B0aW9ucy5pZGVhbEVkZ2VMZW5ndGggIT0gbnVsbClcclxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggPSBvcHRpb25zLmlkZWFsRWRnZUxlbmd0aDtcclxuICBpZiAob3B0aW9ucy5lZGdlRWxhc3RpY2l0eSAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX1NQUklOR19TVFJFTkdUSCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfU1BSSU5HX1NUUkVOR1RIID0gb3B0aW9ucy5lZGdlRWxhc3RpY2l0eTtcclxuICBpZiAob3B0aW9ucy5uZXN0aW5nRmFjdG9yICE9IG51bGwpXHJcbiAgICBDb1NFQ29uc3RhbnRzLlBFUl9MRVZFTF9JREVBTF9FREdFX0xFTkdUSF9GQUNUT1IgPSBGRExheW91dENvbnN0YW50cy5QRVJfTEVWRUxfSURFQUxfRURHRV9MRU5HVEhfRkFDVE9SID0gb3B0aW9ucy5uZXN0aW5nRmFjdG9yO1xyXG4gIGlmIChvcHRpb25zLmdyYXZpdHkgIT0gbnVsbClcclxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1NUUkVOR1RIID0gb3B0aW9ucy5ncmF2aXR5O1xyXG4gIGlmIChvcHRpb25zLm51bUl0ZXIgIT0gbnVsbClcclxuICAgIENvU0VDb25zdGFudHMuTUFYX0lURVJBVElPTlMgPSBGRExheW91dENvbnN0YW50cy5NQVhfSVRFUkFUSU9OUyA9IG9wdGlvbnMubnVtSXRlcjtcclxuICBpZiAob3B0aW9ucy5ncmF2aXR5UmFuZ2UgIT0gbnVsbClcclxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSBvcHRpb25zLmdyYXZpdHlSYW5nZTtcclxuICBpZihvcHRpb25zLmdyYXZpdHlDb21wb3VuZCAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEggPSBvcHRpb25zLmdyYXZpdHlDb21wb3VuZDtcclxuICBpZihvcHRpb25zLmdyYXZpdHlSYW5nZUNvbXBvdW5kICE9IG51bGwpXHJcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfUkFOR0VfRkFDVE9SID0gb3B0aW9ucy5ncmF2aXR5UmFuZ2VDb21wb3VuZDtcclxuICBpZiAob3B0aW9ucy5pbml0aWFsRW5lcmd5T25JbmNyZW1lbnRhbCAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPT0xJTkdfRkFDVE9SX0lOQ1JFTUVOVEFMID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT09MSU5HX0ZBQ1RPUl9JTkNSRU1FTlRBTCA9IG9wdGlvbnMuaW5pdGlhbEVuZXJneU9uSW5jcmVtZW50YWw7XHJcblxyXG4gIENvU0VDb25zdGFudHMuTk9ERV9ESU1FTlNJT05TX0lOQ0xVREVfTEFCRUxTID0gRkRMYXlvdXRDb25zdGFudHMuTk9ERV9ESU1FTlNJT05TX0lOQ0xVREVfTEFCRUxTID0gTGF5b3V0Q29uc3RhbnRzLk5PREVfRElNRU5TSU9OU19JTkNMVURFX0xBQkVMUyA9IG9wdGlvbnMubm9kZURpbWVuc2lvbnNJbmNsdWRlTGFiZWxzO1xyXG4gIENvU0VDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUwgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9XHJcbiAgICAgICAgICAhKG9wdGlvbnMucmFuZG9taXplKTtcclxuICBDb1NFQ29uc3RhbnRzLkFOSU1BVEUgPSBGRExheW91dENvbnN0YW50cy5BTklNQVRFID0gTGF5b3V0Q29uc3RhbnRzLkFOSU1BVEUgPSBvcHRpb25zLmFuaW1hdGU7XHJcbiAgQ29TRUNvbnN0YW50cy5USUxFID0gb3B0aW9ucy50aWxlO1xyXG4gIENvU0VDb25zdGFudHMuVElMSU5HX1BBRERJTkdfVkVSVElDQUwgPSBcclxuICAgICAgICAgIHR5cGVvZiBvcHRpb25zLnRpbGluZ1BhZGRpbmdWZXJ0aWNhbCA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMudGlsaW5nUGFkZGluZ1ZlcnRpY2FsLmNhbGwoKSA6IG9wdGlvbnMudGlsaW5nUGFkZGluZ1ZlcnRpY2FsO1xyXG4gIENvU0VDb25zdGFudHMuVElMSU5HX1BBRERJTkdfSE9SSVpPTlRBTCA9IFxyXG4gICAgICAgICAgdHlwZW9mIG9wdGlvbnMudGlsaW5nUGFkZGluZ0hvcml6b250YWwgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLnRpbGluZ1BhZGRpbmdIb3Jpem9udGFsLmNhbGwoKSA6IG9wdGlvbnMudGlsaW5nUGFkZGluZ0hvcml6b250YWw7XHJcbn07XHJcblxyXG5fQ29TRUxheW91dC5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciByZWFkeTtcclxuICB2YXIgZnJhbWVJZDtcclxuICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcclxuICB2YXIgaWRUb0xOb2RlID0gdGhpcy5pZFRvTE5vZGUgPSB7fTtcclxuICB2YXIgbGF5b3V0ID0gdGhpcy5sYXlvdXQgPSBuZXcgQ29TRUxheW91dCgpO1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBcclxuICB0aGlzLmN5ID0gdGhpcy5vcHRpb25zLmN5O1xyXG5cclxuICB0aGlzLmN5LnRyaWdnZXIoeyB0eXBlOiAnbGF5b3V0c3RhcnQnLCBsYXlvdXQ6IHRoaXMgfSk7XHJcblxyXG4gIHZhciBnbSA9IGxheW91dC5uZXdHcmFwaE1hbmFnZXIoKTtcclxuICB0aGlzLmdtID0gZ207XHJcblxyXG4gIHZhciBub2RlcyA9IHRoaXMub3B0aW9ucy5lbGVzLm5vZGVzKCk7XHJcbiAgdmFyIGVkZ2VzID0gdGhpcy5vcHRpb25zLmVsZXMuZWRnZXMoKTtcclxuXHJcbiAgdGhpcy5yb290ID0gZ20uYWRkUm9vdCgpO1xyXG4gIHRoaXMucHJvY2Vzc0NoaWxkcmVuTGlzdCh0aGlzLnJvb3QsIHRoaXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKSwgbGF5b3V0KTtcclxuXHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICB2YXIgc291cmNlTm9kZSA9IHRoaXMuaWRUb0xOb2RlW2VkZ2UuZGF0YShcInNvdXJjZVwiKV07XHJcbiAgICB2YXIgdGFyZ2V0Tm9kZSA9IHRoaXMuaWRUb0xOb2RlW2VkZ2UuZGF0YShcInRhcmdldFwiKV07XHJcbiAgICB2YXIgZTEgPSBnbS5hZGQobGF5b3V0Lm5ld0VkZ2UoKSwgc291cmNlTm9kZSwgdGFyZ2V0Tm9kZSk7XHJcbiAgICBlMS5pZCA9IGVkZ2UuaWQoKTtcclxuICB9XHJcbiAgXHJcbiAgIHZhciBnZXRQb3NpdGlvbnMgPSBmdW5jdGlvbihlbGUsIGkpe1xyXG4gICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICBlbGUgPSBpO1xyXG4gICAgfVxyXG4gICAgdmFyIHRoZUlkID0gZWxlLmRhdGEoJ2lkJyk7XHJcbiAgICB2YXIgbE5vZGUgPSBzZWxmLmlkVG9MTm9kZVt0aGVJZF07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogbE5vZGUuZ2V0UmVjdCgpLmdldENlbnRlclgoKSxcclxuICAgICAgeTogbE5vZGUuZ2V0UmVjdCgpLmdldENlbnRlclkoKVxyXG4gICAgfTtcclxuICB9O1xyXG4gIFxyXG4gIC8qXHJcbiAgICogUmVwb3NpdGlvbiBub2RlcyBpbiBpdGVyYXRpb25zIGFuaW1hdGVkbHlcclxuICAgKi9cclxuICB2YXIgaXRlcmF0ZUFuaW1hdGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gVGhpZ3MgdG8gcGVyZm9ybSBhZnRlciBub2RlcyBhcmUgcmVwb3NpdGlvbmVkIG9uIHNjcmVlblxyXG4gICAgdmFyIGFmdGVyUmVwb3NpdGlvbiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBpZiAob3B0aW9ucy5maXQpIHtcclxuICAgICAgICBvcHRpb25zLmN5LmZpdChvcHRpb25zLmVsZXMubm9kZXMoKSwgb3B0aW9ucy5wYWRkaW5nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFyZWFkeSkge1xyXG4gICAgICAgIHJlYWR5ID0gdHJ1ZTtcclxuICAgICAgICBzZWxmLmN5Lm9uZSgnbGF5b3V0cmVhZHknLCBvcHRpb25zLnJlYWR5KTtcclxuICAgICAgICBzZWxmLmN5LnRyaWdnZXIoe3R5cGU6ICdsYXlvdXRyZWFkeScsIGxheW91dDogc2VsZn0pO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB2YXIgdGlja3NQZXJGcmFtZSA9IHNlbGYub3B0aW9ucy5yZWZyZXNoO1xyXG4gICAgdmFyIGlzRG9uZTtcclxuXHJcbiAgICBmb3IoIHZhciBpID0gMDsgaSA8IHRpY2tzUGVyRnJhbWUgJiYgIWlzRG9uZTsgaSsrICl7XHJcbiAgICAgIGlzRG9uZSA9IHNlbGYubGF5b3V0LnRpY2soKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gSWYgbGF5b3V0IGlzIGRvbmVcclxuICAgIGlmIChpc0RvbmUpIHtcclxuICAgICAgLy8gSWYgdGhlIGxheW91dCBpcyBub3QgYSBzdWJsYXlvdXQgYW5kIGl0IGlzIHN1Y2Nlc3NmdWwgcGVyZm9ybSBwb3N0IGxheW91dC5cclxuICAgICAgaWYgKGxheW91dC5jaGVja0xheW91dFN1Y2Nlc3MoKSAmJiAhbGF5b3V0LmlzU3ViTGF5b3V0KSB7XHJcbiAgICAgICAgbGF5b3V0LmRvUG9zdExheW91dCgpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBJZiBsYXlvdXQgaGFzIGEgdGlsaW5nUG9zdExheW91dCBmdW5jdGlvbiBwcm9wZXJ0eSBjYWxsIGl0LlxyXG4gICAgICBpZiAobGF5b3V0LnRpbGluZ1Bvc3RMYXlvdXQpIHtcclxuICAgICAgICBsYXlvdXQudGlsaW5nUG9zdExheW91dCgpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBsYXlvdXQuaXNMYXlvdXRGaW5pc2hlZCA9IHRydWU7XHJcbiAgICAgIFxyXG4gICAgICBzZWxmLm9wdGlvbnMuZWxlcy5ub2RlcygpLnBvc2l0aW9ucyhnZXRQb3NpdGlvbnMpO1xyXG4gICAgICBcclxuICAgICAgYWZ0ZXJSZXBvc2l0aW9uKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyB0cmlnZ2VyIGxheW91dHN0b3Agd2hlbiB0aGUgbGF5b3V0IHN0b3BzIChlLmcuIGZpbmlzaGVzKVxyXG4gICAgICBzZWxmLmN5Lm9uZSgnbGF5b3V0c3RvcCcsIHNlbGYub3B0aW9ucy5zdG9wKTtcclxuICAgICAgc2VsZi5jeS50cmlnZ2VyKHsgdHlwZTogJ2xheW91dHN0b3AnLCBsYXlvdXQ6IHNlbGYgfSk7XHJcblxyXG4gICAgICBpZiAoZnJhbWVJZCkge1xyXG4gICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGZyYW1lSWQpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZWFkeSA9IGZhbHNlO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBhbmltYXRpb25EYXRhID0gc2VsZi5sYXlvdXQuZ2V0UG9zaXRpb25zRGF0YSgpOyAvLyBHZXQgcG9zaXRpb25zIG9mIGxheW91dCBub2RlcyBub3RlIHRoYXQgYWxsIG5vZGVzIG1heSBub3QgYmUgbGF5b3V0IG5vZGVzIGJlY2F1c2Ugb2YgdGlsaW5nXHJcbiAgICBcclxuICAgIC8vIFBvc2l0aW9uIG5vZGVzLCBmb3IgdGhlIG5vZGVzIHdob3NlIGlkIGRvZXMgbm90IGluY2x1ZGVkIGluIGRhdGEgKGJlY2F1c2UgdGhleSBhcmUgcmVtb3ZlZCBmcm9tIHRoZWlyIHBhcmVudHMgYW5kIGluY2x1ZGVkIGluIGR1bW15IGNvbXBvdW5kcylcclxuICAgIC8vIHVzZSBwb3NpdGlvbiBvZiB0aGVpciBhbmNlc3RvcnMgb3IgZHVtbXkgYW5jZXN0b3JzXHJcbiAgICBvcHRpb25zLmVsZXMubm9kZXMoKS5wb3NpdGlvbnMoZnVuY3Rpb24gKGVsZSwgaSkge1xyXG4gICAgICBpZiAodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgIGVsZSA9IGk7XHJcbiAgICAgIH1cclxuICAgICAgdmFyIHRoZUlkID0gZWxlLmlkKCk7XHJcbiAgICAgIHZhciBwTm9kZSA9IGFuaW1hdGlvbkRhdGFbdGhlSWRdO1xyXG4gICAgICB2YXIgdGVtcCA9IGVsZTtcclxuICAgICAgLy8gSWYgcE5vZGUgaXMgdW5kZWZpbmVkIHNlYXJjaCB1bnRpbCBmaW5kaW5nIHBvc2l0aW9uIGRhdGEgb2YgaXRzIGZpcnN0IGFuY2VzdG9yIChJdCBtYXkgYmUgZHVtbXkgYXMgd2VsbClcclxuICAgICAgd2hpbGUgKHBOb2RlID09IG51bGwpIHtcclxuICAgICAgICBwTm9kZSA9IGFuaW1hdGlvbkRhdGFbdGVtcC5kYXRhKCdwYXJlbnQnKV0gfHwgYW5pbWF0aW9uRGF0YVsnRHVtbXlDb21wb3VuZF8nICsgdGVtcC5kYXRhKCdwYXJlbnQnKV07XHJcbiAgICAgICAgYW5pbWF0aW9uRGF0YVt0aGVJZF0gPSBwTm9kZTtcclxuICAgICAgICB0ZW1wID0gdGVtcC5wYXJlbnQoKVswXTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHBOb2RlLngsXHJcbiAgICAgICAgeTogcE5vZGUueVxyXG4gICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgYWZ0ZXJSZXBvc2l0aW9uKCk7XHJcblxyXG4gICAgZnJhbWVJZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShpdGVyYXRlQW5pbWF0ZWQpO1xyXG4gIH07XHJcbiAgXHJcbiAgLypcclxuICAqIExpc3RlbiAnbGF5b3V0c3RhcnRlZCcgZXZlbnQgYW5kIHN0YXJ0IGFuaW1hdGVkIGl0ZXJhdGlvbiBpZiBhbmltYXRlIG9wdGlvbiBpcyAnZHVyaW5nJ1xyXG4gICovXHJcbiAgbGF5b3V0LmFkZExpc3RlbmVyKCdsYXlvdXRzdGFydGVkJywgZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHNlbGYub3B0aW9ucy5hbmltYXRlID09PSAnZHVyaW5nJykge1xyXG4gICAgICBmcmFtZUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGl0ZXJhdGVBbmltYXRlZCk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgXHJcbiAgbGF5b3V0LnJ1bkxheW91dCgpOyAvLyBSdW4gY29zZSBsYXlvdXRcclxuICBcclxuICAvKlxyXG4gICAqIElmIGFuaW1hdGUgb3B0aW9uIGlzIG5vdCAnZHVyaW5nJyAoJ2VuZCcgb3IgZmFsc2UpIHBlcmZvcm0gdGhlc2UgaGVyZSAoSWYgaXQgaXMgJ2R1cmluZycgc2ltaWxhciB0aGluZ3MgYXJlIGFscmVhZHkgcGVyZm9ybWVkKVxyXG4gICAqL1xyXG4gIGlmKHRoaXMub3B0aW9ucy5hbmltYXRlID09ICdlbmQnKXtcclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7ICBcclxuICAgICAgc2VsZi5vcHRpb25zLmVsZXMubm9kZXMoKS5ub3QoXCI6cGFyZW50XCIpLmxheW91dFBvc2l0aW9ucyhzZWxmLCBzZWxmLm9wdGlvbnMsIGdldFBvc2l0aW9ucyk7IC8vIFVzZSBsYXlvdXQgcG9zaXRpb25zIHRvIHJlcG9zaXRpb24gdGhlIG5vZGVzIGl0IGNvbnNpZGVycyB0aGUgb3B0aW9ucyBwYXJhbWV0ZXJcclxuICAgICAgcmVhZHkgPSBmYWxzZTtcclxuICAgIH0sIDApO1xyXG4gIH1cclxuICBlbHNlIGlmKHRoaXMub3B0aW9ucy5hbmltYXRlID09IGZhbHNlKXtcclxuICAgIHNlbGYub3B0aW9ucy5lbGVzLm5vZGVzKCkubm90KFwiOnBhcmVudFwiKS5sYXlvdXRQb3NpdGlvbnMoc2VsZiwgc2VsZi5vcHRpb25zLCBnZXRQb3NpdGlvbnMpOyAvLyBVc2UgbGF5b3V0IHBvc2l0aW9ucyB0byByZXBvc2l0aW9uIHRoZSBub2RlcyBpdCBjb25zaWRlcnMgdGhlIG9wdGlvbnMgcGFyYW1ldGVyXHJcbiAgICByZWFkeSA9IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXM7IC8vIGNoYWluaW5nXHJcbn07XHJcblxyXG4vL0dldCB0aGUgdG9wIG1vc3Qgb25lcyBvZiBhIGxpc3Qgb2Ygbm9kZXNcclxuX0NvU0VMYXlvdXQucHJvdG90eXBlLmdldFRvcE1vc3ROb2RlcyA9IGZ1bmN0aW9uKG5vZGVzKSB7XHJcbiAgdmFyIG5vZGVzTWFwID0ge307XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBub2Rlc01hcFtub2Rlc1tpXS5pZCgpXSA9IHRydWU7XHJcbiAgfVxyXG4gIHZhciByb290cyA9IG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XHJcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICBlbGUgPSBpO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBwYXJlbnQgPSBlbGUucGFyZW50KClbMF07XHJcbiAgICAgIHdoaWxlKHBhcmVudCAhPSBudWxsKXtcclxuICAgICAgICBpZihub2Rlc01hcFtwYXJlbnQuaWQoKV0pe1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50KClbMF07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiByb290cztcclxufTtcclxuXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5wcm9jZXNzQ2hpbGRyZW5MaXN0ID0gZnVuY3Rpb24gKHBhcmVudCwgY2hpbGRyZW4sIGxheW91dCkge1xyXG4gIHZhciBzaXplID0gY2hpbGRyZW4ubGVuZ3RoO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XHJcbiAgICB2YXIgdGhlQ2hpbGQgPSBjaGlsZHJlbltpXTtcclxuICAgIHRoaXMub3B0aW9ucy5lbGVzLm5vZGVzKCkubGVuZ3RoO1xyXG4gICAgdmFyIGNoaWxkcmVuX29mX2NoaWxkcmVuID0gdGhlQ2hpbGQuY2hpbGRyZW4oKTtcclxuICAgIHZhciB0aGVOb2RlOyAgICBcclxuXHJcbiAgICB2YXIgZGltZW5zaW9ucyA9IHRoZUNoaWxkLmxheW91dERpbWVuc2lvbnMoe1xyXG4gICAgICBub2RlRGltZW5zaW9uc0luY2x1ZGVMYWJlbHM6IHRoaXMub3B0aW9ucy5ub2RlRGltZW5zaW9uc0luY2x1ZGVMYWJlbHNcclxuICAgIH0pO1xyXG5cclxuICAgIGlmICh0aGVDaGlsZC5vdXRlcldpZHRoKCkgIT0gbnVsbFxyXG4gICAgICAgICAgICAmJiB0aGVDaGlsZC5vdXRlckhlaWdodCgpICE9IG51bGwpIHtcclxuICAgICAgdGhlTm9kZSA9IHBhcmVudC5hZGQobmV3IENvU0VOb2RlKGxheW91dC5ncmFwaE1hbmFnZXIsXHJcbiAgICAgICAgICAgICAgbmV3IFBvaW50RCh0aGVDaGlsZC5wb3NpdGlvbigneCcpIC0gZGltZW5zaW9ucy53IC8gMiwgdGhlQ2hpbGQucG9zaXRpb24oJ3knKSAtIGRpbWVuc2lvbnMuaCAvIDIpLFxyXG4gICAgICAgICAgICAgIG5ldyBEaW1lbnNpb25EKHBhcnNlRmxvYXQoZGltZW5zaW9ucy53KSwgcGFyc2VGbG9hdChkaW1lbnNpb25zLmgpKSkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoZU5vZGUgPSBwYXJlbnQuYWRkKG5ldyBDb1NFTm9kZSh0aGlzLmdyYXBoTWFuYWdlcikpO1xyXG4gICAgfVxyXG4gICAgLy8gQXR0YWNoIGlkIHRvIHRoZSBsYXlvdXQgbm9kZVxyXG4gICAgdGhlTm9kZS5pZCA9IHRoZUNoaWxkLmRhdGEoXCJpZFwiKTtcclxuICAgIC8vIEF0dGFjaCB0aGUgcGFkZGluZ3Mgb2YgY3kgbm9kZSB0byBsYXlvdXQgbm9kZVxyXG4gICAgdGhlTm9kZS5wYWRkaW5nTGVmdCA9IHBhcnNlSW50KCB0aGVDaGlsZC5jc3MoJ3BhZGRpbmcnKSApO1xyXG4gICAgdGhlTm9kZS5wYWRkaW5nVG9wID0gcGFyc2VJbnQoIHRoZUNoaWxkLmNzcygncGFkZGluZycpICk7XHJcbiAgICB0aGVOb2RlLnBhZGRpbmdSaWdodCA9IHBhcnNlSW50KCB0aGVDaGlsZC5jc3MoJ3BhZGRpbmcnKSApO1xyXG4gICAgdGhlTm9kZS5wYWRkaW5nQm90dG9tID0gcGFyc2VJbnQoIHRoZUNoaWxkLmNzcygncGFkZGluZycpICk7XHJcbiAgICBcclxuICAgIC8vQXR0YWNoIHRoZSBsYWJlbCBwcm9wZXJ0aWVzIHRvIGNvbXBvdW5kIGlmIGxhYmVscyB3aWxsIGJlIGluY2x1ZGVkIGluIG5vZGUgZGltZW5zaW9ucyAgXHJcbiAgICBpZih0aGlzLm9wdGlvbnMubm9kZURpbWVuc2lvbnNJbmNsdWRlTGFiZWxzKXtcclxuICAgICAgaWYodGhlQ2hpbGQuaXNQYXJlbnQoKSl7XHJcbiAgICAgICAgICB2YXIgbGFiZWxXaWR0aCA9IHRoZUNoaWxkLmJvdW5kaW5nQm94KHsgaW5jbHVkZUxhYmVsczogdHJ1ZSwgaW5jbHVkZU5vZGVzOiBmYWxzZSB9KS53OyAgICAgICAgICBcclxuICAgICAgICAgIHZhciBsYWJlbEhlaWdodCA9IHRoZUNoaWxkLmJvdW5kaW5nQm94KHsgaW5jbHVkZUxhYmVsczogdHJ1ZSwgaW5jbHVkZU5vZGVzOiBmYWxzZSB9KS5oO1xyXG4gICAgICAgICAgdmFyIGxhYmVsUG9zID0gdGhlQ2hpbGQuY3NzKFwidGV4dC1oYWxpZ25cIik7XHJcbiAgICAgICAgICB0aGVOb2RlLmxhYmVsV2lkdGggPSBsYWJlbFdpZHRoO1xyXG4gICAgICAgICAgdGhlTm9kZS5sYWJlbEhlaWdodCA9IGxhYmVsSGVpZ2h0O1xyXG4gICAgICAgICAgdGhlTm9kZS5sYWJlbFBvcyA9IGxhYmVsUG9zO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIE1hcCB0aGUgbGF5b3V0IG5vZGVcclxuICAgIHRoaXMuaWRUb0xOb2RlW3RoZUNoaWxkLmRhdGEoXCJpZFwiKV0gPSB0aGVOb2RlO1xyXG5cclxuICAgIGlmIChpc05hTih0aGVOb2RlLnJlY3QueCkpIHtcclxuICAgICAgdGhlTm9kZS5yZWN0LnggPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChpc05hTih0aGVOb2RlLnJlY3QueSkpIHtcclxuICAgICAgdGhlTm9kZS5yZWN0LnkgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjaGlsZHJlbl9vZl9jaGlsZHJlbiAhPSBudWxsICYmIGNoaWxkcmVuX29mX2NoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgdmFyIHRoZU5ld0dyYXBoO1xyXG4gICAgICB0aGVOZXdHcmFwaCA9IGxheW91dC5nZXRHcmFwaE1hbmFnZXIoKS5hZGQobGF5b3V0Lm5ld0dyYXBoKCksIHRoZU5vZGUpO1xyXG4gICAgICB0aGlzLnByb2Nlc3NDaGlsZHJlbkxpc3QodGhlTmV3R3JhcGgsIGNoaWxkcmVuX29mX2NoaWxkcmVuLCBsYXlvdXQpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBAYnJpZWYgOiBjYWxsZWQgb24gY29udGludW91cyBsYXlvdXRzIHRvIHN0b3AgdGhlbSBiZWZvcmUgdGhleSBmaW5pc2hcclxuICovXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKCkge1xyXG4gIHRoaXMuc3RvcHBlZCA9IHRydWU7XHJcbiAgXHJcbiAgdGhpcy50cmlnZ2VyKCdsYXlvdXRzdG9wJyk7XHJcblxyXG4gIHJldHVybiB0aGlzOyAvLyBjaGFpbmluZ1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZXQoY3l0b3NjYXBlKSB7XHJcbiAgcmV0dXJuIF9Db1NFTGF5b3V0O1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4vLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXHJcbnZhciBnZXRMYXlvdXQgPSByZXF1aXJlKCcuL0xheW91dCcpO1xyXG5cclxudmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24oIGN5dG9zY2FwZSApe1xyXG4gIHZhciBMYXlvdXQgPSBnZXRMYXlvdXQoIGN5dG9zY2FwZSApO1xyXG5cclxuICBjeXRvc2NhcGUoJ2xheW91dCcsICdjb3NlLWJpbGtlbnQnLCBMYXlvdXQpO1xyXG59O1xyXG5cclxuLy8gYXV0byByZWcgZm9yIGdsb2JhbHNcclxuaWYoIHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnICl7XHJcbiAgcmVnaXN0ZXIoIGN5dG9zY2FwZSApO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xyXG4iXX0=
