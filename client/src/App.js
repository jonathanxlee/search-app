import React from 'react';
import Result from './Result'


export class App extends React.Component {
  // initialize our state
  state = {
    data: [],
    message: null,
    query: ''
  };

  constructor(props) {
      super(props);
      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    console.log(event.target.value);
    this.setState({inputfield : event.target.value});
  }

  handleSubmit(event) {
      event.preventDefault();
      if (this.props.onSubmit) {
        this.props.onSubmit(this.state.inputfield);
      }
  }

  render() {
    if(!this.props.urls){
      return (
        <div>
          <div className='search text-center'>
              <form onSubmit={this.handleSubmit} className='form-enter-name'>
                <h3>What are we looking for?</h3>
                <label htmlFor='query' className='sr-only'>Enter your user query:</label>
                <input className='form-control' type='text' id='query' defaultValue={this.state.query} onChange={this.handleChange} />
                <button className='btn btn-default btn-primary button-size' onClick={this.handleSubmit}>Let's Search</button>
              </form>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className='search text-center'>
            <form onSubmit={this.handleSubmit} className='form-enter-name'>
              <h3>What are we looking for?</h3>
              <label htmlFor='query' className='sr-only'>Enter your user query:</label>
              <input className='form-control' type='text' id='query' defaultValue={this.state.query} onChange={this.handleChange} />
              <button className='btn btn-default btn-primary button-size' onClick={this.handleSubmit}>Let's Search</button>
            </form>
        </div>
        <div className='results'>
          {this.props.urls.map((url,index) => {
            return (<Result url={url} score={this.props.map.get(url)} />);
          })}
        </div>
      </div>
    );
  }
}

export default App;
