$(function() {
    var api = "http://192.168.8.1/api/";
    var xml = '<?xml version="1.0" encoding="UTF-8"?><request>';

    var getAjax = function(resource) {
        var endpoint = api + resource;
        return $.ajax({
            url: endpoint,
            dataType: 'xml',
            timeout: 5000
        });
    }

    var postAjax = function(resource, data, token) {
        var endpoint = api + resource;
        return $.ajax({
            type: "POST",
            url: endpoint,
            headers: {
                '__RequestVerificationToken': token
            },
            data: data,
            contentType: "text/xml",
            dataType: 'xml',
            timeout: 5000
        });
    }

    var getStatus = function() {
        var resource = "device/signal";
        return getAjax(resource);
    }

    var getAntennaStatus = function() {
        var resource = "device/antenna_type";
        return getAjax(resource);
    }

    var getAntennaSetType = function() {
        var resource = "device/antenna_set_type";
        return getAjax(resource);
    }

    var getToken = function() {
        var resource = "webserver/token";
        return getAjax(resource);
    }

    var getXML = function(xml, tag) {
        return $(xml).find(tag).first().text();
    }

    var getSignalRate = function(obj, grade) {

        /*
            excellent = 3
            good = 2
            fair = 1
            poor = 0
            https://usatcorp.com/faqs/understanding-lte-signal-strength-values/
        */
        var rate = 0;
        switch (obj) {
            case "rsrp":
                rate = rateRsrp(grade);
                break;
            case "rsrq":
                rate = rateRsrq(grade);
                break;
            case "sinr":
                rate = rateSinr(grade);
                break;
            default:
        }
        return rate;
    }

    var getPercentage = function(grade, min, max, max2) {

        var percentage = ((grade - min) * 100) / (max - min);
        if (percentage > 100) {
            if (typeof max2 !== 'undefined') {
                percentage = ((max2 - grade) * 100) / (max2 - max);
                if (percentage < 0) {
                    percentage = 0;
                }
            } else {
                percentage = 100;
            }
        } else if (percentage < 0) {
            percentage = 0;
        }
        return percentage;
    }

    var getSignalPercentage = function(obj, gradetxt) {
        gradetxt = gradetxt.replace(/[<=>]/g, '');
        var grade = parseInt(gradetxt);
        var percent = 0;
        switch (obj) {
            case "rsrp":
                percent = getPercentage(grade, -120, -75);
                break;
            case "rsrq":
                percent = getPercentage(grade, -16, 0);
                break;
            case "sinr":
                percent = getPercentage(grade, 0, 20);
                break;
            default:
        }
        return percent;
    }

    var getLoginStatus = function() {
        var resource = "user/heartbeat";
        return getAjax(resource);
    }

    var rateRsrp = function(gradetxt) {
        var grade = parseInt(gradetxt);

        if (grade >= -84) {
            return 3;
        } else if (grade >= -94 && grade <= -85) {
            return 2;
        } else if (grade >= -111 && grade <= -95) {
            return 1;
        } else {
            //15%-
            return 0;
        }

    }

    var rateRsrq = function(gradetxt) {

        var grade = parseInt(gradetxt);

        if (grade >= -4) {
            return 3;
        } else if (grade >= -9 && grade <= -5) {
            return 2;
        } else if (grade >= -13 && grade <= -10) {
            return 1;
        } else {
            return 0;
        }
    }

    var rateSinr = function(gradetxt) {
        var grade = parseInt(gradetxt);

        if (grade >= 13) {
            return 3;
        } else if (grade >= 10 && grade <= 12) { //
            return 2;
        } else if (grade >= 7 && grade <= 9) {
            return 1;
        } else {
            return 0;
        }
    }

    var updateBand = function(band, token) {
        var resource = "net/net-mode";
        var data = xml + '<NetworkMode>03</NetworkMode><NetworkBand>100000000C680380</NetworkBand><LTEBand>' + band + '</LTEBand></request>';
        return postAjax(resource, data, token);
    }

    var updateAntenna = function(antenna, token) {
        var resource = "device/antenna_set_type";
        var data = xml + '<antennasettype>' + antenna + '</antennasettype></request>';
        return postAjax(resource, data, token);
    }

    function processSignalStatus() {
        getStatus().success(function(resp) {
            //do something when the server responded
            var band = getXML(resp, 'band');
            var pci = getXML(resp, 'pci');
            var cell_id = getXML(resp, 'cell_id');
            var rsrq = getXML(resp, 'rsrq');
            var rsrp = getXML(resp, 'rsrp');
            var sinr = getXML(resp, 'sinr');

            $("#band").text(band);
            $("#pci").text(pci);
            $("#cellid").text(cell_id);
            updateSignal("rsrp", rsrp);
            updateSignal("rsrq", rsrq);
            updateSignal("sinr", sinr);
        }).error(function() {
            console.log("Error when updating status.");
        });
    }

    function processAntennaStatus() {
        getAntennaStatus().success(function(resp) {
            var antenna = getXML(resp, 'antennatype');
            var _text = antenna == 0 ? "Internal" : "External";
            $("#antenna").text(_text);

        }).error(function() {
            console.log("Error when fetching antenna status.");
        });
    }

    function processLoginStatus() {
        getLoginStatus().success(function(resp) {
            var userlevel = getXML(resp, 'userlevel');
            var router = $("#connection #router");
            var user = $("#connection  #user");

            router.attr("class", "online");
            router.children("title").html("Connected");
            if (userlevel > 0) {
                user.attr("class", "online");
                user.children("title").html("Logged-in");
            } else {
                user.attr("class", "offline");
                user.children("title").html("Logged-out");
            }

        }).error(function() {
            console.log("Not Connected.");
        });
    }

    function updateSignal(obj, grade) {

        var _id = "#" + obj; //change to class if needed        

        var _class = "";
        var _text = "";

        var width = getSignalPercentage(obj, grade) + "%"; //
        var rate = getSignalRate(obj, grade);
        switch (rate) {
            case 3:
                _text = "Excellent";
                break;
            case 2:
                _text = "Good";
                break;
            case 1:
                _text = "Average";
                break;
            case 0:
                _text = "Poor";
                break;
            default:
                _text = "Unknown";
                width = "0px";
        }

        _class = "bar-" + _text.toLowerCase();

        //remove previous bar-* class
        $(_id + " .progress-bar").removeClass(function(i, classname) {
            return (classname.match(/(^|\s)bar-\S+/g) || []).join(' ');
        });
        $(_id + " .progress-bar").width(width);
        $(_id + " .progress-bar").addClass(_class);

        $(_id + " .txt-rate").text(_text);
        $(_id + " .grade").text(grade);
    }


    $("#form-band button").click(function(e) {

        e.preventDefault();
        var button = $(this);
        var bandbuttons = $("#form-band button");

        var band = button.val();

        bandbuttons.prop('disabled', true);

        $("#form-band .loader").show();
        //get a token
        getToken().success(function(resp) {

            var token = $(resp).find('token').first().text();

            //update band            
            updateBand(band, token).success(function(resp) {
                //do something when the server responded .
                console.log("Band updated");

            }).error(function() {
                console.log("Error when updating band.");
            }).done(function() {
                $("#form-band .loader").hide();
                bandbuttons.prop('disabled', false);
                processSignalStatus();
            });
        }).error(function() {
            console.log("Error when getting token.");
        });

    });

    $("#form-antenna button").click(function(e) {
        e.preventDefault();

        var button = $(this);
        var antennabuttons = $("#form-antenna button");

        var antenna = button.val(); //value of antenna

        antennabuttons.prop('disabled', true);

        $("#form-antenna .loader").show();

        //get a token
        getToken().success(function(resp) {

            var token = $(resp).find('token').first().text();

            updateAntenna(antenna, token).success(function(resp) {

                $("#form-antenna .loader").hide();
                antennabuttons.prop('disabled', false);
                processAntennaStatus();
            }).error(function() {
                console.log("Error when updating antenna.");
            });


            //console.log("Token: ",token)
        }).error(function() {
            console.log("Error when getting token.");
        });
    });

    processAntennaStatus();
    processSignalStatus();
    processLoginStatus();
    setInterval(function() {
        processSignalStatus();
        processLoginStatus();
    }, 10000);

});