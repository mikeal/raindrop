// xbl.js - Copyright (C) 2008 Sergey Ilinsky (http://www.ilinsky.com)
//
// This work is free software; you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation; either version 2.1 of the License, or
// (at your option) any later version.

// This work is distributed in the hope that it will be useful,
// but without any warranty; without even the implied warranty of
// merchantability or fitness for a particular purpose. See the
// GNU Lesser General Public License for more details.

// You should have received a copy of the GNU Lesser General Public License
// along with this library; if not, write to the Free Software Foundation, Inc.,
// 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

(function () {

/*
 * cXBLLanguage implementation
 */
var cXBLLanguage	= {};

cXBLLanguage.namespaceURI	= "http://www.w3.org/ns/xbl";
cXBLLanguage.bindings	= {};
cXBLLanguage.rules		= {};
//cXBLLanguage.styles		= {};

cXBLLanguage.factory	= document.createElement("span");
//cXBLLanguage.stylesheet	= document.createElement("style");

cXBLLanguage.fetch	= function(sUri) {
	// Make request
	var oXMLHttpRequest	= window.XMLHttpRequest ? new window.XMLHttpRequest : new window.ActiveXObject("Microsoft.XMLHTTP");
	oXMLHttpRequest.open("GET", sUri, false);
	oXMLHttpRequest.send(null);
	//
	return oXMLHttpRequest;
};

// Private Methods
cXBLLanguage.extend	= function(cBinding, cBase) {
	//
	cBinding.baseBinding	= cBase;

	// Copy handlers
	if (cBase.$handlers) {
		// Create object
		cBinding.$handlers	= {};

		// Iterate over handlers
		for (var sName in cBase.$handlers) {
			if (!(sName in cBinding.$handlers))
				cBinding.$handlers[sName]	= [];
			for (var i = 0, j = cBase.$handlers[sName].length; i < j; i++)
				cBinding.$handlers[sName].push(cBase.$handlers[sName][i]);
		}
	}

	// Copy implementation
	for (var sMember in cBase.prototype)
		cBinding.prototype[sMember]	= cBase.prototype[sMember];

	// Copy template
	cBinding.template	= cBase.template;
};

cXBLLanguage.correct	= function(cBinding, oNode, bXmlSpace) {
	var sValue, oNext;
	while (oNode) {
		oNext	= oNode.nextSibling;
		if (oNode.nodeType == 1) {
			if (sValue = oNode.getAttribute("xbl-id"))
				oNode.className+= (oNode.className ? ' ' : '') + "xbl-id" + '-' + sValue + '-' + cBinding.id;
			if (sValue = oNode.getAttribute("xbl-pseudo"))
				oNode.className+= (oNode.className ? ' ' : '') + "xbl-pseudo" + '-' + sValue + '-' + cBinding.id;
			if (oNode.firstChild)
				arguments.callee(cBinding, oNode.firstChild, bXmlSpace);
		}
		else
		if (!bXmlSpace && oNode.nodeType == 3) {
//			sValue = oNode.data.replace(/[ \t\r\n\f]+/g, ' ');	// This expression would leave &nbsp; intact
			sValue = oNode.data.replace(/\s+/g, ' ');
			// remove empty nodes
			if (sValue == ' ')
				oNode.parentNode.removeChild(oNode);
			else
			// strip text nodes
			if (oNode.data != sValue)
				oNode.data = sValue;
		}
		oNode	= oNext;
	}
};

/*
 * Processes given node and registeres bindings
 */
cXBLLanguage.process	= function(oNode, sLocation) {
	//
	if (oNode.nodeType == 9)
		oNode	= oNode.documentElement;

	if (oNode.nodeType == 1)
		cXBLLanguage.elements(oNode, cXBLLanguage.elements.xbl, sLocation);
//->Debug
	else
		cXBLLanguage.onerror("Not a valid XML Node passed");
//<-Debug
};

cXBLLanguage.getBinding	= function(sDocumentUri) {
	if (!(sDocumentUri in cXBLLanguage.bindings)) {
		var aBinding	= sDocumentUri.split('#');
//->Debug
		if (aBinding.length < 2)
			cXBLLanguage.onerror("Invalid binding URI '" + sDocumentUri + "'");
//<-Debug
		// Make sure element is loaded
		cDocumentXBL.prototype.loadBindingDocument.call(document, aBinding[0]);

		//
//->Debug
		if (!cXBLLanguage.bindings[sDocumentUri])
			cXBLLanguage.onerror("Binding '" + aBinding[1] + "' was not found in '" + aBinding[0] + "'");
//<-Debug
	}
	return cXBLLanguage.bindings[sDocumentUri] || null;
};
//->Debug
cXBLLanguage.onerror	= function(sMessage) {
	if (window.console && window.console.error)
		window.console.error("XBL 2.0: " + sMessage);
};
//<-Debug
/*
 * XBL Elements processors
 */
cXBLLanguage.elements	= function(oParent, fHandler, vParameter) {
	for (var i = 0, j = oParent.childNodes.length, sName, oNode; i < j; i++) {
		oNode	= oParent.childNodes[i];
		if (oNode.nodeType == 1)
			if (oNode.namespaceURI == cXBLLanguage.namespaceURI) {
				if (fHandler[sName = (oNode.localName || oNode.baseName)])
					fHandler[sName](oNode, vParameter);
//->Debug
				else
					cXBLLanguage.onerror("Element '" + oNode.nodeName + "' could not be a child of '" + oParent.nodeName + "'");
//<-Debug
			}
	}
};

/*
 * Element: xbl
 */
cXBLLanguage.elements.xbl	= function(oNode, sDocumentUri) {
	// Process chlidren
	cXBLLanguage.elements(oNode, arguments.callee, sDocumentUri);
};

/*
 * Element: xbl/binding
 */
cXBLLanguage.elements.xbl.binding = function(oNode, sDocumentUri) {
	var sId		= oNode.getAttribute("id"),
		sElement= oNode.getAttribute("element");

	if (sId || sElement) {
		if (!sId)
			sId		= "xbl" + '-' + window.Math.floor(window.Math.random()*100000000);

		var cBinding	= new window.Function;

		//
		cBinding.id				= sId;
		cBinding.documentURI	= sDocumentUri;

		// Register binding
		cXBLLanguage.bindings[sDocumentUri + '#' + sId]	= cBinding;
		if (sElement) {
			if (!cXBLLanguage.rules[sElement])
				cXBLLanguage.rules[sElement]	= [];
			cXBLLanguage.rules[sElement].push(sDocumentUri + '#' + sId);
		}

		// binding@extends implementation
		var sExtends	= oNode.getAttribute("extends"),
			aExtend,
			sXmlBase	= fGetXmlBase(oNode, sDocumentUri),
			cBase;
		if (sExtends) {
			aExtend	= sExtends.split('#');
			if (cBase = cXBLLanguage.getBinding(fResolveUri(aExtend[0], sXmlBase) + '#' + aExtend[1]))
				cXBLLanguage.extend(cBinding, cBase);
//->Debug
			else
				cXBLLanguage.onerror("Extends '" + sExtends + "' was not found thus ignored");
//<-Debug
		}

		// Process children
		cXBLLanguage.elements(oNode, arguments.callee, cBinding);
	}
//->Debug
	else
		cXBLLanguage.onerror("Either required attribute 'id' or 'element' is missing in " + oNode.nodeName);
//<-Debug
};

/*
 * Element: xbl/script
 */
cXBLLanguage.elements.xbl.script = function(oNode, sDocumentUri) {
	var sSrc	= oNode.getAttribute("src"),
		sScript,
		oScript;

	if (sSrc) {
		sSrc	= fResolveUri(sSrc, fGetXmlBase(oNode, sDocumentUri));
		sScript	= cXBLLanguage.fetch(sSrc).responseText;
	}
	else
	if (oNode.firstChild)
		sScript	= oNode.firstChild.nodeValue;

	// Create a script and add it to the owner document
	oScript	= document.createElement("script");
	oScript.setAttribute("type", "text/javascript");
	if (document.namespaces)
		oScript.text	= sScript;
	else
		oScript.appendChild(document.createTextNode(sScript));
	//
	document.getElementsByTagName("head")[0].appendChild(oScript);
};

cXBLLanguage.elements.xbl.binding.implementation	= function(oNode, cBinding) {
	var sSrc	= oNode.getAttribute("src"),
		sScript	= '';

	if (sSrc) {
		sSrc	= fResolveUri(sSrc, fGetXmlBase(oNode, cBinding.documentURI));
		sScript	= cXBLLanguage.fetch(sSrc).responseText;
	}
	else
	if (oNode.firstChild)
		sScript	= oNode.firstChild.nodeValue;

	// Create script
	if (sScript) {
		// Run implementation in the context of binding
		//oBinding.prototype	= window.Function(sScript.replace(/^\s*\(\{(.*?)\}\)\s*$/g, '$1'));	// doesn't work, why?
//		cBinding.$implementation	= window.Function(sScript.replace(/^\s*\(\s*/g, "return ").replace(/\s*\)\s*$/g, ''))();
//		cBinding.prototype	= cBinding.$implementation();

		// Fixing constructor (fix should be reconsidered)
//		var oBinding = cBinding.prototype.constructor;
//		try {
//			cBinding.prototype	= window.Function(sScript.replace(/^\s*\(\s*/g, "return ").replace(/\s*\)\s*$/g, ''))();
//		}
//		catch (oError) {
//->Debug
//			cXBLLanguage.onerror(oError.message);
//<-Debug
//		}
//		cBinding.prototype.constructor	= oBinding;
		try {
			var oImplementation	= window.Function(sScript.replace(/^\s*\(\s*/g, "return ").replace(/\s*\)\s*$/g, ''))();
			for (var sMember in oImplementation)
				cBinding.prototype[sMember]	= oImplementation[sMember];
		}
		catch (oError) {
//->Debug
			cXBLLanguage.onerror(oError.message);
//<-Debug
		}
	}
};

/*
cXBLLanguage.elements.xbl.binding.template	= function(oNode, cBinding) {

	// Get first element child
	for (var i = 0, oTemplate; i < oNode.childNodes.length; i++) {
		if (oNode.childNodes[i].nodeType == 1) {
			oTemplate	= oNode.childNodes[i];
			break;
		}
	}

	if (oTemplate) {
		// Serialize
		var sHtml	= window.XMLSerializer ? new window.XMLSerializer().serializeToString(oTemplate) : oTemplate.xml;

		// Remove all namespaces declarations as we run anyway in HTML only
		sHtml	= sHtml.replace(/\sxmlns:?\w*="([^"]+)"/gi, '');
		// Replace 'xbl:content' by 'strike'
		sHtml	= sHtml.replace(/(<\/?)[\w:]*content/gi, '$1' + "strike");
		// Replace 'xbl:inherited' by 'menu'
		sHtml	= sHtml.replace(/(<\/?)[\w:]*inherited/gi, '$1' + "menu");
		// Replace 'xbl:div' by 'div'
		sHtml	= sHtml.replace(/(<\/?)[\w:]*div/gi, '$1' + "div");

		// Expand all empty tags
	 	sHtml	= sHtml.replace(/<([\w\:]+)([^>]*)\/>/gi, '<$1$2></$1>');
		// Close certain empty tags
		sHtml	= sHtml.replace(/<(br|input|img)([^>]*)><\/[^>]*>/gi, '<$1$2 />');

		// Replace classes for limiting scope
		// class="{CLASS}"	-> class="xbl-{CLASS}-{BINDING_ID}"
		sHtml	= sHtml.replace(/\sclass="([^"]+)"/gi, ' ' + "class" + '="' + "xbl" + '-$1-' + cBinding.id + '"');
		// id="{ID}"		-> xbl:id="{ID}"
		sHtml	= sHtml.replace(/\sid="([^"]+)"/gi, ' ' + "xbl-id" + '="$1"');
		sHtml	= sHtml.replace(/\sxbl:pseudo="([^"]+)"/gi, ' ' + "xbl-pseudo" + '="$1"');

		// Create a DOM HTML node
		var aMatch		= sHtml.match(/^<([a-z0-9]+)/i),
			oFactory	= cXBLLanguage.factory,
			oTemplate	= null;

		if (aMatch) {
			switch (aMatch[1]) {
				case "td":
				case "th":
					sHtml = '<' + "tr" + '>' + sHtml + '</' + "tr" + '>';
					// No break is left intentionaly
				case "tr":
					sHtml = '<' + "tbody" + '>' + sHtml + '</' + "tbody" + '>';
					// No break is left intentionaly
				case "tbody":
				case "thead":
				case "tfoot":
					oFactory.innerHTML	= '<' + "table" + '>' + sHtml + '</' + "table" + '>';
					oTemplate	= oFactory.getElementsByTagName(aMatch[1])[0];
					break;

				case "option":
					oFactory.innerHTML	= '<' + "select" + '>' + sHtml + '</' + "select" + '>';
					oTemplate	= oFactory.firstChild.firstChild;
					break;

				default:
					oFactory.innerHTML	= '&nbsp;' + sHtml;
					oTemplate	= oFactory.childNodes[1];
					break;
			}
		}

		// Correct classes
//		alert("Before: " + (window.XMLSerializer ? new window.XMLSerializer().serializeToString(oTemplate) : oTemplate.outerHTML));
		cXBLLanguage.correct(cBinding, oTemplate, (oNode.getAttributeNS ? oNode.getAttributeNS("http://www.w3.org/XML/1998/namespace", "space") : oNode.getAttribute("xml" + ':' + "space")) == "preserve");
//		alert("After: " + (window.XMLSerializer ? new window.XMLSerializer().serializeToString(oTemplate) : oTemplate.outerHTML));

		// Set template
		cBinding.template	= oTemplate.parentNode.removeChild(oTemplate);
	}
};
*/
cXBLLanguage.elements.xbl.binding.template	= function(oNode, cBinding) {

	// figure out what kind of children is there
	for (var oNext = oNode.firstChild, sName = ''; oNext; oNext = oNext.nextSibling)
		if (oNext.nodeType == 1 && oNext.namespaceURI != cXBLLanguage.namespaceURI)
			sName	=(oNext.localName || oNext.baseName).toLowerCase();

	// Serialize
	var sHtml	= window.XMLSerializer ? new window.XMLSerializer().serializeToString(oNode) : oNode.xml;

	// Cut out xbl:template open/close tag
	sHtml	= sHtml.replace(/^<[\w:]*template[^>]*>\s*/i, '').replace(/\s*<\/[\w:]*template>$/i, '');

	// Remove all namespaces declarations as we run anyway in HTML only
	// Commented out due to bug 11
//	sHtml	= sHtml.replace(/\sxmlns:?\w*="([^"]+)"/gi, '');
	// Replace '{PREFIX}:content' by 'strike'
	sHtml	= sHtml.replace(/(<\/?)[\w:-]*content/gi, '$1' + "strike");
	// Replace '{PREFIX}:inherited' by 'menu'
	sHtml	= sHtml.replace(/(<\/?)[\w:-]*inherited/gi, '$1' + "menu");
	// Replace '{PREFIX}:div' by 'div'
	sHtml	= sHtml.replace(/(<\/?)[\w:-]*div/gi, '$1' + "div");

	// Expand all empty tags
 	sHtml	= sHtml.replace(/<([\w:-]+)([^>]*)\/>/gi, '<$1$2></$1>');
	// Close certain empty tags
	sHtml	= sHtml.replace(/<(br|input|img)([^>]*)><\/[^>]*>/gi, '<$1$2 />');

	// Replace classes for limiting scope
	// class="{CLASS}"	-> class="xbl-{CLASS}-{BINDING_ID}"
	sHtml	= sHtml.replace(/\sclass="([^"]+)"/gi, ' ' + "class" + '="' + "xbl" + '-$1-' + cBinding.id + '"');
	// id="{ID}"		-> xbl-id="{ID}"
	sHtml	= sHtml.replace(/\sid="([^"]+)"/gi, ' ' + "xbl-id" + '="$1"');
	// {PREFIX}:attr="{VALUE}" -> xbl-attr="{VALUE}"
	sHtml	= sHtml.replace(/\s[\w-]+:attr="([^"]+)"/gi, ' ' + "xbl-attr" + '="$1"');
	// {PREFIX}:pseudo="{VALUE}" -> xbl-pseudo="{VALUE}"
	sHtml	= sHtml.replace(/\s[\w-]+:pseudo="([^"]+)"/gi, ' ' + "xbl-pseudo" + '="$1"');

	// Create a DOM HTML node
	var oFactory	= cXBLLanguage.factory,
		oTemplate	= null;


	// sName keeps the element name used as direct child of template
	switch (sName) {
		case "td":
		case "th":
			sHtml = '<' + "tr" + '>' + sHtml + '</' + "tr" + '>';
			// No break is left intentionaly
		case "tr":
			sHtml = '<' + "tbody" + '>' + sHtml + '</' + "tbody" + '>';
			// No break is left intentionaly
		case "tbody":
		case "thead":
		case "tfoot":
			oFactory.innerHTML	= '<' + "table" + '>' + sHtml + '</' + "table" + '>';
			oTemplate	= oFactory.getElementsByTagName(sName)[0].parentNode;
			break;

		case "option":
			oFactory.innerHTML	= '<' + "select" + '>' + sHtml + '</' + "select" + '>';
			oTemplate	= oFactory.firstChild;
			break;

		default:
			oFactory.innerHTML	= "#text" + '<div>' + sHtml + '</div>';
			oTemplate	= oFactory.childNodes[1];
			break;
	}

	// Correct classes
