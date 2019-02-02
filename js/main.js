const deadlineTs = Date.parse(deadlineDate);
const predictionTs = Date.parse(predictionDate);
const currentTs = Date.now();
const APIClient = initNetwork();
let placedBets = [];

function initNetwork() {
  if (network === 'testnet') {
    return lisk.APIClient.createTestnetAPIClient();
  } else if (network === 'mainnet') {
    return lisk.APIClient.createMainnetAPIClient();
  } else {
    console.log(`Error configuring network '${network}'.`)
  }
}


function initPage() {
  if ((manualContestToggle && contestClosed) || (!manualContestToggle && currentTs > predictionTs)) {
    overlayOn();
  }
  updatePrize();
  setupDates();
  setupSlider();
  setupFAQ();
  setupNumberField();
  processSubmissionData();
  showContent();
}


function roundValue(amount) {
  const roundTo = 2;
  return Math.round(amount / roundTo) * roundTo;
}


function setupNumberField() {
  const numberField = document.getElementById("betAmount");
  numberField.setAttribute("min", minBet);
  numberField.setAttribute("max", maxBet);
}


function setupSlider() {
  const slider = document.getElementById("myRange");
  slider.setAttribute("min", minBet);
  slider.setAttribute("max", maxBet);
  slider.setAttribute("value", maxBet / 2);

  const output = document.getElementById("betAmount");
  output.value = slider.value;
  slider.oninput = function() {
    let roundedValue = roundValue(this.value);
    output.value = roundedValue;
  }

  // Add warning while using testnet
  if (network === 'testnet') {
    const warningField = document.getElementById("warning");
    const warning = `SITE IS CONFIGURED FOR TESTNET! DO NOT SEND MAINNET TOKENS!<br />`;
    warningField.innerHTML = warning + warning + warning + `<br />`;
  }

  // Disable submit button when conditions are met
  if ((manualBetToggle && betsClosed) || (!manualBetToggle && currentTs > deadlineTs)) {
    const submitButton = document.getElementById("submitButton");
    const deadlinePassed = document.getElementById("deadlinePassed");
    submitButton.disabled = true;
    deadlinePassed.innerHTML = `<br />IMPORTANT!<br />The deadline has passed and submissions are closed.
                                Predictions that are submitted manually after the deadline date will be considered invalid.`
  }
}


function updateManualBetInfo(betValue = maxBet / 2) {
  const manualBetInfo = document.getElementById("manualBetInfo");
  manualBetInfo.innerHTML = `<br />
                             Recipient: ${betAddres}<br />
                             Reference: $${betValue}<br />
                             Amount: ${betFee} LSK`;
}


function setupDates() {
  const predictionField1 = document.getElementById("predictionDate1");
  const predictionField2 = document.getElementById("predictionDate2");
  const deadlineField1 = document.getElementById("deadlineDate1");
  const deadlineField2 = document.getElementById("deadlineDate2");
  const startingField = document.getElementById("startingDate");

  predictionField1.innerHTML = predictionDate;
  predictionField2.innerHTML = predictionDate;
  deadlineField1.innerHTML = deadlineDate;
  deadlineField2.innerHTML = deadlineDate;
  startingField.innerHTML = startingDate;

}


function setupFAQ() {
  const faqBetAmount = document.getElementById("faqBetAmount");
  const faqbetAddress = document.getElementById("faqbetAddress");
  const faqPredictionDate = document.getElementById("faqPredictionDate");

  faqBetAmount.innerHTML = betFee;
  faqbetAddress.innerHTML = betAddres;
  faqPredictionDate.innerHTML = predictionDate;
}


function updatePrize() {
  const prizeDisplay = document.getElementById("prize1");
  APIClient.accounts.get({
      address: betAddres
    })
    .then(res => {
      const baseUrl = fetchBaseUrl();
      const prize = res.data[0].balance / 100000000;

      // Bonus calculation specifically tailored to StellarDynamic's sponsoring (matching each bet up till 50 LSK)
      if (prize <= 50) {
        let bonusAmount = prize;
        prizeDisplay.innerHTML = `<a href="${baseUrl}${betAddres}" target="_blank">${prize} (+ ${bonusAmount} bonus) LSK</a>`;
      } else {
        let bonusAmount = bonusCap;
        prizeDisplay.innerHTML = `<a href="${baseUrl}${betAddres}" target="_blank">${prize} (+ ${bonusAmount} bonus) LSK</a>`;
      }
    })
    .catch(res => {
      console.log(res);
    })
}


