// Load nem-browser library
var nem = require("nem-sdk").default;

// Connect using connector
function connect(connector){
    return connector.connect().then(function() {
    	// Set time
    	date = new Date();

        // Show event
        if(`${privateKey.value}` == ""){
            $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Cannot locate sender!</p>');
        }if(`${recipient.value}` == ""){
            $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Cannot locate recipient!</p>');
        }if(`${privateKey.value}` != "" && `${recipient.value}` != "")
        {
            $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Packing Parcel...</p>');
            $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Processing inside warehouse...</p>');
            $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Shipping to recipient...</p>');
        }
			

        // Subscribe to recent transactions channel
        if(`${privateKey.value}` != "" && `${recipient.value}` != ""){
            nem.com.websockets.subscribe.account.transactions.recent(connector, function(res){
                // Set time
                date = new Date();
                // Show event
                $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Recent deliveries acquired!</p>');
                // Show data
                $('#stream').append('<p><b>'+ date.toLocaleString()+': <pre>' + JSON.stringify(res) +'</pre>');
            });
        }


      //   // Show event
    	// $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Subscribing to unconfirmed transactions of '+ connector.address +'</p>');
			//
      //   // Subscribe to unconfirmed transactions channel
      //   nem.com.websockets.subscribe.account.transactions.unconfirmed(connector, function(res) {
      //       // Set time
      //       date = new Date();
      //       // Show event
      //       $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Received unconfirmed transaction</p>');
      //       // Show data
      //       $('#stream').append('<p><b>'+ date.toLocaleString()+': <pre>' + JSON.stringify(res) +'</pre>');
      //   });

        // Show event
        if(`${privateKey.value}` != "" && `${recipient.value}` != ""){
    	    $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Subscribing to Confirmed deliveries of '+ connector.address +'</p>');
        }
        // Subscribe to confirmed transactions channel
        if(`${privateKey.value}` != "" && `${recipient.value}` != ""){
            nem.com.websockets.subscribe.account.transactions.confirmed(connector, function(res) {
                // Set time
                date = new Date();
                // Show event
                $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Parcel delivered! Receipt generated</p>');
                // Show data
                $('#stream').append('<p><b>'+ date.toLocaleString()+': <pre>' + JSON.stringify(res) +'</pre>');
            });
        }


        // Show event
        if(`${privateKey.value}` != "" && `${recipient.value}` != ""){
    	$('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Requesting recent deliveries of '+ connector.address +'</p>');
        }
        // Request recent transactions
        if(`${privateKey.value}` != "" && `${recipient.value}` != ""){
        nem.com.websockets.requests.account.transactions.recent(connector);
        }
    }, function(err) {
        // Set time
        date = new Date();
        // Show event
        $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> An error occured</p>');
        // Show data
        $('#stream').append('<p><b>'+ date.toLocaleString()+': <pre>' + JSON.stringify(err) +'</pre>');
        // Try to reconnect
        reconnect();
    });
}

function reconnect() {
    // Replace endpoint object
    endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.testnet[1].uri, nem.model.nodes.websocketPort);
    // Replace connector
    connector = nem.com.websockets.connector.create(endpoint, address);
    // Set time
    date = new Date();
    // Show event
    $('#stream').append('<p><b>'+ date.toLocaleString()+':</b> Trying to connect to: '+ endpoint.host +'</p>');
    // Try to establish a connection
    connect(connector);
}

function start(address) {
    // Create an NIS endpoint object
    var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.websocketPort);

    // Address to subscribe
    var account_address = nem.model.address.clean(address);

    // Create a connector object
    var connector = nem.com.websockets.connector.create(endpoint, account_address);

    // Set start date of the monitor
    var date = new Date();

    // Try to establish a connection
    connect(connector);
}

$(document).ready(function () {
    // Call connect function when click on send button
    $("#send").click(function() {
      start($("#recipient option:checked").val());
    });
});
