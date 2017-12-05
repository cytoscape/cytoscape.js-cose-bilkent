var Layout = require('./Layout');
var FDLayoutConstants = require('./FDLayoutConstants');
var LayoutConstants = require('./LayoutConstants');
var IGeometry = require('./IGeometry');
var IMath = require('./IMath');
var Integer = require('./Integer');

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

  this.useFRGridVariant = FDLayoutConstants.DEFAULT_USE_SMART_REPULSION_RANGE_CALCULATION;
  
  this.grid = [];
  // variables for tree reduction support
  this.prunedNodesAll = [];
  this.growTreeIterations = 0;
  this.afterGrowthIterations = 0;
  this.isTreeGrowing = false;
  this.isGrowthFinished = false;
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
  var processedNodeSet;

  if (this.useFRGridVariant)
  {       
    if ((this.totalIterations % FDLayoutConstants.GRID_CALCULATION_CHECK_PERIOD == 1 && !this.isTreeGrowing && !this.isGrowthFinished))
    {       
      this.updateGrid();  
    }

    processedNodeSet = new Set();
    
    // calculate repulsion forces between each nodes and its surrounding
    for (i = 0; i < lNodes.length; i++)
    {
      nodeA = lNodes[i];
      this.calculateRepulsionForceOfANode(nodeA, processedNodeSet);
      processedNodeSet.add(nodeA);
    }
  }
  else
  {
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

    repulsionForceX = 2 * overlapAmount[0];
    repulsionForceY = 2 * overlapAmount[1];
    
    var childrenConstant = nodeA.noOfChildren * nodeB.noOfChildren / (nodeA.noOfChildren + nodeB.noOfChildren);
    
    // Apply forces on the two nodes
    nodeA.repulsionForceX -= childrenConstant * repulsionForceX;
    nodeA.repulsionForceY -= childrenConstant * repulsionForceY;
    nodeB.repulsionForceX += childrenConstant * repulsionForceX;
    nodeB.repulsionForceY += childrenConstant * repulsionForceY;
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

  if (node.getOwner() == this.graphManager.getRoot())// in the root graph
  {
    estimatedSize = ownerGraph.getEstimatedSize() * this.gravityRangeFactor;

    if (absDistanceX > estimatedSize || absDistanceY > estimatedSize)
    {
      node.gravitationForceX = -this.gravityConstant * distanceX;
      node.gravitationForceY = -this.gravityConstant * distanceY;
    }
  }
  else// inside a compound
  {
    estimatedSize = ownerGraph.getEstimatedSize() * this.compoundGravityRangeFactor;

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

// -----------------------------------------------------------------------------
// Section: FR-Grid Variant Repulsion Force Calculation
// -----------------------------------------------------------------------------

FDLayout.prototype.calcGrid = function (graph){

  var sizeX = 0; 
  var sizeY = 0;
  
  sizeX = parseInt(Math.ceil((graph.getRight() - graph.getLeft()) / this.repulsionRange));
  sizeY = parseInt(Math.ceil((graph.getBottom() - graph.getTop()) / this.repulsionRange));
  
  var grid = new Array(sizeX);
  
  for(var i = 0; i < sizeX; i++){
    grid[i] = new Array(sizeY);    
  }
  
  for(var i = 0; i < sizeX; i++){
    for(var j = 0; j < sizeY; j++){
      grid[i][j] = new Array();    
    }
  }
  
  return grid;
};

FDLayout.prototype.addNodeToGrid = function (v, left, top){
    
  var startX = 0;
  var finishX = 0;
  var startY = 0;
  var finishY = 0;
  
  startX = parseInt(Math.floor((v.getRect().x - left) / this.repulsionRange));
  finishX = parseInt(Math.floor((v.getRect().width + v.getRect().x - left) / this.repulsionRange));
  startY = parseInt(Math.floor((v.getRect().y - top) / this.repulsionRange));
  finishY = parseInt(Math.floor((v.getRect().height + v.getRect().y - top) / this.repulsionRange));

  for (var i = startX; i <= finishX; i++)
  {
    for (var j = startY; j <= finishY; j++)
    {
      this.grid[i][j].push(v);
      v.setGridCoordinates(startX, finishX, startY, finishY); 
    }
  }  

};

FDLayout.prototype.updateGrid = function() {
  var i;
  var nodeA;
  var lNodes = this.getAllNodes();
  
  this.grid = this.calcGrid(this.graphManager.getRoot());   

  // put all nodes to proper grid cells
  for (i = 0; i < lNodes.length; i++)
  {
    nodeA = lNodes[i];
    this.addNodeToGrid(nodeA, this.graphManager.getRoot().getLeft(), this.graphManager.getRoot().getTop());
  } 

};

FDLayout.prototype.calculateRepulsionForceOfANode = function (nodeA, processedNodeSet){
  
  if ((this.totalIterations % FDLayoutConstants.GRID_CALCULATION_CHECK_PERIOD == 1 && !this.isTreeGrowing && !this.isGrowthFinished) || (this.growTreeIterations % 10 == 1 && this.isTreeGrowing) || (this.afterGrowthIterations % 10 == 1 && this.isGrowthFinished))
  {
    var surrounding = new Set();
    nodeA.surrounding = new Array();
    var nodeB;
    var grid = this.grid;
    
    for (var i = (nodeA.startX - 1); i < (nodeA.finishX + 2); i++)
    {
      for (var j = (nodeA.startY - 1); j < (nodeA.finishY + 2); j++)
      {
        if (!((i < 0) || (j < 0) || (i >= grid.length) || (j >= grid[0].length)))
        {  
          for (var k = 0; k < grid[i][j].length; k++) {
            nodeB = grid[i][j][k];

            // If both nodes are not members of the same graph, 
            // or both nodes are the same, skip.
            if ((nodeA.getOwner() != nodeB.getOwner()) || (nodeA == nodeB))
            {
              continue;
            }
            
            // check if the repulsion force between
            // nodeA and nodeB has already been calculated
            if (!processedNodeSet.has(nodeB) && !surrounding.has(nodeB))
            {
              var distanceX = Math.abs(nodeA.getCenterX()-nodeB.getCenterX()) - 
                    ((nodeA.getWidth()/2) + (nodeB.getWidth()/2));
              var distanceY = Math.abs(nodeA.getCenterY()-nodeB.getCenterY()) - 
                    ((nodeA.getHeight()/2) + (nodeB.getHeight()/2));
            
              // if the distance between nodeA and nodeB 
              // is less then calculation range
              if ((distanceX <= this.repulsionRange) && (distanceY <= this.repulsionRange))
              {
                //then add nodeB to surrounding of nodeA
                surrounding.add(nodeB);
              }              
            }    
          }
        }          
      }
    }

    nodeA.surrounding = [...surrounding];
	
  }
  for (i = 0; i < nodeA.surrounding.length; i++)
  {
    this.calcRepulsionForce(nodeA, nodeA.surrounding[i]);
  }	
};

FDLayout.prototype.calcRepulsionRange = function () {
  return 0.0;
};

// -----------------------------------------------------------------------------
// Section: Tree Reduction methods
// -----------------------------------------------------------------------------
// Reduce trees 
FDLayout.prototype.reduceTrees = function ()
{
  var prunedNodesAll = [];
  var containsLeaf = true;
  var node;
  
  while(containsLeaf) {
    var allNodes = this.graphManager.getAllNodes();
    var prunedNodesInStepTemp = [];
    containsLeaf = false;
    
    for (var i = 0; i < allNodes.length; i++) {
      node = allNodes[i];
      if(node.getEdges().length == 1 && !node.getEdges()[0].isInterGraph && node.getChild() == null){
        prunedNodesInStepTemp.push([node, node.getEdges()[0], node.getOwner()]);
        containsLeaf = true;
      }  
    }
    if(containsLeaf == true){
      var prunedNodesInStep = [];
      for(var j = 0; j < prunedNodesInStepTemp.length; j++){
        if(prunedNodesInStepTemp[j][0].getEdges().length == 1){
          prunedNodesInStep.push(prunedNodesInStepTemp[j]);  
          prunedNodesInStepTemp[j][0].getOwner().remove(prunedNodesInStepTemp[j][0]);
        }
      }
      prunedNodesAll.push(prunedNodesInStep);
      this.graphManager.resetAllNodes();
      this.graphManager.resetAllEdges();
    }
  }
  this.prunedNodesAll = prunedNodesAll;
};

// Grow tree one step 
FDLayout.prototype.growTree = function(prunedNodesAll)
{
  var lengthOfPrunedNodesInStep = prunedNodesAll.length; 
  var prunedNodesInStep = prunedNodesAll[lengthOfPrunedNodesInStep - 1];  

  var nodeData;  
  for(var i = 0; i < prunedNodesInStep.length; i++){
    nodeData = prunedNodesInStep[i];

    this.findPlaceforPrunedNode(nodeData);
    
    nodeData[2].add(nodeData[0]);
    nodeData[2].add(nodeData[1], nodeData[1].source, nodeData[1].target);
  }

  prunedNodesAll.splice(prunedNodesAll.length-1, 1);
  this.graphManager.resetAllNodes();
  this.graphManager.resetAllEdges();
};

// Find an appropriate position to replace pruned node, this method can be improved
FDLayout.prototype.findPlaceforPrunedNode = function(nodeData){
  
  var gridForPrunedNode;  
  var nodeToConnect;
  var prunedNode = nodeData[0];
  if(prunedNode == nodeData[1].source){
    nodeToConnect = nodeData[1].target;
  }
  else {
    nodeToConnect = nodeData[1].source;  
  }
  var startGridX = nodeToConnect.startX;
  var finishGridX = nodeToConnect.finishX;
  var startGridY = nodeToConnect.startY;
  var finishGridY = nodeToConnect.finishY; 
  
  var upNodeCount = 0;
  var downNodeCount = 0;
  var rightNodeCount = 0;
  var leftNodeCount = 0;
  var controlRegions = [upNodeCount, rightNodeCount, downNodeCount, leftNodeCount]
  
  if(startGridY > 0){
    for(var i = startGridX; i <= finishGridX; i++ ){
      controlRegions[0] += (this.grid[i][startGridY - 1].length + this.grid[i][startGridY].length - 1);   
    }
  }
  if(finishGridX < this.grid.length - 1){
    for(var i = startGridY; i <= finishGridY; i++ ){
      controlRegions[1] += (this.grid[finishGridX + 1][i].length + this.grid[finishGridX][i].length - 1);   
    }
  }
  if(finishGridY < this.grid[0].length - 1){
    for(var i = startGridX; i <= finishGridX; i++ ){
      controlRegions[2] += (this.grid[i][finishGridY + 1].length + this.grid[i][finishGridY].length - 1);   
    }
  }
  if(startGridX > 0){
    for(var i = startGridY; i <= finishGridY; i++ ){
      controlRegions[3] += (this.grid[startGridX - 1][i].length + this.grid[startGridX][i].length - 1);   
    }
  }
  var min = Integer.MAX_VALUE;
  var minCount;
  var minIndex;
  for(var j = 0; j < controlRegions.length; j++){
    if(controlRegions[j] < min){
      min = controlRegions[j];
      minCount = 1;
      minIndex = j;
    }  
    else if(controlRegions[j] == min){
      minCount++;  
    }
  }
  
  if(minCount == 3 && min == 0){
    if(controlRegions[0] == 0 && controlRegions[1] == 0 && controlRegions[2] == 0){
      gridForPrunedNode = 1;    
    }
    else if(controlRegions[0] == 0 && controlRegions[1] == 0 && controlRegions[3] == 0){
      gridForPrunedNode = 0;  
    }
    else if(controlRegions[0] == 0 && controlRegions[2] == 0 && controlRegions[3] == 0){
      gridForPrunedNode = 3;  
    }
    else if(controlRegions[1] == 0 && controlRegions[2] == 0 && controlRegions[3] == 0){
      gridForPrunedNode = 2;  
    }
  }
  else if(minCount == 2 && min == 0){
    var random = Math.floor(Math.random() * 2);
    if(controlRegions[0] == 0 && controlRegions[1] == 0){;
      if(random == 0){
        gridForPrunedNode = 0;
      }
      else{
        gridForPrunedNode = 1;
      }
    }
    else if(controlRegions[0] == 0 && controlRegions[2] == 0){
      if(random == 0){
        gridForPrunedNode = 0;
      }
      else{
        gridForPrunedNode = 2;
      }
    }
    else if(controlRegions[0] == 0 && controlRegions[3] == 0){
      if(random == 0){
        gridForPrunedNode = 0;
      }
      else{
        gridForPrunedNode = 3;
      }
    }
    else if(controlRegions[1] == 0 && controlRegions[2] == 0){
      if(random == 0){
        gridForPrunedNode = 1;
      }
      else{
        gridForPrunedNode = 2;
      }
    }
    else if(controlRegions[1] == 0 && controlRegions[3] == 0){
      if(random == 0){
        gridForPrunedNode = 1;
      }
      else{
        gridForPrunedNode = 3;
      }
    }
    else {
      if(random == 0){
        gridForPrunedNode = 2;
      }
      else{
        gridForPrunedNode = 3;
      }
    }
  }
  else if(minCount == 4 && min == 0){
    var random = Math.floor(Math.random() * 4);
    gridForPrunedNode = random;  
  }
  else {
    gridForPrunedNode = minIndex;
  }
  
  if(gridForPrunedNode == 0) {
    prunedNode.setCenter(nodeToConnect.getCenterX(),
                         nodeToConnect.getCenterY() - nodeToConnect.getHeight()/2 - FDLayoutConstants.DEFAULT_EDGE_LENGTH - prunedNode.getHeight()/2);  
  }
  else if(gridForPrunedNode == 1) {
    prunedNode.setCenter(nodeToConnect.getCenterX() + nodeToConnect.getWidth()/2 + FDLayoutConstants.DEFAULT_EDGE_LENGTH + prunedNode.getWidth()/2,
                         nodeToConnect.getCenterY());  
  }
  else if(gridForPrunedNode == 2) {
    prunedNode.setCenter(nodeToConnect.getCenterX(),
                         nodeToConnect.getCenterY() + nodeToConnect.getHeight()/2 + FDLayoutConstants.DEFAULT_EDGE_LENGTH + prunedNode.getHeight()/2);  
  }
  else { 
    prunedNode.setCenter(nodeToConnect.getCenterX() - nodeToConnect.getWidth()/2 - FDLayoutConstants.DEFAULT_EDGE_LENGTH - prunedNode.getWidth()/2,
                         nodeToConnect.getCenterY());  
  }
  
};

module.exports = FDLayout;
