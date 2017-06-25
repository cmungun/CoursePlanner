import com.mongodb.MongoClient;
import com.mongodb.MongoClientURI;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import javax.servlet.http.HttpServletRequest;
import java.io.BufferedReader;
import java.io.IOException;
import java.util.ArrayList;

/**
 * Created by David Huculak on 2017-02-02.
 */
public class Util {

    static final String MONGO_URL = "mongodb://138.197.6.26:27017";

    static ArrayList<Semester> grabSemestersFromRequest(HttpServletRequest request) throws IOException {

        ArrayList<Semester> semesters = new ArrayList<Semester>();

        try {
            JSONArray semestersAsJson = (JSONArray) grabPropertyFromRequest("semesterList", request);
            for(int i = 0; i < semestersAsJson.length(); i++){
                semesters.add(new Semester(semestersAsJson.getJSONObject(i)));
            }
        } catch (JSONException e) {
            e.printStackTrace();
            // crash and burn
            throw new IOException("Error parsing JSON request string");
        }

        return semesters;
    }

    static String grabSequenceIdFromRequest(HttpServletRequest request) throws IOException {
        return (String) grabPropertyFromRequest("sequenceID", request);
    }

    static Object grabPropertyFromRequest(String key, HttpServletRequest request) throws IOException {
        StringBuffer jb = new StringBuffer();
        String line;
        Object propertyValue = null;
        JSONObject requestJson;
        ArrayList<Semester> semesters = new ArrayList<Semester>();
        try {
            BufferedReader reader = request.getReader();
            while ((line = reader.readLine()) != null) {
                jb.append(line);
            }
        } catch (Exception e) { /*report an error*/ };
        try {
            requestJson =  new JSONObject(jb.toString());
            propertyValue = requestJson.get(key);
        } catch (JSONException e) {
            e.printStackTrace();
            // crash and burn
            throw new IOException("Error parsing JSON request string");
        }
        return  propertyValue;
    }

    static MongoClient getMongoClient(){
        return new MongoClient(new MongoClientURI(MONGO_URL));
    }

}
