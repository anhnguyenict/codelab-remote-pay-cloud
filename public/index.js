var clover = require("remote-pay-cloud");

var remotePayCloudTutorial;

// RemotePayCloudTutorial object definition
RemotePayCloudTutorial = function() {
  // TODO: Set instance variables for CloverConnector configuration.

  // URL: http://localhost:8080/?merchant_id=JVVVK10EYAS81&employee_id=GC6YVKR91Q126&client_id=655VQ41Z9CVF8#access_token=cd1c058f-e997-04d5-7943-e1b06b3f834d
  // If having Backend server, using [code] rather than [access_token], refer OAuth
  // [client_id] is used only with [code] to obtain an [access_token] in case using OAuth

  this.merchant_id = window.location.href.match(/merchant_id=([^&]*)/)[1];
  this.access_token = window.location.href.match(/access_token=([^&]*)/)[1];
  this.targetCloverDomain = window.location.href.includes("localhost") ? "https://sandbox.dev.clover.com" : "https://www.clover.com";
  this.remoteApplicationId = "CLOVERDEV.655VQ41Z9CVF8";
  this.friendlyId = "Primary POS";

  remotePayCloudTutorial = this;
};

RemotePayCloudTutorial.prototype.showHelloWorld = function() {
  // TODO: Show a 'Hello World' message on the device.

  this.cloverConnector.showMessage("Hello World");
  setTimeout(this.cloverConnector.showWelcomeScreen.bind(this.cloverConnector), 3000);
};

// Define the connect() function. This is invoked onclick of the green 'Connect' button.
RemotePayCloudTutorial.prototype.connect = function() {
  // TODO: Create a configuration object, a CloverConnector, a 
  // CloverConnectorListener, and then initialize the connection.

  // [merchant_id]
  // [access_token]
  // [targetCloverDomain] (Clover's sandbox or production environment)
  // [remoteApplicationId] of the POS
  // [deviceId] of the Clover device you're connecting to; this is different than the device's serial number
  // [friendlyId] , which is a human-readable way to identify the POS

  var deviceId = document.getElementById("select--clover-device-serials").value;

  var cloverConnectorFactoryConfiguration = {};
  cloverConnectorFactoryConfiguration[clover.CloverConnectorFactoryBuilder.FACTORY_VERSION] = clover.CloverConnectorFactoryBuilder.VERSION_12;
  var cloverConnectorFactory = clover.CloverConnectorFactoryBuilder.createICloverConnectorFactory(cloverConnectorFactoryConfiguration);

  const configBuilder = new clover.WebSocketCloudCloverDeviceConfigurationBuilder(this.remoteApplicationId,
  deviceId, this.merchant_id, this.access_token);
  configBuilder.setCloverServer(this.targetCloverDomain);
  configBuilder.setFriendlyId(this.friendlyId);
  var cloudConfig = configBuilder.build();  

  this.cloverConnector = cloverConnectorFactory.createICloverConnector(cloudConfig);

  this.setCloverConnectorListener(this.cloverConnector);
  this.setDisposalHandler();
  this.cloverConnector.initializeConnection();
};

