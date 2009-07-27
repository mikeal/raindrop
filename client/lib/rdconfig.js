;(function(){
  //Find raindrop location
  var scripts = document.getElementsByTagName("script");
  var prefix = "";
  for (var i = scripts.length - 1, scp; (i > -1) && (scp = scripts[i]); i--){
    var src = scripts[i].src;
    var index = src && src.indexOf("/rdconfig.js");
    if(index && index != -1){
      prefix = src.substring(0, index);
      //Determine DB path
      var dbPath = scp.getAttribute("data-dbpath");
      if( !dbPath) {
        //Figure a default DB based on url for rdconfig.
        dbPath = src.split("/").slice(0, 4).join("/");
      }
      //Make sure dbPath ends in an end slash.
      if (dbPath.charAt(dbPath.length - 1) != "/") {
        dbPath += "/";
      }

      //Check for app name, passed via rdconfig.js tag
      var appName = scp.getAttribute("data-appname") || "";
    }
    i--;
  }

  //Determine DB path
  
  var dojoPrefix = prefix.replace(/\/lib$/, "/dojo");

  djConfig = {
    debugAtAllCosts: true, //comment  this out for faster loading.
    require: ["rd", "couch", "dojo.parser"],
    parseOnLoad: true,
    //The "base" value is just bogus, just want paths to resolve to local html directory
    //for app-specific files.
    baseUrl: "./base/",
    couchUrl: prefix.split("/", 3).join("/"),
    modulePaths: {
      /*INSERT PATHS HERE*/
      "dojo": dojoPrefix + "/dojo",
      "dijit": dojoPrefix + "/dijit",
      "dojox": dojoPrefix + "/dojox",

      "rd": prefix + "/rd",
      "couch": prefix + "/couch",
      "rdw": prefix  + "/rdw",
      "ext": prefix + "/ext"
    },

    rd: {
      /*INSERT SUBS HERE*/
      /*INSERT EXTS HERE*/
    },

    scopeMap: [
      ["dojo", "rd"],
      ["dijit", "rdw"],
      ["dojox", "rdx"]
    ]
  };

  djConfig.rd.dbPath = dbPath;

  djConfig.rd.appName = appName;

  //If using API stubs, then adjust couch path.
  var query = location.search;
  if (query && query.indexOf("apistub=1") != -1) {
    djConfig.couchUrl += rd.dbPath + "apistub";
    djConfig.useApiStub = true;
  }
  
  //Adjust djConfig.rd.exts to be structured differently.
  var exts = djConfig.rd.exts;
  if (exts) {
    var extNew = {};
    var empty = {};
    for (var i = 0, ext; ext = exts[i]; i++) {
      for (var prop in ext) {
        if (!(prop in empty)) {
          var extList = extNew[prop] || (extNew[prop] = []);
          extList.push(ext[prop]);
        }
      }
    }
    djConfig.rd.exts = extNew;
  }

  //TODO: just doing this here in JS because my python fu is weak.
  //Need to split off the html file name from the application paths.
  //Also need to strip off domain if it matches the page we are currently
  //on, to avoid xd loading of modules (makes for easier debugging). That
  //part might need to be kept in JavaScript. Using http headers on the server
  //will not give us the full picture.
  var parts = location.href.split("/");
  var frameworkNames = {
    "dojo": 1,
    "dijit": 1,
    "dojox": 1,
    "couch": 1
  };

  for (var param in djConfig.modulePaths) {
    var value = djConfig.modulePaths[param];
    
    //Pull off . files from path
    value = value.split("/");
    if (value[value.length - 1].indexOf(".") != -1) {
      value.pop();
    }

    //Adjust path to be local, if not one of the framework values.
    if (!frameworkNames[param]) {
        if (value[0] == parts[0] && value[1] == parts[1] && value[2] == parts[2]){
          value.splice(0, 3, "");
        }
    }

    value = value.join("/");
    djConfig.modulePaths[param] = value;
  }
  
  document.write('<script src="' + dojoPrefix + '/dojo/dojo.xd.js.uncompressed.js"></script>'
               + '<script src="' + prefix + '/jquery-1.3.2.js"></script>');
})();
