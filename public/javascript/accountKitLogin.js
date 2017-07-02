// initialize Account Kit with CSRF protection
AccountKit_OnInteractive = function () {
  AccountKit.init({
    appId: '169812573551460',
    state: 'csrf',
    version: 'v1.1',
    fbAppEventsEnabled: true,
    debug: true
  })
}

// login callback
function loginCallback (response) {
  if (response.status === 'PARTIALLY_AUTHENTICATED') {
    document.getElementById('code').value = response.code
    document.getElementById('csrf').value = response.state
    document.getElementById('login_success').submit()
    // Send code to server to exchange for access token
  } else if (response.status === 'NOT_AUTHENTICATED') {
    console.log('NOT_AUTHENTICATED')
  } else if (response.status === 'BAD_PARAMS') {
    console.log('BAD_PARAMS')
  }
}

// phone form submission handler
function smsLogin () {
  AccountKit.login('PHONE', {}, loginCallback)
}
