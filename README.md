# domCrawler

Traverse all nodes within the specified node.


## Installation

```html
<script src="domCrawler.js"></script>
```


## Examples

See also [demo page](https://kong0107.github.io/domCrawler/).


### Get nodes

```javascript
/// gets an array contains all nodes in document
nodes = domCrawler();

/// gets all buttons not within forms.
nodes = domCrawler(
  document.body,
  node => node.tagName == "BUTTON",
  node => node.tagName == "FORM"
);

/// gets only nodes containing non-space characters
nodes = domCrawler.getTextNodes(
  document.body,
  node => /^\s*$/.test(node.textContent)
)

```


### Replaces texts in the webpage

```javascript
// replaces all texts in the page
domCrawler.replaceTexts({
  pattern: /github/i, replacer: "GitHub"
});

// emphasize some words in the page
replacer = text => domCrawler.createElement("EM", null, text);
domCrawler.replaceTexts(
  [
    {pattern: "banana", replacer: replacer},
    {pattern: /(pine)?apple/, replacer: replacer},
  ],
  document.body
);

```


## Changelog

### 1.3.4
* Fix the error which `domCrawler.createElement(tagName, {className: "foo"})` occurs after v1.3.3.

### 1.3.3
* Fix the bug that `domCrawler.createElement(tagName, {class: "foo"})` did not assgin CSS class name to the element.

### 1.3.2
* Make `wrapper` know which text node it's working on.

### 1.3.1
*	Users can design `replacer` of rules more like what they do while using `String#replace`.

### 1.3.0
* Add `domCrawler.replaceTextsAsync`, which is the async version of `domCrawler.replaceTexts` and return a promise which resolves after traverse all text nodes.
