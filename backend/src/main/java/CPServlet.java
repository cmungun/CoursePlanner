import org.apache.commons.io.IOUtils;
import org.apache.log4j.Logger;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Properties;

public abstract class CPServlet extends HttpServlet {

    protected static Logger logger;

    protected Properties appProperties;

    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        // set up the logger
        logger = Logger.getLogger(getServletName());

        // get reference to application-wide app properties provided by Servlet Context
        appProperties = (Properties) config.getServletContext().getAttribute("APP_PROPERTIES");
    }

    JSONObject getRequestJson(HttpServletRequest request) throws IOException{
        JSONObject requestJson;
        String requestString = IOUtils.toString(request.getReader());
        try {
            requestJson =  new JSONObject(requestString);
        } catch (JSONException e) {
            e.printStackTrace();
            throw new IOException("Error parsing JSON request string : " + requestString);
        }
        return requestJson;
    }

    // This function can only be called once per request. It should be replaced by above method getRequestJson
    Object grabPropertyFromRequest(String key, HttpServletRequest request) throws IOException {

        Object propertyValue = null;
        JSONObject requestJson = getRequestJson(request);

        try {
            propertyValue = requestJson.get(key);
        } catch (JSONException e) {
            e.printStackTrace();
            throw new IOException("Error grabbing JSON property from request : " + requestJson.toString());
        }

        return  propertyValue;
    }
}
