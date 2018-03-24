'use strict';

let f = require('util').format;
let nodemailer = require('nodemailer');
let remove = require("remove");
let fs = require("fs");
let MongoClient = require('mongodb').MongoClient;
let assert = require('assert');
let argv = require('minimist')(process.argv.slice(2));

const json_schema_path = 'courseInfoSchema.json';
const scraped_course_info_folder = '../scrapedJson';
const course_info_document_regex = /_document/;

let Ajv = require('ajv');
let ajv = new Ajv({ "verbose": true, "allErrors": true });
let validate = ajv.compile(JSON.parse(fs.readFileSync(json_schema_path, 'utf8')));

// parse password from args or display error message
if(argv._.length < 1 || !argv._[0]){
    return console.error("storer.js takes one required argument: the password for the tranzoneAdmin account on the DB");
}
const username = encodeURIComponent("tranzoneAdmin");
const password = encodeURIComponent(argv._[0]);
const devDbName = "courseplannerdb-dev";
const prodDbName = "courseplannerdb";
const dbName = (argv.prod) ? prodDbName : devDbName;
const dbFullUrl = f('mongodb://%s:%s@localhost:27017/%s?authSource=admin', username, password, dbName);

let log = "*** Course Info Validation Log ***<br><br>";

const storeAllCourseInfo = (function (){

    console.log("Storing + validating sequence json data");

    let numValidated = 0;

    MongoClient.connect(dbFullUrl, function(err, db) {
        assert.equal(null, err);
        console.log("Connected successfully to db server");

        let foundIssue = false;

        // read all files in course info folder and pass them through the validator
        fs.readdir(scraped_course_info_folder, function (err, files) {
            if(files.length < 1){
                db.close();
                return console.error("WARNING: storer found no files in scrapedJson/");
            }
            files = files.filter(file => course_info_document_regex.test(file));
            files.forEach(function (file) {
                fs.readFile(scraped_course_info_folder + '/' + file, "utf-8", function (err, fileContent) {
                    if (err) {
                        throw err;
                    }
                    let courseInfosJSON = JSON.parse(fileContent);

                    let isSequenceValid = validate(courseInfosJSON);

                    numValidated++;
                    if(!isSequenceValid){
                        logMessage(file + ": FAIL - ");
                        logMessage(JSON.stringify(validate.errors, undefined, 4));
                        foundIssue = true;
                    } else {
                        logMessage(file + ": PASS");

                        // write the json to the db
                        courseInfosJSON.forEach(courseInfoJSON => {
                            db.collection("courseInfo").update({_id : courseInfoJSON.code}, {$set:courseInfoJSON}, {upsert: true}, function(err, result) {
                                assert.equal(err, null);
                                logMessage("Wrote contents of file: " + courseInfoJSON.code + " to db.")
                            })
                        })
                    }

                    if (numValidated === files.length) {
                        db.close();
                        if(foundIssue){
                            sendIssueEmail();
                        }
                    }
                });
            });
        });
    });
})();

function logMessage(message){
    console.log(message);
    log += message + "<br>"
}

function sendIssueEmail(){

    let message = "The course info scraper encountered errors in its most recent execution (" + new Date().toString() + ")\n" +
                    " Below are the logs from the scrape attempt:<br><br>";
    message += log;

    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // secure:true for port 465, secure:false for port 587
        auth: {
            user: 'concordiacourseplanner@gmail.com',
            pass: 'tranzone'
        }
    });

    let mailOptions = {
        from: '"Course Planner Debug" <concordiacourseplanner@gmail.com>', // sender address
        to: 'davidhuculak5@gmail.com, petergranitski@gmail.com , stumash1@gmail.com', // list of receivers
        subject: 'Course Planner has encountered an issue', // Subject line
        html: message // html body
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
}
