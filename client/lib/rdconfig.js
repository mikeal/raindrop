/* ***** BEGIN LICENSE BLOCK *****
 * @license Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Raindrop.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * */

//evil is for the doc.write at the end of this script.
/*jslint evil: true, plusplus: false */
/*global document: false */
"use strict";

var djConfig, run;
(function () {
    //Find raindrop location
    var scripts = document.getElementsByTagName("script"), prefix = "", i,
        src, index, dbPath, appName, dojoPrefix, exts, extNew, empty, prop,
        scp, extList, ext;
    for (i = scripts.length - 1; (i > -1) && (scp = scripts[i]); i--) {
        src = scripts[i].src;
        index = src && src.indexOf("/rdconfig.js");
        if (index && index !== -1) {
            prefix = src.substring(0, index + 1);
            //Determine DB path
            dbPath = scp.getAttribute("data-dbpath");
            if (!dbPath) {
                //Figure a default DB based on url for rdconfig.
                dbPath = src.split("/").slice(0, 4).join("/");
            }
            //Make sure dbPath ends in an end slash.
            if (dbPath.charAt(dbPath.length - 1) !== "/") {
                dbPath += "/";
            }

            //Check for app name, passed via rdconfig.js tag
            appName = scp.getAttribute("data-appname") || "";
        }
        i--;
    }

    dojoPrefix = prefix + "../dojo/";

    djConfig = {
        parseOnLoad: false
    };

    run = {
        baseUrl: prefix,
        paths: {
            "dojo": dojoPrefix + "dojo",
            "dijit": dojoPrefix + "dijit",
            "dojox": dojoPrefix + "dojox",
            /*INSERT PATHS HERE*/
        },

        rd: {
            couchUrl: prefix.split("/", 3).join("/"),
            /*INSERT SUBS HERE*/
            /*INSERT EXTS HERE*/
        }
    };

    run.paths[appName] = prefix + "../" + appName + "/" + appName;

    run.rd.dbPath = dbPath;

    run.rd.appName = appName;

    document.write('<script src="' + dojoPrefix + 'dojo.js"></script>' +
                   '<script src="' + prefix + 'jquery-1.3.2.js"></script>' +
                   '<script>run(["rd"]);</script>');
}());
