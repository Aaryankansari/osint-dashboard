import https from 'https';

function testEndpoint(name, url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          name,
          status: res.statusCode,
          success: res.statusCode === 200,
          dataPreview: data.substring(0, 100).replace(/\n/g, ' '),
        });
      });
    }).on('error', (err) => {
      resolve({
        name,
        status: 'Error',
        success: false,
        error: err.message,
      });
    });
  });
}

async function runTests() {
  console.log("Starting API integration tests...");
  const results = await Promise.all([
    testEndpoint('Earthquakes (USGS)', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson'),
    testEndpoint('Flights (OpenSky)', 'https://opensky-network.org/api/states/all'),
    testEndpoint('Satellites (CelesTrak)', 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle')
  ]);
  
  console.table(results);
  
  const allSuccess = results.every(r => r.success);
  if (allSuccess) {
    console.log("All external APIs are reachable and returning 200 OK.");
  } else {
    console.error("Some APIs failed to respond correctly.");
  }
}

runTests();
