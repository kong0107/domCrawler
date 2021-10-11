/**
 * Get all nodes within the specified node.
 * @returns {Array} nodes which fit `accept` but not within those fit `reject`
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
 * @returns {Array} text nodes in `node` but not within those fit `reject`
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
 * @param {string} replacer
 * @param {Node} replacer This will be cloned with its attributes and children but without its event listeners.
 * @param {function} replacer Similar to what String#replace does.
 * @returns {Array} A merged list of splitted stuff and those returned by replacer in their original order.
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

    let match, result = [];
    separator.lastIndex = 0; // in case that the RegExp is for global match
    while(match = separator.exec(str)) {
        result.push(str.substring(0, match.index), replacer.call(str, ...match, match.index, str));
        str = str.substring(match.index + match[0].length);
        separator.lastIndex = 0;
    }
    result.push(str);
    return result;
};


/**
 * Replace text by the rules specified.
 * It just applies multi rules to `domCrawler.strSplitAndJoin`.
 * @param {Object[]} rules
 * @param {string|RegExp} rules[].pattern
 * @param {string|function|Node} rules[].replacer
 * @param {number} rules[].minLength
 */
domCrawler.strSplitAndJoinByRules = (str, rules) => {
    if(!rules.forEach) rules = [rules];
    return rules.reduce((splitted, rule) => {
        for(let i = splitted.length - 1; i >= 0; --i) {
            const frag = splitted[i];
            if(typeof frag != "string" || (rule.minLength && frag.length < rule.minLength)) continue;
            const debris = domCrawler.strSplitAndJoin(frag, rule.pattern, rule.replacer);
            if(debris.length == 1 && debris[0] == frag) continue;
            splitted.splice(i, 1, ...debris);
        }
        return splitted;
    }, [str]);
};


/**
 * Replaces texts in one text node by the rules and the wrapper.
 * @returns {Node[]} array of nodes the initial text node is replaced by.
 */
domCrawler.replaceTextNode = (textNode, rules, wrapper = null) => {
    let splitted = domCrawler.strSplitAndJoinByRules(textNode.textContent, rules);
    if(typeof wrapper === "function") splitted = wrapper.call(textNode, splitted, textNode);
    if(splitted.length === 1 && splitted[0] === textNode.textContent) return;
    textNode.replaceWith(...splitted);
};


/**
 * Replaces texts in the node by the rules specified.
 * To minimize DOM manipulation, let's iterate rules within the iteration of text nodes.
 * HTML tags SCRIPT and STYLE are skipped if `reject` is not specified.
 * @param {Object[]} rules
 * @param {string|RegExp} rules[].pattern
 * @param {*} rules[].replacer
 * @param {number} rules[].minLength
 * @param {function} wrapper - This is called on the whole array `strSplitAndJoinByRules` returned. Afterwards the returned array this function returns will replace the origin content of the text node.
 */
domCrawler.replaceTexts = (
    rules,
    node = document,
    reject = n => ["SCRIPT", "STYLE"].includes(n.nodeName),
    wrapper = null
) => {
    domCrawler.getTextNodes(node, reject).forEach(textNode =>
        domCrawler.replaceTextNode(textNode, rules, wrapper)
    );
    node.normalize();
};


/**
 * Async version of the above.
 * @param {number} microseconds the process should wait after replacing one text node
 * @returns {Promise} resolves to undefined
 */
domCrawler.replaceTextsAsync = (
    rules,
    node = document,
    reject = n => ["SCRIPT", "STYLE"].includes(n.nodeName),
    wrapper = null,
    delay = 0
) => {
    const wait = ms => () => new Promise(resolve => setTimeout(resolve, ms));
    return domCrawler.getTextNodes(node, reject).map(textNode =>
        () => domCrawler.replaceTextNode(textNode, rules, wrapper)
    ).reduce(
        (acc, cur) => acc.then(cur).then(wait(delay)),
        Promise.resolve()
    ).then(() => node.normalize());
};


/**
 * Simulate React.createElement
 * actually not related to other functions of this project.
 * @param {Object} [props] attribute-value pairs of the element; attribute names are case insensitive
 * @param {string} [props.href] href value of the element to be created
 * @param {string|Array} [props.class] CSS class name list, string seperated by space, or array of strings.
 * @param {string|Array} [props.classname] synonyms of the above `props.class`
 * @param {string|Object} [props.style] CSS style in string type or assigned as an property-value pair object
 * @param {function} [props.onclick] event listener of click event
 * @param {Object} [props.dataset] custom data attributes of the element to be created
 * @param {Object} [props.data] synonyms of the above `props.dataset`
 * @returns {Element}
 */
domCrawler.createElement = (tagName, props = null, ...children) => {
    const elem = document.createElement(tagName);
    for(let attr in props) {
        const value = props[attr];
        attr = attr.toLowerCase();
        if(attr.startsWith("on")) {
            const eventType = attr.substring(2);
            elem.addEventListener(eventType, value);
            continue;
        }
        switch(attr) {
            case "class":
            case "classname":
                elem.className = (typeof value === "string") ? value : value.join(" ");
                break;
            case "data":
            case "dataset":
                /**
                 * It's also OK to do:
                 * Element.setAttribute("data-something", "string value")
                 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset#Syntax }
                 */
                for(let ds in value) elem.dataset[ds] = value[ds];
                break;
            case "style":
                /**
                 * React implements inline styles with an object whose key is the camelCased version of the style name,
                 * so here we cannot use CSSStyleDeclaration.setProperty().
                 * @see {@link https://reactjs.org/docs/dom-elements.html#style }
                 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration/setProperty }
                 */
                if(typeof props.style == "string") elem.style.cssText = props.style;
                else for(let sp in props.style) elem.style[sp] = props.style[sp];
                break;
            default:
                elem.setAttribute(attr, value);
        }
    }
    elem.append(...children);
    return elem;
};


if(typeof module === 'object') module.exports = domCrawler;
