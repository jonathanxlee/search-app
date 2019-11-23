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
        <div className='result'>
            <h4 className="card-title"><a href={this.props.url} target="_blank" rel="noopener noreferrer"> {this.props.url} </a></h4>
            <h6 className="card-subtitle mb-2 text-muted">Relevancy Score: {this.props.score}</h6>
        </div>
      );

  }
}

export default Result;
