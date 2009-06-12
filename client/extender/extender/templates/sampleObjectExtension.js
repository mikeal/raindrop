dojo.provide("ext.${extName}");

dojo.require("${targetModule}");

//Adds the style sheet for this extension.
//rd.addStyle("ext.${extName}.css.main");

rd.applyExtension("ext.${extName}", "${targetModule}", {
  //"after" is the type of extension. It means attach these methods
  //after the existing one on the widget. Other options are:
  //before, around, replace and add.
  after: {
    postCreate: function() {
      //summary: This extension is adding a method to run after the
      //widget's postCreate() call. postCreate() means that the widget's HTML
      //has been injected in the DOM, so we can add other things to it.

      //NOTE: "this" in this function is the instance of ${targetModule}.

      //this.domNode is the root DOM node for the widget's instance.
      $(this.domNode)
        .append('<div class="ext${extName}">Hello World</div>')
        .children(".ext${extName}")
        .css("backgroundColor", "red");
    }
  }
});
