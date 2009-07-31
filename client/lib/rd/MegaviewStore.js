dojo.provide("rd.MegaviewStore");

dojo.require("dojo.DeferredList");
dojo.require("rd.store");

//This implements the dojo.data Read and Identity interfaces so it can
//be used in widgets that consume dojo.data stores. The items in this
//store have properties: "type", "id", and "name".

//TODO: make sure that close/abort clear out _items correctly.
//Should _items be placed on the Request object? How does that work
//for fetchByIdentity?

dojo.declare("rd.MegaviewStore", null, {
  //The types of schema queries to perform. Assumes there is a xQuery
  //method defined on an instance of this store for each type. So if
  //"contact" is in schemaQueryTypes, then there should be a contactQuery
  //method defined that returns a dojo.Deferred object.
  //This is a prototype property, so adding to it affects all instances,
  //where reassigning a new array on an instance will just affect that instance.
  //an array of schemaQueryTypes can be passed to the constructor as well.
  schemaQueryTypes: [
    "contact",
    "mailingList",
    "locationTag"
  ],

  constructor: function(/*Object?*/ args) {
    //summary: constructs an instance. Acceptable properties on the args
    //argument are:
    //shemaQueryTypes: the array of types of megaview queries to do.
    //Only use values that have an associated Query method on this object.
    args = args || {};
    if (args.schemaQueryTypes) {
      this.schemaQueryTypes = args.schemaQueryTypes;
    }
  },

  getValue: function(/*item*/ item,
                     /*attribute-name-string*/ attribute,
                     /*value?*/ defaultValue) {
    //console.log("getValue", item, attribute, defaultValue);
    return attribute in item ? item[attribute] : defaultValue;
  },

  getValues: function(/*item*/ item, /*attribute-name-string*/ attribute) {
    //console.log("getValues", item, attribute);
    return attribute in item ? [item[attribute]] : [];
  },

  getAttributes: function(/*item*/ item) {
    //console.log("getAttributes", item);
    var attrs = ["type", "id", "name"];
    var ret = [];
    for (var i = 0, attr; attr = attrs[i]; i++) {
      if (attr in item) {
        ret.push(attr);
      }
    }
    return ret;
  },

  hasAttribute: function(/*item*/ item, /*attribute-name-string*/ attribute) {
    //console.log("hasAttribute", item, attribute);
    return (attribute in item);
  },

  containsValue: function(/*item*/ item, /*attribute-name-string*/ attribute, /*anything*/ value) {
    //console.log("containsValue", item, attribute, value);
    return item[attribute] === value;
  },

  isItem: function(/*anything*/ something) {
    //console.log("isItem", something);
    return typeof something.id == "string"
        && something.type == "string"
        && something.name == "string";
  },

  isItemLoaded: function(/*anything*/ something) {
    //console.log("isItemLoaded", something);
    return this.isItem(something) && dojo.indexOf(this._items, something);
  },

  loadItem: function(/*Object*/ args){
    //console.log("loadItem", args);
    var item = args.item;
    if (this.isItem(item) && !dojo.indexOf(this._items, item)) {
      this._items.push(item);
      var onItem = args.onItem;
      if (onItem) {
        onItem.call(args.scope || dojo.global, item);
      }
    }
    //onError: support? Really try to call the megaview?
  },

  fetch: function(/*Object*/ args) {
    //right now only accepts args.query that is a string or an object
    //with a name property. No filtering options like * or ? are supported.
    //All queries are assumed to be queryvalue*
    //console.log("fetch", args);
    /*
     Still TODO:
     queryOptions: {
      ignoreCase: bool
      deep: bool
     },
     scope:
     start:
     sort: 
    */
    this._items = [];

    var query = args.query;
    if (query.name) {
      query = query.name;
    }

    //Remove special filter characters since they are not supported yet.
    query = query.replace(/\*/g, "").replace(/\?/g, "");

    var dfds = [];
    for (var i = 0, type; type = this.schemaQueryTypes[i]; i++) {
      if (this[type + "Query"]) {
        dfds.push(this[type + "Query"](query, args.count));
      } else {
        console.log("rd.MegaviewStore: unsupported schemaQueryTypes: " +type);
      }
    }

    var req = this._makeRequest(args);

    var dfdList = new dojo.DeferredList(dfds, false, true);
    dfdList.addCallbacks(dojo.hitch(this, "_fetchDone", req, args), dojo.hitch(this, "_fetchError", req, args));

    req._dfdList = dfdList;
    return req;
  },

  _fetchDone: function(/*Request*/req, /*Object*/ fetchArgs, /*Object*/ response) {
    //console.log("_fetchDone");
    //summary: called when all deferreds for the schemaQueryTypes finish.

    //Sort the values by name.
    this._items.sort(function(a, b) {
      a.name > b.name ? 1 : -1;
    });

    //Now process the callbacks.
    var scope = fetchArgs.scope || dojo.global;
    var func = fetchArgs.onBegin;
    if (func) {
      func.call(scope, this._items.length, req);
    }

    func = fetchArgs.onItem;
    if (func) {
      for (var i = 0, item; item = this._items[i]; i++) {
        func.call(scope, item, req);
      }
    }

    func = fetchArgs.onComplete(this._items, req);

    return response;
  },

  _fetchError: function(/*Request*/req, /*Object*/ fetchArgs, /*Error*/ response) {
    //console.log("_fetchError", req, fetchArgs, response);
    
    //If the error is from a deferred cancel, do not surface it as an error.
    if (response.dojoType == "cancel") {
      return true;
    }

    var onError = fetchArgs.onError;
    if (onError) {
      onError.call((fetchArgs.scope || dojo.global), response, req);
    }
    return response;
  },

  getFeatures: function() {
    //console.log("getFeatures");
    return {
      'dojo.data.api.Read': true
    };
  },

  close: function(/*dojo.data.api.Request || keywordArgs || null*/ request) {
    //console.log("close", request);
  },

  getLabel: function(/*item*/ item){
    //console.log("getLabel", item);
    return item.name;
  },

  getLabelAttributes: function(/*item*/ item) {
    //console.log("getLabelAttributes", item);
    return ["name"];
  },

  _makeRequest: function(/*Object*/ args) {
    //console.log("_makeRequest", args);
    //summary: used to make a dojo.data.api.Request object.
    var req = dojo.delegate(args);
    req.abort = this._requestAbort;
    return req;
  },

  _requestAbort: function() {
    //console.log("_requestAbort");
    //summary: the function definition used for a dojo.data.api.Request
    //object.
    if (this._dfdList) {
      this._dfdList.cancel();
    }
  },

  /**** Start schemaQueryType built-in Query methods ****/
  _addItems: function(/*Array*/ items) {
    //console.log("_addItems", items);
    //summary: called by the schemaQueryType Query methods to add items to the
    //final result. Each item in the array should have the following properties:
    //id: a unique ID
    //name: a display name
    //type: the type of item. Should match the schemaQueryType that generated
    //these items.
    this._items.push.apply(this._items, items);
  },

  contactQuery: function(/*String*/query, /*Number*/ count) {
    //summary: does a contact query for the "contact" schemaQueryType.
    //console.log("contactQuery", query, count);
    var dfd = new dojo.Deferred();

    var args = {
      startkey: ["rd.contact", "name", query],
      endkey: ["rd.contact", "name", query + "\u9999"],
      reduce: false,
      ioPublish: false,
      success: dojo.hitch(this, function(json) {
        var items = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          var name = row.key[2];
          if (!name) {
            continue;
          }
          items.push({
            id: row.value.rd_key[1],
            type: "contact",
            name: name
          });
        }
        this._addItems(items);
        dfd.callback();
      }),
      error: function(err) {
        dfd.errback(err);
      }
    };

    if (count && count != Infinity) {
      args.limit = count;
    }

    rd.store.megaview(args);
    return dfd;
  },

  mailingListQuery: function(/*String*/query, /*Number*/ count) {
    //summary: does a mailingList query for the "mailingList" schemaQueryType.
    //console.log("mailingListQuery", query, count);
    var dfd = new dojo.Deferred();

    var args = {
      startkey: ["rd.mailing-list", "id", query],
      endkey: ["rd.mailing-list", "id", query + "\u9999"],
      reduce: false,
      ioPublish: false,
      success: dojo.hitch(this, function(json) {
        var items = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          var name = row.key[2];
          if (!name) {
            continue;
          }
          items.push({
            id: row.value.rd_key[1],
            type: "mailingList",
            name: row.key[2]
          });
        }
        this._addItems(items);
        dfd.callback();
      }),
      error: function(err) {
        dfd.errback(err);
      }
    };

    if (count && count != Infinity) {
      args.limit = count;
    }

    rd.store.megaview(args);
    return dfd;
  },

  locationTagQuery: function(/*String*/query, /*Number*/ count) {
    //summary: does a locationTag query (imap folders) for the "locationTag" schemaQueryType.
    //console.log("locationTagQuery", query, count);
    var dfd = new dojo.Deferred();

    var args = {
      startkey: ["rd.msg.location", "location", [query]],
      endkey: ["rd.msg.location", "location", [query + "\u9999", {}]],
      reduce: true,
      group: true,
      ioPublish: false,
      success: dojo.hitch(this, function(json) {
        var items = [];
        for (var i = 0, row; row = json.rows[i]; i++) {
          var name = row.key[2];
          if (!name) {
            continue;
          }
          items.push({
            id: row.key[2],
            type: "locationTag",
            name: row.key[2]
          });
        }
        this._addItems(items);
        dfd.callback();
      }),
      error: function(err) {
        dfd.errback(err);
      }
    };

    if (count && count != Infinity) {
      args.limit = count;
    }

    rd.store.megaview(args);
    return dfd;
  }
});