//	alert("Before: " + (window.XMLSerializer ? new window.XMLSerializer().serializeToString(oTemplate) : oTemplate.outerHTML));
	cXBLLanguage.correct(cBinding, oTemplate, (oNode.getAttributeNS ? oNode.getAttributeNS("http://www.w3.org/XML/1998/namespace", "space") : oNode.getAttribute("xml" + ':' + "space")) == "preserve");
//	alert("After: " + (window.XMLSerializer ? new window.XMLSerializer().serializeToString(oTemplate) : oTemplate.outerHTML));

	// Set template
	cBinding.template	= oTemplate.parentNode.removeChild(oTemplate);
};

cXBLLanguage.elements.xbl.binding.handlers	= function(oNode, cBinding) {
	// Process chlidren
	cXBLLanguage.elements(oNode, arguments.callee, cBinding);
};

/*
var oXBLLanguagePhase	= {};
oXBLLanguagePhase["capture"]		= cEvent.CAPTURING_PHASE;
oXBLLanguagePhase["target"]			= cEvent.AT_TARGET;
oXBLLanguagePhase["default-action"]	= 0x78626C44;
*/

cXBLLanguage.elements.xbl.binding.handlers.handler	= function(oNode, cBinding) {
	var sName	= oNode.getAttribute("event"),
		fHandler;
	if (sName) {
		if (oNode.firstChild) {
			// Create object for handlers
			if (!cBinding.$handlers)
				cBinding.$handlers	= {};

			// Create object for handlers of specified type
			if (!cBinding.$handlers[sName])
				cBinding.$handlers[sName]	= [];

			try {
				fHandler	= new window.Function("event", oNode.firstChild.nodeValue);
			}
			catch (oError) {
//->Debug
				cXBLLanguage.onerror(oError.message);
//<-Debug
			}

			if (fHandler) {
				cBinding.$handlers[sName].push(fHandler);

				// Get attributes
				var sValue;
				// Event
				if (sValue = oNode.getAttribute("phase"))
					fHandler["phase"]			= sValue == "capture" ? 1 : sValue == "target" ? 2 /* : sValue == "default-action" ? 0x78626C44*/ : 3;
				if (sValue = oNode.getAttribute("trusted"))
					fHandler["trusted"]			= sValue == "true";
				if (sValue = oNode.getAttribute("propagate"))
					fHandler["propagate"]		= sValue != "stop";
				if (sValue = oNode.getAttribute("default-action"))
					fHandler["default-action"]	= sValue != "cancel";
				// MouseEvent
				if (sValue = oNode.getAttribute("button"))
					fHandler["button"]			= sValue * 1;
				if (sValue = oNode.getAttribute("click-count"))
					fHandler["click-count"]		= sValue * 1;
				// KeyboardEvent
				if (sValue = oNode.getAttribute("modifiers"))
					fHandler["modifiers"]		= sValue;
				if (sValue = oNode.getAttribute("key"))
					fHandler["key"]				= sValue;
				if (sValue = oNode.getAttribute("key-location"))
					fHandler["key-location"]	= sValue;
				// TextInput
				if (sValue = oNode.getAttribute("text"))
					fHandler["text"]			= sValue;
				// MutationEvent
				if (sValue = oNode.getAttribute("prev-value"))
					fHandler["prev-value"]		= sValue;
				if (sValue = oNode.getAttribute("new-value"))
					fHandler["new-value"]		= sValue;
				if (sValue = oNode.getAttribute("attr-name"))
					fHandler["attr-name"]		= sValue;
				if (sValue = oNode.getAttribute("attr-change"))
					fHandler["attr-change"]		= sValue;
			}
		}
	}
//->Debug
	else
		cXBLLanguage.onerror("Missing 'event' attribute in " + oNode.nodeName);
//<-Debug
};

cXBLLanguage.elements.xbl.binding.resources	= function(oNode, cBinding) {
	// Process chlidren
	cXBLLanguage.elements(oNode, arguments.callee, cBinding);
};

