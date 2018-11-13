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
