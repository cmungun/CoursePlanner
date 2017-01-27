#!/usr/bin/env bash

# get ID of current commit
commitHash=$(git rev-parse HEAD) &&

# add a script to html files that logs the current commit
sed -i "4i\<script> console.log(\"This site was built against the source of the following commit: $commitHash\") </script> " ./src/main/webapp/index.html &&
sed -i "4i\<script> console.log(\"This site was built against the source of the following commit: $commitHash\") </script> " ./src/main/webapp/scheduleBuilder.html &&

# build project
mvn clean install &&

# remove commit logging script from html
# we do not want our deploy script to change our source files
sed -i "4d" ./src/main/webapp/index.html &&
sed -i "4d" ./src/main/webapp/scheduleBuilder.html &&

# transfer the built project onto the VM
# this will trigger Tomcat to reload the site content
scp target/courseplanner.war david@138.197.6.26:/opt/tomcat/webapps/courseplanner.war
