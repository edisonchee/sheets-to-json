const https = require('https')
var restify = require('restify');

var server = restify.createServer();

const asyncWrap = function(fn) {
  return function(req, res, next) {
      return fn(req, res, next).catch(function(err) {
          return next(err);
      });
  };
};

server.get('/sheet/:sheetId/:sheetNum', asyncWrap(scgs));

server.listen(7777, function() {
  console.log('%s listening at %s', server.name, server.url);
});

// SCGS

async function scgs(req, res, next) {
  let data;
  try {
    data = await getSheet(req.params.sheetId, req.params.sheetNum);
    res.header('content-type', 'json');
    res.send(processCells(data.feed.entry));
  } catch {
    console.error(error);
    res.send(500);
  }
  return next();
}

function getSheet(sheetId, sheetNum) {
  // promisify
  return new Promise((resolve, reject) => {
    https.get(`https://spreadsheets.google.com/feeds/cells/${sheetId}/${sheetNum}/public/full?alt=json`, (res) => {
      res.setEncoding('utf8');
      console.log('statusCode:', res.statusCode);
      // console.log('headers:', res.headers);
      var body = "";
      res.on('data', chunk => {
        body += chunk;
      });
  
      res.on('end', () => {
        resolve(JSON.parse(body));
      })
  
    }).on('error', e => {
      reject(err);
    });
  })
}

function processCells(cellsArr) {
  var data = [];
  var headers = {};
  var numRows = 0;
  var numColumns = 0;
  for (let i = 0; i < cellsArr.length; i++) {
    cellsArr[i].gs$cell.row >= numRows ? numRows = cellsArr[i].gs$cell.row : '';
    cellsArr[i].gs$cell.col >= numColumns ? numColumns = cellsArr[i].gs$cell.col : '';
  }

  // console.log("numRows: ", numRows);
  // console.log("numColumns: ", numColumns);

  // create headers
  for (let i = 0; i < numColumns; i++) {
    headers[i + 1] = cellsArr[i].gs$cell.inputValue;
  }
  
  // create rows and add keys keys
  for (let i = 0; i < numRows; i++) {
    var row = {};
    for (let j = 0; j < numColumns; j++) {
      row[cellsArr[j].gs$cell.inputValue] = "";
    }
    data.push(row);
  }

  // populate values
  for (let i = 0; i < cellsArr.length; i++) {
    data[parseInt(cellsArr[i].gs$cell.row) - 1][headers[parseInt(cellsArr[i].gs$cell.col)]] = cellsArr[i].gs$cell.inputValue;
  }

  // remove header row
  data.shift();

  return data;
}
