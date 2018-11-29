// NODEMAILER
var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
const creds = require('../config/config');

const moment = require('moment');

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

// Establish the connection
MongoClient.connect(url, function(err, db) {
  // Error catching
  if (err) throw err;
  // Database name is mydb, collection is events
  var dbo = db.db("mydb");

  // Convert the csv file to a json object, then add jsonObj to database
  csv().fromFile(csvFilePath).then((jsonObj)=>{
      // Error catching
      if (err) throw err;

      // database name is mydb, collection is events
      var dbo = db.db("mydb");
      var myobj = jsonObj;

      dbo.collection("events").insertMany(myobj, function(err, res) {
        if (err) throw err;
        console.log("Number of documents inserted: " + res.insertedCount);
      });
  })

  /* Example format of jsonArray:
    [ { date: '2018 FALL', description: '' },
      { date: 'August 25(Sa)',
        description: 'Arrival Day for Class of 2022' },
      { date: 'August 25 - August 29(Sa-W)',
        description:
         'Orientation: Academic Advising, Team Building, Leadership Skills' }
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
      var myobj = jsonObj;

      dbo.collection("courses").insertMany(myobj, function(err, res) {
        if (err) throw err;
        console.log("Number of documents inserted: " + res.insertedCount);
      });
  })
  //********** END ADDING COURSE DATA TO DATABASE **********



    var reqClasses = ["SCI1399: Special Topics in Chemistry: Paper Panacea, Part 1"];
    var semesterInfo = getSemesterInfo()

    // Get the object storing the list of the days we will need to exclude from the iCals and the start dates
    var excludedDaysANDfirstDates = getExludedDatesANDfirstDates(semesterInfo);
    var mondayExclusions = excludedDaysANDfirstDates[0].allDates;
    var tuesdayExclusions = excludedDaysANDfirstDates[1].allDates;
    var wednesdayExclusions = excludedDaysANDfirstDates[2].allDates;
    var thursdayExclusions = excludedDaysANDfirstDates[3].allDates;
    var fridayExclusions = excludedDaysANDfirstDates[4].allDates;

    // Sets up the variables that store the first dates of each day of the week
    var firstMonday = excludedDaysANDfirstDates[0].firstDate;
    var firstTuesday = excludedDaysANDfirstDates[1].firstDate;
    var firstWednesday = excludedDaysANDfirstDates[2].firstDate;
    var firstThursday = excludedDaysANDfirstDates[3].firstDate;
    var firstFriday = excludedDaysANDfirstDates[4].firstDate;

    // CHANGE TO: const endDate = semesterInfo[1];
    var endDate = new Date('May 03 2019 00:00:00 UTC')


  // ******************** START ICAL SETUP *******************/
  // Goal: Create iCals for different events
  // https://nodemailer.com/message/calendar-events/
  // https://www.npmjs.com/package/ical-generator
  const ical = require('ical-generator');
  const http = require('http');
  //const cal = ical({domain: 'github.com', name: 'my first iCal'});

  function icalGen(eventToAdd){
        const cal = ical();

        // Get the day of the week so that we know which weekdays we need to exlude
        var excludedDates = []
        switch(eventToAdd.weekday){
          case "mo": excludedDates = mondayExclusions
          break;
          case "tu": excludedDates = tuesdayExclusions
          break;
          case "we": excludedDates = wednesdayExclusions
          break;
          case "th": excludedDates = thursdayExclusions
          break;
          case "fr": excludedDates = fridayExclusions
          break;
        }
        console.log("HERE: " +excludedDates.toString())

        const event = cal.createEvent({
            start: eventToAdd.start,
            end: eventToAdd.end,
            summary: 'Example Event',
            description: 'It works ;)',
            location: 'my room',
            repeating: {
              freq: 'WEEKLY',
              until: endDate,
              exclude: excludedDates,
              byDay: eventToAdd.days,
              }
        });
        return cal
  }

  // ******************** END ICAL SETUP *******************/


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
      console.log('Server is ready for our messages');
    }
  });
  // ******************** END EMAIL SETUP **********************/



  // Need to do a timeout because we need to wait until the info has been fully added to the database
  setTimeout(function(){
    router.post('/send', (req, res, next) => {
       console.log("jksdj")
       extractClasses(reqClasses,convert,res,req)

     })


  function sendmail(attachments,res,req){
     var mail = {
      from:  req.body.name,           // Name of the recipient
      to: req.body.email,            // Email we want to send the message to
      subject: 'iCals for the 2019 Semester',
      text: "Hi! Thanks for using the Olin iCalMaker.  Attached are the iCals you requested.",
      attachments: attachments}

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
  }

    function extractClasses(reqClasses,convert,res,req){
         var iCalEvents = []

         for(var i = 0; i<reqClasses.length;i++){
                 dbo.collection("courses").find({"Course Title" : "SCI1399: Special Topics in Chemistry: Paper Panacea, Part 1"}).toArray(function(err, result) {
                    if (err) throw err;
                      var eventToAdd = new Object()
                      startTime = formatTime(result[0].Time)[0]
                      endTime = formatTime(result[0].Time)[1]
                      repeatDays = findRepeatDays(result[0].Time)
                      startDate = formatStartDate(repeatDays[0])

                      eventToAdd.weekday = repeatDays[0];
                      eventToAdd.days = repeatDays;
                      eventToAdd.start = startDate+startTime;
                      eventToAdd.end = startDate+endTime;

                      iCalEvents.push(icalGen(eventToAdd).toString())

                   });
        }
        setTimeout(function(){return convert(iCalEvents,res,req)},2000)
    }


    function convert(iCalEvents,res,req){
        var attachments = []
        for(var i = 0; i<iCalEvents.length;i++)
        {
            var attachment = new Object()

            attachment.filename = "class.ics"
            attachment.method = "request"
            attachment.content = iCalEvents[i]

            attachments.push(attachment)
        }
        console.log(attachments)
        sendmail(attachments,res,req)
       return attachments
    }

    function formatStartDate(firstDay){
        if (firstDay == "mo"){
            return firstMonday.replace(/-/g, "")
          }

        if (firstDay == "tu"){
            return firstTuesday.replace(/-/g, "")
          }

        if (firstDay == "we"){
            return firstWednesday.replace(/-/g, "");
          }

        if (firstDay == "th"){
            return firstThursday.replace(/-/g, "");
          }

        if (firstDay == "fr"){
            return firstFriday.replace(/-/g, "");}
    }

    function findRepeatDays(date){

    var dict = new Object();
    dict["T"] = "tu";
    dict["M"] = "mo";
    dict["W"] = "we";
    dict["R"] = "th";
    dict["F"] = "fr";

    spacePos = date.search(" ");
    days = date.slice(0,spacePos);

    i = 0;

    var repeatDays = [];
    while (i<days.length)
    {
        day = days.charAt(i);
        repeatDays.push(dict[day]);
        i = i + 1;
    }

    return repeatDays
    }

    function formatTime(date){

        spacePos = date.search(" ");
        days = date.slice(0,spacePos);

        endPos = date.search(";");
        if (endPos == -1)
        {
            endPos = date.length;
        }

         time = date.slice(spacePos+1,endPos);
         hyphenPos = time.search("-");

         startTime = time.slice(0,hyphenPos);
         startHour =  startTime.slice(0,startTime.search(/\:/));
         startMinutes = startTime.slice(startTime.search(/\:/)+1,startTime.length);

         endTime = time.slice(hyphenPos+1,time.length);
         endHour =  endTime.slice(0,endTime.search(/\:/));
         endMinutes = endTime.slice(endTime.search(/\:/)+1,endTime.length-2);

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

        startTime = "T"+startHour+startMinutes+"00"
        endTime = "T"+endHour+endMinutes+"00"

        return[startTime,endTime]

  }


  }, 2000);



  // ******************** HELPER FUNCTIONS **********************/
  // Get the necessary semester information from the database
  // Returns a vector in the following format: [startDate, endDate, [olinMondays], [noClasses]]


  function getSemesterInfo(){
    var startDate = null
    // Populate the startDate variable using databse info
    dbo.collection("events").find({"description" :"First day of instruction, Full Semester & Session I Courses"}).toArray(function(err, result) {
      if (err) throw err;
      // Result is an array because there are 2 start dates - one for fall and one for spring
      startDate = result[1].date;
    });

    var endDate = null
    // Populate the endDate variable using database info
    dbo.collection("events").find({"description" :"Last day of instruction; Last day to withdraw from a Full Session or Session II Course"}).toArray(function(err, result) {
      if (err) throw err;
      // Result is an array because there are 2 end dates - one for fall and one for spring
      endDate = result[1].date;
    });

    // Extract all Olin Mondays from the database
    var olinMondays = []
    // Populate the end Date variable using database info
    dbo.collection("events").find({"description" :"Olin Monday � Monday class schedule in effect"}).toArray(function(err, result) {
      if (err) throw err;
      // Result is an array because of all olin mondays
      result.forEach(function(olinMonday) {
        olinMondays.push(olinMonday.date)
      })
    });

    // Extract all days off from the database
    var noClasses = []
    // Go through the database and find decriptions that contain "no classes" somewhere in them
    dbo.collection("events").find({"description" : /no classes/}).toArray(function(err, result) {
      if (err) throw err;
      // Result is an array of all days off
      result.forEach(function(dayOff) {
        noClasses.push(dayOff.date)
      })
    });

    // Need to wait to make sure we have populated all varaibles assigned above
    setTimeout(function(){
      var semesterInfo = [startDate, endDate, olinMondays, noClasses]
      return semesterInfo
    }, 2000)
  }


  // Returns a JSON object that stores the Olin Mondays and days off that occur on each day during the semester
  // This will get us a list of unusual days that we will need to exclude when making the iCals
  // It will also have a field indicating the first Monday, Tuesday, etc in the semester
  /* Of the form:
      [
          {day: 'Monday', allDates: ['February 4, 2019',
                                     'February 11, 2019',
                                     ....],
                          firstDate: 'January 28, 2019'},
          {day: 'Tuesday', allDates: ['February 5, 2019',
                                      'February 12, 2019',
                                     ....]
                          firstDate: 'January 29, 2019'},
          ....
      ]*/


  function getExludedDatesANDfirstDates(semesterInfo) {
    /**** THESE NEED TO BE PARSED CORRECTLY SO WE CAN USE THEM ****/
    //const startDate = semesterInfo[0];
    //const endDate = semesterInfo[1];
    //const olinMondays = semesterInfo[2];
    //const noClasses = semesterInfo[3];
    const startDate = "2019-01-23"
    const endDate = "2019-05-03"
    const olinMondays = ["2019-02-20", "2019-04-11"]
    const noClasses = ["2019-02-18","2019-03-07", "2019-03-18", "2019-03-19", "2019-03-20","2019-03-21","2019-03-22", "2019-04-15"]

    // This will keep track of the days.  0 is Sunday, 1 is Monday, etc.
    var day = 1

    var jsonObject = [{"day":"Monday", "allDates":[], "firstDate":""},
                      {"day":"Tuesday", "allDates":[], "firstDate":""},
                      {"day":"Wednesday", "allDates":[], "firstDate":""},
                      {"day":"Thursday", "allDates":[], "firstDate":""},
                      {"day":"Friday", "allDates":[], "firstDate":""}
                    ]

    // For each day of the week, we will be adding dates
    jsonObject.forEach(function(weekday) {
      var result = [];
      var current = moment(startDate);
      var count = 0;

      // While we haven't reached the end date, keep adding days
      while (current.day(day).isSameOrBefore(endDate)) {
        var formattedDate = current.format('YYYY-MM-DD');
        var isUnusualDate = olinMondays.includes(formattedDate) || noClasses.includes(formattedDate)

        if(current.day(day).isSameOrAfter(startDate)){
          // If the day we're adding is a day with no classes or an Olin monday, then we will add it to the meeting times we need to exlucde for this day
          if(isUnusualDate){
            result.push(formattedDate);
          }
          // If this is the first weekday of the semester, add it to the json object
          else if(count == 0){
            weekday.firstDate = formattedDate
            count = count + 1;
          }
        }

        // Skip forward 1 week to get the next date
        current.day(7)
      }

      weekday.allDates = result

      // Move ahead one day
      day = day + 1
    });

    //console.log(jsonObject);
    return jsonObject;
  };

});

module.exports = router;