function randomBet() {
  const output = document.getElementById("betAmount");
  const slider = document.getElementById("myRange");
  const randomNumber = Math.floor((Math.random() * maxBet) + 10);
  output.value = roundValue(randomNumber);
  slider.setAttribute("value", output.value);
}


function fetchBaseUrl() {
  if (network === 'testnet') {
    return 'https://testnet-explorer.lisk.io/address/';
  } else {
    return 'https://explorer.lisk.io/address/';
  }
}


function submitBet() {
  const bettingPrediction = document.getElementById("betAmount").value;
  if (bettingPrediction > maxBet) {
    alert('Prediction too high!');
  } else if (bettingPrediction < minBet) {
    alert('Prediction too low!');
  } else if (placedBets.includes("$" + bettingPrediction)) {
    alert(`Prediction of  $${bettingPrediction} has already been placed by someone else!`)
  } else {
    const paymentUrl = `lisk://wallet?recipient=${betAddres}&amount=${betFee}&reference=$${bettingPrediction}`
    window.open(paymentUrl, "_self")
  }
}


function displaySubmission(ts, account, prediction) {
  const resultPage = document.getElementById("resultPage");
  const realTs = (ts + lisk.constants.EPOCH_TIME_SECONDS) * 1000;
  const time = new Date(realTs).toLocaleString();

  resultPage.innerHTML += `<div class="row">
                            <div class="column"><span class="strong">${prediction}</span></div>
                            <div class="column">${account}</div>
                            <div class="column">${time}</div>
                          </div>`
}


function getTransactionsInfo() {
  const liskEpoch = lisk.constants.EPOCH_TIME_SECONDS;
  const deadlineTs = Date.parse(deadlineDate) / 1000;
  return APIClient.transactions.get({
    recipientId: betAddres,
    minAmount: betFee * 10000000,
    limit: 1,
    sort: 'timestamp:desc',
    toTimestamp: (deadlineTs - liskEpoch)
  })
}


function showManualBetInfo() {
  document.getElementById("manualBetInfo").style.display = "block";
}


function parsePageResults(totalSubmissions) {
  const liskEpoch = lisk.constants.EPOCH_TIME_SECONDS;
  const deadlineTs = Date.parse(deadlineDate) / 1000;

  return new Promise((resolve, reject) => {
    let submissionBuffer = [];
    let totalPromises = [];

    for (let i = 0; i < Math.ceil(totalSubmissions / 100); i++) {
      // Get page with results
      totalPromises.push(APIClient.transactions.get({
          recipientId: betAddres,
          minAmount: betFee * 10000000,
          limit: 100,
          offset: i * 100,
          toTimestamp: (deadlineTs - liskEpoch)
        })
        .then(res => {
          // Loop through results on page
          console.log('Getting page with offset: ' + i * 100)
          for (let i = 0; i < res.data.length; i++) {
            submissionBuffer.push({
              'ts': res.data[i].timestamp,
              'account': res.data[i].senderId,
              'prediction': res.data[i].asset.data
            })
          }
        }))
    }
    Promise.all(totalPromises).then(() => {
      resolve(submissionBuffer);
    })
  })
}


function closeContest(submissions) {
  let submissionList = [];

  submissions.forEach(entry => {
    let bet = entry.prediction.replace('$', '');
    if (Number(bet) > btcPrice) {
      submissionList.push({
        diff: bet - btcPrice,
        account: entry.account,
        prediction: entry.prediction
      });
    } else {
      submissionList.push({
        diff: btcPrice - bet,
        account: entry.account,
        prediction: entry.prediction
      });
    }
  })

  submissionList = submissionList.sort(compare_diffs)
  const overlayContent = document.getElementById("overlaycontent");
  overlayContent.innerHTML = `
										<h2>THE DEADLINE HAS PASSED AND SUBMISSIONS ARE CLOSED!</h2>
                    <br /><br />
										<h1 class="winner">Winning prediction:<br />
										<img src="assets//party02_medium.png" /> ${submissionList[0].prediction} <img src="assets//party02_medium.png" /></h1>
                    <span class="winner">by ${submissionList[0].account}</span><br /><br /><br /><br />

										<h3>The opening price of Bitcoin on ${predictionDate} was: $${btcPrice}</h3>
                    <span class="small">(difference: $${submissionList[0].diff})</span>`;
}


