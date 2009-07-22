//Modified from couchdb's jquery.couch.js file.

//xdomain loading wrapper. Can be inserted by a build process, but manually doing it for now.
window[(typeof (djConfig)!="undefined"&&djConfig.scopeMap&&djConfig.scopeMap[0][1])||"dojo"]._xdResourceLoaded(function(dojo, dijit, dojox){
  return {
  depends:[["provide","couch"]],defineResource:function(dojo, dijit, dojox){

//Main module definition
dojo.provide("couch");

;(function(){
  function _handle(response, ioArgs) {
    //Used as the callback for XHR calls. Figure out what options method to call.
    var options = ioArgs.args;
    if (response instanceof Error) {
      if (dojo.isFunction(options.error)) {
        var xhr = ioArgs.xhr;
        return options.error(xhr.status, xhr.statusText, xhr.responseText) || response;
      } else {
        alert("An error occurred talking with the couch: " + response);
        return response;
      }
    } else {
      if (options.beforeSuccess){
        return options.beforeSuccess(response, ioArgs) || response;
      }else if (options.success) {
        return options.success(response, ioArgs) || response;
      }
      return response;
    }
  }

  function _call(type, url, options, beforeSuccess) {
    //Basic fetch method used by all calls.
    options = options || {};
    type = type.toUpperCase();
  
    //Make a new options so we do not tamper with existing options object.
    options = dojo.delegate(options);
    dojo.mixin(options, {
      url: url,
      handleAs: "json",
      beforeSuccess: beforeSuccess,
      headers: {
        contentType: "application/json"
      },
      iframeProxyUrl: djConfig.iframeProxyUrl,
      handle: _handle
    });

    return dojo.xhr(type, options, (options.postData || options.putData));
  }

  var encodeExceptions = {
    error: 1,
    success: 1,
    postData: 1,
    putData: 1
  };

  // Convert a options object to an url query string.
  // ex: {key:'value',key2:'value2'} becomes '?key="value"&key2="value2"'
  function encodeOptions(options) {
    var buf = []
    if (typeof(options) == "object" && options !== null) {
      for (var name in options) {
        if (encodeExceptions[name]) continue;
        var value = options[name];
        // keys will result in a POST, so we don't need them in our GET part
        if (name == "keys") continue;
        if (name == "key" || name == "startkey" || name == "endkey") {
          value = toJSON(value);
        }
        buf.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
      }
    }
    return buf.length ? "?" + buf.join("&") : "";
  }

  function toJSON(obj) {
    return obj !== null ? dojo.toJson(obj) : null;
  }


  function applyExtensions(extensions, rows) {
    //Function that will apply extensions to a set of rows.
    //These are "perspective" extensions that are applied after
    //a couchdb view is run.

    //First, convert extension string names to actual functions.    
    extensions = dojo.map(extensions, function (extension) {
      return dojo.getObject(extension);
    });

    //All extensions must return true for the row to be returned.
    return dojo.filter(rows, function(row, i, array) {
      var result = true;
      for (var ij = 0; j < extensions.length; j++) {
        if (!extensions[j](row, j, array)) {
          result = false;
          break;
        }
      }
      return result;
    });
  }

couch = {
    allDbs: function(options) {
      return _call("GET", "/_all_dbs", options);
    },

    config: function(options) {
      return _call("GET", "/_config/", options);
    },

    db: function(name) {
      return {
        name: name,
        //A bit of a hack to use rd.dbPath if loaded with rd stuff, to abstract
        //away the path and name of the raindrop db. Prefer using rd.store
        //instead of this file where possible.
        uri: name == ("raindrop" && typeof rd != "undefined" && rd.dbPath) ?
            rd.dbPath
          :
            djConfig.couchUrl + "/" + encodeURIComponent(name) + "/",

        compact: function(options) {
          return _call("POST", this.uri + "_compact", options, function(response, ioArgs) {
            var options = ioArgs.args;
            if (ioArgs.xhr.status == 202) {
              if (options.success) {
                options.success(response);
              }
              return response;
            } else {
              return Error("Invalid status: " + ioArgs.xhr.status);
            }
          });
        },
        create: function(options) {
          return _call("PUT", this.uri + "_compact", options, function(response, ioArgs) {
            var options = ioArgs.args;
            if (ioArgs.xhr.status == 201) {
              if (options.success) {
                options.success(response);
              }
              return response;
            } else {
              return Error("Invalid status: " + ioArgs.xhr.status);
            }
          });
        },
        drop: function(options) {
          return _call("DELETE", this.uri, options);
        },
        info: function(options) {
          return _call("GET", this.uri, options);
        },
        allDocs: function(options) {
          if (options && options.keys) {
            options = dojo.delegate(options || {});
            options.postData = dojo.toJson({keys: options.keys});
            return _call("POST", this.uri + "_all_docs" + encodeOptions(options), options);
          } else {
            return _call("GET", this.uri + "_all_docs" + encodeOptions(options), options);
          }
        },
        openDoc: function(docId, options) {
          return _call("GET", this.uri + encodeURIComponent(docId) + encodeOptions(options), options);
        },
        saveDoc: function(doc, options) {
          if (doc._id === undefined) {
            var method = "POST";
            var uri = this.uri;
            options.postData = dojo.toJson(doc);
          } else {
            var method = "PUT";
            var uri = this.uri  + encodeURIComponent(doc._id);
            options.putData = dojo.toJson(doc);
          }
          _call(method, uri, options, function(response, ioArgs) {
              doc._id = response.id;
              doc._rev = response.rev;
              if (ioArgs.xhr.status == 201) {
                if (options.success) {
                  options.success(response);
                }
                return response;
              } else {
                return Error("Invalid status: " + ioArgs.xhr.status);              
              }          
          });
        },
        removeDoc: function(doc, options) {
          return _call("DELETE", this.uri + encodeURIComponent(doc._id) + encodeOptions({rev: doc._rev}), options);
        },
        query: function(mapFun, reduceFun, language, options) {
          language = language || "javascript"
          if (typeof(mapFun) != "string") {
            mapFun = mapFun.toSource ? mapFun.toSource() : "(" + mapFun.toString() + ")";
          }
          var body = {language: language, map: mapFun};
          if (reduceFun != null) {
            if (typeof(reduceFun) != "string")
              reduceFun = reduceFun.toSource ? reduceFun.toSource() : "(" + reduceFun.toString() + ")";
            body.reduce = reduceFun;
          }
          
          options = dojo.delegate(options || {});
          options.postData = toJSON(body);

          return _call("POST", this.uri + "_slow_view" + encodeOptions(options), options);
        },
        view: function(name, options, extensions) {
          if (dojo.config.useApiStub) {
            name = name.replace(/!/g, "/") + ".js";
          }
          if (options.keys) {
            options = dojo.delegate(options || {});
            options.postData = dojo.toJson({keys: options.keys});            
            return _call(dojo.config.useApiStub ? "GET" : "POST", this.uri + "_design/" + name + encodeOptions(options), options);
          } else {
            var beforeSuccess;
            if(extensions) {
              beforeSuccess = function(json){
                json.rows = applyExtensions(extensions, json.rows);
                if (options.success) {
                  options.success(json);
                }
              };
            }
            return _call("GET", this.uri + "_design/" + name + encodeOptions(options), options, beforeSuccess);
          }
        }
      };
    },

    info: function(options) {
      return _call("GET", "/", options);
    },

    replicate: function(source, target, options) {
      options = dojo.delegate(options || {});
      options.postData = toJSON({source: source, target: target});
      return _call("POST", "/_replicate", options);
    }

  }
})();

}}});