cXBLLanguage.elements.xbl.binding.resources.style	= function(oNode, cBinding) {
	// Get the document
	var sSrc	= oNode.getAttribute("src"),
		sMedia	= oNode.getAttribute("media"),
		sBase	= fGetXmlBase(oNode, cBinding.documentURI),
		sStyle,
		oStyle,
		aCss;

	// 1. Get stylesheet
	if (sSrc) {
		sSrc	= fResolveUri(sSrc, sBase);
		sStyle	= cXBLLanguage.fetch(sSrc).responseText;
	}
	else
	if (oNode.firstChild) {
		sSrc	= sBase;
		sStyle	= oNode.firstChild.nodeValue;
	}

	// Create stylesheet
	if (sStyle) {
		var sSelectorBoundElement	= ':' + "bound-element";
		// 2. Setup local context for CSS rules
		// 	.{class}	-> .xbl-{class}-{binding}
		sStyle	= sStyle.replace(/\B\.((?:[-\w\[\]()+="]+:?)+)([\s{+~>,])/g, '.' + "xbl" + '-$1-' + cBinding.id + '$2');
		//	#{id}		-> .xbl-id-{id}-{binding}
		sStyle	= sStyle.replace(/#([\w-]+)([\s{+~>])/g, '.' + "xbl-id" + '-$1-' + cBinding.id + '$2');
		//	::{pseudo}	-> .xbl-pseudo-{pseudo}-{binding}
		sStyle	= sStyle.replace(/::([\w-]+)([\s{+~>])/g, '.' + "xbl-pseudo" + '-$1-' + cBinding.id + '$2');
		// Shift context "selector {" -> ":bound-element selector {"
		sStyle	= sStyle.replace(/\s*([^,{\n]+(?:,|{[^}]+}))/g, sSelectorBoundElement + ' ' + '$1\n');
		// correct result from previous step
		sStyle	= sStyle.replace(new window.RegExp(sSelectorBoundElement + ' ' + sSelectorBoundElement, 'g'), sSelectorBoundElement);
		//	:bound-element	-> .xbl-bound-element-{binding}
		sStyle	= sStyle.replace(/:bound-element([\s{+~>.:\[])/g, '.' + "xbl" + '-' + "bound-element" + '-' + cBinding.id + '$1');

		// 3. Resolve relative uris
		if (aCss = sStyle.match(/url\s*\([^\)]+\)/g)) {
			for (var i = 0, j = aCss.length, aUrl; i < j; i++) {
				aUrl	= aCss[i].match(/(url\s*\(['"]?)([^\)'"]+)(['"]?\))/);
				sStyle	= sStyle.replace(aUrl[0], aUrl[1] + fResolveUri(aUrl[2], sSrc) + aUrl[3]);
			}
		}

		// 4. Create stylesheet in the document
		if (document.namespaces) {
			cXBLLanguage.factory.innerHTML	= '&nbsp;' + '<' + "style" + ' ' + "type" + '="' + "text/css" + '"' + (sMedia ? ' ' + "media" + '="' + sMedia + '"' : '') + '>' + sStyle + '</' + "style" + '>';
			oStyle	= cXBLLanguage.factory.childNodes[1];
		}
		else {
			oStyle	= document.createElement("style");
			oStyle.setAttribute("type", "text/css");
			if (sMedia)
				oStyle.setAttribute("media", sMedia);
			oStyle.appendChild(document.createTextNode(sStyle));
		}
		document.getElementsByTagName("head")[0].appendChild(oStyle);
	}
};

cXBLLanguage.elements.xbl.binding.resources.prefetch	= function(oNode, cBinding) {
	var sSrc	= oNode.getAttribute("src");
	if (sSrc) {
		sSrc	= fResolveUri(sSrc, fGetXmlBase(oNode, cBinding.documentURI));
		cXBLLanguage.fetch(sSrc);
	}
//->Debug
	else
		cXBLLanguage.onerror("Required attribute 'src' is missing in " + oNode.nodeName);
//<-Debug
};

//window.XBLProcessor	= cXBLLanguage;
function fNumberToHex(nValue, nLength) {
	var sValue	= window.Number(nValue).toString(16);
	if (sValue.length < nLength)
		sValue	= window.Array(nLength + 1 - sValue.length).join('0') + sValue;
	return sValue;
};

// Event-related
function fEventTarget(oElement) {
	for (var oNode = oElement; oNode; oNode = oNode.parentNode)
		if (oNode.xblChild || (oNode.xblImplementations && oNode.xblImplementations instanceof cXBLImplementationsList))
			return oNode;
	return oElement;
};

function fMouseEventButton(nButton) {
	if (!document.namespaces)
		return nButton;
	if (nButton == 4)
		return 1;
	if (nButton == 2)
		return 2;
	return 0;
};

function fKeyboardEventIdentifier(oEvent) {
	return oKeyIdentifiers[oEvent.keyCode] || ('U+' + fNumberToHex(oEvent.keyCode, 4)).toUpperCase();
};

function fKeyboardEventModifiersList(oEvent) {
	var aModifiersList = [];
	if (oEvent.altKey)
		aModifiersList[aModifiersList.length] = "Alt";
	if (oEvent.ctrlKey)
		aModifiersList[aModifiersList.length] = "Control";
	if (oEvent.metaKey)
		aModifiersList[aModifiersList.length] = "Meta";
	if (oEvent.shiftKey)
		aModifiersList[aModifiersList.length] = "Shift";
	return aModifiersList.join(' ');
};

var oKeyIdentifiers	= {
	8:		'U+0008',	// The Backspace (Back) key
	9:		'U+0009',	// The Horizontal Tabulation (Tab) key

	13:		'Enter',

	16:		"Shift",
	17:		"Control",
	18:		"Alt",

	20:		'CapsLock',

	27:		'U+001B',	// The Escape (Esc) key

	33:		'PageUp',
	34:		'PageDown',
	35:		'End',
	36:		'Home',
	37:		'Left',
	38:		'Up',
	39:		'Right',
	40: 	'Down',

	45:		'Insert',
	46:		'U+002E',	// The Full Stop (period, dot, decimal point) key (.)

	91:		'Win',

	112:	'F1',
	113:	'F2',
	114:	'F3',
	115:	'F4',
	116:	'F5',
	117:	'F6',
	118:	'F7',
	119:	'F8',
	120:	'F9',
	121:	'F10',
	122:	'F11',
	123:	'F12'/*,
	144:	'NumLock'*/
};

function fRegisterEventRouter(oBinding, sName) {
	// Forward events that are not implemented by browsers
	if (sName == "textInput")
		sName	= "keypress";
	else
	if (sName == "mousewheel") {
		// Gecko only
		if (window.controllers)
			sName	= "DOMMouseScroll";
	}
	// Pickup events that do not directly lead to required event generation
	else
	if (sName == "mouseenter") {
		// All but IE
		if (!document.namespaces)
			sName	= "mouseover";
	}
	else
	if (sName == "mouseleave") {
		// All but IE
		if (!document.namespaces)
			sName	= "mouseout";
	}
	else
	if (sName == "click") {
		// Additional handlers needed to catch atavistic events
		fRegisterEventRouter(oBinding, "contextmenu");
		fRegisterEventRouter(oBinding, "dblclick");
	}
	else
	if (sName == "DOMFocusIn")
		sName	= "focus";
	else
	if (sName == "DOMFocusOut")
		sName	= "blur";
	else
	if (sName == "DOMActivate")
		sName	= "click";

	// Return if this type of event router was already registered
	if (oBinding.$handlers[sName])
		return;

	var oElement	= oBinding.boundElement,
		fHandler	= function(oEvent) {
			return fRouteEvent(sName, oEvent, oBinding);
		};

	// Register closure
	oBinding.$handlers[sName]	= fHandler;

	// MutationEvents
	if (sName == "DOMAttrModified") {
		// IE (does not know them at all) && WebKit (does not dispatch it because of some reason, tested in 3.1)
		if (document.namespaces || window.navigator.userAgent.match(/applewebkit/i)) {
			var sPrefix	= '$' + "xbl" + '-', sOldValue, oEventXBL;
			// Take over native methods
			oElement[sPrefix + "setAttribute"]	= oElement.setAttribute;
			oElement.setAttribute	= function(sName, sValue) {
				sOldValue	= this.getAttribute(sName);
				// if the old value is not equal to the new one
				if (sOldValue != sValue) {
					// Execute native implementation
					this[sPrefix + "setAttribute"](sName, sValue);
					// Pseudo-dispatch event
					oEventXBL	= new cMutationEvent;
					oEventXBL.initMutationEvent(sName, true, false, this, sOldValue, sValue, sName, sOldValue ? cMutationEvent.MODIFICATION : cMutationEvent.ADDITION);
					fHandler(oEventXBL);
				}
			};
			oElement[sPrefix + "removeAttribute"]	= oElement.removeAttribute;
			oElement.removeAttribute	= function(sName) {
				sOldValue	= this.getAttribute(sName);
				// if the old value was actually specified
				if (sOldValue) {
					// Execute native implementation
					this[sPrefix + "removeAttribute"](sName);
					// Pseudo-dispatch event
					oEventXBL	= new cMutationEvent;
					oEventXBL.initMutationEvent(sName, true, false, this, sOldValue, null, sName, cMutationEvent.REMOVAL);
					fHandler(oEventXBL);
				}
			};
			return;
		}
	}

	// Add event listener
	if (oElement.attachEvent)
		oElement.attachEvent("on" + sName, fHandler);
	else
		oElement.addEventListener(sName, fHandler, false);
};

function fUnRegisterEventRouter(oBinding, sName) {
	// Return if the router was not registered
	if (!oBinding.$handlers[sName])
		return;

	var oElement	= oBinding.boundElement,
		fHandler	= oBinding.$handlers[sName];

	// Remove event listener
	if (oElement.detachEvent)
		oElement.detachEvent("on" + sName, fHandler);
	else
		oElement.removeEventListener(sName, fHandler, false);

	// Unregister closure
	delete oBinding.$handlers[sName];
};

function fRouteEvent(sType, oEvent, oBinding) {
	var oElement	= fEventTarget(oEvent.srcElement || oEvent.target),
		nClick		= 0,
		oEventXBL	= null,
		oRelated	= null;

	// 1: Create XBLEvent (Only list standard events)
	switch (sType) {
		case "contextmenu":	// mutate to "click"
			sType	= "click";
			// No break left intentionally
		case "mouseover":
		case "mouseout":
			// Verify if event is not in shadow content
			oRelated	= oEvent.relatedTarget || (sType == "mouseover" ? oEvent.fromElement : sType == "mouseout" ? oEvent.toElement : null);
			if (oRelated && fEventTarget(oRelated) == oElement)
				return;
			// No break left intentionally
		case "mousemove":
		case "mousedown":
		case "mouseup":
		case "dblclick":
		case "click":
			oEventXBL	= new cMouseEvent;
			oEventXBL.initMouseEvent(sType, true, true, window, sType == "dblclick" ? 2 : oEvent.detail || 1, oEvent.screenX, oEvent.screenY, oEvent.clientX, oEvent.clientY, oEvent.ctrlKey, oEvent.altKey, oEvent.shiftKey, oEvent.metaKey || false, oEvent.type == "contextmenu" ? 2 : fMouseEventButton(oEvent.button), oRelated);
			break;

		case "mouseenter":
		case "mouseleave":
			// TODO: Implement missing mouseenter/mouseleave events dispatching
			// Verify if event is not in shadow content
			oRelated	= oEvent.relatedTarget || (sType == "mouseover" ? oEvent.fromElement : sType == "mouseout" ? oEvent.toElement : null);
			if (oRelated && fEventTarget(oRelated) == oElement)
				return;
			oEventXBL	= new cMouseEvent;
			oEventXBL.initMouseEvent(sType, false, false, window, oEvent.detail || 1, oEvent.screenX, oEvent.screenY, oEvent.clientX, oEvent.clientY, oEvent.ctrlKey, oEvent.altKey, oEvent.shiftKey, oEvent.metaKey || false, fMouseEventButton(oEvent.button), oEvent.relatedTarget);
			break;

		case "keydown":
		case "keyup":
			oEventXBL	= new cKeyboardEvent;
			oEventXBL.initKeyboardEvent(sType, true, true, window, fKeyboardEventIdentifier(oEvent), null, fKeyboardEventModifiersList(oEvent));
			break;

		case "keypress":	// Mutated to textInput
			// Filter out non-alphanumerical keypress events
			if (oEvent.ctrlKey || oEvent.altKey || oEvent.keyCode in oKeyIdentifiers)
				return;
			sType	= "textInput";
			// No break left intentionally
		case "textInput":
			oEventXBL	= new cTextEvent;
			oEventXBL.initTextEvent(sType, true, true, window, window.String.fromCharCode(oEvent.charCode || oEvent.keyCode));
			break;

		case "focus":
		case "blur":
			oEventXBL	= new cUIEvent;
			oEventXBL.initUIEvent(sType, false, false, window, null);
			break;

		case "DOMActivate":
			oEventXBL	= new cUIEvent;
			oEventXBL.initUIEvent(sType, true, true, window, null);
			break;

		case "DOMFocusIn":
		case "DOMFocusOut":
		case "scroll":
		case "resize":
			oEventXBL	= new cUIEvent;
			oEventXBL.initUIEvent(sType, true, false, window, null);
			break;

		case "DOMMouseScroll":
			sType	= "mousewheel";
			// No break left intentionally
		case "mousewheel":
			oEventXBL	= new cMouseWheelEvent;
			oEventXBL.initMouseWheelEvent(sType, true, true, window, null, oEvent.screenX, oEvent.screenY, oEvent.clientX, oEvent.clientY, fMouseEventButton(oEvent.button), null, fKeyboardEventModifiersList(oEvent), oEvent.srcElement ? -1 * oEvent.wheelDelta : oEvent.detail * 40);
			break;

		case "load":
		case "unload":
			oEventXBL	= new cEvent;
			oEventXBL.initEvent(sType, false, false);
			break;

		case "submit":
		case "reset":
			oEventXBL	= new cEvent;
			oEventXBL.initEvent(sType, true, true);
			break;

		case "abort":
		case "error":
		case "change":
		case "select":
			oEventXBL	= new cEvent;
			oEventXBL.initEvent(sType, true, false);
			break;

		case "DOMSubtreeModified":
		case "DOMNodeInserted":
		case "DOMNodeRemoved":
		case "DOMNodeRemovedFromDocument":
		case "DOMNodeInsertedIntoDocument":
		case "DOMCharacterDataModified":
		case "DOMElementNameChanged":
		case "DOMAttributeNameChanged":
			// Do not propagate whose changes
			return;

		case "DOMAttrModified":
			if (oEvent.currentTarget != oEvent.target)
				return;
			oEventXBL	= new cMutationEvent;
			oEventXBL.initMutationEvent(sType, true, false, oEvent.relatedNode, oEvent.prevValue, oEvent.newValue, oEvent.attrName, oEvent.attrChange);
			break;

		default:
			oEventXBL	= new cCustomEvent;
			oEventXBL.initCustomEventNS(oEvent.namespaceURI || null, sType, !!oEvent.bubbles, !!oEvent.cancelable, oEvent.detail);
	}

	// Set event to be trusted
	oEventXBL.trusted		= true;

	// 2. Pseudo-dispatch - set targets / phasing
	oEventXBL.target		= oElement;
	oEventXBL.currentTarget	= oBinding.boundElement;
	oEventXBL.eventPhase	= oEvent.target == oEvent.currentTarget ? cEvent.AT_TARGET : cEvent.BUBBLING_PHASE;

	// 3: Process event handler
	var aHandlers	= oBinding.constructor.$handlers ? oBinding.constructor.$handlers[oEventXBL.type] : null;
	if (aHandlers) {
		for (var i = 0, j = aHandlers.length, fHandler; i < j; i++) {
			fHandler = aHandlers[i];
			// 1: Apply Filters
			// Common Filters
			if ("trusted" in fHandler && fHandler["trusted"] != oEventXBL.trusted)
				continue;
			if ("phase" in fHandler)
				if (fHandler["phase"] != oEventXBL.eventPhase)
					continue;

			// Mouse Event + Key Event
			if (oEventXBL instanceof cMouseEvent || oEventXBL instanceof cKeyboardEvent) {
				// Modifier Filters
				if ("modifiers" in fHandler) {
					var sModifiersList	= fHandler["modifiers"];
					if (sModifiersList == "none") {
						if (oEventXBL.ctrlKey || oEventXBL.altKey || oEventXBL.shiftKey || oEventXBL.metaKey)
							continue;
					}
					else
					if (sModifiersList == "any") {
						if (!(oEventXBL.ctrlKey || oEventXBL.altKey || oEventXBL.shiftKey || oEventXBL.metaKey))
							continue;
					}
					else {
						for (var nModifier = 0, aModifier, bPass = true, aModifiersList = sModifiersList.split(' '); nModifier < aModifiersList.length; nModifier++) {
							if (aModifier = aModifiersList[nModifier].match(/([+-]?)(\w+)(\??)/))
								if (oEventXBL.getModifierState(aModifier[2]) == (aModifier[1] == '-'))
									bPass	= false;
						}
						if (!bPass)
							continue;
					}
				}

				// Mouse Event Handler Filters
				if (oEventXBL instanceof cMouseEvent) {
					if ("click-count" in fHandler && fHandler["click-count"] != oEventXBL.detail)
						continue;
					if ("button" in fHandler && fHandler["button"] != oEventXBL.button)
						continue;
				}
				else
				// Key Event Handler Filters
				if (oEventXBL instanceof cKeyboardEvent) {
					if ("key" in fHandler && fHandler["key"] != oEventXBL.keyIdentifier)
						continue;
//					if ("key-location" in fHandler && fHandler["key-location"] != oEventXBL.keyLocation)
//						continue;
				}
			}
			else
			// Text Input Event Handler Filters
			if (oEventXBL instanceof cTextEvent) {
				if ("text" in fHandler && fHandler["text"] != oEventXBL.data)
					continue;
			}
			else
			// Mutation Event Handler Filters
			if (oEventXBL instanceof cMutationEvent) {
				if (oEventXBL.type == "DOMAttrModified") {
					if ("attr-name" in fHandler && fHandler["attr-name"] != oEvent.attrName)
						continue;
					if ("attr-change" in fHandler && cMutationEvent[fHandler["attr-change"].toUpperCase()] != oEvent.attrChange)
						continue;
					if ("prev-value" in fHandler && fHandler["prev-value"] != oEvent.prevValue)
						continue;
					if ("new-value" in fHandler && fHandler["new-value"] != oEvent.newValue)
						continue;
				}
			}

			// 2: Apply Actions
			if ("default-action" in fHandler)
				if (!fHandler["default-action"])
					oEventXBL.preventDefault();

			if ("propagate" in fHandler)
				if (!fHandler["propagate"])
					oEventXBL.stopPropagation();

			// 3: Execute handler
			fHandler.call(oBinding, oEventXBL);

			// 4: Exit if propagation stopped
			if (oEventXBL.$stoppedImmediate)
				break;
		}
	}

	// 4: Dispatch derived event
	switch (sType) {
		case "focus":
		case "blur":
			if (!fRouteEvent(sType == "focus" ? "DOMFocusIn" : "DOMFocusOut", oEvent, oBinding))
				oEventXBL.preventDefault();
			break;

		case "mouseover":
		case "mouseout":
			// TODO
			if (oEvent.relatedTarget && oEvent.currentTarget == oEvent.target)
				if (oEvent.target.parentNode == oEvent.relatedTarget || oEvent.target.parentNode == oEvent.relatedTarget.parentNode)
					fRouteEvent(sType == "mouseover" ? "mouseenter" : "mouseleave", oEvent, oBinding);
			break;

		case "click":
			if (oEventXBL.button == 0) {
				var sTagName	= oEventXBL.target.tagName.toLowerCase();
				if (sTagName == "button" || sTagName == 'a')
					if (!fRouteEvent("DOMActivate", oEvent, oBinding))
						oEventXBL.preventDefault();
			}
			break;
	}

	// 4: Apply changes to browser event flow
	// 4.1: Stop propagation if neccesary
	if (oEventXBL.$stopped) {
		if (oEvent.stopPropagation)
			oEvent.stopPropagation();
		else
			oEvent.cancelBubble	= true;
	}

	// 4.2: Prevent default if neccesary
	if (oEventXBL.defaultPrevented) {
		if (oEvent.preventDefault)
			oEvent.preventDefault();
		return false;
	}
	return true;
};
// TODO: Implement caching
function fGetUriComponents(sUri) {
	var aResult = sUri.match(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/),
		oResult	= {};

	oResult._scheme		= aResult[2];	// scheme
	oResult._authority	= aResult[4];	// authority
	oResult._path		= aResult[5];	// path
	oResult._query		= aResult[7];	// query
	oResult._fragment	= aResult[9];	// fragment

	return oResult;
};

/*
 * Resolves Uri to a BaseUri
 */
function fResolveUri(sUri, sBaseUri) {
	if (sUri == '' || sUri.charAt(0) == '#')
		return sBaseUri;

	var oUri = fGetUriComponents(sUri);
	if (oUri._scheme)
		return sUri;

	var oBaseUri = fGetUriComponents(sBaseUri);
	oUri._scheme = oBaseUri._scheme;

	if (!oUri._authority)
	{
		oUri._authority = oBaseUri._authority;
		if (oUri._path.charAt(0) != '/')
		{
			var aUriSegments = oUri._path.split('/'),
				aBaseUriSegments = oBaseUri._path.split('/');
			aBaseUriSegments.pop();
			var nBaseUriStart = aBaseUriSegments[0] == '' ? 1 : 0;
			for (var i = 0, nLength = aUriSegments.length; i < nLength; i++)
			{
				if (aUriSegments[i] == '..')
				{
					if (aBaseUriSegments.length > nBaseUriStart)
						aBaseUriSegments.pop();
					else
					{
						aBaseUriSegments.push(aUriSegments[i]);
						nBaseUriStart++;
					}
				}
				else
				if (aUriSegments[i] != '.')
					aBaseUriSegments.push(aUriSegments[i]);
			}
			if (aUriSegments[--i] == '..' || aUriSegments[i] == '.')
				aBaseUriSegments.push('');
			oUri._path = aBaseUriSegments.join('/');
		}
	}

	var aResult = [];
	if (oUri._scheme)
		aResult.push(oUri._scheme + ':');
	if (oUri._authority)
		aResult.push('/' + '/' + oUri._authority);
	if (oUri._path)
		aResult.push(oUri._path);
	if (oUri._query)
		aResult.push('?' + oUri._query);
	if (oUri._fragment)
		aResult.push('#' + oUri._fragment);

	return aResult.join('');
};

/*
 * Checks if the sUri and sBaseUri are coming from the same domain
 */
function fUrisInSameDomain(sUri, sBaseUri) {
	var oUri = fGetUriComponents(sUri),
		oBaseUri = fGetUriComponents(sBaseUri);
	return !oUri._scheme || !oBaseUri._scheme ||(oUri._authority == oBaseUri._authority && oUri._scheme == oBaseUri._scheme);
};

/*
 * Resolves baseUri property for a DOMNode
 */
function fGetXmlBase(oNode, sDocumentUri) {
	if (oNode.nodeType == 9)
		return sDocumentUri;

	if (oNode.nodeType == 1) {
		var sXmlBase	= oNode.getAttribute("xml" + ':' + "base");
		if (!sXmlBase && oNode.getAttributeNS)	// Opera, Safari but not FF
			sXmlBase	= oNode.getAttributeNS("http://www.w3.org/XML/1998/namespace", "base");

		if (sXmlBase)
			return fResolveUri(sXmlBase, fGetXmlBase(oNode.parentNode, sDocumentUri));
	}
	return fGetXmlBase(oNode.parentNode, sDocumentUri);
};
var cEvent	= new window.Function;

// Constants
cEvent.CAPTURING_PHASE	= 1;
cEvent.AT_TARGET		= 2;
cEvent.BUBBLING_PHASE	= 3;

// Public Properties
cEvent.prototype.namespaceURI	= null;
cEvent.prototype.bubbles		= null;
cEvent.prototype.cancelable		= null;
cEvent.prototype.currentTarget	= null;
cEvent.prototype.eventPhase		= null;
cEvent.prototype.target			= null;
cEvent.prototype.timeStamp		= null;
cEvent.prototype.type			= null;
cEvent.prototype.defaultPrevented	= false;

// Private Properties
cEvent.prototype.$stopped			= false;
cEvent.prototype.$stoppedImmediate	= false;

// Public Methods
cEvent.prototype.initEvent		= function(sType, bCanBubble, bCancelable) {
    this.type       = sType;
    this.bubbles    = bCanBubble;
    this.cancelable = bCancelable;
};

cEvent.prototype.initEventNS		= function(sNameSpaceURI, sType, bCanBubble, bCancelable) {
	this.initEvent(sType, bCanBubble, bCancelable);

	//

    this.namespaceURI	= sNameSpaceURI;
};

cEvent.prototype.stopPropagation	= function() {
	this.$stopped	= this.bubbles;
};

cEvent.prototype.stopImmediatePropagation	= function() {
	this.$stoppedImmediate	= this.$stopped	= this.bubbles;
};

cEvent.prototype.preventDefault	= function() {
	this.defaultPrevented	= this.cancelable;
};
var cUIEvent	= new window.Function;
cUIEvent.prototype	= new cEvent;

// Public Properties
cUIEvent.prototype.view		= null;
cUIEvent.prototype.detail	= null;

// Public Methods
cUIEvent.prototype.initUIEvent	= function(sType, bCanBubble, bCancelable, oView, nDetail) {
	this.initEvent(sType, bCanBubble, bCancelable);

	//
	this.view	= oView;
	this.detail	= nDetail;
};

cUIEvent.prototype.initUIEventNS	= function(sNameSpaceURI, sType, bCanBubble, bCancelable, oView, nDetail) {
	this.initUIEvent(sType, bCanBubble, bCancelable, oView, nDetail);

	//
	this.namespaceURI	= sNameSpaceURI;
};
var cMouseEvent	= new window.Function;
cMouseEvent.prototype	= new cUIEvent;

// Public Properties
cMouseEvent.prototype.screenX = null;
cMouseEvent.prototype.screenY = null;
cMouseEvent.prototype.clientX = null;
cMouseEvent.prototype.clientY = null;
cMouseEvent.prototype.ctrlKey = null;
cMouseEvent.prototype.altKey  = null;
cMouseEvent.prototype.shiftKey= null;
cMouseEvent.prototype.metaKey = null;
cMouseEvent.prototype.button  = null;
cMouseEvent.prototype.relatedTarget = null;

// Public Methods
cMouseEvent.prototype.initMouseEvent	= function(sType, bCanBubble, bCancelable, oView, nDetail, nScreenX, nScreenY, nClientX, nClientY, bCtrlKey, bAltKey, bShiftKey, bMetaKey, nButton, oRelatedTarget) {
	this.initUIEvent(sType, bCanBubble, bCancelable, oView, nDetail);

	//
	this.screenX  = nScreenX;
	this.screenY  = nScreenY;
	this.clientX  = nClientX;
	this.clientY  = nClientY;
	this.ctrlKey  = bCtrlKey;
	this.altKey   = bAltKey;
	this.shiftKey = bShiftKey;
	this.metaKey  = bMetaKey;
	this.button   = nButton;
	this.relatedTarget = oRelatedTarget;
};

cMouseEvent.prototype.initMouseEventNS	= function(sNameSpaceURI, sType, bCanBubble, bCancelable, oView, nDetail, nScreenX, nScreenY, nClientX, nClientY, bCtrlKey, bAltKey, bShiftKey, bMetaKey, nButton, oRelatedTarget) {
	this.initMouseEvent(sType, bCanBubble, bCancelable, oView, nDetail, nScreenX, nScreenY, nClientX, nClientY, bCtrlKey, bAltKey, bShiftKey, bMetaKey, nButton, oRelatedTarget);

	//
	this.namespaceURI	= sNameSpaceURI;
};

cMouseEvent.prototype.getModifierState = function(sModifier) {
	switch (sModifier) {
		case "Alt":		return this.altKey;
		case "Control":	return this.ctrlKey;
		case "Meta":	return this.metaKey;
		case "Shift":	return this.shiftKey;
	}
	return false;
};
var cMouseWheelEvent	= new window.Function;
cMouseWheelEvent.prototype	= new cMouseEvent;

// Public Properties
cMouseWheelEvent.prototype.wheelDelta	= null;

// Public Methods
cMouseWheelEvent.prototype.initMouseWheelEvent	= function(sType, bCanBubble, bCancelable, oView, nDetail, nScreenX, nScreenY, nClientX, nClientY/*, bCtrlKey, bAltKey, bShiftKey, bMetaKey*/, nButton, oRelatedTarget, sModifiersList, nWheelDelta) {
	this.initMouseEvent(sType, bCanBubble, bCancelable, oView, nDetail, nScreenX, nScreenY, nClientX, nClientY, sModifiersList.indexOf("Control") >-1, sModifiersList.indexOf("Alt") >-1, sModifiersList.indexOf("Shift") >-1, sModifiersList.indexOf("Meta") >-1, nButton, oRelatedTarget);

	//
	this.wheelDelta	= nWheelDelta;
};

cMouseWheelEvent.prototype.initMouseWheelEventNS	= function(sNameSpaceURI, sType, bCanBubble, bCancelable, oView, nDetail, nScreenX, nScreenY, nClientX, nClientY/*, bCtrlKey, bAltKey, bShiftKey, bMetaKey*/, nButton, oRelatedTarget, sModifiersList, nWheelDelta) {
	this.initMouseWheelEvent(sType, bCanBubble, bCancelable, oView, nDetail, nScreenX, nScreenY, nClientX, nClientY/*, bCtrlKey, bAltKey, bShiftKey, bMetaKey*/, nButton, oRelatedTarget, sModifiersList, nWheelDelta);

	//
	this.namespaceURI	= sNameSpaceURI;
};
var cKeyboardEvent	= new window.Function;
cKeyboardEvent.prototype	= new cUIEvent;

// Constants
cKeyboardEvent.DOM_KEY_LOCATION_STANDARD = 0;
cKeyboardEvent.DOM_KEY_LOCATION_LEFT     = 1;
cKeyboardEvent.DOM_KEY_LOCATION_RIGHT    = 2;
cKeyboardEvent.DOM_KEY_LOCATION_NUMPAD   = 3;

// Public Properties
cKeyboardEvent.prototype.keyIdentifier = null;
cKeyboardEvent.prototype.keyLocation   = null;
cKeyboardEvent.prototype.altKey   = null;
cKeyboardEvent.prototype.ctrlKey  = null;
cKeyboardEvent.prototype.metaKey  = null;
cKeyboardEvent.prototype.shiftKey = null;

// Public Methods
cKeyboardEvent.prototype.initKeyboardEvent	= function(sType, bCanBubble, bCancelable, oView, sKeyIdentifier, nKeyLocation, sModifiersList) {
	this.initUIEvent(sType, bCanBubble, bCancelable, oView, null);

	//
	this.ctrlKey  = sModifiersList.indexOf("Control") >-1;
	this.altKey   = sModifiersList.indexOf("Alt")     >-1;
	this.shiftKey = sModifiersList.indexOf("Shift")   >-1;
	this.metaKey  = sModifiersList.indexOf("Meta")    >-1;

	this.keyIdentifier = sKeyIdentifier;
	this.keyLocation   = nKeyLocation;
};

cKeyboardEvent.prototype.initKeyboardEventNS	= function(sNameSpaceURI, sType, bCanBubble, bCancelable, oView, sKeyIdentifier, nKeyLocation, sModifiersList) {
	this.initkeyboardEvent(sType, bCanBubble, bCancelable, oView, sKeyIdentifier, nKeyLocation, sModifiersList);

	//
	this.namespaceURI	= sNameSpaceURI;
};

cKeyboardEvent.prototype.getModifierState = function(sModifier) {
	switch (sModifier) {
		case "Alt":		return this.altKey;
		case "Control":	return this.ctrlKey;
		case "Meta":	return this.metaKey;
		case "Shift":	return this.shiftKey;
	}
	return false;
};
var cTextEvent	= new window.Function;
cTextEvent.prototype	= new cUIEvent;

// Public Properties
cTextEvent.prototype.data	= null;

// Public Methods
cTextEvent.prototype.initTextEvent	= function(sType, bCanBubble, bCancelable, oView, sData) {
	this.initUIEvent(sType, bCanBubble, bCancelable, oView, null);

	//
	this.data	= sData;
};

cTextEvent.prototype.initTextEventNS	= function(sNameSpaceURI, sType, bCanBubble, bCancelable, oView, sData) {
	this.initTextEvent(sType, bCanBubble, bCancelable, oView, sData);

	//
	this.namespaceURI	= sNameSpaceURI;
};


var cMutationEvent	= new window.Function;
cMutationEvent.prototype	= new cEvent;

// Constants
cMutationEvent.MODIFICATION	= 1;
cMutationEvent.ADDITION		= 2;
cMutationEvent.REMOVAL		= 3;

// Public Properties
cMutationEvent.prototype.relatedNode= null;
cMutationEvent.prototype.prevValue	= null;
cMutationEvent.prototype.newValue	= null;
cMutationEvent.prototype.attrName	= null;
cMutationEvent.prototype.attrChange	= null;

// Public Methods
cMutationEvent.prototype.initMutationEvent	= function(sType, bCanBubble, bCancelable, oRelatedNode, sPrevValue, sNewValue, sAttrName, nAttrChange) {
	this.initEvent(sType, bCanBubble, bCancelable);

	//
	this.relatedNode	= oRelatedNode;
	this.prevValue		= sPrevValue;
	this.newValue		= sNewValue;
	this.attrName		= sAttrName;
	this.attrChange		= nAttrChange;
};

cMutationEvent.prototype.initMutationEventNS	= function(sNameSpaceURI, sType, bCanBubble, bCancelable, oRelatedNode, sPrevValue, sNewValue, sAttrName, nAttrChange) {
	this.initMutationEvent(sType, bCanBubble, bCancelable, oRelatedNode, sPrevValue, sNewValue, sAttrName, nAttrChange);

	//
	this.namespaceURI	= sNameSpaceURI;
};
var cCustomEvent	= new window.Function;
cCustomEvent.prototype	= new cEvent;

// Public Properties
cCustomEvent.prototype.detail	= null;

// Public Methods
cCustomEvent.prototype.initCustomEvent	= function(sType, bCanBubble, bCancelable, oDetail) {
	this.initEvent(sType, bCanBubble, bCancelable);

	//
	this.detail	= oDetail;
};

cCustomEvent.prototype.initCustomEventNS	= function(sNameSpaceURI, sType, bCanBubble, bCancelable, oDetail) {
	this.initCustomEvent(sType, bCanBubble, bCancelable, oDetail);

	//
	this.namespaceURI	= sNameSpaceURI;
};
var cElementXBL	= function() {
	// Disallow object instantiation
	throw 9;
};

// Public Properties
cElementXBL.prototype.xblImplementations	= null;

// Public Methods
cElementXBL.prototype.addBinding	= function(sDocumentUri) {
	// Validate input parameter
	if (typeof sDocumentUri != "string")
		throw 9;

	//
	sDocumentUri	= fResolveUri(sDocumentUri, document.location.href);

	// 0) Get Binding (synchronously)
	var cBinding	= cXBLLanguage.getBinding(sDocumentUri);
	if (!cBinding)
		return;

    // The oBinding is roughly the internal object, whereas 'this' gets to be
    //  the external object.
	var oBinding	= new cBinding;

	// 3) Attach implementation
    function bind(func) {
      return function() {
        return func.apply(oBinding, arguments);
      };
    }

	for (var sMember in oBinding)
		if (sMember.indexOf("xbl") != 0) {
            // All functions need to be wrapped to dispatch so that they are
            //  calling the method on the inner object, otherwise things get
            //  in a mess 'this'-wise.
            if (typeof(oBinding[sMember]) == "function") {
                this[sMember] = bind(oBinding[sMember]);
            }
            // ugh, and for now, don't copy any values across, but this really
            //  would like to be approximated by getter/setters that proxy...
            //else
			//    this[sMember]	= oBinding[sMember];
        }

//	oBinding.$unique	= "xbl" + '-' + window.Math.floor(window.Math.random()*100000000);

	// 1) Create shadowTree
	if (cBinding.template) {
		var oShadowContent	= fCreateTemplate(cBinding),
			aShadowAnchors	= oShadowContent.getElementsByTagName("strike"),	// live collection
			nShadowAnchor	= 0,
			oShadowAnchor,
			aElements, oElement,
			sValue,	aNames;

		// Forward xbl:attr
		aElements = oShadowContent.getElementsByTagName('*');
		for (var nElement = 0, nElements = aElements.length; nElement < nElements; nElement++) {
			oElement	= aElements[nElement];
			if (sValue = oElement.getAttribute("xbl-attr")) {
				for (var nAttribute = 0, aAttributes = sValue.split(' '), nAttributes = aAttributes.length; nAttribute < nAttributes; nAttribute++) {
					aNames	= aAttributes[nAttribute].split('=');
					if (aNames.length == 2) {
						if (aNames[0].indexOf(':' + "text") >-1) {
							if (!oElement.firstChild)
								oElement.appendChild(oElement.ownerDocument.createTextNode(this.getAttribute(aNames[1])));
						}
						else
						if (aNames[1].indexOf(':' + "text") >-1)
							oElement.setAttribute(aNames[0], this.textContent || this.innerText);
						else
							oElement.setAttribute(aNames[0], this.getAttribute(aNames[1]));
					}
					else
						oElement.setAttribute(aNames[0], this.getAttribute(aNames[0]));
				}
			}
		}

		// Process content@includes
		while ((oShadowAnchor = aShadowAnchors[nShadowAnchor]) && (nShadowAnchor < aShadowAnchors.length)) {
			if (sValue = oShadowAnchor.getAttribute("includes")) {
				aElements = fCSSSelectorQuery([this], '>' + sValue);
				for (var nElement = 0, nElements = aElements.length; oElement = aElements[nElement]; nElement++) {
					if (!oElement.xblChild) {
						if (oElement.nodeType == 1)
							oElement.xblChild	= true;
						oShadowAnchor.parentNode.insertBefore(oElement, oShadowAnchor);
					}
				}
				// Remove anchor
				oShadowAnchor.parentNode.removeChild(oShadowAnchor);
			} else {
				nShadowAnchor++;
			}
		}

		// Process content (with no @includes)
		if (oShadowAnchor = aShadowAnchors[0]) {
			for (nElement = 0; oElement = this.childNodes[nElement]; nElement++) {
				if (!oElement.xblChild) {
					if (oElement.nodeType == 1)
						oElement.xblChild	= true;
					oShadowAnchor.parentNode.insertBefore(oElement, oShadowAnchor);
					nElement--;
				}
			}
			// Remove anchor
			oShadowAnchor.parentNode.removeChild(oShadowAnchor);
		}

	// Removed, looks to be not necessary
		// Make sure shadow content documentElement has a unique ID set
		//		oShadowContent.setAttribute("id", oBinding.$unique);// + (oShadowContent.getAttribute("id") || ''));
		try {	// Try is used in order in IE to prevent runtime error with prefixed elements, that have no prefix association
			// Append shadow content
			while (oChild = oShadowContent.firstChild)
				this.appendChild(oShadowContent.firstChild);
		} catch (e) {}
		// Create shadowTree
		oBinding.shadowTree	= this;

		// Add "getElementById" member
		oBinding.shadowTree.getElementById	= fTemplateElement_getElementById;
	} else {
		// Mark children for proper target/phasing resolution
		for (var oChild = this.firstChild; oChild; oChild = oChild.nextSibling)
			if (oChild.nodeType == 1)
				oChild.xblChild	= true;

		oBinding.shadowTree	= null;
	}

	// Set boundElement
	oBinding.boundElement	= this;
	oBinding.baseBinding	= cBinding.baseBinding ? cBinding.baseBinding.prototype : null;

	// Add :bound-element pseudo-class
	this.className+= (this.className ? ' ' : '') + "xbl" + '-' + "bound-element" + '-' + cBinding.id;

	// 2) Register events routers for handlers in use
	oBinding.$handlers	= {};
	if (cBinding.$handlers)
		for (var sName in cBinding.$handlers)
			fRegisterEventRouter(oBinding, sName);

	// 3) Add to the list of bindings
	if (!this.xblImplementations)
		this.xblImplementations	= new cXBLImplementationsList;
	this.xblImplementations[this.xblImplementations.length++]	= oBinding;

	// 4) Execute callback function
	if (typeof oBinding.xblBindingAttached == "function")
		oBinding.xblBindingAttached();
	if (typeof oBinding.xblEnteredDocument == "function")
		oBinding.xblEnteredDocument();
};

cElementXBL.prototype.removeBinding	= function(sDocumentUri) {
	// Validate input parameter
	if (typeof sDocumentUri != "string")
		throw 9;

	if (!this.xblImplementations)
		return;

	//
	sDocumentUri	= fResolveUri(sDocumentUri, document.location.href);

	// 0) Get Binding
	for (var i = 0, j = this.xblImplementations.length, oBinding; i < j; i++) {
		oBinding = this.xblImplementations[i];
		if (oBinding.constructor.documentURI + '#' + oBinding.constructor.id == sDocumentUri)
			break;
	}

	if (!oBinding)
		return;

	// 1) Detach handlers
	if (oBinding.$handlers)
		for (var sName in oBinding.$handlers)
			fUnRegisterEventRouter(oBinding, sName);

	// 2) Destroy shadowTree
	if (oBinding.shadowTree) {
		// TODO: Restore old DOM structure

		// Destroy circular reference
		delete oBinding.shadowTree;
	}

	// Unset boundElement
	delete oBinding.boundElement;
	delete oBinding.baseBinding;

	// 3) Remove binding from list
	for (; this.xblImplementations[i]; i++)
		this.xblImplementations[i]	= this.xblImplementations[i + 1];
	delete this.xblImplementations[i];
	this.xblImplementations.length--;

	// 4) Execute callback function
	if (typeof oBinding.xblLeftDocument == "function")
		oBinding.xblLeftDocument();
};

cElementXBL.prototype.hasBinding	= function(sDocumentUri) {
	// Validate input parameter
	if (typeof sDocumentUri != "string")
		throw 9;

	if (this.xblImplementations) {
		//
		sDocumentUri	= fResolveUri(sDocumentUri, document.location.href);

		// Walk through the array
		for (var i = 0, j = this.xblImplementations.length, oBinding; i < j; i++) {
			oBinding = this.xblImplementations[i];
			if (oBinding.constructor.documentURI + '#' + oBinding.constructor.id == sDocumentUri)
				return true;
		}
	}
	return false;
};

// Functions

function fCreateTemplate(cBinding) {
	var oShadowContent,
		aShadowAnchors,
		oShadowAnchor,
		oElement;

	// Create template
	oShadowContent = cBinding.template.cloneNode(true);

	//
	var aInheritedAnchors	= oShadowContent.getElementsByTagName("menu"),
		oInheritedAnchor,
		oInheritedContent;

	// if there are any "inherited"
	if (aInheritedAnchors.length) {
		oInheritedAnchor	= aInheritedAnchors[0];

		// Check if in the base binding there is a template
		if (cBinding.baseBinding && cBinding.baseBinding.template) {

			// Create inherited content
			oInheritedContent	= fCreateTemplate(cBinding.baseBinding);

			// if there are "content" tags in the inherited content
			aShadowAnchors	= oInheritedContent.getElementsByTagName("strike");
			if (aShadowAnchors.length && oInheritedAnchor.firstChild) {
				// Move "inherited" tag children to the "content" of inherited template
				while (oElement = oInheritedAnchor.firstChild)
					aShadowAnchors[0].parentNode.appendChild(oInheritedAnchor.firstChild);

				// Remove old "content" anchor
				aShadowAnchors[0].parentNode.removeChild(aShadowAnchors[0]);
			}

			// Replace "inherited" tag with the inherited content
//			oInheritedAnchor.parentNode.replaceChild(oInheritedContent, oInheritedAnchor);
			while (oElement = oInheritedContent.firstChild)
				oInheritedAnchor.parentNode.insertBefore(oElement, oInheritedAnchor);
		}
		else {
//			while (oElement = oInheritedAnchor.firstChild)
//				oInheritedAnchor.parentNode.insertBefore(oInheritedAnchor.childNodes[oInheritedAnchor.childNodes.length-1], oInheritedAnchor);
		}
		//
		oInheritedAnchor.parentNode.removeChild(oInheritedAnchor);
	}

	return oShadowContent;
};

function fTemplateElement_getElementById(sId) {
	if (!this.$cache)
		this.$cache	= {};
	return this.$cache[sId] || (this.$cache[sId] = (function (oNode) {
		for (var oElement = null; oNode; oNode = oNode.nextSibling) {
			// Only go over shadow children, prevent jumping out by checking xblChild property
			if (oNode.nodeType == 1 && !oNode.xblChild) {
				if (oNode.getAttribute("xbl-id") == sId)
					return oNode;
				if (oNode.firstChild &&(oElement = arguments.callee(oNode.firstChild)))
					return oElement;
			}
		}
		return oElement;
	})(this.firstChild));
};
var cDocumentXBL	= function() {
	// Disallow object instantiation
	throw 9;
};

// Public Properties
cDocumentXBL.prototype.bindingDocuments		= null;

// Public Methods
cDocumentXBL.prototype.loadBindingDocument	= function(sDocumentUri) {
	// Validate input parameter
	if (typeof sDocumentUri != "string")
		throw 9;

	//
	sDocumentUri	= fResolveUri(sDocumentUri, document.location.href);

	if (!(sDocumentUri in this.bindingDocuments)) {
		var oDOMDocument	= cXBLLanguage.fetch(sDocumentUri).responseXML;
		if (oDOMDocument != null && oDOMDocument.documentElement && oDOMDocument.documentElement.tagName == "parsererror")
			oDOMDocument	= null;

		// Save document in cache
		this.bindingDocuments[sDocumentUri]	= oDOMDocument;

		// Process entire document
		// TODO: enable delayed processing
		if (oDOMDocument)
			cXBLLanguage.process(oDOMDocument, sDocumentUri);
//->Debug
		else
			cXBLLanguage.onerror("Binding document '" + sDocumentUri + "' is mall formed");
//<-Debug
	}
	return this.bindingDocuments[sDocumentUri];
};

// Functions
// strike == content
// menu == inherited


function fDocumentXBL_addBindings(oNode) {
	//
	for (var sRule in cXBLLanguage.rules)
		for (var nElement = 0, aBindings = cXBLLanguage.rules[sRule], aElements = fCSSSelectorQuery([document], sRule.replace(/\\:/g, '|')), nElements = aElements.length; nElement < nElements; nElement++)
			for (var nBinding = 0, nBindings = aBindings.length; nBinding < nBindings; nBinding++)
				cElementXBL.prototype.addBinding.call(aElements[nElement], aBindings[nBinding]);
};

function fDocumentXBL_removeBindings(oNode) {
	for (var oBinding, cBinding; oNode; oNode = oNode.nextSibling) {
		if (oNode.nodeType == 1) {
			// If it is we who defined property
			if (oNode.xblImplementations instanceof cXBLImplementationsList) {
// TODO: Proper shadow content restoration
//				while (oNode.xblImplementations.length) {
//					cBinding	= oNode.xblImplementations[oNode.xblImplementations.length-1].constructor;
//					cElementXBL.prototype.removeBinding.call(oNode, cBinding.documentURI + '#' + cBinding.id);
//				}

				while (oBinding = oNode.xblImplementations[--oNode.xblImplementations.length]) {
					cBinding	= oBinding.constructor;

					// Detach handlers
					if (oBinding.$handlers)
						for (var sName in oBinding.$handlers)
							fUnRegisterEventRouter(oBinding, sName);

					//
					delete oBinding.baseBinding;
					delete oBinding.boundElement;
					delete oBinding.shadowTree;

					// Delete binding
					oNode.xblImplementations[oNode.xblImplementations.length]	= null;
				}

				//
				oNode.xblImplementations	= null;
			}

			// Go deeper
			if (oNode.firstChild)
				fDocumentXBL_removeBindings(oNode.firstChild);
		}
	}
};
/*
 * This module contains CSS-Selectors resolver
 * The implementation is inspired by the work of Dean Edwards
 */

var rCSSSelectorEscape		= /([\/()[\]?{}|*+-])/g,
	rCSSSelectorQuotes		= /^('[^']*')|("[^"]*")$/;

var rCSSSelectorGroup			= /\s*,\s*/,
	rCSSSelectorCombinator 		= /^[^\s>+~]/,
	rCSSSelectorAttribute		= /([\w-]+\|?[\w-]+)\s*(\W?=)?\s*([^\]]*)/,
	rCSSSelectorSelector		= /::|[\s#.:>+~()@\[\]]|[^\s#.:>+~()@\[\]]+/g,
	rCSSSelectorWhiteSpace		= /\s*([\s>+~(,]|^|$)\s*/g,
	rCSSSelectorImplyAttribute	= /(\[[^\]]+\])/g,
	rCSSSelectorImplyUniversal	= /([\s>+~,]|[^(]\+|^)([#.:@])/g;

var nCSSSelectorIterator	= 0;

function fCSSSelectorQuery(aFrom, sSelectors, fNSResolver, bAll) {
	var aBase		= aFrom,
		aReturn		= [],
		aSelectors	= sSelectors
			.replace(rCSSSelectorWhiteSpace, '$1')			// trim whitespaces
			.replace(rCSSSelectorImplyAttribute, '@@$1')	// "[a~=asd] --> @@[a~=asd]
			.replace(rCSSSelectorImplyUniversal, '$1*$2')	// ".class1" --> "*.class1"
			.split(rCSSSelectorGroup),
		aSelector,
		sSelector;

	var i, j, sToken, sFilter, sArguments, fSelector, aElements, oElement,
		bBracketRounded, bBracketSquare;

	for (var nSelector = 0, nSelectors = aSelectors.length; nSelector < nSelectors; nSelector++) {
		sSelector = aSelectors[nSelector];
		if (rCSSSelectorCombinator.test(sSelector))
			sSelector = ' ' + sSelector;
		aSelector	= sSelector.match(rCSSSelectorSelector) || [];
		aFrom = aBase;

		for (var nIndex = 0, nLength = aSelector.length; nIndex < nLength; sArguments = '') {
			aElements	= [];

			sToken	= aSelector[nIndex++];
			sFilter	= aSelector[nIndex++];

			// Element selector
			if (fSelector = oCSSSelectorElementSelectors[sToken]) {
				var sTagName	= sFilter.replace('|', ':');
				for (i = 0, j = aFrom.length; i < j; i++)
					fSelector(aElements, aFrom[i], sTagName, fNSResolver);
			}
			else
			// class selector
			if (sToken == '.') {
				var rRegExp	= window.RegExp('(^|\\s)' + sFilter + '(\\s|$)');
				for (i = 0, j = aFrom.length; i < j; i++)
					if (rRegExp.test(aFrom[i].className))
						aElements.push(aFrom[i]);
			}
			else
			// ID selector
			if (sToken == '#') {
				var oNode	= document.getElementById(sFilter);
				if (oNode)
					for (i = 0, j = aFrom.length; i < j; i++)
						if (aFrom[i] == oNode) {
			   				aElements.push(oNode);
			   				break;
						}
			}
			else
			if (sToken == ':' || sToken == '@') {
				// Get arguments
				bBracketRounded	= aSelector[nIndex] == '(';
				bBracketSquare	= aSelector[nIndex] == '[';
				if (bBracketSquare || bBracketRounded) {
					nIndex++;
					while (aSelector[nIndex++] != (bBracketRounded ? ')' : ']') && nIndex < nLength)
						sArguments += aSelector[nIndex - 1];
				}

				// Attribute selector
				if (sToken == '@') {
					var aMatch 		= sArguments.match(rCSSSelectorAttribute);
					if (!aMatch[2] || (fSelector = oCSSSelectorAttributeSelectors[aMatch[2]])) {
						var sAttribute	= aMatch[1].replace('|', ':'),
							sCompare	= fCSSSelectorUnquote(aMatch[3]) || '',
							sValue;
						for (i = 0, j = aFrom.length; i < j; i++)
							if ((sValue = fCSSSelectorGetAttributeNS(aFrom[i], sAttribute, fNSResolver)) && (!aMatch[2] || fSelector(sValue, sCompare)))
								aElements.push(aFrom[i]);
					}
					//->Debug
					else
						cXBLLanguage.onerror("Unknown attribute selector '" + aMatch[2] + "'");
					//<-Debug
				}
				else
				// Pseudo-class selector
				if (sToken == ':') {
					if (sFilter == "not") {
						var aNegated = fCSSSelectorQuery([aFrom[0].ownerDocument], sArguments, fNSResolver),
							bFound;
						for (i = 0, j = aFrom.length; i < j; i++) {
							bFound	= false;
							for (var n = 0, m = aNegated.length; n < m && !bFound; n++)
								if (aNegated[n] == aFrom[i])
									bFound	= true;
							if (!bFound)
								aElements.push(aFrom[i]);
						}
					}
					else {
						if (fSelector = oCSSSelectorPseudoSelectors[sFilter]) {
							for (i = 0, j = aFrom.length; i < j; i++)
								if (fSelector(aFrom[i], sArguments))
									aElements.push(aFrom[i]);
						}
						//->Debug
						else
							cXBLLanguage.onerror("Unknown pseudo-class selector '" + sFilter + "'");
						//<-Debug
					}
				}
			}
			else
			// Pseudo element selector
			if (sToken == '::') {
				// Not implemented
			}
			else {
				cXBLLanguage.onerror("Unknown element selector '" + sToken + "' in query '" + sSelector + "'");
			}
			aFrom	= aElements;
		}

		// Filter out duplicate elements
		for (i = 0, j = aElements.length; i < j; i++) {
			oElement = aElements[i];
			if (oElement._nCSSSelectorIterator != nCSSSelectorIterator) {
				oElement._nCSSSelectorIterator	= nCSSSelectorIterator;
				aReturn.push(oElement);
			}
		}
//		aElements	= aElements.concat(aElements);
	}

	nCSSSelectorIterator++;

	return aReturn;
};

// String utilities
function fCSSSelectorEscape(sValue) {
	return sValue.replace(rCSSSelectorEscape, '\\$1');
};

function fCSSSelectorUnquote(sString) {
	return rCSSSelectorQuotes.test(sString) ? sString.slice(1, -1) : sString;
};

// DOM Utilities
function fCSSSelectorGetElementsByTagName(oNode, sTagName) {
	var aTagName	= sTagName.split(':');
	if (aTagName.length > 1 && document.namespaces && document.namespaces[aTagName[0]]) {
		var aElements	= [];
		for (var i = 0, aSubset = oNode.getElementsByTagName(aTagName[1]), j = aSubset.length; i < j; i++)
			if (aSubset[i].scopeName == aTagName[0])
				aElements.push(aSubset[i]);
		return aElements;
	}
	else
		return sTagName == '*' && oNode.all ? oNode.all : oNode.getElementsByTagName(sTagName);
};

function fCSSSelectorGetPreviousSibling(oElement) {
	while (oElement = oElement.previousSibling)
		if (oElement.nodeType == 1)
			return oElement;
	return null;
};

function fCSSSelectorGetNextSibling(oElement) {
	while (oElement = oElement.nextSibling)
		if (oElement.nodeType == 1)
			return oElement;
	return null;
};

//			aQName		= sAttribute.split('|'),
//			sLocalName	= aQName.length > 1 ? aQName[1] : aQName[0],
//			sPrefix		= aQName.length > 1 ? aQName[0] : null,
function fCSSSelectorIfElementNS(oElement, sQName, fNSResolver) {
	return sQName == '*' || oElement.tagName.toLowerCase() == sQName.toLowerCase();
};

var fCSSSelectorGetAttributeNS	= document.namespaces ?
	function(oElement, sQName, fNSResolver) {
		return sQName == "class" ? oElement.className : sQName == "style" ? oElement.style.cssText : oElement[sQName];
	} :
	function(oElement, sQName, fNSResolver) {
		return oElement.getAttribute(sQName);
	}
;

// Selectors
var oCSSSelectorElementSelectors	= {},
	oCSSSelectorAttributeSelectors	= {},
	oCSSSelectorPseudoSelectors= {};
// CSS 1
oCSSSelectorElementSelectors[' ']	= function(aReturn, oElement, sTagName, fNSResolver) {
	for (var n = 0, aSubset	= fCSSSelectorGetElementsByTagName(oElement, sTagName, fNSResolver), m = aSubset.length; n < m; n++)
		aReturn.push(aSubset[n]);
};

// CSS 2.1
oCSSSelectorElementSelectors['>']	= function(aReturn, oElement, sTagName, fNSResolver) {
	for (var n = 0, aSubset = oElement.childNodes, m = aSubset.length; n < m; n++)
		if (aSubset[n].nodeType == 1 && fCSSSelectorIfElementNS(aSubset[n], sTagName, fNSResolver))
			aReturn.push(aSubset[n]);
};

oCSSSelectorElementSelectors['+']	= function(aReturn, oElement, sTagName, fNSResolver) {
   	if ((oElement = fCSSSelectorGetNextSibling(oElement)) && fCSSSelectorIfElementNS(oElement, sTagName, fNSResolver))
		aReturn.push(oElement);
};

// CSS 3
oCSSSelectorElementSelectors['~']	= function(aReturn, oElement, sTagName, fNSResolver) {
	while (oElement = fCSSSelectorGetNextSibling(oElement))
		if (fCSSSelectorIfElementNS(oElement, sTagName, fNSResolver))
			aReturn.push(oElement);
};
// CSS 2.1
oCSSSelectorAttributeSelectors['=']	= function(sValue, sCompare) {
	return sValue == sCompare;
};

oCSSSelectorAttributeSelectors['~=']	= function(sValue, sCompare) {
	var oCache	= arguments.callee.$cache || (arguments.callee.$cache = {}),
		rRegExp	= oCache[sCompare] || (oCache[sCompare] = window.RegExp('(^| )' + fCSSSelectorEscape(sCompare) + '( |$)'));
	return rRegExp.test(sValue);
};

oCSSSelectorAttributeSelectors['|=']	= function(sValue, sCompare) {
	var oCache	= arguments.callee.$cache || (arguments.callee.$cache = {}),
		rRegExp	= oCache[sCompare] || (oCache[sCompare] = window.RegExp('^' + fCSSSelectorEscape(sCompare) + '(-|$)'));
	return rRegExp.test(sValue);
};

// CSS 3
oCSSSelectorAttributeSelectors['^=']	= function(sValue, sCompare) {
	return sValue.indexOf(sCompare) == 0;
};

oCSSSelectorAttributeSelectors['$=']	= function(sValue, sCompare) {
	return sValue.indexOf(sCompare) == sValue.length - sCompare.length;
};

oCSSSelectorAttributeSelectors['*=']	= function(sValue, sCompare) {
	return sValue.indexOf(sCompare) >-1;
};
// CSS 2.1
oCSSSelectorPseudoSelectors["first-child"]	= function(oElement) {
	return fCSSSelectorGetPreviousSibling(oElement) == null;
};

oCSSSelectorPseudoSelectors["link"]		= function(oElement) {
	return oElement.tagName.toLowerCase() == 'a' && oElement.getAttribute("href");
};

oCSSSelectorPseudoSelectors["lang"]		= function(oElement, sArgument) {
	for (var sValue; oElement.nodeType != 9; oElement = oElement.parentNode)
		if (sValue =(oElement.getAttribute("lang") || oElement.getAttribute("xml" + ':' + "lang")))
			return sValue.indexOf(sArgument) == 0;
	return false;
};

// Dynamic pseudo-classes (not supported)
oCSSSelectorPseudoSelectors["visited"]	= function(oElement) {
	return false;
};

oCSSSelectorPseudoSelectors["active"]	= function(oElement) {
	return false;
};

oCSSSelectorPseudoSelectors["hover"]	= function(oElement) {
	return false;
};

oCSSSelectorPseudoSelectors["focus"]	= function(oElement) {
	return false;
};

// CSS 3
oCSSSelectorPseudoSelectors["contains"]	= function(oElement, sParam) {
	return (oElement.textContent || oElement.innerText).indexOf(fCSSSelectorUnquote(sParam)) >-1;
};

oCSSSelectorPseudoSelectors["root"]		= function(oElement) {
	return oElement == oElement.ownerDocument.documentElement;
};

oCSSSelectorPseudoSelectors["empty"]	= function(oElement) {
	return oElement.firstChild ? false : true;
};

oCSSSelectorPseudoSelectors["last-child"]	= function(oElement) {
	return fCSSSelectorGetNextSibling(oElement) == null;
};

oCSSSelectorPseudoSelectors["nth-child"]		= function(oElement, sParam) {
	// TODO
	return false;
};

oCSSSelectorPseudoSelectors["nth-last-child"]	= function(oElement, sParam) {
	// TODO
	return false;
};

oCSSSelectorPseudoSelectors["nth-of-type"]		= function(oElement, sParam) {
	// TODO
	return false;
};

oCSSSelectorPseudoSelectors["nth-last-of-type"]	= function(oElement, sParam) {
	// TODO
	return false;
};

oCSSSelectorPseudoSelectors["first-of-type"]= function(oElement) {
	// TODO
	return false;
};

oCSSSelectorPseudoSelectors["last-of-type"]	= function(oElement) {
	// TODO
	return false;
};

oCSSSelectorPseudoSelectors["only-child"]	= function(oElement) {
	return !fCSSSelectorGetNextSibling(oElement) && !fCSSSelectorGetPreviousSibling(oElement);
};

oCSSSelectorPseudoSelectors["only-of-type"]	= function(oElement) {
	// TODO
	return false;
};

oCSSSelectorPseudoSelectors["target"]		= function(oElement) {
	return oElement.id == window.location.hash.slice(1);
};

oCSSSelectorPseudoSelectors["enabled"]		= function(oElement) {
	return oElement.disabled === false;
};

oCSSSelectorPseudoSelectors["disabled"]		= function(oElement) {
	return oElement.disabled;
};

oCSSSelectorPseudoSelectors["checked"]		= function(oElement) {
	return oElement.checked;
};
var cXBLImplementation	= new window.Function;

// Public Methods
cXBLImplementation.prototype.xblBindingAttached	= new window.Function;
cXBLImplementation.prototype.xblEnteredDocument	= new window.Function;
cXBLImplementation.prototype.xblLeftDocument	= new window.Function;
var cXBLImplementationsList	= new window.Function;

// Public Properties
cXBLImplementationsList.prototype.length	= 0;

// Public Methods
cXBLImplementationsList.prototype.item	= function(nIndex) {
	if (typeof nIndex == "number" && nIndex <= this.length)
		return this[nIndex];
	else
		throw 1;	// INDEX_SIZE_ERR
};
/**
 * This module contains XBL driver
 */

/*
function fAttachEvent(oNode, sName, fHandler) {
	if (oNode.attachEvent)
		oNode.attachEvent(sName, fHandler);
	else
		oNode.addEventListener(sName.substr(2), fHandler, false);
};
*/
/*
function fDetachEvent(oNode, sName, fHandler) {
	if (oNode.detachEvent)
		oNode.detachEvent(sName, fHandler);
	else
		oNode.removeEventListener(sName.substr(2), fHandler, false);
};
*/

//
var rCSSRules		= /\s*([^}]+)\s*{([^}]+)}/g,
	rCSSBindingUrls	= /binding:\s*url\s*\(['"\s]*([^'"]+)['"\s]*\)/g,
	rCSSComments	= /(\/\*.*?\*\/)/g,
	rCSSNameSpaces	= /@namespace\s+(\w+)?\s*"([^"]+)";?/g;

function fProcessCSS(sStyleSheet) {
	var sRule,	aRules,	nRule,	nRules,
		sStyle,	aUrls,	nUrl,	nUrls;

	// Cut off comments
	sStyleSheet	= sStyleSheet.replace(rCSSComments, '');

	// Remove @namespace declarations (temporary)
	// TODO: Process @namespace instructions properly
	sStyleSheet	= sStyleSheet.replace(rCSSNameSpaces, '');

	// Go over the list of behaviors using rules
	if (aRules = sStyleSheet.match(rCSSRules)) {
		for (nRule = 0, nRules = aRules.length; nRule < nRules; nRule++) {
			if (aRules[nRule].match(rCSSRules)) {
				sRule	= window.RegExp.$1;
				sStyle	= window.RegExp.$2;
				// Save rules/styles to fix them later for IE
//				if (!(sRule in cXBLLanguage.styles))
//					cXBLLanguage.styles[sRule]	= '';
//				cXBLLanguage.styles[sRule]	+= sStyle;
				// Find declarations that have bindings in their styles
				if (aUrls = sStyle.match(rCSSBindingUrls)) {
					if (!cXBLLanguage.rules[sRule])
						cXBLLanguage.rules[sRule]	= [];
					for (nUrl = 0, nUrls = aUrls.length; nUrl < nUrls; nUrl++)
						if (aUrls[nUrl].match(rCSSBindingUrls))
							cXBLLanguage.rules[sRule].push(window.RegExp.$1);
				}
			}
		}
	}
};

/**
 * Document Handlers
 */
function fOnWindowLoad() {
	// Prevent multiple execution
	if (!fOnWindowLoad.loaded)
		fOnWindowLoad.loaded	= true;
	else
		return;

	// Process CSS declarations
	var sHrefDocument = document.location.href,
		sHref,
		sType,
		aElements,
		oElement,
		i, j;

	// Go over the list of inline style elements
	for (i = 0, aElements = document.getElementsByTagName("style"), j = aElements.length; i < j; i++) {
		oElement = aElements[i];
		if (oElement.getAttribute("type") == "text/css")
			fProcessCSS(oElement.textContent || oElement.innerHTML);
	}

	// Go over the list of link elements
	for (i = 0, aElements = document.getElementsByTagName("link"), j = aElements.length;  i < j; i++) {
		oElement = aElements[i];
		sHref	= oElement.getAttribute("href");
		sType	= oElement.getAttribute("type");
		if (sType == "text/css") {
			if (fUrisInSameDomain(sHref, sHrefDocument))
				fProcessCSS(cXBLLanguage.fetch(sHref).responseText);
		}
		else
		if (sType == "application/xml") {
			if (oElement.getAttribute("rel") == "binding")
				cDocumentXBL.prototype.loadBindingDocument.call(document, sHref);
		}
	}

	// Process elements in the document
//->Source
	var d = new Date;
//<-Source
	fDocumentXBL_addBindings(document.body);
//->Source
	document.title = (new Date - d) + ' ms.';
//<-Source

	// Dispatch xbl-bindings-are-ready to document
//	fDispatchEvent(document.documentElement, fCreateEvent("xbl-bindings-are-ready", true, false));
};
/*
function fOnWindowUnLoad() {
	// TODO: Any actions required
//	fDocumentXBL_removeBindings(document.body);

	// Clean handler
//	fDetachEvent(window,	"on" + "load",		fOnWindowLoad);
//	fDetachEvent(window,	"on" + "unload",	fOnWindowUnLoad);
};
*/

// Publish implementation, Hide implementation details
function fFunctionToString(sName) {
	return function () {return "function" + ' ' + sName + '()' + ' ' + '{\n\t[native code]\n}'};
};

function fObjectToString(sName) {
	return function () {return '[' + sName + ']'};
};

var oImplementation	= document.implementation;

// Check if implementation supports XBL 2.0 natively and if it does, return (IE 5.5 doesn't support document.implementation)
if (!oImplementation || !oImplementation.hasFeature("XBL", '2.0')) {
	// Register framework
//	fAttachEvent(window,	"on" + "load",		fOnWindowLoad);
	//fAttachEvent(window,	"on" + "unload",	fOnWindowUnLoad);

	if (document.createElement("div").addEventListener) {
		// Webkit
		if (window.navigator.userAgent.match(/applewebkit/i))
			(function (){
				if (document.readyState == "loaded" || document.readyState == "complete")
					fOnWindowLoad();
				else
					window.setTimeout(arguments.callee, 0);
			})();
		// Gecko / Opera
		else
			window.addEventListener("DOMContentLoaded", fOnWindowLoad, false);
//		window.addEventListener("load", fOnWindowLoad, false);
	}
	else {
		// Internet Explorer
		document.write('<' + "script" + ' ' + "id" + '="' + "xbl" + '_' + "implementation" + '" ' + "defer" + ' ' + "src" + '="/' + '/:"></' + "script" + '>');
		document.getElementById("xbl" + '_' + "implementation").onreadystatechange	= function() {
			if (this.readyState == "interactive" || this.readyState == "complete")
				fOnWindowLoad(this.parentNode.removeChild(this));
		}
	}
	// For browsers that do not support tricks coded above
	if (window.addEventListener)
		window.addEventListener("load", fOnWindowLoad, true);
	else
		window.attachEvent("on" + "load", fOnWindowLoad);

	// Publish XBL
	(window.ElementXBL	= cElementXBL).toString		= fObjectToString("ElementXBL");
	(window.DocumentXBL	= cDocumentXBL).toString	= fObjectToString("DocumentXBL");

	(document.bindingDocuments		= {}).toString	= function() {	return '[' + "object" + ' ' + "NamedNodeMap" + ']'};
	(document.loadBindingDocument	= cDocumentXBL.prototype.loadBindingDocument).toString	= fFunctionToString("loadBindingDocument");

	cElementXBL.prototype.addBinding.toString	= fFunctionToString("addBinding");
	cElementXBL.prototype.removeBinding.toString= fFunctionToString("removeBinding");
	cElementXBL.prototype.hasBinding.toString	= fFunctionToString("hasBinding");
};

if (!oImplementation || !oImplementation.hasFeature("Selectors", '3.0')) {
//	(window.ElementSelector		= new window.Function).toString	= fObjectToString("ElementSelector");
//	(window.DocumentSelector	= new window.Function).toString	= fObjectToString("DocumentSelector");

	// Publish Selectors API
	if (!document.querySelector)
		(document.querySelector		= function(sSelectors, fNSResolver) {
			// Validate input parameter
			if (typeof sSelectors != "string")
				throw 9;
			if (arguments.length > 1 && typeof fNSResolver != "function")
				throw 9;

			return fCSSSelectorQuery([this], sSelectors, fNSResolver)[0] || null;
		}).toString		= fFunctionToString("querySelector");

	if (!document.querySelectorAll)
		(document.querySelectorAll	= function(sSelectors, fNSResolver) {
			// Validate input parameter
			if (typeof sSelectors != "string")
				throw 9;
			if (arguments.length > 1 && typeof fNSResolver != "function")
				throw 9;

			return fCSSSelectorQuery([this], sSelectors, fNSResolver, true);
		}).toString	= fFunctionToString("querySelectorAll");
};

})()