function validateSubmissions(submissions) {
  let processedAccounts = [];
  let validSubmissions = [];
  const re = new RegExp('\\$[0-9]{2,5}');
  return new Promise((resolve, reject) => {
    submissions.sort(compare_regular);
    submissions.forEach(entry => {
      if (!processedAccounts.includes(entry.account) && !placedBets.includes(entry.prediction) && re.test(entry.prediction)) {
        validSubmissions.push(entry);
        processedAccounts.push(entry.account);
        placedBets.push(entry.prediction);
      } else {
        console.log(`Bet of '${entry.prediction}' by '${entry.account}' rejected.`)
      }
    })
    resolve(validSubmissions);
  })
}


// Function to sort submissions array with objects on ts (desc)
function compare_regular(a, b) {
  const tsA = a.ts;
  const tsB = b.ts;

  let comparison = 0;
  if (tsA > tsB) {
    comparison = 1;
  } else if (tsA < tsB) {
    comparison = -1;
  }
  return comparison;
}


// Function to sort submissions array with objects on ts (asc)
function compare_inversed(a, b) {
  const tsA = a.ts;
  const tsB = b.ts;

  let comparison = 0;
  if (tsA > tsB) {
    comparison = 1;
  } else if (tsA < tsB) {
    comparison = -1;
  }
  return comparison * -1;
}


// Function to sort array with objects on diff (asc)
function compare_diffs(a, b) {
  const diffA = a.diff;
  const diffB = b.diff;

  let comparison = 0;
  if (diffA > diffB) {
    comparison = 1;
  } else if (diffA < diffB) {
    comparison = -1;
  }
  return comparison;
}


function showFAQ() {
  const content = document.getElementsByClassName("content");
  const faq = document.getElementsByClassName("faq");
  for (let i = 0; i < content.length; i++) {
    content[i].style.display = "none";
  }
  for (let i = 0; i < faq.length; i++) {
    faq[i].style.display = "block";
  }
}


function showContent() {
  const content = document.getElementsByClassName("content");
  const faq = document.getElementsByClassName("faq");
  for (let i = 0; i < content.length; i++) {
    content[i].style.display = "block";
  }
  for (let i = 0; i < faq.length; i++) {
    faq[i].style.display = "none";
  }
}


async function processSubmissionData(deadlinePassed) {
  let transactionInfo = await getTransactionsInfo();
  let submissions = await parsePageResults(transactionInfo.meta.count);
  let validSubmissions = await validateSubmissions(submissions);

  const loadingMessage1 = document.getElementById("loadingMessage1");
  const loadingMessage2 = document.getElementById("loadingMessage2");
  loadingMessage1.remove();
  loadingMessage2.remove();

  generateChart(validSubmissions);

  // Inverse sort for display on site (desc)
  validSubmissions.sort(compare_inversed);
  validSubmissions.forEach(entry => displaySubmission(entry.ts, entry.account, entry.prediction));
  if ((manualContestToggle && contestClosed) || (!manualContestToggle && currentTs > predictionTs)) {
    closeContest(validSubmissions);
  }
}


function overlayOn() {
  document.body.innerHTML += `<div id="overlay" onclick="overlayOff()">
									               <div id="overlaycontent">Loading...</div>
								              </div>`

  const pagewrapper = document.getElementById("pagewrapper");
  pagewrapper.style.filter = "blur(10px)";
}


function overlayOff() {
  document.getElementById("overlay").style.display = "none";
  const pagewrapper = document.getElementById("pagewrapper");
  pagewrapper.style.filter = "none";
}