# domCrawler

Traverse all nodes within the specified node in DOM tree.

Though elements can be selected by `Element.querySelectorAll()`, this project is for those who want:
* get text nodes, and maybe replace them by elements
* get nodes besides elements, such as texts and comments (see [Node.nodeType](https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType))
* get elements NOT within something else


## Installation

```html
<script src="domCrawler.js"></script>
```


## Examples

See also [demo page](https://kong0107.github.io/domCrawler/).


### Get nodes

```javascript
/// gets an array contains all nodes in document, including text nodes, comments, and even `<!DOCTYPE html>`
nodes = domCrawler();

/// gets an array contains only elements
nodes = domCrawler(document, "*");

/// gets all buttons not within forms.
nodes = domCrawler(document.body, "button, input[type=button], input[type=submit]", "form");

/// gets all form elements
nodes = domCrawler(document.body, ["input", "select", "textarea", "button"]);

/// gets all comment nodes
nodes = domCrawler(document, node => node.nodeType === Node.COMMENT_NODE);

/// to get text nodes except those within JS and CSS tags
nodes = domCrawler(document.body, node => node.nodeType === Node.TEXT_NODE, ["script", "style"]);
nodes = domCrawler.getTextNodes(); //< or use this syntactic sugar

/// gets text nodes but ignore those containing only spaces
nodes = domCrawler.getTextNodes(
  document.body,
  node => /^\s+$/.test(node.textContent)
);

```


### Replaces texts in the webpage

```javascript
// replaces all texts in the page
domCrawler.replaceTexts({
  pattern: /github/i, replacer: "GitHub"
});

// emphasize some words in the page
emWrapper = text => domCrawler.createElement("EM", null, text);
domCrawler.replaceTexts([
  {pattern: "banana", replacer: emWrapper},
  {pattern: /(pine)?apple/, replacer: emWrapper},
]);

```


## Changelog

### 1.4.0
* Deprecate `domCrawler.map()`.
* Mechanism of `domCrawler.replaceTexts()`:
  * Deprecate `domCrawler.replaceTextAsync()`; async usage is combined into `domCrawler.replaceTexts()`.
  * Add parameter `callback` that can be assigned and executed each time AFTER a text node is replaced.
    Also note that parameter `wrapper` is called BEFORE the text node is actually replaced.
  * Add parameter `size` which assigns the group size of text nodes to be replaced continuously in async mode.
  * Deprecate calling `Node.normalize()` since it causes error on websites.
* Support different ways to assign filter, including:
  * function in which nodes are passed one by one
  * CSS selector string
  * array of HTML tags

### 1.3.4
* Fix the error which `domCrawler.createElement(tagName, {className: "foo"})` occurs after v1.3.3.

### 1.3.3
* Fix the bug that `domCrawler.createElement(tagName, {class: "foo"})` did not assgin CSS class name to the element.

### 1.3.2
* Make `wrapper` know which text node it's working on.

### 1.3.1
*	Users can design `replacer` of rules more like what they do while using `String#replace`.

### 1.3.0
* Add `domCrawler.replaceTextsAsync()`, which is the async version of `domCrawler.replaceTexts()` and return a promise which resolves after traverse all text nodes.
