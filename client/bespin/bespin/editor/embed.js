/*
	Copyright (c) 2004-2009, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


(function() {
    // -- Load Script
    var loadScript = function(src, onload) {
        var embedscript = document.createElement("script");
        embedscript.type = "text/javascript";
        embedscript.src = src;
        embedscript.onload = onload;
        document.getElementsByTagName("head")[0].appendChild(embedscript);
    };
    // -- If Dojo hasn't been installed yet, get to it
    if (typeof window.dojo == "undefined") {
        loadScript("../../js/dojo/dojo.js", function() {
            dojo.require("bespin.editor.component");
        });
    } else {
        // -- Load up the embeddable editor component
        dojo.require("bespin.editor.component");
    }
})();