RemotePayCloudTutorial.prototype.setCloverConnectorListener = function(cloverConnector) {
  var CloverConnectorListener = function(connector) {
    clover.remotepay.ICloverConnectorListener();
    this.cloverConnector = connector;
  };

  CloverConnectorListener.prototype = Object.create(clover.remotepay.ICloverConnectorListener.prototype);
  CloverConnectorListener.prototype.constructor = CloverConnectorListener;

  CloverConnectorListener.prototype.onDeviceConnected = function() {
    document.getElementById("status-message").innerHTML = "Device is connected!";
  };

  CloverConnectorListener.prototype.onDeviceReady = function() {
    document.getElementById("status-message").innerHTML = "Device is connected and ready!";
  };

  CloverConnectorListener.prototype.onDeviceError = function(deviceErrorEvent) {
    window.alert(`Message: ${deviceErrorEvent.getMessage()}`);
  };

  CloverConnectorListener.prototype.onDeviceDisconnected = function() {
    document.getElementById("status-message").innerHTML = "Device is disconnected!";
  };

  CloverConnectorListener.prototype.onVerifySignatureRequest = function(verifySignatureRequest) {
    // Clear any previous signatures and draw the current signature.
    var canvas = document.getElementById("verify-signature-canvas");
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(0.25, 0.25);
    ctx.beginPath();
    for (var strokeIndex = 0; strokeIndex < verifySignatureRequest.getSignature().strokes.length; strokeIndex++) {
      var stroke = verifySignatureRequest.getSignature().strokes[strokeIndex];
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (var pointIndex = 1; pointIndex < stroke.points.length; pointIndex++) {
        ctx.lineTo(stroke.points[pointIndex].x, stroke.points[pointIndex].y);
        ctx.stroke();
      }
    }
    // Reset the scale so that clearing the previous signature will function as intended.
    ctx.scale(4, 4);

    // Present the merchant with the option of approving or rejecting the signature.
 
    // Due to the asynchronous nature of drawing on an HTML canvas, 
    // enqueue this in the message queue to be executed when the call stack is
    // empty. Otherwise, the confirm dialog will appear before the signature
    // has rendered.
    setTimeout(function() {
      if (confirm("Would you like to approve this signature?")) {
        // Accept or reject, based on the merchant's input.
        this.cloverConnector.acceptSignature(verifySignatureRequest);
      } else {
        this.cloverConnector.rejectSignature(verifySignatureRequest);
      }
    }.bind(this), 0);
  };

  CloverConnectorListener.prototype.onConfirmPaymentRequest = function(confirmPaymentRequest) {
      for (var i = 0; i < confirmPaymentRequest.getChallenges().length; i++) {
        // Boolean of whether the app is resolving the last challenge in the Challenges array
        var isLastChallenge = i === confirmPaymentRequest.getChallenges().length - 1;
  
        if (confirm(confirmPaymentRequest.getChallenges()[i].getMessage())) {
          if (isLastChallenge) {
            this.cloverConnector.acceptPayment(confirmPaymentRequest.getPayment());
          }
        } else {
          this.cloverConnector.rejectPayment(confirmPaymentRequest.getPayment(), confirmPaymentRequest.getChallenges()[i]);
          return;
        }
      }
  };

  CloverConnectorListener.prototype.onSaleResponse = function(saleResponse) {
      if (saleResponse.getSuccess()) {
        // Convert the stored string back to an int.
        var saleRequestAmount = parseInt(window.localStorage.getItem("lastTransactionRequestAmount"));
        // Returns an int, so comparison is allowed.

        var saleResponseAmount = saleResponse.getPayment().getAmount();

        // A partial auth occurred if the Payment amount was less than the TransactionRequest amount.
        var wasPartialAuth = saleResponseAmount < saleRequestAmount;

        var formattedSaleResponseAmount = (saleResponseAmount / 100).toLocaleString("en-US", {style: "currency", currency: "USD"});

        if (wasPartialAuth) {
          var remainingBalance = saleRequestAmount - saleResponseAmount;
          var formattedRemainingBalance = (remainingBalance / 100).toLocaleString("en-US", {style: "currency", currency: "USD"});
          alert(`Partially authorized for ${formattedSaleResponseAmount} — remaining balance is ${formattedRemainingBalance}. Ask the customer for an additional payment method.`);
    
          // Start another sale for the remaining amount.
          remotePayCloudTutorial.performSale(remainingBalance);
        } else {
          alert(`Sale was successful for ${formattedSaleResponseAmount}!`);
        }
        
      } else {
        alert(`${saleResponse.getReason()} — ${saleResponse.getMessage()}`);
      }
  };
  
  this.cloverConnectorListener = new CloverConnectorListener(cloverConnector);
  cloverConnector.addCloverConnectorListener(this.cloverConnectorListener);
};

RemotePayCloudTutorial.prototype.setDisposalHandler = function() {
  window.onbeforeunload = function(event) {
    try {
      this.cloverConnector.dispose();
    } catch (e) {
        console.error(e);
    }
  }.bind(this);
};

// Perform a sale
RemotePayCloudTutorial.prototype.performSale = function(amount) {
  // TODO: Use the CloverConnector to initiate a sale.

  var saleRequest = new clover.remotepay.SaleRequest();
  saleRequest.setAmount(amount);
  saleRequest.setExternalId(clover.CloverID.getNewId());

  if (document.getElementById("checkbox-manual-card-entry").checked) {
    saleRequest.setCardEntryMethods(clover.CardEntryMethods.ALL);
    document.getElementById("checkbox-manual-card-entry").checked = false;
  }

  // localStorage will store the amount as a string, even though it's an int.
  window.localStorage.setItem("lastTransactionRequestAmount", amount);

  this.cloverConnector.sale(saleRequest);
};

module.exports = RemotePayCloudTutorial;
