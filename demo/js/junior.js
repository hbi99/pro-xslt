/*!
 * Sizzle CSS Selector Engine v2.3.6-pre
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://js.foundation/
 *
 * Date: 2020-06-11
 */
( function( window ) {
var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	nonnativeSelectorCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ( {} ).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	pushNative = arr.push,
	push = arr.push,
	slice = arr.slice,

	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[ i ] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|" +
		"ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// https://www.w3.org/TR/css-syntax-3/#ident-token-diagram
	identifier = "(?:\\\\[\\da-fA-F]{1,6}" + whitespace +
		"?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +

		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +

		// "Attribute values must be CSS identifiers [capture 5]
		// or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" +
		whitespace + "*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +

		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +

		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +

		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" +
		whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace +
		"*" ),
	rdescend = new RegExp( whitespace + "|>" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" +
			whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" +
			whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),

		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace +
			"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace +
			"*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rhtml = /HTML$/i,
	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\[\\da-fA-F]{1,6}" + whitespace + "?|\\\\([^\\r\\n\\f])", "g" ),
	funescape = function( escape, nonHex ) {
		var high = "0x" + escape.slice( 1 ) - 0x10000;

		return nonHex ?

			// Strip the backslash prefix from a non-hex escape sequence
			nonHex :

			// Replace a hexadecimal escape sequence with the encoded Unicode code point
			// Support: IE <=11+
			// For values outside the Basic Multilingual Plane (BMP), manually construct a
			// surrogate pair
			high < 0 ?
				String.fromCharCode( high + 0x10000 ) :
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" +
				ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	inDisabledFieldset = addCombinator(
		function( elem ) {
			return elem.disabled === true && elem.nodeName.toLowerCase() === "fieldset";
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		( arr = slice.call( preferredDoc.childNodes ) ),
		preferredDoc.childNodes
	);

	// Support: Android<4.0
	// Detect silently failing push.apply
	// eslint-disable-next-line no-unused-expressions
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			pushNative.apply( target, slice.call( els ) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;

			// Can't trust NodeList.length
			while ( ( target[ j++ ] = els[ i++ ] ) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {
		setDocument( context );
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && ( match = rquickExpr.exec( selector ) ) ) {

				// ID selector
				if ( ( m = match[ 1 ] ) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( ( elem = context.getElementById( m ) ) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && ( elem = newContext.getElementById( m ) ) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[ 2 ] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( ( m = match[ 3 ] ) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!nonnativeSelectorCache[ selector + " " ] &&
				( !rbuggyQSA || !rbuggyQSA.test( selector ) ) &&

				// Support: IE 8 only
				// Exclude object elements
				( nodeType !== 1 || context.nodeName.toLowerCase() !== "object" ) ) {

				newSelector = selector;
				newContext = context;

				// qSA considers elements outside a scoping root when evaluating child or
				// descendant combinators, which is not what we want.
				// In such cases, we work around the behavior by prefixing every selector in the
				// list with an ID selector referencing the scope context.
				// The technique has to be used as well when a leading combinator is used
				// as such selectors are not recognized by querySelectorAll.
				// Thanks to Andrew Dupont for this technique.
				if ( nodeType === 1 &&
					( rdescend.test( selector ) || rcombinators.test( selector ) ) ) {

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;

					// We can use :scope instead of the ID hack if the browser
					// supports it & if we're not changing the context.
					if ( newContext !== context || !support.scope ) {

						// Capture the context ID, setting it first if necessary
						if ( ( nid = context.getAttribute( "id" ) ) ) {
							nid = nid.replace( rcssescape, fcssescape );
						} else {
							context.setAttribute( "id", ( nid = expando ) );
						}
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[ i ] = ( nid ? "#" + nid : ":scope" ) + " " +
							toSelector( groups[ i ] );
					}
					newSelector = groups.join( "," );
				}

				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch ( qsaError ) {
					nonnativeSelectorCache( selector, true );
				} finally {
					if ( nid === expando ) {
						context.removeAttribute( "id" );
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {

		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {

			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return ( cache[ key + " " ] = value );
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement( "fieldset" );

	try {
		return !!fn( el );
	} catch ( e ) {
		return false;
	} finally {

		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}

		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split( "|" ),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[ i ] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( ( cur = cur.nextSibling ) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return ( name === "input" || name === "button" ) && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
					inDisabledFieldset( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction( function( argument ) {
		argument = +argument;
		return markFunction( function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ ( j = matchIndexes[ i ] ) ] ) {
					seed[ j ] = !( matches[ j ] = seed[ j ] );
				}
			}
		} );
	} );
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	var namespace = elem.namespaceURI,
		docElem = ( elem.ownerDocument || elem ).documentElement;

	// Support: IE <=8
	// Assume HTML when documentElement doesn't yet exist, such as inside loading iframes
	// https://bugs.jquery.com/ticket/4833
	return !rhtml.test( namespace || docElem && docElem.nodeName || "HTML" );
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( doc == document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9 - 11+, Edge 12 - 18+
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( preferredDoc != document &&
		( subWindow = document.defaultView ) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	// Support: IE 8 - 11+, Edge 12 - 18+, Chrome <=16 - 25 only, Firefox <=3.6 - 31 only,
	// Safari 4 - 5 only, Opera <=11.6 - 12.x only
	// IE/Edge & older browsers don't support the :scope pseudo-class.
	// Support: Safari 6.0 only
	// Safari 6.0 supports :scope but it's an alias of :root there.
	support.scope = assert( function( el ) {
		docElem.appendChild( el ).appendChild( document.createElement( "div" ) );
		return typeof el.querySelectorAll !== "undefined" &&
			!el.querySelectorAll( ":scope fieldset div" ).length;
	} );

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert( function( el ) {
		el.className = "i";
		return !el.getAttribute( "className" );
	} );

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert( function( el ) {
		el.appendChild( document.createComment( "" ) );
		return !el.getElementsByTagName( "*" ).length;
	} );

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert( function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	} );

	// ID filter and find
	if ( support.getById ) {
		Expr.filter[ "ID" ] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute( "id" ) === attrId;
			};
		};
		Expr.find[ "ID" ] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter[ "ID" ] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode( "id" );
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find[ "ID" ] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode( "id" );
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( ( elem = elems[ i++ ] ) ) {
						node = elem.getAttributeNode( "id" );
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find[ "TAG" ] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,

				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( ( elem = results[ i++ ] ) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find[ "CLASS" ] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( ( support.qsa = rnative.test( document.querySelectorAll ) ) ) {

		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert( function( el ) {

			var input;

			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll( "[msallowcapture^='']" ).length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll( "[selected]" ).length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push( "~=" );
			}

			// Support: IE 11+, Edge 15 - 18+
			// IE 11/Edge don't find elements on a `[name='']` query in some cases.
			// Adding a temporary attribute to the document before the selection works
			// around the issue.
			// Interestingly, IE 10 & older don't seem to have the issue.
			input = document.createElement( "input" );
			input.setAttribute( "name", "" );
			el.appendChild( input );
			if ( !el.querySelectorAll( "[name='']" ).length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*name" + whitespace + "*=" +
					whitespace + "*(?:''|\"\")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll( ":checked" ).length ) {
				rbuggyQSA.push( ":checked" );
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push( ".#.+[+~]" );
			}

			// Support: Firefox <=3.6 - 5 only
			// Old Firefox doesn't throw on a badly-escaped identifier.
			el.querySelectorAll( "\\\f" );
			rbuggyQSA.push( "[\\r\\n\\f]" );
		} );

		assert( function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement( "input" );
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll( "[name=d]" ).length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll( ":enabled" ).length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll( ":disabled" ).length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: Opera 10 - 11 only
			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll( "*,:x" );
			rbuggyQSA.push( ",.*:" );
		} );
	}

	if ( ( support.matchesSelector = rnative.test( ( matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector ) ) ) ) {

		assert( function( el ) {

			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		} );
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join( "|" ) );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join( "|" ) );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			) );
		} :
		function( a, b ) {
			if ( b ) {
				while ( ( b = b.parentNode ) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		// Support: IE 11+, Edge 17 - 18+
		// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
		// two documents; shallow comparisons work.
		// eslint-disable-next-line eqeqeq
		compare = ( a.ownerDocument || a ) == ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			( !support.sortDetached && b.compareDocumentPosition( a ) === compare ) ) {

			// Choose the first element that is related to our preferred document
			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			// eslint-disable-next-line eqeqeq
			if ( a == document || a.ownerDocument == preferredDoc &&
				contains( preferredDoc, a ) ) {
				return -1;
			}

			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			// eslint-disable-next-line eqeqeq
			if ( b == document || b.ownerDocument == preferredDoc &&
				contains( preferredDoc, b ) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {

		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {

			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			/* eslint-disable eqeqeq */
			return a == document ? -1 :
				b == document ? 1 :
				/* eslint-enable eqeqeq */
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( ( cur = cur.parentNode ) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( ( cur = cur.parentNode ) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[ i ] === bp[ i ] ) {
			i++;
		}

		return i ?

			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[ i ], bp[ i ] ) :

			// Otherwise nodes in our document sort first
			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			/* eslint-disable eqeqeq */
			ap[ i ] == preferredDoc ? -1 :
			bp[ i ] == preferredDoc ? 1 :
			/* eslint-enable eqeqeq */
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	setDocument( elem );

	if ( support.matchesSelector && documentIsHTML &&
		!nonnativeSelectorCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||

				// As well, disconnected nodes are said to be in a document
				// fragment in IE 9
				elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch ( e ) {
			nonnativeSelectorCache( expr, true );
		}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {

	// Set document vars if needed
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( ( context.ownerDocument || context ) != document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {

	// Set document vars if needed
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( ( elem.ownerDocument || elem ) != document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],

		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			( val = elem.getAttributeNode( name ) ) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return ( sel + "" ).replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( ( elem = results[ i++ ] ) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {

		// If no nodeType, this is expected to be an array
		while ( ( node = elem[ i++ ] ) ) {

			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {

		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {

			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}

	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[ 1 ] = match[ 1 ].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[ 3 ] = ( match[ 3 ] || match[ 4 ] ||
				match[ 5 ] || "" ).replace( runescape, funescape );

			if ( match[ 2 ] === "~=" ) {
				match[ 3 ] = " " + match[ 3 ] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {

			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[ 1 ] = match[ 1 ].toLowerCase();

			if ( match[ 1 ].slice( 0, 3 ) === "nth" ) {

				// nth-* requires argument
				if ( !match[ 3 ] ) {
					Sizzle.error( match[ 0 ] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[ 4 ] = +( match[ 4 ] ?
					match[ 5 ] + ( match[ 6 ] || 1 ) :
					2 * ( match[ 3 ] === "even" || match[ 3 ] === "odd" ) );
				match[ 5 ] = +( ( match[ 7 ] + match[ 8 ] ) || match[ 3 ] === "odd" );

				// other types prohibit arguments
			} else if ( match[ 3 ] ) {
				Sizzle.error( match[ 0 ] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[ 6 ] && match[ 2 ];

			if ( matchExpr[ "CHILD" ].test( match[ 0 ] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[ 3 ] ) {
				match[ 2 ] = match[ 4 ] || match[ 5 ] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&

				// Get excess from tokenize (recursively)
				( excess = tokenize( unquoted, true ) ) &&

				// advance to the next closing parenthesis
				( excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length ) ) {

				// excess is a negative index
				match[ 0 ] = match[ 0 ].slice( 0, excess );
				match[ 2 ] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() {
					return true;
				} :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				( pattern = new RegExp( "(^|" + whitespace +
					")" + className + "(" + whitespace + "|$)" ) ) && classCache(
						className, function( elem ) {
							return pattern.test(
								typeof elem.className === "string" && elem.className ||
								typeof elem.getAttribute !== "undefined" &&
									elem.getAttribute( "class" ) ||
								""
							);
				} );
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				/* eslint-disable max-len */

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
				/* eslint-enable max-len */

			};
		},

		"CHILD": function( type, what, _argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, _context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( ( node = node[ dir ] ) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}

								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || ( node[ expando ] = {} );

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								( outerCache[ node.uniqueID ] = {} );

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( ( node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								( diff = nodeIndex = 0 ) || start.pop() ) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {

							// Use previously-cached element index if available
							if ( useCache ) {

								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || ( node[ expando ] = {} );

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									( outerCache[ node.uniqueID ] = {} );

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {

								// Use the same loop as above to seek `elem` from the start
								while ( ( node = ++nodeIndex && node && node[ dir ] ||
									( diff = nodeIndex = 0 ) || start.pop() ) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] ||
												( node[ expando ] = {} );

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												( outerCache[ node.uniqueID ] = {} );

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {

			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction( function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[ i ] );
							seed[ idx ] = !( matches[ idx ] = matched[ i ] );
						}
					} ) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {

		// Potentially complex pseudos
		"not": markFunction( function( selector ) {

			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction( function( seed, matches, _context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( ( elem = unmatched[ i ] ) ) {
							seed[ i ] = !( matches[ i ] = elem );
						}
					}
				} ) :
				function( elem, _context, xml ) {
					input[ 0 ] = elem;
					matcher( input, null, xml, results );

					// Don't keep the element (issue #299)
					input[ 0 ] = null;
					return !results.pop();
				};
		} ),

		"has": markFunction( function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		} ),

		"contains": markFunction( function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || getText( elem ) ).indexOf( text ) > -1;
			};
		} ),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {

			// lang value must be a valid identifier
			if ( !ridentifier.test( lang || "" ) ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( ( elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute( "xml:lang" ) || elem.getAttribute( "lang" ) ) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( ( elem = elem.parentNode ) && elem.nodeType === 1 );
				return false;
			};
		} ),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement &&
				( !document.hasFocus || document.hasFocus() ) &&
				!!( elem.type || elem.href || ~elem.tabIndex );
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {

			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return ( nodeName === "input" && !!elem.checked ) ||
				( nodeName === "option" && !!elem.selected );
		},

		"selected": function( elem ) {

			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				// eslint-disable-next-line no-unused-expressions
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {

			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos[ "empty" ]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( ( attr = elem.getAttribute( "type" ) ) == null ||
					attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo( function() {
			return [ 0 ];
		} ),

		"last": createPositionalPseudo( function( _matchIndexes, length ) {
			return [ length - 1 ];
		} ),

		"eq": createPositionalPseudo( function( _matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		} ),

		"even": createPositionalPseudo( function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"odd": createPositionalPseudo( function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"lt": createPositionalPseudo( function( matchIndexes, length, argument ) {
			var i = argument < 0 ?
				argument + length :
				argument > length ?
					length :
					argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"gt": createPositionalPseudo( function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} )
	}
};

Expr.pseudos[ "nth" ] = Expr.pseudos[ "eq" ];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || ( match = rcomma.exec( soFar ) ) ) {
			if ( match ) {

				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[ 0 ].length ) || soFar;
			}
			groups.push( ( tokens = [] ) );
		}

		matched = false;

		// Combinators
		if ( ( match = rcombinators.exec( soFar ) ) ) {
			matched = match.shift();
			tokens.push( {
				value: matched,

				// Cast descendant combinators to space
				type: match[ 0 ].replace( rtrim, " " )
			} );
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( ( match = matchExpr[ type ].exec( soFar ) ) && ( !preFilters[ type ] ||
				( match = preFilters[ type ]( match ) ) ) ) {
				matched = match.shift();
				tokens.push( {
					value: matched,
					type: type,
					matches: match
				} );
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :

			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[ i ].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?

		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( ( elem = elem[ dir ] ) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( ( elem = elem[ dir ] ) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( ( elem = elem[ dir ] ) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || ( elem[ expando ] = {} );

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] ||
							( outerCache[ elem.uniqueID ] = {} );

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( ( oldCache = uniqueCache[ key ] ) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return ( newCache[ 2 ] = oldCache[ 2 ] );
						} else {

							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( ( newCache[ 2 ] = matcher( elem, context, xml ) ) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[ i ]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[ 0 ];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[ i ], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( ( elem = unmatched[ i ] ) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction( function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts(
				selector || "*",
				context.nodeType ? [ context ] : context,
				[]
			),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?

				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( ( elem = temp[ i ] ) ) {
					matcherOut[ postMap[ i ] ] = !( matcherIn[ postMap[ i ] ] = elem );
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {

					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( ( elem = matcherOut[ i ] ) ) {

							// Restore matcherIn since elem is not yet a final match
							temp.push( ( matcherIn[ i ] = elem ) );
						}
					}
					postFinder( null, ( matcherOut = [] ), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( ( elem = matcherOut[ i ] ) &&
						( temp = postFinder ? indexOf( seed, elem ) : preMap[ i ] ) > -1 ) {

						seed[ temp ] = !( results[ temp ] = elem );
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	} );
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[ 0 ].type ],
		implicitRelative = leadingRelative || Expr.relative[ " " ],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				( checkContext = context ).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );

			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( ( matcher = Expr.relative[ tokens[ i ].type ] ) ) {
			matchers = [ addCombinator( elementMatcher( matchers ), matcher ) ];
		} else {
			matcher = Expr.filter[ tokens[ i ].type ].apply( null, tokens[ i ].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {

				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[ j ].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(

					// If the preceding token was a descendant combinator, insert an implicit any-element `*`
					tokens
						.slice( 0, i - 1 )
						.concat( { value: tokens[ i - 2 ].type === " " ? "*" : "" } )
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( ( tokens = tokens.slice( j ) ) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,

				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find[ "TAG" ]( "*", outermost ),

				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = ( dirruns += contextBackup == null ? 1 : Math.random() || 0.1 ),
				len = elems.length;

			if ( outermost ) {

				// Support: IE 11+, Edge 17 - 18+
				// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
				// two documents; shallow comparisons work.
				// eslint-disable-next-line eqeqeq
				outermostContext = context == document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && ( elem = elems[ i ] ) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;

					// Support: IE 11+, Edge 17 - 18+
					// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
					// two documents; shallow comparisons work.
					// eslint-disable-next-line eqeqeq
					if ( !context && elem.ownerDocument != document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( ( matcher = elementMatchers[ j++ ] ) ) {
						if ( matcher( elem, context || document, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {

					// They will have gone through all possible matchers
					if ( ( elem = !matcher && elem ) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( ( matcher = setMatchers[ j++ ] ) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {

					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !( unmatched[ i ] || setMatched[ i ] ) ) {
								setMatched[ i ] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {

		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[ i ] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache(
			selector,
			matcherFromGroupMatchers( elementMatchers, setMatchers )
		);

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( ( selector = compiled.selector || selector ) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[ 0 ] = match[ 0 ].slice( 0 );
		if ( tokens.length > 2 && ( token = tokens[ 0 ] ).type === "ID" &&
			context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[ 1 ].type ] ) {

			context = ( Expr.find[ "ID" ]( token.matches[ 0 ]
				.replace( runescape, funescape ), context ) || [] )[ 0 ];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr[ "needsContext" ].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[ i ];

			// Abort if we hit a combinator
			if ( Expr.relative[ ( type = token.type ) ] ) {
				break;
			}
			if ( ( find = Expr.find[ type ] ) ) {

				// Search, expanding context for leading sibling combinators
				if ( ( seed = find(
					token.matches[ 0 ].replace( runescape, funescape ),
					rsibling.test( tokens[ 0 ].type ) && testContext( context.parentNode ) ||
						context
				) ) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split( "" ).sort( sortOrder ).join( "" ) === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert( function( el ) {

	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement( "fieldset" ) ) & 1;
} );

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert( function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute( "href" ) === "#";
} ) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	} );
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert( function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
} ) ) {
	addHandle( "value", function( elem, _name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	} );
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert( function( el ) {
	return el.getAttribute( "disabled" ) == null;
} ) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
				( val = elem.getAttributeNode( name ) ) && val.specified ?
					val.value :
					null;
		}
	} );
}

// EXPOSE
var _sizzle = window.Sizzle;

Sizzle.noConflict = function() {
	if ( window.Sizzle === Sizzle ) {
		window.Sizzle = _sizzle;
	}

	return Sizzle;
};

if ( typeof define === "function" && define.amd ) {
	define( function() {
		return Sizzle;
	} );

// Sizzle requires that there be a global window in Common-JS like environments
} else if ( typeof module !== "undefined" && module.exports ) {
	module.exports = Sizzle;
} else {
	window.Sizzle = Sizzle;
}

// EXPOSE

} )( window );

let $ = (function(window, document) {
	"use strict";

	// private event stack
	const observerStack = {};
	// prevents multiple calls for cssSequence
	observerStack.cssRecord = [];
	
	// a slim jQuery like object
	var Junior = function() {
		var coll = Object.create(Array.prototype);
		for (var prop in Junior.prototype) {
			if (Junior.prototype.hasOwnProperty(prop)) {
				coll[prop] = Junior.prototype[prop];
			}
		}
		return coll;
	};

	Junior.prototype = {
		find(selector, context = document) {
			var found = [],
				i, il;

			if (selector === undefined) return;

			if (selector.constructor === String && selector.startsWith("<")) {
				let span = document.createElement("span");
				span.innerHTML = selector;
				return jr("> *", span);
			} else if (selector.constructor === Array) {
				found = selector;
			} else if (selector.nodeType || selector === window) {
				found = [selector];
			} else {
				if (this.length) {
					if (this[0] === window) context = document;
					else {
						this.map(el => found = found.concat(Sizzle(selector, el)));
						return jr(found);
					}
				}
				found = Sizzle(selector, context);
			}
			if (this.length > 0) return jr(found);
			// populate 'this'
			for (i=0, il=found.length; i<il; i++) {
				Array.prototype.push.call(this, found[i]);
			}
			return this;
		},
		map(callback) {
			return this.toArray().map(callback);
		},
		filter(callback) {
			var matches = this.toArray().filter(callback);
			return jr(matches);
		},
		each(callback) {
			return this.map(callback);
		},
		toggleClass(name, state) {
			return this[state ? 'removeClass' : 'addClass'](name);
		},
		is(qualifier, event) {
			switch (qualifier) {
				case ":visible": return $.getStyle_(this[0], "display") !== "none";
				case ":before":
				case ":after":
					let tgt = this[0],
						pseudo = getComputedStyle(tgt, qualifier),
						top = Number(pseudo.getPropertyValue("top").slice(0, -2)),
						left = Number(pseudo.getPropertyValue("left").slice(0, -2)),
						height = Number(pseudo.getPropertyValue("height").slice(0, -2)),
						width = Number(pseudo.getPropertyValue("width").slice(0, -2)),
						eX = event.layerX,
						eY = event.layerY;
					// console.log(top, left, height, width, eX, eY);
					return eX >= left && eX <= left + width && eY >= top && eY <= top + height;
			}
			return this[0].matches(qualifier);
		},
		get(index) {
			var match = this.toArray();
			if (index !== undefined) {
				if (index < 0 || index > match.length - 1) return [];
				match = match[ index >= 0 ? index : match.length - index - 2 ];
			}
			return jr(match);
		},
		toArray() {
			return [].slice.call( this );
		},
		width() {
			return this[0] === window ? this[0].innerWidth : this[0].offsetWidth;
		},
		height() {
			return this[0] === window ? this[0].innerHeight : this[0].offsetHeight;
		},
		offset(selector) {
			let el = this[0],
				off = { top: 0, left: 0, width: el.offsetWidth, height: el.offsetHeight };
			if (selector) {
				while (el) {
					if (el.matches(selector)) break;
					off.top += el.offsetTop;
					off.left += el.offsetLeft;
					el = el.offsetParent;
					if (el == null || el == document.firstChild) return null;
				}
				return off;
			}
			return {
				...off,
				top: el.offsetTop,
				left: el.offsetLeft,
			};
		},
		eq(i) {
			return jr(this[i]);
		},
		nth(i) {
			return jr(this[i]);
		},
		isSame(that) {
			if (!this.length || !that || !that.length) return;
			for (var i=0, il=this.length; i<il; i++) {
				if (this[i] !== that[0]) return;
			}
			return true;
		},
		isChildOf(rEl) {
			let el = this[0];
			while (el !== null) {
				if (el === rEl) return true;
				el = el.parentNode;
			}
		},
		index() {
			var i=0, el;
			if (!this.length || this[0].nodeType === 3) return;
			el = this[0];
			while (el.previousSibling) {
				el = el.previousSibling;
				if (el.nodeType !== 3) i += 1;
			}
			return i;
		},
		hide() {
			for (var i=0, il=this.length; i<il; i++) {
				this[i].style.display = 'none';
			}
			return this;
		},
		show() {
			for (var i=0, il=this.length; i<il; i++) {
				this[i].style.display = "";
			}
			return this;
		},
		inView(port) {
			return this[0].offsetTop > port[0].scrollTop
				&& this[0].offsetTop + this[0].offsetHeight < port[0].scrollTop + port[0].offsetHeight
				&& this[0].offsetLeft > port[0].scrollLeft
				&& this[0].offsetLeft + this[0].offsetWidth < port[0].scrollLeft + port[0].offsetWidth;
		},
		patch(fn) {
			let clone = document.createDocumentFragment();
			this[0].childNodes.map(el => clone.appendChild(el.cloneNode(true)));
			// execute dom manipulations in fragment
			fn(jr(clone));
			// put back manipulated nodes
			this[0].innerHTML = clone.xml.replace(/ xmlns=".*?"/g, "");
			return this;
		},
		cssSequence(name, type, callback) {
			let that = this,
				isAdd = name.slice(0, 1) !== "!",
				record = observerStack.cssRecord,
				fn = event => {
					let el = event.target,
						index = record[name].indexOf(el);
					if (index > -1) {
						record[name].splice(index, 1);
						requestAnimationFrame(() => callback(jr(el), event.propertyName));
					}
					el.removeEventListener(type, fn);
				};
			// keep track of events + elements
			if (record[name] === undefined) record[name] = [];
			// record[name] = [];
			// add only to first element
			this.map(el => {
				// add to memory
				record[name].push(el);
				el.addEventListener(type, fn);
			});

			// trigger animation / transition
			if (isAdd) this.addClass(name);
			else this.removeClass(name.slice(1));
			
			return this;
		},
		includes(el) {
			for (var i=0, il=this.length; i<il; i++) {
				if (this[i] === el) return true;
			}
		},
		matches(value) {
			return this[0].matches(value);
		},
		hasClass(name) {
			let out = false;
			if (this.length) {
				out = name.endsWith("*")
					? [...this[0].classList].find(e => e.startsWith(name.slice(0,-1)))
					: this[0].matches('.'+ name);
			}
			return out;
		},
		addClass(names) {
			var classes = names.split(" ");
			for (var i=0, il=this.length; i<il; i++) {
				classes.filter(a => a).map(name => this[i].classList.add(name));
			}
			return this;
		},
		removeClass(names) {
			var classes = names.split(" ");
			for (var i=0, il=this.length; i<il; i++) {
				classes.map(name => this[i].classList.remove(name));
			}
			return this;
		},
		css(name, value) {
			for (var i=0, il=this.length, fixedName; i<il; i++) {
				if (value) {
					fixedName = fixStyleName(name);
				} else {
					switch (typeof (name)) {
						case 'string':
							if (name.startsWith("--")) {
								return this[i].style.getPropertyValue(name).trim();
							} else {
								return $.getStyle_(this[i], name);
							}
						case 'object':
							for (var key in name) {
								if (key.startsWith("--")) {
									this[i].style.setProperty(key, name[key]);
								} else {
									fixedName = fixStyleName(key);
									let val = name[key];
									if (["top", "left", "right", "bottom", "width", "height"].includes(key)
										&& val && val !== "auto"
										&& !val.toString().endsWith("px")
										&& !val.toString().endsWith("em")
										&& !val.toString().endsWith("%")) {
										val = name[key] +"px";
									}
									this[i].style[fixedName] = val;
								}
							}
							break;
					}
				}
			}
			return this;
		},
		val(str, el) {
			if (this.length === 1) {
				switch (true) {
					case this.hasClass("toolbar-selectbox_"):
						this.find(".selectbox-selected_").html(str);
						break;
					case this[0].nodeName.toLowerCase() === "selectbox":
						if (this.find(".option").length) {
							if (str) {
								this.find(".option[selected]").removeAttr("selected");
								let oEl = this.find(`.option[value="${str}"]`);
								if (oEl.length) oEl.attr({ selected: true });
							}
							return this.find(".option[selected]").attr("value");
						}
						break;
				}
				// return;
			}
			if (!str && str !== "" && isNaN(str)) {
				let v = this.length ? this[0].value : "";
				// if (this.length && this[0].getAttribute("value")) v = this[0].getAttribute("value");
				if (this.length && this[0].getAttribute("value") && !v) v = this[0].getAttribute("value");
				return v;
			}
			for (var i = 0, il = this.length; i < il; i++) {
				this[i].value = str;
			}
			return this;
		},
		text(str, el) {
			if (!str && str !== "") {
				return this.length ? this[0].textContent : "";
			}
			for (var i = 0, il = this.length; i < il; i++) {
				this[i].textContent = str;
			}
			return this;
		},
		html(str, el) {
			if (!str && str !== "" && isNaN(str)) {
				return this.length ? this[0].innerHTML : "";
			}
			for (var i = 0, il = this.length; i < il; i++) {
				if (str.cssSequence) {
					this[i].innerHTML = "";
					this[i].appendChild(str[0]);
				} else {
					this[i].innerHTML = str;
				}
			}
			return this;
		},
		toggleAttr(name, state) {
			return this[state ? 'removeAttr' : 'attr'](name, name);
		},
		removeAttr(name) {
			var names = name.split(" "),
				arr = this,
				key;
			for (var i=0, il=arr.length; i<il; i++) {
				names.map(name => arr[i].removeAttribute(name));
			}
			return this;
		},
		attr(name, value, prefix) {
			var arr = this,
				key;
			prefix = prefix || "";

			if (!arr.length) return;

			for (var i=0, il=arr.length; i<il; i++) {
				if (!value) {
					switch (name.constructor) {
						case String:
							return arr[i].getAttribute(name);
						case Object:
							for (key in name) {
								arr[i].setAttribute(prefix + key, name[key]);
							}
							break;
					}
				} else if (name && value) {
					arr[i].setAttribute(prefix + name, value);
				}
			}
			return this;
		},
		data(name, value) {
			if (!value && name.constructor === String) {
				return this.attr("data-"+ name);
			}
			return this.attr(name, value, "data-");
		},
		cssProp(name, el) {
			return getComputedStyle(el || this[0]).getPropertyValue(name).trim();
		},
		prop(name, value, el) {
			var fix = { 'class': 'className' },
				arr = (el) ? [el] : this,
				key;
			for (var i=0, il=arr.length; i<il; i++) {
				if (!value) {
					switch (typeof (name)) {
						case 'string':
							name = fix[name] || name;
							if (arr[i].nodeName === "svg" && name === "className") {
								return arr[i].getAttribute("class");
							}
							return arr[i][name];
						case 'object':
							for (key in name) {
								arr[i][key] = name[key];
							}
							break;
					}
				} else if (name && value) {
					name = fix[name] || name;
					arr[i][name] = value;
				}
			}
			return arr;
		},
		nodeName() {
			return this.length ? this[0].nodeName.toLowerCase() : undefined;
		},
		shadowRoot() {
			return this.length ? $(this[0].shadowRoot) : false;
		},
		parent() {
			return this.parents();
		},
		parents(selector) {
			var found = [],
				il = this.length,
				i = 0,
				el;
			if (selector && selector.slice(0,1) === '?') {
				selector = selector.slice(1);
				for (; i<il; i++) {
					if (this[i].matches(selector)) {
						found.push(this[i]);
					}
				}
			}
			let isFirst = selector && selector.slice(-6) === ':first';
			selector = selector || '*';
			selector = isFirst ? selector.slice(0,-6) : selector;

			for (i=0; i<il; i++) {
				el = this[i].parentNode;
				while (el && el.nodeType !== 9) {
					if (el.nodeType === Node.DOCUMENT_FRAGMENT_NODE || el.matches(selector)) {
						found.push(el);
						break;
					}
					el = el.parentNode;
				}
			}
			if (isFirst && found.length) found = found[0];
			return jr(found);
		},
		clone(deep) {
			var cloned = [];
			for (var i=0, il=this.length; i<il; i++) {
				cloned.push(this[i].cloneNode(deep));
			}
			return jr(cloned);
			//return this.length ? this[0].cloneNode(deep) : false;
		},
		insert(type, source, el) {
			var arr = el && el.nodeName ? [el] : this,
				new_arr = [],
				isStr = typeof(source) === "string",
				div = document.createElement("div"),
				moveEl,
				movedEl,
				moveAccNr;
			if (isStr) div.innerHTML = source;
			else if (source.constructor === Array) {
				source.map(item => div.appendChild(item));
				isStr = true;
			} else {
				source = source.nodeType ? source : source[0];
				div.appendChild(div.cloneNode(false));
			}
			for (var i=0, il=arr.length; i<il; i++) {
				for (var j=0, jl=div.childNodes.length; j<jl; j++) {
					if (isStr) {
						let x = type === "prepend" ? jl-j-1 : j;
						moveEl = div.childNodes[x].cloneNode(true);
					} else {
						moveEl = source;
					}
					moveAccNr = moveEl[system_.id];
					switch (type) {
						case "before":
							if (isAdjacentSibling(arr[i], moveEl) === -1) continue;
							movedEl = arr[i].parentNode.insertBefore(moveEl, arr[i]);
							break;
						case "after":
							if (isAdjacentSibling(arr[i], moveEl) === 1) continue;
							movedEl = arr[i].parentNode.insertBefore(moveEl, arr[i].nextSibling);
							break;
						case "append":
							movedEl = arr[i].appendChild(moveEl);
							break;
						case "prepend":
							movedEl = arr[i].insertBefore(moveEl, arr[i].firstChild);
							break;
						case "insertAt":
							movedEl = arr[i].insertBefore(moveEl, arr[i].childNodes[el]);
							break;
					}
					movedEl[system_.id] = moveAccNr;
					new_arr.push(movedEl);
				}
			}
			//important to return new instance of junior along with appended element
			return jr(new_arr);
		},
		before(str, el) {
			return this.insert("before", str, el);
		},
		after(str, el) {
			return this.insert("after", str, el);
		},
		prepend(str, el) {
			return this.insert("prepend", str, el);
		},
		append(str, el) {
			return this.insert("append", str, el);
		},
		insertAt(str, index) {
			return this.insert("insertAt", str, index);
		},
		focus() {
			this[0].focus();
			return this;
		},
		blur() {
			this[0].blur();
			return this;
		},
		select() {
			this[0].focus();
			this[0].select();
			return this;
		},
		remove(el) {
			var arr = (el)? [el] : this;
			for (var i=0, il=arr.length; i<il; i++) {
				arr[i].parentNode.removeChild(arr[i]);
			}
			return this;
		},
		replace(str) {
			let replaced = this.after(str);
			this.remove();
			return jr(replaced);
		},
		nextPrev(selector, direction, keepThis, once) {
			var found = [],
				el,
				isFirst = selector && selector.slice(-6) === ':first';
			
			selector = selector || '*';
			selector = isFirst ? selector.slice(0,-6) : selector;

			if (keepThis) {
				for (var i=0, il=this.length; i<il; i++) {
					found.push(this[i]);
				}
			}

			for (var i=0, il=this.length; i<il; i++) {
				el = this[i];
				while (el) {
					el = el[direction];
					if (!el) break;
					if (el.nodeType === 1 && el.matches(selector)) {
						found.push(el);
					}
					if (once) break;
				}
			}
			if (isFirst && found.length) found = found[0];
			return jr(found);
		},
		next(selector, keepThis) {
			return this.nextPrev(selector, 'nextSibling', keepThis, true);
		},
		prev(selector, keepThis) {
			return this.nextPrev(selector, 'previousSibling', keepThis, true);
		},
		nextAll(selector, keepThis) {
			return this.nextPrev(selector, 'nextSibling', keepThis);
		},
		prevAll(selector, keepThis) {
			return this.nextPrev(selector, 'previousSibling', keepThis);
		},
		on(types, selector, callback) {
			let EventManager = system_.eventManager_,
				events = EventManager.nativeEvents;
			callback = (typeof selector === 'function') ? selector : callback;
			selector = (typeof selector === 'string') ? selector : false;
			if (jr.isHHD) {
				types = types.split(" ").map(e => {
						let eI = jr.mouseEvents.indexOf(e);
						return eI > -1 ? jr.pointerEvents[eI] : e;
					}).join(" ");
			}
			for (var i=0, il=this.length; i<il; i++) {
				if (!selector) {
					types.split(" ").map(type => {
						if (events.includes(type)) this[i].addEventListener(type, callback, this[i] === document);
						else EventManager.addEvent_(this[i], type, callback);
					});
				} else {
					EventManager.addEvent_(this[i], types, callback, selector);
				}
			}
			return this;
		},
		off(types, selector, callback) {
			let EventManager = system_.eventManager_,
				events = EventManager.nativeEvents;
			callback = (typeof selector === 'function') ? selector : callback;
			selector = (typeof selector === 'string') ? selector : false;
			if (jr.isHHD) {
				types = types.split(" ").map(e => {
						let eI = jr.mouseEvents.indexOf(e);
						return eI > -1 ? jr.pointerEvents[eI] : e;
					}).join(" ");
			}
			for (var i=0, il=this.length; i<il; i++) {
				if (!selector) {
					types.split(" ").map(type => {
						if (events.includes(type)) this[i].removeEventListener(type, callback, this[i] === document);
						else EventManager.removeEvent_(this[i], type, callback);
					});
				} else {
					EventManager.removeEvent_(this[i], types, callback, selector);
				}
			}
			return this;
		},
		bind(types, callback) {
			if (jr.isHHD) {
				types = types.split(" ").map(e => {
						let eI = jr.mouseEvents.indexOf(e);
						return eI > -1 ? jr.pointerEvents[eI] : e;
					}).join(" ");
			}
			return this.on(types, false, callback);
		},
		unbind(types, callback) {
			if (jr.isHHD) {
				types = types.split(" ").map(e => {
						let eI = jr.mouseEvents.indexOf(e);
						return eI > -1 ? jr.pointerEvents[eI] : e;
					}).join(" ");
			}
			return this.off(types, false, callback);
		},
		scrollParent(el) {
			if (el == null) return;
			let rx = /(auto|scroll)/;
			let check = el.scrollHeight > el.clientHeight
					&& rx.test(this.cssProp("overflow", el));
			return check ? el : this.scrollParent(el.parentNode);
		},
		scrollIntoView() {
			// assumes single item in "this"
			let el = this[0];
			setTimeout(() => {
				this.scrollParent(el).scrollTop = +el.offsetTop -
					parseInt($.getStyle_(el, "margin-top"), 10) -
					parseInt($.getStyle_(el.parentNode, "padding-top"), 10);
			}, 1);
			return this;
		},
		scrollLeft(x) {
			return x === undefined ? this[0].scrollLeft : this.scrollTo(x || 0, this[0].scrollTop);
		},
		scrollTop(y) {
			return y === undefined ? this[0].scrollTop : this.scrollTo(this[0].scrollLeft, y || 0);
		},
		scrollTo(x, y) {
			for (var i=0, il=this.length; i<il; i++) {
				this[i].scrollLeft = x;
				this[i].scrollTop = y;
			}
			return this;
		},
		trigger(types, el) {
			var arr = el ? [el] : this,
				type = types.split(/\s+/),
				i=0, il=arr.length,
				j=0, jl=type.length,
				events = system_.eventManager_.nativeEvents,
				isNative, isStyle, event, listener;

			for (; j<jl; j++) {
				isNative = events.indexOf(type[j]) > -1;
				isStyle = type[j].indexOf('style.') > -1;

				if (isNative) {
					event = document.createEvent('MouseEvents');
					event.initEvent(type[j], true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
				} else {
					event = document.createEvent('Event');
					event.initEvent(type[j], true, true);
				}
				for (; i<il; i++) {
					el = arr[i];
					if (isNative) {
						el.dispatchEvent(event);
					} else {
						system_.eventManager_.handleEvent_.apply(el, [{ type: "input", target: el }]);
					}
				}
			}
			return this;
		}
	};

	// junior base
	var jr = function() {
			var new_junior = new Junior();
			return new_junior.find.apply(new_junior, arguments);
		};


	// junior auxiliary
	var auxiliary_ = {
		decl_: `<?xml version="1.0" encoding="UTF-8"?>`,
		ready_(fn) {
			if (document.readyState === 'complete') {
				fn();
			} else {
				let func = window.onload;
				window.onload = () => {
					if (typeof func === 'function') func();
					fn();
				};
			}
		},
		fetch: async function(path, options) {
			let request = await fetch(path, options),
				contentType = request.headers.get("Content-Type"),
				kind = path.slice(path.lastIndexOf(".")+1),
				arrayBuffer,
				buffer,
				reader,
				size,
				data,
				handleResponseType = async () => {
					// reader = request.clone().body.getReader();
					size = +request.headers.get("Content-Length");
					let result = { path, size, kind, status: request.status },
						clone = request.clone(),
						blob;
					if (options) {
						result.ims = +request.headers.get("ims");

						if (options.responseType) {
							// set result type
							result.type = options.responseType;
						}
						switch (options.responseType) {
							case "arrayBuffer":
								request.responseType = "arrayBuffer";
								result.arrayBuffer = await clone.arrayBuffer();
								// result.arrayBuffer = new Uint8Array(arrayBuffer);
								break;
							case "blob":
								try {
									result.blob = await clone.blob();
								} catch {
									return { error: "fail" };
								}
								break;
							case "xml":
								data = await request.text();
								result.data = this.xmlFromString(data);
								break;
							case "text":
								blob = await clone.blob();
								result.data = await blob.text();
								break;
						}
					}

					return result;
				};

			switch (request.status) {
				case 400:
				case 401:
				case 403:
				case 404:
					return { error: request.status };
			}
			
			if (!contentType) return await request.text();
			if (options && options.responseType === "blob" && !path.startsWith("/app/")) {
				// console.log( options );
				return handleResponseType();
			}

			switch (contentType.split(";")[0]) {
				case "audio/x-aiff":
				case "audio/wav":
				case "audio/mpeg":
				case "audio/ogg":
					request.responseType = "arrayBuffer";
					data = await request.arrayBuffer();
					return data;
				case "audio/midi":
					size = +request.headers.get("Content-Length");
					arrayBuffer = await request.clone().arrayBuffer();
					buffer = new Uint8Array(arrayBuffer);
					data = await request.text();
					return { path, size, buffer, data, status: request.status };
				case "text/css":
				case "text/markdown":
					if (options && options.responseType) return handleResponseType();
					else return await request.text();
				case "text/javascript":
				case "application/javascript":
					if (options && options.responseType) return handleResponseType();
					data = await request.text();
					data = data.replace(/document.currentScript.src/g, `"${path}"`);
					data = data.replace(/document.currentScript/g, `1`);
					let mod = {},
						code = `let exports = {}; ${data}; if (Object.keys(exports).length) module.exports = exports;`;
					new Function("module", "$", code).call({}, mod, $);
					return mod.exports;
				case "application/json":
					if (options && options.responseType === "text") return handleResponseType();
					return request.json();
				case "application/xml":
					data = await request.text();
					let xDoc = jr.xmlFromString(data);
					if (path.startsWith("/app/") && !xDoc.documentElement.getAttribute("mDate")) {
						let mDate = new Date(+request.headers.get("ims"));
						xDoc.documentElement.setAttribute("mDate", mDate.valueOf());
					}
					if (options && options.responseType === "xml") {
						size = +request.headers.get("Content-Length");
						return { path, size, type: "xml", data: xDoc.documentElement };
					}
					return xDoc;
				case "text/csv":
				case "text/license":
					return await request.text();
				case "mail/html":
					return await request.text();
				default:
					return handleResponseType();
			}
		},
		getStyle_(el, name) {
			name = name.replace(/([A-Z]|^ms)/g, "-$1").toLowerCase();
			var value = getComputedStyle(el, null).getPropertyValue(name);
			if (name === "opacity") {
				if ($.getStyle_(el, "display") === "none") {
					el.style.display = "block";
					el.style.opacity = "0";
					value = "0";
				}
			}
			if (value === "auto") {
				switch (name) {
					case "top":    value = el.offsetTop; break;
					case "left":   value = el.offsetLeft; break;
					case "width":  value = el.offsetWidth; break;
					case "height": value = el.offsetHeight; break;
				}
			}
			return value;
		},
		getScript_(url, callback) {
			var script = document.createElement("script"),
				head = document.head || document.documentElement;
			script.async = true;
			script.src = url;
			script.onload = script.onreadystatechange = () => {
				if (!script.readyState || /loaded|complete/.test(script.readyState)) {
					callback();
				}
			};
			head.insertBefore(script, head.firstChild);
		},
		grep_(list, callback) {
			var matches = [];
			list.toArray().map((el, index) => {
				if (callback(el, index)) matches.push(el);
			});
			return matches;
		},
		extend_(safe, deposit) {
			var content;
			for (content in deposit) {
				if (!safe[content] || typeof(deposit[content]) !== "object") {
					safe[content] = deposit[content];
				} else {
					this.extend_(safe[content], deposit[content]);
				}
			}
			return safe;
		},
		flush_(win, app, kill) {
			system_.eventManager_.flushHandlers_(win[0]);
			if (kill && app && app.dispatch) system_.bank_.clearbyHandler_(app.dispatch);
		},
		cookie: {
			remove(name) {
				this.set(name, "", -1);
			},
			get(name) {
				var v = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
				return v ? v[2] : null;
			},
			set(name, value, days) {
				var d = new Date;
				d.setTime(d.getTime() + (60 * 60 * 1e3 * 24) * (days || 7));
				document.cookie = name + "=" + value + ";sameSite=strict;path=/;expires=" + d.toGMTString();
			}
		},
		history: {
			doPush: true,
			pop: function(state) {
				this.doPush = false;
				//emit state event
				this.doPush = true;
			},
			push: function(state) {
				if (!this.doPush || JSON.stringify(state) === JSON.stringify(history.state)) return;
				var qryString = $.history.serialize(state),
					url = document.location.pathname;
				if (qryString) url += '?'+ qryString;
				history.pushState(state, null, url);
			},
			serialize: function(obj) {
				var str = [];
				for (var p in obj) {
					if (obj.hasOwnProperty(p)) {
						str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
					}
				}
				return str.join("&");
			},
			unserialize: function(url) {
				var str = url.indexOf('?') === 0 ? url.slice(1) : url,
					params = str.split('&'),
					i = 0, il = params.length,
					ret = {},
					parts,
					val;

				for (; i<il; i++) {
					parts = params[i].split('=');
					if (!parts[0]) continue;
					val = decodeURIComponent(parts[1]);

					switch (val) {
						case ('true' || 'false'):
							val = val === 'true';
							break;
						default:
							if (val === (+val).toString()) val = +val;
					}

					ret[decodeURIComponent(parts[0])] = val;
				}
				return JSON.stringify(ret) === '{}' ? false : ret;
			}
		},
		svgFromString(str) {
			let ns = "http://www.w3.org/2000/svg",
				svg = document.createElementNS(ns, "svg");
			svg.innerHTML = str;
			return svg.childNodes.map(e => e.cloneNode(true));
		},
		xmlFromString(str) {
			var parser = new DOMParser(),
				xdoc = parser.parseFromString(str, "application/xml");
			if (xdoc.querySelector("parsererror")) {
				throw `Parsererror: ${str}`;
			}
			return xdoc;
		},
		nodeFromString(str) {
			var xml = `<data>${str}</data>`,
				doc = this.xmlFromString(xml);
			return doc.documentElement.firstChild;
		},
		prettyPrint_(node) {
			return node.xml;
		},
		regExpEscape_: str => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"),
		emoticons(str) {
			let emotes = [":)", ":-)", ":(", ";)", ":P", ":*", ":D", "&lt;3",
					":joy:",
					":gloria:",
					":heart:",
					":heart_eyes:",
					":sunglasses:"];
			emotes.map(emote => {
				str = str.replace(new RegExp(this.regExpEscape_(emote), "gi"), m => {
					return (i => i > -1 ? `<i emo="${emotes[i]}"></i>` : m)(emotes.indexOf(m))
				});
			});
			return str;
		},
		banners(str) {
			let rec = {
					giphy: {
						rx: /\/\w+ (<img src=".*?">)/,
						htm:`<div class="giphy-wrapper">$1</div>`,
					}
				};
			Object.keys(rec).map(key => {
				if (str.match(rec[key].rx)) {
					str = str.replace(rec[key].rx, rec[key].htm);
				}
			});
			return str;
		},
		cipher(text, salt) {
			let textToChars = text => text.split("").map(c => c.charCodeAt(0)),
				byteHex = n => ("0" + Number(n).toString(16)).substr(-2),
				applySaltToChar = code => textToChars(salt).reduce((a,b) => a ^ b, code);
			return text.split("")
				.map(textToChars)
				.map(applySaltToChar)
				.map(byteHex)
				.join("");
		},
		decipher(encoded, salt) {
			let textToChars = text => text.split("").map(c => c.charCodeAt(0)),
				applySaltToChar = code => textToChars(salt).reduce((a,b) => a ^ b, code);
			return encoded.match(/.{1,2}/g)
				.map(hex => parseInt(hex, 16))
				.map(applySaltToChar)
				.map(charCode => String.fromCharCode(charCode))
				.join("");
		},
		uuidv4() {
			return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
				let r = Math.random() * 16 | 0,
					v = c == "x" ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		},
		parseJwt_(token) {
			let base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
				payload = decodeURIComponent(atob(base64).split("").map(c =>
					"%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
			return JSON.parse(payload);
		}
	};

	// private system stuff
	var system_ = {
		id: "jr-"+ Date.now(),
		init_() {
			this.eventManager_.init_();
		},
		bank_: {
			guid_: 0,
			vault_: {},
			flushAll(el) {
				if (!el) return;
				var id = el[system_.id];
				delete this.vault_[id];
				delete el[system_.id];
			},
			empty_(el, name, selector) {
				var id = el[system_.id],
					safe = this.vault_[id],
					content = safe ? safe[name] : el.dataset[name];
				if (safe) {
					delete safe[name];
				}
				el.removeAttribute("data-" + name);
				return content;
			},
			balance_(el, name) {
				var id = el[system_.id],
					safe = this.vault_[id];
				return safe ? safe[name] : {};
			},
			deposit_(el, name, value) {
				var id = el[system_.id] = el[system_.id] || ++this.guid_,
					safe = this.vault_[id] = this.vault_[id] || {}, content, key;
				if (typeof (name) === "object") {
					system_.extend_(safe, name);
				} else {
					safe[name] = value;
				}
			},
			clearbyHandler_(handler) {
				for (let key in this.vault_) {
					for (let safe in this.vault_[key]) {
						let locker = this.vault_[key][safe];
						for (let event in locker) {
							for (let item in locker[event]) {
								if (locker[event][item].handler === handler) {
									delete locker[event];
								}
							}
						}
					}
				}
			}
		},
		eventManager_: {
			init_() {
				this.guid_ = 1;
				this.nativeEvents = "paste blur focus focusin focusout load resize scroll beforeunload unload click dblclick dragover drop "+
									"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave "+
									"change select submit keydown keypress keyup error contextmenu".split(" ");
				// handheld devices
				jr.isHHD = "ontouchstart" in window || /Mobi|Android/i.test(navigator.userAgent);
				jr.mouseEvents = "mousedown mousemove mouseup".split(" ");
				jr.touchEvents = "touchstart touchmove touchend".split(" ");
				jr.pointerEvents = jr.isHHD ? jr.touchEvents : jr.mouseEvents;
			},
			flushHandlers_(e) {
				var elem = (e.nodeType) ? e : e.target;
				if (!elem.getElementsByTagName) return;
				var children = elem.getElementsByTagName("*"),
					sysId = system_.id,
					i = 0,
					il = children.length;
				for (; i < il; i++) {
					this.removeEvent_(children[i]);
					system_.bank_.flushAll(children[i]);
					delete children[i][sysId];
				}
				system_.bank_.flushAll(elem[sysId]);
				delete elem[sysId];
				this.removeEvent_(elem);
			},
			addEvent_(elem, types, handler, selector) {
				var type = types.split(/\s+/),
					i = 0,
					il = type.length,
					events = {},
					guid_;
				
				handler._guid_ = handler._guid_ || ++this.guid_;
				
				for (; i < il; i++) {
					guid_ = ++this.guid_;
					events[type[i]] = {};
					events[type[i]][guid_] = {
						guid_: guid_,
						handler: handler,
						selector: selector
					};
				}
				system_.bank_.deposit_(elem, { events });

				for (i=0; i<il; i++) {
					// if (elem["on" + type[i]] && elem["on" + type[i]] !== this.handleEvent_) {
					// 	events[type[i]][0] = { handler: elem["on" + type[i]] };
					// 	system_.bank_.deposit_(elem, { events });
					// }
					let options = type[i] === "scroll"; // useCapture
					// if ($.isHHD && jr.touchEvents.includes(type[i])) options = { passive: false }; 
					elem.addEventListener(type[i], this.handleEvent_, options);
				}
			},
			removeEvent_(elem, types, handler, selector) {
				if (arguments.length === 1) {
					system_.bank_.flushAll(elem);
					return;
				}
				var type = types.split(/\s+/),
					i = 0,
					il = type.length,
					vault = system_.bank_.vault_,
					shelf,
					safe,
					key,
					content;

				//if (types && handler) {
				if (handler) {
					shelf = vault[elem[system_.id]];
					for (; i<il; i++) {
						safe = shelf.events[type[i]];
						for (key in safe) {
							content = safe[key];
							if (content.handler._guid_ === handler._guid_ && content.selector === selector) {
								delete safe[key];
								break;
							}
						}
						if (safe && !Object.keys(safe).length) {
							delete shelf.events[type[i]];
							elem.removeEventListener(type[i], this.handleEvent_, false);
						}
						//elem.removeEventListener(type[i], this.handleEvent_, false);
					}
					if (shelf && Object.keys(shelf.events).length < 1) {
						delete vault[elem[system_.id]];
					}
				}
			},
			handleEvent_(event, touchIndex=0) {
				var returnValue = true,
					ev = event,
					type = event.type,
					target = event.target,
					handlers = system_.bank_.balance_(this, "events"),
					_handlers,
					_name,
					_eventHandler,
					_handleSelector;

				if (!handlers) return returnValue;
				_handlers = handlers[type];
				event.stopPropagation = function() {
					this.isBubblingCanceled = true;
				};
				// for handheld devices
				if (jr.isHHD && jr.touchEvents.includes(type)) {
					let touch = event.targetTouches && event.targetTouches.length;
					let eI = jr.pointerEvents.indexOf(type);
					type = eI > -1 ? jr.mouseEvents[eI] : type;
					ev = {
						...event,
						type,
						target,
						button: 0,
						preventDefault() {},
						targetTouches: event.targetTouches,
						changedTouches: event.changedTouches,
						clientX: touch ? event.targetTouches[touchIndex].clientX : 0,
						clientY: touch ? event.targetTouches[touchIndex].clientY : 0,
						pagetX: touch ? event.targetTouches[touchIndex].pageX : 0,
						pagetY: touch ? event.targetTouches[touchIndex].pageY : 0,
						layerX: touch ? event.targetTouches[touchIndex].layerX : 0,
						layerY: touch ? event.targetTouches[touchIndex].layerY : 0,
					};
					if (!ev.targetTouches.length && event.changedTouches) {
						ev.clientX = touch ? event.changedTouches[touchIndex].clientX : 0;
						ev.clientY = touch ? event.changedTouches[touchIndex].clientY : 0;
					}
				}
				while (target !== null && target !== this) {
					for (_name in _handlers) {
						_eventHandler = _handlers[_name];
						_handleSelector = _eventHandler.selector;
						if (_handleSelector && target.matches(_handleSelector)) {
							if (_eventHandler.handler.call(target, ev) === false) {
								returnValue = false;
							}
							if (ev.isBubblingCanceled) {
								return returnValue;
							}
						}
					}
					target = target.parentNode;
				}
				if (!ev.isBubblingCanceled) {
					for (_name in _handlers) {
						_eventHandler = _handlers[_name];
						if (_eventHandler.selector) continue;
						if (type === "touchend") {
							ev.target = document.elementFromPoint(ev.clientX, ev.clientY);
						}
						if (_eventHandler.handler.call(this, ev) === false) {
							returnValue = false;
						}
						if (type === "touchmove") {
							// trigger "fake" / custom event for "touchover"
							ev.type = "touchover";
							ev.target = document.elementFromPoint(ev.clientX, ev.clientY);
							_eventHandler.handler.call(this, ev);
						}
					}
				}
				if (jr.isHHD && touchIndex === 0 && event.touches && event.touches.length > 1) {
					this.handleEvent_(event, 1);
				}
				return returnValue;
			}
		},
		extend_(safe, deposit) {
			for (var content in deposit) {
				if (!safe[content] || typeof (deposit[content]) !== "object") {
					safe[content] = deposit[content];
				} else {
					this.extend_(safe[content], deposit[content]);
				}
			}
			return safe;
		}
	},
	// auxillary functions
	fixStyleName = function(name) {
		return name.replace(/-([a-z]|[0-9])/ig, function(m, letter) {
			return (letter + "").toUpperCase();
		});
	},
	isAdjacentSibling = function(el1, el2) {
		var currParentEl = el1.parentNode,
			currEl = el1,
			isAdjacent = false;
		if (!currParentEl || !el2.parentNode) return isAdjacent;
		while (!isAdjacent && currEl && currParentEl.firstChild !== currEl) {
			currEl = currEl.previousSibling;
			if (currEl.nodeType === 3) continue;
			if (currEl === el2) isAdjacent = -1;
			break;
		}
		currEl = el1;
		while (!isAdjacent && currEl && currParentEl.lastChild !== currEl) {
			currEl = currEl.nextSibling;
			if (currEl.nodeType === 3) continue;
			if (currEl === el2) isAdjacent = 1;
			break;
		}
		return isAdjacent;
	};

	if (!Element.prototype.matches) {
		Element.prototype.matches = 
		Element.prototype.matchesSelector || 
		Element.prototype.webkitMatchesSelector ||
		function(s) {
			var matches = (this.document || this.ownerDocument).querySelectorAll(s),
				i = matches.length;
			while (--i >= 0 && matches.item(i) !== this) {}
			return i > -1;            
		};
	}

	// inititate system object
	system_.init_();

	// extending Object (backwards compatibility)
	if (typeof Object.create !== "function") {
		Object.create = function(o, props) {
			function F() {}
			F.prototype = o;
			if (typeof(props) === "object") {
				for (var prop in props) {
					if (props.hasOwnProperty((prop))) {
						F[prop] = props[prop];
					}
				}
			}
			return new F();
		};
	}
	// extending Canvas
	if (!CanvasRenderingContext2D.prototype.clear) {
		CanvasRenderingContext2D.prototype.clear = function() {
			this.canvas.width = this.canvas.width;
		};
	}
	if (!CanvasRenderingContext2D.prototype.roundRect) {
		CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
			this.save();
			this.translate(x, y);
			this.moveTo(width / 2, 0);
			this.arcTo(width, 0, width, height, Math.min(height / 2, radius));
			this.arcTo(width, height, 0, height, Math.min(width / 2, radius));
			this.arcTo(0, height, 0, 0, Math.min(height / 2, radius));
			this.arcTo(0, 0, radius, 0, Math.min(width / 2, radius));
			this.lineTo(width / 2, 0);
			this.restore();
		};
	}
	if (!CanvasRenderingContext2D.prototype.dashedRect) {
		CanvasRenderingContext2D.prototype.dashedRect = function(x, y, w, h) {
			this.save();
			this.translate(.5, .5);
			this.lineWidth = 1;
			this.strokeStyle = "#000";
			this.strokeRect(x, y, w, h);
			this.strokeStyle = "#fff";
			this.setLineDash([5]);
			this.strokeRect(x, y, w, h);
			this.restore();
		};
	}
	if (!CanvasRenderingContext2D.prototype.dashedEllipse) {
		CanvasRenderingContext2D.prototype.dashedEllipse = function(x, y, w, h) {
			let pi2 = Math.PI * 2;
			this.save();
			this.translate(.5, .5);
			this.lineWidth = 1.25;
			this.strokeStyle = "#000";
			this.beginPath();
			this.ellipse(x, y, w, h, 0, 0, pi2);
			this.stroke();
			this.strokeStyle = "#fff";
			this.setLineDash([5]);
			this.beginPath();
			this.ellipse(x, y, w, h, 0, 0, pi2);
			this.stroke();
			this.restore();
		};
	}
	if (!CanvasRenderingContext2D.prototype.dashedPolygon) {
		CanvasRenderingContext2D.prototype.dashedPolygon = function(points) {
			let wL = [...points],
				bL = [...points];
			this.save();
			// this.translate(.5, .5);
			this.lineWidth = 1.3;
			// black line
			this.strokeStyle = "#000";
			this.beginPath();
			this.moveTo(bL.shift(), bL.shift());
			while (bL.length) this.lineTo(bL.shift(), bL.shift());
			this.stroke();
			// white line
			this.strokeStyle = "#fff";
			this.setLineDash([5]);
			this.beginPath();
			this.moveTo(wL.shift(), wL.shift());
			while (wL.length) this.lineTo(wL.shift(), wL.shift());
			this.stroke();
			this.restore();
		};
	}
	// extending Date
	if (!Date.prototype.getWeek) {
		Date.prototype.getWeek = function() {
			var date = new Date(this.getTime());
			date.setHours(0, 0, 0, 0);
			date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
			var week1 = new Date(date.getFullYear(), 0, 4);
			return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
		}
	}
	if (!Date.prototype.setWeek) {
		Date.prototype.setWeek = function(week) {
			let simple = new Date(this.getFullYear(), 0, 1 + (week - 1) * 7),
				dayOfWeek = simple.getDay(),
				isoWeekStart = simple;
			// Get the Monday past, and add a week if the day was Friday, Saturday or Sunday.
			isoWeekStart.setDate(simple.getDate() - dayOfWeek + 1);
			if (dayOfWeek > 4) isoWeekStart.setDate(isoWeekStart.getDate() + 7);
			// update self date object
			this.setTime(isoWeekStart.getTime());
		}
	}
	// extending Number
	if (!Number.prototype.format) {
		Number.prototype.format = function(s=",") {
			return this.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1"+s);
		};
	}
	if (!Number.prototype.toHex) {
		Number.prototype.toHex = function() {
			let v = this.toString(16);
			if ((v.length % 2) > 0) v = "0"+ v;
			return `0x${v.toUpperCase()}`;
		};
	}
	// extending String
	if (!String.prototype.escapeHtml) {
		String.prototype.escapeHtml = function() {
			return this.replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;")
						.replace(/"/g, "&quot;")
						.replace(/'/g, "&apos;");
		};
	}
	if (!String.prototype.stripHtml) {
		String.prototype.stripHtml = function() {
			return this.replace(/<[^>]+>/g, "");
		};
	}
	if (!String.prototype.trim) {
		String.prototype.trim = function() {
			return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
		};
	}
	if (!String.prototype.fill) {
		String.prototype.fill = function(i,c) {
			var str = this;
			c = c || " ";
			for (; str.length<i; str+=c){}
			return str;
		};
	}
	if (!String.prototype.padStart) {
		String.prototype.padStart = function(str, length) {
			var s = this;
			while (s.length < length) s = str + s;
			return s;
		}
	}
	if (!String.prototype.sha1) {
		String.prototype.sha1 = function() {
			return sha1.binb2hex(sha1.core_sha1(sha1.str2binb(this), this.length * sha1.chrsz));
		};
	}
	if (!String.prototype.timeValue) {
		String.prototype.timeValue = function() {
			let [h,m] = this.split(":");
			return this.includes(":") ? +h + (+m / 60) : this;
		};
	}
	if (!String.prototype.guessType) {
		String.prototype.guessType = function() {
			switch (true) {
				case (this == +this): return +this;
				case (this === "false"): return false;
				case (this === "true"): return true;
				case (this.startsWith("[") && this.endsWith("]")): return JSON.parse(this);
				default: return this;
			}
		};
	}
	if (!Math.TAU) {
		Math.TAU = Math.PI * 2;
	}
	if (!Math.clamp) {
		Math.clamp = function(v,l,h) {
			return this.max(l, this.min(v, h));
		};
	}
	if (!Math.lerp) {
		Math.lerp = function(x,y,t) {
			return (1 - t) * x + t * y;
		};
	}
	if (!Math.invLerp) {
		Math.invLerp = function(x,y,value) {
			return x !== y ? (value - x) / (y - x) : 0;
		};
	}
	if (!Math.tween) {
		// t is current time
		// b is start value
		// c is change in value
		// d is duration
		Math.tween = {
			linear: (t,b,c,d) => c*t/d+b,
			easeIn: (t,b,c,d) => c*(t/=d)*t*t+b,
			easeOut: (t,b,c,d) => c*((t=t/d-1)*t*t+1)+b,
			easeInOut: (t,b,c,d) => ((t/=d/2)<1)? c/2*t*t*t+b : c/2*((t-=2)*t*t+2)+b,
			bounce: (t,b,c,d) => c*Math.sin(t/d*(Math.PI))+b,
		};
	}
	// extending the XML object
	Document.prototype.selectNodes = function(xpath, xnode) {
		if (!xnode) xnode = this;
		var ns = this.createNSResolver(this.documentElement),
			qI = this.evaluate(xpath, xnode, ns, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null),
			res = [],
			len = qI.snapshotLength;
		while (len--) res[len] = qI.snapshotItem(len);
		return res;
	};
	Document.prototype.selectSingleNode = function(xpath, xnode) {
		if(!xnode) xnode = this;
		var xI = this.selectNodes(xpath, xnode);
		return (xI.length > 0)? xI[0] : null ;
	};
	Element.prototype.selectNodes = function(xpath) {
		return this.ownerDocument.selectNodes(xpath, this);
	};
	Element.prototype.selectSingleNode = function(xpath) {
		return this.ownerDocument.selectSingleNode(xpath, this);
	};
	Element.prototype.setAttr = function(nsName, value) {
		let [namespace, name] = nsName.split(":"),
			ns = this.ownerDocument.documentElement.getAttribute("xmlns:"+ namespace);
		return this.setAttributeNS(ns, name, value);
	};
	Element.prototype.getAttr = function(nsName) {
		let [namespace, name] = nsName.split(":"),
			ns = this.ownerDocument.documentElement.getAttribute("xmlns:"+ namespace);
		return this.getAttributeNS(ns, name);
	};
	Element.prototype.removeAttr = function(nsName) {
		let [namespace, name] = nsName.split(":"),
			ns = this.ownerDocument.documentElement.getAttribute("xmlns:"+ namespace);
		return this.removeAttributeNS(ns, name);
	};
	Node.prototype.__defineGetter__("xml", function() {
		var decl   = jr.decl_,
			ser    = new XMLSerializer(),
			xstr   = ser.serializeToString(this),
			str    = xstr.trim().replace(/(>)\s*(<)(\/*)/g, "$1\n$2$3"),
			lines  = str.split("\n"),
			indent = -1,
			i      = 0,
			il     = lines.length,
			start,
			end;
		for (; i<il; i++) {
			if (i === 0 && lines[i].toLowerCase() === decl) continue;
			start = lines[i].match(/<[A-Za-z\:_]+.*?>/g) !== null;
			end   = lines[i].match(/<\/[\w\:]+>/g) !== null;
			if (lines[i].match(/<.*?\/>/g) !== null) start = end = true;
			if (start) indent++;
			lines[i] = String().fill(indent, '\t') + lines[i];
			if (start && end) indent--;
			if (!start && end) indent--;
		}
		return lines.join('\n').replace(/\t/g, String().fill(4, ' '));
	});

	NodeList.prototype.map = Array.prototype.map;
	NodeList.prototype.filter = Array.prototype.filter;

	// Secure Hash Algorithm - sha1
	var sha1 = {
		hexcase: 0, chrsz: 8, rol: (num, cnt) => (num<<cnt)|(num>>>(32-cnt)),
		sha1_kt: t => (t<20)? 1518500249 : (t<40)? 1859775393 : (t<60)? -1894007588 : -899497514,
		core_sha1: (x, len) => {x[len>>5]|=0x80<<(24-len%32);x[((len+64>>9)<<4)+15]=len;var w=Array(80),a=1732584193,b=-271733879,c=-1732584194,d=271733878,e=-1009589776;for(var i=0;i<x.length;i+=16){var olda=a,oldb=b,oldc=c,oldd=d,olde=e;for(var j=0;j<80;j++){if(j<16)w[j]=x[i+j];else w[j]=sha1.rol(w[j-3]^w[j-8]^w[j-14]^w[j-16],1);let t=sha1.safe_add(sha1.safe_add(sha1.rol(a,5),sha1.sha1_ft(j,b,c,d)),sha1.safe_add(sha1.safe_add(e,w[j]),sha1.sha1_kt(j)));e=d;d=c;c=sha1.rol(b,30);b=a;a=t;}a=sha1.safe_add(a,olda);b=sha1.safe_add(b,oldb);c=sha1.safe_add(c,oldc);d=sha1.safe_add(d,oldd);e=sha1.safe_add(e,olde);}return Array(a, b, c, d, e);},
		sha1_ft: (t, b, c, d) => {if(t<20) return (b&c)|((~b)&d);if(t<40) return b^c^d;if(t<60) return (b&c)|(b&d)|(c&d);return b^c^d;},
		safe_add: (x, y) => {var lsw=(x&0xFFFF)+(y&0xFFFF);var msw=(x>>16)+(y>>16)+(lsw>>16);return (msw<<16)|(lsw&0xFFFF);},
		str2binb: (str) => {var bin=Array();var mask=(1<<sha1.chrsz)-1;for(var i=0;i<str.length*sha1.chrsz;i+=sha1.chrsz)bin[i>>5]|=(str.charCodeAt(i/sha1.chrsz)&mask)<<(24-i%32);return bin;},
		binb2hex: (binarray) => {var hex_tab=sha1.hexcase?"0123456789ABCDEF":"0123456789abcdef";var str="";for(var i=0;i<binarray.length*4;i++)str+=hex_tab.charAt((binarray[i>>2]>>((3-i%4)*8+4))&0xF)+hex_tab.charAt((binarray[i>>2]>>((3-i%4)*8))&0xF);return str;}
	};
	
	for (var fn in auxiliary_) {
		jr[fn] = auxiliary_[fn];
	}

	return jr;

})(window, document);
