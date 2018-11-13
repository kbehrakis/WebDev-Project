// NODEMAILER
var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
const creds = require('../config/config');

//********** ADDING CALENDAR DATA TO DATABASE **********
// Overall idea: CSV data -> JSON -> database
// https://www.npmjs.com/package/csvtojson
const csvFilePath='./csv/2018-2019.csv'
const csv = require('csvtojson')

// Setup for the database
// https://www.w3schools.com/nodejs/nodejs_mongodb_insert.asp
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

// Convert the csv file to a json object, then add jsonObj to database
csv().fromFile(csvFilePath).then((jsonObj)=>{
  // Establish the connection
  MongoClient.connect(url, function(err, db) {
    // Error catching
    if (err) throw err;

    // database name is mydb, collection is events
    var dbo = db.db("mydb");
    var myobj = jsonObj;

    dbo.collection("events").insertMany(myobj, function(err, res) {
      if (err) throw err;
      console.log("Number of documents inserted: " + res.insertedCount);
      db.close();
    });
  });
})

/* Example format of jsonArray:
  [ { date: '2018 FALL', description: '' },
    { date: 'August 25(Sa)',
      description: 'Arrival Day for Class of 2022' },
    { date: 'August 25 - August 29(Sa-W)',
      description:
       'Orientation: Academic Advising, Team Building, Leadership Skills' },
    { date: 'August 28(Tu)',
      description: 'Upperclass students arrive' },
    { date: 'August 30(Th)',
      description:
       'First day of instruction, Full Semester & Session I Courses' }
  ]
*/



// ******************** START ICAL SETUP *******************/
// https://nodemailer.com/message/calendar-events/
// https://www.npmjs.com/package/ical-generator
const ical = require('ical-generator');
const http = require('http');
//const cal = ical({domain: 'github.com', name: 'my first iCal'});
const cal = ical();
const moment = require('moment');

// overwrite domain
//cal.domain('localhost:3000');

const event = cal.createEvent({summary: 'My Event'});
/*const event = cal.createEvent({
    start: moment(),
    end: moment().add(1, 'hour'),
    summary: 'Example Event',
    description: 'It works ;)',
    location: 'my room',
});
*/

// ******************** END ICAL SETUP *******************/




// ******************** EMAIL SETUP **********************/
// Use the smtp protocol and gmail b/c that's our email provider
// https://nodemailer.com/smtp/
var smtpConfig = {
  host: 'smtp.gmail.com',
  auth: {
    user: creds.USER,
    pass: creds.PASS
  }
}

// Create the transport from the smtp configuration
var transporter = nodemailer.createTransport(smtpConfig)

// Verify ensures that the transported was created effectively such that the server is ready
transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log('Server is ready to our messages');
  }
});

router.post('/send', (req, res, next) => {
  var name = req.body.name
  var email = req.body.email
  var message = req.body.message
  var content = 'Hi! \nAttached are your iCals for the upcoming semester!'

  // Encpsulate all of the email data to then send via the transported
  var mail = {
    from: name,           // Name of the recipient
    to: email,            // Email we want to send the message to
    subject: 'iCals for the 2019 Semester at Olin',
    text: content,
    icalEvent: {
        filename: 'invitation.ics',
        method: 'request',
        content: cal.toString()
    }
  }

  // https://nodemailer.com/transports/sendmail/
  transporter.sendMail(mail, (err, data) => {
    if (err) {
      res.json({
        msg: 'fail'
      })
    } else {
      res.json({
        msg: 'success'
      })
    }
  })
})

module.exports = router;
