/**
 * Traverse all nodes within the specified node.
 * @return Array of nodes which fit filter but not within those fit skip
 */
const domCrawler = (
    node = document,
    filter = () => true,
    skip = () => false
) => {
    if(skip(node)) return [];
    return Array.prototype.reduce.call(
        node.childNodes,
        (acc, child) => {
            const append = domCrawler(child, filter, skip);
            return append.length ? acc.concat(append) : acc;
        },
        filter(node) ? [node] : []
    );
};

domCrawler.getTextNodes = (node, skip) =>
    domCrawler(node, n => n.nodeType == 3, skip)
;

/**
 * This function has nothing to do with DOM.
 * @example
 * // returns [{v: "XX"}, "77", {v: "YYY"}]
 * domCrawler.strSplitAndJoin("xx77yyy", /\w+/, x => {v: x.toUpperCase()})
 * @param {string} str
 * @param {string|RegExp} separator
 * @param {*} replacer
 * @return {Array} A merged list of splitted stuff and those returned by replacer by their original order.
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
domCrawler.replaceTexts = (rules, node, skip) => {
    if(!rules.forEach) rules = [rules];
    domCrawler.getTextNodes(node, skip).forEach(textNode => {
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
