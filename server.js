const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: 'http://localhost:8080', // Replace with your frontend URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.post('/generate-assignment', (req, res) => {
    // Your API logic here
    res.json({ message: 'Assignment generated' });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});