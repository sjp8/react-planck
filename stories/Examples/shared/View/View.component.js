// @flow
import React, { type Node } from 'react';

import Playbar from './Playbar';

type Props = {
  children: Node
}

type State = {
  key: string,
  paused: boolean
}

export default class View extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      key: `child_${new Date().getTime()}`,
      paused: true,
    };
    this.planckProps = {
      viewProps: testbed => {
        this.togglePause = () => testbed.togglePause();
        const paused = testbed.isPaused();
        if (paused !== this.state.paused) {
          this.setState({ paused });
        }
        return {
          _pause: () => this.setState({ paused: true }),
          _resume: () => this.setState({ paused: false }),
        };
      },
    };
  }

  reset = () => this.setState({
    key: `child_${new Date().getTime()}`,
    paused: true,
  });

  planckProps: any
  togglePause: () => void

  render() {
    return (
      <React.Fragment>
        <Playbar
          togglePause={this.togglePause}
          paused={this.state.paused}
          reset={this.reset}
        />
        {React.Children.map(this.props.children, child =>
          React.cloneElement(child, Object.assign(this.planckProps, { key: this.state.key })))}
      </React.Fragment>
    );
  }
}