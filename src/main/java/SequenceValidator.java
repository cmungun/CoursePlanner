import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang.exception.ExceptionUtils;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.awt.Point;

public class SequenceValidator extends CPServlet {

    // Constants representing the types of issues that course sequences are validated against
    private static enum ISSUES {

        REPEATED, CREDITCOUNT, PREREQUISITE, COREQUISITE;

        // JSON-friendly names for returning validation messages to client
        @Override
        public String toString() {
            if (this == REPEATED) {
                return "repeated";
            } else if (this == CREDITCOUNT) {
                return "creditCount";
            } else if (this == PREREQUISITE) {
                return "prerequisite";
            } else if (this == COREQUISITE){
                return "corequisite";
            }
            return null;
        }
    }

    // Constants representing the types of warnings that course sequences are validated against
    private static enum WARNINGS {

        UNSELECTED_OPTION;

        // JSON-friendly names for returning validation messages to client
        @Override
        public String toString() {
            if (this == UNSELECTED_OPTION) {
                return "unselectedOption";
            }
            return null;
        }
    }

    // Constants representing the 3 possible seasons in which there can be a semester of courses
    private static enum SEASONS {
        FALL, WINTER, SUMMER;
        // JSON-friendly
        @Override
        public String toString() {
            return this.name().toLowerCase();
        }
    }

