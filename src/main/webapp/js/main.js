/**
 * Created by the Tranzones at 10:31 am Jan 21 2017
 */
$( document ).ready(function() {
    function reqListener () {
        console.log(this.responseText);
    }

    var oReq = new XMLHttpRequest();
    oReq.addEventListener("load", reqListener);
    oReq.open("GET", "http://davidhuculak.me/courseplanner/api");
    oReq.send();
});
