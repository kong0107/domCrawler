"use strict";

/**
 * Get all nodes within the specified node.
 * @param {Node} [root] root of the TreeWalker traversal, default to `document`
 * @param {function} [accept] tests and accepts descendants of `root` to be contained by the walker.
 * @param {string} [accept] a CSS selector string which is used to filter elements
 * @param {string[]} [accept] HTML tags which are to be filtered
 * @param {function} [reject] tests and rejects subtrees of `root` to be considered by the walker.
 * @returns {Array} nodes which fit `accept` but not within those fit `reject`
 */
const domCrawler = function (
    root = document,
    accept = () => true,
    reject = () => false
) {
    /**
     * If none of selector is function, then only elements are considered and text nodes are ignored.
     * In this case, we use `Element.querySelectorAll()`; otherwise, `TreeWalker` is the option.
     * `NodeIterator` is not considered here since it does not support `FILTER_REJECT`.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/NodeFilter }
     * @see {@link https://www.w3.org/TR/DOM-Level-2-Traversal-Range/traversal.html }
     */
    if(typeof accept !== "function" && typeof reject !== "function") {
        if(accept instanceof Array) accept = accept.join(",");
        if(reject instanceof Array) reject = reject.join(",");
        const acceptedElems = Array.from(root.querySelectorAll(accept));
        const rejectedElems = Array.from(root.querySelectorAll(reject));
        return acceptedElems.filter(elem => !rejectedElems.some(rejected => rejected.contains(elem)));
    }

    accept = domCrawler.parseSelector(accept, root);
    reject = domCrawler.parseSelector(reject, root);
    const filter = {
        acceptNode: node => {
            if(reject(node)) return NodeFilter.FILTER_REJECT;
            if(accept(node)) return NodeFilter.FILTER_ACCEPT;
            return NodeFilter.FILTER_SKIP;
        }
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, filter);

    let node, result = [];
    while(node = walker.nextNode()) result.push(node);
    return result;
};
domCrawler.parseSelector = function (filterRule, root) {
    if(typeof filterRule === "function") return filterRule;
    if(typeof filterRule === "string") {
        const elements = Array.from(root.querySelectorAll(filterRule));
        return node => elements.includes(node);
    }
    if(filterRule instanceof Array) {
        filterRule = filterRule.map(tag => tag.toUpperCase());
        return node => filterRule.includes(node.tagName);
    }
    throw new TypeError("selector shall be a function, a CSS selector string, or an array of strings representing HTML tags.");
};


/**
 * Get all text nodes within the specified node.
 * @returns {Array} text nodes in `root` but not within those fit `reject`
 *
 * To developers:
 * In `Document.createTreeWalker()`, `filter` is only called on nodes accepted by `whatToShow`.
 * So do not set `whatToShow` to `SHOW_TEXT` in createTreeWalker;
 * otherwise you cannot reject anything within the nodes you don't want.
 */
domCrawler.getTextNodes = function (
    root = document.body,
    reject = ["SCRIPT", "STYLE"]
) {
    return domCrawler(root, node => node.nodeType === Node.TEXT_NODE, reject);
};


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
domCrawler.strSplitAndJoin = function (str, separator, replacer) {
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
 * @param {string|RegExp} rules[].pattern
 * @param {string|function|Node} rules[].replacer same in `strSplitAndJoin`
 * @param {number} rules[].minLength minimum length that the rule applies
 */
domCrawler.strSplitAndJoinByRules = function (str, rules) {
    if(!(rules instanceof Array)) rules = [rules];
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
 * @param {Text} textNode the text node to be replaced.
 * @param {Object[]} rules see `strSplitAndJoinByRules`
 * @param {function} [wrapper] After all `rules` are applied, the result array is passed by `wrapper` before replacing the origin text node.
 * @param {function} [callback] triggers after a text node is replaced
 * @returns {Node[]} array of nodes the initial text node is replaced by.
 */
domCrawler.replaceTextNode = function (
    textNode,
    rules,
    wrapper = null,
    callback = null
) {
    const parent = textNode.parentNode;
    const splitted = domCrawler.strSplitAndJoinByRules(textNode.textContent, rules);
    const newNodes = (typeof wrapper !== "function") ? splitted : wrapper.call(textNode, splitted, textNode);
    const changed = newNodes.length !== 1 || newNodes[0] != textNode.textContent;
    if(changed) textNode.replaceWith(...newNodes);
    if(typeof callback === "function") callback.call(textNode, newNodes, parent, textNode, changed);
    return newNodes;
};


/**
 * Replaces texts in the node by the rules specified, in sync or async way.
 * If `delay` is set to a number greater than 0, then this works asynchronously and returns a promise;
 * otherwise, this works synchronously and returns nothing.
 * Defaults to handle nodes in `document.body` but ignore those in `script` and `style` tags.
 * @param {Object[]} rules see `strSplitAndJoinByRules`
 * @param {function} [wrapper] see `replaceTextNode`
 * @param {function} [callback] see `replaceTextNode`
 * @param {integer} [delay] milliseconds the process should wait after replacing a group of text nodes.
 * @param {integer} [size] number of text nodes a group shall contain
 */
domCrawler.replaceTexts = async function (
    rules,
    root = document.body,
    reject = ["SCRIPT", "STYLE"],
    wrapper = null,
    callback = null,
    delay = 0,
    size = 1
) {
    const textNodes = domCrawler.getTextNodes(root, reject);
    for(let i = 0; i < textNodes.length; ++i) {
        if(delay > 0) {
            if(!i) await Promise.resolve();
            else if(!(i % size)) await new Promise(resolve => setTimeout(resolve, delay));
        }
        domCrawler.replaceTextNode(textNodes[i], rules, wrapper, callback);
    }
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
domCrawler.createElement = function (tagName, props = null, ...children) {
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
