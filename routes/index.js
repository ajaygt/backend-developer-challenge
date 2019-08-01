const express = require('express');
const router = express.Router();
const multer  = require('multer');
const fs = require('fs'); 
const csv = require('csv-parser');
const results = [];
const fetch = require('fetch');
const { parse } = require('json2csv');
const fields = ['Nonprofit', 'Total Amount' ,'Total Fee', 'Number of Donations', 'Base Supported'];
const opts = { fields };
const path = require('path');
var nonProfitToIndexMap ={};
var exchangeRates;
var fileName='', baseCurrency;
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/files/')
    },
    filename: function (req, file, cb) {
		fileName = file.originalname;
        cb(null, file.originalname)
  }
})
var upload = multer({ 
	storage: storage,
	fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname);
        if(ext !== '.csv') {
            return callback(new Error('Only csv are allowed'))
        }
        callback(null, true)
    }
	})

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'GiveIndia backend Challenge' });
});
router.post('/uploadCSV', upload.single('uploadcsv'),function(req, res) {
	baseCurrency = req.body.currency;
  fetch.fetchUrl('https://api.exchangeratesapi.io/latest?base='+baseCurrency,function(err,meta,body){
	if(err){
		res.send("error while fetching the exchange rates !!! ");
	}
	exchangeRates = JSON.parse(body).rates;
	fs.createReadStream('public/files/'+fileName)
	.pipe(csv())
	.on('data', (data) => {
		let tmpJson = {};
			if(exchangeRates[data['Donation Currency']] != undefined){
				data['Donation Amount'] = parseInt(data['Donation Amount']) * parseInt(exchangeRates[data['Donation Currency']]);
				tmpJson['Base Supported'] = true;
			} else {
				data['Donation Amount'] = parseInt(data['Donation Amount']) * 1;
				tmpJson['Base Supported'] = false;
			}
					if(nonProfitToIndexMap.hasOwnProperty(data['Nonprofit'])){
						index = nonProfitToIndexMap[data['Nonprofit']];
						results[index]['Total Amount'] = parseInt(results[index]['Total Amount']) + parseInt(data['Donation Amount']);
						results[index]['Total Fee'] = parseFloat(results[index]['Total Fee']) + parseFloat(data['Fee']);
						results[index]['Number of Donations'] = parseInt(results[index]['Number of Donations']) + 1;
						
					} else {
						
						tmpJson['Nonprofit'] = data['Nonprofit'];
						tmpJson['Total Amount'] = data['Donation Amount'];
						tmpJson['Total Fee'] = data['Fee'];
						tmpJson['Number of Donations'] = 1;
						results.push(tmpJson);
						nonProfitToIndexMap[data['Nonprofit']] = results.length -1; 
					}
				//results.push(data);
			
	})
	.on('end', () => {
		//console.log(results);
		try {
			const csv = parse(results, opts);
			fs.writeFileSync("./public/files//destination.csv", csv,{mode: 0o777});
			res.set('Content-Type', 'text/csv');
			res.download(path.resolve('public/files/destination.csv'));
		} catch (err) {
			res.send(err);
		}
	  
	});
	});

});

module.exports = router;
