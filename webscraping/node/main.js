var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var fileCounter = 1;

function scrapeEncsSequenceUrl(url, outPath, shouldBeVerbose){

    request(url, function(error, response, html){
        if(!error){
            var $ = cheerio.load(html);

            var semesterList = [];
            var courseList = [];
            var currentSeason = "";
            var hasStartedScraping = false;

            $(".concordia-table.table-condensed tbody > tr").each(function(i, el){
                var $row = $(this);

                if(i === 0){
                    var seasonText = $(this).children().html().toLowerCase();
                    currentSeason = parseSeason(seasonText);
                }

                if($row.children().length === 3){
                    $row.each(function(i, el){
                        var $rowCell = $(this);
                        var containsBoldText = $rowCell.children()[0].children[0].name === "b";
                        if(!containsBoldText){
                            var code = "", name = "", isElective = "false", electiveType = "", credits = "", foundACourse = false;
                            var firstCellText = $rowCell.find("p").text() || $rowCell.find("td").text();
                            firstCellText = firstCellText.toLowerCase().trim();
                            if(firstCellText.indexOf("work term") >= 0){
                                semesterList.push({
                                    "season": currentSeason,
                                    "courseList": courseList,
                                    "isWorkTerm": "true"
                                });
                            } else if(firstCellText === "basic science"){
                                isElective = "true";
                                electiveType = "Science";
                                foundACourse = true;
                            } else if(firstCellText === "general education elective"){
                                isElective = "true";
                                electiveType = "General";
                                foundACourse = true;
                            } else if(firstCellText.indexOf("elective") >= 0){
                                isElective = "true";
                                electiveType = "Program";
                                foundACourse = true;
                            } else {
                                // add a course to the course list
                                $rowCell.children().each(function(i, el){
                                    var cellText = $(this).children().text();
                                    switch(i){
                                        case 0:
                                            code = cellText;
                                            break;
                                        case 1:
                                            name = cellText;
                                            break;
                                        case 2:
                                            credits = cellText;
                                            break;
                                    }
                                });
                                foundACourse = true;
                            }
                            if(foundACourse){
                                courseList.push({
                                    "code": code.trim(),
                                    "name": name.trim(),
                                    "isElective": isElective.trim(),
                                    "electiveType": electiveType.trim(),
                                    "credits": credits.trim()
                                });
                            }
                        }
                    });
                } else if($row.children().length === 1 && $row.children().text().toLowerCase().indexOf("year") >= 0){
                    if(hasStartedScraping){
                        if(courseList.length > 0){
                            semesterList.push({
                                "season": currentSeason,
                                "courseList": courseList,
                                "isWorkTerm": "false"
                            });
                        }
                        courseList = [];
                        currentSeason = parseSeason($row.children().text().toLowerCase());
                    }
                    hasStartedScraping = true;
                }
            });

            // add residual semester if there is one
            if(courseList.length > 0){
                semesterList.push({
                    "season": currentSeason,
                    "courseList": courseList,
                    "isWorkTerm": "false"
                });
            }

            var sequenceObject = {
                "sourceUrl": url,
                "semesterList" : semesterList
            };

            if(shouldBeVerbose){
                console.log("Finished scraping from url: " + url);
            }

            fs.writeFile(outPath, JSON.stringify(sequenceObject, null, 4), function(err){
                if(err){
                    console.error("ERROR writing to a file: " + outPath);
                    process.exit(1);
                } else if(shouldBeVerbose) {
                    console.log("Done writing file: " + outPath);
                }
            });
        }
    });
}

function parseSeason(season){
    if(season.indexOf("fall") >= 0){
        return "fall";
    } else if(season.indexOf("winter") >= 0){
        return "winter";
    } else if(season.indexOf("summer") >= 0){
        return "summer";
    }
    return undefined;
}

// pull all info contained in URLs from sequenceUrls.json and write to appropriate files
// we define this function inside the exports object to expose it to other files
module.exports.updateData = function(shouldBeVerbose){

    console.log("Generating sequence JSON files via webscraping");

    var outputDir = "../../src/main/webapp/sequences";

    fs.readFile("./sequenceUrls.json", function (err, data) {
        if (err && shouldBeVerbose) {
            console.log("ERROR reading sequenceUrls.json (this might be because the directory already exists)");
        }

        var sequenceUrls = JSON.parse(data.toString());

        fs.mkdir(outputDir, function(err){
            if(err && shouldBeVerbose){
                console.log(err);
                console.log("Couldn't create sequences directory");
            }
            for (var program in sequenceUrls) {
                var subList = sequenceUrls[program];
                var options = subList.Options;
                // in this case, sequenceVariant/optionType will be either September entry, January entry, or Coop
                if(options){
                    for(var optionType in options){
                        var optionSubList = options[optionType];
                        for(var sequenceVariant in optionSubList){
                            var url = optionSubList[sequenceVariant];
                            var fileName = outputDir + "/" + program + "-" + optionType + "-" + sequenceVariant + ".json";
                            scrapeEncsSequenceUrl(url, fileName, shouldBeVerbose);
                        }
                    }
                } else {
                    for(var sequenceVariant in subList){
                        var url = subList[sequenceVariant];
                        var fileName = outputDir + "/" + program + "-" + sequenceVariant + ".json";
                        scrapeEncsSequenceUrl(url, fileName, shouldBeVerbose);
                    }
                }
            }
        });


    });
}