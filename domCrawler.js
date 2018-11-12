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
    let arr = filter(node) ? [node] : [];
    node.childNodes.forEach(child =>
        arr = arr.concat(domCrawler(child, filter, skip))
    );
    return arr;
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
        /*let splitted = [textNode.textContent];
        rules.forEach(rule => {
            for(let i = splitted.length - 1; i >= 0; --i) {
                const frag = splitted[i];
                if(typeof frag != "string" || (rule.minLength && frag.length < rule.minLength)) continue;
                const debris = domCrawler.strSplitAndJoin(frag, rule.pattern, rule.replacer);
                if(debris.length == 1) continue;
                splitted.splice(i, 1, ...debris);
            }
        });*/

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

        // Combine adjacent items if they are either texts or text nodes.
        // This may slow down the process;
        // however, this may be necessary in case there are some other functions depending on text node detection.
        splitted = splitted.reduce((acc, cur) => {
            if(!acc.length) acc = [acc];
            const li = acc.length - 1;
            if(typeof acc[li] == "string") {
                if(typeof cur == "string") acc[li] += cur;
                else if(cur.nodeType == 3) acc[li] += cur.textContent;
                else acc.push(cur);
            }
            else acc.push(cur);
            return acc;
        }, []);

        textNode.replaceWith(...splitted);
    })
};

if(typeof module === 'object') module.exports = domCrawler;
