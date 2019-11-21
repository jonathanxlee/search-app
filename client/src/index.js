import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';
import socketIOClient from "socket.io-client";

const endpoint = "http://localhost:3001";
const socket = socketIOClient(endpoint);

socket.on('search_response', function(payload) {
    console.log(payload);
    var urlsMap = new Map();
    const urls = [];
    for(var url in payload) {
        urls.push(url)
        urlsMap.set(url, payload[url].score);
    }
    urls.sort(function(a, b){return urlsMap.get(b) - urlsMap.get(a)});

    console.log(JSON.stringify(urls));

    ReactDOM.render(<App onSubmit={handleSubmit} map={urlsMap} urls={urls}/>, document.getElementById('root'));
});


function handleSubmit(query) 
{
    console.log('Here is the query');
    var payload={};
    payload.query = query;
    socket.emit('search', payload)
    console.log(payload);
};

// our first get method that uses our backend api to
// fetch data from our data base

ReactDOM.render(<App onSubmit={handleSubmit} />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
