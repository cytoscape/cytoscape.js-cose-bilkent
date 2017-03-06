module.exports = function (instance) {
  instance.toBeTiled = {};
  
  instance.getToBeTiled = function (node) {
    var id = node.data("id");
    //firstly check the previous results
    if (instance.toBeTiled[id] != null) {
      return instance.toBeTiled[id];
    }

    //only compound nodes are to be tiled
    var children = node.children();
    if (children == null || children.length == 0) {
      instance.toBeTiled[id] = false;
      return false;
    }

    //a compound node is not to be tiled if all of its compound children are not to be tiled
    for (var i = 0; i < children.length; i++) {
      var theChild = children[i];

      if (instance.getNodeDegree(theChild) > 0) {
        instance.toBeTiled[id] = false;
        return false;
      }

      //pass the children not having the compound structure
      if (theChild.children() == null || theChild.children().length == 0) {
        instance.toBeTiled[theChild.data("id")] = false;
        continue;
      }

      if (!instance.getToBeTiled(theChild)) {
        instance.toBeTiled[id] = false;
        return false;
      }
    }
    instance.toBeTiled[id] = true;
    return true;
  };

  instance.getNodeDegree = function (node) {
    var id = node.id();
    var edges = instance.options.eles.edges().filter(function (ele, i) {
      if (typeof ele === "number") {
        ele = i;
      }
      var source = ele.data('source');
      var target = ele.data('target');
      if (source != target && (source == id || target == id)) {
        return true;
      }
    });
    return edges.length;
  };

  instance.getNodeDegreeWithChildren = function (node) {
    var degree = instance.getNodeDegree(node);
    var children = node.children();
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      degree += instance.getNodeDegreeWithChildren(child);
    }
    return degree;
  };

  instance.groupZeroDegreeMembers = function () {
    // array of [parent_id x oneDegreeNode_id]
    var tempMemberGroups = [];
    var memberGroups = [];
    var self = this;
    var parentMap = {};

    for (var i = 0; i < instance.options.eles.nodes().length; i++) {
      parentMap[instance.options.eles.nodes()[i].id()] = true;
    }

    // Find all zero degree nodes which aren't covered by a compound
    var zeroDegree = instance.options.eles.nodes().filter(function (ele, i) {
      if (typeof ele === "number") {
        ele = i;
      }
      var pid = ele.data('parent');
      if (pid != undefined && !parentMap[pid]) {
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

      if (p_id != undefined && !parentMap[p_id]) {
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
        if (instance.options.cy.getElementById(dummyCompoundId).empty()) {
          instance.options.cy.add({
            group: "nodes",
            data: {id: dummyCompoundId, parent: p_id
            }
          });

          var dummy = instance.options.cy.nodes()[instance.options.cy.nodes().length - 1];
          instance.options.eles = instance.options.eles.union(dummy);
          dummy.hide();

          for (var i = 0; i < tempMemberGroups[p_id].length; i++) {
            if (i == 0) {
              dummy.scratch('coseBilkent', {tempchildren: []});
            }
            var node = tempMemberGroups[p_id][i];
            var scratchObj = node.scratch('coseBilkent');
            if (!scratchObj) {
              scratchObj = {};
              node.scratch('coseBilkent', scratchObj);
            }
            scratchObj['dummy_parent_id'] = dummyCompoundId;
            instance.options.cy.add({
              group: "nodes",
              data: {parent: dummyCompoundId, width: node.width(), height: node.height()
              }
            });
            var tempchild = instance.options.cy.nodes()[instance.options.cy.nodes().length - 1];
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

  instance.performDFSOnCompounds = function (options) {
    var compoundOrder = [];

    var roots = instance.getTopMostNodes(instance.options.eles.nodes());
    instance.fillCompexOrderByDFS(compoundOrder, roots);

    return compoundOrder;
  };

  instance.fillCompexOrderByDFS = function (compoundOrder, children) {
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      instance.fillCompexOrderByDFS(compoundOrder, child.children());
      if (instance.getToBeTiled(child)) {
        compoundOrder.push(child);
      }
    }
  };

  instance.clearCompounds = function () {
    var childGraphMap = [];

    // Get compound ordering by finding the inner one first
    var compoundOrder = instance.performDFSOnCompounds(instance.options);
    instance.compoundOrder = compoundOrder;
    instance.processChildrenList(instance.root, instance.getTopMostNodes(instance.options.eles.nodes()), instance.layout);

    for (var i = 0; i < compoundOrder.length; i++) {
      // find the corresponding layout node
      var lCompoundNode = instance.idToLNode[compoundOrder[i].id()];

      childGraphMap[compoundOrder[i].id()] = compoundOrder[i].children();

      // Remove children of compounds
      lCompoundNode.child = null;
    }

    // Tile the removed children
    var tiledMemberPack = instance.tileCompoundMembers(childGraphMap);

    return tiledMemberPack;
  };

  instance.clearZeroDegreeMembers = function (memberGroups) {
    var tiledZeroDegreePack = [];

    for (var id in memberGroups) {
      var compoundNode = instance.idToLNode[id];

      tiledZeroDegreePack[id] = instance.tileNodes(memberGroups[id]);

      // Set the width and height of the dummy compound as calculated
      compoundNode.rect.width = tiledZeroDegreePack[id].width;
      compoundNode.rect.height = tiledZeroDegreePack[id].height;
    }
    return tiledZeroDegreePack;
  };

  instance.repopulateCompounds = function (tiledMemberPack) {
    for (var i = instance.compoundOrder.length - 1; i >= 0; i--) {
      var id = instance.compoundOrder[i].id();
      var lCompoundNode = instance.idToLNode[id];
      var horizontalMargin = parseInt(instance.compoundOrder[i].css('padding-left'));
      var verticalMargin = parseInt(instance.compoundOrder[i].css('padding-top'));

      instance.adjustLocations(tiledMemberPack[id], lCompoundNode.rect.x, lCompoundNode.rect.y, horizontalMargin, verticalMargin);
    }
  };

  instance.repopulateZeroDegreeMembers = function (tiledPack) {
    for (var i in tiledPack) {
      var compound = instance.cy.getElementById(i);
      var compoundNode = instance.idToLNode[i];
      var horizontalMargin = parseInt(compound.css('padding-left'));
      var verticalMargin = parseInt(compound.css('padding-top'));

      // Adjust the positions of nodes wrt its compound
      instance.adjustLocations(tiledPack[i], compoundNode.rect.x, compoundNode.rect.y, horizontalMargin, verticalMargin);

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
  instance.adjustLocations = function (organization, x, y, compoundHorizontalMargin, compoundVerticalMargin) {
    x += compoundHorizontalMargin;
    y += compoundVerticalMargin;

    var left = x;

    for (var i = 0; i < organization.rows.length; i++) {
      var row = organization.rows[i];
      x = left;
      var maxHeight = 0;

      for (var j = 0; j < row.length; j++) {
        var lnode = row[j];
        var node = instance.cy.getElementById(lnode.id);

        lnode.rect.x = x;// + lnode.rect.width / 2;
        lnode.rect.y = y;// + lnode.rect.height / 2;

        x += lnode.rect.width + organization.horizontalPadding;

        if (lnode.rect.height > maxHeight)
          maxHeight = lnode.rect.height;
      }

      y += maxHeight + organization.verticalPadding;
    }
  };

  instance.tileCompoundMembers = function (childGraphMap) {
    var tiledMemberPack = [];

    for (var id in childGraphMap) {
      // Access layoutInfo nodes to set the width and height of compounds
      var compoundNode = instance.idToLNode[id];

      tiledMemberPack[id] = instance.tileNodes(childGraphMap[id]);

      compoundNode.rect.width = tiledMemberPack[id].width + 20;
      compoundNode.rect.height = tiledMemberPack[id].height + 20;
    }

    return tiledMemberPack;
  };

  instance.tileNodes = function (nodes) {
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
      var lNode = instance.idToLNode[node.id()];

      if (!node.scratch('coseBilkent') || !node.scratch('coseBilkent').dummy_parent_id) {
        var owner = lNode.owner;
        owner.remove(lNode);

        instance.gm.resetAllNodes();
        instance.gm.getAllNodes();
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

      var cyNode = instance.cy.getElementById(lNode.id).parent()[0];
      var minWidth = 0;
      if (cyNode) {
        minWidth = parseInt(cyNode.css('padding-left')) + parseInt(cyNode.css('padding-right'));
      }

      if (organization.rows.length == 0) {
        instance.insertNodeToRow(organization, lNode, 0, minWidth);
      }
      else if (instance.canAddHorizontal(organization, lNode.rect.width, lNode.rect.height)) {
        instance.insertNodeToRow(organization, lNode, instance.getShortestRowIndex(organization), minWidth);
      }
      else {
        instance.insertNodeToRow(organization, lNode, organization.rows.length, minWidth);
      }

      instance.shiftToLastRow(organization);
    }

    return organization;
  };

  instance.insertNodeToRow = function (organization, node, rowIndex, minWidth) {
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
  instance.getShortestRowIndex = function (organization) {
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
  instance.getLongestRowIndex = function (organization) {
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
  instance.canAddHorizontal = function (organization, extraWidth, extraHeight) {

    var sri = instance.getShortestRowIndex(organization);

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
  instance.shiftToLastRow = function (organization) {
    var longest = instance.getLongestRowIndex(organization);
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

      instance.shiftToLastRow(organization);
    }
  };
  
  instance.preLayout = function() {
    // Find zero degree nodes and create a compound for each level
    var memberGroups = instance.groupZeroDegreeMembers();
    // Tile and clear children of each compound
    instance.tiledMemberPack = instance.clearCompounds();
    // Separately tile and clear zero degree nodes for each level
    instance.tiledZeroDegreeNodes = instance.clearZeroDegreeMembers(memberGroups);
  };
  
  instance.postLayout = function() {
    var nodes = instance.options.eles.nodes();
    //fill the toBeTiled map
    for (var i = 0; i < nodes.length; i++) {
      instance.getToBeTiled(nodes[i]);
    }

    // Repopulate members
    instance.repopulateZeroDegreeMembers(instance.tiledZeroDegreeNodes);

    instance.repopulateCompounds(instance.tiledMemberPack);

    instance.options.cy.nodes().updateCompoundBounds();
  };
};