$(document).ready(function () {

	// Load nem-browser library
	var nem = require("nem-sdk").default;

    // Create an NIS endpoint object
	var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort);

	// Create an empty un-prepared transfer transaction object
	var transferTransaction = nem.model.objects.get("transferTransaction");

	// Create an empty common object to hold pass and key
	var common = nem.model.objects.get("common");

	// Get a mosaicDefinitionMetaDataPair object with preloaded xem definition
	var mosaicDefinitionMetaDataPair = nem.model.objects.get("mosaicDefinitionMetaDataPair");

	// Set default amount. In case of mosaic transfer the XEM amount works as a multiplier. (2 XEM will multiply by 2 the quantity of the mosaics you send)
	$("#amount").val("1");

	/**
     * Function to update our fee in the view
     */
	function updateFee() {
		// Check for amount errors
		if(undefined === $("#amount").val() || !nem.utils.helpers.isTextAmountValid($("#amount").val())) return alert('Invalid amount !');

		// Set the cleaned amount into transfer transaction object
		transferTransaction.amount = nem.utils.helpers.cleanTextAmount($("#amount").val());

		// Set the message into transfer transaction object
		transferTransaction.message = $("#message").val();

		// Prepare the updated transfer transaction object
		var transactionEntity = nem.model.transactions.prepare("mosaicTransferTransaction")(common, transferTransaction, mosaicDefinitionMetaDataPair, nem.model.network.data.testnet.id);

		// Format fee returned in prepared object
		var feeString = nem.utils.format.nemValue(transactionEntity.fee)[0] + "." + nem.utils.format.nemValue(transactionEntity.fee)[1];

		//Set fee in view
		$("#fee").html(feeString);
	}

	/**
     * Build transaction from form data and send
     */
	function send() {
		// Check form for errors
		if(!transferTransaction.mosaics.length) return alert('You must attach at least one mosaic !');
		if(!$("#privateKey option:checked").val() || !$("#recipient option:checked").val()) return alert('Missing parameter !');
		if(undefined === $("#amount").val() || !nem.utils.helpers.isTextAmountValid($("#amount").val())) return alert('Invalid amount !');
		if (!nem.model.address.isValid(nem.model.address.clean($("#recipient option:checked").val()))) return alert('Invalid recipent address !');

		// Set the private key in common object
		common.privateKey = $("#privateKey option:checked").val();

		// Check private key for errors
		if (common.privateKey.length !== 64 && common.privateKey.length !== 66) return alert('Invalid private key, length must be 64 or 66 characters !');
    	if (!nem.utils.helpers.isHexadecimal(common.privateKey)) return alert('Private key must be hexadecimal only !');

		// Set the cleaned amount into transfer transaction object
		transferTransaction.amount = nem.utils.helpers.cleanTextAmount($("#amount").val());

		// Recipient address must be clean (no hypens: "-")
		transferTransaction.recipient = nem.model.address.clean($("#recipient").val());

		// Set message
		transferTransaction.message = $("#message").val();

		// Prepare the updated transfer transaction object
		var transactionEntity = nem.model.transactions.prepare("mosaicTransferTransaction")(common, transferTransaction, mosaicDefinitionMetaDataPair, nem.model.network.data.testnet.id);

		nem.com.requests.chain.time(endpoint).then(function (timeStamp) {
			const ts = Math.floor(timeStamp.receiveTimeStamp / 1000);
			transactionEntity.timeStamp = ts;
			const due = 60;
			transactionEntity.deadline = ts + due * 60;
			nem.model.transactions.send(common, transactionEntity, endpoint).then(function(res){
				if (res.code >= 2) { alert(res.message); }
				else { alert(res.message); }
			}, function(err) { alert(err); });
		}, function (err) { console.error(err); });
	}

	/**
     * Function to attach a mosaic to the transferTransaction object
     */
	function attachMosaic() {
		// Check for form errors
		if(undefined === $("#mosaicAmount").val() || !nem.utils.helpers.isTextAmountValid($("#mosaicAmount").val())) return alert('Invalid amount !');
		if(!$("#namespaceid option:checked").val() || !$("#mosaicName option:checked").val()) return alert('Missing parameter !');

		// If not XEM, fetch the mosaic definition from network
		if($("#mosaicname option:checked").val() !== 'xem') {
			nem.com.requests.namespace.mosaicDefinitions(endpoint, $("#namespaceid option:checked").val()).then(function(res) {

				// Look for the mosaic definition(s) we want in the request response (Could use ["eur", "usd"] to return eur and usd mosaicDefinitionMetaDataPairs)
				var neededDefinition = nem.utils.helpers.searchMosaicDefinitionArray(res.data, [$("#mosaicName option:checked").val()]);

				// Get full name of mosaic to use as object key
				var fullMosaicName  = $("#namespaceid option:checked").val() + ':' + $("#mosaicName option:checked").val();

				// Check if the mosaic was found
				if(undefined === neededDefinition[fullMosaicName]) return alert("Mosaic not found !");

				// Set mosaic definition into mosaicDefinitionMetaDataPair
				mosaicDefinitionMetaDataPair[fullMosaicName] = {};
				mosaicDefinitionMetaDataPair[fullMosaicName].mosaicDefinition = neededDefinition[fullMosaicName];

				nem.com.requests.mosaic.supply(endpoint, fullMosaicName).then(function(supplyRes) {

					// Set supply amount to mosaicDefinitionMetaDataPair.
					mosaicDefinitionMetaDataPair[fullMosaicName].supply = supplyRes.supply;

					// Now we have the definition we can calculate quantity out of user input
					var quantity = nem.utils.helpers.cleanTextAmount($("#mosaicAmount").val()) * Math.pow(10, neededDefinition[fullMosaicName].properties[0].value);

					// Create a mosaic attachment
					var mosaicAttachment = nem.model.objects.create("mosaicAttachment")($("#namespaceid option:checked").val(), $("#mosaicName option:checked").val(), quantity);

					// Push attachment into transaction mosaics
					transferTransaction.mosaics.push(mosaicAttachment);


					// Calculate back the quantity to an amount to show in the view. It should be the same as user input but we double check to see if quantity is correct.
					var totalToShow = nem.utils.format.supply(quantity, {"namespaceId": $("#namespaceid option:checked").val(), "name": $("#mosaicName option:checked").val()}, mosaicDefinitionMetaDataPair)[0] + '.' + nem.utils.format.supply(quantity, {"namespaceId": $("#namespaceid option:checked").val(), "name": $("#mosaicName option:checked").val()}, mosaicDefinitionMetaDataPair)[1];

					// Push mosaic to the list in view
					$("#mosaicList").prepend('<li>'+ totalToShow +' <small><b>'+  $("#namespaceid option:checked").val() + ':' + $("#mosaicName option:checked").val() +'</b></small> </li>');

					// Update the transaction fees in view
					updateFee();

				}, function (err) {
					console.error(err);
				});
			},
			function(err) {
				alert(err);
			});
		} else {
			// Calculate quantity from user input, XEM divisibility is 6
			var quantity = nem.utils.helpers.cleanTextAmount($("#mosaicAmount").val()) * Math.pow(10, 6);

			// Create a mosaic attachment
			var mosaicAttachment = nem.model.objects.create("mosaicAttachment")($("#namespaceid option:checked").val(), $("#mosaicName option:checked").val(), quantity);

			// Push attachment into transaction mosaics
			transferTransaction.mosaics.push(mosaicAttachment);

			// Calculate back the quantity to an amount to show in the view. It should be the same as user input but we double check to see if quantity is correct.
			var totalToShow = nem.utils.format.supply(quantity, {"namespaceId": $("#namespaceid option:checked").val(), "name": $("#mosaicName option:checked").val()}, mosaicDefinitionMetaDataPair)[0] + '.' + nem.utils.format.supply(quantity, {"namespaceId": $("#namespaceid option:checked").val(), "name": $("#mosaicName option:checked").val()}, mosaicDefinitionMetaDataPair)[1];

			// Push mosaic to the list in view
			$("#mosaicList").prepend('<li>'+ totalToShow +' <small><b>'+  $("#namespaceid option:checked").val() + ':' + $("#mosaicName option:checked").val() +'</b></small> </li>');

			// Update the transaction fees in view
			updateFee();
		}
	}

	// On amount change we update fee in view
	$("#amount").on('change keyup paste', function() {
	    updateFee();
	});

	// On message change we update fee in view
	$("#message").on('change keyup paste', function() {
	    updateFee();
	});

	// Call send function when click on send button
	$("#send").click(function() {
	  send();
	});

	// Call attachMosaic function when click on attachMosaic button
	$("#attachMosaic").click(function() {
	  attachMosaic();
	});

	// Initialization of fees in view
	updateFee();

});
