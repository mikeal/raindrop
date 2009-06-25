dojo.provide("rdw.contactDropDown");

dojo.require("rdw.ContactSelector");

rdw.contactDropDown = {
  open: function(/*DOMNode*/domNode, /*Object?*/controller, /*Array?*/preferredContacts) {
    //Opens an dropdown with a ContactSelector near the domNode, passing
    //the optional preferredContacts to ContactSelector.    
    if (this.domNode == domNode && this._isOpen == true) {
      return;
    }
    this.domNode = domNode;

    //Make sure ContactSelector is set up and updated.
    if (!this.selector) {
      this.selector = new rdw.ContactSelector({});
      //Use a set timeout so the current click does not destroy the popup.
      setTimeout(dojo.hitch(this, function(){
        this.clickHandle = dojo.connect(dojo.doc.documentElement, "onclick", this, "onDocClick");
      }), 10);
    }
    this.selector.controller = controller;
    this.selector.update(preferredContacts);

    //Show the ContactSelector.
    dijit.popup.open({
      popup: this.selector,
      around: this.domNode,
      onCancel: this._closed,
      onClose: this._closed,
      onExecute: this._closed
    });

    this._isOpen = true;
    this._justOpened = true;
  },

  onDocClick: function(/*Event*/evt) {
    //summary: handles document clicks to see if we should hide the contacts.
    //Check if the click happens inside the ContactSelector.
    if (this._justOpened || !this._isOpen) {
      this._justOpened = false;
      return;
    } else {
      dijit.popup.close(this.selector);
      this._closed();
    }
/*
    var hide = true;
    var node = evt.target;
    while (node) {
      if (node == this.selector.domNode) {
        hide = false;
        break;
      }
      node = node.parentNode;
    }
    if (hide) {
      dijit.popup.close(this.selector);
      this._closed();
    }
*/
  },

  _closed: function() {
    //summary: function for dijit.popup.open calls.
    //DO NOT USE "this" in here, not safe.
    rdw.contactDropDown.domNode = null;
    rdw.contactDropDown._isOpen = false;
    rdw.contactDropDown.selector.clear();
  }
}