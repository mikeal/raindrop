dojo.provide("rd.api");

dojo.require("rd.api.Api");
dojo.require("rd.api.identity");
dojo.require("rd.api.me");
dojo.require("rd.api.message");

//The real action is in rd.api.Api, due to load order issues.
//We want to load all the rd.api.* extensions first, but they depend
//on rd.api.extend, which if defined in this file will not be available
//when the extension modules execute.