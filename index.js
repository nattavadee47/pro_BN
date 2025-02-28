const express = require('express');
const app = express();
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const hostname = '127.0.0.1';
const port = 3000;

// Set up middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// สร้างฟังก์ชันสำหรับเชื่อมต่อฐานข้อมูล
const createConnection = async () => {
  return await mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    user: '42Ci2KHqgkJf2LN.root',
    password: 'bmHBov2yIgAdceqT',
    database: 'medicare_reminder',
    ssl: {
      minVersion: 'TLSv1.2'
    }
  });
};

// API Documentation
app.get('/', async (req, res) => {
  res.json({
    "Name": "MediCare Reminder API",
    "Author": "nattavadee , kanlapangha",
    "APIs": [
      // Medications
      {"api_name": "/medications", "method": "get", "description": "Get all medications"},
      {"api_name": "/medications/:id", "method": "get", "description": "Get medication by ID"},
      {"api_name": "/medications", "method": "post", "description": "Add new medication"},
      {"api_name": "/medications/:id", "method": "put", "description": "Update medication by ID"},
      {"api_name": "/medications/:id", "method": "delete", "description": "Delete medication by ID"},
      
      // Reminders
      {"api_name": "/reminders", "method": "get", "description": "Get all reminders"},
      {"api_name": "/reminders/:id", "method": "get", "description": "Get reminder by ID"},
      {"api_name": "/reminders", "method": "post", "description": "Add new reminder"},
      {"api_name": "/reminders/:id", "method": "delete", "description": "Delete reminder by ID"},
      
      // Logs
      {"api_name": "/logs", "method": "get", "description": "Get all medication logs"},
      {"api_name": "/logs", "method": "post", "description": "Add new medication log"},
      
      // Analytics
      {"api_name": "/medications/usage", "method": "get", "description": "Get medication usage by time"},
      {"api_name": "/logs/daily", "method": "get", "description": "Get daily medication logs"},
      {"api_name": "/adherence/today", "method": "get", "description": "Get today's medication adherence"}
    ]
  });
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const connection = await createConnection();
    const [results] = await connection.query('SELECT 1 + 1 AS result');
    await connection.end();
    res.json({connected: true, result: results[0].result});
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

// Medications APIs
app.get('/medications', async (req, res) => {
  try {
    const connection = await createConnection();
    const [results] = await connection.query('SELECT * FROM medications');
    await connection.end();
    res.json(results);
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

app.get('/medications/:id', async (req, res) => {
  try {
    const connection = await createConnection();
    const [results] = await connection.query('SELECT * FROM medications WHERE id = ?', [req.params.id]);
    await connection.end();
    res.json(results);
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

app.post('/medications', async (req, res) => {
  if (!req.body.name) {
    res.status(400).json({error: true, message: "Name is required"});
    return;
  }

  try {
    const connection = await createConnection();
    const [results] = await connection.query(
      'INSERT INTO medications (name, dosage, usage_instructions, time_to_take) VALUES (?, ?, ?, ?)',
      [
        req.body.name,
        req.body.dosage || null,
        req.body.usage_instructions || null,
        req.body.time_to_take || null
      ]
    );
    await connection.end();
    
    res.json({
      error: false,
      data: {
        id: results.insertId,
        ...req.body
      },
      message: "Medication added successfully"
    });
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

app.put('/medications/:id', async (req, res) => {
  if (!req.body.name) {
    res.status(400).json({error: true, message: "Name is required"});
    return;
  }

  try {
    const connection = await createConnection();
    await connection.query(
      'UPDATE medications SET name = ?, dosage = ?, usage_instructions = ?, time_to_take = ? WHERE id = ?',
      [
        req.body.name,
        req.body.dosage || null,
        req.body.usage_instructions || null,
        req.body.time_to_take || null,
        req.params.id
      ]
    );
    await connection.end();
    
    res.json({
      error: false,
      data: {
        id: req.params.id,
        ...req.body
      },
      message: "Medication updated successfully"
    });
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

app.delete('/medications/:id', async (req, res) => {
  try {
    const connection = await createConnection();
    await connection.query('DELETE FROM medications WHERE id = ?', [req.params.id]);
    await connection.end();
    res.json({error: false, message: "Medication deleted successfully"});
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

// Reminders APIs
app.get('/reminders', async (req, res) => {
  try {
    const connection = await createConnection();
    const [results] = await connection.query('SELECT r.*, m.name as medication_name FROM reminders r JOIN medications m ON r.medication_id = m.id');
    await connection.end();
    res.json(results);
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

app.post('/reminders', async (req, res) => {
  if (!req.body.medication_id || !req.body.reminder_time || !req.body.notification_channel) {
    res.status(400).json({error: true, message: "medication_id, reminder_time, and notification_channel are required"});
    return;
  }

  try {
    const connection = await createConnection();
    const [results] = await connection.query(
      'INSERT INTO reminders (medication_id, reminder_time, notification_channel) VALUES (?, ?, ?)',
      [
        req.body.medication_id,
        req.body.reminder_time,
        req.body.notification_channel
      ]
    );
    await connection.end();
    
    res.json({
      error: false,
      data: {
        id: results.insertId,
        ...req.body
      },
      message: "Reminder added successfully"
    });
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

app.delete('/reminders/:id', async (req, res) => {
  try {
    const connection = await createConnection();
    await connection.query('DELETE FROM reminders WHERE id = ?', [req.params.id]);
    await connection.end();
    res.json({error: false, message: "Reminder deleted successfully"});
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

// Logs APIs
app.get('/logs', async (req, res) => {
  try {
    const connection = await createConnection();
    const [results] = await connection.query('SELECT l.*, m.name as medication_name FROM logs l JOIN medications m ON l.medication_id = m.id');
    await connection.end();
    res.json(results);
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

app.post('/logs', async (req, res) => {
  if (!req.body.medication_id) {
    res.status(400).json({error: true, message: "medication_id is required"});
    return;
  }

  try {
    const connection = await createConnection();
    const [results] = await connection.query(
      'INSERT INTO logs (medication_id, confirmed_at) VALUES (?, ?)',
      [
        req.body.medication_id,
        new Date()
      ]
    );
    await connection.end();
    
    res.json({
      error: false,
      data: {
        id: results.insertId,
        medication_id: req.body.medication_id,
        confirmed_at: new Date()
      },
      message: "Log added successfully"
    });
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

// Analytics APIs
app.get('/medications/usage', async (req, res) => {
  try {
    const connection = await createConnection();
    const [results] = await connection.query('SELECT time_to_take, COUNT(*) as count FROM medications GROUP BY time_to_take');
    await connection.end();
    
    // แปลงข้อมูลเพื่อรองรับค่า null
    const transformedResults = results.map(item => ({
      time_to_take: item.time_to_take || 'ไม่ระบุเวลา',
      count: item.count
    }));
    
    res.json(transformedResults);
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

app.get('/logs/daily', async (req, res) => {
  try {
    const connection = await createConnection();
    const query = `
      SELECT 
        DATE(confirmed_at) as date,
        COUNT(*) as count
      FROM 
        logs
      WHERE 
        confirmed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY 
        DATE(confirmed_at)
      ORDER BY 
        date ASC
    `;
    
    const [results] = await connection.query(query);
    await connection.end();
    res.json(results);
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

app.get('/adherence/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const connection = await createConnection();
    
    const [medResults] = await connection.query('SELECT COUNT(*) as total FROM medications');
    const [logResults] = await connection.query(`
      SELECT COUNT(*) as taken 
      FROM logs 
      WHERE DATE(confirmed_at) = ?
    `, [today]);
    
    await connection.end();
    
    const total = medResults[0].total || 0;
    const taken = logResults[0].taken || 0;
    const pending = total - taken > 0 ? total - taken : 0;
    
    res.json({
      total,
      taken,
      pending,
      adherenceRate: total > 0 ? (taken / total) * 100 : 0
    });
  } catch (err) {
    res.status(500).json({error: true, message: err.message});
  }
});

// Start server
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});