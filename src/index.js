'use strict';

var LayoutConstants = require('cose-base').layoutBase.LayoutConstants;
var FDLayoutConstants = require('cose-base').layoutBase.FDLayoutConstants;
var CoSEConstants = require('cose-base').CoSEConstants;
var CoSELayout = require('cose-base').CoSELayout;
var CoSENode = require('cose-base').CoSENode;
var PointD = require('cose-base').layoutBase.PointD;
var DimensionD = require('cose-base').layoutBase.DimensionD;

var defaults = {
  // Called on `layoutready`
  ready: function () {
  },
  // Called on `layoutstop`
  stop: function () {
  },
  // 'draft', 'default' or 'proof" 
  // - 'draft' fast cooling rate 
  // - 'default' moderate cooling rate 
  // - "proof" slow cooling rate
  quality: 'default',
  // Include labels in node dimensions
  nodeDimensionsIncludeLabels: false,
  // Whether or not simple nodes (non-compound nodes) are of uniform dimensions
  uniformNodeDimensions: false,
  // Number of ticks per frame; higher is faster but more jerky
  refresh: 30,
  // Whether to fit the network view after when done
  fit: true,
  // Padding on fit
  padding: 10,
  // Whether to enable incremental mode
  randomize: true,
  // Node repulsion (non overlapping) multiplier
  nodeRepulsion: function ( node ){ return 4500; },
  // Ideal edge (non nested) length
  idealEdgeLength: function (edge){ return 50; },
  // Divisor to compute edge forces
  edgeElasticity: function ( edge ){ return 0.45; },
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
  initialEnergyOnIncremental: 0.5
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

function isFn(fn) {
  return typeof fn === 'function';
};
  
function optFn(opt, ele) {
  if (isFn(opt)) {
    return opt(ele);
  } else {
    return opt;
  }
};

function _CoSELayout(_options) {
  this.options = extend(defaults, _options);
  getUserOptions(this.options);
}

var getUserOptions = function (options) {
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
  if (options.initialEnergyOnIncremental != null)
    CoSEConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL = FDLayoutConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL = options.initialEnergyOnIncremental;
  
  if (options.quality == 'draft')
    LayoutConstants.QUALITY = 0;
  else if(options.quality == 'proof')
    LayoutConstants.QUALITY = 2;
  else
    LayoutConstants.QUALITY = 1;

  CoSEConstants.NODE_DIMENSIONS_INCLUDE_LABELS = FDLayoutConstants.NODE_DIMENSIONS_INCLUDE_LABELS = LayoutConstants.NODE_DIMENSIONS_INCLUDE_LABELS = options.nodeDimensionsIncludeLabels;
  CoSEConstants.PURE_INCREMENTAL = CoSEConstants.DEFAULT_INCREMENTAL = FDLayoutConstants.DEFAULT_INCREMENTAL = LayoutConstants.DEFAULT_INCREMENTAL =
          !(options.randomize);
  CoSEConstants.ANIMATE = FDLayoutConstants.ANIMATE = LayoutConstants.ANIMATE = options.animate;
  CoSEConstants.TILE = options.tile;
  CoSEConstants.TILING_PADDING_VERTICAL = 
          typeof options.tilingPaddingVertical === 'function' ? options.tilingPaddingVertical.call() : options.tilingPaddingVertical;
  CoSEConstants.TILING_PADDING_HORIZONTAL = 
          typeof options.tilingPaddingHorizontal === 'function' ? options.tilingPaddingHorizontal.call() : options.tilingPaddingHorizontal;
  LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES = options.uniformNodeDimensions;
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
  this.processEdgeList(this.gm, edges, layout);
  
  var getPositions = function(ele, i){
    if(typeof ele === "number") {
      ele = i;
    }
    var theId = ele.data('id');
    var lNode = self.idToLNode[theId];
    var centerX = lNode.getRect().getCenterX();
    var centerY = lNode.getRect().getCenterY();

    if(options.nodeDimensionsIncludeLabels){
      if(lNode.labelWidth){
        if(lNode.labelPosHorizontal == "left"){
          centerX += lNode.labelWidth/2;
        }
        else if(lNode.labelPosHorizontal == "right"){
          centerX -= lNode.labelWidth/2;
        }
      }
      if(lNode.labelHeight){
        if(lNode.labelPosVertical == "top"){
          centerY += lNode.labelHeight/2;
        }
        else if(lNode.labelPosVertical == "bottom"){
          centerY -= lNode.labelHeight/2;
        }
      }
    }

    return {
      x: centerX,
      y: centerY
    };
  };
  
  /*
   * Reposition nodes in iterations animatedly
   */
  var iterateAnimated = function () {
    // Thigs to perform after nodes are repositioned on screen
    var afterReposition = function() {
      if (options.fit) {
        options.cy.fit(options.eles, options.padding);
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
      // If ele is a compound node, then its position will be defined by its children
      if(!ele.isParent()){
        var theId = ele.id();
        var pNode = animationData[theId];
        var temp = ele;
        // If pNode is undefined search until finding position data of its first ancestor (It may be dummy as well)
        while (pNode == null) {
          pNode = animationData[temp.data('parent')] || animationData['DummyCompound_' + temp.data('parent')];
          animationData[theId] = pNode;
          temp = temp.parent()[0];
          if(temp == undefined){
            break;
          }
        }
        if(pNode != null){
          return {
            x: pNode.x,
            y: pNode.y
          };
        } else{
          return {
            x: ele.position('x'),
            y: ele.position('y')
          };
        }
      }
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
  if(this.options.animate !== "during"){
    self.options.eles.nodes().not(":parent").layoutPositions(self, self.options, getPositions); // Use layout positions to reposition the nodes it considers the options parameter
    ready = false;
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
    var children_of_children = theChild.children();
    var theNode;    

    var dimensions = theChild.layoutDimensions({
      nodeDimensionsIncludeLabels: this.options.nodeDimensionsIncludeLabels
    });

    if (theChild.outerWidth() != null
            && theChild.outerHeight() != null) {
      theNode = parent.add(new CoSENode(layout.graphManager,
              new PointD(theChild.position('x') - dimensions.w / 2, theChild.position('y') - dimensions.h / 2),
              new DimensionD(parseFloat(dimensions.w), parseFloat(dimensions.h))));
    }
    else {
      theNode = parent.add(new CoSENode(this.graphManager));
    }
    // Attach id and repulsion value to the layout node
    theNode.id = theChild.data("id");
    theNode.nodeRepulsion = optFn(this.options.nodeRepulsion, theChild);
    // Attach the paddings of cy node to layout node
    theNode.paddingLeft = parseInt( theChild.css('padding') );
    theNode.paddingTop = parseInt( theChild.css('padding') );
    theNode.paddingRight = parseInt( theChild.css('padding') );
    theNode.paddingBottom = parseInt( theChild.css('padding') );
    
    //Attach the label properties to both compound and simple nodes if labels will be included in node dimensions
    //These properties will be used while updating bounds of compounds during iterations or tiling
    //and will be used for simple nodes while transferring final positions to cytoscape
    if(this.options.nodeDimensionsIncludeLabels){
      theNode.labelWidth = theChild.boundingBox({ includeLabels: true, includeNodes: false, includeOverlays: false }).w;
      theNode.labelHeight = theChild.boundingBox({ includeLabels: true, includeNodes: false, includeOverlays: false }).h;
      theNode.labelPosVertical = theChild.css("text-valign");
      theNode.labelPosHorizontal = theChild.css("text-halign");
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

_CoSELayout.prototype.processEdgeList = function (gm, edges, layout) {
  var idealLengthTotal = 0;
  var edgeCount = 0;

  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
    var sourceNode = this.idToLNode[edge.data("source")];
    var targetNode = this.idToLNode[edge.data("target")];
    if(sourceNode !== targetNode && sourceNode.getEdgesBetween(targetNode).length == 0){
      var e1 = gm.add(layout.newEdge(), sourceNode, targetNode);
      e1.id = edge.id();
      e1.idealLength = optFn(this.options.idealEdgeLength, edge);
      e1.edgeElasticity = optFn(this.options.edgeElasticity, edge);
      idealLengthTotal += e1.idealLength;
      edgeCount++;
    }
  }
  // we need to update the ideal edge length constant with the avg. ideal length value after processing edges
  // in case there is no edge, use other options
  if (this.options.idealEdgeLength != null){
    if (edges.length > 0)
      CoSEConstants.DEFAULT_EDGE_LENGTH = FDLayoutConstants.DEFAULT_EDGE_LENGTH = idealLengthTotal / edgeCount;
    else if(!isFn(this.options.idealEdgeLength)) // in case there is no edge, but option gives a value to use
      CoSEConstants.DEFAULT_EDGE_LENGTH = FDLayoutConstants.DEFAULT_EDGE_LENGTH = this.options.idealEdgeLength;
    else  // in case there is no edge and we cannot get a value from option (because it's a function)
      CoSEConstants.DEFAULT_EDGE_LENGTH = FDLayoutConstants.DEFAULT_EDGE_LENGTH = 50;
    // we need to update these constant values based on the ideal edge length constant
    CoSEConstants.MIN_REPULSION_DIST = FDLayoutConstants.MIN_REPULSION_DIST = FDLayoutConstants.DEFAULT_EDGE_LENGTH / 10.0;
    CoSEConstants.DEFAULT_RADIAL_SEPARATION = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
  }   
};

/**
 * @brief : called on continuous layouts to stop them before they finish
 */
_CoSELayout.prototype.stop = function () {
  this.stopped = true;

  return this; // chaining
};

var register = function( cytoscape ){
//  var Layout = getLayout( cytoscape );

  cytoscape('layout', 'cose-bilkent', _CoSELayout);
};

// auto reg for globals
if( typeof cytoscape !== 'undefined' ){
  register( cytoscape );
}

module.exports = register;
