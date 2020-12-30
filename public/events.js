document.addEventListener("DOMContentLoaded", function() {
  
  var displayState = '';
  var numpadKeys = document.querySelectorAll('.numpad--key');
  var total = document.getElementById('total');
  
  var connectKey = document.getElementById('key--connect');
  var chargeKey = document.getElementById('key--charge');
  var helloWorldKey = document.getElementById("key--hello-world");
  
  numpadKeys.forEach(function(key) {
    key.addEventListener("click", function() {
      var keyValue = key.id.slice(5, key.id.length);
      
      switch (true) {
        case ('12345678900'.includes(keyValue)):
          if (displayState + keyValue < 1) {
            break;
          }
          if (displayState.length < 7) {
            displayState += keyValue;
          }
          break;
        case keyValue === 'del':
          displayState = displayState.slice(0, displayState.length - 1);
          break;
        default:
          break;
      }
      
      if (displayState.length === 0 || displayState < 1) {
        total.innerHTML = '0.00';
      } else if (displayState.length === 1) {
        total.innerHTML = '0.0' + displayState;
      } else if (displayState.length === 2) {
        total.innerHTML = '0.' + displayState;
      } else {
        total.innerHTML = displayState.slice(0, displayState.length - 2) + '.' + displayState.slice(displayState.length - 2, displayState.length);
      }
    });
  });
  
  connectKey.addEventListener("click", function() {
    remotePayCloudTutorial.connect();
  });
  
  chargeKey.addEventListener("click", function() {
    var amount = parseInt(document.getElementById("total").innerHTML.replace(".", ""));
    // 'amount' is an int of the number of cents to charge.
    if (amount > 0) {
      remotePayCloudTutorial.performSale(amount);
    }
  });
  
  helloWorldKey.addEventListener("click", function() {
    remotePayCloudTutorial.showHelloWorld();
  });

  // Phan
  fetch(`${remotePayCloudTutorial.targetCloverDomain}/v3/merchants/${remotePayCloudTutorial.merchant_id}/devices?access_token=${remotePayCloudTutorial.access_token}`)
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    var select = document.getElementById("select--clover-device-serials");

    data.elements.forEach(function(device) {
      // Currently, Clover Mobile, Mini, and Flex are compatible with Cloud Pay Display.
      // Their serial numbers begin with C02, C03, and C04, respectively.
      var eligibleDevicesFirstThree = ["C02", "C03", "C04"];
      var serialFirstThree = device.serial.slice(0, 3);

      // Clover Station and Clover Station 2018 have serial numbers that begin with
      // C01 and C05. They will likely never use Cloud Pay Display
      // because they are not the best form factors for a customer-facing screen.
      // Additionally, Clover emulators have a serial of 'unknown' or begin with 'EMULATOR'.

      if (eligibleDevicesFirstThree.includes(serialFirstThree)) {
        var option = document.createElement("option");
        option.text = device.serial;
        option.value = device.id;
        select.add(option);
      }
    });
  })
  .catch(function(error) {
    window.alert(error.toString());
  });

});
