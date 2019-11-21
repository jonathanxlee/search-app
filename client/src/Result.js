import React from 'react';


export class Result extends React.Component {
  // initialize our state
  state = {
    data: [],
    message: null,
    query: ''
  };

  constructor(props) {
      super(props);
  }

  render() {
      return (
        <div className="card">
            <div className="card-body">
                <h4 className="card-title">{this.props.url}</h4>
                <h6 className="card-subtitle mb-2 text-muted">Relevancy Score: {this.props.score}</h6>
            </div>
        </div>
      );

  }
}

export default Result;
