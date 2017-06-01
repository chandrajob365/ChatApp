// initialize Account Kit with CSRF protection
  AccountKit_OnInteractive = function () {
    AccountKit.init(
      {
        appId: '169812573551460',
        state: 'csrf',
        version: 'v1.1',
        fbAppEventsEnabled: true,
        debug: true
      }
    )
  }

  // login callback
  function loginCallback (response) {
    console.log('<accountKitLogin.js , loginCallback > response ----> ', response)
    if (response.status === 'PARTIALLY_AUTHENTICATED') {
      console.log('<accountKitLogin.js , loginCallback > response.code = ', response.code, ' response.state = ', response.state)
      document.getElementById('code').value = response.code
      document.getElementById('csrf').value = response.state
      document.getElementById('login_success').submit()
      // Send code to server to exchange for access token
    } else if (response.status === 'NOT_AUTHENTICATED') {
      // handle authentication failure
    } else if (response.status === 'BAD_PARAMS') {
      // handle bad parameters
    }
  }

  // phone form submission handler
  function smsLogin () {
    //let countryCodeSelect = document.getElementById('country_code')
    //let countryCode = countryCodeSelect.options[countryCodeSelect.selectedIndex].value
    //let phoneNumber = document.getElementById('phone_number').value
    AccountKit.login(
      'PHONE',
      {countryCode: '+91', phoneNumber: ''}, // will use default values if not specified
      loginCallback
    )
  }