    // respond to POST request
    public void doPost(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
    {
        logger.info("---------User requested a sequence validation---------");

        response.setContentType("text/html");

        JSONObject courseSequenceObject = (JSONObject) grabPropertyFromRequest("courseSequenceObject", request);

        String validationResults;
        try {
            validationResults = validateSequence(courseSequenceObject).toString();
        } catch(Exception e){
            JSONObject validationResultsJsonObj = new JSONObject();

            try {
                // TODO: output error object only if logger.DEBUG ?
                validationResultsJsonObj.put("error", ExceptionUtils.getStackTrace(e));
            } catch(JSONException jsonExc) { jsonExc.printStackTrace(); }

            validationResults = validationResultsJsonObj.toString();
        }

        logger.info("Responding with: " + validationResults);

        response.getWriter().println(validationResults);
    }

    /**
     * Perform the JSON course sequence validation
     * @param cso the json course sequence object to validate
     * @return a json object representing the results of the course sequence validation
     */
    private JSONObject validateSequence(JSONObject cso)
    throws Exception
    {
        JSONObject sequenceValidationResults = new JSONObject();
        boolean sequenceIsValid = true;
        JSONArray issues = new JSONArray();
        JSONArray warnings = new JSONArray();

        Double minTotalCredits = Double.parseDouble((String)cso.get("minTotalCredits"));
        Double creditCount = 0.0;

        // set of course ids with fatal warnings/issues. course id = Point<unique semester id, course list index>
        HashSet<Point> errci = new HashSet<>();
        // map course codes to list of course ids in course sequence
        HashMap<String, ArrayList<Point>> cc2ci = new HashMap<String, ArrayList<Point>>();

        JSONArray yearList = cso.getJSONArray("yearList");
        if (yearList.length() == 0) throw new Exception("empty yearList");

        int numLoops = 2; // for now only 2 loops needed for all validation
        for (int loopCount = 0; loopCount < numLoops; loopCount++)
        {
            // for each year
            for (int yearIdx = 0; yearIdx < yearList.length(); yearIdx++)
            {
                JSONObject year = (JSONObject) yearList.get(yearIdx);

                JSONObject fall   = year.getJSONObject(SEASONS.FALL.toString());
                JSONObject winter = year.getJSONObject(SEASONS.WINTER.toString());
                JSONObject summer = year.getJSONObject(SEASONS.SUMMER.toString());

                // for each semester in that year
                JSONObject[] semsInYear = {fall, winter, summer};
                for (int semsInYearIdx = 0; semsInYearIdx < SEASONS.values().length; semsInYearIdx++)
                {
                    int uniqueSemesterId = yearIdx * SEASONS.values().length + semsInYearIdx; // for cc2ci

                    // for each course in that semester
                    JSONArray coursesInSem = semsInYear[semsInYearIdx].getJSONArray("courseList");
                    for (int coursesInSemIdx = 0; coursesInSemIdx < coursesInSem.length(); coursesInSemIdx++)
                    {

                        // VALIDATE FATAL ISSUES/WARNINGS (THOSE THAT PREVENT FURTHER VALIDATION OF A COURSE)
                        //------------------------------------------------------------------------------------

                        // no matter what loopCount, stop validating this course if it already has a fatal error
                        if (errci.contains(new Point(uniqueSemesterId, coursesInSemIdx))) {
                            continue;
                        }

                        JSONObject course = null;
                        // course can be single course or orList of courses
                        try {
                            course = (JSONObject) coursesInSem.get(coursesInSemIdx);
                        } catch(JSONException e) {
                            JSONArray orList = (JSONArray) coursesInSem.get(coursesInSemIdx);
                            int optionsSelected = 0;
                            for (int orListIdx = 0; orListIdx < orList.length(); orListIdx++) {
                                JSONObject courseInOrList = (JSONObject) orList.get(orListIdx);
                                if (courseInOrList.getBoolean("isSelected")) {
                                    optionsSelected += 1;
                                    course = courseInOrList;
                                }
                            }

                            // UNSELECTED OPTION

                            if (optionsSelected < 1) {
                                sequenceIsValid = false;
                                errci.contains(new Point(uniqueSemesterId, coursesInSemIdx));

                                warnings
                                .put(new JSONObject()
                                    .put("type", WARNINGS.UNSELECTED_OPTION.toString())
                                    .put("data", new JSONObject()
                                        .put("position", positionObject(yearIdx,semsInYearIdx,coursesInSemIdx))
                                    )
                                );

                                continue; // 'unselected option' is a fatal error so stop validating this course
                            }
                            // TODO: handle optionsSelected > 1
                        }

                        // VALIDATE REGULAR ISSUES/WARNINGS
                        //----------------------------------

                        String courseCode = (String) course.get("code");

                        if (loopCount == 0)
                        {
                            if (cc2ci.get(courseCode) == null) {
                                ArrayList<Point> courseOccurences = new ArrayList<>();
                                courseOccurences.add(new Point(uniqueSemesterId, coursesInSemIdx));
                            } else {
                                cc2ci.get(courseCode).add(new Point(uniqueSemesterId, coursesInSemIdx));
                            }

                            // CREDIT COUNT

                            creditCount += Double.parseDouble((String)course.get("credits"));
                        }
                        else if (loopCount == 1)
                        {
                            // TODO: PREREQUISITE

                            boolean prereqsValid = true;

                            // TODO: COREQUISITE

                            boolean coreqsValid = true;
                            //
                       }
                    }
                }
            }
        }

        // REPEATED

        for (String courseCode : cc2ci.keySet()) {
            ArrayList<Point> courseOccurences = cc2ci.get(courseCode);
            if (courseOccurences.size() > 1) {
                sequenceIsValid = false;

                JSONArray positions = new JSONArray();
                for (Point courseOccurencePosition : courseOccurences) {
                    int uniqueSemesterId = (int) courseOccurencePosition.getX(); // no precision lost since
                    int courseIndex = (int) courseOccurencePosition.getY(); // double has 52 bits and int has 32
                    positions.put(positionObject(uniqueSemesterId, courseIndex));
                }

                issues
                .put(new JSONObject()
                    .put("type", ISSUES.REPEATED.toString())
                    .put("data", new JSONObject()
                        .put("courseCode", courseCode)
                        .put("positions", positions)
                    )
                );
            }
        }

        // CREDIT COUNT

        if (creditCount < minTotalCredits) {
            sequenceIsValid = false;

            issues
            .put(new JSONObject()
                .put("type", ISSUES.CREDITCOUNT.toString())
                .put("data", new JSONObject()
                    .put("required", minTotalCredits.toString())
                    .put("actual", creditCount.toString())
                )
            );
        }

        // SEND ISSUE LIST IF SEQUENCE NOT VALID

        if (!sequenceIsValid) {
            sequenceValidationResults
            .put("isValid", "false")
            .put("issues", issues)
            .put("warnings", warnings);
        } else {
            sequenceValidationResults.put("isValid", "true");
        }

        return sequenceValidationResults;
    }

    // helpers to create JSON object representing position of course in course sequence
    private JSONObject positionObject(Integer yearIdx, Integer seasonIdx, Integer courseIdx) {
        return new JSONObject()
            .put("yearIndex", yearIdx.toString())
            .put("season", SEASONS.values()[seasonIdx].toString())
            .put("courseIndex", courseIdx.toString());
    }
    private JSONObject positionObject(Integer uniqueSemesterId, Integer courseIdx) {
        return new JSONObject()
            .put("yearIndex", new Integer(uniqueSemesterId / SEASONS.values().length).toString())
            .put("season", SEASONS.values()[uniqueSemesterId % SEASONS.values().length].toString())
            .put("courseIndex", courseIdx.toString());
    }
}
