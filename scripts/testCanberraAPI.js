const http = require('http');

async function testAPI() {
    console.log('\n🧪 Testing Canberra Search API...\n');

    const options = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/accommodation/search?city=canberra',
        method: 'GET'
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    
                    if (json.city) {
                        console.log('✅ SUCCESS! Canberra Found:\n');
                        console.log(`   City: ${json.city}`);
                        console.log(`   Country: ${json.country}`);
                        console.log(`   Region: ${json.region}`);
                        console.log(`   Currency: ${json.currency}`);
                        console.log(`   Standard Rate: $${json.rates.standard || json.rates[0]} ${json.currency}`);
                        console.log(`   January Rate: $${json.rates[0]} ${json.currency}`);
                        console.log('\n🎉 CANBERRA IS 100% SEARCHABLE!\n');
                    } else if (json.error) {
                        console.log(`❌ API Error: ${json.error}`);
                    } else {
                        console.log('❓ Unexpected response:', json);
                    }
                    
                    resolve();
                } catch (err) {
                    console.error('❌ Failed to parse response:', err.message);
                    console.log('Raw response:', data);
                    reject(err);
                }
            });
        });

        req.on('error', (err) => {
            console.error(`❌ Connection failed: ${err.message}`);
            console.error('Make sure the server is running: node server.js');
            reject(err);
        });

        req.end();
    });
}

testAPI();
