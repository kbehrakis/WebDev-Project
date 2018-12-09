// NODEMAILER
var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
const creds = require('../config/config');

// Setting the timezone to default to UTC, then convert to EST later on
const moment = require('moment-timezone');
moment.tz.setDefault("Europe/London");


//********** START ADDING OLIN CALENDAR DATA TO DATABASE **********
// Goal: Extract the calendar events from the csv and add them to a mongo database
// Approach: CSV data -> JSON -> database
// https://www.npmjs.com/package/csvtojson
const csvFilePath='./csv/2018-2019.csv'
const csv = require('csvtojson')

// Setup for the database
// https://www.w3schools.com/nodejs/nodejs_mongodb_insert.asp
var MongoClient = require('mongodb').MongoClient;
//var url = "mongodb://localhost:27017/";
var url = "mongodb://heroku_hhl60p2f:msgs8c5n35pad4fhg06fel7nno@ds229474.mlab.com:29474/heroku_hhl60p2f"

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
  dbo.dropDatabase();
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


//    var reqClasses = ["SCI1399: Special Topics in Chemistry: Paper Panacea, Part 1"];
//var reqClasses = ["ENGR3210: Sustainable Design"]
  setTimeout(function(){
    var semesterInfo = getSemesterInfo()

  setTimeout(function(){
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

    var olinMondays = semesterInfo[2].map(x => formatEventsCalendarTime(x)[0]);
    var endDate = formatEventsCalendarTime(semesterInfo[1][0])[0];


  // ******************** START ICAL SETUP *******************/
  // Goal: Create iCals for different events
  // https://nodemailer.com/message/calendar-events/
  // https://www.npmjs.com/package/ical-generator
  const ical = require('ical-generator');
  const http = require('http');

  function icalGen(eventToAdd){
        const cal = ical();
        // Get the days of the week so that we know which weekdays we need to exlude
        var excludedDates = []

        // For every meeting day, get the exclusions
        for(var i = 0; i < eventToAdd.weekday.length; i++)
        {
          switch(eventToAdd.weekday[i]){
              case "mo": {
                  excludedDates = excludedDates.concat(mondayExclusions)
                  break;
              }
            case "tu": excludedDates = excludedDates.concat(tuesdayExclusions)
            break;
            case "we": excludedDates = excludedDates.concat(wednesdayExclusions)
            break;
            case "th": excludedDates = excludedDates.concat(thursdayExclusions)
            break;
            case "fr": excludedDates = excludedDates.concat(fridayExclusions)
            break;
          }
        }

        const event = cal.createEvent({
            start: eventToAdd.start,
            end: eventToAdd.end,
            summary: eventToAdd.className,
            timezone: 'America/Boston',
            repeating: {
              freq: 'WEEKLY',
              until: moment(endDate),
              exclude: excludedDates,
              byDay: eventToAdd.days,
              }
        });
        return cal
    }

    function icalGenOlinMondays(eventToAdd){
          const cal = ical();

          const event = cal.createEvent({
              start: eventToAdd.start,
              end: eventToAdd.end,
              summary: eventToAdd.className,
              timezone: 'America/Boston'
          });
          return cal
      }

    // iCal Generator specific to the course calendar
    function icalGenEvents(eventList){
          const cal = ical();

          // For each event, add it to a calendar
          eventList.forEach(function(event) {
              const anEvent = cal.createEvent({
                                        start: event.date,
                                        end: event.endDate,
                                        allDay: true,
                                        summary: event.description,
                                        timezone: 'America/Boston'
                                    });
          })

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



     router.post('/send', (req, res, next) => {
        extractClasses(req.body.reqClasses,convert,res,req)
     })

     router.post('/sendEvents', (req, res, next) => {
        extractEvents(convert,res,req)
      })

      // Function to get the list of all classes
     router.get('/listClasses', function(req, res, next) {
          var allCourses = []

          dbo.collection("courses").find().toArray(function(err, result) {
              if (err) throw err;

              // For each entry in the datbase, we want to add it to the display list
              for(var i = 0; i < result.length;i++){
                var stringFormat = result[i].Course_Title
                allCourses.push(stringFormat)
              }
              res.send(JSON.stringify(allCourses.filter(course => course.length != null)))
          })
       })

  function sendmail(attachments,res,req){
     var mail = {
      from:  req.body.name,           // Name of the recipient
      to: req.body.email,            // Email we want to send the message to
      subject: 'iCals for the 2019 Semester',
      text: "Hi! Thanks for using the Olin iCalMaker.  Attached are the iCals you requested.  Please be sure to accept ALL attached iCals.",
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


  function extractEvents(convert,res,req){
       var iCalEvents = []
       var eventDescription = []
       var eventList = []

      // We need to create events for every entry in the database
       dbo.collection("events").find().toArray(function(err, result) {
         if (err) throw err;

         // For each entry in the datbase, we want to add a new calendar event
         for(var i = 0; i < result.length;i++){
           var eventToAdd = new Object()

           // Extract the date and description from the database
           date = formatEventsCalendarTime(result[i].date)[0]
           endDate = formatEventsCalendarTime(result[i].date)[1]

           // If this is not a multi-day event, then set end date same as start date
           if(endDate.includes("XX")){
             endDate = date
           }

           description = result[i].description

           // Add these elements to the events object
           eventToAdd.date = date
           eventToAdd.endDate = moment(endDate).add(1, 'days').format('YYYY-MM-DD');
           eventToAdd.description = description
           eventDescription.push(description)

           eventList.push(eventToAdd)
        }

        iCalEvents.push(icalGenEvents(eventList).toString())
      });

      setTimeout(function(){return convert(iCalEvents,res,req, ["Olin 2019 Events"])},2000)
  }


    function extractClasses(reqClasses,convert,res,req){
         var iCalEvents = []
         var eventDescription = []
         var extraDate = 0
        dbo.collection("courses").find({"Course_Title" : reqClasses[0]}).toArray(function(err, result) {
         while(extraDate != -1){
                    if (err) throw err;
                      var eventToAdd = new Object()
                      if (extraDate != 0)
                      {
                      time = formatTime(extraDate)
                      date = extraDate
                      }
                      else{
                       date = result[0].Time
                      time = formatTime(result[0].Time)
                      }
                      startTime = time[0]
                      endTime = time[1]
                      extraDate = time[2]


                      repeatDays = findRepeatDays(date)
                      startDate = formatStartDate(repeatDays[0])

                      eventToAdd.weekday = repeatDays;
                      eventToAdd.days = repeatDays;
                      eventToAdd.startTime = startTime;
                      eventToAdd.start = startDate+startTime;
                      eventToAdd.end = startDate+endTime;
                      eventToAdd.endTime = endTime;

                      // If the user entered in a preferred title, use that title
                      if(req.body.desiredName.length > 0){
                        eventToAdd.className = [req.body.desiredName];
                      }
                      // Otherwise, use the full course Name
                      else{
                        eventToAdd.className = reqClasses;
                      }

                      eventDescription.push(eventToAdd.className)

                      iCalEvents.push(icalGen(eventToAdd).toString())

                      // If it's an  Monday, we need to add in the Olin Mondays
                      if(moment(startDate).day() == 1){
                        var mondayEventToAdd = new Object()

                        olinMondays.forEach(function(olinMonday) {
                            startTime = eventToAdd.startTime
                            endTime = eventToAdd.endTime
                            repeatDays = []
                            startDate = olinMonday.replace(/-/g, '')
                            endDate = olinMonday.replace(/-/g, '')


                            mondayEventToAdd.weekday = repeatDays;
                            mondayEventToAdd.days = repeatDays;
                            mondayEventToAdd.startTime = startTime;
                            mondayEventToAdd.start = startDate+startTime;
                            mondayEventToAdd.end = endDate+endTime;
                            mondayEventToAdd.endTime = endTime;

                            // If the user entered in a preferred title, use that title
                            if(req.body.desiredName.length > 0){
                              mondayEventToAdd.className = [req.body.desiredName+" - Olin Monday"];
                            }
                            // Otherwise, use the full course name
                            else{
                              mondayEventToAdd.className = reqClasses+" - Olin Monday";
                            }

                            eventDescription.push(mondayEventToAdd.className)

                            iCalEvents.push(icalGenOlinMondays(mondayEventToAdd).toString())
                        })
                      }
                  } });

        setTimeout(function(){return convert(iCalEvents,res,req, eventDescription)},2000)
    }


    function convert(iCalEvents,res,req, eventDescription){
        var attachments = []


        for(var i = 0; i<iCalEvents.length;i++)
        {
            var attachment = new Object()
            attachment.filename = eventDescription[i]+".ics"//"class.ics"//iCalEvents[i].slice(iCalEvents[i].search("SUMMARY"),10)+".ics"
            attachment.method = "request"
            attachment.content = iCalEvents[i]

            attachments.push(attachment)
        }
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
        var extraDate = -1

        endPos = date.search(";");
        if (endPos == -1)
        {
            endPos = date.length;
        }
        else {
         extraDate = date.slice(endPos+2,endPos.length)
        }

         time = date.slice(spacePos+1,endPos);
         hyphenPos = time.search("-");

         startTime = time.slice(0,hyphenPos);
         var x = startTime.search(/\:/)
         if (x==-1){
           startHour =  startTime.slice(0,hyphenPos);
            startMinutes = "00";
         }
         else{
           startHour =  startTime.slice(0,x);
           startMinutes = startTime.slice(startTime.search(/\:/)+1,startTime.length);
         }
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


        if (startHour.length<2){
          startHour = "0" + startHour;
        }
        startTime = "T"+startHour+startMinutes+"00"
        endTime = "T"+endHour+endMinutes+"00"


        return[startTime,endTime,extraDate]
  }
}, 3000);
}, 3000);

  // Parser to format event dates in the database
  function formatEventsCalendarTime(date){
    var map= {
    'January': "01",
    'February': "02",
    'March': "03",
    'April': "04",
    'May': "05",
    'June': "06",
    'July': "07",
    'August': "08",
    'September': "09",
    'October':"10",
    'November':"11",
    'December':"12",
    }

    var firstSpace = date.search(" ")
    var comma = date.search(",")
    var firstOBrackets = date.search("\\(")
    var hyphen = date.search("\\-")
    var temp = date.slice(hyphen,comma)
    var secondOBrackets = temp.search("\\(")

    var month = map[date.slice(0,firstSpace)]

    if (parseInt(month,10) <= 5)
    {
        var year = "2019"
    }
    else{
          var year = "2018"
    }

    var endDate = "XX"

    // If there is a hyphen, this is a multi-day event
    if(hyphen != -1){
        endDate = date.slice(hyphen+1,secondOBrackets+hyphen)
    }

    var startDate = date.slice(firstSpace+1, firstOBrackets)

    // The day needs to be 2 characters. The 5th must be 05, for example
    if(startDate.length == 1){
        startDate = "0"+startDate
    }

    // Extracts the event description for use when making the iCals
    var eventDescription = date.slice(comma+1)

    // Combine the month/day/year into a single string
    var startDateFormat = year+"-"+month+"-"+startDate
    var endDateFormat = year+"-"+month+"-"+endDate

    return [startDateFormat, endDateFormat, eventDescription]
  }

  // ******************** HELPER FUNCTIONS **********************/
  // Get the necessary semester information from the database
  // Returns a vector in the following format: [startDate, endDate, [olinMondays], [noClasses]]
  function getSemesterInfo(){
    var startDate = []
    // Populate the startDate variable using databse info
    dbo.collection("events").find({"description" :/First day/}).toArray(function(err, result) {
      if (err) throw err;
      startDate.push(result[0].date)
    });

    var endDate = []
    // Populate the endDate variable using database info
    dbo.collection("events").find({"description" :/Last day/}).toArray(function(err, result) {
      if (err) throw err;
      endDate.push(result[0].date)
    });

    // Extract all Olin Mondays from the database
    var olinMondays = []
    // Populate the end Date variable using database info
    dbo.collection("events").find({"description" :"Olin Monday: Monday class schedule in effect"}).toArray(function(err, result) {
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

    var semesterInfo = [startDate, endDate, olinMondays, noClasses]
    return semesterInfo
  }

 // Helper function for getExludedDatesANDfirstDates. Gets all the dates when there is a school vacation week
  function checkMultiDay(entry){
    var days = []
    // This indicates that it is NOT multi-day event
    if(entry[1].includes("XX")){
      days.push(entry[0])
    }
    else{
      var firstDay = moment(entry[0])
      var lastDay = moment(entry[1])

      // Get all dates between start and end of multi-day off period
      while (firstDay.isSameOrBefore(lastDay)) {
        var formattedDate = firstDay.format('YYYY-MM-DD');

        // Add the day to the list
        days.push(formattedDate)

        // Check the next day
        firstDay.add(1, 'days');
      }
    }

    return days
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
      const startDate = formatEventsCalendarTime(semesterInfo[0][0])[0];
      const endDate = formatEventsCalendarTime(semesterInfo[1][0])[0];
      const olinMondays = semesterInfo[2].map(x => formatEventsCalendarTime(x)[0]);

      // noClasssesNotFlat returns a list of lists so we need to flatten it
      const noClasssesNotFlat = semesterInfo[3].map(x => checkMultiDay(formatEventsCalendarTime(x)));

      // OlinMondaysNotFlat returns a list of lists so we need to flatten it
      const noClasses = [].concat.apply([], noClasssesNotFlat);

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

      return jsonObject;
  }
});

module.exports = router;
