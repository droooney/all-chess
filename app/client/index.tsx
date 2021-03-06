import '@babel/polyfill';
import 'shared/plugins';

import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

import store from 'client/store';

import App from './components/App';

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('app-root'),
);
