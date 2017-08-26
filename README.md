## flow-check-webpack-plugin

[NPM](https://www.npmjs.com/package/flow-check-webpack-plugin)

- A Webpack plugin, not a loader. Use [`babel-loader`](https://www.npmjs.com/package/babel-loader)
  to strip Flow syntax, or use the [comment syntax](https://flow.org/en/docs/types/comments/).
- Run `check` for single-shot builds, and `server`/`status` for watch builds. Tear down the server
  on exit.
- Access `flow` via [`flow-bin`](https://www.npmjs.com/package/flow-bin).
- _Just_ a Webpack plugin, no other glue or tape required.
- Maintained. (For now! :wink:)

```bash
npm install --save-dev flow-check-webpack-plugin flow-bin webpack
```

```js
const FlowCheckWebpackPlugin = require('flow-check-webpack-plugin');

module.exports = {
  // ...
  plugins: [
    new FlowCheckWebpackPlugin()
  ]
};
```

![Example GIF](/example.gif "Example GIF")

### Contributing

Doesn't work for you? Wish it did something different? Pull requests and issues welcome!

```
cd test-project && npm run once && npm run watch
```
