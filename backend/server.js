const postingListFile = "sample.txt"
var urlsSize = 0;
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const db = require('./db');
const port = process.env.PORT || 3001;
const index = require("./routes/index");
const app = express();
app.use(index);
const server = http.createServer(app);
const io = socketIo(server); 

const getApiAndEmit = async socket => {
  try {
    console.log('Still Connected')
    socket.emit("connected"); // Emitting a new message. It will be consumed by the client
  } catch (error) {
    console.error(`Error: ${error.code}`);
  }
}


/**********************************************/
/*        Set up the web socket server        */
/*                                            */ 

io.sockets.on('connection', function (socket) {
  console.log("New client connected"), setInterval(
    () => getApiAndEmit(socket),
    10000
  );
  socket.on("disconnect", () => console.log("Client disconnected")); 

    /* search command */
    /* payload: 
       {
           'query': room to join
       }

       search_response:
       {
           'result': 'success',
           'query': query that the user entered,
           'urls' : [
               {
                   'urls' : the rank of the result,
                   'url' : the url of the result
               }
           ]
       }
       or
       {
           'result' : 'fail',
           'message' : failure message
       }
    */
    socket.on('search', function(payload) {
        console.log('search '+ JSON.stringify(payload));

        if('undefined' === typeof payload || !payload){
            var error_message = 'search had no payload, command aborted';
            log(error_message);
            socket.emit('search_response',   {
                                                    result: 'fail',
                                                    message: error_message

                                                });
            return;
        }

        /* Check that the payload has a query */
        var query = payload.query; 
        if('undefined' === typeof query || !query){
            var error_message = 'search didn\'t specify a query, command aborted';
            console.log(error_message);
            socket.emit('search_response',   {
                                                    result: 'fail',
                                                    message: error_message

                                                });
            return;
        }

        console.log("query " + query);

        processQuery(query, function(result) {
          console.log('result' + result);
          socket.emit('search_response', result)
        });
    });
  
});

function processQuery(query, bigCB) {
  var answerJSON = {};
  answerJSON.query = {};
  answerJSON.urls = {};
  answerJSON.query.v_q = 0;
  answerJSON.query.terms = {};
  
  var queryMap = new Map();
  query.toLowerCase();
  queryWordsList = query.split(" ");
  queryWordsSet = new Set(queryWordsList);
  
  console.log(queryWordsSet);

  //Calculate tf for Query
  for(var i = 0; i < queryWordsList.length; i++) {
    term = queryWordsList[i]
    if(queryMap.has(term)) {
      queryMap.set(term, queryMap.get(term) + 1);
    } else {
      queryMap.set(term, 1);
    }
  }

  console.log('Map: ' + queryMap);

  async.waterfall([
    //Caclulate TF_IDF for the query.
    function(callback) {
      console.log('FIRST STEP: ' + JSON.stringify(answerJSON));
      array = Array.from(queryWordsSet);
      async.each(array, function(term, cb){
        d_tf = queryMap.get(term);
        console.log(d_tf);
        try {
          log_tf = 1;
          if(d_tf > 0) {
            log_tf = log_tf + Math.log10(d_tf);
          }

          answerJSON.query.terms[term] = log_tf;
        }
        catch(error) {
          console.log(error);
        }
        cb();
      }, 
      function asyncEachDone(err) {
        console.log('Done');
        callback(err);
      });
    },
    //calculate tf_idf
    function(callback) {
      console.log('SECOND STEP: ' + JSON.stringify(answerJSON));
      array = Array.from(queryWordsSet)
      console.log(array);
      async.each(array, function(term, cb){
        console.log(term);
        if(typeof term == 'string') {   
          db.get(term, function(err, value) {
              if(err) {
                if (err.notFound) {
                  console.log('Not Found');
                }
                cb();
              }

              value = JSON.parse(value);

              console.log('Value ' + JSON.stringify(value));
              
              //First calculate the |v_q| before squareroot
              df = value[0] + 1
              tf = value[1]
              term_log_tf = answerJSON.query.terms[term]

              idf = 0;
              if(df>0) {
                console.log((urlsSize + 1));
                idf = ((urlsSize+1)/(df));
                console.log(idf);
                idf = Math.log10(idf);
                console.log(urlsSize + ' / ' + df + '= ' + idf);
              }

              term_tf_idf = term_log_tf * idf;
              console.log(term_log_tf + ' * ' + idf + ' = ' + term_tf_idf);
              new_v_q = answerJSON.query.v_q + (term_tf_idf * term_tf_idf);
              console.log("NEW VQ: " + new_v_q);
              answerJSON.query.v_q = new_v_q;

              //Caculate TF_IDF for each url
              for(var i = 2; i < value.length; i ++) {
                url = value[i][0]
                d_tf = value[i][1]
                console.log("URL " + url);

                log_tf = 1;
                if(d_tf > 0) {
                  log_tf += Math.log10(d_tf);
                  console.log('Log(tf); ' + log_tf);
                }
                idf = 0;
                if(df>0) {
                  console.log((urlsSize + 1));
                  idf = ((urlsSize+1)/(df));
                  console.log(idf);
                  idf = Math.log10(idf);
                  console.log(urlsSize + ' / ' + df + '= ' + idf);
                }

                if(!answerJSON.urls[url]) {
                  answerJSON.urls[url] = {}
                }
                tf_idf = log_tf * idf;

                console.log('D df_idf' + tf_idf);
                console.log('qTFIDF ' +  term_tf_idf);

                answerJSON.urls[url][term]  = tf_idf*term_tf_idf;
              }
              cb();
            });
          }
      }, 
      function asyncEachDone(err) {
        callback();
      });
    },

    //Caculate the final score for each document
    //calculate tf_idf
    function(callback) {
      console.log('THIRD STEP: ' + JSON.stringify(Object.keys(answerJSON.urls)));
      async.each(Object.keys(answerJSON.urls), function(url, cb){
        console.log(url);
        db.get(url)
          .then(function(value) {
            console.log('The value '+ value);
            try{
              v_d_q = 0;
              for(word in answerJSON.urls[url]) {
                
                v_d_q+=answerJSON.urls[url][word];
              }

              console.log('|V_D|: ' + value);
              denom = value;
              answerJSON.urls[url].score = v_d_q/denom;

            } catch {
              console.log('Error calculating score')
            }
            cb();
          })
      }, 
      function asyncEachDone(err) {
        console.log('Error ' + err);
        callback();
      });
    },
    function(callback) {
      console.log("response: " + JSON.stringify(answerJSON));
      callback(0, answerJSON);
    }
  ])
  .then(function(err,result){
    console.log(JSON.stringify(answerJSON));
    bigCB(answerJSON.urls);
  });
}

