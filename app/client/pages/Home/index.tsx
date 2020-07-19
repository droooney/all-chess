import * as React from 'react';

import DocumentTitle from '../../components/DocumentTitle';
import Link from '../../components/Link';

import './index.less';

export default class Home extends React.Component {
  render() {
    return (
      <div className="route home-route">
        <DocumentTitle value="AllChess - Home" />
        <Link to="/games">
          Play!
        </Link>
      </div>
    );
  }
}
