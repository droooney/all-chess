import * as React from 'react';
import { Link } from 'react-router-dom';

import './index.less';

export default class Home extends React.Component {
  render() {
    return (
      <div className="route home-route">
        <Link to="/rooms">
          Play!
        </Link>
      </div>
    );
  }
}