/**********************************************/
/*                Load Data                   */
/*                                            */
var words = new Set();
var urls = new Set(); 

const async = require('async');
db.get(postingListFile, function(err, value){
  var tempTFIDF={};
  console.log('IN DB');
  if(err) {
    async.waterfall([
      function(callback){
        console.log('FIRST STEP');
        const lineReader = require('line-reader');
        lineReader.eachLine(postingListFile, function(line, last) {
          const split = line.split("\t"); 
          const word = split[0];
          words.add(word);
          const wordInfo = JSON.parse(split[1]);
          for(var i = 2; i < wordInfo.length; i ++) {
            urls.add(wordInfo[i][0]);
          }
          db.put(word,JSON.stringify(wordInfo));

          if(last) {
            //console.log(words);
            //console.log(urls);
            value = {}
            value.words = words
            value.urls = urls
            callback(null, value);
          }
        });
      },

      function(value, callback) {
        console.log('SECOND STEP');
        words = Array.from(value.words);
        callback(null, words);
      },

      function(words, callback) {
        async.each(words, function(word, cb) {
          db.get(word)
            .then(function(value) {
              value = JSON.parse(value);
              console.log("'SECOND STEP GET: " + word);
              df = value[0];
              tf = value[1];
              for(var j = 2; j < value.length; j++) {
                console.log(word);
                urlInfo = value[j];
                const d_tf = urlInfo[1];
                const url = urlInfo[0];

                if(word==='posole') {
                  console.log('POSOLEEEURLLLLLLLLL' + url )
                }

                log_tf = 1;
                if(d_tf > 0) {
                  log_tf += Math.log10(d_tf);
                }

                idf = 0;
                if(df>0) {
                  idf = Math.log10(urls.size/df);
                }

                tf_idf = log_tf * idf;

                if(tempTFIDF.hasOwnProperty(url)){
                  tempTFIDF[url][word] = tf_idf;
                } else {
                  tempTFIDF[url] = {};
                  tempTFIDF[url][word] = tf_idf;
                }
              }
              cb();
            }); 
          }, function asyncEachDone(err) {
            callback(err)
          });
      },
      function(callback) {
        console.log("Final Calculate: " + JSON.stringify(tempTFIDF));
          async.forEach(Object.keys(tempTFIDF), function(url, cb) {
            dotProduct = 0;
            if (tempTFIDF.hasOwnProperty(url)) {
              for(var word in tempTFIDF[url]) {
                if (tempTFIDF[url].hasOwnProperty(word)) {
                  console.log(tempTFIDF[url][word]);
                  dotProduct += (tempTFIDF[url][word] * tempTFIDF[url][word]);
                }
              }

              if(word === "posole") {
                console.log('url' + Math.sqrt(dotProduct));
              }
              db.put(url, Math.sqrt(dotProduct))
                .then(cb());
            }
          }, function asyncEachDone(err) {
                callback(err)
          });
      }],
      function (err, result) {
        db.put(postingListFile,urls.size);
        urlsSize = urls.size;
        console.log('SIZE ' + urls.size);
        if(err){
          console.log(err);
        }
      });
    } else {
      console.log(value);
      urlsSize = parseFloat(value);
    }
});

server.listen(port, () => console.log(`Listening on port ${port}`));
process.on('SIGTERM', function() {server.close();});
process.on('uncaughtException', function() {server.close();});
process.on('exit', function() {server.close();});
