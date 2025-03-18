console.log('hai dunia');

const app = require('express')();

app.get('/', (req, res) => {
    res.send('FAST hello world\n');
});

app.listen(3000);