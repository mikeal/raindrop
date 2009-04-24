dojo.provide("rdw._Base");
dojo.require("dijit.dijit");
dojo.require("rd");

dojo.requireLocalization("rdw", "i18n");

//Base "class" for all rdw widgets.
dojo.declare("rdw._Base", [dijit._Widget, dijit._Templated], {
  postMixInProperties: function() {
    //summary: dijit lifecycle method
    this.inherited("postMixInProperties", arguments);

    //Set default i18n bundle
    this.i18n = dojo.i18n.getLocalization("rdw", "i18n");
  },

  createdForTopic: function(/*String*/topic, /*Object*/topicData) {
    //summary: a widget can call this in postCreate if it created itself
    //as a result of a topic publish by another widget. This function will
    //inform the other widget that this widget was created for that topic,
    //to allow the other widget to embed this widget as a child.
    var other = topicData && topicData.widget;
    if (other && other.addByTopic) {
      other.addByTopic(this, topic, topicData);
    }
  },

  destroyedForTopic: function(/*String*/topic, /*Object*/topicData) {
    //summary: a widget can call this if it wants to tell another widget
    //it has destroyed itself, so the other widget no longer tries to track
    //it as a child. Should only be called if createdForTopic() was also called.
    var other = topicData && topicData.widget;
    if (other && other.removeByTopic) {
      other.removeByTopic(this, topic, topicData);
    }
  },

  addByTopic: function(/*Object*/widget, /*String*/topic, /*Object*/topicData) {
    //summary: For widgets that want to handle newly created subwidgets
    //that respond to rd.pub() calls. Widgets are encouraged to override this
    //method to do custom widget work, but call this.inherited() first.
    if (!this._supportingWidgets) {
      this._supportingWidgets = []
    }

    this._supportingWidgets[widget];
  },

  removeByTopic: function(/*Object*/widget, /*String*/topic, /*Object*/topicData) {
    //summary: For widgets that want to handle newly destroyed subwidgets
    //that were created as a response to rd.pub() calls. Widgets are encouraged to override this
    //method to do custom widget work, but call this.inherited() first.
    if (!this._supportingWidgets) {
      var index = dojo.indexOf(this._supportingWidgets, widget);
      if (index > -1) {
        this._supportingWidgets.splice(index, 1);
      }
    }
  }
});
