import https from 'https';

const url = 'https://www.linkedin.com/in/williamhgates';
const req = https.get(url, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        console.log(`BODY LENGTH: ${body.length}`);
        if(res.statusCode !== 200) {
            console.log(body.substring(0, 500));
        }
    });
});
req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});
