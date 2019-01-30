function generateChart(validSubmissions) {
  const entries = validSubmissions.map(x => Number(x.prediction.substring(1)));
  const min = 1000 * Math.floor(Math.min.apply(null, entries) / 1000);
  const max = 1000 * Math.ceil(Math.max.apply(null, entries) / 1000);
  const numOfBars = 8;
  const barColors = ["#fdc341", "#145dd2", "#ffcab8", "#648fb3", "#927988", "#32d96f", "#7981fb", "#0ea9ef", "#09837a", "#7e3b93"];


  function makeDataset(min, max, barColors) {
    let labels = [];
    let dataset = [];

    const stepSize = (max - min) / numOfBars;
    let currentStep = min;

    for (let i = 0; i < numOfBars; i++) {
      let label = `$${currentStep} - $${(currentStep + stepSize) - 1} `;
      let matches = 0;
      entries.forEach(entry => {
        if (entry > currentStep && entry < (currentStep + stepSize) - 1) {
          matches += 1;
        }
      })
      currentStep += stepSize;
      labels.push(label);
      dataset.push(matches);
    }
    return [labels, dataset, barColors]
  }

  const dataset = makeDataset(min, max, barColors);
  const ctx = document.getElementById("myChart");

  const myChart = new Chart(ctx, {
    type: 'horizontalBar',
    data: {
      labels: dataset[0],
      datasets: [{
        label: '# of bets in range',
        data: dataset[1],
        backgroundColor: dataset[2],
        borderWidth: 0
      }]
    },
    options: {
      legend: {
        display: false,
      },
      scales: {
        xAxes: [{
          ticks: {
            stepSize: 1,
            beginAtZero: true
          }
        }]
      }
    }
  });
}