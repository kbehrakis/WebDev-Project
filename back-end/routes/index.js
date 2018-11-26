// NODEMAILER
var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
const creds = require('../config/config');

//********** START ADDING OLIN CALENDAR DATA TO DATABASE **********
// Goal: Extract the calendar events from the csv and add them to a mongo database
// Approach: CSV data -> JSON -> database
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

//********** END ADDING CALENDAR DATA TO DATABASE **********



//********** START ADDING COURSE DATA TO DATABASE **********
// Goal: Extract the course data from the csv and add them to a mongo database
// Approach: CSV data -> JSON -> database
// https://www.npmjs.com/package/csvtojson
const coursesFilePath='./csv/2019courses.csv'

// Convert the csv file to a json object, then add jsonObj to database
csv().fromFile(coursesFilePath).then((jsonObj)=>{
  // Establish the connection
  MongoClient.connect(url, function(err, db) {
    // Error catching
    if (err) throw err;

    // database name is mydb, collection is events
    var dbo = db.db("mydb");
    var myobj = jsonObj;

    dbo.collection("courses").insertMany(myobj, function(err, res) {
      if (err) throw err;
      console.log("Number of documents inserted: " + res.insertedCount);
      db.close();
    });
  });
})
//********** END ADDING COURSE DATA TO DATABASE **********




// ******************** START ICAL SETUP *******************/
// Goal: Create iCals for different events
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


var date = "TW 9.40-4.50pm";
spacePos = date.search(" ");
days = date.slice(0,spacePos);


var x = new Object();
x["T"] = "tu";
x["M"] = "mo";
x["W"] = "we";
x["R"] = "th";
x["F"] = "fr";

i = 0;
var repeatDays = [];
while (i<days.length)
{
    day = days.charAt(i);
    repeatDays.push(x[day]);
    i = i + 1;
}

endPos = date.search(";");
if (endPos == -1)
{
    endPos = date.length;
}

time = date.slice(spacePos+1,endPos);

hyphenPos = time.search("-");
startTime = time.slice(0,hyphenPos);
startHour =  startTime.slice(0,startTime.search(/\./));
startMinutes = startTime.slice(startTime.search(/\./)+1,startTime.length);

endTime = time.slice(hyphenPos+1,time.length);
endHour =  endTime.slice(0,endTime.search(/\./));
endMinutes = endTime.slice(endTime.search(/\./)+1,endTime.length-2);

if (endTime.search("pm") != -1 && endHour<12){
        if (endHour > startHour)
        {
        startHour = String(parseInt(startHour)+12)
        }
        if (endHour == startHour && endHour != 12)
        {
         startHour = String(parseInt(startHour)+12)
        }
        endHour = String(parseInt(endHour)+12)
}

startTime = startHour+startMinutes
endTime = endHour+endMinutes


var eventToAdd = new Object();
eventToAdd.days = repeatDays;
eventToAdd.startTime = startTime;
eventToAdd.endTime = endTime;

console.log(eventToAdd);

events.push(event)


// ******************** START EMAIL SETUP **********************/
// Goal: Send iCals via email
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
// ******************** END EMAIL SETUP **********************/



// semesterInfo should be contain info on the start date, end date, and unusual dates during the semesterInfo
// Unusual dates are Olin Mondays or days off.  This info should be extracted from the course calendar
allMeetingTimesInSemester(/*semesterInfo*/)
// ******************** HELPER FUNCTIONS **********************/
// Creates a JSON object containing dates for all the Mondays, Tuesdays, etc.
// Takes into account the Olin Mondays and days off
/* Of the form:
    [
        {day: 'Monday', allDates: ['February 4, 2019',
                                   'February 11, 2019',
                                   ....]},
        {day: 'Tuesday', allDates: ['February 5, 2019',
                                    'February 12, 2019',
                                   ....]},
        ....
    ]
*/
function allMeetingTimesInSemester(/*semesterInfo*/) {
  // This will keep track of the days.  0 is Sunday, 1 is Monday, etc.
  var counter = 1

  var jsonObject = [{"day":"Monday", "allDates":[]},
                    {"day":"Tuesday", "allDates":[]},
                    {"day":"Wednesday", "allDates":[]},
                    {"day":"Thursday", "allDates":[]},
                    {"day":"Friday", "allDates":[]}]

  // For each day of the week, add it to the JSON object
  jsonObject.forEach(function(weekday) {
    // ** Will want to extract these from semesterInfo instead of hardcoding
    startDate = "2019-01-23"
    endDate = "2019-05-03"
    olinMondays = ["2019-02-20", "2019-04-11"]
    noClasses = ["2019-02-18","2019-03-07", "2019-03-18", "2019-03-19", "2019-03-20","2019-03-21","2019-03-22", "2019-04-15"]

    weekday.allDates = getListOfDates(counter, startDate, endDate, olinMondays, noClasses)

    // Move ahead one day
    counter = counter + 1
  });

  console.log(jsonObject);
  return jsonObject;
};

// Get the list of the dates excluding olin mondays and days off
function getListOfDates(day, startDate, endDate, olinMondays, noClasses){
  var result = [];
  var current = moment(startDate);

  // While we haven't reached the end date, keep adding days
  while (current.day(day).isSameOrBefore(endDate)) {
    var formattedDate = current.format('YYYY-MM-DD');
    var isUnusualDate = olinMondays.includes(formattedDate) || noClasses.includes(formattedDate)

    // If the day we're adding is a day with no classes or an Olin monday, then we will not add it to the meeting times for this day
    if(!isUnusualDate){
      if(current.day(day).isSameOrAfter(startDate)){
        result.push(formattedDate);
      }
    }

    // Skip forward 1 week to get the next date
    current.day(7)
  }

  // Add all the Olin Mondays to the Monday class meetings (monday corresponds to day 1)
  if(day == 1){
    olinMondays.forEach(function(olinMondayDate) {
      result.push(olinMondayDate)
    })
  }

  return result
}

module.exports = router;
