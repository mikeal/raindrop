/*
	Copyright (c) 2004-2009, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["tests.cache"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["tests.cache"] = true;
dojo.provide("tests.cache");

dojo.require("dojo.cache");

tests.register("tests.cache", 
	[
		{
			runTest: function(t){
				var expected = "<h1>Hello World</h1>";

				t.is(expected, dojo.trim(dojo.cache("dojo.cacheTest", "regular.html", "<h1>Hello World</h1>\n")));
				t.is(expected, dojo.trim(dojo.cache("dojo.cacheTest", "sanitized.html", {value: "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\"\n\t\"http://www.w3.org/TR/html4/loose.dtd\">\n<html>\n\t<head>\n\t\t<script type=\"text/javascript\" src=\"../../dojo.js\"></script>\n\t\t<script type=\"text/javascript\" src=\"../../cache.js\"></script>\n\t</head>\n\t<body class=\"tundra\">\n\t\t<h1>Hello World</h1>\n\t</body>\n</html>\n",sanitize: true})));
				
				//Just a couple of other passes just to make sure on manual inspection that the
				//files are loaded over the network only once.
				t.is(expected, dojo.trim(dojo.cache("dojo.cacheTest", "regular.html", "<h1>Hello World</h1>\n")));
				t.is(expected, dojo.trim(dojo.cache("dojo.cacheTest", "sanitized.html", {value: "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\"\n\t\"http://www.w3.org/TR/html4/loose.dtd\">\n<html>\n\t<head>\n\t\t<script type=\"text/javascript\" src=\"../../dojo.js\"></script>\n\t\t<script type=\"text/javascript\" src=\"../../cache.js\"></script>\n\t</head>\n\t<body class=\"tundra\">\n\t\t<h1>Hello World</h1>\n\t</body>\n</html>\n",sanitize: true})));
				
			}
		}
	]
);

}
