dojo.provide("extender.Wizard");

dojo.require("dojox.fx.scroll");

dojo.require("rdw._Base");

//Uses script-added styles to allow loading on demand at the cost of a
//custom build that would load all styles at the beginning.
rd.addStyle("extender.css.Wizard");

dojo.declare("extender.Wizard", [rdw._Base], {

  //Holds index into the history for extener panels.
  historyIndex: 0,
  
  //Holds width/height of each panel, updated on window resizes.
  panelWidth: 0,
  panelHeight: 0,

  templatePath: dojo.moduleUrl("extender.templates", "Wizard.html"),

  //Image used in template. Specified here so the path is not
  //hard-coded to a specific path.
  nobodyImgUrl: dojo.moduleUrl("extender.css", "nobody.png"),

  postCreate: function() {
    //summary: dijit lifecycle method.
    this.history = [this];

    this.backNode.style.visibility = "hidden";
    this.forwardNode.style.visibility = "hidden";

    //Make sure we are scrolled to the right position.
    this.panelContainerNode.scrollLeft = 0;

    //Listen for resizes to resize panels, and also
    //do initial calculation.
    this.connect(window, "onresize", "onResize");
    this.onResize();

    //Listen for hash changes so back/forward browser buttons work.
    this.subscribe("rd.onHashChange", this, "onHashChange");

    //Other UI setup, start animations.
    $(".miners > ul > li", this.domNode).each(function() {
      var d = new Date();
      if ( $(this).find("span.date").attr('id') == "tomorrow") {
        d.setDate(d.getDate() + 1);
      }
      if ( $(this).find("span.date").attr('id') == "tuesday") {
        d.setDate( d.getDate() + (2 - d.getDay() + 7) % 7 );
      }
      $(this).find("span.date").attr('title', d.toLocaleString());
  
    });
  
    window.setTimeout(function() {
      $(".w", this.domNode).slideDown("slow")
              .find("span.date")
              .addClass("date-processing")
              .animate({borderBottomWidth:"1px", backgroundColor: "#dfdfdf"},"slow", "",
                function() { 
                    $(this).addClass("date-processed");
                    $(".y", this.domNode).slideDown("slow")
                            .find("span.date")
                            .addClass("date-processing")
                            .animate({borderBottomWidth:"1px"}, "slow", "",
                              function() { $(this).addClass("date-processed") });
                }
      );
    }, 1000 * 1);
    window.setTimeout(function() { $(".Message > .message > .content > .widget-extension").slideDown("slow"); }, 1000 * 2);
  },

  destroy: function() {
    //Remove this widget.
    this.history.splice(0, 1);

    //Destroy the rest of the widgets.
    dojo.forEach(this.history, function(widget) {
      widget.destroy.apply(widget, arguments);
    });
    this.inherited("destroy", arguments);
  },

  trimForward: function() {
    //summary: destroys the panels/widgets that more forward in the history
    //than the current position.
    if (this.history[this.historyIndex + 1]) {
      var removed = this.history.splice(this.historyIndex + 1, (this.history.length - this.historyIndex + 2));
      dojo.forEach(removed, function(widget) {
        var panelNode = widget.domNode.parentNode;
        widget.destroy();
        //Get rid of panel container made by Wizard.
        dojo.destroy(panelNode);
      });
    }    
  },

  add: function(/*Object*/widget) {
    //summary: adds a widget to the history and trims any forward history.

    //Trim forward history.
    this.trimForward();

    //Store the extender on the widget, so widget can send commands to it.
    widget.extender = this;

    //Add the widget to the DOM
    var panel = dojo.create("div", {
      "class": "panel"
    }, this.panelsNode);

    //Width is dynamically set based on window resizes.
    dojo.style(panel, "width", this.panelWidth);

    panel.appendChild(widget.domNode);
    this.history[this.historyIndex + 1] = widget;

    this.forward();
  },

  forward: function() {
    //summary: goes forward one step in the history.
    this.historyIndex += 1;
    var scrollAmount = dojo.marginBox(this.panelNode).w;

    //Make sure both panels are visible.
    dojo.style(this.history[this.historyIndex].domNode, "visibility", "visible");
    dojo.style(this.history[this.historyIndex - 1].domNode, "visibility", "visible");

    dojox.fx.smoothScroll({
      win: this.panelContainerNode,
      target: { x: this.panelContainerNode.scrollLeft + scrollAmount, y: 0},
      duration: 300,
      onEnd: dojo.hitch(this, function() {
        //Adjust the nav links.
        if (this.historyIndex == this.history.length - 1) {
          this.forwardNode.style.visibility = "hidden";
        }
        this.backNode.style.visibility = "visible";

        //Hide the other panels so they are not visible during a resize
        this.updatePanelVisibility();

        //Allow widget to update itself.
        var widget = this.history[this.historyIndex];
        if (widget.activate) {
          widget.activate();
        }

        setTimeout(dojo.hitch(this, "onResize"), 100);
      })
    }).play();
  },

  back: function(/*Boolean*/doTrimForward) {
    //summary: goes back one step in the history.
    this.historyIndex -= 1;
    var scrollAmount = dojo.marginBox(this.panelNode).w;

    //Make sure both panels are visible.
    dojo.style(this.history[this.historyIndex].domNode, "visibility", "visible");
    dojo.style(this.history[this.historyIndex + 1].domNode, "visibility", "visible");

    dojox.fx.smoothScroll({
      win: this.panelContainerNode,
      target: { x: this.panelContainerNode.scrollLeft - scrollAmount, y: 0},
      duration: 300,
      onEnd: dojo.hitch(this, function() {
        //Adjust the nav links.
        if (this.historyIndex == 0) {
          this.backNode.style.visibility = "hidden";
        }
        this.forwardNode.style.visibility = "visible";
        this.updatePanelVisibility();

        //Allow widget to update itself.
        var widget = this.history[this.historyIndex];
        if (widget.activate) {
          widget.activate();
        }

        if (doTrimForward) {
          this.trimForward();
        }
        
        setTimeout(dojo.hitch(this, "onResize"), 100);
      })
    }).play();
  },

  onClick: function(evt) {
    //summary: handles clicks that might route to an extender action.
    var linkId = this.getFragmentId(evt);
    var extenderUiPrefix = "extender-ui-";
    if (linkId && linkId.indexOf("extender-") == 0) {
      var action = linkId.split("-")[1];
      if (this[action]) {
        this[action]();
      } else if (linkId == "extender-close") {
        rd.pub("rd-protocol-extenderClose");
      } else if (linkId.indexOf(extenderUiPrefix) == 0) {
        //Show all UI extensions
        var moduleName = linkId.substring(extenderUiPrefix.length, linkId.length);
        if (moduleName) {
          dojo["require"](moduleName);
          dojo.addOnLoad(dojo.hitch(this, function(){
            var module = dojo.getObject(moduleName);
            this.add(new module({}));
          }));
        }
      }
      dojo.stopEvent(evt);
    }
  },

  onResize: function() {
    //summary: updates how wide each panel should be based
    //on the panel container's viewable area. Need this for
    //the scrolling animation to work nicely.
    
    this.domNode.style.height = dijit.getViewport().h + "px";

    this.panelHeight = (dojo.marginBox(this.domNode).h - dojo.coords(this.panelsNode).y) + "px";
    
    var width = dojo.marginBox(this.panelContainerNode).w;
    this.panelWidth =  width + "px";
    dojo.query(".panel", this.panelContainerNode).style({
      width: this.panelWidth,
      height: this.panelHeight
    });

    //Make sure to update scrollLeft location of master container, since
    //the size of the panels changed.
    this.panelContainerNode.scrollLeft = width * this.historyIndex;
  },

  onHashChange: function(/*String*/value) {
    //summary: triggers when the hash changes. Used for navigation purposes.
    
  },

  updatePanelVisibility: function() {
    //summary: hide scrolled-off forward panels so they are not visible during a resize
    for (var i = this.historyIndex + 1; i < this.history.length; i++) {
      dojo.style(this.history[i].domNode, "visibility", "hidden");
    }
  }
});
