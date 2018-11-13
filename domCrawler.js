/**
 * Get all nodes within the specified node.
 * @return Array of nodes which fit `accept` but not within those fit `reject`
 */
const domCrawler = (node, accept, reject) =>
    domCrawler.map(node, n => n, accept, reject)
;

/**
 * Create an object that can be used as a `NodeFilter`.
 *
 * To developers:
 * For the feature of `FILTER_REJECT`, let's use `TreeWalker` instead of `NodeIterator`.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/NodeFilter }
 * @see {@link https://www.w3.org/TR/DOM-Level-2-Traversal-Range/traversal.html#Traversal-NodeFilter-acceptNode-constants }
 */
domCrawler.createFilter = (
    accept = () => true,
    reject = () => false
) => {
    return {acceptNode: node => {
        if(reject(node)) return NodeFilter.FILTER_REJECT;
        if(accept(node)) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
    }};
};

/**
 * Call the function on filtered nodes and return the results.
 * Removing the node in the function may interrupt the traversal.
 * To move some nodes and then traverse throught the origin order, use `domCrawler` to get an array to iterate.
 * @see {@link https://www.w3.org/TR/DOM-Level-2-Traversal-Range/traversal.html#Iterator-Robustness-h4 }
 */
domCrawler.map = (node = document, func, accept, reject) => {
    const treeWalker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_ALL,
        domCrawler.createFilter(accept, reject)
    );
    const result = [];
    while(n = treeWalker.nextNode()) result.push(func(n));
    return result;
};

/**
 * Traverse all text nodes.
 * Removing the node in the function may interrupt the traversal.
 * @see domCrawler.map
 *
 * To developers:
 * In `Document.createTreeWalker()`, `filter` is only called on nodes accepted by `whatToShow`.
 * So do not set `whatToShow` to `SHOW_TEXT` in createTreeWalker;
 * otherwise you cannot reject anything within the nodes you don't want.
 */
domCrawler.mapTextNodes = (node, func, reject) =>
    domCrawler.map(node, func, n => n.nodeType == 3, reject)
;

/**
 * Get all text nodes within the specified node.
 * @return Array of text nodes in `node` but not within those fit `reject`
 */
domCrawler.getTextNodes = (node, reject) =>
    domCrawler.mapTextNodes(node, n => n, reject)
;

/**
 * Replace substrings into whatever, and glue them into an array.
 * @example
 * // returns [{v: "XX"}, "77", {v: "YYY"}]
 * domCrawler.strSplitAndJoin("xx77yyy", /\w+/, x => {v: x.toUpperCase()})
 * @param {string} str
 * @param {string|RegExp} separator
 * @param {*} replacer
 * @return {Array} A merged list of splitted stuff and those returned by replacer in their original order.
 */
domCrawler.strSplitAndJoin = (str, separator, replacer) => {
    if(typeof replacer != "function") {
        const temp = replacer;
        if(temp instanceof Node) replacer = () => temp.cloneNode(true);
        else replacer = () => temp;
    }
    if(typeof separator == "string") {
        const result = str.split(separator);
        // Array#splice the existing array is faster than Array#push a new array here.
        for(let i = result.length - 1; i > 0; --i)
            result.splice(i, 0, replacer(separator));
        return result;
    }
    if(!(separator instanceof RegExp)) throw new TypeError("Parameter `separator` must be a string or a RegExp.");
    throw new TypeError("Sorry, I haven't implemented this function yet.");
};

/**
 * Replaces texts in the node by the rules specified.
 * To minimize DOM manipulation, let's iterate rules within the iteration of text nodes.
 * @param {Object[]} rules
 * @param {string|RegExp} rules[].pattern
 * @param {*} rules[].replacer
 * @param {number} rules[].minLength
 */
domCrawler.replaceTexts = (rules, node, reject) => {
    if(!rules.forEach) rules = [rules];
    domCrawler.getTextNodes(node, reject).forEach(textNode => {
        let splitted = rules.reduce((splitted, rule) => {
            for(let i = splitted.length - 1; i >= 0; --i) {
                const frag = splitted[i];
                if(typeof frag != "string" || (rule.minLength && frag.length < rule.minLength)) continue;
                const debris = domCrawler.strSplitAndJoin(frag, rule.pattern, rule.replacer);
                if(debris.length == 1) continue;
                splitted.splice(i, 1, ...debris);
            }
            return splitted;
        }, [textNode.textContent]);
        if(splitted.length == 1) return;
        textNode.replaceWith(...splitted);
    });
    node.normalize();
};

/**
 * Simulate React.createElement
 */
domCrawler.createElement = (type, props, ...children) => {
    const elem = document.createElement(type);
    for(let attr in props) {
        switch(attr) {
            case "class":
            case "className":
                elem.className = props.className;
                break;
            case "style":
                /**
                 * React implements inline styles with an object whose key is the camelCased version of the style name,
                 * so here we cannot use CSSStyleDeclaration.setProperty().
                 * @see {@link https://reactjs.org/docs/dom-elements.html#style|React}
                 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration/setProperty|MDN}
                 */
                if(typeof props.style == "string") elem.style.cssText = props.style;
                else for(let sp in props.style) elem.style[sp] = props.style[sp];
                break;
            default:
                elem.setAttribute(attr, props[attr]);
        }
    }
    elem.append(...children);
    return elem;
};

if(typeof module === 'object') module.exports = domCrawler;
