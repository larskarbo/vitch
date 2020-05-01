import React from 'react';
import Recorder from './Recorder'

export default class App extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div style={{
        display: 'flex',
        flexWrap: "wrap"
      }}>
        {new Array(16).fill("horse").map(() => (
          <div style={{
            // width: "25%",
            width: 250

            // height: 50,
            // background: 'black'
          }}>
            <Recorder />
          </div>
        ))}
      </div>
    )
  }
}