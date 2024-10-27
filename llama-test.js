const http = require('http');

function chat (data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',  // Replace with the API hostname
      port: 11434,
      path: '/api/generate',             // Replace with the API endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
      
    const req = http.request(options, (res) => {
      console.log(`Status Code: ${res.statusCode}`);
      // Stream the response data to the console
      let json = ``
      res.on('data', (chunk) => {
        const output = JSON.parse(chunk.toString());
        json = `${json}${output.response}`;
        process.stdout.write(output.response);
      });
    
      // Log the end of the response
      res.on('end', () => {
        resolve(JSON.parse(json));
        console.log('\nResponse ended.');
      });
    });
    
    // Handle request errors
    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      reject({error:e.message})
    });
    
    // Write JSON data to the request body
    req.write(data);
    
    // End the request
    req.end();
  });
}

function get_data (question) {
    return JSON.stringify({
        prompt: `
            ${question}
            Provide 3 follow up questions I can ask you about what you just said.
            Respond in JSON.
            Response schema: {
                content_length: number_bytes,
                answer: string,
                questions: [{
                    question_id: number,
                    question_content: string
                }, ...]
            }
        `,
        model: 'bgsechatbot:latest',
        format: 'json'
    });
}

(async function init () {
    let question = `Hi there`;
    while (true) {
        const data = get_data(question);
        const {
            answer,
            questions: [{ question_content: next_question }]
        } = await chat(data);
        question = next_question;
    }
})();
